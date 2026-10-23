#!/usr/bin/env node
// lut-treemap.mjs -- the built-in sample of the lut-treemap widget (public/widgets/lut-treemap/).
//
// The widget reads yosys `stat -json` of a design that was not flattened, multiplies each module's
// cells by its instance count and draws a treemap. This script makes the sample the page opens with
// and checks the spec's facts against it. Nothing is typed in:
//
//   1. what to run is read from specs/widgets/lut-treemap.t27 (K_SAMPLE_*_COMMIT, K_SAMPLE_*_FILES,
//      K_SAMPLE_READ_ORDER, K_SAMPLE_TOP) through the vendored compiler public/t27/t27_compiler.wasm
//      (the native t27c is not run on this machine: Railway-only rule);
//   2. the four Verilog files are read out of git at the pinned commits (`git show <sha>:<path>`):
//      two from this trinity checkout, two from a gHashTag/t27 checkout (env T27_REPO, default ~/t27),
//      and written to a scratch directory; yosys runs there twice, under nice -n 10:
//        yosys -q -p "read_verilog <files>; synth_xilinx -top <top>; tee -q -o stat.json stat -json"
//        yosys -q -p "read_verilog <files>; synth_xilinx -flatten -top <top>; tee -q -o flat.stat.json stat -json"
//   3. both outputs are shipped byte for byte (K_SAMPLE_STAT, K_SAMPLE_FLAT_STAT); sample.json holds
//      both commands, the `yosys -V` line, exit codes, seconds, warnings, every input's sha256 and the
//      per-module rows treemap.js computed (the card is drawn from them);
//   4. the parser fixture scripts/widget-data/lut-treemap-paramod.v is synthesised too, its stat kept
//      as lut-treemap-paramod.stat.json, and treemap.js must read its $paramod names and its
//      two-path instance count and land on yosys's own design total;
//   5. every K_SAMPLE_ fact is re-read from the shipped stat files by treemap.js (the code the page
//      runs), the spec's own tests run on those values, and a negative control (one instance count
//      and the flattened total set wrong) must fail them.
//
// Run (from apps/website):
//   node scripts/widget-data/lut-treemap.mjs              synthesise, write, check
//   node scripts/widget-data/lut-treemap.mjs --check      only re-check the spec against the shipped files
//   node scripts/widget-data/lut-treemap.mjs --spec-lines print the spec's K_SAMPLE_ lines from the shipped files
// Env: YOSYS overrides /opt/homebrew/bin/yosys; T27_REPO overrides ~/t27.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { constsOf, loadCompiler, sha256 } from '../agents-from-specs.mjs'
import { runSpecTests } from '../viewport-from-spec.mjs'
import { leavesOf, listsOf, METRICS, moduleRows, parseHier, sameTotals, totalsOf, viewTree } from './lut-treemap-treemap.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const REPO = join(SITE, '..', '..')
const T27_REPO = process.env.T27_REPO || join(homedir(), 't27')
const WASM = 'public/t27/t27_compiler.wasm'
const SPEC = 'specs/widgets/lut-treemap.t27'
const OUT_DIR = 'public/widgets/lut-treemap'
const FIXTURE_V = 'scripts/widget-data/lut-treemap-paramod.v'
const FIXTURE_STAT = 'scripts/widget-data/lut-treemap-paramod.stat.json'
const FIXTURE_TOP = 'pmtop'
const WORK = '/tmp/widget-lut-treemap/run'
const YOSYS = process.env.YOSYS || (existsSync('/opt/homebrew/bin/yosys') ? '/opt/homebrew/bin/yosys' : 'yosys')

const fail = (m) => { console.error(`lut-treemap: ${m}`); process.exit(1) }
const firstLine = (s) => String(s).split('\n').map((l) => l.trim()).find(Boolean) ?? ''
const tilde = (s) => s.replaceAll(homedir(), '~')

async function readSpec() {
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const text = readFileSync(join(SITE, SPEC), 'utf8')
  const analysis = analyze(text)
  const K = Object.fromEntries(Object.entries(constsOf(analysis)).map(([k, v]) => [k, v.value]))
  const need = ['K_SAMPLE_JSON', 'K_SAMPLE_STAT', 'K_SAMPLE_FLAT_STAT', 'K_SAMPLE_TRINITY_COMMIT', 'K_SAMPLE_TRINITY_FILES', 'K_SAMPLE_T27_COMMIT',
    'K_SAMPLE_T27_FILES', 'K_SAMPLE_READ_ORDER', 'K_SAMPLE_TOP', 'K_LUT_TYPES', 'K_FF_TYPES', 'K_DSP_TYPES', 'K_BRAM_TYPES', 'K_EXPAND_MAX', 'K_MAX_TILES']
  for (const k of need) if (!(k in K)) fail(`${SPEC} has no ${k}`)
  return { text, K, analysis }
}

const readOut = (K, key) => {
  const p = join(SITE, OUT_DIR, K[key])
  if (!existsSync(p)) fail(`${OUT_DIR}/${K[key]} does not exist; run without --check first`)
  return readFileSync(p, 'utf8')
}

/** Every K_SAMPLE_ fact, computed from the shipped yosys output by treemap.js (not from sample.json). */
export function factsOf(K) {
  const lists = listsOf(K)
  const r = parseHier(readOut(K, 'K_SAMPLE_STAT'), lists)
  if (!r.ok) fail(`${K.K_SAMPLE_STAT} does not parse: ${r.error}`)
  if (r.flat) fail(`${K.K_SAMPLE_STAT} is flat; the sample must keep its hierarchy`)
  const f = parseHier(readOut(K, 'K_SAMPLE_FLAT_STAT'), lists)
  if (!f.ok) fail(`${K.K_SAMPLE_FLAT_STAT} does not parse: ${f.error}`)
  if (!f.flat) fail(`${K.K_SAMPLE_FLAT_STAT} still has submodules`)
  const rows = moduleRows(r)
  const byName = Object.fromEntries(rows.map((x) => [x.name, x]))
  const top = totalsOf(r, r.top)
  const flat = totalsOf(f, f.top)
  const edges = r.order.flatMap((p) => r.modules[p].subs.map((s) => ({ parent: p, child: s.name, count: s.count })))
  const opt = { expandMax: K.K_EXPAND_MAX, maxTiles: K.K_MAX_TILES }
  // The leaf-sum check, for every metric, on the tree the page draws: hard, not a spec fact.
  const tiles = {}
  for (const m of METRICS) {
    const tree = viewTree(r, m, opt)
    const leaves = leavesOf(tree)
    const sum = leaves.reduce((a, b) => a + b.value, 0)
    const rowSum = rows.reduce((a, b) => a + b.total[m], 0)
    if (sum !== top[m] || rowSum !== top[m] || tree.value !== top[m]) fail(`${m}: tiles add to ${sum}, rows to ${rowSum}, the top's total is ${top[m]}`)
    tiles[m] = top[m] ? leaves.length : 0
  }
  return {
    r, f, rows, edges, top, flat, tiles,
    facts: {
      K_SAMPLE_TOP: r.top, K_SAMPLE_YOSYS: r.version,
      K_SAMPLE_MODULES: r.order, K_SAMPLE_INST: r.order.map((n) => byName[n]?.instances ?? 0),
      K_SAMPLE_EACH_LUT: r.order.map((n) => r.modules[n].own.lut),
      K_SAMPLE_EACH_FF: r.order.map((n) => r.modules[n].own.ff),
      K_SAMPLE_EACH_DSP: r.order.map((n) => r.modules[n].own.dsp),
      K_SAMPLE_EDGE_PARENT: edges.map((e) => e.parent), K_SAMPLE_EDGE_CHILD: edges.map((e) => e.child), K_SAMPLE_EDGE_COUNT: edges.map((e) => e.count),
      K_SAMPLE_TOTAL_LUT: top.lut, K_SAMPLE_TOTAL_FF: top.ff, K_SAMPLE_TOTAL_DSP: top.dsp,
      K_SAMPLE_DESIGN_LUT: r.design?.lut ?? null, K_SAMPLE_DESIGN_FF: r.design?.ff ?? null, K_SAMPLE_DESIGN_DSP: r.design?.dsp ?? null,
      K_SAMPLE_FLAT_LUT: flat.lut, K_SAMPLE_FLAT_FF: flat.ff, K_SAMPLE_FLAT_DSP: flat.dsp,
      K_SAMPLE_LUT_TILES: tiles.lut,
    },
  }
}

/** The $paramod fixture: names decoded, the two-path count added, yosys's design total reached. */
function checkFixture(K) {
  const p = join(SITE, FIXTURE_STAT)
  if (!existsSync(p)) fail(`${FIXTURE_STAT} does not exist; run without --check first`)
  const r = parseHier(readFileSync(p, 'utf8'), listsOf(K))
  const bad = []
  if (!r.ok) return [`${FIXTURE_STAT} does not parse: ${r.error}`]
  if (r.top !== FIXTURE_TOP) bad.push(`fixture top is ${r.top}, not ${FIXTURE_TOP}`)
  const rows = moduleRows(r)
  const by = Object.fromEntries(rows.map((x) => [x.display, x]))
  if (!by['leaf W=4'] || !by['leaf W=8']) bad.push(`fixture names read as ${rows.map((x) => x.display).join(', ')}`)
  else {
    if (by['leaf W=4'].instances !== 4) bad.push(`leaf W=4 counted ${by['leaf W=4'].instances} times, not 4 (2 per mid, 2 mids)`)
    if (by['leaf W=8'].instances !== 1) bad.push(`leaf W=8 counted ${by['leaf W=8'].instances} times, not 1`)
  }
  if (!r.design || !sameTotals(totalsOf(r, r.top), r.design)) bad.push(`fixture total ${JSON.stringify(totalsOf(r, r.top))} is not yosys's design total ${JSON.stringify(r.design)}`)
  return bad
}

const specLine = (k, v) => typeof v === 'string' ? `pub const ${k} : str = ${JSON.stringify(v)};`
  : Array.isArray(v) ? `pub const ${k} : [${v.length}]${typeof v[0] === 'string' ? 'str' : 'u16'} = [${v.map((x) => JSON.stringify(x)).join(', ')}];`
    : `pub const ${k} : u16 = ${v};`

function checkSpec(K, analysis, sampleJson) {
  const { facts, top } = factsOf(K)
  const bad = []
  for (const [k, v] of Object.entries(facts)) {
    if (v === null || v === undefined) { bad.push(`${k}: the sample has no value for it`); continue }
    if (!(k in K)) bad.push(`${k}: missing from the spec; it should read  ${specLine(k, v)}`)
    else if (JSON.stringify(K[k]) !== JSON.stringify(v)) bad.push(`${k}: spec says ${JSON.stringify(K[k])}, the sample says ${JSON.stringify(v)}`)
  }
  const tests = runSpecTests(analysis, { ...K, ...facts })
  for (const f of tests.failures) bad.push(`spec test on the sample: ${f}`)
  if (tests.asserts === 0) bad.push('the spec has no asserts to run against the sample')
  bad.push(...checkFixture(K))
  if (sampleJson) {
    if (JSON.stringify(sampleJson.total) !== JSON.stringify(top)) bad.push(`${K.K_SAMPLE_JSON} total differs from ${K.K_SAMPLE_STAT}`)
    for (const [run, key] of [['hier', 'K_SAMPLE_STAT'], ['flat', 'K_SAMPLE_FLAT_STAT']]) {
      if (sampleJson.runs?.[run]?.output?.sha256 !== sha256(readFileSync(join(SITE, OUT_DIR, K[key])))) bad.push(`${K.K_SAMPLE_JSON} names a different ${K[key]} (sha256)`)
    }
  }
  return { bad, tests }
}

/** A negative control: the spec's tests must fail when a count is wrong, or they test nothing. */
function negativeControl(K, analysis) {
  const inst = [...K.K_SAMPLE_INST]
  inst[0] += 1
  const broken = { ...K, K_SAMPLE_INST: inst, K_SAMPLE_FLAT_LUT: K.K_SAMPLE_TOTAL_LUT }
  const t = runSpecTests(analysis, broken)
  if (t.failures.length === 0) fail('negative control: the spec tests still hold with an instance count and the flattened total set wrong')
  return t.failures.length
}

function yosys(cwd, script, out) {
  const t0 = process.hrtime.bigint()
  const r = spawnSync('nice', ['-n', '10', YOSYS, '-q', '-p', script], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const seconds = Math.round(Number(process.hrtime.bigint() - t0) / 1e6) / 1000
  if (r.status !== 0) fail(`yosys exited ${r.status}:\n${r.stderr || r.stdout}`)
  const bytes = readFileSync(join(cwd, out))
  const warnings = (r.stderr + r.stdout).split('\n').filter((l) => /warning/i.test(l)).length
  return { command: `nice -n 10 yosys -q -p "${script}"`, exit: r.status, seconds, warnings, bytes }
}

async function main() {
  const { text, K, analysis } = await readSpec()
  const jsonPath = join(SITE, OUT_DIR, K.K_SAMPLE_JSON)
  if (process.argv.includes('--spec-lines')) { for (const [k, v] of Object.entries(factsOf(K).facts)) console.log(specLine(k, v)); return }
  if (process.argv.includes('--check')) {
    if (!existsSync(jsonPath)) fail(`${OUT_DIR}/${K.K_SAMPLE_JSON} does not exist; run without --check first`)
    const { bad, tests } = checkSpec(K, analysis, JSON.parse(readFileSync(jsonPath, 'utf8')))
    const neg = negativeControl(K, analysis)
    if (bad.length) { console.error(`lut-treemap --check: ${bad.length} problem(s)`); for (const b of bad) console.error('  ' + b); process.exit(3) }
    console.log(`lut-treemap --check: every K_SAMPLE_ fact in ${SPEC} matches ${OUT_DIR}/${K.K_SAMPLE_STAT} and ${K.K_SAMPLE_FLAT_STAT}; the tiles add up to the top for every metric; ${tests.tests} tests, ${tests.asserts} asserts hold of it; the $paramod fixture reads right; negative control fails ${neg} assert(s) as it should`)
    return
  }

  rmSync(WORK, { recursive: true, force: true })
  mkdirSync(join(WORK, 'pm'), { recursive: true })
  const sources = [
    ...K.K_SAMPLE_TRINITY_FILES.map((path) => ({ repo: 'gHashTag/trinity', dir: REPO, commit: K.K_SAMPLE_TRINITY_COMMIT, path })),
    ...K.K_SAMPLE_T27_FILES.map((path) => ({ repo: 'gHashTag/t27', dir: T27_REPO, commit: K.K_SAMPLE_T27_COMMIT, path })),
  ]
  const inputs = sources.map((s) => {
    let bytes
    try { bytes = execFileSync('git', ['-C', s.dir, 'show', `${s.commit}:${s.path}`], { maxBuffer: 16 * 1024 * 1024 }) } catch { fail(`git show ${s.commit}:${s.path} failed in ${tilde(s.dir)} (${s.repo}); set T27_REPO for the t27 checkout`) }
    writeFileSync(join(WORK, basename(s.path)), bytes)
    return { repo: s.repo, commit: s.commit, path: s.path, sha256: sha256(bytes), bytes: bytes.length }
  })
  for (const f of K.K_SAMPLE_READ_ORDER) if (!inputs.some((i) => basename(i.path) === f)) fail(`K_SAMPLE_READ_ORDER names ${f}, which no input is`)
  const yosysVersion = firstLine(execFileSync(YOSYS, ['-V'], { encoding: 'utf8' }))
  const read = `read_verilog ${K.K_SAMPLE_READ_ORDER.join(' ')}`
  const hier = yosys(WORK, `${read}; synth_xilinx -top ${K.K_SAMPLE_TOP}; tee -q -o stat.json stat -json`, 'stat.json')
  const flat = yosys(WORK, `${read}; synth_xilinx -flatten -top ${K.K_SAMPLE_TOP}; tee -q -o flat.stat.json stat -json`, 'flat.stat.json')
  writeFileSync(join(SITE, OUT_DIR, K.K_SAMPLE_STAT), hier.bytes)
  writeFileSync(join(SITE, OUT_DIR, K.K_SAMPLE_FLAT_STAT), flat.bytes)
  writeFileSync(join(WORK, 'pm', basename(FIXTURE_V)), readFileSync(join(SITE, FIXTURE_V)))
  const pm = yosys(join(WORK, 'pm'), `read_verilog ${basename(FIXTURE_V)}; synth_xilinx -top ${FIXTURE_TOP}; tee -q -o stat.json stat -json`, 'stat.json')
  writeFileSync(join(SITE, FIXTURE_STAT), pm.bytes)

  const { r, rows, edges, top, flat: flatTotal, tiles } = factsOf(K)
  const runOf = (x, path) => ({ command: x.command, exit: x.exit, seconds: x.seconds, warnings: x.warnings, output: { path, sha256: sha256(x.bytes), bytes: x.bytes.length } })
  const data = {
    generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    spec: { path: `apps/website/${SPEC}`, sha256: sha256(Buffer.from(text, 'utf8')) },
    tools: { yosys: yosysVersion, node: process.version },
    inputs,
    cwd: 'a scratch directory holding the four inputs side by side',
    runs: {
      hier: runOf(hier, `${OUT_DIR.replace(/^public\//, '')}/${K.K_SAMPLE_STAT}`),
      flat: runOf(flat, `${OUT_DIR.replace(/^public\//, '')}/${K.K_SAMPLE_FLAT_STAT}`),
      paramod_fixture: runOf(pm, FIXTURE_STAT),
    },
    top: r.top, version: r.version, key: r.key,
    modules: rows.map((x) => ({ name: x.name, display: x.display, instances: x.instances, each: x.each, total: x.total })),
    edges,
    total: top, design: r.design, flat: flatTotal, tiles,
    note: 'yosys stat after synth_xilinx: synthesis cell counts, not post-place-and-route utilisation; the per-module split is of the hierarchical run',
  }
  writeFileSync(jsonPath, tilde(JSON.stringify(data, null, 1)) + '\n')
  console.log(`lut-treemap: ${yosysVersion}`)
  console.log(`lut-treemap: hierarchical exit ${hier.exit} in ${hier.seconds}s (${hier.warnings} warning lines): ${JSON.stringify(top)}`)
  console.log(`lut-treemap: flattened    exit ${flat.exit} in ${flat.seconds}s (${flat.warnings} warning lines): ${JSON.stringify(flatTotal)}`)
  console.log(`lut-treemap: paramod fixture exit ${pm.exit} in ${pm.seconds}s`)
  for (const x of rows) console.log(`  ${x.display.padEnd(20)} x${String(x.instances).padStart(3)}  each ${JSON.stringify(x.each)}  total LUT ${x.total.lut} FF ${x.total.ff} DSP ${x.total.dsp}`)
  console.log(`lut-treemap: wrote ${OUT_DIR}/${K.K_SAMPLE_STAT}, ${K.K_SAMPLE_FLAT_STAT}, ${K.K_SAMPLE_JSON} and ${FIXTURE_STAT}`)

  const { bad } = checkSpec(K, analysis, data)
  const neg = negativeControl(K, analysis)
  if (bad.length) {
    console.error(`lut-treemap: ${bad.length} fact(s) in ${SPEC} disagree with the run:`)
    for (const b of bad) console.error('  ' + b)
    process.exit(3)
  }
  console.log(`lut-treemap: every K_SAMPLE_ fact in ${SPEC} matches the run, and its tests hold of it (negative control: ${neg} assert(s) fail as they should)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
