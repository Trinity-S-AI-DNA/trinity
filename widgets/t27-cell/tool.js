// t27-cell/tool.js -- 27 seats against 16: where a 3-trit T27 cell and a 4-bit E2M1 code round a weight.
// Every word is a SAY_ constant from specs/widgets/t27-cell.t27 (window.T27_WIDGET); every level, storage
// count and perplexity is a field of ./data.json, written by scripts/widget-data/t27-cell.mjs from the
// trinity-fpga pre-registrations. Reads only ./data.json and ./tool.css; calls no other host; keeps nothing.
const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.appendChild(css)

// --- helpers ----------------------------------------------------------------------------------
const fill = (s, ...v) => String(s ?? '').replace(/\{(\d+)\}/g, (m, i) => (i < v.length ? String(v[i]) : m))
const SAY = (k, i) => (Array.isArray(W[k]) ? W[k][i] : W[k]) ?? ''
const SVGNS = 'http://www.w3.org/2000/svg'
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue
    if (k === 'class') n.className = v
    else n.setAttribute(k, v)
  }
  for (const c of kids.flat()) if (c != null) n.append(c instanceof Node ? c : String(c))
  return n
}
const sv = (tag, attrs = {}) => {
  const n = document.createElementNS(SVGNS, tag)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v))
  return n
}
const DIGITS = W.K_DIGITS ?? 4
const STEPS = W.K_SLIDER_STEPS ?? 2000
const num = (v) => (Object.is(v, -0) ? 0 : v).toFixed(DIGITS)
const signed = (v) => (v > 0 ? '+' : '') + num(v)

// --- the two grids --------------------------------------------------------------------------------
// Nearest magnitude in an ascending table; a tie keeps the smaller magnitude (the runner's rule).
function nearest(levels, top, a) {
  const t = Math.min(a, 1) * top
  let k = 0
  for (let i = 1; i < levels.length; i++) if (Math.abs(t - levels[i]) < Math.abs(t - levels[k])) k = i
  return k
}
const tritsOf = (c) => {
  const g = W.SAY_TRIT_GLYPHS || []
  const out = []
  let v = c
  for (let i = 0; i < 3; i++) {
    let r = ((v % 3) + 3) % 3
    if (r === 2) r = -1
    out.unshift(g[r + 1])
    v = (v - r) / 3
  }
  return out.join('')
}
function roundBoth(d, x) {
  const a = Math.abs(x), neg = x < 0
  const kt = nearest(d.t27.levels, d.t27.top, a)
  const ke = nearest(d.e2m1.levels, d.e2m1.top, a)
  const qt = (neg ? -1 : 1) * d.t27.levels[kt] / d.t27.top
  const qe = (neg ? -1 : 1) * d.e2m1.levels[ke] / d.e2m1.top
  const ct = (neg ? -1 : 1) * kt
  const eBits = ke.toString(2).padStart(3, '0')
  return {
    t27: { q: qt, err: Math.abs(x - qt), code: fill(W.SAY_CODE_T27, tritsOf(ct), ct > 0 ? '+' + ct : String(ct)) },
    e2m1: { q: qe, err: Math.abs(x - qe), code: fill(W.SAY_CODE_E2M1, (neg ? '1' : '0') + eBits, neg ? '1' : '0', eBits.slice(0, 2), eBits.slice(2)) },
  }
}
const seatsOf = (levels, top) => {
  const pos = levels.slice(1).map((l) => l / top)
  return [...pos.map((v) => -v).reverse(), 0, ...pos]
}

// --- the page ------------------------------------------------------------------------------------
function render(d) {
  root.replaceChildren()
  const t27Seats = seatsOf(d.t27.levels, d.t27.top)
  const e2Seats = seatsOf(d.e2m1.levels, d.e2m1.top)
  const row = (id) => d.storage.find((r) => r.id === id)

  root.append(el('p', { class: 'tc-claim' }, W.SAY_CLAIM))
  root.append(el('div', { class: 'tc-cells' },
    el('p', { class: 'tc-cell tc-cell-t27' }, fill(W.SAY_CELL_T27, d.cell.trits, d.cell.codes, d.cell.mags, Math.log2(d.cell.codes).toFixed(2))),
    el('p', { class: 'tc-cell' }, fill(W.SAY_CELL_E2M1, Math.log2(d.e2m1.codes), d.e2m1.codes, d.e2m1.distinct, d.cell.codes - d.e2m1.codes))))

  // Number line.
  const sec = el('section', { class: 'tc-sec' }, el('h2', {}, W.SAY_LINE_TITLE), el('p', { class: 'tc-note' }, W.SAY_LINE_NOTE))
  const legend = el('div', { class: 'tc-legend' },
    el('span', { class: 'tc-key tc-key-t27' }, SAY('SAY_ROW_NAMES', 0)),
    el('span', { class: 'tc-key tc-key-e2' }, SAY('SAY_ROW_NAMES', 1)))
  const VW = 1000, PAD = 24, AX = 70
  const X = (v) => PAD + ((v + 1) / 2) * (VW - 2 * PAD)
  const svg = sv('svg', { viewBox: `0 0 ${VW} 140`, class: 'tc-line', role: 'img', 'aria-label': W.SAY_LINE_TITLE })
  svg.append(sv('line', { x1: PAD, x2: VW - PAD, y1: AX, y2: AX, class: 'tc-axis' }))
  for (const v of t27Seats) svg.append(sv('line', { x1: X(v), x2: X(v), y1: AX - 34, y2: AX - 4, class: 'tc-tick-t27' }))
  for (const v of e2Seats) svg.append(sv('line', { x1: X(v), x2: X(v), y1: AX + 4, y2: AX + 34, class: 'tc-tick-e2' }))
  for (const v of [-1, 0, 1]) {
    const t = sv('text', { x: X(v), y: 134, class: 'tc-lab', 'text-anchor': v < 0 ? 'start' : v > 0 ? 'end' : 'middle' })
    t.textContent = String(v)
    svg.append(t)
  }
  const cursor = sv('line', { y1: 8, y2: AX + 46, class: 'tc-cursor' })
  const hitT = sv('circle', { r: 9, cy: AX - 40, class: 'tc-hit-t27' })
  const hitE = sv('circle', { r: 9, cy: AX + 40, class: 'tc-hit-e2' })
  svg.append(cursor, hitT, hitE)

  const range = el('input', { type: 'range', min: -STEPS / 2, max: STEPS / 2, step: 1, class: 'tc-range', 'aria-label': W.SAY_INPUT_LABEL })
  const box = el('input', { type: 'number', min: -1, max: 1, step: (2 / STEPS).toString(), class: 'tc-num', inputmode: 'decimal', id: 'tc-x' })
  const controls = el('div', { class: 'tc-controls' }, el('label', { class: 'tc-label', for: 'tc-x' }, W.SAY_INPUT_LABEL), box, range)

  const head = el('tr', {}, ...[0, 1, 2, 3].map((i) => el('th', {}, SAY('SAY_RESULT_HEAD', i))))
  const cellsT = [el('td'), el('td'), el('td')], cellsE = [el('td'), el('td'), el('td')]
  const result = el('table', { class: 'tc-result' }, el('thead', {}, head), el('tbody', {},
    el('tr', { class: 'tc-r-t27' }, el('th', { scope: 'row' }, SAY('SAY_FORMAT_SHORT', 0)), ...cellsT),
    el('tr', { class: 'tc-r-e2' }, el('th', { scope: 'row' }, SAY('SAY_FORMAT_SHORT', 1)), ...cellsE)))
  const closer = el('p', { class: 'tc-closer' })
  const gap = el('p', { class: 'tc-note' })
  sec.append(legend, svg, controls, el('div', { class: 'tc-scroll' }, result), closer, gap, el('p', { class: 'tc-note tc-subtle' }, W.SAY_ROUND_NOTE))
  root.append(sec)

  let x = 0
  const set = (v, from) => {
    if (!Number.isFinite(v)) return
    x = Math.max(-1, Math.min(1, v))
    if (from !== 'range') range.value = String(Math.round((x * STEPS) / 2))
    if (from !== 'box') box.value = x.toFixed(3)
    const r = roundBoth(d, x)
    cursor.setAttribute('x1', X(x)); cursor.setAttribute('x2', X(x))
    hitT.setAttribute('cx', X(r.t27.q)); hitE.setAttribute('cx', X(r.e2m1.q))
    const errText = (e) => (x === 0 ? fill(W.SAY_ERR_ZERO, num(e)) : fill(W.SAY_ERR, num(e), ((e / Math.abs(x)) * 100).toFixed(1)))
    cellsT[0].textContent = signed(r.t27.q); cellsT[1].textContent = r.t27.code; cellsT[2].textContent = errText(r.t27.err)
    cellsE[0].textContent = signed(r.e2m1.q); cellsE[1].textContent = r.e2m1.code; cellsE[2].textContent = errText(r.e2m1.err)
    const diff = r.e2m1.err - r.t27.err
    closer.textContent = Math.abs(diff) < 1e-12 ? SAY('SAY_CLOSER', 2) : fill(SAY('SAY_CLOSER', diff > 0 ? 0 : 1), num(Math.abs(diff)))
    closer.dataset.win = Math.abs(diff) < 1e-12 ? 'tie' : diff > 0 ? 't27' : 'e2'
    // The E2M1 gap that holds the weight, and how many T27 seats sit strictly inside it.
    const a = Math.abs(x), s = x < 0 ? -1 : 1
    const mags = d.e2m1.levels.map((l) => l / d.e2m1.top)
    let hi = mags.findIndex((m) => m > a)
    if (hi < 0) hi = mags.length - 1
    const lo = hi - 1
    const inside = d.t27.levels.filter((l) => l / d.t27.top > mags[lo] && l / d.t27.top < mags[hi]).length
    gap.textContent = fill(W.SAY_GAP, num(s * mags[lo]), num(s * mags[hi]), inside)
  }
  range.addEventListener('input', () => set(Number(range.value) * 2 / STEPS, 'range'))
  box.addEventListener('input', () => { if (box.value.trim() !== '') set(Number(box.value), 'box') })
  box.addEventListener('change', () => set(Number(box.value), null))
  const fromPointer = (ev) => {
    const b = svg.getBoundingClientRect()
    const px = ((ev.clientX - b.left) / b.width) * VW
    set(((px - PAD) / (VW - 2 * PAD)) * 2 - 1, null)
  }
  svg.addEventListener('pointerdown', (ev) => { svg.setPointerCapture(ev.pointerId); fromPointer(ev) })
  svg.addEventListener('pointermove', (ev) => { if (svg.hasPointerCapture(ev.pointerId)) fromPointer(ev) })
  set((W.K_DEFAULT_X_E3 ?? 300) / 1000, null)

  // Storage and quality.
  const st = el('section', { class: 'tc-sec' }, el('h2', {}, W.SAY_STORE_TITLE))
  const maxT = Math.max(...d.storage.map((r) => r.trits)), maxB = Math.max(...d.storage.map((r) => r.bits))
  const minT = Math.min(...d.storage.map((r) => r.trits)), minB = Math.min(...d.storage.map((r) => r.bits))
  const minP = Math.min(...d.storage.map((r) => r.ppl))
  const bar = (v, max, best) => el('span', { class: 'tc-bar' + (best ? ' is-best' : '') }, el('span', { class: 'tc-bar-fill', style: `width:${((v / max) * 100).toFixed(1)}%` }))
  const nameOf = (id) => SAY('SAY_FORMAT_NAMES', W.SAY_FORMAT_IDS.indexOf(id))
  const body = el('tbody', {}, ...d.storage.map((r) => el('tr', { class: r.id === 'T27' ? 'tc-r-t27' : '' },
    el('th', { scope: 'row' }, nameOf(r.id)),
    el('td', {}, el('span', { class: 'tc-v' + (r.trits === minT ? ' is-best' : '') }, String(r.trits)), bar(r.trits, maxT, r.trits === minT)),
    el('td', {}, el('span', { class: 'tc-v' + (r.bits === minB ? ' is-best' : '') }, r.dense ? fill(W.SAY_BITS_DENSE, r.bits) : r.tensorBits ? fill(W.SAY_BITS_TENSOR, r.bits, r.tensorBits) : String(r.bits)), bar(r.bits, maxB, r.bits === minB)),
    el('td', {}, el('span', { class: 'tc-v' + (r.ppl === minP ? ' is-best' : '') }, r.ppl.toFixed(4))))),
  el('tr', { class: 'tc-r-base' }, el('th', { scope: 'row' }, W.SAY_BASE_ROW), el('td'), el('td'), el('td', {}, el('span', { class: 'tc-v' }, d.quality.base.toFixed(4)))))
  st.append(el('div', { class: 'tc-scroll' }, el('table', { class: 'tc-store' }, el('thead', {}, el('tr', {}, ...[0, 1, 2, 3].map((i) => el('th', {}, SAY('SAY_STORE_HEAD', i))))), body)))
  const t = row('T27'), nv = row('NVFP4'), e2 = row('E2M2')
  st.append(
    el('p', { class: 'tc-say' }, fill(W.SAY_STORE_TRITS, t.trits, nv.trits)),
    el('p', { class: 'tc-say' }, fill(W.SAY_STORE_BITS, t.bits, nv.bits, (((t.bits - nv.bits) / nv.bits) * 100).toFixed(1))),
    el('p', { class: 'tc-note' }, fill(W.SAY_QUALITY, d.quality.nwin, d.quality.seqlen, (nv.permille ?? (1000 * t.ppl) / nv.ppl).toFixed(1), e2.ppl.toFixed(4), t.ppl.toFixed(4))))
  root.append(st)

  root.append(el('section', { class: 'tc-sec' }, el('h2', {}, W.SAY_LIMITS_TITLE),
    el('ul', { class: 'tc-limits' }, ...(W.SAY_LIMITS || []).map((s) => el('li', {}, s))),
    el('p', { class: 'tc-note tc-subtle' }, fill(W.SAY_SOURCES, d.sources.v1.file, d.sources.v1.commit, d.sources.v2.file, d.sources.v2.commit, d.sources.result.file, d.sources.result.commit))))
}

fetch(new URL(W.K_DATA_JSON || 'data.json', import.meta.url))
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
  .then(render)
  .catch(() => root.replaceChildren(el('p', { class: 'tc-err' }, W.SAY_ERR_DATA)))
