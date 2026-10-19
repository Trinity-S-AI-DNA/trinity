// hive-jam/tool.js -- lesson 13 of queen-and-hive: which jam a stuck pull request is in. The lit
// rule, where the card sits, is jam_case of the nine facts, the fn body of gHashTag/t27
// specs/automation/review-jam.t27 compiled to wasm (./logic.js). K_RULE_ORDER is the spec's rule list
// in its written order, used to draw the rungs. Words are SAY_ and numbers K_ constants of
// specs/widgets/hive-jam.t27.
import { jamCase } from './logic.js'
import { K, W, ask, controls, el, head, ladder, root, say, source, taps } from '../hive-kit.js'

const NF = 9, ORDER = K('K_RULE_ORDER', [])
const ctl = controls([{ key: 'f', kind: 'hidden', min: 0, max: 511 }], { names: W.SAY_PRESET_NAMES, values: { f: K('K_PRESET_FLAGS', []) } }, draw)
const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const CASE_TONES = [0, 2, 8, 6, 1, 5, 4, 3, 8, 6]

function draw(s) {
  const on = [...Array(NF)].map((_, i) => !!(s.f & (1 << i)))
  const c = jamCase(...on)
  out.replaceChildren(
    taps(on.map((v, i) => ({ label: say('SAY_FLAGS', i), pressed: v, tone: 2 })), (i) => ctl.set('f', s.f ^ (1 << i)), say('SAY_ASK')),
    head(say('SAY_RULES')),
    ladder(ORDER.map((k, n) => ({ label: `${n + 1}. ${say('SAY_CASE_NAMES', k)}`, sub: k === c ? `${say('SAY_PR')} \u00b7 ${say('SAY_CASE')}` : null, tone: CASE_TONES[k], on: k === c }))))
}

ctl.start()
