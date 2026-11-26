/* test-attendance.js — اختبارات تكامل نظام الحضور وهوية QR
   1) آلة حالات الحضور داخل Durable Object (دخول/خروج/تكرار/مهلة ٥ دقائق)
   2) الحفاظ على جلسات اليوم كاملة وعدم الكتابة فوق التاريخ
   3) حد معدل المسح لكل مدير (40/دقيقة) من جهة الخادم
   4) سجل التدقيق لكل حركة
   5) مسارات Worker: الصحة، CORS، الرفض بدون توكن
   6) تدفق كامل بتوقيع RS256 حقيقي (JWT موقّع بمفتاح اختبار) عبر
      qr-provision → scan → revoke → regenerate → transfer → history
*/
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generateKeyPairSync, sign } = require('crypto');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };

/* ---- fake Durable Object storage ---- */
function fakeStorage() {
  const m = new Map();
  return {
    get: async k => (m.has(k) ? structuredClone(m.get(k)) : undefined),
    put: async (k, v) => { m.set(k, structuredClone(v)); },
    delete: async k => { m.delete(k); },
    list: async ({ prefix }) => { const out = new Map(); for (const [k, v] of m) if (k.startsWith(prefix)) out.set(k, structuredClone(v)); return out; },
    _map: m
  };
}

(async () => {
  /* import the real worker as an ES module */
  const tmp = path.join(os.tmpdir(), 'yc-attendance-worker.mjs');
  fs.copyFileSync(path.join(__dirname, '..', '..', 'attendance-api', 'worker.js'), tmp);
  const mod = await import('file://' + tmp);
  const { AttendanceStore, GuardianLimiter } = mod;
  const worker = mod.default;

  console.log('1) آلة حالات الحضور: مسح → دخول، تكرار مرفوض، +٥ دقائق → خروج، +٥ دقائق → دخول جديد');
  {
    const doStore = new AttendanceStore({ storage: fakeStorage() });
    const key = 'att:session:2026-11-27:football:p1';
    const t0 = '2026-11-27T10:00:00.000Z';
    const call = (now, staff = 'coach1') => doStore.fetch(new Request('https://store/scan-toggle?key=' + encodeURIComponent(key), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ now, staff, staffEmail: 'coach@ahmadiya.online', playerName: 'لاعب الاختبار', barcodeId: 'YC-TEST', academy: 'football', playerId: 'p1' })
    })).then(r => r.json());

    const r1 = await call(t0);
    ok(r1.ok === true && r1.action === 'checkin', 'المسح الأول يسجل حضور (checkin)');
    const r2 = await call('2026-11-27T10:01:30.000Z');
    ok(r2.ignored === true && r2.remainingMs > 0 && r2.remainingMs <= 300000, 'المسح خلال أقل من ٥ دقائق يُرفض مع الوقت المتبقي');
    ok(Math.abs(r2.remainingMs - 210000) < 1000, 'الوقت المتبقي مطابق للمهلة (٣:٣٠ دقيقة)');
    const r3 = await call('2026-11-27T10:05:00.000Z');
    ok(r3.ok === true && r3.action === 'checkout', 'المسح بعد ٥ دقائق بالضبط يسجل انصراف (checkout)');
    const r4 = await call('2026-11-27T10:11:00.000Z');
    ok(r4.ok === true && r4.action === 'checkin', 'المسح الثالث بعد مهلة صحيحة يسجل دخولًا جديدًا');

    const state = await doStore.fetch('https://store/get?key=' + encodeURIComponent(key)).then(r => r.json());
    const sessions = state.value.sessions;
    ok(Array.isArray(sessions) && sessions.length === 2, 'جلسات اليوم محفوظة كاملة (جلستان)');
    ok(sessions[0].in === t0 && sessions[0].out === '2026-11-27T10:05:00.000Z', 'الجلسة الأولى مغلقة دخول/خروج ولم تُكتب فوقها');
    ok(sessions[1].in === '2026-11-27T10:11:00.000Z' && sessions[1].out === null, 'الجلسة الثانية مفتوحة (لاعب داخل التمرين)');
    ok(sessions[0].by === 'coach1' && sessions[0].outBy === 'coach1' && sessions[1].byEmail === 'coach@ahmadiya.online', 'هوية المدير المسجل (by / outBy / byEmail) محفوظة');
    ok(state.value.lastScanAt === '2026-11-27T10:11:00.000Z', 'وقت آخر مسح محدث');
  }

  console.log('2) ترحيل السجل القديم (in/out بلا sessions) دون فقدان التاريخ');
  {
    const st = fakeStorage();
    st._map.set('att:session:2026-11-26:football:p2', { in: '2026-11-26T16:00:00.000Z', out: '2026-11-26T18:00:00.000Z', by: 'old' });
    const doStore = new AttendanceStore({ storage: st });
    const r = await doStore.fetch(new Request('https://store/scan-toggle?key=' + encodeURIComponent('att:session:2026-11-26:football:p2'), {
      method: 'POST', body: JSON.stringify({ now: '2026-11-26T19:00:00.000Z', staff: 's1', playerName: 'قديم' })
    })).then(x => x.json());
    ok(r.ok === true, 'المسح بعد السجل القديم مقبول');
    const v = st._map.get('att:session:2026-11-26:football:p2');
    ok(Array.isArray(v.sessions) && v.sessions[0].in === '2026-11-26T16:00:00.000Z' && v.sessions[0].out === '2026-11-26T18:00:00.000Z', 'السجل القديم حُوّل لمصفوفة جلسات دون فقدان');
  }

  console.log('3) حد معدل المسح (40 عملية/دقيقة لكل حساب) من جهة الخادم فقط');
  {
    const doStore = new AttendanceStore({ storage: fakeStorage() });
    const now = '2026-11-27T12:00:00.000Z';
    let accepted = 0, rateLimited = null;
    for (let i = 0; i < 42; i++) {
      const r = await doStore.fetch(new Request('https://store/scan-toggle?key=' + encodeURIComponent('att:session:2026-11-27:football:pl' + i), {
        method: 'POST', body: JSON.stringify({ now, staff: 'flooder', playerName: 'x' })
      })).then(x => x.json());
      if (r.ok) accepted++; else if (r.rateLimited) rateLimited = r;
    }
    ok(accepted === 40, 'قبل أول 40 عملية للمسح');
    ok(rateLimited && rateLimited.rateLimited === true, 'العملية 41 مرفوضة بحد المعدل');
    const other = await doStore.fetch(new Request('https://store/scan-toggle?key=att:session:2026-11-27:football:other', {
      method: 'POST', body: JSON.stringify({ now, staff: 'another-coach', playerName: 'y' })
    })).then(x => x.json());
    ok(other.ok === true, 'مدير آخر غير متأثر بحد معدل المدير الأول');
    const later = await doStore.fetch(new Request('https://store/scan-toggle?key=att:session:2026-11-27:football:late', {
      method: 'POST', body: JSON.stringify({ now: '2026-11-27T12:01:30.000Z', staff: 'flooder', playerName: 'z' })
    })).then(x => x.json());
    ok(later.ok === true, 'نافذة الدقيقة انقضت → يسمح بالمسح مجددًا');
  }

  console.log('4) سجل التدقيق يسجل كل حركة مسح بأسماء المديرين');
  {
    const st = fakeStorage();
    const doStore = new AttendanceStore({ storage: st });
    await doStore.fetch(new Request('https://store/scan-toggle?key=att:session:2026-11-27:football:pa', {
      method: 'POST', body: JSON.stringify({ now: '2026-11-27T09:00:00.000Z', staff: 'u1', staffEmail: 'a@x.com', playerName: 'أحمد', academy: 'football', playerId: 'pa', barcodeId: 'YC-1' })
    }));
    await doStore.fetch('https://store/audit-add', { method: 'POST', body: JSON.stringify({ kind: 'revoke', academy: 'football', playerId: 'pa', action: 'revoke', staff: 'u1', staffEmail: 'a@x.com' }) });
    const logs = await doStore.fetch('https://store/audit-list?limit=10').then(r => r.json());
    ok(Array.isArray(logs.items) && logs.items.length === 2, 'عنصران في السجل');
    ok(logs.items[0].kind === 'revoke' && logs.items[0].staff === 'u1', 'أحدث عنصر أولًا (إيقاف بطاقة)');
    ok(logs.items[1].kind === 'scan' && logs.items[1].action === 'checkin' && logs.items[1].academy === 'football', 'مسح الحضور موثق بالأكاديمية واللاعب');
  }

  console.log('5) مسارات Worker: الصحة، CORS، وحماية الوصول بدون توكن');
  {
    const doStore = new AttendanceStore({ storage: fakeStorage() });
    const env = { FIREBASE_API_KEY: 'k', FIREBASE_PROJECT_ID: 'academia-e6d7b', ATTENDANCE_STORE: { idFromName: () => ({}), get: () => doStore }, GUARDIAN_LIMITER: { idFromName: () => ({}), get: () => new GuardianLimiter({ storage: fakeStorage() }) } };
    const call = (path2, init = {}) => worker.fetch(new Request('https://worker.test' + path2, { ...init, headers: { origin: 'https://ahmadiya.online', ...(init.headers || {}) } }), env);
    const health = await call('/api/health');
    const hd = await health.json();
    ok(health.status === 200 && hd.ok && hd.academies.length === 4, '/api/health يعيد الأكاديميات الأربع');
    const pre = await worker.fetch(new Request('https://worker.test/api/admin/scan', { method: 'OPTIONS', headers: { origin: 'https://ahmadiya.online', 'access-control-request-headers': 'authorization' } }), env);
    ok(pre.status === 204 && (pre.headers.get('access-control-allow-origin') || '') === 'https://ahmadiya.online', 'preflight CORS يسمح بنطاق الموقع');
    const badOrigin = await worker.fetch(new Request('https://worker.test/api/health', { headers: { origin: 'https://evil.example' } }), env);
    ok(badOrigin.status === 403, 'أصل غير مصرح به مرفوض 403');
    const noAuth = await call('/api/admin/scan', { method: 'POST', body: JSON.stringify({ token: 'x'.repeat(40) }) });
    const nad = await noAuth.json();
    ok(noAuth.status === 403 && /سجّل الدخول/.test(nad.error || ''), 'المسح بدون توكن إدارة يُرفض 403');
    const notFound = await call('/api/nothing');
    ok(notFound.status === 404, 'مسار غير موجود يعيد 404');
  }

  console.log('6) تدفق كامل بتوقيع RS256 حقيقي: إنشاء البطاقة → مسح → إيقاف → تجديد → ترحيل → السجل');
  {
    /* real RSA keypair + hand-signed JWT to exercise verifyStaff end-to-end */
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' });
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const mkToken = (claims) => {
      const head = b64({ alg: 'RS256', kid: 'test-kid' });
      const nowSec = Math.floor(Date.now() / 1000);
      const payload = b64({ aud: 'academia-e6d7b', iss: 'https://securetoken.google.com/academia-e6d7b', sub: 'uid-' + (claims.email || 'x'), user_id: 'uid-x', email: claims.email || '', exp: nowSec + 3600, iat: nowSec - 10, auth_time: nowSec - 10, ...claims });
      const sig = sign('sha256', Buffer.from(head + '.' + payload), privateKey).toString('base64url');
      return head + '.' + payload + '.' + sig;
    };
    const coachJwt = mkToken({ ycFootball: true, email: 'football@ahmadiya.online' });
    const karateJwt = mkToken({ ycKarate: true, email: 'karate@ahmadiya.online' });
    const centerJwt = mkToken({ ycAdmin: true, email: 'center@ahmadiya.online' });
    const noClaimJwt = mkToken({ email: 'guest@nowhere.tld' });

    const PLAYERS = {
      football: { p1: { id: 'p1', name: 'لاعب كرة القدم', photo: '', age: 12 } },
      karate: { pk: { id: 'pk', name: 'لاعب كاراتيه', photo: '', age: 10 } },
      kungfu: {}, nasheed: {}
    };
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.startsWith('https://www.googleapis.com/service_accounts')) return Response.json({ keys: [{ ...jwk, kid: 'test-kid', use: 'sig' }] });
      if (url.startsWith('https://identitytoolkit.googleapis.com/')) return Response.json({ users: [{ localId: 'uid-x' }] });
      if (url.includes('firebaseio.com')) {
        if (url.endsWith('/karate_academy/players.json')) return Response.json(PLAYERS.karate);
        if (url.endsWith('/kungfu_academy/players.json')) return Response.json(PLAYERS.kungfu);
        if (url.endsWith('/nasheed_academy/players.json')) return Response.json(PLAYERS.nasheed);
        if (url.endsWith('/players.json')) return Response.json(PLAYERS.football);
        return Response.json(null);
      }
      if (url.startsWith('https://store/')) return doStore.fetch(new Request(input, init));
      return realFetch(input, init);
    };

    const doStore = new AttendanceStore({ storage: fakeStorage() });
    const env = { FIREBASE_API_KEY: 'k', FIREBASE_PROJECT_ID: 'academia-e6d7b', ATTENDANCE_STORE: { idFromName: () => ({}), get: () => doStore }, GUARDIAN_LIMITER: { idFromName: () => ({}), get: () => new GuardianLimiter({ storage: fakeStorage() }) } };
    const call = (p, init = {}) => worker.fetch(new Request('https://worker.test' + p, { ...init, headers: { origin: 'https://ahmadiya.online', 'content-type': 'application/json', ...(init.headers || {}) } }), env).then(async r => [r.status, await r.json().catch(() => ({}))]);

    /* 6a) qr-provision right after adding a player */
    let [s, d] = await call('/api/admin/qr-provision', { method: 'POST', headers: { authorization: 'Bearer ' + coachJwt }, body: JSON.stringify({ academy: 'football', playerId: 'p1', phone: '01012345678' }) });
    ok(s === 200 && d.ok && /^YC-[A-Z0-9]{16}$/.test(d.barcode.barcodeId), 'qr-provision ينشئ بطاقة بهوية YC-16 حرفًا');
    ok(d.barcode.active === true && d.barcode.createdAt && d.barcode.token.length >= 40, 'البطاقة مفعّلة بتاريخ إنشاء وتوكن آمن طويل');
    const token1 = d.barcode.token;
    ok(await doStore.fetch('https://store/get?key=' + encodeURIComponent('att:barcode-player:football:p1')).then(r => r.json()).then(j => j.value.token === token1), 'التوكن محفوظ بفهرس اللاعب في المخزن الخاص');

    /* 6b) scan → checkin */
    [s, d] = await call('/api/admin/scan', { method: 'POST', headers: { authorization: 'Bearer ' + coachJwt }, body: JSON.stringify({ token: token1 }) });
    ok(s === 200 && d.ok && d.action === 'checkin' && d.academy === 'football', 'المسح الأول يسجل حضورًا من الخادم');
    ok(d.guardianPhone && d.playerName === 'لاعب كرة القدم', 'بيانات اللاعب وولي الأمر تظهر لمدير الأكاديمية نفسها');

    /* 6c) immediate duplicate scan → rejected with remaining seconds */
    [s, d] = await call('/api/admin/scan', { method: 'POST', headers: { authorization: 'Bearer ' + coachJwt }, body: JSON.stringify({ token: token1 }) });
    ok(s === 200 && d.ok === false && d.ignored === true && d.remainingSeconds > 0 && d.remainingSeconds <= 300, 'المسح المكرر فورًا يُرفض مع ثوانٍ متبقية');

    /* 6d) cross-academy scan: karate staff can scan the football player QR */
    [s, d] = await call('/api/admin/scan', { method: 'POST', headers: { authorization: 'Bearer ' + karateJwt }, body: JSON.stringify({ token: token1 }) });
    ok(s === 200 && d.ok === false && d.ignored === true, 'رمز اللاعب يعمل من لوحة أكاديمية مصرّح بها (يتعرف عليه ويطبق المهلة)');

    /* 6e) unauthorized account (no claims) rejected */
    [s, d] = await call('/api/admin/scan', { method: 'POST', headers: { authorization: 'Bearer ' + noClaimJwt }, body: JSON.stringify({ token: token1 }) });
    ok(s === 403 && /صلاحية/.test(d.error || ''), 'حساب بلا صلاحيات مرفوض');

    /* 6f) playersAdmin returns the QR identity fields */
    [s, d] = await call('/api/admin/players?academy=football', { headers: { authorization: 'Bearer ' + coachJwt } });
    ok(s === 200 && Array.isArray(d) && d[0].barcodeToken === token1 && d[0].guardianPhone === '01012345678', 'قائمة اللاعبين تعيد التوكن نفسه وهاتف الولي');
    ok(d[0].barcodeActive === true && d[0].barcodeRevision === 1, 'حالة البطاقة ورقم الإصدار متاحان للإدارة');

    /* 6g) revoke → scan rejected */
    [s, d] = await call('/api/admin/qr-manage', { method: 'POST', headers: { authorization: 'Bearer ' + coachJwt }, body: JSON.stringify({ academy: 'football', playerId: 'p1', action: 'revoke' }) });
    ok(s === 200 && d.ok, 'إيقاف البطاقة نجح');
    [s, d] = await call('/api/admin/scan', { method: 'POST', headers: { authorization: 'Bearer ' + coachJwt }, body: JSON.stringify({ token: token1 }) });
    ok(s === 400 && /غير مسجل|موقوفة|ملغاة|إيقافه/.test(d.error || ''), 'مسح بطاقة موقوفة يُرفض');

    /* 6h) regenerate → new secure token, old one dead */
    [s, d] = await call('/api/admin/qr-manage', { method: 'POST', headers: { authorization: 'Bearer ' + coachJwt }, body: JSON.stringify({ academy: 'football', playerId: 'p1', action: 'regenerate' }) });
    ok(s === 200 && d.ok && d.barcode.token && d.barcode.token !== token1, 'التجديد يصدر توكنًا جديدًا مختلفًا');
    ok(d.barcode.revision === 2 && d.barcode.barcodeId === d.barcode.barcodeId, 'نفس رقم الهوية الدائم مع إصدار أعلى');
    const token2 = d.barcode.token;
    [s, d] = await call('/api/admin/scan', { method: 'POST', headers: { authorization: 'Bearer ' + coachJwt }, body: JSON.stringify({ token: token1 }) });
    ok(s === 400 && /غير مسجل|إيقافه/.test(d.error || ''), 'التوكن القديم لا يُقبل بعد التجديد');

    /* 6i) manual attendance API still works (sessions-aware, keeps history) */
    [s, d] = await call('/api/admin/attendance', { method: 'POST', headers: { authorization: 'Bearer ' + coachJwt }, body: JSON.stringify({ academy: 'football', playerId: 'p1', action: 'checkout' }) });
    ok(s === 200 && d.ok && d.session.sessions && d.session.sessions[0].out, 'التسجيل اليدوي للخروج يعمل ويغلق الجلسة المفتوحة دون فقدان السجل');

    /* 6j) attendance history keeps the day's sessions with staff identity */
    [s, d] = await call('/api/admin/attendance-history?academy=football&playerId=p1&days=1', { headers: { authorization: 'Bearer ' + coachJwt } });
    ok(s === 200 && d.ok && d.out.length === 1, 'السجل التاريخي يعيد اليوم');
    const sess = d.out[0].sessions;
    ok(sess.length >= 1 && sess[0].checkOutAt && sess[0].byEmail === 'football@ahmadiya.online', 'كل جلسات اليوم محفوظة مع هوية المسجل');

    /* 6k) transfer player to karate with center admin — same identity preserved.
       The admin first adds the player record in the target academy dashboard,
       then the QR identity + guardian link follow without duplication. */
    PLAYERS.karate.p1 = { id: 'p1', name: 'لاعب كرة القدم', photo: '', age: 12 };
    [s, d] = await call('/api/admin/transfer-player', { method: 'POST', headers: { authorization: 'Bearer ' + centerJwt }, body: JSON.stringify({ fromAcademy: 'football', toAcademy: 'karate', playerId: 'p1' }) });
    ok(s === 200 && d.ok && d.barcodeId, 'نقل اللاعب بين الأكاديميات من لوحة المركز نجح');
    const moved = await doStore.fetch('https://store/get?key=' + encodeURIComponent('att:barcode-player:karate:p1')).then(r => r.json());
    const gone = await doStore.fetch('https://store/get?key=' + encodeURIComponent('att:barcode-player:football:p1')).then(r => r.json());
    ok(moved.value && moved.value.token === token2 && moved.value.academy === 'karate', 'هوية QR نفسها انتقلت للأكاديمية الجديدة');
    ok(!gone.value, 'الفهرس القديم أُزيل (لا ازدواج)');
    [s, d] = await call('/api/admin/scan', { method: 'POST', headers: { authorization: 'Bearer ' + karateJwt }, body: JSON.stringify({ token: token2 }) });
    ok(s === 200 && d.ok === true && d.academy === 'karate', 'مسح الرمز بعد النقل يسجل الحضور للأكاديمية الجديدة');

    /* 6l) audit logs visible to center admin */
    [s, d] = await call('/api/admin/audit-logs?limit=50', { headers: { authorization: 'Bearer ' + centerJwt } });
    ok(s === 200 && d.items.some(x => x.kind === 'scan') && d.items.some(x => x.kind === 'regenerate'), 'سجل التدقيق يوثق المسح والتجديد');
    ok(d.items.every(x => x.staffEmail || x.staff), 'كل عنصر تدقيق يحمل هوية المنفذ');
    [s, d] = await call('/api/admin/audit-logs', { headers: { authorization: 'Bearer ' + karateJwt } });
    ok(s === 403, 'سجل التدقيق للإدارة المركزية فقط');

    globalThis.fetch = realFetch;
  }

  console.log(`\nالنتيجة: ${pass} نجح، ${fail} فشل`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(1); });
