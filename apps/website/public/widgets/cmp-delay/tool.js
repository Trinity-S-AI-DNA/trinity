// cmp-delay/tool.js -- lesson 10 of t27-compiler: the compiler's static timing estimate. The delays are est_comb_delay
// and est_reg_to_reg_delay and the clock is fmax_from_delay, fn bodies of gHashTag/t27 specs/compiler/hir_cost_models.t27
// compiled to wasm (./logic.js); the curve is the same fns over every depth. Words are SAY_ and numbers K_ constants
// of specs/widgets/cmp-delay.t27.
import { estCombDelay, estRegToRegDelay, fmaxFromDelay } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, fill, plot, root, say, source, stages, svgEl, tiles } from '../cmp-kit.js'

const MAX = K('K_MAX_LUTS', 40)
const mhz = (delay) => Math.round(fmaxFromDelay(delay) / 1000)
const ctl = controls([{ key: 'luts', label: say('SAY_LUTS'), min: 0, max: MAX, step: 1 }], { names: W.SAY_PRESET_NAMES, values: { luts: K('K_PRESET_LUTS', []) } }, draw)
const svg = canvas('hk-plot', say('SAY_AXIS_Y'))
const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, svg, el('p', { class: 'dk-note' }, fill(say('SAY_RECIPE'), K('K_LUT_DELAY_PS', 0), K('K_ROUTING_DELAY_PS', 0), K('K_SETUP_TIME_PS', 0))), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const comb = estCombDelay(s.luts)
  const reg = estRegToRegDelay(s.luts)
  out.replaceChildren(tiles([
    { label: say('SAY_COMB'), value: fill(say('SAY_PS'), comb), tone: 2 },
    { label: say('SAY_REG'), value: fill(say('SAY_PS'), reg), tone: 1 },
    { label: say('SAY_FMAX_COMB'), value: fill(say('SAY_MHZ'), mhz(comb)), tone: 2 },
    { label: say('SAY_FMAX_REG'), value: fill(say('SAY_MHZ'), mhz(reg)), tone: 1 },
  ]))
  svg.replaceChildren()
  const depth = [...Array(MAX + 1)].map((_, i) => i)
  const top = Math.ceil(mhz(estCombDelay(0)) / 500) * 500
  const p = plot(svg, { w: 640, h: 260, x0: 0, x1: MAX, y0: 0, y1: top, xticks: [0, 10, 20, 30, 40], yticks: [0, 1000, 2000, 3000].filter((t) => t <= top), xlabel: say('SAY_AXIS_X'), ylabel: say('SAY_AXIS_Y') })
  p.line(depth.map((n) => [n, mhz(estCombDelay(n))]), COLORS[2], 2)
  p.line(depth.map((n) => [n, mhz(estRegToRegDelay(n))]), COLORS[1], 3)
  svg.append(svgEl('circle', { cx: p.x(s.luts), cy: p.y(mhz(reg)), r: 6, fill: COLORS[1], stroke: '#fff', 'stroke-width': 2 }))
}

ctl.start()
