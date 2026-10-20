// widget-render.mjs -- print the page HTML a native widget.wasm writes (w_render), through widget-host.mjs.
// Usage (from apps/website): node scripts/widget-data/widget-render.mjs <tool-id> [#hash]
import { load } from './widget-host.mjs'
const w = await load(process.argv[2], process.argv[3] || '')
process.stdout.write(new TextDecoder().decode(w.call('w_render')))
