// fir-fit/tool.js -- lesson 26 of arithmetic-and-dsp: does the filter fit the XC7A200T, and does its
// adder close timing? It computes nothing itself: the slices per channel, how many filters fit, the
// adder levels between registers, the path and the slack come from ./logic.js, the fn bodies of
// gHashTag/t27 specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers K_ constants
// of specs/widgets/fir-fit.t27.
import { adderLevels, clocksPerSample, filtersOn200t, firDsps, pathPs, slackPs } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const RATES = K('K_FS_HZ', [48000, 1000000, 10000000, 50000000, 100000000])
const MHZ = K('K_HZ_PER_MHZ', 1000000)
const TOTAL = K('K_DSP48_ON_200T', 740)
const ctl = controls([
  { key: 'taps', label: say('SAY_TAPS'), min: K('K_MIN_TAPS', 3), max: K('K_TAP_LIMIT', 127) },
  { key: 'sym', label: say('SAY_SYM'), kind: 'choice', options: W.SAY_SYMS || [] },
  { key: 'fs', label: say('SAY_FS'), kind: 'choice', options: W.SAY_FS_NAMES || [] },
  { key: 'fclk', label: say('SAY_FCLK'), min: K('K_FCLK_MIN_MHZ', 50), max: K('K_FCLK_MAX_MHZ', 500), step: 10 },
  { key: 'ch', label: say('SAY_CHANNELS'), min: 1, max: K('K_MAX_CHANNELS', 64) },
  { key: 'form', label: say('SAY_FORM'), kind: 'choice', options: W.SAY_FORMS || [] },
  { key: 'lvl', label: say('SAY_LEVEL_PS'), min: K('K_MIN_PS', 100), max: K('K_MAX_LEVEL_PS', 1000), step: 10 },
  { key: 'fix', label: say('SAY_FIXED_PS'), min: K('K_MIN_PS', 100), max: K('K_MAX_FIXED_PS', 3000), step: 10 },
], { names: W.SAY_PRESET_NAMES, values: { taps: K('K_PRESET_TAPS'), sym: K('K_PRESET_SYM'), fs: K('K_PRESET_FS'), fclk: K('K_PRESET_FCLK_MHZ'), ch: K('K_PRESET_CHANNELS'), form: K('K_PRESET_FORM'), lvl: K('K_PRESET_LEVEL_PS'), fix: K('K_PRESET_FIXED_PS') } }, draw)

const grid = canvas('ff-grid', say('SAY_GRID_LABEL'))
const timing = canvas('ff-timing', say('SAY_TIMING_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, grid, timing, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const sym = s.sym === 1
  const cps = clocksPerSample(s.fclk * MHZ, RATES[s.fs])
  const per = firDsps(s.taps, sym, cps)
  const used = per * s.ch
  // The 740 slices of the 200T as a grid, filled channel by channel.
  grid.replaceChildren()
  const cols = K('K_GRID_COLS', 37)
  const rows = Math.ceil(TOTAL / cols)
  const cs = 600 / cols
  grid.setAttribute('viewBox', `0 0 640 ${rows * cs + 40}`)
  for (let i = 0; i < TOTAL; i++) {
    const ch = per ? Math.floor(i / per) : 0
    const on = i < used
    grid.append(svgEl('rect', { x: 20 + (i % cols) * cs + 1, y: 10 + Math.floor(i / cols) * cs + 1, width: cs - 2, height: cs - 2, rx: 2, fill: on ? COLORS[ch % COLORS.length] : '#0b1411', opacity: on ? 0.9 : 1 }))
  }
  const over = used > TOTAL
  grid.append(svgEl('text', { x: 20, y: rows * cs + 32, class: over ? 'dk-txt-big' : 'dk-txt', style: over ? `fill:${COLORS[6]}` : null }, over ? fill(say('SAY_OVER'), num(used), TOTAL) : fill(say('SAY_USED'), num(used), TOTAL)))
  // One register-to-register path against the clock period.
  const systolic = s.form === 1
  const lv = adderLevels(s.taps, systolic)
  const path = pathPs(lv, s.lvl, s.fix)
  const slack = slackPs(s.fclk, lv, s.lvl, s.fix)
  const period = path + slack
  timing.replaceChildren()
  timing.setAttribute('viewBox', '0 0 640 130')
  const sc = 600 / Math.max(period, path)
  timing.append(svgEl('rect', { x: 20, y: 20, width: period * sc, height: 30, rx: 5, fill: 'none', stroke: '#fff', 'stroke-dasharray': '5 4' }))
  timing.append(svgEl('text', { x: 24, y: 14, class: 'dk-txt' }, fill(say('SAY_PERIOD'), num(period, 0))))
  timing.append(svgEl('rect', { x: 20, y: 64, width: s.fix * sc, height: 30, rx: 5, fill: COLORS[5] }))
  for (let k = 0; k < lv; k++) timing.append(svgEl('rect', { x: 20 + (s.fix + k * s.lvl) * sc + 1, y: 64, width: s.lvl * sc - 2, height: 30, rx: 4, fill: slack < 0 ? COLORS[6] : COLORS[k % 2 ? 1 : 4] }))
  timing.append(svgEl('text', { x: 24, y: 116, class: 'dk-txt' }, fill(say('SAY_PATH'), num(path), lv)))
  stat.replaceChildren(tiles([
    { label: say('SAY_PER_CH'), value: String(per), tone: 2 },
    { label: say('SAY_FIT'), value: num(filtersOn200t(per)), tone: 0 },
    { label: say('SAY_LEVELS'), value: String(lv), tone: 1 },
    { label: say('SAY_SLACK'), value: fill(say('SAY_PS'), num(slack, 0)), tone: slack < 0 ? 'bad' : 0 },
  ]))
}

ctl.start()
