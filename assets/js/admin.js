// Administratorska nadzorna plošča. Pravice preveri zaledje (seja administratorja); stran sama ni varnostni mehanizem.
import { initFirebase, state as fb, onAuth, signIn, signOutUser, getClaims, watch, getOnce, call, authErrorText, currentUser } from './backend.js';
import { h, clear, icon, logo, busyButton, toast, modal, confirmBox, spinner, copyText, download, b64ToBlob, fmtDateTime, fmtTime, fmtDur, fmtClock, STATUS_SL, OUTCOME_SL, MODE_SL } from './ui.js';

const root = document.getElementById('app');
const A = { users: {}, index: {}, logs: {}, tab: 'pregled', subs: [], detail: null, f: { q: '', status: '', res: '', mode: '', user: '', from: '', to: '', maxSec: '' }, now: Date.now() };
setInterval(() => { A.now = Date.now(); if (A.tab === 'aktivne') drawTab(); }, 1000);

const TABS = [['pregled', 'Pregled sistema', 'shield'], ['detektivi', 'Detektivi', 'people'], ['aktivne', 'Aktivne preiskave', 'clock'], ['rezultati', 'Vsi rezultati', 'log'], ['dnevnik', 'Dnevnik dejanj', 'note'], ['resitve', 'Uradne rešitve', 'docs']];

function configMissing() { clear(root).append(h('div', { class: 'page page--mid' }, h('div', { class: 'card' }, h('h1', null, 'Zaledje ni nastavljeno'), h('p', null, fb.error), h('p', null, 'Glejte docs/NAMESTITEV.md.')))); }

function loginScreen(msg) {
  const err = h('div', { class: 'err', hidden: !msg, role: 'alert' }, msg || '');
  const e = h('input', { id: 'ae', type: 'email', autocomplete: 'username', required: true }), p = h('input', { id: 'ap', type: 'password', autocomplete: 'current-password', required: true });
  const btn = h('button', { class: 'btn primary', style: 'width:100%', type: 'submit' }, 'Prijava administratorja');
  const f = h('form', { novalidate: true }, err, h('div', { class: 'field' }, h('label', { for: 'ae' }, 'E-naslov administratorja'), e), h('div', { class: 'field' }, h('label', { for: 'ap' }, 'Geslo'), p), btn);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault(); err.hidden = true; btn.disabled = true;
    try { await signIn(e.value.trim(), p.value); } catch (x) { err.textContent = authErrorText(x); err.hidden = false; btn.disabled = false; }
  });
  clear(root).append(h('div', { class: 'page page--narrow' }, h('div', { style: 'text-align:center;margin-bottom:18px' }, logo(true)), h('div', { class: 'card card--glow' }, h('div', { class: 'kicker' }, 'Zaščiten vstop'), h('h1', { style: 'font-size:26px' }, 'ADMINISTRATORSKI DOSTOP'), h('p', { class: 'muted' }, 'Samo pooblaščene osebe. Vsaka prijava se zabeleži.'), f), h('p', { style: 'text-align:center;margin-top:14px' }, h('a', { href: './' }, 'Nazaj na igro'))));
  e.focus();
}

// ---------- statistika (iz dejanskih podatkov) ----------
const DONE = ['success', 'failed', 'expired', 'aborted'];
function stats() {
  const users = Object.values(A.users), inv = Object.values(A.index);
  const active = inv.filter((i) => i.status === 'active' && i.deadline > A.now);
  const succ = inv.filter((i) => i.status === 'success');
  const counted = inv.filter((i) => ['success', 'failed', 'expired'].includes(i.status)); // prekinjene (administrator) niso v deležu
  return {
    users: users.length, pending: users.filter((u) => u.status === 'PENDING_APPROVAL').length, approved: users.filter((u) => u.status === 'APPROVED').length, suspended: users.filter((u) => u.status === 'SUSPENDED').length,
    started: inv.length, active: active.length, success: succ.length, failed: inv.filter((i) => i.status === 'failed').length, expired: inv.filter((i) => i.status === 'expired').length,
    avg: succ.length ? succ.reduce((a, b) => a + (b.durationSec || 0), 0) / succ.length : null, rate: counted.length ? succ.length / counted.length : null,
  };
}
const cell = (v, l) => h('div', { class: 'stat' }, h('b', null, String(v)), h('span', null, l));

function tabOverview() {
  const s = stats();
  return h('div', null, h('h1', null, 'Pregled sistema'),
    h('div', { class: 'grid c4' }, cell(s.users, 'Registriranih detektivov'), cell(s.pending, 'Čakajoče registracije'), cell(s.approved, 'Odobreni računi'), cell(s.suspended, 'Suspendirani računi'),
      cell(s.started, 'Začete preiskave'), cell(s.active, 'Aktivne preiskave'), cell(s.success, 'Uspešni pobegi'), cell(s.failed, 'Neuspešne preiskave'),
      cell(s.expired, 'Potekel čas'), cell(s.avg === null ? '–' : fmtDur(s.avg), 'Povprečni čas reševanja'), cell(s.rate === null ? '–' : `${Math.round(s.rate * 100)} %`, 'Delež uspešnih pobegov')),
    h('p', { class: 'hint', style: 'margin-top:14px' }, 'Opredelitev: »Začete« so vse preiskave, ki so dobile čas začetka. Povprečni čas velja samo za uspešne pobege. Delež uspešnih = uspešni / (uspešni + neuspešni + potekli); preiskave, ki jih je prekinil administrator, se ne štejejo.'),
    s.pending ? h('div', { class: 'okmsg', style: 'margin-top:14px' }, `Čakajočih registracij: ${s.pending}. `, h('button', { class: 'btn small primary', onclick: () => { A.f.status = 'PENDING_APPROVAL'; A.tab = 'detektivi'; drawAll(); } }, 'Pregled')) : null);
}

// ---------- detektivi ----------
function tabUsers() {
  const f = A.f; const q = f.q.toLowerCase();
  const rows = Object.entries(A.users).filter(([, u]) => (!f.status || u.status === f.status) && (!q || u.username.toLowerCase().includes(q) || (u.badge || '').toLowerCase().includes(q))).sort((a, b) => b[1].createdAt - a[1].createdAt);
  const act = (uid, status, label, kind) => h('button', { class: `btn small ${kind || ''}`, onclick: async () => {
    if (!(await confirmBox(label, `Uporabnik: ${A.users[uid].username}. Dejanje se zabeleži v dnevnik.`, label, status !== 'APPROVED'))) return;
    try { await call('adminSetStatus', { uid, status }); toast('Shranjeno.', 'ok'); } catch (e) { toast(e.message, 'err'); }
  } }, label);
  return h('div', null, h('h1', null, 'Detektivi'),
    h('div', { class: 'adm__bar' }, h('div', { class: 'field' }, h('label', { for: 'fq' }, 'Iskanje (ime ali BADGE)'), h('input', { id: 'fq', value: f.q, oninput: (e) => { f.q = e.target.value; keep('fq'); } })),
      h('div', { class: 'field' }, h('label', { for: 'fs' }, 'Status'), h('select', { id: 'fs', onchange: (e) => { f.status = e.target.value; drawTab(); } }, h('option', { value: '' }, 'Vsi'), Object.entries(STATUS_SL).map(([k, v]) => h('option', { value: k, selected: f.status === k }, v))))),
    h('div', { class: 'tablewrap' }, h('table', { class: 'data' }, h('thead', null, h('tr', null, ['Uporabniško ime', 'BADGE', 'Status', 'Registriran', 'Preiskave', 'Dejanja'].map((t) => h('th', null, t)))),
      h('tbody', null, rows.map(([uid, u]) => h('tr', null, h('td', null, u.username), h('td', { class: 'mono' }, u.badge), h('td', null, h('span', { class: `pill ${u.status === 'APPROVED' ? 'pill--ok' : u.status === 'PENDING_APPROVAL' ? 'pill--warn' : 'pill--bad'}` }, STATUS_SL[u.status] || u.status)), h('td', null, fmtDateTime(u.createdAt)), h('td', null, `${(u.stats || {}).investigations || 0} (uspešnih ${(u.stats || {}).escapes || 0})`),
        h('td', null, h('div', { class: 'row', style: 'gap:6px' },
          u.status === 'PENDING_APPROVAL' ? [act(uid, 'APPROVED', 'Odobri', 'primary'), act(uid, 'REJECTED', 'Zavrni', 'danger')] : null,
          u.status === 'APPROVED' ? act(uid, 'SUSPENDED', 'Suspendiraj', 'danger') : null,
          u.status === 'SUSPENDED' || u.status === 'REJECTED' ? act(uid, 'APPROVED', 'Ponovno aktiviraj') : null,
          h('button', { class: 'btn small', onclick: () => editUser(uid) }, 'Uredi'), h('button', { class: 'btn small', onclick: () => userHistory(uid) }, 'Zgodovina'), h('button', { class: 'btn small', onclick: () => resetPw(uid) }, 'Ponastavi geslo')))))))),
    rows.length ? null : h('p', { class: 'muted', style: 'padding:14px' }, 'Ni ujemajočih računov.'));
}
function editUser(uid) {
  const u = A.users[uid]; const nu = h('input', { id: 'eu', value: u.username, maxlength: 20 }), nb = h('input', { id: 'eb', value: u.badge, maxlength: 12 }); const err = h('div', { class: 'err', hidden: true });
  modal({ title: `Urejanje: ${u.username}`, body: h('div', null, err, h('div', { class: 'field' }, h('label', { for: 'eu' }, 'Uporabniško ime'), nu, h('span', { class: 'hint' }, 'Sprememba imena spremeni tudi prijavno ime uporabnika.')), h('div', { class: 'field' }, h('label', { for: 'eb' }, 'BADGE NUMBER'), nb)),
    actions: [{ label: 'Prekliči', value: false }, { label: 'Shrani', kind: 'primary', onClick: async () => { try { await call('adminEditUser', { uid, username: nu.value, badge: nb.value }); toast('Shranjeno.', 'ok'); } catch (e) { err.textContent = e.message; err.hidden = false; return false; } } }] });
}
async function resetPw(uid) {
  if (!(await confirmBox('Ponastavitev gesla', `Za uporabnika ${A.users[uid].username} se ustvari začasno geslo, ki se prikaže samo enkrat. Obstoječe seje se prekinejo.`, 'Ustvari začasno geslo', true))) return;
  try { const r = await call('adminResetPassword', { uid }); modal({ title: 'Začasno geslo', body: h('div', null, h('p', null, 'Posredujte uporabniku po varni poti. Geslo se ne shrani in se ne prikaže več.'), h('p', { class: 'code', style: 'font-size:22px;letter-spacing:.1em' }, r.tempPassword)), actions: [{ label: 'Kopiraj', onClick: async () => { await copyText(r.tempPassword).catch(() => {}); return false; } }, { label: 'Zapri', kind: 'primary' }] }); } catch (e) { toast(e.message, 'err'); }
}
async function userHistory(uid) {
  const rows = (await getOnce(`userInvestigations/${uid}`)) || {}; const u = A.users[uid];
  modal({ title: `Zgodovina: ${u.username}`, wide: true, body: Object.keys(rows).length ? h('div', { class: 'tablewrap' }, h('table', { class: 'data' }, h('thead', null, h('tr', null, ['Začetek', 'Način', 'Rezultat', 'Čas', 'Točke', 'Namigi', ''].map((t) => h('th', null, t)))), h('tbody', null, Object.values(rows).sort((a, b) => b.startedAt - a.startedAt).map((r) => h('tr', null, h('td', null, fmtDateTime(r.startedAt)), h('td', null, MODE_SL[r.mode] || r.mode), h('td', null, OUTCOME_SL[r.outcome]), h('td', null, fmtDur(r.durationSec)), h('td', null, r.outcome === 'success' ? r.score : '–'), h('td', null, r.hintsUsed), h('td', null, h('button', { class: 'btn small', onclick: () => { document.querySelector('.overlay')?.remove(); openDetail(r.id); } }, 'Podrobnosti'))))))) : h('p', { class: 'muted' }, 'Uporabnik še nima preiskav.'), actions: [{ label: 'Zapri', kind: 'primary' }] });
}

// ---------- preiskave ----------
const names = (i) => Object.values(i.members || {}).map((m) => m.username).join(', ');
const badges = (i) => Object.values(i.members || {}).map((m) => m.badge).join(', ');
function tabActive() {
  const rows = Object.values(A.index).filter((i) => i.status === 'active').sort((a, b) => b.startedAt - a.startedAt);
  return h('div', null, h('h1', null, 'Aktivne preiskave'), h('p', { class: 'muted' }, 'Prikaz v živo. Spremljanje ne spreminja stanja preiskave.'),
    h('div', { class: 'tablewrap' }, h('table', { class: 'data' }, h('thead', null, h('tr', null, ['ID', 'Detektivi', 'Začetek', 'Preostali čas', 'Dokazi', 'Uganke', 'Stopnja', 'Zadnja aktivnost', ''].map((t) => h('th', null, t)))),
      h('tbody', null, rows.map((i) => h('tr', null, h('td', { class: 'mono' }, i.id.slice(-8)), h('td', null, names(i)), h('td', null, fmtDateTime(i.startedAt)), h('td', { class: 'mono' }, i.deadline > A.now ? fmtClock((i.deadline - A.now) / 1000) : 'potekel'), h('td', null, `${i.evidenceCount}/25`), h('td', null, `${i.puzzlesSolved}/7`), h('td', null, `${Math.min(7, i.puzzlesSolved + 1)}/7`), h('td', null, fmtTime(i.lastActivity)),
        h('td', null, h('div', { class: 'row', style: 'gap:6px' }, h('button', { class: 'btn small', onclick: () => openDetail(i.id) }, 'Spremljaj'), h('button', { class: 'btn small danger', onclick: () => forceEnd(i) }, 'Prisilno zaključi'))))))), rows.length ? null : h('p', { class: 'muted', style: 'padding:14px' }, 'Trenutno ni aktivnih preiskav.')));
}
async function forceEnd(i) {
  const reason = h('input', { id: 'fr', placeholder: 'Razlog (neobvezno)', maxlength: 200 });
  modal({ title: 'Prisilni zaključek preiskave', body: h('div', null, h('p', null, `Preiskava ${i.id.slice(-8)} (${names(i)}) bo končana kot »prekinjena«. Dejanja ni mogoče razveljaviti. Zabeleži se v dnevnik.`), h('div', { class: 'field' }, h('label', { for: 'fr' }, 'Razlog'), reason)),
    actions: [{ label: 'Prekliči', value: false }, { label: 'Potrdi prisilni zaključek', kind: 'danger', onClick: async () => { try { await call('adminForceEnd', { id: i.id, confirm: true, reason: reason.value }); toast('Preiskava je zaključena.', 'ok'); } catch (e) { toast(e.message, 'err'); return false; } } }] });
}
function filtered() {
  const f = A.f; const from = f.from ? new Date(f.from).getTime() : 0, to = f.to ? new Date(f.to).getTime() + 86400000 : Infinity; const q = f.user.toLowerCase();
  return Object.values(A.index).filter((i) => i.status !== 'lobby' && (!f.res || i.status === f.res) && (!f.mode || i.mode === f.mode) && i.startedAt >= from && i.startedAt < to && (!f.maxSec || (i.durationSec != null && i.durationSec <= Number(f.maxSec) * 60)) && (!q || names(i).toLowerCase().includes(q) || badges(i).toLowerCase().includes(q))).sort((a, b) => b.startedAt - a.startedAt);
}
function tabResults() {
  const f = A.f; const rows = filtered();
  const fld = (id, label, el) => h('div', { class: 'field' }, h('label', { for: id }, label), el);
  return h('div', null, h('h1', null, 'Vsi rezultati'),
    h('div', { class: 'adm__bar' }, fld('ru', 'Uporabnik / BADGE', h('input', { id: 'ru', value: f.user, oninput: (e) => { f.user = e.target.value; keep('ru'); } })),
      fld('rr', 'Rezultat', h('select', { id: 'rr', onchange: (e) => { f.res = e.target.value; drawTab(); } }, h('option', { value: '' }, 'Vsi'), ['success', 'failed', 'expired', 'aborted', 'active'].map((k) => h('option', { value: k, selected: f.res === k }, OUTCOME_SL[k])))),
      fld('rm', 'Način igranja', h('select', { id: 'rm', onchange: (e) => { f.mode = e.target.value; drawTab(); } }, h('option', { value: '' }, 'Vsi'), Object.entries(MODE_SL).map(([k, v]) => h('option', { value: k, selected: f.mode === k }, v)))),
      fld('rf', 'Od datuma', h('input', { id: 'rf', type: 'date', value: f.from, onchange: (e) => { f.from = e.target.value; drawTab(); } })), fld('rt', 'Do datuma', h('input', { id: 'rt', type: 'date', value: f.to, onchange: (e) => { f.to = e.target.value; drawTab(); } })),
      fld('rs', 'Čas reševanja do (min)', h('input', { id: 'rs', type: 'number', min: 0, max: 60, value: f.maxSec, onchange: (e) => { f.maxSec = e.target.value; drawTab(); } })),
      h('button', { class: 'btn', onclick: () => exportCsv(rows) }, icon('download', 16), 'Izvoz CSV')),
    h('div', { class: 'tablewrap' }, h('table', { class: 'data' }, h('thead', null, h('tr', null, ['ID', 'Primer', 'Začetek', 'Konec', 'Čas', 'Rezultat', 'Način', 'Detektivi (BADGE)', 'Dokazi', 'Uganke', 'Namigi', 'Napačne obt.', 'Razlog', ''].map((t) => h('th', null, t)))),
      h('tbody', null, rows.map((i) => h('tr', null, h('td', { class: 'mono' }, i.id.slice(-8)), h('td', null, `${i.caseId} v${i.caseVersion}`), h('td', null, fmtDateTime(i.startedAt)), h('td', null, i.endedAt ? fmtDateTime(i.endedAt) : '–'), h('td', null, i.durationSec != null ? fmtDur(i.durationSec) : '–'), h('td', null, h('span', { class: `pill ${i.status === 'success' ? 'pill--ok' : i.status === 'active' ? 'pill--warn' : 'pill--bad'}` }, OUTCOME_SL[i.status])), h('td', null, MODE_SL[i.mode] || i.mode), h('td', null, Object.values(i.members || {}).map((m) => `${m.username} (${m.badge})`).join(', ')), h('td', null, i.evidenceCount), h('td', null, i.puzzlesSolved), h('td', null, i.hintsUsed), h('td', null, i.wrongAccusations || 0), h('td', null, i.reason || '–'), h('td', null, h('button', { class: 'btn small', onclick: () => openDetail(i.id) }, 'Podrobnosti')))))), rows.length ? null : h('p', { class: 'muted', style: 'padding:14px' }, 'Ni rezultatov za izbrane filtre.')));
}
const csvCell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
function exportCsv(rows) {
  const head = ['ID', 'Različica primera', 'Začetek', 'Konec', 'Čas reševanja (s)', 'Rezultat', 'Način', 'Detektivi', 'BADGE', 'Odkriti dokazi', 'Rešene uganke', 'Uporabljeni namigi', 'Napačne obtožbe', 'Končna obtožba', 'Razlog', 'Točke'];
  const lines = [head.map(csvCell).join(',')].concat(rows.map((i) => [i.id, `${i.caseId} v${i.caseVersion}`, fmtDateTime(i.startedAt), i.endedAt ? fmtDateTime(i.endedAt) : '', i.durationSec ?? '', OUTCOME_SL[i.status], MODE_SL[i.mode] || i.mode, names(i), badges(i), i.evidenceCount, i.puzzlesSolved, i.hintsUsed, i.wrongAccusations || 0, i.finalAccusation ? JSON.stringify(i.finalAccusation) : '', i.reason || '', i.score ?? ''].map(csvCell).join(',')));
  download(`rezultati-${new Date().toISOString().slice(0, 10)}.csv`, new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
}
async function openDetail(id) {
  const body = h('div', null, spinner());
  const m = modal({ title: 'Podrobnosti preiskave', wide: true, body, actions: [{ label: 'Zapri', kind: 'primary' }] });
  try {
    const [core, prog, res, evs] = await Promise.all([getOnce(`investigations/${id}/core`), getOnce(`investigations/${id}/progress`), getOnce(`investigations/${id}/result`), getOnce(`investigations/${id}/events`)]);
    const list = Object.values(evs || {}).sort((a, b) => a.ts - b.ts); const t0 = core && core.startedAt;
    clear(body).append(h('dl', { class: 'kvl' }, h('dt', null, 'ID'), h('dd', { class: 'mono' }, id), h('dt', null, 'Stanje'), h('dd', null, OUTCOME_SL[core.status]), h('dt', null, 'Detektivi'), h('dd', null, Object.values(core.members || {}).map((x) => `${x.username} (${x.badge})`).join(', ')),
      h('dt', null, 'Odkriti dokazi / rešene uganke'), h('dd', null, `${Object.keys((prog || {}).discovered || {}).length} / ${Object.keys((prog || {}).solved || {}).length}`), res ? [h('dt', null, 'Rezultat'), h('dd', null, `${res.success ? 'uspeh' : 'neuspeh'} · ${fmtDur(res.durationSec)} · točke ${res.score} · ${res.reason || ''}`)] : null,
      h('dt', null, 'Obtožbe'), h('dd', null, Object.values((prog || {}).accusations || {}).map((a) => `${a.name}: ${a.success ? 'pravilna' : 'napačna'} (${a.requiredCorrect}/4) ${JSON.stringify(a.form)}`).join(' | ') || '–')),
      h('h3', { style: 'margin-top:16px' }, 'Dogodki'), h('ol', { class: 'events' }, list.map((e) => h('li', null, h('span', { class: 'mono muted' }, t0 ? `+${fmtClock((e.ts - t0) / 1000)}` : ''), h('span', { class: 'mono muted' }, fmtTime(e.ts)), h('span', null, e.text)))));
  } catch (e) { clear(body).append(h('div', { class: 'err' }, e.message)); }
}

// ---------- dnevnik in rešitve ----------
function tabLogs() {
  const rows = Object.values(A.logs).sort((a, b) => b.ts - a.ts).slice(0, 500);
  return h('div', null, h('h1', null, 'Dnevnik administratorskih dejanj'), h('div', { class: 'tablewrap' }, h('table', { class: 'data' }, h('thead', null, h('tr', null, ['Čas', 'Administrator', 'Dejanje', 'Zapis', 'Podrobnosti'].map((t) => h('th', null, t)))),
    h('tbody', null, rows.map((l) => h('tr', null, h('td', null, fmtDateTime(l.ts)), h('td', null, l.adminEmail || l.adminUid), h('td', null, l.action), h('td', { class: 'mono' }, l.target || '–'), h('td', { class: 'mono', style: 'font-size:12px' }, l.details ? JSON.stringify(l.details) : '–')))))));
}
function tabSolutions() {
  const b = busyButton(h('button', { class: 'btn primary' }, icon('download', 16), 'Prenesi uradni ključ rešitve (PDF)'), async () => { try { const r = await call('adminGetSolutionPdf'); download(r.filename, b64ToBlob(r.base64, 'application/pdf')); } catch (e) { toast(e.message, 'err'); } });
  return h('div', null, h('h1', null, 'Uradne rešitve'), h('p', null, 'Celoten PDF z rešitvami je dostopen administratorju neodvisno od stanja katere koli preiskave. Prenos se zabeleži.'), b);
}

// ---------- ogrodje ----------
let main;
function keep(id) { const el = document.getElementById(id); const pos = el && el.selectionStart; drawTab(); const n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) { /* nič */ } } }
function drawTab() { if (!main) return; clear(main).append({ pregled: tabOverview, detektivi: tabUsers, aktivne: tabActive, rezultati: tabResults, dnevnik: tabLogs, resitve: tabSolutions }[A.tab]()); }
function drawAll() {
  const nav = h('nav', { class: 'adm__nav', 'aria-label': 'Administracija' }, h('div', { style: 'padding:6px 8px 14px' }, logo()), TABS.map(([k, l, ic]) => h('button', { class: 'adm__tab', 'aria-current': A.tab === k ? 'page' : 'false', onclick: () => { A.tab = k; drawAll(); } }, icon(ic), l)), h('span', { class: 'spacer' }), h('div', { class: 'muted', style: 'padding:8px;font-size:12px;word-break:break-all' }, currentUser().email), h('button', { class: 'adm__tab', onclick: () => signOutUser() }, 'Odjava'));
  main = h('main', { class: 'adm__main', tabindex: '-1' });
  clear(root).append(h('div', { class: 'adm' }, nav, main)); drawTab();
}

async function enter(user) {
  const claims = await getClaims(true);
  if (claims.admin !== true) { await signOutUser(); return loginScreen('Ta račun nima administratorskih pravic.'); }
  try { await call('adminLogin'); } catch (e) { await signOutUser(); return loginScreen(e.message); }
  A.subs.forEach((u) => u()); A.subs = [];
  const loaded = new Set(); const upd = (k, set) => (v) => { set(v || {}); loaded.add(k); if (loaded.size === 3) { if (!main) drawAll(); else drawTab(); } };
  A.subs.push(watch('users', upd('u', (v) => { A.users = v; })), watch('investigationIndex', upd('i', (v) => { A.index = v; })), watch('adminAuditLogs', upd('l', (v) => { A.logs = v; })));
  clear(root).append(spinner('Nalagam podatke …'));
}

(async function boot() {
  await initFirebase();
  if (!fb.ready) return configMissing();
  onAuth((u) => { main = null; if (!u) { A.subs.forEach((x) => x()); A.subs = []; return loginScreen(); } enter(u).catch((e) => loginScreen(e.message)); });
})();
