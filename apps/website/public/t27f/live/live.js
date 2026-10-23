// /t27f/live/: fetch the wasm + a recorded log, then drive the shared glue (t27f_live.js).
import { draw } from './t27f_live.js'
const $ = (id) => document.getElementById(id)
async function go() {
  const wasm = await (await fetch('./t27f.wasm')).arrayBuffer()
  const log = await (await fetch('./logs/recorded_log.json')).json()
  draw($('stage'), wasm, log, $('status'))
}
go()