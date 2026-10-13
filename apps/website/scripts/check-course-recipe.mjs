// Compile every specs/course_recipe/*.t27 with the site's wasm compiler and run its test blocks.
// Exit 1 on a compile error, a failing assert, a file with zero tests, or an empty directory,
// so a recipe step cannot be dropped silently. Run from apps/website: npm run check:course-recipe
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCompiler, verdictOf, constsOf } from './agents-from-specs.mjs'
import { runSpecTests } from './viewport-from-spec.mjs'

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.resolve(site, process.argv[2] ?? '../../specs/course_recipe')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.t27')).sort()
if (!files.length) {
  console.error(`check:course-recipe: no .t27 files in ${dir}`)
  process.exit(1)
}
const analyze = await loadCompiler(fs.readFileSync(path.join(site, 'public/t27/t27_compiler.wasm')))
let bad = 0
for (const f of files) {
  const a = analyze(fs.readFileSync(path.join(dir, f), 'utf8'))
  const v = verdictOf(a)
  const env = Object.fromEntries(Object.entries(constsOf(a)).map(([k, c]) => [k, c.value]))
  const r = runSpecTests(a, env)
  const ok = v.typecheckOk && !v.errors && !v.discarded && v.hirOk && r.tests > 0 && !r.failures.length
  if (!ok) bad++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${f} module ${a.ast?.name} tests ${r.tests} asserts ${r.asserts} ${JSON.stringify(v)}`)
  if (!r.tests) console.log('  no tests')
  for (const x of r.failures) console.log('  fail:', typeof x === 'string' ? x : JSON.stringify(x))
}
process.exit(bad ? 1 : 0)
