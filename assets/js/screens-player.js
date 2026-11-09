// Zasloni igralca: nadzorna plošča, profil, čakalnica, rezultat.
import { shell, go, S, loadCase } from './app.js';
import { h, clear, icon, busyButton, toast, modal, confirmBox, sound, spinner, copyText, download, b64ToBlob, fmtDate, fmtDateTime, fmtDur, STATUS_SL, OUTCOME_SL, MODE_SL, rankFor, plural } from './ui.js';
import { call, watch, getOnce, startPresence, stopPresence, changePassword } from './backend.js';
import { CASE2_META } from './room3d-data.js';

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


const CASE1 = 'PRIMER-001', CASE2 = 'PRIMER-002';
const caseRows = (rows, caseId) => Object.values(rows || {}).filter((r) => (r.caseId || CASE1) === caseId);
// Shranjena koda za primer (vpisana na nadzorni plošči), ki ustreza kategoriji.
function storedCode(caseId, category) {
  const acc = ((S.profile && S.profile.access) || {})[caseId] || {};
  const hit = Object.entries(acc).find(([, v]) => v && v.category === category);
  return hit ? hit[0] : null;
}

// Primer je odklenjen za vedno, ko je uporabnik vpisal veljavno kodo (ali ga je že igral).
function unlockedCase(caseId, rows) {
  const acc = ((S.profile && S.profile.access) || {})[caseId];
  return !!((acc && Object.keys(acc).length) || caseRows(rows, caseId).length);
}

async function dashboard() {
  const c = await loadCase();
  const body = h('div', { class: 'page' });
  const hist = h('div', null, spinner());
  const activeBox = h('div');
  const casesBox = h('div', { class: 'cases' });
  let rows = null;
  const err = h('div', { class: 'err', hidden: true, role: 'alert' });
  const showErr = (m) => { err.textContent = m; err.hidden = false; };

  const kodaIn = h('input', { id: 'kodaa', maxlength: 24, placeholder: 'npr. ABCD-2345', autocomplete: 'off', style: 'text-transform:uppercase;letter-spacing:.15em;font-family:var(--font-mono)' });
  const actBtn = busyButton(h('button', { class: 'btn primary' }, 'Odkleni primer'), async () => {
    err.hidden = true;
    try {
      const r = await call('activateCode', { code: kodaIn.value });
      kodaIn.value = ''; sound.ok();
      toast(`Koda sprejeta: Primer ${r.caseId === CASE2 ? '002' : '001'} je odklenjen (${r.category === 'solo' ? 'Solo detektiv' : 'Skupina detektivov'}).`, 'ok', 6000);
      setTimeout(drawCases, 400); setTimeout(drawCases, 1500);
    } catch (e) { showErr(e.message); }
  });
  const codeIn = h('input', { id: 'code', maxlength: 6, placeholder: 'KODA', autocomplete: 'off', style: 'text-transform:uppercase;letter-spacing:.3em;text-align:center;font-family:var(--font-mono)' });
  const joinBtn = busyButton(h('button', { class: 'btn' }, 'Pridruži se'), async () => {
    err.hidden = true;
    try { const r = await call('joinInvestigation', { code: codeIn.value }); go(`#/${r.rejoined ? 'preiskava' : 'lobby'}/${r.id}`); } catch (e) { showErr(e.message); }
  });

  async function startSolo(caseId) {
    err.hidden = true;
    let accessCode = null;
    const meta = caseId === CASE2 ? CASE2_META : c.meta;
    if (!unlockedCase(caseId, rows)) { accessCode = await confirmStart(meta, 'solo', caseId); if (!accessCode) return; }
    try {
      const r = await call('createInvestigation', { solo: true, accessCode, caseId });
      if (!r.resumed || r.status === 'lobby') await call('startInvestigation', { id: r.id, accessCode });
      go(`#/preiskava/${r.id}`);
    } catch (e) { showErr(e.message); }
  }
  async function startTeam(caseId) {
    err.hidden = true;
    try { const r = await call('createInvestigation', { caseId }); go(`#/lobby/${r.id}`); } catch (e) { showErr(e.message); }
  }

  function caseCard(no, caseId, meta, state) {
    const { label, kind, note, canPlay } = state;
    const soloB = busyButton(h('button', { class: 'btn primary', disabled: !canPlay }, 'Začni solo preiskavo'), () => startSolo(caseId));
    const teamB = busyButton(h('button', { class: 'btn', disabled: !canPlay }, 'Ustvari preiskovalno sobo'), () => startTeam(caseId));
    return h('div', { class: 'card case' + (canPlay ? ' card--glow' : ' case--locked') },
      h('div', { class: 'row' }, h('div', { class: 'kicker' }, `Primer ${no}`), h('span', { class: 'spacer' }), h('span', { class: `pill pill--${kind}` }, label)),
      h('h2', null, meta.title.replace(/^PRIMER \d+: /, '')), h('p', { class: 'muted' }, meta.subtitle),
      h('p', { class: 'case__kind' }, caseId === CASE2 ? 'Virtualna 3D soba: premikate se po prostoru in odkrivate predmete. Malo branja, veliko iskanja.' : 'Zaupni spisi: dokumenti, zaslišanja, uganke in tabla s povezavami.'),
      note ? h('p', { class: 'hint' }, note) : null,
      h('div', { class: 'row', style: 'margin-top:10px' }, soloB, teamB));
  }

  function drawCases() {
    const done1 = caseRows(rows, CASE1), done2 = caseRows(rows, CASE2);
    const solved1 = done1.some((r) => r.outcome === 'success'), solved2 = done2.some((r) => r.outcome === 'success');
    const concl1 = done1.some((r) => r.outcome !== 'aborted');
    const acc1 = unlockedCase(CASE1, rows), acc2 = unlockedCase(CASE2, rows);
    const s1 = solved1 ? { label: 'Rešen', kind: 'ok', note: 'Primer je odklenjen za vedno. Lahko ga ponovite.', canPlay: true }
      : concl1 ? { label: 'Zaključen, nerešen', kind: 'warn', note: 'Primer je odklenjen za vedno. Kode ne potrebujete več.', canPlay: true }
        : acc1 ? { label: 'Odklenjen', kind: 'ok', note: 'Koda ni več potrebna.', canPlay: true }
          : { label: 'Čaka na kodo', kind: 'warn', note: 'Kodo vnesite zgoraj ali jo vpišite ob začetku preiskave.', canPlay: true };
    const s2 = !concl1 ? { label: 'Zaklenjen', kind: 'bad', note: 'Odklene se po zaključenem Primeru 001 in z veljavno kodo za Primer 002. Lahko pa se kot gost pridružite ekipi igralca, ki je Primer 001 že zaključil (koda za povabilo spodaj).', canPlay: false }
      : acc2 ? { label: solved2 ? 'Rešen' : 'Odklenjen', kind: 'ok', note: solved2 ? 'Primer je odklenjen za vedno. Lahko ga ponovite.' : 'Koda ni več potrebna.', canPlay: true }
        : { label: 'Čaka na kodo', kind: 'warn', note: 'Vnesite kodo za Primer 002 zgoraj.', canPlay: false };
    clear(casesBox).append(caseCard('001', CASE1, c.meta, s1), caseCard('002', CASE2, CASE2_META, s2));
  }

  body.append(
    h('div', { class: 'grid c2' }, idCard(S.profile), h('div', null, h('div', { class: 'kicker' }, 'Pregled'), statsRow(S.profile))),
    h('div', { class: 'card', style: 'margin-top:20px' },
      h('h2', null, 'Koda za dostop'), h('p', { class: 'muted' }, 'Vpišite kodo, ki ste jo prejeli. Vsaka koda velja za en primer; odklene ga na vašem računu.'),
      h('div', { class: 'row' }, h('label', { class: 'sr-only', for: 'kodaa' }, 'Koda za dostop'), h('div', { style: 'flex:1;min-width:200px;max-width:320px' }, kodaIn), actBtn), err),
    activeBox,
    h('h2', { style: 'margin-top:24px' }, 'Primeri'), casesBox,
    h('div', { class: 'row card', style: 'margin-top:18px;gap:10px' }, h('b', null, 'Imate kodo za povabilo v sobo?'), h('span', { class: 'spacer' }), h('label', { class: 'sr-only', for: 'code' }, 'Koda za povabilo'), h('div', { style: 'width:150px' }, codeIn), joinBtn),
    h('details', { class: 'rulesbox' }, h('summary', null, 'Pravila preiskave'), h('ul', null, c.meta.rules.map((t) => h('li', null, t)))),
    h('h2', { style: 'margin-top:28px' }, 'Zgodovina preiskav'), hist);

  const unsubs = [
    watch(`userInvestigations/${S.user.uid}`, (r) => { rows = r || {}; clear(hist).append(historyList(rows)); drawCases(); }),
    watch(`users/${S.user.uid}`, () => { if (rows) drawCases(); }),
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
function confirmStart(meta, mode, caseId) {
  const code = h('input', { id: 'acode', maxlength: 24, autocomplete: 'off', placeholder: 'npr. ABCD-2345', style: 'text-transform:uppercase;letter-spacing:.15em;font-family:var(--font-mono)' });
  const err = h('div', { class: 'err', hidden: true, role: 'alert' });
  let val = null;
  const no = caseId === CASE2 ? '002' : '001';
  const pen = meta.hintPenalty, wr = meta.wrongAccusationPenalty || meta.wrongPenalty;
  return new Promise((res) => modal({
    title: `Pred začetkom: Primer ${no}`,
    body: h('div', null, h('p', null, 'Ko preiskavo začnete, se odštevanje (60 minut) ne ustavi: osvežitev strani, odklop ali zaprtje brskalnika ga ne ustavijo.'),
      h('ul', null, h('li', null, `Namig stane ${pen} točk, napačna končna obtožba ${wr} točk.`), h('li', null, `Končnih obtožb je največ ${meta.maxAccusations}.`), h('li', null, 'Sestava ekipe se po začetku zaklene.')),
      err,
      h('div', { class: 'field' }, h('label', { for: 'acode' }, mode === 'solo' ? `Koda za dostop (Primer ${no}, Solo detektiv)` : `Koda za dostop (Primer ${no}, Skupina detektivov)`), code,
        h('span', { class: 'hint' }, 'Kodo ste lahko vnesli že na nadzorni plošči. Če ne, jo vpišite tukaj. To ni koda za povabilo v sobo.'))),
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
    const caseId = core.caseId || CASE1; const meta = caseId === CASE2 ? CASE2_META : c.meta;
    const startBtn = busyButton(h('button', { class: 'btn primary' }, 'Začni preiskavo'), async () => {
      const cat = members.length === 1 ? 'solo' : 'group';
      let accessCode = null;
      const me = unlockedCase(caseId, await getOnce(`userInvestigations/${S.user.uid}`).catch(() => ({})));
      if (!me) { accessCode = await confirmStart(meta, cat, caseId); if (!accessCode) return; }
      try { await call('startInvestigation', { id, accessCode }); } catch (e) {
        if (!accessCode && /kod/i.test(e.message)) { const c2 = await confirmStart(meta, cat, caseId); if (c2) { try { await call('startInvestigation', { id, accessCode: c2 }); return; } catch (e2) { showErr(e2.message); return; } } }
        showErr(e.message);
      }
    });
    const leaveBtn = busyButton(h('button', { class: 'btn ghost' }, 'Zapusti sobo'), async () => { try { await call('leaveInvestigation', { id }); } catch (e) { /* nič */ } go('#/nadzorna-plosca'); });
    clear(view).append(
      h('div', { class: 'kicker' }, `Čakalnica · Primer ${caseId === CASE2 ? '002' : '001'}`), h('h1', null, 'Preiskovalna soba'),
      h('div', { class: 'card card--glow' },
        h('p', { class: 'muted' }, 'Pošljite kodo prijateljema (največ dva dodatna detektiva). Ko gostitelj začne preiskavo, se sestava ekipe zaklene.'),
        h('div', { class: 'row' }, h('span', { class: 'code', 'aria-label': `Koda za povabilo: ${core.code.split('').join(' ')}` }, core.code),
          h('button', { class: 'btn', onclick: () => copyText(core.code).then(() => toast('Koda je kopirana.', 'ok', 2000), () => toast('Kopiranje ni mogoče; prepišite kodo ročno.', 'warn')) }, icon('copy'), 'Kopiraj kodo')),
        h('h3', { style: 'margin-top:22px' }, `Detektivi v sobi (${members.length}/3)`),
        h('div', { class: 'grid', style: 'gap:10px' }, members.map(([uid, m]) => h('div', { class: 'member' }, h('span', { class: 'avatar' }, m.username[0].toUpperCase()), h('div', null, h('b', null, m.username), h('div', { class: 'muted mono', style: 'font-size:12px' }, m.badge)), h('span', { class: 'spacer' }), m.host ? h('span', { class: 'pill' }, 'Gostitelj') : null, h('span', { class: 'dot' + (presence[uid] === true ? ' on' : ''), title: presence[uid] === true ? 'Povezan' : 'Ni povezan', role: 'img', 'aria-label': presence[uid] === true ? 'Povezan' : 'Ni povezan' })))),
        err,
        h('details', { style: 'margin-top:18px' }, h('summary', { style: 'cursor:pointer;color:var(--red-3)' }, 'Pravila in točkovanje'), h('ul', null, meta.rules.map((t) => h('li', null, t)))),
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
    if (res.caseId === CASE2) {
      const okk = res.success; const o = res.official || {};
      const names2 = Object.values(res.members || {}).map((m) => `${m.username} (${m.badge})`);
      const myB = ((res.badges || {})[S.user.uid] || '').split('|').filter(Boolean);
      const cl = (v, l) => h('div', { class: 'stat' }, h('b', null, String(v)), h('span', null, l));
      clear(view).append(
        h('div', { class: 'finale ' + (okk ? 'finale--win' : 'finale--lose') },
          h('div', { class: 'big' }, okk ? 'Primer 002 rešen' : res.outcome === 'expired' ? 'Čas je potekel' : 'Preiskava neuspešna'),
          h('h1', null, okk ? 'VRATA SE ODPIRAJO.' : 'PRIMER OSTANE NEREŠEN.'),
          okk ? h('div', { class: 'rank' }, res.rank) : h('span', { class: 'stamp' }, res.outcome === 'expired' ? 'ČAS JE POTEKEL' : 'NEUSPEH'),
          !okk && res.reason ? h('p', { class: 'muted' }, res.reason) : null),
        h('div', { class: 'card' },
          h('div', { class: 'grid c4' }, cl(fmtDur(res.durationSec), 'Trajanje'), cl(`${res.evidenceCount}/${res.evidenceTotal}`, 'Odkrite sledi'), cl(`${res.puzzlesSolved}/${res.puzzlesTotal}`, 'Odklenjene ključavnice'), cl(res.hintsUsed, 'Namigi'),
            cl(res.wrongAccusations, 'Napačne obtožbe'), cl(okk ? res.score : '–', 'Končna ocena (točke)'), cl(MODE_SL[res.mode] || res.mode, 'Način'), cl(OUTCOME_SL[res.outcome], 'Stanje')),
          h('p', { style: 'margin-top:16px' }, h('b', null, 'Detektivi: '), names2.join(', ')),
          okk ? h('p', null, h('b', null, 'Storilka: '), res.culprit) : null,
          okk ? h('div', { style: 'margin-top:12px' }, h('b', null, 'Dosežene značke: '), myB.length ? myB.map((b) => h('span', { class: 'pill pill--ok', style: 'margin:0 6px 6px 0' }, b)) : h('span', { class: 'muted' }, 'brez novih značk')) : null),
        h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Uradna rešitev'),
          h('p', null, o.summary), h('p', null, h('b', null, 'Motiv: '), o.motive), h('p', null, h('b', null, 'Način: '), o.method),
          h('h3', null, 'Časovnica'), h('ul', null, (o.timeline || []).map(([t, x]) => h('li', null, h('b', { class: 'mono' }, t), ' ', x))),
          h('h3', null, 'Osumljenci'), (o.eliminations || []).map((e) => h('p', null, h('b', null, e.name), ': ', h('em', null, e.lies), ' ', e.why)),
          h('h3', null, 'Zavajajoče sledi'), h('ul', null, (o.misleading || []).map((x) => h('li', null, x))), h('p', null, o.conclusion)),
        h('div', { class: 'row', style: 'margin-top:16px' }, h('span', { class: 'spacer' }), h('a', { class: 'btn', href: '#/nadzorna-plosca' }, 'Nazaj na nadzorno ploščo')));
      if (!draw.once) { draw.once = true; (okk ? sound.win() : sound.lose()); }
      return;
    }
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
