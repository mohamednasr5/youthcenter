/* firebase-service.js — قراءة بيانات حائط الخير من Firestore مع تمييز بيانات الخادم عن الكاش */
import {
  collection, doc, getDocFromServer, getDocsFromServer, onSnapshot, query, orderBy, limit, startAfter
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db, TIERS } from './firebase-config.js';

const PAGE = 300;

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('انتهت مهلة الاتصال أثناء تحميل ' + label)), ms); })
  ]).finally(() => clearTimeout(timer));
}

function assertServerSnapshot(snapshot, label) {
  if (snapshot.metadata && snapshot.metadata.fromCache) {
    throw new Error('وصلت بيانات مخزنة مؤقتًا فقط أثناء تحميل ' + label + '؛ لم يتم تأكيد الاتصال بالخادم.');
  }
  return snapshot;
}

export async function loadTiers() {
  try {
    const snap = assertServerSnapshot(
      await withTimeout(getDocFromServer(doc(db, 'settings', 'tiers')), 7000, 'فئات الطوب'),
      'فئات الطوب'
    );
    if (snap.exists() && Array.isArray(snap.data().list)) return snap.data().list;
    return TIERS;
  } catch (error) {
    console.warn('[Charity Wall] تعذر قراءة الفئات من الخادم:', error);
    throw error;
  }
}

export async function loadBricks(onPage) {
  const out = [];
  let last = null;
  while (true) {
    let q = query(collection(db, 'bricks'), orderBy('index', 'asc'), limit(PAGE));
    if (last) q = query(collection(db, 'bricks'), orderBy('index', 'asc'), startAfter(last), limit(PAGE));
    const snap = assertServerSnapshot(
      await withTimeout(getDocsFromServer(q), 12000, 'طوب الحائط'),
      'طوب الحائط'
    );
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    if (typeof onPage === 'function') onPage(out.length, snap.size);
    if (snap.size < PAGE) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return out;
}

export function subscribeNewBricks(afterIndex, cb, onError = () => {}) {
  const q = query(collection(db, 'bricks'), orderBy('index', 'desc'), limit(30));
  return onSnapshot(q, { includeMetadataChanges: true }, snap => {
    if (snap.metadata.fromCache) return;
    const fresh = [];
    snap.forEach(d => {
      const data = d.data();
      if (typeof data.index === 'number' && data.index > afterIndex) fresh.push({ id: d.id, ...data });
    });
    if (fresh.length) cb(fresh.sort((a, b) => a.index - b.index));
  }, error => {
    console.error('[Charity Wall] فشل الاشتراك اللحظي بالطوب:', error);
    onError(error);
  });
}

export function subscribeSummary(cb, onError = () => {}) {
  return onSnapshot(doc(db, 'settings', 'public_summary'), { includeMetadataChanges: true }, snap => {
    if (snap.metadata.fromCache) return;
    if (snap.exists()) cb(snap.data());
  }, error => {
    console.error('[Charity Wall] فشل الاشتراك بالملخص العام:', error);
    onError(error);
  });
}

export async function loadDonors() {
  const out = [];
  let last = null;
  while (true) {
    let q = query(collection(db, 'donors'), orderBy('name'), limit(PAGE));
    if (last) q = query(collection(db, 'donors'), orderBy('name'), startAfter(last), limit(PAGE));
    const snap = assertServerSnapshot(
      await withTimeout(getDocsFromServer(q), 12000, 'قائمة المتبرعين'),
      'قائمة المتبرعين'
    );
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    if (snap.size < PAGE) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return out;
}

export async function loadExpenses() {
  const out = [];
  let last = null;
  while (true) {
    let q = query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(PAGE));
    if (last) q = query(collection(db, 'expenses'), orderBy('date', 'desc'), startAfter(last), limit(PAGE));
    const snap = assertServerSnapshot(
      await withTimeout(getDocsFromServer(q), 12000, 'المصروفات'),
      'المصروفات'
    );
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    if (snap.size < PAGE) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return out;
}

export function brickStats(bricks, tiers) {
  const counts = {};
  (tiers || TIERS).forEach(t => { counts[t.id] = 0; });
  bricks.forEach(b => { if (counts[b.brickType] !== undefined) counts[b.brickType]++; });
  return counts;
}
