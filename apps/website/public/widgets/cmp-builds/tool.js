// cmp-builds/tool.js -- lesson 23 of t27-compiler: the seven builds behind the reproducible-build filter. The table is
// build_host, build_abbrev, build_cargo_home, build_clone and build_env_varied; the grid is predicts_same; the counts are
// pairs_differing and mispredicts; the verdict is c9_verdict. They are fn bodies of gHashTag/t27
// specs/compiler/theory/reproducible.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of
// specs/widgets/cmp-builds.t27.
import { buildAbbrev, buildCargoHome, buildClone, buildEnvVaried, buildHost, c9Verdict, mispredicts, pairsDiffering, predictsSame } from './logic.js'
import { K, W, ask, controls, el, facts, fill, grid, root, say, source, stages, verdict } from '../cmp-kit.js'

const B = K('K_BUILDS', 7)
const ctl = controls([
  { key: 'bin', label: say('SAY_BIN'), kind: 'choice', options: W.SAY_BINS },
  { key: 'model', label: say('SAY_MODEL'), kind: 'choice', options: W.SAY_MODELS },
], { names: W.SAY_PRESET_NAMES, values: { bin: K('K_PRESET_BIN', []), model: K('K_PRESET_MODEL', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const wrong = mispredicts(s.model, s.bin)
  const verdictCode = c9Verdict(s.bin)
  const rows = [...Array(B)].map((_, b) => [buildHost(b), buildAbbrev(b), buildCargoHome(b), say('SAY_CLONES', buildClone(b)), buildEnvVaried(b) ? say('SAY_YES') : say('SAY_NO')])
  out.replaceChildren(
    verdict(say('SAY_VERDICTS', verdictCode), verdictCode === K('K_TRUE3', 2) ? 0 : verdictCode === K('K_FALSE3', 0) ? 6 : 1, `${say('SAY_BINS', s.bin)}: ${fill(say('SAY_OF'), pairsDiffering(s.bin), K('K_BUILD_PAIRS', 21))} ${say('SAY_DIFFER')}`),
    facts([{ label: say('SAY_WRONG'), value: fill(say('SAY_OF'), wrong, K('K_BUILD_PAIRS', 21)), color: wrong ? '#ff4d6d' : '#00ff88' }]),
    el('p', { class: 'dk-label' }, say('SAY_GRID')),
    grid({ rows: B, cols: B, rowLabels: W.SAY_BUILD_NAMES, colLabels: W.SAY_BUILD_NAMES, cell: (r, c) => { const same = r < c && predictsSame(s.model, r, c); return { text: r < c ? (same ? '=' : '\u2260') : '', tone: same ? 0 : 6, on: r < c } } }),
    el('p', { class: 'dk-label' }, say('SAY_TABLE')),
    grid({ rows: B, cols: 5, rowLabels: W.SAY_BUILD_NAMES, colLabels: W.SAY_COLUMNS, cell: (r, c) => ({ text: rows[r][c], tone: c, on: true }) }))
}

ctl.start()
