// nn-tanh/tool.js -- lesson 3 of neural-networks: where a neuron stops learning. tanh centres the
// output on zero, and where it saturates its slope, and the gradient that flows back through it,
// falls toward zero. The curve, the slope and the shaded saturated band are forward and derivative
// of gHashTag/t27 specs/ml/activation/tanh_activation.t27, compiled to wasm (./logic.js). Words are
// SAY_ and numbers K_ constants of specs/widgets/nn-tanh.t27.
import { batchAt, derivative, forward } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, svgEl, tiles } from '../nn-kit.js'

const X0 = centi(K('K_X_LO_C', -400)), X1 = centi(K('K_X_HI_C', 400))
const SAT = centi(K('K_SAT_C', 10))
const ctl = controls([
  { key: 'x', label: say('SAY_X'), min: X0, max: X1, step: centi(K('K_X_STEP_C', 5)), fmt: (v) => fmt(v, 2) },
], { names: W.SAY_PRESET_NAMES, values: { x: K('K_PRESET_X_C', []).map(centi) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_F'), COLORS[0]], [say('SAY_DF'), COLORS[1], true], [say('SAY_SAT_BAND'), COLORS[6]]]), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 330, x0: X0, x1: X1, y0: -1.1, y1: 1.1, xticks: K('K_X_TICKS', []), yticks: K('K_Y_TICKS', []), xlabel: say('SAY_X') }
  const p = plot(svg, o)
  // The saturated band: every sampled x whose slope is under K_SAT, shaded.
  const pts = sample((x) => derivative(x), X0, X1, 200)
  const dx = (X1 - X0) / 200
  for (const [x, d] of pts) if (d < SAT) svg.append(svgEl('rect', { x: p.x(x - dx / 2), y: p.top, width: Math.max(1, p.x(x + dx / 2) - p.x(x - dx / 2)), height: p.clampY(-Infinity) - p.top, fill: COLORS[6], opacity: 0.12 }))
  p.line(sample((x) => forward(x), X0, X1), COLORS[0], 3)
  p.line(pts, COLORS[1], 2, { 'stroke-dasharray': '6 5' })
  cursor(svg, p, s.x, [[forward(s.x), COLORS[0]], [derivative(s.x), COLORS[1]]])
  dragX(svg, p, o, (x) => ctl.set('x', x))
  const d = derivative(s.x)
  stat.replaceChildren(tiles([
    { label: say('SAY_OUT'), value: fmt(forward(s.x), 4), tone: 0 },
    { label: say('SAY_GRAD'), value: fmt(d, 4), tone: d < SAT ? 'bad' : 1 },
    { label: say('SAY_BATCH'), value: [0, 1, 2].map((i) => fmt(batchAt(i), 3)).join(' '), tone: 2 },
    { label: say('SAY_STATE'), value: d < SAT ? say('SAY_SATURATED') : say('SAY_LEARNING'), tone: d < SAT ? 'bad' : 0 },
  ]))
}

ctl.start()
