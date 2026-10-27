#!/usr/bin/env node
// vcd-wrapped.mjs -- the sample simulations of the vcd-wrapped widget (public/widgets/vcd-wrapped/).
//
// The widget reads a VCD in the reader's browser and prints its summary card. This script makes
// the three VCDs the page opens with and checks the spec's numbers against them. Nothing is typed:
//
//   1. the samples are named by specs/widgets/vcd-wrapped.t27 (K_SAMPLE_IDS, K_SAMPLE_KINDS,
//      K_SAMPLE_SOURCES), read through the vendored compiler;
//   2. a "t27" sample is a spec under public/t27/files/specs/, compiled to Verilog by
//      public/t27/t27_compiler.wasm in node (the native t27c is not run on this machine: Railway-only
//      rule) and driven by a hand-written testbench in scripts/widget-data/; a "repo" sample is RTL
//      and its own testbench as committed in this repository under fpga/openxc7-synth/, run as is;
//   3. each is compiled by iverilog and run by vvp, one at a time (the machine is shared), with a
//      size cap on the dump so a runaway testbench cannot fill the disk;
//   4. each VCD is summarised by scripts/widget-data/vcd-wrapped-vcdstats.js, the parser the page runs;
//      the VCD as vvp dumped it (not trimmed: each is under K_MAX_SAMPLE_BYTES) and samples.json
//      (commands, tool versions, sha256 of every input, the testbench's verdict lines, the summary)
//      are written beside the page;
//   5. every K_ fact in the spec is recomputed from the shipped VCDs, and the spec's own tests are
//      run on those values, with a negative control.
//
// Run (from apps/website):
//   node scripts/widget-data/vcd-wrapped.mjs              simulate, summarise, write, check
//   node scripts/widget-data/vcd-wrapped.mjs --check      only re-check the spec against the shipped VCDs
//   node scripts/widget-data/vcd-wrapped.mjs --spec-lines print the spec's fact lines from the shipped VCDs
//   node scripts/widget-data/vcd-wrapped.mjs --card-data  print the spec's words and the card sample as JSON
//                                                         (read by vcd-wrapped-card.py, so the card has no words of its own)
// Env: IVERILOG and VVP override /opt/homebrew/bin/iverilog and /opt/homebrew/bin/vvp.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { constsOf, loadCompiler, sha256 } from '../agents-from-specs.mjs'
import { runSpecTests } from '../viewport-from-spec.mjs'
import { spanUnits, vcdSummary } from './vcd-wrapped-vcdstats.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const REPO = join(SITE, '..', '..')
const WASM = 'public/t27/t27_compiler.wasm'
const SPEC = 'specs/widgets/vcd-wrapped.t27'
const CORPUS = 'public/t27/files/specs'
const OUT_DIR = 'public/widgets/vcd-wrapped'
const VCD_DIR = `${OUT_DIR}/samples`
const WORK = '/tmp/widget-vcd-wrapped/run'
const IVERILOG = process.env.IVERILOG || (existsSync('/opt/homebrew/bin/iverilog') ? '/opt/homebrew/bin/iverilog' : 'iverilog')
const VVP = process.env.VVP || (existsSync('/opt/homebrew/bin/vvp') ? '/opt/homebrew/bin/vvp' : 'vvp')
// A testbench that never ends is stopped here; the cap is on the dump file (bash ulimit -f, 512-byte blocks).
const VVP_TIMEOUT_S = 120
const DUMP_CAP_BLOCKS = 4096

// How each sample is run. The spec names the samples; this says which testbench drives each.
const RUNS = {
  counter: {
    tb: 'apps/website/scripts/widget-data/vcd-wrapped-counter-tb.v',
    top: 'tb', vcd: 'waves.vcd',
  },
  'vsa-bind': {
    tb: 'fpga/openxc7-synth/tb/tb_vsa_bind_16.v',
    top: 'tb_vsa_bind_16', vcd: 'tb_vsa_bind_16.vcd',
  },
  tmu: {
    tb: 'fpga/openxc7-synth/tmu_tb.v',
    top: 'tmu_tb', vcd: 'tmu_tb.vcd',
    // tmu.v reads its weights with $readmemb; every tmu_test_w_* file the repo has is linked into
    // the run directory, so the run sees what a run inside fpga/openxc7-synth/ would see.
    link: /^tmu_test_w_.*\.mem$/, linkDir: 'fpga/openxc7-synth',
  },
}

const fail = (m) => { console.error(`vcd-wrapped: ${m}`); process.exit(1) }
const firstLine = (s) => String(s).split('\n').map((l) => l.trim()).find(Boolean) ?? ''
const ascii = (s) => s.replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7e]/g, '').trimEnd()

async function readSpec() {
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const text = readFileSync(join(SITE, SPEC), 'utf8')
  const analysis = analyze(text)
  const K = Object.fromEntries(Object.entries(constsOf(analysis)).map(([k, v]) => [k, v.value]))
  for (const k of ['K_SAMPLE_IDS', 'K_SAMPLE_KINDS', 'K_SAMPLE_SOURCES', 'K_MAX_SAMPLE_BYTES', 'K_SAMPLES_JSON', 'K_CARD_SAMPLE']) if (!(k in K)) fail(`${SPEC} has no ${k}`)
  if (K.K_SAMPLE_IDS.length !== K.K_SAMPLE_KINDS.length || K.K_SAMPLE_IDS.length !== K.K_SAMPLE_SOURCES.length) fail(`${SPEC}: K_SAMPLE_IDS, K_SAMPLE_KINDS and K_SAMPLE_SOURCES differ in length`)
  for (const id of K.K_SAMPLE_IDS) if (!RUNS[id]) fail(`${SPEC} names sample ${id}; this script does not know how to run it`)
  return { analyze, text, K, analysis }
}

/** The testbench's own verdict, from what vvp printed: CHECK lines, or PASS / FAIL lines. */
export function verdictOf(stdout) {
  let pass = 0
  let failN = 0
  const lines = []
  for (const raw of stdout.split('\n')) {
    const line = ascii(raw).replace(/\/\S*\/(fpga|apps)\//g, '$1/')
    if (/^CHECK \S+ pass\b/.test(line) || /^\s*PASS\b/.test(line)) pass++
    else if (/^CHECK \S+ fail\b/.test(line) || /^\s*FAIL\b/.test(line)) failN++
    else if (!/ERROR|readmem|FAILED|PASSED|DONE/.test(line)) continue
    lines.push(line.trim())
  }
  return { pass, total: pass + failN, lines }
}

// --- the spec's facts, from the shipped VCDs ---------------------------------------------------
const FACTS = {
  K_CHANGES: (s) => s.changes, K_FLIPS: (s) => s.flips, K_SIGNALS: (s) => s.signals, K_VARS: (s) => s.vars,
  K_SCOPES: (s) => s.scopes, K_PARAMS: (s) => s.params, K_STUCK_XZ: (s) => s.stuck_xz, K_ENDS_XZ: (s) => s.ends_xz,
  K_NEVER_CHANGED: (s) => s.never_changed, K_SPAN: (s) => s.span, K_STAMPS: (s) => s.stamps,
  K_BUSIEST_CHANGES: (s) => s.busiest[0]?.changes ?? 0,
}

export function factsOf(K, samplesJson) {
  const summaries = K.K_SAMPLE_IDS.map((id) => {
    const p = join(SITE, VCD_DIR, `${id}.vcd`)
    if (!existsSync(p)) fail(`${VCD_DIR}/${id}.vcd does not exist; run without --check first`)
    return vcdSummary(readFileSync(p, 'utf8'))
  })
  const facts = Object.fromEntries(Object.entries(FACTS).map(([k, f]) => [k, summaries.map(f)]))
  if (samplesJson) {
    facts.K_CHECKS_PASS = K.K_SAMPLE_IDS.map((id) => samplesJson.samples.find((x) => x.id === id)?.verdict.pass ?? -1)
    facts.K_CHECKS_TOTAL = K.K_SAMPLE_IDS.map((id) => samplesJson.samples.find((x) => x.id === id)?.verdict.total ?? -1)
  }
  return { facts, summaries }
}

const specLine = (k, v) => `pub const ${k} : [${v.length}]u32 = [${v.join(', ')}];`

/** The card's words in IMAGE_ALT must say the card sample's real numbers. */
function altProblems(K, f, summaries) {
  const i = K.K_SAMPLE_IDS.indexOf(K.K_CARD_SAMPLE)
  if (i < 0) return [`K_CARD_SAMPLE ${K.K_CARD_SAMPLE} is not one of K_SAMPLE_IDS`]
  const s = summaries[i]
  const n = (x) => x.toLocaleString('en-US')
  const want = [`${n(s.changes)} value changes`, `${s.busiest[0].name.split('.').pop()} with ${n(s.busiest[0].changes)}`, `${s.stuck_xz} signals`, `${s.signals} signals`, `${s.scopes} scopes`]
  return want.filter((w) => !f.IMAGE_ALT.includes(w)).map((w) => `IMAGE_ALT should say "${w}" (from ${VCD_DIR}/${K.K_CARD_SAMPLE}.vcd)`)
}

function checkSpec(K, analysis, samplesJson) {
  const { facts, summaries } = factsOf(K, samplesJson)
  const bad = []
  for (const [k, v] of Object.entries(facts)) {
    if (!(k in K)) bad.push(`${k}: missing from the spec; it should read  ${specLine(k, v)}`)
    else if (JSON.stringify(K[k]) !== JSON.stringify(v)) bad.push(`${k}: spec says ${JSON.stringify(K[k])}, the VCDs say ${JSON.stringify(v)}`)
  }
  const tests = runSpecTests(analysis, { ...K, ...facts })
  for (const f of tests.failures) bad.push(`spec test on the VCDs: ${f}`)
  if (tests.asserts === 0) bad.push('the spec has no asserts to run against the VCDs')
  bad.push(...altProblems(K, K, summaries))
  K.K_SAMPLE_IDS.forEach((id, i) => {
    const s = samplesJson.samples.find((x) => x.id === id)
    if (!s) { bad.push(`${K.K_SAMPLES_JSON} has no sample ${id}`); return }
    if (JSON.stringify(s.summary) !== JSON.stringify(summaries[i])) bad.push(`${K.K_SAMPLES_JSON} summary for ${id} differs from ${VCD_DIR}/${id}.vcd`)
    const bytes = readFileSync(join(SITE, VCD_DIR, `${id}.vcd`))
    if (s.vcd_sha256 !== sha256(bytes)) bad.push(`${K.K_SAMPLES_JSON} vcd_sha256 for ${id} is not the shipped file's`)
    if (bytes.length > K.K_MAX_SAMPLE_BYTES) bad.push(`${VCD_DIR}/${id}.vcd is ${bytes.length} bytes, over K_MAX_SAMPLE_BYTES ${K.K_MAX_SAMPLE_BYTES}`)
  })
  return { bad, tests }
}

/** A negative control: the spec's tests must fail when a fact is wrong, or they test nothing. */
function negativeControl(K, analysis) {
  const broken = { ...K, K_STUCK_XZ: K.K_STUCK_XZ.map(() => 0), K_CHECKS_PASS: K.K_CHECKS_TOTAL.slice() }
  const t = runSpecTests(analysis, broken)
  if (t.failures.length === 0) fail('negative control: the spec tests still hold with no stuck X/Z signal and every check passing')
  return t.failures.length
}

function runSample(id, kind, rel, analyze, i) {
  const r = RUNS[id]
  const dir = join(WORK, id)
  mkdirSync(dir, { recursive: true })
  const inputs = []
  let design
  if (kind === 't27') {
    const src = readFileSync(join(SITE, CORPUS, rel), 'utf8')
    const v = analyze(src).targets?.verilog
    if (!v?.ok || !v.code) fail(`${rel}: the wasm compiler produced no Verilog`)
    design = rel.split('/').pop().replace(/\.t27$/, '.v')
    writeFileSync(join(dir, design), v.code)
    inputs.push({ role: 'spec', path: `apps/website/${CORPUS}/${rel}`, sha256: sha256(Buffer.from(src, 'utf8')) })
    inputs.push({ role: 'generated Verilog', path: design, sha256: sha256(Buffer.from(v.code, 'utf8')) })
    design = join(dir, design)
  } else if (kind === 'repo') {
    design = join(REPO, rel)
    inputs.push({ role: 'RTL', path: rel, sha256: sha256(readFileSync(design)) })
  } else fail(`${SPEC}: K_SAMPLE_KINDS[${i}] is ${kind}, not t27 or repo`)
  const tb = join(REPO, r.tb)
  inputs.push({ role: 'testbench', path: r.tb, sha256: sha256(readFileSync(tb)) })
  const linked = []
  if (r.link) for (const f of readdirSync(join(REPO, r.linkDir)).filter((n) => r.link.test(n)).sort()) { symlinkSync(join(REPO, r.linkDir, f), join(dir, f)); linked.push(f) }

  const rp = (p) => p.startsWith(dir) ? p.slice(dir.length + 1) : p.replace(REPO + '/', '')
  const compileArgs = ['-g2012', '-s', r.top, '-o', 'sim.vvp', tb, design]
  const compile = spawnSync(IVERILOG, compileArgs, { cwd: dir, encoding: 'utf8' })
  if (compile.status !== 0) fail(`${id}: iverilog failed:\n${compile.stdout}${compile.stderr}`)
  // vvp under a dump cap and a time limit, from bash so `ulimit -f` applies to it alone
  const sim = spawnSync('/bin/bash', ['-c', `ulimit -f ${DUMP_CAP_BLOCKS}; exec "$0" -n sim.vvp`, VVP], { cwd: dir, encoding: 'utf8', timeout: VVP_TIMEOUT_S * 1000, maxBuffer: 16 * 1024 * 1024 })
  const stdout = `${sim.stdout ?? ''}${sim.stderr ?? ''}`
  if (sim.status !== 0 || sim.signal) fail(`${id}: vvp exited ${sim.status} ${sim.signal ?? ''}:\n${stdout.slice(-2000)}`)
  const vcdPath = join(dir, r.vcd)
  if (!existsSync(vcdPath)) fail(`${id}: vvp wrote no ${r.vcd}`)
  const bytes = readFileSync(vcdPath)
  const finish = /\$finish called at (\d+)/.exec(stdout)
  return {
    id, kind, source: kind === 't27' ? `apps/website/${CORPUS}/${rel}` : rel, top: r.top,
    inputs, linked_files: linked.length ? { from: r.linkDir, files: linked } : null,
    commands: [`cd ${WORK}/${id}`, ...(linked.length ? [`ln -s ${r.linkDir}/tmu_test_w_*.mem .   # ${linked.length} files`] : []), `iverilog ${compileArgs.map(rp).join(' ')}`, `vvp -n sim.vvp   # under ulimit -f ${DUMP_CAP_BLOCKS}, timeout ${VVP_TIMEOUT_S} s`],
    finish_time: finish ? Number(finish[1]) : null,
    verdict: verdictOf(stdout),
    bytes, vcd: `samples/${id}.vcd`, vcd_bytes: bytes.length, vcd_sha256: sha256(bytes), trimmed: false,
  }
}

async function main() {
  const { analyze, text, K, analysis } = await readSpec()
  const jsonPath = join(SITE, OUT_DIR, K.K_SAMPLES_JSON)
  if (process.argv.includes('--card-data')) {
    if (!existsSync(jsonPath)) fail(`${OUT_DIR}/${K.K_SAMPLES_JSON} does not exist; run without --check first`)
    const samplesJson = JSON.parse(readFileSync(jsonPath, 'utf8'))
    const sample = samplesJson.samples.find((x) => x.id === K.K_CARD_SAMPLE) ?? fail(`no sample ${K.K_CARD_SAMPLE} in ${K.K_SAMPLES_JSON}`)
    const i = K.K_SAMPLE_IDS.indexOf(K.K_CARD_SAMPLE)
    console.log(JSON.stringify({ say: K, sample, name: K.SAY_SAMPLE_NAMES[i], span: spanUnits(sample.summary.span, sample.summary.timescale), tools: samplesJson.tools }))
    return
  }
  if (process.argv.includes('--check') || process.argv.includes('--spec-lines')) {
    const samplesJson = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, 'utf8')) : null
    if (!samplesJson) fail(`${OUT_DIR}/${K.K_SAMPLES_JSON} does not exist; run without --check first`)
    if (process.argv.includes('--spec-lines')) { for (const [k, v] of Object.entries(factsOf(K, samplesJson).facts)) console.log(specLine(k, v)); return }
    const { bad, tests } = checkSpec(K, analysis, samplesJson)
    const neg = negativeControl(K, analysis)
    if (bad.length) { console.error(`vcd-wrapped --check: ${bad.length} problem(s)`); for (const b of bad) console.error('  ' + b); process.exit(3) }
    console.log(`vcd-wrapped --check: every K_ fact in ${SPEC} matches ${VCD_DIR}/*.vcd; ${tests.tests} tests, ${tests.asserts} asserts hold of the VCDs; negative control fails ${neg} assert(s) as it should`)
    return
  }

  rmSync(WORK, { recursive: true, force: true })
  mkdirSync(WORK, { recursive: true })
  const wasm = readFileSync(join(SITE, WASM))
  const version = (cmd) => { const r = spawnSync(cmd, ['-V'], { encoding: 'utf8' }); return firstLine(`${r.stdout ?? ''}${r.stderr ?? ''}`) || fail(`${cmd} -V printed nothing`) }
  const tools = { iverilog: version(IVERILOG), vvp: version(VVP), node: process.version }
  const repoHead = firstLine(execFileSync('git', ['-C', REPO, 'rev-parse', 'HEAD'], { encoding: 'utf8' }))
  const samples = []
  K.K_SAMPLE_IDS.forEach((id, i) => {
    const t0 = process.hrtime.bigint()
    const s = runSample(id, K.K_SAMPLE_KINDS[i], K.K_SAMPLE_SOURCES[i], analyze, i)
    s.seconds = Math.round(Number(process.hrtime.bigint() - t0) / 1e6) / 1000
    if (s.vcd_bytes > K.K_MAX_SAMPLE_BYTES) fail(`${id}: the VCD is ${s.vcd_bytes} bytes, over K_MAX_SAMPLE_BYTES ${K.K_MAX_SAMPLE_BYTES}; shorten the run rather than ship a cut file`)
    s.summary = vcdSummary(s.bytes.toString('utf8'))
    mkdirSync(join(SITE, VCD_DIR), { recursive: true })
    writeFileSync(join(SITE, VCD_DIR, `${id}.vcd`), s.bytes)
    delete s.bytes
    samples.push(s)
    console.log(`  ${id.padEnd(9)} ${s.seconds}s  ${s.vcd_bytes} bytes  checks ${s.verdict.pass}/${s.verdict.total}  changes ${s.summary.changes}  busiest ${s.summary.busiest[0]?.name} ${s.summary.busiest[0]?.changes}  stuck X/Z ${s.summary.stuck_xz}`)
  })
  const data = {
    generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    spec: { path: `apps/website/${SPEC}`, sha256: sha256(Buffer.from(text, 'utf8')) },
    compiler: { path: WASM.replace(/^public\//, ''), sha256: sha256(wasm), target: 'verilog' },
    repo: { name: 'gHashTag/trinity', head: repoHead },
    tools,
    parser: { path: `apps/website/${OUT_DIR}/vcdstats.js`, sha256: sha256(readFileSync(join(SITE, OUT_DIR, 'vcdstats.js'))) },
    note: 'Each VCD is shipped as vvp dumped it, not trimmed. Paths are relative to the gHashTag/trinity checkout.',
    samples,
  }
  writeFileSync(jsonPath, JSON.stringify(data, null, 1).replaceAll(REPO + '/', '').replaceAll(process.env.HOME, '~') + '\n')
  console.log(`vcd-wrapped: ${samples.length} samples with ${tools.iverilog}; wrote ${OUT_DIR}/${K.K_SAMPLES_JSON} and ${VCD_DIR}/*.vcd`)

  const { bad } = checkSpec(K, analysis, JSON.parse(readFileSync(jsonPath, 'utf8')))
  const neg = negativeControl(K, analysis)
  if (bad.length) {
    console.error(`vcd-wrapped: ${bad.length} fact(s) in ${SPEC} disagree with the run:`)
    for (const b of bad) console.error('  ' + b)
    process.exit(3)
  }
  console.log(`vcd-wrapped: every K_ fact in ${SPEC} matches the VCDs, and its tests hold of them (negative control: ${neg} assert(s) fail as they should)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
