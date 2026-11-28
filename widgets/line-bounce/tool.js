// line-bounce/tool.js -- draws a step down a transmission line. It computes nothing itself: every
// value comes from ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/line_bounce.t27 compiled to
// wasm (scripts/widget-logic.mjs keeps the two in step). Every word is a SAY_ constant and every
// number a K_ constant of specs/widgets/line-bounce.t27 (window.T27_WIDGET). Reads only its own
// files; the inputs stay in this tab and in the URL hash.
import { farEnd, gamma, launch, nearEnd, overshootPct, settlesTo, shape } from './logic.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')
const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.appendChild(css)

const fill = (s, ...v) => String(s ?? '').replace(/\{(\d+)\}/g, (m, i) => (i < v.length ? String(v[i]) : m))
const say = (k, i) => (Array.isArray(W[k]) ? W[k][i] : W[k]) ?? ''
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) if (v != null) k === 'class' ? (n.className = v) : n.setAttribute(k, v)
  for (const c of kids.flat()) if (c != null) n.append(c instanceof Node ? c : String(c))
  return n
}
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v))
  return n
}
const v3 = (x) => (Math.round(x * 1000) / 1000).toFixed(3)
const sign = (x) => (x >= 0 ? '+' : '') + x.toFixed(3)

// K_OPEN_OHMS and K_MAX_ARRIVALS are the logic spec's OPEN_OHMS and MAX_ARRIVALS
// (scripts/widget-logic.mjs checks every K_<NAME> against <NAME> in logic.t27).
const OPEN_OHMS = W.K_OPEN_OHMS ?? 1000000
const N = W.K_MAX_ARRIVALS ?? 12
const P = {
  vs: W.K_PRESET_VS_MV || [1000],
  rs: W.K_PRESET_RS || [25],
  z0: W.K_PRESET_Z0 || [50],
  rl: W.K_PRESET_RL || [0],
  td: W.K_PRESET_TD_PS || [1000],
}
const MAX_OHMS = W.K_MAX_OHMS ?? 10000
const MAX_MV = W.K_MAX_MV ?? 5000
const MAX_TD = W.K_MAX_TD_PS ?? 20000

const FIELDS = [
  ['vs', 'SAY_VS', MAX_MV],
  ['rs', 'SAY_RS', MAX_OHMS],
  ['z0', 'SAY_Z0', MAX_OHMS],
  ['rl', 'SAY_RL', MAX_OHMS],
  ['td', 'SAY_TD', MAX_TD],
]
const inputs = {}
const form = el('div', { class: 'lb-form' })
for (const [key, label, max] of FIELDS) {
  const input = el('input', { class: 'lb-input', type: 'number', inputmode: 'numeric', min: key === 'z0' ? '1' : '0', max: String(max), step: '1', id: `lb-${key}` })
  inputs[key] = input
  form.append(el('label', { class: 'lb-field', for: `lb-${key}` }, el('span', { class: 'lb-label' }, say(label)), input))
}
const msg = el('p', { class: 'lb-msg', role: 'status' })
const presets = el('div', { class: 'lb-presets', role: 'group', 'aria-label': say('SAY_PRESETS_LABEL') })
const presetButtons = (W.SAY_PRESET_NAMES || []).map((name, i) => {
  const b = el('button', { class: 't27-btn lb-preset', type: 'button' }, name)
  b.addEventListener('click', () => setPreset(i))
  presets.append(b)
  return b
})
const verdict = el('div', { class: 'lb-verdict' })
const plot = svgEl('svg', { class: 'lb-plot', viewBox: '0 0 640 300', role: 'img' })
const table = el('ol', { class: 'lb-table' })
const source = el('p', { class: 'lb-source' }, el('a', { href: './logic.t27' }, say('SAY_SOURCE')))
root.replaceChildren(el('p', { class: 'jv-label lb-label' }, say('SAY_PRESETS_LABEL')), presets, form, msg, verdict, plot, table, source)

function read() {
  const out = {}
  for (const [key, , max] of FIELDS) {
    const t = String(inputs[key].value).trim()
    if (!/^\d+$/.test(t)) return null
    const n = Number(t)
    if (n > max || (key === 'z0' && n === 0)) return null
    out[key] = n
  }
  return out
}

function setPreset(i) {
  inputs.vs.value = P.vs[i]
  inputs.rs.value = P.rs[i]
  inputs.z0.value = P.z0[i]
  inputs.rl.value = P.rl[i]
  inputs.td.value = P.td[i]
  presetButtons.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)))
  draw()
}

function draw() {
  const r = read()
  if (!r) {
    msg.textContent = fill(say('SAY_BAD_INPUT'), MAX_OHMS, MAX_MV, MAX_TD)
    return
  }
  msg.textContent = ''
  const vs = r.vs / 1000
  const rl = r.rl === 0 ? OPEN_OHMS : r.rl
  const far = Array.from({ length: N }, (_, k) => farEnd(k + 1, vs, r.rs, r.z0, rl))
  const nearV = Array.from({ length: N }, (_, j) => nearEnd(j, vs, r.rs, r.z0, rl))
  const end = settlesTo(vs, r.rs, rl)
  const s = shape(r.rs, r.z0, rl)
  const tone = s === 2 ? 'lb-warn' : 'lb-ok'
  verdict.className = `lb-verdict ${tone}`
  verdict.replaceChildren(
    el('strong', {}, say('SAY_SHAPE_NAMES', s)),
    el('p', {}, fill(say('SAY_GAMMAS'), sign(gamma(r.rs, r.z0)), sign(gamma(rl, r.z0)), v3(launch(vs, r.rs, r.z0)))),
    el('p', {}, fill(say('SAY_OVERSHOOT'), v3(far[0]), overshootPct(1, vs, r.rs, r.z0, rl).toFixed(1))),
    el('p', { class: 'lb-tip' }, say('SAY_SHAPE_TIPS', s)),
  )
  // Time runs 0 .. 2N TD; the far end steps at odd TD, the near end at even TD.
  const T = 2 * N
  const vals = [...far, ...nearV, end, 0]
  const top = Math.max(...vals) * 1.08 || 1
  const bottom = Math.min(0, ...vals)
  const x = (t) => 48 + (t / T) * 576
  const y = (v) => 270 - ((v - bottom) / (top - bottom)) * 196
  const stairs = (pts) => pts.map(([t, v], i) => (i ? `H${x(t).toFixed(1)}V${y(v).toFixed(1)}` : `M${x(t).toFixed(1)},${y(v).toFixed(1)}`)).join('') + `H${x(T)}`
  const farPts = [[0, 0], ...far.map((v, k) => [2 * k + 1, v])]
  const nearPts = nearV.map((v, j) => [2 * j, v])
  plot.replaceChildren(
    svgEl('line', { x1: 48, x2: 624, y1: y(end), y2: y(end), class: 'lb-end' }),
    svgEl('line', { x1: 48, x2: 624, y1: y(0), y2: y(0), class: 'lb-axis' }),
    svgEl('path', { d: stairs(nearPts), class: 'lb-near' }),
    svgEl('path', { d: stairs(farPts), class: 'lb-far' }),
  )
  const legend = [
    ['lb-far', say('SAY_FAR')],
    ['lb-near', say('SAY_NEAR')],
    ['lb-end', fill(say('SAY_SETTLE'), v3(end))],
  ]
  legend.forEach(([cls, text], i) => {
    plot.append(svgEl('line', { x1: 60, x2: 84, y1: 22 + i * 18, y2: 22 + i * 18, class: cls }))
    const t = svgEl('text', { x: 90, y: 26 + i * 18, class: 'lb-legend' })
    t.textContent = text
    plot.append(t)
  })
  const ax = svgEl('text', { x: 624, y: 292, class: 'lb-legend', 'text-anchor': 'end' })
  ax.textContent = say('SAY_AXIS_T')
  plot.append(ax)
  plot.setAttribute('aria-label', `${say('SAY_SHAPE_NAMES', s)}. ${fill(say('SAY_SETTLE'), v3(end))}`)
  table.replaceChildren(...far.slice(0, 6).map((v, k) => el('li', {}, fill(say('SAY_TABLE'), k + 1, 2 * k + 1, v3(v)))))
  const h = new URLSearchParams(Object.entries(r).map(([k, v]) => [k, String(v)]))
  history.replaceState(null, '', `#${h}`)
}

for (const input of Object.values(inputs)) input.addEventListener('input', () => {
  presetButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'))
  draw()
})

const fromHash = new URLSearchParams(location.hash.slice(1))
if (FIELDS.every(([k]) => fromHash.has(k))) {
  for (const [k] of FIELDS) inputs[k].value = fromHash.get(k)
  draw()
} else setPreset(W.K_START_PRESET ?? 0)
