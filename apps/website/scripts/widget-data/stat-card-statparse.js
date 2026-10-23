// SPDX-License-Identifier: Apache-2.0
// statparse.js -- reads the JSON that yosys `stat -json` prints and sorts its cell types into the
// four groups of the stat-card widget (public/widgets/stat-card/). One parser, run in the reader's
// browser by tool.js and in node by scripts/widget-data/stat-card.mjs for the shipped sample.
//
// It holds no list of its own: which cell type counts as a LUT, a flip-flop, a DSP or a block RAM
// comes in as `lists`, read from the spec (K_LUT_TYPES, K_FF_TYPES, K_DSP_TYPES, K_BRAM_TYPES,
// K_INTERNAL_TYPES). A type in none of them is "other", listed with its count, never dropped.
//
// Two shapes of the per-type map are read: `num_cells_by_type` (what yosys 0.67 prints, tested)
// and `cells` (the older key, read the same way, not tested on a real older yosys here).

/** The JSON object inside `text`: the whole text, or the span from its first `{` to its last `}`
 *  (so a pasted terminal capture with yosys log lines around the JSON still reads). */
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
const bare = (name) => String(name).replace(/^\\/, '')

/** The top module: the one no other module instantiates (first such, in yosys order). */
function topOf(modules) {
  const names = Object.keys(modules).map(bare)
  const used = new Set()
  for (const m of Object.values(modules)) for (const t of Object.keys(byTypeOf(m)?.map ?? {})) if (names.includes(bare(t))) used.add(bare(t))
  return names.find((n) => !used.has(n)) ?? names[0] ?? null
}

/** Leaf cell counts under `name`, submodule instances expanded (for a stat with no "design" block). */
function flatten(modules, name, seen = new Set()) {
  const key = Object.keys(modules).find((k) => bare(k) === name)
  const bt = byTypeOf(modules[key])
  const out = {}
  if (!bt || seen.has(name)) return out
  seen.add(name)
  for (const [t, n] of Object.entries(bt.map)) {
    if (Object.keys(modules).some((k) => bare(k) === bare(t))) {
      for (const [ct, cn] of Object.entries(flatten(modules, bare(t), seen))) out[ct] = (out[ct] ?? 0) + n * cn
    } else out[t] = (out[t] ?? 0) + n
  }
  seen.delete(name)
  return out
}

/**
 * parseStat(text, lists) -> { ok, error?, version, creator, top, modules, key, from, types[], groups, cells }
 *   types[]: { type, n, group } in the order yosys printed them; group is one of
 *            lut / ff / dsp / bram / other / internal / hier (a submodule instance, cells counted inside).
 *   groups:  { lut, ff, dsp, bram, other, internal, hier } totals.
 *   cells:   lut + ff + dsp + bram + other (internal and hier left out, each shown on its own).
 */
export function parseStat(text, lists) {
  const { json, error } = jsonOf(text)
  if (error) return { ok: false, error }
  if (!json || typeof json !== 'object' || typeof json.modules !== 'object' || !json.modules) return { ok: false, error: 'nomodules' }
  const modules = json.modules
  const names = Object.keys(modules).map(bare)
  const creator = typeof json.creator === 'string' ? json.creator : null
  const version = creator ? (/^Yosys\s+(\S+)/.exec(creator)?.[1] ?? null) : null
  const top = topOf(modules)
  let map, key, from
  const design = json.design && byTypeOf(json.design)
  if (design) { map = design.map; key = design.key; from = 'design' }
  else if (top) {
    const bt = byTypeOf(modules[Object.keys(modules).find((k) => bare(k) === top)])
    if (!bt) return { ok: false, error: 'nocells', version, creator, top }
    map = flatten(modules, top); key = bt.key; from = 'modules'
  }
  if (!map) return { ok: false, error: 'nocells', version, creator, top }
  const group = {}
  const put = (arr, g) => { for (const t of arr ?? []) group[t] = g }
  put(lists.lut, 'lut'); put(lists.ff, 'ff'); put(lists.dsp, 'dsp'); put(lists.bram, 'bram'); put(lists.internal, 'internal')
  const types = Object.entries(map).map(([type, n]) => ({
    type, n: Number(n) || 0,
    group: group[type] ?? (names.includes(bare(type)) ? 'hier' : 'other'),
  }))
  const groups = { lut: 0, ff: 0, dsp: 0, bram: 0, other: 0, internal: 0, hier: 0 }
  for (const t of types) groups[t.group] += t.n
  const cells = groups.lut + groups.ff + groups.dsp + groups.bram + groups.other
  return { ok: true, version, creator, top, modules: names.length, key, from, types, groups, cells }
}

/** The lists parseStat needs, from the spec's constants (window.T27_WIDGET, or the compiler in node). */
export const listsOf = (K) => ({
  lut: K.K_LUT_TYPES, ff: K.K_FF_TYPES, dsp: K.K_DSP_TYPES, bram: K.K_BRAM_TYPES, internal: K.K_INTERNAL_TYPES,
})

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * badgeSvg(r, K) -> a shields-like README badge as plain SVG text: two rects and two texts, no
 * external font or URL. Words from the spec (SAY_BADGE_LABEL, SAY_BADGE_VALUE); sizes from K_BADGE_*.
 * The text width is fixed with textLength, so whatever monospace font the viewer has, it fits.
 */
export function badgeSvg(r, K) {
  const label = K.SAY_BADGE_LABEL
  const value = fmt(K.SAY_BADGE_VALUE, r.groups.lut, r.groups.ff, r.groups.dsp, r.groups.bram)
  const cw = K.K_BADGE_CHAR_W
  const pad = K.K_BADGE_PAD
  const h = K.K_BADGE_H
  const lw = label.length * cw + 2 * pad
  const vw = value.length * cw + 2 * pad
  const w = lw + vw
  const y = Math.round(h * 0.7)
  const title = fmt(K.SAY_BADGE_TITLE, value, r.top ?? '', r.version ?? '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img" aria-label="${xml(label)}: ${xml(value)}">` +
    `<title>${xml(title)}</title>` +
    `<rect width="${lw}" height="${h}" rx="3" fill="${K.K_BADGE_LABEL_FILL}"/>` +
    `<rect x="${lw}" width="${vw}" height="${h}" rx="3" fill="${K.K_BADGE_VALUE_FILL}"/>` +
    `<rect x="${lw}" width="4" height="${h}" fill="${K.K_BADGE_VALUE_FILL}"/>` +
    `<g fill="#fff" font-family="monospace" font-size="${K.K_BADGE_FONT_PX}">` +
    `<text x="${pad}" y="${y}" textLength="${label.length * cw}" lengthAdjust="spacingAndGlyphs">${xml(label)}</text>` +
    `<text x="${lw + pad}" y="${y}" textLength="${value.length * cw}" lengthAdjust="spacingAndGlyphs">${xml(value)}</text>` +
    `</g></svg>`
}
