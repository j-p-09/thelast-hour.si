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
  B('veh1', 'st_vehicle', [-14, 0, 7.2], [-8.5, 1.9, 9.6], '#1c2430', { top: '#2a3342', decals: { '-z': { draw(g, { L, t }) { g.fillStyle = sh('#1c2430', L); g.fillRect(0, 0, 220, 100); g.fillStyle = sh('#10161e', L); g.fillRect(14, 14, 190, 36); txt(g, 'POLICIJA SPECIALNA ENOTA', 110, 78, 13, sh('#fff', L), 'center'); const on = Math.floor(t * 3) % 2; g.fillStyle = on ? '#ff2a2a' : '#2a40ff'; g.fillRect(8, 6, 28, 5); g.fillStyle = on ? '#2a40ff' : '#ff2a2a'; g.fillRect(184, 6, 28, 5); } } } });
  B('veh2', 'st_vehicle', [-7, 0, 7.4], [-4.8, 1.4, 9.5], '#4d5560', { top: '#5a6370' });
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
// Sveta ni treba premikati po zemljevidu: predmeti drsijo mimo kamere (off), igralec pa miruje.
const PER = 40;
export const ROAD_CARS = [{ lane: 0, z0: -15, v: 0.6 }, { lane: 3, z0: -4, v: 0.8 }, { lane: -3, z0: 4, v: 0.9 }, { lane: 0, z0: -28, v: 0.5 }, { lane: 3, z0: 12, v: 0.7 }, { lane: -3, z0: 18, v: 0.85 }, { lane: 0, z0: 2, v: 0.55 }];
// Položaj avtomobila glede na prevoženo pot (dist), bočni zamik (lat) in sireno (0..1). Isti izračun uporablja tudi vožnja za trke.
export function carPos(c, d) {
  const dist = d.dist || 0, rel = ((((c.z0 + 20 + dist * (1 - c.v)) % PER) + PER) % PER) - 20;
  const yieldDx = d.siren && Math.abs(c.lane - (d.lat || 0)) < 2.2 ? (c.z0 % 8 > 3 ? 1 : -1) * 3 * d.siren : 0;
  return { dx: -(d.lat || 0) + yieldDx, dz: rel - c.z0, x: c.lane - (d.lat || 0) + yieldDx, zFront: rel, zBack: rel + 4.2 };
}
export function buildRoad() {
  const { boxes, B } = mk();
  const slide = (z0, k = 1) => (st) => { const d = st.drive || { dist: 0, lat: 0 }; const dz = ((d.dist * k) % PER + PER) % PER; return [-(d.lat || 0), 0, dz]; };
  // lani in robne črte
  for (let i = -20; i < 20; i += 4) B(`dash${i}`, null, [-0.06, 0.012, i], [0.06, 0.02, i + 2], '#e8e8e0', { solid: false, off: slide(i) });
  B('edgeL', null, [-6.1, 0.012, -20], [-5.97, 0.02, 20], '#e8e8e0', { solid: false }); B('edgeR', null, [5.97, 0.012, -20], [6.1, 0.02, 20], '#e8e8e0', { solid: false });
  // svetilke
  for (let i = -20; i < 20; i += 10) for (const sx of [-6.6, 6.6]) {
    B(`pole${i}${sx}`, null, [sx - 0.05, 0, i], [sx + 0.05, 5.2, i + 0.1], '#2a2c30', { solid: false, off: slide(i) });
    B(`lamp${i}${sx}`, null, [sx - 0.35, 5.2, i - 0.1], [sx + 0.35, 5.3, i + 0.3], '#fff2c0', { solid: false, emissive: 1, off: slide(i) });
  }
  // okna stavb (osvetljena)
  for (let i = -20; i < 20; i += 5) for (const sx of [-1, 1]) for (const hy of [2.2, 4.2, 6.2]) {
    if (((i / 5) * 3 + hy * 7 + (sx > 0 ? 1 : 0)) % 3 === 0) continue;
    const x = sx * 7.92; B(`win${i}${sx}${hy}`, null, [Math.min(x, x - sx * 0.05), hy, i], [Math.max(x, x - sx * 0.05), hy + 1.1, i + 2], '#ffd88a', { solid: false, emissive: 0.8, off: slide(i) });
  }
  // promet
  ROAD_CARS.forEach((c, i) => {
    const off = (st) => { const p = carPos(c, st.drive || {}); return [p.dx, 0, p.dz]; };
    B(`car${i}`, null, [c.lane - 0.9, 0.2, c.z0], [c.lane + 0.9, 1.35, c.z0 + 4.2], ['#8a1c1c', '#1c3a8a', '#d8d8d8', '#202020', '#1c6a3a', '#a07a20', '#5a5a60'][i % 7], { solid: false, off });
    B(`tail${i}`, null, [c.lane - 0.85, 0.7, c.z0 + 4.2], [c.lane + 0.85, 0.85, c.z0 + 4.26], '#ff2020', { solid: false, emissive: 1, off });
  });
  const lights = [
    { name: 'l1', pos: [-5, 5, 6], color: [1, 0.85, 0.55], intensity: 0.8, range: 14 }, { name: 'l2', pos: [5, 5, -6], color: [1, 0.85, 0.55], intensity: 0.8, range: 14 }, { name: 'l3', pos: [0, 4, 15], color: [1, 0.9, 0.7], intensity: 0.5, range: 12 },
  ];
  return { kind: 'road', room: { w: 16, d: 40, h: 12, floor: '#2a2b2e', wall: '#585c66', wainscot: '#34373d', ceiling: '#0a1020' }, boxes, lights, ambient: 0.2, spawn: { x: 1.8, z: 17, yaw: 0 } };
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
