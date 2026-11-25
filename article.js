/* article.js — صفحة المقال الخاصة بكل مقال عبر ?id= */
(function () {
  "use strict";
  let D = window.SiteData.load();
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SVG_MSG = '<svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.14 2 11.25c0 2.92 1.44 5.53 3.69 7.23V22l3.4-1.87c.9.25 1.87.39 2.91.39 5.5 0 10-4.14 10-9.25S17.5 2 12 2zm.93 12.4l-2.55-2.72-4.98 2.72L10.88 9l2.55 2.72 4.98-2.72L12.93 14.4z"/></svg>';
  const SVG_FB = '<svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 10-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7A10 10 0 0022 12z"/></svg>';

  const params = new URLSearchParams(location.search);
  const id = parseInt(params.get("id"), 10);
  const article = (D.articles || []).find(a => a.id === id);

  function renderShell() {
    $("#topLocation").innerHTML = "📍 " + esc(D.meta.location);
    $("#topSocial").innerHTML = D.meta.fbLink
      ? `<a href="${esc(D.meta.fbLink)}" class="soc" aria-label="صفحة المركز على فيسبوك" target="_blank" rel="noopener">${SVG_FB}</a>`
      : "";
    $("#brandLogo").src = D.meta.logo;
    $("#brandName").textContent = D.meta.siteName;
    $("#brandTagline").textContent = D.meta.tagline;
  }

  function renderClock() {
    const e = $("#egClock"); const pad = n => n < 10 ? "0" + n : "" + n;
    function tick() {
      const d = new Date(); const utc = d.getTime() + d.getTimezoneOffset() * 60000;
      const eg = new Date(utc + 2 * 3600000);
      let h = eg.getHours(); const ampm = h < 12 ? "ص" : "م"; h = h % 12; if (h === 0) h = 12;
      e.textContent = pad(h) + ":" + pad(eg.getMinutes()) + ":" + pad(eg.getSeconds()) + " " + ampm;
    }
    tick(); setInterval(tick, 1000);
  }

  function renderNotFound() {
    document.title = "المقال غير موجود | مركز شباب الأحمدية";
    $("#articleSlot").innerHTML = `<div class="article-notfound card">
      <div class="big">🔍</div>
      <h2>المقال غير موجود</h2>
      <p>عذراً، لم نعثر على هذا المقال. ربما تم حذفه أو الرابط غير صحيح.</p>
      <a href="index.html#articles" class="btn btn-gold">← العودة للمقالات</a>
    </div>`;
  }

  function renderArticle(a) {
    document.title = a.title + " | مركز شباب الأحمدية";
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute("content", a.excerpt || a.title);
    /* SEO ديناميكي: OG/Twitter/canonical + بيانات منظمة Article لكل مقال */
    const articleUrl = new URL(location.href);
    articleUrl.hash = "";
    const pageUrl = articleUrl.href;
    const setMeta = (sel, attr, val) => { const el = document.head.querySelector(sel); if (el && val) el.setAttribute(attr, val); };
    setMeta('meta[property="og:title"]', "content", a.title + " | مركز شباب الأحمدية");
    setMeta('meta[property="og:description"]', "content", a.excerpt || a.title);
    setMeta('meta[property="og:url"]', "content", pageUrl);
    setMeta('meta[name="twitter:title"]', "content", a.title + " | مركز شباب الأحمدية");
    setMeta('meta[name="twitter:description"]', "content", a.excerpt || a.title);
    setMeta('link[rel="canonical"]', "href", pageUrl);
    const oldLd = document.getElementById("articleJsonLd");
    if (oldLd) oldLd.remove();
    const ld = document.createElement("script");
    ld.id = "articleJsonLd";
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": a.title,
      "description": a.excerpt || "",
      "inLanguage": "ar-EG",
      "mainEntityOfPage": pageUrl,
      "image": "https://mohamednasr5.github.io/youthcenter/assets/og-image.jpg",
      "author": { "@type": "Organization", "name": "مركز شباب الأحمدية", "url": "https://mohamednasr5.github.io/youthcenter/" },
      "publisher": { "@type": "Organization", "name": "مركز شباب الأحمدية", "logo": { "@type": "ImageObject", "url": "https://mohamednasr5.github.io/youthcenter/assets/logo.png" } }
    });
    document.head.appendChild(ld);
    const bodyHtml = (a.body || []).map(p => `<p>${esc(p)}</p>`).join("");
    const shareUrl = pageUrl;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(a.title + " — مركز شباب الأحمدية");
    const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&format=png&data=" + encodedUrl;
    const shareItems = [
      { name: "فيسبوك", cls: "facebook", url: "https://www.facebook.com/sharer/sharer.php?u=" + encodedUrl, icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H8.1V12h2.34v-2.2c0-2.31 1.38-3.59 3.49-3.59 1.01 0 2.06.18 2.06.18v2.27h-1.16c-1.14 0-1.5.71-1.5 1.44V12h2.55l-.41 2.89h-2.14v6.99A10 10 0 0 0 22 12z"/></svg>' },
      { name: "واتساب", cls: "whatsapp", url: "https://wa.me/?text=" + encodedText + "%20" + encodedUrl, icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 2 17.7L.5 23.5l6-1.6A11.8 11.8 0 1 0 20.5 3.5ZM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.4A9 9 0 1 1 12 21Zm5-6.7c-.3-.2-1.7-.9-2-.9s-.5-.2-.7.2-.8.9-1 1.1-.4.2-.7.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.4.3-.6s0-.4 0-.6l-.9-2.1c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.2 1.4 3.4c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.5 1.9.6.8.2 1.5.2 2.1.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4s-.2-.2-.5-.4Z"/></svg>' },
      { name: "تيليجرام", cls: "telegram", url: "https://t.me/share/url?url=" + encodedUrl + "&text=" + encodedText, icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.8 4.2-3.3 15.6c-.2 1.1-.8 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-4.8 8.8-8c.4-.4-.1-.6-.6-.2L6.5 13.7 1.9 12.3c-1-.3-1-1 .2-1.5L20 3.9c.9-.3 1.9.2 1.8.3Z"/></svg>' },
      { name: "منصة X", cls: "x", url: "https://twitter.com/intent/tweet?url=" + encodedUrl + "&text=" + encodedText, icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.3-8.4L1.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z"/></svg>' },
      { name: "لينكدإن", cls: "linkedin", url: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodedUrl, icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 2H3.55C2.7 2 2 2.67 2 3.5v17c0 .83.7 1.5 1.55 1.5h16.9c.86 0 1.55-.67 1.55-1.5v-17c0-.83-.69-1.5-1.55-1.5ZM8 19H5V9h3v10ZM6.5 7.7a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5ZM19 19h-3v-5.2c0-3.1-4-2.9-4 0V19H9V9h3v1.6c1.4-2.6 7-2.8 7 2.5V19Z"/></svg>' },
      { name: "ريدت", cls: "reddit", url: "https://www.reddit.com/submit?url=" + encodedUrl + "&title=" + encodedText, icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12a3 3 0 0 0-5.1-2.1 14.5 14.5 0 0 0-6-1.9l1-4.7 3.3.7a2 2 0 1 0 .2-1.1l-4-.9a.6.6 0 0 0-.7.5l-1.2 5.4a14.6 14.6 0 0 0-6.3 2A3 3 0 1 0 2 14.2c0 3.7 4.5 6.8 10 6.8s10-3.1 10-6.8c0-.4-.1-.8-.2-1.2A3 3 0 0 0 24 12ZM7 14a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9.2 4.1a6.4 6.4 0 0 1-8.4 0 .6.6 0 0 1 .8-.8 5.2 5.2 0 0 0 6.8 0 .6.6 0 0 1 .8.8ZM17 14a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>' },
      { name: "البريد الإلكتروني", cls: "email", url: "mailto:?subject=" + encodedText + "&body=" + encodedUrl, icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-.4 4.2-7 4.7a1 1 0 0 1-1.2 0l-7-4.7a1 1 0 1 1 1.2-1.6l6.4 4.3 6.4-4.3a1 1 0 0 1 1.2 1.6Z"/></svg>' }
    ];
    const shareLinks = shareItems.map(item => `<a class="share-action ${item.cls}" href="${item.url}" target="_blank" rel="noopener noreferrer" aria-label="مشاركة المقال عبر ${item.name}" title="${item.name}">${item.icon}<span>${item.name}</span></a>`).join("");
    $("#articleSlot").innerHTML = `
      <article class="article-hero">
        <a href="index.html#articles" class="article-back">→ رجوع لكل المقالات</a>
        <span class="article-cat"><span class="aico">${esc(a.icon || "📰")}</span> ${esc(a.category || "")}</span>
        <h1>${esc(a.title)}</h1>
        <div class="article-meta">
          <span class="read">⏱️ ${esc(a.readTime || "")}</span>
          <span>✍️ مكتب المركز الإعلامي</span>
          <span>🗓️ ${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </article>
      <div class="article-body">
        ${bodyHtml}
        <section class="article-share-panel" aria-label="مشاركة المقال">
          <div class="share-panel-heading"><span class="share-heading-icon">↗</span><div><strong>شارك المقال</strong><small>انشر المعرفة مع أصدقائك عبر منصات التواصل</small></div></div>
          <div class="article-share">
            ${shareLinks}
            <button type="button" class="share-action share-copy" id="copyArticleLink" aria-label="نسخ رابط المقال"><span class="share-action-icon">⧉</span><span>نسخ الرابط</span></button>
            <button type="button" class="share-action share-qr" id="openArticleQR" aria-label="عرض رمز QR للمقال"><span class="share-action-icon">▦</span><span>رمز QR</span></button>
            <button type="button" class="share-action share-native" id="nativeArticleShare" aria-label="مشاركة المقال من جهازك" style="display:none"><span class="share-action-icon">↗</span><span>مشاركة أخرى</span></button>
          </div>
          <div class="share-feedback" id="shareFeedback" role="status" aria-live="polite"></div>
        </section>
        <div class="article-divider"></div>
        <p style="text-align:center;color:var(--txt-mute);font-size:.9rem">للمزيد من المقالات والأنشطة تابع منصة مركز شباب الأحمدية. وللانضمام لأكاديميات المركز أو حجز الملعب الخماسي، تواصل معنا عبر الأرقام الموضحة أسفل الصفحة.</p>
      </div>
      <div class="article-qr-modal" id="articleQRModal" aria-hidden="true">
        <div class="article-qr-backdrop" data-close-qr></div>
        <section class="article-qr-dialog" role="dialog" aria-modal="true" aria-labelledby="articleQRTitle">
          <button type="button" class="article-qr-close" data-close-qr aria-label="إغلاق">×</button>
          <span class="qr-mark">▦</span>
          <h3 id="articleQRTitle">امسح الرمز لفتح المقال</h3>
          <p>وجّه كاميرا هاتفك إلى رمز QR للوصول المباشر إلى هذا المقال.</p>
          <div class="article-qr-image-wrap"><img src="${qrUrl}" alt="رمز QR لفتح مقال: ${esc(a.title)}" loading="lazy"></div>
          <div class="article-qr-title">${esc(a.title)}</div>
          <a class="btn btn-gold article-qr-download" href="${qrUrl}" target="_blank" rel="noopener" download="article-qr.png">فتح صورة رمز QR</a>
          <button type="button" class="article-qr-copy" id="copyQRLink">نسخ رابط المقال</button>
        </section>
      </div>`;

    const feedback = $("#shareFeedback");
    const copyLink = async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(shareUrl);
        else {
          const field = document.createElement("textarea");
          field.value = shareUrl; field.style.position = "fixed"; field.style.opacity = "0";
          document.body.appendChild(field); field.select();
          const copied = document.execCommand("copy"); field.remove();
          if (!copied) throw new Error("copy unavailable");
        }
        feedback.textContent = "تم نسخ رابط المقال بنجاح";
      } catch (error) {
        feedback.textContent = "تعذر النسخ تلقائيًا. انسخ الرابط من شريط العنوان.";
      }
    };
    $("#copyArticleLink").addEventListener("click", copyLink);
    $("#copyQRLink").addEventListener("click", copyLink);
    const modal = $("#articleQRModal");
    const closeQR = () => { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); };
    $("#openArticleQR").addEventListener("click", () => { modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); });
    modal.querySelectorAll("[data-close-qr]").forEach(el => el.addEventListener("click", closeQR));
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeQR(); });
    const nativeButton = $("#nativeArticleShare");
    if (navigator.share) {
      nativeButton.style.display = "inline-flex";
      nativeButton.addEventListener("click", async () => {
        try { await navigator.share({ title: a.title, text: a.excerpt || a.title, url: shareUrl }); }
        catch (error) { if (error && error.name !== "AbortError") feedback.textContent = "تعذرت المشاركة من الجهاز."; }
      });
    }
  }

  function renderRelated(current) {
    const related = (D.articles || []).filter(a => a.id !== current.id).slice(0, 3);
    if (!related.length) return;
    $("#relTitle").style.display = "flex";
    $("#relatedGrid").innerHTML = related.map(a => `
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

  function renderFooter() {
    const m = D.meta; const year = new Date().getFullYear();
    $("#contact").innerHTML = `
      <div class="wrap">
        <div class="fgrid">
          <div>
            <div class="fbrand"><img src="${esc(m.logo)}" alt="شعار المركز" class="logo">
              <div><h3>${esc(m.siteName)}</h3><span>${esc(m.tagline)}</span></div></div>
            <p class="fdesc">صرح شبابي متكامل يخدم أبناء المنزلة بالدقهلية عبر أكاديميات رياضية متخصصة، وأنشطة دينية وثقافية وترفيهية، تحت إشراف مجلس إدارة منتخب.</p>
            <div class="fsoc">
              <a href="${esc(m.fbLink)}" target="_blank" rel="noopener" aria-label="صفحة المركز على فيسبوك">${SVG_FB}</a>
              ${m.messengerLink ? `<a href="${esc(m.messengerLink)}" target="_blank" rel="noopener" aria-label="مراسلة المركز على ماسنجر">${SVG_MSG}</a>` : ""}
            </div>
          </div>
          <div><h4 class="ft">روابط سريعة</h4><ul>
            <li><a href="index.html#about">عن المركز</a></li>
            <li><a href="index.html#board">مجلس الإدارة</a></li>
            <li><a href="index.html#activities">النشاطات القادمة</a></li>
            <li><a href="index.html#articles">مقالات</a></li>
          </ul></div>
          <div><h4 class="ft">أكاديميات وخدمات</h4><ul>
            <li><a href="football-academy/index.html">أكاديمية كرة القدم</a></li>
            <li><a href="karate-academy/index.html">أكاديمية الكاراتيه</a></li>
            <li><a href="pitch-booking/index.html">حجز الملعب الخماسي</a></li>
            <li><a href="admin.html">لوحة التحكم</a></li>
          </ul></div>
          <div class="fcontact"><h4 class="ft">تواصل معنا</h4>
            <div class="ci"><span class="ci-ico">📍</span><span>${esc(m.location)}</span></div>
            <div class="ci"><span class="ci-ico">📞</span><a href="tel:${esc(String(m.phone || "").replace(/[^\d+]/g, ""))}" style="color:inherit;text-decoration:none" dir="ltr">${esc(m.phone)}</a></div>
            ${m.email ? `<div class="ci"><span class="ci-ico">✉️</span><span>${esc(m.email)}</span></div>` : ""}
            ${m.messengerLink ? `<div class="ci"><span class="ci-ico">💬</span><a href="${esc(m.messengerLink)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">تواصل معنا عبر ماسنجر</a></div>` : ""}
            <div class="ci"><span class="ci-ico">🕒</span><span>${esc(m.hours)}</span></div>
          </div>
        </div>
        <div class="fbot">
          <p>© ${year} ${esc(m.siteName)} — جميع الحقوق محفوظة.</p>
          <span class="dev">💻 برمجة وتطوير <a href="${esc(m.devLink || "#")}" target="_blank" rel="noopener">${esc(m.devName)}</a></span>
        </div>
      </div>`;
  }

  function initUI() {
    const hdr = $("#header"), nav = $("#nav"), mt = $("#menuToggle");
    window.addEventListener("scroll", () => {
      hdr.classList.toggle("scrolled", window.scrollY > 20);
      $("#backTop").classList.toggle("show", window.scrollY > 400);
    }, { passive: true });
    mt.addEventListener("click", () => { nav.classList.toggle("open"); mt.textContent = nav.classList.contains("open") ? "✕" : "☰"; });
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); mt.textContent = "☰"; }));
    $("#backTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  async function boot() {
    try {
      await window.SiteData.syncFromCloud();
      D = window.SiteData.load();
    } catch (error) {
      console.warn("[Youth Center] Shared database unavailable; showing cached article content.", error);
    }
    const currentArticle = (D.articles || []).find(a => a.id === id);
    renderShell(); renderClock(); renderFooter(); initUI();
    if (currentArticle) { renderArticle(currentArticle); renderRelated(currentArticle); }
    else renderNotFound();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
