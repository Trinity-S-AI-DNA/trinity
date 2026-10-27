// q-format/tool.js -- lesson 7 of arithmetic-and-dsp: reading and writing a Qm.n fixed-point word.
// It computes nothing itself: the value of the word, each bit, the range, the step and the word a
// value rounds to come from ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/dsp/fixed_point.t27
// compiled to wasm. Words are SAY_ and numbers K_ constants of specs/widgets/q-format.t27.
import { qBit, qEncode, qFlip, qMax, qMin, qStep, qValue } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const MAXW = K('K_WORD_LIMIT', 24)
const ROUND = K('K_MODE_ROUND', 1)
const ctl = controls([
  { key: 'm', label: say('SAY_M'), min: 1, max: K('K_MAX_INT_BITS', 16) },
  { key: 'n', label: say('SAY_N'), min: 0, max: K('K_MAX_FRAC_BITS', 16) },
  { key: 'x', label: say('SAY_X'), min: -K('K_X_SPAN', 256), max: K('K_X_SPAN', 256), step: 1 / K('K_X_STEP_DIV', 10000), fmt: (v) => v.toFixed(4) },
  { key: 'raw', kind: 'hidden', min: -8388608, max: 8388607 },
], { names: W.SAY_PRESET_NAMES, values: { m: K('K_PRESET_M'), n: K('K_PRESET_N'), x: (K('K_PRESET_X_MILLI') || []).map((v, i) => (K('K_PRESET_X_NEG')[i] ? -v : v) / 1000) } }, draw)

const bits = canvas('qf-bits', say('SAY_BITS_LABEL'))
const line = canvas('qf-line', say('SAY_LINE_LABEL'))
const stat = el('div')
const msg = el('p', { class: 'dk-note' })
root.replaceChildren(ctl.node, msg, stat, bits, el('p', { class: 'dk-note' }, say('SAY_TAP')), line, source())

let lastX = null
let lastFmt = ''
function draw(s) {
  const w = s.m + s.n
  if (w > MAXW) {
    msg.textContent = fill(say('SAY_TOO_WIDE'), MAXW)
    return
  }
  msg.textContent = ''
  // The slider writes x into the word (rounded, saturated); a tapped bit writes the word directly.
  const fmt = `${s.m}.${s.n}`
  if (s.x !== lastX || fmt !== lastFmt) {
    lastX = s.x
    lastFmt = fmt
    ctl.set('raw', qEncode(s.x, s.m, s.n, ROUND, true))
    return
  }
  const raw = ctl.get('raw')
  const value = qValue(raw, s.n)
  bits.replaceChildren()
  bits.setAttribute('viewBox', '0 0 640 120')
  const cw = Math.min(40, 620 / w)
  const x0 = 320 + (w * cw) / 2
  for (let i = 0; i < w; i++) {
    const b = qBit(raw, i)
    const kind = i === w - 1 ? 6 : i >= s.n ? 1 : 2
    const x = x0 - (i + 1) * cw
    const cell = svgEl('rect', { x: x + 1.5, y: 30, width: cw - 3, height: 40, rx: 5, fill: b ? COLORS[kind] : '#0b1411', stroke: COLORS[kind], 'stroke-opacity': 0.5, class: 'dk-bitbtn', tabindex: 0, role: 'button', 'aria-label': fill(say('SAY_BIT'), i) })
    const flip = () => ctl.set('raw', qFlip(raw, i, w))
    cell.addEventListener('click', flip)
    cell.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip() } })
    bits.append(cell, svgEl('text', { x: x + cw / 2, y: 56, 'text-anchor': 'middle', 'pointer-events': 'none', style: `font: 700 ${Math.min(16, cw * 0.55)}px var(--w-mono); fill: ${b ? '#00140b' : '#5f7a71'}` }, b))
  }
  bits.append(svgEl('line', { x1: x0 - s.n * cw, x2: x0 - s.n * cw, y1: 22, y2: 80, stroke: '#fff', 'stroke-width': 2 }))
  bits.append(svgEl('text', { x: x0 - s.n * cw, y: 16, 'text-anchor': 'middle', class: 'dk-txt' }, say('SAY_POINT')))
  ;[[6, 'SAY_SIGN'], [1, 'SAY_INTEGER'], [2, 'SAY_FRACTION']].forEach(([c, k], j) => {
    bits.append(svgEl('rect', { x: 20 + j * 200, y: 96, width: 14, height: 14, rx: 3, fill: COLORS[c] }))
    bits.append(svgEl('text', { x: 40 + j * 200, y: 108, class: 'dk-txt' }, say(k)))
  })
  // The number line: the whole range, the value, and the steps when they are few enough to see.
  line.replaceChildren()
  line.setAttribute('viewBox', '0 0 640 90')
  const lo = qMin(s.m), hi = qMax(s.m, s.n), step = qStep(s.n)
  const px = (v) => 30 + ((v - lo) / (hi - lo || 1)) * 580
  line.append(svgEl('line', { x1: 30, x2: 610, y1: 40, y2: 40, stroke: '#adc9c0', 'stroke-width': 2 }))
  if ((hi - lo) / step <= K('K_MAX_TICKS', 128)) for (let v = lo; v <= hi + step / 2; v += step) line.append(svgEl('line', { x1: px(v), x2: px(v), y1: 34, y2: 46, stroke: COLORS[2] }))
  line.append(svgEl('circle', { cx: px(value), cy: 40, r: 8, fill: COLORS[1] }))
  line.append(svgEl('text', { x: 30, y: 70, class: 'dk-txt', 'text-anchor': 'start' }, String(lo)))
  line.append(svgEl('text', { x: 610, y: 70, class: 'dk-txt', 'text-anchor': 'end' }, String(hi)))
  line.append(svgEl('text', { x: px(value), y: 22, class: 'dk-txt-big', 'text-anchor': 'middle' }, String(value)))
  stat.replaceChildren(tiles([
    { label: fill(say('SAY_VALUE'), s.m, s.n), value: String(value), tone: 1 },
    { label: say('SAY_RAW'), value: String(raw), tone: 2 },
    { label: say('SAY_RANGE'), value: fill('{0} .. {1}', lo, hi), tone: 0 },
    { label: say('SAY_STEP'), value: String(step), tone: 3 },
  ]))
}

ctl.start()
