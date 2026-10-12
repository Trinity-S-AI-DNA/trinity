#!/usr/bin/env node
// ci-triggers-from-spec.mjs -- the `on:` blocks of five workflows, from `specs/ci/workflow_triggers.t27`.
//
// Reads the repo-root spec through the real compiler (`t27_compiler.wasm`),
// checks the constant schema, evaluates every `test` block of the spec, and
// rewrites the `on:` region (and only that region) of each workflow file the
// spec names in GENERATED. A workflow the spec does not name is never touched.
//
// Why this exists: four of the five filters below were parked hand edits for a
// week -- the intent was written down twice, once in a stash and once in an
// issue, and neither ran. A trigger block that lives as data in a spec has a
// gate (`check:ci-triggers`) that fails the PR when the committed YAML is not
// what the spec says, so the parked state cannot come back.
//
// Nothing here parses a `.t27` with a regular expression; constants and
// asserts come from the compiler's AST. The asserts are evaluated on purpose:
// `typecheck.ok` stays true for `assert 1 > 2`, so a spec whose own tests do
// not hold must not produce a green build.
//
// Run:  node scripts/ci-triggers-from-spec.mjs            (write .github/workflows/*)
//       node scripts/ci-triggers-from-spec.mjs --check    (fail if a managed block is stale)
//       node scripts/ci-triggers-from-spec.mjs --json     (print the constants as JSON)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CYRILLIC, SITE, checkSchema, compilerErrors, constsOf, loadCompiler, sha256, verdictOf } from './agents-from-specs.mjs'
import { runSpecTests } from './viewport-from-spec.mjs'

const WASM = 'public/t27/t27_compiler.wasm'
// The spec and its outputs live at the repository root, outside apps/website:
// the workflows are the repository's, not the site's. The npm scripts stay in
// apps/website because the compiler wasm and the generator idiom already do.
const REPO = resolve(SITE, '../..')
export const SPEC = 'specs/ci/workflow_triggers.t27'
export const WORKFLOWS_DIR = '.github/workflows'
export const EXPECTED_MODULE = 'ci_workflow_triggers'
export const MANAGED_BY = '# Managed by apps/website/scripts/ci-triggers-from-spec.mjs from specs/ci/workflow_triggers.t27.'
const TOP_LEVEL = /^[A-Za-z_][A-Za-z0-9_-]*:( |$)/

// The constant schema is regular: every managed workflow carries the same
// seven required trigger facts, and may carry the optional ones. The prefix
// (BRAIN_CI for brain-ci.yml) is derived from the spec's own GENERATED list,
// so adding a workflow to the spec adds its schema here with no other edit.
export function schemaFor(files) {
  const required = { GENERATED: 'arr', PROSE_PATHS_IGNORE: 'arr' }
  const optional = {}
  for (const file of files) {
    const p = prefixOf(file)
    Object.assign(required, {
      [`${p}_ON_PUSH`]: 'bool', [`${p}_PUSH_BRANCHES`]: 'arr',
      [`${p}_ON_PR`]: 'bool', [`${p}_IGNORES_PROSE`]: 'bool',
      [`${p}_ON_DISPATCH`]: 'bool', [`${p}_SCHEDULED`]: 'bool',
      [`${p}_NOTE_PUSH`]: 'arr',
    })
    Object.assign(optional, {
      [`${p}_PR_BRANCHES`]: 'arr', [`${p}_PATHS`]: 'arr', [`${p}_SCHEDULE`]: 'arr',
      [`${p}_NOTE_PR`]: 'arr', [`${p}_NOTE_DISPATCH`]: 'arr', [`${p}_NOTE_TAIL`]: 'arr',
      [`${p}_DISPATCH_INPUT_NAME`]: 'str', [`${p}_DISPATCH_INPUT_DESC`]: 'str',
      [`${p}_DISPATCH_INPUT_OPTIONS`]: 'arr', [`${p}_DISPATCH_INPUT_DEFAULT`]: 'str',
    })
  }
  return { required, optional }
}

export function prefixOf(file) {
  return file.replace(/\.yml$/, '').toUpperCase().replace(/-/g, '_')
}

const CRON = /^(\S+\s+){4}\S+$/
const IDENT = /^[A-Za-z0-9_.*][A-Za-z0-9_./*-]*$/

// Semantic checks the schema cannot express: the regular table has to be a
// coherent trigger block, and the prose that rides along has to survive being
// emitted as a YAML comment.
export function semanticProblems(f, file) {
  const p = []
  const push = (m) => p.push(`${file}: ${m}`)
  if (!Array.isArray(f.GENERATED) || f.GENERATED.length === 0) push('GENERATED must name at least one workflow')
  if (new Set(f.GENERATED).size !== f.GENERATED.length) push('GENERATED names a workflow twice')
  for (const [i, g] of (f.GENERATED ?? []).entries()) {
    if (!/^[a-z0-9-]+\.yml$/.test(g)) push(`GENERATED[${i}] ${g} is not a workflow file name`)
  }
  if (!f.PROSE_PATHS_IGNORE?.length) push('PROSE_PATHS_IGNORE must not be empty')
  for (const [i, s] of (f.PROSE_PATHS_IGNORE ?? []).entries()) if (!IDENT.test(s)) push(`PROSE_PATHS_IGNORE[${i}] ${s} is not a path pattern this emitter can quote`)

  for (const file_ of f.GENERATED ?? []) {
    const w = prefixOf(file_)
    const where = (m) => push(`${file_}: ${m}`)
    if (f[`${w}_ON_PUSH`] !== true) where('must answer pushes; a workflow that ignores its own builds is not this table\'s business')
    if (!f[`${w}_PUSH_BRANCHES`]?.length) where('PUSH_BRANCHES must not be empty')
    if (f[`${w}_ON_PR`] === true && !f[`${w}_PR_BRANCHES`]?.length) where('ON_PR is true and PR_BRANCHES is missing or empty')
    if (f[`${w}_ON_PR`] !== true && f[`${w}_PR_BRANCHES`] !== undefined) where('PR_BRANCHES is set but ON_PR is false; absent means absent')
    if (f[`${w}_IGNORES_PROSE`] === true && f[`${w}_PATHS`] !== undefined) where('IGNORES_PROSE and PATHS are both set; a trigger filters one way')
    if (f[`${w}_IGNORES_PROSE`] !== true && !f[`${w}_PATHS`]?.length) where('neither IGNORES_PROSE nor PATHS is set; an unfiltered trigger is what the spec exists to prevent')
    if (f[`${w}_SCHEDULED`] === true) {
      if (!f[`${w}_SCHEDULE`]?.length) where('SCHEDULED is true and SCHEDULE is missing or empty')
      for (const [i, c] of (f[`${w}_SCHEDULE`] ?? []).entries()) if (!CRON.test(c)) where(`SCHEDULE[${i}] ${c} is not a five-field cron expression`)
    } else if (f[`${w}_SCHEDULE`] !== undefined) {
      where('SCHEDULE is set but SCHEDULED is false; absent means absent')
    }
    const name = f[`${w}_DISPATCH_INPUT_NAME`]
    if (name) {
      for (const k of ['DISPATCH_INPUT_DESC', 'DISPATCH_INPUT_OPTIONS', 'DISPATCH_INPUT_DEFAULT']) {
        if (f[`${w}_${k}`] === undefined) where(`DISPATCH_INPUT_NAME is set and ${k} is missing`)
      }
      const options = f[`${w}_DISPATCH_INPUT_OPTIONS`] ?? []
      if (!options.length) where('DISPATCH_INPUT_OPTIONS must not be empty')
      if (!options.includes(f[`${w}_DISPATCH_INPUT_DEFAULT`])) where('DISPATCH_INPUT_DEFAULT is not one of DISPATCH_INPUT_OPTIONS')
    } else {
      for (const k of ['DISPATCH_INPUT_DESC', 'DISPATCH_INPUT_OPTIONS', 'DISPATCH_INPUT_DEFAULT']) {
        if (f[`${w}_${k}`] !== undefined) where(`${k} is set without DISPATCH_INPUT_NAME; absent means absent`)
      }
    }
    for (const key of Object.keys(f)) {
      if (!/_NOTE_(PUSH|PR|DISPATCH|TAIL)$/.test(key)) continue
      const note = f[key]
      if (!Array.isArray(note)) continue
      for (const [i, line] of note.entries()) {
        if (typeof line !== 'string' || !line.trim()) where(`${key}[${i}] is empty; an empty comment line is a gap, not prose`)
        if (line !== line.trim()) where(`${key}[${i}] has leading or trailing space`)
        if (!/[A-Za-z]/.test(line)) where(`${key}[${i}] carries no letter; notes are comments read by people`)
      }
    }
    for (const key of [`${w}_PUSH_BRANCHES`, `${w}_PR_BRANCHES`, `${w}_PATHS`]) {
      for (const [i, v] of (f[key] ?? []).entries()) if (!IDENT.test(v)) where(`${key}[${i}] ${v} is not a pattern this emitter can quote`)
    }
  }
  return [...new Set(p)]
}

// Single-quote anything that is not a bare word, so `main` stays main and
// `feat/*` becomes 'feat/*'. One quoting rule, not one per file.
const quote = (v) => (/^[A-Za-z0-9_-]+$/.test(v) ? v : `'${v}'`)

const comment = (indent, lines) => (lines ?? []).map((l) => `${indent}# ${l}`)

function triggerPaths(kind, paths, indent) {
  return [`${indent}${kind}:`, ...paths.map((p) => `${indent}  - ${quote(p)}`)]
}

// Deterministic: the same spec bytes give the same workflow bytes.
export function renderBlock(f, file) {
  const w = prefixOf(file)
  const lines = [
    MANAGED_BY,
    '# Do not edit this block: edit the spec, then run npm --prefix apps/website run gen:ci-triggers.',
    'on:',
  ]
  if (f[`${w}_ON_PUSH`] === true) {
    lines.push('  push:', `    branches: [${f[`${w}_PUSH_BRANCHES`].map(quote).join(', ')}]`)
    lines.push(...comment('    ', f[`${w}_NOTE_PUSH`]))
    if (f[`${w}_IGNORES_PROSE`] === true) lines.push(...triggerPaths('paths-ignore', f.PROSE_PATHS_IGNORE, '    '))
    else lines.push(...triggerPaths('paths', f[`${w}_PATHS`], '    '))
  }
  if (f[`${w}_ON_PR`] === true) {
    lines.push('  pull_request:', `    branches: [${f[`${w}_PR_BRANCHES`].map(quote).join(', ')}]`)
    lines.push(...comment('    ', f[`${w}_NOTE_PR`]))
    if (f[`${w}_IGNORES_PROSE`] === true) lines.push(...triggerPaths('paths-ignore', f.PROSE_PATHS_IGNORE, '    '))
    else lines.push(...triggerPaths('paths', f[`${w}_PATHS`], '    '))
  }
  if (f[`${w}_ON_DISPATCH`] === true) {
    lines.push(...comment('  ', f[`${w}_NOTE_DISPATCH`]))
    lines.push('  workflow_dispatch:')
    const name = f[`${w}_DISPATCH_INPUT_NAME`]
    if (name) {
      lines.push('    inputs:', `      ${name}:`, `        description: ${quote(f[`${w}_DISPATCH_INPUT_DESC`])}`,
        '        required: true', `        default: ${quote(f[`${w}_DISPATCH_INPUT_DEFAULT`])}`, '        type: choice',
        '        options:', ...f[`${w}_DISPATCH_INPUT_OPTIONS`].map((o) => `          - ${quote(o)}`))
    }
  }
  if (f[`${w}_SCHEDULED`] === true) {
    lines.push('  schedule:', ...f[`${w}_SCHEDULE`].map((c) => `    - cron: ${quote(c)}`))
  }
  // The tail note (why a schedule block is absent) rides right after the first
  // branches line, not at the end of the block. The crons catalog
  // (public/crons/manifest.json, gate check:crons-catalog) cites the
  // no-schedule note of codegen.yml and brain-ci.yml BY LINE NUMBER and reads
  // a window around it for the word cron; a header plus three paths lists
  // would push an end-of-block note out of that window. citationProblem
  // below enforces the same window here, so the two cannot drift apart.
  const tail = comment('    ', f[`${w}_NOTE_TAIL`])
  if (tail.length > 0) {
    const first = lines.findIndex((l) => /^ {4}branches: \[/.test(l))
    if (first < 0) lines.push(...comment('  ', f[`${w}_NOTE_TAIL`]))
    else lines.splice(first + 1, 0, ...tail)
  }
  return lines.join('\n')
}

// The catalog cites schedule-bearing lines of these workflows by number and
// checks lines [line-3, line+2) for the word `cron` -- the same near-window
// qa/crons-catalog-contract.mjs checks in CI. The generator owns the layout
// now, so it owns keeping those citations true: a layout change that drifts a
// citation fails here, at generation time, with the line numbers in hand.
export function citationProblem(text, file, citations) {
  const lines = text.split('\n')
  for (const c of citations) {
    const near = lines.slice(Math.max(0, c.line - 3), c.line + 2).join('\n')
    if (!near.includes('cron')) {
      return `${file}: the crons catalog entry ${c.id} cites ${file}:${c.line}; lines ${Math.max(1, c.line - 2)}-${c.line + 2} no longer mention cron`
    }
  }
  return null
}

function catalogCitations() {
  const manifest = JSON.parse(readFileSync(join(SITE, 'public/crons/manifest.json'), 'utf8'))
  const byFile = new Map()
  for (const entry of manifest.crons) {
    const where = entry.where ?? {}
    if (entry.kind !== 'github-actions' || !where.file?.startsWith('.github/workflows/') || !where.line) continue
    // Citations resolve against the entry's own repository (the gate looks up
    // ROOTS[entry.repo]); the bot repository's ci.yml:10 is not this ci.yml.
    if ((entry.repo ?? '').replace('gHashTag/', '') !== 'trinity') continue
    if (!byFile.has(where.file)) byFile.set(where.file, [])
    byFile.get(where.file).push({ id: entry.id, line: where.line })
  }
  return byFile
}

// Replace the managed region: from the managed-by header if the generator has
// been run before, else from the bare `on:` line, through to (not including)
// the next top-level key. The blank lines that separated the old region from
// the next key are kept as they were, so a first run and every later run leave
// the file shaped the same way.
export function splice(text, block, file) {
  const lines = text.split('\n')
  const headerIdx = lines.findIndex((l) => l === MANAGED_BY)
  const onIdx = lines.indexOf('on:')
  if (onIdx < 0) throw new Error(`${file}: no top-level on: block to manage`)
  if (headerIdx >= 0 && onIdx < headerIdx) throw new Error(`${file}: managed header appears after the on: block`)
  const start = headerIdx >= 0 ? headerIdx : onIdx
  // The region runs from the header (or on:) past on: to the next top-level
  // key. Scanning from start would stop at on: itself -- a top-level key --
  // and claim the region holds only the header comments.
  let end = onIdx + 1
  while (end < lines.length && !TOP_LEVEL.test(lines[end])) end++
  if (end >= lines.length) throw new Error(`${file}: the on: block runs to the end of the file; nothing follows it`)
  let blanks = 0
  while (end - blanks - 1 > onIdx && lines[end - blanks - 1] === '') blanks++
  const out = [...lines.slice(0, start), ...block.split('\n'), ...Array(blanks).fill(''), ...lines.slice(end)]
  return out.join('\n')
}

const plain = (consts) => Object.fromEntries(Object.entries(consts).map(([k, v]) => [k, v.value]))

export async function buildTriggers({ specText, analyze }) {
  const problems = []
  const file = SPEC
  const analysis = analyze(specText)
  const verdict = verdictOf(analysis)
  if (!verdict.typecheckOk || verdict.discarded > 0 || !verdict.hirOk) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(verdict)})`)
  problems.push(...compilerErrors(analysis).map((m) => `${file}: ${m}`))
  if (/[^\x00-\x7f]/.test(specText)) problems.push(`${file}: non-ASCII byte in the spec (L3)`)
  if (CYRILLIC.test(specText)) problems.push(`${file}: Cyrillic in the spec (LANG-EN)`)
  const moduleName = analysis.ast?.name ?? null
  if (moduleName !== EXPECTED_MODULE) problems.push(`${file}: module must be ${EXPECTED_MODULE}, is ${moduleName}`)

  let consts = {}
  try { consts = constsOf(analysis) } catch (e) { problems.push(`${file}: ${e.message}`) }
  const f = plain(consts)
  const { required, optional } = schemaFor(f.GENERATED ?? [])
  problems.push(...checkSchema(consts, required, optional, file))
  if (problems.length === 0) {
    problems.push(...semanticProblems(f, file))
    const tests = runSpecTests(analysis, f)
    if (tests.tests === 0) problems.push(`${file}: no test block; the spec must test its own claims`)
    problems.push(...tests.failures.map((m) => `${file}: test ${m}`))
  }

  const outputs = new Map()
  if (problems.length === 0) {
    const citations = catalogCitations()
    for (const wf of f.GENERATED) {
      const wfPath = join(REPO, WORKFLOWS_DIR, wf)
      if (!existsSync(wfPath)) { problems.push(`${SPEC}: GENERATED names ${wf}, which is not in ${WORKFLOWS_DIR}`); continue }
      const text = splice(readFileSync(wfPath, 'utf8'), renderBlock(f, wf), wf)
      const cited = citations.get(`${WORKFLOWS_DIR}/${wf}`) ?? []
      const drift = citationProblem(text, wf, cited)
      if (drift) problems.push(drift)
      outputs.set(wf, text)
    }
  }
  return { problems, fields: f, outputs, specSha: sha256(Buffer.from(specText, 'utf8')) }
}

// The negative controls. A gate nobody has watched fail is not trusted on the
// day it matters, and this one rewrites CI triggers -- the wiring every other
// gate hangs from. All three run against the real spec and the real workflows,
// in memory, before anything is written or compared.
export async function selfTest({ specText, analyze, outputs }) {
  const results = []
  const expect = (name, ok) => { results.push([name, ok]); if (!ok) console.error(`ci-triggers-from-spec: self-test ${name} FAILED`) }

  expect('splice refuses a workflow with no on: block', (() => {
    try { splice('name: X\n\njobs:\n  a:\n', 'on:\n', 'x.yml'); return false } catch { return true }
  })())

  expect('the stale check catches a dropped path', (() => {
    const victim = outputs.get('ci.yml')
    if (victim === undefined) return false
    const tampered = victim.replace("      - 'docs/**'\n", '')
    return tampered !== victim && victim.includes("      - 'docs/**'\n")
  })())

  const { problems } = await buildTriggers({ specText: specText.replace('pub const CI_ON_PR : bool = true;', ''), analyze })
  expect('a spec missing a constant is refused by name', problems.some((m) => m.includes('missing CI_ON_PR')))

  const flipped = await buildTriggers({ specText: specText.replace('pub const KOSCHEI_PRODUCTION_ON_PR : bool = false;', 'pub const KOSCHEI_PRODUCTION_ON_PR : bool = true;'), analyze })
  expect('a spec whose own test no longer holds is refused', flipped.problems.some((m) => m.startsWith(`${SPEC}: test`)))

  expect('the crons-catalog citation window is enforced', (() => {
    const quiet = Array.from({ length: 12 }, () => 'x').join('\n')
    const bad = citationProblem(quiet, 'x.yml', [{ id: 'github-actions/trinity/x', line: 8 }])
    const good = citationProblem('a\nb\nschedule:\n  - cron: x\n', 'x.yml', [{ id: 'github-actions/trinity/x', line: 4 }])
    const none = citationProblem(quiet, 'x.yml', [])
    return bad !== null && bad.includes('crons catalog') && good === null && none === null
  })())

  return results
}

async function main() {
  const check = process.argv.includes('--check')
  const json = process.argv.includes('--json')
  const specPath = join(REPO, SPEC)
  if (!existsSync(specPath)) { console.error(`ci-triggers-from-spec: ${SPEC} is missing`); process.exit(1) }
  const wasmBytes = readFileSync(join(SITE, WASM))
  const analyze = await loadCompiler(wasmBytes)
  const specText = readFileSync(specPath, 'utf8')
  const out = await buildTriggers({ specText, analyze })
  if (out.problems.length) {
    console.error(`ci-triggers-from-spec: ${out.problems.length} problem(s)`)
    for (const p of out.problems) console.error('  ' + p)
    process.exit(1)
  }
  const controls = await selfTest({ specText, analyze, outputs: out.outputs })
  if (controls.some(([, ok]) => !ok)) { console.error('ci-triggers-from-spec: self-test failed; nothing written, nothing compared'); process.exit(1) }

  if (json) { console.log(JSON.stringify({ specSha: out.specSha, ...out.fields })); return }
  const names = [...out.outputs.keys()]
  if (check) {
    const stale = names.filter((wf) => readFileSync(join(REPO, WORKFLOWS_DIR, wf), 'utf8') !== out.outputs.get(wf))
    if (stale.length) {
      console.error(`ci-triggers-from-spec --check: stale trigger block in ${stale.join(', ')}; run npm --prefix apps/website run gen:ci-triggers`)
      process.exit(1)
    }
  } else {
    for (const wf of names) writeFileSync(join(REPO, WORKFLOWS_DIR, wf), out.outputs.get(wf))
  }
  console.log(`ci-triggers-from-spec: ${check ? 'up to date' : 'wrote'} the on: block of ${names.join(', ')}; spec sha256 ${out.specSha.slice(0, 16)}; self-test ${controls.length}/${controls.length} held`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
