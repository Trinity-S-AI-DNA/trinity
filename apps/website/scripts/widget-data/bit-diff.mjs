#!/usr/bin/env node
// bit-diff.mjs -- the data behind public/widgets/bit-diff/, computed by the same parser the page runs.
//
// Two jobs, both read-only on their inputs:
//
//   --geometry <prjxray-db/artix7>   write public/widgets/bit-diff/geometry.json: the frame-address
//                                    layout of each Artix-7 die (rows, columns, frames per column),
//                                    read from prjxray-db's part.json, keyed by IDCODE.
//   --verify <a.bit> <a.frames>      check the frame mapping: every frame a .frames file names must
//                                    sit at that address in the .bit, word for word.
//   (default) <name> <a.bit> <b.bit> [<name> <a> <b> ...]
//                                    compare each pair and write public/widgets/bit-diff/demo.json:
//                                    headers, sha256, packet sequences, the frame verdict and the strip.
//
// Paths in the output are reduced to file names; the bitstreams themselves are not shipped.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as B from './bit-diff-bitparse.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(SITE, 'public/widgets/bit-diff')
const GEOMETRY = join(OUT_DIR, 'geometry.json')
const DEMO = join(OUT_DIR, 'demo.json')
const BLOCKS = { CLB_IO_CLK: 0, BLOCK_RAM: 1, CFG_CLB: 2 }

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
          const counts = Object.keys(cols).map(Number).sort((a, b) => a - b).map((c) => cols[c].frame_count)
          rows.push([bnum, bottom, r, counts])
        }
      }
    }
    const die = dir.match(/^xc7[a-z]\d+t/)[0]
    seen.set(idcode, { name: die, idcode, rows })
  }
  return [...seen.values()]
}

const sha = (u8) => createHash('sha256').update(u8).digest('hex')
const load = (p) => new Uint8Array(readFileSync(p))

async function comparePair(label, fa, fb, geoms) {
  return B.compareBitstreams(load(fa), load(fb), geoms, { label, nameA: basename(fa), nameB: basename(fb), sha256: sha })
}

/** Every frame a .frames file lists ("0xFAR w0,w1,...") must be found at that address in the .bit. */
function verify(bitPath, framesPath, geoms) {
  const u8 = load(bitPath)
  const p = B.parseBitstream(u8)
  const m = B.mapFrames(p, geoms)
  const at = new Map()
  m.fars.forEach((f, i) => { if (f !== null) at.set(f, i) })
  let checked = 0, bad = 0, missing = 0, eccOnly = 0
  const be32 = (o) => ((u8[o] << 24) | (u8[o + 1] << 16) | (u8[o + 2] << 8) | u8[o + 3]) >>> 0
  for (const line of readFileSync(framesPath, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const [farS, wordsS] = line.trim().split(/\s+/)
    const far = Number(farS) >>> 0
    const words = wordsS.split(',').map((w) => Number(w) >>> 0)
    const i = at.get(far)
    if (i === undefined) { missing++; continue }
    let diff = 0, diffNot50 = 0
    for (let w = 0; w < B.FRAME_WORDS; w++) {
      if (be32(m.offs[i] + w * 4) !== words[w]) { diff++; if (w !== 50) diffNot50++ }
    }
    checked++
    if (diffNot50) bad++
    else if (diff) eccOnly++
  }
  return { bit: basename(bitPath), frames: p.frames, mapped: m.mapped, geometry: m.geometry, listed: checked + missing, checked, missing, mismatched: bad, eccWordOnly: eccOnly }
}

/** The parser's numbers must be the spec's: K_SYNC_WORD, K_FRAME_WORDS, K_ECC_*, and the 200T slot count. */
async function checkAgainstSpec(geoms) {
  const { loadCompiler, constsOf } = await import('../agents-from-specs.mjs')
  const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))
  const c = Object.fromEntries(Object.entries(constsOf(analyze(readFileSync(join(SITE, 'specs/widgets/bit-diff.t27'), 'utf8')))).map(([k, v]) => [k, v.value]))
  const g200 = geoms.find((g) => g.idcode === c.K_XC7A200T_IDCODE)
  const want = [
    ['K_SYNC_WORD', c.K_SYNC_WORD, B.SYNC_WORD], ['K_FRAME_WORDS', c.K_FRAME_WORDS, B.FRAME_WORDS],
    ['K_ECC_WORD', c.K_ECC_WORD, B.ECC_WORD], ['K_ECC_MASK', c.K_ECC_MASK, B.ECC_MASK],
    ['K_XC7A200T_FRAMES', c.K_XC7A200T_FRAMES, g200 ? B.frameSlots(g200).length : null],
    ['K_XC7A200T_ROWS', c.K_XC7A200T_ROWS * 2, g200 ? g200.rows.length : null],
  ]
  const bad = want.filter(([, a, b]) => a !== b)
  for (const [k, a, b] of bad) console.error(`spec ${k} = ${a}, parser/geometry says ${b}`)
  if (bad.length) process.exit(1)
}

const args = process.argv.slice(2)
if (args[0] === '--geometry') {
  const g = geometryFrom(args[1])
  writeFileSync(GEOMETRY, JSON.stringify(g) + '\n')
  for (const d of g) {
    const slots = B.frameSlots(d).length
    console.log(`${d.name} ${B.hex8(d.idcode)} rows ${d.rows.length} frame slots (with pad) ${slots}`)
  }
} else {
  const geoms = JSON.parse(readFileSync(GEOMETRY, 'utf8'))
  await checkAgainstSpec(geoms)
  if (args[0] === '--verify') {
    console.log(JSON.stringify(verify(args[1], args[2], geoms)))
  } else {
    const pairs = []
    for (let i = 0; i + 2 < args.length + 1 && args[i]; i += 3) pairs.push(await comparePair(args[i], args[i + 1], args[i + 2], geoms))
    for (const p of pairs) console.log(`${p.label}: identical ${p.identical}, frames ${p.frames.total}, differing ${p.frames.differing}, first ${p.frames.first?.far ?? '-'}, packets same ${p.packetsSame}`)
    writeFileSync(DEMO, JSON.stringify({ schema: 1, pairs }) + '\n')
  }
}
