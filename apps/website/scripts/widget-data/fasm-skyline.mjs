#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// fasm-skyline.mjs -- the data behind public/widgets/fasm-skyline/, counted by the page's own code
// (scripts/widget-data/fasm-skyline-skyline.js).
//
// Read-only on every input. Two jobs:
//
//   build   write public/widgets/fasm-skyline/grid.json from prjxray-db's xc7a200t tilegrid.json:
//           the tile type at each of the 265 x 261 grid cells (run-lengths down each column), the
//           map from a tile name's X and Y to grid_x and grid_y for each tile type (as arithmetic
//           runs), and which types carry configuration bits. Before writing, every one of the
//           69165 tiles is looked up through skyline.js and must land on its own grid_x, grid_y.
//           Then write samples.json: the two FASM files below, counted by skyline.js, with their
//           sha256, the commands that made them and the per-tile counts.
//   check   re-read grid.json and samples.json, re-count the source FASM files when they are on
//           this machine, and compare every K_ number of specs/widgets/fasm-skyline.t27 with what
//           skyline.js computes. Exit 1 on any difference.
//
//   node scripts/widget-data/fasm-skyline.mjs build
//   node scripts/widget-data/fasm-skyline.mjs check
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { constsOf, loadCompiler } from '../agents-from-specs.mjs'
import { decodeGrid, familyOf, parseFasm, summarize } from './fasm-skyline-skyline.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const HOME = homedir()
const OUT = join(SITE, 'public/widgets/fasm-skyline')
const SPEC = join(SITE, 'specs/widgets/fasm-skyline.t27')
const WASM = join(SITE, 'public/t27/t27_compiler.wasm')
const DB = process.env.PRJXRAY_DB || join(HOME, '.cache/openxc7/prjxray-db-ab1fc60/artix7')
const TILEGRID = join(DB, 'xc7a200t/tilegrid.json')
const SAMPLES = [
  { id: 'node', fasm: '/tmp/x7board/node0/node.fasm', manifest: '/tmp/x7board/node0/manifest.json' },
  { id: 'mac', fasm: '/tmp/widget-receipt/build/routed.fasm', receipt: join(SITE, 'public/widgets/build-receipt/receipt.json') },
]

const fail = (m) => { console.error(`fasm-skyline: ${m}`); process.exit(1) }
const sha256 = (b) => createHash('sha256').update(b).digest('hex')
const tilde = (s) => String(s).split(HOME).join('~')
const TILE_RE = /^(.*)_X(\d+)Y(\d+)$/

async function specConsts() {
  const analyze = await loadCompiler(readFileSync(WASM))
  return Object.fromEntries(Object.entries(constsOf(analyze(readFileSync(SPEC, 'utf8')))).map(([k, v]) => [k, v.value]))
}

/** Sorted (k, v) pairs as [k0, v0, n, dk, dv] runs. */
function segments(pairs) {
  pairs.sort((a, b) => a[0] - b[0])
  const out = []
  let i = 0
  while (i < pairs.length) {
    const [k0, v0] = pairs[i]
    if (i + 1 === pairs.length) { out.push([k0, v0, 1, 1, 0]); break }
    const dk = pairs[i + 1][0] - k0, dv = pairs[i + 1][1] - v0
    let n = 2
    while (i + n < pairs.length && pairs[i + n][0] - pairs[i + n - 1][0] === dk && pairs[i + n][1] - pairs[i + n - 1][1] === dv) n++
    out.push([k0, v0, n, dk, dv])
    i += n
  }
  return out
}

function gridFrom(tg) {
  const names = Object.keys(tg).sort()
  let w = 0, h = 0
  for (const n of names) { w = Math.max(w, tg[n].grid_x + 1); h = Math.max(h, tg[n].grid_y + 1) }
  const types = [...new Set(names.map((n) => tg[n].type))].sort()
  const ti = new Map(types.map((t, i) => [t, i]))
  const cells = new Int16Array(w * h).fill(-1)
  for (const n of names) {
    const { grid_x: x, grid_y: y, type } = tg[n]
    if (cells[x * h + y] !== -1) fail(`two tiles at grid ${x},${y}`)
    cells[x * h + y] = ti.get(type)
  }
  if (cells.includes(-1)) fail('a grid cell has no tile')
  const rle = []
  for (let i = 0; i < cells.length;) {
    let j = i
    while (j < cells.length && cells[j] === cells[i]) j++
    rle.push(cells[i], j - i)
    i = j
  }
  // Per type: X -> grid_x and Y -> grid_y, by majority over the tiles of that type. A tile that
  // disagrees with the majority (prjxray names BRKH_CLB_X90Y52 at the grid_x of X35) goes to
  // `except` with its own cell, and a coordinate only such tiles use is left out of the maps.
  const vote = new Map()
  const parsed = names.map((n) => {
    const m = TILE_RE.exec(n)
    if (!m || m[1] !== tg[n].type) fail(`tile ${n} is not named <type>_X<n>Y<n>`)
    const r = { n, t: m[1], X: +m[2], Y: +m[3], gx: tg[n].grid_x, gy: tg[n].grid_y }
    for (const [k, v] of [[`${r.t} x ${r.X}`, r.gx], [`${r.t} y ${r.Y}`, r.gy]]) {
      if (!vote.has(k)) vote.set(k, new Map())
      vote.get(k).set(v, (vote.get(k).get(v) || 0) + 1)
    }
    return r
  })
  const pick = (k) => [...vote.get(k)].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
  const xs = new Map(), ys = new Map(), except = {}
  for (const r of parsed) {
    if (!xs.has(r.t)) { xs.set(r.t, new Map()); ys.set(r.t, new Map()) }
    if (pick(`${r.t} x ${r.X}`) !== r.gx || pick(`${r.t} y ${r.Y}`) !== r.gy) { except[r.n] = [r.gx, r.gy]; continue }
    xs.get(r.t).set(r.X, r.gx)
    ys.get(r.t).set(r.Y, r.gy)
  }
  // A name resolves only onto a cell of its own type; that is exact only if no two X (or Y) of a
  // type share a grid line. Check it rather than assume it.
  for (const [t, m] of [...xs, ...ys]) {
    const vals = [...m.values()]
    if (new Set(vals).size !== vals.length) fail(`type ${t}: two tile coordinates map to one grid line`)
  }
  const x = {}, y = {}
  for (const t of types) { x[t] = segments([...xs.get(t)]); y[t] = segments([...ys.get(t)]) }
  // Which types carry configuration bits: all tiles of a type must agree.
  const bits = {}
  for (const n of names) {
    const has = Object.keys(tg[n].bits || {}).length > 0 ? 1 : 0
    const t = tg[n].type
    if (t in bits && bits[t] !== has) fail(`type ${t}: some tiles have bits and some do not`)
    bits[t] = has
  }
  return { w, h, types, rle, x, y, except, bits: types.map((t) => bits[t]) }
}

function familyTools(K) {
  const fams = K.K_FAMILIES
  return { fams, famOfType: (t) => familyOf(t, K.K_TYPE_PREFIX, K.K_TYPE_FAMILY, fams) }
}

/** Tiles per family on the die, and the tiles that carry configuration bits. */
function dieCounts(grid, famOfType, nFam) {
  const all = new Array(nFam).fill(0), config = new Array(nFam).fill(0)
  let configTiles = 0
  for (let i = 0; i < grid.cells.length; i++) {
    const t = grid.types[grid.cells[i]]
    if (!grid.bits[grid.cells[i]]) continue
    const f = famOfType(t)
    config[f]++
    configTiles++
  }
  for (let i = 0; i < grid.cells.length; i++) all[famOfType(grid.types[grid.cells[i]])]++
  return { all, config, configTiles }
}

function sampleFrom(s) {
  const buf = readFileSync(s.fasm)
  const parsed = parseFasm(buf.toString('utf8'))
  let commands = [], tools = {}, part = ''
  if (s.manifest) {
    const man = JSON.parse(readFileSync(s.manifest, 'utf8'))
    part = man.part
    commands = man.steps.filter((st) => st.step === 'yosys' || st.step === 'nextpnr').map((st) => tilde(st.cmd.join(' ')))
    tools = { yosys: man.tools.yosys, 'nextpnr-xilinx': man.tools['nextpnr-xilinx'].replace(/^"nextpnr-xilinx" -- /, ''), top: man.top, manifest: s.manifest }
  } else {
    const rc = JSON.parse(readFileSync(s.receipt, 'utf8'))
    part = rc.design.part
    const pnr = rc.stages.find((st) => st.id === 'pnr')
    if (pnr.output.sha256 !== sha256(buf)) fail(`${s.fasm} is not the routed.fasm recorded in ${s.receipt}`)
    commands = rc.stages.filter((st) => ['gen', 'synth', 'pnr'].includes(st.id)).map((st) => st.cmd)
    tools = Object.fromEntries(rc.stages.filter((st) => ['gen', 'synth', 'pnr'].includes(st.id)).map((st) => [st.tool, st.version]))
    tools.spec = `${rc.design.spec} sha256 ${rc.design.spec_sha256}`
    tools.receipt = 'public/widgets/build-receipt/receipt.json'
  }
  const chip = parsed.header.find((h) => /^chipdb /.test(h)) || ''
  return {
    id: s.id, file: s.fasm.split('/').pop(), path: s.fasm, sha256: sha256(buf), bytes: buf.length,
    features: parsed.features, comments: parsed.comments, cleared: parsed.cleared, bad: parsed.bad.length,
    header: parsed.header, part, chipdb: chip.replace(/^chipdb (\S+).*$/, '$1'), commands, tools,
    tiles: [...parsed.tiles].sort((a, b) => (a[0] < b[0] ? -1 : 1)),
  }
}

/** Numbers the page and the spec quote, for one sample. */
function numbersOf(sample, grid, famOfType, nFam, configTiles) {
  const sum = summarize({ features: sample.features, tiles: new Map(sample.tiles) }, grid, famOfType, nFam)
  return {
    features: sum.features, tiles: sum.tiles, off: sum.off.length, cleared: sample.cleared,
    tallestName: sum.tallest.name, tallest: sum.tallest.n,
    shareBp: Math.floor((sum.tiles * 10000 + Math.floor(configTiles / 2)) / configTiles),
    famTiles: sum.famTiles, famFeatures: sum.famFeatures,
  }
}

async function build() {
  const K = await specConsts()
  if (!existsSync(TILEGRID)) fail(`missing ${TILEGRID}`)
  const tgBuf = readFileSync(TILEGRID)
  const tg = JSON.parse(tgBuf.toString('utf8'))
  const g = gridFrom(tg)
  g.schema = 1
  g.source = { db: 'prjxray-db ab1fc60 artix7', file: 'xc7a200t/tilegrid.json', sha256: sha256(tgBuf), tiles: Object.keys(tg).length }
  const grid = decodeGrid(g)
  for (const [n, v] of Object.entries(tg)) {
    const p = grid.lookup(n)
    if (!p || p.gx !== v.grid_x || p.gy !== v.grid_y || p.type !== v.type) fail(`lookup(${n}) = ${JSON.stringify(p)}, tilegrid says ${v.grid_x},${v.grid_y} ${v.type}`)
  }
  // Negative control: names that are not tiles of this die must not resolve.
  for (const n of ['CLBLM_L_X999Y0', 'INT_L_X1Y0', 'CLBLL_L_X2Y999', 'NOT_A_TILE_X0Y0', 'BRAM_L_X6Y231']) if (grid.lookup(n)) fail(`lookup(${n}) resolved; it is not a tile`)
  writeFileSync(join(OUT, 'grid.json'), JSON.stringify(g) + '\n')
  const samples = SAMPLES.map(sampleFrom)
  writeFileSync(join(OUT, 'samples.json'), JSON.stringify({ schema: 1, samples }) + '\n')
  console.log(`grid.json ${statSync(join(OUT, 'grid.json')).size} B, samples.json ${statSync(join(OUT, 'samples.json')).size} B`)
  report(K, g, samples)
}

function report(K, g, samples) {
  const grid = decodeGrid(g)
  const { fams, famOfType } = familyTools(K)
  const die = dieCounts(grid, famOfType, fams.length)
  console.log(`grid ${g.w} x ${g.h} = ${g.w * g.h} tiles, ${die.configTiles} with configuration bits; per family (all / with bits):`)
  fams.forEach((f, i) => console.log(`  ${f.padEnd(6)} ${die.all[i]} / ${die.config[i]}`))
  for (const s of samples) {
    const n = numbersOf(s, grid, famOfType, fams.length, die.configTiles)
    console.log(`${s.id}: ${s.file} sha256 ${s.sha256} part ${s.part}: ${n.features} features in ${n.tiles} tiles (${n.off} off the map), ${n.cleared} zero-valued lines, tallest ${n.tallestName} ${n.tallest}, share ${n.shareBp} bp`)
    console.log(`  family tiles ${JSON.stringify(n.famTiles)} features ${JSON.stringify(n.famFeatures)}`)
  }
  return { die, grid, famOfType, fams }
}

async function check() {
  const K = await specConsts()
  const g = JSON.parse(readFileSync(join(OUT, 'grid.json'), 'utf8'))
  const data = JSON.parse(readFileSync(join(OUT, 'samples.json'), 'utf8'))
  const { die, grid, famOfType, fams } = report(K, g, data.samples)
  const bad = []
  const eq = (name, want, got) => { if (JSON.stringify(want) !== JSON.stringify(got)) bad.push(`${name}: spec ${JSON.stringify(want)}, data ${JSON.stringify(got)}`) }
  eq('K_GRID_W', K.K_GRID_W, g.w)
  eq('K_GRID_H', K.K_GRID_H, g.h)
  eq('K_DIE_TILES', K.K_DIE_TILES, g.source.tiles)
  eq('K_CONFIG_TILES', K.K_CONFIG_TILES, die.configTiles)
  eq('K_CONFIG_FAMILY_TILES', K.K_CONFIG_FAMILY_TILES, die.config)
  eq('K_TILEGRID_SHA256', K.K_TILEGRID_SHA256, g.source.sha256)
  if (existsSync(TILEGRID) && sha256(readFileSync(TILEGRID)) !== g.source.sha256) bad.push(`${TILEGRID} changed since grid.json was written`)
  for (const s of data.samples) {
    const P = `K_${s.id.toUpperCase()}_`
    const n = numbersOf(s, grid, famOfType, fams.length, die.configTiles)
    eq(P + 'SHA256', K[P + 'SHA256'], s.sha256)
    eq(P + 'FEATURES', K[P + 'FEATURES'], n.features)
    eq(P + 'TILES', K[P + 'TILES'], n.tiles)
    eq(P + 'CLEARED', K[P + 'CLEARED'], n.cleared)
    eq(P + 'TALLEST_TILE', K[P + 'TALLEST_TILE'], n.tallestName)
    eq(P + 'TALLEST', K[P + 'TALLEST'], n.tallest)
    eq(P + 'SHARE_BP', K[P + 'SHARE_BP'], n.shareBp)
    eq(P + 'FAMILY_TILES', K[P + 'FAMILY_TILES'], n.famTiles)
    eq(P + 'FAMILY_FEATURES', K[P + 'FAMILY_FEATURES'], n.famFeatures)
    if (n.off) bad.push(`${s.id}: ${n.off} tiles of the sample are not on the xc7a200t grid`)
    const src = SAMPLES.find((x) => x.id === s.id).fasm
    if (existsSync(src)) {
      const buf = readFileSync(src)
      if (sha256(buf) !== s.sha256) bad.push(`${src} changed since samples.json was written`)
      const p = parseFasm(buf.toString('utf8'))
      eq(`${s.id} re-count`, s.tiles, [...p.tiles].sort((a, b) => (a[0] < b[0] ? -1 : 1)))
    } else console.log(`  (${src} is not on this machine; checked the shipped counts only)`)
  }
  if (bad.length) { console.error('fasm-skyline check: ' + bad.length + ' difference(s)'); for (const b of bad) console.error('  ' + b); process.exit(1) }
  console.log('fasm-skyline check: every K_ number matches skyline.js on the shipped data')
}

const cmd = process.argv[2]
if (cmd === 'build') await build()
else if (cmd === 'check') await check()
else fail('usage: fasm-skyline.mjs build | check')
