// shift-add/tool.js -- lesson 4 of arithmetic-and-dsp: a multiplier is a sum of shifted partial
// products. It computes nothing itself: each partial product, the running sum and the count of
// rows used come from ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/dsp/multipliers.t27
// compiled to wasm. Words are SAY_ and numbers K_ constants of specs/widgets/shift-add.t27.
import { partial, rowsUsed, shiftAdd } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const BITS = K('K_BITS', 8)
const MAX = K('K_MAX_OPERAND', 255)
const ctl = controls([
  { key: 'a', label: say('SAY_A'), min: 0, max: MAX },
  { key: 'b', label: say('SAY_B'), min: 0, max: MAX },
  { key: 'step', label: say('SAY_STEP'), min: 0, max: BITS },
], { names: W.SAY_PRESET_NAMES, values: { a: K('K_PRESET_A'), b: K('K_PRESET_B'), step: K('K_PRESET_STEP') } }, draw)

const grid = canvas('sa-grid', say('SAY_GRID_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, grid, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const cols = K('K_PRODUCT_BITS', 16)
  const cw = 34
  const right = 630
  const x = (i) => right - (i + 1) * cw
  const rowH = 30
  const top = 20
  const H = top + (BITS + 4) * rowH + 30
  grid.replaceChildren()
  grid.setAttribute('viewBox', `0 0 640 ${H}`)
  const word = (v, y, color, dim, label, width = cols) => {
    for (let i = 0; i < width; i++) {
      const bit = Math.floor(v / 2 ** i) % 2
      grid.append(svgEl('rect', { x: x(i) + 2, y, width: cw - 4, height: rowH - 6, rx: 4, fill: bit ? color : '#0b1411', opacity: dim ? 0.28 : 1 }))
      if (bit) grid.append(svgEl('text', { x: x(i) + cw / 2, y: y + 17, 'text-anchor': 'middle', style: 'font: 700 12px var(--w-mono); fill: #00140b' }, 1))
    }
    grid.append(svgEl('text', { x: 4, y: y + 17, class: dim ? 'dk-txt-dim' : 'dk-txt' }, label))
  }
  word(s.a, top, COLORS[2], false, fill(say('SAY_ROW_A'), s.a), BITS)
  word(s.b, top + rowH, COLORS[3], false, fill(say('SAY_ROW_B'), s.b), BITS)
  grid.append(svgEl('line', { x1: 4, x2: right, y1: top + 2 * rowH - 2, y2: top + 2 * rowH - 2, stroke: '#adc9c0' }))
  for (let i = 0; i < BITS; i++) {
    const pp = partial(s.a, s.b, i)
    const used = ((s.b >> i) & 1) === 1
    const shown = i < s.step
    const y = top + (2 + i) * rowH
    word(pp, y, COLORS[i % 2 ? 1 : 0], !used || !shown, fill(used ? say('SAY_ROW_PP') : say('SAY_ROW_ZERO'), i, pp))
  }
  const yS = top + (2 + BITS) * rowH + 6
  grid.append(svgEl('line', { x1: 4, x2: right, y1: yS - 4, y2: yS - 4, stroke: '#adc9c0' }))
  const run = shiftAdd(s.a, s.b, s.step)
  word(run, yS, COLORS[4], false, fill(say('SAY_ROW_SUM'), s.step))
  const prod = shiftAdd(s.a, s.b, BITS)
  const frac = prod ? run / prod : 1
  grid.append(svgEl('rect', { x: 150, y: yS + rowH + 6, width: 480, height: 10, rx: 5, fill: '#0b1411' }))
  grid.append(svgEl('rect', { x: 150, y: yS + rowH + 6, width: 480 * frac, height: 10, rx: 5, fill: COLORS[4] }))
  grid.append(svgEl('text', { x: 4, y: yS + rowH + 16, class: 'dk-txt-dim' }, fill(say('SAY_PROGRESS'), num(run), num(prod))))
  const rows = rowsUsed(s.b, BITS)
  stat.replaceChildren(tiles([
    { label: say('SAY_PRODUCT'), value: fill('{0} x {1} = {2}', s.a, s.b, num(prod)), tone: 4 },
    { label: say('SAY_ROWS'), value: fill(say('SAY_OF'), rows, BITS), tone: 0 },
    { label: say('SAY_WIDTH'), value: fill(say('SAY_BITS_N'), cols), tone: 2 },
  ]))
}

ctl.start()
