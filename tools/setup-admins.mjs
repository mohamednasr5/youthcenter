#!/usr/bin/env node
/**
 * setup-admins.mjs — إنشاء/تحديث حسابات الإدارة في Firebase Authentication وتعيين صلاحيات كل قسم
 * (Custom Claims) التي تعتمد عليها قواعد database.rules.json.
 *
 * الأدوار (claims):
 *   ycAdmin    = مدير عام لكل الأقسام
 *   ycCenter   = المنصة الرئيسية      ycFootball = أكاديمية كرة القدم
 *   ycKarate   = أكاديمية الكاراتيه    ycPitch    = الملعب الخماسي
 *   ycKungfu   = أكاديمية الكونغ فو
 *
 * الاستخدام:
 *   npm i firebase-admin
 *   node setup-admins.mjs --key academia-service-account.json \
 *        --email admin@example.com --roles center,football,karate,pitch [--password "كلمة-سر-قوية"]
 *   node setup-admins.mjs --key sa.json --email pitch@example.com --roles pitch
 *   node setup-admins.mjs --key sa.json --email boss@example.com --roles all
 *   node setup-admins.mjs --key sa.json --email x@example.com --revoke      # إلغاء كل الصلاحيات
 *   node setup-admins.mjs --key sa.json --from-config   # ينشئ/يحدّث كل حسابات adminEmails في yc-auth-config.js
 *
 * ملاحظات:
 *  - فعّل Email/Password من Firebase Console ← Authentication ← Sign-in method أولاً.
 *  - إن لم تمرّر --password عند إنشاء حساب جديد تُولَّد كلمة مرور عشوائية وتُطبع مرة واحدة.
 *  - بعد تغيير الصلاحيات يلزم تسجيل خروج/دخول (أو انتظار تجديد التوكن) لتسري.
 *  - لا تُرفع مفاتيح الخدمة إلى GitHub.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const die = m => { console.error('✖', m); process.exit(1); };

const ROLE_CLAIM = { center: 'ycCenter', football: 'ycFootball', karate: 'ycKarate', kungfu: 'ycKungfu', pitch: 'ycPitch' };
if (!args.key) die('مفتاح الخدمة مطلوب: --key service-account.json');
if (!args['from-config'] && (!args.email || args.email === true)) die('البريد مطلوب: --email user@example.com (أو --from-config)');

/* قراءة قائمة adminEmails من yc-auth-config.js (وضع --from-config) */
function readConfigAdmins() {
  const configPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'yc-auth-config.js');
  const source = fs.readFileSync(configPath, 'utf8');
  const match = source.match(/adminEmails\s*:\s*(\[[\s\S]*?\])\s*\n?\s*\}?\s*;/);
  if (!match) die(`لم أجد adminEmails في ${configPath}`);
  let list;
  try { list = Function(`"use strict"; return (${match[1]});`)(); }
  catch (e) { die(`تعذر تفسير adminEmails: ${e.message}`); }
  if (!Array.isArray(list)) die('adminEmails يجب أن تكون قائمة');
  return list
    .map(item => (typeof item === 'string' ? { email: item, roles: 'all' } : item))
    .filter(item => item && item.email && String(item.email).includes('@'));
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(args.key, 'utf8'))),
  databaseURL: 'https://academia-e6d7b-default-rtdb.firebaseio.com'
});
const auth = admin.auth();

function claimsFromRoles(roles) {
  const claims = {};
  const list = Array.isArray(roles) ? roles : String(roles || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) die('حدّد --roles (center,football,karate,kungfu,pitch أو all) أو استخدم --revoke');
  if (list.includes('all')) claims.ycAdmin = true;
  for (const r of list) {
    if (r === 'all') continue;
    if (!ROLE_CLAIM[r]) die(`دور غير معروف: ${r}`);
    claims[ROLE_CLAIM[r]] = true;
  }
  return claims;
}

async function applyAccount(email, claims, passwordArg) {
  let user, generated = null;
  try {
    user = await auth.getUserByEmail(email);
    console.log('• الحساب موجود:', email, user.uid);
    if (passwordArg && passwordArg !== true) await auth.updateUser(user.uid, { password: String(passwordArg) });
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    const password = (passwordArg && passwordArg !== true) ? String(passwordArg) : (generated = crypto.randomBytes(12).toString('base64url'));
    if (password.length < 8) die('كلمة المرور يجب ألا تقل عن 8 أحرف');
    user = await auth.createUser({ email, password, emailVerified: true });
    console.log('• تم إنشاء الحساب:', email, user.uid);
  }
  await auth.setCustomUserClaims(user.uid, claims);
  await auth.revokeRefreshTokens(user.uid); // يفرض تجديد الجلسات بالصلاحيات الجديدة
  console.log('• الصلاحيات:', Object.keys(claims).length ? Object.keys(claims).join(', ') : '(لا شيء)');
  if (generated) console.log('• كلمة المرور المؤقتة (تُعرض مرة واحدة، غيّرها بعد أول دخول):', generated);
}

if (args['from-config']) {
  const admins = readConfigAdmins();
  if (!admins.length) die('قائمة adminEmails فارغة في yc-auth-config.js — أضف الإيميلات أولاً');
  for (const entry of admins) {
    await applyAccount(String(entry.email).trim().toLowerCase(), claimsFromRoles(entry.roles || 'all'), args.password);
  }
} else {
  const claims = args.revoke ? {} : claimsFromRoles(args.roles);
  await applyAccount(args.email, claims, args.password);
}
console.log('✓ تم');
process.exit(0);
