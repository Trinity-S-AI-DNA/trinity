// hive-chain/tool.js -- lesson 23 of queen-and-hive: human, A, B, C, then silence. The person's rung is
// may_answer from a person and every agent rung may_answer from a bot at its depth, with chain_open
// beside it: fn bodies of gHashTag/t27 specs/automation/agent-hive-group.t27 compiled to wasm
// (./logic.js). A rung speaks only if the one above it spoke: an agent answers a message that exists.
// Words are SAY_ and numbers K_ constants of specs/widgets/hive-chain.t27.
import { chainOpen, mayAnswer } from './logic.js'
import { K, W, ask, controls, el, fill, ladder, root, say, source, tiles } from '../hive-kit.js'

const ctl = controls([{ key: 'gap', label: say('SAY_GAP'), min: 0, max: K('K_GAP_MAX', 10000), step: K('K_GAP_STEP', 100) }], { names: W.SAY_PRESET_NAMES, values: { gap: K('K_PRESET_GAP', []) } }, draw)
const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  let spoke = true, last = 0
  const rungs = [...Array(K('K_RUNGS', 6))].map((_, k) => {
    if (k === 0) return { label: say('SAY_RUNG_NAMES', 0), sub: say('SAY_ANSWERS'), tone: 2, on: true }
    const depth = k - 1
    const may = k === 1 ? mayAnswer(false, 0, s.gap) : mayAnswer(true, depth, s.gap)
    spoke = spoke && may
    if (spoke) last = k
    return { label: say('SAY_RUNG_NAMES', k), sub: `${fill(say('SAY_DEPTH'), depth)} · ${chainOpen(depth) ? say('SAY_OPEN') : say('SAY_CLOSED')} \u00b7 ${spoke ? say('SAY_ANSWERS') : say('SAY_SILENT')}`, tone: spoke ? 0 : 8, on: spoke }
  })
  out.replaceChildren(ladder(rungs), tiles([
    { label: say('SAY_LAST'), value: say('SAY_RUNG_NAMES', last), tone: 0 },
    { label: say('SAY_LIMIT'), value: String(K('K_MAX_BOT_DEPTH', 3)), tone: 1 },
    { label: say('SAY_COOL'), value: String(K('K_BOT_REPLY_COOLDOWN_MS', 5000)), tone: 2 },
  ]))
}

ctl.start()
