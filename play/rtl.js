// rtl.js -- the emitted Verilog, read the way a hardware engineer reads it before synthesis.
//
// One pure function, readRtl(code, ast): the module's ports and parameters, the bit map of every
// packed struct the spec declares, the functions with their widths, and what a Verilog-2005 tool
// will refuse in this text. It is a scan of the text the compiler emitted, run in the reader's
// browser; it is not iverilog, verilator or yosys, and the page says so beside the result.
//
// The struct bit map is the one place this file restates a rule instead of reading it: t27c's
// sizing in bootstrap/src/compiler.rs (resolve_symbolic_dims, is_lowerable_scalar_struct_d,
// type_to_width, field_type_width, packed_struct_width, struct_field_offset) -- `[CONST]` read as
// the const's integer literal, a struct lowered only when every field is an integer, a string or
// a lowerable struct, fields packed in declaration order from the LSB, an unknown type taking a
// 32-bit default. Every verdict and width it gives is then checked against the emitted text (the
// "(N bits)" note gen-verilog writes, each `[off +: w]` slice, each port typed by a struct), so a
// drift between this copy and the compiler is drawn as a finding, never hidden behind a picture.

// IEEE 1364-2005, Annex B: the reserved words. A port or net with one of these names is a
// syntax error in every Verilog-2005 reader, unless it is written escaped (\config ).
const KEYWORDS = new Set(('always and assign automatic begin buf bufif0 bufif1 case casex casez cell cmos config ' +
  'deassign default defparam design disable edge else end endcase endconfig endfunction endgenerate endmodule ' +
  'endprimitive endspecify endtable endtask event for force forever fork function generate genvar highz0 highz1 ' +
  'if ifnone incdir include initial inout input instance integer join large liblist library localparam ' +
  'macromodule medium module nand negedge nmos nor noshowcancelled not notif0 notif1 or output parameter pmos ' +
  'posedge primitive pull0 pull1 pulldown pullup pulsestyle_ondetect pulsestyle_onevent rcmos real realtime reg ' +
  'release repeat rnmos rpmos rtran rtranif0 rtranif1 scalared showcancelled signed small specify specparam ' +
  'strong0 strong1 supply0 supply1 table task time tran tranif0 tranif1 tri tri0 tri1 triand trior trireg ' +
  'unsigned use uwire vectored wait wand weak0 weak1 while wire wor xnor xor').split(' '))

// Words that may stand before `(` in a Verilog expression without being a call.
const NOT_CALLS = new Set(['if', 'for', 'while', 'case', 'casex', 'casez', 'repeat', 'forever', 'wait', 'begin', 'or', 'and', 'not', 'posedge', 'negedge', 'return'])

const NAME = String.raw`(\\\S+|[A-Za-z_][\w$]*)`
const RANGE = String.raw`(?:\[\s*(\d+)\s*:\s*(\d+)\s*\]\s*)?`
// Verilog's own variable types; in a declaration they stand where a range would, never as the name.
const VAR_TYPE = String.raw`(?:(integer|real|realtime|time)\s+)?`
const VAR_TYPE_WIDTH = { integer: 32, real: 64, realtime: 64, time: 64 }
const PORT_RE = new RegExp(String.raw`^\s*(input|output|inout)\s+(?:(?:wire|reg|logic)\s+)?(?:signed\s+)?${RANGE}${NAME}`)
const PARAM_RE = new RegExp(String.raw`^\s*(parameter|localparam)\s+(?:signed\s+)?${RANGE}([A-Za-z_][\w$]*)\s*=\s*([^;]+);`)
const FN_RE = new RegExp(String.raw`^\s*function\s+(?:automatic\s+)?(?:signed\s+)?${VAR_TYPE}${RANGE}${NAME}\s*;(?:\s*//\s*->\s*(\S.*))?`)
const TASK_RE = new RegExp(String.raw`^\s*task\s+(?:automatic\s+)?${NAME}\s*[;(]`)
const FN_INPUT_RE = new RegExp(String.raw`^\s*input\s+(?:wire\s+|reg\s+)?(?:signed\s+)?${VAR_TYPE}${RANGE}${NAME}`)
const LOCAL_RE = new RegExp(String.raw`^\s*(reg|wire|integer|real|realtime|time)\s+(?:signed\s+)?${RANGE}${NAME}`)
const LOOP_RE = /for\s*\(\s*(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\d+)\s*;/
const SLICE_RE = /(\\\S+|[A-Za-z_][\w$]*)\s*\[\s*(\d+)\s*\+:\s*(\d+)\s*\]/g
const SIZE_CAST_RE = /(?<![\w$'])(\d+|signed|unsigned)'\(/g
// The `(` is a lookahead so `f(g(x))` yields both f and g.
const CALL_RE = /(?:^|[=(,+\-*/&|^~!<>?:{}%]|\breturn\b)\s*([A-Za-z_][\w$]*)\s*(?=\()/g
const STATED_RE = /struct\s+(\w+)\s+lowered as packed vector \((\d+) bits\)/g
const REFUSED_RE = /UNSUPPORTED_ICARUS:\s*struct\s+(\w+)\s+contains non-lowerable fields/g

const PRIMITIVE = { bool: 1, u8: 8, i8: 8, u16: 16, i16: 16, u32: 32, i32: 32, usize: 32, f32: 32, u64: 64, i64: 64, f64: 64, GF16: 16, gf16: 16 }
const isString = (t) => t === 'str' || t.startsWith('&str') || t.startsWith('[]u8')
// is_primitive_scalar_type, plus the usize/isize the predicate admits beside it. No floats.
const LOWERABLE_SCALAR = new Set(['u8', 'u16', 'u32', 'u64', 'i8', 'i16', 'i32', 'i64', 'bool', 'GF16', 'gf16', 'usize', 'isize'])
const DEPTH_CAP = 8
const DEFAULT_WIDTH = 32

const widthOfRange = (hi, lo) => (hi === undefined ? 1 : Math.abs(Number(hi) - Number(lo)) + 1)
const widthOf = (type, hi, lo) => (type ? VAR_TYPE_WIDTH[type] : widthOfRange(hi, lo))
// String literals, emptied: a call or a `/*` inside a parameter's text is not code.
const noStrings = (line) => line.replace(/"(?:[^"\\]|\\.)*"/g, '""')
const bare = (name) => (name.startsWith('\\') ? name.slice(1) : name)

// Strip // and /* */ comments, keeping every line (and so every line number) in place. A string
// literal is copied whole: `"specs/*"` opens no comment.
function codeLines(text) {
  let depth = false
  return text.split('\n').map((line) => {
    let out = ''
    for (let i = 0; i < line.length; i++) {
      if (depth) { if (line.startsWith('*/', i)) { depth = false; i++ } continue }
      if (line[i] === '"') {
        let j = i + 1
        while (j < line.length && line[j] !== '"') j += line[j] === '\\' ? 2 : 1
        out += line.slice(i, j + 1)
        i = j
        continue
      }
      if (line.startsWith('/*', i)) { depth = true; i++; continue }
      if (line.startsWith('//', i)) break
      out += line[i]
    }
    return out
  })
}

// A Verilog number -> BigInt, or null. 3735928559, 32'hDEADBEEF, 1'b1, 8'd7.
function numberOf(text) {
  const t = text.trim().replace(/_/g, '')
  if (/^\d+$/.test(t)) return { value: BigInt(t), width: null }
  const m = /^(\d*)'s?([bdhoBDHO])([0-9a-fA-F]+)$/.exec(t)
  if (!m) return null
  const base = { b: 2, d: 10, h: 16, o: 8 }[m[2].toLowerCase()]
  let v = 0n
  for (const ch of m[3]) v = v * BigInt(base) + BigInt(parseInt(ch, 16))
  return { value: v, width: m[1] ? Number(m[1]) : null }
}

// --- t27c's packed-struct layout, restated (see the header) -------------------------------------
// resolve_symbolic_dims (#2275): every const in the tree whose value is a bare integer literal
// (underscores dropped) stands for itself inside `[...]`; the first declaration of a name wins.
function symbolicDims(ast) {
  const consts = new Map()
  const walk = (n) => {
    if (n.kind === 'ConstDecl' && n.name && !consts.has(n.name)) {
      const v = (String(n.value ?? '').trim() || (n.children ?? []).map((c) => String(c.value ?? '').trim()).find(Boolean) || '').replace(/_/g, '')
      if (/^\d+$/.test(v)) consts.set(n.name, String(BigInt(v)))
    }
    for (const c of n.children ?? []) walk(c)
  }
  if (ast) walk(ast)
  return (type) => type.replace(/\[([^\]]*)\]/g, (all, inner) => (inner.trim() && consts.has(inner.trim()) ? `[${consts.get(inner.trim())}]` : all))
}

export function structLayouts(ast) {
  const dims = symbolicDims(ast)
  const decls = new Map()
  for (const d of ast?.children ?? []) {
    if (d.kind !== 'StructDecl') continue
    decls.set(d.name, (d.children ?? []).filter((c) => c.name && c.type).map((c) => ({ name: c.name, type: dims(c.type) })))
  }
  const width = (type, depth) => {
    if (depth > DEPTH_CAP) return { bits: 0, how: 'too deep' }
    const t = type.trim()
    if (isString(t)) return { bits: 0, how: 'string' }
    const close = t.indexOf(']')
    if (t.startsWith('[') && close > 0) {
      const n = /^\d+$/.test(t.slice(1, close).trim()) ? Number(t.slice(1, close).trim()) : NaN
      if (!Number.isInteger(n)) return { bits: 0, how: 'unsized' }
      const inner = width(t.slice(close + 1), depth + 1)
      return { bits: n * inner.bits, how: inner.how === 'known' ? 'array' : inner.how }
    }
    if (decls.has(t)) return { bits: packed(t, depth + 1), how: 'struct' }
    const last = t.includes('::') ? t.slice(t.lastIndexOf('::') + 2).trim() : t
    return last in PRIMITIVE ? { bits: PRIMITIVE[last], how: 'known' } : { bits: DEFAULT_WIDTH, how: 'default' }
  }
  const packed = (name, depth) => (depth > DEPTH_CAP ? 0 : (decls.get(name) ?? []).reduce((s, f) => s + width(f.type, depth).bits, 0))
  const lowerable = (name, depth) => {
    if (depth * 2 > DEPTH_CAP) return false
    const fields = decls.get(name)
    if (!fields?.length) return false
    return fields.every((f) => {
      const t = f.type.trim()
      const end = t.indexOf(']')
      if (end >= 0 && !t.slice(1, end).trim()) return false
      const base = end >= 0 ? t.slice(end + 1).trim() : t
      return isString(base) || LOWERABLE_SCALAR.has(base) || (base !== name && lowerable(base, depth + 1))
    })
  }
  return [...decls].map(([name, fields]) => {
    let lo = 0
    const out = fields.map((f) => {
      const w = width(f.type, 0)
      const field = { name: f.name, type: f.type, bits: w.bits, how: w.how, lo, hi: lo + w.bits - 1 }
      lo += w.bits
      return field
    })
    return { name, bits: lo, lowered: lowerable(name, 0), fields: out }
  })
}

// --- the scan ------------------------------------------------------------------------------------
export function readRtl(code, ast) {
  const raw = code.split('\n')
  const lines = codeLines(code)
  const findings = []
  const find = (level, text, line) => findings.push({ level, text, line })

  const head = lines.findIndex((l) => /^\s*module\s+/.test(l))
  const moduleName = head >= 0 ? (new RegExp(String.raw`^\s*module\s+${NAME}`).exec(lines[head]) ?? [])[1] ?? null : null
  let headerEnd = head
  if (head >= 0) while (headerEnd < lines.length && !/\)\s*;|^\s*module\s+\S+\s*;/.test(lines[headerEnd])) headerEnd++
  const endIdx = lines.findIndex((l, i) => i > headerEnd && /^\s*endmodule\b/.test(l))

  // Ports: the ANSI header.
  const ports = []
  for (let i = head; head >= 0 && i <= headerEnd; i++) {
    const m = PORT_RE.exec(lines[i])
    if (m) ports.push({ dir: m[1], width: widthOfRange(m[2], m[3]), range: m[2] === undefined ? '' : `[${m[2]}:${m[3]}]`, name: m[4], line: i + 1 })
  }

  // Parameters, functions, module-scope registers and drivers.
  const params = []
  const functions = []
  const tasks = []
  const driven = new Set()
  const declared = []
  let fn = null
  let always = 0
  let regs = 0
  let instances = 0
  const scope = []
  for (let i = headerEnd + 1; i < (endIdx < 0 ? lines.length : endIdx); i++) {
    const l = lines[i]
    const pm = PARAM_RE.exec(l)
    if (pm) {
      const n = numberOf(pm[5])
      const width = pm[2] !== undefined ? widthOfRange(pm[2], pm[3]) : n?.width ?? 32
      params.push({ kind: pm[1], name: pm[4], width, text: pm[5].trim(), value: n?.value ?? null, line: i + 1 })
      declared.push({ name: pm[4], line: i + 1 })
      continue
    }
    // Matched on the stripped line, read from the raw one: gen-verilog writes the t27 return
    // type as a `// -> T` comment after the semicolon.
    const fm = FN_RE.test(l) ? FN_RE.exec(raw[i]) : null
    if (fm) {
      fn = { name: fm[4], width: widthOf(fm[1], fm[2], fm[3]), returns: fm[5]?.trim() ?? null, inputs: [], loops: [], line: i + 1 }
      functions.push(fn)
      continue
    }
    const tm = TASK_RE.exec(l)
    if (tm) {
      // A task's body is not module logic; its inputs are not module names.
      fn = { name: tm[1], inputs: [], loops: [], line: i + 1 }
      tasks.push(fn)
      continue
    }
    if (/^\s*end(function|task)\b/.test(l)) { fn = null; continue }
    if (fn) {
      const im = FN_INPUT_RE.exec(l)
      if (im) { fn.inputs.push({ name: im[4], width: widthOf(im[1], im[2], im[3]) }); declared.push({ name: im[4], line: i + 1 }) }
      const lm = LOOP_RE.exec(l)
      if (lm) fn.loops.push(Number(lm[3]) - Number(lm[2]))
      const rm = LOCAL_RE.exec(l)
      if (rm) declared.push({ name: rm[4], line: i + 1 })
      continue
    }
    const code = noStrings(l)
    scope.push(code)
    if (/^\s*always(_ff|_comb|_latch)?\b/.test(l)) always++
    const rm = LOCAL_RE.exec(l)
    if (rm) { if (rm[1] === 'reg') regs++; declared.push({ name: rm[4], line: i + 1 }) }
    const am = new RegExp(String.raw`^\s*assign\s+${NAME}\s*(?:\[[^\]]*\]\s*)?=\s*([^;]*);?`).exec(l)
    if (am) driven.add(bare(am[1]))
    else for (const m of code.matchAll(new RegExp(String.raw`${NAME}\s*(?:\[[^\]]*\]\s*)?<?=(?!=)`, 'g'))) driven.add(bare(m[1]))
    const inst = new RegExp(String.raw`^\s*([A-Za-z_][\w$]*)\s+(?:#\s*\(.*\)\s*)?([A-Za-z_][\w$]*)\s*\(`).exec(l)
    if (inst && !KEYWORDS.has(inst[1])) instances++
    if (am) {
      const n = numberOf(am[2])
      if (n) find('info', `${bare(am[1])} is tied to the constant ${am[2].trim()}.`, i + 1)
    }
  }

  // What the compiler wrote about the module itself, and what it says it did not lower.
  const notes = []
  for (let i = 0; i < raw.length; i++) {
    const m = /^\s*\/\/\s*([A-Z][A-Z ]{5,}[A-Z])\s+--\s*(.*)$/.exec(raw[i])
    if (!m) continue
    let text = `${m[1]} -- ${m[2]}`
    for (let j = i + 1; j < raw.length && /^\s*\/\/\s*\S/.test(raw[j]) && !/^\s*\/\/\s*-{3,}/.test(raw[j]); j++) text += ' ' + raw[j].replace(/^\s*\/\/\s*/, '')
    notes.push({ text, line: i + 1 })
  }
  const notLowered = []
  const nl = raw.findIndex((l) => /NOT LOWERED BY THIS BACKEND/.test(l))
  for (let i = nl + 1; nl >= 0 && i < raw.length && /^\s*\/\//.test(raw[i]); i++) {
    const m = /^\s*\/\/\s*(test|invariant|bench)\s+([A-Za-z_][\w$]*)\s*$/.exec(raw[i])
    if (m) notLowered.push({ kind: m[1], name: m[2] })
  }

  // Findings a Verilog-2005 reader stops at.
  const known = new Set([...functions.map((f) => bare(f.name)), ...tasks.map((t) => bare(t.name)), moduleName && bare(moduleName)])
  const calls = new Map()
  const casts = []
  lines.forEach((line, i) => {
    const l = noStrings(line)
    for (const m of l.matchAll(CALL_RE)) if (!NOT_CALLS.has(m[1]) && !KEYWORDS.has(m[1]) && !known.has(m[1])) (calls.get(m[1]) ?? calls.set(m[1], []).get(m[1])).push(i + 1)
    for (const m of l.matchAll(SIZE_CAST_RE)) casts.push({ text: `${m[1]}'(`, line: i + 1 })
  })
  for (const [name, at] of calls) find('error', `${name}() is called and declared nowhere in this module${at.length > 1 ? ` (${at.length} calls)` : ''}.`, at[0])
  if (casts.length) find('error', `${casts.length} SystemVerilog size cast${casts.length === 1 ? '' : 's'} (${[...new Set(casts.map((c) => c.text + '...)'))].join(', ')}); a Verilog-2005 reader rejects the syntax.`, casts[0].line)
  for (const p of ports) if (!p.name.startsWith('\\') && KEYWORDS.has(p.name)) find('error', `port ${p.name} is a Verilog-2005 reserved word; written unescaped, the header does not parse.`, p.line)
  for (const d of declared) if (!d.name.startsWith('\\') && KEYWORDS.has(d.name)) find('error', `${d.name} is a Verilog-2005 reserved word used as a name.`, d.line)

  const bodyEmpty = endIdx >= 0 && lines.slice(headerEnd + 1, endIdx).every((l) => !l.trim())
  if (bodyEmpty) find('warn', 'The module body is empty: nothing between the port list and endmodule.', headerEnd + 2)
  const outputs = ports.filter((p) => p.dir === 'output')
  const undriven = instances ? [] : outputs.filter((p) => !driven.has(bare(p.name)))
  if (undriven.length) find('warn', `${undriven.length} output${undriven.length === 1 ? '' : 's'} with no driver: ${undriven.map((p) => bare(p.name)).join(', ')}.`, undriven[0].line)
  const body = lines.slice(headerEnd + 1, endIdx < 0 ? lines.length : endIdx).map(noStrings).join('\n')
  const unread = ports.filter((p) => p.dir === 'input' && !new RegExp(String.raw`(^|[^\w$\\])${bare(p.name).replace(/[$]/g, '\\$')}(?![\w$])`).test(body))
  if (unread.length) find('info', `${unread.length} input${unread.length === 1 ? ' is' : 's are'} never read: ${unread.map((p) => bare(p.name)).join(', ')}.`, unread[0].line)
  if (!always && !regs && !bodyEmpty) find('info', 'Combinational only: no always block and no register at module scope.', headerEnd + 1)
  const used = new Set(scope.flatMap((l) => [...l.matchAll(CALL_RE)].map((m) => m[1])))
  const idle = functions.filter((f) => !used.has(bare(f.name)))
  if (idle.length && idle.length === functions.length) find('info', `None of the ${functions.length} function${functions.length === 1 ? ' is' : 's is'} called from the module's own logic, so none of ${functions.length === 1 ? 'it' : 'them'} becomes hardware.`, functions[0].line)
  else if (idle.length) find('info', `${idle.map((f) => bare(f.name)).join(', ')} ${idle.length === 1 ? 'is' : 'are'} not called from the module's own logic.`, idle[0].line)
  for (const f of [...functions, ...tasks]) for (const n of f.loops) find('info', `${bare(f.name)} runs a ${n}-iteration loop; synthesis unrolls it.`, f.line)
  if (notLowered.length) find('info', `${notLowered.length} block${notLowered.length === 1 ? '' : 's'} of the spec are not in this text (${notLowered.map((b) => b.kind).filter((k, i, a) => a.indexOf(k) === i).join(', ')}); t27c gen-verilog-for-simulation lowers them.`, nl + 1)

  // The struct map, checked against the text.
  const structs = structLayouts(ast)
  const stated = new Map([...code.matchAll(STATED_RE)].map((m) => [m[1], Number(m[2])]))
  const refused = new Set([...code.matchAll(REFUSED_RE)].map((m) => m[1]))
  const fields = new Set(structs.filter((s) => s.lowered).flatMap((s) => s.fields.map((f) => `${f.lo}/${f.bits}`)))
  const slices = [...code.matchAll(SLICE_RE)].map((m) => ({ name: bare(m[1]), lo: Number(m[2]), bits: Number(m[3]) }))
  for (const s of structs) {
    s.stated = stated.has(s.name) ? stated.get(s.name) : null
    s.refused = refused.has(s.name)
    if (s.stated !== null && s.stated !== s.bits) find('warn', `gen-verilog says ${s.name} packs to ${s.stated} bits; declaration order with t27c's widths gives ${s.bits}.`, null)
    if ((s.stated !== null && !s.lowered) || (s.refused && s.lowered)) find('warn', `gen-verilog ${s.refused ? 'refuses' : 'lowers'} ${s.name}, and this page's reading of t27c's rule ${s.lowered ? 'lowers' : 'refuses'} it.`, null)
    if (!s.lowered) continue
    for (const f of s.fields) if (f.how === 'default') find('warn', `${s.name}.${f.name} has type ${f.type}, which t27c does not size: it takes the ${DEFAULT_WIDTH}-bit default.`, null)
  }
  const strays = slices.filter((x) => !fields.has(`${x.lo}/${x.bits}`))
  if (structs.length && slices.length && strays.length) find('warn', `${strays.length} part-select${strays.length === 1 ? '' : 's'} match no struct field: ${strays.slice(0, 3).map((x) => `${x.name}[${x.lo} +: ${x.bits}]`).join(', ')}.`, null)
  const byName = new Map(structs.filter((s) => s.lowered).map((s) => [s.name, s]))
  const widths = new Map()
  for (const p of ports) widths.set(bare(p.name), { width: p.width, where: 'port', line: p.line })
  for (const f of functions) for (const inp of f.inputs) if (!widths.has(bare(inp.name))) widths.set(bare(inp.name), { width: inp.width, where: `${bare(f.name)} input`, line: f.line })
  const typed = []
  for (const d of ast?.children ?? []) {
    if (d.kind !== 'FnDecl') continue
    for (const p of d.params ?? []) if (byName.has(p.type)) typed.push({ name: p.name, type: p.type })
    if (byName.has(d.returnType)) {
      const f = functions.find((x) => bare(x.name) === d.name)
      if (f) typed.push({ name: d.name, type: d.returnType, width: f.width, where: 'function result', line: f.line })
      else typed.push({ name: `${d.name}_result`, type: d.returnType })
    }
  }
  const seen = new Set()
  for (const t of typed) {
    const w = t.width !== undefined ? t : widths.get(t.name)
    const want = byName.get(t.type).bits
    const key = `${t.name}/${t.type}`
    if (!w || seen.has(key)) continue
    seen.add(key)
    if (w.width !== want) find('warn', `${t.name} carries a ${t.type} as ${w.width} bits (${w.where}); the struct packs to ${want}.`, w.line)
  }
  const checked = { slices: slices.length - strays.length, of: slices.length, typed: seen.size }

  const order = { error: 0, warn: 1, info: 2 }
  findings.sort((a, b) => order[a.level] - order[b.level] || (a.line ?? 1e9) - (b.line ?? 1e9))
  return {
    module: moduleName && bare(moduleName),
    lines: raw.length - (raw[raw.length - 1] === '' ? 1 : 0),
    bytes: new TextEncoder().encode(code).length,
    ports,
    params,
    functions,
    tasks,
    structs,
    checked,
    always,
    regs,
    notes,
    notLowered,
    findings,
  }
}
