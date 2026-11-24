/* sounds.js — المؤثرات الصوتية لحائط الخير
   الوضع الافتراضي: كل الأصوات مركّبة برمجيًا عبر Web Audio API (صفر بايتات تحميل):
   - place   : صوت وضع الطوبة على الحائط
   - pop     : فرقعة عند الضغط على طوبة
   - thud    : اصطدام الطوبة بالأسمنت
   - whoosh  : طيران الطوبة من الهرم إلى الحائط
   - gold    : نغمة خاصة بالطوب الذهبي
   - diamond : رنين خاص بالطوب الماسي
   الوضع الاختياري: ألقِ ملفات صوتية في assets/sounds وسمّها في manifest.json
   فتُستخدم تلقائيًا بدل التركيب البرمجي (مع الرجوع إليه إن غاب الملف).
   لا يُشغَّل أي صوت قبل أول تفاعل من المستخدم (سياسة المتصفحات)،
   وزر الكتم يحفظ الاختيار في localStorage. */

const KEY = 'cw_muted';

class Sounds {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem(KEY) === '1';
    this.buffers = {};      /* ملفات صوتية اختيارية من assets/sounds (إن وُجدت) */
    this._packTried = false;
    this._unlocked = false;
    this._unlock = () => this._ensureCtx();
    window.addEventListener('pointerdown', this._unlock, { once: false, passive: true });
    window.addEventListener('keydown', this._unlock, { once: false, passive: true });
  }

  _ensureCtx() {
    if (this._unlocked) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this._unlocked = this.ctx.state === 'running' || this.ctx.state === 'suspended';
      this._loadPack();
    } catch (_e) { /* بيئة بلا صوت */ }
  }

  /* حزمة أصوات اختيارية: ضع ملفاتك في assets/sounds وعدّل manifest.json
     إن لم توجد يعمل التركيب البرمجي WebAudio كالمعتاد (الوضع الافتراضي). */
  async _loadPack() {
    if (this._packTried || !this.ctx) return;
    this._packTried = true;
    try {
      const res = await fetch('assets/sounds/manifest.json');
      if (!res.ok) return;
      const map = await res.json();
      for (const [key, file] of Object.entries(map || {})) {
        if (key.startsWith('_') || !file || this.buffers[key]) continue;
        const r = await fetch('assets/sounds/' + file);
        if (!r.ok) continue;
        const buf = await this.ctx.decodeAudioData(await r.arrayBuffer());
        this.buffers[key] = buf;
      }
    } catch (_e) { /* لا حزمة صوتية — نستخدم التركيب البرمجي */ }
  }

  /* تشغيل ملف من الحزمة إن وُجد */
  _playFile(key, vol = 0.9) {
    const buf = this.buffers[key];
    if (!buf) return false;
    try {
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.buffer = buf;
      src.connect(g); g.connect(this.ctx.destination);
      src.start();
      return true;
    } catch (_e) { return false; }
  }

  get ready() { return !!this.ctx; }

  setMuted(m) {
    this.muted = !!m;
    localStorage.setItem(KEY, this.muted ? '1' : '0');
  }

  _noiseBuffer(dur) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.max(1, rate * dur), rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* صوت عام: يعمل فقط بعد تفاعل المستخدم وليس في وضع الكتم */
  _canPlay() {
    if (this.muted) return false;
    this._ensureCtx();
    if (!this.ctx || this.ctx.state !== 'running') {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      if (!this.ctx) return false;
    }
    return true;
  }

  /* ضربة منخفضة (ارتطام) */
  _thump(t0, freq = 90, dur = 0.18, vol = 0.5) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.4), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  /* ضجيج مرشّح (خشونة الاصطدام) */
  _scrape(t0, dur = 0.12, vol = 0.25, freq = 1200) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(dur);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.ctx.destination);
    src.start(t0);
  }

  /* نغمة جرسية */
  _bell(t0, freq, dur = 0.6, vol = 0.18) {
    [[1, 1], [2.01, 0.4], [2.99, 0.2]].forEach(([m, a]) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * m;
      g.gain.setValueAtTime(vol * a, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    });
  }

  /* ═══ الأصوات العامة: ملف من الحزمة إن وُجد، وإلا التركيب البرمجي ═══ */

  place() {
    if (!this._canPlay() || this._playFile('place')) return;
    const t = this.ctx.currentTime;
    this._thump(t, 95, 0.22, 0.55);
    this._scrape(t, 0.14, 0.2, 900);
  }

  thud() {
    if (!this._canPlay() || this._playFile('thud')) return;
    const t = this.ctx.currentTime;
    this._thump(t, 70, 0.25, 0.45);
    this._scrape(t, 0.1, 0.15, 500);
  }

  pop() {
    if (!this._canPlay() || this._playFile('pop')) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.09);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + 0.14);
  }

  whoosh() {
    if (!this._canPlay() || this._playFile('whoosh')) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(0.5);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(f); f.connect(g); g.connect(this.ctx.destination);
    src.start(t);
  }

  gold() {
    if (!this._canPlay() || this._playFile('gold')) return;
    const t = this.ctx.currentTime;
    this._bell(t, 660, 0.7, 0.16);
    this._bell(t + 0.12, 990, 0.6, 0.12);
  }

  diamond() {
    if (!this._canPlay() || this._playFile('diamond')) return;
    const t = this.ctx.currentTime;
    [1318, 1568, 2093, 2637].forEach((f, i) => this._bell(t + i * 0.07, f, 0.55, 0.1));
  }

  /* صوت حسب نوع الطوبة */
  tierSound(tierId) {
    if (tierId === 'gold') return this.gold();
    if (tierId === 'diamond') return this.diamond();
    return this.place();
  }

  dispose() {
    window.removeEventListener('pointerdown', this._unlock);
    window.removeEventListener('keydown', this._unlock);
    if (this.ctx) { try { this.ctx.close(); } catch (_e) {} this.ctx = null; }
  }
}

export const sounds = new Sounds();
