// /t27f/live/: fetch the recorded log, hand it with the canvas to the glue (t27f_live.js), which
// instantiates t27f.wasm and replays the events through the law (specs/t27f/live_mode.t27).
// FR-004: this loader holds no layout, no colour and no state logic. The glue and t27f.wasm land
// with the closure build on the T27 OS lab (PROVENANCE.txt); until then the status line says so.
const $ = (id) => document.getElementById(id), status = $('status')
const dark = (why) => {
  status.className = 'refused'
  status.textContent = `The replay waits: ${why} The page renders its chrome and ships the recorded log (24 events); the replay activates when the closure build lands. See PROVENANCE.txt.`
}
async function go() {
  let log
  try { log = await (await fetch('./logs/recorded_log.json')).json() }
  catch { return dark('the recorded log did not load.') }
  if (log.format !== 't27f-live-recorded-log-v1') return dark(`the recorded log is "${log.format}", not t27f-live-recorded-log-v1.`)
  let replay
  try { ({ replay } = await import('./t27f_live.js')) }
  catch { return dark(`no t27f_live.js glue and no t27f.wasm yet (${log.events.length} events in hand).`) }
  const r = await replay($('live'), log)
  status.textContent = r.message; status.className = r.refused ? 'refused' : ''
}
go()
