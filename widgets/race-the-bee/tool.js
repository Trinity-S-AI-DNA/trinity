// race-the-bee/tool.js -- draws the snapshot in data.json. Every word is a SAY_ constant from
// specs/widgets/race-the-bee.t27 (window.T27_WIDGET); every number is from data.json. Reads only
// ./data.json and ./tool.css; calls no other host. Issue and PR links open on the reader's click.
const W = window.T27_WIDGET || {}
const root = document.getElementById('widget')

const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.appendChild(css)

const fill = (s, vars) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue
    if (k === 'class') n.className = v
    else n.setAttribute(k, v)
  }
  for (const c of kids.flat()) if (c != null) n.append(c instanceof Node ? c : String(c))
  return n
}
const link = (href, text, cls) => el('a', { href, target: '_blank', rel: 'noopener', class: cls }, text)
const stamp = (iso) => (iso ? iso.replace('T', ' ').replace(/:\d\dZ$/, '') : '')
const hrs = (h) => (h == null ? '-' : `${h} ${W.SAY_HOURS}`)
const laneIx = (lane) => (W.K_LANES || []).indexOf(lane)
const laneName = (lane) => (W.SAY_LANE_NAMES || [])[laneIx(lane)] ?? lane
const stateWord = (s) => (W.SAY_STATES || [])[['merged', 'open', 'closed'].indexOf(s)] ?? s
const chip = (lane) => el('span', { class: `rtb-chip rtb-${lane}` }, laneName(lane))

function scoreboard(d) {
  const card = (lane) => {
    const L = d.lanes[lane]
    return el('section', { class: `rtb-lane rtb-${lane}` },
      el('h2', {}, laneName(lane)),
      el('p', { class: 'rtb-rule' }, (W.SAY_LANE_LINES || [])[laneIx(lane)]),
      el('p', { class: 'rtb-big' }, String(L.merged), el('small', {}, W.SAY_MERGED)),
      el('dl', {},
        el('dt', {}, W.SAY_MEDIAN_ISSUE), el('dd', {}, hrs(L.medianHoursIssueToMerge)),
        el('dt', {}, W.SAY_MEDIAN_PR), el('dd', {}, hrs(L.medianHoursPrToMerge)),
        el('dt', {}, W.SAY_PORT_TASKS), el('dd', {}, String(L.portTasks))))
  }
  const recent = d.landed.slice(0, 8).map((r) => el('li', {},
    chip(r.lane), ' ',
    link(r.issueUrl, `#${r.issue}`), ' ', el('span', { class: 'rtb-title' }, r.title), ' ',
    el('span', { class: 'rtb-meta' }, `${W.SAY_PR} `, link(r.prUrl, `#${r.pr}`), ` ${hrs(r.hoursIssueToMerge)}`)))
  return el('div', {},
    el('div', { class: 'rtb-lanes' }, card('bee'), card('human')),
    el('p', { class: 'rtb-note' }, fill(W.SAY_NOT_SAME_WORK, { beePort: d.lanes.bee.portTasks, beeMerged: d.lanes.bee.merged, humanPort: d.lanes.human.portTasks })),
    el('h3', {}, W.SAY_RECENT),
    el('ul', { class: 'rtb-list' }, recent))
}

function headToHead(d) {
  if (!d.contested.length) return el('p', { class: 'rtb-note' }, W.SAY_H2H_NONE)
  const rows = d.contested.map((c) => el('li', { class: 'rtb-race' },
    el('p', { class: 'rtb-race-head' }, link(c.issueUrl, `#${c.issue}`), ' ', el('span', { class: 'rtb-title' }, c.title)),
    el('p', { class: 'rtb-verdict' },
      chip(c.openedFirstBy), ` ${W.SAY_OPENED_FIRST}`, el('span', { class: 'rtb-sep' }, ' / '),
      c.firstMergedBy ? [chip(c.firstMergedBy), ` ${W.SAY_MERGED_FIRST}`] : W.SAY_NOBODY_MERGED),
    el('ul', { class: 'rtb-prs' }, c.prs.map((p) => el('li', {},
      chip(p.lane), ' ', link(p.url, `${W.SAY_PR} #${p.pr}`), ' ',
      el('span', { class: 'rtb-meta' }, `${W.SAY_OPENED_AT} ${stamp(p.opened)}`,
        p.merged ? `, ${W.SAY_MERGED_AT} ${stamp(p.merged)}` : `, ${stateWord(p.state)}`))))))
  return el('div', {},
    el('p', { class: 'rtb-note' }, fill(W.SAY_H2H_INTRO, { n: d.contested.length })),
    el('ul', { class: 'rtb-list rtb-races' }, rows))
}

function takeOne(d) {
  const o = d.open
  const rows = o.shown.map((i) => el('li', {},
    link(i.url, `#${i.issue}`), ' ', el('span', { class: 'rtb-title' }, i.title), ' ',
    el('span', { class: 'rtb-meta' }, `${W.SAY_OPENED_AT} ${stamp(i.opened)}`), ' ',
    link(i.url, W.SAY_TAKE_LINK, 'rtb-take')))
  return el('div', {},
    el('p', { class: 'rtb-note' }, fill(W.SAY_TAKE_INTRO, { untouched: o.untouched, boundary: o.withBoundary })),
    el('p', { class: 'rtb-meta' }, fill(W.SAY_TAKE_COUNTS, { total: o.total, boundary: o.withBoundary, free: o.withoutOpenPr, branch: o.beeBranchExists })),
    el('ul', { class: 'rtb-list' }, rows))
}

function draw(d) {
  const views = [scoreboard, headToHead, takeOne]
  const panel = el('div', { class: 'rtb-panel', role: 'tabpanel' })
  const tabs = (W.SAY_TABS || []).map((name, i) => {
    const b = el('button', { type: 'button', class: 't27-btn', 'aria-pressed': i === 0 ? 'true' : 'false' }, name)
    b.addEventListener('click', () => {
      for (const t of tabs) t.setAttribute('aria-pressed', t === b ? 'true' : 'false')
      panel.replaceChildren(views[i](d))
    })
    return b
  })
  panel.append(views[0](d))
  root.replaceChildren(
    el('p', { class: 'rtb-snapshot' }, fill(W.SAY_SNAPSHOT, { at: stamp(d.snapshotAt), days: d.days, repo: d.repo })),
    el('div', { class: 'rtb-tabs', role: 'tablist' }, tabs),
    panel,
    el('details', { class: 'rtb-ruleblock' }, el('summary', {}, W.SAY_RULE_TITLE), el('p', {}, fill(W.SAY_RULE, { repo: d.repo }))))
}

root.replaceChildren(el('p', { class: 'rtb-note' }, W.SAY_LOADING))
fetch(new URL(W.K_DATA_FILE || './data.json', import.meta.url), { credentials: 'omit' })
  .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
  .then(draw)
  .catch(() => root.replaceChildren(el('p', { class: 'rtb-note' }, W.SAY_LOAD_FAILED)))
