// fir-response/tool.js -- lesson 16 of arithmetic-and-dsp: the moving average, the simplest
// low-pass, its response and its nulls. It computes nothing itself: the response, every input and
// output sample and the decibels come from ./logic.js, the fn bodies of gHashTag/t27
// specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/fir-response.t27.
import { dbPower, maGain, maOut, tone } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const DIV = K('K_F_STEP_DIV', 200)
const SHOWN = K('K_SAMPLES_SHOWN', 48)
const ctl = controls([
  { key: 'len', label: say('SAY_LEN'), min: K('K_MIN_LEN', 2), max: K('K_MAX_LEN', 32) },
  { key: 'f', label: say('SAY_F'), min: 0, max: DIV / 2, fmt: (v) => (v / DIV).toFixed(3) },
], { names: W.SAY_PRESET_NAMES, values: { len: K('K_PRESET_LEN'), f: K('K_PRESET_F_STEPS') } }, draw)

const resp = canvas('fr-resp', say('SAY_RESP_LABEL'))
const time = canvas('fr-time', say('SAY_TIME_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, resp, time,
  el('div', { class: 'dk-legend' }, el('span', {}, el('i', { style: `background:${COLORS[2]}` }), say('SAY_IN')), el('span', {}, el('i', { style: `background:${COLORS[1]}` }), say('SAY_OUT'))), source())

function draw(s) {
  const f = s.f / DIV
  const g = maGain(s.len, f)
  resp.replaceChildren()
  const p = plot(resp, { w: 640, h: 240, x0: 0, x1: 0.5, y0: 0, y1: 1.05, yticks: [0, 0.5, 1], xticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], xlabel: say('SAY_F_AXIS'), ylabel: say('SAY_GAIN_AXIS') })
  p.line(Array.from({ length: 501 }, (_, k) => [k / 1000, maGain(s.len, k / 1000)]), COLORS[0], 2.5)
  resp.append(svgEl('line', { x1: p.x(f), x2: p.x(f), y1: p.y(0), y2: p.y(g), stroke: COLORS[3], 'stroke-width': 2, 'stroke-dasharray': '4 3' }))
  resp.append(svgEl('circle', { cx: p.x(f), cy: p.y(g), r: 7, fill: COLORS[3] }))
  time.replaceChildren()
  const pt = plot(time, { w: 640, h: 200, x0: 0, x1: SHOWN, y0: -1.15, y1: 1.15, yticks: [-1, 0, 1], xticks: [0, SHOWN / 2, SHOWN], xlabel: say('SAY_TIME_AXIS') })
  pt.line(Array.from({ length: SHOWN + 1 }, (_, k) => [k, tone(f, k)]), COLORS[2], 1.5)
  pt.line(Array.from({ length: SHOWN + 1 }, (_, k) => [k, maOut(s.len, f, k)]), COLORS[1], 2.5)
  for (let k = 0; k <= SHOWN; k++) time.append(svgEl('circle', { cx: pt.x(k), cy: pt.y(maOut(s.len, f, k)), r: 3, fill: COLORS[1] }))
  stat.replaceChildren(tiles([
    { label: say('SAY_AT'), value: fill(say('SAY_CYC'), f.toFixed(3)), tone: 3 },
    { label: say('SAY_GAIN'), value: g.toFixed(5), tone: 0 },
    { label: say('SAY_GAIN_DB'), value: fill(say('SAY_DB_VALUE'), dbPower(g * g).toFixed(2)), tone: 1 },
    { label: say('SAY_NULLS'), value: fill(say('SAY_NULLS_AT'), s.len), tone: 5 },
  ]))
}

ctl.start()
