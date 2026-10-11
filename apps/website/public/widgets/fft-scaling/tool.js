// fft-scaling/tool.js -- lesson 24 of arithmetic-and-dsp: FFT words grow stage by stage; halving
// every stage holds them, at a price. It computes nothing itself: the integer FFT, the peak after
// every stage, the bits it needs and the unscaled rule come from ./logic.js, the fn bodies of
// gHashTag/t27 specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers K_ constants
// of specs/widgets/fft-scaling.t27.
import { bitsFor, fftInput, fftPeak, fftStages, fftUnscaledBits } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const LENS = K('K_LENGTHS', [8, 16, 32, 64, 128, 256])
const ctl = controls([
  { key: 'len', label: say('SAY_LEN'), kind: 'choice', options: LENS.map(String) },
  { key: 'bits', label: say('SAY_BITS'), min: K('K_MIN_BITS', 4), max: K('K_MAX_BITS', 16) },
  { key: 'pat', label: say('SAY_PATTERN'), kind: 'choice', options: W.SAY_PATTERNS || [] },
  { key: 'scaled', label: say('SAY_SCALING'), kind: 'choice', options: W.SAY_SCALINGS || [] },
], { names: W.SAY_PRESET_NAMES, values: { len: K('K_PRESET_LEN'), bits: K('K_PRESET_BITS'), pat: K('K_PRESET_PATTERN'), scaled: K('K_PRESET_SCALED') } }, draw)

const grow = canvas('fs-grow', say('SAY_GROW_LABEL'))
const input = canvas('fs-input', say('SAY_INPUT_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, grow, el('p', { class: 'dk-note' }, say('SAY_NOTE')), input, source())

function draw(s) {
  const N = LENS[s.len]
  const L = fftStages(N)
  const sc = s.scaled === 1
  const need = Array.from({ length: L + 1 }, (_, st) => bitsFor(fftPeak(s.pat, N, s.bits, sc, st)))
  const rule = fftUnscaledBits(s.bits, N)
  grow.replaceChildren()
  const top = Math.max(rule, ...need) + 2
  const p = plot(grow, { w: 640, h: 260, x0: -0.6, x1: L + 0.6, y0: 0, y1: top, xticks: Array.from({ length: L + 1 }, (_, i) => i), yticks: [0, s.bits, rule], xlabel: say('SAY_STAGE_AXIS'), ylabel: say('SAY_BITS_AXIS') })
  need.forEach((b, st) => {
    const over = sc && b > s.bits
    grow.append(svgEl('rect', { x: p.x(st - 0.32), y: p.y(b), width: p.x(0.64) - p.x(0), height: p.y(0) - p.y(b), rx: 4, fill: over ? COLORS[6] : COLORS[st % COLORS.length] }))
    grow.append(svgEl('text', { x: p.x(st), y: p.y(b) - 6, 'text-anchor': 'middle', class: 'dk-txt' }, b))
  })
  p.line([[-0.6, s.bits], [L + 0.6, s.bits]], COLORS[2], 2, { 'stroke-dasharray': '6 4' })
  p.line([[-0.6, rule], [L + 0.6, rule]], COLORS[1], 2, { 'stroke-dasharray': '2 4' })
  grow.append(svgEl('text', { x: p.x(-0.5), y: p.y(rule) - 6, 'text-anchor': 'start', class: 'dk-txt', style: `fill:${COLORS[1]}` }, fill(say('SAY_RULE_LINE'), rule)))
  grow.append(svgEl('text', { x: p.x(-0.5), y: p.y(s.bits) + 16, 'text-anchor': 'start', class: 'dk-txt', style: `fill:${COLORS[2]}` }, fill(say('SAY_WORD_LINE'), s.bits)))
  input.replaceChildren()
  const mx = Math.max(1, ...Array.from({ length: N }, (_, n) => Math.abs(fftInput(s.pat, N, s.bits, n))))
  const pi = plot(input, { w: 640, h: 150, x0: -1, x1: N, y0: -mx * 1.1, y1: mx * 1.1, yticks: [-mx, 0, mx], yfmt: (v) => num(v), xticks: [0, N / 2, N - 1], xlabel: say('SAY_INPUT_AXIS') })
  for (let n = 0; n < N; n++) {
    const v = fftInput(s.pat, N, s.bits, n)
    input.append(svgEl('line', { x1: pi.x(n), x2: pi.x(n), y1: pi.y(0), y2: pi.y(v), stroke: COLORS[0], 'stroke-width': Math.max(1, 300 / N) }))
  }
  const final = fftPeak(s.pat, N, s.bits, sc, L)
  stat.replaceChildren(tiles([
    { label: say('SAY_RULE'), value: fill(say('SAY_BITS_N'), rule), tone: 1 },
    { label: say('SAY_NEEDED'), value: fill(say('SAY_BITS_N'), need[L]), tone: 0 },
    { label: say('SAY_PEAK'), value: num(final), tone: 2 },
    { label: say('SAY_STATE'), value: sc ? (need.some((b) => b > s.bits) ? say('SAY_OVERFLOW') : say('SAY_HELD')) : say('SAY_GROWS'), tone: sc && need.some((b) => b > s.bits) ? 'bad' : 3 },
  ]))
}

ctl.start()
