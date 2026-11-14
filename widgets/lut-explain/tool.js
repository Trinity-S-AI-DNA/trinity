// SPDX-License-Identifier: Apache-2.0
// lut-explain tool: a 7-series LUT6 INIT read as logic, the FASM lines around it read against
// prjxray-db, a guessing game on a real routed design, and that design's histogram.
// Every word on screen comes from window.T27_WIDGET (specs/widgets/lut-explain.t27, SAY_*); the
// numbers are K_* or fields of design.json / prjxray.json, both written by
// scripts/widget-data/lut-explain.mjs with the same decoder this page imports. A dropped file is
// read with FileReader and never leaves the page.
import * as L from './lut.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fill = (t, v = {}) => String(t ?? '').replace(/\{(\w+)\}/g, (m, k) => (v[k] === undefined ? m : String(v[k])))
const num = (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString('en-US'))

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') el.className = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const k of kids.flat(Infinity)) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : String(k))
  return el
}

document.head.append(h('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href }))

async function json(path) {
  const r = await fetch(new URL(path, import.meta.url))
  if (!r.ok) throw new Error(path)
  return r.json()
}

const state = {
  px: null, design: null, tab: 0,
  bits: null, orig: null, loc: null, assumed: false, lines: [], bad: [], flipped: null,
  file: null, game: null,
}

// --- names ------------------------------------------------------------------------------------
const pin = (q) => fill(W.SAY_PIN, { n: q + 1 })
const pins = (qs) => qs.map(pin).join(', ')

function classFromKey(key) {
  const p = String(key).split('/')
  const c = { id: p[0], n: Number(p[1]), k: Number(p[2]) }
  if (p.length > 3) c.inner = classFromKey(p.slice(3).join('/'))
  return c
}

function className(c) {
  const t = W['SAY_CLASS_' + c.id.toUpperCase()] ?? c.id
  return fill(t, { n: c.n, k: c.k, inner: c.inner ? className(c.inner) : '' })
}

function classDetail(c) {
  if (c.id === 'buf') return fill(W.SAY_DETAIL_BUF, { pin: pin(c.inputs[0]) })
  if (c.id === 'not') return fill(W.SAY_DETAIL_NOT, { pin: pin(c.inputs[0]) })
  if (c.id === 'mux2') return fill(W.SAY_DETAIL_MUX2, { s: pin(c.selects[0]), d0: pin(c.data[0]), d1: pin(c.data[1]) })
  if (c.id === 'mux4') return fill(W.SAY_DETAIL_MUX4, { s1: pin(c.selects[1]), s0: pin(c.selects[0]), d: pins(c.data) })
  if (c.id === 'carry2' || c.id === 'carry2x') {
    const [a, b, cc, d, e] = c.data.map(pin)
    return fill(W.SAY_DETAIL_CARRY2, { a, b, c: cc, d, e })
  }
  if (c.id === 'xorwith' || c.id === 'xnorwith') return fill(W.SAY_DETAIL_LINEAR, { list: pins(c.data) })
  return null
}

function expression(terms) {
  if (!terms.length) return W.SAY_CONST_0
  return terms.map((t) => {
    const lits = L.termLiterals(t)
    if (!lits.length) return W.SAY_CONST_1
    return lits.map((l) => (l.inverted ? W.SAY_OP_NOT : '') + pin(l.input)).join(W.SAY_OP_AND)
  }).join(W.SAY_OP_OR)
}

// --- prjxray-db -------------------------------------------------------------------------------
const tileOf = (tt) => {
  let t = state.px?.tiles?.[tt]
  if (t && t.sameAs) t = state.px.tiles[t.sameAs]
  return t || null
}
const twinOf = (tt) => {
  const own = state.px?.tiles?.[tt]
  if (!own) return null
  if (own.sameAs) return own.sameAs
  return Object.keys(state.px.tiles).find((k) => state.px.tiles[k].sameAs === tt) || null
}

function parseLoc(loc) {
  const m = String(loc).match(/^([A-Za-z0-9_]+?_X\d+Y\d+)\.(SLICE[LM]_X[01])\.([ABCD])$/)
  if (!m) return null
  return { tile: m[1], tileType: m[1].replace(/_X\d+Y\d+$/, ''), site: m[2], lut: m[3] }
}

function initPos(loc, i) {
  const t = tileOf(loc.tileType)
  const list = t?.init?.[`${loc.site}.${loc.lut}`]
  if (!list) return null
  const [frame, bit] = list[i].split('_')
  return { frame: Number(frame), bit: Number(bit), raw: list[i] }
}

const SRC = Object.fromEntries((W.SAY_SRC_KEYS || []).map((k, i) => [k, (W.SAY_SRC_WORDS || [])[i]]))
function srcWord(key, lut) {
  let k = key
  if (/^[ABCD]X$/.test(k)) k = 'NX'
  else if (/^[ABCD]5Q$/.test(k)) k = 'N5Q'
  else if (/^[ABCD]I$/.test(k)) k = 'NI'
  else if (/MC31$/.test(k)) k = 'MC31'
  const L0 = /^[ABCD]/.test(key) && k !== key ? key[0] : lut
  return fill(SRC[k] ?? key, { L: L0 })
}

/** What one site feature sets, in the spec's words. */
function featureWords(f) {
  const s = f.feature
  const tt = f.tileType
  let m
  if ((m = s.match(/^([ABCD])LUT\.INIT$/))) return fill(W.SAY_F_LUT_INIT, { L: m[1] })
  if ((m = s.match(/^([ABCD])LUT\.(RAM|SMALL|SRL)$/))) return fill(W['SAY_F_LUT_' + m[2]], { L: m[1] })
  if ((m = s.match(/^([ABCD])LUT\.DI1MUX\.(\w+)$/))) return fill(W.SAY_F_DI1MUX, { L: m[1], src: srcWord(m[2], m[1]) })
  if ((m = s.match(/^([ABCD]5?FF)\.ZINI$/))) return fill(W.SAY_F_ZINI, { ff: m[1] })
  if ((m = s.match(/^([ABCD]5?FF)\.ZRST$/))) return fill(W.SAY_F_ZRST, { ff: m[1] })
  if ((m = s.match(/^([ABCD])5FFMUX\.IN_A$/))) return fill(W.SAY_F_5FFMUX_IN_A, { ff: m[1] + '5FF', L: m[1] })
  if ((m = s.match(/^([ABCD])5FFMUX\.IN_B$/))) return fill(W.SAY_F_5FFMUX_IN_B, { ff: m[1] + '5FF', L: m[1] })
  if ((m = s.match(/^([ABCD])FFMUX\.(\w+)$/))) return fill(W.SAY_F_FFMUX, { ff: m[1] + 'FF', src: srcWord(m[2], m[1]) })
  if ((m = s.match(/^([ABCD])OUTMUX\.(\w+)$/))) return fill(W.SAY_F_OUTMUX, { L: m[1], src: srcWord(m[2], m[1]) })
  if ((m = s.match(/^CARRY4\.([ABCD])CY0$/))) return fill(W.SAY_F_CY0, { L: m[1] })
  if ((m = s.match(/^PRECYINIT\.(\w+)$/))) return fill(W.SAY_F_PRECYINIT, { src: srcWord(m[1], 'A') })
  const flat = { CEUSEDMUX: 'CEUSEDMUX', SRUSEDMUX: 'SRUSEDMUX', CLKINV: 'CLKINV', NOCLKINV: 'NOCLKINV', FFSYNC: 'FFSYNC', LATCH: 'LATCH', WA7USED: 'WA7USED', WA8USED: 'WA8USED', 'WEMUX.CE': 'WEMUX_CE' }
  if (flat[s]) return W['SAY_F_' + flat[s]]
  return fill(W.SAY_F_UNKNOWN, { tt })
}

function tileWords(tt) {
  const out = []
  if (/^CLBLL_/.test(tt)) out.push(W.SAY_TILE_CLBLL)
  else if (/^CLBLM_/.test(tt)) out.push(W.SAY_TILE_CLBLM)
  else return [fill(W.SAY_TILE_OTHER, { tt })]
  const twin = twinOf(tt)
  if (twin) out.push(fill(W.SAY_TILE_SIDE, { a: tt, b: twin }))
  return out
}

function pipWords(f) {
  const [dst, src] = f.parts
  const t = tileOf(f.tileType)
  if (!t) return [fill(W.SAY_PIP_OTHER, { tt: f.tileType, dst, src })]
  const out = []
  const m = dst.match(/^(CLBL[LM]_(?:LL|L|M)_)([ABCD])([1-6])$/)
  const site = m ? t.sites.find((s) => s.prefix === m[1]) : null
  if (site) out.push(fill(W.SAY_PIP_LUTPIN, { n: m[3], site: site.name, L: m[2], src }))
  else out.push(fill(W.SAY_PIP_CLB, { dst, src }))
  const kind = t.ppips?.[`${dst}.${src}`]
  if (kind === 'always') out.push(W.SAY_PIP_ALWAYS)
  else if (kind === 'hint') out.push(W.SAY_PIP_HINT)
  else if (kind === 'default') out.push(W.SAY_PIP_DEFAULT)
  return out
}

// --- layout -----------------------------------------------------------------------------------
const status = h('p', { class: 'lx-status', role: 'status' }, W.SAY_LOADING)
const tabBtns = (W.SAY_TABS || []).map((name, i) =>
  h('button', { class: 't27-btn', type: 'button', 'aria-pressed': String(i === 0), onclick: () => showTab(i) }, name))
const panels = [h('section', { class: 'lx-panel' }), h('section', { class: 'lx-panel', hidden: true }), h('section', { class: 'lx-panel', hidden: true })]
root.replaceChildren(h('div', { class: 'lx' }, h('nav', { class: 'lx-tabs' }, tabBtns), status, panels))

function showTab(i) {
  state.tab = i
  tabBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)))
  panels.forEach((p, j) => { p.hidden = j !== i })
  if (i === 1 && !state.game) newGame()
  if (i === 1) renderGame()
  if (i === 2) renderDesign()
}

// --- decode -----------------------------------------------------------------------------------
const input = h('textarea', { class: 'lx-input', rows: '4', spellcheck: 'false', autocomplete: 'off', placeholder: W.SAY_INPUT_PLACEHOLDER, 'aria-label': W.SAY_INPUT_LABEL })
input.addEventListener('input', () => readInput())
const fileInput = h('input', { type: 'file', accept: '.fasm,text/plain', class: 'lx-file' })
fileInput.addEventListener('change', () => { if (fileInput.files[0]) readFile(fileInput.files[0]) })
const drop = h('label', { class: 't27-drop lx-drop' }, W.SAY_DROP, fileInput)
for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over') })
for (const ev of ['dragleave', 'drop']) drop.addEventListener(ev, () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) readFile(f) })

const exampleText = (i) => {
  const inits = W.K_EXAMPLE_INITS || []
  if (i < inits.length) return `64'h${inits[i]}`
  if (i === inits.length) return (W.K_EXAMPLE_FASM_CARRY || []).join('\n')
  return (W.K_EXAMPLE_FASM_FF || []).join('\n')
}
const exampleBtns = (W.SAY_EXAMPLE_NAMES || []).map((name, i) =>
  h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => { setInput(exampleText(i)); exampleBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i))) } }, name))
const fileLine = h('div', { class: 'lx-fileline', hidden: true })
const out = h('div', { class: 'lx-out' })

panels[0].append(
  h('label', { class: 'lx-label' }, W.SAY_INPUT_LABEL, input),
  drop,
  h('div', { class: 'lx-examples' }, h('span', { class: 'lx-k' }, W.SAY_EXAMPLES), exampleBtns),
  fileLine,
  out,
)

function setInput(text, keepExamples = false) {
  input.value = text
  if (!keepExamples) exampleBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'))
  readInput()
}

function readInput() {
  const r = L.parseInput(input.value)
  state.lines = r.lines
  state.bad = r.bad
  state.flipped = null
  if (r.bits) {
    state.bits = Uint8Array.from(r.bits)
    state.orig = Uint8Array.from(r.bits)
    state.assumed = !r.lut
    state.loc = r.lut ? { tile: r.lut.tile, tileType: r.lut.tileType, site: r.lut.site, lut: r.lut.lut } : parseLoc(W.K_DEFAULT_LOC)
  } else {
    state.bits = null
    state.orig = null
  }
  renderDecode()
}

function block(title, ...kids) {
  return h('div', { class: 'lx-block' }, title ? h('h3', { class: 'lx-h' }, title) : null, kids)
}

function truthTable(bits, dc) {
  const head = W.SAY_TABLE_HEAD || []
  const blocks = []
  for (let b = 0; b < 4; b++) {
    const rows = [h('div', { class: 'lx-tr lx-th', 'aria-hidden': 'true' }, h('span', { class: 'lx-i' }, head[0]), h('span', { class: 'lx-lv' }, head[1]), h('span', { class: 'lx-o' }, head[2]))]
    for (let i = b * 16; i < b * 16 + 16; i++) {
      const levels = L.rowLevels(i).map((v, q) => h('span', { class: dc.has(L.N_IN - 1 - q) ? 'is-dc' : null }, String(v)))
      rows.push(h('button', {
        class: 'lx-tr' + (bits[i] ? ' is-one' : '') + (state.orig && bits[i] !== state.orig[i] ? ' is-flipped' : ''),
        type: 'button', 'aria-pressed': String(!!bits[i]), 'data-i': String(i),
        onclick: () => flip(i),
      }, h('span', { class: 'lx-i' }, String(i)), h('span', { class: 'lx-lv' }, levels), h('span', { class: 'lx-o' }, String(bits[i]))))
    }
    blocks.push(h('div', { class: 'lx-tb' }, rows))
  }
  return h('div', { class: 'lx-table' }, blocks)
}

function flip(i) {
  state.bits[i] ^= 1
  state.flipped = i
  renderDecode()
  out.querySelector(`.lx-tr[data-i="${i}"]`)?.focus({ preventScroll: true })
}

function fasmLine(loc, bits) {
  return `${loc.tile}.${loc.site}.${loc.lut}LUT.INIT[63:0] = 64'b${L.initBin(bits)}`
}

function renderDecode() {
  out.replaceChildren()
  if (!state.px) return
  if (state.bits) out.append(...decodeBits(state.bits))
  out.append(fasmBlock())
  if (!state.bits && !state.lines.length) out.prepend(h('p', { class: 'lx-note' }, W.SAY_NOTHING))
}

function decodeBits(bits) {
  const c = L.classify(bits)
  const sup = new Set(c.inputs)
  const dc = new Set([0, 1, 2, 3, 4, 5].filter((q) => !sup.has(q)))
  const min = L.minimize(bits)
  const cover = L.coverBits(min.terms)
  const ok = cover.every((v, i) => v === bits[i])
  const detail = classDetail(c)
  const loc = state.loc
  const kids = []

  kids.push(block(null,
    h('dl', { class: 'lx-facts' },
      h('dt', {}, W.SAY_NAME_LABEL), h('dd', { class: c.id === 'other' ? 'lx-name is-other' : 'lx-name' }, className(c)),
      detail ? [h('dt', {}, ''), h('dd', {}, detail)] : null,
      h('dt', {}, W.SAY_INPUTS_LABEL), h('dd', {}, c.inputs.length ? pins(c.inputs) : W.SAY_NONE,
        h('span', { class: 'lx-dc' }, ` ${W.SAY_DONT_CARE}: ${dc.size ? pins([...dc]) : W.SAY_NONE}`)),
      h('dt', {}, W.SAY_INIT_LABEL), h('dd', { class: 'lx-mono lx-init' }, `64'h${L.initHex(bits)}`),
    ),
    h('p', { class: 'lx-k' }, fill(W.SAY_EXPR_LABEL, { terms: min.terms.length })),
    h('p', { class: 'lx-expr lx-mono' }, expression(min.terms)),
    !min.exact ? h('p', { class: 'lx-note is-warn' }, W.SAY_EXPR_INEXACT) : null,
    ok ? h('p', { class: 'lx-note is-ok' }, W.SAY_EXPR_CHECK) : null,
  ))

  const flipNote = state.flipped !== null && loc ? (() => {
    const p = initPos(loc, state.flipped)
    return p ? h('p', { class: 'lx-note is-gold', role: 'status' }, fill(W.SAY_FLIPPED, { i: state.flipped, v: bits[state.flipped], frame: p.frame, bit: p.bit, tt: loc.tileType, site: loc.site, lut: loc.lut })) : null
  })() : null
  const changed = state.orig && state.orig.some((v, i) => v !== bits[i])
  kids.push(block(null,
    h('p', { class: 'lx-k' }, W.SAY_TABLE_LABEL),
    flipNote,
    changed ? h('button', { class: 't27-btn', type: 'button', onclick: () => { state.bits = Uint8Array.from(state.orig); state.flipped = null; renderDecode() } }, W.SAY_RESET) : null,
    truthTable(bits, dc),
  ))

  if (loc) {
    kids.push(block(W.SAY_FASM_REBUILT,
      h('p', { class: 'lx-mono lx-line' }, fasmLine(loc, bits)),
      state.assumed ? h('p', { class: 'lx-note' }, fill(W.SAY_LOC_ASSUMED, { loc: W.K_DEFAULT_LOC })) : null,
    ))
  }

  const hv = L.halves(bits)
  const lo = L.classify(hv.o5)
  const hi = L.classify(hv.o6)
  const hex = L.initHex(bits)
  kids.push(block(W.SAY_HALVES_TITLE,
    h('p', { class: 'lx-note' }, W.SAY_HALVES_BODY),
    h('dl', { class: 'lx-facts' },
      h('dt', {}, W.SAY_HALF_LOW), h('dd', {}, h('span', { class: 'lx-mono' }, `32'h${hex.slice(8)}`), ' ', className(lo)),
      h('dt', {}, W.SAY_HALF_HIGH), h('dd', {}, h('span', { class: 'lx-mono' }, `32'h${hex.slice(0, 8)}`), ' ', className(hi)),
    ),
    h('p', { class: 'lx-note' }, hv.same ? W.SAY_HALVES_SAME : W.SAY_HALVES_DIFF),
    h('p', { class: 'lx-note' }, fill(W.SAY_HALVES_DESIGN, { o5: num(state.design.o5Used), luts: num(state.design.luts) })),
  ))
  return kids
}

function bitsList(list) {
  return h('span', { class: 'lx-bits lx-mono' }, list.map((b) => h('span', { class: b.startsWith('!') ? 'is-neg' : null }, b)))
}

function fasmBlock() {
  const items = []
  for (const f of state.lines) {
    if (!f || f.kind === 'bad-range') continue
    const t = tileOf(f.tileType)
    const chips = [[0, f.tile]]
    const words = []
    let bits = null
    let neg = false
    if (f.kind === 'site' || f.kind === 'lut-init') {
      const fp = f.feature.split('.')
      chips.push([1, f.site])
      if (fp.length > 1) chips.push([2, fp[0]], [3, fp.slice(1).join('.')])
      else chips.push([3, fp[0]])
      if (f.valueText) chips.push([4, f.valueText.length > 24 ? f.valueText.slice(0, 22) + '..' : f.valueText])
      words.push(featureWords(f))
      if (t) {
        if (f.kind === 'lut-init') {
          const list = t.init?.[`${f.site}.${f.lut}`]
          if (list) words.push(fill(W.SAY_BITS_INIT, { first: list[0], last: list[63] }))
        } else {
          const list = t.features?.[`${f.site}.${f.feature}`]
          if (list) { bits = list; neg = list.some((b) => b.startsWith('!')) } else words.push(fill(W.SAY_TILE_NO_FEATURE, { tt: f.tileType, feature: `${f.site}.${f.feature}` }))
        }
      }
    } else if (f.kind === 'pip') {
      words.push(...pipWords(f))
    } else {
      words.push(fill(W.SAY_F_UNKNOWN, { tt: f.tileType }))
    }
    items.push(h('li', { class: 'lx-fl' },
      h('code', { class: 'lx-line lx-mono' }, f.text),
      h('div', { class: 'lx-chips' }, chips.map(([k, v]) => h('span', { class: 'lx-chip' }, h('b', {}, (W.SAY_PART_NAMES || [])[k]), ' ', v))),
      words.map((w) => h('p', { class: 'lx-w' }, w)),
      bits ? h('p', { class: 'lx-w lx-sub' }, W.SAY_BITS, ': ', bitsList(bits), neg ? ` (${W.SAY_BIT_NEG})` : '') : null,
    ))
  }
  for (const b of state.bad) items.push(h('li', { class: 'lx-fl is-bad' }, fill(W.SAY_BAD_LINE, { line: b })))
  const tiles = [...new Set(state.lines.filter(Boolean).map((f) => f.tileType))]
  return block(W.SAY_FASM_TITLE,
    tiles.map((tt) => tileWords(tt).map((w) => h('p', { class: 'lx-note' }, w))),
    items.length ? h('ul', { class: 'lx-fls' }, items) : h('p', { class: 'lx-note' }, W.SAY_FASM_NONE),
  )
}

// --- the reader's own .fasm file -----------------------------------------------------------------
function readFile(file) {
  const fr = new FileReader()
  fr.onload = () => takeFile(file.name, String(fr.result))
  fr.readAsText(file)
}

function takeFile(name, text) {
  const luts = new Map()
  const pinLines = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^([A-Za-z0-9_]+?_X\d+Y\d+)\.(SLICE[LM]_X[01])\.([ABCD])LUT\.INIT\[/)
    if (m) {
      const key = `${m[1]}.${m[2]}.${m[3]}`
      if (!luts.has(key)) luts.set(key, { loc: key, lines: [] })
      luts.get(key).lines.push(line)
      continue
    }
    if (/^[A-Za-z0-9_]+?_X\d+Y\d+\.CLBL[LM]_(?:LL|L|M)_[ABCD][1-6]\./.test(line)) pinLines.push(line)
  }
  for (const line of pinLines) {
    const m = line.match(/^(([A-Za-z0-9_]+?)_X\d+Y\d+)\.(CLBL[LM]_(?:LL|L|M)_)([ABCD])[1-6]\./)
    const site = tileOf(m[2])?.sites.find((s) => s.prefix === m[3])
    const lut = site && luts.get(`${m[1]}.${site.name}.${m[4]}`)
    if (lut) lut.lines.push(line)
  }
  const list = [...luts.values()]
  const hist = new Map()
  let named = 0
  for (const l of list) {
    const r = L.parseInput(l.lines.filter((x) => /INIT\[/.test(x)).join('\n'))
    const key = r.bits ? L.classKey(L.classify(r.bits)) : null
    if (!key) continue
    if (!key.startsWith('other/')) named++
    hist.set(key, (hist.get(key) || 0) + 1)
  }
  state.file = { name, list, idx: 0, named, hist: [...hist.entries()].sort((a, b) => b[1] - a[1]) }
  showFileLut(0)
  if (state.tab === 2) renderDesign()
}

function showFileLut(i) {
  const f = state.file
  if (!f || !f.list.length) {
    fileLine.hidden = false
    fileLine.replaceChildren(h('p', { class: 'lx-note' }, fill(W.SAY_FILE_LUTS, { name: f?.name ?? '', n: 0, i: 0, loc: '' })))
    return
  }
  f.idx = (i + f.list.length) % f.list.length
  const lut = f.list[f.idx]
  fileLine.hidden = false
  fileLine.replaceChildren(
    h('p', { class: 'lx-note' }, fill(W.SAY_FILE_LUTS, { name: f.name, n: num(f.list.length), i: num(f.idx + 1), loc: lut.loc })),
    h('div', { class: 'lx-row' },
      h('button', { class: 't27-btn', type: 'button', onclick: () => showFileLut(f.idx - 1) }, W.SAY_PREV),
      h('button', { class: 't27-btn', type: 'button', onclick: () => showFileLut(f.idx + 1) }, W.SAY_NEXT)),
  )
  setInput(lut.lines.join('\n'))
}

// --- the game ---------------------------------------------------------------------------------
const gameBox = h('div', { class: 'lx-game' })
panels[1].append(h('p', { class: 'lx-note' }, W.SAY_GAME_INTRO), gameBox)

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

function choicesFor(c) {
  const answer = className(c)
  const keys = state.design.hist.map(([k]) => k).filter((k) => !k.startsWith('other/'))
  const named = keys.map(classFromKey)
  const labels = new Set([answer])
  const out = [answer]
  // One near miss with the same family, one with the same number of inputs, the rest from anywhere.
  const tryAdd = (cands, upTo) => {
    for (const x of shuffle(cands.slice())) {
      if (out.length >= upTo) return
      const l = className(x)
      if (!labels.has(l)) { labels.add(l); out.push(l) }
    }
  }
  tryAdd(named.filter((x) => x.id === c.id), 2)
  tryAdd(named.filter((x) => x.n === c.n && x.id !== c.id), 3)
  tryAdd(named, W.K_GAME_CHOICES)
  return { answer, labels: shuffle(out) }
}

function newGame() {
  const pool = shuffle(state.design.rounds.slice()).slice(0, W.K_GAME_ROUNDS)
  state.game = {
    rounds: pool.map((r) => {
      const bits = L.bitsFromBig(BigInt('0x' + r.init))
      const c = L.classify(bits)
      return { ...r, bits, c, ...choicesFor(c) }
    }),
    at: 0, right: 0, picked: null,
  }
}

function renderGame() {
  const g = state.game
  if (!g) return
  const sample = h('p', { class: 'lx-note lx-sub' }, fill(W.SAY_GAME_SAMPLE, { pool: num(state.design.rounds.length), per: W.K_ROUNDS_PER_CLASS, other: num(state.design.luts - state.design.named) }))
  if (g.at >= g.rounds.length) {
    gameBox.replaceChildren(
      h('p', { class: 'lx-score' }, fill(W.SAY_GAME_DONE, { right: g.right, rounds: g.rounds.length })),
      h('button', { class: 't27-btn', type: 'button', onclick: () => { newGame(); renderGame() } }, W.SAY_GAME_AGAIN),
      sample,
    )
    return
  }
  const r = g.rounds[g.at]
  const grid = h('div', { class: 'lx-grid', 'aria-hidden': 'true' })
  for (let i = L.N_BITS - 1; i >= 0; i--) grid.append(h('span', { class: r.bits[i] ? 'is-one' : null }))
  const answered = g.picked !== null
  const choices = r.labels.map((label) => h('button', {
    class: 't27-btn lx-choice' + (answered && label === r.answer ? ' is-right' : '') + (answered && label === g.picked && label !== r.answer ? ' is-wrong' : ''),
    type: 'button', 'aria-pressed': String(label === g.picked), disabled: answered,
    onclick: () => { g.picked = label; if (label === r.answer) g.right++; renderGame() },
  }, label))
  gameBox.replaceChildren(...[
    h('p', { class: 'lx-score' }, fill(W.SAY_GAME_SCORE, { round: g.at + 1, rounds: g.rounds.length, right: g.right })),
    h('p', { class: 'lx-mono lx-init lx-big' }, `64'h${r.init}`),
    h('p', { class: 'lx-note lx-mono' }, fill(W.SAY_GAME_LOC, { loc: r.loc })),
    grid,
    h('div', { class: 'lx-choices' }, choices),
    answered ? h('p', { class: 'lx-verdict ' + (g.picked === r.answer ? 'is-ok' : 'is-bad'), role: 'status' }, g.picked === r.answer ? W.SAY_GAME_RIGHT : fill(W.SAY_GAME_WRONG, { answer: r.answer })) : null,
    answered ? h('div', { class: 'lx-row' },
      h('button', { class: 't27-btn', type: 'button', onclick: () => { g.at++; g.picked = null; renderGame() } }, W.SAY_GAME_NEXT),
      h('button', { class: 't27-btn', type: 'button', onclick: () => openInDecoder(r) }, W.SAY_GAME_OPEN)) : null,
    sample,
  ].filter(Boolean))
}

function openInDecoder(r) {
  const loc = parseLoc(r.loc)
  setInput(loc ? fasmLine(loc, r.bits) : `64'h${r.init}`)
  showTab(0)
}

// --- our design ---------------------------------------------------------------------------------
const designBox = h('div', { class: 'lx-design' })
panels[2].append(designBox)

function bars(hist, total) {
  const shown = hist.slice(0, W.K_HIST_SHOWN)
  const rest = hist.slice(W.K_HIST_SHOWN)
  const max = Math.max(1, ...shown.map(([, n]) => n))
  const row = (label, n, cls) => h('li', { class: 'lx-bar ' + cls },
    h('span', { class: 'lx-bl', title: label }, label),
    h('span', { class: 'lx-bt' }, h('span', { class: 'lx-bf', style: `width:${(100 * n / max).toFixed(1)}%` })),
    h('span', { class: 'lx-bn' }, `${num(n)}  ${(100 * n / total).toFixed(1)}%`))
  const items = shown.map(([k, n]) => row(className(classFromKey(k)), n, k.startsWith('other/') ? 'is-other' : /^(xor|xnor)\//.test(k) ? 'is-xor' : ''))
  if (rest.length) items.push(row(fill(W.SAY_HIST_REST, { kinds: rest.length }), rest.reduce((s, [, n]) => s + n, 0), 'is-rest'))
  return h('ul', { class: 'lx-bars' }, items)
}

function renderDesign() {
  const d = state.design
  if (!d) return
  const s = d.source
  const kids = [
    h('h3', { class: 'lx-h' }, W.SAY_HIST_TITLE),
    h('p', { class: 'lx-note' }, fill(W.SAY_HIST_INTRO, { luts: num(d.luts), distinct: num(d.distinct), part: s.part, named: num(d.named), other: num(d.luts - d.named) })),
  ]
  if (state.file) kids.push(h('p', { class: 'lx-k' }, W.SAY_HIST_OURS))
  kids.push(bars(d.hist, d.luts))
  if (state.file) {
    const f = state.file
    kids.push(h('p', { class: 'lx-k' }, W.SAY_HIST_YOURS),
      h('p', { class: 'lx-note' }, fill(W.SAY_YOUR_FILE, { name: f.name, luts: num(f.list.length), named: num(f.named) })),
      bars(f.hist, Math.max(1, f.list.length)))
  }
  kids.push(h('ul', { class: 'lx-factlist' },
    h('li', {}, fill(W.SAY_FACT_PINS, { agree: num(d.pinsAgree), luts: num(d.luts) })),
    h('li', {}, fill(W.SAY_FACT_O5, { o5: num(d.o5Used), ram: num(d.ramSrl) })),
    h('li', {}, fill(W.SAY_FACT_QM, { inexact: num(d.inexact), terms: num(d.maxTerms) })),
    h('li', {}, fill(W.SAY_FACT_TOOLS, { yosys: s.tools.yosys.replace(/\s*\(.*$/, ''), ycmd: s.yosys, nextpnr: s.tools.nextpnr, prjxray: s.tools.prjxray.split(' ')[0], db: s.tools.db })),
    h('li', {}, W.SAY_LIMITS),
  ))
  designBox.replaceChildren(...kids)
}

// --- start --------------------------------------------------------------------------------------
async function start() {
  try {
    const [px, design] = await Promise.all([json(W.K_DATA_PRJXRAY), json(W.K_DATA_DESIGN)])
    state.px = px
    state.design = design
  } catch (e) {
    status.textContent = fill(W.SAY_LOAD_FAILED, { file: e.message })
    return
  }
  status.textContent = ''
  status.hidden = true
  const carry = (W.SAY_EXAMPLE_NAMES || []).length - 2
  exampleBtns[carry]?.setAttribute('aria-pressed', 'true')
  input.value = exampleText(carry)
  readInput()
}
start()
