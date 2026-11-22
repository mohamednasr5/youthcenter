#!/usr/bin/env node
/**
 * backfill-availability.mjs — إنشاء النسخة العامة المصغّرة pitch_booking/availability
 * من الحجوزات القائمة pitch_booking/bookings (بدون هاتف العميل أو ملاحظاته أو مدفوعاته).
 *
 * متى تشغّله؟ مرة واحدة بعد دمج تغييرات فصل الخصوصية وقبل نشر database.rules.json
 * (انظر CUTOVER.md). آمن لإعادة التشغيل: يعيد كتابة النسخ العامة بنفس المحتوى.
 *
 * الاستخدام:
 *   npm i firebase-admin
 *   node tools/backfill-availability.mjs --key sa.json --dry-run   # معاينة فقط
 *   node tools/backfill-availability.mjs --key sa.json             # تنفيذ
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const die = m => { console.error('✖', m); process.exit(1); };
if (!args.key) die('مفتاح الخدمة مطلوب: --key service-account.json');

const PUBLIC_FIELDS = [
  'bookingId', 'date', 'startTime', 'endTime', 'durationMinutes',
  'startTimestamp', 'endTimestamp', 'period', 'status', 'matchType',
  'customerName', 'teamOneName', 'teamTwoName', 'teamOneCaptain', 'teamTwoCaptain'
];

function stubFrom(booking, fallbackId) {
  const stub = {};
  for (const key of PUBLIC_FIELDS) if (booking[key] !== undefined) stub[key] = booking[key];
  if (!stub.bookingId) stub.bookingId = fallbackId;
  stub.status = stub.status || 'pending';
  stub.updatedAt = Date.now();
  return stub;
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(args.key, 'utf8'))),
  databaseURL: 'https://academia-e6d7b-default-rtdb.firebaseio.com'
});
const db = admin.database();

const snap = await db.ref('pitch_booking/bookings').once('value');
const bookings = snap.val() || {};
const updates = {};
let count = 0;
for (const [date, dayBookings] of Object.entries(bookings)) {
  for (const [id, booking] of Object.entries(dayBookings || {})) {
    if (!booking) continue;
    updates[`pitch_booking/availability/${date}/${id}`] = stubFrom(booking, id);
    count++;
  }
}
console.log(`• وجدت ${count} حجزاً عبر ${Object.keys(bookings).length} يوم`);
if (args['dry-run']) {
  console.log('• معاينة فقط (--dry-run): لن تُكتب أي بيانات. أمثلة:');
  Object.keys(updates).slice(0, 3).forEach(k => console.log('  ', k));
  process.exit(0);
}
if (count) await db.ref().update(updates);
console.log(`✓ تمت كتابة ${count} سجل توفر عام. يمكن الآن نشر القواعد: firebase deploy --only database`);
process.exit(0);
