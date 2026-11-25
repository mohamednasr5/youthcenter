/* data.js — البيانات الافتراضية لمركز شباب الأحمدية + واجهة SiteData
   كل المحتوى قابل للتعديل من لوحة التحكم ويُحفظ في Firebase Realtime Database، مع LocalStorage كنسخة مؤقتة.
   index.html / article.html / admin.html كلها تقرأ من نفس المصدر. */
(function (global) {
  "use strict";

  const DEFAULT_DATA = {
    meta: {
      siteName: "مركز شباب الأحمدية",
      tagline: "المنزلة • الدقهلية",
      location: "قرية الأحمدية - مركز المنزلة - الدقهلية",
      mapLink: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("قرية الأحمدية مركز المنزلة الدقهلية مركز شباب"),
      phone: "01222257977",
      email: "",
      hours: "يومياً من 9:00 ص حتى 11:00 م",
      devName: "المهندس محمد حماد",
      devLink: "#",
      fbLink: "https://www.facebook.com/Markz.shabab.elahmadya",
      fbPageId: "Markz.shabab.elahmadya",
      messengerLink: "https://m.me/Markz.shabab.elahmadya",
      fbToken: "",
      fbEmbedCode: "https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FMarkz.shabab.elahmadya%2Fposts%2Fpfbid0ZNyhk6wRi9o2aJDePhXgmLonckrCZMdM8viPqrLLiFp5az21Hdb3RhbHUN5cMyPCl&show_text=true&width=500",
      centerPhoto: "assets/center-photo.jpg",
      logo: "assets/logo.png",
    },

    news: [
      { icon: "🏆", text: "بدء التسجيل في أكاديمية الكاراتيه لموسم 2026 لأعمار من 5 سنوات" },
      { icon: "⚽", text: "انطلاق بطولة كأس الأحمدية لكرة القدم للناشئين يوم الجمعة القادم" },
      { icon: "🏟️", text: "طرح مواعيد حجز الملعب الخماسي مساءً بأسعار خاصة" },
      { icon: "📚", text: "ندوة تثقيفية: «أهمية الرياضة في حياة الشباب» يوم السبت" },
      { icon: "📿", text: "إعلان نتائج مسابقة حفظ القرآن الكريم بالتعاون مع فضيلة الشيخ أحمد عمارة" },
      { icon: "🥋", text: "تدريب مفتوح مجاني للبراعم يوم الأحد القادم — سارع بالتسجيل" }
    ],

    announcement: {
      title: "فتح باب التسجيل في أكاديميات المركز لموسم 2026",
      body: "يبدأ التسجيل في أكاديمية كرة القدم وأكاديمية الكاراتيه اعتباراً من السبت القادم بمقر المركز — أعداد محدودة، الأولوية للأسرع في الحضور والتسجيل.",
      ctaText: "سجّل الآن",
      ctaLink: "#join"
    },

    board: [
      { id: "001", name: "أ. محمد محمد إبراهيم العشري", role: "رئيس مجلس الإدارة", tag: "رئيس المجلس", tagClass: "" },
      { id: "002", name: "فضيلة الشيخ / أحمد أحمد عمارة", role: "نائب رئيس مجلس الإدارة", tag: "نائب الرئيس", tagClass: "vice" },
      { id: "003", name: "أ. إسلام عبده عبد المجيد", role: "آمين الصندوق", tag: "آمين الصندوق", tagClass: "treas" },
      { id: "006", name: "أ. على أسامة", role: "عضو تحت السن", tag: "عضو تحت السن", tagClass: "member" },
      { id: "007", name: "أ. خالد عباس", role: "عضو تحت السن", tag: "عضو تحت السن", tagClass: "member" },
      { id: "008", name: "أ. محمد نبيل", role: "عضو تحت السن", tag: "عضو تحت السن", tagClass: "member" },
      { id: "004", name: "أ. أمين عمارة", role: "عضو تحت السن", tag: "عضو تحت السن", tagClass: "member" },
      { id: "005", name: "أ. أحمد أشرف", role: "عضو تحت السن", tag: "عضو تحت السن", tagClass: "member" }
    ],

    articles: [
      {
        id: 1,
        icon: "🏛️",
        category: "تاريخ المركز",
        readTime: "5 دقائق قراءة",
        title: "مركز شباب الأحمدية: مسيرة عطاء بصمت أبناء المنزلة",
        excerpt: "محطات من تاريخ المركز وتطور خدماته الرياضية والاجتماعية، وكيف تحوّل من نادٍ صغير إلى صرح شبابي يخدم مئات الأسر بالمنطقة.",
        body: [
          "بدأت فكرة مركز شباب الأحمدية بمدينة المنزلة بمحافظة الدقهلية كتجربة شبابية متواضعة، حين اجتمع نفر من أبناء المنطقة الشغوفين بالرياضة والعمل التطوعي على تأسيس فضاء يستقطب طاقات الشباب ويصونها من الفراغ. ومن تلك البداية البسيطة، تطوّر المركز تدريجياً حتى صار صرحاً متكاملاً يضم أكاديميات رياضية متخصصة وملعباً خماسياً وعدداً من الأنشطة الدينية والثقافية والترفيهية.",
          "وعلى مدار سنواته الممتدة، حرص المركز على تقديم نموذج رائد في العمل التطوعي المؤسسي، حيث يتوالى على إدارته مجالس إدارة منتخبة تضع خططاً واضحة للتطوير وتعمل بشفافية مع الأهالي. ولم يكن نجاح المركز ليتحقق لولا تضافر جهود المتطوعين والمدربين وأولياء الأمور الذين آمنوا بأن استثمار وقت الشاب هو استثمار في مستقبل المنطقة كلها.",
          "ومن أبرز محطات المركز تأسيس أكاديمية كرة القدم التي خرّجت عدداً من اللاعبين الذين وصلوا إلى بطولات المحافظات، ثم أكاديمية الكاراتيه التي جعلت من المركز منارة لفنون الدفاع عن النفس وتربية الناشئين على الانضباط والاحترام. كما يُولي المركز اهتماماً خاصاً بالأنشطة الدينية والثقافية لإرساء التوازن في شخصية الشاب المسلم.",
          "واليوم، يواصل المركز مسيرته بطموح أكبر، إذ يسعى إلى تطوير مرافقه وتوسيع برامجه ليواكب احتياجات جيل جديد من الناشئة، مع الحفاظ على القيم الأصيلة التي قام عليها: الإخلاص، والانضباط، والانتماء، والعمل الجماعي الذي يجعل من كل شاب عضواً فاعلاً في خدمة مجتمعه."
        ]
      },
      {
        id: 2,
        icon: "⚽",
        category: "تطوير الناشئين",
        readTime: "4 دقائق قراءة",
        title: "دور الأكاديميات الرياضية في صناعة الناشئين",
        excerpt: "كيف تسهم الأكاديميات المنتظمة في بناء الانضباط البدني والذهني للطفل، ولماذا يُفضّل الانضمام المبكر لأكاديمية متخصصة.",
        body: [
          "لم تعد الرياضة مجرد هواية يملأ بها الطالب وقت فراغه، بل أصبحت ركيزة أساسية في بناء شخصية الناشئ بدنياً وذهنياً واجتماعياً. والأكاديميات الرياضية المتخصصة تلعب دوراً محورياً في هذا البناء، لأنها تضع الطفل ضمن منهج تدريبي متدرّج يخضع لإشراف مدربين مؤهلين، بعيداً عن العشوائية التي قد تصاحب اللعب الحر في الشارع.",
          "إن الانضمام المبكر لأكاديمية رياضية يُكسِب الناشئ جملة من القيم لا تُكتسب بسهولة في مكان آخر؛ كالانضباط في المواعيد، والالتزام بالتعليمات، والاحترام المتبادل بين اللاعب والمدرب والزملاء، وقبول الخسارة بروح رياضية والفوز بتواضع. وهذه القيم تنعكس مباشرة على سلوكه الدراسي والأسرى والمجتمعي.",
          "وتُعد أكاديميات مركز شباب الأحمدية نموذجاً تطبيقياً لهذا التوجه، إذ تعتمد برامجها على تصنيف الناشئين حسب الفئات العمرية وتقديم محتوى تدريبي يناسب كل مرحلة، مع متابعة دورية لمستوى كل لاعب. ويحرص المدربون على الموازنة بين الجانب المهاري والجانب التربوي، فلا يُهمل الجانب الدراسي أو الصحي للمصلحة الرياضية.",
          "لذلك ينصح المختصون الآباء بالتسجيل المبكر لأبنائهم في أكاديمية منتظمة، لأن السنوات الأولى من العمر هي الأخصب في تكوين العادات والقيم، وما يُغرس فيها من انضباط وحب للرياضة يصاحب الشاب طوال حياته."
        ]
      },
      {
        id: 3,
        icon: "📿",
        category: "البناء الشامل",
        readTime: "6 دقائق قراءة",
        title: "النشاط الديني والثقافي: توازن البناء الشامل للشاب",
        excerpt: "قراءة في أهمية الموازنة بين الرياضة والنشاط الديني والثقافي في صناعة شخصية الشاب المتكاملة بعيداً عن التطرف أو الانعزال.",
        body: [
          "حين يتحدث المرء عن بناء الشاب، فإن أول ما يتبادر إلى الذهن هو الجانب البدني والرياضي، غير أن الشخصية المتكاملة لا تقوم على البدن وحده. فالشاب كائن متعدد الأبعاد: جسده وعقله وروحه ووجدانه، ولا يكتمل نموه إلا بإيلاء كل بعد نصيبه من الرعاية. ومن هنا تأتي أهمية الأنشطة الدينية والثقافية جنباً إلى جنب مع الأنشطة الرياضية داخل مراكز الشباب.",
          "النشاط الديني الراشد يُذكّر الشاب بمصدر قيمه ويُرسّخ في نفسه مراقبة الخالق والرحمة بالخلق، فيخرج من رحمته مسابقات حفظ القرآن الكريم والندوات التوعوية والحلقات العلمية المعتدلة التي تُبعد الشاب عن فهمين متطرفين متناقضين: تطرف الغلو أو تطرف الانعزال عن الدين. ويظل الهدف الأسمى هو تخريج شاب متدين بطبعه منفتح على عصره.",
          "أما النشاط الثقافي، فيُنمّي ملكة التفكير النقدي ويوسّع الأفق، عبر المسابقات الثقافية والإذاعة الداخلية للمركز والندوات التي تستضيف شخصيات من مختلف التخصصات. والشاب الذي اعتاد القراءة والنقاش المثمر يصعب اختراقه بالأفكار الهدّامة أو الإشاعات، لأنه امتلك أدوات التمييز بين الغث والسمين.",
          "وفي مركز شباب الأحمدية، نحرص على هذا التوازن حرصاً شديداً، فلا نكتفي بإعداد لاعب قوي البدن، بل نسعى لإعداد إنسان واعٍ بدينه وثقافته وواجبه نحو وطنه. وبهذا التكامل تتحقق رسالة المركز في صناعة جيل يستحق أن يُسمّى جيل المستقبل."
        ]
      }
    ],

    activities: [
      { name: "بطولة كأس الأحمدية لكرة القدم للناشئين", type: "sport", typeLabel: "رياضي", day: "الجمعة", date: "27", month: "نوفمبر", time: "4:00 م" },
      { name: "ندوة: «أهمية الرياضة في حياة الشاب»", type: "edu", typeLabel: "تثقيفي", day: "السبت", date: "28", month: "نوفمبر", time: "7:00 م" },
      { name: "مسابقة حفظ القرآن الكريم للناشئين", type: "religious", typeLabel: "ديني", day: "الأحد", date: "29", month: "نوفمبر", time: "5:00 م" },
      { name: "رحلة ترفيهية لبراعم الأكاديميات", type: "fun", typeLabel: "ترفيهي", day: "الثلاثاء", date: "01", month: "ديسمبر", time: "9:00 ص" },
      { name: "تدريب مفتوح للكاراتيه لكل الأعمار", type: "sport", typeLabel: "رياضي", day: "الأربعاء", date: "02", month: "ديسمبر", time: "6:00 م" },
      { name: "مسابقة ثقافية وأسئلة معلومات عامة", type: "edu", typeLabel: "تثقيفي", day: "السبت", date: "05", month: "ديسمبر", time: "8:00 م" }
    ],

    finance: {
      month: "نوفمبر 2026",
      note: "بيانات توضيحية — يُحدّثها أمين الصندوق شهرياً من لوحة التحكم",
      rows: [
        { label: "اشتراكات الأكاديميات", value: 22300, color: "gold", pct: 74, negative: false },
        { label: "إيرادات الملعب الخماسي", value: 18400, color: "emerald", pct: 61, negative: false },
        { label: "تبرعات وهبات", value: 8050, color: "blue", pct: 27, negative: false },
        { label: "إجمالي المصروفات", value: 31200, color: "red", pct: 64, negative: true }
      ],
      net: 17550,
      trend: "▲ مرتفع بنسبة 12% عن الشهر الماضي",
      chart: [52, 64, 48, 72, 80, 96],
      chartLabels: ["يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر"],
      currentIdx: 5
    },

    academies: {
      football: {
        href: "football-academy/index.html",
        tag: "⚽ FOOTBALL ACADEMY",
        title: "أكاديمية كرة القدم",
        desc: "صرح كروي متكامل لتأهيل وصقل مهارات البراعم والناشئين وفق أحدث البرامج التدريبية تحت إشراف نخبة المدربين.",
        pills: ["براعم", "ناشئين", "بطولات", "نتائج مباشرة"],
        cta: "زيارة الأكاديمية ←"
      },
      karate: {
        href: "karate-academy/index.html",
        tag: "🥋 KARATE DOJO",
        title: "أكاديمية الكاراتيه",
        desc: "فن ياباني أصيل يجمع بين الانضباط والإتقان، من الحزام الأبيض إلى الأسود الدان، بتدريس الكيهون والكاتا والكوميتيه.",
        pills: ["من 5 سنوات", "مدربون حزام أسود", "أحزمة", "بطولات"],
        cta: "زيارة الأكاديمية ←"
      },
      kungfu: {
        href: "kungfu-academy/index.html",
        tag: "🐉 KUNG FU ACADEMY",
        title: "أكاديمية الكونغ فو",
        desc: "الفن القتالي الصيني العريق بأساليب الحيوانات الخمسة، من الحزام الأبيض إلى الأسود بإشراف المدرب الدولي الكابتن خالد رخا — بطل جمهورية وحزام أسود دان 2 لاعبين ومدربين.",
        pills: ["من 5 سنوات", "مدرب دولي", "بطل جمهورية", "حزام أسود دان 2"],
        cta: "زيارة الأكاديمية ←"
      },
      pitch: {
        href: "pitch-booking/index.html",
        tag: "PITCH BOOKING • SMART SYSTEM",
        title: "حجز الملعب الخماسي",
        desc: "نظام حجز ذكي ولحظي للملعب الخماسي بنجيل صناعي تركي وإضاءة ليلية عالية الكفاءة، مع تسعير نهاري وليلي.",
        feats: ["حجز لحظي", "نيجل صناعي", "إضاءة ليلية", "شاشة عرض"]
      }
    },

    quickLinks: [
      { href: "football-academy/index.html", icon: "⚽", label: "أكاديمية كرة القدم" },
      { href: "karate-academy/index.html", icon: "🥋", label: "أكاديمية الكاراتيه" },
      { href: "pitch-booking/index.html", icon: "🏟️", label: "حجز الملعب الخماسي" },
      { href: "#activities", icon: "📅", label: "النشاطات القادمة" },
      { href: "#board", icon: "👥", label: "مجلس الإدارة" }
    ],

    gallery: [
      { id: "01", cap: "تنظيف وتطوير قاعات المركز" },
      { id: "02", cap: "صيانة وتطوير الملعب الخماسي" },
      { id: "03", cap: "تشجيب وصيانة المعدات الرياضية" },
      { id: "04", cap: "تنظيم المساحات الخضراء بالمركز" },
      { id: "05", cap: "تأهيل وتجهيز الصالات الداخلية" },
      { id: "06", cap: "عمل تطوعي جماعي للأعضاء" }
    ],
    karateSchedule: [
      { day: "الجمعة", date: "", fromTime: "15:00", toTime: "17:00", location: "مركز شباب الأحمدية", gender: "بنين وبنات", age: "من 5 سنوات فأكثر", active: true },
      { day: "الإثنين", date: "", fromTime: "15:00", toTime: "17:00", location: "مركز شباب الأحمدية", gender: "بنين وبنات", age: "من 5 سنوات فأكثر", active: true },
      { day: "الأربعاء", date: "", fromTime: "15:00", toTime: "17:00", location: "مركز شباب الأحمدية", gender: "بنين وبنات", age: "من 5 سنوات فأكثر", active: true }
    ]
  };


  const KEY = "ahmadiah_site_data_v2";
  const LEGACY_PATH = "youthcenter/state";          // المسار القديم: يُقرأ فقط كاحتياط حتى اكتمال الترحيل
  const AUTH_PATH = "youthcenter/adminAuth";
  const KARATE_SCHEDULE_PATH = "karate_academy/schedules";
  const PRIVATE_FB_PATH = "center_private/facebook";  // لا يُقرأ علناً (انظر database.rules.json)
  /* خريطة: مفتاح الحالة داخل التطبيق ← مسار مستقل في القاعدة الموحدة */
  const PATHS = {
    meta: "center_settings",
    news: "center_news",
    announcement: "center_announcements",
    board: "center_board",
    activities: "center_activities",
    articles: "center_articles",
    finance: "center_finance",
    academies: "center_academies",
    quickLinks: "center_quickLinks",
    gallery: "center_gallery"
  };
  const PUBLIC_KEYS = Object.keys(PATHS);
  const firebaseConfig = {
    apiKey: "AIzaSyDJYIKnZNBMZuXhVAhP4irqjLuzP4jQ16g",
    authDomain: "academia-e6d7b.firebaseapp.com",
    databaseURL: "https://academia-e6d7b-default-rtdb.firebaseio.com",
    projectId: "academia-e6d7b",
    storageBucket: "academia-e6d7b.firebasestorage.app",
    messagingSenderId: "679214276618",
    appId: "1:679214276618:web:f34c9e48d83e338facfff3",
    measurementId: "G-ME9ZF20CZ0"
  };

  // Initial credential: password is never stored in plaintext.
  // PBKDF2-SHA256, 310,000 iterations, unique salt.
  const INITIAL_ADMIN_AUTH = {
    algorithm: "PBKDF2-SHA256",
    iterations: 310000,
    salt: "zno1wgNtIPqKAg8-wpM7xQ",
    hash: "cinsRxKIBW1xRCmUQuekvtbQjXFIo2QTQD3HI2H2Bss"
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function mergeData(parsed) {
    const merged = Object.assign(clone(DEFAULT_DATA), parsed || {}, {
      meta: Object.assign(clone(DEFAULT_DATA.meta), (parsed && parsed.meta) || {}),
      announcement: Object.assign(clone(DEFAULT_DATA.announcement), (parsed && parsed.announcement) || {}),
      finance: Object.assign(clone(DEFAULT_DATA.finance), (parsed && parsed.finance) || {}),
      academies: Object.assign(clone(DEFAULT_DATA.academies), (parsed && parsed.academies) || {})
    });
    // Never keep legacy plaintext credentials in browser cache or content exports.
    if (merged.meta) delete merged.meta.adminPassword;
    return merged;
  }

  /* فصل الحقول الخاصة (توكن فيسبوك) عن الحقول العامة */
  function splitPrivate(data) {
    const pub = clone(data);
    const priv = {};
    if (pub.meta && pub.meta.fbToken) { priv.fbToken = pub.meta.fbToken; }
    if (pub.meta) pub.meta.fbToken = "";
    return { pub, priv };
  }
  function scheduleToArray(v) {
    if (!v) return [];
    const list = Array.isArray(v) ? v : Object.entries(v).map(([id, x]) => Object.assign({ id }, x));
    return list.filter(Boolean).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  /* كتابة كل جزء في مساره المستقل بعملية update واحدة (ذرّية) */
  async function assertCenterWriteAccess(db) {
    const auth = db && db.app && typeof db.app.auth === "function"
      ? db.app.auth()
      : (global.firebase && typeof global.firebase.auth === "function" ? global.firebase.auth() : null);
    const user = auth && auth.currentUser;
    if (!user) {
      const error = new Error("انتهت جلسة الإدارة أو تم الدخول بالطريقة القديمة. سجّل الدخول ببريد Firebase المصرّح له ثم أعد الحفظ.");
      error.code = "YC_AUTH_REQUIRED";
      throw error;
    }
    const token = await user.getIdTokenResult(true);
    const claims = token && token.claims ? token.claims : {};
    if (claims.ycAdmin !== true && claims.ycCenter !== true) {
      const error = new Error("حسابك لا يحمل صلاحية ycCenter في Firebase. يجب تهيئة صلاحيات المشرف ثم تسجيل الخروج والدخول مجددًا.");
      error.code = "YC_CENTER_CLAIM_REQUIRED";
      throw error;
    }
  }

  async function writeAtPath(db, path, value) {
    try {
      await db.ref(path).set(value);
    } catch (cause) {
      const error = new Error("رفض Firebase الكتابة إلى المسار " + path + ": " + ((cause && cause.message) || "Permission denied"));
      error.code = (cause && cause.code) || "PERMISSION_DENIED";
      error.path = path;
      throw error;
    }
  }

  async function writeParts(db, data) {
    await assertCenterWriteAccess(db);
    const { pub, priv } = splitPrivate(data);
    // اكتب كل قسم منفصلًا لتحديد المسار المرفوض بدقة وعدم إرسال تحديث جذر مبهم.
    for (const key of PUBLIC_KEYS) {
      const path = PATHS[key];
      const value = pub[key] === undefined ? null : pub[key];
      await writeAtPath(db, path, value);
    }
    if (priv.fbToken !== undefined) {
      await writeAtPath(db, PRIVATE_FB_PATH + "/token", priv.fbToken);
    }
    // جدول الكاراتيه يُدار من لوحة المركز أو لوحة الكاراتيه بصلاحية مخصصة للمسار.
    if (Array.isArray(data.karateSchedule)) {
      const sched = {};
      data.karateSchedule.forEach((x, i) => {
        sched[x.id || ("s" + String(i + 1).padStart(3, "0"))] = Object.assign({}, x, { order: i });
      });
      await writeAtPath(db, KARATE_SCHEDULE_PATH, sched);
    }
  }

  let cloudDb = null;
  function getCloudDb() {
    if (cloudDb) return cloudDb;
    if (!global.firebase || !global.firebase.database) {
      throw new Error("تعذر تحميل خدمة قاعدة بيانات الأكاديمية.");
    }
    let app = global.firebase.apps.find(item => item.name === "youthcenter");
    if (!app) app = global.firebase.initializeApp(firebaseConfig, "youthcenter");
    cloudDb = app.database();
    return cloudDb;
  }

  function toBytes(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
    return Uint8Array.from(atob(padded), ch => ch.charCodeAt(0));
  }
  function toBase64Url(bytes) {
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  async function derivePasswordHash(password, salt) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(password)), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({
      name: "PBKDF2", salt: toBytes(salt), iterations: INITIAL_ADMIN_AUTH.iterations, hash: "SHA-256"
    }, key, 256);
    return toBase64Url(new Uint8Array(bits));
  }

  /* بصمة SHA-256 لكلمة سر زر «استعادة الافتراضي» (لا تُحفظ الكلمة نصًا في الكود) */
  const RESET_PASSWORD_HASH = "898f4e2ee802f6943d253550067a1272538c9dbaf789cfbf4bbcfebad37915e4";
  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const SiteData = {
    KEY,
    defaults: DEFAULT_DATA,
    /* التحقق من كلمة سر زر «استعادة الافتراضي» قبل تنفيذه (حاجز متصفح، ليس حماية خادم) */
    async verifyResetPassword(input) {
      return (await sha256Hex(String(input ?? "").trim())) === RESET_PASSWORD_HASH;
    },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? mergeData(JSON.parse(raw)) : clone(DEFAULT_DATA);
      } catch (e) {
        console.warn("SiteData cache read failed:", e);
        return clone(DEFAULT_DATA);
      }
    },
    /* قراءة مرة واحدة من المسارات المستقلة (مع احتياط للمسار القديم قبل الترحيل) */
    async syncFromCloud(options) {
      const db = getCloudDb();
      const keys = PUBLIC_KEYS;
      const [snaps, schedSnap] = await Promise.all([
        Promise.all(keys.map(k => db.ref(PATHS[k]).once("value"))),
        db.ref(KARATE_SCHEDULE_PATH).once("value").catch(() => null)
      ]);
      const parts = {};
      let found = false;
      keys.forEach((k, i) => { if (snaps[i].exists()) { parts[k] = snaps[i].val(); found = true; } });
      if (!found) {
        // لم يتم الترحيل بعد: اقرأ المسار القديم ليظل الموقع يعمل
        const legacy = await db.ref(LEGACY_PATH).once("value").catch(() => null);
        if (legacy && legacy.exists()) {
          Object.assign(parts, legacy.val());
          found = true;
          this._legacyMode = true;
        }
      }
      if (schedSnap && schedSnap.exists()) parts.karateSchedule = scheduleToArray(schedSnap.val());
      let data;
      if (found) {
        data = mergeData(parts);
      } else {
        data = this.load();
        if (options && options.seedIfMissing) await writeParts(db, data);
      }
      localStorage.setItem(KEY, JSON.stringify(data));
      return data;
    },
    /* اشتراك لحظي: يستمع لكل مسار على حدة ويستدعي cb(data) عند أي تغيير. يُرجع دالة إلغاء الاشتراك. */
    subscribe(cb) {
      const db = getCloudDb();
      const parts = {};
      const unsubs = [];
      let timer = null;
      const fire = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const data = mergeData(Object.assign({}, parts));
          try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* cache only */ }
          cb(data);
        }, 60);
      };
      PUBLIC_KEYS.forEach(k => {
        const ref = db.ref(PATHS[k]);
        const fn = ref.on("value", s => { if (s.exists()) parts[k] = s.val(); else delete parts[k]; fire(); }, () => {});
        unsubs.push(() => ref.off("value", fn));
      });
      const sref = db.ref(KARATE_SCHEDULE_PATH);
      const sfn = sref.on("value", s => { if (s.exists()) parts.karateSchedule = scheduleToArray(s.val()); else delete parts.karateSchedule; fire(); }, () => {});
      unsubs.push(() => sref.off("value", sfn));
      return () => { clearTimeout(timer); unsubs.forEach(u => u()); };
    },
    /* جدول الكاراتيه فقط (بدون قراءة بقية البيانات). احتياط: المسار القديم قبل الترحيل. */
    subscribeKarateSchedule(cb, onError) {
      const db = getCloudDb();
      const ref = db.ref(KARATE_SCHEDULE_PATH);
      const fn = ref.on("value", async s => {
        if (s.exists()) return cb(scheduleToArray(s.val()));
        try {
          const legacy = await db.ref(LEGACY_PATH + "/karateSchedule").once("value");
          cb(legacy.exists() ? scheduleToArray(legacy.val()) : clone(DEFAULT_DATA.karateSchedule));
        } catch (e) { cb(clone(DEFAULT_DATA.karateSchedule)); }
      }, err => { if (onError) onError(err); });
      return () => ref.off("value", fn);
    },
    async save(data) {
      const safe = mergeData(data);
      // الكتابة السحابية هي المرجع: لا نُبلغ بالنجاح ولا نحدّث الكاش قبل التأكيد.
      await writeParts(getCloudDb(), safe);
      localStorage.setItem(KEY, JSON.stringify(safe));
      return true;
    },
    async reset() {
      const fresh = clone(DEFAULT_DATA);
      await this.save(fresh);
      return this.load();
    },
    db() { return getCloudDb(); },
    hasSaved() {
      try { return !!localStorage.getItem(KEY); } catch { return false; }
    },
    exportJSON() {
      return JSON.stringify(this.load(), null, 2);
    },
    async importJSON(str) {
      const obj = mergeData(JSON.parse(str));
      await this.save(obj);
      return obj;
    },
    /* ===== Firebase Authentication (الأمان الحقيقي من جهة الخادم) ===== */
    authEnabled() { return !!(global.firebase && global.firebase.auth); },
    requireFirebaseAuth() { return !!(global.YC_AUTH_CONFIG && global.YC_AUTH_CONFIG.requireFirebase); },
    _auth() {
      getCloudDb();
      const app = global.firebase.apps.find(item => item.name === "youthcenter");
      return app.auth();
    },
    /* role: center | karate | football | pitch — يُتحقق منه عبر Custom Claims (ycAdmin أو ycCenter ...) */
    hasRole(claims, role) {
      if (!claims) return false;
      if (claims.ycAdmin === true) return true;
      return claims["yc" + role.charAt(0).toUpperCase() + role.slice(1)] === true;
    },
    async ensureCenterSession() {
      if (!this.authEnabled()) return false;
      const user = this._auth().currentUser;
      if (!user) return false;
      const token = await user.getIdTokenResult(true);
      return this.hasRole(token && token.claims, "center");
    },
    /* قائمة إيميلات الإدارة من yc-auth-config.js (قيد إضافي على المتصفح؛ الحماية الحقيقية في Custom Claims) */
    allowedAdminEmails() {
      const cfg = global.YC_AUTH_CONFIG || {};
      const list = Array.isArray(cfg.adminEmails) ? cfg.adminEmails : [];
      return list.map(item => String((item && item.email) || item || "").trim().toLowerCase()).filter(Boolean);
    },
    async signIn(email, password, role) {
      if (!this.authEnabled()) throw new Error("خدمة المصادقة غير محمّلة (firebase-auth-compat.js).");
      const allow = this.allowedAdminEmails();
      if (allow.length && !allow.includes(String(email).trim().toLowerCase())) {
        throw new Error("هذا البريد غير مدرج في قائمة إيميلات الإدارة (yc-auth-config.js).");
      }
      const a = this._auth();
      const cred = await a.signInWithEmailAndPassword(String(email).trim(), String(password));
      const tok = await cred.user.getIdTokenResult(true);
      if (!this.hasRole(tok.claims, role)) {
        await a.signOut();
        throw new Error("هذا الحساب لا يملك صلاحية إدارة هذا القسم.");
      }
      return cred.user;
    },
    /* ===== الدخول بحساب Google (Firebase Authentication) ===== */
    _googleProvider() {
      const provider = new global.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      return provider;
    },
    _googleAuthError(e) {
      const code = (e && e.code) || "";
      if (code === "auth/popup-closed-by-user") return new Error("تم إغلاق نافذة تسجيل الدخول قبل إتمامها.");
      if (code === "auth/unauthorized-domain") return new Error("هذا النطاق غير مصرّح له في Firebase (Authentication ← Settings ← Authorized domains).");
      if (code === "auth/operation-not-allowed") return new Error("تسجيل الدخول عبر Google غير مفعّل بعد (Authentication ← Sign-in method ← Google).");
      if (code === "auth/account-exists-with-different-credential") return new Error("يوجد حساب بنفس البريد بطريقة دخول أخرى. جرّب البريد وكلمة المرور.");
      return (e instanceof Error) ? e : new Error("تعذر تسجيل الدخول عبر Google.");
    },
    async _checkGoogleUser(user, role) {
      const a = this._auth();
      const email = String((user && user.email) || "").trim().toLowerCase();
      const allow = this.allowedAdminEmails();
      if (allow.length && !allow.includes(email)) {
        await a.signOut();
        throw new Error("هذا البريد غير مدرج في قائمة إيميلات الإدارة.");
      }
      const tok = await user.getIdTokenResult(true);
      if (!this.hasRole(tok.claims, role)) {
        await a.signOut();
        throw new Error("هذا الحساب لا يملك صلاحية إدارة هذا القسم.");
      }
      return user;
    },
    async signInWithGoogle(role) {
      if (!this.authEnabled()) throw new Error("خدمة المصادقة غير محمّلة (firebase-auth-compat.js).");
      const a = this._auth();
      const provider = this._googleProvider();
      try {
        const cred = await a.signInWithPopup(provider);
        return await this._checkGoogleUser(cred.user, role);
      } catch (e) {
        const code = (e && e.code) || "";
        if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request" || code === "auth/operation-not-supported-in-this-environment") {
          await a.signInWithRedirect(provider); // يعيد تحميل الصفحة بعد الدخول — انظر completeGoogleRedirect
          return null;
        }
        throw this._googleAuthError(e);
      }
    },
    /* إكمال دخول Google بعد الرجوع من Redirect (تُستدعى عند فتح صفحة الدخول) */
    async completeGoogleRedirect(role) {
      if (!this.authEnabled()) return null;
      const a = this._auth();
      let cred;
      try { cred = await a.getRedirectResult(); }
      catch (e) { throw this._googleAuthError(e); }
      if (!cred || !cred.user) return null;
      return this._checkGoogleUser(cred.user, role);
    },
    /* استعادة جلسة قائمة بعد إعادة تحميل الصفحة */
    restoreSession(role) {
      if (!this.authEnabled()) return Promise.resolve(false);
      const a = this._auth();
      return new Promise(resolve => {
        const off = a.onAuthStateChanged(async user => {
          off();
          if (!user) return resolve(false);
          try { const tok = await user.getIdTokenResult(); resolve(this.hasRole(tok.claims, role)); }
          catch (e) { resolve(false); }
        });
      });
    },
    /* توكن فيسبوك: يُقرأ فقط من حساب إداري مصادَق (لا يُنشر في المسار العام) */
    async loadPrivate() {
      try { const v = (await getCloudDb().ref(PRIVATE_FB_PATH + "/token").once("value")).val(); return v || ""; }
      catch (e) { return ""; }
    },
    async signOut() { if (this.authEnabled()) { try { await this._auth().signOut(); } catch (e) { /* ignore */ } } },
    async verifyAdminPassword(input) {
      if (this.requireFirebaseAuth()) throw new Error("تم تعطيل الدخول بكلمة المرور القديمة. استخدم البريد الإلكتروني وكلمة المرور.");
      const ref = getCloudDb().ref(AUTH_PATH);
      let snapshot = await ref.once("value");
      if (!snapshot.exists()) {
        // First deployment seeds the requested password hash directly in the shared database.
        await ref.set(INITIAL_ADMIN_AUTH);
        snapshot = await ref.once("value");
      }
      const auth = snapshot.val() || {};
      if (auth.algorithm !== "PBKDF2-SHA256" || !auth.salt || !auth.hash) {
        throw new Error("إعداد كلمة مرور لوحة الإدارة غير مكتمل في قاعدة البيانات.");
      }
      const actual = await derivePasswordHash(input, auth.salt);
      return actual === auth.hash;
    }
  };

  global.SiteData = SiteData;
  global.DEFAULT_DATA = DEFAULT_DATA;
})(window);
