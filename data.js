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
      email: "info@ahmadiah-youth.gov.eg",
      hours: "يومياً من 9:00 ص حتى 11:00 م",
      devName: "المهندس محمد حماد",
      devLink: "#",
      fbLink: "https://www.facebook.com/Markz.shabab.elahmadya",
      fbPageId: "Markz.shabab.elahmadya",
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
        pills: ["من 5 سنوات", "مدربون دان 5+", "أحزمة", "بطولات"],
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
  const CLOUD_PATH = "youthcenter/state";
  const AUTH_PATH = "youthcenter/adminAuth";
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

  const SiteData = {
    KEY,
    defaults: DEFAULT_DATA,
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? mergeData(JSON.parse(raw)) : clone(DEFAULT_DATA);
      } catch (e) {
        console.warn("SiteData cache read failed:", e);
        return clone(DEFAULT_DATA);
      }
    },
    async syncFromCloud(options) {
      const db = getCloudDb();
      const ref = db.ref(CLOUD_PATH);
      const snapshot = await ref.once("value");
      let data;
      if (snapshot.exists()) {
        data = mergeData(snapshot.val());
      } else {
        data = this.load();
        if (options && options.seedIfMissing) {
          await ref.set(data);
        }
      }
      localStorage.setItem(KEY, JSON.stringify(data));
      return data;
    },
    async save(data) {
      const safe = mergeData(data);
      // Cloud write is authoritative: do not report success or update cache before confirmation.
      await getCloudDb().ref(CLOUD_PATH).set(safe);
      localStorage.setItem(KEY, JSON.stringify(safe));
      return true;
    },
    async reset() {
      const fresh = clone(DEFAULT_DATA);
      await this.save(fresh);
      return this.load();
    },
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
    async verifyAdminPassword(input) {
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
