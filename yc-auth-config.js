/* yc-auth-config.js — إعداد وضع تسجيل دخول لوحات الإدارة (يُحمَّل قبل أي لوحة إدارة)
   requireFirebase = false  → وضع انتقالي: يُسمح بكلمة المرور القديمة (لا تحمي القاعدة من جهة الخادم).
   requireFirebase = true   → الدخول بالبريد + كلمة المرور عبر Firebase Authentication فقط (الوضع الآمن).
   اقلبه إلى true فقط بعد: (1) إنشاء الحسابات بـ tools/setup-admins.mjs  (2) اختبار الدخول  (3) نشر database.rules.json */
window.YC_AUTH_CONFIG = { requireFirebase: false };
