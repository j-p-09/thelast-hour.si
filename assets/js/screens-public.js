// Javni zasloni: začetni zaslon, o igri, prijava, registracija, čakanje na odobritev.
import { shell, go, S, loadCase } from './app.js';
import { h, icon, logo, busyButton, STATUS_SL, fmtDate, toast, sound } from './ui.js';
import { call, signIn, signOutUser, authErrorText } from './backend.js';
import { archiveScene } from './art.js';
import { usernameToEmail, normUsername } from './identity.js';

function clockRing() {
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, r1 = i % 5 === 0 ? 44 : 47, r2 = 50;
    ticks.push(h('line', { x1: 50 + Math.sin(a) * r1, y1: 50 - Math.cos(a) * r1, x2: 50 + Math.sin(a) * r2, y2: 50 - Math.cos(a) * r2, stroke: '#EAE9E3', 'stroke-width': i % 5 === 0 ? 0.8 : 0.3 }));
  }
  return h('svg', { class: 'clock-ring', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, h('circle', { cx: 50, cy: 50, r: 49, fill: 'none', stroke: '#B33A45', 'stroke-width': 0.4 }), ticks);
}

function home() {
  let intro = null;
  try { if (!sessionStorage.getItem('tlh.intro')) { sessionStorage.setItem('tlh.intro', '1'); intro = true; } } catch (_) { intro = false; }
  const view = h('div', null,
    intro ? h('div', { class: 'intro', 'aria-hidden': 'true', onclick: (e) => e.currentTarget.remove() }, h('div', { class: 'intro__in' }, logo(true), h('h1', null, 'THE LAST HOUR'), h('p', null, '60 minut do resnice'))) : null,
    h('section', { class: 'hero' }, h('div', { class: 'hero__scene' }, archiveScene()), clockRing(),
      h('div', null, logo(true),
        h('h1', null, 'THE LAST HOUR'), h('div', { class: 'sub' }, '60 MINUT DO RESNICE'),
        h('p', { class: 'tag' }, '»En primer. Ena ura. Nobenega prostora za napake.«'),
        h('div', { class: 'actions' },
          h('a', { class: 'btn primary', href: '#/prijava' }, 'Vstop v sistem'),
          h('a', { class: 'btn', href: '#/registracija' }, 'Registracija detektiva'),
          h('a', { class: 'btn ghost', href: '#/o-igri' }, 'O igri')))));
  shell(view);
}

async function about() {
  const c = await loadCase();
  shell(h('div', { class: 'page page--mid' },
    h('div', { class: 'kicker' }, 'O igri'), h('h1', null, 'THE LAST HOUR'),
    h('p', { class: 'muted' }, 'Zahtevna spletna kriminalistična uganka za enega do tri detektive. En primer, ena ura.'),
    h('div', { class: 'card', style: 'margin-bottom:16px' }, h('h2', null, c.meta.title), h('p', { class: 'muted' }, c.meta.subtitle), c.meta.briefing.map((t) => h('p', null, t))),
    h('div', { class: 'card', style: 'margin-bottom:16px' }, h('h2', null, 'Pravila'), h('ul', null, c.meta.rules.map((t) => h('li', null, t)))),
    h('div', { class: 'card' }, h('h2', null, 'Kako poteka'),
      h('ol', null, ['Registrirate se kot detektiv in počakate na odobritev administratorja.', 'Ustvarite sobo (sami ali z ekipo do treh) in pošljete kodo za povabilo.', 'Ko gostitelj začne preiskavo, se odštevanje začne in se ne ustavi.', 'Preiskujete dokaze, zaslišujete osumljence, rešujete uganke in sestavljate sliko na tabli.', 'Ko rešite zadnjo uganko (ali ko ostane manj kot 10 minut), lahko oddate končno obtožbo.'].map((t) => h('li', null, t)))),
    h('p', { style: 'margin-top:20px' }, h('a', { class: 'btn primary', href: '#/registracija' }, 'Postani detektiv'))));
}

function authCard(title, kicker, form, foot) {
  return h('div', { class: 'page page--narrow' }, h('div', { style: 'text-align:center;margin-bottom:18px' }, logo(true)),
    h('div', { class: 'card card--glow' }, h('div', { class: 'kicker' }, kicker), h('h1', { style: 'font-size:28px' }, title), form), foot ? h('p', { style: 'text-align:center;margin-top:16px' }, foot) : null);
}

function login() {
  const err = h('div', { class: 'err', hidden: true, role: 'alert' });
  const u = h('input', { id: 'u', name: 'username', autocomplete: 'username', required: true, maxlength: 20, placeholder: 'npr. Detektiv_Marko' });
  const p = h('input', { id: 'p', name: 'password', type: 'password', autocomplete: 'current-password', required: true, maxlength: 72 });
  const btn = h('button', { class: 'btn primary', type: 'submit', style: 'width:100%' }, 'Vstop v sistem');
  const form = h('form', { novalidate: true }, err,
    h('div', { class: 'field' }, h('label', { for: 'u' }, 'Uporabniško ime'), u),
    h('div', { class: 'field' }, h('label', { for: 'p' }, 'Geslo'), p), btn,
    h('p', { class: 'hint', style: 'margin-top:14px' }, 'Pozabljeno geslo? Obnovitev poteka prek administratorja: ob prijavi ga prosite za začasno geslo.'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    if (!u.value.trim() || !p.value) { err.textContent = 'Vnesite uporabniško ime in geslo.'; err.hidden = false; return; }
    btn.disabled = true; btn.classList.add('is-busy');
    try {
      await signIn(await usernameToEmail(normUsername(u.value)), p.value);
      toast('Prijava uspešna.', 'ok', 2500);
    } catch (ex) { err.textContent = authErrorText(ex); err.hidden = false; btn.disabled = false; btn.classList.remove('is-busy'); }
  });
  shell(authCard('Vstop v sistem', 'Zaupni dostop', form, h('span', null, 'Nimate računa? ', h('a', { href: '#/registracija' }, 'Registracija detektiva'))));
  u.focus();
}

function register() {
  const err = h('div', { class: 'err', hidden: true, role: 'alert' });
  const f = {
    u: h('input', { id: 'ru', autocomplete: 'username', required: true, maxlength: 20 }),
    b: h('input', { id: 'rb', required: true, maxlength: 12, placeholder: 'npr. DET-0417', style: 'text-transform:uppercase' }),
    p: h('input', { id: 'rp', type: 'password', autocomplete: 'new-password', required: true, maxlength: 72 }),
    p2: h('input', { id: 'rp2', type: 'password', autocomplete: 'new-password', required: true, maxlength: 72 }),
  };
  const btn = h('button', { class: 'btn primary', type: 'submit', style: 'width:100%' }, 'Pošlji prijavo');
  const form = h('form', { novalidate: true }, err,
    h('div', { class: 'field' }, h('label', { for: 'ru' }, 'Uporabniško ime'), f.u, h('span', { class: 'hint' }, '3–20 znakov: črke, številke, _ ali -. Prikazano bo v igri.')),
    h('div', { class: 'field' }, h('label', { for: 'rb' }, 'BADGE NUMBER'), f.b, h('span', { class: 'hint' }, 'Vaša služba oznaka v igri (3–12 znakov: velike črke, številke, -). Sam ne omogoča prijave.')),
    h('div', { class: 'field' }, h('label', { for: 'rp' }, 'Geslo'), f.p, h('span', { class: 'hint' }, 'Vsaj 8 znakov, z vsaj eno črko in eno številko.')),
    h('div', { class: 'field' }, h('label', { for: 'rp2' }, 'Ponovitev gesla'), f.p2), btn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.hidden = true;
    const bad = (t) => { err.textContent = t; err.hidden = false; };
    const un = f.u.value.normalize('NFKC').trim();
    if (!/^[\p{L}\p{N}_-]{3,20}$/u.test(un)) return bad('Uporabniško ime mora imeti 3–20 znakov (črke, številke, _ ali -).');
    if (!/^[A-Z0-9-]{3,12}$/.test(f.b.value.trim().toUpperCase())) return bad('BADGE NUMBER mora imeti 3–12 znakov (velike črke, številke ali -).');
    if (f.p.value.length < 8 || !/[A-Za-zČŠŽčšž]/.test(f.p.value) || !/\d/.test(f.p.value)) return bad('Geslo mora imeti vsaj 8 znakov, vsaj eno črko in eno številko.');
    if (f.p.value !== f.p2.value) return bad('Gesli se ne ujemata.');
    btn.disabled = true; btn.classList.add('is-busy');
    try {
      await call('registerDetective', { username: un, badge: f.b.value.trim(), password: f.p.value });
      await signIn(await usernameToEmail(normUsername(un)), f.p.value);
      toast('Prijava je poslana. Počakajte na odobritev administratorja.', 'ok');
    } catch (ex) { bad(ex.message); btn.disabled = false; btn.classList.remove('is-busy'); }
  });
  shell(authCard('Registracija detektiva', 'Nova identiteta', form, h('span', null, 'Že imate račun? ', h('a', { href: '#/prijava' }, 'Vstop v sistem'))));
  f.u.focus();
}

function pending() {
  const p = S.profile || {};
  const st = p.status;
  const msg = st === 'REJECTED' ? 'Vaša registracija je bila zavrnjena.' : st === 'SUSPENDED' ? 'Vaš račun je suspendiran. Preiskave ne morete začeti.' : 'Tvoja detektivska identiteta čaka na odobritev administratorja.';
  shell(h('div', { class: 'page page--narrow' },
    h('div', { class: 'card card--glow' },
      h('div', { class: 'kicker' }, st === 'PENDING_APPROVAL' ? 'Čakanje' : 'Stanje računa'), h('h1', { style: 'font-size:26px' }, msg),
      h('p', { class: 'muted' }, st === 'PENDING_APPROVAL' ? 'Stran se samodejno osveži, ko administrator odloči. Do takrat preiskave ne morete začeti.' : 'Za več informacij se obrnite na administratorja.'),
      h('dl', { class: 'idcard', style: 'display:grid;grid-template-columns:auto 1fr;padding:16px;margin:16px 0' },
        h('dt', null, 'Uporabniško ime'), h('dd', null, p.username || '–'),
        h('dt', null, 'BADGE NUMBER'), h('dd', { class: 'mono' }, p.badge || '–'),
        h('dt', null, 'Status računa'), h('dd', null, h('span', { class: `pill ${st === 'PENDING_APPROVAL' ? 'pill--warn' : 'pill--bad'}` }, STATUS_SL[st] || st)),
        h('dt', null, 'Datum registracije'), h('dd', null, fmtDate(p.createdAt))),
      h('button', { class: 'btn', onclick: () => signOutUser().then(() => go('#/')) }, 'Odjava'))));
}

export const screens = { home, about, login, register, pending };
