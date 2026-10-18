// The Spec Explorer's Graph layer: boxes and lines of the open spec, drawn by the same T27F wasm as /t27f/graph/.
//
// All graph and layout logic is in t27 (specs/t27f/*.t27, built into public/t27f/graph/t27f.wasm). This file
// loads the one shared glue module (public/t27f/graph/t27f_graph.js) on first use and hands it the spec's text;
// it keeps no copy of the glue, the wasm or a layout. A spec over the exporter's caps shows the verdict and no graph.

import { useEffect, useRef, useState } from 'react'
import { C } from '../lib/explorerTheme'

export interface GraphNodeClick { line: number; end: number; name: string }
interface Glue { draw: (out: Element, path: string, text: string, onNode?: (n: GraphNodeClick) => void) => { refused: boolean; message: string } }

let glue: Promise<Glue> | null = null
// Document-relative, like the compiler's wasm and the spec files: the Queen serves the Explorer from /queen/.
const loadGlue = () => (glue ??= import(/* @vite-ignore */ new URL('t27f/graph/t27f_graph.js', document.baseURI).href) as Promise<Glue>)

export function SpecGraphView({ path, text, onNode, loading }: { path: string; text: string; onNode: (n: GraphNodeClick) => void; loading: string }) {
  const out = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<{ refused: boolean; message: string } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setFailed(null)
    if (!text) { setState(null); return }
    loadGlue().then(
      (g) => { if (live && out.current) setState(g.draw(out.current, path, text, onNode)) },
      (e) => { glue = null; if (live) setFailed(String(e)) },
    )
    return () => { live = false }
  }, [path, text, onNode])
  const note = failed ?? state?.message ?? loading
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div
        role="status"
        data-graph-status={failed || state?.refused ? 'refused' : 'ok'}
        style={{ padding: '8px 14px', fontFamily: C.mono, fontSize: 12, lineHeight: 1.5, color: failed || state?.refused ? C.warn : C.muted, borderBottom: `1px solid ${C.border}` }}
      >
        {note}
      </div>
      {/* The glue emits SVG at its natural size; a wide graph scrolls here, in both directions. */}
      <div ref={out} data-graph="spec" style={{ flex: 1, overflow: 'auto', background: C.panel }} />
    </div>
  )
}
