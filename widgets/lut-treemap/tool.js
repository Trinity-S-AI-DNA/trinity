// SPDX-License-Identifier: Apache-2.0
// lut-treemap tool: yosys `stat -json` of a design that was not flattened in, a treemap of LUTs
// (or FFs, DSPs, BRAMs) per submodule instance out, in the reader's browser. Every word on screen
// comes from window.T27_WIDGET (specs/widgets/lut-treemap.t27, SAY_*); the cell lists, budgets and
// hues are K_*. The parser, the instance multiplier and the layout are treemap.js, the same file
// scripts/widget-data/lut-treemap.mjs runs for the sample. A dropped or pasted file is read with
// File.text() and never leaves the page; the sample is two same-origin files.
import { layoutTree, leavesOf, listsOf, METRICS, moduleRows, parseHier, totalsOf, viewTree } from './treemap.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const num = (n) => Number(n ?? 0).toLocaleString('en-US')
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '-')
const LISTS = listsOf(W)
const MAX_CHARS = W.K_MAX_PASTE_CHARS || 8000000
const OPT = { expandMax: W.K_EXPAND_MAX || 64, maxTiles: W.K_MAX_TILES || 600 }
const LABEL_W = W.K_LABEL_MIN_W || 46
const LABEL_H = W.K_LABEL_MIN_H || 18
const HEAD = W.K_HEAD_PX || 16
const PAD = W.K_PAD_PX || 2
const HUES = W.K_TILE_HUES || [152]
const IDS = W.SAY_METRIC_IDS || METRICS
const metricName = (m) => W.SAY_METRIC_NAMES?.[IDS.indexOf(m)] ?? m

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') el.className = v
    else if (k === 'style') el.style.cssText = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : String(k))
  return el
}

document.head.append(h('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href }))

// state: the parsed hierarchical stat, an optional flattened one, the metric, what is selected.
const state = { r: null, flat: null, metric: 'lut', sel: null, tile: null, tree: null, hue: {} }

// --- layout -----------------------------------------------------------------------------------
const sampleUrl = (k, d) => new URL(W[k] || d, import.meta.url).href
const sampleBtn = h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => showSample() }, W.SAY_SAMPLE_NAME)
const sampleLinks = h('span', {},
  h('a', { class: 'lt-open', href: sampleUrl('K_SAMPLE_STAT', 'sample.stat.json'), target: '_blank', rel: 'noopener' }, W.SAY_OPEN_SAMPLE), ' ',
  h('a', { class: 'lt-open', href: sampleUrl('K_SAMPLE_FLAT_STAT', 'sample.flat.stat.json'), target: '_blank', rel: 'noopener' }, W.SAY_OPEN_FLAT))

const fileInput = h('input', { type: 'file', accept: '.json,.txt,application/json,text/plain', class: 'lt-file' })
const drop = h('label', { class: 't27-drop lt-drop' }, fileInput, h('span', {}, W.SAY_DROP))
const flatInput = h('input', { type: 'file', accept: '.json,.txt,application/json,text/plain', class: 'lt-file' })
const flatDrop = h('label', { class: 't27-drop lt-drop lt-drop-small' }, flatInput, h('span', {}, W.SAY_FLAT_DROP))
const paste = h('textarea', { class: 'lt-paste', rows: '3', spellcheck: 'false', placeholder: W.SAY_PASTE_HINT, 'aria-label': W.SAY_PASTE_LABEL })
const readBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => readText(paste.value, W.SAY_PASTED) }, W.SAY_READ)
const clearBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => clearOwn() }, W.SAY_CLEAR)
const status = h('p', { class: 'lt-status', role: 'status' }, W.SAY_LOCAL_NOTE)

const metricBtns = IDS.map((m) => h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', 'data-m': m, onclick: () => setMetric(m) }, metricName(m)))
const totalLine = h('p', { class: 'lt-total' })
const sumLine = h('p', { class: 'lt-sum' })
const flatLine = h('p', { class: 'lt-flat' })
const warnLine = h('p', { class: 'lt-warn', hidden: true })
const map = h('div', { class: 'lt-map', role: 'img' })
const detail = h('div', { class: 'lt-detail', 'aria-live': 'polite' })
const table = h('table', { class: 'lt-table' })
const notes = h('div', { class: 'lt-notes' })

const result = h('section', { class: 'lt-result', hidden: true },
  h('div', { class: 'lt-bar' },
    totalLine,
    h('div', { class: 'lt-metric', role: 'group', 'aria-label': W.SAY_METRIC_LABEL }, h('span', { class: 'lt-metric-label' }, W.SAY_METRIC_LABEL), metricBtns)),
  warnLine, sumLine, flatLine, map, detail,
  h('div', { class: 'lt-table-wrap' }, table),
  notes)

root.replaceChildren(h('div', { class: 'lt' },
  result,
  h('section', { class: 'lt-pick' },
    h('div', { class: 'lt-col' },
      h('h2', { class: 'lt-h' }, W.SAY_SAMPLE_LABEL),
      h('div', { class: 'lt-btns' }, sampleBtn),
      h('p', { class: 'lt-line' }, W.SAY_SAMPLE_LINE, ' ', sampleLinks)),
    h('div', { class: 'lt-col' },
      h('h2', { class: 'lt-h' }, W.SAY_OWN_LABEL),
      h('p', { class: 'lt-how' }, h('code', {}, W.SAY_HOW)),
      drop, paste,
      h('div', { class: 'lt-btns' }, readBtn, clearBtn),
      h('p', { class: 'lt-how' }, W.SAY_FLAT_LABEL),
      flatDrop,
      status)),
  h('p', { class: 'lt-honest' }, W.SAY_HONEST)))

// --- drawing ----------------------------------------------------------------------------------
const hueOf = (name) => state.hue[name] ?? HUES[0]
const pathText = (node) => node.path.map((p) => (p.index ? fmt(W.SAY_TILE_COPY, state.r.modules[p.name].display, p.index, p.of) : fmt(W.SAY_TILE_GROUP, state.r.modules[p.name].display, p.of)))
const tileName = (node) => node.own ? fmt(W.SAY_TILE_OWN, node.display)
  : node.index ? fmt(W.SAY_TILE_COPY, node.display, node.index, node.of)
    : node.copies > 1 ? fmt(W.SAY_TILE_GROUP, node.display, node.copies) : node.display

// Text that does not fit a tile is left off rather than cut: a tile's title and the detail line
// carry the full name. Widths are measured in the font the labels are set in.
const measure = document.createElement('canvas').getContext('2d')
const fits = (text, w) => measure.measureText(text).width + 8 <= w
const tileLabel = (node) => node.own ? fmt(W.SAY_TILE_OWN, node.display)
  : node.index ? fmt(W.SAY_TILE_SHORT, node.display, node.index)
    : node.copies > 1 ? fmt(W.SAY_TILE_GROUP, node.display, node.copies) : node.display

function drawMap() {
  const r = state.r
  const tree = state.tree
  const w = map.clientWidth
  const hgt = map.clientHeight
  const mName = metricName(state.metric)
  map.setAttribute('aria-label', fmt(W.SAY_MAP_LABEL, mName))
  if (!tree || !tree.value || w < 10 || hgt < 10) { map.replaceChildren(h('p', { class: 'lt-empty' }, fmt(W.SAY_METRIC_EMPTY, mName))); return }
  measure.font = `10px ${getComputedStyle(map).getPropertyValue('--w-mono').trim() || 'monospace'}`
  const rects = layoutTree(tree, 0, 0, w, hgt, { head: HEAD, pad: PAD })
  const els = rects.map((p) => {
    const n = p.node
    const leaf = !n.children.length
    const text = leaf && !n.own && !(n.copies > 1) ? n.display : tileLabel(n)
    const label = (leaf ? p.h >= LABEL_H : p.head) && p.w >= LABEL_W && fits(text, p.w)
    const cls = ['lt-tile', leaf ? 'is-leaf' : 'is-box', n.own ? 'is-own' : '', p.depth === 0 ? 'is-root' : '']
    if (state.sel) cls.push(n.name === state.sel ? 'is-sel' : leaf ? 'is-dim' : '')
    if (state.tile === n.id) cls.push('is-tile')
    const style = `left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;width:${Math.max(0, p.w).toFixed(1)}px;height:${Math.max(0, p.h).toFixed(1)}px;--hue:${hueOf(n.name)}`
    const title = `${tileName(n)}: ${fmt(W.SAY_TILE_VALUE, num(n.value), mName)}`
    return h('div', { class: cls.filter(Boolean).join(' '), style, title, 'data-id': String(n.id) },
      label ? h('span', { class: 'lt-label' }, text) : null,
      label && leaf && p.h >= LABEL_H * 2 ? h('span', { class: 'lt-value' }, num(n.value)) : null)
  })
  map.replaceChildren(...els)
  r._nodes = Object.fromEntries(rects.map((p) => [p.node.id, p.node]))
}

function drawTable() {
  const r = state.r
  const m = state.metric
  const top = totalsOf(r, r.top)[m]
  const rows = moduleRows(r).sort((a, b) => b.total[m] - a.total[m] || b.instances - a.instances)
  const head = W.SAY_TABLE_HEAD || []
  table.replaceChildren(
    h('caption', {}, W.SAY_TABLE_CAPTION),
    h('thead', {}, h('tr', {}, head.map((t) => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, rows.map((x) => h('tr', { class: state.sel === x.name ? 'is-sel' : '' },
      h('td', {}, h('button', { class: 'lt-row', type: 'button', 'aria-pressed': String(state.sel === x.name), style: `--hue:${hueOf(x.name)}`, onclick: () => selectModule(x.name) },
        h('span', { class: 'lt-swatch', 'aria-hidden': 'true' }), x.display)),
      h('td', { class: 'lt-n' }, num(x.instances)),
      h('td', { class: 'lt-n' }, num(x.each[m])),
      h('td', { class: 'lt-n' }, num(x.total[m])),
      h('td', { class: 'lt-n' }, x.total[m] ? pct(x.total[m], top) : '-')))))
}

function drawDetail() {
  const r = state.r
  const m = state.metric
  const mName = metricName(m)
  const top = totalsOf(r, r.top)[m]
  const node = state.tile !== null ? r._nodes?.[state.tile] : null
  if (node) {
    const steps = [r.modules[r.top].display, ...pathText(node)]
    if (node.own) steps.push(fmt(W.SAY_TILE_OWN, node.display))
    detail.replaceChildren(
      h('p', { class: 'lt-path' }, h('span', { class: 'lt-h' }, W.SAY_DETAIL_PATH), ' ', steps.join(' > ')),
      h('p', {}, fmt(W.SAY_DETAIL_LINE, num(node.value), mName, pct(node.value, top), num(top))))
    return
  }
  if (state.sel) {
    const x = moduleRows(r).find((row) => row.name === state.sel)
    if (x) { detail.replaceChildren(h('p', {}, fmt(W.SAY_DETAIL_MODULE, x.display, num(x.instances), num(x.each[m]), num(x.total[m]), mName, pct(x.total[m], top)))); return }
  }
  detail.replaceChildren(h('p', { class: 'lt-hint' }, W.SAY_DETAIL_HINT))
}

function drawLines() {
  const r = state.r
  const m = state.metric
  const mName = metricName(m)
  const t = totalsOf(r, r.top)
  const sum = state.tree ? leavesOf(state.tree).reduce((a, b) => a + b.value, 0) : 0
  totalLine.textContent = fmt(W.SAY_TOTAL, num(t[m]), mName, r.modules[r.top].display)
  sumLine.textContent = !r.design ? fmt(W.SAY_SUM_NO_DESIGN, num(sum))
    : r.design[m] === sum ? fmt(W.SAY_SUM_OK, num(sum), num(r.design[m])) : fmt(W.SAY_SUM_BAD, num(sum), num(r.design[m]))
  sumLine.classList.toggle('is-bad', !!r.design && r.design[m] !== sum)
  warnLine.hidden = !r.flat
  warnLine.textContent = r.flat ? W.SAY_FLAT_WARN : ''
  if (state.flat) {
    const f = totalsOf(state.flat, state.flat.top)[m]
    const d = t[m] ? `${f >= t[m] ? '+' : ''}${(((f - t[m]) / t[m]) * 100).toFixed(1)}%` : '-'
    flatLine.textContent = f === t[m] ? fmt(W.SAY_FLAT_SAME, num(f), mName) : fmt(W.SAY_FLAT_CMP, num(f), mName, num(t[m]), d)
    flatLine.hidden = false
  } else flatLine.hidden = true
  const all = state.tree ? (function walk(n, acc) { acc.push(n); n.children.forEach((c) => walk(c, acc)); return acc })(state.tree, []) : []
  notes.replaceChildren(...[
    all.some((n) => n.index > 0) ? h('p', {}, W.SAY_NOTE_COPIES) : null,
    all.some((n) => !n.own && n.index === 0 && n.of > 0) ? h('p', {}, fmt(W.SAY_NOTE_GROUPED, num(OPT.expandMax), num(OPT.maxTiles))) : null,
  ].filter(Boolean))
}

function render() {
  if (!state.r) return
  for (const b of metricBtns) b.setAttribute('aria-pressed', String(b.dataset.m === state.metric))
  state.tree = viewTree(state.r, state.metric, OPT)
  result.hidden = false
  drawLines()
  drawMap()
  drawTable()
  drawDetail()
}

function setMetric(m) {
  state.metric = m
  state.tile = null
  render()
}

function selectModule(name) {
  state.sel = state.sel === name ? null : name
  state.tile = null
  drawMap(); drawTable(); drawDetail()
}

map.addEventListener('click', (e) => {
  const el = e.target.closest?.('[data-id]')
  if (!el || !state.r) return
  const node = state.r._nodes?.[el.dataset.id]
  if (!node) return
  state.tile = node.id
  state.sel = node.name
  drawMap(); drawTable(); drawDetail()
})

let raf = 0
new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (state.r && !result.hidden) drawMap() }) }).observe(map)

// --- reading ----------------------------------------------------------------------------------
function errorText(code) {
  const i = (W.SAY_ERROR_IDS || []).indexOf(code)
  return W.SAY_ERROR_TEXT?.[i] ?? code
}

function use(r, flat) {
  state.r = r
  state.flat = flat
  state.sel = null
  state.tile = null
  state.hue = Object.fromEntries(r.order.map((n, i) => [n, HUES[i % HUES.length]]))
  const t = totalsOf(r, r.top)
  if (!t[state.metric]) state.metric = IDS.find((m) => t[m]) ?? 'lut'
  render()
}

function readText(text, name) {
  if (text.length > MAX_CHARS) { status.textContent = fmt(W.SAY_TOO_BIG, num(text.length), num(MAX_CHARS)); return }
  const r = parseHier(text, LISTS)
  if (!r.ok) { status.textContent = errorText(r.error); return }
  sampleBtn.setAttribute('aria-pressed', 'false')
  status.textContent = `${name}. ${W.SAY_LOCAL_NOTE}`
  use(r, null)
  result.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

function readFlatText(text, name) {
  if (text.length > MAX_CHARS) { status.textContent = fmt(W.SAY_TOO_BIG, num(text.length), num(MAX_CHARS)); return }
  const f = parseHier(text, LISTS)
  if (!f.ok) { status.textContent = errorText(f.error); return }
  if (!f.flat) { status.textContent = W.SAY_NOT_FLAT; return }
  status.textContent = `${name}. ${W.SAY_LOCAL_NOTE}`
  state.flat = f
  if (state.r) render()
}

async function readFile(file, flat) {
  if (!file) return
  const name = fmt(W.SAY_PICKED, file.name, num(file.size))
  try {
    if (file.size > MAX_CHARS) { status.textContent = fmt(W.SAY_TOO_BIG, num(file.size), num(MAX_CHARS)); return }
    const text = await file.text()
    if (flat) readFlatText(text, name)
    else readText(text, name)
  } catch {
    status.textContent = fmt(W.SAY_ERR_READ, file.name)
  }
}

async function showSample() {
  try {
    const get = async (k, d) => {
      const res = await fetch(sampleUrl(k, d))
      if (!res.ok) throw new Error(String(res.status))
      const p = parseHier(await res.text(), LISTS)
      if (!p.ok) throw new Error(p.error)
      return p
    }
    const [r, f] = await Promise.all([get('K_SAMPLE_STAT', 'sample.stat.json'), get('K_SAMPLE_FLAT_STAT', 'sample.flat.stat.json')])
    sampleBtn.setAttribute('aria-pressed', 'true')
    status.textContent = W.SAY_LOCAL_NOTE
    use(r, f)
  } catch {
    status.textContent = W.SAY_ERR_LOAD
  }
}

function clearOwn() {
  paste.value = ''
  fileInput.value = ''
  flatInput.value = ''
  status.textContent = W.SAY_LOCAL_NOTE
  showSample()
}

for (const [input, zone, flat] of [[fileInput, drop, false], [flatInput, flatDrop, true]]) {
  input.addEventListener('change', () => readFile(input.files?.[0], flat))
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-over') })
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'))
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('is-over'); readFile(e.dataTransfer?.files?.[0], flat) })
}

showSample()
