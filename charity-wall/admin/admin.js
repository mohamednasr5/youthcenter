/* admin.js — لوحة تحكم حائط الخير
   الحماية: Firebase Authentication (بريد/كلمة مرور) + قواعد Realtime Database/Storage
   وكل العمليات المالية تمر عبر Cloud Functions (لا يُعتمد على المتصفح في الحسابات).
   الوصول للوحة مسموح فقط للبريدات المصرَّح لها (ycAdmin Claim أو settings/admins). */

import {
  auth, db, storage, TIERS, tierById, egp, fmtDate
} from '../firebase-config.js';
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get, set, onValue, query, orderByChild, limitToLast } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js';
import { ref as sRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const functions = getFunctions();
const ROOT='charityWall';
const rref=path=>ref(db,ROOT+'/'+path);
const toList=snap=>Object.entries(snap.val()||{}).map(([id,value])=>({id,...value}));
const emailKey=email=>String(email).toLowerCase().replace(/[.#$\[\]\/]/g,'_');

/* ═══ أدوات مساعدة ═══ */
function toast(msg, isErr = false) {
  const t = $('#admToast');
  t.textContent = msg;
  t.className = 'adm-toast show' + (isErr ? ' err' : '');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.className = 'adm-toast', 3400);
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const call = async (name, data) => {
  try {
    return await httpsCallable(functions, name)(data || {});
  } catch (e) {
    toast(e.message || 'تعذر تنفيذ العملية', true);
    throw e;
  }
};

/* ═══ الحالة ═══ */
const state = {
  user: null, isAdmin: false,
  donors: [], privates: new Map(), donations: [], expenses: [],
  summary: {}, tiers: TIERS, admins: []
};

/* ═══ المصادقة ═══ */
onAuthStateChanged(auth, async user => {
  if (!user) { showLogin(); return; }
  state.user = user;
  $('#adminEmail').textContent = user.email || '';
  /* فحص الصلاحية: ycAdmin Claim أو القائمة المحلية (الفصل النهائي للخادم) */
  let ok = false;
  try {
    const tr = await user.getIdTokenResult();
    ok = tr.claims.ycAdmin === true;
  } catch (_e) {}
  if (!ok && window.YC_AUTH_CONFIG && Array.isArray(window.YC_AUTH_CONFIG.adminEmails)) {
    ok = window.YC_AUTH_CONFIG.adminEmails.some(a => a.email === user.email);
  }
  state.isAdmin = ok;
  if (!ok) toast('تنبيه: هذا الحساب لا يملك صلاحية ycAdmin — قد تُرفض بعض العمليات', true);
  $('#loginScreen').style.display = 'none';
  $('#adminApp').hidden = false;
  loadAll();
});

function showLogin() {
  $('#adminApp').hidden = true;
  $('#loginScreen').style.display = 'grid';
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#loginBtn');
  btn.disabled = true; btn.textContent = 'جارٍ التحقق…';
  $('#loginErr').textContent = '';
  try {
    await signInWithEmailAndPassword(auth, $('#loginEmail').value.trim(), $('#loginPass').value);
  } catch (err) {
    const map = {
      'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
      'auth/wrong-password': 'كلمة المرور غير صحيحة',
      'auth/user-not-found': 'لا يوجد حساب بهذا البريد',
      'auth/too-many-requests': 'محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة',
      'auth/network-request-failed': 'تعذر الاتصال بالشبكة'
    };
    $('#loginErr').textContent = map[err.code] || err.message || 'تعذر تسجيل الدخول';
  } finally {
    btn.disabled = false; btn.textContent = 'تسجيل الدخول';
  }
});

$('#logoutBtn').addEventListener('click', () => signOut(auth));

/* ═══ التبويبات ═══ */
$$('.tab').forEach(b => b.addEventListener('click', () => {
  $$('.tab').forEach(x => x.classList.remove('on'));
  $$('.tab-panel').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  $('#tab-' + b.dataset.tab).classList.add('on');
}));

/* ═══ تحميل البيانات ═══ */
async function loadAll() {
 const [dn,pv]=await Promise.all([get(rref('donors')),get(rref('donors_private'))]);
 state.donors=toList(dn);state.privates=new Map(Object.entries(pv.val()||{}));renderDonors();renderDonorSelect();
 onValue(query(rref('donations'),orderByChild('createdAt'),limitToLast(300)),s=>{state.donations=toList(s).sort((x,y)=>Number(y.createdAt||0)-Number(x.createdAt||0));renderDonations();renderDash();},e=>toast('تعذر قراءة التبرعات: '+e.message,true));
 onValue(query(rref('expenses'),orderByChild('date'),limitToLast(300)),s=>{state.expenses=toList(s).sort((x,y)=>Number(y.date||0)-Number(x.date||0));renderExpenses();},e=>toast('تعذر قراءة المصروفات: '+e.message,true));
 onValue(rref('settings/public_summary'),s=>{state.summary=s.val()||{};renderDash();renderReports();});
 get(rref('settings/tiers')).then(s=>{const v=s.val();if(v&&Array.isArray(v.list))state.tiers=v.list;renderTiers();}).catch(()=>renderTiers());
 get(rref('settings/admins/emails')).then(s=>{state.admins=Object.values(s.val()||{});renderAdmins();}).catch(()=>{});
 onValue(query(rref('adminLogs'),orderByChild('ts'),limitToLast(100)),s=>{const rows=toList(s).sort((x,y)=>Number(y.ts||0)-Number(x.ts||0));$('#logsTable tbody').innerHTML=rows.map(x=>`<tr><td>${esc(fmtDate(x.ts))}</td><td>${esc(x.actor||'')}</td><td>${esc(actionLabel(x.action))}</td><td style="white-space:normal">${esc(JSON.stringify(x.details||{}))}</td></tr>`).join('')||`<tr><td colspan="4" style="text-align:center;color:var(--txt-mute)">لا عمليات بعد</td></tr>`;},()=>{});
}

function actionLabel(a) {
  return ({
    add_donor: 'إضافة متبرع', update_donor: 'تعديل متبرع',
    record_donation: 'تسجيل تبرع', approve_donation: 'اعتماد تبرع', reject_donation: 'رفض تبرع',
    add_expense: 'إضافة مصروف', delete_expense: 'حذف مصروف', recalc_all: 'إعادة احتساب شاملة', record_contribution: 'تسجيل مساهمة'
  })[a] || a;
}

/* ═══ نظرة عامة ═══ */
function renderDash() {
  const s = state.summary || {};
  const pending = state.donations.filter(d => d.status === 'pending').length;
  $('#pendingBadge').hidden = pending === 0;
  $('#pendingBadge').textContent = String(pending);
  const cards = [
    { v: egp(s.totalCashDonations ?? s.totalApprovedDonations), k: 'النقد المحصّل فعليًا' },
    { v: egp(s.totalInKindContributions), k: 'القيمة التقديرية للمساهمات العينية', cls: 'blue' },
    { v: egp(s.totalContributionValue ?? s.totalApprovedDonations), k: 'إجمالي قيمة الخير', cls: 'emerald' },
    { v: egp(s.totalExpenses), k: 'إجمالي المصروفات', cls: 'red' },
    { v: egp(s.cashBalance ?? s.balance), k: 'الرصيد النقدي المتاح', cls: 'emerald' },
    { v: String(s.donorCount ?? state.donors.length), k: 'متبرع', cls: 'blue' },
    { v: String(s.brickCount ?? 0), k: 'طوبة على الحائط' },
    { v: String(pending), k: 'تبرع قيد الاعتماد', cls: 'red' }
  ];
  $('#dashCards').innerHTML = cards.map(c => `<div class="dash-card ${c.cls || ''}"><div class="v">${esc(c.v)}</div><div class="k">${c.k}</div></div>`).join('');
  $('#dashRecent tbody').innerHTML = state.donations.slice(0, 6).map(d => `<tr>
      <td>${esc(d.donorName || '')}</td><td>${esc(egp(d.amount))}</td>
      <td><span class="pill ${d.status}">${statusLabel(d.status)}</span></td>
      <td>${esc(fmtDate(d.date || d.createdAt))}</td></tr>`).join('')
    || `<tr><td colspan="4" style="text-align:center;color:var(--txt-mute)">لا تبرعات بعد</td></tr>`;
  renderReports();
}

function statusLabel(s) {
  return { pending: 'قيد الاعتماد', approved: 'معتمد', rejected: 'مرفوض' }[s] || s;
}

/* ═══ المتبرعون ═══ */
function renderDonors() {
  const q = ($('#donorSearch').value || '').trim();
  $('#donorCount').textContent = state.donors.length;
  const rows = state.donors
    .filter(d => !q || (d.name || '').includes(q) || ((state.privates.get(d.id) || {}).phone || '').includes(q))
    .sort((a, b) => (b.totalDonation || 0) - (a.totalDonation || 0));
  $('#donorsTable tbody').innerHTML = rows.map(d => {
    const t = tierById(d.brickType, state.tiers);
    const phone = (state.privates.get(d.id) || {}).phone || '—';
    return `<tr>
      <td>${esc(d.name)}</td><td dir="ltr">${esc(phone)}</td>
      <td>${esc(egp(d.totalDonation))}</td>
      <td><span class="tier-pill" style="background:${t.cssColor}">${esc(t.label)}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" data-edit="${d.id}">✏️ تعديل</button>
        <button class="btn btn-gold btn-sm" data-donate="${d.id}">＋ تبرع</button>
      </td></tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--txt-mute)">لا متبرعين — أضف أول متبرع</td></tr>`;

  $$('#donorsTable [data-edit]').forEach(b => b.addEventListener('click', () => openDonorModal(b.dataset.edit)));
  $$('#donorsTable [data-donate]').forEach(b => b.addEventListener('click', () => {
    $$('.tab').find(x => x.dataset.tab === 'donations').click();
    $('#dnDonor').value = b.dataset.donate;
    $('#dnType').value='cash'; syncContributionFields(); $('#dnAmount').focus();
  }));
}

$('#donorSearch').addEventListener('input', renderDonors);

function renderDonorSelect() {
  $('#dnDonor').innerHTML = state.donors
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
    .map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')
    || '<option value="">أضف متبرعًا أولًا</option>';
}

$('#donorForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await call('cwAddDonor', {
      name: $('#dName').value, phone: $('#dPhone').value, notes: $('#dNotes').value
    });
    toast('تمت إضافة المتبرع ✓');
    e.target.reset();
    const dn = await get(rref('donors'));
    state.donors = toList(dn);
    renderDonors(); renderDonorSelect();
  } catch (_e) { /* الرسالة تظهر من call */ }
});

/* تعديل متبرع (نافذة منبثقة) */
function openDonorModal(id) {
  const d = state.donors.find(x => x.id === id);
  if (!d) return;
  const p = state.privates.get(id) || {};
  const ov = document.createElement('div');
  ov.className = 'cw-modal';
  ov.innerHTML = `<div class="cw-modal-card">
    <h3>تعديل المتبرع</h3>
    <label><span>الاسم</span><input id="mName" value="${esc(d.name || '')}"></label>
    <label><span>الهاتف</span><input id="mPhone" dir="ltr" value="${esc(p.phone || '')}"></label>
    <label><span>ملاحظات</span><input id="mNotes" value="${esc(p.notes || '')}"></label>
    <div class="row-actions">
      <button class="btn btn-gold" id="mSave">💾 حفظ</button>
      <button class="btn btn-ghost" id="mCancel">إلغاء</button>
    </div></div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  ov.querySelector('#mCancel').addEventListener('click', () => ov.remove());
  ov.querySelector('#mSave').addEventListener('click', async () => {
    try {
      await call('cwUpdateDonor', {
        donorId: id, name: ov.querySelector('#mName').value,
        phone: ov.querySelector('#mPhone').value, notes: ov.querySelector('#mNotes').value
      });
      toast('تم حفظ التعديلات ✓');
      ov.remove();
      const dn = await get(rref('donors'));
      state.donors = toList(dn);
      renderDonors(); renderDonorSelect();
    } catch (_e) {}
  });
}

/* ═══ التبرعات ═══ */
function syncContributionFields() {
  const cash=$('#dnType').value==='cash';
  $('#dnCashWrap').hidden=!cash; $('#dnMethodWrap').hidden=!cash; $('#dnTxnWrap').hidden=!cash;
  $('#dnValueWrap').hidden=cash; $('#dnTitleWrap').hidden=cash;
  $('#dnAmount').required=cash; $('#dnValue').required=!cash; $('#dnTitle').required=!cash;
}
$('#dnType').addEventListener('change',syncContributionFields);
syncContributionFields();
$('#donationForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!$('#dnDonor').value) { toast('أضف مساهمًا أولًا', true); return; }
  const type=$('#dnType').value;
  try {
    await call('cwRecordDonation', {donorId:$('#dnDonor').value,contributionType:type,
      amount:type==='cash'?Number($('#dnAmount').value):0,
      estimatedValue:type==='cash'?Number($('#dnAmount').value):Number($('#dnValue').value),
      title:type==='cash'?'تبرع نقدي':$('#dnTitle').value,description:$('#dnDescription').value,
      project:$('#dnProject').value,date:$('#dnDate').value||null,paymentMethod:$('#dnMethod').value,
      transactionId:$('#dnTxn').value,note:$('#dnNote').value});
    toast('تم تسجيل المساهمة — في انتظار المراجعة والاعتماد ✓'); e.target.reset(); syncContributionFields();
  } catch (_e) {}
});

$('#dnFilter').addEventListener('change', renderDonations);

function renderDonations() {
  const f = $('#dnFilter').value;
  const rows = state.donations.filter(d => f === 'all' || d.status === f);
  $('#donationsTable tbody').innerHTML = rows.map(d => {
    const cash=d.contributionType==='cash'||!d.contributionType, kind=d.contributionType||'cash';
    const labels={cash:'نقدي',service:'خدمة / خبرة',material:'مواد / خامات',labor:'جهد / تنفيذ',sponsorship:'رعاية مشروع'};
    const value=cash?Number(d.amount)||0:Number(d.estimatedValue)||0;
    return `<tr><td>${esc(d.donorName||'')}</td><td>${esc(labels[kind]||kind)} — ${esc(d.title||'')}</td>
      <td><b>${esc(egp(value))}</b></td><td><b>${esc(egp(d.amount||0))}</b></td>
      <td>${esc(d.paymentMethod||(cash?'—':'مساهمة عينية'))}</td><td dir="ltr">${esc(d.transactionId||'—')}</td>
      <td>${esc(fmtDate(d.date||d.createdAt))}</td><td><span class="pill ${d.status}">${statusLabel(d.status)}</span></td>
      <td>${d.status==='pending'? `<button class="btn btn-emerald btn-sm" data-approve="${d.id}">✓ اعتماد</button> <button class="btn btn-danger btn-sm" data-reject="${d.id}">✕ رفض</button>`:(d.approvedBy?`<small>اعتمده: ${esc(d.approvedBy)}</small>`:'')}</td></tr>`;
  }).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--txt-mute)">لا توجد مساهمات — سجّل أول مساهمة</td></tr>`;

  $$('#donationsTable [data-approve]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      await call('cwApproveDonation', { donationId: b.dataset.approve });
      toast('تم الاعتماد — الطوبة في طريقها إلى الحائط 🧱');
    } catch (_e) {} finally { b.disabled = false; }
  }));
  $$('#donationsTable [data-reject]').forEach(b => b.addEventListener('click', async () => {
    const reason = prompt('سبب الرفض (اختياري):') || '';
    b.disabled = true;
    try {
      await call('cwRejectDonation', { donationId: b.dataset.reject, reason });
      toast('تم رفض التبرع');
    } catch (_e) {} finally { b.disabled = false; }
  }));
}

/* ═══ المصروفات ═══ */
async function uploadImage(file, kind) {
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const r = sRef(storage, `charity-wall/expenses/${Date.now()}_${kind}_${safe}`);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

$('#expenseForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'جارٍ رفع المستندات…';
  try {
    let receiptUrl = '';
    const images = [];
    const rf = $('#exReceipt').files[0];
    if (rf) receiptUrl = await uploadImage(rf, 'receipt');
    for (const f of $('#exImages').files) images.push(await uploadImage(f, 'work'));
    await call('cwAddExpense', {
      title: $('#exTitle').value,
      description: $('#exDesc').value,
      category: $('#exCategory').value,
      amount: Number($('#exAmount').value),
      date: $('#exDate').value || null,
      receiptUrl, images
    });
    toast('تم حفظ المصروف ونشره في قسم الشفافية ✓');
    e.target.reset();
  } catch (_e) {}
  finally { btn.disabled = false; btn.textContent = '🧾 حفظ المصروف (يُنشر في الشفافية)'; }
});

function renderExpenses() {
  $('#expenseCount').textContent = state.expenses.length;
  $('#expensesTable tbody').innerHTML = state.expenses.map(x => `<tr>
      <td>${esc(x.title)}</td><td>${esc(x.category || '—')}</td>
      <td><b>${esc(egp(x.amount))}</b></td><td>${esc(fmtDate(x.date))}</td>
      <td><div class="thumb-row">${x.receiptUrl ? `<img src="${esc(x.receiptUrl)}" alt="فاتورة" title="الفاتورة">` : ''}${(x.images || []).map(u => `<img src="${esc(u)}" alt="صورة عمل">`).join('')}</div></td>
      <td><button class="btn btn-danger btn-sm" data-delexp="${x.id}">🗑️ حذف</button></td></tr>`).join('')
    || `<tr><td colspan="6" style="text-align:center;color:var(--txt-mute)">لا مصروفات</td></tr>`;
  $$('#expensesTable [data-delexp]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('حذف هذا المصروف نهائيًا؟')) return;
    try { await call('cwDeleteExpense', { expenseId: b.dataset.delexp }); toast('تم الحذف'); } catch (_e) {}
  }));
}

/* ═══ الفئات والمصرَّح لهم ═══ */
function renderTiers() {
  $('#tiersTable tbody').innerHTML = state.tiers.map((t, i) => `<tr>
      <td><span class="tier-pill" style="background:${t.cssColor || '#888'}">${esc(t.label)}</span>
          <input type="hidden" data-tier-id="${i}" value="${esc(t.id)}"></td>
      <td><input type="number" data-tier-min="${i}" value="${t.min}" min="0" step="1"></td>
      <td><input type="number" data-tier-max="${i}" value="${t.max === Infinity ? 999999999 : t.max}" step="1"></td>
    </tr>`).join('');
}

$('#saveTiers').addEventListener('click', async () => {
  const list = state.tiers.map((t, i) => ({
    ...t,
    label: t.label,
    min: Number(document.querySelector(`[data-tier-min="${i}"]`).value) || 0,
    max: Number(document.querySelector(`[data-tier-max="${i}"]`).value) || 999999999
  }));
  try {
    await set(rref('settings/tiers'), { list });
    state.tiers = list;
    toast('تم حفظ الفئات — نفّذ إعادة الاحتساب لتطبيقها على الحاليين');
  } catch (e) { toast(e.message || 'تعذر الحفظ — تحقق من صلاحياتك', true); }
});

$('#recalcBtn').addEventListener('click', async () => {
  if (!confirm('إعادة احتساب إجماليات كل المتبرعين وفئاتهم وترصيف الطوب؟')) return;
  try {
    const r = await call('cwRecalcAll');
    toast(`تمت إعادة الاحتساب: ${r.data.donors} متبرع و${r.data.bricks} طوبة ✓`);
  } catch (_e) {}
});

function renderAdmins() {
  $('#adminsList').innerHTML = state.admins.map((a, i) =>
    `<li><span>${esc(a)}</span><button class="btn btn-danger btn-sm" data-deladm="${i}">حذف</button></li>`).join('')
    || '<li style="justify-content:center;color:var(--txt-mute)">لا بريدات مضافة (الاعتماد على ycAdmin Claims)</li>';
  $$('#adminsList [data-deladm]').forEach(b => b.addEventListener('click', async () => {
    state.admins.splice(Number(b.dataset.deladm), 1);
    try {
      await set(rref('settings/admins/emails'), Object.fromEntries(state.admins.map(email => [emailKey(email), email])));
      renderAdmins();
    } catch (e) { toast(e.message, true); }
  }));
}

$('#adminForm').addEventListener('submit', async e => {
  e.preventDefault();
  const v = $('#adminEmailInput').value.trim().toLowerCase();
  if (!v) return;
  if (!state.admins.includes(v)) state.admins.push(v);
  try {
    await set(rref('settings/admins/emails'), Object.fromEntries(state.admins.map(email => [emailKey(email), email])));
    $('#adminEmailInput').value = '';
    renderAdmins();
    toast('تمت الإضافة — أنشئ الحساب بأداة setup-admins.mjs');
  } catch (err) { toast(err.message, true); }
});

/* ═══ التقارير ═══ */
function renderReports() {
  const s = state.summary || {};
  $('#reportCards').innerHTML = [
    { v: egp(s.totalCashDonations ?? s.totalApprovedDonations), k: 'النقد المحصّل' },
    { v: egp(s.totalInKindContributions), k: 'المساهمات العينية', cls: 'blue' },
    { v: egp(s.totalContributionValue ?? s.totalApprovedDonations), k: 'إجمالي قيمة الخير' },
    { v: egp(s.totalExpenses), k: 'المصروفات النقدية', cls: 'red' },
    { v: egp(s.balance), k: 'الرصيد', cls: 'emerald' },
    { v: String(s.brickCount ?? 0), k: 'طوبات', cls: 'blue' }
  ].map(c => `<div class="dash-card ${c.cls || ''}"><div class="v">${esc(c.v)}</div><div class="k">${c.k}</div></div>`).join('');

  const tc = s.tierCounts || {};
  $('#printableSummary').innerHTML = `
    <div class="p-row"><span>النقد المحصّل فعليًا</span><b>${esc(egp(s.totalCashDonations ?? s.totalApprovedDonations))}</b></div>
    <div class="p-row"><span>القيمة التقديرية للمساهمات العينية</span><b>${esc(egp(s.totalInKindContributions))}</b></div>
    <div class="p-row"><span>إجمالي قيمة الخير</span><b>${esc(egp(s.totalContributionValue ?? s.totalApprovedDonations))}</b></div>
    <div class="p-row"><span>إجمالي المصروفات</span><b>${esc(egp(s.totalExpenses))}</b></div>
    <div class="p-row"><span>الرصيد المتبقي</span><b>${esc(egp(s.cashBalance ?? s.balance))}</b></div>
    <div class="p-row"><span>عدد المتبرعين</span><b>${s.donorCount ?? '—'}</b></div>
    <div class="p-row"><span>الطوبات: طين ${tc.clay || 0} • حمراء ${tc.red || 0} • فضية ${tc.silver || 0} • ذهبية ${tc.gold || 0} • ماسية ${tc.diamond || 0}</span><b>${s.brickCount ?? 0}</b></div>
    <div class="p-row"><span>آخر تحديث</span><b>${esc(fmtDate(s.updatedAt))}</b></div>`;
}

/* تصدير CSV (مع BOM لعرض العربية في Excel) */
$$('[data-export]').forEach(b => b.addEventListener('click', () => {
  const kind = b.dataset.export;
  let csv = '';
  if (kind === 'donors') {
    csv = 'الاسم,الهاتف,الإجمالي المعتمد,الفئة\n' + state.donors.map(d =>
      `"${d.name || ''}","${(state.privates.get(d.id) || {}).phone || ''}",${d.totalDonation || 0},"${tierById(d.brickType, state.tiers).label}"`).join('\n');
  } else if (kind === 'donations') {
    csv = 'المتبرع,المبلغ,الحالة,طريقة الدفع,رقم العملية,التاريخ\n' + state.donations.map(d =>
      `"${d.donorName || ''}",${d.amount || 0},"${statusLabel(d.status)}","${d.paymentMethod || ''}","${d.transactionId || ''}","${fmtDate(d.date || d.createdAt)}"`).join('\n');
  } else if (kind === 'expenses') {
    csv = 'العنوان,البند,المبلغ,التاريخ,المعتمد\n' + state.expenses.map(x =>
      `"${x.title || ''}","${x.category || ''}",${x.amount || 0},"${fmtDate(x.date)}","${x.approvedBy || ''}"`).join('\n');
  }
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `charity-wall-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('تم تنزيل التقرير ✓');
}));
