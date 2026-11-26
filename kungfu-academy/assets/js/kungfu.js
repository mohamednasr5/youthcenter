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


  /* ============ Cinematic players carousel ============ */
  let playersCarouselIndex = 0;
  let playersCarouselTimer = null;
  let playersCarouselPaused = false;
  let playersCarouselTouchStartX = 0;
  let playersCarouselBound = false;

  function kungfuPlayerFile(number) {
    // Naming convention used in the uploaded folder:
    // player-01.jpg ... player-09.jpg, then player-010.jpg ... player-052.jpg
    const suffix = number < 10 ? String(number).padStart(2, '0') : String(number).padStart(3, '0');
    return 'assets/images/photos/player-' + suffix + '.jpg';
  }

  async function loadKungfuPlayersGallery() {
    const root = document.getElementById('playersGallery');
    const track = document.getElementById('players-carousel-track');
    if (!root || !track) return;

    const candidates = Array.from({length:52}, function(_, index) {
      const number = index + 1;
      return {src: kungfuPlayerFile(number), number:number};
    });

    const checked = await Promise.all(candidates.map(function(item) {
      return new Promise(function(resolve) {
        const probe = new Image();
        probe.onload = function(){ resolve(item); };
        probe.onerror = function(){ resolve(null); };
        probe.src = item.src;
      });
    }));
    const photos = checked.filter(Boolean);

    if (!photos.length) {
      track.innerHTML = '<p class="players-carousel-loading">لم يتم العثور على صور اللاعبين. تأكد من وجود player-01.jpg حتى player-052.jpg داخل assets/images/photos/</p>';
      return;
    }

    track.innerHTML = photos.map(function(photo, index) {
      const label = 'لاعب الكونغ فو رقم ' + String(photo.number).padStart(2, '0');
      return '<button class="players-carousel-slide" type="button" data-slide-index="' + index + '" aria-label="' + label + '" tabindex="-1">' +
        '<span class="players-carousel-image-frame"><img src="' + photo.src + '" alt="' + label + '" loading="' + (index < 3 ? 'eager' : 'lazy') + '" decoding="async" draggable="false"></span>' +
        '<span class="players-carousel-slide-number">' + label + '</span></button>';
    }).join('');

    root.classList.add('players-carousel');
    root.setAttribute('aria-label', 'معرض لاعبي أكاديمية الكونغ فو');
    playersCarouselIndex = 0;
    updateKungfuPlayersCarousel();
    setupKungfuPlayersCarouselControls();
    startKungfuPlayersCarousel();
  }

  function updateKungfuPlayersCarousel() {
    const track = document.getElementById('players-carousel-track');
    const counter = document.getElementById('players-carousel-counter');
    const dots = document.getElementById('players-carousel-dots');
    if (!track) return;
    const slides = Array.from(track.querySelectorAll('.players-carousel-slide'));
    const total = slides.length;
    if (!total) return;

    slides.forEach(function(slide, index) {
      let offset = index - playersCarouselIndex;
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;
      slide.className = 'players-carousel-slide';
      slide.dataset.position = String(offset);
      slide.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
      slide.tabIndex = offset === 0 ? 0 : -1;
      if (offset === 0) slide.classList.add('is-active');
      else if (Math.abs(offset) === 1) slide.classList.add(offset < 0 ? 'is-prev' : 'is-next');
      else if (Math.abs(offset) === 2) slide.classList.add('is-far');
      else slide.classList.add('is-hidden');
    });

    if (counter) counter.textContent = String(playersCarouselIndex + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    if (dots) {
      if (!dots.children.length) {
        dots.innerHTML = slides.map(function(_, index) {
          return '<button type="button" class="players-carousel-dot" data-go-to="' + index + '" aria-label="الصورة ' + (index + 1) + '"></button>';
        }).join('');
        dots.querySelectorAll('[data-go-to]').forEach(function(dot) {
          dot.addEventListener('click', function() {
            playersCarouselIndex = Number(dot.dataset.goTo);
            updateKungfuPlayersCarousel();
            restartKungfuPlayersCarousel();
          });
        });
      }
      dots.querySelectorAll('.players-carousel-dot').forEach(function(dot, index) {
        dot.classList.toggle('active', index === playersCarouselIndex);
        dot.setAttribute('aria-current', index === playersCarouselIndex ? 'true' : 'false');
      });
    }
  }

  function moveKungfuPlayersCarousel(direction) {
    const total = document.querySelectorAll('#players-carousel-track .players-carousel-slide').length;
    if (!total) return;
    playersCarouselIndex = (playersCarouselIndex + direction + total) % total;
    updateKungfuPlayersCarousel();
  }
  function stopKungfuPlayersCarousel() {
    if (playersCarouselTimer) { window.clearInterval(playersCarouselTimer); playersCarouselTimer = null; }
  }
  function startKungfuPlayersCarousel() {
    stopKungfuPlayersCarousel();
    if (playersCarouselPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    playersCarouselTimer = window.setInterval(function(){ moveKungfuPlayersCarousel(1); }, 2800);
  }
  function restartKungfuPlayersCarousel() {
    stopKungfuPlayersCarousel();
    startKungfuPlayersCarousel();
  }
  function setupKungfuPlayersCarouselControls() {
    const root = document.getElementById('playersGallery');
    if (!root || playersCarouselBound) return;
    playersCarouselBound = true;

    const previous = document.getElementById('players-carousel-prev');
    const next = document.getElementById('players-carousel-next');
    const pause = document.getElementById('players-carousel-pause');
    if (previous) previous.addEventListener('click', function(){ moveKungfuPlayersCarousel(-1); restartKungfuPlayersCarousel(); });
    if (next) next.addEventListener('click', function(){ moveKungfuPlayersCarousel(1); restartKungfuPlayersCarousel(); });
    if (pause) pause.addEventListener('click', function() {
      playersCarouselPaused = !playersCarouselPaused;
      pause.setAttribute('aria-pressed', String(playersCarouselPaused));
      pause.textContent = playersCarouselPaused ? '▶ تشغيل' : 'Ⅱ إيقاف';
      if (playersCarouselPaused) stopKungfuPlayersCarousel(); else startKungfuPlayersCarousel();
    });

    root.addEventListener('click', function(event) {
      const slide = event.target.closest('.players-carousel-slide');
      if (!slide) return;
      const image = slide.querySelector('img');
      const overlay = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightboxImg');
      const caption = document.getElementById('lightboxCaption');
      if (image && overlay && lightboxImg) {
        lightboxImg.src = image.src;
        lightboxImg.alt = image.alt;
        if (caption) caption.textContent = image.alt;
        overlay.classList.add('active');
      }
    });

    root.addEventListener('mouseenter', stopKungfuPlayersCarousel);
    root.addEventListener('mouseleave', startKungfuPlayersCarousel);
    root.addEventListener('focusin', stopKungfuPlayersCarousel);
    root.addEventListener('focusout', function(){ window.setTimeout(function(){ if (!root.contains(document.activeElement)) startKungfuPlayersCarousel(); }, 0); });
    root.addEventListener('keydown', function(event) {
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveKungfuPlayersCarousel(1); restartKungfuPlayersCarousel(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); moveKungfuPlayersCarousel(-1); restartKungfuPlayersCarousel(); }
    });
    root.addEventListener('touchstart', function(event){ playersCarouselTouchStartX = event.changedTouches[0].clientX; stopKungfuPlayersCarousel(); }, {passive:true});
    root.addEventListener('touchend', function(event) {
      const delta = event.changedTouches[0].clientX - playersCarouselTouchStartX;
      if (Math.abs(delta) > 45) moveKungfuPlayersCarousel(delta < 0 ? 1 : -1);
      startKungfuPlayersCarousel();
    }, {passive:true});
    document.addEventListener('visibilitychange', function(){ if (document.hidden) stopKungfuPlayersCarousel(); else startKungfuPlayersCarousel(); });
  }

  /* ============ Init ============ */
  function init() {
    renderMoves();
    renderBelts();
    loadKungfuPlayersGallery();
    setupLightbox();
    setupReveal();
    setupActiveNav();
    setupYear();
    setupCoachImage();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
