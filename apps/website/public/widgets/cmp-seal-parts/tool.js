// cmp-seal-parts/tool.js -- lesson 19 of t27-compiler: the independent check of a seal. The verdict is seal_check_alg
// and whether it counts is verdict_pass, fn bodies of gHashTag/t27 specs/verified/seal_check.t27 compiled to wasm
// (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/cmp-seal-parts.t27.
import { sealCheckAlg, verdictPass } from './logic.js'
import { K, W, ask, controls, el, ladder, root, say, source, stages, verdict } from '../cmp-kit.js'

const KEYS = ['spec', 'c', 'rust', 'verilog', 'zig']
const ALGS = [K('K_ALG_SHA256', 1), K('K_ALG_OTHER', 7)]
const ctl = controls([
  ...KEYS.map((key, i) => ({ key, label: say('SAY_PARTS', i), kind: 'choice', options: W.SAY_PART_STATES })),
  { key: 'passed', label: say('SAY_PASSED'), kind: 'toggle' },
  { key: 'forced', label: say('SAY_FORCED'), kind: 'toggle' },
  { key: 'alg', label: say('SAY_ALG'), kind: 'choice', options: W.SAY_ALG_NAMES },
], { names: W.SAY_PRESET_NAMES, values: { spec: K('K_PRESET_SPEC', []), c: K('K_PRESET_C', []), rust: K('K_PRESET_RUST', []), verilog: K('K_PRESET_VERILOG', []), zig: K('K_PRESET_ZIG', []), passed: K('K_PRESET_PASSED', []), forced: K('K_PRESET_FORCED', []), alg: K('K_PRESET_ALG', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const check = sealCheckAlg(ALGS[s.alg], s.spec, s.c, s.rust, s.verilog, s.zig, !!s.passed, !!s.forced)
  const pass = verdictPass(check)
  out.replaceChildren(
    verdict(say('SAY_CHECKS', check), pass ? 0 : check === K('K_CHECK_UNKNOWN', 8) ? 1 : 6, pass ? say('SAY_PASS') : say('SAY_NOT_PASS')),
    ladder(W.SAY_CHECKS.map((name, i) => ({ label: `${i} ${name}`, tone: verdictPass(i) ? 0 : i === K('K_CHECK_UNKNOWN', 8) ? 1 : 6, on: i === check }))))
}

ctl.start()
