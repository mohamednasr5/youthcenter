/* platform-nav.js — شريط تنقل وتذييل موحّدان لأقسام منصة مركز شباب الأحمدية
   الاستخدام: <script defer src="../platform-nav.js" data-section="football|karate|pitch|wall|home"></script>
   - الشريط يظهر أعلى الصفحة (غير ثابت لتفادي التعارض مع ترويسات الأقسام).
   - يحافظ على هوية كل قسم بلونه، ولا يغيّر روابط الصفحات القائمة. */
(function () {
  "use strict";
  const me = document.currentScript;
  const section = (me && me.dataset.section) || "home";
  const base = me ? me.src.replace(/platform-nav\.js(\?.*)?$/, "") : "./";
  const ITEMS = [
    ["home", "الرئيسية", "index.html", "🏠"],
    ["football", "أكاديمية كرة القدم", "football-academy/index.html", "⚽"],
    ["karate", "أكاديمية الكاراتيه", "karate-academy/index.html", "🥋"],
    ["kungfu", "أكاديمية الكونغ فو", "kungfu-academy/index.html", "🐉"],
    ["pitch", "الملعب الخماسي", "pitch-booking/index.html", "🏟️"],
    ["wall", "حائط الخير", "charity-wall/index.html", "🧱"],
    ["news", "الأخبار والأنشطة", "index.html#activities", "📰"],
    ["contact", "اتصل بنا", "index.html#contact", "📞"]
  ];
  const ACCENT = { home: "#f59e0b", football: "#10b981", karate: "#f43f5e", kungfu: "#dc2626", pitch: "#fbbf24", wall: "#eab308" };
  const acc = ACCENT[section] || ACCENT.home;

  const css = `
  .pf-bar,.pf-foot{font-family:'Cairo','Tajawal',system-ui,sans-serif;direction:rtl;--pf:${acc}}
  .pf-bar{position:relative;z-index:50;background:#070b16;border-bottom:2px solid var(--pf);color:#f3f5fb}
  .pf-bar .pf-in{max-width:1240px;margin:0 auto;display:flex;align-items:center;gap:6px;padding:6px 12px;overflow-x:auto;scrollbar-width:none}
  .pf-bar .pf-in::-webkit-scrollbar{display:none}
  .pf-brand{display:flex;align-items:center;gap:8px;font-weight:900;font-size:.9rem;color:#fff;text-decoration:none;white-space:nowrap;margin-inline-end:8px}
  .pf-brand img{width:26px;height:26px;border-radius:50%;object-fit:cover}
  .pf-bar a.pf-l{white-space:nowrap;font-size:.82rem;font-weight:700;color:#b9c2d6;text-decoration:none;padding:6px 12px;border-radius:9999px;transition:background .2s,color .2s,transform .2s}
  .pf-bar a.pf-l:hover{background:rgba(255,255,255,.08);color:#fff;transform:translateY(-1px)}
  .pf-bar a.pf-l.on{background:var(--pf);color:#0b0f1a}
  .pf-foot{background:#05080f;border-top:1px solid rgba(255,255,255,.09);color:#b9c2d6;padding:18px 12px;text-align:center;font-size:.82rem}
  .pf-foot nav{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;margin-bottom:8px}
  .pf-foot a{color:#d6dcea;text-decoration:none;font-weight:700} .pf-foot a:hover{color:var(--pf)}
  @media(prefers-reduced-motion:reduce){.pf-bar a.pf-l{transition:none}}`;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  const links = (cls) => ITEMS.filter(([k]) => !(section === "football" && (k === "home" || k === "football"))).map(([k, label, href, ico]) =>
    `<a class="${cls}${k === section ? " on" : ""}" href="${base}${href}"${k === section ? ' aria-current="page"' : ""}>${ico} ${label}</a>`).join("");

  function mount() {
    if (section !== "home") {
      const bar = document.createElement("div");
      bar.className = "pf-bar"; bar.setAttribute("role", "navigation"); bar.setAttribute("aria-label", "تنقل المنصة");
      bar.innerHTML = `<div class="pf-in"><a class="pf-brand" href="${base}index.html"><img src="${base}assets/logo.png" alt="" width="26" height="26">مركز شباب الأحمدية</a>${links("pf-l")}</div>`;
      document.body.insertBefore(bar, document.body.firstChild);
    }
    const foot = document.createElement("footer");
    foot.className = "pf-foot";
    foot.innerHTML = `<nav aria-label="روابط المنصة">${ITEMS.map(([k, l, h]) => `<a href="${base}${h}">${l}</a>`).join("")}</nav><div>© مركز شباب الأحمدية — المنزلة، الدقهلية • تطوير: المهندس محمد حماد</div>`;
    document.body.appendChild(foot);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
