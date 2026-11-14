#!/usr/bin/env node
// flow-extract.mjs -- the control-flow layer of the spec index, extracted from the
// compiler's AST (never drawn by hand). Per function: an entry node, one node per
// statement/action, a decision node per `if` with its guard, call nodes for spec-local
// calls, and an exit -- with reads/writes (the identifiers each step touches) and
// explicit UNSUPPORTED marks for what this extractor does not model yet (while loops
// with their back-edges, early complexity). The flow JSON also carries the .o side of
// the same functions -- the Mach-O symbol table -- so one record holds both views.
// Run: node scripts/flow-extract.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { loadCompiler } from './agents-from-specs.mjs'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(new URL('./t27c-manifest.json', import.meta.url), 'utf8'))
const TARGETS = JSON.parse(readFileSync(new URL('./second-brain-flow-targets.json', import.meta.url), 'utf8'))
const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))

// ---- The .o side: symbols + sections of the emitted Mach-O, when present --------
const objFile = TARGETS.objectFile
const obj = { file: objFile, exists: existsSync(objFile), symbols: [], sections: [], unknown: [] }
if (obj.exists) {
  obj.symbols = execFileSync('nm', [objFile], { encoding: 'utf8' })
    .split('\n').filter((l) => l.trim()).map((l) => {
      const [addr, type, name] = l.split(/\s+/)
      return { addr, type, name: name.replace(/^_/, '') }
    })
  const otoolOut = execFileSync('otool', ['-l', objFile], { encoding: 'utf8' })
  const secs = [...otoolOut.matchAll(/sectname (\S+)\n\s*segname (\S+)/g)]
  obj.sections = secs.map((m) => ({ name: m[1], segment: m[2] }))
  // What the object cannot say -- stated, not hidden. No CFG, no debug info,
  // no source maps live in this Mach-O; control flow comes from the AST.
  obj.unknown = ['control_flow', 'debug_info', 'source_maps', 'types']
}

// ---- The flow side: one extracted flow per targeted function ---------------------
const flows = []
for (const target of TARGETS.functions) {
  const specPath = join(SITE, 'specs/widgets', target.spec)
  const ast = analyze(readFileSync(specPath, 'utf8')).ast
  const fn = ast.children.find((n) => n.kind === 'FnDecl' && n.name === target.fn)
  if (!fn) { flows.push({ fn: target.fn, spec: target.spec, unknown: ['function not in AST'] }); continue }
  const nodes = []
  const edges = []
  let seq = 0
  const next = (kind, extra = {}) => {
    const id = `${target.fn}_${seq++}`
    nodes.push({ id, kind, label: extra.label ?? '', line: extra.line ?? null, reads: extra.reads ?? [], writes: extra.writes ?? [], calls: extra.calls ?? [], effects: extra.effects ?? [], unsupported: extra.unsupported ?? [] })
    return id
  }
  const ident = (n, acc) => {
    if (n.kind === 'ExprIdentifier' && !['true', 'false', 'null'].includes(n.name)) acc.add(n.name)
    for (const c of n.children) ident(c, acc)
  }
  const walkStmts = (stmts, entryId, exitId, prefix) => {
    let prev = entryId
    for (const s of stmts) {
      if (s.kind === 'StmtIf') {
        const reads = new Set(); ident(s.children[0], reads)
        const guard = s.children[0].children?.length
          ? `${s.children[0].extra_op ?? ''}`.trim()
          : ''
        const condText = condString(s.children[0])
        const dec = next('decision', { label: condText, line: s.line, reads: [...reads], effects: [] })
        edges.push({ from: prev, to: dec, branch: '', kind: 'normal' })
        const thenJoin = `${prefix}join${seq}`
        const thenEntry = next('action', { label: `then ${condText}`, line: s.line })
        edges.push({ from: dec, to: thenEntry, branch: 'true', kind: 'normal' })
        let thenExit = thenEntry
        const body = s.children[1]
        if (body && body.children.length) {
          const sub = walkStmts(body.children, thenEntry, null, `${prefix}t${seq}_`)
          thenExit = sub
        }
        const elseBranch = s.children[2]
        let elseExit = null
        if (elseBranch) {
          const elseEntry = next('action', { label: `else ${condText}`, line: s.line })
          edges.push({ from: dec, to: elseEntry, branch: 'false', kind: 'normal' })
          if (elseBranch.children.length) elseExit = walkStmts(elseBranch.children, elseEntry, null, `${prefix}e${seq}_`)
          else elseExit = elseEntry
        } else {
          edges.push({ from: dec, to: thenJoin, branch: 'false', kind: 'normal' })
        }
        if (elseBranch && elseExit) edges.push({ from: elseExit, to: thenJoin, branch: '', kind: 'normal' })
        else if (!elseBranch) { /* false-branch already routed */ }
        prev = thenJoin
        nodes.push({ id: thenJoin, kind: 'io', label: 'merge', line: s.line, reads: [], writes: [], calls: [], effects: [] })
        continue
      }
      if (s.kind === 'StmtWhile') {
        const u = next('loop', { label: 'while (unsupported in flow extraction)', line: s.line, unsupported: ['while back-edge'] })
        edges.push({ from: prev, to: u, branch: '', kind: 'normal' })
        prev = u
        continue
      }
      const reads = new Set(); const writes = new Set(); const calls = []
      if (s.children?.[0]) { ident(s.children[0], reads); if (s.kind === 'StmtAssign' || s.kind === 'StmtLocal') writes.add(s.name) }
      if (s.kind === 'ExprReturn' || s.kind === 'StmtExpr' || s.kind === 'StmtAssign' || s.kind === 'StmtLocal') {
        collectCalls(s, calls)
      }
      const label = s.kind === 'ExprReturn' ? `return ${exprString(s.children?.[0])}`
        : s.kind === 'StmtAssign' || s.kind === 'StmtLocal' ? `${s.name} = ${exprString(s.children?.[0])}`
        : exprString(s.children?.[0])
      const kind = s.kind === 'ExprReturn' ? 'exit' : calls.length ? 'call' : 'action'
      const id = next(kind, { label, line: s.line, reads: [...reads], writes: [...writes], calls })
      edges.push({ from: prev, to: id, branch: '', kind: 'normal' })
      prev = id
    }
    return prev
  }
  const entry = next('entry', { label: `entry ${target.fn}`, line: fn.line, reads: fn.params.map((p) => p[0]) })
  const last = walkStmts(fn.children, entry, null, `${target.fn}_`)
  if (last !== entry) edges.push({ from: last, to: `${target.fn}_exit`, branch: '', kind: 'normal' })
  // implicit exit for fall-through fns
  if (!nodes.some((n) => n.id === `${target.fn}_exit`)) nodes.push({ id: `${target.fn}_exit`, kind: 'exit', label: `exit ${target.fn}`, line: null, reads: [], writes: [], calls: [], effects: [] })
  flows.push({ fn: target.fn, spec: target.spec, params: fn.params, ret: fn.extra_return_type, entry, nodes, edges, unsupported: [] })
}

function condString(n) {
  if (n.kind === 'ExprBinary') return `${exprString(n.children[0])} ${(n.extra_op || '?').trim()} ${exprString(n.children[1])}`
  return exprString(n)
}
function exprString(n) {
  if (!n) return '?'
  if (n.kind === 'ExprBinary') return `(${exprString(n.children[0])} ${(n.extra_op || '?').trim()} ${exprString(n.children[1])})`
  if (n.kind === 'ExprCall') return `${n.name}(${n.children.map(exprString).join(', ')})`
  if (n.kind === 'ExprLiteral') return n.extra_kind === 'string' ? `"${n.value}"` : n.value
  return n.name || n.value || '?'
}
function collectCalls(n, acc) {
  if (n.kind === 'ExprCall' && n.name !== 'assert' && n.name !== 'assert_eq') acc.push(n.name)
  for (const c of n.children) collectCalls(c, acc)
}

const out = {
  provenance: {
    compiler: manifest,
    objectFile: TARGETS.objectFile,
    flowSource: 'compiler AST via t27_analyze -- control flow is NOT read from the .o (stated in obj.unknown)',
    gostReference: 'GOST 19.701-90 shapes: terminator, process, decision, io, predefined process',
  },
  obj,
  flows,
}
const OUT = join(SITE, 'public/widgets/second-brain/flow.json')
writeFileSync(OUT, JSON.stringify(out))
const unsupported = flows.reduce((n, f) => n + (f.unsupported?.length ?? 0) + (f.nodes ?? []).reduce((m, nd) => m + (nd.unsupported?.length ?? 0), 0), 0)
console.log(`flow-extract: ${flows.length} flows, ${flows.reduce((n, f) => n + (f.nodes?.length ?? 0), 0)} nodes, ${flows.reduce((n, f) => n + (f.edges?.length ?? 0), 0)} edges, ${unsupported} unsupported, obj symbols ${obj.symbols.length} -> ${OUT.slice(SITE.length + 1)}`)
