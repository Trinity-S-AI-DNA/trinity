// SPDX-License-Identifier: Apache-2.0
// synth-smells tool: a lint card for a yosys log, read in the reader's browser.
// Every word on screen comes from window.T27_WIDGET (specs/widgets/synth-smells.t27, SAY_*); the
// numbers it relies on are K_*. A dropped or pasted log is read with File.text() and never leaves
// the page; the four sample logs are same-origin files written by scripts/widget-data/synth-smells.mjs.
import { groupOf, parseYosysLog, smellCounts } from './smellparse.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const num = (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString('en-US'))

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

const IDS = W.K_SAMPLE_IDS || []
const SMELLS = W.SAY_SMELL_IDS || []
const LEVELS = W.K_SMELL_LEVELS || []
const LIST_MAX = W.K_LIST_MAX || 8
const MAX_CHARS = W.K_MAX_PASTE_CHARS || 8000000
const LEVEL_CLASS = ['is-info', 'is-warn', 'is-bad']

const state = { meta: null, sample: -1, result: null, cellsOpen: false }

// --- what one parsed log says, smell by smell -------------------------------------------------
function smellsOf(p) {
  const c = smellCounts(p)
  const at = (e) => (e.line ? fmt(W.SAY_REFUSED_LINE, e.file ?? '', e.line, e.message) : e.message)
  return {
    error: { n: c.errors, values: [c.errors], items: p.errors.map(at) },
    latch: { n: c.latches, values: [c.latches], items: p.latches },
    undriven: { n: c.undriven, values: [c.undriven, c.undriven_bits], items: Object.keys(p.undriven) },
    conflict: { n: c.conflicts, values: [c.conflicts], items: p.conflicts },
    memory: { n: c.memories, values: [c.memories], items: p.memories },
    removed: { n: c.removed_cells, values: [num(c.removed_cells), num(c.removed_wires)], items: [] },
    warnings: { n: c.warnings, values: [num(c.warnings), num(c.warnings_unique)], items: [] },
  }
}

function verdictOf(p, s) {
  const known = p.version || p.command || p.stat || SMELLS.some((id) => s[id]?.n)
  if (!known) return { word: W.SAY_VERDICT_UNKNOWN, cls: 'is-warn', key: 'unknown' }
  if (s.error?.n) return { word: W.SAY_VERDICT_REFUSED, cls: 'is-bad', key: 'refused' }
  const n = SMELLS.filter((id, i) => (LEVELS[i] ?? 0) > 0 && s[id]?.n).length
  if (!n) return { word: W.SAY_VERDICT_CLEAN, cls: 'is-good', key: 'clean' }
  return { word: n === 1 ? W.SAY_VERDICT_ONE : fmt(W.SAY_VERDICT_SMELLS, n), cls: 'is-bad', key: 'smells' }
}

function groupTotals(stat) {
  if (!stat) return []
  const ids = W.SAY_GROUP_IDS || []
  return ids.map((g, i) => ({ id: g, name: W.SAY_GROUP_NAMES?.[i] ?? g, n: stat.groups[g] ?? 0 })).filter((g) => g.n > 0)
}

// --- layout -----------------------------------------------------------------------------------
const sampleBtns = IDS.map((id, i) =>
  h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => showSample(i) }, W.SAY_SAMPLE_NAMES?.[i] ?? id))
const sampleLine = h('p', { class: 'ss-line' })
const sampleLink = h('a', { class: 'ss-open', href: '#', target: '_blank', rel: 'noopener' }, W.SAY_OPEN_LOG)
const sampleNote = h('p', { class: 'ss-note' }, W.SAY_SAMPLE_NOTE, ' ', sampleLink)

const fileInput = h('input', { type: 'file', accept: '.log,.txt,text/plain', class: 'ss-file' })
const dropText = h('span', {}, W.SAY_DROP)
const drop = h('label', { class: 't27-drop ss-drop' }, fileInput, dropText)
const paste = h('textarea', { class: 'ss-paste', rows: '4', spellcheck: 'false', placeholder: W.SAY_PASTE_HINT, 'aria-label': W.SAY_PASTE_LABEL })
const readBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => readPaste() }, W.SAY_READ)
const clearBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => clearOwn() }, W.SAY_CLEAR)
const status = h('p', { class: 'ss-status', role: 'status' }, W.SAY_LOCAL_NOTE)

const result = h('section', { class: 'ss-result', 'aria-live': 'polite' })
const pngBtn = h('button', { class: 't27-btn ss-png', type: 'button', onclick: () => savePng() }, W.SAY_PNG_BUTTON)
const honest = h('p', { class: 'ss-honest' }, W.SAY_HONEST)

root.replaceChildren(h('div', { class: 'ss' },
  h('section', { class: 'ss-pick' },
    h('div', { class: 'ss-col' },
      h('h2', { class: 'ss-h' }, W.SAY_SAMPLES_LABEL),
      h('div', { class: 'ss-btns' }, sampleBtns),
      sampleLine, sampleNote),
    h('div', { class: 'ss-col' },
      h('h2', { class: 'ss-h' }, W.SAY_OWN_LABEL),
      drop, paste,
      h('div', { class: 'ss-btns' }, readBtn, clearBtn),
      status)),
  result,
  h('div', { class: 'ss-foot' }, pngBtn, honest)))

// --- reading ----------------------------------------------------------------------------------
async function loadMeta() {
  if (state.meta) return state.meta
  const r = await fetch(new URL(W.K_SAMPLES_JSON || 'samples.json', import.meta.url))
  if (!r.ok) throw new Error(String(r.status))
  state.meta = await r.json()
  return state.meta
}

async function showSample(i) {
  state.sample = i
  sampleBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)))
  sampleLine.textContent = W.SAY_SAMPLE_LINES?.[i] ?? ''
  const href = new URL(`samples/${IDS[i]}.log`, import.meta.url).href
  sampleLink.href = href
  try {
    const meta = await loadMeta()
    const r = await fetch(href)
    if (!r.ok) throw new Error(String(r.status))
    const text = await r.text()
    if (state.sample !== i) return
    const info = meta.samples?.find((s) => s.id === IDS[i]) ?? null
    show(text, W.SAY_SAMPLE_NAMES?.[i] ?? IDS[i], IDS[i], info)
  } catch {
    result.replaceChildren(h('p', { class: 'ss-error' }, W.SAY_ERR_LOAD))
  }
}

function ownPicked() {
  state.sample = -1
  sampleBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'))
  sampleLine.textContent = ''
}

function capped(text) {
  if (text.length <= MAX_CHARS) return { text, cut: false }
  return { text: text.slice(0, MAX_CHARS), cut: true }
}

async function readFileLog(f) {
  if (!f) return
  ownPicked()
  dropText.textContent = fmt(W.SAY_PICKED, f.name, num(f.size))
  try {
    const { text, cut } = capped(await f.text())
    status.textContent = cut ? fmt(W.SAY_CUT, num(MAX_CHARS)) : W.SAY_LOCAL_NOTE
    show(text, f.name, f.name.replace(/\.[^.]*$/, ''), null)
  } catch {
    status.textContent = fmt(W.SAY_ERR_READ, f.name)
  }
}

function readPaste() {
  if (!paste.value.trim()) return
  ownPicked()
  const { text, cut } = capped(paste.value)
  status.textContent = cut ? fmt(W.SAY_CUT, num(MAX_CHARS)) : W.SAY_LOCAL_NOTE
  show(text, W.SAY_PASTED, 'pasted', null)
}

function clearOwn() {
  paste.value = ''
  fileInput.value = ''
  dropText.textContent = W.SAY_DROP
  status.textContent = W.SAY_LOCAL_NOTE
  showSample(state.sample >= 0 ? state.sample : IDS.length - 1)
}

fileInput.addEventListener('change', () => readFileLog(fileInput.files[0]))
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over') })
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => {
  e.preventDefault(); drop.classList.remove('is-over')
  readFileLog(e.dataTransfer?.files?.[0])
})

// --- drawing the result -----------------------------------------------------------------------
function show(text, source, slug, info) {
  const p = parseYosysLog(text)
  const s = smellsOf(p)
  const v = verdictOf(p, s)
  state.result = { p, s, v, source, slug }

  const head = h('div', { class: 'ss-verdict' },
    h('span', { class: `ss-word ${v.cls}` }, v.word),
    h('span', { class: 'ss-src' }, fmt(W.SAY_VERDICT_LINE, source, num(p.lines))))
  const meta = h('div', { class: 'ss-meta' },
    h('span', {}, p.version ? fmt(W.SAY_VERSION, p.version) : W.SAY_NO_VERSION),
    p.command ? h('code', {}, fmt(W.SAY_COMMAND, p.command)) : null)
  const extra = []
  if (v.key === 'unknown') extra.push(h('p', { class: 'ss-error' }, W.SAY_UNKNOWN_LINE))
  if (info?.refused?.text) extra.push(h('p', { class: 'ss-srcline' }, fmt(W.SAY_SOURCE_LINE, ''), h('code', {}, info.refused.text)))

  const cards = SMELLS.map((id, i) => {
    const sm = s[id] ?? { n: 0, values: [0], items: [] }
    const level = sm.n ? LEVEL_CLASS[LEVELS[i] ?? 0] : 'is-none'
    const items = sm.items.slice(0, LIST_MAX)
    const more = sm.items.length - items.length
    return h('article', { class: `ss-card ${level}` },
      h('div', { class: 'ss-card-head' },
        h('h3', {}, W.SAY_SMELL_NAMES?.[i] ?? id),
        h('span', { class: 'ss-count' }, sm.n ? fmt(W.SAY_SMELL_COUNT?.[i], ...sm.values) : W.SAY_NONE)),
      h('p', { class: 'ss-mean' }, W.SAY_SMELL_MEANINGS?.[i] ?? ''),
      items.length ? h('ul', { class: 'ss-items' }, items.map((t) => h('li', {}, h('code', {}, t))), more > 0 ? h('li', { class: 'ss-more' }, fmt(W.SAY_MORE, more)) : null) : null,
      h('p', { class: 'ss-pass' }, fmt(W.SAY_PASS_LABEL, W.SAY_SMELL_PASSES?.[i] ?? '')))
  })

  result.replaceChildren(head, meta, ...extra, h('div', { class: 'ss-grid' }, cards), cellsBlock(p.stat))
}

function cellsBlock(stat) {
  const box = h('section', { class: 'ss-cells' }, h('h2', { class: 'ss-h' }, W.SAY_CELLS_TITLE))
  if (!stat) { box.append(h('p', { class: 'ss-note' }, W.SAY_NO_STAT)); return box }
  box.append(h('p', { class: 'ss-total' }, stat.submodules
    ? fmt(W.SAY_CELLS_SUB, num(stat.total ?? 0), num(stat.submodules))
    : fmt(W.SAY_CELLS_TOTAL, num(stat.total ?? 0))))
  const groups = groupTotals(stat)
  const max = Math.max(1, ...groups.map((g) => g.n))
  box.append(h('div', { class: 'ss-bars' }, groups.map((g) =>
    h('div', { class: `ss-bar g-${g.id}` },
      h('span', { class: 'ss-bar-name' }, g.name),
      h('span', { class: 'ss-bar-track' }, h('span', { class: 'ss-bar-fill', style: `width:${Math.max(1, (100 * g.n) / max).toFixed(1)}%` })),
      h('span', { class: 'ss-bar-n' }, num(g.n))))))
  const types = Object.entries(stat.cells).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const gname = (g) => W.SAY_GROUP_NAMES?.[(W.SAY_GROUP_IDS || []).indexOf(g)] ?? g
  const table = h('table', { class: 'ss-table' },
    h('thead', {}, h('tr', {}, (W.SAY_COLS || []).map((c) => h('th', { scope: 'col' }, c)))),
    h('tbody', {}, types.map(([t, n]) => h('tr', {}, h('td', {}, h('code', {}, t)), h('td', {}, gname(groupOf(t))), h('td', {}, num(n))))))
  table.hidden = !state.cellsOpen
  const toggle = h('button', { class: 't27-btn', type: 'button', 'aria-pressed': String(state.cellsOpen) }, state.cellsOpen ? W.SAY_HIDE_CELLS : W.SAY_SHOW_CELLS)
  toggle.addEventListener('click', () => {
    state.cellsOpen = !state.cellsOpen
    table.hidden = !state.cellsOpen
    toggle.setAttribute('aria-pressed', String(state.cellsOpen))
    toggle.textContent = state.cellsOpen ? W.SAY_HIDE_CELLS : W.SAY_SHOW_CELLS
  })
  box.append(toggle, table)
  return box
}

// --- the PNG card, drawn from the result on screen ---------------------------------------------
function cssVar(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function savePng() {
  const r = state.result
  if (!r) return
  const Wd = W.K_CARD_W || 1200
  const Hd = W.K_CARD_H || 630
  const c = h('canvas', { width: String(Wd), height: String(Hd) })
  const g = c.getContext('2d')
  const col = {
    bg: cssVar('--w-bg', '#000'), green: cssVar('--w-green', '#00ff88'), gold: cssVar('--w-gold', '#ffd700'),
    red: cssVar('--w-red', '#ff4d6d'), text: cssVar('--w-text', '#e8fff7'), muted: cssVar('--w-muted', '#adc9c0'),
    subtle: cssVar('--w-subtle', '#8fa9a0'),
  }
  const mono = 'Menlo, ui-monospace, SFMono-Regular, monospace'
  const fit = (t, max, size, weight = '') => {
    let s = String(t)
    g.font = `${weight} ${size}px ${mono}`
    while (s.length > 1 && g.measureText(s).width > max) s = s.slice(0, -2) + '~'
    return s
  }
  g.fillStyle = col.bg; g.fillRect(0, 0, Wd, Hd)
  g.strokeStyle = 'rgba(0,255,136,0.35)'; g.lineWidth = 2; g.strokeRect(14, 14, Wd - 28, Hd - 28)
  g.textBaseline = 'alphabetic'
  g.fillStyle = col.green; g.fillText(fit(W.SAY_CARD_BRAND, Wd - 120, 20, '600'), 48, 64)

  const vcol = { 'is-good': col.green, 'is-bad': col.red, 'is-warn': col.gold }[r.v.cls] ?? col.text
  g.fillStyle = vcol; g.fillText(fit(r.v.word, Wd - 96, 64, '800'), 48, 140)
  g.fillStyle = col.muted; g.fillText(fit(fmt(W.SAY_VERDICT_LINE, r.source, num(r.p.lines)), Wd - 96, 22), 48, 178)
  g.fillStyle = col.subtle; g.fillText(fit(r.p.version ? fmt(W.SAY_VERSION, r.p.version) : W.SAY_NO_VERSION, Wd - 96, 18), 48, 206)

  let y = 254
  SMELLS.forEach((id, i) => {
    const sm = r.s[id]
    const lc = sm.n ? [col.subtle, col.gold, col.red][LEVELS[i] ?? 0] : col.subtle
    g.fillStyle = lc
    g.beginPath(); g.arc(58, y - 8, 7, 0, Math.PI * 2); g.fill()
    g.fillStyle = sm.n ? col.text : col.subtle
    g.fillText(fit(W.SAY_SMELL_NAMES?.[i] ?? id, 520, 24, sm.n ? '700' : ''), 80, y)
    g.fillStyle = lc
    g.fillText(fit(sm.n ? fmt(W.SAY_SMELL_COUNT?.[i], ...sm.values) : W.SAY_NONE, Wd - 700, 24, '700'), 620, y)
    y += 40
  })

  const groups = groupTotals(r.p.stat)
  const cells = r.p.stat
    ? fmt(W.SAY_CARD_CELLS, num((r.p.stat.total ?? 0) + (r.p.stat.submodules ?? 0)), groups.map((x) => `${num(x.n)} ${x.name}`).join(', '))
    : W.SAY_NO_STAT
  g.fillStyle = col.gold; g.fillText(fit(cells, Wd - 96, 20), 48, y + 14)
  g.fillStyle = col.subtle; g.fillText(fit(W.SAY_CARD_URL, Wd - 96, 18), 48, Hd - 44)

  const name = fmt(W.SAY_PNG_FILE, String(r.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'log')
  c.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = h('a', { href: url, download: name })
    document.body.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}

showSample(IDS.length - 1)
