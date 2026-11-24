/* app.js — نقطة تجميع صفحة حائط الخير
   ينسّق: مشهد 3D + البيانات من Realtime Database + يد الخير + الشفافية + الأصوات + الأدوات
   لا شاشة سوداء: غطاء تحميل يُخفى عند جهوزية المشهد، ووضع عرض بديل عند تعذر WebGL
   ?test=1 → وضع معاينة ببيانات عرض مؤقتة (لا يُكتب شيء في Firebase ولا يُعدّ تبرعات حقيقية) */

import { TIERS, tierById, egp, fmtDate } from './firebase-config.js';
import {
  loadTiers, loadBricks, loadDonors, loadExpenses,
  subscribeSummary, subscribeNewBricks, brickStats
} from './firebase-service.js';
import { Wall3D } from './wall-3d.js';
import { HandOfGood, escapeHtml } from './donors.js';
import { TransparencySection } from './expenses.js';
import { sounds } from './sounds.js';

const $ = s => document.querySelector(s);

/* ─── وضع المعاينة (اختبار المشهد فقط — بيانات غير حقيقية وغير محفوظة) ─── */
const TEST_MODE = new URLSearchParams(location.search).has('test');
const TEST_NAMES = ['أحمد محمد', 'فاطمة السيد', 'محمود علي', 'نور الهدى', 'خالد إبراهيم', 'سارة عادل', 'عمر حسن', 'هدى مصطفى', 'يوسف سامي', 'مريم فؤاد', 'طارق نبيل', 'أسماء رفعت', 'حسين جمال', 'رقية عزت', 'سيف الدين', 'ليلى مرسي', 'عبد الرحمن', 'زينب طه', 'كريم عاشور', 'منة الله', 'بلال شاهين', 'إيمان قطب', 'زياد لطفي', 'دعاء حسني'];

function testBricks() {
  const tiers = ['clay', 'clay', 'red', 'red', 'silver', 'gold', 'clay', 'red', 'diamond', 'silver', 'gold', 'clay', 'red', 'clay', 'silver', 'red', 'clay', 'red', 'gold', 'clay', 'silver', 'red', 'clay', 'red'];
  return TEST_NAMES.map((name, i) => ({
    id: 'test-' + i,
    donorId: 'td-' + i,
    donorName: name,
    totalDonation: [500, 800, 1500, 2500, 3500, 6000, 900, 1200, 15000, 4000, 7500, 600, 1800, 300, 3200, 2200, 750, 1400, 5500, 850, 3600, 2800, 400, 1100][i],
    brickType: tiers[i],
    index: i,
    createdAt: null
  }));
}

/* ═══ التشغيل ═══ */
async function main() {
  /* خطوط عربية جاهزة قبل رسم أسماء المتبرعين على الطوب */
  try { await document.fonts.load('700 46px Cairo'); await document.fonts.load('800 40px Cairo'); } catch (_e) {}

  const container = $('#cwViewport');
  const loader = $('#cwLoader');
  const isLow = localStorage.getItem('cw_quality') === 'low';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── بناء المشهد ─── */
  let wall = null;
  let webglOk = true;
  try {
    wall = new Wall3D(container, {
      quality: isLow ? 'low' : 'high',
      onPick: showBrickPopup,
      onEmpty: empty => {
        $('#cwEmptyHint').classList.toggle('show', empty && !TEST_MODE);
      },
      onStats: n => { $('#cwBrickCount').textContent = n.toLocaleString('ar-EG'); },
      onAutoLow: () => {
        localStorage.setItem('cw_quality', 'low');
        toast('تم تفعيل وضع الأداء الخفيف تلقائيًا لجهازك');
        $('#cwQualityBtn').classList.add('on');
      }
    });
    wall.init();
    window.__cwWall = wall; /* خطاف تشخيص — يُستخدم في الاختبار فقط */
  } catch (e) {
    webglOk = false;
    console.warn('WebGL غير متاح:', e);
    container.innerHTML = `<div class="cw-fallback-wall" id="cwFallbackWall"></div>`;
  }

  /* ─── البيانات ─── */
  let tiers = TIERS;
  let bricks = [];
  let donors = [];
  let lastLoadedIndex = -1;

  async function loadData() {
    if (TEST_MODE) {
      tiers = TIERS;
      bricks = testBricks();
      donors = bricks.map(b => ({ id: b.donorId, name: b.donorName, totalDonation: b.totalDonation, brickType: b.brickType, createdAt: new Date() }));
      applyData();
      return;
    }
    // لا نعرض بيانات الكاش كأنها بيانات مؤكدة من قاعدة البيانات.
    try {
      tiers = await loadTiers();
      bricks = await loadBricks((loaded) => {
        loaderProgress(0.3 + 0.5 * Math.min(1, loaded / 60));
      });
      lastLoadedIndex = bricks.length ? bricks[bricks.length - 1].index : -1;
      applyData();
    } catch (e) {
      console.error('[Charity Wall] فشل جلب بيانات الحائط من Realtime Database:', e);
      offlineNotice(e);
      throw e;
    }

    loadDonors().then(d => { donors = d; applyDonors(); }).catch(e => {
      console.warn('[Charity Wall] تعذر تحميل قائمة المتبرعين:', e);
      offlineNotice(e);
    });

    /* استماع لحظي: اعتماد جديد → طوبة تطير من الهرم */
    if (lastLoadedIndex >= 0) {
      subscribeNewBricks(lastLoadedIndex, fresh => {
        fresh.forEach(b => {
          if (!bricks.find(x => x.id === b.id)) {
            bricks.push(b);
            wall && wall.addBrick(b);
          }
        });
        refreshStats();
        $('#cwEmptyHint').classList.remove('show');
      }, offlineNotice);
    }
    subscribeSummary(s => {
      $('#cwTotalDonations').textContent = egp(s.totalApprovedDonations || 0);
      $('#cwDonorsCount').textContent = (Number(s.donorCount) || 0).toLocaleString('ar-EG');
      transparency.setSummary(s);
    }, offlineNotice);
  }

  function applyData() {
    if (wall && webglOk) {
      wall.setTiers(tiers);
      wall.setBricks(bricks);
    } else {
      renderFallbackWall();
      $('#cwBrickCount').textContent = bricks.length.toLocaleString('ar-EG');
    }
    applyDonors();
    refreshStats();
    transparency.setTiers(tiers);
    loadExpenses().then(ex => transparency.setExpenses(ex)).catch(e => {
      console.warn('[Charity Wall] تعذر تحميل بيانات الشفافية:', e);
      offlineNotice(e);
    });
  }

  function applyDonors() {
    hand.setTiers(tiers);
    hand.setDonors(donors);
  }

  function refreshStats() {
    const counts = brickStats(bricks, tiers);
    wall && wall.updatePyramidCounts(counts);
  }

  /* ─── وضع العرض البديل (بلا WebGL): حائط HTML ثابت ─── */
  function renderFallbackWall() {
    const el = $('#cwFallbackWall');
    if (!el) return;
    el.innerHTML = bricks.length ? bricks.map(b => {
      const t = tierById(b.brickType, tiers);
      return `<div class="cw-fb-brick" style="--c:${t.cssColor}">${escapeHtml(b.donorName || '')}</div>`;
    }).join('') : `<div class="cw-empty">الحائط بانتظار أول طوبة…</div>`;
  }

  /* ─── يد الخير ─── */
  const hand = new HandOfGood({
    tiers,
    onDonorClick: d => {
      hand.close();
      if (wall && webglOk) {
        wall.flyToDonor(d.id).then(ok => { if (!ok) toast('طوبة هذا المتبرع غير موجودة حاليًا'); });
      } else {
        toast('العرض ثلاثي الأبعاد غير متاح على هذا الجهاز');
      }
    }
  });

  /* ─── قسم الشفافية ─── */
  const transparency = new TransparencySection($('#cwTransparency'), { tiers });

  /* ─── بطاقة بيانات المتبرع عند الضغط على طوبة ─── */
  let popupTimer = null;
  function showBrickPopup(record, screen) {
    const card = $('#cwBrickCard');
    const tier = tierById(record.brickType, tiers);
    card.innerHTML = `
      <div class="cw-bc-bar" style="background:${tier.cssColor}"></div>
      <button class="cw-bc-close" type="button" aria-label="إغلاق">✕</button>
      <div class="cw-bc-name">${escapeHtml(record.donorName || 'متبرع كريم')}</div>
      <div class="cw-bc-tier"><i style="background:${tier.cssColor}"></i> طوبة ${escapeHtml(tier.label)}</div>
      <div class="cw-bc-grid">
        <div><span class="k">إجمالي المساهمة</span><span class="v">${escapeHtml(egp(record.totalDonation))}</span></div>
        <div><span class="k">تاريخ الاعتماد</span><span class="v">${escapeHtml(fmtDate(record.createdAt))}</span></div>
        <div><span class="k">الموضع في الحائط</span><span class="v">صف ${Number(record.row) + 1} • طوبة ${Number(record.column) + 1}</span></div>
      </div>
      <div class="cw-bc-timer"></div>`;
    card.classList.add('show');

    /* تموضع قرب الطوبة مع تثبيت داخل الشاشة */
    const pad = 14;
    const w = card.offsetWidth || 300;
    const h = card.offsetHeight || 210;
    let x = screen.x - w / 2;
    let y = screen.y - h - 28;
    if (y < pad) y = screen.y + 30;
    x = Math.max(pad, Math.min(x, innerWidth - w - pad));
    y = Math.max(pad, Math.min(y, innerHeight - h - pad));
    card.style.left = x + 'px';
    card.style.top = y + 'px';

    const timerBar = card.querySelector('.cw-bc-timer');
    gsap.fromTo(timerBar, { scaleX: 1 }, { scaleX: 0, duration: 5, ease: 'none' });

    clearTimeout(popupTimer);
    popupTimer = setTimeout(hidePopup, 5000); /* تختفي بعد 5 ثوانٍ */
    card.querySelector('.cw-bc-close').addEventListener('click', hidePopup);
  }
  function hidePopup() {
    clearTimeout(popupTimer);
    $('#cwBrickCard').classList.remove('show');
  }

  /* ─── أزرار الأدوات ─── */
  const muteBtn = $('#cwMuteBtn');
  const applyMuteUI = () => {
    muteBtn.classList.toggle('on', sounds.muted);
    muteBtn.textContent = sounds.muted ? '🔇' : '🔊';
    muteBtn.title = sounds.muted ? 'تشغيل الأصوات' : 'كتم الأصوات';
  };
  muteBtn.addEventListener('click', () => { sounds.setMuted(!sounds.muted); applyMuteUI(); });
  applyMuteUI();

  const qBtn = $('#cwQualityBtn');
  if (isLow) qBtn.classList.add('on');
  qBtn.addEventListener('click', () => {
    const low = qBtn.classList.toggle('on');
    localStorage.setItem('cw_quality', low ? 'low' : 'high');
    if (wall) wall.setQuality(low ? 'low' : 'high');
    toast(low ? 'وضع الأداء الخفيف: بدون ظلال بدقة أقل' : 'وضع الجودة العالية: ظلال و تفاصيل كاملة');
  });

  $('#cwResetBtn').addEventListener('click', () => {
    wall && wall.resetView();
  });

  $('#cwFullscreenBtn').addEventListener('click', () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen && el.requestFullscreen();
    else document.exitFullscreen();
  });

  /* ─── تموضع اللمسات ─── */
  function loaderProgress(p) {
    const bar = $('#cwLoaderBar');
    if (bar) bar.style.width = Math.round(p * 100) + '%';
  }
  function hideLoader() {
    const l = document.getElementById('cwLoader');
    if (!l) return; /* ربما أُخفي مسبقًا */
    loaderProgress(1);
    l.classList.add('hide');
    setTimeout(() => l.remove(), 700);
  }
  function offlineNotice(error) {
    const n = $('#cwNotice');
    const detail = error && error.message ? ' (' + error.message + ')' : '';
    n.textContent = '⚠️ تعذر تأكيد الاتصال بقاعدة البيانات؛ لم يتم تحميل بيانات الحائط الحقيقية. تحقق من Firebase والاتصال.' + detail;
    n.classList.add('show');
  }
  function toast(msg) {
    let t = $('#cwToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'cwToast';
      t.className = 'cw-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 3200);
  }
  window.cwToast = toast;

  /* ─── شعار وضع المعاينة ─── */
  if (TEST_MODE) {
    const b = document.createElement('div');
    b.className = 'cw-test-banner';
    b.textContent = 'وضع معاينة فقط — طوبات عرض مؤقتة لا تُحفظ ولا تُعدّ تبرعات حقيقية';
    document.body.appendChild(b);
  }

  /* ─── PWA ─── */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  /* ─── إخفاء غطاء التحميل بعد أول بيانات أو مهلة (لا شاشة سوداء أبدًا) ─── */
  loaderProgress(0.25);
  setTimeout(() => { if (document.getElementById('cwLoader')) hideLoader(); }, 8000); /* شبكة أمان */
  try {
    await loadData();
  } catch (e) {
    console.warn('تعذر تحميل البيانات:', e);
    offlineNotice();
  }
  loaderProgress(0.95);
  setTimeout(hideLoader, 350);

  /* ترحيب أول تفاعل */
  const greetOnce = () => {
    sounds._ensureCtx();
    window.removeEventListener('pointerdown', greetOnce);
  };
  window.addEventListener('pointerdown', greetOnce, { passive: true });
}

main().catch(err => {
  console.error(err);
  const l = document.getElementById('cwLoader');
  if (l) l.innerHTML = `<div class="cw-loader-box"><div style="font-size:2.2rem">🧱</div><div>حدث خطأ في التحميل — أعد تحديث الصفحة</div></div>`;
});
