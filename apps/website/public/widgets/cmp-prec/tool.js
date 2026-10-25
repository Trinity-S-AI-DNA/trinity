// cmp-prec/tool.js -- lesson 4 of t27-compiler: the eleven precedence levels of the t27 parser. binds_looser of
// two levels says which operator splits the expression; the grid is binds_looser for every pair. They are fn bodies
// of gHashTag/t27 specs/compiler/parser.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants
// of specs/widgets/cmp-prec.t27.
import { bindsLooser, maxChildren } from './logic.js'
import { K, ask, controls, el, fill, grid, hue, root, say, source, stages, tape, verdict, W } from '../cmp-kit.js'

const N = K('K_LEVEL_COUNT', 11)
const levels = [...Array(N)].map((_, i) => say('SAY_LEVELS', i))
const ctl = controls([
  { key: 'first', label: say('SAY_FIRST'), kind: 'choice', options: levels },
  { key: 'second', label: say('SAY_SECOND'), kind: 'choice', options: levels },
], { names: W.SAY_PRESET_NAMES, values: { first: K('K_PRESET_FIRST', []), second: K('K_PRESET_SECOND', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const a = s.first
  const b = s.second
  const op = (i) => say('SAY_SAMPLE_OPS', i)
  const firstLooser = bindsLooser(a, b)
  const secondLooser = bindsLooser(b, a)
  const expr = firstLooser ? `a ${op(a)} (b ${op(b)} c)` : secondLooser ? `(a ${op(a)} b) ${op(b)} c` : fill(say('SAY_EXPR'), op(a), op(b))
  const why = firstLooser ? fill(say('SAY_FIRST_LOOSER'), levels[a], levels[b]) : secondLooser ? fill(say('SAY_SECOND_LOOSER'), levels[a], levels[b]) : fill(say('SAY_SAME'), levels[a], levels[b])
  out.replaceChildren(
    tape(levels.map((_, i) => ({ main: op(i), sub: i, color: hue(i === a ? 1 : i === b ? 3 : 8), on: i === a || i === b })), null),
    verdict(expr, firstLooser ? 0 : secondLooser ? 1 : 2, why),
    el('p', { class: 'dk-label' }, say('SAY_GRID')),
    grid({
      rows: N, cols: N, rowLabels: levels, colLabels: levels,
      cell: (r, c) => ({ text: bindsLooser(r, c) ? '<' : '', tone: r === a && c === b ? 1 : r === b && c === a ? 3 : 0, on: bindsLooser(r, c) }),
    }),
    el('p', { class: 'dk-note' }, fill(say('SAY_MAX_CHILDREN'), maxChildren())))
}

ctl.start()
