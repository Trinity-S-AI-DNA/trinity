// cmp-int-types/tool.js -- lesson 7 of t27-compiler: what a type name means to the reference compiler. The width is
// int_rank, the suffix verdict is is_integer_type_suffix and the kept span is trim_lo and trim_hi, fn bodies of
// gHashTag/t27 specs/compiler/int_type_names.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_
// constants of specs/widgets/cmp-int-types.t27.
import { intRank, isIntegerTypeSuffix, trimHi, trimLo } from './logic.js'
import { K, W, ask, el, facts, fill, hue, ladder, root, say, source, stages, tape, textBox, verdict } from '../cmp-kit.js'

const WIDTHS = K('K_WIDTHS', [])
const ENC = new TextEncoder()
const out = el('div')
const box = textBox({ label: say('SAY_TEXT_LABEL'), samples: W.SAY_SAMPLES, start: K('K_START_SAMPLE', 0), max: K('K_MAX_TEXT', 12), onChange: draw })
root.replaceChildren(stages(), ask(say('SAY_ASK')), box.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

const glyph = (b) => (b > 32 && b < 127 ? String.fromCharCode(b) : b === 32 ? ' ' : b === 9 ? '\t' : '\u00b7')

function draw(text) {
  const bytes = [...ENC.encode(text)]
  const rank = intRank(text)
  const suffix = isIntegerTypeSuffix(text)
  const lo = trimLo(text, 0, bytes.length)
  const hi = trimHi(text, lo, bytes.length)
  out.replaceChildren(
    verdict(rank ? fill(say('SAY_RANK'), rank) : say('SAY_RANK_NONE'), rank ? 0 : 6, `${say('SAY_SUFFIX')}: ${suffix ? say('SAY_YES') : say('SAY_NO')}`),
    bytes.length ? tape(bytes.map((b, i) => ({ main: glyph(b), sub: i, color: hue(i >= lo && i < hi ? 0 : 8), on: false })), null) : el('p', { class: 'dk-note' }, say('SAY_NOTHING')),
    facts([{ label: say('SAY_TRIM'), value: `${lo}..${hi}`, color: hue(2) }]),
    ladder(WIDTHS.map((w) => ({ label: fill(say('SAY_RUNG'), w), tone: 0, on: w === rank }))))
}

box.start()
