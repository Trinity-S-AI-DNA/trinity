// SPDX-License-Identifier: Apache-2.0
// treemap.js -- reads the JSON that yosys `stat -json` prints for a design that was NOT flattened,
// multiplies each module's own cells by how many times it is instantiated under the top, and lays
// the result out as a squarified treemap. One file, run in the reader's browser by tool.js and in
// node by scripts/widget-data/lut-treemap.mjs for the shipped sample and its checks. No DOM here.
//
// What yosys 0.67 prints, read from real runs (sample.stat.json in this directory):
//   modules["\\name"].num_cells_by_type  the module's own cells by type, AND one entry per
//                                         submodule type it instantiates: { "gf16_add": 3 }.
//                                         The submodule entry is a count of instances, not cells.
//   design.num_cells_by_type             yosys's own hierarchy-expanded total; it still lists the
//                                         top's direct submodule entries, which are skipped here.
// Module keys carry a leading backslash ("\\gf16_add"); the same module as a cell type does not.
// Parameterised modules are "$paramod\\leaf\\W=s32'...0100" in both places. Older yosys prints
// "cells" for the per-type map; that key is read the same way but was not checked here.
//
// Which cell type is a LUT, a flip-flop, a DSP or a block RAM comes in as `lists` from the spec
// (K_LUT_TYPES, K_FF_TYPES, K_DSP_TYPES, K_BRAM_TYPES, K_INTERNAL_TYPES); this file holds none.

export const METRICS = ['lut', 'ff', 'dsp', 'bram']

/** The JSON object inside `text`: all of it, or the span from its first `{` to its last `}`. */
function jsonOf(text) {
  const t = String(text ?? '').trim()
  if (!t) return { error: 'empty' }
  try { return { json: JSON.parse(t) } } catch { /* fall through to the span */ }
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  if (a < 0 || b <= a) return { error: 'nojson' }
  try { return { json: JSON.parse(t.slice(a, b + 1)) } } catch { return { error: 'badjson' } }
}

const byTypeOf = (m) => {
  if (m && typeof m.num_cells_by_type === 'object' && m.num_cells_by_type) return { map: m.num_cells_by_type, key: 'num_cells_by_type' }
  if (m && typeof m.cells === 'object' && m.cells) return { map: m.cells, key: 'cells' }
  return null
}
export const bare = (name) => String(name).replace(/^\\/, '')

/** "$paramod\\leaf\\W=s32'0...0100" -> "leaf W=4"; "\\gf16_add" -> "gf16_add". */
export function displayName(name) {
  const n = bare(name)
  if (!n.startsWith('$paramod')) return n
  const parts = n.split('\\')
  const base = parts[1] ?? n
  const params = parts.slice(2).map((p) => {
    const m = /^([^=]+)=(s?)(\d+)'([01]+)$/.exec(p)
    if (!m) return p
    let v = parseInt(m[4], 2)
    if (m[2] === 's' && m[4].length > 1 && m[4][0] === '1') v -= 2 ** m[4].length
    return `${m[1]}=${v}`
  })
  return [base, ...params].join(' ')
}

const zero = () => ({ lut: 0, ff: 0, dsp: 0, bram: 0, other: 0 })

/** Cell counts of one per-type map, split into the metric groups; submodule entries returned apart. */
function splitTypes(map, group, isModule) {
  const own = zero()
  const subs = []
  for (const [type, raw] of Object.entries(map)) {
    const n = Number(raw) || 0
    if (isModule(type)) { subs.push({ name: bare(type), count: n }); continue }
    const g = group[type]
    if (g === 'internal') continue
    own[g ?? 'other'] += n
  }
  return { own, subs }
}

/**
 * parseHier(text, lists) -> {
 *   ok, error?, version, creator, key,
 *   modules: { [name]: { name, display, own: {lut,ff,dsp,bram,other}, subs: [{ name, count }] } },
 *   order: [name] in the order yosys printed them,
 *   top, roots: [name], flat (no module instantiates another),
 *   design: {lut,ff,dsp,bram,other} | null   (yosys's own total, submodule entries skipped)
 * }
 */
export function parseHier(text, lists) {
  const { json, error } = jsonOf(text)
  if (error) return { ok: false, error }
  if (!json || typeof json !== 'object' || typeof json.modules !== 'object' || !json.modules) return { ok: false, error: 'nomodules' }
  const creator = typeof json.creator === 'string' ? json.creator : null
  const version = creator ? (/^Yosys\s+(\S+)/.exec(creator)?.[1] ?? null) : null
  const group = {}
  const put = (arr, g) => { for (const t of arr ?? []) group[t] = g }
  put(lists.lut, 'lut'); put(lists.ff, 'ff'); put(lists.dsp, 'dsp'); put(lists.bram, 'bram'); put(lists.internal, 'internal')
  const order = Object.keys(json.modules).map(bare)
  const known = new Set(order)
  const isModule = (t) => known.has(bare(t))
  const modules = {}
  let key = null
  for (const [k, m] of Object.entries(json.modules)) {
    const bt = byTypeOf(m)
    if (!bt) continue
    key = key ?? bt.key
    const name = bare(k)
    const { own, subs } = splitTypes(bt.map, group, isModule)
    modules[name] = { name, display: displayName(name), own, subs }
  }
  if (!Object.keys(modules).length) return { ok: false, error: 'nocells', version, creator }
  const used = new Set()
  for (const m of Object.values(modules)) for (const s of m.subs) used.add(s.name)
  const roots = order.filter((n) => modules[n] && !used.has(n))
  if (!roots.length) return { ok: false, error: 'notop', version, creator }
  const dbt = json.design && byTypeOf(json.design)
  const design = dbt ? splitTypes(dbt.map, group, isModule).own : null
  const flat = Object.values(modules).every((m) => m.subs.length === 0)
  const r = { ok: true, version, creator, key, modules, order: order.filter((n) => modules[n]), roots, flat, design, top: roots[0] }
  // More than one root (a stat run without -top, or dead modules): take the one whose expanded
  // total is yosys's design total; failing that, the one holding the most cells.
  if (roots.length > 1) {
    const sumOf = (t) => METRICS.reduce((s, k) => s + t[k], 0) + t.other
    const match = design ? roots.find((n) => sameTotals(totalsOf(r, n), design)) : null
    r.top = match ?? [...roots].sort((a, b) => sumOf(totalsOf(r, b)) - sumOf(totalsOf(r, a)))[0]
  }
  return r
}

export const sameTotals = (a, b) => [...METRICS, 'other'].every((k) => a[k] === b[k])

/** Cells under one instance of `name`, its submodules expanded (memoised on the parse). */
export function totalsOf(r, name, stack = new Set()) {
  r._memo = r._memo ?? {}
  if (r._memo[name]) return r._memo[name]
  const m = r.modules[name]
  const out = zero()
  if (!m || stack.has(name)) return out
  stack.add(name)
  for (const k of [...METRICS, 'other']) out[k] = m.own[k]
  for (const s of m.subs) {
    const t = totalsOf(r, s.name, stack)
    for (const k of [...METRICS, 'other']) out[k] += s.count * t[k]
  }
  stack.delete(name)
  r._memo[name] = out
  return out
}

/**
 * How many instances of each module sit under one top, all paths added up:
 * inst[top] = 1; inst[child] = sum over parents p of inst[p] * (instances of child inside p).
 * Walked in topological order, so a module reached by two paths is counted on both.
 */
export function instancesOf(r, top = r.top) {
  const seen = new Set()
  const post = []
  const visit = (n) => {
    if (seen.has(n) || !r.modules[n]) return
    seen.add(n)
    for (const s of r.modules[n].subs) visit(s.name)
    post.push(n)
  }
  visit(top)
  const inst = Object.fromEntries(post.map((n) => [n, 0]))
  inst[top] = 1
  for (const n of post.reverse()) for (const s of r.modules[n].subs) if (s.name in inst) inst[s.name] += inst[n] * s.count
  return inst
}

/**
 * One row per module under the top: { name, display, instances, each: own cells of one instance,
 * total: instances x each }. The rows' totals add up to the top's expanded total, metric by metric.
 */
export function moduleRows(r, top = r.top) {
  const inst = instancesOf(r, top)
  return r.order.filter((n) => n in inst).map((n) => {
    const m = r.modules[n]
    const total = zero()
    for (const k of [...METRICS, 'other']) total[k] = inst[n] * m.own[k]
    return { name: n, display: m.display, instances: inst[n], each: { ...m.own }, total }
  })
}

/**
 * The tree the treemap draws, for one metric. A node is
 *   { id, name, display, copies, index, of, own, value, children[] }
 * where `copies` is how many instances this one tile stands for and `value` = copies x the cells
 * of one instance (own + submodules). A module's own cells, when it also has submodules, get a
 * child tile of their own (own: true), so the leaves always add up to the root's value.
 * Instances are drawn one tile each while a parent stands for one instance, the count is at most
 * opt.expandMax and the tile budget opt.maxTiles holds; otherwise they share one tile "xN".
 * Children with no cells of this metric are left out (a tile of area 0 cannot be drawn).
 */
export function viewTree(r, metric, opt = {}) {
  const expandMax = opt.expandMax ?? 64
  let budget = opt.maxTiles ?? 600
  let id = 0
  const per = (n) => totalsOf(r, n)[metric]
  const build = (name, copies, index, of, path) => {
    const m = r.modules[name]
    const node = { id: id++, name, display: m.display, copies, index, of, own: false, value: copies * per(name), path, children: [] }
    budget--
    const kids = m.subs.filter((s) => s.count > 0 && per(s.name) > 0).sort((a, b) => b.count * per(b.name) - a.count * per(a.name))
    if (!kids.length) return node
    if (m.own[metric] > 0) {
      node.children.push({ id: id++, name, display: m.display, copies, index: 0, of: 0, own: true, value: copies * m.own[metric], path, children: [] })
      budget--
    }
    for (const s of kids) {
      const each = copies === 1 && s.count <= expandMax && budget - s.count * (1 + r.modules[s.name].subs.length) >= 0
      if (each) for (let i = 1; i <= s.count; i++) node.children.push(build(s.name, 1, i, s.count, [...path, { name: s.name, index: i, of: s.count }]))
      else node.children.push(build(s.name, copies * s.count, 0, s.count, [...path, { name: s.name, index: 0, of: s.count }]))
    }
    return node
  }
  return build(r.top, 1, 0, 0, [])
}

/** The leaves of a view tree (tiles with no children), for the sum check. */
export function leavesOf(node, out = []) {
  if (!node.children.length) out.push(node)
  else for (const c of node.children) leavesOf(c, out)
  return out
}

// --- squarified layout (Bruls, Huizing, van Wijk 2000) --------------------------------------------

function worst(row, side) {
  const s = row.reduce((a, b) => a + b.area, 0)
  let max = 0
  for (const r of row) max = Math.max(max, (side * side * r.area) / (s * s), (s * s) / (side * side * r.area))
  return max
}

/** Places items ({ value }) in the rectangle; returns [{ item, x, y, w, h }]. */
export function squarify(items, x, y, w, h) {
  const total = items.reduce((a, b) => a + b.value, 0)
  if (total <= 0 || w <= 0 || h <= 0) return []
  const scale = (w * h) / total
  const rest = items.filter((i) => i.value > 0).map((item) => ({ item, area: item.value * scale })).sort((a, b) => b.area - a.area)
  const out = []
  let row = []
  const place = () => {
    const s = row.reduce((a, b) => a + b.area, 0)
    if (w >= h) {
      const cw = s / h
      let yy = y
      for (const r of row) { const rh = r.area / cw; out.push({ item: r.item, x, y: yy, w: cw, h: rh }); yy += rh }
      x += cw; w -= cw
    } else {
      const rh = s / w
      let xx = x
      for (const r of row) { const cw = r.area / rh; out.push({ item: r.item, x: xx, y, w: cw, h: rh }); xx += cw }
      y += rh; h -= rh
    }
    row = []
  }
  while (rest.length) {
    const next = rest[0]
    const side = Math.min(w, h)
    if (!row.length || worst([...row, next], side) <= worst(row, side)) { row.push(next); rest.shift() }
    else place()
  }
  if (row.length) place()
  return out
}

/**
 * Nested layout: every node a rectangle { node, x, y, w, h, depth, head }. A node with children
 * keeps a header strip of opt.head px for its label (when it is tall enough) and an inset of
 * opt.pad px; its children are squarified inside. Children too small to draw are not placed.
 */
export function layoutTree(root, x, y, w, h, opt = {}) {
  const head = opt.head ?? 16
  const pad = opt.pad ?? 2
  const out = []
  const go = (node, x, y, w, h, depth) => {
    const withKids = node.children.length > 0
    const hasHead = withKids && h >= head * 2.5 && w >= head * 3
    out.push({ node, x, y, w, h, depth, head: hasHead })
    if (!withKids) return
    const ix = x + pad
    const iy = y + (hasHead ? head : pad)
    const iw = w - 2 * pad
    const ih = h - (hasHead ? head : pad) - pad
    if (iw < 2 || ih < 2) return
    for (const p of squarify(node.children, ix, iy, iw, ih)) go(p.item, p.x, p.y, p.w, p.h, depth + 1)
  }
  go(root, x, y, w, h, 0)
  return out
}

/** The lists parseHier needs, from the spec's constants (window.T27_WIDGET, or the compiler in node). */
export const listsOf = (K) => ({
  lut: K.K_LUT_TYPES, ff: K.K_FF_TYPES, dsp: K.K_DSP_TYPES, bram: K.K_BRAM_TYPES, internal: K.K_INTERNAL_TYPES,
})
