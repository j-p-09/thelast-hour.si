// Zaslon Primera 002: virtualna soba. Vse odločitve (kaj odkrijete, ali je koda prava, rezultat) sprejme strežnik.
import { shell, go, S } from './app.js';
import { h, clear, icon, logo, busyButton, toast, confirmBox, sound, soundSettings, spinner, fmtClock, $ } from './ui.js';
import { call, watch, serverNow, startPresence, stopPresence } from './backend.js';
import { createEngine } from './room3d-engine.js';
import { createRealEngine } from './room3d-real.js';
import { buildScene, OBJECT_LABELS } from './room3d-scene.js';
import { CASE2_META as M, SUSPECTS, ACCUSE_FORM } from './room3d-data.js';
import { DEFAULT_AVATAR, PALETTES, STYLES, ACCS, BUILDS, cleanAv, drawAvatar2D } from './room3d-avatar.js';

const FINISHED = ['success', 'failed', 'expired', 'aborted'];

export async function room3dScreen(id) {
  const R = { id, core: null, progress: {}, content: {}, chat: {}, events: {}, presence: {}, loaded: new Set(), tab: 'sledi', notebook: false, flash: false, uv: false, seen: null, warned: new Set(), drafts: {}, introDone: false, finished: false };
  const host = h('div', { class: 'r3' }, spinner('Odpiram sobo …'));
  shell(host, { bare: true });

  const makeCanvas = () => h('canvas', { class: 'r3__canvas', tabindex: '0', 'aria-label': 'Virtualna soba. Premikajte se s tipkami W A S D, predmete pregledate s klikom.' });
  let canvas = makeCanvas();
  let quality = 'light'; try { quality = localStorage.getItem('tlh.r3.quality') === 'real' ? 'real' : 'light'; } catch (_) { /* nič */ }
  const qLabel = () => (quality === 'real' ? 'Kakovost: realistična' : 'Kakovost: lahka');
  const qBtn = h('button', { class: 'btn small', onclick: () => setQuality(quality === 'real' ? 'light' : 'real') }, qLabel());
  const timerEl = h('div', { class: 'timer', role: 'timer', 'aria-label': 'Preostali čas' }, h('span', { class: 'timer__num' }, '60:00'), h('span', { class: 'timer__lbl' }, ''));
  const teamEl = h('div', { class: 'team' });
  const statEl = h('div', { class: 'room__stats' });
  const tip = h('div', { class: 'r3__tip', hidden: true });
  const invEl = h('div', { class: 'r3__inv' });
  const dialogHost = h('div', { class: 'r3__dialogs' });
  const nbHost = h('aside', { class: 'r3__nb', hidden: true, 'aria-label': 'Beležnica preiskave' });
  const live = h('div', { class: 'sr-only', 'aria-live': 'assertive' });
  const leaveBtn = h('button', { class: 'btn ghost small', onclick: async () => {
    if (!(await confirmBox('Zapusti preiskavo?', 'Preiskava teče naprej in odštevanje se ne ustavi. Pridružite se lahko znova s kodo za povabilo.', 'Zapusti', true))) return;
    try { await call('leaveInvestigation', { id }); } catch (_) { /* nič */ }
    go('#/nadzorna-plosca');
  } }, 'Zapusti');
  const nbBtn = h('button', { class: 'btn small', onclick: () => toggleNb() }, icon('docs'), ' Beležnica');
  const soundBtn = h('button', { class: 'iconbtn', 'aria-label': 'Zvok in glasba', title: 'Zvok in glasba', onclick: (e) => { const b = e.currentTarget; soundSettings(() => b.replaceChildren(icon(sound.on ? 'sound' : 'mute'))); } }, icon(sound.on ? 'sound' : 'mute'));

  // krmilne tipke za dotik
  const padBtn = (label, key, aria) => {
    const b = h('button', { class: 'r3__pad', 'aria-label': aria, type: 'button' }, label);
    const on = (e) => { e.preventDefault(); setPad(key, 1); b.classList.add('on'); }; const off = () => { setPad(key, 0); b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off); return b;
  };
  const pad = { f: 0, s: 0, r: 0 };
  function setPad(k, v) { if (k === 'f+') pad.f = v; else if (k === 'f-') pad.f = -v; else if (k === 's+') pad.s = v; else if (k === 's-') pad.s = -v; else if (k === 'r+') pad.r = v; else if (k === 'r-') pad.r = -v; if (eng) eng.pad(pad.f, pad.s, pad.r); }
  const dpad = h('div', { class: 'r3__dpad' }, padBtn('▲', 'f+', 'Naprej'), padBtn('◀', 's-', 'Levo'), padBtn('▼', 'f-', 'Nazaj'), padBtn('▶', 's+', 'Desno'));
  const turn = h('div', { class: 'r3__turn' }, padBtn('⟲', 'r-', 'Obrni levo'), padBtn('⟳', 'r+', 'Obrni desno'));
  const flashBtn = h('button', { class: 'btn small', onclick: () => toggleFlash() }, 'Svetilka (F)');
  const GAINS = [['Svetlost: srednja', 1.25], ['Svetlost: visoka', 1.8], ['Svetlost: nizka', 0.8]];
  let gainI = 0;
  const gainBtn = h('button', { class: 'btn small', onclick: () => { gainI = (gainI + 1) % GAINS.length; gainBtn.textContent = GAINS[gainI][0]; if (eng) eng.setGain(GAINS[gainI][1]); } }, GAINS[0][0]);
  const avBtn = h('button', { class: 'btn small', onclick: () => avatarEditor() }, 'Moj lik');
  const uvBtn = h('button', { class: 'btn small', hidden: true, onclick: () => toggleUv() }, 'UV (U)');

  clear(host).append(live,
    h('header', { class: 'room__top' }, h('a', { class: 'logo', href: '#/nadzorna-plosca', 'aria-label': 'Nadzorna plošča' }, logo()), h('div', { class: 'room__case' }, h('b', null, M.title)), timerEl, teamEl, h('span', { class: 'spacer' }), statEl, nbBtn, soundBtn, leaveBtn),
    h('div', { class: 'r3__stage' }, canvas, tip, dpad, turn, h('div', { class: 'r3__tools' }, invEl, flashBtn, gainBtn, qBtn, avBtn, uvBtn), dialogHost, nbHost));

  // ---------- pomoč ----------
  const found = () => R.progress.found || {};
  const items = () => R.progress.items || {};
  const solved = () => R.progress.solved || {};
  const remainingSec = () => (R.core && R.core.deadline ? Math.max(0, (R.core.deadline - serverNow()) / 1000) : 3600);
  const cluesList = () => Object.values((R.content.clues) || {}).sort((a, b) => a.ts - b.ts);
  const members = () => (R.core ? Object.entries(R.core.members || {}) : []);
  const accuseOpen = () => Object.keys(found()).length >= M.accuseOpenFound || remainingSec() <= M.accuseOpenSec;

  // ---------- prikazovalnik ----------
  let eng = null;
  let mounting = false, hoverTimer = null;
  function startEngine() {
    if (eng || mounting) return;
    mount(quality, false).then(() => {
      hoverTimer = setInterval(() => { const o = eng && eng.hoverObj(); if (o) { tip.textContent = OBJECT_LABELS[o] || o; tip.hidden = false; } else tip.hidden = true; }, 120);
    });
  }
  // Zamenjava prikazovalnika (lahki / realistični). Platno z enim tipom konteksta ne more postati drugega, zato vsakič novo.
  async function mount(kind, userChose) {
    mounting = true;
    const stage = host.querySelector('.r3__stage');
    const prev = eng ? { x: eng.S.pos.x, z: eng.S.pos.z, yaw: eng.S.yaw, pitch: eng.S.pitch } : null;
    const handlers = { onInteract: (obj) => interact(obj), onFlash: () => toggleFlash(), onUv: () => toggleUv() };
    const build = () => { const sc = buildScene(); if (prev) sc.spawn = { x: prev.x, z: prev.z, yaw: prev.yaw }; return sc; };
    const place = () => { const fresh = makeCanvas(); stage.replaceChild(fresh, canvas); canvas = fresh; return fresh; };
    let next = null, used = kind;
    if (kind === 'real') {
      if (userChose || true) toast('Nalagam realistični prikaz …', 'info', 3500);
      try { next = await createRealEngine(place(), build(), { ...handlers, start: prev }); }
      catch (e) { console.error(e); toast(`${e.message} Ostajate na lahki različici.`, 'err', 9000); used = 'light'; next = null; }
    }
    if (!next) {
      try { next = createEngine(place(), build(), handlers); }
      catch (e) { console.error(e); stage.append(h('div', { class: 'r3__fail' }, 'Prikaz sobe se ni zagnal: ' + (e && e.message ? e.message : e), h('br'), 'Poskusite osvežiti stran ali drug brskalnik.')); mounting = false; return; }
    }
    const old = eng; eng = next; if (old) old.destroy();
    quality = used; qBtn.textContent = qLabel(); try { localStorage.setItem('tlh.r3.quality', quality); } catch (_) { /* nič */ }
    window.__tlhEngine = eng; eng.setGain(GAINS[gainI][1]); pushState(); sync(); updatePeers();
    mounting = false;
  }
  function setQuality(k) { if (mounting || k === quality) return; mount(k, true); }
  function pushState() { if (eng) eng.setState({ items: items(), solved: solved(), revealed: R.progress.revealed || {}, found: found() }); }
  function toggleFlash() { R.flash = !R.flash; if (R.flash) R.uv = false; sync(); }
  function toggleUv() { if (!items().uv) return; R.uv = !R.uv; if (R.uv) R.flash = false; sync(); }
  function sync() { if (eng) { eng.setFlash(R.flash); eng.setUv(R.uv); } flashBtn.classList.toggle('primary', R.flash); uvBtn.classList.toggle('primary', R.uv); uvBtn.hidden = !items().uv; }

  // ---------- soigralci: pošiljanje svojega položaja, prikaz tujih ----------
  let rawPos = {}, sent = { x: 1e9, z: 1e9, yaw: 1e9, at: 0, mv: false };
  function updatePeers() {
    if (!eng || !eng.setPeers) return;
    const now = serverNow(); const list = [];
    for (const [uid, p] of Object.entries(rawPos || {})) {
      if (uid === S.user.uid || !p || typeof p.x !== 'number') continue;
      if (now - (p.ts || 0) > 25000) continue; // neaktivni ne ostanejo v sobi
      list.push({ uid, name: p.name || '?', x: p.x, z: p.z, yaw: p.yaw || 0, av: cleanAv(p.av) });
    }
    eng.setPeers(list);
  }
  const moveTimer = setInterval(async () => {
    if (!eng || !R.core || R.core.status !== 'active') return;
    const p = eng.S.pos, yaw = eng.S.yaw, now = Date.now();
    const moved = Math.hypot(p.x - sent.x, p.z - sent.z) > 0.05 || Math.abs(yaw - sent.yaw) > 0.08;
    // pošiljamo ob gibanju; ob mirovanju občasno »sem tu«, da soigralci vidijo, da sem v sobi
    if (!moved && now - sent.at < 8000) return;
    const mv = moved; sent = { x: p.x, z: p.z, yaw, at: now, mv };
    try { await call('roomMove', { id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +yaw.toFixed(2), mv }); } catch (_) { /* nepomembno */ }
  }, 1000);
  const peerTimer = setInterval(updatePeers, 2000);

  function avatarEditor() {
    if (R.dialogOpen) return; R.dialogOpen = true;
    const cur = cleanAv((S.profile && S.profile.avatar) || DEFAULT_AVATAR); let av = { ...cur };
    const prev = h('canvas', { width: 240, height: 360, class: 'r3__prev' });
    const draw = () => { const g = prev.getContext('2d'); g.clearRect(0, 0, 240, 360); const gr = g.createLinearGradient(0, 0, 0, 360); gr.addColorStop(0, '#2a2f3a'); gr.addColorStop(1, '#14171d'); g.fillStyle = gr; g.fillRect(0, 0, 240, 360); drawAvatar2D(g, av, 120, 330, 290, { name: S.user.username || null, light: 1 }); };
    const swatches = (key, label) => h('div', { class: 'field' }, h('span', { class: 'label' }, label), h('div', { class: 'r3__sw' }, PALETTES[key].map((c) => h('button', { type: 'button', class: 'r3__swatch' + (av[key] === c ? ' on' : ''), style: `background:${c}`, 'aria-label': `${label} ${c}`, onclick: (e) => { av[key] = c; e.currentTarget.parentNode.querySelectorAll('.r3__swatch').forEach((x) => x.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); } }))));
    const choice = (key, label, names) => h('div', { class: 'field' }, h('span', { class: 'label' }, label), h('div', { class: 'r3__sw' }, names.map((n, i) => h('button', { type: 'button', class: 'btn small' + (av[key] === i ? ' primary' : ''), onclick: (e) => { av[key] = i; e.currentTarget.parentNode.querySelectorAll('button').forEach((x) => x.classList.remove('primary')); e.currentTarget.classList.add('primary'); draw(); } }, n))));
    const close = () => { R.dialogOpen = false; clear(dialogHost); canvas.focus(); };
    const err = h('div', { class: 'err', hidden: true });
    const save = busyButton(h('button', { class: 'btn primary' }, 'Shrani lik'), async () => {
      try { const r = await call('setAvatar', { avatar: av }); if (S.profile) S.profile.avatar = r.avatar; sent.at = 0; toast('Lik shranjen. Soigralci te bodo videli v novem videzu.', 'ok'); close(); } catch (e) { err.textContent = e.message; err.hidden = false; }
    });
    clear(dialogHost).append(h('div', { class: 'r3__scrim' }, h('div', { class: 'r3__dlg r3__dlg--av', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Moj lik' },
      h('div', { class: 'row' }, h('h2', null, 'Moj lik'), h('span', { class: 'spacer' }), h('button', { class: 'iconbtn', 'aria-label': 'Zapri', onclick: close }, '×')),
      h('div', { class: 'r3__avgrid' }, prev, h('div', null,
        swatches('skin', 'Koža'), choice('style', 'Frizura', STYLES), swatches('hair', 'Lasje'), swatches('shirt', 'Majica'), swatches('pants', 'Hlače'), choice('acc', 'Dodatek', ACCS), choice('build', 'Postava', BUILDS))),
      err, h('div', { class: 'row' }, save, h('button', { class: 'btn', onclick: close }, 'Prekliči')))));
    draw();
  }

  // ---------- interakcije ----------
  async function interact(obj) {
    if (R.dialogOpen) return;
    if (R.core && R.core.status !== 'active') return;
    const doIt = async () => {
      try { const v = await call('roomInteract', { id, objectId: obj, uv: R.uv }); showView(v); handleNew(v); } catch (e) { toast(e.message, 'err'); }
    };
    if (eng.distanceTo(obj) > 2.9) { toast('Približujete se …', 'info', 1200); eng.walkTo(obj, () => { doIt(); }); } else doIt();
  }
  function handleNew(v) { if (v && ((v.newClues && v.newClues.length) || (v.newItems && v.newItems.length) || (v.newReveals && v.newReveals.length))) sound.find(); }

  function morsePlay(seq) {
    let t = 0; const unit = 0.11;
    for (const ch of seq) {
      if (ch === '.') { sound.beep(700, unit * 0.9, 'sine', 0.06, t); t += unit * 1.6; } else if (ch === '-') { sound.beep(700, unit * 2.7, 'sine', 0.06, t); t += unit * 3.7; } else if (ch === '/') t += unit * 3;
    }
  }

  function clueBlock(c) {
    const el = h('div', { class: 'r3__clue' }, h('b', null, c.title), c.lines.map((l) => h('p', null, l)));
    if (c.id === 'C_RADIO') { const seq = c.lines.join(' ').replace(/[^./\-]/g, ''); el.append(h('button', { class: 'btn small', onclick: () => morsePlay(seq) }, icon('sound', 14), ' Predvajaj signal')); }
    return el;
  }

  function showView(v) {
    R.dialogOpen = true;
    const close = () => { R.dialogOpen = false; clear(dialogHost); canvas.focus(); };
    const err = h('div', { class: 'err', hidden: true, role: 'alert' });
    const body = h('div', { class: 'r3__dlgbody' });
    const dlg = h('div', { class: 'r3__dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': v.title }, h('div', { class: 'row' }, h('h2', null, v.title), h('span', { class: 'spacer' }), h('button', { class: 'iconbtn', 'aria-label': 'Zapri', onclick: close }, '×')), body);
    const render = (view) => {
      clear(body);
      if (view.locked) { body.append(h('p', null, view.message)); return; }
      (view.lines || []).forEach((l) => body.append(h('p', null, l)));
      (view.newItems || []).forEach((iid) => body.append(h('div', { class: 'okmsg' }, `Pridobili ste: ${(R.content.items && R.content.items[iid] && R.content.items[iid].title) || iid}.`)));
      (view.clues || []).forEach((c) => body.append(clueBlock(c)));
      if (view.special === 'door') {
        const open = view.accuseOpen;
        body.append(h('p', { class: 'hint' }, open ? 'Ključavnica sprejme končno rešitev.' : `Obtožba se odklene, ko odkrijete ${M.accuseOpenFound} sledi (zdaj ${Object.keys(found()).length}) ali ko ostane manj kot 10 minut.`),
          h('button', { class: 'btn primary', disabled: !open, onclick: () => { close(); R.tab = 'obtozba'; toggleNb(true); } }, 'Odpri obrazec obtožbe'));
      }
      if (view.lock) body.append(lockForm(view.lock, view.objectId, render));
    };
    function lockForm(lock, objectId, rerender) {
      const inputs = {};
      const fields = lock.fields.map((f) => {
        const inp = h('input', { id: `lk-${f.id}`, autocomplete: 'off', maxlength: f.type === 'digits' ? f.len : 30, inputmode: f.type === 'digits' ? 'numeric' : 'text', placeholder: f.type === 'digits' ? '•'.repeat(f.len) : '', class: f.type === 'digits' ? 'mono r3__digits' : '' });
        inputs[f.id] = inp; return h('div', { class: 'field' }, h('label', { for: `lk-${f.id}` }, f.label), inp);
      });
      const hintBox = h('div');
      const hintsShown = Object.values(((R.content.hints) || {})[lock.id] || {}).sort((a, b) => a.n - b.n);
      hintsShown.forEach((x) => hintBox.append(h('div', { class: 'r3__hint' }, `Namig ${x.n}: ${x.text}`)));
      const submit = busyButton(h('button', { class: 'btn primary' }, 'Preveri'), async () => {
        err.hidden = true; const answer = {}; for (const f of lock.fields) answer[f.id] = inputs[f.id].value;
        try {
          const r = await call('roomSubmit', { id, lockId: lock.id, answer });
          if (r.correct) { sound.ok(); toast('Odklenjeno!', 'ok'); rerender(r.view); handleNew(r.view); } else { sound.bad(); err.textContent = r.feedback + (r.lockSeconds ? ` Zaklenjeno za ${r.lockSeconds} s.` : ''); err.hidden = false; }
        } catch (e) { sound.bad(); err.textContent = e.message; err.hidden = false; }
      });
      const hintBtn = busyButton(h('button', { class: 'btn small' }, icon('hint', 15), ` Namig (−${M.hintPenalty} točk)`), async () => {
        if (!(await confirmBox('Uporaba namiga', `Namig stane ${M.hintPenalty} točk. Namige uporablja vsa ekipa skupaj.`, 'Uporabi namig'))) return;
        try { const r = await call('roomHint', { id, lockId: lock.id }); hintBox.append(h('div', { class: 'r3__hint' }, `Namig ${r.n}: ${r.text}`)); } catch (e) { err.textContent = e.message; err.hidden = false; }
      });
      return h('div', { class: 'r3__lock' }, h('p', { class: 'r3__prompt' }, lock.prompt), ...fields, err, hintBox, h('div', { class: 'row' }, submit, hintBtn));
    }
    clear(dialogHost).append(h('div', { class: 'r3__scrim', onclick: (e) => { if (e.target === e.currentTarget) close(); } }, dlg));
    render(v);
    const firstInput = dlg.querySelector('input'); if (firstInput) firstInput.focus();
  }

  // ---------- beležnica ----------
  function toggleNb(force) { R.notebook = force === undefined ? !R.notebook : force; nbHost.hidden = !R.notebook; if (R.notebook) drawNb(); }
  function drawNb() {
    if (!R.notebook) return;
    const tabs = [['sledi', 'Sledi'], ['osumljenci', 'Osumljenci'], ['obtozba', 'Obtožba'], ['klepet', 'Klepet']];
    const body = h('div', { class: 'r3__nbbody' });
    const keepScroll = nbHost.querySelector('.r3__nbbody'); const sy = keepScroll ? keepScroll.scrollTop : 0;
    clear(nbHost).append(h('div', { class: 'row' }, h('h3', null, 'Beležnica'), h('span', { class: 'spacer' }), h('button', { class: 'iconbtn', 'aria-label': 'Zapri beležnico', onclick: () => toggleNb(false) }, '×')),
      h('div', { class: 'r3__tabs' }, tabs.map(([k, l]) => h('button', { class: 'btn small' + (R.tab === k ? ' primary' : ''), onclick: () => { R.tab = k; drawNb(); } }, l))), body);
    if (R.tab === 'sledi') {
      const list = cluesList();
      body.append(h('p', { class: 'muted' }, `Odkritih sledi: ${list.length} od ${M.totalClues || 28}. Predmeti: ${Object.keys(items()).length}.`));
      const by = {}; list.forEach((c) => { (by[c.obj] = by[c.obj] || []).push(c); });
      Object.keys(by).forEach((o) => body.append(h('div', { class: 'r3__grp' }, h('h4', null, OBJECT_LABELS[o] || o), by[o].map(clueBlock))));
      if (!list.length) body.append(h('p', { class: 'muted' }, 'Še nič. Poglejte po sobi in kliknite na predmete.'));
      const hs = Object.values(R.content.hints || {}).flatMap((o) => Object.values(o)).sort((a, b) => a.ts - b.ts);
      if (hs.length) body.append(h('h4', null, 'Uporabljeni namigi'), hs.map((x) => h('div', { class: 'r3__hint' }, x.text)));
    } else if (R.tab === 'osumljenci') {
      SUSPECTS.forEach((s) => body.append(h('div', { class: 'r3__sus' }, h('b', null, s.name), h('small', { class: 'muted' }, ` ${s.age} let · ${s.job}`), h('p', null, s.statement))));
      body.append(h('p', { class: 'hint' }, 'Vsak je v čem lagal. Primerjajte izjave s tem, kar soba pove.'));
    } else if (R.tab === 'obtozba') body.append(accuseForm());
    else body.append(chatPanel());
    body.scrollTop = sy;
  }

  function accuseForm() {
    const open = accuseOpen(); const wrap = h('div');
    const f = R.drafts.form = R.drafts.form || { evidence: [] };
    const used = Object.values((R.progress.accusations) || {}).length;
    wrap.append(h('p', { class: open ? 'okmsg' : 'hint' }, open ? `Obtožba je odklenjena. Uporabljenih: ${used}/${M.maxAccusations}. Vsaka napačna stane ${M.wrongPenalty} točk.` : `Obtožba se odklene, ko odkrijete ${M.accuseOpenFound} sledi (zdaj ${Object.keys(found()).length}) ali ko ostane manj kot 10 minut.`));
    ACCUSE_FORM.forEach((fld) => wrap.append(h('div', { class: 'field' }, h('label', { for: `ac-${fld.id}` }, fld.label),
      h('select', { id: `ac-${fld.id}`, disabled: !open, onchange: (e) => { f[fld.id] = e.target.value; } }, h('option', { value: '' }, '— izberite —'), fld.options.map(([v, t]) => h('option', { value: v, selected: f[fld.id] === v }, t))))));
    const ev = cluesList();
    wrap.append(h('div', { class: 'field' }, h('span', { class: 'label' }, 'Ključne sledi (do 5, neobvezno)'),
      h('div', { class: 'r3__evs' }, ev.map((c) => h('label', { class: 'r3__ev' }, h('input', { type: 'checkbox', disabled: !open, checked: f.evidence.includes(c.id), onchange: (e) => { if (e.target.checked) { if (f.evidence.length >= 5) { e.target.checked = false; toast('Izberete lahko največ 5 sledi.', 'warn'); return; } f.evidence.push(c.id); } else f.evidence = f.evidence.filter((x) => x !== c.id); } }), ' ', c.title)))));
    const err = h('div', { class: 'err', hidden: true, role: 'alert' });
    const send = busyButton(h('button', { class: 'btn primary', disabled: !open }, 'Oddaj končno obtožbo'), async () => {
      err.hidden = true;
      if (!(await confirmBox('Končna obtožba', 'Obtožbo lahko oddate največ trikrat. Ste prepričani?', 'Oddaj'))) return;
      try {
        const r = await call('roomAccuse', { id, form: { ...f } });
        if (r.success) { sound.win(); }
        else { sound.bad(); err.textContent = r.expired ? r.message : r.exhausted ? 'Porabili ste vse obtožbe.' : `Obtožba ni pravilna: pravilnih ${r.requiredCorrect} od ${r.requiredTotal} obveznih polj. Preostalih obtožb: ${r.remaining}.`; err.hidden = false; }
      } catch (e) { sound.bad(); err.textContent = e.message; err.hidden = false; }
    });
    wrap.append(err, send); return wrap;
  }

  function chatPanel() {
    const msgs = Object.values(R.chat).sort((a, b) => a.ts - b.ts).slice(-60);
    const list = h('div', { class: 'r3__chat' }, msgs.map((m) => h('div', { class: 'r3__msg' + (m.uid === S.user.uid ? ' me' : '') }, h('b', null, m.name), ' ', m.text)));
    const inp = h('input', { maxlength: 300, placeholder: 'Sporočilo ekipi …', value: R.drafts.chat || '', oninput: (e) => { R.drafts.chat = e.target.value; } });
    const send = async () => { const t = (R.drafts.chat || '').trim(); if (!t) return; R.drafts.chat = ''; inp.value = ''; try { await call('sendChat', { id, text: t }); } catch (e) { toast(e.message, 'err'); } };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    return h('div', null, list, h('div', { class: 'row' }, inp, h('button', { class: 'btn small', onclick: send }, 'Pošlji')));
  }

  // ---------- zgornja vrstica in časovnik ----------
  function drawTop() {
    clear(teamEl);
    members().forEach(([uid, m]) => teamEl.append(h('span', { class: 'chip', title: `${m.username}${m.away ? ' · zapustil' : ''}` }, h('span', { class: 'dot' + (R.presence[uid] === true && !m.away ? ' on' : '') }), m.username)));
    const hints = Object.values(R.progress.hints || {}).reduce((a, b) => a + b, 0);
    clear(statEl).append(h('span', { class: 'pill' }, `Sledi ${Object.keys(found()).length}`), h('span', { class: 'pill' }, `Ključavnice ${Object.keys(solved()).length}/4`), h('span', { class: 'pill' }, `Namigi ${hints}`));
    clear(invEl); Object.keys(items()).forEach((iid) => { const it = (R.content.items || {})[iid]; invEl.append(h('span', { class: 'r3__item', title: it ? it.desc : iid }, it ? it.title : iid)); });
    uvBtn.hidden = !items().uv;
  }
  function tick() {
    if (!R.core || !R.core.deadline) return;
    const s = remainingSec(); const num = timerEl.firstChild, lbl = timerEl.lastChild;
    num.textContent = fmtClock(s);
    const state = s <= 60 ? 'crit' : s <= 300 ? 'high' : s <= 900 ? 'warn' : 'ok'; timerEl.dataset.state = state;
    lbl.textContent = state === 'crit' ? 'Manj kot minuta!' : state === 'high' ? 'Manj kot 5 minut' : state === 'warn' ? 'Manj kot 15 minut' : 'preostalo';
    for (const [t, msg, kind] of [[900, '15 minut do konca.', 'warn'], [300, 'Pet minut do konca!', 'warn'], [60, 'Ena minuta do konca!', 'err']]) {
      if (s <= t && !R.warned.has(t)) { R.warned.add(t); if (R.warnedInit && R.core.status === 'active') { toast(msg, kind, 7000); live.textContent = msg; sound.warn(); } }
    }
    R.warnedInit = true; sound.setTension(s > 0 && s < 600 ? 1 - s / 600 : 0);
    if (s <= 0 && R.core.status === 'active' && !R.timeoutCalled) { R.timeoutCalled = true; call('checkTimeout', { id }).catch(() => { R.timeoutCalled = false; }); }
  }
  const timerHandle = setInterval(tick, 250);

  function onEvents() {
    const keys = Object.keys(R.events);
    if (R.seen === null) { R.seen = new Set(keys); return; }
    for (const k of keys) {
      if (R.seen.has(k)) continue; R.seen.add(k); const e = R.events[k]; const mine = e.uid === S.user.uid;
      if (e.type === 'evidence' && !mine) { sound.find(); toast(e.text, 'find', 4000); }
      else if (e.type === 'puzzle' && !mine) { sound.ping(); toast(e.text, 'ok'); }
      else if (e.type === 'hint' && !mine) { sound.ping(); toast(e.text, 'warn'); }
      else if ((e.type === 'join' || e.type === 'leave') && !mine) { sound.ping(); toast(e.text, 'info'); }
      else if (e.type === 'accusation' && !mine) toast(e.text, 'warn');
    }
  }
  function checkFinished() {
    if (!R.core || R.finished) return;
    if (FINISHED.includes(R.core.status)) { R.finished = true; toast(R.core.status === 'success' ? 'Pravilno! Vrata se odpirajo.' : 'Preiskava je zaključena.', R.core.status === 'success' ? 'ok' : 'err'); setTimeout(() => go(`#/rezultat/${id}`), 1200); }
    else if (R.core.status === 'lobby') go(`#/lobby/${id}`);
  }
  function introOverlay() {
    let seen = false; try { seen = sessionStorage.getItem(`tlh.intro.${id}`) === '1'; } catch (_) { /* nič */ }
    if (seen || R.introDone) return; R.introDone = true; R.dialogOpen = true;
    const close = () => { try { sessionStorage.setItem(`tlh.intro.${id}`, '1'); } catch (_) { /* nič */ } R.dialogOpen = false; clear(dialogHost); canvas.focus(); };
    clear(dialogHost).append(h('div', { class: 'r3__scrim' }, h('div', { class: 'r3__dlg r3__dlg--intro', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'kicker' }, 'Zaupno'), h('h2', null, M.title), M.briefing.map((t) => h('p', null, t)),
      h('h4', null, 'Upravljanje'), h('dl', { class: 'r3__keys' }, M.controls.map(([a, b]) => [h('dt', null, a), h('dd', null, b)])),
      h('button', { class: 'btn primary', onclick: close }, 'Vstopi v sobo'))));
  }

  let ready = false;
  const after = () => {
    if (R.loaded.size >= 3 && R.loaded.has('core') && R.loaded.has('progress') && R.loaded.has('content')) {
      if (!ready) { ready = true; startEngine(); tick(); introOverlay(); }
      pushState(); drawTop(); sync();
      const a = document.activeElement;
      if (R.notebook && !(a && nbHost.contains(a) && /INPUT|SELECT|TEXTAREA/.test(a.tagName))) drawNb();
    }
    checkFinished();
  };
  const upd = (key, fn) => (v) => { fn(v || {}); R.loaded.add(key); after(); };
  const subs = [
    watch(`investigations/${id}/core`, (v) => { if (!v) return go('#/nadzorna-plosca'); R.core = v; R.loaded.add('core'); tick(); after(); }, () => go('#/nadzorna-plosca')),
    watch(`investigations/${id}/progress`, upd('progress', (v) => { R.progress = v; })),
    watch(`investigations/${id}/content`, upd('content', (v) => { R.content = v; })),
    watch(`investigations/${id}/chat`, upd('chat', (v) => { const last = Math.max(0, ...Object.values(v).map((m) => m.ts || 0)); if (R.chatTs !== undefined && Object.values(v).some((m) => m.uid !== S.user.uid && m.ts > R.chatTs)) sound.chat(); R.chatTs = last; R.chat = v; })),
    watch(`investigations/${id}/events`, upd('events', (v) => { R.events = v; onEvents(); })),
    watch(`presence/${id}`, upd('presence', (v) => { R.presence = v; })),
    watch(`investigations/${id}/pos`, (v) => { rawPos = v || {}; updatePeers(); }),
  ];
  const pres = startPresence(id, S.user.uid);
  return () => { sound.setTension(0); subs.forEach((u) => u()); clearInterval(timerHandle); clearInterval(hoverTimer); clearInterval(moveTimer); clearInterval(peerTimer); if (eng) eng.destroy(); stopPresence(id, S.user.uid, pres); };
}
