#!/usr/bin/env node
// pin-map.mjs -- the data behind public/widgets/pin-map/, derived from prjxray-db and the project's
// own XDC files, then checked against the K_ constants of specs/widgets/pin-map.t27.
//
//   node scripts/widget-data/pin-map.mjs            derive, check, write pins.json and demos.json
//   node scripts/widget-data/pin-map.mjs --check    derive and check only; write nothing
//
// Inputs, all read-only:
//   $PRJXRAY_DB (default ~/.cache/openxc7/prjxray-db-ab1fc60/artix7)
//     xc7a200tfbg676-1/package_pins.csv   the package: ball, bank, site, tile, pin function
//     xc7a200tfbg676-{2,2L,3}, xc7a200tfbv676-*   must be byte-identical to -1 (checked)
//     xc7a100tfgg676-1/package_pins.csv   every 100T ball must carry the same function (checked)
//   the demo XDCs, read with `git show <commit>:<path>` so the commit named in the spec is the one read.
//
// Exit 1 when anything derived here disagrees with a K_ constant in the spec, or the inputs disagree
// with each other. Every number the page shows is either in pins.json/demos.json or in the spec, and
// this script is what makes the two agree.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinType, parseXdc, lintXdc, summarize } from './pin-map-xdc.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(SITE, 'public/widgets/pin-map')
const SPEC = join(SITE, 'specs/widgets/pin-map.t27')
const DB = process.env.PRJXRAY_DB ?? join(homedir(), '.cache/openxc7/prjxray-db-ab1fc60/artix7')
const PART = 'xc7a200tfbg676-1'
const SAME_AS = ['xc7a200tfbg676-2', 'xc7a200tfbg676-2L', 'xc7a200tfbg676-3', 'xc7a200tfbv676-1', 'xc7a200tfbv676-2', 'xc7a200tfbv676-2L', 'xc7a200tfbv676-3']
const A100T = 'xc7a100tfgg676-1'
const T27 = process.env.T27_REPO ?? join(homedir(), 't27')
const TFPGA = process.env.TRINITY_FPGA_REPO ?? join(homedir(), 'trinity-fpga')
// id, repo label, repo dir, commit, path. The order is the order of SAY_DEMO_IDS in the spec (checked).
const DEMOS = [
  ['wukong', 'gHashTag/t27', T27, '4832ec6ab7fb1608425fa23122cff5dc1cac7a6f', 'specs/fpga/constraints/qmtech_a100t.xdc'],
  ['flashed', 'gHashTag/t27', T27, 'ea15cd54c8c92bc84411d2d1ae20904e143ff0ea', 'fpga/verilog/ternary_mac_demo_top.xdc'],
  ['core-board', 'gHashTag/trinity-fpga', TFPGA, 'e1dc687b76d6c06ca14b17ef123b5bd9d7ee1ae9', 'fpga/openxc7-synth/power_modes.xdc'],
  ['spi-proxy', 'gHashTag/t27', T27, 'ea15cd54c8c92bc84411d2d1ae20904e143ff0ea', 'fpga/bscan_spi_qmtech/bscan_spi_qmtech.xdc'],
]
const TYPES = ['io', 'clock', 'config', 'analog', 'vref', 'mgt', 'xadc', 'unlisted']

const check = process.argv.includes('--check')
const problems = []
const fail = (m) => problems.push(m)
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

function readCsv(part) {
  const p = join(DB, part, 'package_pins.csv')
  if (!existsSync(p)) { console.error(`pin-map: missing ${p}`); process.exit(1) }
  const text = readFileSync(p, 'utf8')
  const [head, ...lines] = text.trim().split('\n')
  if (head.trim() !== 'pin,bank,site,tile,pin_function') fail(`${part}: unexpected header ${head}`)
  return { text, rows: lines.map((l) => { const [ball, bank, site, tile, fn] = l.trim().split(','); return { ball, bank: +bank, site, tile, fn } }) }
}

// --- The package -------------------------------------------------------------------------------
const main = readCsv(PART)
for (const other of SAME_AS) {
  const p = join(DB, other, 'package_pins.csv')
  if (existsSync(p) && readFileSync(p, 'utf8') !== main.text) fail(`${other}/package_pins.csv differs from ${PART}`)
}
const ballRe = /^([A-Z]+)(\d+)$/
const rowSet = new Set(), colSet = new Set()
const seen = new Set()
for (const r of main.rows) {
  const m = ballRe.exec(r.ball)
  if (!m) { fail(`ball ${r.ball} is not letters then digits`); continue }
  if (seen.has(r.ball)) fail(`ball ${r.ball} listed twice`)
  seen.add(r.ball)
  rowSet.add(m[1]); colSet.add(+m[2])
}
const rows = [...rowSet].sort((a, b) => a.length - b.length || a.localeCompare(b))
const cols = Math.max(...colSet)
for (let c = 1; c <= cols; c++) if (!colSet.has(c)) fail(`column ${c} has no listed ball`)
const single = rows.filter((r) => r.length === 1)
const double = rows.filter((r) => r.length === 2)
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const skipped = ALPHA.filter((l) => !single.includes(l))
double.forEach((d, i) => { if (d !== 'A' + single[i]) fail(`double row ${d} is not A${single[i]}`) })
if (double.length > 6 || rows.length > 30) fail('more rows than a 676 package should have')
const balls = rows.length * cols

const bankMap = new Map()
for (const r of main.rows) {
  r.type = pinType(r.fn)
  const kind = r.type === 'mgt' ? 'mgt' : (r.type === 'xadc' ? 'dedicated' : 'io')
  const b = bankMap.get(r.bank) ?? { id: r.bank, kind, pins: 0 }
  if (b.kind !== kind) fail(`bank ${r.bank} mixes ${b.kind} and ${kind} pins`)
  b.pins++
  bankMap.set(r.bank, b)
}
const kindOrder = { io: 0, mgt: 1, dedicated: 2 }
const banks = [...bankMap.values()].sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.id - b.id)
const ioBanks = banks.filter((b) => b.kind === 'io')
const mgtBanks = banks.filter((b) => b.kind === 'mgt')
const dedBanks = banks.filter((b) => b.kind === 'dedicated')
const perIo = [...new Set(ioBanks.map((b) => b.pins))]
const perMgt = [...new Set(mgtBanks.map((b) => b.pins))]
if (perIo.length !== 1) fail(`IO banks differ in size: ${perIo}`)
if (perMgt.length !== 1) fail(`MGT banks differ in size: ${perMgt}`)
const typeCounts = TYPES.map((t) => (t === 'unlisted' ? balls - main.rows.length : main.rows.filter((r) => r.type === t).length))

// --- The 100T in the same package --------------------------------------------------------------
const small = readCsv(A100T)
const byBall = new Map(main.rows.map((r) => [r.ball, r]))
let a100Same = 0
for (const r of small.rows) {
  const big = byBall.get(r.ball)
  if (!big) fail(`${A100T} ball ${r.ball} is not listed for ${PART}`)
  else if (big.fn !== r.fn || big.bank !== r.bank) fail(`${A100T} ball ${r.ball} is ${r.fn}, ${PART} has ${big.fn}`)
  else a100Same++
}

// --- The spec ----------------------------------------------------------------------------------
const derived = {
  K_GRID_ROWS: rows.length, K_GRID_COLS: cols, K_BALLS: balls,
  K_ROWS_SINGLE: single.length, K_ROWS_DOUBLE: double.length, K_SKIPPED_LETTERS: skipped.length,
  K_LISTED_PINS: main.rows.length, K_UNLISTED_BALLS: balls - main.rows.length,
  K_IO_BANKS: ioBanks.length, K_IO_PER_BANK: perIo[0], K_USER_IO: ioBanks.reduce((s, b) => s + b.pins, 0),
  K_MGT_BANKS: mgtBanks.length, K_MGT_PINS_PER_BANK: perMgt[0], K_MGT_PINS: mgtBanks.reduce((s, b) => s + b.pins, 0),
  K_DEDICATED_LISTED: dedBanks.reduce((s, b) => s + b.pins, 0), K_BANKS: banks.length,
  K_BANK_IDS: banks.map((b) => b.id), K_TYPE_COUNTS: typeCounts, K_A100T_PINS: a100Same,
}
const derivedSay = { SAY_SKIPPED_LETTERS: skipped, SAY_TYPE_IDS: TYPES, SAY_DEMO_IDS: DEMOS.map((d) => d[0]) }

let spec = null
if (existsSync(SPEC)) {
  const { loadCompiler, constsOf } = await import('../agents-from-specs.mjs')
  const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))
  spec = Object.fromEntries(Object.entries(constsOf(analyze(readFileSync(SPEC, 'utf8')))).map(([k, v]) => [k, v.value]))
} else fail(`no spec at ${SPEC}; derived values printed below`)

// --- The demos, linted by the page's own code ---------------------------------------------------
const pkg = { rows, cols, pins: new Map(main.rows.map((r) => [r.ball, { bank: r.bank, fn: r.fn, type: r.type }])) }
const vcco = new Map()
if (spec) {
  const s = spec.SAY_VCCO_STD ?? [], k = spec.K_VCCO_MV ?? []
  if (s.length !== k.length || !s.length) fail('SAY_VCCO_STD and K_VCCO_MV must be the same non-zero length')
  s.forEach((std, i) => vcco.set(std, k[i]))
}
const demos = []
for (const [id, repo, dir, commit, path] of DEMOS) {
  let text
  try { text = execFileSync('git', ['-C', dir, 'show', `${commit}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } catch (e) { console.error(`pin-map: git show ${commit}:${path} in ${dir} failed: ${e.message}`); process.exit(1) }
  const sum = summarize(lintXdc(parseXdc(text), pkg, vcco))
  demos.push({ id, repo, commit, path, sha256: sha256(text), text, ...sum })
}
derived.K_DEMO_PORTS = demos.map((d) => d.ports)
derived.K_DEMO_OK = demos.map((d) => d.ok)
derived.K_DEMO_FLAGGED = demos.map((d) => d.flaggedBalls)

if (spec) {
  for (const [k, v] of Object.entries({ ...derived, ...derivedSay })) {
    if (!(k in spec)) { fail(`spec has no ${k}; data says ${JSON.stringify(v)}`); continue }
    if (JSON.stringify(spec[k]) !== JSON.stringify(v)) fail(`spec ${k} = ${JSON.stringify(spec[k])}, data says ${JSON.stringify(v)}`)
  }
  const sources = (spec.DATA_SOURCES ?? []).join(' ')
  if (!sources.includes(sha256(main.text))) fail(`DATA_SOURCES does not quote the package_pins.csv sha256 ${sha256(main.text)}`)
  for (const d of DEMOS) if (!sources.includes(d[3].slice(0, 9))) fail(`DATA_SOURCES does not name commit ${d[3].slice(0, 9)} of ${d[4]}`)
}

console.log(`pin-map: ${PART} package_pins.csv sha256 ${sha256(main.text)}`)
console.log(`  grid ${rows.length} x ${cols} = ${balls} balls; rows ${rows.join(' ')}; skipped ${skipped.join(' ')}`)
console.log(`  listed ${main.rows.length}, unlisted ${balls - main.rows.length}; banks ${banks.map((b) => `${b.id}:${b.kind}:${b.pins}`).join(' ')}`)
console.log(`  types ${TYPES.map((t, i) => `${t}=${typeCounts[i]}`).join(' ')}; ${A100T} balls with the same function: ${a100Same}/${small.rows.length}`)
for (const d of demos) console.log(`  demo ${d.id}: ${d.ports} ports, ${d.ok} on user IO, ${d.flaggedBalls} balls flagged (${d.errors} errors, ${d.warnings} warnings, ${d.infos} notes)  ${d.repo}@${d.commit.slice(0, 9)}:${d.path}`)

if (problems.length) {
  console.error(`pin-map: ${problems.length} disagreement(s):`)
  for (const p of problems) console.error('  ' + p)
  if (!spec) console.error(JSON.stringify(derived))
  process.exit(1)
}
if (check) { console.log('pin-map --check: data and spec agree'); process.exit(0) }

// ASCII-only JSON: the demo XDCs carry a few non-ASCII comment characters; keep them, escaped.
const ascii = (o) => JSON.stringify(o).replace(/[\u007f-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
const pinsOut = {
  part: PART, db: 'prjxray-db ab1fc60 artix7', sha256: sha256(main.text), rows, cols,
  banks: banks.map((b) => ({ id: b.id, kind: b.kind, pins: b.pins })),
  pins: main.rows.map((r) => [r.ball, r.bank, r.site, r.tile, r.fn, r.type]),
}
writeFileSync(join(OUT_DIR, 'pins.json'), ascii(pinsOut) + '\n')
writeFileSync(join(OUT_DIR, 'demos.json'), ascii(demos.map(({ id, repo, commit, path, sha256: h, text }) => ({ id, repo, commit, path, sha256: h, text }))) + '\n')
console.log(`pin-map: wrote ${join(OUT_DIR, 'pins.json')} and demos.json`)
