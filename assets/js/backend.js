// Povezava spletne strani z zaledjem (Google Apps Script). Izvozi enak vmesnik kot nekdanja Firebase povezava,
// zato ostala koda strani ostane nespremenjena. Podatke "poslušamo" z občasnim spraševanjem (polling).
let url = null;
export const state = { ready: false, configMissing: false, error: null };
let token = null, user = null, claims = {}, offset = 0;
const listeners = new Set();
const watchers = new Map(); // pot -> Set<{cb,onErr}>
const cache = new Map();    // pot -> {h,v}
let presenceInv = null, inflight = false, again = false, loop = null;
const LS = 'tlh.session';

const store = {
  get() { try { return JSON.parse(localStorage.getItem(LS)); } catch (_) { return null; } },
  set(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (_) { /* brez shranjevanja */ } },
  clear() { try { localStorage.removeItem(LS); } catch (_) { /* nič */ } },
};

async function api(req) {
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req) });
  } catch (_) { const e = new Error('Strežnik trenutno ni dosegljiv. Preverite povezavo in poskusite znova.'); e.code = 'unavailable'; throw e; }
  let data;
  try { data = await res.json(); } catch (_) { const e = new Error('Strežnik je vrnil neveljaven odgovor. Poskusite znova.'); e.code = 'unavailable'; throw e; }
  return data;
}

export async function initFirebase() {
  if (state.ready) return state;
  let cfg;
  try { cfg = await import('./config.js'); } catch (_) { state.configMissing = true; state.error = 'Datoteka config.js manjka.'; return state; }
  url = cfg.BACKEND_URL;
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[-\w]+\/exec$/.test(url)) { state.configMissing = true; state.error = 'V datoteki config.js ni pravilnega naslova zaledja (BACKEND_URL).'; return state; }
  const saved = store.get();
  if (saved && saved.token) {
    token = saved.token;
    try {
      const r = await api({ op: 'sync', token, paths: [] });
      if (r.ok && r.session) { user = { uid: saved.uid, email: saved.email }; claims = saved.claims || {}; startLoop(); } else { token = null; store.clear(); }
    } catch (_) { user = { uid: saved.uid, email: saved.email }; claims = saved.claims || {}; startLoop(); } // brez povezave: obdrži sejo
  }
  state.ready = true;
  return state;
}

export const serverNow = () => Date.now() + offset;
export const currentUser = () => user;
export async function getClaims() { return claims; }
export function onAuth(cb) { listeners.add(cb); Promise.resolve().then(() => { if (listeners.has(cb)) cb(user); }); return () => listeners.delete(cb); }
const emit = () => listeners.forEach((cb) => { try { cb(user); } catch (e) { console.error(e); } });

function startLoop() {
  if (loop) return;
  const tick = async () => { await poll(); loop = setTimeout(tick, document.hidden ? 8000 : 2000); };
  loop = setTimeout(tick, 100);
}
function stopLoop() { if (loop) clearTimeout(loop); loop = null; }
function signedOut() { token = null; user = null; claims = {}; cache.clear(); store.clear(); stopLoop(); emit(); }

export async function signIn(email, password) {
  let r;
  try { r = await api({ op: 'login', email, password }); } catch (e) { e.code = 'auth/network-request-failed'; throw e; }
  if (!r.ok) { const e = new Error(r.message || 'Prijava ni uspela.'); e.code = r.code || 'auth/invalid-credential'; throw e; }
  token = r.token; user = { uid: r.uid, email: r.email }; claims = r.claims || {}; cache.clear();
  store.set({ token, uid: r.uid, email: r.email, claims });
  startLoop(); emit();
}
export async function signOutUser() {
  const t = token; signedOut();
  if (t) { try { await api({ op: 'logout', token: t }); } catch (_) { /* seja poteče sama */ } }
}
export async function changePassword(oldPassword, newPassword) {
  const r = await api({ op: 'changePassword', token, oldPassword, newPassword });
  if (!r.ok) { const e = new Error(r.message); e.code = r.code; throw e; }
}

async function poll() {
  if (!token) return;
  if (inflight) { again = true; return; }
  inflight = true;
  try {
    const paths = [...watchers.keys()]; const hashes = {};
    for (const p of paths) if (cache.has(p)) hashes[p] = cache.get(p).h;
    const t0 = Date.now();
    const r = await api({ op: 'sync', token, paths, hashes, presence: presenceInv });
    const t1 = Date.now();
    if (!r.ok) return;
    if (!r.session) { signedOut(); return; }
    offset = r.t - (t0 + t1) / 2;
    for (const [p, val] of Object.entries(r.values || {})) {
      const ws = watchers.get(p); if (!ws) continue;
      if (val.denied) { ws.forEach((w) => { if (w.onErr) w.onErr({ code: 'permission-denied' }); }); continue; }
      cache.set(p, { h: val.h, v: val.v });
      ws.forEach((w) => w.cb(val.v));
    }
  } catch (_) { /* začasna napaka omrežja: poskusimo znova ob naslednjem krogu */ } finally {
    inflight = false;
    if (again) { again = false; poll(); }
  }
}

export function watch(path, cb, onErr) {
  const w = { cb, onErr };
  if (!watchers.has(path)) watchers.set(path, new Set());
  watchers.get(path).add(w);
  if (cache.has(path)) { const v = cache.get(path).v; setTimeout(() => { if (watchers.get(path) && watchers.get(path).has(w)) cb(v); }, 0); }
  setTimeout(poll, 30);
  return () => { const s = watchers.get(path); if (s) { s.delete(w); if (!s.size) { watchers.delete(path); cache.delete(path); } } };
}
export async function getOnce(path) {
  const r = await api({ op: 'sync', token, paths: [path] });
  if (!r.ok || !r.session) { const e = new Error('Seja je potekla. Prijavite se znova.'); e.code = 'unauthenticated'; throw e; }
  const v = r.values[path]; if (!v || v.denied) { const e = new Error('Za to dejanje nimate pravic.'); e.code = 'permission-denied'; throw e; }
  return v.v;
}

export function startPresence(invId) { presenceInv = invId; setTimeout(poll, 30); return invId; }
export function stopPresence(invId) { if (presenceInv === invId) presenceInv = null; }

export async function call(name, data = {}) {
  let r;
  try { r = await api({ op: 'call', token, name, data }); } catch (e) { throw e; }
  if (!r.ok) {
    if (r.code === 'unauthenticated' && token) signedOut();
    const e = new Error(r.message || 'Neznana napaka.'); e.code = r.code || ''; e.details = r.details; throw e;
  }
  setTimeout(poll, 20);
  return r.data;
}

export function authErrorText(e) {
  const c = String(e.code || '');
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return 'Uporabniško ime ali geslo ni pravilno.';
  if (/user-disabled/.test(c)) return 'Ta račun je onemogočen (zavrnjen ali suspendiran). Obrnite se na administratorja.';
  if (/resource-exhausted/.test(c)) return 'Preveč poskusov prijave. Počakajte nekaj minut.';
  if (/network|unavailable/.test(c)) return 'Strežnik ni dosegljiv. Preverite povezavo.';
  return 'Prijava ni uspela. Poskusite znova.';
}
