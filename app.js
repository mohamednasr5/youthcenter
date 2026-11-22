/* app.js — رسم منصة مركز شباب الأحمدية من البيانات + التفاعلات + PWA */
(function () {
  "use strict";
  let D = window.SiteData.load();

  // ---- helpers ----
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtNum = (n) => Number(n).toLocaleString("en-US");
  const SVG_MSG = '<svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.14 2 11.25c0 2.92 1.44 5.53 3.69 7.23V22l3.4-1.87c.9.25 1.87.39 2.91.39 5.5 0 10-4.14 10-9.25S17.5 2 12 2zm.93 12.4l-2.55-2.72-4.98 2.72L10.88 9l2.55 2.72 4.98-2.72L12.93 14.4z"/></svg>';
  const SVG_FB = '<svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 10-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7A10 10 0 0022 12z"/></svg>';
  const AVATAR_FALLBACK = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%230b1224%22/%3E%3Ccircle cx=%2250%22 cy=%2238%22 r=%2218%22 fill=%22%23f3f5fb%22/%3E%3Cpath d=%22M22,92 a28,28 0 0 1 56,0%22 fill=%22%23f3f5fb%22/%3E%3C/svg%3E";

  // ===== TOP BAR (المركز له صفحة فيسبوك فقط) =====
  function renderTopBar() {
    $("#topLocation").innerHTML = "📍 " + esc(D.meta.location);
    const soc = $("#topSocial");
    soc.innerHTML = D.meta.fbLink
      ? `<a href="${esc(D.meta.fbLink)}" class="soc" aria-label="صفحة المركز على فيسبوك" target="_blank" rel="noopener">${SVG_FB}</a>`
      : "";
  }

  // ===== BRAND / HERO BG =====
  function renderBrand() {
    $("#brandLogo").src = D.meta.logo;
    $("#brandName").textContent = D.meta.siteName;
    $("#brandTagline").textContent = D.meta.tagline;
    $("#heroBg").style.setProperty("--hero-img", `url('${D.meta.centerPhoto}')`);
    $(".hero-emblem .emblem-logo").src = D.meta.logo;
  }

  // ===== NEWS TICKER =====
  function renderNews() {
    const items = D.news.map(n =>
      `<span class="t-item"><span class="ico">${esc(n.icon || "")}</span> ${esc(n.text)} <span class="sep">◆</span></span>`).join("");
    const c = $("#tContent");
    c.innerHTML = items + items; // duplicate for seamless loop
  }

  // ===== ANNOUNCEMENT =====
  function renderAnnouncement() {
    const a = D.announcement || {};
    $("#announceSlot").innerHTML = `<div class="wrap"><div class="announce-card">
      <div class="announce-ico">📢</div>
      <div class="announce-body">
        <div class="tag">إعلان هام</div>
        <h3>${esc(a.title || "")}</h3>
        <p>${esc(a.body || "")}</p>
      </div>
      <div class="announce-cta"><a href="${esc(a.ctaLink || "#join")}" class="btn btn-gold">${esc(a.ctaText || "سجّل الآن")}</a></div>
    </div></div>`;
  }

  // ===== BOARD =====
  function renderBoard() {
    const grid = $("#boardGrid");
    grid.innerHTML = D.board.map(m => `
      <div class="bcard tilt">
        <div class="ph">
          <img src="board/${esc(m.id)}.jpg" alt="${esc(m.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${AVATAR_FALLBACK}'">
        </div>
        <div class="info"><h4>${esc(m.name)}</h4><div class="pos">${esc(m.role)}</div></div>
      </div>`).join("");
  }

  // ===== ACADEMIES =====
  function renderAcademies() {
    const A = D.academies || {};
    const f = A.football || {}, k = A.karate || {}, p = A.pitch || {};
    $("#academyGrid").innerHTML = `
      <a href="${esc(f.href)}" class="acard football tilt">
        <div class="bg"><div class="bg-orb"></div></div>
        <div class="content">
          <span class="tag">${esc(f.tag)}</span>
          <h3>${esc(f.title)}</h3>
          <p>${esc(f.desc)}</p>
          <div class="pills">${(f.pills || []).map(x => `<span class="pill">${esc(x)}</span>`).join("")}</div>
          <span class="btn btn-emerald">${esc(f.cta)}</span>
        </div>
      </a>
      <a href="${esc(k.href)}" class="acard karate tilt">
        <div class="bg"><div class="bg-orb"></div></div>
        <div class="content">
          <span class="tag">${esc(k.tag)}</span>
          <h3>${esc(k.title)}</h3>
          <p>${esc(k.desc)}</p>
          <div class="pills">${(k.pills || []).map(x => `<span class="pill">${esc(x)}</span>`).join("")}</div>
          <span class="btn btn-gold">${esc(k.cta)}</span>
        </div>
      </a>`;
    $("#pitchSlot").innerHTML = `
      <a href="${esc(p.href)}" class="pitch-card tilt">
        <div class="pico">🏟️</div>
        <div class="pinfo">
          <div class="ptag">${esc(p.tag)}</div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.desc)}</p>
          <div class="pfeats">${(p.feats || []).map(x => `<span class="pfeat">${esc(x)}</span>`).join("")}</div>
        </div>
        <span class="btn btn-ghost">احجز الآن ←</span>
      </a>`;
  }

  // ===== ARTICLES =====
  function renderArticles() {
    $("#artGrid").innerHTML = D.articles.map(a => `
      <article class="art" onclick="location.href='article.html?id=${a.id}'">
        <div class="ah">${esc(a.icon || "📰")}</div>
        <div class="ac">
          <div class="meta">${esc(a.category || "")} • ${esc(a.readTime || "")}</div>
          <h4>${esc(a.title)}</h4>
          <p>${esc(a.excerpt)}</p>
          <span class="more">اقرأ المقال ←</span>
        </div>
      </article>`).join("");
  }

  // ===== ACTIVITIES =====
  function renderActivities() {
    $("#actGrid").innerHTML = D.activities.map(x => `
      <div class="act">
        <div class="datebox"><div class="d">${esc(x.date)}</div><div class="m">${esc(x.month)}</div></div>
        <div class="ainfo">
          <h4>${esc(x.name)}</h4>
          <div class="meta"><span>🗓️ ${esc(x.day)}</span><span>⏰ ${esc(x.time)}</span></div>
        </div>
        <span class="type ${esc(x.type)}">${esc(x.typeLabel)}</span>
      </div>`).join("");
  }

  // ===== GALLERY: discover every uploaded image from a generated manifest =====
  // ===== GALLERY: carousel matching the football players showcase =====
  async function renderGallery() {
    const slot = $("#galleryGrid");
    if (!slot) return;
    const section = slot.closest("#gallery");
    let images = [];
    try {
      const response = await fetch("gallery/gallery-manifest.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Gallery manifest unavailable");
      const manifest = await response.json();
      images = Array.isArray(manifest.images) ? manifest.images : [];
    } catch (error) {
      console.warn("[Gallery] Could not load dynamic image list:", error);
      images = (D.gallery || []).map(item => ({
        src: `gallery/${item.id}.jpg`,
        caption: item.cap || "من أنشطة مركز شباب الأحمدية"
      }));
    }

    images = images.filter(item => {
      const src = typeof item === "string" ? item : item?.src;
      return typeof src === "string" &&
        /^gallery\/[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp|avif|gif)$/i.test(src);
    }).map(item => typeof item === "string"
      ? { src: item, caption: "من أنشطة وفعاليات مركز شباب الأحمدية" }
      : item);

    // Verify real image files before building the carousel; never render broken-image cards.
    images = (await Promise.all(images.map(item => new Promise(resolve => {
      const probe = new Image();
      probe.onload = () => resolve(item);
      probe.onerror = () => resolve(null);
      probe.src = item.src;
    })))).filter(Boolean);

    if (!images.length) {
      if (section) section.style.display = "none";
      return;
    }
    if (section) section.style.display = "";

    slot.classList.add("gallery-carousel");
    slot.innerHTML = `
      <div class="gallery-carousel-stage" id="galleryCarouselStage">
        <div class="gallery-carousel-track" id="galleryCarouselTrack">
          ${images.map((item, index) => `
            <button class="gallery-carousel-slide" type="button" data-gallery-index="${index}"
              aria-label="عرض الصورة رقم ${index + 1}" tabindex="-1">
              <span class="gallery-carousel-image">
                <img src="${esc(item.src)}" alt="${esc(item.caption || "من أنشطة المركز")}"
                  loading="${index < 3 ? "eager" : "lazy"}" decoding="async" draggable="false">
              </span>
              <span class="gallery-carousel-caption">${esc(item.caption || "من أنشطة وفعاليات مركز شباب الأحمدية")}</span>
            </button>`).join("")}
        </div>
        <button class="gallery-carousel-arrow gallery-carousel-prev" type="button" aria-label="الصورة السابقة">‹</button>
        <button class="gallery-carousel-arrow gallery-carousel-next" type="button" aria-label="الصورة التالية">›</button>
        <div class="gallery-carousel-controls">
          <span class="gallery-carousel-counter" id="galleryCarouselCounter">01 / ${String(images.length).padStart(2,"0")}</span>
          <div class="gallery-carousel-dots" id="galleryCarouselDots" aria-label="اختيار صورة">
            ${images.map((_,index)=>`<button class="gallery-carousel-dot" type="button" data-go-gallery="${index}" aria-label="الصورة ${index+1}"></button>`).join("")}
          </div>
          <button class="gallery-carousel-pause" id="galleryCarouselPause" type="button" aria-pressed="false">Ⅱ إيقاف</button>
        </div>
      </div>`;

    let active = 0;
    let timer = null;
    let paused = false;
    const slides = [...slot.querySelectorAll(".gallery-carousel-slide")];
    const dots = [...slot.querySelectorAll(".gallery-carousel-dot")];
    const counter = slot.querySelector("#galleryCarouselCounter");
    const pauseButton = slot.querySelector("#galleryCarouselPause");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function update() {
      const total = slides.length;
      slides.forEach((slide,index) => {
        let offset = index - active;
        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;
        slide.className = "gallery-carousel-slide";
        slide.dataset.position = String(offset);
        slide.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
        slide.tabIndex = offset === 0 ? 0 : -1;
        if (offset === 0) slide.classList.add("is-active");
        else if (Math.abs(offset) === 1) slide.classList.add(offset < 0 ? "is-prev" : "is-next");
        else if (Math.abs(offset) === 2) slide.classList.add("is-far");
        else slide.classList.add("is-hidden");
      });
      if (counter) counter.textContent = `${String(active+1).padStart(2,"0")} / ${String(total).padStart(2,"0")}`;
      dots.forEach((dot,index) => {
        dot.classList.toggle("active",index===active);
        dot.setAttribute("aria-current",index===active ? "true" : "false");
      });
    }
    function move(step) {
      active = (active + step + slides.length) % slides.length;
      update();
    }
    function stop(){ if(timer){clearInterval(timer);timer=null;} }
    function start(){
      stop();
      if(paused || reducedMotion || slides.length < 2) return;
      timer = setInterval(()=>move(1),2000);
    }
    function restart(){start();}

    slot.querySelector(".gallery-carousel-prev").addEventListener("click",()=>{move(-1);restart();});
    slot.querySelector(".gallery-carousel-next").addEventListener("click",()=>{move(1);restart();});
    dots.forEach(dot=>dot.addEventListener("click",()=>{
      active=Number(dot.dataset.goGallery)||0;update();restart();
    }));
    pauseButton.addEventListener("click",()=>{
      paused=!paused;
      pauseButton.setAttribute("aria-pressed",String(paused));
      pauseButton.textContent=paused?"▶ تشغيل":"Ⅱ إيقاف";
      paused?stop():start();
    });
    slot.addEventListener("mouseenter",stop);
    slot.addEventListener("mouseleave",start);
    slot.addEventListener("focusin",stop);
    slot.addEventListener("focusout",()=>setTimeout(()=>{
      if(!slot.contains(document.activeElement)) start();
    },0));
    slot.addEventListener("keydown",event=>{
      if(event.key==="ArrowLeft"){event.preventDefault();move(1);restart();}
      if(event.key==="ArrowRight"){event.preventDefault();move(-1);restart();}
    });
    let touchX=0;
    slot.addEventListener("touchstart",event=>{
      touchX=event.changedTouches[0].clientX;stop();
    },{passive:true});
    slot.addEventListener("touchend",event=>{
      const delta=event.changedTouches[0].clientX-touchX;
      if(Math.abs(delta)>45)move(delta<0?1:-1);
      start();
    },{passive:true});
    slides.forEach(slide=>slide.addEventListener("click",()=>{
      const item=images[Number(slide.dataset.galleryIndex)];
      openGalleryLightbox(item.src,item.caption||"");
    }));
    update();
    start();
  }

  // ===== FINANCE (يدوية بالكامل — تُدخل من لوحة التحكم كما هي) =====
  function renderFinance() {
    const F = D.finance || {};
    const colorMap = { gold: "var(--gold)", emerald: "var(--emerald)", blue: "var(--blue)", red: "var(--red)" };
    const gradMap = {
      gold: "linear-gradient(90deg,var(--gold),#d97706)",
      emerald: "linear-gradient(90deg,var(--emerald),#047857)",
      blue: "linear-gradient(90deg,var(--blue),#0284c7)",
      red: "linear-gradient(90deg,var(--red),#be123c)"
    };
    const rows = (F.rows || []).map(r => `
      <div class="fin-row">
        <span class="lbl"><span class="dot" style="background:${colorMap[r.color] || "var(--gold)"}"></span> ${esc(r.label)}</span>
        <span class="val ${r.negative ? "neg" : "pos"}" data-count="${r.value}" data-suffix=" ج.م">0</span>
      </div>
      <div class="fin-bar"><span style="width:${r.pct}%;background:${gradMap[r.color] || gradMap.gold}"></span></div>`).join("");
    const bars = (F.chart || []).map((h, i) =>
      `<div class="bar ${i === F.currentIdx ? "cur" : ""}" style="height:${h}%"></div>`).join("");
    const blbls = (F.chartLabels || []).map(l => `<span>${esc(l)}</span>`).join("");
    const ql = (D.quickLinks || []).map(q =>
      `<a href="${esc(q.href)}">${esc(q.icon || "")} ${esc(q.label)}</a>`).join("");
    $("#financeSlot").innerHTML = `
      <div class="fin-card">
        <div class="fin-head">
          <h3><span class="fico">💰</span> إحصائيات مالية</h3>
          <span class="month">${esc(F.month || "")}</span>
        </div>
        <div class="fin-note">📊 ${esc(F.note || "")}</div>
        ${rows}
        <div class="fin-net">
          <div class="nlbl">صافي الرصيد لهذا الشهر</div>
          <div class="nval">+<span data-count="${F.net || 0}">0</span> ج.م</div>
          <div class="nsub">${esc(F.trend || "")}</div>
        </div>
        <div class="fin-chart">
          <div class="ctitle">إيرادات آخر ${(F.chart || []).length} أشهر <span class="sm">بالجنيه</span></div>
          <div class="bars">${bars}</div>
          <div class="blbls">${blbls}</div>
        </div>
      </div>
      <!-- قسم جديد: آخر منشور على صفحة المركز على فيسبوك (تلقائي) -->
      <div class="fb-post-slot" id="fbPostSlot">
        <div class="fb-post loading">⏳ جاري تحميل آخر منشور من صفحة المركز على فيسبوك…</div>
      </div>
      <div class="aside-mini">
        <h4>⚡ روابط سريعة</h4>
        <div class="ql">${ql}</div>
      </div>
      <section class="leaders-card" aria-label="قيادات الدولة والقطاع الشبابي">
        <div class="leaders-heading">
          <span class="leaders-heading-icon">🇪🇬</span>
          <div><h3>قيادات الدولة والشباب</h3><p>قيادات وطنية وشبابية</p></div>
        </div>
        <div class="leaders-list">
          <article class="leader-item">
            <img src="assets/leaders/president.jpg" alt="عبد الفتاح السيسي" loading="lazy" decoding="async">
            <div class="leader-info"><h4>عبد الفتاح السيسي</h4><span>فخامة رئيس الجمهورية</span></div>
          </article>
          <article class="leader-item">
            <img src="assets/leaders/prime-minister.jpg" alt="الدكتور مصطفى مدبولي" loading="lazy" decoding="async">
            <div class="leader-info"><h4>الدكتور مصطفى مدبولي</h4><span>معالي رئيس مجلس الوزراء</span></div>
          </article>
          <article class="leader-item">
            <img src="assets/leaders/youth-minister.jpg" alt="الأستاذ نبيل جوهر" loading="lazy" decoding="async">
            <div class="leader-info"><h4>الأستاذ نبيل جوهر</h4><span>وزير الشباب والرياضة</span></div>
          </article>
          <article class="leader-item">
            <img src="assets/leaders/youth-director.jpg" alt="الأستاذ محمد حامد صقر" loading="lazy" decoding="async">
            <div class="leader-info"><h4>الأستاذ محمد حامد صقر</h4><span>مدير إدارة شباب المنزلة</span></div>
          </article>
        </div>
      </section>`;
  }

  // ===== LAST FACEBOOK POST (قسم آخر منشور على صفحة المركز — تحت الإحصائيات المالية) =====
  function fmtArDate(iso) {
    try { return new Date(iso).toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; }
  }
  function timeAgoAr(iso) {
    if (!iso) return "";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (isFinite(diff) && diff >= 0) {
      if (diff < 60) return "الآن مباشرة";
      if (diff < 3600) return "منذ " + Math.floor(diff / 60) + " دقيقة";
      if (diff < 86400) return "منذ " + Math.floor(diff / 3600) + (Math.floor(diff / 3600) <= 2 ? " ساعتين" : " ساعة");
      if (diff < 2592000) return "منذ " + Math.floor(diff / 86400) + (Math.floor(diff / 86400) === 1 ? " يوم" : Math.floor(diff / 86400) === 2 ? " يومين" : " أيام");
    }
    return fmtArDate(iso);
  }
  function renderFbPost(post, src) {
    const slot = $("#fbPostSlot");
    if (!slot) return;
    if (!post || (!post.message && !post.picture)) {
      // لم يُجلب منشور بعد — بطاقة دعوة لمتابعة الصفحة
      slot.innerHTML = `
        <div class="fb-post empty">
          <div class="fbp-head">
            <span class="fbp-logo">${SVG_FB}</span>
            <div class="fbp-meta">
              <div class="fbp-page">آخر منشورات فيسبوك</div>
              <div class="fbp-date">صفحة المركز الرسمية</div>
            </div>
          </div>
          <div class="fbp-body">تابع صفحة المركز على فيسبوك لمتابعة كل الأخبار والمنشورات أول بأول — آخر منشور سيظهر هنا تلقائياً.</div>
          <a class="fbp-link" href="${esc((D.meta && D.meta.fbLink) || "#")}" target="_blank" rel="noopener">${SVG_FB} متابعة صفحة المركز ↗</a>
        </div>`;
      return;
    }
    const link = post.url || (D.meta && D.meta.fbLink) || "#";
    slot.innerHTML = `
      <div class="fb-post">
        <div class="fbp-head">
          <span class="fbp-logo">${SVG_FB}</span>
          <div class="fbp-meta">
            <div class="fbp-page">مركز شباب الأحمدية <span class="fbp-verify" title="صفحة رسمية">✓</span></div>
            <div class="fbp-date">${post.created ? esc(timeAgoAr(post.created)) : "آخر منشور"}</div>
          </div>
          <span class="fbp-badge">📡 تلقائي</span>
        </div>
        ${post.picture ? `<img class="fbp-img" src="${esc(post.picture)}" alt="صورة المنشور من فيسبوك" loading="lazy" decoding="async" onerror="this.remove()">` : ""}
        ${post.message ? `<div class="fbp-body">${esc(post.message).replace(/\n/g, "<br>").replace(/#(\S+)/g, '<span class="fbp-hashtag">#$1</span>')}</div>` : ""}
        <a class="fbp-link" href="${esc(link)}" target="_blank" rel="noopener">عرض المنشور على فيسبوك ↗</a>
      </div>`;
  }
  function initFbPost() {
    const slot = $("#fbPostSlot");
    if (!slot) return;
    const savedCode = String((D.meta && D.meta.fbEmbedCode) || "").trim();
    if (savedCode) {
      // نقبل رابط إضافة فيسبوك الرسمي أو كود التضمين، وننشئ الإطار بأمان دون تنفيذ HTML الملصوق.
      const match = savedCode.match(/src\s*=\s*["']([^"']+)["']/i);
      const rawUrl = match ? match[1] : savedCode;
      let safeUrl = null;
      try {
        const candidate = new URL(rawUrl);
        if (candidate.protocol === "https:" &&
            (candidate.hostname === "www.facebook.com" || candidate.hostname === "facebook.com") &&
            candidate.pathname === "/plugins/post.php") {
          candidate.searchParams.set("width", "320");
          safeUrl = candidate.toString();
        }
      } catch (e) { /* رابط أو كود غير صالح */ }
      if (!safeUrl) {
        slot.innerHTML = '<div class="fb-post empty"><div class="fbp-body">كود تضمين فيسبوك غير صالح. راجع إعدادات الموقع في لوحة الإدارة.</div></div>';
        return;
      }
      slot.innerHTML = '<div class="fb-post"><div class="fbp-head"><span class="fbp-logo">' +
        SVG_FB + '</span><div class="fbp-meta"><div class="fbp-page">مركز شباب الأحمدية</div>' +
        '<div class="fbp-date">منشور من الصفحة الرسمية</div></div></div><div class="fb-embed-frame"></div></div>';
      const frame = document.createElement("iframe");
      frame.src = safeUrl;
      frame.title = "منشور مركز شباب الأحمدية على فيسبوك";
      frame.width = "100%";
      frame.height = "605";
      frame.style.cssText = "width:100%;max-width:100%;height:605px;border:0;overflow:hidden";
      frame.scrolling = "no";
      frame.setAttribute("allow", "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share");
      frame.setAttribute("allowfullscreen", "");
      frame.setAttribute("loading", "lazy");
      slot.querySelector(".fb-embed-frame").appendChild(frame);
      return;
    }
    if (!window.FBPost) return;
    window.FBPost.init(D, (post, src) => renderFbPost(post, src));
  }

  // ===== FOOTER =====
  function renderFooter() {
    const m = D.meta;
    const year = new Date().getFullYear();
    $("#contact").innerHTML = `
      <div class="wrap">
        <div class="fgrid">
          <div>
            <div class="fbrand">
              <img src="${esc(m.logo)}" alt="شعار المركز" class="logo">
              <div><h3>${esc(m.siteName)}</h3><span>${esc(m.tagline)}</span></div>
            </div>
            <p class="fdesc">صرح شبابي متكامل يخدم أبناء المنزلة بالدقهلية عبر أكاديميات رياضية متخصصة، وأنشطة دينية وثقافية وترفيهية، تحت إشراف مجلس إدارة منتخب. رسالتنا صناعة جيل متكامل بدنياً وذهنياً وروحياً.</p>
            <div class="fsoc">
              <a href="${esc(m.fbLink)}" target="_blank" rel="noopener" aria-label="صفحة المركز على فيسبوك">${SVG_FB}</a>
              ${m.messengerLink ? `<a href="${esc(m.messengerLink)}" target="_blank" rel="noopener" aria-label="مراسلة المركز على ماسنجر">${SVG_MSG}</a>` : ""}
            </div>
          </div>
          <div>
            <h4 class="ft">روابط سريعة</h4>
            <ul>
              <li><a href="#about">عن المركز</a></li>
              <li><a href="#board">مجلس الإدارة</a></li>
              <li><a href="#activities">النشاطات القادمة</a></li>
              <li><a href="#articles">مقالات</a></li>
              <li><a href="#join">الانضمام</a></li>
            </ul>
          </div>
          <div>
            <h4 class="ft">أكاديميات وخدمات</h4>
            <ul>
              <li><a href="football-academy/index.html">أكاديمية كرة القدم</a></li>
              <li><a href="karate-academy/index.html">أكاديمية الكاراتيه</a></li>
              <li><a href="pitch-booking/index.html">حجز الملعب الخماسي</a></li>
              <li><a href="admin.html">لوحة التحكم</a></li>
            </ul>
          </div>
          <div class="fcontact">
            <h4 class="ft">تواصل معنا</h4>
            <div class="ci"><span class="ci-ico">📍</span><a href="${esc(m.mapLink || "#")}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${esc(m.location)}</a></div>
            <div class="ci"><span class="ci-ico">📞</span><a href="tel:${esc(String(m.phone || "").replace(/[^\d+]/g, ""))}" style="color:inherit;text-decoration:none" dir="ltr">${esc(m.phone)}</a></div>
            <a class="messenger-contact-btn" href="${esc(m.messengerLink || "https://m.me/Markz.shabab.elahmadya")}" target="_blank" rel="noopener noreferrer" aria-label="التواصل المباشر مع مركز شباب الأحمدية عبر ماسنجر">${SVG_MSG}<span>راسلنا عبر ماسنجر</span><span class="messenger-btn-arrow" aria-hidden="true">←</span></a>
            
            <div class="ci"><span class="ci-ico">🕒</span><span>${esc(m.hours)}</span></div>
          </div>
        </div>
        <div class="fbot">
          <p>© ${year} ${esc(m.siteName)} — جميع الحقوق محفوظة.</p>
          <span class="dev">💻 برمجة وتطوير <a href="${esc(m.devLink || "#")}" id="devLink" target="_blank" rel="noopener">${esc(m.devName)}</a></span>
        </div>
      </div>`;
  }

  // ===== INTERACTIONS =====
  function initClock() {
    const e = $("#egClock"); const pad = n => n < 10 ? "0" + n : "" + n;
    function tick() {
      const d = new Date();
      const utc = d.getTime() + d.getTimezoneOffset() * 60000;
      const eg = new Date(utc + 2 * 3600000);
      let h = eg.getHours(); const ampm = h < 12 ? "ص" : "م";
      h = h % 12; if (h === 0) h = 12;
      e.textContent = pad(h) + ":" + pad(eg.getMinutes()) + ":" + pad(eg.getSeconds()) + " " + ampm;
    }
    tick(); setInterval(tick, 1000);
  }

  function initHeaderNav() {
    const hdr = $("#header"), nav = $("#nav"), mt = $("#menuToggle");
    window.addEventListener("scroll", () => {
      hdr.classList.toggle("scrolled", window.scrollY > 20);
      const bt = $("#backTop");
      bt.classList.toggle("show", window.scrollY > 400);
    }, { passive: true });
    mt.addEventListener("click", () => { nav.classList.toggle("open"); mt.textContent = nav.classList.contains("open") ? "✕" : "☰"; });
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); mt.textContent = "☰"; }));
    $("#backTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    const sections = ["about", "board", "academies", "articles", "activities", "gallery"];
    const links = {};
    nav.querySelectorAll('a[href^="#"]').forEach(a => { links[a.getAttribute("href").slice(1)] = a; });
    window.addEventListener("scroll", () => {
      let cur = "";
      sections.forEach(id => { const s = document.getElementById(id); if (s && s.getBoundingClientRect().top < 160) cur = id; });
      Object.keys(links).forEach(id => links[id].classList.toggle("active", id === cur));
    }, { passive: true });
  }

  function initReveal() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".reveal").forEach(e => io.observe(e));
  }

  function initCounters() {
    function animate(elm) {
      const target = +elm.getAttribute("data-count"); const suffix = elm.getAttribute("data-suffix") || ""; const dur = 1500; let start = null;
      function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / dur, 1); const eased = 1 - Math.pow(1 - p, 3);
        elm.textContent = fmtNum(Math.floor(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step); else elm.textContent = fmtNum(target) + suffix;
      }
      requestAnimationFrame(step);
    }
    if (!initCounters.io) {
      initCounters.io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { animate(e.target); initCounters.io.unobserve(e.target); } }), { threshold: 0.4 });
    }
    document.querySelectorAll("[data-count]").forEach(e => {
      if (!e.dataset.counted) { e.dataset.counted = "1"; initCounters.io.observe(e); }
    });
  }

  function initTilt() {
    if (window.matchMedia("(hover:none)").matches) return;
    document.querySelectorAll(".tilt").forEach(t => {
      if (t.dataset.tiltBound) return; t.dataset.tiltBound = "1";
      t.addEventListener("mousemove", e => {
        const r = t.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        t.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
      });
      t.addEventListener("mouseleave", () => { t.style.transform = ""; });
    });
  }

  function initHeroParallax() {
    if (window.matchMedia("(hover:none)").matches) return;
    const hero = document.querySelector(".hero");
    const bg = $("#heroBg"), content = $("#heroContent"), emblem = $("#heroEmblem");
    if (!hero) return;
    hero.addEventListener("mousemove", e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      bg.style.transform = `translateZ(-120px) scale(1.18) translate(${x * 30}px,${y * 30}px)`;
      content.style.transform = `translate(${x * -12}px,${y * -8}px)`;
      emblem.style.transform = `translate(${x * 18}px,${y * 12}px)`;
    });
    hero.addEventListener("mouseleave", () => {
      bg.style.transform = "translateZ(-120px) scale(1.18)";
      content.style.transform = ""; emblem.style.transform = "";
    });
  }

  // ===== PWA =====
  function initPWA() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(err => console.warn("SW reg failed:", err));
    }
    let deferredPrompt = null;
    const banner = $("#pwaBanner");
    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault(); deferredPrompt = e;
      if (!localStorage.getItem("pwa_dismissed")) banner.classList.add("show");
    });
    $("#pwaInstall").addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") banner.classList.remove("show");
        deferredPrompt = null;
      } else {
        banner.classList.remove("show");
        alert("لتثبيت التطبيق: من قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».");
      }
    });
    $("#pwaLater").addEventListener("click", () => { localStorage.setItem("pwa_dismissed", "1"); banner.classList.remove("show"); });
    window.addEventListener("appinstalled", () => banner.classList.remove("show"));
  }

  // ===== GALLERY LIGHTBOX =====
  function initLightbox() {
    const existing = document.getElementById("galleryLightbox");
    const lb = existing || document.createElement("div");
    if (!existing) lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-hidden", "true");
    if (!existing) {
      lb.innerHTML = `<button class="lb-close" aria-label="إغلاق">✕</button><img alt=""><div class="lb-cap"></div>`;
      document.body.appendChild(lb);
    }
    const lbImg = lb.querySelector("img"), lbCap = lb.querySelector(".lb-cap");
    function open(src, cap) {
      lbImg.src = src; lbCap.textContent = cap || "";
      lb.classList.add("show"); lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function close() {
      lb.classList.remove("show"); lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
    document.addEventListener("click", e => {
      const carouselSlide = e.target.closest(".gallery-carousel-slide");
      if (carouselSlide) {
        const image = carouselSlide.querySelector("img");
        if (image) open(image.src, carouselSlide.querySelector(".gallery-carousel-caption")?.textContent || image.alt || "");
        return;
      }
      const it = e.target.closest(".gitem");
      if (it) open(it.getAttribute("data-full"), it.querySelector("figcaption")?.textContent || "");
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && lb.classList.contains("show")) close();
      if ((e.key === "Enter" || e.key === " ") && document.activeElement?.classList.contains("gitem")) {
        e.preventDefault(); open(document.activeElement.getAttribute("data-full"), document.activeElement.querySelector("figcaption")?.textContent || "");
      }
    });
    lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb-close")) close(); });
  }

  function openGalleryLightbox(src, caption) {
    const lb = document.getElementById("galleryLightbox");
    if (!lb) return;
    const img = lb.querySelector("img");
    const cap = lb.querySelector(".lb-cap");
    if (img) img.src = src;
    if (cap) cap.textContent = caption || "";
    lb.classList.add("show");
    lb.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
  }

  // ===== BOTTOM NAV =====
  function initBottomNav() {
    const bn = document.querySelector(".bottom-nav");
    if (!bn) return;
    const links = bn.querySelectorAll("a");
    links.forEach(a => a.addEventListener("click", () => {
      links.forEach(x => x.classList.remove("active"));
      a.classList.add("active");
    }));
    const inPage = {};
    links.forEach(a => { const h = a.getAttribute("href"); if (h && h.startsWith("#")) inPage[h.slice(1)] = a; });
    const home = inPage["home"], contact = inPage["contact"];
    if (home || contact) {
      window.addEventListener("scroll", () => {
        const y = window.scrollY;
        const nearBottom = (window.innerHeight + y) >= document.body.scrollHeight - 140;
        links.forEach(x => x.classList.remove("active"));
        if (contact && nearBottom) contact.classList.add("active");
        else if (home) home.classList.add("active");
      }, { passive: true });
    }
  }

  // ===== TICKER: كمبيوتر = شريط متحرك عادي / هاتف = برق إخباري يصعد ويقف ويختفي =====
  function initTicker() {
    const t = document.querySelector(".ticker");
    const flash = $("#tFlash");
    if (!t || !flash) return;
    t.style.cursor = "pointer";
    const items = (D.news || []).map(n => ({ icon: n.icon || "📰", text: n.text || "" }));

    // كليك/تَب: إيقاف مؤقت (الشريط المتحرك على الكمبيوتر + البرق على الهاتف)
    let paused = false;
    t.addEventListener("click", () => {
      paused = !paused;
      t.classList.toggle("paused", paused);
      if (paused) flashRotator.pause(); else flashRotator.resume();
    });

    // الشريط المتحرك العادي يعمل على الكمبيوتر كما هو — لا شيء إضافي هنا

    /* ---- البرق الإخباري (هواتف ≤640px) ---- */
    const flashRotator = (function () {
      const HOLD = 3900, OUT = 520, RESUME = 1900;
      let idx = 0, cur = null, tHold = null, tNext = null;
      let running = false;
      let dotEls = [];
      if (items.length && items.length <= 8) {
        const dots = el("div", "f-live", items.map(() => "<i></i>").join(""));
        flash.appendChild(dots);
        dotEls = Array.from(dots.querySelectorAll("i"));
      }
      function show(i) {
        if (!items.length) return;
        idx = i % items.length;
        dotEls.forEach((d, k) => d.classList.toggle("on", k === idx));
        flash.querySelectorAll(".f-item").forEach(x => x.remove());
        cur = el("div", "f-item",
          `<span class="f-ico">${esc(items[idx].icon)}</span><span class="f-txt">${esc(items[idx].text)}</span>`);
        flash.appendChild(cur);
        void cur.offsetWidth; // فرض إعادة الحساب قبل الأنيميشن
        cur.classList.add("show");
        armHold(HOLD);
      }
      function endHold() {
        if (!running || paused || !cur) return;
        cur.classList.remove("show");
        cur.classList.add("hide");
        tNext = setTimeout(() => show(idx + 1), OUT);
      }
      function armHold(ms) { clearTimeout(tHold); tHold = setTimeout(endHold, ms); }
      return {
        start() {
          if (running || document.hidden || !items.length) return;
          running = true;
          show(idx);
        },
        stop() {
          running = false;
          clearTimeout(tHold); clearTimeout(tNext);
          if (cur) { cur.classList.remove("show"); cur.classList.add("hide"); }
          setTimeout(() => { if (!running) flash.querySelectorAll(".f-item").forEach(x => x.remove()); }, OUT);
        },
        pause() { clearTimeout(tHold); },
        resume() { if (running && !paused) armHold(RESUME); },
        restartAt() { if (running) show(idx); }
      };
    })();

    const mq = window.matchMedia("(max-width: 640px)");
    const onMq = e => { if (e.matches) flashRotator.start(); else flashRotator.stop(); };
    if (mq.addEventListener) mq.addEventListener("change", onMq); else mq.addListener(onMq);
    if (mq.matches) flashRotator.start();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flashRotator.pause();
      else if (!paused) flashRotator.restartAt();
    });
  }

  function renderContent() {
    renderTopBar(); renderBrand(); renderNews(); renderAnnouncement();
    renderBoard(); renderAcademies(); renderArticles(); renderActivities();
    renderGallery(); renderFinance(); renderFooter();
  }

  // ===== BOOT =====
  // نعرض المحتوى المحفوظ/الافتراضي فوراً ثم نحدّث من القاعدة في الخلفية —
  // الزائر لا ينتظر Firebase ليرى الصفحة.
  async function boot() {
    renderContent();
    initClock(); initHeaderNav(); initReveal(); initCounters(); initTilt(); initHeroParallax(); initPWA();
    initLightbox(); initBottomNav(); initTicker();
    // قسم آخر منشور على صفحة المركز على فيسبوك (تحت الإحصائيات المالية)
    initFbPost();
    document.dispatchEvent(new Event("app:ready"));
    startRealtime();
    try {
      await window.SiteData.syncFromCloud();
      const fresh = window.SiteData.load();
      if (JSON.stringify(fresh) !== JSON.stringify(D)) {
        D = fresh;
        renderContent();
        initReveal(); initCounters(); initTilt();
        initFbPost();
        document.querySelectorAll(".reveal:not(.in)").forEach(e => {
          const r = e.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) e.classList.add("in");
        });
      }
    } catch (error) {
      console.warn("[Youth Center] Shared database unavailable; showing cached content.", error);
    }
  }

  // ===== REALTIME: أي تعديل من لوحة الإدارة يصل لكل الزوار دون إعادة تحميل =====
  // نعيد رسم الأقسام المعتمدة على البيانات فقط (دون إعادة ربط مستمعي الأحداث الثابتة كالشريط والتنقل).
  function startRealtime() {
    if (!window.SiteData || typeof window.SiteData.subscribe !== "function") return;
    let first = true, unsub = null;
    const apply = data => {
      // أول نداء يعيد حالة محملة بالفعل؛ نتجاهله إن لم يتغير شيء
      if (first) { first = false; if (JSON.stringify(data) === JSON.stringify(D)) return; }
      D = data;
      const safe = fn => { try { fn(); } catch (e) { console.warn("[Youth Center] realtime render failed:", fn.name, e); } };
      [renderTopBar, renderBrand, renderNews, renderAnnouncement, renderBoard, renderAcademies,
       renderArticles, renderActivities, renderFinance, renderFooter].forEach(safe);
      safe(initReveal); safe(initCounters); safe(initTilt);
      // عناصر .reveal المُعاد رسمها يجب ألا تبقى مخفية إن كانت داخل الشاشة
      document.querySelectorAll(".reveal:not(.in)").forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) e.classList.add("in");
      });
      document.dispatchEvent(new CustomEvent("app:data-updated", { detail: data }));
    };
    const connect = () => { try { unsub = window.SiteData.subscribe(apply); } catch (e) { console.warn("[Youth Center] realtime unavailable:", e); } };
    connect();
    // إلغاء الاشتراكات عند مغادرة الصفحة (تجنب تسرب الذاكرة)
    window.addEventListener("pagehide", () => { if (unsub) { unsub(); unsub = null; } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
