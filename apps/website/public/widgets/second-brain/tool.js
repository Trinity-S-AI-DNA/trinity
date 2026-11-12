// second-brain/tool.js -- declarative wiring for the Second Brain demo graph, on the shared
// graph-kit renderer. The words, node titles, edge labels, view modes, theme ids and the whole
// TRANSITION TABLE are constants of specs/widgets/second-brain.t27, handed over as
// window.T27_WIDGET. What each UI event does to the state is a row of that table, applied by the
// kit's mechanical interpreter; this file only maps buttons and browser events to spec event ids
// and passes data through. It holds no renderer and no transition rule of its own. Demo data only:
// nothing is fetched, sent or stored.
import { el, graphView, applyTheme } from '../graph-kit.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

// --- Data: straight from the spec's constants --------------------------------------
const nodes = (W.SAY_NODE_TITLES || []).map((title, i) => ({
  title,
  kind: (W.SAY_NODE_KINDS || [])[i] || 'concept',
}))
const edges = (W.K_EDGE_SRC || []).map((src, i) => ({
  src: Number(src),
  dst: Number((W.K_EDGE_DST || [])[i]),
  label: (W.SAY_EDGE_LABELS || [])[i] || '',
}))
const viewModes = W.SAY_VIEW_MODES || ['discs', 'squares']
const themeIds = W.SAY_THEME_IDS || ['slate', 'paper']
const kindNames = ['all', ...new Set(nodes.map((n) => n.kind))]
const T = W.K_TRANSITIONS || []

// --- One interaction state, in the spec's own field order ---------------------------
const state = { selected: null, filter: 0, panX: 0, panY: 0, zoomMilli: 1000 }
let mode = viewModes[0]

const view = graphView(root, {
  nodes, edges, state, transitions: T, kindNames,
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
const modeBtns = viewModes.map((m) => button(modeGroup, m, () => { view.event(W.K_EVENT_MODE); mode = m; view.draw() }))
let theme = themeIds[0]
const themeGroup = group('theme')
const themeBtns = themeIds.map((t) => button(themeGroup, t, () => { theme = t; view.event(W.K_EVENT_THEME); view.applyTheme(t) }))
const filterGroup = group('filter')
const filterBtns = kindNames.map((f, i) => button(filterGroup, f, () => view.event(W.K_EVENT_FILTER, i)))
const zoomGroup = group('zoom')
button(zoomGroup, '+', () => view.event(W.K_EVENT_WHEEL, 1200))
button(zoomGroup, '-', () => view.event(W.K_EVENT_WHEEL, 833))
button(zoomGroup, 'reset', () => view.event(W.K_EVENT_RESET))

root.prepend(head)

function sync() {
  modeBtns.forEach((b, i) => b.classList.toggle('sb2-on', viewModes[i] === mode))
  themeBtns.forEach((b, i) => b.classList.toggle('sb2-on', themeIds[i] === theme))
  filterBtns.forEach((b, i) => b.classList.toggle('sb2-on', i === state.filter))
}

applyTheme(root, themeIds[0])
sync()
