/* karate-live.js — أخبار وإنجازات ولاعبو/مدربو الأكاديمية المُدارون من لوحة الإدارة
   المصدر: karate_academy/{news,achievements,players,coaches} في Firebase الموحدة — تحديث لحظي بلا إعادة تحميل.
   لا يغيّر المحتوى التعليمي ولا الأنيميشن القائم؛ يضيف قسماً جديداً فقط. */
(function () {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => { const value = String(u || "").trim(); if (/^https?:\/\//i.test(value)) return value; if (/^(?:\.\.\/|\.\/|\/)?[A-Za-z0-9_./%-]+\.(?:png|jpe?g|webp|gif|avif)(?:\?[^\s]*)?$/i.test(value)) return value; return ""; };
  const anchor = document.getElementById("section-schedule");
  if (!anchor || !window.SiteData) return;
  const sec = document.createElement("section");
  sec.id = "section-live"; sec.className = "section";
  sec.innerHTML = `<style>
  #section-live .kl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:14px;margin:12px 0 26px}
  #section-live .kl-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:14px;transition:transform .3s,border-color .3s}
  #section-live .kl-card:hover{transform:translateY(-3px);border-color:#f43f5e}
  #section-live .kl-card img{width:100%;height:150px;object-fit:cover;border-radius:10px;margin-bottom:8px}
  #section-live h3{margin:14px 0 4px} #section-live small{color:#9aa3b8} #section-live .kl-e{color:#9aa3b8;padding:8px 0}
  @media(prefers-reduced-motion:reduce){#section-live .kl-card{transition:none}}</style>
  <div class="section-heading"><span class="section-heading-icon" aria-hidden="true">📰</span><div><span class="section-kicker">KARATE • NEWS</span><h2>أخبار وإنجازات الأكاديمية</h2><p class="section-sub">تُحدَّث لحظياً من لوحة إدارة الأكاديمية</p></div></div><div id="klBody"><div class="fx-skel-wrap" role="status" aria-label="جارٍ التحميل"><div class="fx-skel-card"><i></i><i></i><i></i></div><div class="fx-skel-card"><i></i><i></i><i></i></div><div class="fx-skel-card"><i></i><i></i><i></i></div></div></div>`;
  anchor.parentNode.insertBefore(sec, anchor);
  const S = { news: [], achievements: [], coaches: [], players: [] };
  const arr = v => Object.entries(v || {}).map(([id, x]) => Object.assign({ id }, x)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const card = (o, t, s, d) => `<article class="kl-card">${safeUrl(o.image || o.photo) ? `<img loading="lazy" src="${esc(safeUrl(o.image || o.photo))}" alt="">` : ""}<b>${esc(t)}</b><br><small>${esc(s || "")}</small>${d ? `<p>${esc(d)}</p>` : ""}</article>`;
  function render() {
    const parts = [];
    if (S.news.length) parts.push(`<h3>📰 آخر الأخبار</h3><div class="kl-grid">${S.news.map(n => card(n, n.title, n.date, n.text)).join("")}</div>`);
    if (S.achievements.length) parts.push(`<h3>🏆 الإنجازات</h3><div class="kl-grid">${S.achievements.map(a => card(a, a.title, [a.athlete, a.date].filter(Boolean).join(" • "), a.details)).join("")}</div>`);
    if (S.coaches.length) parts.push(`<h3>👨‍🏫 المدربون</h3><div class="kl-grid">${S.coaches.map(c => card(c, c.name, c.rank, c.bio)).join("")}</div>`);
    if (S.players.length) parts.push(`<h3>🥋 اللاعبون</h3><div class="kl-grid">${S.players.map(p => card(p, p.name, [p.belt && "حزام " + p.belt, p.age && p.age + " سنة"].filter(Boolean).join(" • "), p.notes)).join("")}</div>`);
    document.getElementById("klBody").innerHTML = parts.join("") || '<div class="kl-e">سيتم نشر الأخبار والإنجازات هنا فور إضافتها من لوحة الإدارة.</div>';
  }
  const boot = () => {
    let db; try { db = window.SiteData.db(); } catch (e) { render(); return; }
    Object.keys(S).forEach(k => db.ref("karate_academy/" + k).limitToLast(12).on("value", s => { S[k] = arr(s.val()); render(); }, () => render()));
  };
  if (window.firebase) boot(); else window.addEventListener("load", boot);
})();
