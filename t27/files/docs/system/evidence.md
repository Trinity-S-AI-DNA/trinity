# Evidence and witnesses

## Measured, declared, external

The project separates what was measured from what was declared, and both from what was taken
from outside. The tags are defined in the chapter "The project"; this chapter says how each tag is
earned on the site.

A **measured** number has a producer in a repository -- a script, a workflow, a test -- whose
output is committed or published, and the page names the commit. The ladder counts, the
`typecheck.ok` verdicts, the coverage of a translation bundle, the number of episodes in an
experience tree are measured in this sense: the generator that produces them runs in
`prebuild` and its inputs are pinned.

A **declared** value is stated in a spec or a canon document. The catalog size of 83
formats, the seven laws, the seven phases are declared: the site renders them from the file
that states them and links the file at the commit, but running nothing.

An **external** value is cited with its source and not reproduced. The site does not restate
hardware figures of `gHashTag/trinity-fpga` beyond what `siliconHistory.ts` transcribes with
its provenance note.

## Witness labels

Each catalog card carries a witness label that says how the card relates to the thing it
describes:

- Skills and crons: `spec+code` (spec and source both exist), `spec-only` (spec without
  source), `code-only` (source without spec). The counts per label are in the header of the
  Skill and Cron Explorers.
- Tools: `source-parse` (the command list was read from the source at a recorded commit;
  `cargo` was not run) or `help-output` (the list was diffed against `tri --help`). At the
  commit this documentation was generated from every tri card is `source-parse`.
- Agents: each skill and tool binding cites a source line in `SKILLS_NOTE` / `TOOLS_NOTE`, or
  the list is empty and the note says what was read.
- Experience: attributed only where an episode names a letter; otherwise counted as
  unattributed, never guessed.

The table the site renders next to this chapter collects these labels with their counts from
the generated JSON of every layer.

## Wasm verdicts

Every `.t27` the site shows was compiled at build time by the vendored `t27_compiler.wasm`,
and the JSON records `typecheck.ok` per file. Two limits of that verdict are stated on every
layer README and repeated here. First, the wasm's `typecheck.ok` is necessary, not
sufficient: it stays `true` for a wrong annotation such as `str = 5`, so the generator checks
the field schema of every card on top of it. Second, the bootstrap compiler on `master` was
not run against the catalog files in the commits that added them; the wasm is a build of the
compiler at a recorded sha, and that sha is in the generated JSON.

## CI gates

`gHashTag/t27` gates a pull request with workflows named for what they check (issue gate,
gate topology, conformance integrity, emit bit-exact, catalog count, now-sync, untrusted
input, among others under `.github/workflows/`). Two of them, `gate-topology` and
`untrusted-input`, fail on `master` for already-merged pull requests at the time of writing;
the catalog pull requests record this and do not bless or bypass them.

`gHashTag/trinity` gates the site with `npm run` checks that run in `prebuild` and in CI:
`check:spec-catalog`, `check:skills-catalog`, `check:crons-catalog`, `check:agents`,
`check:tools`, `check:docs`, the explorer and Queen language contracts, the Queen viewport
contract, `typecheck:ratchet` and `eslint`. A check that fails on `main` before a change is
reported as pre-existing, with its name, and is not counted as passing.

## Reproducing a number

To reproduce a count on the site, run the generator that produced it, in `apps/website` of
a checkout of `gHashTag/trinity`, with a sibling checkout of `gHashTag/t27` (or `T27_ROOT`
pointing to one):

- `node scripts/agents-from-specs.mjs` -- skills, crons, agents, tools JSON and their counts;
  `--check` compares against the committed JSON.
- `node scripts/docs-from-specs.mjs` -- this documentation's JSON, including the sources with
  their sha256 and the pinned commit.
- `node scripts/sync-agents-experience.mjs` -- the experience snapshot.
- `npm run check:docs` -- the chapter bodies, the sources, the generated tables, the
  forbidden-words scan in English and Russian.

Each JSON names the commit its inputs were read at. Comparing that commit with the one in
front of you is step one of any reproduction; a number that cannot be tied to a
commit is not a measurement.

## Published record

Two kinds of record exist outside the generated pages, and this documentation points to
them without adding to their claims. The TNF manuscript audit and reconciliation reports
live under `docs/reports/` in `gHashTag/t27` (`TNF-ARTICLE-AUDIT-W845.md`,
`TNF-ARTICLE-RECONCILIATION.md`); they record which statements of the article were checked
against which producer and what changed. The Zenodo README (`README-ZENODO.md`) describes
the archived package. No scientific claim is made in this documentation that is not in those
files or in the site's own content with its status tag.
