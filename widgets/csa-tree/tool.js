// csa-tree/tool.js -- lesson 3 of arithmetic-and-dsp: carry-save adders squeeze k numbers to two
// with no carry propagation, then one adder finishes. It computes nothing itself: the rows per
// layer (wallace_next), the levels (csa_levels), the Dadda heights, the sum and carry words of a
// 3:2 counter and the delays come from ./logic.js, the fn bodies of gHashTag/t27
// specs/fpga/dsp/adders.t27 compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/csa-tree.t27.
import { chainFaDelays, csaAdders, csaCarry, csaLevels, csaSum, csaTotal, dadda, treeFaDelays, wallaceNext } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const DMAX = K('K_DEMO_MAX', 255)
const ctl = controls([
  { key: 'k', label: say('SAY_OPERANDS'), min: K('K_MIN_OPERANDS', 3), max: K('K_MAX_OPERANDS', 64) },
  { key: 'n', label: say('SAY_BITS'), min: K('K_MIN_BITS', 4), max: K('K_MAX_BITS', 32) },
  { key: 'a', label: say('SAY_A'), min: 0, max: DMAX },
  { key: 'b', label: say('SAY_B'), min: 0, max: DMAX },
  { key: 'c', label: say('SAY_C'), min: 0, max: DMAX },
], { names: W.SAY_PRESET_NAMES, values: { k: K('K_PRESET_OPERANDS'), n: K('K_PRESET_BITS'), a: K('K_PRESET_A'), b: K('K_PRESET_B'), c: K('K_PRESET_C') } }, draw)

const tree = canvas('cs-tree', say('SAY_TREE_LABEL'))
const counter = canvas('cs-counter', say('SAY_COUNTER_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, tree, stat, el('p', { class: 'dk-note' }, say('SAY_COUNTER_NOTE')), counter, source())

function draw(s) {
  // The layers: k rows, then wallace_next of it, until two are left.
  const rows = [s.k]
  while (rows.at(-1) > 2) rows.push(wallaceNext(rows.at(-1)))
  const L = csaLevels(s.k)
  tree.replaceChildren()
  const H = 260
  tree.setAttribute('viewBox', `0 0 640 ${H}`)
  const cols = rows.length + 1
  const cw = 600 / cols
  const maxRows = rows[0]
  rows.forEach((r, j) => {
    const x0 = 20 + j * cw + 6
    const wdt = cw - 22
    const hAll = 170
    const step = Math.min(10, hAll / maxRows)
    const y0 = 30 + (hAll - r * step) / 2
    for (let q = 0; q < r; q++) tree.append(svgEl('rect', { x: x0, y: y0 + q * step, width: wdt, height: Math.max(1.5, step - 1.5), rx: 1, fill: COLORS[j % COLORS.length], opacity: 0.9 }))
    tree.append(svgEl('text', { x: x0 + wdt / 2, y: 222, class: 'dk-txt-big', 'text-anchor': 'middle' }, r))
    tree.append(svgEl('text', { x: x0 + wdt / 2, y: 242, class: 'dk-txt-dim', 'text-anchor': 'middle' }, j === 0 ? say('SAY_INPUT') : fill(say('SAY_LAYER'), j)))
    if (j > 0) tree.append(svgEl('text', { x: x0 + wdt / 2, y: 22, class: 'dk-txt-dim', 'text-anchor': 'middle' }, fill(say('SAY_DADDA'), dadda(L - j + 1))))
    if (j + 1 < cols) tree.append(svgEl('path', { d: `M${x0 + wdt + 2},${30 + hAll / 2} l12,0 m-5,-5 l5,5 l-5,5`, stroke: '#adc9c0', fill: 'none', 'stroke-width': 1.5 }))
  })
  const xc = 20 + rows.length * cw + 6
  tree.append(svgEl('rect', { x: xc, y: 30 + 170 / 2 - 22, width: cw - 22, height: 44, rx: 8, fill: 'none', stroke: COLORS[1], 'stroke-width': 2 }))
  tree.append(svgEl('text', { x: xc + (cw - 22) / 2, y: 30 + 170 / 2 + 5, class: 'dk-txt-big', 'text-anchor': 'middle' }, say('SAY_CPA')))
  tree.append(svgEl('text', { x: xc + (cw - 22) / 2, y: 242, class: 'dk-txt-dim', 'text-anchor': 'middle' }, say('SAY_ONE_CARRY')))
  stat.replaceChildren(tiles([
    { label: say('SAY_LEVELS'), value: String(L), tone: 0 },
    { label: say('SAY_ADDERS'), value: num(csaAdders(s.k, s.n)), tone: 5 },
    { label: say('SAY_TREE_DELAY'), value: fill(say('SAY_FA'), treeFaDelays(s.k, s.n)), tone: 2 },
    { label: say('SAY_CHAIN_DELAY'), value: fill(say('SAY_FA'), num(chainFaDelays(s.k, s.n))), tone: 6 },
  ]))
  // One 3:2 counter on three 8-bit numbers: a sum word and a carry word, no carry between bits.
  const sum = csaSum(s.a, s.b, s.c)
  const car = csaCarry(s.a, s.b, s.c)
  const bits = 10
  counter.replaceChildren()
  counter.setAttribute('viewBox', '0 0 640 230')
  const lines = [['SAY_A', s.a, 2], ['SAY_B', s.b, 3], ['SAY_C', s.c, 5], ['SAY_SUM_WORD', sum, 0], ['SAY_CARRY_WORD', car, 1]]
  const bw = 40
  lines.forEach(([k, v, colr], r) => {
    const y = 14 + r * 36 + (r >= 3 ? 10 : 0)
    counter.append(svgEl('text', { x: 6, y: y + 20, class: 'dk-txt' }, say(k)))
    for (let i = 0; i < bits; i++) {
      const bit = Math.floor(v / 2 ** i) % 2
      const x = 620 - (i + 1) * bw
      counter.append(svgEl('rect', { x, y, width: bw - 4, height: 28, rx: 5, fill: bit ? COLORS[colr] : '#0b1411', stroke: 'rgba(173,201,192,0.2)' }))
      counter.append(svgEl('text', { x: x + (bw - 4) / 2, y: y + 19, 'text-anchor': 'middle', style: `font: 700 13px var(--w-mono); fill: ${bit ? '#00140b' : '#5f7a71'}` }, bit))
    }
    counter.append(svgEl('text', { x: 620 - bits * bw - 8, y: y + 20, class: 'dk-txt-big', 'text-anchor': 'end' }, v))
  })
  counter.append(svgEl('line', { x1: 150, x2: 630, y1: 14 + 3 * 36 + 2, y2: 14 + 3 * 36 + 2, stroke: '#adc9c0' }))
  counter.append(svgEl('text', { x: 6, y: 224, class: 'dk-txt-big' }, fill(say('SAY_TOTAL'), num(sum), num(car), num(csaTotal(s.a, s.b, s.c)))))
}

ctl.start()
