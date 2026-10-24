// SPDX-License-Identifier: Apache-2.0
// test-waves/tool.js -- a timing diagram of a VCD: the demo simulation of a t27 spec, or a file
// the reader drops. Every word on the screen comes from specs/widgets/test-waves.t27 through
// window.T27_WIDGET; this file holds none of its own. It fetches only demo.vcd and demo.json
// beside it, reads a dropped file with FileReader, and sends nothing anywhere.

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')
const fill = (tpl, vals) => String(tpl ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vals ? String(vals[k]) : m))
const el = (tag, attrs = {}, kids = []) => {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') e.textContent = v
    else if (k === 'class') e.className = v
    else e.setAttribute(k, v)
  }
  for (const c of kids) e.append(c)
  return e
}
const isEmbed = document.documentElement.classList.contains('embed')

// --- colours: the shared page palette ------------------------------------------------------------
const css = getComputedStyle(document.documentElement)
const C = {
  green: css.getPropertyValue('--w-green').trim() || '#00ff88',
  gold: css.getPropertyValue('--w-gold').trim() || '#ffd700',
  red: css.getPropertyValue('--w-red').trim() || '#ff4d6d',
  text: css.getPropertyValue('--w-text').trim() || '#e8fff7',
  muted: css.getPropertyValue('--w-muted').trim() || '#adc9c0',
  subtle: css.getPropertyValue('--w-subtle').trim() || '#8fa9a0',
  line: 'rgba(0,255,136,0.16)',
  grid: 'rgba(0,255,136,0.07)',
  z: '#6fa8ff',
  mono: css.getPropertyValue('--w-mono').trim() || 'ui-monospace, Menlo, monospace',
}
const ROLE_COLOUR = { clock: C.subtle, in: C.green, out: C.gold, tb: C.muted }

// --- VCD ---------------------------------------------------------------------------------------
class VcdError extends Error {}
const UNIT_EXP = { s: 0, ms: -3, us: -6, ns: -9, ps: -12, fs: -15 }

/** Parses the common subset of IEEE 1364 VCD: scalars, vectors, reals. */
export function parseVcd(text) {
  const tok = text.split(/\s+/)
  let i = 0
  const scope = []
  const vars = []
  const byId = new Map()
  let unitExp = null
  let unitMul = 1
  const skipToEnd = () => { while (i < tok.length && tok[i] !== '$end') i++; i++ }
  // header
  for (;;) {
    if (i >= tok.length) throw new VcdError(W.SAY_ERR_NO_DEFS)
    const t = tok[i++]
    if (!t) continue
    if (t === '$timescale') {
      const parts = []
      while (i < tok.length && tok[i] !== '$end') parts.push(tok[i++])
      i++
      const m = /^(\d+)\s*(s|ms|us|ns|ps|fs)$/.exec(parts.join(''))
      if (!m) throw new VcdError(W.SAY_ERR_NO_TIMESCALE)
      unitMul = Number(m[1])
      unitExp = UNIT_EXP[m[2]]
    } else if (t === '$scope') {
      scope.push(tok[i + 1]); i += 2; skipToEnd()
    } else if (t === '$upscope') {
      scope.pop(); skipToEnd()
    } else if (t === '$var') {
      const type = tok[i]; const width = Number(tok[i + 1]); const id = tok[i + 2]; const ref = tok[i + 3]
      i += 4
      skipToEnd()
      if (!(width > 0) || !id || !ref) continue
      const name = [...scope, ref].join('.')
      let sig = byId.get(id)
      if (!sig) {
        sig = { id, name, width, real: type === 'real', times: [], values: [] }
        byId.set(id, sig)
        vars.push(sig)
      } else if (!vars.some((v) => v.name === name)) {
        // an alias: one code, a second name, the same changes
        const alias = { ...sig, name, alias: sig }
        vars.push(alias)
      }
    } else if (t === '$enddefinitions') {
      skipToEnd()
      break
    } else if (t.startsWith('$')) skipToEnd()
  }
  if (unitExp === null) { unitExp = -9; unitMul = 1 }
  // value changes
  let time = 0
  let end = 0
  const set = (id, v) => {
    const s = byId.get(id)
    if (!s) return
    const n = s.values.length
    if (n && s.times[n - 1] === time) { s.values[n - 1] = v; return }
    if (n && s.values[n - 1] === v) return
    s.times.push(time); s.values.push(v)
  }
  while (i < tok.length) {
    const t = tok[i++]
    if (!t) continue
    const c = t[0]
    if (c === '#') {
      const n = Number(t.slice(1))
      if (!Number.isFinite(n)) throw new VcdError(fill(W.SAY_ERR_BAD_TOKEN, { token: t.slice(0, 24), t: time }))
      time = n
      if (n > end) end = n
    } else if (c === '0' || c === '1' || c === 'x' || c === 'X' || c === 'z' || c === 'Z') {
      set(t.slice(1), c.toLowerCase())
    } else if (c === 'b' || c === 'B') {
      set(tok[i++], t.slice(1).toLowerCase())
    } else if (c === 'r' || c === 'R') {
      set(tok[i++], 'r' + t.slice(1))
    } else if (c === '$') {
      // $dumpvars, $dumpall, $dumpon, $dumpoff, $end, $comment ... $end
      if (t === '$comment') skipToEnd()
    } else throw new VcdError(fill(W.SAY_ERR_BAD_TOKEN, { token: t.slice(0, 24), t: time }))
  }
  for (const v of vars) if (v.alias) { v.times = v.alias.times; v.values = v.alias.values }
  const signals = vars.filter((v) => v.values.length > 0)
  if (!signals.length) throw new VcdError(W.SAY_ERR_NO_SIGNALS)
  return { signals, end: Math.max(end, 1), unitExp, unitMul }
}

// --- values ------------------------------------------------------------------------------------
/** A vector's bits, left-extended to its width the way VCD says to. */
function bitsOf(v, width) {
  if (v.length >= width) return v.slice(v.length - width)
  const pad = v[0] === 'x' || v[0] === 'z' ? v[0] : '0'
  return pad.repeat(width - v.length) + v
}
function hexOf(v, width) {
  if (v[0] === 'r') return v.slice(1)
  const b = bitsOf(v, width)
  let out = ''
  for (let k = b.length; k > 0; k -= 4) {
    const nib = b.slice(Math.max(0, k - 4), k)
    out = (/x/.test(nib) ? 'x' : /z/.test(nib) ? 'z' : parseInt(nib, 2).toString(16)) + out
  }
  return out
}
function decimalOf(v, width) {
  if (v[0] === 'r' || /[xz]/.test(v)) return null
  const u = BigInt('0b' + bitsOf(v, width))
  const s = width > 1 && u >> BigInt(width - 1) ? u - (1n << BigInt(width)) : null
  return s === null ? `${u}` : `${u} / ${s}`
}
/** The label a bus segment carries: hex without leading zeros, or signed decimal (radix 'sdec'). */
function labelOf(sig, v) {
  if (sig.real) return v.slice(1)
  if (sig.radix === 'sdec' && !/[xz]/.test(v)) {
    const u = BigInt('0b' + bitsOf(v, sig.width))
    return String(u >> BigInt(sig.width - 1) ? u - (1n << BigInt(sig.width)) : u)
  }
  return hexOf(v, sig.width).replace(/^0+(?=.)/, '')
}
function valueText(sig, v) {
  if (v == null) return ''
  if (sig.real) return v.slice(1)
  if (sig.width === 1) return v
  const h = hexOf(v, sig.width)
  const d = decimalOf(v, sig.width)
  return d === null ? `0x${h}` : `0x${h} = ${d}`
}
function valueAt(sig, t) {
  const ts = sig.times
  let lo = 0
  let hi = ts.length - 1
  if (hi < 0 || t < ts[0]) return null
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ts[mid] <= t) lo = mid; else hi = mid - 1 }
  return sig.values[lo]
}
const firstIndexAt = (sig, t) => {
  const ts = sig.times
  let lo = 0
  let hi = ts.length - 1
  if (hi < 0) return 0
  if (t < ts[0]) return 0
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ts[mid] <= t) lo = mid; else hi = mid - 1 }
  return lo
}

// --- time --------------------------------------------------------------------------------------
const UNITS = W.SAY_TIME_UNITS || ['s', 'ms', 'us', 'ns', 'ps', 'fs']
function timeText(t, data) {
  const exp = data.unitExp
  const seconds = t * data.unitMul
  if (seconds === 0) return `0 ${UNITS[Math.min(5, Math.max(0, -exp / 3))]}`
  // pick the largest unit in which the value is >= 1
  const abs = Math.abs(seconds) * 10 ** (exp + 15) // in fs
  let u = 5
  while (u > 0 && abs >= 1000 ** (6 - u)) u--
  const val = abs / 1000 ** (5 - u)
  const s = val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2)
  return `${s.includes('.') ? s.replace(/\.?0+$/, '') : s} ${UNITS[u]}`
}
function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p
  return 10 * p
}

// --- the page ----------------------------------------------------------------------------------
const btn = (label, title, onClick, extra = {}) => {
  const b = el('button', { type: 'button', class: 't27-btn', title: title || label, 'aria-label': title || label, text: label, ...extra })
  b.addEventListener('click', onClick)
  return b
}
const fileInput = el('input', { type: 'file', accept: '.vcd,text/plain', hidden: '' })
const demoBtn = btn(W.SAY_DEMO, W.SAY_DEMO_TITLE, () => loadDemo(), { 'aria-pressed': 'true' })
const openBtn = btn(W.SAY_DROP_SHORT, W.SAY_DROP, () => fileInput.click())
const zoomOutBtn = btn('−', W.SAY_ZOOM_OUT, () => zoomBy(1 / 1.6))
const zoomInBtn = btn('+', W.SAY_ZOOM_IN, () => zoomBy(1.6))
const fitBtn = btn(W.SAY_FIT, W.SAY_FIT_TITLE, () => { fit(); draw() })
const hint = el('span', { class: 'tw-hint', text: W.SAY_HINT })
const bar = el('div', { class: 'tw-bar' }, [demoBtn, openBtn, zoomOutBtn, zoomInBtn, fitBtn, hint])
const canvas = el('canvas', { class: 'tw-canvas', tabindex: '0', role: 'img', 'aria-label': W.SAY_CANVAS_LABEL })
const stage = el('div', { class: 'tw-stage' }, [canvas])
const drop = el('div', { class: 't27-drop tw-drop', role: 'button', tabindex: '0', text: W.SAY_DROP })
drop.addEventListener('click', () => fileInput.click())
drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click() } })
const source = el('p', { class: 'tw-source' })
const status = el('p', { class: 'tw-status', 'aria-live': 'polite' })
const prov = el('details', { class: 'tw-prov' })
const box = el('div', { class: 'tw' + (isEmbed ? ' tw-embed' : '') }, [bar, stage, status, source, drop, prov, fileInput])
root.replaceChildren(box)
{
  const link = el('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href })
  document.head.append(link)
}

// --- state -------------------------------------------------------------------------------------
let data = null // { signals, end, unitExp, unitMul, rows, checks, demo }
let view = { t0: 0, scale: 1, y: 0 }
let cursor = null
let pickedCheck = null
let W_PX = 0
let H_PX = 0
const ROW = W.K_ROW_PX || 36
const AXIS = W.K_AXIS_PX || 26
const CHECKS = W.K_CHECKS_PX || 34
const MAX_PX = W.K_MAX_PX_PER_UNIT || 400

const gutter = () => Math.round(Math.min(220, Math.max(92, W_PX * 0.24)))
const waveW = () => Math.max(40, W_PX - gutter() - 8)
const checksH = () => (data?.checks?.length ? CHECKS : 0)
const rowsH = () => H_PX - AXIS - checksH()
const xOf = (t) => gutter() + (t - view.t0) * view.scale
const tOf = (x) => view.t0 + (x - gutter()) / view.scale
const minScale = () => (waveW() / data.end) * 0.5

function fit() {
  if (!data) return
  view.t0 = 0
  view.scale = waveW() / data.end
  view.y = 0
}
function clampView() {
  if (!data) return
  view.scale = Math.min(MAX_PX, Math.max(minScale(), view.scale))
  const span = waveW() / view.scale
  view.t0 = Math.min(data.end - span * 0.2, Math.max(-span * 0.8, view.t0))
  const content = data.rows.length * ROW
  view.y = Math.max(0, Math.min(Math.max(0, content - rowsH()), view.y))
}
function zoomBy(f, atX = gutter() + waveW() / 2) {
  if (!data) return
  const t = tOf(atX)
  view.scale *= f
  clampView()
  view.t0 = t - (atX - gutter()) / view.scale
  clampView()
  draw()
}

// --- drawing -----------------------------------------------------------------------------------
const ctx = canvas.getContext('2d')
function resize() {
  const r = stage.getBoundingClientRect()
  const want = data ? data.rows.length * ROW + AXIS + checksH() : 300
  let h
  if (isEmbed) h = Math.max(200, r.height)
  else h = Math.max(240, Math.min(want, Math.round(window.innerHeight * 0.72)))
  W_PX = Math.max(200, Math.floor(r.width))
  H_PX = Math.floor(h)
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(W_PX * dpr)
  canvas.height = Math.round(H_PX * dpr)
  canvas.style.width = W_PX + 'px'
  canvas.style.height = H_PX + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawBus(sig, y0, colour, t0, t1) {
  const top = y0 + 6
  const bot = y0 + ROW - 6
  const mid = (top + bot) / 2
  const gx = gutter()
  const xr = gx + waveW()
  let i = firstIndexAt(sig, t0)
  ctx.font = `11px ${C.mono}`
  ctx.textBaseline = 'middle'
  for (; i < sig.times.length && sig.times[i] <= t1; i++) {
    const a = Math.max(gx, xOf(sig.times[i]))
    const b = Math.min(xr, i + 1 < sig.times.length ? xOf(sig.times[i + 1]) : xOf(data.end))
    if (b <= a) continue
    const v = sig.values[i]
    const bad = !sig.real && /x/.test(v)
    const hiZ = !sig.real && /^z+$/.test(v)
    ctx.strokeStyle = bad ? C.red : hiZ ? C.z : colour
    ctx.lineWidth = 1.25
    const k = Math.min(4, (b - a) / 2)
    if (b - a < 3) {
      ctx.fillStyle = ctx.strokeStyle
      ctx.globalAlpha = 0.5
      ctx.fillRect(a, top, Math.max(1, b - a), bot - top)
      ctx.globalAlpha = 1
      continue
    }
    if (hiZ) {
      ctx.beginPath(); ctx.moveTo(a, mid); ctx.lineTo(b, mid); ctx.stroke()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(a, mid); ctx.lineTo(a + k, top); ctx.lineTo(b - k, top); ctx.lineTo(b, mid)
    ctx.lineTo(b - k, bot); ctx.lineTo(a + k, bot); ctx.closePath()
    ctx.fillStyle = bad ? 'rgba(255,77,109,0.18)' : 'rgba(0,255,136,0.05)'
    ctx.fill()
    ctx.stroke()
    let label = labelOf(sig, v)
    const room = b - a - 2 * k - 6
    if (room > 8) {
      if (ctx.measureText(label).width > room) {
        // keep the low digits, which change first; the dropped high digits become an ellipsis
        while (label.length > 1 && ctx.measureText('…' + label).width > room) label = label.slice(1)
        label = '…' + label
        if (ctx.measureText(label).width > room) continue
      }
      ctx.fillStyle = bad ? C.red : C.text
      ctx.textAlign = 'center'
      ctx.fillText(label, (a + b) / 2, mid + 0.5)
    }
  }
}

function drawBit(sig, y0, colour, t0, t1) {
  const hi = y0 + 7
  const lo = y0 + ROW - 7
  const mid = (hi + lo) / 2
  const gx = gutter()
  const xr = gx + waveW()
  const yOf = (v) => (v === '1' ? hi : v === '0' ? lo : mid)
  let i = firstIndexAt(sig, t0)
  let prevY = null
  ctx.lineWidth = sig.role === 'clock' ? 1 : 1.5
  for (; i < sig.times.length && sig.times[i] <= t1; i++) {
    const a = Math.max(gx, xOf(sig.times[i]))
    const b = Math.min(xr, i + 1 < sig.times.length ? xOf(sig.times[i + 1]) : xOf(data.end))
    if (b < a) continue
    const v = sig.values[i]
    const y = yOf(v)
    ctx.strokeStyle = v === 'x' ? C.red : v === 'z' ? C.z : colour
    if (v === 'x') { ctx.fillStyle = 'rgba(255,77,109,0.18)'; ctx.fillRect(a, hi, b - a, lo - hi) }
    ctx.beginPath()
    if (prevY !== null && prevY !== y && a > gx) { ctx.moveTo(a, prevY); ctx.lineTo(a, y) } else ctx.moveTo(a, y)
    ctx.lineTo(b, y)
    ctx.stroke()
    if (v === '1' && sig.role !== 'clock') { ctx.fillStyle = 'rgba(0,255,136,0.07)'; ctx.fillRect(a, hi, b - a, lo - hi) }
    prevY = y
  }
}

function draw() {
  if (!W_PX) return
  ctx.clearRect(0, 0, W_PX, H_PX)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W_PX, H_PX)
  if (!data) return
  const gx = gutter()
  const xr = gx + waveW()
  const t0 = tOf(gx)
  const t1 = tOf(xr)
  // axis + grid
  const step = niceStep(90 / view.scale)
  ctx.font = `10px ${C.mono}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) {
    const x = xOf(t)
    if (x < gx) continue
    ctx.strokeStyle = C.grid
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x + 0.5, AXIS); ctx.lineTo(x + 0.5, H_PX); ctx.stroke()
    ctx.strokeStyle = C.line
    ctx.beginPath(); ctx.moveTo(x + 0.5, AXIS - 6); ctx.lineTo(x + 0.5, AXIS); ctx.stroke()
    ctx.fillStyle = C.subtle
    if (x + 4 < xr - 20) ctx.fillText(timeText(t, data), x + 3, AXIS / 2)
  }
  ctx.strokeStyle = C.line
  ctx.beginPath(); ctx.moveTo(0, AXIS + 0.5); ctx.lineTo(W_PX, AXIS + 0.5); ctx.stroke()
  // check lines behind the waves
  const ch = checksH()
  for (const c of data.checks ?? []) {
    const x = xOf(c.t)
    if (x < gx || x > xr) continue
    ctx.strokeStyle = c.pass ? 'rgba(0,255,136,0.28)' : 'rgba(255,77,109,0.6)'
    ctx.setLineDash([2, 3])
    ctx.beginPath(); ctx.moveTo(x + 0.5, AXIS); ctx.lineTo(x + 0.5, H_PX - ch); ctx.stroke()
    ctx.setLineDash([])
  }
  // rows
  const top = AXIS
  const bottom = H_PX - ch
  ctx.save()
  ctx.beginPath(); ctx.rect(0, top, W_PX, bottom - top); ctx.clip()
  const first = Math.floor(view.y / ROW)
  for (let r = first; r < data.rows.length; r++) {
    const y0 = top + r * ROW - view.y
    if (y0 > bottom) break
    const sig = data.rows[r]
    const colour = ROLE_COLOUR[sig.role] || C.green
    ctx.strokeStyle = 'rgba(0,255,136,0.06)'
    ctx.beginPath(); ctx.moveTo(0, y0 + ROW + 0.5); ctx.lineTo(W_PX, y0 + ROW + 0.5); ctx.stroke()
    // name and the value under the cursor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `12px ${C.mono}`
    ctx.fillStyle = colour
    let name = sig.short
    while (name.length > 3 && ctx.measureText(name).width > gx - 14) name = name.slice(0, -1)
    if (name !== sig.short) name = name.slice(0, -1) + '…'
    ctx.fillText(name, 8, y0 + 15)
    if (sig.width > 1) {
      const w = ctx.measureText(name).width
      const tag = `[${sig.width}]`
      ctx.font = `9px ${C.mono}`
      ctx.fillStyle = C.subtle
      if (8 + w + 4 + ctx.measureText(tag).width < gx - 4) ctx.fillText(tag, 8 + w + 4, y0 + 15)
    }
    if (cursor !== null) {
      const v = valueAt(sig, cursor)
      if (v != null) {
        ctx.font = `10px ${C.mono}`
        ctx.fillStyle = C.gold
        let s = sig.width === 1 ? v : sig.real || sig.radix === 'sdec' ? labelOf(sig, v) : '0x' + labelOf(sig, v)
        while (s.length > 2 && ctx.measureText(s).width > gx - 14) s = s.slice(0, -1)
        ctx.fillText(s, 8, y0 + 29)
      }
    }
    ctx.save()
    ctx.beginPath(); ctx.rect(gx, y0, xr - gx, ROW); ctx.clip()
    if (sig.width === 1 && !sig.real) drawBit(sig, y0, colour, t0, t1)
    else drawBus(sig, y0, colour, t0, t1)
    ctx.restore()
  }
  ctx.restore()
  // gutter edge
  ctx.strokeStyle = C.line
  ctx.beginPath(); ctx.moveTo(gx - 0.5, AXIS); ctx.lineTo(gx - 0.5, H_PX); ctx.stroke()
  // checks row
  if (ch) {
    const y0 = H_PX - ch
    ctx.strokeStyle = C.line
    ctx.beginPath(); ctx.moveTo(0, y0 + 0.5); ctx.lineTo(W_PX, y0 + 0.5); ctx.stroke()
    ctx.font = `12px ${C.mono}`
    ctx.fillStyle = C.muted
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(W.SAY_CHECKS_ROW, 8, y0 + ch / 2)
    for (const c of data.checks) {
      const x = xOf(c.t)
      if (x < gx - 1 || x > xr + 1) continue
      const picked = c === pickedCheck
      ctx.fillStyle = c.pass ? C.green : C.red
      ctx.beginPath()
      const s = picked ? 9 : 7
      const cy = y0 + ch / 2
      if (c.pass) { ctx.moveTo(x - s, cy - s * 0.6); ctx.lineTo(x + s, cy - s * 0.6); ctx.lineTo(x, cy + s * 0.8) } else { ctx.moveTo(x - s, cy - s); ctx.lineTo(x + s, cy + s); ctx.moveTo(x + s, cy - s); ctx.lineTo(x - s, cy + s) }
      if (c.pass) ctx.fill()
      else { ctx.strokeStyle = C.red; ctx.lineWidth = 2.5; ctx.stroke(); ctx.lineWidth = 1 }
      if (c.source === 'testbench') { ctx.strokeStyle = C.gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, cy, s + 3, 0, Math.PI * 2); ctx.stroke() }
    }
  }
  // cursor
  if (cursor !== null) {
    const x = xOf(cursor)
    if (x >= gx && x <= xr) {
      ctx.strokeStyle = C.gold
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x + 0.5, AXIS); ctx.lineTo(x + 0.5, H_PX); ctx.stroke()
      const label = fill(W.SAY_CURSOR, { t: timeText(cursor, data) })
      ctx.font = `10px ${C.mono}`
      const w = ctx.measureText(label).width + 10
      const lx = Math.min(xr - w, Math.max(gx, x - w / 2))
      ctx.fillStyle = C.gold
      ctx.fillRect(lx, 3, w, AXIS - 8)
      ctx.fillStyle = '#000'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, lx + 5, AXIS / 2 - 1)
    }
  }
}

// --- loading -----------------------------------------------------------------------------------
function shortNames(signals) {
  // drop the scope every signal shares; keep the rest
  const parts = signals.map((s) => s.name.split('.'))
  let common = 0
  while (parts.every((p) => p.length > common + 1 && p[common] === parts[0][common])) common++
  for (let k = 0; k < signals.length; k++) signals[k].short = parts[k].slice(common).join('.')
}

function setData(parsed, { checks = null, roles = null, demo = null, name = '' } = {}) {
  let rows = parsed.signals
  const total = rows.length
  if (roles) {
    const order = new Map(roles.map((r, k) => [r.name, k]))
    const meta = new Map(roles.map((r) => [r.name, r]))
    rows = rows.filter((s) => order.has(s.name)).sort((a, b) => order.get(a.name) - order.get(b.name))
    for (const s of rows) { s.role = meta.get(s.name).role; s.radix = meta.get(s.name).radix || 'hex' }
  } else {
    for (const s of rows) s.role = s.width === 1 && /(^|[._])(clk|clock)([._]|$)/i.test(s.name.split('.').pop()) ? 'clock' : 'in'
  }
  const max = W.K_MAX_SIGNALS || 400
  const truncated = rows.length > max
  rows = rows.slice(0, max)
  shortNames(rows)
  data = { ...parsed, rows, checks, demo }
  pickedCheck = null
  resize()
  fit()
  cursor = checks?.length ? checks[0].t : Math.round(data.end * 0.4)
  draw()
  demoBtn.setAttribute('aria-pressed', demo ? 'true' : 'false')
  if (demo) {
    source.textContent = fill(W.SAY_DEMO_SOURCE, { spec: demo.spec.path, module: demo.spec.module, iverilog: demo.tools.iverilog })
    const s = demo.summary
    status.textContent = fill(W.SAY_CHECKS_SUMMARY, s)
    status.className = 'tw-status ' + (s.pass === s.total ? 'is-pass' : 'is-fail')
  } else {
    source.textContent = fill(W.SAY_FILE_SOURCE, { name, signals: total, span: timeText(parsed.end, parsed) })
    status.textContent = truncated ? fill(W.SAY_TRUNCATED, { shown: max, total }) : ''
    status.className = 'tw-status'
  }
  renderProvenance(demo)
}

function renderProvenance(demo) {
  prov.replaceChildren()
  prov.hidden = !demo
  if (!demo) return
  const keys = W.SAY_PROV_KEYS || []
  const vals = [demo.spec.path, demo.spec.sha256, demo.compiler.path, demo.compiler.sha256, demo.verilog_sha256, `${demo.testbench.path} (${demo.testbench.sha256})`, demo.tools.iverilog, demo.tools.vvp]
  const dl = el('dl')
  keys.forEach((k, n) => dl.append(el('dt', { text: k }), el('dd', { text: vals[n] ?? '' })))
  const vec = el('ul', {}, demo.vectors.map((v) => el('li', { text: `${v.test}: a = ${v.a}, b = ${v.b}, dot27 = ${v.dot}` })))
  const cmds = el('pre', { text: demo.commands.join('\n') })
  prov.append(el('summary', { text: W.SAY_PROVENANCE }), dl, el('h4', { text: W.SAY_VECTORS }), vec, el('h4', { text: W.SAY_COMMANDS }), cmds)
}

function showError(msg) {
  status.textContent = msg
  status.className = 'tw-status is-fail'
}

async function loadDemo() {
  status.textContent = W.SAY_LOADING
  status.className = 'tw-status'
  try {
    const [vr, jr] = await Promise.all([fetch(new URL(W.K_DEMO_VCD || 'demo.vcd', import.meta.url)), fetch(new URL(W.K_DEMO_JSON || 'demo.json', import.meta.url))])
    if (!vr.ok || !jr.ok) throw new Error(`HTTP ${vr.ok ? jr.status : vr.status}`)
    const [vcd, demo] = await Promise.all([vr.text(), jr.json()])
    const parsed = parseVcd(vcd)
    setData(parsed, { checks: demo.checks, roles: demo.signals, demo })
  } catch (e) {
    showError(fill(W.SAY_ERR_DEMO, { why: e.message }))
  }
}

function readFile(file) {
  if (!file) return
  const maxMb = W.K_MAX_FILE_MB || 64
  if (file.size > maxMb * 1024 * 1024) { showError(fill(W.SAY_ERR_TOO_BIG, { name: file.name, mb: (file.size / 1048576).toFixed(1), max: maxMb })); return }
  status.textContent = fill(W.SAY_READING_FILE, { name: file.name })
  status.className = 'tw-status'
  const r = new FileReader()
  r.onload = () => {
    try { setData(parseVcd(String(r.result)), { name: file.name }) } catch (e) { showError(fill(W.SAY_ERR_VCD, { name: file.name, why: e instanceof VcdError ? e.message : String(e.message || e) })) }
  }
  r.onerror = () => showError(fill(W.SAY_ERR_VCD, { name: file.name, why: String(r.error?.message || r.error) }))
  r.readAsText(file)
}
fileInput.addEventListener('change', () => { readFile(fileInput.files?.[0]); fileInput.value = '' })
const over = (on) => { stage.classList.toggle('is-over', on); drop.classList.toggle('is-over', on) }
for (const ev of ['dragenter', 'dragover']) box.addEventListener(ev, (e) => { e.preventDefault(); over(true) })
for (const ev of ['dragleave', 'dragend']) box.addEventListener(ev, (e) => { if (!box.contains(e.relatedTarget)) over(false) })
box.addEventListener('drop', (e) => { e.preventDefault(); over(false); readFile(e.dataTransfer?.files?.[0]) })

// --- pointer: pan, pinch, tap, hover -----------------------------------------------------------
const pointers = new Map()
let drag = null
let pinch = null
const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }

function pick(p) {
  if (!data) return
  const gx = gutter()
  const ch = checksH()
  if (ch && p.y >= H_PX - ch) {
    let best = null
    let bd = Math.max(16, (W.K_MIN_TARGET_PX || 32) / 2)
    for (const c of data.checks) { const d = Math.abs(xOf(c.t) - p.x); if (d <= bd) { bd = d; best = c } }
    if (best) {
      pickedCheck = best
      cursor = best.t
      status.textContent = fill(W.SAY_CHECK_LINE, { name: best.name, source: best.source === 'spec' ? W.SAY_FROM_SPEC : W.SAY_FROM_TB, verdict: best.pass ? W.SAY_PASS : W.SAY_FAIL, t: timeText(best.t, data), acc: best.acc, expected: best.expected })
      status.className = 'tw-status ' + (best.pass ? 'is-pass' : 'is-fail')
      draw()
      return
    }
  }
  if (p.x >= gx) cursor = Math.max(0, Math.min(data.end, tOf(p.x)))
  const r = Math.floor((p.y - AXIS + view.y) / ROW)
  if (p.y > AXIS && p.y < H_PX - ch && r >= 0 && r < data.rows.length) {
    const s = data.rows[r]
    if (cursor !== null) {
      status.textContent = fill(W.SAY_SIGNAL_LINE, { name: s.name, width: s.width, value: valueText(s, valueAt(s, cursor)), t: timeText(cursor, data) })
      status.className = 'tw-status'
    }
  }
  draw()
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, local(e))
  if (pointers.size === 1) drag = { start: local(e), last: local(e), moved: false }
  else if (pointers.size === 2 && data) {
    const [a, b] = [...pointers.values()]
    pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: view.scale, t: tOf((a.x + b.x) / 2) }
    drag = null
  }
})
canvas.addEventListener('pointermove', (e) => {
  const p = local(e)
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p)
  if (!data) return
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()]
    const mx = (a.x + b.x) / 2
    view.scale = pinch.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.dist)
    clampView()
    view.t0 = pinch.t - (mx - gutter()) / view.scale
    clampView()
    draw()
    return
  }
  if (drag) {
    const dx = p.x - drag.last.x
    const dy = p.y - drag.last.y
    if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 6) drag.moved = true
    if (drag.moved) {
      view.t0 -= dx / view.scale
      view.y -= dy
      clampView()
      draw()
    }
    drag.last = p
    return
  }
  if (e.pointerType === 'mouse' && p.x >= gutter() && p.y > AXIS && p.y < H_PX - checksH()) { cursor = Math.max(0, Math.min(data.end, tOf(p.x))); draw() }
})
const endPointer = (e) => {
  pointers.delete(e.pointerId)
  if (pinch && pointers.size < 2) { pinch = null; drag = null; return }
  if (drag && !drag.moved && e.type === 'pointerup') pick(local(e))
  if (pointers.size === 0) drag = null
}
canvas.addEventListener('pointerup', endPointer)
canvas.addEventListener('pointercancel', endPointer)
canvas.addEventListener('wheel', (e) => {
  if (!data) return
  const p = local(e)
  if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.01), Math.max(gutter(), p.x)); return }
  if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    e.preventDefault()
    view.t0 += (e.shiftKey ? e.deltaY || e.deltaX : e.deltaX) / view.scale
    clampView(); draw(); return
  }
  const content = data.rows.length * ROW
  if (content > rowsH()) {
    const before = view.y
    view.y += e.deltaY
    clampView()
    if (view.y !== before) { e.preventDefault(); draw() }
  }
}, { passive: false })
canvas.addEventListener('keydown', (e) => {
  if (!data) return
  const step = waveW() / view.scale / 10
  if (e.key === '+' || e.key === '=') zoomBy(1.6)
  else if (e.key === '-') zoomBy(1 / 1.6)
  else if (e.key === 'ArrowLeft') { view.t0 -= step; clampView(); draw() }
  else if (e.key === 'ArrowRight') { view.t0 += step; clampView(); draw() }
  else if (e.key === 'ArrowUp') { view.y -= ROW; clampView(); draw() }
  else if (e.key === 'ArrowDown') { view.y += ROW; clampView(); draw() }
  else if (e.key === '0') { fit(); draw() }
  else return
  e.preventDefault()
})

// A width change keeps the visible time span: the same run fits the narrower canvas.
const relayout = () => {
  const span = data && W_PX ? waveW() / view.scale : null
  resize()
  if (data && span) { view.scale = waveW() / span; clampView() }
  draw()
}
new ResizeObserver(relayout).observe(stage)
window.addEventListener('resize', relayout)

loadDemo()
