// hive-revisit/tool.js -- lesson 11 of queen-and-hive: when the reviewer looks again at a row that
// answered wait. Every bar is revisit_after_seconds of its wait count, and the dial and verdict are
// due_again, fn bodies of gHashTag/t27 specs/queen/reviewer.t27 compiled to wasm (./logic.js). Words
// are SAY_ and numbers K_ constants of specs/widgets/hive-revisit.t27.
import { dueAgain, revisitAfterSeconds } from './logic.js'
import { K, W, ask, controls, dial, el, head, meters, root, say, source, two, verdict } from '../hive-kit.js'

const WMAX = K('K_WAITS_MAX', 8)
const ctl = controls([
  { key: 'waits', label: say('SAY_WAITS'), min: 0, max: WMAX, step: 1 },
  { key: 'since', label: say('SAY_SINCE'), min: 0, max: K('K_SINCE_MAX', 1000), step: K('K_SINCE_STEP', 10) },
], { names: W.SAY_PRESET_NAMES, values: { waits: K('K_PRESET_WAITS', []), since: K('K_PRESET_SINCE', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const cap = K('K_WAIT_REVISIT_CAP_SECONDS', 900)
  const pause = revisitAfterSeconds(s.waits)
  const due = dueAgain(s.waits, s.since)
  out.replaceChildren(
    two(
      el('div', {}, head(say('SAY_BARS')), meters([...Array(WMAX + 1)].map((_, n) => { const v = revisitAfterSeconds(n); return { label: `${n}`, value: v, max: cap, text: `${v} s`, tone: n === s.waits ? 1 : 2 } }))),
      el('div', {}, dial({ value: Math.min(s.since, pause || 1), max: pause || 1, tone: due ? 0 : 1, big: `${s.since} s`, small: `${say('SAY_PAUSE')} ${pause}`, label: say('SAY_PAUSE') }),
        due ? verdict(say('SAY_DUE'), 0) : verdict(say('SAY_NOT_DUE'), 1))))
}

ctl.start()
