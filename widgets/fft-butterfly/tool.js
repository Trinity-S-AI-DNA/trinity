// fft-butterfly/tool.js -- lesson 22 of arithmetic-and-dsp: the radix-2 FFT as stages of
// butterflies, and why it costs N log N instead of N^2. It computes nothing itself: the input order,
// every butterfly's partner and twiddle, every value at every stage and the operation counts come
// from ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/dsp/signals.t27 compiled to wasm. Words
// are SAY_ and numbers K_ constants of specs/widgets/fft-butterfly.t27.
import { bfPartner, bfTwiddle, bitReverse, dftMults, fftButterflies, fftStages, fftValue, twiddleIm, twiddleRe } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const LENS = K('K_LENGTHS', [4, 8, 16])
const BITS = K('K_INPUT_BITS', 8)
const ctl = controls([
  { key: 'len', label: say('SAY_LEN'), kind: 'choice', options: LENS.map(String) },
  { key: 'pat', label: say('SAY_PATTERN'), kind: 'choice', options: W.SAY_PATTERNS || [] },
  { key: 'stage', label: say('SAY_STAGE'), min: 1, max: K('K_MAX_STAGE', 4) },
], { names: W.SAY_PRESET_NAMES, values: { len: K('K_PRESET_LEN'), pat: K('K_PRESET_PATTERN'), stage: K('K_PRESET_STAGE') } }, draw)

const net = canvas('fb-net', say('SAY_NET_LABEL'))
const circle = canvas('fb-circle', say('SAY_CIRCLE_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, net, el('p', { class: 'dk-note' }, say('SAY_NOTE')), circle, source())

function draw(s) {
  const N = LENS[s.len]
  const L = fftStages(N)
  const st = Math.min(s.stage, L) - 1
  net.replaceChildren()
  const rowH = Math.min(46, 560 / N)
  const H = 40 + N * rowH
  net.setAttribute('viewBox', `0 0 640 ${H}`)
  const colW = 470 / L
  const x = (c) => 90 + c * colW
  const y = (i) => 30 + i * rowH + rowH / 2
  for (let c = 0; c <= L; c++) net.append(svgEl('text', { x: x(c), y: 16, 'text-anchor': 'middle', class: 'dk-txt-dim' }, c === 0 ? say('SAY_IN') : fill(say('SAY_AFTER'), c)))
  for (let c = 0; c < L; c++) {
    const on = c === st
    for (let i = 0; i < N; i++) {
      if ((i & (1 << c)) !== 0) continue
      const j = bfPartner(i, c)
      const col = on ? COLORS[c % COLORS.length] : 'rgba(173,201,192,0.25)'
      const w = on ? 2.5 : 1.2
      for (const [a, b] of [[i, i], [i, j], [j, i], [j, j]]) net.append(svgEl('line', { x1: x(c), y1: y(a), x2: x(c + 1), y2: y(b), stroke: col, 'stroke-width': w }))
      const t = bfTwiddle(i, c, N)
      if (on && rowH > 18) net.append(svgEl('text', { x: x(c) + 8, y: y(j) - 6, class: 'dk-txt', style: `fill:${COLORS[c % COLORS.length]}` }, fill(say('SAY_W'), t, N)))
    }
  }
  for (let c = 0; c <= L; c++) {
    for (let i = 0; i < N; i++) {
      net.append(svgEl('circle', { cx: x(c), cy: y(i), r: Math.min(6, rowH / 4), fill: c === st || c === st + 1 ? '#fff' : '#adc9c0' }))
      if (N <= 8) {
        const re = fftValue(s.pat, N, BITS, false, c, i, false)
        const im = fftValue(s.pat, N, BITS, false, c, i, true)
        net.append(svgEl('text', { x: x(c) + (c === L ? 10 : -8), y: y(i) + 16, 'text-anchor': c === L ? 'start' : 'end', class: 'dk-txt-dim' }, im ? `${re}${im < 0 ? '-' : '+'}${Math.abs(im)}j` : re))
      }
    }
  }
  for (let i = 0; i < N; i++) {
    net.append(svgEl('text', { x: 10, y: y(i) + 4, class: 'dk-txt' }, fill(say('SAY_X_IN'), bitReverse(i, L))))
    net.append(svgEl('text', { x: 630, y: y(i) + 4, class: 'dk-txt', 'text-anchor': 'end' }, fill(say('SAY_X_OUT'), i)))
  }
  // The twiddles this stage multiplies by, on the unit circle.
  circle.replaceChildren()
  circle.setAttribute('viewBox', '0 0 640 230')
  const cx = 120, cy = 115, R = 90
  circle.append(svgEl('circle', { cx, cy, r: R, fill: 'none', stroke: 'rgba(173,201,192,0.3)' }))
  const used = new Set()
  for (let i = 0; i < N; i++) if ((i & (1 << st)) === 0) used.add(bfTwiddle(i, st, N))
  for (let t = 0; t < N; t++) {
    const on = used.has(t)
    circle.append(svgEl('circle', { cx: cx + R * twiddleRe(t, N), cy: cy - R * twiddleIm(t, N), r: on ? 8 : 4, fill: on ? COLORS[st % COLORS.length] : '#3a4a45' }))
  }
  circle.append(svgEl('text', { x: 260, y: 90, class: 'dk-txt-big' }, fill(say('SAY_STAGE_USES'), st + 1, used.size)))
  circle.append(svgEl('text', { x: 260, y: 120, class: 'dk-txt' }, say('SAY_CIRCLE_NOTE')))
  const bf = fftButterflies(N)
  stat.replaceChildren(tiles([
    { label: say('SAY_STAGES'), value: String(L), tone: 0 },
    { label: say('SAY_BUTTERFLIES'), value: num(bf), tone: 1 },
    { label: say('SAY_DFT'), value: num(dftMults(N)), tone: 'bad' },
    { label: say('SAY_AT_1024'), value: fill(say('SAY_VS'), num(fftButterflies(K('K_BIG_N', 1024))), num(dftMults(K('K_BIG_N', 1024)))), tone: 2 },
  ]))
}

ctl.start()
