// nn-bce/tool.js -- lesson 14 of neural-networks: why a confident wrong answer costs so much. Binary
// cross-entropy charges -log of the probability given to the true answer, so near 0 the cost climbs
// without bound (clipped at eps so it stays finite). Every value is loss_of or grad_of of
// gHashTag/t27 specs/ml/loss/binary_crossentropy_loss.t27, compiled to wasm (./logic.js), against the
// spec's targets (1, 0, 1). Words are SAY_ and numbers K_ constants of specs/widgets/nn-bce.t27.
import { gradOf, lossOf } from './logic.js'
import { COLORS, K, W, ask, bars, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, tiles } from '../nn-kit.js'

const T = K('K_TARGETS', [])
const Q0 = centi(K('K_P_LO_C', 1)), Q1 = centi(K('K_P_HI_C', 99))
const prob = (key, i) => ({ key, label: `${say('SAY_PRED')} ${i} (${say('SAY_TARGET')} ${T[i]})`, min: Q0, max: Q1, step: 0.01, fmt: (v) => fmt(v, 2) })
const ctl = controls([prob('a', 0), prob('b', 1), prob('c', 2)],
  { names: W.SAY_PRESET_NAMES, values: { a: K('K_PRESET_A_C', []).map(centi), b: K('K_PRESET_B_C', []).map(centi), c: K('K_PRESET_C_C', []).map(centi) } }, draw)

const curve = canvas('nn-curve', say('SAY_CURVE_LABEL'))
const grads = canvas('nn-bars', say('SAY_GRAD_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, curve, legend([[say('SAY_LOSS'), COLORS[6]]]), el('p', { class: 'dk-label' }, say('SAY_GRAD_LABEL')), grads, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  curve.replaceChildren()
  const o = { w: 640, h: 300, x0: Q0, x1: Q1, y0: 0, y1: centi(K('K_LOSS_HI_C', 200)), xticks: K('K_X_TICKS_C', []).map(centi), yticks: K('K_LOSS_TICKS_C', []).map(centi), xlabel: `${say('SAY_PRED')} 0 (${say('SAY_TARGET')} ${T[0]})` }
  const p = plot(curve, o)
  p.line(sample((x) => lossOf(x, s.b, s.c, false), Q0, Q1, 200), COLORS[6], 3)
  cursor(curve, p, s.a, [[lossOf(s.a, s.b, s.c, false), COLORS[6]]])
  dragX(curve, p, o, (x) => ctl.set('a', x))
  const g = [0, 1, 2].map((i) => gradOf(s.a, s.b, s.c, false, i))
  bars(grads, { values: g, labels: [0, 1, 2].map((i) => `${say('SAY_PRED')} ${i}`), colors: g.map((v) => (v < 0 ? COLORS[0] : COLORS[3])), lo: centi(K('K_GRAD_LO_C', -1000)), hi: centi(K('K_GRAD_HI_C', 1000)), h: 220, ticks: K('K_GRAD_TICKS', []), fmt: (v) => fmt(v, 2) })
  stat.replaceChildren(tiles([
    { label: say('SAY_LOSS'), value: fmt(lossOf(s.a, s.b, s.c, false), 4), tone: 6 },
    { label: say('SAY_SURE_RIGHT'), value: fmt(lossOf(Q1, Q0, Q1, false), 4), tone: 0 },
    { label: say('SAY_SURE_WRONG'), value: fmt(lossOf(Q0, Q1, Q0, false), 4), tone: 'bad' },
    { label: say('SAY_LOGITS'), value: fmt(lossOf(0, 0, 0, true), 4), tone: 2 },
  ]))
}

ctl.start()
