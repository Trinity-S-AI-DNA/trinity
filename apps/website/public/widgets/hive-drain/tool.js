// hive-drain/tool.js -- lesson 9 of queen-and-hive: what a redeploy does to running work. The cap is
// drain_cap_seconds(runner, platform) and every row is drain_verdict(kind, ended, waited, cap), fn
// bodies of gHashTag/t27 specs/queen/drain.t27 compiled to wasm (./logic.js). Words are SAY_ and
// numbers K_ constants of specs/widgets/hive-drain.t27.
import { drainCapSeconds, drainVerdict } from './logic.js'
import { K, W, ask, controls, el, ladder, meters, root, say, source } from '../hive-kit.js'

const ctl = controls([
  { key: 'wait', label: say('SAY_WAIT'), min: 0, max: K('K_WAIT_MAX', 2400), step: K('K_WAIT_STEP', 60) },
  { key: 'platform', label: say('SAY_PLATFORM'), min: 0, max: K('K_PLATFORM_MAX', 3600), step: K('K_PLATFORM_STEP', 30) },
  { key: 'ended', label: say('SAY_ENDED'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { wait: K('K_PRESET_WAIT', []), ended: K('K_PRESET_ENDED', []), platform: K('K_PRESET_PLATFORM', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const VERDICT_TONES = [8, 2, 4, 1, 5]

function draw(s) {
  const runner = K('K_RUNNER_DRAIN', 1800)
  const cap = drainCapSeconds(runner, s.platform)
  out.replaceChildren(
    meters([{ label: say('SAY_WAITED'), value: Math.min(s.wait, cap), max: cap || 1, text: `${s.wait} / ${cap}`, tone: s.wait >= cap ? 5 : 1, markLabel: `${say('SAY_CAP')}: ${cap}` }]),
    ladder([0, 1, 2, 3, 4].map((kind) => { const v = drainVerdict(kind, !!s.ended, s.wait, cap); return { label: `${say('SAY_KIND_NAMES', kind)}: ${say('SAY_VERDICT_NAMES', v)}`, sub: say('SAY_VERDICT_LINES', v), tone: VERDICT_TONES[v], on: true } })))
}

ctl.start()
