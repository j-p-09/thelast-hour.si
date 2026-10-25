// Prikaz vsebine dokumentov (bloki). Vse besedilo se vstavlja kot textContent.
import { h } from './ui.js';

export function renderBlocks(blocks) {
  return (blocks || []).map((b) => {
    switch (b.t) {
      case 'p': return h('p', null, b.text);
      case 'h': return h('h3', { class: 'doc__h' }, b.text);
      case 'note': return h('p', { class: 'doc__note' }, b.text);
      case 'quote': return h('blockquote', { class: 'doc__quote' }, b.text);
      case 'mono': return h('pre', { class: 'doc__mono' }, b.text);
      case 'stamp': return h('div', { class: 'doc__stamp' }, b.text);
      case 'list': return h('ul', null, (b.items || []).map((i) => h('li', null, i)));
      case 'kv': return h('dl', { class: 'doc__kv' }, (b.items || []).map(([k, v]) => [h('dt', null, k), h('dd', null, v)]));
      case 'table': return h('div', { class: 'doc__tablewrap' }, h('table', { class: 'doc__table' + (b.mono ? ' is-mono' : '') },
        h('thead', null, h('tr', null, b.cols.map((c) => h('th', null, c)))), h('tbody', null, b.rows.map((r) => h('tr', null, r.map((c) => h('td', null, c)))))));
      default: return null;
    }
  });
}
