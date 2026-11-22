# قاعدة البيانات الموحدة — `academia-e6d7b` (Realtime Database)

كل الأقسام تتصل بنفس القاعدة `https://academia-e6d7b-default-rtdb.firebaseio.com`. لا توجد قواعد مستقلة.

| المسار | القسم | قراءة | كتابة (Custom Claim) |
|---|---|---|---|
| `center_settings` `center_news` `center_activities` `center_announcements` `center_board` `center_articles` `center_finance` `center_academies` `center_quickLinks` `center_gallery` | المنصة الرئيسية | عام | `ycAdmin` / `ycCenter` |
| `center_private/facebook/token` | المنصة الرئيسية | مسؤول فقط | `ycAdmin` / `ycCenter` |
| `players, coaches, trophies, schedules, news, upcomingMatches, matchResults, registrationRequests` | أكاديمية كرة القدم (مسارات الجذر كما هي حفاظاً على البيانات) | عام (عدا registrationRequests) | `ycAdmin` / `ycFootball` |
| `academy_meta/state` | أكاديمية كرة القدم | عام (عدا adminPasswordHash) | `ycFootball` |
| `karate_academy/{news,players,coaches,belts,achievements,tournaments,schedules,settings}` | الكاراتيه | عام | `ycAdmin` / `ycKarate` |
| `pitch_booking/{matchResults/<date>/<id>, expenses, payments, settings, auditLogs, telegramSubscribers, telegramResultSessions, adminUsers}` | الملعب الخماسي | النتائج والإعدادات: عام؛ الباقي للمسؤول | `ycAdmin` / `ycPitch` |
| `pitch_booking/bookings/<date>/<id>` | الملعب الخماسي (السجل الكامل: اسم العميل وهاتفه وملاحظاته ومدفوعاته) | مسؤول فقط | `ycAdmin` / `ycPitch` (إنشاء حجز `pending` مسموح للزائر) |
| `pitch_booking/availability/<date>/<id>` | الملعب الخماسي (نسخة عامة مصغّرة: الموعد والحالة والفرق فقط — بلا هاتف/ملاحظات/مدفوعات) | عام | `ycAdmin` / `ycPitch` (إنشاء سجل `pending` مسموح للزائر) |
| `pitch_private/{adminHash, telegramBotToken}` | الملعب | مسؤول فقط | `ycPitch` |
| `youthcenter/state` | قديم — احتياط للقراءة فقط حتى اكتمال الترحيل | — | — |
| `platform_meta/migrations/*` | تقارير الترحيل | `ycAdmin` | `ycAdmin` |

حقول الحجز: `teamOneName`, `teamTwoName` (اختيارية؛ الحجوزات القديمة تعمل بدونها).

## فصل خصوصية الحجوزات
`pitch_booking/bookings` تحتوي اسم العميل وهاتفه وملاحظاته ومدفوعاته — قراءتها للمسؤول فقط في القواعد الجديدة. الصفحات العامة (الجدول وشاشة العرض) تقرأ من `pitch_booking/availability`، نسخة مصغّرة تُنشئها صفحة الحجز ولوحة الإدارة مع كل حجز وتُحدَّث مع كل تأكيد/إلغاء/تعديل (انظر `pitch-booking/js/availability.js`). للحجوزات القديمة شغّل `tools/backfill-availability.mjs` قبل نشر القواعد (الخطوة 4 في CUTOVER.md). حتى اكتمال الترحيل تقرأ الصفحات العامة من المسار القديم تلقائياً كاحتياط.

الحقول الممنوعة في `availability` (تفرضها القواعد): `customerPhone` و`phone` و`notes` و`totalPrice` و`paidAmount` و`remainingAmount`.

## الأمان والتفعيل — انظر `CUTOVER.md`

## صفحة أكاديمية كرة القدم (واجهة)
`football-academy/css/redesign.css` + `js/redesign.js`: مسرح هيرو ثلاثي الأبعاد، بطاقة «المواجهة القادمة» بعدّاد بتوقيت القاهرة وآخر نتيجة (من `upcomingMatches`/`matchResults` الحقيقية فقط وتُخفى عند عدم وجود بيانات)، شريط تنقل جانبي، ترقيم أقسام.
التحديث لحظي عبر `startRealtimeSync()` (مستمعو onValue على المجموعات العامة، بدون registrationRequests، مع إلغاء الاشتراك عند مغادرة الصفحة).
