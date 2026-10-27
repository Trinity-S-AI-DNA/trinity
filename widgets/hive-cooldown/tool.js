// hive-cooldown/tool.js -- lesson 24 of queen-and-hive: the cooldown clock, /stop and /mute. The dial
// verdict is cooled(ms), the stop cards may_answer_after_stop and the mute card heard_while_muted, fn
// bodies of gHashTag/t27 specs/automation/agent-hive-group.t27 compiled to wasm (./logic.js); the host
// turns the minutes the reader sets into milliseconds. Words are SAY_ and numbers K_ constants of
// specs/widgets/hive-cooldown.t27.
import { cooled, heardWhileMuted, mayAnswerAfterStop } from './logic.js'
import { K, W, ask, controls, dial, el, head, root, say, source, two, verdict } from '../hive-kit.js'

const MIN = K('K_MS_PER_MINUTE', 60000)
const ctl = controls([
  { key: 'ms', label: say('SAY_MS'), min: 0, max: K('K_MS_MAX', 10000), step: K('K_MS_STEP', 100) },
  { key: 'stop', label: say('SAY_STOP'), min: 0, max: K('K_STOP_MAX', 20), step: 1 },
  { key: 'mute', label: say('SAY_MUTE'), min: 0, max: K('K_MUTE_MAX', 90), step: 1 },
  { key: 'tagged', label: say('SAY_TAGGED'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { ms: K('K_PRESET_MS', []), stop: K('K_PRESET_STOP', []), mute: K('K_PRESET_MUTE', []), tagged: K('K_PRESET_TAGGED', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const ok = cooled(s.ms)
  const card = (word, heard) => verdict(heard ? say('SAY_HEARD') : say('SAY_SILENT'), heard ? 0 : 8, word)
  out.replaceChildren(
    dial({ value: s.ms, max: K('K_MS_MAX', 10000), tone: ok ? 0 : 1, big: `${(s.ms / 1000).toFixed(1)} s`, small: say('SAY_DIAL'), label: say('SAY_DIAL'), marks: [{ at: K('K_BOT_REPLY_COOLDOWN_MS', 5000), tone: 1 }] }),
    verdict(ok ? say('SAY_COOLED') : say('SAY_WAIT'), ok ? 0 : 1),
    head(say('SAY_STOP')),
    two(card(say('SAY_STOP_CARDS', 0), mayAnswerAfterStop(true, s.stop * MIN)), card(say('SAY_STOP_CARDS', 1), mayAnswerAfterStop(false, s.stop * MIN))),
    head(say('SAY_MUTE')),
    card(say('SAY_MUTE_CARD'), heardWhileMuted(!!s.tagged, s.mute * MIN)))
}

ctl.start()
