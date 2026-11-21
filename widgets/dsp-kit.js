// dsp-kit.js -- the frame the arithmetic-and-dsp widgets share: sliders, button rows, presets, the
// URL hash, stat tiles and SVG plotting. It computes nothing about arithmetic or signals: every value
// a widget shows comes from that widget's ./logic.js, the fn bodies of a gHashTag/t27 spec compiled
// to wasm. Every word comes from the widget's spec as a SAY_ constant and every range from a K_
// constant (window.T27_WIDGET). Inputs stay in this tab and in the URL hash; nothing is sent.

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./dsp-kit.css', import.meta.url).href
document.head.appendChild(css)

export const W = window.T27_WIDGET || {}
export const root = document.getElementById('widget')

/** A word of the spec (index i of an array word). */
export const say = (k, i) => (Array.isArray(W[k]) ? W[k][i] : W[k]) ?? ''
/** A number of the spec, or a fallback while the page is opened without its spec. */
export const K = (k, fallback) => (W[k] ?? fallback)
/** "{0} of {1}" with the values put in. */
export const fill = (s, ...v) => String(s ?? '').replace(/\{(\d+)\}/g, (m, i) => (i < v.length ? String(v[i]) : m))

export const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) if (v != null) k === 'class' ? (n.className = v) : n.setAttribute(k, v)
  for (const c of kids.flat()) if (c != null) n.append(c instanceof Node ? c : String(c))
  return n
}
export const svgEl = (tag, attrs = {}, text) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, String(v))
  if (text != null) n.textContent = String(text)
  return n
}

/** The colours the widgets draw with, in order; the CSS names them --c0 .. --c6 too. */
export const COLORS = ['#00ff88', '#ffd700', '#38bdf8', '#ff6bd6', '#ff9f43', '#a78bfa', '#ff4d6d']

/** Formats a number for the page: fixed decimals, thin grouping of thousands. */
export function num(v, digits = 0) {
  if (!Number.isFinite(v)) return String(v)
  const s = Math.abs(v) >= 1e15 ? v.toExponential(3) : v.toFixed(digits)
  const [i, f] = s.split('.')
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? `.${f}` : '')
}

/**
 * The widget's controls. defs: [{ key, label, kind: 'range' | 'choice' | 'toggle', min, max, step,
 * options (choice: words), fmt (range: value -> text) }]. Values live in the URL hash, so a link
 * carries what the reader set. Returns { get, set, all, node }.
 */
export function controls(defs, presets, onChange) {
  const state = {}
  const views = {}
  const box = el('div', { class: 'dk-controls' })
  const emit = () => {
    history.replaceState(null, '', `#${new URLSearchParams(Object.entries(state).map(([k, v]) => [k, String(v)]))}`)
    onChange(state)
  }
  for (const d of defs) {
    const id = `dk-${d.key}`
    if (d.kind === 'hidden') {
      // Set by the drawing itself (a tapped bit, a dragged point), kept in the hash like the rest.
      views[d.key] = () => {}
      continue
    }
    if (d.kind === 'choice') {
      const row = el('div', { class: 'dk-choice', role: 'group', 'aria-label': d.label })
      const buttons = d.options.map((word, i) => {
        const b = el('button', { class: 't27-btn dk-chip', type: 'button' }, word)
        b.addEventListener('click', () => { set(d.key, i); clearPresets(); emit() })
        row.append(b)
        return b
      })
      views[d.key] = (v) => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === v)))
      box.append(el('div', { class: 'dk-field dk-wide' }, el('span', { class: 'dk-label' }, d.label), row))
    } else if (d.kind === 'toggle') {
      const b = el('button', { class: 't27-btn dk-chip', type: 'button', id }, d.label)
      b.addEventListener('click', () => { set(d.key, state[d.key] ? 0 : 1); clearPresets(); emit() })
      views[d.key] = (v) => b.setAttribute('aria-pressed', String(!!v))
      box.append(el('div', { class: 'dk-field dk-toggle' }, b))
    } else {
      const input = el('input', { class: 'dk-range', type: 'range', id, min: d.min, max: d.max, step: d.step ?? 1 })
      const out = el('output', { class: 'dk-value', for: id })
      input.addEventListener('input', () => { set(d.key, Number(input.value)); clearPresets(); emit() })
      views[d.key] = (v) => { input.value = String(v); out.textContent = d.fmt ? d.fmt(v) : String(v) }
      box.append(el('label', { class: 'dk-field', for: id }, el('span', { class: 'dk-label' }, d.label, out), input))
    }
  }
  const presetRow = el('div', { class: 'dk-presets', role: 'group', 'aria-label': say('SAY_PRESETS_LABEL') })
  const presetButtons = (presets?.names ?? []).map((name, i) => {
    const b = el('button', { class: 't27-btn dk-preset', type: 'button' }, name)
    b.addEventListener('click', () => pick(i))
    presetRow.append(b)
    return b
  })
  function clearPresets() { presetButtons.forEach((b) => b.setAttribute('aria-pressed', 'false')) }
  function set(key, v) {
    const d = defs.find((x) => x.key === key)
    let n = Number(v)
    if (!Number.isFinite(n)) return
    if (d.kind === 'choice') n = Math.max(0, Math.min(d.options.length - 1, Math.round(n)))
    else if (d.kind === 'hidden') n = Math.max(d.min, Math.min(d.max, Math.round(n)))
    else if (d.kind === 'toggle') n = n ? 1 : 0
    else {
      n = Math.max(d.min, Math.min(d.max, n))
      const step = d.step ?? 1
      n = Math.round((n - d.min) / step) * step + d.min
      n = Number(n.toFixed(6))
    }
    state[key] = n
    views[key](n)
  }
  function pick(i) {
    for (const d of defs) if (presets.values[d.key]) set(d.key, presets.values[d.key][i])
    presetButtons.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)))
    emit()
  }
  const node = el('div', { class: 'dk-panel' })
  if (presetButtons.length) node.append(el('p', { class: 'dk-label' }, say('SAY_PRESETS_LABEL')), presetRow)
  node.append(box)
  const start = () => {
    for (const d of defs) set(d.key, d.value ?? d.min ?? 0)
    const h = new URLSearchParams(location.hash.slice(1))
    if (defs.every((d) => h.has(d.key) && Number.isFinite(Number(h.get(d.key))))) {
      for (const d of defs) set(d.key, h.get(d.key))
      emit()
    } else pick(K('K_START_PRESET', 0))
  }
  return { node, get: (k) => state[k], set: (k, v) => { set(k, v); emit() }, all: () => ({ ...state }), start }
}

/** A row of stat tiles: [{ label, value, tone (0..6 colour index or 'bad') }]. */
export function tiles(items) {
  return el('div', { class: 'dk-tiles' }, items.map((t) => el('div', { class: `dk-tile ${t.tone === 'bad' ? 'dk-bad' : ''}`, style: Number.isInteger(t.tone) ? `--tc:${COLORS[t.tone]}` : null },
    el('span', { class: 'dk-tile-label' }, t.label), el('strong', { class: 'dk-tile-value' }, t.value))))
}

/**
 * A plot area inside an SVG: maps data to pixels and draws axes. o: { w, h, x0, x1, y0, y1, left,
 * right, top, bottom, xticks, yticks, xfmt, yfmt, xlabel, ylabel, logx }.
 */
export function plot(svg, o) {
  const left = o.left ?? 52, right = o.right ?? 14, top = o.top ?? 14, bottom = o.bottom ?? 40
  svg.setAttribute('viewBox', `0 0 ${o.w} ${o.h}`)
  const px = (v) => left + ((v - o.x0) / (o.x1 - o.x0 || 1)) * (o.w - left - right)
  const py = (v) => o.h - bottom - ((v - o.y0) / (o.y1 - o.y0 || 1)) * (o.h - top - bottom)
  const g = svgEl('g', { class: 'dk-axes' })
  g.append(svgEl('rect', { x: left, y: top, width: o.w - left - right, height: o.h - top - bottom, class: 'dk-plotbg' }))
  for (const t of o.xticks ?? []) {
    g.append(svgEl('line', { x1: px(t), x2: px(t), y1: top, y2: o.h - bottom, class: 'dk-grid' }))
    g.append(svgEl('text', { x: px(t), y: o.h - bottom + 16, class: 'dk-tick', 'text-anchor': 'middle' }, o.xfmt ? o.xfmt(t) : t))
  }
  for (const t of o.yticks ?? []) {
    g.append(svgEl('line', { x1: left, x2: o.w - right, y1: py(t), y2: py(t), class: 'dk-grid' }))
    g.append(svgEl('text', { x: left - 6, y: py(t) + 4, class: 'dk-tick', 'text-anchor': 'end' }, o.yfmt ? o.yfmt(t) : t))
  }
  if (o.xlabel) g.append(svgEl('text', { x: (left + o.w - right) / 2, y: o.h - 6, class: 'dk-axis-label', 'text-anchor': 'middle' }, o.xlabel))
  if (o.ylabel) g.append(svgEl('text', { x: 12, y: top + (o.h - top - bottom) / 2, class: 'dk-axis-label', 'text-anchor': 'middle', transform: `rotate(-90 12 ${top + (o.h - top - bottom) / 2})` }, o.ylabel))
  svg.append(g)
  const clampY = (v) => Math.max(top, Math.min(o.h - bottom, py(v)))
  return {
    x: px, y: py, clampY, left, right, top, bottom,
    /** A polyline through [[x, y], ...] in data units, clipped to the plot's height. */
    line(points, color, width = 2, extra = {}) {
      const d = points.map(([a, b], i) => `${i ? 'L' : 'M'}${px(a).toFixed(1)},${clampY(b).toFixed(1)}`).join('')
      const p = svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linejoin': 'round', ...extra })
      svg.append(p)
      return p
    },
  }
}

/** An SVG that scales to its box. */
export const canvas = (cls, label) => svgEl('svg', { class: `dk-svg ${cls ?? ''}`, role: 'img', 'aria-label': label ?? '' })

/** The source line under every widget: a link to the spec its numbers come from. */
export const source = () => el('p', { class: 'dk-source' }, el('a', { href: './logic.t27' }, say('SAY_SOURCE')))
