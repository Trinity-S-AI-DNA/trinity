// xdc.js -- the XDC reader and pin lint behind public/widgets/pin-map/.
//
// One module, two callers: tool.js runs it in the reader's browser on the file they paste or drop,
// and scripts/widget-data/pin-map.mjs runs the same code in node on the demo XDCs, so the counts in
// the spec are the counts this code produces. No I/O here, no English: lint findings are ids plus
// arguments, and the page turns them into words from SAY_* constants.

/** Pin type of a prjxray-db pin_function, first match wins. Used by the data script, not by hand. */
export const CONFIG_TOKEN = /^(D\d\d|A\d\d|FCS_B|FOE_B|FWE_B|ADV_B|RS[01]|EMCCLK|CSI_B|DOUT_CSO_B|RDWR_B|PUDC_B|MOSI|DIN|CCLK)$/
export function pinType(fn) {
  if (/^MGT/.test(fn)) return 'mgt'
  if (fn === 'VP_0' || fn === 'VN_0') return 'xadc'
  const parts = fn.split('_')
  if (parts.includes('MRCC') || parts.includes('SRCC')) return 'clock'
  if (parts.some((t) => CONFIG_TOKEN.test(t))) return 'config'
  if (parts.some((t) => /^AD\d+[PN]$/.test(t))) return 'analog'
  if (parts.includes('VREF')) return 'vref'
  return 'io'
}
/** True when a user IO also serves configuration (a dual-purpose pin, usable after configuration). */
export const isDualConfig = (fn) => fn.split('_').some((t) => CONFIG_TOKEN.test(t))

// ---------------------------------------------------------------------------------------------
// Tcl-ish reading. XDC is Tcl; we read the subset that places ports: set_property with PACKAGE_PIN,
// LOC and IOSTANDARD, in plain or -dict form, on [get_ports ...]. Everything else is counted, not
// interpreted.
// ---------------------------------------------------------------------------------------------

/** Split a command into words, keeping {...}, [...] and "..." groups whole. */
function words(s) {
  const out = []
  let i = 0
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++
    if (i >= s.length) break
    const start = i
    let depthB = 0, depthK = 0, quote = false
    while (i < s.length) {
      const c = s[i]
      if (c === '\\') { i += 2; continue }
      if (quote) { if (c === '"') quote = false; i++; continue }
      if (c === '"' && depthB === 0) quote = true
      else if (c === '{') depthB++
      else if (c === '}') depthB--
      else if (c === '[' && depthB === 0) depthK++
      else if (c === ']' && depthB === 0) depthK--
      else if (/\s/.test(c) && depthB <= 0 && depthK <= 0 && !quote) break
      i++
    }
    out.push(s.slice(start, i))
  }
  return out
}
const unwrap = (w) => {
  const t = w.trim()
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('"') && t.endsWith('"'))) return t.slice(1, -1).trim()
  return t
}

/** Split a line into commands at `;` outside groups; a `#` that starts a command comments out the rest. */
function commands(line) {
  const out = []
  let cur = '', depthB = 0, depthK = 0, quote = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '\\') { cur += c + (line[i + 1] ?? ''); i++; continue }
    if (quote) { if (c === '"') quote = false; cur += c; continue }
    if (c === '"') quote = true
    else if (c === '{') depthB++
    else if (c === '}') depthB--
    else if (c === '[') depthK++
    else if (c === ']') depthK--
    if (c === '#' && depthB <= 0 && depthK <= 0 && cur.trim() === '') break
    if (c === ';' && depthB <= 0 && depthK <= 0) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur)
  return out.map((c) => c.trim()).filter(Boolean)
}

/** Port names of an object word like [get_ports {a b}] or [get_ports led[0]]; null when not get_ports. */
function portsOf(word) {
  const t = word.trim()
  if (!t.startsWith('[') || !t.endsWith(']')) return null
  const inner = words(t.slice(1, -1))
  if (inner[0] !== 'get_ports') return null
  const args = inner.slice(1).filter((a) => !a.startsWith('-'))
  const names = []
  for (const a of args) for (const n of unwrap(a).split(/\s+/)) if (n) names.push(n.replace(/^\{|\}$/g, ''))
  return names
}

/**
 * Read an XDC text. Returns
 *   { pins: [{port, ball, line}], stds: [{pattern, std, line}], commands, placed, skipped }
 * where `commands` counts every command seen, `placed` the set_property commands read, and
 * `skipped` the commands that are not port placement (clocks, bitstream options, comments aside).
 */
export function parseXdc(text) {
  const raw = String(text).replace(/\r\n?/g, '\n').split('\n')
  const lines = []
  for (let i = 0; i < raw.length; i++) {
    let l = raw[i]
    const at = i + 1
    while (/\\$/.test(l) && i + 1 < raw.length) l = l.slice(0, -1) + ' ' + raw[++i]
    lines.push([at, l])
  }
  const pins = [], stds = []
  let count = 0, placed = 0, skipped = 0
  for (const [line, l] of lines) {
    for (const cmd of commands(l)) {
      count++
      const w = words(cmd)
      if (w[0] !== 'set_property' || w.length < 3) { skipped++; continue }
      let props = []
      let objects
      if (w[1] === '-dict') {
        const kv = words(unwrap(w[2] ?? ''))
        for (let k = 0; k + 1 < kv.length; k += 2) props.push([unwrap(kv[k]).toUpperCase(), unwrap(kv[k + 1])])
        objects = w.slice(3)
      } else {
        props = [[unwrap(w[1]).toUpperCase(), unwrap(w[2] ?? '')]]
        objects = w.slice(3)
      }
      const ports = objects.map(portsOf).find((p) => p) ?? null
      const useful = props.filter(([k]) => k === 'PACKAGE_PIN' || k === 'LOC' || k === 'IOSTANDARD')
      if (!ports || !useful.length) { skipped++; continue }
      placed++
      for (const [k, v] of useful) {
        for (const p of ports) {
          if (k === 'IOSTANDARD') stds.push({ pattern: p, std: v.toUpperCase(), line })
          else pins.push({ port: p, ball: v.toUpperCase(), line })
        }
      }
    }
  }
  return { pins, stds, commands: count, placed, skipped }
}

const globRe = (p) => new RegExp('^' + p.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
/** Does an IOSTANDARD object pattern cover a port? Exact, bus base (led covers led[3]) or glob. */
export function covers(pattern, port) {
  if (pattern === port) return true
  if (port.startsWith(pattern + '[')) return true
  if (/[*?]/.test(pattern)) return globRe(pattern).test(port)
  return false
}

/**
 * Lint an XDC against a package. `pkg` = { rows: [..], cols: n, pins: Map ball -> {bank, fn, type} },
 * `vcco` = Map IOSTANDARD -> millivolts. Returns
 *   { ports: [{port, ball, std, line, bank, fn, type}], findings: [{id, sev, ball, port, args}] }
 * Severities: 'error' (cannot work), 'warn' (likely wrong), 'info' (worth knowing).
 */
export function lintXdc(parsed, pkg, vcco) {
  const findings = []
  const add = (id, sev, ball, port, args = []) => findings.push({ id, sev, ball, port, args })
  const lastBall = new Map()
  for (const p of parsed.pins) {
    const prev = lastBall.get(p.port)
    if (prev && prev.ball !== p.ball) add('moved', 'warn', p.ball, p.port, [prev.ball, prev.line])
    lastBall.set(p.port, p)
  }
  const rowSet = new Set(pkg.rows)
  const ports = []
  for (const p of lastBall.values()) {
    let std = null
    for (const s of parsed.stds) if (covers(s.pattern, p.port)) std = s.std
    const m = /^([A-Z]+)(\d+)$/.exec(p.ball)
    const onGrid = m && rowSet.has(m[1]) && +m[2] >= 1 && +m[2] <= pkg.cols
    const info = pkg.pins.get(p.ball)
    ports.push({ port: p.port, ball: p.ball, std, line: p.line, bank: info ? info.bank : null, fn: info ? info.fn : null, type: info ? info.type : (onGrid ? 'unlisted' : null) })
    if (!onGrid) add('noball', 'error', p.ball, p.port)
    else if (!info) add('notio', 'error', p.ball, p.port)
    else if (info.type === 'mgt') add('mgt', 'error', p.ball, p.port, [info.fn])
    else if (info.type === 'xadc') add('xadc', 'error', p.ball, p.port, [info.fn])
    else if (isDualConfig(info.fn)) add('dual', 'info', p.ball, p.port, [info.fn])
    if (!std) add('nostd', 'warn', p.ball, p.port)
  }
  const byBall = new Map()
  for (const p of ports) byBall.set(p.ball, [...(byBall.get(p.ball) ?? []), p.port])
  for (const [ball, names] of byBall) if (names.length > 1) add('twoports', 'error', ball, names[0], [names.join(', ')])
  const banks = new Map()
  for (const p of ports) {
    if (p.bank === null || !p.std || !vcco.has(p.std)) continue
    const mv = vcco.get(p.std)
    if (!banks.has(p.bank)) banks.set(p.bank, new Map())
    banks.get(p.bank).set(mv, [...(banks.get(p.bank).get(mv) ?? []), p])
  }
  for (const [bank, levels] of banks) {
    if (levels.size < 2) continue
    const stds = [...levels].sort((a, b) => b[0] - a[0]).flatMap(([, ps]) => ps.map((q) => q.std)).filter((s, i, a) => a.indexOf(s) === i)
    const first = [...levels.values()][1][0]
    add('vcco', 'warn', first.ball, first.port, [bank, stds.join(' / ')])
  }
  const order = { error: 0, warn: 1, info: 2 }
  findings.sort((a, b) => order[a.sev] - order[b.sev] || a.ball.localeCompare(b.ball, 'en', { numeric: true }))
  return { ports, findings }
}

/** Counts the page and the card quote: placed ports, on user IO, flagged with an error. */
export function summarize(lint) {
  const bad = new Set(lint.findings.filter((f) => f.sev === 'error').map((f) => f.ball))
  const ports = lint.ports.length
  const ok = lint.ports.filter((p) => !bad.has(p.ball)).length
  return { ports, ok, flaggedBalls: bad.size, errors: lint.findings.filter((f) => f.sev === 'error').length, warnings: lint.findings.filter((f) => f.sev === 'warn').length, infos: lint.findings.filter((f) => f.sev === 'info').length }
}
