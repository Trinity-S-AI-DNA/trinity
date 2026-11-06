// host.js -- the one host every native widget shares: glue between the page and a widget's wasm.
// The widget (a .t27 spec built to wasm) owns the state and writes the page's HTML; this file forwards events and data, sets the HTML,
// keeps the focused control and open <details>, replays draw lists and runs the effects the wasm asks for. It holds no widget logic and
// no words. Every export is optional (a missing one is a no-op). Where two widgets give one name two signatures, the export's arity decides:
//   w_effect  /3 (k,dst,cap: opcodes)      /2 (dst,cap: one text)       w_drag  /2 (zone,on)    /1 (phase)
//   w_file    /6 (name,size,text at once)  /4 (zone,name,size; bytes follow in w_file_data)
//   w_size    /1 (diagram px) /2 (px,py of w_measure_sel) /4 (px,root width,window height,embed)       w_pointer /1 (fraction) /5 (kind,x,y,w,h)
//   w_data_failed /1 (i) /2 (i,status) /3 (i,reason text)   w_press(button) else w_click(data-i, else button)   w_view: w_box present ? (.., window height,
//   box width) : (.., canvas width, its parent's width).  A page with w_card (a card painted off-page) also uses w_meas_need/w_meas_give and effect 'p' = w,h,name.
const W = window.T27_WIDGET || {}, root = document.getElementById('widget'), dec = new TextDecoder(), enc = new TextEncoder()
const x = (await WebAssembly.instantiate(await (await fetch(new URL('./widget.wasm', location.href))).arrayBuffer(), {})).instance.exports
const call = (f, ...a) => (x[f] ? x[f](...a) : 0), CAP = 1 << 20, BIGCAP = 2097152, grow = (n) => x.memory.grow(Math.ceil(n / 65536)) * 65536
let IN = grow(65536), INCAP = 65536; const OUT = grow(CAP), mem = () => new Uint8Array(x.memory.buffer), get = (n) => dec.decode(mem().subarray(OUT, OUT + n))
const room = (n) => { if (n > INCAP) { INCAP = n; IN = grow(n) } }   // the input stage grows to fit
const put = (s, off = 0) => { const b = typeof s === 'string' ? enc.encode(s) : s; room(off + b.length); mem().set(b, IN + off); return b.length }
const tx = (f, s, pre = [], post = []) => { const n = put(s); return call(f, ...pre, IN, n, ...post) }   // stage s, then call f(...pre, ptr, len, ...post): IN may move, so read it after put
const sel = (f, d) => (x[f] ? get(x[f](OUT, CAP)) : d), DZ = () => sel('w_drag_sel', '.t27-drop'), arity = (f) => (x[f] ? x[f].length : 0)
const ctl = (r) => [...r.querySelectorAll('input,textarea')], bts = (r) => [...r.querySelectorAll('button')], zones = () => [...root.querySelectorAll(DZ())]
const FOC = 'input,textarea,button,svg[tabindex]', zone = (ev) => ev.target.closest && ev.target.closest(DZ()), svgOf = (ev) => ev.target.closest && ev.target.closest('svg'), cv = (ev) => ev.target.closest && ev.target.closest('canvas')
const loc = (ev, c) => { const r = c.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top] }, rootCss = () => getComputedStyle(document.documentElement), embed = () => +document.documentElement.classList.contains('embed')
document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('./tool.css', location.href).href }))
// libm service: the wasm queues the Math.* calls it lacks (0..5 sin cos atan2 log2 log10 pow, 6..9 the digits of String(a), 16 exp), the host answers, the page is drawn again
const digits = (a) => { const t = String(a), [m, e = '0'] = t.split('e'), [ip, fp = ''] = m.split('.'), all = ip + fp, lead = all.match(/^0*/)[0].length, d = all.slice(lead).replace(/0+$/, '') || '0'; return [+(d.slice(0, -8) || 0), +d.slice(-8), ip.length - lead + +e] }   // [digits div 1e8, digits mod 1e8, point position]
const LIB = grow(131072), MATH = [Math.sin, Math.cos, Math.atan2, Math.log2, Math.log10, Math.pow, (a) => digits(a)[0], (a) => digits(a)[1], (a) => digits(a)[2], (a, b) => Number(String(a) + String(Math.floor(b / 1000)).padStart(8, '0') + 'e' + (b % 1000 - 500))]; MATH[16] = Math.exp
const libm = (need) => {
  const f = new Float64Array(x.memory.buffer, LIB, need * 3), r = Array.from({ length: need }, (_, i) => MATH[f[i * 3]](f[i * 3 + 1], f[i * 3 + 2]))
  new Float64Array(x.memory.buffer, LIB, need).set(r); x.w_libm_give(LIB, need)
}
// a draw list can be far bigger than the page buffer: a page that says so (w_draw_cap) gets a region of that size
const DCAP = call('w_draw_cap') || CAP, DRAW = DCAP > CAP ? grow(DCAP) : OUT, FCAP = call('w_file_cap') || BIGCAP, MEAS = x.w_meas_need ? grow(524288) : 0
// what a render or a draw list asked the host for: text widths (w_text_need / w_meas_need) or Math.* answers (w_libm_need); true when something was answered and the page must be built again
function ask() {
  const q = call('w_text_need', LIB, 98304), m = !q && x.w_meas_need ? x.w_meas_need(MEAS, 524288) : 0, l = q || m ? 0 : call('w_libm_need', LIB, 98304)
  if (q) giveText(q); else if (m) giveMeas(m); else if (l) libm(l)
  return q || m || l
}
function page() {
  for (let k = 0, n, cq; ; k++) {
    n = x.w_render(OUT, CAP); if (k > 3000) return get(n)
    if (ask()) continue
    cq = call('w_compile_need', COMP, 524288); if (!cq || !compile(cq - 1)) return get(n)   // compile() is false while the compiler module still loads
  }
}
// compiler service: w_compile_need(dst, cap) writes the source to compile and returns 1 + its length (0: none asked); the host runs t27_analyze of
// t27/t27_compiler.wasm and answers w_compile_give(ptr, len, ok, t0, t1): ok 0 = the JSON, 1 = the compiler trapped (message), 2 = the module did not load (message)
const COMP = x.w_compile_need ? grow(524288) : 0
let CMOD = null, CINST = null, CLOAD = null, CFAIL = null, CTOLD = false, CREG = 0, CREGN = 0
function give(ok, b, t0 = 0, t1 = 0) { if (b.length > CREGN) { CREGN = b.length + 65536; CREG = grow(CREGN) } mem().set(b, CREG); call('w_compile_give', CREG, b.length, ok, t0, t1) }
function compile(len) {
  if (!CMOD) {
    CLOAD ??= fetch(new URL('../../t27/t27_compiler.wasm', location.href), { credentials: 'omit' }).then(async (r) => { if (!r.ok) throw new Error('HTTP ' + r.status); CMOD = await WebAssembly.compile(await r.arrayBuffer()) }).catch((e) => { CFAIL = enc.encode(e?.message || String(e)) }).then(done)
    if (!CFAIL) return false   // still loading: the request stays asked, done() runs when the module is there
    if (!CTOLD) { CTOLD = true; give(2, CFAIL); return true }   // the first request learns that the module did not load; later ones meet the same error tool.js does
  }
  const src = mem().slice(COMP, COMP + len)
  try {
    CINST ??= new WebAssembly.Instance(CMOD, {})
    const w = CINST.exports, p = w.t27_alloc(src.length)
    new Uint8Array(w.memory.buffer, p, src.length).set(src)
    const t0 = performance.now(), o = w.t27_analyze(p, src.length), t1 = performance.now(), n = new DataView(w.memory.buffer).getUint32(o, true)
    const out = new Uint8Array(w.memory.buffer, o + 4, n).slice(); w.t27_free(o, 4 + n); give(0, out, t0, t1)
  } catch (e) { CINST = null; give(1, enc.encode(e?.message || String(e))) }
  return true
}
if (x.w_theme) { const css = rootCss(); tx('w_theme', ['bg', 'panel', 'line', 'green', 'gold', 'red', 'text', 'muted', 'subtle'].map((k) => css.getPropertyValue('--w-' + k).trim() || (arity('w_size') === 4 ? '' : '#888')).join('\n') + '\n') }
if (x.w_mono) tx('w_mono', rootCss().getPropertyValue('--w-mono').trim())
let lastPx = -1, raf = 0, msel = null
const boxSel = () => (msel ??= sel('w_measure_sel', '.fk-diagram')), box = () => root.querySelector(boxSel())
const measure = () => {
  if (!x.w_size) return false; const d = box(), px = d ? d.clientWidth || 0 : 0, py = d ? d.clientHeight || 0 : 0
  const a = arity('w_size') === 4 ? [px, root.clientWidth || 0, window.innerHeight, embed()] : [px, py].slice(0, arity('w_size')), k = a.join(':')
  if (k === lastPx) return false; lastPx = k; return !!x.w_size(...a)
}
if ((x.w_size || x.w_box || (x.w_view && x.w_draw)) && typeof ResizeObserver !== 'undefined') new ResizeObserver(() => {
  if (x.w_box) { view(); const d = box(); if (call('w_box', d ? d.clientWidth || 0 : 0, d ? d.clientHeight || 0 : 0)) draw() } else if (x.w_size) { if (measure()) draw() } else { view(); draw() }
}).observe(root)
// animation: w_anim says whether the widget wants frames; w_frame answers each with DOM patches "selector@n <tab> a|s|t|c <tab> name <tab> value"
const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }; const env = () => call('w_env', mq.matches ? 1 : 0, document.hidden ? 1 : 0)
const clock = () => { call('w_now', performance.now()); call('w_wall', Date.now()) }, stamp = () => { view(); clock(); if (x.w_rand) x.w_rand(Math.random()) }
const patch = (s) => s.split('\n').forEach((l) => { const [sl, k, n, v] = l.split('\t'), [q, i] = (sl || '').split('@'), e = q && root.querySelectorAll(q)[+i]; if (e) k === 'a' ? e.setAttribute(n, v) : k === 's' ? (e.style[n] = v) : k === 't' ? (e.textContent = v) : e.classList.toggle(n, v === '1') })
// canvas: w_view hands the wasm the window numbers tool.js read; w_draw (JSON lines, canvas_out.t27), w_bdraw (binary) or w_card (JSON, off-page) return a draw list
let lastCv = ''
const cvVals = () => { const c = root.querySelector('canvas'); return [c ? c.clientWidth : 0, c && c.parentElement ? c.parentElement.clientWidth : 0] }   // the map's own width and its section's
const view = () => {
  const d = x.w_measure_sel && box(), ex = x.w_box ? [window.innerHeight, d ? d.clientWidth || 0 : 0] : cvVals()
  lastCv = ex.join(); const rv = call('w_view', root.clientWidth, window.devicePixelRatio, embed(), ...ex)
  if (x.w_rect_sel) { const e = root.querySelector(sel('w_rect_sel')); if (e) { const b = e.getBoundingClientRect(); call('w_rect', b.width, b.height) } }
  return rv
}
function replay(buf, target) {   // target: the canvas a list without an on-page canvas draws on
  const css = {}, st = rootCss(); let ctx
  for (const [op, name, ...a] of JSON.parse('[' + dec.decode(buf).slice(0, -1) + ']')) {
    const r = a.map((v) => (v && v.v ? (v.p || '') + ((css[v.v] ??= st.getPropertyValue(v.v).trim()) || v.f) : v))
    if (op === 'c') ctx = (target || root.querySelectorAll('canvas')[name])?.getContext('2d')
    else if (op === 'x') { if (ctx) { ctx.font = r[1]; let t = name; while (t.length > 1 && ctx.measureText(t).width > r[0]) t = t.slice(0, -2) + '~'; ctx.fillText(t, r[2], r[3]) } }   // fit(): shrink by slice(0,-2)+'~' until it measures within r[0]
    else if (ctx && name in ctx) op === 's' ? (ctx[name] = r[0]) : ctx[name](...r)
  }
}
// text widths: while a draw list needs ctx.measureText widths the wasm does not have, w_text_need lists them (u32 font length, u32 text length, font, text), the host
// measures them on a scratch canvas and w_text_give hands the widths (f64) back; w_meas_need/w_meas_give is the older form: NUL-separated font, text pairs, widths one per line
const scratch = () => (giveText.c ??= document.createElement('canvas').getContext('2d')), fontOf = (f) => f.replace(/\{(--[\w-]+)\|([^}]*)\}/g, (_, v, d) => rootCss().getPropertyValue(v).trim() || d)   // a font may name a css variable as {--var|fallback}
function giveText(q) {
  const m = mem().slice(LIB, LIB + 98304), v = new DataView(m.buffer), sc = scratch(), w = []
  for (let i = 0, p = 0; i < q; i++) { const fl = v.getUint32(p, true), tl = v.getUint32(p + 4, true); p += 8; sc.font = cssSub(dec.decode(m.subarray(p, p + fl))); p += fl; w.push(sc.measureText(dec.decode(m.subarray(p, p + tl))).width); p += tl }
  new Float64Array(x.memory.buffer, LIB, q).set(w); x.w_text_give(LIB, q)
}
function giveMeas(q) {
  const a = dec.decode(mem().subarray(MEAS, MEAS + q)).split('\0'), sc = scratch(), w = []
  for (let i = 0; i + 1 < a.length; i += 2) { sc.font = fontOf(a[i]); w.push(sc.measureText(a[i + 1]).width) }
  tx('w_meas_give', w.join('\n'))
}
function listOf(fn) { for (let k = 0; ; k++) { const n = x[fn](DRAW, DCAP); if (k > 3000 || !ask()) return n } }   // built again until the page has every width and libm answer it asked for
function drawList() { const n = listOf(x.w_bdraw ? 'w_bdraw' : 'w_draw'); (x.w_bdraw ? replayBin : replay)(mem().subarray(DRAW, DRAW + n)) }
// the binary draw list: op byte, then f64 little endian / u16-length strings (op 200 picks canvas i; on a given canvas it is ignored)
const cssSub = (r) => (r.includes('\u0001') || r.includes('\u0004') ? r.replace(/\u0001([^\u0002]*)\u0002([^\u0003]*)\u0003/g, (_, a, b) => rootCss().getPropertyValue(a).trim() || b).replace(/\u0004([^\u0005]*)\u0005([^\u0006]*)\u0006/g, (_, a, b) => getComputedStyle(root).getPropertyValue(a) || b) : r)
function replayBin(buf, cnv) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), N = [0, 'beginPath', 'closePath', 'fill', 'stroke', 'save', 'restore', 'moveTo', 'lineTo', 'translate', 'fillRect', 'strokeRect', 'setTransform', 'fillText', 'clearRect', 'rect', 'clip', 'setLineDash', 'arc'], P = { 32: 'fillStyle', 33: 'strokeStyle', 34: 'lineWidth', 35: 'font', 36: 'textBaseline', 37: 'textAlign', 38: 'globalAlpha' }, K = [0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 4, 4, 6, 0, 4, 4, 0, 0, 5]
  let ctx = cnv && cnv.getContext('2d'), p = 0
  const f = () => { const r = v.getFloat64(p, true); p += 8; return r }, s = () => { const l = v.getUint16(p, true); p += 2; const r = dec.decode(buf.subarray(p, p + l)); p += l; return cssSub(r) }
  while (p < buf.length) {
    const op = buf[p++]
    if (op === 200) { const i = buf[p++]; if (!cnv) ctx = root.querySelectorAll('canvas')[i]?.getContext('2d') }
    else if (op >= 32) { const val = op === 34 || op === 38 ? f() : s(); if (ctx) ctx[P[op]] = val }
    else { const a = op === 13 ? [s(), f(), f()] : op === 17 ? [Array.from({ length: buf[p++] }, f)] : Array.from({ length: K[op] }, f); if (ctx) ctx[N[op]](...a) }
  }
}
function paint(w, h, fn, rp, name) { const c = document.createElement('canvas'); c.width = +w; c.height = +h; const n = listOf(fn); rp(mem().subarray(DRAW, DRAW + n), c); c.toBlob((b) => b && saveAs(URL.createObjectURL(b), name), 'image/png') }   // a card on a canvas that is not in the page, saved as a PNG
let rt = 0; if (x.w_resize) window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { stamp(); call('w_resize'); done() }, 120) })
const frame = (t) => { raf = 0; const n = call('w_frame', t, OUT, CAP); if (n) patch(get(n)); pump() }
const pump = () => { if (!x.w_anim) return; if (call('w_anim')) { if (!raf) raf = requestAnimationFrame(frame) } else if (raf) { cancelAnimationFrame(raf); raf = 0 } }
const keepAttrs = (o, c, skip) => {   // o, the element that stays, takes the attributes of c, the new one
  for (const n of c.attributes) if (n.name !== skip && o.getAttribute(n.name) !== n.value) o.setAttribute(n.name, n.value)
  for (const n of [...o.attributes]) if (n.name !== skip && !c.hasAttribute(n.name)) o.removeAttribute(n.name)
}
function draw() {
  const a = document.activeElement, s = a && a.selectionStart, e = a && a.selectionEnd, fi = a ? [...root.querySelectorAll(FOC)].indexOf(a) : -1
  const id = a && (a.id ? '#' + a.id : a.dataset && a.dataset.i != null ? '[data-i="' + a.dataset.i + '"]' : ''), open = [...root.querySelectorAll('details')].map((d) => d.open)
  const keep = new Map(ctl(root).map((c, i) => [c.id || '~' + i, c])), t = document.createElement('template'); t.innerHTML = page()
  ctl(t.content).forEach((c, i) => {   // a control keeps its element (typed text, selection, files), matched by id or place; its attributes follow the page
    const o = keep.get(c.id || '~' + i); if (!o) return
    if (c.hasAttribute('value') && o.value !== c.getAttribute('value')) o.value = c.getAttribute('value')
    keepAttrs(o, c, 'value'); c.replaceWith(o)
  })
  if (x.w_canvas_keep) { const old = [...root.querySelectorAll('canvas')]; [...t.content.querySelectorAll('canvas')].forEach((c, i) => { const o = old[i]; if (o) { keepAttrs(o, c); c.replaceWith(o) } }) }
  if (!x.w_toggle) t.content.querySelectorAll('details').forEach((d, i) => { if (open[i]) d.open = true })
  const ss = sel('w_scroll_sel', ''), sct = ss && root.querySelector(ss) ? root.querySelector(ss).scrollTop : 0
  root.replaceChildren(t.content); if (sct) { const e2 = root.querySelector(ss); if (e2) e2.scrollTop = sct }
  if (x.w_draw || x.w_bdraw) drawList()
  if (x.w_value) { room(BIGCAP); root.querySelectorAll('input,textarea').forEach((c, i) => { const n = x.w_value(i, IN, BIGCAP) >>> 0; if (n !== 4294967295) c.value = dec.decode(mem().subarray(IN, IN + n)) }) }
  const f = a && (a.isConnected ? a : (id && root.querySelector(id)) || (fi >= 0 && root.querySelectorAll(FOC)[fi])); if (f) { f.focus(); if (s != null && f.setSelectionRange) try { f.setSelectionRange(s, e) } catch {} }
  if (measure()) draw(); const tip = x.w_tipsize && root.querySelector('.cc-tip'); if (tip && !tip.hidden && x.w_tipsize(tip.offsetWidth, tip.offsetHeight)) draw()
  if (x.w_view && x.w_draw && !x.w_box && cvVals().join() !== lastCv) { view(); draw() }   // the canvas has a size once it is in the page: draw again with it
}
// effects: /3 asks by number k, the first byte says what: v set a control's value, s select it, c copy the page URL (w_copied answers), t timer (w_timer answers), z/n scroll an element
// into view, x scroll it to the top, y keep a row in view, F focus, i open the file dialog, f fetch a file (w_fetched), b make a blob URL (w_blob), D/d/p/P download bytes/text/a canvas/a painted card,
// u/k/w copy a text (w_copied answers). /2 gives one text: a selector to scroll into view, or (first char U+0001) "save the SVG found by selector, named ..."
const saveAs = (u, name) => { const a = Object.assign(document.createElement('a'), { href: u, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000) }
function fx(c) {
  if (c[0] !== '\u0001') { root.querySelector(c)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return }
  const [sl, name] = c.slice(1).split('\n'), svg = root.querySelector(sl); if (!svg) return
  const copy = svg.cloneNode(true), [, , vw, vh] = copy.getAttribute('viewBox').split(' '); copy.setAttribute('width', vw); copy.setAttribute('height', vh)
  saveAs(URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' })), name)
}
let BIN = 0, BINCAP = 0, FREG = 0, FREGN = 0; const BLOB = {}
// copy a text; if the clipboard refuses and a selector is given, select the contents of that element and try the old way; w_copied(ok) answers
const copyText = (t, sl) => Promise.resolve().then(() => navigator.clipboard.writeText(t)).then(() => 1, () => { try { if (!sl) return 0; const r = document.createRange(); r.selectNodeContents(root.querySelector(sl)); const g = getSelection(); g.removeAllRanges(); g.addRange(r); return document.execCommand('copy') ? 1 : 0 } catch { return 0 } }).then((g) => { call('w_copied', g); done() })
function effects() {
  if (!x.w_effect) return; let redo = false
  if (arity('w_effect') < 3) { const q = x.w_effect(OUT, CAP); if (q > 0) fx(get(q)); return }
  for (let k = 0, n; (n = x.w_effect(k, OUT, CAP)); k++) {
    const m = mem().slice(OUT, OUT + n), s = dec.decode(m.subarray(1)), q = (e) => root.querySelector(e), op = m[0]
    if (op === 118) ctl(root)[m[1]].value = dec.decode(m.subarray(2))
    else if (op === 115) ctl(root)[m[1]].select()
    else if (op === 99) { const u = new URL(location.href); u.searchParams.delete('embed'); copyText(u.href) }
    else if (op === 116) { const id = m[1]; setTimeout(() => { call('w_timer', id); done() }, +dec.decode(m.subarray(2))) }
    else if (op === 122) q(s)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    else if (op === 110) q(s)?.scrollIntoView({ block: 'nearest' })
    else if (op === 70) q(s)?.focus({ preventScroll: true })
    else if (op === 120) { const e = q(s); if (e) e.scrollTop = 0 }
    else if (op === 121) { const [sl, y, h] = s.split('\n'), e = q(sl); if (e && (+y < e.scrollTop || +y + +h > e.scrollTop + e.clientHeight)) e.scrollTop = Math.max(0, +y - e.clientHeight / 2) }
    else if (op === 105) q('input[type=file]')?.click()
    else if (op === 80) { const [w, h, nm] = s.split('\n'); paint(w, h, 'w_bdraw2', replayBin, nm) }
    else if (op === 112 && x.w_card) { const [w, h, nm] = s.split('\t'); paint(w, h, 'w_card', replay, nm) }
    else if (op === 112) root.querySelectorAll('canvas')[m[1]].toBlob((b) => { if (b) saveAs(URL.createObjectURL(b), dec.decode(m.subarray(2))) }, 'image/png')
    else if (op === 68) { const [nm, ty, len] = s.split('\n'); if (+len > BINCAP) { BINCAP = +len + 65536; BIN = grow(BINCAP) } call('w_bytes', BIN, +len); saveAs(URL.createObjectURL(new Blob([mem().slice(BIN, BIN + +len)], { type: ty })), nm) }
    else if (op === 100) { const [nm, ty, ...t] = dec.decode(m.subarray(2)).split('\n'); saveAs(URL.createObjectURL(new Blob([t.join('\n')], { type: ty })), nm) }
    else if (op === 98) { const t = dec.decode(m.subarray(2)), i = t.indexOf('\n'); if (BLOB[m[1]]) URL.revokeObjectURL(BLOB[m[1]]); BLOB[m[1]] = URL.createObjectURL(new Blob([t.slice(i + 1)], { type: t.slice(0, i) })); tx('w_blob', BLOB[m[1]], [m[1]]); redo = true }
    else if (op === 102) { const id = m[1]; fetch(new URL(dec.decode(m.subarray(2)), location.href), { credentials: 'omit' }).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then((a) => fetched(id, 1, new Uint8Array(a)), () => fetched(id, 0, new Uint8Array(0))) }
    else if (op === 117) copyText(location.origin + location.pathname + s)
    else if (op === 119) { const [sl, ...t] = s.split('\n'); copyText(t.join('\n'), sl) }
    else if (op === 107) Promise.resolve().then(() => navigator.clipboard.writeText(s)).catch(() => { const e = q('textarea[readonly]'); e.select(); document.execCommand?.('copy') })
  }
  if (redo) draw()
}
// w_fetched(id, ok, bytes): a file the page asked for with effect 'f' (its text, or ok 0 when it could not be read)
function fetched(id, ok, b) { if (b.length > FREGN) { FREGN = b.length + 65536; FREG = grow(FREGN) } mem().set(b, FREG); stamp(); call('w_fetched', id, ok, FREG, b.length); done() }
const hout = () => { const n = call('w_hash_out', OUT, CAP); if (n) { const t = get(n); history.replaceState(null, '', t[0] === '\u0001' ? location.origin + location.pathname + t.slice(1) : t) } }
function done() { draw(); effects(); pump(); hout() }
async function file(z, f) {   // a picked or dropped file
  if (!f || !x.w_file) return
  if (arity('w_file') > 4) {   // name and text in one call; the text is left out above FCAP
    let t = new Uint8Array(0), st = 0; try { if (f.size <= FCAP) t = enc.encode(await f.text()) } catch { st = 1 }
    const nm = enc.encode(f.name).subarray(0, 1024), n = Math.min(t.length, FCAP); put(t.subarray(0, n), 1024); put(nm)
    stamp(); call('w_file', IN, nm.length, f.size, IN + 1024, n, st); return done()
  }
  const go = tx('w_file', f.name, [z], [f.size]); done(); if (!go) return   // /4: w_file says whether it wants the bytes
  try { tx('w_file_data', new Uint8Array(await f.arrayBuffer()), [z]) } catch { call('w_file_failed', z) }
  done()
}
async function dropFiles(z, fs) { const want = x.w_drop_n ? Math.max(1, call('w_drop_n', fs ? fs.length : 0)) : 1; for (let i = 0; i < want && fs && fs[i]; i++) await file(z, fs[i]) }   // a drop of two files may fill two zones: the page says how many it wants
// ph: 0 over, 1 leave, 2 drop
const drag = (ev, ph) => { const z = zone(ev); if (z && x.w_drag) { if (ph < 2) ev.preventDefault(); if (ph === 1 && x.w_drag_related && ev.relatedTarget && z.contains(ev.relatedTarget)) return z; if (arity('w_drag') > 1 ? x.w_drag(zones().indexOf(z), +(ph === 0)) : x.w_drag(ph)) done() } return z }
const at = (ev) => { const s = root.querySelector('svg'); if (s) { const b = s.getBoundingClientRect(); call('w_pointer', (ev.clientX - b.left) / b.width); done() } }
const boxed = arity('w_pointer') === 5   // w_pointer/5: (kind, x, y, width, height) in the svg's box
function point(ev, k) {
  const s = svgOf(ev)
  if (boxed) { if (s) { const r = s.getBoundingClientRect(); x.w_pointer(k === 1 ? 1 : 0, ev.clientX - r.left, ev.clientY - r.top, r.width, r.height); done() } return }
  const m = s && s.getScreenCTM && s.getScreenCTM(); if (!m) return; const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse()); call('w_point', k, p.x, p.y); done()
}
const cptr = (ev, k) => { const c = cv(ev); if (!c || !x.w_cpointer) return; if (k === 0) c.setPointerCapture(ev.pointerId); const [px, py] = loc(ev, c); stamp(); call('w_cpointer', k, ev.pointerId, px, py, ev.pointerType === 'mouse' ? 1 : 0); done() }
root.addEventListener('input', (ev) => { const i = ctl(root).indexOf(ev.target); if (i >= 0) { stamp(); tx('w_input', ev.target.value, [i]); done() } })
root.addEventListener('change', (ev) => { if (ev.target.type === 'file') file(zones().indexOf(zone(ev)), ev.target.files && ev.target.files[0]); else { const i = ctl(root).indexOf(ev.target); if (i >= 0 && x.w_change) { tx('w_change', ev.target.value, [i]); done() } } })
root.addEventListener('click', (ev) => {
  const b = x.w_press ? ev.target.closest('button') : ev.target.closest('[data-i]') || ev.target.closest('button'), t = ev.target.closest && ev.target.closest('[data-id]')   // w_press(button index) or w_click(data-i, else button index)
  if (b) { stamp(); call(x.w_press ? 'w_press' : 'w_click', !x.w_press && b.dataset.i != null ? +b.dataset.i : bts(root).indexOf(b)); done() } else if (x.w_tile && t) { stamp(); call('w_tile', +t.dataset.id); done() }
  else if (x.w_dclick && ev.target.closest && ev.target.closest('.t27-drop')) { stamp(); call('w_dclick'); done() } else if (x.w_point || boxed) point(ev, 2)
})
root.addEventListener('toggle', (ev) => { if (x.w_toggle && ev.target.tagName === 'DETAILS' && call('w_toggle', [...root.querySelectorAll('details')].indexOf(ev.target), ev.target.open ? 1 : 0)) done() }, true)
root.addEventListener('pointerdown', (ev) => { if (boxed) point(ev, 0); else if (x.w_pointer && svgOf(ev)) { root.setPointerCapture(ev.pointerId); at(ev) } })
root.addEventListener('pointermove', (ev) => { if (boxed || (x.w_point && ev.pointerType === 'mouse')) point(ev, 0); if (!boxed && x.w_pointer && root.hasPointerCapture(ev.pointerId)) at(ev) })
root.addEventListener('pointerleave', (ev) => { if (boxed && ev.target.localName === 'svg' && ev.pointerType === 'mouse') point(ev, 1); else if (x.w_point && ev.target.localName === 'svg') { call('w_point', 1, 0, 0); done() } }, true)
for (const [t, k] of [['pointerdown', 0], ['pointermove', 1], ['pointerup', 2], ['pointercancel', 3], ['pointerleave', 4]]) root.addEventListener(t, (ev) => { if (k < 4 || ev.target.localName === 'canvas') cptr(ev, k) }, k === 4)
if (x.w_winresize) window.addEventListener('resize', () => { stamp(); call('w_winresize'); done() })
root.addEventListener('wheel', (ev) => {   // w_wheel2 (x, y, dx, dy, ctrl, shift, meta) or w_wheel (x, y, dy, ctrl); bit 1 of the answer: the page took the event, bit 2: libm answers are due, ask again
  const c = cv(ev); if (!c || !(x.w_wheel || x.w_wheel2)) return; const [px, py] = loc(ev, c); stamp(); let r = 0
  if (x.w_wheel) ev.preventDefault()
  for (let k = 0; k < 8; k++) { r = x.w_wheel2 ? call('w_wheel2', px, py, ev.deltaX, ev.deltaY, +ev.ctrlKey, +ev.shiftKey, +ev.metaKey) : call('w_wheel', px, py, ev.deltaY, +ev.ctrlKey); if (!(r & 2)) break; const need = call('w_libm_need', LIB, 98304); if (need) libm(need) }
  if (x.w_wheel2 && r & 1) ev.preventDefault(); done()
}, { passive: false })
root.addEventListener('submit', (ev) => ev.preventDefault())
root.addEventListener('keydown', (ev) => {
  const t = ev.target
  if (x.w_tab && t.tagName === 'TEXTAREA') { const k = tx('w_tab', ev.key, [ctl(root).indexOf(t), +ev.shiftKey]); if (k) { ev.preventDefault(); t.setRangeText(' '.repeat(k), t.selectionStart, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input', { bubbles: true })) } }
  if (x.w_dkey && t.closest && t.closest('.t27-drop') && tx('w_dkey', ev.key)) { ev.preventDefault(); done() }
  if (x.w_key && (svgOf(ev) || cv(ev)) && (stamp(), tx('w_key', ev.key))) { ev.preventDefault(); done() }
})
for (const t of ['dragenter', 'dragover', 'dragleave', 'dragend']) root.addEventListener(t, (ev) => { if (!drag(ev, +(t === 'dragleave' || t === 'dragend')) && x.w_drop_root) ev.preventDefault() })
root.addEventListener('drop', (ev) => { const fs = ev.dataTransfer && ev.dataTransfer.files, zi = zones().indexOf(zone(ev)), z = drag(ev, 2); if (z) { ev.preventDefault(); dropFiles(zi, fs) } else if (x.w_drop_root && !ev.defaultPrevented) { ev.preventDefault(); file(0, fs && fs[0]) } })
const resync = () => { env(); stamp(); call('w_resync'); done() }; if (x.w_resync) { document.addEventListener('visibilitychange', resync); if (mq.addEventListener) mq.addEventListener('change', resync) }
window.addEventListener('hashchange', () => { clock(); tx('w_hash', location.hash); done() })
tx('w_base', new URL('./', location.href).href); call('w_seed', (window.T27_SEED ?? Math.random() * 4294967296) >>> 0); env(); view(); clock(); tx('w_init', location.hash); draw(); pump(); hout()
for (const [i, u] of [].concat(W.W_DATA_FILES || W.W_DATA_FILE || W.K_DATA_FILES || W.K_DATA_FILE || W.K_DATA || W.K_DATA_JSON || []).entries()) {
  try {   // the bytes get a fresh region of their own: the file may be larger than the stage
    const r = await fetch(new URL(u, location.href), { credentials: 'omit' }); if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status })
    const b = new Uint8Array(await r.arrayBuffer()), p = grow(b.length + 65536)
    if (arity('w_data_failed') > 2 && /\.json$/.test(u)) JSON.parse(dec.decode(b))   // w_data_failed/3 wants the reason as text
    mem().set(b, p); stamp(); call('w_data', i, p, b.length)
  } catch (e) { if (arity('w_data_failed') > 2) tx('w_data_failed', String(e && e.message), [i]); else call('w_data_failed', i, (e && e.status) | 0) }
  done()
}
