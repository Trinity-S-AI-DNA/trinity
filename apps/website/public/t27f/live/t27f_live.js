// /t27f/live/: the glue the loader imports. It instantiates t27f.wasm and replays the recorded
// log's SCALAR PLANE through the laws of live_mode.t27 (compiled from live_scalar_closure.t27 on
// branch lane/ma-params; t27f.build names the builder): arrival_frame places each event on the
// frame axis, paints_due says whether a window owes its one paint, latency_ms prices each event
// in FRAME_MS windows. This is stage 1 of the replay; the struct path (WorkGraph -> HUD scene ->
// display-list ops) is the named next step (t27#11983, glue v2). FR-004: no layout law, no colour
// outside the page's tokens, no state beyond the playhead; every number rendered comes from the
// module, and anything it cannot read it refuses, never guesses. See PROVENANCE.txt.
const url = new URL('t27f.wasm', import.meta.url)
const instantiate = async () =>
  (await WebAssembly.instantiateStreaming(fetch(url), {})
    .catch(async () => WebAssembly.instantiate(await (await fetch(url)).arrayBuffer(), {}))).instance.exports
const refuse = (message) => ({ refused: true, message })
const CELL = (tag, text, css) => { const e = document.createElement(tag); e.textContent = text; e.style.cssText = css || ''; return e }
const TD = 'padding:.15rem .75rem .15rem 0'
// Kind colours, page tokens only (index.html :root): nothing invented here.
const TOKEN = { deliver: 'var(--accent)', delivers: 'var(--accent)', down: 'var(--warn)', restart: 'var(--warn)', spawn: 'var(--text)', exit: 'var(--muted)' }
// Display pacing only: the laws read whole FRAME_MS windows (16 ms, live_mode.t27 = live_stream's
// COALESCE_MS, 60 fps). The playhead draws one window per PACE_MS so the 24-window log watches in
// a few seconds; pacing touches no law math. Frames start at 1: arrival_frame never returns 0.
const PACE_MS = 150

export async function replay(out, log) {
  let R
  try { R = await instantiate() }
  catch { return refuse('t27f.wasm did not load -- the scalar preview build has not landed.') }
  for (const name of ['arrival_frame', 'latency_ms', 'paints_due'])
    if (typeof R[name] !== 'function') return refuse(`the module lacks ${name} -- t27f.build lists the scalar trio it must export.`)
  const events = Array.isArray(log && log.events) ? log.events : []
  if (!events.length || !events.every((e) => Number.isInteger(e && e.tick) && e.tick >= 0))
    return refuse('the recorded log carries no integer tick per event; the scalar laws read ticks.')
  const arr = events.map((e) => R.arrival_frame(e.tick * 16)) // t_ms = tick * FRAME_MS (16, live_mode.t27)
  const max = Math.max(...arr), painted = events.map(() => 0)
  out.replaceChildren()
  const axis = CELL('div', ''), bar = CELL('div', ''), at = CELL('code', '')
  axis.style.cssText = 'position:relative;height:52px;margin:.5rem 0 1rem;border-bottom:1px solid var(--line-hi)'
  bar.style.cssText = 'position:absolute;top:0;bottom:0;width:2px;background:var(--accent);left:0'
  at.style.cssText = 'position:absolute;top:0;left:0;color:var(--muted)'
  const marks = events.map((e, i) => {
    const m = CELL('div', '')
    m.style.cssText = `position:absolute;bottom:-5px;width:9px;height:9px;border-radius:2px;background:var(--muted);left:${(100 * (arr[i] - 1) / (max - 1)).toFixed(3)}%`
    m.title = `seq ${e.seq} ${e.kind}: arrival frame ${arr[i]}`
    axis.append(m)
    return m
  })
  axis.append(bar, at)
  out.append(axis)
  const table = CELL('table', '')
  table.style.cssText = 'border-collapse:collapse;width:100%'
  const tr = (...cs) => { const r = document.createElement('tr'); r.append(...cs); return r }
  table.append(tr(...['seq', 'kind', 't ms', 'arrival frame', 'painted at', 'latency'].map((h) => CELL('th', h, `text-align:left;color:var(--muted);border-bottom:1px solid var(--line);${TD}`))))
  const rows = events.map((e, i) => {
    const r = tr(CELL('td', String(e.seq), TD), CELL('td', String(e.kind ?? '?'), `${TD};color:${TOKEN[e.kind] || 'var(--accent)'}`), CELL('td', String(e.tick * 16), TD), CELL('td', String(arr[i]), TD), CELL('td', '--', TD), CELL('td', '--', TD))
    table.append(r)
    return r
  })
  // One window per step: count what arrived and is not yet shown, ask the module whether the
  // window owes its paint, and let the module price every event it first shows at this frame.
  const paint = (f) => {
    at.textContent = `frame ${f}`
    bar.style.left = `${(100 * f / max).toFixed(3)}%`
    const due = events.reduce((n, _, i) => n + (!painted[i] && arr[i] <= f ? 1 : 0), 0)
    if (!R.paints_due(due)) return
    events.forEach((e, i) => {
      if (painted[i] || arr[i] > f) return
      painted[i] = f
      marks[i].style.background = TOKEN[e.kind] || 'var(--accent)'
      rows[i].children[4].textContent = String(f)
      rows[i].children[5].textContent = `${R.latency_ms(arr[i], f)} ms`
    })
  }
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) for (let f = 1; f <= max; f++) paint(f)
  else {
    let frame = 0, last = -PACE_MS
    const step = (t) => { if (t - last >= PACE_MS) { last = t; paint(++frame) } if (frame < max) requestAnimationFrame(step) }
    requestAnimationFrame(step)
  }
  const cap = CELL('p', `The scalar-plane stage of the replay, from t27f.wasm (live_mode.t27 via live_scalar_closure.t27): arrival_frame places each event, paints_due coalesces each window to one paint, latency_ms prices it -- here ${R.latency_ms(1, 1)} ms per event, the window that took the event painting it, because the log carries no paint times of its own. Law check, from the module and not a measurement: latency_ms(2, 7) = ${R.latency_ms(2, 7)} ms and latency_ms(0, 15) = ${R.latency_ms(0, 15)} ms, what a slipped paint costs. The struct path (WorkGraph -> HUD scene -> display-list ops) is the named next step (t27#11983); no HUD scene is rendered here.`, 'color:var(--muted);font-size:.85rem;max-width:62rem')
  out.append(table, cap)
  return { refused: false, message: `Live: the scalar plane of ${events.length} recorded events replays through t27f.wasm -- arrival_frame, paints_due and latency_ms from live_mode.t27; each event paints in the window that took it (${R.latency_ms(1, 1)} ms each), since the log carries no paint times. The struct path (WorkGraph -> HUD scene -> display-list ops) is the named next step -- see PROVENANCE.txt.` }
}
