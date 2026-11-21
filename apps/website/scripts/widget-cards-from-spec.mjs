#!/usr/bin/env node
// widget-cards-from-spec.mjs -- the share card (public/widgets/<id>/card.png) of every widget
// tool, drawn from its spec's own words, in black and white, by node alone.
//
// A widget tool's card is the picture X and Telegram show under a link to its page. Until this
// file, every card was drawn by hand in a headless browser that had to be killed afterwards. Here
// the card is a function of three inputs and nothing else:
//
//   specs/widgets/<id>.t27     TITLE, DESCRIPTION and CATEGORY (read through the real compiler)
//   specs/widgets/gallery.t27  TOOL_BRAND, CATEGORY_NAMES and ORIGIN (the words around a card)
//   public/fonts/*.woff2       the site's own fonts, decoded here (WOFF2 + glyf transform + gvar)
//
// No browser, no native module, no dependency outside node: the WOFF2 is unpacked with node's
// brotli, outlines are filled by a scanline rasterizer with fixed 4x vertical supersampling and
// exact horizontal coverage, and the PNG is written by a fixed-Huffman deflate in this file --
// node's zlib is NOT used to compress, because its output depends on the zlib build and the CPU,
// and a card must be byte-identical wherever it is drawn. Same spec, same fonts: same bytes. So
// --check can redraw a card in memory and compare, and needs nothing installed.
//
// A drawn card says so: a tEXt chunk `Software` = GENERATOR. A card without it was drawn by hand
// (every card before this file); --check holds those only to being present, and --all or
// --id <id> replaces one with a drawn card.
//
//   node scripts/widget-cards-from-spec.mjs             draw every gallery tool that has no card
//   node scripts/widget-cards-from-spec.mjs --id <id>   draw this one (replacing a hand-drawn card)
//   node scripts/widget-cards-from-spec.mjs --all       draw every gallery tool
//   node scripts/widget-cards-from-spec.mjs --check     fail on a missing card or a stale drawn one
//
// After writing a card this re-runs widget-pages-from-spec.mjs: the page's og:image carries
// ?v=<card sha>, so a new card means a new page.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { brotliDecompressSync, inflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { SITE, constsOf, loadCompiler } from './agents-from-specs.mjs'
import { CARD, GALLERY_SPEC, SPEC_DIR, pngSize } from './widget-pages-from-spec.mjs'

const WASM = 'public/t27/t27_compiler.wasm'
export const GENERATOR = 'widget-cards-from-spec'
export const cardOut = (id) => `public/widgets/${id}/card.png`
export const FONTS = { display: 'public/fonts/outfit-latin.woff2', mono: 'public/fonts/jetbrains-mono-latin.woff2' }

// ------------------------------------------------------------------------------- WOFF2 -> glyphs

const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill']

/** The sfnt tables of a WOFF2 file, decompressed; glyf/loca stay in their transformed form. */
function woff2Tables(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 file')
  const numTables = buf.readUInt16BE(12)
  const compressed = buf.readUInt32BE(20)
  let o = 48
  const base128 = () => {
    let v = 0
    for (let i = 0; i < 5; i++) { const c = buf[o++]; v = v * 128 + (c & 127); if (!(c & 128)) return v }
    throw new Error('bad UIntBase128')
  }
  const dir = []
  for (let i = 0; i < numTables; i++) {
    const flags = buf[o++]
    const tag = (flags & 63) === 63 ? buf.toString('latin1', o, (o += 4)) : KNOWN_TAGS[flags & 63]
    const version = flags >> 6
    const origLength = base128()
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0
    dir.push({ tag, transformed, length: transformed ? base128() : origLength })
  }
  const data = brotliDecompressSync(buf.subarray(o, o + compressed))
  const tables = {}
  let p = 0
  for (const t of dir) { tables[t.tag] = { data: data.subarray(p, p + t.length), transformed: t.transformed }; p += t.length }
  return tables
}

/** Reads the WOFF2 transformed glyf table into outlines: [{ contours: [[{x,y,on}]], components }]. */
function transformedGlyphs(t) {
  const numGlyphs = t.readUInt16BE(4)
  let o = 36
  const take = (n) => { const s = t.subarray(o, o + n); o += n; return s }
  const sizes = [8, 12, 16, 20, 24, 28, 32].map((at) => t.readUInt32BE(at))
  const [nContourS, nPointsS, flagS, glyphS, compositeS] = sizes.map(take)
  let nc = 0, np = 0, fl = 0, gl = 0, co = 0
  const u255 = (s, at) => {
    const c = s[at]
    if (c === 253) return [s.readUInt16BE(at + 1), 3]
    if (c === 255) return [s[at + 1] + 253, 2]
    if (c === 254) return [s[at + 1] + 506, 2]
    return [c, 1]
  }
  const sign = (f, v) => (f & 1 ? v : -v)
  const glyphs = []
  for (let g = 0; g < numGlyphs; g++) {
    const n = nContourS.readInt16BE(nc); nc += 2
    if (n === 0) { glyphs.push({ contours: [], components: [] }); continue }
    if (n > 0) {
      const counts = []
      for (let c = 0; c < n; c++) { const [v, k] = u255(nPointsS, np); np += k; counts.push(v) }
      const contours = []
      let x = 0, y = 0
      for (const count of counts) {
        const pts = []
        for (let i = 0; i < count; i++) {
          const raw = flagS[fl++]
          const on = !(raw >> 7)
          const f = raw & 0x7f
          const b = glyphS
          let dx, dy
          if (f < 10) { dx = 0; dy = sign(f, ((f & 14) << 7) + b[gl]); gl += 1 }
          else if (f < 20) { dx = sign(f, (((f - 10) & 14) << 7) + b[gl]); dy = 0; gl += 1 }
          else if (f < 84) { const b0 = f - 20, b1 = b[gl]; dx = sign(f, 1 + (b0 & 0x30) + (b1 >> 4)); dy = sign(f >> 1, 1 + ((b0 & 0x0c) << 2) + (b1 & 0x0f)); gl += 1 }
          else if (f < 120) { const b0 = f - 84; dx = sign(f, 1 + (Math.floor(b0 / 12) << 8) + b[gl]); dy = sign(f >> 1, 1 + (((b0 % 12) >> 2) << 8) + b[gl + 1]); gl += 2 }
          else if (f < 124) { const b2 = b[gl + 1]; dx = sign(f, (b[gl] << 4) + (b2 >> 4)); dy = sign(f >> 1, ((b2 & 0x0f) << 8) + b[gl + 2]); gl += 3 }
          else { dx = sign(f, (b[gl] << 8) + b[gl + 1]); dy = sign(f >> 1, (b[gl + 2] << 8) + b[gl + 3]); gl += 4 }
          x += dx; y += dy
          pts.push({ x, y, on })
        }
        contours.push(pts)
      }
      const [, k] = u255(glyphS, gl); gl += k // instruction length; the instructions are not needed
      glyphs.push({ contours, components: [] })
      continue
    }
    // Composite: the records as in glyf, then (if any asks) an instruction length in the glyph stream.
    const components = []
    let flags, instructions = false
    do {
      flags = compositeS.readUInt16BE(co)
      const glyph = compositeS.readUInt16BE(co + 2)
      co += 4
      let dx, dy
      if (flags & 1) { dx = compositeS.readInt16BE(co); dy = compositeS.readInt16BE(co + 2); co += 4 }
      else { dx = compositeS.readInt8(co); dy = compositeS.readInt8(co + 1); co += 2 }
      let m = [1, 0, 0, 1]
      const f2 = (at) => compositeS.readInt16BE(at) / 16384
      if (flags & 0x8) { const s = f2(co); m = [s, 0, 0, s]; co += 2 }
      else if (flags & 0x40) { m = [f2(co), 0, 0, f2(co + 2)]; co += 4 }
      else if (flags & 0x80) { m = [f2(co), f2(co + 2), f2(co + 4), f2(co + 6)]; co += 8 }
      if (flags & 0x100) instructions = true
      components.push({ glyph, dx: flags & 2 ? dx : 0, dy: flags & 2 ? dy : 0, m })
    } while (flags & 0x20)
    if (instructions) { const [, k] = u255(glyphS, gl); gl += k }
    glyphs.push({ contours: [], components })
  }
  return glyphs
}

/** The cmap as a Map codepoint -> glyph id (formats 4 and 12). */
function cmapOf(t) {
  const n = t.readUInt16BE(2)
  let best = null
  for (let i = 0; i < n; i++) {
    const pid = t.readUInt16BE(4 + i * 8), eid = t.readUInt16BE(6 + i * 8), off = t.readUInt32BE(8 + i * 8)
    const format = t.readUInt16BE(off)
    if ((format === 12 || format === 4) && (pid === 0 || (pid === 3 && (eid === 1 || eid === 10)))) if (!best || format === 12) best = off
  }
  if (best === null) throw new Error('font has no Unicode cmap')
  const map = new Map()
  if (t.readUInt16BE(best) === 12) {
    const groups = t.readUInt32BE(best + 12)
    for (let g = 0; g < groups; g++) {
      const at = best + 16 + g * 12, start = t.readUInt32BE(at), end = t.readUInt32BE(at + 4), gid = t.readUInt32BE(at + 8)
      for (let c = start; c <= end && c < 0x10000; c++) map.set(c, gid + c - start)
    }
    return map
  }
  const segs = t.readUInt16BE(best + 6) / 2
  const ends = best + 14, starts = ends + segs * 2 + 2, deltas = starts + segs * 2, ranges = deltas + segs * 2
  for (let s = 0; s < segs; s++) {
    const end = t.readUInt16BE(ends + s * 2), start = t.readUInt16BE(starts + s * 2)
    const delta = t.readInt16BE(deltas + s * 2), range = t.readUInt16BE(ranges + s * 2)
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let gid
      if (range === 0) gid = (c + delta) & 0xffff
      else { gid = t.readUInt16BE(ranges + s * 2 + range + (c - start) * 2); if (gid) gid = (gid + delta) & 0xffff }
      if (gid) map.set(c, gid)
    }
  }
  return map
}

/** gvar deltas for one glyph at one normalized coordinate per axis: { dx, dy } over points + 4 phantoms. */
function gvarDeltas(gvar, gid, coords, outline, nPoints) {
  const axisCount = gvar.readUInt16BE(4)
  const sharedCount = gvar.readUInt16BE(6), sharedAt = gvar.readUInt32BE(8)
  const long = gvar.readUInt16BE(14) & 1
  const dataAt = gvar.readUInt32BE(16)
  const offAt = (i) => (long ? gvar.readUInt32BE(20 + i * 4) : gvar.readUInt16BE(20 + i * 2) * 2)
  const start = dataAt + offAt(gid), end = dataAt + offAt(gid + 1)
  const total = nPoints + 4
  const dx = new Float64Array(total), dy = new Float64Array(total)
  if (end <= start) return { dx, dy }
  const f2 = (at) => gvar.readInt16BE(at) / 16384
  const shared = []
  for (let s = 0; s < sharedCount; s++) shared.push(Array.from({ length: axisCount }, (_, a) => f2(sharedAt + (s * axisCount + a) * 2)))
  const word = gvar.readUInt16BE(start)
  const count = word & 0x0fff
  let serial = start + gvar.readUInt16BE(start + 2)
  let h = start + 4
  const readPoints = () => {
    let n = gvar[serial++]
    if (n === 0) return null
    if (n & 0x80) n = ((n & 0x7f) << 8) | gvar[serial++]
    const pts = []
    let last = 0
    while (pts.length < n) {
      const ctl = gvar[serial++]
      const run = (ctl & 0x7f) + 1
      for (let r = 0; r < run && pts.length < n; r++) {
        const v = ctl & 0x80 ? gvar.readUInt16BE((serial += 2) - 2) : gvar[serial++]
        last += v
        pts.push(last)
      }
    }
    return pts
  }
  const readDeltas = (n) => {
    const out = []
    while (out.length < n) {
      const ctl = gvar[serial++]
      const run = (ctl & 0x3f) + 1
      for (let r = 0; r < run && out.length < n; r++) {
        if (ctl & 0x80) out.push(0)
        else if (ctl & 0x40) { out.push(gvar.readInt16BE(serial)); serial += 2 }
        else { out.push(gvar.readInt8(serial)); serial += 1 }
      }
    }
    return out
  }
  const sharedPoints = word & 0x8000 ? readPoints() : undefined
  for (let v = 0; v < count; v++) {
    const size = gvar.readUInt16BE(h), index = gvar.readUInt16BE(h + 2)
    h += 4
    let peak
    if (index & 0x8000) { peak = Array.from({ length: axisCount }, (_, a) => f2(h + a * 2)); h += axisCount * 2 }
    else peak = shared[index & 0x0fff]
    let lo = null, hi = null
    if (index & 0x4000) {
      lo = Array.from({ length: axisCount }, (_, a) => f2(h + a * 2)); h += axisCount * 2
      hi = Array.from({ length: axisCount }, (_, a) => f2(h + a * 2)); h += axisCount * 2
    }
    const next = serial + size
    let scalar = 1
    for (let a = 0; a < axisCount; a++) {
      const p = peak[a], c = coords[a]
      if (p === 0) continue
      if (c === 0 || (c < 0) !== (p < 0)) { scalar = 0; break }
      if (lo) {
        if (c < lo[a] || c > hi[a]) { scalar = 0; break }
        if (c < p) scalar *= (c - lo[a]) / (p - lo[a])
        else if (c > p) scalar *= (hi[a] - c) / (hi[a] - p)
      } else if (Math.abs(c) < Math.abs(p)) scalar *= c / p
      else if (Math.abs(c) > Math.abs(p)) { scalar = 0; break }
    }
    if (scalar !== 0) {
      const pts = index & 0x2000 ? readPoints() : sharedPoints
      const n = pts ? pts.length : total
      const xs = readDeltas(n), ys = readDeltas(n)
      const tx = new Float64Array(total), ty = new Float64Array(total), touched = new Uint8Array(total)
      for (let i = 0; i < n; i++) { const p = pts ? pts[i] : i; if (p < total) { tx[p] = xs[i]; ty[p] = ys[i]; touched[p] = 1 } }
      if (pts && outline) interpolateUntouched(outline, tx, ty, touched)
      for (let i = 0; i < total; i++) { dx[i] += tx[i] * scalar; dy[i] += ty[i] * scalar }
    }
    serial = next
  }
  return { dx, dy }
}

/** IUP: an untouched point takes its delta from the touched points either side of it in its contour. */
function interpolateUntouched(contours, tx, ty, touched) {
  let base = 0
  for (const c of contours) {
    const n = c.length
    const idx = []
    for (let i = 0; i < n; i++) if (touched[base + i]) idx.push(i)
    if (idx.length === 0) { base += n; continue }
    if (idx.length === 1) {
      for (let i = 0; i < n; i++) if (!touched[base + i]) { tx[base + i] = tx[base + idx[0]]; ty[base + i] = ty[base + idx[0]] }
      base += n; continue
    }
    for (let k = 0; k < idx.length; k++) {
      const a = idx[k], b = idx[(k + 1) % idx.length]
      for (let i = (a + 1) % n; i !== b; i = (i + 1) % n) {
        for (const [axis, d] of [['x', tx], ['y', ty]]) {
          const pa = c[a][axis], pb = c[b][axis], pi = c[i][axis]
          const da = d[base + a], db = d[base + b]
          let v
          if (pa === pb) v = da === db ? da : 0
          else {
            const [lo, dlo, hi, dhi] = pa < pb ? [pa, da, pb, db] : [pb, db, pa, da]
            v = pi <= lo ? dlo : pi >= hi ? dhi : dlo + ((pi - lo) * (dhi - dlo)) / (hi - lo)
          }
          d[base + i] = v
        }
      }
    }
    base += n
  }
}

/**
 * A font from WOFF2 bytes, optionally at a variation instance ({ wght: 700 }).
 * Returns { unitsPerEm, ascender, descender, glyph(codepoint) -> { advance, contours } }.
 */
export function loadFont(bytes, axes = {}) {
  const T = woff2Tables(bytes)
  if (!T.glyf?.transformed) throw new Error('expected a WOFF2 with a transformed glyf table')
  const unitsPerEm = T.head.data.readUInt16BE(18)
  const hhea = T.hhea.data
  const ascender = hhea.readInt16BE(4), descender = hhea.readInt16BE(6)
  const nMetrics = hhea.readUInt16BE(34)
  const hm = T.hmtx.data
  const advanceOf = T.hmtx.transformed
    ? (g) => hm.readUInt16BE(1 + Math.min(g, nMetrics - 1) * 2)
    : (g) => hm.readUInt16BE(Math.min(g, nMetrics - 1) * 4)
  const cmap = cmapOf(T.cmap.data)
  const raw = transformedGlyphs(T.glyf.data)
  // Normalized axis coordinates from fvar (and avar, when the font has one).
  let coords = null
  if (T.fvar && T.gvar && Object.keys(axes).length) {
    const fv = T.fvar.data
    const at = fv.readUInt16BE(4), count = fv.readUInt16BE(8), size = fv.readUInt16BE(10)
    coords = []
    for (let a = 0; a < count; a++) {
      const q = at + a * size
      const tag = fv.toString('latin1', q, q + 4)
      const min = fv.readInt32BE(q + 4) / 65536, def = fv.readInt32BE(q + 8) / 65536, max = fv.readInt32BE(q + 12) / 65536
      const v = Math.min(max, Math.max(min, axes[tag] ?? def))
      let n = v < def ? (v - def) / (def - min) : v > def ? (v - def) / (max - def) : 0
      if (T.avar) n = avarMap(T.avar.data, a, n)
      coords.push(n)
    }
    if (coords.every((c) => c === 0)) coords = null
  }
  const cache = new Map()
  const outline = (gid, depth = 0) => {
    if (cache.has(gid)) return cache.get(gid)
    const g = raw[gid] ?? { contours: [], components: [] }
    let contours = g.contours
    let advance = advanceOf(gid)
    if (g.components.length && depth < 8) {
      contours = g.components.flatMap((c) => outline(c.glyph, depth + 1).contours.map((pts) => pts.map((p) => ({ x: c.m[0] * p.x + c.m[2] * p.y + c.dx, y: c.m[1] * p.x + c.m[3] * p.y + c.dy, on: p.on }))))
    } else if (coords && g.contours.length) {
      const n = g.contours.reduce((s, c) => s + c.length, 0)
      const { dx, dy } = gvarDeltas(T.gvar.data, gid, coords, g.contours, n)
      let i = 0
      contours = g.contours.map((c) => c.map((p) => ({ x: p.x + dx[i], y: p.y + dy[i++], on: p.on })))
      advance += dx[n + 1] - dx[n]
    } else if (coords) {
      const { dx } = gvarDeltas(T.gvar.data, gid, coords, [], 0)
      advance += dx[1] - dx[0]
    }
    const out = { advance, contours }
    cache.set(gid, out)
    return out
  }
  return {
    unitsPerEm, ascender, descender,
    glyph: (cp) => outline(cmap.get(cp) ?? cmap.get(0x3f) ?? 0),
  }
}

function avarMap(avar, axis, n) {
  let o = 8
  for (let a = 0; a < axis; a++) o += 2 + avar.readUInt16BE(o) * 4
  const count = avar.readUInt16BE(o)
  const map = Array.from({ length: count }, (_, i) => [avar.readInt16BE(o + 2 + i * 4) / 16384, avar.readInt16BE(o + 4 + i * 4) / 16384])
  for (let i = 1; i < map.length; i++) {
    if (n <= map[i][0]) {
      const [a0, b0] = map[i - 1], [a1, b1] = map[i]
      return a1 === a0 ? b0 : b0 + ((n - a0) * (b1 - b0)) / (a1 - a0)
    }
  }
  return n
}

// ------------------------------------------------------------------------------- rasterizer

/** A grey canvas: luminance 0 (black) .. 1 (white), one float per pixel. */
export function canvas(width, height, background = 0) {
  return { width, height, px: new Float64Array(width * height).fill(background) }
}

export function fillRect(cv, x, y, w, h, lum) {
  for (let j = Math.max(0, y); j < Math.min(cv.height, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(cv.width, x + w); i++) cv.px[j * cv.width + i] = lum
}

const SUB = 4 // sub-scanlines per pixel row
const CURVE_STEPS = 8 // line segments per quadratic

/** Line segments of a glyph's contours placed at (x, baseline) and scaled to `size` pixels per em. */
function edgesOf(glyph, x, baseline, scale) {
  const edges = []
  for (const c of glyph.contours) {
    if (c.length < 2) continue
    const P = c.map((p) => ({ x: x + p.x * scale, y: baseline - p.y * scale, on: p.on }))
    // Start on an on-curve point; between two off-curve points there is an implied on-curve midpoint.
    let s = P.findIndex((p) => p.on)
    let pts = P
    if (s < 0) { const m = { x: (P[0].x + P[1].x) / 2, y: (P[0].y + P[1].y) / 2, on: true }; pts = [m, ...P.slice(1), P[0]]; s = 0 }
    const ring = [...pts.slice(s), ...pts.slice(0, s)]
    let cur = ring[0]
    let ctrl = null
    const line = (a, b) => { if (a.y !== b.y) edges.push([a.x, a.y, b.x, b.y]) }
    const quad = (a, q, b) => {
      let prev = a
      for (let k = 1; k <= CURVE_STEPS; k++) {
        const t = k / CURVE_STEPS, u = 1 - t
        const p = { x: u * u * a.x + 2 * u * t * q.x + t * t * b.x, y: u * u * a.y + 2 * u * t * q.y + t * t * b.y }
        line(prev, p)
        prev = p
      }
    }
    for (let i = 1; i <= ring.length; i++) {
      const p = ring[i % ring.length]
      if (p.on) { if (ctrl) quad(cur, ctrl, p); else line(cur, p); cur = p; ctrl = null }
      else if (ctrl) { const m = { x: (ctrl.x + p.x) / 2, y: (ctrl.y + p.y) / 2 }; quad(cur, ctrl, m); cur = m; ctrl = p }
      else ctrl = p
    }
    if (ctrl) quad(cur, ctrl, ring[0])
  }
  return edges
}

/** Fills edges (nonzero winding) and blends `lum` into the canvas by coverage. */
function fillEdges(cv, edges, lum) {
  if (!edges.length) return
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity
  for (const e of edges) { y0 = Math.min(y0, e[1], e[3]); y1 = Math.max(y1, e[1], e[3]); x0 = Math.min(x0, e[0], e[2]); x1 = Math.max(x1, e[0], e[2]) }
  const top = Math.max(0, Math.floor(y0)), bottom = Math.min(cv.height - 1, Math.ceil(y1))
  const left = Math.max(0, Math.floor(x0)), right = Math.min(cv.width, Math.ceil(x1) + 1)
  const row = new Float64Array(right - left + 1)
  for (let py = top; py <= bottom; py++) {
    row.fill(0)
    for (let s = 0; s < SUB; s++) {
      const yc = py + (s + 0.5) / SUB
      const xs = []
      for (const [ax, ay, bx, by] of edges) {
        if ((ay <= yc && yc < by) || (by <= yc && yc < ay)) xs.push([ax + ((yc - ay) * (bx - ax)) / (by - ay), by > ay ? 1 : -1])
      }
      xs.sort((a, b) => a[0] - b[0] || a[1] - b[1])
      // Walk once: a span opens when the winding leaves 0 and closes when it returns.
      let wind = 0
      let from = 0
      for (const [x, d] of xs) {
        const was = wind
        wind += d
        if (was === 0 && wind !== 0) from = x
        else if (was !== 0 && wind === 0) addSpan(row, from - left, x - left, 1 / SUB)
      }
    }
    for (let i = 0; i < row.length; i++) {
      const c = Math.min(1, row[i])
      if (c <= 0) continue
      const at = py * cv.width + left + i
      if (left + i >= cv.width) break
      cv.px[at] = cv.px[at] * (1 - c) + lum * c
    }
  }
}

function addSpan(row, a, b, weight) {
  if (b <= a) return
  a = Math.max(0, a); b = Math.min(row.length, b)
  for (let i = Math.floor(a); i < Math.ceil(b); i++) row[i] += (Math.min(b, i + 1) - Math.max(a, i)) * weight
}

export const measure = (font, text, size) => [...text].reduce((w, ch) => w + font.glyph(ch.codePointAt(0)).advance, 0) * (size / font.unitsPerEm)

/** Draws one line of text with its baseline at y; returns the x after the last glyph. */
export function drawText(cv, font, text, x, y, size, lum, { tracking = 0 } = {}) {
  const scale = size / font.unitsPerEm
  let pen = x
  for (const ch of text) {
    const g = font.glyph(ch.codePointAt(0))
    fillEdges(cv, edgesOf(g, pen, y, scale), lum)
    pen += g.advance * scale + tracking
  }
  return pen
}

/** Greedy word wrap to a pixel width. */
export function wrap(font, text, size, width) {
  const lines = []
  let cur = ''
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word
    if (cur && measure(font, next, size) > width) { lines.push(cur); cur = word }
    else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

// ------------------------------------------------------------------------------- PNG

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const adler32 = (buf) => { let a = 1, b = 0; for (const x of buf) { a = (a + x) % 65521; b = (b + a) % 65521 } return ((b << 16) | a) >>> 0 }

const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
const LEXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]
const DEXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]

/**
 * zlib stream of `data`: one fixed-Huffman deflate block, LZ77 matches only at distance 1 (a run)
 * and at distance `stride` (the row above). Small for a card that is mostly one colour, and the
 * same bytes on every machine, which a zlib build does not promise.
 */
export function deflateFixed(data, stride) {
  const out = [0x78, 0x01]
  let acc = 0, nbits = 0
  const bits = (v, n) => { for (let i = 0; i < n; i++) { acc |= ((v >> i) & 1) << nbits; if (++nbits === 8) { out.push(acc); acc = 0; nbits = 0 } } }
  const huff = (code, len) => { for (let i = len - 1; i >= 0; i--) bits((code >> i) & 1, 1) }
  const lit = (s) => (s < 144 ? huff(0x30 + s, 8) : s < 256 ? huff(0x190 + s - 144, 9) : s < 280 ? huff(s - 256, 7) : huff(0xc0 + s - 280, 8))
  const last = (table, v) => { let i = table.length - 1; while (table[i] > v) i--; return i }
  bits(1, 1); bits(1, 2)
  const n = data.length
  for (let i = 0; i < n;) {
    let best = 0, dist = 0
    for (const d of [1, stride]) {
      if (d > i) continue
      let l = 0
      while (l < 258 && i + l < n && data[i + l] === data[i + l - d]) l++
      if (l > best) { best = l; dist = d }
    }
    if (best >= 3) {
      const li = last(LBASE, best)
      lit(257 + li); bits(best - LBASE[li], LEXTRA[li])
      const di = last(DBASE, dist)
      huff(di, 5); bits(dist - DBASE[di], DEXTRA[di])
      i += best
    } else lit(data[i++])
  }
  lit(256)
  if (nbits) out.push(acc)
  const a = adler32(data)
  out.push(a >>> 24, (a >>> 16) & 255, (a >>> 8) & 255, a & 255)
  return Buffer.from(out)
}

const chunk = (type, body) => {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(body.length, 0)
  head.write(type, 4, 'latin1')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0)
  return Buffer.concat([head, body, crc])
}

/** An 8-bit greyscale PNG of a canvas, with tEXt chunks. */
export function encodePng(cv, text = {}) {
  const { width, height, px } = cv
  const raw = Buffer.alloc((width + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0
    for (let x = 0; x < width; x++) raw[y * (width + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(px[y * width + x] * 255)))
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    ...Object.entries(text).map(([k, v]) => chunk('tEXt', Buffer.from(`${k}\0${v}`, 'latin1'))),
    chunk('IDAT', deflateFixed(raw, width + 1)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** The tEXt chunks of a PNG, as an object. */
export function pngText(bytes) {
  const out = {}
  for (let o = 8; o + 8 <= bytes.length;) {
    const len = bytes.readUInt32BE(o), type = bytes.toString('latin1', o + 4, o + 8)
    if (type === 'tEXt') { const s = bytes.toString('latin1', o + 8, o + 8 + len); const z = s.indexOf('\0'); out[s.slice(0, z)] = s.slice(z + 1) }
    if (type === 'IEND') break
    o += 12 + len
  }
  return out
}

/** The pixels of a PNG this file wrote (8-bit grey, filter 0), for tests. */
export function decodeOwnPng(bytes) {
  const { width, height } = pngSize(bytes)
  let o = 8
  const idat = []
  while (o < bytes.length) {
    const len = bytes.readUInt32BE(o), type = bytes.toString('latin1', o + 4, o + 8)
    if (type === 'IDAT') idat.push(bytes.subarray(o + 8, o + 8 + len))
    o += 12 + len
  }
  return { width, height, raw: inflateSync(Buffer.concat(idat)) }
}

// ------------------------------------------------------------------------------- the card

const WHITE = 1, GREY = 0.62, RULE = 0.28
const M = 64 // margin

/** The card for one tool: its words, the gallery's words around them, the fonts. Returns PNG bytes. */
export function drawCard({ tool, gallery, fonts }) {
  const { width, height } = CARD
  const cv = canvas(width, height, 0)
  // Frame and rule.
  fillRect(cv, 16, 16, width - 32, 1, RULE); fillRect(cv, 16, height - 17, width - 32, 1, RULE)
  fillRect(cv, 16, 16, 1, height - 32, RULE); fillRect(cv, width - 17, 16, 1, height - 32, RULE)
  fillRect(cv, M, height - 108, width - 2 * M, 1, RULE)
  // Kicker: brand / category, in the mono face, spaced.
  const cat = gallery.CATEGORY_NAMES[gallery.CATEGORY_IDS.indexOf(tool.CATEGORY)] ?? tool.CATEGORY
  drawText(cv, fonts.mono, `${gallery.TOOL_BRAND}  /  ${cat}`.toUpperCase(), M, 76, 22, WHITE, { tracking: 2 })
  // Title, as large as fits in three lines; the line under it, as large as fits in the rest.
  const textW = width - 2 * M
  const bodyTop = 112, bodyBottom = height - 140
  let layout = null
  for (const [ts, ds] of [[76, 30], [68, 30], [62, 28], [56, 28], [50, 26], [46, 24], [42, 22]]) {
    const tl = wrap(fonts.display, tool.TITLE, ts, textW)
    const dl = wrap(fonts.mono, tool.DESCRIPTION, ds, textW)
    const h = tl.length * ts * 1.08 + 28 + dl.length * ds * 1.38 // a little over the real height: room to spare
    layout = { ts, ds, tl, dl }
    if (tl.length <= 3 && bodyTop + h <= bodyBottom) break
  }
  let y = bodyTop + layout.ts * 0.92
  for (const [i, l] of layout.tl.entries()) { if (i) y += layout.ts * 1.08; drawText(cv, fonts.display, l, M, Math.round(y), layout.ts, WHITE) }
  y += layout.ts * 0.25 + 28 + layout.ds * 0.9
  for (const l of layout.dl) { if (y > bodyBottom + layout.ds) break; drawText(cv, fonts.mono, l, M, Math.round(y), layout.ds, GREY); y += layout.ds * 1.38 }
  // Foot: where the widget lives, and the spec it was drawn from.
  const url = `${gallery.ORIGIN.replace(/^https?:\/\//, '')}widgets/${tool.ID}`
  drawText(cv, fonts.mono, url, M, height - 58, 26, WHITE)
  const src = `${SPEC_DIR}/${tool.ID}.t27`
  drawText(cv, fonts.mono, src, width - M - measure(fonts.mono, src, 18), height - 60, 18, GREY)
  return encodePng(cv, { Software: GENERATOR, Source: src })
}

/** The fonts a card is drawn in, from the site's own files. */
export function loadFonts(root = SITE) {
  return {
    display: loadFont(readFileSync(join(root, FONTS.display)), { wght: 700 }),
    mono: loadFont(readFileSync(join(root, FONTS.mono)), { wght: 500 }),
  }
}

// ------------------------------------------------------------------------------- the gallery

const valuesOf = (analysis) => Object.fromEntries(Object.entries(constsOf(analysis)).map(([k, v]) => [k, v.value]))

/** Every tool widget the gallery lists, with its spec's words: [{ id, tool }] plus the gallery words. */
export function galleryTools(analyze, root = SITE) {
  const gallery = valuesOf(analyze(readFileSync(join(root, GALLERY_SPEC), 'utf8')))
  const problems = []
  const tools = []
  gallery.WIDGET_IDS.forEach((id, i) => {
    if (gallery.WIDGET_KINDS[i] !== 'tool') return
    const file = `${SPEC_DIR}/${id}.t27`
    if (!existsSync(join(root, file))) { problems.push(`${GALLERY_SPEC}: tool ${id} has no ${file}`); return }
    const tool = valuesOf(analyze(readFileSync(join(root, file), 'utf8')))
    for (const k of ['ID', 'TITLE', 'DESCRIPTION', 'CATEGORY']) if (typeof tool[k] !== 'string' || !tool[k].trim()) problems.push(`${file}: ${k} is missing or empty`)
    tools.push({ id, tool })
  })
  return { gallery, tools, problems }
}

/** What --check says about one card: null when it is fine. */
export function cardProblem({ id, tool }, gallery, fonts, root = SITE) {
  const path = join(root, cardOut(id))
  if (!existsSync(path)) return `${cardOut(id)} is missing; run npm run cards:widgets`
  const bytes = readFileSync(path)
  const size = pngSize(bytes)
  if (!size || size.width !== CARD.width || size.height !== CARD.height) return `${cardOut(id)} must be a ${CARD.width}x${CARD.height} PNG`
  if (pngText(bytes).Software !== GENERATOR) return null // drawn by hand: held to being present only
  if (!drawCard({ tool, gallery, fonts }).equals(bytes)) return `${cardOut(id)} is stale: specs/widgets/${id}.t27 or the gallery says something else now; run npm run cards:widgets -- --id ${id}`
  return null
}

async function main() {
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const all = args.includes('--all')
  const idAt = args.indexOf('--id')
  const only = idAt >= 0 ? args[idAt + 1] : null
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const { gallery, tools, problems } = galleryTools(analyze)
  if (only && !tools.some((t) => t.id === only)) problems.push(`--id ${only}: no tool widget of that id in ${GALLERY_SPEC}`)
  if (problems.length) { for (const p of problems) console.error('  ' + p); process.exit(1) }
  const fonts = loadFonts()
  if (check) {
    const bad = tools.map((t) => cardProblem(t, gallery, fonts)).filter(Boolean)
    if (bad.length) {
      console.error(`${GENERATOR} --check: ${bad.length} problem(s)`)
      for (const p of bad) console.error('  ' + p)
      process.exit(1)
    }
    const drawn = tools.filter((t) => pngText(readFileSync(join(SITE, cardOut(t.id)))).Software === GENERATOR).length
    console.log(`${GENERATOR}: up to date; ${tools.length} tool card(s), ${drawn} drawn from spec and current, ${tools.length - drawn} drawn by hand and present`)
    return
  }
  const targets = tools.filter((t) => (only ? t.id === only : all || !existsSync(join(SITE, cardOut(t.id)))))
  const written = []
  for (const t of targets) {
    const png = drawCard({ tool: t.tool, gallery, fonts })
    const path = join(SITE, cardOut(t.id))
    if (existsSync(path) && readFileSync(path).equals(png)) continue
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, png)
    written.push(`${cardOut(t.id)} (${png.length} bytes)`)
  }
  console.log(`${GENERATOR}: drew ${written.length} card(s)${written.length ? `: ${written.join(', ')}` : ''}; ${tools.length} tool widget(s) in the gallery`)
  if (written.length) execFileSync(process.execPath, [join(SITE, 'scripts/widget-pages-from-spec.mjs')], { cwd: SITE, stdio: 'inherit' })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
