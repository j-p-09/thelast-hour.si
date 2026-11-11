// Primer 004: nočna vožnja do stavbe (luči, intervencijske luči, sirena, promet, ki se umika).
import { ROAD_CARS, carPos, roadC, roadK, ROAD_TOTAL } from './room3d-scene4.js';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createDrive(o) {
  // o: { stage, getEng, sfx, toast, vehicle:'swat'|'civil', total, onArrive, role }
  const total = o.total || ROAD_TOTAL; const D = { dist: 0, lat: 0, siren: 0, t: 0, v: 0 };
  const L = { head: true, blue: false, siren: false }; let running = false, raf = 0, last = 0, shake = 0, crashCd = 0, arrived = false, sirenK = 0;
  const swat = o.vehicle === 'swat';
  const root = document.createElement('div'); root.className = 'drv';
  root.innerHTML = `<div class="drv__flash"></div><canvas class="drv__dash"></canvas>
    <div class="drv__panel"><button data-k="head">Žarometi (H)</button><button data-k="blue">${swat ? 'Intervencijske luči (L)' : 'Skrite luči (L)'}</button><button data-k="siren">Sirena (K)</button><button data-k="horn">Hupa (G)</button></div>
    <div class="drv__hud"><b class="drv__speed">0</b><small>km/h</small><div class="drv__bar"><i></i></div><span class="drv__left"></span></div><div class="drv__help">W gas · S zavora · A/D krmiljenje · cilj: stavba</div>`;
  o.stage.appendChild(root);
  const q = (s) => root.querySelector(s); const flash = q('.drv__flash'), dash = q('.drv__dash'), spd = q('.drv__speed'), bar = q('.drv__bar i'), left = q('.drv__left');
  const buttons = {}; root.querySelectorAll('.drv__panel button').forEach((b) => { buttons[b.dataset.k] = b; b.addEventListener('click', (e) => { e.stopPropagation(); toggle(b.dataset.k); }); b.addEventListener('pointerdown', (e) => e.stopPropagation()); });
  function toggle(k) {
    if (k === 'head') L.head = !L.head; else if (k === 'blue') L.blue = !L.blue; else if (k === 'siren') { L.siren = !L.siren; if (L.siren) o.sfx.sirenOn(); else o.sfx.sirenOff(); } else if (k === 'horn') o.sfx.horn();
    for (const [n, b] of Object.entries(buttons)) b.classList.toggle('on', !!L[n]);
    const E = o.getEng(); if (E) E.setFlash(L.head);
  }
  const onKey = (e) => { if (!running || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return; if (e.code === 'KeyH') toggle('head'); else if (e.code === 'KeyL') toggle('blue'); else if (e.code === 'KeyK') toggle('siren'); else if (e.code === 'KeyG') toggle('horn'); };
  window.addEventListener('keydown', onKey);
  const onLook = (e) => { if (!running || !D.out) return; const E = o.getEng(); if (!E || !document.pointerLockElement) return; E.S.yaw += (e.movementX || 0) * 0.0022; E.S.pitch = clamp(E.S.pitch - (e.movementY || 0) * 0.0022, -1, 1); };
  const onClick = (e) => { if (running && D.out && !document.pointerLockElement && !(e.target.closest && e.target.closest('button'))) { const c = document.querySelector('.r3__canvas'); if (c && c.requestPointerLock) { try { c.requestPointerLock(); } catch (_) { /* nič */ } } } };
  window.addEventListener('pointermove', onLook); o.stage.addEventListener('pointerdown', onClick);
  const hint = document.createElement('div'); hint.className = 'drv__hint'; root.appendChild(hint);
  function pushOut(E) { const p = E.S.pos, lx = -(D.lat || 0) * 0 ; const hw = 1.15, z0 = 14.9, z1 = 19.5; if (Math.abs(p.x) < hw && p.z > z0 && p.z < z1) { if (Math.abs(p.x) / hw > Math.min(p.z - z0, z1 - p.z) / 2.3) p.x = (p.x >= 0 ? 1 : -1) * hw; else p.z = p.z - z0 < z1 - p.z ? z0 : z1; } }
  function beginExit() {
    if (arrived || D.out) return; arrived = true; D.v = 0; o.sfx.engine(0, false); o.sfx.sirenOff(); L.siren = false; hint.classList.remove('on');
    o.sfx.door(); setTimeout(() => { o.sfx.door(); D.out = true; root.classList.add('out'); const E = o.getEng(); if (E) { E.S.pos.x = 1.9; E.S.pos.z = 16.2; E.S.yaw = -1.1; E.S.pitch = 0; E.setSpeed(1); E.setThird && 0; } o.toast('Izstopili ste. Ekipa se zbira pred vhodom.', 'ok', 3200); o.onArrive && o.onArrive(); }, 900);
  }
  const g = dash.getContext('2d');
  function drawDash(w, h, now) {
    g.clearRect(0, 0, w, h); const s = Math.min(w, h) / 600;
    g.save(); g.translate(w / 2, h);
    // armaturna plošča
    const gr = g.createLinearGradient(0, -220 * s, 0, 0); gr.addColorStop(0, '#15171b'); gr.addColorStop(1, '#050608'); g.fillStyle = gr; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -90 * s); g.quadraticCurveTo(0, -200 * s, w / 2, -90 * s); g.lineTo(w / 2, 0); g.closePath(); g.fill();
    // volan
    g.rotate((D.lat - D._lat0 || 0) * 0.0); g.rotate(clamp((D.steer || 0) * 0.6, -0.9, 0.9)); g.strokeStyle = '#0c0d10'; g.lineWidth = 22 * s; g.beginPath(); g.arc(0, 30 * s, 150 * s, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); g.lineWidth = 8 * s; g.strokeStyle = '#2a2d33'; g.beginPath(); g.arc(0, 30 * s, 150 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.restore();
    // kazalnik hitrosti
    g.save(); g.translate(w / 2 - 190 * s, h - 60 * s); g.fillStyle = '#0a0c10'; g.beginPath(); g.arc(0, 0, 54 * s, 0, 7); g.fill(); g.strokeStyle = '#3a3f48'; g.lineWidth = 3; g.stroke(); const a = -2.3 + (D.v / 30) * 4.6; g.strokeStyle = '#ff5a30'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 46 * s, Math.sin(a) * 46 * s); g.stroke(); g.restore();
    // intervencijske luči v maski (civilno vozilo) ali na strehi (oklepnik)
    const on = L.blue ? Math.floor(now / 140) % 2 : -1;
    if (!swat) { g.fillStyle = on === 0 ? '#ff2a2a' : '#401010'; g.fillRect(w / 2 - 150 * s, h - 168 * s, 46 * s, 8 * s); g.fillStyle = on === 1 ? '#2a50ff' : '#101840'; g.fillRect(w / 2 + 104 * s, h - 168 * s, 46 * s, 8 * s); }
  }
  function frame(now) {
    if (!running) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; D.t += dt; const E = o.getEng();
    const k = E ? E.S.keys : new Set(); const gas = k.has('KeyW') || k.has('ArrowUp') ? 1 : 0, brk = k.has('KeyS') || k.has('ArrowDown') ? 1 : 0, st = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    const vmax = swat ? 26 : 32; D.v = clamp(D.v + (gas * (swat ? 7 : 9) - brk * 18 - 1.2 - D.v * 0.04) * dt, 0, vmax); D.steer = (D.steer || 0) + (st - (D.steer || 0)) * Math.min(1, dt * 5); D.slope = (roadC(D.dist + 8) - roadC(D.dist)) / 8;
    if (D.out) { D.v = 0; } else {
      const kc = roadK(D.dist); D.lat = D.lat + D.steer * Math.min(D.v, 18) * 0.28 * dt * 3 - kc * D.v * D.v * 1.1 * dt; // sredobežna sila v ovinku
      if (Math.abs(D.lat) > 5.3) { D.v *= 1 - Math.min(0.9, dt * 1.8); shake = Math.max(shake, 0.25); if (crashCd <= 0 && Math.abs(D.lat) > 6.6 && D.v > 8) { o.sfx.crash(); crashCd = 1.5; o.toast('Zapeljali ste s ceste! Vrnite se na vozišče.', 'warn', 2400); D.v *= 0.4; } }
      D.lat = clamp(D.lat, -7.4, 7.4);
      const gate = total + 3; D.dist += D.v * dt;
      if (D.dist >= gate) { if (D.v > 6) { o.sfx.crash(); shake = 0.8; o.toast('Trk v zaporo! Ustavite se prej.', 'warn', 2200); } D.dist = gate; D.v = 0; }
    }
    if (!D.out) o.sfx.engine(D.v, true);
    sirenK += ((L.siren ? 1 : 0) - sirenK) * Math.min(1, dt * 2.5); D.siren = sirenK; crashCd -= dt;
    // trk
    if (crashCd <= 0) for (const c of ROAD_CARS) { const p = carPos(c, D); if (Math.abs(p.x) < 1.75 && p.zBack > 14.8 && p.zFront < 17.6) { D.v *= 0.2; shake = 0.6; crashCd = 1.2; o.sfx.crash(); o.toast('Trk! Vklopite sireno ali zapeljite mimo.', 'warn', 2200); break; } }
    shake = Math.max(0, shake - dt);
    if (E) { E.S.pos.x = 0; E.S.pos.z = 17; if (!D.out) { E.S.pos.x = 0; E.S.pos.z = 17; E.S.yaw = clamp((D.steer || 0) * 0.05 - D.slope * 0.5, -0.5, 0.5); E.S.pitch = -0.04; } else pushOut(E); E.setState({ ...(E.S.state || {}), drive: { dist: D.dist, lat: D.lat, siren: D.siren, out: D.out } }); }
    const pct = clamp(D.dist / total, 0, 1); bar.style.width = `${pct * 100}%`; spd.textContent = String(Math.round(D.v * 3.6)); left.textContent = `${Math.max(0, Math.round(total - D.dist))} m`;
    // utripanje intervencijskih luči po zaslonu
    if (L.blue) { const ph = Math.floor(now / 140) % 2; flash.style.background = swat ? (ph ? 'radial-gradient(ellipse at 15% 20%, rgba(255,30,30,.3), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(40,70,255,.14), transparent 50%)' : 'radial-gradient(ellipse at 85% 20%, rgba(40,70,255,.3), transparent 55%), radial-gradient(ellipse at 15% 90%, rgba(255,30,30,.14), transparent 50%)') : (ph ? 'radial-gradient(ellipse at 10% 100%, rgba(255,30,30,.35), transparent 40%)' : 'radial-gradient(ellipse at 90% 100%, rgba(40,70,255,.35), transparent 40%)'); flash.style.opacity = '1'; } else flash.style.opacity = '0';
    root.style.transform = shake > 0 ? `translate(${(Math.random() - 0.5) * 14 * shake}px, ${(Math.random() - 0.5) * 10 * shake}px)` : '';
    const r = dash.getBoundingClientRect(); const w = Math.round(r.width), h = Math.round(r.height); if (dash.width !== w || dash.height !== h) { dash.width = w; dash.height = h; } drawDash(w, h, now);
    left.textContent = D.out ? '' : `${Math.max(0, Math.round(total - D.dist))} m`;
    if (!D.out && !arrived && D.dist > total - 24 && D.v < 0.4 && (k.has('KeyE') || D.stopT > 1.4)) beginExit();
    if (!D.out && D.dist > total - 24 && D.v < 0.4) { D.stopT = (D.stopT || 0) + dt; hint.textContent = 'Vozilo stoji: pritisnite E in izstopite'; hint.classList.add('on'); } else { D.stopT = 0; if (!D.out) hint.classList.remove('on'); }
    if (!D.out && D.dist > total - 24 && D.v >= 0.4) { hint.textContent = 'Ustavite vozilo (S)'; hint.classList.add('on'); }
    raf = requestAnimationFrame(frame);
  }
  return {
    D, start() { running = true; last = performance.now(); const E = o.getEng(); if (E) { E.setFps(true); E.setSpeed(0); E.setFlash(true); } root.classList.add('on'); toggle('head'); toggle('head'); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); o.sfx.sirenOff(); o.sfx.engine(0, false); root.classList.remove('on'); const E = o.getEng(); if (E) { E.setFlash(false); E.setSpeed(1); } },
    destroy() { this.stop(); window.removeEventListener('keydown', onKey); window.removeEventListener('pointermove', onLook); o.stage.removeEventListener('pointerdown', onClick); if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); root.remove(); },
    setVehicle() {}, lights: L,
  };
}
