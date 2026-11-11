// Prizorišče Primera 003: sanatorij sv. Helene. Tri sobe v nizu (ordinacija, soba 13, kapela), vrata se odprejo šele po rešeni ključavnici.
const sh = (h, L) => { const n = parseInt(h.slice(1), 16); const k = Math.max(0.05, Math.min(1.5, L)); return `rgb(${Math.min(255, ((n >> 16) & 255) * k) | 0},${Math.min(255, ((n >> 8) & 255) * k) | 0},${Math.min(255, (n & 255) * k) | 0})`; };
const txt = (g, s, x, y, size, color, align = 'left', font = 'serif') => { g.font = `${size}px ${font}`; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y); };

export const OBJECT_LABELS3 = {
  a_exit: 'Izhod', a_clock: 'Stenska ura', a_diploma: 'Diploma', a_photo: 'Fotografija', a_phone: 'Telefon', a_desk: 'Pisalna miza', a_cabinet: 'Arhivska omara', a_tape: 'Magnetofon', a_door1: 'Vrata v sobo 13',
  b_bed: 'Železna postelja', b_wall: 'Stena', b_chart: 'Zdravstveni karton', b_doll: 'Lutka', b_night: 'Nočna omarica', b_door2: 'Vrata v kapelo',
  c_chair: 'Terapevtski stol', c_panel: 'Plošča stikal', c_altar: 'Oltar', c_conf: 'Spovednica', c_shovel: 'Lopata',
};

export function buildScene3() {
  const boxes = [];
  const B = (id, obj, min, max, color, o = {}) => { boxes.push({ id, obj, min, max, color, ...(obj ? {} : { noPick: true }), ...o }); };
  const WALL = '#4f524a', WOOD = '#3a2a1c';
  const solvedL = (l) => (s) => !!(s.solved && s.solved[l]);

  // ---- pregradne stene (x = -4 in x = 4), v sredini so vrata ----
  for (const [x, tag] of [[-4, 'w1'], [4, 'w2']]) {
    B(`${tag}_a`, null, [x - 0.15, 0, -5], [x + 0.15, 3.2, -0.65], WALL);
    B(`${tag}_b`, null, [x - 0.15, 0, 0.65], [x + 0.15, 3.2, 5], WALL);
    B(`${tag}_c`, null, [x - 0.15, 2.2, -0.65], [x + 0.15, 3.2, 0.65], WALL, { solid: false });
  }
  const doorDecal = (num) => ({ draw(g, { L, st }) {
    g.fillStyle = sh('#3a2a1c', L); g.fillRect(0, 0, 130, 220);
    g.fillStyle = sh('#2a1c10', L); g.fillRect(10, 12, 110, 90); g.fillRect(10, 112, 110, 96);
    g.fillStyle = sh('#8a8a80', L); g.beginPath(); g.arc(104, 112, 5, 0, 7); g.fill();
    txt(g, num, 65, 62, 34, sh('#b83a30', L), 'center');
  } });
  B('door1', 'a_door1', [-4.1, 0, -0.65], [-3.9, 2.2, 0.65], '#3a2a1c', { hide: solvedL('L_D1'), decals: { '-x': doorDecal('13'), '+x': doorDecal('13') } });
  B('door2', 'b_door2', [3.9, 0, -0.65], [4.1, 2.2, 0.65], '#35302a', { hide: solvedL('L_D2'), decals: { '-x': doorDecal(''), '+x': doorDecal('') } });
  B('door1_g', 'a_door1', [-4.4, 0, -0.9], [-3.6, 2.3, 0.9], '#000', { ghost: true, solid: false });
  B('door2_g', 'b_door2', [3.6, 0, -0.9], [4.4, 2.3, 0.9], '#000', { ghost: true, solid: false });

  // ---- SOBA A: ordinacija ----
  B('exit', 'a_exit', [-12, 0, -1.0], [-11.9, 2.4, 1.0], '#2c2c2a', { solid: false, decals: { '+x': { draw(g, { L }) {
    g.fillStyle = sh('#2a2c2a', L); g.fillRect(0, 0, 100, 240); g.strokeStyle = sh('#5a4a3a', L); g.lineWidth = 4; g.strokeRect(4, 4, 92, 232);
    g.fillStyle = sh('#aa1c1c', L); txt(g, 'POVEJ,', 50, 80, 16, sh('#aa1c1c', L), 'center'); txt(g, 'KAJ SE JE', 50, 102, 14, sh('#aa1c1c', L), 'center'); txt(g, 'ZGODILO.', 50, 122, 16, sh('#aa1c1c', L), 'center');
  } } } });
  B('desk', 'a_desk', [-9.6, 0, -4.4], [-7.4, 0.78, -3.2], WOOD, { top: '#2a3a2a', decals: { '+z': { draw(g, { L, st }) {
    g.fillStyle = sh('#2a1c10', L); g.fillRect(8, 6, 94, 40); g.fillRect(118, 6, 94, 40); const ok = st.solved && st.solved.L_ADESK; g.fillStyle = ok ? '#4cff7a' : '#ff4040'; g.fillRect(150, 16, 6, 6); g.fillStyle = sh('#8a8a80', L); g.fillRect(50, 24, 10, 3);
  } } } });
  B('desk_ch', null, [-9.0, 0, -3.0], [-8.2, 0.5, -2.3], '#2a1c10'); B('desk_chb', null, [-9.0, 0.5, -2.4], [-8.2, 1.1, -2.3], '#2a1c10');
  B('phone', 'a_phone', [-8.2, 0.78, -4.0], [-7.7, 0.9, -3.6], '#111', { on: 'desk', solid: false });
  B('clock', 'a_clock', [-8.9, 2.0, -5], [-8.3, 2.6, -4.95], '#cbbfa0', { solid: false, decals: { '+z': { range: 12, draw(g, { L }) {
    g.fillStyle = sh('#d8d0b8', L); g.beginPath(); g.arc(30, 30, 28, 0, 7); g.fill(); g.strokeStyle = sh('#222', 1); g.lineWidth = 2; g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(30, 30); g.lineTo(30 + Math.sin(3.2 * Math.PI / 6) * 14, 30 - Math.cos(3.2 * Math.PI / 6) * 14); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(30, 30); g.lineTo(30 + Math.sin(17 * Math.PI / 30) * 22, 30 - Math.cos(17 * Math.PI / 30) * 22); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, 8); g.lineTo(32, 36); g.lineTo(50, 18); g.stroke();
  } } } });
  B('diploma', 'a_diploma', [-10.9, 1.6, -5], [-10.0, 2.2, -4.95], '#c8bfa0', { solid: false, decals: { '+z': { draw(g, { L }) { g.fillStyle = sh('#d6cfb4', L); g.fillRect(0, 0, 90, 60); g.strokeStyle = sh('#6a4a2a', L); g.lineWidth = 3; g.strokeRect(2, 2, 86, 56); txt(g, 'DIPLOMA', 45, 22, 10, sh('#222', L), 'center'); g.fillStyle = sh('#444', L); for (let i = 0; i < 4; i++) g.fillRect(14, 30 + i * 6, 62 - i * 6, 2); } } } });
  B('photo', 'a_photo', [-6.9, 1.5, -5], [-6.0, 2.1, -4.95], '#7a6a50', { solid: false, decals: { '+z': { draw(g, { L }) { g.fillStyle = sh('#8a8a80', L); g.fillRect(0, 0, 90, 60); g.fillStyle = sh('#2a2a2a', L); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(14 + i * 20, 28, 6, 0, 7); g.fill(); g.fillRect(8 + i * 20, 34, 12, 22); } } } } });
  B('cabinet', 'a_cabinet', [-11.9, 0, -4.7], [-11.2, 1.9, -3.0], '#4a4a44', { decals: { '+x': { draw(g, { L }) { g.fillStyle = sh('#3a3a36', L); for (let i = 0; i < 4; i++) { g.fillRect(6, 8 + i * 42, 158, 36); g.fillStyle = sh('#999', L); g.fillRect(76, 22 + i * 42, 18, 4); g.fillStyle = sh('#3a3a36', L); } } } } });
  B('tape_t', null, [-6.4, 0, 2.8], [-5.2, 0.7, 4.2], WOOD);
  B('tape', 'a_tape', [-6.1, 0.7, 3.1], [-5.5, 0.9, 3.9], '#1c1c1a', { on: 'tape_t', solid: false, decals: { '+y': { draw(g, { L, t }) { g.fillStyle = sh('#999', L); for (const x of [18, 42]) { g.beginPath(); g.arc(x, 24, 11, 0, 7); g.fill(); g.fillStyle = sh('#111', 1); g.beginPath(); g.arc(x, 24, 4 + Math.sin(t * 6 + x) * 0.8, 0, 7); g.fill(); g.fillStyle = sh('#999', L); } } } } });
  B('rubble', null, [-10.8, 0, 1.2], [-9.4, 0.5, 2.6], '#2a2a26');

  // ---- SOBA B: soba 13 ----
  B('bed', 'b_bed', [-1.1, 0, -4.9], [1.1, 0.55, -2.8], '#3a3a3a', { top: '#c8c2b0', decals: { '+z': { draw(g, { L }) { g.fillStyle = sh('#2a2a2a', L); for (let i = 0; i < 6; i++) g.fillRect(6 + i * 36, 4, 6, 50); g.fillStyle = sh('#6a3a30', L); g.fillRect(40, 20, 120, 8); } } } });
  B('chart', 'b_chart', [-0.45, 1.2, -5], [0.45, 1.8, -4.95], '#c8bfa0', { solid: false, decals: { '+z': { draw(g, { L }) { g.fillStyle = sh('#d6cfb4', L); g.fillRect(0, 0, 90, 60); g.fillStyle = sh('#444', L); for (let i = 0; i < 6; i++) g.fillRect(8, 10 + i * 8, 74 - (i % 3) * 14, 2); g.strokeStyle = sh('#a02020', L); g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, 50); g.lineTo(30, 20); g.lineTo(46, 46); g.lineTo(80, 8); g.stroke(); } } } });
  B('scratch', 'b_wall', [-3.85, 1.0, -3.4], [-3.8, 1.9, -2.0], '#55584f', { solid: false, decals: { '+x': { draw(g, { L }) { g.strokeStyle = sh('#b8b8aa', L); g.lineWidth = 2.5; g.lineCap = 'round'; const n = [[8, 12, 36, 12, 36, 44, 8, 44], [58, 12, 86, 12, 86, 28, 62, 28], [62, 12, 62, 44]]; txt(g, '7', 22, 50, 54, sh('#b8b8aa', L), 'center', 'sans-serif'); txt(g, '3', 70, 50, 54, sh('#b8b8aa', L), 'center', 'sans-serif'); txt(g, '9', 118, 50, 54, sh('#b8b8aa', L), 'center', 'sans-serif'); void n; } } } });
  B('doll_c', 'b_doll', [2.8, 0, 3.7], [3.4, 0.5, 4.3], '#6a5a4a', { solid: false });
  B('doll', 'b_doll', [2.9, 0.5, 3.8], [3.3, 0.95, 4.2], '#8a7a62', { solid: false, decals: { '+x': { draw(g, { L }) { g.fillStyle = sh('#111', 1); g.beginPath(); g.arc(14, 12, 3, 0, 7); g.arc(26, 12, 3, 0, 7); g.fill(); } } } });
  B('night', 'b_night', [2.6, 0, -4.8], [3.6, 0.7, -4.0], '#3a2a1c', { decals: { '-x': { draw(g, { L, st }) { g.fillStyle = sh('#2a1c10', L); g.fillRect(6, 8, 70, 36); g.fillStyle = (st.solved && st.solved.L_BNIGHT) ? '#4cff7a' : '#ff4040'; g.fillRect(34, 12, 6, 6); } } } });
  B('b_rug', null, [-1.6, 0, -2.5], [1.6, 0.012, 0.5], '#2a2a28', { solid: false, noPick: true });

  // ---- SOBA C: kapela ----
  B('chair', 'c_chair', [7.4, 0, -1.2], [8.6, 1.3, 0.4], '#3a2a1c', { decals: { '-x': { draw(g, { L }) { g.fillStyle = sh('#2a1a10', L); g.fillRect(0, 0, 120, 130); g.fillStyle = sh('#8a8a80', L); for (let i = 0; i < 4; i++) g.fillRect(14 + i * 26, 26, 12, 70); g.fillStyle = sh('#111', 1); g.fillRect(22, 100, 80, 12); } } } });
  B('panel', 'c_panel', [6.2, 1.1, -5], [7.5, 2.0, -4.95], '#2c302c', { solid: false, decals: { '+z': { draw(g, { L, st }) {
    g.fillStyle = sh('#2c302c', L); g.fillRect(0, 0, 130, 90); g.strokeStyle = sh('#777', L); g.lineWidth = 2; g.strokeRect(3, 3, 124, 84); const ok = st.solved && st.solved.L_CPANEL;
    for (let i = 0; i < 3; i++) { g.fillStyle = sh('#aaa', L); g.beginPath(); g.arc(24 + i * 40, 30, 11, 0, 7); g.fill(); g.strokeStyle = '#111'; g.beginPath(); g.moveTo(24 + i * 40, 30); g.lineTo(24 + i * 40 + 7, 24); g.stroke(); }
    g.fillStyle = ok ? '#4cff7a' : '#ff4040'; g.fillRect(56, 62, 18, 8); txt(g, 'V', 100, 74, 14, sh('#aaa', L), 'center', 'sans-serif');
  } } } });
  B('altar', 'c_altar', [10.6, 0, -1.3], [11.9, 1.0, 1.3], '#8a867a', { top: '#a8a498', decals: { '-x': { draw(g, { L }) { g.fillStyle = sh('#6a665a', L); g.fillRect(0, 0, 260, 100); g.strokeStyle = sh('#2a2a26', L); g.lineWidth = 2; g.strokeRect(10, 10, 240, 80); g.fillStyle = sh('#c8c2b0', L); g.fillRect(124, 24, 12, 52); g.fillRect(106, 40, 48, 10); } } } });
  B('candle1', null, [11.0, 1.0, -1.0], [11.12, 1.25, -0.88], '#f2e6b8', { on: 'altar', solid: false, emissive: 0.9 });
  B('candle2', null, [11.0, 1.0, 0.88], [11.12, 1.25, 1.0], '#f2e6b8', { on: 'altar', solid: false, emissive: 0.9 });
  B('conf', 'c_conf', [4.9, 0, 3.0], [6.5, 2.3, 4.9], '#3a2a1c', { decals: { '-z': { draw(g, { L }) { g.fillStyle = sh('#2a1c10', L); g.fillRect(0, 0, 160, 230); g.fillStyle = sh('#0a0806', 1); g.fillRect(40, 40, 80, 150); } } } });
  B('shovel', 'c_shovel', [9.0, 0, 4.5], [9.35, 1.5, 4.85], '#5a4a3a', { solid: false });
  B('pew1', null, [6.0, 0, -3.8], [9.6, 0.5, -3.2], '#2a1c10'); B('pew2', null, [6.0, 0, 1.8], [9.6, 0.5, 2.4], '#2a1c10');

  const lights = [
    { name: 'a', pos: [-8, 2.9, 0], color: [1.0, 0.82, 0.55], intensity: 0.6, range: 9 },
    { name: 'b', pos: [0, 2.9, 0], color: [0.6, 0.9, 0.7], intensity: 0.35, range: 8 },
    { name: 'c', pos: [8, 2.9, 0], color: [1.0, 0.7, 0.4], intensity: 0.4, range: 9 },
    { name: 'candles', pos: [11.1, 1.3, 0], color: [1.0, 0.7, 0.35], intensity: 0.8, range: 6 },
  ];
  return { kind: 'horror', room: { w: 24, d: 10, h: 3.2, floor: '#3a3632', wall: '#4f524a', wainscot: '#2b2d28', ceiling: '#706e64', tint: '#9aa090' }, boxes, lights, ambient: 0.17, spawn: { x: -9.5, z: 1.5, yaw: 0.6 } };
}
