// Lahek 3D prikazovalnik za virtualno sobo (Primer 002). Brez knjižnic: canvas 2D, perspektivna projekcija,
// sencenje po ploskvah, svetlobni viri, svetilka, UV-način, trki, izbiranje predmetov z žarkom.
// Koordinate: x desno, y gor, z proti igralcu (sever = -z). Mere v metrih. Kot kamere (yaw) 0 = pogled proti severu (-z).

import { drawAvatar2D, drawGhost2D } from './room3d-avatar.js';

const NEAR = 0.07;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const FACES = [
  { n: [0, 0, 1], k: '+z' }, { n: [0, 0, -1], k: '-z' }, { n: [1, 0, 0], k: '+x' },
  { n: [-1, 0, 0], k: '-x' }, { n: [0, 1, 0], k: '+y' }, { n: [0, -1, 0], k: '-y' },
];
// Oglišča ploskve (zgoraj levo, zgoraj desno, spodaj desno, spodaj levo), gledano od zunaj.
function faceCorners(k, a, b) {
  const [x0, y0, z0] = a, [x1, y1, z1] = b;
  switch (k) {
    case '+z': return [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]];
    case '-z': return [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]];
    case '+x': return [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]];
    case '-x': return [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]];
    case '+y': return [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    default: return [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]];
  }
}
const dist3 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

export function createEngine(canvas, scene, opts = {}) {
  const g = canvas.getContext('2d', { alpha: false });
  const S = {
    pos: { x: scene.spawn.x, y: 1.62, z: scene.spawn.z }, yaw: scene.spawn.yaw || 0, pitch: 0,
    fps: false, speedMul: 1, npcs: [], flash: false, uv: false, gain: 1.0, hover: null, state: {}, auto: null, t: 0,
    keys: new Set(), peers: new Map(), pad: { f: 0, s: 0, r: 0 }, W: 800, H: 500, dpr: 1, running: true, last: performance.now(),
  };
  const fov = (opts.fov || 72) * Math.PI / 180;
  const tanHalf = Math.tan(fov / 2);
  const RADIUS = 0.26;

  // ---------- priprava ploskev ----------
  const shell = [];       // statične ploskve prostora (tla, strop, stene) razdeljene v ploščice
  const boxes = scene.boxes.map((b, i) => ({ ...b, i, c: hex(b.color), min: b.min, max: b.max }));
  const byId = new Map(); boxes.forEach((b) => { if (b.id) byId.set(b.id, b); });
  const objBoxes = new Map(); boxes.forEach((b) => { if (b.obj) { if (!objBoxes.has(b.obj)) objBoxes.set(b.obj, []); objBoxes.get(b.obj).push(b); } });

  function addGrid(corners, nx, ny, base, normal, opt = {}) {
    const [p0, p1, , p3] = corners; // TL, TR, BR, BL
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / ny, v1 = (j + 1) / ny;
      const P = (u, v) => [p0[0] + (p1[0] - p0[0]) * u + (p3[0] - p0[0]) * v, p0[1] + (p1[1] - p0[1]) * u + (p3[1] - p0[1]) * v, p0[2] + (p1[2] - p0[2]) * u + (p3[2] - p0[2]) * v];
      const pts = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
      const ctr = P((u0 + u1) / 2, (v0 + v1) / 2);
      let c = base;
      if (opt.pattern) c = opt.pattern(i, j, base);
      shell.push({ pts, n: normal, c, ctr, mid: ctr });
    }
  }
  const { w: RW, d: RD, h: RH } = scene.room;
  const x0 = -RW / 2, x1 = RW / 2, z0 = -RD / 2, z1 = RD / 2;
  const shade = (c, f) => [clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f, 0, 255)];
  const R = scene.room;
  // tla: parket (izmenični odtenki), strop, stene z letvijo
  addGrid([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], Math.round(RW * 2), Math.round(RD * 2), hex(R.floor || '#4a3322'), [0, 1, 0],
    { pattern: (i, j, b) => shade(b, 0.82 + ((i * 7 + j * 13 + (j % 2) * 3) % 5) * 0.06) });
  addGrid([[x0, RH, z1], [x1, RH, z1], [x1, RH, z0], [x0, RH, z0]], 8, 6, hex(R.ceiling || '#d8d0c0'), [0, -1, 0]);
  const wallBase = hex(R.wall || '#6d3a3a'), wain = hex(R.wainscot || '#3b261a');
  const WH = 1.05; // višina letve
  const wall = (c0, c1, n, len) => {
    const [a, b] = [c0, c1];
    const lo = [[a[0], WH, a[2]], [b[0], WH, b[2]], [b[0], 0, b[2]], [a[0], 0, a[2]]];
    const hi = [[a[0], RH, a[2]], [b[0], RH, b[2]], [b[0], WH, b[2]], [a[0], WH, a[2]]];
    addGrid(lo, Math.round(len * 1.5), 2, wain, n);
    addGrid(hi, Math.round(len * 1.5), 5, wallBase, n, { pattern: (i, j, bse) => shade(bse, i % 2 ? 0.93 : 1.02) });
  };
  wall([x0, 0, z0], [x1, 0, z0], [0, 0, 1], RW);      // severna stena
  wall([x1, 0, z1], [x0, 0, z1], [0, 0, -1], RW);     // južna
  wall([x1, 0, z0], [x1, 0, z1], [-1, 0, 0], RD);     // vzhodna
  wall([x0, 0, z1], [x0, 0, z0], [1, 0, 0], RD);      // zahodna

  const lights = scene.lights || [];
  const AMB = scene.ambient == null ? 0.2 : scene.ambient;
  function staticLight(P, N) {
    let r = AMB, gg = AMB * 0.95, b = AMB * 1.1;
    for (const L of lights) {
      const dx = L.pos[0] - P[0], dy = L.pos[1] - P[1], dz = L.pos[2] - P[2];
      const d = Math.hypot(dx, dy, dz) || 1e-6;
      const ndl = Math.max(0, (N[0] * dx + N[1] * dy + N[2] * dz) / d);
      const att = Math.pow(Math.max(0, 1 - d / L.range), 2) * L.intensity;
      const k = (ndl * 0.85 + 0.15) * att;
      r += L.color[0] * k; gg += L.color[1] * k; b += L.color[2] * k;
    }
    return [r, gg, b];
  }
  for (const f of shell) f.light = staticLight(f.ctr, f.n);

  // ploskve škatel (statično osvetljene; položaj se lahko premakne prek off(), zato se svetloba preračuna ob spremembi)
  for (const b of boxes) {
    b.faces = FACES.map((F) => ({ ...F, key: F.k }));
    b.ex = [0, 0, 0];
    b.lightCache = {};
  }
  function boxFaceLight(b, F, a, c) {
    const key = `${F.k}|${a[0].toFixed(2)}|${a[2].toFixed(2)}`;
    let v = b.lightCache[key];
    if (!v) {
      const ctr = [(a[0] + c[0]) / 2 + F.n[0] * (c[0] - a[0]) / 2, (a[1] + c[1]) / 2 + F.n[1] * (c[1] - a[1]) / 2, (a[2] + c[2]) / 2 + F.n[2] * (c[2] - a[2]) / 2];
      v = staticLight(ctr, F.n);
      // zelo majhni predmeti ne smejo biti popolnoma črni
      b.lightCache[key] = v;
    }
    return v;
  }

  // ---------- projekcija ----------
  let fwd, right, up, focal;
  function setupCamera() {
    const cy = Math.cos(S.yaw), sy = Math.sin(S.yaw), cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
    fwd = [sy * cp, sp, -cy * cp]; right = [cy, 0, sy]; up = [-sy * sp, cp, cy * sp];
    focal = (S.W / 2) / tanHalf;
  }
  const toCam = (p) => {
    const dx = p[0] - S.pos.x, dy = p[1] - S.pos.y, dz = p[2] - S.pos.z;
    return [dx * right[0] + dz * right[2], dx * up[0] + dy * up[1] + dz * up[2], dx * fwd[0] + dy * fwd[1] + dz * fwd[2]];
  };
  const proj = (c) => [S.W / 2 + (c[0] / c[2]) * focal, S.H / 2 - (c[1] / c[2]) * focal];
  function clipNear(poly) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ain = a[2] >= NEAR, bin = b[2] >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
    }
    return out;
  }

  // ---------- osvetlitev v zagonu ----------
  function dynLight(P, N, base) {
    const GN = S.gain * (S.lm == null ? 1 : S.lm); let r = base[0] * GN, gg = base[1] * GN, b = base[2] * GN;
    if (S.uv) { r = 0.16; gg = 0.07; b = 0.34; }
    const dx = P[0] - S.pos.x, dy = P[1] - S.pos.y, dz = P[2] - S.pos.z;
    const d = Math.hypot(dx, dy, dz) || 1e-6;
    if (S.flash || S.uv) {
      const cosA = (dx * fwd[0] + dy * fwd[1] + dz * fwd[2]) / d;
      const cone = smooth(0.80, 0.97, cosA);
      const facing = Math.max(0, -(N[0] * dx + N[1] * dy + N[2] * dz) / d) * 0.7 + 0.3;
      const fall = Math.pow(Math.max(0, 1 - d / 11), 1.5);
      const k = cone * fall * facing * 1.25;
      if (S.uv) { r += 0.35 * k; gg += 0.05 * k; b += 0.9 * k; } else { r += 1.0 * k; gg += 0.95 * k; b += 0.82 * k; }
    }
    return [r, gg, b];
  }
  const fogMix = (d) => clamp((d - 6) / 12, 0, 0.55);

  function colorStr(c, L, d) {
    const f = fogMix(d);
    const r = clamp(c[0] * L[0], 0, 255) * (1 - f) + 6 * f, gg = clamp(c[1] * L[1], 0, 255) * (1 - f) + 6 * f, b = clamp(c[2] * L[2], 0, 255) * (1 - f) + 9 * f;
    return `rgb(${r | 0},${gg | 0},${b | 0})`;
  }

  function polyPath(pts) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  }
  function drawPoly(camPts, fill) {
    const cl = clipNear(camPts); if (cl.length < 3) return null;
    const sp = cl.map(proj);
    // zunaj zaslona?
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const p of sp) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
    if (maxx < 0 || minx > S.W || maxy < 0 || miny > S.H) return null;
    polyPath(sp); g.fillStyle = fill; g.fill(); g.strokeStyle = fill; g.lineWidth = 0.8; g.stroke();
    return sp;
  }

  // ---------- predmeti ----------
  const stateOf = () => { S.state.uv = S.uv; return S.state; };
  const hiddenNow = (b) => (b.hide ? !!b.hide(stateOf()) : false);
  const offNow = (b) => (b.off ? b.off(stateOf()) : null);

  function boxBounds(b) {
    const o = offNow(b) || [0, 0, 0];
    return [[b.min[0] + o[0], b.min[1] + o[1], b.min[2] + o[2]], [b.max[0] + o[0], b.max[1] + o[1], b.max[2] + o[2]]];
  }
  const nearestDist2 = (a, c) => {
    const px = clamp(S.pos.x, a[0], c[0]), py = clamp(S.pos.y, a[1], c[1]), pz = clamp(S.pos.z, a[2], c[2]);
    return (px - S.pos.x) ** 2 + (py - S.pos.y) ** 2 + (pz - S.pos.z) ** 2;
  };

  function drawBox(b, a, c) {
    const ctr = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
    for (const F of b.faces) {
      if (b.noFaces && b.noFaces.includes(F.k)) continue;
      const corners = faceCorners(F.k, a, c);
      const fc = [(corners[0][0] + corners[2][0]) / 2, (corners[0][1] + corners[2][1]) / 2, (corners[0][2] + corners[2][2]) / 2];
      const vx = S.pos.x - fc[0], vy = S.pos.y - fc[1], vz = S.pos.z - fc[2];
      if (F.n[0] * vx + F.n[1] * vy + F.n[2] * vz <= 0 && !b.twoSided) continue;
      const cam = corners.map(toCam);
      const baseL = boxFaceLight(b, F, a, c);
      const d = Math.hypot(vx, vy, vz);
      let L = dynLight(fc, F.n, baseL);
      if (b.emissive) { const e = b.emissive; L = [L[0] + e, L[1] + e, L[2] + e]; }
      const lightness = (L[0] + L[1] + L[2]) / 3;
      let col = b.c;
      if (F.k === '+y' && b.top) col = hex(b.top);
      const fill = colorStr(col, L, d);
      const sp = drawPoly(cam, fill);
      if (!sp) continue;
      const dec = b.decals && b.decals[F.k];
      if (dec && cam.every((p) => p[2] >= NEAR)) drawDecal(dec, corners, sp, lightness, d);
    }
  }

  function drawDecal(dec, corners, sp, lightness, d) {
    if (dec.uv && !S.uv) return;
    if (d > (dec.range || 9)) return;
    const wcm = dist3(corners[0], corners[1]) * 100, hcm = dist3(corners[0], corners[3]) * 100;
    const [P0, P1, , P3] = sp;
    g.save();
    polyPath(sp); g.clip();
    g.transform((P1[0] - P0[0]) / wcm, (P1[1] - P0[1]) / wcm, (P3[0] - P0[0]) / hcm, (P3[1] - P0[1]) / hcm, P0[0], P0[1]);
    const light = S.uv ? (dec.uv ? 1.5 : 0.25) : lightness;
    try { dec.draw(g, { L: clamp(light, 0, 1.6), w: wcm, h: hcm, st: stateOf(), t: S.t, uv: S.uv, d }); } catch (_) { /* dekor ne sme zrušiti prikaza */ }
    g.restore();
  }

  // ---------- izris prizora ----------
  function frame() {
    setupCamera();
    g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    g.fillStyle = '#05060a'; g.fillRect(0, 0, S.W, S.H);
    // ploščice prostora (vse so zrcalno oddaljene; vrstni red ni pomemben, ker je prostor konveksen)
    for (const f of shell) {
      const vx = S.pos.x - f.ctr[0], vy = S.pos.y - f.ctr[1], vz = S.pos.z - f.ctr[2];
      if (f.n[0] * vx + f.n[1] * vy + f.n[2] * vz <= 0) continue;
      const d = Math.hypot(vx, vy, vz);
      const L = dynLight(f.ctr, f.n, f.light);
      drawPoly(f.pts.map(toCam), colorStr(f.c, L, d));
    }
    // predmeti: razvrstitev od daleč proti blizu; otroci (predmeti na drugem predmetu) takoj za osnovo
    const vis = [];
    for (const b of boxes) {
      if (hiddenNow(b) || b.ghost) continue;
      const [a, c] = boxBounds(b);
      b._a = a; b._c = c; b._d = nearestDist2(a, c) + (b.bias || 0);
      vis.push(b);
    }
    const roots = vis.filter((b) => !b.on);
    const list = roots.map((r) => ({ d: r._d, run() { drawBox(r, r._a, r._c); if (r.id) for (const ch of vis.filter((x) => x.on === r.id).sort((p, q) => q._d - p._d)) drawBox(ch, ch._a, ch._c); } }));
    for (const q of S.peers.values()) {
      const dx = q.x - S.pos.x, dz = q.z - S.pos.z; const fc = toCam([q.x, 0, q.z]); if (fc[2] < 0.35) continue;
      const hc = toCam([q.x, 1.78, q.z]); const f = proj(fc), hp = proj(hc); const hpx = f[1] - hp[1]; if (hpx < 4 || f[0] < -200 || f[0] > S.W + 200) continue;
      const L = dynLight([q.x, 1.0, q.z], [0, 0, 1], staticLight([q.x, 1.0, q.z], [0, 0, 1])); const light = clamp((L[0] + L[1] + L[2]) / 3 * 1.05 + 0.18, 0.4, 1.3);
      list.push({ d: dx * dx + dz * dz - 0.15, run() { drawAvatar2D(g, q.av, f[0], f[1], hpx, { t: S.t + q.phase, walk: q.walk, name: fc[2] < 14 ? q.name : null, light }); } });
    }
    for (const n of S.npcs) {
      const dx = n.x - S.pos.x, dz = n.z - S.pos.z; const fc = toCam([n.x, 0, n.z]); if (fc[2] < 0.35) continue;
      const hc = toCam([n.x, 1.78, n.z]); const f = proj(fc), hp = proj(hc); const hpx = f[1] - hp[1]; if (hpx < 3 || f[0] < -200 || f[0] > S.W + 200) continue;
      const L = dynLight([n.x, 1.0, n.z], [0, 0, 1], staticLight([n.x, 1.0, n.z], [0, 0, 1])); const light = clamp((L[0] + L[1] + L[2]) / 3 * 1.05 + 0.22, 0.4, 1.3);
      list.push({ d: dx * dx + dz * dz - 0.15, run() {
        drawAvatar2D(g, n.av, f[0], f[1], hpx, { t: S.t + (n.phase || 0), walk: n.walk ? 1 : 0, name: null, light });
        if (n.flash > 0) { const r = Math.max(3, hpx * 0.07); g.fillStyle = 'rgba(255,220,120,.95)'; g.beginPath(); g.arc(f[0] + hpx * 0.06, f[1] - hpx * 0.52, r * (1 + n.flash), 0, 7); g.fill(); }
        if (n.hurt > 0) { g.fillStyle = `rgba(255,30,30,${Math.min(0.6, n.hurt)})`; g.fillRect(f[0] - hpx * 0.14, f[1] - hpx * 0.95, hpx * 0.28, hpx * 0.8); }
      } });
    }
    if (S.ghost) { const q = S.ghost, dx = q.x - S.pos.x, dz = q.z - S.pos.z; const fc = toCam([q.x, 0, q.z]); if (fc[2] > 0.35) { const hc = toCam([q.x, 1.8, q.z]); const f = proj(fc), hp = proj(hc); const hpx = f[1] - hp[1]; if (hpx > 4) list.push({ d: dx * dx + dz * dz - 0.1, run() { drawGhost2D(g, f[0], f[1], hpx, { alpha: q.alpha, t: S.t }); } }); } }
    list.sort((p, q) => q.d - p.d);
    for (const it of list) it.run();
    // obris predmeta pod kazalcem
    if (S.hover && opts.outline !== false) drawOutline(S.hover);
    drawPost();
  }

  function drawOutline(objId) {
    const list = objBoxes.get(objId) || [];
    g.save(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,196,92,.95)'; g.shadowColor = 'rgba(255,170,60,.9)'; g.shadowBlur = 10;
    for (const b of list) {
      if (hiddenNow(b)) continue;
      const [a, c] = boxBounds(b);
      const P = [[a[0], a[1], a[2]], [c[0], a[1], a[2]], [c[0], a[1], c[2]], [a[0], a[1], c[2]], [a[0], c[1], a[2]], [c[0], c[1], a[2]], [c[0], c[1], c[2]], [a[0], c[1], c[2]]].map(toCam);
      const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      g.beginPath();
      for (const [i, j] of E) {
        let p = P[i], q = P[j];
        if (p[2] < NEAR && q[2] < NEAR) continue;
        if (p[2] < NEAR) { const t = (NEAR - p[2]) / (q[2] - p[2]); p = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, NEAR]; }
        if (q[2] < NEAR) { const t = (NEAR - q[2]) / (p[2] - q[2]); q = [q[0] + (p[0] - q[0]) * t, q[1] + (p[1] - q[1]) * t, NEAR]; }
        const a2 = proj(p), b2 = proj(q); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]);
      }
      g.stroke();
    }
    g.restore();
  }

  function drawPost() {
    // vinjeta + svetilka
    const grd = g.createRadialGradient(S.W / 2, S.H / 2, Math.min(S.W, S.H) * 0.28, S.W / 2, S.H / 2, Math.max(S.W, S.H) * 0.72);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, `rgba(0,0,0,${S.flash || S.uv ? 0.78 : 0.5})`);
    g.fillStyle = grd; g.fillRect(0, 0, S.W, S.H);
    if (S.uv) { g.fillStyle = 'rgba(90,40,200,.10)'; g.fillRect(0, 0, S.W, S.H); }
    if (opts.cross !== false) {
      g.strokeStyle = S.hover ? 'rgba(255,196,92,.95)' : 'rgba(255,255,255,.55)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(S.W / 2, S.H / 2, S.hover ? 6 : 3, 0, 7); g.stroke();
    }
  }

  // ---------- izbiranje ----------
  function rayFromScreen(sx, sy) {
    setupCamera();
    const nx = ((sx - S.W / 2) / (S.W / 2)) * tanHalf, ny = -((sy - S.H / 2) / (S.W / 2)) * tanHalf;
    let d = [fwd[0] + right[0] * nx + up[0] * ny, fwd[1] + right[1] * nx + up[1] * ny, fwd[2] + right[2] * nx + up[2] * ny];
    const l = Math.hypot(d[0], d[1], d[2]); d = [d[0] / l, d[1] / l, d[2] / l];
    return { o: [S.pos.x, S.pos.y, S.pos.z], d };
  }
  function rayBox(o, d, a, c) {
    let tmin = 0, tmax = 1e9;
    for (let k = 0; k < 3; k++) {
      if (Math.abs(d[k]) < 1e-9) { if (o[k] < a[k] || o[k] > c[k]) return null; continue; }
      let t1 = (a[k] - o[k]) / d[k], t2 = (c[k] - o[k]) / d[k]; if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null;
    }
    return tmin;
  }
  function pick(sx, sy) {
    const { o, d } = rayFromScreen(sx, sy);
    let best = null, bd = 1e9, bestG = null, bdG = 1e9;
    for (const b of boxes) {
      if (hiddenNow(b) || b.noPick) continue;
      const [a, c] = boxBounds(b);
      const t = rayBox(o, d, a, c); if (t === null) continue;
      if (b.ghost) { if (t < bdG) { bdG = t; bestG = b; } } else if (t < bd) { bd = t; best = b; }
    }
    const hit = best && best.obj ? { b: best, t: bd } : (bestG && bestG.obj ? { b: bestG, t: bdG } : null);
    if (!hit || hit.t > 12) return null;
    return { obj: hit.b.obj, dist: hit.t };
  }

  // ---------- gibanje in trki ----------
  const solids = () => boxes.filter((b) => b.solid !== false && !hiddenNow(b) && !b.noCollide);
  function collide(nx, nz) {
    const lim = 0.30;
    nx = clamp(nx, x0 + lim, x1 - lim); nz = clamp(nz, z0 + lim, z1 - lim);
    for (let it = 0; it < 3; it++) {
      for (const b of solids()) {
        const [a, c] = boxBounds(b);
        if (a[1] > 1.55 || c[1] < 0.15) continue; // previsoko ali preniso: ne ovira
        const px = clamp(nx, a[0], c[0]), pz = clamp(nz, a[2], c[2]);
        const dx = nx - px, dz = nz - pz, d2 = dx * dx + dz * dz;
        if (d2 < RADIUS * RADIUS) {
          if (d2 < 1e-8) { // sredina škatle: potisni ven po najkrajši osi
            const l = nx - a[0], r = c[0] - nx, t = nz - a[2], bt = c[2] - nz; const m = Math.min(l, r, t, bt);
            if (m === l) nx = a[0] - RADIUS; else if (m === r) nx = c[0] + RADIUS; else if (m === t) nz = a[2] - RADIUS; else nz = c[2] + RADIUS;
          } else { const d = Math.sqrt(d2); nx = px + (dx / d) * RADIUS; nz = pz + (dz / d) * RADIUS; }
        }
      }
    }
    return [clamp(nx, x0 + lim, x1 - lim), clamp(nz, z0 + lim, z1 - lim)];
  }

  function update(dt) {
    S.t += dt;
    if (S.fps) { const hp = pick(S.W / 2, S.H / 2); S.hover = hp ? hp.obj : null; S.hoverDist = hp ? hp.dist : 0; }
    const turn = ((S.keys.has('ArrowLeft') || S.keys.has('KeyQ') ? -1 : 0) + (S.keys.has('ArrowRight') || S.keys.has('KeyE') ? 1 : 0) + S.pad.r) * 1.9 * dt;
    S.yaw += turn;
    const f = (S.keys.has('KeyW') || S.keys.has('ArrowUp') ? 1 : 0) - (S.keys.has('KeyS') || S.keys.has('ArrowDown') ? 1 : 0) + S.pad.f;
    const s = (S.keys.has('KeyD') ? 1 : 0) - (S.keys.has('KeyA') ? 1 : 0) + S.pad.s;
    let mx = 0, mz = 0;
    if (f || s) {
      const fl = clamp(f, -1, 1), sl = clamp(s, -1, 1); const sp = (S.keys.has('ShiftLeft') ? 4.2 : 2.5) * (S.speedMul || 1) * dt;
      const fx = Math.sin(S.yaw), fz = -Math.cos(S.yaw), rx = Math.cos(S.yaw), rz = Math.sin(S.yaw);
      mx = (fx * fl + rx * sl) * sp; mz = (fz * fl + rz * sl) * sp;
      S.auto = null;
    }
    if (S.auto) {
      const dx = S.auto.x - S.pos.x, dz = S.auto.z - S.pos.z, d = Math.hypot(dx, dz);
      const want = Math.atan2(S.auto.lx - S.pos.x, -(S.auto.lz - S.pos.z));
      let dy = want - S.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      S.yaw += clamp(dy, -4 * dt, 4 * dt);
      if (d < 0.08) { const cb = S.auto.cb; S.auto = null; if (cb) cb(); } else { const sp = Math.min(d, 3.0 * dt); mx = (dx / d) * sp; mz = (dz / d) * sp; S.auto.stuck = (S.auto.stuck || 0) + dt; if (S.auto.stuck > 4) { const cb = S.auto.cb; S.auto = null; if (cb) cb(); } }
    }
    if (mx || mz) { const [nx, nz] = collide(S.pos.x + mx, S.pos.z + mz); S.pos.x = nx; S.pos.z = nz; }
    S.pitch = clamp(S.pitch, -1.0, 1.0);
    for (const q of S.peers.values()) {
      const dx = q.tx - q.x, dz = q.tz - q.z, d = Math.hypot(dx, dz), k = Math.min(1, dt * 2.6);
      q.x += dx * k; q.z += dz * k; q.walk = d > 0.06 ? 1 : 0; if (q.walk) q.phase += dt * 0.5;
    }
  }

  // ---------- vhodi ----------
  const onKey = (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (S.fps && (e.code === 'KeyQ' || e.code === 'KeyE')) { if (e.type === 'keydown' && e.code === 'KeyE' && opts.onUse) opts.onUse(); return; }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft'].includes(e.code)) { if (e.type === 'keydown') S.keys.add(e.code); else S.keys.delete(e.code); if (e.code.startsWith('Arrow')) e.preventDefault(); }
    if (e.type === 'keydown') { if (e.code === 'KeyF' && opts.onFlash) opts.onFlash(); if (e.code === 'KeyU' && opts.onUv) opts.onUv(); if ((e.code === 'Space' || e.code === 'Enter') && !S.fps) { if (S.hover && opts.onInteract) { e.preventDefault(); opts.onInteract(S.hover); } } }
  };
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
  const blur = () => S.keys.clear(); window.addEventListener('blur', blur);

  let drag = null;
  const rel = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * (S.W / r.width), (e.clientY - r.top) * (S.H / r.height)]; };
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); const [x, y] = rel(e); drag = { x, y, sx: x, sy: y, moved: 0, id: e.pointerId }; });
  canvas.addEventListener('pointermove', (e) => {
    const [x, y] = rel(e);
    if (drag && drag.id === e.pointerId) {
      const dx = x - drag.x, dy = y - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = x; drag.y = y;
      if (drag.moved > 6 && !S.fps) { S.yaw += dx * 0.0042 * (72 / 72); S.pitch = clamp(S.pitch - dy * 0.0035, -1, 1); S.auto = null; }
    }
    if (!drag || e.pointerType === 'mouse') { const p = pick(x, y); S.hover = p ? p.obj : null; S.hoverDist = p ? p.dist : 0; canvas.style.cursor = S.hover ? 'pointer' : (drag ? 'grabbing' : 'grab'); }
  });
  const end = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const wasTap = drag.moved <= 6; const [x, y] = rel(e); drag = null;
    if (wasTap && !S.fps) { const p = pick(x, y); S.hover = p ? p.obj : null; if (p && opts.onInteract) opts.onInteract(p.obj); }
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => { if (!drag) S.hover = null; });

  // ---------- velikost in zanka ----------
  function resize() {
    const r = canvas.getBoundingClientRect();
    S.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    S.W = Math.max(320, Math.round(r.width)); S.H = Math.max(240, Math.round(r.height));
    canvas.width = Math.round(S.W * S.dpr); canvas.height = Math.round(S.H * S.dpr);
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; if (ro) ro.observe(canvas); window.addEventListener('resize', resize);
  resize();
  function loop(now) {
    if (!S.running) return;
    const dt = Math.min(0.05, (now - S.last) / 1000); S.last = now;
    update(dt);
    if (canvas.isConnected) { try { frame(); } catch (e) { console.error('Napaka prikaza', e); } }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return {
    S,
    setState(st) { S.state = st; },
    setPeers(list) {
      const seen = new Set();
      for (const p of list) { seen.add(p.uid); let q = S.peers.get(p.uid); if (!q) { q = { x: p.x, z: p.z, tx: p.x, tz: p.z, phase: Math.random() * 6, walk: 0 }; S.peers.set(p.uid, q); } q.tx = p.x; q.tz = p.z; q.yaw = p.yaw; q.name = p.name; q.av = p.av; }
      for (const k of [...S.peers.keys()]) if (!seen.has(k)) S.peers.delete(k);
    },
    setGain(v) { S.gain = v; },
    setFps(on) { S.fps = !!on; if (on) S.auto = null; },
    setNpcs(list) { S.npcs = list || []; },
    setSpeed(v) { S.speedMul = v; },
    setLightMul(v) { S.lm = v; },
    setGhost(gh) { S.ghost = gh || null; },
    setFlash(on) { S.flash = !!on; if (on) S.uv = false; },
    setUv(on) { S.uv = !!on; if (on) S.flash = false; },
    look(yaw, pitch) { S.yaw = yaw; S.pitch = pitch || 0; },
    pad(f, s, r) { S.pad.f = f; S.pad.s = s; S.pad.r = r; },
    hoverObj: () => S.hover,
    distanceTo(objId) {
      const list = objBoxes.get(objId) || []; let best = 1e9;
      for (const b of list) { if (hiddenNow(b)) continue; const [a, c] = boxBounds(b); best = Math.min(best, Math.sqrt(nearestDist2(a, c))); }
      return best;
    },
    walkTo(objId, cb) {
      const list = (objBoxes.get(objId) || []).filter((b) => !hiddenNow(b)); if (!list.length) { if (cb) cb(); return; }
      let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9, my = 0, n = 0;
      for (const b of list) { const [a, c] = boxBounds(b); mnx = Math.min(mnx, a[0]); mxx = Math.max(mxx, c[0]); mnz = Math.min(mnz, a[2]); mxz = Math.max(mxz, c[2]); my += (a[1] + c[1]) / 2; n++; }
      const cx = (mnx + mxx) / 2, cz = (mnz + mxz) / 2;
      // stojišče: točka na premici od predmeta proti igralcu, ~1.5 m od roba predmeta (poskusimo več razdalj)
      let dx = S.pos.x - cx, dz = S.pos.z - cz; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const half = Math.max(mxx - mnx, mxz - mnz) / 2;
      let tx = S.pos.x, tz = S.pos.z, ok = false;
      for (const extra of [1.3, 1.6, 2.0, 2.5]) {
        const px = cx + dx * (half + extra), pz = cz + dz * (half + extra); const [qx, qz] = collide(px, pz);
        if (Math.hypot(qx - px, qz - pz) < 0.05) { tx = qx; tz = qz; ok = true; break; }
        tx = qx; tz = qz;
      }
      S.auto = { x: tx, z: tz, lx: cx, lz: cz, cb };
      S.pitch = 0; void ok; void my;
    },
    cancelAuto() { S.auto = null; },
    destroy() {
      S.running = false; window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', blur);
      window.removeEventListener('resize', resize); if (ro) ro.disconnect();
    },
    // za testiranje
    _debug: { frame, pick, S },
  };
}
