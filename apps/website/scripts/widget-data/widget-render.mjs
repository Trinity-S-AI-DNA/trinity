// widget-render.mjs -- thin glue: load a native widget's widget.wasm through the shared host protocol (public/widgets/host.js:
// w_base, w_init, w_data for each W_DATA_FILE, then w_render) and print the page HTML it writes. No widget logic lives here.
// Usage (from apps/website): node scripts/widget-data/widget-render.mjs <tool-id>
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const id = process.argv[2]
if (!id) throw new Error('usage: widget-render.mjs <tool-id>')
const dir = join(SITE, 'public', 'widgets', id)
const x = (await WebAssembly.instantiate(readFileSync(join(dir, 'widget.wasm')), {})).instance.exports
const grow = (n) => x.memory.grow(Math.ceil(n / 65536)) * 65536
const IN = grow(65536), CAP = 1 << 20, OUT = grow(CAP)
const tx = (f, s) => { const b = new TextEncoder().encode(s); new Uint8Array(x.memory.buffer).set(b, IN); return x[f](IN, b.length) }
tx('w_base', 'file:///widget/'); tx('w_init', '')
const meta = JSON.parse(/window\.T27_WIDGET=(\{.*?\})<\/script>/s.exec(readFileSync(join(dir, 'index.html'), 'utf8'))[1])
for (const [i, u] of [].concat(meta.W_DATA_FILES || meta.W_DATA_FILE || []).entries()) {
  const b = readFileSync(join(dir, u)), p = grow(b.length + 65536)
  new Uint8Array(x.memory.buffer).set(b, p); x.w_data(i, p, b.length)
}
const n = x.w_render(OUT, CAP)
process.stdout.write(new TextDecoder().decode(new Uint8Array(x.memory.buffer, OUT, n)))
