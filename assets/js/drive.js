// Primer 004: nočna vožnja do stavbe (luči, intervencijske luči, sirena, promet, ki se umika).
import { ROAD_CARS, carPos } from './room3d-scene4.js';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createDrive(o) {
  // o: { stage, getEng, sfx, toast, vehicle:'swat'|'civil', total, onArrive, role }
  const total = o.total || 1100; const D = { dist: 0, lat: 0, siren: 0, t: 0, v: 0 };
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
    const vmax = swat ? 26 : 32; D.v = clamp(D.v + (gas * (swat ? 7 : 9) - brk * 18 - 1.2 - D.v * 0.04) * dt, 0, vmax); D.steer = (D.steer || 0) + (st - (D.steer || 0)) * Math.min(1, dt * 5);
    D.lat = clamp(D.lat + D.steer * Math.min(D.v, 18) * 0.28 * dt * 3, -4.2, 4.2); D.dist += D.v * dt;
    sirenK += ((L.siren ? 1 : 0) - sirenK) * Math.min(1, dt * 2.5); D.siren = sirenK; crashCd -= dt;
    // trk
    if (crashCd <= 0) for (const c of ROAD_CARS) { const p = carPos(c, D); if (Math.abs(p.x) < 1.75 && p.zBack > 14.8 && p.zFront < 17.6) { D.v *= 0.2; shake = 0.6; crashCd = 1.2; o.sfx.crash(); o.toast('Trk! Vklopite sireno ali zapeljite mimo.', 'warn', 2200); break; } }
    shake = Math.max(0, shake - dt);
    if (E) { E.S.pos.x = 0; E.S.pos.z = 17; E.S.yaw = clamp((D.steer || 0) * 0.05, -0.1, 0.1); E.S.pitch = -0.04; E.setState({ ...(E.S.state || {}), drive: { dist: D.dist, lat: D.lat, siren: D.siren } }); }
    const pct = clamp(D.dist / total, 0, 1); bar.style.width = `${pct * 100}%`; spd.textContent = String(Math.round(D.v * 3.6)); left.textContent = `${Math.max(0, Math.round(total - D.dist))} m`;
    // utripanje intervencijskih luči po zaslonu
    if (L.blue) { const ph = Math.floor(now / 140) % 2; flash.style.background = swat ? (ph ? 'radial-gradient(ellipse at 15% 20%, rgba(255,30,30,.3), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(40,70,255,.14), transparent 50%)' : 'radial-gradient(ellipse at 85% 20%, rgba(40,70,255,.3), transparent 55%), radial-gradient(ellipse at 15% 90%, rgba(255,30,30,.14), transparent 50%)') : (ph ? 'radial-gradient(ellipse at 10% 100%, rgba(255,30,30,.35), transparent 40%)' : 'radial-gradient(ellipse at 90% 100%, rgba(40,70,255,.35), transparent 40%)'); flash.style.opacity = '1'; } else flash.style.opacity = '0';
    root.style.transform = shake > 0 ? `translate(${(Math.random() - 0.5) * 14 * shake}px, ${(Math.random() - 0.5) * 10 * shake}px)` : '';
    const r = dash.getBoundingClientRect(); const w = Math.round(r.width), h = Math.round(r.height); if (dash.width !== w || dash.height !== h) { dash.width = w; dash.height = h; } drawDash(w, h, now);
    if (D.dist >= total && !arrived) { arrived = true; o.onArrive && o.onArrive(); }
    raf = requestAnimationFrame(frame);
  }
  return {
    D, start() { running = true; last = performance.now(); const E = o.getEng(); if (E) { E.setFps(true); E.setSpeed(0); E.setFlash(true); } root.classList.add('on'); toggle('head'); toggle('head'); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); o.sfx.sirenOff(); root.classList.remove('on'); const E = o.getEng(); if (E) { E.setFlash(false); E.setSpeed(1); } },
    destroy() { this.stop(); window.removeEventListener('keydown', onKey); root.remove(); },
    setVehicle() {}, lights: L,
  };
}
