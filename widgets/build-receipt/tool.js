// SPDX-License-Identifier: Apache-2.0
// build-receipt/tool.js -- one real open-flow build, t27 spec to XC7A200T bitstream, printed as a
// shop receipt. Every word on the screen comes from specs/widgets/build-receipt.t27 through
// window.T27_WIDGET; this file holds none of its own. It fetches only receipt.json beside it
// (written by scripts/widget-data/build-receipt.mjs) and sends nothing anywhere.

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
  for (const c of kids) if (c != null) e.append(c)
  return e
}
const SVG = 'http://www.w3.org/2000/svg'
const svg = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  return e
}

document.head.append(el('link', { rel: 'stylesheet', href: new URL('./tool.css', import.meta.url).href }))

// --- numbers to text: digits and units only, the units are SAY_UNITS ---------------------------
const UNITS = Array.isArray(W.SAY_UNITS) ? W.SAY_UNITS : []
const secs = (ms) => fill(W.SAY_SECONDS, { s: (ms / 1000).toFixed(3) })
function size(bytes) {
  let v = bytes
  let i = 0
  while (v >= 1000 && i < UNITS.length - 1) { v /= 1000; i++ }
  const human = `${i === 0 ? v : v.toFixed(2)} ${UNITS[i] ?? ''}`.trim()
  return i === 0 ? human : `${human} (${bytes} ${UNITS[0] ?? ''})`.trim()
}
const utc = (iso) => String(iso ?? '').replace('T', ' ').replace(/\.\d+Z$|Z$/, '')

// --- receipt pieces ----------------------------------------------------------------------------
const rule = () => el('div', { class: 'br-rule', 'aria-hidden': 'true' })
const line = (left, right, cls = '') => el('div', { class: `br-line ${cls}`.trim() }, [
  el('span', { class: 'br-l', text: left }),
  el('span', { class: 'br-dots', 'aria-hidden': 'true' }),
  el('span', { class: 'br-r', text: right }),
])
const sub = (text, cls = '') => el('div', { class: `br-sub ${cls}`.trim(), text })
const center = (text, cls = '') => el('div', { class: `br-center ${cls}`.trim(), text })

/** A barcode drawn from a hex digest: each hex digit is one bar and one gap, widths 1 to 4. */
function barcode(hex) {
  const digits = String(hex || '').toLowerCase().replace(/[^0-9a-f]/g, '').split('').map((d) => parseInt(d, 16))
  const parts = []
  const guard = [[1, 1], [1, 1]]
  for (const [b, g] of guard) parts.push(b, g)
  for (const d of digits) parts.push((d >> 2) + 1, (d & 3) + 1)
  for (const [b, g] of guard) parts.push(b, g)
  const quiet = 6
  const width = parts.reduce((a, b) => a + b, 0) + quiet * 2
  const s = svg('svg', { viewBox: `0 0 ${width} 40`, preserveAspectRatio: 'none', class: 'br-barcode', role: 'img', 'aria-label': W.SAY_BARCODE || '' })
  let x = quiet
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) s.append(svg('rect', { x, y: 0, width: parts[i], height: 40 }))
    x += parts[i]
  }
  return s
}

/** Where the spec's generated block and receipt.json disagree, by constant name. */
function specDiff(r) {
  const what = []
  const ms = r.stages.map((s) => s.ms ?? 0)
  if (Number(W.K_STAGE_COUNT) !== r.stage_count || r.stage_count !== r.stages.length) what.push('K_STAGE_COUNT')
  if (Number(W.K_STAGES_OK) !== r.stages_ok) what.push('K_STAGES_OK')
  if (!Array.isArray(W.K_STAGE_MS) || W.K_STAGE_MS.length !== ms.length || W.K_STAGE_MS.some((v, i) => Number(v) !== ms[i])) what.push('K_STAGE_MS')
  if (Number(W.K_TOTAL_MS) !== r.total_ms) what.push('K_TOTAL_MS')
  if (r.bit && Number(W.K_BIT_BYTES) !== r.bit.bytes) what.push('K_BIT_BYTES')
  const sum = ms.reduce((a, b) => a + b, 0)
  if (Math.abs(sum - r.total_ms) > Number(W.K_ROUND_TOL_MS ?? 0)) what.push('total_ms')
  return what
}

/** The tool and its version, without saying the tool's name twice. */
function toolLine(s) {
  const v = String(s.version ?? '')
  return v.toLowerCase().includes(String(s.tool).split(' ')[0].toLowerCase()) ? v : `${s.tool} | ${v}`
}

function stageItem(s, i) {
  const name = `${i + 1} ${(W.SAY_STAGE_NAMES || [])[i] ?? s.id}`
  const box = el('div', { class: `br-item br-${s.status === 'ok' ? 'ok' : s.status === 'failed' ? 'failed' : 'notrun'}` })
  if (s.status === 'not run') {
    box.append(line(name, W.SAY_NOT_RUN), sub(s.tool))
    return box
  }
  box.append(line(name, secs(s.ms ?? 0)))
  box.append(sub(toolLine(s)))
  if (s.status === 'failed') {
    box.append(sub(fill(W.SAY_FAILED, { exit: s.exit ?? '' }), 'br-bad'))
    if (s.error) box.append(el('pre', { class: 'br-err', text: String(s.error) }))
    return box
  }
  if (s.output) {
    box.append(sub(fill(W.SAY_OUT, { file: s.output.file, size: size(s.output.bytes) }), 'br-detail'))
    box.append(sub(fill(W.SAY_SHA, { sha: s.output.sha256 }), 'br-hex br-detail'))
  }
  if (s.cpu_s != null) box.append(sub(fill(W.SAY_CPU, { cpu: s.cpu_s, rss: Math.round(s.rss_mb ?? 0) }), 'br-faint br-detail'))
  return box
}

function render(r) {
  const paper = el('article', { class: 'br-paper', 'aria-label': W.TITLE || '' })
  const sha = r.bit?.sha256 ?? ''
  const no = (r.bit?.payload_sha256 ?? sha).slice(0, 8).toUpperCase()

  // header
  paper.append(
    center(W.SAY_SHOP, 'br-shop'),
    center(fill(W.SAY_RECEIPT, { no })),
    center(fill(W.SAY_WHEN, { when: utc(r.when_utc) })),
    center(fill(W.SAY_MACHINE, r.machine || {}), 'br-faint'),
    center(fill(W.SAY_LOAD, { load: r.machine?.loadavg_1m_at_start ?? '' }), 'br-faint'),
    rule(),
  )
  const d = r.design || {}
  paper.append(
    sub(`${W.SAY_LABEL_SPEC}: ${d.spec ?? ''}`),
    sub(`${W.SAY_LABEL_PART}: ${d.part ?? ''}`),
    sub(`${W.SAY_LABEL_BOARD}: ${d.board ?? ''}`, 'br-detail'),
    sub(fill(W.SAY_WRAPPER, { name: d.datapath ?? '', lines: d.wrapper_lines ?? '' }), 'br-faint br-detail'),
    rule(),
    line(W.SAY_COL_ITEM, W.SAY_COL_TIME, 'br-head'),
  )

  // items
  r.stages.forEach((s, i) => paper.append(stageItem(s, i)))
  paper.append(rule())

  // totals
  paper.append(el('div', { class: 'br-line', text: fill(W.SAY_ITEMS, { ok: r.stages_ok, count: r.stage_count }) }))
  if (r.complete) paper.append(line(W.SAY_TOTAL, secs(r.total_ms), 'br-total'))
  else paper.append(sub(fill(W.SAY_NO_TOTAL, { s: secs(r.total_ms) }), 'br-bad br-total-miss'))
  paper.append(
    line(W.SAY_VIVADO, String(r.vendor_tools_run ?? 0), 'br-big'),
    line(W.SAY_VENDOR, String(r.vendor_tools_run ?? 0)),
    sub(fill(W.SAY_END_TO_END, { s: secs(r.wall_ms_end_to_end ?? 0) }), 'br-faint'),
    rule(),
  )

  // the design that came out
  if (r.fmax) {
    paper.append(line(fill(W.SAY_FMAX, { clock: r.fmax.clock, mhz: r.fmax.mhz, target: r.fmax.target_mhz }), r.fmax.pass ? W.SAY_PASS : W.SAY_FAIL, r.fmax.pass ? '' : 'br-bad'))
  }
  if (r.utilisation && Object.keys(r.utilisation).length) {
    paper.append(sub(W.SAY_UTIL_TITLE))
    for (const [k, [used, total]] of Object.entries(r.utilisation)) paper.append(line(`  ${k}`, `${used} / ${total}`, 'br-small'))
  }
  if (r.fmax || r.utilisation) paper.append(rule())

  // the bitstream
  if (r.bit) {
    paper.append(
      sub(`${W.SAY_FILE_SHA}: ${size(r.bit.bytes)}`),
      sub(r.bit.sha256, 'br-hex'),
      sub(W.SAY_FILE_SHA_NOTE, 'br-faint'),
      sub(fill(W.SAY_PAYLOAD_SHA, { size: size(r.bit.payload_bytes) })),
      sub(r.bit.payload_sha256, 'br-hex'),
    )
    const earlier = r.earlier_runs || []
    if (earlier.length) {
      paper.append(sub(r.payload_same_as_earlier ? fill(W.SAY_SAME_PAYLOAD, { n: earlier.length }) : W.SAY_OTHER_PAYLOAD, r.payload_same_as_earlier ? '' : 'br-bad'))
      for (const e of earlier) paper.append(sub(fill(W.SAY_EARLIER, { when: utc(e.when_utc), s: secs(e.total_ms), load: e.loadavg_1m_at_start }), 'br-faint'))
    }
    const c = r.cross_check || {}
    paper.append(sub(
      c.status === 'ok' && c.payload_equal ? fill(W.SAY_CROSS_OK, { ms: c.ms }) : c.status === 'ok' ? W.SAY_CROSS_BAD : W.SAY_CROSS_SKIP,
      c.status === 'ok' && !c.payload_equal ? 'br-bad' : '',
    ))
    paper.append(rule())
    paper.append(barcode(sha), center(sha, 'br-hex br-tiny'))
  }
  paper.append(center(W.SAY_NOT_PROGRAMMED, 'br-small'), center(W.SAY_FOOTER, 'br-faint br-small'))

  const diff = specDiff(r)
  const warn = diff.length ? el('p', { class: 'br-warn', role: 'status', text: fill(W.SAY_SPEC_DIFF, { what: diff.join(', ') }) }) : null

  // commands
  const cmds = el('pre', { class: 'br-cmds', id: 'br-cmds', hidden: '' }, [(r.commands || []).join('\n')])
  const toggle = el('button', { type: 'button', class: 't27-btn', 'aria-pressed': 'false', 'aria-controls': 'br-cmds', text: W.SAY_SHOW_CMDS })
  toggle.addEventListener('click', () => {
    const on = toggle.getAttribute('aria-pressed') !== 'true'
    toggle.setAttribute('aria-pressed', String(on))
    toggle.textContent = on ? W.SAY_HIDE_CMDS : W.SAY_SHOW_CMDS
    cmds.hidden = !on
  })

  // verify
  const verify = el('section', { class: 'br-verify' }, [
    el('h2', { text: W.SAY_VERIFY_TITLE }),
    el('ol', {}, (W.SAY_VERIFY_STEPS || []).map((t) => el('li', { text: t }))),
  ])

  root.replaceChildren(el('div', { class: 'br-wrap' }, [warn, paper, el('div', { class: 'br-tools' }, [toggle]), cmds, verify]))
}

async function main() {
  if (!root) return
  root.replaceChildren(el('p', { class: 'br-status', text: W.SAY_LOADING }))
  try {
    const res = await fetch(new URL(W.K_DATA_FILE || './receipt.json', import.meta.url))
    if (!res.ok) throw new Error(String(res.status))
    const r = await res.json()
    if (!Array.isArray(r.stages)) throw new Error('stages')
    render(r)
  } catch (e) {
    root.replaceChildren(el('p', { class: 'br-status br-bad', role: 'alert', text: W.SAY_ERROR }))
  }
}

main()
