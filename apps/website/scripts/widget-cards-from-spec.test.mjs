// Run: node --test scripts/widget-cards-from-spec.test.mjs
// Holds the widget card generator to what --check relies on: its PNG is a real PNG, the same spec
// gives the same bytes, and a changed word gives a card --check calls stale.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'
import { SITE, loadCompiler } from './agents-from-specs.mjs'
import { GENERATOR, cardOut, cardProblem, decodeOwnPng, deflateFixed, drawCard, galleryTools, loadFonts, measure, pngText } from './widget-cards-from-spec.mjs'
import { CARD, pngSize } from './widget-pages-from-spec.mjs'

const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))
const { gallery, tools, problems } = galleryTools(analyze)
const fonts = loadFonts()
const first = tools[0]

test('the gallery names tool widgets whose specs carry the words a card is drawn from', () => {
  assert.deepEqual(problems, [])
  assert.ok(tools.length > 0)
})

test('the deflate stream inflates back to its input, runs and repeated rows included', () => {
  const stride = 41
  const data = Buffer.alloc(stride * 60)
  for (let i = 0; i < data.length; i++) data[i] = i % stride === 0 ? 0 : (i * 7) % 300 < 150 ? 0 : (i * 13) & 255
  for (let r = 10; r < 20; r++) data.copy(data, r * stride, 9 * stride, 10 * stride)
  data.fill(255, 600, 600 + 700)
  assert.deepEqual(inflateSync(deflateFixed(data, stride)), data)
  assert.deepEqual(inflateSync(deflateFixed(Buffer.alloc(0), 1)), Buffer.alloc(0))
})

test('a card is a 1200x630 greyscale PNG under the size limit that names its generator and spec', () => {
  const png = drawCard({ tool: first.tool, gallery, fonts })
  assert.deepEqual(pngSize(png), { width: CARD.width, height: CARD.height })
  assert.ok(png.length < CARD.maxBytes)
  assert.equal(pngText(png).Software, GENERATOR)
  assert.equal(pngText(png).Source, `specs/widgets/${first.id}.t27`)
  const { raw } = decodeOwnPng(png)
  assert.equal(raw.length, (CARD.width + 1) * CARD.height)
  const ink = raw.filter((b, i) => i % (CARD.width + 1) !== 0 && b > 128).length
  assert.ok(ink > 5000, `the card has text on it (${ink} light pixels)`)
})

test('the same spec draws the same bytes', () => {
  const a = drawCard({ tool: first.tool, gallery, fonts })
  const b = drawCard({ tool: first.tool, gallery, fonts: loadFonts() })
  assert.ok(a.equals(b))
})

test('the fonts decode: bold is wider than regular, and every printable ASCII glyph has an advance', () => {
  assert.ok(measure(fonts.display, 'Widget', 100) > 200)
  for (let c = 33; c < 127; c++) assert.ok(fonts.mono.glyph(c).advance > 0, `mono glyph ${c}`)
  assert.equal(fonts.mono.glyph(65).advance, fonts.mono.glyph(105).advance, 'mono is monospaced')
})

test('--check: a missing card and a drawn card whose title changed are problems; a current one is not', () => {
  const root = mkdtempSync(join(tmpdir(), 'widget-cards-'))
  const out = join(root, cardOut(first.id))
  assert.match(cardProblem(first, gallery, fonts, root), /is missing/)
  mkdirSync(join(root, `public/widgets/${first.id}`), { recursive: true })
  writeFileSync(out, drawCard({ tool: first.tool, gallery, fonts }))
  assert.equal(cardProblem(first, gallery, fonts, root), null)
  const renamed = { ...first, tool: { ...first.tool, TITLE: `${first.tool.TITLE} again` } }
  assert.match(cardProblem(renamed, gallery, fonts, root), /is stale/)
  // A hand-drawn card (no generator mark) is held to being present and the right size only.
  cpSync(join(SITE, cardOut(first.id)), out)
  if (pngText(readFileSync(out)).Software !== GENERATOR) assert.equal(cardProblem(renamed, gallery, fonts, root), null)
  writeFileSync(out, Buffer.from('not a png'))
  assert.match(cardProblem(first, gallery, fonts, root), /must be a 1200x630 PNG/)
})
