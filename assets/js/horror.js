// Horor za Primer 003: sintetizirani zvoki (brez datotek), naključni dogodki, utripanje luči, prikazen in strašenje.
// Vse je okras: ne vpliva na rešitev. »Blag način« zmanjša strašenje (brez glasnih zvokov in utripanja).
import { sound } from './audio.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

export function createHorror(opts) {
  const soft = !!opts.soft;
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, rev = null, revSend = null, drone = null, hbTimer = null, evTimer = null, running = false;
  let tension = 0.2, lastScare = Date.now(), lastEvent = 0, dest = null;
  const vol = () => { const s = sound.settings(); return s.master && s.sfx.on ? s.sfx.vol : 0; };

  function init() {
    if (ctx || !AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination); dest = master;
    // odmev: konvolucija s šumom, ki pojema
    rev = ctx.createConvolver(); const len = ctx.sampleRate * 2.8, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev.buffer = buf; revSend = ctx.createGain(); revSend.gain.value = 0.35; revSend.connect(rev); rev.connect(master);
  }
  const wet = (node, amt = 0.4) => { const g = ctx.createGain(); g.gain.value = amt; node.connect(g).connect(revSend); };
  const noiseBuf = (sec) => { const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  const env = (g, t, a, hold, r, peak) => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.setValueAtTime(Math.max(0.0002, peak), t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r); };
  const pan = () => { const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) p.pan.value = rand(-0.9, 0.9); return p; };
  const out = (node, withPan = true) => { const p = withPan ? pan() : null; if (p) { node.connect(p); p.connect(dest); wet(p, 0.3); } else { node.connect(dest); wet(node, 0.3); } };
  const gate = () => vol() > 0 && ctx && ctx.state !== 'closed';

  // ---------- zvoki ----------
  const fx = {
    startDrone() {
      if (drone || !ctx) return; const g = ctx.createGain(); g.gain.value = 0; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
      const o = [[38, 'sine', 0.5], [40.3, 'sine', 0.5], [57, 'sawtooth', 0.14], [85.5, 'triangle', 0.1]].map(([f, t, a]) => { const x = ctx.createOscillator(); x.type = t; x.frequency.value = f; const ga = ctx.createGain(); ga.gain.value = a; x.connect(ga).connect(lp); x.start(); return x; });
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 12; lfo.connect(lg).connect(lp.frequency); lfo.start();
      lp.connect(g).connect(dest); drone = { g, o, lfo };
    },
    droneLevel(v) { if (drone && ctx) drone.g.gain.setTargetAtTime(v * vol() * 0.16, ctx.currentTime, 1.5); },
    thud(t0, peak = 0.5) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(38, t0 + 0.12); env(g, t0, 0.01, 0.02, 0.16, peak * vol());
      o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + 0.3);
    },
    heart() { if (!gate()) return; const t = ctx.currentTime; fx.thud(t, 0.6 * (0.4 + tension)); fx.thud(t + 0.22, 0.4 * (0.4 + tension)); },
    whisper() {
      if (!gate()) return; const t = ctx.currentTime, n = Math.floor(rand(4, 9)); const src = ctx.createBufferSource(); src.buffer = noiseBuf(n * 0.22 + 0.5); src.loop = false;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 5; const g = ctx.createGain(); g.gain.value = 0;
      let tt = t; for (let i = 0; i < n; i++) { const f = rand(900, 2600); bp.frequency.setValueAtTime(f, tt); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.12 * vol(), tt + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.17); tt += rand(0.12, 0.26); }
      src.connect(bp).connect(g); out(g); src.start(t); src.stop(tt + 0.2);
    },
    creak() {
      if (!gate()) return; const t = ctx.currentTime, d = rand(0.9, 1.8), o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(rand(70, 120), t); o.frequency.linearRampToValueAtTime(rand(150, 260), t + d * 0.5); o.frequency.linearRampToValueAtTime(rand(60, 100), t + d);
      bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 9; env(g, t, 0.05, d * 0.6, d * 0.3, 0.07 * vol()); o.connect(bp).connect(g); out(g); o.start(t); o.stop(t + d + 0.5);
    },
    knock(n = 3) {
      if (!gate()) return; const t0 = ctx.currentTime;
      for (let i = 0; i < n; i++) { const t = t0 + i * rand(0.28, 0.5), s = ctx.createBufferSource(); s.buffer = noiseBuf(0.15); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; const g = ctx.createGain(); env(g, t, 0.003, 0.01, 0.12, 0.7 * vol()); s.connect(lp).connect(g); out(g); s.start(t); s.stop(t + 0.2); fx.thud(t, 0.35); }
    },
    slam() {
      if (!gate()) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf(0.5); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const g = ctx.createGain(); env(g, t, 0.003, 0.03, 0.4, 0.9 * vol());
      s.connect(lp).connect(g); out(g, false); s.start(t); s.stop(t + 0.6); fx.thud(t, 0.9);
    },
    stinger() {
      if (!gate()) return; const t = ctx.currentTime, g = ctx.createGain(); env(g, t, 0.01, 0.25, 1.1, 0.55 * vol());
      const ws = ctx.createWaveShaper(); const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 5); } ws.curve = c;
      for (const [f0, f1] of [[1100, 260], [1480, 330], [780, 190]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 1.2); o.connect(ws); o.start(t); o.stop(t + 1.5); }
      ws.connect(g); const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.8); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500; const ng = ctx.createGain(); env(ng, t, 0.005, 0.1, 0.5, 0.4 * vol()); s.connect(hp).connect(ng); ng.connect(dest); s.start(t);
      g.connect(dest); wet(g, 0.5); fx.thud(t, 1);
    },
    musicbox() {
      if (!gate()) return; const base = 523.25, scale = [0, 3, 7, 10, 7, 3, 0, -2, 0, 3], t0 = ctx.currentTime;
      scale.forEach((st, i) => { const t = t0 + i * 0.42, f = base * Math.pow(2, st / 12) * (1 + (Math.random() - 0.5) * 0.012); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; env(g, t, 0.005, 0.02, 0.9, 0.09 * vol()); o.connect(g); out(g); o.start(t); o.stop(t + 1.2); const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.01; const g2 = ctx.createGain(); env(g2, t, 0.005, 0.01, 0.5, 0.03 * vol()); o2.connect(g2); out(g2); o2.start(t); o2.stop(t + 0.8); });
    },
    breath() {
      if (!gate()) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf(3.2); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 1.4; const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1 * vol(), t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); g.gain.exponentialRampToValueAtTime(0.08 * vol(), t + 2.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.1);
      s.connect(bp).connect(g); out(g); s.start(t); s.stop(t + 3.3);
    },
    scratch() {
      if (!gate()) return; const t0 = ctx.currentTime;
      for (let i = 0; i < 5; i++) { const t = t0 + i * 0.13, s = ctx.createBufferSource(); s.buffer = noiseBuf(0.2); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200; const g = ctx.createGain(); env(g, t, 0.01, 0.04, 0.09, 0.1 * vol()); s.connect(hp).connect(g); out(g); s.start(t); s.stop(t + 0.22); }
    },
    drip() { if (!gate()) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.08); env(g, t, 0.003, 0.01, 0.25, 0.1 * vol()); o.connect(g); out(g); o.start(t); o.stop(t + 0.4); },
    click() { if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 180; env(g, t, 0.002, 0.005, 0.03, 0.08 * vol()); o.connect(g).connect(dest); o.start(t); o.stop(t + 0.06); },
    static() { if (!gate()) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf(1.2); const g = ctx.createGain(); env(g, t, 0.02, 0.5, 0.5, 0.08 * vol()); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; s.connect(bp).connect(g); out(g); s.start(t); s.stop(t + 1.3); },
  };

  // ---------- dogodki ----------
  const quiet = ['drip', 'creak', 'breath', 'drip', 'whisper'];
  const mid = ['whisper', 'knock', 'scratch', 'musicbox', 'static', 'creak'];
  function flicker(n = 6, dark = 0.12) {
    if (soft) { opts.onLight && opts.onLight(0.55); setTimeout(() => opts.onLight && opts.onLight(1), 350); return; }
    let i = 0; const step = () => { if (!running) { opts.onLight && opts.onLight(1); return; } opts.onLight && opts.onLight(i % 2 ? 1 : dark); i++; if (i < n) setTimeout(step, rand(50, 160)); else opts.onLight && opts.onLight(1); }; step();
  }
  function blackout(sec = 3) { if (soft) return flicker(); opts.onLight && opts.onLight(0.02); fx.slam(); setTimeout(() => { if (running) { fx.whisper(); } }, 800); setTimeout(() => { opts.onLight && opts.onLight(1); }, sec * 1000); }
  function ghostAppear(behind) {
    const p = opts.playerPos(); if (!p) return; const dist = behind ? 3.2 : rand(5, 7);
    const ang = p.yaw + (behind ? Math.PI : rand(-0.5, 0.5)); const gx = p.x + Math.sin(ang) * dist, gz = p.z - Math.cos(ang) * dist;
    opts.onGhost && opts.onGhost({ x: clamp(gx, opts.bounds.x0 + 0.5, opts.bounds.x1 - 0.5), z: clamp(gz, opts.bounds.z0 + 0.5, opts.bounds.z1 - 0.5), alpha: 0.9 });
    let a = 0.9; const fade = setInterval(() => { a -= 0.07; if (a <= 0 || !running) { clearInterval(fade); opts.onGhost && opts.onGhost(null); } else opts.onGhost && opts.onGhost({ x: clamp(gx, opts.bounds.x0 + 0.5, opts.bounds.x1 - 0.5), z: clamp(gz, opts.bounds.z0 + 0.5, opts.bounds.z1 - 0.5), alpha: a * (Math.random() > 0.8 ? 0.3 : 1) }); }, 110);
  }
  function jumpScare() {
    lastScare = Date.now(); if (soft) { fx.whisper(); ghostAppear(false); return; }
    fx.stinger(); flicker(8, 0.04); ghostAppear(Math.random() > 0.4); opts.onShake && opts.onShake();
  }
  function tick() {
    if (!running || !ctx) return;
    const now = Date.now(); const since = (now - lastScare) / 1000;
    const hot = opts.getHot ? opts.getHot() : 0; // 0..1: približevanje »vročim« predmetom
    tension = clamp(0.15 + hot * 0.5 + (opts.getDarkness ? opts.getDarkness() : 0) * 0.25, 0, 1);
    fx.droneLevel(0.5 + tension);
    const r = Math.random();
    if (since > (soft ? 420 : 200) && r < 0.35) { jumpScare(); return; }
    const gap = (now - lastEvent) / 1000; if (gap < rand(14, 28)) return; lastEvent = now;
    const pool = tension > 0.55 ? mid.concat(['knock', 'whisper']) : quiet.concat(mid);
    const k = pool[Math.floor(Math.random() * pool.length)]; fx[k](k === 'knock' ? Math.floor(rand(2, 5)) : undefined);
    if (!soft && Math.random() < 0.15) flicker(4, 0.3);
    if (Math.random() < 0.12) ghostAppear(Math.random() > 0.6);
  }

  return {
    // mora biti poklicano iz uporabniškega dejanja (klik), da brskalnik dovoli zvok
    start() {
      if (running) return; init(); if (!ctx) { running = true; return; } if (ctx.state === 'suspended') ctx.resume();
      running = true; fx.startDrone(); fx.droneLevel(0.8);
      hbTimer = setInterval(() => { if (tension > 0.45 || (opts.getRemaining && opts.getRemaining() < 600)) fx.heart(); }, 1000);
      evTimer = setInterval(tick, 5000); setTimeout(() => { if (running) fx.creak(); }, 4000);
    },
    stop() { running = false; clearInterval(hbTimer); clearInterval(evTimer); try { if (drone) { drone.g.gain.value = 0; drone.o.forEach((x) => x.stop()); drone.lfo.stop(); } if (ctx) ctx.close(); } catch (_) { /* nič */ } ctx = null; drone = null; opts.onLight && opts.onLight(1); opts.onGhost && opts.onGhost(null); },
    sfx: (name, ...a) => { if (running && fx[name]) fx[name](...a); },
    scare: jumpScare, doorOpened() { fx.slam(); setTimeout(() => fx.creak(), 500); }, flashClick: () => fx.click(), event(name) { if (name === 'flicker') flicker(); else if (name === 'blackout') blackout(); },
    setHot(v) { tension = clamp(v, 0, 1); },
  };
}
