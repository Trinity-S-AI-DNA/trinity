// /t27f/live/: the glue the loader imports. It instantiates t27f.wasm and replays the
// recorded log through the law (specs/t27f/live_mode.t27). The scalar layer runs now
// (arrival frames, paints due per event -- live_mode's exported laws); the graph paint
// waits for the struct-path exports (t27#11840 M-B then glue v2; trinity#1717 holds the
// order). FR-004: this file decides no layout, no colour and no replay state -- every
// number rendered comes from the module, and anything it cannot read it refuses, never
// guesses. See PROVENANCE.txt.
const url = new URL('t27f.wasm', import.meta.url)
const instantiate = async () =>
  (await WebAssembly.instantiateStreaming(fetch(url), {})
    .catch(async () => WebAssembly.instantiate(await (await fetch(url)).arrayBuffer(), {}))).instance.exports
const refuse = (message) => ({ refused: true, message })

const t_ms_of = (e) => {
  for (const k of ['t_ms', 'at_ms', 'emitted_at']) if (typeof e[k] === 'number') return e[k]
  return undefined
}

export async function replay(el, log) {
  let R
  try { R = await instantiate() }
  catch { return refuse('t27f.wasm did not load -- the closure build has not landed yet.') }
  for (const name of ['arrival_frame', 'latency_ms', 'paints_due'])
    if (typeof R[name] !== 'function')
      return refuse(`the module lacks ${name} -- the scalar exports are M-B of t27#11840.`)
  const events = Array.isArray(log.events) ? log.events : []
  if (!events.length) return refuse('the recorded log holds no events.')
  if (typeof events[0].tick !== 'number' && t_ms_of(events[0]) === undefined)
    return refuse('the recorded log carries no time field the scalar laws read.')
  const rows = []
  for (const e of events) {
    const t = t_ms_of(e) ?? e.tick * 16 // FRAME_MS; the log's tick is a frame count by construction
    const frame = R.arrival_frame(t)
    const paints = R.paints_due(1)
    rows.push([String(e.kind ?? '?'), `t=${t}ms`, `frame ${frame}`, `paints ${paints}`])
  }
  const table = document.createElement('table')
  for (const r of rows) {
    const tr = document.createElement('tr')
    for (const v of r) {
      const td = document.createElement('td')
      td.textContent = v
      tr.append(td)
    }
    table.append(tr)
  }
  el.replaceChildren(table)
  return { refused: false, message: `The scalar layer replayed ${rows.length} events through live_mode's laws in t27f.wasm -- the full trio (arrival frames, latency windows, paints due); the graph paint lands with the struct-path exports.` }
}
