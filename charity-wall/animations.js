/* animations.js — حركات وطموحات GSAP لحائط الخير
   - flyBrick: طيران الطوبة من الهرم إلى موضعها في الحائط على مسار منحني مع دورانها
   - dustBurst: مؤثر غبار عند استقرار الطوبة
   - lightFlash: وميض ضوء عند الاستقرار
   - popBrick: فرقعة الطوبة للأمام عند الضغط وعودتها
   - brickShake: اهتزاز الطوبة عند ضربة المطرقة
   - debrisBurst: شظايا صغيرة تتناثر مع كل ضربة
   - smashBrick: تحطيم الطوبة بشظايا تسقط بجاذبية (إعادة البناء تُجدولها wall-3d)
   - rebuildBrick: عودة الطوبة بعد الكسر بمرونة (elastic)
   - طيران الكاميرا نحو طوبة متبرع */

import * as THREE from './vendor/three.module.js';

/* مسار بيزيه تربيعي بين نقطتين مع نقطة تحكم علوية */
export function bezierPoint(a, b, c, t) {
  const it = 1 - t;
  return new THREE.Vector3(
    it * it * a.x + 2 * it * t * b.x + t * t * c.x,
    it * it * a.y + 2 * it * t * b.y + t * t * c.y,
    it * it * a.z + 2 * it * t * b.z + t * t * c.z
  );
}

/* ═══ طيران الطوبة من الهرم إلى موضعها ═══
   mesh: طوبة مؤقتة تُرسم أثناء الطيران ثم تُزال
   from / to: THREE.Vector3 — نقطة البداية (قمة الهرم) والنهاية (الموضع النهائي)
   onLand: يُنادى عند الاستقرار
   returns: promise تُحل عند نهاية الحركة */
export function flyBrick(mesh, from, to, opts = {}) {
  const height = opts.height != null ? opts.height : 6;
  const control = new THREE.Vector3(
    (from.x + to.x) / 2 + (opts.side || 0),
    Math.max(from.y, to.y) + height,
    (from.z + to.z) / 2 + 3
  );
  const state = { t: 0 };
  mesh.position.copy(from);
  mesh.visible = true;

  return new Promise(resolve => {
    gsap.to(state, {
      t: 1,
      duration: opts.duration != null ? opts.duration : 1.7,
      ease: 'power2.inOut',
      onUpdate() {
        const p = bezierPoint(from, control, to, state.t);
        mesh.position.copy(p);
        mesh.rotation.x = (opts.spins || 2) * Math.PI * state.t;
        mesh.rotation.y = (opts.spins || 2) * Math.PI * state.t * 0.6;
      },
      onComplete() {
        mesh.rotation.set(0, 0, 0);
        resolve();
      }
    });
  });
}

/* ═══ مؤثر الغبار عند الاستقرار ═══ */
export function dustBurst(scene, position, opts = {}) {
  const count = opts.count || (opts.low ? 18 : 42);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel = [];
  for (let i = 0; i < count; i++) {
    pos[i * 3] = position.x;
    pos[i * 3 + 1] = position.y;
    pos[i * 3 + 2] = position.z;
    const a = Math.random() * Math.PI * 2;
    const s = 0.6 + Math.random() * (opts.low ? 1.2 : 2.2);
    vel.push(new THREE.Vector3(Math.cos(a) * s * 0.5, 0.6 + Math.random() * 2.2, Math.sin(a) * s * 0.5 + 1.2));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xd8c9a8,
    size: opts.low ? 0.22 : 0.3,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    map: dustTexture(),
    alphaTest: 0.05
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);

  const state = { t: 0 };
  gsap.to(state, {
    t: 1,
    duration: 1.15,
    ease: 'power2.out',
    onUpdate() {
      const arr = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const v = vel[i];
        arr[i * 3] += v.x * 0.016;
        arr[i * 3 + 1] += v.y * 0.016;
        arr[i * 3 + 2] += v.z * 0.016;
        v.y -= 0.09;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 0.95 * (1 - state.t);
    },
    onComplete() {
      scene.remove(pts);
      geo.dispose();
      mat.dispose();
    }
  });
}

let _dustTex = null;
function dustTexture() {
  if (_dustTex) return _dustTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,244,220,1)');
  g.addColorStop(0.5, 'rgba(216,201,168,.55)');
  g.addColorStop(1, 'rgba(216,201,168,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _dustTex = new THREE.CanvasTexture(c);
  return _dustTex;
}

/* ═══ وميض ضوء عند استقرار الطوبة ═══ */
export function lightFlash(scene, position, color = 0xffd27a) {
  const light = new THREE.PointLight(color, 0, 14, 2);
  light.position.copy(position).add(new THREE.Vector3(0, 0.5, 1.5));
  scene.add(light);
  const state = { i: 0 };
  gsap.to(state, {
    i: 1,
    duration: 0.9,
    ease: 'power2.out',
    onUpdate() { light.intensity = 8 * (1 - state.i); },
    onComplete() { scene.remove(light); }
  });
}

/* ═══ فرقعة الطوبة عند الضغط (تتحرك للأمام ثم تعود) ═══
   getMatrix / setMatrix: قراءة/كتابة مصفوفة الطوبة داخل InstancedMesh
   base: المصفوفة الأصلية، normalZ: اتجاه الأمام (وحدة z للواجهة) */
export function popBrick(getMatrix, setMatrix, base, frontOffset = 0.75, holdSec = 5) {
  const dummy = new THREE.Object3D();
  const m = new THREE.Matrix4();
  getMatrix(m);
  dummy.matrix.decompose ? null : null;
  // تفكيك المصفوفة الأساسية
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  base.decompose(pos, quat, scl);

  const state = { k: 0, s: 1 };
  const apply = () => {
    dummy.position.copy(pos);
    dummy.position.z += frontOffset * state.k;         /* تقدّم للأمام */
    dummy.quaternion.copy(quat);
    const sc = 1 + 0.16 * Math.sin(state.k * Math.PI); /* انتفاخ خفيف */
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    setMatrix(dummy.matrix);
  };

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });
    tl.to(state, { k: 1, s: 1.16, duration: 0.28, ease: 'back.out(2.4)', onUpdate: apply })
      .to(state, { s: 1, duration: 0.18, ease: 'power1.out', onUpdate: apply })
      .to(state, { k: 0, s: 1, duration: 0.5, ease: 'power2.inOut', onUpdate: apply, delay: holdSec });
  });
}

/* ═══ كسر الطوبة وتناثر شظايا معدنية ثم إعادة بنائها ═══ */
export function breakBrick(scene, group, entry, holdSec = 5) {
  if (!scene || !group || !entry || entry._breaking) return;
  entry._breaking = true;
  const base = entry.matrix.clone();
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scale = new THREE.Vector3();
  base.decompose(pos, quat, scale);

  const hidden = new THREE.Matrix4().compose(
    pos, quat, new THREE.Vector3(0.0001, 0.0001, 0.0001)
  );
  group.setMatrixAt(entry.groupIdx, hidden);
  group.mesh.instanceMatrix.needsUpdate = true;
  if (entry.namePlane) entry.namePlane.visible = false;

  const material = new THREE.MeshStandardMaterial({
    color: group.mesh.material.color ? group.mesh.material.color.clone() : new THREE.Color(0xb8c5d1),
    metalness: 0.96, roughness: 0.2, emissive: 0x263747,
    emissiveIntensity: 0.28, side: THREE.DoubleSide
  });
  const shards = [];
  const count = 13;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.BoxGeometry(
      0.12 + Math.random() * 0.2,
      0.035 + Math.random() * 0.09,
      0.035 + Math.random() * 0.07
    );
    const shard = new THREE.Mesh(geo, material.clone());
    shard.position.copy(pos).add(new THREE.Vector3(
      (Math.random() - .5) * 1.15,
      (Math.random() - .5) * .72,
      .42 + Math.random() * .25
    ));
    shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.add(shard);
    shards.push(shard);
    const destination = shard.position.clone().add(new THREE.Vector3(
      (Math.random() - .5) * 2.2,
      .45 + Math.random() * 1.45,
      .5 + Math.random() * 1.1
    ));
    gsap.to(shard.position, { x: destination.x, y: destination.y, z: destination.z, duration: .72 + Math.random() * .38, ease: 'power2.out' });
    gsap.to(shard.rotation, { x: shard.rotation.x + 3 + Math.random() * 5, y: shard.rotation.y + 3 + Math.random() * 5, z: shard.rotation.z + 3 + Math.random() * 5, duration: 1.05, ease: 'power2.out' });
    gsap.to(shard.scale, { x: 0.01, y: 0.01, z: 0.01, delay: .62, duration: .42, ease: 'power2.in' });
  }
  const flash = new THREE.PointLight(0xcceaff, 5, 5, 2);
  flash.position.copy(pos).add(new THREE.Vector3(0, .1, 1));
  scene.add(flash);
  gsap.to(flash, { intensity: 0, duration: .55, onComplete: () => scene.remove(flash) });

  setTimeout(() => {
    shards.forEach(shard => {
      scene.remove(shard); shard.geometry.dispose(); shard.material.dispose();
    });
    material.dispose();
    group.setMatrixAt(entry.groupIdx, base);
    group.mesh.instanceMatrix.needsUpdate = true;
    if (entry.namePlane) entry.namePlane.visible = true;
    entry._breaking = false;
    /* وميض إعادة التكوين */
    const glow = new THREE.PointLight(0x9edcff, 3.2, 4, 2);
    glow.position.copy(pos).add(new THREE.Vector3(0, 0, .8));
    scene.add(glow);
    gsap.to(glow, { intensity: 0, duration: .5, onComplete: () => scene.remove(glow) });
  }, Math.max(1, holdSec) * 1000);
}

/* ═══ اهتزاز الطوبة عند ضربة المطرقة ═══
   intensity: شدة الاهتزاز (تزداد مع تقدم الكسر) */
export function brickShake(group, entry, intensity = 1) {
  if (!group || !entry || entry._breaking || entry._broken) return;
  if (entry._shakeTween) entry._shakeTween.kill();
  const base = entry.matrix;
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
  base.decompose(pos, quat, scl);
  const dummy = new THREE.Object3D();
  const state = { k: 0 };
  entry._shakeTween = gsap.to(state, {
    k: 1, duration: 0.42, ease: 'power2.out',
    onUpdate() {
      const decay = 1 - state.k;
      dummy.position.copy(pos);
      dummy.position.x += Math.sin(state.k * 46) * 0.03 * intensity * decay;
      dummy.position.z += Math.cos(state.k * 39) * 0.07 * intensity * decay;
      dummy.quaternion.copy(quat);
      dummy.rotateZ(Math.sin(state.k * 42) * 0.05 * intensity * decay);
      dummy.scale.copy(scl);
      dummy.updateMatrix();
      group.setMatrixAt(entry.groupIdx, dummy.matrix);
      group.mesh.instanceMatrix.needsUpdate = true;
    },
    onComplete() {
      if (entry._breaking || entry._broken) return; /* التحطيم أخفى الطوبة بالفعل */
      group.setMatrixAt(entry.groupIdx, base);
      group.mesh.instanceMatrix.needsUpdate = true;
      entry._shakeTween = null;
    }
  });
}

/* ═══ شظايا صغيرة تتناثر عند كل ضربة مطرقة ═══ */
export function debrisBurst(scene, position, color = 0xcfc3a8, opts = {}) {
  const count = opts.count || (opts.low ? 6 : 13);
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.8, metalness: 0.25,
    emissive: new THREE.Color(color).multiplyScalar(0.2)
  });
  const chips = [];
  for (let i = 0; i < count; i++) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(0.05 + Math.random() * 0.12, 0.03 + Math.random() * 0.07, 0.04 + Math.random() * 0.1),
      mat
    );
    s.position.copy(position);
    scene.add(s);
    chips.push({
      mesh: s,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * 3.4,
        1.1 + Math.random() * 2.4,
        0.8 + Math.random() * 2.6
      )
    });
  }
  const state = { t: 0 };
  gsap.to(state, {
    t: 1, duration: 0.8, ease: 'none',
    onUpdate() {
      const dt = 1 / 60;
      for (const c of chips) {
        c.v.y -= 9.4 * dt;
        c.mesh.position.addScaledVector(c.v, dt);
        c.mesh.rotation.x += 7 * dt;
        c.mesh.rotation.z += 5 * dt;
        const fade = 1 - Math.max(0, (state.t - 0.6) / 0.4);
        c.mesh.scale.setScalar(Math.max(0.001, fade));
      }
    },
    onComplete() {
      chips.forEach(c => { scene.remove(c.mesh); c.mesh.geometry.dispose(); });
      mat.dispose();
    }
  });
}

/* ═══ تحطيم الطوبة: شظايا كبيرة بجاذبية وارتداد + غبار + وميض ═══
   تُخفي الطوبة فورًا (instance scale ~ 0) — إعادة البناء مسؤولية wall-3d بعد 5 ثوانٍ */
export function smashBrick(scene, group, entry, opts = {}) {
  if (!scene || !group || !entry || entry._breaking) return;
  entry._breaking = true;
  if (entry._shakeTween) { entry._shakeTween.kill(); entry._shakeTween = null; }
  const low = !!opts.low;
  const base = entry.matrix;
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scale = new THREE.Vector3();
  base.decompose(pos, quat, scale);
  const hidden = new THREE.Matrix4().compose(
    pos, quat, new THREE.Vector3(0.0001, 0.0001, 0.0001)
  );
  group.setMatrixAt(entry.groupIdx, hidden);
  group.mesh.instanceMatrix.needsUpdate = true;
  if (entry.namePlane) entry.namePlane.visible = false;

  /* شظايا بلون فئة الطوبة تسقط وتنبثق */
  const src = group.mesh.material;
  const color = src && src.color ? src.color.clone() : new THREE.Color(0xb8c5d1);
  const mat = new THREE.MeshStandardMaterial({
    color, metalness: 0.82, roughness: 0.32,
    emissive: color.clone().multiplyScalar(0.22), side: THREE.DoubleSide
  });
  const N = low ? 10 : 18;
  const shards = [];
  for (let i = 0; i < N; i++) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(0.16 + Math.random() * 0.42, 0.06 + Math.random() * 0.24, 0.1 + Math.random() * 0.22),
      mat
    );
    s.position.copy(pos).add(new THREE.Vector3(
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 0.72,
      (Math.random() - 0.5) * 0.5 + 0.3
    ));
    s.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    s.castShadow = !low;
    scene.add(s);
    shards.push({
      mesh: s,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * 5.4,
        1.7 + Math.random() * 3.8,
        1.1 + Math.random() * 3.6
      ),
      rv: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12)
    });
  }

  const state = { t: 0 };
  gsap.to(state, {
    t: 1, duration: 1.5, ease: 'none',
    onUpdate() {
      const dt = 1 / 60;
      for (const sh of shards) {
        sh.v.y -= 9.6 * dt;
        sh.mesh.position.addScaledVector(sh.v, dt);
        sh.mesh.rotation.x += sh.rv.x * dt;
        sh.mesh.rotation.y += sh.rv.y * dt;
        /* ارتداد بسيط على القاعدة الخرسانية */
        if (sh.mesh.position.y < 0.12 && sh.v.y < 0) {
          sh.mesh.position.y = 0.12;
          sh.v.y *= -0.32; sh.v.x *= 0.7; sh.v.z *= 0.72;
          sh.rv.multiplyScalar(0.55);
        }
        const fade = 1 - Math.max(0, (state.t - 0.8) / 0.2);
        sh.mesh.scale.setScalar(Math.max(0.001, fade));
      }
    },
    onComplete() {
      shards.forEach(sh => { scene.remove(sh.mesh); sh.mesh.geometry.dispose(); });
      mat.dispose();
      entry._breaking = false;
    }
  });

  /* غبار ووميض قوي عند التحطيم */
  dustBurst(scene, pos.clone().add(new THREE.Vector3(0, 0, 1)), { low, count: low ? 16 : 40 });
  lightFlash(scene, pos, 0xffe2b0);
  const flash = new THREE.PointLight(0xcceaff, 9, 8, 2);
  flash.position.copy(pos).add(new THREE.Vector3(0, 0.2, 1.1));
  scene.add(flash);
  gsap.to(flash, { intensity: 0, duration: 0.6, onComplete: () => scene.remove(flash) });
}

/* ═══ إعادة بناء الطوبة بعد الكسر (scale 0 → 1 بمرونة) ═══ */
export function rebuildBrick(scene, group, entry, opts = {}) {
  if (!group || !entry) return;
  const base = entry.matrix;
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
  base.decompose(pos, quat, scl);
  const dummy = new THREE.Object3D();
  const state = { s: 0.001 };
  const apply = () => {
    dummy.position.copy(pos);
    dummy.quaternion.copy(quat);
    dummy.scale.setScalar(Math.max(0.001, state.s));
    dummy.updateMatrix();
    group.setMatrixAt(entry.groupIdx, dummy.matrix);
    group.mesh.instanceMatrix.needsUpdate = true;
  };
  apply();
  return new Promise(resolve => {
    gsap.to(state, {
      s: 1, duration: opts.fast ? 0.55 : 0.9, ease: 'elastic.out(1, 0.5)',
      onUpdate: apply,
      onComplete() {
        group.setMatrixAt(entry.groupIdx, base);
        group.mesh.instanceMatrix.needsUpdate = true;
        resolve();
      }
    });
  });
}

/* ═══ تحريك الكاميرا والهدف بسلاسة نحو طوبة ═══ */
export function flyCamera(camera, controls, targetPos, camPos, duration = 1.4) {
  const c0 = camera.position.clone();
  const t0 = controls.target.clone();
  const state = { t: 0 };
  controls.flying = true; /* إيقاف مقاومة المدارات أثناء الطيران */
  return new Promise(resolve => {
    gsap.to(state, {
      t: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate() {
        camera.position.lerpVectors(c0, camPos, state.t);
        controls.target.lerpVectors(t0, targetPos, state.t);
        camera.lookAt(controls.target);
      },
      onComplete: resolve
    });
  });
}
