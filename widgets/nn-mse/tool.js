// nn-mse/tool.js -- lesson 13 of neural-networks: how wrong is a guess, as one number. Mean squared
// error averages the squared misses, so a miss twice as far costs four times as much, and its
// gradient points each prediction back at its target. Every value is mse_at or mse_grad_at of
// gHashTag/t27 specs/ml/loss/mse_loss.t27, compiled to wasm (./logic.js), against the spec's targets
// (1, 2, 3) (K_TARGETS, held equal by the widget's tests). Words are SAY_ and numbers K_ constants of
// specs/widgets/nn-mse.t27.
import { mseAt, mseGradAt } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, svgEl, tiles } from '../nn-kit.js'

const T = K('K_TARGETS', [])
const P0 = centi(K('K_P_LO_C', -100)), P1 = centi(K('K_P_HI_C', 500))
const pred = (key, i) => ({ key, label: `${say('SAY_PRED')} ${i}`, min: P0, max: P1, step: 0.05, fmt: (v) => fmt(v, 2) })
const ctl = controls([pred('p0', 0), pred('p1', 1), pred('p2', 2)],
  { names: W.SAY_PRESET_NAMES, values: { p0: K('K_PRESET_P0_C', []).map(centi), p1: K('K_PRESET_P1_C', []).map(centi), p2: K('K_PRESET_P2_C', []).map(centi) } }, draw)

const misses = canvas('nn-curve', say('SAY_MISS_LABEL'))
const bowl = canvas('nn-curve', say('SAY_BOWL_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, misses, legend([[say('SAY_TARGET'), '#ffffff'], [say('SAY_PRED'), COLORS[0]], [say('SAY_GRAD'), COLORS[3]]]), el('p', { class: 'dk-note' }, say('SAY_BOWL')), bowl, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const p = [s.p0, s.p1, s.p2]
  misses.replaceChildren()
  const m = plot(misses, { w: 640, h: 300, x0: -0.5, x1: 2.5, y0: P0, y1: P1, xticks: [0, 1, 2], yticks: K('K_P_TICKS', []), xfmt: (i) => `${say('SAY_PRED')} ${i}`, left: 40 })
  for (let i = 0; i < 3; i++) {
    const g = mseGradAt(s.p0, s.p1, s.p2, i)
    misses.append(svgEl('line', { x1: m.x(i), x2: m.x(i), y1: m.clampY(T[i]), y2: m.clampY(p[i]), stroke: COLORS[6], 'stroke-width': 3, 'stroke-dasharray': '4 4' }))
    misses.append(svgEl('line', { x1: m.x(i) + 26, x2: m.x(i) + 26, y1: m.clampY(p[i]), y2: m.clampY(p[i] - g), stroke: COLORS[3], 'stroke-width': 4 }))
    misses.append(svgEl('circle', { cx: m.x(i), cy: m.clampY(T[i]), r: 8, fill: 'none', stroke: '#fff', 'stroke-width': 3 }))
    misses.append(svgEl('circle', { cx: m.x(i), cy: m.clampY(p[i]), r: 9, fill: COLORS[0] }))
  }
  bowl.replaceChildren()
  const o = { w: 640, h: 280, x0: P0, x1: P1, y0: 0, y1: centi(K('K_LOSS_HI_C', 600)), xticks: K('K_P_TICKS', []), yticks: K('K_LOSS_TICKS', []), xlabel: `${say('SAY_PRED')} 0` }
  const b = plot(bowl, o)
  b.line(sample((x) => mseAt(x, s.p1, s.p2), P0, P1), COLORS[1], 3)
  cursor(bowl, b, s.p0, [[mseAt(s.p0, s.p1, s.p2), COLORS[1]]])
  dragX(bowl, b, o, (x) => ctl.set('p0', x))
  stat.replaceChildren(tiles([
    { label: say('SAY_LOSS'), value: fmt(mseAt(s.p0, s.p1, s.p2), 4), tone: 1 },
    { label: say('SAY_GRADS'), value: [0, 1, 2].map((i) => fmt(mseGradAt(s.p0, s.p1, s.p2, i), 3)).join(' '), tone: 3 },
    { label: say('SAY_AT_TARGET'), value: fmt(mseAt(T[0], T[1], T[2]), 4), tone: 0 },
    { label: say('SAY_DOUBLE'), value: `${fmt(mseAt(T[0] + 1, T[1], T[2]), 3)} / ${fmt(mseAt(T[0] + 2, T[1], T[2]), 3)}`, tone: 6 },
  ]))
}

ctl.start()
