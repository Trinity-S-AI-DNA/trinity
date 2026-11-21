// nn-gelu/tool.js -- lesson 4 of neural-networks: why transformers bend below zero. GELU weighs x
// by the chance a standard normal is below it, so it dips a little under zero before it rises. The
// exact form (through erf), the tanh form and the slope are forward_at and backward_at of
// gHashTag/t27 specs/ml/activation/gelu_activation.t27, compiled to wasm (./logic.js). Words are SAY_
// and numbers K_ constants of specs/widgets/nn-gelu.t27.
import { backwardAt, forwardAt } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, tiles } from '../nn-kit.js'

const X0 = centi(K('K_X_LO_C', -400)), X1 = centi(K('K_X_HI_C', 300))
const ctl = controls([
  { key: 'x', label: say('SAY_X'), min: X0, max: X1, step: centi(K('K_X_STEP_C', 5)), fmt: (v) => fmt(v, 2) },
], { names: W.SAY_PRESET_NAMES, values: { x: K('K_PRESET_X_C', []).map(centi) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_EXACT'), COLORS[0]], [say('SAY_TANH'), COLORS[3], true], [say('SAY_DF'), COLORS[2], true]]), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 340, x0: X0, x1: X1, y0: centi(K('K_Y_LO_C', -50)), y1: centi(K('K_Y_HI_C', 300)), xticks: K('K_X_TICKS', []), yticks: K('K_Y_TICKS_C', []).map(centi), xlabel: say('SAY_X') }
  const p = plot(svg, o)
  p.line(sample((x) => backwardAt(x, false), X0, X1), COLORS[2], 1.5, { 'stroke-dasharray': '3 4' })
  p.line(sample((x) => forwardAt(x, false), X0, X1), COLORS[0], 4)
  p.line(sample((x) => forwardAt(x, true), X0, X1), COLORS[3], 2, { 'stroke-dasharray': '7 6' })
  cursor(svg, p, s.x, [[forwardAt(s.x, false), COLORS[0]], [backwardAt(s.x, false), COLORS[2]]])
  dragX(svg, p, o, (x) => ctl.set('x', x))
  stat.replaceChildren(tiles([
    { label: say('SAY_EXACT'), value: fmt(forwardAt(s.x, false), 5), tone: 0 },
    { label: say('SAY_TANH'), value: fmt(forwardAt(s.x, true), 5), tone: 3 },
    { label: say('SAY_DF'), value: fmt(backwardAt(s.x, false), 4), tone: 2 },
    { label: say('SAY_DF_TANH'), value: fmt(backwardAt(s.x, true), 4), tone: 5 },
  ]))
}

ctl.start()
