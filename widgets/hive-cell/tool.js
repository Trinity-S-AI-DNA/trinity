// hive-cell/tool.js -- lesson 27 of queen-and-hive: what an event does to a cell of the comb. Each cell
// is cell_effect(kind, accepted) drawn at flash_alpha(ms), and the gate is cells_due, fn bodies of
// gHashTag/t27 specs/queen/hive.t27 compiled to wasm (./logic.js); K_FX_TONES only picks a colour for
// each effect code. Words are SAY_ and numbers K_ constants of specs/widgets/hive-cell.t27.
import { cellEffect, cellsDue, flashAlpha } from './logic.js'
import { K, W, ask, comb, controls, el, fill, gate, hue, root, say, source, verdict } from '../hive-kit.js'

const NK = K('K_KINDS', 10), FX = K('K_FX_TONES', [])
const ctl = controls([
  { key: 'kind', kind: 'hidden', min: 0, max: NK - 1 },
  { key: 'ms', label: say('SAY_MS'), min: 0, max: K('K_MS_MAX', 2000), step: K('K_MS_STEP', 50) },
  { key: 'accepted', label: say('SAY_ACCEPTED'), kind: 'toggle' },
  { key: 'pending', label: say('SAY_PENDING'), min: 0, max: K('K_PENDING_MAX', 10), step: 1 },
  { key: 'since', label: say('SAY_SINCE'), min: 0, max: K('K_SINCE_MAX', 600), step: K('K_SINCE_STEP', 10) },
  { key: 'placed', label: say('SAY_PLACED'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { kind: K('K_PRESET_KIND', []), accepted: K('K_PRESET_ACCEPTED', []), ms: K('K_PRESET_MS', []), pending: K('K_PRESET_PENDING', []), placed: K('K_PRESET_PLACED', []), since: K('K_PRESET_SINCE', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const alpha = flashAlpha(s.ms)
  const fxOf = (k) => cellEffect(k, !!s.accepted)
  const fx = fxOf(s.kind)
  const due = cellsDue(s.pending, !!s.placed, s.since)
  out.replaceChildren(
    comb([...Array(NK)].map((_, k) => { const f = fxOf(k); return { label: say('SAY_KIND_SHORT', k), fill: f ? hue(FX[f]) : null, alpha: k === s.kind ? alpha / 1000 : f ? 0.35 : 0, on: k === s.kind } }), (k) => ctl.set('kind', k)),
    verdict(`${say('SAY_KIND_NAMES', s.kind)}: ${say('SAY_FX_NAMES', fx)}`, fx ? FX[fx] : 8, `${say('SAY_FLASH')}: ${alpha}`),
    gate(due, due ? say('SAY_DUE') : say('SAY_NOT_DUE'), fill(say('SAY_BATCH'), s.pending, s.since, K('K_CELL_BATCH_SECONDS', 300))))
}

ctl.start()
