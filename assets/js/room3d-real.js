// Realistični prikaz sobe (three.js): fizikalni materiali, mehke sence, procedurne teksture, svetloba kamina in svetilke.
// Knjižnica se naloži šele, ko igralec izbere »realistično«. Če nalaganje ne uspe, igra ostane na lahki različici.
import { buildAvatar3D, buildGhost3D } from './room3d-avatar.js';

const CDNS = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js',
  'https://unpkg.com/three@0.160.0/build/three.module.min.js',
];
let THREE_PROMISE = null;
export function loadThree() {
  if (THREE_PROMISE) return THREE_PROMISE;
  THREE_PROMISE = (async () => {
    let lastErr = null;
    for (const url of CDNS) {
      try {
        return await Promise.race([import(url), new Promise((_, rej) => setTimeout(() => rej(new Error('časovna omejitev')), 15000))]);
      } catch (e) { lastErr = e; }
    }
    THREE_PROMISE = null;
    throw new Error('Knjižnice za 3D ni mogoče naložiti (' + (lastErr && lastErr.message ? lastErr.message : 'brez povezave') + ').');
  })();
  return THREE_PROMISE;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

export async function createRealEngine(canvas, scene, opts = {}) {
  const T = await loadThree();
  const S = {
    pos: { x: scene.spawn.x, y: 1.62, z: scene.spawn.z }, yaw: scene.spawn.yaw || 0, pitch: 0,
    fps: false, speedMul: 1, flash: false, uv: false, gain: 1, hover: null, state: {}, auto: null, t: 0, keys: new Set(), pad: { f: 0, s: 0, r: 0 }, running: true, W: 800, H: 500,
  };
  if (opts.start) { S.pos.x = opts.start.x; S.pos.z = opts.start.z; S.yaw = opts.start.yaw; S.pitch = opts.start.pitch || 0; }

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.4;
  renderer.outputColorSpace = T.SRGBColorSpace;

  const sc = new T.Scene();
  sc.background = new T.Color(0x07080c);
  sc.fog = new T.FogExp2(0x0b0b12, 0.028);
  const camera = new T.PerspectiveCamera(60, 1.6, 0.05, 40);
  camera.rotation.order = 'YXZ'; sc.add(camera);

  // ---------- procedurne teksture ----------
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const toTex = (c, rx = 1, ry = 1, srgb = true) => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; };
  function grain(c, base, dark, light, seed, vertical) {
    const g = c.getContext('2d'), w = c.width, h = c.height, r = rnd(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < h * 0.9; i++) {
      const y = r() * h, a = 0.05 + r() * 0.16, th = 0.4 + r() * 1.6; g.fillStyle = r() > 0.5 ? dark : light; g.globalAlpha = a;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 24) g.lineTo(x, y + Math.sin(x * 0.015 + i) * 1.6 + (r() - 0.5) * 0.8);
      g.lineTo(w, y + th); g.lineTo(0, y + th); g.fill();
    }
    g.globalAlpha = 1;
    if (vertical) { const t = mkCanvas(h, w); const tg = t.getContext('2d'); tg.translate(h / 2, w / 2); tg.rotate(Math.PI / 2); tg.drawImage(c, -w / 2, -h / 2); return t; }
    return c;
  }
  const woodMap = (() => { const c = mkCanvas(512, 512); grain(c, '#b08a5c', '#3a2410', '#d8b888', 11); return toTex(c); })();
  const floorMap = (() => {
    const c = mkCanvas(1024, 1024), g = c.getContext('2d'), r = rnd(5); const pw = 128;
    for (let i = 0; i < 8; i++) {
      const tile = mkCanvas(pw, 1024); const tone = 0.78 + r() * 0.3; grain(tile, `rgb(${150 * tone | 0},${104 * tone | 0},${64 * tone | 0})`, '#2a1608', '#d9b080', 40 + i, false);
      const tg = tile.getContext('2d'); tg.fillStyle = 'rgba(0,0,0,.55)'; tg.fillRect(0, 0, 2, 1024); tg.fillRect(0, (r() * 900) | 0, pw, 2);
      g.drawImage(tile, i * pw, 0);
    }
    return toTex(c, scene.room.w / 2.67, scene.room.d / 2.67);
  })();
  const wallMap = (() => {
    const c = mkCanvas(256, 256), g = c.getContext('2d'); g.fillStyle = '#7a3a3e'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,220,200,.06)'; for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 32, 256);
    g.strokeStyle = 'rgba(230,190,150,.16)'; g.lineWidth = 2;
    for (let y = 0; y < 256; y += 128) for (let x = 0; x < 256; x += 128) { g.beginPath(); g.moveTo(x + 64, y + 14); g.quadraticCurveTo(x + 96, y + 44, x + 64, y + 74); g.quadraticCurveTo(x + 32, y + 44, x + 64, y + 14); g.moveTo(x + 64, y + 74); g.lineTo(x + 64, y + 118); g.stroke(); }
    const r = rnd(9); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
    return toTex(c, 4, 2.2);
  })();
  const plasterMap = (() => { const c = mkCanvas(256, 256), g = c.getContext('2d'), r = rnd(3); g.fillStyle = '#cfc7b6'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 2, 2); } return toTex(c, 3, 3); })();
  const leatherMap = (() => { const c = mkCanvas(256, 256), g = c.getContext('2d'), r = rnd(21); g.fillStyle = '#9a4a4c'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.beginPath(); g.arc(r() * 256, r() * 256, 1 + r() * 2, 0, 7); g.fill(); } g.strokeStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.moveTo(r() * 256, r() * 256); g.lineTo(r() * 256, r() * 256); g.stroke(); } return toTex(c, 1, 1); })();
  const rugMap = (() => {
    const c = mkCanvas(512, 160), g = c.getContext('2d'), r = rnd(4); g.fillStyle = '#7a2a2c'; g.fillRect(0, 0, 512, 160);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,200,170' : '0,0,0'},${r() * 0.09})`; g.fillRect(r() * 512, r() * 160, 2, 1); }
    g.strokeStyle = '#d9b77a'; g.lineWidth = 4; g.strokeRect(14, 14, 484, 132); g.lineWidth = 2; g.strokeRect(28, 28, 456, 104);
    g.fillStyle = '#1f3a52'; g.beginPath(); g.moveTo(256, 36); g.lineTo(330, 80); g.lineTo(256, 124); g.lineTo(182, 80); g.closePath(); g.fill(); g.strokeStyle = '#d9b77a'; g.stroke();
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#d9b77a' : '#2a4a38'; g.beginPath(); g.arc(60 + k * 22, 80, 8, 0, 7); g.arc(452 - k * 22, 80, 8, 0, 7); g.fill(); }
    return toTex(c, 1, 1);
  })();
  const panelMap = (() => { const c = mkCanvas(256, 256), g = c.getContext('2d'); grain(c, '#4a2f1d', '#1a0e06', '#8a6038', 31); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 5; g.strokeRect(14, 24, 228, 208); g.strokeStyle = 'rgba(255,220,170,.18)'; g.lineWidth = 2; g.strokeRect(20, 30, 216, 196); return toTex(c, 5, 1); })();

  // ---------- materiali ----------
  const cat = (b) => {
    const id = b.id || '';
    if (/^(decanter|glass)/.test(id)) return 'glass';
    if (/^(arm_|sofa)/.test(id)) return 'leather';
    if (/^(fp$|fp_breast)/.test(id)) return 'stone';
    if (/^(lamp_b|lamp_s|det|door_knob)/.test(id)) return 'metal';
    if (/^(desk|ctable|cons|books|door|door_f|cab|clock|chair|stable|basket|chess_t|globe_s|fp_mantel|ladder|wcase|bar|paint|photos|cal|card|rod|safe)/.test(id)) return 'wood';
    if (/^rug/.test(id)) return 'rug';
    return 'paint';
  };
  function baseMaterial(b, face) {
    const color = new T.Color(face === '+y' && b.top ? b.top : b.color);
    const k = cat(b);
    if (k === 'glass') return new T.MeshPhysicalMaterial({ color: color.clone().lerp(new T.Color(0xffffff), 0.5), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.42, clearcoat: 1, ior: 1.5 });
    if (k === 'wood') return new T.MeshStandardMaterial({ color: color.clone().multiplyScalar(1.15), map: woodMap, roughness: 0.5, metalness: 0.04 });
    if (k === 'leather') return new T.MeshStandardMaterial({ color: color.clone().lerp(new T.Color(0xffffff), 0.35), map: leatherMap, roughness: 0.55, metalness: 0.02 });
    if (k === 'stone') return new T.MeshStandardMaterial({ color, map: plasterMap, roughness: 0.9 });
    if (k === 'metal') return new T.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.85 });
    if (k === 'rug') return new T.MeshStandardMaterial({ color: 0xffffff, map: rugMap, roughness: 1 });
    return new T.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.02, emissive: b.emissive ? color : 0x000000, emissiveIntensity: b.emissive ? Math.min(1.2, b.emissive * 2) : 0 });
  }

  // ---------- škatle iz opisa prizorišča ----------
  const FACE_KEYS = ['+x', '-x', '+y', '-y', '+z', '-z'];
  const meshes = []; const objMeshes = new Map(); const decals = [];
  const pickables = [];
  const SWAP = new Set(['lamp_b', 'lamp_s', 'decanter', 'glass1', 'glass2', 'globe_b', 'curt1', 'curt2']); // zamenjani z zaobljenimi modeli
  for (const b of scene.boxes) {
    const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
    const geo = new T.BoxGeometry(sx, sy, sz);
    const mats = FACE_KEYS.map((k) => {
      const dec = b.decals && b.decals[k];
      if (b.ghost || SWAP.has(b.id)) return new T.MeshBasicMaterial({ visible: false });
      if (dec) {
        const w = (k === '+x' || k === '-x' ? sz : sx) * 100, h = (k === '+y' || k === '-y' ? sz : sy) * 100;
        const s = Math.min(3, 1024 / Math.max(w, h)); const cv = mkCanvas(Math.max(8, Math.round(w * s)), Math.max(8, Math.round(h * s)));
        const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
        const base = baseMaterial(b, k);
        const lit = !!(b.emissive) || !!dec.uv;
        const m = lit ? new T.MeshBasicMaterial({ map: tex, transparent: !!dec.uv }) : new T.MeshStandardMaterial({ map: tex, roughness: base.roughness == null ? 0.6 : base.roughness, metalness: base.metalness || 0.03 });
        decals.push({ b, k, dec, cv, tex, w, h, s, m, anim: !!dec.anim });
        return m;
      }
      return baseMaterial(b, k);
    });
    const mesh = new T.Mesh(geo, mats);
    mesh.position.set((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
    const k = cat(b);
    mesh.castShadow = !b.ghost && !SWAP.has(b.id) && k !== 'glass' && !/^(lamp_|rug|win|curt|card|det|paint|photos|cal|fp_uv)/.test(b.id || '') && sy > 0.03;
    mesh.receiveShadow = !b.ghost;
    mesh.userData = { b, base: mesh.position.clone() };
    sc.add(mesh); meshes.push(mesh);
    if (b.obj) { if (!objMeshes.has(b.obj)) objMeshes.set(b.obj, []); objMeshes.get(b.obj).push(mesh); }
    if (!b.noPick) pickables.push(mesh);
  }

  // dodatne podrobnosti za realizem (nepremične, brez interakcije)
  const R = scene.room; const x0 = -R.w / 2, x1 = R.w / 2, z0 = -R.d / 2, z1 = R.d / 2, RH = R.h, WH = 1.05;
  const std = (o) => new T.MeshStandardMaterial(o);
  const add = (geo, mat, x, y, z, shadow = false, ry = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = shadow; m.receiveShadow = true; sc.add(m); return m; };
  // tla, strop
  const floorMat = std({ map: floorMap, roughness: 0.42, metalness: 0.05 });
  const fl = add(new T.PlaneGeometry(R.w, R.d), floorMat, 0, 0, 0); fl.rotation.x = -Math.PI / 2;
  const ce = add(new T.PlaneGeometry(R.w, R.d), std({ map: plasterMap, roughness: 0.95 }), 0, RH, 0); ce.rotation.x = Math.PI / 2;
  // stene (tapeta + lamperija)
  const wallMat = std({ map: wallMap, roughness: 0.85 }); const panelMat = std({ map: panelMap, roughness: 0.55, metalness: 0.03 });
  const mouldMat = std({ color: 0x3b2418, roughness: 0.45, metalness: 0.05, map: woodMap });
  const wallDefs = [[0, 0, z0, 0, R.w], [0, 0, z1, Math.PI, R.w], [x1, 0, 0, -Math.PI / 2, R.d], [x0, 0, 0, Math.PI / 2, R.d]];
  for (const [x, , z, ry, len] of wallDefs) {
    const up = add(new T.PlaneGeometry(len, RH - WH), wallMat.clone(), x, WH + (RH - WH) / 2, z, false, ry); up.material.map = wallMap.clone(); up.material.map.repeat.set(len / 2, 1.4); up.material.map.needsUpdate = true;
    const lo = add(new T.PlaneGeometry(len, WH), panelMat.clone(), x, WH / 2, z, false, ry); lo.material.map = panelMap.clone(); lo.material.map.repeat.set(len / 0.9, 1); lo.material.map.needsUpdate = true;
    const nx = Math.sin(-ry) * 0, nz = 0; void nx; void nz;
    const dir = ry === 0 ? [0, 1] : ry === Math.PI ? [0, -1] : ry === -Math.PI / 2 ? [-1, 0] : [1, 0];
    const along = dir[0] === 0 ? [1, 0] : [0, 1];
    const mk = (w, h, d, yy, off) => { const m = add(new T.BoxGeometry(along[0] ? w : d, h, along[1] ? w : d), mouldMat, x + dir[0] * off, yy, z + dir[1] * off, true); return m; };
    mk(len, 0.14, 0.03, 0.07, 0.016); mk(len, 0.05, 0.05, WH, 0.025); mk(len, 0.12, 0.07, RH - 0.06, 0.036);
  }
  const dustN = 160;
  const IS2 = !scene.kind; // dekor Primera 002 (svetilka, globus, zavese ...) samo tam
  if (IS2) {
  // stropna rozeta
  add(new T.CylinderGeometry(0.45, 0.5, 0.05, 40), std({ color: 0xe8e0d0, roughness: 0.8 }), 0, RH - 0.025, 0);
  const lampShade = add(new T.CylinderGeometry(0.12, 0.28, 0.2, 28, 1, true), std({ color: 0xf2e2c0, roughness: 0.8, side: T.DoubleSide, emissive: 0xffd9a0, emissiveIntensity: 0.9 }), 0, RH - 0.45, 0);
  add(new T.CylinderGeometry(0.012, 0.012, 0.35, 8), std({ color: 0x222222 }), 0, RH - 0.18, 0);
  }
  // namizna svetilka (zaobljeno stojalo) namesto škatel
  const brass = std({ color: 0xc9a24a, roughness: 0.25, metalness: 0.9 });
  const lathe = (pts, mat, x, y, z) => { const g = new T.LatheGeometry(pts.map((p) => new T.Vector2(p[0], p[1])), 28); const m = add(g, mat, x, y, z, false); return m; };
  const BX = (id) => scene.boxes.find((q) => q.id === id) || { min: [0, 0, 0], max: [0, 0, 0] };
  const cen = (id) => { const q = BX(id); return [(q.min[0] + q.max[0]) / 2, (q.min[1] + q.max[1]) / 2, (q.min[2] + q.max[2]) / 2, q.min[1]]; };
  const LT = (n) => (scene.lights || []).find((l) => l.name === n);
  if (IS2) {
  lathe([[0, 0], [0.11, 0], [0.11, 0.015], [0.03, 0.04], [0.02, 0.2], [0.035, 0.24], [0, 0.245]], brass, 2.17, 0.82, 0.42);
  // karafa in kozarci (zaobljeni)
  const glassMat = new T.MeshPhysicalMaterial({ color: 0xcfe6ee, roughness: 0.03, transparent: true, opacity: 0.4, clearcoat: 1 });
  const whisky = std({ color: 0xb4621c, roughness: 0.2, transparent: true, opacity: 0.75 });
  { const c = cen('decanter'); lathe([[0, 0], [0.065, 0], [0.075, 0.05], [0.06, 0.17], [0.025, 0.24], [0.03, 0.3], [0.02, 0.31]], glassMat, c[0], c[3], c[2]);
    lathe([[0, 0], [0.056, 0.001], [0.066, 0.045], [0.04, 0.17], [0.02, 0.2]], whisky, c[0], c[3] + 0.001, c[2]); }
  for (const id of ['glass1', 'glass2']) { const c = cen(id); lathe([[0, 0], [0.03, 0], [0.034, 0.05], [0.04, 0.1]], glassMat, c[0], c[3], c[2]); }
  // globus
  const gc = cen('globe_b');
  add(new T.SphereGeometry(0.17, 32, 24), std({ color: 0x3f6f95, roughness: 0.45 }), gc[0], gc[1], gc[2], true);
  add(new T.TorusGeometry(0.19, 0.008, 8, 40), brass, gc[0], gc[1], gc[2], false).rotation.set(0.4, 0.6, 0);
  // zavese z gubami
  const curtMat = std({ color: 0x7a1f2b, roughness: 0.9 });
  for (const cid of ['curt1', 'curt2']) {
    const cc = cen(cid);
    const g = new T.PlaneGeometry(0.5, 2.75, 24, 1); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 34) * 0.045);
    g.computeVertexNormals(); const m = add(g, curtMat, cc[0] + 0.1, cc[1], cc[2], true, Math.PI / 2); m.material.side = T.DoubleSide;
  }
  // prah v žarku svetilke
  const dustGeo = new T.BufferGeometry(), dp = new Float32Array(dustN * 3), dr = rnd(91);
  for (let i = 0; i < dustN; i++) { dp[i * 3] = -0.5 + dr() * 4; dp[i * 3 + 1] = 0.6 + dr() * 2.2; dp[i * 3 + 2] = -2 + dr() * 3.5; }
  dustGeo.setAttribute('position', new T.BufferAttribute(dp, 3));
  var dustMesh = new T.Points(dustGeo, new T.PointsMaterial({ color: 0xffe6b8, size: 0.012, transparent: true, opacity: 0.5, depthWrite: false })); sc.add(dustMesh);
  }
  const dust = typeof dustMesh !== 'undefined' ? dustMesh : { geometry: { attributes: { position: { array: new Float32Array(3), needsUpdate: false } } } };

  // ---------- luči ----------
  const lamps2 = [];
  const HOR = !!scene.kind; // vsi novejši prizori (grozljivka, postaja, cesta, skladišče) imajo lastne luči
  const HEMI0 = { horror: 0.22, station: 0.5, road: 0.32, warehouse: 0.42 }[scene.kind] || 0.22;
  const hemi = new T.HemisphereLight(0x7f8fbe, 0x4a3020, HOR ? HEMI0 : 0.8); sc.add(hemi);
  const lamp = new T.PointLight(0xffc27a, 7.5, 0, 2); lamp.position.set(...(LT('desk') ? [LT('desk').pos[0], LT('desk').pos[1] - 0.07, LT('desk').pos[2]] : [2.17, 1.18, 0.42])); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; lamp.shadow.radius = 4; sc.add(lamp);
  const fire = new T.PointLight(0xff7a2a, 8, 0, 2); fire.position.set(...(LT('fire') ? [LT('fire').pos[0], LT('fire').pos[1] - 0.15, LT('fire').pos[2] + 0.35] : [0, 0.55, -2.25])); sc.add(fire);
  const ceil = new T.PointLight(0xffe2b0, 9, 0, 2); ceil.position.set(0, RH - 0.5, 0); ceil.castShadow = true; ceil.shadow.mapSize.set(512, 512); ceil.shadow.bias = -0.003; sc.add(ceil);
  const moon = new T.DirectionalLight(0x8aa6ff, 1.4); { const mp = LT('moon') ? LT('moon').pos : [-4.9, 2, 0]; const v = [mp[0], mp[1] - 0.8, mp[2]]; const l = Math.hypot(...v) || 1; moon.position.set(v[0] / l * 14, 0.8 + v[1] / l * 14 + 2, v[2] / l * 14); } moon.target.position.set(0, 0.8, 0); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -8; moon.shadow.camera.right = 8; moon.shadow.camera.top = 7; moon.shadow.camera.bottom = -7; moon.shadow.camera.far = 30; sc.add(moon); sc.add(moon.target);
  for (const n of ['ceil2', 'ceil3', 'ceil4']) { const L = LT(n); if (L) { const pl = new T.PointLight(n === 'floor' ? 0xffc88a : 0xffe2b0, n === 'floor' ? 4 : 5, 0, 2); pl.position.set(...L.pos); sc.add(pl); lamps2.push([pl, n === 'floor' ? 4 : 5]); } }
  const spot = new T.SpotLight(0xfff0d8, 0, 16, 0.5, 0.65, 1.5); spot.position.set(0, 0, 0); spot.target.position.set(0, 0, -1); camera.add(spot); camera.add(spot.target);
  const horLights = [];
  if (HOR) { for (const L of (scene.lights || [])) { const pl = new T.PointLight(new T.Color(L.color[0], L.color[1], L.color[2]), 0, 0, 2); pl.position.set(...L.pos); sc.add(pl); horLights.push([pl, L.intensity * (scene.kind === 'horror' ? 9 : 14), L.name]); } }
  const uvLight = new T.SpotLight(0x8a4cff, 0, 14, 0.55, 0.5, 1.2); camera.add(uvLight); uvLight.target.position.set(0, 0, -1); camera.add(uvLight.target);

  // ---------- dekorji: posodobitev tekstur ----------
  let lastDecalKey = '', lastAnim = 0;
  function renderDecal(d) {
    const g = d.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, d.cv.width, d.cv.height);
    g.save(); g.scale(d.s, d.s);
    const k = cat(d.b); const col = d.k === '+y' && d.b.top ? d.b.top : d.b.color;
    if (!(d.dec.uv)) { g.fillStyle = k === 'wood' ? shadeHex(col, 1.05) : col; g.fillRect(0, 0, d.w, d.h); }
    if (!(d.dec.uv && !S.uv)) { try { d.dec.draw(g, { L: S.uv && !d.dec.uv ? 0.35 : 1.0, w: d.w, h: d.h, st: stateOf(), t: S.t, uv: S.uv, d: 0 }); } catch (_) { /* dekor ne sme zrušiti prikaza */ } }
    g.restore(); d.tex.needsUpdate = true;
  }
  const shadeHex = (h, f) => { const n = parseInt(h.slice(1), 16); return `rgb(${Math.min(255, ((n >> 16) & 255) * f) | 0},${Math.min(255, ((n >> 8) & 255) * f) | 0},${Math.min(255, (n & 255) * f) | 0})`; };
  const stateOf = () => { S.state.uv = S.uv; return S.state; };
  const hidden = (b) => (b.hide ? !!b.hide(stateOf()) : false);
  function refreshDecals(force) {
    const st = stateOf(); const key = JSON.stringify([st.items, st.solved, st.revealed, S.uv]);
    const animNow = S.t - lastAnim > 0.2;
    if (key !== lastDecalKey || force) { lastDecalKey = key; for (const d of decals) renderDecal(d); lastAnim = S.t; } else if (animNow) { lastAnim = S.t; for (const d of decals) if (d.b.id === 'fp' || d.b.id === 'door' || d.b.id === 'radio' || d.b.id === 'lap_scr') renderDecal(d); }
  }

  // ---------- trki, gibanje ----------
  const bounds = (m) => { const b = m.userData.b; const o = b.off ? b.off(stateOf()) || [0, 0, 0] : [0, 0, 0]; return [[b.min[0] + o[0], b.min[1] + o[1], b.min[2] + o[2]], [b.max[0] + o[0], b.max[1] + o[1], b.max[2] + o[2]]]; };
  const RADIUS = 0.26;
  function collide(nx, nz) {
    const lim = 0.3; nx = clamp(nx, x0 + lim, x1 - lim); nz = clamp(nz, z0 + lim, z1 - lim);
    for (let it = 0; it < 3; it++) for (const m of meshes) {
      const b = m.userData.b; if (b.solid === false || b.noCollide || hidden(b)) continue;
      const [a, c] = bounds(m);
      if (a[1] > 1.55 || c[1] < 0.15) continue;
      const px = clamp(nx, a[0], c[0]), pz = clamp(nz, a[2], c[2]); const dx = nx - px, dz = nz - pz, d2 = dx * dx + dz * dz;
      if (d2 < RADIUS * RADIUS) {
        if (d2 < 1e-8) { const l = nx - a[0], r = c[0] - nx, t = nz - a[2], bt = c[2] - nz; const mm = Math.min(l, r, t, bt); if (mm === l) nx = a[0] - RADIUS; else if (mm === r) nx = c[0] + RADIUS; else if (mm === t) nz = a[2] - RADIUS; else nz = c[2] + RADIUS; }
        else { const d = Math.sqrt(d2); nx = px + (dx / d) * RADIUS; nz = pz + (dz / d) * RADIUS; }
      }
    }
    return [clamp(nx, x0 + lim, x1 - lim), clamp(nz, z0 + lim, z1 - lim)];
  }
  function update(dt) {
    if (S.fps) { const hp = pick(S.W / 2, S.H / 2); setHover(hp ? hp.obj : null); }
    S.t += dt;
    S.yaw += ((S.keys.has('ArrowLeft') || S.keys.has('KeyQ') ? -1 : 0) + (S.keys.has('ArrowRight') || S.keys.has('KeyE') ? 1 : 0) + S.pad.r) * 1.9 * dt;
    const f = (S.keys.has('KeyW') || S.keys.has('ArrowUp') ? 1 : 0) - (S.keys.has('KeyS') || S.keys.has('ArrowDown') ? 1 : 0) + S.pad.f;
    const s = (S.keys.has('KeyD') ? 1 : 0) - (S.keys.has('KeyA') ? 1 : 0) + S.pad.s;
    let mx = 0, mz = 0;
    if (f || s) { const fl = clamp(f, -1, 1), sl = clamp(s, -1, 1), sp = (S.keys.has('ShiftLeft') ? 4.2 : 2.5) * (S.speedMul || 1) * dt; mx = (Math.sin(S.yaw) * fl + Math.cos(S.yaw) * sl) * sp; mz = (-Math.cos(S.yaw) * fl + Math.sin(S.yaw) * sl) * sp; S.auto = null; }
    if (S.auto) {
      const dx = S.auto.x - S.pos.x, dz = S.auto.z - S.pos.z, d = Math.hypot(dx, dz);
      const want = Math.atan2(S.auto.lx - S.pos.x, -(S.auto.lz - S.pos.z)); let dy = want - S.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; S.yaw += clamp(dy, -4 * dt, 4 * dt);
      if (d < 0.08) { const cb = S.auto.cb; S.auto = null; if (cb) cb(); } else { const sp = Math.min(d, 3.0 * dt); mx = (dx / d) * sp; mz = (dz / d) * sp; S.auto.stuck = (S.auto.stuck || 0) + dt; if (S.auto.stuck > 4) { const cb = S.auto.cb; S.auto = null; if (cb) cb(); } }
    }
    if (mx || mz) { const [nx, nz] = collide(S.pos.x + mx, S.pos.z + mz); S.pos.x = nx; S.pos.z = nz; }
    S.pitch = clamp(S.pitch, -1.0, 1.0);
  }

  // ---------- izbiranje ----------
  const ray = new T.Raycaster(); const ndc = new T.Vector2();
  function pick(sx, sy) {
    ndc.set((sx / S.W) * 2 - 1, -(sy / S.H) * 2 + 1); ray.setFromCamera(ndc, camera);
    const live = pickables.filter((m) => !hidden(m.userData.b));
    const hits = ray.intersectObjects(live, false);
    let ghostHit = null;
    for (const h of hits) {
      const b = h.object.userData.b; if (!b.obj) continue;
      if (b.ghost) { if (!ghostHit) ghostHit = h; continue; }
      return h.distance > 12 ? null : { obj: b.obj, dist: h.distance };
    }
    return ghostHit && ghostHit.distance <= 12 ? { obj: ghostHit.object.userData.b.obj, dist: ghostHit.distance } : null;
  }
  function setHover(o) {
    if (o === S.hover) return;
    for (const list of objMeshes.values()) for (const m of list) for (const mt of [].concat(m.material)) if (mt.emissive && !m.userData.b.emissive) { mt.emissive.setHex(0x000000); }
    S.hover = o;
    if (o) for (const m of objMeshes.get(o) || []) for (const mt of [].concat(m.material)) if (mt.emissive && !m.userData.b.ghost) { mt.emissive.setHex(0x4a3208); }
  }

  // ---------- soigralci ----------
  const peers = new Map(); let ghostG = null, selfG = null;
  function setPeers(list) {
    const seen = new Set();
    for (const p of list) {
      seen.add(p.uid); const key = JSON.stringify(p.av || {}) + '|' + p.name; let q = peers.get(p.uid);
      if (!q || q.key !== key) { if (q && q.g) sc.remove(q.g); let g = null; try { g = buildAvatar3D(T, p.av, p.name); sc.add(g); } catch (e) { console.error('Figura', e); } q = { g, x: p.x, z: p.z, tx: p.x, tz: p.z, yaw: p.yaw, ty: p.yaw, phase: Math.random() * 6, key, walk: 0 }; peers.set(p.uid, q); }
      q.tx = p.x; q.tz = p.z; q.ty = p.yaw;
    }
    for (const [k, q] of [...peers]) if (!seen.has(k)) { if (q.g) sc.remove(q.g); peers.delete(k); }
  }
  const npcMap = new Map();
  function setNpcs(list) {
    const seen = new Set();
    for (const n of list || []) {
      seen.add(n.id); let q = npcMap.get(n.id);
      if (!q) { let g = null; try { g = buildAvatar3D(T, n.av, '', { cop: !!n.cop, armed: !!n.armed }); sc.add(g); } catch (e) { console.error('NPC', e); } q = { g, ph: Math.random() * 6 }; npcMap.set(n.id, q); }
      if (!q.g) continue; q.g.rotation.order = 'YXZ'; q.g.position.set(n.x, (n.lying || 0) * 0.12, n.z); q.g.rotation.y = Math.PI - (n.yaw || 0); q.g.rotation.x = -(n.lying || 0) * Math.PI / 2 * (n.side || 1);
      const pr = q.g.userData.parts; if (pr) { const sw = n.walk ? Math.sin(S.t * 7 + q.ph) * 0.6 : 0; pr.legs[0].rotation.x = sw; pr.legs[1].rotation.x = -sw; if (n.lying) { pr.arms[0].rotation.x = 0; pr.arms[1].rotation.x = 0; pr.legs[0].rotation.x = 0; pr.legs[1].rotation.x = 0; } else { const ar = n.hands ? -3.0 : n.armed ? -1.3 : 0; pr.arms[0].rotation.x = ar; pr.arms[1].rotation.x = ar; } }
      q.g.traverse((o) => { if (o.material && o.material.emissive) o.material.emissive.setRGB(n.hurt > 0 ? 0.6 : 0, 0, 0); });
    }
    for (const [k, q] of [...npcMap]) if (!seen.has(k)) { if (q.g) sc.remove(q.g); npcMap.delete(k); }
  }
  function updatePeers(dt) {
    for (const q of peers.values()) {
      if (!q.g) continue;
      const dx = q.tx - q.x, dz = q.tz - q.z, d = Math.hypot(dx, dz), k = Math.min(1, dt * 2.6); q.x += dx * k; q.z += dz * k;
      let dy = q.ty - q.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; q.yaw += dy * Math.min(1, dt * 5);
      q.walk = d > 0.06 ? 1 : 0; q.phase += dt * 7 * q.walk;
      q.g.position.set(q.x, 0, q.z); q.g.rotation.y = Math.PI - q.yaw;
      const pr = q.g.userData.parts; if (pr) { const sw = Math.sin(q.phase) * 0.6 * q.walk; pr.legs[0].rotation.x = sw; pr.legs[1].rotation.x = -sw; pr.arms[0].rotation.x = -sw * 0.8; pr.arms[1].rotation.x = sw * 0.8; }
    }
  }

  // ---------- vhodi ----------
  const onKey = (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (S.fps && (e.code === 'KeyQ' || e.code === 'KeyE')) { if (e.type === 'keydown' && e.code === 'KeyE' && opts.onUse) opts.onUse(); return; }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft'].includes(e.code)) { if (e.type === 'keydown') S.keys.add(e.code); else S.keys.delete(e.code); if (e.code.startsWith('Arrow')) e.preventDefault(); }
    if (e.type === 'keydown') { if (e.code === 'KeyF' && opts.onFlash) opts.onFlash(); if (e.code === 'KeyU' && opts.onUv) opts.onUv(); if ((e.code === 'Space' || e.code === 'Enter') && !S.fps && S.hover && opts.onInteract) { e.preventDefault(); opts.onInteract(S.hover); } }
  };
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); const blur = () => S.keys.clear(); window.addEventListener('blur', blur);
  let drag = null; const rel = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * (S.W / r.width), (e.clientY - r.top) * (S.H / r.height)]; };
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); const [x, y] = rel(e); drag = { x, y, moved: 0, id: e.pointerId }; });
  canvas.addEventListener('pointermove', (e) => {
    const [x, y] = rel(e);
    if (drag && drag.id === e.pointerId) { const dx = x - drag.x, dy = y - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = x; drag.y = y; if (drag.moved > 6 && !S.fps) { S.yaw += dx * 0.0042; S.pitch = clamp(S.pitch - dy * 0.0035, -1, 1); S.auto = null; } }
    if (!drag || e.pointerType === 'mouse') { const p = pick(x, y); setHover(p ? p.obj : null); canvas.style.cursor = S.hover ? 'pointer' : (drag ? 'grabbing' : 'grab'); }
  });
  canvas.addEventListener('pointerup', (e) => { if (!drag || drag.id !== e.pointerId) return; const tap = drag.moved <= 6 && !S.fps; const [x, y] = rel(e); drag = null; if (tap) { const p = pick(x, y); setHover(p ? p.obj : null); if (p && opts.onInteract) opts.onInteract(p.obj); } });
  canvas.addEventListener('pointercancel', () => { drag = null; }); canvas.addEventListener('pointerleave', () => { if (!drag) setHover(null); });

  // ---------- velikost, zanka ----------
  function resize() {
    const r = canvas.getBoundingClientRect(); S.W = Math.max(320, Math.round(r.width)); S.H = Math.max(240, Math.round(r.height));
    renderer.setSize(S.W, S.H, false); camera.aspect = S.W / S.H;
    const hf = 72 * Math.PI / 180; camera.fov = Math.min(100, (2 * Math.atan(Math.tan(hf / 2) / camera.aspect)) * 180 / Math.PI); camera.updateProjectionMatrix();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; if (ro) ro.observe(canvas); window.addEventListener('resize', resize); resize();
  refreshDecals(true);
  let last = performance.now();
  function applyLighting() {
    const g = S.gain, uv = S.uv;
    renderer.toneMappingExposure = 1.4 * g * (S.lm == null ? 1 : S.lm);
    if (HOR) { hemi.intensity = uv ? 0.05 : HEMI0; lamp.intensity = 0; ceil.intensity = 0; moon.intensity = 0; for (const [pl, base, nm] of horLights) pl.intensity = (uv ? 0.05 : 1) * base * (nm === 'candles' ? 0.85 + 0.15 * Math.sin(S.t * 11) * Math.sin(S.t * 4.3) : 1); }
    else { hemi.intensity = uv ? 0.08 : 0.8; lamp.intensity = uv ? 0.4 : 7.5; ceil.intensity = uv ? 0.3 : 9; moon.intensity = uv ? 0.15 : 1.4; }
    for (const [pl, base] of lamps2) pl.intensity = uv ? base * 0.05 : base;
    for (const [pl, base] of lamps2) pl.intensity = uv ? base * 0.05 : base;
    fire.intensity = HOR ? 0 : (uv ? 0.4 : 8) * (0.8 + 0.25 * Math.sin(S.t * 9) * Math.sin(S.t * 3.7) + 0.12 * Math.sin(S.t * 21));
    spot.intensity = S.flash ? 26 : 0; uvLight.intensity = uv ? 40 : 0;
  }
  function loop(now) {
    if (!S.running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt);
    // stanje predmetov (skrivanje, premik)
    for (const m of meshes) {
      const b = m.userData.b; m.visible = !hidden(b);
      const o = b.off ? b.off(stateOf()) : null; m.position.set(m.userData.base.x + (o ? o[0] : 0), m.userData.base.y + (o ? o[1] : 0), m.userData.base.z + (o ? o[2] : 0));
    }
    refreshDecals(false); applyLighting(); try { updatePeers(dt); } catch (e) { /* figure ne smejo ustaviti prikaza */ }
    const dp2 = dust.geometry.attributes.position; for (let i = 0; i < dustN; i++) { dp2.array[i * 3 + 1] += Math.sin(S.t * 0.3 + i) * 0.0004; dp2.array[i * 3] += Math.cos(S.t * 0.2 + i * 1.7) * 0.0003; } dp2.needsUpdate = true;
    { let cx = S.pos.x, cy = S.pos.y + Math.sin(S.t * 1.2) * 0.003, cz = S.pos.z; if (S.third) { const fx = Math.sin(S.yaw) * Math.cos(S.pitch), fy = Math.sin(S.pitch), fz = -Math.cos(S.yaw) * Math.cos(S.pitch); cx = clamp(cx - fx * 2.7, x0 + 0.15, x1 - 0.15); cy = Math.max(0.5, cy + 0.28 - fy * 2.7); cz = clamp(cz - fz * 2.7, z0 + 0.15, z1 - 0.15); }
      camera.position.set(cx, cy, cz);
      if (selfG) { selfG.visible = !!S.third && !!S.selfAv; if (selfG.visible) { selfG.position.set(S.pos.x, 0, S.pos.z); selfG.rotation.y = Math.PI - S.yaw; const pr = selfG.userData.parts; if (pr) { const mv = S.keys.has('KeyW') || S.keys.has('KeyS') || S.keys.has('KeyA') || S.keys.has('KeyD'); const sw = mv ? Math.sin(S.t * 8) * 0.6 : 0; pr.legs[0].rotation.x = sw; pr.legs[1].rotation.x = -sw; pr.arms[0].rotation.x = -1.2; pr.arms[1].rotation.x = -1.3; } } } } camera.rotation.set(S.pitch, -S.yaw, 0);
    if (canvas.isConnected) { try { renderer.render(sc, camera); } catch (e) { console.error('Napaka realističnega prikaza', e); } }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return {
    S, kind: 'real',
    setPeers, setNpcs, setFps(on) { S.fps = !!on; if (on) S.auto = null; }, setThird(on) { S.third = !!on; }, setSelf(s) { S.selfAv = s; if (s && !selfG) { try { selfG = buildAvatar3D(T, s.av, '', { cop: true, armed: true }); sc.add(selfG); selfG.visible = false; } catch (e) { console.error(e); } } }, setSpeed(v) { S.speedMul = v; }, setState(st) { S.state = st; }, setFlash(on) { S.flash = !!on; if (on) S.uv = false; }, setUv(on) { S.uv = !!on; if (on) S.flash = false; }, setGain(v) { S.gain = v; }, setLightMul(v) { S.lm = v; },
    setGhost(gh) { if (!gh) { if (ghostG) ghostG.visible = false; return; } if (!ghostG) { ghostG = buildGhost3D(T); sc.add(ghostG); } ghostG.visible = true; ghostG.position.set(gh.x, 0, gh.z); ghostG.rotation.y = Math.atan2(S.pos.x - gh.x, S.pos.z - gh.z); for (const m of ghostG.userData.mats || []) m.opacity = gh.alpha; },
    look(yaw, pitch) { S.yaw = yaw; S.pitch = pitch || 0; }, pad(f, s, r) { S.pad.f = f; S.pad.s = s; S.pad.r = r; }, hoverObj: () => S.hover,
    distanceTo(objId) { let best = 1e9; for (const m of objMeshes.get(objId) || []) { if (hidden(m.userData.b)) continue; const [a, c] = bounds(m); const px = clamp(S.pos.x, a[0], c[0]), py = clamp(S.pos.y, a[1], c[1]), pz = clamp(S.pos.z, a[2], c[2]); best = Math.min(best, Math.hypot(px - S.pos.x, py - S.pos.y, pz - S.pos.z)); } return best; },
    walkTo(objId, cb) {
      const list = (objMeshes.get(objId) || []).filter((m) => !hidden(m.userData.b)); if (!list.length) { if (cb) cb(); return; }
      let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9; for (const m of list) { const [a, c] = bounds(m); mnx = Math.min(mnx, a[0]); mxx = Math.max(mxx, c[0]); mnz = Math.min(mnz, a[2]); mxz = Math.max(mxz, c[2]); }
      const cx = (mnx + mxx) / 2, cz = (mnz + mxz) / 2; let dx = S.pos.x - cx, dz = S.pos.z - cz; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl; const half = Math.max(mxx - mnx, mxz - mnz) / 2;
      let tx = S.pos.x, tz = S.pos.z; for (const extra of [1.3, 1.6, 2.0, 2.5]) { const px = cx + dx * (half + extra), pz = cz + dz * (half + extra); const [qx, qz] = collide(px, pz); tx = qx; tz = qz; if (Math.hypot(qx - px, qz - pz) < 0.05) break; }
      S.auto = { x: tx, z: tz, lx: cx, lz: cz, cb }; S.pitch = 0;
    },
    cancelAuto() { S.auto = null; },
    destroy() {
      S.running = false; window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', blur); window.removeEventListener('resize', resize); if (ro) ro.disconnect();
      try { sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); renderer.dispose(); renderer.forceContextLoss(); } catch (_) { /* nič */ }
    },
    _debug: { pick, S, renderer },
  };
}
