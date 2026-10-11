import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SITE, loadCompiler } from './agents-from-specs.mjs'
import { TS_OUT, ladderProblems, readInputs, renderTs } from './course-ladder-from-spec.mjs'

const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))
const inputs = readInputs()
const run = (over = {}) => ladderProblems({ ...inputs, analyze, ...over })
const fails = (over, needle) => {
  const { problems, out } = run(over)
  assert.ok(problems.some((p) => p.includes(needle)), `expected a problem naming ${needle}, got:\n${problems.join('\n')}`)
  assert.equal(out, null)
}
const replaced = (text, from, to) => {
  assert.ok(text.includes(from), `the mutation target is gone: ${from}`)
  return text.replace(from, to)
}

test('the committed ladder builds clean and the generated file is current', () => {
  const { problems, out } = run()
  assert.deepEqual(problems, [])
  assert.equal(readFileSync(join(SITE, TS_OUT), 'utf8'), renderTs(out))
  assert.deepEqual(Object.keys(out.say.en), Object.keys(out.say.ru))
})

test('a rule changed in the spec without rebuilding the logic stops the build', () => {
  fails({ rulesText: replaced(inputs.rulesText, 'if opened >= 3 {', 'if opened >= 4 {') }, 'built from another version')
})

test('a number edited in gen.ts without the spec stops the build', () => {
  fails({ genText: replaced(inputs.genText, 'export const STEP_PAID = 2 satisfies number;', 'export const STEP_PAID = 3 satisfies number;') }, 'STEP_PAID is 3')
})

test('a Russian word missing, extra, or with another placeholder stops the build', () => {
  const ru = JSON.parse(inputs.ruText)
  const { SAY_OPEN, ...noOpen } = ru
  void SAY_OPEN
  fails({ ruText: JSON.stringify(noOpen) }, 'SAY_OPEN is missing')
  fails({ ruText: JSON.stringify({ ...ru, SAY_EXTRA: 'x' }) }, 'SAY_EXTRA is not a word')
  fails({ ruText: JSON.stringify({ ...ru, SAY_RUNG: 'Ступень вашей лестницы' }) }, 'SAY_RUNG keeps other numbers')
})

test('Russian in the English spec stops the build', () => {
  fails({ wordsText: replaced(inputs.wordsText, '"Open the course"', '"Открыть курс"') }, 'Cyrillic')
})
