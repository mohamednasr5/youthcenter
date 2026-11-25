/* kungfu.js — أكاديمية الكونغ فو: صور تدريب فعلية وتفاعل خفيف
   - يعرض صور الحركات والتدريبات الأصلية من ملفات الأكاديمية
   - يولّد نظام الأحزمة العشرة
   - يدير Lightbox للصور و Reveal عند التمرير والتنقل النشط
   مصدر الشرح التعليمي: مقال ويكي هاو "كيفية تعلم الكونغ فو بنفسك"
   https://ar.wikihow.com/تعلم-الكونغ-فو-بنفسك
*/

(function () {
  'use strict';

  /* ============ بيانات الحركات مع صور الأكاديمية الأصلية ============ */
  const MOVES = [
    {
      id: 'straight-punch',
      name: 'اللكمة المستقيمة',
      cn: '冲拳',
      tag: 'تشونغ تشوان',
      sfx: 'punch',
      desc: 'يظهر في الصورة المتدرب في وضع أمامي ثابت، يمد إحدى قبضتيه مباشرة إلى الأمام مع سحب القبضة الأخرى قرب الخصر. حافظ على استقامة الرسغ وثبات الركبتين، واجعل دوران الجذع محدودًا ومنضبطًا.',
      beltColor: '#dc2626',
      image: '03.jpg'
    },
    {
      id: 'guard-stance',
      name: 'وضع الاستعداد والقتال',
      cn: '格斗式',
      tag: 'وضع الحراسة',
      sfx: 'block',
      desc: 'يقف المتدرب بقدم أمامية وأخرى خلفية مع ثني الركبتين قليلًا، ويرفع قبضتيه أمام الصدر والوجه لحماية الجسم. هذه وضعية استعداد وليست لكمة أو صدًا مكتملًا.',
      beltColor: '#e8a020',
      image: '04.jpg'
    },
    {
      id: 'front-kick',
      name: 'الركلة الأمامية',
      cn: '正踢',
      tag: 'تشنغ تي',
      sfx: 'kick',
      desc: 'تُظهر الصورة رفع الركبة ثم مد القدم إلى الأمام باتجاه الهدف. ارفع الركبة أولًا، وادفع من مفصل الورك، ثم اسحب الساق إلى وضعها قبل إنزال القدم مع الحفاظ على توازن الرجل الثابتة.',
      beltColor: '#2ea06a',
      image: '05.jpg'
    },
    {
      id: 'crane-balance',
      name: 'التوازن على ساق واحدة',
      cn: '鹤式平衡',
      tag: 'وضع الكركي',
      sfx: 'tap',
      desc: 'يقف المتدرب على ساق واحدة ويرفع الأخرى جانبًا مع مد الذراعين للموازنة. ركّز على ثبات القدم المرتكزة واستقامة الجذع، ولا ترفع الساق أعلى من مدى حركتك الآمن.',
      beltColor: '#38bdf8',
      image: '010.jpg'
    },
    {
      id: 'partner-defense',
      name: 'تطبيق دفاعي مع شريك',
      cn: '对练',
      tag: 'تدريب ثنائي',
      sfx: 'block',
      desc: 'الصورة تعرض تدريبًا ثنائيًا: أحد اللاعبين ينفذ ركلة أمامية، والآخر يتدرّب على اعتراضها وصدّها بذراعيه. يُنفّذ هذا التمرين ببطء وتحت إشراف مدرب مع ترك مسافة آمنة.',
      beltColor: '#c2410c',
      image: '015.jpg'
    },
    {
      id: 'bag-training',
      name: 'التدريب على كيس الملاكمة',
      cn: '打沙袋',
      tag: 'دا شادي',
      sfx: 'whoosh',
      desc: 'تُظهر الصورة مرحلتين من التدريب على الكيس: توجيه لكمة مستقيمة ثم تنفيذ ركلة أمامية. ابدأ بقوة خفيفة، وثبّت الكيس جيدًا، واستخدم لفافات اليد والقفازات المناسبة.',
      beltColor: '#f59e0b',
      image: '06.jpg'
    },
    {
      id: 'horse-stance',
      name: 'وقفة الحصان',
      cn: '马步',
      tag: 'ما بو',
      sfx: 'tap',
      desc: 'يقف المتدرب بقدمين متباعدتين، ويوجه القدمين إلى الأمام أو بزاوية مريحة، ثم يثني الركبتين مع إبقاء الظهر مستقيمًا والصدر مرفوعًا. وزّع الوزن بالتساوي على القدمين.',
      beltColor: '#a3e635',
      image: '02.jpg'
    },
    {
      id: 'warmup-flexibility',
      name: 'الإحماء والمرونة',
      cn: '热身',
      tag: 'تهيئة الجسم',
      sfx: 'tap',
      desc: 'تجمع الصورة تمرين إطالة للجزء الخلفي من الساق مع تمرين ضغط أرضي. ابدأ بإحماء تدريجي، ونفّذ الإطالة دون ارتداد أو ألم، ثم استخدم تمارين القوة لتهيئة الجسم للتدريب.',
      beltColor: '#a78bfa',
      image: '01.jpg'
    }
  ];
  /* ============ بيانات الأحزمة السبعة المعتمدة بالأكاديمية ============ */
  const BELTS = [
    { n: 1, name: 'حزام الكونغ فو الأصفر', en: 'Yellow Belt', level: 'الدرجة الأولى', color: '#facc15', light: '#fef08a', dark: '#ca8a04', glow: 'rgba(250,204,21,0.5)', desc: 'مرحلة البداية: تعلّم الوقفات الأساسية واللكمات المستقيمة والركلات الأساسية وأول سلاسل الحركات (تاولو).' },
    { n: 2, name: 'حزام الكونغ فو البرتقالي', en: 'Orange Belt', level: 'الدرجة الثانية', color: '#fb923c', light: '#fed7aa', dark: '#c2410c', glow: 'rgba(251,146,60,0.5)', desc: 'تطوير الالتزام والتحكم في الحركة، مع ركلات أقوى وصدّات مركبة وتطبيقات أولية مع شريك تدريبي.' },
    { n: 3, name: 'حزام الكونغ فو الأخضر', en: 'Green Belt', level: 'الدرجة الثالثة', color: '#22c55e', light: '#86efac', dark: '#15803d', glow: 'rgba(34,197,94,0.5)', desc: 'مرحلة النمو والتجذّر: إتقان الأوضاع الأساسية مثل الحصان والأمامي والقطة والقتال، وتطوير التوازن والثبات.' },
    { n: 4, name: 'حزام الكونغ فو الأزرق', en: 'Blue Belt', level: 'الدرجة الرابعة', color: '#3b82f6', light: '#93c5fd', dark: '#1d4ed8', glow: 'rgba(59,130,246,0.5)', desc: 'توسيع المهارات الفنية، والتدرّب على ضربات راحة اليد والحركات المركبة وتحسين الدقة والتوازن.' },
    { n: 5, name: 'حزام الكونغ فو الأحمر', en: 'Red Belt', level: 'الدرجة الخامسة', color: '#dc2626', light: '#fca5a5', dark: '#991b1b', glow: 'rgba(220,38,38,0.55)', desc: 'مرحلة متقدمة تركز على القوة والسرعة والدقة، وإتقان التتابعات الحركية ومساعدة اللاعبين الأصغر سنًا.' },
    { n: 6, name: 'حزام الكونغ فو البني', en: 'Brown Belt', level: 'الدرجة السادسة', color: '#92400e', light: '#d69156', dark: '#451a03', glow: 'rgba(146,64,14,0.6)', desc: 'مرحلة الإعداد المتقدم: صلابة الأداء، وإتقان التاولو كاملة دون توقف، والاستعداد للمستوى الأعلى.' },
    { n: 7, name: 'حزام الكونغ فو الأسود', en: 'Black Belt', level: 'الدرجة السابعة', color: '#111111', light: '#4b5563', dark: '#000000', glow: 'rgba(232,160,32,0.4)', desc: 'مرحلة الإتقان: مستوى متقدم في الأساليب والحركات، مع مواصلة التطور الفني والانضباط والمشاركة في تعليم اللاعبين.' }
  ];

  /* ============ توليد بطاقات الحركات ============ */
  function renderMoves() {
    const grid = document.getElementById('movesGrid');
    if (!grid) return;
    grid.innerHTML = MOVES.map(function (move) {
      const src = 'assets/images/photos/' + move.image;
      return `
      <article class="move-card reveal" data-move="${move.id}">
        <div class="move-card-head">
          <h4>${move.name}</h4>
          <span class="jp-name">${move.cn}</span>
        </div>
        <div class="move-stage">
          <img class="move-real-photo" src="${src}" alt="${move.name}" loading="lazy" decoding="async" data-lightbox="${src}" data-caption="${move.name}">
        </div>
        <p>${move.desc}</p>
        <span class="move-tag">${move.tag}</span>
      </article>`;
    }).join('');
  }

  /* ============ توليد الأحزمة السبعة ============ */
  function renderBelts() {
    const track = document.getElementById('beltsTrack');
    if (!track) return;
    track.innerHTML = BELTS.map(function (b, i) {
      return `
      <div class="belt-row reveal" data-belt="${b.n}" style="--belt-color:${b.color}; --belt-color-light:${b.light}; --belt-color-dark:${b.dark}; --belt-color-glow:${b.glow}; transition-delay:${i * 0.05}s">
        <div class="belt-visual"></div>
        <div class="belt-info">
          <h4>${b.name} <span class="jp">• ${b.en}</span></h4>
          <p>${b.desc}</p>
        </div>
        <div class="belt-level">${b.n}</div>
      </div>`;
    }).join('');
  }

  /* ============ Lightbox ============ */
  function setupLightbox() {
    const overlay = document.getElementById('lightbox');
    if (!overlay) return;
    const img = document.getElementById('lightboxImg');
    const cap = document.getElementById('lightboxCaption');
    document.addEventListener('click', function (e) {
      const target = e.target.closest('[data-lightbox]');
      if (target) {
        img.src = target.getAttribute('data-lightbox') || target.src;
        img.alt = target.alt || '';
        cap.textContent = target.getAttribute('data-caption') || '';
        overlay.classList.add('active');
      }
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('lightbox-close')) {
        overlay.classList.remove('active');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') overlay.classList.remove('active');
    });
  }

  /* ============ Reveal عند التمرير ============ */
  function setupReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ============ التنقل النشط ============ */
  function setupActiveNav() {
    const links = document.querySelectorAll('.bottom-nav-item');
    const sections = document.querySelectorAll('section[id]');
    if (!links.length || !sections.length) return;
    window.addEventListener('scroll', function () {
      let current = '';
      sections.forEach(function (sec) {
        if (window.scrollY >= sec.offsetTop - 140) current = sec.id;
      });
      links.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    }, { passive: true });
  }

  /* ============ السنة الحالية ============ */
  function setupYear() {
    const y = document.getElementById('currentYear');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ============ مدرب الصورة البديلة ============ */
  function setupCoachImage() {
    const img = document.getElementById('coachPhoto');
    if (!img) return;
    img.addEventListener('error', function () {
      img.style.display = 'none';
      const ph = document.getElementById('coachPhotoPlaceholder');
      if (ph) ph.style.display = 'grid';
    });
  }

  /* ============ Init ============ */
  function init() {
    renderMoves();
    renderBelts();
    setupLightbox();
    setupReveal();
    setupActiveNav();
    setupYear();
    setupCoachImage();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
