// cmp-operand/tool.js -- lesson 5 of t27-compiler: has_empty_operand, the check that finds a rendered expression whose
// operator lost its right side. The verdict and every cell of the tape is the answer of that fn, a fn body of
// gHashTag/t27 specs/compiler/operator_text.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants
// of specs/widgets/cmp-operand.t27.
import { hasEmptyOperand } from './logic.js'
import { K, W, ask, el, fill, hue, root, say, source, stages, tape, textBox, verdict } from '../cmp-kit.js'

const OPS = W.SAY_OPS
const out = el('div')
const box = textBox({ label: say('SAY_TEXT_LABEL'), samples: W.SAY_SAMPLES, start: K('K_START_SAMPLE', 0), max: K('K_MAX_TEXT', 40), onChange: draw })
root.replaceChildren(stages(), ask(say('SAY_ASK')), box.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(text) {
  const hole = hasEmptyOperand(text)
  out.replaceChildren(
    text === '' ? verdict(say('SAY_WHOLE'), 2, say('SAY_NOTHING')) : verdict(hole ? say('SAY_HOLE') : say('SAY_WHOLE'), hole ? 6 : 0, text),
    el('p', { class: 'dk-label' }, say('SAY_TABLE')),
    tape(OPS.map((op) => {
      const dropped = hasEmptyOperand(fill(say('SAY_DROPPED_FORM'), op))
      const kept = hasEmptyOperand(fill(say('SAY_KEPT_FORM'), op))
      return { main: op, sub: !dropped ? say('SAY_MISSED') : kept ? say('SAY_ALARM') : say('SAY_CAUGHT'), color: hue(dropped && !kept ? 0 : 6) }
    }), null))
}

box.start()
