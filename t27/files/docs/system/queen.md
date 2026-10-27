# Queen orchestration

## The six-phase cycle and Phase 7

Agent T, the Queen, is the central orchestrator: "reads `graph_v2.json` and knows all module
dependencies", "conducts 26 sub-agents (A..Z, except T) by their domains", gathers results,
validates architecture invariants and enforces that the source of truth is in `.t27` / `.tri`
with Zig, Verilog and C only as backends (`docs/agents/AGENTS_ALPHABET.md`, section
"AGENT T -- QUEEN TRINITY", Responsibilities). Her module is `specs/queen/lotus.t27`.

The alphabet document draws the cycle she runs as six phases and a seventh added by the SOUL
law on git. The site renders the cycle from that document; in short:

1. **PLAN** -- analyse the task and select a strategy; read `graph_v2.json` for impact;
   decide which agents participate; check `.trinity/experience/` for similar tasks.
2. **ASSIGN** -- distribute tasks to agents by domain (A architecture, N numeric, P physics,
   F conformance, ...); set dependencies; create a tri cell for each agent (W seals).
3. **RUN** -- parallel execution; heartbeats; agents report to `.trinity/agent_events.jsonl`;
   T redistributes if necessary.
4. **TEST & BENCH** -- F checks conformance vectors, V runs benchmarks, G measures impact
   changes; metrics are collected in M for V's verdict.
5. **VERDICT** -- V analyses the metrics; `tri verdict --toxic` asks whether the change is
   toxic; E records the experience; if toxic, Q blocks the task.
6. **EVOLVE** -- update `graph_v2.json` if dependencies changed; update experience in E and
   M; S updates standards; W seals the tri-cell commit; Z updates documentation; T puts the
   final TAW seal.
7. **GIT WORKFLOW** ("new -- SOUL law") -- commit with `--all` and the message
   `cell:{id} issue:{N} ...`, then push `HEAD` to origin in strict mode; checks: sealed cell,
   non-toxic verdict, artifacts; the registry records the commit hash and the pushed flag.
   The alphabet writes both steps as a `git` subcommand of tri; the current clap surface
   does not expose one (witness: `cli/tri/src/main.rs` has no such variant), so they are
   quoted here as steps, not as commands to copy.

The document's SOUL law for TDD follows the seventh phase: any P0/P1 episode in `--strict`
mode is considered COMPLETE only after a successful push to `github.com/gHashTag/t27` with
bound sealed-cell and non-toxic verdict (the law names the push as a tri subcommand; see the
note on the seventh phase above). Where an agent letter appears in a phase
description, the tools chapter and the agent cards use that line as the source of a binding
(`tri cell` to W, `tri verdict` to V).

## Cell, seal, verdict

Three steps carry the cycle's state; two of them are tri commands with a spec under
`specs/tools/tri/` read from the clap enum of `cli/tri/src/main.rs`:

- **`tri cell`** -- the unit of work of one agent: created in ASSIGN, sealed by W with a hash
  in EVOLVE. Nested actions are listed on the tool card (`specs/tools/tri/cell.t27`).
- **`tri verdict`** -- V's decision over the metrics; `--toxic` is the question the cycle asks
  in VERDICT (`specs/tools/tri/verdict.t27`).
- **the git step** -- the seventh phase as the alphabet document writes it, as a `git`
  subcommand of tri. At the commit this documentation was generated from the clap enum of
  `cli/tri/src/main.rs` has no such variant, so the tool catalog has no card for it; the
  phase is documented from the alphabet and marked `[declared]`, and the gap is recorded here
  rather than filled with a card.

The seal itself is a hash. At the compiler level the same idea is the seal of the bootstrap
compiler (`bootstrap/stage0/FROZEN_HASH`, `CANON.md` section 0) and the ring canon: a ring
freezes when its hash is recorded, and drift between the recorded seal and the working tree
is a fact the dashboard shows.

## Two statements of the loop

The repository states the Queen's loop twice, and the two statements differ. The alphabet
document gives the seven phases above (PLAN, ASSIGN, RUN, TEST & BENCH, VERDICT, EVOLVE, GIT
WORKFLOW). `CLAUDE.md`, "Autonomous Execution Loop (AEL v2.0)", gives a six-phase loop for
an agent operating as the Queen -- OBSERVE (E), PLAN (T), DELEGATE (C/V), VERIFY (V),
SYNTHESIZE (L), LEARN (L) -- and, separately, the nine-phase PHI LOOP for ring-based
development (Issue, Spec, TDD, Code, Gen, Seal, Verify, Land, Learn).

This documentation renders the alphabet's cycle, because it is the one that names the tri
commands and the agent letters per phase, and records the AEL loop as the second statement
without reconciling them. Which one binds an autonomous agent in a given situation is a
question for `AGENTS.md` and its owners, not for a generated page.
