#!/usr/bin/env node
// widget-logic.mjs -- a widget whose logic is a t27 spec's own fn bodies, compiled.
//
// A tool widget's tool.js draws; it must not compute. Where a widget computes something real (a
// reflection, an eye opening, an error-correcting code), the formulas live in a gHashTag/t27 spec,
// are compiled by gHashTag/999-multibots-telegraf scripts/t27-logic.mjs (t27c gen -> zig 0.16 ->
// wasm) into <id>.logic.ts, and land here as two files beside the page:
//
//   public/widgets/<id>/logic.t27   the spec, byte for byte (the page links to it)
//   public/widgets/<id>/logic.js    the compiled logic, its TypeScript types stripped
//
// Run:      node scripts/widget-logic.mjs --import <id> <path/to/x.logic.ts> <path/to/x.t27>
//           node scripts/widget-logic.mjs --check
// --check, for every widget that has a logic.js: the logic was built from exactly the bytes of
// logic.t27 (its spec-sha256 line), logic.t27 compiles clean with the vendored compiler, and
// tool.js imports ./logic.js. A formula edited in logic.js, or a spec changed without
// recompiling, stops the build.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE, compilerErrors, constsOf, loadCompiler, verdictOf } from './agents-from-specs.mjs'

const WASM = 'public/t27/t27_compiler.wasm'
const DIR = 'public/widgets'
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')
const SHA_LINE = /^\/\/ spec-sha256: ([0-9a-f]{64})$/m

/** Numeric value of a constant read by the compiler (f64 constants arrive as numbers too). */
const valueOf = (c) => (c && typeof c === 'object' && 'value' in c ? c.value : c)

export function logicProblems(id, { logicJs, logicT27, toolJs, widgetSpec }, analyze) {
  const p = []
  const at = `${DIR}/${id}`
  const sha = logicJs.match(SHA_LINE)?.[1]
  if (!logicT27) p.push(`${at}/logic.t27 is missing: logic.js names no spec the reader can read`)
  else {
    if (sha !== sha256(logicT27)) p.push(`${at}/logic.js was built from another version of logic.t27 (spec-sha256 ${sha ?? 'missing'}, the spec is ${sha256(logicT27)}); rebuild it with t27-logic.mjs and --import`)
    const a = analyze(logicT27)
    const v = verdictOf(a)
    if (!v.typecheckOk || v.discarded > 0 || !v.hirOk) p.push(`${at}/logic.t27: compiler verdict not clean (${JSON.stringify(v)})`)
    p.push(...compilerErrors(a).map((m) => `${at}/logic.t27: ${m}`))
    // A K_<NAME> of the widget spec that the logic spec also names must be the same number.
    if (widgetSpec) {
      let logicC = {}
      let widgetC = {}
      try { logicC = constsOf(a) } catch (e) { p.push(`${at}/logic.t27: ${e.message}`) }
      try { widgetC = constsOf(analyze(widgetSpec)) } catch (e) { p.push(`specs/widgets/${id}.t27: ${e.message}`) }
      for (const [k, c] of Object.entries(widgetC)) {
        if (!k.startsWith('K_') || !(k.slice(2) in logicC)) continue
        if (Number(valueOf(c)) !== Number(valueOf(logicC[k.slice(2)]))) p.push(`specs/widgets/${id}.t27: ${k} is ${valueOf(c)}, logic.t27 ${k.slice(2)} is ${valueOf(logicC[k.slice(2)])}`)
      }
    }
  }
  if (!/new WebAssembly\.Module\(/.test(logicJs)) p.push(`${at}/logic.js carries no compiled module: it is not the spec's logic`)
  if (!/from\s+['"]\.\/logic\.js['"]/.test(toolJs ?? '')) p.push(`${at}/tool.js does not import ./logic.js`)
  return p
}

/** The widgets that carry a logic.js. */
export function logicWidgets(root = SITE) {
  const base = join(root, DIR)
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(base, d.name, 'logic.js')))
    .map((d) => d.name)
    .sort()
}

async function importLogic(id, tsPath, specPath) {
  const { transformSync } = await import('esbuild')
  const ts = readFileSync(tsPath, 'utf8')
  const spec = readFileSync(specPath, 'utf8')
  const header = ts.split('\n').filter((l, i) => i < 12 && l.startsWith('//'))
  if (!header.some((l) => SHA_LINE.test(l))) throw new Error(`${tsPath}: no spec-sha256 line; is it t27-logic.mjs output?`)
  const js = transformSync(ts, { loader: 'ts', format: 'esm', target: 'es2020' }).code
  const out = `${header.join('\n')}\n// Imported by scripts/widget-logic.mjs for public/widgets/${id}/: types stripped, nothing else changed.\n${js}`
  writeFileSync(join(SITE, DIR, id, 'logic.js'), out)
  writeFileSync(join(SITE, DIR, id, 'logic.t27'), spec)
  console.log(`widget-logic: wrote ${DIR}/${id}/logic.js and logic.t27 (spec sha ${sha256(spec).slice(0, 12)})`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--import') {
    const [, id, tsPath, specPath] = args
    if (!id || !tsPath || !specPath) throw new Error('usage: widget-logic.mjs --import <id> <x.logic.ts> <x.t27>')
    await importLogic(id, tsPath, specPath)
    return
  }
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const ids = logicWidgets()
  const read = (rel) => (existsSync(join(SITE, rel)) ? readFileSync(join(SITE, rel), 'utf8') : '')
  const problems = ids.flatMap((id) =>
    logicProblems(id, { logicJs: read(`${DIR}/${id}/logic.js`), logicT27: read(`${DIR}/${id}/logic.t27`), toolJs: read(`${DIR}/${id}/tool.js`), widgetSpec: read(`specs/widgets/${id}.t27`) }, analyze),
  )
  if (problems.length) {
    console.error(`widget-logic: ${problems.length} problem(s)`)
    for (const x of problems) console.error('  ' + x)
    process.exit(1)
  }
  console.log(`widget-logic: ${ids.length} widget(s) run their spec's own logic: ${ids.join(', ')}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
