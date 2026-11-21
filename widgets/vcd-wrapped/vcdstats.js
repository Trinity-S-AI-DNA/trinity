// SPDX-License-Identifier: Apache-2.0
// vcd-wrapped/vcdstats.js -- one streaming reader of IEEE 1364 VCD text, and the summary the
// vcd-wrapped widget draws. The same file runs in the reader's browser (tool.js) and in node
// (scripts/widget-data/vcd-wrapped.mjs, which computes the shipped samples' numbers with it), so a
// number on the card and a number in samples.json come from one parser.
//
// It reads the header ($timescale, $scope, $var, $upscope, $enddefinitions) and the value changes
// (#time, scalar 0/1/x/z, vector b..., real r..., string s...). Text arrives in chunks of any size;
// a token cut by a chunk edge is carried to the next one. Holds one counter row per signal, never
// the waveform, so a file of any length reads in the memory of its signal list.
//
// Counting rules (the widget's spec says them in words):
//   - a "value change" is a recorded value that differs from the signal's previous one; the first
//     value a signal gets (usually from $dumpvars at the start) is its initial value, not a change;
//   - "bit flips" count the bit positions that differ between those two values (a vector shorter
//     than its width is extended as VCD says: with 0, or with x or z when it starts with one);
//   - values inside $dumpoff ... $end are the dumper's "unknown while off" marks and are skipped;
//   - one id code declared in several scopes is one signal with several names (aliases);
//   - a signal "stays X/Z" when it has values and none of them is fully known (no 0/1-only value);
//   - parameters are counted apart: they are constants, so "never changed" excludes them.
// Text only; this file has no words of its own. Errors carry a code the page turns into words.

export class VcdError extends Error {
  constructor(code, detail = {}) {
    super(code)
    this.code = code
    this.detail = detail
  }
}

const UNIT_EXP = { s: 0, ms: -3, us: -6, ns: -9, ps: -12, fs: -15 }
const SCALAR = new Set(['0', '1', 'x', 'X', 'z', 'Z', 'u', 'U', 'w', 'W', 'l', 'L', 'h', 'H', '-'])
const isUnknownChar = (c) => c === 'x' || c === 'X' || c === 'z' || c === 'Z' || c === 'u' || c === 'U' || c === 'w' || c === 'W' || c === '-'

/** Pads or cuts a bit string to `width` the way VCD extends a short vector. */
function extend(bits, width) {
  if (bits.length >= width) return bits.slice(bits.length - width)
  const c = bits[0]
  const fill = c === 'x' || c === 'X' ? 'x' : c === 'z' || c === 'Z' ? 'z' : '0'
  return fill.repeat(width - bits.length) + bits
}

function flipsBetween(a, b) {
  let n = 0
  for (let i = 0; i < a.length; i++) if (a[i].toLowerCase() !== b[i].toLowerCase()) n++
  return n
}

/**
 * A streaming VCD reader. push(text) any number of times, then end() for the summary.
 * Options: maxHeaderChars -- refuse when no $enddefinitions arrives within this many characters.
 */
export function createVcdReader({ maxHeaderChars = 64 * 1024 * 1024 } = {}) {
  let carry = ''
  let started = false
  let inHeader = true
  let chars = 0
  // header state
  let cmd = null // the $command being read, with its tokens
  let cmdTokens = []
  const scope = []
  let scopes = 0
  let timescale = null
  let version = ''
  let vars = 0
  const byId = new Map()
  const order = []
  // body state
  let block = null // '$dumpvars' | '$dumpall' | '$dumpon' | '$dumpoff' | '$comment' | other $ word
  let pendingVec = null // { kind: 'b'|'r'|'s', value }
  let time = null
  let tFirst = null
  let tLast = null
  let stamps = 0

  const fail = (code, detail) => { throw new VcdError(code, detail) }

  function endCommand() {
    const t = cmdTokens
    if (cmd === '$timescale') {
      const m = /^(1|10|100)\s*(s|ms|us|ns|ps|fs)$/.exec(t.join(''))
      if (!m) fail('timescale', { text: t.join(' ') })
      timescale = { mul: Number(m[1]), unit: m[2], exp: UNIT_EXP[m[2]] }
    } else if (cmd === '$version') {
      version = t.join(' ').trim()
    } else if (cmd === '$scope') {
      scope.push(t[1] ?? t[0] ?? '?')
      scopes++
    } else if (cmd === '$upscope') {
      scope.pop()
    } else if (cmd === '$var') {
      const [type, w, id, ref, index] = t
      const width = Number(w)
      if (!type || !id || !ref || !(width >= 0)) fail('bad-var', { text: t.join(' ') })
      vars++
      let name = [...scope, ref].join('.')
      if (index && index !== '$end' && !index.includes(':')) name += index
      const s = byId.get(id)
      if (s) s.aliases.push(name)
      else {
        const sig = {
          id, name, aliases: [], type, width: Math.max(1, width), real: type === 'real' || type === 'realtime',
          param: type === 'parameter', string: type === 'string',
          value: null, values: 0, changes: 0, flips: 0, everKnown: false, lastChange: null,
        }
        byId.set(id, sig)
        order.push(sig)
      }
    } else if (cmd === '$enddefinitions') {
      inHeader = false
      if (vars === 0) fail('no-vars')
    }
    cmd = null
    cmdTokens = []
  }

  function record(id, value, kind) {
    if (block === '$dumpoff') return
    const s = byId.get(id)
    if (!s) fail('unknown-id', { token: id, time })
    s.values++
    let v = value
    let known
    if (kind === 'r' || kind === 's' || s.real || s.string) {
      known = !/^(nan|x|z)$/i.test(v)
    } else {
      v = extend(v, s.width)
      known = true
      for (let i = 0; i < v.length; i++) if (isUnknownChar(v[i])) { known = false; break }
    }
    if (known) s.everKnown = true
    if (s.value === null) { s.value = v; return }
    if (s.value === v) return
    s.changes++
    if (!(kind === 'r' || kind === 's' || s.real || s.string)) s.flips += flipsBetween(s.value, v)
    else s.flips++
    s.lastChange = time
    s.value = v
  }

  function headerToken(tok) {
    if (cmd) {
      if (tok === '$end') endCommand()
      else cmdTokens.push(tok)
      return
    }
    if (tok[0] !== '$') fail('not-vcd', { token: tok.slice(0, 40) })
    cmd = tok
    if (tok === '$enddefinitions') { /* waits for its $end */ }
  }

  function bodyToken(tok) {
    if (pendingVec) {
      const { kind, value } = pendingVec
      pendingVec = null
      record(tok, value, kind)
      return
    }
    if (block === '$comment') { if (tok === '$end') block = null; return }
    const c = tok[0]
    if (c === '#') {
      if (!/^#\d+$/.test(tok)) fail('bad-token', { token: tok.slice(0, 40), time })
      time = Number(tok.slice(1))
      if (tFirst === null) tFirst = time
      tLast = time
      stamps++
      return
    }
    if (c === '$') {
      if (tok === '$end') block = null
      else block = tok
      return
    }
    if (c === 'b' || c === 'B') { pendingVec = { kind: 'b', value: tok.slice(1) }; return }
    if (c === 'r' || c === 'R') { pendingVec = { kind: 'r', value: tok.slice(1) }; return }
    if (c === 's' || c === 'S') { pendingVec = { kind: 's', value: tok.slice(1) }; return }
    if (SCALAR.has(c) && tok.length > 1) { record(tok.slice(1), c.toLowerCase(), 'scalar'); return }
    fail('bad-token', { token: tok.slice(0, 40), time })
  }

  function feed(tokens) {
    for (const tok of tokens) {
      if (!tok) continue
      if (inHeader) headerToken(tok)
      else bodyToken(tok)
    }
  }

  return {
    push(text) {
      if (!started) {
        const head = text.slice(0, 4096)
        if (head.includes('\u0000')) fail('binary')
        const first = head.trimStart()
        if (!first) { carry += text; chars += text.length; return }
        if (first[0] !== '$') fail('not-vcd', { token: first.split(/\s/)[0].slice(0, 40) })
        started = true
      }
      chars += text.length
      const all = carry + text
      // keep a token that may continue in the next chunk
      let cut = all.length
      while (cut > 0 && !/\s/.test(all[cut - 1])) cut--
      carry = all.slice(cut)
      feed(all.slice(0, cut).split(/\s+/))
      if (inHeader && chars > maxHeaderChars) fail('no-defs')
    },
    get chars() { return chars },
    end() {
      if (carry) { feed(carry.split(/\s+/)); carry = '' }
      if (!started) fail('empty')
      if (inHeader) fail('no-defs')
      if (pendingVec) fail('bad-token', { token: pendingVec.kind + pendingVec.value, time })
      return summarize({ order, vars, scopes, timescale, version, tFirst, tLast, stamps, chars })
    },
  }
}

const row = (s) => ({ name: s.name, width: s.width, type: s.type, changes: s.changes, flips: s.flips, aliases: s.aliases.length })
const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)

/** The numbers the widget shows, from the per-signal counters. */
export function summarize({ order, vars, scopes, timescale, version, tFirst, tLast, stamps, chars }, top = 5) {
  const live = order.filter((s) => !s.param)
  const params = order.length - live.length
  let changes = 0
  let flips = 0
  for (const s of order) { changes += s.changes; flips += s.flips }
  const movers = live.filter((s) => s.changes > 0)
  const busiest = [...movers].sort((a, b) => b.changes - a.changes || b.flips - a.flips || byName(a, b)).slice(0, top).map(row)
  const quietest = [...movers].sort((a, b) => a.changes - b.changes || a.flips - b.flips || byName(a, b)).slice(0, top).map(row)
  const stuck = live.filter((s) => s.values > 0 && !s.everKnown).sort(byName)
  const endsUnknown = live.filter((s) => s.values > 0 && s.everKnown && s.value !== null && !s.real && !s.string && /[xzuw-]/i.test(s.value)).sort(byName)
  const never = live.filter((s) => s.changes === 0)
  return {
    timescale,
    version,
    t_first: tFirst ?? 0,
    t_last: tLast ?? 0,
    span: (tLast ?? 0) - (tFirst ?? 0),
    stamps,
    chars,
    vars,
    signals: order.length,
    params,
    scopes,
    changes,
    flips,
    busiest,
    quietest,
    stuck_xz: stuck.length,
    stuck_xz_names: stuck.slice(0, top).map((s) => s.name),
    ends_xz: endsUnknown.length,
    ends_xz_names: endsUnknown.slice(0, top).map((s) => s.name),
    never_changed: never.length,
    movers: movers.length,
  }
}

/** Reads a whole string at once (node, tests). */
export function vcdSummary(text, opts) {
  const r = createVcdReader(opts)
  const step = 1 << 20
  for (let i = 0; i < text.length; i += step) r.push(text.slice(i, i + step))
  return r.end()
}

/** The span in seconds as [value, unit index into s, ms, us, ns, ps, fs], for display. */
export function spanUnits(ticks, timescale) {
  if (!timescale) return [ticks, -1]
  const units = ['s', 'ms', 'us', 'ns', 'ps', 'fs']
  // ticks * mul * 10^exp seconds; pick the largest unit with a value >= 1
  const exp = timescale.exp
  const v = ticks * timescale.mul
  for (let i = 0; i < units.length; i++) {
    const shift = exp - UNIT_EXP[units[i]] // v * 10^shift in units[i]
    const val = v * 10 ** shift
    if (val >= 1 || i === units.length - 1) return [Number(val.toPrecision(4)), i]
  }
  return [v, units.indexOf(timescale.unit)]
}
