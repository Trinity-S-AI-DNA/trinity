// hive-master-red/tool.js -- lesson 15 of queen-and-hive: what master's runs say about a red check.
// Each rung is run_says of its run and the running look_back, and the gate is discount_holds, fn
// bodies of gHashTag/t27 specs/queen/merger_gate.t27 compiled to wasm (./logic.js). Words are SAY_
// and numbers K_ constants of specs/widgets/hive-master-red.t27.
import { discountHolds, lookBack, runSays } from './logic.js'
import { K, W, ask, controls, el, fill, gate, head, pill, root, say, source, taps } from '../hive-kit.js'

const N = K('K_RUNS', 4), KINDS = K('K_RUN_KINDS', 8)
const keys = [...Array(N)].map((_, i) => `r${i}`)
const ctl = controls([
  ...keys.map((key) => ({ key, kind: 'hidden', min: 0, max: KINDS - 1 })),
  { key: 'base', kind: 'hidden', min: 0, max: 15 },
  { key: 'named', label: say('SAY_NAMED'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { ...Object.fromEntries(keys.map((k, i) => [k, K(`K_PRESET_R${i}`, [])])), base: K('K_PRESET_BASE', []), named: K('K_PRESET_NAMED', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const MASTER_TONES = [8, 6, 0]

function draw(s) {
  let soFar = K('K_MASTER_UNKNOWN', 0)
  const rows = keys.map((k, i) => {
    const after = !!(s.base & (1 << i))
    soFar = lookBack(soFar, after, s[k])
    const says = runSays(s[k])
    return el('div', { class: 'hk-path' },
      el('p', { class: 'hk-path-head' }, el('code', {}, fill(say('SAY_RUN'), i + 1)), pill(`${say('SAY_SO_FAR')}: ${say('SAY_MASTER_NAMES', soFar)}`, MASTER_TONES[soFar])),
      taps([
        { label: say('SAY_RUN_NAMES', s[k]), sub: `${say('SAY_SAYS')} ${say('SAY_MASTER_NAMES', says)}`, tone: MASTER_TONES[says] },
        { label: after ? say('SAY_AFTER') : say('SAY_BEFORE'), pressed: after, tone: after ? 2 : 8 },
      ], (j) => (j === 0 ? ctl.set(k, (s[k] + 1) % KINDS) : ctl.set('base', s.base ^ (1 << i))), fill(say('SAY_RUN'), i + 1)))
  })
  const holds = discountHolds(!!s.named, soFar)
  out.replaceChildren(head(say('SAY_TAP')), ...rows, gate(holds, holds ? say('SAY_HOLDS') : say('SAY_FAILS'), say('SAY_MASTER_NAMES', soFar)))
}

ctl.start()
