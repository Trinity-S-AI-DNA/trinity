// host.js -- the one host every native widget shares: glue between the page and a widget's wasm.
// The widget (a .t27 spec built to wasm) owns the state and writes the page's HTML; this file only
// forwards events and data, sets the HTML, and keeps the focused input and open <details>.
// It holds no widget logic and no words.
const W = window.T27_WIDGET || {}, root = document.getElementById('widget'), dec = new TextDecoder(), enc = new TextEncoder()
const x = (await WebAssembly.instantiate(await (await fetch(new URL('./widget.wasm', location.href))).arrayBuffer(), {})).instance.exports
const call = (f, ...a) => (x[f] ? x[f](...a) : 0), CAP = 262144, IN = x.memory.grow(5) * 65536, OUT = IN + 65536
const mem = () => new Uint8Array(x.memory.buffer), get = (n) => dec.decode(mem().subarray(OUT, OUT + n))
const put = (s) => { const b = enc.encode(s).subarray(0, 65536); mem().set(b, IN); return b.length }
document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('./tool.css', location.href).href }))
function draw() {
  const a = document.activeElement, id = a && (a.id ? '#' + a.id : a.dataset && a.dataset.i != null ? '[data-i="' + a.dataset.i + '"]' : ''), s = a && a.selectionStart, e = a && a.selectionEnd
  const keep = new Map([...root.querySelectorAll('input[id]')].map((i) => [i.id, i])), open = [...root.querySelectorAll('details')].map((d) => d.open)
  const t = document.createElement('template'); t.innerHTML = get(x.w_render(OUT, CAP))
  t.content.querySelectorAll('input[id]').forEach((i) => { const o = keep.get(i.id), v = i.getAttribute('value') ?? ''; if (o) { if (o.value !== v) o.value = v; i.replaceWith(o) } })
  t.content.querySelectorAll('details').forEach((d, i) => { if (open[i]) d.open = true })
  root.replaceChildren(t.content)
  const f = id && root.querySelector(id); if (f) { f.focus(); if (s != null && f.setSelectionRange) f.setSelectionRange(s, e) }
}
function done() { draw(); const n = call('w_hash_out', OUT, 256); if (n) history.replaceState(null, '', get(n)) }
root.addEventListener('input', (ev) => { const i = [...root.querySelectorAll('input')].indexOf(ev.target); if (i >= 0) { call('w_input', i, IN, put(ev.target.value)); done() } })
root.addEventListener('click', (ev) => { const b = ev.target.closest('[data-i]') || ev.target.closest('button'); if (b) { call('w_click', b.dataset.i != null ? +b.dataset.i : [...root.querySelectorAll('button')].indexOf(b)); done() } })
window.addEventListener('hashchange', () => { call('w_hash', IN, put(location.hash)); draw() })
call('w_init', IN, put(location.hash)); draw()
for (const [i, u] of [].concat(W.K_DATA_FILES || W.K_DATA_FILE || []).entries()) {
  try {
    const r = await fetch(new URL(u, location.href), { credentials: 'omit' }); if (!r.ok) throw 0
    const b = new Uint8Array(await r.arrayBuffer()), p = x.memory.grow(Math.ceil(b.length / 65536) + 1) * 65536
    mem().set(b, p); call('w_data', i, p, b.length)
  } catch { call('w_data_failed', i) }
  draw()
}
