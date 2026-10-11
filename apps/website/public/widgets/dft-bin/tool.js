// dft-bin/tool.js -- lesson 15 of arithmetic-and-dsp: what one DFT bin measures, and the leakage
// when a tone falls between bins. It computes nothing itself: the windowed input and every bin's
// level come from ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/dsp/signals.t27 compiled
// to wasm. Words are SAY_ and numbers K_ constants of specs/widgets/dft-bin.t27.
import { dftDb, dftInput } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const LENS = K('K_LENGTHS', [16, 32, 64, 128])
const WINS = K('K_WINDOW_KINDS', [0, 3])
const FLOOR = -K('K_DB_SHOWN', 100)
const ctl = controls([
  { key: 'len', label: say('SAY_LEN'), kind: 'choice', options: LENS.map(String) },
  { key: 'k0', label: say('SAY_K0'), min: 0, max: K('K_MAX_K0', 32), step: 1 / K('K_K0_STEP_DIV', 20), fmt: (v) => v.toFixed(2) },
  { key: 'win', label: say('SAY_WINDOW'), kind: 'choice', options: W.SAY_WINDOWS || [] },
], { names: W.SAY_PRESET_NAMES, values: { len: K('K_PRESET_LEN'), k0: (K('K_PRESET_K0_HUNDREDTHS') || []).map((v) => v / 100), win: K('K_PRESET_WINDOW') } }, draw)

const spec = canvas('db-spec', say('SAY_SPEC_LABEL'))
const time = canvas('db-time', say('SAY_TIME_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, spec, el('p', { class: 'dk-note' }, say('SAY_NOTE')), time, source())

function draw(s) {
  const L = LENS[s.len]
  const win = WINS[s.win]
  const half = L / 2
  const levels = Array.from({ length: half + 1 }, (_, k) => Math.max(FLOOR, dftDb(L, s.k0, k, win)))
  spec.replaceChildren()
  const p = plot(spec, { w: 640, h: 260, x0: -0.6, x1: half + 0.6, y0: FLOOR, y1: 5, yticks: [FLOOR, FLOOR / 2, 0], xticks: Array.from({ length: 9 }, (_, i) => Math.round((half * i) / 8)), xlabel: say('SAY_BIN_AXIS'), ylabel: say('SAY_DB') })
  const bw = Math.max(2, (p.x(1) - p.x(0)) * 0.7)
  levels.forEach((v, k) => {
    const near = Math.abs(k - s.k0) < 0.5
    spec.append(svgEl('rect', { x: p.x(k) - bw / 2, y: p.y(v), width: bw, height: p.y(FLOOR) - p.y(v), rx: 2, fill: near ? COLORS[1] : COLORS[2], opacity: near ? 1 : 0.85 }))
  })
  spec.append(svgEl('line', { x1: p.x(s.k0), x2: p.x(s.k0), y1: p.y(5), y2: p.y(FLOOR), stroke: COLORS[3], 'stroke-width': 2, 'stroke-dasharray': '5 4' }))
  spec.append(svgEl('text', { x: p.x(s.k0) + 6, y: p.y(0) + 16, class: 'dk-txt', style: `fill:${COLORS[3]}` }, fill(say('SAY_TONE_AT'), s.k0.toFixed(2))))
  time.replaceChildren()
  const pt = plot(time, { w: 640, h: 200, x0: 0, x1: 2 * L, y0: -1.15, y1: 1.15, yticks: [-1, 0, 1], xticks: [0, L, 2 * L], xlabel: say('SAY_TIME_AXIS') })
  // Two copies of the window side by side: the DFT treats its input as one period of a repeat.
  for (let rep = 0; rep < 2; rep++) {
    for (let n = 0; n < L; n++) {
      const v = dftInput(L, s.k0, n, win)
      time.append(svgEl('line', { x1: pt.x(rep * L + n), x2: pt.x(rep * L + n), y1: pt.y(0), y2: pt.y(v), stroke: rep ? 'rgba(0,255,136,0.35)' : COLORS[0], 'stroke-width': 2 }))
    }
  }
  time.append(svgEl('line', { x1: pt.x(L), x2: pt.x(L), y1: pt.y(1.15), y2: pt.y(-1.15), stroke: COLORS[4], 'stroke-width': 2, 'stroke-dasharray': '3 3' }))
  time.append(svgEl('text', { x: pt.x(L) + 6, y: pt.y(1.0), class: 'dk-txt', style: `fill:${COLORS[4]}` }, say('SAY_SEAM')))
  const peak = Math.max(...levels)
  const far = Math.min(half, Math.round(s.k0) + K('K_FAR_BINS', 4))
  stat.replaceChildren(tiles([
    { label: say('SAY_TONE'), value: fill(say('SAY_BINS'), s.k0.toFixed(2)), tone: 3 },
    { label: say('SAY_PEAK'), value: fill(say('SAY_DB_VALUE'), peak.toFixed(2)), tone: 1 },
    { label: fill(say('SAY_LEAK'), far), value: fill(say('SAY_DB_VALUE'), levels[far].toFixed(1)), tone: 2 },
    { label: say('SAY_WIN'), value: (W.SAY_WINDOWS || [])[s.win] ?? '', tone: 0 },
  ]))
}

ctl.start()
