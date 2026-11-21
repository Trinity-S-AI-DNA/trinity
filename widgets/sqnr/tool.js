// sqnr/tool.js -- lesson 9 of arithmetic-and-dsp: each bit of a quantizer buys about 6 dB. It
// computes nothing itself: the sine, the quantizer, the measured and the ideal SQNR come from
// ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/dsp/signals.t27 compiled to wasm. Words are
// SAY_ and numbers K_ constants of specs/widgets/sqnr.t27.
import { quantize, sqnrIdeal, sqnrMeasured, testSine } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const MAXB = K('K_MAX_BITS', 16)
const SAMPLES = K('K_SAMPLES', 4096)
const CYCLES = K('K_CYCLES', 127)
const DRAW = K('K_DRAW_POINTS', 256)
const ctl = controls([
  { key: 'bits', label: say('SAY_BITS'), min: 1, max: MAXB },
], { names: W.SAY_PRESET_NAMES, values: { bits: K('K_PRESET_BITS') } }, draw)

const wave = canvas('sq-wave', say('SAY_WAVE_LABEL'))
const err = canvas('sq-err', say('SAY_ERR_LABEL'))
const bars = canvas('sq-bars', say('SAY_BARS_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, wave, err, bars, el('div', { class: 'dk-legend' }, el('span', {}, el('i', { style: `background:${COLORS[2]}` }), say('SAY_MEASURED')), el('span', {}, el('i', { style: `background:${COLORS[1]}` }), say('SAY_IDEAL'))), source())

// The measured SQNR of every width, once: it does not depend on the slider.
const measured = Array.from({ length: MAXB }, (_, i) => sqnrMeasured(i + 1, SAMPLES, CYCLES))
const ideal = Array.from({ length: MAXB }, (_, i) => sqnrIdeal(i + 1))

function draw(s) {
  const sine = Array.from({ length: DRAW }, (_, k) => [k, testSine(k, DRAW, 1)])
  const q = sine.map(([k, v]) => [k, quantize(v, s.bits)])
  wave.replaceChildren()
  const p = plot(wave, { w: 640, h: 220, x0: 0, x1: DRAW - 1, y0: -1.1, y1: 1.1, yticks: [-1, 0, 1], xticks: [], xlabel: say('SAY_ONE_PERIOD') })
  p.line(sine, COLORS[0], 2)
  const stairs = q.flatMap(([k, v], i) => (i ? [[k, q[i - 1][1]], [k, v]] : [[k, v]]))
  p.line(stairs, COLORS[3], 2)
  err.replaceChildren()
  const e = sine.map(([k, v], i) => [k, q[i][1] - v])
  const emax = Math.max(...e.map(([, v]) => Math.abs(v)), 1e-12)
  const pe = plot(err, { w: 640, h: 140, x0: 0, x1: DRAW - 1, y0: -emax * 1.15, y1: emax * 1.15, yticks: [-emax, 0, emax], yfmt: (v) => v.toExponential(1), xticks: [], xlabel: say('SAY_ERROR_AXIS') })
  pe.line(e, COLORS[4], 1.5)
  bars.replaceChildren()
  const top = Math.ceil(ideal[MAXB - 1] / 10) * 10
  const pb = plot(bars, { w: 640, h: 220, x0: 0.4, x1: MAXB + 0.6, y0: 0, y1: top, yticks: [0, 20, 40, 60, 80, 100].filter((t) => t <= top), xticks: Array.from({ length: MAXB }, (_, i) => i + 1), xlabel: say('SAY_BITS_AXIS'), ylabel: say('SAY_DB') })
  for (let i = 0; i < MAXB; i++) {
    const n = i + 1
    const on = n === s.bits
    const r = (x, v, c) => bars.append(svgEl('rect', { x: pb.x(x), y: pb.y(v), width: pb.x(n + 0.36) - pb.x(n), height: pb.y(0) - pb.y(v), rx: 2, fill: c, opacity: on ? 1 : 0.45 }))
    r(n - 0.36, measured[i], COLORS[2])
    r(n, ideal[i], COLORS[1])
  }
  const i = s.bits - 1
  const db = (v) => fill(say('SAY_DB_VALUE'), v.toFixed(2))
  stat.replaceChildren(tiles([
    { label: say('SAY_IDEAL'), value: db(ideal[i]), tone: 1 },
    { label: say('SAY_MEASURED'), value: db(measured[i]), tone: 2 },
    { label: say('SAY_GAP'), value: db(ideal[i] - measured[i]), tone: 3 },
    { label: say('SAY_PER_BIT'), value: db(i ? ideal[i] - ideal[i - 1] : ideal[0]), tone: 0 },
  ]))
}

ctl.start()
