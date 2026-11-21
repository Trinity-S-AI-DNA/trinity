// hive-gate/tool.js -- lesson 12 of queen-and-hive: when the merger may merge an approved pull
// request. Each check is check_passes of its flags and the gate is gate_open(posted, running,
// blocking), fn bodies of gHashTag/t27 specs/queen/merger_gate.t27 compiled to wasm (./logic.js); the
// host counts the checks not concluded and the concluded ones that do not pass. Words are SAY_ and
// numbers K_ constants of specs/widgets/hive-gate.t27.
import { checkPasses, gateOpen } from './logic.js'
import { K, W, ask, controls, el, fill, gate, pill, root, say, source, taps } from '../hive-kit.js'

const N = K('K_CHECKS', 4), BITS = K('K_FLAG_BITS', [1, 2, 4, 8])
const keys = [...Array(N)].map((_, i) => `c${i}`)
const ctl = controls([
  { key: 'posted', label: say('SAY_POSTED'), min: 0, max: N, step: 1 },
  { key: 'ruleset', label: say('SAY_RULESET'), kind: 'toggle' },
  ...keys.map((key) => ({ key, kind: 'hidden', min: 0, max: 15 })),
], { names: W.SAY_PRESET_NAMES, values: { posted: K('K_PRESET_POSTED', []), ruleset: K('K_PRESET_RULESET', []), ...Object.fromEntries(keys.map((k, i) => [k, K(`K_PRESET_C${i}`, [])])) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  let running = 0, blocking = 0
  const rows = keys.slice(0, s.posted).map((k, i) => {
    const f = (j) => !!(s[k] & BITS[j])
    const concluded = f(1)
    const pass = checkPasses(!!s.ruleset, f(0), concluded, f(2), f(3))
    if (!concluded) running++
    else if (!pass) blocking++
    return el('div', { class: 'hk-path' },
      el('p', { class: 'hk-path-head' }, el('code', {}, say('SAY_CHECK_NAMES', i)), pill(!concluded ? say('SAY_RUNNING') : pass ? say('SAY_PASSES') : say('SAY_BLOCKS'), !concluded ? 1 : pass ? 0 : 6)),
      taps(BITS.map((b, j) => ({ label: say('SAY_FLAGS', j), pressed: !!(s[k] & b), tone: !concluded ? 1 : pass ? 0 : 6 })), (j) => ctl.set(k, s[k] ^ BITS[j]), say('SAY_CHECK_NAMES', i)))
  })
  const open = gateOpen(s.posted, running, blocking)
  out.replaceChildren(...rows, gate(open, open ? say('SAY_OPEN') : say('SAY_SHUT'), fill(say('SAY_COUNTS'), s.posted, running, blocking)))
}

ctl.start()
