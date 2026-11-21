// SPDX-License-Identifier: Apache-2.0
// fsm-sketch parser and layout: the one reader of yosys FSM output, run in node by
// scripts/widget-data/fsm-sketch.mjs for the samples and in the reader's browser for their file.
// It holds no English: results carry codes (error ids, note ids) that tool.js turns into the
// SAY_* words of specs/widgets/fsm-sketch.t27.
//
// Two inputs are read:
//   KISS2  -- what `fsm_export` writes: .i/.o/.p/.s/.r headers, then one row per transition,
//             "<inputs> <from> <to> <outputs>". yosys prints the input and output patterns
//             highest bit first (the same Const strings fsm_info prints), and names no signal.
//   a log  -- the text yosys printed: fsm_detect's "Found FSM state register" and
//             "Not marking ... as FSM state register:" lines with their reasons, fsm_recode's
//             encoding line, and fsm_info's dump (signals, state encoding, transition table).
//             A synth or synth_xilinx log holds the same lines: their fsm pass runs fsm_info.

const RULE = /^-{10,}\s*$/

/** Which of the two this text is, or null. */
export function sniff(text) {
  const t = String(text ?? '')
  if (/Executing FSM_DETECT pass|Information on FSM |FSM state register/.test(t)) return 'log'
  if (/^\s*\.(i|s|p|r)\s+\S+/m.test(t) && /^\s*[01\-]*\s+\S+\s+\S+(\s+[01\-]*)?\s*$/m.test(t)) return 'kiss2'
  return null
}

/** Parses either input. Returns { ok, kind, ... } or { ok: false, error }. */
export function parseAny(text) {
  const kind = sniff(text)
  if (kind === 'log') return parseLog(text)
  if (kind === 'kiss2') return parseKiss2(text)
  return { ok: false, error: 'unknown' }
}

const stateNum = (s) => (/^s(\d+)$/.test(s) ? Number(s.slice(1)) : NaN)

/** A KISS2 file: one FSM, states named by the file, signals not named. */
export function parseKiss2(text) {
  const head = {}
  const rows = []
  const names = []
  const seen = new Map()
  const add = (s) => { if (!seen.has(s)) { seen.set(s, names.length); names.push(s) } return seen.get(s) }
  let ilb = null
  let ob = null
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    if (line.startsWith('.')) {
      const [key, ...rest] = line.split(/\s+/)
      if (key === '.e' || key === '.end') break
      if (key === '.ilb') ilb = rest
      else if (key === '.ob') ob = rest
      else head[key.slice(1)] = rest[0]
      continue
    }
    const tok = line.split(/\s+/)
    const nIn = head.i !== undefined ? Number(head.i) : null
    const nOut = head.o !== undefined ? Number(head.o) : null
    let inp, from, to, out
    if (tok.length === 4) [inp, from, to, out] = tok
    else if (tok.length === 3 && nIn === 0) { inp = ''; [from, to, out] = tok }
    else if (tok.length === 3 && nOut === 0) { [inp, from, to] = tok; out = '' }
    else return { ok: false, error: 'kiss2row', line: raw.trim() }
    if (!/^[01\-]*$/.test(inp) || !/^[01\-]*$/.test(out)) return { ok: false, error: 'kiss2row', line: raw.trim() }
    rows.push({ from: add(from), to: add(to), in: inp, out })
  }
  if (head.i === undefined && head.s === undefined && rows.length === 0) return { ok: false, error: 'unknown' }
  // yosys names states s0..sN: draw them in that order when every name has that shape.
  let order = names.map((_, i) => i)
  if (names.length && names.every((n) => Number.isFinite(stateNum(n)))) order.sort((a, b) => stateNum(names[a]) - stateNum(names[b]))
  const remap = new Map(order.map((old, i) => [old, i]))
  const states = order.map((old, i) => ({ i, name: names[old], code: null }))
  for (const r of rows) { r.from = remap.get(r.from); r.to = remap.get(r.to) }
  const nIn = head.i !== undefined ? Number(head.i) : (rows[0]?.in.length ?? 0)
  const nOut = head.o !== undefined ? Number(head.o) : (rows[0]?.out.length ?? 0)
  const resetName = head.r ?? null
  const reset = resetName === null ? -1 : states.findIndex((s) => s.name === resetName)
  const notes = []
  if (head.s !== undefined && Number(head.s) !== states.length) notes.push({ id: 'kiss2_s', args: [head.s, states.length] })
  if (head.p !== undefined && Number(head.p) !== rows.length) notes.push({ id: 'kiss2_p', args: [head.p, rows.length] })
  if (resetName !== null && reset < 0) notes.push({ id: 'no_reset_named', args: [resetName] })
  if (resetName === null) notes.push({ id: 'no_reset', args: [] })
  if (rows.some((r) => r.in.length !== nIn)) notes.push({ id: 'width_in', args: [nIn] })
  const fsm = {
    id: 'kiss2', module: null, reg: null, nIn, nOut, nBits: null, states, rows, reset,
    inputs: ilb && ilb.length === nIn ? ilb.slice().reverse() : null,
    outputs: ob && ob.length === nOut ? ob.slice().reverse() : null,
    encoding: null,
  }
  return { ok: true, kind: 'kiss2', version: null, fsms: [fsm], found: [], rejected: [], detectRan: null, notes }
}

const unslash = (s) => String(s).replace(/^\\/, '')

/** A yosys log: every FSM fsm_info dumped, and what fsm_detect said about each register. */
export function parseLog(text) {
  const lines = String(text).split(/\r?\n/)
  const version = (String(text).match(/\bYosys (\d+\.\d+[^\s(]*)/) || [])[1] ?? null
  const detectRan = /Executing FSM_DETECT pass/.test(text)
  const found = []
  const rejected = []
  const recode = new Map()
  const fsms = new Map()
  let cur = null
  let section = null
  let pendingRecode = null
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k]
    let m
    if ((m = line.match(/^Found FSM state register (\S+?)\.?\s*$/))) { if (!found.includes(m[1])) found.push(m[1]); continue }
    if ((m = line.match(/^Not marking (\S+) as FSM state register:\s*$/))) {
      const reasons = []
      while (k + 1 < lines.length && /^\s{2,}\S/.test(lines[k + 1])) reasons.push(lines[++k].trim())
      const prev = rejected.find((r) => r.reg === m[1])
      if (prev) { for (const r of reasons) if (!prev.reasons.includes(r)) prev.reasons.push(r) } else rejected.push({ reg: m[1], reasons })
      continue
    }
    if ((m = line.match(/^Recoding FSM `([^']+)' from module `([^']+)' using `([^']+)' encoding:/))) { pendingRecode = m[1]; recode.set(m[1], m[3]); continue }
    if (pendingRecode && (m = line.match(/mapping auto encoding to `([^`']+)'?`?/))) { recode.set(pendingRecode, m[1]); pendingRecode = null; continue }
    if ((m = line.match(/^\s*Information on FSM (\S+) \((.+)\):\s*$/))) {
      const id = m[1]
      const modLine = lines.slice(Math.max(0, k - 4), k).reverse().find((l) => /^FSM `.+' from module `.+':/.test(l))
      const mod = modLine ? unslash(modLine.match(/from module `([^']+)'/)[1]) : null
      cur = { id, module: mod, reg: unslash(m[2]), nIn: 0, nOut: 0, nBits: 0, inputs: [], outputs: [], states: [], rows: [], reset: -1, encoding: null }
      fsms.set(id, cur)
      section = null
      continue
    }
    if (!cur) continue
    if ((m = line.match(/^\s*Number of input signals:\s*(\d+)/))) { cur.nIn = Number(m[1]); continue }
    if ((m = line.match(/^\s*Number of output signals:\s*(\d+)/))) { cur.nOut = Number(m[1]); continue }
    if ((m = line.match(/^\s*Number of state bits:\s*(\d+)/))) { cur.nBits = Number(m[1]); continue }
    if (/^\s*Input signals:\s*$/.test(line)) { section = 'in'; continue }
    if (/^\s*Output signals:\s*$/.test(line)) { section = 'out'; continue }
    if (/^\s*State encoding:\s*$/.test(line)) { section = 'enc'; continue }
    if (/^\s*Transition Table/.test(line)) { section = 'rows'; continue }
    // The transition table ends at the first blank or ruled line after its rows.
    if (!line.trim() || RULE.test(line)) { if (section === 'rows' && cur.rows.length) { cur = null; section = null } continue }
    if (section === 'in' && (m = line.match(/^\s*(\d+):\s+(.+?)\s*$/))) { cur.inputs[Number(m[1])] = unslash(m[2]); continue }
    if (section === 'out' && (m = line.match(/^\s*(\d+):\s+(.+?)\s*$/))) { cur.outputs[Number(m[1])] = unslash(m[2]); continue }
    if (section === 'enc' && (m = line.match(/^\s*(\d+):\s+(\d+)'([01\-xz]*)(\s+<RESET STATE>)?\s*$/))) {
      const i = Number(m[1])
      cur.states[i] = { i, name: `s${i}`, code: m[3] }
      if (m[4]) cur.reset = i
      continue
    }
    if (section === 'rows' && (m = line.match(/^\s*\d+:\s+(\d+)\s+(\d+)'([01\-xz]*)\s+->\s+(\d+)\s+(\d+)'([01\-xz]*)\s*$/))) {
      cur.rows.push({ from: Number(m[1]), in: m[3], to: Number(m[4]), out: m[6] })
      continue
    }
  }
  const list = [...fsms.values()]
  for (const f of list) {
    f.encoding = recode.get(f.id) ?? null
    for (let i = 0; i < f.states.length; i++) if (!f.states[i]) f.states[i] = { i, name: `s${i}`, code: null }
    const top = f.rows.reduce((n, r) => Math.max(n, r.from, r.to), -1)
    for (let i = f.states.length; i <= top; i++) f.states.push({ i, name: `s${i}`, code: null })
  }
  if (!detectRan && list.length === 0 && found.length === 0 && rejected.length === 0) return { ok: false, error: 'nofsmpass' }
  const notes = []
  if (list.some((f) => f.encoding && f.encoding !== 'auto')) notes.push({ id: 'recoded', args: [] })
  if (found.length > list.length) notes.push({ id: 'no_info', args: [found.length, list.length] })
  return { ok: true, kind: 'log', version, fsms: list, found, rejected, detectRan, notes }
}

/** Counts that the page and the card show for one FSM. */
export function countsOf(f) {
  return { states: f.states.length, transitions: f.rows.length, inputs: f.nIn, outputs: f.nOut, bits: f.nBits }
}

/** The value of a 0/1 code, or null when it holds don't-cares. */
export const codeValue = (code) => (code && /^[01]+$/.test(code) && code.length <= 52 ? parseInt(code, 2) : null)

/** "name=bit" for every input a pattern tests, highest index first as yosys prints it. */
export function conditionOf(pattern, names) {
  const n = pattern.length
  const out = []
  for (let j = 0; j < n; j++) {
    const c = pattern[j]
    if (c === '-') continue
    const idx = n - 1 - j
    out.push(`${names?.[idx] ?? `in[${idx}]`}=${c}`)
  }
  return out
}

// --- layout: states on an ellipse in breadth-first order from the reset state -------------------

/** States in the order a reader follows them: breadth-first from reset, then any left over. */
export function walkOrder(f) {
  const n = f.states.length
  const next = Array.from({ length: n }, () => [])
  for (const r of f.rows) if (r.from !== r.to && !next[r.from].includes(r.to)) next[r.from].push(r.to)
  for (const l of next) l.sort((a, b) => a - b)
  const order = []
  const seen = new Set()
  const start = f.reset >= 0 ? f.reset : 0
  for (const s of [start, ...Array.from({ length: n }, (_, i) => i)]) {
    if (s >= n || seen.has(s)) continue
    const q = [s]
    seen.add(s)
    while (q.length) {
      const x = q.shift()
      order.push(x)
      for (const y of next[x]) if (!seen.has(y)) { seen.add(y); q.push(y) }
    }
  }
  return order
}

const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l] }
const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

/** Where a ray from a box's centre in direction (dx, dy) leaves the box. */
function boxExit(n, dx, dy, pad = 0) {
  const hw = n.w / 2 + pad
  const hh = n.h / 2 + pad
  const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity)
  return [n.x + dx * t, n.y + dy * t]
}

/**
 * Node boxes and edge curves for one FSM in a w x h box.
 * opts: { w, h, font (px), charW (px per character at that font), labels: [state label lines],
 *         maxLabelRows, edgeFont }
 * Returns { w, h, nodes: [{ i, x, y, w, h, lines }], edges: [{ from, to, rows, self, pts, arrow, label }] }
 * pts are the curve's control points: three for a quadratic, four for a cubic (self loops).
 */
export function layoutFsm(f, opts) {
  const { w, h } = opts
  const font = opts.font ?? 14
  const charW = opts.charW ?? font * 0.6
  const edgeFont = opts.edgeFont ?? Math.round(font * 0.86)
  const edgeCharW = edgeFont * (charW / font)
  const maxRows = opts.maxLabelRows ?? 3
  const n = f.states.length
  const lineH = Math.round(font * 1.25)
  const boxes = f.states.map((s, i) => {
    const lines = opts.labels?.[i] ?? [s.name]
    const tw = Math.max(...lines.map((l) => String(l).length)) * charW
    return { i, w: Math.max(tw + font * 1.4, font * 3.2), h: lines.length * lineH + font * 0.9, lines }
  })
  const maxW = Math.max(0, ...boxes.map((b) => b.w))
  const maxH = Math.max(0, ...boxes.map((b) => b.h))
  const loopR = Math.max(maxH * 0.8, font * 2.2)
  const order = walkOrder(f)
  // One edge per (from, to) pair; its label lists the input patterns of its rows.
  const pairs = new Map()
  f.rows.forEach((r, idx) => {
    const key = `${r.from}>${r.to}`
    if (!pairs.has(key)) pairs.set(key, { from: r.from, to: r.to, rows: [] })
    pairs.get(key).rows.push(idx)
  })
  const frame = { x0: 4, y0: 4, x1: w - 4, y1: h - 4 }
  // Start with the widest ellipse the boxes allow, then shrink it until loops and labels fit too.
  let rx = Math.max(0, w / 2 - maxW / 2 - 6)
  let ry = Math.max(0, h / 2 - maxH / 2 - 6)
  let out = null
  for (let pass = 0; pass < 12; pass++) {
    out = place(rx, ry)
    const bb = bounds(out)
    const ox = Math.max(0, frame.x0 - bb.x0, bb.x1 - frame.x1)
    const oy = Math.max(0, frame.y0 - bb.y0, bb.y1 - frame.y1)
    if (ox < 1 && oy < 1) break
    rx = Math.max(0, rx - ox - 1)
    ry = Math.max(0, ry - oy - 1)
  }
  return { w, h, font, edgeFont, lineH, nodes: out.nodes, edges: out.edges }

  function place(rx, ry) {
    const cx = w / 2
    const cy = h / 2
    const nodes = boxes.map((b) => ({ ...b, x: cx, y: cy }))
    order.forEach((st, k) => {
      if (n === 1) return
      const a = -Math.PI / 2 + (2 * Math.PI * k) / n
      nodes[st].x = cx + rx * Math.cos(a)
      nodes[st].y = cy + ry * Math.sin(a)
    })
    const edges = []
    for (const e of pairs.values()) {
      const a = nodes[e.from]
      const b = nodes[e.to]
      const pats = e.rows.map((i) => f.rows[i].in || '')
      const label = { lines: pats.length <= maxRows ? pats : pats.slice(0, Math.max(1, maxRows - 1)), more: pats.length <= maxRows ? 0 : pats.length - Math.max(1, maxRows - 1) }
      if (e.from === e.to) {
        const u = n === 1 ? [0, -1] : unit(a.x - cx, a.y - cy)
        const p0 = boxExit(a, ...rot(u, -0.45))
        const p1 = boxExit(a, ...rot(u, 0.45))
        const reach = (v) => [a.x + v[0] * (loopR * 1.6 + a.w / 5), a.y + v[1] * (loopR * 1.6 + a.h / 3)]
        const c1 = reach(rot(u, -0.55))
        const c2 = reach(rot(u, 0.55))
        const apex = [0.125 * p0[0] + 0.375 * c1[0] + 0.375 * c2[0] + 0.125 * p1[0], 0.125 * p0[1] + 0.375 * c1[1] + 0.375 * c2[1] + 0.125 * p1[1]]
        label.x = apex[0] + u[0] * edgeFont * 0.5
        label.y = apex[1] + u[1] * edgeFont * 0.5
        label.anchor = Math.abs(u[0]) < 0.35 ? 'middle' : u[0] > 0 ? 'start' : 'end'
        label.valign = u[1] < -0.35 ? 'bottom' : u[1] > 0.35 ? 'top' : 'middle'
        edges.push({ from: e.from, to: e.to, rows: e.rows, self: true, pts: [p0, c1, c2, p1], apex, arrow: { x: p1[0], y: p1[1], angle: Math.atan2(p1[1] - c2[1], p1[0] - c2[0]) }, label })
        continue
      }
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const nrm = [-dy / len, dx / len]
      const back = pairs.has(`${e.to}>${e.from}`)
      const bend = len * (back ? 0.2 : 0.1)
      const c = [(a.x + b.x) / 2 + nrm[0] * bend, (a.y + b.y) / 2 + nrm[1] * bend]
      const p0 = boxExit(a, ...unit(c[0] - a.x, c[1] - a.y))
      const p1 = boxExit(b, ...unit(c[0] - b.x, c[1] - b.y), 2)
      edges.push({ from: e.from, to: e.to, rows: e.rows, self: false, pts: [p0, c, p1], arrow: { x: p1[0], y: p1[1], angle: Math.atan2(p1[1] - c[1], p1[0] - c[0]) }, label })
    }
    placeLabels(edges, nodes, { w, h, edgeFont, edgeCharW })
    for (const e of edges) delete e.apex
    return { nodes, edges }
  }

  function bounds({ nodes, edges }) {
    const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
    const add = (b) => { bb.x0 = Math.min(bb.x0, b.x0); bb.y0 = Math.min(bb.y0, b.y0); bb.x1 = Math.max(bb.x1, b.x1); bb.y1 = Math.max(bb.y1, b.y1) }
    for (const nd of nodes) add({ x0: nd.x - nd.w / 2 - 6, y0: nd.y - nd.h / 2 - 6, x1: nd.x + nd.w / 2 + 6, y1: nd.y + nd.h / 2 + 6 })
    for (const e of edges) {
      add(labelBox(e.label, edgeFont, edgeCharW))
      if (e.self) {
        const [p0, c1, c2, p1] = e.pts
        for (const t of [0.25, 0.5, 0.75]) {
          const k = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3]
          const x = k[0] * p0[0] + k[1] * c1[0] + k[2] * c2[0] + k[3] * p1[0]
          const y = k[0] * p0[1] + k[1] * c1[1] + k[2] * c2[1] + k[3] * p1[1]
          add({ x0: x - 2, y0: y - 2, x1: x + 2, y1: y + 2 })
        }
      }
    }
    return bb
  }
}

/** The box a label covers, from its anchor point, alignment and size. */
function labelBox(l, edgeFont, edgeCharW) {
  const lh = edgeFont * 1.15
  const bw = Math.max(1, ...l.lines.map((t) => String(t || '').length), l.more ? String(l.more).length + 6 : 0) * edgeCharW
  const bh = (l.lines.length + (l.more ? 1 : 0)) * lh
  const x0 = l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - bw : l.x - bw / 2
  const y0 = l.valign === 'bottom' ? l.y - bh : l.valign === 'top' ? l.y : l.y - bh / 2
  return { x0, y0, x1: x0 + bw, y1: y0 + bh }
}

const overlap = (p, q) => Math.max(0, Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0)) * Math.max(0, Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0))

/**
 * Edge labels where they cover the fewest other labels and boxes: self-loop labels stay at the
 * loop's apex; each curve's label tries points along the curve, on either side.
 */
function placeLabels(edges, nodes, { w, h, edgeFont, edgeCharW }) {
  const placed = nodes.map((n) => ({ x0: n.x - n.w / 2 - 3, y0: n.y - n.h / 2 - 3, x1: n.x + n.w / 2 + 3, y1: n.y + n.h / 2 + 3 }))
  for (const e of edges) if (e.self) placed.push(labelBox(e.label, edgeFont, edgeCharW))
  const frame = { x0: 2, y0: 2, x1: w - 2, y1: h - 2 }
  for (const e of edges) {
    if (e.self) continue
    const [p0, c, p1] = e.pts
    let best = null
    for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78]) {
      const pt = [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]]
      const tan = unit(2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]), 2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]))
      for (const side of [1, -1]) {
        const nrm = [-tan[1] * side, tan[0] * side]
        const l = { ...e.label, x: pt[0] + nrm[0] * edgeFont * 0.5, y: pt[1] + nrm[1] * edgeFont * 0.5 }
        l.anchor = Math.abs(nrm[0]) < 0.35 ? 'middle' : nrm[0] > 0 ? 'start' : 'end'
        l.valign = nrm[1] < -0.35 ? 'bottom' : nrm[1] > 0.35 ? 'top' : 'middle'
        const box = labelBox(l, edgeFont, edgeCharW)
        const out = (box.x1 - box.x0) * (box.y1 - box.y0) - overlap(box, frame)
        const cost = placed.reduce((sum, q) => sum + overlap(box, q), 0) + out * 4 + Math.abs(t - 0.5) * 4
        if (!best || cost < best.cost) best = { cost, l, box }
      }
      if (best && best.cost < 1) break
    }
    Object.assign(e.label, best.l)
    placed.push(best.box)
  }
}
