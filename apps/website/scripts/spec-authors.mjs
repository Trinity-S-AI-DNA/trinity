// WHO WROTE THE SPECS - the only contribution this project is actually about.
//
//   GH_TOKEN=$(gh auth token) node scripts/spec-authors.mjs > public/roadmap/spec-authors.json
//
// WHY THIS REPLACED A COMMIT COUNT. The PEOPLE board first read GitHub's
// `/contributors` endpoint, which answers "who has commits in this repository"
// - and BrowserOS is a fork, so its top contributor by that measure had 1,335
// commits and has never touched a `.t27` file. Owner's word, 2026-09-23: only
// the people who made the specs belong here.
//
// WHAT IS COUNTED, EXACTLY: commits that touch a directory holding `.t27`
// files, in every public gHashTag repository that has any, by GitHub account.
// Not every file under those directories is a spec, and a commit is not a file
// - so this is a measure of work ON the corpus, and the JSON says so in its own
// `method` field rather than leaving a reader to assume something finer.
//
// WHY THE SOURCES ARE DISCOVERED, NOT LISTED. Until 2026-10-02 this file named
// four repositories by hand. The specs had spread to eighteen, so everyone who
// wrote theirs in tri-net, trinity-fpga, trios, tri-claw or the tt-trinity
// chips was missing from the board. Owner's word, 2026-10-02: "why are not all
// spec creators on the leaderboard?" The list is now read from GitHub on every
// run: each public repository's tree, every directory with a `.t27` in it.
//
// A ROW IS A GITHUB ACCOUNT, NOTHING ELSE. Owner's word, 2026-10-02: rank by
// GitHub account names; "Claude Code (agent)" is not a GitHub account. A commit
// whose email GitHub cannot tie to an account - the swarm committing as
// "Trinity Bee", an agent committing as `claude@anthropic.com` - is credited to
// the account that opened the merged pull request carrying it, because that is
// the person who asked for the work and answered for it in review. See
// `attribute` below for the full order. What still has no account is counted
// as a number, not drawn as a person.
//
// THE SWARM'S WORK GOES TO THE LANE IT RAN ON. Owner's word, 2026-10-03. A bee's
// work reaches t27 master as the squash of a `queen-<issue>` pull request, and
// the squash is authored by whoever merged it, so the swarm's work read as the
// merger's own. The Queen records which lane carried each accepted issue and who
// lent it (`/queen/public-credits`), so a commit squashed from `queen-<issue>`
// whose issue has a credited lane goes to that lane's owner (`via: lane`). Turns
// from before an owner lent their lanes are not credited there and keep the
// rule below.
//
// WHY A FILE AND NOT A LIVE READ: an honest answer needs hundreds of GitHub
// requests and anonymous GitHub allows sixty an hour per address. A generated
// file costs the visitor nothing and cannot be rate-limited.
//
// It never clones anything: a first version of the stack count did, and filled
// the disk of the machine it was measuring from.

const TOKEN = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
if (!TOKEN) {
  console.error('spec-authors: set GH_TOKEN, e.g. GH_TOKEN=$(gh auth token)')
  process.exit(1)
}

/**
 * WHOSE REPOSITORIES. One owner was enough until 2026-10-22: the corpus lived
 * under the `gHashTag` account. That day the repositories moved to the
 * `Trinity-S-AI-DNA` organisation, `/users/gHashTag/repos` stopped listing
 * them, and a run found three spec paths in two repositories instead of 53 in
 * eleven - the next refresh would have collapsed the board to near zero.
 * The owners are read as a list; a commit is still counted once because the
 * SHAs are deduplicated across every owner and repository below.
 */
const OWNERS = (process.env.SPEC_AUTHOR_OWNERS ?? 'Trinity-S-AI-DNA,gHashTag')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const OWNER = OWNERS[0]

/**
 * WHERE A `.t27` IS A COPY, NOT A SPEC SOMEBODY WROTE THERE.
 *
 * `ghashtag.github.io` and `apps/website/public/t27/files` are the published
 * site - nearly 1,800 files each, every one of them a copy of a spec that lives
 * somewhere else. `external/` is t27 vendored into trinity byte for byte. A
 * commit that refreshes a copy is publishing, not writing, and counting it would
 * credit whoever ran the sync with the whole corpus.
 */
const MIRROR_REPOS = new Set(['ghashtag.github.io'])
const MIRROR_SEGMENTS = new Set(['public', 'external', 'vendor', 'node_modules', 'dist', 'build'])

/** Pages of 100 per spec directory. A bound on cost; the JSON records if it bit. */
const MAX_PAGES = 40

/**
 * COMMIT ADDRESSES THAT ARE A TOOL, NOT A PERSON.
 *
 * Claude Code commits as `Claude <claude@anthropic.com>` by default. GitHub
 * resolves that address to github.com/claude - an account registered by an
 * unrelated person in 2009 - so an earlier board drew a stranger's avatar and
 * credited them with 67 spec commits made on the owner's machine. The address
 * is never taken at GitHub's word; the commit goes to whoever opened its PR.
 */
const AGENT_EMAILS = new Set([
  'claude@anthropic.com',
  'noreply@anthropic.com',
  'claude-agent@anthropic.com',
  // `gh` commits made through the API without an author arrive as
  // `gh CLI <noreply@users.noreply.github.com>`, which GitHub ties to
  // github.com/noreply - another stranger, registered in 2011.
  'noreply@users.noreply.github.com',
])
/** Logins that are never a spec author: the strangers above, and GitHub's own web committer. */
const NOT_AUTHORS = new Set(['claude', 'noreply', 'web-flow'])

const isPerson = (login) =>
  Boolean(login) && !login.endsWith('[bot]') && !NOT_AUTHORS.has(login.toLowerCase())

let requests = 0
async function gh(url) {
  for (let attempt = 0; ; attempt += 1) {
    requests += 1
    let status
    try {
      const res = await fetch(`https://api.github.com/${url}`, {
        headers: {
          authorization: `Bearer ${TOKEN}`,
          accept: 'application/vnd.github+json',
          'user-agent': 'trinity-spec-authors',
        },
      })
      status = res.status
      // Read every body, even one about to be thrown away: an unread body whose
      // connection resets later surfaces as an unhandled rejection nobody awaits.
      const body = await res.text()
      if (res.ok) return JSON.parse(body)
      // 409 is GitHub's answer for an empty repository; it holds no specs.
      if (status === 409 || status === 404) return null
      if (!(status >= 500 || status === 403 || status === 429)) {
        throw new Error(`${url}: ${status} ${body}`)
      }
    } catch (err) {
      // A dropped connection - before the answer or halfway through its body -
      // is the network, not an answer. Hundreds of requests make one likely,
      // and a run that dies on it publishes nothing.
      if (status && status < 500 && status !== 403 && status !== 429) throw err
    }
    if (attempt >= 5) throw new Error(`${url}: gave up after ${attempt + 1} attempts`)
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
  }
}

/** Run `fn` over `items` with at most `limit` in flight. */
async function pool(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}

// ---- 1. Sources: every public, non-fork repository with a `.t27` in it. ----

const repos = []
const seenRepos = new Set()
for (const owner of OWNERS) {
  for (let page = 1; ; page += 1) {
    const rows = await gh(`users/${owner}/repos?type=owner&per_page=100&page=${page}`)
    if (!rows?.length) break
    for (const r of rows) {
      if (r.private || r.fork || MIRROR_REPOS.has(r.name)) continue
      const key = r.full_name.toLowerCase()
      if (seenRepos.has(key)) continue
      seenRepos.add(key)
      repos.push(r)
    }
    if (rows.length < 100) break
  }
}

const isMirrorPath = (path) => path.split('/').some((seg) => MIRROR_SEGMENTS.has(seg))

/**
 * The smallest set of paths that covers every `.t27` in a tree: the directory
 * of each file, minus any directory already under another one in the set. A
 * file at the root is its own path, so a root `.t27` does not pull the whole
 * repository in with it.
 */
function specPaths(tree) {
  const dirs = new Set()
  for (const node of tree) {
    if (node.type !== 'blob' || !node.path.endsWith('.t27') || isMirrorPath(node.path)) continue
    const cut = node.path.lastIndexOf('/')
    dirs.add(cut < 0 ? node.path : node.path.slice(0, cut))
  }
  const sorted = [...dirs].sort()
  return sorted.filter((d) => !sorted.some((o) => o !== d && d.startsWith(`${o}/`)))
}

const sources = []
const truncated = []
/**
 * Every file in a repository. GitHub cuts a recursive tree off at about 100,000
 * entries, and vibee-lang is past that, so a cut tree is read again one
 * top-level directory at a time; only a directory that is itself too big is
 * reported as truncated.
 */
async function filesOf(r) {
  const tree = await gh(`repos/${r.full_name}/git/trees/${encodeURIComponent(r.default_branch)}?recursive=1`)
  if (!tree?.tree) return []
  if (!tree.truncated) return tree.tree
  const root = await gh(`repos/${r.full_name}/git/trees/${encodeURIComponent(r.default_branch)}`)
  const files = (root?.tree ?? []).filter((n) => n.type === 'blob')
  for (const dir of (root?.tree ?? []).filter((n) => n.type === 'tree')) {
    const sub = await gh(`repos/${r.full_name}/git/trees/${dir.sha}?recursive=1`)
    if (sub?.truncated) truncated.push(`${r.full_name}:${dir.path} (tree)`)
    for (const n of sub?.tree ?? []) files.push({ ...n, path: `${dir.path}/${n.path}` })
  }
  return files
}

await pool(repos, 6, async (r) => {
  for (const path of specPaths(await filesOf(r))) sources.push({ repo: r.full_name, path })
})
sources.sort((a, b) => a.repo.localeCompare(b.repo) || a.path.localeCompare(b.path))

// ---- 2. Commits under those paths, each SHA once across every repository. ----

/** sha -> { repo, row } - a fork or a shared history is one piece of work, not two. */
const commits = new Map()
await pool(sources, 4, async ({ repo, path }) => {
  let page = 1
  for (; page <= MAX_PAGES; page += 1) {
    const rows = await gh(
      `repos/${repo}/commits?path=${encodeURIComponent(path)}&per_page=100&page=${page}`,
    )
    if (!rows?.length) break
    for (const row of rows) {
      const seen = commits.get(row.sha)
      if (seen) seen.repos.add(repo)
      else commits.set(row.sha, { repo, repos: new Set([repo]), row })
    }
    if (rows.length < 100) break
  }
  if (page > MAX_PAGES) truncated.push(`${repo}:${path}`)
})

// ---- 2b. The swarm's lanes: queen-<issue> squashes and who lent the lane. ----

const CREDITS_URL =
  process.env.QUEEN_CREDITS_URL ?? 'https://trios-agent-server-production.up.railway.app/queen/public-credits'
const SWARM_REPO = `${OWNER}/t27`

/** issue -> login, from the Queen's own record of accepted turns. */
const laneOwner = new Map()
let laneCreditsRead = false
try {
  const res = await fetch(CREDITS_URL, { headers: { 'user-agent': 'trinity-spec-authors' } })
  if (!res.ok) throw new Error(`${res.status}`)
  const body = await res.json()
  for (const c of body.credits ?? []) {
    if (Number.isInteger(c.issue) && isPerson(c.github)) laneOwner.set(c.issue, c.github)
  }
  laneCreditsRead = true
} catch (err) {
  // Without the record nothing is re-attributed; the old rule stands and the
  // JSON says why, rather than the board silently changing hands.
  console.error(`spec-authors: lane credits unavailable (${err.message}); keeping the merger rule`)
}

/** merge commit sha -> issue, for every merged queen-<issue> pull request. */
const queenSquash = new Map()
if (laneOwner.size > 0) {
  for (let page = 1; page <= 200; page += 1) {
    const rows = await gh(`repos/${SWARM_REPO}/pulls?state=closed&per_page=100&page=${page}`)
    if (!rows?.length) break
    for (const pr of rows) {
      const m = /^queen-(\d+)$/.exec(pr.head?.ref ?? '')
      if (m && pr.merged_at && pr.merge_commit_sha) queenSquash.set(pr.merge_commit_sha, Number(m[1]))
    }
    if (rows.length < 100) break
  }
}

// ---- 3. Attribution: one GitHub account per commit, or none. ----

/**
 * WHO A COMMIT BELONGS TO, IN THIS ORDER:
 *
 * 0. `lane` - a squash of a merged `queen-<issue>` pull request in t27 whose
 *    issue the Queen credits to the person who lent the lane (see 2b).
 * 1. `author` - the account GitHub tied to the commit's email. Not for an agent
 *    address, which GitHub ties to a stranger.
 * 2. `pr` - the account that opened the merged pull request carrying the
 *    commit. This is how the swarm's and the agents' commits find their person.
 * 3. `committer` - the account that applied the commit, when it is a person
 *    and not GitHub's own web committer.
 * 4. `name` - the name on the commit, when it is exactly an account already on
 *    the board (one person committing from an address they never linked).
 *
 * Anything else is `unattributed`: counted, never drawn as a row.
 */
async function prAuthor(repo, sha) {
  const pulls = await gh(`repos/${repo}/commits/${sha}/pulls?per_page=100`)
  const merged = (pulls ?? []).filter((p) => p.merged_at && isPerson(p.user?.login))
  merged.sort((a, b) => a.merged_at.localeCompare(b.merged_at))
  return merged[0]?.user.login ?? null
}

const credited = await pool([...commits.entries()], 4, async ([sha, { repo, row }]) => {
  const issue = repo === SWARM_REPO ? queenSquash.get(sha) : undefined
  const lender = issue === undefined ? undefined : laneOwner.get(issue)
  if (lender) return { sha, login: lender, via: 'lane' }
  const email = (row.commit?.author?.email ?? '').toLowerCase()
  const author = row.author?.login
  if (!AGENT_EMAILS.has(email) && isPerson(author)) return { sha, login: author, via: 'author' }
  const viaPr = await prAuthor(repo, sha)
  if (viaPr) return { sha, login: viaPr, via: 'pr' }
  const committer = row.committer?.login
  if (isPerson(committer)) return { sha, login: committer, via: 'committer' }
  return { sha, login: null, name: row.commit?.author?.name ?? null, via: null }
})

const people = new Map()
function credit(login, via, repos) {
  const key = login.toLowerCase()
  let row = people.get(key)
  if (!row) {
    row = { login, avatar: `https://github.com/${login}.png?size=96`, commits: 0, via: {}, repos: [] }
    people.set(key, row)
  }
  row.commits += 1
  row.via[via] = (row.via[via] ?? 0) + 1
  for (const r of repos) {
    const short = r.replace(/^[^/]+\//, '')
    if (!row.repos.includes(short)) row.repos.push(short)
  }
}

const leftover = []
for (const c of credited) {
  const { repos: rs } = commits.get(c.sha)
  if (c.login) credit(c.login, c.via, rs)
  else leftover.push({ ...c, repos: rs })
}

const unattributed = { commits: 0, names: {} }
for (const c of leftover) {
  const match = c.name && people.get(c.name.toLowerCase())
  if (match) {
    credit(match.login, 'name', c.repos)
    continue
  }
  unattributed.commits += 1
  const name = c.name ?? '(no name)'
  unattributed.names[name] = (unattributed.names[name] ?? 0) + 1
}

const ranked = [...people.values()].sort(
  (a, b) => b.commits - a.commits || a.login.localeCompare(b.login),
)

console.error(
  `spec-authors: ${sources.length} spec paths in ${new Set(sources.map((s) => s.repo)).size} repositories, ` +
    `${commits.size} commits, ${ranked.length} accounts, ${unattributed.commits} unattributed, ${requests} requests`,
)

process.stdout.write(
  `${JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      method:
        'Commits touching a directory that holds .t27 files, in every public repository of the project accounts (Trinity-S-AI-DNA and gHashTag) that has one (published mirrors and vendored copies excluded), each commit counted once. Credited to a GitHub account: for a squash of the swarm\'s queen-<issue> pull request, the person whose provider key the accepted bee ran on (the Queen\'s record); otherwise the commit author, else whoever opened the merged pull request carrying it, else the committer. A measure of work on the spec corpus: not every file under those directories is a spec, and a commit is not a file.',
      laneCredits: { read: laneCreditsRead, source: CREDITS_URL, issues: laneOwner.size, queenSquashes: queenSquash.size },
      sources,
      truncated,
      unattributed,
      people: ranked,
    },
    null,
    2,
  )}\n`,
)
