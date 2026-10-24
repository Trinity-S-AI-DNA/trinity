// cmp-errors/tool.js -- lesson 6 of t27-compiler: the status codes of the t27a parser. The lit rung is the answer of
// assemble_status for the typed line; the word is assemble. They are fn bodies of gHashTag/t27 specs/isa/t27a.t27
// compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/cmp-errors.t27.
import { assemble, assembleStatus } from './logic.js'
import { K, W, ask, el, fill, ladder, root, say, source, stages, textBox, verdict } from '../cmp-kit.js'

const OK = K('K_ASM_OK', 0)
const N = W.SAY_STATUS_NAMES.length
const out = el('div')
const box = textBox({ label: say('SAY_TEXT_LABEL'), samples: W.SAY_SAMPLES, start: K('K_START_SAMPLE', 0), max: K('K_MAX_TEXT', 40), onChange: draw })
root.replaceChildren(stages(), ask(say('SAY_ASK')), box.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(text) {
  const status = assembleStatus(text)
  const ok = status === OK
  out.replaceChildren(
    verdict(say('SAY_STATUS_NAMES', status), ok ? 0 : 6, ok ? fill(say('SAY_WORD'), assemble(text)) : fill(say('SAY_CODE'), status)),
    ladder([...Array(N)].map((_, i) => ({ label: `${i} ${say('SAY_STATUS_NAMES', i)}`, sub: say('SAY_STATUS_LINES', i), tone: i === OK ? 0 : 6, on: i === status }))))
}

box.start()
