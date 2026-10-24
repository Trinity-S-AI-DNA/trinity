// /t27f/live/: replay a recorded agent-event log through the work graph and the HUD spec, both
// running as WebAssembly (../graph/t27f.wasm, one build with the graph page). The specs decide
// every kind, label, count and verdict; this file moves the log's columns in, moves the scene's
// numbers out and emits the divs the scene names. It decides no layout, no colour, no state.
// See PROVENANCE.txt.
import * as WG from './work_graph.mjs'
import * as HU from './hud.mjs'
const $ = (id) => document.getElementById(id)
const url = new URL('../graph/t27f.wasm', import.meta.url)
const R = (await WebAssembly.instantiateStreaming(fetch(url), {}).catch(async () => WebAssembly.instantiate(await (await fetch(url)).arrayBuffer(), {}))).instance.exports
const nameOf = (p, v) => Object.keys(WG).find((c) => c.startsWith(p) && WG[c] === v)?.slice(p.length).toLowerCase() ?? String(v)
async function replay() {
  const log = await (await fetch('./live.json')).json(), c = log.columns
  let played = 0, refused = 0
  for (let i = 0; i < log.count; i++) {
    const r = R.wg_apply(c.kind[i], BigInt(c.from_pid[i]), BigInt(c.to_pid[i]), c.task_no[i], c.deliver[i], c.reason[i], c.seq[i], c.spec_id[i])
    if (r !== WG.WG_OK) { refused = r; break }
    played = i + 1
  }
  R.hud_build(BigInt(played))
  $('bar').textContent = R.hs_status_bar() === HU.HUD_ABSENT
    ? 'the graph is empty: nothing to report'
    : `${R.hs_status_node_count()} nodes on the graph - frame ${Number(R.hs_status_frame())}`
  $('cards').replaceChildren(...Array.from({ length: R.hs_card_count() }, (_, i) => {
    const d = document.createElement('div')
    d.dataset.kind = nameOf('NK_', R.hs_card_kind(i))
    d.dataset.label = nameOf('LABEL_', R.hs_card_label(i))
    d.textContent = `${d.dataset.kind} ${Number(R.wg_node_id(i))} - ${d.dataset.label}`
    return d
  }))
  const s = $('status')
  s.textContent = refused
    ? `${log.count} events recorded, event ${played + 1} refused, verdict ${refused} (${nameOf('ERR_WG_', refused).replace(/_/g, ' ')}). The replay stops there; nothing is truncated.`
    : `${log.count} events replayed - ${R.wg_nodes()} nodes, ${R.wg_edges()} edges - HUD scene of ${R.hs_element_count()} elements.`
  s.className = refused ? 'refused' : ''
}
replay()
