/* ============================================================
   مركز شباب الأحمدية — نظام هوية اللاعب والحضور الذكي (نسخة محسّنة)
   Premium attendance module for the four academy dashboards:
   animated camera QR scanner, WebAudio feedback, permanent
   player QR identity cards, QR lifecycle management, history.

   Loaded by: football/karate/kungfu/nasheed admin.html
   <script type="module" src="../attendance-portal/academy-admin.js"
           data-academy-admin="football|karate|kungfu|nasheed"></script>
   ============================================================ */
import {getUser} from "./qr-provision.js";

const API = window.YC_ATTENDANCE_API || "";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const academyNames = {football:"أكاديمية كرة القدم",karate:"أكاديمية الكاراتيه",kungfu:"أكاديمية الكونغ فو",nasheed:"فريق الإنشاد"};
const academyIcons = {football:"⚽",karate:"🥋",kungfu:"🥊",nasheed:"🎙️"};

/* Per-academy visual identity — mirrors each dashboard's own palette. */
const THEMES = {
  football:{accent:"#b7f34a",accent2:"#e8b94a",soft:"rgba(183,243,74,.14)",glow:"rgba(183,243,74,.35)",bg1:"#0e2119",bg2:"#07110f",ink:"#f3f8f2",mute:"#9fb0a4",qrDark:"#0a1b12"},
  karate:{accent:"#f43f5e",accent2:"#f59e0b",soft:"rgba(244,63,94,.14)",glow:"rgba(244,63,94,.4)",bg1:"#1b0f24",bg2:"#07060d",ink:"#f3f5fb",mute:"#9aa3b8",qrDark:"#170b1e"},
  kungfu:{accent:"#dc2626",accent2:"#e8a020",soft:"rgba(220,38,38,.14)",glow:"rgba(220,38,38,.4)",bg1:"#1f0e11",bg2:"#0b0507",ink:"#f6f1ee",mute:"#b8a79b",qrDark:"#190a0c"},
  nasheed:{accent:"#a78bfa",accent2:"#e9c16a",soft:"rgba(167,139,250,.14)",glow:"rgba(167,139,250,.4)",bg1:"#1b1e3a",bg2:"#0a0d1b",ink:"#f5f5ff",mute:"#aeb2c9",qrDark:"#141734"}
};

async function api(a, path, opts = {}) {
  const u = await getUser(a);
  if (!u) throw Error("سجّل الدخول إلى لوحة الأكاديمية أولًا.");
  const r = await fetch(API + path, {...opts, headers:{"content-type":"application/json","authorization":"Bearer " + await u.getIdToken()}});
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "تعذر تنفيذ الطلب.");
  return d;
}

/* ---------- injected styles (scoped under #yc-attendance-admin) ---------- */
function injectStyle(theme) {
  if ($("#yc-att-style")) return;
  const s = document.createElement("style");
  s.id = "yc-att-style";
  s.textContent = `
#yc-attendance-admin{--yc-accent:${theme.accent};--yc-accent2:${theme.accent2};--yc-soft:${theme.soft};--yc-glow:${theme.glow};--yc-bg1:${theme.bg1};--yc-bg2:${theme.bg2};--yc-ink:${theme.ink};--yc-mute:${theme.mute};
margin:26px 0;padding:20px;border-radius:22px;color:var(--yc-ink);border:1px solid color-mix(in srgb,var(--yc-accent) 28%,transparent);
background:linear-gradient(150deg,var(--yc-bg1),var(--yc-bg2));box-shadow:0 22px 60px rgba(0,0,0,.4);font-family:inherit;direction:rtl;overflow-x:hidden;position:relative}
#yc-attendance-admin *{box-sizing:border-box}
#yc-attendance-admin h2{margin:0 0 6px;font-size:1.18rem;display:flex;align-items:center;gap:10px}
#yc-attendance-admin h2 .yc-live-dot{width:9px;height:9px;border-radius:50%;background:var(--yc-accent);box-shadow:0 0 12px var(--yc-glow);animation:ycPulse 2s infinite}
#yc-attendance-admin p.lead{color:var(--yc-mute);font-size:.82rem;line-height:1.9;margin:0 0 16px}
#yc-attendance-admin .yc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}
#yc-attendance-admin .yc-card{padding:16px;border-radius:16px;border:1px solid color-mix(in srgb,var(--yc-accent) 16%,transparent);background:color-mix(in srgb,var(--yc-ink) 4%,transparent);position:relative}
#yc-attendance-admin .yc-card h3{margin:0 0 10px;font-size:.95rem;display:flex;align-items:center;gap:8px}
#yc-attendance-admin label{display:block;margin:10px 0;color:var(--yc-mute);font-size:.78rem}
#yc-attendance-admin input,#yc-attendance-admin select{width:100%;padding:11px;border:1px solid color-mix(in srgb,var(--yc-ink) 22%,transparent);border-radius:11px;background:rgba(0,0,0,.28);color:var(--yc-ink);font:inherit;margin-top:5px;transition:border-color .25s}
#yc-attendance-admin input:focus,#yc-attendance-admin select:focus{outline:none;border-color:var(--yc-accent)}
#yc-attendance-admin .yc-btn{padding:10px 16px;margin:4px 2px 0 0;border:0;border-radius:11px;background:var(--yc-accent);color:var(--yc-bg2);font-weight:800;cursor:pointer;font:inherit;font-weight:800;transition:transform .22s,filter .22s;will-change:transform}
#yc-attendance-admin .yc-btn:hover{filter:brightness(1.12);transform:translateY(-1px)}
#yc-attendance-admin .yc-btn.alt{background:color-mix(in srgb,var(--yc-ink) 10%,transparent);color:var(--yc-ink);border:1px solid color-mix(in srgb,var(--yc-ink) 20%,transparent)}
#yc-attendance-admin .yc-btn.warn{background:#7c2d12;color:#fed7aa}
#yc-attendance-admin .yc-btn.ghost{background:transparent;border:1px solid color-mix(in srgb,var(--yc-ink) 25%,transparent);color:var(--yc-ink)}
#yc-attendance-admin .yc-msg{min-height:22px;color:var(--yc-accent);font-size:.78rem;margin-top:8px;line-height:1.8}

/* ===== scanner stage ===== */
#yc-attendance-admin .yc-stage{position:relative;width:100%;aspect-ratio:4/3;max-height:400px;border-radius:15px;overflow:hidden;background:#050607;border:1px solid color-mix(in srgb,var(--yc-accent) 24%,transparent)}
#yc-attendance-admin video{width:100%;height:100%;object-fit:cover;display:block;transform:translateZ(0)}
#yc-attendance-admin video.mirror{transform:scaleX(-1)}
#yc-attendance-admin .yc-stage-off{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--yc-mute);font-size:.8rem;text-align:center;padding:20px;background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--yc-accent) 10%,transparent),transparent 70%)}
#yc-attendance-admin .yc-stage-off .yc-cam-art{font-size:44px;filter:grayscale(.4);animation:ycFloat 3.4s ease-in-out infinite}
/* animated detection frame */
#yc-attendance-admin .yc-frame{position:absolute;inset:0;pointer-events:none}
#yc-attendance-admin .yc-corner{position:absolute;width:46px;height:46px;border:3.5px solid var(--yc-accent);filter:drop-shadow(0 0 7px var(--yc-glow));animation:ycBreathe 2.6s ease-in-out infinite}
#yc-attendance-admin .yc-corner.tl{top:16%;right:14%;border-left:0;border-bottom:0;border-start-start-radius:14px}
#yc-attendance-admin .yc-corner.tr{top:16%;left:14%;border-right:0;border-bottom:0;border-start-end-radius:14px}
#yc-attendance-admin .yc-corner.bl{bottom:16%;right:14%;border-left:0;border-top:0;border-end-start-radius:14px}
#yc-attendance-admin .yc-corner.br{bottom:16%;left:14%;border-right:0;border-top:0;border-end-end-radius:14px}
#yc-attendance-admin .yc-laser{position:absolute;top:18%;left:16%;right:16%;height:0;border-top:3px solid var(--yc-accent);box-shadow:0 0 16px 3px var(--yc-glow);opacity:0;animation:ycSweepY 2.2s ease-in-out infinite alternate}
#yc-attendance-admin .yc-stage.live .yc-laser{opacity:.9}
#yc-attendance-admin .yc-focus-dot{position:absolute;top:50%;right:50%;width:8px;height:8px;margin:-4px -4px 0 0;border-radius:50%;background:var(--yc-accent);opacity:.7;animation:ycPulse 1.8s infinite}
#yc-attendance-admin .yc-scanline{position:absolute;top:0;bottom:0;left:16%;width:1px;background:linear-gradient(180deg,transparent,var(--yc-glow),transparent);opacity:0}
#yc-attendance-admin .yc-stage.live .yc-scanline{opacity:.45;animation:ycScanX 3.8s linear infinite alternate}
/* status chip */
#yc-attendance-admin .yc-chip{position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;font-size:.72rem;font-weight:800;background:rgba(3,6,10,.72);border:1px solid color-mix(in srgb,var(--yc-accent) 40%,transparent);backdrop-filter:blur(8px)}
#yc-attendance-admin .yc-chip .dot{width:7px;height:7px;border-radius:50%;background:var(--yc-mute)}
#yc-attendance-admin .yc-chip.live .dot{background:#34d399;animation:ycPulse 1.4s infinite}
#yc-attendance-admin .yc-chip.reading .dot{background:var(--yc-accent2)}
/* camera control buttons */
#yc-attendance-admin .yc-cam-controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center}
#yc-attendance-admin .yc-icon-btn{width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;border:1px solid color-mix(in srgb,var(--yc-ink) 25%,transparent);background:color-mix(in srgb,var(--yc-ink) 8%,transparent);color:var(--yc-ink);cursor:pointer;font-size:17px;transition:transform .2s,background .2s}
#yc-attendance-admin .yc-icon-btn:hover{transform:translateY(-1px);background:var(--yc-soft)}
#yc-attendance-admin .yc-icon-btn.active{background:var(--yc-accent);color:var(--yc-bg2)}
#yc-attendance-admin .yc-clock{margin-inline-start:auto;font-size:.75rem;color:var(--yc-mute);font-variant-numeric:tabular-nums}

/* ===== result overlay ===== */
#yc-attendance-admin .yc-result{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(2,4,8,.82);backdrop-filter:blur(7px);z-index:5;padding:14px}
#yc-attendance-admin .yc-result.show{display:flex;animation:ycFadeIn .28s ease}
#yc-attendance-admin .yc-result-card{max-width:340px;width:100%;text-align:center;padding:22px 18px;border-radius:20px;animation:ycPop .45s cubic-bezier(.2,1.4,.4,1);position:relative;overflow:hidden}
#yc-attendance-admin .yc-result.checkin .yc-result-card{background:linear-gradient(160deg,rgba(16,185,129,.22),rgba(5,20,14,.9));border:1px solid rgba(52,211,153,.55);box-shadow:0 0 42px rgba(52,211,153,.28)}
#yc-attendance-admin .yc-result.checkout .yc-result-card{background:linear-gradient(160deg,rgba(59,130,246,.22),rgba(6,14,30,.9));border:1px solid rgba(96,165,250,.55);box-shadow:0 0 42px rgba(59,130,246,.28)}
#yc-attendance-admin .yc-result.duplicate .yc-result-card{background:linear-gradient(160deg,rgba(245,158,11,.2),rgba(28,18,4,.9));border:1px solid rgba(251,191,36,.55);box-shadow:0 0 42px rgba(245,158,11,.24)}
#yc-attendance-admin .yc-result.error .yc-result-card{background:linear-gradient(160deg,rgba(239,68,68,.2),rgba(30,6,8,.9));border:1px solid rgba(248,113,113,.55);box-shadow:0 0 42px rgba(239,68,68,.26)}
#yc-attendance-admin .yc-ring{width:96px;height:96px;margin:0 auto 12px;position:relative}
#yc-attendance-admin .yc-ring svg{width:100%;height:100%}
#yc-attendance-admin .yc-ring .ring-bg{stroke:rgba(255,255,255,.14)}
#yc-attendance-admin .yc-ring .ring-fg{stroke-dasharray:302;stroke-dashoffset:302;animation:ycDrawRing .9s .1s ease forwards}
#yc-attendance-admin .yc-ring .mark{stroke-dasharray:80;stroke-dashoffset:80;animation:ycDrawMark .5s .55s cubic-bezier(.65,0,.35,1) forwards}
#yc-attendance-admin .yc-ring.glow{animation:ycRingGlow 2.4s infinite}
#yc-attendance-admin .yc-res-photo{width:74px;height:74px;border-radius:50%;object-fit:cover;margin:-4px auto 8px;border:3px solid rgba(255,255,255,.85);background:#1c2430;display:block}
#yc-attendance-admin .yc-res-avatar{width:74px;height:74px;border-radius:50%;margin:-4px auto 8px;display:flex;align-items:center;justify-content:center;font-size:34px;background:rgba(255,255,255,.12);border:3px solid rgba(255,255,255,.85)}
#yc-attendance-admin .yc-res-name{font-size:1.06rem;font-weight:800;margin:2px 0}
#yc-attendance-admin .yc-res-sub{color:var(--yc-mute);font-size:.74rem;line-height:1.9}
#yc-attendance-admin .yc-res-time{display:inline-block;margin-top:10px;padding:5px 14px;border-radius:999px;font-weight:800;font-size:.8rem;font-variant-numeric:tabular-nums;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22)}
#yc-attendance-admin .yc-countdown{margin-top:10px;font-size:1.5rem;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:1px}
#yc-attendance-admin .yc-res-close{position:absolute;top:10px;left:10px;background:none;border:0;color:var(--yc-mute);font-size:18px;cursor:pointer;padding:4px 8px}

/* ===== attendance rows ===== */
#yc-attendance-admin .yc-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 4px;border-bottom:1px dashed color-mix(in srgb,var(--yc-ink) 14%,transparent);font-size:.8rem;flex-wrap:wrap}
#yc-attendance-admin .yc-row:last-child{border-bottom:0}
#yc-attendance-admin .yc-row b{display:block}
#yc-attendance-admin .yc-row small{display:block;color:var(--yc-mute);font-size:.7rem;margin-top:2px}
#yc-attendance-admin .yc-status{padding:4px 12px;border-radius:999px;font-size:.7rem;font-weight:800;white-space:nowrap}
#yc-attendance-admin .yc-status.inside{background:rgba(52,211,153,.16);color:#6ee7b7;border:1px solid rgba(52,211,153,.4)}
#yc-attendance-admin .yc-status.left{background:rgba(96,165,250,.16);color:#93c5fd;border:1px solid rgba(96,165,250,.4)}
#yc-attendance-admin .yc-status.absent{background:rgba(148,163,184,.14);color:#cbd5e1;border:1px solid rgba(148,163,184,.35)}
#yc-attendance-admin .yc-status.upcoming{background:color-mix(in srgb,var(--yc-accent2) 18%,transparent);color:var(--yc-accent2)}
#yc-attendance-admin .yc-status.no-training{background:rgba(148,163,184,.1);color:#94a3b8}
#yc-attendance-admin .yc-row .yc-actions{display:flex;gap:6px;flex-wrap:wrap}

/* ===== QR card panel ===== */
#yc-attendance-admin .yc-qr-panel{display:none;margin-top:14px}
#yc-attendance-admin .yc-qr-panel.open{display:block;animation:ycFadeIn .3s ease}
#yc-attendance-admin .yc-idcard-wrap{display:flex;justify-content:center;padding:14px;background:repeating-conic-gradient(rgba(255,255,255,.05) 0 25%,transparent 0 50%) 50%/26px 26px;border-radius:16px}
#yc-attendance-admin .yc-idcard-wrap canvas{width:min(330px,100%);height:auto;border-radius:14px;box-shadow:0 18px 44px rgba(0,0,0,.5)}
#yc-attendance-admin .yc-qr-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
#yc-attendance-admin .yc-qr-meta span{padding:5px 12px;border-radius:999px;font-size:.7rem;background:color-mix(in srgb,var(--yc-ink) 7%,transparent);border:1px solid color-mix(in srgb,var(--yc-ink) 16%,transparent);color:var(--yc-mute)}
#yc-attendance-admin .yc-qr-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px}

/* ===== history modal ===== */
#yc-attendance-admin .yc-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(2,4,8,.7);backdrop-filter:blur(6px);padding:18px}
#yc-attendance-admin .yc-modal.open{display:flex;animation:ycFadeIn .25s ease}
#yc-attendance-admin .yc-modal-box{max-width:480px;width:100%;max-height:82vh;overflow:auto;border-radius:20px;padding:20px;background:linear-gradient(160deg,var(--yc-bg1),var(--yc-bg2));border:1px solid color-mix(in srgb,var(--yc-accent) 30%,transparent)}
#yc-attendance-admin .yc-modal-box h3{margin:0 0 12px}
#yc-attendance-admin .yc-hist-day{margin:12px 0;padding:12px;border-radius:12px;background:color-mix(in srgb,var(--yc-ink) 5%,transparent)}
#yc-attendance-admin .yc-hist-day .d{font-weight:800;font-size:.8rem;color:var(--yc-accent)}
#yc-attendance-admin .yc-hist-row{display:flex;justify-content:space-between;gap:8px;padding:7px 0;font-size:.72rem;color:var(--yc-ink);border-bottom:1px dashed color-mix(in srgb,var(--yc-ink) 12%,transparent);flex-wrap:wrap}
#yc-attendance-admin .yc-hist-row .in{color:#6ee7b7;font-weight:800}
#yc-attendance-admin .yc-hist-row .out{color:#93c5fd;font-weight:800}
#yc-attendance-admin .yc-hist-row .by{color:var(--yc-mute)}

@keyframes ycPulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes ycFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes ycBreathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.07);opacity:1}}
@keyframes ycSweepY{from{top:18%}to{top:82%}}
@keyframes ycScanX{from{left:16%}to{left:84%}}
@keyframes ycFadeIn{from{opacity:0}to{opacity:1}}
@keyframes ycPop{0%{transform:scale(.78);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes ycDrawRing{to{stroke-dashoffset:0}}
@keyframes ycDrawMark{to{stroke-dashoffset:0}}
@keyframes ycRingGlow{0%,100%{filter:drop-shadow(0 0 4px currentColor)}50%{filter:drop-shadow(0 0 18px currentColor)}}
@media(max-width:640px){
 #yc-attendance-admin{padding:13px}
 #yc-attendance-admin .yc-stage{aspect-ratio:3/4;max-height:70vh}
 #yc-attendance-admin .yc-corner{width:34px;height:34px}
}
@media(prefers-reduced-motion:reduce){#yc-attendance-admin .yc-laser,#yc-attendance-admin .yc-corner,#yc-attendance-admin .yc-scanline,#yc-attendance-admin .yc-focus-dot,#yc-attendance-admin .yc-ring.glow{animation:none!important}}
@media print{body.yc-print-qr *{visibility:hidden!important}body.yc-print-qr #yc-attendance-admin,body.yc-print-qr #yc-attendance-admin *{visibility:visible!important}body.yc-print-qr #yc-attendance-admin{position:fixed!important;inset:0!important;margin:0!important;padding:24px!important;border:0!important;background:#fff!important;display:block!important;overflow:visible!important}body.yc-print-qr #yc-attendance-admin .yc-idcard-wrap{background:none!important}body.yc-print-qr #yc-attendance-admin canvas{box-shadow:none!important}}
`;
  document.head.appendChild(s);
}

/* ================= WebAudio feedback (synthesized, no external files) ================= */
const soundEngine = {
  ctx: null,
  muted: (localStorage.getItem("yc-att-sound") || "") === "muted",
  ensure() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  beep(freq, delay, dur, type = "sine", vol = .16) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(this.ctx.destination);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.start(t); o.stop(t + dur + .06);
  },
  play(name) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    if (name === "checkin") { this.beep(659, 0, .2); this.beep(880, .12, .24); this.beep(1318, .27, .3, "triangle", .08); }
    else if (name === "checkout") { this.beep(880, 0, .18); this.beep(659, .12, .3, "sine", .13); }
    else if (name === "duplicate") { this.beep(494, 0, .12, "sine", .1); this.beep(494, .17, .12, "sine", .1); }
    else if (name === "error") { this.beep(233, 0, .26, "sawtooth", .09); }
  },
  toggle() {
    this.muted = !this.muted;
    localStorage.setItem("yc-att-sound", this.muted ? "muted" : "on");
    return this.muted;
  }
};

/* ================= QR / scanner library loaders ================= */
function ensureQrLibrary() {
  if (window.QRCode) return Promise.resolve();
  if (window.__ycQrLibraryPromise) return window.__ycQrLibraryPromise;
  window.__ycQrLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js";
    script.onload = () => window.QRCode ? resolve() : reject(Error("تعذر تحميل مكتبة QR."));
    script.onerror = () => reject(Error("تعذر تحميل مكتبة QR؛ تحقق من الإنترنت."));
    document.head.appendChild(script);
  });
  return window.__ycQrLibraryPromise;
}
function ensureJsQr() {
  if (window.jsQR) return Promise.resolve();
  if (window.__ycJsQrPromise) return window.__ycJsQrPromise;
  window.__ycJsQrPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    script.onload = () => window.jsQR ? resolve() : reject(Error("تعذر تحميل مكتبة المسح."));
    script.onerror = () => reject(Error("تعذر تحميل مكتبة المسح؛ تحقق من الإنترنت."));
    document.head.appendChild(script);
  });
  return window.__ycJsQrPromise;
}

/* ================= helpers ================= */
const fmtTime = v => v ? new Intl.DateTimeFormat("ar-EG", {hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Africa/Cairo"}).format(new Date(v)) : "—";
const fmtDate = v => v ? new Intl.DateTimeFormat("ar-EG", {year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Africa/Cairo"}).format(new Date(v)) : "—";
const statusClass = code => ["inside","left","absent","upcoming","no-training"].includes(code) ? code : "no-training";
function statusChip(s) { return '<span class="yc-status ' + statusClass(s?.code) + '">' + esc(s?.label || "لا توجد حالة مسجلة") + '</span>'; }
function loadImg(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    try {
      const src = new URL(url, location.href).href;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    } catch { resolve(null); }
  });
}

/* ================= module mount ================= */
async function mount(a) {
  const theme = THEMES[a];
  injectStyle(theme);

  let box = $("#yc-attendance-admin");
  if (box) box.remove();
  box = document.createElement("section");
  box.id = "yc-attendance-admin";

  box.innerHTML = `
 <h2><span class="yc-live-dot"></span> ${academyIcons[a]} نظام هوية اللاعب والحضور الذكي — ${esc(academyNames[a])}</h2>
 <p class="lead">بطاقة QR واحدة دائمة لكل لاعب، يتعرّف عليها القارئ في أي لوحة مصرّح بها تلقائيًا. التحقق يجري في الخادم، ومنع تكرار المسح خمس دقائق إلزامي، وكل حركة تُسجَّل باسم المدير المسؤول.</p>
 <div class="yc-grid">
  <div class="yc-card yc-scanner-card" style="grid-column:1/-1">
   <h3>📷 قارئ QR بالكاميرا</h3>
   <div class="yc-stage" id="yc-stage">
    <video id="yc-video" playsinline muted autoplay></video>
    <div class="yc-stage-off" id="yc-stage-off"><span class="yc-cam-art">📷</span>القارئ متوقف — اضغط «تشغيل الكاميرا»<br><small>وجّه الكاميرا نحو بطاقة اللاعب وسيتم التعرف عليه تلقائيًا</small></div>
    <div class="yc-frame"><span class="yc-corner tl"></span><span class="yc-corner tr"></span><span class="yc-corner bl"></span><span class="yc-corner br"></span><span class="yc-laser"></span><span class="yc-scanline"></span><span class="yc-focus-dot"></span></div>
    <div class="yc-chip" id="yc-chip"><span class="dot"></span><span id="yc-chip-text">القارئ جاهز</span></div>
    <div class="yc-result" id="yc-result"></div>
   </div>
   <div class="yc-cam-controls">
    <button class="yc-btn" id="yc-cam-start">▶ تشغيل الكاميرا</button>
    <button class="yc-btn alt" id="yc-cam-stop" style="display:none">■ إيقاف</button>
    <button class="yc-icon-btn" id="yc-cam-flip" title="تبديل الكاميرا (أمامية/خلفية)" style="display:none">🔄</button>
    <button class="yc-icon-btn" id="yc-cam-torch" title="تشغيل/إطفاء المصباح" style="display:none">🔦</button>
    <button class="yc-icon-btn ${soundEngine.muted ? "" : "active"}" id="yc-sound" title="تشغيل/كتم الأصوات">${soundEngine.muted ? "🔇" : "🔊"}</button>
    <span class="yc-clock" id="yc-clock"></span>
   </div>
   <div class="yc-msg" id="yc-scan-msg"></div>
  </div>

  <div class="yc-card">
   <h3>👨‍👦 بيانات اللاعب وولي الأمر</h3>
   <label>اللاعب<select id="yc-player"></select></label>
   <label>رقم هاتف ولي الأمر<input id="yc-phone" dir="ltr" placeholder="01xxxxxxxxx" inputmode="tel" autocomplete="tel"></label>
   <button class="yc-btn" id="yc-save-link">حفظ البيانات وإنشاء / تحديث بطاقة QR</button>
   <button class="yc-btn alt" id="yc-remove-link">إلغاء ربط ولي الأمر</button>
   <div class="yc-msg" id="yc-link-msg"></div>
  </div>

  <div class="yc-card">
   <h3>⌨️ إدخال رمز يدوي</h3>
   <label>محتوى QR<input id="yc-code" dir="ltr" autocomplete="off" placeholder="امسح الرمز بالكاميرا أو الصق محتواه هنا"></label>
   <button class="yc-btn" id="yc-scan">تحقق وتسجيل الحركة</button>
   <p class="lead" style="margin:8px 0 0">لا يمكن تسجيل الحضور برقم اللاعب وحده؛ يجب أن يكون الرمز صادرًا من قاعدة بيانات المركز.</p>
  </div>
 </div>

 <div class="yc-card" style="margin-top:14px">
  <h3>📋 حضور وانصراف اليوم <button class="yc-btn alt" id="yc-reload" style="margin-inline-start:8px">↻ تحديث السجلات</button></h3>
  <div id="yc-list">جارٍ تحميل السجلات…</div>
 </div>

 <div class="yc-card yc-qr-panel" id="yc-qr">
  <h3>🪪 بطاقة اللاعب الرسمية</h3>
  <div id="yc-qr-view"></div>
 </div>

 <div class="yc-modal" id="yc-hist-modal"><div class="yc-modal-box"><h3>🕘 سجل الحضور والانصراف</h3><div id="yc-hist-body"></div><button class="yc-btn alt" style="margin-top:12px" id="yc-hist-close">إغلاق</button></div></div>`;

  const anchor = $("#dashboard-section") || $("#app") || $(".wrap") || document.querySelector("main") || document.body;
  anchor.appendChild(box);

  /* ---------- state ---------- */
  let players = [], rows = [], scanBusy = false;
  const recentScans = new Map();
  const cam = {stream:null, track:null, facing:"environment", torchOn:false, timer:0, live:false, detector:null, work:null, workCtx:null};
  const sel = $("#yc-player", box), stage = $("#yc-stage", box), video = $("#yc-video", box), result = $("#yc-result", box);
  const message = (id, t) => { const el = $("#" + id, box); if (el) el.textContent = t; };
  const chip = (text, mode) => { const c = $("#yc-chip", box); $("#yc-chip-text", box).textContent = text; c.classList.toggle("live", mode === "live"); c.classList.toggle("reading", mode === "reading"); };

  /* ---------- clock ---------- */
  const tickClock = () => { const el = $("#yc-clock", box); if (el) el.textContent = new Intl.DateTimeFormat("ar-EG", {weekday:"long",hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Africa/Cairo"}).format(new Date()); };
  tickClock(); setInterval(tickClock, 30000);

  /* =================== result overlay with animations =================== */
  let resultTimer = 0, countdownTimer = 0;
  function ringSvg(color, path) {
    return `<div class="yc-ring glow"><svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="52" fill="none" stroke-width="7"></circle><circle class="ring-fg" cx="60" cy="60" r="52" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" transform="rotate(-90 60 60)"></circle><path class="mark" d="${path}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
  }
  const PATH_CHECK = "M38 62 L53 77 L84 44";
  const PATH_EXIT = "M60 30 V78 M42 60 L60 78 L78 60";
  const PATH_WARN = "M60 32 L60 62 M60 82 L60 82.01";
  const PATH_ERR = "M44 44 L76 76 M76 44 L44 76";

  function showResult(kind, data = {}) {
    clearTimeout(resultTimer); clearInterval(countdownTimer);
    const colors = {checkin:"#34d399", checkout:"#60a5fa", duplicate:"#fbbf24", error:"#f87171"};
    const color = colors[kind] || colors.error;
    const photo = data.playerPhoto
      ? '<img class="yc-res-photo" alt="" src="' + esc(data.playerPhoto) + '" onerror="this.outerHTML=\'<div class=\\\'yc-res-avatar\\\'>👤</div>\'">'
      : '<div class="yc-res-avatar">👤</div>';
    result.className = "yc-result show " + kind;
    let inner = '<div class="yc-result-card"><button class="yc-res-close" id="yc-res-x">✕</button>';
    if (kind === "checkin") {
      inner += ringSvg(color, PATH_CHECK);
      inner += photo;
      inner += '<div class="yc-res-name">' + esc(data.playerName || "لاعب") + '</div>';
      inner += '<div class="yc-res-sub">' + esc(data.academyLabel || academyNames[a]) + (data.guardianPhone ? ' · ولي الأمر: <bdi>' + esc(data.guardianPhone) + '</bdi>' : '') + (data.masked ? ' · رقم الولي محجوب (لاعب من أكاديمية أخرى)' : '') + '</div>';
      inner += '<div class="yc-res-time">🕐 ' + fmtTime(data.at) + ' — بتوقيت القاهرة</div>';
      soundEngine.play("checkin");
      resultTimer = setTimeout(hideResult, 6000);
    } else if (kind === "checkout") {
      inner += ringSvg(color, PATH_EXIT);
      inner += photo;
      inner += '<div class="yc-res-name">' + esc(data.playerName || "لاعب") + '</div>';
      inner += '<div class="yc-res-sub">' + esc(data.academyLabel || academyNames[a]) + '</div>';
      inner += '<div class="yc-res-time">🕐 ' + fmtTime(data.at) + ' — بتوقيت القاهرة</div>';
      soundEngine.play("checkout");
      resultTimer = setTimeout(hideResult, 6000);
    } else if (kind === "duplicate") {
      inner += ringSvg(color, PATH_WARN);
      inner += '<div class="yc-res-name">' + esc(data.playerName || "اللاعب") + '</div>';
      inner += '<div class="yc-res-sub">' + esc(data.message || "تمت قراءة هذا الرمز منذ قليل") + '</div>';
      inner += '<div class="yc-countdown" id="yc-cd">--:--</div><div class="yc-res-sub">الوقت المتبقي قبل قبول المسح التالي</div>';
      soundEngine.play("duplicate");
      let left = Number(data.remainingSeconds) || 300;
      const paint = () => { const el = $("#yc-cd", box); if (el) el.textContent = String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0"); };
      paint();
      countdownTimer = setInterval(() => { left = Math.max(0, left - 1); paint(); if (!left) clearInterval(countdownTimer); }, 1000);
      resultTimer = setTimeout(hideResult, 8000);
    } else {
      inner += ringSvg(color, PATH_ERR);
      inner += '<div class="yc-res-name">' + esc(data.message || "حدث خطأ غير متوقع") + '</div>';
      inner += '<div class="yc-res-sub">تأكد من صلاحية البطاقة وصلاحيات الحساب، ثم أعد المحاولة</div>';
      soundEngine.play("error");
      resultTimer = setTimeout(hideResult, 5000);
    }
    inner += '</div>';
    result.innerHTML = inner;
    $("#yc-res-x", box) && ($("#yc-res-x", box).onclick = hideResult);
  }
  function hideResult() { clearTimeout(resultTimer); clearInterval(countdownTimer); result.className = "yc-result"; result.innerHTML = ""; }
  result.addEventListener("click", e => { if (e.target === result) hideResult(); });

  /* =================== camera engine =================== */
  function stopCamera() {
    cam.live = false;
    clearTimeout(cam.timer);
    if (cam.stream) cam.stream.getTracks().forEach(t => t.stop());
    cam.stream = null; cam.track = null; cam.detector = null; cam.torchOn = false;
    video.pause(); video.srcObject = null;
    stage.classList.remove("live");
    $("#yc-stage-off", box).style.display = "flex";
    $("#yc-cam-flip", box).style.display = "none";
    $("#yc-cam-torch", box).style.display = "none";
    $("#yc-cam-torch", box).classList.remove("active");
    $("#yc-cam-start", box).style.display = "";
    $("#yc-cam-stop", box).style.display = "none";
    video.classList.toggle("mirror", false);
    chip("القارئ متوقف", "");
    message("yc-scan-msg", "");
  }

  async function startCamera() {
    if (cam.live) return;
    soundEngine.ensure();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Error("الكاميرا تحتاج إلى اتصال HTTPS ومتصفح حديث.");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:cam.facing, width:{ideal:1280}, height:{ideal:720}}, audio:false});
    } catch (e) {
      if (e && e.name === "NotAllowedError") throw Error("تم رفض صلاحية الكاميرا. اسمح بالوصول من إعدادات المتصفح ثم أعد المحاولة.");
      if (e && e.name === "NotFoundError") throw Error("لم يتم العثور على كاميرا على هذا الجهاز.");
      if (e && e.name === "NotReadableError") throw Error("الكاميرا مستخدمة من تطبيق آخر. أغلقه ثم أعد المحاولة.");
      throw Error("تعذر تشغيل الكاميرا: " + (e?.message || "خطأ غير معروف"));
    }
    cam.stream = stream;
    cam.track = stream.getVideoTracks()[0] || null;
    video.srcObject = stream;
    await video.play().catch(() => {});
    cam.live = true;
    $("#yc-stage-off", box).style.display = "none";
    $("#yc-cam-start", box).style.display = "none";
    $("#yc-cam-stop", box).style.display = "";
    const caps = cam.track && cam.track.getCapabilities ? cam.track.getCapabilities() : {};
    if (caps.torch) $("#yc-cam-torch", box).style.display = "";
    if ((caps.facingMode && caps.facingMode.length > 1) || await countCameras() > 1) $("#yc-cam-flip", box).style.display = "";
    video.classList.toggle("mirror", cam.facing === "user");
    stage.classList.add("live");
    chip("الكاميرا تعمل — وجّه الرمز", "live");
    message("yc-scan-msg", "");
    startDetect();
  }

  async function countCameras() {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      return devs.filter(d => d.kind === "videoinput").length;
    } catch { return 0; }
  }

  async function switchCamera() {
    if (!cam.live) return;
    cam.facing = cam.facing === "environment" ? "user" : "environment";
    stopCamera();
    try { await startCamera(); } catch (e) { message("yc-scan-msg", "تعذر تبديل الكاميرا: " + e.message); }
  }

  async function toggleTorch() {
    if (!cam.track) return;
    const next = !cam.torchOn;
    try {
      await cam.track.applyConstraints({advanced:[{torch:next}]});
      cam.torchOn = next;
      $("#yc-cam-torch", box).classList.toggle("active", next);
    } catch { message("yc-scan-msg", "المصباح غير مدعوم على هذا الجهاز."); }
  }

  function decodeWithJsQr() {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    const scale = Math.min(1, 640 / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    if (!cam.work) { cam.work = document.createElement("canvas"); cam.workCtx = cam.work.getContext("2d", {willReadFrequently:true}); }
    if (cam.work.width !== cw || cam.work.height !== ch) { cam.work.width = cw; cam.work.height = ch; }
    cam.workCtx.drawImage(video, 0, 0, cw, ch);
    const d = cam.workCtx.getImageData(0, 0, cw, ch);
    const res = window.jsQR(d.data, cw, ch, {inversionAttempts:"attemptBoth"});
    return res ? res.data : null;
  }

  async function startDetect() {
    const native = "BarcodeDetector" in window;
    if (native) cam.detector = new BarcodeDetector({formats:["qr_code"]});
    else {
      try { await ensureJsQr(); } catch (e) { chip("لا يدعم المتصفح المسح التلقائي — استخدم الإدخال اليدوي", ""); message("yc-scan-msg", e.message); stopCamera(); return; }
    }
    const loop = async () => {
      if (!cam.live) return;
      if (!scanBusy && !document.hidden && !result.classList.contains("show")) {
        try {
          let text = null;
          if (native) { const found = await cam.detector.detect(video); if (found.length) text = found[0].rawValue; }
          else text = decodeWithJsQr();
          if (text) await scanText(text);
        } catch (e) { /* transient decode errors are ignored */ }
      }
      cam.timer = setTimeout(loop, native ? 120 : 140);
    };
    loop();
  }

  /* =================== scanning flow =================== */
  async function scanText(raw) {
    if (scanBusy) return;
    scanBusy = true;
    chip("جارٍ التحقق من الرمز…", "reading");
    try {
      let value = String(raw || "").trim();
      if (value.startsWith("AHMADIYAH|")) {
        const p = value.split("|");
        if (p.length !== 3 || p[1] !== "v1") throw Error("صيغة الباركود غير صحيحة أو قديمة.");
        value = p[2];
      }
      if (!value || value.length < 20) throw Error("رمز QR غير صالح.");
      let resultData;
      try { resultData = await api(a, "/api/admin/scan", {method:"POST", body:JSON.stringify({token:value})}); }
      catch (netErr) {
        if (/fetch|network|Failed/i.test(String(netErr))) throw Error("تعذر الاتصال بخدمة الحضور — تحقق من الإنترنت وأعد المحاولة.");
        throw netErr;
      }
      recentScans.set(value, Date.now());
      $("#yc-code", box).value = "";
      if (resultData.ignored) { showResult("duplicate", resultData); await refreshAttendance(); return; }
      if (resultData.rateLimited) { showResult("error", {message:resultData.message}); return; }
      showResult(resultData.action, resultData);
      await refreshAttendance();
    } catch (e) {
      showResult("error", {message:e.message});
      message("yc-scan-msg", e.message);
    } finally {
      scanBusy = false;
      if (cam.live) chip("الكاميرا تعمل — وجّه الرمز", "live");
    }
  }

  /* =================== data loading =================== */
  async function load() {
    players = await api(a, "/api/admin/players?academy=" + a);
    const old = sel.value;
    sel.innerHTML = '<option value="">اختر لاعبًا</option>' + players.map(p => '<option value="' + esc(p.id) + '">' + esc(p.name) + ' — ' + esc(p.barcodeId || "بدون بطاقة") + '</option>').join("");
    sel.value = old;
    const chosen = players.find(p => String(p.id) === String(sel.value));
    if (chosen && chosen.guardianPhone) $("#yc-phone", box).value = chosen.guardianPhone;
    await refreshAttendance();
  }
  async function refreshAttendance() {
    try {
      rows = await api(a, "/api/admin/attendance?academy=" + a);
      const list = $("#yc-list", box);
      list.innerHTML = rows.map(p => renderRow(p)).join("") || '<p style="color:var(--yc-mute);font-size:.8rem">لا توجد سجلات لاعبين بعد.</p>';
    } catch (e) { message("yc-scan-msg", e.message); }
  }
  function renderRow(p) {
    const st = p.status || {};
    return '<div class="yc-row"><span style="min-width:150px"><b>' + esc(p.name) + '</b><small>ID: ' + esc(p.id) + ' · ' + st.sessions + ' جلسة اليوم</small></span>' + statusChip(st) +
      '<span class="yc-actions"><button class="yc-btn alt" data-qr="' + esc(p.id) + '">بطاقة QR</button><button class="yc-btn ghost" data-hist="' + esc(p.id) + '">السجل</button></span></div>';
  }

  /* =================== premium ID card =================== */
  function roundRect(x, r, X, Y, W, H) {
    x.beginPath();
    x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r);
    x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath();
  }

  async function drawIdCard(p) {
    await ensureQrLibrary();
    const t = THEMES[a];
    const W = 780, H = 1080;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");

    const grad = x.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, t.bg1); grad.addColorStop(1, t.bg2);
    roundRect(x, 36, 0, 0, W, H); x.fillStyle = grad; x.fill();
    x.strokeStyle = t.accent; x.lineWidth = 4; roundRect(x, 30, 10, 10, W - 20, H - 20); x.stroke();
    x.strokeStyle = "rgba(255,255,255,.14)"; x.lineWidth = 1.5; roundRect(x, 20, 20, 20, W - 40, H - 40); x.stroke();

    x.textAlign = "center";
    // header
    x.font = "900 30px Cairo, 'Segoe UI', sans-serif"; x.fillStyle = t.accent;
    x.fillText("🏛️ مركز شباب الأحمدية", W / 2, 78);
    x.font = "700 21px Cairo, 'Segoe UI', sans-serif"; x.fillStyle = "rgba(255,255,255,.75)";
    x.fillText("AHMADIYAH YOUTH CENTER — PLAYER IDENTITY", W / 2, 110);
    // academy chip
    const chip = academyIcons[a] + " " + academyNames[a];
    x.font = "800 24px Cairo, 'Segoe UI', sans-serif";
    const cw = x.measureText(chip).width + 60;
    roundRect(x, 22, (W - cw) / 2, 132, cw, 48, 24);
    x.fillStyle = t.soft; x.fill(); x.strokeStyle = t.accent; x.lineWidth = 2; x.stroke();
    x.fillStyle = "#ffffff"; x.fillText(chip, W / 2, 165);

    // photo
    const img = await loadImg(p.photo || "");
    const cx = W / 2, cy = 300, pr = 88;
    x.save();
    x.beginPath(); x.arc(cx, cy, pr + 6, 0, Math.PI * 2); x.fillStyle = t.accent; x.fill();
    x.beginPath(); x.arc(cx, cy, pr, 0, Math.PI * 2); x.clip();
    if (img) { const s = Math.max(pr * 2 / img.width, pr * 2 / img.height); x.drawImage(img, cx - img.width * s / 2, cy - img.height * s / 2, img.width * s, img.height * s); }
    else { x.fillStyle = "rgba(255,255,255,.16)"; x.fillRect(cx - pr, cy - pr, pr * 2, pr * 2); x.font = "700 62px Cairo, sans-serif"; x.fillStyle = "#fff"; x.fillText(String(p.name || "؟").trim().charAt(0), cx, cy + 24); }
    x.restore();

    // name + fields
    x.fillStyle = "#ffffff"; x.font = "900 44px Cairo, 'Segoe UI', sans-serif";
    x.fillText(String(p.name || "لاعب"), W / 2, 448);
    x.font = "600 22px Cairo, 'Segoe UI', sans-serif"; x.fillStyle = t.mute;
    x.fillText((p.age ? "السن: " + p.age + " · " : "") + "رقم الهوية: " + (p.barcodeId || "—"), W / 2, 490);
    x.fillText("ولي الأمر: " + (p.guardianPhone || "غير مربوط"), W / 2, 524);

    // QR panel
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, "AHMADIYAH|v1|" + p.barcodeToken, {width:330, margin:2, errorCorrectionLevel:"H", color:{dark:t.qrDark, light:"#ffffff"}});
    const qx = (W - 350) / 2, qy = 560;
    roundRect(x, 16, qx, qy, 350, 350); x.fillStyle = "#ffffff"; x.fill();
    x.drawImage(qrCanvas, qx + 10, qy + 10, 330, 330);

    // status badge
    const active = p.barcodeActive !== false;
    const label = active ? "✔ البطاقة مفعّلة" : "✖ البطاقة موقوفة";
    x.font = "800 23px Cairo, 'Segoe UI', sans-serif";
    const bw = x.measureText(label).width + 56;
    roundRect(x, 22, (W - bw) / 2, 950, bw, 46, 23);
    x.fillStyle = active ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)"; x.fill();
    x.strokeStyle = active ? "#34d399" : "#f87171"; x.lineWidth = 2; x.stroke();
    x.fillStyle = active ? "#6ee7b7" : "#fca5a5"; x.fillText(label, W / 2, 981);

    x.font = "600 18px Cairo, 'Segoe UI', sans-serif"; x.fillStyle = "rgba(255,255,255,.55)";
    x.fillText("بطاقة هوية رقمية — رمز QR دائم لا يتغير بالتحديث أو التحديث عبر الأكاديميات", W / 2, 1022);
    return c;
  }

  async function showPlayerQr(id) {
    const p = players.find(x => String(x.id) === String(id));
    if (!p) throw Error("اللاعب غير موجود.");
    if (!p.barcodeToken || !p.barcodeId) throw Error("لم يتم إنشاء بطاقة QR بعد — اضغط «حفظ البيانات وإنشاء بطاقة QR».");
    const panel = $("#yc-qr", box), view = $("#yc-qr-view", box);
    panel.classList.add("open");
    view.innerHTML = '<div class="yc-idcard-wrap"><span class="yc-msg">جارٍ تجهيز البطاقة…</span></div>';
    let card;
    try { card = await drawIdCard(p); } catch (e) { view.innerHTML = '<div class="yc-msg">' + esc(e.message) + '</div>'; return; }
    view.innerHTML = "";
    const wrap = document.createElement("div"); wrap.className = "yc-idcard-wrap";
    wrap.appendChild(card); view.appendChild(wrap);

    const meta = document.createElement("div"); meta.className = "yc-qr-meta";
    meta.innerHTML =
      '<span>🪪 رقم الهوية: <b>' + esc(p.barcodeId) + '</b></span>' +
      '<span>📅 أُنشئت: ' + esc(fmtDate(p.barcodeCreatedAt)) + '</span>' +
      '<span>#️⃣ الإصدار: ' + esc(p.barcodeRevision || 1) + '</span>' +
      '<span>' + (p.barcodeActive === false ? '⛔ موقوفة' : '✅ مفعّلة') + '</span>' +
      (p.guardianPhone ? '<span>📞 ولي الأمر: <bdi>' + esc(p.guardianPhone) + '</bdi></span>' : '');
    view.appendChild(meta);

    const actions = document.createElement("div"); actions.className = "yc-qr-actions";
    actions.innerHTML =
      '<button class="yc-btn" id="yc-qr-download">⬇ تنزيل البطاقة PNG</button>' +
      '<button class="yc-btn alt" id="yc-qr-print">🖨 طباعة</button>' +
      '<button class="yc-btn alt" id="yc-qr-share">📤 مشاركة</button>' +
      '<button class="yc-btn alt" id="yc-qr-whatsapp">💬 واتساب</button>' +
      '<button class="yc-btn warn" id="yc-qr-regen">♻ تغيير الرمز</button>' +
      '<button class="yc-btn warn" id="yc-qr-revoke">⛔ إيقاف البطاقة</button>';
    view.appendChild(actions);

    const cardName = () => "Ahmadiya-" + a + "-" + (p.barcodeId || p.id) + ".png";
    $("#yc-qr-download", view).onclick = () => {
      const link = document.createElement("a");
      link.href = card.toDataURL("image/png"); link.download = cardName(); link.click();
    };
    $("#yc-qr-print", view).onclick = () => {
      document.body.classList.add("yc-print-qr");
      const done = () => { document.body.classList.remove("yc-print-qr"); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print(); setTimeout(done, 2000);
    };
    $("#yc-qr-share", view).onclick = () => {
      const text = "بطاقة هوية اللاعب " + p.name + " — " + academyNames[a] + " — مركز شباب الأحمدية. رقم الهوية: " + p.barcodeId;
      card.toBlob(async blob => {
        if (blob && navigator.canShare && navigator.share) {
          const file = new File([blob], cardName(), {type:"image/png"});
          try { if (navigator.canShare({files:[file]})) { await navigator.share({title:"بطاقة اللاعب", text, files:[file]}); return; } } catch (e) { if (e && e.name === "AbortError") return; }
        }
        message("yc-scan-msg", "المشاركة غير مدعومة هنا — استخدم تنزيل البطاقة أو واتساب.");
      }, "image/png");
    };
    $("#yc-qr-whatsapp", view).onclick = () => {
      const text = "بطاقة QR الخاصة باللاعب " + p.name + "\nالأكاديمية: " + academyNames[a] + "\nرقم الهوية: " + p.barcodeId + "\nمركز شباب الأحمدية";
      card.toBlob(async blob => {
        if (blob && navigator.canShare && navigator.share) {
          const file = new File([blob], cardName(), {type:"image/png"});
          try { if (navigator.canShare({files:[file]})) { await navigator.share({title:"بطاقة اللاعب", text, files:[file]}); return; } } catch (e) { if (e && e.name === "AbortError") return; }
        }
        window.open("https://wa.me/?text=" + encodeURIComponent(text + "\nيمكن إرفاق صورة البطاقة بعد تنزيلها من لوحة الأكاديمية."), "_blank", "noopener");
      }, "image/png");
    };
    $("#yc-qr-regen", view).onclick = async () => {
      if (!confirm("تغيير الرمز يجعل البطاقات القديمة غير صالحة ويصدر رمزًا جديدًا آمنًا. متابعة؟")) return;
      try {
        const r = await api(a, "/api/admin/qr-manage", {method:"POST", body:JSON.stringify({academy:a, playerId:p.id, action:"regenerate"})});
        message("yc-scan-msg", r.message);
        await load(); await showPlayerQr(p.id);
      } catch (e) { message("yc-scan-msg", e.message); }
    };
    $("#yc-qr-revoke", view).onclick = async () => {
      if (!confirm("إيقاف البطاقة يمنع أي تسجيل حضور لهذا اللاعب حتى إصدار بطاقة جديدة. متابعة؟")) return;
      try {
        const r = await api(a, "/api/admin/qr-manage", {method:"POST", body:JSON.stringify({academy:a, playerId:p.id, action:"revoke"})});
        message("yc-scan-msg", r.message);
        await load(); await showPlayerQr(p.id);
      } catch (e) { message("yc-scan-msg", e.message); }
    };
    panel.scrollIntoView({behavior:"smooth", block:"center"});
  }

  /* =================== history modal =================== */
  async function showHistory(id) {
    const modal = $("#yc-hist-modal", box), body = $("#yc-hist-body", box);
    body.innerHTML = '<span class="yc-msg">جارٍ تحميل السجل…</span>';
    modal.classList.add("open");
    try {
      const r = await api(a, "/api/admin/attendance-history?academy=" + a + "&playerId=" + encodeURIComponent(id) + "&days=7");
      const p = players.find(x => String(x.id) === String(id));
      body.innerHTML = '<p class="yc-res-sub" style="text-align:right">' + esc(p?.name || "") + ' · آخر ٧ أيام</p>' + (r.out || []).map(day =>
        '<div class="yc-hist-day"><div class="d">📅 ' + esc(day.date) + '</div>' +
        day.sessions.map(s =>
          '<div class="yc-hist-row"><span>دخول <b class="in">' + fmtTime(s.checkInAt) + '</b></span>' +
          '<span>خروج <b class="out">' + (s.checkOutAt ? fmtTime(s.checkOutAt) : "—") + '</b></span>' +
          '<span class="by">بواسطة: ' + esc(s.byEmail || s.outBy || s.by || "غير مسجل") + '</span></div>'
        ).join("") + '</div>'
      ).join("") || '<p style="color:var(--yc-mute);font-size:.8rem">لا توجد حركات حضور خلال الأيام السبعة الماضية.</p>';
    } catch (e) { body.innerHTML = '<p class="yc-msg">' + esc(e.message) + '</p>'; }
  }

  /* =================== events =================== */
  sel.addEventListener("change", () => {
    const p = players.find(x => String(x.id) === String(sel.value));
    $("#yc-phone", box).value = p?.guardianPhone || "";
  });
  box.addEventListener("click", async e => {
    try {
      const qr = e.target.closest("[data-qr]"); if (qr) await showPlayerQr(qr.dataset.qr);
      const hist = e.target.closest("[data-hist]"); if (hist) await showHistory(hist.dataset.hist);
    } catch (x) { message("yc-scan-msg", x.message); }
  });
  $("#yc-save-link", box).onclick = async () => {
    try {
      if (!sel.value) throw Error("اختر اللاعب أولًا.");
      const phone = $("#yc-phone", box).value.trim();
      if (!phone) throw Error("أدخل رقم ولي الأمر لإنشاء بطاقة مكتملة.");
      const r = await api(a, "/api/admin/link-player", {method:"POST", body:JSON.stringify({academy:a, playerId:sel.value, phone})});
      message("yc-link-msg", r.message + " رقم البطاقة: " + (r.barcodeId || ""));
      await load(); await showPlayerQr(sel.value);
    } catch (x) { message("yc-link-msg", x.message); }
  };
  $("#yc-remove-link", box).onclick = async () => {
    try {
      if (!sel.value) throw Error("اختر اللاعب أولًا.");
      const r = await api(a, "/api/admin/link-player", {method:"POST", body:JSON.stringify({academy:a, playerId:sel.value, phone:""})});
      message("yc-link-msg", r.message); $("#yc-phone", box).value = "";
      await load();
    } catch (x) { message("yc-link-msg", x.message); }
  };
  $("#yc-scan", box).onclick = () => { soundEngine.ensure(); scanText($("#yc-code", box).value); };
  $("#yc-code", box).addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); soundEngine.ensure(); scanText($("#yc-code", box).value); } });
  $("#yc-cam-start", box).onclick = () => startCamera().catch(e => { message("yc-scan-msg", "تعذر فتح الكاميرا: " + e.message); showResult("error", {message:"تعذر فتح الكاميرا: " + e.message}); });
  $("#yc-cam-stop", box).onclick = stopCamera;
  $("#yc-cam-flip", box).onclick = switchCamera;
  $("#yc-cam-torch", box).onclick = toggleTorch;
  $("#yc-sound", box).onclick = () => {
    const muted = soundEngine.toggle();
    const b = $("#yc-sound", box);
    b.textContent = muted ? "🔇" : "🔊"; b.classList.toggle("active", !muted);
    if (!muted) { soundEngine.ensure(); soundEngine.play("duplicate"); }
  };
  $("#yc-reload", box).onclick = () => refreshAttendance();
  $("#yc-hist-close", box).onclick = () => $("#yc-hist-modal", box).classList.remove("open");
  $("#yc-hist-modal", box).addEventListener("click", e => { if (e.target.id === "yc-hist-modal") e.target.classList.remove("open"); });

  /* auto QR provisioning from the player forms -> show the card immediately */
  window.addEventListener("yc:qr-provisioned", async e => {
    if (e.detail?.academy !== a) return;
    try { await load(); await showPlayerQr(e.detail.playerId); } catch (x) { message("yc-scan-msg", x.message); }
  });

  /* cleanup */
  window.addEventListener("pagehide", stopCamera, {once:true});
  document.addEventListener("visibilitychange", () => { if (document.hidden) hideResult(); });

  await load();
  setInterval(() => refreshAttendance(), 30000);
}

/* ================= bootstrap ================= */
const tag = document.querySelector("script[data-academy-admin]");
if (tag) {
  const a = tag.dataset.academyAdmin;
  const run = () => {
    const root = a === "football" ? $("#dashboard-section") : $("#app");
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (root && getComputedStyle(root).display !== "none") { clearInterval(timer); mount(a).catch(e => console.error("Attendance admin:", e)); }
      else if (tries > 120) clearInterval(timer);
    }, 500);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
}
