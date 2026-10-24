// cmp-fields/tool.js -- lesson 26 of t27-compiler: packing an instruction word. The word is t27a_encode, the fields are read
// back by opcode_of, dst_of, t27a_src1, t27a_src2, v3_of and t27a_imm, and the judgements are is_canonical and imm_clamped,
// fn bodies compiled to wasm (./logic.js) from gHashTag/t27 specs/isa/t27a.t27 and the
// isa/ternary_encoding.t27 and isa/t27a_mnemonics.t27 it uses. Words are SAY_ and numbers K_ constants of
// specs/widgets/cmp-fields.t27.
import { dstOf, immClamped, isCanonical, listingChar, listingLen, opcodeAt, opcodeOf, t27aEncode, t27aImm, t27aSrc1, t27aSrc2, v3Of } from './logic.js'
import { K, W, ask, bitOwners, controls, el, facts, fill, hue, legend, root, say, source, stages, verdict, wordTape } from '../cmp-kit.js'

const TONES = [1, 0, 2, 3, 4, 5, 8]
const FIELDS = [
  (w) => opcodeOf(w),
  (w) => dstOf(w),
  (w) => t27aSrc1(w, opcodeOf(w)),
  (w) => t27aSrc2(w, opcodeOf(w)),
  (w) => v3Of(w, opcodeOf(w)),
  (w) => t27aImm(w, opcodeOf(w)),
]
const listing = (w) => { let s = ''; for (let k = 0; k < listingLen(w); k++) s += String.fromCharCode(listingChar(w, k)); return s }
const mnemonic = (i) => listing(t27aEncode(opcodeAt(i), 0, 0, 0, 0, 0)).split(' ')[0]
const REG = K('K_REGISTERS', 27) - 1

const ctl = controls([
  { key: 'op', label: say('SAY_OP'), min: 0, max: K('K_OPCODES', 47) - 1, step: 1, fmt: mnemonic },
  { key: 'dst', label: say('SAY_DST'), min: 0, max: REG, step: 1, fmt: (v) => 't' + v },
  { key: 'src1', label: say('SAY_SRC1'), min: 0, max: REG, step: 1, fmt: (v) => 't' + v },
  { key: 'src2', label: say('SAY_SRC2'), min: 0, max: REG, step: 1, fmt: (v) => 't' + v },
  { key: 'v3', label: say('SAY_V3'), min: 0, max: REG, step: 1, fmt: (v) => 't' + v },
  { key: 'mag', label: say('SAY_MAG'), min: 0, max: K('K_IMM_NEG_MAX', 16384), step: 1 },
  { key: 'neg', label: say('SAY_NEG'), kind: 'toggle' },
], { names: W.SAY_PRESET_NAMES, values: { op: K('K_PRESET_OP', []), dst: K('K_PRESET_DST', []), src1: K('K_PRESET_SRC1', []), src2: K('K_PRESET_SRC2', []), v3: K('K_PRESET_V3', []), mag: K('K_PRESET_MAG', []), neg: K('K_PRESET_NEG', []) } }, draw)

const out = el('div')
root.replaceChildren(stages(), ask(say('SAY_ASK')), ctl.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(s) {
  const op = opcodeAt(s.op)
  const imm = immClamped(s.neg ? -s.mag : s.mag)
  const word = t27aEncode(op, s.dst, s.src1, s.src2, s.v3, imm)
  const canonical = isCanonical(word)
  const back = FIELDS.map((f) => f(word))
  const inputs = [op, s.dst, s.src1, s.src2, s.v3, imm]
  out.replaceChildren(
    verdict(`${mnemonic(s.op)}: ${fill(say('SAY_WORD'), word)}`, canonical ? 0 : 1, `${say('SAY_LISTING')}: ${listing(word)}`),
    wordTape(word, bitOwners(word, FIELDS), (o) => TONES[o]),
    legend(TONES.map((t, i) => ({ label: say('SAY_FIELDS', i), color: hue(t) }))),
    facts([
      ...back.map((v, i) => ({ label: `${say('SAY_READ_BACK')}: ${say('SAY_FIELDS', i)}`, value: v === inputs[i] ? v : `${v} (${say('SAY_NOT_IN_FORM')})`, color: hue(v === inputs[i] ? TONES[i] : 8) })),
      { label: say('SAY_CANONICAL'), value: canonical ? say('SAY_YES') : say('SAY_NO'), color: hue(canonical ? 0 : 1) },
    ]))
}

ctl.start()
