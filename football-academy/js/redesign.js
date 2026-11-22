/* redesign.js — طبقة إعادة التصميم لصفحة أكاديمية كرة القدم (كلاسيكي، بلا مكتبات)
   - مسرح الهيرو (ملعب منظور + إضاءات + كرة + جزيئات) وإمالة الشعار بالمؤشر.
   - بطاقة «المواجهة القادمة» + آخر نتيجة داخل الهيرو من بيانات الأكاديمية الحقيقية فقط (حدث academy:data).
     لا بيانات تجريبية: إن لم توجد مباراة قادمة تبقى البطاقة مخفية.
   - العدّاد بتوقيت القاهرة (Africa/Cairo) لا بمنطقة جهاز الزائر.
   - شريط تنقل جانبي + ترقيم الأقسام. يحترم وضع الأداء الخفيف (FX.lite) وتقليل الحركة. */
(function () {
  "use strict";
  const TZ = "Africa/Cairo";
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lite = () => reduce || (window.FX && window.FX.lite);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, r) => (r || document).querySelector(s);
  const pad = n => (n < 10 ? "0" : "") + n;

  /* ---------- مسرح الهيرو ---------- */
  function buildStage() {
    const hero = $(".hero-section");
    if (!hero || $(".fb-stage", hero)) return;
    const st = document.createElement("div");
    st.className = "fb-stage"; st.setAttribute("aria-hidden", "true");
    const dots = lite() ? "" : Array.from({ length: 14 }, (_, i) =>
      `<i style="left:${(i * 37 + 6) % 96}%;bottom:${(i * 13) % 30}%;animation-duration:${9 + (i % 5) * 2}s;animation-delay:${-(i * 1.3)}s"></i>`).join("");
    st.innerHTML = `
      <div class="fb-beam l"></div><div class="fb-beam r"></div>
      <div class="fb-pitch"><div class="grass"></div>
        <svg viewBox="0 0 1000 640" preserveAspectRatio="none"><rect x="30" y="20" width="940" height="600"/><line x1="500" y1="20" x2="500" y2="620"/>
        <circle cx="500" cy="320" r="86"/><rect x="30" y="170" width="150" height="300"/><rect x="820" y="170" width="150" height="300"/>
        <rect x="30" y="250" width="56" height="140"/><rect x="914" y="250" width="56" height="140"/></svg></div>
      <svg class="fb-ball" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#f5f8f3" stroke="#0b1915" stroke-width="3"/>
        <path d="M50 30l17 12-6 20H39l-6-20z" fill="#0b1915"/><path d="M50 30V8M67 42l22-8M61 62l12 22M39 62L27 84M33 42L11 34" stroke="#0b1915" stroke-width="3" fill="none"/></svg>
      <div class="fb-dots">${dots}</div>`;
    hero.insertBefore(st, hero.firstChild);

    // إمالة الشعار تبعاً للمؤشر (أجهزة بمؤشر دقيق فقط)
    const frame = $(".hero-logo-frame", hero);
    if (frame && !lite() && matchMedia("(hover:hover) and (pointer:fine)").matches) {
      let raf = 0;
      hero.addEventListener("pointermove", e => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = hero.getBoundingClientRect();
          frame.style.setProperty("--hy", (((e.clientX - r.left) / r.width - 0.5) * 16).toFixed(1) + "deg");
          frame.style.setProperty("--hx", ((0.5 - (e.clientY - r.top) / r.height) * 12).toFixed(1) + "deg");
        });
      }, { passive: true });
      hero.addEventListener("pointerleave", () => { frame.style.setProperty("--hx", "0deg"); frame.style.setProperty("--hy", "0deg"); });
    }
  }

  /* ---------- وقت القاهرة ---------- */
  function cairoOffsetMs(epoch) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(epoch));
    const g = t => +p.find(x => x.type === t).value;
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(epoch / 1000) * 1000;
  }
  // يحوّل (تاريخ yyyy-mm-dd + وقت اختياري) إلى لحظة فعلية بتوقيت القاهرة
  function matchEpoch(date, time) {
    const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ""));
    if (!dm) return NaN;
    let h = 0, mi = 0;
    const raw = String(time || "").replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    const tm = /(\d{1,2})\s*:\s*(\d{2})/.exec(raw);
    if (tm) {
      h = +tm[1]; mi = +tm[2];
      if (/م|pm/i.test(raw) && h < 12) h += 12;
      if (/ص|am/i.test(raw) && h === 12) h = 0;
    }
    const guess = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], h, mi, 0);
    return guess - cairoOffsetMs(guess);
  }
  const fmtDay = ep => new Intl.DateTimeFormat("ar-EG", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date(ep));

  /* ---------- بطاقة المواجهة القادمة ---------- */
  let cdTimer = null, target = NaN;
  function ensureNext() {
    let box = $("#fb-next");
    if (!box) {
      const host = $(".hero-content .hero-stats");
      if (!host) return null;
      box = document.createElement("div");
      box.id = "fb-next"; box.className = "fb-next"; box.hidden = true;
      host.insertAdjacentElement("afterend", box);
    }
    return box;
  }
  function renderNext(data) {
    const box = ensureNext(); if (!box) return;
    clearInterval(cdTimer); cdTimer = null;
    const now = Date.now();
    const ups = (data.upcomingMatches || []).map(m => ({ m, ep: matchEpoch(m.date, m.time) }))
      .filter(x => !isNaN(x.ep) && x.ep + 2 * 3600e3 > now).sort((a, b) => a.ep - b.ep);
    const lastRes = (data.matchResults || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    if (!ups.length && !lastRes) { box.hidden = true; return; }
    let html = "";
    if (ups.length) {
      const { m, ep } = ups[0]; target = ep;
      html += `<div class="fb-next-h"><b><span class="fb-live-dot"></span>المواجهة القادمة</b><span>${esc(m.tournament || "")}</span></div>
        <div class="fb-next-vs"><div class="t">أكاديمية الأحمدية</div><div class="v">VS</div><div class="t">${esc(m.opponent || "")}</div></div>
        <div class="fb-next-meta">${esc(fmtDay(ep))} • ${esc(m.time || "")}${m.stadium ? " • 📍 " + esc(m.stadium) : ""}</div>
        <div class="fb-cd" id="fb-cd"><div><b data-u="d">00</b><span>يوم</span></div><div><b data-u="h">00</b><span>ساعة</span></div><div><b data-u="m">00</b><span>دقيقة</span></div><div><b data-u="s">00</b><span>ثانية</span></div></div>`;
    }
    if (lastRes) {
      html += `<div class="fb-next-last"><span>آخر نتيجة: ${esc(lastRes.opponent || "")}</span><strong>${esc(lastRes.scoreOur)} - ${esc(lastRes.scoreOpponent)}</strong></div>`;
    }
    box.innerHTML = html; box.hidden = false;
    if (ups.length) { tick(); cdTimer = setInterval(tick, 1000); }
  }
  function tick() {
    const cd = $("#fb-cd"); if (!cd || document.hidden) return;
    let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const set = (u, v) => { const e = cd.querySelector(`[data-u="${u}"]`); const t = pad(v); if (e && e.textContent !== t) e.textContent = t; };
    set("d", d); set("h", h); set("m", m); set("s", s);
    if (target - Date.now() <= 0) { clearInterval(cdTimer); cdTimer = null; }
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  document.addEventListener("academy:data", e => { try { renderNext(e.detail || {}); } catch (err) { console.warn("[redesign] next-match failed:", err); } });
  window.addEventListener("pagehide", () => clearInterval(cdTimer));

  /* ---------- أقسام: ترقيم + شريط جانبي ---------- */
  function sections() {
    const secs = Array.from(document.querySelectorAll("main section[id], section.hero-section[id], section[id]"))
      .filter((s, i, a) => a.findIndex(x => x.id === s.id) === i && /^(home|star-of-day|coaches|trophies|schedule|matches|players|news|register)$/.test(s.id));
    const LABEL = { home: "الرئيسية", "star-of-day": "نجم اليوم", coaches: "الجهاز الفني", trophies: "البطولات", schedule: "مواعيد التدريب", matches: "المباريات", players: "اللاعبون", news: "الأخبار", register: "التسجيل" };
    secs.forEach((s, i) => { s.classList.add("fb-sec"); const t = s.querySelector(".section-title-wrap"); if (t && !t.dataset.n) t.dataset.n = pad(i); });
    if (!secs.length || document.querySelector(".fb-rail")) return;
    const rail = document.createElement("nav");
    rail.className = "fb-rail"; rail.setAttribute("aria-label", "أقسام الصفحة");
    rail.innerHTML = secs.map(s => `<a href="#${s.id}" aria-label="${esc(LABEL[s.id])}"><span>${esc(LABEL[s.id])}</span></a>`).join("");
    document.body.appendChild(rail);
    if (!("IntersectionObserver" in window)) return;
    const links = {}; rail.querySelectorAll("a").forEach(a => { links[a.getAttribute("href").slice(1)] = a; });
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { Object.values(links).forEach(l => l.classList.remove("on")); links[e.target.id] && links[e.target.id].classList.add("on"); }
    }), { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach(s => io.observe(s));
  }

  function init() { buildStage(); sections(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
