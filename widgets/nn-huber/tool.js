// nn-huber/tool.js -- lesson 15 of neural-networks: a loss that does not panic at an outlier. Huber
// is half the squared error inside delta and only linear outside it, so one wild miss pulls on the
// model with a bounded force. Both curves and every tile are huber_one and huber_two of gHashTag/t27
// specs/ml/loss/huber_loss.t27, compiled to wasm (./logic.js); the dashed curve is the same fn with
// a delta so wide (K_WIDE) that it never leaves its quadratic part. Words are SAY_ and numbers K_
// constants of specs/widgets/nn-huber.t27.
import { huberOne, huberTwo } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, svgEl, tiles } from '../nn-kit.js'

const E0 = centi(K('K_E_LO_C', -400)), E1 = centi(K('K_E_HI_C', 400))
const WIDE = K('K_WIDE', 1000)
const ctl = controls([
  { key: 'e', label: say('SAY_E'), min: E0, max: E1, step: 0.05, fmt: (v) => fmt(v, 2) },
  { key: 'delta', label: say('SAY_DELTA'), min: centi(K('K_DELTA_LO_C', 25)), max: centi(K('K_DELTA_HI_C', 300)), step: 0.05, fmt: (v) => fmt(v, 2) },
], { names: W.SAY_PRESET_NAMES, values: { e: K('K_PRESET_E_C', []).map(centi), delta: K('K_PRESET_DELTA_C', []).map(centi) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_HUBER'), COLORS[0]], [say('SAY_SQUARE'), COLORS[1], true], [say('SAY_DELTA'), COLORS[2], true]]), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 340, x0: E0, x1: E1, y0: 0, y1: centi(K('K_Y_HI_C', 800)), xticks: K('K_X_TICKS', []), yticks: K('K_Y_TICKS', []), xlabel: say('SAY_E') }
  const p = plot(svg, o)
  for (const d of [s.delta, -s.delta]) svg.append(svgEl('line', { x1: p.x(d), x2: p.x(d), y1: p.top, y2: p.clampY(-Infinity), stroke: COLORS[2], 'stroke-dasharray': '3 5', 'stroke-width': 2 }))
  p.line(sample((e) => huberOne(e, WIDE), E0, E1), COLORS[1], 2, { 'stroke-dasharray': '7 6' })
  p.line(sample((e) => huberOne(e, s.delta), E0, E1), COLORS[0], 4)
  cursor(svg, p, s.e, [[huberOne(s.e, s.delta), COLORS[0]], [huberOne(s.e, WIDE), COLORS[1]]])
  dragX(svg, p, o, (e) => ctl.set('e', e))
  const pair = K('K_PAIR_C', []).map(centi)
  stat.replaceChildren(tiles([
    { label: say('SAY_HUBER'), value: fmt(huberOne(s.e, s.delta), 4), tone: 0 },
    { label: say('SAY_SQUARE'), value: fmt(huberOne(s.e, WIDE), 4), tone: 1 },
    { label: fill2(say('SAY_PAIR'), pair), value: fmt(huberTwo(pair[0], pair[1], s.delta), 4), tone: 2 },
    { label: fill2(say('SAY_PAIR_SQ'), pair), value: fmt(huberTwo(pair[0], pair[1], WIDE), 4), tone: 6 },
  ]))
}
const fill2 = (w, v) => String(w).replace('{0}', fmt(v[0], 1)).replace('{1}', fmt(v[1], 1))

ctl.start()
