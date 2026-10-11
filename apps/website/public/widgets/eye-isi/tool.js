// eye-isi/tool.js -- draws PRBS7 through one RC pole as an eye. It computes nothing itself: the
// pattern, the pole, every level and the formula come from ./logic.js, the fn bodies of
// gHashTag/t27 specs/fpga/eye_isi.t27 compiled to wasm (scripts/widget-logic.mjs keeps the two in
// step). Every word is a SAY_ constant and every number a K_ constant of specs/widgets/eye-isi.t27
// (window.T27_WIDGET). Reads only its own files; the inputs stay in this tab and in the URL hash.
import { closesBelow, deemph, expNeg, eye, nextLevel, pole, prbs7Bit, prbs7Next } from './logic.js'

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

const SEED = W.K_PRBS7_SEED ?? 127
const BITS = W.K_BITS_SHOWN ?? 254
const STEPS = W.K_STEPS_PER_BIT ?? 16
const MAX_PS = W.K_MAX_PS ?? 20000
const MAX_DE = W.K_MAX_DEEMPH_PCT ?? 50
const PRE = { bit: W.K_PRESET_BIT_PS || [1000], tau: W.K_PRESET_TAU_PS || [1000], de: W.K_PRESET_DEEMPH_PCT || [0] }
// The first bits only fill the channel; the eye is drawn and measured after them.
const WARMUP = 8

const FIELDS = [
  ['bit', 'SAY_BIT', MAX_PS, 1],
  ['tau', 'SAY_TAU', MAX_PS, 1],
  ['de', 'SAY_DEEMPH', MAX_DE, 0],
]
const inputs = {}
const form = el('div', { class: 'ey-form' })
for (const [key, label, max, min] of FIELDS) {
  const input = el('input', { class: 'ey-input', type: 'number', inputmode: 'numeric', min: String(min), max: String(max), step: '1', id: `ey-${key}` })
  inputs[key] = input
  form.append(el('label', { class: 'ey-field', for: `ey-${key}` }, el('span', { class: 'ey-label' }, say(label)), input))
}
const presets = el('div', { class: 'ey-presets', role: 'group', 'aria-label': say('SAY_PRESETS_LABEL') })
const presetButtons = (W.SAY_PRESET_NAMES || []).map((name, i) => {
  const b = el('button', { class: 't27-btn ey-preset', type: 'button' }, name)
  b.addEventListener('click', () => setPreset(i))
  presets.append(b)
  return b
})
const msg = el('p', { class: 'ey-msg', role: 'status' })
const verdict = el('div', { class: 'ey-verdict' })
const plot = svgEl('svg', { class: 'ey-plot', viewBox: '0 0 640 320', role: 'img' })
const source = el('p', { class: 'ey-source' }, el('a', { href: './logic.t27' }, say('SAY_SOURCE')))
root.replaceChildren(el('p', { class: 'ey-label' }, say('SAY_PRESETS_LABEL')), presets, form, msg, verdict, plot, source)

function read() {
  const out = {}
  for (const [key, , max, min] of FIELDS) {
    const t = String(inputs[key].value).trim()
    if (!/^\d+$/.test(t)) return null
    const n = Number(t)
    if (n < min || n > max) return null
    out[key] = n
  }
  return out
}

function setPreset(i) {
  inputs.bit.value = PRE.bit[i]
  inputs.tau.value = PRE.tau[i]
  inputs.de.value = PRE.de[i]
  presetButtons.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)))
  draw()
}

/** Every bit of two PRBS7 periods through the channel: the levels inside each bit, end included. */
function simulate(bitPs, tauPs, c) {
  const inBit = Array.from({ length: STEPS }, (_, m) => expNeg(((m + 1) * bitPs) / STEPS / tauPs))
  let s = SEED
  let prev = 0
  let y = 0
  const out = []
  for (let n = 0; n < BITS + WARMUP; n++) {
    s = prbs7Next(s)
    const bit = prbs7Bit(s)
    const x = deemph(bit, prev, c)
    const start = y
    const levels = inBit.map((a) => nextLevel(start, x, a))
    y = levels[STEPS - 1]
    out.push({ bit, start, levels })
    prev = bit
  }
  return out
}

function draw() {
  const r = read()
  if (!r) {
    msg.textContent = fill(say('SAY_BAD_INPUT'), MAX_PS, MAX_DE)
    return
  }
  msg.textContent = ''
  const c = r.de / 100
  const bits = simulate(r.bit, r.tau, c)
  const kept = bits.slice(WARMUP)
  // The eye at the sampling point: the lowest end-of-bit level of a 1 against the highest of a 0.
  const ones = kept.filter((b) => b.bit === 1).map((b) => b.levels[STEPS - 1])
  const zeros = kept.filter((b) => b.bit === 0).map((b) => b.levels[STEPS - 1])
  const opening = Math.min(...ones) - Math.max(...zeros)
  const formula = eye(pole(r.bit, r.tau))
  const limitPs = closesBelow() * r.tau
  const open = opening > 0
  verdict.className = `ey-verdict ${open ? 'ey-ok' : 'ey-bad'}`
  verdict.replaceChildren(
    el('strong', {}, open ? fill(say('SAY_OPEN'), (opening * 100).toFixed(1), kept.length) : fill(say('SAY_SHUT'), (-opening * 100).toFixed(1))),
    el('p', {}, fill(say('SAY_RATE'), (1000 / r.bit).toFixed(2), (r.bit / r.tau).toFixed(3))),
    el('p', {}, fill(say('SAY_FORMULA'), (formula * 100).toFixed(1))),
    el('p', {}, fill(say('SAY_LIMIT'), limitPs.toFixed(0), (1000 / limitPs).toFixed(2))),
  )
  // Overlay every two-bit window: bit n then bit n + 1, 0..2 UI across, levels on y.
  const all = kept.flatMap((b) => [b.start, ...b.levels])
  const hi = Math.max(1, ...all)
  const lo = Math.min(0, ...all)
  const x = (u) => 40 + (u / 2) * 580
  const y = (v) => 290 - ((v - lo) / (hi - lo || 1)) * 260
  const paths = []
  for (let n = 0; n + 1 < kept.length; n++) {
    const pts = [kept[n].start, ...kept[n].levels, ...kept[n + 1].levels]
    paths.push(pts.map((v, i) => `${i ? 'L' : 'M'}${x(i / STEPS).toFixed(1)},${y(v).toFixed(1)}`).join(''))
  }
  plot.replaceChildren(
    svgEl('path', { d: paths.join(''), class: 'ey-trace' }),
    svgEl('line', { x1: x(1), x2: x(1), y1: 20, y2: 300, class: 'ey-sample' }),
    svgEl('line', { x1: 40, x2: 620, y1: y(0), y2: y(0), class: 'ey-rail' }),
    svgEl('line', { x1: 40, x2: 620, y1: y(1), y2: y(1), class: 'ey-rail' }),
  )
  if (open) plot.append(svgEl('rect', { x: x(1) - 4, y: y(Math.min(...ones)), width: 8, height: Math.max(1, y(Math.max(...zeros)) - y(Math.min(...ones))), class: 'ey-gap' }))
  const t = svgEl('text', { x: x(1) + 6, y: 16, class: 'ey-legend' })
  t.textContent = say('SAY_SAMPLE')
  plot.append(t)
  plot.setAttribute('aria-label', verdict.querySelector('strong').textContent)
  history.replaceState(null, '', `#${new URLSearchParams(Object.entries(r).map(([k, v]) => [k, String(v)]))}`)
}

for (const input of Object.values(inputs)) input.addEventListener('input', () => {
  presetButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'))
  draw()
})

const fromHash = new URLSearchParams(location.hash.slice(1))
if (FIELDS.every(([k]) => fromHash.has(k))) {
  for (const [k] of FIELDS) inputs[k].value = fromHash.get(k)
  draw()
} else setPreset(W.K_START_PRESET ?? 1)
