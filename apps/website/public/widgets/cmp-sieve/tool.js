// cmp-sieve/tool.js -- lesson 22 of t27-compiler: the compiler sieve. Every cell is value (or value_at_* for the older rows
// of t27c and t27b), the removed set is kills, the issue is fix_issue and the verdict is verdict, fn bodies of gHashTag/t27
// specs/compiler/theory/sieve.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of
// specs/widgets/cmp-sieve.t27.
import { fixIssue, kills, value, valueAt682564f48, valueAtBe9757784, verdict as sieveVerdict } from './logic.js'
import { K, W, ask, controls, el, facts, grid, root, say, source, stages } from '../cmp-kit.js'

const N = K('K_CANDIDATES', 9)
const F = K('K_FILTERS', 10)
const T27 = [K('K_T27C', 7), K('K_T27B', 8)]
const TONES = [6, 8, 0, 2]
const ctl = controls([
  { key: 'candidate', label: say('SAY_CANDIDATE'), kind: 'choice', options: W.SAY_CANDIDATES },
  { key: 'filter', label: say('SAY_FILTER'), kind: 'choice', options: W.SAY_FILTERS },
  { key: 'date', label: say('SAY_DATE'), kind: 'choice', options: W.SAY_DATES },
], { names: W.SAY_PRESET_NAMES, values: { candidate: K('K_PRESET_CANDIDATE', []), filter: K('K_PRESET_FILTER', []), date: K('K_PRESET_DATE', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

// A filter is its index plus one: the spec numbers C1 to C10.
function cell(date, c, f) {
  if (!T27.includes(c) || date === 2) return value(c, f)
  return date === 0 ? valueAt682564f48(c, f) : valueAtBe9757784(c, f)
}

function draw(s) {
  const f = s.filter + 1
  const v = cell(s.date, s.candidate, f)
  const fix = fixIssue(s.candidate, f)
  const removed = kills(f)
  const names = W.SAY_CANDIDATES.filter((_, c) => removed & (1 << c))
  out.replaceChildren(
    grid({
      rows: N, cols: F, rowLabels: W.SAY_CANDIDATES, colLabels: W.SAY_FILTERS.map((_, i) => 'C' + (i + 1)),
      cell: (r, c) => { const x = cell(s.date, r, c + 1); return { text: say('SAY_MARKS', x), tone: TONES[x], on: x !== 1 || (r === s.candidate && c === s.filter) } },
    }),
    facts([
      { label: `${W.SAY_CANDIDATES[s.candidate]} / ${W.SAY_FILTERS[s.filter]}`, value: `${say('SAY_CELL')}: ${say('SAY_VALUES', v)}`, color: undefined },
      { label: say('SAY_FIX'), value: fix ? '#' + fix : say('SAY_NO_FIX') },
      { label: say('SAY_REMOVES'), value: names.length ? names.join(', ') : say('SAY_REMOVES_NONE') },
      { label: say('SAY_VERDICT'), value: say('SAY_VALUES', sieveVerdict(s.candidate)) },
    ]))
}

ctl.start()
