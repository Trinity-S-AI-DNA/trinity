// decimator/tool.js -- lesson 19 of arithmetic-and-dsp: keep every R-th sample and everything near a
// multiple of the new rate folds onto your band. It computes nothing itself: the new rate, which
// input frequencies fold into the band and where a tone lands come from ./logic.js, the fn bodies
// of gHashTag/t27 specs/fpga/dsp/signals.t27 compiled to wasm. Words are SAY_ and numbers K_
// constants of specs/widgets/decimator.t27.
import { decimAlias, decimRate, foldsInto } from './logic.js'
import { COLORS, K, W, canvas, controls, el, fill, plot, root, say, source, svgEl, tiles } from '../dsp-kit.js'

const FS = K('K_FS', 400)
const ctl = controls([
  { key: 'r', label: say('SAY_R'), min: 2, max: K('K_MAX_R', 16) },
  { key: 'band', label: say('SAY_BAND'), min: 1, max: K('K_MAX_BAND', 50) },
  { key: 'f', label: say('SAY_F'), min: 0, max: FS / 2 },
], { names: W.SAY_PRESET_NAMES, values: { r: K('K_PRESET_R'), band: K('K_PRESET_BAND'), f: K('K_PRESET_F') } }, draw)

const inSvg = canvas('dc-in', say('SAY_IN_LABEL'))
const outSvg = canvas('dc-out', say('SAY_OUT_LABEL'))
const stat = el('div')
root.replaceChildren(ctl.node, stat, inSvg, el('p', { class: 'dk-note' }, say('SAY_NOTE')), outSvg, source())

function draw(s) {
  const lands = decimAlias(s.f, FS, s.r)
  const hit = foldsInto(s.f, FS, s.r, s.band)
  const newRate = decimRate(FS, s.r)
  inSvg.replaceChildren()
  const p = plot(inSvg, { w: 640, h: 180, x0: 0, x1: FS / 2, y0: 0, y1: 1, xticks: [0, FS / 8, FS / 4, (3 * FS) / 8, FS / 2], yticks: [], xlabel: fill(say('SAY_IN_AXIS'), FS), left: 20 })
  // Every input frequency the spec says folds onto the band, painted column by column.
  const cols = 400
  for (let c = 0; c < cols; c++) {
    const f0 = (FS / 2) * (c + 0.5) / cols
    if (foldsInto(f0, FS, s.r, s.band)) inSvg.append(svgEl('rect', { x: p.x((FS / 2) * c / cols), y: p.y(1), width: p.x(FS / 2 / cols) - p.x(0) + 0.4, height: p.y(0) - p.y(1), fill: f0 <= s.band ? COLORS[0] : COLORS[6], opacity: f0 <= s.band ? 0.55 : 0.4 }))
  }
  inSvg.append(svgEl('line', { x1: p.x(s.f), x2: p.x(s.f), y1: p.y(1), y2: p.y(0), stroke: COLORS[2], 'stroke-width': 3 }))
  inSvg.append(svgEl('circle', { cx: p.x(s.f), cy: p.y(0.85), r: 7, fill: COLORS[2] }))
  outSvg.replaceChildren()
  const po = plot(outSvg, { w: 640, h: 150, x0: 0, x1: newRate / 2, y0: 0, y1: 1, xticks: [0, newRate / 4, newRate / 2], yticks: [], xlabel: fill(say('SAY_OUT_AXIS'), newRate.toFixed(1)), left: 20 })
  outSvg.append(svgEl('rect', { x: po.x(0), y: po.y(1), width: Math.max(0, po.x(Math.min(s.band, newRate / 2)) - po.x(0)), height: po.y(0) - po.y(1), fill: COLORS[0], opacity: 0.25 }))
  outSvg.append(svgEl('line', { x1: po.x(lands), x2: po.x(lands), y1: po.y(1), y2: po.y(0), stroke: hit ? COLORS[6] : COLORS[2], 'stroke-width': 3 }))
  outSvg.append(svgEl('circle', { cx: po.x(lands), cy: po.y(0.85), r: 7, fill: hit ? COLORS[6] : COLORS[2] }))
  stat.replaceChildren(tiles([
    { label: say('SAY_NEW_RATE'), value: newRate.toFixed(1), tone: 1 },
    { label: say('SAY_LANDS'), value: lands.toFixed(1), tone: 2 },
    { label: say('SAY_IN_BAND'), value: hit ? say('SAY_YES') : say('SAY_NO'), tone: hit ? 'bad' : 0 },
    { label: say('SAY_BAND_IS'), value: fill('0 .. {0}', s.band), tone: 0 },
  ]))
}

ctl.start()
