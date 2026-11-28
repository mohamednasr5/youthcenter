/* kungfu-live.js — أخبار وإنجازات ولاعبو/مدربو أكاديمية الكونغ فو المُدارون من لوحة الإدارة
   المصدر: kungfu_academy/{news,achievements,players,coaches,schedules,settings} في Firebase الموحدة — تحديث لحظي بلا إعادة تحميل.
   لا يغيّر المحتوى التعليمي ولا الأنيميشن القائم؛ يضيف قسماً جديداً فقط + يطبّق المواعيد والإعدادات الحية. */
(function () {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => { const value = String(u || "").trim(); if (/^https?:\/\//i.test(value)) return value; if (!/^(?:\.\.\/|\.\/|\/)?[A-Za-z0-9_./%-]+\.(?:png|jpe?g|webp|gif|avif)(?:\?[^\s]*)?$/i.test(value)) return ""; if (/^(?:\.\.\/|\.\/|\/|assets\/)/i.test(value)) return value; return "assets/images/photos/" + value; };
  const ROOT = "kungfu_academy";

  /* ═══ 1) قسم الأخبار والإنجازات (يُدرج قبل قسم المواعيد) ═══ */
  const anchor = document.getElementById("section-schedule");
  if (anchor) {
    const sec = document.createElement("section");
    sec.id = "section-live"; sec.className = "section";
    sec.innerHTML = `<style>
    #section-live .kl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:14px;margin:12px 0 26px}
    #section-live .kl-card{background:var(--bg-card,rgba(26,14,16,.78));border:1px solid var(--border-glass,rgba(255,255,255,.08));border-radius:var(--radius-md,14px);padding:14px;transition:transform .3s,border-color .3s,box-shadow .3s}
    #section-live .kl-card:hover{transform:translateY(-3px);border-color:var(--accent-red,#dc2626);box-shadow:0 14px 34px rgba(220,38,38,.18)}
    #section-live .kl-card img{width:100%;height:150px;object-fit:cover;border-radius:10px;margin-bottom:8px}
    #section-live h3{margin:14px 0 4px} #section-live small{color:var(--text-muted,#8a776a)} #section-live .kl-e{color:var(--text-muted,#8a776a);padding:8px 0}
    @media(prefers-reduced-motion:reduce){#section-live .kl-card{transition:none}}
    </style>
    <div class="section-heading"><span class="section-heading-icon" aria-hidden="true">📰</span><div><span class="section-kicker">KUNG FU • NEWS</span><h2>أخبار وإنجازات الأكاديمية</h2><p class="section-sub">تُحدَّث لحظياً من لوحة إدارة الأكاديمية</p></div></div><div id="klBody"><div class="fx-skel-wrap" role="status" aria-label="جارٍ التحميل"><div class="fx-skel-card"><i></i><i></i><i></i></div><div class="fx-skel-card"><i></i><i></i><i></i></div><div class="fx-skel-card"><i></i><i></i><i></i></div></div></div>`;
    anchor.parentNode.insertBefore(sec, anchor);

    const S = { news: [], achievements: [], coaches: [], players: [] };
    const arr = v => Object.entries(v || {}).map(([id, x]) => Object.assign({ id }, x)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const card = (o, t, s, d) => `<article class="kl-card">${safeUrl(o.image || o.photo) ? `<img loading="lazy" decoding="async" src="${esc(safeUrl(o.image || o.photo))}" alt="${esc(t)}">` : ""}<b>${esc(t)}</b><br><small>${esc(s || "")}</small>${d ? `<p>${esc(d)}</p>` : ""}</article>`;
    function render() {
      const parts = [];
      if (S.news.length) parts.push(`<h3>📰 آخر الأخبار</h3><div class="kl-grid">${S.news.map(n => card(n, n.title, n.date, n.text)).join("")}</div>`);
      if (S.achievements.length) parts.push(`<h3>🏆 الإنجازات</h3><div class="kl-grid">${S.achievements.map(a => card(a, a.title, [a.athlete, a.date].filter(Boolean).join(" • "), a.details)).join("")}</div>`);
      if (S.coaches.length) parts.push(`<h3>👨‍🏫 فريق التدريب</h3><div class="kl-grid">${S.coaches.map(c => card(c, c.name, c.rank, c.bio)).join("")}</div>`);
      if (S.players.length) parts.push(`<h3>🐉 لاعبونا</h3><div class="kl-grid">${S.players.map(p => card(p, p.name, [p.belt && "حزام " + p.belt, p.age && p.age + " سنة"].filter(Boolean).join(" • "), p.notes)).join("")}</div>`);
      document.getElementById("klBody").innerHTML = parts.join("") || '<div class="kl-e">ستُنشر أخبار وإنجازات الأكاديمية هنا فور إضافتها من لوحة الإدارة.</div>';
      if (window.FX && typeof window.FX.refresh === "function") { try { window.FX.refresh(); } catch (_e) {} }
    }

    /* ═══ 2) المواعيد الحية (تحل محل البطاقات الثابتة عند توفر بيانات) ═══ */
    const AR_DAYS = { "السبت": "Saturday", "الأحد": "Sunday", "الإثنين": "Monday", "الثلاثاء": "Tuesday", "الأربعاء": "Wednesday", "الخميس": "Thursday", "الجمعة": "Friday" };
    const fmtTime = t => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ""));
      if (!m) return String(t || "");
      const h = +m[1], suffix = h >= 12 ? "مساءً" : "صباحاً";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return h12 + ":" + m[2] + " " + suffix;
    };
    const SCHEDULE_ICONS = ["🔥", "🐉", "🏮", "🥊", "🧘"];
    function renderSchedules(list) {
      const grid = document.getElementById("kungfuScheduleGrid");
      const hero = document.getElementById("kungfuDayHero");
      const pill = document.getElementById("kfSchedulePill");
      if (!grid || !list.length) return;
      const active = list.filter(x => x.active !== false);
      if (!active.length) return;
      grid.innerHTML = active.slice(0, 6).map((x, i) => `
        <div class="schedule-card schedule-color-${i % 3}">
          <div class="schedule-card-head">
            <h3>${esc(x.day)}${x.gender ? " — " + esc(x.gender) : ""}</h3>
            <span class="schedule-day-icon">${SCHEDULE_ICONS[i % SCHEDULE_ICONS.length]}</span>
          </div>
          <div class="schedule-card-body">
            <div class="schedule-detail"><div class="schedule-detail-icon">⏱️</div><div><small>التوقيت</small><strong>${esc(fmtTime(x.fromTime))} — ${esc(fmtTime(x.toTime))}</strong></div></div>
            <div class="schedule-detail"><div class="schedule-detail-icon">📍</div><div><small>المكان</small><strong>${esc(x.location || "مركز شباب الأحمدية")}</strong></div></div>
            <div class="schedule-detail"><div class="schedule-detail-icon">👦</div><div><small>الفئة</small><strong>${esc(x.age || "من 5 سنوات فأكثر")}</strong></div></div>
          </div>
        </div>`).join("");
      if (hero) {
        const first = active[0];
        const dayNum = Object.keys(AR_DAYS).indexOf(first.day);
        hero.innerHTML = `
          <div class="kf-day-badge"><b>${"٠١٢٣٤٥٦٧٨٩"[(dayNum + 1) % 10] || "٤"}</b><span>${esc(first.day)}</span></div>
          <div class="kf-day-info">
            <h3>يوم ${esc(first.day)} أسبوعياً</h3>
            <p>⏰ الساعة: <strong>من ${esc(fmtTime(first.fromTime))} إلى ${esc(fmtTime(first.toTime))}</strong></p>
            <p>📍 المكان: <strong>${esc(first.location || "مركز شباب الأحمدية")}</strong></p>
            <p>👦 الفئة: <strong>${esc(first.age || "من 5 سنوات فأكثر")}</strong></p>
          </div>`;
      }
      if (pill && active[0]) {
        pill.innerHTML = `<span>🗓️ موعد التدريب:</span><strong>${esc(active[0].day)} ${esc(fmtTime(active[0].fromTime))}</strong>`;
      }
    }

    /* ═══ 3) الإعدادات الحية (الهاتف، حالة التسجيل) ═══ */
    function applySettings(v) {
      if (!v) return;
      const phone = String(v.phone || "").replace(/\s+/g, "");
      if (/^0?1\d{9}$/.test(phone)) {
        const local = phone.startsWith("0") ? phone : "0" + phone;
        const intl = "+2" + local.replace(/^0/, "");
        document.querySelectorAll("[data-kf-phone]").forEach(el => { el.textContent = local; });
        document.querySelectorAll("[data-kf-phone-link]").forEach(a => { a.href = "tel:" + intl; });
        document.querySelectorAll("[data-kf-wa-link]").forEach(a => { a.href = "https://wa.me/2" + local.replace(/^0/, ""); });
      }
      const badge = document.getElementById("kfLiveBadge");
      if (badge && v.registrationOpen) {
        const open = v.registrationOpen !== "لا";
        badge.querySelector("span:last-child").textContent = open ? "مفتوح للتدريب" : "التسجيل متوقف مؤقتاً";
        badge.style.opacity = open ? "" : ".75";
      }
      if (v.tagline) {
        const tag = document.querySelector(".hero-tag");
        if (tag) tag.textContent = v.tagline;
      }
    }

    const boot = () => {
      let db; try { db = window.SiteData.db(); } catch (e) { render(); return; }
      Object.keys(S).forEach(k => db.ref(ROOT + "/" + k).limitToLast(12).on("value", s => { S[k] = arr(s.val()); render(); }, () => render()));
      db.ref(ROOT + "/schedules").on("value", s => { renderSchedules(arr(s.val())); }, () => {});
      db.ref(ROOT + "/settings").on("value", s => { applySettings(s.val()); }, () => {});
    };
    if (window.firebase && window.SiteData) boot();
    else window.addEventListener("load", () => (window.firebase && window.SiteData ? boot() : render()));
  }
})();
