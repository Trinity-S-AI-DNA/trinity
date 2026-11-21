// hive-shape/tool.js -- lesson 1 of queen-and-hive: what the Queen does with an issue that is not
// ready. It decides nothing itself: the column, the row of attempts and the tiles are shape_action
// and attempt_due of gHashTag/t27 specs/queen/shaping.t27, compiled to wasm (./logic.js). Words are
// SAY_ and numbers K_ constants of specs/widgets/hive-shape.t27.
import { attemptDue, shapeAction } from './logic.js'
import { K, W, ask, board, controls, el, head, pill, root, say, source, tiles, verdict } from '../hive-kit.js'

const TONES = [8, 0, 1]
const ctl = controls([
  { key: 'missing', label: say('SAY_MISSING'), min: 0, max: K('K_MISSING_MAX', 3), step: 1 },
  { key: 'attempts', label: say('SAY_ATTEMPTS'), min: 0, max: K('K_ATTEMPTS_MAX', 4), step: 1 },
  { key: 'minutes', label: say('SAY_MINUTES'), min: 0, max: K('K_MINUTES_MAX', 720), step: K('K_MINUTES_STEP', 30) },
  { key: 'container', label: say('SAY_CONTAINER'), kind: 'toggle' },
  { key: 'told', label: say('SAY_TOLD'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { missing: K('K_PRESET_MISSING', []), container: K('K_PRESET_CONTAINER', []), attempts: K('K_PRESET_ATTEMPTS', []), told: K('K_PRESET_TOLD', []), minutes: K('K_PRESET_MINUTES', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const act = shapeAction(s.missing, !!s.container, s.attempts, !!s.told)
  const row = [0, 1, 2, 3, 4].map((a) => shapeAction(s.missing, !!s.container, a, !!s.told))
  const due = attemptDue(s.attempts, s.minutes)
  out.replaceChildren(
    verdict(say('SAY_ACTIONS', act), TONES[act], say('SAY_ACTION_LINES', act)),
    board([0, 1, 2].map((i) => ({ name: say('SAY_ACTIONS', i), tone: TONES[i] })), [{ col: act, title: say('SAY_ISSUE'), sub: say('SAY_ACTION_LINES', act), on: true }]),
    head(say('SAY_ROW')),
    el('p', { class: 'hk-taps' }, row.map((a, i) => pill(`${i}: ${say('SAY_ACTIONS', a)}`, TONES[a], i === s.attempts ? 'hk-on' : ''))),
    tiles([
      { label: say('SAY_ACTION'), value: say('SAY_ACTIONS', act), tone: TONES[act] === 8 ? 2 : TONES[act] },
      { label: say('SAY_DUE'), value: due ? say('SAY_YES') : say('SAY_NO'), tone: due ? 0 : 6 },
      { label: say('SAY_LIMIT'), value: String(K('K_SHAPE_ATTEMPT_LIMIT', 2)), tone: 2 },
      { label: say('SAY_MINUTES'), value: String(s.minutes), tone: 5 },
    ]))
}

ctl.start()
