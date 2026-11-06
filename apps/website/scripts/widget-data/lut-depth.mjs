#!/usr/bin/env node
// lut-depth.mjs -- the built-in sample of the lut-depth widget (public/widgets/lut-depth/).
//
// The widget reads what yosys `ltp` printed in the reader's browser and draws the longest path as a
// staircase, one step per cell. This script makes the one sample the page opens with, and checks the
// spec's facts against it. Nothing is typed in:
//
//   1. what to run is read from specs/widgets/lut-depth.t27 (K_SAMPLE_DESIGN, K_SAMPLE_TOP,
//      K_SAMPLE_COMMANDS) through the vendored compiler public/t27/t27_compiler.wasm (the native t27c
//      is not run on this machine: Railway-only rule);
//   2. the design is copied from the trinity checkout into a scratch directory under the same
//      relative path, and yosys runs there once, under nice -n 10 (the machine is shared):
//        yosys -q -p "read_verilog <design>; synth_xilinx -flatten -top <top>; echo on;
//                     tee -q -o ltp.txt <command 1>; tee -q -a ltp.txt <command 2>; tee -q -a ltp.txt dump t:*"
//      `echo on` makes yosys write each command into the teed file, so the text names its own ltp
//      commands; `dump t:*` writes every cell with its type, so each step can be typed;
//   3. ltp.txt is shipped byte for byte as public/widgets/lut-depth/sample.ltp.txt; sample.json holds
//      the command, the `yosys -V` line, exit code, seconds, warnings, the sha256 of input and output,
//      and the parsed paths;
//   4. every K_SAMPLE_ fact in the spec is re-read from sample.ltp.txt by ltpparse.js (the parser the
//      page uses), the spec's own tests are run on those values, and a negative control (the same
//      tests with the LUT count and the plain length set wrong) must fail.
//
// Run (from apps/website):
//   node scripts/widget-data/lut-depth.mjs              synthesise, write, check
//   node scripts/widget-data/lut-depth.mjs --check      only re-check the spec against the shipped sample
//   node scripts/widget-data/lut-depth.mjs --spec-lines print the spec's K_SAMPLE_ lines from the shipped sample
// Env: YOSYS overrides /opt/homebrew/bin/yosys.
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { constsOf, loadCompiler, sha256 } from '../agents-from-specs.mjs'
import { runSpecTests } from '../viewport-from-spec.mjs'
import { listsOf, parseLtp } from './lut-depth-ltpparse.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const REPO = join(SITE, '..', '..')
const WASM = 'public/t27/t27_compiler.wasm'
const SPEC = 'specs/widgets/lut-depth.t27'
const OUT_DIR = 'public/widgets/lut-depth'
const WORK = '/tmp/widget-lut-depth/run'
const YOSYS = process.env.YOSYS || (existsSync('/opt/homebrew/bin/yosys') ? '/opt/homebrew/bin/yosys' : 'yosys')

const fail = (m) => { console.error(`lut-depth: ${m}`); process.exit(1) }
const firstLine = (s) => String(s).split('\n').map((l) => l.trim()).find(Boolean) ?? ''

async function readSpec() {
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const text = readFileSync(join(SITE, SPEC), 'utf8')
  const analysis = analyze(text)
  const K = Object.fromEntries(Object.entries(constsOf(analysis)).map(([k, v]) => [k, v.value]))
  for (const k of ['K_SAMPLE_DESIGN', 'K_SAMPLE_TOP', 'K_SAMPLE_COMMANDS', 'K_SAMPLE_JSON', 'K_SAMPLE_LOG', 'K_LUT_TYPES', 'K_CARRY_TYPES', 'K_MUX_TYPES', 'K_IO_TYPES', 'K_CLOCKED_TYPES']) if (!(k in K)) fail(`${SPEC} has no ${k}`)
  return { text, K, analysis }
}

/** The version word of a `yosys -V` line: "Yosys 0.67+post (git sha1 ...)" -> "0.67+post". The teed
 *  ltp text holds no version of its own, so this is read from the -V line sample.json recorded. */
const versionOf = (line) => (/^Yosys (\S+)/.exec(String(line ?? '')) ?? [])[1] ?? null

/** Every K_SAMPLE_ fact, computed from the shipped yosys output (not from sample.json). */
export function factsOf(K) {
  const p = join(SITE, OUT_DIR, K.K_SAMPLE_LOG)
  if (!existsSync(p)) fail(`${OUT_DIR}/${K.K_SAMPLE_LOG} does not exist; run without --check first`)
  const text = readFileSync(p, 'utf8')
  const r = parseLtp(text, listsOf(K))
  if (!r.ok) fail(`${OUT_DIR}/${K.K_SAMPLE_LOG} does not parse: ${r.error}`)
  if (r.blocks.length !== 2) fail(`${OUT_DIR}/${K.K_SAMPLE_LOG} has ${r.blocks.length} ltp block(s); the spec describes two`)
  if (!r.typed) fail(`${OUT_DIR}/${K.K_SAMPLE_LOG} holds no dump; its steps cannot be typed`)
  for (const b of r.blocks) if (b.printed !== b.length + 1) fail(`${OUT_DIR}/${K.K_SAMPLE_LOG}: block "${b.command}" lists ${b.printed} of ${b.length + 1} steps`)
  const [plain, fixed] = r.blocks
  const typesOf = (b) => b.steps.filter((s) => s.via).map((s) => s.type)
  return {
    r,
    facts: {
      K_SAMPLE_TOP: fixed.module,
      K_SAMPLE_COMMANDS: r.blocks.map((b) => b.command), K_SAMPLE_LENGTHS: r.blocks.map((b) => b.length),
      K_SAMPLE_PATH: typesOf(fixed),
      K_SAMPLE_PLAIN_TAIL: typesOf(plain).slice(fixed.length),
      K_SAMPLE_LUT: fixed.counts.lut, K_SAMPLE_CARRY: fixed.counts.carry, K_SAMPLE_MUX: fixed.counts.mux,
      K_SAMPLE_IO: fixed.counts.io, K_SAMPLE_CLOCKED: fixed.counts.clocked, K_SAMPLE_PLAIN_CLOCKED: plain.counts.clocked,
      K_SAMPLE_CELLS: r.cellTypes,
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
  // The plain path must be the fixed one plus its tail: same cells, step by step.
  const [plain, fixed] = r.blocks
  for (let i = 0; i <= fixed.length; i++) if (plain.steps[i].via !== fixed.steps[i].via) { bad.push(`step ${i}: the two paths part before the fixed one ends`); break }
  const tests = runSpecTests(analysis, { ...K, ...facts })
  for (const f of tests.failures) bad.push(`spec test on the sample: ${f}`)
  if (tests.asserts === 0) bad.push('the spec has no asserts to run against the sample')
  if (!sampleJson) bad.push(`no ${K.K_SAMPLE_JSON}: K_SAMPLE_YOSYS cannot be checked`)
  else if (versionOf(sampleJson.tools?.yosys) !== K.K_SAMPLE_YOSYS) bad.push(`K_SAMPLE_YOSYS: spec says ${JSON.stringify(K.K_SAMPLE_YOSYS)}, ${K.K_SAMPLE_JSON} recorded ${JSON.stringify(sampleJson.tools?.yosys)}`)
  if (sampleJson) {
    if (JSON.stringify(sampleJson.paths.map((p) => p.counts)) !== JSON.stringify(r.blocks.map((b) => b.counts))) bad.push(`${K.K_SAMPLE_JSON} counts differ from ${K.K_SAMPLE_LOG}`)
    const log = readFileSync(join(SITE, OUT_DIR, K.K_SAMPLE_LOG))
    if (sampleJson.output.sha256 !== sha256(log)) bad.push(`${K.K_SAMPLE_JSON} names a different ${K.K_SAMPLE_LOG} (sha256)`)
  }
  return { bad, tests }
}

/** A negative control: the spec's tests must fail when a count is wrong, or they test nothing. */
function negativeControl(K, analysis) {
  const broken = { ...K, K_SAMPLE_LUT: K.K_SAMPLE_LUT - 1, K_SAMPLE_LENGTHS: [K.K_SAMPLE_LENGTHS[0] - 1, K.K_SAMPLE_LENGTHS[1]] }
  const t = runSpecTests(analysis, broken)
  if (t.failures.length === 0) fail('negative control: the spec tests still hold with the LUT count and the plain length set wrong')
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
    if (bad.length) { console.error(`lut-depth --check: ${bad.length} problem(s)`); for (const b of bad) console.error('  ' + b); process.exit(3) }
    console.log(`lut-depth --check: every K_SAMPLE_ fact in ${SPEC} matches ${OUT_DIR}/${K.K_SAMPLE_LOG}; ${tests.tests} tests, ${tests.asserts} asserts hold of it; negative control fails ${neg} assert(s) as it should`)
    return
  }

  rmSync(WORK, { recursive: true, force: true })
  const rel = K.K_SAMPLE_DESIGN
  const src = join(REPO, rel)
  if (!existsSync(src)) fail(`${rel} is not in the trinity checkout at ${REPO}`)
  mkdirSync(dirname(join(WORK, rel)), { recursive: true })
  copyFileSync(src, join(WORK, rel))
  const inputs = [{ path: rel, sha256: sha256(readFileSync(src)), bytes: readFileSync(src).length }]
  const yosysVersion = firstLine(execFileSync(YOSYS, ['-V'], { encoding: 'utf8' }))
  const [c1, c2] = K.K_SAMPLE_COMMANDS
  const script = `read_verilog ${rel}; synth_xilinx -flatten -top ${K.K_SAMPLE_TOP}; echo on; tee -q -o ltp.txt ${c1}; tee -q -a ltp.txt ${c2}; tee -q -a ltp.txt dump t:*`
  const command = `nice -n 10 yosys -q -p "${script}"`
  const t0 = process.hrtime.bigint()
  const r = spawnSync('nice', ['-n', '10', YOSYS, '-q', '-p', script], { cwd: WORK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const seconds = Math.round(Number(process.hrtime.bigint() - t0) / 1e6) / 1000
  if (r.status !== 0) fail(`yosys exited ${r.status}:\n${r.stderr || r.stdout}`)
  const log = readFileSync(join(WORK, 'ltp.txt'))
  writeFileSync(join(SITE, OUT_DIR, K.K_SAMPLE_LOG), log)
  const parsed = parseLtp(log.toString('utf8'), listsOf(K))
  if (!parsed.ok) fail(`the yosys output does not parse: ${parsed.error}`)
  const warnLines = (r.stderr + r.stdout).split('\n').filter((l) => /warning/i.test(l)).map((l) => l.trim())
  const data = {
    generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    spec: { path: `apps/website/${SPEC}`, sha256: sha256(Buffer.from(text, 'utf8')) },
    tools: { yosys: yosysVersion, node: process.version },
    repo: 'gHashTag/trinity',
    inputs,
    cwd: 'a scratch directory holding the input at its repo-relative path',
    command, exit: r.status, seconds, warnings: warnLines.length, warning_lines: warnLines,
    output: { path: `${OUT_DIR.replace(/^public\//, '')}/${K.K_SAMPLE_LOG}`, sha256: sha256(log), bytes: log.length },
    top: K.K_SAMPLE_TOP, version: versionOf(yosysVersion), cells: parsed.cellTypes,
    paths: parsed.blocks.map((b) => ({
      command: b.command, module: b.module, length: b.length, printed: b.printed, counts: b.counts,
      steps: b.steps.map((s) => ({ i: s.i, type: s.type, cls: s.cls, cell: s.via, net: s.bit })),
    })),
    note: 'yosys ltp after synth_xilinx: cells on the longest topological path of the netlist before place and route; not a delay, not nanoseconds',
  }
  writeFileSync(jsonPath, JSON.stringify(data, null, 1).replaceAll(process.env.HOME, '~') + '\n')
  console.log(`lut-depth: ${yosysVersion}; exit ${r.status} in ${seconds}s, ${warnLines.length} warning line(s)`)
  for (const b of parsed.blocks) console.log(`lut-depth: ${b.command}: length=${b.length} ${JSON.stringify(b.counts)}`)
  console.log(`lut-depth: wrote ${OUT_DIR}/${K.K_SAMPLE_LOG} (${log.length} bytes) and ${OUT_DIR}/${K.K_SAMPLE_JSON}`)

  const { bad } = checkSpec(K, analysis, data)
  const neg = negativeControl(K, analysis)
  if (bad.length) {
    console.error(`lut-depth: ${bad.length} fact(s) in ${SPEC} disagree with the run:`)
    for (const b of bad) console.error('  ' + b)
    process.exit(3)
  }
  console.log(`lut-depth: every K_SAMPLE_ fact in ${SPEC} matches the run, and its tests hold of it (negative control: ${neg} assert(s) fail as they should)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
