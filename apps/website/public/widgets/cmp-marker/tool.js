// cmp-marker/tool.js -- lesson 17 of t27-compiler: where the generated-file marker must sit. The verdicts are
// marked_within and marked_generated, fn bodies of gHashTag/t27 specs/compiler/compile_output.t27 compiled to wasm
// (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/cmp-marker.t27.
import { markedGenerated, markedWithin } from './logic.js'
import { K, W, ask, controls, el, fill, hue, root, say, source, stages, taps, verdict } from '../cmp-kit.js'

const LINES = K('K_FILE_LINES', 12)
const BACKEND_LINES = [K('K_MARK_LINE_ZIG', 2), K('K_MARK_LINE_RUST', 2), K('K_MARK_LINE_VERILOG', 3), K('K_MARK_LINE_C', 3)]
const ctl = controls([
  { key: 'mark', label: say('SAY_MARK'), min: 0, max: LINES, step: 1, fmt: (v) => (v === 0 ? say('SAY_NO_MARK') : String(v)) },
  { key: 'head', label: say('SAY_HEAD'), min: 1, max: K('K_MAX_HEAD', 8), step: 1 },
], { names: W.SAY_PRESET_NAMES, values: { mark: K('K_PRESET_MARK', []), head: K('K_PRESET_HEAD', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const within = markedWithin(s.mark, s.head)
  const generated = markedGenerated(s.mark)
  const row = (n) => el('div', { class: 'cc-line', style: `--hc:${hue(n === s.mark ? (within ? 0 : 6) : n <= s.head ? 2 : 8)}` },
    el('i', {}, String(n)), el('span', {}, n === s.mark ? `// ${say('SAY_MARKER')}` : ''), n <= s.head ? el('em', {}, say('SAY_HEAD_TAG')) : null)
  out.replaceChildren(
    verdict(`${say('SAY_WITHIN')}: ${within ? say('SAY_YES') : say('SAY_NO')}`, within ? 0 : 6, `${say('SAY_GENERATED')}: ${generated ? say('SAY_YES') : say('SAY_NO')}`),
    el('div', { class: 'cc-file' }, [...Array(LINES)].map((_, i) => row(i + 1))),
    taps(BACKEND_LINES.map((n, i) => ({ label: say('SAY_BACKENDS', i), sub: fill(say('SAY_LINE_N'), n), tone: i + 1, pressed: s.mark === n })), (i) => ctl.set('mark', BACKEND_LINES[i]), say('SAY_BACKENDS', 0)))
}

ctl.start()
