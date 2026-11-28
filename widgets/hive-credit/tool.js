// hive-credit/tool.js -- lesson 19 of queen-and-hive: lending a key earns no credit. The credit meter
// and the verdict under it are wallet_credit (its answer picks and fills the verdict's words), and the
// tiles may_add_key, may_start_probe and cooldown_passed, fn bodies of gHashTag/t27
// specs/automation/queen-contributor-keys.t27 compiled to wasm (./logic.js). Words are SAY_ and
// numbers K_ constants of specs/widgets/hive-credit.t27.
import { cooldownPassed, mayAddKey, mayStartProbe, walletCredit } from './logic.js'
import { K, W, ask, controls, el, fill, meters, root, say, source, tiles, verdict } from '../hive-kit.js'

const KMAX = K('K_MAX_KEYS_PER_OWNER', 100), PMAX = K('K_MAX_PROBES_IN_FLIGHT', 4)
const ctl = controls([
  { key: 'keys', label: say('SAY_KEYS'), min: 0, max: KMAX, step: 1 },
  { key: 'probes', label: say('SAY_PROBES'), min: 0, max: K('K_PROBES_MAX', 6), step: 1 },
  { key: 'seconds', label: say('SAY_SECONDS'), min: 0, max: K('K_SECONDS_MAX', 120), step: 1 },
], { names: W.SAY_PRESET_NAMES, values: { keys: K('K_PRESET_KEYS', []), probes: K('K_PRESET_PROBES', []), seconds: K('K_PRESET_SECONDS', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, fill(say('SAY_NOTE'), PMAX, K('K_PROBE_COOLDOWN_SECONDS', 60))), source())
const yes = (v) => (v ? say('SAY_YES') : say('SAY_NO'))

function draw(s) {
  const credit = walletCredit(s.keys)
  const add = mayAddKey(s.keys), probe = mayStartProbe(s.probes), cool = cooldownPassed(s.seconds > 0, s.seconds)
  out.replaceChildren(
    meters([
      { label: fill(say('SAY_KEY_METER'), KMAX), value: s.keys, max: KMAX, text: `${s.keys} / ${KMAX}`, tone: add ? 2 : 6 },
      { label: say('SAY_CREDIT'), value: credit, max: KMAX, text: String(credit), tone: 1 },
      { label: say('SAY_SLOT_METER'), value: s.probes, max: Math.max(PMAX, s.probes), text: `${s.probes} / ${PMAX}`, tone: probe ? 0 : 6 },
    ]),
    verdict(fill(say(credit ? 'SAY_CREDITED' : 'SAY_ZERO'), credit), credit ? 0 : 1),
    tiles([
      { label: say('SAY_ADD'), value: yes(add), tone: add ? 0 : 6 },
      { label: say('SAY_PROBE'), value: yes(probe), tone: probe ? 0 : 6 },
      { label: say('SAY_COOL'), value: yes(cool), tone: cool ? 0 : 1 },
    ]))
}

ctl.start()
