#!/usr/bin/env node
// lut-explain.mjs -- the data behind public/widgets/lut-explain/, computed by the same decoder the
// page runs (public/widgets/lut-explain/lut.js).
//
// Read-only on every input. Three jobs:
//
//   --db <prjxray-db/artix7>        write public/widgets/lut-explain/prjxray.json: for the four CLB
//                                   tile types (CLBLL_L, CLBLL_R, CLBLM_L, CLBLM_R) the two sites and
//                                   their pin-wire prefix (tile_type_*.json), every segbits feature
//                                   except the LUT INIT bits with its frame_bit list, the frame_bit of
//                                   each INIT[00..63] of each LUT, and the tile's ppips.
//   --design <dir>                  read <dir>/node.fasm and <dir>/manifest.json, decode every LUT INIT
//                                   with lut.js and write public/widgets/lut-explain/design.json: the
//                                   function histogram, the pin check, the game rounds, sha256, tools.
//   --selftest                      check the spec's K_* constants against lut.js and design.json.
//
// Typical run (from apps/website):
//   node scripts/widget-data/lut-explain.mjs --db ~/.cache/openxc7/prjxray-db-ab1fc60/artix7 \
//        --design /tmp/x7board/node0 --selftest
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as L from './lut-explain-lut.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(SITE, 'public/widgets/lut-explain')
const PRJXRAY = join(OUT_DIR, 'prjxray.json')
const DESIGN = join(OUT_DIR, 'design.json')
const SPEC = join(SITE, 'specs/widgets/lut-explain.t27')
const TILE_TYPES = ['CLBLL_L', 'CLBLL_R', 'CLBLM_L', 'CLBLM_R']
const LUTS = ['A', 'B', 'C', 'D']
// Game rounds: at most this many distinct INITs per named function, so XOR2 does not fill the game.
const PER_CLASS = 4

const sha = (buf) => createHash('sha256').update(buf).digest('hex')

function prjxrayFrom(dbRoot) {
  const tiles = {}
  for (const tt of TILE_TYPES) {
    const lower = tt.toLowerCase()
    const tj = JSON.parse(readFileSync(join(dbRoot, `tile_type_${tt}.json`), 'utf8'))
    const sites = tj.sites.map((s) => {
      const x = Number(s.name.match(/^X(\d+)/)[1])
      const a1 = s.site_pins.A1.wire
      return { name: `${s.type}_X${x}`, type: s.type, prefix: a1.slice(0, -2) }
    }).sort((a, b) => a.name.localeCompare(b.name))
    const features = {}
    const init = {}
    for (const line of readFileSync(join(dbRoot, `segbits_${lower}.db`), 'utf8').split('\n')) {
      const t = line.trim().split(/\s+/)
      if (!t[0]) continue
      const name = t[0].slice(tt.length + 1)
      const m = name.match(/^(SLICE[LM]_X[01])\.([ABCD])LUT\.INIT\[(\d+)\]$/)
      if (m) {
        const key = `${m[1]}.${m[2]}`
        init[key] = init[key] || new Array(L.N_BITS).fill(null)
        init[key][Number(m[3])] = t.slice(1).join(' ')
      } else {
        features[name] = t.slice(1)
      }
    }
    for (const [k, v] of Object.entries(init)) if (v.some((b) => b === null)) throw new Error(`${tt} ${k}: INIT bit missing in segbits`)
    // Pseudo pips: connections inside the CLB tile with no config bits ('always', or 'hint' for a
    // path through a LUT from an input pin to its output).
    const ppips = {}
    for (const line of readFileSync(join(dbRoot, `ppips_${lower}.db`), 'utf8').split('\n')) {
      const t = line.trim().split(/\s+/)
      if (!t[0]) continue
      const [, dst, src] = t[0].split('.')
      ppips[`${dst}.${src}`] = t[1]
    }
    const rec = { sites, features, init, ppips }
    // CLBLL_R carries the same names and frame bits as CLBLL_L (and CLBLM_R as CLBLM_L) in this db:
    // ship it once and say so, rather than a second copy of the same numbers.
    const twin = tt.replace(/_R$/, '_L')
    tiles[tt] = twin !== tt && JSON.stringify(tiles[twin]) === JSON.stringify(rec) ? { sameAs: twin } : rec
  }
  return {
    schema: 1,
    db: basename(dirname(dbRoot)) + '/' + basename(dbRoot),
    files: TILE_TYPES.flatMap((tt) => [`segbits_${tt.toLowerCase()}.db`, `ppips_${tt.toLowerCase()}.db`, `tile_type_${tt}.json`]),
    tiles,
  }
}

/** The tile record for a tile type, following sameAs. */
const tileOf = (px, tt) => (px.tiles[tt]?.sameAs ? px.tiles[px.tiles[tt].sameAs] : px.tiles[tt])

function designFrom(dir, px) {
  const fasmBuf = readFileSync(join(dir, 'node.fasm'))
  const man = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
  const lines = fasmBuf.toString('utf8').split('\n')
  const luts = new Map() // tile.site.L -> { tile, tileType, site, lut, bits }
  const routed = new Map() // tile.prefix+L -> Set of pin numbers
  const featureCount = new Map()
  for (const raw of lines) {
    const f = L.parseFasmLine(raw)
    if (!f) continue
    if (f.kind === 'lut-init') {
      const key = `${f.tile}.${f.site}.${f.lut}`
      const r = L.parseInput(raw)
      if (luts.has(key)) throw new Error(`two INIT lines for ${key}`)
      luts.set(key, { tile: f.tile, tileType: f.tileType, site: f.site, lut: f.lut, bits: r.bits })
    } else if (f.kind === 'site') {
      featureCount.set(f.feature.replace(/^[ABCD]/, 'N'), (featureCount.get(f.feature.replace(/^[ABCD]/, 'N')) ?? 0) + 1)
    } else if (f.kind === 'pip' && tileOf(px, f.tileType)) {
      const m = f.parts[0].match(/^(.*)([ABCD])([1-6])$/)
      if (m && tileOf(px, f.tileType).sites.some((s) => s.prefix === m[1])) {
        const k = `${f.tile}.${m[1]}${m[2]}`
        if (!routed.has(k)) routed.set(k, new Set())
        routed.get(k).add(Number(m[3]) - 1)
      }
    }
  }
  const hist = new Map()
  const byClass = new Map()
  let pinsAgree = 0
  let inexact = 0
  let maxTerms = 0
  let badCover = 0
  const distinct = new Set()
  for (const [key, l] of luts) {
    const hex = L.initHex(l.bits)
    distinct.add(hex)
    const c = L.classify(l.bits)
    const ck = L.classKey(c)
    hist.set(ck, (hist.get(ck) ?? 0) + 1)
    const mz = L.minimize(l.bits)
    if (!mz.exact) inexact++
    maxTerms = Math.max(maxTerms, mz.terms.length)
    const cb = L.coverBits(mz.terms)
    if (cb.some((v, i) => v !== l.bits[i])) badCover++
    const prefix = tileOf(px, l.tileType).sites.find((s) => s.name === l.site).prefix
    const pins = [...(routed.get(`${l.tile}.${prefix}${l.lut}`) ?? [])].sort()
    if (pins.join() === L.support(l.bits).join()) pinsAgree++
    if (c.id !== 'other') {
      if (!byClass.has(ck)) byClass.set(ck, new Map())
      const m = byClass.get(ck)
      if (!m.has(hex)) m.set(hex, key)
    }
  }
  // Game rounds: for each named function, the first PER_CLASS distinct INITs in file order.
  const rounds = []
  for (const [ck, m] of [...byClass].sort((a, b) => (hist.get(b[0]) - hist.get(a[0])) || a[0].localeCompare(b[0]))) {
    for (const [hex, loc] of [...m].slice(0, PER_CLASS)) rounds.push({ loc, init: hex })
  }
  const count = (re) => [...featureCount].filter(([k]) => re.test(k)).reduce((s, [, v]) => s + v, 0)
  const total = luts.size
  const sorted = [...hist].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const named = sorted.filter(([k]) => !k.startsWith('other/')).reduce((s, [, v]) => s + v, 0)
  const tool = (name) => (man.tools[name] || '').replace(/^"nextpnr-xilinx" -- Next Generation Place and Route /, 'nextpnr-xilinx ')
  return {
    schema: 1,
    source: {
      file: 'node.fasm', sha256: sha(fasmBuf), lines: lines.filter(Boolean).length,
      top: man.top, part: man.part,
      tools: { yosys: tool('yosys'), nextpnr: tool('nextpnr-xilinx'), prjxray: man.tools.prjxray, db: basename(man.db_root.replace(/\/artix7$/, '')) },
      yosys: man.steps.find((s) => s.step === 'yosys').cmd.at(-1).match(/synth_xilinx[^;]*/)[0],
      nextpnr: man.steps.find((s) => s.step === 'nextpnr').cmd.map((a) => (a.startsWith('/') ? basename(a) : a)).join(' '),
    },
    luts: total,
    distinct: distinct.size,
    named,
    pinsAgree,
    inexact,
    badCover,
    maxTerms,
    o5Used: count(/^N(OUTMUX|FFMUX)\.O5$|^N5FFMUX\.IN_A$|^CARRY4\.NCY0$/),
    ramSrl: count(/^NLUT\.(RAM|SRL|SMALL)$/),
    hist: sorted,
    perClass: PER_CLASS,
    rounds,
  }
}

async function selftest(designDir) {
  const { loadCompiler, constsOf } = await import('../agents-from-specs.mjs')
  const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))
  const c = Object.fromEntries(Object.entries(constsOf(analyze(readFileSync(SPEC, 'utf8')))).map(([k, v]) => [k, v.value]))
  const d = JSON.parse(readFileSync(DESIGN, 'utf8'))
  const bad = []
  const want = (name, got, exp) => { if (got !== exp) bad.push(`${name}: spec ${got}, data ${exp}`) }
  c.K_EXAMPLE_INITS.forEach((hex, i) => {
    const bits = L.bitsFromBig(BigInt('0x' + hex))
    want(`K_EXAMPLE_CLASSES[${i}] (${hex})`, c.K_EXAMPLE_CLASSES[i], L.classKey(L.classify(bits)))
    want(`K_EXAMPLE_N[${i}] (${hex})`, c.K_EXAMPLE_N[i], L.support(bits).length)
  })
  // The [4]u16 words in the spec's tests are the same INITs, word 0 = INIT[15:0].
  const words = (hex) => [0, 1, 2, 3].map((w) => Number((BigInt('0x' + hex) >> BigInt(16 * w)) & 0xffffn))
  for (const [k, hex] of [['K_XOR6_WORDS', '6996966996696996'], ['K_AND6_WORDS', '8000000000000000'], ['K_A1_WORDS', 'AAAAAAAAAAAAAAAA'], ['K_A6_WORDS', 'FFFFFFFF00000000']]) {
    want(k, (c[k] || []).join(), words(hex).join())
  }
  want('K_XOR6 class', L.classKey(L.classify(L.bitsFromBig(0x6996966996696996n))), 'xor/6/0')
  want('K_AND6 class', L.classKey(L.classify(L.bitsFromBig(0x8000000000000000n))), 'and/6/0')
  want('K_DESIGN_LUTS', c.K_DESIGN_LUTS, d.luts)
  want('K_DESIGN_DISTINCT', c.K_DESIGN_DISTINCT, d.distinct)
  want('K_DESIGN_NAMED', c.K_DESIGN_NAMED, d.named)
  want('K_DESIGN_PINS_AGREE', c.K_DESIGN_PINS_AGREE, d.pinsAgree)
  want('K_DESIGN_O5_USED', c.K_DESIGN_O5_USED, d.o5Used)
  const topNamed = d.hist.find(([k]) => !k.startsWith('other/'))
  want('K_DESIGN_TOP_KEY', c.K_DESIGN_TOP_KEY, topNamed[0])
  want('K_DESIGN_TOP_COUNT', c.K_DESIGN_TOP_COUNT, topNamed[1])
  want('K_DESIGN_ROUNDS', c.K_DESIGN_ROUNDS, d.rounds.length)
  const xorFam = d.hist.filter(([k]) => /^(xor|xnor)\//.test(k)).reduce((s, [, v]) => s + v, 0)
  want('K_DESIGN_XOR_FAMILY', c.K_DESIGN_XOR_FAMILY, xorFam)
  want('K_ROUNDS_PER_CLASS', c.K_ROUNDS_PER_CLASS, d.perClass)
  want('K_DESIGN_SHA256', c.K_DESIGN_SHA256, d.source.sha256)
  want('K_DESIGN_OTHER', c.K_DESIGN_OTHER, d.luts - d.named)
  want('K_DESIGN_INEXACT', c.K_DESIGN_INEXACT, d.inexact)
  want('K_DESIGN_MAX_TERMS', c.K_DESIGN_MAX_TERMS, d.maxTerms)
  want('K_DESIGN_LUT_RAM_SRL', c.K_DESIGN_LUT_RAM_SRL, d.ramSrl)
  // Every example FASM line is a line of the real file, byte for byte.
  if (designDir) {
    const fasm = new Set(readFileSync(join(designDir, 'node.fasm'), 'utf8').split('\n'))
    for (const k of Object.keys(c).filter((n) => n.startsWith('K_EXAMPLE_FASM'))) {
      for (const line of c[k]) if (!fasm.has(line)) bad.push(`${k}: not a line of node.fasm: ${line}`)
    }
  } else bad.push('--selftest needs --design <dir> to check the example FASM lines')
  for (const id of L.CLASS_IDS) if (!(`SAY_CLASS_${id.toUpperCase()}` in c)) bad.push(`missing SAY_CLASS_${id.toUpperCase()}`)
  for (const b of bad) console.error(b)
  if (bad.length) process.exit(1)
  console.log('selftest ok: spec constants match lut.js and design.json')
}

const args = process.argv.slice(2)
const arg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null }
if (arg('--db')) {
  const px = prjxrayFrom(arg('--db'))
  writeFileSync(PRJXRAY, JSON.stringify(px) + '\n')
  for (const tt of Object.keys(px.tiles)) { const t = tileOf(px, tt); console.log(`${tt}${px.tiles[tt].sameAs ? ` (same as ${px.tiles[tt].sameAs})` : ''}: sites ${t.sites.map((s) => `${s.name}=${s.prefix}`).join(' ')}, features ${Object.keys(t.features).length}, INIT luts ${Object.keys(t.init).length}, ppips ${Object.keys(t.ppips).length}`) }
}
if (arg('--design')) {
  const px = JSON.parse(readFileSync(PRJXRAY, 'utf8'))
  const d = designFrom(arg('--design'), px)
  writeFileSync(DESIGN, JSON.stringify(d) + '\n')
  console.log(`luts ${d.luts} distinct ${d.distinct} named ${d.named} pinsAgree ${d.pinsAgree} inexact ${d.inexact} badCover ${d.badCover} maxTerms ${d.maxTerms} o5Used ${d.o5Used} ramSrl ${d.ramSrl} rounds ${d.rounds.length}`)
  console.log(`sha256 ${d.source.sha256}`)
  for (const [k, v] of d.hist.slice(0, 30)) console.log(`  ${String(v).padStart(5)} ${k}`)
  console.log(`  ... ${d.hist.length} keys`)
}
if (args.includes('--selftest')) await selftest(arg('--design'))
