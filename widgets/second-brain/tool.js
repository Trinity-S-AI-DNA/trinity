// second-brain/tool.js -- declarative wiring for the Second Brain demo graph, on the shared
// graph-kit renderer. The words, node titles, edge labels, view modes, theme ids and the whole
// TRANSITION TABLE are constants of specs/widgets/second-brain.t27, handed over as
// window.T27_WIDGET. What each UI event does to the state is a row of that table, applied by the
// kit's mechanical interpreter; this file only maps buttons and browser events to spec event ids
// and passes data through. It holds no renderer and no transition rule of its own. Demo data only:
// nothing is fetched, sent or stored.
import { el, graphView, applyTheme, renderFlow } from '../graph-kit.js'
import {
  view_zoom_in as viewZoomIn,
  view_zoom_out as viewZoomOut,
  view_toggle_selected as viewToggleSelected,
  K_TRANSITIONS,
  K_EVENT_THEME, K_EVENT_MODE, K_EVENT_RESET, K_EVENT_FILTER, K_EVENT_NODE, K_EVENT_WHEEL, K_EVENT_PAN,
  disc_reach_sq, square_w, square_h, square_reach_t, K_SELECTED_NONE,
} from './second-brain-logic.js'
import {
  K_SELECT_BINDING,
  SAY_MINI_NODE_TITLES, K_MINI_NODE_X, K_MINI_NODE_Y, K_MINI_NODE_SHAPES,
  K_MINI_EDGE_SRC, K_MINI_EDGE_DST, SAY_MINI_EDGE_LABELS,
  SAY_VIEW_NODE_TITLES, SAY_VIEW_NODE_KINDS, K_VIEW_NODE_SHAPES, K_VIEW_NODE_X, K_VIEW_NODE_Y,
  K_VIEW_EDGE_SRC, K_VIEW_EDGE_DST, SAY_VIEW_EDGE_LABELS,
  K_VIEW_PADDING_X, K_VIEW_PADDING_Y,
} from './second-brain-view.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

// --- Explorer mode: the real spec index over the demo descriptor --------------------
// The index is a generated artifact (scripts/spec-index.mjs over the pinned
// compiler's AST). When it is present the page is a spec explorer: search, the
// spec graph, an inspector. Without it the page falls back to the demo graph --
// a missing index is a fallback, not a silently empty screen.
const explorer = { on: false, specs: [], byId: new Map(), query: '', expanded: new Set(), showArtifacts: false }

async function loadIndex() {
  try {
    const res = await fetch('./spec-index.json')
    if (!res.ok) throw new Error('http ' + res.status)
    const idx = JSON.parse(await res.text())
    explorer.on = true
    explorer.idx = idx
    // No fixed grid here: nodes without explicit x/y are placed by the kit's
    // shelf-packing over their measured label bounds, so the old defect (a
    // fixed 70px row step under a 128px disc diameter) cannot recur.
    // The drawn label is the short segment name, capped: the label-fit size is
    // content-driven, and a 34-character id would draw a disc of radius 128 in
    // a 400-unit window (measured: the giant-arc failure). The full id stays on
    // the title (aria, inspector); the drawn label is the readable part.
    // The cap is the spec's SB2_LABEL_CAP, emitted into theme.css as
    // --sb2-label-cap. Read it back from the document when styles are
    // available; a non-browser host (or a stylesheet-less one) falls back to
    // 14, which is the same value the spec pins -- the duplicate is the named
    // temporary until style resolution is a host op.
    const cap = (s) => {
      const t = s.split('/').pop()
      let limit = 14
      try {
        limit = Number(getComputedStyle(document.documentElement).getPropertyValue('--sb2-label-cap')) || 14
      } catch { /* no style resolution in this host */ }
      return t.length > limit ? t.slice(0, limit - 1) + '…' : t
    }
    explorer.specs = idx.specs.map((s) => ({
      title: s.id, label: cap(s.id), kind: s.id.includes('/') ? s.id.split('/')[0] : 'root',
      shape: s.counts.tests > 0 ? 1 : 2,
      rec: s,
    }))
    explorer.byId = new Map(explorer.specs.map((n) => [n.title, n]))
  } catch (e) {
    console.warn('spec-index unavailable, staying on the demo graph:', e.message)
  }
}

// The explorer model: visible specs, plus fn nodes for expanded specs, plus
// artifact nodes when provenance is on. Stable ids only: spec ids (path minus
// .t27), `specId#fn`, `artifact:<rel>` -- never a label or a title guess.
function explorerGraph() {
  const q = explorer.query.trim().toLowerCase()
  const specs = explorer.specs.filter((n) => !q || n.title.toLowerCase().includes(q))
  const ids = new Set(specs.map((n) => n.title))
  const nodes = [...specs]
  const idxOf = new Map(nodes.map((n, i) => [n.title, i]))
  const edges = []
  const allEdges = explorer.idx.edges || []
  // Inter-spec calls: in this corpus there are none, but the counter is honest
  // arithmetic over the index, not a constant.
  let interSpec = 0
  let selfLoopsHidden = 0
  const unresolvedVisible = (explorer.idx.unresolved || []).filter((u) => ids.has(u.spec))
  const provTotal = (explorer.idx.artifacts || [])
    .filter((a) => ids.has(a.generatedFrom))
    .reduce((n, a) => n + 1, 0)
  for (const e of allEdges) {
    if (e.type !== 'calls') continue
    const fs = e.from.split('#')[0]
    const ts = e.to.split('#')[0]
    if (!ids.has(fs) || !ids.has(ts)) continue
    if (fs !== ts) {
      interSpec++
      edges.push({ src: idxOf.get(fs), dst: idxOf.get(ts), label: 'calls' })
    } else if (!explorer.expanded.has(fs)) {
      // Intra-spec: hidden at spec level, shown when the spec is expanded.
      selfLoopsHidden++
    }
  }
  // EXPANSION: fn nodes + the spec's own call graph, only for expanded visible specs.
  for (const specTitle of [...explorer.expanded].filter((t) => ids.has(t))) {
    const rec = explorer.byId.get(specTitle)?.rec
    if (!rec) continue
    for (const f of rec.fns) {
      const id = `${specTitle}#${f.name}`
      if (idxOf.has(id)) continue
      idxOf.set(id, nodes.length)
      nodes.push({ title: id, label: f.name, kind: 'fn', shape: 2, fnOf: specTitle })
    }
  }
  for (const e of allEdges) {
    if (e.type !== 'calls') continue
    const fs = e.from
    const ts = e.to
    const fsSpec = fs.split('#')[0]
    if (fsSpec !== ts.split('#')[0] || !explorer.expanded.has(fsSpec) || !ids.has(fsSpec)) continue
    if (!idxOf.has(fs) || !idxOf.has(ts)) continue
    if (fs === ts) continue // a recursive call would draw a zero-length line
    edges.push({ src: idxOf.get(fs), dst: idxOf.get(ts), label: 'calls' })
  }
  // Provenance: artifact nodes + generated_from edges, toggleable, default OFF.
  let provDrawn = 0
  if (explorer.showArtifacts) {
    for (const a of explorer.idx.artifacts || []) {
      if (!ids.has(a.generatedFrom) || idxOf.has(a.id)) continue
      idxOf.set(a.id, nodes.length)
      nodes.push({ title: a.id, label: a.id.split('/').slice(-2).join('/'), kind: 'artifact', shape: 2, artifactOf: a.generatedFrom })
    }
    for (const e of allEdges) {
      if (e.type !== 'generated_from' || !ids.has(e.from)) continue
      if (!idxOf.has(e.from) || !idxOf.has(e.to)) continue
      edges.push({ src: idxOf.get(e.from), dst: idxOf.get(e.to), label: 'generated_from' })
      provDrawn++
    }
  }
  return {
    nodes, edges,
    counters: { interSpec, selfLoopsHidden, unresolved: unresolvedVisible.length, provTotal, provDrawn },
  }
}

const searchBox = el('input', 'sb2-search')
searchBox.placeholder = 'search specs'
const inspector = el('div', 'sb2-inspector')
const metaLine = el('div', 'sb2-meta')

function refreshExplorer() {
  const g = explorerGraph()
  view.setGraph(g.nodes, g.edges)
  const c = g.counters
  const parts = [
    `inter-spec edges: ${c.interSpec}`,
    `self-loop calls hidden: ${c.selfLoopsHidden}${c.selfLoopsHidden ? ' (expand a spec to see them)' : ''}`,
    explorer.showArtifacts ? `provenance edges drawn: ${c.provDrawn}` : `provenance edges: ${c.provTotal} (toggle 'artifacts')`,
  ]
  if (c.unresolved) parts.push(`unresolved calls: ${c.unresolved}`)
  if (explorer.expanded.size) parts.push(`expanded: ${[...explorer.expanded].sort().join(', ')}`)
  metaLine.textContent = parts.join(' | ')
  return g
}

function toggleExpand(title) {
  if (explorer.expanded.has(title)) explorer.expanded.delete(title)
  else explorer.expanded.add(title)
}

async function showInspector(title) {
  const rec = explorer.byId.get(title)?.rec
  if (!rec) { inspector.replaceChildren(); return }
  const lines = [
    `module ${rec.module} (sha ${rec.sha256.slice(0, 12)})`,
    `consts ${rec.counts.consts} | fns ${rec.counts.fns} | tests ${rec.counts.tests} | uses ${rec.counts.uses} | calls ${rec.counts.calls}`,
    rec.counts.unresolved ? `UNRESOLVED calls: ${rec.counts.unresolved}` : 'no unresolved calls',
    rec.fns.length ? 'fns: ' + rec.fns.map((f) => `${f.name}@${f.line}`).join(', ') : '',
  ].filter(Boolean)
  const pre = el('pre', 'sb2-inspect', lines.join('\n'))
  const flowBox = el('div')
  inspector.replaceChildren(pre, flowBox)
  try {
    if (!showInspector.flow) showInspector.flow = JSON.parse(await (await fetch('./flow.json')).text())
    const f = showInspector.flow
    // Node titles carry 'widgets/<id>'; flow records carry '<id>.t27' -- match
    // on the base id either way, so the flows always find their spec.
    const base = title.split('/').pop()
    renderFlow(flowBox, f.flows.filter((x) => base === x.spec || base + '.t27' === x.spec), f.obj)
  } catch (e) {
    inspector.append(el('p', 'sb2-meta', 'flow unavailable: ' + e.message))
  }
}

// --- View data: from the generated view descriptor (second-brain-view.t27 via gen-js) ---
// Node names, coordinates, shapes, edge endpoints and the selection binding are the
// descriptor's constants; this file invents none of them. The descriptor is built for the
// full graph; the MINI descriptor (same module) is the two-node vertical example.
const nodes = (SAY_VIEW_NODE_TITLES || []).map((title, i) => ({
  title,
  kind: (SAY_VIEW_NODE_KINDS || [])[i] || 'concept',
  x: Number((K_VIEW_NODE_X || [])[i]),
  y: Number((K_VIEW_NODE_Y || [])[i]),
  shape: Number((K_VIEW_NODE_SHAPES || [])[i]),
}))
const edges = (K_VIEW_EDGE_SRC || []).map((src, i) => ({
  src: Number(src),
  dst: Number((K_VIEW_EDGE_DST || [])[i]),
  label: (SAY_VIEW_EDGE_LABELS || [])[i] || '',
}))
// The descriptor's own binding must be a row of the transition table; a view
// whose select binding the table does not carry is refused here, loudly.
const bindingKnown = K_TRANSITIONS.some((_, i) =>
  i + 3 < K_TRANSITIONS.length &&
  K_TRANSITIONS[i] === K_SELECT_BINDING[0] && K_TRANSITIONS[i + 1] === K_SELECT_BINDING[1] &&
  K_TRANSITIONS[i + 2] === K_SELECT_BINDING[2] && K_TRANSITIONS[i + 3] === K_SELECT_BINDING[3])
if (!bindingKnown) throw new Error('the view descriptor binds an event the transition table does not carry')
const viewModes = W.SAY_VIEW_MODES || ['discs', 'squares']
const themeIds = W.SAY_THEME_IDS || ['slate', 'paper']
const kindNames = ['all', ...new Set(nodes.map((n) => n.kind))]
const T = K_TRANSITIONS

// --- One interaction state, in the spec's own field order ---------------------------
const state = { selected: null, filter: 0, panX: 0, panY: 0, zoomMilli: 1000 }
let mode = viewModes[0]

// The transition arithmetic is the generated module's (t27c gen-js over
// second-brain-view-logic.t27); the kit's interpreter only reads the spec's
// table and calls these. No second copy of the math lives in hand code.
const view = graphView(root, {
  nodes, edges, state, transitions: T, kindNames,
  ops: { toggle: viewToggleSelected, zoomIn: viewZoomIn, zoomOut: viewZoomOut },
  geo: { discReachSq: disc_reach_sq, squareW: square_w, squareH: square_h, squareReachT: square_reach_t, selectedNone: Number(K_SELECTED_NONE) },
  paddingX: Number(K_VIEW_PADDING_X), paddingY: Number(K_VIEW_PADDING_Y),
  // values from themes.t27 SB2_LAYOUT_GAP_* (generated into theme.css); read back numerically
  // until style resolution is a host op -- pinned there by layout_gaps_are_theme_parameters.
  layoutGapX: 24, layoutGapY: 40,
  note: W.SAY_NOTE, mode: () => mode,
})
view.onSelect = (i) => { if (explorer.on) showInspector(view.currentNodes()[i]?.title) }

// --- Controls: spec event ids in, kit interpreter does the rest ----------------------
const head = el('div', 'sb2-head')
const group = (label) => {
  const g = el('div', 'sb2-group')
  g.append(el('span', 'sb2-group-label', label))
  head.append(g)
  return g
}
const button = (parent, label, on) => {
  const b = el('button', 'sb2-btn', label)
  b.addEventListener('click', () => { on(); sync() })
  parent.append(b)
  return b
}

const modeGroup = group('view')
const modeBtns = viewModes.map((m) => button(modeGroup, m, () => { view.event(K_EVENT_MODE); mode = m; view.draw() }))
let theme = themeIds[0]
const themeGroup = group('theme')
const themeBtns = themeIds.map((t) => button(themeGroup, t, () => { theme = t; view.event(K_EVENT_THEME); view.applyTheme(t) }))
const filterGroup = group('filter')
const filterBtns = kindNames.map((f, i) => button(filterGroup, f, () => view.event(K_EVENT_FILTER, i)))
const zoomGroup = group('zoom')
button(zoomGroup, '+', () => view.event(K_EVENT_WHEEL, 1200))
button(zoomGroup, '-', () => view.event(K_EVENT_WHEEL, 833))
button(zoomGroup, 'reset', () => view.event(K_EVENT_RESET))

root.prepend(head)

function sync() {
  modeBtns.forEach((b, i) => b.classList.toggle('sb2-on', viewModes[i] === mode))
  themeBtns.forEach((b, i) => b.classList.toggle('sb2-on', themeIds[i] === theme))
  filterBtns.forEach((b, i) => b.classList.toggle('sb2-on', i === state.filter))
}

applyTheme(root, themeIds[0])
sync()

// --- Explorer: real index in, demo graph out ---------------------------------
loadIndex().then(() => {
  if (!explorer.on) return
  root.classList.add('sb2-wide')
  head.append(searchBox)
  const explorerGroup = group('explorer')
  const syncExplorerBtns = () => artifactsBtn.classList.toggle('sb2-on', explorer.showArtifacts)
  button(explorerGroup, 'expand', () => { if (state.selected != null) toggleExpand(view.currentNodes()[state.selected]?.title) })
  button(explorerGroup, 'collapse', () => { if (state.selected != null) explorer.expanded.delete(view.currentNodes()[state.selected]?.title) })
  const artifactsBtn = button(explorerGroup, 'artifacts', () => { explorer.showArtifacts = !explorer.showArtifacts; syncExplorerBtns(); refreshExplorer() })
  root.append(metaLine, inspector)
  // First click selects + inspects; a second click on the same spec expands or
  // collapses its internal call graph. Counters always reflect what is drawn.
  view.onSelect = (i) => {
    const title = view.currentNodes()[i]?.title
    // First click selects + inspects; a second click on the same spec toggles
    // the expansion of its internal call graph.
    if (title && explorer._lastSelected === title) toggleExpand(title)
    explorer._lastSelected = title
    showInspector(title)
    syncExplorerBtns()
    refreshExplorer()
  }
  searchBox.addEventListener('input', () => { explorer.query = searchBox.value; refreshExplorer() })
  refreshExplorer()
})
