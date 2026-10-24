// barker-corr/tool.js -- lesson 25 of arithmetic-and-dsp: a Barker-13 correlator finds the start of
// a frame in a stream of chips. It computes nothing itself: the sliding window, the correlation and
// the lock decision come from ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/bpsk.t27 (the
// ZeroDSP BPSK modem core) compiled to wasm. Words are SAY_ and numbers K_ constants of
// specs/widgets/barker-corr.t27; the stream the reader edits is input, not logic.
import { correlate, rxPush, syncLocked } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const CHIPS = K('K_STREAM_CHIPS', 32)
const LEN = K('K_BARKER13_LEN', 13)
const BARKER = K('K_BARKER13_BITS', 5279)
const FILL = K('K_FILL_BITS', 2774429293)
const THRESH = K('K_SYNC_THRESHOLD', 9)
const ctl = controls([
  { key: 'at', label: say('SAY_AT'), min: 0, max: CHIPS - LEN },
  { key: 'inv', label: say('SAY_PHASE'), kind: 'choice', options: W.SAY_PHASES || [] },
  { key: 'flips', kind: 'hidden', min: 0, max: 4294967295 },
], { names: W.SAY_PRESET_NAMES, values: { at: K('K_PRESET_AT'), inv: K('K_PRESET_INV'), flips: K('K_PRESET_FLIPS') } }, draw)

const stream = canvas('bc-stream', say('SAY_STREAM_LABEL'))
const corr = canvas('bc-corr', say('SAY_CORR_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, el('p', { class: 'dk-note' }, say('SAY_TAP')), stream, stat, corr, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

/** The received chips: the filler, the preamble at `at` (sent bit 12 first, so the window sees the packed constant), the flips. */
function chipsOf(s) {
  return Array.from({ length: CHIPS }, (_, p) => {
    const inPre = p >= s.at && p < s.at + LEN
    let c = inPre ? (BARKER >>> (LEN - 1 - (p - s.at))) & 1 : (FILL >>> p) & 1
    if ((s.flips >>> p) & 1) c ^= 1
    if (s.inv) c ^= 1
    return { c, inPre, flipped: ((s.flips >>> p) & 1) === 1 }
  })
}

function draw(s) {
  const rx = chipsOf(s)
  stream.replaceChildren()
  stream.setAttribute('viewBox', '0 0 640 130')
  const cw = 600 / CHIPS
  const x = (p) => 20 + p * cw
  stream.append(svgEl('rect', { x: x(s.at), y: 6, width: LEN * cw, height: 118, rx: 6, fill: COLORS[1], opacity: 0.1, stroke: COLORS[1], 'stroke-opacity': 0.6 }))
  stream.append(svgEl('line', { x1: 20, x2: 620, y1: 65, y2: 65, stroke: 'rgba(173,201,192,0.3)' }))
  rx.forEach(({ c, inPre, flipped }, p) => {
    const up = c === 1
    const bar = svgEl('rect', { x: x(p) + 2, y: up ? 25 : 65, width: cw - 4, height: 40, rx: 3, fill: inPre ? COLORS[1] : COLORS[2], stroke: flipped ? COLORS[6] : 'none', 'stroke-width': 3, class: 'dk-bitbtn', tabindex: 0, role: 'button', 'aria-label': fill(say('SAY_CHIP'), p) })
    const flip = () => ctl.set('flips', (s.flips ^ (2 ** p)) >>> 0)
    bar.addEventListener('click', flip)
    bar.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip() } })
    stream.append(bar)
    stream.append(svgEl('text', { x: x(p) + cw / 2, y: up ? 20 : 120, 'text-anchor': 'middle', class: 'dk-txt-dim', 'pointer-events': 'none' }, up ? '+' : '-'))
  })
  // Push the chips through the 13-chip window one by one; correlate once the window is full.
  let win = 0
  const r = []
  rx.forEach(({ c }, p) => { win = rxPush(win, c); if (p >= LEN - 1) r.push([p, correlate(win)]) })
  corr.replaceChildren()
  corr.setAttribute('viewBox', '0 0 640 240')
  const y = (v) => 120 - v * 7.5
  corr.append(svgEl('line', { x1: 20, x2: 620, y1: y(0), y2: y(0), stroke: 'rgba(173,201,192,0.4)' }))
  for (const t of [THRESH, -THRESH]) corr.append(svgEl('line', { x1: 20, x2: 620, y1: y(t), y2: y(t), stroke: COLORS[6], 'stroke-dasharray': '6 4' }))
  corr.append(svgEl('text', { x: 24, y: y(THRESH) - 6, class: 'dk-txt', style: `fill:${COLORS[6]}` }, fill(say('SAY_THRESHOLD'), THRESH)))
  let peak = [0, -99]
  let side = 0
  for (const [p, v] of r) {
    const lock = syncLocked(v)
    if (v > peak[1]) peak = [p, v]
    corr.append(svgEl('line', { x1: x(p) + cw / 2, x2: x(p) + cw / 2, y1: y(0), y2: y(v), stroke: lock ? COLORS[0] : v < 0 ? COLORS[5] : COLORS[2], 'stroke-width': Math.max(3, cw * 0.5) }))
    corr.append(svgEl('text', { x: x(p) + cw / 2, y: v >= 0 ? y(v) - 6 : y(v) + 14, 'text-anchor': 'middle', class: 'dk-txt-dim' }, v))
  }
  for (const [p, v] of r) if (p !== peak[0]) side = Math.max(side, Math.abs(v))
  const locks = r.filter(([, v]) => syncLocked(v)).length
  stat.replaceChildren(tiles([
    { label: say('SAY_PEAK'), value: fill(say('SAY_PEAK_AT'), peak[1], peak[0]), tone: 0 },
    { label: say('SAY_SIDE'), value: String(side), tone: 2 },
    { label: say('SAY_LOCKS'), value: String(locks), tone: locks === 1 ? 0 : 'bad' },
    { label: say('SAY_FLIPS'), value: String(rx.filter((q) => q.flipped).length), tone: 6 },
  ]))
}

ctl.start()
