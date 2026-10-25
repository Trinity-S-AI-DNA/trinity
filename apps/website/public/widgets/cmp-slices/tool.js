// cmp-slices/tool.js -- lesson 15 of t27-compiler: four cases from the Rust path. The answers are count_byte, is_digit,
// first_plus_of_three and name_len, fn bodies of gHashTag/t27 specs/compiler/codegen_conformance.t27 compiled to wasm
// (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/cmp-slices.t27.
import { countByte, firstPlusOfThree, isDigit, nameLen } from './logic.js'
import { K, W, ask, controls, el, facts, fill, head, hue, root, say, source, stages, tape, textBox } from '../cmp-kit.js'

const ENC = new TextEncoder()
let sel = K('K_START_BYTE', 97)
let index = K('K_START_INDEX', 0)
const glyph = (b) => (b > 32 && b < 127 ? String.fromCharCode(b) : b === 32 ? ' ' : '\u00b7')
const yn = (v) => (v ? say('SAY_YES') : say('SAY_NO'))

const out = el('div')
const box = textBox({ label: say('SAY_TEXT_LABEL'), samples: W.SAY_SAMPLES, start: K('K_START_SAMPLE', 0), max: K('K_MAX_TEXT', 24), onChange: draw })
root.replaceChildren(stages(), ask(say('SAY_ASK')), box.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(text) {
  const bytes = [...ENC.encode(text)]
  const pick = (i) => { sel = bytes[i]; draw(text) }
  const xs = K('K_XS', [])
  out.replaceChildren(
    head(say('SAY_TAP')),
    bytes.length ? tape(bytes.map((b) => ({ main: glyph(b), sub: b, color: hue(b === sel ? 0 : 8), on: b === sel })), pick) : el('p', { class: 'dk-note' }, say('SAY_NOTHING')),
    facts([
      { label: fill(say('SAY_COUNT'), sel), value: countByte(text, sel), color: hue(0) },
      { label: fill(say('SAY_IS_DIGIT'), sel), value: yn(isDigit(sel)), color: hue(isDigit(sel) ? 1 : 8) },
    ]),
    head(`${say('SAY_SLICE')} / ${say('SAY_TABLE')}`),
    tape(xs.map((x, i) => ({ main: String(x), sub: i, color: hue(i === index ? 2 : 8), on: i === index })), (i) => { index = i; draw(text) }),
    tape(W.SAY_NAMES.map((n, i) => ({ main: n, sub: i, color: hue(i === index ? 3 : 8), on: i === index })), (i) => { index = i; draw(text) }),
    facts([
      { label: fill(say('SAY_FIRST_PLUS'), index), value: firstPlusOfThree(index), color: hue(2) },
      { label: fill(say('SAY_NAME_LEN'), index), value: nameLen(index), color: hue(3) },
    ]))
}

box.start()
