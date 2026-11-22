const { JSDOM } = require('jsdom'); const fs = require('fs');
const root = require('path').join(__dirname,'..','..')+'/';
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗ FAIL:', m); };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const html = fs.readFileSync(root + 'football-academy/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { url: 'https://x.test/football-academy/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = q => ({ matches: false, addEventListener() {}, addListener() {} });
  w.IntersectionObserver = class { observe() {} unobserve() {} };
  w.eval(fs.readFileSync(root + 'football-academy/js/redesign.js', 'utf8'));
  await wait(50);
  const d = w.document;
  ok(!!d.querySelector('.fb-stage .fb-pitch') && !!d.querySelector('.fb-ball'), 'مسرح الهيرو (ملعب + كرة) مُنشأ');
  ok(d.querySelectorAll('.fb-rail a').length >= 8, 'شريط التنقل الجانبي بأقسام الصفحة');
  ok(!!d.querySelector('.section-title-wrap[data-n]'), 'ترقيم الأقسام');
  const next = d.getElementById('fb-next');
  ok(!next || next.hidden, 'لا مباراة ولا نتيجة → البطاقة مخفية (لا بيانات وهمية)');
  // مباراة قادمة بعد يومين + نتيجة سابقة
  const fut = new Date(Date.now() + 2 * 86400e3 + 5 * 3600e3);
  const ds = fut.toISOString().slice(0, 10);
  w.document.dispatchEvent(new w.CustomEvent('academy:data', { detail: {
    upcomingMatches: [{ opponent: 'أكاديمية المستقبل', date: ds, time: '17:00', tournament: 'دوري الأكاديميات', stadium: 'ملعب المنزلة' },
                      { opponent: 'منتهية', date: '2020-01-01', time: '10:00' }],
    matchResults: [{ opponent: 'الصقور', scoreOur: 3, scoreOpponent: 1, date: '2026-10-01' }, { opponent: 'أقدم', scoreOur: 0, scoreOpponent: 0, date: '2026-09-01' }]
  } }));
  await wait(1200);
  const n = d.getElementById('fb-next');
  ok(!n.hidden && /أكاديمية المستقبل/.test(n.textContent) && !/منتهية/.test(n.textContent), 'تظهر أقرب مباراة قادمة وتُستبعد المنتهية');
  ok(/3 - 1/.test(n.textContent) && /الصقور/.test(n.textContent), 'آخر نتيجة (الأحدث تاريخاً)');
  const dd = +d.querySelector('[data-u="d"]').textContent;
  ok(dd === 1 || dd === 2 || dd === 3, 'عدّاد الأيام منطقي: ' + dd);
  // مصفوفات قديمة بلا تاريخ صالح لا تكسر
  w.document.dispatchEvent(new w.CustomEvent('academy:data', { detail: { upcomingMatches: [{ opponent: 'x', date: 'غير صالح' }], matchResults: [] } }));
  await wait(50);
  ok(d.getElementById('fb-next').hidden, 'تاريخ غير صالح → تُخفى البطاقة بدون أخطاء');
  // صحة التحويل لتوقيت القاهرة (مع التوقيت الصيفي)
  const src = fs.readFileSync(root + 'football-academy/js/redesign.js', 'utf8');
  const fnsrc = src.slice(src.indexOf('function cairoOffsetMs'), src.indexOf('const fmtDay'));
  const { cairoOffsetMs, matchEpoch } = new Function('TZ', fnsrc + ';return {cairoOffsetMs,matchEpoch}')('Africa/Cairo');
  ok(new Date(matchEpoch('2026-11-22', '17:00')).toISOString() === '2026-11-22T15:00:00.000Z', 'شتاءً: 17:00 القاهرة = 15:00Z (UTC+2)');
  ok(new Date(matchEpoch('2026-07-01', '05:00 م')).toISOString() === '2026-07-01T14:00:00.000Z', 'صيفاً: 05:00 م القاهرة = 14:00Z (UTC+3)');
  console.log(`\nالنتيجة: ${pass} نجح، ${fail} فشل`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
