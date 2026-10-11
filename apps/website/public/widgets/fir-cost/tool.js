// fir-cost/tool.js -- lesson 18 of arithmetic-and-dsp: folding the taps of a FIR onto DSP48E1
// slices. Symmetric taps share a multiplier through the pre-adder; a slice clocked C times per sample
// serves C taps in turn. It computes nothing itself: the multipliers, the clocks per sample, the
// slice each tap runs on, the slice count and how many filters fit come from ./logic.js, the fn
// bodies of gHashTag/t27 specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers
// K_ constants of specs/widgets/fir-cost.t27.
import { clocksPerSample, filtersOn200t, firDsps, firMults, firTapDsp } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const RATES = K('K_FS_HZ', [48000, 1000000, 10000000, 50000000, 100000000])
const MHZ = K('K_HZ_PER_MHZ', 1000000)
const ctl = controls([
  { key: 'taps', label: say('SAY_TAPS'), min: K('K_MIN_TAPS', 3), max: K('K_TAP_LIMIT', 127) },
  { key: 'sym', label: say('SAY_SYM'), kind: 'choice', options: W.SAY_SYMS || [] },
  { key: 'fclk', label: say('SAY_FCLK'), min: K('K_FCLK_MIN_MHZ', 50), max: K('K_FCLK_MAX_MHZ', 500), step: 10 },
  { key: 'fs', label: say('SAY_FS'), kind: 'choice', options: W.SAY_FS_NAMES || [] },
], { names: W.SAY_PRESET_NAMES, values: { taps: K('K_PRESET_TAPS'), sym: K('K_PRESET_SYM'), fclk: K('K_PRESET_FCLK_MHZ'), fs: K('K_PRESET_FS') } }, draw)

const fold = canvas('fc-fold', say('SAY_FOLD_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, fold, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const sym = s.sym === 1
  const cps = clocksPerSample(s.fclk * MHZ, RATES[s.fs])
  const dsps = firDsps(s.taps, sym, cps)
  fold.replaceChildren()
  const tw = 600 / s.taps
  const shown = Math.min(dsps, K('K_MAX_BOXES', 64))
  const cols = Math.min(shown, 16)
  const H = 200 + Math.ceil(shown / cols) * 34
  fold.setAttribute('viewBox', `0 0 640 ${H}`)
  const tx = (k) => 20 + k * tw + tw / 2
  fold.append(svgEl('text', { x: 20, y: 18, class: 'dk-txt-dim' }, fill(say('SAY_TAP_ROW'), s.taps)))
  // The taps, each coloured by the slice that multiplies it; symmetric pairs joined by an arc.
  for (let k = 0; k < s.taps; k++) {
    const d = firTapDsp(s.taps, k, sym, cps)
    const c = COLORS[d % COLORS.length]
    if (sym && k < s.taps - 1 - k) fold.append(svgEl('path', { d: `M${tx(k)},60 Q${(tx(k) + tx(s.taps - 1 - k)) / 2},${60 + Math.min(110, (s.taps - 2 * k) * tw * 0.35)} ${tx(s.taps - 1 - k)},60`, fill: 'none', stroke: c, opacity: 0.55, 'stroke-width': 1.5 }))
    fold.append(svgEl('circle', { cx: tx(k), cy: 48, r: Math.max(2, Math.min(7, tw * 0.4)), fill: c }))
  }
  // The slices: one box per slice, its time slots filled by the multipliers it runs.
  const bw = 600 / cols
  for (let d = 0; d < shown; d++) {
    const x = 20 + (d % cols) * bw
    const y = 190 + Math.floor(d / cols) * 34
    fold.append(svgEl('rect', { x: x + 2, y, width: bw - 4, height: 28, rx: 6, fill: COLORS[d % COLORS.length], opacity: 0.85 }))
    if (bw > 30) fold.append(svgEl('text', { x: x + bw / 2, y: y + 19, 'text-anchor': 'middle', style: 'font: 700 12px var(--w-mono); fill: #00140b' }, d))
  }
  fold.append(svgEl('text', { x: 20, y: 178, class: 'dk-txt-dim' }, fill(say('SAY_DSP_ROW'), dsps, num(cps))))
  stat.replaceChildren(tiles([
    { label: say('SAY_MULTS'), value: String(firMults(s.taps, sym)), tone: 2 },
    { label: say('SAY_CPS'), value: num(cps), tone: 1 },
    { label: say('SAY_DSPS'), value: String(dsps), tone: 0 },
    { label: say('SAY_FIT'), value: num(filtersOn200t(dsps)), tone: 5 },
  ]))
}

ctl.start()
