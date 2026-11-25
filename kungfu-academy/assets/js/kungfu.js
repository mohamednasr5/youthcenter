/* kungfu.js — أكاديمية الكونغ فو: أنيميشن وتفاعل ومؤثرات صوتية
   - يولّد بطاقات الحركات بأنيميشن SVG (أساليب الكونغ فو)
   - يولّد نظام الأحزمة العشرة
   - مؤثرات صوتية بالـ WebAudio (ضربة/ركلة/صد/صفعة كيس)
   - يدير Lightbox للصور و Reveal عند التمرير والتنقل النشط
   مصدر الشرح التعليمي: مقال ويكي هاو "كيفية تعلم الكونغ فو بنفسك"
   https://ar.wikihow.com/تعلم-الكونغ-فو-بنفسك
*/

(function () {
  'use strict';

  /* ============ المؤثرات الصوتية (WebAudio) ============ */
  const SFX = (function () {
    let ctx = null;
    let enabled = false;
    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function noiseBurst(dur, vol, band) {
      const c = ensure(); if (!c || !enabled) return;
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const src = c.createBufferSource(); src.buffer = buf;
      const filt = c.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = band; filt.Q.value = 0.9;
      const g = c.createGain(); g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      src.connect(filt); filt.connect(g); g.connect(c.destination);
      src.start();
    }
    function tone(freq, dur, vol, type) {
      const c = ensure(); if (!c || !enabled) return;
      const o = c.createOscillator(); o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      const g = c.createGain();
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    }
    return {
      toggle(on) { enabled = !!on; if (on) ensure(); },
      get enabled() { return enabled; },
      punch() { noiseBurst(0.14, 0.5, 700); tone(120, 0.12, 0.25, 'triangle'); },
      kick() { noiseBurst(0.2, 0.55, 320); tone(90, 0.16, 0.3, 'triangle'); },
      block() { noiseBurst(0.09, 0.32, 1400); tone(420, 0.07, 0.12, 'square'); },
      whoosh() { noiseBurst(0.3, 0.22, 900); },
      gong() {
        const c = ensure(); if (!c || !enabled) return;
        [164.8, 329.6, 523.2].forEach(function (f, i) {
          const o = c.createOscillator(); o.type = 'sine';
          o.frequency.value = f;
          const g = c.createGain();
          g.gain.setValueAtTime(0.14 / (i + 1), c.currentTime + i * 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 2.2);
          o.connect(g); g.connect(c.destination);
          o.start(c.currentTime + i * 0.02); o.stop(c.currentTime + 2.3);
        });
      },
      tap() { tone(660, 0.05, 0.08, 'square'); }
    };
  })();

  /* ============ بيانات حركات الكونغ فو (مع أنيميشن SVG) ============ */
  const MOVES = [
    {
      id: 'straight-punch',
      name: 'اللكمة المستقيمة',
      cn: '冲拳',
      tag: 'تشونغ تشوان',
      sfx: 'punch',
      desc: 'اللكمة الأساسية في الكونغ فو، مصدر قوتها من الأرض عبر الفخذين وانتهاها في القبضة. تتدرّب عليها من وضع الحصان أو وضع القتال مع إخراج النفس بقوة عند الضرب.',
      beltColor: '#dc2626',
      svg: PunchSVG
    },
    {
      id: 'hook-punch',
      name: 'اللكمة الخطّافة',
      cn: '勾拳',
      tag: 'قو تشوان',
      sfx: 'punch',
      desc: 'لكمة دائرية من الجانب تصيب فك الخصم أو صدغه. تعتمد على دوران الخصر مع ثبات القدم، وتتبع لكماتك المستقيمة كسلسلة ضربات متعاقبة.',
      beltColor: '#e8a020',
      svg: HookSVG
    },
    {
      id: 'front-kick',
      name: 'ركلة الدهس الأمامية',
      cn: '蹬腿',
      tag: 'دنغ توي',
      sfx: 'kick',
      desc: 'ركلة أمامية قوية بباطن القدم تُستخدم للدفاع وإبعاد الخصم. تُمارَس على كيس الملاكمة مع تثبيت توازن الجسد على الرجل الثابتة.',
      beltColor: '#2ea06a',
      svg: FrontKickSVG
    },
    {
      id: 'side-kick',
      name: 'الركلة الجانبية',
      cn: '侧踢',
      tag: 'تسه توي',
      sfx: 'kick',
      desc: 'ركلة جانبية بحرف القدم تُعدّ من أقوى ركلات الكونغ فو، تُستخدم في حركة التنين (هجوم بركلة جانبية نحو المعدة) وتُطوّر توازن الجذع وانفعال الأرداف.',
      beltColor: '#38bdf8',
      svg: SideKickSVG
    },
    {
      id: 'outer-block',
      name: 'الصد الخارجي',
      cn: '外挡',
      tag: 'واي دان',
      sfx: 'block',
      desc: 'أساس صد هجمات الخصم في الكونغ فو: تبدأ دائماً من وضع القتال، وتستخدم الذراع الموجودة في الجانب المهدد للصد. اللكمات تُصد بذراع واحدة والركلات وضربات المرفق بكلا الذراعين.',
      beltColor: '#c2410c',
      svg: BlockSVG
    },
    {
      id: 'palm-strike',
      name: 'ضربة راحة اليد',
      cn: '推掌',
      tag: 'توي جانغ',
      sfx: 'punch',
      desc: 'ضربة براحة اليد المفتوحة تُستخدم في حركة الفهد (الاقتراب وإلقاء الثقل للأمام والضرب براحة اليد). تُنفّذ بسرعة خاطفة مع دفع ثقل الجسد كاملاً خلفها.',
      beltColor: '#ec4899',
      svg: PalmSVG
    },
    {
      id: 'bag-training',
      name: 'التدرّب على كيس الملاكمة',
      cn: '打袋',
      tag: 'دا داي',
      sfx: 'whoosh',
      desc: 'الطريقة الصحيحة للتمرين: ابدأ بتنفيذ مجموعات الضرب في الفراغ (تاولو) حتى تُتقن شكل الحركة، ثم انتقل إلى كيس الملاكمة لتوفير مقاومة حقيقية، ويمكن لاحقاً التمرن مع صديق.',
      beltColor: '#f59e0b',
      svg: BagSVG
    },
    {
      id: 'horse-stance',
      name: 'وقفة الحصان',
      cn: '馬步',
      tag: 'ما بو',
      sfx: 'tap',
      desc: 'الوقفة الأولى التي يجب إتقانها في الكونغ فو: انزل بجسدك مع تباعد القدمين وثني الركبتين وثبات الظهر مستقيماً. أساس كل الأوضاع: الحصان والوضع الأمامي ووضع القطة ووضع القتال.',
      beltColor: '#a3e635',
      svg: HorseStanceSVG
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
    { name: 'حركة التنين', cn: '龙', emoji: '🐉', color: '#dc2626', desc: 'أسلوب الإخافة والهيبة: حدّق في الخصم، اتخذ وضع الحصان مع استخدام الرسغ بشكل مخلب، ثم هاجم بركلة جانبية نحو المعدة.' },
    { name: 'حركة الأفعى', cn: '蛇', emoji: '🐍', color: '#2ea06a', desc: 'أسلوب التسلل والرد: تسلّل للخلف وارفع رأسك عند الضرب، أبعد ساقيك بثقل على الخلفية، اصد بجذب ذراع الخصم ثم هاجم بركلة الدهس.' },
    { name: 'حركة الفهد', cn: '豹', emoji: '🐆', color: '#e8a020', desc: 'أسلوب غير مباشر يتيح الفرار عند الحاجة: خذ وضعية قتالية واسعة، ألقِ بثقلك للأمام بسرعة واضرب براحة اليد.' },
    { name: 'حركة الكركي (الطائر)', cn: '鹤', emoji: '🦢', color: '#38bdf8', desc: 'أسلوب سلبي ينتظر هجوم الخصم: اتخذ وضع القطة مع رفع الذراعين جانبًا، ثم ردّ فورًا بركلتك المفضلة.' },
    { name: 'حركة النمر', cn: '虎', emoji: '🐯', color: '#f59e0b', desc: 'أسلوب الهجوم الخاطف والحماس: اجلس قرفصاءً وضع يديك بشكل براثن، ثم اهجم بلكمات متعاقبة وركلة جانبية نحو الحنجرة.' }
  ];

  /* ============ دوال أنيميشن SVG (مقاتل كونغ فو) ============
     زي الكونغ فو (تشانغشان): قميص داكن بأكمام، حزام قماشي ملون.
  */

  function fighterCore(belt) {
    return `
      <circle class="fighter-head" cx="100" cy="38" r="14"/>
      <path class="kf-gi" d="M78 62 L122 62 L126 128 L74 128 Z"/>
      <line class="fighter-line" x1="100" y1="62" x2="100" y2="132"/>
      <rect class="fighter-belt" style="--belt-color:${belt}" x="72" y="104" width="56" height="13" rx="2"/>`;
  }

  // 1. اللكمة المستقيمة
  function PunchSVG() {
    return `
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="g-p" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(220,38,38,0.22)"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs>
      <ellipse cx="100" cy="176" rx="58" ry="8" fill="url(#g-p)"/>
      <g class="p-anim">
        ${fighterCore('#dc2626')}
        <line class="fighter-line" x1="86" y1="128" x2="80" y2="170"/>
        <line class="fighter-line" x1="114" y1="128" x2="124" y2="170"/>
        <circle class="fighter-body" cx="80" cy="96" r="7"/>
        <line class="fighter-line-thin" x1="88" y1="82" x2="80" y2="96"/>
        <g class="kf-punch">
          <line class="fighter-line" x1="112" y1="82" x2="152" y2="96"/>
          <circle class="fighter-body" cx="156" cy="96" r="8" fill="#f1f5f9"/>
          <g class="impact"><path d="M168 89 L184 89 M168 96 L184 96 M168 103 L184 103" stroke="#e8a020" stroke-width="3" stroke-linecap="round"/></g>
        </g>
      </g>
      <style>
        .p-anim { transform-origin: 100px 128px; }
        .p-anim .kf-punch { transform-origin: 112px 82px; animation: kfPunch 1.7s cubic-bezier(.6,0,.2,1) infinite; }
        .p-anim .impact { opacity: 0; animation: kfImpact 1.7s ease-in-out infinite; }
        .p-anim { animation: kfLunge 1.7s ease-in-out infinite; }
        @keyframes kfLunge { 0%,55% { transform: translateX(0); } 68% { transform: translateX(14px); } 100% { transform: translateX(0); } }
        @keyframes kfPunch { 0%,55% { transform: translateX(-32px) rotate(6deg); } 68%,80% { transform: translateX(0) rotate(0); } 100% { transform: translateX(-32px) rotate(6deg); } }
        @keyframes kfImpact { 0%,55% { opacity:0; } 68%,80% { opacity:1; transform: scale(1.35); } 100% { opacity:0; } }
      </style>
    </svg>`;
  }

  // 2. اللكمة الخطافة
  function HookSVG() {
    return `
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="g-h" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(232,160,32,0.22)"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs>
      <ellipse cx="100" cy="176" rx="56" ry="8" fill="url(#g-h)"/>
      <g class="h-anim">
        ${fighterCore('#e8a020')}
        <line class="fighter-line" x1="86" y1="128" x2="80" y2="170"/>
        <line class="fighter-line" x1="114" y1="128" x2="122" y2="170"/>
        <circle class="fighter-body" cx="80" cy="96" r="7"/>
        <line class="fighter-line-thin" x1="88" y1="82" x2="80" y2="96"/>
        <path class="hook-arc" d="M170 60 A 70 70 0 0 1 170 130" fill="none" stroke="rgba(232,160,32,0.4)" stroke-width="2" stroke-dasharray="4 5"/>
        <g class="kf-hook">
          <line class="fighter-line" x1="112" y1="82" x2="150" y2="78"/>
          <circle class="fighter-body" cx="154" cy="78" r="8" fill="#f1f5f9"/>
          <g class="impact"><path d="M166 68 L180 62 M166 82 L182 82" stroke="#e8a020" stroke-width="3" stroke-linecap="round"/></g>
        </g>
      </g>
      <style>
        .h-anim { transform-origin: 100px 96px; animation: hookRotate 1.9s ease-in-out infinite; }
        .h-anim .kf-hook { transform-origin: 112px 82px; animation: hookSwing 1.9s ease-in-out infinite; }
        .h-anim .impact { opacity: 0; animation: hookImpact 1.9s ease-in-out infinite; }
        @keyframes hookRotate { 0%,50% { transform: rotate(0); } 65% { transform: rotate(10deg); } 100% { transform: rotate(0); } }
        @keyframes hookSwing { 0%,50% { transform: translateX(-26px) translateY(-16px) rotate(-28deg); } 65%,78% { transform: translateX(0) rotate(0); } 100% { transform: translateX(-26px) translateY(-16px) rotate(-28deg); } }
        @keyframes hookImpact { 0%,50% { opacity:0; } 66%,78% { opacity:1; transform: scale(1.3); } 100% { opacity:0; } }
      </style>
    </svg>`;
  }

  // 3. ركلة الدهس الأمامية
  function FrontKickSVG() {
    return `
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="g-fk" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(46,160,106,0.24)"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs>
      <ellipse cx="100" cy="176" rx="52" ry="8" fill="url(#g-fk)"/>
      <g class="fk-anim">
        ${fighterCore('#2ea06a')}
        <line class="fighter-line-thin" x1="82" y1="78" x2="58" y2="92"/>
        <circle class="fighter-body" cx="55" cy="94" r="6"/>
        <line class="fighter-line-thin" x1="118" y1="78" x2="146" y2="90"/>
        <circle class="fighter-body" cx="148" cy="92" r="6"/>
        <line class="fighter-line" x1="96" y1="128" x2="88" y2="170"/>
        <g class="kf-frontkick">
          <line class="fighter-line" x1="106" y1="128" x2="150" y2="108"/>
          <path class="kf-sole" d="M150 108 L168 116 L152 124 Z" fill="#f1f5f9"/>
          <g class="impact"><path d="M172 104 L188 100 M176 118 L190 122" stroke="#e8a020" stroke-width="3" stroke-linecap="round"/></g>
        </g>
      </g>
      <style>
        .fk-anim { transform-origin: 100px 128px; }
        .fk-anim .kf-frontkick { transform-origin: 106px 128px; animation: fkKick 1.6s cubic-bezier(.5,0,.3,1) infinite; }
        .fk-anim .impact { opacity: 0; animation: fkImpact 1.6s ease-in-out infinite; }
        @keyframes fkKick { 0%,40% { transform: rotate(52deg); } 62%,78% { transform: rotate(2deg); } 100% { transform: rotate(52deg); } }
        @keyframes fkImpact { 0%,40% { opacity:0; } 62%,78% { opacity:1; transform: translateX(6px); } 100% { opacity:0; } }
      </style>
    </svg>`;
  }

  // 4. الركلة الجانبية
  function SideKickSVG() {
    return `
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="g-sk" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(56,189,248,0.24)"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs>
      <ellipse cx="100" cy="176" rx="52" ry="8" fill="url(#g-sk)"/>
      <path class="kick-arc" d="M64 160 A 60 60 0 0 1 158 96" fill="none" stroke="rgba(56,189,248,0.4)" stroke-width="2" stroke-dasharray="3 4"/>
      <g class="sk-anim">
        ${fighterCore('#38bdf8')}
        <line class="fighter-line-thin" x1="82" y1="78" x2="56" y2="86"/>
        <circle class="fighter-body" cx="53" cy="87" r="6"/>
        <line class="fighter-line-thin" x1="118" y1="78" x2="146" y2="84"/>
        <circle class="fighter-body" cx="148" cy="85" r="6"/>
        <line class="fighter-line" x1="96" y1="128" x2="90" y2="170"/>
        <g class="kf-sidekick">
          <line class="fighter-line" x1="106" y1="128" x2="156" y2="94"/>
          <path class="kf-blade" d="M156 94 L174 88 L168 106 Z" fill="#f1f5f9"/>
          <g class="impact"><path d="M180 82 L194 76 M182 100 L196 104" stroke="#e8a020" stroke-width="3" stroke-linecap="round"/></g>
        </g>
      </g>
      <style>
        .sk-anim { transform-origin: 100px 128px; }
        .sk-anim .kf-sidekick { transform-origin: 106px 128px; animation: skKick 2s ease-in-out infinite; }
        .sk-anim .impact { opacity: 0; animation: skImpact 2s ease-in-out infinite; }
        @keyframes skKick { 0% { transform: rotate(0deg); } 45% { transform: rotate(16deg); } 62%,80% { transform: rotate(-58deg); } 100% { transform: rotate(0deg); } }
        @keyframes skImpact { 0%,55% { opacity:0; } 63%,80% { opacity:1; } 100% { opacity:0; } }
      </style>
    </svg>`;
  }

  // 5. الصد الخارجي
  function BlockSVG() {
    return `
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="g-b" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(194,65,12,0.24)"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs>
      <ellipse cx="100" cy="176" rx="52" ry="8" fill="url(#g-b)"/>
      <g class="incoming"><line x1="30" y1="4" x2="86" y2="46" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/><circle cx="28" cy="2" r="6" fill="#dc2626"/></g>
      <g class="b-anim">
        ${fighterCore('#c2410c')}
        <line class="fighter-line" x1="86" y1="128" x2="80" y2="170"/>
        <line class="fighter-line" x1="114" y1="128" x2="122" y2="170"/>
        <line class="fighter-line-thin" x1="118" y1="80" x2="140" y2="94"/>
        <circle class="fighter-body" cx="143" cy="96" r="6"/>
        <g class="kf-block">
          <line class="fighter-line" x1="84" y1="84" x2="84" y2="28"/>
          <rect x="76" y="18" width="17" height="16" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
        </g>
        <g class="impact"><path d="M96 22 L108 16 M98 34 L110 40" stroke="#e8a020" stroke-width="3" stroke-linecap="round"/></g>
      </g>
      <style>
        .b-anim .kf-block { transform-origin: 84px 84px; animation: kBlock 1.7s cubic-bezier(.5,0,.3,1) infinite; }
        .incoming { animation: incomingAtk 1.7s ease-in-out infinite; }
        .b-anim .impact { opacity: 0; animation: blockImpact 1.7s ease-in-out infinite; }
        @keyframes kBlock { 0%,40% { transform: rotate(28deg) translateY(8px); } 58%,78% { transform: rotate(-6deg) translateY(0); } 100% { transform: rotate(28deg) translateY(8px); } }
        @keyframes incomingAtk { 0% { transform: translateX(70px); opacity: 0; } 40% { opacity: 1; } 56% { transform: translateX(6px); } 70% { transform: translateX(-18px); opacity: 0; } 100% { transform: translateX(70px); opacity: 0; } }
        @keyframes blockImpact { 0%,48% { opacity:0; } 58%,72% { opacity:1; } 100% { opacity:0; } }
      </style>
    </svg>`;
  }

  // 6. ضربة راحة اليد
  function PalmSVG() {
    return `
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="g-pm" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(236,72,153,0.22)"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs>
      <ellipse cx="100" cy="176" rx="56" ry="8" fill="url(#g-pm)"/>
      <g class="pm-anim">
        ${fighterCore('#ec4899')}
        <line class="fighter-line" x1="86" y1="128" x2="78" y2="170"/>
        <line class="fighter-line" x1="114" y1="128" x2="128" y2="170"/>
        <circle class="fighter-body" cx="120" cy="96" r="7"/>
        <line class="fighter-line-thin" x1="116" y1="82" x2="120" y2="96"/>
        <g class="kf-palm">
          <line class="fighter-line" x1="88" y1="82" x2="128" y2="86"/>
          <g class="open-palm">
            <rect x="130" y="78" width="20" height="16" rx="5" fill="#f1f5f9" stroke="#94a3b8"/>
            <line x1="132" y1="72" x2="132" y2="60" stroke="#f1f5f9" stroke-width="4" stroke-linecap="round"/>
            <line x1="138" y1="72" x2="138" y2="56" stroke="#f1f5f9" stroke-width="4" stroke-linecap="round"/>
            <line x1="145" y1="72" x2="145" y2="58" stroke="#f1f5f9" stroke-width="4" stroke-linecap="round"/>
          </g>
          <g class="impact"><path d="M156 74 L172 70 M156 92 L172 96" stroke="#e8a020" stroke-width="3" stroke-linecap="round"/></g>
        </g>
      </g>
      <style>
        .pm-anim { transform-origin: 100px 96px; }
        .pm-anim { animation: palmRotate 1.8s ease-in-out infinite; }
        .pm-anim .kf-palm { transform-origin: 88px 82px; animation: palmPush 1.8s cubic-bezier(.55,0,.25,1) infinite; }
        .pm-anim .impact { opacity: 0; animation: palmImpact 1.8s ease-in-out infinite; }
        @keyframes palmRotate { 0%,45% { transform: rotate(0); } 62% { transform: rotate(-9deg); } 100% { transform: rotate(0); } }
        @keyframes palmPush { 0%,45% { transform: translateX(-34px); } 62%,78% { transform: translateX(0); } 100% { transform: translateX(-34px); } }
        @keyframes palmImpact { 0%,58% { opacity:0; } 64%,78% { opacity:1; transform: scale(1.25); } 100% { opacity:0; } }
      </style>
    </svg>`;
  }

  // 7. التدرّب على كيس الملاكمة
  function BagSVG() {
    return `
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="g-bg" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(245,158,11,0.2)"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs>
      <ellipse cx="100" cy="180" rx="60" ry="8" fill="url(#g-bg)"/>
      <line x1="140" y1="0" x2="140" y2="26" stroke="#6b4f2a" stroke-width="4"/>
      <g class="kf-bag">
        <rect x="118" y="26" width="44" height="86" rx="12" fill="#8b5e34" stroke="#5c3d1e" stroke-width="2"/>
        <line x1="118" y1="52" x2="162" y2="52" stroke="#5c3d1e" stroke-width="2"/>
        <line x1="118" y1="80" x2="162" y2="80" stroke="#5c3d1e" stroke-width="2"/>
        <ellipse class="bag-dent" cx="104" cy="70" rx="12" ry="8" fill="#f1f5f9" opacity="0"/>
      </g>
      <g class="bag-fighter">
        <circle class="fighter-head" cx="74" cy="42" r="12"/>
        <path class="kf-gi" d="M56 62 L92 62 L95 122 L53 122 Z"/>
        <rect class="fighter-belt" style="--belt-color:#f59e0b" x="52" y="100" width="46" height="11" rx="2"/>
        <line class="fighter-line" x1="66" y1="122" x2="60" y2="164"/>
        <line class="fighter-line" x1="84" y1="122" x2="90" y2="164"/>
        <line class="fighter-line-thin" x1="60" y1="76" x2="40" y2="90"/>
        <g class="bag-punch">
          <line class="fighter-line" x1="88" y1="80" x2="108" y2="70"/>
          <circle class="fighter-body" cx="112" cy="68" r="7" fill="#f1f5f9"/>
        </g>
      </g>
      <style>
        .kf-bag { transform-origin: 140px 26px; animation: bagSwing 1.7s ease-in-out infinite; }
        .bag-punch { transform-origin: 88px 80px; animation: bagPunch 1.7s cubic-bezier(.6,0,.2,1) infinite; }
        .bag-fighter { animation: bagLunge 1.7s ease-in-out infinite; transform-origin: 74px 122px; }
        .bag-dent { animation: bagDent 1.7s ease-in-out infinite; }
        @keyframes bagSwing { 0%,55% { transform: rotate(0); } 66% { transform: rotate(9deg); } 82% { transform: rotate(-4deg); } 100% { transform: rotate(0); } }
        @keyframes bagPunch { 0%,52% { transform: translateX(-16px); } 64%,76% { transform: translateX(0); } 100% { transform: translateX(-16px); } }
        @keyframes bagLunge { 0%,52% { transform: translateX(0); } 64% { transform: translateX(6px); } 100% { transform: translateX(0); } }
        @keyframes bagDent { 0%,60% { opacity:0; } 66%,72% { opacity:.9; } 80% { opacity:0; } }
      </style>
    </svg>`;
  }

  // 8. وقفة الحصان
  function HorseStanceSVG() {
    return `
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="g-hs" cx="50%" cy="50%"><stop offset="0%" stop-color="rgba(163,230,53,0.2)"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs>
      <ellipse cx="100" cy="180" rx="70" ry="9" fill="url(#g-hs)"/>
      <g class="hs-anim">
        <circle class="fighter-head" cx="100" cy="52" r="14"/>
        <path class="kf-gi" d="M78 76 L122 76 L126 138 L74 138 Z"/>
        <line class="fighter-line" x1="100" y1="76" x2="100" y2="146"/>
        <rect class="fighter-belt" style="--belt-color:#a3e635" x="72" y="118" width="56" height="13" rx="2"/>
        <line class="fighter-line" x1="84" y1="138" x2="62" y2="168"/>
        <line class="fighter-line" x1="116" y1="138" x2="138" y2="168"/>
        <line class="fighter-line-thin" x1="82" y1="92" x2="56" y2="104"/>
        <circle class="fighter-body" cx="53" cy="106" r="6"/>
        <line class="fighter-line-thin" x1="118" y1="92" x2="144" y2="104"/>
        <circle class="fighter-body" cx="147" cy="106" r="6"/>
      </g>
      <g class="hs-arrows">
        <path class="hs-arrow" d="M54 158 L40 150 M54 158 L44 168" stroke="#a3e635" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path class="hs-arrow hs-arrow-r" d="M146 158 L160 150 M146 158 L156 168" stroke="#a3e635" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </g>
      <style>
        .hs-anim { animation: horseDip 3s ease-in-out infinite; transform-origin: 100px 150px; }
        .hs-arrow { opacity: .9; animation: arrowFlash 3s ease-in-out infinite; }
        .hs-arrow-r { animation-delay: .2s; }
        @keyframes horseDip { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
        @keyframes arrowFlash { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
      </style>
    </svg>`;
  }

  /* ============ توليد بطاقات الحركات ============ */
  function renderMoves() {
    const grid = document.getElementById('movesGrid');
    if (!grid) return;
    grid.innerHTML = MOVES.map(function (move) {
      return `
      <article class="move-card reveal" data-move="${move.id}" data-sfx="${move.sfx}">
        <div class="move-card-head">
          <h4>${move.name}</h4>
          <span class="jp-name">${move.cn}</span>
        </div>
        <div class="move-stage">${move.svg()}</div>
        <p>${move.desc}</p>
        <div>
          <span class="move-tag">${move.tag}</span>
          <span class="sound-hint">🔊 مرّر أو اضغط لسماع المؤثر</span>
        </div>
      </article>`;
    }).join('');

    // المؤثر الصوتي عند التمرير أو الضغط
    grid.querySelectorAll('.move-card').forEach(function (card) {
      const sfxName = card.dataset.sfx;
      const fire = function () { if (SFX.enabled && SFX[sfxName]) SFX[sfxName](); };
      card.addEventListener('click', fire);
      card.addEventListener('mouseenter', fire);
    });
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
        <div class="animal-emblem">${a.emoji}</div>
        <h4>${a.name} <span class="cn">${a.cn}</span></h4>
        <p>${a.desc}</p>
      </article>`;
    }).join('');
  }

  /* ============ زر الصوت ============ */
  function setupSoundToggle() {
    const btn = document.getElementById('soundToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      const on = !btn.classList.contains('on');
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
      SFX.toggle(on);
      if (on) SFX.gong();
    });
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
    setupSoundToggle();
    setupLightbox();
    setupReveal();
    setupActiveNav();
    setupYear();
    setupCoachImage();
    const hero = document.querySelector('.hero-karate');
    if (hero) {
      hero.addEventListener('click', function () { if (SFX.enabled) SFX.gong(); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
