/* live.js — لوحة «مباشر من المركز» في الصفحة الرئيسية
   كل البيانات من Firebase Realtime Database الموحدة (academia-e6d7b) عبر مستمعين لحظيين محدودين:
   - pitch_booking/availability    (النسخة العامة الآمنة، من أمس إلى +4 أيام فقط)
   - pitch_booking/matchResults    (آخر 5 تواريخ)
   - upcomingMatches / matchResults (أكاديمية كرة القدم — مسارات الأكاديمية الحالية)
   - karate_academy/news           (آخر 4 أخبار)
   لا توجد بيانات تجريبية: إن لم توجد بيانات تُعرض رسالة فراغ. localStorage للكاش فقط. */
(function () {
  "use strict";
  const TZ = "Africa/Cairo";
  const CACHE_KEY = "ahmadiah_live_cache_v1";
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => (n < 10 ? "0" : "") + n;
  const AR = new Intl.NumberFormat("ar-EG");

  /* ---------- الوقت: توقيت القاهرة + ساعة الخادم ---------- */
  let offset = 0;                               // فرق ساعة الخادم عن ساعة الجهاز
  const now = () => Date.now() + offset;
  const fmtParts = (epoch) => {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(epoch));
    const g = t => +p.find(x => x.type === t).value;
    return { y: g("year"), mo: g("month"), d: g("day"), h: g("hour"), mi: g("minute"), s: g("second") };
  };
  const tzOffsetMs = (epoch) => { const t = fmtParts(epoch); return Date.UTC(t.y, t.mo - 1, t.d, t.h, t.mi, t.s) - Math.floor(epoch / 1000) * 1000; };
  const cairoEpoch = (dateStr, h, m) => {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const guess = Date.UTC(y, mo - 1, d, h, m);
    let e = guess - tzOffsetMs(guess);
    e = guess - tzOffsetMs(e);
    return e;
  };
  const dateKey = (epoch) => { const t = fmtParts(epoch); return `${t.y}-${pad(t.mo)}-${pad(t.d)}`; };
  const parseTime = (str) => {            // يقبل 17:30 / 5:30 PM / 05:30 م
    const m = String(str || "").match(/(\d{1,2})\s*[:.]\s*(\d{2})/);
    if (!m) return null;
    let h = +m[1]; const mi = +m[2];
    if (/م|pm/i.test(str) && h < 12) h += 12;
    if (/ص|am/i.test(str) && h === 12) h = 0;
    return (h > 23 || mi > 59) ? null : { h, mi };
  };
  const time12 = (epoch) => new Intl.DateTimeFormat("ar-EG", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(epoch));
  const dayLabel = (epoch) => new Intl.DateTimeFormat("ar-EG", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date(epoch));
  const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
  const untilText = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${pad(d)} يوم و${pad(h)} ساعة`;
    return `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
  };

  /* ---------- حالة محلية + كاش ---------- */
  const S = { bookings: {}, pitchResults: {}, upMatches: [], acResults: [], karateNews: [], karateSched: [], online: true, loaded: {} };
  try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); if (c) Object.assign(S, c, { online: true, loaded: {} }); } catch (e) {}
  let cacheT;
  const saveCache = () => { clearTimeout(cacheT); cacheT = setTimeout(() => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ bookings: S.bookings, pitchResults: S.pitchResults, upMatches: S.upMatches, acResults: S.acResults, karateNews: S.karateNews })); } catch (e) {} }, 400); };

  /* ---------- تطبيع الحجوزات ---------- */
  const teamNames = (b) => {
    const one = (b.teamOneName || (b.teamOneCaptain ? "فريق " + b.teamOneCaptain : "")).trim();
    const two = (b.teamTwoName || (b.teamTwoCaptain ? "فريق " + b.teamTwoCaptain : "")).trim();
    return { one: one || String(b.customerName || "").trim(), two };
  };
  function normalizedBookings() {
    const out = [];
    Object.entries(S.bookings || {}).forEach(([date, day]) => {
      Object.entries(day || {}).forEach(([id, b]) => {
        if (!b || b.status !== "confirmed") return;          // الملغي والمعلّق لا يُعرضان
        const st = parseTime(b.startTime); if (!st) return;
        const start = cairoEpoch(date, st.h, st.mi);
        let dur = Number(b.durationMinutes);
        if (!dur) { const en = parseTime(b.endTime); dur = en ? ((en.h * 60 + en.mi) - (st.h * 60 + st.mi) + 1440) % 1440 || 1440 : 60; }
        out.push({ id, date, b, start, end: start + dur * 60000, names: teamNames(b) });
      });
    });
    return out.sort((a, b) => a.start - b.start);
  }

  /* ---------- القوالب ---------- */
  const vs = (n) => n.two
    ? `<div class="lv-teams"><span class="lv-team">${esc(n.one)}</span><span class="lv-vs">VS</span><span class="lv-team">${esc(n.two)}</span></div>`
    : `<div class="lv-teams single"><span class="lv-team">${esc(n.one)}</span></div>`;
  const skeleton = `<div class="lv-skel"><i></i><i></i><i></i></div>`;
  const empty = (ico, txt) => `<div class="lv-empty"><span>${ico}</span><p>${txt}</p></div>`;

  function pitchNow() {
    if (!S.loaded.bookings && !Object.keys(S.bookings).length) return skeleton;
    const t = now(), list = normalizedBookings();
    const live = list.find(x => t >= x.start && t < x.end);
    if (!live) return `<div class="lv-status idle"><i></i> الملعب متاح الآن</div>` + empty("🏟️", "لا توجد مباراة جارية حالياً");
    return `<div class="lv-status live"><i></i> مباشر الآن</div>
      ${vs(live.names)}
      <div class="lv-times"><div><small>البداية</small><b>${time12(live.start)}</b></div><div><small>ينتهي الحجز</small><b>${time12(live.end)}</b></div></div>
      <div class="lv-count" data-live-end="${live.end}" data-live-start="${live.start}"><small>الوقت المتبقي</small><b class="lv-num">${mmss(live.end - t)}</b><em>دقيقة</em>
        <span class="lv-bar"><u style="width:${Math.min(100, Math.max(0, (t - live.start) / (live.end - live.start) * 100)).toFixed(1)}%"></u></span></div>
      <a class="lv-btn" href="pitch-booking/index.html">صفحة الملعب ←</a>`;
  }
  function pitchNext() {
    if (!S.loaded.bookings && !Object.keys(S.bookings).length) return skeleton;
    const t = now();
    const nxt = normalizedBookings().find(x => x.start > t);
    if (!nxt) return empty("⏭️", "لا توجد حجوزات قادمة حالياً") + `<a class="lv-btn ghost" href="pitch-booking/index.html">احجز موعدك ←</a>`;
    return `${vs(nxt.names)}
      <div class="lv-times"><div><small>اليوم</small><b>${dayLabel(nxt.start)}</b></div><div><small>البداية</small><b>${time12(nxt.start)}</b></div><div><small>ينتهي</small><b>${time12(nxt.end)}</b></div></div>
      <div class="lv-count" data-until="${nxt.start}"><small>يبدأ بعد</small><b class="lv-num">${untilText(nxt.start - t)}</b></div>`;
  }
  const scoreCard = (home, hs, as, away, meta, detail) => `
    <details class="lv-res"><summary>
      <span class="lv-rt">${esc(home)}</span><b class="lv-score">${esc(hs)} <i>-</i> ${esc(as)}</b><span class="lv-rt">${esc(away)}</span>
      <small class="lv-meta">${meta}</small></summary><div class="lv-detail">${detail}</div></details>`;
  function pitchResults() {
    if (!S.loaded.pitchResults && !Object.keys(S.pitchResults).length) return skeleton;
    const rows = [];
    Object.entries(S.pitchResults || {}).forEach(([date, day]) => Object.entries(day || {}).forEach(([id, r]) => { if (r) rows.push({ date, id, r }); }));
    rows.sort((a, b) => Number(b.r.publishedAt || 0) - Number(a.r.publishedAt || 0));
    if (!rows.length) return empty("🏆", "لم تُسجَّل نتائج للملعب الخماسي بعد");
    return rows.slice(0, 5).map(({ date, r }) => {
      const one = r.teamOneName || (r.teamOneCaptain ? "فريق " + r.teamOneCaptain : "الفريق الأول");
      const two = r.teamTwoName || (r.teamTwoCaptain ? "فريق " + r.teamTwoCaptain : "الفريق الثاني");
      const ts = Number(r.publishedAt) || cairoEpoch(date, 12, 0);
      const win = r.winner === "draw" ? "🤝 تعادل" : r.winner === "team1" ? "🏆 فاز " + esc(one) : r.winner === "team2" ? "🏆 فاز " + esc(two) : "";
      return scoreCard(one, Number(r.teamOneScore) || 0, Number(r.teamTwoScore) || 0, two,
        `${dayLabel(ts)} • ${time12(ts)} • انتهت المباراة`,
        `<p>📅 ${dayLabel(ts)} — ${time12(ts)}</p><p>${win}</p><p>الحالة: انتهت المباراة</p>`);
    }).join("");
  }
  function academyNext() {
    if (!S.loaded.up && !S.upMatches.length) return skeleton;
    const t = now();
    const list = S.upMatches.map(m => { const tm = parseTime(m.time) || { h: 0, mi: 0 }; return { m, at: m.date ? cairoEpoch(m.date, tm.h, tm.mi) : 0 }; })
      .filter(x => x.at && x.at > t - 2 * 3600000).sort((a, b) => a.at - b.at);
    if (!list.length) return empty("⚽", "لا توجد مباريات قادمة للأكاديمية حالياً");
    const { m, at } = list[0];
    return `<div class="lv-teams"><span class="lv-team">أكاديمية الأحمدية${m.category ? ` <small>(${esc(m.category)})</small>` : ""}</span><span class="lv-vs">VS</span><span class="lv-team">${esc(m.opponent)}</span></div>
      <div class="lv-times"><div><small>الموعد</small><b>${dayLabel(at)} • ${time12(at)}</b></div>${m.stadium ? `<div><small>المكان</small><b>${esc(m.stadium)}</b></div>` : ""}${m.tournament ? `<div><small>البطولة</small><b>${esc(m.tournament)}</b></div>` : ""}</div>
      <div class="lv-count" data-until="${at}"><small>${at > t ? "المباراة بعد" : "جارية الآن"}</small><b class="lv-num">${at > t ? untilText(at - t) : "—"}</b></div>
      <a class="lv-btn ghost" href="football-academy/index.html">صفحة الأكاديمية ←</a>`;
  }
  function academyResults() {
    if (!S.loaded.acRes && !S.acResults.length) return skeleton;
    if (!S.acResults.length) return empty("📋", "لم تُسجَّل نتائج للأكاديمية بعد");
    return S.acResults.slice(0, 4).map(r => scoreCard("أكاديمية الأحمدية", r.scoreOur, r.scoreOpponent, r.opponent,
      `${esc(r.date || "")}${r.tournament ? " • " + esc(r.tournament) : ""}`,
      `${r.category ? `<p>الفئة: ${esc(r.category)}</p>` : ""}${r.stadium ? `<p>المكان: ${esc(r.stadium)}</p>` : ""}${r.scorers ? `<p>⚽ المسجلون: ${esc(r.scorers)}</p>` : ""}${r.matchReport ? `<p>${esc(r.matchReport)}</p>` : ""}`)).join("");
  }
  function karate() {
    if (!S.loaded.karate && !S.karateNews.length) return skeleton;
    const schedSrc = (S.karateSched && S.karateSched.length) ? S.karateSched : ((window.SiteData && window.SiteData.load().karateSchedule) || []);   // المصدر الحي karate_academy/schedules ثم الكاش
    const sched = schedSrc.filter(x => x && x.active !== false).slice(0, 3);
    const news = S.karateNews.slice(0, 3).map(n => `<li><b>${esc(n.title || n.text || "")}</b>${n.date ? `<small>${esc(n.date)}</small>` : ""}</li>`).join("");
    const sc = sched.map(x => `<li><b>${esc(x.day)}</b><small>${esc(x.fromTime)} – ${esc(x.toTime)}</small></li>`).join("");
    if (!news && !sc) return empty("🥋", "لا توجد أخبار أو مواعيد حالياً");
    return (news ? `<h4>آخر الأخبار</h4><ul class="lv-list">${news}</ul>` : "") + (sc ? `<h4>مواعيد التدريب</h4><ul class="lv-list">${sc}</ul>` : "") + `<a class="lv-btn ghost" href="karate-academy/index.html">أكاديمية الكاراتيه ←</a>`;
  }

  const CARDS = [
    ["pitchNow", "🏟️ الملعب الخماسي الآن", "c-pitch wide", pitchNow],
    ["pitchNext", "⏭️ الحجز التالي", "c-pitch", pitchNext],
    ["pitchRes", "🏆 أحدث نتائج الملعب الخماسي", "c-pitch", pitchResults],
    ["acNext", "⚽ مباريات أكاديمية كرة القدم", "c-football", academyNext],
    ["acRes", "📊 نتائج أكاديمية كرة القدم", "c-football", academyResults],
    ["karate", "🥋 أكاديمية الكاراتيه", "c-karate", karate]
  ];
  function mount() {
    const root = $("#liveRoot"); if (!root) return false;
    root.innerHTML = CARDS.map(([k, title, cls]) => `<article class="lv-card ${cls}" data-k="${k}"><h3>${title}</h3><div class="lv-body"></div></article>`).join("");
    return true;
  }
  function render(only) {
    CARDS.forEach(([k, , , fn]) => {
      if (only && only.indexOf(k) < 0) return;
      const el = $(`.lv-card[data-k="${k}"] .lv-body`); if (!el) return;
      const html = fn();
      if (el.__html !== html) { el.innerHTML = html; el.__html = html; }
    });
    const pill = $("#liveConn");
    if (pill) { pill.className = "lv-conn " + (S.online ? "on" : "off"); pill.textContent = S.online ? "متصل — تحديث لحظي" : "غير متصل — يعرض آخر بيانات محفوظة"; }
  }
  /* عدادات كل ثانية دون إعادة بناء الـDOM */
  function tick() {
    const t = now();
    document.querySelectorAll("[data-live-end]").forEach(el => {
      const end = +el.dataset.liveEnd, st = +el.dataset.liveStart;
      if (t >= end) { render(["pitchNow", "pitchNext"]); return; }
      el.querySelector(".lv-num").textContent = mmss(end - t);
      const u = el.querySelector(".lv-bar u"); if (u) u.style.width = Math.min(100, (t - st) / (end - st) * 100).toFixed(1) + "%";
    });
    document.querySelectorAll("[data-until]").forEach(el => {
      const at = +el.dataset.until;
      if (t >= at) { render(["pitchNow", "pitchNext", "acNext"]); return; }
      el.querySelector(".lv-num").textContent = untilText(at - t);
    });
    if (dateKey(t) !== subDay) subscribeBookings();
  }

  /* ---------- مستمعو Firebase (كل مسار بحدود) ---------- */
  let db = null, subDay = "", bookingsRef = null, bookingsCb = null;
  function subscribeBookings() {
    if (bookingsRef && bookingsCb) bookingsRef.off("value", bookingsCb);   // منع تسرب المستمعين
    subDay = dateKey(now());
    const y = dateKey(now() - 86400000);                                      // أمس: لحجوزات تعبر منتصف الليل
    bookingsRef = db.ref("pitch_booking/availability").orderByKey().startAt(y).limitToFirst(6);
    bookingsCb = (snap) => { S.bookings = snap.val() || {}; S.loaded.bookings = true; saveCache(); render(["pitchNow", "pitchNext"]); };
    bookingsRef.on("value", bookingsCb, () => { S.loaded.bookings = true; render(["pitchNow", "pitchNext"]); });
  }
  const arr = (v) => Object.entries(v || {}).map(([id, x]) => Object.assign({ id }, x));
  function startListeners() {
    db.ref(".info/serverTimeOffset").on("value", s => { offset = Number(s.val()) || 0; });
    db.ref(".info/connected").on("value", s => { S.online = !!s.val(); render([]); });
    subscribeBookings();
    db.ref("pitch_booking/matchResults").orderByKey().limitToLast(5).on("value", s => { S.pitchResults = s.val() || {}; S.loaded.pitchResults = true; saveCache(); render(["pitchRes"]); });
    db.ref("upcomingMatches").orderByChild("date").limitToFirst(10).on("value", s => { S.upMatches = arr(s.val()); S.loaded.up = true; saveCache(); render(["acNext"]); });
    db.ref("matchResults").orderByChild("date").limitToLast(6).on("value", s => { S.acResults = arr(s.val()).sort((a, b) => String(b.date).localeCompare(String(a.date))); S.loaded.acRes = true; saveCache(); render(["acRes"]); });
    db.ref("karate_academy/schedules").on("value", s => { S.karateSched = arr(s.val()).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)); S.loaded.karate = true; saveCache(); render(["karate"]); });
    db.ref("karate_academy/news").limitToLast(4).on("value", s => { S.karateNews = arr(s.val()).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)); S.loaded.karate = true; saveCache(); render(["karate"]); });
  }

  function init() {
    if (!mount()) return;
    render();                                                                 // يعرض الكاش/الهياكل فوراً
    const boot = () => {
      try { db = window.SiteData.db(); startListeners(); }
      catch (e) { console.warn("[live] Firebase unavailable:", e); S.online = false; Object.keys(S.loaded).length || (S.loaded = { bookings: 1, pitchResults: 1, up: 1, acRes: 1, karate: 1 }); render(); }
    };
    if (window.SiteData && window.firebase) boot(); else window.addEventListener("load", boot);
    setInterval(tick, 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
