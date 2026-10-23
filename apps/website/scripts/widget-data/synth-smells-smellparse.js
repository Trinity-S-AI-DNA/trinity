// SPDX-License-Identifier: Apache-2.0
// smellparse.js -- reads the text of a yosys run and finds the smells the synth-smells widget
// shows. One parser for both sides: tool.js runs it in the reader's browser on a pasted or dropped
// log, and scripts/widget-data/synth-smells.mjs runs it in node on the sample logs, so the counts
// on the page and the K_ facts in specs/widgets/synth-smells.t27 come from the same code.
//
// The patterns below are yosys's own message texts (0.67 and the older spellings it used), not
// words this page shows; every word on screen comes from the spec.

const RE = {
  version: /^\s*Yosys (\d+\.\d+\S*)/,
  command: /^-- Running command `(.*)' --$/,
  error: /^(?:(\S+?):(\d+): )?ERROR: (.*)$/,
  latch: /^(?:Warning: )?Latch inferred for signal `(.+?)' from process/,
  undriven: /^Warning: [Ww]ire '?(.+?)'? is used but has no driver\.?$/,
  conflictNew: /^Warning: multiple conflicting drivers for (.+?):?$/,
  conflictOld: /^Warning: Driver-driver conflict for (\S+)/,
  memMap: /^Mapping memory (\S+) in module (\S+?):?$/,
  memRegs: /^Replacing memory (\S+) with list of registers/,
  removed: /^Removed (\d+) unused cells and (\d+) unused wires\.$/,
  warning: /^Warning: /,
  summary: /^Warnings: (\d+) unique messages?, (\d+) total$/,
  problems: /^Found and reported (\d+) problems?\.$/,
  statStart: /^\d+(?:\.\d+)*\. Printing statistics\.$|^Printing statistics\.$/,
  statModule: /^=== (.+) ===$/,
  // yosys 0.5x+: "       16   FDRE" (count, three spaces, type). Older: "     FDRE    16".
  cellNew: /^\s+(\d+)\s{3,}([A-Za-z_$\\][\w$\\.:]*)\s*$/,
  cellOld: /^\s{5,}([A-Za-z_$\\][\w$\\.:]*)\s+(\d+)\s*$/,
  cellsOld: /^\s+Number of cells:\s+(\d+)/,
  cellsNew: /^\s+(\d+) cells$/,
  // yosys 0.67 counts instances of library cells it keeps as modules (FDRE, CARRY4, MUXF7 ...) on a
  // line of their own, outside its "cells" total.
  submodules: /^\s+(\d+) submodules$/,
}

// A bit select names one bit of a wire: `top.\w [3]`. The wire is what a reader fixes.
const wireOf = (s) => s.replace(/\s*\[\d+\]$/, '')

/** The cells yosys reports in its last statistics block, grouped the way the widget draws them. */
export const CELL_GROUPS = [
  ['lut', /^LUT[1-6]$/],
  ['ff', /^FD(RE|SE|CE|PE)(_1)?$/],
  ['latch', /^LD(CE|PE)(_1)?$|^\$_DLATCH/],
  ['carry', /^CARRY[48]$/],
  ['mux', /^MUXF[78]$/],
  ['dsp', /^DSP48E1$/],
  ['bram', /^RAMB(18|36)E1$/],
  ['lutram', /^RAM(32|64|128|256)[MX]|^RAM(16|32|64)X1[SD]|^SRL(16|C32)E$/],
  ['io', /^(I|O|IO)BUF|^BUFG|^OBUFT$/],
]

export function groupOf(type) {
  for (const [g, re] of CELL_GROUPS) if (re.test(type)) return g
  return 'other'
}

/** The last statistics block: the totals of the netlist yosys finished with. */
function lastStat(lines) {
  let start = -1
  for (let i = lines.length - 1; i >= 0; i--) if (RE.statStart.test(lines[i].trim())) { start = i; break }
  if (start < 0) return null
  // A design with submodules prints one block per module, then the hierarchy totals; flat designs
  // print the module and then the same counts again. The hierarchy block, when present, is the total.
  let from = start
  for (let i = start; i < lines.length; i++) {
    const m = RE.statModule.exec(lines[i].trim())
    if (m && m[1] === 'design hierarchy') { from = i; break }
  }
  const cells = {}
  let total = null
  let submodules = 0
  let seenTypes = false
  for (let i = from + 1; i < lines.length; i++) {
    const raw = lines[i]
    const t = raw.trim()
    if (/^\d+(?:\.\d+)+\. Executing /.test(t) || /^End of script/.test(t)) break
    if (RE.statModule.test(t) && seenTypes) break
    let m
    if ((m = RE.cellsNew.exec(raw)) || (m = RE.cellsOld.exec(raw))) { total = Number(m[1]); continue }
    if ((m = RE.submodules.exec(raw))) { submodules = Number(m[1]); continue }
    if ((m = RE.cellNew.exec(raw))) { cells[m[2]] = (cells[m[2]] ?? 0) + Number(m[1]); seenTypes = true; continue }
    if (total !== null && (m = RE.cellOld.exec(raw)) && !/^Number$/.test(m[1])) { cells[m[1]] = (cells[m[1]] ?? 0) + Number(m[2]); seenTypes = true }
  }
  if (total === null && !seenTypes) return null
  const groups = {}
  for (const [type, n] of Object.entries(cells)) { const g = groupOf(type); groups[g] = (groups[g] ?? 0) + n }
  return { total, submodules, cells, groups }
}

/**
 * Reads a yosys log. Returns counts and the lines that carry them, never a guess: a smell the log
 * does not mention is zero, and a log with no statistics block says so (stat: null).
 */
export function parseYosysLog(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  const out = {
    lines: lines.length,
    version: null,
    command: null,
    errors: [],
    latches: [],
    undriven: {},
    conflicts: [],
    memories: [],
    removed: { cells: 0, wires: 0, passes: 0 },
    warnings: { total: 0, unique: 0, counted: 0, summary: false },
    problems: null,
    stat: null,
  }
  const seen = { latch: new Set(), conflict: new Set(), memory: new Set(), warning: new Set(), error: new Set() }
  for (const raw of lines) {
    const t = raw.trim()
    let m
    if (!out.version && (m = RE.version.exec(raw))) out.version = m[1]
    if (!out.command && (m = RE.command.exec(t))) out.command = m[1]
    if ((m = RE.error.exec(t))) {
      const key = t
      if (!seen.error.has(key)) { seen.error.add(key); out.errors.push({ file: m[1] ?? null, line: m[2] ? Number(m[2]) : null, message: m[3] }) }
      continue
    }
    if (RE.warning.test(t)) { out.warnings.counted++; seen.warning.add(t) }
    if ((m = RE.latch.exec(t))) { if (!seen.latch.has(m[1])) { seen.latch.add(m[1]); out.latches.push(m[1]) } continue }
    if ((m = RE.undriven.exec(t))) { const w = wireOf(m[1]); out.undriven[w] = out.undriven[w] ?? new Set(); out.undriven[w].add(m[1]); continue }
    if ((m = RE.conflictNew.exec(t)) || (m = RE.conflictOld.exec(t))) { if (!seen.conflict.has(m[1])) { seen.conflict.add(m[1]); out.conflicts.push(m[1]) } continue }
    if ((m = RE.memMap.exec(t)) || (m = RE.memRegs.exec(t))) { const k = m[1]; if (!seen.memory.has(k)) { seen.memory.add(k); out.memories.push(k) } continue }
    if ((m = RE.removed.exec(t))) { out.removed.cells += Number(m[1]); out.removed.wires += Number(m[2]); out.removed.passes++; continue }
    if ((m = RE.summary.exec(t))) { out.warnings.unique = Number(m[1]); out.warnings.total = Number(m[2]); out.warnings.summary = true; continue }
    if ((m = RE.problems.exec(t))) out.problems = Number(m[1])
  }
  if (!out.warnings.summary) { out.warnings.total = out.warnings.counted; out.warnings.unique = seen.warning.size }
  out.undriven = Object.fromEntries(Object.entries(out.undriven).map(([w, bits]) => [w, bits.size]))
  out.stat = lastStat(lines)
  return out
}

/** The numbers the widget and the spec talk about, from one parsed log. */
export function smellCounts(p) {
  return {
    errors: p.errors.length,
    latches: p.latches.length,
    undriven: Object.keys(p.undriven).length,
    undriven_bits: Object.values(p.undriven).reduce((s, n) => s + n, 0),
    conflicts: p.conflicts.length,
    memories: p.memories.length,
    removed_cells: p.removed.cells,
    removed_wires: p.removed.wires,
    warnings: p.warnings.total,
    warnings_unique: p.warnings.unique,
    cells: p.stat?.total ?? 0,
    submodules: p.stat?.submodules ?? 0,
    luts: p.stat?.groups.lut ?? 0,
    ffs: p.stat?.groups.ff ?? 0,
    latch_cells: p.stat?.groups.latch ?? 0,
    carry: p.stat?.groups.carry ?? 0,
    dsp: p.stat?.groups.dsp ?? 0,
    bram: p.stat?.groups.bram ?? 0,
  }
}

/**
 * Keeps the lines this parser reads, the pass header above each, the banner and the final
 * statistics; every other run of lines becomes one marker line. Used by the data script so a
 * sample log is small without anybody editing it by hand. The marker text is passed in.
 */
export function trimLog(text, marker) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n')
  const keep = new Array(lines.length).fill(false)
  let statFrom = lines.length
  for (let i = lines.length - 1; i >= 0; i--) if (RE.statStart.test(lines[i].trim())) { statFrom = i; break }
  let header = -1
  let banner = true
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const t = raw.trim()
    if (banner) { keep[i] = true; if (RE.command.test(t) || i >= 20) banner = false; continue }
    if (/^\d+(?:\.\d+)*\. \S/.test(t)) header = i
    if (i >= statFrom) { keep[i] = true; continue }
    const hit = RE.error.test(t) || RE.warning.test(t) || RE.latch.test(t) || RE.memMap.test(t) || RE.memRegs.test(t) || RE.removed.test(t) || RE.summary.test(t) || RE.problems.test(t)
    if (!hit) continue
    keep[i] = true
    if (header >= 0) keep[header] = true
    // The indented lines under a conflict or a memory mapping say which drivers and which cells.
    for (let j = i + 1; j < lines.length && /^\s{2,}\S/.test(lines[j]); j++) keep[j] = true
  }
  const out = []
  let gap = 0
  for (let i = 0; i < lines.length; i++) {
    if (keep[i]) { if (gap) out.push(marker.replace('{n}', String(gap))); gap = 0; out.push(lines[i]) } else gap++
  }
  if (gap) out.push(marker.replace('{n}', String(gap)))
  return out.join('\n')
}
