// cmp-gen-files/tool.js -- lesson 18 of t27-compiler: seal --verify and the committed generated files. The verdicts are
// gen_file_passes, verify_passes and verify_passes_today, fn bodies of gHashTag/t27 specs/verified/gen_file_check.t27
// compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/cmp-gen-files.t27.
import { genFilePasses, verifyPasses, verifyPassesToday } from './logic.js'
import { K, W, ask, controls, el, fill, hue, pill, root, say, source, stages, verdict } from '../cmp-kit.js'

const KEYS = ['rust', 'c', 'verilog', 'json']
const ctl = controls([
  { key: 'seal', label: say('SAY_SEAL'), kind: 'toggle' },
  ...KEYS.map((key, i) => ({ key, label: say('SAY_FILES', i), kind: 'choice', options: W.SAY_STATES })),
], { names: W.SAY_PRESET_NAMES, values: { seal: K('K_PRESET_SEAL', []), rust: K('K_PRESET_RUST', []), c: K('K_PRESET_C', []), verilog: K('K_PRESET_VERILOG', []), json: K('K_PRESET_JSON', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const now = verifyPasses(!!s.seal, s.rust, s.c, s.verilog, s.json)
  const before = verifyPassesToday(!!s.seal, s.rust, s.c, s.verilog, s.json)
  const word = (v) => (v ? say('SAY_PASSES') : say('SAY_FAILS'))
  out.replaceChildren(
    verdict(fill(say('SAY_VERIFY'), word(now)), now ? 0 : 6, fill(say('SAY_BEFORE'), word(before))),
    ...KEYS.map((k, i) => el('div', { class: 'hk-path' },
      el('p', { class: 'hk-path-head' }, el('code', {}, say('SAY_FILES', i)), pill(`${say('SAY_STATES', s[k])}: ${word(genFilePasses(s[k]))}`, genFilePasses(s[k]) ? 0 : 6)),
      el('p', { class: 'hk-cap', style: `color:${hue(8)}` }, say('SAY_STATE_LINES', s[k])))))
}

ctl.start()
