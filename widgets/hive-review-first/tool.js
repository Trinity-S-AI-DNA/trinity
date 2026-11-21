// hive-review-first/tool.js -- lesson 6 of queen-and-hive: no new work while finished work waits in
// review. Each candidate is kind_of its two flags and sits in the column admission(kind, queue) names;
// the sentence shows when round_refused says so. All three are fn bodies of gHashTag/t27
// specs/queen/review_first.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants
// of specs/widgets/hive-review-first.t27.
import { admission, kindOf, roundRefused } from './logic.js'
import { K, W, ask, board, controls, el, head, root, say, source, verdict } from '../hive-kit.js'

const FLAGS = [[false, false], [false, true], [true, false], [true, true]]
const ctl = controls([
  { key: 'queue', label: say('SAY_QUEUE'), min: 0, max: K('K_QUEUE_MAX', 40), step: 1 },
], { names: W.SAY_PRESET_NAMES, values: { queue: K('K_PRESET_QUEUE', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const cards = FLAGS.map(([assigned, sentBack], i) => {
    const kind = kindOf(assigned, sentBack)
    return { col: admission(kind, s.queue), title: say('SAY_CANDIDATES', i), sub: say('SAY_KIND_NAMES', kind), tone: admission(kind, s.queue) ? 6 : 0 }
  })
  const backlog = admission(kindOf(false, false), s.queue)
  const says = roundRefused(backlog ? 0 : 1, backlog ? 1 : 0)
  out.replaceChildren(
    board([{ name: say('SAY_COLUMNS', 0), tone: 0 }, { name: say('SAY_COLUMNS', 1), tone: 6 }], cards),
    head(say('SAY_ROUND')),
    says ? verdict(`${s.queue}${say('SAY_TAIL')}`, 6) : verdict(say('SAY_OPEN'), 0))
}

ctl.start()
