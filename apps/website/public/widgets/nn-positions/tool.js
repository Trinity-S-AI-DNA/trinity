// nn-positions/tool.js -- lesson 25 of neural-networks: how a transformer knows the order of words.
// Each position gets a vector of sines and cosines at frequencies falling by 10000^(2i/d): the fast
// dimensions flicker, the slow ones barely move, and together every position gets its own pattern.
// Every stripe, hand and tile is pe(pos, dim) of gHashTag/t27 specs/ml/transformer/
// positional_encoding.t27, compiled to wasm (./logic.js), d_model 8. Words are SAY_ and numbers K_
// constants of specs/widgets/nn-positions.t27.
import { invFreq, pe } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, fmt, heat, root, say, source, svgEl, tiles, tone } from '../nn-kit.js'

const D = K('K_D_MODEL', 8), ROWS = K('K_ROWS', 48), PMAX = K('K_POS_HI', 200)
const ctl = controls([
  { key: 'pos', label: say('SAY_POS'), min: 0, max: PMAX },
], { names: W.SAY_PRESET_NAMES, values: { pos: K('K_PRESET_POS', []) } }, draw)

const stripes = canvas('nn-heat', say('SAY_STRIPES_LABEL'))
const clocks = canvas('nn-clocks', say('SAY_CLOCKS_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, el('p', { class: 'dk-label' }, say('SAY_CLOCKS_LABEL')), clocks, stat, el('p', { class: 'dk-label' }, say('SAY_STRIPES_LABEL')), stripes, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  // Stripes: positions down, dimensions across; the selected position's row is outlined when it is shown.
  heat(stripes, { rows: ROWS, cols: D, value: (r, c) => pe(r, c), color: (v) => tone(v, 1), colLabels: [...Array(D)].map((_, c) => `${c % 2 ? 'cos' : 'sin'}${c >> 1}`), w: 640, cell: 76, cellH: 9, fmt: null, mark: (r) => (r === s.pos ? 'on' : '') })
  // Clocks: each sin/cos pair is a hand on a circle, turning at its own speed.
  clocks.replaceChildren()
  clocks.setAttribute('viewBox', '0 0 640 190')
  for (let k = 0; k < D / 2; k++) {
    const cx = 80 + k * 160, cy = 92, R = 62
    const sx = pe(s.pos, 2 * k), cs = pe(s.pos, 2 * k + 1)
    clocks.append(svgEl('circle', { cx, cy, r: R, fill: '#020403', stroke: COLORS[k + 2], 'stroke-width': 2, opacity: 0.9 }))
    clocks.append(svgEl('line', { x1: cx, y1: cy, x2: cx + sx * R, y2: cy - cs * R, stroke: COLORS[k + 2], 'stroke-width': 5, 'stroke-linecap': 'round' }))
    clocks.append(svgEl('circle', { cx: cx + sx * R, cy: cy - cs * R, r: 7, fill: COLORS[k + 2] }))
    clocks.append(svgEl('text', { x: cx, y: 182, class: 'dk-tick', 'text-anchor': 'middle' }, `${say('SAY_PAIR')} ${k}: ${fmt(invFreq(k, D), 4)}`))
  }
  stat.replaceChildren(tiles([
    { label: say('SAY_VECTOR'), value: [...Array(D)].map((_, c) => fmt(pe(s.pos, c), 2)).join(' '), tone: 0 },
    { label: say('SAY_FAST'), value: `${fmt(pe(s.pos, 0), 3)}, ${fmt(pe(s.pos, 1), 3)}`, tone: 2 },
    { label: say('SAY_SLOW'), value: `${fmt(pe(s.pos, D - 2), 4)}, ${fmt(pe(s.pos, D - 1), 4)}`, tone: 3 },
    { label: say('SAY_FREQS'), value: [...Array(D / 2)].map((_, k) => fmt(invFreq(k, D), 3)).join(' '), tone: 5 },
  ]))
}

ctl.start()
