// cmp-seal-verdict/tool.js -- lesson 20 of t27-compiler: the seal receipt of a spec. The verdict is seal_verdict, a fn body
// of gHashTag/t27 specs/t27mcp/seal_verdict.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants
// of specs/widgets/cmp-seal-verdict.t27.
import { sealVerdict } from './logic.js'
import { K, W, ask, controls, el, ladder, root, say, source, stages, verdict } from '../cmp-kit.js'

const MAX = K('K_MAX_TESTS', 6)
const ctl = controls([
  { key: 'has', label: say('SAY_HAS'), kind: 'toggle' },
  { key: 'samePath', label: say('SAY_SAME_PATH'), kind: 'toggle' },
  { key: 'recorded', label: say('SAY_RECORDED'), kind: 'choice', options: W.SAY_RECORDED_NAMES },
  { key: 'current', label: say('SAY_CURRENT'), kind: 'choice', options: W.SAY_CURRENT_NAMES },
  { key: 'total', label: say('SAY_TOTAL'), min: 0, max: MAX, step: 1 },
  { key: 'passed', label: say('SAY_PASSED'), min: 0, max: MAX, step: 1 },
  { key: 'vacuous', label: say('SAY_VACUOUS'), min: 0, max: MAX, step: 1 },
  { key: 'forced', label: say('SAY_FORCED'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { has: K('K_PRESET_HAS', []), samePath: K('K_PRESET_SAME_PATH', []), recorded: K('K_PRESET_RECORDED', []), current: K('K_PRESET_CURRENT', []), total: K('K_PRESET_TOTAL', []), passed: K('K_PRESET_PASSED', []), vacuous: K('K_PRESET_VACUOUS', []), forced: K('K_PRESET_FORCED', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

// A verdict is good when it is verified, doubtful when unknown or vacuous, and bad otherwise: the spec names the codes.
const toneOf = (code) => (code === K('K_SV_VERIFIED', 7) ? 0 : code === K('K_SV_UNKNOWN', 2) || code === K('K_SV_VACUOUS', 6) ? 1 : 6)

function draw(s) {
  const failed = Math.max(0, s.total - s.passed)
  const path = say('SAY_PATHS', 0)
  const code = sealVerdict(s.has ? 1 : 0, s.samePath ? path : say('SAY_PATHS', 1), path, s.recorded ? '' : say('SAY_DIGESTS', 0), say('SAY_DIGESTS', s.current), s.total, s.passed, failed, failed, Math.min(s.vacuous, s.total), s.forced ? 1 : 0)
  out.replaceChildren(
    verdict(say('SAY_VERDICTS', code - 1), toneOf(code), say('SAY_NOTES', code - 1)),
    ladder(W.SAY_VERDICTS.map((name, i) => ({ label: `${i + 1} ${name}`, tone: toneOf(i + 1), on: i === code - 1 }))))
}

ctl.start()
