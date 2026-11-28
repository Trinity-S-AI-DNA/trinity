// polyphase/tool.js -- lesson 21 of arithmetic-and-dsp: a polyphase decimator splits the taps into R
// phases and does its work at the low rate. It computes nothing itself: the phase of every tap, the
// taps per phase and the MACs per output come from ./logic.js, the fn bodies of gHashTag/t27
// specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/polyphase.t27.
import { macsPerOutput, polyPhase, polyTaps } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const ctl = controls([
  { key: 'taps', label: say('SAY_TAPS'), min: K('K_MIN_TAPS', 4), max: K('K_TAP_LIMIT', 64) },
  { key: 'r', label: say('SAY_R'), min: 2, max: K('K_MAX_R', 8) },
], { names: W.SAY_PRESET_NAMES, values: { taps: K('K_PRESET_TAPS'), r: K('K_PRESET_R') } }, draw)

const split = canvas('pp-split', say('SAY_SPLIT_LABEL'))
const bars = canvas('pp-bars', say('SAY_BARS_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, split, el('p', { class: 'dk-note' }, say('SAY_NOTE')), bars, source())

function draw(s) {
  const per = polyTaps(s.taps, s.r)
  split.replaceChildren()
  const H = 90 + s.r * 34 + 10
  split.setAttribute('viewBox', `0 0 640 ${H}`)
  const tw = 600 / s.taps
  split.append(svgEl('text', { x: 20, y: 16, class: 'dk-txt-dim' }, fill(say('SAY_ALL_TAPS'), s.taps)))
  for (let k = 0; k < s.taps; k++) {
    const ph = polyPhase(k, s.r)
    split.append(svgEl('rect', { x: 20 + k * tw + 1, y: 26, width: tw - 2, height: 26, rx: 3, fill: COLORS[ph % COLORS.length] }))
    if (tw > 18) split.append(svgEl('text', { x: 20 + k * tw + tw / 2, y: 44, 'text-anchor': 'middle', style: 'font: 700 10px var(--w-mono); fill: #00140b' }, k))
  }
  // The same taps, one row per phase: each row is a short filter that runs at the low rate.
  const cw = Math.min(40, 470 / per)
  for (let ph = 0; ph < s.r; ph++) {
    const y = 84 + ph * 34
    split.append(svgEl('text', { x: 20, y: y + 18, class: 'dk-txt', style: `fill:${COLORS[ph % COLORS.length]}` }, fill(say('SAY_PHASE'), ph)))
    let j = 0
    for (let k = 0; k < s.taps; k++) {
      if (polyPhase(k, s.r) !== ph) continue
      split.append(svgEl('rect', { x: 130 + j * cw + 1, y, width: cw - 2, height: 26, rx: 3, fill: COLORS[ph % COLORS.length] }))
      if (cw > 18) split.append(svgEl('text', { x: 130 + j * cw + cw / 2, y: y + 17, 'text-anchor': 'middle', style: 'font: 700 10px var(--w-mono); fill: #00140b' }, k))
      j++
    }
  }
  const naive = macsPerOutput(s.taps, s.r, false)
  const poly = macsPerOutput(s.taps, s.r, true)
  bars.replaceChildren()
  bars.setAttribute('viewBox', '0 0 640 110')
  ;[[naive, 'SAY_NAIVE', 6], [poly, 'SAY_POLY', 0]].forEach(([v, k, c], i) => {
    const y = 14 + i * 46
    bars.append(svgEl('rect', { x: 200, y, width: Math.max(2, (v / naive) * 420), height: 32, rx: 5, fill: COLORS[c] }))
    bars.append(svgEl('text', { x: 8, y: y + 21, class: 'dk-txt' }, say(k)))
    bars.append(svgEl('text', { x: 208, y: y + 21, style: 'font: 700 14px var(--w-mono); fill: #00140b' }, v))
  })
  stat.replaceChildren(tiles([
    { label: say('SAY_PER_PHASE'), value: String(per), tone: 1 },
    { label: say('SAY_NAIVE'), value: String(naive), tone: 'bad' },
    { label: say('SAY_POLY'), value: String(poly), tone: 0 },
    { label: say('SAY_SAVED'), value: fill(say('SAY_TIMES'), s.r), tone: 2 },
  ]))
}

ctl.start()
