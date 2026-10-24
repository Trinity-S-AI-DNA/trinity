// gatle/tool.js -- the daily LUT-guessing game. Every word is a SAY_ constant and every rule
// number a K_ constant from specs/widgets/gatle.t27 (window.T27_WIDGET); every answer is from
// ./pool.json, written by scripts/widget-data/gatle.mjs from real yosys runs. The module's
// source is read from the site's own vendored copy (../../t27/files/specs/...) and compiled to
// Verilog in this page by ../../t27/t27_compiler.wasm, the compiler that produced the Verilog
// yosys read; the two sha256 are compared on screen. Same-origin files only; no other host.
// State lives in the URL hash only (rule.js parseHash/formatHash): no storage, no cookies.
import { dayIndex, dayNumber, emojiRow, formatHash, grade, parseHash, puzzleNumber } from './rule.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.appendChild(css)

const fill = (s, vars) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k === 'class') n.className = v
    else if (k === 'text') n.textContent = v
    else n.setAttribute(k, v)
  }
  for (const c of kids.flat()) if (c != null) n.append(c instanceof Node ? c : String(c))
  return n
}
const at = (rel) => new URL(rel, import.meta.url).href
const isoDay = (day) => new Date(day * 86400000).toISOString().slice(0, 10)
const HEATS = ['close', 'warm', 'cold']
const DIRS = ['hit', 'up', 'down']
const heatWord = (h) => fill((W.SAY_HEAT || [])[HEATS.indexOf(h)], { close: W.K_CLOSE_PCT, warm: W.K_WARM_PCT })
const dirWord = (d) => (W.SAY_DIRS || [])[DIRS.indexOf(d)]
const commentOnly = (line) => /^\s*(;|\/\/)/.test(line)

// --- the compiler, in this page --------------------------------------------------------------
let compilerP = null
function compiler() {
  compilerP ??= (async () => {
    const res = await fetch(at('../../t27/t27_compiler.wasm'))
    if (!res.ok) throw new Error(String(res.status))
    const { instance } = await WebAssembly.instantiate(await res.arrayBuffer(), {})
    const w = instance.exports
    return (source) => {
      const bytes = new TextEncoder().encode(source)
      const inPtr = w.t27_alloc(bytes.length)
      new Uint8Array(w.memory.buffer, inPtr, bytes.length).set(bytes)
      const outPtr = w.t27_analyze(inPtr, bytes.length)
      const len = new DataView(w.memory.buffer).getUint32(outPtr, true)
      const json = new TextDecoder().decode(new Uint8Array(w.memory.buffer, outPtr + 4, len))
      w.t27_free(outPtr, 4 + len)
      return JSON.parse(json)
    }
  })()
  return compilerP
}
async function sha256(text) {
  if (!globalThis.crypto?.subtle) return null
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// --- state -----------------------------------------------------------------------------------
let pool = null
let data = null
let game = null // { practice, day, index, guesses }
const memory = new Map() // this visit only: switching modes keeps a game's guesses until the tab closes
const keyOf = (g) => (g.practice != null ? `p${g.practice}` : `d${g.day}`)
// Before the epoch day there is no puzzle yet, so the clock is held at Gatle #1.
const today = () => Math.max(dayNumber(Date.now()), W.K_EPOCH_DAY)

function gameFromHash() {
  const h = parseHash(location.hash, W.K_GUESSES, W.K_MAX_GUESS)
  const size = pool.length
  if (h.practice != null && h.practice < size) return { practice: h.practice, day: null, index: h.practice, guesses: h.guesses }
  // A daily game: today's, or an earlier day opened from a link. Days before the epoch or after today are today.
  const t = today()
  const day = h.day != null && h.day >= W.K_EPOCH_DAY && h.day <= t ? h.day : t
  const fromHash = h.day === day ? h.guesses : []
  const kept = memory.get(`d${day}`) || []
  return { practice: null, day, index: dayIndex(day, W.K_EPOCH_DAY, size), guesses: fromHash.length ? fromHash : kept }
}

function saveHash() {
  memory.set(keyOf(game), game.guesses.slice())
  history.replaceState(null, '', formatHash(game))
}

const graded = (p) => game.guesses.map((g) => ({ guess: g, ...grade(g, p.answer.lut, W.K_CLOSE_PCT, W.K_WARM_PCT) }))
const isWon = (rows) => rows.some((r) => r.heat === 'close')
const isOver = (rows) => isWon(rows) || rows.length >= W.K_GUESSES

// --- drawing ---------------------------------------------------------------------------------
const view = { tab: 0, comments: false }

function header() {
  const t = today()
  const daily = game.practice == null
  const modes = el('div', { class: 'gt-modes', role: 'group' },
    (W.SAY_MODES || []).map((m, i) => {
      const b = el('button', { type: 'button', class: 't27-btn', 'aria-pressed': String(daily === (i === 0)) }, m)
      b.addEventListener('click', () => {
        if (i === 0) game = { practice: null, day: t, index: dayIndex(t, W.K_EPOCH_DAY, pool.length), guesses: memory.get(`d${t}`) || [] }
        else newPractice()
        saveHash()
        draw()
      })
      return b
    }))
  let line
  if (!daily) line = fill(W.SAY_PRACTICE_LINE, { size: pool.length })
  else if (game.day === t) line = fill(W.SAY_DAILY_LINE, { n: puzzleNumber(game.day, W.K_EPOCH_DAY), date: isoDay(game.day), i: game.index + 1, size: pool.length })
  else line = fill(W.SAY_PAST_LINE, { n: puzzleNumber(game.day, W.K_EPOCH_DAY), date: isoDay(game.day), today: puzzleNumber(t, W.K_EPOCH_DAY) })
  const kids = [modes, el('p', { class: 'gt-line' }, line)]
  if (!daily) {
    const again = el('button', { type: 'button', class: 't27-btn' }, W.SAY_NEW_PRACTICE)
    again.addEventListener('click', () => { newPractice(); saveHash(); draw() })
    kids.splice(1, 0, again)
  }
  return el('div', { class: 'gt-head' }, kids)
}

function newPractice() {
  let i = Math.floor(Math.random() * pool.length)
  if (pool.length > 1 && game && i === game.index) i = (i + 1) % pool.length
  game = { practice: i, day: null, index: i, guesses: memory.get(`p${i}`) || [] }
}

function codePane(p) {
  const box = el('div', { class: 'gt-code' })
  const tabs = el('div', { class: 'gt-tabs', role: 'group' })
  const body = el('div', { class: 'gt-codebody' })
  const show = () => {
    tabs.replaceChildren(...(W.SAY_TABS || []).map((t, i) => {
      const b = el('button', { type: 'button', class: 't27-btn', 'aria-pressed': String(view.tab === i) }, t)
      b.addEventListener('click', () => { view.tab = i; show() })
      return b
    }))
    body.replaceChildren(el('p', { class: 'gt-note' }, W.SAY_LOADING))
    if (view.tab === 0) drawSource(p, body)
    else drawVerilog(p, body)
  }
  show()
  box.append(el('p', { class: 'gt-module' }, el('strong', {}, p.id), ' ', el('span', { class: 'gt-meta' }, fill(W.SAY_MODULE_META, { top: p.top, code: p.code_lines, lines: p.lines }))), tabs, body)
  return box
}

const sources = new Map()
async function sourceOf(p) {
  if (!sources.has(p.src)) sources.set(p.src, fetch(at(`../../${p.src}`)).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text() }))
  return sources.get(p.src)
}

async function drawSource(p, body) {
  let src
  try { src = await sourceOf(p) } catch { body.replaceChildren(el('p', { class: 'gt-bad' }, W.SAY_SOURCE_FAILED)); return }
  const lines = src.replace(/\n$/, '').split('\n')
  const hidden = lines.filter(commentOnly).length
  const shown = view.comments ? lines : lines.filter((l) => !commentOnly(l))
  const toggle = el('button', { type: 'button', class: 't27-btn', 'aria-pressed': String(view.comments) }, view.comments ? W.SAY_HIDE_COMMENTS : fill(W.SAY_SHOW_COMMENTS, { n: hidden }))
  toggle.addEventListener('click', () => { view.comments = !view.comments; drawSource(p, body) })
  const kids = [el('pre', { class: 'gt-pre', tabindex: '0' }, shown.join('\n')), el('div', { class: 'gt-row' }, toggle, el('a', { href: at(`../../${p.src}`), target: '_blank', rel: 'noopener', class: 'gt-meta' }, p.path))]
  if (await sha256(src).then((h) => h && h !== p.spec_sha256)) kids.push(el('p', { class: 'gt-bad' }, W.SAY_SOURCE_DRIFT))
  body.replaceChildren(...kids)
}

async function drawVerilog(p, body) {
  body.replaceChildren(el('p', { class: 'gt-note' }, W.SAY_COMPILING))
  let code
  const t0 = performance.now()
  try {
    const [analyze, src] = await Promise.all([compiler(), sourceOf(p)])
    code = analyze(src).targets?.verilog?.code
    if (!code) throw new Error('no verilog')
  } catch { body.replaceChildren(el('p', { class: 'gt-bad' }, W.SAY_COMPILE_FAILED)); return }
  const ms = Math.round(performance.now() - t0)
  const h = await sha256(code)
  const note = h == null ? fill(W.SAY_VERILOG_UNCHECKED, { bytes: code.length, ms })
    : h === p.verilog_sha256 ? fill(W.SAY_VERILOG_SAME, { bytes: code.length, ms, sha: h.slice(0, 12) })
    : fill(W.SAY_VERILOG_DRIFT, { bytes: code.length, ms, sha: h.slice(0, 12), was: p.verilog_sha256.slice(0, 12) })
  body.replaceChildren(el('pre', { class: 'gt-pre', tabindex: '0' }, code), el('p', { class: h && h !== p.verilog_sha256 ? 'gt-bad' : 'gt-note' }, note))
}

function board(p, rows) {
  const out = el('ol', { class: 'gt-board', 'aria-label': W.SAY_BOARD_LABEL })
  for (let i = 0; i < W.K_GUESSES; i++) {
    const r = rows[i]
    if (!r) { out.append(el('li', { class: 'gt-rowtile is-empty' }, el('span', { class: 'gt-tile' }, ''), el('span', { class: 'gt-say' }, ''))); continue }
    const arrow = r.dir === 'hit' ? '' : String.fromCodePoint((W.K_ARROWS || [])[r.dir === 'up' ? 0 : 1])
    out.append(el('li', { class: `gt-rowtile is-${r.heat}` },
      el('span', { class: 'gt-tile' }, String(r.guess)),
      el('span', { class: 'gt-arrow', 'aria-hidden': 'true' }, arrow),
      el('span', { class: 'gt-say' }, `${dirWord(r.dir)}, ${heatWord(r.heat)}`)))
  }
  return out
}

function guessForm(p, rows) {
  const form = el('form', { class: 'gt-form' })
  const input = el('input', { id: 'gt-in', class: 'gt-input', type: 'number', inputmode: 'numeric', min: '0', max: String(W.K_MAX_GUESS), step: '1', required: 'required', autocomplete: 'off' })
  const msg = el('p', { class: 'gt-bad', role: 'status' })
  form.append(
    el('label', { for: 'gt-in' }, W.SAY_INPUT_LABEL),
    el('div', { class: 'gt-inputline' }, input, el('button', { type: 'submit', class: 't27-btn gt-go' }, W.SAY_GUESS)),
    el('p', { class: 'gt-note' }, fill(W.SAY_GUESSES_LEFT, { n: W.K_GUESSES - rows.length, max: W.K_GUESSES })),
    msg)
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const s = input.value.trim()
    if (!/^\d+$/.test(s) || Number(s) > W.K_MAX_GUESS) { msg.textContent = fill(W.SAY_BAD_GUESS, { max: W.K_MAX_GUESS }); return }
    const g = Number(s)
    if (game.guesses.includes(g)) { msg.textContent = W.SAY_ALREADY; return }
    game.guesses.push(g)
    saveHash()
    redrawPlay()
  })
  return form
}

function reveal(p, rows) {
  const a = p.answer
  const won = isWon(rows)
  const kids = [
    el('p', { class: won ? 'gt-won' : 'gt-lost' }, won ? fill(W.SAY_WON, { n: rows.length, max: W.K_GUESSES, close: W.K_CLOSE_PCT }) : W.SAY_LOST),
    el('p', { class: 'gt-answer' }, fill(W.SAY_ANSWER, { lut: a.lut })),
    el('p', { class: 'gt-note' }, fill(W.SAY_REVEAL, { ff: a.ff, carry4: a.carry4, muxf7: a.muxf7, muxf8: a.muxf8, dsp: a.dsp, cells: a.cells })),
  ]
  const o = p.other
  if (o.lut != null) kids.push(el('p', { class: 'gt-note' }, o.lut === a.lut && o.dsp === a.dsp ? fill(W.SAY_OTHER_SAME, { mode: W.K_OTHER_SYNTH }) : fill(W.SAY_OTHER_DIFF, { mode: W.K_OTHER_SYNTH, lut: o.lut, dsp: o.dsp })))
  const types = Object.entries(a.by_type).sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([k, n]) => `${k} ${n}`).join(', ')
  kids.push(el('details', { class: 'gt-types' }, el('summary', {}, W.SAY_BY_TYPE), el('p', { class: 'gt-meta' }, types)))
  kids.push(share(rows, won))
  return el('section', { class: 'gt-reveal' }, kids)
}

function shareText(rows, won) {
  const score = won ? String(rows.length) : W.SAY_SHARE_LOST
  const head = game.practice == null
    ? fill(W.SAY_SHARE_HEAD, { n: puzzleNumber(game.day, W.K_EPOCH_DAY), score, max: W.K_GUESSES })
    : fill(W.SAY_SHARE_PRACTICE, { score, max: W.K_GUESSES })
  return [head, ...rows.map((r) => emojiRow(r, W.K_EMOJI_HEAT, W.K_ARROWS, W.K_EMOJI_SELECTOR)), W.K_SHARE_URL].join('\n')
}

function share(rows, won) {
  const text = shareText(rows, won)
  const pre = el('pre', { class: 'gt-share', tabindex: '0' }, text)
  const msg = el('span', { class: 'gt-note', role: 'status' })
  const btn = el('button', { type: 'button', class: 't27-btn' }, W.SAY_COPY)
  btn.addEventListener('click', async () => {
    let ok = false
    try { await navigator.clipboard.writeText(text); ok = true } catch {
      // The async clipboard can be refused (an iframe, an http page); select the text and try the old way.
      const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r)
      try { ok = document.execCommand('copy') } catch { ok = false }
    }
    msg.textContent = ok ? W.SAY_COPIED : W.SAY_COPY_FAILED
    setTimeout(() => { msg.textContent = '' }, 2500)
  })
  return el('div', { class: 'gt-sharebox' }, el('p', { class: 'gt-label' }, W.SAY_SHARE_LABEL), pre, el('div', { class: 'gt-row' }, btn, msg))
}

function playSection(p) {
  const rows = graded(p)
  return el('section', { class: 'gt-play' },
    el('h2', { class: 'gt-q' }, W.SAY_QUESTION),
    el('p', { class: 'gt-note' }, fill(W.SAY_RULE_NOTE, { synth: data.yosys.answer, version: data.yosys.version.replace(/\s*\(.*$/, ''), close: W.K_CLOSE_PCT, warm: W.K_WARM_PCT })),
    board(p, rows),
    isOver(rows) ? reveal(p, rows) : guessForm(p, rows))
}

// After a guess only the board side is drawn again, so the code box keeps its scroll and tab.
function redrawPlay() {
  const p = pool[game.index]
  const next = playSection(p)
  root.querySelector('.gt-play')?.replaceWith(next)
  if (isOver(graded(p))) next.querySelector('.gt-reveal')?.scrollIntoView({ block: 'nearest' })
  else next.querySelector('#gt-in')?.focus({ preventScroll: true })
}

function draw() {
  const p = pool[game.index]
  root.replaceChildren(
    header(),
    el('div', { class: 'gt-grid' }, codePane(p), playSection(p)),
    el('p', { class: 'gt-honest' }, W.SAY_NO_STREAKS),
    el('p', { class: 'gt-meta gt-pool' }, fill(W.SAY_POOL_NOTE, { size: pool.length, specs: data.corpus.specs, candidates: data.corpus.candidates, date: data.date_utc, zeroff: data.pool.filter((x) => x.answer.ff === 0).length, min: W.K_MIN_LUTS, max: W.K_MAX_LUTS, lines: W.K_MAX_CODE_LINES, cols: W.K_MAX_CODE_COLS })))
}

async function main() {
  root.replaceChildren(el('p', { class: 'gt-note' }, W.SAY_LOADING))
  try {
    const res = await fetch(at(W.K_DATA_FILE))
    if (!res.ok) throw new Error(String(res.status))
    data = await res.json()
    pool = data.pool
    if (!pool?.length) throw new Error('empty pool')
  } catch {
    root.replaceChildren(el('p', { class: 'gt-bad' }, W.SAY_LOAD_FAILED))
    return
  }
  game = gameFromHash()
  saveHash()
  draw()
  addEventListener('hashchange', () => { game = gameFromHash(); draw() })
}

main()
