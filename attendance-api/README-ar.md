# نظام الحضور ومتابعة ولي الأمر — مركز شباب الأحمدية

يدعم النظام الأكاديميات الأربع:
- كرة القدم: `players` و`schedules`
- الكاراتيه: `karate_academy/players` و`karate_academy/schedules`
- الكونغ فو: `kungfu_academy/players` و`kungfu_academy/schedules`
- الإنشاد: `nasheed_academy/players` و`nasheed_academy/schedules`

## البنية

- `attendance-api/worker.js`: واجهة Worker للتحقق من الإدارة وحساب ولي الأمر وسجلات الحضور.
- `attendance-portal/`: بوابة ولي الأمر، وأدوات الحضور في لوحات الأكاديميات، وإدارة رموز المتابعة في لوحة المركز.
- بيانات الأكاديميات الأساسية تبقى في Firebase Realtime Database.
- أرقام أولياء الأمور وربطهم باللاعبين والرموز والجلسات وسجلات الحضور تحفظ في Durable Object خاص بالـ Worker، ولا تضاف إلى مسارات Firebase العامة.

## ربط Cloudflare Workers Builds

من مستودع `mohamednasr5/youthcenter` اختر الفرع:
`feature/attendance-guardian-portal`

الإعدادات:
- Root directory: جذر المستودع.
- Build command: `npm install` (لتثبيت Wrangler المحدد في package.json).
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler preview`
- ملف الإعداد: `wrangler.toml` في جذر المستودع.

بعد النشر سيظهر عنوان Worker على نطاق `workers.dev`. أضف العنوان إلى:
`attendance-portal/config.js`
بوضعه كقيمة `window.YC_ATTENDANCE_API` مع حذف الشرطة المائلة الأخيرة. يجب أن يكون العنوان على HTTPS.

## نشر قواعد Firebase

ملف `database.rules.json` يتضمن صلاحية القراءة العامة لبيانات فريق الإنشاد فقط، مع حصر الكتابة في حسابات الإدارة ذات Custom Claim الصحيح. مسارات أرقام أولياء الأمور والحضور لا تُضاف إلى Firebase.

لنشر القواعد وتحديث صلاحيات الإدارة:
1. تأكد من وجود GitHub Actions Secret باسم `FIREBASE_SERVICE_ACCOUNT_JSON` لخدمة مشروع `academia-e6d7b`.
2. افتح GitHub Actions.
3. اختر Workflow: `Deploy attendance database rules`.
4. اضغط Run workflow واختر الفرع `feature/attendance-guardian-portal`.
5. انتظر نجاح الخطوات كلها قبل تجربة لوحة الإنشاد.

هذا الـ Workflow ينشر قواعد قاعدة البيانات فقط ولا يعيد تهيئة حسابات الإدارة أو يبطل جلساتها. لا تستخدم Workflow القديم `Provision Firebase admins and deploy database rules` لهذا الغرض إلا عندما تريد أيضًا إعادة تعيين صلاحيات الحسابات؛ لأنه يجدد صلاحيات Custom Claims ويبطل جلسات تسجيل الدخول الحالية.

لا ترفع ملف Service Account إلى GitHub ولا ترسله في المحادثة.

## تهيئة أولياء الأمور

1. من لوحة الأكاديمية افتح قسم الحضور.
2. اختر اللاعب وأدخل رقم هاتف ولي الأمر بصيغة مصرية.
3. من لوحة المركز افتح «الحضور وأولياء الأمور».
4. أدخل الرقم نفسه وأنشئ رمزًا من 6 إلى 16 حرفًا أو رقمًا، ثم سلّمه لولي الأمر.
5. عند تغيير الرمز أو إلغائه تُرفض الجلسات القديمة مباشرة.

يمكن ربط رقم واحد بعدة لاعبين، حتى عبر أكاديميات مختلفة.

## الاختبار قبل الإطلاق

- اختبر `/api/health` من عنوان Worker.
- جرّب دخول إدارة مركز وحساب إدارة أكاديمية، وتأكد من رفض الحساب غير المصرح له.
- اربط رقم اختبار بلاعب في كل أكاديمية من الأربع.
- أنشئ رمز متابعة تجريبيًا، ثم تحقق أن ولي الأمر يرى اللاعبين المرتبطين بالرقم فقط.
- نفذ دخولًا وخروجًا عبر QR وتحقق من المدد والحالات.
- غيّر الرمز ثم جرّب الرمز القديم؛ يجب أن يُرفض.
- جرّب رقمًا واحدًا مرتبطًا بأكثر من لاعب وبأكثر من أكاديمية.

لا تعتبر الخدمة جاهزة للإنتاج قبل نجاح هذه الاختبارات بعد نشر Worker وقواعد Firebase.
