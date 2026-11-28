// nn-dropout/tool.js -- lesson 9 of neural-networks: why a network trains with neurons switched off.
// Dropout zeroes some units while training; inverted dropout scales the survivors up by 1 / (1 - p)
// so inference needs no change, classic dropout scales at inference instead. Every value is
// forward_at or backward_at of gHashTag/t27 specs/ml/layers/dropout_layer.t27, compiled to wasm
// (./logic.js): input (1, 2, 3, 4), p 0.5, the spec's mask keeps units 0 and 2. Words are SAY_ and
// numbers K_ constants of specs/widgets/nn-dropout.t27.
import { backwardAt, forwardAt } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, fmt, heat, root, say, source, tiles, tone } from '../nn-kit.js'

const N = K('K_UNITS', 4)
const ctl = controls([
  { key: 'train', label: say('SAY_TRAINING'), kind: 'toggle' },
  { key: 'scaled', label: say('SAY_SCALED'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { train: K('K_PRESET_TRAIN', []), scaled: K('K_PRESET_SCALED', []) } }, draw)

const grid = canvas('nn-heat', say('SAY_GRID_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, grid, stat, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const train = !!s.train, scaled = !!s.scaled
  // Inference with inverted dropout is the identity, so it shows the input itself.
  const rows = [(i) => forwardAt(false, true, i), (i) => forwardAt(train, scaled, i), (i) => (train ? backwardAt(scaled, i) : 1)]
  heat(grid, { rows: 3, cols: N, value: (r, c) => rows[r](c), color: (v) => tone(v, 8), rowLabels: [say('SAY_IN'), say('SAY_OUT'), say('SAY_GRAD')], labelWidth: 96, colLabels: [...Array(N)].map((_, i) => `${say('SAY_UNIT')} ${i}`), w: 640, cell: 120, fmt: (v) => fmt(v, 2), mark: (r, c) => (r > 0 && train && forwardAt(true, scaled, c) === 0 ? 'dim' : '') })
  stat.replaceChildren(tiles([
    { label: say('SAY_MODE'), value: train ? say('SAY_MODE_TRAIN') : say('SAY_MODE_INFER'), tone: train ? 1 : 2 },
    { label: say('SAY_KEPT_UNIT'), value: fmt(forwardAt(train, scaled, 0), 2), tone: 0 },
    { label: say('SAY_DROPPED_UNIT'), value: fmt(forwardAt(train, scaled, 1), 2), tone: 6 },
    { label: say('SAY_GRAD_KEPT'), value: fmt(backwardAt(scaled, 0), 2), tone: 5 },
  ]))
}

ctl.start()
