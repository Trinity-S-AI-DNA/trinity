// hive-ship/tool.js -- lesson 8 of queen-and-hive: where a bee flies in the game and how it leaves.
// The ship is drawn at the place ship_mode names and at the opacity ship_alpha gives, both fn bodies
// of gHashTag/t27 specs/queen/hive.t27 compiled to wasm (./logic.js); the map is a fixed layout.
// Words are SAY_ and numbers K_ constants of specs/widgets/hive-ship.t27.
import { shipAlpha, shipMode } from './logic.js'
import { COLORS, K, W, ask, canvas, controls, el, root, say, source, svgEl, tiles, verdict } from '../hive-kit.js'

const ctl = controls([
  { key: 'cell', label: say('SAY_CELL'), kind: 'choice', options: W.SAY_CELL_NAMES },
  { key: 'ms', label: say('SAY_MS'), min: 0, max: K('K_MS_MAX', 3000), step: K('K_MS_STEP', 100) },
  { key: 'queued', label: say('SAY_QUEUED'), kind: 'toggle' },
  { key: 'working', label: say('SAY_WORKING'), kind: 'toggle' },
  { key: 'departing', label: say('SAY_DEPARTING'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { queued: K('K_PRESET_QUEUED', []), working: K('K_PRESET_WORKING', []), cell: K('K_PRESET_CELL', []), departing: K('K_PRESET_DEPARTING', []), ms: K('K_PRESET_MS', []) } }, draw)

const svg = canvas('hk-map', say('SAY_MAP'))
const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, svg, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
// Layout only: where each mode is drawn on the flat map, and the tone of each mode.
const ENTRANCE = [70, 120], PORTAL = [240, 120], CELL = [390, 120]
const MODE_TONES = [2, 0, 1, 5, 7]

function draw(s) {
  const mode = shipMode(!!s.queued, !!s.working, s.cell, !!s.departing)
  const alpha = shipAlpha(!!s.departing, s.ms)
  const fade = K('K_DEPART_MS', 2400)
  svg.replaceChildren()
  svg.setAttribute('viewBox', '0 0 480 220')
  svg.append(svgEl('path', { d: `M${ENTRANCE[0]},${ENTRANCE[1]} L${PORTAL[0]},${PORTAL[1]} L${CELL[0]},${CELL[1]}`, stroke: 'rgba(173,201,192,0.25)', 'stroke-width': 3, 'stroke-dasharray': '6 8', fill: 'none' }))
  const hex = (x, y, r) => [...Array(6)].map((_, k) => { const a = (Math.PI / 3) * k + Math.PI / 6; return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}` }).join(' ')
  svg.append(svgEl('rect', { x: ENTRANCE[0] - 50, y: ENTRANCE[1] - 40, width: 100, height: 80, rx: 18, fill: '#0b1210', stroke: COLORS[2], 'stroke-width': 3 }))
  svg.append(svgEl('circle', { cx: PORTAL[0], cy: PORTAL[1], r: 38, fill: 'none', stroke: COLORS[5], 'stroke-width': 4, 'stroke-dasharray': s.cell === 1 ? '0' : '4 6' }))
  svg.append(svgEl('polygon', { points: hex(CELL[0], CELL[1], 48), fill: s.cell === 0 ? '#10261c' : '#0b1210', stroke: s.cell === 0 ? COLORS[0] : 'rgba(173,201,192,0.3)', 'stroke-width': 3 }))
  svg.append(svgEl('circle', { cx: CELL[0], cy: CELL[1], r: 70, fill: 'none', stroke: 'rgba(0,255,136,0.25)', 'stroke-width': 2, 'stroke-dasharray': '3 6' }))
  ;[ENTRANCE, PORTAL, CELL].forEach((p, i) => svg.append(svgEl('text', { x: p[0], y: 212, 'text-anchor': 'middle', class: 'dk-txt-big' }, say('SAY_PLACES', i))))
  const t = Math.min(1, s.ms / fade)
  const at = [[ENTRANCE[0], ENTRANCE[1] + 4], [CELL[0], CELL[1] - 70], [CELL[0] + 50, CELL[1] - 50], [PORTAL[0], PORTAL[1]], [CELL[0] + (ENTRANCE[0] - CELL[0]) * t, CELL[1] - 40 * Math.sin(Math.PI * t)]][mode]
  svg.append(svgEl('circle', { cx: at[0], cy: at[1], r: 20, fill: COLORS[1], opacity: (alpha / 1000) * 0.35 }))
  svg.append(svgEl('ellipse', { cx: at[0], cy: at[1], rx: 14, ry: 10, fill: COLORS[1], stroke: '#020403', 'stroke-width': 3, opacity: alpha / 1000 }))
  out.replaceChildren(
    verdict(say('SAY_MODE_NAMES', mode), MODE_TONES[mode]),
    tiles([
      { label: say('SAY_MODE'), value: say('SAY_MODE_SHORT', mode), tone: MODE_TONES[mode] === 7 ? 1 : MODE_TONES[mode] },
      { label: say('SAY_ALPHA'), value: String(alpha), tone: 1 },
      { label: say('SAY_FADE'), value: String(fade), tone: 2 },
      { label: say('SAY_MS'), value: String(s.ms), tone: 5 },
    ]))
}

ctl.start()
