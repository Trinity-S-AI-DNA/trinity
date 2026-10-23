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

test('the incremental scan reads lesson specs before it deletes and settles them after it', async () => {
  const { readFileSync } = await import('node:fs')
  const sync = readFileSync(join(WEBSITE, 'scripts/sync-t27-specs.mjs'), 'utf8')
  const read = sync.indexOf('lessonSpecPaths(')
  // Since #1687 the scan is incremental, keyed by content hash: there is no
  // wholesale rmSync(SPECS_OUT) any more, only per-file writes and removal of
  // files the scan did not write. The lifecycle property is the same as before:
  // the lesson specs are READ before the scan writes or removes anything in
  // SPECS_OUT, and the pinned lesson copies settle after the scan's writes.
  const write = sync.indexOf('writeFileSync(dest, buf)')
  const remove = sync.indexOf('unlinkSync(join(SPECS_OUT, child))')
  const settle = sync.indexOf('for (const [rel, text] of pinned)')
  assert.ok(read > -1 && read < write, 'the lesson specs are read before the scan writes its copies')
  assert.ok(remove > write, 'the scan removes only files it did not write, after its writes')
  assert.ok(settle > remove, 'the lesson specs settle after the scan has written its copies')
  // The wholesale wipe stays gone: a lesson spec can never vanish mid-run.
  assert.ok(!sync.includes('rmSync(SPECS_OUT'), 'the sync must never delete the whole SPECS_OUT tree')
  // The scanned copy stays only when a lesson can show it.
  assert.match(sync.slice(settle), /if \(teachable\(a\)\) \{ fresher\+\+; continue \}/)
})
