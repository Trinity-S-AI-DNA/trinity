// hive-reviewers/tool.js -- lesson 10 of queen-and-hive: how many reviews must run at once. The first
// meter is reviewer_concurrency, the second slots_needed and the gate keeps_up, fn bodies of
// gHashTag/t27 specs/queen/reviewer.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_
// constants of specs/widgets/hive-reviewers.t27.
import { keepsUp, reviewerConcurrency, slotsNeeded } from './logic.js'
import { K, W, ask, controls, el, fill, gate, meters, root, say, source } from '../hive-kit.js'

const ctl = controls([
  { key: 'keys', label: say('SAY_KEYS'), min: 0, max: K('K_KEYS_MAX', 20), step: 1 },
  { key: 'lanes', label: say('SAY_LANES'), min: 1, max: K('K_LANES_MAX', 4), step: 1 },
  { key: 'mb', label: say('SAY_MB'), min: 0, max: K('K_MB_MAX', 8000), step: K('K_MB_STEP', 250) },
  { key: 'per', label: say('SAY_PER'), min: 0, max: K('K_PER_MAX', 1000), step: K('K_PER_STEP', 50) },
  { key: 'waiting', label: say('SAY_WAITING'), min: 0, max: K('K_WAITING_MAX', 150), step: 1 },
  { key: 'rate', label: say('SAY_RATE'), min: 0, max: K('K_RATE_MAX', 120), step: 1 },
], { names: W.SAY_PRESET_NAMES, values: { keys: K('K_PRESET_KEYS', []), lanes: K('K_PRESET_LANES', []), mb: K('K_PRESET_MB', []), per: K('K_PRESET_PER', []), waiting: K('K_PRESET_WAITING', []), rate: K('K_PRESET_RATE', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const slots = reviewerConcurrency(s.keys, s.lanes, s.mb, s.per, s.waiting)
  const need = slotsNeeded(s.rate)
  const ok = keepsUp(slots, s.rate)
  const top = K('K_REVIEWER_CEILING', 16), fixed = K('K_REVIEWER_CONCURRENCY', 4)
  out.replaceChildren(
    meters([
      { label: say('SAY_AT_ONCE'), value: slots, max: top, text: String(slots), tone: ok ? 0 : 6, mark: fixed, markLabel: fill(say('SAY_FIXED'), fixed) },
      { label: say('SAY_NEEDED'), value: need, max: top, text: String(need), tone: 1 },
    ]),
    gate(ok, ok ? say('SAY_KEEPS') : say('SAY_BEHIND'), fill(say('SAY_GAP'), slots, need)))
}

ctl.start()
