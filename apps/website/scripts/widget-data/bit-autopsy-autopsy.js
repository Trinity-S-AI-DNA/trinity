// SPDX-License-Identifier: Apache-2.0
// autopsy.js -- one Xilinx 7-series bitstream taken apart, for the bit-autopsy widget.
// Plain ES module, no dependencies: imported by tool.js in the browser and by
// scripts/widget-data/bit-autopsy.mjs in node, so the sample numbers and the page come from the
// same code. Holds no English for the page; the names here are UG470 register and command
// mnemonics, which the page prints as they are.
//
// What it reads: the .bit header, the sync word, the type 1 and type 2 configuration packets, and
// the FDRI frame data, counted frame by frame. What it does not do: decode the design. A frame is
// counted as non-zero or not and its one bits are counted; no bit is given a meaning.

export const SYNC_WORD = 0xaa995566
export const FRAME_WORDS = 101
export const ECC_WORD = 50
export const ECC_MASK = 0x1fff
export const IDCODE_MASK = 0x0fffffff
export const PAD_FRAMES_PER_ROW = 2

// UG470 table 5-23 (configuration registers) and 5-25 (CMD register codes).
export const REG_NAMES = {
  0x00: 'CRC', 0x01: 'FAR', 0x02: 'FDRI', 0x03: 'FDRO', 0x04: 'CMD', 0x05: 'CTL0', 0x06: 'MASK',
  0x07: 'STAT', 0x08: 'LOUT', 0x09: 'COR0', 0x0a: 'MFWR', 0x0b: 'CBC', 0x0c: 'IDCODE', 0x0d: 'AXSS',
  0x0e: 'COR1', 0x10: 'WBSTAR', 0x11: 'TIMER', 0x13: 'RBCRC_SW', 0x16: 'BOOTSTS', 0x18: 'CTL1', 0x1f: 'BSPI',
}
export const CMD_NAMES = {
  0: 'NULL', 1: 'WCFG', 2: 'MFW', 3: 'LFRM', 4: 'RCFG', 5: 'START', 6: 'RCAP', 7: 'RCRC', 8: 'AGHIGH',
  9: 'SWITCH', 10: 'GRESTORE', 11: 'SHUTDOWN', 12: 'GCAPTURE', 13: 'DESYNC', 15: 'IPROG', 16: 'CRCC',
  17: 'LTIMER', 18: 'BSPI_READ', 19: 'FALL_EDGE',
}
const REG = { CRC: 0x00, FAR: 0x01, FDRI: 0x02, CMD: 0x04, CTL0: 0x05, MFWR: 0x0a, CBC: 0x0b, IDCODE: 0x0c }
const CMD_DESYNC = 13
// CTL0 bit 6 (DEC): AES decryption on (UG470 table 5-31).
const CTL0_DEC = 1 << 6

export const hex8 = (v) => '0x' + (v >>> 0).toString(16).padStart(8, '0')
const be32 = (u8, o) => ((u8[o] << 24) | (u8[o + 1] << 16) | (u8[o + 2] << 8) | u8[o + 3]) >>> 0

function popcount(v) {
  v = v - ((v >>> 1) & 0x55555555)
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333)
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

const encodeFar = (block, bottom, row, column, minor) =>
  (((block & 7) << 23) | ((bottom & 1) << 22) | ((row & 0x1f) << 17) | ((column & 0x3ff) << 7) | (minor & 0x7f)) >>> 0

/** The .bit header: a 13-byte magic, then fields 'a'..'d' (length-prefixed strings) and 'e' (data length). */
export function parseHeader(u8) {
  const magic = [0x00, 0x09, 0x0f, 0xf0, 0x0f, 0xf0, 0x0f, 0xf0, 0x0f, 0xf0, 0x00, 0x00, 0x01]
  if (u8.length < magic.length) return null
  for (let i = 0; i < magic.length; i++) if (u8[i] !== magic[i]) return null
  let o = 13
  const f = {}
  const text = (start, len) => {
    let s = ''
    for (let i = start; i < start + len && i < u8.length && u8[i] !== 0; i++) s += String.fromCharCode(u8[i])
    return s
  }
  while (o + 3 <= u8.length && o < 4096) {
    const key = String.fromCharCode(u8[o])
    if (key === 'e') {
      if (o + 5 > u8.length) return null
      return { design: f.a ?? '', part: f.b ?? '', date: f.c ?? '', time: f.d ?? '', length: be32(u8, o + 1), dataStart: o + 5 }
    }
    if (!'abcd'.includes(key)) return null
    const len = (u8[o + 1] << 8) | u8[o + 2]
    f[key] = text(o + 3, len)
    o += 3 + len
  }
  return null
}

/** Byte offset of the sync word, or -1. */
export function findSync(u8, from = 0, limit = 1 << 20) {
  const end = Math.min(u8.length - 3, from + limit)
  for (let i = from; i < end; i++) {
    if (u8[i] === 0xaa && u8[i + 1] === 0x99 && u8[i + 2] === 0x55 && u8[i + 3] === 0x66) return i
  }
  return -1
}

/** The die a part name or table model names: "xc7a100tfgg676-1" and "xc7a100" both give "xc7a100". */
export const dieOf = (s) => (String(s || '').toLowerCase().match(/^xc7[a-z]+\d+/) || [null])[0]

/** The IDCODE table entry for a code, matched with the version nibble masked on both sides. */
export function lookupIdcode(code, parts) {
  if (code === null || code === undefined || !parts) return null
  const key = (code & IDCODE_MASK) >>> 0
  return parts.find((p) => ((Number(p[0]) & IDCODE_MASK) >>> 0) === key) ?? null
}

/** The address of every frame slot of a die, in FDRI order; the two pad frames of each row are null. */
export function frameSlots(geom) {
  const slots = []
  for (const [block, bottom, row, cols] of geom.rows) {
    for (let c = 0; c < cols.length; c++) for (let mi = 0; mi < cols[c]; mi++) slots.push(encodeFar(block, bottom, row, c, mi))
    for (let k = 0; k < PAD_FRAMES_PER_ROW; k++) slots.push(null)
  }
  return slots
}

/**
 * Walk the packets after the sync word. Returns the IDCODE written, the FDRI writes with the FAR in
 * force when each began, packet and command counts, and the reasons the frames cannot be read.
 */
export function walkPackets(u8, sync) {
  const out = {
    idcode: null, fdri: [], commands: [], refuse: [], warnings: [],
    counts: { type1: 0, type2: 0, nop: 0, pad: 0, writes: 0, reads: 0, cmd: 0, crc: 0, far: 0, fdri: 0, other: 0 },
    end: sync + 4, desync: false,
  }
  let o = sync + 4
  let far = null
  let lastReg = null
  const n = u8.length
  const c = out.counts
  while (o + 4 <= n) {
    const w = be32(u8, o)
    const type = w >>> 29
    if (type === 1) {
      const op = (w >>> 27) & 3
      const reg = (w >>> 13) & 0x3fff
      const count = w & 0x7ff
      if (op === 0) { c.nop++; o += 4; continue }
      c.type1++
      if (o + 4 + count * 4 > n) { out.warnings.push('truncated'); o = n; break }
      if (op === 1) c.reads++
      if (op === 2) {
        c.writes++
        const v = count > 0 ? be32(u8, o + 4) : null
        if (reg === REG.CMD) { c.cmd++; if (v !== null) out.commands.push(CMD_NAMES[v] ?? 'CMD' + v) }
        else if (reg === REG.CRC) c.crc++
        else if (reg === REG.FAR) { c.far++; far = v }
        else if (reg === REG.IDCODE) out.idcode = v
        else if (reg === REG.CBC) out.refuse.push('encrypted')
        else if (reg === REG.CTL0 && v !== null && (v & CTL0_DEC)) out.refuse.push('encrypted')
        else if (reg === REG.MFWR) out.refuse.push('compressed')
        if (reg === REG.FDRI) { c.fdri++; if (count) out.fdri.push({ off: o + 4, words: count, far }) }
        if (reg === REG.CMD && v === CMD_DESYNC) { o += 4 + count * 4; out.desync = true; break }
      }
      lastReg = reg
      o += 4 + count * 4
    } else if (type === 2) {
      const op = (w >>> 27) & 3
      const count = w & 0x7ffffff
      c.type2++
      if (o + 4 + count * 4 > n) { out.warnings.push('truncated'); o = n; break }
      if (op === 2) {
        c.writes++
        if (lastReg === REG.FDRI) { c.fdri++; out.fdri.push({ off: o + 4, words: count, far }) }
      }
      o += 4 + count * 4
    } else if (w === 0xffffffff || w === 0) {
      c.pad++
      o += 4
    } else {
      c.other++
      if (!out.warnings.includes('badheader')) out.warnings.push('badheader')
      o += 4
    }
  }
  out.end = o
  out.refuse = [...new Set(out.refuse)]
  return out
}

/**
 * The autopsy: plain data, the object the page draws and scripts/widget-data/bit-autopsy.mjs writes
 * into samples.json. `geoms` is geometry.json (frame layout per die, keyed by IDCODE), `parts` the
 * IDCODE table of parts.json. `buckets` is the width of the frame strip.
 */
export function autopsy(u8, { geoms = [], parts = [], buckets = 160 } = {}) {
  const r = {
    bytes: u8.length, kind: 'bin', header: null, headerLengthOk: null, sync: -1,
    idcode: null, idcodeVersion: null, device: null, headerDie: null, idDie: null, agree: null,
    zeroBytes: 0, refuse: [], warnings: [], packets: null, commands: [],
    frameWords: 0, frameSlots: 0, padFrames: 0, configFrames: 0, nonzeroFrames: 0, ones: 0,
    blocks: null, geometry: null, mapped: false, strip: [],
  }
  for (let i = 0; i < u8.length; i++) if (u8[i] === 0) r.zeroBytes++
  const h = parseHeader(u8)
  let from = 0
  if (h) {
    r.kind = 'bit'
    r.header = { design: h.design, part: h.part, date: h.date, time: h.time, length: h.length }
    r.headerLengthOk = h.length === u8.length - h.dataStart
    r.headerDie = dieOf(h.part)
    from = h.dataStart
  }
  r.sync = findSync(u8, from)
  if (r.sync < 0) { r.refuse.push('nosync'); return r }
  const pk = walkPackets(u8, r.sync)
  r.packets = pk.counts
  r.commands = pk.commands
  r.warnings = pk.warnings
  r.refuse = pk.refuse
  if (pk.idcode !== null) {
    r.idcode = hex8(pk.idcode)
    r.idcodeVersion = pk.idcode >>> 28
    const e = lookupIdcode(pk.idcode, parts)
    if (e) r.device = { idcode: e[0], family: e[1], model: e[2] }
    r.idDie = e ? dieOf(e[2]) : null
    if (r.idDie && r.headerDie) r.agree = r.idDie === r.headerDie
  }
  if (r.refuse.length) return r

  r.frameWords = pk.fdri.reduce((s, f) => s + f.words, 0)
  r.frameSlots = Math.floor(r.frameWords / FRAME_WORDS)
  if (r.frameWords % FRAME_WORDS) r.warnings.push('partialframe')

  // Every frame: non-zero or not, and its one bits, the ECC field of word 50 left out (it is
  // computed from the other 100 words, as prjxray bitread leaves it out by default).
  const nz = new Uint8Array(r.frameSlots)
  const offs = new Int32Array(r.frameSlots)
  let k = 0
  for (const w of pk.fdri) {
    const nf = Math.floor(w.words / FRAME_WORDS)
    for (let f = 0; f < nf && k < r.frameSlots; f++, k++) {
      const base = w.off + f * FRAME_WORDS * 4
      offs[k] = base
      let ones = 0
      for (let i = 0; i < FRAME_WORDS; i++) {
        let v = be32(u8, base + i * 4)
        if (i === ECC_WORD) v = (v & ~ECC_MASK) >>> 0
        if (v) ones += popcount(v)
      }
      if (ones) { nz[k] = 1; r.nonzeroFrames++; r.ones += ones }
    }
  }

  // Frame addresses from the die's layout, when the IDCODE names a die we have and every FDRI write
  // starts on a known address. Otherwise the strip is drawn in stream order.
  const geom = pk.idcode === null ? null : geoms.find((g) => ((g.idcode & IDCODE_MASK) >>> 0) === ((pk.idcode & IDCODE_MASK) >>> 0)) ?? null
  const slots = geom ? frameSlots(geom) : null
  let fars = null
  if (slots) {
    const index = new Map()
    slots.forEach((f, i) => { if (f !== null && !index.has(f)) index.set(f, i) })
    fars = new Array(r.frameSlots).fill(undefined)
    let ok = true
    let j = 0
    for (const w of pk.fdri) {
      const nf = Math.floor(w.words / FRAME_WORDS)
      const at = w.far !== null && index.has(w.far) ? index.get(w.far) : -1
      if (at < 0) ok = false
      for (let f = 0; f < nf && j < r.frameSlots; f++, j++) fars[j] = at >= 0 && at + f < slots.length ? slots[at + f] : undefined
    }
    if (ok) { r.mapped = true; r.geometry = geom.name }
  }

  if (r.mapped) {
    r.padFrames = fars.filter((f) => f === null).length
    r.configFrames = r.frameSlots - r.padFrames
    const blocks = [0, 1, 2].map((b) => ({ block: b, frames: 0, nonzero: 0 }))
    const rows = geom.rows.map(([block, bottom, row, cols]) => ({ block, bottom, row, total: cols.reduce((s, x) => s + x, 0), hit: new Uint32Array(buckets), all: new Uint32Array(buckets) }))
    const rowAt = new Map(rows.map((x, i) => [(x.block << 6) | (x.bottom << 5) | x.row, i]))
    const colStart = new Map()
    geom.rows.forEach(([block, bottom, row, cols]) => { let s = 0; cols.forEach((cnt, c) => { colStart.set(encodeFar(block, bottom, row, c, 0), s); s += cnt }) })
    for (let i = 0; i < r.frameSlots; i++) {
      const far = fars[i]
      if (far === null || far === undefined) continue
      const blk = (far >>> 23) & 7
      if (blocks[blk]) { blocks[blk].frames++; if (nz[i]) blocks[blk].nonzero++ }
      const ri = rowAt.get(far >>> 17)
      if (ri === undefined) continue
      const row = rows[ri]
      const pos = (colStart.get((far & ~0x7f) >>> 0) ?? 0) + (far & 0x7f)
      const c = Math.min(buckets - 1, Math.floor((pos / row.total) * buckets))
      row.all[c]++
      if (nz[i]) row.hit[c]++
    }
    r.blocks = blocks.filter((b) => b.frames)
    r.strip = rows.map((x) => ({ block: x.block, bottom: x.bottom, row: x.row, cells: shade(x.hit, x.all) }))
  } else {
    r.configFrames = r.frameSlots
    const hit = new Uint32Array(buckets), all = new Uint32Array(buckets)
    const per = r.frameSlots / buckets || 1
    for (let i = 0; i < r.frameSlots; i++) { const c = Math.min(buckets - 1, Math.floor(i / per)); all[c]++; if (nz[i]) hit[c]++ }
    r.strip = r.frameSlots ? [{ block: null, bottom: null, row: null, cells: shade(hit, all) }] : []
  }
  return r
}

/** One character per cell: '-' no frame there, '0' none non-zero, '1'..'9' the share of non-zero frames. */
function shade(hit, all) {
  let s = ''
  for (let i = 0; i < all.length; i++) s += all[i] === 0 ? '-' : hit[i] === 0 ? '0' : String(Math.max(1, Math.ceil((hit[i] / all[i]) * 9)))
  return s
}
