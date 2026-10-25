// cmp-container/tool.js -- lesson 27 of t27-compiler: the header of a program file. The loader's answer is header_status, the
// number is magic_word and the sections are section_kind_ok and section_header_bytes, fn bodies of gHashTag/t27
// specs/isa/tri27_bytecode.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of
// specs/widgets/cmp-container.t27.
import { headerStatus, magicWord, sectionHeaderBytes, sectionKindOk } from './logic.js'
import { K, W, ask, controls, el, facts, fill, hue, root, say, source, stages, tape, verdict } from '../cmp-kit.js'

const ctl = controls([
  { key: 'len', label: say('SAY_LEN'), min: 0, max: K('K_MAX_LEN', 32), step: 1 },
  { key: 'b0', label: say('SAY_B0'), min: 0, max: 255, step: 1 },
  { key: 'b1', label: say('SAY_B1'), min: 0, max: 255, step: 1 },
  { key: 'b2', label: say('SAY_B2'), min: 0, max: 255, step: 1 },
  { key: 'b3', label: say('SAY_B3'), min: 0, max: 255, step: 1 },
  { key: 'version', label: say('SAY_VERSION'), min: 0, max: 4, step: 1 },
], { names: W.SAY_PRESET_NAMES, values: { len: K('K_PRESET_LEN', []), b0: K('K_PRESET_B0', []), b1: K('K_PRESET_B1', []), b2: K('K_PRESET_B2', []), b3: K('K_PRESET_B3', []), version: K('K_PRESET_VERSION', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

const glyph = (b) => (b > 32 && b < 127 ? String.fromCharCode(b) : '\u00b7')
const hex = (n) => '0x' + (n >>> 0).toString(16).padStart(8, '0')

function draw(s) {
  const status = headerStatus(s.len, s.b0, s.b1, s.b2, s.b3, s.version)
  const magic = magicWord(s.b0, s.b1, s.b2, s.b3)
  const ok = status === K('K_LOAD_OK', 0)
  out.replaceChildren(
    verdict(say('SAY_STATUS_NAMES', status), ok ? 0 : 6, say('SAY_STATUS_LINES', status)),
    tape([s.b0, s.b1, s.b2, s.b3].map((b, i) => ({ main: glyph(b), sub: b, color: hue(magic === K('K_MAGIC', -1) ? 0 : 6) })), null),
    facts([
      { label: say('SAY_MAGIC'), value: hex(magic), color: hue(magic === K('K_MAGIC', -1) ? 0 : 6) },
      { label: say('SAY_EXPECTED'), value: hex(K('K_MAGIC', 0)), color: hue(8) },
      ...[0, 1, 2, 3, 4, 5].map((id) => ({ label: say('SAY_SECTIONS', id), value: sectionKindOk(id) ? fill(say('SAY_HEADER_OF'), sectionHeaderBytes(id)) : say('SAY_NOT_KIND'), color: hue(sectionKindOk(id) ? 2 : 8) })),
    ]))
}

ctl.start()
