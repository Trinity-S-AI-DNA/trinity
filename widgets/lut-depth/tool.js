// SPDX-License-Identifier: Apache-2.0
// lut-depth tool: what yosys `ltp` printed in, the longest path drawn as a staircase out, one step
// per cell, in the reader's browser. Every word on screen comes from window.T27_WIDGET
// (specs/widgets/lut-depth.t27, SAY_*); the cell-type lists are K_*. A dropped or pasted text is read
// with File.text() and never leaves the page; the sample is a same-origin file written by
// scripts/widget-data/lut-depth.mjs. No delay, no Fmax: the page counts cells, as ltp does.
import { listsOf, parseLtp } from './ltpparse.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const num = (n) => Number(n ?? 0).toLocaleString('en-US')
const LISTS = listsOf(W)
const MAX_CHARS = W.K_MAX_CHARS || 16000000
const SAMPLE = new URL(W.K_SAMPLE_LOG || 'sample.ltp.txt', import.meta.url)
const CLASS_IDS = W.SAY_CLASS_IDS || []
const className = (c) => W.SAY_CLASS_NAMES?.[CLASS_IDS.indexOf(c)] ?? c
// The order of the legend: what the path is made of, the clocked cells that should not be on it last.
const LEGEND = ['lut', 'carry', 'mux', 'io', 'other', 'unknown', 'clocked']

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

const state = { r: null, pick: 0 }

// --- layout -----------------------------------------------------------------------------------
const sampleBtn = h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => showSample() }, W.SAY_SAMPLE_NAME)
const sampleLink = h('a', { class: 'ld-open', href: SAMPLE.href, target: '_blank', rel: 'noopener' }, W.SAY_OPEN_SAMPLE)

const fileInput = h('input', { type: 'file', accept: '.txt,.log,text/plain', class: 'ld-file' })
const drop = h('label', { class: 't27-drop ld-drop' }, fileInput, h('span', {}, W.SAY_DROP))
const paste = h('textarea', { class: 'ld-paste', rows: '4', spellcheck: 'false', placeholder: W.SAY_PASTE_HINT, 'aria-label': W.SAY_PASTE_LABEL })
const readBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => readText(paste.value, W.SAY_PASTED) }, W.SAY_READ)
const clearBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => clearOwn() }, W.SAY_CLEAR)
const status = h('p', { class: 'ld-status', role: 'status' }, W.SAY_LOCAL_NOTE)

const blocksBox = h('div', { class: 'ld-blocks', hidden: true })
const head = h('div', { class: 'ld-head' })
const warns = h('div', { class: 'ld-warns' })
const legend = h('ul', { class: 'ld-legend' })
const stairs = h('div', { class: 'ld-stairs', role: 'img', 'aria-label': W.SAY_STAIRS_LABEL })
const ends = h('p', { class: 'ld-ends' })
const tableBody = h('tbody')

const result = h('section', { class: 'ld-result', 'aria-live': 'polite', hidden: true },
  blocksBox,
  head,
  h('p', { class: 'ld-notns' }, W.SAY_NOT_NS),
  warns,
  h('div', { class: 'ld-stairs-box' },
    h('h2', { class: 'ld-h' }, W.SAY_STAIRS_HEAD),
    legend, stairs, ends),
  h('details', { class: 'ld-details' },
    h('summary', {}, W.SAY_TABLE_SUMMARY),
    h('div', { class: 'ld-table-wrap' },
      h('table', { class: 'ld-table' },
        h('thead', {}, h('tr', {}, (W.SAY_TABLE_HEAD || []).map((t) => h('th', { scope: 'col' }, t)))),
        tableBody))))

root.replaceChildren(h('div', { class: 'ld' },
  h('section', { class: 'ld-pick' },
    h('div', { class: 'ld-col' },
      h('h2', { class: 'ld-h' }, W.SAY_SAMPLE_LABEL),
      h('div', { class: 'ld-btns' }, sampleBtn),
      h('p', { class: 'ld-line' }, W.SAY_SAMPLE_LINE, ' ', sampleLink)),
    h('div', { class: 'ld-col' },
      h('h2', { class: 'ld-h' }, W.SAY_OWN_LABEL),
      h('p', { class: 'ld-line' }, W.SAY_HOW_HEAD),
      h('pre', { class: 'ld-how' }, (W.SAY_HOW || []).join('\n')),
      h('p', { class: 'ld-note' }, W.SAY_HOW_NOTE),
      drop, paste,
      h('div', { class: 'ld-btns' }, readBtn, clearBtn),
      status)),
  result,
  h('p', { class: 'ld-honest' }, W.SAY_HONEST)))

// --- drawing one path block -------------------------------------------------------------------
function renderBlocks(r) {
  blocksBox.hidden = r.blocks.length < 2
  if (r.blocks.length < 2) { blocksBox.replaceChildren(); return }
  blocksBox.replaceChildren(
    h('h2', { class: 'ld-h' }, W.SAY_BLOCKS_HEAD),
    h('div', { class: 'ld-btns' }, r.blocks.map((b, i) => h('button', {
      class: 't27-btn', type: 'button', 'aria-pressed': String(i === state.pick),
      onclick: () => { state.pick = i; render(); blocksBox.querySelectorAll('button')[i]?.focus() },
    }, fmt(W.SAY_BLOCK_NAME, i + 1, b.command ?? b.module, num(b.length))))))
}

function renderHead(r, b) {
  const lutBox = r.typed
    ? h('div', { class: 'ld-big ld-big-lut' }, h('span', { class: 'ld-num' }, num(b.counts.lut)), h('span', { class: 'ld-label' }, W.SAY_LUT_LABEL))
    : h('div', { class: 'ld-big ld-big-lut' }, h('span', { class: 'ld-label' }, W.SAY_LUT_UNKNOWN))
  head.replaceChildren(
    h('div', { class: 'ld-bigs' },
      h('div', { class: 'ld-big' }, h('span', { class: 'ld-num ld-num-main' }, num(b.length)), h('span', { class: 'ld-label' }, W.SAY_LENGTH_LABEL)),
      lutBox),
    h('p', { class: 'ld-meta' }, fmt(W.SAY_MODULE, b.module, b.command ?? W.SAY_NO_COMMAND)))
}

function renderWarns(r, b) {
  const out = []
  if (b.counts.clocked) {
    const types = [...new Set(b.steps.filter((s) => s.cls === 'clocked').map((s) => s.type))].join(', ')
    out.push(h('p', { class: 'ld-warn is-red' }, fmt(W.SAY_CLOCKED_WARN, num(b.counts.clocked), types)))
  }
  if (!r.typed) out.push(h('p', { class: 'ld-warn' }, W.SAY_UNTYPED))
  else if (b.counts.unknown) out.push(h('p', { class: 'ld-warn' }, fmt(W.SAY_MISSING_TYPES, num(b.counts.unknown))))
  if (b.printed !== b.length + 1) out.push(h('p', { class: 'ld-warn' }, fmt(W.SAY_INCOMPLETE, num(b.printed), num(b.length + 1))))
  if (r.loops.length) out.push(h('p', { class: 'ld-warn' }, fmt(W.SAY_LOOPS, num(r.loops.length), r.loops[0].bit)))
  warns.replaceChildren(...out)
}

function renderLegend(b) {
  legend.replaceChildren(...LEGEND.filter((c) => b.counts[c]).map((c) =>
    h('li', { class: `is-${c}` }, h('span', { class: 'ld-swatch' }), `${className(c)} ${num(b.counts[c])}`)))
}

/** One row per cell: the block steps one width to the right per cell, so the path reads as a stair. */
function renderStairs(b) {
  const cells = b.steps.filter((s) => s.via)
  const n = Math.max(cells.length, 1)
  stairs.style.setProperty('--ld-n', String(n))
  stairs.replaceChildren(...cells.map((s, k) => {
    const label = s.type ?? s.via
    const right = k >= n / 2
    return h('div', { class: `ld-step is-${s.cls}`, style: `--ld-k:${k}` },
      h('span', { class: 'ld-i' }, String(s.i)),
      h('span', { class: 'ld-track' },
        h('span', { class: 'ld-block' }),
        h('span', { class: `ld-type${right ? ' is-left' : ''}`, title: s.via }, label)))
  }))
  const first = b.steps[0]
  const last = b.steps[b.steps.length - 1]
  ends.replaceChildren(...[
    first ? h('span', {}, fmt(W.SAY_START, first.bit)) : null,
    last && last !== first ? h('span', {}, fmt(W.SAY_END, last.bit)) : null,
  ].filter(Boolean))
}

function renderTable(b) {
  tableBody.replaceChildren(...b.steps.map((s) => h('tr', { class: `is-${s.cls}` },
    h('td', { class: 'ld-n' }, String(s.i)),
    h('td', {}, s.via ? (s.type ?? className('unknown')) : className('start')),
    h('td', { class: 'ld-name' }, s.via ?? ''),
    h('td', { class: 'ld-name' }, s.bit))))
}

function render() {
  const r = state.r
  if (!r) return
  const b = r.blocks[state.pick]
  result.hidden = false
  renderBlocks(r)
  renderHead(r, b)
  renderWarns(r, b)
  renderLegend(b)
  renderStairs(b)
  renderTable(b)
}

function show(r) {
  state.r = r
  state.pick = r.blocks.length - 1
  render()
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
  const r = parseLtp(text, LISTS)
  if (!r.ok) {
    refuse(r.error === 'loop' && r.loops?.length ? `${errorText('loop')} ${fmt(W.SAY_LOOP_AT, r.loops[0].bit, r.loops[0].module)}` : errorText(r.error))
    return
  }
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
    const res = await fetch(SAMPLE)
    if (!res.ok) throw new Error(String(res.status))
    const r = parseLtp(await res.text(), LISTS)
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

showSample()
