// cmp-assemble/tool.js -- lesson 25 of t27-compiler: the t27a assembler and disassembler. The status and the word are
// assemble_status and assemble, the listing is listing_len and listing_char, the round trip is is_canonical and
// reassemble, and the field owners are found with the decoders of isa/ternary_encoding.t27 that t27a.t27 uses, fn bodies of
// gHashTag/t27 specs/isa/t27a.t27 compiled to wasm (./logic.js). Words are SAY_ and numbers K_ constants of specs/widgets/cmp-assemble.t27.
import { assemble, assembleStatus, dstOf, isCanonical, listingChar, listingLen, opcodeOf, reassemble, t27aImm, t27aSrc1, t27aSrc2, v3Of } from './logic.js'
import { K, W, ask, bitOwners, el, facts, fill, hue, legend, root, say, source, stages, textBox, verdict, wordTape } from '../cmp-kit.js'

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

const out = el('div')
const box = textBox({ label: say('SAY_TEXT_LABEL'), samples: W.SAY_SAMPLES, start: K('K_START_SAMPLE', 0), max: K('K_MAX_TEXT', 40), onChange: draw })
root.replaceChildren(stages(), ask(say('SAY_ASK')), box.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

function draw(text) {
  const status = assembleStatus(text)
  if (status !== K('K_ASM_OK', 0)) {
    out.replaceChildren(verdict(say('SAY_STATUS_NAMES', status), 6, text))
    return
  }
  const word = assemble(text)
  const canonical = isCanonical(word)
  out.replaceChildren(
    verdict(fill(say('SAY_WORD'), word), 0, fill(say('SAY_HEX'), '0x' + word.toString(16).padStart(8, '0'))),
    facts([
      { label: say('SAY_LISTING'), value: listing(word), color: hue(2) },
      { label: canonical ? say('SAY_CANONICAL') : say('SAY_NOT_CANONICAL'), value: '', color: hue(canonical ? 0 : 1) },
      { label: say('SAY_ROUND'), value: reassemble(word) === word ? say('SAY_YES') : say('SAY_NO'), color: hue(reassemble(word) === word ? 0 : 6) },
    ]),
    wordTape(word, canonical ? bitOwners(word, FIELDS) : Array(32).fill(FIELDS.length), (o) => TONES[o]),
    legend(TONES.map((t, i) => ({ label: say('SAY_FIELDS', i), color: hue(t) }))))
}

box.start()
