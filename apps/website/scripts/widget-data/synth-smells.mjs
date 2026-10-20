#!/usr/bin/env node
// synth-smells.mjs -- the sample logs of the synth-smells widget (public/widgets/synth-smells/).
//
// The widget reads a yosys log in the reader's browser and lists its smells. This script makes the
// four logs the page opens with, and checks the spec's facts against them. Nothing is typed in:
//
//   1. the samples are read from specs/widgets/synth-smells.t27 (K_SAMPLE_IDS, K_SAMPLE_KINDS,
//      K_SAMPLE_SOURCES) through the vendored compiler, so the spec says what is run;
//   2. a "t27" sample is a spec under public/t27/files/specs/, compiled to Verilog by
//      public/t27/t27_compiler.wasm (the file the site ships; the native t27c is not run on this
//      machine: Railway-only rule); a "hand" sample is a Verilog file written by hand, named so;
//   3. each is synthesised once by yosys `synth_xilinx -family xc7 -flatten`, one run at a time (the
//      machine is shared), with the full log written by `-l`. A refused run is a sample, not a skip;
//   4. each log is trimmed by smellparse.js trimLog: every line the parser reads, the pass header
//      above it, the banner and the final statistics stay; each other run of lines becomes one
//      marker. The run fails unless the full and the trimmed log parse to the same counts;
//   5. the trimmed logs and samples.json are written beside the page, then every K_ fact in the spec
//      is re-read from the trimmed logs, and the spec's own tests are run on those values.
//
// Run (from apps/website):
//   node scripts/widget-data/synth-smells.mjs              compile, synthesise, trim, write, check
//   node scripts/widget-data/synth-smells.mjs --check      only re-check the spec against the shipped logs
//   node scripts/widget-data/synth-smells.mjs --spec-lines print the spec's fact lines from the shipped logs
// Env: YOSYS overrides /opt/homebrew/bin/yosys.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { constsOf, loadCompiler, sha256 } from '../agents-from-specs.mjs'
import { runSpecTests } from '../viewport-from-spec.mjs'
import { parseYosysLog, smellCounts, trimLog } from './synth-smells-smellparse.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const WASM = 'public/t27/t27_compiler.wasm'
const SPEC = 'specs/widgets/synth-smells.t27'
const CORPUS = 'public/t27/files/specs'
const OUT_DIR = 'public/widgets/synth-smells'
const LOG_DIR = `${OUT_DIR}/samples`
const WORK = '/tmp/widget-synth-smells/run'
const YOSYS = process.env.YOSYS || (existsSync('/opt/homebrew/bin/yosys') ? '/opt/homebrew/bin/yosys' : 'yosys')
const SYNTH = 'synth_xilinx -family xc7 -flatten'
const MARKER = '[... {n} line(s) trimmed by scripts/widget-data/synth-smells.mjs ...]'

const fail = (m) => { console.error(`synth-smells: ${m}`); process.exit(1) }
const firstLine = (s) => String(s).split('\n').map((l) => l.trim()).find(Boolean) ?? ''
const stemOf = (p) => p.split('/').pop().replace(/\.(t27|v)$/, '')

async function readSpec() {
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const text = readFileSync(join(SITE, SPEC), 'utf8')
  const analysis = analyze(text)
  const K = Object.fromEntries(Object.entries(constsOf(analysis)).map(([k, v]) => [k, v.value]))
  for (const k of ['K_SAMPLE_IDS', 'K_SAMPLE_KINDS', 'K_SAMPLE_SOURCES', 'K_MAX_LOG_BYTES', 'K_SAMPLES_JSON']) if (!(k in K)) fail(`${SPEC} has no ${k}`)
  if (K.K_SAMPLE_IDS.length !== K.K_SAMPLE_KINDS.length || K.K_SAMPLE_IDS.length !== K.K_SAMPLE_SOURCES.length) fail(`${SPEC}: K_SAMPLE_IDS, K_SAMPLE_KINDS and K_SAMPLE_SOURCES differ in length`)
  return { analyze, text, K, analysis }
}

// --- the spec's facts, from the parsed logs ----------------------------------------------------
const FACTS = {
  K_ERRORS: 'errors', K_LATCHES: 'latches', K_UNDRIVEN: 'undriven', K_UNDRIVEN_BITS: 'undriven_bits',
  K_CONFLICTS: 'conflicts', K_MEMORIES: 'memories', K_REMOVED_CELLS: 'removed_cells', K_REMOVED_WIRES: 'removed_wires',
  K_WARNINGS: 'warnings', K_CELLS: 'cells', K_SUBMODULES: 'submodules', K_LUTS: 'luts', K_FFS: 'ffs', K_LATCH_CELLS: 'latch_cells', K_CARRY: 'carry',
}

/** Every K_ fact, computed from the trimmed logs on disk (not from samples.json). */
export function factsOf(K) {
  const parsed = K.K_SAMPLE_IDS.map((id) => {
    const p = join(SITE, LOG_DIR, `${id}.log`)
    if (!existsSync(p)) fail(`${LOG_DIR}/${id}.log does not exist; run without --check first`)
    return parseYosysLog(readFileSync(p, 'utf8'))
  })
  const counts = parsed.map(smellCounts)
  const facts = Object.fromEntries(Object.entries(FACTS).map(([k, c]) => [k, counts.map((x) => x[c])]))
  const refused = parsed.map((p) => p.errors[0]).find((e) => e && e.line)
  facts.K_REFUSED_LINE = refused?.line ?? null
  return { facts, parsed, counts }
}

const specLine = (k, v) => `pub const ${k} : ${Array.isArray(v) ? `[${v.length}]u16 = [${v.join(', ')}]` : `u16 = ${v}`};`

function checkSpec(K, analysis, samplesJson) {
  const { facts, counts } = factsOf(K)
  const bad = []
  for (const [k, v] of Object.entries(facts)) {
    if (v === null) { bad.push(`${k}: the logs have no value for it`); continue }
    if (!(k in K)) bad.push(`${k}: missing from the spec; it should read  ${specLine(k, v)}`)
    else if (JSON.stringify(K[k]) !== JSON.stringify(v)) bad.push(`${k}: spec says ${JSON.stringify(K[k])}, the logs say ${JSON.stringify(v)}`)
  }
  // The spec's own tests, with every fact taken from the logs instead of the spec.
  const tests = runSpecTests(analysis, { ...K, ...facts })
  for (const f of tests.failures) bad.push(`spec test on the logs: ${f}`)
  if (tests.asserts === 0) bad.push('the spec has no asserts to run against the logs')
  // samples.json says what the page shows beside each log; it must agree with the logs too.
  if (samplesJson) K.K_SAMPLE_IDS.forEach((id, i) => {
    const s = samplesJson.samples.find((x) => x.id === id)
    if (!s) bad.push(`${K.K_SAMPLES_JSON} has no sample ${id}`)
    else if (JSON.stringify(s.counts) !== JSON.stringify(counts[i])) bad.push(`${K.K_SAMPLES_JSON} counts for ${id} differ from ${LOG_DIR}/${id}.log`)
  })
  for (const id of K.K_SAMPLE_IDS) {
    const size = statSync(join(SITE, LOG_DIR, `${id}.log`)).size
    if (size > K.K_MAX_LOG_BYTES) bad.push(`${LOG_DIR}/${id}.log is ${size} bytes, over K_MAX_LOG_BYTES ${K.K_MAX_LOG_BYTES}`)
  }
  return { bad, tests }
}

/** A negative control: the spec's tests must fail when a fact is wrong, or they test nothing. */
function negativeControl(K, analysis) {
  const broken = { ...K, K_LATCHES: K.K_LATCHES.map(() => 0), K_ERRORS: K.K_ERRORS.map(() => 0) }
  const t = runSpecTests(analysis, broken)
  if (t.failures.length === 0) fail('negative control: the spec tests still hold with every latch and error count set to 0')
  return t.failures.length
}

async function main() {
  const { analyze, text, K, analysis } = await readSpec()
  const jsonPath = join(SITE, OUT_DIR, K.K_SAMPLES_JSON)
  if (process.argv.includes('--check') || process.argv.includes('--spec-lines')) {
    if (process.argv.includes('--spec-lines')) { for (const [k, v] of Object.entries(factsOf(K).facts)) console.log(specLine(k, v)); return }
    const samplesJson = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, 'utf8')) : null
    if (!samplesJson) fail(`${OUT_DIR}/${K.K_SAMPLES_JSON} does not exist; run without --check first`)
    const { bad, tests } = checkSpec(K, analysis, samplesJson)
    const neg = negativeControl(K, analysis)
    if (bad.length) { console.error(`synth-smells --check: ${bad.length} problem(s)`); for (const b of bad) console.error('  ' + b); process.exit(3) }
    console.log(`synth-smells --check: every K_ fact in ${SPEC} matches ${LOG_DIR}/*.log; ${tests.tests} tests, ${tests.asserts} asserts hold of the logs; negative control fails ${neg} assert(s) as it should`)
    return
  }

  rmSync(WORK, { recursive: true, force: true })
  mkdirSync(WORK, { recursive: true })
  const wasm = readFileSync(join(SITE, WASM))
  const yosysVersion = firstLine(execFileSync(YOSYS, ['-V'], { encoding: 'utf8' }))
  const samples = []
  const commands = ['node scripts/widget-data/synth-smells.mjs', `cd ${WORK}`]
  K.K_SAMPLE_IDS.forEach((id, i) => {
    const kind = K.K_SAMPLE_KINDS[i]
    const rel = K.K_SAMPLE_SOURCES[i]
    let src, verilog, sourcePath
    if (kind === 't27') {
      sourcePath = `apps/website/${CORPUS}/${rel}`
      src = readFileSync(join(SITE, CORPUS, rel), 'utf8')
      const v = analyze(src).targets?.verilog
      if (!v?.ok || !v.code) fail(`${rel}: the wasm compiler produced no Verilog`)
      verilog = v.code
    } else if (kind === 'hand') {
      sourcePath = `apps/website/${rel}`
      src = readFileSync(join(SITE, rel), 'utf8')
      verilog = src
    } else fail(`${SPEC}: K_SAMPLE_KINDS[${i}] is ${kind}, not t27 or hand`)
    const top = /^module (\w+)\s*\(/m.exec(verilog)?.[1]
    if (!top) fail(`${rel}: no module header in the Verilog`)
    const stem = stemOf(rel)
    writeFileSync(join(WORK, `${stem}.v`), verilog)
    const script = `read_verilog -sv ${stem}.v; ${SYNTH} -top ${top}`
    const args = ['-q', '-l', `${stem}.full.log`, '-p', script]
    const command = `yosys -q -l ${stem}.full.log -p "${script}"`
    commands.push(command)
    const t0 = process.hrtime.bigint()
    const r = spawnSync(YOSYS, args, { cwd: WORK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const seconds = Math.round(Number(process.hrtime.bigint() - t0) / 1e6) / 1000
    const full = readFileSync(join(WORK, `${stem}.full.log`), 'utf8')
    const trimmed = trimLog(full, MARKER) + '\n'
    const a = smellCounts(parseYosysLog(full))
    const b = smellCounts(parseYosysLog(trimmed))
    if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${id}: the trimmed log parses differently from the full one:\n  full    ${JSON.stringify(a)}\n  trimmed ${JSON.stringify(b)}`)
    const parsed = parseYosysLog(full)
    // For a refused run, the source line yosys stopped at, quoted so the page can show it.
    const err = parsed.errors.find((e) => e.line)
    const refused = err ? { file: err.file, line: err.line, message: err.message, text: verilog.split('\n')[err.line - 1]?.trim() ?? null } : null
    samples.push({
      id, kind, source: sourcePath, top, sha256: sha256(Buffer.from(src, 'utf8')),
      ...(kind === 't27' ? { verilog_sha256: sha256(Buffer.from(verilog, 'utf8')) } : {}),
      command, exit: r.status, seconds,
      log: `samples/${id}.log`, full_lines: parsed.lines, full_bytes: Buffer.byteLength(full), trimmed_lines: trimmed.split('\n').length, trimmed_bytes: Buffer.byteLength(trimmed),
      counts: a, refused,
    })
    mkdirSync(join(SITE, LOG_DIR), { recursive: true })
    writeFileSync(join(SITE, LOG_DIR, `${id}.log`), trimmed)
    console.log(`  ${id.padEnd(12)} exit ${r.status}  ${seconds}s  ${parsed.lines} -> ${trimmed.split('\n').length} lines  ${JSON.stringify(a)}`)
  })
  const data = {
    generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    spec: { path: `apps/website/${SPEC}`, sha256: sha256(Buffer.from(text, 'utf8')) },
    compiler: { path: WASM.replace(/^public\//, ''), sha256: sha256(wasm), target: 'verilog' },
    tools: { yosys: yosysVersion, node: process.version },
    synth: SYNTH,
    trim: 'smellparse.js trimLog: the banner, every line the parser reads, the pass header above it, the indented lines under it, and everything from the last "Printing statistics." on; each other run of lines is one marker line',
    commands,
    samples,
  }
  writeFileSync(jsonPath, JSON.stringify(data, null, 1).replaceAll(process.env.HOME, '~') + '\n')
  console.log(`synth-smells: ${samples.length} samples with ${yosysVersion}; wrote ${OUT_DIR}/${K.K_SAMPLES_JSON} and ${LOG_DIR}/*.log`)

  const { bad } = checkSpec(K, analysis, data)
  const neg = negativeControl(K, analysis)
  if (bad.length) {
    console.error(`synth-smells: ${bad.length} fact(s) in ${SPEC} disagree with the run:`)
    for (const b of bad) console.error('  ' + b)
    process.exit(3)
  }
  console.log(`synth-smells: every K_ fact in ${SPEC} matches the logs, and its tests hold of them (negative control: ${neg} assert(s) fail as they should)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
