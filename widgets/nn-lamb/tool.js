// nn-lamb/tool.js -- lesson 21 of neural-networks: one learning rate for layers of every size. LAMB
// scales each layer's Adam-style update by a trust ratio, the layer's weight norm over its update
// norm (the weight norm capped at 10), so the step is a fixed fraction of the layer. Every point is
// step_norm and every tile two_layers of gHashTag/t27 specs/ml/optimizer/lamb.t27, compiled to wasm
// (./logic.js): weights (1, 2) times a scale, gradients (0.1, 0.2), lr 0.001. Words are SAY_ and
// numbers K_ constants of specs/widgets/nn-lamb.t27.
import { stepNorm, twoLayers } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, cursor, dragX, el, fmt, legend, plot, root, sample, say, source, tiles } from '../nn-kit.js'

const S0 = centi(K('K_SCALE_LO_C', 10)), S1 = centi(K('K_SCALE_HI_C', 1000))
const ctl = controls([
  { key: 'k', label: say('SAY_SCALE'), min: S0, max: S1, step: 0.05, fmt: (v) => fmt(v, 2) },
], { names: W.SAY_PRESET_NAMES, values: { k: K('K_PRESET_SCALE_C', []).map(centi) } }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, legend([[say('SAY_NORM'), COLORS[0]]]), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const o = { w: 640, h: 330, x0: S0, x1: S1, y0: 0, y1: K('K_Y_HI_U', 12) / 1000, xticks: K('K_X_TICKS', []), yticks: K('K_Y_TICKS_U', []).map((t) => t / 1000), yfmt: (t) => fmt(t, 3), xlabel: say('SAY_SCALE'), left: 60 }
  const p = plot(svg, o)
  p.line(sample((k) => stepNorm(k), S0, S1, 240), COLORS[0], 3.5)
  cursor(svg, p, s.k, [[stepNorm(s.k), COLORS[1]]])
  dragX(svg, p, o, (k) => ctl.set('k', k))
  stat.replaceChildren(tiles([
    { label: say('SAY_NORM'), value: fmt(stepNorm(s.k), 6), tone: 0 },
    { label: say('SAY_NORM_X10'), value: fmt(stepNorm(s.k * 10), 6), tone: 1 },
    { label: say('SAY_LAYER_A'), value: [0, 1].map((i) => fmt(twoLayers(i), 4)).join(' '), tone: 2 },
    { label: say('SAY_LAYER_B'), value: [2, 3].map((i) => fmt(twoLayers(i), 4)).join(' '), tone: 5 },
  ]))
}

ctl.start()
