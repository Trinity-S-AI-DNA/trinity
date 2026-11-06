// nn-silu/tool.js -- lesson 5 of neural-networks: one knob between a smooth curve and ReLU. Swish is
// x times sigmoid(beta x): at beta 1 it is SiLU, and as beta grows it closes on ReLU. Both curves
// and every tile are forward and derivative of gHashTag/t27 specs/ml/activation/
// silu_swish_activation.t27, compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants
// of specs/widgets/nn-silu.t27.
import { batchAt, derivative, forward } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, tiles } from '../nn-kit.js'

const X0 = centi(K('K_X_LO_C', -500)), X1 = centi(K('K_X_HI_C', 500))
const ctl = controls([
  { key: 'x', label: say('SAY_X'), min: X0, max: X1, step: centi(K('K_X_STEP_C', 2)), fmt: (v) => fmt(v, 2) },
  { key: 'beta', label: say('SAY_BETA'), min: centi(K('K_BETA_LO_C', 25)), max: centi(K('K_BETA_HI_C', 800)), step: centi(K('K_BETA_STEP_C', 25)), fmt: (v) => fmt(v, 2) },
], { names: W.SAY_PRESET_NAMES, values: { x: K('K_PRESET_X_C', []).map(centi), beta: K('K_PRESET_BETA_C', []).map(centi) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_F'), COLORS[0]], [say('SAY_SILU'), COLORS[5], true], [say('SAY_DF'), COLORS[1], true]]), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 340, x0: X0, x1: X1, y0: centi(K('K_Y_LO_C', -100)), y1: centi(K('K_Y_HI_C', 500)), xticks: K('K_X_TICKS', []), yticks: K('K_Y_TICKS', []), xlabel: say('SAY_X') }
  const p = plot(svg, o)
  p.line(sample((x) => forward(x, 1), X0, X1), COLORS[5], 1.5, { 'stroke-dasharray': '4 5' })
  p.line(sample((x) => derivative(x, s.beta), X0, X1), COLORS[1], 2, { 'stroke-dasharray': '6 5' })
  p.line(sample((x) => forward(x, s.beta), X0, X1), COLORS[0], 3.5)
  cursor(svg, p, s.x, [[forward(s.x, s.beta), COLORS[0]], [derivative(s.x, s.beta), COLORS[1]]])
  dragX(svg, p, o, (x) => ctl.set('x', x))
  const fx = K('K_FIXTURE_C', []).map(centi)
  stat.replaceChildren(tiles([
    { label: say('SAY_OUT'), value: fmt(forward(s.x, s.beta), 4), tone: 0 },
    { label: say('SAY_GRAD'), value: fmt(derivative(s.x, s.beta), 4), tone: 1 },
    { label: say('SAY_SILU_AT'), value: fmt(forward(s.x, 1), 4), tone: 5 },
    { label: say('SAY_BATCH'), value: [0, 1, 2].map((i) => fmt(batchAt(fx[0], fx[1], fx[2], i), 3)).join(' '), tone: 2 },
  ]))
}

ctl.start()
