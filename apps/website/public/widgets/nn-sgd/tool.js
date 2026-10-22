// nn-sgd/tool.js -- lesson 16 of neural-networks: how a network walks downhill. Gradient descent
// moves a weight against its gradient by lr every step; momentum keeps some of the last move, and
// Nesterov looks one step ahead. Every point is descend(lr, momentum, nesterov, n) of gHashTag/t27
// specs/ml/optimizer/sgd.t27, compiled to wasm (./logic.js): the spec minimises (x - 3)^2 from x = 0.
// Words are SAY_ and numbers K_ constants of specs/widgets/nn-sgd.t27.
import { descend } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, say, source, svgEl, tiles } from '../nn-kit.js'

const NMAX = K('K_STEPS_HI', 100)
const MIN = K('K_MINIMUM', 3)
const ctl = controls([
  { key: 'lr', label: say('SAY_LR'), min: centi(K('K_LR_LO_C', 1)), max: centi(K('K_LR_HI_C', 100)), step: 0.01, fmt: (v) => fmt(v, 2) },
  { key: 'mom', label: say('SAY_MOMENTUM'), min: 0, max: centi(K('K_MOM_HI_C', 95)), step: 0.05, fmt: (v) => fmt(v, 2) },
  { key: 'nest', label: say('SAY_NESTEROV'), kind: 'toggle' },
  { key: 'n', label: say('SAY_STEPS'), min: 1, max: NMAX },
], { names: W.SAY_PRESET_NAMES, values: { lr: K('K_PRESET_LR_C', []).map(centi), mom: K('K_PRESET_MOM_C', []).map(centi), nest: K('K_PRESET_NEST', []), n: K('K_PRESET_STEPS', []) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_PATH'), COLORS[0]], [say('SAY_PLAIN'), COLORS[5], true], [say('SAY_MIN'), '#ffffff', true]]), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 340, x0: 0, x1: NMAX, y0: K('K_Y_LO', -1), y1: K('K_Y_HI', 7), xticks: K('K_STEP_TICKS', []), yticks: K('K_Y_TICKS', []), xlabel: say('SAY_STEPS') }
  const p = plot(svg, o)
  svg.append(svgEl('line', { x1: p.left, x2: 640 - p.right, y1: p.clampY(MIN), y2: p.clampY(MIN), stroke: '#fff', 'stroke-dasharray': '6 6', opacity: 0.7 }))
  const path = (lr, mom, nest, n) => [...Array(n + 1)].map((_, k) => [k, descend(lr, mom, nest, k)])
  p.line(path(s.lr, 0, false, NMAX), COLORS[5], 1.5, { 'stroke-dasharray': '4 5' })
  const run = path(s.lr, s.mom, !!s.nest, s.n)
  p.line(run, COLORS[0], 3)
  for (const [k, x] of run) svg.append(svgEl('circle', { cx: p.x(k), cy: p.clampY(x), r: s.n <= 30 ? 4 : 2, fill: COLORS[0] }))
  cursor(svg, p, s.n, [[descend(s.lr, s.mom, !!s.nest, s.n), COLORS[1]]])
  dragX(svg, p, o, (n) => ctl.set('n', Math.round(n)))
  stat.replaceChildren(tiles([
    { label: say('SAY_X_NOW'), value: fmt(descend(s.lr, s.mom, !!s.nest, s.n), 5), tone: 0 },
    { label: say('SAY_X_PLAIN'), value: fmt(descend(s.lr, 0, false, s.n), 5), tone: 5 },
    { label: say('SAY_X_ONE'), value: fmt(descend(s.lr, s.mom, !!s.nest, 1), 4), tone: 1 },
    { label: say('SAY_MIN'), value: fmt(MIN, 0), tone: 2 },
  ]))
}

ctl.start()
