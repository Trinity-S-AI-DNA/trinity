// nn-elu/tool.js -- lesson 6 of neural-networks: a negative side with a floor. ELU is x above zero
// and alpha (e^x - 1) below, so it never falls under -alpha and its slope never quite dies. The
// curve, the slope and the floor (forward far to the left) are forward and derivative of
// gHashTag/t27 specs/ml/activation/elu_activation.t27, compiled to wasm (./logic.js). Words are SAY_
// and numbers K_ constants of specs/widgets/nn-elu.t27.
import { batchAt, derivative, forward } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, svgEl, tiles } from '../nn-kit.js'

const X0 = centi(K('K_X_LO_C', -500)), X1 = centi(K('K_X_HI_C', 300))
const FAR = -K('K_FAR_LEFT', 100)
const ctl = controls([
  { key: 'x', label: say('SAY_X'), min: X0, max: X1, step: centi(K('K_X_STEP_C', 5)), fmt: (v) => fmt(v, 2) },
  { key: 'alpha', label: say('SAY_ALPHA'), min: centi(K('K_ALPHA_LO_C', 10)), max: centi(K('K_ALPHA_HI_C', 200)), step: centi(K('K_ALPHA_STEP_C', 5)), fmt: (v) => fmt(v, 2) },
], { names: W.SAY_PRESET_NAMES, values: { x: K('K_PRESET_X_C', []).map(centi), alpha: K('K_PRESET_ALPHA_C', []).map(centi) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_F'), COLORS[0]], [say('SAY_DF'), COLORS[1], true], [say('SAY_FLOOR'), COLORS[6], true]]), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 340, x0: X0, x1: X1, y0: centi(K('K_Y_LO_C', -220)), y1: centi(K('K_Y_HI_C', 300)), xticks: K('K_X_TICKS', []), yticks: K('K_Y_TICKS', []), xlabel: say('SAY_X') }
  const p = plot(svg, o)
  const floor = forward(FAR, s.alpha)
  svg.append(svgEl('line', { x1: p.left, x2: 640 - p.right, y1: p.clampY(floor), y2: p.clampY(floor), stroke: COLORS[6], 'stroke-width': 2, 'stroke-dasharray': '8 6' }))
  p.line(sample((x) => derivative(x, s.alpha), X0, X1, 320), COLORS[1], 2, { 'stroke-dasharray': '6 5' })
  p.line(sample((x) => forward(x, s.alpha), X0, X1), COLORS[0], 3.5)
  cursor(svg, p, s.x, [[forward(s.x, s.alpha), COLORS[0]], [derivative(s.x, s.alpha), COLORS[1]]])
  dragX(svg, p, o, (x) => ctl.set('x', x))
  stat.replaceChildren(tiles([
    { label: say('SAY_OUT'), value: fmt(forward(s.x, s.alpha), 4), tone: 0 },
    { label: say('SAY_GRAD'), value: fmt(derivative(s.x, s.alpha), 4), tone: 1 },
    { label: say('SAY_FLOOR'), value: fmt(floor, 4), tone: 6 },
    { label: say('SAY_BATCH'), value: [0, 1, 2].map((i) => fmt(batchAt(i), 3)).join(' '), tone: 2 },
  ]))
}

ctl.start()
