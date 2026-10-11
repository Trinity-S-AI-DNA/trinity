#!/usr/bin/env node
// course-ladder-from-spec.mjs -- the course ladder on t27.ai from its two specs.
//
// The RULES are gHashTag/t27 specs/automation/course-access.t27, vendored byte for byte as
// specs/ladder/course-access.t27 and run from its own compiled fn bodies
// (src/lib/courseAccess.logic.ts, wasm, generated in gHashTag/999-multibots-telegraf by
// scripts/t27-logic.mjs; its constants beside it in src/lib/courseAccess.gen.ts). This script
// holds the copies to the spec: the logic file's spec-sha256 must be the vendored spec's, and
// every constant gen.ts names must be the value the compiler reads from that spec. A rule
// edited in either file without the spec is a stale copy, and the build stops.
//
// The WORDS are specs/ladder/course-ladder.t27 (English) and i18n/course-ladder.ru.json
// (Russian: every SAY_ key, no other key, the same {placeholders} and digits).
//
// Writes the file nobody edits by hand:
//   src/lib/courseLadder.generated.ts   the words, the render address, the browser keys
//
// Run:      node scripts/course-ladder-from-spec.mjs            (write)
//           node scripts/course-ladder-from-spec.mjs --check    (fail if stale)
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CYRILLIC, SITE, checkSchema, compilerErrors, constsOf, loadCompiler, verdictOf } from './agents-from-specs.mjs'
import { runSpecTests } from './viewport-from-spec.mjs'

const WASM = 'public/t27/t27_compiler.wasm'
export const RULES_SPEC = 'specs/ladder/course-access.t27'
export const WORDS_SPEC = 'specs/ladder/course-ladder.t27'
export const RU_BUNDLE = 'i18n/course-ladder.ru.json'
export const LOGIC_TS = 'src/lib/courseAccess.logic.ts'
export const GEN_TS = 'src/lib/courseAccess.gen.ts'
export const TS_OUT = 'src/lib/courseLadder.generated.ts'

const WORDS_REQUIRED = {
  KIND: 'str', SCHEMA_VERSION: 'u8', GENERATED: 'arr', RULES_SPEC: 'str', RENDER_BASE: 'str', OPEN_KEY: 'str', KEYS_KEY: 'str',
}
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')
const holes = (s) => [...String(s).matchAll(/\{\d+\}|\d+/g)].map((m) => m[0]).sort().join(',')

/** The constants gen.ts declares, as `{ NAME: value }`. */
export function genValues(genText) {
  const out = {}
  for (const m of genText.matchAll(/^export const (\w+) = (.+?) satisfies \w+;$/gm)) out[m[1]] = JSON.parse(m[2])
  return out
}

export function ladderProblems({ rulesText, wordsText, ruText, logicText, genText, analyze }) {
  const p = []
  // The rules: compile clean, the logic built from exactly these bytes, gen.ts says what they say.
  const rules = analyze(rulesText)
  const rv = verdictOf(rules)
  if (!rv.typecheckOk || rv.discarded > 0 || !rv.hirOk) p.push(`${RULES_SPEC}: compiler verdict not clean (${JSON.stringify(rv)})`)
  p.push(...compilerErrors(rules).map((m) => `${RULES_SPEC}: ${m}`))
  if (rules.ast?.name !== 'automation::course_access') p.push(`${RULES_SPEC}: module must be automation::course_access`)
  const logicSha = logicText.match(/^\/\/ spec-sha256: ([0-9a-f]{64})$/m)?.[1]
  if (logicSha !== sha256(rulesText)) p.push(`${LOGIC_TS}: built from another version of ${RULES_SPEC} (spec-sha256 ${logicSha ?? 'missing'}, the spec is ${sha256(rulesText)}); regenerate it with scripts/t27-logic.mjs`)
  let rc = {}
  try { rc = constsOf(rules) } catch (e) { p.push(`${RULES_SPEC}: ${e.message}`) }
  const gen = genValues(genText)
  const names = Object.keys(rc)
  if (!names.length) p.push(`${RULES_SPEC}: no constants read`)
  for (const name of names) {
    if (!(name in gen)) p.push(`${GEN_TS}: ${name} is missing`)
    else if (JSON.stringify(gen[name]) !== JSON.stringify(rc[name].value)) p.push(`${GEN_TS}: ${name} is ${JSON.stringify(gen[name])}, the spec says ${JSON.stringify(rc[name].value)}`)
  }
  for (const name of Object.keys(gen)) if (!(name in rc)) p.push(`${GEN_TS}: ${name} is not in the spec`)

  // The words.
  const words = analyze(wordsText)
  const wv = verdictOf(words)
  if (!wv.typecheckOk || wv.discarded > 0 || !wv.hirOk) p.push(`${WORDS_SPEC}: compiler verdict not clean (${JSON.stringify(wv)})`)
  if (/[^\x00-\x7f]/.test(wordsText)) p.push(`${WORDS_SPEC}: non-ASCII byte (L3)`)
  if (CYRILLIC.test(wordsText)) p.push(`${WORDS_SPEC}: Cyrillic in the spec; Russian belongs in ${RU_BUNDLE}`)
  let wc = {}
  try { wc = constsOf(words) } catch (e) { p.push(`${WORDS_SPEC}: ${e.message}`) }
  const says = Object.fromEntries(Object.keys(wc).filter((k) => k.startsWith('SAY_')).map((k) => [k, 'str']))
  p.push(...checkSchema(wc, WORDS_REQUIRED, says, WORDS_SPEC))
  const w = Object.fromEntries(Object.entries(wc).map(([k, v]) => [k, v.value]))
  if (w.KIND !== 'course-ladder') p.push(`${WORDS_SPEC}: KIND must be "course-ladder"`)
  if (w.RULES_SPEC !== RULES_SPEC) p.push(`${WORDS_SPEC}: RULES_SPEC must be ${RULES_SPEC}`)
  if (JSON.stringify(w.GENERATED) !== JSON.stringify([TS_OUT])) p.push(`${WORDS_SPEC}: GENERATED must be ${JSON.stringify([TS_OUT])}`)
  if (!/^https:\/\/[a-z0-9.-]+$/.test(String(w.RENDER_BASE ?? ''))) p.push(`${WORDS_SPEC}: RENDER_BASE must be a bare https origin`)
  const tests = runSpecTests(words, w)
  if (tests.tests < 1) p.push(`${WORDS_SPEC}: needs at least one test block`)
  p.push(...tests.failures.map((f) => `${WORDS_SPEC}: ${f}`))

  // Russian: every word, nothing else, the same holes.
  let ru = null
  try { ru = JSON.parse(ruText) } catch (e) { p.push(`${RU_BUNDLE}: not JSON (${e.message})`) }
  if (ru) {
    for (const k of Object.keys(says)) {
      if (typeof ru[k] !== 'string' || !ru[k].trim()) p.push(`${RU_BUNDLE}: ${k} is missing`)
      else if (holes(ru[k]) !== holes(w[k])) p.push(`${RU_BUNDLE}: ${k} keeps other numbers or {placeholders} than the English`)
    }
    for (const k of Object.keys(ru)) if (!(k in says)) p.push(`${RU_BUNDLE}: ${k} is not a word of ${WORDS_SPEC}`)
  }
  const out = p.length
    ? null
    : {
        renderBase: w.RENDER_BASE,
        openKey: w.OPEN_KEY,
        keysKey: w.KEYS_KEY,
        rulesSha: sha256(rulesText),
        say: {
          en: Object.fromEntries(Object.keys(says).map((k) => [k.slice(4), w[k]])),
          ru: Object.fromEntries(Object.keys(says).map((k) => [k.slice(4), ru[k]])),
        },
      }
  return { problems: p, out }
}

export const renderTs = (o) => `// GENERATED by scripts/course-ladder-from-spec.mjs from ${WORDS_SPEC}, ${RU_BUNDLE} and ${RULES_SPEC}
// rules sha256 ${o.rulesSha}
// Do not edit: change the .t27 source (or the Russian bundle) and regenerate. The rules
// themselves run from ${LOGIC_TS}; their numbers are in ${GEN_TS}.

export const LADDER = ${JSON.stringify({ renderBase: o.renderBase, openKey: o.openKey, keysKey: o.keysKey, say: o.say }, null, 2)} as const

export type LadderSay = (typeof LADDER.say)['en']
`

export function readInputs(root = SITE) {
  const read = (rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8') : '')
  return { rulesText: read(RULES_SPEC), wordsText: read(WORDS_SPEC), ruText: read(RU_BUNDLE), logicText: read(LOGIC_TS), genText: read(GEN_TS) }
}

async function main() {
  const check = process.argv.includes('--check')
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const { problems, out } = ladderProblems({ ...readInputs(), analyze })
  if (problems.length) {
    console.error(`course-ladder-from-spec: ${problems.length} problem(s)`)
    for (const x of problems) console.error('  ' + x)
    process.exit(1)
  }
  const text = renderTs(out)
  const path = join(SITE, TS_OUT)
  if (check) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text) {
      console.error(`course-ladder-from-spec --check: stale ${TS_OUT}; run node scripts/course-ladder-from-spec.mjs`)
      process.exit(1)
    }
  } else writeFileSync(path, text)
  console.log(`course-ladder-from-spec: ${check ? 'up to date' : 'wrote'} ${TS_OUT}; ${Object.keys(out.say.en).length} words in 2 languages; ${LOGIC_TS} built from ${RULES_SPEC} (sha ${out.rulesSha.slice(0, 12)})`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
