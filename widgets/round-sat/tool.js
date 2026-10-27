// round-sat/tool.js -- lesson 8 of arithmetic-and-dsp: three ways to round, two ways to overflow,
// and the bias each rounding leaves. It computes nothing itself: the stored word, its value, the
// error, whether it overflowed and the ramp bias come from ./logic.js, the fn bodies of gHashTag/t27
// specs/fpga/dsp/fixed_point.t27 compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/round-sat.t27.
import { overflows, qEncode, qError, qMax, qMin, qValue, rampBias, worstError } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const MODES = W.SAY_MODES || []
const ctl = controls([
  { key: 'm', label: say('SAY_M'), min: 1, max: K('K_MAX_INT_BITS', 6) },
  { key: 'n', label: say('SAY_N'), min: 0, max: K('K_MAX_FRAC_BITS', 6) },
  { key: 'mode', label: say('SAY_MODE'), kind: 'choice', options: MODES },
  { key: 'sat', label: say('SAY_OVERFLOW'), kind: 'choice', options: W.SAY_OVERFLOWS || [] },
  { key: 'x', label: say('SAY_X'), min: -K('K_X_SPAN', 40), max: K('K_X_SPAN', 40), step: 1 / K('K_X_STEP_DIV', 100), fmt: (v) => v.toFixed(2) },
  { key: 'd', label: say('SAY_DROP'), min: 1, max: K('K_MAX_DROP', 8) },
], { names: W.SAY_PRESET_NAMES, values: { m: K('K_PRESET_M'), n: K('K_PRESET_N'), mode: K('K_PRESET_MODE'), sat: K('K_PRESET_SAT'), x: (K('K_PRESET_X_CENTI') || []).map((v, i) => (K('K_PRESET_X_NEG')[i] ? -v : v) / 100), d: K('K_PRESET_DROP') } }, draw)

const curve = canvas('rs-curve', say('SAY_CURVE_LABEL'))
const bias = canvas('rs-bias', say('SAY_BIAS_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, curve, el('p', { class: 'dk-note' }, say('SAY_BIAS_NOTE')), bias, source())

function draw(s) {
  const sat = s.sat === 1
  const lo = qMin(s.m), hi = qMax(s.m, s.n)
  const span = Math.max(-lo, hi) * K('K_PLOT_MARGIN_PCT', 160) / 100
  curve.replaceChildren()
  const p = plot(curve, { w: 640, h: 300, x0: -span, x1: span, y0: -span, y1: span, xticks: [lo, 0, hi], yticks: [lo, 0, hi], xfmt: (v) => v.toFixed(2), yfmt: (v) => v.toFixed(2), xlabel: say('SAY_IN'), ylabel: say('SAY_OUT') })
  curve.append(svgEl('rect', { x: p.x(lo), y: p.y(hi), width: p.x(hi) - p.x(lo), height: p.y(lo) - p.y(hi), fill: COLORS[0], opacity: 0.06 }))
  p.line([[-span, -span], [span, span]], 'rgba(173,201,192,0.5)', 1.5, { 'stroke-dasharray': '5 5' })
  const pts = []
  const N = K('K_CURVE_POINTS', 600)
  for (let k = 0; k <= N; k++) {
    const x = -span + (2 * span * k) / N
    pts.push([x, qValue(qEncode(x, s.m, s.n, s.mode, sat), s.n)])
  }
  // A wrap is a jump, not a slope: break the line where the output leaps.
  let seg = [pts[0]]
  for (let k = 1; k < pts.length; k++) {
    if (Math.abs(pts[k][1] - pts[k - 1][1]) > (hi - lo) / 2) { p.line(seg, COLORS[1], 2.5); seg = [] }
    seg.push(pts[k])
  }
  p.line(seg, COLORS[1], 2.5)
  const out = qValue(qEncode(s.x, s.m, s.n, s.mode, sat), s.n)
  const vis = Math.max(-span, Math.min(span, s.x))
  curve.append(svgEl('line', { x1: p.x(vis), x2: p.x(vis), y1: p.clampY(vis), y2: p.clampY(out), stroke: COLORS[3], 'stroke-width': 3 }))
  curve.append(svgEl('circle', { cx: p.x(vis), cy: p.clampY(out), r: 7, fill: COLORS[3] }))
  // The bias of each mode on a ramp, d bits dropped.
  bias.replaceChildren()
  const b = MODES.map((_, k) => rampBias(k, s.d))
  const bp = plot(bias, { w: 640, h: 170, x0: -0.6, x1: 0.6, y0: 0, y1: MODES.length, left: 170, bottom: 34, top: 8, xticks: [-0.5, -0.25, 0, 0.25, 0.5], xlabel: fill(say('SAY_BIAS_AXIS'), s.d) })
  b.forEach((v, k) => {
    const y0 = bp.y(MODES.length - k - 0.2), y1 = bp.y(MODES.length - k - 0.8)
    bias.append(svgEl('rect', { x: Math.min(bp.x(0), bp.x(v)), y: y0, width: Math.max(2, Math.abs(bp.x(v) - bp.x(0))), height: y1 - y0, rx: 4, fill: COLORS[[6, 4, 0][k]], opacity: k === s.mode ? 1 : 0.5 }))
    bias.append(svgEl('text', { x: 8, y: (y0 + y1) / 2 + 4, class: k === s.mode ? 'dk-txt-big' : 'dk-txt' }, MODES[k]))
    bias.append(svgEl('text', { x: bp.x(v) + (v < 0 ? -6 : 6), y: (y0 + y1) / 2 + 4, class: 'dk-txt', 'text-anchor': v < 0 ? 'end' : 'start' }, v.toFixed(4)))
  })
  stat.replaceChildren(tiles([
    { label: fill(say('SAY_STORED'), s.m, s.n), value: String(out), tone: 1 },
    { label: say('SAY_ERROR'), value: qError(s.x, s.m, s.n, s.mode, sat).toFixed(4), tone: overflows(s.x, s.m, s.n, s.mode) ? 'bad' : 3 },
    { label: say('SAY_STATE'), value: overflows(s.x, s.m, s.n, s.mode) ? say(sat ? 'SAY_SATURATED' : 'SAY_WRAPPED') : say('SAY_IN_RANGE'), tone: overflows(s.x, s.m, s.n, s.mode) ? 'bad' : 0 },
    { label: say('SAY_WORST'), value: fill(say('SAY_LSB'), worstError(s.mode, s.d).toFixed(4)), tone: 2 },
  ]))
}

ctl.start()
