// hive-burn/tool.js -- lesson 21 of queen-and-hive: tokens that burn. Each batch's countdown is
// days_left(landed, today, MONTH_DAYS), the fn body of gHashTag/t27 specs/automation/token-wallet.t27
// compiled to wasm (./logic.js); the list is ordered by those answers. Words are SAY_ and numbers K_
// constants of specs/widgets/hive-burn.t27.
import { daysLeft } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, fill, head, ladder, root, say, source, svgEl } from '../hive-kit.js'

const TMAX = K('K_TODAY_MAX', 60), LIFE = K('K_MONTH_DAYS', 30), LANDED = K('K_BATCH_DAYS', [])
const ctl = controls([{ key: 'today', label: say('SAY_TODAY'), min: 0, max: TMAX, step: 1 }], { names: W.SAY_PRESET_NAMES, values: { today: K('K_PRESET_TODAY', []) } }, draw)
const svg = canvas('hk-strip', say('SAY_STRIP'))
const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, svg, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const TONES = [1, 3, 0]

function draw(s) {
  const left = LANDED.map((d) => daysLeft(d, s.today, LIFE))
  const w = 420, x = (d) => 20 + (d / TMAX) * (w - 40)
  svg.replaceChildren()
  svg.setAttribute('viewBox', `0 0 ${w} 190`)
  LANDED.forEach((d, i) => {
    const y = 20 + i * 50
    svg.append(svgEl('rect', { x: x(d), y, width: x(d + LIFE) - x(d), height: 30, rx: 8, fill: COLORS[TONES[i]], opacity: left[i] ? 0.85 : 0.18 }))
    svg.append(svgEl('text', { x: x(d) + 6, y: y + 20, class: 'dk-txt', style: 'fill:#020403;font-weight:700;font-size:13px' }, say('SAY_BATCHES', i)))
  })
  svg.append(svgEl('line', { x1: x(s.today), x2: x(s.today), y1: 10, y2: 170, stroke: '#fff', 'stroke-width': 3 }))
  for (const t of [0, 15, 30, 45, 60].filter((t) => t <= TMAX)) svg.append(svgEl('text', { x: x(t), y: 186, class: 'dk-tick', 'text-anchor': 'middle' }, t))
  const order = LANDED.map((_, i) => i).sort((a, b) => (left[a] || Infinity) - (left[b] || Infinity))
  out.replaceChildren(head(say('SAY_ORDER')), ladder(order.map((i) => ({ label: say('SAY_BATCHES', i), sub: `${fill(say('SAY_LANDED'), LANDED[i])} · ${left[i] ? fill(say('SAY_LEFT'), left[i]) : say('SAY_GONE')}`, tone: TONES[i], on: left[i] > 0 }))))
}

ctl.start()
