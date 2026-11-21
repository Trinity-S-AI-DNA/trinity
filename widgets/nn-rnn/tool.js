// nn-rnn/tool.js -- lesson 22 of neural-networks: how a network remembers what it saw a moment ago.
// A recurrent cell feeds its own last output back in: h' = tanh(x + 0.5 h), so a pulse echoes on and
// fades by about half each step. Every h is tiny_step of gHashTag/t27 specs/ml/recurrent/
// rnn_cell.t27, compiled to wasm (./logic.js), applied once per input in order; the spec's own
// three-step run is tiny_sequence. Tap a step to change its input. Words are SAY_ and numbers K_
// constants of specs/widgets/nn-rnn.t27.
import { tinySequence, tinyStep } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, fmt, legend, plot, root, say, source, svgEl, tiles } from '../nn-kit.js'

const N = K('K_STEPS', 8)
const keys = [...Array(N)].map((_, t) => `x${t}`)
const presets = K('K_PRESET_INPUTS', [])
const ctl = controls(keys.map((key) => ({ key, kind: 'hidden', min: -1, max: 1 })),
  { names: W.SAY_PRESET_NAMES, values: Object.fromEntries(keys.map((k, t) => [k, (W.SAY_PRESET_NAMES ?? []).map((_, p) => presets[p * N + t])])) }, draw)

const svg = canvas('nn-curve', say('SAY_PLOT_LABEL'))
const row = el('div', { class: 'nn-steps', role: 'group', 'aria-label': say('SAY_TAP') })
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, el('p', { class: 'dk-label' }, say('SAY_TAP')), row, svg, legend([[say('SAY_X'), COLORS[2]], [say('SAY_H'), COLORS[0]]]), stat, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const xs = keys.map((k) => s[k])
  const hs = []
  let h = 0
  for (const x of xs) hs.push((h = tinyStep(x, h)))
  row.replaceChildren(...xs.map((x, t) => {
    const b = el('button', { class: 't27-btn', type: 'button', 'aria-label': `${say('SAY_STEP')} ${t}` }, x > 0 ? '+1' : x < 0 ? '−1' : '0')
    b.addEventListener('click', () => ctl.set(keys[t], x >= 1 ? -1 : x + 1))
    return b
  }))
  svg.replaceChildren()
  const p = plot(svg, { w: 640, h: 320, x0: -0.5, x1: N - 0.5, y0: -1.1, y1: 1.1, xticks: [...Array(N)].map((_, t) => t), yticks: K('K_Y_TICKS', []), xlabel: say('SAY_STEP') })
  xs.forEach((x, t) => svg.append(svgEl('rect', { x: p.x(t) - 14, y: Math.min(p.y(0), p.y(x)), width: 28, height: Math.max(2, Math.abs(p.y(x) - p.y(0))), rx: 5, fill: COLORS[2], opacity: 0.55 })))
  p.line(hs.map((v, t) => [t, v]), COLORS[0], 3)
  hs.forEach((v, t) => svg.append(svgEl('circle', { cx: p.x(t), cy: p.y(v), r: 6, fill: COLORS[0], stroke: '#020403', 'stroke-width': 2 })))
  stat.replaceChildren(tiles([
    { label: say('SAY_H_LAST'), value: fmt(hs[N - 1], 4), tone: 0 },
    { label: say('SAY_H_ALL'), value: hs.map((v) => fmt(v, 2)).join(' '), tone: 1 },
    { label: say('SAY_SPEC_RUN'), value: [0, 1, 2].map((t) => fmt(tinySequence(t), 4)).join(' '), tone: 2 },
    { label: say('SAY_ECHO'), value: [tinyStep(1, 0), tinyStep(0, tinyStep(1, 0))].map((v) => fmt(v, 4)).join(' '), tone: 5 },
  ]))
}

ctl.start()
