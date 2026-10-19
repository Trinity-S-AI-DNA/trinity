// cmp-number/tool.js -- lesson 3 of t27-compiler: one number, three doors of the t27a assembler. Each door is a line
// the assembler is asked about: assemble_status gives the verdict and assemble the word; dec_fits_u32 judges the
// digit run. They are fn bodies of gHashTag/t27 specs/isa/t27a.t27 compiled to wasm (./logic.js). Words are SAY_
// and numbers K_ constants of specs/widgets/cmp-number.t27.
import { assemble, assembleStatus, decFitsU32, digitsEnd } from './logic.js'
import { K, W, ask, el, facts, fill, hue, root, say, source, stages, textBox, verdict } from '../cmp-kit.js'

const OK = K('K_ASM_OK', 0)
const out = el('div')
const box = textBox({ label: say('SAY_TEXT_LABEL'), samples: W.SAY_SAMPLES, start: K('K_START_SAMPLE', 0), max: K('K_MAX_TEXT', 12), onChange: draw })
root.replaceChildren(stages(), ask(say('SAY_ASK')), box.node, out, el('p', { class: 'dk-note' }, say('SAY_NOTE')), source())

const hex = (w) => '0x' + (w >>> 0).toString(16).padStart(8, '0')

function door(i, text) {
  const line = fill(say('SAY_LINES', i), text)
  const status = assembleStatus(line)
  const ok = status === OK
  return el('div', { class: 'hk-path' },
    el('p', { class: 'hk-path-head' }, el('code', {}, say('SAY_DOORS', i)), el('span', { class: 'hk-pill', style: `--hc:${hue(ok ? 0 : 6)}` }, say('SAY_STATUS_NAMES', status))),
    facts([
      { label: line, value: fill(say('SAY_STATUS'), status), color: hue(ok ? 0 : 6) },
      { label: say('SAY_WORD'), value: ok ? `${assemble(line)} (${hex(assemble(line))})` : say('SAY_NONE'), color: hue(ok ? 1 : 8) },
    ]))
}

function draw(text) {
  const digits = digitsEnd(text, 0, false, 0)
  const fits = digits > 0 ? decFitsU32(text, 0, false, 0, digits) : null
  out.replaceChildren(
    verdict(fill(say('SAY_DIGITS'), digits), fits === false ? 6 : 2, fits == null ? '' : `${say('SAY_FITS')}: ${fits ? say('SAY_YES') : say('SAY_NO')}`),
    ...[0, 1, 2].map((i) => door(i, text)))
}

box.start()
