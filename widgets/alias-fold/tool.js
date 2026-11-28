// alias-fold/tool.js -- lesson 13 of arithmetic-and-dsp: a tone above fs/2 comes back as a lower
// one. It computes nothing itself: the apparent frequency, the fold's sign, the Nyquist zone and
// every point of every tone come from ./logic.js, the fn bodies of gHashTag/t27
// specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/alias-fold.t27.
import { aliasFreq, aliasSign, nyquistZone, tone } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const FMAX = K('K_F_MAX', 400)
const SHOWN = K('K_SAMPLES_SHOWN', 12)
const ctl = controls([
  { key: 'f', label: say('SAY_F'), min: 0, max: FMAX },
  { key: 'fs', label: say('SAY_FS'), min: K('K_FS_MIN', 20), max: K('K_FS_MAX', 200) },
], { names: W.SAY_PRESET_NAMES, values: { f: K('K_PRESET_F'), fs: K('K_PRESET_FS') } }, draw)

const fold = canvas('af-fold', say('SAY_FOLD_LABEL'))
const time = canvas('af-time', say('SAY_TIME_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, fold, el('p', { class: 'dk-note' }, say('SAY_FOLD_NOTE')), time,
  el('div', { class: 'dk-legend' }, el('span', {}, el('i', { style: `background:${COLORS[2]}` }), say('SAY_TONE')), el('span', {}, el('i', { style: `background:${COLORS[3]}` }), say('SAY_ALIAS')), el('span', {}, el('i', { style: `background:${COLORS[1]}` }), say('SAY_SAMPLES'))), source())

function draw(s) {
  const a = aliasFreq(s.f, s.fs)
  // The fold: apparent frequency against input frequency, zones shaded by the spec's zone number.
  fold.replaceChildren()
  const p = plot(fold, { w: 640, h: 260, x0: 0, x1: FMAX, y0: 0, y1: s.fs * 0.55, xticks: [0, FMAX / 4, FMAX / 2, (3 * FMAX) / 4, FMAX], yticks: [0], xlabel: say('SAY_IN_AXIS'), ylabel: say('SAY_OUT_AXIS') })
  const cols = 320
  for (let c = 0; c < cols; c++) {
    const f0 = (FMAX * c) / cols
    if (nyquistZone(f0, s.fs) % 2 === 0) fold.append(svgEl('rect', { x: p.x(f0), y: p.y(s.fs * 0.55), width: p.x(FMAX / cols) - p.x(0) + 0.5, height: p.y(0) - p.y(s.fs * 0.55), fill: COLORS[5], opacity: 0.08 }))
  }
  p.line(Array.from({ length: 801 }, (_, k) => [(FMAX * k) / 800, aliasFreq((FMAX * k) / 800, s.fs)]), COLORS[0], 2)
  fold.append(svgEl('line', { x1: p.x(s.f), x2: p.x(s.f), y1: p.y(0), y2: p.y(a), stroke: COLORS[2], 'stroke-width': 2, 'stroke-dasharray': '4 3' }))
  fold.append(svgEl('line', { x1: p.x(0), x2: p.x(s.f), y1: p.y(a), y2: p.y(a), stroke: COLORS[3], 'stroke-width': 2, 'stroke-dasharray': '4 3' }))
  fold.append(svgEl('circle', { cx: p.x(s.f), cy: p.y(a), r: 7, fill: COLORS[2] }))
  fold.append(svgEl('circle', { cx: p.x(0), cy: p.y(a), r: 7, fill: COLORS[3] }))
  fold.append(svgEl('text', { x: p.x(0) + 10, y: p.y(a) - 8, class: 'dk-txt-big' }, fill(say('SAY_SEEN_AT'), a.toFixed(1))))
  // The time view: the tone, the samples, and the alias tone through the same samples.
  time.replaceChildren()
  const T = SHOWN / s.fs
  const pt = plot(time, { w: 640, h: 220, x0: 0, x1: T, y0: -1.2, y1: 1.2, yticks: [-1, 0, 1], xticks: [], xlabel: fill(say('SAY_TIME_AXIS'), SHOWN) })
  const N = 1200
  pt.line(Array.from({ length: N + 1 }, (_, k) => [(T * k) / N, tone(s.f, (T * k) / N)]), COLORS[2], 1.5)
  const sg = aliasSign(s.f, s.fs)
  pt.line(Array.from({ length: N + 1 }, (_, k) => [(T * k) / N, sg * tone(a, (T * k) / N)]), COLORS[3], 2.5, { 'stroke-dasharray': '7 4' })
  for (let k = 0; k <= SHOWN; k++) time.append(svgEl('circle', { cx: pt.x(k / s.fs), cy: pt.y(tone(s.f, k / s.fs)), r: 6, fill: COLORS[1] }))
  const z = nyquistZone(s.f, s.fs)
  stat.replaceChildren(tiles([
    { label: say('SAY_INPUT'), value: String(s.f), tone: 2 },
    { label: say('SAY_APPARENT'), value: a.toFixed(1), tone: 3 },
    { label: say('SAY_ZONE'), value: String(z), tone: z > 1 ? 'bad' : 0 },
    { label: say('SAY_FLIPPED'), value: sg < 0 ? say('SAY_YES') : say('SAY_NO'), tone: 5 },
  ]))
}

ctl.start()
