// The world scan keeps what a course teaches from (scripts/lesson-specs.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lessonSpecsOf, lessonSpecPaths, teachable } from './lesson-specs.mjs'
import { loadCompiler } from './agents-from-specs.mjs'

const WEBSITE = join(dirname(fileURLToPath(import.meta.url)), '..')

test('a course spec names its lesson specs in order', () => {
  const text = [
    'pub const LESSON_IDS : [2]str = ["a", "b"];',
    'pub const LESSON_SPECS : [2]str = [',
    '    "specs/basics/01_x.t27",',
    '    "specs/fpga/uart.t27",',
    '];',
  ].join('\n')
  assert.deepEqual(lessonSpecsOf(text), ['specs/basics/01_x.t27', 'specs/fpga/uart.t27'])
})

test('a spec without LESSON_SPECS names nothing', () => {
  assert.deepEqual(lessonSpecsOf('pub const LESSON_IDS : [1]str = ["a"];'), [])
})

test('every course on the site is read, and every lesson spec is on disk', () => {
  const paths = lessonSpecPaths(join(WEBSITE, 'specs/course'))
  // Seven courses of 27 lessons share specs: 146 distinct paths on 2026-10-08.
  assert.ok(paths.length >= 140, `only ${paths.length} lesson specs found`)
  for (const p of ['specs/basics/01_what_a_spec_is.t27', 'specs/fpga/mmcm.t27', 'specs/fpga/uart.t27'])
    assert.ok(paths.includes(p), `${p} is not a lesson spec`)
  const missing = paths.filter((p) => !existsSync(join(WEBSITE, 'public/t27/files', p)))
  assert.deepEqual(missing, [])
})

test('teachable is the course check: discarded lines alone make a spec unteachable', async () => {
  const { readFileSync } = await import('node:fs')
  const analyze = await loadCompiler(readFileSync(join(WEBSITE, 'public/t27/t27_compiler.wasm')))
  const lesson = readFileSync(join(WEBSITE, 'public/t27/files/specs/basics/01_what_a_spec_is.t27'), 'utf8')
  assert.equal(teachable(analyze(lesson)), true)
  // The shape t27 master's fpga/uart.t27 had on 2026-10-08: it typechecks and
  // every backend prints, but the compiler drops a clause it does not model.
  const drops = 'module Drop {\n    const A : u8 = 1;\n\n    test a_clause_the_compiler_drops\n        tmp = 1\n        given y = 1\n        then tmp == y\n}\n'
  const a = analyze(drops)
  assert.equal(a.typecheck?.ok, true)
  assert.ok(a.discarded.length > 0)
  assert.equal(teachable(a), false)
  assert.equal(teachable(null), false)
})

test('the scan reads lesson specs before it touches the tree and settles them after it', async () => {
  const { readFileSync } = await import('node:fs')
  const sync = readFileSync(join(WEBSITE, 'scripts/sync-t27-specs.mjs'), 'utf8')
  // Since #1687 nothing is wiped: the scan writes through put() and deletes through sweep().
  // Those two are what can overwrite or delete a lesson spec, so the read must precede both.
  const read = sync.indexOf('lessonSpecPaths(')
  const firstPut = sync.search(/(?<!function )\bput\(/)
  const scanEnd = sync.indexOf('lap(`analyze + write')
  const settle = sync.indexOf('for (const [rel, text] of pinned)')
  const sweep = sync.search(/(?<!function )\bsweep\(\)/)
  for (const [name, at] of Object.entries({ read, firstPut, scanEnd, settle, sweep }))
    assert.ok(at > -1, `anchor ${name} is gone from sync-t27-specs.mjs: the guard would pass vacuously`)
  assert.ok(read < firstPut, 'the lesson specs are read before the scan first writes into the tree')
  assert.ok(read < sweep, 'the lesson specs are read before the sweep can delete one')
  assert.ok(settle > scanEnd, 'the lesson specs settle after the scan has written its copies')
  assert.ok(settle < sweep, 'the lesson specs settle before the sweep, so what they keep is recorded and survives it')
  // The scanned copy stays only when a lesson can show it.
  assert.match(sync.slice(settle), /if \(teachable\(a\)\) \{ fresher\+\+; continue \}/)
})
