# 🧱 حائط الخير | مركز شباب الأحمدية

حائط بناء ثلاثي الأبعاد تفاعلي، كل طوبة تحمل اسم متبرع حقيقي، مع نظام مالي شفاف يوضح «أين ذهب كل جنيه؟».

- **الواجهة**: HTML5 + CSS3 + Vanilla JavaScript + Three.js (مضمنة محليًا في `vendor/`) + GSAP (محلي).
- **الخلفية**: Firebase Authentication (مسؤولو المنصة) + Cloud Firestore (المتبرعون/التبرعات/الطوب/المصروفات) + Firebase Storage (الفواتير والصور).
- **الأمان**: كل العمليات المالية (تسجيل/اعتماد/رفض التبرعات، المصروفات، تحديث الإجماليات) تُنفَّذ على الخادم عبر **Cloud Functions** — لا يُعتمد على المتصفح إطلاقًا في الحسابات المالية.
- **الاستضافة**: Static Hosting عادي أو Firebase Hosting. لا يحتاج أي خادم خاص.

---

## 📁 هيكل المجلد

```
charity-wall/
├── index.html            # صفحة الحائط (3D + الشفافية)
├── style.css
├── app.js                # منسّق الصفحة
├── firebase-config.js    # إعداد Firebase + فئات الطوب
├── firebase-service.js   # قراءة البيانات على دفعات + استماع لحظي
├── wall-3d.js            # مشهد Three.js: الحائط + الهرم + الخامات + الكاميرا
├── animations.js         # حركات GSAP: طيران الطوبة + الغبار + الفرقعة
├── sounds.js             # مؤثرات WebAudio مركّبة برمجيًا + زر كتم
├── donors.js             # يد الخير: قائمة المتبرعين + بحث + فلترة
├── expenses.js           # قسم الشفافية + الرسوم البيانية
├── embed.js              # النموذج المصغر للصفحة الرئيسية للمنصة
├── manifest.json + sw.js # PWA خاص بالحائط (يعمل دون اتصال بالكاش المحلي)
├── admin/                # لوحة التحكم (تسجيل دخول Firebase Auth)
├── assets/icons/         # أيقونات PWA
├── vendor/               # three.module.js + gsap.min.js (محلي — دون CDN)
├── functions/            # Cloud Functions (العمليات المالية الآمنة)
├── firestore.rules       # قواعد حماية قاعدة البيانات
├── storage.rules         # قواعد حماية ملفات الفواتير والصور
└── firebase.json         # إعداد hosting + rules + functions
```

## 🗄️ بنية Firestore

| المجموعة | الحقول | الوصف |
|---|---|---|
| `donors` | name, totalDonation, brickType, createdAt | بيانات عامة (قراءة للجميع) |
| `donors_private` | phone, notes | بيانات تواصل — مسؤول فقط |
| `donations` | donorId, donorName, amount, date, status (pending/approved/rejected), paymentMethod, transactionId, approvedBy… | مسؤول فقط — تُكتب عبر Cloud Functions |
| `bricks` | donorId, donorName, totalDonation, brickType, row, column, index, createdAt | عامة القراءة — تُنشأ عند الاعتماد فقط |
| `expenses` | title, description, category, amount, date, receiptUrl, images[], approvedBy | عامة (الشفافية) |
| `settings` | public_summary / counters / tiers / admins | الملخص والفئات وقائمة المصرَّح لهم |
| `adminLogs` | actor, action, details, ts | مسؤول فقط، لا يُحذف من المتصفح |

**إجمالي تبرعات كل متبرع يُحسب من التبرعات «المعتمدة» فقط، وعلى الخادم.**

### فئات الطوب (حسب الإجمالي المعتمد)
| المبلغ | الفئة |
|---|---|
| أقل من 1000 ج.م | طين |
| 1000 – أقل من 3000 | حمراء |
| 3000 – أقل من 5000 | فضية |
| 5000 – 10000 | ذهبية |
| أكثر من 10000 | ماسية |

---

## 🚀 خطوات التشغيل والنشر

> المشروع يستخدم نفس مشروع Firebase الموحّد للمنصة (`academia-e6d7b`) — الإعداد موجود مسبقًا في `firebase-config.js`.

### 1) تفعيل الخدمات من Firebase Console (مرة واحدة)
1. **Firestore Database**: أنشئ قاعدة بيانات (Production mode).
2. **Storage**: فعّل التخزين.
3. **Authentication**: Sign-in method ← Email/Password.

### 2) إنشاء حسابات المسؤولين
من جذر المشروع (الأداة موجودة مسبقًا وتقرأ `yc-auth-config.js`):
```bash
npm i firebase-admin
node tools/setup-admins.mjs --key academia-service-account.json --from-config
```
هذا ينشئ الحسابات ويعيّن صلاحية `ycAdmin` (Custom Claims) التي تعتمد عليها القواعد والدوال.
> لتسريح بريد إضافي في حائط الخير فقط: أضفه من تبويب «فئات الطوب ← المصرَّح لهم» (يُخزَّن في `settings/admins` وتقبله الدوال).

### 3) نشر Cloud Functions (ضروري لاعتماد التبرعات)
يتطلب خطة Blaze (الكمية المجانية تكفي لبداية التشغيل):
```bash
cd charity-wall/functions && npm install
cd .. && firebase deploy --only functions
```
الدوال: `cwAddDonor, cwUpdateDonor, cwRecordDonation, cwApproveDonation, cwRejectDonation, cwAddExpense, cwDeleteExpense, cwRecalcAll`.

### 4) نشر قواعد الحماية
```bash
cd charity-wall
firebase deploy --only firestore:rules,storage:rules
```

### 5) النشر على Firebase Hosting
```bash
firebase deploy --only hosting
```
أو ارفع مجلد `charity-wall/` على أي Static Hosting (GitHub Pages، Netlify…) مع الحفاظ على مساره `charity-wall/` داخل المستودع.

### 6) أول تشغيل عملي
1. افتح `charity-wall/admin/index.html` وسجّل الدخول بحساب مسؤول.
2. تبويب **المتبرعون** ← أضف متبرعًا.
3. تبويب **التبرعات** ← سجّل مبلغًا ثم اضغط **اعتماد**.
4. افتح `charity-wall/index.html` — سترى الطوبة تطير من الهرم إلى موضعها، وتبقى بعد إعادة التحميل.
5. تبويب **المصروفات** ← أضف مصروفًا مع صورة الفاتورة — يظهر فورًا في «أين ذهب كل جنيه؟».

---

## 🧪 وضع المعاينة
افتح `charity-wall/index.html?test=1` لمعاينة المشهد ثلاثي الأبعاد بطوبات عرض مؤقتة (شريط أحمر واضح أعلى الشاشة) — **لا يُكتب شيء إلى Firebase ولا تُعدّ هذه بيانات حقيقية**. مفيد للتحقق من الأداء قبل أول تبرع.

## 🖼️🎵 الأصول الوسائطية (assets/textures و assets/sounds)

كل شيء يعمل **بدون أي ملفات** افتراضيًا: الخامات تُولَّد برمجيًا والأصوات تُركَّب عبر WebAudio. المجلدان لمن يريد ترقية الواقعية بأصول حقيقية — والحائط يستخدمها تلقائيًا إذا وجدها، ويعود للوضع البرمجي بهدوء إذا غابت.

### assets/textures — الخامات (مضمنة أصلًا ✅)
مضمّنة بالفعل من **Poly Haven** (رخصة CC0 — استخدام تجاري بلا نسب مصدر):
| الملف | يستخدم لـ |
|---|---|
| `brick_wall.jpg` | لون طوب الطين والأحمر |
| `brick_wall_bump.jpg` | نتوءات سطح الطوب |
| `concrete.jpg` | لوح الأسمنت والقاعدة الخرسانية |
| `concrete_bump.jpg` | نتوءات الخرسانة |

الاستبدال: ضع ملفًا بنفس الاسم فوقه وسيعمل فورًا. لبدائل إضافية (رخام، طوب قديم، صدأ…):
- **Poly Haven** — https://polyhaven.com/ ‏(CC0، تحققنا منها: مجانية بلا تسجيل)
- **ambientCG** — https://ambientcg.com/ ‏(مكتبة PBR شهيرة برخصة CC0 — تعذّر فتحها من بيئة العمل هذه لكنها معروفة بهذا الترخيص)

### assets/sounds — الأصوات (اختيارية)
ضع ملفاتك في المجلد ثم سمِّها في `assets/sounds/manifest.json` (افتحه وستجد التعليمات داخله):

| المفتاح | المؤثر | مدة مقترحة |
|---|---|---|
| `place` | وضع الطوبة على الحائط | ‏0.3–0.6 ث |
| `thud` | اصطدام الطوبة بالأسمنت | ‏0.3–0.5 ث |
| `pop` | فرقعة الضغط على طوبة | ‏0.1–0.2 ث |
| `whoosh` | طيران الطوبة من الهرم | ‏0.5–1 ث |
| `gold` | نغمة الطوب الذهبي | ‏0.7–1.5 ث |
| `diamond` | رنين الطوب الماسي | ‏1–2 ث |

الصيغة المفضلة: **MP3** (تعمل على كل المتصفحات بما فيها Safari على iPhone).

روابط تحميل موثوقة (تحققنا منها):
- **Kenney — Impact Sounds** (130 صوت ارتطام وFoley، رخصة CC0، تنزيل مباشر): https://kenney.nl/assets/impact-sounds — وبقية حزم الأصوات: https://kenney.nl/assets/category:Audio
- **Pixabay Sound Effects** (أكثر من 130 ألف مؤثر مجاني): https://pixabay.com/sound-effects/
- **Freesound** (اختر الفلتر CC0 من خيارات البحث حتى لا تلزمك نسبة المصدر): https://freesound.org/

## ⚡ الأداء
- طوبات الفئات تُرسم عبر **InstancedMesh** (مجموعة لكل فئة تتوسع تلقائيًا) — الحائط يتوسع بلا حد.
- تحميل الطوب والمتبرعين والمصروفات **على دفعات من 300**.
- تفعيل تلقائي لوضع خفيف (بدون ظلال/بدقة أقل) عند هبوط الإطارات + زر ⚡ يدوي.
- إيقاف الرسم عند خروج المشهد عن الشاشة أو إخفاء التبويب.
- مكتبتا Three.js وGSAP محليتان في `vendor/` (لا CDN) و PWA يعمل دون اتصال عبر Service Worker + كاش Firestore المحلي.
- بديل CSS متحرك عند تعذر WebGL أو على الأجهزة الضعيفة جدًا.

> ⚠️ **عند كل نشر جديد**: غيّر رقم النسخة `CACHE` في `charity-wall/sw.js` (مثل `charity-wall-v2`) حتى يستبدل Service Worker الكاش القديم لدى الزوار — نفس العرف المتبع في `sw.js` الرئيسي للمنصة.

## 🔒 ملاحظات أمنية
- لا يمكن إضافة طوبة من المتصفح إطلاقًا — فقط دالة `cwApproveDonation` بعد اعتماد التبرع.
- `adminLogs` غير قابل للتعديل أو الحذف من المتصفح.
- رفع الصور مقصور على المسؤولين، بصيغ صور وبحد 10MB.
