// nn-backprop/tool.js -- lesson 19 of neural-networks: how blame flows back through a layer. Given
// how much the loss wants each output to change (g), backpropagation hands each weight g times its
// input and each input W^T g. Every edge and node value is backward_at, the loss loss_at of
// gHashTag/t27 specs/ml/layers/dense_layer.t27, compiled to wasm (./logic.js): 3 inputs (1, 2, 3)
// (K_X, the spec's fixture), 2 outputs. Words are SAY_ and numbers K_ constants of
// specs/widgets/nn-backprop.t27.
import { backwardAt, lossAt } from './logic.js'
import { COLORS, K, W, ask, canvas, centi, controls, el, fmt, net, root, say, source, tiles, tone } from '../nn-kit.js'

const X = K('K_X', []), XN = K('K_X_NUDGED', [])
const G0 = centi(K('K_G_LO_C', -200)), G1 = centi(K('K_G_HI_C', 200))
const ctl = controls([
  { key: 'g0', label: `${say('SAY_G')} 0`, min: G0, max: G1, step: 0.05, fmt: (v) => fmt(v, 2) },
  { key: 'g1', label: `${say('SAY_G')} 1`, min: G0, max: G1, step: 0.05, fmt: (v) => fmt(v, 2) },
], { names: W.SAY_PRESET_NAMES, values: { g0: K('K_PRESET_G0_C', []).map(centi), g1: K('K_PRESET_G1_C', []).map(centi) } }, draw)

const svg = canvas('nn-net', say('SAY_NET_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, svg, el('p', { class: 'nn-cap' }, say('SAY_NET_CAP')), stat, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const gi = [0, 1, 2].map((i) => backwardAt(s.g0, s.g1, 0, i))
  const inputs = X.map((x, i) => ({ label: `x${i} = ${x}`, value: fmt(gi[i], 2), color: tone(gi[i], 6) }))
  const outputs = [s.g0, s.g1].map((g, o) => ({ label: `${say('SAY_G')} ${o}`, value: fmt(g, 2), color: tone(g, 2) }))
  const edges = []
  for (let o = 0; o < 2; o++) for (let i = 0; i < 3; i++) {
    const v = backwardAt(s.g0, s.g1, 1, o * 3 + i)
    edges.push({ from: [0, i], to: [1, o], value: v, label: fmt(v, 2) })
  }
  net(svg, [inputs, outputs], edges, { w: 440, h: 360, m: 6 })
  stat.replaceChildren(tiles([
    { label: say('SAY_GRAD_IN'), value: gi.map((v) => fmt(v, 2)).join(' '), tone: 0 },
    { label: say('SAY_GRAD_B'), value: [0, 1].map((o) => fmt(backwardAt(s.g0, s.g1, 2, o), 2)).join(' '), tone: 1 },
    { label: say('SAY_LOSS'), value: fmt(lossAt(X[0], X[1], X[2], s.g0, s.g1), 3), tone: 2 },
    { label: say('SAY_LOSS_NUDGED'), value: fmt(lossAt(XN[0], XN[1], XN[2], s.g0, s.g1), 3), tone: 5 },
  ]))
}

ctl.start()
