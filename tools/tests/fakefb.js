// قاعدة Firebase وهمية في الذاكرة (compat API مصغّر) لاختبار المنطق فقط
module.exports = function makeFirebase(opts = {}) {
  const store = {};
  const listeners = {};
  const get = (path) => path.split('/').filter(Boolean).reduce((n, k) => (n == null ? n : n[k]), store);
  const setAt = (path, val) => {
    const keys = path.split('/').filter(Boolean);
    if (!keys.length) { Object.keys(store).forEach(k => delete store[k]); Object.assign(store, val || {}); return; }
    let n = store;
    keys.slice(0, -1).forEach(k => { if (n[k] == null || typeof n[k] !== 'object') n[k] = {}; n = n[k]; });
    if (val === null || val === undefined) delete n[keys[keys.length - 1]]; else n[keys[keys.length - 1]] = JSON.parse(JSON.stringify(val));
  };
  const snap = (path) => { const v = get(path); return { exists: () => v != null, val: () => (v == null ? null : JSON.parse(JSON.stringify(v))), key: path.split('/').pop() }; };
  const notify = (path) => {
    Object.keys(listeners).forEach(p => {
      if (p === path || p.startsWith(path + '/') || path.startsWith(p + '/') || path === '') listeners[p].slice().forEach(cb => cb(snap(p)));
    });
  };
  const ref = (path = '') => ({
    once: async () => snap(path),
    on(ev, cb) { (listeners[path] = listeners[path] || []).push(cb); setTimeout(() => cb(snap(path)), 0); return cb; },
    off(ev, cb) { listeners[path] = (listeners[path] || []).filter(x => x !== cb); },
    async set(v) { opts.onWrite && opts.onWrite('set', path); setAt(path, v); notify(path); },
    async remove() { setAt(path, null); notify(path); },
    async update(obj) {
      opts.onWrite && opts.onWrite('update', path, obj);
      Object.entries(obj).forEach(([k, v]) => setAt((path ? path + '/' : '') + k, v));
      Object.keys(obj).forEach(k => notify((path ? path + '/' : '') + k));
    }
  });
  const users = opts.users || {};
  let current = null; const authCbs = [];
  const auth = {
    get currentUser() { return current; },
    async signInWithEmailAndPassword(email, pw) {
      const u = users[email];
      if (!u || u.pw !== pw) { const e = new Error('bad'); e.code = 'auth/invalid-credential'; throw e; }
      current = { email, getIdTokenResult: async () => ({ claims: u.claims || {} }) };
      authCbs.forEach(c => c(current));
      return { user: current };
    },
    async signOut() { current = null; authCbs.forEach(c => c(null)); },
    onAuthStateChanged(cb) { authCbs.push(cb); setTimeout(() => cb(current), 0); return () => { const i = authCbs.indexOf(cb); if (i >= 0) authCbs.splice(i, 1); }; }
  };
  const apps = [];
  const firebase = {
    apps,
    initializeApp(cfg, name) { const a = { name, database: () => ({ ref }), auth: () => auth }; apps.push(a); return a; },
    database: {}, auth: () => auth
  };
  firebase.auth.Auth = {};
  return { firebase, store, setAt, get };
};
