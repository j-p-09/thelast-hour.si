// Preiskovalna soba: časovnik, tabla, dokumenti, osumljenci, uganke, časovnica, dnevnik, končna obtožba, klepet.
// Vse pomembne odločitve (preverjanje odgovorov, rok, rezultat) sprejme strežnik; to je samo prikaz in pošiljanje zahtevkov.
import { shell, go, S, loadCase } from './app.js';
import { h, clear, icon, logo, busyButton, toast, modal, confirmBox, sound, spinner, fmtClock, fmtTime, plural, $, $$ } from './ui.js';
import { call, watch, serverNow, startPresence, stopPresence } from './backend.js';
import { portrait, floorPlan } from './art.js';
import { renderBlocks } from './documents.js';

const TABS = [['tabla', 'Tabla', 'board'], ['dokumenti', 'Dokumenti', 'docs'], ['osumljenci', 'Osumljenci', 'people'], ['uganke', 'Uganke', 'puzzle'], ['casovnica', 'Časovnica', 'clock'], ['dnevnik', 'Dnevnik', 'log'], ['obtozba', 'Obtožba', 'gavel']];
const FINISHED = ['success', 'failed', 'expired', 'aborted'];
const CARD_W = 230, CARD_H = 118;
const NOTE_COLORS = ['rumena', 'rdeča', 'modra', 'zelena'];

const cond = (progress, req) => !req || ((req.evidence || []).every((e) => (progress.discovered || {})[e]) && (req.puzzles || []).every((p) => (progress.solved || {})[p]));

export async function roomScreen(id) {
  const C = await loadCase();
  const R = {
    id, C, core: null, progress: {}, content: {}, board: {}, chat: {}, events: {}, presence: {}, result: null,
    tab: 'tabla', drafts: {}, selDoc: null, selDoc2: null, selSuspect: null, selPuzzle: null, linkFrom: null, dragging: false, loaded: new Set(),
    seenEvents: null, chatSeen: 0, chatOpen: false, warned: new Set(), finishedRouted: false, newSeen: {}, localPos: {},
  };
  const host = h('div', { class: 'room' }, spinner('Odpiram preiskovalno sobo …'));
  shell(host, { bare: true });

  // ---------- ogrodje ----------
  const timerEl = h('div', { class: 'timer', role: 'timer', 'aria-label': 'Preostali čas' }, h('span', { class: 'timer__num' }, '60:00'), h('span', { class: 'timer__lbl' }, ''));
  const live = h('div', { class: 'sr-only', 'aria-live': 'assertive', id: 'live' });
  const teamEl = h('div', { class: 'team' });
  const statEl = h('div', { class: 'room__stats' });
  const nav = h('nav', { class: 'room__nav', 'aria-label': 'Razdelki preiskave' });
  const panelHost = h('section', { class: 'room__panel', id: 'panel', 'aria-live': 'off' });
  const chatEl = h('aside', { class: 'chat', 'aria-label': 'Klepet ekipe', hidden: true });
  const chatBtn = h('button', { class: 'iconbtn', 'aria-label': 'Klepet ekipe', onclick: () => toggleChat() }, icon('chat'));
  const soundBtn = h('button', { class: 'iconbtn', 'aria-pressed': String(!sound.on), 'aria-label': sound.on ? 'Izklopi zvok' : 'Vklopi zvok', onclick: (e) => { sound.set(!sound.on); e.currentTarget.replaceChildren(icon(sound.on ? 'sound' : 'mute')); e.currentTarget.setAttribute('aria-pressed', String(!sound.on)); } }, icon(sound.on ? 'sound' : 'mute'));
  const leaveBtn = h('button', { class: 'btn ghost small', onclick: async () => {
    if (!(await confirmBox('Zapusti preiskavo?', 'Preiskava teče naprej in odštevanje se ne ustavi. Pridružite se lahko znova s kodo za povabilo.', 'Zapusti', true))) return;
    try { await call('leaveInvestigation', { id }); } catch (_) { /* nič */ }
    go('#/nadzorna-plosca');
  } }, 'Zapusti');

  clear(host).append(
    live,
    h('header', { class: 'room__top' }, h('a', { class: 'logo', href: '#/nadzorna-plosca', 'aria-label': 'Nadzorna plošča' }, logo()), h('div', { class: 'room__case' }, h('b', null, C.meta.title)), timerEl, teamEl, h('span', { class: 'spacer' }), statEl, chatBtn, soundBtn, leaveBtn),
    h('div', { class: 'room__body' }, nav, panelHost, chatEl));

  // ---------- pomožne funkcije stanja ----------
  const ev = () => (R.content.evidence || {});
  const discovered = () => R.progress.discovered || {};
  const solved = () => R.progress.solved || {};
  const evList = () => Object.values(ev()).sort((a, b) => a.id.localeCompare(b.id));
  const members = () => R.core ? Object.entries(R.core.members || {}) : [];
  const remainingSec = () => (R.core && R.core.deadline ? Math.max(0, (R.core.deadline - serverNow()) / 1000) : 3600);
  const isNew = (eid) => !(R.progress.opened || {})[eid];
  const suspectName = (sid) => (C.suspects.find((s) => s.id === sid) || {}).name || sid;
  const evTitle = (eid) => (ev()[eid] ? `${eid}: ${ev()[eid].title}` : eid);

  function keepFocus(fn) {
    const a = document.activeElement;
    const key = a && a.dataset && a.dataset.key;
    const st = key && panelHost.contains(a) ? { s: a.selectionStart, e: a.selectionEnd } : null;
    const sy = panelHost.scrollTop, wy = window.scrollY;
    fn();
    if (key) { const n = panelHost.querySelector(`[data-key="${CSS.escape(key)}"]`); if (n) { n.focus(); if (st && n.setSelectionRange && st.s != null) try { n.setSelectionRange(st.s, st.e); } catch (_) { /* nič */ } } }
    panelHost.scrollTop = sy; window.scrollTo(0, wy);
  }
  const draft = (key, def = '') => (R.drafts[key] !== undefined ? R.drafts[key] : def);
  const input = (key, attrs = {}) => h('input', { 'data-key': key, value: draft(key), oninput: (e) => { R.drafts[key] = e.target.value; }, ...attrs });

  // ---------- zgornja vrstica ----------
  function drawTop() {
    clear(teamEl);
    members().forEach(([uid, m]) => teamEl.append(h('span', { class: 'chip', title: `${m.username} (${m.badge})${m.away ? ' · zapustil' : ''}` }, h('span', { class: 'dot' + (R.presence[uid] === true && !m.away ? ' on' : ''), role: 'img', 'aria-label': R.presence[uid] === true ? 'povezan' : 'ni povezan' }), m.username)));
    const hints = Object.values(R.progress.hints || {}).reduce((a, b) => a + b, 0);
    clear(statEl).append(h('span', { class: 'pill' }, `Dokazi ${Object.keys(discovered()).length}/${C.evidenceTotal}`), h('span', { class: 'pill' }, `Uganke ${Object.keys(solved()).length}/${C.puzzleOrder.length}`), h('span', { class: 'pill' }, `Namigi ${hints}`));
    clear(nav);
    TABS.forEach(([k, label, ic]) => {
      let badge = null;
      if (k === 'dokumenti') { const n = Object.keys(ev()).filter(isNew).length; if (n) badge = h('span', { class: 'pill pill--new' }, `${n} ${plural(n, 'nov', 'nova', 'novi', 'novih')}`); }
      if (k === 'uganke') { const n = Object.keys(R.content.puzzles || {}).filter((p) => !solved()[p]).length; if (n) badge = h('span', { class: 'pill' }, String(n)); }
      nav.append(h('button', { class: 'room__tab', 'aria-current': R.tab === k ? 'page' : 'false', onclick: () => { R.tab = k; drawTop(); render(); } }, icon(ic), h('span', null, label), badge));
    });
  }

  // ---------- časovnik ----------
  function tick() {
    if (!R.core || !R.core.deadline) return;
    const s = remainingSec();
    const num = timerEl.firstChild, lbl = timerEl.lastChild;
    num.textContent = fmtClock(s);
    const state = s <= 60 ? 'crit' : s <= 300 ? 'high' : s <= 900 ? 'warn' : 'ok';
    timerEl.dataset.state = state;
    lbl.textContent = state === 'crit' ? 'Manj kot minuta!' : state === 'high' ? 'Manj kot 5 minut' : state === 'warn' ? 'Manj kot 15 minut' : 'preostalo';
    const marks = [[900, '15 minut do konca.', 'warn'], [300, 'Pet minut do konca!', 'warn'], [60, 'Ena minuta do konca!', 'err'], [10, 'Deset sekund!', 'err']];
    for (const [t, msg, kind] of marks) {
      if (s <= t && !R.warned.has(t)) {
        R.warned.add(t);
        if (R.warnedInit && R.core.status === 'active') { toast(msg, kind, 7000); live.textContent = msg; sound.warn(); }
      }
    }
    R.warnedInit = true;
    if (s <= 10 && s > 0 && Math.floor(s) !== R.lastTick) { R.lastTick = Math.floor(s); sound.tick(); }
    if (s <= 0 && R.core.status === 'active' && !R.timeoutCalled) {
      R.timeoutCalled = true;
      call('checkTimeout', { id }).catch(() => { R.timeoutCalled = false; });
    }
    if (!R.warnedInit0) { R.warnedInit0 = true; for (const [t] of marks) if (s <= t) R.warned.add(t); }
  }
  const timerHandle = setInterval(tick, 250);

  // ---------- dokumenti ----------
  function docViewer(e, extra) {
    if (!e) return h('div', { class: 'empty' }, 'Izberite dokument na seznamu.');
    return h('article', { class: 'doc' },
      h('header', { class: 'doc__head' }, h('div', { class: 'kicker' }, `${e.id} · ${e.category}`), h('h2', null, e.title), h('div', { class: 'muted', style: 'font-size:13px' }, `Vir: ${e.source}`, e.when && e.when !== '—' ? ` · ${e.when}` : '')),
      h('div', { class: 'doc__body' }, renderBlocks(e.blocks)), extra);
  }
  async function openDoc(eid) {
    R.selDoc = eid;
    if (isNew(eid)) { try { await call('openDocument', { id, evidenceId: eid }); } catch (e) { toast(e.message, 'err'); } }
  }
  function panelDocs() {
    const list = evList();
    const cats = [...new Set(list.map((e) => e.category))];
    const q = draft('docq').toLowerCase(), cat = draft('doccat', '');
    const shown = list.filter((e) => (!cat || e.category === cat) && (!q || (e.title + ' ' + e.summary + ' ' + e.id).toLowerCase().includes(q)));
    if (!R.selDoc && list.length) R.selDoc = list[0].id;
    const cmp = R.selDoc2 !== null;
    const listEl = h('div', { class: 'doclist' }, shown.map((e) => h('button', { class: 'docitem' + (R.selDoc === e.id ? ' is-sel' : '') + (R.selDoc2 === e.id ? ' is-sel2' : ''), onclick: () => { if (cmp && R.selDoc !== e.id) { R.selDoc2 = e.id; } else openDoc(e.id); render(); } },
      h('div', { class: 'row', style: 'gap:8px;justify-content:space-between' }, h('b', null, `${e.id}`), isNew(e.id) ? h('span', { class: 'pill pill--new' }, 'NOVO') : null), h('div', null, e.title), h('small', { class: 'muted' }, `${e.category} · ${e.when || ''}`))));
    return h('div', { class: 'split' },
      h('div', { class: 'split__side' },
        h('p', { class: 'muted', style: 'margin-bottom:8px' }, `Odkritih dokazov: ${list.length} od ${C.evidenceTotal}`),
        h('div', { class: 'field' }, h('label', { for: 'dq' }, 'Iskanje'), input('docq', { id: 'dq', placeholder: 'naslov ali oznaka', oninput: (e) => { R.drafts.docq = e.target.value; keepFocus(render); } })),
        h('div', { class: 'field' }, h('label', { for: 'dc' }, 'Kategorija'), h('select', { id: 'dc', 'data-key': 'doccat', onchange: (e) => { R.drafts.doccat = e.target.value; render(); } }, h('option', { value: '' }, 'Vse'), cats.map((c) => h('option', { value: c, selected: c === cat }, c)))),
        h('button', { class: 'btn small' + (cmp ? ' primary' : ''), onclick: () => { R.selDoc2 = cmp ? null : (list.find((e) => e.id !== R.selDoc) || {}).id || null; if (!cmp && R.selDoc2 === null) R.selDoc2 = null; render(); }, 'aria-pressed': String(cmp), disabled: list.length < 2 }, cmp ? 'Zapri primerjavo' : 'Primerjaj dva dokumenta'),
        cmp ? h('p', { class: 'hint' }, 'Primerjava: kliknite dokument na seznamu, da ga prikažete desno.') : null, listEl),
      h('div', { class: 'split__main' + (cmp ? ' is-cmp' : '') }, docViewer(ev()[R.selDoc], null), cmp ? docViewer(ev()[R.selDoc2], null) : null));
  }

  // ---------- osumljenci ----------
  function panelSuspects() {
    const sid = R.selSuspect;
    const grid = h('div', { class: 'grid c5 suspects' }, C.suspects.map((s) => h('button', { class: 'suspect' + (sid === s.id ? ' is-sel' : ''), onclick: () => { R.selSuspect = s.id; render(); } },
      portrait(s.id, 72, s.name), h('b', null, s.name), h('small', { class: 'muted' }, s.job), h('small', { class: 'muted' }, `${s.age} let`))));
    if (!sid) return h('div', null, h('p', { class: 'muted' }, 'Izberite osumljenca, da si ogledate profil in ga zaslišite.'), grid);
    const s = C.suspects.find((x) => x.id === sid);
    const qs = C.questions[sid] || [];
    const asked = R.content.interviews || {};
    const thread = qs.filter((q) => asked[q.id]).map((q) => asked[q.id]).sort((a, b) => a.ts - b.ts);
    const rel = evList().filter((e) => (e.suspects || []).includes(sid));
    return h('div', null, grid, h('div', { class: 'grid c2', style: 'margin-top:18px;align-items:start' },
      h('div', { class: 'card' }, h('h2', null, s.name), h('p', { class: 'muted' }, `${s.age} let · ${s.job}`),
        h('dl', { class: 'kvl' }, h('dt', null, 'Povezava z žrtvijo'), h('dd', null, s.relation), h('dt', null, 'Možen motiv'), h('dd', null, s.possibleMotive), h('dt', null, 'Začetna izjava'), h('dd', null, h('em', null, `»${s.statement}«`)), h('dt', null, 'Alibi (po lastni izjavi)'), h('dd', null, s.alibi)),
        h('h3', { style: 'margin-top:16px' }, 'Povezani dokazi'), rel.length ? h('div', { class: 'row', style: 'gap:6px' }, rel.map((e) => h('button', { class: 'pill', style: 'cursor:pointer', onclick: () => { R.tab = 'dokumenti'; openDoc(e.id); drawTop(); render(); } }, e.id))) : h('p', { class: 'muted' }, 'Še ni odkritih dokazov, povezanih z njim.')),
      h('div', { class: 'card' }, h('h3', null, 'Zaslišanje'),
        h('div', { class: 'thread', role: 'log', 'aria-label': 'Pogovor' }, thread.length ? thread.map((t) => [h('div', { class: 'bubble bubble--q' }, h('small', null, `${t.by} vpraša:`), t.question), h('div', { class: 'bubble bubble--a' }, h('small', null, s.name), t.answer)]) : h('p', { class: 'muted' }, 'Še niste postavili nobenega vprašanja.')),
        h('div', { class: 'qlist' }, qs.map((q) => {
          const open = cond(R.progress, q.requires); const done = !!asked[q.id];
          return h('button', { class: 'q' + (done ? ' is-done' : ''), disabled: !open, 'aria-disabled': String(!open), onclick: async (e) => {
            const b = e.currentTarget; b.disabled = true;
            try { await call('askQuestion', { id, qid: q.id }); } catch (er) { toast(er.message, 'err'); b.disabled = false; }
          } }, !open ? icon('lock', 15) : done ? icon('check', 15) : icon('chat', 15), h('span', null, q.text), done ? h('small', { class: 'muted' }, ' (ponovno vprašaj)') : null, !open ? h('small', { class: 'muted' }, ' (zaklenjeno: potrebni so novi dokazi ali ugotovitve)') : null);
        })))));
  }

  // ---------- uganke ----------
  function caesar(text, shift, alpha) { return [...text.toUpperCase()].map((c) => { const i = alpha.indexOf(c); return i < 0 ? c : alpha[(i + shift + alpha.length * 10) % alpha.length]; }).join(''); }
  function panelPuzzles() {
    const open = R.content.puzzles || {};
    const order = C.puzzleOrder;
    if (!R.selPuzzle) R.selPuzzle = (order.find((p) => open[p.id] && !solved()[p.id]) || order[0]).id;
    const list = h('div', { class: 'plist' }, order.map((p) => {
      const st = solved()[p.id] ? 'solved' : open[p.id] ? 'open' : 'locked';
      return h('button', { class: 'pitem' + (R.selPuzzle === p.id ? ' is-sel' : ''), onclick: () => { R.selPuzzle = p.id; render(); } },
        icon(st === 'solved' ? 'check' : st === 'locked' ? 'lock' : 'puzzle', 16), h('span', null, `${p.order}. ${st === 'locked' ? 'Zaklenjena uganka' : p.title}`),
        h('span', { class: `pill ${st === 'solved' ? 'pill--ok' : st === 'open' ? 'pill--warn' : ''}` }, st === 'solved' ? 'Rešeno' : st === 'open' ? 'Odprto' : 'Zaklenjeno'));
    }));
    const pid = R.selPuzzle, def = open[pid];
    let main;
    if (!def) main = h('div', { class: 'card' }, h('h2', null, 'Uganka je zaklenjena'), h('p', { class: 'muted' }, 'Odklene se, ko odkrijete potrebne dokaze ali rešite predhodne uganke.'));
    else {
      const hints = Object.values((R.content.hints || {})[pid] || {}).sort((a, b) => a.n - b.n);
      const isSolved = !!solved()[pid];
      const feedback = h('div', { class: 'err', hidden: true, role: 'alert' });
      const fields = def.fields.map((f) => {
        const k = `pz-${pid}-${f.id}`;
        if (f.type === 'select') return h('div', { class: 'field' }, h('label', { for: k }, f.label), h('select', { id: k, 'data-key': k, disabled: isSolved, onchange: (e) => { R.drafts[k] = e.target.value; } }, h('option', { value: '' }, '— izberite —'), f.options.map((o) => h('option', { value: o, selected: draft(k) === o }, o))));
        if (f.type === 'order') {
          const cur = draft(k, null) || f.items.map((i) => i.id);
          R.drafts[k] = cur;
          const move = (i, d) => { const a = [...cur]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; R.drafts[k] = a; keepFocus(render); };
          return h('div', { class: 'field' }, h('span', { class: 'label' }, `${f.label} (od najzgodnejšega do najkasnejšega)`), h('ol', { class: 'order' }, cur.map((iid, i) => { const it = f.items.find((x) => x.id === iid); return h('li', null, h('span', null, it.text), h('span', { class: 'order__btns' }, h('button', { class: 'iconbtn', 'aria-label': `Premakni višje: ${it.text}`, disabled: isSolved || i === 0, onclick: () => move(i, -1) }, '↑'), h('button', { class: 'iconbtn', 'aria-label': `Premakni nižje: ${it.text}`, disabled: isSolved || i === cur.length - 1, onclick: () => move(i, 1) }, '↓'))); })));
        }
        return h('div', { class: 'field' }, h('label', { for: k }, f.label), input(k, { id: k, placeholder: f.placeholder || '', disabled: isSolved, inputmode: f.type === 'number' ? 'text' : null, autocomplete: 'off', maxlength: 60 }));
      });
      const hintBtn = busyButton(h('button', { class: 'btn small', disabled: isSolved || hints.length >= def.maxHints }, icon('hint', 15), hints.length >= def.maxHints ? 'Vsi namigi uporabljeni' : `Uporabi namig ${hints.length + 1}/${def.maxHints} (−${C.meta.hintPenalty} točk)`), async () => {
        if (!(await confirmBox('Uporaba namiga', `Namig stane ${C.meta.hintPenalty} točk. Namige uporablja vsa ekipa skupaj. Nadaljujem?`, 'Uporabi namig'))) return;
        try { await call('useHint', { id, puzzleId: pid }); } catch (e) { toast(e.message, 'err'); }
      });
      const submit = busyButton(h('button', { class: 'btn primary', disabled: isSolved }, 'Preveri odgovor'), async () => {
        feedback.hidden = true;
        const ans = {};
        for (const f of def.fields) { const v = R.drafts[`pz-${pid}-${f.id}`]; ans[f.id] = f.type === 'order' ? (v || f.items.map((i) => i.id)) : (v ?? ''); }
        try {
          const r = await call('submitPuzzle', { id, puzzleId: pid, answer: ans });
          if (r.correct) { sound.ok(); toast('Pravilno! Uganka je rešena.', 'ok'); } else { sound.bad(); feedback.textContent = r.feedback + (r.lockSeconds ? ` Zaklenjeno za ${r.lockSeconds} s.` : ''); feedback.hidden = false; }
        } catch (e) { sound.bad(); feedback.textContent = e.message; feedback.hidden = false; }
      });
      let tool = null;
      if (def.tool === 'caesar') {
        const shiftK = 'caesar-shift', textK = 'caesar-text';
        const out = h('output', { class: 'mono', style: 'display:block;padding:10px;background:var(--ink-0);border-radius:6px;min-height:42px;letter-spacing:.12em' });
        const upd = () => { out.textContent = caesar(draft(textK), -Number(draft(shiftK, 1)), C.alphabet); };
        tool = h('div', { class: 'card tool' }, h('h4', null, 'Pripomoček: premik po abecedi'), h('p', { class: 'hint' }, `Abeceda (${C.alphabet.length} črk): ${[...C.alphabet].join(' ')}. Vnesite šifrirano besedilo in premik: pripomoček vsako črko premakne NAZAJ po abecedi.`),
          h('div', { class: 'grid c2' }, h('div', { class: 'field' }, h('label', { for: textK }, 'Šifrirano besedilo'), input(textK, { id: textK, oninput: (e) => { R.drafts[textK] = e.target.value; upd(); } })), h('div', { class: 'field' }, h('label', { for: shiftK }, 'Premik (1–24)'), h('input', { id: shiftK, 'data-key': shiftK, type: 'number', min: 1, max: 24, value: draft(shiftK, 1), oninput: (e) => { R.drafts[shiftK] = e.target.value; upd(); } }))), out);
        upd();
      }
      main = h('div', { class: 'card' }, h('div', { class: 'kicker' }, def.kind), h('h2', null, def.title), isSolved ? h('p', null, h('span', { class: 'pill pill--ok' }, `Rešeno: ${solved()[pid].name}`)) : null, h('p', null, def.intro), tool, feedback, h('form', { onsubmit: (e) => e.preventDefault() }, fields),
        h('div', { class: 'row' }, submit, hintBtn),
        hints.length ? h('div', { style: 'margin-top:16px' }, h('h3', null, 'Uporabljeni namigi'), hints.map((x) => h('div', { class: 'hintbox' }, h('b', null, `Namig ${x.n}`), h('span', { class: 'muted' }, ` (${x.by})`), h('p', null, x.text)))) : null);
    }
    return h('div', { class: 'split' }, h('div', { class: 'split__side' }, list), h('div', { class: 'split__main' }, main));
  }

  // ---------- tabla ----------
  function posOf(eid, i) { return R.localPos[eid] || (R.board.pos || {})[eid] || { x: 24 + (i % 4) * (CARD_W + 26), y: 24 + Math.floor(i / 4) * (CARD_H + 30) }; }
  function panelBoard() {
    const list = evList();
    const pins = R.board.pins || {}, links = R.board.links || {}, notes = R.board.notes || {};
    const idx = {}; list.forEach((e, i) => { idx[e.id] = i; });
    const W = Math.max(960, ...list.map((e, i) => posOf(e.id, i).x + CARD_W + 30)), Hh = Math.max(560, ...list.map((e, i) => posOf(e.id, i).y + CARD_H + 30));
    const svg = h('svg', { class: 'board__lines', width: W, height: Hh, 'aria-hidden': 'true' });
    function drawLines() {
      clear(svg);
      Object.entries(links).forEach(([k, l]) => {
        if (idx[l.a] === undefined || idx[l.b] === undefined) return;
        const pa = posOf(l.a, idx[l.a]), pb = posOf(l.b, idx[l.b]);
        svg.append(h('line', { x1: pa.x + CARD_W / 2, y1: pa.y + CARD_H / 2, x2: pb.x + CARD_W / 2, y2: pb.y + CARD_H / 2, class: l.confirmed ? 'lnk lnk--ok' : 'lnk lnk--hyp' }));
      });
    }
    const cards = list.map((e, i) => {
      const p = posOf(e.id, i);
      const card = h('div', { class: 'ecard' + (pins[e.id] ? ' is-pin' : '') + (R.linkFrom === e.id ? ' is-from' : '') + (R.linkFrom && R.linkFrom !== e.id ? ' is-target' : ''), style: `left:${p.x}px;top:${p.y}px;width:${CARD_W}px;min-height:${CARD_H}px`, 'data-eid': e.id },
        h('div', { class: 'ecard__head', title: 'Povlecite za premik' }, h('span', { class: 'mono' }, e.id), isNew(e.id) ? h('span', { class: 'pill pill--new' }, 'NOVO') : null, h('span', { class: 'spacer' }), h('button', { class: 'iconbtn sm', 'aria-pressed': String(!!pins[e.id]), 'aria-label': pins[e.id] ? `Odstrani oznako pomembnosti: ${e.title}` : `Označi kot pomembno: ${e.title}`, onclick: (ev2) => { ev2.stopPropagation(); call('boardAction', { id, action: 'togglePin', evidenceId: e.id }).catch((er) => toast(er.message, 'err')); } }, icon('star', 15))),
        h('button', { class: 'ecard__title', onclick: () => { if (R.linkFrom && R.linkFrom !== e.id) return finishLink(e.id); R.tab = 'dokumenti'; openDoc(e.id); drawTop(); render(); } }, e.title),
        h('div', { class: 'muted', style: 'font-size:12px' }, e.category),
        h('button', { class: 'btn small ghost', style: 'margin-top:6px', onclick: () => { if (R.linkFrom === e.id) { R.linkFrom = null; render(); } else if (R.linkFrom) finishLink(e.id); else { R.linkFrom = e.id; render(); } } }, icon('link', 14), R.linkFrom === e.id ? 'Prekliči' : R.linkFrom ? 'Poveži sem' : 'Poveži'));
      // vlečenje
      const head = card.firstChild;
      head.addEventListener('pointerdown', (d) => {
        if (d.target.closest('button')) return;
        d.preventDefault(); R.dragging = true;
        const sx = d.clientX, sy = d.clientY, ox = p.x, oy = p.y;
        head.setPointerCapture(d.pointerId);
        const mv = (m) => { const x = Math.max(0, ox + m.clientX - sx), y = Math.max(0, oy + m.clientY - sy); R.localPos[e.id] = { x, y }; card.style.left = `${x}px`; card.style.top = `${y}px`; drawLines(); };
        const up = () => { head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); R.dragging = false; const q = R.localPos[e.id]; if (q) call('boardAction', { id, action: 'moveCard', evidenceId: e.id, x: q.x, y: q.y }).catch(() => {}); if (R.pendingRender) { R.pendingRender = false; render(); } };
        head.addEventListener('pointermove', mv); head.addEventListener('pointerup', up);
      });
      return card;
    });
    drawLines();
    const board = h('div', { class: 'board', style: `width:${W}px;height:${Hh}px` }, svg, cards);
    const linkRows = Object.entries(links);
    const findings = Object.values(R.content.findings || {}).sort((a, b) => a.ts - b.ts);
    const noteForm = (() => {
      const evSel = h('select', { 'data-key': 'note-ev', onchange: (e) => { R.drafts['note-ev'] = e.target.value; } }, h('option', { value: '' }, 'brez dokaza'), evList().map((e) => h('option', { value: e.id, selected: draft('note-ev') === e.id }, `${e.id}: ${e.title}`)));
      const suSel = h('select', { 'data-key': 'note-su', onchange: (e) => { R.drafts['note-su'] = e.target.value; } }, h('option', { value: '' }, 'brez osumljenca'), C.suspects.map((s) => h('option', { value: s.id, selected: draft('note-su') === s.id }, s.name)));
      const colSel = h('select', { 'data-key': 'note-col', 'aria-label': 'Barva zapiska', onchange: (e) => { R.drafts['note-col'] = e.target.value; } }, NOTE_COLORS.map((c) => h('option', { value: c, selected: draft('note-col', 'rumena') === c }, c)));
      const ta = h('textarea', { 'data-key': 'note-text', maxlength: 600, placeholder: 'Skupni zapisek ekipe …', 'aria-label': 'Besedilo zapiska', oninput: (e) => { R.drafts['note-text'] = e.target.value; } }, draft('note-text'));
      const add = busyButton(h('button', { class: 'btn small primary' }, icon('plus', 14), 'Dodaj zapisek'), async () => {
        const text = (R.drafts['note-text'] || '').trim(); if (!text) return toast('Vpišite besedilo zapiska.', 'warn');
        try { await call('boardAction', { id, action: 'addNote', text, evidenceId: R.drafts['note-ev'] || null, suspectId: R.drafts['note-su'] || null, color: R.drafts['note-col'] || 'rumena' }); R.drafts['note-text'] = ''; } catch (e) { toast(e.message, 'err'); }
      });
      return h('div', { class: 'card' }, h('h3', null, 'Skupni zapiski'), ta, h('div', { class: 'grid c2' }, evSel, suSel), h('div', { class: 'row', style: 'margin-top:8px' }, colSel, add));
    })();
    const noteList = Object.entries(notes).sort((a, b) => a[1].ts - b[1].ts).map(([k, n]) => h('div', { class: `note note--${n.color || 'rumena'}` }, h('p', null, n.text), h('small', null, `${n.name} · ${fmtTime(n.ts)}`, n.evidenceId ? ` · ${n.evidenceId}` : '', n.suspectId ? ` · ${suspectName(n.suspectId)}` : ''),
      h('button', { class: 'iconbtn sm', 'aria-label': 'Izbriši zapisek', onclick: () => call('boardAction', { id, action: 'deleteNote', noteId: k }).catch((e) => toast(e.message, 'err')) }, icon('x', 14))));
    return h('div', { class: 'boardwrap' },
      R.linkFrom ? h('div', { class: 'okmsg', role: 'status' }, `Povezovanje: izbran je dokaz ${R.linkFrom}. Izberite drugi dokaz (»Poveži sem«) ali prekličite.`) : h('p', { class: 'muted' }, 'Povlecite kartice po tabli, označite pomembne dokaze z zvezdico in jih povežite. Strežnik preveri vsako povezavo; potrjena povezava odkrije ugotovitev, nepotrjena ostane kot hipoteza (črtkana).'),
      h('div', { class: 'boardscroll', tabindex: '0', role: 'region', 'aria-label': 'Preiskovalna tabla' }, board),
      h('div', { class: 'grid c2', style: 'margin-top:16px;align-items:start' },
        h('div', null, h('div', { class: 'card' }, h('h3', null, `Ugotovitve (${findings.length})`), findings.length ? findings.map((f) => h('div', { class: 'finding' }, icon('star', 15), h('div', null, h('div', null, f.text), h('small', { class: 'muted' }, `${f.a} ↔ ${f.b}`)))) : h('p', { class: 'muted' }, 'Še ni potrjenih povezav.')),
          h('div', { class: 'card', style: 'margin-top:16px' }, h('h3', null, `Povezave (${linkRows.length})`), linkRows.length ? linkRows.map(([k, l]) => h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:6px' }, h('span', null, `${l.a} ↔ ${l.b} `, h('span', { class: `pill ${l.confirmed ? 'pill--ok' : ''}` }, l.confirmed ? 'potrjena' : 'hipoteza')), h('button', { class: 'btn small ghost', onclick: () => call('boardAction', { id, action: 'removeLink', key: k }).catch((e) => toast(e.message, 'err')) }, 'Odstrani'))) : h('p', { class: 'muted' }, 'Ni povezav.'))),
        h('div', null, noteForm, h('div', { class: 'notes' }, noteList))));
  }
  async function finishLink(b) {
    const a = R.linkFrom; R.linkFrom = null;
    try {
      const r = await call('boardAction', { id, action: 'addLink', a, b });
      if (r.confirmed && !r.exists) { sound.find(); toast(`Nova ugotovitev: ${r.finding}`, 'find', 9000); }
      else if (r.exists) toast('Ta povezava že obstaja.', 'info', 2500);
      else toast('Povezava je shranjena kot hipoteza (strežnik je ni potrdil).', 'info', 4000);
    } catch (e) { toast(e.message, 'err'); }
    render();
  }

  // ---------- časovnica ----------
  function panelTimeline() {
    const tl = Object.entries(R.board.timeline || {}).map(([k, v]) => ({ k, ...v }));
    const key = (t) => { const [hh, mm] = t.split(':').map(Number); return (hh < 12 ? hh + 24 : hh) * 60 + mm; };
    tl.sort((a, b) => key(a.time) - key(b.time));
    const add = busyButton(h('button', { class: 'btn primary small' }, icon('plus', 14), 'Dodaj v časovnico'), async () => {
      try { await call('boardAction', { id, action: 'addTimeline', time: R.drafts['tl-time'], text: R.drafts['tl-text'], evidenceId: R.drafts['tl-ev'] || null, suspectId: R.drafts['tl-su'] || null }); R.drafts['tl-text'] = ''; } catch (e) { toast(e.message, 'err'); }
    });
    return h('div', null, h('div', { class: 'card art-plan-card' }, floorPlan()), h('div', { class: 'grid c2', style: 'align-items:start;margin-top:16px' },
      h('div', { class: 'card' }, h('h3', null, 'Sestavljanje časovnice'), h('p', { class: 'muted' }, 'Vnesite čas v LOKALNEM času (HH:MM). Pazite: dnevnik dostopa ni nujno v lokalnem času.'),
        h('div', { class: 'field' }, h('label', { for: 'tlt' }, 'Ura'), input('tl-time', { id: 'tlt', placeholder: '23:15', maxlength: 5 })),
        h('div', { class: 'field' }, h('label', { for: 'tlx' }, 'Dogodek'), input('tl-text', { id: 'tlx', maxlength: 200, placeholder: 'npr. Pirc vstopi skozi stranski vhod' })),
        h('div', { class: 'grid c2' }, h('div', { class: 'field' }, h('label', { for: 'tle' }, 'Dokaz'), h('select', { id: 'tle', 'data-key': 'tl-ev', onchange: (e) => { R.drafts['tl-ev'] = e.target.value; } }, h('option', { value: '' }, '—'), evList().map((e) => h('option', { value: e.id, selected: draft('tl-ev') === e.id }, `${e.id}: ${e.title}`)))),
          h('div', { class: 'field' }, h('label', { for: 'tls' }, 'Osumljenec'), h('select', { id: 'tls', 'data-key': 'tl-su', onchange: (e) => { R.drafts['tl-su'] = e.target.value; } }, h('option', { value: '' }, '—'), C.suspects.map((s) => h('option', { value: s.id, selected: draft('tl-su') === s.id }, s.name))))), add),
      h('div', { class: 'card' }, h('h3', null, `Skupna časovnica (${tl.length})`), tl.length ? h('ol', { class: 'tl' }, tl.map((t) => h('li', null, h('b', { class: 'mono' }, t.time), h('div', null, t.text, h('div', { class: 'muted', style: 'font-size:12px' }, [t.suspectId ? suspectName(t.suspectId) : null, t.evidenceId, `dodal ${t.name}`].filter(Boolean).join(' · '))), h('button', { class: 'iconbtn sm', 'aria-label': 'Izbriši vnos', onclick: () => call('boardAction', { id, action: 'deleteTimeline', entryId: t.k }).catch((e) => toast(e.message, 'err')) }, icon('x', 14))))) : h('p', { class: 'muted' }, 'Časovnica je prazna.'))));
  }

  // ---------- dnevnik ----------
  function panelLog() {
    const evs = Object.values(R.events).sort((a, b) => a.ts - b.ts);
    const t0 = R.core && R.core.startedAt;
    return h('div', { class: 'card' }, h('h3', null, 'Dnevnik preiskave'), h('ol', { class: 'logl' }, evs.map((e) => h('li', null, h('span', { class: 'mono muted' }, t0 ? `+${fmtClock((e.ts - t0) / 1000)}` : ''), h('span', { class: 'mono muted' }, fmtTime(e.ts)), h('span', null, e.text)))));
  }

  // ---------- obtožba ----------
  function panelAccuse() {
    const acc = Object.values(R.progress.accusations || {}).sort((a, b) => a.ts - b.ts);
    const used = acc.length, max = C.meta.maxAccusations;
    const open = !!solved().P7 || remainingSec() <= 600;
    const status = h('div', { class: 'card' }, h('h3', null, 'Stanje obtožb'), h('p', null, `Porabljene obtožbe: ${used}/${max}. Napačna obtožba stane ${C.meta.wrongAccusationPenalty} točk.`), acc.map((a, i) => h('div', { class: 'row', style: 'gap:8px' }, h('span', { class: `pill ${a.success ? 'pill--ok' : 'pill--bad'}` }, a.success ? 'Pravilna' : 'Napačna'), h('span', null, `Obtožba ${i + 1} (${a.name}): pravilnih ${a.requiredCorrect} od 4 obveznih elementov.`))));
    if (!open) return h('div', null, h('div', { class: 'card' }, h('div', { class: 'row' }, icon('lock', 26), h('div', null, h('h2', { style: 'margin:0' }, 'Končna obtožba je zaklenjena'), h('p', { class: 'muted', style: 'margin:0' }, 'Odklene se, ko rešite zadnjo uganko (7. Zaklenjena vrata) ali ko ostane manj kot 10 minut.'))), h('p', { style: 'margin-top:14px' }, `Rešenih ugank: ${Object.keys(solved()).length}/${C.puzzleOrder.length}.`)), status);
    if (used >= max) return h('div', null, h('div', { class: 'card' }, h('h2', null, 'Vse obtožbe so porabljene')), status);
    const fieldsEl = C.accusation.fields.map((f) => {
      const k = `acc-${f.id}`;
      if (f.type === 'select') return h('div', { class: 'field' }, h('label', { for: k }, `${f.label}${f.required ? ' *' : ' (neobvezno)'}`), h('select', { id: k, 'data-key': k, onchange: (e) => { R.drafts[k] = e.target.value; } }, h('option', { value: '' }, '— izberite —'), f.options.map((o) => h('option', { value: o.id, selected: draft(k) === o.id }, o.text))));
      const sel = draft(k, []);
      return h('fieldset', { class: 'field' }, h('legend', { class: 'label' }, f.label), h('div', { class: 'checks' }, evList().map((e) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: sel.includes(e.id), 'data-key': `${k}-${e.id}`, onchange: (c) => { const cur = new Set(draft(k, [])); if (c.target.checked) { if (cur.size >= f.max) { c.target.checked = false; return toast(`Izberete lahko največ ${f.max} dokazov.`, 'warn'); } cur.add(e.id); } else cur.delete(e.id); R.drafts[k] = [...cur]; } }), `${e.id}: ${e.title}`))));
    });
    const err = h('div', { class: 'err', hidden: true, role: 'alert' });
    const send = busyButton(h('button', { class: 'btn primary' }, icon('gavel', 16), 'Oddaj končno obtožbo'), async () => {
      err.hidden = true;
      const form = {}; for (const f of C.accusation.fields) { const v = R.drafts[`acc-${f.id}`]; if (v && v.length) form[f.id] = v; }
      const miss = C.accusation.fields.find((f) => f.required && !form[f.id]);
      if (miss) { err.textContent = `Izpolnite polje »${miss.label}«.`; err.hidden = false; return; }
      const sure = await confirmBox('Oddaja končne obtožbe', `To je obtožba ${used + 1} od ${max}. Napačna obtožba stane ${C.meta.wrongAccusationPenalty} točk, po ${max}. napačni je preiskava neuspešna. Ste prepričani?`, 'Oddaj obtožbo', true);
      if (!sure) return;
      try {
        const r = await call('submitAccusation', { id, form });
        if (r.success) { sound.win(); toast('Obtožba je pravilna!', 'ok'); }
        else if (r.expired) toast(r.message, 'err');
        else { sound.bad(); toast(r.exhausted ? 'Porabili ste vse obtožbe.' : `Obtožba ni pravilna: pravilnih ${r.requiredCorrect} od ${r.requiredTotal}. Preostalo obtožb: ${r.remaining}.`, 'err', 8000); }
      } catch (e) { err.textContent = e.message; err.hidden = false; }
    });
    return h('div', { class: 'grid c2', style: 'align-items:start' }, h('div', { class: 'card card--glow' }, h('div', { class: 'kicker' }, 'Uradno kriminalistično poročilo'), h('h2', null, 'Končna obtožba'), h('p', { class: 'muted' }, 'Izpolnite poročilo skupaj z ekipo. Za uspeh morajo biti pravilni storilec, motiv, način izvedbe in časovna rekonstrukcija.'), err, h('form', { onsubmit: (e) => e.preventDefault() }, fieldsEl), send), status);
  }

  // ---------- klepet ----------
  function drawChat() {
    const msgs = Object.values(R.chat).sort((a, b) => a.ts - b.ts);
    const unread = R.chatOpen ? 0 : msgs.filter((m) => m.uid !== S.user.uid && m.ts > R.chatSeen).length;
    chatBtn.replaceChildren(...[icon('chat'), unread ? h('span', { class: 'pill pill--new', style: 'margin-left:2px' }, String(unread)) : null].filter(Boolean));
    if (!R.chatOpen) return;
    const log = h('div', { class: 'chat__log', role: 'log', 'aria-live': 'polite' }, msgs.map((m) => h('div', { class: 'msg' + (m.uid === S.user.uid ? ' me' : '') }, h('small', null, `${m.name} · ${fmtTime(m.ts)}`), h('div', null, m.text))));
    const inp = h('input', { maxlength: 300, placeholder: 'Sporočilo ekipi …', 'aria-label': 'Sporočilo ekipi', 'data-key': 'chat-in', value: draft('chat-in'), oninput: (e) => { R.drafts['chat-in'] = e.target.value; } });
    const f = h('form', { class: 'chat__form', onsubmit: async (e) => { e.preventDefault(); const t = inp.value.trim(); if (!t) return; inp.value = ''; R.drafts['chat-in'] = ''; try { await call('sendChat', { id, text: t }); } catch (er) { toast(er.message, 'err'); } } }, inp, h('button', { class: 'btn small primary' }, 'Pošlji'));
    clear(chatEl).append(h('div', { class: 'chat__head' }, h('b', null, 'Klepet ekipe'), h('button', { class: 'iconbtn', 'aria-label': 'Zapri klepet', onclick: () => toggleChat() }, icon('x'))), log, f);
    log.scrollTop = log.scrollHeight;
  }
  function toggleChat() { R.chatOpen = !R.chatOpen; chatEl.hidden = !R.chatOpen; if (R.chatOpen) { R.chatSeen = Date.now() + 1e6; } drawChat(); if (R.chatOpen) { const i = $('input', chatEl); if (i) i.focus(); } }

  // ---------- izris ----------
  const PANELS = { tabla: panelBoard, dokumenti: panelDocs, osumljenci: panelSuspects, uganke: panelPuzzles, casovnica: panelTimeline, dnevnik: panelLog, obtozba: panelAccuse };
  function render() {
    if (!R.core) return;
    if (R.dragging) { R.pendingRender = true; return; }
    keepFocus(() => { clear(panelHost).append(PANELS[R.tab]()); });
  }
  function onEvents() {
    const keys = Object.keys(R.events);
    if (R.seenEvents === null) { R.seenEvents = new Set(keys); return; }
    for (const k of keys) {
      if (R.seenEvents.has(k)) continue;
      R.seenEvents.add(k);
      const e = R.events[k];
      if (e.type === 'evidence') { sound.find(); toast(e.text, 'find', 6000); }
      else if (e.type === 'puzzle' && e.uid !== S.user.uid) { sound.ok(); toast(e.text, 'ok'); }
      else if (e.type === 'hint' && e.uid !== S.user.uid) toast(e.text, 'warn');
      else if ((e.type === 'join' || e.type === 'leave') && e.uid !== S.user.uid) toast(e.text, 'info');
      else if (e.type === 'accusation' && e.uid !== S.user.uid) toast(e.text, 'warn');
      else if (e.type === 'finding' && !R.suppressFinding) { sound.find(); toast(e.text, 'find', 8000); }
    }
  }
  function checkFinished() {
    if (!R.core || R.finishedRouted) return;
    if (FINISHED.includes(R.core.status)) { R.finishedRouted = true; setTimeout(() => go(`#/rezultat/${id}`), 900); toast(R.core.status === 'success' ? 'Preiskava je uspešno zaključena!' : 'Preiskava je zaključena.', R.core.status === 'success' ? 'ok' : 'err'); }
    else if (R.core.status === 'lobby') go(`#/lobby/${id}`);
  }

  const upd = (key, fn) => (v) => { fn(v || {}); R.loaded.add(key); if (R.loaded.size >= 7) { if (!R.ready) { R.ready = true; tick(); } drawTop(); render(); drawChat(); } checkFinished(); };
  const subs = [
    watch(`investigations/${id}/core`, (v) => { if (!v) return go('#/nadzorna-plosca'); R.core = v; R.loaded.add('core'); if (R.loaded.size >= 7) { R.ready = true; } tick(); drawTop(); render(); checkFinished(); }, () => go('#/nadzorna-plosca')),
    watch(`investigations/${id}/progress`, upd('progress', (v) => { R.progress = v; })),
    watch(`investigations/${id}/content`, upd('content', (v) => { R.content = v; })),
    watch(`investigations/${id}/board`, upd('board', (v) => { R.board = v; for (const k of Object.keys(R.localPos)) if (!R.dragging) delete R.localPos[k]; })),
    watch(`investigations/${id}/chat`, upd('chat', (v) => { R.chat = v; })),
    watch(`investigations/${id}/events`, upd('events', (v) => { R.events = v; onEvents(); })),
    watch(`presence/${id}`, upd('presence', (v) => { R.presence = v; })),
  ];
  const pres = startPresence(id, S.user.uid);
  return () => { subs.forEach((u) => u()); clearInterval(timerHandle); stopPresence(id, S.user.uid, pres); };
}
