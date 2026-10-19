// hive-column/tool.js -- lesson 26 of queen-and-hive: which column a task's card is in on the public
// board. Every card's column is column_of(claim, issue open, list known), the fn body of gHashTag/t27
// specs/queen/dispatch.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of
// specs/widgets/hive-column.t27.
import { columnOf } from './logic.js'
import { K, W, ask, board, controls, el, fill, head, root, say, source } from '../hive-kit.js'

const NC = K('K_CLAIMS', 5), NCOL = K('K_COLUMNS', 6)
const ctl = controls([
  { key: 'open', label: say('SAY_OPEN'), kind: 'toggle' },
  { key: 'known', label: say('SAY_KNOWN'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { open: K('K_PRESET_OPEN', []), known: K('K_PRESET_KNOWN', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const COL_TONES = [2, 6, 1, 4, 0, 8]
const CLAIM_TONES = [1, 0, 4, 2, 6]

function draw(s) {
  const cards = [...Array(NC)].map((_, c) => ({ col: columnOf(c, !!s.open, !!s.known), title: say('SAY_CLAIM_NAMES', c), sub: say('SAY_CLAIM'), tone: CLAIM_TONES[c] }))
  const done = cards.filter((c) => c.col === K('K_COL_DONE', 4)).length
  out.replaceChildren(head(fill(say('SAY_IN_DONE'), done, cards.length)), board([...Array(NCOL)].map((_, i) => ({ name: say('SAY_COLUMN_NAMES', i), tone: COL_TONES[i] })), cards))
}

ctl.start()
