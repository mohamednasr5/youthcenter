/* firebase-config.js — إعداد Firebase لحائط الخير + تعريف فئات الطوب
   يستخدم نفس مشروع المنصة الموحّد (academia-e6d7b) مع Firestore و Storage و Authentication.
   تُحمَّل الوحدات من gstatic CDN (نفس النسخة المستخدمة في حجز الملعب 10.12.0). */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

/* ─── إعداد المشروع (نفس مشروع المنصة) ─── */
export const firebaseConfig = {
  apiKey: 'AIzaSyDJYIKnZNBMZuXhVAhP4irqjLuzP4jQ16g',
  authDomain: 'academia-e6d7b.firebaseapp.com',
  databaseURL: 'https://academia-e6d7b-default-rtdb.firebaseio.com',
  projectId: 'academia-e6d7b',
  storageBucket: 'academia-e6d7b.firebasestorage.app',
  messagingSenderId: '679214276618',
  appId: '1:679214276618:web:f34c9e48d83e338facfff3',
  measurementId: 'G-ME9ZF20CZ0'
};

/* ─── تهيئة الخدمات ─── */
export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const auth = getAuth(app);
export const storage = getStorage(app);

/* ─── فئات الطوب (الحدود بالجنيه المصري) ───
   clay  : أقل من 1000            → طوب طين
   red   : من 1000 إلى أقل من 3000 → طوب أحمر
   silver: من 3000 إلى أقل من 5000 → طوب فضي
   gold  : من 5000 إلى 10000      → طوب ذهبي
   diamond: أكثر من 10000          → طوب ماسي
   يمكن للمسؤول تعديل المسميات/الحدود من لوحة التحكم (settings/tiers)
   وتُطبَّق الحدود الجديدة عبر دالة "إعادة الاحتساب" في Cloud Functions. */
export const TIERS = [
  { id: 'clay',    label: 'طين',   color: 0xa0714f, cssColor: '#a0714f', min: 0,     max: 999.99,
    metalness: 0.0, roughness: 0.92, emissive: 0x1a0f08, text: '#ffe9d6', order: 1 },
  { id: 'red',     label: 'حمراء', color: 0xb3432c, cssColor: '#b3432c', min: 1000,  max: 2999.99,
    metalness: 0.05, roughness: 0.72, emissive: 0x2a0a05, text: '#ffe2da', order: 2 },
  { id: 'silver',  label: 'فضية',  color: 0xc9d2dd, cssColor: '#c9d2dd', min: 3000,  max: 4999.99,
    metalness: 0.95, roughness: 0.22, emissive: 0x0d1118, text: '#101828', order: 3 },
  { id: 'gold',    label: 'ذهبية', color: 0xf0b542, cssColor: '#f0b542', min: 5000,  max: 10000,
    metalness: 1.0, roughness: 0.18, emissive: 0x4a2e00, text: '#2b1a00', order: 4 },
  { id: 'diamond', label: 'ماسية', color: 0xd9f4ff, cssColor: '#d9f4ff', min: 10000.01, max: Infinity,
    metalness: 0.55, roughness: 0.04, emissive: 0x123244, text: '#062033', order: 5 }
];

export const TIER_IDS = TIERS.map(t => t.id);

/* تحديد الفئة من إجمالي التبرعات المعتمدة (تُعاد الحسابات دائمًا على الخادم) */
export function tierForAmount(total, tiersOverride) {
  const list = tiersOverride || TIERS;
  const t = list.find(x => total >= x.min && total <= x.max);
  return t ? t.id : 'clay';
}

export function tierById(id, tiersOverride) {
  const list = tiersOverride || TIERS;
  return list.find(x => x.id === id) || list[0];
}

/* تنسيق المبالغ بالجنيه المصري بالأرقام العربية الشرقية */
export function egp(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('ar-EG', { maximumFractionDigits: 0 }) + ' ج.م';
}

/* تنسيق التاريخ بالعربية */
export function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}
