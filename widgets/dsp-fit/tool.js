// dsp-fit/tool.js -- lesson 6 of arithmetic-and-dsp: fitting a x b and a running sum onto DSP48E1
// slices. It computes nothing itself: the port each operand takes, the pieces and their widths, the
// slice count, guard bits, headroom and the most terms the accumulator holds come from ./logic.js,
// the fn bodies of gHashTag/t27 specs/fpga/dsp/multipliers.t27 compiled to wasm. Words are SAY_
// and numbers K_ constants of specs/widgets/dsp-fit.t27.
import { aPort, accFits, dspSlices, guardBits, headroom, maxTerms, multsOn200t, pieceBits, pieces } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, num, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const A_BITS = K('K_DSP_A_BITS', 25)
const B_BITS = K('K_DSP_B_BITS', 18)
const ACC = K('K_DSP_ACC_BITS', 48)
const ctl = controls([
  { key: 'wa', label: say('SAY_WA'), min: K('K_MIN_WIDTH', 2), max: K('K_MAX_WIDTH', 64) },
  { key: 'wb', label: say('SAY_WB'), min: K('K_MIN_WIDTH', 2), max: K('K_MAX_WIDTH', 64) },
  { key: 'e', label: say('SAY_TERMS'), min: 0, max: K('K_MAX_TERMS_LOG2', 24), fmt: (v) => num(2 ** v) },
], { names: W.SAY_PRESET_NAMES, values: { wa: K('K_PRESET_WA'), wb: K('K_PRESET_WB'), e: K('K_PRESET_TERMS_LOG2') } }, draw)

const tilesSvg = canvas('df-tiles', say('SAY_TILES_LABEL'))
const accSvg = canvas('df-acc', say('SAY_ACC_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, tilesSvg, accSvg, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const count = 2 ** s.e
  const pa = aPort(s.wa, s.wb)
  const pb = pa === A_BITS ? B_BITS : A_BITS
  const na = pieces(s.wa, pa)
  const nb = pieces(s.wb, pb)
  // The product as a wa x wb rectangle, cut into the pieces each slice multiplies.
  tilesSvg.replaceChildren()
  tilesSvg.setAttribute('viewBox', '0 0 640 300')
  const left = 70, top = 30, w = 540, h = 230
  const ux = w / Math.max(s.wa, 1), uy = h / Math.max(s.wb, 1)
  let x0 = left + w
  let t = 0
  for (let i = 0; i < na; i++) {
    const bw = pieceBits(s.wa, pa, i)
    let y0 = top + h
    for (let j = 0; j < nb; j++) {
      const bh = pieceBits(s.wb, pb, j)
      tilesSvg.append(svgEl('rect', { x: x0 - bw * ux + 2, y: y0 - bh * uy + 2, width: bw * ux - 4, height: bh * uy - 4, rx: 8, fill: COLORS[t % COLORS.length], opacity: 0.85 }))
      tilesSvg.append(svgEl('text', { x: x0 - (bw * ux) / 2, y: y0 - (bh * uy) / 2 + 5, 'text-anchor': 'middle', style: 'font: 700 14px var(--w-mono); fill: #00140b' }, fill(say('SAY_TILE'), bw, bh)))
      y0 -= bh * uy
      t++
    }
    x0 -= bw * ux
  }
  tilesSvg.append(svgEl('text', { x: left + w / 2, y: 20, 'text-anchor': 'middle', class: 'dk-txt' }, fill(say('SAY_A_ON'), s.wa, pa)))
  tilesSvg.append(svgEl('text', { x: 14, y: top + h / 2, 'text-anchor': 'middle', class: 'dk-txt', transform: `rotate(-90 14 ${top + h / 2})` }, fill(say('SAY_B_ON'), s.wb, pb)))
  tilesSvg.append(svgEl('text', { x: left + w / 2, y: 290, 'text-anchor': 'middle', class: 'dk-txt-dim' }, say('SAY_LOW_PIECES')))
  // The accumulator: product bits, guard bits for the running sum, what is left.
  const room = headroom(s.wa, s.wb)
  const g = guardBits(count)
  const prodBits = ACC - room
  const fits = accFits(s.wa, s.wb, count)
  accSvg.replaceChildren()
  accSvg.setAttribute('viewBox', '0 0 640 110')
  const bw = 600 / Math.max(ACC, prodBits + g)
  for (let i = 0; i < Math.max(ACC, prodBits + g); i++) {
    const kind = i < prodBits ? 2 : i < prodBits + g ? 1 : 0
    const over = i >= ACC
    accSvg.append(svgEl('rect', { x: 620 - (i + 1) * bw + 0.5, y: 30, width: bw - 1, height: 36, fill: over ? COLORS[6] : COLORS[kind], opacity: kind === 0 && !over ? 0.25 : 0.9 }))
  }
  accSvg.append(svgEl('text', { x: 620, y: 20, 'text-anchor': 'end', class: 'dk-txt' }, fill(say('SAY_ACC'), ACC)))
  accSvg.append(svgEl('text', { x: 20, y: 90, class: fits ? 'dk-txt' : 'dk-txt-big' }, fits ? fill(say('SAY_FITS'), prodBits, g) : fill(say('SAY_OVERFLOWS'), prodBits, g, ACC)))
  stat.replaceChildren(tiles([
    { label: say('SAY_SLICES'), value: String(dspSlices(s.wa, s.wb)), tone: 0 },
    { label: say('SAY_HEADROOM'), value: fill(say('SAY_BITS_N'), room), tone: room < 0 ? 'bad' : 2 },
    { label: say('SAY_MAX_TERMS'), value: num(maxTerms(s.wa, s.wb)), tone: 1 },
    { label: say('SAY_ON_200T'), value: num(multsOn200t(s.wa, s.wb)), tone: 5 },
  ]))
}

ctl.start()
