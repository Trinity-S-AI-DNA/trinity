// fir-design/tool.js -- lesson 17 of arithmetic-and-dsp: a windowed-sinc low-pass, its integer taps
// and its response. It computes nothing itself: every tap, the response with float and with integer
// taps and the stopband level come from ./logic.js, the fn bodies of gHashTag/t27
// specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/fir-design.t27.
import { firDb, firStopDb, firTapQ } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const MILLI = K('K_PER_MILLI', 1000)
const FLOOR = -K('K_DB_SHOWN', 120)
const WINS = K('K_WINDOW_KINDS', [0, 1, 2])
const ctl = controls([
  { key: 'taps', label: say('SAY_TAPS'), min: K('K_MIN_TAPS', 5), max: K('K_TAP_LIMIT', 63), step: 2 },
  { key: 'fc', label: say('SAY_FC'), min: K('K_FC_MIN_MILLI', 20), max: K('K_FC_MAX_MILLI', 450), step: 5, fmt: (v) => (v / MILLI).toFixed(3) },
  { key: 'win', label: say('SAY_WINDOW'), kind: 'choice', options: W.SAY_WINDOWS || [] },
  { key: 'bits', label: say('SAY_BITS'), min: K('K_MIN_BITS', 6), max: K('K_MAX_BITS', 20) },
  { key: 'fs', label: say('SAY_FSTOP'), min: K('K_FSTOP_MIN_MILLI', 50), max: K('K_FSTOP_MAX_MILLI', 490), step: 5, fmt: (v) => (v / MILLI).toFixed(3) },
], { names: W.SAY_PRESET_NAMES, values: { taps: K('K_PRESET_TAPS'), fc: K('K_PRESET_FC_MILLI'), win: K('K_PRESET_WINDOW'), bits: K('K_PRESET_BITS'), fs: K('K_PRESET_FSTOP_MILLI') } }, draw)

const stems = canvas('fd-taps', say('SAY_TAPS_LABEL'))
const resp = canvas('fd-resp', say('SAY_RESP_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, stems, resp,
  el('div', { class: 'dk-legend' }, el('span', {}, el('i', { style: `background:${COLORS[0]}` }), say('SAY_INT')), el('span', {}, el('i', { style: `background:${COLORS[2]}` }), say('SAY_FLOAT')), el('span', {}, el('i', { style: `background:${COLORS[6]}` }), say('SAY_STOPBAND'))), source())

function draw(s) {
  const fc = s.fc / MILLI, fstop = s.fs / MILLI, win = WINS[s.win]
  const q = Array.from({ length: s.taps }, (_, k) => firTapQ(s.taps, k, fc, win, s.bits))
  const qmax = Math.max(1, ...q.map(Math.abs))
  stems.replaceChildren()
  const p = plot(stems, { w: 640, h: 200, x0: -1, x1: s.taps, y0: -qmax * 0.35, y1: qmax * 1.1, yticks: [0, qmax], yfmt: (v) => num(v), xticks: [0, (s.taps - 1) / 2, s.taps - 1], xlabel: say('SAY_TAP_AXIS') })
  q.forEach((v, k) => {
    stems.append(svgEl('line', { x1: p.x(k), x2: p.x(k), y1: p.y(0), y2: p.y(v), stroke: v < 0 ? COLORS[4] : COLORS[0], 'stroke-width': 2.5 }))
    stems.append(svgEl('circle', { cx: p.x(k), cy: p.y(v), r: 3.5, fill: v < 0 ? COLORS[4] : COLORS[0] }))
  })
  resp.replaceChildren()
  const pr = plot(resp, { w: 640, h: 260, x0: 0, x1: 0.5, y0: FLOOR, y1: 5, yticks: [FLOOR, FLOOR / 2, -20, 0], xticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], xlabel: say('SAY_F_AXIS'), ylabel: say('SAY_DB') })
  resp.append(svgEl('rect', { x: pr.x(fstop), y: pr.y(5), width: pr.x(0.5) - pr.x(fstop), height: pr.y(FLOOR) - pr.y(5), fill: COLORS[6], opacity: 0.08 }))
  const pts = Array.from({ length: 301 }, (_, k) => (0.5 * k) / 300)
  pr.line(pts.map((f) => [f, Math.max(FLOOR, firDb(s.taps, fc, win, 0, f))]), COLORS[2], 1.5, { 'stroke-dasharray': '5 4' })
  pr.line(pts.map((f) => [f, Math.max(FLOOR, firDb(s.taps, fc, win, s.bits, f))]), COLORS[0], 2)
  const sq = firStopDb(s.taps, fc, win, s.bits, fstop)
  const sf = firStopDb(s.taps, fc, win, 0, fstop)
  resp.append(svgEl('line', { x1: pr.x(fstop), x2: pr.x(0.5), y1: pr.clampY(sq), y2: pr.clampY(sq), stroke: COLORS[6], 'stroke-width': 2 }))
  resp.append(svgEl('line', { x1: pr.x(fc), x2: pr.x(fc), y1: pr.y(5), y2: pr.y(FLOOR), stroke: COLORS[1], 'stroke-dasharray': '3 3' }))
  stat.replaceChildren(tiles([
    { label: say('SAY_STOP_INT'), value: fill(say('SAY_DB_VALUE'), sq.toFixed(1)), tone: 'bad' },
    { label: say('SAY_STOP_FLOAT'), value: fill(say('SAY_DB_VALUE'), sf.toFixed(1)), tone: 2 },
    { label: say('SAY_AT_FC'), value: fill(say('SAY_DB_VALUE'), firDb(s.taps, fc, win, s.bits, fc).toFixed(2)), tone: 1 },
    { label: say('SAY_CENTER'), value: num(q[(s.taps - 1) / 2]), tone: 0 },
  ]))
}

ctl.start()
