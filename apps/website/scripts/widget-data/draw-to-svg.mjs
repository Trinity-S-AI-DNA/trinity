// draw-to-svg.mjs -- replay a native widget's BINARY draw list (host.js replayBin protocol: fasm-skyline, idcode, placement-map ...)
// into an SVG, offline. Generic: the draw list is the .t27 spec's own card; this only translates canvas calls to SVG elements.
// Usage (from apps/website): node scripts/widget-data/draw-to-svg.mjs <tool-id> [export=w_bdraw2] [#hash] > card.svg
// No canvas backend (canvas, @napi-rs/canvas) is in node_modules, so PNG stops here; clip() is dropped (counted on stderr).
import { load } from './widget-host.mjs'

const N = [0, 'beginPath', 'closePath', 'fill', 'stroke', 'save', 'restore', 'moveTo', 'lineTo', 'translate', 'fillRect', 'strokeRect', 'setTransform', 'fillText', 'clearRect', 'rect', 'clip', 'setLineDash', 'arc']
const P = { 32: 'fillStyle', 33: 'strokeStyle', 34: 'lineWidth', 35: 'font', 36: 'textBaseline', 37: 'textAlign', 38: 'globalAlpha' }
const K = [0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 4, 4, 6, 0, 4, 4, 0, 0, 5]
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const sub = (r) => r.replace(/\u0001[^\u0002]*\u0002([^\u0003]*)\u0003/g, '$1').replace(/\u0004[^\u0005]*\u0005([^\u0006]*)\u0006/g, '$1')   // css-variable slots keep their fallback
const r4 = (v) => +v.toFixed(4)

export function toSvg(buf, W, H) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), dec = new TextDecoder(); let p = 0, clips = 0
  const f = () => { const r = v.getFloat64(p, true); p += 8; return r }, s = () => { const l = v.getUint16(p, true); p += 2; const r = dec.decode(buf.subarray(p, p + l)); p += l; return sub(r) }
  let st = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif', textBaseline: 'alphabetic', textAlign: 'start', globalAlpha: 1, m: [1, 0, 0, 1, 0, 0], dash: [] }
  const stack = [], out = []; let d = []
  const tf = () => (st.m.join() === '1,0,0,1,0,0' ? '' : ` transform="matrix(${st.m.map(r4).join(' ')})"`)
  const paint = (kind) => (kind === 'fill' ? ` fill="${esc(st.fillStyle)}" stroke="none"` : ` fill="none" stroke="${esc(st.strokeStyle)}" stroke-width="${r4(st.lineWidth)}"` + (st.dash.length ? ` stroke-dasharray="${st.dash.join(' ')}"` : '')) + (st.globalAlpha < 1 ? ` opacity="${st.globalAlpha}"` : '')
  const rectD = (x, y, w, h) => `M${r4(x)} ${r4(y)}h${r4(w)}v${r4(h)}h${r4(-w)}z`
  while (p < buf.length) {
    const op = buf[p++]
    if (op === 200) { p++; continue }
    if (op >= 32) { const val = op === 34 || op === 38 ? f() : s(); st[P[op]] = val; continue }
    const a = op === 13 ? [s(), f(), f()] : op === 17 ? [Array.from({ length: buf[p++] }, f)] : Array.from({ length: K[op] }, f), n = N[op]
    if (n === 'beginPath') d = []
    else if (n === 'closePath') d.push('Z')
    else if (n === 'moveTo') d.push(`M${r4(a[0])} ${r4(a[1])}`)
    else if (n === 'lineTo') d.push(`L${r4(a[0])} ${r4(a[1])}`)
    else if (n === 'rect') d.push(rectD(...a))
    else if (n === 'arc') { const [cx, cy, r, a0, a1] = a, big = Math.abs(a1 - a0) >= 2 * Math.PI - 1e-9; if (big) d.push(`M${r4(cx - r)} ${r4(cy)}a${r4(r)} ${r4(r)} 0 1 0 ${r4(2 * r)} 0a${r4(r)} ${r4(r)} 0 1 0 ${r4(-2 * r)} 0`); else d.push(`${d.length ? 'L' : 'M'}${r4(cx + r * Math.cos(a0))} ${r4(cy + r * Math.sin(a0))}A${r4(r)} ${r4(r)} 0 ${Math.abs(a1 - a0) > Math.PI ? 1 : 0} ${a1 > a0 ? 1 : 0} ${r4(cx + r * Math.cos(a1))} ${r4(cy + r * Math.sin(a1))}`) }
    else if (n === 'fill') out.push(`<path d="${d.join('')}"${paint('fill')}${tf()}/>`)
    else if (n === 'stroke') out.push(`<path d="${d.join('')}"${paint('stroke')}${tf()}/>`)
    else if (n === 'fillRect') out.push(`<path d="${rectD(...a)}"${paint('fill')}${tf()}/>`)
    else if (n === 'strokeRect') out.push(`<path d="${rectD(...a)}"${paint('stroke')}${tf()}/>`)
    else if (n === 'clearRect') out.push(`<path d="${rectD(...a)}" fill="#000"${tf()}/>`)
    else if (n === 'fillText') out.push(`<text x="${r4(a[1])}" y="${r4(a[2])}" style="font:${esc(st.font)}" text-anchor="${{ start: 'start', left: 'start', center: 'middle', end: 'end', right: 'end' }[st.textAlign] || 'start'}" dominant-baseline="${{ top: 'text-before-edge', hanging: 'hanging', middle: 'central', bottom: 'text-after-edge', alphabetic: 'alphabetic' }[st.textBaseline] || 'alphabetic'}"${paint('fill')}${tf()} xml:space="preserve">${esc(a[0])}</text>`)
    else if (n === 'save') stack.push(structuredClone(st))
    else if (n === 'restore') { if (stack.length) st = stack.pop() }
    else if (n === 'translate') { const m = st.m; st.m = [m[0], m[1], m[2], m[3], m[0] * a[0] + m[2] * a[1] + m[4], m[1] * a[0] + m[3] * a[1] + m[5]] }
    else if (n === 'setTransform') st.m = a
    else if (n === 'setLineDash') st.dash = a[0]
    else if (n === 'clip') clips++
  }
  if (clips) console.error(`draw-to-svg: ${clips} clip() calls dropped`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${out.join('\n')}\n</svg>\n`
}

if (process.argv[1]?.endsWith('draw-to-svg.mjs')) {
  const [id, name = 'w_bdraw2', hash = ''] = process.argv.slice(2), w = await load(id, hash)
  const m = w.meta, W = m.K_CARD_WIDTH || 1200, H = m.K_CARD_HEIGHT || 630
  process.stdout.write(toSvg(w.call(name), W, H))
}
