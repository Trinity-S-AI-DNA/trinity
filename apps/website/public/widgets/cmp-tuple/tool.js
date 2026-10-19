// cmp-tuple/tool.js -- lesson 8 of t27-compiler: is a type text a simple tuple? The three tests are starts_with,
// ends_with and bytes_contain, the verdict is is_simple_tuple_type and the builtin check is is_icarus_builtin, fn
// bodies of gHashTag/t27 specs/compiler/verilog_names.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers
// K_ constants of specs/widgets/cmp-tuple.t27.
import { bytesContain, endsWith, isIcarusBuiltin, isSimpleTupleType, startsWith } from './logic.js'
import { K, W, ask, el, facts, hue, root, say, source, stages, textBox, verdict } from '../cmp-kit.js'

const out = el('div')
const box = textBox({ label: say('SAY_TEXT_LABEL'), samples: W.SAY_SAMPLES, start: K('K_START_SAMPLE', 0), max: K('K_MAX_TEXT', 24), onChange: draw })
root.replaceChildren(stages(), ask(say('SAY_ASK')), box.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(text) {
  const simple = isSimpleTupleType(text)
  const tests = [startsWith(text, '('), endsWith(text, ')'), bytesContain(text, K('K_COLON', 58))]
  const yn = (v) => (v ? say('SAY_YES') : say('SAY_NO'))
  out.replaceChildren(
    verdict(simple ? say('SAY_VERDICT', 0) : say('SAY_VERDICT', 1), simple ? 0 : 6, say('SAY_VERDICT_LINE')),
    facts([
      ...tests.map((t, i) => ({ label: say('SAY_TESTS', i), value: yn(t), color: hue(t ? (i === 2 ? 6 : 0) : 8) })),
      { label: say('SAY_BUILTIN'), value: yn(isIcarusBuiltin(text)), color: hue(isIcarusBuiltin(text) ? 1 : 8) },
    ]),
    el('p', { class: 'dk-note' }, say('SAY_BUILTIN_NAME')))
}

box.start()
