// cmp-power/tool.js -- lesson 11 of t27-compiler: the compiler's power estimate. Each bar is one of est_lut_dynamic,
// est_ff_dynamic, est_bram_dynamic, est_dsp_dynamic and est_static, fn bodies of gHashTag/t27
// specs/compiler/hir_cost_models.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of
// specs/widgets/cmp-power.t27.
import { estBramDynamic, estDspDynamic, estFfDynamic, estLutDynamic, estStatic } from './logic.js'
import { K, W, ask, controls, el, fill, meters, root, say, source, stages, tiles } from '../cmp-kit.js'

const ctl = controls([
  { key: 'luts', label: say('SAY_LUTS'), min: 0, max: K('K_MAX_LUTS', 8000), step: 50 },
  { key: 'ffs', label: say('SAY_FFS'), min: 0, max: K('K_MAX_FFS', 8000), step: 50 },
  { key: 'brams', label: say('SAY_BRAMS'), min: 0, max: K('K_MAX_BRAMS', 100), step: 1 },
  { key: 'dsps', label: say('SAY_DSPS'), min: 0, max: K('K_MAX_DSPS', 100), step: 1 },
  { key: 'mhz', label: say('SAY_MHZ'), min: K('K_MIN_MHZ', 10), max: K('K_MAX_MHZ', 500), step: 10 },
  { key: 'toggle', label: say('SAY_TOGGLE'), min: 0, max: K('K_MAX_TOGGLE', 100), step: 1 },
], { names: W.SAY_PRESET_NAMES, values: { luts: K('K_PRESET_LUTS', []), ffs: K('K_PRESET_FFS', []), brams: K('K_PRESET_BRAMS', []), dsps: K('K_PRESET_DSPS', []), mhz: K('K_PRESET_MHZ', []), toggle: K('K_PRESET_TOGGLE', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, fill(say('SAY_PER_MHZ'), K('K_LUT_POWER_UW_PER_MHZ', 0), K('K_FF_POWER_UW_PER_MHZ', 0), K('K_BRAM_POWER_UW_PER_MHZ', 0), K('K_DSP_POWER_UW_PER_MHZ', 0), K('K_STATIC_BASE_MW', 0))), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const parts = [
    estLutDynamic(s.luts, s.mhz, s.toggle),
    estFfDynamic(s.ffs, s.mhz, s.toggle),
    estBramDynamic(s.brams, s.mhz),
    estDspDynamic(s.dsps, s.mhz),
    estStatic(s.luts + s.ffs + s.brams + s.dsps),
  ]
  const total = parts.reduce((a, b) => a + b, 0)
  const top = Math.max(1, ...parts)
  out.replaceChildren(
    tiles([{ label: say('SAY_TOTAL'), value: fill(say('SAY_MW'), total), tone: 1 }]),
    meters(parts.map((v, i) => ({ label: say('SAY_PARTS', i), value: v, max: top, tone: [0, 2, 5, 3, 8][i], text: fill(say('SAY_MW'), v) }))))
}

ctl.start()
