// hive-task-filter/tool.js -- lesson 3 of queen-and-hive: one task, three kinds, seven states. Every
// grid cell is task_matches(kind mask, state mask, kind, state) and the rows below are job_state and
// review_state, all of gHashTag/t27 specs/queen/tasks.t27 compiled to wasm (./logic.js). Words are
// SAY_ and numbers K_ constants of specs/widgets/hive-task-filter.t27.
import { jobState, reviewState, taskMatches } from './logic.js'
import { K, W, ask, controls, el, grid, head, pill, root, say, source, taps } from '../hive-kit.js'

const NK = K('K_KINDS', 3), NS = K('K_STATES', 7)
const ctl = controls([
  { key: 'km', kind: 'hidden', min: 0, max: 7 },
  { key: 'sm', kind: 'hidden', min: 0, max: 127 },
], { names: W.SAY_PRESET_NAMES, values: { km: K('K_PRESET_KINDS', []), sm: K('K_PRESET_STATES', []) } }, draw)

const out = el('div')
root.replaceChildren(ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())
const STATE_TONES = [2, 6, 0, 1, 0, 8, 6]

function draw(s) {
  out.replaceChildren(
    head(say('SAY_KINDS')),
    taps([...Array(NK)].map((_, i) => ({ label: say('SAY_KIND_NAMES', i), pressed: !!(s.km & (1 << i)), tone: 5 })), (i) => ctl.set('km', s.km ^ (1 << i)), say('SAY_KINDS')),
    head(say('SAY_STATES')),
    taps([...Array(NS)].map((_, i) => ({ label: say('SAY_STATE_NAMES', i), pressed: !!(s.sm & (1 << i)), tone: STATE_TONES[i] })), (i) => ctl.set('sm', s.sm ^ (1 << i)), say('SAY_STATES')),
    head(say('SAY_GRID')),
    grid({ rows: NK, cols: NS, rowLabels: W.SAY_KIND_NAMES, colLabels: W.SAY_STATE_NAMES, cell: (r, c) => { const on = taskMatches(s.km, s.sm, r, c); return { text: on ? say('SAY_PASS') : '', on, tone: STATE_TONES[c] } } }),
    el('div', { class: 'hk-two' },
      el('div', {}, head(say('SAY_JOB')), el('p', { class: 'hk-taps' }, [0, 1, 2, 3].map((j) => { const t = jobState(j); return pill(`${say('SAY_JOB_STATES', j)}: ${say('SAY_STATE_NAMES', t)}`, STATE_TONES[t]) }))),
      el('div', {}, head(say('SAY_REVIEW')), el('p', { class: 'hk-taps' }, [0, 1, 2, 3].map((r) => { const t = reviewState(r); return pill(`${say('SAY_REVIEW_STATES', r)}: ${say('SAY_STATE_NAMES', t)}`, STATE_TONES[t]) })))))
}

ctl.start()
