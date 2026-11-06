#!/usr/bin/env node
// stat-card.mjs -- the built-in sample of the stat-card widget (public/widgets/stat-card/).
//
// The widget reads yosys `stat -json` in the reader's browser and draws a card and a README badge.
// This script makes the one sample the page opens with, and checks the spec's facts against it.
// Nothing is typed in:
//
//   1. what to run is read from specs/widgets/stat-card.t27 (K_SAMPLE_DESIGN, K_SAMPLE_MEM,
//      K_SAMPLE_TOP) through the vendored compiler public/t27/t27_compiler.wasm (the native t27c is
//      not run on this machine: Railway-only rule);
//   2. the design and its weight file are copied from the trinity checkout into a scratch directory
//      under the same relative paths (the Verilog's $readmemb names fpga/weights/...), and yosys runs
//      there once, under nice -n 10 (the machine is shared):
//        yosys -q -p "read_verilog <design>; synth_xilinx -flatten -top <top>; tee -q -o stat.json stat -json"
//   3. stat.json is shipped byte for byte as public/widgets/stat-card/sample.stat.json; sample.json
//      holds the command, the `yosys -V` line, exit code, seconds and the sha256 of both inputs;
//   4. every K_SAMPLE_ fact in the spec is re-read from sample.stat.json by statparse.js (the parser
//      the page uses), the spec's own tests are run on those values, and a negative control (the
//      same tests with the BRAM and LUT counts set wrong) must fail.
//
// Run (from apps/website):
//   node scripts/widget-data/stat-card.mjs              synthesise, write, check
//   node scripts/widget-data/stat-card.mjs --check      only re-check the spec against the shipped sample
//   node scripts/widget-data/stat-card.mjs --spec-lines print the spec's K_SAMPLE_ lines from the shipped sample
// Env: YOSYS overrides /opt/homebrew/bin/yosys.
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { constsOf, loadCompiler, sha256 } from '../agents-from-specs.mjs'
import { runSpecTests } from '../viewport-from-spec.mjs'
import { listsOf, parseStat } from './stat-card-statparse.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const REPO = join(SITE, '..', '..')
const WASM = 'public/t27/t27_compiler.wasm'
const SPEC = 'specs/widgets/stat-card.t27'
const OUT_DIR = 'public/widgets/stat-card'
const WORK = '/tmp/widget-stat-card/run'
const YOSYS = process.env.YOSYS || (existsSync('/opt/homebrew/bin/yosys') ? '/opt/homebrew/bin/yosys' : 'yosys')

const fail = (m) => { console.error(`stat-card: ${m}`); process.exit(1) }
const firstLine = (s) => String(s).split('\n').map((l) => l.trim()).find(Boolean) ?? ''

async function readSpec() {
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const text = readFileSync(join(SITE, SPEC), 'utf8')
  const analysis = analyze(text)
  const K = Object.fromEntries(Object.entries(constsOf(analysis)).map(([k, v]) => [k, v.value]))
  for (const k of ['K_SAMPLE_DESIGN', 'K_SAMPLE_MEM', 'K_SAMPLE_TOP', 'K_SAMPLE_JSON', 'K_SAMPLE_STAT', 'K_LUT_TYPES', 'K_FF_TYPES', 'K_DSP_TYPES', 'K_BRAM_TYPES']) if (!(k in K)) fail(`${SPEC} has no ${k}`)
  return { text, K, analysis }
}

/** Every K_SAMPLE_ fact, computed from the shipped yosys output (not from sample.json). */
export function factsOf(K) {
  const p = join(SITE, OUT_DIR, K.K_SAMPLE_STAT)
  if (!existsSync(p)) fail(`${OUT_DIR}/${K.K_SAMPLE_STAT} does not exist; run without --check first`)
  const r = parseStat(readFileSync(p, 'utf8'), listsOf(K))
  if (!r.ok) fail(`${OUT_DIR}/${K.K_SAMPLE_STAT} does not parse: ${r.error}`)
  if (r.groups.internal || r.groups.hier) fail(`${OUT_DIR}/${K.K_SAMPLE_STAT} has bookkeeping or submodule types; the spec's sums assume a flat stat`)
  return {
    r,
    facts: {
      K_SAMPLE_TOP: r.top, K_SAMPLE_YOSYS: r.version,
      K_SAMPLE_TYPES: r.types.map((t) => t.type), K_SAMPLE_COUNTS: r.types.map((t) => t.n),
      K_SAMPLE_LUT: r.groups.lut, K_SAMPLE_FF: r.groups.ff, K_SAMPLE_DSP: r.groups.dsp, K_SAMPLE_BRAM: r.groups.bram,
      K_SAMPLE_OTHER: r.groups.other, K_SAMPLE_CELLS: r.cells,
    },
  }
}

const specLine = (k, v) => typeof v === 'string' ? `pub const ${k} : str = ${JSON.stringify(v)};`
  : Array.isArray(v) ? `pub const ${k} : [${v.length}]${typeof v[0] === 'string' ? 'str' : 'u16'} = [${v.map((x) => JSON.stringify(x)).join(', ')}];`
    : `pub const ${k} : u16 = ${v};`

function checkSpec(K, analysis, sampleJson) {
  const { facts, r } = factsOf(K)
  const bad = []
  for (const [k, v] of Object.entries(facts)) {
    if (v === null || v === undefined) { bad.push(`${k}: the sample has no value for it`); continue }
    if (!(k in K)) bad.push(`${k}: missing from the spec; it should read  ${specLine(k, v)}`)
    else if (JSON.stringify(K[k]) !== JSON.stringify(v)) bad.push(`${k}: spec says ${JSON.stringify(K[k])}, the sample says ${JSON.stringify(v)}`)
  }
  const tests = runSpecTests(analysis, { ...K, ...facts })
  for (const f of tests.failures) bad.push(`spec test on the sample: ${f}`)
  if (tests.asserts === 0) bad.push('the spec has no asserts to run against the sample')
  if (sampleJson) {
    if (JSON.stringify(sampleJson.groups) !== JSON.stringify(r.groups)) bad.push(`${K.K_SAMPLE_JSON} groups differ from ${K.K_SAMPLE_STAT}`)
    const stat = readFileSync(join(SITE, OUT_DIR, K.K_SAMPLE_STAT))
    if (sampleJson.output.sha256 !== sha256(stat)) bad.push(`${K.K_SAMPLE_JSON} names a different ${K.K_SAMPLE_STAT} (sha256)`)
  }
  return { bad, tests }
}

/** A negative control: the spec's tests must fail when a count is wrong, or they test nothing. */
function negativeControl(K, analysis) {
  const broken = { ...K, K_SAMPLE_BRAM: K.K_SAMPLE_BRAM + 1, K_SAMPLE_LUT: K.K_SAMPLE_LUT - 1 }
  const t = runSpecTests(analysis, broken)
  if (t.failures.length === 0) fail('negative control: the spec tests still hold with the BRAM and LUT counts set wrong')
  return t.failures.length
}

async function main() {
  const { text, K, analysis } = await readSpec()
  const jsonPath = join(SITE, OUT_DIR, K.K_SAMPLE_JSON)
  if (process.argv.includes('--spec-lines')) { for (const [k, v] of Object.entries(factsOf(K).facts)) console.log(specLine(k, v)); return }
  if (process.argv.includes('--check')) {
    if (!existsSync(jsonPath)) fail(`${OUT_DIR}/${K.K_SAMPLE_JSON} does not exist; run without --check first`)
    const { bad, tests } = checkSpec(K, analysis, JSON.parse(readFileSync(jsonPath, 'utf8')))
    const neg = negativeControl(K, analysis)
    if (bad.length) { console.error(`stat-card --check: ${bad.length} problem(s)`); for (const b of bad) console.error('  ' + b); process.exit(3) }
    console.log(`stat-card --check: every K_SAMPLE_ fact in ${SPEC} matches ${OUT_DIR}/${K.K_SAMPLE_STAT}; ${tests.tests} tests, ${tests.asserts} asserts hold of it; negative control fails ${neg} assert(s) as it should`)
    return
  }

  rmSync(WORK, { recursive: true, force: true })
  const inputs = [K.K_SAMPLE_DESIGN, K.K_SAMPLE_MEM].map((rel) => {
    const src = join(REPO, rel)
    if (!existsSync(src)) fail(`${rel} is not in the trinity checkout at ${REPO}`)
    mkdirSync(dirname(join(WORK, rel)), { recursive: true })
    copyFileSync(src, join(WORK, rel))
    return { path: rel, sha256: sha256(readFileSync(src)), bytes: readFileSync(src).length }
  })
  const yosysVersion = firstLine(execFileSync(YOSYS, ['-V'], { encoding: 'utf8' }))
  const script = `read_verilog ${K.K_SAMPLE_DESIGN}; synth_xilinx -flatten -top ${K.K_SAMPLE_TOP}; tee -q -o stat.json stat -json`
  const command = `nice -n 10 yosys -q -p "${script}"`
  const t0 = process.hrtime.bigint()
  const r = spawnSync('nice', ['-n', '10', YOSYS, '-q', '-p', script], { cwd: WORK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const seconds = Math.round(Number(process.hrtime.bigint() - t0) / 1e6) / 1000
  if (r.status !== 0) fail(`yosys exited ${r.status}:\n${r.stderr || r.stdout}`)
  const stat = readFileSync(join(WORK, 'stat.json'))
  writeFileSync(join(SITE, OUT_DIR, K.K_SAMPLE_STAT), stat)
  const parsed = parseStat(stat.toString('utf8'), listsOf(K))
  if (!parsed.ok) fail(`the yosys output does not parse: ${parsed.error}`)
  const warnings = (r.stderr + r.stdout).split('\n').filter((l) => /warning/i.test(l)).length
  const data = {
    generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    spec: { path: `apps/website/${SPEC}`, sha256: sha256(Buffer.from(text, 'utf8')) },
    tools: { yosys: yosysVersion, node: process.version },
    repo: 'gHashTag/trinity',
    inputs,
    cwd: 'a scratch directory holding the inputs at their repo-relative paths',
    command, exit: r.status, seconds, warnings,
    output: { path: `${OUT_DIR.replace(/^public\//, '')}/${K.K_SAMPLE_STAT}`, sha256: sha256(stat), bytes: stat.length, key: parsed.key, from: parsed.from },
    top: parsed.top, version: parsed.version, groups: parsed.groups, cells: parsed.cells,
    types: parsed.types,
    note: 'yosys stat after synth_xilinx: synthesis cell counts, not post-place-and-route utilisation',
  }
  writeFileSync(jsonPath, JSON.stringify(data, null, 1).replaceAll(process.env.HOME, '~') + '\n')
  console.log(`stat-card: ${yosysVersion}; exit ${r.status} in ${seconds}s, ${warnings} warning line(s); ${JSON.stringify(parsed.groups)}`)
  console.log(`stat-card: wrote ${OUT_DIR}/${K.K_SAMPLE_STAT} and ${OUT_DIR}/${K.K_SAMPLE_JSON}`)

  const { bad } = checkSpec(K, analysis, data)
  const neg = negativeControl(K, analysis)
  if (bad.length) {
    console.error(`stat-card: ${bad.length} fact(s) in ${SPEC} disagree with the run:`)
    for (const b of bad) console.error('  ' + b)
    process.exit(3)
  }
  console.log(`stat-card: every K_SAMPLE_ fact in ${SPEC} matches the run, and its tests hold of it (negative control: ${neg} assert(s) fail as they should)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
