// cordic/tool.js -- lesson 10 of arithmetic-and-dsp: CORDIC rotation mode turns a vector onto an
// angle with shifts and adds, and lands on (cos, sin). It computes nothing itself: every
// intermediate vector, direction, angle step, the gain K(n) and the reference come from
// ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/dsp/cordic.t27 compiled to wasm. Words are
// SAY_ and numbers K_ constants of specs/widgets/cordic.t27.
import { atanPow2, degrees, errorOf, gain, radians, refCos, refSin, rotDir, rotState } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const X = K('K_X_OUT', 0), Y = K('K_Y_OUT', 1), Z = K('K_Z_OUT', 2)
const ctl = controls([
  { key: 'deg', label: say('SAY_ANGLE'), min: -K('K_MAX_DEG', 90), max: K('K_MAX_DEG', 90), fmt: (v) => fill(say('SAY_DEG_VALUE'), v) },
  { key: 'n', label: say('SAY_STEPS'), min: 1, max: K('K_MAX_SHOWN_STEPS', 24) },
], { names: W.SAY_PRESET_NAMES, values: { deg: K('K_PRESET_DEG'), n: K('K_PRESET_STEPS') } }, draw)

const plane = canvas('co-plane', say('SAY_PLANE_LABEL'))
const steps = canvas('co-steps', say('SAY_STEPS_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, plane, el('p', { class: 'dk-note' }, say('SAY_NOTE')), steps, source())

function draw(s) {
  const th = radians(s.deg)
  const n = s.n
  plane.replaceChildren()
  plane.setAttribute('viewBox', '0 0 640 360')
  const cx = 200, cy = 180, R = 150
  const P = (x, y) => [cx + x * R, cy - y * R]
  plane.append(svgEl('circle', { cx, cy, r: R, fill: 'none', stroke: 'rgba(173,201,192,0.3)' }))
  plane.append(svgEl('line', { x1: cx - R - 20, x2: cx + R + 30, y1: cy, y2: cy, stroke: 'rgba(173,201,192,0.3)' }))
  plane.append(svgEl('line', { x1: cx, x2: cx, y1: cy - R - 20, y2: cy + R + 20, stroke: 'rgba(173,201,192,0.3)' }))
  const [tx, ty] = P(refCos(th), refSin(th))
  plane.append(svgEl('line', { x1: cx, y1: cy, x2: tx, y2: ty, stroke: '#fff', 'stroke-dasharray': '5 5', opacity: 0.6 }))
  // The path of the vector, one micro-rotation per step, coloured by step.
  let prev = P(rotState(th, n, 0, X), rotState(th, n, 0, Y))
  for (let i = 1; i <= n; i++) {
    const cur = P(rotState(th, n, i, X), rotState(th, n, i, Y))
    const c = COLORS[(i - 1) % COLORS.length]
    plane.append(svgEl('line', { x1: cx, y1: cy, x2: cur[0], y2: cur[1], stroke: c, 'stroke-width': i === n ? 3 : 1, opacity: i === n ? 1 : 0.35 }))
    plane.append(svgEl('line', { x1: prev[0], y1: prev[1], x2: cur[0], y2: cur[1], stroke: c, 'stroke-width': 2 }))
    plane.append(svgEl('circle', { cx: cur[0], cy: cur[1], r: i === n ? 6 : 3, fill: c }))
    prev = cur
  }
  plane.append(svgEl('circle', { cx: tx, cy: ty, r: 5, fill: 'none', stroke: '#fff', 'stroke-width': 2 }))
  const x = rotState(th, n, n, X), y = rotState(th, n, n, Y), z = rotState(th, n, n, Z)
  ;[[fill(say('SAY_COS'), x.toFixed(6)), 0], [fill(say('SAY_SIN'), y.toFixed(6)), 1], [fill(say('SAY_LEFT'), degrees(z).toFixed(5)), 3], [fill(say('SAY_GAIN'), gain(n).toFixed(10)), 2]].forEach(([t, c], j) => {
    plane.append(svgEl('text', { x: 400, y: 70 + j * 30, style: `font: 700 14px var(--w-mono); fill: ${COLORS[c]}` }, t))
  })
  plane.append(svgEl('text', { x: 400, y: 200, class: 'dk-txt-dim' }, say('SAY_TARGET')))
  // The steps: the direction each one took and the angle still to go.
  steps.replaceChildren()
  const rows = Math.min(n, K('K_TABLE_ROWS', 12))
  steps.setAttribute('viewBox', `0 0 640 ${30 + rows * 24}`)
  ;['SAY_COL_I', 'SAY_COL_DIR', 'SAY_COL_ATAN', 'SAY_COL_LEFT'].forEach((k, j) => steps.append(svgEl('text', { x: 20 + j * 150, y: 18, class: 'dk-txt-dim' }, say(k))))
  for (let i = 0; i < rows; i++) {
    const y0 = 40 + i * 24
    const d = rotDir(th, n, i)
    const c = COLORS[i % COLORS.length]
    steps.append(svgEl('text', { x: 20, y: y0, style: `font: 700 13px var(--w-mono); fill: ${c}` }, i))
    steps.append(svgEl('text', { x: 170, y: y0, class: 'dk-txt' }, d > 0 ? say('SAY_CCW') : say('SAY_CW')))
    steps.append(svgEl('text', { x: 320, y: y0, class: 'dk-txt' }, fill(say('SAY_DEG_VALUE'), degrees(atanPow2(i)).toFixed(4))))
    steps.append(svgEl('text', { x: 470, y: y0, class: 'dk-txt' }, fill(say('SAY_DEG_VALUE'), degrees(rotState(th, n, i + 1, Z)).toFixed(4))))
  }
  stat.replaceChildren(tiles([
    { label: say('SAY_COS_ERR'), value: errorOf(x, refCos(th)).toExponential(2), tone: 0 },
    { label: say('SAY_SIN_ERR'), value: errorOf(y, refSin(th)).toExponential(2), tone: 1 },
    { label: say('SAY_K'), value: gain(n).toFixed(8), tone: 2 },
    { label: say('SAY_OPS'), value: fill(say('SAY_OPS_VALUE'), n), tone: 5 },
  ]))
}

ctl.start()
