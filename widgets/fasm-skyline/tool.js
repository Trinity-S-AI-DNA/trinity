// SPDX-License-Identifier: Apache-2.0
// fasm-skyline tool: a 7-series FASM file as an isometric skyline on the XC7A200T tile grid.
// Every word on screen comes from window.T27_WIDGET (specs/widgets/fasm-skyline.t27, SAY_*); the
// numbers it relies on are K_* there or fields of grid.json and samples.json. The counting is
// skyline.js, the same code the data script ran. A dropped file is read with FileReader and never
// leaves the page.
import { decodeGrid, familyOf, parseFasm, summarize } from './skyline.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const num = (n) => Number(n).toLocaleString('en-US')
const pct = (a, b) => (b ? (100 * a / b).toFixed(2) : '0')
const brand = (s) => String(s).replace(/\bS3AI\b/g, 'S\u00b3AI')

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

const FAMS = W.K_FAMILIES || []
const COL = W.K_FAMILY_COLORS || []
const FLOOR = W.K_FLOOR_COLORS || []
const famOfType = (t) => familyOf(t, W.K_TYPE_PREFIX || [], W.K_TYPE_FAMILY || [], FAMS)

// --- state ----------------------------------------------------------------------------------
const state = {
  grid: null, famOfCell: null, runs: [], samples: [], sampleIx: 0,
  label: '', sourceLine: '', note: '', commands: [], sum: null, cleared: 0, bad: [],
  rot: 0, view: { x: 0, y: 0, s: 1 }, hk: 1, cols: [], pick: null, hover: null,
}

// --- layout ---------------------------------------------------------------------------------
const sampleBtns = (W.SAY_SAMPLES || []).map((label, i) =>
  h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => showSample(i) }, label))
const btnDie = h('button', { class: 't27-btn', type: 'button', onclick: () => fit(false) }, W.SAY_WHOLE_DIE)
const btnFit = h('button', { class: 't27-btn', type: 'button', onclick: () => fit(true) }, W.SAY_FIT_DESIGN)
const btnRot = h('button', { class: 't27-btn', type: 'button', onclick: () => rotate() }, W.SAY_ROTATE)
const btnPng = h('button', { class: 't27-btn', type: 'button', onclick: () => downloadPng() }, W.SAY_DOWNLOAD_PNG)
const btnStl = h('button', { class: 't27-btn', type: 'button', onclick: () => downloadStl() }, W.SAY_DOWNLOAD_STL)
const status = h('p', { class: 'fs-status', role: 'status' }, W.SAY_LOADING)
const canvas = h('canvas', { class: 'fs-canvas', role: 'img', tabindex: '0', 'aria-label': W.SAY_CANVAS_LABEL })
const wrap = h('div', { class: 'fs-wrap' }, canvas)
const hint = h('p', { class: 'fs-hint' }, W.SAY_HINT)
const stats = h('dl', { class: 'fs-stats' })
const fams = h('table', { class: 'fs-fams' })
const info = h('div', { class: 'fs-info', 'aria-live': 'polite' })
const source = h('p', { class: 'fs-source' })
const fileInput = h('input', { type: 'file', accept: '.fasm,text/plain', class: 'fs-file' })
const drop = h('label', { class: 't27-drop fs-drop' }, fileInput, h('span', {}, W.SAY_DROP))
const share = h('p', { class: 'fs-share' }, W.SAY_SHARE_NOTE)
const offMap = h('details', { class: 'fs-more' })
const badLines = h('details', { class: 'fs-more' })
const how = h('details', { class: 'fs-more' })

root.append(
  h('div', { class: 'fs-bar' }, sampleBtns),
  h('div', { class: 'fs-bar' }, btnDie, btnFit, btnRot, btnPng, btnStl),
  status, wrap, hint,
  stats,
  h('div', { class: 'fs-side' }, fams, info),
  source, drop, share, offMap, badLines, how,
)

// --- geometry -------------------------------------------------------------------------------
// Grid cell (gx, gy) is the square [gx, gx+1] x [gy, gy+1]; rotation turns the die a quarter at a
// time; the isometric projection sends (u, v) to ((u - v), (u + v) / 2), height going up.
function rotPt(x, y) {
  const g = state.grid
  switch (state.rot) {
    case 1: return [g.h - y, x]
    case 2: return [g.w - x, g.h - y]
    case 3: return [y, g.w - x]
    default: return [x, y]
  }
}
function cellUV(gx, gy) {
  const a = rotPt(gx, gy), b = rotPt(gx + 1, gy + 1)
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1])]
}
const P = (u, v, z = 0) => [u - v, (u + v) / 2 - z]

function hexOf(c) {
  const [u, v] = cellUV(c.gx, c.gy)
  const z = c.n * state.hk
  return {
    top: [P(u, v, z), P(u + 1, v, z), P(u + 1, v + 1, z), P(u, v + 1, z)],
    left: [P(u, v + 1, z), P(u + 1, v + 1, z), P(u + 1, v + 1), P(u, v + 1)],
    right: [P(u + 1, v, z), P(u + 1, v + 1, z), P(u + 1, v + 1), P(u + 1, v)],
    hull: [P(u, v, z), P(u + 1, v, z), P(u + 1, v), P(u + 1, v + 1), P(u, v + 1), P(u, v + 1, z)],
    depth: u + v, u,
  }
}

function layout() {
  const g = state.grid
  const max = state.sum?.tallest?.n || 1
  state.hk = ((W.K_HEIGHT_PCT || 45) / 100) * ((g.w + g.h) / 2) / max
  state.cols = (state.sum?.cols || []).map((c) => ({ c, ...hexOf(c) }))
  state.cols.sort((a, b) => a.depth - b.depth || a.u - b.u)
}

function bounds(design) {
  const g = state.grid
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const add = ([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  if (!design || !state.cols.length) for (const [x, y] of [[0, 0], [g.w, 0], [0, g.h], [g.w, g.h]]) add(P(...rotPt(x, y)))
  for (const k of state.cols) k.hull.forEach(add)
  const pad = design ? 6 : 2
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad }
}

// --- drawing --------------------------------------------------------------------------------
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16)
  const c = (s) => Math.round(((n >> s) & 255) * f)
  return `rgb(${c(16)},${c(8)},${c(0)})`
}

function poly(ctx, pts, X, Y) {
  ctx.beginPath()
  ctx.moveTo(X(pts[0][0]), Y(pts[0][1]))
  for (let i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i][0]), Y(pts[i][1]))
  ctx.closePath()
}

function render(ctx, w, hgt, view) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, hgt)
  if (!state.grid) return
  const { x: vx, y: vy, s } = view
  const X = (x) => (x - vx) * s
  const Y = (y) => (y - vy) * s
  for (const [f, gx, top, bot] of state.runs) {
    const a = rotPt(gx, top), b = rotPt(gx + 1, top), c = rotPt(gx + 1, bot + 1), d = rotPt(gx, bot + 1)
    ctx.fillStyle = FLOOR[f] || '#111'
    poly(ctx, [P(...a), P(...b), P(...c), P(...d)], X, Y)
    ctx.fill()
  }
  const edge = s > 6
  for (const k of state.cols) {
    const col = COL[k.c.fam] || '#888'
    ctx.fillStyle = shade(col, 0.55); poly(ctx, k.left, X, Y); ctx.fill()
    ctx.fillStyle = shade(col, 0.38); poly(ctx, k.right, X, Y); ctx.fill()
    ctx.fillStyle = col; poly(ctx, k.top, X, Y); ctx.fill()
    if (edge) { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; poly(ctx, k.hull, X, Y); ctx.stroke() }
  }
  for (const [k, c] of [[state.hover, '#e8fff7'], [state.pick, '#ffd700']]) {
    if (!k) continue
    ctx.strokeStyle = c
    ctx.lineWidth = 2
    poly(ctx, k.hull, X, Y)
    ctx.stroke()
  }
}

let cssW = 0, cssH = 0
function size() {
  const embed = document.documentElement.classList.contains('embed')
  cssW = wrap.clientWidth || 600
  const maxH = embed ? Math.max(180, window.innerHeight - 200) : Math.max(260, window.innerHeight * 0.66)
  cssH = Math.round(Math.min(cssW * 0.62, maxH))
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.height = cssH + 'px'
}

function fitView(b, w, hgt) {
  const s = Math.min(w / (b.x1 - b.x0), hgt / (b.y1 - b.y0))
  return { s, x: (b.x0 + b.x1) / 2 - w / s / 2, y: (b.y0 + b.y1) / 2 - hgt / s / 2 }
}

function fit(design) {
  if (!state.grid) return
  size()
  state.view = fitView(bounds(design), cssW, cssH)
  draw()
}

function draw() {
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  render(ctx, cssW, cssH, state.view)
}

function rotate() {
  if (!state.grid) return
  state.rot = (state.rot + 1) % 4
  layout()
  fit(false)
}

// --- panels ---------------------------------------------------------------------------------
function renderPanels() {
  const sum = state.sum
  const g = state.grid
  if (!sum) return
  const labels = W.SAY_STAT_LABELS || []
  const t = sum.tallest
  stats.replaceChildren(
    h('div', {}, h('dt', {}, labels[0]), h('dd', {}, num(sum.tiles))),
    h('div', {}, h('dt', {}, labels[1]), h('dd', {}, num(sum.placedFeatures))),
    h('div', {}, h('dt', {}, labels[2]), h('dd', { class: 'fs-tile' }, t ? t.name : '-', t ? h('small', {}, fmt(W.SAY_STAT_TALLEST, num(t.n))) : '')),
    h('div', {}, h('dt', {}, labels[3]), h('dd', {}, `${pct(sum.tiles, W.K_CONFIG_TILES)}%`,
      h('small', {}, fmt(W.SAY_STAT_SHARE, num(sum.tiles), num(W.K_CONFIG_TILES))))),
  )
  const head = W.SAY_FAMILY_HEAD || []
  const names = W.SAY_FAMILY_NAMES || []
  fams.replaceChildren(
    h('thead', {}, h('tr', {}, head.map((x) => h('th', {}, x)))),
    h('tbody', {}, FAMS.map((f, i) => h('tr', { class: sum.famTiles[i] ? '' : 'is-zero' },
      h('td', {}, h('i', { style: `background:${COL[i]}` }), names[i] || f),
      h('td', {}, fmt(W.SAY_OF, num(sum.famTiles[i]), num((W.K_CONFIG_FAMILY_TILES || [])[i] || 0))),
      h('td', {}, num(sum.famFeatures[i]))))))
  source.replaceChildren(h('span', {}, state.sourceLine), state.note ? h('span', { class: 'fs-note' }, state.note) : '',
    state.cleared ? h('span', { class: 'fs-note' }, fmt(W.SAY_CLEARED, num(state.cleared))) : '',
    h('span', { class: 'fs-note' }, fmt(W.SAY_SCALE, num(t ? t.n : 0), g.w, g.h)))
  offMap.hidden = !sum.off.length
  offMap.replaceChildren(h('summary', {}, fmt(W.SAY_OFF_MAP, num(sum.off.length), num(sum.features - sum.placedFeatures))),
    h('ul', {}, sum.off.slice(0, 300).map(([n, k]) => h('li', {}, `${n}  ${k}`))))
  badLines.hidden = !state.bad.length
  badLines.replaceChildren(h('summary', {}, fmt(W.SAY_BAD_LINES, num(state.bad.length))),
    h('ul', {}, state.bad.slice(0, 100).map((l) => h('li', {}, l))))
  how.hidden = !state.commands.length
  how.replaceChildren(h('summary', {}, W.SAY_HOW), h('ul', {}, state.commands.map((c) => h('li', {}, h('code', {}, c)))))
  renderInfo()
}

function renderInfo() {
  const k = state.pick || state.hover
  if (!k) { info.replaceChildren(h('p', { class: 'fs-muted' }, W.SAY_PICK_NONE)); return }
  const c = k.c
  const f = W.SAY_PICK_FIELDS || []
  const vals = [c.name, c.type, (W.SAY_FAMILY_NAMES || [])[c.fam] || FAMS[c.fam], num(c.n), `${c.gx}, ${c.gy}`]
  info.replaceChildren(h('table', {}, h('tbody', {}, f.map((x, i) =>
    h('tr', {}, h('th', {}, x), h('td', {}, i === 0 ? h('i', { style: `background:${COL[c.fam]}` }) : '', vals[i]))))))
}

function load(parsed, label, sourceLine, note, commands) {
  state.sum = summarize(parsed, state.grid, famOfType, FAMS.length)
  state.cleared = parsed.cleared
  state.bad = parsed.bad
  state.label = label
  state.sourceLine = sourceLine
  state.note = note
  state.commands = commands
  state.pick = null
  state.hover = null
  status.textContent = fmt(W.SAY_SUMMARY, label, num(state.sum.placedFeatures), num(state.sum.tiles))
  layout()
  renderPanels()
  fit(false)
}

function showSample(i) {
  const s = state.samples[i]
  if (!s) return
  state.sampleIx = i
  sampleBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)))
  const parsed = { features: s.features, cleared: s.cleared, bad: [], tiles: new Map(s.tiles) }
  load(parsed, s.file, fmt(W.SAY_SOURCE_SAMPLE, s.file, s.part, s.sha256.slice(0, 16)), (W.SAY_SAMPLE_LINES || [])[i] || '', s.commands)
}

// --- interaction ----------------------------------------------------------------------------
function inside(pts, x, y) {
  let sign = 0
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax)
    if (c !== 0) { if (sign && Math.sign(c) !== sign) return false; sign = Math.sign(c) }
  }
  return true
}

function nearest(px, py) {
  const { x, y, s } = state.view
  const wx = px / s + x, wy = py / s + y
  for (let i = state.cols.length - 1; i >= 0; i--) if (inside(state.cols[i].hull, wx, wy)) return state.cols[i]
  // A column a pixel wide is hard to hit: take the nearest top within half a touch target.
  let best = null, bd = (W.K_MIN_TARGET_PX || 32) / 2
  for (const k of state.cols) {
    const [tx, ty] = k.top[0]
    const d = Math.hypot((tx - x) * s - px, (ty - y) * s - py)
    if (d < bd) { bd = d; best = k }
  }
  return best
}

function zoomAt(px, py, factor) {
  if (!state.grid) return
  const { x, y, s } = state.view
  const base = fitView(bounds(false), cssW, cssH).s
  const ns = Math.min(Math.max(s * factor, base * 0.6), base * (W.K_MAX_ZOOM || 60))
  const gx = x + px / s, gy = y + py / s
  state.view = { s: ns, x: gx - px / ns, y: gy - py / ns }
  draw()
}

const pointers = new Map()
let drag = null, pinch = null
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
    zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d) / state.view.s)
    return
  }
  if (drag) {
    const dx = pt[0] - drag.start[0], dy = pt[1] - drag.start[1]
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true
    if (drag.moved) { state.view = { ...drag.view, x: drag.view.x - dx / drag.view.s, y: drag.view.y - dy / drag.view.s }; draw() }
    return
  }
  if (e.pointerType === 'mouse') {
    const k = nearest(pt[0], pt[1])
    if (k !== state.hover) { state.hover = k; renderInfo(); draw() }
  }
})
canvas.addEventListener('pointerup', (e) => {
  if (drag && !drag.moved) { const pt = local(e); state.pick = nearest(pt[0], pt[1]); renderInfo(); draw() }
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinch = null
  if (!pointers.size) drag = null
})
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
  else if (e.key === 'r' || e.key === 'R') rotate()
  else if (e.key === 'ArrowLeft') { v.x -= step; draw() }
  else if (e.key === 'ArrowRight') { v.x += step; draw() }
  else if (e.key === 'ArrowUp') { v.y -= step; draw() }
  else if (e.key === 'ArrowDown') { v.y += step; draw() }
  else return
  e.preventDefault()
})

let lastW = 0
new ResizeObserver(() => {
  if (!state.grid || wrap.clientWidth === lastW) return
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

// --- export ---------------------------------------------------------------------------------
function save(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = h('a', { href: url, download: name })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
const stem = () => String(state.label || W.ID).replace(/\.[^.]*$/, '').replace(/[^A-Za-z0-9_-]+/g, '-')

function downloadPng() {
  if (!state.sum) return
  const w = W.K_PNG_W || 1200, hgt = W.K_PNG_H || 630
  const c = document.createElement('canvas')
  c.width = w
  c.height = hgt
  const ctx = c.getContext('2d')
  const area = { x: 380, y: 20, w: w - 400, h: hgt - 40 }
  ctx.save()
  ctx.translate(area.x, area.y)
  render(ctx, area.w, area.h, fitView(bounds(false), area.w, area.h))
  ctx.restore()
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, area.x, hgt)
  const sum = state.sum
  const lines = [
    [W.SAY_PNG_TITLE, '700 44px', '#00ff88'],
    [state.label, '600 22px', '#ffd700'],
    [fmt(W.SAY_PNG_TILES, num(sum.tiles), pct(sum.tiles, W.K_CONFIG_TILES)), '600 22px', '#e8fff7'],
    [fmt(W.SAY_PNG_FEATURES, num(sum.placedFeatures)), '600 22px', '#e8fff7'],
    [sum.tallest ? fmt(W.SAY_PNG_TALLEST, sum.tallest.name, num(sum.tallest.n)) : '', '400 18px', '#adc9c0'],
  ]
  let y = 70
  for (const [t, f, col] of lines) {
    ctx.font = `${f} ui-monospace, Menlo, monospace`
    ctx.fillStyle = col
    for (const part of wrapText(ctx, t, area.x - 60)) { ctx.fillText(part, 40, y); y += parseInt(f.split(' ')[1], 10) + 10 }
    y += 8
  }
  ctx.font = '600 18px ui-monospace, Menlo, monospace'
  FAMS.forEach((f, i) => {
    if (!sum.famTiles[i]) return
    ctx.fillStyle = COL[i]
    ctx.fillRect(40, y - 13, 14, 14)
    ctx.fillStyle = '#adc9c0'
    ctx.fillText(`${f} ${num(sum.famTiles[i])}`, 62, y)
    y += 26
  })
  ctx.fillStyle = '#00ff88'
  ctx.font = '700 18px ui-monospace, Menlo, monospace'
  ctx.fillText(brand(W.SAY_PNG_BRAND), 40, hgt - 56)
  ctx.fillStyle = '#8fa9a0'
  ctx.font = '400 15px ui-monospace, Menlo, monospace'
  ctx.fillText(W.SAY_PNG_FOOT, 40, hgt - 30)
  c.toBlob((b) => b && save(b, `${stem()}-skyline.png`), 'image/png')
}

function wrapText(ctx, text, maxW) {
  const out = []
  let cur = ''
  for (const word of String(text).split(/(?<= )/)) {
    if (cur && ctx.measureText(cur + word).width > maxW) { out.push(cur); cur = word } else cur += word
  }
  if (cur) out.push(cur)
  return out
}

// Binary STL: a base plate the size of the die and one box per touched tile, grid units in x and
// y, the same height scale as the drawing. Grid y runs down the die, so it is flipped.
function downloadStl() {
  if (!state.sum) return
  const g = state.grid
  const boxes = [[0, 0, -1, g.w, g.h, 0], ...state.sum.cols.map((c) => [c.gx, g.h - c.gy - 1, 0, c.gx + 1, g.h - c.gy, c.n * state.hk])]
  const tris = boxes.length * 12
  const buf = new ArrayBuffer(84 + tris * 50)
  const dv = new DataView(buf)
  const head = `${W.ID} ${state.label}`.slice(0, 79)
  for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i) & 127)
  dv.setUint32(80, tris, true)
  let o = 84
  const tri = (n, a, b, c) => {
    for (const v of [n, a, b, c]) { dv.setFloat32(o, v[0], true); dv.setFloat32(o + 4, v[1], true); dv.setFloat32(o + 8, v[2], true); o += 12 }
    o += 2
  }
  for (const [x0, y0, z0, x1, y1, z1] of boxes) {
    const p = (x, y, z) => [x ? x1 : x0, y ? y1 : y0, z ? z1 : z0]
    const quad = (n, a, b, c, d) => { tri(n, a, b, c); tri(n, a, c, d) }
    quad([0, 0, -1], p(0, 0, 0), p(0, 1, 0), p(1, 1, 0), p(1, 0, 0))
    quad([0, 0, 1], p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1))
    quad([0, -1, 0], p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1))
    quad([0, 1, 0], p(0, 1, 0), p(0, 1, 1), p(1, 1, 1), p(1, 1, 0))
    quad([-1, 0, 0], p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0))
    quad([1, 0, 0], p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1))
  }
  save(new Blob([buf], { type: 'model/stl' }), `${stem()}-skyline.stl`)
}

// --- files ----------------------------------------------------------------------------------
function readText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = () => reject(fr.error)
    fr.readAsText(file)
  })
}

async function takeFile(file) {
  if (!file || !state.grid) return
  if (file.size > (W.K_MAX_FILE_MB || 256) * 1048576) { status.textContent = fmt(W.SAY_ERR_SIZE, file.name, W.K_MAX_FILE_MB); return }
  status.textContent = fmt(W.SAY_READING, file.name)
  let parsed
  try { parsed = parseFasm(await readText(file)) } catch { status.textContent = fmt(W.SAY_ERR_READ, file.name); return }
  if (!parsed.features) { status.textContent = fmt(W.SAY_ERR_EMPTY, file.name); return }
  sampleBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'))
  const chip = parsed.header.find((x) => /^chipdb /.test(x)) || ''
  load(parsed, file.name, fmt(W.SAY_SOURCE_FILE, file.name, num(file.size), chip), '', [])
}

fileInput.addEventListener('change', () => { takeFile(fileInput.files[0]); fileInput.value = '' })
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over') })
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); takeFile(e.dataTransfer?.files?.[0]) })
root.addEventListener('dragover', (e) => e.preventDefault())
root.addEventListener('drop', (e) => { if (e.defaultPrevented) return; e.preventDefault(); takeFile(e.dataTransfer?.files?.[0]) })

;(async () => {
  try {
    const [g, s] = await Promise.all([W.K_DATA_GRID, W.K_DATA_SAMPLES].map(async (f) => {
      const r = await fetch(new URL(f, import.meta.url))
      if (!r.ok) throw new Error(String(r.status))
      return r.json()
    }))
    state.grid = decodeGrid(g)
    const famOfIx = g.types.map(famOfType)
    state.runs = []
    for (let gx = 0; gx < g.w; gx++) {
      let start = 0
      for (let gy = 1; gy <= g.h; gy++) {
        const f = famOfIx[state.grid.at(gx, start)]
        if (gy === g.h || famOfIx[state.grid.at(gx, gy)] !== f) { state.runs.push([f, gx, start, gy - 1]); start = gy }
      }
    }
    state.samples = s.samples
    showSample(0)
  } catch {
    status.textContent = W.SAY_ERR_DATA
  }
})()
