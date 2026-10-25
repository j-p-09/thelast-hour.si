// Izvirne vektorske ilustracije (SVG), narejene za to igro: nočna scena arhiva, portreti oseb, shema stavbe, mapa primera.
// Vse so izrisane s kodo, brez zunanjih slik.
import { h } from './ui.js';

const P = { ink0: '#080A0D', ink1: '#101419', ink2: '#171D24', ink3: '#242D36', ink4: '#35414B', paper: '#EAE9E3', mist: '#9BA6B0', red: '#8F2833', red2: '#B33A45', amber: '#C9993A', green: '#426B57' };
const svg = (attrs, ...kids) => h('svg', { xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': 'true', focusable: 'false', ...attrs }, ...kids);

// ---------- nočna scena: stavba inštituta ----------
export function archiveScene() {
  const wins = []; const lit = new Set([3, 9, 14, 20, 27]);
  let n = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    const x = 262 + c * 46, y = 150 + r * 46;
    wins.push(h('rect', { x, y, width: 24, height: 28, rx: 2, fill: lit.has(n) ? P.amber : P.ink3, opacity: lit.has(n) ? 0.85 : 0.9, class: lit.has(n) ? 'win-lit' : null }));
    n++;
  }
  const stars = []; for (let i = 0; i < 38; i++) { const x = (i * 97) % 1200, y = (i * 53) % 190; stars.push(h('circle', { cx: x, cy: y + 8, r: i % 5 === 0 ? 1.6 : 0.9, fill: P.paper, opacity: 0.25 + (i % 4) * 0.12 })); }
  const rain = []; for (let i = 0; i < 46; i++) rain.push(h('line', { x1: i * 27, y1: (i * 37) % 300, x2: i * 27 - 8, y2: ((i * 37) % 300) + 26, stroke: P.mist, 'stroke-width': 0.6, opacity: 0.16 }));
  return svg({ viewBox: '0 0 1200 420', preserveAspectRatio: 'xMidYMax slice', class: 'art-scene', role: 'img', 'aria-label': 'Nočna ilustracija stavbe inštituta' },
    h('defs', null,
      h('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0, y2: 1 }, h('stop', { offset: '0', 'stop-color': '#0b0f14' }), h('stop', { offset: '1', 'stop-color': '#1a2330' })),
      h('radialGradient', { id: 'moon', cx: 0.5, cy: 0.5, r: 0.5 }, h('stop', { offset: '0', 'stop-color': '#EAE9E3', 'stop-opacity': 0.9 }), h('stop', { offset: '1', 'stop-color': '#EAE9E3', 'stop-opacity': 0 }))),
    h('rect', { width: 1200, height: 420, fill: 'url(#sky)' }), stars,
    h('circle', { cx: 960, cy: 84, r: 70, fill: 'url(#moon)', opacity: 0.35 }), h('circle', { cx: 960, cy: 84, r: 22, fill: P.paper, opacity: 0.85 }),
    // oddaljene stavbe
    h('path', { d: 'M0 330 V270 H60 V300 H110 V240 H170 V290 H220 V330 Z', fill: '#0d1218' }), h('path', { d: 'M980 330 V250 H1030 V210 H1090 V270 H1140 V300 H1200 V330 Z', fill: '#0d1218' }),
    // glavna stavba
    h('rect', { x: 240, y: 110, width: 392 + 10, height: 220, fill: P.ink2 }), h('rect', { x: 240, y: 110, width: 402, height: 10, fill: P.ink4 }),
    h('polygon', { points: '230,112 441,70 652,112', fill: P.ink3 }), wins,
    h('rect', { x: 420, y: 262, width: 44, height: 68, fill: P.ink0 }), h('rect', { x: 424, y: 266, width: 17, height: 64, fill: P.amber, opacity: 0.35 }),
    // klet (rdeče okno: kraj dogodka)
    h('rect', { x: 316, y: 318, width: 52, height: 10, rx: 1, fill: P.red2, opacity: 0.95, class: 'win-lit' }),
    h('line', { x1: 0, y1: 330, x2: 1200, y2: 330, stroke: P.ink4, 'stroke-width': 2 }),
    h('rect', { x: 0, y: 330, width: 1200, height: 90, fill: '#0a0d11' }),
    // garažna zapornica
    h('rect', { x: 700, y: 296, width: 6, height: 34, fill: P.mist, opacity: 0.8 }), h('rect', { x: 706, y: 300, width: 92, height: 5, fill: P.red2 }), h('rect', { x: 706, y: 300, width: 14, height: 5, fill: P.paper }), h('rect', { x: 746, y: 300, width: 14, height: 5, fill: P.paper }),
    // svetilka
    h('line', { x1: 120, y1: 330, x2: 120, y2: 240, stroke: P.ink4, 'stroke-width': 4 }), h('circle', { cx: 120, cy: 238, r: 40, fill: P.amber, opacity: 0.08 }), h('circle', { cx: 120, cy: 238, r: 6, fill: P.amber }),
    rain);
}

// ---------- portreti ----------
const SKIN = ['#d9b79c', '#e2c3a8', '#c79f82', '#dcbfa6', '#cfa98c', '#d6b199'];
const BODY = { S1: P.ink4, S2: '#4a5c52', S3: '#3a3f55', S4: '#5a3a42', S5: '#2d3b4d', V: '#4b4640' };
function face(skin, extra = []) {
  return [h('rect', { x: 43, y: 66, width: 14, height: 14, fill: skin, opacity: 0.85 }), h('ellipse', { cx: 50, cy: 50, rx: 17, ry: 20, fill: skin }),
    h('circle', { cx: 43.5, cy: 50, r: 1.6, fill: P.ink0 }), h('circle', { cx: 56.5, cy: 50, r: 1.6, fill: P.ink0 }), h('path', { d: 'M44 60 Q50 63 56 60', fill: 'none', stroke: '#6d4a3c', 'stroke-width': 1.4, 'stroke-linecap': 'round' }), ...extra];
}
const PORTRAITS = {
  S1(skin) { // direktor: sivi lasje, očala, kravata
    return [h('path', { d: 'M8 100 Q10 74 50 72 Q90 74 92 100 Z', fill: BODY.S1 }), h('polygon', { points: '50,74 44,100 56,100', fill: P.paper, opacity: 0.9 }), h('polygon', { points: '50,78 47,100 53,100', fill: P.red }),
      ...face(skin), h('path', { d: 'M32 46 Q32 26 50 26 Q68 26 68 46 Q64 34 50 33 Q36 34 32 46 Z', fill: '#b9bcc0' }),
      h('circle', { cx: 43.5, cy: 50, r: 5.5, fill: 'none', stroke: P.ink0, 'stroke-width': 1.2 }), h('circle', { cx: 56.5, cy: 50, r: 5.5, fill: 'none', stroke: P.ink0, 'stroke-width': 1.2 }), h('line', { x1: 49, y1: 50, x2: 51, y2: 50, stroke: P.ink0, 'stroke-width': 1.2 })];
  },
  S2(skin) { // arhivistka: čop, kardigan
    return [h('path', { d: 'M8 100 Q10 74 50 72 Q90 74 92 100 Z', fill: BODY.S2 }), h('path', { d: 'M38 74 L50 92 L62 74', fill: 'none', stroke: P.paper, 'stroke-width': 2, opacity: 0.5 }),
      h('circle', { cx: 50, cy: 24, r: 9, fill: '#5b3a2a' }), ...face(skin), h('path', { d: 'M32 48 Q31 27 50 27 Q69 27 68 48 Q62 36 50 35 Q38 36 32 48 Z', fill: '#5b3a2a' }),
      h('circle', { cx: 74, cy: 84, r: 3, fill: P.amber })];
  },
  S3(skin) { // informatik: brada, kapuca, slušalke
    return [h('path', { d: 'M8 100 Q10 74 50 72 Q90 74 92 100 Z', fill: BODY.S3 }), h('path', { d: 'M38 74 Q50 86 62 74', fill: 'none', stroke: P.ink0, 'stroke-width': 3, opacity: 0.5 }),
      ...face(skin), h('path', { d: 'M33 56 Q36 74 50 74 Q64 74 67 56 Q60 66 50 66 Q40 66 33 56 Z', fill: '#3a2c25' }), h('path', { d: 'M33 46 Q33 28 50 28 Q67 28 67 46 Q62 36 50 35 Q38 36 33 46 Z', fill: '#2c2420' }),
      h('path', { d: 'M31 50 Q30 30 50 29 Q70 30 69 50', fill: 'none', stroke: P.mist, 'stroke-width': 2.4 }), h('rect', { x: 27, y: 46, width: 6, height: 11, rx: 2.5, fill: P.mist })];
  },
  S4(skin) { // vodja financ: polkratki lasje, žaket, ogrlica
    return [h('path', { d: 'M8 100 Q10 74 50 72 Q90 74 92 100 Z', fill: BODY.S4 }), h('path', { d: 'M40 74 L50 96 L60 74', fill: 'none', stroke: P.paper, 'stroke-width': 1.6, opacity: 0.55 }),
      h('path', { d: 'M31 54 Q27 26 50 24 Q73 26 69 54 L66 58 Q66 38 50 36 Q34 38 34 58 Z', fill: '#7a6f66' }), ...face(skin),
      h('path', { d: 'M32 50 Q31 30 50 28 Q69 30 68 50 Q60 38 50 37 Q40 38 32 50 Z', fill: '#7a6f66' }), h('path', { d: 'M40 76 Q50 84 60 76', fill: 'none', stroke: P.paper, 'stroke-width': 1.6, 'stroke-dasharray': '1.5 2.5' })];
  },
  S5(skin) { // varnostnik: kapa, uniforma
    return [h('path', { d: 'M8 100 Q10 74 50 72 Q90 74 92 100 Z', fill: BODY.S5 }), h('rect', { x: 61, y: 80, width: 14, height: 8, rx: 1.5, fill: P.amber, opacity: 0.85 }), h('line', { x1: 36, y1: 74, x2: 36, y2: 100, stroke: P.ink0, opacity: 0.35 }),
      ...face(skin), h('path', { d: 'M30 42 Q30 24 50 24 Q70 24 70 42 Z', fill: '#1e2a3a' }), h('rect', { x: 28, y: 40, width: 44, height: 5, rx: 2, fill: '#16202e' }), h('circle', { cx: 50, cy: 33, r: 3.2, fill: P.amber })];
  },
  V(skin) { // žrtev: sivi lasje, očala z verižico
    return [h('path', { d: 'M8 100 Q10 74 50 72 Q90 74 92 100 Z', fill: BODY.V }), ...face(skin), h('path', { d: 'M31 54 Q27 24 50 23 Q73 24 69 54 Q66 36 50 34 Q34 36 31 54 Z', fill: '#c9ccd0' }),
      h('rect', { x: 37, y: 46, width: 12, height: 9, rx: 3, fill: 'none', stroke: P.ink0, 'stroke-width': 1.2 }), h('rect', { x: 51, y: 46, width: 12, height: 9, rx: 3, fill: 'none', stroke: P.ink0, 'stroke-width': 1.2 }), h('path', { d: 'M37 54 Q30 74 38 80', fill: 'none', stroke: P.amber, 'stroke-width': 1 })];
  },
};
export function portrait(id, size = 64, label = '') {
  const idx = Math.max(0, Number(String(id).replace(/\D/g, '')) || 0) % SKIN.length;
  const draw = PORTRAITS[id] || PORTRAITS.S1;
  const gid = `pg-${id}-${size}`;
  return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 100 100', width: size, height: size, class: 'portrait', role: label ? 'img' : null, 'aria-label': label || null, 'aria-hidden': label ? null : 'true', focusable: 'false' },
    h('defs', null, h('radialGradient', { id: gid, cx: 0.5, cy: 0.35, r: 0.8 }, h('stop', { offset: '0', 'stop-color': '#2b3642' }), h('stop', { offset: '1', 'stop-color': '#10151b' })), h('clipPath', { id: `${gid}-c` }, h('circle', { cx: 50, cy: 50, r: 48 }))),
    h('circle', { cx: 50, cy: 50, r: 48, fill: `url(#${gid})` }), h('g', { 'clip-path': `url(#${gid}-c)` }, draw(SKIN[idx])), h('circle', { cx: 50, cy: 50, r: 48, fill: 'none', stroke: P.red2, 'stroke-width': 1.5, opacity: 0.55 }));
}

// ---------- shema stavbe (samo znana dejstva; ni v merilu) ----------
export function floorPlan() {
  const room = (x, y, w, hh, label, fill = P.ink2, tone = P.mist) => [h('rect', { x, y, width: w, height: hh, fill, stroke: P.ink4, 'stroke-width': 1.5, rx: 3 }), h('text', { x: x + w / 2, y: y + hh / 2 + 4, 'text-anchor': 'middle', fill: tone, 'font-size': 12, 'font-family': 'Poppins, sans-serif' }, label)];
  return svg({ viewBox: '0 0 520 300', class: 'art-plan', role: 'img', 'aria-label': 'Shema stavbe: klet, pritličje, drugo nadstropje' },
    h('text', { x: 8, y: 18, fill: P.mist, 'font-size': 11, 'letter-spacing': 2, 'font-family': 'Poppins, sans-serif' }, 'SHEMA STAVBE (ni v merilu)'),
    // nadstropje 2
    h('text', { x: 8, y: 54, fill: P.mist, 'font-size': 11, 'font-family': 'Poppins, sans-serif' }, '2. nadstropje'), room(110, 32, 150, 52, 'Tajništvo'), room(266, 32, 120, 52, 'Drugi prostori', P.ink1, P.ink4),
    // pritličje
    h('text', { x: 8, y: 138, fill: P.mist, 'font-size': 11, 'font-family': 'Poppins, sans-serif' }, 'Pritličje'), room(110, 112, 100, 52, 'Glavni vhod'), room(214, 112, 70, 52, 'Pult'), room(288, 112, 98, 52, 'Stranski vhod', P.ink2),
    h('text', { x: 296, y: 178, fill: P.amber, 'font-size': 10, 'font-family': 'Poppins, sans-serif' }, 'vstop s kartico'),
    // klet
    h('text', { x: 8, y: 228, fill: P.mist, 'font-size': 11, 'font-family': 'Poppins, sans-serif' }, 'Klet'), room(110, 196, 130, 62, 'Depo B'), room(244, 196, 142, 62, 'Depo C', '#2a1519', '#ffb4ba'),
    h('rect', { x: 240, y: 214, width: 8, height: 26, fill: P.amber }), h('text', { x: 244, y: 275, 'text-anchor': 'middle', fill: P.amber, 'font-size': 10, 'font-family': 'Poppins, sans-serif' }, 'edini vhod (ARHIV-ACS)'),
    // dvigalo
    h('rect', { x: 400, y: 32, width: 26, height: 226, fill: P.ink1, stroke: P.ink4, 'stroke-width': 1.5, rx: 3 }), h('text', { x: 413, y: 150, fill: P.mist, 'font-size': 11, 'text-anchor': 'middle', transform: 'rotate(90 413 150)', 'font-family': 'Poppins, sans-serif' }, 'DVIGALO'),
    // zunaj
    h('rect', { x: 446, y: 112, width: 66, height: 52, fill: P.ink1, stroke: P.ink4, 'stroke-width': 1.5, rx: 3, 'stroke-dasharray': '4 3' }), h('text', { x: 479, y: 134, 'text-anchor': 'middle', fill: P.mist, 'font-size': 10, 'font-family': 'Poppins, sans-serif' }, 'Garažna'), h('text', { x: 479, y: 148, 'text-anchor': 'middle', fill: P.mist, 'font-size': 10, 'font-family': 'Poppins, sans-serif' }, 'zapornica'));
}

// ---------- mapa primera ----------
export function caseFolder(label = 'PRIMER 001') {
  return svg({ viewBox: '0 0 220 160', class: 'art-folder', role: 'img', 'aria-label': `Mapa: ${label}` },
    h('path', { d: 'M10 40 H80 L92 24 H210 V148 H10 Z', fill: '#c9a96b', opacity: 0.18 }), h('path', { d: 'M10 40 H80 L92 24 H210 V148 H10 Z', fill: 'none', stroke: P.amber, 'stroke-width': 2, opacity: 0.8 }),
    h('rect', { x: 22, y: 52, width: 170, height: 86, fill: P.paper, opacity: 0.08, rx: 3 }),
    [0, 1, 2, 3].map((i) => h('line', { x1: 36, y1: 74 + i * 14, x2: 150 - i * 12, y2: 74 + i * 14, stroke: P.mist, 'stroke-width': 2, opacity: 0.35, 'stroke-linecap': 'round' })),
    h('g', { transform: 'rotate(-12 150 108)' }, h('rect', { x: 100, y: 92, width: 100, height: 32, fill: 'none', stroke: P.red2, 'stroke-width': 3, rx: 4 }), h('text', { x: 150, y: 114, 'text-anchor': 'middle', fill: P.red2, 'font-size': 17, 'font-weight': 700, 'letter-spacing': 3, 'font-family': 'Poppins, sans-serif' }, 'ZAUPNO')));
}
