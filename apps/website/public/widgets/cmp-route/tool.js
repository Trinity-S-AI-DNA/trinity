// cmp-route/tool.js -- lesson 12 of t27-compiler: wire class, congestion and the clock tree. Each answer is est_wire_length,
// est_congestion, est_buffers_needed or est_tree_levels, fn bodies of gHashTag/t27 specs/compiler/hir_cost_models.t27
// compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/cmp-route.t27.
import { estBuffersNeeded, estCongestion, estTreeLevels, estWireLength } from './logic.js'
import { K, W, ask, controls, el, fill, head, hue, ladder, root, say, source, stages, tiles } from '../cmp-kit.js'

const WIRES = [0, K('K_LOCAL_WIRE_UM', 500), K('K_MEDIUM_WIRE_UM', 2000), K('K_LONG_WIRE_UM', 5000)]
const ctl = controls([
  { key: 'fanout', label: say('SAY_FANOUT'), min: 0, max: K('K_MAX_FANOUT', 40), step: 1 },
  { key: 'nets', label: say('SAY_NETS'), min: 0, max: K('K_MAX_NETS', 20000), step: 100 },
  { key: 'die', label: say('SAY_DIE'), min: 0, max: K('K_MAX_DIE', 16), step: 1 },
  { key: 'sinks', label: say('SAY_SINKS'), min: 1, max: K('K_MAX_SINKS', 1024), step: 1 },
], { names: W.SAY_PRESET_NAMES, values: { fanout: K('K_PRESET_FANOUT', []), nets: K('K_PRESET_NETS', []), die: K('K_PRESET_DIE', []), sinks: K('K_PRESET_SINKS', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const wire = estWireLength(s.fanout)
  const levels = estTreeLevels(s.sinks)
  out.replaceChildren(
    ladder(WIRES.map((um, i) => ({ label: say('SAY_WIRES', i), sub: fill(say('SAY_WIRE_LEN'), um), tone: [8, 0, 1, 6][i], on: um === wire }))),
    tiles([
      { label: say('SAY_CONGESTION'), value: fill(say('SAY_PER_MM2'), estCongestion(s.nets, s.die)), tone: 3 },
      { label: say('SAY_BUFFERS'), value: estBuffersNeeded(s.sinks), tone: 2 },
      { label: say('SAY_LEVELS'), value: levels, tone: 5 },
    ]),
    head(say('SAY_LEVELS')),
    ladder([1, 2, 3].map((n) => ({ label: fill(n === 1 ? say('SAY_RUNG_LEVEL') : say('SAY_RUNG_LEVELS'), n), tone: 5, on: n === levels }))))
}

ctl.start()
