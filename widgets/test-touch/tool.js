// test-touch/tool.js -- draws the snapshot in data.json. Every word is a SAY_ constant from
// specs/widgets/test-touch.t27 (window.T27_WIDGET); every number is from data.json, which
// scripts/widget-data/test-touch.mjs wrote. Reads only ./data.json and ./tool.css; calls no other
// host. Pull request links open on the reader's click.
const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.appendChild(css)

const PAGE = 40
const fill = (s, vars) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
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
const link = (href, text, cls) => el('a', { href, target: '_blank', rel: 'noopener', class: cls }, text)
const stamp = (iso) => (iso ? iso.replace('T', ' ').replace(/:\d\dZ$/, '') : '')
const lanes = () => W.K_LANES || []
const laneName = (lane) => (W.SAY_LANE_NAMES || [])[lanes().indexOf(lane)] ?? lane
const chip = (lane) => el('span', { class: `tt-chip tt-${lane}` }, laneName(lane))
const badge = (b) => el('span', { class: `tt-badge tt-b${b}` }, (W.SAY_BADGES || [])[b])
const tagWord = (g) => (W.SAY_TAGS || [])[(W.K_TAGS || []).indexOf(g)] ?? g
const btn = (text, pressed, onClick) => {
  const b = el('button', { type: 'button', class: 't27-btn', 'aria-pressed': pressed ? 'true' : 'false' }, text)
  b.addEventListener('click', onClick)
  return b
}

function verdict(d) {
  const bee = d.prs.filter((p) => p.lane === 'bee')
  const bad = bee.filter((p) => p.badge === 3)
  const V = (lane) => d.lanes[lane].vector
  if (!bad.length) return el('section', { class: 'tt-verdict tt-ok' }, el('p', {}, W.SAY_VERDICT_NO))
  const last = bad.map((p) => p.merged).sort().pop()
  const after = bee.filter((p) => p.merged > last).length
  return el('section', { class: 'tt-verdict' },
    el('p', { class: 'tt-verdict-main' }, fill(W.SAY_VERDICT_YES, {
      beeRemoved: V('bee')[4], beePrs: V('bee')[0], beeBlocks: d.lanes.bee.testsRemoved,
      humanRemoved: V('human')[4], humanPrs: V('human')[0],
    })),
    el('p', { class: 'tt-verdict-sub' }, fill(W.SAY_VERDICT_LAST, { last: stamp(last), after })))
}

function laneCard(d, lane) {
  const L = d.lanes[lane]
  const v = L.vector
  const bar = el('div', { class: 'tt-bar', role: 'img', 'aria-label': [1, 2, 3, 4].map((i) => `${(W.SAY_BADGES || [])[i - 1]} ${v[i]}`).join(', ') },
    [4, 3, 2, 1].map((i) => el('span', { class: `tt-seg tt-b${i - 1}`, style: `flex-grow:${v[i]}` })))
  const counts = el('ul', { class: 'tt-counts' }, [3, 2, 1, 0].map((b) => el('li', {}, badge(b), ' ', el('b', {}, String(v[b + 1])))))
  const stats = [L.checksAdded, L.checksRemoved, L.testsRemoved, L.expect, L.loosened]
  return el('section', { class: `tt-lane tt-${lane}` },
    el('h2', {}, laneName(lane)),
    el('p', { class: 'tt-rule' }, (W.SAY_LANE_LINES || [])[lanes().indexOf(lane)]),
    el('p', { class: 'tt-big' }, el('span', { class: 'tt-bad' }, String(v[4])), ` / ${v[0]}`,
      el('small', {}, `${W.SAY_REMOVED_OF}; ${v[0]} ${W.SAY_MERGED}`)),
    bar, counts,
    el('dl', {}, (W.SAY_STAT_NAMES || []).map((name, i) => [el('dt', {}, name), el('dd', {}, String(stats[i]))])))
}

function prBody(p) {
  const c = p.counts
  const byFile = new Map()
  for (const l of p.lines) {
    if (!byFile.has(l.f)) byFile.set(l.f, [])
    byFile.get(l.f).push(l)
  }
  const files = [...byFile].map(([f, ls]) => el('div', { class: 'tt-file' },
    el('p', { class: 'tt-path' }, p.files[f]?.p ?? ''),
    el('ol', { class: 'tt-lines' }, ls.map((l) => el('li', { class: `tt-line tt-s${l.s === '-' ? 'm' : 'p'} tt-g-${l.g}` },
      el('span', { class: 'tt-tag' }, tagWord(l.g)),
      el('code', {}, `${l.s} ${l.t.replace(/^\s+/, '')}`),
      l.b ? el('span', { class: 'tt-block' }, l.b) : null)))))
  return el('div', { class: 'tt-body' },
    el('p', { class: 'tt-meta' }, `${stamp(p.merged)}, ${p.author}, ${p.branch}, ${(W.SAY_CLASSES || [])[p.cls]}`),
    el('p', { class: 'tt-meta' }, fill(W.SAY_TEST_FILES, { n: p.testFiles, all: p.allFiles }), '; ',
      fill(W.SAY_CHECKS, { added: c.checksAdded ?? 0, removed: c.checksRemoved ?? 0, blocks: c.testsRemoved ?? 0 })),
    p.lines.length ? files : el('p', { class: 'tt-meta' }, W.SAY_NO_LINES),
    p.more ? el('p', { class: 'tt-meta' }, fill(W.SAY_MORE_LINES, { n: p.more })) : null,
    p.ciGate ? el('p', { class: 'tt-note' }, W.SAY_CI_GATE) : null,
    p.apiOnly ? el('p', { class: 'tt-note' }, fill(W.SAY_API_ONLY, { n: p.apiOnly })) : null,
    link(p.url, W.SAY_OPEN_PR, 'tt-open'))
}

function prRow(p) {
  const row = el('details', { class: `tt-pr tt-r${p.badge}` },
    el('summary', {}, badge(p.badge), ' ', chip(p.lane), ' ',
      el('span', { class: 'tt-num' }, `#${p.n}`), ' ',
      el('span', { class: 'tt-title' }, p.title || W.SAY_NO_TITLE)))
  row.addEventListener('toggle', () => {
    if (row.open && row.children.length === 1) row.append(prBody(p))
  })
  return row
}

function draw(d) {
  const all = [...d.prs].sort((a, b) => b.badge - a.badge || (a.merged < b.merged ? 1 : -1))
  const state = { lane: null, badge: null, shown: PAGE }
  const laneBtns = el('div', { class: 'tt-filter', role: 'group', 'aria-label': W.SAY_FILTER_LANE })
  const badgeBtns = el('div', { class: 'tt-filter', role: 'group', 'aria-label': W.SAY_FILTER_BADGE })
  const count = el('p', { class: 'tt-meta' })
  const list = el('div', { class: 'tt-list' })
  const more = btn(W.SAY_SHOW_MORE, false, () => { state.shown += PAGE; render() })

  const buttons = () => {
    laneBtns.replaceChildren(el('span', { class: 'tt-flabel' }, W.SAY_FILTER_LANE),
      ...[null, ...lanes()].map((l) => btn(l ? laneName(l) : W.SAY_ALL, state.lane === l, () => { state.lane = l; state.shown = PAGE; render() })))
    badgeBtns.replaceChildren(el('span', { class: 'tt-flabel' }, W.SAY_FILTER_BADGE),
      ...[null, 3, 2, 1, 0].map((b) => btn(b == null ? W.SAY_ALL : (W.SAY_BADGES || [])[b], state.badge === b, () => { state.badge = b; state.shown = PAGE; render() })))
  }
  const render = () => {
    buttons()
    const rows = all.filter((p) => (state.lane == null || p.lane === state.lane) && (state.badge == null || p.badge === state.badge))
    count.textContent = fill(W.SAY_SHOWING, { n: rows.length, total: all.length })
    list.replaceChildren(...rows.slice(0, state.shown).map(prRow))
    more.hidden = rows.length <= state.shown
  }
  render()

  const bullets = (items) => el('ul', {}, (items || []).map((t) => el('li', {}, t)))
  root.replaceChildren(
    el('p', { class: 'tt-snapshot' }, fill(W.SAY_SNAPSHOT, { at: stamp(d.snapshotAt), days: d.days, repo: d.repo })),
    verdict(d),
    el('div', { class: 'tt-lanes' }, lanes().map((l) => laneCard(d, l))),
    laneBtns, badgeBtns, count, list, more,
    el('details', { class: 'tt-ruleblock' }, el('summary', {}, W.SAY_RULE_TITLE),
      bullets(W.SAY_RULE),
      el('h3', {}, W.SAY_FALSE_POS_TITLE), bullets(W.SAY_FALSE_POS),
      el('h3', {}, W.SAY_FALSE_NEG_TITLE), bullets(W.SAY_FALSE_NEG),
      el('p', {}, W.SAY_NOT_INTENT),
      el('p', {}, fill(W.SAY_EXCLUDED, { notMaster: d.excluded?.notMaster ?? 0 }))))
}

root.replaceChildren(el('p', { class: 'tt-note' }, W.SAY_LOADING))
fetch(new URL(W.K_DATA_FILE || './data.json', import.meta.url), { credentials: 'omit' })
  .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
  .then(draw)
  .catch(() => root.replaceChildren(el('p', { class: 'tt-note' }, W.SAY_LOAD_FAILED)))
