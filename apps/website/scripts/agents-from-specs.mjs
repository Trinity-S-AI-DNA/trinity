#!/usr/bin/env node
// Skills and crons, generated FROM their .t27 specs by the real compiler.
//
// The spec is the source of truth: public/t27/files/specs/skills/*.t27 and
// public/t27/files/specs/crons/*.t27 are read here, analysed with the vendored
// t27_compiler.wasm (the same bytes the browser runs), and the constants are
// taken from the AST it returns. Nothing in a .t27 file is parsed with a regex.
// The code catalogs (public/skills/manifest.json, public/crons/manifest.json)
// are the WITNESS side: a spec whose ID they also list is `spec+code`; a spec
// they do not list is `spec-only` (warn); a catalog entry with no spec is
// `code-only` and is listed, not invented.
//
//   node scripts/agents-from-specs.mjs            write both JSON files
//   node scripts/agents-from-specs.mjs --check    regenerate in memory and diff
//
// Outputs: public/skills/spec-skills.json, public/crons/spec-crons.json,
// public/agents/spec-agents.json (layer 4: specs/agents/<letter>.t27 x 27, with
// skills resolved, crons derived from RUNS, and experience joined by LETTER from
// public/agents/experience.json -- see scripts/sync-agents-experience.mjs),
// public/functions/spec-functions.json (layer 5: specs/functions/<id>.t27 x 28,
// the Inngest functions of 999-multibots-telegraf, witnessed by a vendored copy
// of the functions manifest at public/functions/manifest.json: spec+code /
// spec-only / code-only exactly like skills; a spec whose TRIGGER, EVENT, CRON,
// RETRIES, ON_FAILURE, STEPS or SIDE_EFFECTS differ from the manifest entry is
// not a failure -- the distance is written on the card and health drops to warn).
// Live run counts are NOT here: the page polls the bot's status endpoint at
// runtime and says "offline" when it cannot.
//
// Language: the specs are English-only (t27 LANG-EN; bootstrap/build.rs on
// gHashTag/t27 fails the build on any Cyrillic in specs/). A Cyrillic character
// in a spec is a problem here too, so the vendored copy can never drift from
// what the canonical repository accepts. Translations are CONNECTED THROUGH A
// SPEC: every public/t27/files/specs/i18n/*.t27 (KIND "i18n", one per locale)
// declares the locale, the spec directories in SCOPE, the FIELDS a bundle may
// translate, and the BUNDLE_PATH (repo-relative, in BUNDLE_REPO) of the JSON
// that carries the translated text. This file discovers those specs, loads each
// bundle, checks it against its contract (locale matches, entry keys within
// FIELDS, every entry ID resolves to a spec in SCOPE unless ORPHANS_ALLOWED,
// full coverage if COVERAGE_REQUIRED) and emits summary/name as {en, <locale>}
// plus an `i18n` list with the coverage per catalog. No locale is hardcoded.
//
// Compiler shapes this file depends on (measured against the vendored wasm):
//   * a string literal comes back as ExprLiteral{nodeKind:'string', value}, and
//     the value is already unquoted and unescaped. The NODE says it is a string,
//     so `: str = "8080"` is the text 8080 and never the number;
//   * an array literal comes back as ExprArrayLiteral{children:[...]}, one
//     literal node per element;
//   * both differed in the artifact vendored before #4471 -- a string kept its
//     quotes and escapes, an array arrived as an ExprIdentifier whose *name*
//     was a JSON document -- which is why `constsOf` used to JSON.parse the raw
//     text, and why it broke on the day the page got a compiler built from the
//     compiler's own source. That binary is gone; those shapes are refused;
//   * the JSON the wasm returns carries every non-ASCII byte as a separate
//     char code < 256 (UTF-8 bytes read as Latin-1). `decodeBytes` undoes that
//     only when every char code fits a byte, so already-correct text is left
//     alone. Round-trip is exact for Cyrillic and the ✓ ⟲ ◷ glyphs;
//   * `typecheck.ok` from this wasm is NECESSARY, NOT SUFFICIENT: it stays true
//     for `pub const X : str = 5;`, for `[2]str = ["a"]` and for a u16 of
//     70000 (measured, see the test file). So the gate that actually holds is
//     `checkSchema` below -- every constant's annotation, value shape, array
//     length and integer range are checked here, from the AST, and a spec is
//     only "ok" when both the compiler and the schema accept it.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const SKILL_SPEC_DIR = 'specs/skills'
export const CRON_SPEC_DIR = 'specs/crons'
const CORPUS = 'public/t27/files'
const WASM = 'public/t27/t27_compiler.wasm'
export const SKILLS_OUT = 'public/skills/spec-skills.json'
export const CRONS_OUT = 'public/crons/spec-crons.json'
export const I18N_SPEC_DIR = 'specs/i18n'
// Layer 4: the 27-agent alphabet (specs/agents/<letter>.t27), joined to the
// experience snapshot scripts/sync-agents-experience.mjs writes.
export const AGENT_SPEC_DIR = 'specs/agents'
export const AGENTS_OUT = 'public/agents/spec-agents.json'
// Layer 5: the tri CLI and the MCP servers (specs/tools/tri/*.t27, specs/tools/mcp/*.t27).
// The three corpus specs at the top of specs/tools/ are not tool cards and are not read.
export const TOOL_SPEC_DIR = 'specs/tools'
export const TOOL_SPEC_SUBDIRS = ['tri', 'mcp', 'trinity/tri', 'trinity/cli', 'trios/tri']
export const TOOLS_OUT = 'public/tools/spec-tools.json'
// The trios loop tri has ~300 commands and the Trinity tri ~250; their cards are written beside the
// catalog, one part per repository, so that no file passes the repository's 1 MB commit limit. The catalog names each part with
// the sha256 of its card list; readToolCatalog() (and loadToolSpecs() on the site) join them.
export const TOOLS_PARTS = [
  { repo: 'gHashTag/BrowserOS', path: 'public/tools/spec-tools-trios.json' },
  { repo: 'gHashTag/trinity', path: 'public/tools/spec-tools-trinity.json' },
]

export function splitToolCatalog(tools) {
  const moved = new Set(TOOLS_PARTS.map((p) => p.repo))
  const parts = TOOLS_PARTS.map(({ repo, path }) => {
    const list = tools.tools.filter((t) => t.repo === repo)
    return { path, body: { version: 1, repo, tools: list }, sha256: sha256(JSON.stringify(list)), count: list.length }
  })
  const main = { ...tools, tools: tools.tools.filter((t) => !moved.has(t.repo)), parts: parts.map(({ path, sha256: h, count }) => ({ path: path.replace(/^public\//, ''), sha256: h, count })) }
  return { main, parts }
}

// main: the parsed spec-tools.json; bodyOf(path): the parsed part named by main.parts[i].path.
export function joinToolCatalog(main, bodyOf) {
  const { parts = [], ...rest } = main
  const extra = parts.flatMap((p) => {
    const list = bodyOf(p.path)?.tools
    if (!Array.isArray(list) || list.length !== p.count || sha256(JSON.stringify(list)) !== p.sha256) throw new Error(`${p.path} does not match the part named by ${TOOLS_OUT}; run node scripts/agents-from-specs.mjs`)
    return list
  })
  return { ...rest, tools: [...rest.tools, ...extra].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) }
}

export function readToolCatalog(root = SITE) {
  const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'))
  return joinToolCatalog(read(TOOLS_OUT), (path) => read(`public/${path}`))
}
export const TOOL_FAMILIES = { tri: 'tri-cli', mcp: 'mcp', 'trinity/tri': 'tri-cli', 'trinity/cli': 'tri-cli', 'trios/tri': 'tri-cli' }
// Witnesses (specs/tools/catalog.t27): source-parse (read from the source at a named commit),
// registry-export (read from an artifact the binary itself exported and CI holds to the binary),
// help-output (diffed against the binary's --help), runtime (an invocation recorded). The
// generator never upgrades a witness.
export const TOOL_WITNESSES = ['source-parse', 'registry-export', 'help-output', 'runtime']
export const TOOL_REPOS = ['gHashTag/t27', 'gHashTag/trinity', 'gHashTag/BrowserOS']

// ---------------------------------------------------------------------------
// Recorded runs. A tri-cli card may end with `pub const CAST : str = "term/<id>/session.cast";`,
// naming a terminal recording published under public/term/<id>/ (session.cast, asciicast v2,
// plus the meta.json `tri cast` writes beside it). The rules live here only: the generator,
// scripts/tools-from-trios-tri.mjs and qa/tools-spec-contract.mjs all call castProblems().
//   * the path has that exact shape, and both files exist;
//   * the cast header is asciicast v2, and meta.json names the same id and commands;
//   * every recorded exit code is "0" (the "x" events of the cast and meta.exit_codes);
//   * at least one recorded command runs the card's COMMAND (`tri x7-board ...` for tri x7-board).
// WITNESS "runtime" needs a CAST; a CAST does not make a card "runtime" -- the recording shows the
// command ran, not that ABOUT describes it, and the generator never upgrades a witness.
// ---------------------------------------------------------------------------
export const CAST_RE = /^term\/([a-z0-9][a-z0-9-]*)\/session\.cast$/
export const TERM_DIR = 'public/term'
export const CAST_SHARE_BASE = 'https://t27.ai/term/'
// The tool subdirectories whose cards may carry a CAST (a recording shows a command line).
export const CAST_SUBDIRS = new Set(['tri', 'trinity/tri', 'trinity/cli', 'trios/tri'])

const parseJsonOr = (text, fallback) => {
  try { return JSON.parse(text) } catch { return fallback }
}

// One recording, read from public/term/<id>/. Lines are parsed as JSON, never grepped:
// a typed "x" is an output event whose text is "x", not an exit event.
export function readCast(id, root = SITE) {
  const dir = join(root, TERM_DIR, id)
  const castPath = join(dir, 'session.cast')
  const metaPath = join(dir, 'meta.json')
  const hasCast = existsSync(castPath)
  const hasMeta = existsSync(metaPath)
  const lines = hasCast ? readFileSync(castPath, 'utf8').split('\n').filter((l) => l.trim()) : []
  const header = lines.length ? parseJsonOr(lines[0], null) : null
  const events = lines.slice(1).map((l) => parseJsonOr(l, null))
  const badEvents = events.filter((e) => !Array.isArray(e) || e.length < 3).length
  const exits = events.filter((e) => Array.isArray(e) && e[1] === 'x').map((e) => String(e[2]))
  const meta = hasMeta ? parseJsonOr(readFileSync(metaPath, 'utf8'), null) : null
  return { id, hasCast, hasMeta, header, meta, exits, badEvents }
}

export function readCasts(root = SITE) {
  const dir = join(root, TERM_DIR)
  const out = new Map()
  if (!existsSync(dir)) return out
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const isRecordingDir = ent.isDirectory() && CAST_RE.test(`term/${ent.name}/session.cast`)
    if (isRecordingDir) out.set(ent.name, readCast(ent.name, root))
  }
  return out
}

// A recorded command line runs `command` when it is that command or starts with it and a space.
export const castCommandRuns = (line, command) => typeof line === 'string' && typeof command === 'string' && (line === command || line.startsWith(`${command} `))

// The recorded commands of a cast: meta.json's list, else the cast header's.
export const castCommands = (c) => (Array.isArray(c?.meta?.commands) ? c.meta.commands : Array.isArray(c?.header?.commands) ? c.header.commands : [])

// Problems with one card's CAST (null/undefined = the card has none). `casts` is readCasts().
export function castProblems(file, { cast, witness, command }, casts) {
  const problems = []
  const hasCast = cast !== undefined && cast !== null
  const isRuntime = witness === 'runtime'
  if (isRuntime && !hasCast) problems.push(`${file}: WITNESS "runtime" needs a CAST naming the recorded run`)
  if (!hasCast) return problems
  const m = CAST_RE.exec(String(cast))
  if (!m) { problems.push(`${file}: CAST must be term/<id>/session.cast, is ${JSON.stringify(cast)}`); return problems }
  const id = m[1]
  const c = casts.get(id)
  if (!c || !c.hasCast) { problems.push(`${file}: CAST names ${cast}, which is not under ${TERM_DIR}/`); return problems }
  if (!c.hasMeta || !c.meta) problems.push(`${file}: CAST ${cast} has no readable ${TERM_DIR}/${id}/meta.json`)
  const isV2 = c.header !== null && typeof c.header === 'object' && c.header.version === 2
  if (!isV2) problems.push(`${file}: CAST ${cast} does not start with an asciicast v2 header`)
  if (c.badEvents > 0) problems.push(`${file}: CAST ${cast} has ${c.badEvents} line(s) that are not [time, type, data] events`)
  const nonZero = c.exits.filter((x) => x !== '0')
  if (nonZero.length) problems.push(`${file}: CAST ${cast} records exit code(s) ${nonZero.join(', ')}; a card shows only a run that succeeded`)
  const metaExits = Array.isArray(c.meta?.exit_codes) ? c.meta.exit_codes.map(String) : []
  const metaNonZero = metaExits.filter((x) => x !== '0')
  if (metaNonZero.length) problems.push(`${file}: ${TERM_DIR}/${id}/meta.json exit_codes holds ${metaNonZero.join(', ')}`)
  const metaIdWrong = c.meta && c.meta.id !== undefined && c.meta.id !== id
  if (metaIdWrong) problems.push(`${file}: ${TERM_DIR}/${id}/meta.json id is ${JSON.stringify(c.meta.id)}`)
  const bothListCommands = Array.isArray(c.meta?.commands) && Array.isArray(c.header?.commands)
  const commandsDiffer = bothListCommands && JSON.stringify(c.meta.commands) !== JSON.stringify(c.header.commands)
  if (commandsDiffer) problems.push(`${file}: ${TERM_DIR}/${id}/meta.json commands differ from the cast header's`)
  const ran = castCommands(c).filter((line) => castCommandRuns(line, command))
  if (ran.length === 0) problems.push(`${file}: CAST ${cast} records no command that runs ${JSON.stringify(command)}`)
  return problems
}

// The catalog entry for a card's CAST: what the explorer needs to play it and say what it shows.
export function castEntry(cast, command, casts) {
  const m = CAST_RE.exec(String(cast ?? ''))
  const c = m ? casts.get(m[1]) : null
  if (!c) return null
  const id = m[1]
  const share = typeof c.meta?.url === 'string' && c.meta.url.startsWith(CAST_SHARE_BASE) ? c.meta.url : `${CAST_SHARE_BASE}${id}/`
  return {
    id,
    src: cast,
    share,
    title: c.meta?.title ?? c.header?.title ?? id,
    recorded: c.meta?.recorded ?? null,
    commands: castCommands(c).filter((line) => castCommandRuns(line, command)),
  }
}
// Schema 2 (specs/tools/catalog.t27): every card carries REPO, QUALIFIED_ID (<owner>/<repo>:<family>/<name>)
// and SCHEMA = 2; a legacy card keeps its short ID, a card under trinity/tri has ID = QUALIFIED_ID.
export const TOOL_SCHEMA = 2
export const TOOL_REPO_OF_SUBDIR = { tri: 'gHashTag/t27', 'trinity/tri': 'gHashTag/trinity', 'trinity/cli': 'gHashTag/trinity', 'trios/tri': 'gHashTag/BrowserOS' }
// Subdirectories whose cards carry the repository-qualified ID only (another program also called tri).
const QUALIFIED_ONLY = new Set(['trinity/tri', 'trinity/cli', 'trios/tri'])
export const CATALOG_SPEC_DIRS = new Set([SKILL_SPEC_DIR, CRON_SPEC_DIR, AGENT_SPEC_DIR, TOOL_SPEC_DIR])
export const EXPERIENCE_PATH = 'public/agents/experience.json'
export const AGENT_LAYERS = ['Archetypal', 'Spiritual', 'Physical']
export const AGENT_COUNT = 27
// Layer 5: the Inngest functions of 999-multibots-telegraf (specs/functions/<id>.t27),
// witnessed by the vendored functions manifest.
export const FUNCTION_SPEC_DIR = 'specs/functions'
export const FUNCTIONS_OUT = 'public/functions/spec-functions.json'
export const FUNCTIONS_MANIFEST = 'public/functions/manifest.json'
export const FN_TRIGGERS = ['event', 'cron']
export const FN_ON_FAILURE = ['admin-telegram', 'log', 'refund+notify']
export const FN_SIDE_EFFECTS = ['charges-balance', 'paid-api', 'messages-user', 'messages-owners', 'messages-admin', 'db-write', 'external-webhook', 'none']
export const FN_PROBE_RESULTS = ['COMPLETED', 'FAILED-at-guard', 'skipped', 'not-deployed']
// 'code-only/unregistered' (t27 specs/functions/README.md, 2026-09-17): the code
// exists in the bot tree but is withdrawn from registerFunctions.ts and not served;
// the spec's NOTE says why. The bot manifest uses the same value for `control`.
export const FN_CONTROLS = ['spec+code', 'spec-only', 'code-only', 'code-only/unregistered']
// Layer 7: providers (specs/providers) -- the models a network sells and the hardware a
// person could rent out for $TRI. catalog.t27 is the schema: the field lists, the
// vocabularies and the network directories are read from it, not kept here.
// tri_gnk_pair.t27 is the study the page shows beside the cards; it is not a card.
export const PROVIDER_SPEC_DIR = 'specs/providers'
export const PROVIDER_CATALOG_SPEC = `${PROVIDER_SPEC_DIR}/catalog.t27`
export const PROVIDER_STUDY_SPEC = `${PROVIDER_SPEC_DIR}/tri_gnk_pair.t27`
export const PROVIDERS_OUT = 'public/providers/spec-providers.json'
// The shape of every field catalog.t27 names. The names are the catalog's (COMMON_FIELDS,
// MODEL_FIELDS, HOST_FIELDS); this table says only what each one holds, and the build
// fails when its keys and the catalog's lists differ.
export const PROVIDER_FIELD_SHAPES = {
  KIND: 'str', ID: 'str', FAMILY: 'str', NETWORK: 'str', NAME: 'str', SUMMARY_EN: 'str', STATUS: 'str', WITNESS: 'str', CHECKED: 'str', SOURCES: 'arr', NOTE: 'str', ENABLED: 'bool',
  MODEL_ID: 'str', HF_COMMIT: 'str', CONTEXT_TOKENS: 'u32', VRAM_GB: 'u32', THROUGHPUT_PER_NONCE: 'u32', VALIDATION_PERMILLE: 'u16', POC_MODEL: 'bool', POC_WEIGHT_SCALE_E4: 'u32', HOSTS: 'u32', EPOCH: 'u32', UNITS_OF_COMPUTE_PER_TOKEN: 'u32', PRICE_PER_TOKEN: 'u32', PRICE_UNIT: 'str', API: 'str', CALL: 'str', VLLM_ARGS: 'arr',
  DEVICE: 'str', MEMORY_GB: 'u32', UNITS_PER_GONKA_NODE: 'u32', PROOF: 'str', REWARD: 'str', STAKE: 'str', GONKA_PARALLEL: 'str', MEASURED: 'arr', GAPS: 'arr', TOKEN: 'str',
}
// Which of the catalog's field lists each family adds to COMMON_FIELDS.
export const PROVIDER_FAMILY_FIELDS = { model: 'MODEL_FIELDS', 'host-class': 'HOST_FIELDS' }
// The words of catalog.t27 whose meaning buildProviders encodes (STATUS_RULE, WITNESS_RULE,
// CALL_RULE). They are read from the catalog and compared with these; when the catalog's
// vocabulary changes, the build stops instead of misreading a card.
export const PROVIDER_WORDS = { FAMILIES: ['model', 'host-class'], STATUSES: ['serving', 'listed', 'measured', 'planned'], WITNESSES: ['chain-read', 'bench-measured', 'design-only'], CALLS: ['needs-key', 'none'] }
// The study fields the page renders; every other constant of the study passes through as declared.
const PROVIDER_STUDY_REQUIRED = { KIND: 'str', ID: 'str', CHECKED: 'str', ROUTES: 'arr', CONFLICT: 'str', PARALLELS: 'arr', TRI_CHAINS: 'arr', TRI_MAINNET: 'bool', GONKA_POOL_REGISTERED: 'bool', BRIDGE_CHAINS: 'arr', GONKA_APPROVED_FOR_TRADE: 'arr', IBC_CHANNELS: 'arr', WGNK_ETHEREUM: 'str', WGNK_USDT_UNISWAP_V3_POOL: 'str', GNK_DECIMALS: 'u8' }
export const T27_REPO_URL = 'https://github.com/gHashTag/t27'
// Repo root of gHashTag/trinity (BUNDLE_PATH is repo-relative).
export const REPO_ROOT = resolve(SITE, '..', '..')
export const VERSION = 1

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

// ---------------------------------------------------------------------------
// The compiler.
// ---------------------------------------------------------------------------
export async function loadCompiler(wasmBytes) {
  const { instance } = await WebAssembly.instantiate(wasmBytes, {})
  const w = instance.exports
  return function analyze(source) {
    const bytes = new TextEncoder().encode(source)
    const inPtr = w.t27_alloc(bytes.length)
    new Uint8Array(w.memory.buffer, inPtr, bytes.length).set(bytes)
    const outPtr = w.t27_analyze(inPtr, bytes.length)
    const len = new DataView(w.memory.buffer).getUint32(outPtr, true)
    const json = new TextDecoder().decode(new Uint8Array(w.memory.buffer, outPtr + 4, len))
    w.t27_free(outPtr, 4 + len)
    return JSON.parse(json)
  }
}

export function decodeBytes(text) {
  if (typeof text !== 'string') return text
  let allBytes = true
  for (const ch of text) {
    if (ch.charCodeAt(0) > 255) { allBytes = false; break }
  }
  if (!allBytes) return text
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(text, (c) => c.charCodeAt(0)))
  } catch {
    return text
  }
}

/**
 * One literal of a `const` initialiser, as the compiler describes it.
 *
 * A string is identified by its node — `nodeKind: "string"` — and never by what
 * its text looks like, so `pub const PORT : str = "8080"` is the string `8080`
 * and not the number. Its `value` arrives already unquoted and unescaped.
 */
export function literalValue(expr, name = 'literal') {
  if (expr.kind === 'ExprArrayLiteral') return (expr.children ?? []).map((el) => literalValue(el, name))
  // A negative number inside an array literal arrives as unary minus over a number literal
  // (`[-1, 5]`), while a scalar `-7` arrives as the literal "-7". Only that one shape is read;
  // a minus over anything else is still refused.
  if (expr.kind === 'ExprUnary' && expr.op === '-' && expr.children?.length === 1) {
    const v = literalValue(expr.children[0], name)
    if (typeof v !== 'number' || expr.children[0].nodeKind === 'string') throw new Error(`${name}: minus over a non-number`)
    return -v
  }
  if (expr.kind !== 'ExprLiteral') throw new Error(`${name}: unsupported expression kind ${expr.kind}`)
  const raw = decodeBytes(expr.value ?? '')
  // `pub const ENTRY : str = "";` arrives with no `value` key at all -- the
  // field is omitted when the text is empty. `nodeKind` is what carries the
  // type, so for a string absent text is empty text. For anything else a node
  // with no value is a node this function cannot read, and says so.
  if (expr.nodeKind === 'string') return raw
  if (expr.value === undefined) throw new Error(`${name}: literal carries no value`)
  if (raw === 'true') return true
  if (raw === 'false') return false
  // Integers and decimal floats, with an optional exponent (`1e-8`, `-1.0e30`: the
  // epsilons of t27 specs/ml, which the course 10 widgets run). Hex, binary
  // expressions, struct literals and calls appear elsewhere in the corpus and are
  // deliberately still refused: this function reads declarations, it does not
  // evaluate them.
  if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(raw)) return Number(raw)
  throw new Error(`${name}: unsupported literal ${JSON.stringify(raw)}`)
}

/**
 * Every `pub const` of the module, from the AST, as `{ name: { type, value } }`.
 *
 * The artifact this site vendored before #4471 described all three literal
 * shapes differently: a string kept its quotes and backslash escapes, an array
 * arrived as an *identifier* whose `name` was a JSON document, and nothing
 * marked a string as one. `JSON.parse` on the raw text was how this function
 * coped with that, and it is why the function broke on the day the page finally
 * got a compiler built from the compiler's own source. Those shapes are not
 * accepted here: that binary was built from no committed source, and it is gone
 * from the tree as of this change. A spec that does not match what the compiler
 * emits should fail loudly rather than be guessed at.
 */
export function constsOf(analysis) {
  const out = {}
  const decls = (analysis.ast?.children ?? []).filter((n) => n.kind === 'ConstDecl')
  for (const d of decls) {
    const expr = d.children?.[0]
    if (!expr) continue
    if (d.name in out) throw new Error(`duplicate constant ${d.name}`)
    out[d.name] = { type: d.type, value: literalValue(expr, d.name), pub: d.pub === true }
  }
  return out
}

/**
 * The compiler's own words for why a file is not clean.
 *
 * A verdict says `hirOk: false`; this says `parse error in fn 'x' near line 127:
 * Unexpected token in expression: Semicolon (';')`. The loaders below used to
 * print the verdict and then a dozen `missing KIND` lines -- true, and never the
 * reason. The message is the compiler's, quoted, not a guess at what it meant.
 */
export function compilerErrors(analysis) {
  const out = []
  if (analysis.astError) out.push(analysis.astError)
  if (analysis.hir?.ok === false && analysis.hir.error) out.push(analysis.hir.error)
  for (const e of analysis.typecheck?.errors ?? []) out.push(e)
  // A parse failure reaches both `astError` and `hir.error` with the same text, so the
  // unfiltered list prints it twice and reads like two problems. One fact, said once.
  return [...new Set(out)]
}

export function verdictOf(analysis) {
  const discarded = (analysis.discarded?.length ?? 0) + (analysis.lexerDiscarded?.length ?? 0) + (analysis.swallowed?.length ?? 0)
  return {
    typecheckOk: analysis.typecheck?.ok === true,
    errors: analysis.typecheck?.errorCount ?? (analysis.typecheck?.errors?.length ?? 0),
    discarded,
    hirOk: analysis.hir?.ok !== false,
  }
}

// ---------------------------------------------------------------------------
// Schema.
// ---------------------------------------------------------------------------
// Shapes: 'str' | 'bool' | 'arr' (of str) | 'u16' | 'u32'.
const SKILL_REQUIRED = {
  KIND: 'str', ID: 'str', NAME: 'str', REPO: 'str', SOURCE: 'str', SUMMARY_EN: 'str',
  COMMAND: 'str', SPECS: 'arr', TAGS: 'arr', ENABLED: 'bool', TIMEOUT_MIN: 'u16',
}
const CRON_REQUIRED = {
  KIND: 'str', ID: 'str', NAME: 'str', HOST: 'str', REPO: 'str', SERVICE: 'str', SUMMARY_EN: 'str',
  TZ: 'str', RUNS: 'arr', RUNS_NOTE: 'str', ENABLED: 'bool', ON_FAILURE: 'str', CONTROL: 'str',
}
const CRON_OPTIONAL = { SCHEDULE: 'str', SCHEDULE_NOTE: 'str', INTERVAL_MS: 'u32', NOTE: 'str' }
const AGENT_REQUIRED = {
  KIND: 'str', ID: 'str', LETTER: 'str', ORDINAL: 'u8', LETTER_NAME: 'str', NAME: 'str', DOMAIN: 'str', ARCHETYPE: 'str',
  REGISTER: 'str', LAYER: 'str', SUMMARY_EN: 'str', SOUL: 'str', AGENTS_DOC: 'str', ALPHABET: 'str', KEY_FILES: 'arr',
  ENTRY_INVARIANT: 'str', EXIT_INVARIANT: 'str', CLARA_ROLE: 'str', SKILLS: 'arr', SKILLS_NOTE: 'str',
  EXPERIENCE_LOG: 'str', ENABLED: 'bool',
}
// TOOLS arrived with layer 5 (specs/tools); an agent spec written before it may still omit it.
const AGENT_OPTIONAL = { TOOLS: 'arr', TOOLS_NOTE: 'str' }
const FUNCTION_REQUIRED = {
  KIND: 'str', ID: 'str', LEGACY_ID: 'str', NAME: 'str', REPO: 'str', SERVICE: 'str', DOMAIN: 'str', TRIGGER: 'str',
  EVENT: 'str', LEGACY_EVENTS: 'arr', CRON: 'str', TZ: 'str', SUMMARY_EN: 'str', STEPS: 'arr', RETRIES: 'u8',
  ON_FAILURE: 'str', SIDE_EFFECTS: 'arr', GUARD: 'str', SAFE_PROBE: 'str', PROBE_RESULT: 'str', CONTROL: 'str', NOTE: 'str',
}
const TOOL_TRI_REQUIRED = {
  KIND: 'str', FAMILY: 'str', ID: 'str', COMMAND: 'str', VARIANT: 'str', SOURCE: 'str', ENTRY: 'str', ABOUT: 'str', ABOUT_SOURCE: 'str',
  ACTIONS: 'arr', ACTIONS_ABOUT: 'arr', ARGS: 'arr', AGENTS: 'arr', AGENTS_NOTE: 'str', WHEN_TO_USE: 'str', WITNESS: 'str', ENABLED: 'bool',
}
const TOOL_MCP_REQUIRED = {
  KIND: 'str', FAMILY: 'str', ID: 'str', SERVER: 'str', SERVER_VERSION: 'str', TRANSPORT: 'str', LAUNCH: 'str', ENV: 'arr', CONFIG: 'str',
  REPO: 'str', SOURCE: 'str', ABOUT: 'str', ABOUT_SOURCE: 'str', TOOLS: 'arr', TOOLS_ABOUT: 'arr', TOOLS_INPUTS: 'arr', RESOURCES: 'arr',
  RESOURCES_ABOUT: 'arr', TOOLS_NOTE: 'str', EXTERNAL: 'bool', AGENTS: 'arr', AGENTS_NOTE: 'str', WITNESS: 'str', ENABLED: 'bool',
}
// Schema 2 fields a legacy card may carry (REPO is already required on mcp cards).
const TOOL_TRI_SCHEMA2_OPTIONAL = { REPO: 'str', QUALIFIED_ID: 'str', SCHEMA: 'u32' }
const TOOL_MCP_SCHEMA2_OPTIONAL = { QUALIFIED_ID: 'str', SCHEMA: 'u32' }
// A card of the gHashTag/trinity tri (specs/tools/trinity/tri/<command>.t27), derived from the
// registry that binary exports (.trinity/registry.json); every field required.
const TOOL_TRINITY_TRI_REQUIRED = {
  ...TOOL_TRI_REQUIRED, REPO: 'str', QUALIFIED_ID: 'str', SCHEMA: 'u32', ROUTED: 'bool', ROUTE_KIND: 'str', ROUTE_NOTE: 'str',
  ALIASES: 'arr', NAMESPACE: 'str', MODE: 'str', STABILITY: 'str', CATEGORY: 'str', JOB_TIMEOUT: 'u32', SIDE_EFFECTS: 'arr', CAPABILITIES: 'arr',
  MCP_ENABLED: 'bool', MCP_NAME: 'str', MCP_DISPLAY_NAME: 'str', EXAMPLES: 'arr', EXIT_CODES: 'arr', RESULT: 'str', COLLIDES_WITH: 'str', WITNESS_SOURCE: 'str',
}
// A card of the trios loop CLI (specs/tools/trios/tri/<command>.t27), written by
// scripts/tools-from-trios-tri.mjs from gHashTag/BrowserOS:trios/bin/tri at SOURCE_COMMIT.
const TOOL_TRIOS_TRI_REQUIRED = {
  ...TOOL_TRI_REQUIRED, REPO: 'str', QUALIFIED_ID: 'str', SCHEMA: 'u32', SOURCE_COMMIT: 'str', ROUTED: 'bool', DISPATCH: 'str',
  DOCUMENTED: 'bool', HELP_LINE: 'str', CATEGORY: 'str', WITNESS_SOURCE: 'str',
}
// A card of a gHashTag/trinity tri command the registry export does not cover (specs/tools/trinity/cli/<command>.t27),
// written by scripts/tools-from-trinity-tri.mjs from qa/tri-commands/trinity.json at SOURCE_COMMIT.
const TOOL_TRINITY_CLI_REQUIRED = {
  ...TOOL_TRI_REQUIRED, REPO: 'str', QUALIFIED_ID: 'str', SCHEMA: 'u32', SOURCE_COMMIT: 'str', ROUTED: 'bool', ROUTE_KIND: 'str', ROUTE_NOTE: 'str',
  IN_REGISTRY: 'bool', ALIASES: 'arr', COLLIDES_WITH: 'str', WITNESS_SOURCE: 'str',
}
// A tri-cli card may name its recorded run (see castProblems); an mcp card may not.
const TOOL_CAST_OPTIONAL = { CAST: 'str' }
const TOOL_ROUTE_KINDS = ['execute_map', 'parse_command', 'main_chain', 'cell_map', 'namespace', 'none']
const INT_MAX = { u8: 0xff, u16: 0xffff, u32: 0xffffffff, i8: 0x7f, i16: 0x7fff, i32: 0x7fffffff }
const INT_MIN = { u8: 0, u16: 0, u32: 0, i8: -0x80, i16: -0x8000, i32: -0x80000000 }
export const CYRILLIC = /[\u0400-\u04ff]/

// Translation contracts (specs/i18n/agents-<locale>.t27).
const I18N_REQUIRED = {
  KIND: 'str', LOCALE: 'str', SOURCE_LOCALE: 'str', SCOPE: 'arr', FIELDS: 'arr', BUNDLE_REPO: 'str', BUNDLE_PATH: 'str',
  BUNDLE_FORMAT: 'str', KEY: 'str', FALLBACK: 'str', COVERAGE_REQUIRED: 'bool', ORPHANS_ALLOWED: 'bool', ENABLED: 'bool',
}
// Bundle field -> spec constant it translates. Tool specs have no SUMMARY_EN; for them
// SUMMARY translates ABOUT (see summarySourceOf), and NAME is not used.
export const I18N_FIELD_SOURCE = { SUMMARY: 'SUMMARY_EN', NAME: 'NAME' }
export const summarySourceOf = (fields) => (fields.KIND === 'tool' ? fields.ABOUT : fields.SUMMARY_EN)
export const LOCALE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

/**
 * Check one i18n spec + its bundle against the contract the spec declares.
 * `specsById` maps a spec ID to `{dir, fields}` for every skill and cron spec.
 * Returns `{entry, translations, problems}` where `translations` is
 * `Map<ID, {FIELD: text}>` (empty when disabled or broken) and `entry` is what
 * goes into the catalog's `i18n` list.
 */
export function checkI18n(spec, bundle, specsById) {
  const problems = []
  const file = spec.path
  const f = spec.fields
  if (!spec.verdict.typecheckOk || spec.verdict.discarded > 0 || !spec.verdict.hirOk) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(spec.verdict)})`)
  problems.push(...checkSchema(spec.consts, I18N_REQUIRED, {}, file))
  if (f.KIND !== 'i18n') problems.push(`${file}: KIND must be "i18n"`)
  if (typeof f.LOCALE === 'string' && !LOCALE_RE.test(f.LOCALE)) problems.push(`${file}: LOCALE ${JSON.stringify(f.LOCALE)} is not a BCP-47-shaped tag`)
  if (f.SOURCE_LOCALE !== 'en') problems.push(`${file}: SOURCE_LOCALE must be "en" (the specs are English-only)`)
  if (f.FALLBACK !== 'en') problems.push(`${file}: FALLBACK must be "en"`)
  if (f.KEY !== 'ID') problems.push(`${file}: KEY must be "ID" (bundles are keyed by the spec ID)`)
  if (f.BUNDLE_FORMAT !== 'json') problems.push(`${file}: BUNDLE_FORMAT ${JSON.stringify(f.BUNDLE_FORMAT)} is not supported (json)`)
  const expectModule = `i18n_${file.replace(/^specs\/i18n\//, '').replace(/\.t27$/, '').replace(/[^A-Za-z0-9]+/g, '_')}`
  if (spec.moduleName && spec.moduleName !== expectModule) problems.push(`${file}: module must be ${expectModule}, is ${spec.moduleName}`)
  const fields = Array.isArray(f.FIELDS) ? f.FIELDS : []
  for (const name of fields) if (!(name in I18N_FIELD_SOURCE)) problems.push(`${file}: FIELDS names ${JSON.stringify(name)}, which no spec constant backs (${Object.keys(I18N_FIELD_SOURCE).join(', ')})`)
  const scope = new Set(Array.isArray(f.SCOPE) ? f.SCOPE : [])
  const inScope = [...specsById.entries()].filter(([, v]) => scope.has(v.dir))
  const entry = {
    locale: f.LOCALE, spec: file, sha256: spec.sha256, bundle: f.BUNDLE_REPO === 'trinity' ? f.BUNDLE_PATH : `${f.BUNDLE_REPO}:${f.BUNDLE_PATH}`,
    enabled: f.ENABLED === true, fields, scope: [...scope], coverage: { n: 0, total: inScope.length }, missing: [],
  }
  const translations = new Map()
  if (f.ENABLED !== true) return { entry, translations, problems }
  if (f.BUNDLE_REPO !== 'trinity') { problems.push(`${file}: BUNDLE_REPO ${JSON.stringify(f.BUNDLE_REPO)} -- only a bundle in this repository can be loaded at build time`); return { entry, translations, problems } }
  if (!bundle) { problems.push(`${file}: bundle ${f.BUNDLE_PATH} is missing or not JSON`); return { entry, translations, problems } }
  if (bundle.$spec !== file) problems.push(`${f.BUNDLE_PATH}: $spec is ${JSON.stringify(bundle.$spec)}, the contract is ${file}`)
  if (bundle.locale !== f.LOCALE) problems.push(`${f.BUNDLE_PATH}: locale ${JSON.stringify(bundle.locale)} does not match the spec's LOCALE ${JSON.stringify(f.LOCALE)}`)
  const entries = bundle.entries && typeof bundle.entries === 'object' && !Array.isArray(bundle.entries) ? bundle.entries : null
  if (!entries) { problems.push(`${f.BUNDLE_PATH}: entries must be an object keyed by spec ID`); return { entry, translations, problems } }
  for (const [id, value] of Object.entries(entries)) {
    const target = specsById.get(id)
    if (!target || !scope.has(target.dir)) {
      if (f.ORPHANS_ALLOWED !== true) problems.push(`${f.BUNDLE_PATH}: entry ${JSON.stringify(id)} matches no spec in SCOPE (${[...scope].join(', ')}) and ORPHANS_ALLOWED is false`)
      continue
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) { problems.push(`${f.BUNDLE_PATH}: entry ${JSON.stringify(id)} must be an object of FIELDS`); continue }
    const clean = {}
    for (const [k, v] of Object.entries(value)) {
      if (!fields.includes(k)) { problems.push(`${f.BUNDLE_PATH}: entry ${JSON.stringify(id)} carries ${JSON.stringify(k)}, which is not in FIELDS (${fields.join(', ')})`); continue }
      if (typeof v !== 'string' || !v.trim()) { problems.push(`${f.BUNDLE_PATH}: entry ${JSON.stringify(id)}.${k} must be a non-empty string`); continue }
      clean[k] = v
    }
    if (Object.keys(clean).length) translations.set(id, clean)
  }
  for (const [id] of inScope) if (!translations.has(id)) entry.missing.push(id)
  entry.missing.sort()
  entry.coverage.n = inScope.length - entry.missing.length
  if (f.COVERAGE_REQUIRED === true && entry.missing.length) problems.push(`${file}: COVERAGE_REQUIRED and ${entry.missing.length} spec(s) have no ${f.LOCALE} entry in ${f.BUNDLE_PATH}: ${entry.missing.slice(0, 5).join(', ')}${entry.missing.length > 5 ? ', ...' : ''}`)
  return { entry, translations, problems }
}

/** `{en, <locale>...}` for one field of one spec from every loaded locale. */
export function localized(en, id, field, locales) {
  const out = { en }
  for (const { locale, translations } of locales) {
    const t = translations.get(id)?.[field]
    if (t) out[locale] = t
  }
  return out
}
export const HOSTS = ['github-actions', 'inngest', 'railway-cron', 'timer', 'launchd']
export const CONTROLS = ['github-actions-dispatch', 'railway-dashboard', 'inngest-dashboard', 'code-only']
export const ON_FAILURE = ['issue', 'log', 'unknown']

/** Inngest's own dashboard on Railway; the only outside handle an Inngest function has. */
export const INNGEST_DASHBOARD_URL = 'https://inngestinngest-production-6a21.up.railway.app'

/**
 * Where "run now" goes for a job, per host. Resolved at build time so the page
 * never has to know Railway's ids: they live in scripts/railway-services.json,
 * beside the service list the crons manifest is already built from. A timer
 * inside a process has no outside handle, and the strip says so.
 */
export function runNowTarget(fields, railway) {
  switch (fields.HOST) {
    case 'github-actions': {
      const file = fields.SERVICE.split('/').pop() ?? fields.SERVICE
      return { kind: 'link', via: 'github-actions', url: `https://github.com/gHashTag/${fields.REPO}/actions/workflows/${file}` }
    }
    case 'railway-cron': {
      const svc = (railway?.services ?? []).find((s) => s.name === fields.SERVICE)
      if (!railway?.projectId || !svc?.serviceId) return { kind: 'disabled', reason: 'unknown-service' }
      return { kind: 'link', via: 'railway', url: `https://railway.com/project/${railway.projectId}/service/${svc.serviceId}` }
    }
    case 'inngest':
      return { kind: 'link', via: 'inngest', url: INNGEST_DASHBOARD_URL }
    case 'launchd':
      return { kind: 'disabled', reason: 'launchd' }
    default:
      return { kind: 'disabled', reason: 'timer' }
  }
}

/** Annotation + value agree with the shape; null when they do, a reason when they do not. */
export function shapeProblem(decl, shape) {
  const { type, value } = decl
  switch (shape) {
    case 'str':
      if (type !== 'str') return `annotated ${type}, must be str`
      if (typeof value !== 'string') return 'value is not a string literal'
      return null
    case 'bool':
      if (type !== 'bool') return `annotated ${type}, must be bool`
      if (typeof value !== 'boolean') return 'value is not true/false'
      return null
    case 'u8':
    case 'u16':
    case 'u32':
    case 'i8':
    case 'i16':
    case 'i32':
      if (type !== shape) return `annotated ${type}, must be ${shape}`
      if (!Number.isInteger(value) || value < INT_MIN[shape] || value > INT_MAX[shape]) return `value ${value} is not in ${shape} range`
      return null
    case 'arr': {
      if (!Array.isArray(value) || !value.every((x) => typeof x === 'string')) return 'value is not an array of strings'
      if (type !== `[${value.length}]str`) return `annotated ${type}, holds ${value.length} string(s)`
      return null
    }
    // Integer arrays ([N]u8, [N]u16, [N]u32, and the signed [N]i8, [N]i16, [N]i32), e.g. the
    // viewport matrix widths and heights, or a widget's trits of -1, 0 and +1.
    case 'arr-u8':
    case 'arr-u16':
    case 'arr-u32':
    case 'arr-i8':
    case 'arr-i16':
    case 'arr-i32': {
      const elem = shape.slice(4)
      if (!Array.isArray(value)) return 'value is not an array'
      const bad = value.find((x) => !Number.isInteger(x) || x < INT_MIN[elem] || x > INT_MAX[elem])
      if (bad !== undefined) return `element ${bad} is not in ${elem} range`
      if (type !== `[${value.length}]${elem}`) return `annotated ${type}, holds ${value.length} ${elem} value(s)`
      return null
    }
    default:
      return `unknown shape ${shape}`
  }
}

export function checkSchema(consts, required, optional, file) {
  const problems = []
  for (const [name, shape] of Object.entries(required)) {
    if (!(name in consts)) { problems.push(`${file}: missing ${name}`); continue }
    const bad = shapeProblem(consts[name], shape)
    if (bad) problems.push(`${file}: ${name}: ${bad}`)
    if (!consts[name].pub) problems.push(`${file}: ${name} must be pub`)
  }
  for (const [name, shape] of Object.entries(optional)) {
    if (!(name in consts)) continue
    const bad = shapeProblem(consts[name], shape)
    if (bad) problems.push(`${file}: ${name}: ${bad}`)
    if (!consts[name].pub) problems.push(`${file}: ${name} must be pub`)
  }
  for (const name of Object.keys(consts)) {
    if (!(name in required) && !(name in optional)) problems.push(`${file}: unknown constant ${name}`)
  }
  return problems
}

const plain = (consts) => Object.fromEntries(Object.entries(consts).map(([k, v]) => [k, v.value]))

// ---------------------------------------------------------------------------
// Build. `files` = [{ path (corpus-relative), text }], `code` = the two manifests.
// ---------------------------------------------------------------------------
export function analyzeSpecFiles(analyze, files) {
  return files.map((f) => {
    const analysis = analyze(f.text)
    return { path: f.path, text: f.text, sha256: sha256(Buffer.from(f.text, 'utf8')), consts: constsOf(analysis), verdict: verdictOf(analysis), moduleName: analysis.ast?.name ?? null }
  })
}

export function buildSpecCatalogs({ skillSpecs, cronSpecs, agentSpecs = [], functionSpecs = [], toolSpecs = [], providerSpecs = [], providerCatalogSpec = null, providerStudySpec = null, providerDirs = [], casts = new Map(), i18nSpecs = [], bundles = new Map(), experience = null, skillsManifest, cronsManifest, functionsManifest = null, t27Manifest, railway, compilerWasmSha256, generatedAt }) {
  const problems = []
  for (const s of [...skillSpecs, ...cronSpecs, ...agentSpecs, ...functionSpecs, ...toolSpecs, ...providerSpecs, ...[providerCatalogSpec, providerStudySpec].filter(Boolean), ...i18nSpecs]) {
    if (s.text !== undefined && CYRILLIC.test(s.text)) problems.push(`${s.path}: Cyrillic in a .t27 spec (t27 LANG-EN; translated text belongs in the bundle a specs/i18n/*.t27 contract points to)`)
  }
  const corpusPaths = new Set((t27Manifest?.specs ?? []).map((s) => s.path))
  const codeSkills = new Map((skillsManifest?.skills ?? []).map((s) => [s.id, s]))
  const codeCrons = new Map((cronsManifest?.crons ?? []).map((c) => [c.id, c]))

  const skills = []
  const seenSkill = new Map()
  for (const s of skillSpecs) {
    const file = s.path
    if (!s.verdict.typecheckOk || s.verdict.discarded > 0 || !s.verdict.hirOk) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(s.verdict)})`)
    problems.push(...checkSchema(s.consts, SKILL_REQUIRED, {}, file))
    const f = plain(s.consts)
    if (f.KIND !== 'skill') problems.push(`${file}: KIND must be "skill"`)
    if (typeof f.ID === 'string') {
      if (seenSkill.has(f.ID)) problems.push(`${file}: duplicate skill ID ${f.ID} (also ${seenSkill.get(f.ID)})`)
      seenSkill.set(f.ID, file)
    }
    const expectModule = `skill_${file.replace(/^specs\/skills\//, '').replace(/\.t27$/, '').replace(/[^A-Za-z0-9]+/g, '_')}`
    if (s.moduleName && s.moduleName !== expectModule) problems.push(`${file}: module must be ${expectModule}, is ${s.moduleName}`)
    const code = codeSkills.get(f.ID)
    const specsMissing = (Array.isArray(f.SPECS) ? f.SPECS : []).filter((p) => !corpusPaths.has(p))
    skills.push({
      id: f.ID,
      specPath: file,
      summary: { en: f.SUMMARY_EN },
      name: { en: f.NAME },
      sha256: s.sha256,
      typecheckOk: s.verdict.typecheckOk,
      discarded: s.verdict.discarded,
      moduleName: s.moduleName,
      inSpecCorpus: corpusPaths.has(file),
      fields: f,
      code: code ? { path: code.path, sha256: code.sha256, health: code.health, link: code.link } : null,
      witness: code ? 'spec+code' : 'spec-only',
      runBy: [],
      health: code ? (specsMissing.length ? 'warn' : 'ok') : 'warn',
      messages: [
        ...(code ? [] : [`no skill ${f.ID} in public/skills/manifest.json`]),
        ...specsMissing.map((p) => `SPECS names ${p}, which is not in the vendored corpus manifest`),
      ],
    })
  }

  const crons = []
  const seenCron = new Map()
  for (const c of cronSpecs) {
    const file = c.path
    if (!c.verdict.typecheckOk || c.verdict.discarded > 0 || !c.verdict.hirOk) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(c.verdict)})`)
    problems.push(...checkSchema(c.consts, CRON_REQUIRED, CRON_OPTIONAL, file))
    const f = plain(c.consts)
    if (f.KIND !== 'cron') problems.push(`${file}: KIND must be "cron"`)
    if (typeof f.ID === 'string') {
      if (seenCron.has(f.ID)) problems.push(`${file}: duplicate cron ID ${f.ID} (also ${seenCron.get(f.ID)})`)
      seenCron.set(f.ID, file)
    }
    const expectModule = `cron_${file.replace(/^specs\/crons\//, '').replace(/\.t27$/, '').replace(/[^A-Za-z0-9]+/g, '_')}`
    if (c.moduleName && c.moduleName !== expectModule) problems.push(`${file}: module must be ${expectModule}, is ${c.moduleName}`)
    if (f.HOST && !HOSTS.includes(f.HOST)) problems.push(`${file}: HOST ${f.HOST} is not one of ${HOSTS.join('|')}`)
    if (f.CONTROL && !CONTROLS.includes(f.CONTROL)) problems.push(`${file}: CONTROL ${f.CONTROL} is not one of ${CONTROLS.join('|')}`)
    if (f.ON_FAILURE && !ON_FAILURE.includes(f.ON_FAILURE)) problems.push(`${file}: ON_FAILURE ${f.ON_FAILURE} is not one of ${ON_FAILURE.join('|')}`)
    const isTimer = f.HOST === 'timer'
    if (isTimer && !('INTERVAL_MS' in f)) problems.push(`${file}: a timer needs INTERVAL_MS`)
    if (isTimer && 'SCHEDULE' in f) problems.push(`${file}: a timer has INTERVAL_MS, not SCHEDULE`)
    // launchd (the owner's Mac): StartInterval -> INTERVAL_MS, StartCalendarInterval/crontab -> SCHEDULE; exactly one.
    const isLaunchd = f.HOST === 'launchd'
    if (isLaunchd && ('SCHEDULE' in f) === ('INTERVAL_MS' in f)) problems.push(`${file}: a launchd job has exactly one of SCHEDULE and INTERVAL_MS`)
    if (!isTimer && !isLaunchd && !('SCHEDULE' in f)) problems.push(`${file}: a scheduled job needs SCHEDULE`)
    if (!isTimer && !isLaunchd && 'INTERVAL_MS' in f) problems.push(`${file}: only a timer has INTERVAL_MS (or a launchd job)`)
    if (f.SCHEDULE === '' && !f.SCHEDULE_NOTE) problems.push(`${file}: an empty SCHEDULE needs SCHEDULE_NOTE`)
    const code = codeCrons.get(f.ID)
    const runs = Array.isArray(f.RUNS) ? f.RUNS : []
    const runsResolved = runs.map((id) => ({ id, ok: seenSkill.has(id) }))
    const unresolved = runsResolved.filter((r) => !r.ok)
    // The code manifest scans repositories, not the owner's Mac: a launchd card is spec-only by construction.
    const macOnly = f.HOST === 'launchd'
    const messages = [
      ...(code || macOnly ? [] : [`no job ${f.ID} in public/crons/manifest.json`]),
      ...unresolved.map((r) => `RUNS names ${r.id}, which has no skill spec`),
    ]
    let health = 'ok'
    if (!code && !macOnly) health = 'warn'
    if (unresolved.length) health = 'fail'
    // The code catalog knows the schedule it read from the file; when the spec
    // disagrees, that is a fact the reader must see, not a build failure.
    if (code) {
      const codeExpr = code.schedule?.expr ?? null
      const codeMs = code.schedule?.everyMs ?? null
      if (codeExpr && f.SCHEDULE !== undefined && f.SCHEDULE !== codeExpr) { messages.push(`SCHEDULE ${JSON.stringify(f.SCHEDULE)} differs from the code catalog (${codeExpr})`); if (health === 'ok') health = 'warn' }
      if (codeMs && f.INTERVAL_MS !== undefined && f.INTERVAL_MS !== codeMs) { messages.push(`INTERVAL_MS ${f.INTERVAL_MS} differs from the code catalog (${codeMs})`); if (health === 'ok') health = 'warn' }
      if (code.kind !== f.HOST) { messages.push(`HOST ${f.HOST} differs from the code catalog (${code.kind})`); if (health === 'ok') health = 'warn' }
    }
    crons.push({
      id: f.ID,
      specPath: file,
      summary: { en: f.SUMMARY_EN },
      name: { en: f.NAME },
      sha256: c.sha256,
      typecheckOk: c.verdict.typecheckOk,
      discarded: c.verdict.discarded,
      moduleName: c.moduleName,
      inSpecCorpus: corpusPaths.has(file),
      fields: f,
      code: code ? { where: code.where, sourceUrl: code.sourceUrl ?? null, health: code.health, kind: code.kind, repoPrivate: code.repoPrivate === true } : null,
      witness: code ? 'spec+code' : 'spec-only',
      runs,
      runsResolved,
      control: f.CONTROL,
      runNow: runNowTarget(f, railway),
      health,
      messages,
    })
  }

  // The reverse link, from the crons' RUNS.
  for (const cr of crons) for (const r of cr.runsResolved) {
    if (!r.ok) continue
    const sk = skills.find((s) => s.id === r.id)
    if (sk && !sk.runBy.includes(cr.id)) sk.runBy.push(cr.id)
  }
  for (const sk of skills) sk.runBy.sort()

  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  skills.sort(byId)
  crons.sort(byId)
  const codeOnlySkills = [...codeSkills.keys()].filter((id) => !seenSkill.has(id)).sort()
  const codeOnlyCrons = [...codeCrons.keys()].filter((id) => !seenCron.has(id)).sort()

  // Layer 4: agents. Skills resolve against the skill specs (an unknown ID is a
  // build failure: the spec would claim a skill nobody wrote), crons are derived
  // from the crons' RUNS, experience is joined by LETTER from the snapshot, and
  // the SOUL / AGENTS.md / alphabet links are pinned to the t27 commit that
  // snapshot was read from. An agent's witness is `spec+experience` when at
  // least one episode names its letter, else `spec-only`; nothing is assumed.
  const pin = agentPin(experience)
  const agents = []
  const seenAgent = new Map()
  const seenOrdinal = new Map()
  for (const a of agentSpecs) {
    const file = a.path
    if (!a.verdict.typecheckOk || a.verdict.discarded > 0 || !a.verdict.hirOk) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(a.verdict)})`)
    problems.push(...checkSchema(a.consts, AGENT_REQUIRED, AGENT_OPTIONAL, file))
    const f = plain(a.consts)
    if (f.KIND !== 'agent') problems.push(`${file}: KIND must be "agent"`)
    if (typeof f.LETTER === 'string' && !/^([A-Z]|TI)$/.test(f.LETTER)) problems.push(`${file}: LETTER ${JSON.stringify(f.LETTER)} is not A-Z or TI`)
    if (typeof f.LETTER === 'string' && f.ID !== `t27/${f.LETTER}`) problems.push(`${file}: ID must be t27/${f.LETTER}, is ${JSON.stringify(f.ID)}`)
    if (typeof f.ID === 'string') {
      if (seenAgent.has(f.ID)) problems.push(`${file}: duplicate agent ID ${f.ID} (also ${seenAgent.get(f.ID)})`)
      seenAgent.set(f.ID, file)
    }
    if (Number.isInteger(f.ORDINAL)) {
      if (f.ORDINAL < 1 || f.ORDINAL > AGENT_COUNT) problems.push(`${file}: ORDINAL ${f.ORDINAL} is not 1..${AGENT_COUNT}`)
      if (seenOrdinal.has(f.ORDINAL)) problems.push(`${file}: duplicate ORDINAL ${f.ORDINAL} (also ${seenOrdinal.get(f.ORDINAL)})`)
      seenOrdinal.set(f.ORDINAL, file)
    }
    if (f.LAYER !== undefined && !AGENT_LAYERS.includes(f.LAYER)) problems.push(`${file}: LAYER ${JSON.stringify(f.LAYER)} is not one of ${AGENT_LAYERS.join('|')}`)
    const expectModule = `agent_${file.replace(/^specs\/agents\//, '').replace(/\.t27$/, '').replace(/[^A-Za-z0-9]+/g, '_')}`
    if (a.moduleName && a.moduleName !== expectModule) problems.push(`${file}: module must be ${expectModule}, is ${a.moduleName}`)
    if (typeof f.LETTER === 'string' && expectModule !== `agent_${f.LETTER.toLowerCase()}`) problems.push(`${file}: file name must be ${f.LETTER.toLowerCase()}.t27 for LETTER ${f.LETTER}`)
    const skillIds = Array.isArray(f.SKILLS) ? f.SKILLS : []
    for (const id of skillIds) if (!seenSkill.has(id)) problems.push(`${file}: SKILLS names ${id}, which has no skill spec`)
    if (skillIds.length === 0 && !(typeof f.SKILLS_NOTE === 'string' && f.SKILLS_NOTE.trim())) problems.push(`${file}: empty SKILLS needs a SKILLS_NOTE`)
    const toolIds = Array.isArray(f.TOOLS) ? f.TOOLS : []
    if ('TOOLS' in f && toolIds.length === 0 && !(typeof f.TOOLS_NOTE === 'string' && f.TOOLS_NOTE.trim())) problems.push(`${file}: empty TOOLS needs a TOOLS_NOTE`)
    const agentCrons = crons.filter((c) => c.runsResolved.some((r) => r.ok && skillIds.includes(r.id))).map((c) => c.id).sort()
    const ex = experience?.agents?.[f.LETTER] ?? null
    const exp = ex
      ? { episodes: ex.episodes, first: ex.first ?? null, last: ex.last ?? null, lastTask: ex.lastTask ?? null, outcomes: ex.outcomes ?? {}, lessons: ex.lessons ?? [], files: ex.files ?? [] }
      : { episodes: 0, first: null, last: null, lastTask: null, outcomes: {}, lessons: [], files: [] }
    agents.push({
      id: f.ID,
      letter: f.LETTER,
      ordinal: f.ORDINAL,
      specPath: file,
      summary: { en: f.SUMMARY_EN },
      name: { en: f.NAME },
      sha256: a.sha256,
      typecheckOk: a.verdict.typecheckOk,
      discarded: a.verdict.discarded,
      moduleName: a.moduleName,
      inSpecCorpus: corpusPaths.has(file),
      fields: f,
      skills: skillIds.map((id) => ({ id, ok: seenSkill.has(id) })),
      crons: agentCrons,
      tools: toolIds,
      experience: exp,
      links: {
        soul: `${T27_REPO_URL}/blob/${pin.ref}/${f.SOUL}`,
        agentsDoc: `${T27_REPO_URL}/blob/${pin.ref}/${f.AGENTS_DOC}`,
        alphabet: `${T27_REPO_URL}/blob/${pin.ref}/${f.ALPHABET}`,
        experienceLog: f.EXPERIENCE_LOG ? `${T27_REPO_URL}/tree/${pin.ref}/${f.EXPERIENCE_LOG.replace(/\/$/, '')}` : null,
        pinnedAt: pin.ref,
        pinSource: pin.source,
      },
      witness: exp.episodes > 0 ? 'spec+experience' : 'spec-only',
      health: skillIds.every((id) => seenSkill.has(id)) ? 'ok' : 'fail',
      messages: [
        ...(exp.episodes === 0 ? ['no attributed episodes in the experience snapshot'] : []),
        ...skillIds.filter((id) => !seenSkill.has(id)).map((id) => `SKILLS names ${id}, which has no skill spec`),
      ],
    })
  }
  agents.sort((x, y) => (x.ordinal ?? 0) - (y.ordinal ?? 0) || String(x.id).localeCompare(String(y.id)))
  if (agentSpecs.length && agents.length !== AGENT_COUNT) problems.push(`${AGENT_SPEC_DIR}: ${agents.length} agent spec(s), the alphabet has ${AGENT_COUNT}`)

  // Layer 5: functions. The witness is the vendored functions manifest, keyed
  // by the canonical id exactly as skills are keyed by theirs. A manifest field
  // the extractor left empty (file "", steps [], retries null) is "not read",
  // never "disagrees"; a filled field that differs from the spec is written on
  // the card. A cron function is joined to its cron card by REPO + LEGACY_ID =
  // the cron spec's NAME with HOST inngest -- an evidence join, not a name guess.
  const { functions, codeOnlyFunctions } = buildFunctions({ functionSpecs, functionsManifest, crons, corpusPaths, problems })
  // Layer 7: providers. The witness of a model card is the Gonka chain, re-read by the
  // browser; the witness of a host class is a bench record or nothing (catalog.t27).
  const { providers, catalog: providerCatalog, study: providerStudy } = buildProviders({ providerSpecs, providerCatalogSpec, providerStudySpec, providerDirs, corpusPaths, problems })
  // Tools, the layer after agents on this site's ladder (the t27 README of
  // specs/tools also calls itself "Layer 5", as does specs/functions -- a
  // source discrepancy recorded in the report, not resolved here). Two families read from two sub-directories, never merged
  // into one list: specs/tools/tri (the tri CLI, one file per clap variant) and
  // specs/tools/mcp (one file per MCP server). AGENTS on a tool and TOOLS on an
  // agent must agree in both directions and name only letters / IDs that exist;
  // a skill is cross-linked when its COMMAND names the tri command. The witness
  // is what the spec says it is (`source-parse` = read from the source, `help-output`
  // = diffed against `tri --help`); the generator does not upgrade it.
  const tools = []
  // A trios/tri card's other constants are already lifted onto the entry (trios, args, actions,
  // variant, entry, links.pinnedAt, witnessSource) and the .t27 itself is served at specPath;
  // repeating them under fields for ~300 cards would push its part past the 1 MB commit limit.
  const TRIOS_KEPT_FIELDS = ['ID', 'KIND', 'FAMILY', 'REPO', 'QUALIFIED_ID', 'SCHEMA', 'COMMAND', 'SOURCE', 'ABOUT', 'ABOUT_SOURCE', 'AGENTS', 'AGENTS_NOTE', 'WHEN_TO_USE', 'WITNESS', 'CAST', 'ENABLED']
  const slimFields = (f) => Object.fromEntries(TRIOS_KEPT_FIELDS.filter((k) => k in f).map((k) => [k, f[k]]))
  const SLIM_SUBDIRS = new Set(['trios/tri', 'trinity/cli'])
  const seenTool = new Map()
  const seenLetter = new Map(agents.map((a) => [a.letter, a]))
  for (const t of toolSpecs) {
    const file = t.path
    const m = /^specs\/tools\/(tri|mcp|trinity\/tri|trinity\/cli|trios\/tri)\/([^/]+)\.t27$/.exec(file)
    if (!m) { problems.push(`${file}: a tool spec must live in specs/tools/tri/, specs/tools/mcp/, specs/tools/trinity/tri/, specs/tools/trinity/cli/ or specs/tools/trios/tri/`); continue }
    const [, sub, base] = m
    if (!t.verdict.typecheckOk || t.verdict.discarded > 0 || !t.verdict.hirOk) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(t.verdict)})`)
    const [required, schemaOptional] = sub === 'tri' ? [TOOL_TRI_REQUIRED, TOOL_TRI_SCHEMA2_OPTIONAL] : sub === 'mcp' ? [TOOL_MCP_REQUIRED, TOOL_MCP_SCHEMA2_OPTIONAL] : sub === 'trios/tri' ? [TOOL_TRIOS_TRI_REQUIRED, {}] : sub === 'trinity/cli' ? [TOOL_TRINITY_CLI_REQUIRED, {}] : [TOOL_TRINITY_TRI_REQUIRED, {}]
    const castAllowed = CAST_SUBDIRS.has(sub)
    const optional = castAllowed ? { ...schemaOptional, ...TOOL_CAST_OPTIONAL } : schemaOptional
    problems.push(...checkSchema(t.consts, required, optional, file))
    const f = plain(t.consts)
    if (f.KIND !== 'tool') problems.push(`${file}: KIND must be "tool"`)
    if (f.FAMILY !== TOOL_FAMILIES[sub]) problems.push(`${file}: FAMILY must be ${JSON.stringify(TOOL_FAMILIES[sub])} under ${sub}/, is ${JSON.stringify(f.FAMILY)}`)
    // Identity (specs/tools/catalog.t27): a legacy card keeps ID = <family>/<name> and, at schema 2,
    // QUALIFIED_ID = REPO:ID; a card under trinity/tri has ID = QUALIFIED_ID = gHashTag/trinity:tri/<name>.
    const shortId = `${QUALIFIED_ONLY.has(sub) ? 'tri' : sub}/${base}`
    const repo = sub === 'mcp' ? f.REPO : (f.REPO ?? TOOL_REPO_OF_SUBDIR[sub])
    const qualifiedId = `${repo}:${shortId}`
    const expectId = QUALIFIED_ONLY.has(sub) ? qualifiedId : shortId
    if (f.ID !== expectId) problems.push(`${file}: ID must be ${expectId}, is ${JSON.stringify(f.ID)}`)
    if (sub !== 'mcp' && f.REPO !== undefined && f.REPO !== TOOL_REPO_OF_SUBDIR[sub]) problems.push(`${file}: REPO must be ${TOOL_REPO_OF_SUBDIR[sub]} under ${sub}/, is ${JSON.stringify(f.REPO)}`)
    if (f.SCHEMA !== undefined && f.SCHEMA !== TOOL_SCHEMA) problems.push(`${file}: SCHEMA must be ${TOOL_SCHEMA}, is ${JSON.stringify(f.SCHEMA)}`)
    if (f.QUALIFIED_ID !== undefined && f.QUALIFIED_ID !== qualifiedId) problems.push(`${file}: QUALIFIED_ID must be ${qualifiedId} (REPO:ID), is ${JSON.stringify(f.QUALIFIED_ID)}`)
    const pinnedBySourceCommit = sub === 'trios/tri' || sub === 'trinity/cli'
    if (pinnedBySourceCommit && !/^[0-9a-f]{40}$/.test(f.SOURCE_COMMIT ?? '')) problems.push(`${file}: SOURCE_COMMIT must be a full 40-hex commit of ${TOOL_REPO_OF_SUBDIR[sub]}`)
    if (sub === 'trinity/tri' || sub === 'trinity/cli') {
      if (f.SCHEMA === undefined || f.QUALIFIED_ID === undefined || f.REPO === undefined) problems.push(`${file}: a ${sub} card must carry REPO, QUALIFIED_ID and SCHEMA`)
      if (!TOOL_ROUTE_KINDS.includes(f.ROUTE_KIND)) problems.push(`${file}: ROUTE_KIND ${JSON.stringify(f.ROUTE_KIND)} is not one of ${TOOL_ROUTE_KINDS.join('|')}`)
      if (f.ROUTED !== (f.ROUTE_KIND !== 'none')) problems.push(`${file}: ROUTED must agree with ROUTE_KIND`)
      if (f.COLLIDES_WITH && !/^gHashTag\/t27:tri\/[^/]+$/.test(f.COLLIDES_WITH)) problems.push(`${file}: COLLIDES_WITH must name a gHashTag/t27:tri/<name> card or be empty`)
    }
    if (typeof f.ID === 'string') {
      if (seenTool.has(f.ID)) problems.push(`${file}: duplicate tool ID ${f.ID} (also ${seenTool.get(f.ID)})`)
      seenTool.set(f.ID, file)
    }
    const expectModule = `tool_${sub.replace('/', '_')}_${base.replace(/[^A-Za-z0-9]+/g, '_')}`
    if (t.moduleName && t.moduleName !== expectModule) problems.push(`${file}: module must be ${expectModule}, is ${t.moduleName}`)
    if (!TOOL_WITNESSES.includes(f.WITNESS)) problems.push(`${file}: WITNESS ${JSON.stringify(f.WITNESS)} is not one of ${TOOL_WITNESSES.join('|')}`)
    // Recorded run (castProblems): checked for every family, so an mcp card claiming runtime fails here too.
    problems.push(...castProblems(file, { cast: f.CAST, witness: f.WITNESS, command: f.COMMAND }, casts))
    if (typeof f.ABOUT === 'string' && !f.ABOUT.trim()) problems.push(`${file}: ABOUT is empty`)
    if (typeof f.ABOUT_SOURCE === 'string' && !f.ABOUT_SOURCE.trim()) problems.push(`${file}: ABOUT_SOURCE is empty`)
    const letters = Array.isArray(f.AGENTS) ? f.AGENTS : []
    for (const l of letters) if (!seenLetter.has(l)) problems.push(`${file}: AGENTS names ${JSON.stringify(l)}, which is not a letter of the alphabet`)
    if (letters.length === 0 && !(typeof f.AGENTS_NOTE === 'string' && f.AGENTS_NOTE.trim())) problems.push(`${file}: empty AGENTS needs an AGENTS_NOTE`)
    const same = (a, b, na, nb) => { if (Array.isArray(f[a]) && Array.isArray(f[b]) && f[a].length !== f[b].length) problems.push(`${file}: ${na} has ${f[a].length} entries, ${nb} has ${f[b].length}`) }
    let card
    if (sub === 'tri' || QUALIFIED_ONLY.has(sub)) {
      if (f.COMMAND !== `tri ${base}`) problems.push(`${file}: COMMAND must be "tri ${base}", is ${JSON.stringify(f.COMMAND)}`)
      same('ACTIONS', 'ACTIONS_ABOUT', 'ACTIONS', 'ACTIONS_ABOUT')
      const actions = (Array.isArray(f.ACTIONS) ? f.ACTIONS : []).map((name, i) => ({ name, about: f.ACTIONS_ABOUT?.[i] ?? '' }))
      const args = (Array.isArray(f.ARGS) ? f.ARGS : []).map((x) => { const k = x.indexOf(': '); return k === -1 ? { name: x, about: '' } : { name: x.slice(0, k), about: x.slice(k + 2) } })
      // Skills whose own spec names this tri command (COMMAND or SUMMARY_EN text -- the
      // skill's fields, not a guess); the matched field is recorded beside the skill ID.
      const cmdRe = new RegExp(`(^|[^A-Za-z0-9_-])tri\\s+${base.replace(/[-/\\\\^$*+?.()|[\]{}]/g, '\\$&')}(?![A-Za-z0-9_-])`)
      // The skills of this repository name the t27 tri; a Trinity command is never cross-linked by name.
      const skillIds = sub !== 'tri' ? [] : skills.flatMap((sk) => {
        const via = ['COMMAND', 'SUMMARY_EN'].filter((k) => typeof sk.fields[k] === 'string' && cmdRe.test(sk.fields[k]))
        return via.length ? [{ id: sk.id, via }] : []
      }).sort((x, y) => (x.id < y.id ? -1 : 1))
      card = { family: 'tri-cli', command: f.COMMAND, variant: f.VARIANT, actions, args, whenToUse: f.WHEN_TO_USE, skills: skillIds, aboutSource: f.ABOUT_SOURCE, repo, source: f.SOURCE, entry: f.ENTRY }
      if (sub === 'trios/tri') {
        card.trios = { documented: f.DOCUMENTED === true, category: f.CATEGORY, dispatch: f.DISPATCH, helpLine: f.HELP_LINE, routed: f.ROUTED === true }
        card.witnessSource = f.WITNESS_SOURCE
      }
      if (sub === 'trinity/tri') {
        card.registry = { aliases: f.ALIASES ?? [], namespace: f.NAMESPACE, mode: f.MODE, stability: f.STABILITY, category: f.CATEGORY, jobTimeout: f.JOB_TIMEOUT, sideEffects: f.SIDE_EFFECTS ?? [], capabilities: f.CAPABILITIES ?? [], mcpEnabled: f.MCP_ENABLED === true, mcpName: f.MCP_NAME, mcpDisplayName: f.MCP_DISPLAY_NAME, examples: f.EXAMPLES ?? [] }
        card.routing = { routed: f.ROUTED === true, kind: f.ROUTE_KIND, note: f.ROUTE_NOTE }
        card.exitCodes = f.EXIT_CODES ?? []
        card.result = f.RESULT
        card.collidesWith = f.COLLIDES_WITH || null
        card.witnessSource = f.WITNESS_SOURCE
      }
      if (sub === 'trinity/cli') {
        card.trinityCli = { aliases: f.ALIASES ?? [], inRegistry: f.IN_REGISTRY === true }
        card.routing = { routed: f.ROUTED === true, kind: f.ROUTE_KIND, note: f.ROUTE_NOTE }
        card.collidesWith = f.COLLIDES_WITH || null
        card.witnessSource = f.WITNESS_SOURCE
      }
    } else {
      same('TOOLS', 'TOOLS_ABOUT', 'TOOLS', 'TOOLS_ABOUT'); same('TOOLS', 'TOOLS_INPUTS', 'TOOLS', 'TOOLS_INPUTS'); same('RESOURCES', 'RESOURCES_ABOUT', 'RESOURCES', 'RESOURCES_ABOUT')
      if (!['stdio', 'http'].includes(f.TRANSPORT)) problems.push(`${file}: TRANSPORT ${JSON.stringify(f.TRANSPORT)} is not stdio|http`)
      if (!['gHashTag/t27', 'gHashTag/trinity'].includes(f.REPO)) problems.push(`${file}: REPO ${JSON.stringify(f.REPO)} is not gHashTag/t27|gHashTag/trinity`)
      const mcpTools = (Array.isArray(f.TOOLS) ? f.TOOLS : []).map((name, i) => ({ name, about: f.TOOLS_ABOUT?.[i] ?? '', inputs: (f.TOOLS_INPUTS?.[i] ?? '').split(',').filter(Boolean) }))
      if (mcpTools.length === 0 && !(typeof f.TOOLS_NOTE === 'string' && f.TOOLS_NOTE.trim())) problems.push(`${file}: empty TOOLS needs a TOOLS_NOTE`)
      if (mcpTools.length === 0 && f.EXTERNAL !== true) problems.push(`${file}: an in-repo server with no tools listed (set EXTERNAL or list its tools)`)
      const resources = (Array.isArray(f.RESOURCES) ? f.RESOURCES : []).map((path, i) => ({ path, about: f.RESOURCES_ABOUT?.[i] ?? '' }))
      card = { family: 'mcp', server: f.SERVER, serverVersion: f.SERVER_VERSION, transport: f.TRANSPORT, launch: f.LAUNCH, env: f.ENV ?? [], config: f.CONFIG, tools: mcpTools, resources, toolsNote: f.TOOLS_NOTE, external: f.EXTERNAL === true, skills: [], aboutSource: f.ABOUT_SOURCE, repo: f.REPO, source: f.SOURCE }
    }
    const repoUrl = card.repo === 'gHashTag/t27' ? T27_REPO_URL : `https://github.com/${card.repo === 'gHashTag/BrowserOS' ? 'gHashTag/BrowserOS' : 'gHashTag/trinity'}`
    const ref = card.repo === 'gHashTag/t27' ? pin.ref : pinnedBySourceCommit ? f.SOURCE_COMMIT : (experience?.sources ?? []).find((x) => x.repo === 'trinity' && /^[0-9a-f]{40}$/.test(x.commit ?? ''))?.commit ?? 'main'
    tools.push({
      id: f.ID,
      qualifiedId,
      schema: f.SCHEMA ?? 1,
      specPath: file,
      summary: { en: f.ABOUT },
      name: { en: sub === 'mcp' ? f.SERVER : f.COMMAND },
      sha256: t.sha256,
      typecheckOk: t.verdict.typecheckOk,
      discarded: t.verdict.discarded,
      moduleName: t.moduleName,
      inSpecCorpus: corpusPaths.has(file),
      fields: SLIM_SUBDIRS.has(sub) ? slimFields(f) : f,
      ...card,
      agents: letters.map((l) => ({ letter: l, ok: seenLetter.has(l) })),
      links: {
        source: `${repoUrl}/blob/${ref}/${card.source}`,
        config: card.config ? `${repoUrl}/blob/${ref}/${card.config}` : null,
        pinnedAt: ref,
      },
      witness: f.WITNESS,
      cast: castAllowed ? castEntry(f.CAST, f.COMMAND, casts) : null,
      health: letters.every((l) => seenLetter.has(l)) ? 'ok' : 'fail',
      messages: [
        ...(letters.length === 0 ? ['no agent letter bound by a source'] : []),
        ...(sub === 'mcp' && card.external ? ['external package: tool list not in the repository'] : []),
      ],
    })
  }
  tools.sort(byId)
  // Both directions must agree: an agent's TOOLS name existing tools that name the agent back.
  for (const a of agents) {
    const ids = a.tools
    a.tools = ids.map((id) => ({ id, ok: seenTool.has(id) }))
    for (const id of ids) {
      if (!seenTool.has(id)) { problems.push(`${a.specPath}: TOOLS names ${id}, which has no tool spec`); continue }
      const tl = tools.find((x) => x.id === id)
      if (!tl.agents.some((x) => x.letter === a.letter)) problems.push(`${a.specPath}: TOOLS names ${id}, but ${tl.specPath} AGENTS does not name ${a.letter}`)
    }
  }
  for (const tl of tools) for (const { letter } of tl.agents) {
    const a = seenLetter.get(letter)
    if (a && !a.tools.some((x) => x.id === tl.id)) problems.push(`${tl.specPath}: AGENTS names ${letter}, but ${a.specPath} TOOLS does not name ${tl.id}`)
  }
  // Full-text index: one lowercase string per tool the explorer's search box filters on.
  for (const tl of tools) {
    const parts = [tl.id, tl.name.en, tl.summary.en, tl.whenToUse ?? '', ...(tl.actions ?? []).flatMap((x) => [x.name, x.about]), ...(tl.tools ?? []).flatMap((x) => [x.name, x.about]), ...tl.agents.map((x) => x.letter)]
    tl.searchText = parts.join(' ').toLowerCase().replace(/\s+/g, ' ').trim()
  }

  // Translations, connected through their contract specs. Every locale comes
  // from a specs/i18n/*.t27; nothing here knows which locales exist.
  const specsById = new Map()
  for (const s of skills) specsById.set(s.id, { dir: SKILL_SPEC_DIR, fields: s.fields })
  for (const c of crons) specsById.set(c.id, { dir: CRON_SPEC_DIR, fields: c.fields })
  for (const a of agents) specsById.set(a.id, { dir: AGENT_SPEC_DIR, fields: a.fields })
  for (const fn of functions) specsById.set(fn.id, { dir: FUNCTION_SPEC_DIR, fields: fn.fields })
  for (const tl of tools) specsById.set(tl.id, { dir: TOOL_SPEC_DIR, fields: tl.fields })
  for (const p of providers) specsById.set(p.id, { dir: PROVIDER_SPEC_DIR, fields: p.fields })
  const locales = []
  const seenLocale = new Map()
  // A translation contract belongs to this generator when its SCOPE names one of the
  // four catalog directories; contracts scoped elsewhere (specs/docs -> docs-from-specs.mjs)
  // are validated by their own generator and only Cyrillic-checked here.
  const ownI18n = i18nSpecs.filter((spec) => {
    const scope = plain(spec.consts).SCOPE
    return !Array.isArray(scope) || scope.some((d) => CATALOG_SPEC_DIRS.has(d))
  })
  for (const spec of [...ownI18n].sort((a, b) => a.path.localeCompare(b.path))) {
    const fields = plain(spec.consts)
    const r = checkI18n({ ...spec, fields }, bundles.get(fields.BUNDLE_PATH) ?? null, specsById)
    problems.push(...r.problems)
    if (typeof fields.LOCALE === 'string') {
      if (seenLocale.has(fields.LOCALE)) problems.push(`${spec.path}: duplicate LOCALE ${fields.LOCALE} (also ${seenLocale.get(fields.LOCALE)})`)
      seenLocale.set(fields.LOCALE, spec.path)
    }
    locales.push({ locale: fields.LOCALE, entry: r.entry, translations: r.translations, scope: new Set(r.entry.scope) })
  }
  const i18nFor = (dir, list) => [...locales].sort((a, b) => String(a.locale).localeCompare(String(b.locale))).filter((l) => l.scope.has(dir)).map((l) => {
    const ids = new Set(list.map((e) => e.id))
    const missing = l.entry.missing.filter((id) => ids.has(id))
    const { missing: _all, ...rest } = l.entry
    return { ...rest, coverage: { n: list.length - missing.length, total: list.length }, missing }
  })
  for (const e of [...skills, ...crons, ...agents, ...functions, ...providers]) {
    e.summary = localized(e.fields.SUMMARY_EN, e.id, 'SUMMARY', locales)
    e.name = localized(e.fields.NAME, e.id, 'NAME', locales)
  }
  for (const tl of tools) tl.summary = localized(summarySourceOf(tl.fields), tl.id, 'SUMMARY', locales)
  const base = { version: VERSION, compilerWasmSha256 }
  const ladder = { specs: t27Manifest?.specCount ?? null, skills: skills.length, crons: crons.length, agents: agents.length, tools: tools.length, functions: functions.length, providers: providers.length }
  const skillsOut = sortKeys({
    ...base,
    generatedAt,
    counts: { specs: skills.length, specPlusCode: skills.filter((s) => s.witness === 'spec+code').length, specOnly: skills.filter((s) => s.witness === 'spec-only').length, codeOnly: codeOnlySkills.length, typecheckOk: skills.filter((s) => s.typecheckOk).length, runBy: skills.filter((s) => s.runBy.length).length },
    skills,
    codeOnly: codeOnlySkills,
    i18n: i18nFor(SKILL_SPEC_DIR, skills),
    // Every Explorer shows the one ladder, the Skill and Cron Explorers too.
    ladder,
  })
  const cronsOut = sortKeys({
    ...base,
    generatedAt,
    counts: { specs: crons.length, specPlusCode: crons.filter((c) => c.witness === 'spec+code').length, specOnly: crons.filter((c) => c.witness === 'spec-only').length, codeOnly: codeOnlyCrons.length, typecheckOk: crons.filter((c) => c.typecheckOk).length, withRuns: crons.filter((c) => c.runs.length).length, byHost: Object.fromEntries(HOSTS.map((h) => [h, crons.filter((c) => c.fields.HOST === h).length])) },
    crons,
    codeOnly: codeOnlyCrons,
    i18n: i18nFor(CRON_SPEC_DIR, crons),
    ladder,
  })
  const agentsOut = sortKeys({
    ...base,
    generatedAt,
    counts: {
      specs: agents.length,
      enabled: agents.filter((a) => a.fields.ENABLED === true).length,
      typecheckOk: agents.filter((a) => a.typecheckOk).length,
      withSkills: agents.filter((a) => a.skills.length).length,
      withCrons: agents.filter((a) => a.crons.length).length,
      withTools: agents.filter((a) => a.tools.length).length,
      withExperience: agents.filter((a) => a.experience.episodes > 0).length,
      withClaraRole: agents.filter((a) => a.fields.CLARA_ROLE).length,
      specPlusExperience: agents.filter((a) => a.witness === 'spec+experience').length,
      specOnly: agents.filter((a) => a.witness === 'spec-only').length,
      byLayer: Object.fromEntries(AGENT_LAYERS.map((l) => [l, agents.filter((a) => a.fields.LAYER === l).length])),
      episodesAttributed: agents.reduce((n, a) => n + a.experience.episodes, 0),
      episodesUnattributed: experience?.unattributed?.episodes ?? null,
      episodesTotal: experience?.counts?.episodes ?? null,
    },
    // The ladder the explorers share: Specs -> Skills -> Crons -> Agents -> Tools -> Functions.
    // Every count is the length of a spec catalog built above (functions from specs/functions), never typed.
    ladder,
    pin,
    experienceSnapshot: experience ? { generatedAt: experience.generatedAt, sources: (experience.sources ?? []).map((x) => ({ repo: x.repo, commit: x.commit, files: x.files, episodes: x.episodes, unreadable: x.unreadable })), counts: experience.counts ?? null, attribution: experience.attribution ?? null } : null,
    agents,
    i18n: i18nFor(AGENT_SPEC_DIR, agents),
  })
  const triTools = tools.filter((x) => x.family === 'tri-cli'), mcpTools = tools.filter((x) => x.family === 'mcp')
  const t27TriNames = new Set(triTools.filter((x) => x.repo === 'gHashTag/t27').map((x) => x.id.slice('tri/'.length)))
  const collisions = triTools.filter((x) => x.repo === 'gHashTag/trinity' && t27TriNames.has(x.qualifiedId.split(':tri/')[1])).map((x) => ({ name: x.qualifiedId.split(':tri/')[1], t27: `gHashTag/t27:tri/${x.qualifiedId.split(':tri/')[1]}`, trinity: x.qualifiedId })).sort((a, b) => (a.name < b.name ? -1 : 1))
  const toolsOut = sortKeys({
    ...base,
    generatedAt,
    counts: {
      specs: tools.length,
      tri: triTools.length,
      mcp: mcpTools.length,
      typecheckOk: tools.filter((x) => x.typecheckOk).length,
      enabled: tools.filter((x) => x.fields.ENABLED === true).length,
      withAgents: tools.filter((x) => x.agents.length).length,
      withSkills: tools.filter((x) => x.skills.length).length,
      triWithActions: triTools.filter((x) => x.actions.length).length,
      triActions: triTools.reduce((n, x) => n + x.actions.length, 0),
      mcpWithTools: mcpTools.filter((x) => x.tools.length).length,
      mcpTools: mcpTools.reduce((n, x) => n + x.tools.length, 0),
      mcpExternal: mcpTools.filter((x) => x.external).length,
      byWitness: Object.fromEntries(TOOL_WITNESSES.map((w) => [w, tools.filter((x) => x.witness === w).length])),
      withCast: tools.filter((x) => x.cast).length,
      byRepo: Object.fromEntries(TOOL_REPOS.map((r) => [r, tools.filter((x) => x.repo === r).length])),
      trinityTri: triTools.filter((x) => x.repo === 'gHashTag/trinity').length,
      triosTri: triTools.filter((x) => x.repo === 'gHashTag/BrowserOS').length,
      schema2: tools.filter((x) => x.schema === TOOL_SCHEMA).length,
      collisions: collisions.length,
    },
    // Schema 2 (specs/tools/catalog.t27): the legacy table maps every short ID to its qualified ID and
    // nothing else resolves a short ID; a collision is a command name both binaries dispatch.
    schema: TOOL_SCHEMA,
    legacy: Object.fromEntries(tools.filter((x) => x.id !== x.qualifiedId).map((x) => [x.id, x.qualifiedId])),
    collisions,
    // Grouping the navigator shows: tri commands by owning letter (unbound under '-'), MCP servers by repo.
    groups: {
      // '-' is always present, empty when nothing is unbound. It used to appear
      // only while some command had no agent, so the day every command gained
      // one the bucket vanished and the contract read undefined where it had
      // asked for a list. "Nothing is unbound" is a fact worth stating, not an
      // absence to infer.
      triByAgent: Object.fromEntries([...new Set(['-', ...triTools.flatMap((x) => x.agents.map((a) => a.letter))])].sort().map((l) => [l, triTools.filter((x) => (l === '-' ? x.agents.length === 0 : x.agents.some((a) => a.letter === l))).map((x) => x.id)])),
      mcpByRepo: Object.fromEntries(['gHashTag/t27', 'gHashTag/trinity'].map((r) => [r, mcpTools.filter((x) => x.repo === r).map((x) => x.id)])),
      triByRepo: Object.fromEntries(TOOL_REPOS.map((r) => [r, triTools.filter((x) => x.repo === r).map((x) => x.id)])),
    },
    ladder,
    pin,
    tools,
    i18n: i18nFor(TOOL_SPEC_DIR, tools),
  })
  // A hash of everything but the clock, so a checker can compare committed and
  // regenerated output without the timestamp getting in the way.
  const functionsOut = sortKeys({
    ...base,
    generatedAt,
    counts: {
      specs: functions.length,
      specPlusCode: functions.filter((f) => f.witness === 'spec+code').length,
      specOnly: functions.filter((f) => f.witness === 'spec-only').length,
      codeOnly: codeOnlyFunctions.length,
      typecheckOk: functions.filter((f) => f.typecheckOk).length,
      deployed: functions.filter((f) => f.code?.deployed === true).length,
      notDeployed: functions.filter((f) => f.code?.deployed === false).length,
      deployUnknown: functions.filter((f) => f.code == null || typeof f.code.deployed !== 'boolean').length,
      withCronSpec: functions.filter((f) => f.cronSpec).length,
      withDifferences: functions.filter((f) => f.differences.length).length,
      byTrigger: Object.fromEntries(FN_TRIGGERS.map((t) => [t, functions.filter((f) => f.fields.TRIGGER === t).length])),
      byDomain: Object.fromEntries([...new Set(functions.map((f) => f.fields.DOMAIN))].sort().map((d) => [d, functions.filter((f) => f.fields.DOMAIN === d).length])),
      bySideEffect: Object.fromEntries(FN_SIDE_EFFECTS.map((s) => [s, functions.filter((f) => (f.fields.SIDE_EFFECTS ?? []).includes(s)).length])),
      byProbeResult: Object.fromEntries(FN_PROBE_RESULTS.map((p) => [p, functions.filter((f) => f.fields.PROBE_RESULT === p).length])),
    },
    ladder,
    manifest: functionsManifest
      ? { repo: functionsManifest.repo ?? null, generatedFrom: functionsManifest.generatedFrom ?? null, probedAt: functionsManifest.probedAt ?? null, deployedApp: functionsManifest.deployedApp ?? null, entries: (functionsManifest.functions ?? []).length }
      : null,
    functions,
    codeOnly: codeOnlyFunctions,
    i18n: i18nFor(FUNCTION_SPEC_DIR, functions),
  })
  const providersOut = sortKeys({
    ...base,
    generatedAt,
    counts: {
      specs: providers.length,
      typecheckOk: providers.filter((p) => p.typecheckOk).length,
      enabled: providers.filter((p) => p.fields.ENABLED === true).length,
      byFamily: Object.fromEntries((providerCatalog?.families ?? []).map((x) => [x, providers.filter((p) => p.family === x).length])),
      byNetwork: Object.fromEntries((providerCatalog?.networks ?? []).map((x) => [x, providers.filter((p) => p.network === x).length])),
      byStatus: Object.fromEntries((providerCatalog?.statuses ?? []).map((x) => [x, providers.filter((p) => p.status === x).length])),
      byWitness: Object.fromEntries((providerCatalog?.witnesses ?? []).map((x) => [x, providers.filter((p) => p.witness === x).length])),
    },
    // Layer 7 of the ladder: Specs -> Skills -> Crons -> Agents -> Tools -> Functions -> Providers.
    ladder,
    catalog: providerCatalog,
    study: providerStudy,
    providers,
    i18n: i18nFor(PROVIDER_SPEC_DIR, providers),
  })
  // A hash of everything but the clock, so a checker can compare committed and
  // regenerated output without the timestamp getting in the way.
  providersOut.contentSha256 = sha256(JSON.stringify({ ...providersOut, generatedAt: null }))
  skillsOut.contentSha256 = sha256(JSON.stringify({ ...skillsOut, generatedAt: null }))
  cronsOut.contentSha256 = sha256(JSON.stringify({ ...cronsOut, generatedAt: null }))
  agentsOut.contentSha256 = sha256(JSON.stringify({ ...agentsOut, generatedAt: null }))
  functionsOut.contentSha256 = sha256(JSON.stringify({ ...functionsOut, generatedAt: null }))
  toolsOut.contentSha256 = sha256(JSON.stringify({ ...toolsOut, generatedAt: null }))
  return { skills: sortKeys(skillsOut), crons: sortKeys(cronsOut), agents: sortKeys(agentsOut), functions: sortKeys(functionsOut), tools: sortKeys(toolsOut), providers: sortKeys(providersOut), problems }
}

/** The fields of a manifest entry the spec repeats, and how each is compared. */
const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i])
const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i])

/**
 * Compare one function spec with its manifest entry. Returns the list of
 * differences as `{field, spec, code}`; a manifest field the extractor left
 * empty ("" / [] / null) is "not read" and produces no difference.
 */
export function functionDifferences(fields, code) {
  if (!code) return []
  const out = []
  const push = (field, spec, value) => out.push({ field, spec, code: value })
  if (code.trigger && fields.TRIGGER !== code.trigger) push('TRIGGER', fields.TRIGGER, code.trigger)
  if (code.event && fields.EVENT !== code.event) push('EVENT', fields.EVENT, code.event)
  if (Array.isArray(code.legacy_events) && code.legacy_events.length && !sameList(fields.LEGACY_EVENTS, code.legacy_events)) push('LEGACY_EVENTS', fields.LEGACY_EVENTS, code.legacy_events)
  if (code.cron && fields.CRON !== code.cron) push('CRON', fields.CRON, code.cron)
  if (code.tz && fields.TZ !== code.tz) push('TZ', fields.TZ, code.tz)
  if (code.legacy_id && fields.LEGACY_ID !== code.legacy_id) push('LEGACY_ID', fields.LEGACY_ID, code.legacy_id)
  if (code.domain && fields.DOMAIN !== code.domain) push('DOMAIN', fields.DOMAIN, code.domain)
  if (Number.isInteger(code.retries) && fields.RETRIES !== code.retries) push('RETRIES', fields.RETRIES, code.retries)
  if (code.on_failure && fields.ON_FAILURE !== code.on_failure) push('ON_FAILURE', fields.ON_FAILURE, code.on_failure)
  if (Array.isArray(code.steps) && code.steps.length && !sameList(fields.STEPS, code.steps)) push('STEPS', fields.STEPS, code.steps)
  if (Array.isArray(code.side_effects) && code.side_effects.length && !sameSet(fields.SIDE_EFFECTS, code.side_effects)) push('SIDE_EFFECTS', fields.SIDE_EFFECTS, code.side_effects)
  if (code.guard && fields.GUARD !== code.guard) push('GUARD', fields.GUARD, code.guard)
  if (code.probe_result && fields.PROBE_RESULT !== code.probe_result) push('PROBE_RESULT', fields.PROBE_RESULT, code.probe_result)
  if (code.control && fields.CONTROL !== code.control) push('CONTROL', fields.CONTROL, code.control)
  if (code.file && typeof fields.SERVICE === 'string' && fields.SERVICE.split(':')[0] !== code.file) push('SERVICE', fields.SERVICE, code.file)
  return out
}

function buildFunctions({ functionSpecs, functionsManifest, crons, corpusPaths, problems }) {
  const codeFns = new Map((functionsManifest?.functions ?? []).filter((f) => f && typeof f.id === 'string').map((f) => [f.id, f]))
  const functions = []
  const seen = new Map()
  for (const s of functionSpecs) {
    const file = s.path
    if (!s.verdict.typecheckOk || s.verdict.discarded > 0 || !s.verdict.hirOk) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(s.verdict)})`)
    problems.push(...checkSchema(s.consts, FUNCTION_REQUIRED, {}, file))
    const f = plain(s.consts)
    if (f.KIND !== 'function') problems.push(`${file}: KIND must be "function"`)
    const slug = file.replace(/^specs\/functions\//, '').replace(/\.t27$/, '')
    if (typeof f.ID === 'string') {
      if (seen.has(f.ID)) problems.push(`${file}: duplicate function ID ${f.ID} (also ${seen.get(f.ID)})`)
      seen.set(f.ID, file)
      if (f.ID !== slug) problems.push(`${file}: ID must equal the file name (${slug}), is ${JSON.stringify(f.ID)}`)
    }
    const expectModule = `fn_${slug.replace(/[^A-Za-z0-9]+/g, '_')}`
    if (s.moduleName && s.moduleName !== expectModule) problems.push(`${file}: module must be ${expectModule}, is ${s.moduleName}`)
    if (f.TRIGGER !== undefined && !FN_TRIGGERS.includes(f.TRIGGER)) problems.push(`${file}: TRIGGER ${JSON.stringify(f.TRIGGER)} is not one of ${FN_TRIGGERS.join('|')}`)
    if (f.ON_FAILURE !== undefined && !FN_ON_FAILURE.includes(f.ON_FAILURE)) problems.push(`${file}: ON_FAILURE ${JSON.stringify(f.ON_FAILURE)} is not one of ${FN_ON_FAILURE.join('|')}`)
    if (f.PROBE_RESULT !== undefined && !FN_PROBE_RESULTS.includes(f.PROBE_RESULT)) problems.push(`${file}: PROBE_RESULT ${JSON.stringify(f.PROBE_RESULT)} is not one of ${FN_PROBE_RESULTS.join('|')}`)
    if (f.CONTROL !== undefined && !FN_CONTROLS.includes(f.CONTROL)) problems.push(`${file}: CONTROL ${JSON.stringify(f.CONTROL)} is not one of ${FN_CONTROLS.join('|')}`)
    for (const se of Array.isArray(f.SIDE_EFFECTS) ? f.SIDE_EFFECTS : []) if (!FN_SIDE_EFFECTS.includes(se)) problems.push(`${file}: SIDE_EFFECTS names ${JSON.stringify(se)}, not one of ${FN_SIDE_EFFECTS.join('|')}`)
    if (Array.isArray(f.SIDE_EFFECTS) && f.SIDE_EFFECTS.length === 0) problems.push(`${file}: SIDE_EFFECTS must name at least one value ("none" when a run touches nothing outside)`)
    if (f.TRIGGER === 'event') {
      if (f.EVENT === '') problems.push(`${file}: an event function needs EVENT`)
      if (f.CRON !== undefined && f.CRON !== '') problems.push(`${file}: an event function has EVENT, not CRON`)
    }
    if (f.TRIGGER === 'cron') {
      if (f.CRON === '') problems.push(`${file}: a cron function needs CRON`)
      if (f.EVENT !== undefined && f.EVENT !== '') problems.push(`${file}: a cron function has CRON, not EVENT`)
      if (Array.isArray(f.LEGACY_EVENTS) && f.LEGACY_EVENTS.length) problems.push(`${file}: a cron function has no LEGACY_EVENTS`)
    }
    if (typeof f.SAFE_PROBE === 'string' && f.SAFE_PROBE !== '') {
      try { JSON.parse(f.SAFE_PROBE) } catch { problems.push(`${file}: SAFE_PROBE is neither "" nor JSON`) }
    }
    const code = codeFns.get(f.ID) ?? null
    const differences = functionDifferences(f, code)
    // The cron card for the same schedule, when specs/crons states one.
    const cronSpec = f.TRIGGER === 'cron'
      ? (crons.find((c) => c.fields.HOST === 'inngest' && c.fields.REPO === f.REPO && c.fields.NAME === f.LEGACY_ID)?.id ?? null)
      : null
    const messages = [
      ...(code ? [] : [`no function ${f.ID} in ${FUNCTIONS_MANIFEST}`]),
      ...differences.map((d) => `${d.field} ${JSON.stringify(d.spec)} differs from the manifest (${JSON.stringify(d.code)})`),
      ...(code && code.deployed_2026_09_09 === false ? [`not on the production build probed ${functionsManifest?.probedAt ?? '2026-09-09'} (deployed_2026_09_09 false)`] : []),
      ...(f.TRIGGER === 'cron' && !cronSpec ? ['no cron card in specs/crons states this schedule'] : []),
    ]
    let health = 'ok'
    if (!code || differences.length) health = 'warn'
    functions.push({
      id: f.ID,
      specPath: file,
      summary: { en: f.SUMMARY_EN },
      name: { en: f.NAME },
      sha256: s.sha256,
      typecheckOk: s.verdict.typecheckOk,
      discarded: s.verdict.discarded,
      moduleName: s.moduleName,
      inSpecCorpus: corpusPaths.has(file),
      fields: f,
      code: code
        ? { legacyId: code.legacy_id ?? null, file: code.file || null, deployed: typeof code.deployed_2026_09_09 === 'boolean' ? code.deployed_2026_09_09 : null, probeResult: code.probe_result ?? null, retries: Number.isInteger(code.retries) ? code.retries : null, steps: Array.isArray(code.steps) ? code.steps.length : null, control: code.control ?? null }
        : null,
      witness: code ? 'spec+code' : 'spec-only',
      differences,
      cronSpec,
      health,
      messages,
    })
  }
  functions.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const codeOnlyFunctions = [...codeFns.keys()].filter((id) => !seen.has(id)).sort()
  return { functions, codeOnlyFunctions }
}

/**
 * The exact text of every u64/i64 constant. `literalValue` reads an integer as a
 * JS number, which is exact only below 2^53; the Gonka supply in ngonka is not.
 * A wide integer travels as its decimal string, never as a rounded number.
 */
export function wideIntegersOf(analysis) {
  const out = {}
  for (const d of (analysis.ast?.children ?? []).filter((n) => n.kind === 'ConstDecl' && /^[ui]64$/.test(n.type ?? ''))) {
    const raw = decodeBytes(d.children?.[0]?.value ?? '')
    if (/^-?\d+$/.test(raw)) out[d.name] = raw
  }
  return out
}

const verdictClean = (v) => v.typecheckOk && v.discarded === 0 && v.hirOk
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** catalog.t27, read once: its vocabularies, its field lists, and the family of each network directory. */
export function readProviderCatalog(spec, problems) {
  const file = spec.path
  if (!verdictClean(spec.verdict)) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(spec.verdict)})`)
  const c = plain(spec.consts)
  if (c.KIND !== 'providers-catalog') problems.push(`${file}: KIND must be "providers-catalog"`)
  for (const [name, words] of Object.entries(PROVIDER_WORDS)) {
    if (!sameList(c[name], words)) problems.push(`${file}: ${name} is ${JSON.stringify(c[name])}; agents-from-specs.mjs encodes the rules for ${JSON.stringify(words)} -- change both together`)
  }
  const lists = ['COMMON_FIELDS', ...Object.values(PROVIDER_FAMILY_FIELDS)]
  for (const name of lists) if (!Array.isArray(c[name])) problems.push(`${file}: ${name} must be a list of field names`)
  const named = lists.flatMap((name) => (Array.isArray(c[name]) ? c[name] : []))
  const twice = named.filter((n, i) => named.indexOf(n) !== i)
  if (twice.length) problems.push(`${file}: ${[...new Set(twice)].join(', ')} named in more than one field list`)
  if (!sameSet([...new Set(named)], Object.keys(PROVIDER_FIELD_SHAPES))) problems.push(`${file}: the field lists name ${JSON.stringify([...named].sort())}, the generator's shape table ${JSON.stringify(Object.keys(PROVIDER_FIELD_SHAPES).sort())}`)
  // DIRECTORIES says which family lives under which network: "gonka/<slug>.t27 (FAMILY model: ...)".
  const familyOf = new Map()
  for (const d of Array.isArray(c.DIRECTORIES) ? c.DIRECTORIES : []) {
    const m = /^([a-z0-9-]+)\/<slug>\.t27 \(FAMILY ([a-z-]+):/.exec(d)
    if (!m) { problems.push(`${file}: DIRECTORIES entry ${JSON.stringify(d)} does not read "<network>/<slug>.t27 (FAMILY <family>: ..."`); continue }
    familyOf.set(m[1], m[2])
  }
  for (const n of Array.isArray(c.NETWORKS) ? c.NETWORKS : []) {
    if (!familyOf.has(n)) problems.push(`${file}: NETWORKS names ${n}, DIRECTORIES gives it no family`)
    else if (!(c.FAMILIES ?? []).includes(familyOf.get(n))) problems.push(`${file}: DIRECTORIES gives ${n} the family ${familyOf.get(n)}, not one of FAMILIES`)
  }
  for (const n of familyOf.keys()) if (!(c.NETWORKS ?? []).includes(n)) problems.push(`${file}: DIRECTORIES names ${n}, which is not in NETWORKS`)
  return { fields: c, familyOf }
}

/** One provider card: the catalog's schema, then the rules catalog.t27 states in STATUS_RULE, WITNESS_RULE and CALL_RULE. */
function providerCard(s, cat, problems) {
  const file = s.path
  const { fields: c, familyOf } = cat
  if (!verdictClean(s.verdict)) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(s.verdict)})`)
  const rel = file.slice(PROVIDER_SPEC_DIR.length + 1).replace(/\.t27$/, '')
  const network = rel.split('/')[0]
  const family = familyOf.get(network)
  const own = c[PROVIDER_FAMILY_FIELDS[family]] ?? []
  const required = Object.fromEntries([...(c.COMMON_FIELDS ?? []), ...own].map((n) => [n, PROVIDER_FIELD_SHAPES[n] ?? 'str']))
  problems.push(...checkSchema(s.consts, required, {}, file))
  const f = plain(s.consts)
  if (f.KIND !== 'provider') problems.push(`${file}: KIND must be "provider"`)
  if (f.ID !== rel) problems.push(`${file}: ID must be the path under ${PROVIDER_SPEC_DIR} without .t27 (${rel}), is ${JSON.stringify(f.ID)}`)
  const expectModule = `provider_${rel.replace(/[^A-Za-z0-9]+/g, '_')}`
  if (s.moduleName && s.moduleName !== expectModule) problems.push(`${file}: module must be ${expectModule}, is ${s.moduleName}`)
  if (f.FAMILY !== family) problems.push(`${file}: FAMILY must be ${family} under ${network}/, is ${JSON.stringify(f.FAMILY)}`)
  if (f.NETWORK !== network) problems.push(`${file}: NETWORK must be ${network}, is ${JSON.stringify(f.NETWORK)}`)
  if (!(c.STATUSES ?? []).includes(f.STATUS)) problems.push(`${file}: STATUS ${JSON.stringify(f.STATUS)} is not one of ${(c.STATUSES ?? []).join('|')}`)
  if (!(c.WITNESSES ?? []).includes(f.WITNESS)) problems.push(`${file}: WITNESS ${JSON.stringify(f.WITNESS)} is not one of ${(c.WITNESSES ?? []).join('|')}`)
  if (typeof f.CHECKED === 'string' && !DATE_RE.test(f.CHECKED)) problems.push(`${file}: CHECKED must be YYYY-MM-DD, is ${JSON.stringify(f.CHECKED)}`)
  if (Array.isArray(f.SOURCES) && f.SOURCES.length === 0) problems.push(`${file}: SOURCES must name where the card was read from`)
  const statusOf = (code) => (c.STATUSES ?? [])[code]
  const messages = []
  if (family === 'model') {
    // model_status: serving exactly when a host of EPOCH serves it.
    const want = f.HOSTS > 0 ? statusOf(c.STATUS_SERVING) : statusOf(c.STATUS_LISTED)
    if (f.STATUS !== want) problems.push(`${file}: HOSTS ${f.HOSTS} makes the STATUS ${want}, the card says ${f.STATUS}`)
    if (f.WITNESS !== 'chain-read') problems.push(`${file}: a model card is copied from the chain, WITNESS must be chain-read`)
    // hosts_allowed: a model outside poc_params.models has no hosts.
    if (!(f.POC_MODEL === true || f.HOSTS === 0)) problems.push(`${file}: POC_MODEL is false, so no host may serve it, but HOSTS is ${f.HOSTS}`)
    if (f.POC_MODEL === false && f.POC_WEIGHT_SCALE_E4 !== 0) problems.push(`${file}: POC_WEIGHT_SCALE_E4 is 0 when the model is not a PoC model`)
    if (Number.isInteger(f.VALIDATION_PERMILLE) && f.VALIDATION_PERMILLE > 1000) problems.push(`${file}: VALIDATION_PERMILLE ${f.VALIDATION_PERMILLE} is above 1000`)
    if (!(c.CALLS ?? []).includes(f.CALL)) problems.push(`${file}: CALL ${JSON.stringify(f.CALL)} is not one of ${(c.CALLS ?? []).join('|')}`)
    // FIELD_SOURCE_RULE: CONTEXT_TOKENS is the --max-model-len of the model_args the card copies.
    const args = Array.isArray(f.VLLM_ARGS) ? f.VLLM_ARGS : []
    const at = args.indexOf('--max-model-len')
    if (at >= 0 && args[at + 1] !== String(f.CONTEXT_TOKENS)) problems.push(`${file}: CONTEXT_TOKENS ${f.CONTEXT_TOKENS} differs from --max-model-len ${args[at + 1]} in VLLM_ARGS`)
    if (f.STATUS === statusOf(c.STATUS_LISTED)) messages.push(f.POC_MODEL ? `on chain, no host of epoch ${f.EPOCH} serves it` : `on chain, removed from the PoC models: no host of epoch ${f.EPOCH} serves it`)
  } else if (family === 'host-class') {
    // host_status: measured exactly when a bench record exists; a design never claims one.
    const measured = Array.isArray(f.MEASURED) && f.MEASURED.length > 0
    const want = measured ? statusOf(c.STATUS_MEASURED) : statusOf(c.STATUS_PLANNED)
    if (f.STATUS !== want) problems.push(`${file}: MEASURED ${measured ? 'names records' : 'is empty'}, so STATUS must be ${want}, is ${f.STATUS}`)
    const wantWitness = measured ? 'bench-measured' : 'design-only'
    if (f.WITNESS !== wantWitness) problems.push(`${file}: MEASURED ${measured ? 'names records' : 'is empty'}, so WITNESS must be ${wantWitness}, is ${f.WITNESS}`)
    if (Array.isArray(f.GAPS) && f.GAPS.length === 0 && !measured) problems.push(`${file}: a design-only card says in GAPS what is missing`)
    if (!measured) messages.push('a design: nothing has run')
  } else {
    problems.push(`${file}: ${network}/ is not a network directory of ${PROVIDER_CATALOG_SPEC}`)
  }
  return { f, rel, network, family, messages }
}

function buildProviders({ providerSpecs, providerCatalogSpec, providerStudySpec, providerDirs = [], corpusPaths, problems }) {
  if (!providerCatalogSpec) {
    if (providerSpecs.length) problems.push(`${PROVIDER_SPEC_DIR}: provider cards without ${PROVIDER_CATALOG_SPEC}`)
    return { providers: [], catalog: null, study: null }
  }
  const cat = readProviderCatalog(providerCatalogSpec, problems)
  const c = cat.fields
  // A card in a directory the catalog does not name would be silently skipped; say so instead.
  for (const d of providerDirs) if (!(c.NETWORKS ?? []).includes(d)) problems.push(`${PROVIDER_SPEC_DIR}/${d}/: not a network of ${PROVIDER_CATALOG_SPEC} (NETWORKS ${JSON.stringify(c.NETWORKS)})`)
  const providers = []
  const seen = new Map()
  for (const s of providerSpecs) {
    const { f, network, family, messages } = providerCard(s, cat, problems)
    if (typeof f.ID === 'string') {
      if (seen.has(f.ID)) problems.push(`${s.path}: duplicate provider ID ${f.ID} (also ${seen.get(f.ID)})`)
      seen.set(f.ID, s.path)
    }
    const good = f.STATUS === (c.STATUSES ?? [])[c.STATUS_SERVING] || f.STATUS === (c.STATUSES ?? [])[c.STATUS_MEASURED]
    providers.push({
      id: f.ID,
      specPath: s.path,
      summary: { en: f.SUMMARY_EN },
      name: { en: f.NAME },
      sha256: s.sha256,
      typecheckOk: s.verdict.typecheckOk,
      discarded: s.verdict.discarded,
      moduleName: s.moduleName,
      inSpecCorpus: corpusPaths.has(s.path),
      fields: f,
      family,
      network,
      status: f.STATUS,
      witness: f.WITNESS,
      health: good ? 'ok' : 'warn',
      messages,
      searchText: [f.ID, f.NAME, f.SUMMARY_EN, f.MODEL_ID ?? '', f.DEVICE ?? '', f.STATUS, f.WITNESS, network].join(' ').toLowerCase().replace(/\s+/g, ' ').trim(),
    })
  }
  // Models first, by hosts served; then host classes, measured before planned.
  const familyRank = (p) => (c.FAMILIES ?? []).indexOf(p.family)
  providers.sort((a, b) => familyRank(a) - familyRank(b) || (b.fields.HOSTS ?? 0) - (a.fields.HOSTS ?? 0) || (c.STATUSES ?? []).indexOf(a.status) - (c.STATUSES ?? []).indexOf(b.status) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const catalog = {
    specPath: providerCatalogSpec.path,
    sha256: providerCatalogSpec.sha256,
    typecheckOk: providerCatalogSpec.verdict.typecheckOk,
    schemaVersion: c.SCHEMA_VERSION ?? null,
    families: c.FAMILIES, networks: c.NETWORKS, directories: c.DIRECTORIES, idRule: c.ID_RULE,
    commonFields: c.COMMON_FIELDS, modelFields: c.MODEL_FIELDS, hostFields: c.HOST_FIELDS, fieldSourceRule: c.FIELD_SOURCE_RULE,
    statuses: c.STATUSES, statusRule: c.STATUS_RULE, witnesses: c.WITNESSES, witnessRule: c.WITNESS_RULE, calls: c.CALLS, callRule: c.CALL_RULE,
  }
  return { providers, catalog, study: providerStudySpec ? buildProviderStudy(providerStudySpec, providers, problems) : null }
}

/**
 * The study (tri_gnk_pair.t27) as the page shows it: every constant as declared, a
 * wide integer as its exact decimal string. The derived numbers are the arithmetic
 * the study's own `test` blocks pin (t27c test-report), computed with BigInt.
 */
function buildProviderStudy(spec, providers, problems) {
  const file = spec.path
  if (!verdictClean(spec.verdict)) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(spec.verdict)})`)
  for (const [name, shape] of Object.entries(PROVIDER_STUDY_REQUIRED)) {
    if (!(name in spec.consts)) { problems.push(`${file}: missing ${name}`); continue }
    const bad = shapeProblem(spec.consts[name], shape)
    if (bad) problems.push(`${file}: ${name}: ${bad}`)
  }
  const fields = { ...plain(spec.consts), ...(spec.wide ?? {}) }
  if (fields.KIND !== 'providers-study') problems.push(`${file}: KIND must be "providers-study"`)
  const id = file.replace(/^specs\//, '').replace(/\.t27$/, '')
  if (fields.ID !== id) problems.push(`${file}: ID must be ${id}, is ${JSON.stringify(fields.ID)}`)
  if (typeof fields.CHECKED === 'string' && !DATE_RE.test(fields.CHECKED)) problems.push(`${file}: CHECKED must be YYYY-MM-DD`)
  const big = (name) => (typeof fields[name] === 'string' && /^\d+$/.test(fields[name]) ? BigInt(fields[name]) : null)
  const ceilDiv = (a, b) => (Number.isInteger(a) && Number.isInteger(b) && b > 0 ? Math.ceil(a / b) : null)
  const subsidies = big('TOTAL_SUBSIDIES_NGONKA'), fees = big('TOTAL_FEES_NGONKA'), height = big('CHAIN_HEIGHT'), until = big('ALLOWLIST_UNTIL_HEIGHT')
  const derived = {
    allowlistActive: height !== null && until !== null ? height < until : null,
    subsidyPerFee: subsidies !== null && fees ? String(subsidies / fees) : null,
    vestingDays: Number.isInteger(fields.VESTING_EPOCHS) && Number.isInteger(fields.EPOCH_SECONDS_MEASURED) ? Math.floor((fields.VESTING_EPOCHS * fields.EPOCH_SECONDS_MEASURED) / 86400) : null,
    consumerCardsPerNode: {
      smallest: ceilDiv(fields.SMALLEST_POC_MODEL_GB, fields.CONSUMER_CARD_GB),
      mostServed: ceilDiv(fields.MOST_SERVED_MODEL_GB, fields.CONSUMER_CARD_GB),
      largest: ceilDiv(fields.LARGEST_POC_MODEL_GB, fields.CONSUMER_CARD_GB),
    },
  }
  // The study and the cards were read on the same day from the same chain: they agree, or the page says which is stale.
  const models = providers.filter((p) => p.family === 'model')
  const epochs = [...new Set(models.map((p) => p.fields.EPOCH))]
  if (models.length && (epochs.length !== 1 || epochs[0] !== fields.EPOCH)) problems.push(`${file}: EPOCH ${fields.EPOCH}, the model cards read epoch(s) ${epochs.join(', ')}`)
  const pocVram = models.filter((p) => p.fields.POC_MODEL).map((p) => p.fields.VRAM_GB)
  const busiest = [...models].sort((a, b) => b.fields.HOSTS - a.fields.HOSTS)[0]
  if (busiest && busiest.fields.VRAM_GB !== fields.MOST_SERVED_MODEL_GB) problems.push(`${file}: MOST_SERVED_MODEL_GB ${fields.MOST_SERVED_MODEL_GB}, the most served card (${busiest.id}) needs ${busiest.fields.VRAM_GB} GB`)
  if (busiest && busiest.fields.HOSTS > fields.ACTIVE_HOSTS) problems.push(`${file}: ACTIVE_HOSTS ${fields.ACTIVE_HOSTS}, but ${busiest.id} has ${busiest.fields.HOSTS} hosts`)
  if (pocVram.length && (Math.min(...pocVram) !== fields.SMALLEST_POC_MODEL_GB || Math.max(...pocVram) !== fields.LARGEST_POC_MODEL_GB)) problems.push(`${file}: SMALLEST/LARGEST_POC_MODEL_GB ${fields.SMALLEST_POC_MODEL_GB}/${fields.LARGEST_POC_MODEL_GB}, the PoC model cards span ${Math.min(...pocVram)}..${Math.max(...pocVram)} GB`)
  return { id, specPath: file, sha256: spec.sha256, typecheckOk: spec.verdict.typecheckOk, moduleName: spec.moduleName, fields, derived }
}

/**
 * The t27 ref the agents' SOUL / AGENTS.md / alphabet links point at: the commit
 * the experience snapshot was read from (its `sources` carry `repo: 't27'`), or
 * the default branch when no snapshot pins one. The source is recorded so the
 * page can say which it is.
 */
export function agentPin(experience) {
  const t27 = (experience?.sources ?? []).find((x) => x.repo === 't27' && /^[0-9a-f]{40}$/.test(x.commit ?? ''))
  if (t27) return { ref: t27.commit, source: `${EXPERIENCE_PATH} sources[t27].commit` }
  return { ref: 'master', source: 'default branch (no t27 commit in the experience snapshot)' }
}

export function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]))
  }
  return value
}

// ---------------------------------------------------------------------------
// The site.
// ---------------------------------------------------------------------------
function readSpecDir(dir) {
  const abs = join(SITE, CORPUS, dir)
  if (!existsSync(abs)) return []
  return readdirSync(abs)
    .filter((f) => f.endsWith('.t27'))
    .sort()
    .map((f) => ({ path: `${dir}/${f}`, text: readFileSync(join(abs, f), 'utf8') }))
}

function readToolSpecs() {
  return TOOL_SPEC_SUBDIRS.flatMap((sub) => readSpecDir(`${TOOL_SPEC_DIR}/${sub}`))
}

const readJson = (rel) => (existsSync(join(SITE, rel)) ? JSON.parse(readFileSync(join(SITE, rel), 'utf8')) : null)

export async function generate({ generatedAt } = {}) {
  const wasmBytes = readFileSync(join(SITE, WASM))
  const analyze = await loadCompiler(wasmBytes)
  const skillSpecs = analyzeSpecFiles(analyze, readSpecDir(SKILL_SPEC_DIR))
  const cronSpecs = analyzeSpecFiles(analyze, readSpecDir(CRON_SPEC_DIR))
  const agentSpecs = analyzeSpecFiles(analyze, readSpecDir(AGENT_SPEC_DIR))
  const functionSpecs = analyzeSpecFiles(analyze, readSpecDir(FUNCTION_SPEC_DIR))
  const toolSpecs = analyzeSpecFiles(analyze, readToolSpecs())
  // The catalog names the network directories; every sub-directory is listed so that a
  // card in one the catalog does not name is reported, not skipped.
  const providerRoot = join(SITE, CORPUS, PROVIDER_SPEC_DIR)
  const providerDirs = existsSync(providerRoot) ? readdirSync(providerRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : []
  const readOne = (rel) => (existsSync(join(SITE, CORPUS, rel)) ? { path: rel, text: readFileSync(join(SITE, CORPUS, rel), 'utf8') } : null)
  const catalogFile = readOne(PROVIDER_CATALOG_SPEC)
  const studyFile = readOne(PROVIDER_STUDY_SPEC)
  const providerCatalogSpec = catalogFile ? analyzeSpecFiles(analyze, [catalogFile])[0] : null
  const providerStudySpec = studyFile ? { ...analyzeSpecFiles(analyze, [studyFile])[0], wide: wideIntegersOf(analyze(studyFile.text)) } : null
  const networks = providerCatalogSpec && Array.isArray(plain(providerCatalogSpec.consts).NETWORKS) ? plain(providerCatalogSpec.consts).NETWORKS : []
  const providerSpecs = analyzeSpecFiles(analyze, networks.flatMap((n) => readSpecDir(`${PROVIDER_SPEC_DIR}/${n}`)))
  const i18nSpecs = analyzeSpecFiles(analyze, readSpecDir(I18N_SPEC_DIR))
  // Each contract names its bundle; load exactly those, repo-relative.
  const bundles = new Map()
  for (const s of i18nSpecs) {
    const path = plain(s.consts).BUNDLE_PATH
    if (typeof path !== 'string' || path.includes('..')) continue
    const abs = join(REPO_ROOT, path)
    if (existsSync(abs)) { try { bundles.set(path, JSON.parse(readFileSync(abs, 'utf8'))) } catch { bundles.set(path, null) } }
  }
  const epoch = process.env.SOURCE_DATE_EPOCH
  const stamp = generatedAt ?? (epoch ? new Date(Number(epoch) * 1000).toISOString() : new Date().toISOString())
  return buildSpecCatalogs({
    skillSpecs,
    cronSpecs,
    agentSpecs,
    functionSpecs,
    toolSpecs,
    providerSpecs,
    providerCatalogSpec,
    providerStudySpec,
    providerDirs,
    casts: readCasts(),
    experience: readJson(EXPERIENCE_PATH),
    skillsManifest: readJson('public/skills/manifest.json'),
    cronsManifest: readJson('public/crons/manifest.json'),
    functionsManifest: readJson(FUNCTIONS_MANIFEST),
    t27Manifest: readJson('public/t27/manifest.json'),
    railway: readJson('scripts/railway-services.json'),
    i18nSpecs,
    bundles,
    compilerWasmSha256: sha256(wasmBytes),
    generatedAt: stamp,
  })
}

function writeAtomic(rel, data) {
  const dest = join(SITE, rel)
  mkdirSync(dirname(dest), { recursive: true })
  const temp = `${dest}.${process.pid}.tmp`
  writeFileSync(temp, `${JSON.stringify(data)}\n`, { flag: 'wx' })
  renameSync(temp, dest)
}

async function main(argv) {
  const check = argv.includes('--check')
  const { skills, crons, agents, functions, tools, providers, problems } = await generate()
  if (problems.length) {
    console.error(`agents-from-specs: ${problems.length} problem(s)`)
    for (const p of problems) console.error('  ' + p)
    process.exit(1)
  }
  if (check) {
    const prior = { skills: readJson(SKILLS_OUT), crons: readJson(CRONS_OUT), agents: readJson(AGENTS_OUT), functions: readJson(FUNCTIONS_OUT), tools: readJson(TOOLS_OUT), providers: readJson(PROVIDERS_OUT) }
    const drift = []
    if (prior.skills?.contentSha256 !== skills.contentSha256) drift.push(SKILLS_OUT)
    if (prior.crons?.contentSha256 !== crons.contentSha256) drift.push(CRONS_OUT)
    if (prior.agents?.contentSha256 !== agents.contentSha256) drift.push(AGENTS_OUT)
    if (prior.functions?.contentSha256 !== functions.contentSha256) drift.push(FUNCTIONS_OUT)
    if (prior.tools?.contentSha256 !== tools.contentSha256) drift.push(TOOLS_OUT)
    if (prior.providers?.contentSha256 !== providers.contentSha256) drift.push(PROVIDERS_OUT)
    for (const p of splitToolCatalog(tools).parts) if (sha256(JSON.stringify(readJson(p.path)?.tools ?? null)) !== p.sha256) drift.push(p.path)
    if (drift.length) {
      console.error(`agents-from-specs: committed output is stale: ${drift.join(', ')} -- run node scripts/agents-from-specs.mjs`)
      process.exit(1)
    }
    console.log(`agents-from-specs: ${SKILLS_OUT}, ${CRONS_OUT}, ${AGENTS_OUT}, ${FUNCTIONS_OUT}, ${TOOLS_OUT} and ${PROVIDERS_OUT} match the specs`)
    return
  }
  writeAtomic(SKILLS_OUT, skills)
  writeAtomic(CRONS_OUT, crons)
  writeAtomic(AGENTS_OUT, agents)
  writeAtomic(FUNCTIONS_OUT, functions)
  const split = splitToolCatalog(tools)
  for (const p of split.parts) writeAtomic(p.path, p.body)
  writeAtomic(TOOLS_OUT, split.main)
  writeAtomic(PROVIDERS_OUT, providers)
  const s = skills.counts, c = crons.counts, a = agents.counts, fn = functions.counts, t = tools.counts
  console.log(`agents-from-specs: skills ${s.specs} specs (typecheck ok ${s.typecheckOk}/${s.specs}; spec+code ${s.specPlusCode}, spec-only ${s.specOnly}, code-only ${s.codeOnly}) -> ${SKILLS_OUT}`)
  console.log(`agents-from-specs: crons  ${c.specs} specs (typecheck ok ${c.typecheckOk}/${c.specs}; spec+code ${c.specPlusCode}, spec-only ${c.specOnly}, code-only ${c.codeOnly}; with RUNS ${c.withRuns}) -> ${CRONS_OUT}`)
  console.log(`agents-from-specs: agents ${a.specs} specs (typecheck ok ${a.typecheckOk}/${a.specs}; enabled ${a.enabled}; with skills ${a.withSkills}, with crons ${a.withCrons}, with tools ${a.withTools}; spec+experience ${a.specPlusExperience}, spec-only ${a.specOnly}; episodes attributed ${a.episodesAttributed}, unattributed ${a.episodesUnattributed ?? 'n/a'}; links pinned at ${agents.pin.ref.slice(0, 7)}) -> ${AGENTS_OUT}`)
  console.log(`agents-from-specs: functions ${fn.specs} specs (typecheck ok ${fn.typecheckOk}/${fn.specs}; spec+code ${fn.specPlusCode}, spec-only ${fn.specOnly}, code-only ${fn.codeOnly}; deployed ${fn.deployed}, not deployed ${fn.notDeployed}, unknown ${fn.deployUnknown}; with differences from the manifest ${fn.withDifferences}; cron cards joined ${fn.withCronSpec}/${fn.byTrigger.cron}) -> ${FUNCTIONS_OUT}`)
  console.log(`agents-from-specs: tools  ${t.specs} specs (tri ${t.tri} commands, ${t.triActions} actions; mcp ${t.mcp} servers, ${t.mcpTools} tools, ${t.mcpExternal} external; typecheck ok ${t.typecheckOk}/${t.specs}; with agents ${t.withAgents}, with skills ${t.withSkills}, with a recorded run ${t.withCast}; witness ${Object.entries(t.byWitness).map(([k, v]) => `${k} ${v}`).join(', ')}) -> ${TOOLS_OUT}`)
  const pv = providers.counts
  console.log(`agents-from-specs: providers ${pv.specs} specs (typecheck ok ${pv.typecheckOk}/${pv.specs}; ${Object.entries(pv.byNetwork).map(([k, v]) => `${k} ${v}`).join(', ')}; ${Object.entries(pv.byStatus).map(([k, v]) => `${k} ${v}`).join(', ')}; study ${providers.study ? providers.study.id : 'none'}) -> ${PROVIDERS_OUT}`)
  for (const l of skills.i18n) console.log(`agents-from-specs: i18n ${l.locale} via ${l.spec} -> ${l.bundle}: skills ${l.coverage.n}/${l.coverage.total}, crons ${crons.i18n.find((x) => x.locale === l.locale)?.coverage.n ?? 0}/${crons.counts.specs}, agents ${agents.i18n.find((x) => x.locale === l.locale)?.coverage.n ?? 0}/${agents.counts.specs}, functions ${functions.i18n.find((x) => x.locale === l.locale)?.coverage.n ?? 0}/${functions.counts.specs}, tools ${tools.i18n.find((x) => x.locale === l.locale)?.coverage.n ?? 0}/${tools.counts.specs}${l.enabled ? '' : ' (disabled)'}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => { console.error(e); process.exit(1) })
}
