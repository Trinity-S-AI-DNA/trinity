// hive-boundary/tool.js -- lesson 2 of queen-and-hive: which files a task may reserve. Each path is
// path_accepted of the four facts the reader taps, and the gate is shape_lands of the result, both
// from gHashTag/t27 specs/queen/shaping.t27 compiled to wasm (./logic.js). The host only counts the
// refused paths it hands to shape_lands. Words are SAY_ and numbers K_ constants of
// specs/widgets/hive-boundary.t27.
import { pathAccepted, shapeLands } from './logic.js'
import { K, W, ask, controls, el, fill, gate, head, pill, root, say, source, taps } from '../hive-kit.js'

const N = K('K_PATHS', 4), BITS = K('K_FACT_BITS', [1, 2, 4, 8])
const keys = [...Array(N)].map((_, i) => `p${i}`)
const ctl = controls([
  ...keys.map((key) => ({ key, kind: 'hidden', min: 0, max: 15 })),
  { key: 'left', label: say('SAY_LEFT'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { ...Object.fromEntries(keys.map((k, i) => [k, K(`K_PRESET_P${i}`, [])])), left: K('K_PRESET_LEFT', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const ok = keys.map((k) => { const m = s[k]; return pathAccepted(!!(m & BITS[0]), !!(m & BITS[1]), !!(m & BITS[2]), !!(m & BITS[3])) })
  const refused = ok.filter((v) => !v).length
  const lands = shapeLands(s.left ? 1 : 0, N, refused)
  out.replaceChildren(
    ...keys.map((k, i) => el('div', { class: 'hk-path' },
      el('p', { class: 'hk-path-head' }, el('code', {}, say('SAY_PATHS', i)), pill(ok[i] ? say('SAY_OK') : say('SAY_BAD'), ok[i] ? 0 : 6)),
      taps(BITS.map((b, j) => ({ label: say('SAY_FACTS', j), pressed: !!(s[k] & b), tone: ok[i] ? 0 : 6 })), (j) => ctl.set(k, s[k] ^ BITS[j]), say('SAY_PATHS', i)))),
    head(fill(say('SAY_COUNT'), refused, N)),
    gate(lands, lands ? say('SAY_LANDS') : say('SAY_STOPS'), fill(say('SAY_COUNT'), refused, N)))
}

ctl.start()
