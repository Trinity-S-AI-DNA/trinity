---
name: blog-post
description: Write and publish a post to the t27.ai blog. Covers where the blog actually lives (not where it looks like it lives), the Post schema with its required receipts and openQuestions, the honesty rules the data file itself imposes, and the build gate. Use for any blog writing, editing, or publishing on t27.ai.
---

# Writing for the t27.ai blog

The blog exists to publish things that are **true and checkable**. A post that
overstates is worse than no post: the people who would catch it are the people
we work with, and the openXC7 maintainers read it.

## Where the blog is — read this before anything else

**`apps/website/src/data/blog/` in `gHashTag/trinity` (`~/trinity`).**

**The layout changed and this section used to describe the old one.** On `main` a post is
now three files, not one object:

```
apps/website/src/data/blog/
  index.ts          postsIndex: PostMeta[]  - metadata only, newest first
  bodies/<slug>.ts  exports `body` and `ruBody`
  posts.ts          imports each body and joins it to the index
```

Adding an article is three edits: the body file, the `index.ts` entry, and BOTH the import
line and the map line in `posts.ts`. A missing map line throws `Missing blog body: <slug>`
at load; a missing index entry fails silently.

**The migration trap.** The branch `fix/queen-deploy-railway-hook` is 199 commits ahead of
`main` and still carries the old single 1944-line `posts.ts` with `const <camelCase>: Post`
objects. An article written there does NOT transplant to `main` - a cherry-pick conflicts,
because the two files are different designs rather than different versions. Check first:

```bash
wc -l ~/trinity/apps/website/src/data/blog/posts.ts   # ~58 current, ~1900 the old branch
```

Work in a worktree cut from `main`, never `git checkout` - the main tree normally holds the
author's uncommitted work and switching under it fails or clobbers:

```bash
git worktree add -b blog/<slug> /tmp/wt-blog refs/remotes/origin/main
```

A fresh worktree has no `node_modules`, so `vite build` cannot run there. Check syntax per
file instead: `npx esbuild src/data/blog/bodies/<slug>.ts --outfile=/dev/null`.

Posts are **TypeScript objects**, not markdown files. They are rendered by
`apps/website/src/pages/Blog.tsx` (a Vite + React SPA with hash routing) and
served at `https://t27.ai/#/blog` and `https://t27.ai/#/blog/<slug>`.

Two decoys have already cost real time:

- **`trinity-fpga/docs/`** — a copy of the Docusaurus site carrying the same
  `url: 'https://t27.ai'`. Not deployed. Editing it changes nothing.
- **`trinity/docs/`** — the real Docusaurus site, at `/docs/`. It is the
  **documentation**, not the blog. Its blog plugin is deliberately `blog: false`.

If you are writing markdown, you are in the wrong place.

## The schema

```ts
interface Post {
  slug: string
  title: string
  summary: string          // one sentence; index + meta description
  date: string             // YYYY-MM-DD
  readingMinutes: number
  tags: string[]
  receipts: { label: string; href: string }[]   // at least one, required
  openQuestions: string[]                        // required
  body: Block[]
  published: boolean       // false while the text still has gaps
  ru?: { title; summary; openQuestions; body }   // all-or-nothing
}

type Block =
  | { kind: 'p';     text: string }
  | { kind: 'h';     text: string }
  | { kind: 'ul';    items: string[] }
  | { kind: 'ol';    items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code';  text: string }
  | { kind: 'table'; head: string[]; rows: string[][] }
```

Register the post in the `posts` array at the bottom of the file, newest first.

**`receipts` are artefacts a reader can open** — PR, issue, CI run, commit, file
at a ref. Label them with state: `#145 — what it did · MERGED 2026-08-13`,
`#134 — what is wrong · OPEN`.

**`openQuestions` is what is NOT proven.** The file's own comment is blunt about
it: *a post without this is marketing*. Put the real limits there — what was
inferred rather than measured, what is still failing, what you did not test.

**`ru` is all-or-nothing.** A Russian title over an English body is worse than
an English title, because the reader commits and then cannot finish. Fill every
field or omit `ru` entirely. A hedge that softens in translation —
"submitted upstream" becoming "accepted", "inferred" becoming "measured" — is a
false claim in a second language and harder to catch.

## The honesty rules the file imposes

They are written at the top of `posts.ts` and they bind every post:

- **A pull request's state is named exactly.** Merged ones say merged, open ones
  say "submitted upstream". Never a blanket claim over a mixed set. Re-check
  immediately before publishing, because states move:

  ```bash
  gh api "repos/openXC7/nextpnr-xilinx/pulls?state=all&per_page=30" \
    --jq '.[]|select(.user.login=="gHashTag")|"#\(.number) merged=\(.merged_at != null)"'
  ```

- **A design is not a fabricated chip.**
- **Unsolved defects stay in the text.**
- **No scale claims in titles.**

Beyond those: ages come from `git blame` of the *specific line*, never a file's
date — a file with 59 commits tells you nothing about when one line was written.
Use GitHub's GraphQL blame against the commit before the fix:

```bash
gh api graphql -f query='
{ repository(owner:"OWNER", name:"REPO") {
    object(expression:"<parent-sha>") { ... on Commit {
      blame(path:"path/to/file.cc") { ranges {
        startingLine endingLine
        commit { oid committedDate messageHeadline author { name } }
      } } } } } }'
```

And quote other people's caveats verbatim in a `quote` block rather than
paraphrasing them into something weaker.

## Building and publishing

**Node ≥ 20; the shell default here is 18 and npm refuses.**

```bash
export PATH="$HOME/.nvm/versions/node/v20.19.0/bin:$PATH"
cd /Users/playom/trinity/apps/website && npm install && npm run build:ci
```

TypeScript is the gate: a malformed `Block` or a missing required field fails
the build. It must exit 0.

### Two Pages sites, and only one of them is the site

This is the trap that wasted the most time, and it is documented in the
publisher's own header: *"trinity's own Pages is https://t27.ai/trinity/ — a
different URL that nobody visits. So for months 'merged, deploy green' and 'on
the site' were two different things."*

- **`gHashTag/trinity`** → `deploy-docs.yml` on push to `main` → serves
  **`https://t27.ai/trinity/`**. Green here means nothing for readers.
- **`gHashTag/ghashtag.github.io`** → holds the `CNAME` and serves the **apex,
  `https://t27.ai/`**. Its `publish-website.yml` checks out `trinity`, builds
  `apps/website`, and commits the bundle here — **on a `*/15 * * * *` cron**,
  plus `workflow_dispatch`. It publishes only when the content-hashed entry
  bundle actually changes.

So merging to `main` starts the clock; the apex catches up within ~15 minutes on
its own. Do not hand-copy a build into `ghashtag.github.io` — read its
`PUBLISHING.md` first if you ever must, because concurrent publishes silently
revert each other and that has already happened once.

Merging to `main` **is** the publication. Treat it as outward-facing and confirm
with the operator unless they have already said to publish.

### Verifying, without fooling yourself

Do not trust the push, and do not trust a page fetch. The SPA is hash-routed, so
`curl https://t27.ai/#/blog/<slug>` only ever fetches `index.html` and returns
200 no matter what — that is not evidence of anything.

Resolve the real chunk and grep it:

```bash
idx=$(curl -sS https://t27.ai/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
blog=$(curl -sS "https://t27.ai/$idx" | grep -oE 'Blog-[A-Za-z0-9_-]+\.js' | head -1)
curl -sS "https://t27.ai/assets/$blog" | grep -c '<your-slug>'
```

A `404` on the chunk, or a chunk whose hash differs from your local
`dist/assets/Blog-*.js`, means the apex has not republished yet — wait for the
next quarter-hour, do not start "fixing" it.

## `tri blog` exists, and cannot currently be built

`src/tri/blog_commands.zig` implements four subcommands that automate exactly the checks
this file describes doing by hand:

```
tri blog list           every post with its published state
tri blog check [slug]   re-verify each receipt's PR/issue state against GitHub
tri blog build          build apps/website
tri blog live <slug>    is the post actually served at the apex
```

Its own header says why those four: "each one automates a mistake that has already been
made by hand".

**It does not build.** `zig build` fails on `build.zig.zon`, which carries
`.hash = "PLACEHOLDER"` for the `zig_hdc` dependency - on `main`, not only locally. Until
that is fixed the four checks have to be done by hand, which is presumably why they keep
being done by hand. Related: issue #737, Build & Test red on `main`.

Fixing that placeholder is the highest-leverage small change in this area: it turns four
manual checks into four commands.

## Traps already paid for

- **`.gitignore` has a global `*.md`.** `!docs/**` and `!.claude/skills/**` now
  re-include what matters, but if a file is silently missing from `git status`,
  check `git check-ignore -v <file>`.
- **Branch off `origin/main`, never off whatever is checked out.** Verify with
  `git log --oneline origin/main..HEAD` — it should list only your commits. A
  branch cut from a feature branch drags that feature into `main` on merge.
- **`origin/main` moves under you.** Before pushing, re-check the file count in
  `git diff --stat origin/main..HEAD`. If it exceeds what you touched, you are
  about to revert someone else's work; rebase instead.
- **Exit codes lie through `tail`.** `cmd | tail -5` reports `tail`'s status.
  Capture the log to a file and grep it, or check `${PIPESTATUS[0]}`.
- **Dependabot drift breaks the docs build.** It bumps one package to an exact
  version and leaves the sibling on a caret; `deploy-docs.yml` runs `npm install`
  rather than `npm ci`, so the lockfile does not protect the deploy. Both
  `@docusaurus/*` and `react`/`react-dom` have broken this way.
