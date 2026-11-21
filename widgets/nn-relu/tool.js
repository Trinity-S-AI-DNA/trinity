// nn-relu/tool.js -- lesson 1 of neural-networks: what a neuron does with a negative number. ReLU
// passes a positive input and zeroes a negative one; a leaky slope lets a little through. It computes
// nothing itself: every point of both curves and every tile is forward_at and backward_at of
// gHashTag/t27 specs/ml/activation/relu_activation.t27, compiled to wasm (./logic.js). Words are SAY_
// and numbers K_ constants of specs/widgets/nn-relu.t27.
import { backwardAt, forwardAt } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, tiles } from '../nn-kit.js'

const X0 = centi(K('K_X_LO_C', -400)), X1 = centi(K('K_X_HI_C', 400))
const f = (x, s) => forwardAt(x, 0, 0, s, 0)
const df = (x, s) => backwardAt(x, 0, 0, s, 0)
const ctl = controls([
  { key: 'x', label: say('SAY_X'), min: X0, max: X1, step: centi(K('K_X_STEP_C', 5)), fmt: (v) => fmt(v, 2) },
  { key: 'slope', label: say('SAY_SLOPE'), min: 0, max: centi(K('K_SLOPE_MAX_C', 30)), step: 0.01, fmt: (v) => fmt(v, 2) },
], { names: W.SAY_PRESET_NAMES, values: { x: K('K_PRESET_X_C', []).map(centi), slope: K('K_PRESET_SLOPE_C', []).map(centi) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_F'), COLORS[0]], [say('SAY_DF'), COLORS[1], true]]), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 340, x0: X0, x1: X1, y0: centi(K('K_Y_LO_C', -100)), y1: centi(K('K_Y_HI_C', 400)), xticks: K('K_X_TICKS', []), yticks: K('K_Y_TICKS', []), xlabel: say('SAY_X') }
  const p = plot(svg, o)
  p.line(sample((x) => f(x, s.slope), X0, X1), COLORS[0], 3)
  p.line(sample((x) => df(x, s.slope), X0, X1, 320), COLORS[1], 2, { 'stroke-dasharray': '6 5' })
  cursor(svg, p, s.x, [[f(s.x, s.slope), COLORS[0]], [df(s.x, s.slope), COLORS[1]]])
  dragX(svg, p, o, (x) => ctl.set('x', x))
  const fx = K('K_FIXTURE_C', []).map(centi)
  stat.replaceChildren(tiles([
    { label: say('SAY_OUT'), value: fmt(f(s.x, s.slope), 3), tone: 0 },
    { label: say('SAY_GRAD'), value: fmt(df(s.x, s.slope), 3), tone: 1 },
    { label: say('SAY_BATCH'), value: [0, 1, 2].map((i) => fmt(forwardAt(fx[0], fx[1], fx[2], s.slope, i), 2)).join(' '), tone: 2 },
    { label: say('SAY_BATCH_GRAD'), value: [0, 1, 2].map((i) => fmt(backwardAt(fx[0], fx[1], fx[2], s.slope, i), 2)).join(' '), tone: 5 },
  ]))
}

ctl.start()
