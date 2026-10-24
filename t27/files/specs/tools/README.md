# specs/tools — the `tri` CLI and the MCP servers as first-class `.t27` specs

> **Where this lives.** The `tri/` and `mcp/` directories in `gHashTag/t27` are the canonical
> home of these specs — edit them here. `gHashTag/trinity` keeps a vendored copy under
> `apps/website/public/t27/files/specs/tools/` and its build reads that copy through the
> vendored compiler wasm (`t27_compiler.wasm`). The wasm's `typecheck.ok` is necessary, not
> sufficient, so the site's generator (`scripts/agents-from-specs.mjs`) also checks the field
> schema below. The bootstrap compiler on `master` was not run against these files in the
> commit that added them.


Layer 5 of the ladder. One file per `tri` command of `gHashTag/t27` (`tri/<command>.t27`),
one per MCP server (`mcp/<server>.t27`) and, since S06 of gHashTag/trinity#988, one per command
the `gHashTag/trinity` Zig `tri` exports (`trinity/tri/<command>.t27`), so that every agent can
find the tools the repositories actually ship: what a command is for, which nested actions it has, which agent letter a source binds it
to, and where its code is. The JSON the site serves (`public/tools/spec-tools.json`) is
generated from these files by the real compiler (`t27_compiler.wasm`), never by a regex over
the `.t27`.

The three files at the top of this directory (`registry.t27`, `schema.t27`,
`tri_to_t27_converter.t27`) predate the catalog and are ordinary corpus specs; they are not
tool cards and the generator does not read them. Two more top-level files are contracts, not
cards, and the generator does not read them either: `catalog.t27` (`ToolsCatalog`,
`KIND = "tools-catalog"`: schema 2, repository-qualified IDs, legacy resolution, witnesses,
vocabularies, and what the consumer measures to) and `mcp_protocol.t27` (`McpProtocol`,
`KIND = "mcp-protocol"`: what the pinned `trinity-mcp` does with a JSON-RPC message).
`tools/trinity_tools_registry.py` holds the cards and both contracts to
`conformance/trinity/tools_inventory.json`, measured from the pinned consumer.

## The ladder

```
Specs  ->  Skills  ->  Crons  ->  Agents  ->  Tools
specs/**   specs/skills specs/crons specs/agents specs/tools/{tri,mcp,trinity/tri}
what is    what a run   what starts  who holds the  what the agents can call:
declared   does         a run and    skills, under  the tri CLI commands and
                        when         which law      the MCP servers, each with
                                                    its source and its owner(s)
```

Links go downward through declared fields only: a tool names the agent letters that own it
(`AGENTS`), an agent names the tools it holds (`TOOLS`), and the generator checks the two
directions agree and that every letter and every tool ID exists.

## Extraction and witness rule

Nothing in these files is typed by hand. Each file records where its text came from:

* **`tri/`** — read from the clap `#[derive(Subcommand)] enum Commands` in `cli/tri/src/main.rs`
  and the action enums in `cli/tri/src/*.rs` at the commit named in the file header. The
  witness label is `source-parse`: the enum, its `///` doc comments and the nested enums
  were read from the source and rendered the way clap derives them (kebab-case names, first
  doc paragraph as `ABOUT`). The next tier, `help-output`, is measured by
  `tools/trinity_tools_registry.py inventory --tri target/release/tri`: on 2026-09-12 the
  built binary lists the 52 commands the cards list and, for every command, the actions of
  `tri <command> --help` minus clap's implicit `help` equal the card's `ACTIONS`; the result is
  recorded under `help_witness` in `conformance/trinity/tools_inventory.json`.
* 15 of the 52 variants carry no `///` doc (`status`, `skill`, `cell`, `gen`, `test`,
  `verdict`, `experience`, `doctor`, `health`, `serve`, `fleet`, `red`, `mods`, `types`,
  `unparsed`). For those `ABOUT` quotes, in this order of preference, the `//!` module doc of
  the command's source file, the description of the mirroring tool in `cli/tri-mcp/src/main.rs`,
  or the handler's own strings in `main.rs` (routes, state-file paths, match arms).
  `ABOUT_SOURCE` names the exact source and line for every file.
* Some `///` docs in `main.rs` sit above a different variant than their text describes
  (e.g. the text about attached hardware sits above `Ci`, the text about unreachable source
  files above `Harness`, the text about duplicate type names above `Fmt`). The specs reproduce
  what clap would print for that variant; the misplacement is a defect of the source, reported
  here, not repaired silently.
* **`mcp/`** — tool names, descriptions and `inputSchema` property keys are read from the
  server code or manifest named in `SOURCE`: `scripts/mcp-traceability-server.js` (JS object
  literals), `cli/tri-mcp/src/main.rs` (`serde_json::json!` literals),
  `.claude/mcp/tri-ssot/manifest.json`, and in `gHashTag/trinity`
  `tools/mcp/trinity_mcp/server.zig` and `tools/mcp/needle_mcp/server.zig` (Zig string
  literals). The trinity server's static list has 210 entries, 32 of which have an unbalanced
  trailing brace in the source literal; they were parsed after adding or removing one, and the
  count is recorded in `TOOLS_NOTE`. Cell-generated tools appended at runtime from
  `data/cells/mcp_tools.json` are not listed (the file is not in the repository).
  `.trinity/mcp_schemas.json` (29 names) and `.claude/rules/mcp-servers.md` ("47+ tools") are
  other declarations of the same server and disagree with the code; the code is the source.
* Servers that are external packages (`gitbutler`, `notebooklm`, `zig-docs`,
  `railway-mcp-server`, `neon`) have `EXTERNAL = true`, `TOOLS = []` and a `TOOLS_NOTE` saying
  the list lives outside the repository. Nothing is listed rather than guessed.
* `tri-mcp` is a crate in `cli/tri-mcp` and is **not** registered in `.mcp.json` at this
  commit (`CONFIG = ""`). `tri-ssot`'s manifest names `python3 -m contrib.backend.github.mcp_server`,
  which the tree does not contain; its tools are declared, not executed.
* **`trinity/tri/`** — `gHashTag/trinity` has a `tri` binary of its own (`build.zig:2134`,
  executable `tri`, run step `tri`); the earlier statement here that it had none was wrong
  and is withdrawn. Its cards are read from the one registry that binary exports and its CI
  holds to the binary: `.trinity/registry.json`, written by `zig build export-registry` from
  `src/registry/command_table.zig` and diffed by the Registry schema check of `ci.yml`. The
  export keeps the 29 commands with `mcp_enabled`; the table holds 187 and the dispatcher
  names about three hundred tokens over five layers, none of which any CI artifact records.
  Witness label `registry-export`: nothing about runtime is claimed, no host here builds the
  binary and no workflow runs its help. Six of the 29 reach no dispatcher at the pin
  (`ROUTED = false`). The two repositories' tools stay two lists: a Trinity card's `ID` is its
  qualified ID (`gHashTag/trinity:tri/<command>`), never the short form (see Identity below).
* No absolute developer home path appears in any file. Where a config file names one
  (`.claude-plugin/.mcp.json`, needle), the home prefix is written as `<checkout>`.

## Identity, schema 2 and legacy resolution (S06)

Every card carries three fields beyond its family's: `REPO` (`gHashTag/t27` or
`gHashTag/trinity`), `QUALIFIED_ID` (`<owner>/<repo>:<family>/<name>`, unique across
repositories by construction) and `SCHEMA = 2`. The 62 cards written before schema 2, and
`mcp/inngest-dev` (the Queen's scheduler, 2026-09-13, written with the same short form), keep
a short `ID` (`tri/<command>`, `mcp/<server>`): the site route and the agents' `TOOLS`
arrays use it, and `QUALIFIED_ID = REPO:ID`; `LEGACY_COUNT = 63` in `catalog.t27`. A card of the Trinity `tri` has
`ID = QUALIFIED_ID` and no short form, so a same-named command (`fpga`, `test` at the pin;
`COLLISIONS` in `catalog.t27`) can never be selected by the wrong repository.

A legacy ID resolves through the table `LEGACY_IDS -> LEGACY_TARGETS` of `catalog.t27` and
nothing else: `tri/<name>` is always the `gHashTag/t27` command; a short ID that names only
a Trinity command is refused with `use gHashTag/trinity:tri/<name>`; a short ID in neither
table is unknown. `resolve_legacy` in `catalog.t27` is that rule as a function, and
`tools/trinity_tools_registry.py check` holds the table to the cards.

A Trinity `tri` card also carries what the registry states: `ALIASES`, `NAMESPACE`, `MODE`,
`STABILITY`, `CATEGORY`, `JOB_TIMEOUT`, `SIDE_EFFECTS` and `CAPABILITIES` (the registry's
`side_effects`, vocabulary `none | repo | filesystem | network | hardware`; nothing inferred
from a handler), `MCP_ENABLED`, `MCP_NAME`, `MCP_DISPLAY_NAME`, `EXAMPLES`; and what the
dispatcher states: `ROUTED`, `ROUTE_KIND`, `ROUTE_NOTE`, `EXIT_CODES`, `RESULT`,
`COLLIDES_WITH`, `WITNESS_SOURCE`. The witness vocabulary is `source-parse`,
`registry-export`, `help-output`, `runtime`; source parsing alone never claims runtime.

## Agent bindings

`AGENTS` on a tool and `TOOLS` on an agent (`specs/agents/<letter>.t27`) are filled only where
a source line names the command for that letter; the note field cites the line. At this commit:

| tool | agents | source |
|---|---|---|
| `tri/gen` | C, T | `.claude/agents/agent-c-compiler.md:40`, `.claude/agents/trinity.md:68` |
| `tri/test` | T, V | `.claude/agents/agent-v-verify.md:47`, `.claude/agents/trinity.md:70` |
| `tri/verdict` | V | `.claude/agents/agent-v-verify.md:49`, `docs/agents/AGENTS_ALPHABET.md:80` |
| `tri/experience` | E | `.claude/agents/agent-e-experience.md:64` |
| `tri/cell` | W | `docs/agents/AGENTS_ALPHABET.md:144` (domain "Workflow / tri cell") |

Everything else is `[]` with a note. `tri seal`, `tri verify`, `tri experience query`,
`tri notebook` and `tri bench` are named in agent files but are not commands of the CLI at
this commit; they are quoted in the notes and bound to nothing. `creator.md` and `verifier.md`
name `tri gen`/`tri test` but are not letter agents. The alphabet's key files point at
`src/tri/*.zig`, which neither repository contains at the pinned commits.

## Schema — `tri/<command>.t27` (module `tool_tri_<command>`, `-` → `_`)

| constant | type | meaning |
|---|---|---|
| `KIND` | `str` | `"tool"` |
| `FAMILY` | `str` | `"tri-cli"` |
| `ID` | `str` | `tri/<command>` |
| `REPO` | `str` | `gHashTag/t27` (schema 2) |
| `QUALIFIED_ID` | `str` | `gHashTag/t27:tri/<command>` (schema 2) |
| `SCHEMA` | `u32` | `2` |
| `COMMAND` | `str` | `tri <command>` |
| `VARIANT` | `str` | the clap enum variant, `Commands::<Name>` |
| `SOURCE` | `str` | the `.rs` file the command dispatches to |
| `ENTRY` | `str` | `cli/tri/src/main.rs` |
| `ABOUT` | `str` | the clap about text, or the fallback named in `ABOUT_SOURCE` |
| `ABOUT_SOURCE` | `str` | where `ABOUT` was read from (file and line) |
| `ACTIONS` | `[N]str` | nested subcommands, kebab-case |
| `ACTIONS_ABOUT` | `[N]str` | first doc paragraph per action, `""` when none (same N) |
| `ARGS` | `[N]str` | top-level arguments/flags, `"<name>: doc"` |
| `AGENTS` | `[N]str` | owning letters, only where a source names the command |
| `AGENTS_NOTE` | `str` | the source line, or why the list is empty |
| `WHEN_TO_USE` | `str` | the long about when the doc has more than one paragraph, else `ABOUT` |
| `CAST` | `str` | optional: `term/<id>/session.cast`, a recorded run of the command published at `t27.ai/term/<id>/`; the rules are `castProblems()` in `gHashTag/trinity` `apps/website/scripts/agents-from-specs.mjs`, and a CAST does not change `WITNESS` |
| `WITNESS` | `str` | `"source-parse"` |
| `ENABLED` | `bool` | |

## Schema — `mcp/<server>.t27` (module `tool_mcp_<server>`, `-` → `_`)

| constant | type | meaning |
|---|---|---|
| `KIND` | `str` | `"tool"` |
| `FAMILY` | `str` | `"mcp"` |
| `ID` | `str` | `mcp/<server>` |
| `QUALIFIED_ID` | `str` | `<REPO>:mcp/<server>` (schema 2) |
| `SCHEMA` | `u32` | `2` |
| `SERVER` | `str` | server name as registered |
| `SERVER_VERSION` | `str` | from the code/manifest, `""` when none |
| `TRANSPORT` | `str` | `stdio` |
| `LAUNCH` | `str` | command and args as the config states them |
| `ENV` | `[N]str` | environment variable names the config sets |
| `CONFIG` | `str` | the `.mcp.json` (or manifest) that registers it, `""` when none |
| `REPO` | `str` | `gHashTag/t27` or `gHashTag/trinity` |
| `SOURCE` | `str` | the file the tool list was read from |
| `ABOUT`, `ABOUT_SOURCE` | `str` | |
| `TOOLS` | `[N]str` | tool names as `tools/list` returns them |
| `TOOLS_ABOUT` | `[N]str` | descriptions (same N) |
| `TOOLS_INPUTS` | `[N]str` | comma-joined `inputSchema.properties` keys (same N) |
| `RESOURCES`, `RESOURCES_ABOUT` | `[N]str` | resources and their descriptions |
| `TOOLS_NOTE` | `str` | why `TOOLS` is empty or differs from other declarations |
| `EXTERNAL` | `bool` | third-party package or outside binary |
| `AGENTS`, `AGENTS_NOTE` | | as for `tri/` |
| `WITNESS` | `str` | `"source-parse"` |
| `ENABLED` | `bool` | |

Specs are English-only and ASCII-only (t27 LANG-EN / L3 PURITY); Greek letters and dashes in
the source texts are transliterated (`phi`, `--`). Russian summaries live in the bundle
declared by `specs/i18n/agents-ru.t27`, whose `SCOPE` includes `specs/tools`.

### `trinity/tri/<command>.t27`, module `tool_trinity_tri_<command>` (`-` -> `_`)

| field | type | value |
|---|---|---|
| `KIND` | `str` | `"tool"` |
| `FAMILY` | `str` | `"tri-cli"` |
| `ID` | `str` | `gHashTag/trinity:tri/<command>` (equal to `QUALIFIED_ID`) |
| `REPO` | `str` | `gHashTag/trinity` |
| `QUALIFIED_ID` | `str` | `gHashTag/trinity:tri/<command>` |
| `SCHEMA` | `u32` | `2` |
| `COMMAND` | `str` | `tri <command>` |
| `VARIANT` | `str` | the registry entry and its `cli_namespace` |
| `SOURCE` | `str` | `src/registry/command_table.zig` |
| `ENTRY` | `str` | where the dispatch lands, `""` when `ROUTED` is false |
| `ROUTED`, `ROUTE_KIND`, `ROUTE_NOTE` | `bool`, `str`, `str` | which dispatcher names the command (`execute_map`, `parse_command`, `main_chain`, `cell_map`, `none`) |
| `ABOUT`, `ABOUT_SOURCE` | `str` | the registry description and where it comes from |
| `ACTIONS`, `ACTIONS_ABOUT` | `[N]str` | `[]`: the registry declares no nested subcommands |
| `ARGS` | `[N]str` | `<name>: <type>, required|optional; <description>` from `input_params` |
| `ALIASES`, `NAMESPACE`, `MODE`, `STABILITY`, `CATEGORY`, `JOB_TIMEOUT` | registry fields | as exported |
| `SIDE_EFFECTS`, `CAPABILITIES` | `[N]str` | the registry's `side_effects`; `[]` = none declared |
| `MCP_ENABLED`, `MCP_NAME`, `MCP_DISPLAY_NAME`, `EXAMPLES` | registry fields | as exported |
| `EXIT_CODES`, `RESULT` | `[N]str`, `str` | what the process returns and prints (UnifiedOutput status, exit 0 unless a handler exits) |
| `COLLIDES_WITH` | `str` | the `gHashTag/t27` qualified ID of a same-named command, else `""` |
| `AGENTS`, `AGENTS_NOTE`, `WHEN_TO_USE` | as `tri/` | |
| `WITNESS`, `WITNESS_SOURCE` | `str` | `registry-export` and the export's identity |
| `ENABLED` | `bool` | |

## Editing

Edit in `gHashTag/t27` (`specs/tools/tri/*.t27`, `specs/tools/mcp/*.t27`,
`specs/tools/trinity/tri/*.t27`), re-vendor the byte-identical copy into `gHashTag/trinity`
`apps/website/public/t27/files/specs/tools/`, then run `node scripts/agents-from-specs.mjs` and
`npm run check:tools` in `apps/website`. To refresh from the code, re-run the extraction against
the current commit rather than editing `ABOUT` by hand; for `trinity/tri/`, re-run
`python3 tools/trinity_tools_registry.py inventory --trinity-root <clone> --tri target/release/tri`
and regenerate the cards from `.trinity/registry.json`, then `check`. The generator of the site
reads schema 2 since the companion change in `gHashTag/trinity` (`agents-from-specs.mjs`):
legacy cards keep their short `ID`, Trinity cards are qualified, and the emitted
`spec-tools.json` carries `repo`, `qualifiedId` and the legacy table.
