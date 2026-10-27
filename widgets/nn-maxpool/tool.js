// nn-maxpool/tool.js -- lesson 11 of neural-networks: what a network keeps when it shrinks a
// picture. Max pooling keeps the largest value of each window and remembers where it was; learning
// then sends each window's gradient to that one cell. Every output and argmax is pool_at, the
// output side out_side, every gradient backward_at of gHashTag/t27
// specs/ml/layers/maxpool2d_layer.t27, compiled to wasm (./logic.js), on the spec's 4 x 4 fixture
// (K_INPUT, held equal to it by the tests below the spec).
// Words are SAY_ and numbers K_ constants of specs/widgets/nn-maxpool.t27.
import { backwardAt, outSide, poolAt } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, fmt, heat, root, say, source, tiles, tone } from '../nn-kit.js'

const SIDE = K('K_SIDE', 4)
const INPUT = K('K_INPUT', [])
const KS = K('K_KERNELS', []), ST = K('K_STRIDES', [])
const ctl = controls([
  { key: 'cfg', label: say('SAY_CONFIG'), kind: 'choice', options: W.SAY_CONFIG_NAMES ?? [] },
  { key: 'cell', kind: 'hidden', min: 0, max: 8 },
  { key: 'grad', label: say('SAY_SHOW_GRAD'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { cfg: K('K_PRESET_CFG', []), cell: K('K_PRESET_CELL', []), grad: K('K_PRESET_GRAD', []) } }, draw)

const img = canvas('nn-heat', say('SAY_IN_LABEL'))
const out = canvas('nn-heat', say('SAY_OUT_LABEL'))
const stat = el('div')
const inLabel = el('p', { class: 'dk-label' })
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, el('div', { class: 'nn-two' }, el('div', {}, inLabel, img), el('div', {}, el('p', { class: 'dk-label' }, say('SAY_OUT_LABEL')), out)), stat, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const k = KS[s.cfg], st = ST[s.cfg], n = outSide(k, st)
  const cell = Math.min(s.cell, n * n - 1)
  const oy = Math.floor(cell / n), ox = cell % n
  const inWin = (r, c) => r >= oy * st && r < oy * st + k && c >= ox * st && c < ox * st + k
  const arg = poolAt(k, st, 1, cell)
  // The gradient path exists for the spec's 2 x 2, stride 2 case only (backward_at).
  const grad = !!s.grad && s.cfg === 0
  inLabel.textContent = grad ? say('SAY_GRAD_LABEL') : say('SAY_IN_LABEL')
  heat(img, { rows: SIDE, cols: SIDE, value: (r, c) => (grad ? backwardAt(r * SIDE + c) : INPUT[r * SIDE + c]), color: (v) => tone(v, 9), w: 400, cell: 92, fmt: (v) => fmt(v, 0), mark: (r, c) => (r * SIDE + c === arg ? 'on' : inWin(r, c) ? '' : 'dim') })
  heat(out, { rows: n, cols: n, value: (r, c) => poolAt(k, st, 0, r * n + c), color: (v) => tone(v, 9), w: 400, cell: Math.min(150, 300 / n), fmt: (v) => fmt(v, 0), mark: (r, c) => (r * n + c === cell ? 'on' : ''), onTap: (r, c) => ctl.set('cell', r * n + c) })
  stat.replaceChildren(tiles([
    { label: say('SAY_MAX'), value: fmt(poolAt(k, st, 0, cell), 0), tone: 0 },
    { label: say('SAY_ARGMAX'), value: fmt(arg, 0), tone: 1 },
    { label: say('SAY_OUT_SIDE'), value: `${n} x ${n}`, tone: 2 },
    { label: say('SAY_GRAD_AT_MAX'), value: s.cfg === 0 ? fmt(backwardAt(arg), 0) : say('SAY_NO_GRAD'), tone: 5 },
  ]))
}

ctl.start()
