// widget-host.mjs -- thin node glue for the shared host protocol (public/widgets/host.js): load a native widget's widget.wasm,
// open it (w_base, w_init), hand it its W_DATA_FILE bytes (w_data). No widget logic and no words live here.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export async function load(id, hash = '') {
  const dir = join(SITE, 'public', 'widgets', id)
  const x = (await WebAssembly.instantiate(readFileSync(join(dir, 'widget.wasm')), {})).instance.exports
  const grow = (n) => x.memory.grow(Math.ceil(n / 65536)) * 65536
  const IN = grow(65536), CAP = 1 << 20, OUT = grow(CAP)
  const put = (f, s) => { const b = new TextEncoder().encode(s); new Uint8Array(x.memory.buffer).set(b, IN); return x[f] ? x[f](IN, b.length) : 0 }   // every export is optional, as in host.js
  put('w_base', 'file:///widget/'); put('w_init', hash)
  const meta = JSON.parse(/window\.T27_WIDGET=(\{.*?\})<\/script>/s.exec(readFileSync(join(dir, 'index.html'), 'utf8'))[1])
  for (const [i, u] of [].concat(meta.W_DATA_FILES || meta.W_DATA_FILE || meta.K_DATA_FILES || meta.K_DATA_FILE || meta.K_DATA || meta.K_DATA_JSON || []).entries()) {
    const b = readFileSync(join(dir, u)), p = grow(b.length + 65536)
    new Uint8Array(x.memory.buffer).set(b, p); x.w_data(i, p, b.length)
  }
  // call(name) runs a (dst, cap) export (w_render, w_bdraw2 ...) and returns the bytes it wrote
  return { x, meta, call: (name) => new Uint8Array(x.memory.buffer, OUT, x[name](OUT, CAP)) }
}
