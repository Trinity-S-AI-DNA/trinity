// nn-sigmoid/tool.js -- lesson 2 of neural-networks: how a neuron turns any number into a
// probability. The curve, its slope and every tile are forward and derivative of gHashTag/t27
// specs/ml/activation/sigmoid_activation.t27, compiled to wasm (./logic.js); the slope is computed
// from the output, as the spec does. Words are SAY_ and numbers K_ constants of specs/widgets/nn-sigmoid.t27.
import { derivative, forward } from './logic.js'
import { COLORS, K, W, ask, bars, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, tiles } from '../nn-kit.js'

const X0 = centi(K('K_X_LO_C', -800)), X1 = centi(K('K_X_HI_C', 800))
const ctl = controls([
  { key: 'x', label: say('SAY_X'), min: X0, max: X1, step: centi(K('K_X_STEP_C', 10)), fmt: (v) => fmt(v, 1) },
], { names: W.SAY_PRESET_NAMES, values: { x: K('K_PRESET_X_C', []).map(centi) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const bar = canvas('nn-bars', say('SAY_BARS_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_F'), COLORS[0]], [say('SAY_DF'), COLORS[1], true]]), bar, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 320, x0: X0, x1: X1, y0: 0, y1: 1, xticks: K('K_X_TICKS', []), yticks: K('K_Y_TICKS_C', []).map(centi), xlabel: say('SAY_X') }
  const p = plot(svg, o)
  p.line(sample((x) => forward(x), X0, X1), COLORS[0], 3)
  p.line(sample((x) => derivative(forward(x)), X0, X1), COLORS[1], 2, { 'stroke-dasharray': '6 5' })
  const y = forward(s.x)
  cursor(svg, p, s.x, [[y, COLORS[0]], [derivative(y), COLORS[1]]])
  dragX(svg, p, o, (x) => ctl.set('x', x))
  bars(bar, { values: [y, derivative(y)], labels: [say('SAY_F'), say('SAY_DF')], colors: [COLORS[0], COLORS[1]], lo: 0, hi: 1, h: 200, ticks: K('K_Y_TICKS_C', []).map(centi), fmt: (v) => fmt(v, 4) })
  stat.replaceChildren(tiles([
    { label: say('SAY_OUT'), value: fmt(y, 4), tone: 0 },
    { label: say('SAY_GRAD'), value: fmt(derivative(y), 4), tone: 1 },
    { label: say('SAY_AT_ZERO'), value: fmt(derivative(forward(0)), 4), tone: 2 },
    { label: say('SAY_FAR'), value: fmt(derivative(forward(X1)), 6), tone: 6 },
  ]))
}

ctl.start()
