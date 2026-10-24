// cic-growth/tool.js -- lesson 20 of arithmetic-and-dsp: the CIC decimator, a filter with no
// multipliers, its response and the bits it grows. It computes nothing itself: the gain, the bit
// growth, the output width and the response come from ./logic.js, the fn bodies of gHashTag/t27
// specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/cic-growth.t27.
import { cicDb, cicGain, cicGrowth, cicOutBits } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const RS = K('K_R_CHOICES', [2, 4, 8, 16, 32, 64, 128, 256, 1024, 4096])
const FLOOR = -K('K_DB_SHOWN', 120)
const SPAN = K('K_OUT_RATES_SHOWN', 4)
const ctl = controls([
  { key: 'n', label: say('SAY_N'), min: 1, max: K('K_MAX_STAGES', 8) },
  { key: 'r', label: say('SAY_R'), kind: 'choice', options: RS.map(String) },
  { key: 'm', label: say('SAY_M'), min: 1, max: K('K_MAX_M', 2) },
  { key: 'bin', label: say('SAY_BIN'), min: K('K_MIN_BIN', 4), max: K('K_MAX_BIN', 32) },
], { names: W.SAY_PRESET_NAMES, values: { n: K('K_PRESET_N'), r: K('K_PRESET_R'), m: K('K_PRESET_M'), bin: K('K_PRESET_BIN') } }, draw)

const resp = canvas('cg-resp', say('SAY_RESP_LABEL'))
const regs = canvas('cg-regs', say('SAY_REGS_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, resp, el('p', { class: 'dk-note' }, say('SAY_NOTE')), regs, source())

function draw(s) {
  const R = RS[s.r]
  resp.replaceChildren()
  const p = plot(resp, { w: 640, h: 250, x0: 0, x1: SPAN, y0: FLOOR, y1: 5, yticks: [FLOOR, FLOOR / 2, 0], xticks: Array.from({ length: SPAN * 2 + 1 }, (_, i) => i / 2), xlabel: say('SAY_F_AXIS'), ylabel: say('SAY_DB') })
  resp.append(svgEl('rect', { x: p.x(0), y: p.y(5), width: p.x(0.5) - p.x(0), height: p.y(FLOOR) - p.y(5), fill: COLORS[0], opacity: 0.08 }))
  p.line(Array.from({ length: 801 }, (_, k) => { const x = (SPAN * k) / 800; return [x, Math.max(FLOOR, cicDb(s.n, R, s.m, x / R))] }), COLORS[1], 2)
  const pass = K('K_PASS_PCT', 25) / 100
  const droop = cicDb(s.n, R, s.m, pass / R)
  resp.append(svgEl('circle', { cx: p.x(pass), cy: p.y(droop), r: 6, fill: COLORS[3] }))
  resp.append(svgEl('text', { x: p.x(pass) + 10, y: p.y(droop) + 18, class: 'dk-txt', style: `fill:${COLORS[3]}` }, fill(say('SAY_DROOP_AT'), droop.toFixed(2))))
  // The registers: every integrator and comb carries the full output width (Hogenauer).
  const bout = cicOutBits(s.bin, s.n, R, s.m)
  const growth = cicGrowth(s.n, R, s.m)
  const stages = 2 * s.n
  regs.replaceChildren()
  const rh = Math.min(24, 300 / (stages + 1))
  const H = 20 + (stages + 1) * (rh + 4) + 26
  regs.setAttribute('viewBox', `0 0 640 ${H}`)
  const scale = 470 / Math.max(K('K_MAX_BIN', 32) + 1, bout)
  for (let i = 0; i <= stages; i++) {
    const y = 14 + i * (rh + 4)
    const label = i < s.n ? fill(say('SAY_INTEG'), i + 1) : i < stages ? fill(say('SAY_COMB'), i - s.n + 1) : say('SAY_OUTPUT')
    regs.append(svgEl('text', { x: 6, y: y + rh * 0.7, class: 'dk-txt' }, label))
    regs.append(svgEl('rect', { x: 130, y, width: s.bin * scale, height: rh, rx: 3, fill: COLORS[2] }))
    regs.append(svgEl('rect', { x: 130 + s.bin * scale, y, width: growth * scale, height: rh, rx: 3, fill: COLORS[4] }))
    regs.append(svgEl('text', { x: 136 + bout * scale, y: y + rh * 0.7, class: 'dk-txt' }, fill(say('SAY_BITS_N'), bout)))
  }
  regs.append(svgEl('text', { x: 130, y: H - 6, class: 'dk-txt-dim' }, fill(say('SAY_SPLIT'), s.bin, growth)))
  stat.replaceChildren(tiles([
    { label: say('SAY_GAIN'), value: num(cicGain(s.n, R, s.m)), tone: 1 },
    { label: say('SAY_GROWTH'), value: fill(say('SAY_BITS_N'), growth), tone: 4 },
    { label: say('SAY_BOUT'), value: fill(say('SAY_BITS_N'), bout), tone: 2 },
    { label: say('SAY_DROOP'), value: fill(say('SAY_DB_VALUE'), droop.toFixed(2)), tone: 3 },
  ]))
}

ctl.start()
