// SPDX-License-Identifier: Apache-2.0
// bitparse.js -- Xilinx 7-series bitstream reader for the bit-diff widget.
// Plain ES module, no dependencies: imported by tool.js in the browser and by
// scripts/widget-data/bit-diff.mjs in node, so the demo numbers and the page come
// from the same code. Holds no English for the page; names here are register and
// command mnemonics from UG470, which the page prints as they are.

export const SYNC_WORD = 0xaa995566
export const FRAME_WORDS = 101
export const ECC_WORD = 50
export const ECC_MASK = 0x1fff

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
export const BLOCK_NAMES = ['CLB_IO_CLK', 'BLOCK_RAM', 'CFG_CLB']
const REG = { FAR: 0x01, FDRI: 0x02, CMD: 0x04, CBC: 0x0b, IDCODE: 0x0c, MFWR: 0x0a }

const hex8 = (v) => '0x' + (v >>> 0).toString(16).padStart(8, '0')
export { hex8 }

const be32 = (u8, o) => ((u8[o] << 24) | (u8[o + 1] << 16) | (u8[o + 2] << 8) | u8[o + 3]) >>> 0

/** FAR fields, UG470 table 5-24. */
export function decodeFar(far) {
  far >>>= 0
  return {
    far,
    block: (far >>> 23) & 0x7,
    bottom: (far >>> 22) & 0x1,
    row: (far >>> 17) & 0x1f,
    column: (far >>> 7) & 0x3ff,
    minor: far & 0x7f,
  }
}
export const encodeFar = (block, bottom, row, column, minor) =>
  (((block & 7) << 23) | ((bottom & 1) << 22) | ((row & 0x1f) << 17) | ((column & 0x3ff) << 7) | (minor & 0x7f)) >>> 0

/** The .bit header: a 13-byte magic, then fields 'a'..'e' (a-d length-prefixed strings, e the data length). */
function parseHeader(u8) {
  const magic = [0x00, 0x09, 0x0f, 0xf0, 0x0f, 0xf0, 0x0f, 0xf0, 0x0f, 0xf0, 0x00, 0x00, 0x01]
  for (let i = 0; i < magic.length; i++) if (u8[i] !== magic[i]) return null
  let o = 13
  const fields = {}
  const text = (start, len) => {
    let s = ''
    for (let i = start; i < start + len && u8[i] !== 0; i++) s += String.fromCharCode(u8[i])
    return s
  }
  while (o < u8.length && o < 4096) {
    const key = String.fromCharCode(u8[o])
    if (key === 'e') {
      fields.e = be32(u8, o + 1)
      o += 5
      return { fields, dataStart: o }
    }
    if (!'abcd'.includes(key)) return null
    const len = (u8[o + 1] << 8) | u8[o + 2]
    fields[key] = text(o + 3, len)
    o += 3 + len
  }
  return null
}

/** Where the sync word sits, as a byte offset of its first byte, or -1. */
export function findSync(u8, from = 0, limit = 1 << 20) {
  const end = Math.min(u8.length - 3, from + limit)
  for (let i = from; i < end; i++) {
    if (u8[i] === 0xaa && u8[i + 1] === 0x99 && u8[i + 2] === 0x55 && u8[i + 3] === 0x66) return i
  }
  return -1
}

/**
 * Parse one bitstream (a .bit with header, or a raw .bin).
 * Returns header fields, the packet list (data payloads kept as offsets, never copied), the
 * FDRI writes with the FAR in force when each began, and warnings for what is not read.
 */
export function parseBitstream(u8) {
  const out = {
    size: u8.length, kind: 'bin', header: null, headerEnd: 0, sync: -1, idcode: null,
    packets: [], fdri: [], warnings: [], words: 0,
  }
  const h = parseHeader(u8)
  if (h) {
    out.kind = 'bit'
    out.header = {
      design: h.fields.a ?? '', part: h.fields.b ?? '', date: h.fields.c ?? '', time: h.fields.d ?? '',
      length: h.fields.e ?? 0,
    }
    out.headerEnd = h.dataStart
  }
  const sync = findSync(u8, out.headerEnd)
  out.sync = sync
  if (sync < 0) {
    out.warnings.push('nosync')
    return out
  }
  let o = sync + 4
  let far = null
  let lastReg = null
  const n = u8.length
  while (o + 4 <= n) {
    const w = be32(u8, o)
    const type = w >>> 29
    if (type === 1) {
      const op = (w >>> 27) & 3
      const reg = (w >>> 13) & 0x3fff
      const count = w & 0x7ff
      const pk = { off: o, type: 1, op, reg, count, data: o + 4 }
      if (op === 2 && count > 0 && o + 4 + count * 4 <= n) {
        if (reg === REG.CMD) pk.value = be32(u8, o + 4)
        else if (reg === REG.FAR) { far = be32(u8, o + 4); pk.value = far }
        else if (count === 1) pk.value = be32(u8, o + 4)
        if (reg === REG.IDCODE) out.idcode = pk.value
        if (reg === REG.CBC) out.warnings.push('encrypted')
        if (reg === REG.MFWR) out.warnings.push('compressed')
        if (reg === REG.FDRI) out.fdri.push({ off: o + 4, words: count, far })
        if (reg === REG.CMD && pk.value === 13) { out.packets.push(pk); o += 4 + count * 4; out.desync = true; break }
      }
      lastReg = reg
      out.packets.push(pk)
      o += 4 + (op === 0 ? 0 : count * 4)
    } else if (type === 2) {
      const op = (w >>> 27) & 3
      const count = w & 0x7ffffff
      const reg = lastReg
      const pk = { off: o, type: 2, op, reg, count, data: o + 4 }
      if (o + 4 + count * 4 > n) { out.warnings.push('truncated'); out.packets.push(pk); break }
      if (op === 2 && reg === REG.FDRI) out.fdri.push({ off: o + 4, words: count, far })
      out.packets.push(pk)
      o += 4 + count * 4
    } else if (w === 0xffffffff || w === 0) {
      // Dummy / padding words outside a packet.
      out.packets.push({ off: o, type: 0, op: 0, reg: null, count: 0, pad: w })
      o += 4
    } else {
      out.warnings.push('badheader')
      out.packets.push({ off: o, type, op: -1, reg: null, count: 0, raw: w })
      o += 4
    }
  }
  out.end = o
  out.words = (o - sync) >>> 2
  out.frameWords = out.fdri.reduce((s, f) => s + f.words, 0)
  out.frames = Math.floor(out.frameWords / FRAME_WORDS)
  if (out.frameWords % FRAME_WORDS) out.warnings.push('partialframe')
  out.warnings = [...new Set(out.warnings)]
  return out
}

/** A packet as one short line of mnemonics, for the command-sequence diff. */
export function packetLine(pk) {
  if (pk.type === 0) return pk.pad === 0 ? 'ZERO' : 'DUMMY'
  if (pk.op === -1) return 'WORD ' + hex8(pk.raw)
  const reg = REG_NAMES[pk.reg] ?? 'REG' + pk.reg
  const op = ['NOP', 'READ', 'WRITE', 'RSVD'][pk.op]
  if (pk.op === 0) return 'NOP'
  if (pk.reg === REG.CMD && pk.value !== undefined) return 'CMD ' + (CMD_NAMES[pk.value] ?? pk.value)
  if (pk.reg === REG.FDRI) return op + ' FDRI ' + pk.count + (pk.type === 2 ? ' (type 2)' : '')
  if (pk.value !== undefined && pk.count === 1) return op + ' ' + reg + ' ' + hex8(pk.value)
  return op + ' ' + reg + ' x' + pk.count
}

/** The packet lines with runs of identical lines folded into one ("NOP x 12"). */
export function packetSequence(parsed) {
  const seq = []
  for (const pk of parsed.packets) {
    const line = packetLine(pk)
    const last = seq[seq.length - 1]
    if (last && last.line === line) last.n++
    else seq.push({ line, n: 1 })
  }
  return seq.map((s) => (s.n > 1 ? s.line + ' * ' + s.n : s.line))
}

/** Line diff by longest common subsequence; small inputs (a few hundred lines). */
export function lineDiff(a, b) {
  const n = a.length, m = b.length
  if (n * m > 4e6) return null
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const rows = []
  let i = 0, j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { rows.push({ op: '=', a: a[i++], b: b[j++] }) }
    else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) rows.push({ op: '+', a: '', b: b[j++] })
    else rows.push({ op: '-', a: a[i++], b: '' })
  }
  return rows
}

/**
 * The frame-address order of a device, from a compact geometry record:
 * { idcode, rows: [[block, bottom, row, [frameCount per column...]], ...] } in FAR order.
 * Returns the address of every frame slot in the FDRI stream, with the two pad frames
 * each row ends with marked as null, the way the configuration logic expects them.
 */
export function frameSlots(geom) {
  const slots = []
  for (const [block, bottom, row, cols] of geom.rows) {
    for (let c = 0; c < cols.length; c++) for (let mi = 0; mi < cols[c]; mi++) slots.push(encodeFar(block, bottom, row, c, mi))
    slots.push(null, null)
  }
  return slots
}

/**
 * Give each FDRI frame its address. Uses the geometry if one matches the IDCODE and the FAR at
 * the start of the write is found in it; otherwise only the first frame of each write has one.
 * Returns { offs: Int32Array byte offset per frame, fars: Array (number | null), mapped: bool }.
 */
export function mapFrames(parsed, geometries) {
  const geom = geometries?.find((g) => g.idcode === parsed.idcode) ?? null
  const slots = geom ? frameSlots(geom) : null
  const index = slots ? new Map(slots.map((f, i) => [f, i]).filter(([f]) => f !== null)) : null
  const offs = new Int32Array(parsed.frames)
  const fars = new Array(parsed.frames).fill(null)
  let k = 0
  let mapped = !!geom
  for (const w of parsed.fdri) {
    const nf = Math.floor(w.words / FRAME_WORDS)
    let at = slots && w.far !== null && index.has(w.far) ? index.get(w.far) : (w.far === 0 && slots ? 0 : -1)
    if (at < 0) mapped = false
    for (let f = 0; f < nf && k < parsed.frames; f++, k++) {
      offs[k] = w.off + f * FRAME_WORDS * 4
      if (at >= 0 && at + f < slots.length) fars[k] = slots[at + f]
      else if (f === 0) fars[k] = w.far
    }
  }
  return { offs, fars, mapped, geometry: geom ? geom.name : null }
}

/** Do two byte ranges match? */
function sameBytes(a, ao, b, bo, len) {
  for (let i = 0; i < len; i++) if (a[ao + i] !== b[bo + i]) return false
  return true
}

/** Count differing words and bits between two frames. */
export function frameDelta(a, ao, b, bo) {
  let words = 0, bits = 0, ecc = 0
  const list = []
  for (let w = 0; w < FRAME_WORDS; w++) {
    const x = be32(a, ao + w * 4), y = be32(b, bo + w * 4)
    if (x !== y) {
      words++
      let v = (x ^ y) >>> 0
      if (w === ECC_WORD) { let e = v & ECC_MASK; while (e) { ecc += e & 1; e >>>= 1 } }
      while (v) { bits += v & 1; v >>>= 1 }
      if (list.length < 8) list.push({ word: w, a: x, b: y })
    }
  }
  return { words, bits, ecc, list }
}

/**
 * Compare two parsed bitstreams frame by frame. Frames are paired by address when both map to
 * the same geometry, otherwise by position. Yields to the caller every `chunk` frames through
 * `onProgress` so a page can stay responsive; returns the comparison.
 */
export async function compareFrames(ua, pa, ma, ub, pb, mb, { chunk = 2000, onProgress } = {}) {
  const byAddress = ma.mapped && mb.mapped && ma.geometry === mb.geometry
  const n = Math.max(pa.frames, pb.frames)
  const diff = new Uint8Array(n) // 0 same, 1 differs, 2 present in one only
  let differing = 0, first = -1, onlyOne = 0
  let pairB = null
  if (byAddress) {
    pairB = new Map()
    mb.fars.forEach((f, i) => { if (f !== null) pairB.set(f, i) })
  }
  for (let i = 0; i < n; i++) {
    let j = i
    if (byAddress && i < pa.frames && ma.fars[i] !== null) j = pairB.has(ma.fars[i]) ? pairB.get(ma.fars[i]) : -1
    if (i >= pa.frames || j < 0 || j >= pb.frames) { diff[i] = 2; onlyOne++; if (first < 0) first = i }
    else if (!sameBytes(ua, ma.offs[i], ub, mb.offs[j], FRAME_WORDS * 4)) { diff[i] = 1; differing++; if (first < 0) first = i }
    if (onProgress && i % chunk === chunk - 1) await onProgress(i + 1, n)
  }
  let firstDetail = null
  if (first >= 0 && diff[first] === 1) {
    let j = first
    if (byAddress && ma.fars[first] !== null) j = pairB.get(ma.fars[first])
    firstDetail = { index: first, far: ma.fars[first], ...frameDelta(ua, ma.offs[first], ub, mb.offs[j]) }
  } else if (first >= 0) firstDetail = { index: first, far: ma.fars[first] ?? null, words: null, bits: null, ecc: null, list: [] }
  return { frames: n, framesA: pa.frames, framesB: pb.frames, differing, onlyOne, first, firstDetail, byAddress, diff }
}

/** Byte-level identity, the strongest claim and the cheapest check. */
export function bytesIdentical(a, b) {
  if (a.length !== b.length) return false
  return sameBytes(a, 0, b, 0, a.length)
}

/** Fold the per-frame diff into one cell per geometry row and column bucket, for the strip. */
export function stripOf(cmp, map, geom, buckets = 120) {
  if (!geom || !cmp.byAddress) {
    const cells = new Uint8Array(buckets)
    const per = cmp.frames / buckets
    for (let i = 0; i < cmp.frames; i++) { const c = Math.min(buckets - 1, Math.floor(i / per)); cells[c] = Math.max(cells[c], cmp.diff[i]) }
    return { rows: [{ label: null, cells }] }
  }
  const rowKey = (far) => far >>> 17 // block, bottom, row
  const rows = geom.rows.map(([block, bottom, row, cols]) => ({ block, bottom, row, total: cols.reduce((s, x) => s + x, 0), cells: new Uint8Array(buckets), seen: 0 }))
  const at = new Map(rows.map((r, i) => [((r.block << 6) | (r.bottom << 5) | r.row) >>> 0, i]))
  const minorIndex = new Map()
  geom.rows.forEach(([block, bottom, row, cols]) => {
    let s = 0
    cols.forEach((cnt, c) => { minorIndex.set(encodeFar(block, bottom, row, c, 0), s); s += cnt })
  })
  for (let i = 0; i < cmp.frames; i++) {
    const far = map.fars[i]
    if (far === null || far === undefined) continue
    const ri = at.get(rowKey(far))
    if (ri === undefined) continue
    const r = rows[ri]
    const pos = (minorIndex.get((far & ~0x7f) >>> 0) ?? 0) + (far & 0x7f)
    const c = Math.min(buckets - 1, Math.floor((pos / r.total) * buckets))
    r.cells[c] = Math.max(r.cells[c], cmp.diff[i])
  }
  return { rows }
}

/** One file's side of a comparison, as plain data (what demo.json holds). */
export function summarize(name, u8, p, m, sha256) {
  return {
    file: name, bytes: u8.length, sha256, kind: p.kind, header: p.header,
    sync: p.sync, idcode: p.idcode === null ? null : hex8(p.idcode), frames: p.frames,
    fdri: p.fdri.map((f) => ({ words: f.words, far: f.far === null ? null : hex8(f.far) })),
    trailing: p.end === undefined ? null : p.size - p.end, warnings: p.warnings, mapped: m.mapped, geometry: m.geometry,
    packets: packetSequence(p),
  }
}

/**
 * Compare two bitstreams end to end and return plain data: the same object the page draws and
 * scripts/widget-data/bit-diff.mjs writes into demo.json. `sha256(u8)` is supplied by the caller
 * (node:crypto in node, crypto.subtle in a page) and may be async.
 */
export async function compareBitstreams(ua, ub, geoms, { label = '', nameA = 'A', nameB = 'B', sha256, onProgress, buckets = 160, chunk } = {}) {
  const pa = parseBitstream(ua), pb = parseBitstream(ub)
  const ma = mapFrames(pa, geoms), mb = mapFrames(pb, geoms)
  const cmp = await compareFrames(ua, pa, ma, ub, pb, mb, { onProgress, chunk })
  const geom = geoms?.find((g) => g.name === ma.geometry) ?? null
  const strip = stripOf(cmp, ma, geom, buckets)
  const fd = cmp.firstDetail
  const [sa, sb] = await Promise.all([sha256 ? sha256(ua) : null, sha256 ? sha256(ub) : null])
  const a = summarize(nameA, ua, pa, ma, sa), b = summarize(nameB, ub, pb, mb, sb)
  return {
    label,
    identical: bytesIdentical(ua, ub),
    a, b,
    frames: {
      total: cmp.frames, differing: cmp.differing, onlyOne: cmp.onlyOne, byAddress: cmp.byAddress,
      first: fd && {
        index: fd.index, far: fd.far === null ? null : hex8(fd.far), decoded: fd.far === null ? null : decodeFar(fd.far),
        words: fd.words, bits: fd.bits, ecc: fd.ecc, list: fd.list.map((d) => ({ word: d.word, a: hex8(d.a), b: hex8(d.b) })),
      },
    },
    packetsSame: JSON.stringify(a.packets) === JSON.stringify(b.packets),
    strip: strip.rows.map((r) => ({ block: r.block ?? null, bottom: r.bottom ?? null, row: r.row ?? null, cells: Array.from(r.cells).join('') })),
  }
}
