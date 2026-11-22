#!/usr/bin/env node
/**
 * migrate-center-state.mjs — ترحيل youthcenter/state (عقدة واحدة ضخمة) إلى مسارات center_* المستقلة،
 * ونقل توكن فيسبوك إلى مسار خاص center_private/facebook (لا يُقرأ علناً)،
 * ونقل karateSchedule إلى karate_academy/schedules.
 *
 * الأمان:
 *  - لا يحذف شيئاً. المسار القديم youthcenter/state يبقى كما هو كاحتياط (يمكنك حذفه يدوياً لاحقاً).
 *  - يرفض الكتابة فوق مسار موجود في الوجهة إلا مع --force.
 *  - يتحقق بعد النسخ من تطابق المحتوى (مقارنة JSON) ويكتب تقريراً في platform_meta/migrations/center_state.
 *  - --scrub-legacy-token (اختياري، بعد نجاح التحقق): يمحو fbToken فقط من youthcenter/state/meta
 *    لأن ذلك المسار ما زال مقروءاً علناً في القواعد الحالية.
 *  - --dry-run: عرض فقط.
 *
 * الاستخدام:
 *   npm i firebase-admin
 *   node migrate-center-state.mjs --key academia-service-account.json --dry-run
 *   node migrate-center-state.mjs --key academia-service-account.json
 *   node migrate-center-state.mjs --key academia-service-account.json --scrub-legacy-token
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

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(args.key, 'utf8'))),
  databaseURL: 'https://academia-e6d7b-default-rtdb.firebaseio.com'
});
const db = admin.database();

const MAP = {
  meta: 'center_settings', news: 'center_news', announcement: 'center_announcements', board: 'center_board',
  activities: 'center_activities', articles: 'center_articles', finance: 'center_finance',
  academies: 'center_academies', quickLinks: 'center_quickLinks', gallery: 'center_gallery'
};
const stable = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x))
  ? Object.keys(x).sort().reduce((o, key) => (o[key] = x[key], o), {}) : x);
// RTDB يحوّل المصفوفات إلى كائنات عند القراءة أحياناً؛ نطبّع للمقارنة
const norm = v => JSON.parse(stable(Array.isArray(v) ? Object.assign({}, v) : v));

if (args['scrub-legacy-token']) {
  const rep = (await db.ref('platform_meta/migrations/center_state').once('value')).val();
  if (!rep || rep.ok !== true) die('لا يوجد تقرير ترحيل ناجح؛ شغّل الترحيل أولاً ولا تمسح التوكن قبل التحقق.');
  const priv = (await db.ref('center_private/facebook/token').once('value')).val();
  const legacy = (await db.ref('youthcenter/state/meta/fbToken').once('value')).val();
  if (legacy && !priv) die('التوكن غير موجود في المسار الخاص؛ لن أمسحه من القديم.');
  await db.ref('youthcenter/state/meta/fbToken').set('');
  console.log('✓ تم مسح fbToken من youthcenter/state/meta');
  process.exit(0);
}

const legacy = (await db.ref('youthcenter/state').once('value')).val();
if (!legacy) die('youthcenter/state فارغ أو غير موجود — لا شيء للترحيل.');

const plan = [];
for (const [k, path] of Object.entries(MAP)) {
  if (legacy[k] === undefined) continue;
  let value = legacy[k];
  if (k === 'meta') { value = { ...legacy.meta }; delete value.fbToken; delete value.adminPassword; }
  plan.push({ path, value, key: k });
}
let fbToken = legacy.meta && legacy.meta.fbToken;
const sched = legacy.karateSchedule;
console.log('الخطة:');
plan.forEach(p => console.log(`  ${p.key.padEnd(14)} → ${p.path}`));
if (fbToken) console.log('  meta.fbToken   → center_private/facebook/token (خاص)');
if (sched) console.log('  karateSchedule → karate_academy/schedules');
if (args['dry-run']) { console.log('\n(dry-run) لم يُكتب شيء.'); process.exit(0); }

const report = { startedAt: Date.now(), items: {}, ok: true };
for (const p of plan) {
  const exists = (await db.ref(p.path).once('value')).exists();
  if (exists && !args.force) { console.log(`⏭  ${p.path} موجود — تخطي (استخدم --force للكتابة فوقه)`); report.items[p.path] = { skipped: true }; continue; }
  await db.ref(p.path).set(p.value);
  const back = (await db.ref(p.path).once('value')).val();
  const same = stable(norm(back)) === stable(norm(p.value));
  report.items[p.path] = { copied: true, verified: same };
  if (!same) report.ok = false;
  console.log(`${same ? '✓' : '✖'} ${p.path}`);
}
if (fbToken) {
  const cur = (await db.ref('center_private/facebook/token').once('value')).val();
  if (!cur || args.force) await db.ref('center_private/facebook/token').set(fbToken);
  const ok = (await db.ref('center_private/facebook/token').once('value')).val() === fbToken || !!cur;
  report.items['center_private/facebook/token'] = { copied: true, verified: ok };
  if (!ok) report.ok = false;
  console.log(`${ok ? '✓' : '✖'} center_private/facebook/token`);
}
if (sched) {
  const exists = (await db.ref('karate_academy/schedules').once('value')).exists();
  if (!exists || args.force) {
    const list = Array.isArray(sched) ? sched : Object.values(sched);
    const obj = {};
    list.filter(Boolean).forEach((x, i) => { obj['s' + String(i + 1).padStart(3, '0')] = { ...x, order: i, createdAt: Date.now() }; });
    await db.ref('karate_academy/schedules').set(obj);
    const n = Object.keys((await db.ref('karate_academy/schedules').once('value')).val() || {}).length;
    report.items['karate_academy/schedules'] = { copied: n, expected: list.filter(Boolean).length, verified: n === list.filter(Boolean).length };
    if (n !== list.filter(Boolean).length) report.ok = false;
    console.log(`${report.items['karate_academy/schedules'].verified ? '✓' : '✖'} karate_academy/schedules (${n})`);
  } else console.log('⏭  karate_academy/schedules موجود — تخطي');
}
report.finishedAt = Date.now();
await db.ref('platform_meta/migrations/center_state').set(report);
console.log(report.ok ? '\n✓ اكتمل الترحيل وتطابقت كل المسارات. المسار القديم لم يُحذف.' : '\n✖ توجد مسارات غير متطابقة — راجع التقرير في platform_meta/migrations/center_state');
process.exit(report.ok ? 0 : 2);
