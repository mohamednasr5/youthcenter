/* donors.js — "يد الخير": زر عائم يفتح قائمة جانبية بجميع المتبرعين
   - الأسماء والمبالغ ونوع الطوبة وتاريخ التبرع
   - بحث فوري وفلترة حسب فئة الطوبة وترتيب
   - الضغط على متبرع → الكاميرا تطير نحو طوبته في الحائط */

import { TIERS, tierById, egp, fmtDate } from './firebase-config.js';

export class HandOfGood {
  constructor(opts = {}) {
    this.tiers = opts.tiers || TIERS;
    this.onDonorClick = opts.onDonorClick || (() => {});
    this.donors = [];
    this.filterTier = 'all';
    this.search = '';
    this.sortBy = 'amount';
    this._build();
  }

  _build() {
    /* الزر العائم (يد الخير) — يظهر جزئيًا بجانب الشاشة */
    this.btn = document.createElement('button');
    this.btn.className = 'cw-hand-btn';
    this.btn.type = 'button';
    this.btn.title = 'يد الخير — قائمة المتبرعين';
    this.btn.setAttribute('aria-label', 'يد الخير — قائمة المتبرعين');
    this.btn.innerHTML = `
      <svg viewBox="0 0 64 64" width="30" height="30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 34V16a4 4 0 0 1 8 0v14"/>
        <path d="M28 28V12a4 4 0 0 1 8 0v16"/>
        <path d="M36 28V16a4 4 0 0 1 8 0v18"/>
        <path d="M44 32l6-6a4 4 0 0 1 6 6l-14 16a12 12 0 0 1-9 4H28a12 12 0 0 1-12-12v-8a4 4 0 0 1 4-4"/>
      </svg>
      <span class="cw-hand-badge" id="cwDonorCount">0</span>`;
    document.body.appendChild(this.btn);

    /* اللوحة الجانبية */
    this.panel = document.createElement('aside');
    this.panel.className = 'cw-hand-panel';
    this.panel.setAttribute('aria-hidden', 'true');
    this.panel.dir = 'rtl';
    this.panel.innerHTML = `
      <div class="cw-hand-head">
        <div>
          <div class="cw-hand-title">🤝 يد الخير</div>
          <div class="cw-hand-sub">أهل الخير الذين بنوا الحائط</div>
        </div>
        <button class="cw-hand-close" type="button" aria-label="إغلاق">✕</button>
      </div>
      <div class="cw-hand-tools">
        <input type="search" id="cwDonorSearch" class="cw-search" placeholder="ابحث باسم المتبرع…" autocomplete="off">
        <div class="cw-tier-chips" id="cwTierChips"></div>
        <div class="cw-hand-sort">
          <label for="cwSort">ترتيب:</label>
          <select id="cwSort">
            <option value="amount">الأكبر مبلغًا</option>
            <option value="name">الاسم</option>
            <option value="date">الأحدث</option>
          </select>
        </div>
      </div>
      <div class="cw-hand-list" id="cwDonorList" role="list"></div>`;

    document.body.appendChild(this.panel);
    this.listEl = this.panel.querySelector('#cwDonorList');
    this.countEl = this.btn.querySelector('#cwDonorCount');
    this.searchEl = this.panel.querySelector('#cwDonorSearch');
    this.sortEl = this.panel.querySelector('#cwSort');
    this.chipsEl = this.panel.querySelector('#cwTierChips');

    this.btn.addEventListener('click', () => this.toggle());
    this.panel.querySelector('.cw-hand-close').addEventListener('click', () => this.close());
    this.searchEl.addEventListener('input', () => { this.search = this.searchEl.value.trim(); this.render(); });
    this.sortEl.addEventListener('change', () => { this.sortBy = this.sortEl.value; this.render(); });

    /* فيتشرات الفلترة */
    const chips = [{ id: 'all', label: 'الكل' }, ...this.tiers.map(t => ({ id: t.id, label: t.label, css: t.cssColor }))];
    chips.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cw-chip' + (c.id === 'all' ? ' on' : '');
      b.textContent = c.label;
      if (c.css) b.style.setProperty('--c', c.css);
      b.addEventListener('click', () => {
        this.filterTier = c.id;
        this.chipsEl.querySelectorAll('.cw-chip').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        this.render();
      });
      this.chipsEl.appendChild(b);
    });
  }

  setTiers(list) {
    this.tiers = list && list.length ? list : TIERS;
  }

  setDonors(list) {
    this.donors = Array.isArray(list) ? list.slice() : [];
    this.countEl.textContent = String(this.donors.length);
    this.render();
  }

  get isOpen() { return this.panel.classList.contains('open'); }

  toggle() { this.isOpen ? this.close() : this.open(); }

  open() {
    this.panel.classList.add('open');
    this.panel.setAttribute('aria-hidden', 'false');
    this.btn.classList.add('shifted');
  }

  close() {
    this.panel.classList.remove('open');
    this.panel.setAttribute('aria-hidden', 'true');
    this.btn.classList.remove('shifted');
  }

  _filtered() {
    let out = this.donors.filter(d => {
      if (this.filterTier !== 'all' && d.brickType !== this.filterTier) return false;
      if (this.search && !(d.name || '').includes(this.search)) return false;
      return true;
    });
    const ts = t => (t ? t.toMillis ? t.toMillis() : new Date(t).getTime() : 0);
    if (this.sortBy === 'amount') out.sort((a, b) => (b.totalDonation || 0) - (a.totalDonation || 0));
    else if (this.sortBy === 'name') out.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    else out.sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
    return out;
  }

  render() {
    const rows = this._filtered();
    if (!this.donors.length) {
      this.listEl.innerHTML = `<div class="cw-empty">لا يوجد متبرعون بعد.<br>كن أول من يضع طوبة في حائط الخير 🧱</div>`;
      return;
    }
    if (!rows.length) {
      this.listEl.innerHTML = `<div class="cw-empty">لا نتائج مطابقة للبحث.</div>`;
      return;
    }
    this.listEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    rows.forEach(d => {
      const tier = tierById(d.brickType, this.tiers);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'cw-donor-row';
      row.setAttribute('role', 'listitem');
      row.style.setProperty('--c', tier.cssColor);
      row.innerHTML = `
        <span class="cw-d-avatar">${escapeHtml((d.name || '؟').trim().charAt(0))}</span>
        <span class="cw-d-body">
          <span class="cw-d-name">${escapeHtml(d.name || 'متبرع')}</span>
          <span class="cw-d-meta"><span class="cw-d-tier">طوبة ${escapeHtml(tier.label)}</span> • ${escapeHtml(fmtDate(d.createdAt))}</span>
        </span>
        <span class="cw-d-amount">${escapeHtml(egp(d.totalDonation))}</span>`;
      row.addEventListener('click', () => this.onDonorClick(d));
      frag.appendChild(row);
    });
    this.listEl.appendChild(frag);
  }
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
