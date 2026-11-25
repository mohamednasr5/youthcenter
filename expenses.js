/* expenses.js — قسم الشفافية المالية "أين ذهب كل جنيه؟"
   - بطاقات: إجمالي التبرعات / المصروفات / الرصيد المتبقي / عدد الطوبات
   - رسم بياني دائري للمصروفات حسب البند + رسم أعمدة شهري (Canvas مرسوم يدويًا)
   - تفاصيل كل مصروف: الوصف والمبلغ والتاريخ والمعتمِد
   - صور الفواتير وصور الأعمال المنفذة مع عارض مكبّر
   كل البيانات تُقرأ مباشرة من Realtime Database */

import { egp, fmtDate, TIERS } from './firebase-config.js';
import { escapeHtml } from './donors.js';

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const PALETTE = ['#f59e0b','#10b981','#38bdf8','#a855f7','#f43f5e','#eab308','#14b8a6','#fb923c','#818cf8','#4ade80','#f87171','#facc15'];

export class TransparencySection {
  constructor(container, opts = {}) {
    this.el = container;
    this.tiers = opts.tiers || TIERS;
    this.summary = null;
    this.expenses = [];
    this._lightbox = null;
    this._render();
  }

  setTiers(list) { this.tiers = list || TIERS; }

  _render() {
    this.el.innerHTML = `
      <div class="cw-tr-head">
        <div class="shead">
          <div class="sico">🔍</div>
          <div>
            <div class="kicker">TRANSPARENCY</div>
            <h2>أين ذهب كل جنيه؟</h2>
            <div class="sub">شفافية كاملة في كل مساهمة وكل مصروف — بالأرقام والمستندات</div>
          </div>
        </div>
      </div>
      <div class="cw-tr-cards" id="cwTrCards"></div>
      <div class="cw-tr-charts">
        <div class="cw-tr-chart-card">
          <h3>المصروفات حسب البند</h3>
          <div class="cw-donut-wrap"><canvas id="cwDonut" width="360" height="260"></canvas></div>
          <div class="cw-legend" id="cwDonutLegend"></div>
        </div>
        <div class="cw-tr-chart-card">
          <h3>المصروفات الشهرية (آخر 12 شهرًا)</h3>
          <div class="cw-bars-wrap"><canvas id="cwBars" width="520" height="260"></canvas></div>
        </div>
      </div>
      <div class="cw-tr-flow">
        <h3>ميزان الخير</h3>
        <div class="cw-flow-track" id="cwFlowTrack"></div>
      </div>
      <div class="cw-tr-list-head"><h3>تفاصيل المصروفات (${this.expenses.length})</h3></div>
      <div class="cw-expense-list" id="cwExpenseList"></div>`;
    this.cardsEl = this.el.querySelector('#cwTrCards');
    this.donutEl = this.el.querySelector('#cwDonut');
    this.barsEl = this.el.querySelector('#cwBars');
    this.legendEl = this.el.querySelector('#cwDonutLegend');
    this.flowEl = this.el.querySelector('#cwFlowTrack');
    this.listEl = this.el.querySelector('#cwExpenseList');
    this.listHeadEl = this.el.querySelector('.cw-tr-list-head h3');
    this.renderCards();
    this.renderList();
  }

  /* ─── الملخص والإحصائيات ─── */
  setSummary(s) {
    this.summary = s || {};
    this.renderCards();
    this.renderFlow();
  }

  setExpenses(list) {
    this.expenses = Array.isArray(list) ? list : [];
    this.renderList();
    this.renderCharts();
  }

  renderCards() {
    const s = this.summary || {};
    const totalIn = Number(s.totalCashDonations ?? s.totalApprovedDonations) || 0;
    const inKind = Number(s.totalInKindContributions) || 0;
    const totalValue = Number(s.totalContributionValue ?? s.totalApprovedDonations) || 0;
    const totalOut = Number(s.totalExpenses) || 0;
    const balance = totalIn - totalOut;
    const cards = [
      { cls: 'in', icon: '💰', label: 'النقد المحصّل فعليًا', value: egp(totalIn) },
      { cls: 'bricks', icon: '🤝', label: 'القيمة التقديرية للمساهمات العينية', value: egp(inKind) },
      { cls: 'in', icon: '🌟', label: 'إجمالي قيمة الخير', value: egp(totalValue) },
      { cls: 'out', icon: '🧾', label: 'إجمالي المصروفات', value: egp(totalOut) },
      { cls: balance >= 0 ? 'bal' : 'neg', icon: balance >= 0 ? '🏦' : '⚠️', label: 'الرصيد المتبقي', value: egp(balance) },
      { cls: 'bricks', icon: '🧱', label: 'عدد طوبات الخير', value: String(Number(s.brickCount) || 0) }
    ];
    this.cardsEl.innerHTML = cards.map(c => `
      <div class="cw-tr-card ${c.cls}">
        <div class="cw-tr-ico">${c.icon}</div>
        <div class="cw-tr-val">${c.value}</div>
        <div class="cw-tr-lbl">${c.label}</div>
      </div>`).join('');
  }

  renderFlow() {
    const s = this.summary || {};
    const totalIn = Number(s.totalCashDonations ?? s.totalApprovedDonations) || 0;
    const totalOut = Number(s.totalExpenses) || 0;
    const pct = totalIn > 0 ? Math.min(100, (totalOut / totalIn) * 100) : 0;
    this.flowEl.innerHTML = `
      <div class="cw-flow-row">
        <span class="cw-flow-lbl">مصروف من النقد المحصّل</span>
        <span class="cw-flow-pct">${pct.toFixed(1)}%</span>
      </div>
      <div class="cw-flow-bar">
        <div class="cw-flow-fill" style="width:${pct}%"></div>
        <div class="cw-flow-ghost" style="width:${Math.max(0, 100 - pct)}%"></div>
      </div>
      <div class="cw-flow-caps">
        <span>وُظّف ${egp(totalOut)}</span>
        <span>متبقٍ ${egp(Math.max(0, totalIn - totalOut))}</span>
      </div>`;
  }

  /* ─── قائمة المصروفات بالفواتير والصور ─── */
  renderList() {
    this.listHeadEl.textContent = `تفاصيل المصروفات (${this.expenses.length})`;
    if (!this.expenses.length) {
      this.listEl.innerHTML = `<div class="cw-empty">لا توجد مصروفات مسجّلة بعد.<br>كل مصروف سيُنشر هنا بفواتيره وصور تنفيذه.</div>`;
      return;
    }
    this.listEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    this.expenses.forEach(x => {
      const images = [];
      if (x.receiptUrl) images.push({ url: x.receiptUrl, cap: 'الفاتورة' });
      (x.images || []).forEach(u => images.push({ url: u, cap: 'صورة العمل' }));
      const card = document.createElement('article');
      card.className = 'cw-expense-card';
      card.innerHTML = `
        <div class="cw-ex-main">
          <div class="cw-ex-title">${escapeHtml(x.title || 'مصروف')}</div>
          ${x.description ? `<div class="cw-ex-desc">${escapeHtml(x.description)}</div>` : ''}
          <div class="cw-ex-meta">
            <span>📅 ${escapeHtml(fmtDate(x.date))}</span>
            ${x.category ? `<span>🏷️ ${escapeHtml(x.category)}</span>` : ''}
            ${x.approvedBy ? `<span>✍️ اعتمده: ${escapeHtml(x.approvedBy)}</span>` : ''}
          </div>
        </div>
        <div class="cw-ex-side">
          <div class="cw-ex-amount">${escapeHtml(egp(x.amount))}</div>
          ${images.length ? `<div class="cw-ex-thumbs">${images.slice(0, 6).map((im, i) =>
            `<button type="button" class="cw-ex-thumb" data-url="${escapeAttr(im.url)}" data-cap="${escapeAttr(im.cap)}" aria-label="${escapeAttr(im.cap)}">
               <img src="${escapeAttr(im.url)}" alt="${escapeAttr(im.cap)}" loading="lazy">
             </button>`).join('')}</div>` : ''}
        </div>`;
      card.querySelectorAll('.cw-ex-thumb').forEach(b =>
        b.addEventListener('click', () => this._showLightbox(b.dataset.url, b.dataset.cap)));
      frag.appendChild(card);
    });
    this.listEl.appendChild(frag);
  }

  _showLightbox(url, cap) {
    this._closeLightbox();
    const lb = document.createElement('div');
    lb.className = 'cw-lightbox';
    lb.innerHTML = `
      <button class="cw-lb-close" type="button" aria-label="إغلاق">✕</button>
      <figure>
        <img src="${escapeAttr(url)}" alt="${escapeAttr(cap)}">
        <figcaption>${escapeHtml(cap)}</figcaption>
      </figure>`;
    lb.addEventListener('click', e => { if (e.target === lb) this._closeLightbox(); });
    lb.querySelector('.cw-lb-close').addEventListener('click', () => this._closeLightbox());
    document.body.appendChild(lb);
    this._lightbox = lb;
  }

  _closeLightbox() {
    if (this._lightbox) { this._lightbox.remove(); this._lightbox = null; }
  }

  /* ─── الرسوم البيانية (Canvas يدويًا بدعم RTL) ─── */
  renderCharts() {
    this._donut();
    this._bars();
  }

  _groupCategory() {
    const map = new Map();
    this.expenses.forEach(x => {
      const key = x.category || 'غير مصنف';
      map.set(key, (map.get(key) || 0) + (Number(x.amount) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }

  _donut() {
    const cv = this.donutEl, ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 360, H = 260;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';

    const data = this._groupCategory();
    const total = data.reduce((s, [, v]) => s + v, 0);
    const cx = W / 2, cy = H / 2, R = 92, r = 56;

    if (!total) {
      ctx.fillStyle = '#7d879c';
      ctx.font = '700 15px Cairo, sans-serif';
      ctx.fillText('لا مصروفات بعد', cx, cy);
      this.legendEl.innerHTML = '';
      return;
    }

    let a0 = -Math.PI / 2;
    data.forEach(([key, val], i) => {
      const a1 = a0 + (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1);
      ctx.arc(cx, cy, r, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fill();
      a0 = a1;
    });
    ctx.fillStyle = '#fff';
    ctx.font = '800 20px Cairo, sans-serif';
    ctx.fillText(egp(total), cx, cy - 4);
    ctx.fillStyle = '#b9c2d6';
    ctx.font = '600 12px Cairo, sans-serif';
    ctx.fillText('إجمالي المصروفات', cx, cy + 18);

    this.legendEl.innerHTML = data.map(([key, val], i) => `
      <span class="cw-lg-item">
        <i style="background:${PALETTE[i % PALETTE.length]}"></i>
        ${escapeHtml(key)} <b>${((val / total) * 100).toFixed(0)}%</b>
      </span>`).join('');
  }

  _bars() {
    const cv = this.barsEl, ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 520, H = 260;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = '100%'; cv.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    ctx.direction = 'rtl';

    /* تجميع آخر 12 شهرًا */
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth(), total: 0 });
    }
    const ts = x => (x && x.toDate) ? x.toDate() : new Date(x);
    this.expenses.forEach(x => {
      const d = ts(x.date);
      const slot = months.find(s => s.y === d.getFullYear() && s.m === d.getMonth());
      if (slot) slot.total += Number(x.amount) || 0;
    });

    const pad = { top: 18, right: 14, bottom: 34, left: 58 };
    const iw = W - pad.left - pad.right;
    const ih = H - pad.top - pad.bottom;
    const max = Math.max(1000, ...months.map(m => m.total));
    const bw = Math.min(30, iw / 12 - 8);

    /* خطوط الشبكة */
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.fillStyle = '#7d879c';
    ctx.font = '600 11px Cairo, sans-serif';
    ctx.textAlign = 'left';
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + ih - (ih * g) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.fillText(shortNum(max * g / 4), 6, y + 4);
    }

    /* الأعمدة — من اليمين (الأحدث) إلى اليسار مثل RTL */
    months.forEach((m, i) => {
      const col = 11 - i; /* أحدث شهر يمينًا */
      const cx = pad.left + (col + 0.5) * (iw / 12);
      const h = (m.total / max) * ih;
      const grad = ctx.createLinearGradient(0, pad.top + ih - h, 0, pad.top + ih);
      grad.addColorStop(0, '#fbbf24');
      grad.addColorStop(1, '#b45309');
      ctx.fillStyle = m.total ? grad : 'rgba(255,255,255,.06)';
      ctx.fillRect(cx - bw / 2, pad.top + ih - Math.max(h, 3), bw, Math.max(h, 3));
      if (i % 2 === 0 || months.length <= 6) {
        ctx.fillStyle = '#7d879c';
        ctx.textAlign = 'center';
        ctx.fillText(AR_MONTHS[m.m], cx, H - 12);
      }
    });
  }
}

function shortNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'م';
  if (n >= 1000) return Math.round(n / 1000) + 'ألف';
  return String(Math.round(n));
}

function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
