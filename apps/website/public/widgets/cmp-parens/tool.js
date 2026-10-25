// cmp-parens/tool.js -- lesson 13 of t27-compiler: three conformance cases about unary operators and parentheses. The
// results are negated_sum, nand and nor_bits, fn bodies of gHashTag/t27 specs/compiler/codegen_conformance.t27 compiled
// to wasm (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/cmp-parens.t27.
import { nand, negatedSum, norBits } from './logic.js'
import { K, W, ask, controls, el, facts, head, hue, root, say, source, stages, tape } from '../cmp-kit.js'

const MAX = K('K_MAX_BYTE', 255)
const ctl = controls([
  { key: 'a', label: say('SAY_A'), min: 0, max: MAX, step: 1 },
  { key: 'b', label: say('SAY_B'), min: 0, max: MAX, step: 1 },
  { key: 'x', label: say('SAY_X'), kind: 'toggle' },
  { key: 'y', label: say('SAY_Y'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { a: K('K_PRESET_A', []), b: K('K_PRESET_B', []), x: K('K_PRESET_X', []), y: K('K_PRESET_Y', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

const bits = (v) => [...Array(8)].map((_, i) => (v >> (7 - i)) & 1).map((b) => ({ main: String(b), color: hue(b ? 0 : 8) }))

function draw(s) {
  const results = [negatedSum(s.a, s.b), nand(!!s.x, !!s.y) ? say('SAY_TRUE') : say('SAY_FALSE'), norBits(s.a, s.b)]
  out.replaceChildren(
    facts([0, 1, 2].flatMap((i) => [
      { label: `${say('SAY_CASES', i)}`, value: results[i], color: hue(i === 1 ? (results[i] === say('SAY_TRUE') ? 0 : 6) : 1) },
      { label: `${say('SAY_WRONG_LABEL')}: ${say('SAY_WRONG', i)}`, value: '', color: hue(8) },
    ])),
    head(say('SAY_BITS', 0)), tape(bits(s.a), null),
    head(say('SAY_BITS', 1)), tape(bits(s.b), null),
    head(say('SAY_BITS', 2)), tape(bits(results[2]), null))
}

ctl.start()
