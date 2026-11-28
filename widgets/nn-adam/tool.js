// nn-adam/tool.js -- lesson 18 of neural-networks: the optimizer most networks are trained with.
// Adam keeps a running mean of the gradient (m) and of its square (v), corrects both for starting at
// zero, and steps by m / sqrt(v): so its first step is lr times the sign of the gradient, whatever
// its size. Every point is descend and every bar first_step of gHashTag/t27
// specs/ml/optimizer/adam.t27, compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants
// of specs/widgets/nn-adam.t27.
import { descend, firstStep } from './logic.js'
import { COLORS, K, W, ask, bars, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, say, source, svgEl, tiles } from '../nn-kit.js'

const NMAX = K('K_STEPS_HI', 200)
const MIN = K('K_MINIMUM', 3)
const G0 = centi(K('K_G_LO_C', -5000)), G1 = centi(K('K_G_HI_C', 5000))
const grad = (key, i) => ({ key, label: `${say('SAY_G')} ${i}`, min: G0, max: G1, step: 0.5, fmt: (v) => fmt(v, 1) })
const ctl = controls([
  { key: 'n', label: say('SAY_STEPS'), min: 1, max: NMAX },
  grad('g0', 0), grad('g1', 1), grad('g2', 2),
], { names: W.SAY_PRESET_NAMES, values: { n: K('K_PRESET_STEPS', []), g0: K('K_PRESET_G0_C', []).map(centi), g1: K('K_PRESET_G1_C', []).map(centi), g2: K('K_PRESET_G2_C', []).map(centi) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const first = canvas('nn-bars', say('SAY_FIRST_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_PATH'), COLORS[0]], [say('SAY_MIN'), '#ffffff', true]]), el('p', { class: 'dk-label' }, say('SAY_FIRST_LABEL')), first, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 320, x0: 0, x1: NMAX, y0: K('K_Y_LO', 0), y1: K('K_Y_HI', 4), xticks: K('K_STEP_TICKS', []), yticks: K('K_Y_TICKS', []), xlabel: say('SAY_STEPS') }
  const p = plot(svg, o)
  svg.append(svgEl('line', { x1: p.left, x2: 640 - p.right, y1: p.clampY(MIN), y2: p.clampY(MIN), stroke: '#fff', 'stroke-dasharray': '6 6', opacity: 0.7 }))
  p.line([...Array(NMAX + 1)].map((_, k) => [k, descend(k)]), COLORS[0], 3)
  cursor(svg, p, s.n, [[descend(s.n), COLORS[1]]])
  dragX(svg, p, o, (n) => ctl.set('n', Math.round(n)))
  // Bars: the first moment m, which grows with the gradient; under each, the weight after the step,
  // which moves by the same lr whatever the gradient was.
  const m = [0, 1, 2].map((i) => firstStep(s.g0, s.g1, s.g2, 1, i))
  bars(first, { values: m, labels: [0, 1, 2].map((i) => `${say('SAY_W')} ${i} = ${fmt(firstStep(s.g0, s.g1, s.g2, 0, i), 4)}`), colors: m.map((v) => (v < 0 ? COLORS[3] : COLORS[0])), lo: K('K_BAR_LO', -5), hi: K('K_BAR_HI', 5), h: 230, ticks: K('K_BAR_TICKS', []), fmt: (v) => `m ${fmt(v, 2)}` })
  stat.replaceChildren(tiles([
    { label: say('SAY_X_NOW'), value: fmt(descend(s.n), 5), tone: 0 },
    { label: say('SAY_X_ONE'), value: fmt(descend(1), 4), tone: 1 },
    { label: say('SAY_W_AFTER'), value: [0, 1, 2].map((i) => fmt(firstStep(s.g0, s.g1, s.g2, 0, i), 4)).join(' '), tone: 2 },
    { label: say('SAY_V'), value: [0, 1, 2].map((i) => fmt(firstStep(s.g0, s.g1, s.g2, 2, i), 4)).join(' '), tone: 5 },
  ]))
}

ctl.start()
