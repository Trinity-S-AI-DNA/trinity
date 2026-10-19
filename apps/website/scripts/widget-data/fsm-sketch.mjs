#!/usr/bin/env node
// fsm-sketch.mjs -- the built-in samples of the fsm-sketch widget (public/widgets/fsm-sketch/).
//
// The widget reads what yosys printed about state machines (a log, or the KISS2 file fsm_export
// wrote) in the reader's browser and draws the FSM it extracted. This script makes the four
// samples the page offers, turns them into sample.json, and checks the spec's facts against them.
// Nothing is typed in:
//
//   1. what to run is read from specs/widgets/fsm-sketch.t27 (K_SAMPLE_IDS, _DESIGNS, _TOPS,
//      _OPTS) through the vendored compiler public/t27/t27_compiler.wasm (the native t27c is not
//      run on this machine: Railway-only rule);
//   2. each design is copied from the trinity checkout into a scratch directory under the same
//      relative path, and yosys runs there once per sample, under nice -n 10 (the machine is shared):
//        yosys -q -l <id>.yosys.txt -p "read_verilog <design>; hierarchy -top <top>; proc; <opt>;
//               fsm_detect; fsm_extract; fsm_info; fsm_export -o <id>.kiss2"
//   3. the log and (when yosys extracted an FSM) the KISS2 file are shipped byte for byte under
//      public/widgets/fsm-sketch/samples/; both are read by fsmparse.js, the parser the page uses,
//      and the KISS2 rows must equal the fsm_info rows of the same run;
//   4. for the samples only, each state code is matched to a localparam of the source file that the
//      state register is assigned or a case arm is labelled with; the page says this match is its
//      own, not yosys's;
//   5. sample.json holds the commands, the `yosys -V` line, exit codes, seconds, sha256 of every
//      input and output, the counts, the names, and the layout card.png is drawn with;
//   6. every K_SAMPLE_ fact in the spec is re-read from the shipped logs, the spec's own tests run on
//      those values, and a negative control (the same tests with one count wrong) must fail.
//
// Run (from apps/website):
//   node scripts/widget-data/fsm-sketch.mjs              run yosys, write, check
//   node scripts/widget-data/fsm-sketch.mjs --check      only re-check the spec against the shipped samples
//   node scripts/widget-data/fsm-sketch.mjs --spec-lines print the spec's K_SAMPLE_ fact lines from the shipped samples
// Env: YOSYS overrides /opt/homebrew/bin/yosys.
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { constsOf, loadCompiler, sha256 } from '../agents-from-specs.mjs'
import { runSpecTests } from '../viewport-from-spec.mjs'
import { countsOf, layoutFsm, parseAny, parseKiss2, parseLog } from './fsm-sketch-fsmparse.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const REPO = join(SITE, '..', '..')
const WASM = 'public/t27/t27_compiler.wasm'
const SPEC = 'specs/widgets/fsm-sketch.t27'
const OUT_DIR = 'public/widgets/fsm-sketch'
const WORK = '/tmp/widget-fsm-sketch/run'
const YOSYS = process.env.YOSYS || (existsSync('/opt/homebrew/bin/yosys') ? '/opt/homebrew/bin/yosys' : 'yosys')
// Menlo's advance width is 0.602 of its size; card.png is drawn in Menlo.
const MENLO_ADVANCE = 0.602

const fail = (m) => { console.error(`fsm-sketch: ${m}`); process.exit(1) }
const firstLine = (s) => String(s).split('\n').map((l) => l.trim()).find(Boolean) ?? ''
const logName = (id) => `${id}.yosys.txt`
const kissName = (id) => `${id}.kiss2`
const scriptOf = (K, i) => `read_verilog ${K.K_SAMPLE_DESIGNS[i]}; hierarchy -top ${K.K_SAMPLE_TOPS[i]}; proc; ${K.K_SAMPLE_OPTS[i]}; fsm_detect; fsm_extract; fsm_info; fsm_export -o ${kissName(K.K_SAMPLE_IDS[i])}`

async function readSpec() {
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const text = readFileSync(join(SITE, SPEC), 'utf8')
  const analysis = analyze(text)
  const K = Object.fromEntries(Object.entries(constsOf(analysis)).map(([k, v]) => [k, v.value]))
  for (const k of ['K_SAMPLE_IDS', 'K_SAMPLE_DESIGNS', 'K_SAMPLE_TOPS', 'K_SAMPLE_OPTS', 'K_SAMPLE_JSON', 'K_SAMPLE_DIR', 'K_CARD_SAMPLE', 'K_CARD_GRAPH_W', 'K_CARD_GRAPH_H', 'K_CARD_FONT_PX', 'K_LABEL_ROWS']) if (!(k in K)) fail(`${SPEC} has no ${k}`)
  const n = K.K_SAMPLE_IDS.length
  for (const k of ['K_SAMPLE_DESIGNS', 'K_SAMPLE_TOPS', 'K_SAMPLE_OPTS']) if (K[k].length !== n) fail(`${SPEC}: ${k} has ${K[k].length} entries, K_SAMPLE_IDS ${n}`)
  return { text, K, analysis }
}

const rowsKey = (f) => JSON.stringify(f.rows.map((r) => [f.states[r.from].name, r.in, f.states[r.to].name, r.out]))

/** What one shipped sample says: its log parsed, its KISS2 parsed, and whether the two agree. */
function readSample(K, i) {
  const id = K.K_SAMPLE_IDS[i]
  const lp = join(SITE, OUT_DIR, K.K_SAMPLE_DIR, logName(id))
  if (!existsSync(lp)) fail(`${OUT_DIR}/${K.K_SAMPLE_DIR}/${logName(id)} does not exist; run without --check first`)
  const log = parseLog(readFileSync(lp, 'utf8'))
  if (!log.ok) fail(`${logName(id)} does not parse: ${log.error}`)
  if (parseAny(readFileSync(lp, 'utf8')).kind !== 'log') fail(`${logName(id)} is not sniffed as a log`)
  const kp = join(SITE, OUT_DIR, K.K_SAMPLE_DIR, kissName(id))
  let kiss = null
  if (existsSync(kp)) {
    kiss = parseKiss2(readFileSync(kp, 'utf8'))
    if (!kiss.ok) fail(`${kissName(id)} does not parse: ${kiss.error}`)
    if (parseAny(readFileSync(kp, 'utf8')).kind !== 'kiss2') fail(`${kissName(id)} is not sniffed as KISS2`)
  }
  return { id, log, kiss, logPath: lp, kissPath: kiss ? kp : null }
}

/** Every K_SAMPLE_ fact, computed from the shipped yosys logs (not from sample.json). */
export function factsOf(K) {
  const samples = K.K_SAMPLE_IDS.map((_, i) => readSample(K, i))
  const versions = [...new Set(samples.map((s) => s.log.version))]
  const first = (s) => s.log.fsms[0]
  const reasons = samples.flatMap((s) => s.log.rejected.flatMap((r) => r.reasons))
  return {
    samples,
    facts: {
      K_SAMPLE_YOSYS: versions.length === 1 ? versions[0] : null,
      K_SAMPLE_FOUND: samples.map((s) => s.log.fsms.length),
      K_SAMPLE_REJECTED: samples.map((s) => s.log.rejected.length),
      K_SAMPLE_STATES: samples.map((s) => (first(s) ? countsOf(first(s)).states : 0)),
      K_SAMPLE_TRANSITIONS: samples.map((s) => (first(s) ? countsOf(first(s)).transitions : 0)),
      K_SAMPLE_INPUTS: samples.map((s) => (first(s) ? countsOf(first(s)).inputs : 0)),
      K_SAMPLE_REASON: [...new Set(reasons)].length === 1 ? reasons[0] : null,
    },
  }
}

/** Problems with one sample that are not spec facts: KISS2 and log must hold the same graph. */
function sampleProblems(s) {
  const bad = []
  if (s.log.found.length !== s.log.fsms.length) bad.push(`${s.id}: fsm_detect found ${s.log.found.length} register(s), fsm_info dumped ${s.log.fsms.length}`)
  if (s.log.fsms.length > 1) bad.push(`${s.id}: ${s.log.fsms.length} FSMs; fsm_export -o names only one of them`)
  if (s.log.fsms.length === 1 && !s.kiss) bad.push(`${s.id}: yosys extracted an FSM but no ${kissName(s.id)} is shipped`)
  if (s.log.fsms.length === 0 && s.kiss) bad.push(`${s.id}: ${kissName(s.id)} is shipped but the log has no FSM`)
  if (s.kiss && s.log.fsms.length === 1) {
    const a = s.log.fsms[0]
    const b = s.kiss.fsms[0]
    if (rowsKey(a) !== rowsKey(b)) bad.push(`${s.id}: the KISS2 rows differ from the fsm_info rows`)
    if (a.reset !== b.reset || a.nIn !== b.nIn || a.nOut !== b.nOut || a.states.length !== b.states.length) bad.push(`${s.id}: KISS2 and log disagree on reset, widths or state count`)
  }
  return bad
}

const specLine = (k, v) => typeof v === 'string' ? `pub const ${k} : str = ${JSON.stringify(v)};`
  : `pub const ${k} : [${v.length}]u16 = [${v.join(', ')}];`

function checkSpec(K, analysis, sampleJson) {
  const { facts, samples } = factsOf(K)
  const bad = []
  for (const [k, v] of Object.entries(facts)) {
    if (v === null || v === undefined) { bad.push(`${k}: the samples do not agree on one value`); continue }
    if (!(k in K)) bad.push(`${k}: missing from the spec; it should read  ${specLine(k, v)}`)
    else if (JSON.stringify(K[k]) !== JSON.stringify(v)) bad.push(`${k}: spec says ${JSON.stringify(K[k])}, the samples say ${JSON.stringify(v)}`)
  }
  for (const s of samples) bad.push(...sampleProblems(s))
  const tests = runSpecTests(analysis, { ...K, ...facts })
  for (const f of tests.failures) bad.push(`spec test on the samples: ${f}`)
  if (tests.asserts === 0) bad.push('the spec has no asserts to run against the samples')
  if (sampleJson) {
    for (const s of samples) {
      const j = sampleJson.samples.find((x) => x.id === s.id)
      if (!j) { bad.push(`${K.K_SAMPLE_JSON} has no sample ${s.id}`); continue }
      if (j.log.sha256 !== sha256(readFileSync(s.logPath))) bad.push(`${K.K_SAMPLE_JSON} names a different ${logName(s.id)} (sha256)`)
      if ((j.kiss2?.sha256 ?? null) !== (s.kissPath ? sha256(readFileSync(s.kissPath)) : null)) bad.push(`${K.K_SAMPLE_JSON} names a different ${kissName(s.id)} (sha256)`)
    }
  }
  return { bad, tests }
}

/** A negative control: the spec's tests must fail when a count is wrong, or they test nothing. */
function negativeControl(K, analysis) {
  const wrong = (a) => a.map((x, i) => (i === 0 ? x + 1 : x))
  const broken = { ...K, K_SAMPLE_STATES: wrong(K.K_SAMPLE_STATES), K_SAMPLE_FOUND: K.K_SAMPLE_FOUND.map((x, i) => (i === 3 ? 1 : x)) }
  const t = runSpecTests(analysis, broken)
  if (t.failures.length === 0) fail('negative control: the spec tests still hold with a state count and a found flag set wrong')
  return t.failures.length
}

// --- localparam names, for the samples only --------------------------------------------------------

/** The value of a Verilog integer literal, or null. */
function literal(s) {
  const t = s.replace(/_/g, '').trim()
  let m
  if (/^\d+$/.test(t)) return Number(t)
  if ((m = t.match(/^\d*'[sS]?([bdhoBDHO])([0-9a-fA-F]+)$/))) return parseInt(m[2], { b: 2, d: 10, h: 16, o: 8 }[m[1].toLowerCase()])
  return null
}

/**
 * For each state of f, the source localparam whose value equals its code, among the localparams the
 * state register is assigned (`reg <= NAME`) or a case arm is labelled with (`NAME:`). A code two
 * names share, or none, stays null.
 */
export function localNames(src, f) {
  const text = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const params = new Map()
  for (const m of text.matchAll(/\blocalparam\b([^;]*);/g)) {
    for (const part of m[1].replace(/^\s*(\[[^\]]*\])?/, '').split(',')) {
      const mm = part.match(/^\s*([A-Za-z_]\w*)\s*=\s*([^,]+?)\s*$/)
      if (mm) { const v = literal(mm[2]); if (v !== null) params.set(mm[1], v) }
    }
  }
  const reg = String(f.reg ?? '').replace(/\s*\[.*$/, '')
  const used = new Set()
  for (const m of text.matchAll(new RegExp(`\\b${reg.replace(/\W/g, '\\$&')}\\s*<?=\\s*([A-Za-z_]\\w*)`, 'g'))) used.add(m[1])
  for (const m of text.matchAll(/^\s*([A-Za-z_]\w*)\s*:/gm)) used.add(m[1])
  const byValue = new Map()
  for (const [name, v] of params) if (used.has(name)) byValue.set(v, byValue.has(v) ? null : name)
  return f.states.map((s) => {
    const v = s.code && /^[01]+$/.test(s.code) ? parseInt(s.code, 2) : null
    return v === null ? null : (byValue.get(v) ?? null)
  })
}

// --- the run ---------------------------------------------------------------------------------------

function runOne(K, i, yosysVersion) {
  const id = K.K_SAMPLE_IDS[i]
  const rel = K.K_SAMPLE_DESIGNS[i]
  const src = join(REPO, rel)
  if (!existsSync(src)) fail(`${rel} is not in the trinity checkout at ${REPO}`)
  const dir = join(WORK, id)
  mkdirSync(dirname(join(dir, rel)), { recursive: true })
  copyFileSync(src, join(dir, rel))
  const srcBytes = readFileSync(src)
  const script = scriptOf(K, i)
  const t0 = process.hrtime.bigint()
  const r = spawnSync('nice', ['-n', '10', YOSYS, '-q', '-l', logName(id), '-p', script], { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const seconds = Math.round(Number(process.hrtime.bigint() - t0) / 1e6) / 1000
  if (r.status !== 0) fail(`${id}: yosys exited ${r.status}:\n${r.stderr || r.stdout}`)
  const outDir = join(SITE, OUT_DIR, K.K_SAMPLE_DIR)
  mkdirSync(outDir, { recursive: true })
  const log = readFileSync(join(dir, logName(id)))
  if (process.env.HOME && log.includes(process.env.HOME)) fail(`${id}: the log names the home directory; it would ship a local path`)
  writeFileSync(join(outDir, logName(id)), log)
  const kp = join(dir, kissName(id))
  let kiss = null
  if (existsSync(kp)) { kiss = readFileSync(kp); writeFileSync(join(outDir, kissName(id)), kiss) } else rmSync(join(outDir, kissName(id)), { force: true })
  const parsed = parseLog(log.toString('utf8'))
  if (!parsed.ok) fail(`${id}: the log does not parse: ${parsed.error}`)
  const f = parsed.fsms[0] ?? null
  const names = f ? localNames(srcBytes.toString('utf8'), f) : []
  const file = (name, bytes) => ({ path: `${OUT_DIR.replace(/^public\//, '')}/${K.K_SAMPLE_DIR}/${name}`, sha256: sha256(bytes), bytes: bytes.length })
  return {
    id, design: rel, top: K.K_SAMPLE_TOPS[i], opt: K.K_SAMPLE_OPTS[i],
    input: { path: rel, sha256: sha256(srcBytes), bytes: srcBytes.length },
    command: `nice -n 10 yosys -q -l ${logName(id)} -p "${script}"`,
    exit: r.status, seconds, yosys: yosysVersion,
    log: file(logName(id), log), kiss2: kiss ? file(kissName(id), kiss) : null,
    version: parsed.version, found: parsed.found, rejected: parsed.rejected,
    fsms: parsed.fsms.map((x) => ({ id: x.id, module: x.module, reg: x.reg, reset: x.reset, encoding: x.encoding, counts: countsOf(x), codes: x.states.map((s) => s.code) })),
    names,
  }
}

/** The graph card.png draws: the page's own layout of the card sample, at the card's size and font. */
function cardLayout(K, sample) {
  const s = readSample(K, K.K_CARD_SAMPLE)
  const f = s.log.fsms[0]
  if (!f) fail(`the card sample ${s.id} has no FSM to draw`)
  const font = K.K_CARD_FONT_PX
  const labels = f.states.map((st, i) => [sample.names[i] ?? st.name, `${st.name} ${st.code ?? ''}`.trim()])
  const lay = layoutFsm(f, { w: K.K_CARD_GRAPH_W, h: K.K_CARD_GRAPH_H, font, charW: font * MENLO_ADVANCE, edgeFont: Math.round(font * 0.8), maxLabelRows: K.K_LABEL_ROWS, labels })
  const r1 = (v) => Math.round(v * 10) / 10
  return {
    sample: s.id, w: lay.w, h: lay.h, font: lay.font, edgeFont: lay.edgeFont, lineH: lay.lineH, reset: f.reset,
    counts: countsOf(f), inputs: f.inputs,
    nodes: lay.nodes.map((n) => ({ i: n.i, x: r1(n.x), y: r1(n.y), w: r1(n.w), h: r1(n.h), lines: n.lines })),
    edges: lay.edges.map((e) => ({ from: e.from, to: e.to, self: e.self, pts: e.pts.map(([x, y]) => [r1(x), r1(y)]), arrow: { x: r1(e.arrow.x), y: r1(e.arrow.y), angle: Math.round(e.arrow.angle * 1e4) / 1e4 }, label: { ...e.label, x: r1(e.label.x), y: r1(e.label.y) } })),
  }
}

async function main() {
  const { text, K, analysis } = await readSpec()
  const jsonPath = join(SITE, OUT_DIR, K.K_SAMPLE_JSON)
  if (process.argv.includes('--spec-lines')) { for (const [k, v] of Object.entries(factsOf(K).facts)) console.log(v === null ? `${k}: the samples disagree` : specLine(k, v)); return }
  if (process.argv.includes('--check')) {
    if (!existsSync(jsonPath)) fail(`${OUT_DIR}/${K.K_SAMPLE_JSON} does not exist; run without --check first`)
    const { bad, tests } = checkSpec(K, analysis, JSON.parse(readFileSync(jsonPath, 'utf8')))
    const neg = negativeControl(K, analysis)
    if (bad.length) { console.error(`fsm-sketch --check: ${bad.length} problem(s)`); for (const b of bad) console.error('  ' + b); process.exit(3) }
    console.log(`fsm-sketch --check: every K_SAMPLE_ fact in ${SPEC} matches the ${K.K_SAMPLE_IDS.length} shipped logs, each KISS2 file holds the rows of its log; ${tests.tests} tests, ${tests.asserts} asserts hold; negative control fails ${neg} assert(s) as it should`)
    return
  }

  rmSync(WORK, { recursive: true, force: true })
  const yosysVersion = firstLine(execFileSync(YOSYS, ['-V'], { encoding: 'utf8' }))
  const samples = K.K_SAMPLE_IDS.map((_, i) => runOne(K, i, yosysVersion))
  for (const s of samples) console.log(`fsm-sketch: ${s.id}: exit ${s.exit} in ${s.seconds}s; ${s.fsms.length} FSM(s) ${JSON.stringify(s.fsms.map((x) => x.counts))}; refused ${JSON.stringify(s.rejected)}; names ${JSON.stringify(s.names)}`)
  const card = cardLayout(K, samples[K.K_CARD_SAMPLE])
  const data = {
    generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    spec: { path: `apps/website/${SPEC}`, sha256: sha256(Buffer.from(text, 'utf8')) },
    tools: { yosys: yosysVersion, node: process.version },
    repo: 'gHashTag/trinity',
    cwd: 'a scratch directory per sample, holding the design at its repo-relative path',
    names_note: 'names[i] is the localparam of the source whose value equals state i\'s code, among those the state register is assigned or a case arm is labelled with; matched by this script, not by yosys',
    samples,
    card,
  }
  writeFileSync(jsonPath, JSON.stringify(data, null, 1).replaceAll(process.env.HOME, '~') + '\n')
  console.log(`fsm-sketch: ${yosysVersion}; wrote ${OUT_DIR}/${K.K_SAMPLE_DIR}/ and ${OUT_DIR}/${K.K_SAMPLE_JSON}`)

  const { bad } = checkSpec(K, analysis, data)
  const neg = negativeControl(K, analysis)
  if (bad.length) {
    console.error(`fsm-sketch: ${bad.length} problem(s) between ${SPEC} and the run:`)
    for (const b of bad) console.error('  ' + b)
    process.exit(3)
  }
  console.log(`fsm-sketch: every K_SAMPLE_ fact in ${SPEC} matches the run, and its tests hold of it (negative control: ${neg} assert(s) fail as they should)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
