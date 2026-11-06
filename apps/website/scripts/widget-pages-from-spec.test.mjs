import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SITE, loadCompiler } from './agents-from-specs.mjs'
import { CARD, buildAll, buildTool, galleryWords, isNative, pageOut, pngSize, specOut, toolProblems, toolSpecs } from './widget-pages-from-spec.mjs'

const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))
const { g } = galleryWords(analyze)

test('every tool spec builds clean and its page and spec copy are current', async () => {
  const { problems, tools } = await buildAll({ analyze })
  assert.deepEqual(problems, [])
  for (const t of tools) {
    assert.equal(readFileSync(join(SITE, pageOut(t.fields.ID)), 'utf8'), t.page, `${t.fields.ID} page is current`)
    assert.equal(readFileSync(join(SITE, specOut(t.fields.ID)), 'utf8'), t.publicSpec, `${t.fields.ID} spec copy is current`)
    assert.ok(Math.max(t.tests.tests, t.tests.declared ?? 0) >= 2, `${t.fields.ID} tests at least two invariants`)
  }
})

test('every page carries a large card, its own words and no words of its own', async () => {
  const { tools } = await buildAll({ analyze })
  for (const t of tools) {
    const f = t.fields
    assert.match(t.page, /<meta name="twitter:card" content="summary_large_image">/)
    assert.ok(t.page.includes(`https://t27.ai/widgets/${f.ID}/card.png`), `${f.ID} og:image is absolute`)
    assert.ok(t.page.includes('window.T27_WIDGET'), `${f.ID} hands its constants to tool.js`)
    const size = pngSize(readFileSync(join(SITE, 'public/widgets', f.ID, 'card.png')))
    assert.deepEqual(size, { width: CARD.width, height: CARD.height })
  }
})

test('a spec that claims to send data, or tests nothing, is refused', () => {
  for (const file of toolSpecs()) {
    const text = readFileSync(join(SITE, file), 'utf8')
    const sends = text.replace(/^(pub const SENDS_NOTHING : bool = )true;/m, '$1false;')
    assert.notEqual(sends, text, `${file} declares SENDS_NOTHING`)
    assert.ok(buildTool({ file, specText: sends, analyze, gallery: g }).problems.length > 0, `${file} with SENDS_NOTHING false is refused`)
    const wrongId = text.replace(/^(pub const ID : str = )"[^"]*";/m, '$1"not-this-file";')
    assert.ok(buildTool({ file, specText: wrongId, analyze, gallery: g }).problems.length > 0, `${file} under another ID is refused`)
  }
})

test('a native tool (widget.wasm, no tool.js) loads the shared host and is refused without it', async () => {
  const { tools } = await buildAll({ analyze })
  const native = tools.filter((t) => isNative(SITE, t.fields.ID))
  assert.ok(native.length >= 2, 'jtag-verdict and race-the-bee are native')
  for (const id of ['lut-depth', 'lut-explain', 'gf16-calc']) assert.ok(native.some((t) => t.fields.ID === id && (t.fields.W_DATA_FILE || t.fields.W_DATA_FILES)), `${id} hands the host the files it fetches`)
  for (const t of native) {
    assert.match(t.page, /<script type="module" src="\.\.\/host\.js\?v=[0-9a-f]{12}"><\/script>/)
    assert.ok(!t.page.includes('./tool.js'), `${t.fields.ID} loads no tool.js`)
    assert.ok(!('IR_TEXT' in t.fields || 'DATA' in t.fields), `${t.fields.ID} hands the page no wasm state`)
    // the wasm's own sizes (W_*) stay in the wasm; only the names of the files the host fetches for it go to the page
    assert.deepEqual(Object.keys(t.fields).filter((k) => /^W_/.test(k) && !/^W_DATA_FILES?$/.test(k)), [], `${t.fields.ID} hands the page no W_ size`)
  }
  const f = native[0]
  const root = mkdtempSync(join(tmpdir(), 'native-'))
  cpSync(join(SITE, 'public/widgets'), join(root, 'public/widgets'), { recursive: true })
  assert.deepEqual(toolProblems(f.fields, f.file, root), [])
  rmSync(join(root, 'public/widgets/host.js'))
  assert.ok(toolProblems(f.fields, f.file, root).some((m) => m.includes('host.js')), 'a native tool without host.js is refused')
  rmSync(join(root, 'public/widgets', f.fields.ID, 'widget.wasm'))
  assert.ok(toolProblems(f.fields, f.file, root).some((m) => m.includes('tool.js is missing')), 'neither tool.js nor widget.wasm is refused')
})
