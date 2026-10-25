// Pomožne funkcije vmesnika. Vsa uporabniška besedila se vstavljajo kot textContent (nikoli kot HTML).
const SVGNS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs, ...kids) {
  const svg = ['svg', 'path', 'circle', 'line', 'rect', 'g', 'text', 'polygon', 'defs', 'linearGradient', 'stop', 'use', 'polyline'].includes(tag);
  const el = svg ? document.createElementNS(SVGNS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'required' || k === 'open') { if (v) el.setAttribute(k, ''); }
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- oblikovanje ----------
const pad = (n) => String(n).padStart(2, '0');
export const fmtClock = (sec) => { const s = Math.max(0, Math.floor(sec)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
export const fmtDur = (sec) => { const s = Math.round(sec || 0); const m = Math.floor(s / 60); return `${m} min ${pad(s % 60)} s`; };
export function fmtDate(ts) { if (!ts) return '–'; const d = new Date(ts); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; }
export function fmtDateTime(ts) { if (!ts) return '–'; const d = new Date(ts); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function fmtTime(ts) { if (!ts) return '–'; const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
export const plural = (n, one, two, few, many) => (n % 100 === 1 ? one : n % 100 === 2 ? two : (n % 100 === 3 || n % 100 === 4) ? few : many);
export const STATUS_SL = { PENDING_APPROVAL: 'Čaka na odobritev', APPROVED: 'Odobren', REJECTED: 'Zavrnjen', SUSPENDED: 'Suspendiran' };
export const OUTCOME_SL = { active: 'V teku', lobby: 'V čakalnici', success: 'Uspešen pobeg', failed: 'Neuspešna preiskava', expired: 'Čas je potekel', aborted: 'Prekinjena (administrator)', closed: 'Zaprta' };
export const MODE_SL = { solo: 'Samostojno', dvojica: 'Dvojica', trojica: 'Trojica' };
export const rankFor = (stats) => { const e = (stats && stats.escapes) || 0; return e >= 3 ? 'Komisar' : e === 2 ? 'Višji detektiv' : e === 1 ? 'Detektiv' : 'Pripravnik'; };

// ---------- ikone (lokalni SVG) ----------
const ICONS = {
  board: 'M3 4h18v14H3zM7 8h4M7 12h7M16 8h2',
  docs: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  people: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 100-5M18 14c2 .5 3.5 2.5 3.5 5',
  puzzle: 'M10 3a2 2 0 014 0v2h4v4h-2a2 2 0 100 4h2v4h-4v-2a2 2 0 10-4 0v2H6v-4h2a2 2 0 100-4H6V5h4z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3.5 2',
  log: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  gavel: 'M14 4l6 6-3 3-6-6zM10 8L3 15l3 3 7-7M4 21h10',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  note: 'M5 4h14v11l-5 5H5zM14 20v-5h5',
  sound: 'M4 9v6h4l5 4V5L8 9zM16 8.5a5 5 0 010 7',
  mute: 'M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6',
  chat: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-7 8-7s8 3 8 7',
  check: 'M4 12.5l5 5L20 6.5',
  x: 'M6 6l12 12M18 6L6 18',
  hint: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.7.5 1 1.2 1 2.1h5c0-.9.3-1.6 1-2.1A6 6 0 0012 3z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  copy: 'M8 8h11v12H8zM5 16V4h11',
  plus: 'M12 5v14M5 12h14',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
};
export function icon(name, size = 18) {
  return h('svg', { class: 'ico', width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: ICONS[name] || ICONS.note }));
}

// Logotip: ura s kazalcema + napis.
export function logo(big = false) {
  const s = big ? 84 : 30;
  return h('div', { class: 'logo' + (big ? ' logo--big' : ''), 'aria-label': 'THE LAST HOUR' },
    h('svg', { width: s, height: s, viewBox: '0 0 64 64', 'aria-hidden': 'true' },
      h('circle', { cx: 32, cy: 32, r: 28, fill: 'none', stroke: 'var(--red-2)', 'stroke-width': 2.5, 'stroke-dasharray': '4 3' }),
      h('circle', { cx: 32, cy: 32, r: 22, fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.2 }),
      h('line', { x1: 32, y1: 32, x2: 32, y2: 14, stroke: 'var(--paper)', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      h('line', { x1: 32, y1: 32, x2: 44, y2: 38, stroke: 'var(--red-2)', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      h('circle', { cx: 32, cy: 32, r: 3, fill: 'var(--paper)' })),
    big ? null : h('span', { class: 'logo__text' }, 'THE LAST HOUR'));
}

// ---------- obvestila ----------
let toastHost;
export function toast(msg, kind = 'info', ms = 4500) {
  if (!toastHost) { toastHost = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(toastHost); }
  const sym = { info: 'i', ok: '✓', warn: '!', err: '✕', find: '★' }[kind] || 'i';
  const t = h('div', { class: `toast toast--${kind}` }, h('span', { class: 'toast__sym', 'aria-hidden': 'true' }, sym), h('span', { class: 'toast__msg' }, msg),
    h('button', { class: 'toast__x', 'aria-label': 'Zapri obvestilo', onclick: () => t.remove() }, '×'));
  toastHost.append(t);
  while (toastHost.children.length > 5) toastHost.firstChild.remove();
  setTimeout(() => t.remove(), ms);
  return t;
}

// ---------- modalno okno ----------
export function modal({ title, body, actions = [], wide = false, onClose }) {
  const prev = document.activeElement;
  const close = (v) => { overlay.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); if (onClose) onClose(v); };
  const onKey = (e) => {
    if (e.key === 'Escape') close(null);
    if (e.key === 'Tab') {
      const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', box).filter((x) => !x.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  const box = h('div', { class: 'modal' + (wide ? ' modal--wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal__head' }, h('h2', null, title), h('button', { class: 'iconbtn', 'aria-label': 'Zapri', onclick: () => close(null) }, icon('x'))),
    h('div', { class: 'modal__body' }, body),
    actions.length ? h('div', { class: 'modal__foot' }, actions.map((a) => h('button', { class: `btn ${a.kind || ''}`, onclick: async () => { if (a.onClick) { const r = await a.onClick(); if (r === false) return; } close(a.value ?? true); } }, a.label))) : null);
  const overlay = h('div', { class: 'overlay', onmousedown: (e) => { if (e.target === overlay) close(null); } }, box);
  document.body.append(overlay);
  document.addEventListener('keydown', onKey);
  const first = $('input, select, textarea, .modal__foot .btn.primary, .modal__foot .btn', box) || $('button', box);
  if (first) first.focus();
  return { close, box };
}
export function confirmBox(title, text, okLabel = 'Potrdi', danger = false) {
  return new Promise((res) => modal({ title, body: h('p', null, text), actions: [{ label: 'Prekliči', value: false }, { label: okLabel, kind: danger ? 'danger' : 'primary', value: true }], onClose: (v) => res(v === true) }));
}

// ---------- zvok (sintetiziran, brez datotek) ----------
let actx = null;
export const sound = {
  get on() { try { return localStorage.getItem('tlh.sound') !== 'off'; } catch (_) { return true; } },
  set(on) { try { localStorage.setItem('tlh.sound', on ? 'on' : 'off'); } catch (_) { /* brez shranjevanja */ } },
  beep(freq = 660, dur = 0.12, type = 'sine', vol = 0.05, delay = 0) {
    if (!this.on) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + delay;
      o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (_) { /* zvok ni na voljo */ }
  },
  find() { this.beep(740, 0.1, 'triangle'); this.beep(990, 0.16, 'triangle', 0.05, 0.1); },
  ok() { this.beep(523, 0.1, 'sine'); this.beep(784, 0.2, 'sine', 0.05, 0.1); },
  bad() { this.beep(160, 0.25, 'sawtooth', 0.04); },
  warn() { this.beep(440, 0.15, 'square', 0.03); this.beep(440, 0.15, 'square', 0.03, 0.25); },
  tick() { this.beep(900, 0.05, 'square', 0.025); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.beep(f, 0.3, 'triangle', 0.05, i * 0.14)); },
  lose() { [330, 262, 196].forEach((f, i) => this.beep(f, 0.4, 'sawtooth', 0.035, i * 0.22)); },
};

export function copyText(t) { return navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject(new Error('ni odložišča')); }
export function download(filename, blob) { const a = h('a', { href: URL.createObjectURL(blob), download: filename }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
export function b64ToBlob(b64, type) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); }
export const spinner = (t = 'Nalaganje …') => h('div', { class: 'loading', role: 'status' }, h('span', { class: 'spin', 'aria-hidden': 'true' }), t);

// Gumb z blokado med klicem na strežnik.
export function busyButton(btn, fn) {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    btn.disabled = true; btn.classList.add('is-busy');
    try { await fn(); } finally { btn.disabled = false; btn.classList.remove('is-busy'); }
  });
  return btn;
}
