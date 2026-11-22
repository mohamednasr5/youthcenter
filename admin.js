/* admin.js — لوحة تحكم مركز شباب الأحمدية
   إدارة محتوى الموقع ومزامنته مع قاعدة Firebase المشتركة مع أكاديمية كرة القدم. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SESSION_KEY = "ahmadiah_admin_session_v2";

  let state = SiteData.load();
  let dirty = false;

  /* ---------- helpers: path get/set ---------- */
  function getPath(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  }
  function setPath(obj, path, val) {
    const parts = path.split(".");
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i]; const nk = parts[i + 1];
      if (o[k] == null) o[k] = isNaN(Number(nk)) ? {} : [];
      o = o[k];
    }
    o[parts[parts.length - 1]] = val;
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg, warn) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (warn ? " warn" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = "toast"; }, 2600);
  }

  function markDirty() {
    dirty = true;
    $("#dirtyNote").textContent = "⚠️ لديك تغييرات غير محفوظة";
  }
  function clearDirty() {
    dirty = false;
    $("#dirtyNote").textContent = "✓ تم حفظ كل التغييرات";
  }

  /* ---------- LOGIN ---------- */
  async function initLogin() {
    const btn = $("#loginBtn");
    const pass = $("#loginPass");
    const error = $("#loginErr");
    try {
      await SiteData.syncFromCloud({ seedIfMissing: true });
      state = SiteData.load();
    } catch (e) {
      error.textContent = "تعذر الاتصال بقاعدة بيانات الأكاديمية. تحقق من إعدادات Firebase ثم أعد المحاولة.";
      console.error("Youth center cloud initialization failed:", e);
    }
    if (sessionStorage.getItem(SESSION_KEY) === "1" && !error.textContent) { openDashboard(); return; }
    const tryLogin = async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      error.textContent = "";
      try {
        const ok = await SiteData.verifyAdminPassword(pass.value);
        if (ok) {
          sessionStorage.setItem(SESSION_KEY, "1");
          openDashboard();
        } else {
          error.textContent = "كلمة المرور غير صحيحة";
          pass.value = "";
        }
      } catch (e) {
        error.textContent = e.message || "تعذر التحقق من كلمة المرور عبر قاعدة البيانات.";
      } finally {
        btn.disabled = false;
      }
    };
    btn.addEventListener("click", tryLogin);
    pass.addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
  }
  function openDashboard() {
    $("#loginWrap").style.display = "none";
    $("#adminShell").style.display = "grid";
    $("#asName").textContent = state.meta.siteName;
    renderAll();
    initInteractions();
  }
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  /* ---------- NAV ---------- */
  const SECTIONS = {
    overview: { title: "لوحة المعلومات", sub: "نظرة عامة على محتوى الموقع" },
    settings: { title: "إعدادات الموقع", sub: "الاسم والشعار وبيانات التواصل" },
    news: { title: "شريط الأخبار", sub: "آخر أخبار المركز المتحركة" },
    announce: { title: "الإعلان الهام", sub: "البانر العلوي للموقع" },
    board: { title: "مجلس الإدارة", sub: "أعضاء المجلس والمناصب" },
    articles: { title: "المقالات", sub: "مقالات عن المركز" },
    activities: { title: "النشاطات القادمة", sub: "جدول الفعاليات" },
    finance: { title: "الإحصائيات المالية", sub: "إيرادات ومصروفات الشهر" },
    academies: { title: "الأكاديميات والحجز", sub: "كرة القدم، الكاراتيه، الملعب" },
    backup: { title: "نسخ احتياطي", sub: "تصدير واستيراد البيانات" }
  };
  function switchSection(name) {
    $$(".admin-sec").forEach(s => s.classList.remove("active"));
    $("#sec-" + name).classList.add("active");
    $$("#asNav a").forEach(a => a.classList.toggle("active", a.dataset.sec === name));
    $("#secTitle").textContent = SECTIONS[name].title;
    $("#secSub").textContent = SECTIONS[name].sub;
    $("#adminSide").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- field primitives ---------- */
  function field(label, bind, val, opts) {
    opts = opts || {};
    const hint = opts.hint ? ` <span class="hint">${opts.hint}</span>` : "";
    const ph = opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : "";
    if (opts.type === "textarea") {
      return `<div class="field"><label>${label}${hint}</label><textarea data-bind="${bind}" ${opts.lines ? 'data-lines="true"' : ""} ${ph}>${esc(val)}</textarea></div>`;
    }
    if (opts.type === "select") {
      const opts2 = opts.options.map(o => `<option value="${esc(o.v)}"${o.v === val ? " selected" : ""}>${esc(o.l)}</option>`).join("");
      return `<div class="field"><label>${label}${hint}</label><select data-bind="${bind}">${opts2}</select></div>`;
    }
    const t = opts.type || "text";
    return `<div class="field"><label>${label}${hint}</label><input type="${t}" data-bind="${bind}" value="${esc(val)}" ${ph}></div>`;
  }

  /* ---------- collection wrapper ---------- */
  function collItem(title, innerHtml, idx, collKey) {
    return `<div class="coll-item">
      <div class="ci-head"><span class="ci-title">${esc(title)}</span>
        <div class="ci-actions">
          <button class="up" data-action="up" data-coll="${collKey}" data-idx="${idx}" title="لأعلى">↑</button>
          <button class="down" data-action="down" data-coll="${collKey}" data-idx="${idx}" title="لأسفل">↓</button>
          <button class="del" data-action="del" data-coll="${collKey}" data-idx="${idx}" title="حذف">🗑</button>
        </div></div>
      ${innerHtml}</div>`;
  }
  function addBtn(collKey, label) {
    return `<button class="btn-add" data-action="add" data-coll="${collKey}">➕ ${label}</button>`;
  }

  /* ---------- RENDER: OVERVIEW ---------- */
  function renderOverview() {
    const ov = [
      { ico: "👥", num: state.board.length, lbl: "أعضاء مجلس الإدارة", cls: "gold" },
      { ico: "📰", num: state.news.length, lbl: "عناصر شريط الأخبار", cls: "emerald" },
      { ico: "📝", num: state.articles.length, lbl: "مقالات", cls: "blue" },
      { ico: "📅", num: state.activities.length, lbl: "نشاطات قادمة", cls: "purple" }
    ];
    $("#ovGrid").innerHTML = ov.map(o => `<div class="ov-card ${o.cls}"><div class="ov-ico">${o.ico}</div><div class="ov-num">${o.num}</div><div class="ov-lbl">${o.lbl}</div></div>`).join("");
    const sum = [
      ["اسم الموقع", state.meta.siteName],
      ["الشهر المالي", state.finance.month],
      ["صافي الرصيد", state.finance.net.toLocaleString("en-US") + " ج.م"],
      ["عنوان الإعلان", state.announcement.title],
      ["حالة البيانات", SiteData.hasSaved() ? "محفوظة (معدّلة)" : "الافتراضية"]
    ];
    $("#ovSummary").innerHTML = `<div class="grid-2">${sum.map(s => `<div class="coll-item" style="padding:12px 14px"><div style="font-size:.78rem;color:var(--txt-mute);font-weight:700">${s[0]}</div><div style="font-size:.92rem;color:#fff;font-weight:800;margin-top:2px">${esc(s[1])}</div></div>`).join("")}</div>`;
  }

  /* ---------- RENDER: SETTINGS ---------- */
  function renderSettings() {
    const m = state.meta;
    $("#settingsForm").innerHTML = `
      <div class="admin-card">
        <h3>🏷️ هوية الموقع</h3>
        <p class="sub">اسم المركز والشعار والصورة التعريفية</p>
        <div class="grid-2">
          ${field("اسم المركز", "meta.siteName", m.siteName)}
          ${field("الوصف القصير", "meta.tagline", m.tagline)}
        </div>
        <div class="grid-2">
          ${field("مسار الشعار", "meta.logo", m.logo, { hint: "مثال: assets/logo.svg" })}
          ${field("مسار صورة المركز", "meta.centerPhoto", m.centerPhoto, { hint: "تظهر في خلفية الواجهة" })}
        </div>
      </div>
      <div class="admin-card">
        <h3>📞 بيانات التواصل</h3>
        <p class="sub">تظهر في الشريط العلوي والتذييل</p>
        <div class="grid-2">
          ${field("الموقع", "meta.location", m.location)}
          ${field("رقم الهاتف", "meta.phone", m.phone)}
          ${field("البريد الإلكتروني", "meta.email", m.email)}
          ${field("مواعيد العمل", "meta.hours", m.hours)}
        </div>
        <h3 style="margin-top:18px">🔗 روابط التواصل الاجتماعي</h3>
        <p class="sub">المركز له صفحة رسمية على فيسبوك فقط — وسائل التواصل الأخرى ملغاة</p>
        ${field("رابط صفحة فيسبوك", "meta.fbLink", m.fbLink)}
        ${field("كود منشور فيسبوك", "meta.fbEmbedCode", m.fbEmbedCode || "", { type: "textarea", hint: "الصق كود iframe الذي تنسخه من فيسبوك. بعد حفظ التغييرات سيظهر المنشور في الموقع." })}
        <p class="sub" style="margin-top:8px">طريقة الاستخدام: انسخ كود التضمين من فيسبوك، الصقه هنا، ثم اضغط «حفظ التغييرات». لا تحتاج إلى Page ID أو Access Token.</p>
      </div>
      <div class="admin-card">
        <h3>💻 المطور والأمان</h3>
        <p class="sub">اسم ورابط المطور وإعدادات الأمان</p>
        <div class="grid-2">
          ${field("اسم المطور", "meta.devName", m.devName)}
          ${field("رابط المطور", "meta.devLink", m.devLink, { hint: "رابط واتساب أو موقع المطور" })}
        </div>
        
      </div>`;
  }

  /* ---------- RENDER: NEWS ---------- */
  function renderNews() {
    const items = state.news.map((n, i) => collItem(`خبر ${i + 1}`,
      `<div class="grid-3">
        ${field("الأيقونة", `news.${i}.icon`, n.icon)}
        ${field("نص الخبر", `news.${i}.text`, n.text)}
      </div>`, i, "news")).join("");
    $("#newsForm").innerHTML = `<div class="admin-card"><h3>📰 عناصر شريط الأخبار</h3><p class="sub">تظهر متحركة في شريط آخر الأخبار أعلى الموقع</p>${items}${addBtn("news", "إضافة خبر")}</div>`;
  }

  /* ---------- RENDER: ANNOUNCE ---------- */
  function renderAnnounce() {
    const a = state.announcement;
    $("#announceForm").innerHTML = `<div class="admin-card">
      <h3>📢 الإعلان الهام</h3><p class="sub">البانر البارز أسفل الواجهة</p>
      ${field("العنوان", "announcement.title", a.title)}
      ${field("النص", "announcement.body", a.body, { type: "textarea" })}
      <div class="grid-2">
        ${field("نص الزر", "announcement.ctaText", a.ctaText)}
        ${field("رابط الزر", "announcement.ctaLink", a.ctaLink, { hint: "#join أو رابط" })}
      </div></div>`;
  }

  /* ---------- RENDER: BOARD ---------- */
  function renderBoard() {
    const tagOpts = [{ v: "", l: "رئيس المجلس (ذهبي)" }, { v: "vice", l: "نائب الرئيس (زمردي)" }, { v: "treas", l: "آمين الصندوق (أزرق)" }, { v: "member", l: "عضو تحت السن (بنفسجي)" }];
    const items = state.board.map((m, i) => collItem(`عضو ${i + 1}: ${m.name}`,
      `<div class="grid-2">
        ${field("رقم الصورة", `board.${i}.id`, m.id, { hint: "مثال: 001 → board/001.jpg" })}
        ${field("الاسم", `board.${i}.name`, m.name)}
        ${field("المنصب", `board.${i}.role`, m.role)}
        ${field("عنوان البادج", `board.${i}.tag`, m.tag)}
      </div>
      ${field("لون البادج", `board.${i}.tagClass`, m.tagClass, { type: "select", options: tagOpts })}`, i, "board")).join("");
    $("#boardForm").innerHTML = `<div class="admin-card">
      <h3>👥 أعضاء مجلس الإدارة</h3><p class="sub">ضع صور الأعضاء في مجلد board/ بأسماء تطابق «رقم الصورة»</p>
      ${items}${addBtn("board", "إضافة عضو")}</div>`;
  }

  /* ---------- RENDER: ARTICLES ---------- */
  function renderArticles() {
    const items = state.articles.map((a, i) => collItem(`مقال ${i + 1}: ${a.title}`,
      `<div class="grid-3">
        ${field("الأيقونة", `articles.${i}.icon`, a.icon)}
        ${field("التصنيف", `articles.${i}.category`, a.category)}
        ${field("وقت القراءة", `articles.${i}.readTime`, a.readTime)}
      </div>
      ${field("العنوان", `articles.${i}.title`, a.title)}
      ${field("المقتطف", `articles.${i}.excerpt`, a.excerpt, { type: "textarea" })}
      ${field("نص المقال (كل فقرة في سطر)", `articles.${i}.body`, (a.body || []).join("\n"), { type: "textarea", lines: true, hint: "افصل بين الفقرات بسطر جديد" })}`, i, "articles")).join("");
    $("#articlesForm").innerHTML = `<div class="admin-card">
      <h3>📝 مقالات عن المركز</h3><p class="sub">كل مقال له صفحة خاصة تفتح عند الضغط عليه</p>
      ${items}${addBtn("articles", "إضافة مقال")}</div>`;
  }

  /* ---------- RENDER: ACTIVITIES ---------- */
  function renderActivities() {
    const typeOpts = [
      { v: "sport", l: "رياضي" }, { v: "religious", l: "ديني" }, { v: "edu", l: "تثقيفي" }, { v: "fun", l: "ترفيهي" }
    ];
    const items = state.activities.map((x, i) => collItem(`نشاط ${i + 1}: ${x.name}`,
      `${field("اسم النشاط", `activities.${i}.name`, x.name)}
      <div class="grid-3">
        ${field("النوع", `activities.${i}.type`, x.type, { type: "select", options: typeOpts })}
        ${field("اسم النوع (عرض)", `activities.${i}.typeLabel`, x.typeLabel)}
        ${field("اليوم", `activities.${i}.day`, x.day)}
      </div>
      <div class="grid-3">
        ${field("رقم اليوم", `activities.${i}.date`, x.date)}
        ${field("الشهر", `activities.${i}.month`, x.month)}
        ${field("الساعة", `activities.${i}.time`, x.time)}
      </div>`, i, "activities")).join("");
    $("#activitiesForm").innerHTML = `<div class="admin-card">
      <h3>📅 النشاطات القادمة</h3><p class="sub">جدول الفعاليات والأنشطة</p>
      ${items}${addBtn("activities", "إضافة نشاط")}</div>`;
  }

  /* ---------- RENDER: FINANCE ---------- */
  function renderFinance() {
    const f = state.finance;
    const colorOpts = [{ v: "gold", l: "ذهبي" }, { v: "emerald", l: "زمردي" }, { v: "blue", l: "أزرق" }, { v: "red", l: "أحمر" }];
    const rows = (f.rows || []).map((r, i) => collItem(`بند ${i + 1}: ${r.label}`,
      `<div class="grid-2">
        ${field("البيان", `finance.rows.${i}.label`, r.label)}
        ${field("المبلغ", `finance.rows.${i}.value`, r.value, { type: "number" })}
      </div>
      <div class="grid-3">
        ${field("اللون", `finance.rows.${i}.color`, r.color, { type: "select", options: colorOpts })}
        ${field("نسبة الشريط %", `finance.rows.${i}.pct`, r.pct, { type: "number" })}
        ${field("بند مصروف؟", `finance.rows.${i}.negative`, r.negative, { type: "select", options: [{ v: "false", l: "لا (إيراد)" }, { v: "true", l: "نعم (مصروف)" }] })}
      </div>`, i, "finance.rows")).join("");
    const chartInputs = (f.chart || []).map((v, i) => `<div class="field"><label>شهر ${i + 1} %</label><input type="number" data-bind="finance.chart.${i}" value="${v}"></div>`).join("");
    const chartLabels = (f.chartLabels || []).map((l, i) => `<div class="field"><label>اسم شهر ${i + 1}</label><input data-bind="finance.chartLabels.${i}" value="${esc(l)}"></div>`).join("");
    $("#financeForm").innerHTML = `<div class="admin-card">
      <h3>💰 بيانات الشهر</h3><p class="sub">إحصائيات مالية لهذا الشهر — تُدخل يدوياً من هنا وتظهر للزوار كما هي</p>
      <div class="grid-2">
        ${field("اسم الشهر", "finance.month", f.month)}
        ${field("ملاحظة", "finance.note", f.note)}
        ${field("صافي الرصيد", "finance.net", f.net, { type: "number" })}
        ${field("الشهر الحالي (مؤشر)", "finance.currentIdx", f.currentIdx, { type: "number", hint: "0-5" })}
      </div>
      ${field("نص الاتجاه", "finance.trend", f.trend)}</div>
      <div class="admin-card"><h3>📊 البنود</h3>${rows}${addBtn("finance.rows", "إضافة بند")}</div>
      <div class="admin-card"><h3>📈 رسم آخر الأشهر</h3><p class="sub">قيم النسب المئوية وأسماء الأشهر</p>
      <div class="grid-3">${chartInputs}</div>
      <div class="grid-3">${chartLabels}</div></div>`;
  }

  /* ---------- RENDER: ACADEMIES ---------- */
  function renderAcademies() {
    const A = state.academies;
    const f = A.football, k = A.karate, p = A.pitch;
    $("#academiesForm").innerHTML = `
      <div class="admin-card"><h3>⚽ أكاديمية كرة القدم</h3>
        ${field("الرابط", "academies.football.href", f.href)}
        <div class="grid-2">${field("الوسم", "academies.football.tag", f.tag)}${field("العنوان", "academies.football.title", f.title)}</div>
        ${field("الوصف", "academies.football.desc", f.desc, { type: "textarea" })}
        ${field("المميزات (بفاصلة)", "academies.football.pills", (f.pills || []).join("، "), { hint: "افصل بفاصلة" })}
        ${field("نص الزر", "academies.football.cta", f.cta)}
      </div>
      <div class="admin-card"><h3>🥋 أكاديمية الكاراتيه</h3>
        ${field("الرابط", "academies.karate.href", k.href)}
        <div class="grid-2">${field("الوسم", "academies.karate.tag", k.tag)}${field("العنوان", "academies.karate.title", k.title)}</div>
        ${field("الوصف", "academies.karate.desc", k.desc, { type: "textarea" })}
        ${field("المميزات (بفاصلة)", "academies.karate.pills", (k.pills || []).join("، "))}
        ${field("نص الزر", "academies.karate.cta", k.cta)}
      </div>
      <div class="admin-card"><h3>🏟️ حجز الملعب الخماسي</h3>
        ${field("الرابط", "academies.pitch.href", p.href)}
        <div class="grid-2">${field("الوسم", "academies.pitch.tag", p.tag)}${field("العنوان", "academies.pitch.title", p.title)}</div>
        ${field("الوصف", "academies.pitch.desc", p.desc, { type: "textarea" })}
        ${field("المميزات (بفاصلة)", "academies.pitch.feats", (p.feats || []).join("، "))}
      </div>`;
  }

  /* ---------- RENDER: BACKUP ---------- */
  function renderBackup() {
    $("#backupForm").innerHTML = `<div class="admin-card">
      <h3>📤 تصدير البيانات</h3><p class="sub">حمّل نسخة من كل محتوى الموقع كملف JSON</p>
      <button class="btn btn-gold" id="exportBtn">⬇️ تحميل ملف JSON</button>
    </div>
    <div class="admin-card">
      <h3>📥 استيراد البيانات</h3><p class="sub">استعد نسخة سابقة من ملف JSON</p>
      <button class="btn btn-emerald" id="importBtn">⬆️ اختيار ملف JSON</button>
      <div id="importMsg" style="margin-top:10px;font-size:.82rem"></div>
    </div>
    <div class="admin-card">
      <h3>📋 المحتوى الحالي (للنسخ اليدوي)</h3>
      <textarea class="json-area" id="jsonArea" readonly>${esc(SiteData.exportJSON())}</textarea>
      <button class="btn btn-ghost btn-sm" id="copyJson" style="margin-top:8px">📋 نسخ</button>
    </div>`;
  }

  function renderAll() {
    renderOverview(); renderSettings(); renderNews(); renderAnnounce();
    renderBoard(); renderArticles(); renderActivities(); renderFinance(); renderAcademies(); renderBackup();
  }

  /* ---------- input binding ---------- */
  function onInput(e) {
    const t = e.target;
    const bind = t.getAttribute("data-bind");
    if (!bind) return;
    let val = t.value;
    if (t.type === "number") val = val === "" ? 0 : Number(val);
    else if (t.type === "select-one") {
      if (val === "true") val = true; else if (val === "false") val = false;
    }
    if (t.dataset.lines) val = val.split(/\r?\n/).map(s => s.trim()).filter(s => s.length);
    if (t.dataset.csv) val = val.split(/[،,]/).map(s => s.trim()).filter(s => s.length);
    // pills/feats detection
    if (bind.endsWith(".pills") || bind.endsWith(".feats")) {
      val = String(t.value).split(/[،,]/).map(s => s.trim()).filter(s => s.length);
    }
    setPath(state, bind, val);
    markDirty();
  }

  /* ---------- collection actions ---------- */
  const DEFAULTS = {
    news: () => ({ icon: "📰", text: "خبر جديد" }),
    board: () => ({ id: "00" + (state.board.length + 1), name: "عضو جديد", role: "عضو", tag: "عضو", tagClass: "member" }),
    articles: () => {
      const maxId = state.articles.reduce((m, a) => Math.max(m, a.id), 0);
      return { id: maxId + 1, icon: "📝", category: "تصنيف", readTime: "3 دقائق قراءة", title: "مقال جديد", excerpt: "مقتطف المقال", body: ["اكتب المقال هنا..."] };
    },
    activities: () => ({ name: "نشاط جديد", type: "sport", typeLabel: "رياضي", day: "الجمعة", date: "01", month: "يناير", time: "6:00 م" }),
    "finance.rows": () => ({ label: "بند جديد", value: 0, color: "gold", pct: 50, negative: false })
  };
  function getColl(key) {
    if (key.includes(".")) return getPath(state, key);
    return state[key];
  }
  function collAction(action, key, idx) {
    const arr = getColl(key);
    if (action === "add") { arr.push(DEFAULTS[key]()); }
    else if (action === "del") { if (confirm("حذف هذا العنصر؟")) arr.splice(idx, 1); }
    else if (action === "up") { if (idx > 0) { const t = arr[idx - 1]; arr[idx - 1] = arr[idx]; arr[idx] = t; } }
    else if (action === "down") { if (idx < arr.length - 1) { const t = arr[idx + 1]; arr[idx + 1] = arr[idx]; arr[idx] = t; } }
    markDirty();
    reRenderSection(key);
  }
  function reRenderSection(key) {
    if (key === "news") renderNews();
    else if (key === "board") renderBoard();
    else if (key === "articles") renderArticles();
    else if (key === "activities") renderActivities();
    else if (key === "finance.rows") renderFinance();
  }

  /* ---------- اختبار جلب آخر منشور من صفحة المركز على فيسبوك ---------- */
  async function runFbTest() {
    const out = $("#fbTestOut");
    if (!out) return;
    // نستخدم القيم المعروضة حالياً في الحقول حتى لو لم تُحفظ بعد
    const pidInput = document.querySelector('[data-bind="meta.fbPageId"]');
    const tokInput = document.querySelector('[data-bind="meta.fbToken"]');
    const pageId = (pidInput && pidInput.value) || state.meta.fbPageId || "";
    const token = (tokInput && tokInput.value) || state.meta.fbToken || "";
    out.innerHTML = "⏳ جاري الاتصال بفيسبوك وقراءة آخر منشور على الصفحة...";
    const res = await FBPost.testFetch(pageId, token);
    if (!res.ok) {
      out.innerHTML = `<span style="color:var(--red);font-weight:800">✗ ${esc(res.error)}</span>
        <p class="sub" style="margin-top:6px">تأكد من إدخال «معرف صفحة فيسبوك» و«توكن فيسبوك» أعلاه ثم اضغط «حفظ التغييرات».<br>💡 بديل بدون توكن: أضف <code>FB_PAGE_ID</code> و <code>FB_PAGE_TOKEN</code> في Secrets بمستودع GitHub — يعمل <code>tools/update_fb_post.py</code> يومياً ويحدّث <code>fb-post.json</code> تلقائياً لكل الزوار.</p>`;
      return;
    }
    const p = res.post;
    out.innerHTML = `<span style="color:var(--emerald-2);font-weight:800">✓ تم جلب آخر منشور بنجاح</span>
      <div class="coll-item" style="margin-top:8px">
        <div style="font-weight:800;margin-bottom:6px">🗓️ ${p.created ? esc(new Date(p.created).toLocaleString("ar-EG-u-nu-latn")) : ""}</div>
        <div style="font-size:.86rem;white-space:pre-wrap">${esc(p.message || "(منشور بصورة فقط)")}</div>
        ${p.picture ? `<div style="margin-top:6px"><img src="${esc(p.picture)}" alt="" style="max-width:100%;border-radius:8px"></div>` : ""}
        ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:.8rem;color:var(--gold-2);font-weight:800">🔗 فتح المنشور على فيسبوك ↗</a>` : ""}
      </div>`;
    toast("✓ تم جلب آخر منشور من فيسبوك");
  }

  /* ---------- save / reset / backup ---------- */
  async function save() {
    if (state.finance && state.finance.chart) state.finance.chart = state.finance.chart.map(v => Number(v) || 0);
    try {
      await SiteData.save(state);
      clearDirty();
      toast("✓ تم حفظ التغييرات في قاعدة البيانات المشتركة");
    } catch (e) {
      toast("تعذر الحفظ في قاعدة البيانات: " + (e.message || "خطأ غير معروف"), true);
    }
  }
  async function reset() {
    if (!confirm("⚠️ سيتم استعادة كل المحتوى إلى الحالة الافتراضية وحذف كل تعديلاتك. هل أنت متأكد؟")) return;
    try {
      state = await SiteData.reset();
      renderAll();
      clearDirty();
      toast("تمت استعادة الافتراضي في قاعدة البيانات", true);
    } catch (e) {
      toast("تعذر الاستعادة: " + (e.message || "خطأ غير معروف"), true);
    }
  }
  function exportJSON() {
    const blob = new Blob([SiteData.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ahmadiah-data-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("✓ تم تصدير البيانات");
  }
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        state = await SiteData.importJSON(reader.result);
        renderAll(); clearDirty();
        $("#importMsg").innerHTML = '<span style="color:var(--emerald-2);font-weight:800">✓ تم الاستيراد والحفظ في قاعدة البيانات</span>';
        toast("✓ تم استيراد البيانات");
      } catch (e) {
        $("#importMsg").innerHTML = '<span style="color:var(--red);font-weight:800">✗ تعذر الاستيراد أو الحفظ في قاعدة البيانات</span>';
        toast("ملف غير صالح أو تعذر الاتصال بقاعدة البيانات", true);
      }
    };
    reader.readAsText(file);
  }

  /* ---------- interactions ---------- */
  function initInteractions() {
    $$("#asNav a").forEach(a => a.addEventListener("click", () => switchSection(a.dataset.sec)));
    $("#adminMtoggle").addEventListener("click", () => $("#adminSide").classList.toggle("open"));
    $("#logoutBtn").addEventListener("click", e => { e.preventDefault(); logout(); });

    const main = $(".admin-main");
    main.addEventListener("change", onInput);
    main.addEventListener("input", e => { if (e.target.matches("textarea, input[type=text]")) onInput(e); });
    main.addEventListener("click", e => {
      const b = e.target.closest("[data-action]");
      if (b) collAction(b.dataset.action, b.dataset.coll, parseInt(b.dataset.idx, 10));
      if (e.target.closest("#fbTestBtn")) runFbTest();
    });

    $("#saveBtn").addEventListener("click", save);
    $("#resetBtn").addEventListener("click", reset);

    // backup buttons (delegated, re-bound on render)
    const rebindBackup = () => {
      const eb = $("#exportBtn"), ib = $("#importBtn"), cj = $("#copyJson"), ja = $("#jsonArea");
      if (eb) eb.onclick = exportJSON;
      if (ib) ib.onclick = () => $("#importFile").click();
      if (cj) cj.onclick = () => { ja.select(); document.execCommand("copy"); toast("✓ تم النسخ"); };
    };
    $("#asNav a[data-sec=backup]").addEventListener("click", () => setTimeout(rebindBackup, 50));
    $("#importFile").addEventListener("change", e => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ""; });

    window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  }

  /* ---------- boot ---------- */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initLogin);
  else initLogin();
})();
