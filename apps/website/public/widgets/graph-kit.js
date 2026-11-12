// graph-kit.js -- the one node-link renderer widgets share, on the dsp-kit pattern: it decides
// nothing about a screen. A widget hands it nodes, edges, one interaction state and the spec's
// TRANSITION TABLE (K_TRANSITIONS: rows of [event, field, op, arg]); the only behaviour the kit
// owns is the mechanical interpreter that applies rows to the state and the DOM/SVG work that
// draws the result. Every rule -- what a theme change, a mode change, a reset, a filter pick, a
// node click, a wheel tick or a drag does to the state -- is a row of the spec's table, compiler
// tested in the spec itself. Words come from window.T27_WIDGET; the kit holds none of its own.
// Themes are the app-level templates of theme.css (slate, paper): the kit puts their class on the
// document element and consumes the app's --w-* tokens, it owns no palette values and no rules.
// Trusted kit: changes to this file go through review on their own, like dsp-kit.js and hive-kit.js.

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
.sb2{background:var(--w-panel);color:var(--w-text);padding:12px;border:1px solid var(--w-line);font-family:var(--sb2-font,sans-serif);font-size:var(--sb2-fz-base,15px);line-height:var(--sb2-lh-base,1.6);max-width:var(--sb2-max-w,480px);margin:0 auto}
.sb2-head{display:flex;flex-wrap:wrap;gap:var(--sb2-gap,12px);justify-content:center;margin-bottom:10px}
.sb2-group{display:flex;gap:4px;align-items:center}
.sb2-group-label{font-size:var(--sb2-fz-sm,13px);color:var(--w-muted)}
/* the pill button: the reference's own .btn-sm scale, inverted when chosen */
.sb2-btn{font-family:var(--sb2-font,sans-serif);font-size:var(--sb2-fz-btn,12px);letter-spacing:var(--sb2-letter,0);line-height:var(--sb2-btn-lh,1.2);padding:var(--sb2-btn-pad-y,8px) var(--sb2-btn-pad-x,14px);border:1px solid var(--w-line);border-radius:var(--sb2-radius-pill,980px);background:var(--w-panel);color:var(--w-text);cursor:pointer}
.sb2-btn:hover{border-color:var(--w-text)}
.sb2-btn:focus-visible{outline:2px solid var(--w-text);outline-offset:1px}
/* the selected control inverts: field becomes ink, ink becomes field */
.sb2-btn.sb2-on{background:var(--w-text);color:var(--w-bg);border-color:var(--w-text)}
.sb2-viewport{touch-action:none;max-width:100%;margin:0 auto;cursor:grab;user-select:none}
.sb2-viewport:active{cursor:grabbing}
.sb2 svg{display:block;width:100%;height:auto;aspect-ratio:1}
.sb2 .sb2-edge{stroke:var(--w-line);stroke-width:1.5}
.sb2 .sb2-edge-quiet{stroke:var(--w-subtle);stroke-dasharray:4 3}
.sb2 .sb2-edge-label{font:10px sans-serif;fill:var(--w-muted)}
.sb2 .sb2-title{font:bold 13px sans-serif;fill:var(--w-text)}
.sb2 .sb2-node{cursor:pointer}
.sb2 .sb2-disc{fill:var(--w-panel);stroke:var(--w-text);stroke-width:1.5}
.sb2 .sb2-square{fill:var(--w-panel);stroke:var(--w-text);stroke-width:1.5}
/* the selected node inverts the same way, its label with it */
.sb2 .sb2-on .sb2-disc,.sb2 .sb2-on .sb2-square{fill:var(--w-text);stroke-width:2.5}
.sb2 .sb2-on .sb2-label{fill:var(--w-bg)}
.sb2 .sb2-label{font:bold 11px sans-serif;fill:var(--w-text)}
.sb2 .sb2-state{font-size:var(--sb2-fz-sm,13px);text-align:center;color:var(--w-muted);margin:8px 0}
.sb2 .sb2-note{font-size:var(--sb2-fz-sm,13px);color:var(--w-muted);max-width:var(--sb2-max-w,480px);margin:10px auto 0}
.sb2.sb2-wide{max-width:1200px}
.sb2-search{font:var(--sb2-fz-btn,12px) var(--sb2-font,sans-serif);padding:var(--sb2-btn-pad-y,8px) var(--sb2-btn-pad-x,14px);border:1px solid var(--w-line);border-radius:var(--sb2-radius-pill,980px);background:var(--w-panel);color:var(--w-text);width:100%;max-width:420px;display:block;margin:0 auto 10px}
.sb2-search:focus-visible{outline:2px solid var(--w-text);outline-offset:1px}
.sb2-inspect{font:11px monospace;color:var(--w-muted);background:var(--w-panel);border:1px solid var(--w-line);padding:8px;white-space:pre-wrap;max-height:180px;overflow:auto}
`
document.head.appendChild(css)

// This kit's own el(tag, className, text). dsp-kit's el(tag, attrs, ...kids) has a different
// second argument; re-exporting it here made every .sb2-* class silently drop (a string attrs
// turns into junk attributes), and the graph drew black-on-black. Do not swap them again.
const el = (tag, cls, text) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text != null) n.textContent = String(text)
  return n
}

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
 * The mechanical interpreter of the spec's transition table. rows: flat quads [event, field, op,
 * arg]; the ops: 1 zero, 2 set to arg, 3 toggle with payload, 4 multiply by arg (0 = the payload,
 * in milli), 5 add the payload (a pan payload is [dx, dy], consumed per row in order). Returns the
 * state; the kit renders whatever the table produced. No rule lives here.
 */
export function applyEvent(state, rows, eventId, payload, ops) {
  // The arithmetic of ops 3 (toggle) and 4 (zoom) is the generated module's
  // (viewToggleSelected, viewZoomIn, viewZoomOut, viewResetZoom from
  // second-brain-view-logic.t27 via t27c gen-js): this interpreter only reads
  // the table and calls. `ops` carries them; without it the ops refuse, so the
  // kit can never silently fall back to a second, hand copy of the same math.
  if (!ops || typeof ops.toggle !== 'function' || typeof ops.zoomIn !== 'function' || typeof ops.zoomOut !== 'function') {
    throw new Error('applyEvent: the generated transition functions are required; this interpreter holds no math of its own')
  }
  let panIdx = 0
  for (let i = 0; i + 3 < rows.length; i += 4) {
    if (rows[i] !== eventId) continue
    const field = rows[i + 1]
    const op = rows[i + 2]
    const arg = rows[i + 3]
    const keys = ['selected', 'filter', 'panX', 'panY', 'zoomMilli']
    const key = keys[field]
    if (op === 1) state[key] = 0
    else if (op === 2) state[key] = (arg === 0 ? payload : arg)
    else if (op === 3) state[key] = ops.toggle(toModel(state[key]), payload ?? 0)
    else if (op === 4) {
      const factor = arg || payload
      state[key] = factor >= 1000
        ? ops.zoomIn(state[key])
        : ops.zoomOut(state[key])
    }
    else if (op === 5) { const d = Array.isArray(payload) ? payload[panIdx] : payload; state[key] += d; panIdx++ }
  }
  state.selected = toHost(state.selected)
  return state
}

// --- The model boundary, as named conversions rather than bare literals -------
// The spec's state is u16 and says `255 = none`; the host says `null`. Every
// crossing is one of these two functions, and stateBoundaryTest asserts both
// directions round-trip, so the two forms can never drift apart silently.
// `none` is the generated contract's value, delivered by setModelNone from the
// injected geo contract. Conversions refuse to run before it arrives: a
// hardcoded number here would be a second statement of the spec's own.
let MODEL_NONE = null
export function setModelNone(v) {
  const n = Number(v)
  if (!(Number.isInteger(n) && n >= 0)) throw new Error('graphView: the model none value must be a non-negative integer from the contract')
  MODEL_NONE = n
}
const toModel = (v) => {
  if (MODEL_NONE == null) throw new Error('graphView: setModelNone has not been called; the model boundary is unknown')
  return v == null ? MODEL_NONE : v
}
const toHost = (v) => {
  if (MODEL_NONE == null) throw new Error('graphView: setModelNone has not been called; the model boundary is unknown')
  return v === MODEL_NONE ? null : v
}

/** Both directions of the none boundary, asserted for a given contract value. */
export function stateBoundaryTest(noneValue) {
  setModelNone(noneValue)
  const ok = toHost(toModel(null)) === null
    && toModel(toHost(noneValue)) === noneValue
    && toModel(2) === 2 && toHost(2) === 2
  MODEL_NONE = null
  return ok
}

/**
 * A node-link view. nodes: [{title, kind}]; edges: [{src, dst, label}]; state is one shared
 * {selected, filter, panX, panY, zoomMilli}; mode() returns the current view mode; kindNames
 * names the filter indexes; transitions is the spec's flat row table. Returns {event, applyTheme,
 * draw} — the widget's whole control surface: every change goes through event(), never around it.
 */
export function graphView(rootEl, { nodes: initialNodes, edges: initialEdges, state, mode, kindNames, transitions, ops, geo, onChange, note, paddingX, paddingY, onSelect }) {
  let nodes = initialNodes
  let edges = initialEdges
  const options = { paddingX, paddingY }
  // The geometry functions and the model's none constant are the generated
  // contract, injected like ops; without them the kit refuses -- it holds no
  // geometric math of its own.
  if (!geo || typeof geo.discReachSq !== 'function' || typeof geo.squareW !== 'function'
    || typeof geo.squareH !== 'function' || typeof geo.squareReachT !== 'function'
    || geo.selectedNone == null) {
    throw new Error('graphView: the generated geometry contract is required; this kit computes no geometry itself')
  }
  setModelNone(geo.selectedNone)
  rootEl.classList.add('sb2')

  const viewport = el('div', 'sb2-viewport')
  const svg = sv('svg', { viewBox: '-200 -200 400 400', role: 'img' })
  const inner = sv('g', {})
  svg.append(inner)
  viewport.append(svg)
  const status = el('div', 'sb2-state')
  const noteEl = note ? el('p', 'sb2-note', note) : null
  rootEl.append(viewport, status, ...(noteEl ? [noteEl] : []))

  // A node whose descriptor carries explicit geometry is drawn exactly there;
  // one without falls back to the shared circle. The SHAPES are the descriptor's
  // (SHAPE_DISC=1, SHAPE_SQUARE=2): an unknown shape number is a loud error,
  // never a guessed circle.
  const R = 110
  // Recomputed on every render: setGraph swaps the node list, and stale
  // positions from a previous graph are how explorer nodes ended up undefined.
  let POS = []
  const layout = () => {
    POS = nodes.map((n, i) => {
      if (n.x != null && n.y != null) return { x: n.x, y: n.y }
      const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2
      return { x: Math.cos(a) * R, y: Math.sin(a) * R }
    })
  }
  const SHAPE_OF = (n) => {
    if (n.shape == null) return 'disc'
    if (n.shape === 1) return 'disc'
    if (n.shape === 2) return 'square'
    throw new Error(`graphView: node "${n.title}" declares shape ${n.shape}; the descriptor knows 1 (disc) and 2 (square)`)
  }
  // The select binding the widget passes must name the node-click event (4) on
  // the selected field (0) with the toggle op (3): the descriptor and the table
  // have to agree, and disagreement stops here, loudly.
  if (nodes.some((n) => n.shape != null) &&
      !transitions.some((_, i) => i + 3 < transitions.length &&
        transitions[i] === 4 && transitions[i + 1] === 0 && transitions[i + 2] === 3)) {
    throw new Error('graphView: the transition table carries no toggle-select binding for node clicks (event 4, field 0, op 3)')
  }

  let drag = null
  viewport.addEventListener('pointerdown', (ev) => {
    drag = { x: ev.clientX, y: ev.clientY }
    viewport.setPointerCapture(ev.pointerId)
  })
  viewport.addEventListener('pointermove', (ev) => {
    if (!drag) return
    view.event(6, [ev.clientX - drag.x, ev.clientY - drag.y])
    drag = { x: ev.clientX, y: ev.clientY }
  })
  viewport.addEventListener('pointerup', () => { drag = null })
  viewport.addEventListener('wheel', (ev) => {
    ev.preventDefault()
    view.event(5, ev.deltaY > 0 ? 900 : 1100)
  }, { passive: false })

  const visible = (n) => state.filter === 0 || n.kind === kindNames[state.filter]
  const edgeVisible = (e) => state.filter === 0 || nodes[e.src].kind === kindNames[state.filter] || nodes[e.dst].kind === kindNames[state.filter]

  // Label metrics: the one measurement the host makes. The graph's coordinates,
  // shapes and the padding that keeps text off the border all come from the
  // descriptor; the host only turns "this text + this padding" into a node big
  // enough for both -- the font is never shrunk to fit a fixed node.
  const canvas = document.createElement('canvas')
  // The same face the label CSS draws with; the ink height is measured, not
  // assumed -- a taller glyph makes the node grow, never clip.
  const LABEL_FONT = 'bold 11px sans-serif'
  const measure = (text) => {
    const ctx = canvas.getContext('2d')
    ctx.font = LABEL_FONT
    const m = ctx.measureText(text)
    const h = (m.actualBoundingBoxAscent ?? 8) + (m.actualBoundingBoxDescent ?? 3)
    return { w: m.width, h }
  }
  const PAD_X = Number(options.paddingX ?? 16)
  const PAD_Y = Number(options.paddingY ?? 12)
  if (!(PAD_X >= 0 && PAD_Y >= 0)) throw new Error('graphView: padding must be non-negative graph distances')
  // A node is at least its label box plus the descriptor's padding, on both
  // axes. A disc must clear the label's corners, so its radius is that box's
  // far corner plus padding -- the circular border, not just the text width.
  // Selection adds a visual ring margin; the padding stays true underneath.
  const sizeOf = (n, shape, on) => {
    const { w, h } = measure(n.title)
    if (shape === 'square') {
      return { kind: 'square', w: Math.ceil(geo.squareW(w, PAD_X)), h: Math.ceil(geo.squareH(h, PAD_Y)) }
    }
    return { kind: 'disc', r: Math.ceil(Math.sqrt(geo.discReachSq(w, h, PAD_X, PAD_Y))) + (on ? 4 : 0) }
  }
  // Edges attach to the borders the sizes produced: each endpoint is pulled
  // back from the node centre to that node's boundary along the edge direction.
  const boundary = (i, towards, effShape) => {
    const p = POS[i]
    const s = sizeOf(nodes[i], effShape, false)
    const dx = towards.x - p.x
    const dy = towards.y - p.y
    if (s.kind === 'disc') {
      const len = Math.hypot(dx, dy) || 1
      return { x: p.x + (dx * s.r) / len, y: p.y + (dy * s.r) / len }
    }
    // Rectangle: the generated ray-rect parameter lands the point on whichever
    // side the direction hits -- x-side, y-side, or the corner between.
    const t = geo.squareReachT(s.w / 2, s.h / 2, dx, dy)
    return { x: p.x + dx * t, y: p.y + dy * t }
  }

  function nodeG(i, shape) {
    const on = state.selected === i
    const p = POS[i]
    const s = sizeOf(nodes[i], shape, on)
    const g = sv('g', { class: 'sb2-node' + (on ? ' sb2-on' : ''), role: 'button', 'aria-label': nodes[i].title })
    if (s.kind === 'square') {
      g.append(sv('rect', { x: p.x - s.w / 2, y: p.y - s.h / 2, width: s.w, height: s.h, class: 'sb2-square' }))
      g.append(sv('text', { x: p.x, y: p.y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'sb2-label' }, nodes[i].title))
    } else {
      g.append(sv('circle', { cx: p.x, cy: p.y, r: s.r, class: 'sb2-disc' }))
      g.append(sv('text', { x: p.x, y: p.y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'sb2-label' }, nodes[i].title))
    }
    g.addEventListener('click', () => { view.onSelect?.(i); view.event(4, i) })
    return g
  }

  /** Draw straight into `inner`: a nested <svg> here would open its own viewport at (0,0) of the
   *  outer coordinate space and fall outside the outer viewBox -- an empty graph area. */
  function render() {
    layout()
    const m = mode()
    inner.replaceChildren(sv('title', {}, `${nodes.length} nodes, ${edges.length} edges, mode ${m}`))
    // The shape each node is drawn with THIS render. Edges must trim to these
    // same shapes: trimming a squares-mode edge to the descriptor's disc shape
    // leaves the line ending inside the drawn border -- the exact gap the
    // Beta-Gamma and Zeta-Epsilon edges showed.
    const effShapes = nodes.map((n) => (m === 'squares' ? 'square' : SHAPE_OF(n)))
    // How far a connection label sits off its line, perpendicular, so it never
    // lies on the stroke or under a border.
    const LABEL_OFF = 12
    for (const e of edges) {
      if (!edgeVisible(e)) continue
      const a = boundary(e.src, POS[e.dst], effShapes[e.src])
      const b = boundary(e.dst, POS[e.src], effShapes[e.dst])
      inner.append(sv('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 'sb2-edge' + (m === 'squares' ? ' sb2-edge-quiet' : ''),
      }))
      if (m === 'squares') {
        // The label sits at the middle of the VISIBLE segment (border to
        // border), pushed sideways along the perpendicular. How far: the
        // smallest offset from LABEL_OFF upward whose label box overlaps no
        // drawn node -- measured, not guessed; a segment that cannot hold the
        // label at any offset carries none, since overlap is refused, not
        // squeezed.
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const len = Math.hypot(b.x - a.x, b.y - a.y)
        const lm = measure(e.label)
        const hw = lm.w / 2 + 1
        const hh = lm.h / 2 + 1
        const hits = (x, y) => nodes.some((n, i) => {
          if (!visible(n)) return false
          const s = sizeOf(n, effShapes[i], false)
          const p = POS[i]
          return x + hw > p.x - s.w / 2 && x - hw < p.x + s.w / 2 && y + hh > p.y - s.h / 2 && y - hh < p.y + s.h / 2
        })
        if (len >= 24) {
          const nx = -((b.y - a.y) / len)
          const ny = (b.x - a.x) / len
          let spot = null
          for (const off of [LABEL_OFF, 24, 36, 48, 60]) {
            if (!hits(mx + nx * off, my + ny * off)) { spot = { x: mx + nx * off, y: my + ny * off }; break }
            if (!hits(mx - nx * off, my - ny * off)) { spot = { x: mx - nx * off, y: my - ny * off }; break }
          }
          if (spot) inner.append(sv('text', {
            x: spot.x, y: spot.y,
            'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'sb2-edge-label',
          }, e.label))
        }
      }
    }
    nodes.forEach((n, i) => { if (visible(n)) inner.append(nodeG(i, effShapes[i])) })
    inner.setAttribute('transform', `translate(${state.panX} ${state.panY}) scale(${state.zoomMilli / 1000})`)
    const sel = state.selected == null ? 'none' : `${state.selected}: ${nodes[state.selected].title}`
    status.textContent = `mode ${m} | selected ${sel} | filter ${kindNames[state.filter]} | zoom ${(state.zoomMilli / 1000).toFixed(2)} | pan ${Math.round(state.panX)},${Math.round(state.panY)}`
  }

  const view = {
    event: (id, payload) => { applyEvent(state, transitions, id, payload, ops); render(); onChange?.() },
    applyTheme: (id) => applyTheme(rootEl, id),
    draw: render,
    // The explorer rebinding: search and type filters swap the visible graph
    // without rebuilding the chrome or losing state. Unknown kinds stay the
    // caller's business; the kit just draws what it is handed.
    setGraph: (nextNodes, nextEdges) => { nodes = nextNodes; edges = nextEdges; render() },
    currentNodes: () => nodes,
  }

  render()
  return view
}

export { el }
