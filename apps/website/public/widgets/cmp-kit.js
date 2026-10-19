// cmp-kit.js -- the drawing the t27-compiler widgets share, on top of hive-kit.js (sliders, chips, tap
// rows, meters, ladders, grids, verdict banners, the URL hash): a strip showing which of the nine steps of
// the course the lesson is in, a text box with sample lines, and a tape of cells that colours each
// character, token or word by the answer a compiled spec fn gave for it. It decides nothing about a
// compiler: every class, status, count and verdict a widget shows comes from that widget's
// ./logic.js, the fn bodies of one gHashTag/t27 spec compiled to wasm. Every word is a SAY_ and every
// range a K_ constant of the widget's own spec (window.T27_WIDGET). Inputs stay in this tab and in
// the URL hash; nothing is sent.
import { el, hue, say, K } from './hive-kit.js'

export * from './hive-kit.js'

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./cmp-kit.css', import.meta.url).href
document.head.appendChild(css)

/**
 * The nine steps of the course, one per module, as a bar. They are the course's own division, not the six stages of
 * pipeline.t27 (Lex, Parse, TypeCheck, Optimize, Codegen, Link): the lesson's step is lit
 * and named under the bar. Words are SAY_STAGES and SAY_STAGE_LINE, the index is K_STAGE.
 */
export function stages() {
  const at = K('K_STAGE', 0)
  const names = [...Array(9)].map((_, i) => say('SAY_STAGES', i))
  const bar = el('ol', { class: 'cc-stages', 'aria-label': say('SAY_STAGE_LINE') }, names.map((n, i) => el('li', { class: i === at ? 'cc-on' : i < at ? 'cc-past' : '', 'aria-current': i === at ? 'step' : null, title: n })))
  return el('div', { class: 'cc-stage-box' }, bar, el('p', { class: 'cc-stage-name' }, `${at + 1} / 9 ${names[at]}`))
}

/** Reads and writes one text value in the URL hash (#t=...), so a link carries the line the reader typed. */
const hashText = () => new URLSearchParams(location.hash.slice(1)).get('t')
const saveText = (v) => history.replaceState(null, '', `#${new URLSearchParams([['t', v]])}`)

/**
 * A text box with sample lines to start from. o: { label, samples: [text], start: index, max, onChange(text) }.
 * Returns { node, get, set, start }. The text lives in the hash; a sample button fills the box.
 */
export function textBox(o) {
  let text = ''
  const input = el('input', { class: 'cc-input', type: 'text', id: 'cc-text', maxlength: o.max ?? 60, spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', 'aria-label': o.label })
  const row = el('div', { class: 'dk-presets', role: 'group', 'aria-label': say('SAY_PRESETS_LABEL') })
  const buttons = (o.samples ?? []).map((s, i) => {
    const b = el('button', { class: 't27-btn dk-preset cc-sample', type: 'button' }, s === '' ? say('SAY_EMPTY') : s)
    b.addEventListener('click', () => { set(s); mark(i); o.onChange(text) })
    row.append(b)
    return b
  })
  const mark = (i) => buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)))
  function set(v) {
    text = String(v).slice(0, o.max ?? 60)
    input.value = text
    saveText(text)
    mark((o.samples ?? []).indexOf(text))
  }
  input.addEventListener('input', () => { set(input.value); o.onChange(text) })
  const node = el('div', { class: 'dk-panel' },
    el('label', { class: 'dk-label', for: 'cc-text' }, o.label),
    input,
    buttons.length ? el('p', { class: 'dk-label cc-try' }, say('SAY_PRESETS_LABEL')) : null,
    buttons.length ? row : null)
  return {
    node,
    get: () => text,
    set: (v) => { set(v); o.onChange(text) },
    start() {
      const h = hashText()
      set(h != null ? h : (o.samples ?? [''])[o.start ?? 0])
      o.onChange(text)
    },
  }
}

/**
 * A tape of cells, one per character, token or step. cells: [{ main, sub, tone, on }]; the main text is
 * big, the sub text (an index, a code) small under it. onTap(i) makes the cells buttons.
 */
export function tape(cells, onTap) {
  return el('div', { class: 'cc-tape', role: 'list' }, cells.map((c, i) => {
    const kids = [el('b', {}, c.main === ' ' ? '␣' : c.main === '\t' ? '⇥' : c.main), c.sub != null ? el('i', {}, String(c.sub)) : null]
    const node = onTap
      ? el('button', { class: `cc-cell ${c.on ? 'cc-sel' : ''}`, type: 'button', role: 'listitem', style: `--hc:${c.color}` }, kids)
      : el('div', { class: `cc-cell ${c.on ? 'cc-sel' : ''}`, role: 'listitem', style: `--hc:${c.color}` }, kids)
    if (onTap) node.addEventListener('click', () => onTap(i))
    return node
  }))
}

/** A key / value list: rows [{ label, value, tone }], the value in its colour. */
export function facts(rows) {
  return el('dl', { class: 'cc-facts' }, rows.flatMap((r) => [el('dt', {}, r.label), el('dd', { style: r.color ? `--hc:${r.color}` : null }, String(r.value))]))
}

/** A legend: [{ label, color }] as small swatches. */
export function legend(items) {
  return el('p', { class: 'cc-legend' }, items.map((it) => el('span', { style: `--hc:${it.color}` }, it.label)))
}

/** A line of monospace text shown as written, with an optional caption above it. */
export function code(text, caption) {
  return el('div', { class: 'cc-code' }, caption ? el('p', { class: 'dk-label' }, caption) : null, el('pre', {}, text))
}

/**
 * For each of the 32 bits of a word: which decoded field reads it. fields: functions of a word, in order of
 * priority. A bit belongs to the first field whose value changes when the bit is flipped, and to
 * fields.length (nobody) when no field notices. The decoding is the caller's compiled spec fns, not a table
 * kept here.
 */
export function bitOwners(word, fields) {
  const base = fields.map((f) => f(word))
  return [...Array(32)].map((_, i) => {
    const flipped = (word ^ (1 << i)) >>> 0
    const k = fields.findIndex((f, j) => f(flipped) !== base[j])
    return k < 0 ? fields.length : k
  })
}

/** A 32-bit word as four rows of eight bits, most significant byte first, each bit in the colour of its owner. */
export function wordTape(word, owners, toneOf) {
  const bit = (i) => ({ main: String((word >>> i) & 1), sub: i, color: hue(toneOf(owners[i])) })
  return el('div', { class: 'cc-word' }, [3, 2, 1, 0].map((byte) => tape([...Array(8)].map((_, k) => bit(byte * 8 + 7 - k)), null)))
}
