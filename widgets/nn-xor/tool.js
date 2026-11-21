// nn-xor/tool.js -- lesson 20 of neural-networks: can a network learn what one neuron cannot? XOR
// is not linearly separable, yet a 2-8-1 network trained by backpropagation gets all four cases
// right. Every output and every point of the loss curve is xor(epochs, which) of gHashTag/t27
// specs/ml/pathway/mlp.t27, compiled to wasm (./logic.js): the spec trains from its own fixed
// initial weights, lr 0.05, each call from scratch. The four squares are the four inputs the spec
// exposes, not the whole plane. Words are SAY_ and numbers K_ constants of specs/widgets/nn-xor.t27.
import { xor } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, cursor, dragX, el, fmt, heat, heatTone, plot, root, say, source, svgEl, tiles } from '../nn-kit.js'

const EMAX = K('K_EPOCHS_HI', 2000), STEP = K('K_CURVE_STEP', 25)
const LOG0 = K('K_LOG_LO', -14), LOG1 = K('K_LOG_HI', 1)
const ctl = controls([
  { key: 'e', label: say('SAY_EPOCHS'), min: 0, max: EMAX, step: STEP },
], { names: W.SAY_PRESET_NAMES, values: { e: K('K_PRESET_EPOCHS', []) } }, draw)

const svg = canvas('nn-curve', say('SAY_CURVE_LABEL'))
const grid = canvas('nn-heat', say('SAY_GRID_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, el('div', { class: 'nn-two' }, el('div', {}, el('p', { class: 'dk-label' }, say('SAY_GRID_LABEL')), grid), el('div', {}, el('p', { class: 'dk-label' }, say('SAY_CURVE_LABEL')), svg)), stat, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

// The loss after every STEP epochs, trained once and kept: each point is a full run of the spec.
let curve = null
const lossCurve = () => (curve ??= [...Array(EMAX / STEP)].map((_, k) => [(k + 1) * STEP, xor((k + 1) * STEP, 1)]))
const lg = (v) => Math.log10(Math.max(v, 10 ** LOG0))

function draw(s) {
  const cases = K('K_CASES', [])
  const out = [0, 1, 2, 3].map((c) => (s.e > 0 ? xor(s.e, 2 + c) : xor(0, 2 + c)))
  heat(grid, { rows: 2, cols: 2, value: (r, c) => out[r * 2 + c], color: (v) => heatTone(v), rowLabels: [`${say('SAY_A')} 0`, `${say('SAY_A')} 1`], colLabels: [`${say('SAY_B')} 0`, `${say('SAY_B')} 1`], labelWidth: 60, w: 400, cell: 150, fmt: (v) => fmt(v, 3) })
  svg.replaceChildren()
  const o = { w: 640, h: 330, x0: 0, x1: EMAX, y0: LOG0, y1: LOG1, xticks: K('K_EPOCH_TICKS', []), yticks: K('K_LOG_TICKS', []), yfmt: (t) => `1e${t}`, xlabel: say('SAY_EPOCHS') }
  const p = plot(svg, o)
  p.line(lossCurve().map(([e, v]) => [e, lg(v)]), COLORS[6], 3)
  const now = s.e > 0 ? xor(s.e, 1) : xor(1, 0)
  cursor(svg, p, s.e, [[lg(now), COLORS[1]]])
  dragX(svg, p, o, (e) => ctl.set('e', Math.round(e / STEP) * STEP))
  svg.append(svgEl('text', { x: p.x(EMAX) - 6, y: p.top + 16, class: 'dk-txt-dim', 'text-anchor': 'end' }, say('SAY_LOG_NOTE')))
  stat.replaceChildren(tiles([
    { label: say('SAY_FIRST_LOSS'), value: fmt(xor(Math.max(1, s.e), 0), 4), tone: 6 },
    { label: say('SAY_LAST_LOSS'), value: s.e > 0 ? xor(s.e, 1).toExponential(2) : say('SAY_UNTRAINED'), tone: 1 },
    { label: say('SAY_OUTPUTS'), value: out.map((v) => fmt(v, 2)).join(' '), tone: 0 },
    { label: say('SAY_TARGETS'), value: cases.join(' '), tone: 2 },
  ]))
}

ctl.start()
