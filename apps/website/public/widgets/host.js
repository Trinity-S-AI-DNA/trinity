// host.js -- the one host every native widget shares: glue between the page and a widget's wasm.
// The widget (a .t27 spec built to wasm) owns the state and writes the page's HTML; this file only forwards
// events and data, sets the HTML, keeps the focused control and open <details>, and runs the effects the wasm asks for.
// It holds no widget logic and no words. Every export is optional (a missing one is a no-op). Where two widgets give one name
// two signatures, the arity decides: w_effect/2 (dst,cap: one text) vs /3 (k,dst,cap: opcodes); w_drag/1 (phase) vs /2 (zone,on);
// w_file/6 (name, size and text in one call) vs /4 (zone,name,size; the bytes follow in w_file_data).
const W = window.T27_WIDGET || {}, root = document.getElementById('widget'), dec = new TextDecoder(), enc = new TextEncoder()
const x = (await WebAssembly.instantiate(await (await fetch(new URL('./widget.wasm', location.href))).arrayBuffer(), {})).instance.exports
const call = (f, ...a) => (x[f] ? x[f](...a) : 0), CAP = 1 << 20, BIGCAP = 2097152
let IN = x.memory.grow(1) * 65536, INCAP = 65536; const OUT = x.memory.grow(CAP / 65536) * 65536, mem = () => new Uint8Array(x.memory.buffer), get = (n) => dec.decode(mem().subarray(OUT, OUT + n))
const room = (n) => { if (n > INCAP) { INCAP = n; IN = x.memory.grow(Math.ceil(n / 65536)) * 65536 } }   // the input stage grows to fit
const put = (s, off = 0) => { const b = typeof s === 'string' ? enc.encode(s) : s; room(off + b.length); mem().set(b, IN + off); return b.length }
const tx = (f, s, pre = [], post = []) => { const n = put(s); return call(f, ...pre, IN, n, ...post) }   // stage s, then call f(...pre, ptr, len, ...post): IN may move, so read it after put
const ctl = (r) => [...r.querySelectorAll('input,textarea')], bts = (r) => [...r.querySelectorAll('button')], zones = () => [...root.querySelectorAll('.t27-drop')]
const FOC = 'input,textarea,button,svg[tabindex]', zone = (ev) => ev.target.closest && ev.target.closest('.t27-drop'), svgOf = (ev) => ev.target.closest && ev.target.closest('svg')
document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('./tool.css', location.href).href }))
// libm service: the wasm queues the Math.* calls it lacks, the host answers and the page is drawn again
const LIB = x.memory.grow(2) * 65536, MATH = [Math.sin, Math.cos, Math.atan2, Math.log2, Math.log10, Math.pow, (a) => digits(a)[0], (a) => digits(a)[1], (a) => digits(a)[2], (a, b) => Number(String(a) + String(Math.floor(b / 1000)).padStart(8, '0') + 'e' + (b % 1000 - 500))]
const digits = (a) => { const t = String(a), [m, e = '0'] = t.split('e'), [ip, fp = ''] = m.split('.'), all = ip + fp, lead = all.match(/^0*/)[0].length, d = all.slice(lead).replace(/0+$/, '') || '0'; return [+(d.slice(0, -8) || 0), +d.slice(-8), ip.length - lead + +e] }   // String()'s own shortest digits: [digits div 1e8, digits mod 1e8, point position]
function page() {
  for (let k = 0, n, need; ; k++) {
    n = x.w_render(OUT, CAP); need = call('w_libm_need', LIB, 98304)
    if (!need || k > 24) return get(n)
    const f = new Float64Array(x.memory.buffer, LIB, need * 3), r = Array.from({ length: need }, (_, i) => MATH[f[i * 3]](f[i * 3 + 1], f[i * 3 + 2]))
    new Float64Array(x.memory.buffer, LIB, need).set(r); x.w_libm_give(LIB, need)
  }
}
if (x.w_theme) { const css = getComputedStyle(document.documentElement); tx('w_theme', ['bg', 'panel', 'line', 'green', 'gold', 'red', 'text', 'muted', 'subtle'].map((k) => css.getPropertyValue('--w-' + k).trim() || (x.w_size && x.w_size.length === 4 ? '' : '#888')).join('\n') + '\n') }
let lastPx = -1, raf = 0
const four = x.w_size && x.w_size.length === 4   // w_size/4 (diagram, root, window height, embed) vs /1 (diagram)
const measure = () => { const d = x.w_size && root.querySelector('.fk-diagram'), px = d ? d.clientWidth || 0 : 0, k = four ? px + ':' + (root.clientWidth || 0) + ':' + window.innerHeight : px; if (!x.w_size || k === lastPx) return false; lastPx = k; return !!(four ? x.w_size(px, root.clientWidth || 0, window.innerHeight, +document.documentElement.classList.contains('embed')) : x.w_size(px)) }
if (x.w_size && typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (measure()) draw() }).observe(root)
// animation: w_anim says whether the widget wants frames; w_frame answers each with DOM patches "selector@n <tab> a|s|t|c <tab> name <tab> value"
const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }; const env = () => call('w_env', mq.matches ? 1 : 0, document.hidden ? 1 : 0), stamp = () => { view(); call('w_now', performance.now()) }
const patch = (s) => s.split('\n').forEach((l) => { const [sel, k, n, v] = l.split('\t'), [q, i] = (sel || '').split('@'), e = q && root.querySelectorAll(q)[+i]; if (e) k === 'a' ? e.setAttribute(n, v) : k === 's' ? (e.style[n] = v) : k === 't' ? (e.textContent = v) : e.classList.toggle(n, v === '1') })
// canvas: w_draw returns a draw list (canvas_out.t27) replayed on the page's <canvas>; w_view hands the wasm the window numbers tool.js read
const view = () => call('w_view', root.clientWidth, window.devicePixelRatio, document.documentElement.classList.contains('embed') ? 1 : 0)
function replay(buf) {
  const css = {}, st = getComputedStyle(document.documentElement); let ctx
  for (const [op, name, ...a] of JSON.parse('[' + dec.decode(buf).slice(0, -1) + ']')) {
    const r = a.map((v) => (v && v.v ? (css[v.v] ??= st.getPropertyValue(v.v).trim()) || v.f : v))
    if (op === 'c') ctx = root.querySelectorAll('canvas')[name]?.getContext('2d')
    else if (ctx && name in ctx) op === 's' ? (ctx[name] = r[0]) : ctx[name](...r)
  }
}
let rt = 0; if (x.w_resize) window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { stamp(); call('w_resize'); done() }, 120) })
const frame = (t) => { raf = 0; const n = call('w_frame', t, OUT, CAP); if (n) patch(get(n)); pump() }
const pump = () => { if (!x.w_anim) return; if (call('w_anim')) { if (!raf) raf = requestAnimationFrame(frame) } else if (raf) { cancelAnimationFrame(raf); raf = 0 } }
function draw() {
  const a = document.activeElement, s = a && a.selectionStart, e = a && a.selectionEnd, fi = a ? [...root.querySelectorAll(FOC)].indexOf(a) : -1
  const sel = a && (a.id ? '#' + a.id : a.dataset && a.dataset.i != null ? '[data-i="' + a.dataset.i + '"]' : ''), open = [...root.querySelectorAll('details')].map((d) => d.open)
  const keep = new Map(ctl(root).map((c, i) => [c.id || '~' + i, c])), t = document.createElement('template'); t.innerHTML = page()
  ctl(t.content).forEach((c, i) => {   // a control keeps its element (typed text, selection, files), matched by id or place; its attributes follow the page
    const o = keep.get(c.id || '~' + i); if (!o) return
    if (c.hasAttribute('value') && o.value !== c.getAttribute('value')) o.value = c.getAttribute('value')
    for (const n of c.attributes) if (n.name !== 'value' && o.getAttribute(n.name) !== n.value) o.setAttribute(n.name, n.value)
    for (const n of [...o.attributes]) if (n.name !== 'value' && !c.hasAttribute(n.name)) o.removeAttribute(n.name)
    c.replaceWith(o)
  })
  if (!x.w_toggle) t.content.querySelectorAll('details').forEach((d, i) => { if (open[i]) d.open = true })
  root.replaceChildren(t.content)
  if (x.w_draw) replay(mem().subarray(OUT, OUT + x.w_draw(OUT, CAP)))
  if (x.w_value) { room(BIGCAP); root.querySelectorAll('input,textarea').forEach((c, i) => { const n = x.w_value(i, IN, BIGCAP) >>> 0; if (n !== 4294967295) c.value = dec.decode(mem().subarray(IN, IN + n)) }) }
  const f = a && (a.isConnected ? a : (sel && root.querySelector(sel)) || (fi >= 0 && root.querySelectorAll(FOC)[fi])); if (f) { f.focus(); if (s != null && f.setSelectionRange) try { f.setSelectionRange(s, e) } catch {} }
  if (measure()) draw()
  const tip = x.w_tipsize && root.querySelector('.cc-tip'); if (tip && !tip.hidden && x.w_tipsize(tip.offsetWidth, tip.offsetHeight)) draw()
}
// effects: /3 asks by number k: 'v' set a control's value, 's' select it, 'c' copy the page URL (w_copied answers), 't' timer (w_timer answers)
// /2 gives one text: a selector to scroll into view, or (first char U+0001) "save the SVG found by selector, named ..."
function fx(c) {
  if (c[0] !== '\u0001') { root.querySelector(c)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return }
  const [sel, name] = c.slice(1).split('\n'), svg = root.querySelector(sel); if (!svg) return
  const copy = svg.cloneNode(true), [, , vw, vh] = copy.getAttribute('viewBox').split(' '); copy.setAttribute('width', vw); copy.setAttribute('height', vh)
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' })), a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function effects() {
  if (!x.w_effect) return; if (x.w_effect.length < 3) { const q = x.w_effect(OUT, CAP); if (q > 0) fx(get(q)); return }
  for (let k = 0, n; (n = x.w_effect(k, OUT, CAP)); k++) {
    const m = mem().slice(OUT, OUT + n)
    if (m[0] === 118) ctl(root)[m[1]].value = dec.decode(m.subarray(2))
    else if (m[0] === 115) ctl(root)[m[1]].select()
    else if (m[0] === 99) { const u = new URL(location.href); u.searchParams.delete('embed'); Promise.resolve().then(() => navigator.clipboard.writeText(u.href)).then(() => 1, () => 0).then((g) => { call('w_copied', g); done() }) }
    else if (m[0] === 116) { const id = m[1]; setTimeout(() => { call('w_timer', id); done() }, +dec.decode(m.subarray(2))) }
  }
}
function done() { draw(); effects(); pump(); const n = call('w_hash_out', OUT, CAP); if (n) history.replaceState(null, '', get(n)) }
async function file(z, f) {   // a picked or dropped file
  if (!f || !x.w_file) return
  if (x.w_file.length > 4) {   // name and text in one call; the text is left out above 2 MiB
    let t = new Uint8Array(0), st = 0; try { if (f.size <= BIGCAP) t = enc.encode(await f.text()) } catch { st = 1 }
    const nm = enc.encode(f.name).subarray(0, 1024), n = Math.min(t.length, BIGCAP); put(t.subarray(0, n), 1024); put(nm)
    call('w_file', IN, nm.length, f.size, IN + 1024, n, st); return done()
  }
  const go = tx('w_file', f.name, [z], [f.size]); done(); if (!go) return   // /4: w_file says whether it wants the bytes
  try { tx('w_file_data', new Uint8Array(await f.arrayBuffer()), [z]) } catch { call('w_file_failed', z) }
  done()
}
// ph: 0 over, 1 leave, 2 drop
const drag = (ev, ph) => { const z = zone(ev); if (z && x.w_drag) { if (ph < 2) ev.preventDefault(); if (x.w_drag.length > 1 ? x.w_drag(zones().indexOf(z), +(ph === 0)) : x.w_drag(ph)) done() } return z }
const at = (ev) => { const s = root.querySelector('svg'); if (s) { const b = s.getBoundingClientRect(); call('w_pointer', (ev.clientX - b.left) / b.width); done() } }
const box = x.w_pointer && x.w_pointer.length === 5   // w_pointer/5 (kind, x, y, width, height in the svg's box) vs /1 (a fraction along the first svg)
function point(ev, k) {
  const s = svgOf(ev)
  if (box) { if (s) { const r = s.getBoundingClientRect(); x.w_pointer(k === 1 ? 1 : 0, ev.clientX - r.left, ev.clientY - r.top, r.width, r.height); done() } return }
  const m = s && s.getScreenCTM && s.getScreenCTM(); if (!m) return; const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse()); call('w_point', k, p.x, p.y); done() }
root.addEventListener('input', (ev) => { const i = ctl(root).indexOf(ev.target); if (i >= 0) { stamp(); tx('w_input', ev.target.value, [i]); done() } })
root.addEventListener('change', (ev) => { if (ev.target.type === 'file') file(zones().indexOf(zone(ev)), ev.target.files && ev.target.files[0]); else { const i = ctl(root).indexOf(ev.target); if (i >= 0 && x.w_change) { tx('w_change', ev.target.value, [i]); done() } } })
root.addEventListener('click', (ev) => {
  const b = x.w_press ? ev.target.closest('button') : ev.target.closest('[data-i]') || ev.target.closest('button')   // w_press(button index) or w_click(data-i, else button index)
  if (b) { stamp(); call(x.w_press ? 'w_press' : 'w_click', !x.w_press && b.dataset.i != null ? +b.dataset.i : bts(root).indexOf(b)); done() } else if (x.w_point || box) point(ev, 2)
})
root.addEventListener('toggle', (ev) => { if (x.w_toggle && ev.target.tagName === 'DETAILS' && call('w_toggle', [...root.querySelectorAll('details')].indexOf(ev.target), ev.target.open ? 1 : 0)) done() }, true)
root.addEventListener('pointerdown', (ev) => { if (box) point(ev, 0); else if (x.w_pointer && svgOf(ev)) { root.setPointerCapture(ev.pointerId); at(ev) } })
root.addEventListener('pointermove', (ev) => { if (box || (x.w_point && ev.pointerType === 'mouse')) point(ev, 0); if (!box && x.w_pointer && root.hasPointerCapture(ev.pointerId)) at(ev) })
root.addEventListener('pointerleave', (ev) => { if (box && ev.target.localName === 'svg' && ev.pointerType === 'mouse') point(ev, 1); else if (x.w_point && ev.target.localName === 'svg') { call('w_point', 1, 0, 0); done() } }, true)
root.addEventListener('keydown', (ev) => { if (x.w_key && svgOf(ev) && tx('w_key', ev.key)) { ev.preventDefault(); done() } })
for (const t of ['dragenter', 'dragover', 'dragleave']) root.addEventListener(t, (ev) => { if (!drag(ev, +(t === 'dragleave')) && x.w_drop_root) ev.preventDefault() })
root.addEventListener('drop', (ev) => { const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0], z = drag(ev, 2); if (z) { ev.preventDefault(); file(zones().indexOf(z), f) } else if (x.w_drop_root && !ev.defaultPrevented) { ev.preventDefault(); file(0, f) } })
const resync = () => { env(); stamp(); call('w_resync'); done() }; if (x.w_resync) { document.addEventListener('visibilitychange', resync); if (mq.addEventListener) mq.addEventListener('change', resync) }
window.addEventListener('hashchange', () => { tx('w_hash', location.hash); draw(); effects(); pump() })
tx('w_base', new URL('./', location.href).href); call('w_seed', (window.T27_SEED ?? Math.random() * 4294967296) >>> 0); env(); tx('w_init', location.hash); draw(); pump()
for (const [i, u] of [].concat(W.W_DATA_FILES || W.W_DATA_FILE || W.K_DATA_FILES || W.K_DATA_FILE || W.K_DATA || W.K_DATA_JSON || []).entries()) {
  try {   // the bytes get a fresh region of their own: the file may be larger than the stage
    const r = await fetch(new URL(u, location.href), { credentials: 'omit' }); if (!r.ok) throw new Error('HTTP ' + r.status)
    const b = new Uint8Array(await r.arrayBuffer()), p = x.memory.grow(Math.ceil(b.length / 65536) + 1) * 65536
    if (x.w_data_failed && x.w_data_failed.length > 1 && /\.json$/.test(u)) JSON.parse(dec.decode(b))   // w_data_failed/3 wants the reason as text
    mem().set(b, p); stamp(); call('w_data', i, p, b.length)
  } catch (e) { if (x.w_data_failed && x.w_data_failed.length > 1) tx('w_data_failed', String(e && e.message), [i]); else call('w_data_failed', i) }
  done()
}
