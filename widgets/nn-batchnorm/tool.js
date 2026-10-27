// nn-batchnorm/tool.js -- lesson 12 of neural-networks: how a network copes with features on very
// different scales. Batch normalisation subtracts each feature's batch mean and divides by its batch
// spread, then scales by gamma and shifts by beta. Every normalised value is train_at, every
// inference value forward_at of gHashTag/t27 specs/ml/layers/batchnorm_layer.t27, compiled to wasm
// (./logic.js). The batch on the left is the spec's own (K_BATCH, held equal to it by the widget's
// tests). Words are SAY_ and numbers K_ constants of specs/widgets/nn-batchnorm.t27.
import { forwardAt, trainAt } from './logic.js'
import { COLORS, K, W, ask, bars, canvas, centi, controls, el, fill, fmt, heat, root, say, source, tiles, tone } from '../nn-kit.js'

const B = K('K_BATCH_ROWS', 4), F = K('K_FEATURES', 3)
const BATCH = K('K_BATCH', [])
const ctl = controls([
  { key: 'g', label: say('SAY_GAMMA'), min: 0, max: centi(K('K_GAMMA_HI_C', 300)), step: 0.05, fmt: (v) => fmt(v, 2) },
  { key: 'shifted', label: say('SAY_SHIFTED'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { g: K('K_PRESET_GAMMA_C', []).map(centi), shifted: K('K_PRESET_SHIFTED', []) } }, draw)

const before = canvas('nn-heat', say('SAY_BEFORE_LABEL'))
const after = canvas('nn-heat', say('SAY_AFTER_LABEL'))
const inf = canvas('nn-bars', say('SAY_INFER_LABEL'))
const stat = el('div')
const cols = [...Array(F)].map((_, f) => `${say('SAY_FEATURE')} ${f}`)
const rows = [...Array(B)].map((_, b) => `${say('SAY_SAMPLE')} ${b}`)
root.replaceChildren(ask(say('SAY_ASK')),
  el('div', { class: 'nn-two' }, el('div', {}, el('p', { class: 'dk-label' }, say('SAY_BEFORE_LABEL')), before), el('div', {}, el('p', { class: 'dk-label' }, say('SAY_AFTER_LABEL')), after)),
  stat, el('p', { class: 'dk-note' }, say('SAY_NOTE')), ctl.node, el('p', { class: 'dk-label' }, say('SAY_INFER_LABEL')), inf, source())

function draw(s) {
  heat(before, { rows: B, cols: F, value: (r, c) => BATCH[r * F + c], color: (v) => tone(v, 40), rowLabels: rows, colLabels: cols, w: 400, cell: 96, fmt: (v) => fmt(v, 0) })
  heat(after, { rows: B, cols: F, value: (r, c) => trainAt(r, c), color: (v) => tone(v, 1.5), rowLabels: rows, colLabels: cols, w: 400, cell: 96, fmt: (v) => fmt(v, 2) })
  const y = [0, 1, 2].map((i) => forwardAt(s.g, !!s.shifted, i))
  bars(inf, { values: y, labels: K('K_INFER_INPUT', []).map((x) => `${say('SAY_INPUT')} ${x}`), colors: [COLORS[2], COLORS[0], COLORS[1]], lo: centi(K('K_BAR_LO_C', -200)), hi: centi(K('K_BAR_HI_C', 1000)), h: 240, ticks: K('K_BAR_TICKS', []), fmt: (v) => fmt(v, 3) })
  stat.replaceChildren(tiles([
    { label: fill(say('SAY_COL'), 0), value: [0, 1, 2, 3].map((b) => fmt(trainAt(b, 0), 2)).join(' '), tone: 0 },
    { label: fill(say('SAY_COL'), 1), value: [0, 1, 2, 3].map((b) => fmt(trainAt(b, 1), 2)).join(' '), tone: 1 },
    { label: fill(say('SAY_COL'), 2), value: [0, 1, 2, 3].map((b) => fmt(trainAt(b, 2), 2)).join(' '), tone: 2 },
    { label: say('SAY_INFER'), value: y.map((v) => fmt(v, 2)).join(' '), tone: 5 },
  ]))
}

ctl.start()
