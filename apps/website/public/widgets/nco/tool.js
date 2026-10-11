// nco/tool.js -- lesson 14 of arithmetic-and-dsp: a numerically controlled oscillator. A phase
// accumulator adds a tuning word every clock; its top bits address a sine table. It computes
// nothing itself: the tuning word, the output frequency, the resolution, every phase, every output
// sample and the spur rule come from ./logic.js, the fn bodies of gHashTag/t27
// specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/nco.t27.
import { ncoFout, ncoPhase, ncoResolution, ncoSample, ncoSpurDb, ncoWord, tone, twoTo } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const MHZ = K('K_HZ_PER_MHZ', 1000000)
const WHEEL = K('K_WHEEL_STEPS', 16)
const CLOCKS = K('K_CLOCKS_SHOWN', 64)
const ctl = controls([
  { key: 'fclk', label: say('SAY_FCLK'), min: K('K_FCLK_MIN_MHZ', 10), max: K('K_FCLK_MAX_MHZ', 500) },
  { key: 'nb', label: say('SAY_NBITS'), min: K('K_MIN_ACC_BITS', 8), max: K('K_MAX_ACC_BITS', 32) },
  { key: 'fout', label: say('SAY_FOUT'), min: 0, max: K('K_FOUT_MAX_MHZ', 250), step: 1 / K('K_FOUT_STEP_DIV', 1000), fmt: (v) => v.toFixed(3) },
  { key: 'pb', label: say('SAY_PBITS'), min: K('K_MIN_TABLE_BITS', 4), max: K('K_MAX_TABLE_BITS', 16) },
  { key: 'ab', label: say('SAY_ABITS'), min: K('K_MIN_TABLE_BITS', 4), max: K('K_MAX_TABLE_BITS', 16) },
], { names: W.SAY_PRESET_NAMES, values: { fclk: K('K_PRESET_FCLK_MHZ'), nb: K('K_PRESET_ACC_BITS'), fout: (K('K_PRESET_FOUT_KHZ') || []).map((v) => v / 1000), pb: K('K_PRESET_PHASE_BITS'), ab: K('K_PRESET_AMP_BITS') } }, draw)

const wheel = canvas('nc-wheel', say('SAY_WHEEL_LABEL'))
const out = canvas('nc-out', say('SAY_OUT_LABEL'))
const stat = el('div')
const msg = el('p', { class: 'dk-note' })
root.replaceChildren(ctl.node, msg, stat, wheel, out, source())

function draw(s) {
  if (s.pb > s.nb) { msg.textContent = say('SAY_PBITS_TOO_MANY'); return }
  msg.textContent = ''
  const fclk = s.fclk * MHZ
  const word = ncoWord(fclk, s.nb, s.fout * MHZ)
  const span = twoTo(s.nb)
  wheel.replaceChildren()
  wheel.setAttribute('viewBox', '0 0 640 300')
  const cx = 150, cy = 150, R = 120
  wheel.append(svgEl('circle', { cx, cy, r: R, fill: 'none', stroke: 'rgba(173,201,192,0.35)', 'stroke-width': 2 }))
  let prev = null
  const seen = new Set()
  for (let k = 0; k <= WHEEL; k++) {
    const frac = ncoPhase(word, k, s.nb) / span
    const px = cx + R * tone(frac + 0.25, 1), py = cy - R * tone(frac, 1)
    const c = COLORS[k % COLORS.length]
    if (prev) wheel.append(svgEl('line', { x1: prev[0], y1: prev[1], x2: px, y2: py, stroke: c, 'stroke-width': 1.5, opacity: 0.7 }))
    wheel.append(svgEl('circle', { cx: px, cy: py, r: 6, fill: c }))
    // A phase the accumulator comes back to keeps the label of its first visit.
    const key = `${Math.round(px)},${Math.round(py)}`
    if (!seen.has(key)) wheel.append(svgEl('text', { x: cx + (R + 16) * tone(frac + 0.25, 1), y: cy - (R + 16) * tone(frac, 1) + 4, 'text-anchor': 'middle', class: 'dk-txt-dim' }, k))
    seen.add(key)
    prev = [px, py]
  }
  const fo = ncoFout(fclk, s.nb, word)
  ;[[fill(say('SAY_WORD_IS'), num(word)), 1], [fill(say('SAY_STEP_IS'), (word / span).toFixed(6)), 2], [fill(say('SAY_FOUT_IS'), num(fo, 3)), 0], [fill(say('SAY_RES_IS'), ncoResolution(fclk, s.nb).toExponential(4)), 3]].forEach(([t, c], j) => {
    wheel.append(svgEl('text', { x: 310, y: 70 + j * 34, style: `font: 700 14px var(--w-mono); fill: ${COLORS[c]}` }, t))
  })
  wheel.append(svgEl('text', { x: 310, y: 230, class: 'dk-txt-dim' }, fill(say('SAY_WHEEL_NOTE'), WHEEL)))
  out.replaceChildren()
  const p = plot(out, { w: 640, h: 220, x0: 0, x1: CLOCKS, y0: -1.15, y1: 1.15, yticks: [-1, 0, 1], xticks: [0, CLOCKS / 4, CLOCKS / 2, (3 * CLOCKS) / 4, CLOCKS], xlabel: say('SAY_CLOCKS') })
  p.line(Array.from({ length: 641 }, (_, k) => [(CLOCKS * k) / 640, tone(fo / fclk, (CLOCKS * k) / 640)]), 'rgba(173,201,192,0.5)', 1.5, { 'stroke-dasharray': '5 4' })
  for (let k = 0; k <= CLOCKS; k++) {
    const v = ncoSample(word, k, s.nb, s.pb, s.ab)
    out.append(svgEl('line', { x1: p.x(k), x2: p.x(k), y1: p.y(0), y2: p.y(v), stroke: COLORS[0], 'stroke-width': 2 }))
    out.append(svgEl('circle', { cx: p.x(k), cy: p.y(v), r: 3.5, fill: COLORS[0] }))
  }
  stat.replaceChildren(tiles([
    { label: say('SAY_WORD'), value: num(word), tone: 1 },
    { label: say('SAY_ACTUAL'), value: fill(say('SAY_HZ'), num(fo, 3)), tone: 0 },
    { label: say('SAY_RES'), value: fill(say('SAY_HZ'), ncoResolution(fclk, s.nb).toPrecision(4)), tone: 3 },
    { label: say('SAY_SPUR'), value: fill(say('SAY_DBC'), ncoSpurDb(s.pb).toFixed(1)), tone: 6 },
  ]))
}

ctl.start()
