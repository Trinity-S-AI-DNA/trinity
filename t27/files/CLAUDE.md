# CLAUDE.md — Instructions for Claude Code and autonomous agents (t27)

Use this file **together with** `[AGENTS.md](AGENTS.md)`. Repo-specific law always overrides generic tooling defaults.

---

## Autonomous Execution Loop (AEL v2.0)

When operating as the Trinity Agent (Queen), follow this 6-phase loop:

```
┌─────────────────────────────────────────────────────────────┐
│  OBSERVE → PLAN → DELEGATE → VERIFY → SYNTHESIZE → LEARN   │
│         ↓       ↓        ↓        ↓         ↓         ↓    │
│  [E]     [T]     [C/V]    [V]      [L]      [L]           │
└─────────────────────────────────────────────────────────────┘
```

### Phase 1: OBSERVE
- Call Experience Agent (E) for context
- Read `.trinity/current-issue.md` for issue details
- Check ring and phase state from branch name
- Gather relevant files and context

### Phase 2: PLAN
- Break down task into subtasks
- Identify required skills: `/phi-loop`, `/tri-pipeline`, `/experience-save`
- Determine which agents to delegate to
- Estimate complexity and dependencies

### Phase 3: DELEGATE
- Delegate implementation to Creator Agent (C)
- Delegate validation to Verifier Agent (V)
- Coordinate parallel execution where possible
- Monitor agent progress

### Phase 4: VERIFY
- Review agent outputs
- Run conformance tests via `/tri-pipeline`
- Check L1-L7 law compliance
- Ensure quality standards

### Phase 5: SYNTHESIZE
- Combine agent results
- Resolve conflicts
- Create cohesive solution
- Prepare for integration

### Phase 6: LEARN
- Call Learner Agent (L) for pattern extraction
- Update `.trinity/experience.md` via `/experience-save`
- Save ring-specific learnings
- Improve future execution

---

## 1. Mandatory read order for this repository

1. `[AGENTS.md](AGENTS.md)` — entry point and constitutional stack.
2. `[SOUL.md](SOUL.md)` — canonical law (TDD, language, validation).
3. `[docs/T27-CONSTITUTION.md](docs/T27-CONSTITUTION.md)` — **SSOT-MATH**, **LANG-EN**, **DOCS-TREE**.
4. `[TASK.md](TASK.md)` and `[docs/coordination/TASK_PROTOCOL.md](docs/coordination/TASK_PROTOCOL.md)` — if the task touches coordination, locks, or shared hot paths.
5. Nearest `[OWNERS.md](OWNERS.md)` for the directories you edit.

Do **not** add parallel math/physics implementations in ad-hoc scripts when the same belongs in `*.t27` and the **`tri`** pipeline (`./scripts/tri`).

---

## 2. Engineering workflow

- **Bootstrap compiler:** from repo root, `cargo build --release -p t27c` (runs `build.rs` language checks). `bootstrap/` is a **workspace member**, so the binary lands at the workspace root: `./target/release/t27c` — *not* `./bootstrap/target/release/t27c`.
- **Iterating on the compiler:** do not rebuild release after every edit. [CONTRIBUTING.md, Build speed](CONTRIBUTING.md#build-speed-the-t27c-inner-loop) covers the faster builds, pointing `./scripts/tri` at a debug binary, and moving the `compiler.rs` seal.
- **Local sweep (CI-like):** from repo root, `./scripts/tri test` or `./target/release/t27c suite --repo-root .` (Rust runner; no shell test harness under `tests/`).
- **Generated code:** under `gen/` — do not hand-edit for routine fixes; change specs and regenerate.
- **Pull requests:** follow project Issue Gate and linking policy; **do not approve** PRs unless explicitly authorized.

---

## 3. PHI LOOP Execution

Follow the 9-phase PHI LOOP for ring-based development:

1. **Issue** - Define problem or requirement
2. **Spec** - Write .t27 specification
3. **TDD** - Write tests in spec before implementation
4. **Code/Impl** - Implement according to spec
5. **Gen** - Run `tri gen` to generate code from spec
6. **Seal** - Verify generated code and seal hash
7. **Verify** - Run `tri test` or conformance checks
8. **Land** - Merge changes to main branch
9. **Learn** - Capture learnings and update knowledge base

### Phase Completion Marker

When a phase is complete, include in your output:
```
Phase complete: [phase name]
→ Phase [next phase number]: [next phase name]
```

This triggers automatic branch creation for the next phase.

---

## 4. Autonomous subagent behavior (when spawned unattended)

- Finish the assigned task without waiting for clarification unless the repo's own rules require human input.
- If blocked after reasonable retries, stop and report what failed (logs, commands, file paths).
- Prefer small, reviewable diffs; match existing style and naming in touched files.
- **Output persistence:** when the parent workflow requires it, write the full final report to `/tmp/claude_code_output.md` (analysis, commands, diffs summary).

---

## 5. Skills and tooling

### Available Skills

- `/phi-loop` - Execute 9-phase PHI LOOP
- `/tri-pipeline` - Execute tri commands (gen, test, verify, seal)
- `/experience-save` - Save learnings to persistent memory

Load these skills when their functionality matches the task.

---

## FPGA hardware & flashing (SSOT)

**`[fpga/HARDWARE_SSOT.md](fpga/HARDWARE_SSOT.md)` is the single source of truth**
for the FPGA board, JTAG cable, host toolchain, and program/flash path. Read it
before touching anything under `fpga/`. Non-negotiables:

- Target board is **QMTech Wukong V1 / XC7A200T-FGG676** (`xc7a200tfgg676-1`),
  IDCODE `0x03636093`. Not the Arty A7 (`csg324`), and **not the 100T** — this
  file said `XC7A100T` / `0x13631093` until 2026-08-14, contradicting the SSOT
  it points to. Measured on all three attached boards: `idcode 0x3636093`,
  `family artix a7 200t`. For place-and-route use the `fbg676` chipdb
  (`xc7a200tfbg676-1`) — same die and pinout, per HARDWARE_SSOT.md §2026-07-05.
- **Flash with `openFPGALoader -c digilent_hs2`.** The attached cables are
  **Digilent FTDI `0x0403:0x6014`**, not the Xilinx `0x03FD` Platform Cable, and
  `cli/dlc10` speaks only to `0x03FD` — it answers `DLC10 cable not found` on this
  bench. Address the three boards with `--busdev-num 1:4 / 1:6 / 1:8`; they share
  serial `210512180081`, so serial-based addressing cannot separate them.
  See `fpga/HARDWARE_SSOT.md` §"Note" and §"Programming".
  *Corrected W791 (T460/T461): the previous text here forbade `openFPGALoader` on
  the grounds that it cannot drive a `0x03FD` cable — true, and irrelevant, since
  no `0x03FD` cable is attached. That sentence contradicted the SSOT this file
  names as authoritative, and it was reported as a hardware blocker for thirteen
  waves. `cli/dlc10` remains correct for a DLC10 bench and is not removed.*
- No native macOS Vivado exists. Synthesis is Vivado-in-Docker or OpenXC7 only.
- If any other FPGA doc contradicts the SSOT, the SSOT wins — fix the other doc.

---

## 6. Security and secrets

- Never commit secrets. See `[SECURITY.md](SECURITY.md)`. Root `.env` patterns are gitignored; use `.env.example` patterns only in docs.

---

## The 7 Invariant Laws

| Law | Name | Description |
|------|------|-------------|
| L1 | TRACEABILITY | No code merged without `Closes #N` |
| L2 | GENERATION | Files under `gen/` are generated; edit specs instead |
| L3 | PURITY | Source files must be ASCII-only with English identifiers |
| L4 | TESTABILITY | Every `.t27` spec must contain `test`/`invariant`/`bench` |
| L5 | IDENTITY | φ² = φ + 1; φ² + φ⁻² = 3; IEEE f64 checks use tolerance |
| L6 | CEILING | `FORMAT-SPEC-001.json` + `gf16.t27` are numeric SSOT |
| L7 | UNITY | No new `*.sh` on critical path; use `tri`/`t27c` |

See [`docs/T27-CONSTITUTION.md`](docs/T27-CONSTITUTION.md#2--invariant-laws-never-change-without-constitutional-amendment) for full details.

---

**Repository:** Trinity S³AI — **t27** (spec-first ternary / TRI-27). **φ² + 1/φ² = 3 | TRINITY**

## Own language first

When this project publishes something about itself, it publishes in **this
project's own language and format** -- not translated into somebody else's.

Owner's rule, 2026-09-20: stop writing in other people's languages, we have our
own.

This bites on any file whose only reason to exist is that an outside tool
expects that shape: `llms.txt`, `agents.json`, `ai.txt`, `.well-known/*.json`,
A2A agent cards, `ai-plugin` manifests, OpenAPI stubs, JSON-LD blocks, a README
that restates a spec. The reflex is to write four of them in four foreign
formats, and the reflex is wrong: a project whose claim is "here is a language
worth writing" and which then describes itself in three of other people's
formats has published three documents that are not true of it.

**The move:** find the address the outside world already fetches, then serve our
own language at it. `/llms.txt` at t27.ai **is** a t27 module -- `llms.txt`
requires nothing but text, and every prose line of a `.t27` file is a `;`
comment, so it stays readable to anything that cannot compile it.

**Three qualifications, so the rule stays honest:**

- A format a resolver genuinely parses -- a sitemap, `package.json`, a lockfile
  -- is machinery, not a description. **Generate** it from our own source; never
  hand-write it into a second home for the truth.
- Code against someone else's API uses their types. Prose for a human who has
  never heard of the project uses that human's language.
- If a format demands a claim we cannot back, **publish nothing**. An A2A card
  with no A2A server behind it is a false claim, and a missing file is more
  honest than a lying one.

The test: *is this file the project speaking about itself?* If yes, it speaks
our language. If it is plumbing, it speaks the plumbing's.

**Worked example, compiler-checked rather than asserted:** in `gHashTag/trinity`,
`apps/website/public/t27/files/specs/catalog/onboarding.t27` generates
`/llms.txt` and `/agents.t27` byte-identically, gated in CI as
`check:onboarding`. The generator evaluates the spec's own `test` blocks --
`typecheck.ok` stays true for `assert 1 > 2`, so a compiler saying "this parses"
is not a compiler saying "this is true" -- and re-compiles the rendered document
before writing it.

**The full rule lives in exactly one place: the `own-language-first` skill**
(`~/.claude/skills/own-language-first/SKILL.md`). It carries the consent gate for
documents addressed to other people's agents, the six negative controls, and the
`;`-alone-on-a-line trap that silently discards a `module` declaration. This
section is a pointer, not a copy -- the recorded defect in this codebase family
is the hand-copied rule that only two of its three homes knew about.
