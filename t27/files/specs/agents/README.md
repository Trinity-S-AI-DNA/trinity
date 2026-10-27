# specs/agents — the 27-agent alphabet as first-class `.t27` specs

> **Where this lives.** This directory in `gHashTag/t27` is the canonical home of these
> specs — edit them here. `gHashTag/trinity` keeps a vendored copy under
> `apps/website/public/t27/files/specs/agents/` and its build reads that copy through the
> vendored compiler wasm (`t27_compiler.wasm`). The wasm's `typecheck.ok` is necessary,
> not sufficient, so the site's generator (`scripts/agents-from-specs.mjs`) also checks the
> field schema below. The bootstrap compiler on `master` was not run against these files in
> the commit that added them.


One file per agent of the Trinity alphabet (`docs/agents/AGENTS_ALPHABET.md`, v3.0): A…Z and
the 27th seat, Ti. The `.t27` file is the source of truth for the agent card on t27.ai;
the JSON the site serves (`public/agents/spec-agents.json`) is generated from these files by
the real compiler (`t27_compiler.wasm`), never by a regex. The agents are bound together by
`SOUL.md` and `AGENTS.md` at the repository root and by their experience log
(`.trinity/experience/`), which is joined to the cards by evidence only (see below).

File name: `<letter>.t27` (lower-case; `ti.t27` for the 27th); module name: `agent_<letter>`.
Specs are English-only and ASCII-only (t27 LANG-EN / L3 PURITY): the Greek glyph of a letter
is carried as its name in `LETTER_NAME`, not as a character.

## The ladder

```
Specs  ->  Skills  ->  Crons  ->  Agents
specs/**   specs/skills specs/crons specs/agents
what is    what a run   what starts  who holds the skills, under which
declared   does         a run and    law (SOUL.md, AGENTS.md), with which
                        when         entry/exit invariant, and what they
                                     have lived through (experience)
```

Each layer is declared in `.t27`, vendored byte-identically into `gHashTag/trinity`
(`apps/website/public/t27/files/specs/...`), compiled by the vendored wasm at build time and
rendered by one explorer per layer (`#/skills`, `#/crons`, `#/agents`). Links go downward
only through declared fields: an agent names its `SKILLS`; a cron names the skills it `RUNS`;
so an agent's crons are *derived* (crons whose `RUNS` intersect the agent's `SKILLS`), never
written by hand.

## Schema (every constant is `pub const`)

| constant          | type      | meaning                                                                                   |
|-------------------|-----------|-------------------------------------------------------------------------------------------|
| `KIND`            | `str`     | always `"agent"`                                                                          |
| `ID`              | `str`     | `t27/<LETTER>` (`t27/A` … `t27/Z`, `t27/TI`)                                              |
| `LETTER`          | `str`     | `A`…`Z` or `TI`                                                                           |
| `ORDINAL`         | `u8`      | 1…27, the row in the alphabet table                                                       |
| `LETTER_NAME`     | `str`     | the Greek/Hebrew letter name from the table (`Alpha`, `Phi`, `Double-Vav`, `Ti`)          |
| `NAME`            | `str`     | display name as in the table, e.g. `Epsilon (Experience)`                                 |
| `DOMAIN`          | `str`     | the Domain column                                                                         |
| `ARCHETYPE`       | `str`     | the Archetype column (`Bull - leader, primary force`)                                     |
| `REGISTER`        | `str`     | `R0`…`R26` from the table                                                                 |
| `LAYER`           | `str`     | `Archetypal` (A–I), `Spiritual` (J–R) or `Physical` (S–Z, Ti) — the three-layer tables    |
| `SUMMARY_EN`      | `str`     | one paragraph: `<DOMAIN>. <Trinity-meaning sentence>`                                     |
| `SOUL`            | `str`     | `SOUL.md` — the law every agent is bound by                                               |
| `AGENTS_DOC`      | `str`     | `AGENTS.md` — the operational rules                                                       |
| `ALPHABET`        | `str`     | `docs/agents/AGENTS_ALPHABET.md` — where the roster is defined                            |
| `KEY_FILES`       | `[N]str`  | the Key files column; `[0]str = []` for the reserved seat                                 |
| `ENTRY_INVARIANT` | `str`     | the Entry invariant of the schema-details section                                         |
| `EXIT_INVARIANT`  | `str`     | the Exit invariant                                                                        |
| `CLARA_ROLE`      | `str`     | the CLARA role; `""` when the table says `—`                                              |
| `SKILLS`          | `[N]str`  | skill IDs (`specs/skills`) the agent holds — ONLY when a source binds them (see below)     |
| `SKILLS_NOTE`     | `str`     | where the binding comes from, or why `SKILLS` is empty; required when `SKILLS` is `[]`    |
| `TOOLS`           | `[N]str`  | tool IDs from `specs/tools` (`tri/<command>`, `mcp/<server>`) a source line binds to the letter |
| `TOOLS_NOTE`      | `str`     | the source line, or why `TOOLS` is empty; required when `TOOLS` is `[]`                    |
| `EXPERIENCE_LOG`  | `str`     | the experience directory the agent's episodes are read from, or `""`                      |
| `ENABLED`         | `bool`    | `false` only for the reserved seat (Ti)                                                   |

The generator (`scripts/agents-from-specs.mjs` in trinity) fails the build when: the compiler
verdict is not clean; a constant is missing, not `pub`, or has the wrong annotation / array
length / integer range; `ID` ≠ `t27/<LETTER>`; the file name does not match the letter;
`ORDINAL` is duplicated or outside 1…27; `LAYER` is not one of the three; `SKILLS` names an
ID with no skill spec; `SKILLS` is empty without a `SKILLS_NOTE`; or the directory does not
hold exactly 27 specs. The wasm's `typecheck.ok` alone is necessary, not sufficient.

## Skill binding rule (evidence, not inference)

`SKILLS` is filled only when one of these names the skill for that letter:

1. a row of `specs/OWNERS.md` that assigns a skill directory to the letter;
2. the agent's prompt file `.claude/agents/<name>.md` referencing a skill directory or
   `/skill` command;
3. the alphabet's Key files column pointing at a skill directory.

At the commit these specs were written from, only one binding exists:
`.claude/agents/trinity.md` (the T / Queen prompt) runs `/phi-loop` (L33) and
`/tri-pipeline` (L45), so `T` holds `t27/phi-loop` and `t27/tri-pipeline`. Every other
agent has `SKILLS = []` with a `SKILLS_NOTE` saying so. Nothing is inferred from a domain
name matching a skill name.

## Experience attribution rule (`public/agents/experience.json`)

`scripts/sync-agents-experience.mjs` (trinity) reads `.trinity/experience/**` in the trinity
checkout and in the t27 checkout (`T27_ROOT`; when unset, the sibling directory `../t27` of the
trinity repo root, i.e. `$(git rev-parse --show-toplevel)/../t27`) and writes a committed
snapshot. No absolute home path is written anywhere. The rule,
kept identical in the script header:

1. An episode is one JSON object: a `*.json` file holding an object, each object of a `*.json`
   array, or each line of a `*.jsonl` file. `*.md` files are listed as notes, not counted.
   Files that do not parse are counted as `unreadable` and listed.
2. The agent is read from the first present field of `agent_letter`, `letter`, `agent`,
   `agent_id`, `agents` (array: every member), `owner`.
3. A value attributes to a letter only when, case-insensitively, it is one letter A–Z; or
   `ti` / `27th`; or `t27/<letter>`; or it starts with `agent-<letter>` / `agent_<letter>` /
   `agent <letter>` followed by a non-letter. A model name (`claude-opus-4.6`), a person or a
   repository is **not** a letter: the episode is counted under `unattributed` and the raw
   value is tallied in `unattributed.agentValues`.
4. Timestamp from `timestamp` (unix s / ms / ISO-8601) else `date`; outcome from `verdict`,
   `status`, `outcome`, or `success`; lessons from `learnings`, `lessons`, `lessons_learned`,
   then `mistakes` (prefixed `mistake:`), 160 characters each, at most 12 per agent.
5. Output is sorted so two runs over the same trees differ only in `generatedAt`.

The generator joins the snapshot by `LETTER`. An agent with zero attributed episodes is shown
as "no attributed episodes" and carries the witness label `spec-only`; one with episodes is
`spec+experience`. At the time of writing, no episode in either repository names an agent
letter (trinity episodes have no agent field; the t27 ring file names a model), so all 27
agents are `spec-only` and the whole log (386 episodes, 56 unreadable files) is
`unattributed`. That is the measured state, not a gap to paper over.

## Known inconsistencies in the source document (carried as written, not corrected)

* The full table gives Ti the register `r20 / TAW`; the detail section gives `υ / R19`.
  The specs use `R26` for the 27th seat as the only free register; the table row is quoted in
  the alphabet document, not here.
* `F` and `U` are both glyphed `φ` in the table; `LETTER_NAME` keeps `Phi` for F and `Upsilon`
  for U from the detail sections.
* `specs/OWNERS.md` names `R-Reasoning`; the alphabet has `R = Rho (Runtime)`. The specs follow
  the alphabet (the roster's source of truth); the OWNERS row is unchanged.

## Editing

Edit in `gHashTag/t27` (`specs/agents/<letter>.t27`), re-vendor the byte-identical copy into
`gHashTag/trinity` `apps/website/public/t27/files/specs/agents/`, then run
`node scripts/agents-from-specs.mjs` and `npm run check:agents` in `apps/website`. Russian
summaries live in the bundle declared by `specs/i18n/agents-ru.t27`
(`apps/website/i18n/agents.ru.json`, entries keyed `t27/<LETTER>`); the spec stays English.
