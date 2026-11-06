# Tooling

## The tri CLI

`tri` is the command of the toolchain: `./scripts/tri` is an exec-only shim (SOUL Article
VIII, section 8.2) that resolves the Rust binary `t27c`, passes `--repo-root` and executes
it. The catalog in `specs/tools/tri/` holds one spec per variant of the clap `Commands` enum
in `cli/tri/src/main.rs`: the command word, the enum variant, the source file and the entry
point, the doc comment as `ABOUT` with `ABOUT_SOURCE` naming where the text came from, the
nested actions with their own doc comments, the arguments, the agent letters that own the
command with the evidence line, when to use it, and the witness.

The table the site renders next to this chapter is generated from
`public/tools/spec-tools.json` -- command, actions, owners, witness -- and the counts in its
header are read from the same file. The witness on every tri card at the commit this
documentation was generated from is `source-parse`: the enum and its `///` comments were
read from the source at a recorded commit, and `cargo` was not run. A card is relabelled
`help-output` only when someone diffs the list against `tri --help` and records the result;
until then the label says what was and was not done.

Commands whose variant has no doc comment quote the source they borrow their description
from (for example `tri cell` quotes the `tri-mcp` tool descriptions), so that no `ABOUT` is
invented.

## MCP servers

The second family is the Model Context Protocol servers the two repositories ship or
register: for `gHashTag/t27` the `tri-mcp` crate, the `tri-ssot` manifest, `t27-traceability`
and the entries of `.mcp.json`; for `gHashTag/trinity` the `trinity` and `needle` Zig servers
and its `.mcp.json` entries. `specs/tools/mcp/<server>.t27` carries the launch line,
transport, version, environment variables, config path, repository, source, the tool names
with descriptions and input-schema keys, resources, and the witness.

Servers whose code is a published package outside the repositories carry `EXTERNAL = true`
and a `TOOLS_NOTE` saying the tool list is not in either tree; nothing is invented for them.
Two facts are recorded rather than fixed: `tri-mcp` is not registered in `.mcp.json` at the
pinned commit (`CONFIG` is empty), and the `tri-ssot` manifest names a module the tree does
not contain.

Two repositories are two lists. `gHashTag/trinity` does have a command-line binary of its own
(an earlier version of this chapter said it had none; that was wrong): since S06 of
gHashTag/trinity#988 its commands are cards under `specs/tools/trinity/tri/`, read from the one
registry that binary exports and its CI holds to the binary (`.trinity/registry.json`, 29
commands of a 187-entry table), with repository-qualified IDs (`gHashTag/trinity:tri/<command>`)
so that a same-named command of the two binaries is never confused. `specs/tools/catalog.t27`
states the schema, the identity rules and the legacy resolution; `specs/tools/mcp_protocol.t27`
states what the Trinity MCP server does with a request; `tools/trinity_tools_registry.py` holds
both and the cards to a measured inventory of the consumer.

## Who owns a tool

A tool names the agent letters that own it (`AGENTS`) only where a source line does, and
`AGENTS_NOTE` cites that line or names the sources that were checked and found silent. The
agent spec names the tool back (`TOOLS`), and the site's generator fails the build on a
binding stated on one side only. Today five commands are bound -- `tri gen` (C, T),
`tri test` (T, V), `tri verdict` (V), `tri experience` (E), `tri cell` (W) -- from the phase
descriptions of `docs/agents/AGENTS_ALPHABET.md` and the `.claude/agents/*.md` files; the
other commands and every MCP server carry an empty `AGENTS` with a note. Skills are
cross-linked when a skill spec's own `COMMAND` or `SUMMARY_EN` names a tri command.

The map the site draws next to this chapter groups the tri commands by owning letter (with a
group for the unowned) and the MCP servers by repository, with the external ones marked. It
is drawn from the generated JSON, so a new binding in a spec moves a command on the map
without anyone editing the figure.
