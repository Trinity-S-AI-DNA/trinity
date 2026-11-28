// nn-kit.js -- the drawing the neural-networks widgets share, on top of dsp-kit.js (sliders, presets,
// the URL hash, stat tiles, plot axes): function curves you drag along, bar charts, heat-maps, the
// diverging and heat colour scales, and node-link diagrams. It computes nothing about networks:
// every value a widget shows comes from that widget's ./logic.js, the fn bodies of a gHashTag/t27
// specs/ml spec compiled to wasm. Every word is a SAY_ and every range a K_ constant of the
// widget's own spec (window.T27_WIDGET). Inputs stay in this tab and in the URL hash.
import { COLORS, el, svgEl } from './dsp-kit.js'

export * from './dsp-kit.js'

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./nn-kit.css', import.meta.url).href
document.head.appendChild(css)

/** A spec number written in hundredths (the widget specs hold integers only), as a number. */
export const centi = (v) => Number(v) / 100

/** A value for the page, with a fixed number of decimals and an honest minus sign. */
export const fmt = (v, digits = 3) => (Number.isFinite(v) ? v.toFixed(digits).replace(/^-(0\.0*)$/, '$1').replace('-', '−') : String(v))

const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t))
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`
const NEG = [255, 77, 109]
const MID = [10, 18, 16]
const POS = [0, 255, 136]

/** Diverging colour: pink below zero, near black at zero, green above; m is the value at full colour. */
export function tone(v, m = 1) {
  const t = Math.max(-1, Math.min(1, m ? v / m : 0))
  return rgb(t < 0 ? mix(MID, NEG, -t) : mix(MID, POS, t))
}

const HEAT = [[8, 12, 30], [56, 189, 248], [0, 255, 136], [255, 215, 0], [255, 255, 255]]
/** Sequential colour for t in 0..1: deep blue, cyan, green, gold, white. */
export function heatTone(t) {
  const x = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0)) * (HEAT.length - 1)
  const i = Math.min(HEAT.length - 2, Math.floor(x))
  return rgb(mix(HEAT[i], HEAT[i + 1], x - i))
}

/** Black or white text, whichever reads on the fill. */
const inkOn = (fill) => {
  const [r, g, b] = fill.match(/\d+/g).map(Number)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140 ? '#020403' : '#ffffff'
}

/**
 * Drag along a plot: a pointer anywhere on the SVG moves the cursor to that x (in data units,
 * clamped to the plot). The whole drawing is the target, so a finger never has to find a dot.
 */
export function dragX(svg, p, o, onX) {
  svg.nnPlot = { x0: o.x0, x1: o.x1, left: p.left, right: p.right }
  if (svg.dataset.nnDrag) return
  svg.dataset.nnDrag = '1'
  svg.classList.add('nn-drag')
  const toX = (ev) => {
    const box = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    const sx = ((ev.clientX - box.left) / box.width) * vb.width
    const cur = svg.nnPlot
    const v = cur.x0 + ((sx - cur.left) / (vb.width - cur.left - cur.right)) * (cur.x1 - cur.x0)
    return Math.max(cur.x0, Math.min(cur.x1, v))
  }
  let down = false
  svg.addEventListener('pointerdown', (ev) => { down = true; svg.setPointerCapture?.(ev.pointerId); onX(toX(ev)) })
  svg.addEventListener('pointermove', (ev) => { if (down) onX(toX(ev)) })
  const up = () => { down = false }
  svg.addEventListener('pointerup', up)
  svg.addEventListener('pointercancel', up)
}

/** A vertical cursor at x with a dot on each curve value given as [y, colour]. */
export function cursor(svg, p, x, dots) {
  svg.append(svgEl('line', { x1: p.x(x), x2: p.x(x), y1: p.top, y2: p.clampY(-Infinity), class: 'nn-cursor' }))
  for (const [y, c] of dots) {
    if (!Number.isFinite(y)) continue
    svg.append(svgEl('circle', { cx: p.x(x), cy: p.clampY(y), r: 9, fill: c, opacity: 0.25 }))
    svg.append(svgEl('circle', { cx: p.x(x), cy: p.clampY(y), r: 5, fill: c, stroke: '#020403', 'stroke-width': 2 }))
  }
}

/** Samples a spec function on [x0, x1] for a curve: [[x, f(x)], ...]. */
export function sample(f, x0, x1, n = 160) {
  const out = []
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    out.push([x, f(x)])
  }
  return out
}

/** A legend row: [[word, colour, dashed?], ...]. */
export const legend = (items) => el('p', { class: 'dk-legend' }, items.map(([w, c, dashed]) => el('span', {}, el('i', { style: `background:${c};${dashed ? 'opacity:0.6' : ''}` }), w)))

/**
 * A bar chart into an SVG. o: { values, labels, colors, lo, hi, fmt, w, h, title }. Bars grow from
 * zero, each value printed on its bar.
 */
export function bars(svg, o) {
  const w = o.w ?? 640, h = o.h ?? 260, left = 44, right = 12, top = 26, bottom = 34
  svg.replaceChildren()
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  const lo = o.lo ?? 0, hi = o.hi ?? 1
  const py = (v) => h - bottom - ((v - lo) / (hi - lo || 1)) * (h - top - bottom)
  svg.append(svgEl('rect', { x: left, y: top, width: w - left - right, height: h - top - bottom, class: 'dk-plotbg' }))
  for (const t of o.ticks ?? []) {
    svg.append(svgEl('line', { x1: left, x2: w - right, y1: py(t), y2: py(t), class: 'dk-grid' }))
    svg.append(svgEl('text', { x: left - 6, y: py(t) + 4, class: 'dk-tick', 'text-anchor': 'end' }, o.tickFmt ? o.tickFmt(t) : t))
  }
  const n = o.values.length
  const slot = (w - left - right) / n
  const bw = Math.min(110, slot * 0.64)
  o.values.forEach((v, i) => {
    const c = o.colors?.[i] ?? COLORS[i % COLORS.length]
    const x = left + slot * i + (slot - bw) / 2
    const y0 = py(Math.max(lo, Math.min(hi, 0))), y1 = py(Math.max(lo, Math.min(hi, v)))
    svg.append(svgEl('rect', { x, y: Math.min(y0, y1), width: bw, height: Math.max(1, Math.abs(y1 - y0)), rx: 6, fill: c, class: 'nn-bar' }))
    svg.append(svgEl('text', { x: x + bw / 2, y: Math.min(y0, y1) - 7, class: 'nn-bar-value', 'text-anchor': 'middle', fill: c }, o.fmt ? o.fmt(v) : fmt(v)))
    svg.append(svgEl('text', { x: x + bw / 2, y: h - 12, class: 'dk-tick', 'text-anchor': 'middle' }, o.labels?.[i] ?? i))
  })
}

/**
 * A heat-map into an SVG. o: { rows, cols, value(r, c), color(v) (default heatTone over lo..hi),
 * lo, hi, fmt, rowLabels, colLabels, w, cell, cellH (row height, default cell), mark(r, c) -> 'on' |
 * 'dim' | '', onTap(r, c) }.
 * Each cell prints its value; a tapped cell calls onTap. Returns the cell size.
 */
export function heat(svg, o) {
  const left = o.rowLabels ? (o.labelWidth ?? 74) : 6, top = o.colLabels ? 26 : 6
  const w = o.w ?? 640
  const cell = o.cell ?? Math.min(96, (w - left - 6) / o.cols)
  const ch = o.cellH ?? cell
  const h = top + ch * o.rows + 6
  svg.replaceChildren()
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  // A small drawing scales up to the phone's width but not past a readable size on a desktop.
  svg.style.maxWidth = `${Math.round(w * 1.3)}px`
  const color = o.color ?? ((v) => heatTone(((v - (o.lo ?? 0)) / ((o.hi ?? 1) - (o.lo ?? 0) || 1))))
  const x0 = left + (w - left - 6 - cell * o.cols) / 2
  for (let c = 0; c < o.cols; c++) if (o.colLabels) svg.append(svgEl('text', { x: x0 + cell * (c + 0.5), y: 18, class: 'dk-tick', 'text-anchor': 'middle' }, o.colLabels[c]))
  for (let r = 0; r < o.rows; r++) {
    if (o.rowLabels) svg.append(svgEl('text', { x: x0 - 8, y: top + ch * (r + 0.5) + 4, class: 'dk-tick', 'text-anchor': 'end' }, o.rowLabels[r]))
    for (let c = 0; c < o.cols; c++) {
      const v = o.value(r, c)
      const fill = color(v)
      const m = o.mark?.(r, c) ?? ''
      const g = svgEl('g', { class: `nn-cell ${m ? `nn-${m}` : ''}` })
      const gap = ch < 20 ? 0.5 : 1.5
      g.append(svgEl('rect', { x: x0 + cell * c + 1.5, y: top + ch * r + gap, width: cell - 3, height: ch - 2 * gap, rx: Math.min(10, ch / 6), fill }))
      if (o.fmt !== null && ch >= 26) g.append(svgEl('text', { x: x0 + cell * (c + 0.5), y: top + ch * (r + 0.5) + 4, 'text-anchor': 'middle', class: 'nn-cell-text', fill: inkOn(fill), style: `font-size:${Math.max(9, Math.min(15, cell / 4.2))}px` }, (o.fmt ?? fmt)(v)))
      if (o.onTap) {
        g.setAttribute('role', 'button')
        g.setAttribute('tabindex', '0')
        g.addEventListener('click', () => o.onTap(r, c))
        g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); o.onTap(r, c) } })
      }
      svg.append(g)
    }
  }
  return { cell, cellH: ch, x0, top, h }
}

/**
 * A node-link diagram. layers: [[{ label, value, color }], ...] left to right; edges:
 * [{ from: [layer, i], to: [layer, j], value, label }] coloured by tone(value, m). o: { w, h, m }.
 */
export function net(svg, layers, edges, o = {}) {
  const w = o.w ?? 640, h = o.h ?? 300
  svg.replaceChildren()
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  svg.style.maxWidth = `${Math.round(w * 1.3)}px`
  const pos = layers.map((nodes, l) => nodes.map((_, i) => [70 + ((w - 140) * l) / Math.max(1, layers.length - 1), h / 2 + (i - (nodes.length - 1) / 2) * Math.min(86, (h - 60) / Math.max(1, nodes.length - 1 || 1))]))
  for (const e of edges) {
    const [a, b] = [pos[e.from[0]][e.from[1]], pos[e.to[0]][e.to[1]]]
    const m = o.m ?? 1
    svg.append(svgEl('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: tone(e.value, m), 'stroke-width': 2 + 6 * Math.min(1, Math.abs(e.value) / m), 'stroke-linecap': 'round', opacity: 0.9 }))
    if (e.label != null) {
      const t = 0.62
      svg.append(svgEl('text', { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t - 6, class: 'nn-edge-label', 'text-anchor': 'middle' }, e.label))
    }
  }
  layers.forEach((nodes, l) => nodes.forEach((n, i) => {
    const [x, y] = pos[l][i]
    svg.append(svgEl('circle', { cx: x, cy: y, r: 24, fill: n.color ?? '#0b1512', stroke: n.ring ?? COLORS[l % COLORS.length], 'stroke-width': 3 }))
    svg.append(svgEl('text', { x, y: y + 5, 'text-anchor': 'middle', class: 'nn-node-text', fill: n.color ? inkOn(n.color) : '#fff' }, n.value ?? ''))
    if (n.label) svg.append(svgEl('text', { x, y: y - 32, 'text-anchor': 'middle', class: 'dk-txt-dim' }, n.label))
  }))
}

/** A heading question over the widget: the question the lesson opens with. */
export const ask = (text) => el('p', { class: 'nn-ask' }, text)
