// Prizorišče Primera 002: Leonova pisarna. Samo geometrija in izgled; odgovorov in vsebine sledi tukaj ni.
const sh = (h, L) => { const n = parseInt(h.slice(1), 16); const k = Math.max(0.05, Math.min(1.5, L)); return `rgb(${Math.min(255, ((n >> 16) & 255) * k) | 0},${Math.min(255, ((n >> 8) & 255) * k) | 0},${Math.min(255, (n & 255) * k) | 0})`; };
const txt = (g, s, x, y, size, color, align = 'left', font = 'sans-serif') => { g.font = `${size}px ${font}`; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y); };

export const OBJECT_LABELS = {
  door: 'Vrata', phone: 'Telefon', laptop: 'Prenosnik', desk: 'Pisalna miza', radio: 'Radio', clock: 'Stoječa ura', painting: 'Slika', safe: 'Sef',
  photos: 'Fotografije', calendar: 'Koledar', bar: 'Barska omarica', armchair: 'Fotelj', sidetable: 'Mizica', fireplace: 'Kamin', detector: 'Detektor CO',
  ladder: 'Lestev', bookcase: 'Knjižna omara', watchcase: 'Vitrina z urami', wastebasket: 'Koš', window: 'Okno', globe: 'Globus', chess: 'Šahovnica', lamp: 'Svetilka',
};

export function buildScene() {
  const boxes = [];
  const B = (id, obj, min, max, color, o = {}) => { boxes.push({ id, obj, min, max, color, ...o }); };
  const wood = '#5a3a22', dark = '#2a1b12';

  // ---- vrata (južna stena) ----
  B('door', 'door', [-3.1, 0, 2.93], [-2.1, 2.15, 3.0], '#4a2f1c', { solid: false, decals: { '-z': { draw(g, { L, st }) {
    g.fillStyle = sh('#3a2414', L); g.fillRect(8, 10, 84, 90); g.fillRect(8, 112, 84, 95);
    g.fillStyle = sh('#111418', L); g.fillRect(66, 92, 22, 34); g.fillStyle = (Math.floor(Date.now() / 700) % 2 ? sh('#ff3030', 1.2) : sh('#701010', 1)); g.beginPath(); g.arc(77, 99, 2.4, 0, 7); g.fill();
    g.fillStyle = sh('#bfa05a', L); g.beginPath(); g.arc(77, 112, 4.5, 0, 7); g.fill(); g.fillRect(73, 118, 8, 14);
  } } } });
  B('door_f', null, [-3.2, 0, 2.9], [-3.1, 2.25, 3.0], '#2c1a0e', { solid: false }); B('door_f2', null, [-2.1, 0, 2.9], [-2.0, 2.25, 3.0], '#2c1a0e', { solid: false });
  B('door_f3', null, [-3.2, 2.15, 2.9], [-2.0, 2.25, 3.0], '#2c1a0e', { solid: false });

  // ---- kamin (severna stena) ----
  B('fp', 'fireplace', [-1.3, 0, -3.0], [1.3, 1.25, -2.55], '#8a8378', { decals: { '+z': { draw(g, { L, t }) {
    g.fillStyle = sh('#0b0807', 1); g.fillRect(65, 25, 130, 88);
    const fl = 0.55 + 0.25 * Math.sin(t * 5) + 0.15 * Math.sin(t * 13);
    const gr = g.createRadialGradient(130, 100, 5, 130, 100, 70); gr.addColorStop(0, `rgba(255,${150 + 60 * fl | 0},40,${0.55 * fl + 0.2})`); gr.addColorStop(1, 'rgba(120,20,0,0)');
    g.fillStyle = gr; g.fillRect(65, 25, 130, 88);
    g.fillStyle = '#1a1008'; g.fillRect(85, 96, 90, 12); g.fillStyle = '#2a1a10'; g.fillRect(95, 88, 70, 10);
    g.fillStyle = sh('#6a645a', L); g.fillRect(205, 60, 14, 6); g.fillStyle = sh('#9a8a60', L); g.fillRect(212, 52, 3, 20);
  } } } });
  B('fp_ud', 'fireplace', [-1.3, 0, -3.0], [-1.28, 0.01, -2.99], '#000', { ghost: true, noPick: true });
  B('fp_mantel', 'fireplace', [-1.45, 1.25, -3.0], [1.45, 1.36, -2.5], '#4a3020');
  B('fp_breast', 'fireplace', [-1.0, 1.36, -3.0], [1.0, 3.2, -2.78], '#7a7368');
  B('fp_uv', 'fireplace', [-1.3, 0, -2.56], [1.3, 1.25, -2.55], '#000', { ghost: true });
  boxes[boxes.length - 1].decals = { '+z': { uv: true, draw(g, { st }) { g.fillStyle = 'rgba(200,220,255,.95)'; for (let i = 0; i < 18; i++) { g.fillRect(208 + (i % 6) * 2.2, 52 + (i / 6 | 0) * 5, 1.6, 4); } g.shadowColor = '#9fd'; g.shadowBlur = 8; g.fillRect(205, 50, 16, 24); } } };

  // ---- detektor CO ----
  B('det', 'detector', [-1.65, 2.5, -3.0], [-1.35, 2.7, -2.92], '#ececec', { solid: false, decals: { '+z': { range: 6, draw(g, { L }) { g.fillStyle = sh('#222', 1); g.fillRect(6, 6, 18, 8); g.fillStyle = '#400'; g.fillRect(8, 8, 6, 4); } } } });
  B('det_pick', 'detector', [-1.9, 2.35, -3.0], [-1.1, 2.85, -2.85], '#000', { ghost: true, solid: false });

  // ---- slika + sef ----
  B('safe', 'safe', [1.95, 1.3, -3.0], [2.5, 1.85, -2.86], '#3b3f44', { solid: false, hide: (s) => !(s.revealed && s.revealed.safe), decals: { '+z': { draw(g, { L, st }) {
    g.fillStyle = sh('#242729', L); g.fillRect(4, 4, 47, 47); g.fillStyle = sh('#111', 1); g.fillRect(14, 10, 26, 10);
    const ok = st.solved && st.solved.L_SAFE; g.fillStyle = ok ? '#4cff7a' : '#ff4040'; g.fillRect(16, 12, 6, 6);
    g.fillStyle = sh('#8a8f94', L); for (let i = 0; i < 9; i++) g.fillRect(14 + (i % 3) * 9, 24 + (i / 3 | 0) * 8, 6, 5);
    if (ok) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, 55, 55); g.fillStyle = sh('#c8c0a0', 1); g.fillRect(6, 8, 30, 36); g.fillRect(10, 12, 30, 36); }
  } } } });
  B('paint', 'painting', [1.7, 1.2, -2.99], [2.7, 2.2, -2.93], '#a07a30', { solid: false, off: (s) => (s.revealed && s.revealed.safe ? [1.05, 0, 0.25] : null), decals: { '+z': { draw(g, { L }) {
    g.fillStyle = sh('#c9a64e', L); g.fillRect(0, 0, 100, 100); g.fillStyle = sh('#20344c', L); g.fillRect(5, 5, 90, 90);
    const sk = g.createLinearGradient(0, 5, 0, 55); sk.addColorStop(0, sh('#3a587a', L)); sk.addColorStop(1, sh('#e7b27c', L)); g.fillStyle = sk; g.fillRect(5, 5, 90, 50);
    g.fillStyle = sh('#1a2c3e', L); g.fillRect(5, 55, 90, 40);
    g.fillStyle = sh('#2c1c12', L); g.fillRect(30, 40, 3, 22); g.fillRect(58, 36, 3, 26); g.fillStyle = sh('#e8e2d0', L); g.beginPath(); g.moveTo(33, 40); g.lineTo(33, 58); g.lineTo(46, 58); g.closePath(); g.fill(); g.beginPath(); g.moveTo(61, 36); g.lineTo(61, 58); g.lineTo(76, 58); g.closePath(); g.fill();
    g.fillStyle = sh('#18100a', L); g.fillRect(24, 60, 32, 5); g.fillRect(52, 62, 32, 5);
  } } } });

  // ---- knjižna omara + lestev ----
  const spines = ['#7a2323', '#2b4a6b', '#3e5f3a', '#8a6a2a', '#4a2c5a', '#a55a2a', '#2a5f5f', '#6b6b6b'];
  B('books', 'bookcase', [-3.95, 0, -3.0], [-2.5, 2.6, -2.55], '#3f2a1a', { decals: { '+z': { draw(g, { L }) {
    for (let r = 0; r < 5; r++) { const y = 10 + r * 50; g.fillStyle = sh('#2a1a10', L); g.fillRect(4, y + 40, 137, 5);
      let x = 6; let i = r * 7; while (x < 134) { const w = 5 + ((i * 3) % 5), hh = 28 + ((i * 7) % 12); g.fillStyle = sh(spines[(i + r) % spines.length], L); g.fillRect(x, y + 40 - hh, w, hh); x += w + 0.6; i++; } }
  } } } });
  B('ladder', 'ladder', [-2.45, 0, -2.9], [-2.0, 2.2, -2.72], '#b88a4a', { solid: false, hide: (s) => !!(s.items && s.items.ladder), decals: { '+z': { draw(g, { L }) {
    g.fillStyle = sh('#a07a3c', L); g.fillRect(2, 0, 5, 220); g.fillRect(38, 0, 5, 220); g.fillStyle = sh('#c49a58', L); for (let y = 15; y < 215; y += 22) g.fillRect(6, y, 33, 4);
  } } } });

  // ---- vitrina z urami (vzhodna stena, sever) ----
  B('wcase', 'watchcase', [3.4, 0, -2.5], [4.0, 1.95, -0.8], '#3b2a1c', { decals: { '-x': { draw(g, { L, st }) {
    g.fillStyle = sh('#10151b', L); g.fillRect(8, 8, 154, 174); g.fillStyle = 'rgba(160,200,230,.10)'; g.fillRect(8, 8, 154, 174);
    const rows = [3, 2, 4];
    rows.forEach((n, r) => { const y = 62 + r * 58; g.fillStyle = sh('#6a4a2a', L); g.fillRect(8, y + 22, 154, 4);
      for (let i = 0; i < n; i++) { const x = 85 + (i - (n - 1) / 2) * 34; g.strokeStyle = sh('#caa84a', L); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x, y - 4); g.stroke();
        g.fillStyle = sh('#d6b85a', L); g.beginPath(); g.arc(x, y + 6, 9, 0, 7); g.fill(); g.fillStyle = sh('#efe6c8', L); g.beginPath(); g.arc(x, y + 6, 6.5, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x, y + 1.5); g.moveTo(x, y + 6); g.lineTo(x + 3, y + 7); g.stroke(); } });
    g.fillStyle = sh('#caa84a', L); g.fillRect(70, 186, 30, 3);
  } } } });

  // ---- barska omarica (vzhodna stena, jug) ----
  B('bar', 'bar', [3.5, 0, 0.6], [4.0, 1.05, 2.4], '#4a2f1c', { decals: { '-x': { draw(g, { L }) { g.fillStyle = sh('#352010', L); g.fillRect(8, 8, 76, 88); g.fillRect(96, 8, 76, 88); g.fillStyle = sh('#bfa05a', L); g.fillRect(80, 48, 3, 14); g.fillRect(97, 48, 3, 14); } } }, top: '#2a1a10' });
  B('decanter', 'bar', [3.62, 1.05, 1.25], [3.8, 1.42, 1.43], '#6aa0b0', { on: 'bar', solid: false, emissive: 0.1 });
  B('glass1', 'bar', [3.64, 1.05, 1.7], [3.72, 1.17, 1.78], '#9ac0cc', { on: 'bar', solid: false });
  B('glass2', 'bar', [3.64, 1.05, 1.95], [3.72, 1.17, 2.03], '#9ac0cc', { on: 'bar', solid: false });
  B('bar_pick', 'bar', [3.5, 1.05, 1.0], [4.0, 1.5, 2.3], '#000', { ghost: true, solid: false });

  // ---- okno + zavesi (zahodna stena) ----
  B('win', 'window', [-4.0, 0.95, -1.0], [-3.95, 2.55, 1.0], '#26364f', { solid: false, emissive: 0.45, decals: { '+x': { draw(g, { L }) {
    g.fillStyle = '#1b2a44'; g.fillRect(0, 0, 200, 160); g.fillStyle = '#e9efff'; g.beginPath(); g.arc(150, 38, 12, 0, 7); g.fill(); g.fillStyle = 'rgba(10,20,40,.7)'; g.fillRect(0, 110, 200, 50);
    g.strokeStyle = sh('#3a2616', 1.2); g.lineWidth = 5; g.strokeRect(2, 2, 196, 156); g.beginPath(); g.moveTo(100, 0); g.lineTo(100, 160); g.moveTo(0, 80); g.lineTo(200, 80); g.stroke();
  } } } });
  B('curt1', 'window', [-3.95, 0.2, -1.5], [-3.7, 2.9, -1.0], '#6a1f28', { solid: false }); B('curt2', 'window', [-3.95, 0.2, 1.0], [-3.7, 2.9, 1.5], '#6a1f28', { solid: false });
  B('rod', 'window', [-3.95, 2.9, -1.55], [-3.85, 2.96, 1.55], '#b8963c', { solid: false, noPick: true });

  // ---- radio na omarici ----
  B('cab', 'radio', [-3.95, 0, -2.2], [-3.45, 0.72, -1.5], '#4a3020');
  B('radio', 'radio', [-3.88, 0.72, -2.05], [-3.58, 1.0, -1.62], '#8a5a2a', { on: 'cab', solid: false, decals: { '+x': { draw(g, { L, t }) {
    g.fillStyle = sh('#d8c89a', L); g.fillRect(6, 5, 24, 11); g.fillStyle = sh('#222', 1); g.fillRect(8, 7, 20, 7); const on = Math.sin(t * 7) > 0; g.fillStyle = on ? '#ffb040' : '#5a3a10'; g.beginPath(); g.arc(37, 10, 2.2, 0, 7); g.fill();
  } } } });
  B('card', 'radio', [-3.62, 0.72, -1.58], [-3.56, 0.9, -1.5], '#e8e0c8', { on: 'cab', solid: false, noPick: true });

  // ---- stoječa ura (zahodna stena, jug) ----
  B('clock', 'clock', [-3.95, 0, 1.6], [-3.45, 2.3, 2.15], '#4e3220', { decals: { '+x': { draw(g, { L }) {
    g.fillStyle = sh('#e8e0c8', L); g.beginPath(); g.arc(27, 30, 20, 0, 7); g.fill(); g.strokeStyle = sh('#2a1a10', 1); g.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(27 + Math.sin(a) * 16, 30 - Math.cos(a) * 16); g.lineTo(27 + Math.sin(a) * 19, 30 - Math.cos(a) * 19); g.stroke(); }
    g.lineWidth = 2; g.beginPath(); g.moveTo(27, 30); const hA = (10 + 15 / 60) * Math.PI / 6; g.lineTo(27 + Math.sin(hA) * 10, 30 - Math.cos(hA) * 10); g.stroke(); g.lineWidth = 1.4; g.beginPath(); g.moveTo(27, 30); const mA = 15 * Math.PI / 30; g.lineTo(27 + Math.sin(mA) * 15, 30 - Math.cos(mA) * 15); g.stroke();
    g.fillStyle = sh('#1b110a', L); g.fillRect(12, 62, 30, 110); g.fillStyle = sh('#caa84a', L); g.beginPath(); g.arc(27, 150, 8, 0, 7); g.fill(); g.fillRect(25, 70, 4, 76);
    g.fillStyle = sh('#caa84a', L); g.fillRect(18, 188, 18, 8);
  } } } });

  // ---- fotografije in koledar (južna stena) ----
  B('photos', 'photos', [0.4, 1.25, 2.95], [3.0, 2.35, 3.0], '#3a2616', { solid: false, decals: { '-z': { draw(g, { L }) {
    const fr = [[10, 14, 54, 72], [74, 22, 64, 56], [148, 12, 50, 78], [208, 24, 44, 52]];
    const cols = ['#c8b090', '#a8b8c8', '#d0c8b8', '#b8a890'];
    fr.forEach(([x, y, w, h], i) => { g.fillStyle = sh('#6a4a2a', L); g.fillRect(x - 3, y - 3, w + 6, h + 6); g.fillStyle = sh(cols[i], L); g.fillRect(x, y, w, h);
      g.fillStyle = sh('#4a3a2a', L); g.beginPath(); g.arc(x + w * 0.35, y + h * 0.4, 7, 0, 7); g.fill(); g.fillRect(x + w * 0.2, y + h * 0.5, 16, h * 0.4);
      if (i === 0) { g.fillStyle = sh('#2a2018', L); g.fillRect(x + w * 0.6, y + h * 0.62, 18, 10); g.beginPath(); g.arc(x + w * 0.8, y + h * 0.56, 5, 0, 7); g.fill(); }
      if (i === 1 || i === 3) { g.fillStyle = sh('#f4f4f0', L); g.beginPath(); g.arc(x + w * 0.7, y + h * 0.72, 4, 0, 7); g.arc(x + w * 0.55, y + h * 0.75, 4, 0, 7); g.fill(); } });
  } } } });
  B('cal', 'calendar', [-1.6, 1.25, 2.95], [-0.9, 2.0, 3.0], '#f2eee0', { solid: false, decals: { '-z': { draw(g, { L }) {
    g.fillStyle = sh('#f2eee0', L); g.fillRect(0, 0, 70, 75); g.fillStyle = sh('#a02828', L); g.fillRect(0, 0, 70, 11); txt(g, 'OKTOBER', 35, 9, 8, '#fff', 'center');
    const days = ['P', 'T', 'S', 'Č', 'P', 'S', 'N']; days.forEach((d, i) => txt(g, d, 6 + i * 9.5, 20, 5.5, sh('#333', L), 'center'));
    for (let d = 1; d <= 31; d++) { const idx = d + 2; const col = idx % 7, row = (idx / 7) | 0; const x = 6 + col * 9.5, y = 28 + row * 9; txt(g, String(d), x, y, 5.5, sh('#222', L), 'center');
      if (d === 17 || d === 19 || d === 20) { g.strokeStyle = sh('#d01818', 1.2); g.lineWidth = 1.2; g.beginPath(); g.arc(x, y - 2, 4.4, 0, 7); g.stroke(); } }
  } } } });

  // ---- pisalna miza + predmeti ----
  B('desk', 'desk', [0.3, 0, 0.1], [2.5, 0.76, 1.1], wood, { top: '#2a3a2a', decals: { '+z': { draw(g, { L, st }) {
    g.fillStyle = sh('#3d2616', L); g.fillRect(8, 6, 94, 56); g.fillRect(118, 6, 94, 56); g.fillStyle = sh('#bfa05a', L); g.fillRect(50, 30, 10, 3); g.fillRect(160, 30, 10, 3);
    g.fillStyle = sh('#111', 1); g.fillRect(185, 12, 16, 12); const ok = st.solved && st.solved.L_DESK; g.fillStyle = ok ? '#4cff7a' : '#ff4040'; g.fillRect(187, 14, 4, 4);
    if (ok) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(8, 6, 94, 56); }
  } } } });
  B('chair', null, [1.0, 0, 1.25], [1.6, 0.5, 1.8], '#2a1a12', {}); B('chair_b', null, [1.0, 0.5, 1.7], [1.6, 1.1, 1.8], '#2a1a12', {});
  B('lap_base', 'laptop', [0.55, 0.76, 0.4], [1.0, 0.78, 0.75], '#7a7a80', { on: 'desk', solid: false });
  B('lap_scr', 'laptop', [0.55, 0.78, 0.4], [1.0, 1.05, 0.43], '#222226', { on: 'desk', solid: false, decals: { '+z': { draw(g, { L, st, t }) {
    const ok = st.solved && st.solved.L_LAPTOP; g.fillStyle = ok ? '#1c3a5a' : '#0c1018'; g.fillRect(2, 2, 41, 25);
    g.fillStyle = ok ? '#bfe0ff' : '#8aa0b8'; if (ok) { for (let i = 0; i < 4; i++) g.fillRect(5, 6 + i * 5, 28 - i * 3, 2); } else { g.fillRect(12, 12, 22, 5); g.fillStyle = '#ffdc60'; g.fillRect(14, 13, 5 + ((t * 4) % 3) * 3, 3); }
  } } } });
  B('phone', 'phone', [1.6, 0.76, 0.45], [1.9, 0.85, 0.7], '#1c1c1f', { on: 'desk', solid: false, decals: { '+y': { draw(g) { g.fillStyle = '#7ad07a'; g.fillRect(8, 4, 14, 6); } } } });
  B('lamp_b', 'lamp', [2.05, 0.76, 0.3], [2.3, 0.82, 0.55], '#b8963c', { on: 'desk', solid: false }); B('lamp_s', 'lamp', [2.14, 0.82, 0.38], [2.2, 1.2, 0.46], '#b8963c', { on: 'desk', solid: false });
  B('lamp_h', 'lamp', [2.0, 1.2, 0.28], [2.36, 1.38, 0.56], '#2a6a3a', { on: 'desk', solid: false, emissive: 0.5 });
  B('basket', 'wastebasket', [2.7, 0, 0.4], [3.05, 0.42, 0.75], '#8a6a3a', { decals: { '+y': { draw(g) { g.fillStyle = '#e8e4d8'; g.fillRect(4, 3, 8, 6); g.fillRect(14, 8, 7, 7); } } } });

  // ---- fotelj in mizica pri kaminu ----
  B('arm_seat', 'armchair', [-1.6, 0, -2.0], [-0.6, 0.5, -1.15], '#5a1f22'); B('arm_back', 'armchair', [-1.6, 0.5, -1.2], [-0.6, 1.15, -1.05], '#5a1f22');
  B('arm_l', 'armchair', [-1.7, 0, -2.0], [-1.6, 0.75, -1.1], '#4a171a'); B('arm_r', 'armchair', [-0.6, 0, -2.0], [-0.5, 0.75, -1.1], '#4a171a');
  B('arm_watch', 'armchair', [-0.78, 0.0, -0.95], [-0.62, 0.03, -0.8], '#d6b85a', { solid: false, bias: -1 });
  B('arm_pick', 'armchair', [-1.7, 0, -2.0], [-0.5, 1.15, -0.7], '#000', { ghost: true, solid: false });
  B('stable', 'sidetable', [-0.35, 0, -1.8], [0.05, 0.6, -1.4], '#3f2a1a');
  B('pillbox', 'sidetable', [-0.3, 0.6, -1.7], [-0.05, 0.66, -1.5], '#d0d0c0', { on: 'stable', solid: false });
  B('glasses', 'sidetable', [-0.28, 0.6, -1.78], [-0.1, 0.63, -1.74], '#222', { on: 'stable', solid: false });

  // ---- globus, šah, preproga ----
  B('rug', null, [-2.4, 0, -1.0], [1.3, 0.015, 0.1], '#7a2a2a', { solid: false, noPick: true, bias: 100, decals: { '+y': { draw(g) { g.strokeStyle = 'rgba(220,190,120,.7)'; g.lineWidth = 3; g.strokeRect(10, 10, 345, 90); g.strokeRect(22, 22, 321, 66); } } } });
  B('globe_s', 'globe', [-3.55, 0, -0.3], [-3.3, 0.9, -0.05], '#3a2616'); B('globe_b', 'globe', [-3.6, 0.9, -0.35], [-3.25, 1.25, 0.0], '#3a6a8a');
  B('chess_t', 'chess', [-3.0, 0, 0.55], [-2.4, 0.62, 1.15], '#3a2616', { decals: { '+y': { draw(g) { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#2a1a10' : '#d8c8a0'; g.fillRect(6 + i * 6, 6 + j * 6, 6, 6); } g.fillStyle = '#f0f0f0'; g.fillRect(24, 24, 5, 5); g.fillStyle = '#111'; g.fillRect(36, 30, 5, 5); } } } });

  const lights = [
    { pos: [2.17, 1.25, 0.42], color: [1.0, 0.78, 0.45], intensity: 1.25, range: 6.5 },
    { pos: [0, 0.7, -2.2], color: [1.0, 0.5, 0.2], intensity: 0.9, range: 5.0 },
    { pos: [-3.4, 2.0, 0.0], color: [0.45, 0.6, 1.0], intensity: 0.7, range: 6.5 },
    { pos: [0, 3.0, 0.0], color: [1.0, 0.85, 0.65], intensity: 0.4, range: 9 },
  ];
  return { room: { w: 8, d: 6, h: 3.2, floor: '#6a4a30', wall: '#7b4343', wainscot: '#3a2418', ceiling: '#a89f8e' }, boxes, lights, ambient: 0.3, spawn: { x: -2.0, z: 1.8, yaw: 0.75 } };
}
