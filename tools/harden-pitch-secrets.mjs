#!/usr/bin/env node
/**
 * harden-pitch-secrets.mjs — ينقل أسرار الملعب من pitch_booking/settings (مقروءة علناً) إلى pitch_private/ (خاص):
 *   settings/adminHash        → pitch_private/adminHash          (هاش الدخول القديم)
 *   settings/telegramBotToken → pitch_private/telegramBotToken
 * الخطوات: نسخ ← تحقق ← (مع --remove-old) مسح القيمة القديمة من settings. لا يمسح قبل التحقق.
 *   node harden-pitch-secrets.mjs --key academia-service-account.json [--dry-run] [--remove-old]
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
if (!args.key) { console.error('✖ --key مطلوب'); process.exit(1); }
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(args.key, 'utf8'))),
  databaseURL: 'https://academia-e6d7b-default-rtdb.firebaseio.com'
});
const db = admin.database();
let failed = false;
for (const k of ['adminHash', 'telegramBotToken']) {
  const old = (await db.ref(`pitch_booking/settings/${k}`).once('value')).val();
  const cur = (await db.ref(`pitch_private/${k}`).once('value')).val();
  if (!old && !cur) { console.log(`• ${k}: غير موجود`); continue; }
  if (args['dry-run']) { console.log(`• ${k}: سيُنقل (${old ? 'موجود في settings' : 'موجود في private'})`); continue; }
  if (old && !cur) await db.ref(`pitch_private/${k}`).set(old);
  const now = (await db.ref(`pitch_private/${k}`).once('value')).val();
  const ok = !!now && (!old || now === old);
  console.log(`${ok ? '✓' : '✖'} ${k} → pitch_private/${k}`);
  if (!ok) { failed = true; continue; }
  if (args['remove-old'] && old) { await db.ref(`pitch_booking/settings/${k}`).remove(); console.log(`  ↳ تم مسح settings/${k}`); }
}
process.exit(failed ? 2 : 0);
