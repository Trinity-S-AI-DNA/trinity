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
  // The outcome carries the spec it is for, so an older one is never shown under a newer spec (and no state is set in the effect body).
  const [done, setDone] = useState<{ path: string; text: string; refused: boolean; message: string } | null>(null)
  useEffect(() => {
    if (!text) { out.current?.replaceChildren(); return }
    let live = true
    loadGlue().then(
      (g) => { if (live && out.current) setDone({ path, text, ...g.draw(out.current, path, text, onNode) }) },
      (e) => { glue = null; if (live) setDone({ path, text, refused: true, message: String(e) }) },
    )
    return () => { live = false }
  }, [path, text, onNode])
  const state = done && done.path === path && done.text === text ? done : null
  const note = state?.message ?? loading
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div
        role="status"
        data-graph-status={state?.refused ? 'refused' : 'ok'}
        style={{ padding: '8px 14px', fontFamily: C.mono, fontSize: 12, lineHeight: 1.5, color: state?.refused ? C.warn : C.muted, borderBottom: `1px solid ${C.border}` }}
      >
        {note}
      </div>
      {/* The glue emits SVG at its natural size; a wide graph scrolls here, in both directions. */}
      <div ref={out} data-graph="spec" style={{ flex: 1, overflow: 'auto', background: C.panel }} />
    </div>
  )
}
