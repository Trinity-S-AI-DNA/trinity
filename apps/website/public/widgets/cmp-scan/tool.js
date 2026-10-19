// cmp-scan/tool.js -- lesson 2 of t27-compiler: the three scanners of the t27a assembler. Each row shows where
// skip_spaces, name_end or digits_end stops from the tapped byte. They are fn bodies of gHashTag/t27 specs/isa/t27a.t27
// compiled to wasm (./logic.js); the host only draws the bytes between the start and the stop. Words are SAY_ and
// numbers K_ constants of specs/widgets/cmp-scan.t27.
import { digitsEnd, nameEnd, skipSpaces } from './logic.js'
import { K, W, ask, el, fill, hue, root, say, source, stages, tape, textBox } from '../cmp-kit.js'

const ENC = new TextEncoder()
const DEC = new TextDecoder()
const SCANNERS = [skipSpaces, nameEnd, digitsEnd]
const TONES = [2, 0, 1]
let start = K('K_START_AT', 0)

const glyph = (b) => (b > 32 && b < 127 ? String.fromCharCode(b) : b === 32 ? ' ' : b === 9 ? '\t' : '\u00b7')
const out = el('div')
const box = textBox({ label: say('SAY_TEXT_LABEL'), samples: W.SAY_SAMPLES, start: K('K_START_SAMPLE', 0), max: K('K_MAX_TEXT', 40), onChange: draw })
root.replaceChildren(stages(), ask(say('SAY_ASK')), box.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(text) {
  const bytes = [...ENC.encode(text)]
  if (!bytes.length) { out.replaceChildren(el('p', { class: 'dk-note' }, say('SAY_NOTHING'))); return }
  start = Math.min(start, bytes.length)
  const pick = (i) => { start = i; draw(text) }
  const row = (i) => {
    const stop = SCANNERS[i](text, 0, false, start)
    const walked = DEC.decode(Uint8Array.from(bytes.slice(start, stop)))
    return el('div', { class: 'hk-path' },
      el('p', { class: 'hk-path-head' }, el('code', {}, say('SAY_SCANNERS', i)), el('span', { class: 'hk-pill', style: `--hc:${hue(TONES[i])}` }, fill(say('SAY_STOPS_AT'), stop))),
      tape(bytes.map((b, j) => ({ main: glyph(b), sub: j, color: hue(j >= start && j < stop ? TONES[i] : 8), on: j === start })), null),
      el('p', { class: 'hk-cap' }, fill(say('SAY_WALKED'), stop - start) + (walked ? `: ${walked}` : '')))
  }
  out.replaceChildren(
    el('p', { class: 'dk-label' }, say('SAY_TAP')),
    tape(bytes.map((b, j) => ({ main: glyph(b), sub: j, color: hue(j === start ? 1 : 8), on: j === start })), pick),
    el('p', { class: 'dk-label' }, fill(say('SAY_AT'), start)),
    ...[0, 1, 2].map(row))
}

box.start()
