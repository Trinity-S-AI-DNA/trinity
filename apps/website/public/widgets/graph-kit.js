// graph-kit.js -- the one node-link renderer widgets share, on the dsp-kit pattern: it decides
// nothing about a screen. A widget hands it nodes, edges, one mutable interaction state
// ({ selected, filter, panX, panY, zoom }) and the current view mode; the kit draws the SVG,
// wires pan, wheel-zoom and node clicks, and writes the state back through onChange. Words come
// from the widget's spec via window.T27_WIDGET; the kit holds none of its own. Themes are the
// app-level templates of theme.css (slate, paper): the kit only puts their class on the document
// element and consumes the app's --w-* semantic tokens, it owns no palette values. Switching a
// theme restyles every screen that reads the tokens and never touches data or interaction state.
// Trusted kit: changes to this file go through review on their own, like dsp-kit.js and hive-kit.js.
// This kit's own el(tag, className, text). dsp-kit's el(tag, attrs, ...kids) has a different
// second argument; re-exporting it here made every .sb2-* class silently drop (a string attrs
// turns into junk attributes), and the graph drew black-on-black. Do not swap them again.
const el = (tag, cls, text) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text != null) n.textContent = String(text)
  return n
}

const SVG_NS = 'http://www.w3.org/2000/svg'
export const THEMES = ['slate', 'paper']

// The app's theme templates, one link; widget.css owns the token names, theme.css the values.
const themeCss = document.createElement('link')
themeCss.rel = 'stylesheet'
themeCss.href = new URL('./theme.css', import.meta.url).href
document.head.appendChild(themeCss)

const css = document.createElement('style')
css.textContent = `
/* structure only: every colour here is an app token, never a palette value */
.sb2{background:var(--w-panel);color:var(--w-text);padding:12px;border:1px solid var(--w-line)}
.sb2-head{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:10px}
.sb2-group{display:flex;gap:4px;align-items:center}
.sb2-group-label{font:11px sans-serif;color:var(--w-muted)}
.sb2-btn{font:12px sans-serif;padding:2px 10px;border:1px solid var(--w-line);background:var(--w-panel);color:var(--w-text);cursor:pointer}
.sb2-btn.sb2-on{background:var(--w-green);color:var(--w-bg);border-color:var(--w-green)}
.sb2-viewport{touch-action:none;max-width:640px;margin:0 auto;cursor:grab;user-select:none}
.sb2-viewport:active{cursor:grabbing}
.sb2 svg{display:block;width:100%;height:auto;aspect-ratio:1}
.sb2 .sb2-edge{stroke:var(--w-line);stroke-width:1.5}
.sb2 .sb2-edge-quiet{stroke:var(--w-subtle);stroke-dasharray:4 3}
.sb2 .sb2-edge-label{font:10px sans-serif;fill:var(--w-muted)}
.sb2 .sb2-title{font:bold 13px sans-serif;fill:var(--w-text)}
.sb2 .sb2-node{cursor:pointer}
.sb2 .sb2-disc{fill:var(--w-panel);stroke:var(--w-text);stroke-width:1.5}
.sb2 .sb2-square{fill:var(--w-panel);stroke:var(--w-text);stroke-width:1.5}
.sb2 .sb2-on .sb2-disc,.sb2 .sb2-on .sb2-square{fill:var(--w-gold);stroke-width:2.5}
.sb2 .sb2-label{font:bold 11px sans-serif;fill:var(--w-text)}
.sb2 .sb2-state{font:12px monospace;text-align:center;color:var(--w-muted);margin:8px 0}
.sb2 .sb2-note{font:12px sans-serif;color:var(--w-muted);max-width:640px;margin:10px auto 0}
`
document.head.appendChild(css)

const sv = (tag, attrs, text) => {
  const n = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, String(v))
  if (text != null) n.textContent = String(text)
  return n
}

/** Apply an app-level theme template by id on the document element; false if the id is unknown. */
export function applyTheme(_rootEl, id) {
  if (!THEMES.includes(id)) return false
  document.documentElement.classList.remove(...THEMES.map((t) => `sb-theme-${t}`))
  document.documentElement.classList.add(`sb-theme-${id}`)
  return true
}

/**
 * A node-link view. nodes: [{title, kind}]; edges: [{src, dst, label}]; state is one shared
 * {selected, filter, panX, panY, zoom}; mode() returns the current view mode; draw(mode) renders.
 * Returns {applyTheme, setFilter, zoomBy, reset, draw} — the widget's whole control surface.
 */
export function graphView(rootEl, { nodes, edges, state, mode, draw, onChange, note }) {
  rootEl.classList.add('sb2')

  const viewport = el('div', 'sb2-viewport')
  const svg = sv('svg', { viewBox: '-200 -200 400 400', role: 'img' })
  const inner = sv('g', {})
  svg.append(inner)
  viewport.append(svg)
  const status = el('div', 'sb2-state')
  const noteEl = note ? el('p', 'sb2-note', note) : null
  rootEl.append(viewport, status, ...(noteEl ? [noteEl] : []))

  const R = 110
  const POS = nodes.map((_, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2
    return { x: Math.cos(a) * R, y: Math.sin(a) * R }
  })

  let drag = null
  viewport.addEventListener('pointerdown', (ev) => {
    drag = { x: ev.clientX, y: ev.clientY }
    viewport.setPointerCapture(ev.pointerId)
  })
  viewport.addEventListener('pointermove', (ev) => {
    if (!drag) return
    state.panX += ev.clientX - drag.x
    state.panY += ev.clientY - drag.y
    drag = { x: ev.clientX, y: ev.clientY }
    render()
    onChange?.()
  })
  viewport.addEventListener('pointerup', () => { drag = null })
  viewport.addEventListener('wheel', (ev) => {
    ev.preventDefault()
    state.zoom = Math.max(0.4, Math.min(3, state.zoom * (ev.deltaY > 0 ? 0.9 : 1.1)))
    render()
    onChange?.()
  }, { passive: false })

  const visible = (n) => state.filter === 'all' || n.kind === state.filter
  const edgeVisible = (e) => state.filter === 'all' || nodes[e.src].kind === state.filter || nodes[e.dst].kind === state.filter

  function nodeG(i, shape) {
    const on = state.selected === i
    const p = POS[i]
    const g = sv('g', { class: 'sb2-node' + (on ? ' sb2-on' : ''), role: 'button', 'aria-label': nodes[i].title })
    if (shape === 'square') g.append(sv('rect', { x: p.x - 12, y: p.y - 12, width: 24, height: 24, class: 'sb2-square' }))
    else g.append(sv('circle', { cx: p.x, cy: p.y, r: on ? 26 : 20, class: 'sb2-disc' }))
    const t = sv('text', { x: p.x, y: p.y + (shape === 'square' ? 26 : 4), 'text-anchor': 'middle', class: 'sb2-label' }, nodes[i].title)
    g.append(t)
    g.addEventListener('click', () => { state.selected = on ? null : i; render(); onChange?.() })
    return g
  }

  /** The two view modes the kit ships: discs with quiet edges, or squares with labelled edges. */
  function render() {
    const m = mode()
    // Draw straight into `inner`: a nested <svg> here would open its own viewport at (0,0) of the
    // outer coordinate space and fall outside the outer viewBox -- an empty graph area.
    inner.replaceChildren(sv('title', {}, `${nodes.length} nodes, ${edges.length} edges, mode ${m}`))
    if (m === 'squares') {
      for (const e of edges) {
        if (!edgeVisible(e)) continue
        const a = POS[e.src], b = POS[e.dst]
        inner.append(sv('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'sb2-edge sb2-edge-quiet' }))
        inner.append(sv('text', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 5, 'text-anchor': 'middle', class: 'sb2-edge-label' }, e.label))
      }
    } else {
      for (const e of edges) {
        if (!edgeVisible(e)) continue
        const a = POS[e.src], b = POS[e.dst]
        inner.append(sv('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'sb2-edge' }))
      }
    }
    nodes.forEach((n, i) => { if (visible(n)) inner.append(nodeG(i, m === 'squares' ? 'square' : 'disc')) })
    inner.setAttribute('transform', `translate(${state.panX} ${state.panY}) scale(${state.zoom})`)
    const sel = state.selected == null ? 'none' : `${state.selected}: ${nodes[state.selected].title}`
    status.textContent = `mode ${m} | selected ${sel} | filter ${state.filter} | zoom ${state.zoom.toFixed(2)} | pan ${Math.round(state.panX)},${Math.round(state.panY)}`
  }

  render()
  return {
    draw: render,
    applyTheme: (id) => applyTheme(rootEl, id),
    setFilter: (f) => { state.filter = f; state.selected = null; render(); onChange?.() },
    zoomBy: (k) => { state.zoom = Math.max(0.4, Math.min(3, state.zoom * k)); render(); onChange?.() },
    reset: () => { state.zoom = 1; state.panX = 0; state.panY = 0; state.selected = null; render(); onChange?.() },
  }
}

export { el }
