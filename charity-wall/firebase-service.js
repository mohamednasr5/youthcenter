/* firebase-service.js — طبقة الوصول لبيانات حائط الخير (قراءة عامة)
   - تحميل الطوب على دفعات (pagination) حتى مع آلاف المتبرعين
   - استماع لحظي للملخص والإضافات الجديدة
   - قراءة المتبرعين والمصروفات لقسم الشفافية */

import {
  collection, doc, getDoc, getDocs, onSnapshot, query, orderBy, limit, startAfter
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db, TIERS } from './firebase-config.js';

const PAGE = 300; /* حجم الدفعة الواحدة */

/* مهلة زمنية للطلبات الأولية حتى لا تعلق الواجهة عند تعذر الشبكة */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout: ' + label)), ms))
  ]);
}

/* ─── فئات الطوب المحفوظة في settings/tiers (مع الرجوع للقيم الافتراضية) ─── */
export async function loadTiers() {
  try {
    const snap = await withTimeout(getDoc(doc(db, 'settings', 'tiers')), 5000, 'tiers');
    if (snap.exists() && Array.isArray(snap.data().list)) {
      return snap.data().list;
    }
  } catch (_e) { /* دون اتصال أو عدم توفر المستند */ }
  return TIERS;
}

/* ─── تحميل كل الطوب على دفعات مرتبة بموضعها في الحائط ─── */
export async function loadBricks(onPage) {
  const out = [];
  let last = null;
  while (true) {
    let q = query(collection(db, 'bricks'), orderBy('index', 'asc'), limit(PAGE));
    if (last) q = query(collection(db, 'bricks'), orderBy('index', 'asc'), startAfter(last), limit(PAGE));
    const snap = await withTimeout(getDocs(q), 8000, 'bricks');
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    if (typeof onPage === 'function') onPage(out.length, snap.size);
    if (snap.size < PAGE) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return out;
}

/* ─── استماع لحظي للطوب الجديد (آخر 20 موضعًا) لاكتشاف الاعتمادات الجديدة ─── */
export function subscribeNewBricks(afterIndex, cb) {
  const q = query(collection(db, 'bricks'), orderBy('index', 'desc'), limit(20));
  return onSnapshot(q, snap => {
    const fresh = [];
    snap.forEach(d => {
      const data = d.data();
      if (typeof data.index === 'number' && data.index > afterIndex) fresh.push({ id: d.id, ...data });
    });
    if (fresh.length) cb(fresh.sort((a, b) => a.index - b.index));
  }, () => { /* تجاهل أخطاء الشبكة: الكاش المحلي يكفي */ });
}

/* ─── استماع لحظي للملخص المالي وعدد الطوب ─── */
export function subscribeSummary(cb) {
  return onSnapshot(doc(db, 'settings', 'public_summary'), snap => {
    if (snap.exists()) cb(snap.data());
  }, () => { /* دون اتصال */ });
}

/* ─── المتبرعون (الأسماء والإجماليات المعتمدة فقط — بيانات عامة) ─── */
export async function loadDonors() {
  const out = [];
  let last = null;
  while (true) {
    let q = query(collection(db, 'donors'), orderBy('name'), limit(PAGE));
    if (last) q = query(collection(db, 'donors'), orderBy('name'), startAfter(last), limit(PAGE));
    const snap = await withTimeout(getDocs(q), 8000, 'donors');
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    if (snap.size < PAGE) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return out;
}

/* ─── المصروفات (تفاصيل الشفافية) ─── */
export async function loadExpenses() {
  const out = [];
  let last = null;
  while (true) {
    let q = query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(PAGE));
    if (last) q = query(collection(db, 'expenses'), orderBy('date', 'desc'), startAfter(last), limit(PAGE));
    const snap = await withTimeout(getDocs(q), 8000, 'expenses');
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    if (snap.size < PAGE) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return out;
}

/* ─── إحصائيات مشتقة من الطوب والمتبرعين (عرض فقط — المصدر الموثوق هو الخادم) ─── */
export function brickStats(bricks, tiers) {
  const counts = {};
  (tiers || TIERS).forEach(t => { counts[t.id] = 0; });
  bricks.forEach(b => { if (counts[b.brickType] !== undefined) counts[b.brickType]++; });
  return counts;
}
