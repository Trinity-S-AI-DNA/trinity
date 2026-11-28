// nn-rmsprop/tool.js -- lesson 17 of neural-networks: a step that does not care how big the gradient
// is. RMSProp divides each step by the root of a running mean of squared gradients, so a gradient
// of 0.001 and one of 1000 move the weight alike. Every point is param_after and every cache value
// cache_after of gHashTag/t27 specs/ml/optimizer/rmsprop.t27, compiled to wasm (./logic.js): a
// constant gradient on one weight from 1.0, lr 0.01. Words are SAY_ and numbers K_ constants of
// specs/widgets/nn-rmsprop.t27.
import { cacheAfter, paramAfter } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, say, source, tiles } from '../nn-kit.js'

const NMAX = K('K_STEPS_HI', 100)
const G = K('K_GRADS_M', []).map((g) => g / 1000)
const ctl = controls([
  { key: 'g', label: say('SAY_GRAD'), kind: 'choice', options: W.SAY_GRAD_NAMES ?? [] },
  { key: 'decay', label: say('SAY_DECAY'), min: centi(K('K_DECAY_LO_C', 50)), max: centi(K('K_DECAY_HI_C', 99)), step: 0.01, fmt: (v) => fmt(v, 2) },
  { key: 'n', label: say('SAY_STEPS'), min: 1, max: NMAX },
], { names: W.SAY_PRESET_NAMES, values: { g: K('K_PRESET_G', []), decay: K('K_PRESET_DECAY_C', []).map(centi), n: K('K_PRESET_STEPS', []) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend((W.SAY_GRAD_NAMES ?? []).map((w, i) => [w, COLORS[[0, 1, 3][i]], i > 0])), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 330, x0: 0, x1: NMAX, y0: centi(K('K_Y_LO_C', -10)), y1: centi(K('K_Y_HI_C', 110)), xticks: K('K_STEP_TICKS', []), yticks: K('K_Y_TICKS_C', []).map(centi), xlabel: say('SAY_STEPS') }
  const p = plot(svg, o)
  G.forEach((g, i) => p.line([...Array(NMAX + 1)].map((_, k) => [k, paramAfter(g, k, s.decay)]), COLORS[[0, 1, 3][i]], i === s.g ? 5 : 2, i === s.g ? {} : { 'stroke-dasharray': '6 6' }))
  cursor(svg, p, s.n, [[paramAfter(G[s.g], s.n, s.decay), COLORS[[0, 1, 3][s.g]]]])
  dragX(svg, p, o, (n) => ctl.set('n', Math.round(n)))
  stat.replaceChildren(tiles([
    { label: say('SAY_W_NOW'), value: fmt(paramAfter(G[s.g], s.n, s.decay), 5), tone: 0 },
    { label: say('SAY_W_OTHERS'), value: G.map((g) => fmt(paramAfter(g, s.n, s.decay), 4)).join(' '), tone: 1 },
    { label: say('SAY_ONE_STEP'), value: fmt(paramAfter(G[s.g], 1, s.decay), 5), tone: 2 },
    { label: say('SAY_CACHE'), value: fmt(cacheAfter(G[s.g], s.n), 6), tone: 5 },
  ]))
}

ctl.start()
