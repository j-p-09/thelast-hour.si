// Glavna aplikacija igralca: zagon, stanje prijave, usmerjevalnik.
import { initFirebase, state as fb, onAuth, watch, signOutUser } from './backend.js';
import { h, clear, icon, logo, sound, soundSettings, toast, spinner } from './ui.js';
import { screens } from './screens-public.js';
import { playerScreens } from './screens-player.js';
import { roomScreen } from './investigation.js';

export const S = { user: null, profile: null, profileLoaded: false, activeId: null, cleanup: [], caseData: null };
const root = document.getElementById('app');
let unsubs = [];
let current = { cleanup: null };

export async function loadCase() {
  if (!S.caseData) S.caseData = await (await fetch('assets/data/case-public.json')).json();
  return S.caseData;
}

export const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

function shell(content, { bare = false, wide = false } = {}) {
  clear(root);
  const loggedIn = !!S.user;
  const approved = S.profile && S.profile.status === 'APPROVED';
  if (!bare) {
    root.append(
      h('a', { class: 'skip', href: '#main' }, 'Preskoči na vsebino'),
      h('header', { class: 'topbar' },
        h('a', { class: 'logo', href: '#/', 'aria-label': 'THE LAST HOUR, domov' }, logo()),
        h('nav', { 'aria-label': 'Glavna navigacija' },
          approved ? [h('a', { class: 'btn ghost small', href: '#/nadzorna-plosca' }, 'Nadzorna plošča'), h('a', { class: 'btn ghost small', href: '#/profil' }, 'Profil')] : null,
          S.activeId && approved ? h('a', { class: 'btn small primary', href: `#/ppot` , onclick: (e) => { e.preventDefault(); resumeActive(); } }, 'Nadaljuj preiskavo') : null,
          h('button', { class: 'iconbtn', 'aria-label': 'Nastavitve zvoka in glasbe', title: 'Zvok in glasba', onclick: (e) => { const b = e.currentTarget; soundSettings(() => b.replaceChildren(icon(sound.on ? 'sound' : 'mute'))); } }, icon(sound.on ? 'sound' : 'mute')),
          loggedIn ? [h('span', { class: 'muted', style: 'font-size:13px' }, S.profile ? S.profile.username : ''), h('button', { class: 'btn ghost small', onclick: async () => { await signOutUser(); } }, 'Odjava')] : h('a', { class: 'btn small', href: '#/prijava' }, 'Vstop v sistem')))
    );
  }
  const main = h('main', { id: 'main', class: 'view-enter', tabindex: '-1' }, content);
  root.append(main);
  if (!bare) root.append(h('footer', { class: 'footer' }, 'THE LAST HOUR · Vsi liki, ustanove in dogodki so izmišljeni. ', h('a', { href: 'administrator.html' }, 'Administratorski dostop')));
  return main;
}

async function resumeActive() {
  if (!S.activeId) return;
  go(`#/preiskava/${S.activeId}`);
}

function configScreen() {
  shell(h('div', { class: 'page page--mid' }, h('div', { class: 'card' },
    h('div', { class: 'kicker' }, 'Namestitev'), h('h1', null, 'Igra še ni povezana z zaledjem'),
    h('p', null, fb.error || 'Konfiguracija manjka.'),
    h('p', null, 'Lastnik mora v datoteko ', h('code', { class: 'mono' }, 'assets/js/config.js'), ' vpisati naslov zaledja (BACKEND_URL). Navodila: NAVODILA.md.'))), { bare: true });
}

const ROUTES = [
  { re: /^\/$/, auth: 'any', fn: (m) => screens.home() },
  { re: /^\/o-igri$/, auth: 'any', fn: () => screens.about() },
  { re: /^\/prijava$/, auth: 'out', fn: () => screens.login() },
  { re: /^\/registracija$/, auth: 'out', fn: () => screens.register() },
  { re: /^\/cakanje$/, auth: 'in', fn: () => screens.pending() },
  { re: /^\/nadzorna-plosca$/, auth: 'approved', fn: () => playerScreens.dashboard() },
  { re: /^\/profil$/, auth: 'approved', fn: () => playerScreens.profile() },
  { re: /^\/lobby\/([-\w]+)$/, auth: 'approved', fn: (m) => playerScreens.lobby(m[1]) },
  { re: /^\/preiskava\/([-\w]+)$/, auth: 'approved', fn: (m) => roomScreen(m[1]) },
  { re: /^\/rezultat\/([-\w]+)$/, auth: 'approved', fn: (m) => playerScreens.result(m[1]) },
];

export async function route() {
  if (current.cleanup) { try { current.cleanup(); } catch (_) { /* nič */ } current.cleanup = null; }
  const path = (location.hash || '#/').slice(1) || '/';
  const r = ROUTES.map((x) => ({ x, m: path.match(x.re) })).find((q) => q.m);
  if (!fb.ready) return configScreen();
  if (S.user && !S.profileLoaded) { shell(spinner('Preverjam detektivsko identiteto …'), { bare: true }); return; }
  if (!r) return shell(h('div', { class: 'page page--narrow' }, h('div', { class: 'card' }, h('h1', null, 'Stran ni najdena'), h('p', null, 'Ta naslov v sistemu ne obstaja.'), h('a', { class: 'btn', href: '#/' }, 'Nazaj na začetek'))));
  const st = S.profile && S.profile.status;
  const approved = st === 'APPROVED';
  const { auth } = r.x;
  if (auth === 'in' && !S.user) return go('#/prijava');
  if (auth === 'approved' && !S.user) return go('#/prijava');
  if (auth === 'approved' && !approved) return go('#/cakanje');
  if (auth === 'out' && S.user) return go(approved ? '#/nadzorna-plosca' : '#/cakanje');
  if (auth === 'in' && approved) return go('#/nadzorna-plosca');
  if (S.user && !approved && path !== '/cakanje' && path !== '/o-igri' && path !== '/') return go('#/cakanje');
  const out = await r.x.fn(r.m);
  if (typeof out === 'function') current.cleanup = out;
  window.scrollTo(0, 0);
}

export { shell };

function startAuthWatching() {
  onAuth((user) => {
    unsubs.forEach((u) => { try { u(); } catch (_) { /* nič */ } }); unsubs = [];
    S.user = user; S.profile = null; S.profileLoaded = false; S.activeId = null;
    if (!user) { S.profileLoaded = true; route(); return; }
    let first = true;
    unsubs.push(watch(`users/${user.uid}`, (p) => {
      const prev = S.profile && S.profile.status;
      S.profile = p; S.profileLoaded = true;
      if (prev && p && prev !== p.status) {
        if (p.status === 'APPROVED') { toast('Vaša detektivska identiteta je odobrena. Dobrodošli!', 'ok'); sound.ping(); }
        if (p.status === 'SUSPENDED') toast('Vaš račun je bil suspendiran.', 'err');
      }
      if (first || (prev !== (p && p.status))) route();
      first = false;
    }, () => { S.profileLoaded = true; route(); }));
    unsubs.push(watch(`userActive/${user.uid}`, (id) => { const changed = S.activeId !== id; S.activeId = id || null; if (changed && S.profileLoaded && /^#\/(nadzorna-plosca|profil)?$/.test(location.hash || '#/')) route(); }));
  });
}

(async function boot() {
  await initFirebase();
  window.addEventListener('hashchange', route);
  if (!fb.ready) return configScreen();
  startAuthWatching();
})();
