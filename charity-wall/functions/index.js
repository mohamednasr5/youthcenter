/**
 * index.js — Firebase Cloud Functions لحائط الخير | مركز شباب الأحمدية
 *
 * كل العمليات المالية (تسجيل/اعتماد/رفض التبرعات، المصروفات، تحديث الإجماليات)
 * تُنفَّذ على الخادم فقط — لا يُعتمد على JavaScript في المتصفح كمصدر موثوق.
 *
 * الصلاحيات: ycAdmin (Custom Claims) أو البريد المدرج في settings/admins.
 * الحسابات تُنشأ بأداة tools/setup-admins.mjs الموجودة في جذر المشروع.
 *
 * النشر:  cd charity-wall && firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/* فئات الطوب الافتراضية (يمكن تعديلها من settings/tiers في لوحة التحكم) */
const DEFAULT_TIERS = [
  { id: 'clay', label: 'طين', min: 0, max: 999.99 },
  { id: 'red', label: 'حمراء', min: 1000, max: 2999.99 },
  { id: 'silver', label: 'فضية', min: 3000, max: 4999.99 },
  { id: 'gold', label: 'ذهبية', min: 5000, max: 10000 },
  { id: 'diamond', label: 'ماسية', min: 10000.01, max: Number.MAX_SAFE_INTEGER }
];
const PER_ROW = 10;

/* ═══ التحقق من صلاحيات المسؤول ═══ */
async function requireAdmin(ctx) {
  if (!ctx.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'يجب تسجيل الدخول أولًا');
  }
  const email = (ctx.auth.token.email || '').toLowerCase();
  if (ctx.auth.token.ycAdmin === true) return email;
  const adminsDoc = await db.doc('settings/admins').get();
  const list = adminsDoc.exists ? (adminsDoc.data().emails || []).map(e => String(e).toLowerCase()) : [];
  if (email && list.includes(email)) return email;
  throw new functions.https.HttpsError('permission-denied', 'هذا الحساب غير مصرَّح له بإدارة حائط الخير');
}

function log(actor, action, details) {
  return db.collection('adminLogs').add({
    actor, action, details: details || {}, ts: FieldValue.serverTimestamp()
  });
}

/* فئة الطوب من إجمالي التبرعات المعتمدة */
async function tierFor(total) {
  let tiers = DEFAULT_TIERS;
  try {
    const snap = await db.doc('settings/tiers').get();
    if (snap.exists && Array.isArray(snap.data().list) && snap.data().list.length) {
      tiers = snap.data().list;
    }
  } catch (_e) { /* الافتراضي */ }
  const t = tiers.find(x => total >= x.min && total <= x.max);
  return t ? t.id : 'clay';
}

/* مبلغ صالح */
function amount(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'المبلغ يجب أن يكون رقمًا أكبر من صفر');
  }
  return Math.round(n * 100) / 100;
}

/* إعادة حساب الملخص العام (settings/public_summary) */
async function recalcSummary() {
  const donorsSnap = await db.collection('donors').get();
  let totalApproved = 0;
  donorsSnap.forEach(d => { totalApproved += Number(d.data().totalDonation) || 0; });

  const expensesSnap = await db.collection('expenses').get();
  let totalExpenses = 0;
  expensesSnap.forEach(x => { totalExpenses += Number(x.data().amount) || 0; });

  const bricksSnap = await db.collection('bricks').get();
  const tierCounts = { clay: 0, red: 0, silver: 0, gold: 0, diamond: 0 };
  bricksSnap.forEach(b => {
    const t = b.data().brickType;
    if (tierCounts[t] !== undefined) tierCounts[t]++;
  });

  await db.doc('settings/public_summary').set({
    totalApprovedDonations: Math.round(totalApproved * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    balance: Math.round((totalApproved - totalExpenses) * 100) / 100,
    donorCount: donorsSnap.size,
    brickCount: bricksSnap.size,
    tierCounts,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return { donors: donorsSnap.size, bricks: bricksSnap.size, totalApproved, totalExpenses };
}

/* إجمالي التبرعات المعتمدة لمتبرع + تحديث فئته وطوبته */
async function syncDonor(donorId, actor) {
  const donorRef = db.doc(`donors/${donorId}`);
  const approved = await db.collection('donations')
    .where('donorId', '==', donorId).where('status', '==', 'approved').get();
  const total = approved.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);
  const brickType = await tierFor(total);

  const donorSnap = await donorRef.get();
  if (!donorSnap.exists) return { total, brickType };
  const name = donorSnap.data().name;

  await donorRef.set({ totalDonation: Math.round(total * 100) / 100, brickType }, { merge: true });

  /* الطوبة: تحديثها إن وُجدت أو إنشاؤها عند دخول المتبرع الحائط أول مرة */
  const brickSnap = await db.collection('bricks').where('donorId', '==', donorId).get();
  if (total > 0) {
    if (brickSnap.empty) {
      const idx = await db.runTransaction(async tx => {
        const cRef = db.doc('settings/counters');
        const c = await tx.get(cRef);
        const next = (c.exists ? Number(c.data().nextIndex) : 0) || 0;
        tx.set(cRef, { nextIndex: next + 1 }, { merge: true });
        return next;
      });
      await db.collection('bricks').add({
        donorId,
        donorName: name,
        totalDonation: Math.round(total * 100) / 100,
        brickType,
        index: idx,
        row: Math.floor(idx / PER_ROW),
        column: idx % PER_ROW,
        createdAt: FieldValue.serverTimestamp()
      });
    } else {
      const bRef = brickSnap.docs[0].ref;
      await bRef.set({
        donorName: name,
        totalDonation: Math.round(total * 100) / 100,
        brickType
      }, { merge: true });
    }
  } else if (!brickSnap.empty) {
    /* لم يبقَ للمانح تبرعات معتمدة → تُخفى طوبته (وتُراصّ المواضع عبر cwRecalcAll) */
    await brickSnap.docs[0].ref.delete();
  }
  return { total, brickType };
}

/* ═══ 1) إضافة / تعديل متبرع ═══ */
exports.cwAddDonor = functions.https.onCall(async (data, ctx) => {
  const actor = await requireAdmin(ctx);
  const name = String(data.name || '').trim();
  if (name.length < 2) throw new functions.https.HttpsError('invalid-argument', 'اسم المتبرع مطلوب');
  const payload = { name, createdAt: FieldValue.serverTimestamp(), totalDonation: 0, brickType: 'clay' };
  const ref = await db.collection('donors').add(payload);
  /* بيانات التواصل الخاصة لا تُنشر للزوار */
  await db.doc(`donors_private/${ref.id}`).set({
    phone: String(data.phone || ''), notes: String(data.notes || ''), createdAt: FieldValue.serverTimestamp()
  });
  await recalcSummary();
  await log(actor, 'add_donor', { donorId: ref.id, name });
  return { ok: true, donorId: ref.id };
});

exports.cwUpdateDonor = functions.https.onCall(async (data, ctx) => {
  const actor = await requireAdmin(ctx);
  if (!data.donorId) throw new functions.https.HttpsError('invalid-argument', 'donorId مطلوب');
  const donorRef = db.doc(`donors/${data.donorId}`);
  const patch = {};
  if (data.name != null) {
    const name = String(data.name).trim();
    if (name.length < 2) throw new functions.https.HttpsError('invalid-argument', 'الاسم قصير جدًا');
    patch.name = name;
  }
  if (Object.keys(patch).length) await donorRef.set(patch, { merge: true });
  await db.doc(`donors_private/${data.donorId}`).set({
    phone: String(data.phone || ''), notes: String(data.notes || '')
  }, { merge: true });
  /* مزامنة الاسم في الطوبة والتبرعات */
  const donorSnap = await donorRef.get();
  if (donorSnap.exists) {
    const name = donorSnap.data().name;
    const bricks = await db.collection('bricks').where('donorId', '==', data.donorId).get();
    bricks.forEach(b => b.ref.set({ donorName: name }, { merge: true }));
  }
  await log(actor, 'update_donor', { donorId: data.donorId });
  return { ok: true };
});

/* ═══ 2) تسجيل تبرع (قيد الاعتماد) ═══ */
exports.cwRecordDonation = functions.https.onCall(async (data, ctx) => {
  const actor = await requireAdmin(ctx);
  const amt = amount(data.amount);
  if (!data.donorId) throw new functions.https.HttpsError('invalid-argument', 'يجب اختيار المتبرع');
  const donorSnap = await db.doc(`donors/${data.donorId}`).get();
  if (!donorSnap.exists) throw new functions.https.HttpsError('not-found', 'المتبرع غير موجود');
  const date = data.date ? new Date(data.date) : new Date();
  if (isNaN(date.getTime())) throw new functions.https.HttpsError('invalid-argument', 'تاريخ غير صالح');
  const ref = await db.collection('donations').add({
    donorId: data.donorId,
    donorName: donorSnap.data().name,
    amount: amt,
    date: admin.firestore.Timestamp.fromDate(date),
    status: 'pending',
    paymentMethod: String(data.paymentMethod || 'نقدي'),
    transactionId: String(data.transactionId || ''),
    note: String(data.note || ''),
    createdBy: actor,
    createdAt: FieldValue.serverTimestamp()
  });
  await log(actor, 'record_donation', { donationId: ref.id, donorId: data.donorId, amount: amt });
  return { ok: true, donationId: ref.id };
});

/* ═══ 3) اعتماد تبرع ← طوبة جديدة تطير إلى الحائط ═══ */
exports.cwApproveDonation = functions.https.onCall(async (data, ctx) => {
  const actor = await requireAdmin(ctx);
  if (!data.donationId) throw new functions.https.HttpsError('invalid-argument', 'donationId مطلوب');
  const ref = db.doc(`donations/${data.donationId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'التبرع غير موجود');
  if (snap.data().status === 'approved') {
    throw new functions.https.HttpsError('failed-precondition', 'هذا التبرع معتمد بالفعل');
  }
  await ref.set({
    status: 'approved', approvedBy: actor, approvedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  const res = await syncDonor(snap.data().donorId, actor);
  await recalcSummary();
  await log(actor, 'approve_donation', {
    donationId: data.donationId, donorId: snap.data().donorId,
    amount: snap.data().amount, donorTotal: res.total, brickType: res.brickType
  });
  return { ok: true, ...res };
});

/* ═══ 4) رفض تبرع ═══ */
exports.cwRejectDonation = functions.https.onCall(async (data, ctx) => {
  const actor = await requireAdmin(ctx);
  if (!data.donationId) throw new functions.https.HttpsError('invalid-argument', 'donationId مطلوب');
  const ref = db.doc(`donations/${data.donationId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'التبرع غير موجود');
  await ref.set({
    status: 'rejected', rejectedBy: actor,
    rejectedAt: FieldValue.serverTimestamp(),
    rejectReason: String(data.reason || '')
  }, { merge: true });
  const res = await syncDonor(snap.data().donorId, actor);
  await recalcSummary();
  await log(actor, 'reject_donation', { donationId: data.donationId, reason: data.reason || '' });
  return { ok: true, ...res };
});

/* ═══ 5) المصروفات (مع الفواتير وصور الأعمال المرفوعة إلى Storage) ═══ */
exports.cwAddExpense = functions.https.onCall(async (data, ctx) => {
  const actor = await requireAdmin(ctx);
  const amt = amount(data.amount);
  const title = String(data.title || '').trim();
  if (title.length < 2) throw new functions.https.HttpsError('invalid-argument', 'عنوان المصروف مطلوب');
  const date = data.date ? new Date(data.date) : new Date();
  if (isNaN(date.getTime())) throw new functions.https.HttpsError('invalid-argument', 'تاريخ غير صالح');
  const ref = await db.collection('expenses').add({
    title,
    description: String(data.description || ''),
    category: String(data.category || ''),
    amount: amt,
    date: admin.firestore.Timestamp.fromDate(date),
    receiptUrl: String(data.receiptUrl || ''),
    images: Array.isArray(data.images) ? data.images.map(String).slice(0, 20) : [],
    approvedBy: actor,
    createdAt: FieldValue.serverTimestamp()
  });
  await recalcSummary();
  await log(actor, 'add_expense', { expenseId: ref.id, title, amount: amt });
  return { ok: true, expenseId: ref.id };
});

exports.cwDeleteExpense = functions.https.onCall(async (data, ctx) => {
  const actor = await requireAdmin(ctx);
  if (!data.expenseId) throw new functions.https.HttpsError('invalid-argument', 'expenseId مطلوب');
  await db.doc(`expenses/${data.expenseId}`).delete();
  await recalcSummary();
  await log(actor, 'delete_expense', { expenseId: data.expenseId });
  return { ok: true };
});

/* ═══ 6) إعادة احتساب شاملة (بعد تعديل حدود الفئات مثلاً) وترصيف الطوب ═══ */
exports.cwRecalcAll = functions.https.onCall(async (_data, ctx) => {
  const actor = await requireAdmin(ctx);
  const donorsSnap = await db.collection('donors').get();
  for (const d of donorsSnap.docs) {
    await syncDonor(d.id, actor);
  }
  /* ترصيف المواضع تسلسليًا بحسب أول اعتماد */
  const bricksSnap = await db.collection('bricks').orderBy('createdAt', 'asc').get();
  let idx = 0;
  const batch = db.batch();
  bricksSnap.forEach(b => {
    batch.set(b.ref, { index: idx, row: Math.floor(idx / PER_ROW), column: idx % PER_ROW }, { merge: true });
    idx++;
  });
  await batch.commit();
  await db.doc('settings/counters').set({ nextIndex: idx }, { merge: true });
  const summary = await recalcSummary();
  await log(actor, 'recalc_all', summary);
  return { ok: true, ...summary };
});
