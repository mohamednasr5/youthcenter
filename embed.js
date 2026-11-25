/* embed.js — نموذج مصغّر لحائط الخير للصفحة الرئيسية للمنصة
   يُحمَّل بتكاسل (IntersectionObserver) — لا يستهلك موارد قبل ظهوره على الشاشة.
   مشهد ثلاثي الأبعاد مصغر بطوبات متحركة وإضاءة ذهبية + إحصائيات حية من Realtime Database،
   وزر دخول إلى صفحة الحائط الكاملة. عند تعذر WebGL يظهر بديل CSS متحرك. */

(function () {
  'use strict';

  const STYLES = `
  .cwe-card{position:relative;display:grid;grid-template-columns:1.6fr 1fr;gap:18px;align-items:stretch;
    background:rgba(16,24,48,.62);border:1px solid rgba(245,158,11,.3);border-radius:24px;overflow:hidden;
    box-shadow:0 10px 40px rgba(0,0,0,.45)}
  .cwe-canvas{position:relative;min-height:280px;background:radial-gradient(ellipse at 50% 35%,#101c38,#070c18)}
  .cwe-canvas canvas{display:block;width:100%;height:100%}
  .cwe-side{display:flex;flex-direction:column;justify-content:center;gap:14px;padding:22px 22px 22px 8px}
  .cwe-stat{display:grid;gap:2px}
  .cwe-stat .v{font-size:1.5rem;font-weight:900;color:#fbbf24;line-height:1.2}
  .cwe-stat .k{font-size:.78rem;font-weight:700;color:#7d879c}
  .cwe-btn{position:relative;isolation:isolate;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:10px;
    min-height:58px;font-weight:900;font-size:1rem;padding:15px 24px;border-radius:17px;
    background:linear-gradient(110deg,#f59e0b 0%,#ffbd28 42%,#e87905 72%,#f59e0b 100%);
    background-size:220% 100%;color:#1a1206;box-shadow:0 10px 28px rgba(245,158,11,.42),0 0 0 1px rgba(255,220,130,.32) inset;
    text-decoration:none;transition:transform .28s ease,box-shadow .28s ease;animation:cweBtnGlow 2.4s ease-in-out infinite,cweBtnGradient 5s linear infinite}
  .cwe-btn::before{content:"";position:absolute;inset:-2px;z-index:-1;border-radius:inherit;
    background:linear-gradient(110deg,transparent 20%,rgba(255,255,255,.65) 48%,transparent 72%);
    transform:translateX(-130%);animation:cweBtnShine 3.2s ease-in-out infinite}
  .cwe-btn::after{content:"";position:absolute;inset:-7px;z-index:-2;border:1px solid rgba(251,191,36,.45);
    border-radius:22px;opacity:0;animation:cweBtnRing 2.4s ease-out infinite;pointer-events:none}
  .cwe-btn:hover,.cwe-btn:focus-visible{transform:translateY(-4px) scale(1.025);
    box-shadow:0 16px 38px rgba(245,158,11,.62),0 0 26px rgba(251,191,36,.3);outline:none}
  .cwe-btn:active{transform:translateY(-1px) scale(.99)}
  @keyframes cweBtnGlow{0%,100%{box-shadow:0 10px 28px rgba(245,158,11,.38),0 0 0 1px rgba(255,220,130,.3) inset}50%{box-shadow:0 14px 38px rgba(245,158,11,.65),0 0 24px rgba(251,191,36,.28),0 0 0 1px rgba(255,235,170,.65) inset}}
  @keyframes cweBtnGradient{0%{background-position:0% 50%}100%{background-position:220% 50%}}
  @keyframes cweBtnShine{0%,18%{transform:translateX(-130%)}58%,100%{transform:translateX(130%)}}
  @keyframes cweBtnRing{0%{transform:scale(.96);opacity:.55}75%,100%{transform:scale(1.12);opacity:0}}
  @media(prefers-reduced-motion:reduce){.cwe-btn,.cwe-btn::before,.cwe-btn::after{animation:none!important}.cwe-btn{background-position:center}}
  .cwe-fallback{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:26px;transform:rotate(-3deg)}
  .cwe-fb{height:34px;border-radius:6px;border:1px solid rgba(0,0,0,.4);box-shadow:0 4px 10px rgba(0,0,0,.4);
    animation:cweFloat 3.4s ease-in-out infinite}
  @keyframes cweFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  @media(max-width:768px){.cwe-card{grid-template-columns:1fr}.cwe-side{padding:6px 20px 20px}}
  `;

  function mount() {
    const host = document.getElementById('charityWallEmbed');
    if (!host) return;

    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    host.innerHTML = `
      <div class="cwe-card">
        <div class="cwe-canvas" id="cweCanvas"></div>
        <div class="cwe-side">
          <div class="cwe-stat"><div class="v" id="cweTotal">…</div><div class="k">إجمالي المساهمات المعتمدة</div></div>
          <div class="cwe-stat"><div class="v" id="cweBricks">…</div><div class="k">طوبة على حائط الخير</div></div>
          <a class="cwe-btn" href="charity-wall/index.html">🧱 دخول حائط الخير</a>
        </div>
      </div>`;

    /* الإحصائيات من Realtime Database (مهلة 8 ثوانٍ ثم شرطة — فشل الشبكة ليس عطلًا) */
    import('./firebase-config.js').then(async ({ db }) => {
      const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
      const set = (t, b) => {
        const te = document.getElementById('cweTotal');
        const be = document.getElementById('cweBricks');
        if (te) te.textContent = t;
        if (be) be.textContent = b;
      };
      try {
        const s = await Promise.race([
          get(ref(db, 'charityWall/settings/public_summary')),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ]);
        if (s.exists()) {
          const d = s.val();
          set((Number(d.totalApprovedDonations) || 0).toLocaleString('ar-EG') + ' ج.م',
              (Number(d.brickCount) || 0).toLocaleString('ar-EG'));
        } else {
          set('0 ج.م', '0');
        }
      } catch (_e) {
        set('—', '—');
      }
    }).catch(() => {});

    /* تحميل المشهد بتكاسل عند ظهور القسم */
    const io = new IntersectionObserver(async entries => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      try {
        const THREE = await import('./vendor/three.module.js');
        buildScene(THREE, document.getElementById('cweCanvas'));
      } catch (e) {
        console.warn('embed 3D fall back:', e);
        buildFallback();
      }
    }, { rootMargin: '160px' });
    io.observe(host);
  }

  /* بديل CSS عند تعذر WebGL */
  function buildFallback() {
    const c = document.getElementById('cweCanvas');
    const colors = ['#f0b542', '#b3432c', '#a0714f', '#c9d2dd', '#f0b542', '#b3432c', '#a0714f', '#f0b542', '#b3432c', '#a0714f', '#c9d2dd', '#f0b542', '#a0714f', '#b3432c', '#c9d2dd'];
    c.innerHTML = `<div class="cwe-fallback">${colors.map((col, i) =>
      `<div class="cwe-fb" style="background:linear-gradient(150deg,${col},rgba(0,0,0,.5));animation-delay:${(i % 5) * .3}s"></div>`).join('')}</div>`;
  }

  /* مشهد مصغر: 3 صفوف × 10 طوبات تدور ببطء تحت إضاءة ذهبية */
  function buildScene(THREE, container) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { buildFallback(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070c18, 0.028);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);

    scene.add(new THREE.HemisphereLight(0x9db4d6, 0x241a10, 0.65));
    const gold = new THREE.PointLight(0xf0b542, 30, 60, 2);
    gold.position.set(6, 12, 14);
    scene.add(gold);
    const sun = new THREE.DirectionalLight(0xffe8bd, 1.4);
    sun.position.set(8, 14, 12);
    scene.add(sun);

    const tierColors = { clay: 0xa0714f, red: 0xb3432c, silver: 0xc9d2dd, gold: 0xf0b542, diamond: 0xd9f4ff };
    const tierSeq = ['clay', 'red', 'clay', 'silver', 'red', 'clay', 'gold', 'red', 'clay', 'red',
                     'red', 'clay', 'silver', 'clay', 'red', 'diamond', 'clay', 'red', 'gold', 'clay',
                     'silver', 'red', 'clay', 'red', 'clay', 'gold', 'red', 'clay', 'silver', 'clay'];
    const w = 1.5, h = 0.72, d = 0.75, gap = 0.07, s = w + gap;
    const geo = new THREE.BoxGeometry(w, h, d);
    const group = new THREE.Group();
    const meshes = [];
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 10), col = i % 10;
      const mat = new THREE.MeshStandardMaterial({
        color: tierColors[tierSeq[i]],
        metalness: tierSeq[i] === 'silver' || tierSeq[i] === 'gold' ? 0.85 : 0.05,
        roughness: tierSeq[i] === 'diamond' ? 0.08 : 0.6,
        emissive: tierSeq[i] === 'gold' ? 0x4a2e00 : 0x050302
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set((col - 4.5) * s + (row % 2 ? s / 2 : 0), row * (h + gap) + h / 2 + 0.4, 0);
      group.add(m);
      meshes.push(m);
    }
    /* لوح أسمنت خلفي */
    const mortar = new THREE.Mesh(
      new THREE.BoxGeometry(10 * s + 1, 3 * (h + gap) + 0.8, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x6d6f74, roughness: 0.95 })
    );
    mortar.position.set(0, 3 * (h + gap) / 2 + 0.15, -0.6);
    group.add(mortar);
    scene.add(group);

    /* جزيئات ضوء ذهبية عائمة */
    const pGeo = new THREE.BufferGeometry();
    const pCount = 60;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 18;
      pPos[i * 3 + 1] = Math.random() * 8;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 8 + 3;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0xfbbf24, size: 0.09, transparent: true, opacity: 0.7
    }));
    scene.add(particles);

    function resize() {
      const wpx = container.clientWidth || 1, hpx = container.clientHeight || 280;
      camera.aspect = wpx / hpx;
      camera.updateProjectionMatrix();
      renderer.setSize(wpx, hpx);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let visible = true;
    const io = new IntersectionObserver(en => { visible = en[0].isIntersecting; }, { threshold: 0.02 });
    io.observe(container);

    const clock = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const t = clock.getElapsedTime();
      group.rotation.y = Math.sin(t * 0.22) * 0.45;
      meshes.forEach((m, i) => {
        m.position.y += Math.sin(t * 1.6 + i * 0.7) * 0.0009;
      });
      particles.rotation.y = t * 0.05;
      camera.position.set(0, 3.4, 13.5);
      camera.lookAt(0, 1.6, 0);
      renderer.render(scene, camera);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
