// hive-jam-action/tool.js -- lesson 14 of queen-and-hive: the Queen's move for each jam. The action is
// jam_action(case) and each case card's column is jam_is_queens_turn of its case, fn bodies of
// gHashTag/t27 specs/automation/review-jam.t27 compiled to wasm (./logic.js). Words are SAY_ and
// numbers K_ constants of specs/widgets/hive-jam-action.t27.
import { jamAction, jamIsQueensTurn } from './logic.js'
import { K, W, ask, board, controls, el, fill, root, say, source, verdict } from '../hive-kit.js'

const NC = K('K_CASES', 10)
const ctl = controls([{ key: 'c', label: say('SAY_CASE'), min: 0, max: K('K_CASE_MAX', 255), step: 1 }], { names: W.SAY_PRESET_NAMES, values: { c: K('K_PRESET_CASE', []) } }, draw)
const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const a = jamAction(s.c)
  const name = s.c < NC ? say('SAY_CASE_NAMES', s.c) : fill(say('SAY_UNKNOWN'), s.c)
  out.replaceChildren(
    verdict(`${say('SAY_ACTION')}: ${say('SAY_ACTION_NAMES', a)}`, jamIsQueensTurn(s.c) ? 1 : 8, `${say('SAY_CASE')} ${s.c}: ${name}`),
    board([{ name: say('SAY_COLUMNS', 0), tone: 1 }, { name: say('SAY_COLUMNS', 1), tone: 8 }],
      [...Array(NC)].map((_, k) => ({ col: jamIsQueensTurn(k) ? 0 : 1, title: `${k}. ${say('SAY_CASE_NAMES', k)}`, sub: say('SAY_ACTION_NAMES', jamAction(k)), tone: jamIsQueensTurn(k) ? 1 : 8, on: k === s.c }))))
}

ctl.start()
