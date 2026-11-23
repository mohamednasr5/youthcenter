/* yc-auth-config.js — إعداد وضع تسجيل دخول لوحات الإدارة (يُحمَّل قبل أي لوحة إدارة)
   requireFirebase = false  → وضع انتقالي: يُسمح بكلمة المرور القديمة (لا تحمي القاعدة من جهة الخادم).
   requireFirebase = true   → الدخول بالبريد + كلمة المرور عبر Firebase Authentication فقط (الوضع الآمن).
   اقلبه إلى true فقط بعد: (1) إنشاء الحسابات بـ tools/setup-admins.mjs  (2) اختبار الدخول  (3) نشر database.rules.json

   adminEmails — قائمة الإيميلات المسموح لها بدخول لوحات الإدارة (أدمن):
   - كل عنصر: { email: "name@example.com", roles: "all" } أو roles: ["pitch", "karate"] لقسم محدد.
   - عندما تكون القائمة غير فارغة يرفض المتصفح محاولة الدخول من أي بريد غير مدرج (قبل الاتصال بالخادم)،
     والحماية الحقيقية من جهة الخادم تبقى عبر Custom Claims وقواعد قاعدة البيانات.
   - بعد إضافة بريد هنا أنشئ حسابه: node tools/setup-admins.mjs --key sa.json --from-config
     (الأمر يقرأ هذه القائمة وينشئ/يحدّث كل الحسابات بصلاحياتها).
   - القائمة الفارغة تعني: لا قيد إضافي على المتصفح (الاعتماد على Custom Claims فقط). */
window.YC_AUTH_CONFIG = {
  requireFirebase: false,
  adminEmails: [
    { email: "elfannanm@gmail.com", roles: "all" },
    { email: "mohamednasrofficial@gmail.com", roles: "all" },
    { email: "yehai2026hh@gmail.com", roles: "all" },
    { email: "admmarim95@gmail.com", roles: "all" },
    { email: "ee86663@gmail.com", roles: "all" },
  ]
};
