// second-brain/tool.js -- declarative wiring for the Second Brain demo graph, on the shared
// graph-kit renderer. The words, node titles, edge labels, view modes, theme ids and the whole
// TRANSITION TABLE are constants of specs/widgets/second-brain.t27, handed over as
// window.T27_WIDGET. What each UI event does to the state is a row of that table, applied by the
// kit's mechanical interpreter; this file only maps buttons and browser events to spec event ids
// and passes data through. It holds no renderer and no transition rule of its own. Demo data only:
// nothing is fetched, sent or stored.
import { el, graphView, applyTheme } from '../graph-kit.js'
import {
  view_zoom_in as viewZoomIn,
  view_zoom_out as viewZoomOut,
  view_toggle_selected as viewToggleSelected,
  K_TRANSITIONS,
  K_EVENT_THEME, K_EVENT_MODE, K_EVENT_RESET, K_EVENT_FILTER, K_EVENT_NODE, K_EVENT_WHEEL, K_EVENT_PAN,
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
  paddingX: Number(K_VIEW_PADDING_X), paddingY: Number(K_VIEW_PADDING_Y),
  note: W.SAY_NOTE, mode: () => mode,
})

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
