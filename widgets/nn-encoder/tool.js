// nn-encoder/tool.js -- lesson 26 of neural-networks: what one transformer block does. Self-attention
// mixes the positions, a residual adds the input back, a two-layer feed-forward net works on each
// position, and layer norm keeps every row at mean 0 and variance 1; pre-norm moves the norms in
// front of each sublayer. Every value is block_at and attention_at of gHashTag/t27
// specs/ml/transformer/encoder_block.t27, compiled to wasm (./logic.js): 3 positions, d_model 4, 2
// heads, d_ff 8, the spec's own weights. Words are SAY_ and numbers K_ constants of specs/widgets/nn-encoder.t27.
import { attentionAt, blockAt } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, fmt, heat, heatTone, root, say, source, tiles, tone } from '../nn-kit.js'

const N = K('K_SEQ', 3), D = K('K_D_MODEL', 4), H = K('K_HEADS', 2)
const ctl = controls([
  { key: 'pre', label: say('SAY_PRE_NORM'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { pre: K('K_PRESET_PRE', []) } }, draw)

const out = canvas('nn-heat', say('SAY_OUT_LABEL'))
const heads = [...Array(H)].map((_, h) => canvas('nn-heat', `${say('SAY_HEAD')} ${h}`))
const stat = el('div')
const pos = [...Array(N)].map((_, i) => `${say('SAY_POS')} ${i}`)
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, el('p', { class: 'dk-label' }, say('SAY_OUT_LABEL')), out, stat,
  el('p', { class: 'dk-label' }, say('SAY_ATT_LABEL')), el('div', { class: 'nn-two' }, ...heads.map((svg, h) => el('div', {}, el('p', { class: 'nn-cap' }, `${say('SAY_HEAD')} ${h}`), svg))), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const pre = !!s.pre
  heat(out, { rows: N, cols: D, value: (i, k) => blockAt(pre, 0, i * D + k), color: (v) => tone(v, 2), rowLabels: pos, colLabels: [...Array(D)].map((_, k) => `${say('SAY_DIM')} ${k}`), labelWidth: 70, w: 640, cell: 110, fmt: (v) => fmt(v, 3) })
  heads.forEach((svg, h) => heat(svg, { rows: N, cols: N, value: (i, j) => attentionAt(1, (h * N + i) * N + j), color: (v) => heatTone(v), rowLabels: pos, colLabels: pos, labelWidth: 70, w: 400, cell: 100, fmt: (v) => fmt(v, 3) }))
  stat.replaceChildren(tiles([
    { label: say('SAY_MEANS'), value: [0, 1, 2].map((i) => fmt(blockAt(pre, 1, i), 3)).join(' '), tone: 0 },
    { label: say('SAY_VARS'), value: [0, 1, 2].map((i) => fmt(blockAt(pre, 2, i), 3)).join(' '), tone: 1 },
    { label: say('SAY_ORDER'), value: pre ? say('SAY_ORDER_PRE') : say('SAY_ORDER_POST'), tone: 2 },
    { label: say('SAY_ATT_ROW'), value: [0, 1, 2].map((j) => fmt(attentionAt(1, j), 3)).join(' '), tone: 5 },
  ]))
}

ctl.start()
