# خطوات التفعيل الآمن (بالترتيب — لا تنشر القواعد قبل الخطوة 4)

المتطلبات: `npm i firebase-admin` + مفتاح Service Account لمشروع academia-e6d7b (لا يُرفع إلى GitHub).

1. Firebase Console ← Authentication ← فعّل Email/Password.
2. أضف إيميلات الإدارة في `yc-auth-config.js` (قائمة `adminEmails` مع أدوارها)، ثم أنشئ الحسابات:
   `node tools/setup-admins.mjs --key sa.json --from-config`
   (أو حساب واحد: `--email you@x.com --roles all` / `--roles pitch` / `karate` / `football` / `center`)
3. رحّل بيانات المنصة وسرّ فيسبوك:
   `node tools/migrate-center-state.mjs --key sa.json --dry-run` ثم بدون `--dry-run`
   وانقل أسرار الملعب: `node tools/harden-pitch-secrets.mjs --key sa.json` ثم `--remove-old` بعد التحقق.
   (ترحيل الملعب من القاعدة القديمة: `tools/migrate-pitch-db.mjs` — `--dry-run` أولاً.)
4. أنشئ النسخة العامة المصغّرة من الحجوزات (فصل بيانات العملاء الخاصة عن المواعيد العامة):
   `node tools/backfill-availability.mjs --key sa.json --dry-run` ثم بدون `--dry-run`
   بعدها تقرأ الصفحات العامة من `pitch_booking/availability` وتصبح `pitch_booking/bookings` للإدارة فقط.
5. جرّب الدخول بالبريد في اللوحات الأربع (يظهر حقل البريد في كل شاشة دخول).
6. في `yc-auth-config.js` غيّر `requireFirebase` إلى `true`.
7. انشر القواعد: `firebase deploy --only database` من جذر المشروع (اختبرها بالـ Emulator أولاً).
   تحذير: بعد هذه الخطوة لا تُقرأ `pitch_booking/bookings` إلا بحساب إداري — لا تنشر قبل الخطوة 4.
8. بعد التأكد: `node tools/migrate-center-state.mjs --key sa.json --scrub-legacy-token`.
تراجع: أعد القواعد السابقة من Console ← Realtime Database ← Rules ← History.
