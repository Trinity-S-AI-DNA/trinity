// ecc-secded/tool.js -- draws a SECDED word the reader can break. It computes nothing itself:
// encode, syndrome, parity, verdict, the flipped position and the decoded byte come from
// ./logic.js, the fn bodies of gHashTag/t27 specs/fpga/secded.t27 compiled to wasm
// (scripts/widget-logic.mjs keeps the two in step); even which positions hold data is the spec's
// data_pos. Every word is a SAY_ constant and every number a K_ constant of
// specs/widgets/ecc-secded.t27 (window.T27_WIDGET). Reads only its own files.
import { dataPos, decode, encode, flipped, parity, syndrome, verdict } from './logic.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')
const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.appendChild(css)

const fill = (s, ...v) => String(s ?? '').replace(/\{(\d+)\}/g, (m, i) => (i < v.length ? String(v[i]) : m))
const say = (k, i) => (Array.isArray(W[k]) ? W[k][i] : W[k]) ?? ''
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) if (v != null) k === 'class' ? (n.className = v) : n.setAttribute(k, v)
  for (const c of kids.flat()) if (c != null) n.append(c instanceof Node ? c : String(c))
  return n
}
const hex2 = (v) => '0x' + v.toString(16).toUpperCase().padStart(2, '0')

const BITS = W.K_WORD_BITS ?? 13
const DATA = W.K_DATA_BITS ?? 8
const V = { clean: W.K_CLEAN ?? 0, fixed: W.K_CORRECTED ?? 1, double: W.K_DOUBLE ?? 2 }
const PRE = { byte: W.K_PRESET_BYTE || [165], a: W.K_PRESET_FLIP_A || [255], b: W.K_PRESET_FLIP_B || [255] }
// Which positions carry data: the spec's own data_pos(0..7). Position 0 is the parity bit; the rest are checks.
const DATA_AT = new Set(Array.from({ length: DATA }, (_, i) => dataPos(i)))
const roleOf = (p) => say('SAY_ROLES', p === 0 ? 0 : DATA_AT.has(p) ? 2 : 1)

let flips = 0
const input = el('input', { class: 'ec-input', id: 'ec-byte', inputmode: 'text', autocomplete: 'off', spellcheck: 'false' })
const msg = el('p', { class: 'ec-msg', role: 'status' })
const presets = el('div', { class: 'ec-presets', role: 'group', 'aria-label': say('SAY_PRESETS_LABEL') })
const presetButtons = (W.SAY_PRESET_NAMES || []).map((name, i) => {
  const b = el('button', { class: 't27-btn ec-preset', type: 'button' }, name)
  b.addEventListener('click', () => setPreset(i))
  presets.append(b)
  return b
})
const word = el('div', { class: 'ec-word', role: 'group', 'aria-label': say('SAY_WORD_LABEL') })
const cells = []
for (let p = BITS - 1; p >= 0; p--) {
  const b = el('button', { class: 'ec-bit', type: 'button', 'data-p': String(p) })
  b.addEventListener('click', () => {
    flips ^= 1 << p
    presetButtons.forEach((x) => x.setAttribute('aria-pressed', 'false'))
    draw()
  })
  cells[p] = b
  word.append(b)
}
const reset = el('button', { class: 't27-btn ec-reset', type: 'button' }, say('SAY_RESET'))
reset.addEventListener('click', () => {
  flips = 0
  draw()
})
const out = el('div', { class: 'ec-verdict' })
const source = el('p', { class: 'ec-source' }, el('a', { href: './logic.t27' }, say('SAY_SOURCE')))
root.replaceChildren(
  el('p', { class: 'ec-label' }, say('SAY_PRESETS_LABEL')),
  presets,
  el('label', { class: 'ec-field', for: 'ec-byte' }, el('span', { class: 'ec-label' }, say('SAY_BYTE')), input),
  msg,
  el('p', { class: 'ec-label' }, say('SAY_WORD_LABEL')),
  word,
  reset,
  out,
  source,
)

function readByte() {
  const t = String(input.value).trim()
  const m = t.match(/^0x([0-9a-f]{1,2})$/i)
  const n = m ? parseInt(m[1], 16) : /^\d{1,3}$/.test(t) ? Number(t) : NaN
  return Number.isInteger(n) && n >= 0 && n <= 255 ? n : null
}

function setPreset(i) {
  input.value = hex2(PRE.byte[i])
  flips = 0
  for (const p of [PRE.a[i], PRE.b[i]]) if (p < BITS) flips ^= 1 << p
  presetButtons.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)))
  draw()
}

function draw() {
  const d = readByte()
  if (d === null) {
    msg.textContent = say('SAY_BAD_INPUT')
    return
  }
  msg.textContent = ''
  const clean = encode(d)
  const w = (clean ^ flips) & ((1 << BITS) - 1)
  for (let p = 0; p < BITS; p++) {
    const on = (w >> p) & 1
    const hit = (flips >> p) & 1
    cells[p].className = `ec-bit ec-${roleOf(p).toLowerCase()}${hit ? ' ec-hit' : ''}`
    cells[p].replaceChildren(el('span', { class: 'ec-pos' }, String(p)), el('span', { class: 'ec-val' }, String(on)), el('span', { class: 'ec-role' }, roleOf(p)))
    cells[p].setAttribute('aria-pressed', String(Boolean(hit)))
  }
  const s = syndrome(w)
  const v = verdict(w)
  out.className = `ec-verdict ${v === V.clean ? 'ec-ok' : v === V.fixed ? 'ec-warn' : 'ec-bad'}`
  out.replaceChildren(
    el('strong', {}, fill(say('SAY_VERDICTS', v), flipped(w))),
    el('p', {}, fill(say('SAY_SYNDROME'), s.toString(2).padStart(4, '0'), s)),
    el('p', {}, fill(say('SAY_PARITY'), parity(w) ? say('SAY_ODD') : say('SAY_EVEN'))),
    v === V.double ? null : el('p', {}, fill(say('SAY_DECODED'), hex2(decode(w)))),
  )
  history.replaceState(null, '', `#byte=${d}&flips=${flips}`)
}

input.addEventListener('input', () => {
  presetButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'))
  draw()
})

const h = new URLSearchParams(location.hash.slice(1))
if (h.has('byte') && h.has('flips')) {
  input.value = h.get('byte')
  flips = Number(h.get('flips')) & ((1 << BITS) - 1)
  draw()
} else setPreset(W.K_START_PRESET ?? 1)
