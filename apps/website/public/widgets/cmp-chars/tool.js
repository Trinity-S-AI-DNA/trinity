// cmp-chars/tool.js -- lesson 1 of t27-compiler: how the lexer sorts one byte. Each cell is coloured by
// is_alpha, is_digit and is_whitespace; the facts for the tapped byte are all five predicates. They are fn
// bodies of gHashTag/t27 specs/compiler/lexer.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers
// K_ constants of specs/widgets/cmp-chars.t27.
import { isAlnum, isAlpha, isDigit, isHexDigit, isWhitespace } from './logic.js'
import { K, W, ask, el, facts, fill, head, hue, legend, root, say, source, stages, tape, textBox, tiles } from '../cmp-kit.js'

const ENC = new TextEncoder()
const EDGE = K('K_EDGE_BYTES', [])
const PREDICATES = [isAlpha, isDigit, isHexDigit, isAlnum, isWhitespace]
let sel = K('K_START_BYTE', 102)

const toneOf = (b) => (isWhitespace(b) ? 2 : isDigit(b) ? 1 : isAlpha(b) ? 0 : 6)
const glyph = (b) => (b > 32 && b < 127 ? String.fromCharCode(b) : b === 32 ? ' ' : b === 9 ? '\t' : '\u00b7')
const cellOf = (b) => ({ main: glyph(b), sub: b, color: hue(toneOf(b)), on: b === sel })

const out = el('div')
const box = textBox({ label: say('SAY_TEXT_LABEL'), samples: W.SAY_SAMPLES, start: K('K_START_SAMPLE', 0), max: K('K_MAX_TEXT', 40), onChange: draw })
root.replaceChildren(stages(), ask(say('SAY_ASK')), box.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(text) {
  const bytes = [...ENC.encode(text)]
  const count = [0, 0, 0, 0]
  for (const b of bytes) count[[0, 1, 2, 6].indexOf(toneOf(b))]++
  const pick = (b) => { sel = b; draw(text) }
  out.replaceChildren(
    legend([0, 1, 2, 3].map((i) => ({ label: say('SAY_CLASSES', i), color: hue([0, 1, 2, 6][i]) }))),
    bytes.length ? tape(bytes.map(cellOf), (i) => pick(bytes[i])) : el('p', { class: 'dk-note' }, say('SAY_NOTHING')),
    tiles(count.map((n, i) => ({ label: say('SAY_COUNTS', i), value: n, tone: [0, 1, 2, 6][i] }))),
    head(say('SAY_EDGES')),
    tape(EDGE.map(cellOf), (i) => pick(EDGE[i])),
    el('p', { class: 'dk-label' }, fill(say('SAY_BYTE'), sel)),
    facts(PREDICATES.map((f, i) => ({ label: say('SAY_PREDICATES', i), value: f(sel) ? say('SAY_TRUE') : say('SAY_FALSE'), color: hue(f(sel) ? 0 : 8) }))),
  )
}

box.start()
