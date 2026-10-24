import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'

// Verifies the /t27f/live/ glue against the committed t27f.wasm and the law's own pinned
// numbers. Test vectors are read off specs/t27f/live_mode.t27 (master) and
// specs/t27f/live_scalar_closure.t27 (branch lane/ma-params) test blocks, not off this
// repo: the law is the truth, the page only renders what the module answers.
const live = join(fileURLToPath(import.meta.url), '..', '..', 'public', 't27f', 'live')

// Minimal DOM stub: the glue touches createElement, cssText, textContent, append,
// replaceChildren and children[i] -- nothing else.
const node = (tag) => ({ tag, children: [], style: {}, textContent: '', title: '',
  append(...ks) { this.children.push(...ks) },
  replaceChildren(...ks) { this.children = ks } })
globalThis.document = { createElement: node }

// rAF stub: queue callbacks, then drain them with a timestamp far apart enough that every
// PACE_MS window step fires, until the playhead stops re-registering.
const raf = []
globalThis.requestAnimationFrame = (cb) => raf.push(cb)
const drain = () => { let t = 0, guard = 0; while (raf.length && guard++ < 1000) raf.shift()(t += 1000) }

// fetch stub: the glue resolves t27f.wasm against import.meta.url (file:// here); serve the
// committed bytes with the content type instantiateStreaming requires.
globalThis.fetch = async (u) => new Response(await readFileSync(fileURLToPath(u)), { headers: { 'Content-Type': 'application/wasm' } })

test('the committed t27f.wasm exports the scalar trio', async () => {
  const { instance } = await WebAssembly.instantiate(readFileSync(join(live, 't27f.wasm')), {})
  for (const name of ['arrival_frame', 'latency_ms', 'paints_due'])
    assert.equal(typeof instance.exports[name], 'function', name)
})

test('the module answers the boundaries live_mode.t27 pins', async () => {
  const { instance } = await WebAssembly.instantiate(readFileSync(join(live, 't27f.wasm')), {})
  const R = instance.exports
  // live_mode.t27: frame 1 owns [0, 16), frame 2 [16, 32), 1000 ms lands in frame 63;
  // live_scalar_closure.t27: arrival_frame(1024) == 65. Frame of tick t is derived by the
  // same law: t_ms = tick * FRAME_MS, so tick 23 -> 368 ms -> frame 24.
  for (const [t, f] of [[0, 1], [7, 1], [15, 1], [16, 2], [31, 2], [32, 3], [368, 24], [1000, 63], [1024, 65]])
    assert.equal(R.arrival_frame(t), f, `arrival_frame(${t})`)
  // live_mode.t27 / live_scalar_closure.t27: latency_ms = (painted - emitted + 1) * FRAME_MS,
  // whole windows from the end of the event's own window; the pairs are the law's own asserts.
  for (const [e, p, ms] of [[0, 0, 16], [0, 15, 256], [16, 16, 16], [0, 16, 272], [2, 7, 96], [3, 3, 16], [3, 4, 32], [1, 9, 144], [1, 10, 160]])
    assert.equal(R.latency_ms(e, p), ms, `latency_ms(${e}, ${p})`)
  // paints_due: a window owes ONE paint however many events arrived, and none when empty.
  for (const [p, v] of [[0, 0], [1, 1], [3, 1], [64, 1]])
    assert.equal(R.paints_due(p), v, `paints_due(${p})`)
})

test('replay() runs the recorded log through the module and animates the plane', async () => {
  const { replay } = await import(pathToFileURL(join(live, 't27f_live.js')))
  const log = JSON.parse(readFileSync(join(live, 'logs', 'recorded_log.json')))
  assert.equal(log.events.length, 24)
  const out = node('div')
  const r = await replay(out, log)
  assert.equal(r.refused, false)
  assert.match(r.message, /scalar plane/)
  assert.match(r.message, /struct path/)
  // axis + table + caption are children of the stage
  assert.ok(out.children.length >= 3, 'axis, table and caption render')
  drain()
  // every event painted at its own arrival window: painted at = arrival frame, latency 16 ms
  const table = out.children[1], rows = table.children.slice(1)
  assert.equal(rows.length, 24)
  for (let i = 0; i < 24; i++) {
    const arrival = 1 + log.events[i].tick
    assert.equal(rows[i].children[3].textContent, String(arrival), `row ${i} arrival frame`)
    assert.equal(rows[i].children[4].textContent, String(arrival), `row ${i} painted at`)
    assert.equal(rows[i].children[5].textContent, '16 ms', `row ${i} latency`)
  }
  // the caption carries the law check from the module, and the playhead reached the last frame
  assert.match(out.children[2].textContent, /latency_ms\(2, 7\) = 96 ms/)
  assert.match(out.children[2].textContent, /latency_ms\(0, 15\) = 256 ms/)
  assert.match(out.children[0].children.at(-1).textContent, /frame 24/)
})

test('replay() refuses a log it cannot read, never fakes a replay', async () => {
  const { replay } = await import(pathToFileURL(join(live, 't27f_live.js')))
  const out = node('div')
  const r = await replay(out, { format: 't27f-live-recorded-log-v1', events: [{ kind: 'spawn' }] })
  assert.equal(r.refused, true)
  assert.match(r.message, /tick/)
  assert.equal(out.children.length, 0)
})
