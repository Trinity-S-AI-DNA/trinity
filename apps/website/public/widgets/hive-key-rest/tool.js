// hive-key-rest/tool.js -- lesson 17 of queen-and-hive: how long a refused key rests. Every rung and the
// dial are cooldown_seconds, the fn body of gHashTag/t27 specs/queen/key_failover.t27 compiled to wasm
// (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/hive-key-rest.t27.
import { cooldownSeconds } from './logic.js'
import { K, W, ask, controls, dial, el, fill, ladder, root, say, source, two } from '../hive-kit.js'

const TRANSIENT = K('K_KE_TRANSIENT', 1)
const ctl = controls([
  { key: 'kind', label: say('SAY_KIND'), kind: 'choice', options: W.SAY_KIND_NAMES },
  { key: 'strikes', label: say('SAY_STRIKES'), min: 0, max: K('K_STRIKES_MAX', 8), step: 1 },
], { names: W.SAY_PRESET_NAMES, values: { kind: K('K_PRESET_KIND', []), strikes: K('K_PRESET_STRIKES', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const rest = cooldownSeconds(s.kind, s.strikes)
  const brk = K('K_KEY_BREAK_SECONDS', 1800)
  out.replaceChildren(two(
    ladder([...Array(K('K_RUNGS', 7))].map((_, n) => ({ label: fill(say('SAY_RUNG'), n), sub: fill(say('SAY_REST'), cooldownSeconds(TRANSIENT, n)), tone: 1, on: s.kind === TRANSIENT && n === s.strikes }))),
    el('div', {}, dial({ value: rest, max: brk, tone: rest >= brk ? 6 : rest ? 1 : 0, big: rest ? `${rest} s` : say('SAY_NONE'), small: fill(say('SAY_DIAL'), brk), label: fill(say('SAY_DIAL'), brk), marks: [{ at: K('K_COOL_CAP_SECONDS', 240), tone: 1 }] }),
      el('p', { class: 'hk-cap' }, `${say('SAY_KIND_NAMES', s.kind)} · ${fill(say('SAY_RUNG'), s.strikes)}`))))
}

ctl.start()
