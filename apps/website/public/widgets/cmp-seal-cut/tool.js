// cmp-seal-cut/tool.js -- lesson 21 of t27-compiler: what a seal file holds after a cut run. The state is after_cut and
// whether it can be trusted is cut_safe and proto_cut_safe, fn bodies of gHashTag/t27 specs/verified/seal_write.t27
// compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/cmp-seal-cut.t27.
import { afterCut, cutSafe, protoCutSafe } from './logic.js'
import { K, W, ask, controls, el, grid, ladder, root, say, source, stages, verdict } from '../cmp-kit.js'

const ctl = controls([
  { key: 'proto', label: say('SAY_PROTO'), kind: 'choice', options: W.SAY_PROTOS },
  { key: 'cut', label: say('SAY_CUT'), kind: 'choice', options: W.SAY_CUTS },
  { key: 'foreign', label: say('SAY_FOREIGN'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { proto: K('K_PRESET_PROTO', []), cut: K('K_PRESET_CUT', []), foreign: K('K_PRESET_FOREIGN', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

// A way or a moment is its index plus one: the spec numbers them from 1.
function draw(s) {
  const disk = afterCut(s.proto + 1, s.cut + 1, !!s.foreign)
  const safe = cutSafe(disk)
  out.replaceChildren(
    verdict(say('SAY_DISKS', disk - 1), safe ? 0 : 6, safe ? say('SAY_SAFE') : say('SAY_UNSAFE')),
    el('p', { class: 'dk-label' }, say('SAY_GRID')),
    grid({
      rows: 3, cols: 4, rowLabels: W.SAY_PROTOS, colLabels: W.SAY_CUTS_SHORT,
      cell: (r, c) => { const d = afterCut(r + 1, c + 1, !!s.foreign); return { text: cutSafe(d) ? 'ok' : 'x', tone: cutSafe(d) ? 0 : 6, on: r === s.proto && c === s.cut } },
    }),
    el('p', { class: 'dk-label' }, `${say('SAY_PROTOS', s.proto)}: ${protoCutSafe(s.proto + 1) ? say('SAY_ALL_SAFE') : say('SAY_NOT_ALL_SAFE')}`),
    ladder(W.SAY_DISKS.map((name, i) => ({ label: name, tone: i < 2 ? 0 : 6, on: i === disk - 1 }))))
}

ctl.start()
