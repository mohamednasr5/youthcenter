const { JSDOM } = require('jsdom');
const fs = require('fs');
const makeFirebase = require('./fakefb');
const root = require('path').join(__dirname,'..','..')+'/';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
const stubs = (w, extra = {}) => {
  w.matchMedia = q => ({ matches: !!extra.matches && extra.matches(q), addEventListener() {}, removeEventListener() {}, addListener() {} });
  w.IntersectionObserver = class { constructor(cb) { this.cb = cb; this.els = new Set(); w.__ios = (w.__ios || []).concat(this); } observe(e) { this.els.add(e); } unobserve(e) { this.els.delete(e); } disconnect() {} fire() { [...this.els].forEach(e => this.cb([{ isIntersecting: true, target: e }])); } };
  w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 5);
  w.scrollTo = () => {};
  w.Element.prototype.scrollIntoView = () => {};
};

(async () => {
  console.log('A) الصفحة الرئيسية: تحديث لحظي لأخبار المركز بلا إعادة تحميل');
  {
    const html = fs.readFileSync(root + 'index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window; stubs(w);
    const fb = makeFirebase({}); w.firebase = fb.firebase;
    w.eval(fs.readFileSync(root + 'data.js', 'utf8'));
    // قاعدة تحتوي بيانات المركز المقسّمة
    const d = w.SiteData.load(); d.news = [{ icon: '📰', text: 'خبر أول' }];
    await w.SiteData.save(d);
    w.eval(fs.readFileSync(root + 'app.js', 'utf8'));
    await wait(500);
    const tick = () => w.document.querySelector('#tContent').textContent;
    ok(/خبر أول/.test(tick()), 'التحميل الأولي يعرض الخبر الأول في الشريط');
    // المسؤول يعدّل الخبر → الزائر يرى فوراً
    await w.firebase.apps.find(a => a.name === 'youthcenter').database().ref('center_news').set([{ icon: '🔥', text: 'خبر عاجل جديد' }]);
    await wait(400);
    ok(/خبر عاجل جديد/.test(tick()) && !/خبر أول/.test(tick()), 'تعديل center_news ظهر عند الزائر بدون إعادة تحميل');
    // تعديل الإعلان الهام
    await w.firebase.apps.find(a => a.name === 'youthcenter').database().ref('center_announcements').set({ title: 'إعلان مباشر', body: 'نص', ctaText: 'اذهب', ctaLink: '#x' });
    await wait(400);
    ok(/إعلان مباشر/.test(w.document.querySelector('#announceSlot').textContent), 'تعديل الإعلان الهام ظهر لحظياً');
    // نشاط جديد
    const acts = w.SiteData.load().activities.slice(); acts.push({ date: '٢٥', month: 'ديسمبر', name: 'نشاط جديد من اللوحة', day: 'الجمعة', time: '٦ م', type: 'sport', typeLabel: 'رياضي' });
    await w.firebase.apps.find(a => a.name === 'youthcenter').database().ref('center_activities').set(acts);
    await wait(400);
    ok(/نشاط جديد من اللوحة/.test(w.document.querySelector('#actGrid').textContent), 'نشاط جديد ظهر لحظياً في الأنشطة');
    // تسرب مستمعين: pagehide يلغي الاشتراك
    w.dispatchEvent(new w.Event('pagehide'));
    await w.firebase.apps.find(a => a.name === 'youthcenter').database().ref('center_news').set([{ icon: '⛔', text: 'بعد المغادرة' }]);
    await wait(300);
    ok(!/بعد المغادرة/.test(tick()), 'عند مغادرة الصفحة تُلغى الاشتراكات');
  }

  console.log('B) fx.js — الوضع الكامل');
  {
    const dom = new JSDOM(`<!doctype html><body>
      <div id="spacer" style="height:3000px"></div>
      <section class="x"><div class="info-card" id="c1">card</div><div class="info-card" id="c2">card</div></section>
      <span class="stat-num" id="n1">٢٨</span><span class="stat-num" id="n2" data-count="5">5</span>
      <button class="btn" id="b1">go</button></body>`, { url: 'https://example.test/football-academy/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    stubs(w, { matches: q => /hover:hover/.test(q) });
    Object.defineProperty(w.navigator, 'hardwareConcurrency', { value: 8 }); Object.defineProperty(w.navigator, 'deviceMemory', { value: 8 });
    // getBoundingClientRect: العناصر بعيدة عن الشاشة
    w.Element.prototype.getBoundingClientRect = function () { return { top: 2000, bottom: 2100, left: 0, right: 100, width: 100, height: 100 }; };
    Object.defineProperty(w, 'innerHeight', { value: 800 });
    w.eval(fs.readFileSync(root + 'fx.js', 'utf8'));
    await wait(300);
    const d = w.document;
    ok(d.documentElement.classList.contains('fx-on') && d.documentElement.classList.contains('fx-full'), 'يدخل الوضع الكامل');
    ok(d.documentElement.dataset.fxTheme === 'football', 'يكتشف القسم من المسار (football)');
    ok(d.getElementById('c1').classList.contains('fx-r') && d.getElementById('c2').style.getPropertyValue('--fx-i') === '1', 'Scroll Reveal + تأخير متدرج');
    ok(d.getElementById('c1').classList.contains('fx-tilt'), '3D Tilt مفعّل للبطاقات');
    ok(!!d.querySelector('.fx-progress') && !!d.querySelector('.fx-bg'), 'شريط التقدّم والخلفية المتحركة');
    ok(d.getElementById('b1').classList.contains('fx-rip-host'), 'Ripple للأزرار');
    ok(typeof w.FX.skeleton === 'function' && /fx-skel-card/.test(w.FX.skeleton(2)), 'FX.skeleton يعمل');
    // الكشف عند الظهور
    w.__ios.forEach(i => i.fire && i.fire());
    await wait(100);
    ok(d.getElementById('c1').classList.contains('fx-in'), 'العنصر يظهر عند دخول الشاشة');
    // عدّاد بأرقام عربية، وعدم لمس [data-count]
    await wait(1400);
    ok(d.getElementById('n1').textContent === '٢٨', 'العدّاد ينتهي بالقيمة الأصلية بالأرقام العربية');
    ok(d.getElementById('n2').textContent === '5', 'عنصر data-count (تديره الصفحة) لم يُمسّ');
    // عنصر يُضاف لاحقاً (بيانات Firebase) يلتقطه المراقب
    const late = d.createElement('div'); late.className = 'schedule-card'; d.body.appendChild(late);
    await wait(400);
    ok(late.classList.contains('fx-r'), 'العناصر المضافة ديناميكياً تُلتقط تلقائياً');
  }

  console.log('C) fx.js — تقليل الحركة / جهاز ضعيف');
  {
    const dom = new JSDOM(`<!doctype html><body><div class="info-card" id="c1">x</div></body>`, { url: 'https://example.test/karate-academy/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window; stubs(w, { matches: q => /reduce/.test(q) });
    w.Element.prototype.getBoundingClientRect = () => ({ top: 2000, bottom: 2100, width: 100, height: 100 });
    w.eval(fs.readFileSync(root + 'fx.js', 'utf8'));
    await wait(200);
    const d = w.document;
    ok(d.documentElement.classList.contains('fx-lite'), 'prefers-reduced-motion → وضع خفيف');
    ok(!d.getElementById('c1').classList.contains('fx-r') && !d.getElementById('c1').classList.contains('fx-tilt'), 'لا إخفاء ولا إمالة (المحتوى ظاهر دائماً)');
    ok(!d.querySelector('.fx-bg'), 'لا خلفية متحركة في الوضع الخفيف');
    ok(d.documentElement.dataset.fxTheme === 'karate', 'القسم karate');
  }
  console.log(`\nالنتيجة: ${pass} نجح، ${fail} فشل`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
