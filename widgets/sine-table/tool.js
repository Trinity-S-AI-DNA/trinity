// sine-table/tool.js -- lesson 12 of arithmetic-and-dsp: a quarter-wave sine table, how many
// entries it needs, and what linear interpolation buys. It computes nothing itself: the entries,
// the table's sine, the reference, the errors, the bounds and the memory come from ./logic.js, the
// fn bodies of gHashTag/t27 specs/fpga/dsp/cordic.t27 compiled to wasm. Words are SAY_ and numbers
// K_ constants of specs/widgets/sine-table.t27.
import { errorOf, interpBound, refSin, tableBits, tableEntry, tableMaxErr, tableSin, wordBound } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const ENTRIES = K('K_ENTRIES', [4, 8, 16, 32, 64, 128, 256, 512, 1024])
const QUARTER = K('K_QUARTER_MICRORAD', 1570796) / 1e6
const POINTS = K('K_PLOT_POINTS', 400)
const ctl = controls([
  { key: 'e', label: say('SAY_ENTRIES'), kind: 'choice', options: ENTRIES.map(String) },
  { key: 'bits', label: say('SAY_BITS'), min: K('K_MIN_BITS', 6), max: K('K_MAX_BITS', 24) },
  { key: 'interp', label: say('SAY_LOOKUP'), kind: 'choice', options: W.SAY_LOOKUPS || [] },
], { names: W.SAY_PRESET_NAMES, values: { e: K('K_PRESET_ENTRIES'), bits: K('K_PRESET_BITS'), interp: K('K_PRESET_INTERP') } }, draw)

const wave = canvas('st-wave', say('SAY_WAVE_LABEL'))
const errs = canvas('st-err', say('SAY_ERR_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, wave, errs, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const n = ENTRIES[s.e]
  const interp = s.interp === 1
  const xs = Array.from({ length: POINTS + 1 }, (_, k) => (QUARTER * k) / POINTS)
  wave.replaceChildren()
  const p = plot(wave, { w: 640, h: 240, x0: 0, x1: QUARTER, y0: 0, y1: 1.05, yticks: [0, 0.5, 1], xticks: [], xlabel: say('SAY_QUARTER') })
  p.line(xs.map((x) => [x, refSin(x)]), COLORS[0], 2)
  p.line(xs.map((x) => [x, tableSin(x, n, s.bits, interp)]), COLORS[3], 2)
  if (n <= K('K_MAX_DOTS', 64)) for (let k = 0; k <= n; k++) wave.append(svgEl('circle', { cx: p.x((QUARTER * k) / n), cy: p.y(tableEntry(k, n, s.bits)), r: 3.5, fill: COLORS[1] }))
  errs.replaceChildren()
  const e = xs.map((x) => [x, errorOf(tableSin(x, n, s.bits, interp), refSin(x))])
  const worst = tableMaxErr(n, s.bits, interp)
  const ib = interpBound(n), wb = wordBound(s.bits)
  const top = Math.max(worst, interp ? ib + wb : 0) * 1.2 || 1e-9
  const pe = plot(errs, { w: 640, h: 200, x0: 0, x1: QUARTER, y0: 0, y1: top, yticks: [0, top / 2, top], yfmt: (v) => v.toExponential(1), xticks: [], xlabel: say('SAY_ERR_AXIS') })
  pe.line(e, COLORS[4], 1.5)
  if (interp) pe.line([[0, ib], [QUARTER, ib]], COLORS[2], 1.5, { 'stroke-dasharray': '6 4' })
  pe.line([[0, wb], [QUARTER, wb]], COLORS[5], 1.5, { 'stroke-dasharray': '2 4' })
  errs.append(svgEl('text', { x: 60, y: 26, class: 'dk-txt' }, fill(say('SAY_WORST_IS'), worst.toExponential(3))))
  stat.replaceChildren(tiles([
    { label: say('SAY_WORST'), value: worst.toExponential(3), tone: 4 },
    { label: say('SAY_IB'), value: ib.toExponential(3), tone: 2 },
    { label: say('SAY_WB'), value: wb.toExponential(3), tone: 5 },
    { label: say('SAY_MEMORY'), value: fill(say('SAY_BITS_N'), num(tableBits(n, s.bits))), tone: 1 },
  ]))
  stat.append(el('div', { class: 'dk-legend' },
    el('span', {}, el('i', { style: `background:${COLORS[0]}` }), say('SAY_SINE')),
    el('span', {}, el('i', { style: `background:${COLORS[3]}` }), say('SAY_TABLE')),
    el('span', {}, el('i', { style: `background:${COLORS[2]}` }), say('SAY_IB')),
    el('span', {}, el('i', { style: `background:${COLORS[5]}` }), say('SAY_WB'))))
}

ctl.start()
