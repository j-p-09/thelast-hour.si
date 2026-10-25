// Zasloni igralca: nadzorna plošča, profil, čakalnica, rezultat.
import { shell, go, S, loadCase } from './app.js';
import { h, clear, icon, busyButton, toast, modal, confirmBox, sound, spinner, copyText, download, b64ToBlob, fmtDate, fmtDateTime, fmtDur, STATUS_SL, OUTCOME_SL, MODE_SL, rankFor, plural } from './ui.js';
import { call, watch, startPresence, stopPresence, changePassword } from './backend.js';
import { portrait, floorPlan, caseFolder } from './art.js';

const BADGES = [
  ['PRVA PREISKAVA', 'Zaključena prva preiskava (uspešna ali ne).', 'shield'],
  ['BREZ NAMIGOV', 'Uspešen pobeg brez uporabe namigov.', 'hint'],
  ['OSTRO OKO', 'Uspešen pobeg brez napačne obtožbe.', 'eye'],
  ['ZADNJA MINUTA', 'Uspešen pobeg v zadnji minuti.', 'clock'],
  ['POPOLNA REKONSTRUKCIJA', 'Pravilno odločilno protislovje in ključni dokazi.', 'star'],
];

function idCard(profile) {
  const s = profile.stats || {};
  return h('div', { class: 'idcard' },
    h('div', { class: 'idcard__photo', 'aria-hidden': 'true' }, icon('user', 44)),
    h('div', null, h('div', { class: 'kicker' }, 'Digitalna detektivska izkaznica'), h('p', { class: 'idcard__name' }, profile.username),
      h('dl', null, h('dt', null, 'BADGE'), h('dd', { class: 'mono' }, profile.badge), h('dt', null, 'Rang'), h('dd', null, rankFor(s)),
        h('dt', null, 'Registriran'), h('dd', null, fmtDate(profile.createdAt)), h('dt', null, 'Status'), h('dd', null, h('span', { class: 'pill pill--ok' }, STATUS_SL[profile.status])))));
}
function statsRow(profile) {
  const s = profile.stats || {};
  const avg = s.escapes ? fmtDur(s.totalSolveSec / s.escapes) : '–';
  const cell = (v, l) => h('div', { class: 'stat' }, h('b', null, String(v)), h('span', null, l));
  return h('div', { class: 'grid c4' }, cell(s.investigations || 0, 'Preiskav'), cell(s.escapes || 0, 'Uspešnih pobegov'), cell(s.failures || 0, 'Neuspešnih'), cell(avg, 'Povprečni čas (uspešne)'));
}
function historyList(rows) {
  if (!rows || !Object.keys(rows).length) return h('p', { class: 'muted' }, 'Še nimate zaključenih preiskav.');
  const list = Object.values(rows).sort((a, b) => b.startedAt - a.startedAt);
  return h('div', { class: 'tablewrap' }, h('table', { class: 'data' }, h('thead', null, h('tr', null, ['Datum', 'Način', 'Rezultat', 'Čas', 'Točke', ''].map((t) => h('th', null, t)))),
    h('tbody', null, list.map((r) => h('tr', null,
      h('td', null, fmtDateTime(r.startedAt)), h('td', null, MODE_SL[r.mode] || r.mode),
      h('td', null, h('span', { class: `pill ${r.outcome === 'success' ? 'pill--ok' : 'pill--bad'}` }, OUTCOME_SL[r.outcome] || r.outcome)),
      h('td', null, fmtDur(r.durationSec)), h('td', null, r.outcome === 'success' ? `${r.score} (${r.rank})` : '–'),
      h('td', null, h('a', { class: 'btn small ghost', href: `#/rezultat/${r.id}` }, 'Odpri')))))));
}

async function dashboard() {
  const c = await loadCase();
  const body = h('div', { class: 'page' });
  const hist = h('div', null, spinner());
  const activeBox = h('div');
  const codeIn = h('input', { id: 'code', maxlength: 6, placeholder: 'KODA', autocomplete: 'off', style: 'text-transform:uppercase;letter-spacing:.3em;text-align:center;font-family:var(--font-mono)' });
  const err = h('div', { class: 'err', hidden: true, role: 'alert' });
  const showErr = (m) => { err.textContent = m; err.hidden = false; };

  const soloBtn = busyButton(h('button', { class: 'btn primary' }, 'Začni solo preiskavo'), async () => {
    err.hidden = true;
    const accessCode = await confirmStart(c, 'solo'); if (!accessCode) return;
    try { const r = await call('createInvestigation', { solo: true, accessCode }); if (!r.resumed || r.status === 'lobby') await call('startInvestigation', { id: r.id, accessCode }); go(`#/preiskava/${r.id}`); } catch (e) { showErr(e.message); }
  });
  const teamBtn = busyButton(h('button', { class: 'btn' }, 'Ustvari preiskovalno sobo'), async () => {
    err.hidden = true;
    try { const r = await call('createInvestigation'); go(`#/lobby/${r.id}`); } catch (e) { showErr(e.message); }
  });
  const joinBtn = busyButton(h('button', { class: 'btn' }, 'Pridruži se'), async () => {
    err.hidden = true;
    try { const r = await call('joinInvestigation', { code: codeIn.value }); go(`#/${r.rejoined ? 'preiskava' : 'lobby'}/${r.id}`); } catch (e) { showErr(e.message); }
  });

  body.append(
    h('div', { class: 'grid c2' }, idCard(S.profile), h('div', null, h('div', { class: 'kicker' }, 'Pregled'), statsRow(S.profile))),
    h('div', { class: 'card card--glow', style: 'margin-top:20px' },
      h('div', { class: 'kicker' }, 'Zaupni primer'), h('h2', null, c.meta.title), h('p', { class: 'muted' }, c.meta.subtitle),
      c.meta.briefing.slice(0, 2).map((t) => h('p', null, t)),
      h('div', { class: 'art-row' }, h('div', { class: 'art-plan-wrap' }, floorPlan()), h('div', { class: 'art-victim' }, portrait('V', 96, c.victim.name), h('b', null, c.victim.name), h('small', { class: 'muted' }, c.victim.job), caseFolder())),
      h('details', null, h('summary', { style: 'cursor:pointer;color:var(--red-3);margin-bottom:10px' }, 'Pravila preiskave'), h('ul', null, c.meta.rules.map((t) => h('li', null, t)))),
      activeBox, err,
      h('div', { class: 'row', style: 'margin-top:16px' }, soloBtn, teamBtn, h('span', { class: 'spacer' }),
        h('div', { class: 'row', style: 'gap:8px' }, h('label', { class: 'sr-only', for: 'code' }, 'Koda za povabilo'), h('div', { style: 'width:150px' }, codeIn), joinBtn))),
    h('h2', { style: 'margin-top:28px' }, 'Zgodovina preiskav'), hist);

  const unsubs = [
    watch(`userInvestigations/${S.user.uid}`, (rows) => { clear(hist).append(historyList(rows)); }),
    watch(`userActive/${S.user.uid}`, async (id) => {
      clear(activeBox);
      if (!id) return;
      activeBox.append(h('div', { class: 'okmsg', style: 'margin-top:12px' }, 'Imate odprto preiskavo. ', h('a', { class: 'btn small primary', href: `#/preiskava/${id}`, onclick: (e) => { e.preventDefault(); go(`#/preiskava/${id}`); } }, 'Nadaljuj preiskavo')));
    }),
  ];
  shell(body);
  return () => unsubs.forEach((u) => u());
}

// Vrne kodo za dostop (niz), če je uporabnik potrdil, sicer null. Brez kode se preiskava ne more začeti.
function confirmStart(c, mode) {
  const code = h('input', { id: 'acode', maxlength: 24, autocomplete: 'off', placeholder: 'npr. ABCD-2345', style: 'text-transform:uppercase;letter-spacing:.15em;font-family:var(--font-mono)' });
  const err = h('div', { class: 'err', hidden: true, role: 'alert' });
  let val = null;
  return new Promise((res) => modal({
    title: 'Pred začetkom preiskave',
    body: h('div', null, h('p', null, 'Ko preiskavo začnete, se odštevanje (60 minut) ne ustavi: osvežitev strani, odklop ali zaprtje brskalnika ga ne ustavijo.'),
      h('ul', null, h('li', null, `Namig stane ${c.meta.hintPenalty} točk, napačna končna obtožba ${c.meta.wrongAccusationPenalty} točk.`), h('li', null, `Končnih obtožb je največ ${c.meta.maxAccusations}.`), h('li', null, 'Sestava ekipe se po začetku zaklene.')),
      err,
      h('div', { class: 'field' }, h('label', { for: 'acode' }, mode === 'solo' ? 'Koda za dostop (Solo detektiv)' : 'Koda za dostop (Skupina detektivov)'), code,
        h('span', { class: 'hint' }, 'Kodo za vsak začetek preiskave dobite od administratorja. To ni koda za povabilo v sobo.'))),
    actions: [{ label: 'Prekliči', value: false }, { label: 'Začni preiskavo', kind: 'primary', onClick: () => { if (!code.value.trim()) { err.textContent = 'Vnesite kodo za dostop.'; err.hidden = false; code.focus(); return false; } val = code.value.trim(); } }],
    onClose: () => res(val),
  }));
}

async function profile() {
  const unsub = watch(`userActive/${S.user.uid}`, () => {});
  const hist = h('div', null, spinner());
  const p = S.profile; const badges = p.badges || {};
  const err = h('div', { class: 'err', hidden: true }); const ok = h('div', { class: 'okmsg', hidden: true });
  const o = h('input', { type: 'password', id: 'op', autocomplete: 'current-password' }), n = h('input', { type: 'password', id: 'np', autocomplete: 'new-password' });
  const pwBtn = busyButton(h('button', { class: 'btn' }, 'Spremeni geslo'), async () => {
    err.hidden = ok.hidden = true;
    if (n.value.length < 8 || !/[A-Za-zČŠŽčšž]/.test(n.value) || !/\d/.test(n.value)) { err.textContent = 'Novo geslo mora imeti vsaj 8 znakov, črko in številko.'; err.hidden = false; return; }
    try { await changePassword(o.value, n.value); ok.textContent = 'Geslo je spremenjeno.'; ok.hidden = false; o.value = n.value = ''; } catch (e) { err.textContent = /wrong|invalid-credential/.test(e.code || '') ? 'Trenutno geslo ni pravilno.' : 'Gesla ni bilo mogoče spremeniti.'; err.hidden = false; }
  });
  shell(h('div', { class: 'page' },
    h('div', { class: 'kicker' }, 'Profil detektiva'), h('h1', null, p.username), idCard(p), h('div', { style: 'margin-top:16px' }, statsRow(p)),
    h('h2', { style: 'margin-top:28px' }, 'Dosežki'),
    h('div', { class: 'grid c3' }, BADGES.map(([name, desc, ic]) => h('div', { class: 'badge' + (badges[name] ? ' is-on' : '') }, h('div', { class: 'badge__ico' }, icon(ic, 20)), h('div', null, h('b', null, name), h('small', { class: 'muted' }, badges[name] ? `Pridobljeno ${fmtDate(badges[name])}` : desc))))),
    h('h2', { style: 'margin-top:28px' }, 'Zgodovina preiskav'), hist,
    h('div', { class: 'card', style: 'margin-top:28px;max-width:460px' }, h('h3', null, 'Sprememba gesla'), err, ok, h('div', { class: 'field' }, h('label', { for: 'op' }, 'Trenutno geslo'), o), h('div', { class: 'field' }, h('label', { for: 'np' }, 'Novo geslo'), n), pwBtn)));
  const u2 = watch(`userInvestigations/${S.user.uid}`, (rows) => { clear(hist).append(historyList(rows)); });
  return () => { unsub(); u2(); };
}

// ---------- čakalnica ----------
async function lobby(id) {
  const c = await loadCase();
  const view = h('div', { class: 'page page--mid' }, spinner('Nalagam sobo …'));
  shell(view);
  let core = null, presence = {};
  const err = h('div', { class: 'err', hidden: true, role: 'alert' });
  const showErr = (m) => { err.textContent = m; err.hidden = false; };
  const pres = startPresence(id, S.user.uid);

  function draw() {
    if (!core) return;
    if (core.status === 'active') return go(`#/preiskava/${id}`);
    if (core.status !== 'lobby') return go('#/nadzorna-plosca');
    const members = Object.entries(core.members || {});
    const isHost = core.hostUid === S.user.uid;
    const startBtn = busyButton(h('button', { class: 'btn primary' }, 'Začni preiskavo'), async () => {
      const accessCode = await confirmStart(c, members.length === 1 ? 'solo' : 'team'); if (!accessCode) return;
      try { await call('startInvestigation', { id, accessCode }); } catch (e) { showErr(e.message); }
    });
    const leaveBtn = busyButton(h('button', { class: 'btn ghost' }, 'Zapusti sobo'), async () => { try { await call('leaveInvestigation', { id }); } catch (e) { /* nič */ } go('#/nadzorna-plosca'); });
    clear(view).append(
      h('div', { class: 'kicker' }, 'Čakalnica'), h('h1', null, 'Preiskovalna soba'),
      h('div', { class: 'card card--glow' },
        h('p', { class: 'muted' }, 'Pošljite kodo prijateljema (največ dva dodatna detektiva). Ko gostitelj začne preiskavo, se sestava ekipe zaklene.'),
        h('div', { class: 'row' }, h('span', { class: 'code', 'aria-label': `Koda za povabilo: ${core.code.split('').join(' ')}` }, core.code),
          h('button', { class: 'btn', onclick: () => copyText(core.code).then(() => toast('Koda je kopirana.', 'ok', 2000), () => toast('Kopiranje ni mogoče; prepišite kodo ročno.', 'warn')) }, icon('copy'), 'Kopiraj kodo')),
        h('h3', { style: 'margin-top:22px' }, `Detektivi v sobi (${members.length}/3)`),
        h('div', { class: 'grid', style: 'gap:10px' }, members.map(([uid, m]) => h('div', { class: 'member' }, h('span', { class: 'avatar' }, m.username[0].toUpperCase()), h('div', null, h('b', null, m.username), h('div', { class: 'muted mono', style: 'font-size:12px' }, m.badge)), h('span', { class: 'spacer' }), m.host ? h('span', { class: 'pill' }, 'Gostitelj') : null, h('span', { class: 'dot' + (presence[uid] === true ? ' on' : ''), title: presence[uid] === true ? 'Povezan' : 'Ni povezan', role: 'img', 'aria-label': presence[uid] === true ? 'Povezan' : 'Ni povezan' })))),
        err,
        h('details', { style: 'margin-top:18px' }, h('summary', { style: 'cursor:pointer;color:var(--red-3)' }, 'Pravila in točkovanje'), h('ul', null, c.meta.rules.map((t) => h('li', null, t)))),
        h('div', { class: 'row', style: 'margin-top:20px' }, isHost ? startBtn : h('span', { class: 'muted' }, 'Čakamo, da gostitelj začne preiskavo …'), h('span', { class: 'spacer' }), leaveBtn)));
  }
  const unsubs = [
    watch(`investigations/${id}/core`, (v) => { if (!v) return go('#/nadzorna-plosca'); const n = Object.keys(v.members || {}).length; if (core && n > Object.keys(core.members || {}).length) sound.ping(); core = v; draw(); }, () => go('#/nadzorna-plosca')),
    watch(`presence/${id}`, (v) => { presence = v || {}; draw(); }),
  ];
  return () => { unsubs.forEach((u) => u()); stopPresence(id, S.user.uid, pres); };
}

// ---------- rezultat ----------
async function result(id) {
  const c = await loadCase();
  const view = h('div', { class: 'page page--mid' }, spinner('Nalagam rezultat …'));
  shell(view);
  let core = null, res = null;
  function draw() {
    if (!core) return;
    if (['lobby', 'active'].includes(core.status)) return go(`#/preiskava/${id}`);
    if (!res) return;
    const ok = res.success;
    const names = Object.values(res.members || {}).map((m) => `${m.username} (${m.badge})`);
    const myBadges = ((res.badges || {})[S.user.uid] || '').split('|').filter(Boolean);
    const pdfBtn = busyButton(h('button', { class: 'btn primary' }, icon('download'), 'Odpri uradne rešitve PDF'), async () => {
      try { const r = await call('getSolutionPdf', { id }); download(r.filename, b64ToBlob(r.base64, 'application/pdf')); } catch (e) { toast(e.message, 'err'); }
    });
    const cell = (v, l) => h('div', { class: 'stat' }, h('b', null, String(v)), h('span', null, l));
    clear(view).append(
      h('div', { class: 'finale ' + (ok ? 'finale--win' : 'finale--lose') },
        h('div', { class: 'big' }, ok ? 'Preiskava uspešno zaključena' : res.outcome === 'expired' ? 'Čas je potekel' : 'Preiskava neuspešna'),
        h('h1', null, ok ? 'RESNICA JE ODKRITA.' : 'PRIMER OSTANE NEREŠEN.'),
        ok ? h('div', { class: 'rank', 'aria-label': `Ocena ${res.rank}` }, res.rank) : h('span', { class: 'stamp' }, res.outcome === 'expired' ? 'ČAS JE POTEKEL' : OUTCOME_SL[res.outcome].toUpperCase()),
        !ok && res.reason ? h('p', { class: 'muted' }, res.reason) : null),
      h('div', { class: 'card' },
        h('div', { class: 'grid c4' }, cell(fmtDur(res.durationSec), 'Trajanje'), cell(`${res.evidenceCount}/${res.evidenceTotal}`, 'Odkriti dokazi'), cell(`${res.puzzlesSolved}/${res.puzzlesTotal}`, 'Rešene uganke'), cell(res.hintsUsed, 'Uporabljeni namigi'),
          cell(res.wrongAccusations, 'Napačne obtožbe'), cell(ok ? res.score : '–', 'Končna ocena (točke)'), cell(MODE_SL[res.mode] || res.mode, 'Način'), cell(OUTCOME_SL[res.outcome], 'Stanje preiskave')),
        h('p', { style: 'margin-top:16px' }, h('b', null, 'Detektivi: '), names.join(', ')),
        ok ? h('p', null, h('b', null, 'Pravilno identificirana storilka: '), res.culprit) : null,
        ok ? h('div', { style: 'margin-top:12px' }, h('b', null, 'Dosežene značke: '), myBadges.length ? myBadges.map((b) => h('span', { class: 'pill pill--ok', style: 'margin:0 6px 6px 0' }, b)) : h('span', { class: 'muted' }, 'brez novih značk')) : null,
        h('div', { class: 'row', style: 'margin-top:20px' }, pdfBtn, h('span', { class: 'spacer' }), h('a', { class: 'btn', href: '#/nadzorna-plosca' }, 'Nazaj na nadzorno ploščo'))),
      !ok ? h('p', { class: 'hint', style: 'margin-top:12px' }, 'Uradne rešitve vsebujejo storilca, motiv in vse odgovore. Odprite jih šele, ko ste pripravljeni.') : null);
    if (!draw.once) { draw.once = true; (ok ? sound.win() : sound.lose()); }
  }
  const unsubs = [
    watch(`investigations/${id}/core`, (v) => { core = v; draw(); }, () => go('#/nadzorna-plosca')),
    watch(`investigations/${id}/result`, (v) => { res = v; draw(); }),
  ];
  return () => unsubs.forEach((u) => u());
}

export const playerScreens = { dashboard, profile, lobby, result };
