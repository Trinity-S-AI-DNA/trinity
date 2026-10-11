import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SITE, loadCompiler } from './agents-from-specs.mjs'
import { logicProblems, logicWidgets } from './widget-logic.mjs'

const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))
const read = (rel) => readFileSync(join(SITE, rel), 'utf8')
const inputs = (id) => ({
  logicJs: read(`public/widgets/${id}/logic.js`),
  logicT27: read(`public/widgets/${id}/logic.t27`),
  toolJs: read(`public/widgets/${id}/tool.js`),
  widgetSpec: read(`specs/widgets/${id}.t27`),
})
const fails = (id, over, needle) => {
  const p = logicProblems(id, { ...inputs(id), ...over }, analyze)
  assert.ok(p.some((x) => x.includes(needle)), `expected a problem naming ${needle}, got:\n${p.join('\n')}`)
}

test('every widget with logic runs the spec it carries', () => {
  const ids = logicWidgets()
  assert.ok(ids.length >= 3, ids.join(','))
  for (const id of ids) assert.deepEqual(logicProblems(id, inputs(id), analyze), [], id)
})

test('a spec changed without recompiling the logic stops the build', () => {
  const { logicT27 } = inputs('line-bounce')
  fails('line-bounce', { logicT27: logicT27.replace('v = v + wave * (1.0 + gl);', 'v = v + wave;') }, 'built from another version')
})

test('a tool.js that does not import the logic stops the build', () => {
  const { toolJs } = inputs('eye-isi')
  fails('eye-isi', { toolJs: toolJs.replace("from './logic.js'", "from './mine.js'") }, 'does not import ./logic.js')
})

test('a K_ number that disagrees with the logic spec stops the build', () => {
  const { widgetSpec } = inputs('ecc-secded')
  fails('ecc-secded', { widgetSpec: widgetSpec.replace('pub const K_WORD_BITS : u8 = 13;', 'pub const K_WORD_BITS : u8 = 12;') }, 'K_WORD_BITS is 12')
})

test('a logic.js with the module cut out is not the spec logic', () => {
  fails('ecc-secded', { logicJs: '// spec-sha256: 0\nexport const encode = (d) => d\n' }, 'carries no compiled module')
})
