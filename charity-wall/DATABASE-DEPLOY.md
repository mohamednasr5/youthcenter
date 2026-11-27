# إصلاح ربط قاعدة بيانات حائط الخير

## سبب المشكلة
حائط الخير يستخدم Firebase Realtime Database على المسار `charityWall/` داخل مشروع Firebase `academia-e6d7b`.
ملف قواعد قاعدة البيانات الأساسي في جذر المستودع هو `database.rules.json`، وكان لا يحتوي على قواعد `charityWall`؛ لذلك كانت قاعدة البيانات ترفض قراءة بيانات الحائط حتى مع صحة رابط قاعدة البيانات في `charity-wall/firebase-config.js`.

## الملف الذي تم تحديثه
- `database.rules.json` — أضيفت قواعد القراءة العامة للطوب والمتبرعين والمصروفات والملخص وفئات الطوب، مع إبقاء التبرعات والبيانات الخاصة والسجلات والمفاتيح الإدارية مقيدة بالمسؤولين.
- `charity-wall/app.js` — الحفاظ على رسالة الخطأ الأصلية بدل استبدالها برسالة عامة.
- `charity-wall/sw.js` — تحديث رقم الكاش حتى لا تستمر نسخة PWA القديمة.

## أوامر النشر
نفّذ الأوامر من المجلد الرئيسي للمستودع، حيث يوجد ملف `firebase.json` الرئيسي:

```bash
firebase login
firebase deploy --only database --project academia-e6d7b
```

لنشر وظائف حائط الخير السحابية عند الحاجة، نفّذ من مجلد المشروع الفرعي:

```bash
cd charity-wall
npm --prefix functions install
firebase deploy --only functions --project academia-e6d7b
```

## تنبيه مهم
- قاعدة البيانات هنا Firebase Realtime Database وليست Firestore؛ لا يوجد ملف SQL أو أوامر SQL لهذا الجزء.
- لا تنفّذ `firebase deploy --only database` من داخل مجلد `charity-wall`؛ لأن ملف `charity-wall/firebase.json` يشير إلى قواعد فرعية، وقد يؤدي نشرها كقواعد جذرية إلى استبدال قواعد بقية أقسام الموقع.
- لا تفتح الكتابة العامة. تظل عمليات الكتابة مقيدة بحسابات الإدارة المعتمدة.
- بعد نشر القواعد، افتح صفحة حائط الخير ثم نفّذ تحديثًا قسريًا `Ctrl + F5`. إذا استمر الخطأ، ستعرض الصفحة الآن تفاصيل Firebase الفعلية للمساعدة في التشخيص.
