// booth-radix4/tool.js -- lesson 5 of arithmetic-and-dsp: radix-4 Booth recoding halves the partial
// products. It computes nothing itself: every digit, partial product, the product and the counts
// come from ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/dsp/multipliers.t27 compiled to
// wasm. Words are SAY_ and numbers K_ constants of specs/widgets/booth-radix4.t27.
import { boothDigit, boothNonzero, boothPartial, boothProduct, rowsUsed } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const BITS = K('K_BITS', 8)
const DIGITS = K('K_DIGITS', 4)
// A t27 constant is never negative: the range and the presets are stored with K_OFFSET added.
const OFF = K('K_OFFSET', 128)
const unbias = (xs) => (xs || []).map((v) => v - OFF)
const ctl = controls([
  { key: 'a', label: say('SAY_A'), min: -OFF, max: OFF - 1 },
  { key: 'b', label: say('SAY_B'), min: -OFF, max: OFF - 1 },
], { names: W.SAY_PRESET_NAMES, values: { a: unbias(K('K_PRESET_A_BIASED')), b: unbias(K('K_PRESET_B_BIASED')) } }, draw)

const rec = canvas('br-recode', say('SAY_RECODE_LABEL'))
const pps = canvas('br-pps', say('SAY_PP_LABEL'))
const table = canvas('br-table', say('SAY_TABLE_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, rec, pps, el('p', { class: 'dk-note' }, say('SAY_TABLE_NOTE')), table, source())

const DCOL = { '-2': COLORS[6], '-1': COLORS[4], 0: '#5f7a71', 1: COLORS[2], 2: COLORS[0] }

function draw(s) {
  // B's bits, two's complement, b7 .. b0, then the implicit b(-1) = 0.
  rec.replaceChildren()
  rec.setAttribute('viewBox', '0 0 640 190')
  const cw = 60
  const x = (i) => 530 - i * cw
  for (let i = -1; i < BITS; i++) {
    const bit = i < 0 ? 0 : (s.b >> i) & 1
    rec.append(svgEl('rect', { x: x(i) - cw / 2 + 4, y: 70, width: cw - 8, height: 34, rx: 6, fill: i < 0 ? 'none' : bit ? COLORS[3] : '#0b1411', stroke: i < 0 ? '#adc9c0' : 'rgba(173,201,192,0.25)', 'stroke-dasharray': i < 0 ? '4 3' : null }))
    rec.append(svgEl('text', { x: x(i), y: 93, 'text-anchor': 'middle', style: `font: 700 16px var(--w-mono); fill: ${bit && i >= 0 ? '#00140b' : '#adc9c0'}` }, bit))
    rec.append(svgEl('text', { x: x(i), y: 120, 'text-anchor': 'middle', class: 'dk-txt-dim' }, i < 0 ? say('SAY_IMPLICIT') : `b${i}`))
  }
  for (let k = 0; k < DIGITS; k++) {
    const d = boothDigit(s.b, k)
    const xr = x(2 * k - 1) + cw / 2 - 6
    const xl = x(2 * k + 1) - cw / 2 + 6
    const yb = k % 2 ? 40 : 54
    rec.append(svgEl('path', { d: `M${xl},${yb + 12} L${xl},${yb} L${xr},${yb} L${xr},${yb + 12}`, fill: 'none', stroke: DCOL[d], 'stroke-width': 3 }))
    rec.append(svgEl('text', { x: (xl + xr) / 2, y: yb - 6, 'text-anchor': 'middle', style: `font: 700 13px var(--w-mono); fill: ${DCOL[d]}` }, fill(say('SAY_GROUP'), k)))
    rec.append(svgEl('text', { x: (x(2 * k + 1) + x(2 * k)) / 2, y: 162, 'text-anchor': 'middle', style: `font: 800 26px var(--w-mono); fill: ${DCOL[d]}` }, d > 0 ? `+${d}` : d))
  }
  rec.append(svgEl('text', { x: 4, y: 182, class: 'dk-txt-dim' }, say('SAY_DIGITS_ROW')))
  // The partial products, each digit x A x 4^k, as signed bars.
  pps.replaceChildren()
  pps.setAttribute('viewBox', `0 0 640 ${40 + (DIGITS + 1) * 38}`)
  const parts = Array.from({ length: DIGITS }, (_, k) => boothPartial(s.a, s.b, k))
  const prod = boothProduct(s.a, s.b, BITS)
  const span = Math.max(1, ...parts.map(Math.abs), Math.abs(prod))
  const zero = 420
  const scale = 200 / span
  pps.append(svgEl('line', { x1: zero, x2: zero, y1: 10, y2: 30 + (DIGITS + 1) * 38, stroke: '#adc9c0' }))
  parts.forEach((v, k) => {
    const y = 16 + k * 38
    const d = boothDigit(s.b, k)
    pps.append(svgEl('rect', { x: v < 0 ? zero + v * scale : zero, y, width: Math.max(1, Math.abs(v) * scale), height: 24, rx: 4, fill: DCOL[d] }))
    pps.append(svgEl('text', { x: 4, y: y + 17, class: 'dk-txt' }, fill(say('SAY_PP'), d > 0 ? `+${d}` : d, s.a, k, num(v))))
  })
  const yP = 16 + DIGITS * 38 + 6
  pps.append(svgEl('rect', { x: prod < 0 ? zero + prod * scale : zero, y: yP, width: Math.max(1, Math.abs(prod) * scale), height: 28, rx: 4, fill: COLORS[1] }))
  pps.append(svgEl('text', { x: 4, y: yP + 19, class: 'dk-txt-big' }, fill(say('SAY_SUM'), num(prod))))
  // The recoding table, read off the spec: group (b(2k+1), b(2k), b(2k-1)) -> digit.
  table.replaceChildren()
  table.setAttribute('viewBox', '0 0 640 70')
  for (let g = 0; g < 8; g++) {
    const d = boothDigit(g * 2, 1)
    const xg = 10 + g * 78
    table.append(svgEl('rect', { x: xg, y: 6, width: 70, height: 56, rx: 8, fill: '#0b1411', stroke: DCOL[d] }))
    table.append(svgEl('text', { x: xg + 35, y: 28, 'text-anchor': 'middle', class: 'dk-txt' }, g.toString(2).padStart(3, '0')))
    table.append(svgEl('text', { x: xg + 35, y: 52, 'text-anchor': 'middle', style: `font: 800 18px var(--w-mono); fill: ${DCOL[d]}` }, d > 0 ? `+${d}` : d))
  }
  stat.replaceChildren(tiles([
    { label: say('SAY_PRODUCT'), value: fill('{0} x {1} = {2}', s.a, s.b, num(prod)), tone: 1 },
    { label: say('SAY_BOOTH_ROWS'), value: fill(say('SAY_OF'), boothNonzero(s.b, BITS), DIGITS), tone: 0 },
    { label: say('SAY_PLAIN_ROWS'), value: fill(say('SAY_OF'), rowsUsed(s.b & K('K_MASK', 255), BITS), BITS), tone: 3 },
  ]))
}

ctl.start()
