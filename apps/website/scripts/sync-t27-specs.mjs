#!/usr/bin/env node
// Vendor the t27 spec corpus and the compiler wasm bridge into public/.
//
// The explorer page runs the REAL compiler in the browser, so the two things it
// needs are the spec sources and the wasm build of `bootstrap/src/compiler.rs`.
// Both are copied here rather than fetched at runtime: the page then works
// offline, deterministically, with no dependency on GitHub availability or
// rate limits.
//
// The cost of vendoring is drift, so the manifest records the exact t27 commit
// the snapshot came from and the page displays it. Re-run this script to
// refresh:
//
//   node scripts/sync-t27-specs.mjs
//
// Incremental: a run reads the manifest it is about to replace and trusts a spec's
// stored row when the sha256 of its bytes is unchanged -- no analyze(), no write.
// Files that left the corpus are deleted one by one instead of wiping the tree, and a
// source repository whose head commit has not moved is not downloaded at all.
// The key under which stored rows are trusted is the hash of the wasm and of
// t27-corpus.mjs, so a compiler or deriver change re-analyzes everything.
// T27_FULL=1 ignores the stored rows and rebuilds from scratch.
//
// Requires the wasm bridge to be built first:
//   cd /Users/playom/t27/bindings/wasm-explorer
//   cargo build --target wasm32-unknown-unknown --release

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, mkdtempSync, readdirSync, unlinkSync, rmdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
// One entry, one tag, one summary, one aggregate: the same code whichever writer runs.
// scripts/discover-t27-worlds.mjs adds the repositories a GitHub scan finds through the
// same functions, so a spec means the same thing however it reached the catalog.
import { corpusEntry, corpusAggregates, registerDescriptionExceptions } from './t27-corpus.mjs'
import { lessonSpecPaths, teachable } from './lesson-specs.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEBSITE = join(HERE, '..')
// A checkout beside this repository, not somebody's home directory. The line
// used to read `/Users/playom/t27` -- `playra` with one letter wrong -- and the
// typo was not cosmetic, because WASM_SRC on the next line is derived from it.
// `existsSync(WASM_SRC)` was therefore false on every machine, including the
// one that wrote it, so every refresh took the fallback branch below and
// re-vendored the wasm already sitting in public/t27. That is the whole
// mechanism behind gHashTag/t27#4487: the browser ran a compiler built from
// source committed in no repository, because one character kept the real build
// permanently out of reach.
const T27 = process.env.T27_ROOT || join(HERE, '../../../../t27')
const SPECS_SRC = join(T27, 'specs')
const WASM_SRC = join(T27, 'bindings/wasm-explorer/target/wasm32-unknown-unknown/release/t27_wasm_explorer.wasm')

const OUT_DIR = join(WEBSITE, 'public/t27')
// `files/`, not `specs/`: paths inside are repo-root-relative now, so a spec
// from specs/demos/ would otherwise land at specs/specs/demos/.
const SPECS_OUT = join(OUT_DIR, 'files')

function fail(msg) {
  console.error(`sync-t27-specs: ${msg}`)
  process.exit(1)
}

// Where t27 itself comes from.
//
// For a year it came from this line's default: a working copy on one laptop.
// That is how the library fell 540 specs behind master -- specs/tools (94),
// bootstrap/tests (90), specs/ternary (60), specs/igla (44), specs/crons (33),
// specs/agents (27), specs/skills (26) are all on master and none of them were
// on the branch the last sync happened to be standing on. No workflow could fix
// it either: CI has no /Users/playom/t27, so the daily scan skipped the
// repository that holds two thirds of the corpus.
//
// So GitHub is the source, like the other four founding repositories, and the
// local checkout is the opt-in (T27_LOCAL=1) for whoever is changing the
// compiler and needs to see uncommitted specs on the page.
const FROM_LOCAL = process.env.T27_LOCAL === '1' || process.env.T27_LOCAL === 'true'
if (FROM_LOCAL && !existsSync(SPECS_SRC)) fail(`T27_LOCAL is set but no spec corpus at ${SPECS_SRC} (set T27_ROOT)`)

// The compiler wasm is built by cargo, which CI does not run either. The copy
// already vendored beside the corpus is the one the browser loads today, so a
// spec refresh reuses it and says so; only a compiler change needs the build.
// Read before the output directory is wiped, not after.
const VENDORED_WASM = join(OUT_DIR, 't27_compiler.wasm')
let wasmBuf, wasmFrom
if (existsSync(WASM_SRC)) { wasmBuf = readFileSync(WASM_SRC); wasmFrom = 'cargo build in the local checkout' }
else if (existsSync(VENDORED_WASM)) {
  wasmBuf = readFileSync(VENDORED_WASM); wasmFrom = 'the copy already vendored here'
  // Say it out loud. Re-vendoring is the right default for a spec refresh, but
  // it is the wrong outcome for anyone who just built the compiler and expects
  // to see it, and silence is what let the last one drift unnoticed.
  console.log(`  note: no cargo build at ${WASM_SRC}, re-vendoring the existing wasm`)
  console.log('        set T27_ROOT if your t27 checkout is somewhere else')
}
else fail(`no compiler wasm.\n  cd ${T27}/bindings/wasm-explorer\n  cargo build --target wasm32-unknown-unknown --release`)

const T_START = Date.now()
let tLap = T_START
const lap = (what) => { const now = Date.now(); console.log(`  timing: ${what} ${((now - tLap) / 1000).toFixed(1)}s`); tLap = now }
const sha256 = (x) => createHash('sha256').update(x).digest('hex')

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', timeout: 120000, maxBuffer: 60 * 1024 * 1024 }).trim()

// One request, no working copy left behind. Returns the extracted root.
//
// `slug` is owner/name. It used to be a bare name with `gHashTag/` welded in
// here, which is why a corpus repo owned by anyone else could not be fetched at
// all -- see EXTRA_REPOS below for what that cost.
//
// Three attempts, not one. These are large downloads -- trinity-fpga alone is
// 353 MB over about a minute and a half -- and on 2026-09-21 one of them failed
// once. That single hiccup cost the manifest all 64 of that repository's specs,
// and the run still exited 0. Backoff is 2s, 6s: long enough to outlast a
// transient refusal, short enough that a genuinely dead repository is not
// waited on for minutes.
function tarball(slug, ref) {
  const dir = mkdtempSync(join(tmpdir(), `t27-${slug.replace(/\W/g, '-')}-`))
  let last
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execFileSync('sh', ['-c',
        `gh api "repos/${slug}/tarball/${ref}" > "${dir}/a.tar.gz" && tar -xzf "${dir}/a.tar.gz" -C "${dir}"`,
      ], { stdio: 'ignore' })
      const inner = execFileSync('sh', ['-c', `ls -d "${dir}"/*/ | head -1`], { encoding: 'utf8' }).trim()
      return { dir, root: inner.replace(/\/$/, '') }
    } catch (e) {
      last = e
      if (attempt < 3) {
        console.log(`  ${slug}: tarball attempt ${attempt} failed, retrying`)
        execFileSync('sleep', [String(attempt * 2 + (attempt - 1) * 2)])
      }
    }
  }
  throw last
}

// Exclusions, all of them copies of files counted elsewhere rather than
// judgement calls about what deserves to be in the library:
//   .git/      object store
//   .claude/   git worktrees -- second checkouts of files already counted
//   public/t27/files/  THIS corpus, vendored into the website repository. The
//     trinity tarball carries it, so without this line a refresh vendors its
//     own output back in: the first run produced 563 "trinity" specs, which
//     were the previous snapshot of t27 wearing a different path.
const specFiles = (root) => execFileSync('find', [
  root, '-name', '*.t27', '-type', 'f',
  '-not', '-path', `${root}/.git/*`,
  '-not', '-path', `${root}/.claude/*`,
  '-not', '-path', '*/public/t27/files/*',
], { encoding: 'utf8' }).split('\n').filter(Boolean).sort()

const T27_REF = process.env.T27_REF || 'master'
// The eight-lesson course and hello_world live on a branch that was never
// merged, so master alone would delete the whole onboarding path from the site.
// Named refs contribute only the paths the main ref does not have, which means
// this list retires itself: merge the course and the overlay contributes zero.
const OVERLAY_REFS = (process.env.T27_OVERLAY_REFS ?? 'fix/reject-vibee-specs').split(',').map((s) => s.trim()).filter(Boolean)

let sha, shortSha, dirty, t27Root, t27Tmp, overlayUsed = []
if (FROM_LOCAL) {
  sha = execFileSync('git', ['-C', T27, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  dirty = execFileSync('git', ['-C', T27, 'status', '--porcelain', '--', 'specs', 'chips', 'compiler', 'bootstrap/src/compiler.rs'], { encoding: 'utf8' }).trim()
  t27Root = T27
} else {
  sha = gh(['api', `repos/gHashTag/t27/commits/${T27_REF}`, '--jq', '.sha'])
  dirty = ''
  const main = tarball('gHashTag/t27', T27_REF)
  t27Root = main.root
  t27Tmp = main.dir
  // Overlay: copy in only what the main ref is missing, and record what each
  // one actually contributed rather than claiming the whole branch.
  const have = new Set(specFiles(t27Root).map((f) => relative(t27Root, f)))
  for (const ref of OVERLAY_REFS) {
    let extra
    try { extra = tarball('gHashTag/t27', ref) } catch { console.log(`  warning: overlay ref ${ref} unreachable, skipped`); continue }
    const added = []
    for (const abs of specFiles(extra.root)) {
      const rel = relative(extra.root, abs)
      if (have.has(rel)) continue
      const dest = join(t27Root, rel)
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, readFileSync(abs))
      have.add(rel)
      added.push(rel)
    }
    rmSync(extra.dir, { recursive: true, force: true })
    overlayUsed.push({ ref, commit: gh(['api', `repos/gHashTag/t27/commits/${ref}`, '--jq', '.sha']), added: added.length, paths: added.sort() })
    console.log(`  overlay ${ref}: ${added.length} path(s) not on ${T27_REF}`)
  }
}
shortSha = sha.slice(0, 9)

// Every .t27 in the repo, not just specs/ -- `chips/` alone holds ~147 real
// specs, and a corpus that quietly stops at specs/ cannot show a problem living
// outside it. What is left out is listed at specFiles() above.
const t27Files = specFiles(t27Root)

if (!t27Files.length) fail('no .t27 files found')

// ---------------------------------------------------------------------------
// Other repositories
//
// The corpus is spread across several repos. They are pulled as tarballs
// rather than cloned: one request each, no working copies to keep in sync, and
// nothing writable left behind.
//
// `chips/{euler,gamma,phi}` inside t27 are byte-identical to the
// tt-trinity-{euler,gamma,phi} repos (verified by blob SHA), so content-hash
// dedup below keeps them from appearing twice. A knowledge library full of
// duplicates is worse than a smaller honest one.
//
// The list was four names long until 2026-09-21, and the corpus it was
// rebuilding had ten. The five missing ones were vendored here by some other
// route and this script knew nothing about them, so every run WIPED them:
// trios 58 specs, tt-trinity-euler 46, dmitrii-f-t27/trinity-memory 37,
// turbobaby-user-bot 12, tt-trinity-gamma 1 -- 154 of 1407, amputated in
// silence and re-committed as a refresh. Measured by running it: 1407 in,
// 1259 out. One of the five is not even owned by gHashTag, which is the
// reason `tarball()` now takes owner/name instead of welding the owner in.
//
// Entries are owner/name. The manifest key stays the bare name for our own
// repos, because that is what `specUrl` and the contribute links already
// build `github.com/gHashTag/<key>` from.
// ---------------------------------------------------------------------------
const EXTRA_REPOS = (process.env.T27_SKIP_REMOTE ? [] : [
  'gHashTag/tri-net',
  'gHashTag/trinity-fpga',
  'gHashTag/trinity',
  'gHashTag/tt-trinity-corona',
  'gHashTag/tt-trinity-euler',
  'gHashTag/tt-trinity-gamma',
  'gHashTag/trios',
  'gHashTag/turbobaby-user-bot',
  'dmitrii-f-t27/trinity-memory',
])

lap('t27 tarball + overlays')

// What the previous run left behind, read before anything is touched.
//
// Provenance this script does not compute comes from here too (see the long comment
// further down), and so does the incremental decision: a stored row is trusted only
// when the compiler and the deriver that produced it are the ones running now.
const priorManifestPath = join(OUT_DIR, 'manifest.json')
const priorManifest = existsSync(priorManifestPath) ? JSON.parse(readFileSync(priorManifestPath, 'utf8')) : null
const analysisKey = sha256(Buffer.concat([wasmBuf, readFileSync(join(HERE, 't27-corpus.mjs'))]))
const FULL = process.env.T27_FULL === '1' || process.env.T27_FULL === 'true'
const warm = !FULL && priorManifest?.generatedFrom?.analysisKey === analysisKey
// repo + path -> the stored row; only rows that carry the hash of the bytes they describe.
const priorEntries = new Map()
const priorDupes = new Map() // repo -> [{ path, sha256, sameAs }]
if (warm) {
  for (const e of priorManifest.specs ?? []) if (e.sha256) priorEntries.set(`${e.repo}\0${e.path}`, e)
  for (const d of priorManifest.duplicates ?? []) {
    if (!d.sha256) continue
    if (!priorDupes.has(d.repo)) priorDupes.set(d.repo, [])
    priorDupes.get(d.repo).push(d)
  }
}
console.log(`  incremental: ${warm ? `warm, ${priorEntries.size} stored rows` : FULL ? 'T27_FULL set, rebuilding everything' : 'cold, no stored rows for this compiler'}`)

// A repository whose head commit is the one the stored manifest records, and whose every
// file the manifest knows by hash (kept rows and skipped duplicates both), is not
// downloaded: its inventory is rebuilt from the manifest. Dedup still runs over that
// inventory in the same order, so a file that became a duplicate of another repository's
// change is dropped, and one that stopped being a duplicate downloads the repo after all.
function inventoryFromManifest(repo, commit) {
  if (!warm) return null
  const row = (priorManifest.repos ?? []).find((r) => r.repo === repo)
  if (!row || row.commit !== commit) return null
  const kept = [...priorEntries.values()].filter((e) => e.repo === repo)
  const all = (priorManifest.specs ?? []).filter((e) => e.repo === repo)
  const dupes = priorDupes.get(repo) ?? []
  const allDupes = (priorManifest.duplicates ?? []).filter((d) => d.repo === repo)
  if (kept.length !== all.length || kept.length !== row.specs || dupes.length !== allDupes.length) return null
  const prefix = `${repo}/`
  const items = [...kept.map((e) => ({ rel: e.path, hash: e.sha256 })), ...dupes.map((d) => ({ rel: d.path, hash: d.sha256 }))]
  if (items.some((i) => !i.rel.startsWith(prefix))) return null
  return items.map((i) => ({ ...i, inRepo: i.rel.slice(prefix.length) })).sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
}

const sources = [{ repo: 't27', root: t27Root, files: t27Files, commit: FROM_LOCAL ? null : sha, tmp: t27Tmp }]
let reposSkipped = 0

for (const slug of EXTRA_REPOS) {
  const [owner, name] = slug.split('/')
  const repo = owner === 'gHashTag' ? name : slug
  // A skip used to be a `console.log` and a `continue`, and the run still
  // exited 0. On 2026-09-21 that printed one warning line and wrote a manifest
  // missing 64 specs -- a whole repository -- which is a corpus that lies about
  // its own size, published, with nothing red anywhere. A source named in
  // EXTRA_REPOS that cannot be read is a failed sync, not a smaller corpus.
  //
  // The escape hatch is deliberate and narrow: a repository that is genuinely
  // gone should be DELETED FROM THE LIST above, which is a decision a person
  // makes once, in a diff, rather than a warning nobody reads every run.
  // T27_ALLOW_MISSING is for reproducing an old manifest offline.
  const ALLOW_MISSING = process.env.T27_ALLOW_MISSING === '1'
  const lost = (what, e) => {
    if (!ALLOW_MISSING) fail(`${slug} ${what}.\n  A source in EXTRA_REPOS that cannot be read is a failed sync.\n  If the repository is gone, remove it from EXTRA_REPOS in this file.\n  To reproduce an older manifest anyway: T27_ALLOW_MISSING=1\n  ${e?.message ?? ''}`)
    console.log(`  warning: ${slug} ${what}, skipped (T27_ALLOW_MISSING=1)`)
  }
  let branch
  try {
    branch = gh(['api', `repos/${slug}`, '--jq', '.default_branch'])
  } catch (e) {
    lost('unreachable', e)
    continue
  }
  const sha = gh(['api', `repos/${slug}/commits/${branch}`, '--jq', '.sha'])
  const inventory = inventoryFromManifest(repo, sha)
  if (inventory) {
    // Same commit as the stored manifest: nothing to download unless the dedup pass finds
    // it needs bytes it does not have (see `materialize`).
    sources.push({ repo, slug, branch, root: null, files: null, commit: sha, tmp: null, inventory })
    reposSkipped++
    console.log(`  ${slug}: head ${sha.slice(0, 9)} unchanged, tarball skipped`)
    continue
  }
  let pulled
  try {
    pulled = tarball(slug, branch)
  } catch (e) {
    lost('tarball failed after 3 attempts', e)
    continue
  }
  sources.push({ repo, slug, branch, root: pulled.root, files: specFiles(pulled.root), commit: sha, tmp: pulled.dir })
}
lap(`other repositories (${EXTRA_REPOS.length - reposSkipped} downloaded, ${reposSkipped} unchanged)`)

// A skipped repository that turns out to need its bytes after all.
function materialize(src) {
  if (src.root) return
  console.log(`  ${src.slug}: needs file bytes after all, downloading`)
  const pulled = tarball(src.slug, src.branch)
  src.root = pulled.root
  src.tmp = pulled.dir
  src.files = specFiles(pulled.root)
}

// Provenance this script does not compute, read before the wipe removes it.
//
// `discover-t27-worlds.mjs vendor` writes two things into the manifest that
// nothing here can reconstruct: `discoveredAt` on a world's repo row, and the
// `discovery` block naming the contract each world was admitted under. That
// division of labour held while EXTRA_REPOS listed four founding sources and
// mergeWorld owned the rest -- it stopped holding the moment this script
// started pulling all ten, because it rewrites those rows now. The first
// ten-repo run dropped `manifest.discovery` entirely and left every repo row
// looking founding, which `qa/t27-world-discovery.mjs` reads as five
// hand-vendored sources having become ten.
//
// So carry the scan's facts and refresh ours. `at`, `branch`, `files`,
// `duplicatesSkipped` and `spec.sha256` describe a scan on a stated day and
// stay true of it; `commit` and `specs` are claims about the corpus in this
// file, and a preserved commit sitting beside a freshly pulled repos[].commit
// is a manifest that contradicts itself. A world this script no longer pulls
// drops out rather than lingering as provenance for specs that are gone.
const discoveredAt = new Map((priorManifest?.repos ?? []).filter((r) => r.discoveredAt).map((r) => [r.repo, r.discoveredAt]))
const priorDiscovery = priorManifest?.discovery ?? null

// Wipe what this script writes, and only that.
//
// This was `rmSync(OUT_DIR)`, which also deleted two tracked artifacts it does
// not produce and cannot restore: shared-core.json (2.3 MB, `npm run core`) and
// universe-atlas.json (1.1 MB, `npm run atlas`). Nothing warned, and nothing in
// package.json chains the three, so a refresh left the Queen's shared-core and
// universe pages pointing at files that were no longer there.
// Two card directories inside files/ are not this script's either: tools-from-trinity-tri.mjs writes
// specs/tools/trinity/cli, and tools-from-trios-tri.mjs writes specs/tools/trios/tri from trios/bin/tri
// at a pinned BrowserOS commit, a file nothing here reads. Wiping them made the world scan's catalog
// commit delete 515 tool cards (check:tools caught it), so they are carried across the wipe.
const KEPT = ['specs/tools/trinity/cli', 'specs/tools/trios/tri']
// The specs a course teaches from (scripts/lesson-specs.mjs): the 2026-10-08
// scan (#1535) wiped 33 lesson specs that live nowhere else and swapped seven
// for t27 master's copies that do not compile clean, and the publisher's course
// check refused the site. They are read now, before the wipe, and settled after
// the scan below.
const pinned = new Map()
for (const rel of lessonSpecPaths(join(WEBSITE, 'specs/course'))) {
  const at = join(SPECS_OUT, rel)
  if (existsSync(at)) pinned.set(rel, readFileSync(at, 'utf8'))
}
mkdirSync(SPECS_OUT, { recursive: true })

// Nothing is wiped any more: the tree already on disk is the previous run's output, and this
// run leaves it alone wherever the bytes are the same. `put` writes a file only when it
// differs and records it; `sweep` (below) then deletes whatever this run did not record,
// which is exactly the set the old wipe removed and this run did not recreate. KEPT
// directories are the one thing the sweep never touches, as the wipe never did.
const written = new Set()
const stats = { analyzed: 0, reused: 0, written: 0, unchanged: 0 }
function mark(rel) {
  written.add(rel)
  for (let d = dirname(rel); d !== '.' && d !== '/'; d = dirname(d)) written.add(d)
}
function ensureDir(dir) {
  try { mkdirSync(dir, { recursive: true }) } catch {
    // A file squats where a directory is needed (a path changed kind between runs).
    for (let d = dir; d.startsWith(SPECS_OUT) && d !== SPECS_OUT; d = dirname(d)) if (existsSync(d) && !statSync(d).isDirectory()) rmSync(d, { force: true })
    mkdirSync(dir, { recursive: true })
  }
}
function put(rel, data) {
  const dest = join(SPECS_OUT, rel)
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
  mark(rel)
  if (existsSync(dest)) {
    if (statSync(dest).isDirectory()) rmSync(dest, { recursive: true, force: true })
    else if (readFileSync(dest).equals(buf)) { stats.unchanged++; return false }
  }
  ensureDir(dirname(dest))
  writeFileSync(dest, buf)
  stats.written++
  return true
}
function filesUnder(rel) {
  const out = []
  const walk = (r) => {
    const abs = join(SPECS_OUT, r)
    if (!existsSync(abs)) return
    if (!statSync(abs).isDirectory()) { out.push(r); return }
    for (const n of readdirSync(abs)) walk(r ? `${r}/${n}` : n)
  }
  walk(rel)
  return out
}
function sweep() {
  let removed = 0
  const isKept = (r) => KEPT.some((k) => r === k || r.startsWith(`${k}/`) || k.startsWith(`${r}/`))
  const walk = (r) => {
    const abs = r ? join(SPECS_OUT, r) : SPECS_OUT
    for (const n of readdirSync(abs)) {
      const child = r ? `${r}/${n}` : n
      if (isKept(child)) continue
      if (statSync(join(SPECS_OUT, child)).isDirectory()) {
        walk(child)
        if (!readdirSync(join(SPECS_OUT, child)).length) rmdirSync(join(SPECS_OUT, child))
      } else if (!written.has(child)) { unlinkSync(join(SPECS_OUT, child)); removed++ }
    }
  }
  walk('')
  return removed
}
// What a KEPT directory holds is part of the tree as far as the companion check is concerned.
for (const d of KEPT) for (const f of filesUnder(d)) mark(f)

// Run the same wasm the browser runs, here, over the whole corpus. Health has
// to be known before a row is drawn -- the alternative is compiling 667 specs
// in the browser just to colour a list, which would take minutes.
const { instance: wasmInst } = await WebAssembly.instantiate(wasmBuf, {})
const { memory, t27_alloc, t27_free, t27_analyze } = wasmInst.exports

function analyze(src) {
  const b = Buffer.from(src, 'utf8')
  const p = t27_alloc(b.length)
  new Uint8Array(memory.buffer, p, b.length).set(b)
  const o = t27_analyze(p, b.length)
  const n = new DataView(memory.buffer).getUint32(o, true)
  const json = Buffer.from(new Uint8Array(memory.buffer, o + 4, n)).toString('utf8')
  t27_free(o, 4 + n)
  return JSON.parse(json)
}

// describe(), deriveTags(), summarise() and the domain table live in scripts/t27-corpus.mjs.

const entries = []
const seenContent = new Map() // content hash -> path already kept
let duplicates = 0
// Not just how many, but which. A count cannot answer "does this spec exist
// anywhere else?", which is the question a reader of a multi-repository corpus
// actually has -- and the losing bytes are discarded here, so if this list is
// not written now nothing downstream can reconstruct it.
const duplicatePairs = []

// A stored row stands in for analyze() when the bytes it describes are the bytes in hand.
// Fields added after the loop (tutorial order, featured) are derived again below.
const reusable = (stored) => { const { tutorial: _t, lesson: _l, featured: _f, ...rest } = stored; return rest }
const diskHash = (rel) => { try { return sha256(readFileSync(join(SPECS_OUT, rel), 'utf8')) } catch { return null } }

for (const src of sources) {
  const items = src.inventory ?? src.files.map((abs) => ({ inRepo: relative(src.root, abs) }))
  for (const item of items) {
    // Namespaced by repo, then the path inside it, so a spec's real home stays
    // visible instead of being flattened into one bucket.
    const rel = src.repo === 't27' ? item.inRepo : `${src.repo}/${item.inRepo}`
    let text = null
    const textOf = () => {
      if (text === null) {
        if (!src.root) materialize(src)
        text = readFileSync(join(src.root, item.inRepo), 'utf8')
      }
      return text
    }

    // Same bytes as something already taken? Skip it. t27 vendors three whole
    // chip repos, so without this the library would carry 147 phantom entries.
    const hash = item.hash ?? sha256(textOf())
    const already = seenContent.get(hash)
    if (already) { duplicates++; duplicatePairs.push({ path: rel, repo: src.repo, sameAs: already, sha256: hash }); continue }
    seenContent.set(hash, rel)

    const stored = warm ? priorEntries.get(`${src.repo}\0${rel}`) : undefined
    if (stored && stored.sha256 === hash) {
      // Unchanged bytes: keep the row. A file we never downloaded must still be on disk, intact.
      if (text !== null || !src.inventory || diskHash(rel) !== hash) put(rel, textOf())
      else mark(rel)
      entries.push(reusable(stored))
      stats.reused++
    } else {
      entries.push({ ...corpusEntry(rel, src.repo, textOf(), analyze), sha256: hash })
      put(rel, textOf())
      stats.analyzed++
    }
  }
}
lap(`analyze + write (${stats.analyzed} analyzed, ${stats.reused} reused, ${stats.written} files written, ${stats.unchanged} unchanged)`)

// Each lesson spec settles here. A scanned copy a lesson can show (teachable:
// the course check's own rule) stays, so t27's newer version reaches the lesson
// and scripts/course-pages.mjs redraws its page. Otherwise the course keeps the
// copy it had: the scan brought nothing, or brought a spec that does not compile
// clean. A kept spec the scan also carries gets its manifest row rebuilt from
// the bytes on disk; one only a course has stays a file with no row, as before.
let keptMissing = 0, keptUnclean = 0, fresher = 0
for (const [rel, text] of pinned) {
  const dest = join(SPECS_OUT, rel)
  const scanned = written.has(rel) ? readFileSync(dest, 'utf8') : null
  if (scanned === text) continue
  if (scanned !== null) {
    let a = null
    try { a = analyze(scanned) } catch { a = null }
    if (teachable(a)) { fresher++; continue }
  }
  const row = entries.findIndex((e) => e.path === rel)
  if (row >= 0) entries[row] = { ...corpusEntry(rel, entries[row].repo, text, analyze), sha256: sha256(text) }
  put(rel, text)
  if (scanned === null) keptMissing++
  else keptUnclean++
}
console.log(`  lesson specs: ${pinned.size} read; kept ${keptMissing} the scan lacks and ${keptUnclean} it brought unclean; ${fresher} take t27's newer clean copy`)

// The companions a spec cites.
//
// A spec's SOURCES names the files it was written from -- a README, a report,
// a directory -- and scripts/docs-from-specs.mjs refuses a citation it cannot
// resolve, on the principle that a document may not point at something that is
// not there. Those files are not .t27, so the loop above skips them, and the
// first GitHub-sourced refresh deleted the ones a previous hand-vendored commit
// had put here -- the seven docs/system/*.md a chapter renders, and the reports
// evidence.t27 cites. They are copied from the same tarball, at the same commit,
// as the spec that names them.
//
// `trinity:`-prefixed paths are resolved against this repository instead and are
// not vendored, so they are skipped here.
// Two shapes name a file: a SOURCES list, and a single-string constant such as
// BODY_EN, whose value is the markdown a docs chapter renders. A value with no
// extension (DIAGRAM = "ladder", TABLE = "claims") is an identifier, not a path,
// and is skipped by the extension test below.
const SOURCES_DECL = /\bSOURCES\s*:\s*\[\d*\]\s*str\s*=\s*\[([^\]]*)\]/
const STRING_DECL = /\b[A-Z][A-Z0-9_]*\s*:\s*str\s*=\s*"([^"]+)"/g
const TEXT_FILE = /\.(md|markdown|txt|rst|adoc|csv|json|toml|ya?ml)$/i
let companions = 0
for (const src of sources) {
  if (!src.root) {
    // Never downloaded: its companions were vendored by the run that saw this same commit and
    // are still on disk. Everything under its prefix that is not a spec is one of them.
    const specRels = new Set(src.inventory.map((i) => i.rel))
    for (const f of filesUnder(src.repo)) if (!specRels.has(f)) mark(f)
    continue
  }
  for (const abs of src.files) {
    const text = readFileSync(abs, 'utf8')
    const decl = SOURCES_DECL.exec(text)
    const cited = [
      ...(decl ? [...decl[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : []),
      ...[...text.matchAll(STRING_DECL)].map((m) => m[1]).filter((v) => TEXT_FILE.test(v)),
    ]
    for (const rel of cited) {
      if (rel.startsWith('trinity:') || rel.endsWith('.t27') || rel.includes('..') || rel.startsWith('/')) continue
      const from = join(src.root, rel)
      if (!existsSync(from)) continue
      const dest = src.repo === 't27' ? rel : `${src.repo}/${rel}`
      if (written.has(dest)) continue
      if (statSync(from).isDirectory()) {
        const walk = (r) => { for (const n of readdirSync(join(from, r))) { const c = r ? `${r}/${n}` : n; if (statSync(join(from, c)).isDirectory()) walk(c); else put(`${dest}/${c}`, readFileSync(join(from, c))) } }
        walk('')
      } else put(dest, readFileSync(from))
      companions += 1
    }
  }
}
if (companions) console.log(`  companions: ${companions} non-spec file(s) cited by SOURCES vendored beside their spec`)

// Tarballs were extracted to temp dirs; nothing should outlive this run.
for (const s of sources) if (s.tmp) rmSync(s.tmp, { recursive: true, force: true })
const swept = sweep()
console.log(`  tree: ${stats.written} file(s) written, ${stats.unchanged} already identical, ${swept} stale removed`)
lap('companions + sweep')

// Spec descriptions are comments quoted verbatim out of the source files, in the language
// their authors wrote them in; qa/ru_audit.mjs must not flag them as untranslated UI. The
// exception list is generated, never hand-maintained (see t27-corpus.mjs).
const registered = registerDescriptionExceptions(entries, join(WEBSITE, 'qa/language-exceptions.json'))
if (registered !== null) console.log(`  qa exceptions: ${registered} spec descriptions registered for the RU audit`)

writeFileSync(join(OUT_DIR, 't27_compiler.wasm'), wasmBuf)
const wasmBytes = wasmBuf.length

// The course comes first, in reading order, and the page opens on its first
// lesson. Everything else keeps its path order behind them.
//
// `hello_world` sits at the head as the five-minute overview; the numbered
// lessons then take each construct in turn. Sorting is by filename, which is
// why they are numbered rather than named.
const FEATURED = 'specs/demos/hello_world.t27'
const tutorial = entries
  .filter((e) => e.path.startsWith('specs/tutorial/') || e.path === FEATURED)
  .sort((a, b) => (a.path === FEATURED ? -1 : b.path === FEATURED ? 1 : a.path.localeCompare(b.path)))
const rest = entries.filter((e) => !tutorial.includes(e))

tutorial.forEach((e, i) => {
  e.tutorial = true
  e.lesson = i // 0 = hello_world, then 1..N in reading order
})
if (tutorial.length) tutorial[0].featured = true
else console.log(`  warning: no tutorial specs found -- page will open on the first entry`)

entries.length = 0
entries.push(...tutorial, ...rest)

const { totalLines, categories, tags, health, notSource, backendFailures, totals } = corpusAggregates(entries)

// ---------------------------------------------------------------------------
// Which vendored specs could someone else actually reproduce?
//
// t27 is the one source pulled from a LOCAL WORKING COPY rather than a tarball
// of a committed ref, so whatever is on this machine ships. `specsOrCompilerDirty`
// already says "something was uncommitted", which is true and not actionable:
// it does not say WHAT, and a boolean cannot be diffed between syncs.
//
// The concrete hazard is not hypothetical. Every spec of the teaching Course --
// hello_world plus the eight tutorial lessons -- lives on an unmerged t27 branch
// and not on master. Re-vendoring "from master" to pick up a compiler fix would
// therefore DELETE the entire onboarding path from the site, silently, and the
// manifest as it stood would have reported nothing but a flipped boolean.
//
// Submodules are not counted: `chips/{euler,gamma,phi}` are separate
// repositories, and asking the superproject's history about their paths returns
// "no commit" for files that are perfectly well committed elsewhere. That
// mistake produced a 46-file false alarm before this was written.
// Sourced from GitHub there is nothing to guess: the overlay loop above copied
// in exactly the paths the main ref does not have, and kept the list. Sourced
// from a working copy the question is still open, so it is still asked.
const DEFAULT_REF = FROM_LOCAL ? (process.env.T27_DEFAULT_REF || 'origin/master') : T27_REF
const unreachable = []
let reachableChecked = 0
if (!FROM_LOCAL) {
  reachableChecked = entries.filter((e) => e.repo === 't27').length
  const overlayPaths = new Set(overlayUsed.flatMap((o) => o.paths))
  for (const e of entries) if (e.repo === 't27' && overlayPaths.has(e.path)) unreachable.push(e.path)
} else {
  let submodulePaths = []
  try {
    submodulePaths = execFileSync('git', ['-C', T27, 'config', '-f', '.gitmodules', '--get-regexp', 'path'], { encoding: 'utf8' })
      .split('\n').filter(Boolean).map((line) => line.trim().split(/\s+/)[1]).filter(Boolean)
  } catch {
    // No .gitmodules is a valid state, not an error.
  }
  const ownedByASubmodule = (rel) => submodulePaths.some((s) => rel === s || rel.startsWith(`${s}/`))
  for (const e of entries) {
    if (e.repo !== 't27') continue          // other repos ship a committed tarball sha
    if (ownedByASubmodule(e.path)) continue // committed in its own repository
    reachableChecked += 1
    try {
      execFileSync('git', ['-C', T27, 'cat-file', '-e', `${DEFAULT_REF}:${e.path}`], { stdio: 'ignore' })
    } catch {
      unreachable.push(e.path)
    }
  }
}
unreachable.sort()
if (unreachable.length) {
  console.log(`  note: ${unreachable.length} of ${reachableChecked} t27 specs are not on ${DEFAULT_REF};`)
  console.log('        a re-vendor from that ref alone would drop them. First few:')
  for (const p of unreachable.slice(0, 5)) console.log(`          ${p}`)
}

writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify({
  generatedFrom: {
    repo: 'gHashTag/t27',
    commit: sha,
    shortCommit: shortSha,
    specsOrCompilerDirty: dirty.length > 0,
    // Named, not counted: a list can be diffed between two syncs and a number
    // cannot. Submodule-owned paths are excluded rather than silently passing.
    defaultRef: DEFAULT_REF,
    t27SpecsChecked: reachableChecked,
    unreachableFromDefaultRef: unreachable,
    // How this snapshot was taken, so a reader can tell a reproducible refresh
    // from one that shipped whatever was on somebody's disk.
    source: FROM_LOCAL ? 'local working copy' : `github tarball gHashTag/t27@${T27_REF}`,
    overlayRefs: overlayUsed.map(({ ref, commit, added }) => ({ ref, commit, added })),
    wasmSource: wasmFrom,
    // Which compiler and deriver produced each row's analysis: a stored row is reused only
    // while this is unchanged (see the incremental block near the top).
    analysisKey,
  },
  wasmBytes,
  specCount: entries.length,
  totalLines,
  categories,
  repos: sources.map((s) => {
    const row = { repo: s.repo, commit: s.commit ?? sha, specs: entries.filter((e) => e.repo === s.repo).length }
    // A repo row without `discoveredAt` means "hand-vendored, founding". Only
    // the scan can say otherwise, so the flag is carried, never invented.
    return discoveredAt.has(s.repo) ? { ...row, discoveredAt: discoveredAt.get(s.repo) } : row
  }),
  duplicatesSkipped: duplicates,
  duplicates: duplicatePairs.sort((x, y) => x.path.localeCompare(y.path)),
  tags,
  health,
  notSource,
  backendFailures,
  featured: FEATURED,
  totals,
  ...(priorDiscovery
    ? {
      discovery: {
        ...priorDiscovery,
        worlds: (priorDiscovery.worlds ?? [])
          .filter((w) => sources.some((s) => s.repo === w.label))
          .map((w) => {
            const s = sources.find((x) => x.repo === w.label)
            return { ...w, commit: s.commit ?? w.commit, specs: entries.filter((e) => e.repo === w.label).length }
          }),
      },
    }
    : {}),
  specs: entries,
}, null, 0))

lap('aggregate + manifest')
console.log(`  timing: total ${((Date.now() - T_START) / 1000).toFixed(1)}s`)
console.log(`sync-t27-specs: ${entries.length} specs, ${Object.keys(categories).length} categories`)
console.log(`  sources: ${sources.map((s) => s.repo).join(', ')}  (${duplicates} duplicate files skipped by content hash)`)
// Over modules, and the line says so. These three used to cover every vendored
// file, which meant 81 of the failures were Markdown documents and damaged
// fixtures being counted as broken specs -- a number that could not go down.
console.log(`  health: ${health.ok} ok · ${health.warn} warn · ${health.fail} fail   (of ${health.ok + health.warn + health.fail} modules)`)
console.log(`  not a module: ${notSource.total}  ${Object.entries(notSource.byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')}`)
if (Object.keys(backendFailures).length) console.log(`  backend failures: ${JSON.stringify(backendFailures)}`)
console.log(`  t27 @ ${shortSha}${dirty ? ' (DIRTY -- snapshot includes uncommitted spec/compiler changes)' : ''}`)
console.log(`  wasm ${(wasmBytes / 1024).toFixed(0)} KB -> public/t27/t27_compiler.wasm  (${wasmFrom})`)
if (dirty) console.log(`  warning: commit t27 before shipping, or the recorded SHA understates the snapshot`)
