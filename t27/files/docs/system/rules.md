# Constitution and the rules of the game for agents

## The constitutional stack

`AGENTS.md` is the entry point for humans and coding agents; its first section fixes the
reading order and which document wins when two disagree:

1. `SOUL.md` -- the canonical constitution: language policy, TDD mandate, validation.
2. `docs/nona-03-manifest/SOUL.md` -- the expanded reference; if it conflicts with root
   `SOUL.md`, root wins.
3. `docs/T27-CONSTITUTION.md` -- Articles SSOT-MATH, LANG-EN and DOCS-TREE, and the
   invariant laws.
4. `TASK.md` with `docs/coordination/TASK_PROTOCOL.md` -- multi-agent coordination, locks,
   anchor issue.
5. The nearest `OWNERS.md` -- domain ownership for the directories you edit.

`CLAUDE.md` adds the operational loop for an autonomous agent and says, in its first line,
that repo-specific law always overrides generic tooling defaults. The rest of this chapter
quotes these files; the site links each quotation to the file at the commit the
documentation was generated from.

## SOUL articles

`SOUL.md` is organised in articles. The ones every change touches:

- **Article I, The Language Policy.** Source files must be ASCII-only (U+0000..U+007F);
  identifiers and comments must be English. The rule names `.t27`, `.tri`, `.zig`, `.c`,
  `.h`, `.v` and build scripts. Cyrillic and other non-Latin scripts are forbidden in
  identifiers and comments unless an Architect-approved exception exists (section 1.1).
  First-party documentation is English (section 1.2, restated as Article LANG-EN of the
  constitution).
- **Article II, The TDD Mandate.** "Every `.t27` specification MUST contain at least one of"
  a `.test` section, an `.invariant` section or a `.bench` section. "No exceptions. A spec
  without tests is not a specification -- it is a draft." (section 2.1, the Iron Law).
- **Article III, No Prototype Mode.** There is no `--allow-no-tests` flag and no grace
  period; the parser rejects a spec without tests with `TDD contract violated`.
- **Article IV, Validation Requirements.** Enforcement at parser level, at codegen level and
  at build time.
- **Article V, Amendment Process.** What can and cannot be amended.
- **Article VI, Enforcement.** Agent compliance, human compliance, automated enforcement.
- **Article VII, Sacred Trinity.** Three pillars: the identity phi^2 + 1/phi^2 = 3, ternary
  computation, and TDD inside the spec. "Violating any violates the whole."
- **Article VIII, NO-NEW-SHELL.** No new `*.sh` on the engineering critical path; the
  permitted exceptions are the exec-only shim `scripts/tri` and the one-time
  `scripts/setup-git-hooks.sh`. Section 8.3 extends the rule to Python: validation,
  conformance gates and doc language checks live in `t27c` (Rust).

The catalog specs under `specs/skills`, `specs/crons`, `specs/agents`, `specs/tools` and
`specs/docs` are declarative constant modules and carry no `.test` block; the site's
generators check their field schema instead. Whether Article II applies to declarative
catalog modules is not decided in `SOUL.md` today; this documentation records the practice
and does not claim a ruling.

## Invariant laws and their priority

`docs/T27-CONSTITUTION.md`, section 2, defines seven Invariant Laws that "never change
without constitutional amendment". The site renders the table from that file; in short:

- **L1 TRACEABILITY** -- no code merged without `Closes #N`; every PR references an issue.
  Enforced by `.github/workflows/issue-gate.yml`.
- **L2 GENERATION** -- files under `gen/` are generated; edit the `.t27` spec instead.
- **L3 PURITY** -- ASCII-only identifiers and comments in `.t27`, `.zig`, `.v`, `.c`.
- **L4 TESTABILITY** -- every `.t27` spec must contain `test`, `invariant` or `bench`.
- **L5 IDENTITY** -- phi^2 = phi + 1 on the reals, hence phi^2 + 1/phi^2 = 3; IEEE
  binary64 checks use a tolerance.
- **L6 CEILING** -- `conformance/FORMAT-SPEC-001.json` and `specs/numeric/gf16.t27` are the
  numeric ceiling, never forked.
- **L7 UNITY** -- no new `*.sh` on the critical path for validation, generation or data;
  `t27c` and `tri` only.

Priority is Asimov-style: L1 > L2 > L3 > L4 > L5 > L6 > L7. "In conflict scenarios, the
higher-priority law prevails." The legacy names (ISSUE-GATE, NO-HAND-EDIT-GEN, SOUL-ASCII,
TDD-MANDATE, PHI-IDENTITY, TRINITY-SACRED, NO-NEW-SHELL) map one-to-one onto L1..L7 in the
constitution's alias index.

One discrepancy is recorded rather than resolved: `AGENTS.md` section 5 speaks of "the seven
Invariant Laws (L1-L8)" and writes the priority as "L1 > ... > L8", while its table and the
constitution define L1..L7 only. No L8 is defined in either file at the commit this
documentation was generated from. The figure next to this chapter therefore shows seven
laws.

## Non-negotiables for changes

`AGENTS.md` section 3 lists six non-negotiables, quoted in short:

1. Specs are source of truth -- behaviour belongs in `.t27` / `.tri`; generated `gen/`
   output is not hand-edited except for documented exceptions.
2. TDD inside specs -- new or changed specs need `test`, `invariant` and/or `bench` where
   SOUL requires it.
3. English + ASCII -- first-party Markdown and source comments per LANG-EN and ADR-004.
4. No new Python on the verification critical path.
5. Issue gate -- PRs link issues (`Closes #N`) where project policy requires it.
6. Ring / gold work -- parser, compiler and spec changes follow the golden-rings canon; the
   compiler seal path is `bootstrap/stage0/FROZEN_HASH`.

Two rules of this documentation's own owner belong beside them, because the site enforces
them: no absolute developer home path in any committed file (a checkout is `T27_ROOT` or
`git rev-parse --show-toplevel`), and no hand edits to generated manifests -- change the
spec and regenerate.

## TASK protocol

`docs/coordination/TASK_PROTOCOL.md` governs how several agents work in one tree at the same
time. Its artifacts are the root `TASK.md` (anchor link, protocol version, locks, handoff
log, work units) and the protocol document itself. The semantics, in short:

- **Lock (soft).** Before editing sensitive paths the active agent should set lock holder,
  lock scope and lock until in the coordination state; others must not override without a
  handoff-log entry and an epoch bump. Locks are "social + procedural", not file locks.
- **Epoch.** A version counter for the coordination state.
- **Handoff log.** Append-preferred; handoffs are treated "like narrow API contracts".
- **Read / write order.** `github-sync.json` (queue snapshot), then `TASK.md` (locks and
  handoffs), then the anchor issue, then the target issue for the code change (section 4.4).

Validation of `TASK.md`'s shape is automated (section 5); verification is human plus CI
(section 6).

## Issue gate and TDD mandate

The issue gate is law L1 in executable form: the constitution names
`.github/workflows/issue-gate.yml` as the enforcement of "no code merged without `Closes #N`". Everything the site documents
came in through it -- the skills, crons, agents, tools and docs catalogs each have their
issue and their `docs/now/` entry.

The TDD mandate is law L4 and SOUL Article II in executable form: the parser rejects a spec
without a `test`, `invariant` or `bench` block. For the catalog specs the site adds its own
gate on top: a generator that compiles every card through the wasm and fails on a schema
violation, an unknown cross-reference, or a binding stated on one side only (an agent that
names a tool the tool does not name back, and the reverse).
