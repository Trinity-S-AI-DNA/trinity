// lut-explain/lut.js -- the decoder behind public/widgets/lut-explain/: a Xilinx 7-series LUT6
// INIT value read as logic, and a FASM line split into tile, site, BEL and feature.
//
// No DOM and no English: tool.js renders, scripts/widget-data/lut-explain.mjs runs this same file in
// node over a real FASM file, so the page and the histogram it shows come from one decoder.
//
// The bit-index convention (UG474; prjxray-db segbits name the bits INIT[00]..INIT[63]):
// INIT[i] is the LUT output when the six inputs, read as a binary number, equal i, with input 0 as
// the least significant bit. In a FASM line the inputs are the physical pins A1..A6, so A1 = I0 and
// A6 = I5, and `64'b` text lists INIT[63] first.

export const N_IN = 6
export const N_BITS = 64

const popcount = (x) => { let n = 0; for (; x; x &= x - 1) n++; return n }

/** 64 output bits (Uint8Array) from a BigInt. */
export function bitsFromBig(v) {
  const b = new Uint8Array(N_BITS)
  for (let i = 0; i < N_BITS; i++) b[i] = Number((v >> BigInt(i)) & 1n)
  return b
}

export function bigFromBits(bits) {
  let v = 0n
  for (let i = N_BITS - 1; i >= 0; i--) v = (v << 1n) | BigInt(bits[i] & 1)
  return v
}

export const initHex = (bits) => bigFromBits(bits).toString(16).toUpperCase().padStart(16, '0')
export const initBin = (bits) => Array.from({ length: N_BITS }, (_, k) => bits[N_BITS - 1 - k]).join('')

/**
 * A Verilog-style or bare literal as { value: BigInt, width } or null.
 * Accepts 64'h..., 64'b..., 64'd..., 32'h... (any width up to 64), 0x..., a bare 64-character
 * binary string, or bare hex of 1..16 digits. Underscores are ignored.
 */
export function parseLiteral(text) {
  const s = String(text).trim().replace(/_/g, '')
  let m = s.match(/^(\d+)'([hHbBdD])([0-9a-fA-F]+)$/)
  if (m) {
    const width = Number(m[1])
    if (width < 1 || width > N_BITS) return null
    const base = m[2].toLowerCase()
    const digits = m[3]
    if (base === 'b' && !/^[01]+$/.test(digits)) return null
    if (base === 'd' && !/^\d+$/.test(digits)) return null
    const value = base === 'h' ? BigInt('0x' + digits) : base === 'b' ? BigInt('0b' + digits) : BigInt(digits)
    if (value >> BigInt(width)) return null
    return { value, width }
  }
  m = s.match(/^0[xX]([0-9a-fA-F]{1,16})$/)
  if (m) return { value: BigInt('0x' + m[1]), width: N_BITS }
  if (/^[01]{64}$/.test(s)) return { value: BigInt('0b' + s), width: N_BITS }
  if (/^[0-9a-fA-F]{1,16}$/.test(s)) return { value: BigInt('0x' + s), width: N_BITS }
  return null
}

/**
 * One FASM line split into its parts, or null when it is not a FASM feature line.
 * `TILE.SITE.FEATURE[hi:lo] = value`, `TILE.SITE.FEATURE` (one bit set), or a pip
 * `TILE.DST_WIRE.SRC_WIRE`.
 */
export function parseFasmLine(line) {
  const text = String(line).replace(/#.*$/, '').trim()
  if (!text) return null
  const m = text.match(/^([A-Za-z0-9_]+)\.([A-Za-z0-9_.]+?)(?:\[(\d+)(?::(\d+))?\])?(?:\s*=\s*(\S+))?$/)
  if (!m) return null
  const [, tile, path, hiS, loS, valueText] = m
  const parts = path.split('.')
  const out = {
    text, tile, tileType: tile.replace(/_X\d+Y\d+$/, ''), path, parts,
    hi: hiS == null ? null : Number(hiS), lo: loS == null ? (hiS == null ? null : Number(hiS)) : Number(loS),
    valueText: valueText ?? null, value: null, site: null, feature: null, lut: null, kind: 'other',
  }
  if (out.hi != null && out.lo > out.hi) return null
  if (valueText != null) {
    const lit = parseLiteral(valueText)
    if (!lit) return { ...out, kind: 'bad-value' }
    out.value = lit
  }
  if (/^SLICE[LM]_X[01]$/.test(parts[0]) && parts.length >= 2) {
    out.site = parts[0]
    out.feature = parts.slice(1).join('.')
    out.kind = 'site'
    const lm = out.feature.match(/^([ABCD])LUT\.INIT$/)
    if (lm) { out.lut = lm[1]; out.kind = 'lut-init' }
  } else if (parts.length === 2) {
    out.kind = 'pip'
  }
  return out
}

/**
 * Everything a pasted text says: the LUT INIT it sets (if any), where it sits, and every line parsed.
 * Several INIT lines for the same LUT (INIT[31:0] and INIT[63:32]) are merged; a bare literal or a
 * Verilog `INIT(64'h...)` / `INIT = 64'h...` is read too.
 */
export function parseInput(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const parsed = []
  let bits = null
  let lut = null
  let init = null
  const bad = []
  for (const line of lines) {
    const f = parseFasmLine(line)
    if (f && f.kind === 'lut-init') {
      const key = `${f.tile}.${f.site}.${f.lut}`
      if (!lut || lut.key === key) {
        if (!lut) { lut = { key, tile: f.tile, tileType: f.tileType, site: f.site, lut: f.lut }; bits = new Uint8Array(N_BITS) }
        const lo = f.lo ?? 0
        const hi = f.hi ?? (f.value ? lo + f.value.width - 1 : lo)
        if (hi >= N_BITS) { bad.push(line); parsed.push({ ...f, kind: 'bad-range' }); continue }
        const v = f.value ? f.value.value : 1n
        for (let i = lo; i <= hi; i++) bits[i] = Number((v >> BigInt(i - lo)) & 1n)
        init = bits
      }
      parsed.push(f)
      continue
    }
    if (f && f.kind !== 'bad-value') { parsed.push(f); continue }
    // Not a FASM line: a bare literal, or a literal somewhere in a Verilog line.
    const whole = parseLiteral(line)
    const inside = whole ? null : line.match(/(\d+'[hHbBdD][0-9a-fA-F_]+|0[xX][0-9a-fA-F_]+)/)
    const lit = whole ?? (inside ? parseLiteral(inside[1]) : null)
    if (lit && !init) { init = bitsFromBig(lit.value); continue }
    if (!lit) bad.push(line)
    if (f) parsed.push(f)
  }
  return { bits: init, lut, lines: parsed, bad }
}

/** The inputs (0..5) the output depends on; the others are don't-care. */
export function support(bits) {
  const out = []
  for (let k = 0; k < N_IN; k++) {
    for (let x = 0; x < N_BITS; x++) {
      if (bits[x] !== bits[x ^ (1 << k)]) { out.push(k); break }
    }
  }
  return out
}

/**
 * Quine-McCluskey: the prime implicants, then the smallest cover of the true points.
 * An implicant is { value, dc }: dc has a 1 for every input it does not mention; value has the
 * mentioned inputs' required levels and 0 under dc. Returns { terms, exact, primes }: exact is
 * false only when the branch-and-bound search hit its node budget and kept its best cover so far.
 */
export function minimize(bits, budget = 40000) {
  const ones = []
  for (let i = 0; i < N_BITS; i++) if (bits[i]) ones.push(i)
  if (ones.length === 0) return { terms: [], exact: true, primes: 0 }
  if (ones.length === N_BITS) return { terms: [{ value: 0, dc: N_BITS - 1 }], exact: true, primes: 1 }
  let level = new Map(ones.map((m) => [`${m},0`, { value: m, dc: 0 }]))
  const primes = []
  while (level.size) {
    const items = [...level.values()]
    const used = new Set()
    const next = new Map()
    for (let a = 0; a < items.length; a++) {
      for (let b = a + 1; b < items.length; b++) {
        const p = items[a]
        const q = items[b]
        if (p.dc !== q.dc) continue
        const d = p.value ^ q.value
        if (d & (d - 1)) continue
        used.add(a); used.add(b)
        const t = { value: p.value & ~d, dc: p.dc | d }
        next.set(`${t.value},${t.dc}`, t)
      }
    }
    items.forEach((t, i) => { if (!used.has(i)) primes.push(t) })
    level = next
  }
  // Which true points each prime covers, as a BigInt over the 64 inputs.
  const covers = primes.map((p) => {
    let c = 0n
    for (const m of ones) if ((m & ~p.dc) === p.value) c |= 1n << BigInt(m)
    return c
  })
  const lits = primes.map((p) => N_IN - popcount(p.dc))
  let all = 0n
  for (const m of ones) all |= 1n << BigInt(m)
  let best = null
  let bestLits = Infinity
  let nodes = 0
  let exact = true
  const solve = (left, chosen, litSum) => {
    if (++nodes > budget) { exact = false; return }
    if (left === 0n) {
      if (!best || chosen.length < best.length || (chosen.length === best.length && litSum < bestLits)) { best = chosen.slice(); bestLits = litSum }
      return
    }
    if (best && chosen.length + 1 > best.length) return
    // The uncovered point with the fewest primes able to cover it decides the branch.
    let pick = -1
    let opts = null
    for (let m = 0; m < N_BITS; m++) {
      if (!((left >> BigInt(m)) & 1n)) continue
      const o = []
      for (let i = 0; i < primes.length; i++) if ((covers[i] >> BigInt(m)) & 1n) o.push(i)
      if (!opts || o.length < opts.length) { opts = o; pick = m; if (o.length === 1) break }
    }
    if (pick < 0) return
    opts.sort((i, j) => popcount32(covers[j] & left) - popcount32(covers[i] & left) || lits[i] - lits[j])
    for (const i of opts) {
      chosen.push(i)
      solve(left & ~covers[i], chosen, litSum + lits[i])
      chosen.pop()
      if (!exact) return
    }
  }
  solve(all, [], 0)
  if (!best) {
    // Budget gone before any cover: fall back to a greedy one so the page still shows a correct expression.
    best = []
    let left = all
    while (left) {
      let bi = 0
      for (let i = 1; i < primes.length; i++) if (popcount32(covers[i] & left) > popcount32(covers[bi] & left)) bi = i
      best.push(bi)
      left &= ~covers[bi]
    }
  }
  const terms = best.map((i) => primes[i]).sort((p, q) => (N_IN - popcount(p.dc)) - (N_IN - popcount(q.dc)) || p.value - q.value)
  return { terms, exact, primes: primes.length }
}
const popcount32 = (big) => { let n = 0; for (let v = big; v; v &= v - 1n) n++; return n }

/** The literals of one implicant as [{ input, inverted }] in input order. */
export function termLiterals(t) {
  const out = []
  for (let k = 0; k < N_IN; k++) if (!((t.dc >> k) & 1)) out.push({ input: k, inverted: !((t.value >> k) & 1) })
  return out
}

/** Evaluate an implicant cover at every input: the check that the expression is the table. */
export function coverBits(terms) {
  const b = new Uint8Array(N_BITS)
  for (let x = 0; x < N_BITS; x++) b[x] = terms.some((t) => (x & ~t.dc) === t.value) ? 1 : 0
  return b
}

// Families the decoder names. tool.js shows SAY_CLASS_NAMES in this order.
export const CLASS_IDS = ['zero', 'one', 'buf', 'not', 'and', 'nand', 'or', 'nor', 'andx', 'orx', 'xor', 'xnor', 'maj', 'majx', 'carry2', 'carry2x', 'mux2', 'mux4', 'xorwith', 'xnorwith', 'other']

/**
 * The name of the function, when it has one. Works on the inputs the output depends on, so
 * "XOR2" means two inputs matter and four are don't-care. Returns
 * { id, n, k, inputs, selects, data }: n inputs matter, k of them inverted (AND/OR/majority
 * families), inputs are the input numbers (0 = A1), selects/data for a multiplexer.
 */
export function classify(bits) {
  const inputs = support(bits)
  const n = inputs.length
  const base = { n, k: 0, inputs, selects: [], data: [] }
  if (n === 0) return { ...base, id: bits[0] ? 'one' : 'zero' }
  // g: the function on its own n inputs; bit j of an index is inputs[j].
  const size = 1 << n
  const g = new Uint8Array(size)
  for (let j = 0; j < size; j++) {
    let x = 0
    for (let q = 0; q < n; q++) if ((j >> q) & 1) x |= 1 << inputs[q]
    g[j] = bits[x]
  }
  const ones = g.reduce((s, v) => s + v, 0)
  if (n === 1) return { ...base, id: g[1] ? 'buf' : 'not' }
  const every = (fn) => { for (let j = 0; j < size; j++) if (g[j] !== (fn(j) ? 1 : 0)) return false; return true }
  if (every((j) => popcount(j) & 1)) return { ...base, id: 'xor' }
  if (every((j) => !(popcount(j) & 1))) return { ...base, id: 'xnor' }
  if (ones === 1) {
    const m = g.indexOf(1)
    const k = n - popcount(m)
    return { ...base, k, id: k === 0 ? 'and' : k === n ? 'nor' : 'andx' }
  }
  if (ones === size - 1) {
    const m = g.indexOf(0)
    const k = popcount(m)
    return { ...base, k, id: k === 0 ? 'or' : k === n ? 'nand' : 'orx' }
  }
  if (n === 3) {
    for (let mask = 0; mask < 8; mask++) {
      if (every((j) => popcount(j ^ mask) >= 2)) return { ...base, k: popcount(mask), id: mask ? 'majx' : 'maj' }
    }
    for (let s = 0; s < 3; s++) {
      const [a, b] = [0, 1, 2].filter((q) => q !== s)
      for (const [hi, lo] of [[a, b], [b, a]]) {
        if (every((j) => ((j >> s) & 1 ? (j >> hi) & 1 : (j >> lo) & 1))) {
          return { ...base, id: 'mux2', selects: [inputs[s]], data: [inputs[lo], inputs[hi]] }
        }
      }
    }
  }
  if (n === 5) {
    // maj(a, b, maj(c, d, e)): the carry out of a two-bit add, a + b with c + d and carry in e below.
    for (let a = 0; a < 5; a++) {
      for (let b = a + 1; b < 5; b++) {
        const [c, d, e] = [0, 1, 2, 3, 4].filter((q) => q !== a && q !== b)
        for (let mask = 0; mask < 32; mask++) {
          const lvl = (j, q) => ((j ^ mask) >> q) & 1
          const ok = every((j) => {
            const low = lvl(j, c) + lvl(j, d) + lvl(j, e) >= 2 ? 1 : 0
            return lvl(j, a) + lvl(j, b) + low >= 2
          })
          if (ok) {
            const k = popcount(mask)
            return { ...base, k, id: k ? 'carry2x' : 'carry2', selects: [], data: [inputs[a], inputs[b], inputs[c], inputs[d], inputs[e]] }
          }
        }
      }
    }
  }
  if (n === 6) {
    for (let s1 = 0; s1 < 6; s1++) {
      for (let s2 = s1 + 1; s2 < 6; s2++) {
        const rest = [0, 1, 2, 3, 4, 5].filter((q) => q !== s1 && q !== s2)
        for (const perm of permutations(rest)) {
          if (every((j) => (j >> perm[((j >> s1) & 1) | (((j >> s2) & 1) << 1)]) & 1)) {
            return { ...base, id: 'mux4', selects: [inputs[s1], inputs[s2]], data: perm.map((q) => inputs[q]) }
          }
        }
      }
    }
  }
  // f = (XOR of some inputs) ^ h(the others), with h a named function of two or more inputs:
  // an input is linear when flipping it flips the output at every row.
  const linear = inputs.filter((q) => { for (let x = 0; x < N_BITS; x++) if (bits[x] === bits[x ^ (1 << q)]) return false; return true })
  if (linear.length && n - linear.length >= 2) {
    const h = new Uint8Array(N_BITS)
    for (let x = 0; x < N_BITS; x++) {
      let y = x
      for (const q of linear) y &= ~(1 << q)
      h[x] = bits[y]
    }
    // h or its inverse, whichever reads simpler; the inversion moves into the XOR (then XNOR).
    const inner = classify(h)
    const flipped = classify(h.map((v) => 1 - v))
    const score = (c) => (c.id === 'other' ? 99 : (/x$/.test(c.id) ? 10 : 0) + c.k)
    const [use, xnor] = score(flipped) < score(inner) ? [flipped, true] : [inner, false]
    if (use.id !== 'other') return { ...base, id: xnor ? 'xnorwith' : 'xorwith', k: linear.length, data: linear, inner: use }
  }
  return { ...base, id: 'other' }
}

function permutations(xs) {
  if (xs.length <= 1) return [xs.slice()]
  const out = []
  xs.forEach((x, i) => { for (const p of permutations([...xs.slice(0, i), ...xs.slice(i + 1)])) out.push([x, ...p]) })
  return out
}

/** A stable key for a named function: id, inputs that matter, inputs inverted. */
export const classKey = (c) => (c.inner ? `${c.id}/${c.n}/${c.k}/${classKey(c.inner)}` : `${c.id}/${c.n}/${c.k}`)

/**
 * The two LUT5 halves. With A6 held high and O5 routed (a fractured LUT, UG474), O5 is
 * INIT[31:0] and O6 is INIT[63:32], both as functions of A1..A5. As a LUT6, O6 picks the upper
 * half when A6 = 1 and the lower half when A6 = 0.
 */
export function halves(bits) {
  const lo = new Uint8Array(N_BITS)
  const hi = new Uint8Array(N_BITS)
  for (let x = 0; x < N_BITS; x++) { lo[x] = bits[x & 31]; hi[x] = bits[(x & 31) | 32] }
  return { o5: lo, o6: hi, same: lo.every((v, i) => v === hi[i]) }
}

/** The input vector of row i as six levels, A6 first (the order a truth table prints them). */
export const rowLevels = (i) => Array.from({ length: N_IN }, (_, q) => (i >> (N_IN - 1 - q)) & 1)
