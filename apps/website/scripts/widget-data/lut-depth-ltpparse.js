// SPDX-License-Identifier: Apache-2.0
// ltpparse.js -- reads what yosys `ltp` prints and, when the same text also holds an RTLIL `dump`,
// the type of every cell on the path. One parser, run in the reader's browser by tool.js and in
// node by scripts/widget-data/lut-depth.mjs for the shipped sample.
//
// What yosys 0.67 `ltp` prints (passes/cmds/ltp.cc), and all this reads of it:
//   Longest topological path in <module> (length=<n>):
//       0: <net bit>
//       1: <net bit> (via <cell name>)
//       ...
//   Detected loop at <net bit> in <module>
// One block per selected module. Each line after 0 names the cell the path went through: a name,
// never a type. The type comes only from `cell <type> <name>` lines of an RTLIL dump in the same
// text (yosys `dump`); without them every step is "type not given" and nothing is guessed from
// the name.
//
// It holds no list of its own: which type is a LUT, a carry, a wide mux, an I/O buffer or a
// clocked cell comes in as `lists`, read from the spec (K_LUT_TYPES, K_CARRY_TYPES, K_MUX_TYPES,
// K_IO_TYPES, K_CLOCKED_TYPES). A type in none of them is "other".

const HEAD_RE = /Longest topological path in (.+?) \(length=(\d+)\):\s*$/
const STEP_RE = /^\s*(\d+): (.*)$/
const LOOP_RE = /Detected loop at (.+) in (\S+)\s*$/
const CELL_RE = /^\s*cell\s+(\S+)\s+(\S+)\s*$/
const CMD_RES = [/^\s*yosys(?: \[[^\]]*\])?> (ltp\b.*?)\s*$/, /^-- Running command `(ltp\b[^`]*)' --/, /^-- Running command `(.*\bltp\b[^`]*)' --/]

/** A yosys name as `log_id` prints it: a public name loses its leading backslash. */
export const bare = (name) => String(name ?? '').replace(/^\\/, '')

/** The class of a cell type: lut, carry, mux, io, clocked, other, or unknown (no type given). */
export function classOf(type, lists) {
  if (!type) return 'unknown'
  for (const k of ['lut', 'carry', 'mux', 'io', 'clocked']) if ((lists[k] ?? []).includes(type)) return k
  return 'other'
}

/**
 * parseLtp(text, lists) -> { ok, error?, blocks[], loops[], typed, cellTypes }
 *   blocks[]: { module, length, command, steps[], counts, printed }
 *     steps[]: { i, bit, via, type, cls }   (step 0 has no via: it is where the path starts)
 *     counts:  { lut, carry, mux, io, clocked, other, unknown } over the cells (steps 1..length)
 *     printed: the number of step lines read; equals length + 1 when the block is whole
 *   loops[]:   { bit, module } for every "Detected loop" line
 *   typed:     true when the text held at least one RTLIL `cell` line
 *   cellTypes: how many `cell` lines were read
 */
export function parseLtp(text, lists) {
  const lines = String(text ?? '').split(/\r?\n/)
  if (!lines.some((l) => l.trim())) return { ok: false, error: 'empty' }
  const types = new Map()
  for (const l of lines) {
    const m = CELL_RE.exec(l)
    if (m) types.set(bare(m[2]), bare(m[1]))
  }
  const blocks = []
  const loops = []
  let command = null
  let cur = null
  for (const l of lines) {
    for (const re of CMD_RES) {
      const m = re.exec(l)
      if (m) { command = m[1]; break }
    }
    const loop = LOOP_RE.exec(l)
    if (loop) { loops.push({ bit: loop[1], module: loop[2] }); continue }
    const head = HEAD_RE.exec(l)
    if (head) {
      cur = { module: bare(head[1]), length: Number(head[2]), command, steps: [] }
      blocks.push(cur)
      continue
    }
    if (!cur) continue
    const s = STEP_RE.exec(l)
    if (!s || Number(s[1]) !== cur.steps.length) { if (cur.steps.length) cur = null; continue }
    let bit = s[2]
    let via = null
    const at = bit.lastIndexOf(' (via ')
    if (at >= 0 && bit.endsWith(')')) { via = bare(bit.slice(at + 6, -1)); bit = bit.slice(0, at) }
    cur.steps.push({ i: Number(s[1]), bit, via })
  }
  if (!blocks.length) return { ok: false, error: loops.length ? 'loop' : 'noltp', loops }
  for (const b of blocks) {
    b.printed = b.steps.length
    b.counts = { lut: 0, carry: 0, mux: 0, io: 0, clocked: 0, other: 0, unknown: 0 }
    for (const st of b.steps) {
      st.type = st.via ? types.get(st.via) ?? null : null
      st.cls = st.via ? classOf(st.type, lists) : 'start'
      if (st.via) b.counts[st.cls]++
    }
  }
  return { ok: true, blocks, loops, typed: types.size > 0, cellTypes: types.size }
}

/** The lists parseLtp needs, from the spec's constants (window.T27_WIDGET, or the compiler in node). */
export const listsOf = (K) => ({
  lut: K.K_LUT_TYPES, carry: K.K_CARRY_TYPES, mux: K.K_MUX_TYPES, io: K.K_IO_TYPES, clocked: K.K_CLOCKED_TYPES,
})
