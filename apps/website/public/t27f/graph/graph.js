// Thin glue for /t27f/graph/. The exporter and the layout run in t27f.wasm (specs/t27f/spec_graph_export.t27
// and spec_graph_view.t27); this file moves a spec's bytes in, reads boxes and lines out and emits SVG. It
// decides no node, edge, span, position, size, colour or verdict. See PROVENANCE.txt.
import * as G from './spec_graph_view.mjs'
const $ = (id) => document.getElementById(id), hex = (c) => `#${c.toString(16).padStart(6, '0')}`
const nm = (p, v) => Object.keys(G).find((c) => c.startsWith(p) && !c.endsWith('KINDS') && G[c] === v)?.slice(p.length).toLowerCase() ?? String(v)
const R = (await WebAssembly.instantiateStreaming(fetch('./t27f.wasm'), {})).instance.exports
const dec = new TextDecoder(), enc = new TextEncoder()
const name = (i) => dec.decode(new Uint8Array(R.memory.buffer, R.gx_node_name_ptr(i), R.gx_node_name_len(i)))
const el = (tag, a, ...kids) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in a) e.setAttribute(k, a[k]); e.append(...kids); return e }
const dash = (d) => (d ? { 'stroke-dasharray': d } : {})

async function show(path, file) {
  const out = $('graph'), status = $('status'), body = enc.encode(await (await fetch(`./specs/${file}`)).text()), p = enc.encode(path)
  out.replaceChildren(); status.className = ''
  if (!R.gx_set_len(body.length) || !R.gx_set_path_len(p.length)) return (status.textContent = `${path}: too large for the exporter's buffers; nothing drawn.`, status.className = 'refused')
  new Uint8Array(R.memory.buffer).set(body, R.gx_src_ptr()); new Uint8Array(R.memory.buffer).set(p, R.gx_path_ptr())
  const v = R.gx_load()
  if (v !== G.GRAPH_OK) { // refused, never truncated
    const why = v === G.ERR_TOO_MANY_NODES ? `${R.gx_node_count()} nodes found, at most ${G.MAX_NODES}` : v === G.ERR_TOO_MANY_EDGES ? `${R.gx_edge_count()} edges found, at most ${G.MAX_EDGES}` : `verdict ${v}`
    return (status.textContent = `${path}: refused, ${nm('ERR_', v).replace(/_/g, ' ')} (${why}). No graph is drawn and none is truncated.`, status.className = 'refused')
  }
  if (R.gx_view_verdict() !== G.VIEW_OK) return (status.textContent = `${path}: the view refuses it, verdict ${R.gx_view_verdict()}.`, status.className = 'refused')
  const W = R.gx_view_width(), H = R.gx_view_height(), svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'font-family': "'JetBrains Mono',ui-monospace,monospace" }, el('rect', { width: W, height: H, fill: hex(G.VIEW_BACKDROP) }))
  for (let j = 0; j < R.gx_edge_count(); j++)
    svg.append(el('line', { x1: R.gx_view_edge_x1(j), y1: R.gx_view_edge_y1(j), x2: R.gx_view_edge_x2(j), y2: R.gx_view_edge_y2(j), stroke: hex(R.gx_view_edge_stroke(j)), 'stroke-width': 1.5, ...dash(R.gx_view_edge_dash(j)) },
      el('title', {}, `${nm('EDGE_', R.gx_edge_kind(j))}: ${name(R.gx_edge_from(j))} -> ${name(R.gx_edge_to(j))}, line ${R.gx_edge_line(j)}`)))
  for (let i = 0; i < R.gx_node_count(); i++) {
    const x = R.gx_view_node_x(i), y = R.gx_view_node_y(i), w = R.gx_view_node_w(i), a = R.gx_line_start(i), b = R.gx_line_end(i), px = G.VIEW_FONT_PX
    const l1 = `${nm('NODE_', R.gx_node_kind(i))} ${name(i)}`, l2 = `${nm('LABEL_', R.gx_node_label(i))} - L${a}${b > a ? `-${b}` : ''}`, fit = Math.floor((w - 16) / (px * 0.6))
    const t = (dy, s) => el('text', { x: x + 8, y: y + dy, 'font-size': px, fill: hex(G.VIEW_TEXT) }, s)
    svg.append(el('rect', { x, y, width: w, height: R.gx_view_node_h(i), rx: 6, fill: hex(R.gx_view_node_fill(i)), stroke: hex(R.gx_view_node_stroke(i)), 'stroke-width': 1.5, ...dash(R.gx_view_node_dash(i)) }),
      t(px + 2, l1.length > fit ? `${l1.slice(0, fit - 1)}...` : l1), t(2 * px + 5, l2), el('title', {}, `${l1} - ${l2}`))
  }
  out.append(svg)
  status.textContent = `${path}: ${R.gx_line_count()} lines, ${R.gx_node_count()} nodes, ${R.gx_edge_count()} edges, ${W}x${H}. Exact only: no derived or suggested edges.`
}
const pick = $('spec'), go = () => show(pick.selectedOptions[0].dataset.path, pick.value)
pick.addEventListener('change', go); go()
