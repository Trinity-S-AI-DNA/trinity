// SPDX-License-Identifier: Apache-2.0
// skyline.js -- the counting behind the fasm-skyline widget, shared by the page (tool.js) and the
// data script (scripts/widget-data/fasm-skyline.mjs), so the sample numbers on the page are the
// numbers this code computes. No words here: every word on screen is a SAY_ constant of
// specs/widgets/fasm-skyline.t27.

const TILE_RE = /^([A-Z0-9_]+)_X(\d+)Y(\d+)$/

/** True when the value after '=' is zero, so the line clears a feature instead of setting it. */
function zeroValue(v) {
  const s = v.replace(/_/g, '').trim()
  const m = /^(\d+)?'([bhdo])([0-9a-f]+)$/i.exec(s)
  if (m) return /^0+$/.test(m[3])
  return /^0+$/.test(s)
}

/**
 * Counts the features a FASM text sets in each tile. One feature is one FASM line (a 64-bit LUT
 * INIT counts once); the tile is the text before the first '.'. Comments ('#' to end of line) and
 * annotations ('{...}') are dropped; a line whose value is zero clears a feature and is counted
 * apart. Returns { features, comments, cleared, header, tiles: Map(name -> count), bad: [lines] }.
 */
export function parseFasm(text) {
  const tiles = new Map()
  const bad = []
  const header = []
  let features = 0, comments = 0, cleared = 0
  let start = 0
  const n = text.length
  while (start <= n) {
    let end = text.indexOf('\n', start)
    if (end < 0) end = n
    let line = text.slice(start, end)
    start = end + 1
    const hash = line.indexOf('#')
    if (hash >= 0) {
      const c = line.slice(hash + 1).trim()
      if (!line.slice(0, hash).trim()) { comments++; if (header.length < 8 && c) header.push(c) }
      line = line.slice(0, hash)
    }
    line = line.replace(/\{[^}]*\}/g, '').trim()
    if (!line) continue
    const eq = line.indexOf('=')
    const name = (eq >= 0 ? line.slice(0, eq) : line).trim()
    if (eq >= 0 && zeroValue(line.slice(eq + 1))) { cleared++; continue }
    const dot = name.indexOf('.')
    const tile = dot > 0 ? name.slice(0, dot) : ''
    if (!TILE_RE.test(tile)) { if (bad.length < 200) bad.push(line); continue }
    features++
    tiles.set(tile, (tiles.get(tile) || 0) + 1)
  }
  return { features, comments, cleared, header, tiles, bad }
}

/** Expands the [k0, v0, n, dk, dv] segments of grid.json into a Map k -> v. */
function expand(segs) {
  const m = new Map()
  for (const [k0, v0, n, dk, dv] of segs) for (let i = 0; i < n; i++) m.set(k0 + i * dk, v0 + i * dv)
  return m
}

/**
 * Decodes grid.json: the tile type at every grid cell (from the column run-lengths) and a lookup
 * from a tile name to its grid cell. A name resolves only when the cell it maps to holds a tile of
 * that type, so a name that is not a tile of this die returns null.
 */
export function decodeGrid(g) {
  const cells = new Uint8Array(g.w * g.h)
  let i = 0
  for (let r = 0; r < g.rle.length; r += 2) { cells.fill(g.rle[r], i, i + g.rle[r + 1]); i += g.rle[r + 1] }
  if (i !== g.w * g.h) throw new Error('grid.json: run lengths cover ' + i + ' cells, not ' + g.w * g.h)
  const typeIndex = new Map(g.types.map((t, k) => [t, k]))
  const xmaps = new Map(Object.entries(g.x).map(([p, s]) => [p, expand(s)]))
  const ymaps = new Map(Object.entries(g.y).map(([p, s]) => [p, expand(s)]))
  const at = (gx, gy) => cells[gx * g.h + gy]
  function lookup(name) {
    const ex = g.except[name]
    let type, gx, gy
    if (ex) { [gx, gy] = ex; type = name.replace(/_X\d+Y\d+$/, '') }
    else {
      const m = TILE_RE.exec(name)
      if (!m) return null
      type = m[1]
      gx = xmaps.get(type)?.get(+m[2])
      gy = ymaps.get(type)?.get(+m[3])
      if (gx === undefined || gy === undefined) return null
    }
    const t = typeIndex.get(type)
    if (t === undefined || at(gx, gy) !== t) return null
    return { gx, gy, type, t }
  }
  return { w: g.w, h: g.h, cells, at, lookup, types: g.types, bits: g.bits }
}

/** The family index of a tile type: the first prefix that matches, else the last family. */
export function familyOf(type, prefixes, families, famNames) {
  for (let i = 0; i < prefixes.length; i++) if (type.startsWith(prefixes[i])) return famNames.indexOf(families[i])
  return famNames.length - 1
}

/**
 * Places counted tiles on the die and totals them. Returns { cols: [{name, gx, gy, type, fam, n}],
 * off: [[name, n]], features, placedFeatures, tiles, famTiles, famFeatures, tallest }.
 */
export function summarize(parsed, grid, famOfType, nFam) {
  const cols = [], off = []
  const famTiles = new Array(nFam).fill(0), famFeatures = new Array(nFam).fill(0)
  let placedFeatures = 0, tallest = null
  const names = [...parsed.tiles.keys()].sort()
  for (const name of names) {
    const n = parsed.tiles.get(name)
    const p = grid.lookup(name)
    if (!p) { off.push([name, n]); continue }
    const fam = famOfType(p.type)
    cols.push({ name, gx: p.gx, gy: p.gy, type: p.type, fam, n })
    famTiles[fam]++
    famFeatures[fam] += n
    placedFeatures += n
    if (!tallest || n > tallest.n) tallest = cols[cols.length - 1]
  }
  return { cols, off, features: parsed.features, placedFeatures, tiles: cols.length, famTiles, famFeatures, tallest }
}
