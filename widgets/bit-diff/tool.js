// SPDX-License-Identifier: Apache-2.0
// bit-diff tool: two 7-series bitstreams compared frame by frame in the reader's browser.
// Every word on screen comes from window.T27_WIDGET (specs/widgets/bit-diff.t27, SAY_*);
// the numbers it relies on are K_*. Files are read with FileReader and never leave the page.
import { compareBitstreams, lineDiff } from './bitparse.js'

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => String(t ?? '').replace(/\{(\d+)\}/g, (_, i) => String(v[+i] ?? ''))
const num = (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString('en-US'))

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

const css = h('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href })
document.head.append(css)

const state = { demo: null, geoms: null, files: [null, null], view: null, busy: false, packetsOpen: false, which: 0 }

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

const pause = () => new Promise((r) => setTimeout(r, 0))

// --- layout ---------------------------------------------------------------------------------
const status = h('p', { class: 'bd-status', role: 'status' })
const demoBtns = (W.SAY_DEMO_IDS || []).map((id, i) =>
  h('button', { class: 't27-btn', type: 'button', 'aria-pressed': 'false', onclick: () => showDemo(i) }, W.SAY_DEMO_NAMES?.[i] ?? id))
const demoLine = h('p', { class: 'bd-line' })

function dropZone(slot) {
  const input = h('input', { type: 'file', accept: '.bit,.bin,application/octet-stream', class: 'bd-file' })
  const text = h('span', {}, slot ? W.SAY_DROP_B : W.SAY_DROP_A)
  const zone = h('label', { class: 't27-drop bd-drop' }, input, text)
  const take = (f) => {
    if (!f) return
    state.files[slot] = f
    text.textContent = fmt(W.SAY_PICKED, f.name, num(f.size))
    zone.classList.add('is-set')
    compareBtn.disabled = !(state.files[0] && state.files[1])
  }
  input.addEventListener('change', () => take(input.files[0]))
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-over') })
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'))
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('is-over')
    const fs = [...(e.dataTransfer?.files || [])]
    if (fs.length >= 2 && !state.files[0] && !state.files[1]) { dropA.take(fs[0]); dropB.take(fs[1]) } else take(fs[0])
  })
  const reset = () => { state.files[slot] = null; input.value = ''; text.textContent = slot ? W.SAY_DROP_B : W.SAY_DROP_A; zone.classList.remove('is-set') }
  return { zone, take, reset }
}
const compareBtn = h('button', { class: 't27-btn bd-go', type: 'button', disabled: true, onclick: () => compareOwn() }, W.SAY_COMPARE)
const dropA = dropZone(0)
const dropB = dropZone(1)
const clearBtn = h('button', { class: 't27-btn', type: 'button', onclick: () => { dropA.reset(); dropB.reset(); compareBtn.disabled = true; status.textContent = '' } }, W.SAY_CLEAR)

const out = h('div', { class: 'bd-out' })

root.append(
  h('section', { class: 'bd-pick' },
    h('div', { class: 'bd-row' }, h('span', { class: 'bd-label' }, W.SAY_DEMO_LABEL), ...demoBtns),
    demoLine,
    h('div', { class: 'bd-row' }, h('span', { class: 'bd-label' }, W.SAY_OWN_LABEL)),
    h('div', { class: 'bd-drops' }, dropA.zone, dropB.zone),
    h('div', { class: 'bd-row' }, compareBtn, clearBtn, h('span', { class: 'bd-small' }, W.SAY_LOCAL_NOTE)),
    status),
  out)

// --- drawing a comparison -------------------------------------------------------------------
function warnText(ids) {
  if (!ids?.length) return '-'
  return ids.map((id) => W.SAY_WARN_TEXT?.[(W.SAY_WARN_IDS || []).indexOf(id)] ?? id).join('; ')
}

function verdict(v) {
  const sameFrames = v.frames.differing === 0 && v.frames.onlyOne === 0 && v.a.frames > 0
  const cls = v.identical ? 'is-same' : sameFrames ? 'is-near' : 'is-diff'
  const title = v.identical ? W.SAY_IDENTICAL : sameFrames ? W.SAY_FRAMES_SAME : W.SAY_DIFFERS
  const lines = []
  if (v.identical) lines.push(fmt(W.SAY_SAME_LINE, num(v.frames.total), (v.a.sha256 || '').slice(0, 16)))
  else if (sameFrames) lines.push(fmt(W.SAY_FRAMES_SAME_LINE, num(v.frames.total)))
  else {
    lines.push(fmt(W.SAY_DIFF_LINE, num(v.frames.differing), num(v.frames.total)))
    if (v.frames.onlyOne) lines.push(fmt(W.SAY_ONLY_ONE_LINE, num(v.frames.onlyOne)))
  }
  if (!v.frames.byAddress && v.frames.total) lines.push(W.SAY_BY_POSITION)
  return h('section', { class: 'bd-verdict ' + cls },
    h('div', { class: 'bd-verdict-mark', 'aria-hidden': 'true' }, v.identical || sameFrames ? '=' : '!='),
    h('div', {}, h('h2', {}, title), ...lines.map((l) => h('p', {}, l))))
}

function headerTable(v) {
  const F = W.SAY_FIELDS || []
  const fdri = (s) => s.fdri.map((f) => fmt('{0} @ {1}', num(f.words), f.far ?? '-')).join(', ') || '-'
  const val = (s) => [
    s.file, num(s.bytes), s.sha256 ? s.sha256.slice(0, 16) : '-',
    s.header ? s.header.design : W.SAY_NO_HEADER, s.header?.part ?? '-', s.header?.date ?? '-', s.header?.time ?? '-',
    s.idcode ?? '-', num(s.sync), num(s.frames), fdri(s), num(s.trailing), warnText(s.warnings),
  ]
  const a = val(v.a), b = val(v.b)
  const full = (s, i) => (i === 2 ? s.sha256 : null)
  return h('section', { class: 'bd-sec' },
    h('h3', {}, W.SAY_HEADER_TITLE),
    h('div', { class: 'bd-scroll' },
      h('table', { class: 'bd-table' },
        h('thead', {}, h('tr', {}, h('th', {}, W.SAY_COL_FIELD), h('th', {}, W.SAY_COL_A), h('th', {}, W.SAY_COL_B))),
        h('tbody', {}, F.map((name, i) => h('tr', { class: a[i] !== b[i] ? 'is-diff' : null },
          h('th', {}, name), h('td', { title: full(v.a, i) }, a[i]), h('td', { title: full(v.b, i) }, b[i])))))))
}

function firstFrame(v) {
  const f = v.frames.first
  if (!f) return null
  const d = f.decoded
  const FF = W.SAY_FAR_FIELDS || []
  const vals = d
    ? [f.far, W.SAY_BLOCKS?.[d.block] ?? d.block, W.SAY_HALVES?.[d.bottom] ?? d.bottom, d.row, d.column, d.minor]
    : [f.far ?? W.SAY_NO_FAR, '-', '-', '-', '-', '-']
  const line = f.words === null ? fmt(W.SAY_ONLY_ONE_FIRST, num(f.index)) : fmt(W.SAY_FIRST_LINE, num(f.index), num(f.words), num(f.bits), num(f.ecc))
  const WH = W.SAY_WORD_HEAD || []
  return h('section', { class: 'bd-sec' },
    h('h3', {}, W.SAY_FIRST_TITLE),
    h('dl', { class: 'bd-far' }, FF.map((k, i) => h('div', {}, h('dt', {}, k), h('dd', {}, String(vals[i]))))),
    h('p', { class: 'bd-line' }, line),
    f.list?.length ? h('div', { class: 'bd-scroll' }, h('table', { class: 'bd-table bd-words' },
      h('thead', {}, h('tr', {}, WH.map((x) => h('th', {}, x)))),
      h('tbody', {}, f.list.map((x) => h('tr', {}, h('td', {}, x.word), h('td', {}, x.a), h('td', {}, x.b)))))) : null)
}

function frameMap(v) {
  const canvas = h('canvas', { class: 'bd-map', role: 'img', 'aria-label': W.SAY_MAP_TITLE })
  const legend = h('div', { class: 'bd-legend' }, (W.SAY_LEGEND || []).map((t, i) => h('span', {}, h('i', { class: 'c' + i }), t)))
  const sec = h('section', { class: 'bd-sec' }, h('h3', {}, W.SAY_MAP_TITLE), h('p', { class: 'bd-small' }, W.SAY_MAP_LINE), canvas, legend)
  const draw = () => {
    const rows = v.strip || []
    const wCss = Math.max(240, canvas.clientWidth || sec.clientWidth || 600)
    const bandH = rows.length > 1 ? 16 : 28
    const labelW = rows[0]?.block === null ? 0 : 64
    const hCss = rows.length * (bandH + 4)
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(wCss * dpr); canvas.height = Math.round(hCss * dpr)
    canvas.style.height = hCss + 'px'
    const g = canvas.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, wCss, hCss)
    const cs = getComputedStyle(document.documentElement)
    const col = [cs.getPropertyValue('--w-line').trim() || '#123', cs.getPropertyValue('--w-gold').trim() || '#ffd700', cs.getPropertyValue('--w-red').trim() || '#ff4d6d']
    const sameFill = 'rgba(0,255,136,0.28)'
    g.font = '10px ' + (cs.getPropertyValue('--w-mono').trim() || 'monospace')
    g.textBaseline = 'middle'
    rows.forEach((r, ri) => {
      const y = ri * (bandH + 4)
      if (labelW) {
        g.fillStyle = cs.getPropertyValue('--w-muted').trim() || '#adc9c0'
        const lab = (W.SAY_BLOCKS_SHORT?.[r.block] ?? r.block) + ' ' + (W.SAY_HALVES?.[r.bottom] ?? r.bottom).slice(0, 3) + ' ' + r.row
        g.fillText(lab, 0, y + bandH / 2)
      }
      const n = r.cells.length, cw = (wCss - labelW) / n
      for (let c = 0; c < n; c++) {
        const s = r.cells.charCodeAt(c) - 48
        g.fillStyle = s === 0 ? sameFill : col[s]
        g.fillRect(labelW + c * cw, y, Math.max(1, cw - (cw > 3 ? 1 : 0)), bandH)
      }
    })
  }
  requestAnimationFrame(draw)
  new ResizeObserver(() => draw()).observe(sec)
  return sec
}

function packets(v) {
  const rows = lineDiff(v.a.packets, v.b.packets) || []
  const changed = rows.filter((r) => r.op !== '=').length
  const body = h('div', { class: 'bd-scroll bd-packets' }, h('table', { class: 'bd-table' },
    h('thead', {}, h('tr', {}, h('th', {}, W.SAY_COL_A), h('th', {}, W.SAY_COL_B))),
    h('tbody', {}, rows.map((r) => h('tr', { class: r.op === '=' ? 'is-eq' : 'is-diff' }, h('td', {}, r.a), h('td', {}, r.b))))))
  const open = changed > 0 || state.packetsOpen
  body.hidden = !open
  const btn = h('button', { class: 't27-btn', type: 'button', 'aria-expanded': String(open) }, open ? W.SAY_HIDE_PACKETS : W.SAY_SHOW_PACKETS)
  btn.addEventListener('click', () => {
    body.hidden = !body.hidden
    state.packetsOpen = !body.hidden
    btn.setAttribute('aria-expanded', String(!body.hidden))
    btn.textContent = body.hidden ? W.SAY_SHOW_PACKETS : W.SAY_HIDE_PACKETS
  })
  return h('section', { class: 'bd-sec' },
    h('h3', {}, W.SAY_PACKETS_TITLE),
    h('p', { class: 'bd-line' }, changed ? fmt(W.SAY_PACKETS_DIFF, num(changed)) : fmt(W.SAY_PACKETS_SAME, num(v.a.packets.length))),
    btn, body)
}

function render(v) {
  state.view = v
  out.replaceChildren(verdict(v), headerTable(v), firstFrame(v) || '', frameMap(v), packets(v))
}

// --- sources ---------------------------------------------------------------------------------
function showDemo(i) {
  if (state.busy || !state.demo) return
  const id = W.SAY_DEMO_IDS?.[i]
  const v = state.demo.pairs.find((p) => p.label === id)
  if (!v) return
  demoBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)))
  demoLine.textContent = (W.SAY_DEMO_LINES?.[i] ?? '') + ' ' + (W.SAY_DEMO_NOTE ?? '')
  status.textContent = ''
  render(v)
}

async function compareOwn() {
  const [fa, fb] = state.files
  if (!fa || !fb || state.busy) return
  state.busy = true
  compareBtn.disabled = true
  try {
    let ua, ub
    try { status.textContent = fmt(W.SAY_READING, fa.name); ua = await readFile(fa) } catch { throw new Error(fmt(W.SAY_ERR_READ, fa.name)) }
    try { status.textContent = fmt(W.SAY_READING, fb.name); ub = await readFile(fb) } catch { throw new Error(fmt(W.SAY_ERR_READ, fb.name)) }
    await pause()
    const v = await compareBitstreams(ua, ub, state.geoms || [], {
      label: 'own', nameA: fa.name, nameB: fb.name, sha256, buckets: W.K_STRIP_BUCKETS || 160, chunk: W.K_CHUNK_FRAMES || 2000,
      onProgress: async (k, n) => { status.textContent = fmt(W.SAY_COMPARING, num(k), num(n)); await pause() },
    })
    demoBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'))
    demoLine.textContent = ''
    status.textContent = ''
    render(v)
  } catch (e) {
    status.textContent = e.message
  } finally {
    state.busy = false
    compareBtn.disabled = !(state.files[0] && state.files[1])
  }
}

;(async () => {
  try {
    const [demo, geoms] = await Promise.all([json('./demo.json'), json('./geometry.json')])
    state.demo = demo
    state.geoms = geoms
    showDemo(0)
  } catch {
    status.textContent = W.SAY_ERR_DEMO
    try { state.geoms = await json('./geometry.json') } catch { state.geoms = [] }
  }
})()
