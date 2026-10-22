// hive-key-error/tool.js -- lesson 16 of queen-and-hive: what kind of refusal a bee's key got. The
// verdict is error_kind(status, code) with key_closes and charges_issue of its kind, and every grid
// cell is error_kind of its row and column: fn bodies of gHashTag/t27 specs/queen/key_failover.t27
// compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of
// specs/widgets/hive-key-error.t27.
import { chargesIssue, errorKind, keyCloses } from './logic.js'
import { K, W, ask, controls, el, grid, head, root, say, source, tiles, verdict } from '../hive-kit.js'

const ST = K('K_STATUSES', []), CO = K('K_CODES', [])
const ctl = controls([
  { key: 'st', label: say('SAY_STATUS'), kind: 'choice', options: ST.map(String) },
  { key: 'co', label: say('SAY_CODE'), kind: 'choice', options: CO.map(String) },
], { names: W.SAY_PRESET_NAMES, values: { st: K('K_PRESET_STATUS', []), co: K('K_PRESET_CODE', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const KIND_TONES = [0, 1, 4, 3, 6]

function draw(s) {
  const kind = errorKind(ST[s.st], CO[s.co])
  const closes = keyCloses(kind), charges = chargesIssue(kind)
  out.replaceChildren(
    verdict(say('SAY_KIND_NAMES', kind), KIND_TONES[kind], say('SAY_KIND_LINES', kind)),
    tiles([
      { label: say('SAY_CLOSES'), value: closes ? say('SAY_YES') : say('SAY_NO'), tone: closes ? 6 : 0 },
      { label: say('SAY_CHARGES'), value: charges ? say('SAY_YES') : say('SAY_NO'), tone: charges ? 6 : 0 },
    ]),
    head(say('SAY_GRID')),
    grid({ rows: ST.length, cols: CO.length, rowLabels: ST.map(String), colLabels: CO.map(String), cell: (r, c) => { const k = errorKind(ST[r], CO[c]); return { text: say('SAY_KIND_NAMES', k).slice(0, 1), tone: KIND_TONES[k], on: r === s.st && c === s.co ? true : k !== 0 } } }))
}

ctl.start()
