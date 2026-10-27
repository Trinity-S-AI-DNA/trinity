// SPDX-License-Identifier: Apache-2.0
// fits-on/tool.js -- how many copies of the reader's design fit on an XC7A200T, one grid cell per copy.
// Every word on screen is a SAY_ constant from specs/widgets/fits-on.t27 (window.T27_WIDGET); the
// totals are K_ constants, checked against device.json, which scripts/widget-data/fits-on.mjs wrote
// from two real nextpnr-xilinx logs. Reads only ./device.json and ./tool.css; calls no other host;
// stores nothing. What the reader types stays in this page.

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const num = (n) => Number(n).toLocaleString('en-US')

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') el.className = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : String(k))
  return el
}

document.head.append(h('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href }))

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const INPUTS = W.K_INPUTS || []
const HALVES = W.K_HALVES_PER_INPUT || [2, 1]
const state = { data: null, mode: 0, preset: -1, counts: INPUTS.map(() => 0) }

// --- the arithmetic of the spec's "WHAT IT DOES" ---------------------------------------------
// Per copy, in the units of K_CAPACITY's rows: LUT, FF, DSP, block RAM in 18Kb halves.
function perCopy(c) {
  return [c[0], c[1], c[2], HALVES[0] * c[3] + HALVES[1] * c[4]]
}
function capacity() {
  const cap = (W.K_CAPACITY || []).slice()
  if (state.mode === 1) cap[0] = W.K_SLICE_LUTX
  return cap
}
function fit() {
  const per = perCopy(state.counts), cap = capacity()
  const rows = per.map((u, i) => ({ i, u, cap: cap[i], copies: u > 0 ? Math.floor(cap[i] / u) : null }))
  const used = rows.filter((r) => r.copies !== null)
  if (!used.length) return { rows, copies: null, binding: [] }
  const copies = Math.min(...used.map((r) => r.copies))
  return { rows, copies, binding: used.filter((r) => r.copies === copies) }
}
const unit = (i) => (i === 0 && state.mode === 1 ? W.SAY_LUT_BELS_UNIT : (W.SAY_RES_UNITS || [])[i])

// --- layout -----------------------------------------------------------------------------------
const status = h('p', { class: 'fo-status', role: 'status' }, W.SAY_LOADING)
const presetBtns = (W.K_EXAMPLES || []).map((id, i) =>
  h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => usePreset(i) }, (W.SAY_PRESET_NAMES || [])[i] ?? id))
const presetLine = h('p', { class: 'fo-note fo-preset-line' })
const fields = INPUTS.map((key, i) => {
  const input = h('input', { type: 'number', inputmode: 'numeric', min: '0', max: String(W.K_INPUT_MAX), step: '1', id: `fo-in-${i}`, placeholder: '0' })
  input.addEventListener('input', () => { state.preset = -1; readInputs(); render() })
  return { input, el: h('label', { class: 'fo-field', for: `fo-in-${i}` }, h('span', { class: 'fo-field-name' }, (W.SAY_INPUT_NAMES || [])[i] ?? key, h('small', {}, (W.SAY_INPUT_NOTES || [])[i] ?? '')), input) }
})
const modeBtns = (W.SAY_DIVIDE_NAMES || []).map((name, i) =>
  h('button', { class: 't27-btn', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { state.mode = i; render() } }, name))
const headline = h('p', { class: 'fo-headline' })
const bindingLine = h('p', { class: 'fo-binding' })
const boundLine = h('p', { class: 'fo-bound' })
const canvas = h('canvas', { class: 'fo-grid', role: 'img' })
const gridLine = h('p', { class: 'fo-note' })
const table = h('div', { class: 'fo-table', role: 'table' })
const notes = h('section', { class: 'fo-notes' })
const sources = h('details', { class: 'fo-sources' })

root.append(
  h('div', { class: 'fo-bar' }, h('span', { class: 'fo-label' }, W.SAY_PRESET_LABEL), presetBtns),
  presetLine,
  h('fieldset', { class: 'fo-inputs' }, h('legend', {}, W.SAY_INPUT_TITLE), fields.map((f) => f.el)),
  h('div', { class: 'fo-bar' }, h('span', { class: 'fo-label' }, W.SAY_DIVIDE_LABEL), modeBtns),
  status,
  h('div', { class: 'fo-result' }, headline, bindingLine, boundLine),
  canvas, gridLine, table, notes, sources,
)

function readInputs() {
  state.counts = fields.map(({ input }) => {
    const v = Math.floor(Number(input.value))
    return Number.isFinite(v) && v > 0 ? Math.min(v, W.K_INPUT_MAX) : 0
  })
}

function usePreset(i) {
  const id = (W.K_EXAMPLES || [])[i]
  const c = W[`K_EX_${String(id).toUpperCase()}`]
  if (!Array.isArray(c)) return
  state.preset = i
  state.counts = c.slice()
  fields.forEach(({ input }, j) => { input.value = c[j] ? String(c[j]) : '' })
  render()
}

// --- the grid: one cell per copy over the binding resource's capacity --------------------------
function drawGrid(f) {
  const ctx = canvas.getContext('2d')
  const n = f.copies
  if (!n) { canvas.hidden = true; gridLine.textContent = ''; return }
  canvas.hidden = false
  const b = f.binding[0]
  const scale = Math.max(1, Math.ceil(n / (W.K_GRID_MAX_CELLS || 600)))
  const full = Math.floor(n / scale)
  const rest = n - full * scale
  const left = b.cap - n * b.u
  const cells = full + (rest > 0 ? 1 : 0) + 1
  const width = Math.max(200, Math.floor(canvas.parentElement.clientWidth || 600))
  const target = document.documentElement.classList.contains('embed') ? 130 : width < 500 ? 180 : 220
  let cols = Math.max(1, Math.ceil(Math.sqrt((cells * width) / target)))
  let size = Math.floor(width / cols)
  while (Math.ceil(cells / cols) * size > target * 1.4 && cols < cells) { cols++; size = Math.floor(width / cols) }
  const rows = Math.ceil(cells / cols)
  const height = rows * size
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const gap = size >= 8 ? Math.max(1, Math.round(size / 10)) : 0
  const green = cssVar('--w-green') || '#00ff88', gold = cssVar('--w-gold') || '#ffd700', line = cssVar('--w-line') || '#1a4'
  const at = (k) => [(k % cols) * size, Math.floor(k / cols) * size, size - gap]
  for (let k = 0; k < full; k++) {
    const [x, y, s] = at(k)
    ctx.fillStyle = green
    ctx.fillRect(x, y, s, s)
  }
  let k = full
  if (rest > 0) {
    const [x, y, s] = at(k++)
    ctx.strokeStyle = line
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1)
    ctx.fillStyle = green
    ctx.fillRect(x, y, s * (rest / scale), s)
  }
  const [x, y, s] = at(k)
  ctx.strokeStyle = gold
  ctx.lineWidth = Math.max(1, Math.min(2, s / 8))
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1)
  const frac = Math.min(1, left / (b.u * scale))
  if (frac > 0) { ctx.globalAlpha = 0.35; ctx.fillStyle = gold; ctx.fillRect(x, y + s * (1 - frac), s, s * frac); ctx.globalAlpha = 1 }
  const leftText = `${num(left)} ${unit(b.i)}`
  gridLine.textContent = scale === 1
    ? fmt(W.SAY_GRID_LINE, `${num(b.cap)} ${unit(b.i)}`, leftText)
    : fmt(W.SAY_GRID_SCALED, num(scale), `${num(b.cap)} ${unit(b.i)}`, leftText)
  canvas.setAttribute('aria-label', fmt(W.SAY_GRID_LABEL, num(n), num(b.cap), unit(b.i)))
}

function render() {
  modeBtns.forEach((btn, i) => btn.setAttribute('aria-pressed', String(i === state.mode)))
  presetBtns.forEach((btn, i) => btn.setAttribute('aria-pressed', String(i === state.preset)))
  const ex = state.data?.examples?.[state.preset]
  presetLine.textContent = ex ? fmt(W.SAY_PRESET_LINE, ex.top, ex.board, ex.part, num(ex.used.SLICE_LUTX), num(ex.yosys.LUT)) : ''
  const f = fit()
  const names = W.SAY_RES_NAMES || []
  table.replaceChildren(
    h('div', { class: 'fo-row fo-head', role: 'row' }, (W.SAY_COLS || []).map((c) => h('span', { role: 'columnheader' }, c))),
    ...f.rows.map((r) => h('div', { class: 'fo-row' + (f.binding.includes(r) ? ' is-binding' : ''), role: 'row' },
      h('span', { role: 'cell', class: 'fo-name' }, names[r.i], h('small', {}, unit(r.i))),
      h('span', { role: 'cell' }, r.u ? num(r.u) : W.SAY_NOT_USED),
      h('span', { role: 'cell' }, num(r.cap)),
      h('span', { role: 'cell', class: 'fo-copies' }, r.copies === null ? '-' : num(r.copies)))),
  )
  if (f.copies === null) {
    headline.textContent = W.SAY_EMPTY
    bindingLine.textContent = boundLine.textContent = ''
    drawGrid({ copies: 0 })
    return
  }
  const bindNames = f.binding.map((r) => names[r.i]).join(' + ')
  const b = f.binding[0]
  if (f.copies === 0) {
    headline.textContent = W.SAY_RESULT_NONE
    headline.className = 'fo-headline is-none'
    bindingLine.textContent = fmt(W.SAY_TOO_BIG, unit(b.i), num(b.u), num(b.cap))
    boundLine.textContent = ''
  } else {
    headline.textContent = f.copies === 1 ? W.SAY_RESULT_ONE : fmt(W.SAY_RESULT_MANY, num(f.copies))
    headline.className = 'fo-headline'
    bindingLine.textContent = fmt(W.SAY_BINDING, bindNames, `${num(b.u)} ${unit(b.i)}`, num(b.cap))
    boundLine.textContent = fmt(W.SAY_UPPER_BOUND, unit(b.i))
  }
  drawGrid(f)
}

function renderNotes(d) {
  const ex0 = d.examples[0]
  notes.replaceChildren(
    h('h2', {}, W.SAY_NOTES_TITLE),
    h('p', {}, fmt(W.SAY_NOTE_LUT, num(W.K_SLICE_LUTX), num(W.K_CARRY4), W.K_POSITIONS_PER_SLICE * W.K_BELS_PER_POSITION,
      num(W.K_EX_NODE0[0]), num(W.K_EX_NODE0_LUT6_POSITIONS), num(W.K_LUT_POSITIONS))),
    h('p', {}, fmt(W.SAY_NOTE_BOUND, num(W.K_EX_NODE0_YOSYS_LUT), num(W.K_EX_NODE0[0]))),
    h('p', {}, fmt(W.SAY_NOTE_PACKAGE, ex0.board, ex0.part, num(W.K_PAD_FBG484))),
  )
  sources.replaceChildren(
    h('summary', {}, W.SAY_SOURCE_TITLE),
    h('ul', {}, d.examples.map((e) => h('li', {}, fmt(W.SAY_SOURCE_LINE, e.nextpnr_log.path, e.nextpnr_log.sha256, num(e.nextpnr_log.bytes), e.top)))),
    h('p', {}, fmt(W.SAY_SOURCE_VERSION, d.examples[0].nextpnr_version, Object.keys(d.totals).length)),
  )
}

// The K_ totals the page divides by must be the ones in device.json; if not, say the data did not load.
function agrees(d) {
  const t = d?.totals || {}
  return t.SLICE_LUTX === W.K_SLICE_LUTX && t.SLICE_FFX === W.K_SLICE_FFX && t.DSP48E1 === W.K_DSP48E1 &&
    t.RAMB18E1 === W.K_RAMB18E1 && t.RAMB36E1 === W.K_RAMB36E1 && Array.isArray(d.examples) && d.examples.length > 0
}

let resizeTimer = 0
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 120) })

;(async () => {
  try {
    const r = await fetch(new URL(W.K_DATA_FILE || 'device.json', import.meta.url))
    if (!r.ok) throw new Error(String(r.status))
    const d = await r.json()
    if (!agrees(d)) throw new Error('totals')
    state.data = d
    status.hidden = true
    renderNotes(d)
    usePreset(0)
  } catch {
    status.textContent = W.SAY_ERR_DATA
  }
})()
