// nn-embedding/tool.js -- lesson 8 of neural-networks: how a word becomes numbers. An embedding is a
// table with one row per token; looking a token up copies its row, and learning sends the gradient
// back only to the rows that were looked up. Every cell is lookup_at or grad_at of gHashTag/t27
// specs/ml/layers/embedding_layer.t27, compiled to wasm (./logic.js): vocab 4, width 2. Words are
// SAY_ and numbers K_ constants of specs/widgets/nn-embedding.t27.
import { gradAt, lookupAt } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, fill, fmt, heat, root, say, source, tiles, tone } from '../nn-kit.js'

const V = K('K_VOCAB', 4), D = K('K_WIDTH', 2)
const tokens = W.SAY_TOKEN_NAMES ?? []
const ctl = controls([
  { key: 'a', label: say('SAY_FIRST'), kind: 'choice', options: tokens },
  { key: 'b', label: say('SAY_SECOND'), kind: 'choice', options: tokens },
], { names: W.SAY_PRESET_NAMES, values: { a: K('K_PRESET_A', []), b: K('K_PRESET_B', []) } }, draw)

const table = canvas('nn-heat', say('SAY_TABLE_LABEL'))
const out = canvas('nn-heat', say('SAY_OUT_LABEL'))
const grad = canvas('nn-heat', say('SAY_GRAD_LABEL'))
const stat = el('div')
const cols = [...Array(D)].map((_, j) => `${say('SAY_DIM')} ${j}`)
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, el('p', { class: 'dk-label' }, say('SAY_TABLE_LABEL')), table,
  el('div', { class: 'nn-two' }, el('div', {}, el('p', { class: 'dk-label' }, say('SAY_OUT_LABEL')), out), el('div', {}, el('p', { class: 'dk-label' }, say('SAY_GRAD_LABEL')), grad)), stat, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  // Row v of the table is what looking v up returns: lookup_at(v, v, j).
  heat(table, { rows: V, cols: D, value: (r, c) => lookupAt(r, r, c), lo: 0, hi: 31, rowLabels: tokens, colLabels: cols, w: 300, cell: 104, fmt: (v) => fmt(v, 0), mark: (r) => (r === s.a || r === s.b ? 'on' : 'dim') })
  heat(out, { rows: 2, cols: D, value: (r, c) => lookupAt(s.a, s.b, r * D + c), lo: 0, hi: 31, rowLabels: [tokens[s.a], tokens[s.b]], colLabels: cols, w: 300, cell: 104, fmt: (v) => fmt(v, 0) })
  heat(grad, { rows: V, cols: D, value: (r, c) => gradAt(s.a, s.b, r * D + c), color: (v) => tone(v, 6), rowLabels: tokens, colLabels: cols, w: 300, cell: 104, fmt: (v) => fmt(v, 0), mark: (r) => (r === s.a || r === s.b ? 'on' : '') })
  stat.replaceChildren(tiles([
    { label: say('SAY_ROWS_TOUCHED'), value: s.a === s.b ? say('SAY_ONE_ROW') : say('SAY_TWO_ROWS'), tone: 1 },
    { label: say('SAY_VECTORS'), value: [0, 1, 2, 3].map((i) => fmt(lookupAt(s.a, s.b, i), 0)).join(' '), tone: 5 },
    { label: fill(say('SAY_GRAD_ROW'), tokens[s.a]), value: [0, 1].map((j) => fmt(gradAt(s.a, s.b, s.a * D + j), 0)).join(', '), tone: 0 },
    { label: fill(say('SAY_GRAD_ROW'), tokens[s.b]), value: [0, 1].map((j) => fmt(gradAt(s.a, s.b, s.b * D + j), 0)).join(', '), tone: 2 },
  ]))
}

ctl.start()
