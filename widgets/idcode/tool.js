// idcode/tool.js -- a JTAG IDCODE taken apart and looked up the way openFPGALoader does it.
// Every word is a SAY_ constant from specs/widgets/idcode.t27 (window.T27_WIDGET); every number is a
// K_ constant there or a row of ./parts.json (openFPGALoader v1.1.1 src/part.hpp, extracted by
// scripts/widget-data/idcode.mjs). Reads only ./parts.json and ./tool.css; calls no other host. The
// code the reader types stays in this tab and in the URL hash.
const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.appendChild(css)

// --- small helpers ------------------------------------------------------------------------
const fill = (s, ...v) => String(s ?? '').replace(/\{(\d+)\}/g, (m, i) => (i < v.length ? String(v[i]) : m))
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue
    if (k === 'class') n.className = v
    else n.setAttribute(k, v)
  }
  for (const c of kids.flat()) if (c != null) n.append(c instanceof Node ? c : String(c))
  return n
}
const hexN = (v, digits) => '0x' + (v >>> 0).toString(16).padStart(digits, '0')
const hex8 = (v) => hexN(v, 8)
const printf_x = (v) => (v >>> 0).toString(16) // C's %x: no padding
const SAY = (k, i) => (Array.isArray(W[k]) ? W[k][i] : W[k]) ?? ''

const LSB = W.K_FIELD_LSB || [28, 12, 1, 0]
const WIDTH = W.K_FIELD_WIDTH || [4, 16, 11, 1]
const FIELD_CLASS = ['idc-f-ver', 'idc-f-part', 'idc-f-mfr', 'idc-f-one']
const CODE_BITS = W.K_MFR_CODE_BITS ?? 7
const MASK = W.K_VERSION_MASK ?? 0x0fffffff
const fieldOf = (bit) => LSB.findIndex((l, i) => bit >= l && bit < l + WIDTH[i])
const field = (code, i) => Math.floor((code >>> 0) / 2 ** LSB[i]) % 2 ** WIDTH[i]

// --- the table ----------------------------------------------------------------------------
let table = null // { fpga: Map, misc: Map, mfr: Map, shadowed: [], data }
function indexTable(d) {
  const num = (h) => parseInt(h, 16) >>> 0
  return {
    data: d,
    fpga: new Map(d.fpga.map((r) => [num(r[0]), r])),
    misc: new Map(d.misc.map((r) => [num(r[0]), r])),
    mfr: new Map(d.manufacturers.map((r) => [num(r[0]), r[1]])),
    shadowed: d.shadowed.map((r) => [num(r[0]), r]),
  }
}

// openFPGALoader v1.1.1 src/jtag.cpp: the full IDCODE first, then with the version masked; for each
// key fpga_list before misc_dev_list. It keeps the KEY it matched, which is what --detect prints.
function lookup(code) {
  if (!table) return null
  for (const key of [code >>> 0, (code & MASK) >>> 0]) {
    if (table.fpga.has(key)) return { kind: 'fpga', key, row: table.fpga.get(key), masked: key !== code >>> 0 }
    if (table.misc.has(key)) return { kind: 'misc', key, row: table.misc.get(key), masked: key !== code >>> 0 }
  }
  return { kind: 'none' }
}

// Reads a code out of whatever was typed or pasted: openFPGALoader's raw line (- 0 -> 0x13636093)
// first, then the first 0x word, then a bare run of up to eight hex digits.
function parseCode(text) {
  const t = String(text ?? '')
  const raw = [...t.matchAll(/->\s*0x([0-9a-f]{1,8})\b/gi)].map((m) => parseInt(m[1], 16) >>> 0).find((v) => v !== 0xffffffff)
  if (raw != null) return raw
  const ox = t.match(/0x([0-9a-f]{1,8})\b/i)
  if (ox) return parseInt(ox[1], 16) >>> 0
  const bare = t.replace(/[\s_]/g, '')
  if (/^[0-9a-f]{1,8}$/i.test(bare)) return parseInt(bare, 16) >>> 0
  return null
}

function codeFromHash() {
  const m = location.hash.match(new RegExp(`[#&]${W.K_HASH_KEY || 'id'}=([^&]+)`))
  return m ? parseCode(decodeURIComponent(m[1])) : null
}
const shareUrl = (code) => `${location.origin}${location.pathname}#${W.K_HASH_KEY || 'id'}=${hex8(code)}`

// --- state --------------------------------------------------------------------------------
let code = codeFromHash() ?? (W.K_TABLE_IDCODE >>> 0)

// --- the page -----------------------------------------------------------------------------
const input = el('input', { id: 'idc-input', class: 'idc-input', type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: W.SAY_INPUT_PLACEHOLDER })
const inputMsg = el('p', { class: 'idc-msg', role: 'status' })
const presets = el('div', { class: 'idc-presets' })
const bits = el('div', { class: 'idc-bits', role: 'group', 'aria-label': W.SAY_BITS_LABEL })
const legend = el('div', { class: 'idc-legend' })
const result = el('section', { class: 'idc-card', 'aria-live': 'polite' })
const shareMsg = el('span', { class: 'idc-share-msg', role: 'status' })
const bench = el('section', { class: 'idc-bench' })
const credit = el('p', { class: 'idc-credit' }, W.SAY_LOADING)

const bitButtons = []
for (let b = 31; b >= 0; b--) {
  const f = fieldOf(b)
  const btn = el('button', { type: 'button', class: `idc-bit ${FIELD_CLASS[f]}${b % 4 === 3 && b !== 31 ? ' idc-nib' : ''}`, 'data-bit': String(b), title: fill(W.SAY_BIT_TITLE, b, SAY('SAY_FIELD_NAMES', f)) },
    el('span', { class: 'idc-bit-ix' }, String(b)), el('span', { class: 'idc-bit-v' }, '0'))
  btn.addEventListener('click', () => set((code ^ (2 ** b)) >>> 0, true))
  bitButtons[b] = btn
  bits.append(btn)
}
for (let i = 0; i < 4; i++) legend.append(el('span', { class: `idc-chip ${FIELD_CLASS[i]}` }, `${SAY('SAY_FIELD_NAMES', i)} ${SAY('SAY_FIELD_BITS', i)}`))

const copyBtn = el('button', { type: 'button', class: 't27-btn' }, W.SAY_COPY_LINK)
const saveBtn = el('button', { type: 'button', class: 't27-btn' }, W.SAY_SAVE_CARD)
copyBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(shareUrl(code)); shareMsg.textContent = W.SAY_COPIED } catch { shareMsg.textContent = W.SAY_COPY_FAILED }
})
saveBtn.addEventListener('click', saveCard)

input.addEventListener('input', () => {
  const v = parseCode(input.value)
  if (v == null) { inputMsg.textContent = input.value.trim() ? W.SAY_BAD_INPUT : ''; return }
  inputMsg.textContent = ''
  set(v, false)
})
window.addEventListener('hashchange', () => { const v = codeFromHash(); if (v != null && v !== code) set(v, true) })

root.replaceChildren(
  el('div', { class: 'idc-form' },
    el('label', { class: 'idc-label', for: 'idc-input' }, W.SAY_INPUT_LABEL), input, inputMsg),
  el('div', { class: 'idc-presets-row' }, el('span', { class: 'idc-label' }, W.SAY_PRESETS_LABEL), presets),
  el('p', { class: 'idc-hint' }, W.SAY_BITS_LABEL),
  bits, legend, result,
  el('div', { class: 'idc-share' }, copyBtn, saveBtn, shareMsg),
  bench, credit)

function presetButton(label, value, title) {
  const b = el('button', { type: 'button', class: 't27-btn', 'data-code': String(value >>> 0), title }, label)
  b.addEventListener('click', () => set(value >>> 0, true))
  return b
}
function drawPresets() {
  const list = [presetButton(W.SAY_BENCH_PRESET, W.K_BENCH_RAW_IDCODE, hex8(W.K_BENCH_RAW_IDCODE)), presetButton(W.SAY_TABLE_PRESET, W.K_TABLE_IDCODE, hex8(W.K_TABLE_IDCODE))]
  for (const [board, part, hex] of table?.data.presets ?? []) list.push(presetButton(board, parseInt(hex, 16), fill(W.SAY_PRESET_TITLE, board, part)))
  presets.replaceChildren(...list)
}

// --- one code, decoded --------------------------------------------------------------------
function decode(c) {
  const v = [0, 1, 2, 3].map((i) => field(c, i))
  const mfr = v[2]
  const cont = Math.floor(mfr / 2 ** CODE_BITS)
  const id = mfr % 2 ** CODE_BITS
  const mfrName = table?.mfr.get(mfr) ?? null
  return { c, v, mfr, cont, id, bank: cont + 1, mfrName, hit: lookup(c) }
}

function set(c, writeInput) {
  code = c >>> 0
  if (writeInput) { input.value = hex8(code); inputMsg.textContent = '' }
  history.replaceState(null, '', shareUrl(code))
  shareMsg.textContent = ''
  draw()
}

function row(cells, cls) { return el('tr', { class: cls }, cells.map((c, i) => el(i === 0 ? 'th' : 'td', { scope: i === 0 ? 'row' : null }, c))) }

function draw() {
  const d = decode(code)
  for (let b = 0; b < 32; b++) {
    const on = Math.floor(code / 2 ** b) % 2 === 1
    bitButtons[b].setAttribute('aria-pressed', on ? 'true' : 'false')
    bitButtons[b].lastChild.textContent = on ? '1' : '0'
    bitButtons[b].classList.toggle('idc-bad', b === 0 && !on)
  }
  for (const b of presets.children) b.setAttribute('aria-pressed', Number(b.dataset.code) === code ? 'true' : 'false')

  const digits = [1, 4, 3, 1]
  const fields = el('table', { class: 'idc-fields' },
    el('thead', {}, el('tr', {}, (W.SAY_COL_HEAD || []).map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, [0, 1, 2, 3].map((i) => row([SAY('SAY_FIELD_NAMES', i), SAY('SAY_FIELD_BITS', i), i === 3 ? String(d.v[3]) : hexN(d.v[i], digits[i]), String(d.v[i])], FIELD_CLASS[i]))))
  const mfrLines = [
    el('p', { class: 'idc-line idc-f-mfr' }, fill(W.SAY_BANK_LINE, d.bank, d.cont, hexN(d.id, 2))),
    el('p', { class: 'idc-line' }, d.mfrName ? fill(W.SAY_MFR_KNOWN, d.mfrName) : fill(W.SAY_MFR_UNKNOWN, d.bank, hexN(d.id, 2)))]
  const special = code === (W.K_STUCK_LOW >>> 0) ? W.SAY_STUCK_LOW : code === (W.K_END_OF_CHAIN >>> 0) ? W.SAY_END_OF_CHAIN : null
  const bit0 = el('p', { class: `idc-line ${d.v[3] === 1 ? 'idc-ok' : 'idc-warn'}` }, d.v[3] === 1 ? W.SAY_BIT0_OK : fill(W.SAY_BIT0_BAD, hex8(code >>> 1)))

  result.replaceChildren(
    el('div', { class: 'idc-card-head' },
      el('p', { class: 'idc-big' }, hex8(code)),
      el('p', { class: 'idc-model' }, d.hit?.kind === 'fpga' ? `${d.hit.row[3]} \u00b7 ${d.hit.row[2]}` : d.hit?.kind === 'misc' ? d.hit.row[1] : d.hit ? W.SAY_CARD_NONE : '')),
    ...[fields, ...mfrLines, bit0,
      special ? el('p', { class: 'idc-line idc-warn' }, special) : null,
      deviceBlock(d), detectBlock(d)].filter(Boolean))
}

function deviceBlock(d) {
  const h = d.hit
  if (!h) return null
  const out = el('div', { class: 'idc-device' }, el('h3', {}, W.SAY_DEVICE_TITLE))
  if (h.kind === 'none') { out.append(el('p', { class: 'idc-line' }, W.SAY_MATCH_NONE)); return out }
  const dl = el('dl', {})
  const pairs = h.kind === 'fpga'
    ? [[0, h.row[1]], [1, h.row[2]], [2, h.row[3]], [3, String(h.row[4])], [4, h.row[0]]].map(([i, v]) => [SAY('SAY_DEVICE_FIELDS', i), v])
    : [[0, h.row[1]], [1, String(h.row[2])], [2, h.row[0]]].map(([i, v]) => [SAY('SAY_MISC_FIELDS', i), v])
  for (const [k, v] of pairs) dl.append(el('dt', {}, k), el('dd', {}, v))
  out.append(el('p', { class: 'idc-line' }, h.kind === 'misc' ? W.SAY_MATCH_MISC : h.masked ? fill(W.SAY_MATCH_MASKED, h.row[0]) : W.SAY_MATCH_EXACT), dl)
  if (h.kind === 'fpga') {
    // The row's own manufacturer against what its key's manufacturer bits say.
    const keyMfr = field(h.key, 2)
    const named = table.mfr.get(keyMfr)
    if (!named || !named.toLowerCase().includes(h.row[1].toLowerCase())) out.append(el('p', { class: 'idc-line idc-warn' }, fill(W.SAY_MFR_MISMATCH, h.row[1], named ?? hexN(keyMfr, 3))))
    for (const [k, r] of table.shadowed) if (k === h.key) out.append(el('p', { class: 'idc-line idc-warn' }, fill(W.SAY_SHADOWED, r[3])))
  }
  return out
}

function detectBlock(d) {
  const h = d.hit
  // All zeros and all ones never reach the lookup: jtag.cpp stops on them first (said above).
  if (!h || code === (W.K_STUCK_LOW >>> 0) || code === (W.K_END_OF_CHAIN >>> 0)) return null
  let lines
  if (h.kind === 'fpga') lines = [printf_x(h.key), h.row[1], h.row[2], h.row[3], h.row[4]].map((v, i) => fill(SAY('SAY_DETECT_FPGA', i), v))
  else if (h.kind === 'misc') lines = [printf_x(h.key), h.row[1], h.row[2]].map((v, i) => fill(SAY('SAY_DETECT_MISC', i), v))
  else {
    // jtag.cpp's message for an unknown code: %08x, %03x, list_manufacturer[mfg] ("" when absent),
    // IDCODE2PART = bits [27:21] as %02x, IDCODE2VERS as %x.
    const part7 = Math.floor(code / 2 ** 21) % 128
    lines = [fill(W.SAY_DETECT_NONE, (code >>> 0).toString(16).padStart(8, '0'), d.mfr.toString(16).padStart(3, '0'), d.mfrName ?? '', part7.toString(16).padStart(2, '0'), d.v[0].toString(16))]
  }
  return el('div', { class: 'idc-detect' },
    el('h3', {}, W.SAY_DETECT_TITLE),
    el('pre', {}, lines.join('\n')),
    el('p', { class: 'idc-line idc-muted' }, W.SAY_DETECT_NOTE))
}

function drawBench() {
  const b = table?.data.bench
  const kids = [el('h3', {}, W.SAY_BENCH_TITLE)]
  if (b) {
    const raw = parseInt(b.raw[0], 16) >>> 0
    const printed = parseInt(b.printed[0], 16) >>> 0
    kids.push(el('p', { class: 'idc-line' }, fill(W.SAY_BENCH_LINE, b.date.replace('T', ' '), hex8(raw), Math.floor(raw / 2 ** 28), b.tool.replace(/^openFPGALoader\s*/, ''), `0x${printf_x(printed)}`)))
  }
  kids.push(el('p', { class: 'idc-line idc-muted' }, fill(W.SAY_BENCH_EARLIER, W.K_BENCH_BOARDS_2026_08_17)))
  bench.replaceChildren(...kids)
}

// --- the card the reader can save ---------------------------------------------------------
function saveCard() {
  const d = decode(code)
  const Wd = W.K_CARD_WIDTH || 1200
  const Ht = W.K_CARD_HEIGHT || 630
  const cv = el('canvas', { width: String(Wd), height: String(Ht) })
  const g = cv.getContext('2d')
  const cs = getComputedStyle(document.documentElement)
  const col = (v, f) => cs.getPropertyValue(v).trim() || f
  const mono = col('--w-mono', 'monospace')
  const green = col('--w-green', '#00ff88'), gold = col('--w-gold', '#ffd700'), text = col('--w-text', '#e8fff7'), muted = col('--w-subtle', '#8fa9a0'), red = col('--w-red', '#ff4d6d')
  const blue = '#6cb6ff'
  const fieldCol = [gold, green, blue, text]
  g.fillStyle = '#000'; g.fillRect(0, 0, Wd, Ht)
  g.fillStyle = green; g.font = `700 26px ${mono}`; g.textBaseline = 'top'
  g.beginPath(); g.moveTo(60, 52); g.lineTo(84, 52); g.lineTo(72, 72); g.closePath(); g.fill()
  g.fillText(String(W.SAY_CARD_BRAND).replace(/\bS3AI\b/, 'S\u00b3AI'), 98, 48)
  g.textAlign = 'right'; g.fillStyle = muted; g.font = `22px ${mono}`; g.fillText(W.SAY_CARD_TITLE, Wd - 60, 52)
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `800 92px ${mono}`; g.fillText(hex8(code), 60, 104)
  const model = d.hit?.kind === 'fpga' ? `${d.hit.row[3]} \u00b7 ${d.hit.row[2]} \u00b7 ${SAY('SAY_DEVICE_FIELDS', 3)} ${d.hit.row[4]}` : d.hit?.kind === 'misc' ? d.hit.row[1] : W.SAY_CARD_NONE
  g.fillStyle = d.hit && d.hit.kind !== 'none' ? green : muted; g.font = `700 30px ${mono}`; g.fillText(model, 60, 214)
  // 32 bit cells
  const x0 = 60, cw = (Wd - 120) / 32, y0 = 290, ch = 70
  for (let b = 31; b >= 0; b--) {
    const i = 31 - b, f = fieldOf(b), on = Math.floor(code / 2 ** b) % 2 === 1
    const x = x0 + i * cw
    g.fillStyle = on ? fieldCol[f] : '#0b1210'
    g.globalAlpha = on ? 0.9 : 1
    g.fillRect(x + 2, y0, cw - 4, ch)
    g.globalAlpha = 1
    g.strokeStyle = b === 0 && !on ? red : fieldCol[f]; g.lineWidth = 2; g.strokeRect(x + 2, y0, cw - 4, ch)
    g.fillStyle = on ? '#000' : fieldCol[f]; g.font = `700 28px ${mono}`; g.textAlign = 'center'; g.fillText(on ? '1' : '0', x + cw / 2, y0 + 20)
    g.fillStyle = muted; g.font = `14px ${mono}`; g.fillText(String(b), x + cw / 2, y0 + ch + 8)
  }
  // field captions under their bits
  const digits = [1, 4, 3, 1]
  for (let f = 0; f < 4; f++) {
    const left = x0 + (31 - (LSB[f] + WIDTH[f] - 1)) * cw, right = x0 + (32 - LSB[f]) * cw
    g.strokeStyle = fieldCol[f]; g.lineWidth = 2; g.beginPath(); g.moveTo(left + 4, y0 + ch + 34); g.lineTo(right - 4, y0 + ch + 34); g.stroke()
    g.textAlign = f === 3 ? 'right' : 'center'
    const cx = f === 3 ? right : (left + right) / 2
    g.fillStyle = fieldCol[f]; g.font = `700 22px ${mono}`
    g.fillText(f === 3 ? String(d.v[3]) : hexN(d.v[f], digits[f]), cx, y0 + ch + 44)
    g.fillStyle = muted; g.font = `16px ${mono}`
    if (f !== 3) g.fillText(SAY('SAY_FIELD_NAMES', f), cx, y0 + ch + 72)
  }
  g.textAlign = 'left'; g.fillStyle = text; g.font = `22px ${mono}`
  g.fillText(`${fill(W.SAY_BANK_LINE, d.bank, d.cont, hexN(d.id, 2))}${d.mfrName ? ' \u00b7 ' + d.mfrName : ''}`, 60, 500)
  g.fillStyle = d.v[3] === 1 ? muted : red; g.font = `18px ${mono}`
  const b0 = d.v[3] === 1 ? W.SAY_BIT0_OK : fill(W.SAY_BIT0_BAD, hex8(code >>> 1))
  g.fillText(b0.length > 92 ? b0.slice(0, 89) + '...' : b0, 60, 534)
  g.fillStyle = green; g.font = `20px ${mono}`; g.fillText(fill(W.SAY_CARD_URL, hex8(code)), 60, 580)
  cv.toBlob((blob) => {
    if (!blob) return
    const a = el('a', { href: URL.createObjectURL(blob), download: `${W.ID || 'idcode'}-${hex8(code)}.png` })
    document.body.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }, 'image/png')
}

// --- start ----------------------------------------------------------------------------------
input.value = hex8(code)
drawPresets()
drawBench()
set(code, false)
fetch(new URL(W.K_DATA_FILE || './parts.json', import.meta.url), { credentials: 'omit' })
  .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
  .then((d) => {
    table = indexTable(d)
    const s = d.source
    credit.textContent = fill(W.SAY_CREDIT, s.tag, s.commit.slice(0, 12), d.fpga.length, d.misc.length, d.manufacturers.length)
    drawPresets(); drawBench(); draw()
  })
  .catch(() => { credit.textContent = W.SAY_LOAD_FAILED })
