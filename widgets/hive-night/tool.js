// hive-night/tool.js -- lesson 25 of queen-and-hive: the night watch. The host counts the fails and the
// unmeasured among four checks; the verdict is night_verdict of the counts, the column
// night_report, fn bodies of gHashTag/t27 specs/automation/card-chat-night-watch.t27
// compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/hive-night.t27.
import { nightReport, nightVerdict } from './logic.js'
import { K, W, ask, board, comb, controls, el, fill, head, root, say, source, verdict } from '../hive-kit.js'

const N = K('K_CHECKS', 4)
const keys = [...Array(N)].map((_, i) => `c${i}`)
const ctl = controls([
  ...keys.map((key) => ({ key, kind: 'hidden', min: 0, max: 2 })),
  { key: 'open', label: say('SAY_OPEN'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { ...Object.fromEntries(keys.map((k, i) => [k, K(`K_PRESET_C${i}`, [])])), open: K('K_PRESET_OPEN', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const RESULT_FILL = ['#00ff88', '#ff4d6d', '#ffd700']
const VERDICT_TONES = [0, 6, 1]
const REPORT_TONES = [8, 6, 4, 0, 2]

function draw(s) {
  const fails = keys.filter((k) => s[k] === 1).length, unmeasured = keys.filter((k) => s[k] === 2).length
  const v = nightVerdict(fails, unmeasured)
  const r = nightReport(v, !!s.open)
  out.replaceChildren(
    head(say('SAY_TAP')),
    comb(keys.map((k, i) => ({ label: say('SAY_CHECK_NAMES', i), fill: RESULT_FILL[s[k]], alpha: 0.6 })), (i) => ctl.set(keys[i], (s[keys[i]] + 1) % 3)),
    verdict(say('SAY_VERDICT_NAMES', v), VERDICT_TONES[v], fill(say('SAY_COUNTS'), fails, unmeasured)),
    board([0, 1, 2, 3, 4].map((i) => ({ name: say('SAY_REPORT_NAMES', i), tone: REPORT_TONES[i] })), [{ col: r, title: say('SAY_TONIGHT'), sub: say('SAY_REPORT_NAMES', r), on: true }]))
}

ctl.start()
