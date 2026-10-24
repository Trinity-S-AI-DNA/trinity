// SPDX-License-Identifier: Apache-2.0
// placement-map tool: where nextpnr-xilinx placed every cell, drawn on the XC7A200T die.
// Every word on screen comes from window.T27_WIDGET (specs/widgets/placement-map.t27, SAY_*);
// the numbers it relies on are K_*. A dropped file is read with FileReader and never leaves the page.

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

const KINDS = W.K_KINDS || []
const KIND_COLOR = Object.fromEntries(KINDS.map((k, i) => [k, (W.K_KIND_COLORS || [])[i] || '#888']))
const TILE_COLOR = Object.fromEntries((W.K_TILES || []).map((k, i) => [k, (W.K_TILE_COLORS || [])[i] || '#111']))
const PICK = W.K_PICK_PX || 14
const MAX_ZOOM = W.K_MAX_ZOOM || 80

function kindOf(type) {
  const pre = W.K_TYPE_PREFIX || []
  for (let i = 0; i < pre.length; i++) if (String(type).startsWith(pre[i])) return W.K_TYPE_KIND[i]
  return 'OTHER'
}

// --- state ----------------------------------------------------------------------------------
const state = {
  demo: null, geom: null, label: '', sourceLine: '', commands: [],
  cells: [], placed: [], offMap: [], slices: 0, box: null,
  view: { x: 0, y: 0, s: 1 }, pick: null, hover: null,
}

// A cell's rectangle in grid units. A CLB tile holds two slices side by side (even X left, odd X
// right); inside a slice the LUTs, FFs and the carry chain get their own column, one row per
// letter A-D, so no two cells of one slice share a dot.
function place(cell, geom) {
  const [name, type, bel] = cell
  const site = String(bel).split('/')[0]
  const belName = String(bel).split('/').slice(1).join('/')
  const m = /^([A-Z0-9]+)_X(\d+)Y(\d+)$/.exec(site)
  if (!m) return null
  let fam = m[1]
  if (fam === 'FIFO18') fam = 'RAMB18'
  const map = geom.maps[fam]
  const sx = +m[2], sy = +m[3]
  if (!map || sx >= map.x.length || sy >= map.y.length || map.x[sx] < 0 || map.y[sy] < 0) return null
  const gx = map.x[sx], gy = map.y[sy]
  const kind = kindOf(type)
  if (fam === 'SLICE') {
    const half = (sx % 2) * 0.46
    const letter = Math.max(0, 'ABCD'.indexOf(belName[0]))
    const col = type.startsWith('SLICE_FFX') ? 1 : type.startsWith('CARRY4') ? 2 : 0
    const yOff = type.startsWith('CARRY4') ? 0 : letter * 0.25
    const hh = type.startsWith('CARRY4') ? 1 : 0.25
    return { gx, gy, x: gx + half + col * 0.15, y: gy + yOff, w: 0.14, h: hh, kind, site, cell }
  }
  if (fam === 'RAMB36' || fam === 'DSP48') return { gx, gy, x: gx, y: gy - 4, w: 0.9, h: 5, kind, site, cell }
  if (fam === 'RAMB18') return { gx, gy, x: gx, y: gy - 2, w: 0.9, h: 2.5, kind, site, cell }
  if (fam === 'IOB') return { gx, gy, x: gx, y: gy, w: 0.9, h: 1, kind, site, cell }
  return { gx, gy, x: gx, y: gy, w: 1.5, h: 1.5, kind, site, cell }
}

function load(cells, geom) {
  state.cells = cells
  state.placed = []
  state.offMap = []
  const slices = new Set()
  for (const c of cells) {
    const p = place(c, geom)
    if (p) state.placed.push(p)
    else state.offMap.push(c)
    if (/^SLICE_|^CARRY4/.test(c[1])) slices.add(String(c[2]).split('/')[0])
  }
  state.slices = slices.size
  const sl = state.placed.filter((p) => p.cell[1].startsWith('SLICE_') || p.cell[1].startsWith('CARRY4'))
  const base = sl.length ? sl : state.placed
  if (base.length) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const p of base) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + p.w); y1 = Math.max(y1, p.y + p.h) }
    state.box = { x0: x0 - 4, y0: y0 - 4, x1: x1 + 4, y1: y1 + 4 }
  } else state.box = null
  state.pick = null
  state.hover = null
  renderSide()
  fit(true)
}

// --- layout ---------------------------------------------------------------------------------
const status = h('p', { class: 'pm-status', role: 'status' }, W.SAY_LOADING)
const btnDie = h('button', { class: 't27-btn', type: 'button', onclick: () => fit(false) }, W.SAY_WHOLE_DIE)
const btnFit = h('button', { class: 't27-btn', type: 'button', onclick: () => fit(true) }, W.SAY_FIT_DESIGN)
const btnDemo = h('button', { class: 't27-btn', type: 'button', hidden: true, onclick: () => showDemo() }, W.SAY_DEMO)
const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'pm-file' })
const dropText = h('span', {}, W.SAY_DROP)
const drop = h('label', { class: 't27-drop pm-drop' }, fileInput, dropText)
const canvas = h('canvas', { class: 'pm-canvas', role: 'img', tabindex: '0', 'aria-label': W.SAY_CANVAS_LABEL })
const hint = h('p', { class: 'pm-hint' }, W.SAY_HINT)
const legend = h('ul', { class: 'pm-legend' })
const info = h('div', { class: 'pm-info', 'aria-live': 'polite' })
const offMap = h('details', { class: 'pm-off' })
const how = h('details', { class: 'pm-how' })
const wrap = h('div', { class: 'pm-wrap' }, canvas)

root.append(
  h('div', { class: 'pm-bar' }, btnDie, btnFit, btnDemo),
  status, wrap, hint,
  h('div', { class: 'pm-side' }, legend, info),
  drop, offMap, how,
)

function renderSide() {
  const counts = {}
  for (const c of state.cells) { const k = kindOf(c[1]); counts[k] = (counts[k] || 0) + 1 }
  legend.replaceChildren(...KINDS.filter((k) => counts[k]).map((k) =>
    h('li', {}, h('i', { style: `background:${KIND_COLOR[k]}` }), `${k} ${num(counts[k])}`)))
  status.textContent = fmt(W.SAY_SUMMARY, state.label, num(state.cells.length), num(state.slices), num(W.K_SLICES))
  offMap.hidden = !state.offMap.length
  offMap.replaceChildren(h('summary', {}, fmt(W.SAY_OFF_MAP, num(state.offMap.length))),
    h('ul', {}, state.offMap.slice(0, 500).map((c) => h('li', {}, `${c[0]}  ${c[1]}  ${c[2] || '-'}`))))
  how.hidden = !state.commands.length
  how.replaceChildren(h('summary', {}, W.SAY_COMMANDS), h('p', {}, state.sourceLine),
    h('ul', {}, state.commands.map((c) => h('li', {}, h('code', {}, c)))))
  renderInfo()
}

function renderInfo() {
  const p = state.pick || state.hover
  if (!p) { info.replaceChildren(h('p', { class: 'pm-muted' }, W.SAY_PICK_NONE)); return }
  const same = state.placed.filter((q) => q.site === p.site)
  const f = W.SAY_FIELDS || []
  info.replaceChildren(
    h('p', { class: 'pm-muted' }, fmt(W.SAY_PICK_LINE, same.length)),
    h('table', {}, h('thead', {}, h('tr', {}, f.map((x) => h('th', {}, x)))),
      h('tbody', {}, same.slice(0, 40).map((q) => h('tr', { class: q === p ? 'is-pick' : '' },
        h('td', {}, h('i', { style: `background:${KIND_COLOR[q.kind]}` }), q.cell[0]), h('td', {}, q.cell[1]), h('td', {}, q.cell[2]))))))
}

// --- drawing --------------------------------------------------------------------------------
let cssW = 0, cssH = 0
function size() {
  const embed = document.documentElement.classList.contains('embed')
  cssW = wrap.clientWidth || 600
  const g = state.geom
  const aspect = g ? g.grid_h / g.grid_w : 1
  const maxH = embed ? Math.max(200, window.innerHeight - 205) : Math.max(260, window.innerHeight * 0.7)
  cssH = Math.round(Math.min(cssW * aspect, maxH))
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.height = cssH + 'px'
}

function fit(design) {
  const g = state.geom
  if (!g) return
  size()
  const b = design && state.box ? state.box : { x0: 0, y0: 0, x1: g.grid_w, y1: g.grid_h }
  const s = Math.min(cssW / (b.x1 - b.x0), cssH / (b.y1 - b.y0))
  state.view = { s, x: (b.x0 + b.x1) / 2 - cssW / s / 2, y: (b.y0 + b.y1) / 2 - cssH / s / 2 }
  draw()
}

function draw() {
  const g = state.geom
  if (!g) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, cssW, cssH)
  const { x: vx, y: vy, s } = state.view
  const X = (gx) => (gx - vx) * s
  const Y = (gy) => (gy - vy) * s
  for (const [k, gx, top, bot] of g.runs) {
    const x = X(gx)
    if (x > cssW || x + s < 0) continue
    ctx.fillStyle = TILE_COLOR[k] || '#111'
    ctx.fillRect(x, Y(top), Math.max(1, s * 0.9), Math.max(1, (bot - top + 1) * s - Math.min(1, s * 0.1)))
  }
  const minPx = 3
  for (const p of state.placed) {
    let x = X(p.x), y = Y(p.y), w = p.w * s, hh = p.h * s
    if (x > cssW || y > cssH || x + w < -minPx || y + hh < -minPx) continue
    if (w < minPx) { x -= (minPx - w) / 2; w = minPx }
    if (hh < minPx) { y -= (minPx - hh) / 2; hh = minPx }
    ctx.fillStyle = KIND_COLOR[p.kind] || '#888'
    ctx.fillRect(x, y, w, hh)
  }
  for (const [p, col] of [[state.hover, '#e8fff7'], [state.pick, '#ffd700']]) {
    if (!p) continue
    ctx.strokeStyle = col
    ctx.lineWidth = 2
    const w = Math.max(8, p.w * s), hh = Math.max(8, p.h * s)
    ctx.strokeRect(X(p.x) + p.w * s / 2 - w / 2 - 2, Y(p.y) + p.h * s / 2 - hh / 2 - 2, w + 4, hh + 4)
  }
}

// --- interaction ----------------------------------------------------------------------------
function zoomAt(px, py, factor) {
  const g = state.geom
  if (!g) return
  const { x, y, s } = state.view
  const minS = Math.min(cssW / g.grid_w, cssH / g.grid_h) * 0.8
  const ns = Math.min(Math.max(s * factor, minS), minS * MAX_ZOOM * 4)
  const gx = x + px / s, gy = y + py / s
  state.view = { s: ns, x: gx - px / ns, y: gy - py / ns }
  draw()
}

function nearest(px, py) {
  const { x, y, s } = state.view
  let best = null, bd = PICK
  for (const p of state.placed) {
    const cx = (p.x + p.w / 2 - x) * s, cy = (p.y + p.h / 2 - y) * s
    const dx = Math.max(0, Math.abs(px - cx) - p.w * s / 2), dy = Math.max(0, Math.abs(py - cy) - p.h * s / 2)
    const d = Math.hypot(dx, dy)
    if (d < bd || (d === 0 && best && p.w * p.h < best.w * best.h)) { bd = d; best = p }
  }
  return best
}

const pointers = new Map()
let drag = null
let pinch = null
const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, local(e))
  if (pointers.size === 1) drag = { start: local(e), view: { ...state.view }, moved: false }
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: state.view.s }
    drag = null
  }
})
canvas.addEventListener('pointermove', (e) => {
  const pt = local(e)
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, pt)
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a[0] - b[0], a[1] - b[1])
    zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (pinch.s * d / pinch.d) / state.view.s)
    return
  }
  if (drag) {
    const dx = pt[0] - drag.start[0], dy = pt[1] - drag.start[1]
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true
    if (drag.moved) {
      state.view = { ...drag.view, x: drag.view.x - dx / drag.view.s, y: drag.view.y - dy / drag.view.s }
      draw()
    }
    return
  }
  if (e.pointerType === 'mouse') {
    const p = nearest(pt[0], pt[1])
    if (p !== state.hover) { state.hover = p; renderInfo(); draw() }
  }
})
function up(e) {
  const pt = local(e)
  if (drag && !drag.moved) {
    state.pick = nearest(pt[0], pt[1])
    renderInfo()
    draw()
  }
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinch = null
  if (!pointers.size) drag = null
}
canvas.addEventListener('pointerup', up)
canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); pinch = null; drag = null })
canvas.addEventListener('pointerleave', () => { if (state.hover) { state.hover = null; renderInfo(); draw() } })
canvas.addEventListener('wheel', (e) => {
  e.preventDefault()
  const [px, py] = local(e)
  zoomAt(px, py, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)))
}, { passive: false })
canvas.addEventListener('keydown', (e) => {
  const step = 40 / state.view.s
  const v = state.view
  if (e.key === '+' || e.key === '=') zoomAt(cssW / 2, cssH / 2, 1.4)
  else if (e.key === '-') zoomAt(cssW / 2, cssH / 2, 1 / 1.4)
  else if (e.key === 'ArrowLeft') { v.x -= step; draw() }
  else if (e.key === 'ArrowRight') { v.x += step; draw() }
  else if (e.key === 'ArrowUp') { v.y -= step; draw() }
  else if (e.key === 'ArrowDown') { v.y += step; draw() }
  else return
  e.preventDefault()
})

let lastW = 0
new ResizeObserver(() => {
  if (!state.geom || wrap.clientWidth === lastW) return
  const old = { w: cssW, h: cssH, v: state.view }
  lastW = wrap.clientWidth
  size()
  if (old.w) {
    const cx = old.v.x + old.w / old.v.s / 2, cy = old.v.y + old.h / old.v.s / 2
    const s = old.v.s * cssW / old.w
    state.view = { s, x: cx - cssW / s / 2, y: cy - cssH / s / 2 }
  }
  draw()
}).observe(wrap)

// --- data -----------------------------------------------------------------------------------
function showDemo() {
  const d = state.demo
  if (!d) return
  const src = d.source || {}
  state.label = src.top || ''
  state.sourceLine = fmt(W.SAY_SOURCE_DEMO, src.design, src.part, src.nextpnr)
  state.commands = src.commands || []
  btnDemo.hidden = true
  load(d.cells, state.geom)
}

function readText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = () => reject(fr.error)
    fr.readAsText(file)
  })
}

async function takeFile(file) {
  if (!file || !state.geom) return
  if (file.size > (W.K_MAX_FILE_MB || 512) * 1048576) { status.textContent = fmt(W.SAY_ERR_SIZE, file.name, W.K_MAX_FILE_MB); return }
  status.textContent = fmt(W.SAY_READING, file.name)
  let j
  try { j = JSON.parse(await readText(file)) } catch { status.textContent = fmt(W.SAY_ERR_JSON, file.name); return }
  const cells = []
  for (const mod of Object.values(j?.modules || {})) {
    for (const [name, c] of Object.entries(mod?.cells || {})) {
      const bel = c?.attributes?.NEXTPNR_BEL
      if (bel) cells.push([name, String(c.type), String(bel)])
    }
  }
  if (!cells.length) { status.textContent = fmt(W.SAY_ERR_NO_BELS, file.name); return }
  cells.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  state.label = file.name
  state.sourceLine = fmt(W.SAY_SOURCE_FILE, file.name, num(file.size), j.creator || '')
  state.commands = []
  btnDemo.hidden = false
  load(cells, state.geom)
}

fileInput.addEventListener('change', () => { takeFile(fileInput.files[0]); fileInput.value = '' })
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over') })
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); takeFile(e.dataTransfer?.files?.[0]) })
// The whole tool accepts a drop, not only the zone.
root.addEventListener('dragover', (e) => e.preventDefault())
root.addEventListener('drop', (e) => { if (e.defaultPrevented) return; e.preventDefault(); takeFile(e.dataTransfer?.files?.[0]) })

;(async () => {
  try {
    const r = await fetch(new URL(W.K_DATA_FILE || 'placement.json', import.meta.url))
    if (!r.ok) throw new Error(String(r.status))
    state.demo = await r.json()
    state.geom = state.demo.geometry
    showDemo()
  } catch {
    status.textContent = W.SAY_ERR_DEMO
  }
})()
