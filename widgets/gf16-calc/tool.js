// public/widgets/gf16-calc/tool.js -- the GF16 calculator.
// Words and numbers come from specs/widgets/gf16-calc.t27 through window.T27_WIDGET; this file
// holds no English of its own. The layout (field widths, bias, NaN code) is read at run time from
// the vendored gf16.t27 named by K_LAYOUT_FILE, and checked against the spec's K_* constants.
// All rounding is done on exact fractions of BigInts: a decimal the reader types is never passed
// through a binary64 on its way to 16 bits.
//
// The math is exported so node can check it (and so the card script draws real values); the page
// part runs only where there is a document.

// ---------------------------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------------------------

/** The layout the spec's K_* constants describe. */
export function layoutFromConstants(c) {
  return {
    bits: c.K_BITS, s: c.K_SIGN_BITS, e: c.K_EXP_BITS, m: c.K_MANT_BITS,
    bias: c.K_BIAS, expMax: c.K_EXP_MAX, nan: c.K_NAN_BITS,
  }
}

/**
 * The layout a gf16.t27 text declares, from its `pub const NAME : type = value;` lines for the
 * names in K_LAYOUT_NAMES (SIGN_SHIFT, EXP_SHIFT, EXP_MAX, BIAS, MANT_MASK, GF16_NAN).
 * Returns null when a name is missing or the masks do not agree with the shifts.
 */
export function layoutFromSpecText(text, names) {
  const v = {}
  for (const name of names) {
    const m = new RegExp(`^\\s*pub\\s+const\\s+${name}\\s*:\\s*[a-z0-9]+\\s*=\\s*(0x[0-9a-fA-F]+|\\d+)\\s*;`, 'm').exec(text)
    if (!m) return null
    v[name] = Number(m[1])
  }
  const [SIGN_SHIFT, EXP_SHIFT, EXP_MAX, BIAS, MANT_MASK, NAN] = names.map((n) => v[n])
  const mant = EXP_SHIFT
  const exp = SIGN_SHIFT - EXP_SHIFT
  if (!(mant > 0 && exp > 0)) return null
  if (MANT_MASK !== 2 ** mant - 1 || EXP_MAX !== 2 ** exp - 1) return null
  return { bits: SIGN_SHIFT + 1, s: 1, e: exp, m: mant, bias: BIAS, expMax: EXP_MAX, nan: NAN }
}

/** Names of the layout fields on which two layouts disagree. */
export function layoutDiff(a, b) {
  return ['bits', 's', 'e', 'm', 'bias', 'expMax', 'nan'].filter((k) => a[k] !== b[k])
}

// ---------------------------------------------------------------------------------------------
// Exact numbers: a value is { neg, n, d } with n >= 0, d > 0 BigInts, or a special.
// ---------------------------------------------------------------------------------------------

const bitlen = (x) => (x === 0n ? 0 : x.toString(2).length)
const pow = (b, k) => b ** BigInt(k)

/**
 * Reads what the reader typed. Returns
 *   { kind: 'hex', bits } | { kind: 'inf', neg } | { kind: 'nan' } | { kind: 'num', neg, n, d }
 * or null when it is not something this page reads.
 */
export function parseInput(raw, { bits = 16, expLimit = 999 } = {}) {
  const s = String(raw ?? '').trim().toLowerCase().replace(/_/g, '')
  if (!s) return null
  const hexDigits = Math.ceil(bits / 4)
  const hx = /^0x([0-9a-f]+)$/.exec(s)
  if (hx) {
    if (hx[1].length > hexDigits) return null
    const v = parseInt(hx[1], 16)
    return v < 2 ** bits ? { kind: 'hex', bits: v } : null
  }
  if (/^[+-]?(inf|infinity)$/.test(s)) return { kind: 'inf', neg: s.startsWith('-') }
  if (/^[+-]?nan$/.test(s)) return { kind: 'nan' }
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/.exec(s)
  if (!m) return null
  const int = m[2] ?? ''
  const frac = m[3] ?? ''
  if (!int && !frac) return null
  const exp = m[4] ? Number(m[4]) : 0
  if (!Number.isFinite(exp) || Math.abs(exp) > expLimit || int.length + frac.length > expLimit) return null
  const digits = BigInt((int + frac).replace(/^0+(?=\d)/, '') || '0')
  const scale = exp - frac.length
  const n = scale >= 0 ? digits * pow(10n, scale) : digits
  const d = scale >= 0 ? 1n : pow(10n, -scale)
  return { kind: 'num', neg: m[1] === '-', n, d }
}

/** Compares n/d with 2^e: -1, 0 or 1. */
function cmpPow2(n, d, e) {
  const a = e >= 0 ? n : n << BigInt(-e)
  const b = e >= 0 ? d << BigInt(e) : d
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Rounds the exact value neg * n / d to the layout L, ties broken by `mode` ('even' or 'zero').
 * Returns { bits, dir, tie, overflow, underflow }: dir is 0 when exact, -1 when the magnitude
 * went down, +1 when it went up.
 */
export function encodeExact(neg, n, d, L, mode = 'even') {
  const signBit = neg ? 2 ** (L.bits - 1) : 0
  const oneM = 1n << BigInt(L.m)
  const infBits = signBit + L.expMax * 2 ** L.m
  if (n === 0n) return { bits: signBit, dir: 0, tie: false, overflow: false, underflow: false }
  let e = bitlen(n) - bitlen(d)
  if (cmpPow2(n, d, e) < 0) e -= 1
  const emin = 1 - L.bias
  // Far beyond the range: no need to build a huge integer to know the answer.
  if (e > L.expMax - L.bias) return { bits: infBits, dir: 1, tie: false, overflow: true, underflow: false }
  const eff = Math.max(e, emin)
  const sh = L.m - eff
  const num = sh >= 0 ? n << BigInt(sh) : n
  const den = sh >= 0 ? d : d << BigInt(-sh)
  let q = num / den
  const r = num % den
  const twice = 2n * r
  const tie = r !== 0n && twice === den
  const up = r !== 0n && (twice > den || (tie && mode === 'even' && (q & 1n) === 1n))
  if (up) q += 1n
  const dir = r === 0n ? 0 : up ? 1 : -1
  let E = eff
  if (q === oneM << 1n) { q >>= 1n; E += 1 }
  const biased = q >= oneM ? E + L.bias : 0
  if (biased >= L.expMax) return { bits: infBits, dir: 1, tie, overflow: true, underflow: false }
  const mant = Number(biased ? q - oneM : q)
  if (biased === 0 && mant === 0) return { bits: signBit, dir: -1, tie, overflow: false, underflow: true }
  return { bits: signBit + biased * 2 ** L.m + mant, dir, tie, overflow: false, underflow: false }
}

/** Encodes anything parseInput returns (hex is returned as is). */
export function encodeParsed(p, L, mode) {
  if (p.kind === 'hex') return { bits: p.bits, dir: 0, tie: false, overflow: false, underflow: false }
  if (p.kind === 'nan') return { bits: L.nan, dir: 0, tie: false, overflow: false, underflow: false }
  if (p.kind === 'inf') return { bits: (p.neg ? 2 ** (L.bits - 1) : 0) + L.expMax * 2 ** L.m, dir: 0, tie: false, overflow: false, underflow: false }
  return encodeExact(p.neg, p.n, p.d, L, mode)
}

/**
 * The fields of a code and its exact value: { sign, exp, mant, cls, neg, q, k } where the value
 * is (-1)^neg * q * 2^k. cls is 0 zero, 1 subnormal, 2 normal, 3 infinity, 4 NaN.
 */
export function decodeBits(bits, L) {
  const sign = Math.floor(bits / 2 ** (L.bits - 1)) & 1
  const exp = Math.floor(bits / 2 ** L.m) & L.expMax
  const mant = bits % 2 ** L.m
  const base = { sign, exp, mant, neg: sign === 1 }
  if (exp === L.expMax) return { ...base, cls: mant === 0 ? 3 : 4, q: null, k: 0 }
  if (exp === 0) return { ...base, cls: mant === 0 ? 0 : 1, q: BigInt(mant), k: 1 - L.bias - L.m }
  return { ...base, cls: 2, q: (1n << BigInt(L.m)) + BigInt(mant), k: exp - L.bias - L.m }
}

/** q * 2^k as a fraction { n, d }. */
export const fracOf = (q, k) => (k >= 0 ? { n: q << BigInt(k), d: 1n } : { n: q, d: 1n << BigInt(-k) })

/** q * 2^k written out in full: a binary fraction always has a finite decimal. */
export function exactDecimal(q, k, neg = false) {
  let s
  if (k >= 0) s = (q << BigInt(k)).toString()
  else {
    const digits = (q * pow(5n, -k)).toString().padStart(-k + 1, '0')
    const cut = digits.length + k
    s = `${digits.slice(0, cut)}.${digits.slice(cut)}`.replace(/0+$/, '').replace(/\.$/, '')
  }
  return (neg ? '-' : '') + s
}

/** A fraction num/den (num may be negative) to `sig` significant digits. */
export function fmtSig(num, den, sig = 4) {
  if (num === 0n) return '0'
  const neg = num < 0n
  const a = neg ? -num : num
  let p = a.toString().length - den.toString().length
  const ge = (pp) => (pp >= 0 ? a >= den * pow(10n, pp) : a * pow(10n, -pp) >= den)
  if (!ge(p)) p -= 1
  if (ge(p + 1)) p += 1
  const shift = sig - 1 - p
  const sn = shift >= 0 ? a * pow(10n, shift) : a
  const sd = shift >= 0 ? den : den * pow(10n, -shift)
  let m = (2n * sn + sd) / (2n * sd)
  if (m >= pow(10n, sig)) { m /= 10n; p += 1 }
  let digits = m.toString()
  let out
  if (p >= -4 && p < sig + 2) {
    if (p >= 0) {
      const intLen = p + 1
      digits = digits.padEnd(intLen, '0')
      out = digits.slice(0, intLen) + (digits.length > intLen ? '.' + digits.slice(intLen) : '')
    } else out = '0.' + '0'.repeat(-p - 1) + digits
    if (out.includes('.')) out = out.replace(/0+$/, '').replace(/\.$/, '')
  } else {
    const rest = digits.slice(1).replace(/0+$/, '')
    out = `${digits[0]}${rest ? '.' + rest : ''}e${p}`
  }
  return (neg ? '-' : '') + out
}

/** Error and relative error of the decoded q*2^k against neg*n/d, as fractions. */
export function errorOf(q, k, n, d) {
  const { n: A, d: B } = fracOf(q, k)
  const diff = A * d - n * B
  return { abs: { num: diff, den: B * d }, rel: n === 0n ? null : { num: diff, den: B * n } }
}

/**
 * Balanced ternary of neg*n/d with `frac` trits after the point, rounded to nearest (ties away
 * from zero). Returns { trits (most significant first), intTrits, T (scaled integer) } or
 * { tooWide: true } when more than maxInt trits would stand before the point.
 */
export function ternaryOf(neg, n, d, frac, maxInt) {
  if (bitlen(n) - bitlen(d) > Math.ceil(maxInt * Math.log2(3)) + 2) return { tooWide: true }
  const scaled = n * pow(3n, frac)
  let T = (2n * scaled + d) / (2n * d)
  const digits = []
  let x = T
  while (x > 0n) {
    const r = x % 3n
    if (r === 0n) { digits.push(0); x /= 3n } else if (r === 1n) { digits.push(1); x = (x - 1n) / 3n } else { digits.push(-1); x = (x + 1n) / 3n }
  }
  while (digits.length < frac + 1) digits.push(0)
  const intTrits = digits.length - frac
  if (intTrits > maxInt) return { tooWide: true }
  const trits = digits.reverse().map((t) => (neg ? -t : t) || 0)
  if (neg) T = -T
  return { trits, intTrits, T }
}

/** The integer the trits spell (most significant first). */
export function tritsValue(trits) {
  let v = 0n
  for (const t of trits) v = v * 3n + BigInt(t)
  return v
}

/** Every vector of the spec's self-check: [{ name, input, want, got, ok }]. */
export function runChecks(c, L) {
  const out = []
  const one = (name, input, want, mode) => {
    const p = parseInput(input, { bits: L.bits, expLimit: c.K_DECIMAL_EXP_LIMIT })
    const got = p ? encodeParsed(p, L, mode).bits : null
    out.push({ name, input, mode, want, got, ok: got === want })
  }
  c.K_CHECK_INPUTS.forEach((input, i) => one(c.K_CHECK_NAMES[i], input, c.K_CHECK_BITS[i], 'even'))
  const ties = []
  c.K_TIE_INPUTS.forEach((input, i) => {
    for (const [mode, want] of [['even', c.K_TIE_BITS_EVEN[i]], ['zero', c.K_TIE_BITS_ZERO[i]]]) {
      const p = parseInput(input, { bits: L.bits })
      const got = encodeParsed(p, L, mode).bits
      ties.push({ name: `${input}/${mode}`, input, mode, want, got, ok: got === want })
    }
  })
  return { vectors: out, ties }
}

export const hexOf = (bits, L) => '0x' + bits.toString(16).toUpperCase().padStart(Math.ceil(L.bits / 4), '0')

/** Everything the page draws for one input. */
export function analyse(raw, c, L, mode) {
  const p = parseInput(raw, { bits: L.bits, expLimit: c.K_DECIMAL_EXP_LIMIT })
  if (!p) return null
  const enc = encodeParsed(p, L, mode)
  const dec = decodeBits(enc.bits, L)
  const res = { parsed: p, enc, dec, hex: hexOf(enc.bits, L) }
  if (dec.q !== null) res.decoded = exactDecimal(dec.q, dec.k, dec.neg)
  // The number the ternary row and the error refer to: the input, or the decoded raw bits.
  let src = null
  if (p.kind === 'num') src = { neg: p.neg, n: p.n, d: p.d }
  else if (p.kind === 'hex' && dec.q !== null) src = { neg: dec.neg, ...fracOf(dec.q, dec.k) }
  if (p.kind === 'num' && dec.q !== null) {
    const err = errorOf(dec.q, dec.k, p.n, p.d)
    const s = p.neg ? -1n : 1n
    res.err = fmtSig(s * err.abs.num, err.abs.den, c.K_SIG_DIGITS)
    res.rel = err.rel ? fmtSig(err.rel.num, err.rel.den, c.K_SIG_DIGITS) : null
  }
  if (src) {
    const t = ternaryOf(src.neg, src.n, src.d, c.K_TERNARY_FRAC_TRITS, c.K_TERNARY_MAX_TRITS)
    if (!t.tooWide) {
      const den = pow(3n, c.K_TERNARY_FRAC_TRITS)
      t.approx = fmtSig(t.T, den, 10)
      const s = src.neg ? -1n : 1n
      t.err = fmtSig(t.T * src.d - s * src.n * den, den * src.d, c.K_SIG_DIGITS)
      const back = tritsValue(t.trits)
      const again = ternaryOf(back < 0n, back < 0n ? -back : back, den, c.K_TERNARY_FRAC_TRITS, c.K_TERNARY_MAX_TRITS)
      t.roundTrip = !again.tooWide && again.trits.join() === t.trits.join()
    }
    res.ternary = t
  }
  // Round trip: the decoded value encoded again.
  if (dec.q !== null) {
    const f = fracOf(dec.q, dec.k)
    res.rtBits = encodeExact(dec.neg, f.n, f.d, L, mode).bits
  } else res.rtBits = encodeParsed(dec.cls === 3 ? { kind: 'inf', neg: dec.neg } : { kind: 'nan' }, L, mode).bits
  return res
}

// ---------------------------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------------------------

const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') n.className = v
    else if (k === 'text') n.textContent = v
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v)
    else n.setAttribute(k, v === true ? '' : v)
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) n.append(kid)
  return n
}

function readHash() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''))
  return { x: h.get('x'), r: h.get('r'), t: h.get('t') }
}

async function main() {
  const c = window.T27_WIDGET
  const root = document.getElementById('widget')
  if (!c || !root) return
  document.head.append(el('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href }))

  const specL = layoutFromConstants(c)
  let L = specL
  const fileUrl = new URL(c.K_LAYOUT_FILE, import.meta.url)
  const fileName = c.K_LAYOUT_FILE.replace(/^(\.\.\/)+/, '')
  let layoutLine
  try {
    const res = await fetch(fileUrl, { credentials: 'omit' })
    const read = res.ok ? layoutFromSpecText(await res.text(), c.K_LAYOUT_NAMES) : null
    if (!read) throw new Error('unreadable')
    const diff = layoutDiff(read, specL)
    L = read
    layoutLine = diff.length
      ? fill(c.SAY_LAYOUT_MISMATCH, { file: fileName, names: diff.join(', ') })
      : fill(c.SAY_LAYOUT_READ, { file: fileName, s: L.s, e: L.e, m: L.m, b: L.bias })
  } catch {
    layoutLine = fill(c.SAY_LAYOUT_FALLBACK, { file: fileName, s: L.s, e: L.e, m: L.m, b: L.bias })
  }

  const h = readHash()
  const state = {
    x: h.x ?? c.K_DEFAULT_INPUT,
    r: c.K_ROUNDING_IDS.includes(h.r) ? h.r : c.K_DEFAULT_ROUNDING,
    t: h.t === '1' ? 1 : 0,
  }

  // --- controls ---
  const input = el('input', {
    id: 'g16-in', class: 'g16-input', type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'off',
    spellcheck: 'false', placeholder: c.SAY_INPUT_PLACEHOLDER, value: state.x,
  })
  const copyBtn = el('button', { type: 'button', class: 't27-btn', text: c.SAY_COPY_LINK })
  const exampleBtns = c.K_EXAMPLES.map((x) => el('button', { type: 'button', class: 't27-btn', text: x, onclick: () => setX(x) }))
  const roundBtns = c.K_ROUNDING_IDS.map((id, i) => el('button', { type: 'button', class: 't27-btn', text: c.SAY_ROUNDING_NAMES[i], title: c.SAY_ROUNDING_NOTES[i], onclick: () => { state.r = id; update(true) } }))
  const notationBtns = c.SAY_NOTATION_NAMES.map((name, i) => el('button', { type: 'button', class: 't27-btn', text: name, onclick: () => { state.t = i; update(true) } }))
  const roundNote = el('p', { class: 'g16-note' })
  const bad = el('p', { class: 'g16-bad', role: 'alert', text: c.SAY_BAD_INPUT, hidden: true })

  // --- GF16 card ---
  const hexOut = el('span', { class: 'g16-hex' })
  const bitCells = Array.from({ length: L.bits }, (_, j) => {
    const i = L.bits - 1 - j
    const field = i === L.bits - 1 ? 0 : i >= L.m ? 1 : 2
    return el('button', { type: 'button', class: `g16-bit g16-f${field}`, 'aria-label': fill(c.SAY_BIT_TITLE, { i }), title: fill(c.SAY_BIT_TITLE, { i }), onclick: () => flip(i) })
  })
  const fieldLabels = [L.s, L.e, L.m].map((w, f) => el('span', { class: `g16-flabel g16-f${f}`, style: `--w:${w}`, text: c.SAY_FIELD_NAMES[f] }))
  const facts = el('dl', { class: 'g16-facts' })
  const gfCard = el('section', { class: 'g16-card' },
    el('h2', {}, el('span', { text: c.SAY_GF16_HEADING }), hexOut),
    el('div', { class: 'g16-bits', style: `--n:${L.bits}` }, bitCells),
    el('div', { class: 'g16-flabels', style: `--n:${L.bits}` }, fieldLabels),
    facts)

  // --- ternary card ---
  const tritRow = el('div', { class: 'g16-trits' })
  const tFacts = el('dl', { class: 'g16-facts' })
  const tCard = el('section', { class: 'g16-card' },
    el('h2', {}, el('span', { text: c.SAY_TERNARY_HEADING })),
    el('p', { class: 'g16-note', text: fill(c.SAY_TERNARY_NOTE, { f: c.K_TERNARY_FRAC_TRITS }) }),
    tritRow, tFacts)

  // --- round trip + provenance ---
  const rtList = el('dl', { class: 'g16-facts' })
  const rtCard = el('section', { class: 'g16-card' }, el('h2', {}, el('span', { text: c.SAY_ROUNDTRIP_HEADING })), rtList)
  const checks = runChecks(c, L)
  const okV = checks.vectors.filter((v) => v.ok).length
  const okT = checks.ties.filter((v) => v.ok).length
  const failed = [...checks.vectors, ...checks.ties].filter((v) => !v.ok).map((v) => v.name)
  const meta = el('div', { class: 'g16-meta' },
    el('p', { text: layoutLine }),
    el('p', { class: failed.length ? 'g16-warn' : '', text: fill(c.SAY_CONFORMANCE, { ok: okV, n: checks.vectors.length, tok: okT, tn: checks.ties.length }) + (failed.length ? ' ' + fill(c.SAY_CONFORMANCE_FAIL, { names: failed.join(', ') }) : '') }))

  root.replaceChildren(el('div', { class: 'g16' },
    el('div', { class: 'g16-inputrow' }, el('label', { for: 'g16-in', text: c.SAY_INPUT_LABEL }), el('div', { class: 'g16-inputline' }, input, copyBtn)),
    el('div', { class: 'g16-row' }, el('span', { class: 'g16-rowlabel', text: c.SAY_EXAMPLES_LABEL }), exampleBtns),
    el('div', { class: 'g16-row' }, el('span', { class: 'g16-rowlabel', text: c.SAY_ROUNDING_LABEL }), roundBtns,
      el('span', { class: 'g16-rowlabel', text: c.SAY_NOTATION_LABEL }), notationBtns),
    roundNote, bad,
    el('div', { class: 'g16-cards' }, gfCard, tCard, rtCard),
    meta))

  function dt(term, value, cls) {
    return [el('dt', { text: term }), el('dd', { class: cls || null, text: value })]
  }

  let current = null
  function setX(x) { state.x = x; input.value = x; update(true) }
  function flip(i) {
    if (!current) return
    const bits = current.enc.bits ^ (2 ** i)
    setX(hexOf(bits >>> 0, L))
  }

  function update(writeHash) {
    state.x = input.value
    roundBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(c.K_ROUNDING_IDS[i] === state.r)))
    notationBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === state.t)))
    roundNote.textContent = c.SAY_ROUNDING_NOTES[c.K_ROUNDING_IDS.indexOf(state.r)]
    if (writeHash) {
      const hp = new URLSearchParams({ x: state.x, r: state.r, t: String(state.t) })
      history.replaceState(null, '', `${location.pathname}${location.search}#${hp.toString()}`)
    }
    const a = analyse(state.x, c, L, state.r)
    current = a
    bad.hidden = !!a || !state.x.trim()
    gfCard.classList.toggle('is-empty', !a)
    tCard.classList.toggle('is-empty', !a)
    rtCard.classList.toggle('is-empty', !a)
    if (!a) return
    const { enc, dec } = a
    hexOut.textContent = a.hex
    bitCells.forEach((b, j) => {
      const i = L.bits - 1 - j
      const on = Math.floor(enc.bits / 2 ** i) & 1
      b.textContent = String(on)
      b.classList.toggle('is-one', on === 1)
    })
    const one = 2 ** L.m
    const expText = dec.exp === L.expMax ? fill(c.SAY_EXP_SPECIAL, { e: dec.exp })
      : dec.exp === 0 ? fill(c.SAY_EXP_SUBNORMAL, { u: 1 - L.bias })
        : fill(c.SAY_EXP_DETAIL, { e: dec.exp, b: L.bias, u: dec.exp - L.bias })
    const rows = [
      dt(c.SAY_FIELD_NAMES[0], c.SAY_SIGN_DETAIL[dec.sign], 'g16-f0'),
      dt(c.SAY_FIELD_NAMES[1], expText, 'g16-f1'),
      dt(c.SAY_FIELD_NAMES[2], fill(c.SAY_MANT_DETAIL, { m: dec.mant, one }), 'g16-f2'),
      dt(c.SAY_CLASS_LABEL, c.SAY_CLASS_NAMES[dec.cls]),
      dt(a.parsed.kind === 'hex' ? c.SAY_RAW_ECHO : c.SAY_INPUT_ECHO, a.parsed.kind === 'hex' ? a.hex : state.x.trim()),
    ]
    if (a.decoded !== undefined) rows.push(dt(c.SAY_DECODED, a.decoded, 'g16-big'))
    if (a.err !== undefined) {
      rows.push(dt(c.SAY_ERROR, a.err))
      if (a.rel !== null) rows.push(dt(c.SAY_REL_ERROR, a.rel))
    }
    if (a.parsed.kind === 'num') {
      let how = c.SAY_ROUNDED_NAMES[enc.dir === 0 ? 0 : enc.dir < 0 ? 1 : 2]
      if (enc.overflow) how = c.SAY_OVERFLOW
      else if (enc.underflow) how = c.SAY_UNDERFLOW
      if (enc.tie) how += '; ' + fill(c.SAY_TIE, { rule: c.SAY_ROUNDING_NAMES[c.K_ROUNDING_IDS.indexOf(state.r)] })
      rows.push(dt(c.SAY_ROUNDED_LABEL, how))
    }
    facts.replaceChildren(...rows.flat())

    // ternary
    const t = a.ternary
    const glyphs = c.K_TRIT_GLYPHS.slice(state.t * 3, state.t * 3 + 3)
    if (!t) {
      tritRow.replaceChildren(el('p', { class: 'g16-note', text: c.SAY_TERNARY_NONE }))
      tFacts.replaceChildren()
    } else if (t.tooWide) {
      tritRow.replaceChildren(el('p', { class: 'g16-note', text: fill(c.SAY_TERNARY_TOO_WIDE, { n: c.K_TERNARY_MAX_TRITS }) }))
      tFacts.replaceChildren()
    } else {
      const cells = []
      t.trits.forEach((d, idx) => {
        const p = t.intTrits - 1 - idx
        if (idx === t.intTrits) cells.push(el('span', { class: 'g16-point', text: '.' }))
        cells.push(el('span', { class: `g16-trit g16-t${d + 1}`, title: fill(c.SAY_TRIT_TITLE, { d, p }), text: glyphs[d + 1] }))
      })
      tritRow.replaceChildren(...cells)
      tFacts.replaceChildren(...[
        dt(c.SAY_TERNARY_VALUE, `${c.SAY_APPROX} ${t.approx} (${fill(c.SAY_TRIT_COUNT, { n: t.trits.length })})`),
        dt(c.SAY_ERROR, t.err),
      ].flat())
    }

    // round trip
    const same = (ok) => el('dd', { class: ok ? 'g16-ok' : 'g16-warn', text: ok ? c.SAY_SAME : c.SAY_DIFFERENT })
    const rt = [el('dt', { text: fill(c.SAY_RT_GF16, { hex: hexOf(a.rtBits, L) }) }), same(a.rtBits === enc.bits)]
    if (t && !t.tooWide) rt.push(el('dt', { text: c.SAY_RT_TERNARY }), same(t.roundTrip))
    rtList.replaceChildren(...rt)
  }

  input.addEventListener('input', () => update(true))
  copyBtn.addEventListener('click', async () => {
    const u = new URL(location.href)
    u.searchParams.delete('embed')
    try { await navigator.clipboard.writeText(u.href); copyBtn.textContent = c.SAY_COPIED } catch { input.select() }
    setTimeout(() => { copyBtn.textContent = c.SAY_COPY_LINK }, 1500)
  })
  window.addEventListener('hashchange', () => {
    const nh = readHash()
    if (nh.x !== null && nh.x !== input.value) input.value = nh.x
    if (c.K_ROUNDING_IDS.includes(nh.r)) state.r = nh.r
    if (nh.t !== null) state.t = nh.t === '1' ? 1 : 0
    update(false)
  })
  update(false)
}

if (typeof document !== 'undefined') main()
