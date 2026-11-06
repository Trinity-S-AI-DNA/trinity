// uart-bucket/tool.js -- the bucket under the tap. Every word is a SAY_ constant from
// specs/widgets/uart-bucket.t27 (window.T27_WIDGET); the buffer rule is its K_ constants; every
// measured number is from ./data.json (scripts/widget-data/uart-bucket.mjs). Reads only ./data.json
// and ./tool.css; calls no other host; keeps no state.
const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.appendChild(css)

const SVG = 'http://www.w3.org/2000/svg'
const fill = (s, vars) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : String(n))
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue
    if (k === 'class') n.className = v
    else n.setAttribute(k, v)
  }
  for (const c of kids.flat(Infinity)) if (c != null) n.append(c instanceof Node ? c : String(c))
  return n
}
const sv = (tag, attrs = {}, text) => {
  const n = document.createElementNS(SVG, tag)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v))
  if (text != null) n.textContent = text
  return n
}

const RX = W.K_RX_BYTES
const ANS = W.K_ANSWER_BYTES
const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }

// --- The bucket -----------------------------------------------------------------------------
// Bucket geometry in SVG units: the brim (capacity) at BRIM_Y, the floor at FLOOR_Y.
const G = { w: 340, h: 300, tapX: 170, brimY: 104, floorY: 268, topL: 84, topR: 256, botL: 106, botR: 234 }
const xAt = (y, side) => {
  const t = (y - G.brimY) / (G.floorY - G.brimY)
  return side < 0 ? G.topL + (G.botL - G.topL) * t : G.topR + (G.botR - G.topR) * t
}

function bucket(d) {
  const s = sv('svg', { viewBox: `0 0 ${G.w} ${G.h}`, class: 'ub-svg', role: 'img' })
  const title = sv('title')
  s.append(title)
  // The tap: the node at the top, a pipe down to the bucket.
  s.append(sv('rect', { x: G.tapX - 60, y: 6, width: 120, height: 26, rx: 6, class: 'ub-node' }))
  s.append(sv('text', { x: G.tapX, y: 24, class: 'ub-node-t', 'text-anchor': 'middle' }, d.board))
  s.append(sv('rect', { x: G.tapX - 5, y: 32, width: 10, height: 24, class: 'ub-pipe' }))
  s.append(sv('text', { x: G.tapX + 12, y: 50, class: 'ub-label' }, fill(W.SAY_TAP, { answer: ANS })))
  // Water, clipped to the bucket.
  const clip = sv('clipPath', { id: 'ub-clip' })
  const inside = `${G.topL},${G.brimY} ${G.topR},${G.brimY} ${G.botR},${G.floorY} ${G.botL},${G.floorY}`
  clip.append(sv('polygon', { points: inside }))
  const defs = sv('defs')
  defs.append(clip)
  s.append(defs)
  const water = sv('rect', { x: G.topL - 4, width: G.topR - G.topL + 8, y: G.floorY, height: 0, class: 'ub-water', 'clip-path': 'url(#ub-clip)' })
  s.append(water)
  // Falling drops, one answer each.
  const drops = [0, 1, 2].map(() => s.appendChild(sv('rect', { x: G.tapX - 3, y: 56, width: 6, height: 10, rx: 3, class: 'ub-drop' })))
  // Spill over both rims, and the puddle of lost bytes.
  const spill = sv('g', { class: 'ub-spill' })
  for (const side of [-1, 1]) {
    const x = side < 0 ? G.topL : G.topR
    spill.append(sv('path', { d: `M ${x} ${G.brimY} q ${side * 14} 0 ${side * 18} 20 L ${x + side * 22} ${G.floorY + 10}`, class: 'ub-spill-line' }))
  }
  spill.append(sv('text', { x: G.topR + 30, y: G.floorY + 2, class: 'ub-spill-t' }, W.SAY_SPILL))
  s.append(spill)
  // The bucket wall and the brim line (capacity, gold).
  s.append(sv('polyline', { points: `${G.topL - 6},${G.brimY - 8} ${G.botL},${G.floorY} ${G.botR},${G.floorY} ${G.topR + 6},${G.brimY - 8}`, class: 'ub-wall' }))
  s.append(sv('line', { x1: G.topL - 2, x2: G.topR + 2, y1: G.brimY, y2: G.brimY, class: 'ub-brim' }))
  s.append(sv('text', { x: G.topL - 10, y: G.brimY + 4, class: 'ub-brim-t', 'text-anchor': 'end' }, fill(W.SAY_BRIM, { rx: RX })))
  // The drain: the Mac reading.
  s.append(sv('rect', { x: G.tapX - 5, y: G.floorY, width: 10, height: 14, class: 'ub-pipe' }))
  s.append(sv('text', { x: G.tapX, y: G.floorY + 28, class: 'ub-label', 'text-anchor': 'middle' }, W.SAY_DRAIN))
  const level = sv('text', { x: G.topR + 10, y: G.floorY, class: 'ub-level' })
  s.append(level)
  return { svg: s, title, water, drops, spill, level }
}

// Fraction of the brim the waiting bytes reach (can exceed 1).
const levelY = (frac) => G.floorY - (G.floorY - G.brimY) * Math.min(frac, 1)

function animator(b) {
  let target = 0
  let start = performance.now()
  let raf = 0
  const draw = (bytes, overflowing, dropPhase) => {
    const y = levelY(bytes / RX)
    b.water.setAttribute('y', y.toFixed(1))
    b.water.setAttribute('height', (G.floorY - y).toFixed(1))
    b.water.classList.toggle('is-over', overflowing)
    b.spill.style.opacity = overflowing ? '1' : '0'
    b.level.textContent = `${fmt(Math.round(Math.min(bytes, RX)))} B`
    b.level.setAttribute('x', (xAt(y, 1) + 8).toFixed(1))
    b.level.setAttribute('y', (y + 4).toFixed(1))
    b.drops.forEach((dr, i) => {
      if (dropPhase == null) { dr.style.opacity = '0'; return }
      const p = (dropPhase + i / b.drops.length) % 1
      const top = 56
      const bottom = Math.max(levelY(bytes / RX) - 8, top)
      dr.setAttribute('y', (top + (bottom - top) * p).toFixed(1))
      dr.style.opacity = '1'
    })
  }
  const frame = (now) => {
    const cyc = W.K_CYCLE_MS
    const t = ((now - start) % cyc) / cyc
    // 0..0.55 the Mac pauses and answers pile up; 0.55..0.75 hold; 0.75..1 the Mac reads them out.
    let bytes
    let dropPhase = null
    if (t < 0.55) { bytes = target * (t / 0.55); dropPhase = (t / 0.55) * 4 % 1 }
    else if (t < 0.75) bytes = target
    else bytes = Math.min(target, RX) * (1 - (t - 0.75) / 0.25)
    draw(bytes, bytes > RX, dropPhase)
    raf = requestAnimationFrame(frame)
  }
  const still = () => draw(target, target > RX, null)
  return {
    set(bytes) {
      target = bytes
      if (reduce.matches || document.hidden) { cancelAnimationFrame(raf); raf = 0; still(); return }
      if (!raf) { start = performance.now(); raf = requestAnimationFrame(frame) }
    },
    get target() { return target },
  }
}

// --- The page -------------------------------------------------------------------------------
function draw(d) {
  const b = bucket(d)
  const anim = animator(b)
  const lo = W.K_WINDOW_MIN
  const hi = W.K_WINDOW_MAX
  const marks = el('datalist', { id: 'ub-marks' }, [...W.K_ARM_WINDOWS, ...W.K_EDGE_WINDOWS].map((w) => el('option', { value: String(w) })))
  const range = el('input', { type: 'range', min: String(lo), max: String(hi), step: '1', value: String(W.K_WINDOW_START), list: 'ub-marks', class: 'ub-range', id: 'ub-range', 'aria-label': W.SAY_WINDOW_LABEL })
  const out = el('output', { class: 'ub-w', for: 'ub-range' })
  const minus = el('button', { type: 'button', class: 't27-btn ub-step', 'aria-label': W.SAY_FEWER }, W.SAY_MINUS)
  const plus = el('button', { type: 'button', class: 't27-btn ub-step', 'aria-label': W.SAY_MORE }, W.SAY_PLUS)
  const readout = el('p', { class: 'ub-readout' })
  const verdict = el('p', { class: 'ub-verdict' })
  const armCards = []

  const set = (w) => {
    w = Math.max(lo, Math.min(hi, Math.round(w)))
    range.value = String(w)
    out.textContent = String(w)
    const bytes = w * ANS
    readout.textContent = fill(W.SAY_READOUT, { w, answer: ANS, bytes: fmt(bytes), rx: RX })
    const over = bytes > RX
    verdict.textContent = over ? fill(W.SAY_OVER, { over: fmt(bytes - RX) }) : fill(W.SAY_FITS, { spare: fmt(RX - bytes) })
    verdict.classList.toggle('is-over', over)
    b.title.textContent = `${readout.textContent} ${verdict.textContent}`
    for (const c of armCards) c.el.classList.toggle('is-shown', c.w === w)
    anim.set(bytes)
  }
  range.addEventListener('input', () => set(Number(range.value)))
  minus.addEventListener('click', () => set(Number(range.value) - 1))
  plus.addEventListener('click', () => set(Number(range.value) + 1))
  if (reduce.addEventListener) reduce.addEventListener('change', () => set(Number(range.value)))
  document.addEventListener('visibilitychange', () => set(Number(range.value)))

  const ruleLine = el('p', { class: 'ub-rule' }, fill(W.SAY_RULE, { rx: RX, answer: ANS, ratio: d.ratio, fit: W.K_LARGEST_FIT }))

  // Measured arms, side by side.
  const arm = (a) => {
    const lostCls = a.lost > 0 ? 'ub-lost' : ''
    const vals = [`${fmt(a.inFlight)} B`, fmt(a.jobsSent), fmt(a.accepted), fmt(a.lost), fmt(a.events), `${a.elapsedS} ${W.SAY_SECONDS}`]
    const over = a.inFlight > RX
    const show = el('button', { type: 'button', class: 't27-btn ub-show' }, fill(W.SAY_SHOW, { w: a.window }))
    const card = el('section', { class: `ub-arm ${over ? 'is-over' : ''}` },
      el('h3', {}, fill(W.SAY_ARM_HEAD, { w: a.window })),
      el('dl', {}, W.SAY_ARM_ROWS.map((label, i) => [el('dt', {}, label), el('dd', { class: i === 3 ? lostCls : '' }, vals[i])])),
      show)
    show.addEventListener('click', () => { set(a.window); range.focus() })
    armCards.push({ w: a.window, el: card })
    return card
  }
  const a64 = d.arms.find((a) => a.window === W.K_ARM_WINDOWS[0])
  const a24 = d.arms.find((a) => a.window === W.K_ARM_WINDOWS[1])
  const edges = el('ul', { class: 'ub-edges' }, d.edges.map((e) => {
    const vars = { w: e.window, bytes: fmt(e.inFlight), ok: fmt(e.receipts), planned: fmt(e.receiptsOf), sent: fmt(e.jobsSent) }
    const li = el('li', { class: e.slipped ? 'is-over' : '' }, fill(e.slipped ? W.SAY_EDGE_FAIL : W.SAY_EDGE_PASS, vars))
    const show = el('button', { type: 'button', class: 't27-btn ub-show' }, fill(W.SAY_SHOW, { w: e.window }))
    show.addEventListener('click', () => { set(e.window); range.focus() })
    li.append(' ', show)
    armCards.push({ w: e.window, el: li })
    return li
  }))

  const c = d.carried
  const carriedVals = [fmt(c.matrices), fmt(c.modelRows), fmt(c.weights), `${fmt(c.receipts)} / ${fmt(c.receiptsOf)}`, `${fmt(c.rows)} / ${fmt(c.rowsOf)}`, `${c.elapsedS} ${W.SAY_SECONDS}, ${fill(W.SAY_RATE, { rate: fmt(c.answersPerS) })}`]

  root.replaceChildren(
    el('p', { class: 'ub-intro' }, fill(W.SAY_INTRO, { board: d.board, answer: ANS, rx: RX })),
    el('div', { class: 'ub-play' },
      el('figure', { class: 'ub-stage' }, b.svg, el('figcaption', {}, W.SAY_BUCKET)),
      el('div', { class: 'ub-controls' },
        el('label', { class: 'ub-label-l', for: 'ub-range' }, W.SAY_WINDOW_LABEL, ' ', out),
        el('div', { class: 'ub-slider' }, minus, range, plus, marks),
        readout, verdict, ruleLine,
        reduce.matches ? el('p', { class: 'ub-note' }, W.SAY_MOTION_OFF) : null)),
    el('h2', { class: 'ub-h' }, fill(W.SAY_RUNS_TITLE, { board: d.board, jobs: fmt(d.jobsPerArm) })),
    el('div', { class: 'ub-arms' }, arm(a64), arm(a24)),
    el('p', { class: 'ub-note' }, fill(W.SAY_SAME_TIME, { t64: a64.elapsedS, t24: a24.elapsedS, req: d.wire.requestBytes, baud: fmt(d.wire.baud), jobs: fmt(d.wire.jobs), wire: d.wire.seconds })),
    el('h3', { class: 'ub-h3' }, fill(W.SAY_EDGE_TITLE, { planned: fmt(d.edges[0].planned) })),
    edges,
    el('p', { class: 'ub-caveat' }, W.SAY_CAVEAT),
    el('section', { class: 'ub-carried' },
      el('h2', { class: 'ub-h' }, fill(W.SAY_CARRIED_TITLE, { w: c.window })),
      el('p', { class: 'ub-note' }, fill(W.SAY_CARRIED_LINE, { board: d.board })),
      el('dl', {}, W.SAY_CARRIED_ROWS.map((label, i) => [el('dt', {}, label), el('dd', {}, carriedVals[i])])),
      d.generationOnMac ? el('p', { class: 'ub-plain' }, W.SAY_CARRIED_PLAIN) : null),
    el('details', { class: 'ub-sources' },
      el('summary', {}, W.SAY_SOURCES),
      el('ul', {}, d.sources.map((s) => el('li', {}, `${d.repo} ${s.path} ${W.SAY_AT} ${s.commit}`)))))
  set(Number(W.K_WINDOW_START))
}

root.replaceChildren(el('p', { class: 'ub-note' }, W.SAY_LOADING))
fetch(new URL(W.K_DATA_FILE || './data.json', import.meta.url), { credentials: 'omit' })
  .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
  .then(draw)
  .catch(() => root.replaceChildren(el('p', { class: 'ub-note' }, W.SAY_LOAD_FAILED)))
