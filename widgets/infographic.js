// infographic.js -- the one renderer every t27 basics lesson widget shares (public/widgets/basics-*/).
//
// Each widget's tool.js is a single import of this file. Every word and every cell comes from the
// widget's spec, specs/widgets/<id>.t27, handed to the page as window.T27_WIDGET:
//   SAY_TABLE_CAPTION, SAY_TABLE_HEAD, SAY_TABLE_CELLS (row after row), K_TABLE_COLS  -> a <table>
//   SAY_FLOW_TITLE, SAY_FLOW_STEPS (optional)                                          -> an SVG diagram
//   SAY_NOTE                                                                           -> a line under both
// This file holds no words of its own. Black and white only; nothing is fetched, sent or stored.

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')
const SVG = 'http://www.w3.org/2000/svg'

const css = document.createElement('link')
css.rel = 'stylesheet'
// The page stamps this module through its import map (?v=); the stylesheet carries the same stamp.
css.href = new URL('./infographic.css' + new URL(import.meta.url).search, import.meta.url).href
document.head.appendChild(css)

const el = (tag, text, cls) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text != null) n.textContent = String(text)
  return n
}

function table() {
  const cols = Number(W.K_TABLE_COLS) || 1
  const head = W.SAY_TABLE_HEAD || []
  const cells = W.SAY_TABLE_CELLS || []
  const t = el('table', null, 'ig-table')
  t.append(el('caption', W.SAY_TABLE_CAPTION))
  const thead = el('thead')
  const hr = el('tr')
  for (const h of head) { const th = el('th', h); th.scope = 'col'; hr.append(th) }
  thead.append(hr)
  const body = el('tbody')
  for (let i = 0; i < cells.length; i += cols) {
    const tr = el('tr')
    cells.slice(i, i + cols).forEach((c, j) => {
      const td = el(j === 0 ? 'th' : 'td', c)
      if (j === 0) td.scope = 'row'
      if (head[j]) td.dataset.label = head[j]
      tr.append(td)
    })
    body.append(tr)
  }
  t.append(thead, body)
  const wrap = el('div', null, 'ig-table-wrap')
  wrap.append(t)
  return wrap
}

// A vertical chain of boxes: it stays readable at 375 px, where a row of boxes would not.
function flow() {
  const steps = W.SAY_FLOW_STEPS || []
  if (!steps.length) return null
  const fig = el('figure', null, 'ig-flow')
  const boxH = 44, gap = 26, w = 340
  const h = steps.length * boxH + (steps.length - 1) * gap + 4
  const svg = document.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  svg.setAttribute('role', 'img')
  const title = document.createElementNS(SVG, 'title')
  title.textContent = [W.SAY_FLOW_TITLE, ...steps].filter(Boolean).join(': ')
  svg.append(title)
  steps.forEach((s, i) => {
    const y = 2 + i * (boxH + gap)
    const r = document.createElementNS(SVG, 'rect')
    Object.entries({ x: 2, y, width: w - 4, height: boxH, rx: 6, class: 'ig-box' }).forEach(([k, v]) => r.setAttribute(k, v))
    const t = document.createElementNS(SVG, 'text')
    Object.entries({ x: w / 2, y: y + boxH / 2, class: 'ig-step', 'text-anchor': 'middle', 'dominant-baseline': 'central' }).forEach(([k, v]) => t.setAttribute(k, v))
    t.textContent = s
    svg.append(r, t)
    if (i < steps.length - 1) {
      const a = document.createElementNS(SVG, 'path')
      const y0 = y + boxH + 3, y1 = y + boxH + gap - 3
      a.setAttribute('d', `M ${w / 2} ${y0} L ${w / 2} ${y1} M ${w / 2 - 6} ${y1 - 7} L ${w / 2} ${y1} L ${w / 2 + 6} ${y1 - 7}`)
      a.setAttribute('class', 'ig-arrow')
      svg.append(a)
    }
  })
  fig.append(svg)
  if (W.SAY_FLOW_TITLE) fig.append(el('figcaption', W.SAY_FLOW_TITLE))
  return fig
}

// SVG text does not wrap: shrink a step whose text is wider than its box.
function fitSteps(svg) {
  for (const t of svg.querySelectorAll('text')) {
    let size = 15
    t.style.fontSize = size + 'px'
    while (size > 8 && t.getComputedTextLength() > 320) { size -= 1; t.style.fontSize = size + 'px' }
  }
}

root.textContent = ''
const box = el('div', null, 'ig')
box.append(table())
const f = flow()
if (f) box.append(f)
if (W.SAY_NOTE) box.append(el('p', W.SAY_NOTE, 'ig-note'))
root.append(box)
if (f) requestAnimationFrame(() => fitSteps(f.querySelector('svg')))
