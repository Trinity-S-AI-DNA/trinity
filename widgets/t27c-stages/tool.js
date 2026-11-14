// t27c-stages/tool.js -- how the t27c compiler works, on the reader's own text, stage by stage.
//
// Every word is a SAY_ constant and every limit a K_ constant from specs/widgets/t27c-stages.t27
// (window.T27_WIDGET). Every number on screen is what ../../t27/t27_compiler.wasm -- the real
// compiler, built for the browser -- answered for the text in the box, in this tab, through its
// t27_analyze export (the same calling convention as scripts/agents-from-specs.mjs loadCompiler and
// ../../play/embed.js). Tokens and code are coloured by ../../play/site.js, the site's own
// highlighter and palette, so a spec reads the same here as on t27.ai.
// Same-origin files only; nothing is sent anywhere; no storage, no cookies.

const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.appendChild(css)

const fill = (s, ...v) => String(s ?? '').replace(/\{(\d+)\}/g, (m, i) => (i < v.length ? String(v[i]) : m))
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k === 'class') n.className = v
    else if (k === 'text') n.textContent = v
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v)
    else n.setAttribute(k, v === true ? '' : v)
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c instanceof Node ? c : String(c))
  return n
}
const fmt = (n) => Number(n ?? 0).toLocaleString('en-US')
const at = (rel) => new URL(rel, import.meta.url).href
const STAGES = ['source', 'lexer', 'parser', 'typecheck', 'hir', 'backends']

// --- the compiler, in this tab ------------------------------------------------------------------
// The module is compiled once; an instance is made again only if the compiler trapped, because a
// trapped instance's memory cannot be trusted.
let wasmModule = null
let instance = null
async function loadModule() {
  const res = await fetch(at('../../t27/t27_compiler.wasm'))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  wasmModule = await WebAssembly.compile(await res.arrayBuffer())
}
function analyze(source) {
  instance ??= new WebAssembly.Instance(wasmModule, {})
  const w = instance.exports
  try {
    const bytes = new TextEncoder().encode(source)
    // t27_analyze takes ownership of the input; the answer is [u32 LE length][utf-8 JSON].
    const inPtr = w.t27_alloc(bytes.length)
    new Uint8Array(w.memory.buffer, inPtr, bytes.length).set(bytes)
    const outPtr = w.t27_analyze(inPtr, bytes.length)
    const len = new DataView(w.memory.buffer).getUint32(outPtr, true)
    const json = new TextDecoder().decode(new Uint8Array(w.memory.buffer, outPtr + 4, len))
    w.t27_free(outPtr, 4 + len)
    return JSON.parse(json)
  } catch (e) {
    instance = null
    throw e
  }
}

// --- the site's highlighter (optional: without it the text is drawn plain) ----------------------
let hl = null
const spans = (lines, into) => {
  lines.forEach((line, i) => {
    for (const s of line) {
      const color = hl?.CLS_COLOR?.[s.cls]
      into.append(color ? el('span', { style: `color:${color}` }, s.text) : s.text)
    }
    if (i < lines.length - 1) into.append('\n')
  })
  return into
}
const plainLines = (text) => text.split('\n').map((t) => [{ text: t, cls: 'plain' }])
const codeView = (code, lang) => spans(hl?.highlightCode ? hl.highlightCode(code, lang) : plainLines(code), el('pre', { class: 'ts-code' }))
const sourceView = (src, tokens) => spans(hl?.highlightSource ? hl.highlightSource(src, tokens) : plainLines(src), el('pre', { class: 'ts-code' }))
// The highlighter's classes, in SAY_TOKEN_CLASSES order.
const TOKEN_CLASSES = ['kw', 'ident', 'num', 'str', 'op', 'punct']
const classOfKind = (kind) => {
  if (/^Kw/.test(kind)) return 'kw'
  if (kind === 'Ident') return 'ident'
  if (kind === 'Number') return 'num'
  if (kind === 'String' || kind === 'CharLiteral') return 'str'
  if (['Colon', 'Comma', 'LParen', 'RParen', 'LBrace', 'RBrace', 'LBracket', 'RBracket', 'Dot', 'Semicolon'].includes(kind)) return 'punct'
  return 'op'
}
const colorOf = (cls) => hl?.CLS_COLOR?.[cls] ?? 'var(--w-text)'

// --- state ---------------------------------------------------------------------------------------
const state = { stage: 'source', target: (W.SAY_TARGET_IDS || [])[0], example: 0, result: null, error: null, ms: 0, source: '' }

// --- the frame -----------------------------------------------------------------------------------
const exampleBtns = (W.SAY_EXAMPLE_NAMES || []).map((name, i) => el('button', { type: 'button', class: 't27-btn', 'aria-pressed': String(i === 0), onclick: () => pickExample(i) }, name))
const editor = el('textarea', { class: 'ts-editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': W.SAY_EDITOR_LABEL, rows: '12' })
const editorFacts = el('p', { class: 'ts-facts', role: 'status' })
const alertBox = el('div', { class: 'ts-alert', hidden: true })
const chipRow = el('div', { class: 'ts-chips', role: 'group', 'aria-label': W.SAY_STAGES_LABEL })
const chips = {}
STAGES.forEach((id, i) => {
  if (i) chipRow.append(el('span', { class: 'ts-arrow', 'aria-hidden': 'true' }, '\u2192'))
  chips[id] = el('button', { type: 'button', class: 'ts-chip', 'aria-pressed': 'false', onclick: () => { state.stage = id; renderStage() } },
    el('span', { class: 'ts-chip-name' }, el('span', { class: 'ts-dot', 'aria-hidden': 'true' }), (W.SAY_STAGE_NAMES || [])[i]),
    el('span', { class: 'ts-chip-count' }))
  chipRow.append(chips[id])
})
const panel = el('section', { class: 'ts-panel', 'aria-live': 'off' })

root.replaceChildren(el('div', { class: 'ts' },
  el('div', { class: 'ts-edit' },
    el('div', { class: 'ts-examples' }, el('span', { class: 'ts-label' }, W.SAY_EXAMPLES_LABEL), exampleBtns),
    el('label', { class: 'ts-label ts-editor-label' }, W.SAY_EDITOR_LABEL),
    editor,
    editorFacts),
  el('div', { class: 'ts-stages' }, alertBox, chipRow, panel)))
editorFacts.textContent = W.SAY_LOADING

// --- compile -------------------------------------------------------------------------------------
let timer = null
editor.addEventListener('input', () => {
  exampleBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'))
  editorFacts.textContent = W.SAY_EDITOR_WAIT
  clearTimeout(timer)
  timer = setTimeout(run, W.K_DEBOUNCE_MS)
})
// Tab indents inside the box rather than leaving it; Escape then Tab leaves as usual.
let escaped = false
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { escaped = true; return }
  if (e.key === 'Tab' && !e.shiftKey && !escaped) {
    e.preventDefault()
    editor.setRangeText('    ', editor.selectionStart, editor.selectionEnd, 'end')
    editor.dispatchEvent(new Event('input'))
  }
  escaped = false
})

function pickExample(i) {
  state.example = i
  exampleBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)))
  editor.value = (W.SAY_EXAMPLE_SOURCES || [])[i] ?? ''
  run()
}

function run() {
  clearTimeout(timer)
  const src = editor.value
  state.source = src
  const bytes = new TextEncoder().encode(src).length
  if (bytes > W.K_MAX_SOURCE_BYTES) {
    state.result = null
    state.error = fill(W.SAY_TOO_BIG, fmt(bytes), fmt(W.K_MAX_SOURCE_BYTES))
  } else {
    try {
      const t0 = performance.now()
      state.result = analyze(src)
      state.ms = performance.now() - t0
      state.error = null
    } catch (e) {
      state.result = null
      state.error = fill(W.SAY_CRASHED, e?.message || String(e))
    }
  }
  render()
}

// --- what each stage says about itself ------------------------------------------------------------
function verdicts(r) {
  const v = {}
  const tc = r.typecheck ?? {}
  const msgs = tc.errors ?? []
  const warns = msgs.filter((m) => /^warning/i.test(m)).length || tc.warnings || 0
  const parsed = !r.astError
  const targets = (W.SAY_TARGET_IDS || []).map((id) => r.targets?.[id] ?? {})
  const okTargets = targets.filter((t) => t.ok).length
  const dropped = (r.lexerDiscarded?.length ?? 0) > 0
  v.source = { cls: 'ok', count: fill(W.SAY_CHIP_BYTES, fmt(r.sourceBytes)) }
  v.lexer = { cls: dropped ? 'warn' : 'ok', count: fill(W.SAY_CHIP_TOKENS, fmt(r.tokenCount)) }
  v.parser = parsed
    ? { cls: (r.swallowed?.length || r.discarded?.length) ? 'warn' : 'ok', count: fill(W.SAY_CHIP_NODES, fmt(r.nodeCount)) }
    : { cls: 'bad', count: W.SAY_CHIP_STOPPED }
  if (tc.fatal || !parsed) v.typecheck = { cls: 'bad', count: W.SAY_CHIP_STOPPED }
  else if (!tc.ok) v.typecheck = { cls: 'bad', count: fill(W.SAY_CHIP_ERRORS, fmt(tc.errorCount ?? (msgs.length - warns))) }
  else if (warns) v.typecheck = { cls: 'warn', count: fill(W.SAY_CHIP_WARNINGS, fmt(warns)) }
  else v.typecheck = { cls: 'ok', count: W.SAY_CHIP_PASSED }
  v.hir = r.hir?.ok ? { cls: 'ok', count: fill(W.SAY_CHIP_LINES, fmt(r.hir.text.split('\n').length)) } : { cls: 'bad', count: W.SAY_CHIP_STOPPED }
  v.backends = { cls: okTargets === targets.length ? 'ok' : okTargets ? 'warn' : 'bad', count: fill(W.SAY_CHIP_BACKENDS, okTargets, targets.length) }
  return v
}

function render() {
  const r = state.result
  if (!r) {
    editorFacts.textContent = state.error ?? ''
    editorFacts.classList.add('is-bad')
    alertBox.hidden = true
    for (const id of STAGES) { chips[id].dataset.state = 'bad'; chips[id].querySelector('.ts-chip-count').textContent = W.SAY_CHIP_STOPPED }
    panel.replaceChildren(el('p', { class: 'ts-bad' }, state.error ?? ''))
    return
  }
  editorFacts.classList.remove('is-bad')
  editorFacts.textContent = fill(W.SAY_EDITOR_FACTS, fmt(r.sourceLines), fmt(r.sourceBytes), state.ms < 10 ? state.ms.toFixed(1) : Math.round(state.ms))
  const v = verdicts(r)
  for (const id of STAGES) {
    chips[id].dataset.state = v[id].cls
    chips[id].querySelector('.ts-chip-count').textContent = v[id].count
  }
  renderAlert(r)
  renderStage()
}

function renderAlert(r) {
  const items = []
  for (const d of r.lexerDiscarded ?? []) items.push(fill(W.SAY_DROP_LEXER, d.line, JSON.stringify(d.char)))
  for (const s of r.swallowed ?? []) items.push(fill(W.SAY_DROP_SWALLOWED, s.line, s.what))
  for (const d of r.discarded ?? []) items.push(fill(W.SAY_DROP_DISCARDED, d))
  const nonAscii = (r.lexerDiscarded ?? []).some((d) => d.char.charCodeAt(0) > 127)
  const kids = []
  if (r.astError) kids.push(el('p', { class: 'ts-alert-title is-bad' }, fill(W.SAY_PARSE_STOPPED, r.astError)))
  if (items.length) {
    kids.push(el('p', { class: 'ts-alert-title' }, W.SAY_DROPPED_TITLE),
      el('p', { class: 'ts-alert-why' }, W.SAY_DROPPED_WHY),
      el('ul', {}, items.map((t) => el('li', {}, t))))
    if (nonAscii) kids.push(el('p', { class: 'ts-alert-why' }, W.SAY_DROP_BYTES_NOTE))
  }
  alertBox.hidden = kids.length === 0
  alertBox.classList.toggle('is-bad', !!r.astError)
  alertBox.replaceChildren(...kids)
}

function renderStage() {
  for (const id of STAGES) chips[id].setAttribute('aria-pressed', String(id === state.stage))
  const r = state.result
  if (!r) return
  const i = STAGES.indexOf(state.stage)
  const head = [el('h2', { class: 'ts-stage-name' }, `${i + 1}. ${(W.SAY_STAGE_NAMES || [])[i]}`), el('p', { class: 'ts-stage-line' }, (W.SAY_STAGE_LINES || [])[i])]
  const body = ({ source: sourcePanel, lexer: lexerPanel, parser: parserPanel, typecheck: typecheckPanel, hir: hirPanel, backends: backendsPanel })[state.stage](r)
  panel.replaceChildren(...head, ...body)
}

function sourcePanel(r) {
  const bytes = new TextEncoder().encode(state.source).slice(0, W.K_SOURCE_HEX_BYTES)
  const cells = [...bytes].map((b) => el('span', { class: 'ts-byte' },
    el('span', { class: 'ts-byte-ch' }, b === 10 ? '\u21b5' : b === 32 ? '\u2423' : b > 32 && b < 127 ? String.fromCharCode(b) : '\u00b7'),
    el('span', { class: 'ts-byte-hex' }, b.toString(16).padStart(2, '0'))))
  return [
    el('p', { class: 'ts-facts' }, fill(W.SAY_SOURCE_FACTS, fmt(r.sourceBytes), fmt(r.sourceLines))),
    el('p', { class: 'ts-sub' }, fill(W.SAY_SOURCE_HEX, bytes.length)),
    el('div', { class: 'ts-bytes' }, cells),
    el('p', { class: 'ts-sub' }, W.SAY_SOURCE_VIEW),
    sourceView(state.source, r.tokens ?? []),
  ]
}

function lexerPanel(r) {
  const tokens = r.tokens ?? []
  const shown = tokens.slice(0, W.K_MAX_TOKEN_CHIPS)
  const legend = el('p', { class: 'ts-legend' }, TOKEN_CLASSES.map((c, i) => el('span', { style: `color:${colorOf(c)}` }, (W.SAY_TOKEN_CLASSES || [])[i])))
  let line = 0
  const list = el('div', { class: 'ts-tokens' })
  for (const t of shown) {
    if (t.line !== line) { line = t.line; list.append(el('span', { class: 'ts-tok-line', 'aria-hidden': 'true' }, String(line))) }
    const c = classOfKind(t.kind)
    list.append(el('span', { class: 'ts-tok', style: `--tok:${colorOf(c)}`, title: `${t.kind} ${t.line}:${t.col}` },
      el('span', { class: 'ts-tok-lex' }, t.lexeme || '\u00a0'), el('span', { class: 'ts-tok-kind' }, t.kind)))
  }
  const out = [el('p', { class: 'ts-facts' }, fill(W.SAY_LEXER_FACTS, fmt(r.tokenCount))), legend, list]
  if (tokens.length > shown.length) out.push(el('p', { class: 'ts-sub' }, fill(W.SAY_MORE, fmt(tokens.length - shown.length))))
  return out
}

function nodeLabel(n) {
  const bits = []
  if (n.name) bits.push(['ts-n-name', n.name])
  if (n.op) bits.push(['ts-n-op', n.op])
  if (n.value != null && n.value !== '') bits.push(['ts-n-val', n.nodeKind === 'string' ? JSON.stringify(n.value) : String(n.value)])
  if (n.params?.length) bits.push(['ts-n-type', `(${n.params.map((p) => `${p.name}: ${p.type}`).join(', ')})`])
  if (n.returnType) bits.push(['ts-n-type', `-> ${n.returnType}`])
  else if (n.type) bits.push(['ts-n-type', `: ${n.type}`])
  return bits
}

function parserPanel(r) {
  if (r.astError) return [el('p', { class: 'ts-bad' }, fill(W.SAY_PARSE_STOPPED, r.astError))]
  const rows = el('div', { class: 'ts-tree' })
  let count = 0
  let more = 0
  const walk = (n, depth) => {
    if (count >= W.K_MAX_TREE_ROWS) { more += 1; for (const c of n.children ?? []) walk(c, depth + 1); return }
    count += 1
    rows.append(el('div', { class: 'ts-node', style: `--d:${depth}` },
      el('span', { class: 'ts-n-kind' }, n.kind),
      nodeLabel(n).map(([cls, text]) => [' ', el('span', { class: cls }, text)])))
    for (const c of n.children ?? []) walk(c, depth + 1)
  }
  walk(r.ast, 0)
  const out = [el('p', { class: 'ts-facts' }, fill(W.SAY_PARSER_FACTS, fmt(r.nodeCount), fmt(r.astDepth), fmt(r.topLevel))), rows]
  if (more) out.push(el('p', { class: 'ts-sub' }, fill(W.SAY_MORE, fmt(more))))
  return out
}

function typecheckPanel(r) {
  const tc = r.typecheck ?? {}
  if (r.astError) return [el('p', { class: 'ts-bad' }, fill(W.SAY_PARSE_STOPPED, r.astError))]
  if (tc.fatal) return [el('p', { class: 'ts-bad' }, fill(W.SAY_TC_FATAL, tc.fatal))]
  const msgs = tc.errors ?? []
  const warns = msgs.filter((m) => /^warning/i.test(m)).length || tc.warnings || 0
  const errs = tc.errorCount ?? (msgs.length - warns)
  const verdict = !tc.ok ? el('p', { class: 'ts-verdict is-bad' }, fill(W.SAY_TC_ERRORS, fmt(errs), fmt(warns)))
    : warns ? el('p', { class: 'ts-verdict is-warn' }, fill(W.SAY_TC_OK_WARN, fmt(warns)))
      : el('p', { class: 'ts-verdict is-ok' }, W.SAY_TC_OK)
  const out = [verdict]
  if (msgs.length) out.push(el('ul', { class: 'ts-msgs' }, msgs.map((m) => el('li', { class: /^warning/i.test(m) ? 'is-warn' : 'is-bad' }, m))))
  const okTargets = Object.values(r.targets ?? {}).filter((t) => t.ok).length
  if (!tc.ok && okTargets) out.push(el('p', { class: 'ts-note' }, W.SAY_TC_NOT_A_GATE))
  out.push(el('p', { class: 'ts-sub' }, W.SAY_TC_LIMITS))
  return out
}

function hirPanel(r) {
  if (!r.hir?.ok) return [el('p', { class: 'ts-bad' }, fill(W.SAY_HIR_FAILED, r.astError || r.hir?.error || ''))]
  return [
    el('p', { class: 'ts-facts' }, fill(W.SAY_HIR_FACTS, fmt(r.hir.text.split('\n').length))),
    el('p', { class: 'ts-note' }, W.SAY_HIR_FEEDS),
    el('pre', { class: 'ts-code' }, r.hir.text),
  ]
}

function backendsPanel(r) {
  const ids = W.SAY_TARGET_IDS || []
  const names = W.SAY_TARGET_NAMES || []
  const targets = ids.map((id) => r.targets?.[id] ?? {})
  const ok = targets.filter((t) => t.ok)
  if (!ids.includes(state.target)) state.target = ids[0]
  const picker = el('div', { class: 'ts-targets', role: 'group', 'aria-label': W.SAY_STAGE_NAMES?.[5] }, ids.map((id, i) => el('button', {
    type: 'button', class: `t27-btn ts-target${targets[i].ok ? '' : ' is-bad'}`, 'aria-pressed': String(id === state.target),
    onclick: () => { state.target = id; renderStage() },
  }, names[i], ' ', el('span', { class: 'ts-target-bytes' }, targets[i].ok ? fill(W.SAY_TARGET_BYTES, fmt(targets[i].bytes)) : W.SAY_CHIP_STOPPED))))
  const t = r.targets?.[state.target] ?? {}
  const out = [el('p', { class: 'ts-facts' }, fill(W.SAY_BACKENDS_FACTS, ok.length, ids.length, fmt(ok.reduce((s, x) => s + (x.bytes || 0), 0)))), picker]
  if (!t.ok) out.push(el('p', { class: 'ts-bad' }, fill(W.SAY_TARGET_FAILED, t.error || r.astError || '')))
  else {
    if (t.notEmitted) out.push(el('p', { class: 'ts-note' }, fill(W.SAY_NOT_EMITTED, fmt(t.notEmitted))))
    out.push(codeView(t.code, hl?.TARGET_LANG?.[state.target] ?? state.target))
  }
  return out
}

// --- start -----------------------------------------------------------------------------------------
async function main() {
  editor.value = (W.SAY_EXAMPLE_SOURCES || [])[0] ?? ''
  try { hl = await import('../../play/site.js') } catch { hl = null }
  try {
    await loadModule()
  } catch (e) {
    editorFacts.textContent = fill(W.SAY_LOAD_FAILED, e?.message || String(e))
    editorFacts.classList.add('is-bad')
    return
  }
  run()
}
main()
