// cordic-vector/tool.js -- lesson 11 of arithmetic-and-dsp: CORDIC vectoring mode turns a vector
// down onto the x axis and reads off its angle and its length. It computes nothing itself: every
// intermediate vector, the angle, the magnitude, the gain and the references come from ./logic.js,
// the fn bodies of gHashTag/t27 specs/fpga/dsp/cordic.t27 compiled to wasm. Words are SAY_ and
// numbers K_ constants of specs/widgets/cordic-vector.t27.
import { degrees, errorOf, gain, magnitude, vecAngle, vecMagnitude, vecState } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const X = K('K_X_OUT', 0), Y = K('K_Y_OUT', 1)
const SPAN = K('K_SPAN', 10)
const REF = K('K_REF_STEPS', 50)
const ctl = controls([
  { key: 'x', label: say('SAY_X'), min: -SPAN, max: SPAN, step: 1 / K('K_STEP_DIV', 10), fmt: (v) => v.toFixed(1) },
  { key: 'y', label: say('SAY_Y'), min: -SPAN, max: SPAN, step: 1 / K('K_STEP_DIV', 10), fmt: (v) => v.toFixed(1) },
  { key: 'n', label: say('SAY_STEPS'), min: 1, max: K('K_MAX_SHOWN_STEPS', 24) },
], { names: W.SAY_PRESET_NAMES, values: { x: (K('K_PRESET_X_TENTHS') || []).map((v, i) => (K('K_PRESET_X_NEG')[i] ? -v : v) / 10), y: (K('K_PRESET_Y_TENTHS') || []).map((v, i) => (K('K_PRESET_Y_NEG')[i] ? -v : v) / 10), n: K('K_PRESET_STEPS') } }, draw)

const plane = canvas('cv-plane', say('SAY_PLANE_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, el('p', { class: 'dk-note' }, say('SAY_DRAG')), plane, stat, source())

const VIEW = 400
let scale = 1
plane.setAttribute('viewBox', `0 0 640 ${VIEW}`)
// Dragging on the plane sets (x, y): the pointer position in plane units.
function setFrom(ev) {
  const r = plane.getBoundingClientRect()
  const px = ((ev.clientX - r.left) / r.width) * 640
  const py = ((ev.clientY - r.top) / r.height) * VIEW
  ctl.set('x', (px - 320) / scale)
  ctl.set('y', (VIEW / 2 - py) / scale)
}
plane.addEventListener('pointerdown', (e) => { plane.setPointerCapture(e.pointerId); setFrom(e) })
plane.addEventListener('pointermove', (e) => { if (e.buttons) setFrom(e) })
plane.style.touchAction = 'none'

function draw(s) {
  const n = s.n
  const growth = 1 / gain(n)
  scale = Math.min((640 / 2 - 20) / (SPAN * Math.SQRT2 * growth), (VIEW / 2 - 20) / SPAN)
  const P = (x, y) => [320 + x * scale, VIEW / 2 - y * scale]
  plane.replaceChildren()
  plane.append(svgEl('rect', { x: 0, y: 0, width: 640, height: VIEW, fill: 'transparent' }))
  plane.append(svgEl('line', { x1: 0, x2: 640, y1: VIEW / 2, y2: VIEW / 2, stroke: 'rgba(173,201,192,0.3)' }))
  plane.append(svgEl('line', { x1: 320, x2: 320, y1: 0, y2: VIEW, stroke: 'rgba(173,201,192,0.3)' }))
  const [ox, oy] = P(0, 0)
  const [vx, vy] = P(s.x, s.y)
  plane.append(svgEl('line', { x1: ox, y1: oy, x2: vx, y2: vy, stroke: '#fff', 'stroke-width': 3 }))
  plane.append(svgEl('circle', { cx: vx, cy: vy, r: 9, fill: '#fff' }))
  let prev = P(vecState(s.x, s.y, 0, X), vecState(s.x, s.y, 0, Y))
  if (prev[0] !== vx || prev[1] !== vy) plane.append(svgEl('line', { x1: vx, y1: vy, x2: prev[0], y2: prev[1], stroke: '#fff', 'stroke-dasharray': '4 4' }))
  for (let i = 1; i <= n; i++) {
    const cur = P(vecState(s.x, s.y, i, X), vecState(s.x, s.y, i, Y))
    const c = COLORS[(i - 1) % COLORS.length]
    plane.append(svgEl('line', { x1: prev[0], y1: prev[1], x2: cur[0], y2: cur[1], stroke: c, 'stroke-width': 2.5 }))
    plane.append(svgEl('circle', { cx: cur[0], cy: cur[1], r: i === n ? 7 : 3.5, fill: c }))
    prev = cur
  }
  const ang = vecAngle(s.x, s.y, n)
  const mag = vecMagnitude(s.x, s.y, n)
  plane.append(svgEl('text', { x: 12, y: 24, class: 'dk-txt-big' }, fill(say('SAY_ANGLE_IS'), degrees(ang).toFixed(5))))
  plane.append(svgEl('text', { x: 12, y: 46, class: 'dk-txt-big' }, fill(say('SAY_MAG_IS'), mag.toFixed(6))))
  plane.append(svgEl('text', { x: 12, y: VIEW - 12, class: 'dk-txt-dim' }, fill(say('SAY_GROWS'), growth.toFixed(6))))
  const refAng = vecAngle(s.x, s.y, REF)
  stat.replaceChildren(tiles([
    { label: say('SAY_ANGLE_ERR'), value: fill(say('SAY_DEG_VALUE'), degrees(errorOf(ang, refAng)).toExponential(2)), tone: 0 },
    { label: say('SAY_MAG_ERR'), value: errorOf(mag, magnitude(s.x, s.y)).toExponential(2), tone: 1 },
    { label: say('SAY_K'), value: gain(n).toFixed(8), tone: 2 },
    { label: say('SAY_Y_LEFT'), value: vecState(s.x, s.y, n, Y).toExponential(2), tone: 3 },
  ]))
  plane.setAttribute('aria-label', fill(say('SAY_ANGLE_IS'), degrees(ang).toFixed(3)))
}

ctl.start()
