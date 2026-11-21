// nn-softmax/tool.js -- lesson 7 of neural-networks: how a network turns scores into a choice.
// Softmax makes three scores into three probabilities that sum to one, and the temperature decides
// how sure it is. Every bar and every point of the temperature sweep is softmax_at of gHashTag/t27
// specs/ml/activation/softmax.t27, compiled to wasm (./logic.js). Words are SAY_ and numbers K_
// constants of specs/widgets/nn-softmax.t27.
import { softmaxAt } from './logic.js'
import { COLORS, K, W, ask, bars, canvas, centi, controls, cursor, dragX, el, fill, fmt, legend, plot, root, sample, say, source, tiles } from '../nn-kit.js'

const S0 = centi(K('K_SCORE_LO_C', -300)), S1 = centi(K('K_SCORE_HI_C', 300))
const T0 = centi(K('K_T_LO_C', 10)), T1 = centi(K('K_T_HI_C', 500))
const score = (key, label) => ({ key, label, min: S0, max: S1, step: 0.1, fmt: (v) => fmt(v, 1) })
const ctl = controls([
  score('a', say('SAY_A')), score('b', say('SAY_B')), score('c', say('SAY_C')),
  { key: 't', label: say('SAY_T'), min: T0, max: T1, step: centi(K('K_T_STEP_C', 5)), fmt: (v) => fmt(v, 2) },
], { names: W.SAY_PRESET_NAMES, values: { a: K('K_PRESET_A_C', []).map(centi), b: K('K_PRESET_B_C', []).map(centi), c: K('K_PRESET_C_C', []).map(centi), t: K('K_PRESET_T_C', []).map(centi) } }, draw)

const chart = canvas('nn-bars', say('SAY_BARS_LABEL'))
const sweep = canvas('nn-curve', say('SAY_SWEEP_LABEL'))
const stat = el('div')
const names = [say('SAY_A'), say('SAY_B'), say('SAY_C')]
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, chart, stat, el('p', { class: 'dk-note' }, say('SAY_SWEEP')), sweep, legend(names.map((n, i) => [n, COLORS[[2, 3, 0][i]]])), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const p3 = [0, 1, 2].map((i) => softmaxAt(s.a, s.b, s.c, s.t, i))
  const colors = [COLORS[2], COLORS[3], COLORS[0]]
  bars(chart, { values: p3, labels: names.map((n, i) => `${n} = ${fmt([s.a, s.b, s.c][i], 1)}`), colors, lo: 0, hi: 1, h: 240, ticks: K('K_P_TICKS_C', []).map(centi), fmt: (v) => fmt(v, 4) })
  sweep.replaceChildren()
  const o = { w: 640, h: 280, x0: T0, x1: T1, y0: 0, y1: 1, xticks: K('K_T_TICKS', []), yticks: K('K_P_TICKS_C', []).map(centi), xlabel: say('SAY_T') }
  const p = plot(sweep, o)
  for (let i = 0; i < 3; i++) p.line(sample((t) => softmaxAt(s.a, s.b, s.c, t, i), T0, T1, 120), colors[i], 3)
  cursor(sweep, p, s.t, p3.map((v, i) => [v, colors[i]]))
  dragX(sweep, p, o, (t) => ctl.set('t', t))
  stat.replaceChildren(tiles([
    { label: fill(say('SAY_P'), names[0]), value: fmt(p3[0], 4), tone: 2 },
    { label: fill(say('SAY_P'), names[1]), value: fmt(p3[1], 4), tone: 3 },
    { label: fill(say('SAY_P'), names[2]), value: fmt(p3[2], 4), tone: 0 },
    { label: fill(say('SAY_COLD'), fmt(T0, 2)), value: [0, 1, 2].map((i) => fmt(softmaxAt(s.a, s.b, s.c, T0, i), 3)).join(' '), tone: 1 },
  ]))
}

ctl.start()
