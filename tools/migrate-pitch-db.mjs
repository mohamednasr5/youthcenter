#!/usr/bin/env node
/**
 * migrate-pitch-db.mjs — ترحيل بيانات الملعب الخماسي من قاعدة hagz-a49fa
 * إلى القاعدة الموحدة academia-e6d7b تحت العقدة pitch_booking/.
 *
 * الأمان:
 *  - لا يحذف أي شيء من القاعدة القديمة إطلاقاً (قراءة فقط).
 *  - يرفض الكتابة فوق عقدة موجودة مسبقاً في الوجهة إلا مع --force.
 *  - يتحقق بعد النسخ من تطابق عدد السجلات لكل عقدة، ويكتب تقريراً في
 *    platform_meta/migrations/pitch_booking.
 *  - --dry-run يعرض الأعداد فقط دون أي كتابة.
 *
 * الاستخدام:
 *   npm i firebase-admin
 *   node migrate-pitch-db.mjs --src-key old-hagz-service-account.json \
 *                             --dst-key academia-service-account.json [--dry-run] [--force]
 * أو من ملف تصدير JSON من وحدة تحكم Firebase القديمة:
 *   node migrate-pitch-db.mjs --src-json hagz-export.json --dst-key academia-service-account.json
 *
 * ملاحظة: يلزم مفتاح خدمة (Service Account) لكل قاعدة — لا يُرفع المفتاح إلى GitHub.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));

const SRC_URL = 'https://hagz-a49fa-default-rtdb.firebaseio.com';
const DST_URL = 'https://academia-e6d7b-default-rtdb.firebaseio.com';
const DST_ROOT = 'pitch_booking';
// عقد مجمّعة بالتاريخ: العدّ = مجموع السجلات داخل كل تاريخ
const DATED = ['bookings', 'expenses', 'matchResults'];
const FLAT = ['settings', 'payments', 'telegramSubscribers', 'auditLogs', 'adminUsers', 'telegramResultSessions'];

const count = (node, dated) => {
  if (node == null) return 0;
  if (typeof node !== 'object') return 1;
  if (!dated) return Object.keys(node).length;
  return Object.values(node).reduce((n, day) => n + (day && typeof day === 'object' ? Object.keys(day).length : 1), 0);
};
const die = (m) => { console.error('✖', m); process.exit(1); };

function init(name, keyPath, url) {
  if (!keyPath) die(`مفتاح الخدمة مطلوب: --${name === 'dst' ? 'dst-key' : 'src-key'}`);
  const cred = admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8')));
  return admin.initializeApp({ credential: cred, databaseURL: url }, name).database();
}

const dst = init('dst', args['dst-key'], DST_URL);
let source = {};
if (args['src-json']) {
  source = JSON.parse(fs.readFileSync(args['src-json'], 'utf8'));
} else {
  const src = init('src', args['src-key'], SRC_URL);
  for (const k of [...DATED, ...FLAT]) source[k] = (await src.ref(k).once('value')).val();
}

const report = { startedAt: new Date().toISOString(), dryRun: !!args['dry-run'], nodes: {} };
for (const k of [...DATED, ...FLAT]) {
  const srcCount = count(source[k], DATED.includes(k));
  const existing = (await dst.ref(`${DST_ROOT}/${k}`).once('value')).val();
  report.nodes[k] = { source: srcCount, existingAtDestination: count(existing, DATED.includes(k)) };
  console.log(`${k.padEnd(24)} المصدر: ${String(srcCount).padStart(6)}   الوجهة الحالية: ${report.nodes[k].existingAtDestination}`);
  if (args['dry-run'] || source[k] == null) continue;
  if (existing != null && !args.force) { console.warn(`  ⚠ تخطّي ${k}: توجد بيانات في الوجهة (استخدم --force للدمج).`); report.nodes[k].skipped = true; continue; }
  // update() يدمج ولا يحذف سجلات الوجهة الأخرى
  await dst.ref(`${DST_ROOT}/${k}`).update(source[k]);
}

if (!args['dry-run']) {
  let ok = true;
  for (const k of [...DATED, ...FLAT]) {
    if (source[k] == null) continue;
    const after = (await dst.ref(`${DST_ROOT}/${k}`).once('value')).val();
    const got = count(after, DATED.includes(k));
    const want = report.nodes[k].source;
    report.nodes[k].destinationAfter = got;
    report.nodes[k].match = got >= want;
    if (!report.nodes[k].match) ok = false;
    console.log(`${ok && got >= want ? '✔' : '✖'} تحقق ${k}: ${got} / ${want}`);
  }
  report.finishedAt = new Date().toISOString();
  report.allMatched = ok;
  await dst.ref('platform_meta/migrations/pitch_booking').set(report);
  console.log(ok ? '\n✔ تم الترحيل وتطابقت الأعداد. القاعدة القديمة لم تُلمس — لا تحذفها قبل مراجعة الموقع.' : '\n✖ يوجد اختلاف في الأعداد — راجع التقرير ولا تحذف شيئاً.');
  process.exit(ok ? 0 : 2);
}
process.exit(0);
