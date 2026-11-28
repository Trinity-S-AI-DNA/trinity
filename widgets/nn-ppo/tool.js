// nn-ppo/tool.js -- lesson 27 of neural-networks: how an agent learns from reward without lurching.
// PPO scores a change in policy by min(r A, clip(r, 1 - eps, 1 + eps) A): once the probability
// ratio r has moved more than eps in the direction the advantage A rewards, the objective goes flat
// and stops pulling. Both curves and every tile are clipped_surrogate of gHashTag/t27
// specs/ml/rl/ppo_clip_loss.t27, compiled to wasm (./logic.js); the dashed curve is the same fn with
// a clip range so wide (K_WIDE) it never clips. Words are SAY_ and numbers K_ constants of
// specs/widgets/nn-ppo.t27.
import { clippedSurrogate, policyLossOf } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, tiles } from '../nn-kit.js'

const R0 = 0, R1 = centi(K('K_R_HI_C', 200))
const WIDE = K('K_WIDE', 1000)
const ctl = controls([
  { key: 'r', label: say('SAY_R'), min: R0, max: R1, step: 0.01, fmt: (v) => fmt(v, 2) },
  { key: 'a', label: say('SAY_A'), min: centi(K('K_A_LO_C', -200)), max: centi(K('K_A_HI_C', 200)), step: 0.1, fmt: (v) => fmt(v, 1) },
  { key: 'eps', label: say('SAY_EPS'), min: centi(K('K_EPS_LO_C', 5)), max: centi(K('K_EPS_HI_C', 50)), step: 0.01, fmt: (v) => fmt(v, 2) },
], { names: W.SAY_PRESET_NAMES, values: { r: K('K_PRESET_R_C', []).map(centi), a: K('K_PRESET_A_C', []).map(centi), eps: K('K_PRESET_EPS_C', []).map(centi) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_CLIPPED'), COLORS[0]], [say('SAY_RAW'), COLORS[1], true]]), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 340, x0: R0, x1: R1, y0: K('K_Y_LO', -4), y1: K('K_Y_HI', 4), xticks: K('K_R_TICKS_C', []).map(centi), yticks: K('K_Y_TICKS', []), xlabel: say('SAY_R') }
  const p = plot(svg, o)
  p.line(sample((r) => clippedSurrogate(r, s.a, WIDE), R0, R1), COLORS[1], 2, { 'stroke-dasharray': '7 6' })
  p.line(sample((r) => clippedSurrogate(r, s.a, s.eps), R0, R1, 400), COLORS[0], 4)
  cursor(svg, p, s.r, [[clippedSurrogate(s.r, s.a, s.eps), COLORS[0]], [clippedSurrogate(s.r, s.a, WIDE), COLORS[1]]])
  dragX(svg, p, o, (r) => ctl.set('r', r))
  const rs = K('K_BATCH_R_C', []).map(centi)
  stat.replaceChildren(tiles([
    { label: say('SAY_CLIPPED'), value: fmt(clippedSurrogate(s.r, s.a, s.eps), 4), tone: 0 },
    { label: say('SAY_RAW'), value: fmt(clippedSurrogate(s.r, s.a, WIDE), 4), tone: 1 },
    { label: say('SAY_BATCH'), value: fmt(policyLossOf(rs[0], rs[1], rs[2]), 4), tone: 2 },
    { label: say('SAY_BATCH_FAR'), value: fmt(policyLossOf(s.r, s.r, s.r), 4), tone: 5 },
  ]))
}

ctl.start()
