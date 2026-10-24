// SPDX-License-Identifier: Apache-2.0
// t27-vs-nvfp4 tool: a scoreboard of six weight formats on one small model, from data.json.
// Every word on screen comes from window.T27_WIDGET (specs/widgets/t27-vs-nvfp4.t27, SAY_*); every
// number comes from data.json, which scripts/widget-data/t27-vs-nvfp4.mjs writes from the
// trinity-fpga run. This file types no number of the result. It reads nothing of the reader's and
// sends nothing: the one request is the same-origin data.json.
const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const fmt = (t, ...v) => {
  const named = v.length === 1 && v[0] && typeof v[0] === 'object' ? v[0] : null
  return String(t ?? '').replace(/\{(\w+)\}/g, (m, k) => {
    const x = named ? named[k] : v[+k]
    return x === undefined ? m : String(x)
  })
}
const fixed = (x, d) => Number(x).toFixed(d)

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') el.className = v
    else if (k === 'style') el.setAttribute('style', v)
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : String(k))
  return el
}

document.head.append(h('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href }))

const SPLITS = ['test', 'dev']
const state = { split: SPLITS[0], data: null }
const armIndex = (name) => (W.K_ARMS || []).indexOf(name)
const armName = (name) => W.SAY_ARM_NAMES?.[armIndex(name)] ?? name
const armNote = (name) => W.SAY_ARM_NOTES?.[armIndex(name)] ?? ''
const verdictText = (id) => W.SAY_VERDICT_TEXT?.[(W.SAY_VERDICT_IDS || []).indexOf(id)] ?? id
const pct = (x, lo, hi) => `${Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100))}%`

// --- layout ---------------------------------------------------------------------------------------
const splitBtns = SPLITS.map((s, i) => h('button', { class: 't27-btn', type: 'button', 'aria-pressed': String(i === 0), onclick: () => setSplit(s) }, W.SAY_SPLITS?.[i] ?? s))
const splitLine = h('p', { class: 'tn-line' })
const claim = h('section', { class: 'tn-claim' })
const pplBox = h('section', { class: 'tn-box' })
const candBox = h('section', { class: 'tn-box', hidden: true })
const rBox = h('section', { class: 'tn-box' })
const storeBox = h('section', { class: 'tn-box' })
const notBox = h('section', { class: 'tn-box tn-not' })
const source = h('p', { class: 'tn-source' })

root.replaceChildren(h('div', { class: 'tn', role: 'group', 'aria-label': fmt(W.SAY_CHART_ALT, { split: W.SAY_SPLITS?.[0] ?? '' }) },
  claim,
  h('div', { class: 'tn-split' }, h('span', { class: 'tn-h' }, W.SAY_SPLIT_LABEL), h('div', { class: 'tn-btns' }, splitBtns), splitLine),
  pplBox, candBox, rBox, storeBox, notBox, source))

function setSplit(s) {
  state.split = s
  splitBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(SPLITS[i] === s)))
  draw()
}

// --- pieces -----------------------------------------------------------------------------------------
function drawClaim(d) {
  const t27 = d.arms.find((a) => a.id === 'T27_STAR')
  const nv = d.arms.find((a) => a.id === 'NVFP4')
  const r = d.ratios.test.find((q) => q.c === 'NVFP4')
  claim.replaceChildren(
    h('span', { class: 'tn-h' }, W.SAY_CLAIM_LABEL),
    h('p', { class: 'tn-claim-text' }, W.SAY_CLAIM),
    h('p', { class: 'tn-line' }, fmt(W.SAY_CLAIM_LINE, fixed(t27.test, 4), fixed(nv.test, 4), fixed(r.r, 1), d.protocol.beat_permille, t27.trits32, nv.trits32)))
}

function drawPpl(d) {
  const s = state.split
  const vals = d.arms.map((a) => a[s]).filter((x) => x !== null)
  const hi = Math.max(...vals)
  const base = d.arms.find((a) => a.id === 'BASE')
  const rows = d.arms.map((a) => {
    const v = a[s]
    const t27 = a.id === 'T27_STAR'
    const ratio = v !== null && base[s] !== null ? fmt(W.SAY_TIMES_BASE, fixed(v / base[s], 3)) : ''
    return h('div', { class: `tn-row${t27 ? ' is-t27' : ''}${a.id === 'BASE' ? ' is-base' : ''}` },
      h('div', { class: 'tn-name' }, h('b', {}, armName(a.name)), h('span', {}, armNote(a.name))),
      h('div', { class: 'tn-track' }, v === null ? h('span', { class: 'tn-none' }, W.SAY_NOT_RUN) : h('span', { class: 'tn-bar', style: `width:${pct(v, 0, hi)}` })),
      h('div', { class: 'tn-val' }, v === null ? '' : h('b', {}, fixed(v, 4)), h('span', {}, ratio)))
  })
  pplBox.replaceChildren(
    h('h2', { class: 'tn-h' }, W.SAY_PPL_TITLE),
    h('p', { class: 'tn-line' }, fmt(W.SAY_PPL_LINE, { split: W.SAY_SPLITS?.[SPLITS.indexOf(s)] ?? s, windows: d.protocol.windows, seqlen: d.protocol.seqlen })),
    h('div', { class: 'tn-rows' }, rows))
}

function drawCandidates(d) {
  candBox.hidden = state.split !== 'dev'
  if (candBox.hidden) return
  const hi = Math.max(...d.dev_candidates.map((c) => c.dev))
  candBox.replaceChildren(
    h('h2', { class: 'tn-h' }, W.SAY_CAND_TITLE),
    h('p', { class: 'tn-line' }, W.SAY_CAND_LINE),
    h('div', { class: 'tn-rows' }, d.dev_candidates.map((c) => h('div', { class: `tn-row${c.chosen ? ' is-t27' : ' is-dim'}` },
      h('div', { class: 'tn-name' }, h('b', {}, c.name), h('span', {}, c.chosen ? W.SAY_CHOSEN : '')),
      h('div', { class: 'tn-track' }, h('span', { class: 'tn-bar', style: `width:${pct(c.dev, 0, hi)}` })),
      h('div', { class: 'tn-val' }, h('b', {}, fixed(c.dev, 4)))))))
}

function drawRatios(d) {
  const P = d.protocol
  const list = d.ratios[state.split]
  const all = [...list.map((q) => q.r), P.beat_permille, P.tie_permille, 1000]
  const step = 50
  const lo = Math.floor((Math.min(...all) - 20) / step) * step
  const hi = Math.ceil((Math.max(...all) + 20) / step) * step
  const marks = (withText) => [
    h('span', { class: 'tn-mark is-one', style: `left:${pct(1000, lo, hi)}` }),
    h('span', { class: 'tn-mark is-beat', style: `left:${pct(P.beat_permille, lo, hi)}` }, withText ? h('i', {}, fmt(W.SAY_BEAT_MARK, P.beat_permille)) : null),
    h('span', { class: 'tn-mark is-tie', style: `left:${pct(P.tie_permille, lo, hi)}` }, withText ? h('i', {}, fmt(W.SAY_TIE_MARK, P.tie_permille)) : null),
  ]
  const rows = list.map((q) => {
    const a = Math.min(q.r, 1000), b = Math.max(q.r, 1000)
    return h('div', { class: `tn-row tn-rrow is-${q.verdict}` },
      h('div', { class: 'tn-name' }, h('b', {}, armName(d.arms.find((x) => x.id === q.c).name)), h('span', {}, q.ladder ? '' : W.SAY_OFF_LADDER)),
      h('div', { class: 'tn-track tn-rtrack' }, marks(false),
        h('span', { class: 'tn-stem', style: `left:${pct(a, lo, hi)};width:calc(${pct(b, lo, hi)} - ${pct(a, lo, hi)})` }),
        h('span', { class: 'tn-dot', style: `left:${pct(q.r, lo, hi)}` })),
      h('div', { class: 'tn-val' }, h('b', {}, fixed(q.r, 1)), h('span', {}, verdictText(q.verdict))))
  })
  const ticks = []
  for (let x = lo; x <= hi; x += step) ticks.push(h('span', { class: 'tn-tick', style: `left:${pct(x, lo, hi)}` }, String(x)))
  rBox.replaceChildren(
    h('h2', { class: 'tn-h' }, W.SAY_R_TITLE),
    h('p', { class: 'tn-line' }, fmt(W.SAY_R_LINE, P.beat_permille, P.tie_permille)),
    h('div', { class: 'tn-rows' },
      h('div', { class: 'tn-row tn-axisrow' }, h('div', {}), h('div', { class: 'tn-track tn-rtrack tn-marktrack' }, marks(true)), h('div', {})),
      rows,
      h('div', { class: 'tn-row tn-axisrow' }, h('div', {}), h('div', { class: 'tn-axis' }, ticks), h('div', { class: 'tn-axislabel' }, fmt(W.SAY_R_AXIS, 1000)))),
    h('p', { class: 'tn-line' }, fmt(W.SAY_GAP, fixed(d.gap.closed * 100, 0), fixed(d.gap.t27_excess, 2), fixed(d.gap.nvfp4_excess, 2))))
}

function drawStorage(d) {
  const arms = d.arms.filter((a) => a.trits32 !== null)
  const t27 = d.arms.find((a) => a.id === 'T27_STAR')
  const nv = d.arms.find((a) => a.id === 'NVFP4')
  storeBox.replaceChildren(
    h('h2', { class: 'tn-h' }, W.SAY_STORE_TITLE),
    h('div', { class: 'tn-table-wrap' }, h('table', { class: 'tn-table' },
      h('thead', {}, h('tr', {}, (W.SAY_STORE_HEAD || []).map((t) => h('th', {}, t)))),
      h('tbody', {}, arms.map((a) => h('tr', { class: a.id === 'T27_STAR' ? 'is-t27' : '' },
        h('td', {}, armName(a.name)), h('td', { class: 'tn-n' }, String(a.trits32)), h('td', { class: 'tn-n' }, String(a.bits32))))))),
    h('p', { class: 'tn-line' }, fmt(W.SAY_STORE_LINE, t27.bits32, nv.bits32, fixed(((t27.bits32 - nv.bits32) / nv.bits32) * 100, 0))))
}

function drawLimits(d) {
  const bits = (id) => d.arms.find((a) => a.id === id).bits32
  const named = { windows: d.protocol.windows, seqlen: d.protocol.seqlen, ncand: d.protocol.candidates.length, t27bits: bits('T27_STAR'), nvbits: bits('NVFP4'), e2m2bits: bits('E2M2') }
  notBox.replaceChildren(h('h2', { class: 'tn-h' }, W.SAY_NOT_TITLE), h('ul', { class: 'tn-limits' }, (W.SAY_LIMITS || []).map((t) => h('li', {}, fmt(t, named)))))
}

function drawSource(d) {
  const S = d.source
  source.textContent = fmt(W.SAY_SOURCE, S.results.path, S.results.commit, S.prereg.path, S.prereg.commit, d.run.started, d.run.finished, d.run.versions.torch)
}

function draw() {
  const d = state.data
  if (!d) return
  splitLine.textContent = W.SAY_SPLIT_LINES?.[SPLITS.indexOf(state.split)] ?? ''
  root.firstElementChild.setAttribute('aria-label', fmt(W.SAY_CHART_ALT, { split: W.SAY_SPLITS?.[SPLITS.indexOf(state.split)] ?? state.split }))
  drawPpl(d)
  drawCandidates(d)
  drawRatios(d)
}

async function load() {
  try {
    const res = await fetch(new URL(W.K_DATA || 'data.json', import.meta.url))
    if (!res.ok) throw new Error(String(res.status))
    state.data = await res.json()
  } catch {
    root.replaceChildren(h('p', { class: 'tn-err', role: 'alert' }, W.SAY_ERR_LOAD))
    return
  }
  const d = state.data
  drawClaim(d)
  drawStorage(d)
  drawLimits(d)
  drawSource(d)
  draw()
}

load()
