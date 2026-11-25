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
      desc: 'اللكمة الأساسية في الكونغ فو، مصدر قوتها من الأرض عبر الفخذين وانتهاها في القبضة. تتدرّب عليها من وضع الحصان أو وضع القتال مع إخراج النفس بقوة عند الضرب.',
      beltColor: '#dc2626',
      image: '01.jpg'
    },
    {
      id: 'hook-punch',
      name: 'اللكمة الخطّافة',
      cn: '勾拳',
      tag: 'قو تشوان',
      sfx: 'punch',
      desc: 'لكمة دائرية من الجانب تصيب فك الخصم أو صدغه. تعتمد على دوران الخصر مع ثبات القدم، وتتبع لكماتك المستقيمة كسلسلة ضربات متعاقبة.',
      beltColor: '#e8a020',
      image: '02.jpg'
    },
    {
      id: 'front-kick',
      name: 'ركلة الدهس الأمامية',
      cn: '蹬腿',
      tag: 'دنغ توي',
      sfx: 'kick',
      desc: 'ركلة أمامية قوية بباطن القدم تُستخدم للدفاع وإبعاد الخصم. تُمارَس على كيس الملاكمة مع تثبيت توازن الجسد على الرجل الثابتة.',
      beltColor: '#2ea06a',
      image: '03.jpg'
    },
    {
      id: 'side-kick',
      name: 'الركلة الجانبية',
      cn: '侧踢',
      tag: 'تسه توي',
      sfx: 'kick',
      desc: 'ركلة جانبية بحرف القدم تُعدّ من أقوى ركلات الكونغ فو، تُستخدم في حركة التنين (هجوم بركلة جانبية نحو المعدة) وتُطوّر توازن الجذع وانفعال الأرداف.',
      beltColor: '#38bdf8',
      image: '04.jpg'
    },
    {
      id: 'outer-block',
      name: 'الصد الخارجي',
      cn: '外挡',
      tag: 'واي دان',
      sfx: 'block',
      desc: 'أساس صد هجمات الخصم في الكونغ فو: تبدأ دائماً من وضع القتال، وتستخدم الذراع الموجودة في الجانب المهدد للصد. اللكمات تُصد بذراع واحدة والركلات وضربات المرفق بكلا الذراعين.',
      beltColor: '#c2410c',
      image: '05.jpg'
    },
    {
      id: 'palm-strike',
      name: 'ضربة راحة اليد',
      cn: '推掌',
      tag: 'توي جانغ',
      sfx: 'punch',
      desc: 'ضربة براحة اليد المفتوحة تُستخدم في حركة الفهد (الاقتراب وإلقاء الثقل للأمام والضرب براحة اليد). تُنفّذ بسرعة خاطفة مع دفع ثقل الجسد كاملاً خلفها.',
      beltColor: '#ec4899',
      image: '06.jpg'
    },
    {
      id: 'bag-training',
      name: 'التدرّب على كيس الملاكمة',
      cn: '打袋',
      tag: 'دا داي',
      sfx: 'whoosh',
      desc: 'الطريقة الصحيحة للتمرين: ابدأ بتنفيذ مجموعات الضرب في الفراغ (تاولو) حتى تُتقن شكل الحركة، ثم انتقل إلى كيس الملاكمة لتوفير مقاومة حقيقية، ويمكن لاحقاً التمرن مع صديق.',
      beltColor: '#f59e0b',
      image: '07.jpg'
    },
    {
      id: 'horse-stance',
      name: 'وقفة الحصان',
      cn: '馬步',
      tag: 'ما بو',
      sfx: 'tap',
      desc: 'الوقفة الأولى التي يجب إتقانها في الكونغ فو: انزل بجسدك مع تباعد القدمين وثني الركبتين وثبات الظهر مستقيماً. أساس كل الأوضاع: الحصان والوضع الأمامي ووضع القطة ووضع القتال.',
      beltColor: '#a3e635',
      image: '08.jpg'
    }
  ];

  /* ============ بيانات الأحزمة العشرة ============ */
  const BELTS = [
    { n: 1, name: 'حزام الكونغ فو الأبيض', en: 'White Belt', level: 'الدرجة الأولى', color: '#ffffff', light: '#ffffff', dark: '#cbd5e1', glow: 'rgba(255,255,255,0.45)', desc: 'البداية والنقاء: نظافة ذهن المتدرب من أي خبرة سابقة وتعلّم الوقفات الأساسية والآداب والانضباط.' },
    { n: 2, name: 'حزام الكونغ فو الأصفر', en: 'Yellow Belt', level: 'الدرجة الثانية', color: '#facc15', light: '#fef08a', dark: '#ca8a04', glow: 'rgba(250,204,21,0.5)', desc: 'لعيب مبتدئ: البذرة الأولى للمعرفة، إتقان اللكمات المستقيمة والركلات الأساسية وأول سلاسل حركات (تاولو).' },
    { n: 3, name: 'حزام الكونغ فو الذهبي', en: 'Gold Belt', level: 'الدرجة الثالثة', color: '#e8a020', light: '#fcd34d', dark: '#b45309', glow: 'rgba(232,160,32,0.55)', desc: 'لعيب مبتدئ: التطور الواضح في الأداء، جمع بين قوة الحصان وسرعة القتال في أول أشكال التقليدية.' },
    { n: 4, name: 'حزام الكونغ فو البرتقالي', en: 'Orange Belt', level: 'الدرجة الرابعة', color: '#fb923c', light: '#fed7aa', dark: '#c2410c', glow: 'rgba(251,146,60,0.5)', desc: 'لعيب مبتدئ: النار المتقدة — التزام متزايد، ركلات أقوى وصدات مركبة وأول تطبيقات مع شريك تدريبي.' },
    { n: 5, name: 'حزام الكونغ فو الأخضر', en: 'Green Belt', level: 'الدرجة الخامسة', color: '#22c55e', light: '#86efac', dark: '#15803d', glow: 'rgba(34,197,94,0.5)', desc: 'لعيب متوسط: النمو والتجذير — إتقان الأوضاع الأربعة (الحصان والأمامي والقطة والقتال) وحركة النمر أو التنين.' },
    { n: 6, name: 'حزام الكونغ فو الأزرق', en: 'Blue Belt', level: 'الدرجة السادسة', color: '#3b82f6', light: '#93c5fd', dark: '#1d4ed8', glow: 'rgba(59,130,246,0.5)', desc: 'لعيب متوسط: السماء الواسعة — التعلّم بلا حدود، إدخال أساليب الحيوانات الخمسة وضربات راحة اليد والخطافة.' },
    { n: 7, name: 'حزام الكونغ فو البنفسجي', en: 'Purple Belt', level: 'الدرجة السابعة', color: '#a855f7', light: '#d8b4fe', dark: '#7e22ce', glow: 'rgba(168,85,247,0.5)', desc: 'لعيب متوسط: بداية الفهم العميق لفلسفة وو دانج الداخلية والتأمل، والجمع بين الأسلوب الخارجي والداخلي.' },
    { n: 8, name: 'حزام الكونغ فو البني', en: 'Brown Belt', level: 'الدرجة الثامنة', color: '#92400e', light: '#d69156', dark: '#451a03', glow: 'rgba(146,64,14,0.6)', desc: 'لعيب متقدم: الأرض والانضباط — صلابة الأداء، تاولو كاملة بلا توقف، وقيادة أجزاء من الحصة التدريبية.' },
    { n: 9, name: 'حزام الكونغ فو الأحمر', en: 'Red Belt', level: 'الدرجة التاسعة', color: '#dc2626', light: '#fca5a5', dark: '#991b1b', glow: 'rgba(220,38,38,0.55)', desc: 'لعيب متقدم: الطاقة الكاملة — إتقان القوة والسرعة والدقة، ومساعدة المدرب في تعليم المبتدئين.' },
    { n: 10, name: 'حزام الكونغ فو الأسود', en: 'Black Belt', level: 'الدرجة العاشرة', color: '#111111', light: '#4b5563', dark: '#000000', glow: 'rgba(232,160,32,0.4)', desc: 'قمة التتويج: الإتقان الشامل للأساليب الخارجية والداخلية، والدان الثاني والما فوقه يقود الأكاديميات والاختبارات.' }
  ];

  /* ============ بيانات أساليب الحيوانات الخمسة ============ */
  const ANIMALS = [
    { name: 'حركة التنين', cn: '龙', image: '011.jpg', color: '#dc2626', desc: 'أسلوب الإخافة والهيبة: حدّق في الخصم، اتخذ وضع الحصان مع استخدام الرسغ بشكل مخلب، ثم هاجم بركلة جانبية نحو المعدة.' },
    { name: 'حركة الأفعى', cn: '蛇', image: '012.png', color: '#2ea06a', desc: 'أسلوب التسلل والرد: تسلّل للخلف وارفع رأسك عند الضرب، أبعد ساقيك بثقل على الخلفية، اصد بجذب ذراع الخصم ثم هاجم بركلة الدهس.' },
    { name: 'حركة الفهد', cn: '豹', image: '013.jpg', color: '#e8a020', desc: 'أسلوب غير مباشر يتيح الفرار عند الحاجة: خذ وضعية قتالية واسعة، ألقِ بثقلك للأمام بسرعة واضرب براحة اليد.' },
    { name: 'حركة الكركي (الطائر)', cn: '鹤', image: '014.jpg', color: '#38bdf8', desc: 'أسلوب سلبي ينتظر هجوم الخصم: اتخذ وضع القطة مع رفع الذراعين جانبًا، ثم ردّ فورًا بركلتك المفضلة.' },
    { name: 'حركة النمر', cn: '虎', image: '015.jpg', color: '#f59e0b', desc: 'أسلوب الهجوم الخاطف والحماس: اجلس قرفصاءً وضع يديك بشكل براثن، ثم اهجم بلكمات متعاقبة وركلة جانبية نحو الحنجرة.' }
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

  /* ============ توليد الأحزمة العشرة ============ */
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

  /* ============ توليد أساليب الحيوانات الخمسة ============ */
  function renderAnimals() {
    const grid = document.getElementById('animalsGrid');
    if (!grid) return;
    grid.innerHTML = ANIMALS.map(function (a) {
      return `
      <article class="animal-card reveal" style="--animal-color:${a.color}; --animal-glow:${a.color}55">
        <div class="animal-photo-wrap"><img class="animal-photo" src="assets/images/photos/${a.image}" alt="${a.name}" loading="lazy" decoding="async" data-lightbox="assets/images/photos/${a.image}" data-caption="${a.name}"></div>
        <h4>${a.name} <span class="cn">${a.cn}</span></h4>
        <p>${a.desc}</p>
      </article>`;
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
    renderAnimals();
    setupLightbox();
    setupReveal();
    setupActiveNav();
    setupYear();
    setupCoachImage();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
