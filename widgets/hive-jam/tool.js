// hive-jam/tool.js -- lesson 13 of queen-and-hive: which jam a stuck pull request is in. The lit
// rule, where the card sits, is jam_case of the nine facts, the fn body of gHashTag/t27
// specs/automation/review-jam.t27 compiled to wasm (./logic.js). The order of the rungs is read from
// jam_case too, not written down: see ORDER below. Words are SAY_ and numbers K_ constants of
// specs/widgets/hive-jam.t27.
import { jamCase } from './logic.js'
import { K, W, ask, controls, el, head, ladder, root, say, source, taps } from '../hive-kit.js'

const NF = 9, NC = K('K_CASES', 10)
const facts = (f) => [...Array(NF)].map((_, i) => !!(f & (1 << i)))

// The rule order, asked of jam_case: CLEAR is the first set of facts it calls JAM_NONE; a case's
// trigger is the fewest facts flipped from CLEAR that land on it; of two cases, the earlier rule is
// the one jam_case names with both triggers flipped. A rule's place is how many cases it beats.
const ALL = [...Array(1 << NF).keys()], CASE_OF = ALL.map((f) => jamCase(...facts(f)))
const CLEAR = ALL.find((f) => CASE_OF[f] === K('K_JAM_NONE', 0))
const flips = (f) => (f ^ CLEAR).toString(2).split('1').length - 1
const TRIG = [...Array(NC)].map((_, k) => ALL.filter((f) => CASE_OF[f] === k).reduce((a, f) => (flips(f) < flips(a) ? f : a)) ^ CLEAR)
const WINS = TRIG.map((ta, a) => TRIG.filter((tb, b) => b !== a && CASE_OF[CLEAR ^ (ta | tb)] === a).length)
const ORDER = [...TRIG.keys()].sort((a, b) => WINS[b] - WINS[a])

const ctl = controls([{ key: 'f', kind: 'hidden', min: 0, max: 511 }], { names: W.SAY_PRESET_NAMES, values: { f: K('K_PRESET_FLAGS', []) } }, draw)
const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const CASE_TONES = [0, 2, 8, 6, 1, 5, 4, 3, 8, 6]

function draw(s) {
  const on = facts(s.f)
  const c = jamCase(...on)
  out.replaceChildren(
    taps(on.map((v, i) => ({ label: say('SAY_FLAGS', i), pressed: v, tone: 2 })), (i) => ctl.set('f', s.f ^ (1 << i)), say('SAY_ASK')),
    head(say('SAY_RULES')),
    ladder(ORDER.map((k, n) => ({ label: `${n + 1}. ${say('SAY_CASE_NAMES', k)}`, sub: k === c ? `${say('SAY_PR')} \u00b7 ${say('SAY_CASE')}` : null, tone: CASE_TONES[k], on: k === c }))))
}

ctl.start()
