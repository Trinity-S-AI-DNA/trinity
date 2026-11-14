// prefix-adder/tool.js -- lesson 2 of arithmetic-and-dsp: the carries as a prefix network, four ways.
// It computes nothing itself: every edge (src), level count, cell count, fanout and the check that
// every carry is computed (covers) come from ./logic.js, the fn bodies of gHashTag/t27
// specs/fpga/dsp/adders.t27 compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/prefix-adder.t27.
import { cells, covers, levels, maxFanout, src } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const WIDTHS = K('K_WIDTHS', [4, 8, 16, 32])
const NETS = W.SAY_NETS || []
const ctl = controls([
  { key: 'w', label: say('SAY_WIDTH'), kind: 'choice', options: WIDTHS.map(String) },
  { key: 'net', label: say('SAY_NETWORK'), kind: 'choice', options: NETS },
  { key: 'col', kind: 'hidden', min: 0, max: 31 },
], { names: W.SAY_PRESET_NAMES, values: { w: K('K_PRESET_WIDTH'), net: K('K_PRESET_NET'), col: K('K_PRESET_COL') } }, draw)

const net = canvas('pa-net', say('SAY_NET_LABEL'))
const bars = canvas('pa-bars', say('SAY_BARS_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, el('p', { class: 'dk-note' }, say('SAY_TAP')), net, stat, bars, source())

function draw(s) {
  const n = WIDTHS[s.w]
  const kind = s.net
  const col = Math.min(s.col, n - 1)
  const L = levels(kind, n)
  const left = 30, right = 14, top = 34, bottom = 30
  const rowH = Math.max(16, Math.min(44, 300 / Math.max(1, L)))
  const H = top + (L + 1) * rowH + bottom
  net.replaceChildren()
  net.setAttribute('viewBox', `0 0 640 ${H}`)
  const cw = (640 - left - right) / n
  const x = (i) => left + (n - 1 - i) * cw + cw / 2
  const y = (lv) => top + lv * rowH
  // The cone of the selected column: every cell whose value reaches its carry.
  const cone = Array.from({ length: L + 1 }, () => new Set())
  cone[L].add(col)
  for (let lv = L - 1; lv >= 0; lv--) {
    for (const j of cone[lv + 1]) { cone[lv].add(j); const sj = src(kind, n, j, lv); if (sj >= 0) cone[lv].add(sj) }
  }
  for (let i = 0; i < n; i++) {
    net.append(svgEl('line', { x1: x(i), x2: x(i), y1: y(0), y2: y(L), stroke: cone[L].has(i) && i === col ? COLORS[1] : 'rgba(173,201,192,0.18)', 'stroke-width': i === col ? 2 : 1 }))
    if (cw >= 14 || i % 4 === 0) net.append(svgEl('text', { x: x(i), y: top - 12, class: 'dk-txt-dim', 'text-anchor': 'middle' }, i))
  }
  for (let lv = 0; lv < L; lv++) {
    const c = COLORS[lv % COLORS.length]
    for (let i = 0; i < n; i++) {
      const sj = src(kind, n, i, lv)
      if (sj < 0) continue
      const hot = cone[lv + 1].has(i)
      net.append(svgEl('line', { x1: x(sj), y1: y(lv), x2: x(i), y2: y(lv + 1), stroke: c, 'stroke-width': hot ? 3 : 1.5, opacity: hot ? 1 : 0.55 }))
      net.append(svgEl('circle', { cx: x(i), cy: y(lv + 1), r: Math.max(3, Math.min(7, cw * 0.28)), fill: c, stroke: hot ? '#fff' : 'none' }))
    }
  }
  // Tap targets: one column-wide strip per bit.
  for (let i = 0; i < n; i++) {
    const hit = svgEl('rect', { x: x(i) - cw / 2, y: top - 26, width: cw, height: H - top, fill: 'transparent', class: 'dk-bitbtn', tabindex: 0, role: 'button', 'aria-label': fill(say('SAY_COLUMN'), i) })
    const pick = () => ctl.set('col', i)
    hit.addEventListener('click', pick)
    hit.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick() } })
    net.append(hit)
  }
  net.append(svgEl('text', { x: 6, y: H - 10, class: 'dk-txt-dim' }, fill(say('SAY_LEVELS_DOWN'), L)))
  stat.replaceChildren(tiles([
    { label: say('SAY_LEVELS'), value: String(L), tone: 0 },
    { label: say('SAY_CELLS'), value: String(cells(kind, n)), tone: 1 },
    { label: say('SAY_FANOUT'), value: String(maxFanout(kind, n)), tone: 3 },
    { label: say('SAY_CHECK'), value: covers(kind, n) ? say('SAY_YES') : say('SAY_NO'), tone: covers(kind, n) ? 2 : 'bad' },
  ]))
  // All four networks at this width, side by side: levels against cells.
  bars.replaceChildren()
  bars.setAttribute('viewBox', '0 0 640 170')
  const vals = NETS.map((_, k) => [levels(k, n), cells(k, n)])
  const maxL = Math.max(...vals.map((v) => v[0]))
  const maxC = Math.max(...vals.map((v) => v[1]))
  const colW = 600 / NETS.length
  bars.append(svgEl('text', { x: 20, y: 16, class: 'dk-txt-dim' }, fill(say('SAY_COMPARE'), n)))
  vals.forEach(([lv, c], k) => {
    const x0 = 24 + k * colW
    const hL = (lv / maxL) * 100, hC = (c / maxC) * 100
    bars.append(svgEl('rect', { x: x0 + 10, y: 130 - hL, width: colW / 2 - 16, height: hL, rx: 4, fill: COLORS[0], opacity: k === kind ? 1 : 0.45 }))
    bars.append(svgEl('rect', { x: x0 + colW / 2, y: 130 - hC, width: colW / 2 - 16, height: hC, rx: 4, fill: COLORS[1], opacity: k === kind ? 1 : 0.45 }))
    bars.append(svgEl('text', { x: x0 + colW / 4 + 2, y: 126 - hL, class: 'dk-txt', 'text-anchor': 'middle' }, lv))
    bars.append(svgEl('text', { x: x0 + (3 * colW) / 4 - 8, y: 126 - hC, class: 'dk-txt', 'text-anchor': 'middle' }, c))
    bars.append(svgEl('text', { x: x0 + colW / 2 - 4, y: 150, class: k === kind ? 'dk-txt-big' : 'dk-txt-dim', 'text-anchor': 'middle' }, NETS[k]))
  })
  stat.append(el('div', { class: 'dk-legend' }, el('span', {}, el('i', { style: `background:${COLORS[0]}` }), say('SAY_LEVELS')), el('span', {}, el('i', { style: `background:${COLORS[1]}` }), say('SAY_CELLS'))))
}

ctl.start()
