// nn-lstm/tool.js -- lesson 23 of neural-networks: how a cell decides what to keep. An LSTM has three
// gates, each a sigmoid: forget scales the old memory, input lets new content in, output decides
// how much of the memory to show. Here every weight is 0, so each gate is the sigmoid of its bias.
// The gates are sigmoid and the new memory and output are bias_only of gHashTag/t27
// specs/ml/recurrent/lstm_single.t27, compiled to wasm (./logic.js). Words are SAY_ and numbers K_
// constants of specs/widgets/nn-lstm.t27.
import { biasOnly, sigmoid } from './logic.js'
import { COLORS, K, W, ask, bars, canvas, centi, controls, el, fmt, root, say, source, tiles } from '../nn-kit.js'

const B = centi(K('K_BIAS_HI_C', 600))
const bias = (key, label) => ({ key, label, min: -B, max: B, step: 0.5, fmt: (v) => fmt(v, 1) })
const ctl = controls([
  bias('bf', say('SAY_BF')), bias('bi', say('SAY_BI')), bias('bg', say('SAY_BG')), bias('bo', say('SAY_BO')),
  { key: 'c', label: say('SAY_C_PREV'), min: centi(K('K_C_LO_C', -200)), max: centi(K('K_C_HI_C', 200)), step: 0.1, fmt: (v) => fmt(v, 1) },
], { names: W.SAY_PRESET_NAMES, values: { bf: K('K_PRESET_BF_C', []).map(centi), bi: K('K_PRESET_BI_C', []).map(centi), bg: K('K_PRESET_BG_C', []).map(centi), bo: K('K_PRESET_BO_C', []).map(centi), c: K('K_PRESET_C_C', []).map(centi) } }, draw)

const gates = canvas('nn-bars', say('SAY_GATES_LABEL'))
const cell = canvas('nn-bars', say('SAY_CELL_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, el('div', { class: 'nn-two' }, el('div', {}, el('p', { class: 'dk-label' }, say('SAY_GATES_LABEL')), gates), el('div', {}, el('p', { class: 'dk-label' }, say('SAY_CELL_LABEL')), cell)), stat, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const g = [sigmoid(s.bf), sigmoid(s.bi), sigmoid(s.bo)]
  bars(gates, { values: g, labels: [say('SAY_FORGET'), say('SAY_INPUT'), say('SAY_OUTPUT')], colors: [COLORS[4], COLORS[2], COLORS[5]], lo: 0, hi: 1, h: 240, ticks: K('K_GATE_TICKS_C', []).map(centi), fmt: (v) => fmt(v, 3) })
  const c2 = biasOnly(s.bi, s.bf, s.bg, s.bo, s.c, 1), h2 = biasOnly(s.bi, s.bf, s.bg, s.bo, s.c, 0)
  bars(cell, { values: [s.c, c2, h2], labels: [say('SAY_C_OLD'), say('SAY_C_NEW'), say('SAY_H_NEW')], colors: [COLORS[6], COLORS[0], COLORS[1]], lo: K('K_CELL_LO', -3), hi: K('K_CELL_HI', 3), h: 240, ticks: K('K_CELL_TICKS', []), fmt: (v) => fmt(v, 3) })
  stat.replaceChildren(tiles([
    { label: say('SAY_C_NEW'), value: fmt(c2, 4), tone: 0 },
    { label: say('SAY_H_NEW'), value: fmt(h2, 4), tone: 1 },
    { label: say('SAY_FORGET'), value: fmt(g[0], 4), tone: 4 },
    { label: say('SAY_INPUT'), value: fmt(g[1], 4), tone: 2 },
  ]))
}

ctl.start()
