#!/usr/bin/env node
// bit-autopsy.mjs -- the data behind public/widgets/bit-autopsy/, computed by the same code the page runs.
//
// Writes three files into public/widgets/bit-autopsy/, all read-only on their inputs:
//
//   geometry.json   the frame-address layout of each Artix-7 die (rows, columns, frames per column),
//                   read from prjxray-db's part.json, keyed by IDCODE.
//   parts.json      the 7-series IDCODE table: openFPGALoader v1.1.1's fpga_list rows for spartan7,
//                   artix, kintex7, virtex7 and zynq, taken from public/widgets/idcode/parts.json (which
//                   scripts/widget-data/idcode.mjs extracts from the pinned part.hpp), cross-checked
//                   against the idcode field of every prjxray-db part.json.
//   samples.json    the autopsy of six real bitstreams (scripts/widget-data/bit-autopsy-autopsy.js), with
//                   sha256 and where each came from. The bitstreams themselves are not shipped.
//
// Each sample is also read by prjxray's bitread, independently of autopsy.js: its configuration
// frame count, its non-zero frame count (-z -o) and its one bits outside the ECC field (-x -z -o)
// must equal ours, or this script exits 1. So must the spec's K_SAMPLE_* numbers.
//
// Run:
//   node scripts/widget-data/bit-autopsy.mjs \
//     [--t27 ~/t27] [--receipt /tmp/widget-receipt/build/build_receipt.bit] \
//     [--db ~/.cache/openxc7/prjxray-db-ab1fc60/artix7] [--bitread ~/openxc7-src/prjxray/build/tools/bitread]
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as A from './bit-autopsy-autopsy.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(SITE, 'public/widgets/bit-autopsy')
const SPEC = join(SITE, 'specs/widgets/bit-autopsy.t27')
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt }
const T27 = arg('--t27', join(homedir(), 't27'))
const RECEIPT = arg('--receipt', '/tmp/widget-receipt/build/build_receipt.bit')
const DB = arg('--db', join(homedir(), '.cache/openxc7/prjxray-db-ab1fc60/artix7'))
const BITREAD = arg('--bitread', join(homedir(), 'openxc7-src/prjxray/build/tools/bitread'))
const BLOCKS = { CLB_IO_CLK: 0, BLOCK_RAM: 1, CFG_CLB: 2 }
const FAMILIES = /^(spartan7|artix a7 |kintex7$|virtex7$|zynq$)/

// The six samples, in the order the page shows them. `ref` is read with `git show` from the t27
// checkout; the build-receipt bitstream is a file on this machine.
const T27_REF = 'origin/master'
const SAMPLES = [
  { id: 'blink_j26', path: 'fpga/openxc7-synth/blink_j26.bit' },
  { id: 'build_receipt', file: RECEIPT },
  { id: 'find_led', path: 'fpga/openxc7-synth/find_led.bit' },
  { id: 'static_d5', path: 'fpga/openxc7-synth/static_d5.bit' },
  { id: 'test_top', path: 'fpga/openxc7-synth/test_top.bit' },
  { id: 'temporal_heartbeat', path: 'fpga/openxc7-synth/phi_temporal/temporal_heartbeat.bit' },
]

const fail = (m) => { console.error('bit-autopsy: ' + m); process.exit(1) }
const sha = (u8) => createHash('sha256').update(u8).digest('hex')
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { maxBuffer: 1 << 30, ...opts })

function geometryFrom(dbRoot) {
  const seen = new Map()
  for (const dir of readdirSync(dbRoot).sort()) {
    const pj = join(dbRoot, dir, 'part.json')
    if (!/^xc7/.test(dir) || !existsSync(pj)) continue
    const part = JSON.parse(readFileSync(pj, 'utf8'))
    const idcode = part.idcode >>> 0
    if (seen.has(idcode)) continue
    const rows = []
    for (const [block, bnum] of Object.entries(BLOCKS)) {
      for (const [half, bottom] of [['top', 0], ['bottom', 1]]) {
        const hr = part.global_clock_regions?.[half]?.rows ?? {}
        for (const r of Object.keys(hr).map(Number).sort((a, b) => a - b)) {
          const cols = hr[r].configuration_buses?.[block]?.configuration_columns
          if (!cols) continue
          rows.push([bnum, bottom, r, Object.keys(cols).map(Number).sort((a, b) => a - b).map((c) => cols[c].frame_count)])
        }
      }
    }
    seen.set(idcode, { name: dir.match(/^xc7[a-z]\d+t/)[0], idcode, rows })
  }
  return [...seen.values()]
}

function partsTable(dbRoot) {
  const src = JSON.parse(readFileSync(join(SITE, 'public/widgets/idcode/parts.json'), 'utf8'))
  const rows = src.fpga.filter((r) => r[1] === 'xilinx' && FAMILIES.test(r[2])).map((r) => [r[0], r[2], r[3]])
  // No two rows may share a key once the version nibble is masked, or the lookup would guess.
  const keys = new Map()
  for (const r of rows) {
    const k = (Number(r[0]) & A.IDCODE_MASK) >>> 0
    if (keys.has(k)) fail(`parts: ${r[0]} and ${keys.get(k)} share the masked key ${A.hex8(k)}`)
    keys.set(k, r[0])
  }
  // Every die prjxray-db knows must be in the table under the same IDCODE and the same die name.
  const checked = []
  for (const dir of readdirSync(dbRoot).sort()) {
    const pj = join(dbRoot, dir, 'part.json')
    if (!/^xc7[a-z]\d+t$/.test(dir) || !existsSync(pj)) continue
    const id = JSON.parse(readFileSync(pj, 'utf8')).idcode >>> 0
    const e = A.lookupIdcode(id, rows)
    if (!e || A.dieOf(e[2]) !== A.dieOf(dir)) fail(`parts: prjxray-db ${dir} idcode ${A.hex8(id)} is ${e ? e[2] : 'missing'} in openFPGALoader's table`)
    checked.push(`${dir} ${A.hex8(id)}`)
  }
  return { source: { ...src.source, extracted_by: 'scripts/widget-data/bit-autopsy.mjs from public/widgets/idcode/parts.json', families: 'spartan7, artix a7, kintex7, virtex7, zynq', columns: ['idcode', 'family', 'model'], prjxray_db_agrees: checked }, fpga: rows }
}

function loadSample(s, tmp) {
  if (s.file) {
    if (!existsSync(s.file)) fail(`sample ${s.id}: ${s.file} not found`)
    return { u8: new Uint8Array(readFileSync(s.file)), from: { file: basename(s.file) }, onDisk: s.file }
  }
  const commit = run('git', ['-C', T27, 'rev-parse', T27_REF]).toString().trim()
  const blob = run('git', ['-C', T27, 'rev-parse', `${T27_REF}:${s.path}`]).toString().trim()
  const bytes = run('git', ['-C', T27, 'show', `${T27_REF}:${s.path}`])
  const onDisk = join(tmp, basename(s.path))
  writeFileSync(onDisk, bytes)
  return { u8: new Uint8Array(bytes), from: { repo: 'gHashTag/t27', commit, path: s.path, blob }, onDisk }
}

/** prjxray bitread's view of the same file: configuration frames, non-zero frames, one bits outside ECC. */
function bitread(file, part, tmp) {
  if (!existsSync(BITREAD)) return null
  const pf = join(DB, part, 'part.yaml')
  if (!existsSync(pf)) return null
  const head = run(BITREAD, ['-part_file', pf, '-F', '0:0', file]).toString()
  const frames = Number((head.match(/Number of configuration frames: (\d+)/) || [])[1])
  const zo = join(tmp, 'z.frames'), xo = join(tmp, 'x.bits')
  run(BITREAD, ['-part_file', pf, '-z', '-o', zo, file])
  run(BITREAD, ['-part_file', pf, '-x', '-z', '-o', xo, file])
  const nonzero = (readFileSync(zo, 'utf8').match(/^\.frame /gm) || []).length
  const ones = readFileSync(xo, 'utf8').split('\n').filter((l) => l.startsWith('bit_')).length
  return { configFrames: frames, nonzeroFrames: nonzero, ones }
}

async function specNumbers() {
  if (!existsSync(SPEC)) return null
  const { loadCompiler, constsOf } = await import('../agents-from-specs.mjs')
  const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))
  return Object.fromEntries(Object.entries(constsOf(analyze(readFileSync(SPEC, 'utf8')))).map(([k, v]) => [k, v.value]))
}

async function main() {
  const geoms = geometryFrom(DB)
  const parts = partsTable(DB)
  const prjxray = existsSync(BITREAD) ? run('git', ['-C', join(dirname(BITREAD), '..', '..'), 'log', '-1', '--format=%h %cs']).toString().trim() : null
  const tmp = mkdtempSync(join(tmpdir(), 'bit-autopsy-'))
  const out = []
  try {
    for (const s of SAMPLES) {
      const { u8, from, onDisk } = loadSample(s, tmp)
      const a = A.autopsy(u8, { geoms, parts: parts.fpga })
      const br = a.header ? bitread(onDisk, a.header.part, tmp) : null
      if (br) {
        for (const k of ['configFrames', 'nonzeroFrames', 'ones']) if (br[k] !== a[k]) fail(`${s.id}: ${k} is ${a[k]} here, ${br[k]} in prjxray bitread`)
      }
      out.push({ id: s.id, from, sha256: sha(u8), ...a, bitread: br })
      console.log(`${s.id}: ${a.header?.part} idcode ${a.idcode} -> ${a.device?.model ?? 'unknown'} agree ${a.agree}; frames ${a.frameSlots} slots, ${a.configFrames} config, ${a.nonzeroFrames} non-zero, ${a.ones} ones; zero bytes ${a.zeroBytes}/${a.bytes}; bitread ${br ? JSON.stringify(br) : 'not run'}`)
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }

  const k = await specNumbers()
  if (k) {
    const want = [
      ['K_SAMPLE_IDCODES', out.map((s) => Number(s.idcode))],
      ['K_SAMPLE_FRAME_SLOTS', out.map((s) => s.frameSlots)],
      ['K_SAMPLE_CONFIG_FRAMES', out.map((s) => s.configFrames)],
      ['K_SAMPLE_NONZERO_FRAMES', out.map((s) => s.nonzeroFrames)],
      ['K_SAMPLE_BYTES', out.map((s) => s.bytes)],
    ]
    const ids = k.SAY_SAMPLE_IDS
    if (JSON.stringify(ids) !== JSON.stringify(out.map((s) => s.id))) fail(`spec SAY_SAMPLE_IDS ${JSON.stringify(ids)} != ${JSON.stringify(out.map((s) => s.id))}`)
    for (const [name, v] of want) if (JSON.stringify(k[name]) !== JSON.stringify(v)) fail(`spec ${name} = ${JSON.stringify(k[name])}, the files say ${JSON.stringify(v)}`)
    for (const [name, v] of [['K_SYNC_WORD', A.SYNC_WORD], ['K_FRAME_WORDS', A.FRAME_WORDS], ['K_IDCODE_MASK', A.IDCODE_MASK], ['K_PAD_FRAMES_PER_ROW', A.PAD_FRAMES_PER_ROW]]) {
      if (k[name] !== v) fail(`spec ${name} = ${k[name]}, autopsy.js says ${v}`)
    }
    console.log('spec K_ numbers agree with the files')
  } else console.log('spec not found; K_ numbers not checked')

  writeFileSync(join(OUT_DIR, 'geometry.json'), JSON.stringify(geoms) + '\n')
  writeFileSync(join(OUT_DIR, 'parts.json'), JSON.stringify(parts) + '\n')
  writeFileSync(join(OUT_DIR, 'samples.json'), JSON.stringify({ schema: 1, bitread: prjxray ? { tool: 'prjxray bitread', commit: prjxray, db: 'prjxray-db ab1fc60' } : null, samples: out }) + '\n')
}

main().catch((e) => fail(e.stack || String(e)))
