// Shared glue for /t27f/live/: loads t27f.wasm and replays a recorded log at ~60 fps.
// Layout, colour and state logic live in the specs (hud.t27, a11y_mirror.t27, live_mode.t27)
// and in the wasm; this file only moves bytes in and frames out. It decides nothing.
export function draw(stage, wasmBytes, log, status) {
  const mod = new WebAssembly.Module(wasmBytes)
  const inst = new WebAssembly.Instance(mod, {})
  const ex = inst.exports
  const frames = Array.isArray(log) ? log : (log.frames || [])
  status.textContent = `replaying ${frames.length} frames`
  let i = 0, last = 0
  function frame(t) {
    if (t - last >= 16.67) { last = t
      const f = frames[i % Math.max(1, frames.length)]
      stage.textContent = f ? (f.agent ? `${f.agent}: ${f.state || ''}` : JSON.stringify(f)) : ''
      i++
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}