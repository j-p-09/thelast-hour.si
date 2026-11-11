// Figure igralcev: privzeti videz, barvne palete, 2D risanje (lahki prikaz + urejevalnik) in 3D model (realistični prikaz).
export const DEFAULT_AVATAR = { skin: '#e0b090', hair: '#3a2a1c', shirt: '#2e5a88', pants: '#2a2a33', style: 0, acc: 0, build: 1, sex: 0, bottom: 0 };
export const PALETTES = {
  skin: ['#f3d2b6', '#e0b090', '#c68642', '#a06a3c', '#7a4a2a', '#4d2f1c'],
  hair: ['#1a1410', '#3a2a1c', '#6a4426', '#a87a3c', '#d8b26a', '#8a2a1c', '#b8b8b8', '#2a3a8a'],
  shirt: ['#2e5a88', '#aa2222', '#2f7a4a', '#d8b02a', '#6a3a8a', '#e8e8e8', '#222222', '#d86a2a'],
  pants: ['#2a2a33', '#3a4a6a', '#5a4a3a', '#6a6a6a', '#1a1a1a'],
};
export const STYLES = ['Kratki', 'Dolgi', 'Figa', 'Na kratko', 'Kodrasti', 'Čop'];
export const ACCS = ['Brez', 'Očala', 'Kapa', 'Brada', 'Uhani'];
export const SEXES = ['Moški', 'Ženska'];
export const BOTTOMS = ['Hlače', 'Krilo'];
export const BUILDS = ['Vitka', 'Povprečna', 'Močna'];

export const cleanAv = (a) => {
  const o = { ...DEFAULT_AVATAR, ...(a || {}) };
  const hx = (v, d) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : d);
  return { skin: hx(o.skin, DEFAULT_AVATAR.skin), hair: hx(o.hair, DEFAULT_AVATAR.hair), shirt: hx(o.shirt, DEFAULT_AVATAR.shirt), pants: hx(o.pants, DEFAULT_AVATAR.pants), style: Math.max(0, Math.min(5, o.style | 0)), acc: Math.max(0, Math.min(4, o.acc | 0)), build: Math.max(0, Math.min(2, o.build | 0)), sex: o.sex === 1 ? 1 : 0, bottom: o.bottom === 1 ? 1 : 0 };
};
const mix = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`; };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

// Nariše figuro: (x, y) = sredina stopal, h = višina v pikslih. light 0..1.4 prilagodi svetlost prizorišču.
export function drawAvatar2D(g, avIn, x, y, h, o = {}) {
  const av = cleanAv(avIn), s = h / 178, t = o.t || 0, walk = o.walk ? 1 : 0, L = o.light == null ? 1 : o.light;
  const sw = Math.sin(t * 7) * 5 * walk;
  const F = av.sex === 1, SK = av.bottom === 1;
  const tw = [34, 40, 47][av.build] * (F ? 0.88 : 1), hw = [11, 12, 13.5][av.build] * (F ? 1.08 : 1);
  g.save(); g.translate(x, y); g.scale(s, s);
  // senca
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 1, 26, 6, 0, 0, 7); g.fill();
  const C = (c) => mix(c, L);
  const Cm = (c, f) => mix(c, f * L);
  const grad = (x0, y0, x1, y1, c) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, mix(c, L * 1.18)); gr.addColorStop(1, mix(c, L * 0.72)); return gr; };
  // noge
  for (const sx of [-1, 1]) {
    const lx = sx * (hw - 3) + (sx * -sw * 0.35), top = -88, bw = 12.5;
    g.fillStyle = grad(lx - bw / 2, top, lx + bw / 2, 0, SK ? av.skin : av.pants); rr(g, lx - bw / 2, top, bw, 82 + (sx > 0 ? -sw : sw) * 0.2, 5); g.fill();
    g.fillStyle = C('#1c1c20'); rr(g, lx - bw / 2 - 1, -7, bw + 6, 8, 4); g.fill();
  }
  // roke (zadaj)
  const armY = -146;
  for (const sx of [-1, 1]) {
    const ax = sx * (tw / 2 + 4.5) + sx * sw * 0.15;
    g.fillStyle = grad(ax - 5, armY, ax + 5, armY + 56, av.shirt); rr(g, ax - 5, armY, 10, 50 - sx * sw * 0.3, 5); g.fill();
    g.fillStyle = C(av.skin); g.beginPath(); g.ellipse(ax, armY + 54 - sx * sw * 0.3, 5, 6, 0, 0, 7); g.fill();
  }
  // trup
  g.fillStyle = grad(-tw / 2, -150, tw / 2, -84, av.shirt); rr(g, -tw / 2, -150, tw, 68, 14); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.10)'; rr(g, -tw / 2 + 4, -146, tw * 0.28, 52, 8); g.fill();
  if (SK) { g.fillStyle = grad(-tw / 2 - 8, -90, tw / 2 + 8, -40, av.pants); g.beginPath(); g.moveTo(-tw / 2 + 1, -92); g.lineTo(tw / 2 - 1, -92); g.lineTo(tw / 2 + 11 + av.build * 2, -40); g.lineTo(-tw / 2 - 11 - av.build * 2, -40); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.18)'; g.stroke(); }
  else { g.fillStyle = C('#1c1c20'); g.fillRect(-tw / 2 + 2, -88, tw - 4, 5); } // pas
  // vrat in glava
  g.fillStyle = Cm(av.skin, 0.86); rr(g, -4.5, -157, 9, 11, 3); g.fill();
  const hy = -170;
  // lasje zadaj (dolgi / figa)
  g.fillStyle = grad(-14, hy - 14, 14, hy + 20, av.hair);
  if (av.style === 1) { rr(g, -15, hy - 8, 30, 46, 12); g.fill(); }
  if (av.style === 2) { g.beginPath(); g.arc(0, hy - 18, 7, 0, 7); g.fill(); }
  if (av.style === 5) { rr(g, 8, hy - 6, 9, 40, 4.5); g.fill(); }
  // glava
  g.fillStyle = grad(-12, hy - 14, 12, hy + 14, av.skin); g.beginPath(); g.ellipse(0, hy, 11.8, 13.8, 0, 0, 7); g.fill();
  g.fillStyle = Cm(av.skin, 0.9); g.beginPath(); g.ellipse(-12, hy + 1, 2.2, 3.4, 0, 0, 7); g.ellipse(12, hy + 1, 2.2, 3.4, 0, 0, 7); g.fill();
  // lasje spredaj
  g.fillStyle = grad(-13, hy - 15, 13, hy, av.hair);
  if (av.style === 0) { g.beginPath(); g.moveTo(-12.4, hy - 2); g.quadraticCurveTo(-13, hy - 17, 0, hy - 15.5); g.quadraticCurveTo(13, hy - 17, 12.4, hy - 2); g.quadraticCurveTo(8, hy - 9, 0, hy - 8); g.quadraticCurveTo(-8, hy - 9, -12.4, hy - 2); g.fill(); }
  else if (av.style === 1) { g.beginPath(); g.moveTo(-12.8, hy + 10); g.quadraticCurveTo(-14, hy - 17, 0, hy - 16); g.quadraticCurveTo(14, hy - 17, 12.8, hy + 10); g.lineTo(10, hy + 2); g.quadraticCurveTo(0, hy - 10, -10, hy + 2); g.fill(); }
  else if (av.style === 2) { g.beginPath(); g.moveTo(-12.2, hy - 1); g.quadraticCurveTo(-12, hy - 16, 0, hy - 15); g.quadraticCurveTo(12, hy - 16, 12.2, hy - 1); g.quadraticCurveTo(0, hy - 10, -12.2, hy - 1); g.fill(); }
  else if (av.style === 5) { g.beginPath(); g.moveTo(-12.4, hy - 2); g.quadraticCurveTo(-13, hy - 17, 0, hy - 15.5); g.quadraticCurveTo(13, hy - 17, 12.4, hy - 2); g.quadraticCurveTo(8, hy - 9, 0, hy - 8); g.quadraticCurveTo(-8, hy - 9, -12.4, hy - 2); g.fill(); }
  else if (av.style === 3) { g.beginPath(); g.moveTo(-11.6, hy - 3); g.quadraticCurveTo(-11, hy - 14, 0, hy - 14.5); g.quadraticCurveTo(11, hy - 14, 11.6, hy - 3); g.quadraticCurveTo(0, hy - 10, -11.6, hy - 3); g.fill(); }
  else { for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * 5.2, hy - 12.5 + Math.abs(i) * 1.6, 6, 0, 7); g.fill(); } }
  // obraz
  g.fillStyle = C('#ffffff'); g.beginPath(); g.ellipse(-4.4, hy + 0.5, 2.3, 1.9, 0, 0, 7); g.ellipse(4.4, hy + 0.5, 2.3, 1.9, 0, 0, 7); g.fill();
  g.fillStyle = C('#2a1c14'); g.beginPath(); g.arc(-4.2, hy + 0.7, 1.3, 0, 7); g.arc(4.2, hy + 0.7, 1.3, 0, 7); g.fill();
  g.strokeStyle = Cm(av.skin, 0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(0, hy + 2); g.lineTo(-0.8, hy + 5.4); g.lineTo(0.8, hy + 5.4); g.stroke();
  g.strokeStyle = C(F ? '#b03a4a' : '#7a3a30'); g.lineWidth = F ? 1.9 : 1.3; g.beginPath(); g.moveTo(-3.4, hy + 8.2); g.quadraticCurveTo(0, hy + 10.2, 3.4, hy + 8.2); g.stroke();
  g.strokeStyle = C(av.hair); g.lineWidth = 1.4; g.beginPath(); g.moveTo(-7, hy - 3.8); g.lineTo(-2.4, hy - 4.4); g.moveTo(2.4, hy - 4.4); g.lineTo(7, hy - 3.8); g.stroke();
  if (F) { g.strokeStyle = C('#1a1410'); g.lineWidth = 1.1; g.beginPath(); g.moveTo(-6.6, hy - 0.6); g.lineTo(-7.8, hy - 1.8); g.moveTo(6.6, hy - 0.6); g.lineTo(7.8, hy - 1.8); g.stroke(); }
  // dodatki
  if (av.acc === 4) { g.fillStyle = C('#e8c25a'); g.beginPath(); g.arc(-12, hy + 5.5, 2, 0, 7); g.arc(12, hy + 5.5, 2, 0, 7); g.fill(); }
  if (av.acc === 1) { g.strokeStyle = C('#1a1a1a'); g.lineWidth = 1.5; g.beginPath(); g.arc(-4.6, hy + 0.7, 4.3, 0, 7); g.moveTo(9.2, hy + 0.7); g.arc(4.6, hy + 0.7, 4.3, 0, 7); g.moveTo(-0.4, hy + 0.2); g.lineTo(0.4, hy + 0.2); g.stroke(); }
  if (av.acc === 2) { g.fillStyle = grad(-13, hy - 20, 13, hy - 8, av.shirt); g.beginPath(); g.moveTo(-13, hy - 6); g.quadraticCurveTo(-13, hy - 22, 0, hy - 21); g.quadraticCurveTo(13, hy - 22, 13, hy - 6); g.closePath(); g.fill(); rr(g, -15, hy - 8, 30, 4, 2); g.fillStyle = Cm(av.shirt, 0.7); g.fill(); }
  if (av.acc === 3) { g.fillStyle = grad(-11, hy + 2, 11, hy + 18, av.hair); g.beginPath(); g.moveTo(-11, hy + 2); g.quadraticCurveTo(-12, hy + 17, 0, hy + 19); g.quadraticCurveTo(12, hy + 17, 11, hy + 2); g.quadraticCurveTo(0, hy + 8, -11, hy + 2); g.fill(); }
  // ime
  if (o.name) {
    g.font = 'bold 15px sans-serif'; const w = g.measureText(o.name).width + 14, ty = hy - 36;
    g.fillStyle = 'rgba(0,0,0,.65)'; rr(g, -w / 2, ty - 13, w, 20, 10); g.fill(); g.fillStyle = '#ffd38a'; g.textAlign = 'center'; g.fillText(o.name, 0, ty + 2);
  }
  g.restore();
}

// 3D model za realistični prikaz (three.js). Vrne skupino; userData.parts vsebuje sklepe za animacijo hoje.
export function buildAvatar3D(T, avIn, name) {
  const av = cleanAv(avIn), G = new T.Group();
  const M = (c, r = 0.6, m = 0.02) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const skin = M(av.skin, 0.55), shirt = M(av.shirt, 0.75), pants = M(av.pants, 0.8), hair = M(av.hair, 0.7), shoe = M('#1c1c20', 0.5);
  const bw = [0.15, 0.175, 0.2][av.build];
  const part = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
  const F = av.sex === 1, SK = av.bottom === 1;
  const torso = part(new T.CapsuleGeometry(bw, 0.3, 6, 16), shirt, 0, 1.12, 0); torso.scale.set(F ? 1.0 : 1.15, 1, 0.72); G.add(torso);
  const legMat = SK ? skin : pants;
  if (SK) { const sk = part(new T.CylinderGeometry(bw * 0.95, bw * 1.9, 0.42, 20, 1, true), pants, 0, 0.7, 0); sk.material.side = T.DoubleSide; G.add(sk); }
  const legs = [];
  for (const sx of [-1, 1]) {
    const piv = new T.Group(); piv.position.set(sx * 0.085, 0.86, 0);
    piv.add(part(new T.CapsuleGeometry(0.062, 0.62, 6, 12), legMat, 0, -0.38, 0)); piv.add(part(new T.BoxGeometry(0.1, 0.07, 0.2), shoe, 0, -0.76, 0.04));
    G.add(piv); legs.push(piv);
  }
  const arms = [];
  for (const sx of [-1, 1]) {
    const piv = new T.Group(); piv.position.set(sx * (bw * 1.15 + 0.06), 1.4, 0);
    piv.add(part(new T.CapsuleGeometry(0.048, 0.42, 6, 12), shirt, 0, -0.26, 0)); piv.add(part(new T.SphereGeometry(0.05, 12, 10), skin, 0, -0.55, 0));
    G.add(piv); arms.push(piv);
  }
  G.add(part(new T.CylinderGeometry(0.045, 0.05, 0.09, 12), skin, 0, 1.5, 0));
  const head = part(new T.SphereGeometry(0.115, 24, 18), skin, 0, 1.64, 0); head.scale.set(0.95, 1.08, 1); G.add(head);
  for (const sx of [-1, 1]) {
    G.add(part(new T.SphereGeometry(0.014, 8, 6), M('#ffffff', 0.3), sx * 0.04, 1.66, 0.105)); G.add(part(new T.SphereGeometry(0.009, 8, 6), M('#241810', 0.3), sx * 0.04, 1.66, 0.116));
    G.add(part(new T.SphereGeometry(0.02, 8, 6), skin, sx * 0.112, 1.64, 0));
  }
  G.add(part(new T.SphereGeometry(0.013, 8, 6), M(av.skin, 0.6), 0, 1.63, 0.118));
  const mouth = part(new T.BoxGeometry(0.04, 0.007, 0.006), M('#7a3a30', 0.6), 0, 1.595, 0.112); G.add(mouth);
  // pričeska
  const cap = (r, sy = 1) => { const h = part(new T.SphereGeometry(r, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), hair, 0, 1.655, -0.004); h.scale.set(0.98, sy, 1.02); return h; };
  if (av.style === 0) G.add(cap(0.125));
  else if (av.style === 1) { G.add(cap(0.128)); const back = part(new T.CapsuleGeometry(0.1, 0.22, 4, 12), hair, 0, 1.52, -0.06); back.scale.set(1.05, 1, 0.55); G.add(back); }
  else if (av.style === 2) { G.add(cap(0.122)); G.add(part(new T.SphereGeometry(0.05, 12, 10), hair, 0, 1.78, -0.05)); }
  else if (av.style === 3) G.add(cap(0.119, 0.95));
  else if (av.style === 5) { G.add(cap(0.122)); G.add(part(new T.CapsuleGeometry(0.035, 0.2, 4, 10), hair, 0, 1.6, -0.14)); }
  else { for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; G.add(part(new T.SphereGeometry(0.05, 10, 8), hair, Math.cos(a) * 0.085, 1.72 + (i % 2) * 0.02, Math.sin(a) * 0.085)); } G.add(part(new T.SphereGeometry(0.07, 12, 10), hair, 0, 1.76, 0)); }
  // dodatki
  if (av.acc === 1) { const gm = M('#111111', 0.3, 0.6); for (const sx of [-1, 1]) { const r = part(new T.TorusGeometry(0.032, 0.004, 8, 20), gm, sx * 0.045, 1.66, 0.112); G.add(r); } G.add(part(new T.BoxGeometry(0.03, 0.004, 0.004), gm, 0, 1.668, 0.114)); }
  if (av.acc === 2) { const c = part(new T.SphereGeometry(0.128, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), shirt, 0, 1.675, 0); G.add(c); G.add(part(new T.BoxGeometry(0.2, 0.01, 0.1), shirt, 0, 1.676, 0.12)); }
  if (av.acc === 3) { const b = part(new T.SphereGeometry(0.11, 18, 12, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48), hair, 0, 1.64, 0.012); b.scale.set(0.97, 1.0, 1.02); G.add(b); }
  if (av.acc === 4) { const gd = M('#e8c25a', 0.3, 0.8); for (const sx of [-1, 1]) G.add(part(new T.SphereGeometry(0.014, 8, 6), gd, sx * 0.117, 1.6, 0)); }
  // ime nad glavo
  try {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; const w = Math.min(244, g.measureText(name || '').width + 28);
    g.fillStyle = 'rgba(0,0,0,.65)'; rr(g, 128 - w / 2, 8, w, 44, 22); g.fill(); g.fillStyle = '#ffd38a'; g.fillText(name || '', 128, 41);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.position.set(0, 2.0, 0); sp.scale.set(0.6, 0.15, 1); G.add(sp);
  } catch (_) { /* ime ni obvezno */ }
  G.userData.parts = { legs, arms };
  return G;
}


// Prikazen (Primer 003): bleda postava v spalni srajci z dolgimi lasmi. Samo okras.
export function drawGhost2D(g, x, y, h, o = {}) {
  const s = h / 178, a = o.alpha == null ? 0.85 : o.alpha, t = o.t || 0, sway = Math.sin(t * 2.2) * 3;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = a;
  const gr = g.createLinearGradient(0, -170, 0, 0); gr.addColorStop(0, 'rgba(235,240,235,.95)'); gr.addColorStop(1, 'rgba(120,130,125,.0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(-16 + sway, -148); g.lineTo(16 + sway, -148); g.quadraticCurveTo(34, -70, 40 + sway * 2, 0); g.lineTo(-40 + sway * 2, 0); g.quadraticCurveTo(-34, -70, -16 + sway, -148); g.fill();
  g.fillStyle = 'rgba(10,8,8,.92)'; g.beginPath(); g.moveTo(-15 + sway, -176); g.quadraticCurveTo(-22, -120, -16 + sway, -60); g.lineTo(-6 + sway, -64); g.lineTo(-6, -170); g.fill(); g.beginPath(); g.moveTo(15 + sway, -176); g.quadraticCurveTo(22, -120, 16 + sway, -60); g.lineTo(6 + sway, -64); g.lineTo(6, -170); g.fill();
  g.fillStyle = 'rgba(225,230,224,.95)'; g.beginPath(); g.ellipse(sway * 0.5, -163, 11, 14, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(8,6,6,.96)'; g.beginPath(); g.ellipse(-4.5 + sway * 0.5, -165, 2.8, 4.5, 0, 0, 7); g.ellipse(4.5 + sway * 0.5, -165, 2.8, 4.5, 0, 0, 7); g.ellipse(sway * 0.5, -155, 2.6, 4, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(-4.5 + sway * 0.5, -165, 0.9, 0, 7); g.arc(4.5 + sway * 0.5, -165, 0.9, 0, 7); g.fill();
  g.restore();
}
export function buildGhost3D(T) {
  const G = new T.Group(); const m = new T.MeshBasicMaterial({ color: 0xdfe6e0, transparent: true, opacity: 0.8, depthWrite: false });
  const body = new T.Mesh(new T.ConeGeometry(0.34, 1.4, 20, 1, true), m); body.position.y = 0.8; body.material.side = T.DoubleSide; G.add(body);
  const head = new T.Mesh(new T.SphereGeometry(0.12, 16, 12), m); head.position.y = 1.62; head.scale.set(0.95, 1.2, 1); G.add(head);
  const hair = new T.Mesh(new T.CylinderGeometry(0.12, 0.17, 0.7, 12, 1, true), new T.MeshBasicMaterial({ color: 0x0a0808, transparent: true, opacity: 0.9, side: T.DoubleSide })); hair.position.set(0, 1.35, -0.06); G.add(hair);
  for (const sx of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.022, 8, 6), new T.MeshBasicMaterial({ color: 0x050303 })); e.position.set(sx * 0.045, 1.64, 0.105); e.scale.set(1, 1.5, 1); G.add(e); }
  G.userData.mats = [m]; return G;
}
