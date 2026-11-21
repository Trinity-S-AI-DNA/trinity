// SPDX-License-Identifier: Apache-2.0
// slack-waterfall tool: every timing endpoint of a routed design, worst slack first, each drawn as a
// waterfall of clock-to-Q, logic, routing and setup against the clock period.
// Every word on screen comes from window.T27_WIDGET (specs/widgets/slack-waterfall.t27, SAY_*);
// the numbers it relies on are K_*. A dropped file is read with FileReader and never leaves the page.

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const num = (n) => Number(n).toLocaleString('en-US')
const PS = W.K_PS_PER_NS || 1000
const ns = (ps, d = 3) => (ps / PS).toFixed(d)
const signed = (ps) => (ps >= 0 ? '+' : '') + ns(ps)

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

const TYPES = W.K_SEG_TYPES || []
const COLORS = W.K_SEG_COLORS || []
const colorOf = (kind) => COLORS[TYPES.indexOf(kind)] || W.K_SEG_COLORS?.[2] || '#ffd700'
const FAIL = W.K_FAIL_COLOR || '#ff4d6d'
const SLACK = W.K_SLACK_COLOR || '#002e1c'

// Normalised data: { label, periodPs|null, fmax: [[clock, achieved, constraint]], paths: [{ to, slack|null,
// total, routing, segs: [{ kind, ps, from, to, net }] }], check|null, source|null, note }
const state = { demo: null, data: null, pick: 0, full: true }

// --- readers --------------------------------------------------------------------------------
function fromOwn(j, label) {
  const s = j.strings || []
  const str = (i) => (i >= 0 ? String(s[i] ?? '') : '')
  const paths = (j.paths || []).map((p) => {
    const segs = (p.segs || []).map(([kind, ps, f, fp, t, tp, net]) =>
      ({ kind, ps, from: `${str(f)}.${fp}`, to: `${str(t)}.${tp}`, net: str(net) }))
    return finish({ to: `${str(p.to)}.${p.pin}`, slack: p.slack ?? null, segs })
  })
  return {
    label, periodPs: j.period_ps || null, paths: sortPaths(paths), check: j.check || null, source: j.source || null,
    fmax: Object.entries(j.fmax || {}).map(([k, v]) => [k, v.achieved, v.constraint]), note: '',
  }
}

// Mainline nextpnr --report: critical_paths[] of { from, to, path: [{ type, from: {cell, port}, to, delay (ns), net }] }.
function fromReport(j, label) {
  const fmax = Object.entries(j.fmax || {}).map(([k, v]) => [k, v?.achieved, v?.constraint])
  const cons = Object.fromEntries(fmax.map(([k, , c]) => [k, c]))
  const one = fmax.length === 1 ? fmax[0][2] : null
  const periods = new Set()
  const paths = (j.critical_paths || []).map((cp) => {
    const segs = (cp.path || []).map((g) => ({
      kind: String(g.type || ''), ps: Math.round(Number(g.delay || 0) * PS),
      from: g.from ? `${g.from.cell}.${g.from.port}` : '', to: g.to ? `${g.to.cell}.${g.to.port}` : '', net: g.net || '',
    }))
    const c = cons[cp.to] ?? cons[cp.from] ?? one
    const period = c ? Math.round(1e6 / c) : null
    if (period) periods.add(period)
    const last = segs[segs.length - 1]
    const p = finish({ to: last ? last.to : `${cp.from} -> ${cp.to}`, segs })
    p.slack = period ? period - p.total : null
    p.clocks = `${cp.from} -> ${cp.to}`
    return p
  })
  const periodPs = periods.size ? Math.min(...periods) : null
  return { label, periodPs, paths: sortPaths(paths), fmax, check: null, source: null, note: paths.length ? '' : fmt(W.SAY_NO_PATHS, label) }
}

function finish(p) {
  p.total = p.segs.reduce((a, g) => a + g.ps, 0)
  p.routing = p.segs.filter((g) => g.kind === 'routing').reduce((a, g) => a + g.ps, 0)
  return p
}

function sortPaths(paths) {
  return paths.sort((a, b) => (a.slack ?? -a.total) - (b.slack ?? -b.total))
}

// --- layout ---------------------------------------------------------------------------------
const status = h('p', { class: 'sw-status', role: 'status' }, W.SAY_LOADING)
const btnFull = h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'true', onclick: () => { state.full = true; render() } }, W.SAY_FULL_PERIOD)
const btnFit = h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => { state.full = false; render() } }, W.SAY_FIT_PATHS)
const btnWorse = h('button', { class: 't27-btn', type: 'button', onclick: () => step(-1) }, W.SAY_WORSE)
const btnBetter = h('button', { class: 't27-btn', type: 'button', onclick: () => step(1) }, W.SAY_BETTER)
const btnDemo = h('button', { class: 't27-btn', type: 'button', hidden: true, onclick: () => use(state.demo) }, W.SAY_DEMO)
const fmaxBox = h('div', { class: 'sw-fmax' })
const note = h('p', { class: 'sw-note' })
const canvas = h('canvas', { class: 'sw-canvas', tabindex: '0', role: 'img', 'aria-label': W.SAY_CANVAS_LABEL })
const wrap = h('div', { class: 'sw-wrap' }, canvas)
const hint = h('p', { class: 'sw-hint' }, W.SAY_HINT)
const legend = h('ul', { class: 'sw-legend' })
const detail = h('div', { class: 'sw-detail', 'aria-live': 'polite' })
const check = h('p', { class: 'sw-check' })
const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'sw-file' })
const drop = h('label', { class: 't27-drop sw-drop' }, fileInput, h('span', {}, W.SAY_DROP))
const how = h('details', { class: 'sw-how' })

const L = W.SAY_LEGEND || []
legend.append(
  h('li', {}, h('i', { style: `background:${colorOf('logic')}` }), L[0]),
  h('li', {}, h('i', { style: `background:${colorOf('routing')}` }), L[1]),
  h('li', {}, h('i', { style: `background:${colorOf('setup')}` }), L[2]),
  h('li', {}, h('i', { style: `background:${SLACK};border:1px solid var(--w-line)` }), L[3]),
  h('li', {}, h('i', { class: 'sw-period', style: `background:${FAIL}` }), L[4]),
)

root.append(
  h('div', { class: 'sw-bar' }, btnFull, btnFit, btnWorse, btnBetter, btnDemo),
  status, fmaxBox, note, wrap, hint, legend, detail, check, drop, how,
)

// --- drawing --------------------------------------------------------------------------------
const AXIS = 18
let cssW = 0, rowH = 3, xMax = 1

function layout() {
  const d = state.data
  const n = d ? d.paths.length : 0
  const embed = document.documentElement.classList.contains('embed')
  const maxH = embed ? Math.max(120, window.innerHeight - 265) : Math.min(W.K_MAX_CANVAS_PX || 560, Math.max(240, window.innerHeight * 0.6))
  rowH = n ? Math.max(W.K_MIN_ROW_PX || 2, Math.min(W.K_ROW_PX || 7, Math.floor((maxH - AXIS) / n))) : 0
  cssW = wrap.clientWidth || 600
  const cssH = AXIS + Math.max(1, n) * rowH + 2
  wrap.style.maxHeight = Math.round(maxH) + 'px'
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.height = cssH + 'px'
  const worst = n ? Math.max(...d.paths.map((p) => p.total)) : 1
  xMax = state.full && d?.periodPs ? Math.max(d.periodPs, worst) * 1.02 : worst * 1.06
}

function niceStep(range, px) {
  const target = range / Math.max(2, px / 70)
  const p = 10 ** Math.floor(Math.log10(target))
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= target) || p * 10
}

function draw() {
  const d = state.data
  const dpr = window.devicePixelRatio || 1
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, cssW, canvas.height / dpr)
  if (!d || !d.paths.length) return
  const x = (ps) => (ps / xMax) * (cssW - 2) + 1
  // axis
  const stepPs = niceStep(xMax, cssW)
  ctx.font = `10px ${getComputedStyle(root).getPropertyValue('--w-mono') || 'monospace'}`
  ctx.textBaseline = 'middle'
  for (let t = 0; t <= xMax; t += stepPs) {
    const px = Math.round(x(t)) + 0.5
    ctx.fillStyle = 'rgba(0,255,136,0.12)'
    ctx.fillRect(px, AXIS, 1, canvas.height / dpr - AXIS)
    ctx.fillStyle = '#8fa9a0'
    const label = fmt(W.SAY_AXIS, +(t / PS).toFixed(3))
    const w = ctx.measureText(label).width
    if (px + 2 + w < cssW) ctx.fillText(label, px + 2, AXIS / 2)
  }
  // rows
  const gap = rowH >= 4 ? 1 : 0
  d.paths.forEach((p, i) => {
    const y = AXIS + i * rowH
    const hgt = rowH - gap
    if (d.periodPs && p.total < d.periodPs) {
      ctx.fillStyle = SLACK
      ctx.fillRect(x(p.total), y, x(d.periodPs) - x(p.total), hgt)
    }
    let t = 0
    p.segs.forEach((g, k) => {
      ctx.fillStyle = colorOf(g.kind)
      ctx.globalAlpha = k % 2 ? 0.78 : 1
      ctx.fillRect(x(t), y, Math.max(0.6, x(t + g.ps) - x(t)), hgt)
      t += g.ps
    })
    ctx.globalAlpha = 1
    if (p.slack !== null && p.slack < 0) {
      ctx.fillStyle = FAIL
      ctx.fillRect(x(d.periodPs), y, x(p.total) - x(d.periodPs), hgt)
      ctx.fillRect(0, y, 3, hgt)
    }
  })
  // period line
  if (d.periodPs && d.periodPs <= xMax) {
    ctx.fillStyle = FAIL
    ctx.fillRect(Math.round(x(d.periodPs)) - 1, 0, 2, canvas.height / dpr)
  }
  // pick
  const y = AXIS + state.pick * rowH
  ctx.strokeStyle = '#e8fff7'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, y - 1.5, cssW - 1, rowH + 2)
}

// --- text -----------------------------------------------------------------------------------
function showDetail() {
  const d = state.data
  const p = d?.paths[state.pick]
  if (!p) { detail.replaceChildren(); return }
  const logic = p.total - p.routing
  const line = p.slack !== null
    ? fmt(W.SAY_PATH_LINE, ns(p.total), ns(logic), ns(p.routing), signed(p.slack))
    : fmt(W.SAY_PATH_LINE_NO_PERIOD, ns(p.total), ns(logic), ns(p.routing))
  const head = W.SAY_SEG_HEAD || []
  detail.replaceChildren(
    h('p', { class: 'sw-title' + (p.slack !== null && p.slack < 0 ? ' is-fail' : '') },
      fmt(W.SAY_PATH_TITLE, state.pick + 1, d.paths.length, p.clocks ? `${p.to} (${p.clocks})` : p.to)),
    h('p', { class: 'sw-line' + (p.slack !== null && p.slack < 0 ? ' is-fail' : '') }, line),
    h('div', { class: 'sw-table' }, h('table', {},
      h('thead', {}, h('tr', {}, head.map((x) => h('th', {}, x)))),
      h('tbody', {}, p.segs.map((g) => h('tr', {},
        h('td', {}, h('i', { style: `background:${colorOf(g.kind)}` }), g.kind),
        h('td', { class: 'sw-num' }, ns(g.ps)), h('td', {}, g.from), h('td', {}, g.to), h('td', {}, g.net)))))),
  )
}

function render() {
  btnFull.setAttribute('aria-pressed', String(state.full))
  btnFit.setAttribute('aria-pressed', String(!state.full))
  const d = state.data
  if (!d) return
  const n = d.paths.length
  if (n && d.periodPs) {
    const mhz = +(1e6 / d.periodPs).toFixed(2)
    status.textContent = fmt(W.SAY_SUMMARY, d.label, num(n), signed(d.paths[0].slack), mhz)
  } else if (n) {
    status.textContent = fmt(W.SAY_SUMMARY_NO_PERIOD, d.label, num(n), ns(d.paths[0].total))
  } else status.textContent = d.label
  status.classList.toggle('is-fail', !!(n && d.paths[0].slack !== null && d.paths[0].slack < 0))
  const fh = W.SAY_FMAX_HEAD || []
  fmaxBox.hidden = !d.fmax.length
  fmaxBox.replaceChildren(h('table', {},
    h('thead', {}, h('tr', {}, fh.map((x) => h('th', {}, x)))),
    h('tbody', {}, d.fmax.map(([k, a, c]) => {
      const ok = !(c > 0) || a >= c
      return h('tr', {}, h('td', {}, k), h('td', { class: 'sw-num' }, a == null ? '-' : Number(a).toFixed(2)),
        h('td', { class: 'sw-num' }, c == null ? '-' : Number(c).toFixed(2)),
        h('td', { class: ok ? 'sw-pass' : 'sw-fail' }, c > 0 ? (ok ? W.SAY_PASS : W.SAY_FAIL) : ''))
    }))))
  note.textContent = d.note
  note.hidden = !d.note
  for (const el of [wrap, hint, legend, detail, btnWorse, btnBetter, btnFull, btnFit]) el.hidden = !n
  btnFull.hidden = btnFit.hidden = !n || !d.periodPs
  const c = d.check
  check.hidden = !c
  if (c) {
    const bins = (c.nextpnr_histogram || []).length
    check.textContent = fmt(W.SAY_CHECK_LINE, c.nextpnr_critical_total_ns, c.nextpnr_critical_endpoint,
      c.sdf_worst_total_ps, c.histogram_bins_equal ? bins : 0, bins)
  }
  const src = d.source
  how.hidden = !src
  if (src) {
    how.replaceChildren(h('summary', {}, W.SAY_COMMANDS),
      h('p', {}, [src.design, src.part, src.nextpnr, src.yosys, src.when].filter(Boolean).join(' / ')),
      h('ul', {}, (src.commands || []).map((x) => h('li', {}, h('code', {}, x)))))
  }
  if (n) { layout(); draw(); showDetail() }
}

function step(k) {
  const d = state.data
  if (!d || !d.paths.length) return
  state.pick = Math.max(0, Math.min(d.paths.length - 1, state.pick + k))
  draw(); showDetail(); scrollToPick()
}

function scrollToPick() {
  const y = AXIS + state.pick * rowH
  if (y < wrap.scrollTop || y + rowH > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = Math.max(0, y - wrap.clientHeight / 2)
}

function use(d) {
  if (!d) return
  state.data = d
  state.pick = 0
  btnDemo.hidden = d === state.demo || !state.demo
  wrap.scrollTop = 0
  render()
}

// --- input ----------------------------------------------------------------------------------
canvas.addEventListener('pointerdown', (e) => {
  const d = state.data
  if (!d || !rowH) return
  const i = Math.floor((e.offsetY - AXIS) / rowH)
  if (i < 0 || i >= d.paths.length) return
  state.pick = i
  draw(); showDetail()
})
canvas.addEventListener('keydown', (e) => {
  const n = state.data?.paths.length || 0
  if (e.key === 'ArrowUp') step(-1)
  else if (e.key === 'ArrowDown') step(1)
  else if (e.key === 'PageUp') step(-10)
  else if (e.key === 'PageDown') step(10)
  else if (e.key === 'Home') step(-n)
  else if (e.key === 'End') step(n)
  else return
  e.preventDefault()
})

let lastW = 0
new ResizeObserver(() => {
  if (!state.data?.paths.length || wrap.clientWidth === lastW) return
  lastW = wrap.clientWidth
  layout(); draw()
}).observe(wrap)

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
  if (file.size > (W.K_MAX_FILE_MB || 256) * 1048576) { status.textContent = fmt(W.SAY_ERR_SIZE, file.name, W.K_MAX_FILE_MB); return }
  status.textContent = fmt(W.SAY_READING, file.name)
  let j
  try { j = JSON.parse(await readText(file)) } catch { status.textContent = fmt(W.SAY_ERR_JSON, file.name); return }
  let d = null
  if (j && j.t27 === W.K_SCHEMA && Array.isArray(j.paths)) d = fromOwn(j, file.name)
  else if (j && (Array.isArray(j.critical_paths) || (j.fmax && typeof j.fmax === 'object'))) d = fromReport(j, file.name)
  if (!d) { status.textContent = fmt(W.SAY_ERR_SHAPE, file.name); return }
  use(d)
}

fileInput.addEventListener('change', () => { takeFile(fileInput.files[0]); fileInput.value = '' })
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over') })
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); takeFile(e.dataTransfer?.files?.[0]) })
root.addEventListener('dragover', (e) => e.preventDefault())
root.addEventListener('drop', (e) => { if (e.defaultPrevented) return; e.preventDefault(); takeFile(e.dataTransfer?.files?.[0]) })

// The demo must be the run the spec describes; a file that disagrees is not drawn.
function agrees(d) {
  const p = d.paths[0]
  return p && d.periodPs === W.K_DEMO_PERIOD_PS && d.paths.length === W.K_DEMO_ENDPOINTS &&
    p.total === W.K_DEMO_WORST_TOTAL_PS && p.routing === W.K_DEMO_WORST_ROUTING_PS && p.slack === W.K_DEMO_WORST_SLACK_PS
}

;(async () => {
  try {
    const r = await fetch(new URL(W.K_DATA_FILE || 'timing.json', import.meta.url))
    if (!r.ok) throw new Error(String(r.status))
    const j = await r.json()
    const d = fromOwn(j, j.source?.top || '')
    if (!agrees(d)) { status.textContent = W.SAY_ERR_DEMO_DIFF; return }
    state.demo = d
    use(d)
  } catch {
    status.textContent = W.SAY_ERR_DEMO
  }
})()
