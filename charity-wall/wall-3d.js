/* wall-3d.js — المشهد ثلاثي الأبعاد لحائط الخير (Three.js)
   - حائط بناء واقعي: 10 طوبات في كل صف، الصفوف متداخلة مثل البناء الحقيقي (نصف طوبة)
   - أسمنت ظاهر بين الطوبات وأساس وقاعدة خرسانية
   - خامات لكل فئة (طين/أحمر/فضي/ذهبي/ماسي) مع انعكاسات وإضاءة وظلال
   - أسماء المتبرعين مكتوبة دائمًا على واجهة كل طوبة (Canvas Texture)
   - InstancedMesh لكل فئة: الحائط يتوسع بلا حد مع أداء عالٍ
   - هرم جانبي بالأنواع الخمسة + عدادات حية، ومنه تنطلق الطوبات الجديدة
   - تحكم كامل بالكاميرا: سحب للدوران، عجلة/قرصة للتقريب، سحب بإصبعين للتحريك
   - المطرقة (الشاكوش) تظهر عند الاقتراب من أي طوبة أو توجيه المؤشر إليها:
     • ضغطة واحدة → فتح الطوبة: بيانات المتبرع مع تقدم الطوبة من الحائط ثم عودتها لمكانها بعد 5 ثوانٍ
     • الاستمرار بالضغط/النقر المتكرر → طرق متتالٍ وتشقق ثم تحطيم
     • بعد التحطيم يظهر مكان الطوبة «المبلغ المدفوع» ثلاثي الأبعاد مع نوعها
     • بعد 5 ثوانٍ تُعاد بناء الطوبة ويمكن تكرار الدورة
   - الطوبات تبقى بعد إعادة التحميل (Firestore)
   - وضع أداء منخفض للأجهزة الضعيفة + إيقاف الرسم عند خروج الصفحة عن الشاشة */

import * as THREE from './vendor/three.module.js';
import { TIERS, tierById, egp } from './firebase-config.js';
import { sounds } from './sounds.js';
import {
  flyBrick, dustBurst, lightFlash, breakBrick, popBrick, flyCamera,
  brickShake, debrisBurst, smashBrick, rebuildBrick, bezierPoint, killPop
} from './animations.js';

/* ─── أبعاد البناء ─── */
export const PER_ROW = 10;
const B = { w: 2.3, h: 1.05, d: 1.15, gap: 0.14 };
const S = B.w + B.gap;           /* خطوة الطوبة أفقياً */
export const WALL_HALF = 4.5 * S + B.w / 2; /* نصف عرض الحائط */
const PYRAMID_X = WALL_HALF + 11.5;         /* موضع الهرم جانب الحائط */

/* ─── إعدادات المطرقة والكسر ─── */
const HITS_TO_BREAK = 4;     /* عدد الضربات لتحطيم الطوبة (الأولى تفتح بيانات المتبرع) */
const COMBO_MS = 1700;      /* مهلة بقاء «وضع الكسر» بين الضغطات المتتالية */
const HOLD_MS = 480;        /* الاستمرار بالضغط هذه المدة يبدأ الطرق التلقائي */
const HAMMER_PERIOD = 430;  /* فاصل ضربات الطرق التلقائي أثناء الاستمرار بالضغط */
const CLOSE_RADIUS = 17;    /* اقتراب الكاميرا هذه المسافة يُظهر المطرقة فوق أقرب طوبة */
const RESTORE_MS = 5000;    /* مهلة موحدة: إغلاق الطوبة المفتوحة أو إعادة بناء المكسورة بعد 5 ثوانٍ */

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

/* ─── نسيج شقوق الطوبة (يتصاعد مع ضربات المطرقة) ─── */
const crackCache = new Map();
function crackTexture(level, variant = 0) {
  const key = level + '|' + variant;
  if (crackCache.has(key)) return crackCache.get(key);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const lines = level === 1 ? 5 : 9;
  /* شقوق متعرجة تنطلق من نقطة الارتطام أعلى منتصف الواجهة */
  for (let i = 0; i < lines; i++) {
    let x = 256 + (Math.random() - 0.5) * 90;
    let y = 34 + Math.random() * 26;
    const segs = 4 + Math.floor(Math.random() * 4);
    const angle = (Math.PI * (0.25 + 0.5 * Math.random())) + (Math.random() < 0.5 ? 0 : Math.PI);
    const pts = [[x, y]];
    for (let s = 0; s < segs; s++) {
      const len = (level === 1 ? 18 : 26) + Math.random() * 34;
      const a = angle + (Math.random() - 0.5) * 0.9;
      x += Math.cos(a) * len;
      y += Math.sin(Math.abs(a)) * len * (Math.random() < 0.85 ? 1 : -0.35);
      x = Math.max(14, Math.min(498, x));
      y = Math.max(14, Math.min(242, y));
      pts.push([x, y]);
    }
    /* حافة مضيئة خلف الشق (إحساس العمق) ثم الشق الداكن العريض */
    ctx.strokeStyle = 'rgba(255,240,214,.28)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(pts[0][0] + 3, pts[0][1] + 3);
    pts.slice(1).forEach(p => ctx.lineTo(p[0] + 3, p[1] + 3));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(6,3,1,.95)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.stroke();
  }

  /* المستوى الثاني: حفر وتفتت إضافي حول نقطة الارتطام */
  if (level >= 2) {
    for (let i = 0; i < 12; i++) {
      const cx = 256 + (Math.random() - 0.5) * 230;
      const cy = 44 + Math.random() * 200;
      const r = 4 + Math.random() * 10;
      ctx.fillStyle = 'rgba(6,3,1,.9)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * (0.55 + Math.random() * 0.5), Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  crackCache.set(key, tex);
  return tex;
}

/* ─── لوحة «المبلغ المدفوع» ثلاثية الأبعاد (Sprite بألوان الفئة) ─── */
const amountCache = new Map();
function amountTexture(record, tier) {
  const value = egp(record && (record.totalDonation || record.amount) || 0);
  const key = value + '|' + tier.id;
  if (amountCache.has(key)) return amountCache.get(key);
  const c = document.createElement('canvas');
  c.width = 640; c.height = 320;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 640, 320);
  ctx.direction = 'rtl';

  /* خلفية اللوحة بإطار بلون الفئة */
  ctx.shadowColor = tier.cssColor;
  ctx.shadowBlur = 26;
  ctx.fillStyle = 'rgba(7,11,20,.93)';
  roundRect(ctx, 14, 14, 612, 292, 30);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = tier.cssColor;
  ctx.lineWidth = 6;
  roundRect(ctx, 14, 14, 612, 292, 30);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.lineWidth = 2;
  roundRect(ctx, 28, 28, 584, 264, 22);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2d998';
  ctx.shadowColor = 'rgba(0,0,0,.8)';
  ctx.shadowBlur = 8;
  ctx.font = '800 46px Cairo, Tajawal, sans-serif';
  ctx.fillText('المبلغ المدفوع', 320, 84);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 96px Cairo, Tajawal, sans-serif';
  ctx.shadowBlur = 14;
  ctx.fillText(value, 320, 176, 560);

  /* شريحة نوع الطوبة */
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  roundRect(ctx, 205, 234, 230, 54, 18);
  ctx.fill();
  ctx.strokeStyle = tier.cssColor;
  ctx.lineWidth = 2;
  roundRect(ctx, 205, 234, 230, 54, 18);
  ctx.stroke();
  ctx.fillStyle = tier.cssColor;
  ctx.shadowColor = 'rgba(255,255,255,.45)';
  ctx.shadowBlur = 9;
  ctx.font = '800 38px Cairo, Tajawal, sans-serif';
  ctx.fillText('طوبة ' + tier.label, 320, 262);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (amountCache.size > 120) {
    const first = amountCache.keys().next().value;
    const old = amountCache.get(first);
    old.dispose(); amountCache.delete(first);
  }
  amountCache.set(key, tex);
  return tex;
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
    this._minRadiusDefault = this.minRadius;
    this.enabled = true;
    this.autoRotate = false;        /* دوران هادئ عند الخمول */
    this.autoRotateSpeed = 0.05;    /* راديان/ثانية */
    this._idleTimer = null;
    this._pointers = new Map();
    this._lastPinch = 0;
    this._lastPan = null;
    this._moved = 0;

    dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', e => { this._down(e); this._wake(); });
    dom.addEventListener('pointermove', e => this._move(e));
    dom.addEventListener('pointerup', e => { this._up(e); this._wake(); });
    dom.addEventListener('pointercancel', e => { this._up(e); this._wake(); });
    dom.addEventListener('wheel', e => { this._wheel(e); this._wake(); }, { passive: false });
    dom.addEventListener('contextmenu', e => e.preventDefault());
  }
  /* إيقاف الدوران التلقائي عند أي تفاعل واستئنافه بعد خمول 7 ثوانٍ */
  _wake() {
    this._pauseAuto();
    clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      if (this.enabled && this._pointers.size === 0) this.autoRotate = this.autoRotateEnabled !== false;
    }, 7000);
  }
  _pauseAuto() { this.autoRotate = false; }
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
    /* إبقاء الهدف داخل ساحة الحائط حتى لا يضيع المشهد بعيداً */
    this.target.x = THREE.MathUtils.clamp(this.target.x, -34, 34);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -26, 40);
    this.target.y = THREE.MathUtils.clamp(this.target.y, 0.5, 26);
  }
  _wheel(e) {
    e.preventDefault();
    if (!this.enabled) return;
    this.desired.radius = THREE.MathUtils.clamp(
      this.desired.radius * (1 + Math.sign(e.deltaY) * 0.11), this.minRadius, this.maxRadius);
  }
  update(dt = 0.016) {
    if (this.flying) { this.camera.lookAt(this.target); return; } /* طيران مُبرمَج: لا مقاومة */
    /* دوران هادئ حول الحائط عند الخمول */
    if (this.autoRotate && this.enabled && this._pointers.size === 0) {
      this.desired.theta += this.autoRotateSpeed * dt;
    }
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

/* ═══ المطرقة (الشاكوش) ثلاثية الأبعاد ═══
   تظهر فوق الطوبة المستهدفة عند الاقتراب أو توجيه المؤشر،
   تتأرجح للأسفل عند كل ضربة ثم تعود لوضع الاستعداد.
   البنية: group (الموضع/الدوران العالمي) ← bob (طفو هادئ) ← القبضة والرأس */
const HAMMER_SCALE = 0.72; /* حجم المطرقة نسبة إلى الطوبة — يظهر كاملًا في اللقطة القريبة */
class Hammer3D {
  constructor(scene) {
    this.scene = scene;
    this.target = null;
    this.swinging = false;

    const group = new THREE.Group();
    const bob = new THREE.Group();
    group.add(bob);

    /* القبضة الخشبية — تمتد من الرأس للأعلى */
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xa97444, roughness: 0.6, metalness: 0.02,
      emissive: 0x3a2410, emissiveIntensity: 1.1,
      envMapIntensity: 1.3
    });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.07, 1.78, 10), handleMat);
    handle.position.y = 0.95;
    handle.castShadow = true;
    bob.add(handle);
    /* مقبض مطاطي أسفل القبضة */
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.3, 10),
      new THREE.MeshStandardMaterial({ color: 0x2c313c, roughness: 0.8, metalness: 0.1, emissive: 0x10141c, emissiveIntensity: 1.2 })
    );
    grip.position.y = 0.14;
    bob.add(grip);

    /* الرأس المعدني عند أصل المجموعة (نقطة الارتطام) — إضاءة ذاتية كافية
       حتى لا يبدو أسود وهو يعكس سماء المشهد الليلية الداكنة */
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xcfd9e3, metalness: 0.55, roughness: 0.32,
      emissive: 0x2b3c44, emissiveIntensity: 1.15,
      envMapIntensity: 1.5
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.36, 0.42), headMat);
    head.castShadow = true;
    bob.add(head);
    /* وجهاه معدنية بارزة قليلاً (مطرقة تكسير مسطحة الوجهين) */
    const faceGeo = new THREE.BoxGeometry(0.1, 0.3, 0.36);
    const faceL = new THREE.Mesh(faceGeo, headMat);
    faceL.position.set(0.43, 0, 0);
    const faceR = new THREE.Mesh(faceGeo, headMat);
    faceR.position.set(-0.43, 0, 0);
    bob.add(faceL, faceR);

    group.visible = false;
    group.scale.setScalar(0.001);
    scene.add(group);
    this.group = group;
    this.bob = bob;

    /* طفو هادئ في وضع الاستعداد */
    this._bobTween = gsap.to(bob.position, {
      y: 0.07, duration: 1.15, yoyo: true, repeat: -1, ease: 'sine.inOut'
    });
  }

  /* نقطة الارتطام على واجهة الطوبة (أعلى منتصف الواجهة) */
  impactOf(entry) {
    return new THREE.Vector3(
      entry.position.x,
      entry.position.y + B.h * 0.28,
      entry.position.z + B.d / 2
    );
  }

  /* وضع الاستعداد: المطرقة جانب الطوبة (يمينها) بميل مائل نحو الكاميرا —
     يظهر كاملًا في اللقطة القريبة دون أن يقطعه إطار الشاشة */
  restPose(entry) {
    const impact = this.impactOf(entry);
    return {
      pos: impact.clone().add(new THREE.Vector3(1.42, 0.34, 1.14)),
      rotX: 1.05,
      rotZ: -0.5
    };
  }

  setTarget(entry) {
    if (this.target === entry) return;
    this.target = entry;
    const rest = this.restPose(entry);
    this.group.visible = true;
    if (this._moveTl) this._moveTl.kill();
    this._moveTl = gsap.timeline();
    this._moveTl.to(this.group.position, { x: rest.pos.x, y: rest.pos.y, z: rest.pos.z, duration: 0.32, ease: 'power2.out' }, 0)
      .to(this.group.rotation, { x: rest.rotX, y: 0, z: rest.rotZ, duration: 0.32, ease: 'power2.out' }, 0)
      .to(this.group.scale, { x: HAMMER_SCALE, y: HAMMER_SCALE, z: HAMMER_SCALE, duration: 0.3, ease: 'back.out(2.2)' }, 0);
  }

  clearTarget() {
    if (!this.target && !this.group.visible) return;
    this.target = null;
    if (this._moveTl) this._moveTl.kill();
    this._moveTl = gsap.to(this.group.scale, {
      x: 0.001, y: 0.001, z: 0.001, duration: 0.22, ease: 'back.in(1.8)',
      onComplete: () => { this.group.visible = false; }
    });
  }

  /* رفعة سريعة ثم ارتطام على قوس بيزيه أمام الحائط ثم عودة للاستعداد
     onImpact: يُنادى لحظة الارتطام (مؤثرات وصوت الكسر) */
  swing(entry, onImpact) {
    const impact = this.impactOf(entry);
    const rest = this.restPose(entry);
    const raise = impact.clone().add(new THREE.Vector3(0.55, 1.62, 1.5));
    const hit = impact.clone().add(new THREE.Vector3(0.02, 0.06, 0.12));
    const control = impact.clone().add(new THREE.Vector3(0.85, 1.1, 1.72));

    this.group.visible = true;
    if (this._swingTl) this._swingTl.kill();
    this.swinging = true;
    const self = this;
    const state = { t: 0 };

    this._swingTl = gsap.timeline({
      onComplete() { self.swinging = false; }
    });
    /* 1) التهيئة السريعة للأعلى مع استعادة الوجه الأفقي للرأس */
    this._swingTl.to(this.group.position, { x: raise.x, y: raise.y, z: raise.z, duration: 0.1, ease: 'power2.out' }, 0)
      .to(this.group.rotation, { x: 1.12, z: 0, duration: 0.1 }, 0)
      .to(this.group.scale, { x: HAMMER_SCALE, y: HAMMER_SCALE, z: HAMMER_SCALE, duration: 0.08 }, 0)
      /* 2) الهبوط على قوس أمام الحائط */
      .to(state, {
        t: 1, duration: 0.11, ease: 'power3.in',
        onUpdate() {
          const p = bezierPoint(raise, control, hit, state.t);
          self.group.position.copy(p);
          self.group.rotation.x = 1.12 - 0.8 * state.t;
        }
      })
      /* 3) لحظة الارتطام: ارتداد صغير + المؤثرات */
      .call(() => {
        sounds.clank();
        if (onImpact) onImpact();
      })
      .to(this.group.position, {
        x: hit.x, y: hit.y + 0.16, z: hit.z + 0.22, duration: 0.06, ease: 'power2.out'
      })
      /* 4) العودة لوضع الاستعداد */
      .to(this.group.position, { x: rest.pos.x, y: rest.pos.y, z: rest.pos.z, duration: 0.26, ease: 'power2.inOut' })
      .to(this.group.rotation, { x: rest.rotX, z: rest.rotZ, duration: 0.26, ease: 'power2.inOut' }, '<');
    return this._swingTl;
  }

  dispose() {
    if (this._bobTween) this._bobTween.kill();
    if (this._moveTl) this._moveTl.kill();
    if (this._swingTl) this._swingTl.kill();
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.scene.remove(this.group);
  }
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
    this.onHold = opts.onHold || (() => {});
    this.onCloseCard = opts.onCloseCard || (() => {});
    this.onEmpty = opts.onEmpty || (() => {});
    this.onStats = opts.onStats || (() => {});
    this.onAutoLow = opts.onAutoLow || (() => {});

    this.bricks = new Map();      /* brickId → {record, tierId, groupIdx, matrix, namePlane} */
    this.byDonor = new Map();     /* donorId → brickId */
    this.count = 0;
    this.hammer = null;           /* المطرقة ثلاثية الأبعاد */
    this._hoverBrickId = null;    /* الطوبة تحت المؤشر (لغة المطرقة) */
    this._autoHammer = null;      /* مؤقت الطرق التلقائي عند الاستمرار بالضغط */
    this._hammerT = 0;            /* خنق فحص اقتراب الكاميرا */
    this._rayTmp = new THREE.Raycaster();
    this._ndcTmp = new THREE.Vector2();
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
    this.hammer = new Hammer3D(this.scene);

    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(c);

    /* دوران هادئ حول الحائط عند الخمول (يُعطّل مع تفضيل تقليل الحركة) */
    this.controls.autoRotateEnabled = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.controls.autoRotateEnabled) this.controls._wake();

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
      this._cleanupEntry(b);
    }
    this.bricks.clear();
    this.byDonor.clear();
    this.hammer && this.hammer.clearTarget();
    this._hoverBrickId = null;
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
    /* لوحة الاسم هدف التقاط مستقل؛ تضمن فتح الطوبة حتى إذا أخفق Raycast جسم الفئة */
    plane.userData.recordId = record.id;
    plane.userData.isBrickLabel = true;
    this.wallGroup.add(plane);

    this.bricks.set(record.id, {
      /* finalMatrix هي المصفوفة الكاملة بمقياس 1 — dummy.matrix تكون قد انكمشت إلى
         0.001 لإخفاء أنيميشن الطيران، وحفظها هنا كان يجعل الطوبة تختفي نهائيًا
         عند أول ضغطة (فتحها) ولا تعود بعد الكسر، لأن كل حركات الاهتزاز/التحطيم/
         إعادة البناء تستخدم هذه المصفوفة كأساس */
      record, tierId, groupIdx: idx, matrix: finalMatrix,
      namePlane: plane, position: pos.clone(), labelBaseZ: plane.position.z
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
    /* استعادة مدى التقريب الافتراضي بعد لقطات الطوبات القريبة */
    this.controls.minRadius = this.controls._minRadiusDefault || 7;
    const h = Math.max(this.wallHeight || 4, 4);
    const target = new THREE.Vector3(0, Math.min(h * 0.45, 14), 0);
    const radius = THREE.MathUtils.clamp(WALL_HALF * 2.0 + 8 + h * 0.6, 26, 130);
    const theta = 0.5, phi = 1.12;
    const camPos = new THREE.Vector3(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    return flyCamera(this.camera, this.controls, target, camPos, 1.3)
      .then(() => {
        this._syncControls();
        this.controls.flying = false;
        this.controls.enabled = true;
        this.controls._wake();
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

    /* لقطة قريبة أمامية: الطوبة المختارة في مركز الصورة وبعيدة عن تشويش بقية الحائط */
    const target = b.position.clone();
    target.y += 0.12;
    const camPos = target.clone().add(new THREE.Vector3(0, 0.72, 4.65));

    /* اسمح بزوم أقرب بعد الوصول دون أن تقفز الكاميرا للخلف */
    this.controls.minRadius = 3.2;
    this.controls.enabled = false;
    this.controls.flying = true;
    this.controls._pauseAuto();

    return flyCamera(this.camera, this.controls, target, camPos, 1.85).then(() => {
      this.controls.target.copy(target);
      this._syncControls();
      this.controls.flying = false;
      this.controls.enabled = true;
      /* مزامنة المسافة الفعلية بدقة مع وضع الكاميرا القريب */
      const offset = this.camera.position.clone().sub(target);
      const radius = Math.max(3.2, offset.length());
      const phi = Math.acos(THREE.MathUtils.clamp(offset.y / radius, -1, 1));
      const theta = Math.atan2(offset.x, offset.z);
      this.controls.spherical = { radius, phi, theta };
      this.controls.desired = { radius, phi, theta };
      return true;
    });
  }

  flyToDonor(donorId) {
    const brickId = this.byDonor.get(donorId);
    if (!brickId) return Promise.resolve(false);
    return this.flyToBrick(brickId).then(ok => ok);
  }

  /* ───── ضربة مطرقة على الطوبة ─────
     الضغطة الأولى من السلسلة تفتح بيانات المتبرع،
     والاستمرار في الضغط/النقر يتراكم حتى التحطيم الكامل */
  _hitBrick(entry, screen) {
    if (!entry || entry._broken || entry._breaking || this._disposed) return;
    const now = performance.now();
    const st = entry._hits || (entry._hits = { count: 0, t: 0 });
    if (st.count > 0 && now - st.t > COMBO_MS) {
      st.count = 0;
      this._hideCracks(entry);
    }
    st.t = now;
    st.count++;
    const hitNo = st.count;

    if (this.hammer && this.hammer.target !== entry) this.hammer.setTarget(entry);

    const onImpact = () => {
      if (entry._broken || entry._breaking || this._disposed) return;
      const pos = entry.position;
      const group = this.tierGroups[entry.tierId] || this.tierGroups.clay;
      const tier = tierById(entry.tierId, this.tiers);
      const hitPoint = this.hammer ? this.hammer.impactOf(entry) : pos.clone().add(new THREE.Vector3(0, 0, B.d / 2));
      debrisBurst(this.scene, hitPoint, tier.color, { low: this.quality === 'low' });
      if (hitNo === 1) {
        /* ضغطة واحدة → فتح الطوبة: تتقدم من الحائط مع بيانات المتبرع
           ثم تعود إلى مكانها بعد 5 ثوانٍ (بذات مهلة إخفاء البطاقة) */
        popBrick(group, entry, { holdSec: 5 });
        this.onPick(entry.record, screen || this.worldToScreen(pos));
      } else {
        /* ضربات متتالية → إغلاق البطاقة وتشقق متصاعد */
        brickShake(group, entry, 1.5);
        this.onCloseCard();
        sounds.crack();
        this._showCracks(entry, hitNo >= 3 ? 2 : 1);
        if (entry.crackPlane) {
          gsap.fromTo(entry.crackPlane.scale, { x: 1.06, y: 1.06 }, { x: 1, y: 1, duration: 0.32, ease: 'power2.out' });
        }
      }
      if (hitNo >= HITS_TO_BREAK) this._smashBrick(entry);
    };

    if (this.hammer) this.hammer.swing(entry, onImpact);
    else { sounds.clank(); onImpact(); }
  }

  /* ───── تحطيم الطوبة: شظايا ثم «المبلغ المدفوع» ثلاثي الأبعاد ───── */
  _smashBrick(entry) {
    if (!entry || entry._broken) return;
    entry._broken = true;
    this._hideCracks(entry);
    const group = this.tierGroups[entry.tierId] || this.tierGroups.clay;
    sounds.crash();
    smashBrick(this.scene, group, entry, { low: this.quality === 'low' });
    this._showAmount3D(entry);
    entry._restoreTimer = setTimeout(() => this._restoreBrick(entry), RESTORE_MS);
  }

  /* ───── لوحة «المبلغ المدفوع» + طوبة مصغرة بنفس الفئة تدور ───── */
  _showAmount3D(entry) {
    const tier = tierById(entry.tierId, this.tiers);
    const record = entry.record;
    const g = new THREE.Group();
    g.position.copy(entry.position);
    g.position.z = 0.35;

    /* طوبة مصغرة من نوع الطوبة نفسه — تدور أمام مكان الطوبة */
    const mini = new THREE.Mesh(this.brickGeo, this.materials[entry.tierId] || this.materials.clay);
    mini.scale.setScalar(0.5);
    mini.position.set(0, -0.78, 0.6);
    mini.castShadow = this.quality === 'high';
    g.add(mini);

    /* لوحة المبلغ المدفوع (تواجه الكاميرا دائمًا) */
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: amountTexture(record, tier), transparent: true, depthWrite: false
    }));
    sprite.scale.set(3.9, 1.95, 1);
    sprite.position.set(0, 0.62, 1.45);
    g.add(sprite);

    /* هالة ضوئية بلون الفئة */
    const light = new THREE.PointLight(tier.color, 7, 9, 2);
    light.position.set(0, 0.3, 1.7);
    g.add(light);

    this.scene.add(g);

    /* دخول لافت + طفو وتدور مستمران */
    g.scale.setScalar(0.001);
    sprite.material.opacity = 0;
    const baseY = g.position.y;
    const tweens = [
      gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.8)' }),
      gsap.to(sprite.material, { opacity: 1, duration: 0.22, delay: 0.05 }),
      gsap.to(g.position, { y: baseY + 0.22, duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
      gsap.to(mini.rotation, { y: Math.PI * 2, duration: 3.4, repeat: -1, ease: 'none' }),
      gsap.to(light, { intensity: 11, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    ];
    sounds.chime();

    const amountObj = { group: g, sprite, mini, light, tweens };
    entry._amount = amountObj;
    /* اختفاء لطيف قبيل عودة الطوبة مباشرة */
    entry._amountFade = setTimeout(() => {
      if (entry._amount !== amountObj || this._disposed) return;
      gsap.to(g.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.4, ease: 'back.in(1.6)' });
      gsap.to(sprite.material, { opacity: 0, duration: 0.35 });
    }, Math.max(400, RESTORE_MS - 620));
  }

  _removeAmount(entry) {
    const a = entry._amount;
    if (!a) return;
    if (entry._amountFade) { clearTimeout(entry._amountFade); entry._amountFade = null; }
    (a.tweens || []).forEach(t => t && t.kill());
    this.scene.remove(a.group);
    if (a.sprite) a.sprite.material.dispose(); /* نسيج اللوحة مُخزَّن مشتركًا */
    entry._amount = null;
  }

  /* ───── عودة الطوبة بعد 5 ثوانٍ وتصفير حالة الكسر ───── */
  _restoreBrick(entry) {
    entry._restoreTimer = null;
    if (this._disposed || !this.bricks.has(entry.record.id)) return;
    killPop(entry); /* إن كانت الطوبة متقدمة (مفتوحة) تُعاد فورًا قبل إعادة البناء */
    entry._broken = false;
    entry._breaking = false;
    if (entry._hits) entry._hits.count = 0;
    this._removeAmount(entry);
    const group = this.tierGroups[entry.tierId] || this.tierGroups.clay;
    rebuildBrick(this.scene, group, entry, { low: this.quality === 'low' });
    if (entry.namePlane) {
      entry.namePlane.visible = true;
      entry.namePlane.material.opacity = 0;
      gsap.to(entry.namePlane.material, { opacity: 1, duration: 0.5 });
    }
    dustBurst(this.scene, entry.position.clone().add(new THREE.Vector3(0, 0, B.d / 2)), {
      low: this.quality === 'low', count: this.quality === 'low' ? 10 : 22
    });
    lightFlash(this.scene, entry.position, 0x9edcff);
    sounds.thud();
  }

  /* ───── شقوق متصاعدة على واجهة الطوبة ───── */
  _showCracks(entry, level) {
    if (!entry || entry._broken) return;
    if (entry._crackVariant == null) entry._crackVariant = Math.floor(Math.random() * 3);
    if (!entry.crackPlane) {
      entry.crackPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(B.w * 0.98, B.h * 0.98),
        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 })
      );
      entry.crackPlane.position.set(entry.position.x, entry.position.y, B.d / 2 + 0.05);
      entry.crackPlane.renderOrder = 3;
      this.wallGroup.add(entry.crackPlane);
    }
    entry.crackPlane.material.map = crackTexture(level, entry._crackVariant);
    entry.crackPlane.material.needsUpdate = true;
    entry.crackPlane.visible = true;
    gsap.fromTo(entry.crackPlane.material, { opacity: 0 }, { opacity: level === 1 ? 0.9 : 1, duration: 0.2 });
  }

  _hideCracks(entry) {
    if (!entry || !entry.crackPlane) return;
    this.wallGroup.remove(entry.crackPlane);
    entry.crackPlane.geometry.dispose();
    entry.crackPlane.material.dispose(); /* النسيج مشترك مخزَّن — لا يُتلف */
    entry.crackPlane = null;
  }

  /* ───── تنظيف حالة طوبة (إعادة تحميل الحائط) ───── */
  _cleanupEntry(entry) {
    if (entry._shakeTween) { entry._shakeTween.kill(); entry._shakeTween = null; }
    if (entry._restoreTimer) { clearTimeout(entry._restoreTimer); entry._restoreTimer = null; }
    killPop(entry);
    this._removeAmount(entry);
    this._hideCracks(entry);
    entry._broken = false;
    entry._breaking = false;
    entry._hits = null;
  }

  _stopAutoHammer() {
    if (this._autoHammer) { clearInterval(this._autoHammer); this._autoHammer = null; }
  }

  /* ───── استهداف المطرقة: مؤشر فوق طوبة أو اقتراب الكاميرا ───── */
  _updateHammerTarget(now) {
    if (!this.hammer || this._disposed) return;
    if (now - this._hammerT < 130) return;
    this._hammerT = now;
    const radius = this.controls.spherical.radius;

    let entry = null;
    /* 1) الطوبة تحت مؤشر الفأرة (على مسافة معقولة) */
    if (this._hoverBrickId && radius < 26) {
      const e = this.bricks.get(this._hoverBrickId);
      if (e && !e._broken && !e._breaking) entry = e;
    }
    /* 2) اقتراب الكاميرا: المطرقة فوق الطوبة عند مركز الشاشة (يعمل مع اللمس) */
    if (!entry && radius < CLOSE_RADIUS) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const center = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      const hit = this._pick(center, this._rayTmp, this._ndcTmp);
      if (hit) {
        const e = this.bricks.get(hit.recordId);
        if (e && !e._broken && !e._breaking) entry = e;
      }
    }

    if (entry && this.hammer.target !== entry) {
      this.hammer.setTarget(entry);
    } else if (!entry && this.hammer.target) {
      const t = this.hammer.target;
      const gone = t._broken || t._breaking || !this.bricks.has(t.record.id);
      if (gone || radius >= CLOSE_RADIUS) this.hammer.clearTarget();
    }
  }

  /* ───── التقاط الطوبة والضغط عليها ┐ */
  _bindPick() {
    const dom = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0, downY = 0, pressed = false, longPressed = false;
    let holdTimer = null, hoverFrame = 0, latestPointer = null, lastHoverId = null, downEntry = null;

    const clearHold = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = null; };
    const hammerCursor = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Cpath d=%22M8 8l7-6 11 11-6 7z%22 fill=%22%23d6dce8%22 stroke=%22%23111827%22 stroke-width=%222%22/%3E%3Cpath d=%22M18 17L7 34l4 3 12-17%22 fill=%22%239b6338%22 stroke=%22%23111%22 stroke-width=%222%22/%3E%3C/svg%3E") 8 5, pointer';

    dom.addEventListener('pointerdown', e => {
      downX = e.clientX; downY = e.clientY; pressed = true; longPressed = false;
      this._hoverBrickId = null;
      const downHit = this._pick(e, ray, ndc);
      downEntry = downHit ? this.bricks.get(downHit.recordId) : null;
      latestPointer = null;
      if (hoverFrame) cancelAnimationFrame(hoverFrame);
      hoverFrame = 0;
      if (this._brickTooltip) this._brickTooltip.style.display = 'none';
      if (!downEntry || downEntry._broken) return;
      /* الاستمرار بالضغط على الطوبة → طرق تلقائي متتالٍ بالمطرقة */
      holdTimer = setTimeout(() => {
        if (!pressed || !downEntry || downEntry._broken) { clearHold(); return; }
        longPressed = true;
        this._hitBrick(downEntry, this.worldToScreen(downEntry.position));
        this._stopAutoHammer();
        this._autoHammer = setInterval(() => {
          if (!pressed || !downEntry || this._disposed || downEntry._broken) {
            this._stopAutoHammer();
            return;
          }
          this._hitBrick(downEntry, this.worldToScreen(downEntry.position));
        }, HAMMER_PERIOD);
      }, HOLD_MS);
    }, { passive: true });

    dom.addEventListener('pointerup', e => {
      pressed = false;
      clearHold();
      this._stopAutoHammer();
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY) > 7;
      if (moved || longPressed) { downEntry = null; return; }
      const hit = this._pick(e, ray, ndc);
      if (!hit) { downEntry = null; return; }
      const entry = this.bricks.get(hit.recordId);
      downEntry = null;
      if (!entry) return;
      /* ضغطة واحدة → بيانات المتبرع، والاستمرار في الضغط → الكسر بالمطرقة */
      this._hitBrick(entry, this.worldToScreen(entry.position));
    }, { passive: true });

    dom.addEventListener('pointercancel', () => {
      pressed = false; clearHold(); this._stopAutoHammer(); downEntry = null;
    }, { passive: true });

    /* إيقاف الطرق التلقائي فور بدء السحب (تدوير الكاميرا) */
    dom.addEventListener('pointermove', e => {
      if (!pressed) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 9) {
        clearHold();
        this._stopAutoHammer();
        longPressed = true; /* سحب: لا تُحسب نقرة عند الإفلات */
      }
    }, { passive: true });

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
      this._hoverBrickId = null;
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
        if (!entry || entry._broken) { hideTip(); return; }
        dom.style.cursor = hammerCursor;
        this._hoverBrickId = hit.recordId;
        if (lastHoverId !== hit.recordId) {
          const tier = tierById(entry.tierId, this.tiers);
          tip.textContent = 'نوع الطوبة: ' + tier.label + ' • اضغط مرة لبيانات المتبرع • استمر في الضغط لكسرها بالمطرقة';
          lastHoverId = hit.recordId;
        }
        tip.style.left = Math.min(p.clientX, window.innerWidth - 230) + 'px';
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
      if (recId && this.bricks.has(recId)) return { recordId: recId };
    }

    /* احتياط مهم: التقط لوحة الاسم نفسها، لا تعتمد على خامة الطوبة المعدنية */
    const labels = [];
    for (const entry of this.bricks.values()) {
      if (entry.namePlane && entry.namePlane.visible) labels.push(entry.namePlane);
    }
    const labelHits = ray.intersectObjects(labels, false);
    for (const h of labelHits) {
      const recId = h.object.userData && h.object.userData.recordId;
      if (recId && this.bricks.has(recId)) return { recordId: recId };
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

    const now = performance.now();
    const frameDt = Math.min((now - (this._lastT || now)) / 1000, 0.05);
    this._lastT = now;
    this.controls.update(frameDt);
    this._updateHammerTarget(now);
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
    this._stopAutoHammer();
    cancelAnimationFrame(this._raf);
    this._ro && this._ro.disconnect();
    this._io && this._io.disconnect();
    this.hammer && this.hammer.dispose();
    if (this._brickTooltip) { this._brickTooltip.remove(); this._brickTooltip = null; }
    this.renderer && this.renderer.dispose();
    this.renderer && this.renderer.domElement.remove();
  }
}
