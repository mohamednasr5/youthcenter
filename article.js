/* article.js — صفحة المقال الخاصة بكل مقال عبر ?id= */
(function () {
  "use strict";
  const D = window.SiteData.load();
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
    const bodyHtml = (a.body || []).map(p => `<p>${esc(p)}</p>`).join("");
    const shareUrl = encodeURIComponent(location.href);
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
        <div class="article-share">
          <span class="slbl">شارك المقال:</span>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener" aria-label="مشاركة على فيسبوك">${SVG_FB}</a>
        </div>
        <div class="article-divider"></div>
        <p style="text-align:center;color:var(--txt-mute);font-size:.9rem">للمزيد من المقالات والأنشطة تابع منصة مركز شباب الأحمدية. وللانضمام لأكاديميات المركز أو حجز الملعب الخماسي، تواصل معنا عبر الأرقام الموضحة أسفل الصفحة.</p>
      </article>`;
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
            <div class="ci"><span class="ci-ico">✉️</span><span>${esc(m.email)}</span></div>
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

  function boot() {
    renderShell(); renderClock(); renderFooter(); initUI();
    if (article) { renderArticle(article); renderRelated(article); }
    else renderNotFound();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
