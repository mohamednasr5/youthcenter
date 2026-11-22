const { JSDOM } = require('jsdom');
const fs = require('fs');
const makeFirebase = require('./fakefb');
const root = require('path').join(__dirname,'..','..')+'/';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

function boot(opts) {
  const fb = makeFirebase(opts);
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  dom.window.firebase = fb.firebase;
  dom.window.eval(fs.readFileSync(root + 'data.js', 'utf8'));
  return { w: dom.window, fb, SD: dom.window.SiteData };
}

(async () => {
  console.log('1) save() يقسّم البيانات إلى مسارات center_* ويفصل التوكن الخاص');
  {
    const { SD, fb } = boot({});
    const d = SD.load();
    d.meta.fbToken = 'SECRET_TOKEN';
    d.news.push({ icon: '🆕', text: 'خبر اختبار' });
    await SD.save(d);
    ok(fb.get('center_news').some(n => n.text === 'خبر اختبار'), 'center_news يحتوي الخبر الجديد');
    ok(fb.get('center_settings') && fb.get('center_settings').siteName, 'center_settings موجود');
    ok(fb.get('center_settings').fbToken === '', 'التوكن غير موجود في center_settings العام');
    ok(fb.get('center_private/facebook/token') === 'SECRET_TOKEN', 'التوكن محفوظ في center_private/facebook/token');
    ok(fb.get('youthcenter/state') === undefined, 'لا كتابة إلى youthcenter/state القديم');
    ['center_announcements', 'center_board', 'center_activities', 'center_articles', 'center_finance', 'center_academies', 'center_quickLinks', 'center_gallery']
      .forEach(p => ok(fb.get(p) !== undefined, p + ' موجود'));
    ok(Array.isArray(Object.values(fb.get('karate_academy/schedules'))) && Object.keys(fb.get('karate_academy/schedules')).length === 3, 'جدول الكاراتيه (3) في karate_academy/schedules');
  }

  console.log('2) save ثم syncFromCloud يعيد نفس البيانات، والتوكن لا يعود في القراءة العامة');
  {
    const { SD } = boot({});
    const d = SD.load(); d.meta.fbToken = 'T'; d.meta.phone = '0100';
    await SD.save(d);
    const back = await SD.syncFromCloud();
    ok(back.meta.phone === '0100', 'القراءة المقسّمة تعيد الإعدادات');
    ok(back.meta.fbToken === '', 'القراءة العامة لا تحمل fbToken');
    ok(await SD.loadPrivate() === 'T', 'loadPrivate يقرأ التوكن للمسؤول');
    ok(back.karateSchedule.length === 3, 'جدول الكاراتيه يُقرأ من المسار الجديد');
  }

  console.log('3) احتياط المسار القديم قبل الترحيل');
  {
    const { SD, fb } = boot({});
    fb.setAt('youthcenter/state', { meta: { siteName: 'قديم', phone: '999' }, news: [{ icon: 'x', text: 'قديم' }], karateSchedule: [{ day: 'السبت', fromTime: '10:00', toTime: '11:00', active: true }] });
    const d = await SD.syncFromCloud();
    ok(d.meta.phone === '999' && d.news[0].text === 'قديم', 'قراءة من youthcenter/state عند غياب center_*');
    ok(d.karateSchedule[0].day === 'السبت', 'جدول الكاراتيه القديم يُقرأ');
    ok(SD._legacyMode === true, 'وضع الاحتياط مفعّل');
  }

  console.log('4) البذر الأولي لا يحدث إلا عند طلبه');
  {
    const { SD, fb } = boot({});
    await SD.syncFromCloud();
    ok(fb.get('center_settings') === undefined, 'بدون seedIfMissing لا يكتب شيئاً');
    await SD.syncFromCloud({ seedIfMissing: true });
    ok(fb.get('center_settings') !== undefined, 'مع seedIfMissing يُنشأ center_settings');
  }

  console.log('5) subscribe: تحديث لحظي لمسار واحد وإلغاء الاشتراك');
  {
    const { SD, fb, w } = boot({});
    await SD.save(SD.load());
    const seen = [];
    const off = SD.subscribe(d => seen.push(d.news.map(n => n.text).join('|')));
    await wait(150);
    const n0 = seen.length;
    ok(n0 >= 1, 'نداء أولي بعد الاشتراك');
    const updater = boot({}); // نفس القاعدة: نكتب مباشرة في المخزن المشترك
    fb.setAt('center_news', [{ icon: '🔴', text: 'خبر لحظي' }]);
    // إشعار يدوي عبر ref.set لتفعيل المستمعين
    await w.firebase.apps[0].database().ref('center_news').set([{ icon: '🔴', text: 'خبر لحظي' }]);
    await wait(150);
    ok(seen[seen.length - 1] === 'خبر لحظي', 'المستمع تلقّى الخبر الجديد بدون إعادة تحميل');
    off();
    const before = seen.length;
    await w.firebase.apps[0].database().ref('center_news').set([{ icon: '🔴', text: 'بعد الإلغاء' }]);
    await wait(150);
    ok(seen.length === before, 'بعد unsubscribe لا تصل تحديثات (لا تسرب مستمعين)');
  }

  console.log('6) subscribeKarateSchedule مع احتياط قديم وتحديث لحظي');
  {
    const { SD, fb, w } = boot({});
    const got = [];
    const off = SD.subscribeKarateSchedule(a => got.push(a));
    await wait(150);
    ok(got.length >= 1 && got[0].length === 3, 'بدون مسار جديد: يُعرض الجدول الافتراضي/القديم');
    await w.firebase.apps[0].database().ref('karate_academy/schedules').set({ a: { day: 'الخميس', fromTime: '18:00', toTime: '19:30', active: true, order: 0 } });
    await wait(150);
    ok(got[got.length - 1].length === 1 && got[got.length - 1][0].day === 'الخميس', 'تعديل لوحة الكاراتيه يصل لحظياً');
    off();
  }

  console.log('7) Firebase Auth: التحقق من الأدوار (Custom Claims)');
  {
    const users = {
      'karate@x.com': { pw: 'pw123456', claims: { ycKarate: true } },
      'boss@x.com': { pw: 'pw123456', claims: { ycAdmin: true } },
      'foot@x.com': { pw: 'pw123456', claims: { ycFootball: true } }
    };
    const { SD, w } = boot({ users });
    ok(SD.hasRole({ ycAdmin: true }, 'pitch') && !SD.hasRole({ ycKarate: true }, 'center') && SD.hasRole({ ycKarate: true }, 'karate'), 'hasRole منطق الأدوار');
    let user = await SD.signIn('karate@x.com', 'pw123456', 'karate');
    ok(user && user.email === 'karate@x.com', 'دخول مسؤول الكاراتيه للكاراتيه ينجح');
    ok(await SD.restoreSession('karate') === true, 'استعادة الجلسة بنفس الصلاحية');
    await SD.signOut();
    let err = null; try { await SD.signIn('foot@x.com', 'pw123456', 'center'); } catch (e) { err = e; }
    ok(err && /صلاحية/.test(err.message), 'حساب كرة القدم مرفوض في المنصة الرئيسية');
    ok(await SD.restoreSession('center') === false, 'لا جلسة متبقية بعد الرفض (تم signOut)');
    err = null; try { await SD.signIn('karate@x.com', 'wrong', 'karate'); } catch (e) { err = e; }
    ok(err && err.code === 'auth/invalid-credential', 'كلمة مرور خاطئة مرفوضة');
    user = await SD.signIn('boss@x.com', 'pw123456', 'pitch');
    ok(!!user, 'ycAdmin يدخل أي قسم');
    w.YC_AUTH_CONFIG = { requireFirebase: true };
    err = null; try { await SD.verifyAdminPassword('x'); } catch (e) { err = e; }
    ok(err && /تم تعطيل/.test(err.message), 'الوضع الصارم يعطّل كلمة المرور القديمة');
  }

  console.log(`\nالنتيجة: ${pass} نجح، ${fail} فشل`);
  process.exit(fail ? 1 : 0);
})();
