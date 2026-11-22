/* fx.js — طبقة الحركة والعمق الموحّدة لأقسام منصة مركز شباب الأحمدية الأربعة
   بدون مكتبات خارجية (≈4KB gz): Scroll Reveal • 3D Tilt • Parallax • Animated Counters •
   Ripple • Scroll Progress • مؤثرات تحديث النتائج الحية • انتقالات الصفحات (CSS View Transitions).
   الاستخدام: <script defer src="../fx.js" data-section="football|karate|pitch|home"></script> + <link href="../fx.css">
   - يحترم prefers-reduced-motion ويدخل «وضع خفيف» تلقائياً على الأجهزة الضعيفة / توفير البيانات.
   - يعمل على العناصر المضافة ديناميكياً لاحقاً (بيانات Firebase) عبر MutationObserver محدود المعدل.
   - لا يتعارض مع تأثيرات القسم القائمة: يتجاهل .reveal و .tilt و [data-count] التي تديرها صفحاتها. */
(function () {
  "use strict";
  if (window.FX) return;
  const me = document.currentScript;
  const path = location.pathname;
  const section = (me && me.dataset.section) ||
    (/football-academy/.test(path) ? "football" : /karate-academy/.test(path) ? "karate" : /pitch-booking/.test(path) ? "pitch" : "home");
  const mq = q => window.matchMedia && window.matchMedia(q).matches;
  const reduce = mq("(prefers-reduced-motion: reduce)");
  const finePointer = mq("(hover:hover) and (pointer:fine)");
  const conn = navigator.connection || {};
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2 || conn.saveData === true;
  const lite = reduce || lowEnd;               // وضع خفيف: بلا Parallax/Tilt/خلفيات متحركة
  const root = document.documentElement;
  root.classList.add("fx-on", lite ? "fx-lite" : "fx-full");
  root.dataset.fxTheme = section;

  /* ---------- اختيار العناصر لكل قسم ---------- */
  const REVEAL = [
    ".section-heading", ".section-title-wrap", ".info-card", ".step-card", ".coach-card", ".cert-card",
    ".pitch-info-card", ".booking-manager-card", ".chairman-contact-card", ".telegram-premium-card",
    ".reg-card", ".trophy-card", ".player-card", ".match-card", ".lv-card", ".kl-card", ".schedule-card", ".stat-item", ".match-result-card", ".news-card"
  ].join(",");
  const TILT = [
    ".info-card", ".step-card", ".coach-card", ".cert-card", ".pitch-info-card", ".chairman-contact-card",
    ".schedule-card", ".trophy-card", ".player-card", ".match-card", ".lv-card", ".kl-card", ".news-card", ".match-result-card"
  ].join(",");
  const PARALLAX = ".hero-visual, .hero-jp, .hero-logo-frame, [data-fx-parallax]";
  const COUNT = "[data-fx-count], .stat-num";
  const RIPPLE = ".btn, .lv-btn";

  const once = (el, tag) => { const k = "__fx_" + tag; if (el[k]) return false; el[k] = true; return true; };

  /* ---------- Scroll Reveal ---------- */
  let io = null;
  function setupReveal() {
    if (reduce || !("IntersectionObserver" in window)) return;
    io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("fx-in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  }
  function reveal(scope) {
    if (!io) return;
    const vh = window.innerHeight;
    scope.querySelectorAll(REVEAL).forEach(el => {
      if (el.classList.contains("reveal") || el.closest(".lv-skel,.fx-skel")) return;
      if (!once(el, "rv")) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) return;       // داخل الشاشة الآن: لا نخفيه (لا وميض)
      const sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty("--fx-i", Math.min(sib, 6));
      el.classList.add("fx-r");
      io.observe(el);
    });
  }

  /* ---------- 3D Tilt (مؤشر دقيق فقط) ---------- */
  function tilt(scope) {
    if (lite || !finePointer) return;
    scope.querySelectorAll(TILT).forEach(el => {
      if (el.classList.contains("tilt") || !once(el, "tl")) return;
      if (getComputedStyle(el).position === "static") el.classList.add("fx-rel");
      el.classList.add("fx-tilt");
      let raf = 0, ev = null;
      const apply = () => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        el.style.setProperty("--ry", ((x - 0.5) * 9).toFixed(2) + "deg");
        el.style.setProperty("--rx", ((0.5 - y) * 9).toFixed(2) + "deg");
        el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      };
      el.addEventListener("pointermove", e => { if (e.pointerType === "touch") return; ev = e; el.classList.add("fx-tilting"); if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
      el.addEventListener("pointerleave", () => {
        el.classList.remove("fx-tilting");
        el.style.removeProperty("--rx"); el.style.removeProperty("--ry");
      });
    });
  }

  /* ---------- Parallax (خاصية translate المستقلة — لا تتعارض مع transform القائم) ---------- */
  const par = [];
  let parTick = false;
  function parallax(scope) {
    if (lite) return;
    scope.querySelectorAll(PARALLAX).forEach(el => {
      if (!once(el, "pl")) return;
      par.push({ el, speed: parseFloat(el.dataset.fxParallax) || 0.12, vis: true });
    });
    if (par.length && !parallax.bound) {
      parallax.bound = true;
      const upd = () => {
        parTick = false;
        const y = window.scrollY, vh = window.innerHeight;
        par.forEach(p => {
          const r = p.el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          const off = Math.max(-60, Math.min(60, (r.top + r.height / 2 - vh / 2) * -p.speed));
          p.el.style.translate = "0 " + off.toFixed(1) + "px";
        });
      };
      window.addEventListener("scroll", () => { if (!parTick) { parTick = true; requestAnimationFrame(upd); } }, { passive: true });
      upd();
    }
  }

  /* ---------- عدّادات متحركة ---------- */
  const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  const toLatin = s => String(s).replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d));
  const toArabic = s => String(s).replace(/\d/g, d => AR_DIGITS[d]);
  let cio = null;
  function animateCount(el) {
    const raw = el.textContent;
    const m = toLatin(raw).match(/^(\D*)(\d{1,6})(\D*)$/);
    if (!m) return;
    const arabic = /[٠-٩]/.test(raw), pre = m[1], target = +m[2], suf = m[3];
    if (target < 2) return;
    const fmt = n => (arabic ? toArabic(n) : String(n));
    const dur = 1100; let t0 = 0, last = raw;
    const step = ts => {
      if (el.textContent !== last) return;                   // تغيّر النص من مصدر آخر (بيانات حية) → نتوقف
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      last = pre + fmt(Math.floor(target * e)) + suf;
      el.textContent = p < 1 ? last : raw;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function counters(scope) {
    if (reduce || !("IntersectionObserver" in window)) return;
    if (!cio) cio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { cio.unobserve(e.target); animateCount(e.target); }
    }), { threshold: 0.6 });
    scope.querySelectorAll(COUNT).forEach(el => {
      if (el.hasAttribute("data-count") || !/\d|[٠-٩]/.test(el.textContent) || !once(el, "ct")) return;
      cio.observe(el);
    });
  }

  /* ---------- Ripple للأزرار ---------- */
  function ripple(scope) {
    scope.querySelectorAll(RIPPLE).forEach(el => {
      if (!once(el, "rp")) return;
      el.classList.add("fx-rip-host");
      el.addEventListener("pointerdown", e => {
        if (reduce) return;
        const r = el.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2;
        const d = document.createElement("span");
        d.className = "fx-ripple";
        d.style.cssText = "width:" + s + "px;height:" + s + "px;left:" + (e.clientX - r.left - s / 2) + "px;top:" + (e.clientY - r.top - s / 2) + "px";
        el.appendChild(d);
        setTimeout(() => d.remove(), 600);
      }, { passive: true });
    });
  }

  /* ---------- مؤثرات النتائج والعدادات الحية ---------- */
  // أي تغيير في رقم نتيجة (.lv-num/.lv-score) أو عدّاد حي يُعطى نبضة قصيرة (هدف جديد، تعديل نتيجة...)
  function liveFlash() {
    if (reduce) return;
    const mo = new MutationObserver(list => list.forEach(m => {
      const t = m.target.nodeType === 3 ? m.target.parentElement : m.target;
      if (!t || !t.closest) return;
      const hit = t.closest(".lv-num, .lv-score .n");
      if (hit && m.oldValue != null && m.oldValue !== hit.textContent) {
        hit.classList.remove("fx-pop"); void hit.offsetWidth; hit.classList.add("fx-pop");
      }
    }));
    const attach = () => { const r = document.getElementById("liveRoot"); if (r && !r.__fxmo) { r.__fxmo = 1; mo.observe(r, { subtree: true, characterData: true, characterDataOldValue: true }); } };
    attach(); document.addEventListener("DOMContentLoaded", attach); setTimeout(attach, 1200);
  }

  /* ---------- شريط تقدّم التمرير + خلفية متحركة خفيفة ---------- */
  function chrome() {
    const bar = document.createElement("div");
    bar.className = "fx-progress"; bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    let tick = false;
    const upd = () => {
      tick = false;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? Math.min(window.scrollY / h, 1) : 0).toFixed(3) + ")";
    };
    window.addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
    if (!lite) { const bg = document.createElement("div"); bg.className = "fx-bg"; bg.setAttribute("aria-hidden", "true"); document.body.prepend(bg); }
  }

  /* ---------- هياكل التحميل ---------- */
  const FXAPI = {
    /* FX.skeleton(3,'card') → HTML لبطاقات هيكلية تُستبدل عند وصول البيانات */
    skeleton(n, kind) {
      n = n || 3; let h = "";
      for (let i = 0; i < n; i++) h += kind === "line" ? '<div class="fx-skel fx-skel-line"></div>' : '<div class="fx-skel fx-skel-card" aria-hidden="true"><i></i><i></i><i></i></div>';
      return '<div class="fx-skel-wrap" role="status" aria-label="جارٍ التحميل">' + h + "</div>";
    },
    count: animateCount,
    lite: lite,
    section: section,
    refresh() { scan(document); }
  };

  function scan(scope) { reveal(scope); tilt(scope); parallax(scope); counters(scope); ripple(scope); }

  function init() {
    setupReveal(); chrome(); scan(document); liveFlash();
    // عناصر تُضاف لاحقاً (بيانات Firebase): مراقبة محدودة المعدل
    let t = null;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => scan(document), 140); })
      .observe(document.body, { childList: true, subtree: true });
    // شبكة أمان: لا يبقى عنصر مخفياً إن تعذّر IntersectionObserver لأي سبب
    setTimeout(() => document.querySelectorAll(".fx-r:not(.fx-in)").forEach(el => {
      const r = el.getBoundingClientRect(); if (r.top < window.innerHeight * 1.2) el.classList.add("fx-in");
    }), 5000);
  }
  window.FX = FXAPI;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
