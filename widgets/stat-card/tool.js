// SPDX-License-Identifier: Apache-2.0
// stat-card tool: yosys `stat -json` in, a 1200x630 card and a README badge SVG out, in the
// reader's browser. Every word on screen comes from window.T27_WIDGET (specs/widgets/stat-card.t27,
// SAY_*); the cell-type lists and sizes are K_*. A dropped or pasted file is read with File.text()
// and never leaves the page; the sample is a same-origin file written by scripts/widget-data/stat-card.mjs.
import { badgeSvg, listsOf, parseStat } from './statparse.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const num = (n) => Number(n ?? 0).toLocaleString('en-US')
const LISTS = listsOf(W)
const CW = W.K_CARD_W || 1200
const CH = W.K_CARD_H || 630
const MAX_CHARS = W.K_MAX_PASTE_CHARS || 4000000
const OTHER_MAX = W.K_CARD_OTHER_MAX || 9
const GROUPS = W.SAY_GROUP_IDS || []
const groupName = (g) => (g === 'other' ? W.SAY_OTHER : W.SAY_GROUP_NAMES?.[GROUPS.indexOf(g)] ?? g)

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

// The colours of the shared frame (public/widgets/widget.css), read once for the canvas.
const css = getComputedStyle(document.documentElement)
const C = Object.fromEntries(['bg', 'panel', 'line', 'green', 'gold', 'red', 'text', 'muted', 'subtle'].map((k) => [k, css.getPropertyValue(`--w-${k}`).trim() || '#888']))
const MONO = 'Menlo, ui-monospace, SFMono-Regular, monospace'

const state = { result: null, svg: '', badgeUrl: null }

// --- layout -----------------------------------------------------------------------------------
const sampleBtn = h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => showSample() }, W.SAY_SAMPLE_NAME)
const sampleLink = h('a', { class: 'sc-open', href: new URL(W.K_SAMPLE_STAT || 'sample.stat.json', import.meta.url).href, target: '_blank', rel: 'noopener' }, W.SAY_OPEN_SAMPLE)

const fileInput = h('input', { type: 'file', accept: '.json,.txt,application/json,text/plain', class: 'sc-file' })
const drop = h('label', { class: 't27-drop sc-drop' }, fileInput, h('span', {}, W.SAY_DROP))
const paste = h('textarea', { class: 'sc-paste', rows: '4', spellcheck: 'false', placeholder: W.SAY_PASTE_HINT, 'aria-label': W.SAY_PASTE_LABEL })
const readBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => readText(paste.value, W.SAY_PASTED) }, W.SAY_READ)
const clearBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => clearOwn() }, W.SAY_CLEAR)
const status = h('p', { class: 'sc-status', role: 'status' }, W.SAY_LOCAL_NOTE)

const canvas = h('canvas', { class: 'sc-canvas', width: String(CW), height: String(CH), role: 'img', 'aria-label': W.SAY_PREVIEW_ALT })
const pngBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => savePng() }, W.SAY_PNG_BUTTON)
const facts = h('div', { class: 'sc-facts' })

const badgeImg = h('img', { class: 'sc-badge-img', alt: '' })
const badgeText = h('textarea', { class: 'sc-badge-text', rows: '3', readonly: true, spellcheck: 'false', 'aria-label': W.SAY_BADGE_TEXT_LABEL })
const copyBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => copyBadge() }, W.SAY_BADGE_COPY)
const saveBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => saveBadge() }, W.SAY_BADGE_SAVE)

const result = h('section', { class: 'sc-result', 'aria-live': 'polite', hidden: true },
  h('div', { class: 'sc-card' }, canvas, h('div', { class: 'sc-btns' }, pngBtn)),
  facts,
  h('div', { class: 'sc-badge' },
    h('h2', { class: 'sc-h' }, W.SAY_BADGE_HEAD),
    h('div', { class: 'sc-badge-show' }, badgeImg),
    badgeText,
    h('div', { class: 'sc-btns' }, copyBtn, saveBtn),
    h('p', { class: 'sc-note' }, W.SAY_BADGE_NOTE)))

root.replaceChildren(h('div', { class: 'sc' },
  h('section', { class: 'sc-pick' },
    h('div', { class: 'sc-col' },
      h('h2', { class: 'sc-h' }, W.SAY_SAMPLE_LABEL),
      h('div', { class: 'sc-btns' }, sampleBtn),
      h('p', { class: 'sc-line' }, W.SAY_SAMPLE_LINE, ' ', sampleLink)),
    h('div', { class: 'sc-col' },
      h('h2', { class: 'sc-h' }, W.SAY_OWN_LABEL),
      h('p', { class: 'sc-how' }, h('code', {}, W.SAY_HOW)),
      drop, paste,
      h('div', { class: 'sc-btns' }, readBtn, clearBtn),
      status)),
  result,
  h('p', { class: 'sc-honest' }, W.SAY_HONEST)))

// --- the card, drawn on a 1200x630 canvas -------------------------------------------------------
function fitText(ctx, text, maxW) {
  let t = String(text)
  if (ctx.measureText(t).width <= maxW) return t
  while (t.length > 1 && ctx.measureText(t + '...').width > maxW) t = t.slice(0, -1)
  return t + '...'
}

/** Lines of "TYPE n" items, joined with two spaces, wrapped to maxW. */
function wrapItems(ctx, items, maxW, maxLines) {
  const lines = ['']
  for (const it of items) {
    const cur = lines[lines.length - 1]
    const next = cur ? `${cur}   ${it}` : it
    if (ctx.measureText(next).width <= maxW || !cur) lines[lines.length - 1] = next
    else if (lines.length < maxLines) lines.push(it)
    else { lines[lines.length - 1] = fitText(ctx, `${cur}   ${it}`, maxW); break }
  }
  return lines.filter(Boolean)
}

function drawCard(r) {
  const ctx = canvas.getContext('2d')
  const font = (px, bold) => `${bold ? 'bold ' : ''}${px}px ${MONO}`
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, CW, CH)
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  ctx.strokeRect(15, 15, CW - 30, CH - 30)
  ctx.textBaseline = 'alphabetic'

  ctx.textAlign = 'left'
  ctx.fillStyle = C.green
  ctx.font = font(20, true)
  ctx.fillText(W.SAY_CARD_BRAND, 40, 56)
  ctx.textAlign = 'right'
  ctx.fillStyle = C.subtle
  ctx.font = font(18)
  ctx.fillText(r.version ? fmt(W.SAY_VERSION, r.version) : W.SAY_NO_VERSION, CW - 40, 56)

  ctx.textAlign = 'left'
  ctx.fillStyle = C.muted
  ctx.font = font(18)
  ctx.fillText(r.top ? W.SAY_TOP : W.SAY_NO_TOP, 40, 104)
  ctx.fillStyle = C.gold
  ctx.font = font(46, true)
  ctx.fillText(fitText(ctx, r.top ?? '', CW - 80), 40, 156)
  ctx.fillStyle = C.red
  ctx.font = font(20, true)
  ctx.fillText(W.SAY_CARD_KIND, 40, 192)

  const gap = 20
  const tw = (CW - 80 - gap * 3) / 4
  GROUPS.forEach((g, i) => {
    const x = 40 + i * (tw + gap)
    const y = 218
    ctx.fillStyle = C.panel
    ctx.fillRect(x, y, tw, 210)
    ctx.strokeStyle = C.line
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, tw, 210)
    ctx.textAlign = 'left'
    ctx.fillStyle = C.green
    ctx.font = font(24, true)
    ctx.fillText(W.SAY_GROUP_NAMES?.[i] ?? g, x + 18, y + 40)
    const n = r.groups[g] ?? 0
    ctx.fillStyle = n ? C.text : C.subtle
    ctx.font = font(64, true)
    ctx.fillText(fitText(ctx, num(n), tw - 36), x + 18, y + 118)
    ctx.fillStyle = C.subtle
    ctx.font = font(14)
    ctx.fillText(fitText(ctx, W.SAY_GROUP_RULES?.[i] ?? '', tw - 36), x + 18, y + 150)
    const items = r.types.filter((t) => t.group === g).map((t) => `${t.type} ${num(t.n)}`)
    ctx.fillStyle = C.muted
    ctx.font = font(15)
    wrapItems(ctx, items, tw - 36, 2).forEach((line, k) => ctx.fillText(line, x + 18, y + 176 + k * 20))
  })

  const others = r.types.filter((t) => t.group === 'other').sort((a, b) => b.n - a.n)
  const shown = others.slice(0, OTHER_MAX).map((t) => `${t.type} ${num(t.n)}`)
  if (others.length > OTHER_MAX) shown.push(fmt(W.SAY_OTHER_MORE, others.length - OTHER_MAX))
  ctx.textAlign = 'left'
  ctx.fillStyle = C.green
  ctx.font = font(22, true)
  const head = `${W.SAY_OTHER} ${num(r.groups.other)}`
  ctx.fillText(head, 40, 474)
  const hx = 40 + ctx.measureText(head).width + 24
  ctx.fillStyle = C.muted
  ctx.font = font(18)
  const lines = shown.length ? wrapItems(ctx, shown, CW - 40 - hx, 2) : [W.SAY_OTHER_NONE]
  lines.forEach((line, k) => ctx.fillText(line, hx, 474 + k * 26))

  ctx.strokeStyle = C.line
  ctx.beginPath(); ctx.moveTo(40, 548); ctx.lineTo(CW - 40, 548); ctx.stroke()
  ctx.fillStyle = C.green
  ctx.font = font(20, true)
  ctx.fillText(W.SAY_CARD_URL, 40, 586)
  ctx.textAlign = 'right'
  ctx.fillStyle = C.subtle
  ctx.font = font(18)
  ctx.fillText(fmt(W.SAY_CELLS, num(r.cells)), CW - 40, 586)
}

// --- the facts under the card ------------------------------------------------------------------
function renderFacts(r) {
  const rows = r.types.filter((t) => t.group !== 'internal' && t.group !== 'hier')
  const order = [...GROUPS, 'other']
  rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || b.n - a.n)
  const list = (g) => r.types.filter((t) => t.group === g).map((t) => `${t.type} ${num(t.n)}`).join(', ')
  const head = W.SAY_TABLE_HEAD || []
  facts.replaceChildren(...[
    h('p', { class: 'sc-meta' }, fmt(W.SAY_SHAPE, r.key, W.SAY_FROM?.[r.from === 'design' ? 0 : 1] ?? r.from, r.modules)),
    r.groups.lut + r.groups.ff + r.groups.dsp + r.groups.bram === 0 ? h('p', { class: 'sc-warn' }, W.SAY_NO_XILINX) : null,
    h('div', { class: 'sc-table-wrap' },
      h('table', { class: 'sc-table' },
        h('thead', {}, h('tr', {}, head.map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, rows.map((t) => h('tr', { class: `is-${t.group}` }, h('td', {}, t.type), h('td', { class: 'sc-n' }, num(t.n)), h('td', {}, groupName(t.group))))))),
    h('p', { class: 'sc-note' }, W.SAY_OTHER_LINE),
    r.groups.internal ? h('p', { class: 'sc-note' }, fmt(W.SAY_INTERNAL, list('internal'))) : null,
    r.groups.hier ? h('p', { class: 'sc-note' }, fmt(W.SAY_HIER, list('hier'))) : null,
  ].filter(Boolean))
}

function renderBadge(r) {
  state.svg = badgeSvg(r, W)
  badgeText.value = state.svg
  if (state.badgeUrl) URL.revokeObjectURL(state.badgeUrl)
  state.badgeUrl = URL.createObjectURL(new Blob([state.svg], { type: 'image/svg+xml' }))
  badgeImg.src = state.badgeUrl
  badgeImg.alt = fmt(W.SAY_BADGE_VALUE, r.groups.lut, r.groups.ff, r.groups.dsp, r.groups.bram)
  copyBtn.textContent = W.SAY_BADGE_COPY
}

function show(r) {
  state.result = r
  result.hidden = false
  drawCard(r)
  renderFacts(r)
  renderBadge(r)
}

// --- reading ----------------------------------------------------------------------------------
function refuse(text) {
  status.textContent = text
  result.hidden = true
  sampleBtn.setAttribute('aria-pressed', 'false')
}

function errorText(code) {
  const i = (W.SAY_ERROR_IDS || []).indexOf(code)
  return W.SAY_ERROR_TEXT?.[i] ?? code
}

function readText(text, name) {
  if (text.length > MAX_CHARS) { refuse(fmt(W.SAY_TOO_BIG, num(text.length), num(MAX_CHARS))); return }
  const r = parseStat(text, LISTS)
  if (!r.ok) { refuse(errorText(r.error)); return }
  sampleBtn.setAttribute('aria-pressed', 'false')
  status.textContent = `${name}. ${W.SAY_LOCAL_NOTE}`
  show(r)
}

async function readFile(file) {
  if (!file) return
  try {
    status.textContent = fmt(W.SAY_PICKED, file.name, num(file.size))
    if (file.size > MAX_CHARS) { refuse(fmt(W.SAY_TOO_BIG, num(file.size), num(MAX_CHARS))); return }
    readText(await file.text(), fmt(W.SAY_PICKED, file.name, num(file.size)))
  } catch {
    refuse(fmt(W.SAY_ERR_READ, file.name))
  }
}

async function showSample() {
  try {
    const res = await fetch(new URL(W.K_SAMPLE_STAT || 'sample.stat.json', import.meta.url))
    if (!res.ok) throw new Error(String(res.status))
    const r = parseStat(await res.text(), LISTS)
    if (!r.ok) throw new Error(r.error)
    sampleBtn.setAttribute('aria-pressed', 'true')
    status.textContent = W.SAY_LOCAL_NOTE
    show(r)
  } catch {
    status.textContent = W.SAY_ERR_LOAD
  }
}

function clearOwn() {
  paste.value = ''
  fileInput.value = ''
  status.textContent = W.SAY_LOCAL_NOTE
  showSample()
}

fileInput.addEventListener('change', () => readFile(fileInput.files?.[0]))
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over') })
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); readFile(e.dataTransfer?.files?.[0]) })

// --- saving -----------------------------------------------------------------------------------
const slug = (s) => String(s ?? '').replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 60) || 'design'

function download(url, name) {
  const a = h('a', { href: url, download: name })
  document.body.append(a)
  a.click()
  a.remove()
}

function savePng() {
  if (!state.result) return
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    download(url, fmt(W.SAY_PNG_FILE, slug(state.result.top)))
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}

async function copyBadge() {
  if (!state.svg) return
  try { await navigator.clipboard.writeText(state.svg) } catch { badgeText.select(); document.execCommand?.('copy') }
  copyBtn.textContent = W.SAY_BADGE_COPIED
  setTimeout(() => { copyBtn.textContent = W.SAY_BADGE_COPY }, 1500)
}

function saveBadge() {
  if (!state.svg || !state.badgeUrl) return
  download(state.badgeUrl, fmt(W.SAY_BADGE_FILE, slug(state.result?.top)))
}

showSample()
