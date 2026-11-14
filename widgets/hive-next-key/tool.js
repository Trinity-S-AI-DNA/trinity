// hive-next-key/tool.js -- lesson 18 of queen-and-hive: which key a bee tries next. The ring is
// next_free, the verdict step and the tile pool_overloaded, fn bodies of gHashTag/t27
// specs/queen/key_failover.t27 compiled to wasm (./logic.js). The pool is drawn from two masks, bit i
// for key i + 1; a second pool is always there, as next_free of the pool list. Words are SAY_ and
// numbers K_ constants of specs/widgets/hive-next-key.t27.
import { nextFree, poolOverloaded, step } from './logic.js'
import { K, W, ask, comb, controls, el, head, root, say, source, tiles, verdict } from '../hive-kit.js'

const TRANSIENT = K('K_KE_TRANSIENT', 1), NO_KEY = K('K_NO_KEY', 255), SMAX = K('K_SIZE_MAX', 12)
const ctl = controls([
  { key: 'size', label: say('SAY_SIZE'), min: 1, max: SMAX, step: 1 },
  { key: 'attempts', label: say('SAY_ATTEMPTS'), min: 1, max: K('K_ATTEMPTS_MAX', 9), step: 1 },
  { key: 'overload', label: say('SAY_OVERLOAD'), min: 0, max: K('K_OVERLOAD_MAX', 5), step: 1 },
  { key: 'last', kind: 'hidden', min: 0, max: SMAX - 1 },
  { key: 'tried', kind: 'hidden', min: 0, max: 4095 },
  { key: 'resting', kind: 'hidden', min: 0, max: 4095 },
], { names: W.SAY_PRESET_NAMES, values: { size: K('K_PRESET_SIZE', []), last: K('K_PRESET_LAST', []), tried: K('K_PRESET_TRIED', []), resting: K('K_PRESET_RESTING', []), attempts: K('K_PRESET_ATTEMPTS', []), overload: K('K_PRESET_OVERLOAD', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const STEP_TONES = [0, 0, 2, 6, 6]
const FILL = ['#00ff88', '#ffd700', '#ff4d6d']

function draw(s) {
  const mask = (1 << s.size) - 1
  const tried = s.tried & mask, resting = s.resting & mask & ~tried
  const next = nextFree(tried, resting, s.size, s.last < s.size ? s.last : NO_KEY)
  const nextPool = nextFree(K('K_POOL_LIST_TRIED', 1), K('K_POOL_LIST_RESTING', 0), K('K_POOL_LIST_SIZE', 2), K('K_POOL_LIST_LAST', 0))
  const st = step(TRANSIENT, s.attempts, next, s.overload, s.size, nextPool)
  const out1305 = poolOverloaded(s.overload, s.size)
  const state = (i) => (tried & (1 << i) ? 1 : resting & (1 << i) ? 2 : 0)
  const cycle = (i) => {
    const b = 1 << i, now = state(i)
    if (now === 0) ctl.set('tried', s.tried | b)
    else if (now === 1) { s.tried &= ~b; ctl.set('resting', s.resting | b) }
    else ctl.set('resting', s.resting & ~b)
  }
  out.replaceChildren(
    head(say('SAY_TAP')),
    comb([...Array(s.size)].map((_, i) => ({ label: `${i + 1}${i === s.last ? '!' : ''}`, fill: FILL[state(i)], alpha: 0.55, on: i === next })), cycle),
    verdict(say('SAY_STEP_NAMES', st), STEP_TONES[st], `${say('SAY_NEXT')}: ${next === NO_KEY ? say('SAY_NONE') : next + 1} · ${say('SAY_LAST')}: ${s.last + 1}`),
    tiles([
      { label: say('SAY_NEXT'), value: next === NO_KEY ? say('SAY_NONE') : String(next + 1), tone: 0 },
      { label: say('SAY_POOL_OUT'), value: out1305 ? say('SAY_YES') : say('SAY_NO'), tone: out1305 ? 6 : 0 },
      { label: say('SAY_ATTEMPTS'), value: `${s.attempts} / ${K('K_MAX_ATTEMPTS_PER_TURN', 8)}`, tone: 1 },
    ]))
}

ctl.start()
