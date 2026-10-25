// cmp-overwrite/tool.js -- lesson 16 of t27-compiler: when t27c compile may write its output file. The answer is
// output_check and the measured answer before the rule is output_check_today, fn bodies of gHashTag/t27
// specs/compiler/compile_output.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of
// specs/widgets/cmp-overwrite.t27.
import { outputCheck, outputCheckToday } from './logic.js'
import { K, W, ask, controls, el, fill, ladder, root, say, source, stages, verdict } from '../cmp-kit.js'

const ctl = controls([
  { key: 'spec', label: say('SAY_IS_SPEC'), kind: 'toggle' },
  { key: 'exists', label: say('SAY_EXISTS'), kind: 'toggle' },
  { key: 'readable', label: say('SAY_READABLE'), kind: 'toggle' },
  { key: 'mark', label: say('SAY_MARK'), min: 0, max: K('K_MAX_MARK_LINE', 12), step: 1, fmt: (v) => (v === 0 ? say('SAY_NO_MARK') : String(v)) },
  { key: 'named', label: say('SAY_NAMED'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { spec: K('K_PRESET_SPEC', []), exists: K('K_PRESET_EXISTS', []), readable: K('K_PRESET_READABLE', []), mark: K('K_PRESET_MARK', []), named: K('K_PRESET_NAMED', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

// Only the write answer is green; the spec numbers the four answers and the refusals are the rest.
const toneOf = (answer) => (answer === K('K_OUT_WRITE', 0) ? 0 : 6)

function draw(s) {
  const answer = outputCheck(!!s.spec, !!s.exists, !!s.readable, s.mark, !!s.named)
  const before = outputCheckToday(!!s.spec, !!s.exists, !!s.readable, s.mark, !!s.named)
  out.replaceChildren(
    verdict(say('SAY_ANSWERS', answer), toneOf(answer), say('SAY_ANSWER_LINES', answer)),
    ladder([0, 1, 2, 3].map((i) => ({ label: say('SAY_ANSWERS', i), tone: toneOf(i), on: i === answer }))),
    el('p', { class: 'dk-note' }, fill(say('SAY_BEFORE'), say('SAY_ANSWERS', before))))
}

ctl.start()
