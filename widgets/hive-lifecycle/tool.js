// hive-lifecycle/tool.js -- lesson 7 of queen-and-hive: a task's life. The state after a tap, and
// whether each event button is lit or greyed, are next_state of gHashTag/t27 specs/queen/dispatch.t27,
// compiled to wasm (./logic.js); an event it answers ILLEGAL for is greyed. Words are SAY_ and
// numbers K_ constants of specs/widgets/hive-lifecycle.t27.
import { nextState } from './logic.js'
import { K, W, ask, controls, el, fill, head, pill, root, say, source, taps } from '../hive-kit.js'

const NS = K('K_STATES', 12), NE = K('K_EVENTS', 16), ILLEGAL = K('K_ILLEGAL', 99)
const STATE_TONES = [8, 0, 6, 2, 1, 0, 4, 3, 8, 5, 6, 2]
let trail = []
const ctl = controls([{ key: 'st', kind: 'hidden', min: 0, max: NS - 1 }],
  { names: W.SAY_PRESET_NAMES, values: { st: K('K_PRESET_STATE', []) } }, (s) => { if (!trail.length || trail.at(-1) !== s.st) trail = [...trail.slice(-5), s.st]; draw(s) })

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const next = [...Array(NE)].map((_, e) => nextState(s.st, e))
  const legal = next.filter((v) => v !== ILLEGAL).length
  out.replaceChildren(
    head(say('SAY_STATES')),
    el('p', { class: 'hk-taps hk-states' }, [...Array(NS)].map((_, i) => pill(i === s.st ? `${say('SAY_NOW')}: ${say('SAY_STATE_NAMES', i)}` : say('SAY_STATE_NAMES', i), STATE_TONES[i], i === s.st ? 'hk-on hk-big' : 'hk-faint'))),
    head(`${say('SAY_EVENTS')} · ${fill(say('SAY_LEGAL'), legal, NE)}`),
    taps(next.map((v, e) => ({ label: say('SAY_EVENT_NAMES', e), sub: v === ILLEGAL ? say('SAY_ILLEGAL') : `→ ${say('SAY_STATE_NAMES', v)}`, tone: v === ILLEGAL ? 8 : STATE_TONES[v], disabled: v === ILLEGAL })), (e) => { if (next[e] !== ILLEGAL) ctl.set('st', next[e]) }, say('SAY_EVENTS')),
    head(say('SAY_TRAIL')),
    el('p', { class: 'hk-taps' }, trail.map((t) => pill(say('SAY_STATE_NAMES', t), STATE_TONES[t]))))
}

ctl.start()
