// hive-called/tool.js -- lesson 22 of queen-and-hive: who is called in a group of agent bots. Both
// cards and every table cell are addressed(tagged, all tag, reply, own topic, from a bot), the fn body
// of gHashTag/t27 specs/automation/agent-hive-group.t27 compiled to wasm (./logic.js). Words are SAY_
// and numbers K_ constants of specs/widgets/hive-called.t27.
import { addressed } from './logic.js'
import { K, W, ask, controls, el, grid, head, root, say, source, two, verdict } from '../hive-kit.js'

const NF = K('K_FLAGS', 4)
const keys = ['tagged', 'all', 'reply', 'topic']
const ctl = controls(keys.map((key, i) => ({ key, label: say('SAY_FLAGS', i), kind: 'toggle' })),
  { names: W.SAY_PRESET_NAMES, values: { tagged: K('K_PRESET_TAGGED', []), all: K('K_PRESET_ALL', []), reply: K('K_PRESET_REPLY', []), topic: K('K_PRESET_TOPIC', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const f = keys.map((k) => !!s[k])
  const card = (bot) => { const on = addressed(f[0], f[1], f[2], f[3], bot); return verdict(on ? say('SAY_CALLED') : say('SAY_QUIET'), on ? 0 : 8, say('SAY_SENDERS', bot ? 1 : 0)) }
  const one = (row) => [...Array(NF)].map((_, i) => i === row)
  out.replaceChildren(
    two(card(false), card(true)),
    head(say('SAY_TABLE')),
    grid({ rows: NF + 1, cols: 2, rowLabels: [...W.SAY_FLAGS, say('SAY_NOTHING')], colLabels: W.SAY_SENDERS, cell: (r, c) => { const v = addressed(...one(r), c === 1); return { text: v ? say('SAY_YES') : say('SAY_NO'), tone: v ? 0 : 8, on: v } } }))
}

ctl.start()
