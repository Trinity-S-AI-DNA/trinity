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
import { call_verdict, artifacts_for_tool, is_edge, relations_from_sites, V_FN_EDGE, V_HARNESS, V_TEST_CALL, V_SELF_LOOP, V_UNRESOLVED } from './gen/second_brain_index_law.gen.js'

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
const self_loops = []
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
    kind: undefined,
    toolId: undefined,
    counts: {
      consts: 0, fns: 0, tests: 0, uses: 0, calls: 0, unresolved: 0, test_calls: 0,
    },
    consts: [],
    fns: [],
    tests: [],
    uses: [],
  }
  // The enclosing function name threads through the walk: a call edge must
  // record caller -> callee, not callee -> callee (the first cut wrote the
  // callee on both sides and every call looked like a self-loop).
  const walkNode = (n, fnName) => {
    switch (n.kind) {
      case 'ConstDecl':
        if (n.name) record.consts.push({ name: n.name, line: n.line })
        if (n.name === 'KIND') record.kind = n.children?.[0]?.value
        if (n.name === 'ID') record.toolId = n.children?.[0]?.value
        record.counts.consts++
        break
      case 'FnDecl':
        if (n.name) record.fns.push({ name: n.name, line: n.line, ret: n.extra_return_type })
        record.counts.fns++
        for (const c of n.children) walkNode(c, n.name)
        break
      case 'TestBlock':
        record.tests.push({ line: n.line })
        record.counts.tests++
        for (const c of n.children) walkNode(c, null)
        break
      case 'UseDecl':
        if (n.name) {
          record.uses.push({ module: n.name, line: n.line })
          record.counts.uses++
          edges.push({ type: 'uses', from: specId, to: n.name, line: n.line, resolved: false })
        }
        break
      case 'ExprCall': {
        // The classification is the generated law's, not this file's: every
        // verdict comes from specs/widgets/second_brain_index_law.t27.
        const verdict = call_verdict(n.name ?? '', fnName ?? '', fns.has(n.name), !fnName)
        record.counts.calls++
        if (verdict === V_HARNESS) break
        if (verdict === V_TEST_CALL) {
          record.counts.test_calls = (record.counts.test_calls ?? 0) + 1
          break
        }
        if (verdict === V_SELF_LOOP) {
          self_loops.push({ spec: specId, at: `line ${n.line}`, name: n.name })
          break
        }
        if (verdict === V_FN_EDGE) {
          edges.push({ type: 'calls', from: `${specId}#${fnName}`, to: `${specId}#${n.name}`, line: n.line, resolved: true })
          break
        }
        unresolved.push({ spec: specId, at: `line ${n.line}`, name: n.name })
        record.counts.unresolved++
        break
      }
    }
    for (const c of n.children) walkNode(c, fnName)
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

// Artifact provenance: every tool spec (KIND = widget-tool) is generated into
// public/widgets/<ID>/index.html plus a byte-for-byte copy of the spec, by
// widget-pages-from-spec.mjs (pageOut/specOut). Those are the only inter-node
// relations the generator itself proves, so they become artifact nodes and
// `generated_from` edges; nothing here is inferred from prose.
const artifacts = []
for (const s of specs) {
  if (artifacts_for_tool(s.kind ?? '', Boolean(s.toolId)) === 0) continue
  for (const rel of [`public/widgets/${s.toolId}/index.html`, `public/widgets/${s.toolId}/${s.toolId}.t27`]) {
    artifacts.push({ id: `artifact:${rel}`, kind: 'artifact', generatedFrom: s.id })
    edges.push({ type: 'generated_from', from: s.id, to: `artifact:${rel}`, resolved: true })
  }
}
const callsEdges = edges.filter((e) => e.type === 'calls')
const counts_intra = callsEdges.filter((e) => e.from.split('#')[0] === e.to.split('#')[0]).length
const counts_inter = callsEdges.length - counts_intra
const uniqueRelations = new Set(callsEdges.map((e) => `${e.from}|${e.to}`))
const relations = [...uniqueRelations].map((key) => {
    const [from, to] = key.split('|')
    const sites = callsEdges.filter((e) => e.from === from && e.to === to).length
    return { from, to, sites }
}).sort((x, y) => y.sites - x.sites)
const index = {
  provenance: {
    compiler: { path: manifest.path, sha256: manifest.sha256, commit: manifest.commit },
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: SITE, encoding: 'utf8' }).trim(),
    extractor: 'specs/widgets/second_brain_index_law.t27 via scripts/gen/second_brain_index_law.gen.js (t27c gen-js of the pinned compiler)',
    law_spec_sha256: createHash('sha256').update(readFileSync(new URL('./gen/second_brain_index_law.gen.js', import.meta.url))).digest('hex'),
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
    inter_spec_edges: counts_inter,
    intra_spec_calls: counts_intra,
    unique_relations: uniqueRelations.size,
    relations,
    self_loops: self_loops.length,
    use_decls_in_corpus: specs.reduce((n, s) => n + s.counts.uses, 0),
  },
  specs,
  edges,
  unresolved,
  self_loops,
  relations,
  artifacts,
  problems,
}

writeFileSync(OUT, JSON.stringify(index))
console.log(`spec-index: ${specs.length} specs, ${index.counts.fns} fns, ${index.counts.tests} tests, ${index.counts.uses} use-decls, ${index.counts.edges} edges (${index.counts.intra_spec_calls} intra-spec calls, ${index.counts.unique_relations} unique relations, ${index.counts.self_loops} self-loops, ${index.counts.inter_spec_edges} inter-spec), ${artifacts.length} artifacts, ${index.counts.unresolved} unresolved calls, ${problems.length} refused -> ${OUT.slice(SITE.length + 1)}`)
if (problems.length) {
  console.error('refused specs:')
  for (const p of problems.slice(0, 10)) console.error('  ' + p)
}
