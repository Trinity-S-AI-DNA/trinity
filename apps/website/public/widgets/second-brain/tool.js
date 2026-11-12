// second-brain/tool.js -- declarative wiring for the Second Brain demo graph, on the shared
// graph-kit renderer. The words, node titles, edge labels, view modes and theme ids are constants
// of specs/widgets/second-brain.t27, handed over as window.T27_WIDGET; the drawing, pan, zoom,
// selection and themes live in ../graph-kit.js. This file holds no renderer of its own: data in,
// kit calls out. Demo data only: nothing is fetched, sent or stored.
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

// --- One interaction state, independent of view mode and theme ----------------------
const state = { selected: null, filter: 'all', panX: 0, panY: 0, zoom: 1 }
let mode = viewModes[0]

const view = graphView(root, { nodes, edges, state, note: W.SAY_NOTE, mode: () => mode })

// --- Controls over the kit's chrome, built from the spec's words ---------------------
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
const modeBtns = viewModes.map((m) => button(modeGroup, m, () => { mode = m; view.draw() }))
let theme = themeIds[0]
const themeGroup = group('theme')
const themeBtns = themeIds.map((t) => button(themeGroup, t, () => { theme = t; view.applyTheme(t) }))
const filterGroup = group('filter')
const kinds = ['all', ...new Set(nodes.map((n) => n.kind))]
const filterBtns = kinds.map((f) => button(filterGroup, f, () => view.setFilter(f)))
const zoomGroup = group('zoom')
button(zoomGroup, '+', () => view.zoomBy(1.2))
button(zoomGroup, '-', () => view.zoomBy(1 / 1.2))
button(zoomGroup, 'reset', () => view.reset())

root.prepend(head)

function sync() {
  modeBtns.forEach((b, i) => b.classList.toggle('sb2-on', viewModes[i] === mode))
  themeBtns.forEach((b, i) => b.classList.toggle('sb2-on', themeIds[i] === theme))
  filterBtns.forEach((b, i) => b.classList.toggle('sb2-on', kinds[i] === state.filter))
}

applyTheme(root, themeIds[0])
sync()
