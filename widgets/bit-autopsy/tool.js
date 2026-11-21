// SPDX-License-Identifier: Apache-2.0
// bit-autopsy tool: what one Xilinx 7-series bitstream says about itself, read in the reader's
// browser. Every word on screen comes from window.T27_WIDGET (specs/widgets/bit-autopsy.t27, SAY_*);
// the numbers it relies on are K_*. Files are read with FileReader and never leave the page.
import { autopsy, IDCODE_MASK } from './autopsy.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const num = (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString('en-US'))
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(2) : '0')

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') el.className = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : String(k))
  return el
}

document.head.append(h('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href }))

const state = { samples: null, geoms: null, parts: null, view: null, name: '' }

async function json(path) {
  const r = await fetch(new URL(path, import.meta.url))
  if (!r.ok) throw new Error(path)
  return r.json()
}

const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
async function sha256(u8) {
  if (!globalThis.crypto?.subtle) return null
  return hex(await crypto.subtle.digest('SHA-256', u8))
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(new Uint8Array(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsArrayBuffer(file)
  })
}

const cssVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
const colors = () => ({
  bg: cssVar('--w-bg', '#000'), green: cssVar('--w-green', '#00ff88'), gold: cssVar('--w-gold', '#ffd700'),
  red: cssVar('--w-red', '#ff4d6d'), text: cssVar('--w-text', '#e8fff7'), muted: cssVar('--w-muted', '#8fa9a0'),
  subtle: cssVar('--w-subtle', '#5f7a71'), line: cssVar('--w-line', '#1d2b27'), mono: cssVar('--w-mono', 'monospace'),
})

// --- layout ---------------------------------------------------------------------------------
const status = h('p', { class: 'ba-status', role: 'status' })
const sampleBtns = (W.SAY_SAMPLE_IDS || []).map((id, i) =>
  h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => showSample(i) }, W.SAY_SAMPLE_NAMES?.[i] ?? id))
const sampleLine = h('p', { class: 'ba-line' })

const input = h('input', { type: 'file', accept: '.bit,.bin,application/octet-stream', class: 'ba-file' })
const dropText = h('span', {}, W.SAY_DROP)
const drop = h('label', { class: 't27-drop ba-drop' }, input, dropText)
input.addEventListener('change', () => takeFile(input.files[0]))
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over') })
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); takeFile(e.dataTransfer?.files?.[0]) })

const out = h('div', { class: 'ba-out' })
const downloadBtn = h('button', { class: 't27-btn ba-go', type: 'button', disabled: true, onclick: () => downloadCard() }, W.SAY_DOWNLOAD)

root.replaceChildren(
  h('section', { class: 'ba-pick' },
    h('div', { class: 'ba-row' }, h('span', { class: 'ba-label' }, W.SAY_SAMPLE_LABEL), sampleBtns),
    sampleLine,
    h('p', { class: 'ba-small' }, W.SAY_SAMPLE_NOTE),
    h('div', { class: 'ba-row' }, h('span', { class: 'ba-label' }, W.SAY_OWN_LABEL)),
    drop,
    h('p', { class: 'ba-small' }, W.SAY_LOCAL_NOTE),
    status),
  out,
  h('section', { class: 'ba-sec ba-share' },
    h('div', { class: 'ba-row' }, downloadBtn),
    h('p', { class: 'ba-small' }, W.SAY_PREVIEW_NOTE),
    h('p', { class: 'ba-small' }, W.SAY_NOT_DECODING)),
)

// --- what the stream says -------------------------------------------------------------------
const partName = (d) => (d ? `${d.model} (${d.family})` : W.SAY_UNKNOWN)
const masked = (code) => (Number(code) & IDCODE_MASK) >>> 0
const onBench = (a) => (a.idcode === null ? null : masked(a.idcode) === masked(W.K_BENCH_IDCODE))

function verdict(a) {
  const lines = []
  let tone = 'is-ok'
  if ((a.refuse || []).includes('nosync')) return h('div', { class: 'ba-verdict is-bad' }, h('h2', {}, state.name))
  if (a.idcode === null) { lines.push(W.SAY_VERDICT_NO_IDCODE); tone = 'is-warn' }
  else if (!a.device) { lines.push(fmt(W.SAY_VERDICT_UNKNOWN, a.idcode)); tone = 'is-warn' }
  else if (!a.header) lines.push(fmt(W.SAY_VERDICT_NO_HEADER, `${partName(a.device)}, ${a.idcode}`))
  else if (a.agree === false) { lines.push(fmt(W.SAY_VERDICT_DISAGREE, a.header.part, `${partName(a.device)}, ${a.idcode}`)); tone = 'is-bad' }
  else lines.push(fmt(W.SAY_VERDICT_AGREE, a.header.part, `${partName(a.device)}, ${a.idcode}`))
  const bench = onBench(a)
  const box = h('div', { class: `ba-verdict ${tone}` },
    h('h2', {}, state.name),
    h('p', {}, lines[0]))
  if (bench !== null) box.append(h('p', { class: bench ? 'ba-bench is-match' : 'ba-bench is-miss' }, bench ? W.SAY_BENCH_MATCH : W.SAY_BENCH_MISMATCH))
  return box
}

function refusals(a) {
  const say = (ids, texts, list, cls) => list.map((id) => h('p', { class: cls }, texts?.[(ids || []).indexOf(id)] ?? id))
  return [
    ...say(W.SAY_REFUSE_IDS, W.SAY_REFUSE_TEXT, a.refuse || [], 'ba-refuse'),
    ...say(W.SAY_WARN_IDS, W.SAY_WARN_TEXT, a.warnings || [], 'ba-warn'),
  ]
}

function tiles(a) {
  const t = W.SAY_STATS || []
  const items = [
    [t[0], num(a.bytes), ''],
    [t[1], fmt(W.SAY_PERCENT, pct(a.zeroBytes, a.bytes)), fmt(W.SAY_OF, num(a.zeroBytes), num(a.bytes))],
    [t[2], num(a.configFrames), ''],
    [t[3], num(a.nonzeroFrames), fmt(W.SAY_PERCENT, pct(a.nonzeroFrames, a.configFrames))],
    [t[4], num(a.ones), ''],
    [t[5], a.packets ? `${num(a.packets.cmd)}, ${num(a.packets.crc)}` : '-', ''],
  ]
  return h('dl', { class: 'ba-tiles' }, items.map(([k, v, s]) => h('div', {}, h('dt', {}, k), h('dd', {}, v), s ? h('dd', { class: 'ba-sub' }, s) : null)))
}

function headerTable(a) {
  const f = W.SAY_FIELDS || []
  const hd = a.header
  const rows = [
    [f[0], state.name],
    [f[1], num(a.bytes)],
    [f[2], a.sha256 || '-'],
    [f[3], hd ? hd.design : W.SAY_NO_HEADER],
    [f[4], hd ? hd.part : '-'],
    [f[5], hd ? hd.date : '-'],
    [f[6], hd ? hd.time : '-'],
    [f[7], hd ? fmt(a.headerLengthOk ? W.SAY_LENGTH_OK : W.SAY_LENGTH_BAD, num(hd.length)) : '-'],
    [f[8], a.sync >= 0 ? num(a.sync) : '-'],
    [f[9], a.idcode ?? '-'],
    [f[10], a.idcode === null ? '-' : partName(a.device)],
    [f[11], a.mapped ? fmt(W.SAY_LAYOUT_MAPPED, a.geometry) : W.SAY_LAYOUT_STREAM],
  ]
  return h('section', { class: 'ba-sec' },
    h('h3', {}, W.SAY_HEADER_TITLE),
    h('div', { class: 'ba-scroll' }, h('table', { class: 'ba-table' },
      h('thead', {}, h('tr', {}, h('th', {}, W.SAY_COL_FIELD), h('th', {}, W.SAY_COL_VALUE))),
      h('tbody', {}, rows.map(([k, v]) => h('tr', {}, h('th', {}, k), h('td', {}, v)))))))
}

function bandName(b) {
  if (b.block === null) return W.SAY_STREAM_BAND
  return `${W.SAY_BLOCKS_SHORT?.[b.block] ?? b.block} ${W.SAY_HALVES?.[b.bottom] ?? b.bottom} ${b.row}`
}

// One band per row: '-' no frame there, '0' all zero, '1'..'9' share of non-zero frames.
function drawStrip(ctx, strip, x, y, w, bandH, gap, labelW, c, font) {
  ctx.font = font
  ctx.textBaseline = 'middle'
  strip.forEach((b, i) => {
    const by = y + i * (bandH + gap)
    ctx.fillStyle = c.muted
    ctx.textAlign = 'left'
    ctx.fillText(bandName(b), x, by + bandH / 2)
    const cw = (w - labelW) / b.cells.length
    for (let j = 0; j < b.cells.length; j++) {
      const ch = b.cells[j]
      if (ch === '-') { ctx.fillStyle = c.line; ctx.globalAlpha = 0.5 }
      else if (ch === '0') { ctx.fillStyle = c.green; ctx.globalAlpha = 0.16 }
      else { ctx.fillStyle = c.gold; ctx.globalAlpha = 0.35 + (0.65 * Number(ch)) / 9 }
      ctx.fillRect(x + labelW + j * cw, by, Math.max(1, cw - 0.4), bandH)
    }
    ctx.globalAlpha = 1
  })
}

function mapSection(a) {
  if (!a.strip?.length) return null
  const cv = h('canvas', { class: 'ba-map', role: 'img', 'aria-label': W.SAY_MAP_LINE })
  const draw = () => {
    const c = colors()
    const cssW = Math.max(280, cv.clientWidth || 600)
    const narrow = cssW < 480
    const bandH = narrow ? 12 : 16, gap = 3, labelW = narrow ? 66 : 92
    const cssH = a.strip.length * (bandH + gap)
    const dpr = window.devicePixelRatio || 1
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr)
    cv.style.height = cssH + 'px'
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    drawStrip(ctx, a.strip, 0, 0, cssW, bandH, gap, labelW, c, `${narrow ? 9 : 11}px ${c.mono}`)
  }
  requestAnimationFrame(draw)
  new ResizeObserver(() => draw()).observe(cv)
  const lg = W.SAY_LEGEND || []
  return h('section', { class: 'ba-sec' },
    h('h3', {}, W.SAY_MAP_TITLE),
    h('p', { class: 'ba-small' }, W.SAY_MAP_LINE),
    cv,
    h('div', { class: 'ba-legend' }, h('span', {}, h('i', { class: 'c0' }), lg[0]), h('span', {}, h('i', { class: 'c1' }), lg[1]), h('span', {}, h('i', { class: 'c2' }), lg[2])),
    (a.blocks || []).map((b) => h('p', { class: 'ba-small' }, fmt(W.SAY_BLOCK_LINE, W.SAY_BLOCKS_SHORT?.[b.block] ?? b.block, num(b.nonzero), num(b.frames)))))
}

function packetSection(a) {
  if (!a.packets) return null
  const f = W.SAY_PACKET_FIELDS || []
  const p = a.packets
  const vals = [p.type1, p.type2, p.nop, p.writes, p.cmd, p.crc, p.far, p.fdri]
  return h('section', { class: 'ba-sec' },
    h('h3', {}, W.SAY_PACKETS_TITLE),
    h('dl', { class: 'ba-pk' }, vals.map((v, i) => h('div', {}, h('dt', {}, f[i]), h('dd', {}, num(v))))),
    a.commands?.length ? h('p', { class: 'ba-cmds' }, h('span', { class: 'ba-label' }, W.SAY_COMMANDS), ' ', a.commands.join(' > ')) : null)
}

function render(a) {
  state.view = a
  const ok = !(a.refuse || []).length
  out.replaceChildren(
    verdict(a),
    ...refusals(a),
    ok ? tiles(a) : null,
    ok ? mapSection(a) : null,
    headerTable(a),
    packetSection(a),
  )
  downloadBtn.disabled = false
}

// --- samples and files ----------------------------------------------------------------------
function press(i) { sampleBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j))) }

function showSample(i) {
  const id = W.SAY_SAMPLE_IDS?.[i]
  const s = state.samples?.find((x) => x.id === id)
  if (!s) { status.textContent = W.SAY_ERR_DATA; return }
  press(i)
  sampleLine.textContent = W.SAY_SAMPLE_LINES?.[i] ?? ''
  status.textContent = ''
  state.name = (s.from?.path || s.from?.file || s.id).split('/').pop()
  render(s)
}

async function takeFile(f) {
  if (!f) return
  press(-1)
  sampleLine.textContent = ''
  status.textContent = fmt(W.SAY_READING, f.name)
  try {
    const u8 = await readFile(f)
    await new Promise((r) => setTimeout(r, 0))
    const a = autopsy(u8, { geoms: state.geoms || [], parts: state.parts || [], buckets: W.K_STRIP_BUCKETS || 160 })
    a.sha256 = await sha256(u8)
    state.name = f.name
    status.textContent = ''
    render(a)
  } catch {
    status.textContent = fmt(W.SAY_ERR_READ, f.name)
  }
  input.value = ''
}

// --- the card -------------------------------------------------------------------------------
function drawCard() {
  const a = state.view
  const c = colors()
  const Wd = W.K_CARD_W || 1200, Ht = W.K_CARD_H || 630
  const cv = document.createElement('canvas')
  cv.width = Wd; cv.height = Ht
  const ctx = cv.getContext('2d')
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, Wd, Ht)
  const font = (w, px) => `${w} ${px}px ${c.mono}`
  ctx.textBaseline = 'alphabetic'
  // brand
  ctx.fillStyle = c.gold
  ctx.beginPath(); ctx.moveTo(48, 48); ctx.lineTo(76, 48); ctx.lineTo(62, 70); ctx.closePath(); ctx.fill()
  ctx.font = font(700, 24); ctx.fillText(W.SAY_BRAND, 88, 68)
  ctx.textAlign = 'right'; ctx.fillStyle = c.muted; ctx.font = font(400, 20)
  ctx.fillText(W.SAY_CARD_TITLE, Wd - 48, 68)
  ctx.textAlign = 'left'
  // file
  ctx.fillStyle = '#fff'; ctx.font = font(800, 46)
  ctx.fillText(fit(ctx, state.name, Wd - 96), 48, 140)
  const refused = (a.refuse || []).length
  let y = 190
  if (refused) {
    ctx.fillStyle = c.red; ctx.font = font(700, 26)
    for (const line of wrap(ctx, refusals(a)[0]?.textContent || '', Wd - 96).slice(0, 3)) { ctx.fillText(line, 48, y); y += 36 }
  } else {
    ctx.font = font(400, 24); ctx.fillStyle = c.text
    ctx.fillText(fit(ctx, fmt(W.SAY_CARD_PARTS, a.header?.part ?? W.SAY_NO_HEADER, a.idcode ? `${a.idcode} ${a.device?.model ?? W.SAY_UNKNOWN}` : W.SAY_UNKNOWN), Wd - 96), 48, y)
    y += 38
    if (a.agree !== null) {
      ctx.fillStyle = a.agree ? c.green : c.red; ctx.font = font(700, 24)
      ctx.fillText(W.SAY_CARD_AGREE?.[a.agree ? 0 : 1] ?? '', 48, y); y += 36
    }
    const bench = onBench(a)
    if (bench !== null) {
      ctx.fillStyle = bench ? c.green : c.gold; ctx.font = font(700, 26)
      ctx.fillText(fit(ctx, W.SAY_CARD_BENCH?.[bench ? 0 : 1] ?? '', Wd - 96), 48, y); y += 36
    }
  }
  // stats
  const t = W.SAY_STATS || []
  const stats = [
    [t[0], num(a.bytes)],
    [t[1], fmt(W.SAY_PERCENT_SHORT, pct(a.zeroBytes, a.bytes))],
    [t[2], num(a.configFrames)],
    [t[3], num(a.nonzeroFrames)],
  ]
  const sy = 330, sw = (Wd - 96) / stats.length
  stats.forEach(([k, v], i) => {
    const x = 48 + i * sw
    ctx.fillStyle = c.gold; ctx.font = font(800, 38); ctx.fillText(fit(ctx, v, sw - 16), x, sy)
    ctx.fillStyle = c.muted; ctx.font = font(400, 17); ctx.fillText(fit(ctx, k, sw - 16), x, sy + 28)
  })
  // strip
  if (!refused && a.strip?.length) {
    const n = a.strip.length
    const top = 392, bottom = Ht - 70, gap = 3
    const bandH = Math.min(22, (bottom - top - gap * (n - 1)) / n)
    drawStrip(ctx, a.strip, 48, top, Wd - 96, bandH, gap, 120, c, font(400, Math.min(15, bandH)))
  }
  ctx.fillStyle = c.subtle; ctx.font = font(400, 17); ctx.textAlign = 'left'
  ctx.fillText(fit(ctx, W.SAY_CARD_FOOT, Wd - 96), 48, Ht - 32)
  return cv
}

function fit(ctx, s, w) {
  s = String(s ?? '')
  if (ctx.measureText(s).width <= w) return s
  while (s.length > 1 && ctx.measureText(s + '...').width > w) s = s.slice(0, -1)
  return s + '...'
}

function wrap(ctx, s, w) {
  const out = []
  let line = ''
  for (const word of String(s).split(' ')) {
    const t = line ? line + ' ' + word : word
    if (ctx.measureText(t).width > w && line) { out.push(line); line = word } else line = t
  }
  if (line) out.push(line)
  return out
}

function downloadCard() {
  if (!state.view) return
  const cv = drawCard()
  cv.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = h('a', { href: url, download: `bit-autopsy-${state.name.replace(/[^A-Za-z0-9._-]+/g, '_')}.png` })
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}

// --- start ----------------------------------------------------------------------------------
Promise.all([json('./samples.json'), json('./geometry.json'), json('./parts.json')])
  .then(([s, g, p]) => {
    state.samples = s.samples
    state.geoms = g
    state.parts = p.fpga
    showSample(0)
  })
  .catch(() => { status.textContent = W.SAY_ERR_DATA })
