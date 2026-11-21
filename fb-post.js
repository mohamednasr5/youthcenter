/* fb-post.js — قسم «آخر منشور على صفحة المركز على فيسبوك»
   يجلب آخر منشور من الصفحة الرسمية https://www.facebook.com/Markz.shabab.elahmadya
   ويعرضه تحت بطاقة الإحصائيات المالية في الشريط الجانبي للموقع.

   ملاحظة مهمة: الإحصائيات المالية لا علاقة لها بهذا الملف — هي تُدخل يدوياً من لوحة التحكم.

   مسارات الجلب بالترتيب:
   1) كاش محلي (localStorage) يُعرض فوراً ثم يُحدَّث في الخلفية.
   2) Graph API عبر Page Access Token (يُضبط من لوحة التحكم: معرف الصفحة + التوكن)
      — يُجلب آخر منشور به نص أو صورة من آخر 10 منشورات.
   3) ملف fb-post.json في جذر الموقع — يُحدَّث يومياً بواسطة GitHub Action
      (tools/update_fb_post.py) باستخدام التوكن المخزن في GitHub Secrets،
      فيشتغل لكل الزوار بدون كشف التوكن.
   4) عند الفشل تُعرض بطاقة «متابعة صفحة المركز» مع رابط الصفحة.
*/
(function (global) {
  "use strict";

  const CACHE_KEY = "ahmadiah_fb_post_v1";
  const GRAPH_VER = "v21.0";
  const MAX_AGE_MS = 1000 * 60 * 60 * 12; // كاش محلي صالح 12 ساعة قبل محاولة التحديث عند الفشل

  function normTxt(s) {
    return String(s || "").replace(/[\u200e\u200f\u202a-\u202e]/g, "").trim();
  }

  /* ---------- مسار Graph API ---------- */
  async function fetchGraph(pageId, token) {
    const fields = "id,message,full_picture,permalink_url,created_time";
    const url = "https://graph.facebook.com/" + GRAPH_VER + "/" + encodeURIComponent(pageId) +
      "/posts?fields=" + fields + "&limit=10&access_token=" + encodeURIComponent(token);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      let msg = "Graph HTTP " + res.status;
      try { const j = await res.json(); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) {}
      throw new Error(msg);
    }
    const j = await res.json();
    if (j && j.error) throw new Error(j.error.message || "خطأ من Graph API");
    const posts = (j && j.data) || [];
    // آخر منشور به نص أو صورة (نتجاهل المنشورات الفارغة)
    for (const p of posts) {
      if (normTxt(p.message) || p.full_picture) return pack(p);
    }
    throw new Error("لا توجد منشورات قابلة للعرض على الصفحة");
  }

  function pack(p) {
    return {
      post: {
        id: p.id || "",
        message: normTxt(p.message) || "",
        picture: p.full_picture || "",
        url: p.permalink_url || "",
        created: p.created_time || ""
      },
      source: { type: "facebook", via: "graph", fetchedAt: new Date().toISOString() }
    };
  }

  /* ---------- مسار fb-post.json (ناتج الـ GitHub Action) ---------- */
  async function fetchFile() {
    const res = await fetch("fb-post.json?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("fb-post.json HTTP " + res.status);
    const j = await res.json();
    if (!j || (!normTxt(j.message) && !j.picture)) throw new Error("fb-post.json غير صالح");
    return {
      post: {
        id: j.id || "",
        message: normTxt(j.message) || "",
        picture: j.picture || "",
        url: j.url || "",
        created: j.created || ""
      },
      source: { type: "facebook", via: "fb-post.json", postUrl: j.url || "", fetchedAt: j.fetchedAt || new Date().toISOString() }
    };
  }

  /* ---------- كاش ---------- */
  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) { return null; }
  }
  function writeCache(r) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(r)); } catch (e) {}
  }

  let current = null;

  async function refresh(D, onUpdate) {
    const m = (D && D.meta) || {};
    let result = null;
    let lastErr = null;
    if (m.fbToken && m.fbPageId) {
      try {
        result = await fetchGraph(m.fbPageId, m.fbToken);
      } catch (e) { lastErr = e; console.warn("FBPost (graph):", e.message); }
    }
    if (!result) {
      try {
        result = await fetchFile();
      } catch (e) { lastErr = e; /* الملف غير موجود بعد — طبيعي قبل تفعيل الـ Action */ }
    }
    if (result) {
      current = result;
      writeCache({ post: result.post, source: result.source, ts: Date.now() });
      if (onUpdate) onUpdate(result.post, result.source);
    } else if (lastErr) {
      // تعذّر الجلب — إن لم يكن لدينا كاش سابق نعرض بطاقة «متابعة صفحة المركز» بدلاً من رسالة التحميل
      console.warn("FBPost: تعذّر الجلب —", lastErr.message);
      if (!current && onUpdate) onUpdate(null, null);
    }
    return current;
  }

  function init(D, onUpdate) {
    const cached = readCache();
    if (cached && cached.post && (cached.post.message || cached.post.picture)) {
      current = { post: cached.post, source: cached.source || { type: "facebook", via: "cache" } };
      if (onUpdate) onUpdate(current.post, current.source);
    }
    return refresh(D, onUpdate);
  }

  /* ---------- اختبار من لوحة التحكم ---------- */
  async function testFetch(pageId, token) {
    if (!pageId || !token) {
      return { ok: false, error: "أدخل «معرف صفحة فيسبوك» و«توكن فيسبوك» في قسم إعدادات الموقع أولاً ثم اضغط «حفظ التغييرات»." };
    }
    try {
      const p = await fetchGraph(pageId, token);
      return { ok: true, post: p.post };
    } catch (e) {
      return { ok: false, error: e.message || "فشل الاتصال بفيسبوك" };
    }
  }

  global.FBPost = {
    init: init,
    refresh: refresh,
    testFetch: testFetch,
    get current() { return current; }
  };
})(window);
