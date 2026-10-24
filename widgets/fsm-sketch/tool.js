// SPDX-License-Identifier: Apache-2.0
// fsm-sketch tool: what yosys printed about state machines in, the FSM it extracted out, drawn as
// SVG in the reader's browser. Every word on screen comes from window.T27_WIDGET
// (specs/widgets/fsm-sketch.t27, SAY_*); every size is a K_ there. A dropped or pasted file is read
// with File.text() and never leaves the page; the samples are same-origin files written by
// scripts/widget-data/fsm-sketch.mjs, read by the same parser (fsmparse.js) as the reader's file.
import { conditionOf, countsOf, layoutFsm, parseAny } from './fsmparse.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const num = (n) => Number(n ?? 0).toLocaleString('en-US')
const MAX_CHARS = W.K_MAX_CHARS || 4000000
const MAX_DRAW = W.K_MAX_DRAW_STATES || 40
const FONT = W.K_FONT_PX || 13
const MIN_W = W.K_DIAGRAM_MIN_W || 460
const MAX_W = W.K_DIAGRAM_MAX_W || 780
const MAX_H = W.K_DIAGRAM_MAX_H || 600
const TABLE_ROWS = W.K_TABLE_ROWS || 24
const LABEL_ROWS = W.K_LABEL_ROWS ?? 3
const IDS = W.K_SAMPLE_IDS || []
const SAMPLE_DIR = W.K_SAMPLE_DIR || 'samples'
const SVGNS = 'http://www.w3.org/2000/svg'

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

function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVGNS, tag)
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, String(v))
  for (const k of kids.flat()) if (k !== null && k !== undefined) el.append(k instanceof Node ? k : String(k))
  return el
}

document.head.append(h('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href }))

// The colours of the shared frame (public/widgets/widget.css), written into the SVG so a saved copy stands alone.
const css = getComputedStyle(document.documentElement)
const C = Object.fromEntries(['bg', 'panel', 'line', 'green', 'gold', 'red', 'text', 'muted', 'subtle'].map((k) => [k, css.getPropertyValue(`--w-${k}`).trim() || '#888']))
const MONO = 'Menlo, ui-monospace, SFMono-Regular, monospace'

const state = { result: null, pick: 0, names: null, label: '', sampleJson: null, width: 0, showAll: false }

// --- layout -----------------------------------------------------------------------------------
const sampleBtns = IDS.map((id, i) => h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => showSample(i) }, W.SAY_SAMPLE_NAMES?.[i] ?? id))
const sampleLine = h('p', { class: 'fk-line' })
const sampleLinks = h('p', { class: 'fk-links' })

const fileInput = h('input', { type: 'file', accept: '.kiss2,.kiss,.txt,.log,text/plain', class: 'fk-file' })
const drop = h('label', { class: 't27-drop fk-drop' }, fileInput, h('span', {}, W.SAY_DROP))
const paste = h('textarea', { class: 'fk-paste', rows: '4', spellcheck: 'false', placeholder: W.SAY_PASTE_HINT, 'aria-label': W.SAY_PASTE_LABEL })
const readBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => readText(paste.value, W.SAY_PASTED) }, W.SAY_READ)
const clearBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => clearOwn() }, W.SAY_CLEAR)
const status = h('p', { class: 'fk-status', role: 'status' }, W.SAY_LOCAL_NOTE)

const verdict = h('div', { class: 'fk-verdict' })
const picker = h('div', { class: 'fk-picker', role: 'group', 'aria-label': W.SAY_PICK_FSM })
const stats = h('div', { class: 'fk-stats' })
const diagramWrap = h('div', { class: 'fk-diagram' })
const svgBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => saveSvg() }, W.SAY_SVG_BUTTON)
const legend = h('p', { class: 'fk-note' }, W.SAY_LEGEND)
const inputKey = h('div', { class: 'fk-key' })
const table = h('div', { class: 'fk-table-wrap' })
const fsmView = h('section', { class: 'fk-fsm', hidden: true },
  picker, stats,
  h('h2', { class: 'fk-h' }, W.SAY_DIAGRAM_HEAD),
  diagramWrap,
  h('div', { class: 'fk-btns' }, svgBtn),
  legend, inputKey, table)

root.replaceChildren(h('div', { class: 'fk' },
  h('section', { class: 'fk-pick' },
    h('div', { class: 'fk-col' },
      h('h2', { class: 'fk-h' }, W.SAY_SAMPLE_LABEL),
      h('div', { class: 'fk-btns' }, sampleBtns),
      sampleLine, sampleLinks),
    h('div', { class: 'fk-col' },
      h('h2', { class: 'fk-h' }, W.SAY_OWN_LABEL),
      h('p', { class: 'fk-how' }, h('code', {}, W.SAY_HOW)),
      h('p', { class: 'fk-note' }, W.SAY_HOW_LINE),
      drop, paste,
      h('div', { class: 'fk-btns' }, readBtn, clearBtn),
      status)),
  h('section', { class: 'fk-result', 'aria-live': 'polite' }, verdict, fsmView),
  h('p', { class: 'fk-honest' }, W.SAY_HONEST)))

// --- words for parser codes ---------------------------------------------------------------------
const byId = (ids, texts, id) => texts?.[(ids || []).indexOf(id)]
const errorText = (r) => fmt(byId(W.SAY_ERROR_IDS, W.SAY_ERROR_TEXT, r.error) ?? r.error, r.line ?? '')
const noteText = (n) => fmt(byId(W.SAY_NOTE_IDS, W.SAY_NOTE_TEXT, n.id) ?? n.id, ...(n.args || []))
const fsmName = (f) => (f.id === 'kiss2' ? state.label : f.module ? `${f.module}.${f.reg}` : f.reg ?? f.id)
const inputName = (f, i) => f.inputs?.[i] ?? `in[${i}]`

// --- the verdict: what yosys extracted, said first ------------------------------------------------
function renderVerdict(r) {
  const kids = []
  const n = r.fsms.length
  if (r.kind === 'kiss2') kids.push(h('p', { class: 'fk-big is-found' }, W.SAY_VERDICT_KISS2))
  else kids.push(h('p', { class: `fk-big ${n ? 'is-found' : 'is-none'}` }, n === 0 ? W.SAY_VERDICT_NONE : n === 1 ? W.SAY_VERDICT_ONE : fmt(W.SAY_VERDICT_MANY, n)))
  const list = []
  for (const f of r.fsms) {
    const c = countsOf(f)
    list.push(h('li', { class: 'is-found' }, fmt(W.SAY_FSM_LINE, fsmName(f), c.states, c.transitions, c.inputs), f.reset < 0 ? ` (${W.SAY_NO_RESET})` : null))
  }
  for (const x of r.rejected) list.push(h('li', { class: 'is-refused' }, fmt(W.SAY_REFUSED, x.reg), x.reasons.length ? h('span', { class: 'fk-reason' }, ' ', x.reasons.join(' ')) : null))
  if (list.length) kids.push(h('ul', { class: 'fk-list' }, list))
  if (r.kind === 'log' && n === 0 && r.rejected.length === 0 && r.found.length === 0) kids.push(h('p', { class: 'fk-warn' }, W.SAY_SILENT))
  if (r.kind === 'kiss2') kids.push(h('p', { class: 'fk-note' }, W.SAY_KISS2_NOTE))
  for (const note of r.notes || []) kids.push(h('p', { class: 'fk-note' }, noteText(note)))
  if (r.version) kids.push(h('p', { class: 'fk-meta' }, fmt(W.SAY_VERSION, r.version)))
  verdict.replaceChildren(...kids)
}

// --- the FSM in view ----------------------------------------------------------------------------
function renderPicker(r) {
  if (r.fsms.length < 2) { picker.replaceChildren(); picker.hidden = true; return }
  picker.hidden = false
  picker.replaceChildren(...r.fsms.map((f, i) => h('button', { class: 't27-btn', type: 'button', 'aria-pressed': String(i === state.pick), onclick: () => { state.pick = i; state.showAll = false; renderFsm() } }, `${W.SAY_PICK_FSM} ${i + 1}: ${fsmName(f)}`)))
}

function renderStats(f) {
  const c = countsOf(f)
  const vals = [c.states, c.transitions, c.inputs, c.outputs]
  const kids = vals.map((v, i) => h('div', { class: 'fk-stat' }, h('b', {}, num(v)), h('span', {}, W.SAY_STAT_NAMES?.[i] ?? '')))
  if (f.encoding && f.encoding !== 'auto') kids.push(h('p', { class: 'fk-meta fk-enc' }, fmt(W.SAY_ENCODING, f.encoding)))
  stats.replaceChildren(...kids)
}

/** The lines inside a state's box: the sample's localparam name when it has one, then yosys's name and code. */
function stateLabels(f) {
  return f.states.map((st, i) => {
    const local = state.names?.[i]
    if (local) return [local, `${st.name} ${st.code ?? ''}`.trim()]
    return st.code ? [st.name, st.code] : [st.name]
  })
}

function svgOf(f, w) {
  const L = Math.max(Math.min(w, MAX_W), MIN_W)
  const H = Math.min(MAX_H, Math.max(300, Math.round(L * (f.states.length > 5 ? 0.82 : 0.68))))
  const lay = layoutFsm(f, { w: L, h: H, font: FONT, charW: FONT * 0.6, edgeFont: FONT - 2, maxLabelRows: LABEL_ROWS, labels: stateLabels(f) })
  const c = countsOf(f)
  const svg = s('svg', { xmlns: SVGNS, viewBox: `0 0 ${L} ${H}`, width: '100%', role: 'img', 'aria-label': fmt(W.SAY_DIAGRAM_ALT, fsmName(f), c.states, c.transitions), 'font-family': MONO, class: 'fk-svg', style: `max-width:${L}px` })
  svg.append(s('rect', { x: 0, y: 0, width: L, height: H, fill: C.bg }))
  const r1 = (v) => Math.round(v * 10) / 10
  const edgesG = s('g', { fill: 'none', stroke: C.muted, 'stroke-width': 1.4 })
  const heads = s('g', { fill: C.muted })
  const labels = s('g', { 'font-size': lay.edgeFont, fill: C.gold, stroke: C.bg, 'stroke-width': 3, 'paint-order': 'stroke', 'stroke-linejoin': 'round' })
  for (const e of lay.edges) {
    const p = e.pts.map(([x, y]) => `${r1(x)} ${r1(y)}`)
    const d = e.self ? `M${p[0]} C${p[1]} ${p[2]} ${p[3]}` : `M${p[0]} Q${p[1]} ${p[2]}`
    const title = s('title', {}, f.rows.filter((_, k) => e.rows.includes(k)).map((row) => `${f.states[row.from].name} -> ${f.states[row.to].name}  ${row.in}`).join('\n'))
    edgesG.append(s('path', { d }, title))
    const { x, y, angle } = e.arrow
    const bx = x - 9 * Math.cos(angle)
    const by = y - 9 * Math.sin(angle)
    const nx = -Math.sin(angle) * 4.5
    const ny = Math.cos(angle) * 4.5
    heads.append(s('polygon', { points: `${r1(x)},${r1(y)} ${r1(bx + nx)},${r1(by + ny)} ${r1(bx - nx)},${r1(by - ny)}` }))
    const lines = [...e.label.lines.map((t) => t || W.SAY_ANY), ...(e.label.more ? [fmt(W.SAY_EDGE_MORE, e.label.more)] : [])]
    const lh = lay.edgeFont * 1.15
    const total = lines.length * lh
    const y0 = e.label.valign === 'bottom' ? e.label.y - total + lh * 0.8 : e.label.valign === 'top' ? e.label.y + lh * 0.8 : e.label.y - total / 2 + lh * 0.8
    labels.append(s('text', { x: r1(e.label.x), y: r1(y0), 'text-anchor': e.label.anchor }, lines.map((t, k) => s('tspan', { x: r1(e.label.x), dy: k ? r1(lh) : 0, fill: k >= e.label.lines.length ? C.subtle : C.gold }, t))))
  }
  const nodesG = s('g', {})
  for (const n of lay.nodes) {
    const reset = n.i === f.reset
    const g = s('g', {})
    if (reset) g.append(s('rect', { x: r1(n.x - n.w / 2 - 4), y: r1(n.y - n.h / 2 - 4), width: r1(n.w + 8), height: r1(n.h + 8), rx: 11, fill: 'none', stroke: C.gold, 'stroke-width': 1.5 }))
    g.append(s('rect', { x: r1(n.x - n.w / 2), y: r1(n.y - n.h / 2), width: r1(n.w), height: r1(n.h), rx: 8, fill: C.panel, stroke: reset ? C.gold : C.green, 'stroke-width': 1.6 }))
    const top = n.y - (n.lines.length * lay.lineH) / 2 + lay.lineH * 0.78
    n.lines.forEach((t, k) => g.append(s('text', { x: r1(n.x), y: r1(top + k * lay.lineH), 'text-anchor': 'middle', 'font-size': k ? FONT - 1 : FONT, 'font-weight': k ? 'normal' : 'bold', fill: k ? C.subtle : reset ? C.gold : C.text }, t)))
    nodesG.append(g)
  }
  svg.append(edgesG, heads, nodesG, labels)
  return svg
}

function renderDiagram(f) {
  const n = f.states.length
  if (n > MAX_DRAW || n === 0) {
    diagramWrap.replaceChildren(h('p', { class: 'fk-warn' }, fmt(W.SAY_TOO_MANY, num(n), num(MAX_DRAW))))
    svgBtn.hidden = true
    legend.hidden = true
    return
  }
  svgBtn.hidden = false
  legend.hidden = false
  const w = Math.round(diagramWrap.clientWidth || MIN_W)
  state.width = w
  diagramWrap.replaceChildren(svgOf(f, w))
}

function renderKey(f) {
  if (!f.nIn) { inputKey.replaceChildren(); return }
  const items = []
  for (let i = f.nIn - 1; i >= 0; i--) items.push(h('li', {}, h('code', {}, inputName(f, i))))
  inputKey.replaceChildren(h('p', { class: 'fk-h3' }, W.SAY_INPUT_KEY), h('ol', { class: 'fk-keylist' }, items))
}

function renderTable(f) {
  const head = W.SAY_TABLE_HEAD || []
  const rows = state.showAll ? f.rows : f.rows.slice(0, TABLE_ROWS)
  const nm = (i) => {
    const local = state.names?.[i]
    return local ? `${f.states[i].name} ${local}` : f.states[i].name
  }
  const body = rows.map((r) => {
    const cond = conditionOf(r.in, f.inputs)
    return h('tr', {},
      h('td', {}, nm(r.from)),
      h('td', { class: 'fk-pat' }, r.in || '-'),
      h('td', {}, nm(r.to)),
      h('td', { class: 'fk-pat' }, r.out || '-'),
      h('td', { class: 'fk-cond' }, cond.length ? cond.join(' & ') : W.SAY_ANY))
  })
  const kids = [h('table', { class: 'fk-table' },
    h('thead', {}, h('tr', {}, head.map((t) => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, body))]
  if (f.rows.length > rows.length) kids.push(h('div', { class: 'fk-btns' }, h('button', { class: 't27-btn', type: 'button', onclick: () => { state.showAll = true; renderTable(f) } }, fmt(W.SAY_TABLE_SHOW, num(f.rows.length)))))
  table.replaceChildren(...kids)
}

function renderFsm() {
  const r = state.result
  const f = r?.fsms?.[state.pick]
  if (!f) { fsmView.hidden = true; return }
  fsmView.hidden = false
  renderPicker(r)
  renderStats(f)
  renderDiagram(f)
  renderKey(f)
  renderTable(f)
}

function show(r, label, names) {
  state.result = r
  state.pick = 0
  state.showAll = false
  state.label = label
  state.names = names
  renderVerdict(r)
  renderFsm()
}

new ResizeObserver(() => {
  const f = state.result?.fsms?.[state.pick]
  if (f && !fsmView.hidden && Math.abs((diagramWrap.clientWidth || 0) - state.width) > 8) renderDiagram(f)
}).observe(diagramWrap)

// --- reading ----------------------------------------------------------------------------------
function pressSample(i) { sampleBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))) }

function refuse(text) {
  status.textContent = text
  state.result = null
  verdict.replaceChildren()
  fsmView.hidden = true
  pressSample(-1)
  sampleLine.textContent = ''
  sampleLinks.replaceChildren()
}

function readText(text, name) {
  if (text.length > MAX_CHARS) { refuse(fmt(W.SAY_TOO_BIG, num(text.length), num(MAX_CHARS))); return }
  const r = parseAny(text)
  if (!r.ok) { refuse(errorText(r)); return }
  pressSample(-1)
  sampleLine.textContent = ''
  sampleLinks.replaceChildren()
  status.textContent = `${name}. ${W.SAY_LOCAL_NOTE}`
  show(r, name, null)
}

async function readFile(file) {
  if (!file) return
  const picked = fmt(W.SAY_PICKED, file.name, num(file.size))
  try {
    status.textContent = picked
    if (file.size > MAX_CHARS) { refuse(fmt(W.SAY_TOO_BIG, num(file.size), num(MAX_CHARS))); return }
    readText(await file.text(), picked)
  } catch {
    refuse(fmt(W.SAY_ERR_READ, file.name))
  }
}

const sampleUrl = (name) => new URL(`${SAMPLE_DIR}/${name}`, import.meta.url).href

async function sampleJson() {
  if (state.sampleJson) return state.sampleJson
  const res = await fetch(new URL(W.K_SAMPLE_JSON || 'sample.json', import.meta.url))
  if (!res.ok) throw new Error(String(res.status))
  state.sampleJson = await res.json()
  return state.sampleJson
}

async function showSample(i) {
  const id = IDS[i]
  try {
    const meta = (await sampleJson()).samples?.find((x) => x.id === id)
    const res = await fetch(sampleUrl(`${id}.yosys.txt`))
    if (!res.ok) throw new Error(String(res.status))
    const r = parseAny(await res.text())
    if (!r.ok) throw new Error(r.error)
    pressSample(i)
    sampleLine.textContent = W.SAY_SAMPLE_LINES?.[i] ?? ''
    const links = [h('a', { href: sampleUrl(`${id}.yosys.txt`), target: '_blank', rel: 'noopener' }, W.SAY_OPEN_LOG)]
    if (meta?.kiss2) links.push(' ', h('a', { href: sampleUrl(`${id}.kiss2`), target: '_blank', rel: 'noopener' }, W.SAY_OPEN_KISS2))
    const names = meta?.names?.some(Boolean) ? meta.names : null
    if (names) links.push(h('span', { class: 'fk-note fk-names' }, fmt(W.SAY_NAMES_NOTE, names.length - 1)))
    sampleLinks.replaceChildren(...links)
    status.textContent = W.SAY_LOCAL_NOTE
    show(r, id, names)
  } catch {
    status.textContent = W.SAY_ERR_LOAD
  }
}

function clearOwn() {
  paste.value = ''
  fileInput.value = ''
  status.textContent = W.SAY_LOCAL_NOTE
  showSample(0)
}

fileInput.addEventListener('change', () => readFile(fileInput.files?.[0]))
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over') })
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); readFile(e.dataTransfer?.files?.[0]) })

// --- saving -----------------------------------------------------------------------------------
const slug = (t) => String(t ?? '').replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || W.ID

function saveSvg() {
  const svg = diagramWrap.querySelector('svg')
  const f = state.result?.fsms?.[state.pick]
  if (!svg || !f) return
  const copy = svg.cloneNode(true)
  const [, , vw, vh] = copy.getAttribute('viewBox').split(' ')
  copy.setAttribute('width', vw)
  copy.setAttribute('height', vh)
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }))
  const a = h('a', { href: url, download: fmt(W.SAY_SVG_FILE, slug(fsmName(f))) })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

showSample(0)
