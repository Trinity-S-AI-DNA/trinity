// bit-reverse/tool.js -- lesson 23 of arithmetic-and-dsp: the input order of a radix-2 FFT is the
// index with its bits read backwards. It computes nothing itself: every reversed index and the
// twiddle values come from ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/dsp/signals.t27
// compiled to wasm. Words are SAY_ and numbers K_ constants of specs/widgets/bit-reverse.t27.
import { bitReverse, fftStages, twiddleIm, twiddleRe } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const LENS = K('K_LENGTHS', [4, 8, 16, 32, 64])
const ctl = controls([
  { key: 'len', label: say('SAY_LEN'), kind: 'choice', options: LENS.map(String) },
  { key: 'pick', label: say('SAY_PICK'), min: 0, max: LENS.at(-1) - 1 },
], { names: W.SAY_PRESET_NAMES, values: { len: K('K_PRESET_LEN'), pick: K('K_PRESET_PICK') } }, draw)

const map = canvas('br-map', say('SAY_MAP_LABEL'))
const bits = canvas('br-bits', say('SAY_BITS_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, bits, map, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

const bin = (v, n) => v.toString(2).padStart(n, '0')

function draw(s) {
  const N = LENS[s.len]
  const nb = fftStages(N)
  const pick = Math.min(s.pick, N - 1)
  const rev = bitReverse(pick, nb)
  // The picked index, its bits, and the same bits read backwards.
  bits.replaceChildren()
  bits.setAttribute('viewBox', '0 0 640 140')
  const cw = Math.min(60, 480 / nb)
  const x0 = 320 - (nb * cw) / 2
  const b1 = bin(pick, nb), b2 = bin(rev, nb)
  for (let k = 0; k < nb; k++) {
    const c = COLORS[k % COLORS.length]
    bits.append(svgEl('rect', { x: x0 + k * cw + 3, y: 12, width: cw - 6, height: 34, rx: 6, fill: c }))
    bits.append(svgEl('text', { x: x0 + k * cw + cw / 2, y: 35, 'text-anchor': 'middle', style: 'font: 800 16px var(--w-mono); fill: #00140b' }, b1[k]))
    const k2 = nb - 1 - k
    bits.append(svgEl('rect', { x: x0 + k2 * cw + 3, y: 90, width: cw - 6, height: 34, rx: 6, fill: c }))
    bits.append(svgEl('text', { x: x0 + k2 * cw + cw / 2, y: 113, 'text-anchor': 'middle', style: 'font: 800 16px var(--w-mono); fill: #00140b' }, b2[k2]))
    bits.append(svgEl('line', { x1: x0 + k * cw + cw / 2, y1: 48, x2: x0 + k2 * cw + cw / 2, y2: 88, stroke: c, 'stroke-width': 2 }))
  }
  bits.append(svgEl('text', { x: x0 - 12, y: 35, 'text-anchor': 'end', class: 'dk-txt-big' }, pick))
  bits.append(svgEl('text', { x: x0 - 12, y: 113, 'text-anchor': 'end', class: 'dk-txt-big' }, rev))
  // Every index to its reversed place: natural order on the left, FFT input order on the right.
  map.replaceChildren()
  const rowH = Math.min(26, 520 / N)
  const H = 30 + N * rowH
  map.setAttribute('viewBox', `0 0 640 ${H}`)
  map.append(svgEl('text', { x: 120, y: 16, 'text-anchor': 'middle', class: 'dk-txt-dim' }, say('SAY_NATURAL')))
  map.append(svgEl('text', { x: 520, y: 16, 'text-anchor': 'middle', class: 'dk-txt-dim' }, say('SAY_REVERSED')))
  for (let i = 0; i < N; i++) {
    const r = bitReverse(i, nb)
    const on = i === pick
    const yy = (k) => 26 + k * rowH + rowH / 2
    const c = on ? COLORS[1] : `hsl(${(i * 360) / N} 80% 60%)`
    map.append(svgEl('line', { x1: 200, y1: yy(i), x2: 440, y2: yy(r), stroke: c, 'stroke-width': on ? 4 : 1.4, opacity: on ? 1 : 0.6 }))
    if (rowH >= 10) {
      map.append(svgEl('text', { x: 190, y: yy(i) + 4, 'text-anchor': 'end', class: on ? 'dk-txt-big' : 'dk-txt', style: rowH < 14 ? 'font-size:9px' : null }, `${i} ${bin(i, nb)}`))
      map.append(svgEl('text', { x: 450, y: yy(r) + 4, class: on ? 'dk-txt-big' : 'dk-txt', style: rowH < 14 ? 'font-size:9px' : null }, `${bin(r, nb)} ${i}`))
    }
  }
  stat.replaceChildren(tiles([
    { label: say('SAY_INDEX'), value: `${pick} = ${b1}`, tone: 1 },
    { label: say('SAY_REV'), value: `${rev} = ${b2}`, tone: 0 },
    { label: say('SAY_BITS'), value: String(nb), tone: 2 },
    { label: say('SAY_TWIDDLE'), value: fill(say('SAY_CPLX'), twiddleRe(pick, N).toFixed(3), twiddleIm(pick, N).toFixed(3)), tone: 3 },
  ]))
}

ctl.start()
