// SPDX-License-Identifier: Apache-2.0
// resource-bars tool: what a placed design uses of the XC7A200T, one bar per resource.
// Every word on screen comes from window.T27_WIDGET (specs/widgets/resource-bars.t27, SAY_*);
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

const ROWS = W.K_ROWS || []
const state = { demo: null, used: null, label: '', cells: 0, sourceLine: '', commands: [], nextpnr: '', pkg: 0 }

// The counting rule of specs/widgets/resource-bars.t27 "HOW IT COUNTS", over [name, type, bel].
function count(cells) {
  const lut6 = new Set(), slices = new Set()
  const n = {}
  const starts = (t, list) => list.some((p) => t.startsWith(p))
  const used = Object.fromEntries(ROWS.map((r) => [r, 0]))
  for (const [, type, bel] of cells) {
    const [site, belName = ''] = String(bel).split('/')
    n[type] = (n[type] || 0) + 1
    if (type === 'SLICE_LUTX' || type === 'SLICE_FFX' || type === 'CARRY4') slices.add(site)
    if (type === 'SLICE_LUTX') lut6.add(site + '/' + belName[0])
    if (type === 'SLICE_FFX') used.FF++
    else if (type === 'CARRY4') used.CARRY4++
    else if (starts(type, W.K_BRAM36_PREFIX || [])) used.BRAM36++
    else if (starts(type, W.K_BRAM18_PREFIX || [])) used.BRAM18++
    else if (type.startsWith(W.K_DSP_PREFIX || 'DSP48')) used.DSP48++
    else if (type === 'PAD') used.IOB++
    else if ((W.K_BUFG_TYPES || []).includes(type)) used.BUFG++
  }
  used.LUT = lut6.size
  used.SLICE = slices.size
  const line = ['SLICE_LUTX', 'SLICE_FFX', 'CARRY4'].filter((t) => n[t]).map((t) => `${t} ${num(n[t])}`).join(', ')
  return { used, line }
}

// --- layout ---------------------------------------------------------------------------------
const status = h('p', { class: 'rb-status', role: 'status' }, W.SAY_LOADING)
const pkgBtns = (W.K_PACKAGES || []).map((p, i) =>
  h('button', { class: 't27-btn', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { state.pkg = i; render() } }, p))
const btnDemo = h('button', { class: 't27-btn', type: 'button', hidden: true, onclick: () => showDemo() }, W.SAY_DEMO)
const bars = h('div', { class: 'rb-bars' })
const nextpnrLine = h('p', { class: 'rb-note' })
const totalsNote = h('p', { class: 'rb-note' }, W.SAY_TOTALS_NOTE)
const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'rb-file' })
const drop = h('label', { class: 't27-drop rb-drop' }, fileInput, h('span', {}, W.SAY_DROP))
const how = h('details', { class: 'rb-how' })

root.append(
  h('div', { class: 'rb-bar' }, h('span', { class: 'rb-label' }, W.SAY_PACKAGE), pkgBtns, btnDemo),
  status, bars, nextpnrLine, totalsNote, drop, how,
)

function total(i) {
  if (i === W.K_IOB_ROW) return (W.K_PACKAGE_IOB || [])[state.pkg] ?? W.K_TOTALS[i]
  return (W.K_TOTALS || [])[i]
}

function pctText(u, t) {
  if (!t) return '-'
  const p = (100 * u) / t
  if (u === 0) return fmt(W.SAY_PCT, '0')
  return fmt(W.SAY_PCT, p >= 10 ? p.toFixed(1) : p >= 0.01 ? p.toFixed(2) : p.toPrecision(2))
}

function render() {
  pkgBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === state.pkg)))
  const used = state.used
  if (!used) return
  bars.replaceChildren(...ROWS.map((key, i) => {
    const u = used[key] || 0, t = total(i)
    const frac = t ? u / t : 0
    const over = frac > 1
    const fill = h('span', { class: 'rb-fill' + (over ? ' is-over' : frac >= 0.02 ? ' is-big' : '') })
    fill.style.width = u > 0 ? `max(${W.K_MIN_BAR_PX || 3}px, ${Math.min(100, frac * 100)}%)` : '0'
    return h('div', { class: 'rb-row', role: 'group', 'aria-label': `${W.SAY_ROW_NAMES?.[i] ?? key} ${fmt(W.SAY_USED_OF, num(u), num(t))}` },
      h('span', { class: 'rb-name' }, W.SAY_ROW_NAMES?.[i] ?? key, h('small', {}, W.SAY_ROW_NOTES?.[i] ?? '')),
      h('span', { class: 'rb-track' }, fill),
      h('span', { class: 'rb-num' }, fmt(W.SAY_USED_OF, num(u), num(t)), h('b', {}, pctText(u, t))))
  }))
  const li = ROWS.indexOf('LUT')
  status.textContent = fmt(W.SAY_SUMMARY, state.label, num(state.cells), pctText(used.LUT || 0, total(li)))
  nextpnrLine.textContent = state.nextpnr ? fmt(W.SAY_NEXTPNR_LINE, state.nextpnr) : ''
  how.hidden = !state.sourceLine
  how.replaceChildren(h('summary', {}, W.SAY_COMMANDS), h('p', {}, state.sourceLine),
    h('ul', {}, state.commands.map((c) => h('li', {}, h('code', {}, c)))))
}

function showDemo() {
  const d = state.demo
  if (!d) return
  const src = d.source || {}
  state.used = d.used
  state.label = src.top || ''
  state.cells = d.cells ?? Object.values(d.nextpnr_util || {}).reduce((a, v) => a + v[0], 0)
  state.nextpnr = Object.entries(d.nextpnr_util || {}).filter(([k]) => /^(SLICE_LUTX|SLICE_FFX|CARRY4)$/.test(k))
    .map(([k, v]) => `${k} ${num(v[0])}/${num(v[1])}`).join(', ')
  state.sourceLine = fmt(W.SAY_SOURCE_DEMO, src.design, src.part, src.nextpnr)
  state.commands = src.commands || []
  state.pkg = Math.max(0, (W.K_PACKAGES || []).findIndex((p) => String(src.part || '').includes(p)))
  btnDemo.hidden = true
  render()
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
  if (!file) return
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
  const { used, line } = count(cells)
  state.used = used
  state.cells = cells.length
  state.label = file.name
  state.nextpnr = line
  state.sourceLine = fmt(W.SAY_SOURCE_FILE, file.name, num(file.size), j.creator || '')
  state.commands = []
  btnDemo.hidden = false
  render()
}

fileInput.addEventListener('change', () => { takeFile(fileInput.files[0]); fileInput.value = '' })
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over') })
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); takeFile(e.dataTransfer?.files?.[0]) })
root.addEventListener('dragover', (e) => e.preventDefault())
root.addEventListener('drop', (e) => { if (e.defaultPrevented) return; e.preventDefault(); takeFile(e.dataTransfer?.files?.[0]) })

;(async () => {
  try {
    const r = await fetch(new URL(W.K_DATA_FILE || 'resources.json', import.meta.url))
    if (!r.ok) throw new Error(String(r.status))
    state.demo = await r.json()
    showDemo()
  } catch {
    status.textContent = W.SAY_ERR_DEMO
  }
})()
