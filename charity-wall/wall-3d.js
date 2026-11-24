/* wall-3d.js — المشهد ثلاثي الأبعاد لحائط الخير (Three.js)
   - حائط بناء واقعي: 10 طوبات في كل صف، الصفوف متداخلة مثل البناء الحقيقي (نصف طوبة)
   - أسمنت ظاهر بين الطوبات وأساس وقاعدة خرسانية
   - خامات لكل فئة (طين/أحمر/فضي/ذهبي/ماسي) مع انعكاسات وإضاءة وظلال
   - أسماء المتبرعين مكتوبة دائمًا على واجهة كل طوبة (Canvas Texture)
   - InstancedMesh لكل فئة: الحائط يتوسع بلا حد مع أداء عالٍ
   - هرم جانبي بالأنواع الخمسة + عدادات حية، ومنه تنطلق الطوبات الجديدة
   - تحكم كامل بالكاميرا: سحب للدوران، عجلة/قرصة للتقريب، سحب بإصبعين للتحريك
   - الضغط على طوبة → فرقعة + بيانات المتبرع، والطوبات تبقى بعد إعادة التحميل (Firestore)
   - وضع أداء منخفض للأجهزة الضعيفة + إيقاف الرسم عند خروج الصفحة عن الشاشة */

import * as THREE from './vendor/three.module.js';
import { TIERS, tierById } from './firebase-config.js';
import { sounds } from './sounds.js';
import { flyBrick, dustBurst, lightFlash, popBrick, flyCamera } from './animations.js';

/* ─── أبعاد البناء ─── */
export const PER_ROW = 10;
const B = { w: 2.3, h: 1.05, d: 1.15, gap: 0.14 };
const S = B.w + B.gap;           /* خطوة الطوبة أفقياً */
export const WALL_HALF = 4.5 * S + B.w / 2; /* نصف عرض الحائط */
const PYRAMID_X = WALL_HALF + 11.5;         /* موضع الهرم جانب الحائط */

/* ─── نسيج ضجيج إجرائي (خشونة الطوب والأسمنت) ─── */
function noiseTexture(base = 128, variation = 46, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = base + (Math.random() - 0.5) * variation * 2;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ─── خامة اسم المتبرع (لوحة قماشية شفافة أمام الطوبة) ─── */
const labelCache = new Map();
function nameLabelTexture(name, tier) {
  const key = name + '|' + tier.id;
  if (labelCache.has(key)) return labelCache.get(key);
  const c = document.createElement('canvas');
  c.width = 320; c.height = 140;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 320, 140);

  /* شريط خلفي خفيف لقراءة الاسم فوق أي خامة */
  ctx.fillStyle = 'rgba(8,10,16,.42)';
  roundRect(ctx, 8, 30, 304, 80, 18);
  ctx.fill();
  ctx.strokeStyle = tier.cssColor;
  ctx.lineWidth = 3;
  roundRect(ctx, 8, 30, 304, 80, 18);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.shadowColor = 'rgba(0,0,0,.85)';
  ctx.shadowBlur = 7;
  const words = String(name || 'متبرع').trim().split(/\\s+/);
  let fontSize = 38, lines = [];
  const maxWidth = 278;
  const wrap = () => {
    ctx.font = `700 ${fontSize}px Cairo, Tajawal, sans-serif`;
    const result = [];
    let line = '';
    words.forEach(word => {
      const next = line ? line + ' ' + word : word;
      if (line && ctx.measureText(next).width > maxWidth) { result.push(line); line = word; }
      else line = next;
    });
    if (line) result.push(line);
    return result;
  };
  do { lines = wrap(); if (lines.length <= 3) break; fontSize -= 2; } while (fontSize > 18);
  const lineHeight = Math.min(38, fontSize + 4);
  const startY = 70 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => ctx.fillText(line, 160, startY + i * lineHeight, maxWidth));

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  if (labelCache.size > 600) { /* حماية الذاكرة عند آلاف الأسماء */
    const first = labelCache.keys().next().value;
    const old = labelCache.get(first);
    old.dispose(); labelCache.delete(first);
  }
  labelCache.set(key, tex);
  return tex;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ═══ تحكم مداري مخصص (فأرة + لمس) ═══ */
class SimpleOrbit {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.target = new THREE.Vector3(0, 4, 0);
    this.spherical = { theta: 0.42, phi: 1.18, radius: 30 };
    this.desired = { ...this.spherical };
    this.minRadius = 7; this.maxRadius = 150;
    this.enabled = true;
    this._pointers = new Map();
    this._lastPinch = 0;
    this._lastPan = null;
    this._moved = 0;

    dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', e => this._down(e));
    dom.addEventListener('pointermove', e => this._move(e));
    dom.addEventListener('pointerup', e => this._up(e));
    dom.addEventListener('pointercancel', e => this._up(e));
    dom.addEventListener('wheel', e => this._wheel(e), { passive: false });
    dom.addEventListener('contextmenu', e => e.preventDefault());
  }
  _down(e) {
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
    this._moved = 0;
    this._lastPan = null;
    if (this._pointers.size === 2) {
      const [a, b] = [...this._pointers.values()];
      this._lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  _move(e) {
    if (!this._pointers.has(e.pointerId)) return;
    const p = this._pointers.get(e.pointerId);
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    this._moved += Math.abs(dx) + Math.abs(dy);
    if (!this.enabled) return;

    if (this._pointers.size === 1) {
      if (p.button === 2 || e.shiftKey) this._pan(dx, dy);
      else this._rotate(dx, dy);
    } else if (this._pointers.size === 2) {
      const [a, b] = [...this._pointers.values()];
      const pinch = Math.hypot(a.x - b.x, a.y - b.y);
      if (this._lastPinch) {
        this.desired.radius = THREE.MathUtils.clamp(
          this.desired.radius * (this._lastPinch / pinch), this.minRadius, this.maxRadius);
      }
      this._lastPinch = pinch;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (this._lastPan) this._pan(mid.x - this._lastPan.x, mid.y - this._lastPan.y);
      this._lastPan = mid;
    }
  }
  _up(e) {
    this._pointers.delete(e.pointerId);
    this._lastPinch = 0; this._lastPan = null;
  }
  _rotate(dx, dy) {
    this.desired.theta -= dx * 0.005;
    this.desired.phi = THREE.MathUtils.clamp(this.desired.phi - dy * 0.005, 0.12, Math.PI / 2 - 0.03);
  }
  _pan(dx, dy) {
    const scale = this.spherical.radius * 0.0016;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    this.target.addScaledVector(right, -dx * scale);
    this.target.addScaledVector(up, dy * scale);
    this.target.y = Math.max(this.target.y, 0.5);
  }
  _wheel(e) {
    e.preventDefault();
    if (!this.enabled) return;
    this.desired.radius = THREE.MathUtils.clamp(
      this.desired.radius * (1 + Math.sign(e.deltaY) * 0.11), this.minRadius, this.maxRadius);
  }
  update() {
    if (this.flying) { this.camera.lookAt(this.target); return; } /* طيران مُبرمَج: لا مقاومة */
    const k = this.enabled ? 0.14 : 1;
    this.spherical.theta += (this.desired.theta - this.spherical.theta) * k;
    this.spherical.phi += (this.desired.phi - this.spherical.phi) * k;
    this.spherical.radius += (this.desired.radius - this.spherical.radius) * k;
    const { theta, phi, radius } = this.spherical;
    this.camera.position.set(
      this.target.x + radius * Math.sin(phi) * Math.sin(theta),
      this.target.y + radius * Math.cos(phi),
      this.target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    this.camera.lookAt(this.target);
  }
  wasDrag() { return this._moved > 7; }
}

/* ═══ حاوية فئة واحدة داخل InstancedMesh تتوسع تلقائياً ═══ */
class TierGroup {
  constructor(scene, geometry, material, shadow = true) {
    this.scene = scene;
    this.geometry = geometry;
    this.material = material;
    this.shadow = shadow;
    this.capacity = 64;
    this.mesh = this._make();
    this.mesh.userData.byIndex = [];
    scene.add(this.mesh);
  }
  _make() {
    const m = new THREE.InstancedMesh(this.geometry, this.material, this.capacity);
    m.count = 0;
    m.castShadow = this.shadow;
    m.receiveShadow = this.shadow;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return m;
  }
  add(matrix, record) {
    if (this.mesh.count >= this.capacity) this._grow();
    const i = this.mesh.count;
    this.mesh.setMatrixAt(i, matrix);
    this.mesh.count = i + 1;
    this.mesh.userData.byIndex[i] = record || null;
    this.mesh.instanceMatrix.needsUpdate = true;
    /* إبطال الحدود المخزنة حتى يعيد raycast حسابها بالطوبات الجديدة */
    this.mesh.boundingSphere = null;
    this.mesh.boundingBox = null;
    return i;
  }

  /* تصفير المجموعة (إعادة البناء) مع إبطال الحدود */
  clear() {
    this.mesh.count = 0;
    this.mesh.userData.byIndex = [];
    this.mesh.boundingSphere = null;
    this.mesh.boundingBox = null;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  setMatrixAt(i, matrix) {
    this.mesh.setMatrixAt(i, matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  getMatrixAt(i, out) { return this.mesh.getMatrixAt(i, out); }
  _grow() {
    const old = this.mesh;
    this.capacity *= 2;
    const next = this._make();
    for (let i = 0; i < old.count; i++) {
      const m = new THREE.Matrix4();
      old.getMatrixAt(i, m);
      next.setMatrixAt(i, m);
    }
    next.count = old.count;
    next.userData.byIndex = old.userData.byIndex;
    this.scene.remove(old);
    old.dispose();
    this.mesh = next;
    this.scene.add(next);
  }
}

/* ═══ المشهد الرئيسي ═══ */
export class Wall3D {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = opts;
    this.tiers = TIERS;
    this.quality = opts.quality === 'low' ? 'low' : 'high';
    this.onPick = opts.onPick || (() => {});
    this.onEmpty = opts.onEmpty || (() => {});
    this.onStats = opts.onStats || (() => {});
    this.onAutoLow = opts.onAutoLow || (() => {});

    this.bricks = new Map();      /* brickId → {record, tierId, groupIdx, matrix, namePlane} */
    this.byDonor = new Map();     /* donorId → brickId */
    this.count = 0;
    this._raf = null;
    this._visible = true;
    this._fps = { frames: 0, t0: performance.now(), lowNotified: false };
    this._disposed = false;
  }

  /* ───── التهيئة ───── */
  init() {
    const c = this.container;
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.quality === 'high',
      powerPreference: 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = this.quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._applyPixelRatio();
    c.appendChild(this.renderer.domElement);
    this.renderer.domElement.classList.add('cw-canvas');

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060a13, 0.0075);
    this.scene.background = this._skyTexture();

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 600);
    this.controls = new SimpleOrbit(this.camera, this.renderer.domElement);
    this.controls.desired = { theta: 0.5, phi: 1.12, radius: 34 };

    this._buildEnv();
    this._buildLights();
    this._buildGround();
    this._buildMaterials();
    this._buildWallBase();
    this._buildPyramid();

    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(c);

    /* إيقاف الرسم عند خروج الحائط عن الشاشة (توفير المعالج) */
    this._io = new IntersectionObserver(en => { this._visible = en[0].isIntersecting; }, { threshold: 0.02 });
    this._io.observe(c);

    this._bindPick();
    this._loop();
    return this;
  }

  _applyPixelRatio() {
    const cap = this.quality === 'low' ? 1 : 1.75;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  }

  _skyTexture() {
    const cv = document.createElement('canvas');
    cv.width = 2; cv.height = 512;
    const ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#0e1830');
    g.addColorStop(0.45, '#0a1122');
    g.addColorStop(0.75, '#070c18');
    g.addColorStop(1, '#05080f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 512);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* بيئة انعكاسات بسيطة للمعادن (PMREM من مشهد إضاءة مصغّر) */
  _buildEnv() {
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const env = new THREE.Scene();
      const mk = (color, w, h, pos, lookAt) => {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
        );
        m.position.copy(pos);
        m.lookAt(lookAt || new THREE.Vector3(0, 0, 0));
        env.add(m);
      };
      mk(0xfff3d6, 30, 30, new THREE.Vector3(0, 22, 0));            /* سقف دافئ */
      mk(0x8fb7ff, 24, 16, new THREE.Vector3(-24, 8, 10));           /* جانب بارد */
      mk(0xffd9a0, 24, 16, new THREE.Vector3(24, 8, -10));           /* جانب دافئ */
      mk(0x2a3a55, 40, 20, new THREE.Vector3(0, 2, -30));            /* خلفية داكنة */
      this.scene.environment = pmrem.fromScene(env, 0.03).texture;
      pmrem.dispose();
    } catch (_e) { /* الانعكاسات تحسينية فقط */ }
  }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x9db4d6, 0x241a10, 0.6));
    this.scene.add(new THREE.AmbientLight(0x334, 0.25));

    this.sun = new THREE.DirectionalLight(0xffe8bd, 1.5);
    this.sun.position.set(26, 34, 30);
    this.sun.castShadow = this.quality === 'high';
    this.sun.shadow.mapSize.set(this.quality === 'low' ? 1024 : 2048, this.quality === 'low' ? 1024 : 2048);
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this._fitSun();

    /* لمسة ذهبية فوق الهرم */
    const gold = new THREE.PointLight(0xf0b542, 12, 40, 2);
    gold.position.set(PYRAMID_X, 6, 6);
    this.scene.add(gold);
  }

  _fitSun() {
    const h = this.wallHeight || 6;
    const d = Math.max(24, h * 1.4 + 14);
    const cam = this.sun.shadow.camera;
    cam.left = -d; cam.right = d; cam.top = d; cam.bottom = -d;
    cam.near = 1; cam.far = 160;
    cam.updateProjectionMatrix();
    this.sun.position.set(24, h + 30, 28);
    this.sun.target.position.set(0, h * 0.4, 0);
  }

  _buildGround() {
    const geo = new THREE.CircleGeometry(220, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0b101c, roughness: 0.96, metalness: 0
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.42;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  /* خامات الفئات الخمس + الأسمنت والخرسانة */
  _buildMaterials() {
    const bump = noiseTexture(128, 40);
    bump.repeat.set(1.4, 0.8);

    this.brickGeo = new THREE.BoxGeometry(B.w, B.h, B.d);
    this.tierGroups = {};
    this.materials = {};
    for (const t of this.tiers) {
      const params = {
        color: t.color,
        metalness: t.metalness,
        roughness: t.roughness,
        emissive: new THREE.Color(t.emissive),
        emissiveIntensity: t.id === 'gold' ? 0.35 : (t.id === 'diamond' ? 0.3 : 0.12),
        bumpMap: (t.id === 'clay' || t.id === 'red') ? bump : null,
        bumpScale: 0.35
      };
      let mat;
      if (t.id === 'diamond' || t.id === 'silver' || t.id === 'gold') {
        mat = new THREE.MeshPhysicalMaterial({
          ...params,
          clearcoat: t.id === 'diamond' ? 1 : 0.5,
          clearcoatRoughness: t.id === 'diamond' ? 0.06 : 0.25,
          envMapIntensity: t.id === 'diamond' ? 1.6 : 1.2
        });
      } else {
        mat = new THREE.MeshStandardMaterial(params);
      }
      this.materials[t.id] = mat;
      this.tierGroups[t.id] = new TierGroup(this.scene, this.brickGeo, mat);
    }

    this.cementMat = new THREE.MeshStandardMaterial({
      color: 0x6d6f74, roughness: 0.95, metalness: 0,
      bumpMap: noiseTexture(120, 55), bumpScale: 0.5
    });
    this.concreteMat = new THREE.MeshStandardMaterial({
      color: 0x5a5d63, roughness: 0.9, metalness: 0,
      bumpMap: noiseTexture(135, 35), bumpScale: 0.4
    });

    /* خامات مصورة حقيقية (CC0 من Poly Haven) إذا وُجدت ملفاتها — وإلا يبقى النسيج الإجرائي */
    this._loadRealTextures();
  }

  /* تحميل الخامات من assets/textures وتطبيقها بهدوء عند جهوزها */
  _loadRealTextures() {
    const loader = new THREE.TextureLoader();
    const base = 'assets/textures/';
    const quiet = () => () => { /* الملف غير موجود: نبقى على الخامة الإجرائية */ };

    /* طوب الطين والأحمر: جدار طوبي CC0 (brick_wall_001 من Poly Haven) */
    loader.load(base + 'brick_wall.jpg', tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(0.42, 0.3);
      tex.anisotropy = 4;
      const bump = loader.load(base + 'brick_wall_bump.jpg');
      bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
      bump.repeat.set(0.42, 0.3);
      for (const id of ['clay', 'red']) {
        const m = this.materials[id];
        if (!m) continue;
        m.map = tex;
        m.bumpMap = bump;
        m.bumpScale = 0.3;
        /* الصورة نفسها طوب أحمر طبيعي: الطين يُظلَّل نحو البني والأحمر يظهر كما هو */
        m.color.set(id === 'clay' ? 0xb09a80 : 0xffffff);
        m.needsUpdate = true;
      }
    }, undefined, quiet());

    /* الأسمنت والخرسانة (brushed_concrete من Poly Haven) */
    loader.load(base + 'concrete.jpg', tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2.6, 1.2);
      const bump = loader.load(base + 'concrete_bump.jpg');
      bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
      bump.repeat.set(2.6, 1.2);
      for (const m of [this.cementMat, this.concreteMat]) {
        m.map = tex;
        m.bumpMap = bump;
        m.bumpScale = 0.5;
        m.color.set(0xffffff);
        m.needsUpdate = true;
      }
    }, undefined, quiet());
  }

  /* الأساس + لوح الأسمنت خلف الطوب (يظهر في الفواصل كمونة بين الطوبات) */
  _buildWallBase() {
    /* القاعدة الخرسانية */
    const base = new THREE.Mesh(new THREE.BoxGeometry(WALL_HALF * 2 + 6, 0.85, 4.4), this.concreteMat);
    base.position.set(0, -0.42, 0.4);
    base.castShadow = base.receiveShadow = true;
    this.scene.add(base);

    /* لوح الأسمنت الخلفي — يتوسع رأسياً مع نمو الحائط */
    this.mortarBack = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_HALF * 2 + 1.4, 1, 1.2),
      this.cementMat
    );
    this.mortarBack.position.set(0, 0.5, -0.35);
    this.mortarBack.castShadow = this.mortarBack.receiveShadow = true;
    this.scene.add(this.mortarBack);

    /* أنصاف الطوب الزخرفية (أغلاق الصفوف الفردية مثل البناء الحقيقي) */
    const closerGeo = new THREE.BoxGeometry((B.w - B.gap) / 2, B.h, B.d);
    this.closers = new TierGroup(this.scene, closerGeo, this.cementMat, true);
    /* أسفل الحائط لوحة "الحائط" */
    this.wallGroup = new THREE.Group();
    this.scene.add(this.wallGroup);
    this.wallHeight = 1;
  }

  _growMortar(rows) {
    const h = Math.max(1.4, rows * (B.h + B.gap) + 1.2);
    this.mortarBack.scale.y = h;
    this.mortarBack.position.y = h / 2 - 0.4;
  }

  /* ───── الهرم الجانبي بالأنواع الخمسة ───── */
  _buildPyramid() {
    const pw = 1.12, ph = 0.78, pd = 1.12, pg = 0.08;
    this.pyramidSpawn = new THREE.Vector3(PYRAMID_X, 5.6, 4);
    this.pyramidGroups = [];
    this.pyramidLabels = [];
    const ps = pw + pg;

    for (let level = 0; level < 5; level++) {
      const n = 5 - level; /* عدد الطوب في ضلع المستوى */
      const tier = this.tiers[level];
      const geo = new THREE.BoxGeometry(pw, ph, pd);
      const group = new TierGroup(this.scene, geo, this.materials[tier.id]);
      for (let ix = 0; ix < n; ix++) {
        for (let iz = 0; iz < n; iz++) {
          const m = new THREE.Matrix4().setPosition(
            PYRAMID_X + (ix - (n - 1) / 2) * ps,
            level * (ph + pg) + ph / 2,
            4 + (iz - (n - 1) / 2) * ps
          );
          group.add(m, null);
        }
      }
      this.pyramidGroups.push(group);

      /* لوحة اسم الفئة أمام كل مستوى */
      const sprite = this._tierLabelSprite(tier, 0);
      sprite.position.set(PYRAMID_X, level * (ph + pg) + ph / 2, 4 + (n / 2) * ps + 1.3);
      sprite.scale.set(3.6, 1.1, 1);
      this.scene.add(sprite);
      this.pyramidLabels.push({ sprite, tier });
    }
  }

  _tierLabelSprite(tier, count) {
    const cv = document.createElement('canvas');
    cv.width = 360; cv.height = 110;
    this._drawTierLabel(cv, tier, count);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.userData = { cv, tex };
    return sp;
  }

  _drawTierLabel(cv, tier, count) {
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(6,9,16,.78)';
    roundRect(ctx, 4, 12, 352, 86, 20);
    ctx.fill();
    ctx.strokeStyle = tier.cssColor;
    ctx.lineWidth = 4;
    roundRect(ctx, 4, 12, 352, 86, 20);
    ctx.stroke();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = tier.cssColor;
    ctx.font = '800 40px Cairo, Tajawal, sans-serif';
    ctx.fillText(tier.label, 265, 56);
    ctx.fillStyle = '#fff';
    ctx.font = '700 36px Cairo, Tajawal, sans-serif';
    ctx.fillText(count + ' طوبة', 115, 56);
  }

  /* تحديث عدادات الهرم من الإحصائيات */
  updatePyramidCounts(counts) {
    this.pyramidLabels.forEach(({ sprite, tier }) => {
      const n = counts && counts[tier.id] != null ? counts[tier.id] : 0;
      this._drawTierLabel(sprite.userData.cv, tier, n);
      sprite.userData.tex.needsUpdate = true;
    });
  }

  /* ───── موضع الطوبة من رقمها التسلسلي ───── */
  _slotPosition(index, rowCount = PER_ROW) {
    const row = Math.floor(index / PER_ROW);
    const col = index % PER_ROW;
    const x = (col - (rowCount - 1) / 2) * S + (row % 2 ? S / 2 : 0);
    const y = row * (B.h + B.gap) + B.h / 2;
    return new THREE.Vector3(x, y, 0);
  }

  _ensureClosers(rows) {
    const dummy = new THREE.Object3D();
    for (let r = this._closerRows || 0; r < rows; r++) {
      if (r % 2 === 1) {
        const y = r * (B.h + B.gap) + B.h / 2;
        dummy.position.set(-(4.5 * S + B.w / 2 - (B.w - B.gap) / 4), y, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.closers.add(dummy.matrix, null);
        dummy.position.set(4.5 * S + B.w / 2 - (B.w - B.gap) / 4, y, 0);
        dummy.updateMatrix();
        this.closers.add(dummy.matrix, null);
      }
    }
    this._closerRows = Math.max(this._closerRows || 0, rows);
  }

  /* ───── بناء الحائط من بيانات Firestore ───── */
  setTiers(list) { this.tiers = list && list.length ? list : TIERS; }

  setBricks(records) {
    /* إعادة بناء كاملة (التحميل الأولي) */
    for (const [, b] of this.bricks) {
      if (b.namePlane) { this.wallGroup.remove(b.namePlane); b.namePlane.material.dispose(); }
    }
    this.bricks.clear();
    this.byDonor.clear();
    for (const id of Object.keys(this.tierGroups)) this.tierGroups[id].clear();
    this.count = 0;
    this._closerRows = 0;
    this.closers.clear();

    const animateInitial = this.opts.animateOnLoad !== false && !this._initialAnimationPlayed;
    records.forEach((r, i) => {
      const rowStart = Math.floor(i / PER_ROW) * PER_ROW;
      const rowCount = Math.min(PER_ROW, records.length - rowStart);
      r.index = typeof r.index === 'number' ? r.index : i;
      const place = this._slotPosition(i, rowCount);
      if (animateInitial) {
        /* طوبات الزيارة الأولى تنطلق بالتتابع من نقطة الهرم إلى مواقعها */
        window.setTimeout(() => {
          if (!this._disposed) this._placeInstance(r, true, this.pyramidSpawn, place);
        }, i * 115);
      } else {
        this._placeInstance(r, false, null, place);
      }
    });
    this._initialAnimationPlayed = true;
    /* تثبيت العدد النهائي فورًا حتى لا تتعارض الإضافات الحية مع مؤقتات الطيران */
    this.count = records.length;
    const rows = Math.ceil(Math.max(this.count, 1) / PER_ROW);
    this._ensureClosers(rows);
    this._growMortar(rows);
    this.wallHeight = rows * (B.h + B.gap);
    this._fitSun();
    this._frameWall();
    this.onStats(this.count);
    if (this.count === 0) this.onEmpty(true); else this.onEmpty(false);
  }

  _placeInstance(record, animate, fromPos, positionOverride) {
    const index = typeof record.index === 'number' ? record.index : this.count;
    record.index = index; /* تثبيت الفهرس لاستخدامه عند إعادة توسيط الصف */
    const tierId = record.brickType || 'clay';
    const tier = tierById(tierId, this.tiers);
    const pos = positionOverride || this._slotPosition(index, (index % PER_ROW) + 1);
    const dummy = new THREE.Object3D();
    dummy.position.copy(pos);
    dummy.updateMatrix();

    const group = this.tierGroups[tierId] || this.tierGroups.clay;
    const idx = group.add(dummy.matrix, record.id);
    const finalMatrix = dummy.matrix.clone();
    if (animate) {
      /* إخفاء الطوبة في موضعها حتى تصل النسخة الطائرة */
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      group.setMatrixAt(idx, dummy.matrix);
      group.mesh.instanceMatrix.needsUpdate = true;
    }

    /* لوحة الاسم على واجهة الطوبة */
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(B.w * 0.94, B.h * 0.8),
      new THREE.MeshBasicMaterial({
        map: nameLabelTexture(record.donorName || 'متبرع', tier),
        transparent: true,
        depthWrite: false
      })
    );
    plane.position.set(pos.x, pos.y, B.d / 2 + 0.02);
    this.wallGroup.add(plane);

    this.bricks.set(record.id, {
      record, tierId, groupIdx: idx, matrix: dummy.matrix.clone(),
      namePlane: plane, position: pos.clone()
    });
    this.byDonor.set(record.donorId, record.id);
    this.count = Math.max(this.count, index + 1);

    if (animate) {
      /* طوبة مؤقتة تطير من الهرم إلى موضعها */
      plane.material.opacity = 0;
      const flyMesh = new THREE.Mesh(this.brickGeo, this.materials[tierId]);
      flyMesh.castShadow = true;
      flyMesh.visible = false;
      this.scene.add(flyMesh);
      const from = fromPos || this.pyramidSpawn;
      sounds.whoosh();
      flyBrick(flyMesh, from, pos, { duration: 1.7, spins: 2 }).then(() => {
        this.scene.remove(flyMesh);
        group.setMatrixAt(idx, finalMatrix);
        group.mesh.instanceMatrix.needsUpdate = true;
        sounds.thud();
        dustBurst(this.scene, pos.clone().add(new THREE.Vector3(0, 0, B.d / 2)), { low: this.quality === 'low' });
        lightFlash(this.scene, pos, tier.id === 'gold' ? 0xffd27a : tier.id === 'diamond' ? 0xbfe9ff : 0xffe2b0);
        setTimeout(() => sounds.tierSound(tier.id), 120);
        gsap.to(plane.material, { opacity: 1, duration: 0.4 });
      });
    }
    return { pos, plane };
  }

  /* ───── إضافة طوبة جديدة (اعتماد تبرع) ───── */
  addBrick(record) {
    if (this.bricks.has(record.id)) return;
    const rowsBefore = Math.ceil(Math.max(this.count, 1) / PER_ROW);
    const newIndex = typeof record.index === 'number' ? record.index : this.count;
    const rowCount = (newIndex % PER_ROW) + 1;
    this._placeInstance(record, true, null, this._slotPosition(newIndex, rowCount));
    /* إعادة توسيط طوبات الصف الجاري كلما أضيفت طوبة جديدة إليه. */
    const rowStart = Math.floor(newIndex / PER_ROW) * PER_ROW;
    for (const entry of this.bricks.values()) {
      const idx = Number(entry.record.index);
      if (idx < rowStart || idx > newIndex) continue;
      const pos = this._slotPosition(idx, rowCount);
      const dummy = new THREE.Object3D();
      dummy.position.copy(pos);
      dummy.updateMatrix();
      const group = this.tierGroups[entry.tierId] || this.tierGroups.clay;
      group.setMatrixAt(entry.groupIdx, dummy.matrix);
      entry.matrix.copy(dummy.matrix);
      entry.position.copy(pos);
      entry.namePlane.position.set(pos.x, pos.y, B.d / 2 + 0.02);
    }
    const rowsAfter = Math.ceil(this.count / PER_ROW);
    if (rowsAfter > rowsBefore) this._ensureClosers(rowsAfter);
    this._growMortar(Math.max(rowsAfter, 1));
    this.wallHeight = rowsAfter * (B.h + B.gap);
    this._fitSun();
    this.onEmpty(false);
    this.onStats(this.count);
  }

  /* ───── إطار تلقائي للحائط بعد التحميل ───── */
  _frameWall() {
    const h = Math.max(this.wallHeight, 4);
    this.controls.target.set(0, Math.min(h * 0.45, 14), 0);
    this.controls.desired.radius = THREE.MathUtils.clamp(WALL_HALF * 2.0 + 8 + h * 0.6, 26, 130);
    this.controls.spherical.radius = this.controls.desired.radius + 26; /* دخول سينمائي */
    this.controls.desired.theta = 0.5;
    this.controls.desired.phi = 1.12;
  }

  resetView() {
    this.controls.enabled = false;
    const target = new THREE.Vector3(0, Math.min(this.wallHeight * 0.45, 14), 0);
    return flyCamera(this.camera, this.controls, target, new THREE.Vector3(14, 9, 34), 1.3)
      .then(() => {
        this._syncControls();
        this.controls.flying = false;
        this.controls.enabled = true;
      });
  }

  /* مزامنة الإحداثيات المدارية مع موضع الكاميرا الحالي */
  _syncControls() {
    const off = this.camera.position.clone().sub(this.controls.target);
    const r = THREE.MathUtils.clamp(off.length(), this.controls.minRadius, this.controls.maxRadius);
    const sph = {
      radius: r,
      phi: Math.acos(THREE.MathUtils.clamp(off.y / r, -1, 1)),
      theta: Math.atan2(off.x, off.z)
    };
    this.controls.spherical = { ...sph };
    this.controls.desired = { ...sph };
  }

  /* ───── تحريك الكاميرا نحو طوبة متبرع ───── */
  flyToBrick(brickId) {
    const b = this.bricks.get(brickId);
    if (!b) return Promise.resolve(false);
    const target = b.position.clone();
    const camPos = b.position.clone().add(new THREE.Vector3(0, 1.2, 10.5));
    this.controls.enabled = false;
    return flyCamera(this.camera, this.controls, target, camPos, 1.5).then(() => {
      this.controls.target.copy(target);
      this._syncControls();
      this.controls.flying = false;
      this.controls.enabled = true;
      return true;
    });
  }

  flyToDonor(donorId) {
    const brickId = this.byDonor.get(donorId);
    if (!brickId) return Promise.resolve(false);
    return this.flyToBrick(brickId).then(ok => ok);
  }

  /* ───── التقاط الطوبة والضغط عليها ┐ */
  _bindPick() {
    const dom = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0, downY = 0;
    let pressed = false;
    let hoverFrame = 0;
    let latestPointer = null;
    let lastHoverId = null;

    /* الضغط يحدد الطوبة مرة واحدة فقط بعد انتهاء اللمسة/النقرة */
    dom.addEventListener('pointerdown', e => {
      downX = e.clientX;
      downY = e.clientY;
      pressed = true;
      latestPointer = null;
      if (hoverFrame) cancelAnimationFrame(hoverFrame);
      hoverFrame = 0;
      if (this._brickTooltip) this._brickTooltip.style.display = 'none';
    }, { passive: true });

    dom.addEventListener('pointerup', e => {
      pressed = false;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) return;
      const hit = this._pick(e, ray, ndc);
      if (!hit) return;
      const entry = this.bricks.get(hit.recordId);
      if (!entry) return;

      /* افتح بيانات المتبرع فورًا؛ لا ننتظر انتهاء حركة الطوبة */
      const screen = this.worldToScreen(entry.position);
      this.onPick(entry.record, screen);
      sounds.pop();

      const group = this.tierGroups[entry.tierId];
      popBrick(
        m => group.getMatrixAt(entry.groupIdx, m),
        m => group.setMatrixAt(entry.groupIdx, m),
        entry.matrix
      );
    }, { passive: true });

    dom.addEventListener('pointercancel', () => { pressed = false; }, { passive: true });

    /* تلميح المرور اختياري للفأرة فقط؛ لا ننفذ Raycast مع كل حركة إصبع */
    const tip = document.createElement('div');
    tip.className = 'cw-brick-tooltip';
    Object.assign(tip.style, {
      position: 'fixed', zIndex: '10050', display: 'none',
      padding: '8px 13px', borderRadius: '10px',
      background: 'rgba(8, 14, 27, .96)', color: '#fff',
      border: '1px solid rgba(255,255,255,.2)',
      boxShadow: '0 8px 24px rgba(0,0,0,.35)',
      font: '800 13px/1.4 system-ui, sans-serif',
      whiteSpace: 'nowrap', pointerEvents: 'none',
      transform: 'translate(12px, 12px)'
    });
    document.body.appendChild(tip);
    this._brickTooltip = tip;

    const hideTip = () => {
      lastHoverId = null;
      tip.style.display = 'none';
      dom.style.cursor = 'grab';
    };
    dom.addEventListener('pointerleave', hideTip, { passive: true });
    dom.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || pressed || this._pointersBusy) {
        if (this._pointersBusy) hideTip();
        return;
      }
      latestPointer = { clientX: e.clientX, clientY: e.clientY };
      if (hoverFrame) return;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        const p = latestPointer;
        if (!p || pressed || this._pointersBusy) return;
        const hit = this._pick(p, ray, ndc);
        if (!hit) { hideTip(); return; }
        const entry = this.bricks.get(hit.recordId);
        if (!entry) { hideTip(); return; }
        dom.style.cursor = 'pointer';
        if (lastHoverId !== hit.recordId) {
          const tier = tierById(entry.tierId, this.tiers);
          tip.textContent = 'نوع الطوبة: ' + tier.label;
          lastHoverId = hit.recordId;
        }
        tip.style.left = Math.min(p.clientX, window.innerWidth - 175) + 'px';
        tip.style.top = Math.min(p.clientY, window.innerHeight - 55) + 'px';
        tip.style.display = 'block';
      });
    }, { passive: true });
  }

  get _pointersBusy() { return this.controls._pointers.size > 0; }

  _pick(e, ray, ndc) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, this.camera);
    const meshes = Object.values(this.tierGroups).map(g => g.mesh);
    const hits = ray.intersectObjects(meshes, false);
    for (const h of hits) {
      const recId = h.object.userData.byIndex && h.object.userData.byIndex[h.instanceId];
      if (recId) return { recordId: recId };
    }
    return null;
  }

  worldToScreen(v) {
    const p = v.clone().project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: (p.x * 0.5 + 0.5) * rect.width + rect.left,
      y: (-p.y * 0.5 + 0.5) * rect.height + rect.top
    };
  }

  /* ───── جودة العرض ───── */
  setQuality(q) {
    this.quality = q;
    this.renderer.shadowMap.enabled = q === 'high';
    this.sun.castShadow = q === 'high';
    this._applyPixelRatio();
    this._resize();
  }

  /* ───── حلقة الرسم ───── */
  _loop() {
    if (this._disposed) return;
    this._raf = requestAnimationFrame(() => this._loop());
    if (!this._visible || document.hidden) return;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    /* مراقبة الأداء: هبوط الإطارات → وضع خفيف تلقائي */
    const f = this._fps;
    f.frames++;
    const dt = performance.now() - f.t0;
    if (dt > 4000) {
      const fps = f.frames / (dt / 1000);
      if (fps < 26 && this.quality === 'high' && !f.lowNotified) {
        f.lowNotified = true;
        this.setQuality('low');
        this.onAutoLow();
      }
      f.frames = 0; f.t0 = performance.now();
    }
  }

  _resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose() {
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    this._ro && this._ro.disconnect();
    this._io && this._io.disconnect();
    this.renderer && this.renderer.dispose();
    this.renderer && this.renderer.domElement.remove();
  }
}
