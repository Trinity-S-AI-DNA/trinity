// hive-kit.js -- the drawing the queen-and-hive widgets share, on top of dsp-kit.js (sliders, chips,
// presets, the URL hash, stat tiles): a kanban board whose cards sit in the column a spec fn names,
// a review gate that is open or shut, meters, a ladder of rungs, a clock dial, comb cells, a grid of
// answers and a row of buttons you tap. It decides nothing about the hive: every column, colour,
// verdict and number a widget shows comes from that widget's ./logic.js, the fn bodies of one
// gHashTag/t27 specs/queen or specs/automation spec compiled to wasm. Every word is a SAY_ and every
// range a K_ constant of the widget's own spec (window.T27_WIDGET). Inputs stay in this tab and in
// the URL hash; nothing is sent.
import { COLORS, el, svgEl } from './dsp-kit.js'

export * from './dsp-kit.js'

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./hive-kit.css', import.meta.url).href
document.head.appendChild(css)
// A share card (?card=1, the 1200 x 630 shot) shows the answer, not the sliders that set it.
if (/[?&]card=1\b/.test(location.search)) document.documentElement.classList.add('hk-card')

/** A colour by index: the seven of the palette, then 7 white and 8 grey; anything else is grey. */
const EXTRA = ['#ffffff', '#7d8f89']
export const hue = (t) => (Number.isInteger(t) && t >= 0 && t < COLORS.length ? COLORS[t] : Number.isInteger(t) && t < COLORS.length + EXTRA.length ? EXTRA[t - COLORS.length] : EXTRA[1])
const toneStyle = (t) => `--hc:${hue(t)}`

/** The question the lesson opens with, over the widget. */
export const ask = (text) => el('p', { class: 'hk-ask' }, text)

/** A small coloured label. */
export const pill = (text, tone, extra = '') => el('span', { class: `hk-pill ${extra}`, style: toneStyle(tone) }, text)

/**
 * A kanban board. cols: [{ name, tone }]; cards: [{ col, title, sub, tone, on }]. A card sits in
 * the column its `col` names (a spec fn's answer); a column with no card shows an empty slot.
 */
export function board(cols, cards) {
  return el('div', { class: 'hk-board', role: 'list' }, cols.map((c, i) => {
    const mine = cards.filter((k) => k.col === i)
    return el('div', { class: `hk-col ${mine.length ? 'hk-col-full' : ''}`, role: 'listitem', style: toneStyle(c.tone) },
      el('p', { class: 'hk-col-head' }, c.name, el('b', {}, String(mine.length))),
      mine.length ? mine.map((k) => el('div', { class: `hk-card ${k.on ? 'hk-on' : ''}`, style: toneStyle(k.tone ?? c.tone) }, el('strong', {}, k.title), k.sub ? el('span', {}, k.sub) : null))
        : el('div', { class: 'hk-slot' }))
  }))
}

/** A review gate: open (green) or shut (red), with what it says and why. */
export function gate(open, title, sub) {
  const g = el('div', { class: `hk-gate ${open ? 'hk-open' : 'hk-shut'}`, role: 'status' })
  const svg = svgEl('svg', { viewBox: '0 0 120 80', class: 'hk-gate-art', 'aria-hidden': 'true' })
  svg.append(svgEl('rect', { x: 6, y: 6, width: 10, height: 68, rx: 3, class: 'hk-post' }), svgEl('rect', { x: 104, y: 6, width: 10, height: 68, rx: 3, class: 'hk-post' }))
  const w = open ? 10 : 43
  svg.append(svgEl('rect', { x: 17, y: 12, width: w, height: 56, rx: 4, class: 'hk-leaf' }), svgEl('rect', { x: 103 - w, y: 12, width: w, height: 56, rx: 4, class: 'hk-leaf' }))
  g.append(svg, el('div', {}, el('strong', {}, title), sub ? el('span', {}, sub) : null))
  return g
}

/** Horizontal meters. items: [{ label, value, max, tone, text, mark, markLabel }]. */
export function meters(items) {
  return el('div', { class: 'hk-meters' }, items.map((m) => {
    const pct = (v) => `${Math.max(0, Math.min(100, (Number(v) / (m.max || 1)) * 100))}%`
    return el('div', { class: 'hk-meter', style: toneStyle(m.tone) },
      el('p', { class: 'hk-meter-head' }, el('span', {}, m.label), el('b', {}, m.text ?? String(m.value))),
      el('div', { class: 'hk-meter-track' }, el('i', { style: `width:${pct(m.value)}` }), m.mark != null ? el('em', { style: `left:${pct(m.mark)}`, title: m.markLabel ?? '' }) : null),
      m.markLabel ? el('p', { class: 'hk-meter-mark' }, m.markLabel) : null)
  }))
}

/** A ladder of rungs, top to bottom. rungs: [{ label, sub, tone, on }]; `on` lights the rung. */
export function ladder(rungs) {
  return el('ol', { class: 'hk-ladder' }, rungs.map((r) => el('li', { class: `hk-rung ${r.on ? 'hk-on' : 'hk-dim'}`, style: toneStyle(r.tone) },
    el('i', {}), el('div', {}, el('strong', {}, r.label), r.sub ? el('span', {}, r.sub) : null))))
}

/**
 * A clock dial: a ring from 0 to max with the value as an arc and marks as ticks. o: { value, max,
 * marks: [{ at, label, tone }], tone, big, small, label }.
 */
export function dial(o) {
  const svg = svgEl('svg', { viewBox: '0 0 200 200', class: 'hk-dial', role: 'img', 'aria-label': o.label ?? '' })
  const r = 78, cx = 100, cy = 100
  const at = (v) => {
    const a = (Math.max(0, Math.min(1, v / (o.max || 1))) * 2 - 0.5) * Math.PI
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  svg.append(svgEl('circle', { cx, cy, r, class: 'hk-dial-ring' }))
  const t = Math.max(0, Math.min(0.9999, o.value / (o.max || 1)))
  if (t > 0) {
    const [x, y] = at(Math.min(o.value, o.max * 0.9999))
    svg.append(svgEl('path', { d: `M${cx},${cy - r} A${r},${r} 0 ${t > 0.5 ? 1 : 0} 1 ${x.toFixed(1)},${y.toFixed(1)}`, class: 'hk-dial-arc', stroke: hue(o.tone) }))
  }
  for (const m of o.marks ?? []) {
    const [x1, y1] = at(m.at)
    const [x2, y2] = [cx + (x1 - cx) * 1.18, cy + (y1 - cy) * 1.18]
    svg.append(svgEl('line', { x1, y1, x2, y2, stroke: hue(m.tone), 'stroke-width': 4, 'stroke-linecap': 'round' }))
  }
  svg.append(svgEl('text', { x: cx, y: cy + 4, class: 'hk-dial-big', 'text-anchor': 'middle', fill: hue(o.tone) }, o.big ?? ''))
  if (o.small) svg.append(svgEl('text', { x: cx, y: cy + 28, class: 'hk-dial-small', 'text-anchor': 'middle' }, o.small))
  return svg
}

/** Comb cells in a row of hexagons. cells: [{ label, fill, alpha, on }]; onTap(i) makes them buttons. */
export function comb(cells, onTap) {
  const n = cells.length, s = 46, w = s * 1.732
  const svg = svgEl('svg', { viewBox: `0 0 ${w * Math.min(n, 5) + w / 2 + 8} ${Math.ceil(n / 5) * s * 1.5 + s * 0.6 + 8}`, class: 'hk-comb', role: 'img' })
  cells.forEach((c, i) => {
    const row = Math.floor(i / 5), col = i % 5
    const x = 4 + w / 2 + col * w + (row % 2 ? w / 2 : 0), y = 4 + s + row * s * 1.5
    const pts = [...Array(6)].map((_, k) => { const a = (Math.PI / 3) * k + Math.PI / 6; return `${(x + (s - 3) * Math.cos(a)).toFixed(1)},${(y + (s - 3) * Math.sin(a)).toFixed(1)}` }).join(' ')
    const g = svgEl('g', { class: `hk-cell ${c.on ? 'hk-on' : ''}` })
    g.append(svgEl('polygon', { points: pts, class: 'hk-cell-base' }))
    if (c.fill) g.append(svgEl('polygon', { points: pts, fill: c.fill, opacity: c.alpha ?? 1, class: 'hk-cell-glow' }))
    g.append(svgEl('text', { x, y: y + 5, 'text-anchor': 'middle', class: 'hk-cell-text' }, c.label ?? ''))
    if (onTap) {
      g.setAttribute('role', 'button')
      g.setAttribute('tabindex', '0')
      g.setAttribute('aria-label', c.label ?? String(i))
      g.addEventListener('click', () => onTap(i))
      g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onTap(i) } })
    }
    svg.append(g)
  })
  return svg
}

/**
 * A grid of answers. o: { rows, cols, rowLabels, colLabels, cell(r, c) -> { text, tone, on } }.
 * HTML, so it reflows; the row labels stay readable at 390 px.
 */
export function grid(o) {
  const t = el('table', { class: 'hk-grid' })
  if (o.colLabels) t.append(el('thead', {}, el('tr', {}, el('th', {}), o.colLabels.map((c) => el('th', { scope: 'col' }, c)))))
  t.append(el('tbody', {}, [...Array(o.rows)].map((_, r) => el('tr', {}, el('th', { scope: 'row' }, o.rowLabels?.[r] ?? ''),
    [...Array(o.cols)].map((__, c) => { const v = o.cell(r, c); return el('td', { class: v.on ? 'hk-on' : 'hk-dim', style: toneStyle(v.tone) }, v.text ?? '') })))))
  return el('div', { class: 'hk-grid-box' }, t)
}

/** A row of buttons. items: [{ label, sub, tone, pressed, disabled }]; onTap(i). */
export function taps(items, onTap, label) {
  return el('div', { class: 'hk-taps', role: 'group', 'aria-label': label ?? '' }, items.map((it, i) => {
    const b = el('button', { class: `t27-btn hk-tap ${it.disabled ? 'hk-dim' : ''}`, type: 'button', style: toneStyle(it.tone), 'aria-pressed': it.pressed == null ? null : String(!!it.pressed) }, el('strong', {}, it.label), it.sub ? el('span', {}, it.sub) : null)
    if (it.disabled) b.setAttribute('aria-disabled', 'true')
    b.addEventListener('click', () => onTap(i))
    return b
  }))
}

/** A big answer line: what the spec decided, in its colour. */
export const verdict = (word, tone, sub) => el('div', { class: 'hk-verdict', style: toneStyle(tone), role: 'status' }, el('strong', {}, word), sub ? el('span', {}, sub) : null)

/** A section heading inside a widget. */
export const head = (text) => el('p', { class: 'dk-label hk-head' }, text)

/** Two panels side by side on a wide screen, stacked on a phone. */
export const two = (...kids) => el('div', { class: 'hk-two' }, kids)
