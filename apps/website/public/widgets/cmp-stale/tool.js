// cmp-stale/tool.js -- lesson 14 of t27-compiler: four cases about sharing a repeated expression. The results are
// stale_operand, shared_product, folded_twice and counted_three_times, fn bodies of gHashTag/t27
// specs/compiler/codegen_conformance.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of
// specs/widgets/cmp-stale.t27.
import { countedThreeTimes, foldedTwice, sharedProduct, staleOperand } from './logic.js'
import { K, W, ask, code, controls, el, fill, hue, root, say, source, stages, verdict } from '../cmp-kit.js'

const CALLS = [(x) => staleOperand(x), (x, y) => sharedProduct(x, y), (x) => foldedTwice(x), () => countedThreeTimes()]
const ctl = controls([
  { key: 'fn', label: say('SAY_FN'), kind: 'choice', options: W.SAY_FNS },
  { key: 'x', label: say('SAY_X'), min: 0, max: K('K_MAX_X', 262143), step: 1 },
  { key: 'y', label: say('SAY_Y'), min: 0, max: K('K_MAX_Y', 100), step: 1 },
], { names: W.SAY_PRESET_NAMES, values: { fn: K('K_PRESET_FN', []), x: K('K_PRESET_X', []), y: K('K_PRESET_Y', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const result = CALLS[s.fn](s.x, s.y)
  const call = [`stale_operand(${s.x})`, `shared_product(${s.x}, ${s.y})`, `folded_twice(${s.x})`, 'counted_three_times()'][s.fn]
  const recorded = s.fn === 0 && s.x === K('K_STALE_VECTOR', -1)
  out.replaceChildren(
    verdict(fill(say('SAY_RESULT'), result), 0, call),
    recorded ? verdict(fill(say('SAY_DEFECT'), K('K_STALE_DEFECT', 0), call), 6, '') : el('span'),
    code(say('SAY_BODIES', s.fn), say('SAY_FNS', s.fn)),
    el('p', { class: 'cc-rule' }, say('SAY_RULES', s.fn)))
}

ctl.start()
