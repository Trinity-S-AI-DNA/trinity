// cost-curves/tool.js -- draws data.json: post-synthesis cell counts against operand width.
// Every word is a SAY_ constant from specs/widgets/cost-curves.t27 (window.T27_WIDGET); every
// number is from data.json, written by scripts/widget-data/cost-curves.mjs. Reads only
// ./data.json and ./tool.css; calls no other host; stores nothing.
const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.appendChild(css)

const SVG = 'http://www.w3.org/2000/svg'
const fill = (s, vars) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k === 'class') n.className = v
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v)
    else n.setAttribute(k, v === true ? '' : v)
  }
  for (const c of kids.flat()) if (c != null) n.append(c instanceof Node ? c : String(c))
  return n
}
const svg = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(SVG, tag)
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v)
  for (const c of kids.flat()) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)))
  return n
}
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const num = (v) => (v == null ? W.SAY_NONE : Number(v).toLocaleString('en-US'))
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d

// The four counts the reader picks between, in the order of SAY_METRICS and capacity's keys.
const METRICS = ['lut', 'ff', 'carry4', 'dsp']
const TABLE_KEYS = ['lut', 'ff', 'carry4', 'dsp', 'muxf7', 'muxf8']
const state = { op: Number(W.K_START_OP) || 0, metric: 0, dsp: false, log: true, table: false }
let data = null

function seriesFor(op) {
  const rows = data.results.filter((r) => r.op === op && r.dsp === state.dsp)
  const byX = (a, b) => a.info_bits - b.info_bits
  const out = [
    { kind: 'binary', color: cssVar('--w-green'), line: true, points: rows.filter((r) => r.family === 'binary').sort(byX) },
    { kind: 'ternary-ref', color: cssVar('--w-gold'), line: true, points: rows.filter((r) => r.family === 'ternary-ref').sort(byX) },
    { kind: 't27', color: cssVar('--w-red'), line: false, points: rows.filter((r) => r.family === 't27').sort(byX) },
    { kind: 'twin', color: cssVar('--w-muted'), line: false, points: rows.filter((r) => r.family === 'twin').sort(byX) },
  ]
  return out.filter((s) => s.points.length)
}
const seriesName = (kind) => fill((W.SAY_SERIES || [])[['binary', 'ternary-ref', 't27', 'twin'].indexOf(kind)], { op: String((W.SAY_OPS || [])[state.op] ?? '').toLowerCase() })
const designName = (r) => (r.family === 't27' ? r.spec.split('/').pop() : r.family === 'binary' || r.family === 'ternary-ref' ? r.top : r.top)
const capOf = (key) => data.capacity[key]
const capUnit = (i) => (W.SAY_CAP_UNITS || [])[i]
const share = (v, key) => (v == null ? null : round((100 * v) / capOf(key), 3))

// --- controls ---------------------------------------------------------------------------------
function group(label, words, isOn, pick, titles) {
  return el('div', { class: 'cc-group', role: 'group', 'aria-label': label },
    el('span', { class: 'cc-label' }, label),
    words.map((w, i) => el('button', { type: 'button', class: 't27-btn', 'aria-pressed': String(isOn(i)), title: titles?.[i], onclick: () => { pick(i); render() } }, w)))
}
function controls() {
  return el('div', { class: 'cc-controls' },
    group(W.SAY_OP_LABEL, W.SAY_OPS || [], (i) => i === state.op, (i) => { state.op = i }, W.SAY_OP_TITLES),
    group(W.SAY_METRIC_LABEL, W.SAY_METRICS || [], (i) => i === state.metric, (i) => { state.metric = i }, W.SAY_METRIC_LONG),
    group(W.SAY_DSP_LABEL, [W.SAY_DSP_ON, W.SAY_DSP_OFF], (i) => (i === 0) === state.dsp, (i) => { state.dsp = i === 0 }, [W.SAY_DSP_ON_TITLE, W.SAY_DSP_OFF_TITLE]),
    group(W.SAY_SCALE_LABEL, [W.SAY_SCALE_LOG, W.SAY_SCALE_LIN], (i) => (i === 0) === state.log, (i) => { state.log = i === 0 }),
    group(W.SAY_VIEW_LABEL, [W.SAY_VIEW_CHART, W.SAY_VIEW_TABLE], (i) => (i === 1) === state.table, (i) => { state.table = i === 1 }))
}

// --- chart ------------------------------------------------------------------------------------
function niceMax(v) {
  if (v <= 1) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p
  return 10 * p
}

function chart(op) {
  const key = METRICS[state.metric]
  const series = seriesFor(op)
  const okPts = series.flatMap((s) => s.points.filter((p) => p.status === 'ok'))
  const dataMax = Math.max(1, ...okPts.map((p) => p.metrics[key]))
  const cap = capOf(key)
  const capShown = state.log || cap <= dataMax * 1.5

  const wrap = el('div', { class: 'cc-chart' })
  const width = Math.max(300, Math.min(1120, root.clientWidth || 640))
  const embed = document.documentElement.classList.contains('embed')
  const height = Math.round(Math.max(210, Math.min(Number(W.K_CHART_H_PX) || 340, width * 0.58, embed ? window.innerHeight - 190 : 1e9)))
  const M = { l: 50, r: 12, t: 16, b: 40 }
  const pw = width - M.l - M.r
  const ph = height - M.t - M.b
  const xLo = Math.log2(0.8)
  const xHi = Math.log2(76)
  const X = (bits) => M.l + ((Math.log2(bits) - xLo) / (xHi - xLo)) * pw
  const f = state.log ? (v) => Math.log10(1 + v) : (v) => v
  const yTop = state.log ? f(Math.max(dataMax, capShown ? cap : 0) * 1.6) : niceMax(Math.max(dataMax, capShown ? cap : 0) * 1.05)
  const Y = (v) => M.t + ph - (f(v) / yTop) * ph

  const s = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img', 'aria-label': W.SAY_CHART_LABEL, class: 'cc-svg' })
  const muted = cssVar('--w-subtle')
  const line = cssVar('--w-line')
  // grid and axes
  const yTicks = state.log ? [0, 1, 10, 100, 1000, 10000, 100000, 1000000].filter((t) => f(t) <= yTop) : Array.from({ length: 6 }, (_, i) => (yTop * i) / 5)
  for (const t of yTicks) {
    s.append(svg('line', { x1: M.l, x2: width - M.r, y1: Y(t), y2: Y(t), stroke: line, 'stroke-width': 1 }))
    s.append(svg('text', { x: M.l - 6, y: Y(t) + 4, 'text-anchor': 'end', class: 'cc-tick' }, t >= 1000 ? `${t / 1000}k` : String(round(t, 1))))
  }
  for (const t of [1, 2, 4, 8, 16, 32, 64]) {
    s.append(svg('line', { x1: X(t), x2: X(t), y1: M.t, y2: M.t + ph, stroke: line, 'stroke-width': 1, 'stroke-dasharray': '2 4' }))
    s.append(svg('text', { x: X(t), y: M.t + ph + 16, 'text-anchor': 'middle', class: 'cc-tick' }, String(t)))
  }
  // A 10.5px monospace glyph is about 6.3px wide; squeeze the x label rather than clip it on a phone.
  const xWords = W.SAY_X_AXIS || ''
  const xFits = xWords.length * 6.4 <= pw
  const xAttrs = xFits ? { x: M.l + pw / 2 } : { x: width / 2, textLength: width - 12, lengthAdjust: 'spacingAndGlyphs' }
  s.append(svg('text', { ...xAttrs, y: height - 6, 'text-anchor': 'middle', class: 'cc-axis' }, xWords))
  s.append(svg('text', { x: 12, y: M.t + ph / 2, transform: `rotate(-90 12 ${M.t + ph / 2})`, 'text-anchor': 'middle', class: 'cc-axis' },
    fill(W.SAY_Y_AXIS, { metric: (W.SAY_METRIC_LONG || [])[state.metric], scale: state.log ? W.SAY_SCALE_LOG : W.SAY_SCALE_LIN })))

  // capacity
  const capWords = { n: num(cap), unit: capUnit(state.metric) }
  if (capShown) {
    s.append(svg('line', { x1: M.l, x2: width - M.r, y1: Y(cap), y2: Y(cap), stroke: cssVar('--w-text'), 'stroke-width': 1.2, 'stroke-dasharray': '6 5', opacity: 0.75 }))
    s.append(svg('text', { x: width - M.r - 4, y: Y(cap) - 6, 'text-anchor': 'end', class: 'cc-cap' }, fill(W.SAY_CAP, capWords)))
  }

  // series
  const marks = []
  for (const se of series) {
    const pts = se.points.filter((p) => p.status === 'ok')
    if (se.line && pts.length > 1) s.append(svg('polyline', { points: pts.map((p) => `${X(p.info_bits)},${Y(p.metrics[key])}`).join(' '), fill: 'none', stroke: se.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }))
    for (const p of pts) {
      const cx = X(p.info_bits)
      const cy = Y(p.metrics[key])
      const shape = se.kind === 't27'
        ? svg('rect', { x: cx - 5, y: cy - 5, width: 10, height: 10, transform: `rotate(45 ${cx} ${cy})`, fill: se.color })
        : svg('circle', { cx, cy, r: se.kind === 'twin' ? 4.5 : 3.5, fill: se.kind === 'twin' ? cssVar('--w-bg') : se.color, stroke: se.color, 'stroke-width': 2 })
      s.append(shape)
      marks.push({ p, se, cx, cy, shape })
    }
  }
  const halo = svg('circle', { r: 9, fill: 'none', stroke: cssVar('--w-text'), 'stroke-width': 1.5, visibility: 'hidden' })
  s.append(halo)

  const tip = el('div', { class: 'cc-tip', role: 'status', 'aria-live': 'polite', hidden: true })
  const pick = (ev) => {
    const box = s.getBoundingClientRect()
    const sx = ((ev.clientX - box.left) / box.width) * width
    const sy = ((ev.clientY - box.top) / box.height) * height
    let best = null
    let bd = 44 ** 2
    for (const m of marks) { const d = (m.cx - sx) ** 2 + (m.cy - sy) ** 2; if (d < bd) { bd = d; best = m } }
    if (!best) { tip.hidden = true; halo.setAttribute('visibility', 'hidden'); return }
    halo.setAttribute('cx', best.cx); halo.setAttribute('cy', best.cy); halo.setAttribute('visibility', 'visible')
    showTip(tip, best, key)
    const left = (best.cx / width) * box.width
    const top = (best.cy / height) * box.height
    tip.style.left = `${Math.max(4, Math.min(box.width - tip.offsetWidth - 4, left + 12 > box.width / 2 ? left - tip.offsetWidth - 12 : left + 12))}px`
    tip.style.top = `${Math.max(4, Math.min(box.height - tip.offsetHeight - 4, top - tip.offsetHeight / 2))}px`
  }
  s.addEventListener('pointermove', pick)
  s.addEventListener('pointerdown', pick)
  s.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') { tip.hidden = true; halo.setAttribute('visibility', 'hidden') } })

  const legend = el('ul', { class: 'cc-legend' },
    series.map((se) => el('li', {}, el('span', { class: `cc-swatch cc-${se.kind}`, style: `--c:${se.color}` }), seriesName(se.kind))),
    capShown ? null : el('li', { class: 'cc-cap-off' }, fill(W.SAY_CAP_ABOVE, capWords)))
  wrap.append(s, tip)
  return el('div', {}, wrap, legend, el('p', { class: 'cc-hint' }, W.SAY_HINT))
}

function showTip(tip, { p, se }, key) {
  const cols = W.SAY_COLS || []
  tip.replaceChildren(
    el('strong', { style: `color:${se.color}` }, se.kind === 't27' ? fill(W.SAY_TIP_SPEC, { spec: p.spec.split('/').pop(), top: p.top }) : `${seriesName(se.kind)}: ${p.top}`),
    el('div', {}, p.trits ? fill(W.SAY_TIP_TRITS, { trits: p.trits, bits: round(p.info_bits, 1) }) : fill(W.SAY_TIP_BITS, { bits: round(p.info_bits, 1) })),
    el('dl', {}, TABLE_KEYS.flatMap((k, i) => [el('dt', {}, cols[3 + i]), el('dd', { class: k === key ? 'cc-on' : null }, num(p.metrics[k]))])),
    el('div', {}, fill(W.SAY_TIP_SHARE, { pct: share(p.metrics[key], key), unit: capUnit(state.metric) })),
    el('div', { class: 'cc-dim' }, fill(W.SAY_TIP_SECONDS, { s: p.seconds })))
  tip.hidden = false
}

// --- table ------------------------------------------------------------------------------------
function table(op) {
  const key = METRICS[state.metric]
  const cols = W.SAY_COLS || []
  const rows = seriesFor(op).flatMap((se) => se.points.map((p) => ({ p, se })))
  return el('div', { class: 'cc-table-wrap' }, el('table', { class: 'cc-table' },
    el('thead', {}, el('tr', {}, cols.map((c, i) => el('th', { scope: 'col', title: i === 9 ? W.SAY_SHARE_TITLE : null }, c)))),
    el('tbody', {}, rows.map(({ p, se }) => el('tr', {},
      el('th', { scope: 'row' }, el('span', { class: `cc-swatch cc-${se.kind}`, style: `--c:${se.color}` }), designName(p)),
      el('td', {}, round(p.info_bits, 1)),
      el('td', {}, p.trits ?? W.SAY_NONE),
      p.status === 'ok'
        ? [...TABLE_KEYS.map((k) => el('td', { class: k === key ? 'cc-on' : null }, num(p.metrics[k]))), el('td', {}, `${share(p.metrics[key], key)}%`)]
        : el('td', { colspan: 7, class: 'cc-bad' }, W.SAY_REFUSED),
      el('td', {}, p.seconds))))))
}

// --- notes, findings, provenance ----------------------------------------------------------------
function noteFor(op) {
  const nodsp = (where) => data.results.find((r) => r.dsp === false && Object.entries(where).every(([k, v]) => r[k] === v))?.metrics?.lut
  const t27 = (stem) => nodsp({ family: 't27', spec: data.specs.find((s) => s.spec.endsWith(stem))?.spec })
  const words = {
    tadd: num(nodsp({ family: 'ternary-ref', trits: 15 })), add: num(nodsp({ family: 'binary', op: 'add', width: 24 })),
    fa: num(t27('ternary_full_adder.t27')), fa_twin: num(nodsp({ family: 'twin', twin: 'fa1' })), dot: num(t27('comb_ternary_dot.t27')),
  }
  return el('section', { class: 'cc-note' },
    el('h3', {}, W.SAY_NOTE_TITLE),
    el('p', {}, fill((W.SAY_NOTES || [])[(W.K_OPS || []).indexOf(op)], words)),
    el('p', { class: 'cc-honest' }, W.SAY_HONEST),
    el('p', { class: 'cc-dim' }, W.SAY_PACK_NOTE))
}

function findings() {
  if (!data.findings.length) return null
  const one = (f) => {
    if (f.kind === 'rejected') {
      const r = data.results.find((x) => x.id === f.id)
      return fill(W.SAY_FINDING_REJECTED, { spec: f.spec ?? f.id, mode: r?.dsp ? W.SAY_DSP_ON : W.SAY_DSP_OFF, detail: f.detail, line: f.line ?? W.SAY_NONE })
    }
    if (f.kind === 'no-data-ports') return fill(W.SAY_FINDING_NO_PORTS, { spec: f.spec, top: data.specs.find((s) => s.spec === f.spec)?.top })
    if (f.kind === 'empty') return fill(W.SAY_FINDING_EMPTY, f)
    return fill(W.SAY_FINDING_OTHER, { spec: f.spec ?? f.id, detail: f.detail })
  }
  return el('section', { class: 'cc-findings' }, el('h3', {}, W.SAY_FINDINGS_TITLE), el('ul', {}, data.findings.map((f) => el('li', {}, one(f)))))
}

function provenance() {
  const c = data.capacity
  const t = data.tools
  return el('section', { class: 'cc-prov' },
    el('h3', {}, W.SAY_PROV_TITLE),
    el('p', {}, fill(W.SAY_PROV_TOOLS, { yosys: t.yosys, iverilog: t.iverilog, nextpnr: c.nextpnr.version })),
    el('p', {}, fill(W.SAY_PROV_SYNTH, { synth: data.synth, runs: data.timing.runs, sum: data.timing.sum_seconds, wall: data.timing.wall_seconds, jobs: data.timing.jobs })),
    el('p', {}, fill(W.SAY_PROV_CAP, { file: c.prjxray.file, slicel: num(c.prjxray.SLICEL), slicem: num(c.prjxray.SLICEM), slices: num(c.slices), dsp: num(c.dsp), chipdb: c.nextpnr.chipdb, lutx: num(c.nextpnr.SLICE_LUTX), ffx: num(c.nextpnr.SLICE_FFX), carry: num(c.nextpnr.CARRY4), dspn: num(c.nextpnr.DSP48E1) })),
    el('p', {}, fill(W.SAY_PROV_CHECK, { cases: data.adder_check.cases, trits: data.adder_check.trits, verdict: data.adder_check.all_pass ? W.SAY_PASS : W.SAY_REFUSED })),
    el('p', { class: 'cc-dim' }, fill(W.SAY_PROV_SPEC, { spec: data.spec.path, sha: data.spec.sha256.slice(0, 16), compiler: data.compiler.path, csha: data.compiler.sha256.slice(0, 16), at: data.generated_at })),
    el('details', {}, el('summary', {}, fill(W.SAY_COMMANDS, { n: data.commands.length })), el('pre', {}, data.commands.join('\n'))))
}

// --- page -------------------------------------------------------------------------------------
function render() {
  const op = (W.K_OPS || [])[state.op]
  root.replaceChildren(el('div', { class: 'cc' },
    controls(),
    el('p', { class: 'cc-optitle' }, (W.SAY_OP_TITLES || [])[state.op]),
    state.table ? table(op) : chart(op),
    noteFor(op),
    findings(),
    provenance()))
}

async function main() {
  root.replaceChildren(el('p', { class: 'cc-dim' }, W.SAY_LOADING))
  try {
    const res = await fetch(new URL(`./${W.K_DATA_JSON || 'data.json'}`, import.meta.url))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data = await res.json()
  } catch (e) {
    root.replaceChildren(el('p', { class: 'cc-bad' }, fill(W.SAY_ERR_LOAD, { why: e.message })))
    return
  }
  render()
  let last = root.clientWidth
  new ResizeObserver(() => { if (Math.abs(root.clientWidth - last) > 8) { last = root.clientWidth; if (!state.table) render() } }).observe(root)
}
main()
