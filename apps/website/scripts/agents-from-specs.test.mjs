// What the spec→catalog generator refuses, and what it lets through.
//
// The interesting cases are the failures: two specs claiming one ID, a cron
// whose RUNS names a skill that has no spec, a spec with no code behind it, a
// spec the compiler does not accept. And the two quirks the generator leans
// on -- array literals arriving as identifiers and UTF-8 arriving as bytes --
// are pinned here against the REAL wasm so a compiler update that changes
// either shape fails loudly instead of shipping mojibake.
//
//   node --test scripts/agents-from-specs.test.mjs

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  I18N_SPEC_DIR, SITE, analyzeSpecFiles, castCommandRuns, castCommands, castProblems, readCasts, checkI18n, buildSpecCatalogs, constsOf, decodeBytes, shapeProblem, loadCompiler, runNowTarget, sortKeys, verdictOf,
} from './agents-from-specs.mjs'

const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))

const q = JSON.stringify
const skillSrc = (id, { module = 'skill_x', specs = [], summary = 'en', extra = '' } = {}) => `module ${module};
pub const KIND : str = "skill";
pub const ID : str = ${q(id)};
pub const NAME : str = "x";
pub const REPO : str = "trinity";
pub const SOURCE : str = "SKILL.md";
pub const SUMMARY_EN : str = ${q(summary)};
pub const COMMAND : str = "/x";
pub const SPECS : [${specs.length}]str = ${q(specs)};
pub const TAGS : [1]str = ["t"];
pub const ENABLED : bool = true;
pub const TIMEOUT_MIN : u16 = 30;
${extra}`
const cronSrc = (id, { module = 'cron_x', runs = [], host = 'github-actions', schedule = '"0 0 * * *"', extra = '' } = {}) => `module ${module};
pub const KIND : str = "cron";
pub const ID : str = ${q(id)};
pub const NAME : str = "x";
pub const HOST : str = ${q(host)};
pub const REPO : str = "trinity";
pub const SERVICE : str = ".github/workflows/x.yml";
pub const SUMMARY_EN : str = "en";
${host === 'timer' ? 'pub const INTERVAL_MS : u32 = 5000;' : `pub const SCHEDULE : str = ${schedule};`}
pub const TZ : str = "UTC";
pub const RUNS : [${runs.length}]str = ${q(runs)};
pub const RUNS_NOTE : str = "test";
pub const ENABLED : bool = true;
pub const ON_FAILURE : str = "log";
pub const CONTROL : str = "code-only";
${extra}`

const files = (dir, ...srcs) => srcs.map((text, i) => ({ path: `${dir}/x${i}.t27`, text }))
const skillsManifest = { skills: [{ id: 'trinity/x', path: 'trinity/x/SKILL.md', sha256: 'a'.repeat(64), health: 'ok', link: 'unbound' }] }
const cronsManifest = { crons: [{ id: 'github-actions/trinity/x', kind: 'github-actions', schedule: { kind: 'cron', expr: '0 0 * * *' }, where: { file: 'w.yml', line: 1 }, health: 'ok' }] }
const build = (skillSpecs, cronSpecs, over = {}) => buildSpecCatalogs({
  skillSpecs: analyzeSpecFiles(analyze, skillSpecs),
  cronSpecs: analyzeSpecFiles(analyze, cronSpecs),
  skillsManifest, cronsManifest, t27Manifest: { specs: [{ path: 'specs/demos/hello_world.t27' }] },
  compilerWasmSha256: 'w', generatedAt: '2026-01-01T00:00:00.000Z', ...over,
})

test('the compiler accepts the schema, including an empty array, and constants come back typed', () => {
  const a = analyze(skillSrc('trinity/x', { module: 'skill_x0' }))
  const v = verdictOf(a)
  assert.equal(v.typecheckOk, true)
  assert.equal(v.discarded, 0)
  const c = constsOf(a)
  assert.equal(c.ID.value, 'trinity/x')
  assert.deepEqual(c.SPECS.value, [])
  assert.equal(c.ENABLED.value, true)
  assert.equal(c.TIMEOUT_MIN.value, 30)
  assert.equal(c.TIMEOUT_MIN.type, 'u16')
})

test('array literals arrive as array nodes and UTF-8 arrives as bytes; both are undone exactly', () => {
  // Specs are English-only (LANG-EN), but English specs still carry non-ASCII
  // glyphs -- arrows, check marks, φ -- and those must round-trip exactly.
  const a = analyze(skillSrc('trinity/x', { module: 'skill_x0', specs: ['specs/a.t27', 'specs/φ.t27'], summary: 'Issue → Spec ✓ ⟲ ◷ φ' }))
  const arr = a.ast.children.find((n) => n.name === 'SPECS').children[0]
  // The artifact vendored before #4471 put the whole literal in an ExprIdentifier's
  // *name*, as a JSON document. The compiler's own build emits the node it parsed.
  assert.equal(arr.kind, 'ExprArrayLiteral')
  assert.deepEqual(arr.children.map((n) => n.kind), ['ExprLiteral', 'ExprLiteral'])
  assert.equal(arr.children[0].nodeKind, 'string', 'a string element is marked as one, not guessed from its text')
  const c = constsOf(a)
  assert.deepEqual(c.SPECS.value, ['specs/a.t27', 'specs/φ.t27'])
  assert.equal(c.SUMMARY_EN.value, 'Issue → Spec ✓ ⟲ ◷ φ')
  assert.equal(decodeBytes('plain ascii'), 'plain ascii')
  assert.equal(decodeBytes('уже верно'), 'уже верно', 'text that is already decoded is left alone')
})

test('a negative number inside an array is read; a minus over anything else is refused', () => {
  // The compiler sends a scalar -7 as the literal "-7" but each -1 inside [-1, 0, 5] as unary minus.
  const c = constsOf(analyze('module m;\npub const A : [3]i32 = [-1, 0, 5];\npub const B : i32 = -7;\npub const S : [2]str = ["-1", "x"];\n'))
  assert.deepEqual(c.A.value, [-1, 0, 5])
  assert.equal(c.B.value, -7)
  assert.deepEqual(c.S.value, ['-1', 'x'], 'a string that looks like a number stays a string')
  assert.throws(() => constsOf(analyze('module m;\npub const N : [1]i32 = [-K];\npub const K : i32 = 1;\n')), /unsupported|minus/)
})

test('a float with an exponent is read as its number; hex is still refused', () => {
  // t27 specs/ml writes its epsilons this way (adam.t27 DEFAULT_EPSILON = 1e-8, attention NEG_INF = -1.0e30).
  const c = constsOf(analyze('module m;\npub const E : f32 = 1e-8;\npub const F : f32 = 1.0e-5;\npub const G : f32 = -1.0e30;\n'))
  assert.equal(c.E.value, 1e-8)
  assert.equal(c.F.value, 1e-5)
  assert.equal(c.G.value, -1e30)
  assert.throws(() => constsOf(analyze('module m;\npub const H : u32 = 0xff;\n')), /unsupported/)
})

test('signed integers have a shape: in range passes, out of range and the wrong type do not', () => {
  const c = constsOf(analyze('module m;\npub const T : [3]i32 = [-1, 0, 1];\npub const N : i32 = -5;\npub const B : i8 = -129;\npub const U : u8 = 3;\n'))
  assert.equal(shapeProblem(c.T, 'arr-i32'), null)
  assert.equal(shapeProblem(c.N, 'i32'), null)
  assert.match(shapeProblem(c.B, 'i8'), /not in i8 range/)
  assert.match(shapeProblem(c.U, 'i32'), /must be i32/)
  assert.match(shapeProblem(c.T, 'arr-u32'), /not in u32 range/)
})

test('a clean pair is spec+code, healthy, with the reverse link filled in', () => {
  const r = build(files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0' })), files('specs/crons', cronSrc('github-actions/trinity/x', { module: 'cron_x0', runs: ['trinity/x'] })))
  assert.deepEqual(r.problems, [])
  assert.equal(r.skills.skills[0].witness, 'spec+code')
  assert.equal(r.crons.crons[0].witness, 'spec+code')
  assert.equal(r.crons.crons[0].health, 'ok')
  assert.deepEqual(r.crons.crons[0].runsResolved, [{ id: 'trinity/x', ok: true }])
  assert.deepEqual(r.skills.skills[0].runBy, ['github-actions/trinity/x'])
  assert.deepEqual(r.skills.codeOnly, [])
  assert.equal(r.skills.counts.runBy, 1)
})

test('duplicate IDs fail the build', () => {
  const r = build(files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0' }), skillSrc('trinity/x', { module: 'skill_x1' })), [])
  assert.ok(r.problems.some((p) => p.includes('duplicate skill ID trinity/x')), r.problems.join('\n'))
})

test('a RUNS entry with no skill spec marks the cron fail, with a message', () => {
  const r = build([], files('specs/crons', cronSrc('github-actions/trinity/x', { module: 'cron_x0', runs: ['trinity/ghost'] })))
  assert.deepEqual(r.problems, [])
  const c = r.crons.crons[0]
  assert.equal(c.health, 'fail')
  assert.deepEqual(c.runsResolved, [{ id: 'trinity/ghost', ok: false }])
  assert.ok(c.messages.some((m) => m.includes('trinity/ghost')))
})

test('a spec the code catalog does not know is spec-only and warns; a code entry with no spec is code-only', () => {
  const r = build(files('specs/skills', skillSrc('trinity/only-in-spec', { module: 'skill_x0' })), [])
  assert.equal(r.skills.skills[0].witness, 'spec-only')
  assert.equal(r.skills.skills[0].health, 'warn')
  assert.deepEqual(r.skills.codeOnly, ['trinity/x'])
  assert.deepEqual(r.crons.codeOnly, ['github-actions/trinity/x'])
  assert.equal(r.crons.counts.codeOnly, 1)
})

test('the module name must follow the file name', () => {
  const r = build(files('specs/skills', skillSrc('trinity/x', { module: 'skill_wrong' })), [])
  assert.ok(r.problems.some((p) => p.includes('module must be skill_x0')))
})

test('a timer carries INTERVAL_MS, a schedule carries SCHEDULE, never both', () => {
  const r = build([], files('specs/crons',
    cronSrc('timer/trinity/t', { module: 'cron_x0', host: 'timer', extra: 'pub const SCHEDULE : str = "* * * * *";' }),
    cronSrc('github-actions/trinity/x', { module: 'cron_x1', extra: 'pub const INTERVAL_MS : u32 = 1;' }),
  ))
  assert.ok(r.problems.some((p) => p.includes('x0.t27: a timer has INTERVAL_MS, not SCHEDULE')), r.problems.join('\n'))
  assert.ok(r.problems.some((p) => p.includes('x1.t27: only a timer has INTERVAL_MS')), r.problems.join('\n'))
})

test('a launchd job (the owner\'s Mac) carries exactly one of INTERVAL_MS and SCHEDULE, and is not warned for being absent from the code manifest', () => {
  const ok = build([], files('specs/crons',
    cronSrc('launchd/mac/a', { module: 'cron_x0', host: 'launchd' }),
    cronSrc('launchd/mac/b', { module: 'cron_x1', host: 'launchd' }).replace(/pub const SCHEDULE[^\n]*\n/, 'pub const INTERVAL_MS : u32 = 600000;\n'),
  ))
  assert.deepEqual(ok.problems, [])
  assert.ok(ok.crons.crons.every((c) => c.health === 'ok'), JSON.stringify(ok.crons.crons.map((c) => c.messages)))
  const both = build([], files('specs/crons', cronSrc('launchd/mac/a', { module: 'cron_x0', host: 'launchd', extra: 'pub const INTERVAL_MS : u32 = 1;' })))
  assert.ok(both.problems.some((p) => p.includes('exactly one of SCHEDULE and INTERVAL_MS')), both.problems.join('\n'))
})

test('a spec that disagrees with the schedule the code catalog read is shown, as warn', () => {
  const r = build([], files('specs/crons', cronSrc('github-actions/trinity/x', { module: 'cron_x0', schedule: '"5 5 * * *"' })))
  assert.deepEqual(r.problems, [])
  assert.equal(r.crons.crons[0].health, 'warn')
  assert.ok(r.crons.crons[0].messages.some((m) => m.includes('differs from the code catalog')))
})

test('unknown constants, wrong shapes and bad enums are problems, not silently dropped', () => {
  const r = build(
    files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0', extra: 'pub const EXTRA : str = "x";' })),
    files('specs/crons', cronSrc('github-actions/trinity/x', { module: 'cron_x0', extra: '' }).replace('"code-only"', '"telepathy"')),
  )
  assert.ok(r.problems.some((p) => p.includes('unknown constant EXTRA')))
  assert.ok(r.problems.some((p) => p.includes('CONTROL telepathy')))
})

test('the wasm typecheck is lenient, so the schema is the gate: wrong annotation, shape, length and range are all problems', () => {
  // Measured 2026-09-21 against the compiler's own build: of the five defects below it
  // reports exactly one -- the u16 overflow, by digit count. A number for a `str`, a
  // `= ;` with no initialiser at all, a [2]str holding one element and a string for a
  // `bool` all still typecheck. So the schema is still the gate; it is the gate for
  // four of five rather than five of five, and that number is asserted, not assumed.
  const src = `module skill_x0;
pub const KIND : str = 5;
pub const ID : str = "trinity/x";
pub const NAME : str = "x";
pub const REPO : str = "trinity";
pub const SOURCE : str = "SKILL.md";
pub const SUMMARY_EN : str = "en";
pub const COMMAND : str = ;
pub const SPECS : [2]str = ["a"];
pub const TAGS : [1]str = ["t"];
pub const ENABLED : bool = "yes";
pub const TIMEOUT_MIN : u16 = 70000;
`
  const a = analyze(src)
  assert.deepEqual(a.typecheck.errors, ["error: constant 'TIMEOUT_MIN' declares u16 but its value has 5 digits, which no u16 can hold"],
    'the compiler reports the range error and nothing else; if this list grows the schema gate below still stays')
  const r = build(files('specs/skills', src), [])
  const text = r.problems.join('\n')
  assert.match(text, /KIND: value is not a string literal/)
  assert.match(text, /missing COMMAND/)
  assert.match(text, /SPECS: annotated \[2\]str, holds 1 string/)
  assert.match(text, /ENABLED: value is not true\/false/)
  assert.match(text, /TIMEOUT_MIN: value 70000 is not in u16 range/)
})

test('output is deterministic: sorted keys, sorted ids, content hash independent of the clock', () => {
  const a = build(files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0' })), [])
  const b = build(files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0' })), [], { generatedAt: '2030-01-01T00:00:00.000Z' })
  assert.equal(a.skills.contentSha256, b.skills.contentSha256)
  assert.deepEqual(Object.keys(a.skills), Object.keys(a.skills).slice().sort())
  assert.deepEqual(sortKeys({ b: 1, a: [{ d: 1, c: 2 }] }), { a: [{ c: 2, d: 1 }], b: 1 })
})

test('runNowTarget: every host resolves to the panel that owns it, and a timer to nothing', () => {
  const railway = { projectId: 'P', services: [{ name: 'jobsearch-cron', serviceId: 'S' }] }
  assert.deepEqual(runNowTarget({ HOST: 'github-actions', REPO: 'trinity', SERVICE: '.github/workflows/site-live-gate.yml' }, railway), {
    kind: 'link', via: 'github-actions', url: 'https://github.com/gHashTag/trinity/actions/workflows/site-live-gate.yml',
  })
  assert.deepEqual(runNowTarget({ HOST: 'railway-cron', REPO: 'x', SERVICE: 'jobsearch-cron' }, railway), {
    kind: 'link', via: 'railway', url: 'https://railway.com/project/P/service/S',
  })
  assert.deepEqual(runNowTarget({ HOST: 'railway-cron', REPO: 'x', SERVICE: 'nobody' }, railway), { kind: 'disabled', reason: 'unknown-service' })
  assert.deepEqual(runNowTarget({ HOST: 'railway-cron', REPO: 'x', SERVICE: 'jobsearch-cron' }, null), { kind: 'disabled', reason: 'unknown-service' })
  assert.equal(runNowTarget({ HOST: 'inngest', REPO: 'x', SERVICE: 'y' }, railway).via, 'inngest')
  assert.deepEqual(runNowTarget({ HOST: 'timer', REPO: 'x', SERVICE: 'y' }, railway), { kind: 'disabled', reason: 'timer' })
})

test('Cyrillic in a spec is a problem (t27 LANG-EN), even when the compiler accepts the file', () => {
  const r = build(files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0', summary: 'Проверка' })), [])
  assert.ok(r.problems.some((p) => p.includes('Cyrillic in a .t27 spec')), r.problems.join('\n'))
  const clean = build(files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0' })), [])
  assert.ok(!clean.problems.some((p) => p.includes('Cyrillic')))
})

const i18nSrc = ({ locale = 'ru', module = 'i18n_agents_ru', fields = ['SUMMARY', 'NAME'], scope = ['specs/skills', 'specs/crons'], bundle = 'apps/website/i18n/agents.ru.json', coverageRequired = false, orphans = false, enabled = true, repo = 'trinity', extra = '' } = {}) => `module ${module};
pub const KIND : str = "i18n";
pub const LOCALE : str = ${q(locale)};
pub const SOURCE_LOCALE : str = "en";
pub const SCOPE : [${scope.length}]str = ${q(scope)};
pub const FIELDS : [${fields.length}]str = ${q(fields)};
pub const BUNDLE_REPO : str = ${q(repo)};
pub const BUNDLE_PATH : str = ${q(bundle)};
pub const BUNDLE_FORMAT : str = "json";
pub const KEY : str = "ID";
pub const FALLBACK : str = "en";
pub const COVERAGE_REQUIRED : bool = ${coverageRequired};
pub const ORPHANS_ALLOWED : bool = ${orphans};
pub const ENABLED : bool = ${enabled};
${extra}`
const i18nFiles = (...srcs) => srcs.map((text, i) => ({ path: i === 0 ? `${I18N_SPEC_DIR}/agents-ru.t27` : `${I18N_SPEC_DIR}/agents-x${i}.t27`, text }))
const ruBundle = (entries, over = {}) => ({ $spec: 'specs/i18n/agents-ru.t27', locale: 'ru', entries, ...over })
const withI18n = (i18nSpecs, bundles, over = {}) => build(
  files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0' })),
  files('specs/crons', cronSrc('github-actions/trinity/x', { module: 'cron_x0' })),
  { i18nSpecs: analyzeSpecFiles(analyze, i18nSpecs), bundles: new Map(Object.entries(bundles)), ...over },
)

test('the i18n contract spec typechecks and comes back typed', () => {
  const a = analyze(i18nSrc())
  assert.equal(verdictOf(a).typecheckOk, true)
  assert.equal(verdictOf(a).discarded, 0)
  const c = constsOf(a)
  assert.equal(c.KIND.value, 'i18n')
  assert.deepEqual(c.SCOPE.value, ['specs/skills', 'specs/crons'])
  assert.equal(c.COVERAGE_REQUIRED.value, false)
})

test('a translation reaches the catalog only through its contract spec, as {en, <locale>}, with coverage per catalog', () => {
  const r = withI18n(i18nFiles(i18nSrc()), { 'apps/website/i18n/agents.ru.json': ruBundle({ 'trinity/x': { SUMMARY: 'Проверка ✓', NAME: 'ИКС' } }) })
  assert.deepEqual(r.problems, [])
  assert.deepEqual(r.skills.skills[0].summary, { en: 'en', ru: 'Проверка ✓' })
  assert.deepEqual(r.skills.skills[0].name, { en: 'x', ru: 'ИКС' })
  assert.equal('SUMMARY_RU' in r.skills.skills[0].fields, false)
  assert.equal(r.skills.i18n.length, 1)
  assert.equal(r.skills.i18n[0].locale, 'ru')
  assert.equal(r.skills.i18n[0].spec, 'specs/i18n/agents-ru.t27')
  assert.deepEqual(r.skills.i18n[0].coverage, { n: 1, total: 1 })
  // the cron has no entry: en only, coverage 0/1 and its id listed, but no problem (COVERAGE_REQUIRED false)
  assert.deepEqual(r.crons.crons[0].summary, { en: 'en' })
  assert.deepEqual(r.crons.i18n[0].coverage, { n: 0, total: 1 })
  assert.deepEqual(r.crons.i18n[0].missing, ['github-actions/trinity/x'])
})

test('no i18n spec: en only, empty i18n list -- the site never invents a locale', () => {
  const r = build(files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0' })), [])
  assert.deepEqual(r.skills.skills[0].summary, { en: 'en' })
  assert.deepEqual(r.skills.i18n, [])
})

test('an orphan bundle entry fails when ORPHANS_ALLOWED is false, and is skipped when true', () => {
  const bundle = ruBundle({ 'trinity/x': { SUMMARY: 'ок' }, 'trinity/gone': { SUMMARY: 'нет' } })
  const strict = withI18n(i18nFiles(i18nSrc()), { 'apps/website/i18n/agents.ru.json': bundle })
  assert.equal(strict.problems.filter((p) => p.includes('matches no spec in SCOPE')).length, 1, strict.problems.join('\n'))
  const loose = withI18n(i18nFiles(i18nSrc({ orphans: true })), { 'apps/website/i18n/agents.ru.json': bundle })
  assert.deepEqual(loose.problems, [])
  assert.deepEqual(loose.skills.skills[0].summary, { en: 'en', ru: 'ок' })
})

test('COVERAGE_REQUIRED turns a missing translation from a warning into a problem', () => {
  const r = withI18n(i18nFiles(i18nSrc({ coverageRequired: true })), { 'apps/website/i18n/agents.ru.json': ruBundle({ 'trinity/x': { SUMMARY: 'ок' } }) })
  assert.ok(r.problems.some((p) => p.includes('COVERAGE_REQUIRED') && p.includes('github-actions/trinity/x')), r.problems.join('\n'))
})

test('the bundle is checked against the contract: locale, $spec, FIELDS, shapes, missing file, foreign repo, disabled', () => {
  const p = (r) => r.problems.join('\n')
  let r = withI18n(i18nFiles(i18nSrc()), { 'apps/website/i18n/agents.ru.json': ruBundle({ 'trinity/x': { SUMMARY: 'ок' } }, { locale: 'de' }) })
  assert.ok(p(r).includes('does not match the spec\'s LOCALE'), p(r))
  r = withI18n(i18nFiles(i18nSrc()), { 'apps/website/i18n/agents.ru.json': ruBundle({ 'trinity/x': { SUMMARY: 'ок' } }, { $spec: 'specs/i18n/other.t27' }) })
  assert.ok(p(r).includes('$spec is'), p(r))
  r = withI18n(i18nFiles(i18nSrc()), { 'apps/website/i18n/agents.ru.json': ruBundle({ 'trinity/x': { SUMMARY: 'ок', COMMAND: '/х' } }) })
  assert.ok(p(r).includes('not in FIELDS'), p(r))
  assert.deepEqual(r.skills.skills[0].summary, { en: 'en', ru: 'ок' }, 'the good field still lands')
  r = withI18n(i18nFiles(i18nSrc()), { 'apps/website/i18n/agents.ru.json': ruBundle({ 'trinity/x': { SUMMARY: '' } }) })
  assert.ok(p(r).includes('non-empty string'), p(r))
  r = withI18n(i18nFiles(i18nSrc()), {})
  assert.ok(p(r).includes('is missing or not JSON'), p(r))
  r = withI18n(i18nFiles(i18nSrc({ repo: 't27' })), {})
  assert.ok(p(r).includes('only a bundle in this repository'), p(r))
  r = withI18n(i18nFiles(i18nSrc({ enabled: false })), {})
  assert.deepEqual(r.problems, [])
  assert.equal(r.skills.i18n[0].enabled, false)
  assert.deepEqual(r.skills.skills[0].summary, { en: 'en' })
  r = withI18n(i18nFiles(i18nSrc({ fields: ['SUMMARY', 'COMMAND'] })), { 'apps/website/i18n/agents.ru.json': ruBundle({}) })
  assert.ok(p(r).includes('which no spec constant backs'), p(r))
})

test('locales are discovered, not enumerated: a second contract adds a second key; a duplicate LOCALE is a problem', () => {
  const de = i18nSrc({ locale: 'de', module: 'i18n_agents_x1', bundle: 'apps/website/i18n/agents.de.json' })
  const r = withI18n(i18nFiles(i18nSrc(), de), {
    'apps/website/i18n/agents.ru.json': ruBundle({ 'trinity/x': { SUMMARY: 'ок' } }),
    'apps/website/i18n/agents.de.json': { $spec: 'specs/i18n/agents-x1.t27', locale: 'de', entries: { 'trinity/x': { SUMMARY: 'gut' } } },
  })
  assert.deepEqual(r.problems, [])
  assert.deepEqual(r.skills.skills[0].summary, { en: 'en', ru: 'ок', de: 'gut' })
  assert.deepEqual(r.skills.i18n.map((l) => l.locale), ['de', 'ru'])
  const dup = withI18n(i18nFiles(i18nSrc(), i18nSrc({ module: 'i18n_agents_x1' })), { 'apps/website/i18n/agents.ru.json': ruBundle({}) })
  assert.ok(dup.problems.some((p) => p.includes('duplicate LOCALE ru')), dup.problems.join('\n'))
})

test('Cyrillic in an i18n contract spec is a problem like in any other spec', () => {
  const r = withI18n(i18nFiles(i18nSrc({ extra: '; Русский комментарий' })), { 'apps/website/i18n/agents.ru.json': ruBundle({}) })
  assert.ok(r.problems.some((p) => p.includes('Cyrillic in a .t27 spec')), r.problems.join('\n'))
})

test('checkI18n is usable on its own', () => {
  const spec = analyzeSpecFiles(analyze, i18nFiles(i18nSrc()))[0]
  const fields = Object.fromEntries(Object.entries(spec.consts).map(([k, v]) => [k, v.value]))
  const r = checkI18n({ ...spec, fields }, ruBundle({ 'a/b': { SUMMARY: 'ок' } }), new Map([['a/b', { dir: 'specs/skills' }]]))
  assert.deepEqual(r.problems, [])
  assert.deepEqual(r.entry.coverage, { n: 1, total: 1 })
  assert.deepEqual(r.translations.get('a/b'), { SUMMARY: 'ок' })
})

test('the committed contract and bundle: no problems, every vendored spec English-only, ru coverage reported', async () => {
  const { generate } = await import('./agents-from-specs.mjs')
  const r = await generate({ generatedAt: '2026-01-01T00:00:00.000Z' })
  assert.deepEqual(r.problems, [])
  const ru = r.skills.i18n.find((l) => l.locale === 'ru')
  assert.ok(ru, 'specs/i18n/agents-ru.t27 is the contract for the Russian layer')
  assert.equal(ru.spec, 'specs/i18n/agents-ru.t27')
  for (const e of [...r.skills.skills, ...r.crons.crons]) {
    assert.ok(!/[\u0400-\u04ff]/.test(JSON.stringify(e.fields)), `${e.id}: Cyrillic in spec constants`)
    if (e.summary.ru) assert.ok(/[\u0400-\u04ff]/.test(e.summary.ru), `${e.id}: summary.ru is not Russian`)
  }
})

// ---------------------------------------------------------------------------
// Layer 4: agents.
// ---------------------------------------------------------------------------
const agentSrc = (letter, { ordinal = 1, module = `agent_${letter.toLowerCase()}`, skills = [], skillsNote = 'no source binds a skill to this agent', layer = 'Archetypal', id = `t27/${letter}`, extra = '' } = {}) => `module ${module};
pub const KIND : str = "agent";
pub const ID : str = ${q(id)};
pub const LETTER : str = ${q(letter)};
pub const ORDINAL : u8 = ${ordinal};
pub const LETTER_NAME : str = "Alpha";
pub const NAME : str = "Alpha (Architecture)";
pub const DOMAIN : str = "Architecture / ADR / SOUL";
pub const ARCHETYPE : str = "Bull - leader, primary force";
pub const REGISTER : str = "R0";
pub const LAYER : str = ${q(layer)};
pub const SUMMARY_EN : str = "Architecture / ADR / SOUL. SOUL.md is the primary cause.";
pub const SOUL : str = "SOUL.md";
pub const AGENTS_DOC : str = "AGENTS.md";
pub const ALPHABET : str = "docs/agents/AGENTS_ALPHABET.md";
pub const KEY_FILES : [1]str = ["SOUL.md"];
pub const ENTRY_INVARIANT : str = "SOUL.md exists";
pub const EXIT_INVARIANT : str = "All ADRs reviewed";
pub const CLARA_ROLE : str = "";
pub const SKILLS : [${skills.length}]str = ${q(skills)};
pub const SKILLS_NOTE : str = ${q(skillsNote)};
pub const EXPERIENCE_LOG : str = ".trinity/experience/";
pub const ENABLED : bool = true;
${extra}`
const agentFiles = (...pairs) => pairs.map(([letter, text]) => ({ path: `specs/agents/${letter.toLowerCase()}.t27`, text }))
const withAgents = (agentSpecs, over = {}) => build(
  files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0' })),
  files('specs/crons', cronSrc('github-actions/trinity/x', { module: 'cron_x0', runs: ['trinity/x'] })),
  { agentSpecs: analyzeSpecFiles(analyze, agentSpecs), ...over },
)
const experience = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  sources: [{ repo: 'trinity', commit: 'b'.repeat(40), files: 2, episodes: 2, unreadable: 0 }, { repo: 't27', commit: 'c'.repeat(40), files: 1, episodes: 1, unreadable: 0 }],
  counts: { episodes: 3, attributed: 1, unattributed: 2, agentsWithEpisodes: 1, unreadableFiles: 0 },
  attribution: { fields: ['agent'], letters: ['A'], rule: 'test' },
  agents: { A: { episodes: 1, first: '2026-01-01T00:00:00.000Z', last: '2026-01-01T00:00:00.000Z', lastTask: 't', outcomes: { PASS: 1 }, lessons: ['l'], files: ['trinity:.trinity/experience/episodes/a.json'] } },
  unattributed: { episodes: 2 },
}

test('an agent spec typechecks, resolves its skills, derives its crons from RUNS and joins experience by LETTER', () => {
  const r = withAgents(agentFiles(['A', agentSrc('A', { skills: ['trinity/x'], skillsNote: 'test binding' })]), { experience })
  // Only the 27-count rule complains; the single agent itself is clean.
  assert.deepEqual(r.problems, ['specs/agents: 1 agent spec(s), the alphabet has 27'])
  const a = r.agents.agents[0]
  assert.equal(a.id, 't27/A')
  assert.equal(a.letter, 'A')
  assert.equal(a.ordinal, 1)
  assert.deepEqual(a.skills, [{ id: 'trinity/x', ok: true }])
  assert.deepEqual(a.crons, ['github-actions/trinity/x'])
  assert.equal(a.experience.episodes, 1)
  assert.deepEqual(a.experience.outcomes, { PASS: 1 })
  assert.equal(a.witness, 'spec+experience')
  assert.equal(a.health, 'ok')
  assert.deepEqual(a.messages, [])
  assert.equal(a.links.soul, `https://github.com/gHashTag/t27/blob/${'c'.repeat(40)}/SOUL.md`)
  assert.equal(a.links.agentsDoc, `https://github.com/gHashTag/t27/blob/${'c'.repeat(40)}/AGENTS.md`)
  assert.equal(a.links.alphabet, `https://github.com/gHashTag/t27/blob/${'c'.repeat(40)}/docs/agents/AGENTS_ALPHABET.md`)
  assert.equal(a.links.experienceLog, `https://github.com/gHashTag/t27/tree/${'c'.repeat(40)}/.trinity/experience`)
  assert.equal(r.agents.pin.ref, 'c'.repeat(40))
  assert.deepEqual(r.agents.ladder, { specs: null, skills: 1, crons: 1, agents: 1, tools: 0, functions: 0, providers: 0 })
  assert.equal(r.agents.counts.episodesUnattributed, 2)
  assert.equal(r.agents.counts.withCrons, 1)
})

test('no experience snapshot: zero episodes, spec-only, a plain message, links pinned to the default branch', () => {
  const r = withAgents(agentFiles(['A', agentSrc('A')]))
  const a = r.agents.agents[0]
  assert.equal(a.experience.episodes, 0)
  assert.equal(a.witness, 'spec-only')
  assert.deepEqual(a.messages, ['no attributed episodes in the experience snapshot'])
  assert.equal(r.agents.pin.ref, 'master')
  assert.equal(a.links.soul, 'https://github.com/gHashTag/t27/blob/master/SOUL.md')
  assert.equal(r.agents.counts.episodesUnattributed, null)
})

test('an unknown skill ID, an empty SKILLS without a note, a wrong ID, a bad LAYER and a duplicate ORDINAL are problems', () => {
  const r = withAgents(agentFiles(
    ['A', agentSrc('A', { skills: ['trinity/nope'], skillsNote: 'x' })],
    ['B', agentSrc('B', { ordinal: 1, skillsNote: '', layer: 'Cosmic', id: 't27/X' })],
  ))
  const p = r.problems.join('\n')
  assert.match(p, /a\.t27: SKILLS names trinity\/nope, which has no skill spec/)
  assert.match(p, /b\.t27: empty SKILLS needs a SKILLS_NOTE/)
  assert.match(p, /b\.t27: ID must be t27\/B, is "t27\/X"/)
  assert.match(p, /b\.t27: LAYER "Cosmic" is not one of Archetypal\|Spiritual\|Physical/)
  assert.match(p, /b\.t27: duplicate ORDINAL 1 \(also specs\/agents\/a\.t27\)/)
  assert.equal(r.agents.agents.find((x) => x.letter === 'A').health, 'fail')
})

test('the module and file name follow the letter; ORDINAL is a u8 in 1..27; TOOLS is optional but an empty one needs a note and a tool spec', () => {
  const r = withAgents([
    { path: 'specs/agents/a.t27', text: agentSrc('A', { module: 'agent_b' }) },
    { path: 'specs/agents/c.t27', text: agentSrc('C', { ordinal: 28 }) },
    { path: 'specs/agents/d.t27', text: agentSrc('D', { ordinal: 3, extra: 'pub const TOOLS : [0]str = [];' }) },
    { path: 'specs/agents/e.t27', text: agentSrc('E', { ordinal: 4, extra: 'pub const TOOLS : [1]str = ["tri/cell"];\npub const TOOLS_NOTE : str = "alphabet Key files";' }) },
  ], { toolSpecs: analyzeSpecFiles(analyze, toolFiles(['tri', 'cell', triToolSrc('cell', { agents: ['E'] })])) })
  const p = r.problems.join('\n')
  assert.match(p, /a\.t27: module must be agent_a, is agent_b/)
  assert.match(p, /c\.t27: ORDINAL 28 is not 1\.\.27/)
  assert.match(p, /d\.t27: empty TOOLS needs a TOOLS_NOTE/)
  assert.ok(!/e\.t27/.test(p), `e.t27 must be clean:\n${p}`)
  assert.deepEqual(r.agents.agents.find((x) => x.letter === 'E').tools, [{ id: 'tri/cell', ok: true }])
})

// ---------------------------------------------------------------------------
// Layer 5: tools -- the tri CLI and the MCP servers.
// ---------------------------------------------------------------------------
const triToolSrc = (name, { module = `tool_tri_${name}`, id = `tri/${name}`, family = 'tri-cli', actions = ['checkpoint', 'seal'], actionsAbout = ['Records a step', ''], agents = [], agentsNote = 'no source binds a letter', witness = 'source-parse', about = 'Records a checkpoint step in the active cell.', aboutSource = 'CellAction enum cli/tri/src/main.rs:448', extra = '' } = {}) => `module ${module};
pub const KIND : str = "tool";
pub const FAMILY : str = ${q(family)};
pub const ID : str = ${q(id)};
pub const COMMAND : str = ${q(`tri ${name}`)};
pub const VARIANT : str = "Commands::Cell";
pub const SOURCE : str = "cli/tri/src/main.rs";
pub const ENTRY : str = "cli/tri/src/main.rs";
pub const ABOUT : str = ${q(about)};
pub const ABOUT_SOURCE : str = ${q(aboutSource)};
pub const ACTIONS : [${actions.length}]str = ${q(actions)};
pub const ACTIONS_ABOUT : [${actionsAbout.length}]str = ${q(actionsAbout)};
pub const ARGS : [0]str = [];
pub const AGENTS : [${agents.length}]str = ${q(agents)};
pub const AGENTS_NOTE : str = ${q(agentsNote)};
pub const WHEN_TO_USE : str = ${q(about)};
pub const WITNESS : str = ${q(witness)};
pub const ENABLED : bool = true;
${extra}`
const mcpToolSrc = (name, { module = `tool_mcp_${name.replace(/-/g, '_')}`, tools = ['tri_issue'], toolsAbout = ['GitHub Issue management'], toolsInputs = ['action,title'], toolsNote = '', external = false, config = '.mcp.json', agents = [], agentsNote = 'no source binds a letter', extra = '' } = {}) => `module ${module};
pub const KIND : str = "tool";
pub const FAMILY : str = "mcp";
pub const ID : str = ${q(`mcp/${name}`)};
pub const SERVER : str = ${q(name)};
pub const SERVER_VERSION : str = "1.0.0";
pub const TRANSPORT : str = "stdio";
pub const LAUNCH : str = "npx -y ${name}";
pub const ENV : [1]str = ["TOKEN"];
pub const CONFIG : str = ${q(config)};
pub const REPO : str = "gHashTag/t27";
pub const SOURCE : str = ".mcp.json";
pub const ABOUT : str = "SSOT Integration";
pub const ABOUT_SOURCE : str = "manifest.json description";
pub const TOOLS : [${tools.length}]str = ${q(tools)};
pub const TOOLS_ABOUT : [${toolsAbout.length}]str = ${q(toolsAbout)};
pub const TOOLS_INPUTS : [${toolsInputs.length}]str = ${q(toolsInputs)};
pub const RESOURCES : [0]str = [];
pub const RESOURCES_ABOUT : [0]str = [];
pub const TOOLS_NOTE : str = ${q(toolsNote)};
pub const EXTERNAL : bool = ${external};
pub const AGENTS : [${agents.length}]str = ${q(agents)};
pub const AGENTS_NOTE : str = ${q(agentsNote)};
pub const WITNESS : str = "source-parse";
pub const ENABLED : bool = true;
${extra}`
const toolFiles = (...triples) => triples.map(([sub, base, text]) => ({ path: `specs/tools/${sub}/${base}.t27`, text }))
const withTools = (toolSpecs, agentSpecs = [], over = {}) => build(
  files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0', summary: 'Runs tri cell seal after the loop' })),
  files('specs/crons', cronSrc('github-actions/trinity/x', { module: 'cron_x0', runs: ['trinity/x'] })),
  { toolSpecs: analyzeSpecFiles(analyze, toolSpecs), agentSpecs: analyzeSpecFiles(analyze, agentSpecs), ...over },
)

const trinityToolSrc = (name, { id = `gHashTag/trinity:tri/${name}`, repo = 'gHashTag/trinity', qualifiedId = `gHashTag/trinity:tri/${name}`, schema = 2, routeKind = 'execute_map', routed = true, collidesWith = '', witness = 'registry-export', extra = '' } = {}) => `module tool_trinity_tri_${name.replace(/-/g, '_')};
pub const KIND : str = "tool";
pub const FAMILY : str = "tri-cli";
pub const ID : str = ${q(id)};
pub const REPO : str = ${q(repo)};
pub const QUALIFIED_ID : str = ${q(qualifiedId)};
pub const SCHEMA : u32 = ${schema};
pub const COMMAND : str = ${q(`tri ${name}`)};
pub const VARIANT : str = "registry command ${name} (cli_namespace core)";
pub const SOURCE : str = "src/registry/command_table.zig";
pub const ENTRY : str = "src/tri/tri_register.zig execute_map, reached through src/tri/main.zig";
pub const ROUTED : bool = ${routed};
pub const ROUTE_KIND : str = ${q(routeKind)};
pub const ROUTE_NOTE : str = "named by a live execute_map entry";
pub const ABOUT : str = "Golden ratio constant and powers";
pub const ABOUT_SOURCE : str = ".trinity/registry.json description";
pub const ACTIONS : [0]str = [];
pub const ACTIONS_ABOUT : [0]str = [];
pub const ARGS : [1]str = ["<n>: integer, optional; power"];
pub const ALIASES : [0]str = [];
pub const NAMESPACE : str = "core";
pub const MODE : str = "sync";
pub const STABILITY : str = "stable";
pub const CATEGORY : str = "math";
pub const JOB_TIMEOUT : u32 = 300;
pub const SIDE_EFFECTS : [0]str = [];
pub const CAPABILITIES : [0]str = [];
pub const MCP_ENABLED : bool = true;
pub const MCP_NAME : str = "tri_${name.replace(/-/g, '_')}";
pub const MCP_DISPLAY_NAME : str = "Phi";
pub const EXAMPLES : [1]str = ["tri ${name} 10"];
pub const EXIT_CODES : [2]str = ["0: every path that returns to main", "1: only where a handler exits"];
pub const RESULT : str = "UnifiedOutput";
pub const COLLIDES_WITH : str = ${q(collidesWith)};
pub const AGENTS : [0]str = [];
pub const AGENTS_NOTE : str = "no source binds a letter";
pub const WHEN_TO_USE : str = "Golden ratio constant and powers";
pub const WITNESS : str = ${q(witness)};
pub const WITNESS_SOURCE : str = ".trinity/registry.json at 976df517, exported by zig build export-registry";
pub const ENABLED : bool = true;
${extra}`

test('schema 2: a trinity/tri card is qualified only, joins the collision table when the t27 tri has the name, and a legacy card gains its qualified id', () => {
  const r = withTools(toolFiles(
    ['tri', 'test', triToolSrc('test', { extra: 'pub const REPO : str = "gHashTag/t27";\npub const QUALIFIED_ID : str = "gHashTag/t27:tri/test";\npub const SCHEMA : u32 = 2;' })],
    ['trinity/tri', 'test', trinityToolSrc('test', { collidesWith: 'gHashTag/t27:tri/test' })],
    ['trinity/tri', 'phi', trinityToolSrc('phi')],
  ))
  assert.deepEqual(r.problems, [])
  const ids = r.tools.tools.map((t) => t.id)
  assert.deepEqual(ids, ['gHashTag/trinity:tri/phi', 'gHashTag/trinity:tri/test', 'tri/test'])
  const legacy = r.tools.tools.find((t) => t.id === 'tri/test')
  assert.equal(legacy.qualifiedId, 'gHashTag/t27:tri/test')
  assert.equal(legacy.schema, 2)
  assert.deepEqual(r.tools.legacy, { 'tri/test': 'gHashTag/t27:tri/test' })
  const trinity = r.tools.tools.find((t) => t.id === 'gHashTag/trinity:tri/test')
  assert.equal(trinity.repo, 'gHashTag/trinity')
  assert.equal(trinity.family, 'tri-cli')
  assert.equal(trinity.command, 'tri test')
  assert.equal(trinity.witness, 'registry-export')
  assert.equal(trinity.moduleName, 'tool_trinity_tri_test')
  assert.deepEqual(trinity.routing, { routed: true, kind: 'execute_map', note: 'named by a live execute_map entry' })
  assert.equal(trinity.registry.mcpName, 'tri_test')
  assert.equal(trinity.collidesWith, 'gHashTag/t27:tri/test')
  assert.deepEqual(trinity.skills, [])
  assert.match(trinity.links.source, /^https:\/\/github\.com\/gHashTag\/trinity\/blob\/.+\/src\/registry\/command_table\.zig$/)
  assert.deepEqual(r.tools.collisions, [{ name: 'test', t27: 'gHashTag/t27:tri/test', trinity: 'gHashTag/trinity:tri/test' }])
  assert.equal(r.tools.counts.trinityTri, 2)
  assert.equal(r.tools.counts.schema2, 3)
  assert.equal(r.tools.counts.collisions, 1)
  assert.deepEqual(r.tools.groups.triByRepo, { 'gHashTag/t27': ['tri/test'], 'gHashTag/trinity': ['gHashTag/trinity:tri/phi', 'gHashTag/trinity:tri/test'], 'gHashTag/BrowserOS': [] })
  assert.equal(r.tools.counts.byWitness['registry-export'], 2)
})

test('schema 2: a trinity/tri card with a short id, a wrong repository, a wrong qualified id, an unknown route kind or a schema other than 2 is refused, and so is a legacy card whose QUALIFIED_ID is not REPO:ID', () => {
  const p = (...triples) => withTools(toolFiles(...triples)).problems.filter((x) => !x.startsWith('specs/agents:')).join('\n')
  assert.match(p(['trinity/tri', 'phi', trinityToolSrc('phi', { id: 'tri/phi' })]), /ID must be gHashTag\/trinity:tri\/phi/)
  assert.match(p(['trinity/tri', 'phi', trinityToolSrc('phi', { repo: 'gHashTag/t27', qualifiedId: 'gHashTag/t27:tri/phi', id: 'gHashTag/t27:tri/phi' })]), /REPO must be gHashTag\/trinity/)
  assert.match(p(['trinity/tri', 'phi', trinityToolSrc('phi', { qualifiedId: 'gHashTag/trinity:tri/fib' })]), /QUALIFIED_ID must be gHashTag\/trinity:tri\/phi/)
  assert.match(p(['trinity/tri', 'phi', trinityToolSrc('phi', { routeKind: 'magic' })]), /ROUTE_KIND "magic"/)
  assert.match(p(['trinity/tri', 'phi', trinityToolSrc('phi', { routed: false })]), /ROUTED must agree with ROUTE_KIND/)
  assert.match(p(['trinity/tri', 'phi', trinityToolSrc('phi', { schema: 3 })]), /SCHEMA must be 2/)
  assert.match(p(['trinity/tri', 'phi', trinityToolSrc('phi', { witness: 'guess' })]), /WITNESS "guess"/)
  assert.match(p(['tri', 'cell', triToolSrc('cell', { extra: 'pub const REPO : str = "gHashTag/t27";\npub const QUALIFIED_ID : str = "gHashTag/t27:tri/seal";\npub const SCHEMA : u32 = 2;' })]), /QUALIFIED_ID must be gHashTag\/t27:tri\/cell/)
  assert.match(p(['tri', 'cell', triToolSrc('cell', { extra: 'pub const REPO : str = "gHashTag/trinity";' })]), /REPO must be gHashTag\/t27 under tri\//)
  assert.match(p(['tri', 'cell', triToolSrc('cell', { extra: 'pub const NEW_FIELD : str = "x";' })]), /unknown constant NEW_FIELD/)
  // a legacy card without the three fields is still accepted (schema 1 until re-vendored)
  assert.equal(p(['tri', 'cell', triToolSrc('cell')]), '')
})

test('a tri tool spec typechecks into a card with its actions, its owner letters, the skills whose text names it, and pinned source links', () => {
  const r = withTools(
    toolFiles(['tri', 'cell', triToolSrc('cell', { agents: ['W'], agentsNote: 'AGENTS_ALPHABET.md:144' })]),
    agentFiles(['W', agentSrc('W', { ordinal: 23, extra: 'pub const TOOLS : [1]str = ["tri/cell"];\npub const TOOLS_NOTE : str = "alphabet Key files";' })]),
    { experience },
  )
  assert.deepEqual(r.problems, ['specs/agents: 1 agent spec(s), the alphabet has 27'])
  const t = r.tools.tools[0]
  assert.equal(t.id, 'tri/cell')
  assert.equal(t.family, 'tri-cli')
  assert.equal(t.command, 'tri cell')
  assert.deepEqual(t.actions, [{ name: 'checkpoint', about: 'Records a step' }, { name: 'seal', about: '' }])
  assert.deepEqual(t.agents, [{ letter: 'W', ok: true }])
  assert.deepEqual(t.skills, [{ id: 'trinity/x', via: ['SUMMARY_EN'] }])
  assert.equal(t.witness, 'source-parse')
  assert.equal(t.health, 'ok')
  assert.equal(t.links.source, `https://github.com/gHashTag/t27/blob/${'c'.repeat(40)}/cli/tri/src/main.rs`)
  assert.equal(t.links.pinnedAt, 'c'.repeat(40))
  assert.ok(t.searchText.includes('checkpoint') && t.searchText.includes('w'))
  assert.deepEqual(r.tools.ladder, { specs: null, skills: 1, crons: 1, agents: 1, tools: 1, functions: 0, providers: 0 })
  assert.equal(r.tools.counts.tri, 1)
  assert.equal(r.tools.counts.triActions, 2)
  assert.equal(r.tools.counts.withAgents, 1)
  // '-' is always present and empty when nothing is unbound (fa0a34451): "nothing is
  // unbound" is a fact the contract states rather than an absence its reader must infer.
  assert.deepEqual(r.tools.groups.triByAgent, { '-': [], W: ['tri/cell'] })
  // and the agent side sees the same binding
  assert.deepEqual(r.agents.agents[0].tools, [{ id: 'tri/cell', ok: true }])
})

test('an MCP server spec becomes a card with its launch line, its tools table and its config; an external server may list none', () => {
  const r = withTools(toolFiles(
    ['mcp', 'tri-ssot', mcpToolSrc('tri-ssot')],
    ['mcp', 'needle', mcpToolSrc('needle', { tools: [], toolsAbout: [], toolsInputs: [], external: true, toolsNote: 'published package, list not in repo' })],
  ))
  assert.deepEqual(r.problems, [])
  const [needle, ssot] = r.tools.tools
  assert.equal(ssot.id, 'mcp/tri-ssot')
  assert.equal(ssot.family, 'mcp')
  assert.equal(ssot.launch, 'npx -y tri-ssot')
  assert.deepEqual(ssot.tools, [{ name: 'tri_issue', about: 'GitHub Issue management', inputs: ['action', 'title'] }])
  assert.deepEqual(ssot.env, ['TOKEN'])
  assert.equal(ssot.config, '.mcp.json')
  assert.equal(ssot.external, false)
  assert.equal(needle.external, true)
  assert.deepEqual(needle.tools, [])
  assert.equal(r.tools.counts.mcp, 2)
  assert.equal(r.tools.counts.mcpTools, 1)
  assert.equal(r.tools.counts.mcpExternal, 1)
  assert.deepEqual(r.tools.groups.mcpByRepo, { 'gHashTag/t27': ['mcp/needle', 'mcp/tri-ssot'], 'gHashTag/trinity': [] })
})

test('tool problems: wrong directory family, unknown letter, empty AGENTS without a note, bad witness, empty ABOUT, an in-repo server with no tools, duplicate IDs, a one-way binding', () => {
  const r = withTools(
    toolFiles(
      ['tri', 'cell', triToolSrc('cell', { family: 'mcp', agents: ['Q9'], witness: 'guessed', about: '' })],
      ['tri', 'gen', triToolSrc('gen', { id: 'tri/cell', agents: [], agentsNote: '' })],
      ['mcp', 'local', mcpToolSrc('local', { tools: [], toolsAbout: [], toolsInputs: [], external: false, agents: ['A'] })],
    ),
    agentFiles(['A', agentSrc('A', { extra: 'pub const TOOLS : [1]str = ["tri/gen"];\npub const TOOLS_NOTE : str = "x";' })]),
  )
  const p = r.problems.join('\n')
  assert.match(p, /tri\/cell\.t27: FAMILY must be "tri-cli" under tri\/, is "mcp"/)
  assert.match(p, /tri\/cell\.t27: AGENTS names "Q9", which is not a letter of the alphabet/)
  assert.match(p, /tri\/cell\.t27: WITNESS "guessed" is not one of source-parse\|registry-export\|help-output\|runtime/)
  assert.match(p, /tri\/cell\.t27: ABOUT is empty/)
  assert.match(p, /tri\/gen\.t27: duplicate tool ID tri\/cell/)
  assert.match(p, /tri\/gen\.t27: empty AGENTS needs an AGENTS_NOTE/)
  assert.match(p, /mcp\/local\.t27: empty TOOLS needs a TOOLS_NOTE/)
  assert.match(p, /mcp\/local\.t27: an in-repo server with no tools listed/)
  // A binds tri/gen, but tri/gen's spec does not name A; local names A, but A does not name mcp/local.
  assert.match(p, /specs\/agents\/a\.t27: TOOLS names tri\/gen, which has no tool spec|specs\/agents\/a\.t27: TOOLS names tri\/gen, but specs\/tools\/tri\/gen\.t27 AGENTS does not name A/)
  assert.match(p, /mcp\/local\.t27: AGENTS names A, but specs\/agents\/a\.t27 TOOLS does not name mcp\/local/)
  assert.equal(r.tools.tools.find((t) => t.specPath.endsWith('tri/cell.t27')).health, 'fail')
})

test('a tool spec must not carry a home path: the witness is the repository, not one machine', () => {
  const r = withTools(toolFiles(['mcp', 'homey', mcpToolSrc('homey', { extra: '' }).replace('npx -y homey', '/home/someone/bin/homey')]))
  // The generator itself does not police paths; the QA contract does. Here we only pin that LAUNCH is passed through verbatim so the contract can see it.
  assert.equal(r.tools.tools[0].launch, '/home/someone/bin/homey')
})

test('tool translations come through the same i18n contract once SCOPE names specs/tools', () => {
  const spec = i18nFiles(i18nSrc({ scope: ['specs/skills', 'specs/crons', 'specs/agents', 'specs/tools'] }))
  const bundles = new Map([['apps/website/i18n/agents.ru.json', ruBundle({ 'tri/cell': { SUMMARY: 'Ячейка.' } })]])
  const r = withTools(toolFiles(['tri', 'cell', triToolSrc('cell')]), [], { i18nSpecs: analyzeSpecFiles(analyze, spec), bundles })
  assert.equal(r.tools.tools[0].summary.ru, 'Ячейка.')
  assert.equal(r.tools.i18n[0].coverage.n, 1)
})

test('the committed tool catalog: 607 specs in five directories at schema 2 (52 t27 tri, 29 Trinity registry-export tri, 220 generated Trinity tri, 295 trios tri, 11 mcp), a 63-entry legacy table, twelve collisions, every agent link resolved both ways, RU summaries for all but the generated trios and trinity/cli cards', async () => {
  const { generate } = await import('./agents-from-specs.mjs')
  const r = await generate({ generatedAt: '2026-01-01T00:00:00.000Z' })
  assert.deepEqual(r.problems, [])
  assert.equal(r.tools.tools.length, 607)
  assert.equal(r.tools.counts.tri, 596)
  assert.equal(r.tools.counts.trinityTri, 249)
  assert.equal(r.tools.tools.filter((t) => t.specPath.startsWith('specs/tools/trinity/cli/')).length, 220)
  assert.equal(r.tools.counts.triosTri, 295)
  assert.equal(r.tools.counts.mcp, 11)
  assert.equal(r.tools.counts.schema2, 607)
  assert.equal(r.tools.schema, 2)
  assert.equal(Object.keys(r.tools.legacy).length, 63)
  // The eleventh mcp card is the Queen's scheduler; its witness is the only help-output one.
  assert.equal(r.tools.counts.byWitness['help-output'], 1)
  assert.equal(byIdOf(r).get('mcp/inngest-dev')?.agents.map((a) => a.letter).join(), 'T')
  assert.deepEqual(r.tools.collisions.map((c) => c.name), ['cell', 'doctor', 'experience', 'fmt', 'fpga', 'gen', 'loop', 'pr', 'serve', 'status', 'test', 'verdict'])
  assert.equal(r.tools.counts.byWitness['registry-export'], 29)
  for (const t of r.tools.tools) assert.equal(t.qualifiedId, `${t.repo}:${t.id.includes(':') ? t.id.split(':')[1] : t.id}`, `${t.id}: qualified id`)
  const byId = new Map(r.tools.tools.map((t) => [t.id, t]))
  for (const t of r.tools.tools) {
    assert.ok(t.agents.every((a) => a.ok), `${t.id}: unresolved agent`)
    // The trios and trinity/cli cards are regenerated from their source on every bump; their RU summaries are not written yet.
    const isGenerated = t.repo === 'gHashTag/BrowserOS' || t.specPath.startsWith('specs/tools/trinity/cli/')
    if (!isGenerated) assert.ok(t.summary.ru && /[\u0400-\u04ff]/.test(t.summary.ru), `${t.id}: no Russian summary`)
    assert.ok(!/\/(home|Users)\//.test(t.launch ?? ''), `${t.id}: LAUNCH carries a home path`)
  }
  for (const a of r.agents.agents) for (const t of a.tools) assert.ok(byId.get(t.id)?.agents.some((x) => x.letter === a.letter), `${a.id} -> ${t.id} is one-way`)
})

const byIdOf = (r) => new Map(r.tools.tools.map((t) => [t.id, t]))

test('agent translations come through the same i18n contract once SCOPE names specs/agents', () => {
  const spec = i18nFiles(i18nSrc({ scope: ['specs/skills', 'specs/crons', 'specs/agents'] }))
  const bundles = new Map([['apps/website/i18n/agents.ru.json', ruBundle({ 't27/A': { SUMMARY: 'Архитектура.' } })]])
  const r = withAgents(agentFiles(['A', agentSrc('A')]), { i18nSpecs: analyzeSpecFiles(analyze, spec), bundles })
  const a = r.agents.agents[0]
  assert.equal(a.summary.ru, 'Архитектура.')
  assert.equal(r.agents.i18n[0].coverage.n, 1)
  assert.equal(r.agents.i18n[0].coverage.total, 1)
})

test('the committed agent catalog: 27 specs, every skill link resolved, experience counts add up', async () => {
  const { generate, EXPERIENCE_PATH } = await import('./agents-from-specs.mjs')
  const r = await generate({ generatedAt: '2026-01-01T00:00:00.000Z' })
  assert.deepEqual(r.problems, [])
  assert.equal(r.agents.agents.length, 27)
  assert.deepEqual(r.agents.agents.map((a) => a.letter), [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'TI'])
  for (const a of r.agents.agents) {
    assert.ok(a.skills.every((s) => s.ok), `${a.id}: unresolved skill`)
    assert.ok(a.summary.ru && /[\u0400-\u04ff]/.test(a.summary.ru), `${a.id}: no Russian summary`)
  }
  const snap = JSON.parse(readFileSync(join(SITE, EXPERIENCE_PATH), 'utf8'))
  assert.equal(r.agents.counts.episodesAttributed, snap.counts.attributed)
  assert.equal(r.agents.counts.episodesUnattributed, snap.unattributed.episodes)
  assert.equal(r.agents.counts.episodesAttributed + r.agents.counts.episodesUnattributed, snap.counts.episodes)
})

// ---- layer 5: functions ----------------------------------------------------

const fnSrc = (id, { module = `fn_${id.replace(/[^A-Za-z0-9]+/g, '_')}`, trigger = 'event', event = 'neuro/image.generate', legacyEvents = ['neuro/photo.generate'], cron = '', retries = 3, onFailure = 'admin-telegram', steps = ['get-bot', 'check-user'], sideEffects = ['paid-api', 'db-write'], probeResult = 'FAILED-at-guard', safeProbe = '{\\"telegram_id\\": \\"0\\"}', legacyId = 'neuro-image-generation', extra = '' } = {}) => `module ${module};
pub const KIND : str = "function";
pub const ID : str = ${q(id)};
pub const LEGACY_ID : str = ${q(legacyId)};
pub const NAME : str = "Neuro image";
pub const REPO : str = "999-multibots-telegraf";
pub const SERVICE : str = "src/inngest_app/functions/neuroImageGeneration.ts:25";
pub const DOMAIN : str = "neuro";
pub const TRIGGER : str = ${q(trigger)};
pub const EVENT : str = ${q(event)};
pub const LEGACY_EVENTS : [${legacyEvents.length}]str = ${q(legacyEvents)};
pub const CRON : str = ${q(cron)};
pub const TZ : str = "UTC";
pub const SUMMARY_EN : str = "Generates an image.";
pub const STEPS : [${steps.length}]str = ${q(steps)};
pub const RETRIES : u8 = ${retries};
pub const ON_FAILURE : str = ${q(onFailure)};
pub const SIDE_EFFECTS : [${sideEffects.length}]str = ${q(sideEffects)};
pub const GUARD : str = "check-user";
pub const SAFE_PROBE : str = "${safeProbe}";
pub const PROBE_RESULT : str = ${q(probeResult)};
pub const CONTROL : str = "spec+code";
pub const NOTE : str = "";
${extra}`
const fnFiles = (...pairs) => pairs.map(([id, text]) => ({ path: `specs/functions/${id}.t27`, text }))
const fnManifestEntry = (id, over = {}) => ({
  id, legacy_id: 'neuro-image-generation', domain: 'neuro', trigger: 'event', event: 'neuro/image.generate', legacy_events: ['neuro/photo.generate'], cron: '', tz: 'UTC',
  file: 'src/inngest_app/functions/neuroImageGeneration.ts', steps: ['get-bot', 'check-user'], retries: 3, on_failure: 'admin-telegram',
  side_effects: ['paid-api', 'db-write'], guard: 'check-user', safe_probe: '{"telegram_id": "0"}', probe_result: 'FAILED-at-guard', deployed_2026_09_09: true, control: 'spec+code', ...over,
})
const inngestCron = (name) => cronSrc(`inngest/999-multibots-telegraf/${name}`, { module: 'cron_x1', host: 'inngest', extra: '' }).replace('pub const NAME : str = "x";', `pub const NAME : str = ${q(name)};`).replace('pub const REPO : str = "trinity";', 'pub const REPO : str = "999-multibots-telegraf";')
const withFunctions = (functionSpecs, manifestFns, over = {}) => build(
  files('specs/skills', skillSrc('trinity/x', { module: 'skill_x0' })),
  [...files('specs/crons', cronSrc('github-actions/trinity/x', { module: 'cron_x0', runs: ['trinity/x'] })), { path: 'specs/crons/x1.t27', text: inngestCron('check-stuck-trainings') }],
  { functionSpecs: analyzeSpecFiles(analyze, functionSpecs), functionsManifest: manifestFns ? { probedAt: '2026-09-09', functions: manifestFns } : null, ...over },
)

test('a function spec typechecks, is spec+code when the manifest lists its id, and carries the deployed flag from the witness', () => {
  const r = withFunctions(fnFiles(['neuro-image-generate', fnSrc('neuro-image-generate')]), [fnManifestEntry('neuro-image-generate')])
  assert.deepEqual(r.problems, [])
  const f = r.functions.functions[0]
  assert.equal(f.id, 'neuro-image-generate')
  assert.equal(f.moduleName, 'fn_neuro_image_generate')
  assert.equal(f.typecheckOk, true)
  assert.equal(f.witness, 'spec+code')
  assert.equal(f.health, 'ok')
  assert.equal(f.code.deployed, true)
  assert.equal(f.fields.RETRIES, 3)
  assert.deepEqual(f.fields.STEPS, ['get-bot', 'check-user'])
  assert.deepEqual(f.differences, [])
  assert.equal(f.cronSpec, null)
  assert.equal(r.functions.counts.specPlusCode, 1)
  assert.equal(r.functions.counts.byTrigger.event, 1)
  assert.equal(r.functions.ladder.functions, 1)
})

test('a function the manifest does not list is spec-only (warn); a manifest id with no spec is code-only, listed not invented', () => {
  const r = withFunctions(fnFiles(['neuro-image-generate', fnSrc('neuro-image-generate')]), [fnManifestEntry('ghost-function')])
  assert.deepEqual(r.problems, [])
  const f = r.functions.functions[0]
  assert.equal(f.witness, 'spec-only')
  assert.equal(f.health, 'warn')
  assert.equal(f.code, null)
  assert.ok(f.messages.some((m) => m.includes('no function neuro-image-generate')))
  assert.deepEqual(r.functions.codeOnly, ['ghost-function'])
  assert.equal(r.functions.counts.codeOnly, 1)
  assert.equal(r.functions.counts.deployUnknown, 1)
})

test('a withdrawn function: CONTROL code-only/unregistered is in the vocabulary, and agrees with a manifest control of the same value (ok, no distance)', () => {
  // t27 specs/functions/README.md, 2026-09-17: five functions left registerFunctions.ts;
  // the spec and the bot manifest both say code-only/unregistered, so the card is ok.
  const src = fnSrc('neuro-image-generate').replace('"spec+code"', '"code-only/unregistered"')
  const r = withFunctions(fnFiles(['neuro-image-generate', src]), [{ ...fnManifestEntry('neuro-image-generate'), control: 'code-only/unregistered' }])
  assert.deepEqual(r.problems, [])
  const f = r.functions.functions[0]
  assert.equal(f.fields.CONTROL, 'code-only/unregistered')
  assert.equal(f.code.control, 'code-only/unregistered')
  assert.deepEqual(f.differences, [])
  assert.equal(f.health, 'ok')
  // and a value outside the vocabulary is still a build problem
  const bad = withFunctions(fnFiles(['neuro-image-generate', fnSrc('neuro-image-generate').replace('"spec+code"', '"withdrawn"')]), [fnManifestEntry('neuro-image-generate')])
  assert.ok(bad.problems.some((p) => p.includes('CONTROL "withdrawn"')))
})

test('no manifest at all: every function is spec-only and nothing is invented', () => {
  const r = withFunctions(fnFiles(['neuro-image-generate', fnSrc('neuro-image-generate')]), null)
  assert.deepEqual(r.problems, [])
  assert.equal(r.functions.functions[0].witness, 'spec-only')
  assert.equal(r.functions.manifest, null)
})

test('a spec that differs from what the manifest read is shown as warn with the distance named; an unread manifest field is not a difference', () => {
  const r = withFunctions(
    fnFiles(['neuro-image-generate', fnSrc('neuro-image-generate', { onFailure: 'log', retries: 4 })]),
    [fnManifestEntry('neuro-image-generate', { retries: null, steps: [], file: '', deployed_2026_09_09: false })],
  )
  assert.deepEqual(r.problems, [])
  const f = r.functions.functions[0]
  assert.equal(f.health, 'warn')
  assert.deepEqual(f.differences, [{ field: 'ON_FAILURE', spec: 'log', code: 'admin-telegram' }])
  assert.ok(f.messages.some((m) => m === 'ON_FAILURE "log" differs from the manifest ("admin-telegram")'))
  assert.ok(f.messages.some((m) => m.includes('not on the production build probed 2026-09-09')))
  assert.equal(f.code.deployed, false)
  assert.equal(f.code.retries, null)
  assert.equal(r.functions.counts.notDeployed, 1)
})

test('a cron function carries CRON not EVENT, joins its cron card by REPO + LEGACY_ID, and an event function the other way round', () => {
  const ok = withFunctions(
    fnFiles(['training-stuck-check', fnSrc('training-stuck-check', { trigger: 'cron', event: '', legacyEvents: [], cron: '*/30 * * * *', legacyId: 'check-stuck-trainings' })]),
    [fnManifestEntry('training-stuck-check', { trigger: 'cron', event: '', legacy_events: [], cron: '*/30 * * * *', legacy_id: 'check-stuck-trainings' })],
  )
  assert.deepEqual(ok.problems, [])
  assert.equal(ok.functions.functions[0].cronSpec, 'inngest/999-multibots-telegraf/check-stuck-trainings')
  assert.equal(ok.functions.counts.withCronSpec, 1)
  const unjoined = withFunctions(
    fnFiles(['x-check', fnSrc('x-check', { trigger: 'cron', event: '', legacyEvents: [], cron: '*/30 * * * *', legacyId: 'no-such-cron' })]),
    [fnManifestEntry('x-check', { trigger: 'cron', event: '', legacy_events: [], cron: '*/30 * * * *', legacy_id: 'no-such-cron' })],
  )
  assert.equal(unjoined.functions.functions[0].cronSpec, null)
  assert.ok(unjoined.functions.functions[0].messages.some((m) => m.includes('no cron card')))
  const bad = withFunctions(
    fnFiles(
      ['a-cron', fnSrc('a-cron', { trigger: 'cron', cron: '' })],
      ['b-event', fnSrc('b-event', { trigger: 'event', cron: '0 0 * * *' })],
      ['c-event', fnSrc('c-event', { trigger: 'event', event: '' })],
    ),
    [],
  )
  assert.ok(bad.problems.some((p) => p.includes('a-cron.t27: a cron function needs CRON')))
  assert.ok(bad.problems.some((p) => p.includes('a-cron.t27: a cron function has CRON, not EVENT')))
  assert.ok(bad.problems.some((p) => p.includes('a-cron.t27: a cron function has no LEGACY_EVENTS')))
  assert.ok(bad.problems.some((p) => p.includes('b-event.t27: an event function has EVENT, not CRON')))
  assert.ok(bad.problems.some((p) => p.includes('c-event.t27: an event function needs EVENT')))
})

test('function vocabularies, module, file name, KIND, duplicate ID and SAFE_PROBE JSON are gates', () => {
  const r = withFunctions(
    fnFiles(
      ['neuro-image-generate', fnSrc('neuro-image-generate', { module: 'fn_wrong', onFailure: 'shrug', probeResult: 'MAYBE', sideEffects: ['teleport'], safeProbe: 'not json' })],
      ['other-id', fnSrc('neuro-image-generate')],
      ['no-effects', fnSrc('no-effects', { sideEffects: [], trigger: 'webhook' }).replace('"function"', '"cron"')],
    ),
    [],
  )
  const p = r.problems.join('\n')
  assert.match(p, /module must be fn_neuro_image_generate, is fn_wrong/)
  assert.match(p, /ON_FAILURE "shrug" is not one of/)
  assert.match(p, /PROBE_RESULT "MAYBE" is not one of/)
  assert.match(p, /SIDE_EFFECTS names "teleport"/)
  assert.match(p, /SAFE_PROBE is neither "" nor JSON/)
  assert.match(p, /other-id\.t27: duplicate function ID neuro-image-generate/)
  assert.match(p, /other-id\.t27: ID must equal the file name \(other-id\)/)
  assert.match(p, /no-effects\.t27: KIND must be "function"/)
  assert.match(p, /no-effects\.t27: SIDE_EFFECTS must name at least one value/)
  assert.match(p, /no-effects\.t27: TRIGGER "webhook" is not one of event\|cron/)
  const missing = withFunctions([{ path: 'specs/functions/m.t27', text: fnSrc('m').replace(/pub const RETRIES[^\n]*\n/, '') }], [])
  assert.ok(missing.problems.some((x) => x.includes('m.t27') && x.includes('RETRIES')))
})

test('function translations come through the same i18n contract once SCOPE names specs/functions', () => {
  const spec = i18nFiles(i18nSrc({ scope: ['specs/skills', 'specs/crons', 'specs/functions'] }))
  const bundles = new Map([['apps/website/i18n/agents.ru.json', ruBundle({ 'neuro-image-generate': { SUMMARY: 'Генерирует изображение.', NAME: 'Нейро-картинка' } })]])
  const r = withFunctions(fnFiles(['neuro-image-generate', fnSrc('neuro-image-generate')]), [fnManifestEntry('neuro-image-generate')], { i18nSpecs: analyzeSpecFiles(analyze, spec), bundles })
  assert.deepEqual(r.problems, [])
  const f = r.functions.functions[0]
  assert.equal(f.summary.ru, 'Генерирует изображение.')
  assert.equal(f.name.ru, 'Нейро-картинка')
  assert.deepEqual(r.functions.i18n[0].coverage, { n: 1, total: 1 })
})

test('the committed function catalog: 33 specs, every one witnessed by the manifest, ten cron cards joined, four not deployed, Russian on each', async () => {
  const { generate, FUNCTIONS_MANIFEST } = await import('./agents-from-specs.mjs')
  const r = await generate({ generatedAt: '2026-01-01T00:00:00.000Z' })
  assert.deepEqual(r.problems, [])
  const fns = r.functions.functions
  assert.equal(fns.length, 33)
  assert.equal(r.functions.counts.specPlusCode, 33)
  assert.deepEqual(r.functions.codeOnly, [])
  assert.equal(r.functions.counts.byTrigger.cron, 10)
  assert.equal(r.functions.counts.withCronSpec, 10)
  assert.equal(r.functions.counts.notDeployed, 4)
  const manifest = JSON.parse(readFileSync(join(SITE, FUNCTIONS_MANIFEST), 'utf8'))
  assert.equal(manifest.functions.length, 33)
  // The five the site could not draw at all until 2026-09-22: they are what the
  // live status endpoint answers for, they carry every failed run in the week,
  // and their deployment is unread rather than false.
  for (const id of ['client-telemetry-daily', 'club-invoice-abandoned-watch', 'crm-proactive-sweep', 'robokassa-unclaimed-watch', 'ton-pending-watch']) {
    const f = fns.find((x) => x.id === id)
    assert.ok(f, `${id}: absent from the catalog, so its card cannot be drawn`)
    assert.equal(f.witness, 'spec+code')
    assert.equal(f.code.deployed, null, `${id}: deployment is unread, not false`)
    assert.ok(f.cronSpec, `${id}: no cron card joined`)
  }
  assert.equal(r.functions.counts.deployUnknown, 5)
  for (const f of fns) {
    assert.equal(f.id, f.specPath.replace(/^specs\/functions\//, '').replace(/\.t27$/, ''))
    assert.ok(f.summary.ru && /[\u0400-\u04ff]/.test(f.summary.ru), `${f.id}: no Russian summary`)
    assert.ok(f.name.ru && /[\u0400-\u04ff]/.test(f.name.ru), `${f.id}: no Russian name`)
  }
  // The one known distance between spec and manifest is kept visible, not resolved.
  const pay = fns.find((f) => f.id === 'payment-ai-server-process')
  assert.deepEqual(pay.differences, [{ field: 'ON_FAILURE', spec: 'admin-telegram', code: 'log' }])
  assert.equal(pay.health, 'warn')
})

// ---------------------------------------------------------------------------
// Recorded runs: CAST on a tri-cli card, read from public/term/<id>/ (castProblems).
// ---------------------------------------------------------------------------
const castFixture = (recordings) => {
  const root = mkdtempSync(join(tmpdir(), 'cast-'))
  for (const { id, commands, exits = commands.map(() => '0'), metaExits = exits, header = { version: 2, width: 80, height: 24, title: id, commands }, meta = {}, extraLines = [] } of recordings) {
    const dir = join(root, 'public/term', id)
    mkdirSync(dir, { recursive: true })
    // A typed "x" is an output event whose text is "x"; only the "x" event type is an exit code.
    const lines = [JSON.stringify(header), JSON.stringify([0.1, 'o', 'x']), ...exits.map((x, i) => JSON.stringify([i + 1, 'x', x])), ...extraLines]
    writeFileSync(join(dir, 'session.cast'), lines.join('\n') + '\n')
    if (meta !== null) writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, title: `title ${id}`, url: `https://t27.ai/term/${id}/`, recorded: '2026-10-02 20:34 UTC', commands, exit_codes: metaExits, ...meta }))
  }
  return readCasts(root)
}
const withCast = (cast) => `pub const CAST : str = ${q(cast)};`

test('readCasts parses the cast as JSON lines: a typed "x" is output, an "x" event is an exit code', () => {
  const casts = castFixture([{ id: 'cell-run', commands: ['tri cell seal'], exits: ['0'] }])
  const c = casts.get('cell-run')
  assert.equal(c.header.version, 2)
  assert.deepEqual(c.exits, ['0'])
  assert.equal(c.badEvents, 0)
  assert.deepEqual(castCommands(c), ['tri cell seal'])
  assert.ok(castCommandRuns('tri cell seal', 'tri cell') && castCommandRuns('tri cell', 'tri cell'))
  assert.ok(!castCommandRuns('tri cellar', 'tri cell'), 'a longer command name is another command')
})

test('a tri card with a CAST its recording backs: the catalog carries src, share page, title and the commands that ran it', () => {
  const casts = castFixture([{ id: 'cell-run', commands: ['tri gen x', 'tri cell seal --all'] }])
  const r = withTools(toolFiles(['tri', 'cell', triToolSrc('cell', { extra: withCast('term/cell-run/session.cast') })]), [], { casts })
  assert.deepEqual(r.problems, [])
  const t = r.tools.tools[0]
  assert.deepEqual(t.cast, { id: 'cell-run', src: 'term/cell-run/session.cast', share: 'https://t27.ai/term/cell-run/', title: 'title cell-run', recorded: '2026-10-02 20:34 UTC', commands: ['tri cell seal --all'] })
  assert.equal(t.witness, 'source-parse', 'a CAST does not upgrade the witness')
  assert.equal(r.tools.counts.withCast, 1)
  // No CAST: the entry says so with null, and the count stays honest.
  const bare = withTools(toolFiles(['tri', 'cell', triToolSrc('cell')]), [], { casts })
  assert.equal(bare.tools.tools[0].cast, null)
  assert.equal(bare.tools.counts.withCast, 0)
})

test('CAST problems: wrong shape, no recording, no meta.json, not v2, a non-zero exit, meta that disagrees, a recording that never ran the command', () => {
  const casts = castFixture([
    { id: 'failed', commands: ['tri cell seal'], exits: ['0', '1'] },
    { id: 'meta-failed', commands: ['tri cell seal'], metaExits: ['2'] },
    { id: 'old-format', commands: ['tri cell seal'], header: { version: 1, commands: ['tri cell seal'] } },
    { id: 'no-meta', commands: ['tri cell seal'], meta: null },
    { id: 'other-cmd', commands: ['tri gen x'] },
    { id: 'drifted', commands: ['tri cell seal'], meta: { commands: ['tri cell seal --other'] } },
    { id: 'junk-line', commands: ['tri cell seal'], extraLines: ['not json'] },
  ])
  const p = (cast) => castProblems('c.t27', { cast, witness: 'source-parse', command: 'tri cell' }, casts).join('\n')
  assert.match(p('term/cell-run/cast.json'), /CAST must be term\/<id>\/session\.cast/)
  assert.match(p('/term/x/session.cast'), /CAST must be term\/<id>\/session\.cast/)
  assert.match(p('term/missing/session.cast'), /not under public\/term\//)
  assert.match(p('term/failed/session.cast'), /records exit code\(s\) 1/)
  assert.match(p('term/meta-failed/session.cast'), /exit_codes holds 2/)
  assert.match(p('term/old-format/session.cast'), /asciicast v2 header/)
  assert.match(p('term/no-meta/session.cast'), /no readable public\/term\/no-meta\/meta\.json/)
  assert.match(p('term/other-cmd/session.cast'), /records no command that runs "tri cell"/)
  assert.match(p('term/drifted/session.cast'), /commands differ from the cast header's/)
  assert.match(p('term/junk-line/session.cast'), /1 line\(s\) that are not \[time, type, data\] events/)
  // The same rules hold inside the build, on the card.
  const r = withTools(toolFiles(['tri', 'cell', triToolSrc('cell', { extra: withCast('term/failed/session.cast') })]), [], { casts })
  assert.match(r.problems.join('\n'), /specs\/tools\/tri\/cell\.t27: CAST term\/failed\/session\.cast records exit code\(s\) 1/)
})

test('the ratchet: WITNESS "runtime" needs a CAST; an MCP card cannot carry one', () => {
  const casts = castFixture([{ id: 'cell-run', commands: ['tri cell seal'] }])
  const bare = withTools(toolFiles(['tri', 'cell', triToolSrc('cell', { witness: 'runtime' })]), [], { casts })
  assert.match(bare.problems.join('\n'), /tri\/cell\.t27: WITNESS "runtime" needs a CAST/)
  const backed = withTools(toolFiles(['tri', 'cell', triToolSrc('cell', { witness: 'runtime', extra: withCast('term/cell-run/session.cast') })]), [], { casts })
  assert.deepEqual(backed.problems, [])
  assert.equal(backed.tools.counts.byWitness.runtime, 1)
  const mcp = withTools(toolFiles(['mcp', 'needle', mcpToolSrc('needle', { extra: withCast('term/cell-run/session.cast') })]), [], { casts })
  assert.match(mcp.problems.join('\n'), /mcp\/needle\.t27: unknown constant CAST/)
  assert.equal(mcp.tools.tools[0].cast, null)
})

test('tools-from-trios-tri names the newest recording that ran the command and passes the checks, and none otherwise', async () => {
  const { castFor } = await import('./tools-from-trios-tri.mjs')
  const casts = castFixture([
    { id: 'older', commands: ['tri devkit flow'], meta: { recorded: '2026-10-01 10:00 UTC' } },
    { id: 'newer', commands: ['tri devkit impact'], meta: { recorded: '2026-10-03 04:31 UTC' } },
    { id: 'newest-failed', commands: ['tri devkit flow'], exits: ['1'], meta: { recorded: '2026-10-04 00:00 UTC' } },
  ])
  assert.equal(castFor('tri devkit', casts).id, 'newer')
  assert.equal(castFor('tri dev', casts), null, 'tri devkit is not a run of tri dev')
})

test('the committed recordings: tri x7-board and tri devkit of the trios CLI, tri misread of the t27 CLI end with their casts; no card claims runtime', async () => {
  const { generate } = await import('./agents-from-specs.mjs')
  const r = await generate({ generatedAt: '2026-01-01T00:00:00.000Z' })
  const byId = byIdOf(r)
  assert.equal(byId.get('gHashTag/BrowserOS:tri/x7-board').cast.src, 'term/x7-board/session.cast')
  assert.equal(byId.get('gHashTag/BrowserOS:tri/devkit').cast.src, 'term/devkit-flow/session.cast')
  assert.equal(byId.get('tri/misread').cast.src, 'term/t27-tri-misread/session.cast')
  // 27 trios cards from 22 recordings (tri-x7-fasm, tri-fpga-rgmii and tri-fpga-status each run two
  // commands, tri-x7-refs three) + 8 t27 ones under public/term/; check:tools-coverage says which card
  // each belongs to.
  assert.equal(r.tools.counts.withCast, 35)
  assert.equal(r.tools.counts.byWitness.runtime, 0)
})

// ---- Layer seven: providers. The fixtures are the committed cards, read from the
//      vendored corpus and bent one constant at a time, so a test cannot drift
//      from the schema catalog.t27 states.
const PROVIDER_DIR = 'public/t27/files/specs/providers'
const providerFile = (rel) => ({ path: `specs/providers/${rel}`, text: readFileSync(join(SITE, PROVIDER_DIR, rel), 'utf8') })
const providerCatalog = () => analyzeSpecFiles(analyze, [providerFile('catalog.t27')])[0]
const buildProviderCards = (cards, over = {}) => build([], [], { providerSpecs: analyzeSpecFiles(analyze, cards), providerCatalogSpec: providerCatalog(), providerDirs: ['gonka', 'trinet'], ...over })
const bend = (card, from, to) => {
  assert.ok(card.text.includes(from), `${card.path} no longer carries ${from}`)
  return { ...card, text: card.text.replace(from, to) }
}

test('a model card read from the chain and a host design: no problems, models first, the design says nothing has run', () => {
  const r = buildProviderCards([providerFile('trinet/gpu-consumer-24gb.t27'), providerFile('gonka/minimax-m2-7.t27')])
  assert.deepEqual(r.problems, [])
  const [model, host] = r.providers.providers
  assert.equal(model.id, 'gonka/minimax-m2-7', 'a model card sorts before a host class')
  assert.equal(model.family, 'model')
  assert.equal(model.status, 'serving')
  assert.equal(model.witness, 'chain-read')
  assert.equal(model.health, 'ok')
  assert.equal(model.moduleName, 'provider_gonka_minimax_m2_7')
  assert.equal(host.id, 'trinet/gpu-consumer-24gb')
  assert.equal(host.witness, 'design-only')
  assert.equal(host.health, 'warn', 'a design never reads ok')
  assert.deepEqual(host.messages, ['a design: nothing has run'])
  assert.deepEqual(r.providers.counts.byFamily, { model: 1, 'host-class': 1 })
  assert.equal(r.agents.ladder.providers, 2, 'the ladder counts the seventh layer')
  assert.deepEqual(r.providers.ladder, r.agents.ladder)
})

test('STATUS follows HOSTS for a model and MEASURED for a host; a design cannot claim a bench', () => {
  const noHosts = bend(providerFile('gonka/minimax-m2-7.t27'), 'pub const HOSTS : u32 = 26;', 'pub const HOSTS : u32 = 0;')
  let r = buildProviderCards([noHosts])
  assert.ok(r.problems.some((p) => /HOSTS 0 makes the STATUS listed, the card says serving/.test(p)), r.problems.join('\n'))
  const notRead = bend(providerFile('gonka/minimax-m2-7.t27'), 'pub const WITNESS : str = "chain-read";', 'pub const WITNESS : str = "design-only";')
  r = buildProviderCards([notRead])
  assert.ok(r.problems.some((p) => /WITNESS must be chain-read/.test(p)), r.problems.join('\n'))
  const claims = bend(providerFile('trinet/gpu-consumer-24gb.t27'), 'pub const STATUS : str = "planned";', 'pub const STATUS : str = "measured";')
  r = buildProviderCards([bend(claims, 'pub const WITNESS : str = "design-only";', 'pub const WITNESS : str = "bench-measured";')])
  assert.ok(r.problems.some((p) => /MEASURED is empty, so STATUS must be planned/.test(p)), r.problems.join('\n'))
  assert.ok(r.problems.some((p) => /MEASURED is empty, so WITNESS must be design-only/.test(p)), r.problems.join('\n'))
})

test('provider gates: ID is the path, the module follows it, a card in an unnamed directory, a duplicate and a catalog the generator does not encode', () => {
  const wrongId = bend(providerFile('gonka/minimax-m2-7.t27'), 'pub const ID : str = "gonka/minimax-m2-7";', 'pub const ID : str = "gonka/minimax";')
  let r = buildProviderCards([wrongId])
  assert.ok(r.problems.some((p) => /ID must be the path under specs\/providers without \.t27 \(gonka\/minimax-m2-7\)/.test(p)), r.problems.join('\n'))
  const wrongModule = bend(providerFile('gonka/minimax-m2-7.t27'), 'module provider_gonka_minimax_m2_7;', 'module provider_minimax;')
  r = buildProviderCards([wrongModule])
  assert.ok(r.problems.some((p) => /module must be provider_gonka_minimax_m2_7/.test(p)), r.problems.join('\n'))
  r = buildProviderCards([providerFile('gonka/minimax-m2-7.t27')], { providerDirs: ['aws', 'gonka', 'trinet'] })
  assert.ok(r.problems.some((p) => /specs\/providers\/aws\/: not a network of/.test(p)), r.problems.join('\n'))
  r = buildProviderCards([providerFile('gonka/minimax-m2-7.t27'), providerFile('gonka/minimax-m2-7.t27')])
  assert.ok(r.problems.some((p) => /duplicate provider ID gonka\/minimax-m2-7/.test(p)), r.problems.join('\n'))
  const catalog = providerFile('catalog.t27')
  const renamed = bend(catalog, 'pub const STATUSES : [4]str = ["serving", "listed", "measured", "planned"];', 'pub const STATUSES : [4]str = ["serving", "listed", "benched", "planned"];')
  r = build([], [], { providerSpecs: [], providerCatalogSpec: analyzeSpecFiles(analyze, [renamed])[0], providerDirs: [] })
  assert.ok(r.problems.some((p) => /STATUSES is .*change both together/.test(p)), r.problems.join('\n'))
  r = build([], [], { providerSpecs: analyzeSpecFiles(analyze, [providerFile('gonka/minimax-m2-7.t27')]) })
  assert.ok(r.problems.some((p) => /provider cards without specs\/providers\/catalog\.t27/.test(p)), r.problems.join('\n'))
})

test('the committed provider catalog: five Gonka models from epoch 413, two host classes, the study derived, no host address anywhere', async () => {
  const { generate } = await import('./agents-from-specs.mjs')
  const r = await generate({ generatedAt: '2026-01-01T00:00:00.000Z' })
  assert.deepEqual(r.problems, [])
  const p = r.providers
  assert.deepEqual(p.counts.byFamily, { model: 5, 'host-class': 2 })
  assert.deepEqual(p.counts.byWitness, { 'chain-read': 5, 'bench-measured': 1, 'design-only': 1 })
  assert.ok(p.providers.filter((x) => x.family === 'model').every((x) => x.fields.EPOCH === 413), 'every model card read the same epoch')
  assert.equal(p.providers.find((x) => x.id === 'trinet/fpga-xc7a200t').witness, 'bench-measured')
  assert.equal(p.study.fields.TRI_MAINNET, false, 'the study does not pretend $TRI has a mainnet')
  assert.equal(p.study.fields.GONKA_POOL_REGISTERED, false)
  assert.equal(p.study.derived.allowlistActive, false)
  assert.match(p.study.derived.subsidyPerFee, /^\d+$/, 'a ratio of wide integers stays an exact decimal string')
  assert.doesNotMatch(JSON.stringify(p), /inference_url|validator_key|\b(?:\d{1,3}\.){3}\d{1,3}\b/, 'no participant address or key on a public page')
})
