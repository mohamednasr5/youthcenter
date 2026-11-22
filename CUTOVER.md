# خطوات التفعيل الآمن (بالترتيب — لا تنشر القواعد قبل الخطوة 4)

المتطلبات: `npm i firebase-admin` + مفتاح Service Account لمشروع academia-e6d7b (لا يُرفع إلى GitHub).

1. Firebase Console ← Authentication ← فعّل Email/Password.
2. أنشئ الحسابات:
   `node tools/setup-admins.mjs --key sa.json --email you@x.com --roles all`
   (أو أدوار محددة: `--roles pitch` / `karate` / `football` / `center`)
3. رحّل بيانات المنصة وسرّ فيسبوك:
   `node tools/migrate-center-state.mjs --key sa.json --dry-run` ثم بدون `--dry-run`
   وانقل أسرار الملعب: `node tools/harden-pitch-secrets.mjs --key sa.json` ثم `--remove-old` بعد التحقق.
   (ترحيل الملعب من القاعدة القديمة: `tools/migrate-pitch-db.mjs` — `--dry-run` أولاً.)
4. جرّب الدخول بالبريد في اللوحات الأربع (يظهر حقل البريد في كل شاشة دخول).
5. في `yc-auth-config.js` غيّر `requireFirebase` إلى `true`.
6. انشر القواعد: `firebase deploy --only database` من جذر المشروع (اختبرها بالـ Emulator أولاً).
7. بعد التأكد: `node tools/migrate-center-state.mjs --key sa.json --scrub-legacy-token`.
تراجع: أعد القواعد السابقة من Console ← Realtime Database ← Rules ← History.
