// carry-chain/tool.js -- lesson 1 of arithmetic-and-dsp: a + b bit by bit, the carry running up the
// chain, and what the dedicated carry logic saves. It computes nothing itself: every sum bit, carry,
// role, run and delay comes from ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/dsp/adders.t27
// compiled to wasm. Words are SAY_ and numbers K_ constants of specs/widgets/carry-chain.t27.
import { bitRole, carry4Blocks, carryOut, carryRun, chainPs, ripplePs, sumBit, sumValue } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const MAXW = K('K_MAX_BITS', 32)
const ctl = controls([
  { key: 'n', label: say('SAY_BITS'), min: K('K_MIN_BITS', 4), max: MAXW, step: 4 },
  { key: 'a', kind: 'hidden', min: 0, max: 4294967295 },
  { key: 'b', kind: 'hidden', min: 0, max: 4294967295 },
  { key: 'lut', label: say('SAY_LUT'), min: K('K_MIN_PS', 10), max: K('K_MAX_PS', 1000), step: 10 },
  { key: 'route', label: say('SAY_ROUTE'), min: K('K_MIN_PS', 10), max: K('K_MAX_PS', 1000), step: 10 },
  { key: 'hop', label: say('SAY_HOP'), min: K('K_MIN_PS', 10), max: K('K_MAX_PS', 1000), step: 5 },
], { names: W.SAY_PRESET_NAMES, values: { n: K('K_PRESET_BITS'), a: K('K_PRESET_A'), b: K('K_PRESET_B'), lut: K('K_PRESET_LUT_PS'), route: K('K_PRESET_ROUTE_PS'), hop: K('K_PRESET_HOP_PS') } }, draw)

const grid = canvas('cc-grid', say('SAY_GRID_LABEL'))
const timing = canvas('cc-timing', say('SAY_TIMING_LABEL'))
const stat = el('div')
const note = el('p', { class: 'dk-note' })
root.replaceChildren(ctl.node, el('p', { class: 'dk-note' }, say('SAY_TAP')), grid, stat, timing, note, source())

const mask = (n) => (n >= 32 ? 4294967295 : 2 ** n - 1)

function draw(s) {
  const n = s.n
  const a = s.a > mask(n) ? (s.a & mask(n)) >>> 0 : s.a
  const b = s.b > mask(n) ? (s.b & mask(n)) >>> 0 : s.b
  const left = 64
  const cw = (640 - left - 34) / n
  const rows = ['SAY_ROW_A', 'SAY_ROW_B', 'SAY_ROW_ROLE', 'SAY_ROW_CARRY', 'SAY_ROW_SUM']
  const rh = 36
  const top = 26
  const H = top + rows.length * rh + 10
  grid.replaceChildren()
  grid.setAttribute('viewBox', `0 0 640 ${H}`)
  const cx = (i) => left + 30 + (n - 1 - i) * cw + cw / 2
  const cy = (r) => top + r * rh + rh / 2
  rows.forEach((k, r) => grid.append(svgEl('text', { x: 6, y: cy(r) + 4, class: 'dk-txt' }, say(k))))
  // CARRY4 blocks: one per slice, 4 bits each, counted from bit 0.
  const blocks = carry4Blocks(n)
  for (let k = 0; k < blocks; k++) {
    const hi = Math.min(n - 1, k * 4 + 3)
    const x0 = cx(hi) - cw / 2 + 1
    const x1 = cx(k * 4) + cw / 2 - 1
    grid.append(svgEl('rect', { x: x0, y: top - 18, width: x1 - x0, height: H - top + 12, rx: 6, fill: 'none', stroke: COLORS[5], 'stroke-dasharray': '3 4', opacity: 0.6 }))
    if (cw * 4 > 40) grid.append(svgEl('text', { x: (x0 + x1) / 2, y: top - 6, class: 'dk-txt-dim', 'text-anchor': 'middle' }, fill(say('SAY_BLOCK'), k)))
  }
  const carries = Array.from({ length: n }, (_, i) => carryOut(a, b, i))
  // The longest run of carries, drawn in magenta: the slowest carry of this sum.
  const run = carryRun(a, b, n)
  let runEnd = -1
  for (let i = 0, cur = 0; i < n; i++) { cur = carries[i] ? cur + 1 : 0; if (cur === run && run > 0 && runEnd < 0) runEnd = i }
  const fs = Math.max(9, Math.min(15, cw * 0.62))
  for (let i = 0; i < n; i++) {
    const x = cx(i)
    for (const [r, word, key] of [[0, a, 'a'], [1, b, 'b']]) {
      const bit = ((word >>> i) & 1)
      const cell = svgEl('rect', { x: x - cw / 2 + 1.5, y: cy(r) - 14, width: cw - 3, height: 28, rx: 5, class: 'dk-bitbtn', tabindex: 0, role: 'button', 'aria-label': `${key}${i}`, fill: bit ? COLORS[r === 0 ? 2 : 3] : '#0b1411', stroke: 'rgba(173,201,192,0.25)' })
      const flip = () => ctl.set(key, ((word ^ (2 ** i)) >>> 0))
      cell.addEventListener('click', flip)
      cell.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip() } })
      grid.append(cell, svgEl('text', { x, y: cy(r) + 5, 'text-anchor': 'middle', 'pointer-events': 'none', style: `font: 700 ${fs}px var(--w-mono); fill: ${bit ? '#00140b' : '#5f7a71'}` }, bit))
    }
    const role = bitRole(a, b, i)
    const roleColor = [ '#5f7a71', COLORS[1], COLORS[2] ][role]
    grid.append(svgEl('text', { x, y: cy(2) + 5, 'text-anchor': 'middle', style: `font: 700 ${fs}px var(--w-mono); fill: ${roleColor}` }, say('SAY_ROLE_LETTERS', role)))
    const c = carries[i]
    const inRun = runEnd >= 0 && i <= runEnd && i > runEnd - run
    if (c && i + 1 <= n - 1) grid.append(svgEl('line', { x1: x - 4, x2: cx(i + 1) + 4, y1: cy(3), y2: cy(3), stroke: inRun ? COLORS[3] : COLORS[1], 'stroke-width': inRun ? 4 : 2 }))
    grid.append(svgEl('circle', { cx: x, cy: cy(3), r: Math.min(9, cw * 0.32), fill: c ? (inRun ? COLORS[3] : COLORS[1]) : '#0b1411', stroke: 'rgba(173,201,192,0.3)' }))
    const sb = sumBit(a, b, i)
    grid.append(svgEl('text', { x, y: cy(4) + 5, 'text-anchor': 'middle', style: `font: 700 ${fs}px var(--w-mono); fill: ${sb ? COLORS[0] : '#5f7a71'}` }, sb))
  }
  const cTop = carries[n - 1]
  grid.append(svgEl('text', { x: left + 15, y: cy(4) + 5, 'text-anchor': 'middle', style: `font: 700 ${fs}px var(--w-mono); fill: ${cTop ? COLORS[4] : '#5f7a71'}` }, cTop))
  grid.append(svgEl('text', { x: left + 15, y: cy(3) + 4, 'text-anchor': 'middle', class: 'dk-txt-dim' }, say('SAY_COUT')))

  const rip = ripplePs(n, s.lut, s.route)
  const chn = chainPs(n, s.lut, s.route, s.hop)
  stat.replaceChildren(tiles([
    { label: say('SAY_SUM'), value: fill('{0} + {1} = {2}', num(a), num(b), num(sumValue(a, b, n))), tone: 0 },
    { label: say('SAY_RUN'), value: fill(say('SAY_BITS_OF'), run, n), tone: 3 },
    { label: say('SAY_BLOCKS'), value: String(blocks), tone: 5 },
    { label: say('SAY_SPEEDUP'), value: `${(rip / chn).toFixed(1)}x`, tone: 1 },
  ]))
  timing.replaceChildren()
  const p = plot(timing, { w: 640, h: 150, x0: 0, x1: Math.max(rip, chn) * 1.08, y0: 0, y1: 2, left: 150, bottom: 34, top: 10, xticks: [], xlabel: say('SAY_PS') })
  ;[[1, rip, 'SAY_RIPPLE', 6], [0, chn, 'SAY_CHAIN', 0]].forEach(([row, v, k, col]) => {
    const y = p.y(row + 0.75)
    timing.append(svgEl('rect', { x: p.x(0), y, width: Math.max(2, p.x(v) - p.x(0)), height: p.y(row + 0.25) - y, rx: 4, fill: COLORS[col] }))
    timing.append(svgEl('text', { x: 8, y: (y + p.y(row + 0.25)) / 2 + 4, class: 'dk-txt' }, say(k)))
    timing.append(svgEl('text', { x: p.x(v) + 6 > 560 ? p.x(v) - 6 : p.x(v) + 6, y: (y + p.y(row + 0.25)) / 2 + 4, class: 'dk-txt-big', 'text-anchor': p.x(v) + 6 > 560 ? 'end' : 'start' }, fill(say('SAY_PS_VALUE'), num(v))))
  })
  note.replaceChildren(say('SAY_ASSUMED'))
}

ctl.start()
