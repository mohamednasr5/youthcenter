const { JSDOM } = require('jsdom');
const fs = require('fs');
const root = require('path').join(process.cwd(),'..','..')+'/';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };

function boot(opts) {
  const store = {};
  const ref = () => ({ once: async () => ({ exists: () => false, val: () => null }) });
  let current = null, signedOut = false, redirectUsed = false;
  const popupUser = opts.popupUser || null;   // {email, claims}
  const popupError = opts.popupError || null; // {code}
  const redirectUser = opts.redirectUser || null;
  const auth = {
    get currentUser() { return current; },
    async signInWithEmailAndPassword() { throw Object.assign(new Error('x'), { code: 'auth/invalid-credential' }); },
    async signInWithPopup(provider) {
      if (popupError) throw Object.assign(new Error('popup'), { code: popupError });
      if (!popupUser) throw new Error('no user');
      current = { email: popupUser.email, getIdTokenResult: async () => ({ claims: popupUser.claims || {} }) };
      return { user: current };
    },
    async signInWithRedirect(provider) { redirectUsed = true; },
    async getRedirectResult() {
      if (!redirectUser) return { user: null };
      current = { email: redirectUser.email, getIdTokenResult: async () => ({ claims: redirectUser.claims || {} }) };
      return { user: current };
    },
    async signOut() { current = null; signedOut = true; },
    onAuthStateChanged(cb) { setTimeout(() => cb(current), 0); return () => {}; }
  };
  const apps = [];
  const firebase = {
    apps,
    initializeApp(cfg, name) { const a = { name, database: () => ({ ref }), auth: () => auth }; apps.push(a); return a; },
    database: {}, auth: () => auth
  };
  firebase.auth.GoogleAuthProvider = function () { this.setCustomParameters = () => {}; };
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  dom.window.firebase = firebase;
  Object.defineProperty(dom.window, 'crypto', { value: require('crypto').webcrypto, configurable: true });
  if (!dom.window.TextEncoder) dom.window.TextEncoder = require('util').TextEncoder;
  dom.window.YC_AUTH_CONFIG = { requireFirebase: true, adminEmails: [
    { email: 'elfannanm@gmail.com', roles: 'all' },
    { email: 'admmarim95@gmail.com', roles: 'all' }
  ] };
  dom.window.eval(fs.readFileSync(root + 'data.js', 'utf8'));
  return { SD: dom.window.SiteData, state: () => ({ signedOut, redirectUsed, current }) };
}

(async () => {
  console.log('دخول Google في الطبقة المشتركة data.js');
  {
    const { SD } = boot({ popupUser: { email: 'ElfannanM@gmail.com', claims: { ycAdmin: true } } });
    const u = await SD.signInWithGoogle('center');
    ok(u && u.email === 'ElfannanM@gmail.com', 'بريد أدمن بصلاحية ycAdmin يدخل (مع اختلاف حالة الأحرف)');
  }
  {
    const { SD, state } = boot({ popupUser: { email: 'random.person@gmail.com', claims: {} } });
    let msg = '';
    try { await SD.signInWithGoogle('center'); } catch (e) { msg = e.message; }
    ok(/غير مدرج/.test(msg), 'بريد غير مدرج في adminEmails يُرفض برسالة واضحة');
    ok(state().signedOut, 'يُسجَّل خروجه فورًا');
  }
  {
    const { SD, state } = boot({ popupUser: { email: 'admmarim95@gmail.com', claims: {} } });
    let msg = '';
    try { await SD.signInWithGoogle('karate'); } catch (e) { msg = e.message; }
    ok(/لا يملك صلاحية/.test(msg), 'بريد مدرج بلا Custom Claims يُرفض');
    ok(state().signedOut, 'يُسجَّل خروجه فورًا');
  }
  {
    const { SD } = boot({ popupUser: { email: 'admmarim95@gmail.com', claims: { ycKarate: true } } });
    const u = await SD.signInWithGoogle('karate');
    ok(!!u, 'صلاحية القسم ycKarate تكفي لقسم الكاراتيه');
    let msg = '';
    try { await SD.signInWithGoogle('football'); } catch (e) { msg = e.message; }
    ok(/لا يملك صلاحية/.test(msg), 'ولا تكفي لقسم آخر');
  }
  {
    const { SD, state } = boot({ popupError: 'auth/popup-blocked' });
    const r = await SD.signInWithGoogle('center');
    ok(r === null && state().redirectUsed, 'حظر النافذة المنبثقة يحوّل إلى Redirect');
  }
  {
    const { SD } = boot({ popupError: 'auth/unauthorized-domain' });
    let msg = '';
    try { await SD.signInWithGoogle('center'); } catch (e) { msg = e.message; }
    ok(/غير مصرّح/.test(msg), 'unauthorized-domain تظهر برسالة عربية عن النطاقات');
  }
  {
    const { SD } = boot({ redirectUser: { email: 'elfannanm@gmail.com', claims: { ycAdmin: true } } });
    const u = await SD.completeGoogleRedirect('center');
    ok(!!u, 'completeGoogleRedirect يكمل الجلسة بعد الرجوع');
  }
  {
    const { SD } = boot({});
    const u = await SD.completeGoogleRedirect('center');
    ok(u === null, 'completeGoogleRedirect بلا Redirect معلّق يعيد null');
  }
  {
    const { SD, state } = boot({ redirectUser: { email: 'intruder@gmail.com', claims: {} } });
    let msg = '';
    try { await SD.completeGoogleRedirect('center'); } catch (e) { msg = e.message; }
    ok(/غير مدرج/.test(msg) && state().signedOut, 'Redirect بحساب غير أدمن يُرفض ويُسجَّل خروجه');
  }

  console.log('كلمة سر استعادة الافتراضي');
  {
    const { SD } = boot({});
    ok(await SD.verifyResetPassword('كلمة-خاطئة') === false, 'كلمة سر خاطئة تُرفض');
    ok(await SD.verifyResetPassword('') === false, 'كلمة سر فارغة تُرفض');
    ok(await SD.verifyResetPassword(null) === false, 'null يُرفض');
    // ملاحظة: اختبار القبول الإيجابي بالكلمة الحقيقية أُجري محليًا ونجح، وأُزيل من هنا حتى لا تُحفظ الكلمة في المستودع.
    ok(await SD.verifyResetPassword('abc') === false, 'قيمة معروفة أخرى تُرفض (تسلسل الهاش سليم)');
  }
  console.log(`\nالنتيجة: ${pass} نجح، ${fail} فشل`);
  process.exit(fail ? 1 : 0);
})();
