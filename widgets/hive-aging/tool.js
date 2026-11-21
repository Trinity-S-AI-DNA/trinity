// hive-aging/tool.js -- lesson 4 of queen-and-hive: how long a labelled low issue waits. Every point
// of both lines and every tile is effective_level (and why) of gHashTag/t27 specs/queen/priority.t27,
// compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of
// specs/widgets/hive-aging.t27.
import { effectiveLevel, why } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, plot, root, say, source, svgEl, tiles } from '../hive-kit.js'

const AMAX = K('K_AGE_MAX', 60)
const ctl = controls([
  { key: 'level', label: say('SAY_LEVEL'), kind: 'choice', options: W.SAY_LEVEL_NAMES },
  { key: 'age', label: say('SAY_AGE'), min: 0, max: AMAX, step: 1 },
  { key: 'labelled', label: say('SAY_LABELLED'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { level: K('K_PRESET_LEVEL', []), labelled: K('K_PRESET_LABELLED', []), age: K('K_PRESET_AGE', []) } }, draw)

const svg = canvas('hk-plot', say('SAY_PLOT_LABEL'))
const stat = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, stat, svg, el('p', { class: 'dk-legend' }, el('span', {}, el('i', { style: `background:${COLORS[0]}` }), say('SAY_LINE')), el('span', {}, el('i', { style: `background:${COLORS[2]};opacity:0.6` }), say('SAY_FLAT'))), el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  svg.replaceChildren()
  const p = plot(svg, { w: 640, h: 300, x0: 0, x1: AMAX, y0: 3.4, y1: -0.4, xticks: K('K_AGE_TICKS', []), yticks: [0, 1, 2, 3], yfmt: (t) => say('SAY_LEVEL_NAMES', t), xlabel: say('SAY_AGE'), left: 78 })
  const days = [...Array(AMAX + 1)].map((_, d) => d)
  const step = (f) => days.flatMap((d) => [[d, f(d)], [d + 1, f(d)]]).filter(([x]) => x <= AMAX)
  p.line(step((d) => effectiveLevel(s.level, false, d)), COLORS[2], 2, { 'stroke-dasharray': '6 5' })
  p.line(step((d) => effectiveLevel(s.level, true, d)), COLORS[0], 4)
  const eff = effectiveLevel(s.level, !!s.labelled, s.age)
  svg.append(svgEl('circle', { cx: p.x(s.age), cy: p.y(eff), r: 8, fill: COLORS[1], stroke: '#020403', 'stroke-width': 3 }))
  const w = why(s.level, s.level, eff, !!s.labelled, 0)
  stat.replaceChildren(tiles([
    { label: say('SAY_PICKED'), value: say('SAY_LEVEL_NAMES', s.level), tone: 2 },
    { label: say('SAY_EFFECTIVE'), value: say('SAY_LEVEL_NAMES', eff), tone: 1 },
    { label: say('SAY_WHY'), value: say('SAY_WHY_NAMES', w), tone: 5 },
    { label: say('SAY_STEP'), value: String(K('K_AGING_DAYS', 14)), tone: 0 },
  ]))
}

ctl.start()
