// ternary-kit.js -- the drawing of every widget in the course "The ternary machine"
// (specs/course/ternary-computing.t27). It computes nothing: each widget's tool.js hands over its
// own ./logic.js (the fn bodies of a gHashTag/t27 spec, compiled to wasm by scripts/t27-logic.mjs,
// held to logic.t27 by scripts/widget-logic.mjs) and its constants (window.T27_WIDGET). Every
// number on the page is a logic call; every word is a SAY_ constant; every limit a K_ constant.
// The kit only lays out, keeps the reader's inputs, steps through what the logic already decided
// and writes the state to the URL hash. Reads only its own files; sends nothing.

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./ternary-kit.css', import.meta.url).href
document.head.appendChild(css)

// --- Small helpers ----------------------------------------------------------------------------

const fill = (s, ...v) => String(s ?? '').replace(/\{(\d+)\}/g, (m, i) => (i < v.length ? String(v[i]) : m))
const sayOf = (W) => (k, i) => (Array.isArray(W[k]) ? W[k][i] : W[k]) ?? ''
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k === 'class') n.className = v
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v)
    else n.setAttribute(k, v === true ? '' : v)
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c instanceof Node ? c : String(c))
  return n
}
function sv(tag, attrs = {}, ...kids) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, String(v))
  for (const c of kids) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)))
  return n
}
// Put children into a node, dropping the null and false that conditional parts leave behind.
const put = (node, ...kids) => node.replaceChildren(...kids.flat().filter((k) => k != null && k !== false))
// The three trit values as the reader sees them.
const SYM = { '-1': '−', 0: '0', 1: '+' }
const CLS = { '-1': 'tk-n', 0: 'tk-z', 1: 'tk-p' }
const sym = (t) => SYM[t] ?? '?'
const signed = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0')

/** One trit as a tile; optional weight caption under it. */
function tile(t, opts = {}) {
  return el('span', { class: `tk-tile ${CLS[t] ?? ''}${opts.dim ? ' tk-dim' : ''}${opts.hot ? ' tk-hot' : ''}${opts.small ? ' tk-small' : ''}`, title: opts.title },
    el('b', {}, sym(t)), opts.caption != null ? el('i', {}, opts.caption) : null)
}

/** The k trits of n, most significant first, each with its weight 3^i. */
function tiles(L, n, k, opts = {}) {
  const row = el('div', { class: 'tk-tiles', role: 'img', 'aria-label': opts.label })
  for (let i = k - 1; i >= 0; i--) {
    row.append(tile(L.tritAt(n, i), {
      caption: opts.weights === false ? null : L.pow3(i),
      dim: opts.dimBelow != null && i < opts.dimBelow,
      hot: opts.hot === i,
      small: opts.small,
    }))
  }
  return row
}

/** A whole-number input with - and + buttons and a slider. */
function stepper(label, value, min, max, onChange, id) {
  const input = el('input', { class: 'tk-num', type: 'number', inputmode: 'numeric', min, max, step: 1, value, id })
  const range = el('input', { class: 'tk-range', type: 'range', min, max, step: 1, value, 'aria-label': label })
  const set = (v) => {
    const n = Math.max(min, Math.min(max, Math.trunc(Number(v))))
    if (!Number.isFinite(n)) return
    input.value = n
    range.value = n
    onChange(n)
  }
  input.addEventListener('change', () => set(input.value))
  range.addEventListener('input', () => set(range.value))
  const dec = el('button', { class: 't27-btn tk-step', type: 'button', 'aria-label': `${label} − 1`, onclick: () => set(Number(input.value) - 1) }, '−')
  const inc = el('button', { class: 't27-btn tk-step', type: 'button', 'aria-label': `${label} + 1`, onclick: () => set(Number(input.value) + 1) }, '+')
  const box = el('div', { class: 'tk-stepper' }, el('label', { class: 'tk-label', for: id }, label), el('div', { class: 'tk-stepper-row' }, dec, input, inc), range)
  box.set = set
  return box
}

/** Three buttons -1, 0, +1. */
function tritPicker(label, value, onChange) {
  const box = el('div', { class: 'tk-picker', role: 'group', 'aria-label': label }, el('span', { class: 'tk-label' }, label))
  const buttons = [-1, 0, 1].map((t) => {
    const b = el('button', { class: `t27-btn tk-pick ${CLS[t]}`, type: 'button', 'aria-pressed': String(t === value), onclick: () => pick(t) }, sym(t))
    box.append(b)
    return b
  })
  function pick(t) {
    buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(j - 1 === t)))
    onChange(t)
  }
  box.pick = pick
  return box
}

/** A row of preset buttons. */
function presetRow(names, onPick, label) {
  const row = el('div', { class: 'tk-presets', role: 'group', 'aria-label': label })
  const bs = (names || []).map((name, i) => {
    const b = el('button', { class: 't27-btn tk-preset', type: 'button', onclick: () => { mark(i); onPick(i) } }, name)
    row.append(b)
    return b
  })
  function mark(i) { bs.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j))) }
  row.mark = mark
  return row
}

/** A bar 0..1 with a label. */
function bar(label, share, cls = '') {
  const pct = Math.max(0, Math.min(1, share)) * 100
  return el('div', { class: `tk-bar ${cls}` }, el('span', { class: 'tk-bar-label' }, label),
    el('span', { class: 'tk-bar-track' }, el('span', { class: 'tk-bar-fill', style: `width:${pct.toFixed(2)}%` })))
}

function readHash() { return new URLSearchParams(location.hash.slice(1)) }
function writeHash(obj) {
  history.replaceState(null, '', `#${new URLSearchParams(Object.entries(obj).map(([k, v]) => [k, String(v)]))}`)
}
const hashInt = (h, k, d) => (h.has(k) && /^-?\d+$/.test(h.get(k)) ? Number(h.get(k)) : d)

function verdict(cls, strong, ...lines) {
  return el('div', { class: `tk-verdict ${cls}` }, el('strong', {}, strong), ...lines.filter(Boolean).map((l) => el('p', {}, l)))
}
const source = (say) => el('p', { class: 'tk-source' }, el('a', { href: './logic.t27' }, say('SAY_SOURCE')))

// --- 1. Why three: what a number costs in each base (logic: radix_economy) --------------------------

function economy(root, L, W) {
  const say = sayOf(W)
  const NS = W.K_NUMBERS || [999999]
  const MAXB = W.K_MAX_BASE ?? 10
  let at = Math.max(0, Math.min(NS.length - 1, hashInt(readHash(), 'n', W.K_START ?? 0)))
  const presets = presetRow((W.SAY_NUMBERS || []).slice(0, NS.length), (i) => { at = i; draw() }, say('SAY_PICK'))
  const out = el('div')
  put(root, el('p', { class: 'tk-label' }, say('SAY_PICK')), presets, out, source(say))
  function draw() {
    presets.mark(at)
    const n = NS[at]
    const best = L.cheapest(n, MAXB)
    const costs = []
    for (let b = 2; b <= MAXB; b++) costs.push([b, L.cost(n, b), L.digits(n, b)])
    const top = Math.max(...costs.map((c) => c[1]))
    const chart = el('div', { class: 'tk-econ', role: 'img', 'aria-label': fill(say('SAY_BEST'), best, L.cost(n, best)) })
    for (const [b, c, d] of costs) {
      chart.append(el('div', { class: `tk-econ-row${b === best ? ' tk-best' : ''}` },
        el('span', { class: 'tk-econ-base' }, fill(say('SAY_BASE'), b)),
        el('span', { class: 'tk-econ-track' }, el('span', { class: 'tk-econ-fill', style: `width:${((c / top) * 100).toFixed(1)}%` })),
        el('span', { class: 'tk-econ-val' }, fill(say('SAY_COST'), d, b, c))))
    }
    // b / ln b from 1.6 to the widest base: the curve whose floor is e.
    const xs = []
    for (let i = 0; i <= 120; i++) xs.push(1.6 + ((MAXB - 1.6) * i) / 120)
    const ys = xs.map((x) => L.economy(x))
    const lo = Math.min(...ys), hi = Math.max(...ys)
    const X = (x) => 40 + ((x - 1.6) / (MAXB - 1.6)) * 560
    const Y = (y) => 190 - ((y - lo) / (hi - lo || 1)) * 160
    const curve = sv('svg', { class: 'tk-plot', viewBox: '0 0 640 220', role: 'img', 'aria-label': fill(say('SAY_CURVE'), L.economy(3).toFixed(4), L.economy(2).toFixed(4)) },
      sv('path', { class: 'tk-curve', d: xs.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join('') }))
    for (let b = 2; b <= MAXB; b++) {
      curve.append(sv('circle', { cx: X(b), cy: Y(L.economy(b)), r: b === 3 ? 7 : 4, class: b === 3 ? 'tk-dot-gold' : 'tk-dot' }))
      curve.append(sv('text', { x: X(b), y: 212, class: 'tk-axis-t', 'text-anchor': 'middle' }, b))
    }
    curve.append(sv('text', { x: 46, y: 18, class: 'tk-axis-t' }, say('SAY_CURVE_AXIS')))
    put(out, 
      verdict('tk-ok', fill(say('SAY_BEST'), best, L.cost(n, best)), say('SAY_RULE')),
      chart,
      el('p', { class: 'tk-label' }, say('SAY_CURVE_TITLE')),
      curve,
      el('p', { class: 'tk-note' }, fill(say('SAY_CURVE'), L.economy(3).toFixed(4), L.economy(2).toFixed(4))),
    )
    writeHash({ n: at })
  }
  draw()
}

// --- 2. Balanced ternary tiles: count, flip, cut (logic: trits) -------------------------------------

function odometer(root, L, W, mode) {
  const say = sayOf(W)
  const K = W.K_TRITS ?? 6
  const MAX = L.maxOf(K)
  const h = readHash()
  let n = Math.max(-MAX, Math.min(MAX, hashInt(h, 'n', W.K_START ?? 8)))
  let cut = Math.max(0, Math.min(K, hashInt(h, 'cut', W.K_START_CUT ?? 1)))
  let timer = null
  const step = stepper(fill(say('SAY_NUMBER'), -MAX, MAX), n, -MAX, MAX, (v) => { n = v; draw() }, 'tk-n')
  const out = el('div')
  const controls = el('div', { class: 'tk-controls' }, step)
  if (mode === 'count') {
    const play = el('button', { class: 't27-btn tk-play', type: 'button', onclick: () => {
      if (timer) { clearInterval(timer); timer = null; play.textContent = say('SAY_PLAY'); return }
      play.textContent = say('SAY_STOP')
      timer = setInterval(() => { step.set(n >= MAX ? -MAX : n + 1) }, W.K_TICK_MS ?? 450)
    } }, say('SAY_PLAY'))
    controls.append(play)
  }
  let flipping = false
  if (mode === 'negate') {
    const flip = el('button', { class: 't27-btn tk-play', type: 'button', onclick: () => {
      if (flipping) return
      flipping = true
      out.querySelectorAll('.tk-tiles .tk-tile').forEach((t) => t.classList.add('tk-flipping'))
      setTimeout(() => { flipping = false; step.set(L.negate(n)) }, 320)
    } }, say('SAY_FLIP'))
    controls.append(flip)
    const cutStep = stepper(say('SAY_CUT'), cut, 0, K, (v) => { cut = v; draw() }, 'tk-cut')
    controls.append(cutStep)
  }
  put(root, controls, out, source(say))
  function draw() {
    const parts = []
    for (let i = K - 1; i >= 0; i--) {
      const t = L.tritAt(n, i)
      if (t !== 0) parts.push(`${t > 0 ? '+' : '−'} ${L.pow3(i)}`)
    }
    const sum = parts.length ? parts.join(' ').replace(/^\+ /, '') : '0'
    const kids = [
      tiles(L, n, K, { label: fill(say('SAY_TILES'), n) }),
      el('p', { class: 'tk-eq' }, `${sum} = ${n}`),
      el('div', { class: 'tk-facts' },
        el('span', {}, fill(say('SAY_TRITS'), L.tritsNeeded(n))),
        el('span', {}, fill(say('SAY_BITS'), L.bitsNeeded(n))),
        el('span', {}, fill(say('SAY_RANGE'), K, MAX))),
    ]
    if (mode === 'negate') {
      const r = L.cutRound(n, cut)
      kids.push(
        el('p', { class: 'tk-label' }, fill(say('SAY_NEG_TITLE'), L.negate(n))),
        tiles(L, L.negate(n), K, { label: fill(say('SAY_TILES'), L.negate(n)) }),
        el('p', { class: 'tk-label' }, fill(say('SAY_CUT_TITLE'), cut, r)),
        tiles(L, r, K, { dimBelow: cut, label: fill(say('SAY_TILES'), r) }),
        el('p', { class: 'tk-note' }, say('SAY_CUT_NOTE')))
    }
    put(out, ...kids)
    writeHash(mode === 'negate' ? { n, cut } : { n })
  }
  draw()
}

// --- 3. Gates as 3 x 3 tables (logic: trits) --------------------------------------------------------

function gates(root, L, W) {
  const say = sayOf(W)
  const IDS = W.K_GATES || [1]
  const h = readHash()
  let g = Math.max(0, Math.min(IDS.length - 1, hashInt(h, 'g', 0)))
  let a = Math.max(-1, Math.min(1, hashInt(h, 'a', 1)))
  let b = Math.max(-1, Math.min(1, hashInt(h, 'b', 0)))
  const tabs = presetRow((W.SAY_GATES || []).slice(0, IDS.length), (i) => { g = i; draw() }, say('SAY_PICK'))
  const out = el('div')
  put(root, el('p', { class: 'tk-label' }, say('SAY_PICK')), tabs, out, source(say))
  function table(id, title) {
    const unary = id === (W.K_GATE_NOT ?? 0)
    const grid = el('div', { class: `tk-grid${unary ? ' tk-grid-1' : ''}`, role: 'grid', 'aria-label': title })
    grid.append(el('span', { class: 'tk-gh' }, unary ? 'a' : 'a \\ b'))
    if (!unary) for (const y of [-1, 0, 1]) grid.append(el('span', { class: 'tk-gh' }, sym(y)))
    else grid.append(el('span', { class: 'tk-gh' }, say('SAY_OUT')))
    for (const x of [-1, 0, 1]) {
      grid.append(el('span', { class: 'tk-gh' }, sym(x)))
      for (const y of unary ? [0] : [-1, 0, 1]) {
        const v = L.gate(id, x, y)
        const boolCell = !unary && x !== 0 && y !== 0
        const here = x === a && (unary || y === b)
        grid.append(el('button', { class: `tk-cell ${CLS[v]}${boolCell ? ' tk-bool' : ''}${here ? ' tk-here' : ''}`, type: 'button',
          'aria-label': `${title} ${sym(x)} ${unary ? '' : sym(y)} = ${sym(v)}`,
          onclick: () => { a = x; if (!unary) b = y; draw() } }, sym(v)))
      }
    }
    return grid
  }
  function draw() {
    tabs.mark(g)
    const id = IDS[g]
    const name = say('SAY_GATES', g)
    const unary = id === (W.K_GATE_NOT ?? 0)
    const v = L.gate(id, a, b)
    const tables = el('div', { class: 'tk-tables' }, el('div', {}, el('p', { class: 'tk-label' }, name), table(id, name)))
    if (W.K_PAIR != null && W.K_PAIR !== id && !IDS.includes(W.K_PAIR)) tables.append(el('div', {}, el('p', { class: 'tk-label' }, say('SAY_PAIR')), table(W.K_PAIR, say('SAY_PAIR'))))
    const lines = [say('SAY_GATE_TIPS', g)]
    if (W.SAY_BOOL) lines.push(say('SAY_BOOL'))
    if (W.SAY_EQ) lines.push(fill(say('SAY_EQ'), signed(a), signed(b), signed(L.halfSum(a, b)), signed(L.halfCarry(a, b))))
    if (W.SAY_COUNT) lines.push(fill(say('SAY_COUNT'), L.ternaryFunctions(2), L.binaryFunctions(2), L.ternaryFunctions(1), L.binaryFunctions(1)))
    put(out, verdict('tk-ok', unary ? `${name}(${sym(a)}) = ${sym(v)}` : `${name}(${sym(a)}, ${sym(b)}) = ${sym(v)}`, ...lines), tables)
    writeHash({ g, a, b })
  }
  draw()
}

// --- 4. Adders (logic: trits) -----------------------------------------------------------------------

function adder(root, L, W, mode) {
  const say = sayOf(W)
  const h = readHash()
  const out = el('div')
  if (mode === 'half' || mode === 'full') {
    let a = Math.max(-1, Math.min(1, hashInt(h, 'a', 1)))
    let b = Math.max(-1, Math.min(1, hashInt(h, 'b', 1)))
    let c = Math.max(-1, Math.min(1, hashInt(h, 'c', 1)))
    const pickers = el('div', { class: 'tk-controls' },
      tritPicker('a', a, (t) => { a = t; draw() }), tritPicker('b', b, (t) => { b = t; draw() }))
    if (mode === 'full') pickers.append(tritPicker(say('SAY_CIN'), c, (t) => { c = t; draw() }))
    put(root, pickers, out, source(say))
    function draw() {
      const s = mode === 'full' ? L.fullSum(a, b, c) : L.halfSum(a, b)
      const k = mode === 'full' ? L.fullCarry(a, b, c) : L.halfCarry(a, b)
      const ins = mode === 'full' ? [a, b, c] : [a, b]
      const flow = el('div', { class: 'tk-flow' },
        el('div', { class: 'tk-flow-in' }, ...ins.map((t) => tile(t))),
        el('span', { class: 'tk-arrow', 'aria-hidden': 'true' }, '→'),
        el('div', { class: 'tk-flow-out' }, tile(k, { caption: say('SAY_CARRY') }), tile(s, { caption: say('SAY_SUM') })))
      // Every input case, the current one lit: 9 for the half adder, 27 for the full adder.
      const cases = el('div', { class: `tk-cases${mode === 'full' ? ' tk-cases-27' : ''}`, role: 'img', 'aria-label': say('SAY_CASES') })
      for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of mode === 'full' ? [-1, 0, 1] : [0]) {
        const kk = mode === 'full' ? L.fullCarry(x, y, z) : L.halfCarry(x, y)
        const ss = mode === 'full' ? L.fullSum(x, y, z) : L.halfSum(x, y)
        const here = x === a && y === b && (mode !== 'full' || z === c)
        cases.append(el('span', { class: `tk-case${here ? ' tk-here' : ''}`, title: `${sym(x)}${sym(y)}${mode === 'full' ? sym(z) : ''} → ${sym(kk)}${sym(ss)}` },
          el('i', {}, `${sym(x)}${sym(y)}${mode === 'full' ? sym(z) : ''}`), el('b', { class: CLS[kk] }, sym(kk)), el('b', { class: CLS[ss] }, sym(ss))))
      }
      put(out, 
        verdict('tk-ok', fill(say('SAY_EQ'), ins.map(signed).join(' + '), signed(k), signed(s))),
        flow,
        el('p', { class: 'tk-label' }, say('SAY_CASES')),
        cases)
      writeHash(mode === 'full' ? { a, b, c } : { a, b })
    }
    draw()
    return
  }
  // ripple: two numbers added column by column, the carry walking left.
  const K = W.K_TRITS ?? 6
  const MAX = L.maxOf(K - 1)
  let x = Math.max(-MAX, Math.min(MAX, hashInt(h, 'x', W.K_START_X ?? 13)))
  let y = Math.max(-MAX, Math.min(MAX, hashInt(h, 'y', W.K_START_Y ?? 1)))
  let shown = K
  let timer = null
  const sx = stepper('x', x, -MAX, MAX, (v) => { x = v; shown = K; draw() }, 'tk-x')
  const sy = stepper('y', y, -MAX, MAX, (v) => { y = v; shown = K; draw() }, 'tk-y')
  const play = el('button', { class: 't27-btn tk-play', type: 'button', onclick: () => {
    if (timer) clearInterval(timer)
    shown = 0
    draw()
    timer = setInterval(() => { shown += 1; draw(); if (shown >= K) { clearInterval(timer); timer = null } }, W.K_TICK_MS ?? 600)
  } }, say('SAY_PLAY'))
  put(root, el('div', { class: 'tk-controls' }, sx, sy, play), out, source(say))
  function draw() {
    const grid = el('div', { class: 'tk-ripple', style: `--cols:${K}` })
    const row = (label, f) => {
      grid.append(el('span', { class: 'tk-rl' }, label))
      for (let i = K - 1; i >= 0; i--) grid.append(f(i))
    }
    const on = (i) => i < shown
    // The column being added glows while the animation runs; at rest every column is plain.
    const hot = shown < K ? shown - 1 : -1
    row(say('SAY_CARRY_IN'), (i) => tile(L.carryInto(x, y, i), { small: true, dim: !on(i), hot: i === hot }))
    row('x', (i) => tile(L.tritAt(x, i), { small: true, hot: i === hot }))
    row('y', (i) => tile(L.tritAt(y, i), { small: true, hot: i === hot }))
    row(say('SAY_SUM'), (i) => (on(i) ? tile(L.fullSum(L.tritAt(x, i), L.tritAt(y, i), L.carryInto(x, y, i)), { small: true, hot: i === hot }) : el('span', { class: 'tk-tile tk-small tk-blank' }, '·')))
    put(out, 
      verdict('tk-ok', fill(say('SAY_RESULT'), x, y, L.rippleAdd(x, y)), shown < K ? fill(say('SAY_COLUMN'), shown, K) : say('SAY_DONE')),
      grid)
    writeHash({ x, y })
  }
  draw()
}

// --- 5. Multiplying without a multiplier (logic: trits) ---------------------------------------------

function mul(root, L, W, mode) {
  const say = sayOf(W)
  const h = readHash()
  const K = W.K_TRITS ?? 6
  const out = el('div')
  if (mode === 'trit') {
    const MAX = L.maxOf(K)
    let n = Math.max(-MAX, Math.min(MAX, hashInt(h, 'n', W.K_START ?? 25)))
    let t = Math.max(-1, Math.min(1, hashInt(h, 't', -1)))
    put(root, el('div', { class: 'tk-controls' },
      stepper('n', n, -MAX, MAX, (v) => { n = v; draw() }, 'tk-n'),
      tritPicker(say('SAY_TRIT'), t, (v) => { t = v; draw() })), out, source(say))
    function draw() {
      const r = L.tritTimes(n, t)
      put(out, 
        verdict('tk-ok', fill(say('SAY_RESULT'), n, sym(t), r), say('SAY_OPS', t + 1)),
        el('p', { class: 'tk-label' }, 'n'), tiles(L, n, K, { label: String(n) }),
        el('p', { class: 'tk-label' }, fill(say('SAY_TIMES'), sym(t))), tiles(L, r, K, { label: String(r) }))
      writeHash({ n, t })
    }
    draw()
    return
  }
  if (mode === 'long') {
    const MAX = L.maxOf(W.K_FACTOR_TRITS ?? 3)
    let n = Math.max(-MAX, Math.min(MAX, hashInt(h, 'n', W.K_START_N ?? 7)))
    let m = Math.max(-MAX, Math.min(MAX, hashInt(h, 'm', W.K_START_M ?? 8)))
    put(root, el('div', { class: 'tk-controls' },
      stepper('n', n, -MAX, MAX, (v) => { n = v; draw() }, 'tk-n'),
      stepper('m', m, -MAX, MAX, (v) => { m = v; draw() }, 'tk-m')), out, source(say))
    function draw() {
      const rows = el('div', { class: 'tk-long' })
      const F = W.K_FACTOR_TRITS ?? 3
      for (let i = 0; i < F; i++) {
        const t = L.tritAt(m, i)
        rows.append(el('div', { class: 'tk-long-row' },
          el('span', { class: 'tk-rl' }, fill(say('SAY_ROW'), i, sym(t), say('SAY_OPS', t + 1))),
          tiles(L, L.partial(n, m, i), K, { weights: false, small: true, label: String(L.partial(n, m, i)) }),
          el('span', { class: 'tk-rv' }, signed(L.partial(n, m, i)))))
      }
      rows.append(el('div', { class: 'tk-long-row tk-long-sum' },
        el('span', { class: 'tk-rl' }, say('SAY_SUM')),
        tiles(L, L.longMul(n, m), K, { small: true, label: String(L.longMul(n, m)) }),
        el('span', { class: 'tk-rv' }, signed(L.longMul(n, m)))))
      put(out, verdict('tk-ok', fill(say('SAY_RESULT'), n, m, L.longMul(n, m)), say('SAY_HOW')), rows)
      writeHash({ n, m })
    }
    draw()
    return
  }
  // mac: nine weight trits against nine inputs, one add, subtract or skip per clock.
  const N = (W.K_INPUTS || []).length
  const xs = [...(W.K_INPUTS || [])]
  const ws = (W.K_WEIGHTS || []).map((v) => v)
  const hw = h.get('w')
  if (hw && /^[-+0]{9}$/.test(hw)) [...hw].forEach((c, i) => { ws[i] = c === '+' ? 1 : c === '-' ? -1 : 0 })
  let clock = N
  let timer = null
  const play = el('button', { class: 't27-btn tk-play', type: 'button', onclick: () => {
    if (timer) clearInterval(timer)
    clock = 0
    draw()
    timer = setInterval(() => { clock += 1; draw(); if (clock >= N) { clearInterval(timer); timer = null } }, W.K_TICK_MS ?? 500)
  } }, say('SAY_PLAY'))
  put(root, el('p', { class: 'tk-note' }, say('SAY_HOW')), play, out, source(say))
  function draw() {
    let acc = 0
    const tally = { 1: 0, '-1': 0, 0: 0 }
    const lane = el('div', { class: 'tk-mac' })
    for (let i = 0; i < N; i++) {
      const op = L.macOp(ws[i])
      if (i < clock) { acc = L.macStep(acc, ws[i], xs[i]); tally[op] += 1 }
      lane.append(el('div', { class: `tk-mac-cell${i === clock - 1 && clock < N ? ' tk-here' : ''}${i < clock ? '' : ' tk-dim'}` },
        el('button', { class: `tk-cell ${CLS[ws[i]]}`, type: 'button', 'aria-label': fill(say('SAY_WEIGHT'), i + 1, sym(ws[i])),
          onclick: () => { ws[i] = ws[i] === 1 ? -1 : ws[i] + 1; clock = N; draw() } }, sym(ws[i])),
        el('span', { class: 'tk-mac-x' }, signed(xs[i])),
        el('span', { class: 'tk-mac-op' }, say('SAY_OPS', op + 1))))
    }
    put(out, 
      verdict('tk-ok', fill(say('SAY_ACC'), acc), fill(say('SAY_TALLY'), tally[1], tally[-1], tally[0])),
      lane)
    writeHash({ w: ws.map((v) => (v > 0 ? '+' : v < 0 ? '-' : '0')).join('') })
  }
  draw()
}

// --- 6. Storing trits in bits (logic: trits) --------------------------------------------------------

function pack(root, L, W, mode) {
  const say = sayOf(W)
  const h = readHash()
  const out = el('div')
  const bits = (v, n) => el('div', { class: 'tk-bits' }, ...Array.from({ length: n }, (_, i) => {
    const bit = Math.floor(v / 2 ** (n - 1 - i)) % 2
    return el('span', { class: `tk-bit${bit ? ' tk-bit-1' : ''}` }, String(bit))
  }))
  if (mode === 'two') {
    let t = Math.max(-1, Math.min(1, hashInt(h, 't', -1)))
    put(root, tritPicker(say('SAY_TRIT'), t, (v) => { t = v; draw() }), out, source(say))
    function draw() {
      const table = el('div', { class: 'tk-codes' })
      for (const c of [0, 1, 2, 3]) {
        const ok = L.code2Valid(c)
        table.append(el('div', { class: `tk-code${c === L.code2(t) ? ' tk-here' : ''}${ok ? '' : ' tk-waste'}` },
          bits(c, 2), el('span', {}, ok ? fill(say('SAY_HOLDS'), sym(L.decode2(c))) : say('SAY_UNUSED'))))
      }
      put(out, 
        verdict('tk-ok', fill(say('SAY_CODE'), sym(t), L.code2(t).toString(2).padStart(2, '0')), say('SAY_WHY')),
        table,
        bar(fill(say('SAY_USE'), (L.bitUse(1, 2) * 100).toFixed(2)), L.bitUse(1, 2), 'tk-bar-warn'))
      writeHash({ t })
    }
    draw()
    return
  }
  if (mode === 'five') {
    const ts = [1, -1, 0, 1, -1]
    const ht = h.get('t')
    if (ht && /^[-+0]{5}$/.test(ht)) [...ht].forEach((c, i) => { ts[i] = c === '+' ? 1 : c === '-' ? -1 : 0 })
    let byte = null
    const pickers = el('div', { class: 'tk-five' })
    const slider = stepper(say('SAY_BYTE'), 0, 0, 255, (v) => { byte = v; draw() }, 'tk-byte')
    put(root, el('p', { class: 'tk-label' }, say('SAY_TRITS5')), pickers, slider, out, source(say))
    function drawPickers() {
      put(pickers, ...ts.map((t, i) => el('button', { class: `tk-cell ${CLS[t]}`, type: 'button', 'aria-label': fill(say('SAY_TRIT_N'), i, sym(t)),
        onclick: () => { ts[i] = t === 1 ? -1 : t + 1; byte = null; draw() } }, el('b', {}, sym(t)), el('i', {}, `t${i}`))))
    }
    function draw() {
      if (byte == null) byte = L.pack5(ts[0], ts[1], ts[2], ts[3], ts[4])
      else if (L.pack5Valid(byte)) for (let i = 0; i < 5; i++) ts[i] = L.unpack5(byte, i)
      drawPickers()
      slider.querySelectorAll('input').forEach((i) => { i.value = byte })
      const ok = L.pack5Valid(byte)
      put(out, 
        verdict(ok ? 'tk-ok' : 'tk-bad', ok ? fill(say('SAY_PACKED'), byte) : fill(say('SAY_INVALID'), byte, W.K_PACK5_CODES ?? 243)),
        bits(byte, 8),
        bar(fill(say('SAY_USE'), (L.bitUse(5, 8) * 100).toFixed(2)), L.bitUse(5, 8)),
        bar(fill(say('SAY_USE2'), (L.bitUse(1, 2) * 100).toFixed(2)), L.bitUse(1, 2), 'tk-bar-warn'))
      writeHash({ t: ts.map((v) => (v > 0 ? '+' : v < 0 ? '-' : '0')).join('') })
    }
    draw()
    return
  }
  // word: k trits against the bits they need.
  const KMAX = W.K_MAX_TRITS ?? 27
  let k = Math.max(1, Math.min(KMAX, hashInt(h, 'k', W.K_START ?? 27)))
  put(root, stepper(say('SAY_K'), k, 1, KMAX, (v) => { k = v; draw() }, 'tk-k'), out, source(say))
  function draw() {
    const b = L.bitsForTrits(k)
    const plot = sv('svg', { class: 'tk-plot', viewBox: '0 0 640 200', role: 'img', 'aria-label': say('SAY_PLOT') })
    for (let j = 1; j <= KMAX; j++) {
      const u = L.bitUse(j, L.bitsForTrits(j))
      const x = 30 + ((j - 1) / (KMAX - 1)) * 590
      const y = 180 - (u - 0.7) / 0.3 * 160
      plot.append(sv('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: j === k ? 7 : 4, class: j === k ? 'tk-dot-gold' : 'tk-dot' }))
    }
    plot.append(sv('text', { x: 34, y: 16, class: 'tk-axis-t' }, say('SAY_PLOT')))
    put(out, 
      verdict('tk-ok', fill(say('SAY_WORD'), k, L.wordMax(k).toLocaleString('en-US'), b), fill(say('SAY_USE'), (L.bitUse(k, b) * 100).toFixed(2))),
      plot)
    writeHash({ k })
  }
  draw()
}

// --- 7. The TRI-27 instruction word (logic: isa/ternary_encoding) ---------------------------------

function decode(root, L, W, mode) {
  const say = sayOf(W)
  const h = readHash()
  const out = el('div')
  const word32 = (w, fields) => el('div', { class: 'tk-word' }, ...Array.from({ length: 32 }, (_, i) => {
    const bitNo = 31 - i
    const bit = Math.floor(w / 2 ** bitNo) % 2
    const f = fields.find(([lo, hi]) => bitNo >= lo && bitNo <= hi)
    return el('span', { class: `tk-wbit ${f ? f[2] : 'tk-f-none'}${bit ? ' tk-bit-1' : ''}`, title: `bit ${bitNo}` }, String(bit))
  }))
  const hex = (w) => `0x${(w >>> 0).toString(16).toUpperCase().padStart(8, '0')}`
  if (mode === 'opcodes') {
    let pick = Math.max(0, Math.min(255, hashInt(h, 'b', W.K_START ?? 16)))
    put(root, out, source(say))
    function draw() {
      const grid = el('div', { class: 'tk-bytes', role: 'grid', 'aria-label': say('SAY_GRID') })
      let defined = 0
      for (let b = 0; b < 256; b++) {
        const ok = L.isDefinedOpcode(b)
        if (ok) defined += 1
        grid.append(el('button', { class: `tk-byte${ok ? ' tk-defined' : ''}${b === pick ? ' tk-here' : ''}`, type: 'button', 'aria-label': String(b),
          onclick: () => { pick = b; draw() } }))
      }
      const op = L.decodeOpcode(pick)
      // The name is a word of the widget's table; the table's numbers are the spec's OPCODE_VALUES.
      const name = say('SAY_NAMES', (W.K_OPCODE_TABLE || []).indexOf(op))
      const ok = L.isDefinedOpcode(pick)
      put(out, 
        verdict(ok ? 'tk-ok' : 'tk-warn', fill(say('SAY_BYTE'), pick, `0x${pick.toString(16).toUpperCase().padStart(2, '0')}`, ok ? name : say('SAY_NOT_OP')),
          fill(say('SAY_COUNTS'), defined, 256 - defined), ok ? fill(say('SAY_DECODES'), name) : fill(say('SAY_AS_NOP'), name)),
        grid)
      writeHash({ b: pick })
    }
    draw()
    return
  }
  const OPS = W.K_OPS || [16]
  let at = Math.max(0, Math.min(OPS.length - 1, hashInt(h, 'op', 0)))
  let dst = 1, s1 = 2, s2 = 3
  let imm = Math.max(-20000, Math.min(20000, hashInt(h, 'imm', W.K_START_IMM ?? 5)))
  const presets = presetRow((W.SAY_OPS || []).slice(0, OPS.length), (i) => { at = i; draw() }, say('SAY_PICK'))
  const regs = el('div', { class: 'tk-controls' },
    stepper('dst', dst, 0, 26, (v) => { dst = v; draw() }, 'tk-dst'),
    stepper('src1', s1, 0, 15, (v) => { s1 = v; draw() }, 'tk-s1'),
    stepper('src2', s2, 0, 26, (v) => { s2 = v; draw() }, 'tk-s2'),
    stepper(say('SAY_IMM'), imm, mode === 'roundtrip' ? -20000 : -16384, mode === 'roundtrip' ? 20000 : 16383, (v) => { imm = v; draw() }, 'tk-imm'))
  put(root, el('p', { class: 'tk-label' }, say('SAY_PICK')), presets, regs, out, source(say))
  function draw() {
    presets.mark(at)
    const op = OPS[at]
    const immForm = L.hasImm(op)
    const src2Form = L.hasSrc2(op)
    const w = L.encode(op, dst, s1, s2, imm)
    const fields = [[0, 7, 'tk-f-op'], [8, 12, 'tk-f-dst']]
    if (immForm) fields.push([13, 16, 'tk-f-s1'], [17, 31, 'tk-f-imm'])
    else { fields.push([13, 17, 'tk-f-s1']); if (src2Form) fields.push([18, 22, 'tk-f-s2']) }
    const back = [
      [say('SAY_F_OP'), L.opcodeOf(w), 'tk-f-op'],
      ['dst', L.dstOf(w), 'tk-f-dst'],
      ['src1', L.src1Of(w, op), 'tk-f-s1'],
      ['src2', L.src2Of(w, op), 'tk-f-s2'],
      [say('SAY_IMM'), L.immOf(w, op), 'tk-f-imm'],
    ]
    const kids = [
      verdict('tk-ok', fill(say('SAY_WORD'), say('SAY_OPS', at), hex(w)), immForm ? say('SAY_FORM_IMM') : src2Form ? say('SAY_FORM_3') : say('SAY_FORM_2')),
      word32(w, fields),
      el('div', { class: 'tk-legend' }, ...back.map(([n, v, c]) => el('span', { class: `tk-chip ${c}` }, `${n} = ${v}`))),
    ]
    if (mode === 'roundtrip') {
      const field = L.immField(imm)
      kids.push(
        el('p', { class: 'tk-label' }, fill(say('SAY_CLAMP'), imm, L.immClamped(imm))),
        el('div', { class: 'tk-bits' }, ...Array.from({ length: 15 }, (_, i) => {
          const bit = Math.floor(field / 2 ** (14 - i)) % 2
          return el('span', { class: `tk-bit${bit ? ' tk-bit-1' : ''}${i === 0 ? ' tk-sign' : ''}` }, String(bit))
        })),
        el('p', { class: 'tk-note' }, immForm ? fill(say('SAY_BACK'), L.immOf(w, op)) : say('SAY_NO_IMM')))
    }
    put(out, ...kids)
    writeHash({ op: at, imm })
  }
  draw()
}

// --- 8. A ternary machine whose ALU is the adders of this course (logic: trits) ---------------------

function machine(root, L, W, mode) {
  const say = sayOf(W)
  const h = readHash()
  const K = W.K_TRITS ?? 9
  const MAX = L.maxOf(K)
  const out = el('div')
  // The ALU: every result is a logic call.
  const alu = (op, a, b) => [L.rippleAdd(a, b), L.rippleAdd(a, L.negate(b)), L.negate(a), L.compare(a, b)][op]
  if (mode === 'alu' || mode === 'branch') {
    let a = Math.max(-MAX, Math.min(MAX, hashInt(h, 'a', W.K_START_A ?? 40)))
    let b = Math.max(-MAX, Math.min(MAX, hashInt(h, 'b', W.K_START_B ?? 13)))
    let op = Math.max(0, Math.min(3, hashInt(h, 'op', 0)))
    const ops = presetRow(W.SAY_OPS || [], (i) => { op = i; draw() }, say('SAY_PICK'))
    put(root, el('div', { class: 'tk-controls' },
      stepper('a', a, -MAX, MAX, (v) => { a = v; draw() }, 'tk-a'),
      stepper('b', b, -MAX, MAX, (v) => { b = v; draw() }, 'tk-b')),
    ...(mode === 'alu' ? [ops] : []), out, source(say))
    function draw() {
      if (mode === 'branch') {
        const c = L.compare(a, b)
        const targets = el('div', { class: 'tk-branch' }, ...[-1, 0, 1].map((t) => el('div', { class: `tk-target${t === c ? ' tk-here' : ''}` },
          tile(t), el('span', {}, say('SAY_TARGETS', t + 1)))))
        put(out, 
          verdict('tk-ok', fill(say('SAY_JUMP'), sym(c), say('SAY_TARGETS', c + 1)), say('SAY_HOW')),
          el('p', { class: 'tk-label' }, 'a'), tiles(L, a, K, { weights: false, small: true, hot: L.firstDiff(a, b) }),
          el('p', { class: 'tk-label' }, 'b'), tiles(L, b, K, { weights: false, small: true, hot: L.firstDiff(a, b) }),
          targets)
        writeHash({ a, b })
        return
      }
      ops.mark(op)
      const r = alu(op, a, b)
      const over = op < 2 && L.tritsNeeded(r) > K
      put(out, 
        verdict(over ? 'tk-bad' : 'tk-ok', fill(say('SAY_RESULT'), say('SAY_OPS', op), r), over ? fill(say('SAY_OVER'), K, MAX) : say('SAY_OP_TIPS', op)),
        el('p', { class: 'tk-label' }, 'a'), tiles(L, a, K, { weights: false, small: true }),
        op === 2 ? null : el('p', { class: 'tk-label' }, 'b'), op === 2 ? null : tiles(L, b, K, { weights: false, small: true }),
        el('p', { class: 'tk-label' }, say('SAY_OUT')), op === 3 ? tile(r) : tiles(L, r, Math.max(K, L.tritsNeeded(r)), { weights: false, small: true }))
      writeHash({ a, b, op })
    }
    draw()
    return
  }
  // run: a program of four instructions, stepped one clock at a time.
  // SET r v | ADD r s (r = r + s) | DEC r | BR3 r neg zero pos (jump by the sign of r) | HALT
  const progs = [W.K_PROG_0 || [], W.K_PROG_1 || []]
  let p = Math.max(0, Math.min(progs.length - 1, hashInt(h, 'p', 0)))
  let n = Math.max(1, Math.min(W.K_MAX_N ?? 30, hashInt(h, 'n', W.K_START_N ?? 5)))
  let state = null
  let timer = null
  const picker = presetRow(W.SAY_PROGS || [], (i) => { p = i; reset(true) }, say('SAY_PICK'))
  const nStep = stepper('n', n, 1, W.K_MAX_N ?? 30, (v) => { n = v; reset(true) }, 'tk-n')
  const stepBtn = el('button', { class: 't27-btn tk-play', type: 'button', onclick: () => { tick(); draw() } }, say('SAY_STEP'))
  const runBtn = el('button', { class: 't27-btn tk-play', type: 'button', onclick: () => {
    if (timer) { clearInterval(timer); timer = null; return }
    timer = setInterval(() => { if (!tick()) { clearInterval(timer); timer = null } draw() }, W.K_TICK_MS ?? 350)
  } }, say('SAY_RUN'))
  const resetBtn = el('button', { class: 't27-btn tk-play', type: 'button', onclick: () => reset(false) }, say('SAY_RESET'))
  put(root, el('p', { class: 'tk-label' }, say('SAY_PICK')), picker, el('div', { class: 'tk-controls' }, nStep, stepBtn, runBtn, resetBtn), out, source(say))
  const decodeProg = (arr) => { const ins = []; for (let i = 0; i + 4 < arr.length; i += 5) ins.push(arr.slice(i, i + 5)); return ins }
  function reset(runToEnd) {
    if (timer) { clearInterval(timer); timer = null }
    state = { pc: 0, r: [0, 0, 0], clocks: 0, halted: false }
    picker.mark(p)
    // The first view shows a finished run, so the result is on screen; Reset and Step replay it.
    if (runToEnd === true) while (tick());
    draw()
  }
  function tick() {
    const ins = decodeProg(progs[p])
    if (state.halted || state.pc >= ins.length) { state.halted = true; return false }
    const [op, x, y, z, w] = ins[state.pc]
    // The value of an operand: the reader's n where the program says -1000, else the number itself.
    const val = (v) => (v === -1000 ? n : v)
    state.clocks += 1
    if (op === 0) { state.r[x] = val(y); state.pc += 1 }
    else if (op === 1) { state.r[x] = L.rippleAdd(state.r[x], state.r[y]); state.pc += 1 }
    else if (op === 2) { state.r[x] = L.rippleAdd(state.r[x], -1); state.pc += 1 }
    else if (op === 3) { state.pc = [y, z, w][L.compare(state.r[x], 0) + 1] }
    else { state.halted = true; return false }
    if (state.clocks > (W.K_MAX_CLOCKS ?? 400)) { state.halted = true; return false }
    return true
  }
  function draw() {
    const ins = decodeProg(progs[p])
    const listing = el('ol', { class: 'tk-listing', start: 0 }, ...ins.map((i, k) => el('li', { class: k === state.pc && !state.halted ? 'tk-here' : '' }, fill(say('SAY_INS', i[0]), i[1], i[2] === -1000 ? 'n' : i[2], i[3], i[4]))))
    const regs = el('div', { class: 'tk-regs' }, ...state.r.map((v, k) => el('div', { class: 'tk-reg' }, el('span', { class: 'tk-rl' }, `r${k} = ${v}`), tiles(L, v, K, { weights: false, small: true }))))
    put(out, 
      verdict(state.halted ? 'tk-ok' : 'tk-warn', state.halted ? fill(say('SAY_HALTED'), state.r[0], state.clocks) : fill(say('SAY_RUNNING'), state.pc, state.clocks), say('SAY_PROG_TIPS', p)),
      el('div', { class: 'tk-machine' }, listing, regs))
    writeHash({ p, n })
  }
  reset(true)
}

// --- 9. Three answers: compare, ask in thirds, sort (logic: trits) ----------------------------------

function three(root, L, W, mode) {
  const say = sayOf(W)
  const h = readHash()
  const K = W.K_TRITS ?? 5
  const MAX = L.maxOf(K)
  const out = el('div')
  if (mode === 'compare') {
    let a = Math.max(-MAX, Math.min(MAX, hashInt(h, 'a', W.K_START_A ?? 41)))
    let b = Math.max(-MAX, Math.min(MAX, hashInt(h, 'b', W.K_START_B ?? 39)))
    put(root, el('div', { class: 'tk-controls' },
      stepper('a', a, -MAX, MAX, (v) => { a = v; draw() }, 'tk-a'),
      stepper('b', b, -MAX, MAX, (v) => { b = v; draw() }, 'tk-b')), out, source(say))
    function draw() {
      const c = L.compare(a, b)
      const at = L.firstDiff(a, b)
      put(out, 
        verdict('tk-ok', fill(say('SAY_RESULT'), a, say('SAY_SIGNS', c + 1), b), at < 0 ? say('SAY_EQUAL') : fill(say('SAY_AT'), at, L.pow3(at))),
        el('p', { class: 'tk-label' }, 'a'), tiles(L, a, K, { hot: at }),
        el('p', { class: 'tk-label' }, 'b'), tiles(L, b, K, { hot: at }),
        el('div', { class: 'tk-big' }, tile(c, { caption: say('SAY_SIGNS', c + 1) })))
      writeHash({ a, b })
    }
    draw()
    return
  }
  if (mode === 'questions') {
    let x = Math.max(-MAX, Math.min(MAX, hashInt(h, 'x', W.K_START ?? 23)))
    // The first view has two answers given: a third of a third of the line still lit.
    let asked = Math.min(K, W.K_START_ASKED ?? 2)
    const sx = stepper(say('SAY_SECRET'), x, -MAX, MAX, (v) => { x = v; asked = 0; draw() }, 'tk-x')
    const ask = el('button', { class: 't27-btn tk-play', type: 'button', onclick: () => { asked = asked >= K ? 0 : asked + 1; draw() } }, say('SAY_ASK'))
    put(root, el('div', { class: 'tk-controls' }, sx, ask), out, source(say))
    function draw() {
      // A value is still possible when its top `asked` trits are the answers given so far.
      const line = el('div', { class: 'tk-line', role: 'img', 'aria-label': say('SAY_LINE') })
      let left = 0
      for (let v = -MAX; v <= MAX; v++) {
        let ok = true
        for (let j = K - 1; j >= K - asked; j--) if (L.tritAt(v, j) !== L.tritAt(x, j)) ok = false
        if (ok) left += 1
        line.append(el('span', { class: `tk-pt${ok ? ' tk-live' : ''}${v === x ? ' tk-here' : ''}`, title: String(v) }))
      }
      const answers = el('div', { class: 'tk-tiles' }, ...Array.from({ length: K }, (_, s) => (s < asked ? tile(L.tritAt(x, K - 1 - s), { caption: say('SAY_THIRDS', L.tritAt(x, K - 1 - s) + 1) }) : el('span', { class: 'tk-tile tk-blank' }, '?'))))
      put(out, 
        verdict(asked >= K ? 'tk-ok' : 'tk-warn', asked >= K ? fill(say('SAY_FOUND'), x, K) : fill(say('SAY_LEFT'), left, asked),
          fill(say('SAY_VS'), W.K_VALUES ?? 243, L.questions3(W.K_VALUES ?? 243), L.questions2(W.K_VALUES ?? 243))),
        answers, line)
      writeHash({ x })
    }
    draw()
    return
  }
  // sort three: three compares, each a trit, equal values settled by the same compare.
  const v = [hashInt(h, 'a', 7), hashInt(h, 'b', -2), hashInt(h, 'c', 7)].map((q) => Math.max(-MAX, Math.min(MAX, q)))
  put(root, el('div', { class: 'tk-controls' },
    ...['a', 'b', 'c'].map((name, i) => stepper(name, v[i], -MAX, MAX, (q) => { v[i] = q; draw() }, `tk-${name}`))), out, source(say))
  function draw() {
    const s = [...v]
    const steps = []
    for (const [i, j] of [[0, 1], [1, 2], [0, 1]]) {
      const c = L.compare(s[i], s[j])
      steps.push(el('li', {}, fill(say('SAY_STEP'), s[i], s[j], sym(c), say('SAY_SIGNS', c + 1), c > 0 ? say('SAY_SWAP') : say('SAY_KEEP'))))
      if (c > 0) [s[i], s[j]] = [s[j], s[i]]
    }
    put(out, verdict('tk-ok', fill(say('SAY_SORTED'), s.join(' ≤ ')), say('SAY_HOW')), el('ol', { class: 'tk-steps' }, ...steps))
    writeHash({ a: v[0], b: v[1], c: v[2] })
  }
  draw()
}

// --- 10. A ternary neuron (logic: trits) ------------------------------------------------------------

function neuron(root, L, W, mode) {
  const say = sayOf(W)
  const h = readHash()
  const pats = W.K_PATTERNS || []
  const nPat = Math.floor(pats.length / 9)
  const patAt = (i) => pats.slice(i * 9, i * 9 + 9)
  const weightSets = [W.K_W0, W.K_W1, W.K_W2].filter(Boolean)
  const x = [...patAt(Math.max(0, Math.min(nPat - 1, hashInt(h, 'p', 0))))]
  const w = [...(weightSets[0] || Array(9).fill(0))]
  let th = Math.max(1, Math.min(9, hashInt(h, 'th', W.K_THRESHOLD ?? 2)))
  const out = el('div')
  const presets = presetRow((W.SAY_PATTERNS || []).slice(0, nPat), (i) => { patAt(i).forEach((q, j) => { x[j] = q }); draw() }, say('SAY_PICK'))
  put(root, el('p', { class: 'tk-label' }, say('SAY_PICK')), presets,
    stepper(say('SAY_TH'), th, 1, 9, (q) => { th = q; draw() }, 'tk-th'), out, source(say))
  const fire = (ws, xs) => {
    let sum = 0
    for (let i = 0; i < 9; i++) sum = L.macStep(sum, ws[i], xs[i])
    return [sum, L.activate(sum, th)]
  }
  const grid = (vals, editable, label) => el('div', { class: 'tk-g3', role: 'group', 'aria-label': label },
    ...vals.map((v, i) => el(editable ? 'button' : 'span', { class: `tk-cell ${CLS[v]}`, type: editable ? 'button' : null,
      onclick: editable ? () => { vals[i] = v === 1 ? -1 : v + 1; draw() } : null }, sym(v))))
  function draw() {
    if (mode === 'layer') {
      const outs = weightSets.map((ws) => fire(ws, x))
      put(out, 
        verdict('tk-ok', fill(say('SAY_LAYER'), outs.map(([, o]) => sym(o)).join(' ')), say('SAY_HOW')),
        el('div', { class: 'tk-nets' },
          el('div', {}, el('p', { class: 'tk-label' }, say('SAY_INPUT')), grid(x, true, say('SAY_INPUT'))),
          ...weightSets.map((ws, k) => el('div', {}, el('p', { class: 'tk-label' }, say('SAY_NEURONS', k)), grid(ws, false, say('SAY_NEURONS', k)),
            el('p', { class: 'tk-out' }, fill(say('SAY_SUM'), outs[k][0]), ' ', tile(outs[k][1]))))))
      writeHash({ th })
      return
    }
    const [sum, o] = fire(w, x)
    const prods = el('div', { class: 'tk-g3' }, ...x.map((xi, i) => el('span', { class: `tk-cell tk-prod ${CLS[L.tritTimes(xi, w[i])]}` }, sym(L.tritTimes(xi, w[i])))))
    const kids = [
      verdict(o > 0 ? 'tk-ok' : o < 0 ? 'tk-bad' : 'tk-warn', fill(say('SAY_FIRE'), sum, sym(o)), say('SAY_HOW')),
      el('div', { class: 'tk-nets' },
        el('div', {}, el('p', { class: 'tk-label' }, say('SAY_INPUT')), grid(x, true, say('SAY_INPUT'))),
        el('div', {}, el('p', { class: 'tk-label' }, say('SAY_WEIGHTS')), grid(w, mode === 'one', say('SAY_WEIGHTS'))),
        el('div', {}, el('p', { class: 'tk-label' }, say('SAY_PRODUCTS')), prods)),
    ]
    if (mode === 'detect') {
      const table = el('ul', { class: 'tk-steps' }, ...Array.from({ length: nPat }, (_, i) => {
        const [s, r] = fire(w, patAt(i))
        return el('li', {}, fill(say('SAY_ROW'), say('SAY_PATTERNS', i), s, sym(r)))
      }))
      kids.push(el('p', { class: 'tk-label' }, say('SAY_TABLE')), table)
    }
    put(out, ...kids)
    writeHash({ th })
  }
  draw()
}

const ENGINES = { economy, odometer, gates, adder, mul, pack, decode, machine, three, neuron }

/** Draw one widget: the engine, the logic module, the widget's constants and the view. */
export function mount(engine, logic, W, mode) {
  const root = document.getElementById('widget')
  ENGINES[engine](root, logic, W || {}, mode)
}
