// Prizorišča Primera 004 »Črni tovor«: policijska postaja (vadišče, garaža, celica), nočna vožnja in skladišče Zorman Logistika.
const sh = (h, L) => { const n = parseInt(h.slice(1), 16); const k = Math.max(0.05, Math.min(1.6, L)); return `rgb(${Math.min(255, ((n >> 16) & 255) * k) | 0},${Math.min(255, ((n >> 8) & 255) * k) | 0},${Math.min(255, (n & 255) * k) | 0})`; };
const txt = (g, s, x, y, size, color, align = 'left', font = 'sans-serif') => { g.font = `${size}px ${font}`; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y); };
const mk = () => { const boxes = []; const B = (id, obj, min, max, color, o = {}) => { boxes.push({ id, obj, min, max, color, ...(obj ? {} : { noPick: true }), ...o }); }; return { boxes, B }; };

export const OBJECT_LABELS4 = {
  r_desk: 'Recepcija', r_photo: 'Fotografija', r_board: 'Tabla dežurstev', r_pc: 'Računalnik', d_door1: 'Vrata v pisarno', o_calendar: 'Koledar', o_family: 'Družinska slika', o_desk: 'Pisalna miza', o_safe: 'Sef',
  d_door2: 'Vrata v arhiv', a_manifest: 'Tovorni list', a_scale: 'Tehtnica', a_cabinet: 'Arhivska omara', a_crate: 'Zabojnik', a_board: 'Tabla s potmi', d_door3: 'Vrata v strežniško sobo',
  d_terminal: 'Terminal', d_rack: 'Strežniška omara', d_desk: 'Mizica', d_door4: 'Zadnja vrata', e_laptop: 'Prenosnik', e_wardrobe: 'Omara', e_map: 'Zemljevid', z_cell: 'Celica',
  st_locker: 'Omarica z opremo', st_range: 'Strelišče', st_board: 'Tabla operacije', st_vehicle: 'Vozilo', st_badge: 'Vitrina',
};

// ---------------- POSTAJA ----------------
export function buildStation(opts = {}) {
  const { boxes, B } = mk(); const cell = !!opts.cell;
  const WALL = '#6c7078';
  // strelišče (vzhod): tri steze s tarčami
  B('range_floor', null, [6, 0, -9.5], [17.5, 0.01, 9.5], '#2b2d31', { solid: false });
  for (const z of [-6, -2, 2, 6]) B(`lane${z}`, null, [6.2, 0, z - 0.05], [17.4, 0.02, z + 0.05], '#d8b020', { solid: false });
  B('range_desk', 'st_range', [6.2, 0, -8.8], [6.9, 1.0, 8.8], '#4a4d53', { decals: { '+x': { draw(g, { L }) { g.fillStyle = sh('#3a3d43', L); g.fillRect(0, 0, 260, 60); txt(g, 'STRELIŠČE: pritisnite ENTER pred tarčami', 130, 36, 14, sh('#e8d070', L), 'center'); } } } });
  // omarice z opremo (zahod)
  B('lockers', 'st_locker', [-17.9, 0, -5], [-17.1, 2.0, 5], '#4a5a70', { decals: { '+x': { draw(g, { L }) { g.fillStyle = sh('#34425a', L); for (let i = 0; i < 6; i++) { g.fillRect(6 + i * 70, 8, 62, 190); g.fillStyle = sh('#aab', L); g.fillRect(40 + i * 70, 100, 6, 14); g.fillStyle = sh('#34425a', L); } txt(g, 'OPREMA', 210, 220, 16, sh('#fff', L), 'center'); } } } });
  // tabla operacije (sever)
  B('board', 'st_board', [-6, 1.2, -10.5], [0.5, 2.6, -10.45], '#e8e4d8', { solid: false, decals: { '+z': { draw(g, { L }) { g.fillStyle = sh('#e8e4d8', L); g.fillRect(0, 0, 260, 110); txt(g, 'OPERACIJA ČRNI TOVOR', 130, 24, 16, sh('#222', L), 'center'); g.fillStyle = sh('#a02020', L); g.fillRect(14, 36, 232, 3); txt(g, 'Cilj: Zorman Logistika', 14, 62, 12, sh('#222', L)); txt(g, 'Osumljenec: skrit v varnostni sobi', 14, 80, 12, sh('#222', L)); txt(g, 'Nasprotniki: oboroženi varnostniki', 14, 98, 12, sh('#222', L)); } } } });
  // vitrina z značko
  B('badge_case', 'st_badge', [-3, 0, 9.5], [-1, 1.3, 10.4], '#3a3d43', { top: '#9bd', decals: { '-z': { draw(g, { L }) { g.fillStyle = sh('#20242b', L); g.fillRect(0, 0, 120, 80); g.fillStyle = sh('#d8b030', L); g.beginPath(); g.moveTo(60, 14); g.lineTo(78, 30); g.lineTo(72, 56); g.lineTo(48, 56); g.lineTo(42, 30); g.closePath(); g.fill(); txt(g, 'POLICIJA', 60, 74, 10, sh('#fff', L), 'center'); } } } });
  // garaža z vozili (jug)
  B('garage_floor', null, [-17.5, 0, 6], [-4, 0.01, 10.5], '#26282c', { solid: false });
  // vozili: sestavljena iz več teles (ne škatla). Vozilo 1 = oklepnik specialne enote, vozilo 2 = civilni avto
  const still = () => [0, 0, 0];
  car(B, 'v1', -11.2, 7.2, 3, '#1c2430', still, { bar: true, barOn: true, head: false });
  B('veh1', 'st_vehicle', [-12.6, 0, 7.1], [-9.8, 3.1, 13.6], '#000', { ghost: true, solid: false });
  car(B, 'v2', -6.4, 7.4, 0, '#4d5560', still, { head: false });
  B('veh2', 'st_vehicle', [-7.4, 0, 7.3], [-5.4, 1.7, 11.9], '#000', { ghost: true, solid: false });
  B('v1lbl', null, [-14.4, 1.2, 10.35], [-9.2, 2.2, 10.4], '#1c2430', { solid: false, decals: { '-z': { draw(g, { L }) { g.fillStyle = sh('#1c2430', L); g.fillRect(0, 0, 200, 60); txt(g, 'POLICIJA · SPECIALNA ENOTA', 100, 34, 13, sh('#fff', L), 'center'); } } } });
  // dekor postaje: napis, zastave, ura, avtomat, klopi, pisalne mize z monitorji, vodoravni pas na steni, svetlobne plošče
  B('wstripe', null, [-18, 1.0, -10.5], [18, 1.12, -10.45], '#2a4a8a', { solid: false });
  B('wstripe2', null, [-18, 1.0, 10.45], [18, 1.12, 10.5], '#2a4a8a', { solid: false });
  B('clock', null, [8.5, 2.5, -10.5], [9.5, 3.1, -10.45], '#e8e8e0', { solid: false, decals: { '+z': { draw(g, { t }) { g.fillStyle = '#e8e8e0'; g.fillRect(0, 0, 40, 40); g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(20, 20); g.lineTo(20 + 10 * Math.sin(t / 5), 20 - 10 * Math.cos(t / 5)); g.moveTo(20, 20); g.lineTo(28, 20); g.stroke(); } } } });
  B('flagpole', null, [-1.2, 0, -9.9], [-1.1, 2.6, -9.8], '#aaa'); B('flag', null, [-1.1, 1.5, -9.95], [0.2, 2.5, -9.9], '#d8d8d8', { solid: false, decals: { '+z': { draw(g) { g.fillStyle = '#fff'; g.fillRect(0, 0, 90, 24); g.fillStyle = '#1c4ca8'; g.fillRect(0, 24, 90, 24); g.fillStyle = '#d02828'; g.fillRect(0, 48, 90, 24); } } } });
  B('vend', null, [2, 0, -9.9], [3.2, 1.9, -8.9], '#2a4aa0', { decals: { '+z': { draw(g) { g.fillStyle = '#16203a'; g.fillRect(0, 0, 70, 120); g.fillStyle = '#e8f0ff'; g.fillRect(8, 10, 44, 64); g.fillStyle = '#c04040'; for (let i = 0; i < 3; i++) g.fillRect(12 + i * 14, 18, 8, 12); g.fillStyle = '#111'; g.fillRect(8, 90, 44, 14); } } } });
  B('bench1', null, [-8, 0, -9.6], [-3, 0.45, -8.9], '#3a3e46', { top: '#5a606a' }); B('bench2', null, [-8, 0, 3.4], [-4, 0.45, 4.1], '#3a3e46', { top: '#5a606a' });
  for (const [dx, dz] of [[-12, -7], [-12, 0], [3, -7], [7.2, 6.2]]) { B(`dk${dx}${dz}`, null, [dx, 0, dz], [dx + 2, 0.76, dz + 0.9], '#5a4a3a', { top: '#7a6a58' }); B(`mon${dx}${dz}`, null, [dx + 0.7, 0.76, dz + 0.25], [dx + 1.3, 1.18, dz + 0.35], '#15181e', { solid: false, emissive: 0.25 }); B(`ch${dx}${dz}`, null, [dx + 0.7, 0, dz + 1.05], [dx + 1.3, 0.5, dz + 1.55], '#222', { solid: false }); }
  for (const [x, z] of [[-9, -4], [0, 0], [11, 0], [-10, 8.5], [-2, -6], [-14, 3]]) B(`lp${x}${z}`, null, [x - 0.7, 3.36, z - 0.25], [x + 0.7, 3.4, z + 0.25], '#fffbe8', { solid: false, emissive: 1 });
  B('rule', null, [6.3, 0.011, -9.4], [6.5, 0.02, 9.4], '#d8b020', { solid: false });
  for (const z of [-4, 0, 4]) B(`booth${z}`, null, [6.2, 0, z - 0.06], [9.6, 1.5, z + 0.06], '#3a3e46');
  B('rangesign', null, [17.4, 1.6, -4], [17.45, 2.6, 4], '#c82020', { solid: false, decals: { '-x': { draw(g) { g.fillStyle = '#c82020'; g.fillRect(0, 0, 160, 60); g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.fillText('STRELIŠČE', 80, 26); g.font = '12px sans-serif'; g.fillText('zaščita sluha obvezna', 80, 46); } } } });
  // stene, vrata in dekor
  B('divider1', null, [-4.2, 0, 5.8], [-3.8, 3.2, 10.4], WALL, { solid: true });
  B('table', null, [-3, 0, -2], [0, 0.78, 0.4], '#5a4a3a', { top: '#7a6a58' });
  if (cell) {
    B('cell_back', null, [-17.4, 0, -9.8], [-12, 3.2, -9.7], '#555', { solid: false });
    for (let i = 0; i < 9; i++) B(`bar${i}`, null, [-17 + i * 0.5, 0, -2.2], [-16.9 + i * 0.5, 2.6, -2.1], '#8a8f98');
    B('bar_top', 'z_cell', [-17.1, 2.6, -2.25], [-12.6, 2.7, -2.05], '#8a8f98', { solid: false });
    B('cell_cot', null, [-17.2, 0, -8.8], [-14.8, 0.5, -7.6], '#59606a');
    B('cell_door', 'z_cell', [-12.6, 0, -2.4], [-12.4, 2.5, -1.4], '#7a808a', { solid: false, ghost: false });
    B('cell_g', 'z_cell', [-17.4, 0, -4], [-12.2, 2.6, -1.8], '#000', { ghost: true, solid: false });
  }
  const lights = [
    { name: 'a', pos: [-9, 3.0, -4], color: [1, 0.96, 0.9], intensity: 0.9, range: 14 }, { name: 'b', pos: [0, 3.0, 0], color: [1, 0.96, 0.9], intensity: 0.9, range: 14 },
    { name: 'c', pos: [11, 3.0, 0], color: [0.9, 0.95, 1], intensity: 1.0, range: 14 }, { name: 'd', pos: [-10, 3.0, 8.5], color: [1, 0.9, 0.7], intensity: 0.7, range: 10 },
  ];
  return { kind: 'station', room: { w: 36, d: 22, h: 3.4, floor: '#3a3d42', wall: '#8a8e96', wainscot: '#3f4650', ceiling: '#b8bcc4' }, boxes, lights, ambient: 0.42, spawn: { x: 0, z: 6, yaw: 0 } };
}

// ---------------- NOČNA VOŽNJA ----------------
// Sveta ni treba premikati po zemljevidu: predmeti drsijo mimo kamere (off), igralec pa miruje. Cesta se ovija (roadC), predmeti se strižejo.
const PER = 40;
export const ROAD_TOTAL = 1100;
export const roadC = (s) => Math.sin(s / 80) * 16 + Math.sin(s / 31) * 3.2 + Math.sin(s / 190) * 30;
export const roadK = (s) => -Math.sin(s / 80) * 16 / 6400 - Math.sin(s / 31) * 3.2 / 961 - Math.sin(s / 190) * 30 / 36100; // ukrivljenost (C'')
const wrapZ = (z0, dist) => ((((z0 + 20 + dist) % PER) + PER) % PER) - 20;
export const ROAD_CARS = [{ lane: 0, z0: -15, v: 0.6, kind: 0 }, { lane: 3, z0: -4, v: 0.8, kind: 1 }, { lane: -3, z0: 4, v: 0.9, kind: 2 }, { lane: 0, z0: -28, v: 0.5, kind: 3 }, { lane: 3, z0: 12, v: 0.7, kind: 0 }, { lane: -3, z0: 18, v: 0.85, kind: 1 }, { lane: 0, z0: 2, v: 0.55, kind: 2 }];
// Položaj avtomobila glede na prevoženo pot (dist), bočni zamik (lat) in sireno (0..1). Isti izračun uporablja tudi vožnja za trke.
export function carPos(c, d) {
  const dist = d.dist || 0, rel = ((((c.z0 + 20 + dist * (1 - c.v)) % PER) + PER) % PER) - 20;
  const yieldDx = d.siren && Math.abs(c.lane - (d.lat || 0)) < 2.2 ? (c.z0 % 8 > 3 ? 1 : -1) * 3 * d.siren : 0;
  const shear = roadC(dist + 17 - (rel + 2)) - roadC(dist);
  return { dx: -(d.lat || 0) + yieldDx + shear, dz: rel - c.z0, x: c.lane - (d.lat || 0) + yieldDx + shear, zFront: rel, zBack: rel + 4.4 };
}
// Sestavljen avto iz več teles: podvozje, nagnjena prednja/zadnja ploskev, kabina s stekli, kolesa, luči. kind: 0 limuzina, 1 hatchback, 2 kombi/SUV, 3 tovornjak.
function car(B, id, cx, z, kind, color, off, o = {}) {
  const N = (n, a, b, col, op = {}) => B(`${id}${n}`, null, a, b, col, { solid: false, off, ...op });
  const L = kind === 3 ? 6.4 : 4.4, W = kind === 3 ? 1.25 : 0.92, tall = kind === 2 ? 0.25 : 0;
  N('w1', [cx - W - 0.05, 0, z + 0.7], [cx - W + 0.12, 0.62, z + 1.4], '#0c0c0e'); N('w2', [cx + W - 0.12, 0, z + 0.7], [cx + W + 0.05, 0.62, z + 1.4], '#0c0c0e');
  N('w3', [cx - W - 0.05, 0, z + L - 1.4], [cx - W + 0.12, 0.62, z + L - 0.7], '#0c0c0e'); N('w4', [cx + W - 0.12, 0, z + L - 1.4], [cx + W + 0.05, 0.62, z + L - 0.7], '#0c0c0e');
  N('b', [cx - W, 0.3, z + 0.1], [cx + W, 0.9, z + L - 0.1], color);
  if (kind === 3) {
    N('cab', [cx - W + 0.05, 0.9, z + 0.2], [cx + W - 0.05, 2.5, z + 1.9], color); N('gl', [cx - W + 0.1, 1.5, z + 0.18], [cx + W - 0.1, 2.3, z + 0.3], '#1a2432');
    N('box', [cx - W, 0.9, z + 2.1], [cx + W, 3.1, z + L], '#7c8086');
  } else {
    N('hood', [cx - W + 0.05, 0.9, z + 0.15], [cx + W - 0.05, 1.0, z + 1.45], color); N('hood2', [cx - W + 0.12, 1.0, z + 1.1], [cx + W - 0.12, 1.1, z + 1.7], color);
    N('cab', [cx - W + 0.1, 1.0, z + 1.5], [cx + W - 0.1, 1.28 + tall, z + (kind === 1 ? L - 0.2 : L - 1.0)], color);
    N('gl', [cx - W + 0.18, 1.28 + tall, z + 1.85], [cx + W - 0.18, 1.55 + tall, z + (kind === 1 ? L - 0.45 : L - 1.4)], '#16202c');
    N('roof', [cx - W + 0.24, 1.55 + tall, z + 2.1], [cx + W - 0.24, 1.6 + tall, z + (kind === 1 ? L - 0.6 : L - 1.6)], color);
    if (kind !== 1) N('trunk', [cx - W + 0.06, 0.9, z + L - 1.0], [cx + W - 0.06, 1.05, z + L - 0.1], color);
  }
  N('hl1', [cx - W + 0.12, 0.62, z + 0.04], [cx - W + 0.5, 0.78, z + 0.14], '#fff6d8', { emissive: o.head === false ? 0.1 : 1 }); N('hl2', [cx + W - 0.5, 0.62, z + 0.04], [cx + W - 0.12, 0.78, z + 0.14], '#fff6d8', { emissive: o.head === false ? 0.1 : 1 });
  N('tl1', [cx - W + 0.1, 0.62, z + L - 0.12], [cx - W + 0.55, 0.78, z + L - 0.02], '#ff2020', { emissive: 1 }); N('tl2', [cx + W - 0.55, 0.62, z + L - 0.12], [cx + W - 0.1, 0.78, z + L - 0.02], '#ff2020', { emissive: 1 });
  N('bump', [cx - W, 0.3, z], [cx + W, 0.5, z + 0.1], '#151518');
  if (o.bar) { N('bar1', [cx - 0.7, 1.6 + tall, z + 2.3], [cx - 0.05, 1.72 + tall, z + 2.7], '#ff2a2a', { emissive: o.barOn ? 1 : 0.15 }); N('bar2', [cx + 0.05, 1.6 + tall, z + 2.3], [cx + 0.7, 1.72 + tall, z + 2.7], '#2a50ff', { emissive: o.barOn ? 1 : 0.15 }); }
}
export function drawCarModel(B, id, cx, z, kind, color, off, o) { car(B, id, cx, z, kind, color, off, o); }
export function buildRoad() {
  const { boxes, B } = mk();
  const place = (z0) => (st) => { const d = st.drive || { dist: 0, lat: 0 }; const z = wrapZ(z0, d.dist); return [roadC(d.dist + 17 - z) - roadC(d.dist) - (d.lat || 0), 0, z - z0]; };
  // vozišče po odsekih (2 m), pločniki in robne črte
  for (let i = -20; i < 20; i += 2) {
    const o = { solid: false, off: place(i) };
    B(`as${i}`, null, [-6, 0.004, i], [6, 0.012, i + 2.04], '#34363b', o);
    B(`wl${i}`, null, [-8.6, 0.01, i], [-6, 0.13, i + 2.04], '#5a5c62', o); B(`wr${i}`, null, [6, 0.01, i], [8.6, 0.13, i + 2.04], '#5a5c62', o);
    B(`gl${i}`, null, [-60, 0, i], [-8.6, 0.006, i + 2.04], '#16221a', o); B(`gr${i}`, null, [8.6, 0, i], [60, 0.006, i + 2.04], '#16221a', o);
    B(`eL${i}`, null, [-5.85, 0.014, i], [-5.72, 0.02, i + 2.04], '#e8e8e0', o); B(`eR${i}`, null, [5.72, 0.014, i], [5.85, 0.02, i + 2.04], '#e8e8e0', o);
    if (((i + 20) / 2) % 2 === 0) { B(`c${i}`, null, [-0.07, 0.014, i], [0.07, 0.02, i + 1.2], '#e8d878', o); B(`cL${i}`, null, [-3.07, 0.014, i], [-2.93, 0.02, i + 1.2], '#d8d8d0', o); B(`cR${i}`, null, [2.93, 0.014, i], [3.07, 0.02, i + 1.2], '#d8d8d0', o); }
  }
  // svetilke in stavbe ob cesti
  for (let i = -20; i < 20; i += 10) for (const sx of [-1, 1]) {
    const o = { solid: false, off: place(i) }; const x = sx * 7.4;
    B(`pole${i}${sx}`, null, [x - 0.06, 0, i], [x + 0.06, 5.6, i + 0.12], '#2a2c30', o); B(`arm${i}${sx}`, null, [x - sx * 1.6, 5.5, i], [x, 5.6, i + 0.12], '#2a2c30', o);
    B(`lamp${i}${sx}`, null, [x - sx * 2.0, 5.4, i - 0.1], [x - sx * 1.2, 5.5, i + 0.3], '#fff2c0', { ...o, emissive: 1 });
    B(`glow${i}${sx}`, null, [x - sx * 2.6, 0.016, i - 2.4], [x - sx * 0.6, 0.02, i + 2.7], '#8a7a4a', { ...o, emissive: 0.35 });
  }
  for (let i = -20; i < 20; i += 10) for (const sx of [-1, 1]) {
    const o = { solid: false, off: place(i) }; const bh = 7 + ((i / 10 + 2 + (sx > 0 ? 1 : 0)) % 3) * 3, x0 = sx * 10, x1 = sx * 18;
    B(`bl${i}${sx}`, null, [Math.min(x0, x1), 0, i], [Math.max(x0, x1), bh, i + 9.7], ['#2a2c34', '#34302c', '#262c30'][(i / 10 + 2 + (sx > 0 ? 1 : 0)) % 3 | 0], o);
    for (let wy = 2.2; wy < bh - 1; wy += 2.6) for (let wz = 0.8; wz < 9; wz += 2.4) { if (((wy * 3 + wz * 5 + i + (sx > 0 ? 7 : 0)) | 0) % 3 === 0) continue; B(`wn${i}${sx}${wy | 0}${wz | 0}`, null, [x0 - sx * 0.01 - (sx > 0 ? 0 : 0.04), wy, i + wz], [x0 - sx * 0.01 + (sx > 0 ? 0.04 : 0), wy + 1.3, i + wz + 1.4], '#ffd88a', { ...o, emissive: 0.85 }); }
  }
  // promet
  const COLS = ['#8a1c1c', '#1c3a8a', '#c8c8c8', '#202024', '#1c6a3a', '#a07a20', '#5a5a60'];
  ROAD_CARS.forEach((c, i) => { const off = (st) => { const p = carPos(c, st.drive || {}); return [p.dx, 0, p.dz]; }; car(B, `car${i}`, c.lane, c.z0, c.kind, COLS[i % 7], off); });
  // cilj: ograja z zapornico in skladišče (pridejo v vidno polje šele ob koncu poti)
  const dest = (st) => { const d = st.drive || { dist: 0, lat: 0 }; const gz = 17 - (ROAD_TOTAL + 6 - d.dist); return [roadC(ROAD_TOTAL + 6) - roadC(d.dist) - (d.lat || 0), 0, gz]; };
  const O = { solid: false, off: dest };
  B('d_bar', null, [-6, 0.9, -0.2], [6, 1.05, 0.2], '#d82020', O); B('d_p1', null, [-6.3, 0, -0.3], [-5.8, 1.5, 0.3], '#444', O); B('d_p2', null, [5.8, 0, -0.3], [6.3, 1.5, 0.3], '#444', O);
  B('d_fenceL', null, [-30, 0, -0.1], [-6.3, 2.2, 0.1], '#50545c', O); B('d_fenceR', null, [6.3, 0, -0.1], [30, 2.2, 0.1], '#50545c', O);
  B('d_wh', null, [-26, 0, -26], [26, 8, -9], '#3a3e46', O); B('d_roof', null, [-26.5, 8, -26.5], [26.5, 8.5, -8.5], '#2a2c32', O);
  B('d_yard', null, [-30, 0.004, -30], [30, 0.01, 0], '#2a2b2f', { ...O, solid: false });
  for (const dx of [-16, -4, 8, 20]) B(`d_door${dx}`, null, [dx, 0, -9.05], [dx + 6, 4.4, -8.95], '#5a5e66', O);
  B('d_sign', null, [-12, 5.2, -9.1], [12, 6.8, -9], '#e8e0c8', { ...O, emissive: 0.6, decals: { '+z': { draw(g) { g.fillStyle = '#e8e0c8'; g.fillRect(0, 0, 300, 70); g.fillStyle = '#c81818'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.fillText('ZORMAN LOGISTIKA', 150, 36); g.fillStyle = '#333'; g.font = '14px sans-serif'; g.fillText('tovorni terminal 4 · samo za pooblaščene', 150, 58); } } } });
  for (const dx of [-22, 22]) { B(`d_fp${dx}`, null, [dx - 0.1, 0, -9.5], [dx + 0.1, 9, -9.3], '#222', O); B(`d_fl${dx}`, null, [dx - 1.2, 9, -9.8], [dx + 1.2, 9.4, -9.2], '#fff8e0', { ...O, emissive: 1 }); }
  for (let k = 0; k < 6; k++) B(`d_win${k}`, null, [-24 + k * 8.5, 5.4, -9.04], [-22 + k * 8.5, 6.6, -8.96], '#d8c880', { ...O, emissive: 0.6 });
  B('d_guard', null, [8, 0, -3.5], [10.5, 2.3, -1.0], '#4a4e54', O); B('d_gwin', null, [8.4, 1.1, -1.04], [10.1, 1.9, -0.96], '#f0e0a0', { ...O, emissive: 0.8 });
  // lastno vozilo (kot sled sovoznika) parkirano ob cesti
  const ego = (st) => { const d = st.drive || { dist: 0, lat: 0 }; return d.out ? [-(d.lat || 0), 0, 0] : [0, 0, 300]; };
  if (true) car(B, 'ego', 0, 15.0, 2, '#161a24', ego, { bar: true, barOn: false, head: true });
  const lights = [
    { name: 'l1', pos: [-5, 5, 6], color: [1, 0.85, 0.55], intensity: 0.8, range: 14 }, { name: 'l2', pos: [5, 5, -6], color: [1, 0.85, 0.55], intensity: 0.8, range: 14 }, { name: 'l3', pos: [0, 4, 15], color: [1, 0.9, 0.7], intensity: 0.5, range: 12 },
  ];
  return { kind: 'road', room: { w: 120, d: 40, h: 14, floor: '#16221a', wall: '#0c1018', wainscot: '#0a0e14', ceiling: '#05070d' }, boxes, lights, ambient: 0.2, spawn: { x: 0, z: 17, yaw: 0 } };
}

// ---------------- SKLADIŠČE ----------------
export function buildWarehouse() {
  const { boxes, B } = mk();
  const WALL = '#6d7078', solvedL = (l) => (s) => !!(s.solved && s.solved[l]);
  const XS = [-15, -5, 5, 15];
  const doorDecal = (num) => ({ draw(g, { L, st }) { g.fillStyle = sh('#4a5058', L); g.fillRect(0, 0, 130, 220); g.fillStyle = sh('#2c3036', L); g.fillRect(10, 12, 110, 196); g.fillStyle = '#10151c'; g.fillRect(40, 90, 50, 40); g.fillStyle = '#ff4040'; g.fillRect(48, 98, 8, 6); txt(g, num, 65, 70, 22, sh('#ddd', L), 'center'); } });
  XS.forEach((x, i) => {
    const t = `w${i + 1}`;
    B(`${t}_a`, null, [x - 0.15, 0, -6], [x + 0.15, 3.4, -0.85], WALL); B(`${t}_b`, null, [x - 0.15, 0, 0.85], [x + 0.15, 3.4, 6], WALL); B(`${t}_c`, null, [x - 0.15, 2.3, -0.85], [x + 0.15, 3.4, 0.85], WALL, { solid: false });
    B(`door${i + 1}`, `d_door${i + 1}`, [x - 0.1, 0, -0.85], [x + 0.1, 2.3, 0.85], '#444a52', { hide: solvedL(['L_D1', 'L_D2', 'L_D3', 'L_D4'][i]), decals: { '-x': doorDecal(String(i + 1)), '+x': doorDecal(String(i + 1)) } });
    B(`door${i + 1}_g`, `d_door${i + 1}`, [x - 0.4, 0, -1.0], [x + 0.4, 2.4, 1.0], '#000', { ghost: true, solid: false });
  });
  // R1 preddverje
  B('desk', 'r_desk', [-22, 0, -2.2], [-20.6, 1.0, 2.2], '#5a4a3a', { top: '#8a7a68' });
  B('pc', 'r_pc', [-21.6, 1.0, -0.4], [-20.9, 1.45, 0.4], '#15181e', { on: 'desk', solid: false, decals: { '+x': { draw(g, { L, st }) { g.fillStyle = (st.solved && st.solved.L_PC) ? '#10b050' : '#2a6ad8'; g.fillRect(0, 0, 80, 56); txt(g, (st.solved && st.solved.L_PC) ? 'DNEVNIK' : 'GESLO:', 40, 32, 11, '#fff', 'center'); } } } });
  B('photo', 'r_photo', [-19.2, 1.5, -6], [-18.2, 2.2, -5.95], '#7a6a50', { solid: false, decals: { '+z': { draw(g, { L }) { g.fillStyle = sh('#c8b890', L); g.fillRect(0, 0, 80, 60); g.fillStyle = sh('#d89a40', L); g.beginPath(); g.ellipse(40, 34, 22, 15, 0, 0, 7); g.fill(); g.beginPath(); g.arc(24, 22, 9, 0, 7); g.fill(); g.fillStyle = '#222'; g.fillRect(20, 20, 3, 3); } } } });
  B('shifts', 'r_board', [-23.5, 1.2, 5.95], [-20.5, 2.4, 6], '#d8d4c8', { solid: false, decals: { '-z': { draw(g, { L }) { g.fillStyle = sh('#d8d4c8', L); g.fillRect(0, 0, 150, 70); txt(g, 'DEŽURSTVA', 75, 16, 12, '#222', 'center'); g.fillStyle = '#444'; for (let i = 0; i < 5; i++) g.fillRect(10, 26 + i * 8, 130 - (i % 3) * 20, 2); g.fillStyle = '#c02020'; g.fillRect(10, 62, 60, 3); } } } });
  B('sofa', null, [-24.6, 0, 2], [-23.4, 0.6, 5], '#3a4a5a'); B('plant', null, [-17, 0, 4.5], [-16.3, 1.1, 5.2], '#2a5a2a');
  // R2 pisarna
  B('odesk', 'o_desk', [-11.6, 0, -4.4], [-8.8, 0.78, -2.8], '#5a4228', { top: '#7a6038' });
  B('ochair', null, [-10.8, 0, -2.4], [-10, 0.5, -1.6], '#222');
  B('cal', 'o_calendar', [-8.4, 1.3, -6], [-7.4, 2.1, -5.95], '#e8e4d8', { solid: false, decals: { '+z': { draw(g, { L }) { g.fillStyle = sh('#e8e4d8', L); g.fillRect(0, 0, 80, 70); txt(g, 'MAREC', 40, 14, 10, '#222', 'center'); g.strokeStyle = '#d02020'; g.lineWidth = 2; g.beginPath(); g.arc(34, 38, 9, 0, 7); g.stroke(); txt(g, '17', 34, 42, 10, '#222', 'center'); } } } });
  B('family', 'o_family', [-12.4, 1.2, 5.95], [-11.6, 1.8, 6], '#7a6a50', { solid: false, decals: { '-z': { draw(g, { L }) { g.fillStyle = sh('#b0a080', L); g.fillRect(0, 0, 60, 45); g.fillStyle = sh('#4a4a60', L); g.fillRect(12, 14, 8, 24); g.fillRect(26, 14, 8, 24); g.fillRect(40, 24, 7, 14); } } } });
  B('safe', 'o_safe', [-13.3, 0.5, -6], [-12.3, 1.5, -5.4], '#3a3e44', { decals: { '+z': { draw(g, { L, st }) { g.fillStyle = sh('#3a3e44', L); g.fillRect(0, 0, 80, 90); g.fillStyle = '#aab'; g.beginPath(); g.arc(40, 44, 14, 0, 7); g.fill(); g.fillStyle = (st.solved && st.solved.L_SAFE) ? '#4cff7a' : '#ff4040'; g.fillRect(34, 8, 12, 6); } } } });
  B('cabinet_o', null, [-6.4, 0, 4.4], [-5.4, 1.8, 5.8], '#4a4e56');
  // R3 arhiv
  B('table', null, [-3.4, 0, 2.6], [-1.6, 0.8, 4.4], '#5a4a3a', { top: '#7a6a58' });
  B('manifest', 'a_manifest', [-3.0, 0.8, 3.0], [-2.3, 0.84, 3.8], '#e8e4d8', { on: 'table', solid: false });
  B('scale', 'a_scale', [1.6, 0, 3.4], [3.2, 0.45, 4.8], '#6a6e74', { top: '#9aa0a8', decals: { '+y': { draw(g, { L }) { g.fillStyle = '#111'; g.fillRect(14, 10, 52, 22); txt(g, '52', 40, 28, 18, '#ff4040', 'center'); } } } });
  B('cabinet', 'a_cabinet', [3.6, 0, -5.6], [4.8, 2.0, -3.2], '#56606a', { decals: { '-x': { draw(g, { L, st }) { g.fillStyle = sh('#46505a', L); for (let i = 0; i < 4; i++) g.fillRect(6, 8 + i * 46, 108, 38); g.fillStyle = (st.solved && st.solved.L_ARCH) ? '#4cff7a' : '#ff4040'; g.fillRect(52, 4, 14, 4); } } } });
  B('crate', 'a_crate', [-3.4, 0, -4.8], [-1.2, 1.1, -3.2], '#7a5a30', { top: '#8a6a3c' });
  B('crate2', null, [-1.0, 0, -5.2], [0.4, 0.8, -4.0], '#6a4a28');
  B('pboard', 'a_board', [0.2, 1.2, -6], [2.4, 2.4, -5.95], '#d8d4c8', { solid: false, decals: { '+z': { draw(g, { L }) { g.fillStyle = sh('#d8d4c8', L); g.fillRect(0, 0, 150, 80); g.strokeStyle = '#2a60c0'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, 60); g.lineTo(50, 30); g.lineTo(90, 50); g.lineTo(136, 18); g.stroke(); g.fillStyle = '#c02020'; for (const p of [[14, 60], [50, 30], [90, 50], [136, 18]]) { g.beginPath(); g.arc(p[0], p[1], 4, 0, 7); g.fill(); } } } } });
  // R4 strežniška
  B('tdesk', null, [6.6, 0, -5.6], [8.4, 0.8, -4.6], '#3a3e44');
  B('terminal', 'd_terminal', [7.0, 0.8, -5.4], [7.9, 1.4, -5.0], '#12161c', { solid: false, on: 'tdesk', decals: { '+z': { draw(g, { L, st }) { g.fillStyle = (st.solved && st.solved.L_SERVER) ? '#10b050' : '#16202c'; g.fillRect(0, 0, 90, 60); txt(g, (st.solved && st.solved.L_SERVER) ? 'DOSTOP' : 'USB + ČAS', 45, 34, 11, '#8cf', 'center'); } } } });
  B('rack', 'd_rack', [11.6, 0, 4.6], [14.2, 2.2, 5.9], '#1c2028', { decals: { '-z': { draw(g, { L, t }) { g.fillStyle = sh('#1c2028', L); g.fillRect(0, 0, 260, 140); for (let i = 0; i < 10; i++) { g.fillStyle = Math.floor(t * 3 + i) % 3 ? '#20d060' : '#206040'; g.fillRect(14 + i * 24, 12, 8, 6); g.fillStyle = '#2c323c'; g.fillRect(10 + i * 24, 26, 20, 100); } } } } });
  B('ndesk', 'd_desk', [8.2, 0, 3.4], [10.2, 0.78, 4.8], '#6a5a48', { top: '#8a7a68' });
  // R5 soba osumljenca
  B('edesk', null, [21.8, 0, -5.6], [23.8, 0.78, -4.4], '#4a3a2a', { top: '#6a5a48' });
  B('laptop', 'e_laptop', [22.3, 0.78, -5.4], [23.1, 1.05, -4.9], '#15181e', { on: 'edesk', solid: false, decals: { '+y': { draw(g, { L }) { g.fillStyle = '#2a60c0'; g.fillRect(0, 0, 60, 40); } } } });
  B('wardrobe', 'e_wardrobe', [23.9, 0, 0.8], [24.9, 2.1, 3.2], '#5a4a38');
  B('emap', 'e_map', [18.0, 1.2, -6], [20.4, 2.5, -5.95], '#d8d4c8', { solid: false, decals: { '+z': { draw(g, { L }) { g.fillStyle = sh('#c8d0c0', L); g.fillRect(0, 0, 160, 90); g.fillStyle = '#c02020'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(20 + i * 24, 30 + (i % 3) * 18, 4, 0, 7); g.fill(); } } } } });
  B('cot', null, [16.2, 0, 3.8], [18.4, 0.5, 5.6], '#3a4650');
  B('screens', null, [15.4, 1.4, -5.95], [17.2, 2.4, -5.9], '#10161e', { solid: false, emissive: 0.3 });
  const lights = [-20, -10, 0, 10, 20].map((x, i) => ({ name: `r${i}`, pos: [x, 3.0, 0], color: i === 4 ? [1, 0.7, 0.5] : [0.9, 0.95, 1], intensity: i === 4 ? 0.7 : 0.8, range: 11 }));
  return { kind: 'warehouse', room: { w: 50, d: 12, h: 3.4, floor: '#4a4c52', wall: '#7a7e86', wainscot: '#3a3e46', ceiling: '#9a9ea6' }, boxes, lights, ambient: 0.26, spawn: { x: -23.5, z: 0, yaw: Math.PI / 2 } };
}
