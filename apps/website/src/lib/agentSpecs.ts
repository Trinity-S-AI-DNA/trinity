// The spec-first side of the skills and crons catalogs.
//
// public/skills/spec-skills.json and public/crons/spec-crons.json are written
// at prebuild by scripts/agents-from-specs.mjs from the .t27 files under
// public/t27/files/specs/{skills,crons}/, through the real compiler. This file
// is the one place the page reads them, and the one place the management
// strip's facts are derived: where the canonical spec is edited, where the
// vendored copy lives, where "run now" goes for each host, and whether a live
// control plane is configured at all. Every helper is a pure function of the
// entry and the environment; nothing here guesses a URL the spec does not
// justify.

export type Witness = 'spec+code' | 'spec-only' | 'code-only'
/** An agent's witness: at least one experience episode names its letter, or none does. */
export type AgentWitness = 'spec+experience' | 'spec-only'
export type Health = 'ok' | 'warn' | 'fail'
export type CronHostKind = 'github-actions' | 'inngest' | 'railway-cron' | 'timer' | 'launchd'
export type CronControl = 'github-actions-dispatch' | 'railway-dashboard' | 'inngest-dashboard' | 'code-only'

export interface SkillSpecFields {
  KIND: 'skill'
  ID: string
  NAME: string
  REPO: string
  SOURCE: string
  SUMMARY_EN: string
  COMMAND: string
  SPECS: string[]
  TAGS: string[]
  ENABLED: boolean
  TIMEOUT_MIN: number
}

export interface CronSpecFields {
  KIND: 'cron'
  ID: string
  NAME: string
  HOST: CronHostKind
  REPO: string
  SERVICE: string
  SUMMARY_EN: string
  SCHEDULE?: string
  SCHEDULE_NOTE?: string
  INTERVAL_MS?: number
  TZ: string
  RUNS: string[]
  RUNS_NOTE: string
  ENABLED: boolean
  NOTE?: string
  ON_FAILURE: 'issue' | 'log' | 'unknown'
  CONTROL: CronControl
}

interface SpecEntryBase {
  id: string
  /** Corpus-relative, e.g. `specs/skills/trinity-doctor.t27`. */
  specPath: string
  /**
   * SUMMARY_EN and NAME by locale. `en` is the spec text. Every other key is a
   * translation connected through a contract spec (specs/i18n/agents-<locale>.t27)
   * whose bundle the generator loaded; a locale with no entry for this spec is
   * simply absent, and the catalog's `i18n` list says which contract each
   * locale came from. Specs themselves are English-only (t27 LANG-EN).
   */
  summary: Localized
  name: Localized
  sha256: string
  typecheckOk: boolean
  discarded: number
  moduleName: string | null
  /** Whether public/t27/manifest.json (the vendored corpus index) lists this path yet. */
  inSpecCorpus: boolean
  witness: Exclude<Witness, 'code-only'>
  health: Health
  messages: string[]
}

export interface SkillSpecEntry extends SpecEntryBase {
  fields: SkillSpecFields
  code: { path: string; sha256: string; health: Health; link: string } | null
  /** Cron ids whose RUNS name this skill. */
  runBy: string[]
}

export interface CronSpecEntry extends SpecEntryBase {
  fields: CronSpecFields
  code: { where: { file: string | null; line: number | null; host: string | null; service: string | null }; sourceUrl: string | null; health: Health; kind: CronHostKind; repoPrivate: boolean } | null
  runs: string[]
  runsResolved: { id: string; ok: boolean }[]
  control: CronControl
  /** Resolved at build time by the generator from scripts/railway-services.json. */
  runNow: RunNowTarget
}

export type AgentLayer = 'Archetypal' | 'Spiritual' | 'Physical'

export interface AgentSpecFields {
  KIND: 'agent'
  ID: string
  LETTER: string
  ORDINAL: number
  LETTER_NAME: string
  NAME: string
  DOMAIN: string
  ARCHETYPE: string
  REGISTER: string
  LAYER: AgentLayer
  SUMMARY_EN: string
  SOUL: string
  AGENTS_DOC: string
  ALPHABET: string
  KEY_FILES: string[]
  ENTRY_INVARIANT: string
  EXIT_INVARIANT: string
  AR_ROLE: string
  SKILLS: string[]
  SKILLS_NOTE: string
  TOOLS?: string[]
  TOOLS_NOTE?: string
  EXPERIENCE_LOG: string
  ENABLED: boolean
}

/** The slice of public/agents/experience.json joined to one agent by LETTER. */
export interface AgentExperience {
  episodes: number
  first: string | null
  last: string | null
  lastTask: string | null
  outcomes: Record<string, number>
  lessons: string[]
  files: string[]
}

export interface AgentSpecEntry extends Omit<SpecEntryBase, 'witness'> {
  letter: string
  ordinal: number
  fields: AgentSpecFields
  skills: { id: string; ok: boolean }[]
  /** Derived: crons whose RUNS name one of this agent's SKILLS. */
  crons: string[]
  tools: { id: string; ok: boolean }[]
  experience: AgentExperience
  links: { soul: string; agentsDoc: string; alphabet: string; experienceLog: string | null; pinnedAt: string; pinSource: string }
  witness: AgentWitness
}

// Layer 5: the Inngest functions of 999-multibots-telegraf (specs/functions/<id>.t27),
// witnessed by the vendored functions manifest at public/functions/manifest.json.
export type FunctionTrigger = 'event' | 'cron'
export type FunctionOnFailure = 'admin-telegram' | 'log' | 'refund+notify'
export type FunctionSideEffect = 'charges-balance' | 'paid-api' | 'messages-user' | 'messages-owners' | 'messages-admin' | 'db-write' | 'external-webhook' | 'none'
export type FunctionProbeResult = 'COMPLETED' | 'FAILED-at-guard' | 'skipped' | 'not-deployed'

export interface FunctionSpecFields {
  KIND: 'function'
  ID: string
  LEGACY_ID: string
  NAME: string
  REPO: string
  /** `file:line` of the `createFunction(` call, repo-relative. */
  SERVICE: string
  DOMAIN: string
  TRIGGER: FunctionTrigger
  EVENT: string
  LEGACY_EVENTS: string[]
  CRON: string
  TZ: string
  SUMMARY_EN: string
  STEPS: string[]
  RETRIES: number
  ON_FAILURE: FunctionOnFailure
  SIDE_EFFECTS: FunctionSideEffect[]
  GUARD: string
  /** JSON of the safe-mode payload, or "" when no probe was sent. */
  SAFE_PROBE: string
  PROBE_RESULT: FunctionProbeResult
  CONTROL: Witness
  NOTE: string
}

/** One field where the spec and the manifest entry read different values. */
export interface FunctionDifference { field: string; spec: unknown; code: unknown }

export interface FunctionSpecEntry extends SpecEntryBase {
  fields: FunctionSpecFields
  /** The manifest entry with the same id, or null when the manifest does not list it. */
  code: { legacyId: string | null; file: string | null; deployed: boolean | null; probeResult: string | null; retries: number | null; steps: number | null; control: string | null } | null
  differences: FunctionDifference[]
  /** The cron card (specs/crons) that states the same schedule, joined by REPO + LEGACY_ID; null when none does. */
  cronSpec: string | null
}

export interface FunctionSpecCatalog extends SpecCatalogBase {
  counts: {
    specs: number; specPlusCode: number; specOnly: number; codeOnly: number; typecheckOk: number
    deployed: number; notDeployed: number; deployUnknown: number; withCronSpec: number; withDifferences: number
    byTrigger: Record<FunctionTrigger, number>; byDomain: Record<string, number>; bySideEffect: Record<FunctionSideEffect, number>; byProbeResult: Record<FunctionProbeResult, number>
  }
  ladder: LadderCounts
  manifest: { repo: string | null; generatedFrom: { branch?: string; commit?: string; note?: string } | null; probedAt: string | null; deployedApp: { name?: string; sdk?: string; baseFunctions?: number; mainRegisters?: number } | null; entries: number } | null
  functions: FunctionSpecEntry[]
}

export type Localized = { en: string } & Partial<Record<string, string>>

/** One translation contract (a specs/i18n/*.t27) as it applies to one catalog. */
export interface I18nContract {
  locale: string
  /** Corpus path of the contract spec, e.g. `specs/i18n/agents-ru.t27`. */
  spec: string
  sha256: string
  /** Repo-relative path of the bundle the spec points to. */
  bundle: string
  enabled: boolean
  fields: string[]
  scope: string[]
  coverage: { n: number; total: number }
  /** Spec ids in this catalog with no entry in the bundle. */
  missing: string[]
}

interface SpecCatalogBase {
  version: number
  generatedAt: string
  compilerWasmSha256: string
  contentSha256: string
  codeOnly: string[]
  i18n: I18nContract[]
}

export interface SkillSpecCatalog extends SpecCatalogBase {
  counts: { specs: number; specPlusCode: number; specOnly: number; codeOnly: number; typecheckOk: number; runBy: number }
  ladder: LadderCounts
  skills: SkillSpecEntry[]
}

export interface CronSpecCatalog extends SpecCatalogBase {
  counts: { specs: number; specPlusCode: number; specOnly: number; codeOnly: number; typecheckOk: number; withRuns: number; byHost: Record<CronHostKind, number> }
  ladder: LadderCounts
  crons: CronSpecEntry[]
}

export interface AgentSpecCatalog extends Omit<SpecCatalogBase, 'codeOnly'> {
  counts: {
    specs: number; enabled: number; typecheckOk: number; withSkills: number; withCrons: number; withTools: number; withExperience: number; withArRole: number
    specPlusExperience: number; specOnly: number; byLayer: Record<AgentLayer, number>
    episodesAttributed: number; episodesUnattributed: number | null; episodesTotal: number | null
  }
  /** Specs -> Skills -> Crons -> Agents -> Tools -> Functions -> Providers, the counts the ladder header shows. */
  ladder: LadderCounts
  pin: { ref: string; source: string }
  experienceSnapshot: {
    generatedAt: string
    sources: { repo: string; commit: string; files: number; episodes: number; unreadable: number }[]
    counts: { episodes: number; attributed: number; unattributed: number; agentsWithEpisodes: number; unreadableFiles: number } | null
    attribution: { fields: string[]; letters: string[]; rule: string } | null
  } | null
  agents: AgentSpecEntry[]
}

export interface LadderCounts { specs: number | null; skills: number; crons: number; agents: number; tools: number; functions: number; providers: number }

// ---------------------------------------------------------------------------
// Layer 5: tools (public/tools/spec-tools.json). Two families, never merged:
// `tri-cli` (one card per clap variant of gHashTag/t27 `tri`, read from the
// source -- witness `source-parse` -- or diffed against `tri --help` --
// `help-output`) and `mcp` (one card per MCP server registered in either repo).
// Schema 2 added `registry-export` (read from an artifact the binary exported)
// and `runtime`; the list is scripts/agents-from-specs.mjs TOOL_WITNESSES, and a
// witness missing here is a type error in WITNESS_LABEL rather than a blank tab.
// ---------------------------------------------------------------------------
export type ToolFamily = 'tri-cli' | 'mcp'
/** scripts/agents-from-specs.mjs TOOL_REPOS; gHashTag/BrowserOS holds the trios loop `tri` (specs/tools/trios/tri). */
export type ToolRepo = 'gHashTag/t27' | 'gHashTag/trinity' | 'gHashTag/BrowserOS'
export type ToolWitness = 'source-parse' | 'registry-export' | 'help-output' | 'runtime'

interface ToolEntryBase {
  id: string
  specPath: string
  summary: Localized
  name: Localized
  sha256: string
  typecheckOk: boolean
  discarded: number
  moduleName: string
  inSpecCorpus: boolean
  family: ToolFamily
  repo: ToolRepo
  source: string
  aboutSource: string
  agents: { letter: string; ok: boolean }[]
  /** Skills whose own spec text (COMMAND / SUMMARY_EN) names this command. */
  skills: { id: string; via: string[] }[]
  links: { source: string; config: string | null; pinnedAt: string }
  witness: ToolWitness
  /** The recorded run the card ends with (CAST = term/<id>/session.cast), null when it names none.
   *  scripts/agents-from-specs.mjs castProblems() holds it: the files exist, asciicast v2, every exit 0,
   *  and `commands` are the recorded lines that run this card's command. It never upgrades the witness. */
  cast: ToolCast | null
  health: Health
  messages: string[]
  searchText: string
}

export interface ToolCast { id: string; src: string; share: string; title: string; recorded: string | null; commands: string[] }

export interface TriToolEntry extends ToolEntryBase {
  family: 'tri-cli'
  command: string
  variant: string
  entry: string
  actions: { name: string; about: string }[]
  args: { name: string; about: string }[]
  whenToUse: string
  /** Only on cards of the trios loop CLI (specs/tools/trios/tri): read from trios/bin/tri at SOURCE_COMMIT. */
  trios?: { documented: boolean; category: string; dispatch: string; helpLine: string; routed: boolean }
  /** Only on generated cards of the Trinity Zig tri (specs/tools/trinity/cli): the dispatcher's parser aliases and
   *  whether src/registry/command_table.zig lists the command, read at SOURCE_COMMIT (qa/tri-commands/trinity.json). */
  trinityCli?: { aliases: string[]; inRegistry: boolean }
  fields: Record<string, unknown> & { ID: string; KIND: 'tool'; FAMILY: 'tri-cli'; COMMAND: string; SOURCE: string; ABOUT: string; ABOUT_SOURCE: string; ACTIONS: string[]; AGENTS: string[]; AGENTS_NOTE: string; WHEN_TO_USE: string; WITNESS: ToolWitness; ENABLED: boolean }
}

export interface McpToolEntry extends ToolEntryBase {
  family: 'mcp'
  server: string
  serverVersion: string
  transport: 'stdio' | 'http'
  launch: string
  env: string[]
  config: string
  tools: { name: string; about: string; inputs: string[] }[]
  resources: { path: string; about: string }[]
  toolsNote: string
  external: boolean
  fields: Record<string, unknown> & { ID: string; KIND: 'tool'; FAMILY: 'mcp'; SERVER: string; TRANSPORT: string; LAUNCH: string; CONFIG: string; REPO: string; SOURCE: string; ABOUT: string; ABOUT_SOURCE: string; TOOLS: string[]; RESOURCES: string[]; TOOLS_NOTE: string; EXTERNAL: boolean; AGENTS: string[]; AGENTS_NOTE: string; WITNESS: ToolWitness; ENABLED: boolean }
}

export type ToolSpecEntry = TriToolEntry | McpToolEntry

export interface ToolSpecCatalog extends Omit<SpecCatalogBase, 'codeOnly'> {
  counts: {
    specs: number; tri: number; mcp: number; typecheckOk: number; enabled: number; withAgents: number; withSkills: number
    triWithActions: number; triActions: number; mcpWithTools: number; mcpTools: number; mcpExternal: number
    byWitness: Record<ToolWitness, number>; byRepo: Record<ToolRepo, number>
  }
  groups: { triByAgent: Record<string, string[]>; mcpByRepo: Record<string, string[]> }
  ladder: LadderCounts
  pin: { ref: string; source: string }
  tools: ToolSpecEntry[]
}

// ---------------------------------------------------------------------------
// Layer 7: providers (public/providers/spec-providers.json). Two families from
// specs/providers/catalog.t27: `model` (one card per model the Gonka chain lists,
// every number copied from a public chain endpoint) and `host-class` (a device a
// person could rent out to TRI-NET for $TRI). The vocabularies below are the
// catalog's; the generator fails the build if either side drifts.
// ---------------------------------------------------------------------------
export type ProviderFamily = 'model' | 'host-class'
export type ProviderNetwork = 'gonka' | 'trinet'
export type ProviderStatus = 'serving' | 'listed' | 'measured' | 'planned'
export type ProviderWitness = 'chain-read' | 'bench-measured' | 'design-only'
export type ProviderCall = 'needs-key' | 'none'

interface ProviderCommonFields {
  KIND: 'provider'
  ID: string
  FAMILY: ProviderFamily
  NETWORK: ProviderNetwork
  NAME: string
  SUMMARY_EN: string
  STATUS: ProviderStatus
  WITNESS: ProviderWitness
  CHECKED: string
  SOURCES: string[]
  NOTE: string
  ENABLED: boolean
}

export interface ProviderModelFields extends ProviderCommonFields {
  FAMILY: 'model'
  MODEL_ID: string
  HF_COMMIT: string
  CONTEXT_TOKENS: number
  VRAM_GB: number
  THROUGHPUT_PER_NONCE: number
  VALIDATION_PERMILLE: number
  POC_MODEL: boolean
  POC_WEIGHT_SCALE_E4: number
  HOSTS: number
  EPOCH: number
  UNITS_OF_COMPUTE_PER_TOKEN: number
  PRICE_PER_TOKEN: number
  PRICE_UNIT: string
  API: string
  CALL: ProviderCall
  VLLM_ARGS: string[]
}

export interface ProviderHostFields extends ProviderCommonFields {
  FAMILY: 'host-class'
  DEVICE: string
  MEMORY_GB: number
  UNITS_PER_GONKA_NODE: number
  PROOF: string
  REWARD: string
  STAKE: string
  GONKA_PARALLEL: string
  MEASURED: string[]
  GAPS: string[]
  TOKEN: string
}

interface ProviderEntryBase {
  id: string
  specPath: string
  summary: Localized
  name: Localized
  sha256: string
  typecheckOk: boolean
  discarded: number
  moduleName: string | null
  inSpecCorpus: boolean
  network: ProviderNetwork
  status: ProviderStatus
  witness: ProviderWitness
  health: Health
  messages: string[]
  searchText: string
}

export interface ProviderModelEntry extends ProviderEntryBase { family: 'model'; fields: ProviderModelFields }
export interface ProviderHostEntry extends ProviderEntryBase { family: 'host-class'; fields: ProviderHostFields }
export type ProviderSpecEntry = ProviderModelEntry | ProviderHostEntry

/**
 * specs/providers/tri_gnk_pair.t27 as plain values. Every u64 the spec states
 * (ngonka amounts, block heights, the $TRI cap) arrives as an exact decimal
 * string, because a JS number loses digits above 2^53; format it with BigInt.
 */
export interface ProviderStudyFields {
  KIND: 'providers-study'
  ID: string
  CHECKED: string
  ROUTES: string[]
  CONFLICT: string
  PARALLELS: string[]
  TRI_CHAINS: string[]
  TRI_MAINNET: boolean
  TRI_CAP: string
  GONKA_POOL_REGISTERED: boolean
  BRIDGE_CHAINS: string[]
  GONKA_APPROVED_FOR_TRADE: string[]
  IBC_CHANNELS: string[]
  WGNK_ETHEREUM: string
  WGNK_USDT_UNISWAP_V3_POOL: string
  WGNK_DECIMALS: number
  GNK_DECIMALS: number
  EPOCH: number
  ACTIVE_HOSTS: number
  CHAIN_HEIGHT: string
  ALLOWLIST_UNTIL_HEIGHT: string
  SUPPLY_NGONKA: string
  TOTAL_FEES_NGONKA: string
  TOTAL_SUBSIDIES_NGONKA: string
  TOTAL_BURNED_NGONKA: string
  INITIAL_EPOCH_REWARD_NGONKA: string
  VESTING_EPOCHS: number
  EPOCH_LENGTH_BLOCKS: number
  EPOCH_SECONDS_MEASURED: number
  BASE_WEIGHT_PERMILLE: number
  SLASH_INVALID_PERMILLE: number
  SLASH_DOWNTIME_PERMILLE: number
  SMALLEST_POC_MODEL_GB: number
  MOST_SERVED_MODEL_GB: number
  LARGEST_POC_MODEL_GB: number
  CONSUMER_CARD_GB: number
  CONSUMER_ERA_MIN_GB: number
  DATACENTER_CARD_GB: number
  [key: string]: unknown
}

export interface ProviderStudy {
  id: string
  specPath: string
  sha256: string
  typecheckOk: boolean
  moduleName: string | null
  fields: ProviderStudyFields
  /** Computed by the generator from the fields above, never typed by hand. */
  derived: {
    allowlistActive: boolean
    /** TOTAL_SUBSIDIES_NGONKA / TOTAL_FEES_NGONKA, rounded down, as a decimal string. */
    subsidyPerFee: string
    vestingDays: number
    consumerCardsPerNode: { smallest: number; mostServed: number; largest: number }
  }
}

export interface ProviderSpecCatalog extends Omit<SpecCatalogBase, 'codeOnly'> {
  counts: {
    specs: number; typecheckOk: number; enabled: number
    byFamily: Record<ProviderFamily, number>; byNetwork: Record<ProviderNetwork, number>
    byStatus: Record<ProviderStatus, number>; byWitness: Record<ProviderWitness, number>
  }
  ladder: LadderCounts
  catalog: {
    specPath: string; sha256: string; typecheckOk: boolean; schemaVersion: number
    families: ProviderFamily[]; networks: ProviderNetwork[]; directories: string[]; idRule: string
    commonFields: string[]; modelFields: string[]; hostFields: string[]; fieldSourceRule: string
    statuses: ProviderStatus[]; statusRule: string; witnesses: ProviderWitness[]; witnessRule: string
    calls: ProviderCall[]; callRule: string
  }
  study: ProviderStudy
  providers: ProviderSpecEntry[]
}

let providersPromise: Promise<ProviderSpecCatalog> | null = null

export function loadProviderSpecs(): Promise<ProviderSpecCatalog> {
  if (!providersPromise) {
    providersPromise = fetch('providers/spec-providers.json', { credentials: 'omit' }).then((r) => {
      if (!r.ok) throw new Error(`could not load spec-providers (${r.status})`)
      return r.json() as Promise<ProviderSpecCatalog>
    })
    providersPromise.catch(() => { providersPromise = null })
  }
  return providersPromise
}

let toolsPromise: Promise<ToolSpecCatalog> | null = null

export function loadToolSpecs(): Promise<ToolSpecCatalog> {
  if (!toolsPromise) {
    const get = <T,>(path: string) => fetch(path, { credentials: 'omit' }).then((r) => {
      if (!r.ok) throw new Error(`could not load ${path} (${r.status})`)
      return r.json() as Promise<T>
    })
    // The catalog names its parts (the trios cards, written apart to stay under 1 MB);
    // scripts/agents-from-specs.mjs joinToolCatalog() is the same join on disk.
    toolsPromise = get<ToolSpecCatalog & { parts?: { path: string; count: number }[] }>('tools/spec-tools.json').then(async ({ parts = [], ...main }) => {
      const lists = await Promise.all(parts.map((p) => get<{ tools: ToolSpecEntry[] }>(p.path).then((b) => {
        if (b.tools.length !== p.count) throw new Error(`${p.path}: ${b.tools.length} cards, the catalog names ${p.count}`)
        return b.tools
      })))
      return { ...main, tools: [...main.tools, ...lists.flat()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) }
    })
    toolsPromise.catch(() => { toolsPromise = null })
  }
  return toolsPromise
}

let skillsPromise: Promise<SkillSpecCatalog> | null = null
let cronsPromise: Promise<CronSpecCatalog> | null = null
let agentsPromise: Promise<AgentSpecCatalog> | null = null
let functionsPromise: Promise<FunctionSpecCatalog> | null = null

export function loadFunctionSpecs(): Promise<FunctionSpecCatalog> {
  if (!functionsPromise) {
    functionsPromise = fetch('functions/spec-functions.json', { credentials: 'omit' }).then((r) => {
      if (!r.ok) throw new Error(`could not load spec-functions (${r.status})`)
      return r.json() as Promise<FunctionSpecCatalog>
    })
    functionsPromise.catch(() => { functionsPromise = null })
  }
  return functionsPromise
}

export function loadAgentSpecs(): Promise<AgentSpecCatalog> {
  if (!agentsPromise) {
    agentsPromise = fetch('agents/spec-agents.json', { credentials: 'omit' }).then((r) => {
      if (!r.ok) throw new Error(`could not load spec-agents (${r.status})`)
      return r.json() as Promise<AgentSpecCatalog>
    })
    agentsPromise.catch(() => { agentsPromise = null })
  }
  return agentsPromise
}

export function loadSkillSpecs(): Promise<SkillSpecCatalog> {
  if (!skillsPromise) {
    skillsPromise = fetch('skills/spec-skills.json', { credentials: 'omit' }).then((r) => {
      if (!r.ok) throw new Error(`could not load spec-skills (${r.status})`)
      return r.json() as Promise<SkillSpecCatalog>
    })
    skillsPromise.catch(() => { skillsPromise = null })
  }
  return skillsPromise
}

/**
 * The seven ladder counts alone, for a caller that wants the numbers without a
 * catalog -- the Queen's own rungs, which stand outside the Explorer frames and
 * so cannot read what those frames loaded.
 *
 * Every catalog carries the same generated `ladder`; this reads the smallest of
 * the seven (spec-skills.json, ~32 kB against spec-tools.json's ~420 kB plus its trios part) and
 * shares the promise the Skill Explorer already uses, so a reader who opens
 * SKILLS pays for it once. The numbers are still generated, never typed here.
 */
export function loadLadderCounts(): Promise<LadderCounts> {
  return loadSkillSpecs().then((c) => c.ladder)
}

export function loadCronSpecs(): Promise<CronSpecCatalog> {
  if (!cronsPromise) {
    cronsPromise = fetch('crons/spec-crons.json', { credentials: 'omit' }).then((r) => {
      if (!r.ok) throw new Error(`could not load spec-crons (${r.status})`)
      return r.json() as Promise<CronSpecCatalog>
    })
    cronsPromise.catch(() => { cronsPromise = null })
  }
  return cronsPromise
}

/** The spec's own bytes, from the vendored corpus, checked against the catalog's hash when the page can. */
export async function loadAgentSpecSource(specPath: string): Promise<string> {
  const r = await fetch(`t27/files/${specPath}`, { credentials: 'omit' })
  if (!r.ok) throw new Error(`could not load ${specPath} (${r.status})`)
  return r.text()
}

// ---------------------------------------------------------------------------
// Where things are.
// ---------------------------------------------------------------------------
/** gHashTag/t27's default branch, checked with `gh api repos/gHashTag/t27 --jq .default_branch` on 2026-09-09. */
export const T27_DEFAULT_BRANCH = 'master'

export function specSlug(specPath: string): string {
  return specPath.replace(/^specs\/(skills|crons|agents|functions|providers|tools\/(tri|mcp))\//, '').replace(/\.t27$/, '')
}

/** The canonical spec: the file in gHashTag/t27, opened in GitHub's editor. */
export function canonicalSpecEditUrl(specPath: string): string {
  return `https://github.com/gHashTag/t27/edit/${T27_DEFAULT_BRANCH}/${specPath}`
}

/** The vendored copy the site actually serves. */
export function vendoredSpecUrl(specPath: string): string {
  return `https://github.com/gHashTag/trinity/blob/main/apps/website/public/t27/files/${specPath}`
}

export type RunNowTarget =
  | { kind: 'link'; url: string; via: 'github-actions' | 'railway' | 'inngest' }
  | { kind: 'disabled'; reason: 'timer' | 'launchd' | 'unknown-service' }

// ---------------------------------------------------------------------------
// The optional live control plane. See docs/agent-control-api.md.
// ---------------------------------------------------------------------------
export function agentControlUrl(): string | null {
  const raw = (import.meta.env?.VITE_AGENT_CONTROL_URL as string | undefined) ?? ''
  const url = raw.trim().replace(/\/+$/, '')
  return url.length > 0 ? url : null
}

export type ControlAction = 'run' | 'enable' | 'disable'

export function controlEndpoint(base: string, kind: 'skill' | 'cron', id: string, action: ControlAction): string {
  return `${base}/${kind === 'skill' ? 'skills' : 'crons'}/${id.split('/').map(encodeURIComponent).join('/')}/${action}`
}

export async function requestControl(base: string, kind: 'skill' | 'cron', id: string, action: ControlAction): Promise<{ ok: boolean; status: number; body: string }> {
  const r = await fetch(controlEndpoint(base, kind, id, action), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, requestedAt: new Date().toISOString() }),
    credentials: 'omit',
  })
  return { ok: r.ok, status: r.status, body: await r.text().catch(() => '') }
}

// ---------------------------------------------------------------------------
// Labels shared by both Explorers.
// ---------------------------------------------------------------------------
export const WITNESS_LABEL: Record<Witness | AgentWitness | ToolWitness | ProviderWitness, { en: string; ru: string }> = {
  'spec+code': { en: 'spec+code', ru: 'спека+код' },
  'spec-only': { en: 'spec-only', ru: 'только спека' },
  'code-only': { en: 'code-only', ru: 'только код' },
  'spec+experience': { en: 'spec+experience', ru: 'спека+опыт' },
  // Tools: how the card's text was obtained from the program it describes.
  'source-parse': { en: 'source-parse', ru: 'разбор исходника' },
  'registry-export': { en: 'registry-export', ru: 'экспорт реестра' },
  'help-output': { en: 'help-output', ru: 'вывод --help' },
  'runtime': { en: 'runtime', ru: 'запуск' },
  // Providers: where a card's numbers came from (specs/providers/catalog.t27 WITNESS_RULE).
  'chain-read': { en: 'chain-read', ru: 'прочитано с цепи' },
  'bench-measured': { en: 'bench-measured', ru: 'измерено на стенде' },
  'design-only': { en: 'design-only', ru: 'только проект' },
}

export function witnessOf<T extends { id: string }>(specById: Map<string, T>, id: string): Witness {
  return specById.has(id) ? 'spec+code' : 'code-only'
}
