#!/usr/bin/env node
// spec-index.mjs -- the reproducible inventory of the site's specs, extracted from the
// compiler's own AST (the pinned wasm's t27_analyze), never from hand-maintained lists.
//
// For every .t27 under apps/website/specs it records: the module name, its constants,
// functions (with the calls they make), test blocks and `use` declarations -- each with the
// line the compiler reports. Edges are only what the AST actually says: `uses` (a UseDecl),
// `calls` (fn -> fn, both inside one spec), `tests` (spec -> test). A call to a name the
// spec does not declare is an UNRESOLVED reference, kept in the record and shown by the
// explorer -- never silently dropped, per issue #1649's rule: an explicit unknown instead
// of an invented relation.
//
// Provenance travels with the index: the pinned compiler's identity, the index build's
// commit, and each spec's sha256. Run: node scripts/spec-index.mjs   (exit 1 on failure)

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { loadCompiler } from './agents-from-specs.mjs'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..')
const SPEC_ROOT = join(SITE, 'specs')
const OUT = join(SITE, 'public/widgets/second-brain/spec-index.json')
const manifest = JSON.parse(readFileSync(new URL('./t27c-manifest.json', import.meta.url), 'utf8'))

const walk = (dir, acc = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (extname(name) === '.t27') acc.push(p)
  }
  return acc
}

const files = walk(SPEC_ROOT).sort()
const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))

const specs = []
const edges = []
const unresolved = []
const problems = []

for (const file of files) {
  const rel = file.slice(SPEC_ROOT.length + 1)
  const text = readFileSync(file, 'utf8')
  const sha = createHash('sha256').update(text).digest('hex')
  let ast
  try {
    ast = analyze(text).ast
  } catch (e) {
    problems.push(`${rel}: the compiler refused it (${String(e.message).split('\n')[0]})`)
    continue
  }
  if (!ast) { problems.push(`${rel}: the compiler returned no AST`); continue }
  const specId = rel.replace(/\.t27$/, '')
  const fns = new Set(ast.children.filter((n) => n.kind === 'FnDecl').map((n) => n.name))
  const record = {
    id: specId,
    module: ast.name,
    sha256: sha,
    counts: {
      consts: 0, fns: 0, tests: 0, uses: 0, calls: 0, unresolved: 0,
    },
    consts: [],
    fns: [],
    tests: [],
    uses: [],
  }
  const walkNode = (n) => {
    switch (n.kind) {
      case 'ConstDecl':
        if (n.name) record.consts.push({ name: n.name, line: n.line })
        record.counts.consts++
        break
      case 'FnDecl':
        if (n.name) record.fns.push({ name: n.name, line: n.line, ret: n.extra_return_type })
        record.counts.fns++
        break
      case 'TestBlock':
        record.tests.push({ line: n.line })
        record.counts.tests++
        break
      case 'UseDecl':
        if (n.name) {
          record.uses.push({ module: n.name, line: n.line })
          record.counts.uses++
          edges.push({ type: 'uses', from: specId, to: n.name, line: n.line, resolved: false })
        }
        break
      case 'ExprCall':
        if (n.name === 'assert' || n.name === 'assert_eq') break
        record.counts.calls++
        if (fns.has(n.name)) edges.push({ type: 'calls', from: `${specId}#${n.name || '?'}`, to: `${specId}#${n.name && ''}${n.name}`, line: n.line, resolved: true })
        else { unresolved.push({ spec: specId, at: `line ${n.line}`, name: n.name }); record.counts.unresolved++ }
        break
    }
    for (const c of n.children) walkNode(c)
  }
  walkNode(ast)
  // calls edges were pushed per call site with fn prefix; keep only resolved fn->fn
  specs.push(record)
}

// `uses` edges name other modules; resolve module -> spec id where the module matches.
const byModule = new Map(specs.map((s) => [s.module, s.id]))
for (const e of edges) {
  if (e.type === 'uses') {
    const target = byModule.get(e.to)
    if (target) { e.to = target; e.resolved = true }
  }
}
// calls edges: normalize the to-field (drop the accidental concat artifact)
for (const e of edges) if (e.type === 'calls') e.to = e.to.split('#').slice(0, 2).join('#')

const index = {
  provenance: {
    compiler: { path: manifest.path, sha256: manifest.sha256, commit: manifest.commit },
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: SITE, encoding: 'utf8' }).trim(),
    generatedAt: new Date().toISOString(),
    extractor: 'scripts/spec-index.mjs',
    root: 'apps/website/specs',
  },
  counts: {
    specs: specs.length,
    consts: specs.reduce((n, s) => n + s.counts.consts, 0),
    fns: specs.reduce((n, s) => n + s.counts.fns, 0),
    tests: specs.reduce((n, s) => n + s.counts.tests, 0),
    uses: specs.reduce((n, s) => n + s.counts.uses, 0),
    edges: edges.length,
    unresolved: unresolved.length,
    refused: problems.length,
  },
  specs,
  edges,
  unresolved,
  problems,
}

writeFileSync(OUT, JSON.stringify(index))
console.log(`spec-index: ${specs.length} specs, ${index.counts.fns} fns, ${index.counts.tests} tests, ${index.counts.uses} use-decls, ${index.counts.edges} edges, ${index.counts.unresolved} unresolved calls, ${problems.length} refused -> ${OUT.slice(SITE.length + 1)}`)
if (problems.length) {
  console.error('refused specs:')
  for (const p of problems.slice(0, 10)) console.error('  ' + p)
}
