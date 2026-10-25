// cmp-ddc/tool.js -- lesson 24 of t27-compiler: diverse double-compiling of t27core. The verdict is ddc_verdict and the
// negative control is fixpoint_only_passes, fn bodies of gHashTag/t27 specs/compiler/theory/toolchain.t27 compiled to
// wasm (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/cmp-ddc.t27.
import { ddcVerdict, fixpointOnlyPasses } from './logic.js'
import { K, W, ask, controls, el, facts, hue, root, say, source, stages, verdict } from '../cmp-kit.js'

const BITS = [K('K_ROUTE_GENC_CC', 1), K('K_ROUTE_T27B', 2), K('K_ROUTE_ZIG', 4)]
const keys = (p) => [0, 1, 2].map((i) => ({ key: p + i, label: `${say('SAY_ROUTES', i)}: ${p === 'b' ? say('SAY_BUILT') : say('SAY_EQUAL')}`, kind: 'toggle' }))
const mask = (s, p) => BITS.reduce((m, bit, i) => m | (s[p + i] ? bit : 0), 0)
const bitsOf = (arr, i) => arr.map((m) => (m & BITS[i] ? 1 : 0))
const values = { shared: K('K_PRESET_SHARED', []) }
for (const i of [0, 1, 2]) {
  values['b' + i] = bitsOf(K('K_PRESET_BUILT', []), i)
  values['e' + i] = bitsOf(K('K_PRESET_EQUAL', []), i)
}

const ctl = controls([
  ...keys('b'),
  ...keys('e'),
  { key: 'shared', label: say('SAY_SHARED'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const built = mask(s, 'b')
  const equal = mask(s, 'e')
  const code = ddcVerdict(built, equal, !!s.shared)
  const tone = code === K('K_DDC_MISCOMPILE', 1) ? 6 : code === K('K_DDC_CANNOT_RUN', 0) ? 8 : code === K('K_DDC_AGREE_INDEPENDENT', 3) ? 0 : 1
  const fixpoint = fixpointOnlyPasses(equal)
  out.replaceChildren(
    facts([0, 1, 2].map((i) => ({ label: say('SAY_ROUTES', i), value: !s['b' + i] ? say('SAY_NOT_BUILT') : s['e' + i] ? say('SAY_MATCHES') : say('SAY_DIFFERS'), color: !s['b' + i] ? hue(8) : s['e' + i] ? hue(0) : hue(6) }))),
    verdict(say('SAY_VERDICTS', code), tone, say('SAY_VERDICT_LINES', code)),
    facts([{ label: say('SAY_FIXPOINT'), value: fixpoint ? say('SAY_PASSES') : say('SAY_FAILS'), color: hue(fixpoint ? 1 : 8) }]))
}

ctl.start()
