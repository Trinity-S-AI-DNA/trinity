# The five-layer system

The site orders what the repositories ship into five layers and shows the same ladder in
the header of every Explorer: **Specs -> Skills -> Crons -> Agents -> Tools**. Each layer
is a directory of `.t27` files in `gHashTag/t27`, each has a README that states its schema,
and each is rendered from those files by one generator through the compiler wasm. The
ladder counts on the site are read from the generated JSON at build time; the table next
to this chapter shows them for the commit the documentation was generated from.

## Specs

The base layer is the `.t27` corpus itself: everything under `specs/` in `gHashTag/t27`,
from the language core and the numeric formats to the catalogs below. The site vendors a
byte-identical copy under `apps/website/public/t27/files/` and compiles every file with the
vendored `t27_compiler.wasm` at build time. The Spec Explorer (`#/specs`) shows each file
with its verdict; the manifest that lists them (`public/t27/manifest.json`) is generated
and never hand-edited.

## Skills

A skill is a published procedure an agent can run -- a `SKILL.md` in one of the
repositories. `specs/skills/<id>.t27` declares each one (KIND, ID, NAME, REPO, SOURCE,
SUMMARY_EN, COMMAND, SPECS, TAGS, ENABLED, TIMEOUT_MIN). The witness label on a skill card
says how the card relates to the code: `spec+code` when both the spec and the `SKILL.md`
exist, `spec-only` when only the spec does, `code-only` when a skill file has no spec yet.
Skill Explorer: `#/skills`.

## Crons

A cron is a scheduled job: a workflow schedule, a Railway timer, a daemon loop.
`specs/crons/<id>.t27` declares each (HOST, REPO, SERVICE, INTERVAL_MS, TZ, RUNS,
RUNS_NOTE, ENABLED, NOTE, ON_FAILURE, CONTROL). `RUNS` lists the skill IDs a job invokes,
and only where the source shows the invocation; where none is found `RUNS` is empty and
`RUNS_NOTE` says so ("no skill invocation found in source"). The Cron Explorer (`#/crons`)
computes the next firing from `INTERVAL_MS` and `TZ`. A job that runs no skill is a job the
site cannot tie to the layers above; that is recorded, not hidden.

## Agents

The 27 letters of the alphabet, one spec each: `specs/agents/<letter>.t27` with LETTER,
ORDINAL, LETTER_NAME, NAME, DOMAIN, ARCHETYPE, REGISTER, LAYER, SUMMARY_EN, the three
binding documents (SOUL, AGENTS_DOC, ALPHABET), KEY_FILES, the entry and exit invariants,
CLARA_ROLE, SKILLS with SKILLS_NOTE and TOOLS with TOOLS_NOTE. An agent holds a skill or a
tool only where a source line binds it -- a `.claude/agents/*.md` file, the alphabet, a
phase description -- and the note cites that line or says why the list is empty. The
generator fails the build on an unknown skill or tool ID and on a binding stated on one
side only. Agent Explorer: `#/agents`. The full table is the next chapter.

## Tools

What an agent can call: the commands of the `tri` CLI and the tools of the MCP servers.
`specs/tools/tri/<command>.t27` is read from the clap `Commands` enum in
`cli/tri/src/main.rs` (one card per variant, with its nested actions and arguments);
`specs/tools/mcp/<server>.t27` from the server sources, manifests and `.mcp.json` entries of
both repositories, with the tool names, descriptions and input-schema keys. The witness on
every tri card is `source-parse` (the enum was read at a recorded commit) until someone
diffs the list against `tri --help` and relabels it `help-output`. Servers whose code is a published
package outside the repositories carry `EXTERNAL = true`. Tool Explorer: `#/tools`.

## From spec to site

One generator, `scripts/agents-from-specs.mjs` in `gHashTag/trinity`, reads the vendored
`.t27` files, compiles each through the wasm, reads the constants of the compiled module,
checks them against the schema of the layer, resolves every cross-reference (skill IDs in
crons and agents, tool IDs in agents, agent letters in tools, spec paths in skills), and
writes one JSON per layer under `public/`. It runs in `prebuild`, so a spec that does not
compile or a reference that does not resolve stops the site from building. No `.t27` is
parsed with a regular expression anywhere in that path.

Translations follow the same rule. `specs/i18n/<layer>-<locale>.t27` declares which fields
of which specs a bundle may translate and where the bundle lives; the bundle
(`apps/website/i18n/*.json`) carries the text; the generator checks that every bundle entry
names an existing spec and reports coverage. The specs stay English-only.

## Experience

Agents log what happened under `.trinity/experience/` in each repository: episodes as JSON,
notes as Markdown. `scripts/sync-agents-experience.mjs` reads both trees at their current
commit and writes `public/agents/experience.json` with counts per repository and, where an
episode names an agent letter, the attribution. At the commit this documentation was
generated from no episode is attributed to any letter -- the field the sync looks for is
absent from every episode -- and the agent cards say so. The snapshot records the commit of
each tree, not the path of the checkout.
