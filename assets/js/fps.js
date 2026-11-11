// Primer 004: strelska plast (prva oseba). Vse je izračunano na odjemalcu: nasprotniki, streljanje, zdravje.
// Strežnik varuje uganke, napredek, čas in rezultat; žrtve se sporočijo prek roomCasualty.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- zvoki (sintetizirani) ----------
export function makeSfx() {
  const AC = window.AudioContext || window.webkitAudioContext; let ctx = null, master = null, siren = null, eng0 = null;
  const init = () => { if (ctx || !AC) return; try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.8; const c = ctx.createDynamicsCompressor(); master.connect(c).connect(ctx.destination); } catch (_) { ctx = null; } if (ctx && ctx.state === 'suspended') ctx.resume(); };
  const noise = (sec) => { const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  const burst = (t0, dur, peak, freq, q = 0.8, type = 'lowpass') => { const s = ctx.createBufferSource(); s.buffer = noise(dur + 0.1); const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.setValueAtTime(peak, t0); g.gain.exponentialRampToValueAtTime(0.0003, t0 + dur); s.connect(f).connect(g).connect(master); s.start(t0); s.stop(t0 + dur + 0.05); };
  const tone = (f0, f1, dur, peak, type = 'sine', t0 = 0) => { const o = ctx.createOscillator(); o.type = type; const t = ctx.currentTime + t0; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const g = ctx.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0003, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05); };
  const ok = () => { init(); return !!ctx; };
  return {
    init,
    shot(far = 0) { if (!ok()) return; const t = ctx.currentTime, k = far ? 0.45 : 1; burst(t, 0.18, 0.9 * k, 2800, 0.7); burst(t, 0.45, 0.6 * k, 380, 0.7); tone(180, 40, 0.16, 0.8 * k); },
    click() { if (!ok()) return; burst(ctx.currentTime, 0.04, 0.4, 5000, 1, 'highpass'); },
    reload() { if (!ok()) return; tone(900, 500, 0.05, 0.25, 'square'); tone(500, 800, 0.06, 0.25, 'square', 0.5); tone(1200, 700, 0.05, 0.3, 'square', 1.1); },
    hit() { if (!ok()) return; tone(1500, 900, 0.06, 0.25, 'triangle'); },
    hurt() { if (!ok()) return; burst(ctx.currentTime, 0.2, 0.5, 700); tone(120, 60, 0.25, 0.6); },
    cuff() { if (!ok()) return; for (let i = 0; i < 3; i++) tone(2400 - i * 200, 1500, 0.05, 0.35, 'square', i * 0.12); },
    door() { if (!ok()) return; tone(80, 40, 0.5, 0.7); burst(ctx.currentTime, 0.3, 0.4, 500); },
    shout() { if (!ok()) return; tone(220, 330, 0.28, 0.35, 'sawtooth'); tone(330, 250, 0.3, 0.3, 'sawtooth', 0.3); },
    crash() { if (!ok()) return; burst(ctx.currentTime, 0.5, 0.9, 900); tone(150, 40, 0.4, 0.8, 'sawtooth'); },
    horn() { if (!ok()) return; tone(420, 420, 0.4, 0.3, 'square'); tone(520, 520, 0.4, 0.25, 'square'); },
    sirenOn() { if (!ok() || siren) return; const o = ctx.createOscillator(); o.type = 'sawtooth'; const lfo = ctx.createOscillator(); lfo.frequency.value = 0.55; lfo.type = 'triangle'; const lg = ctx.createGain(); lg.gain.value = 330; lfo.connect(lg).connect(o.frequency); o.frequency.value = 880; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.6; const g = ctx.createGain(); g.gain.value = 0.18; o.connect(f).connect(g).connect(master); o.start(); lfo.start(); siren = { o, lfo, g }; },
    engine(v, on) { if (!ok()) return; if (!on) { if (eng0) { try { eng0.g.gain.value = 0; eng0.o.stop(); eng0.o2.stop(); } catch (_) { /* nič */ } eng0 = null; } return; } if (!eng0) { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0.0; o.connect(f); o2.connect(f); f.connect(g).connect(master); o.start(); o2.start(); eng0 = { o, o2, g, f }; } const t = ctx.currentTime; eng0.o.frequency.setTargetAtTime(38 + v * 5.2, t, 0.1); eng0.o2.frequency.setTargetAtTime(19 + v * 2.6, t, 0.1); eng0.f.frequency.setTargetAtTime(260 + v * 22, t, 0.1); eng0.g.gain.setTargetAtTime(0.07 + Math.min(0.12, v * 0.006), t, 0.1); },
    sirenOff() { if (!siren) return; try { siren.g.gain.value = 0; siren.o.stop(); siren.lfo.stop(); } catch (_) { /* nič */ } siren = null; },
    stop() { this.sirenOff(); try { if (ctx) ctx.close(); } catch (_) { /* nič */ } ctx = null; },
  };
}

// ---------- geometrija ----------
function makeGeom(getBoxes, getState) {
  const boxState = () => getState() || {};
  const live = () => { const st = boxState(); return getBoxes().filter((b) => b.solid !== false && !(b.hide && b.hide(st)) && !b.ghost).map((b) => { const o = (b.off && b.off(st)) || [0, 0, 0]; return { a: [b.min[0] + o[0], b.min[1] + o[1], b.min[2] + o[2]], c: [b.max[0] + o[0], b.max[1] + o[1], b.max[2] + o[2]] }; }); };
  let cache = null, cacheAt = 0; const solids = () => { const n = performance.now(); if (!cache || n - cacheAt > 120) { cache = live(); cacheAt = n; } return cache; };
  const invalidate = () => { cache = null; };
  function rayAabb(o, d, a, c) { let tmin = 0, tmax = 1e9; for (let i = 0; i < 3; i++) { if (Math.abs(d[i]) < 1e-9) { if (o[i] < a[i] || o[i] > c[i]) return null; } else { let t1 = (a[i] - o[i]) / d[i], t2 = (c[i] - o[i]) / d[i]; if (t1 > t2) [t1, t2] = [t2, t1]; tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null; } } return tmin; }
  const wallDist = (o, d, maxd) => { let best = maxd; for (const s of solids()) { const t = rayAabb(o, d, s.a, s.c); if (t !== null && t < best) best = t; } return best; };
  const los = (ax, az, bx, bz, y = 1.3) => { const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < 0.01) return true; const d = [dx / L, 0, dz / L]; return wallDist([ax, y, az], d, L) >= L - 0.05; };
  const blocked = (x, z, r = 0.3) => { for (const s of solids()) { if (s.a[1] > 1.5 || s.c[1] < 0.2) continue; const px = clamp(x, s.a[0], s.c[0]), pz = clamp(z, s.a[2], s.c[2]); if ((x - px) ** 2 + (z - pz) ** 2 < r * r) return true; } return false; };
  return { wallDist, los, blocked, rayAabb, invalidate };
}

const GUARD_AV = { skin: '#d8b090', hair: '#1a1a1a', shirt: '#2a2f38', pants: '#1c1c22', style: 3, acc: 2, build: 2, sex: 0, bottom: 0 };
const SUSP_AV = { skin: '#d8b090', hair: '#2a2018', shirt: '#7a2c2c', pants: '#2a2a33', style: 0, acc: 0, build: 1, sex: 0, bottom: 0 };
const TARGET_AV = { skin: '#c8c8c8', hair: '#c8c8c8', shirt: '#e8e8e8', pants: '#bbbbbb', style: 3, acc: 0, build: 1, sex: 0, bottom: 0 };
export const AV_SWAT = { shirt: '#161c28', pants: '#161c28', hair: '#161c28', acc: 2, style: 3, build: 2 };
export const AV_DET = { shirt: '#2b2f38', pants: '#1d2028' };

const DIFF = [null, { hp: 40, react: 1.3, gap: 1.6, acc: 0.25, dmg: 4, speed: 1.5, range: 15 }, { hp: 55, react: 1.0, gap: 1.25, acc: 0.35, dmg: 5.5, speed: 1.9, range: 17 }, { hp: 75, react: 0.7, gap: 0.95, acc: 0.45, dmg: 7, speed: 2.3, range: 19 }];
const ROOM_X = [-25, -15, -5, 5, 15, 25];
const SPAWNS = [
  [[-16.4, -4.3], [-16.2, 4.2], [-17.6, 0.4]], [[-9, 3.5], [-12, -2], [-7, 0.5]], [[0, 0], [3, -2], [-2, 5]], [[10, 0], [12, -3], [7, 2]], [[20, 3], [19, -3]],
];
const PER_DIFF = [null, [0, 1, 1, 1, 0], [1, 2, 2, 2, 1], [2, 3, 3, 3, 2]];
export const CHECKPOINTS = [{ x: -23.5, z: 0, yaw: Math.PI / 2 }, { x: -13.5, z: 0, yaw: Math.PI / 2 }, { x: -3.5, z: 0, yaw: Math.PI / 2 }, { x: 6.5, z: 0, yaw: Math.PI / 2 }, { x: 16.5, z: 0, yaw: Math.PI / 2 }];

export function createFps(o) {
  // o: { stage, getEng, getBoxes, getState, role:'det'|'swat', difficulty, solo, sfx, toast, onUse, onDeath, onCuffed, checkpoint, mode:'range'|'combat', suspectAt }
  const G = makeGeom(o.getBoxes, o.getState); const sfx = o.sfx; const DD = DIFF[clamp(o.difficulty || 2, 1, 3)];
  const swat = o.role === 'swat';
  const P = { hp: 100, armor: swat ? 100 : [0, 60, 100][o.vest | 0] || 0, mags: o.mode === 'range' ? 99 : (o.solo ? 5 : swat ? 9 : 3), ammo: 20, reloading: 0, cool: 0, aim: false, aimK: 0, recoil: 0, flash: 0, hurtFx: 0, hitFx: 0, headFx: 0, nv: false, dead: false, deadAt: 0, lastHurt: 0, badge: 0, spread: 0, msg: '', msgAt: 0, kills: 0, cuffed: false, lock: false, slot: 0, drawK: 0, third: false };
  const state = { npcs: [], suspect: null, running: false, mode: o.mode, locked: false };
  const el = {};
  // ---------- HUD ----------
  const root = document.createElement('div'); root.className = 'fps';
  root.innerHTML = `<div class="fps__vig"></div><div class="fps__hurt"></div><div class="fps__nv"></div><canvas class="fps__gun"></canvas>
    <div class="fps__cross"><i></i><i></i><i></i><i></i></div><div class="fps__hit"></div>
    <div class="fps__bars"><div class="fps__bar fps__bar--hp"><b></b><span>ZDRAVJE</span></div><div class="fps__bar fps__bar--ar"><b></b><span>JOPIČ</span></div></div>
    <div class="fps__ammo"><strong>20</strong><small>/ 60</small></div><div class="fps__gear"></div><div class="fps__msg"></div><div class="fps__badge"></div><div class="fps__dead"><h2>PADLI STE V AKCIJI</h2><p></p></div>
    <div class="fps__touch"><button data-k="fire">OGENJ</button><button data-k="aim">MERI</button><button data-k="reload">NABIJ</button><button data-k="use">E</button><button data-k="s1">1</button><button data-k="s2">2</button><button data-k="s3">3</button><button data-k="cam">C</button></div>`;
  o.stage.appendChild(root);
  const q = (s) => root.querySelector(s);
  Object.assign(el, { hurt: q('.fps__hurt'), nv: q('.fps__nv'), gun: q('.fps__gun'), cross: q('.fps__cross'), hit: q('.fps__hit'), hp: q('.fps__bar--hp b'), ar: q('.fps__bar--ar b'), ammo: q('.fps__ammo'), gear: q('.fps__gear'), msg: q('.fps__msg'), badge: q('.fps__badge'), dead: q('.fps__dead'), deadp: q('.fps__dead p') });
  const gearList = [['1', 'Pištola'], ['2', 'Značka'], ['3', 'Lisice'], ['F', 'Svetilka'], ['N', 'Nočni vid'], ['C', 'Pogled']];
  el.gear.innerHTML = gearList.map((g) => `<span data-g="${g[0]}"><i>${g[0]}</i>${g[1]}</span>`).join('');
  const say = (t, ms = 2600) => { P.msg = t; P.msgAt = performance.now() + ms; el.msg.textContent = t; el.msg.classList.add('on'); };

  // ---------- NPC ----------
  let idc = 1;
  const mkNpc = (kind, x, z, extra = {}) => ({ id: `${kind}${idc++}`, kind, x, z, hx: x, hz: z, yaw: rand(0, 6.28), hp: kind === 'guard' ? DD.hp * (o.solo ? 0.8 : 1) : 1, av: kind === 'guard' ? GUARD_AV : kind === 'suspect' ? SUSP_AV : TARGET_AV, state: 'idle', t: rand(0, 3), react: 0, cd: 0, flash: 0, hurt: 0, walk: false, phase: rand(0, 6), down: 0, ...extra });
  function spawnRange() { state.npcs = []; for (let i = 0; i < 4; i++) state.npcs.push(mkNpc('target', 16.5, -6 + i * 4, { yaw: Math.PI * 1.5 * 0 - Math.PI / 2 })); state.npcs.forEach((n) => { n.yaw = -Math.PI / 2; n.dist = 8 + (n.x - 16.5); }); }
  function spawnGuards() {
    state.npcs = []; const per = PER_DIFF[clamp(o.difficulty || 2, 1, 3)];
    for (let r = 0; r < 5; r++) { let n = per[r]; if (o.solo) n = Math.max(r === 1 || r === 3 ? 1 : 0, Math.round(n * 0.6)); const sp = SPAWNS[r]; for (let i = 0; i < Math.min(n, sp.length); i++) state.npcs.push(mkNpc('guard', sp[i][0], sp[i][1], { room: r })); }
    const sus = mkNpc('suspect', 21.5, 2.5, { state: 'hide', room: 4, hands: false }); sus.watch = 0; sus.look = 0; state.suspect = sus; state.npcs.push(sus);
  }
  function setCell() { state.npcs = []; const sus = mkNpc('suspect', -15.6, -6, { state: 'cuffed', hands: true, yaw: 0.6 }); state.suspect = sus; state.npcs.push(sus); }

  // ---------- vhod ----------
  const eng = () => o.getEng();
  const keys = { fire: false };
  function lockPointer() { const c = eng() && document.querySelector('.r3__canvas'); if (c && c.requestPointerLock && !document.pointerLockElement) { try { c.requestPointerLock(); } catch (_) { /* nič */ } } }
  const onMouseMove = (e) => {
    if (!state.running || P.dead || P.lock) return; const E = eng(); if (!E) return;
    const lockedNow = !!document.pointerLockElement; if (!lockedNow && e.pointerType !== 'touch') return; if (e.buttons === 0 && e.pointerType === 'touch') return;
    const k = P.aim ? 0.0011 : 0.0022; E.S.yaw += (e.movementX || 0) * k; E.S.pitch = clamp(E.S.pitch - (e.movementY || 0) * k, -1.0, 1.0);
  };
  const onDown = (e) => {
    if (!state.running) return;
    if (e.target && e.target.closest && e.target.closest('.r3__dialogs, .r3__nb, .r3__tools, .fps__touch, .room__top')) return;
    sfx.init(); if (!document.pointerLockElement && e.pointerType === 'mouse') { lockPointer(); return; }
    if (e.button === 2) { P.aim = true; return; } if (e.button === 0) { keys.fire = true; P.fireReq = true; }
  };
  const onUp = (e) => { if (e.button === 2) P.aim = false; if (e.button === 0) keys.fire = false; };
  const onKey = (e) => {
    if (!state.running || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
    if (e.type === 'keyup') { if (e.code === 'KeyZ') P.aim = false; if (e.code === 'Space') keys.fire = false; return; }
    if (e.code === 'KeyR') reload(); else if (e.code === 'KeyN') toggleNv(); else if (e.code === 'KeyB' || e.code === 'Digit2') toggleSlot(2); else if (e.code === 'Digit1') toggleSlot(1); else if (e.code === 'Digit3') toggleSlot(3); else if (e.code === 'KeyC') toggleCam(); else if (e.code === 'KeyZ') P.aim = true; else if (e.code === 'KeyV') shout();
    else if (e.code === 'Space') { keys.fire = true; P.fireReq = true; e.preventDefault(); }
  };
  const noMenu = (e) => { if (state.running) e.preventDefault(); };
  const stageEl = o.stage;
  stageEl.addEventListener('pointerdown', onDown); window.addEventListener('pointerup', onUp); window.addEventListener('pointermove', onMouseMove);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); stageEl.addEventListener('contextmenu', noMenu);
  root.querySelectorAll('.fps__touch button').forEach((b) => {
    const k = b.dataset.k; b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); sfx.init(); if (k === 'fire') { keys.fire = true; P.fireReq = true; } else if (k === 'aim') P.aim = !P.aim; else if (k === 'reload') reload(); else if (k === 'use') use(); else if (k === 's1') toggleSlot(1); else if (k === 's2') toggleSlot(2); else if (k === 's3') toggleSlot(3); else if (k === 'cam') toggleCam(); });
    b.addEventListener('pointerup', () => { if (k === 'fire') keys.fire = false; });
  });

  // ---------- akcije ----------
  function reload() { if (P.dead || P.reloading || P.reloading > 0 || P.ammo >= 20 || P.mags <= 0) return; P.reloading = 1.7; sfx.reload(); say('Polnjenje …', 1500); }
  function toggleNv() { P.nv = !P.nv; el.nv.classList.toggle('on', P.nv); const E = eng(); if (E) E.setGain(P.nv ? 3.2 : (o.baseGain || 1.8)); const c = document.querySelector('.r3__canvas'); if (c) c.style.filter = P.nv ? 'grayscale(1) sepia(1) hue-rotate(55deg) saturate(2.4) contrast(1.15)' : ''; }
  function toggleSlot(n) {
    if (P.dead || P.lock) return; P.slot = P.slot === n ? 0 : n; P.drawK = 0; P.aim = false; el.badge.classList.remove('on');
    if (P.slot === 1) sfx.reload(); else if (P.slot === 2) { sfx.shout(); say('»Policija!« Značka je pokazana.', 1600); } else if (P.slot === 3) { sfx.cuff(); say('Lisice v roki. Klik na predajajočega se osumljenca ga aretira.', 2600); } else say('Orožje je v tulcu.', 900);
    el.gear.querySelectorAll('span').forEach((s) => s.classList.toggle('on', s.dataset.g === String(P.slot)));
  }
  function toggleCam() { P.third = !P.third; const E = eng(); if (E && E.setThird) E.setThird(P.third); say(P.third ? 'Pogled od zadaj (C za nazaj)' : 'Prva oseba', 1100); }
  const nearSurrender = () => state.npcs.some((n) => (n.kind === 'suspect' || n.kind === 'guard') && n.state === 'surrender' && dist(n) < 3.2);
  function tryCuff() {
    const g = state.npcs.filter((n) => n.kind === 'guard' && n.state === 'surrender' && dist(n) < 2.7).sort((a, b) => dist(a) - dist(b))[0];
    if (g) { g.state = 'cuffed'; g.hands = false; g.walk = false; g.side = Math.random() < 0.5 ? 1 : -1; sfx.cuff(); say('Nasprotnik je aretiran in leži na tleh.', 2200); return; }
    const s = state.suspect; if (!s) return; const d = dist(s);
    if (s.state === 'surrender' && d < 2.6) { P.cuffed = true; s.state = 'cuffed'; s.hands = true; s.lyingT = 1; sfx.cuff(); P.slot = 0; say('Osumljenec je vklenjen in leži na tleh. Peljite ga na postajo.', 3400); if (o.onCuffed) o.onCuffed(); return; }
    if (s.state === 'surrender') { say('Stopite bližje (manj kot 2 m) in kliknite z lisicami.', 1800); return; }
    if (s.state === 'flee' || s.state === 'hide') { say('Osumljenec se ne predaja. Pomerite ga s pištolo (1) in kričite (V).', 2400); return; }
    sfx.click();
  }
  function showBadge() { P.badge = 2.2; el.badge.innerHTML = `<div class="fps__bcard"><b>★ POLICIJA ★</b><span>${swat ? 'SPECIALNA ENOTA' : 'KRIMINALISTIČNI DETEKTIV'}</span></div>`; el.badge.classList.add('on'); sfx.shout(); say('»Policija!«', 1600); }
  function shout() {
    sfx.shout(); say('»POLICIJA! ROKE V ZRAK!«', 1800); const s = state.suspect; if (s && s.state === 'hide' && dist(s) < 14 && !pointedAt(s, eng())) s.alert = true;
    const E = eng(); if (!E || state.mode !== 'combat') return; const base = [0, 0.75, 0.5, 0.28][clamp(o.difficulty || 2, 1, 3)];
    for (const n of state.npcs) {
      if (n.kind !== 'guard' || n.hp <= 0 || n.state === 'surrender' || n.state === 'cuffed') continue; const d = dist(n); if (d > 13 || !G.los(E.S.pos.x, E.S.pos.z, n.x, n.z, 1.3)) continue;
      if (Math.abs(angDiff(Math.atan2(n.x - E.S.pos.x, -(n.z - E.S.pos.z)), E.S.yaw)) > 0.7) continue;
      const ch = base * (P.slot === 1 ? (P.aim ? 1.25 : 1) : 0.55) * (n.state === 'alert' ? 0.35 : 1) * (n.hurt > 0 ? 0.3 : 1);
      if (Math.random() < ch) { n.state = 'surrender'; n.t = 0; n.hands = true; n.walk = false; say('»Ne streljajte! Predajam se!« Vzemite lisice (3) in kliknite nanj.', 3600); }
      else if (n.state !== 'alert') { n.state = 'alert'; n.react = DD.react * 0.8; }
    }
  }
  const dist = (n) => { const E = eng(); return Math.hypot(n.x - E.S.pos.x, n.z - E.S.pos.z); };
  function dirOf(yaw, pitch) { return [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)]; }
  function shoot() {
    const E = eng(); if (!E || P.dead || P.lock || P.cool > 0 || P.reloading > 0) return;
    if (P.slot === 3) { if (!nearSurrender()) { if (E.S.hover && o.onUse) o.onUse(E.S.hover); else sfx.click(); P.cool = 0.3; return; } tryCuff(); P.cool = 0.4; return; }
    if (P.slot !== 1) { if (o.onUse && E.S.hover) o.onUse(E.S.hover); P.cool = 0.3; return; } if (P.drawK < 0.8) { P.cool = 0.1; return; }
    if (P.ammo <= 0) { sfx.click(); say(P.mags > 0 ? 'Praznega šaržerja: pritisnite R' : 'Zmanjkalo je streliva!', 1600); P.cool = 0.4; return; }
    P.ammo--; P.cool = 0.22; P.recoil = 1; P.flash = 0.06; P.spread = Math.min(0.05, P.spread + 0.012); sfx.shot();
    if (P.ammo === 0 && P.mags > 0) say('Šaržer je prazen: R', 1400);
    const sp = (P.aim ? 0.003 : 0.012) + P.spread; const yaw = E.S.yaw + rand(-sp, sp), pitch = E.S.pitch + rand(-sp, sp);
    const org = [E.S.pos.x, E.S.pos.y, E.S.pos.z], d = dirOf(yaw, pitch);
    const wall = G.wallDist(org, d, 60);
    let best = null, bt = wall;
    for (const n of state.npcs) {
      if (n.kind === 'guard' && n.hp <= 0) continue; if (n.kind === 'target' && n.down > 0) continue;
      const dx = n.x - org[0], dz = n.z - org[2]; const t3 = (dx * d[0] + dz * d[2]) / (d[0] * d[0] + d[2] * d[2] || 1); if (t3 < 0.3) continue; // vzdolž žarka v 3D
      const px = org[0] + d[0] * (t3), pz = org[2] + d[2] * (t3); if ((px - n.x) ** 2 + (pz - n.z) ** 2 > 0.36 ** 2) continue;
      const y = org[1] + d[1] * t3; if (y < 0 || y > 1.92 || t3 >= bt) continue; best = { n, y, t: t3 }; bt = t3;
    }
    // vsi nasprotniki v bližini slišijo strel
    for (const n of state.npcs) if (n.kind === 'guard' && n.hp > 0 && dist(n) < 16 && n.state === 'idle') { n.state = 'search'; n.sx = E.S.pos.x; n.sz = E.S.pos.z; }
    if (!best) return;
    const n = best.n, head = best.y > 1.5;
    if (n.kind === 'suspect') { say('Neupravičena sila! Osumljenca ne ustrelite.', 2200); n.hurt = 0.5; if (n.state === 'hide') n.alert = true; return; }
    if (n.kind === 'target') { n.down = 3.5; n.side = Math.random() < 0.5 ? 1 : -1; P.hitFx = 0.2; sfx.hit(); say(head ? 'Zadetek v glavo' : 'Zadetek', 800); return; }
    n.hp -= head ? 200 : 26; n.hurt = 0.4; n.state = 'alert'; P.hitFx = 0.25; P.headFx = head ? 0.25 : 0; sfx.hit();
    if (n.hp <= 0) { P.kills++; n.down = 0; n.side = Math.random() < 0.5 ? 1 : -1; }
  }
  function use() {
    const E = eng(); if (!E) return; const s = state.suspect;
    if (s && s.state === 'surrender' && dist(s) < 8 && !P.cuffed) { if (P.slot !== 3) { say('Vzemite lisice (3) in kliknite na osumljenca.', 2200); return; } tryCuff(); return; }
    if (o.onUse) o.onUse(E.S.hover);
  }

  // ---------- zanka ----------
  let last = performance.now(), raf = 0, regenAt = 0;
  function damage(amount, from) {
    if (P.dead || P.lock) return; const a = amount * (o.solo ? 0.8 : 1);
    if (P.armor > 0) { const ab = Math.min(P.armor, a * 0.7); P.armor -= ab; P.hp -= a - ab * 0.7; } else P.hp -= a;
    P.hurtFx = 0.6; P.lastHurt = performance.now(); sfx.hurt();
    if (P.hp <= 0) die();
  }
  function die() {
    P.dead = true; P.deadAt = performance.now(); P.hp = 0; keys.fire = false; P.aim = false; el.dead.classList.add('on'); el.deadp.textContent = 'Čakate na sanitetce …';
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    Promise.resolve(o.onDeath ? o.onDeath() : null).then((r) => { if (r && r.over) el.deadp.textContent = 'Ekipa je izgubila vse življenja.'; else if (r) el.deadp.textContent = `Preostalih življenj: ${Math.max(0, r.lives - r.total)}. Vrnitev čez nekaj sekund.`; }).catch(() => {});
    setTimeout(respawn, 7000);
  }
  function respawn() {
    if (!state.running) return; const E = eng(); const c = o.checkpoint ? o.checkpoint() : CHECKPOINTS[0];
    if (E) { E.S.pos.x = c.x; E.S.pos.z = c.z; E.S.yaw = c.yaw; E.S.pitch = 0; }
    P.dead = false; P.hp = 65; P.armor = Math.max(P.armor, swat ? 40 : 20); P.ammo = Math.max(P.ammo, 10); P.mags = Math.max(P.mags, 2); el.dead.classList.remove('on');
    for (const n of state.npcs) if (n.kind === 'guard' && n.hp > 0) { n.state = 'idle'; n.react = 0; }
  }
  function tickGuard(n, dt, E) {
    n.t += dt; n.cd -= dt; n.flash = Math.max(0, n.flash - dt * 6); n.hurt = Math.max(0, n.hurt - dt * 2);
    if (n.state === 'cuffed') { n.walk = false; return; }
    if (n.state === 'surrender') { n.walk = false; n.yaw = Math.atan2(E.S.pos.x - n.x, -(E.S.pos.z - n.z)); if (n.t > 12 && !pointedAt(n, E)) { n.state = 'alert'; n.hands = false; n.react = DD.react; say('Nasprotnik je izkoristil trenutek in spet strelja!', 2400); } return; }
    const px = E.S.pos.x, pz = E.S.pos.z, d = Math.hypot(px - n.x, pz - n.z);
    const seen = d < DD.range && !P.dead && G.los(n.x, n.z, px, pz, 1.4) && (n.state === 'alert' || d < 7 || Math.abs(angDiff(Math.atan2(px - n.x, -(pz - n.z)), n.yaw)) < 1.3);
    n.walk = false;
    if (seen && !P.dead) {
      if (n.state !== 'alert') { n.state = 'alert'; n.react = DD.react; sfx.shout(); }
      n.yaw = Math.atan2(px - n.x, -(pz - n.z)); n.react -= dt;
      if (n.react <= 0 && n.cd <= 0) {
        n.cd = DD.gap * rand(0.8, 1.3); n.flash = 1; sfx.shot(d > 8 ? 1 : 0);
        const moving = P.moving ? 0.8 : 1, cover = P.aim ? 0.9 : 1; const hitP = clamp(DD.acc * moving * cover * (1.15 - d / (DD.range + 4)), 0.05, 0.9);
        if (Math.random() < hitP) damage(DD.dmg * rand(0.8, 1.3), n);
      }
      if (d > 6) step(n, Math.sin(n.yaw), -Math.cos(n.yaw), DD.speed * dt); else if (d < 3.5) step(n, -Math.sin(n.yaw), Math.cos(n.yaw), DD.speed * dt * 0.6);
      else { const sx = Math.cos(n.yaw) * Math.sin(n.t * 1.3); const sz = Math.sin(n.yaw) * Math.sin(n.t * 1.3); step(n, sx, sz, DD.speed * dt * 0.7); }
    } else if (n.state === 'search' || n.state === 'alert') {
      const tx = n.state === 'search' ? n.sx : px, tz = n.state === 'search' ? n.sz : pz, dd = Math.hypot(tx - n.x, tz - n.z);
      if (dd < 1.2 || n.t > 12 && n.state === 'search') { n.state = 'idle'; n.t = 0; } else { n.yaw = Math.atan2(tx - n.x, -(tz - n.z)); step(n, Math.sin(n.yaw), -Math.cos(n.yaw), DD.speed * dt * 0.8); }
      if (n.state === 'alert' && !seen && d > DD.range + 6) n.state = 'idle';
    } else { // ob stražarju
      const ph = n.t * 0.4; const tx = n.hx + Math.sin(ph) * 1.2, tz = n.hz + Math.cos(ph * 0.8) * 0.8; const dx = tx - n.x, dz = tz - n.z; if (Math.hypot(dx, dz) > 0.1) { n.yaw = Math.atan2(dx, -dz); step(n, dx, dz, 0.7 * dt); }
    }
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  function step(n, dx, dz, len) { const l = Math.hypot(dx, dz) || 1; const nx = n.x + dx / l * len, nz = n.z + dz / l * len; n.walk = true; if (!G.blocked(nx, n.z, 0.32)) n.x = nx; if (!G.blocked(n.x, nz, 0.32)) n.z = nz; }
  function pointedAt(n, E) {
    if (!P.aim || P.reloading > 0 || P.dead) return false; const dx = n.x - E.S.pos.x, dz = n.z - E.S.pos.z, d = Math.hypot(dx, dz); if (d > 14) return false;
    const a = Math.atan2(dx, -dz); if (Math.abs(angDiff(a, E.S.yaw)) > 0.16) return false; const py = Math.atan2(1.0 - E.S.pos.y, d); if (Math.abs(E.S.pitch - py) > 0.35) return false;
    return G.los(E.S.pos.x, E.S.pos.z, n.x, n.z, 1.3);
  }
  const WAY = [[23, 4], [17, -4], [22.5, -4], [17, 4], [20, 0]];
  function tickSuspect(n, dt, E) {
    n.hurt = Math.max(0, n.hurt - dt * 2); n.walk = false; const d = dist(n);
    if (n.state === 'cuffed') { n.hands = true; return; }
    const pointed = pointedAt(n, E);
    if (n.state === 'hide') {
      if (d < 11 && G.los(n.x, n.z, E.S.pos.x, E.S.pos.z, 1.2)) { n.watch += dt; n.look = pointed ? n.look + dt : 0; } else { n.watch = 0; n.look = 0; }
      n.yaw = Math.atan2(E.S.pos.x - n.x, -(E.S.pos.z - n.z));
      if (n.look > 1.0) { n.state = 'surrender'; n.hands = true; say('»Ne streljajte! Predajam se!« Pritisnite E ob njem za lisice.', 4200); sfx.shout(); }
      else if (n.alert || n.watch > 2.2) { if (!pointed || n.alert) { n.state = 'flee'; n.wp = 0; n.t = 0; say('Osumljenec beži! Pomerite ga s pištolo in ga ustavite.', 3600); sfx.shout(); } else n.watch = 1.5; }
    } else if (n.state === 'flee') {
      n.t += dt; const w = WAY[n.wp % WAY.length]; const dx = w[0] - n.x, dz = w[1] - n.z; n.yaw = Math.atan2(dx, -dz); step(n, dx, dz, 3.3 * dt); if (Math.hypot(dx, dz) < 0.7) n.wp++;
      if (d < 13 && pointed) { n.look += dt; if (n.look > 0.9) { n.state = 'surrender'; n.hands = true; say('»Stoj! … Dobro, dobro, predajam se!« Pritisnite E ob njem.', 4200); } } else n.look = Math.max(0, n.look - dt);
    } else if (n.state === 'surrender') { n.yaw = Math.atan2(E.S.pos.x - n.x, -(E.S.pos.z - n.z)); if (!P.cuffed && !pointed && d > 3) { n.rel = (n.rel || 0) + dt; if (n.rel > 5) { n.state = 'flee'; n.hands = false; n.rel = 0; say('Osumljenec je izkoristil trenutek in spet beži!', 3000); } } else n.rel = 0; }
  }
  function tickTarget(n, dt) { if (n.down > 0) { n.down -= dt; } }
  function frame(now) {
    if (!state.running) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; const E = eng();
    if (E) {
      const mv = E.S.keys.has('KeyW') || E.S.keys.has('KeyS') || E.S.keys.has('KeyA') || E.S.keys.has('KeyD'); P.moving = mv;
      if (P.dead || P.lock) E.setSpeed(0); else E.setSpeed(P.aim ? 0.55 : 1);
      P.cool -= dt; P.spread = Math.max(0, P.spread - dt * 0.05); P.recoil = Math.max(0, P.recoil - dt * 6); P.flash = Math.max(0, P.flash - dt); P.hurtFx = Math.max(0, P.hurtFx - dt); P.hitFx = Math.max(0, P.hitFx - dt); P.headFx = Math.max(0, P.headFx - dt);
      P.aimK += ((P.aim ? 1 : 0) - P.aimK) * Math.min(1, dt * 12); P.drawK = Math.min(1, P.drawK + dt * 3.2); if (P.slot !== 1) P.aim = false;
      if (P.reloading > 0) { P.reloading -= dt; if (P.reloading <= 0) { P.reloading = 0; const need = 20 - P.ammo; const take = Math.min(1, P.mags); if (take > 0) { P.mags -= 1; P.ammo = 20; } } }
      if ((keys.fire || P.fireReq) && !P.dead) shoot(); P.fireReq = false;
      if (!P.dead && performance.now() - P.lastHurt > 9000 && P.hp < 60) P.hp = Math.min(60, P.hp + dt * 4);
      if (P.badge > 0) { P.badge -= dt; if (P.badge <= 0) el.badge.classList.remove('on'); }
      const list = [];
      for (const n of state.npcs) {
        if (n.kind === 'guard') { if (n.hp > 0) tickGuard(n, dt, E); else { n.walk = false; n.flash = 0; } }
        else if (n.kind === 'suspect') { if (state.mode === 'combat') tickSuspect(n, dt, E); }
        else if (n.kind === 'target') tickTarget(n, dt);
        const dead = n.kind === 'guard' && n.hp <= 0, fall = (n.kind === 'target' && n.down > 0) || dead || (n.kind === 'suspect' && n.state === 'cuffed' && n.lyingT !== undefined) || (n.kind === 'guard' && n.state === 'cuffed');
        n.lyK = (n.lyK || 0) + ((fall ? 1 : 0) - (n.lyK || 0)) * Math.min(1, dt * (n.kind === 'target' && n.down < 0.5 ? 2 : 7));
        list.push({ id: n.id, x: n.x, z: n.z, yaw: n.yaw, av: n.av, walk: n.walk, flash: n.flash || 0, hurt: n.hurt || 0, phase: n.phase, lying: n.lyK < 0.02 ? 0 : n.lyK, side: n.side || 1, armed: n.kind === 'guard' && !dead && n.state !== 'surrender' && n.state !== 'cuffed', hands: n.state === 'surrender', cuffed: n.state === 'cuffed' });
      }
      E.setNpcs(list);
      if (E.setSelf) { if (P.third) E.setSelf({ x: E.S.pos.x, z: E.S.pos.z, av: o.selfAv || GUARD_AV, walk: P.moving ? 1 : 0, armed: P.slot === 1 }); else E.setSelf(null); }
    }
    hud(now); raf = requestAnimationFrame(frame);
  }
  // ---------- risanje HUD ----------
  const g2 = el.gun.getContext('2d');
  function hud(now) {
    el.hp.style.width = `${clamp(P.hp, 0, 100)}%`; el.ar.style.width = `${clamp(P.armor, 0, 100)}%`;
    el.ammo.firstChild.textContent = String(P.ammo); el.ammo.lastChild.textContent = P.reloading > 0 ? ' polnjenje' : `/ ${state.mode === 'range' ? '∞' : P.mags * 20}`;
    el.hurt.style.opacity = String(clamp(P.hurtFx * 1.4 + (P.hp < 30 ? 0.25 + Math.sin(now / 160) * 0.1 : 0), 0, 0.85));
    el.hit.style.opacity = String(P.hitFx > 0 ? 1 : 0); el.hit.classList.toggle('head', P.headFx > 0);
    const sp = (P.aim ? 6 : 14) + P.spread * 600; el.cross.style.setProperty('--sp', `${sp}px`); el.cross.style.opacity = P.aim ? '0.9' : '0.75';
    if (P.msgAt && now > P.msgAt) { el.msg.classList.remove('on'); P.msgAt = 0; }
    const r = el.gun.getBoundingClientRect(); const w = Math.round(r.width), h = Math.round(r.height); if (el.gun.width !== w || el.gun.height !== h) { el.gun.width = w; el.gun.height = h; }
    g2.clearRect(0, 0, w, h); if (!P.dead && !P.third) { if (P.slot === 1) drawGun(g2, w, h, now); else if (P.slot === 2) drawBadge(g2, w, h, now); else if (P.slot === 3) drawCuffs(g2, w, h, now); }
  }
  function drawBadge(g, w, h, now) {
    const k = easeOut(P.drawK), sc = Math.min(w, h) / 560; g.save(); g.translate(w * 0.62, h * (1.05 - 0.32 * k) + Math.sin(now / 900) * 3); g.scale(sc, sc);
    g.fillStyle = skinC(); g.beginPath(); g.ellipse(0, 150, 60, 150, 0, 0, 7); g.fill(); g.fillStyle = '#23262b'; g.fillRect(-70, 210, 140, 200);
    const gr = g.createLinearGradient(-110, -120, 110, 80); gr.addColorStop(0, '#2a2420'); gr.addColorStop(1, '#0f0c0a'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-100, -110); g.lineTo(100, -110); g.lineTo(100, 70); g.lineTo(-100, 70); g.closePath(); g.fill(); g.strokeStyle = '#4a4038'; g.lineWidth = 3; g.strokeRect(-92, -102, 184, 164);
    g.fillStyle = '#c9a54a'; g.beginPath(); g.arc(0, -20, 38, 0, 7); g.fill(); g.fillStyle = '#2a2420'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText('★', 0, -11);
    g.fillStyle = skinC(); g.beginPath(); g.ellipse(-92, 10, 16, 46, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(92, 10, 16, 46, 0, 0, 7); g.fill(); g.restore();
  }
  function drawCuffs(g, w, h, now) {
    const k = easeOut(P.drawK), sc = Math.min(w, h) / 560; g.save(); g.translate(w * 0.7, h * (1.05 - 0.3 * k)); g.scale(sc, sc);
    g.fillStyle = skinC(); g.beginPath(); g.ellipse(0, 130, 62, 150, 0.1, 0, 7); g.fill(); g.fillStyle = '#23262b'; g.fillRect(-70, 200, 140, 200);
    g.strokeStyle = '#c4c8d0'; g.lineWidth = 9; g.beginPath(); g.arc(-34, -20, 34, 0, 7); g.stroke(); g.beginPath(); g.arc(46, -4, 34, 0, 7); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(-2, -22); g.quadraticCurveTo(10, 22 + Math.sin(now / 300) * 5, 14, -6); g.stroke(); g.fillStyle = '#9aa0aa'; g.fillRect(-48, 8, 22, 12); g.fillRect(34, 24, 22, 12); g.restore();
  }
  const easeOut = (t) => 1 - (1 - t) ** 3; const skinC = () => (swat ? '#c9a07a' : '#d8b090');
  function drawGun(g, w, h, now) {
    const k = P.aimK, rec = P.recoil, rl = P.reloading > 0 ? Math.sin(clamp(1 - P.reloading / 1.7, 0, 1) * Math.PI) : 0;
    const bob = P.moving && !P.aim ? Math.sin(now / 170) * 6 : 0, bobx = P.moving && !P.aim ? Math.cos(now / 340) * 8 : 0;
    const dk = easeOut(P.drawK); const bx = w * (0.72 - 0.22 * k) + bobx, by = h * (0.95 - 0.07 * k) + bob + rec * 26 + rl * h * 0.28 + (1 - dk) * h * 0.5, sc = Math.min(w, h) / 560 * (1 + 0.15 * k);
    g.save(); g.translate(bx, by); g.scale(sc, sc); g.rotate(-rec * 0.08 + rl * 0.5);
    // roka
    g.fillStyle = '#23262b'; g.beginPath(); g.moveTo(70, 40); g.lineTo(190, 40); g.lineTo(230, 180); g.lineTo(40, 180); g.closePath(); g.fill();
    const skin = swat ? '#c9a07a' : '#d8b090';
    g.fillStyle = skin; g.beginPath(); g.ellipse(80, -10, 38, 60, 0.15, 0, 7); g.fill();
    // ročaj in zaklep
    const gr = g.createLinearGradient(0, -150, 0, 20); gr.addColorStop(0, '#4a4f58'); gr.addColorStop(1, '#16181c');
    g.fillStyle = gr; g.fillRect(-12, -150, 170, 56); g.fillStyle = '#0f1114'; g.fillRect(130, -145, 30, 46); // zaklep
    g.fillStyle = '#6a707a'; g.fillRect(-6, -148, 160, 8); g.fillStyle = '#16181c'; g.beginPath(); g.moveTo(-6, -98); g.lineTo(120, -98); g.lineTo(100, 20); g.lineTo(40, 30); g.closePath(); g.fill();
    g.fillStyle = '#0a0b0d'; g.fillRect(-26, -142, 18, 14); // cev
    g.fillStyle = '#eee'; g.fillRect(2, -156, 8, 8); g.fillRect(112, -158, 6, 10);
    g.fillStyle = skin; g.beginPath(); g.ellipse(68, -44, 22, 30, 0.4, 0, 7); g.fill();
    if (P.flash > 0) { const f = g.createRadialGradient(-30, -135, 2, -30, -135, 90); f.addColorStop(0, 'rgba(255,240,170,.95)'); f.addColorStop(0.4, 'rgba(255,170,60,.6)'); f.addColorStop(1, 'rgba(255,100,0,0)'); g.fillStyle = f; g.beginPath(); g.arc(-30, -135, 90, 0, 7); g.fill(); }
    g.restore();
    if (P.flash > 0) { g.fillStyle = 'rgba(255,220,140,.12)'; g.fillRect(0, 0, w, h); }
  }
  return {
    P, state,
    start(mode, opts2 = {}) {
      state.mode = mode; state.running = true; last = performance.now(); P.cuffed = false;
      if (mode === 'range') { spawnRange(); P.mags = 99; } else if (mode === 'combat') spawnGuards(); else if (mode === 'cell') setCell();
      const E = eng(); if (E) { E.setFps(true); } root.classList.add('on'); root.classList.toggle('range', mode === 'range'); if (opts2.baseGain) o.baseGain = opts2.baseGain;
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    setMode(mode) { this.start(mode); },
    stop() { state.running = false; if (P.third) { P.third = false; const E0 = eng(); if (E0 && E0.setThird) { E0.setThird(false); if (E0.setSelf) E0.setSelf(null); } } cancelAnimationFrame(raf); const E = eng(); if (E) { E.setFps(false); E.setNpcs([]); E.setSpeed(1); } root.classList.remove('on'); if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); const c = document.querySelector('.r3__canvas'); if (c) c.style.filter = ''; },
    destroy() { this.stop(); stageEl.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointermove', onMouseMove); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); stageEl.removeEventListener('contextmenu', noMenu); root.remove(); },
    use, say, lock(v) { P.lock = !!v; }, invalidate: () => G.invalidate(), refill() { P.hp = 100; P.armor = swat ? 100 : 60; P.ammo = 20; },
    suspect: () => state.suspect, alive: () => state.npcs.filter((n) => n.kind === 'guard' && n.hp > 0 && n.state !== 'cuffed').length,
  };
}
