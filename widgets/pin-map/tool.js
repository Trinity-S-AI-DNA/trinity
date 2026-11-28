// SPDX-License-Identifier: Apache-2.0
// pin-map tool: the XC7A200T 676-ball package, ball by ball, with the pins of an XDC on top.
// Every word on screen comes from window.T27_WIDGET (specs/widgets/pin-map.t27, SAY_*); the
// numbers come from K_* there or from pins.json, which scripts/widget-data/pin-map.mjs writes and
// checks against the spec. A pasted or dropped XDC is read in this tab and never leaves it.
import { parseXdc, lintXdc, summarize } from './xdc.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')
const SVGNS = 'http://www.w3.org/2000/svg'

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const say = (k, i) => (i === undefined ? W[k] : (W[k] || [])[i]) ?? ''

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
function s(tag, attrs = {}) {
  const el = document.createElementNS(SVGNS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return el
}

document.head.append(h('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href }))

async function json(path) {
  const r = await fetch(new URL(path, import.meta.url))
  if (!r.ok) throw new Error(path)
  return r.json()
}

// --- state ------------------------------------------------------------------------------------
const state = {
  pkg: null,          // { rows, cols, banks, byBall: Map, pins: Map for lint }
  demos: [],
  colour: 0,          // index into SAY_COLOUR_MODES: 0 bank, 1 type
  bank: null,         // bank filter, null = all
  query: '',
  overlay: null,      // { kind: 'demo', i } | { kind: 'yours', name }
  lint: null, parsed: null,
  portsAt: new Map(), // ball -> [port records]
  badBalls: new Set(),
  findingsAt: new Map(),
  hover: null, selected: null,
}
const vcco = new Map((W.SAY_VCCO_STD || []).map((std, i) => [std, (W.K_VCCO_MV || [])[i]]))
const TYPE_IDS = W.SAY_TYPE_IDS || []
const typeName = (t) => say('SAY_TYPE_NAMES', TYPE_IDS.indexOf(t))
const kindName = (k) => say('SAY_BANK_KINDS', ['io', 'mgt', 'dedicated'].indexOf(k))
const sevName = (sev) => say('SAY_SEV', ['error', 'warn', 'info'].indexOf(sev))
const lintText = (f) => fmt(say('SAY_LINT_TEXT', (W.SAY_LINT_IDS || []).indexOf(f.id)), f.ball, f.port, ...f.args)

// --- layout -----------------------------------------------------------------------------------
const partLine = h('p', { class: 'pm-part' })
const search = h('input', { class: 'pm-search', type: 'search', placeholder: say('SAY_SEARCH_HINT'), 'aria-label': say('SAY_SEARCH_LABEL'), autocomplete: 'off', spellcheck: 'false' })
const count = h('span', { class: 'pm-count', role: 'status' })
const colourBtns = (W.SAY_COLOUR_MODES || []).map((name, i) => h('button', { class: 't27-btn', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { state.colour = i; paint() } }, name))
const bankRow = h('div', { class: 'pm-row', role: 'group', 'aria-label': say('SAY_BANK_LABEL') })
const demoRow = h('div', { class: 'pm-row', role: 'group', 'aria-label': say('SAY_OVERLAY_LABEL') })
const demoLine = h('p', { class: 'pm-line' })
const demoSrc = h('p', { class: 'pm-src' })

const svg = s('svg', { class: 'pm-board', role: 'img', tabindex: '0', 'aria-label': say('SAY_GRID_ALT') })
const detail = h('div', { class: 'pm-detail', 'aria-live': 'polite' })
const legend = h('ul', { class: 'pm-legend' })

const lintSum = h('p', { class: 'pm-sum' })
const parseLine = h('p', { class: 'pm-note' })
const findings = h('ul', { class: 'pm-findings' })

const paste = h('textarea', { class: 'pm-paste', placeholder: say('SAY_PASTE_HINT'), 'aria-label': say('SAY_YOURS'), spellcheck: 'false' })
const fileIn = h('input', { class: 'pm-file', type: 'file', accept: '.xdc,.tcl,.txt,text/plain' })
const drop = h('label', { class: 't27-drop pm-drop' }, fileIn, say('SAY_DROP'))
const ownErr = h('p', { class: 'pm-err', role: 'alert' })
const notes = h('div', { class: 'pm-notes' })

root.replaceChildren(h('div', { class: 'pm' },
  partLine,
  h('div', { class: 'pm-row' }, h('span', { class: 'pm-label' }, say('SAY_OVERLAY_LABEL')), demoRow),
  h('div', { class: 'pm-row' }, h('span', { class: 'pm-label' }, say('SAY_SEARCH_LABEL')), search, count),
  h('div', { class: 'pm-row' }, h('span', { class: 'pm-label' }, say('SAY_COLOUR_LABEL')), ...colourBtns),
  h('div', { class: 'pm-row' }, h('span', { class: 'pm-label' }, say('SAY_BANK_LABEL')), bankRow),
  h('div', { class: 'pm-main' }, svg, h('div', { class: 'pm-side' }, detail, legend)),
  h('section', { class: 'pm-panel' }, demoLine, demoSrc, lintSum, parseLine, findings),
  h('section', { class: 'pm-panel' },
    h('p', { class: 'pm-label' }, say('SAY_YOURS')), paste, drop,
    h('div', { class: 'pm-row' },
      h('button', { class: 't27-btn', type: 'button', onclick: () => lintYours(paste.value, say('SAY_YOURS')) }, say('SAY_READ')),
      h('button', { class: 't27-btn', type: 'button', onclick: clearYours }, say('SAY_CLEAR'))),
    ownErr, h('p', { class: 'pm-note' }, say('SAY_LOCAL_NOTE'))),
  notes))

// --- the board --------------------------------------------------------------------------------
const CELL = 20, OX = 26, OY = 22, R = 7.4
let balls = new Map()   // ball -> circle
let ring = null

function buildBoard() {
  const { rows, cols } = state.pkg
  const w = OX + cols * CELL + 8, hgt = OY + rows.length * CELL + 8
  svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`)
  const defs = s('defs')
  const f = s('filter', { id: 'pm-glow', x: '-80%', y: '-80%', width: '260%', height: '260%' })
  f.append(s('feGaussianBlur', { stdDeviation: '1.8', result: 'b' }))
  const m = s('feMerge'); m.append(s('feMergeNode', { in: 'b' }), s('feMergeNode', { in: 'SourceGraphic' }))
  f.append(m); defs.append(f)
  svg.append(defs)
  svg.append(s('rect', { x: OX - 6, y: OY - 6, width: cols * CELL + 12, height: rows.length * CELL + 12, rx: 10, fill: 'var(--pm-substrate)', stroke: 'var(--pm-substrate-edge)', 'stroke-width': 1.5 }))
  // Ball A1 marker: the chamfered corner of the package.
  svg.append(s('path', { d: `M${OX - 6} ${OY + 10} L${OX - 6} ${OY - 6} L${OX + 10} ${OY - 6} Z`, fill: 'var(--w-gold)', opacity: '0.85' }))
  for (let c = 1; c <= cols; c++) {
    const t = s('text', { class: 'pm-axis', x: OX + (c - 0.5) * CELL, y: OY - 9, 'text-anchor': 'middle' }); t.textContent = String(c); svg.append(t)
  }
  rows.forEach((r, i) => {
    const t = s('text', { class: 'pm-axis', x: OX - 9, y: OY + (i + 0.5) * CELL + 2.5, 'text-anchor': 'end' }); t.textContent = r; svg.append(t)
  })
  balls = new Map()
  rows.forEach((r, i) => {
    for (let c = 1; c <= cols; c++) {
      const id = r + c
      const el = s('circle', { class: 'pm-ball', cx: OX + (c - 0.5) * CELL, cy: OY + (i + 0.5) * CELL, r: R })
      balls.set(id, el)
      svg.append(el)
    }
  })
  ring = s('circle', { class: 'pm-ring', r: R + 2.6, cx: -50, cy: -50 })
  svg.append(ring)
}

function ballAt(evt) {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const pt = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(ctm.inverse())
  const c = Math.floor((pt.x - OX) / CELL) + 1, r = Math.floor((pt.y - OY) / CELL)
  if (c < 1 || c > state.pkg.cols || r < 0 || r >= state.pkg.rows.length) return null
  return state.pkg.rows[r] + c
}
svg.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { const b = ballAt(e); if (b !== state.hover) { state.hover = b; showDetail() } } })
svg.addEventListener('pointerleave', () => { state.hover = null; showDetail() })
svg.addEventListener('click', (e) => { const b = ballAt(e); if (b) select(b) })
svg.addEventListener('keydown', (e) => {
  const { rows, cols } = state.pkg || {}
  if (!rows) return
  const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
  if (!moves[e.key]) return
  e.preventDefault()
  const cur = /^([A-Z]+)(\d+)$/.exec(state.selected || '')
  let ri = cur ? rows.indexOf(cur[1]) : 0, ci = cur ? +cur[2] : 1
  if (cur) { ri = Math.min(rows.length - 1, Math.max(0, ri + moves[e.key][0])); ci = Math.min(cols, Math.max(1, ci + moves[e.key][1])) }
  select(rows[ri] + ci)
})

function select(b) {
  state.selected = b
  const el = balls.get(b)
  if (el) { ring.setAttribute('cx', el.getAttribute('cx')); ring.setAttribute('cy', el.getAttribute('cy')) }
  showDetail()
}

// --- painting ---------------------------------------------------------------------------------
function matches() {
  const q = state.query.trim()
  if (!q) return null
  const Q = q.toUpperCase(), lower = q.toLowerCase()
  const out = new Set()
  if (balls.has(Q)) { out.add(Q); return out }
  for (const [ball, p] of state.pkg.byBall) if (p.fn.includes(Q) || p.site.includes(Q)) out.add(ball)
  for (const [ball, ports] of state.portsAt) if (ports.some((p) => p.port.toLowerCase().includes(lower))) out.add(ball)
  return out
}

function paint() {
  if (!state.pkg) return
  colourBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === state.colour)))
  ;[...bankRow.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bank === String(state.bank ?? ''))))
  const m = matches()
  for (const [ball, el] of balls) {
    const p = state.pkg.byBall.get(ball)
    const fill = !p ? 'var(--pm-type-unlisted)' : state.colour === 0 ? `var(--pm-bank-${p.bank})` : `var(--pm-type-${p.type})`
    el.style.fill = fill
    const used = state.portsAt.has(ball)
    el.classList.toggle('is-bad', state.badBalls.has(ball))
    el.classList.toggle('is-used', used && !state.badBalls.has(ball))
    el.classList.toggle('is-match', !!m && m.has(ball))
    const inBank = state.bank === null || (p && p.bank === state.bank)
    el.classList.toggle('is-dim', !inBank)
  }
  count.textContent = m ? (m.size ? fmt(say('SAY_MATCHES'), m.size) : say('SAY_NO_MATCH')) : ''
  if (m && m.size === 1) select([...m][0])
  paintLegend()
}

function paintLegend() {
  const items = []
  const sw = (cls, color) => h('span', { class: 'pm-sw' + (cls ? ' ' + cls : ''), style: color ? `background:${color}` : null })
  const typeCounts = W.K_TYPE_COUNTS || []
  if (state.colour === 0) {
    for (const b of state.pkg.banks) items.push(h('li', {}, sw('', `var(--pm-bank-${b.id})`), fmt(say('SAY_BANK_LEGEND'), fmt(say('SAY_BANK_NAME'), b.id), kindName(b.kind), b.pins)))
    items.push(h('li', {}, sw('', 'var(--pm-type-unlisted)'), fmt(say('SAY_TYPE_LEGEND'), typeName('unlisted'), typeCounts[TYPE_IDS.indexOf('unlisted')])))
  } else {
    TYPE_IDS.forEach((t, i) => items.push(h('li', {}, sw('', `var(--pm-type-${t})`), fmt(say('SAY_TYPE_LEGEND'), typeName(t), typeCounts[i]))))
  }
  const ol = W.SAY_OVERLAY_LEGEND || []
  items.push(h('li', {}, sw('is-used'), ol[0]), h('li', {}, sw('is-bad'), ol[1]), h('li', {}, sw('is-match'), ol[2]))
  legend.replaceChildren(...items)
}

function showDetail() {
  const b = state.hover || state.selected
  if (!b || !state.pkg) { detail.replaceChildren(h('p', { class: 'pm-hint' }, say('SAY_DETAIL_HINT'))); return }
  const p = state.pkg.byBall.get(b)
  const ports = state.portsAt.get(b) || []
  const F = W.SAY_DETAIL_FIELDS || []
  const none = say('SAY_NONE')
  const rows = [
    [F[0], b],
    [F[1], p ? p.fn : none],
    [F[2], p ? p.bank : none],
    [F[3], p ? typeName(p.type) : typeName('unlisted')],
    [F[4], p ? p.site : none],
    [F[5], p ? p.tile : none],
    [F[6], ports.length ? ports.map((q) => q.port).join(', ') : none],
    [F[7], ports.length ? ports.map((q) => q.std || none).join(', ') : none],
    [F[8], ports.length ? ports.map((q) => q.line).join(', ') : none],
  ]
  const dl = h('dl', {}, rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]))
  const kids = [dl]
  if (!p) kids.push(h('p', { class: 'pm-hint' }, say('SAY_UNLISTED_LINE')))
  const fs = state.findingsAt.get(b) || []
  if (fs.length) kids.push(h('ul', {}, fs.map((f) => h('li', {}, h('span', { class: `pm-sev is-${f.sev}` }, sevName(f.sev)), ' ', lintText(f)))))
  detail.replaceChildren(...kids)
}

// --- overlay and lint -------------------------------------------------------------------------
function applyXdc(text) {
  const parsed = parseXdc(text)
  const lint = lintXdc(parsed, { rows: state.pkg.rows, cols: state.pkg.cols, pins: state.pkg.pins }, vcco)
  state.parsed = parsed; state.lint = lint
  state.portsAt = new Map()
  for (const p of lint.ports) state.portsAt.set(p.ball, [...(state.portsAt.get(p.ball) || []), p])
  state.badBalls = new Set(lint.findings.filter((f) => f.sev === 'error').map((f) => f.ball))
  state.findingsAt = new Map()
  for (const f of lint.findings) state.findingsAt.set(f.ball, [...(state.findingsAt.get(f.ball) || []), f])
  const sum = summarize(lint)
  lintSum.textContent = fmt(say('SAY_LINT_SUMMARY'), sum.ports, sum.ok, sum.flaggedBalls)
  parseLine.textContent = fmt(say('SAY_PARSE_LINE'), parsed.commands, parsed.placed, parsed.skipped)
  const max = W.K_MAX_LINT_ROWS || 200
  const items = lint.findings.slice(0, max).map((f) => h('li', {}, h('button', { class: 'pm-find', type: 'button', onclick: () => { select(f.ball); svg.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) } },
    h('span', { class: `pm-sev is-${f.sev}` }, sevName(f.sev)), h('span', {}, lintText(f)))))
  if (lint.findings.length > max) items.push(h('li', { class: 'pm-note' }, fmt(say('SAY_LINT_MORE'), lint.findings.length - max)))
  if (!lint.ports.length) items.push(h('li', { class: 'pm-note' }, say('SAY_EMPTY_XDC')))
  else if (!sum.errors) items.unshift(h('li', { class: 'pm-note' }, say('SAY_LINT_CLEAN')))
  findings.replaceChildren(...items)
  paint(); showDetail()
}

function showDemo(i) {
  const d = state.demos[i]
  if (!d) return
  state.overlay = { kind: 'demo', i }
  ;[...demoRow.children].forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)))
  demoLine.textContent = say('SAY_DEMO_LINES', i)
  demoSrc.textContent = fmt(say('SAY_DEMO_SOURCE'), d.repo, d.commit.slice(0, 9), d.path)
  applyXdc(d.text)
}

function lintYours(text, name) {
  ownErr.textContent = ''
  if (!String(text).trim()) return
  state.overlay = { kind: 'yours', name }
  ;[...demoRow.children].forEach((b) => b.setAttribute('aria-pressed', 'false'))
  demoLine.textContent = say('SAY_YOURS')
  demoSrc.textContent = name
  applyXdc(text)
}

function clearYours() {
  paste.value = ''
  ownErr.textContent = ''
  fileIn.value = ''
  showDemo(0)
}

async function readOwn(file) {
  if (!file) return
  const max = W.K_MAX_XDC_BYTES || 2000000
  if (file.size > max) { ownErr.textContent = fmt(say('SAY_TOO_BIG'), file.name, file.size, max); return }
  try {
    const text = await file.text()
    paste.value = text
    lintYours(text, file.name)
  } catch {
    ownErr.textContent = fmt(say('SAY_ERR_READ'), file.name)
  }
}
fileIn.addEventListener('change', () => readOwn(fileIn.files?.[0]))
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over') })
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); readOwn(e.dataTransfer?.files?.[0]) })
let pasteTimer = null
paste.addEventListener('input', () => {
  clearTimeout(pasteTimer)
  pasteTimer = setTimeout(() => { if (paste.value.length <= (W.K_MAX_XDC_BYTES || 2000000)) lintYours(paste.value, say('SAY_YOURS')) }, 350)
})
let searchTimer = null
search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.query = search.value; paint() }, 120) })

// --- start ------------------------------------------------------------------------------------
async function start() {
  let P, D
  try { [P, D] = await Promise.all([json('./pins.json'), json('./demos.json')]) } catch {
    root.querySelector('.pm').prepend(h('p', { class: 'pm-err', role: 'alert' }, say('SAY_ERR_DATA')))
    return
  }
  const byBall = new Map(P.pins.map(([ball, bank, site, tile, fn, type]) => [ball, { bank, site, tile, fn, type }]))
  state.pkg = { rows: P.rows, cols: P.cols, banks: P.banks, byBall, pins: byBall }
  state.demos = (W.SAY_DEMO_IDS || []).map((id) => D.find((d) => d.id === id)).filter(Boolean)
  partLine.textContent = fmt(say('SAY_PART_LINE'), P.rows.length, P.cols, P.pins.length, P.banks.length)
  bankRow.replaceChildren(
    h('button', { class: 't27-btn', type: 'button', 'data-bank': '', onclick: () => { state.bank = null; paint() } }, say('SAY_ALL')),
    ...P.banks.map((b) => h('button', { class: 't27-btn', type: 'button', 'data-bank': String(b.id), title: fmt(say('SAY_BANK_NAME'), b.id), onclick: () => { state.bank = state.bank === b.id ? null : b.id; paint() } }, String(b.id))))
  demoRow.replaceChildren(...state.demos.map((d, i) => h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => showDemo(i) }, say('SAY_DEMO_NAMES', i))))
  const unlisted = P.rows.length * P.cols - P.pins.length
  notes.replaceChildren(
    h('p', {}, say('SAY_NOTE_FGG')),
    h('p', {}, fmt(say('SAY_NOTE_UNLISTED'), unlisted, P.rows.length * P.cols)),
    h('p', {}, fmt(say('SAY_NOTE_100T'), W.K_A100T_PINS)),
    h('p', {}, fmt(say('SAY_ROWS_NOTE'), (W.SAY_SKIPPED_LETTERS || []).join(' '))))
  buildBoard()
  showDemo(0)
}
start()
