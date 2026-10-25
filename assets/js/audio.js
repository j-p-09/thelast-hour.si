// Zvok igre: glasba, zvočni učinki in obvestila. Vse je sintetizirano v brskalniku (WebAudio), brez zvočnih datotek.
// Uporabnik ločeno nastavi: vse skupaj (glavno stikalo), glasbo, zvočne učinke in obvestila (vključeno/izključeno + glasnost).
const KEY = 'tlh.audio';
const DEF = { master: true, music: { on: true, vol: 0.35 }, sfx: { on: true, vol: 0.7 }, notif: { on: true, vol: 0.7 } };
const CATS = ['music', 'sfx', 'notif'];
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

function load() {
  const st = JSON.parse(JSON.stringify(DEF));
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') {
      if (typeof raw.master === 'boolean') st.master = raw.master;
      for (const c of CATS) if (raw[c]) { if (typeof raw[c].on === 'boolean') st[c].on = raw[c].on; if (Number.isFinite(raw[c].vol)) st[c].vol = clamp(raw[c].vol, 0, 1); }
    } else if (localStorage.getItem('tlh.sound') === 'off') st.master = false; // star nastavitev »zvok izklopljen«
  } catch (_) { /* brez shranjevanja */ }
  return st;
}
let st = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) { /* nič */ } };

let ctx = null, buses = null, masterGain = null;
const enabled = (cat) => st.master && st[cat].on && st[cat].vol > 0;

function ensure() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC(); masterGain = ctx.createGain(); masterGain.connect(ctx.destination); buses = {};
      for (const c of CATS) { const g = ctx.createGain(); g.connect(masterGain); buses[c] = g; }
      applyVolumes(true);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch (_) { return null; }
}
function applyVolumes(instant) {
  if (!ctx) return;
  for (const c of CATS) {
    const v = st.master && st[c].on ? st[c].vol * (c === 'music' ? 0.9 : 1) : 0;
    if (instant) buses[c].gain.value = v; else buses[c].gain.setTargetAtTime(v, ctx.currentTime, 0.05);
  }
}

// ---------- učinki ----------
function beep(freq = 660, dur = 0.12, type = 'sine', vol = 0.05, delay = 0, cat = 'sfx') {
  if (!enabled(cat)) return;
  const c = ensure(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * 2.2), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(buses[cat]); o.start(t); o.stop(t + dur + 0.03);
  } catch (_) { /* zvok ni na voljo */ }
}
function noise(dur = 0.25, vol = 0.05, freq = 2500, delay = 0, cat = 'sfx') {
  if (!enabled(cat)) return;
  const c = ensure(); if (!c) return;
  try {
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + delay;
    f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol * 2.2; s.buffer = b; s.connect(f).connect(g).connect(buses[cat]); s.start(t);
  } catch (_) { /* nič */ }
}

// ---------- glasba (generativni mračni ambient) ----------
const ROOTS = [55, 43.65, 36.71, 41.2];                       // A, F, D, E
const CHORDS = [[220, 261.63, 329.63], [174.61, 220, 261.63], [146.83, 174.61, 220], [164.81, 207.65, 246.94]]; // Am, F, Dm, E
const PENTA = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 659.25];
const M = { playing: false, tension: 0, timer: null, next: 0, step: 0, pulseNext: 0, oscs: [], drone: null, filt: null, delay: null, lfo: null };

function musicStart() {
  if (M.playing || !enabled('music')) return;
  const c = ensure(); if (!c) return;
  M.playing = true; M.next = c.currentTime + 0.2; M.step = 0; M.pulseNext = c.currentTime + 1;
  M.drone = c.createGain(); M.drone.gain.setValueAtTime(0.0001, c.currentTime); M.drone.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 5);
  M.filt = c.createBiquadFilter(); M.filt.type = 'lowpass'; M.filt.frequency.value = 420; M.filt.Q.value = 0.7;
  M.lfo = c.createOscillator(); const lg = c.createGain(); M.lfo.frequency.value = 0.06; lg.gain.value = 180; M.lfo.connect(lg).connect(M.filt.frequency); M.lfo.start();
  for (const [f, type, det, g] of [[ROOTS[0], 'sawtooth', -4, 0.22], [ROOTS[0], 'sawtooth', 5, 0.22], [ROOTS[0] * 2, 'triangle', 0, 0.2]]) {
    const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = f; o.detune.value = det; og.gain.value = g; o.connect(og).connect(M.filt); o.start(); M.oscs.push(o);
  }
  M.filt.connect(M.drone).connect(buses.music);
  M.delay = c.createDelay(1.5); M.delay.delayTime.value = 0.62; const fb = c.createGain(); fb.gain.value = 0.38; const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 1800;
  M.delay.connect(dl).connect(fb).connect(M.delay); dl.connect(buses.music);
  M.timer = setInterval(musicSchedule, 250); musicSchedule();
}
function musicStop(fast) {
  if (!M.playing) return; M.playing = false; clearInterval(M.timer); M.timer = null;
  const c = ctx, oscs = M.oscs, lfo = M.lfo, drone = M.drone; M.oscs = [];
  try { drone.gain.cancelScheduledValues(c.currentTime); drone.gain.setTargetAtTime(0.0001, c.currentTime, fast ? 0.05 : 0.4); } catch (_) { /* nič */ }
  setTimeout(() => { for (const o of oscs) { try { o.stop(); } catch (_) { /* nič */ } } try { lfo.stop(); } catch (_) { /* nič */ } }, fast ? 300 : 2500);
}
function note(freq, t, dur, vol, type = 'triangle', send = 0.6) {
  const c = ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(buses.music); if (send && M.delay) { const s = c.createGain(); s.gain.value = send; g.connect(s).connect(M.delay); }
  o.start(t); o.stop(t + dur + 0.05);
}
function musicSchedule() {
  if (!ctx || !M.playing) return;
  const now = ctx.currentTime;
  while (M.next < now + 1.2) {
    const t = M.next, i = M.step;
    if (i % 8 === 0) { // zamenjava akorda
      const k = (i / 8) % ROOTS.length;
      M.oscs.forEach((o, n) => o.frequency.setTargetAtTime(ROOTS[k] * (n === 2 ? 2 : 1), t, 1.5));
      for (const f of CHORDS[k]) note(f, t, 7.5, 0.035, 'sine', 0.3);
    }
    if (Math.random() < 0.28 + M.tension * 0.2) note(PENTA[Math.floor(Math.random() * PENTA.length)], t + Math.random() * 0.4, 2.2, 0.045);
    M.step++; M.next += 1.0;
  }
  if (M.tension > 0.02) { // utrip, ki se z manj časa pospešuje
    while (M.pulseNext < now + 1.2) {
      const t = M.pulseNext; const v = 0.12 + M.tension * 0.25;
      note(52, t, 0.18, v, 'sine', 0); note(52, t + 0.2, 0.14, v * 0.7, 'sine', 0);
      M.pulseNext += 1.25 - M.tension * 0.8;
    }
  } else M.pulseNext = now + 1;
}

// ---------- javni vmesnik ----------
const copy = () => JSON.parse(JSON.stringify(st));
function update(patch) {
  if (typeof patch.master === 'boolean') st.master = patch.master;
  for (const c of CATS) if (patch[c]) { if (typeof patch[c].on === 'boolean') st[c].on = patch[c].on; if (Number.isFinite(patch[c].vol)) st[c].vol = clamp(patch[c].vol, 0, 1); }
  save(); applyVolumes();
  if (enabled('music')) { ensure(); musicStart(); } else musicStop(true);
}
// Brskalniki dovolijo zvok šele po dejanju uporabnika: glasba se zažene ob prvem kliku ali pritisku tipke.
let armed = false;
function arm() {
  if (armed || typeof document === 'undefined') return; armed = true;
  const go = () => { document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); if (enabled('music')) { ensure(); musicStart(); } };
  document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true);
  document.addEventListener('visibilitychange', () => { if (!ctx || !M.playing) return; if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); });
}
arm();

export const sound = {
  get on() { return st.master; },
  set(on) { update({ master: !!on }); },
  settings: copy, update,
  beep: (f, d, t, v, dl) => beep(f, d, t, v, dl, 'sfx'),
  // zvočni učinki
  find() { beep(740, 0.1, 'triangle'); beep(990, 0.16, 'triangle', 0.05, 0.1); },
  ok() { beep(523, 0.1, 'sine'); beep(784, 0.2, 'sine', 0.05, 0.1); },
  bad() { beep(160, 0.25, 'sawtooth', 0.04); noise(0.12, 0.02, 500); },
  tick() { beep(900, 0.05, 'square', 0.025); },
  doc() { noise(0.22, 0.04, 3200); },
  win() { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.3, 'triangle', 0.05, i * 0.14)); },
  lose() { [330, 262, 196].forEach((f, i) => beep(f, 0.4, 'sawtooth', 0.035, i * 0.22)); },
  // obvestila
  warn() { beep(440, 0.15, 'square', 0.03, 0, 'notif'); beep(440, 0.15, 'square', 0.03, 0.25, 'notif'); },
  ping() { beep(880, 0.09, 'sine', 0.05, 0, 'notif'); beep(1175, 0.16, 'sine', 0.045, 0.09, 'notif'); },
  chat() { beep(660, 0.07, 'triangle', 0.045, 0, 'notif'); beep(880, 0.1, 'triangle', 0.04, 0.07, 'notif'); },
  // glasba
  setTension(t) { M.tension = clamp(t, 0, 1); },
  preview(cat) { if (!enabled(cat) && !(st.master && st[cat].on)) return; ensure(); if (cat === 'sfx') this.ok(); else if (cat === 'notif') this.ping(); else if (cat === 'music') { musicStart(); } },
  state() { return { musicPlaying: M.playing, contextState: ctx && ctx.state, tension: M.tension }; },
};
