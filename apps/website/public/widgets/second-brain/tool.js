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
const explorer = { on: false, specs: [], byId: new Map(), query: '' }

async function loadIndex() {
  try {
    const res = await fetch('./spec-index.json')
    if (!res.ok) throw new Error('http ' + res.status)
    const idx = JSON.parse(await res.text())
    explorer.on = true
    explorer.idx = idx
    // Grid layout, deterministic: the index's own id order, the compiler's data.
    const cols = 14
    explorer.specs = idx.specs.map((s, i) => ({
      title: s.id, kind: s.id.includes('/') ? s.id.split('/')[0] : 'root',
      shape: s.counts.tests > 0 ? 1 : 2,
      x: ((i % cols) - cols / 2) * 26,
      y: (Math.floor(i / cols) - 6) * 26,
      rec: s,
    }))
    explorer.byId = new Map(explorer.specs.map((n) => [n.title, n]))
  } catch (e) {
    console.warn('spec-index unavailable, staying on the demo graph:', e.message)
  }
}

function explorerGraph() {
  const q = explorer.query.trim().toLowerCase()
  const nodes = explorer.specs.filter((n) => !q || n.title.toLowerCase().includes(q))
  const ids = new Set(nodes.map((n) => n.title))
  const edges = (explorer.idx.edges || [])
    .filter((e) => e.type === 'calls' && ids.has(e.from.split('#')[0]) && ids.has(e.to.split('#')[0]))
    .map((e, i) => ({ src: nodes.findIndex((n) => n.title === e.from.split('#')[0]), dst: nodes.findIndex((n) => n.title === e.to.split('#')[0]), label: 'calls' }))
    .filter((e) => e.src >= 0 && e.dst >= 0 && e.src !== e.dst)
  return { nodes, edges }
}

const searchBox = el('input', 'sb2-search')
searchBox.placeholder = 'search specs'
searchBox.addEventListener('input', () => { explorer.query = searchBox.value; if (explorer.on) view.setGraph(explorerGraph().nodes, explorerGraph().edges) })
const inspector = el('div', 'sb2-inspector')

async function showInspector(title) {
  const rec = explorer.byId.get(title)?.rec
  if (!rec) { inspector.replaceChildren(); return }
  // The flowchart projection: only for specs whose flow was extracted. A spec
  // with no flow record shows nothing invented -- the empty inspector is the
  // explicit unknown.
  try {
    if (!showInspector.flow) showInspector.flow = JSON.parse(await (await fetch('./flow.json')).text())
    const f = showInspector.flow
    renderFlow(inspector, f.flows.filter((x) => title.endsWith(x.spec)), f.obj)
  } catch (e) {
    inspector.append(el('p', 'sb2-meta', 'flow unavailable: ' + e.message))
  }
  const lines = [
    `module ${rec.module} (sha ${rec.sha256.slice(0, 12)})`,
    `consts ${rec.counts.consts} | fns ${rec.counts.fns} | tests ${rec.counts.tests} | uses ${rec.counts.uses} | calls ${rec.counts.calls}`,
    rec.counts.unresolved ? `UNRESOLVED calls: ${rec.counts.unresolved}` : 'no unresolved calls',
    rec.fns.length ? 'fns: ' + rec.fns.map((f) => `${f.name}@${f.line}`).join(', ') : '',
  ].filter(Boolean)
  const pre = el('pre', 'sb2-inspect', lines.join('\n'))
  inspector.replaceChildren(pre)
  renderFlow(inspector, [], null) // no-op shape: keeps kit import used for chrome only
  inspector.querySelectorAll('.sb2-flow').forEach((n) => n.remove()) // renderFlow target is the inspector body below
  renderFlow(inspector, showInspectorFlows, showInspectorObj)
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
  root.append(inspector)
  const g = explorerGraph()
  view.setGraph(g.nodes, g.edges)
  view.onSelect = (i) => showInspector(view.currentNodes()[i]?.title)
  searchBox.addEventListener('input', () => { explorer.query = searchBox.value; const gg = explorerGraph(); view.setGraph(gg.nodes, gg.edges) })
})
