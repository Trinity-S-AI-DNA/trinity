// nn-conv/tool.js -- lesson 10 of neural-networks: how a network looks at a picture in patches. The
// window slides over a 4 x 4 image two cells at a time and each output is the AVERAGE of its 2 x 2
// patch: average pooling, not a learned kernel (a sliding conv2d spec is gHashTag/t27#10612, not
// merged). Every output is pool4_at and every gradient backward4_at of gHashTag/t27
// specs/ml/layers/avgpool2d_layer.t27, compiled to wasm (./logic.js). The input is the spec's own,
// cell i holding i. Words are SAY_ and numbers K_ constants of specs/widgets/nn-conv.t27.
import { backward4At, calcOutputSize, pool4At } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, fmt, heat, root, say, source, tiles } from '../nn-kit.js'

const SIDE = K('K_SIDE', 4), KER = K('K_KERNEL', 2)
const R0 = K('K_WIN_ROW', []), C0 = K('K_WIN_COL', [])
const ctl = controls([
  { key: 'win', kind: 'hidden', min: 0, max: 3 },
  { key: 'grad', label: say('SAY_SHOW_GRAD'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { win: K('K_PRESET_WIN', []), grad: K('K_PRESET_GRAD', []) } }, draw)

const img = canvas('nn-heat', say('SAY_IN_LABEL'))
const out = canvas('nn-heat', say('SAY_OUT_LABEL'))
const stat = el('div')
const inLabel = el('p', { class: 'dk-label' })
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, el('div', { class: 'nn-two' }, el('div', {}, inLabel, img), el('div', {}, el('p', { class: 'dk-label' }, say('SAY_OUT_LABEL')), out)), stat, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

const inWin = (w, r, c) => r >= R0[w] && r < R0[w] + KER && c >= C0[w] && c < C0[w] + KER
function draw(s) {
  const n = calcOutputSize(SIDE)
  inLabel.textContent = s.grad ? say('SAY_GRAD_LABEL') : say('SAY_IN_LABEL')
  heat(img, { rows: SIDE, cols: SIDE, value: (r, c) => (s.grad ? backward4At(r * SIDE + c) : r * SIDE + c), lo: 0, hi: s.grad ? 4 : 15, w: 400, cell: 92, fmt: (v) => fmt(v, s.grad ? 2 : 0), mark: (r, c) => (inWin(s.win, r, c) ? 'on' : 'dim'), onTap: (r, c) => ctl.set('win', [0, 1, 2, 3].find((w) => inWin(w, r, c))) })
  heat(out, { rows: n, cols: n, value: (r, c) => pool4At(r * n + c), lo: 0, hi: 15, w: 400, cell: 150, fmt: (v) => fmt(v, 2), mark: (r, c) => (r * n + c === s.win ? 'on' : 'dim'), onTap: (r, c) => ctl.set('win', r * n + c) })
  stat.replaceChildren(tiles([
    { label: say('SAY_WINDOW'), value: `${s.win + 1} / ${n * n}`, tone: 1 },
    { label: say('SAY_AVERAGE'), value: fmt(pool4At(s.win), 2), tone: 0 },
    { label: say('SAY_OUT_SIDE'), value: `${n} x ${n}`, tone: 2 },
    { label: say('SAY_GRAD_SHARE'), value: fmt(backward4At(R0[s.win] * SIDE + C0[s.win]), 2), tone: 5 },
  ]))
}

ctl.start()
