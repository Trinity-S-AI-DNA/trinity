// nn-attention/tool.js -- lesson 24 of neural-networks: how a word decides which other words to read.
// Attention scores every query against every key, turns each row of scores into weights with a
// softmax and averages the values by them; a causal mask stops a position from reading the future.
// Every weight and output is forward_at of gHashTag/t27 specs/ml/recurrent/attention_mechanism.t27,
// compiled to wasm (./logic.js): 3 positions, d_model 4, 2 heads, the spec's own q, k and v. Words
// are SAY_ and numbers K_ constants of specs/widgets/nn-attention.t27.
import { forwardAt } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, fill, fmt, heat, heatTone, root, say, source, tiles, tone } from '../nn-kit.js'

const N = K('K_SEQ', 3), D = K('K_D_MODEL', 4), H = K('K_HEADS', 2)
const ctl = controls([
  { key: 'causal', label: say('SAY_CAUSAL'), kind: 'toggle' },
  { key: 'q', kind: 'hidden', min: 0, max: 2 },
], { names: W.SAY_PRESET_NAMES, values: { causal: K('K_PRESET_CAUSAL', []), q: K('K_PRESET_Q', []) } }, draw)

const heads = [...Array(H)].map((_, h) => canvas('nn-heat', `${say('SAY_HEAD')} ${h}`))
const out = canvas('nn-heat', say('SAY_OUT_LABEL'))
const stat = el('div')
const pos = [...Array(N)].map((_, i) => `${say('SAY_POS')} ${i}`)
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, el('p', { class: 'dk-note' }, say('SAY_TAP')),
  el('div', { class: 'nn-two' }, ...heads.map((svg, h) => el('div', {}, el('p', { class: 'dk-label' }, `${say('SAY_HEAD')} ${h}: ${say('SAY_ROWS')}`), svg))),
  el('p', { class: 'dk-label' }, say('SAY_OUT_LABEL')), out, stat, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const c = !!s.causal
  const w = (h, i, j) => forwardAt(c, 1, (h * N + i) * N + j)
  heads.forEach((svg, h) => heat(svg, { rows: N, cols: N, value: (i, j) => w(h, i, j), color: (v) => heatTone(v), rowLabels: pos, colLabels: pos, labelWidth: 70, w: 400, cell: 100, fmt: (v) => fmt(v, 3), mark: (i) => (i === s.q ? 'on' : ''), onTap: (i) => ctl.set('q', i) }))
  heat(out, { rows: N, cols: D, value: (i, k) => forwardAt(c, 0, i * D + k), color: (v) => tone(v, 1.2), rowLabels: pos, colLabels: [...Array(D)].map((_, k) => `${say('SAY_DIM')} ${k}`), labelWidth: 70, w: 640, cell: 110, fmt: (v) => fmt(v, 3), mark: (i) => (i === s.q ? 'on' : ''), onTap: (i) => ctl.set('q', i) })
  stat.replaceChildren(tiles([
    { label: `${say('SAY_HEAD')} 0, ${pos[s.q]}`, value: [0, 1, 2].map((j) => fmt(w(0, s.q, j), 3)).join(' '), tone: 2 },
    { label: `${say('SAY_HEAD')} 1, ${pos[s.q]}`, value: [0, 1, 2].map((j) => fmt(w(1, s.q, j), 3)).join(' '), tone: 3 },
    { label: say('SAY_MASK'), value: c ? say('SAY_MASK_ON') : say('SAY_MASK_OFF'), tone: c ? 1 : 5 },
    { label: fill(say('SAY_OUT_ROW'), pos[s.q]), value: [0, 1, 2, 3].map((k) => fmt(forwardAt(c, 0, s.q * D + k), 2)).join(' '), tone: 0 },
  ]))
}

ctl.start()
