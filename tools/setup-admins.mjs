#!/usr/bin/env node
/**
 * setup-admins.mjs — إنشاء/تحديث حسابات الإدارة في Firebase Authentication وتعيين صلاحيات كل قسم
 * (Custom Claims) التي تعتمد عليها قواعد database.rules.json.
 *
 * الأدوار (claims):
 *   ycAdmin    = مدير عام لكل الأقسام
 *   ycCenter   = المنصة الرئيسية      ycFootball = أكاديمية كرة القدم
 *   ycKarate   = أكاديمية الكاراتيه    ycPitch    = الملعب الخماسي
 *
 * الاستخدام:
 *   npm i firebase-admin
 *   node setup-admins.mjs --key academia-service-account.json \
 *        --email admin@example.com --roles center,football,karate,pitch [--password "كلمة-سر-قوية"]
 *   node setup-admins.mjs --key sa.json --email pitch@example.com --roles pitch
 *   node setup-admins.mjs --key sa.json --email boss@example.com --roles all
 *   node setup-admins.mjs --key sa.json --email x@example.com --revoke      # إلغاء كل الصلاحيات
 *
 * ملاحظات:
 *  - فعّل Email/Password من Firebase Console ← Authentication ← Sign-in method أولاً.
 *  - إن لم تمرّر --password عند إنشاء حساب جديد تُولَّد كلمة مرور عشوائية وتُطبع مرة واحدة.
 *  - بعد تغيير الصلاحيات يلزم تسجيل خروج/دخول (أو انتظار تجديد التوكن) لتسري.
 *  - لا تُرفع مفاتيح الخدمة إلى GitHub.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const die = m => { console.error('✖', m); process.exit(1); };

const ROLE_CLAIM = { center: 'ycCenter', football: 'ycFootball', karate: 'ycKarate', pitch: 'ycPitch' };
if (!args.key) die('مفتاح الخدمة مطلوب: --key service-account.json');
if (!args.email || args.email === true) die('البريد مطلوب: --email user@example.com');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(args.key, 'utf8'))),
  databaseURL: 'https://academia-e6d7b-default-rtdb.firebaseio.com'
});

let claims = {};
if (!args.revoke) {
  const roles = String(args.roles || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!roles.length) die('حدّد --roles (center,football,karate,pitch أو all) أو استخدم --revoke');
  if (roles.includes('all')) claims.ycAdmin = true;
  for (const r of roles) {
    if (r === 'all') continue;
    if (!ROLE_CLAIM[r]) die(`دور غير معروف: ${r}`);
    claims[ROLE_CLAIM[r]] = true;
  }
}

const auth = admin.auth();
let user, generated = null;
try {
  user = await auth.getUserByEmail(args.email);
  console.log('• الحساب موجود:', user.uid);
  if (args.password && args.password !== true) await auth.updateUser(user.uid, { password: String(args.password) });
} catch (e) {
  if (e.code !== 'auth/user-not-found') throw e;
  const password = (args.password && args.password !== true) ? String(args.password) : (generated = crypto.randomBytes(12).toString('base64url'));
  if (password.length < 8) die('كلمة المرور يجب ألا تقل عن 8 أحرف');
  user = await auth.createUser({ email: args.email, password, emailVerified: true });
  console.log('• تم إنشاء الحساب:', user.uid);
}
await auth.setCustomUserClaims(user.uid, claims);
await auth.revokeRefreshTokens(user.uid); // يفرض تجديد الجلسات بالصلاحيات الجديدة
console.log('• الصلاحيات:', Object.keys(claims).length ? Object.keys(claims).join(', ') : '(لا شيء)');
if (generated) console.log('• كلمة المرور المؤقتة (تُعرض مرة واحدة، غيّرها بعد أول دخول):', generated);
console.log('✓ تم');
process.exit(0);
