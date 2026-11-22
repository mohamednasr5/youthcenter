# قاعدة البيانات الموحدة — `academia-e6d7b` (Realtime Database)

كل الأقسام تتصل بنفس القاعدة `https://academia-e6d7b-default-rtdb.firebaseio.com`. لا توجد قواعد مستقلة.

| المسار | القسم | قراءة | كتابة (Custom Claim) |
|---|---|---|---|
| `center_settings` `center_news` `center_activities` `center_announcements` `center_board` `center_articles` `center_finance` `center_academies` `center_quickLinks` `center_gallery` | المنصة الرئيسية | عام | `ycAdmin` / `ycCenter` |
| `center_private/facebook/token` | المنصة الرئيسية | مسؤول فقط | `ycAdmin` / `ycCenter` |
| `players, coaches, trophies, schedules, news, upcomingMatches, matchResults, registrationRequests` | أكاديمية كرة القدم (مسارات الجذر كما هي حفاظاً على البيانات) | عام (عدا registrationRequests) | `ycAdmin` / `ycFootball` |
| `academy_meta/state` | أكاديمية كرة القدم | عام (عدا adminPasswordHash) | `ycFootball` |
| `karate_academy/{news,players,coaches,belts,achievements,tournaments,schedules,settings}` | الكاراتيه | عام | `ycAdmin` / `ycKarate` |
| `pitch_booking/{bookings/<date>/<id>, matchResults/<date>/<id>, expenses, payments, settings, auditLogs, telegramSubscribers, telegramResultSessions, adminUsers}` | الملعب الخماسي | الحجوزات والنتائج والإعدادات: عام؛ الباقي للمسؤول | `ycAdmin` / `ycPitch` (إنشاء حجز `pending` مسموح للزائر) |
| `pitch_private/{adminHash, telegramBotToken}` | الملعب | مسؤول فقط | `ycPitch` |
| `youthcenter/state` | قديم — احتياط للقراءة فقط حتى اكتمال الترحيل | — | — |
| `platform_meta/migrations/*` | تقارير الترحيل | `ycAdmin` | `ycAdmin` |

حقول الحجز: `teamOneName`, `teamTwoName` (اختيارية؛ الحجوزات القديمة تعمل بدونها).

## ملاحظة خصوصية معروفة
`pitch_booking/bookings` مقروءة علناً وتحتوي اسم/هاتف العميل. الحل المقترح: نسخة عامة مصغّرة (وقت + فريقان + حالة) تُنشأ بـ Cloud Function وتُقرأ منها الصفحات العامة.

## الأمان والتفعيل — انظر `CUTOVER.md`

## صفحة أكاديمية كرة القدم (واجهة)
`football-academy/css/redesign.css` + `js/redesign.js`: مسرح هيرو ثلاثي الأبعاد، بطاقة «المواجهة القادمة» بعدّاد بتوقيت القاهرة وآخر نتيجة (من `upcomingMatches`/`matchResults` الحقيقية فقط وتُخفى عند عدم وجود بيانات)، شريط تنقل جانبي، ترقيم أقسام.
التحديث لحظي عبر `startRealtimeSync()` (مستمعو onValue على المجموعات العامة، بدون registrationRequests، مع إلغاء الاشتراك عند مغادرة الصفحة).
