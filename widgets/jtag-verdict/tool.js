// jtag-verdict/tool.js -- the five checks of t27 specs/port/tools/jtag/tdo_verdict.t27, run on an IR
// capture and a DR word the reader types. Every word is a SAY_ constant from
// specs/widgets/jtag-verdict.t27 (window.T27_WIDGET); every number is a K_ constant there. Reads only
// ./tool.css; calls no other host. The two values stay in this tab and in the URL hash.
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
const hex2 = (v) => hexN(v, 2)
const hex8 = (v) => hexN(v, 8)
const say = (k, i) => (Array.isArray(W[k]) ? W[k][i] : W[k]) ?? ''

const IR_MASK = W.K_IR_MASK ?? 3
const IR_LOW = W.K_IR_LOW ?? 1
const ALL_ONES = W.K_ALL_ONES ?? 4294967295
const V = {
  high: W.K_V_STUCK_HIGH ?? 1,
  low: W.K_V_STUCK_LOW ?? 2,
  broken: W.K_V_BROKEN_SHIFT ?? 3,
  bypass: W.K_V_BYPASS ?? 4,
  idcode: W.K_V_IDCODE ?? 5,
}
const MASK = W.K_VERSION_MASK ?? 268435455
const KNOWN = W.K_KNOWN_IDCODE || []
const CASE_IR = W.K_CASE_IR || []
const CASE_DR = W.K_CASE_DR || []
const CASE_WANT = W.K_CASE_WANT || []

// The same order as tdo_verdict.t27. Returns the verdict code; the step that decided is code - 1.
function verdict(ir, dr) {
  if (dr >>> 0 === ALL_ONES) return V.high
  if (dr >>> 0 === 0 && ir >>> 0 === 0) return V.low
  if ((ir & IR_MASK) !== IR_LOW) return V.broken
  if ((dr & 1) === 0) return V.bypass
  return V.idcode
}

function parseHex(text) {
  const t = String(text ?? '').trim().replace(/[\s_]/g, '')
  const m = t.match(/^(?:0x)?([0-9a-f]{1,8})$/i)
  return m ? parseInt(m[1], 16) >>> 0 : null
}

function fromHash() {
  const get = (key) => {
    const m = location.hash.match(new RegExp(`[#&]${key}=([^&]+)`))
    return m ? parseHex(decodeURIComponent(m[1])) : null
  }
  return { ir: get(W.SAY_HASH_IR || 'ir'), dr: get(W.SAY_HASH_DR || 'dr') }
}

// --- the page -----------------------------------------------------------------------------
const irInput = el('input', { class: 'jv-input', id: 'jv-ir', inputmode: 'text', autocomplete: 'off', spellcheck: 'false' })
const drInput = el('input', { class: 'jv-input', id: 'jv-dr', inputmode: 'text', autocomplete: 'off', spellcheck: 'false' })
const msg = el('p', { class: 'jv-msg', role: 'status' })
const out = el('div', { class: 'jv-out', 'aria-live': 'polite' })

const presets = el('div', { class: 'jv-presets' })
CASE_IR.forEach((ir, i) => {
  const b = el('button', { class: 't27-btn jv-preset', type: 'button', 'data-i': String(i) }, say('SAY_CASE_NAMES', i))
  b.addEventListener('click', () => {
    irInput.value = hex2(ir)
    drInput.value = hex8(CASE_DR[i])
    update(true)
  })
  presets.append(b)
})

const agree = CASE_IR.filter((ir, i) => verdict(ir, CASE_DR[i]) === CASE_WANT[i]).length

root.replaceChildren(
  el('div', { class: 'jv-form' },
    el('label', { class: 'jv-field', for: 'jv-ir' },
      el('span', { class: 'jv-label' }, say('SAY_IR_LABEL')), irInput, el('span', { class: 'jv-hint' }, say('SAY_IR_HINT'))),
    el('label', { class: 'jv-field', for: 'jv-dr' },
      el('span', { class: 'jv-label' }, say('SAY_DR_LABEL')), drInput, el('span', { class: 'jv-hint' }, say('SAY_DR_HINT')))),
  msg,
  el('p', { class: 'jv-label' }, say('SAY_CASES_LABEL')),
  presets,
  out,
  el('p', { class: 'jv-self' }, fill(say('SAY_SELF_CHECK'), CASE_IR.length, `${agree}/${CASE_IR.length}`)),
  el('p', { class: 'jv-note' }, say('SAY_NOTE'), ' ', el('a', { href: say('SAY_SPEC_HREF'), target: '_blank', rel: 'noopener' }, say('SAY_SPEC_LINK'))),
)

function bitCells(v, n) {
  const row = el('span', { class: 'jv-bits' })
  for (let i = 0; i < n; i++) row.append(el('span', { class: 'jv-bit' }, String((v >>> i) & 1)))
  return row
}

function update(writeHash) {
  const ir = parseHex(irInput.value)
  const dr = parseHex(drInput.value)
  const bad = ir == null ? irInput.value : dr == null ? drInput.value : null
  if (bad != null) {
    msg.textContent = fill(say('SAY_BAD_HEX'), bad || '""')
    out.replaceChildren()
    return
  }
  msg.textContent = ''
  if (writeHash) history.replaceState(null, '', `#${W.SAY_HASH_IR || 'ir'}=${hex2(ir)}&${W.SAY_HASH_DR || 'dr'}=${hex8(dr)}`)
  const v = verdict(ir, dr)
  const tone = v === V.idcode ? 'ok' : v === V.bypass ? 'warn' : 'bad'
  for (const b of presets.children) {
    const i = Number(b.dataset.i)
    b.setAttribute('aria-pressed', String(CASE_IR[i] === ir && CASE_DR[i] >>> 0 === dr))
  }

  const ladder = el('ol', { class: 'jv-ladder' })
  ;(W.SAY_LADDER_STEPS || []).forEach((step, i) => {
    const code = i + 1
    const state = code < v ? 'passed' : code === v ? 'decided' : 'skipped'
    const word = state === 'passed' ? say('SAY_LADDER_PASSED') : state === 'decided' ? say('SAY_LADDER_DECIDED') : say('SAY_LADDER_SKIPPED')
    ladder.append(el('li', { class: `jv-step jv-${state}` }, el('span', { class: 'jv-step-name' }, step), el('span', { class: 'jv-step-state' }, word)))
  })

  const low2 = ((ir & IR_MASK) >>> 0).toString(2).padStart(2, '0')
  const masked = (dr & MASK) >>> 0
  const known = KNOWN.findIndex((k) => k >>> 0 === masked)
  const device = v !== V.idcode ? null
    : el('p', { class: 'jv-device' },
      known >= 0 ? fill(say('SAY_DEVICE_KNOWN'), hex8(masked), say('SAY_DEVICE_NAMES', known)) : fill(say('SAY_DEVICE_UNKNOWN'), hex8(masked)),
      ' ', el('a', { href: fill(say('SAY_DECODER_HREF'), hex8(dr)) }, say('SAY_DECODER_LINK')))

  out.replaceChildren(
    el('div', { class: `jv-verdict jv-${tone}` },
      el('p', { class: 'jv-big' }, say('SAY_VERDICT_NAMES', v - 1)),
      el('p', { class: 'jv-why' }, fill(say('SAY_VERDICT_WHY', v - 1), hex2(ir), low2)),
      device),
    el('div', { class: 'jv-grid' },
      el('section', { class: 'jv-panel' },
        el('p', { class: 'jv-label' }, say('SAY_LADDER_TITLE')), ladder),
      el('section', { class: 'jv-panel' },
        el('p', { class: 'jv-label' }, say('SAY_BITS_TITLE')),
        el('p', { class: 'jv-bitline' }, el('span', { class: 'jv-k' }, say('SAY_BITS_IR')), bitCells(ir, 6),
          el('span', { class: `jv-rule ${(ir & IR_MASK) === IR_LOW ? 'jv-ok' : 'jv-bad'}` }, say('SAY_BITS_IR_RULE'))),
        el('p', { class: 'jv-bitline' }, el('span', { class: 'jv-k' }, say('SAY_BITS_DR')), bitCells(dr, 1)),
        el('p', { class: 'jv-label' }, say('SAY_CLI_TITLE')),
        el('pre', { class: 'jv-cli' }, '$ ' + fill(say('SAY_CLI_LINE'), hex8(dr), hex2(ir)) + '\n' + fill(say('SAY_CLI_EXIT'), v === V.idcode ? 0 : 1)))),
  )
}

irInput.addEventListener('input', () => update(true))
drInput.addEventListener('input', () => update(true))
window.addEventListener('hashchange', () => {
  const h = fromHash()
  if (h.ir != null && h.dr != null) { irInput.value = hex2(h.ir); drInput.value = hex8(h.dr); update(false) }
})

const h = fromHash()
const start = W.K_START_CASE ?? 1
irInput.value = hex2(h.ir ?? CASE_IR[start] ?? 0)
drInput.value = hex8(h.dr ?? CASE_DR[start] ?? 0)
update(false)
