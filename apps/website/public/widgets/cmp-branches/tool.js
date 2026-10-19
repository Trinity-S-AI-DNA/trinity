// cmp-branches/tool.js -- lesson 9 of t27-compiler: seven bodies in which an if/else is a value. Each result is the
// answer of one fn body of gHashTag/t27 specs/compiler/verilog_branch_context.t27 compiled to wasm (./logic.js).
// Words are SAY_ and numbers K_ constants of specs/widgets/cmp-branches.t27.
import { branchValue, explicitValue, localBranch, narrowValue, nestedValue, onComb, ordinaryIf } from './logic.js'
import { K, W, ask, code, controls, el, facts, fill, hue, root, say, source, stages, verdict } from '../cmp-kit.js'

const FNS = [branchValue, nestedValue, localBranch, narrowValue, explicitValue, ordinaryIf, onComb]
const ctl = controls([
  { key: 'value', label: say('SAY_INPUT'), min: 0, max: K('K_MAX_INPUT', 511), step: 1 },
  { key: 'fn', label: say('SAY_FN'), kind: 'choice', options: FNS.map((_, i) => say('SAY_FNS', i)) },
], { names: W.SAY_PRESET_NAMES, values: { value: K('K_PRESET_INPUT', []), fn: K('K_PRESET_FN', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const results = FNS.map((f) => f(s.value))
  out.replaceChildren(
    verdict(fill(say('SAY_RESULT'), results[s.fn]), 0, `${say('SAY_FNS', s.fn)}(${s.value})`),
    code(say('SAY_BODIES', s.fn), say('SAY_FNS', s.fn)),
    facts(FNS.map((_, i) => ({ label: `${say('SAY_FNS', i)}(${s.value})`, value: results[i], color: hue(i === s.fn ? 1 : 0) }))))
}

ctl.start()
