#!/usr/bin/env node
// gatle.mjs -- the puzzle pool of the gatle widget (public/widgets/gatle/).
//
// Gatle asks the reader to guess how many LUTs yosys spends on a real t27 module. Every answer in
// the pool is a run of this script; nothing is typed in:
//
//   1. the selection rule is read from specs/widgets/gatle.t27 through the vendored compiler
//      (K_SYNTH, K_MIN_LUTS, K_MAX_LUTS, K_MAX_CODE_LINES, K_MAX_CODE_COLS), so the spec says
//      what is measured and what is kept;
//   2. every .t27 under public/t27/files/specs is compiled to Verilog by
//      public/t27/t27_compiler.wasm, the same file the page runs in the reader's browser (the
//      native t27c is not run on this machine: Railway-only rule);
//   3. a module is a candidate when the Verilog target generated, the module has data ports (the
//      emitter writes "NO DATA PORTS" otherwise) and its Verilog is not a copy of an earlier one;
//   4. every candidate is synthesised by yosys twice, `synth_xilinx -family xc7 -flatten` with DSPs
//      allowed and with `-nodsp`, in its own work dir under /tmp/widget-gatle; `stat -json` is
//      parsed. The answer is the run K_SYNTH names; the other run is kept beside it;
//   5. a module is kept when yosys accepts it, its code (lines neither blank nor comment-only) fits
//      a phone screen (K_MAX_CODE_LINES by K_MAX_CODE_COLS) and its LUT count is in
//      [K_MIN_LUTS, K_MAX_LUTS];
//      every other file is written down in `rejects` with its reason, never silently skipped;
//   6. the pool is ordered by the sha256 of each spec path (a fixed shuffle nobody chose) and
//      written to public/widgets/gatle/pool.json with the yosys version, the commands and the date;
//   7. the spec is then re-checked against the data: K_POOL_SIZE and K_POOL_IDS must equal the
//      pool, and the page's own rule module (scripts/widget-data/gatle-rule.js) must give the spec's
//      fixed answers for the daily index and the 10% rule. Any disagreement exits non-zero.
//
// Run (from apps/website):
//   node scripts/widget-data/gatle.mjs               synthesise, write pool.json, check the spec
//   node scripts/widget-data/gatle.mjs --check       only re-check the spec against pool.json
//   node scripts/widget-data/gatle.mjs --refilter    re-apply a tightened phone-screen rule, no yosys
//   node scripts/widget-data/gatle.mjs --spec-lines  print the spec's pool lines from pool.json
// Env: YOSYS and JOBS override the defaults below.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { constsOf, loadCompiler, sha256 } from '../agents-from-specs.mjs'
import { runSpecTests } from '../viewport-from-spec.mjs'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const WASM = 'public/t27/t27_compiler.wasm'
const SPEC = 'specs/widgets/gatle.t27'
const CORPUS = 'public/t27/files/specs'
const OUT_DIR = 'public/widgets/gatle'
const OUT_JSON = `${OUT_DIR}/pool.json`
const RULE = 'scripts/widget-data/gatle-rule.js'
const WORK = '/tmp/widget-gatle/synth'
const MAX_BYTES = 1024 * 1024
const YOSYS = process.env.YOSYS || (existsSync('/opt/homebrew/bin/yosys') ? '/opt/homebrew/bin/yosys' : 'yosys')
const JOBS = Number(process.env.JOBS) || 3
const TIMEOUT_S = 600
const SYNTH_BASE = 'synth_xilinx -family xc7 -flatten'

const fail = (m) => { console.error(`gatle: ${m}`); process.exit(1) }
const firstLine = (s) => String(s).split('\n').map((l) => l.trim()).find(Boolean) ?? ''

// --- the spec ------------------------------------------------------------------------------
function readSpec(analyze) {
  const text = readFileSync(join(SITE, SPEC), 'utf8')
  const analysis = analyze(text)
  const consts = constsOf(analysis)
  const f = Object.fromEntries(Object.entries(consts).map(([k, v]) => [k, v.value]))
  return { text, analysis, consts, f }
}

// --- the corpus ----------------------------------------------------------------------------
const isCommentOnly = (line) => /^\s*(;|\/\/)/.test(line)
export function codeLinesOf(src) {
  return src.split('\n').filter((l) => l.trim() && !isCommentOnly(l))
}

function corpusFiles() {
  const out = []
  const walk = (rel) => {
    for (const name of readdirSync(join(SITE, CORPUS, rel)).sort()) {
      const r = rel ? `${rel}/${name}` : name
      if (statSync(join(SITE, CORPUS, r)).isDirectory()) walk(r)
      else if (name.endsWith('.t27')) out.push(r)
    }
  }
  walk('')
  return out.sort()
}

/** Every corpus file, compiled, sorted into candidates and pre-synthesis rejects. */
function survey(analyze, f) {
  const candidates = []
  const rejects = []
  const seen = new Map()
  for (const rel of corpusFiles()) {
    const path = `specs/${rel}`
    const src = readFileSync(join(SITE, CORPUS, rel), 'utf8')
    let v
    try { v = analyze(src).targets?.verilog } catch (e) { rejects.push({ path, reason: 'compiler-threw', detail: String(e.message ?? e).slice(0, 200) }); continue }
    if (!v?.ok || !v.code) { rejects.push({ path, reason: 'no-verilog' }); continue }
    if (/NO DATA PORTS/.test(v.code)) { rejects.push({ path, reason: 'no-data-ports' }); continue }
    const top = /^module (\w+)/m.exec(v.code)?.[1]
    if (!top) { rejects.push({ path, reason: 'no-module' }); continue }
    // Two specs whose Verilog differs only in the module name are one puzzle, kept once.
    const norm = v.code.replace(/Generated from t27 spec: .*/, '').replaceAll(top, 'TOP')
    const h = sha256(Buffer.from(norm, 'utf8'))
    if (seen.has(h)) { rejects.push({ path, reason: 'duplicate-verilog', detail: seen.get(h) }); continue }
    seen.set(h, path)
    const code = codeLinesOf(src)
    const cols = Math.max(...code.map((l) => l.length))
    candidates.push({ path, src, verilog: v.code, top, code_lines: code.length, code_cols: cols, lines: src.split('\n').length })
  }
  return { candidates, rejects }
}

// --- yosys ---------------------------------------------------------------------------------
const CELL_KEYS = { lut: /^LUT[1-6]$/, ff: /^FD/, latch: /^LD/, carry4: /^CARRY4$/, muxf7: /^MUXF7$/, muxf8: /^MUXF8$/, dsp: /^DSP48E1$/, bram: /^RAMB/, lutram: /^RAM(32|64|128|256)/, srl: /^SRL/ }
export function metricsOf(cells) {
  const m = Object.fromEntries(Object.keys(CELL_KEYS).map((k) => [k, 0]))
  for (const [type, n] of Object.entries(cells)) for (const [k, re] of Object.entries(CELL_KEYS)) if (re.test(type)) m[k] += n
  return m
}

function synth(job) {
  const dir = join(WORK, job.slug)
  const stat = `${job.mode}.stat.json`
  const script = `read_verilog -sv ${job.slug}.v; ${job.synth} -top ${job.top}; tee -q -o ${stat} stat -json`
  const args = ['-q', '-l', `${job.mode}.log`, '-p', script]
  return new Promise((resolve) => {
    const t0 = process.hrtime.bigint()
    const p = spawn(YOSYS, args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; p.kill('SIGKILL') }, TIMEOUT_S * 1000)
    p.stdout.on('data', (d) => { out += d })
    p.stderr.on('data', (d) => { out += d })
    p.on('close', (code) => {
      clearTimeout(timer)
      const seconds = Math.round(Number(process.hrtime.bigint() - t0) / 1e6) / 1000
      const command = `yosys -q -l ${job.mode}.log -p "${script}"`
      if (timedOut) return resolve({ status: 'timeout', seconds, command, error: `killed after ${TIMEOUT_S} s` })
      if (code !== 0 || !existsSync(join(dir, stat))) {
        const why = out.split('\n').map((l) => l.trim()).filter((l) => /error/i.test(l)).slice(0, 3).join(' / ') || firstLine(out) || `exit ${code}`
        return resolve({ status: 'yosys-error', seconds, command, error: why.slice(0, 300) })
      }
      const d = JSON.parse(readFileSync(join(dir, stat), 'utf8'))
      const cells = d.design?.num_cells_by_type ?? {}
      resolve({ status: 'ok', seconds, command, cells, metrics: metricsOf(cells), num_cells: d.design?.num_cells ?? 0 })
    })
  })
}

async function runAll(jobs) {
  const out = new Array(jobs.length)
  let next = 0
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++
      out[i] = await synth(jobs[i])
      const m = out[i].metrics
      process.stdout.write(`  ${jobs[i].slug.padEnd(52)} ${jobs[i].mode.padEnd(5)} ${out[i].status.padEnd(11)} ${m ? `LUT ${m.lut} FF ${m.ff}` : ''} ${out[i].seconds}s\n`)
    }
  }
  await Promise.all(Array.from({ length: JOBS }, worker))
  return out
}

// --- the pool ------------------------------------------------------------------------------
/** The puzzle id a spec path gets: its path under specs/ without the extension. */
export const idOf = (path) => path.replace(/^specs\//, '').replace(/\.t27$/, '')

/** The answer run is the one K_SYNTH names; the other mode is kept beside it. */
const modeOf = (synthLine) => (/\s-nodsp\b/.test(synthLine) ? 'nodsp' : 'dsp')

async function build(analyze, spec) {
  const f = spec.f
  if (!f.K_SYNTH?.startsWith(SYNTH_BASE)) fail(`${SPEC}: K_SYNTH must start with "${SYNTH_BASE}", is "${f.K_SYNTH}"`)
  const answerMode = modeOf(f.K_SYNTH)
  const wasm = readFileSync(join(SITE, WASM))
  const { candidates, rejects } = survey(analyze, f)
  console.log(`gatle: ${candidates.length} candidate module(s) of ${candidates.length + rejects.length} specs; ${JOBS} yosys at a time in ${WORK}`)

  rmSync(WORK, { recursive: true, force: true })
  const jobs = []
  for (const c of candidates) {
    c.slug = idOf(c.path).replaceAll('/', '__')
    mkdirSync(join(WORK, c.slug), { recursive: true })
    writeFileSync(join(WORK, c.slug, `${c.slug}.v`), c.verilog)
    jobs.push({ slug: c.slug, top: c.top, mode: 'dsp', synth: SYNTH_BASE })
    jobs.push({ slug: c.slug, top: c.top, mode: 'nodsp', synth: `${SYNTH_BASE} -nodsp` })
  }
  const t0 = Date.now()
  const results = await runAll(jobs)
  const wall = Math.round((Date.now() - t0) / 1000)
  const bySlug = {}
  jobs.forEach((j, i) => { (bySlug[j.slug] ??= {})[j.mode] = results[i] })

  const kept = []
  let dspDiffers = 0
  for (const c of candidates) {
    const runs = bySlug[c.slug]
    const a = runs[answerMode]
    if (a.status !== 'ok') { rejects.push({ path: c.path, reason: a.status, detail: a.error }); continue }
    const other = runs[answerMode === 'dsp' ? 'nodsp' : 'dsp']
    if (other.status === 'ok' && (other.metrics.lut !== a.metrics.lut || other.metrics.dsp !== a.metrics.dsp)) dspDiffers++
    const lut = a.metrics.lut
    // The phone-screen rule is applied after synthesis, so a long module's reject still says what it cost.
    if (c.code_lines > f.K_MAX_CODE_LINES) { rejects.push({ path: c.path, reason: 'too-long', detail: `${c.code_lines} code lines; ${lut} LUTs` }); continue }
    if (c.code_cols > f.K_MAX_CODE_COLS) { rejects.push({ path: c.path, reason: 'too-wide', detail: `${c.code_cols} columns; ${lut} LUTs` }); continue }
    if (lut < f.K_MIN_LUTS) { rejects.push({ path: c.path, reason: 'trivial', detail: `${lut} LUTs` }); continue }
    if (lut > f.K_MAX_LUTS) { rejects.push({ path: c.path, reason: 'too-big', detail: `${lut} LUTs` }); continue }
    kept.push({
      id: idOf(c.path),
      path: c.path,
      src: `t27/files/${c.path}`,
      top: c.top,
      spec_sha256: sha256(Buffer.from(c.src, 'utf8')),
      verilog_sha256: sha256(Buffer.from(c.verilog, 'utf8')),
      lines: c.lines,
      code_lines: c.code_lines,
      code_cols: c.code_cols,
      answer: { ...a.metrics, cells: a.num_cells, by_type: a.cells, seconds: a.seconds },
      other: other.status === 'ok' ? { mode: answerMode === 'dsp' ? 'nodsp' : 'dsp', lut: other.metrics.lut, ff: other.metrics.ff, dsp: other.metrics.dsp, carry4: other.metrics.carry4 } : { mode: answerMode === 'dsp' ? 'nodsp' : 'dsp', status: other.status },
    })
  }
  // A fixed shuffle nobody chose: the order of the sha256 of each spec path.
  kept.sort((x, y) => (sha256(Buffer.from(x.path)) < sha256(Buffer.from(y.path)) ? -1 : 1))
  rejects.sort((x, y) => (x.reason === y.reason ? (x.path < y.path ? -1 : 1) : x.reason < y.reason ? -1 : 1))

  const reasons = {}
  for (const r of rejects) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1
  const now = new Date()
  const data = {
    generated_utc: now.toISOString().replace(/\.\d+Z$/, 'Z'),
    date_utc: now.toISOString().slice(0, 10),
    spec: { path: `apps/website/${SPEC}`, sha256: sha256(Buffer.from(spec.text, 'utf8')) },
    compiler: { path: WASM.replace(/^public\//, ''), sha256: sha256(wasm), target: 'verilog' },
    corpus: { path: CORPUS.replace(/^public\//, ''), specs: candidates.length + rejects.length - 0, candidates: candidates.length },
    yosys: { version: firstLine(execFileSync(YOSYS, ['-V'], { encoding: 'utf8' })), answer: f.K_SYNTH, also_run: answerMode === 'dsp' ? `${SYNTH_BASE} -nodsp` : SYNTH_BASE, dsp_mode_differs: dspDiffers },
    commands: [
      'node scripts/widget-data/gatle.mjs   # wasm gen-verilog of every corpus spec, then per candidate in /tmp/widget-gatle/synth/<slug>/:',
      `yosys -q -l dsp.log -p "read_verilog -sv <slug>.v; ${SYNTH_BASE} -top <top>; tee -q -o dsp.stat.json stat -json"`,
      `yosys -q -l nodsp.log -p "read_verilog -sv <slug>.v; ${SYNTH_BASE} -nodsp -top <top>; tee -q -o nodsp.stat.json stat -json"`,
    ],
    rule: { min_luts: f.K_MIN_LUTS, max_luts: f.K_MAX_LUTS, max_code_lines: f.K_MAX_CODE_LINES, max_code_cols: f.K_MAX_CODE_COLS, lut: 'LUT1..LUT6', ff: 'FD*' },
    wall_seconds: wall,
    pool: kept,
    reject_counts: reasons,
    rejects,
  }
  data.corpus.specs = kept.length + rejects.length
  if (kept.length) data.sample = await sampleGame(data, f)
  const outPath = join(SITE, OUT_JSON)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(data, null, 1) + '\n')
  if (statSync(outPath).size > MAX_BYTES) fail(`${OUT_JSON} is over ${MAX_BYTES} bytes`)
  console.log(`gatle: kept ${kept.length}; rejected ${rejects.length} (${Object.entries(reasons).map(([k, n]) => `${k} ${n}`).join(', ')}); dsp vs nodsp LUTs differ on ${dspDiffers}; ${wall}s wall; wrote ${OUT_JSON} (${statSync(outPath).size} bytes)`)
  return data
}

/**
 * The card's sample game, played on puzzle #1 (the epoch day) by a rule, not by hand: every guess
 * is the geometric middle of the range the feedback still allows, starting from
 * [K_MIN_LUTS, K_MAX_LUTS], graded by the page's own rule.js. The card draws exactly this.
 */
export async function sampleGame(data, f) {
  const rule = await import(pathToFileURL(join(SITE, RULE)).href)
  const p = data.pool[rule.dayIndex(f.K_EPOCH_DAY, f.K_EPOCH_DAY, data.pool.length)]
  let lo = f.K_MIN_LUTS
  let hi = f.K_MAX_LUTS
  const rows = []
  while (rows.length < f.K_GUESSES) {
    const guess = Math.round(Math.sqrt(lo * hi))
    const g = rule.grade(guess, p.answer.lut, f.K_CLOSE_PCT, f.K_WARM_PCT)
    rows.push({ guess, ...g })
    if (g.dir === 'hit') break
    if (g.dir === 'up') lo = guess + 1
    else hi = guess - 1
  }
  return { puzzle: rule.puzzleNumber(f.K_EPOCH_DAY, f.K_EPOCH_DAY), date: f.K_EPOCH_DATE, id: p.id, top: p.top, lut: p.answer.lut, ff: p.answer.ff, cells: p.answer.cells, dsp: p.answer.dsp, carry4: p.answer.carry4, rows }
}

/**
 * --refilter: apply the spec's phone-screen rule (K_MAX_CODE_LINES, K_MAX_CODE_COLS) again to
 * the pool.json of an earlier full run, without running yosys again. Only puzzles move to the
 * rejects; no number is changed. Refused when anything that decided the numbers differs: the
 * answer mode, the LUT range, the compiler, or any kept spec's sha256.
 */
async function refilter(spec) {
  const f = spec.f
  const data = JSON.parse(readFileSync(join(SITE, OUT_JSON), 'utf8'))
  const wasmSha = sha256(readFileSync(join(SITE, WASM)))
  if (data.yosys.answer !== f.K_SYNTH) fail(`--refilter: pool.json answers come from "${data.yosys.answer}", K_SYNTH is "${f.K_SYNTH}"; run without --refilter`)
  if (data.rule.min_luts !== f.K_MIN_LUTS || data.rule.max_luts !== f.K_MAX_LUTS) fail('--refilter: the LUT range changed; run without --refilter')
  if (data.compiler.sha256 !== wasmSha) fail('--refilter: the compiler changed; run without --refilter')
  if (f.K_MAX_CODE_LINES > data.rule.max_code_lines || f.K_MAX_CODE_COLS > data.rule.max_code_cols) fail('--refilter can only tighten the phone-screen rule; run without --refilter')
  const kept = []
  for (const p of data.pool) {
    const src = readFileSync(join(SITE, 'public', p.src), 'utf8')
    if (sha256(Buffer.from(src, 'utf8')) !== p.spec_sha256) fail(`--refilter: ${p.path} changed since the pool was built; run without --refilter`)
    const code = codeLinesOf(src)
    const cols = Math.max(...code.map((l) => l.length))
    if (code.length > f.K_MAX_CODE_LINES) { data.rejects.push({ path: p.path, reason: 'too-long', detail: `${code.length} code lines; ${p.answer.lut} LUTs` }); continue }
    if (cols > f.K_MAX_CODE_COLS) { data.rejects.push({ path: p.path, reason: 'too-wide', detail: `${cols} columns; ${p.answer.lut} LUTs` }); continue }
    kept.push({ ...p, code_cols: cols })
  }
  data.rejects.sort((x, y) => (x.reason === y.reason ? (x.path < y.path ? -1 : 1) : x.reason < y.reason ? -1 : 1))
  data.reject_counts = {}
  for (const r of data.rejects) data.reject_counts[r.reason] = (data.reject_counts[r.reason] ?? 0) + 1
  data.pool = kept
  data.commands.push(`node scripts/widget-data/gatle.mjs --refilter   # phone-screen rule tightened to ${f.K_MAX_CODE_LINES} code lines by ${f.K_MAX_CODE_COLS} columns; no yosys run`)
  data.refiltered_utc = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  data.spec.sha256 = sha256(Buffer.from(spec.text, 'utf8'))
  data.rule.max_code_lines = f.K_MAX_CODE_LINES
  data.rule.max_code_cols = f.K_MAX_CODE_COLS
  data.sample = await sampleGame(data, f)
  writeFileSync(join(SITE, OUT_JSON), JSON.stringify(data, null, 1) + '\n')
  console.log(`gatle: refiltered: kept ${kept.length}; rejected ${data.rejects.length} (${Object.entries(data.reject_counts).map(([k, n]) => `${k} ${n}`).join(', ')})`)
  return data
}

// --- the check -----------------------------------------------------------------------------
/** The spec's pool lines, from the data. */
export function specLines(data) {
  return [
    `pub const K_POOL_SIZE : u8 = ${data.pool.length};`,
    `pub const K_POOL_IDS : [${data.pool.length}]str = [${data.pool.map((p) => JSON.stringify(p.id)).join(', ')}];`,
  ].join('\n')
}

async function check(spec, data) {
  const problems = []
  const { f, consts } = spec
  const say = (m) => problems.push(m)
  const needed = ['K_SYNTH', 'K_OTHER_SYNTH', 'K_MIN_LUTS', 'K_MAX_LUTS', 'K_POOL_SIZE', 'K_POOL_IDS', 'K_EPOCH_DATE', 'K_EPOCH_DAY', 'K_TEST_DATES', 'K_TEST_DAYS', 'K_TEST_INDEX', 'K_TEST_NUMBER', 'K_GUESSES', 'K_CLOSE_PCT', 'K_WARM_PCT', 'K_RULE_TRUTH', 'K_RULE_GUESSES', 'K_RULE_HEAT', 'K_RULE_DIR', 'K_POOL_ZERO_FF', 'K_CANDIDATES', 'K_CORPUS_SPECS', 'DATA_SOURCES']
  const absent = needed.filter((k) => !(k in f))
  if (absent.length) return [`${SPEC} lacks ${absent.join(', ')}`]
  // The spec's own test blocks, evaluated the way the page generator does.
  const t = runSpecTests(spec.analysis, f)
  for (const m of t.failures) say(`spec test ${m}`)
  // The pool size constant equals the data, three ways: the constant, the declared array length
  // and the array itself, against pool.json.
  const n = data.pool.length
  if (f.K_POOL_SIZE !== n) say(`K_POOL_SIZE is ${f.K_POOL_SIZE}, ${OUT_JSON} holds ${n} puzzles`)
  const declared = Number(/^\[(\d+)\]/.exec(consts.K_POOL_IDS?.type ?? '')?.[1])
  if (declared !== n) say(`K_POOL_IDS is declared [${declared}]str, the pool has ${n}`)
  if (JSON.stringify(f.K_POOL_IDS) !== JSON.stringify(data.pool.map((p) => p.id))) say(`K_POOL_IDS does not list the pool's ids in the pool's order`)
  if (data.yosys.answer !== f.K_SYNTH) say(`${OUT_JSON} answers come from "${data.yosys.answer}", the spec says "${f.K_SYNTH}"`)
  if (data.yosys.also_run !== f.K_OTHER_SYNTH) say(`${OUT_JSON} also ran "${data.yosys.also_run}", the spec says "${f.K_OTHER_SYNTH}"`)
  for (const p of data.pool) {
    const src = join(SITE, 'public', p.src)
    if (!existsSync(src)) { say(`${p.src} is gone from the corpus`); continue }
    if (sha256(readFileSync(src)) !== p.spec_sha256) say(`${p.src} changed since the pool was built; re-run the script`)
    if (p.answer.lut < f.K_MIN_LUTS || p.answer.lut > f.K_MAX_LUTS) say(`${p.id}: ${p.answer.lut} LUTs is outside [${f.K_MIN_LUTS}, ${f.K_MAX_LUTS}]`)
  }
  // The page's rule module gives the spec's fixed answers.
  const rule = await import(pathToFileURL(join(SITE, RULE)).href)
  for (let i = 0; i < f.K_TEST_DATES.length; i++) {
    const day = rule.dayNumber(Date.parse(`${f.K_TEST_DATES[i]}T12:00:00Z`))
    if (day !== f.K_TEST_DAYS[i]) say(`${f.K_TEST_DATES[i]} is day ${day}, the spec says ${f.K_TEST_DAYS[i]}`)
    const idx = rule.dayIndex(day, f.K_EPOCH_DAY, n)
    if (idx !== f.K_TEST_INDEX[i]) say(`rule.js dayIndex(${f.K_TEST_DATES[i]}) is ${idx}, the spec says ${f.K_TEST_INDEX[i]}`)
    const num = rule.puzzleNumber(day, f.K_EPOCH_DAY)
    if (num !== f.K_TEST_NUMBER[i]) say(`rule.js puzzleNumber(${f.K_TEST_DATES[i]}) is ${num}, the spec says ${f.K_TEST_NUMBER[i]}`)
  }
  if (rule.dayNumber(Date.parse(`${f.K_EPOCH_DATE}T00:00:00Z`)) !== f.K_EPOCH_DAY) say(`K_EPOCH_DATE ${f.K_EPOCH_DATE} is not day K_EPOCH_DAY ${f.K_EPOCH_DAY}`)
  for (let i = 0; i < f.K_RULE_GUESSES.length; i++) {
    const g = rule.grade(f.K_RULE_GUESSES[i], f.K_RULE_TRUTH, f.K_CLOSE_PCT, f.K_WARM_PCT)
    if (g.heat !== f.K_RULE_HEAT[i]) say(`rule.js grades ${f.K_RULE_GUESSES[i]} against ${f.K_RULE_TRUTH} as ${g.heat}, the spec says ${f.K_RULE_HEAT[i]}`)
    if (g.dir !== f.K_RULE_DIR[i]) say(`rule.js points ${f.K_RULE_GUESSES[i]} against ${f.K_RULE_TRUTH} ${g.dir}, the spec says ${f.K_RULE_DIR[i]}`)
  }
  // DATA_SOURCES names the tools that made the numbers: the yosys version and git sha, the
  // compiler's sha256 and the day of the run.
  const sources = f.DATA_SOURCES.join(' | ')
  const ver = /^Yosys (\S+) \(git sha1 ([0-9a-f]{8})/.exec(data.yosys.version)
  for (const want of [ver?.[1], ver?.[2], data.compiler.sha256.slice(0, 12), data.date_utc, f.K_SYNTH, f.K_OTHER_SYNTH]) {
    if (!want || !sources.includes(want)) say(`DATA_SOURCES does not name ${want ?? 'the yosys version'} from ${OUT_JSON}`)
  }
  // The card's sample game is the rule's, not a hand-typed board.
  const sample = await sampleGame(data, f)
  if (JSON.stringify(sample) !== JSON.stringify(data.sample)) say(`${OUT_JSON} sample game differs from the one the rule plays now; re-run the script`)
  // The facts the spec states about the pool.
  const zeroFf = data.pool.filter((p) => p.answer.ff === 0).length
  if (f.K_POOL_ZERO_FF !== zeroFf) say(`K_POOL_ZERO_FF is ${f.K_POOL_ZERO_FF}, the pool has ${zeroFf} puzzles with no flip-flop`)
  if (f.K_CANDIDATES !== data.corpus.candidates) say(`K_CANDIDATES is ${f.K_CANDIDATES}, the survey found ${data.corpus.candidates}`)
  if (f.K_CORPUS_SPECS !== data.corpus.specs) say(`K_CORPUS_SPECS is ${f.K_CORPUS_SPECS}, the corpus has ${data.corpus.specs}`)
  return problems
}

async function main() {
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const spec = readSpec(analyze)
  let data
  if (process.argv.includes('--check') || process.argv.includes('--spec-lines')) {
    if (!existsSync(join(SITE, OUT_JSON))) fail(`${OUT_JSON} is missing; run without --check first`)
    data = JSON.parse(readFileSync(join(SITE, OUT_JSON), 'utf8'))
  } else if (process.argv.includes('--refilter')) {
    data = await refilter(spec)
  } else {
    data = await build(analyze, spec)
  }
  if (process.argv.includes('--spec-lines')) { console.log(specLines(data)); return }
  const problems = await check(spec, data)
  if (problems.length) {
    console.error(`gatle: the spec disagrees with ${OUT_JSON} in ${problems.length} place(s):`)
    for (const p of problems) console.error('  ' + p)
    console.error(`gatle: the pool lines the data supports:\n${specLines(data)}`)
    process.exit(1)
  }
  console.log(`gatle: ${SPEC} agrees with ${relative(SITE, join(SITE, OUT_JSON))}: ${data.pool.length} puzzles, answers from "${data.yosys.answer}" (${data.yosys.version}), built ${data.generated_utc}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
