// hive-rank/tool.js -- lesson 5 of queen-and-hive: which open issue the Queen takes first. For each of
// seven issues the host counts the criticals listed before it and calls capped_level, effective_level,
// eligible and why; the order is a sort whose only comparison is outranks. All five are fn bodies of
// gHashTag/t27 specs/queen/priority.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_
// constants of specs/widgets/hive-rank.t27.
import { cappedLevel, effectiveLevel, eligible, outranks, why } from './logic.js'
import { K, W, ask, controls, el, fill, head, ladder, root, say, source, taps } from '../hive-kit.js'

const N = K('K_ISSUES', 7), AGES = K('K_AGES', []), BLOCK = K('K_BLOCKERS', []), NUM = K('K_NUMBERS', [])
const NO_LABEL = K('K_NO_LABEL', 4), NORMAL = K('K_LEVEL_NORMAL', 2), CRITICAL = K('K_LEVEL_CRITICAL', 0)
const keys = [...Array(N)].map((_, i) => `l${i}`)
const ctl = controls(keys.map((key) => ({ key, kind: 'hidden', min: 0, max: NO_LABEL })),
  { names: W.SAY_PRESET_NAMES, values: Object.fromEntries(keys.map((k, i) => [k, K(`K_PRESET_L${i}`, [])])) }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const LEVEL_TONES = [6, 4, 0, 2, 8]
const WHY_TONES = [8, 0, 1, 4, 6]

function draw(s) {
  let criticals = 0
  const rows = keys.map((k, i) => {
    const labelled = s[k] !== NO_LABEL
    const base = labelled ? s[k] : NORMAL
    const capped = cappedLevel(base, criticals)
    if (base === CRITICAL) criticals++
    const eff = effectiveLevel(capped, labelled, AGES[i])
    return { i, base, capped, eff, labelled, ok: eligible(BLOCK[i]), why: why(base, capped, eff, labelled, BLOCK[i]) }
  })
  const order = rows.filter((r) => r.ok)
  for (let a = 1; a < order.length; a++) for (let b = a; b > 0 && outranks(order[b].eff, order[b].capped, order[b].i, order[b - 1].eff, order[b - 1].capped, order[b - 1].i); b--) [order[b], order[b - 1]] = [order[b - 1], order[b]]
  const name = (r) => fill(say('SAY_ISSUE'), NUM[r.i], AGES[r.i])
  out.replaceChildren(
    head(say('SAY_TAP')),
    taps(rows.map((r) => ({ label: name(r), sub: say('SAY_LEVEL_NAMES', s[keys[r.i]]), tone: LEVEL_TONES[s[keys[r.i]]] })), (i) => ctl.set(keys[i], (s[keys[i]] + 1) % (NO_LABEL + 1)), say('SAY_TAP')),
    head(say('SAY_ORDER')),
    ladder([
      ...order.map((r, n) => ({ label: `${n + 1}. ${name(r)}`, sub: `${fill(say('SAY_RUNS'), say('SAY_LEVEL_NAMES', r.eff))} · ${say('SAY_WHY_NAMES', r.why)}`, tone: WHY_TONES[r.why], on: true })),
      ...rows.filter((r) => !r.ok).map((r) => ({ label: name(r), sub: `${say('SAY_SKIPPED')} · ${say('SAY_WHY_NAMES', r.why)}`, tone: 6, on: false })),
    ]))
}

ctl.start()
