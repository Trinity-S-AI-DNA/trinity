// SPDX-License-Identifier: Apache-2.0
// vcd-wrapped tool: your simulation, wrapped -- a summary card for a VCD file, read in the browser.
// Every word on screen comes from window.T27_WIDGET (specs/widgets/vcd-wrapped.t27, SAY_*); the
// numbers it relies on are K_*. A dropped file is read in chunks (File.stream, or Blob.slice where
// there is no stream) by vcdstats.js and never leaves the page; the three samples are same-origin
// files written by scripts/widget-data/vcd-wrapped.mjs.
import { VcdError, createVcdReader, spanUnits } from './vcdstats.js'

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
const LIST_MAX = W.K_LIST_MAX || 5
const SLICE = W.K_SLICE_BYTES || 4194304
const MAX_HEADER = W.K_MAX_HEADER_CHARS || 67108864
const state = { meta: null, sample: -1, result: null, run: 0 }

const spanText = (s) => {
  const [v, u] = spanUnits(s.span, s.timescale)
  return u < 0 ? `${num(v)} ${W.SAY_NO_TIMESCALE ?? ''}` : `${v} ${W.SAY_UNITS?.[u] ?? ''}`
}

// --- layout -----------------------------------------------------------------------------------
const sampleBtns = IDS.map((id, i) =>
  h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => showSample(i) }, W.SAY_SAMPLE_NAMES?.[i] ?? id))
const sampleLine = h('p', { class: 'vw-line' })
const sampleVerdict = h('p', { class: 'vw-verdict' })
const sampleNote = h('p', { class: 'vw-note' })

const fileInput = h('input', { type: 'file', accept: '.vcd,text/plain', class: 'vw-file', 'aria-label': W.SAY_PICK })
const dropText = h('span', {}, W.SAY_DROP)
const drop = h('label', { class: 't27-drop vw-drop' }, fileInput, dropText)
const status = h('p', { class: 'vw-status', role: 'status' }, W.SAY_LOCAL_NOTE)

const result = h('section', { class: 'vw-result', 'aria-live': 'polite' })
const pngBtn = h('button', { class: 't27-btn vw-png', type: 'button', onclick: () => savePng() }, W.SAY_PNG_BUTTON)
const honest = h('p', { class: 'vw-honest' }, W.SAY_HONEST)

root.replaceChildren(h('div', { class: 'vw' },
  h('section', { class: 'vw-pick' },
    h('div', { class: 'vw-col' },
      h('h2', { class: 'vw-h' }, W.SAY_SAMPLES_LABEL),
      h('div', { class: 'vw-btns' }, sampleBtns),
      sampleLine, sampleVerdict, sampleNote),
    h('div', { class: 'vw-col' },
      h('h2', { class: 'vw-h' }, W.SAY_OWN_LABEL),
      drop, status)),
  result,
  h('div', { class: 'vw-foot' }, pngBtn, honest),
  h('p', { class: 'vw-rules' }, W.SAY_RULES)))

// --- reading ----------------------------------------------------------------------------------
function errorWords(e) {
  if (!(e instanceof VcdError)) return null
  const i = (W.SAY_ERR_CODES || []).indexOf(e.code)
  if (i < 0) return e.code
  const d = e.detail || {}
  return fmt(W.SAY_ERR_WORDS?.[i], d.token ?? d.text ?? '', d.time === null || d.time === undefined ? '-' : num(d.time))
}

/** Reads a Blob in chunks into the VCD reader; onProgress(fraction). Returns the summary. */
async function readBlob(blob, run, onProgress) {
  const reader = createVcdReader({ maxHeaderChars: MAX_HEADER })
  const dec = new TextDecoder('utf-8')
  let done = 0
  const step = (bytes) => {
    reader.push(dec.decode(bytes, { stream: true }))
    done += bytes.byteLength
    onProgress(blob.size ? done / blob.size : 1)
  }
  if (typeof blob.stream === 'function') {
    const rd = blob.stream().getReader()
    for (;;) {
      const { value, done: end } = await rd.read()
      if (end) break
      if (run !== state.run) { rd.cancel(); return null }
      step(value)
    }
  } else {
    for (let at = 0; at < blob.size; at += SLICE) {
      const buf = new Uint8Array(await blob.slice(at, at + SLICE).arrayBuffer())
      if (run !== state.run) return null
      step(buf)
    }
  }
  reader.push(dec.decode())
  return reader.end()
}

async function loadMeta() {
  if (state.meta) return state.meta
  const r = await fetch(new URL(W.K_SAMPLES_JSON || 'samples.json', import.meta.url))
  if (!r.ok) throw new Error(String(r.status))
  state.meta = await r.json()
  return state.meta
}

async function showSample(i) {
  const run = ++state.run
  state.sample = i
  sampleBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)))
  sampleLine.textContent = W.SAY_SAMPLE_LINES?.[i] ?? ''
  sampleVerdict.textContent = ''
  sampleNote.textContent = ''
  fileInput.value = ''
  dropText.textContent = W.SAY_DROP
  status.textContent = W.SAY_LOCAL_NOTE
  try {
    const meta = await loadMeta()
    const info = meta.samples?.find((s) => s.id === IDS[i]) ?? null
    const r = await fetch(new URL(info?.vcd ?? `samples/${IDS[i]}.vcd`, import.meta.url))
    if (!r.ok) throw new Error(String(r.status))
    const blob = await r.blob()
    const s = await readBlob(blob, run, () => {})
    if (!s || run !== state.run) return
    if (info) {
      sampleVerdict.textContent = fmt(W.SAY_SAMPLE_VERDICT, info.verdict.pass, info.verdict.total)
      sampleVerdict.className = `vw-verdict ${info.verdict.pass === info.verdict.total ? 'is-good' : 'is-bad'}`
      sampleNote.textContent = fmt(W.SAY_SAMPLE_NOTE, num(info.vcd_bytes))
    }
    show(s, W.SAY_SAMPLE_NAMES?.[i] ?? IDS[i], IDS[i])
  } catch {
    if (run === state.run) result.replaceChildren(h('p', { class: 'vw-error' }, W.SAY_ERR_LOAD))
  }
}

async function readOwn(f) {
  if (!f) return
  const run = ++state.run
  state.sample = -1
  sampleBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'))
  sampleLine.textContent = ''
  sampleVerdict.textContent = ''
  sampleNote.textContent = ''
  dropText.textContent = fmt(W.SAY_PICKED, f.name, num(f.size))
  let shown = -1
  try {
    const s = await readBlob(f, run, (p) => {
      const pct = Math.floor(p * 100)
      if (pct !== shown) { shown = pct; status.textContent = fmt(W.SAY_READING, f.name, pct) }
    })
    if (!s || run !== state.run) return
    status.textContent = W.SAY_LOCAL_NOTE
    show(s, f.name, f.name.replace(/\.[^.]*$/, ''))
  } catch (e) {
    if (run !== state.run) return
    state.result = null
    pngBtn.disabled = true
    const words = errorWords(e)
    status.textContent = W.SAY_LOCAL_NOTE
    result.replaceChildren(h('p', { class: 'vw-error' }, words ?? fmt(W.SAY_ERR_READ, f.name)))
  }
}

fileInput.addEventListener('change', () => readOwn(fileInput.files[0]))
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over') })
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => {
  e.preventDefault(); drop.classList.remove('is-over')
  readOwn(e.dataTransfer?.files?.[0])
})

// --- the wrapped card on screen ---------------------------------------------------------------
function rowsList(title, rows, total, cls, withBars) {
  const most = Math.max(1, ...rows.map((r) => r.changes))
  const items = rows.map((r) => h('li', { class: 'vw-row' },
    h('div', { class: 'vw-row-head' },
      h('code', { class: 'vw-name', title: r.name }, r.name),
      h('span', { class: 'vw-n' }, fmt(W.SAY_ROW, num(r.changes), num(r.flips)))),
    withBars ? h('span', { class: 'vw-track' }, h('span', { class: 'vw-fill', style: `width:${Math.max(1, (100 * r.changes) / most).toFixed(1)}%` })) : null,
    h('span', { class: 'vw-sub' }, r.width === 1 ? W.SAY_WIDTH_ONE : fmt(W.SAY_WIDTH, num(r.width)), r.aliases ? ` / ${r.aliases === 1 ? W.SAY_ALIASES_ONE : fmt(W.SAY_ALIASES, num(r.aliases))}` : '')))
  const more = total - rows.length
  return h('section', { class: `vw-list ${cls}` },
    h('h3', {}, title),
    rows.length ? h('ul', {}, items, more > 0 ? h('li', { class: 'vw-more' }, fmt(W.SAY_MORE, num(more))) : null) : h('p', { class: 'vw-none' }, W.SAY_NONE))
}

function namesList(title, names, total, cls) {
  const more = total - names.length
  return h('section', { class: `vw-list ${cls}` },
    h('h3', {}, title),
    names.length
      ? h('ul', {}, names.map((n) => h('li', {}, h('code', { class: 'vw-name', title: n }, n))), more > 0 ? h('li', { class: 'vw-more' }, fmt(W.SAY_MORE, num(more))) : null)
      : h('p', { class: 'vw-none' }, W.SAY_NONE))
}

function show(s, source, slug) {
  state.result = { s, source, slug }
  pngBtn.disabled = false
  const [before, after] = String(W.SAY_HEADLINE ?? '{0}').split('{0}')
  const top = s.busiest[0]
  const titles = W.SAY_LIST_TITLES || []
  const tiles = [s.flips, s.signals, s.scopes, s.stamps, s.stuck_xz, s.ends_xz]
  const lead = h('div', { class: 'vw-lead' },
    h('p', { class: 'vw-kicker' }, W.SAY_KICKER),
    h('p', { class: 'vw-big' }, before ?? '', h('strong', {}, num(s.changes)), h('span', {}, after ?? '')),
    h('p', { class: 'vw-subhead' }, fmt(W.SAY_SUBHEAD, spanText(s))),
    h('p', { class: 'vw-busiest' }, top ? fmt(W.SAY_BUSIEST_LINE, top.name, num(top.changes)) : W.SAY_NO_MOVERS),
    h('p', { class: 'vw-src' }, source))
  const grid = h('div', { class: 'vw-tiles' }, tiles.map((v, i) =>
    h('div', { class: `vw-tile${i >= 4 && v > 0 ? ' is-bad' : ''}` },
      h('strong', {}, num(v)),
      h('span', {}, W.SAY_TILE_NAMES?.[i] ?? ''))))
  const lists = h('div', { class: 'vw-lists' },
    rowsList(titles[0], s.busiest.slice(0, LIST_MAX), s.movers, 'is-busy', true),
    rowsList(titles[1], s.quietest.slice(0, LIST_MAX), s.movers, 'is-quiet', false),
    namesList(titles[2], s.stuck_xz_names.slice(0, LIST_MAX), s.stuck_xz, s.stuck_xz ? 'is-bad' : ''),
    namesList(titles[3], s.ends_xz_names.slice(0, LIST_MAX), s.ends_xz, s.ends_xz ? 'is-warn' : ''))
  const ts = s.timescale ? fmt(W.SAY_TIMESCALE, s.timescale.mul, s.timescale.unit) : W.SAY_NO_TIMESCALE
  const meta = h('div', { class: 'vw-meta' },
    h('span', {}, fmt(W.SAY_NEVER_LINE, num(s.never_changed), num(s.signals - s.params))),
    h('span', {}, fmt(W.SAY_VARS_LINE, num(s.vars), num(s.signals))),
    s.params ? h('span', {}, fmt(W.SAY_PARAMS_LINE, num(s.params))) : null,
    h('span', {}, ts),
    s.version ? h('span', {}, fmt(W.SAY_VERSION, s.version)) : null)
  result.replaceChildren(h('div', { class: 'vw-top' }, lead, grid), lists, meta)
}

// --- the PNG card: the same layout scripts/widget-data/vcd-wrapped-card.py draws -----------------
function cssVar(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function savePng() {
  const r = state.result
  if (!r) return
  const { s } = r
  const Wd = W.K_CARD_W || 1200
  const Hd = W.K_CARD_H || 630
  const c = h('canvas', { width: String(Wd), height: String(Hd) })
  const g = c.getContext('2d')
  const col = {
    bg: cssVar('--w-bg', '#000'), green: cssVar('--w-green', '#00ff88'), gold: cssVar('--w-gold', '#ffd700'),
    red: cssVar('--w-red', '#ff4d6d'), text: cssVar('--w-text', '#e8fff7'), muted: cssVar('--w-muted', '#adc9c0'),
    subtle: cssVar('--w-subtle', '#8fa9a0'), line: 'rgb(0,70,40)', track: 'rgb(0,32,20)',
  }
  const mono = 'Menlo, ui-monospace, SFMono-Regular, monospace'
  const font = (size, bold) => { g.font = `${bold ? 'bold ' : ''}${size}px ${mono}` }
  const text = (t, x, y, color, align = 'left', base = 'alphabetic') => {
    g.fillStyle = color; g.textAlign = align; g.textBaseline = base; g.fillText(t, x, y)
  }
  // cut from the left, so the leaf of a hierarchical name stays
  const fit = (t, room) => {
    let v = String(t)
    if (g.measureText(v).width <= room) return v
    while (v.length > 1 && g.measureText(`...${v}`).width > room) v = v.slice(1)
    return `...${v}`
  }
  const wrap = (t, room) => {
    const lines = []
    let cur = ''
    for (const w of String(t).split(' ')) {
      const next = cur ? `${cur} ${w}` : w
      if (g.measureText(next).width > room && cur) { lines.push(cur); cur = w } else cur = next
    }
    if (cur) lines.push(cur)
    return lines
  }

  g.fillStyle = col.bg; g.fillRect(0, 0, Wd, Hd)
  // brand row
  g.fillStyle = col.green
  g.beginPath(); g.moveTo(48, 40); g.lineTo(66, 40); g.lineTo(57, 55); g.closePath(); g.fill()
  font(20, true); text(W.SAY_CARD_BRAND ?? '', 78, 47, col.green, 'left', 'middle')
  font(17); text(String(W.SAY_CARD_URL ?? '').split(' ')[0], Wd - 48, 47, col.subtle, 'right', 'middle')

  // left: the headline
  font(26, true); text(W.SAY_KICKER ?? '', 48, 98, col.gold)
  const [before, after] = String(W.SAY_HEADLINE ?? '{0}').split('{0}')
  let big = 124
  font(big, true)
  while (big > 48 && g.measureText((before ?? '') + num(s.changes)).width > 600) { big -= 4; font(big, true) }
  text((before ?? '') + num(s.changes), 44, 238, col.green)
  font(36, true); text(String(after ?? '').trim(), 48, 288, col.text)
  font(22); text(fit(fmt(W.SAY_SUBHEAD, spanText(s)), 600), 48, 330, col.muted)
  const top = s.busiest[0]
  font(22, true)
  let y = 384
  for (const ln of wrap(top ? fmt(W.SAY_BUSIEST_LINE, top.name, num(top.changes)) : W.SAY_NO_MOVERS, 600).slice(0, 2)) {
    text(fit(ln, 600), 48, y, col.text); y += 32
  }

  // right: busiest nets as bars, then the names that never left X or Z
  const x0 = 700
  const x1 = Wd - 48
  g.fillStyle = col.line; g.fillRect(x0 - 28, 80, 1, 366)
  font(20, true); text(W.SAY_LIST_TITLES?.[0] ?? '', x0, 98, col.gold)
  const rows = s.busiest.slice(0, 5)
  const most = Math.max(1, ...rows.map((x) => x.changes))
  y = 128
  for (const row of rows) {
    font(18, true)
    const cnt = num(row.changes)
    const room = x1 - x0 - g.measureText(cnt).width - 12
    text(fit(row.name, room), x0, y, col.text)
    text(cnt, x1, y, col.green, 'right')
    g.fillStyle = col.track; g.fillRect(x0, y + 8, x1 - x0, 6)
    g.fillStyle = col.green; g.fillRect(x0, y + 8, Math.max(3, ((x1 - x0) * row.changes) / most), 6)
    y += 46
  }
  y += 8
  font(18, true); text(W.SAY_LIST_TITLES?.[2] ?? '', x0, y, s.stuck_xz ? col.red : col.subtle)
  y += 26
  font(16)
  const names = s.stuck_xz_names.slice(0, 3)
  for (const n of names) { text(fit(n, x1 - x0), x0, y, col.muted); y += 22 }
  const rest = s.stuck_xz - names.length
  if (rest > 0) text(fmt(W.SAY_MORE, num(rest)), x0, y, col.subtle)
  else if (!names.length) text(W.SAY_NONE ?? '', x0, y, col.subtle)

  // tiles
  const vals = [s.flips, s.signals, s.scopes, s.stamps, s.stuck_xz, s.ends_xz]
  const gap = 12
  const tw = (Wd - 96 - gap * (vals.length - 1)) / vals.length
  const ty = 470
  vals.forEach((v, i) => {
    const tx = 48 + i * (tw + gap)
    const bad = i >= 4 && v > 0
    g.strokeStyle = bad ? col.red : col.line; g.lineWidth = 2; g.strokeRect(tx + 1, ty + 1, tw - 2, 90)
    font(38, true); text(fit(num(v), tw - 24), tx + 16, ty + 50, bad ? col.red : col.green)
    font(15); text(fit(W.SAY_TILE_NAMES?.[i] ?? '', tw - 24), tx + 16, ty + 76, col.muted)
  })

  // footer
  font(16, true)
  const drop = String(W.SAY_DROP ?? '')
  const dropW = g.measureText(drop).width
  text(drop, Wd - 48, Hd - 30, col.gold, 'right', 'middle')
  font(16)
  const foot = r.source + (s.version ? `  |  ${fmt(W.SAY_VERSION, s.version)}` : '')
  text(fit(foot, Wd - 96 - dropW - 24), 48, Hd - 30, col.subtle, 'left', 'middle')

  const name = fmt(W.SAY_PNG_FILE, String(r.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'vcd')
  c.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = h('a', { href: url, download: name })
    document.body.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}

pngBtn.disabled = true
const first = IDS.indexOf(W.K_CARD_SAMPLE)
showSample(first >= 0 ? first : 0)
