// fir-on-board/tool.js -- lesson 27 of arithmetic-and-dsp, the capstone: the FIR of lesson 17 run the
// way RTL runs it -- Q1.15 input, integer taps, a wide accumulator, round and saturate to 16 bits --
// next to the same filter in f64. It computes nothing itself: the input, the RTL output, the f64
// output, the error and the accumulator width come from ./logic.js, the fn bodies of gHashTag/t27
// specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/fir-on-board.t27.
import { hwAccBits, hwError, hwFirOut, hwInput, refFirOut } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const MILLI = K('K_PER_MILLI', 1000)
const SHOWN = K('K_SAMPLES_SHOWN', 128)
const FULL = K('K_Q15_ONE', 32768)
const WINS = K('K_WINDOW_KINDS', [0, 1, 2])
const ctl = controls([
  { key: 'taps', label: say('SAY_TAPS'), min: K('K_MIN_TAPS', 5), max: K('K_TAP_LIMIT', 63), step: 2 },
  { key: 'fc', label: say('SAY_FC'), min: K('K_FC_MIN_MILLI', 20), max: K('K_FC_MAX_MILLI', 300), step: 5, fmt: (v) => (v / MILLI).toFixed(3) },
  { key: 'win', label: say('SAY_WINDOW'), kind: 'choice', options: W.SAY_WINDOWS || [] },
  { key: 'bits', label: say('SAY_BITS'), min: K('K_MIN_BITS', 8), max: K('K_MAX_BITS', 18) },
  { key: 'fa', label: say('SAY_FA'), min: K('K_FA_MIN_MILLI', 5), max: K('K_FA_MAX_MILLI', 100), fmt: (v) => (v / MILLI).toFixed(3) },
  { key: 'fb', label: say('SAY_FB'), min: K('K_FB_MIN_MILLI', 150), max: K('K_FB_MAX_MILLI', 450), step: 5, fmt: (v) => (v / MILLI).toFixed(3) },
], { names: W.SAY_PRESET_NAMES, values: { taps: K('K_PRESET_TAPS'), fc: K('K_PRESET_FC_MILLI'), win: K('K_PRESET_WINDOW'), bits: K('K_PRESET_BITS'), fa: K('K_PRESET_FA_MILLI'), fb: K('K_PRESET_FB_MILLI') } }, draw)

const wave = canvas('fb-wave', say('SAY_WAVE_LABEL'))
const errs = canvas('fb-err', say('SAY_ERR_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, wave,
  el('div', { class: 'dk-legend' }, el('span', {}, el('i', { style: 'background:#5f7a71' }), say('SAY_IN')), el('span', {}, el('i', { style: `background:${COLORS[0]}` }), say('SAY_RTL')), el('span', {}, el('i', { style: `background:${COLORS[1]}` }), say('SAY_REF'))),
  errs, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const fc = s.fc / MILLI, fa = s.fa / MILLI, fb = s.fb / MILLI, win = WINS[s.win]
  const ks = Array.from({ length: SHOWN }, (_, k) => k)
  const x = ks.map((k) => hwInput(k, fa, fb))
  const y = ks.map((k) => hwFirOut(k, s.taps, fc, win, s.bits, fa, fb))
  const ref = ks.map((k) => refFirOut(k, s.taps, fc, win, fa, fb))
  const e = ks.map((k) => hwError(k, s.taps, fc, win, s.bits, fa, fb))
  wave.replaceChildren()
  const p = plot(wave, { w: 640, h: 260, x0: 0, x1: SHOWN - 1, y0: -FULL, y1: FULL, yticks: [-FULL, 0, FULL], yfmt: (v) => (v / FULL).toFixed(0), xticks: [0, SHOWN / 4, SHOWN / 2, (3 * SHOWN) / 4], xlabel: say('SAY_TIME_AXIS') })
  p.line(ks.map((k) => [k, x[k]]), '#5f7a71', 1.2)
  p.line(ks.map((k) => [k, ref[k]]), COLORS[1], 3, { 'stroke-dasharray': '6 4' })
  p.line(ks.map((k) => [k, y[k]]), COLORS[0], 1.8)
  errs.replaceChildren()
  const em = Math.max(1, ...e.map(Math.abs))
  const pe = plot(errs, { w: 640, h: 150, x0: -1, x1: SHOWN, y0: -em * 1.15, y1: em * 1.15, yticks: [-em, 0, em], yfmt: (v) => v.toFixed(2), xticks: [], xlabel: say('SAY_ERR_AXIS') })
  ks.forEach((k) => errs.append(svgEl('line', { x1: pe.x(k), x2: pe.x(k), y1: pe.y(0), y2: pe.y(e[k]), stroke: Math.abs(e[k]) > 1 ? COLORS[6] : COLORS[3], 'stroke-width': 3 })))
  stat.replaceChildren(tiles([
    { label: say('SAY_ACC'), value: fill(say('SAY_BITS_N'), hwAccBits(s.taps, fc, win, s.bits)), tone: 2 },
    { label: say('SAY_WORST'), value: fill(say('SAY_LSB'), em.toFixed(3)), tone: em > 1 ? 'bad' : 0 },
    { label: say('SAY_COEFF'), value: fill(say('SAY_BITS_N'), s.bits), tone: 1 },
    { label: say('SAY_OUT_WORD'), value: fill(say('SAY_BITS_N'), K('K_OUT_BITS', 16)), tone: 5 },
  ]))
}

ctl.start()
