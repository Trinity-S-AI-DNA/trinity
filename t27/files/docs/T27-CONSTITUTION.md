# Trinity S³AI / t27 — Repository constitution

**Status:** Active  
**Version:** 1.3  
**Date:** 2026-10-03  

---



## Preamble

The Trinity S³AI repository is built around the **t27** specification language and the **`tri`** toolchain (`./scripts/tri` forwards to the Rust `t27c` bootstrap binary). Mathematics, numerics, and physics formulas that participate in verification must not be split between “the spec” and “side scripts.” First-party documentation under **`docs/`** follows a **single, published tree** so contributors and agents do not accumulate ad-hoc files at the wrong depth. The following articles establish these norms.

---

## Article SSOT-MATH — single source of truth for mathematics and physics

**Article SSOT-MATH.** The mathematical, numeric, and physical meaning of Trinity S³AI / t27 has **one normative source of truth**: specifications in the **t27** language (`*.t27` files), exercised through the official **`tri`** pipeline and tied to **`.trinity/experience/`** artifacts where run experience is recorded.

It is **forbidden** to introduce new **Python** dependencies (or equivalent script bypasses) on the **critical path** of verification, conformance, or “verdict,” except for **explicitly marked legacy** code with a removal date and a tracked migration into `.t27`.

Target backends (**Zig, C, Verilog**) are **compiler output**, not hand-written application languages; hand-written Zig outside the generated pipeline is allowed only in **bootstrap** (compiler implementation) and related build infrastructure.

The numeric formalism relies on repository standards (**NUMERIC-STANDARD-001**, GoldenFloat, Strand I in `specs/math/sacred_physics.t27` and related specs). Extensions for precision or new numeric primitives are delivered through the **t27 language and compiler**, not external interpreters.

---

## Article LANG-EN — English for first-party code and documentation

**Article LANG-EN.** All **first-party** Markdown under `docs/`, `specs/`, `architecture/`, `clara-bridge/`, `conformance/`, and root project Markdown (`README.md`, `AGENTS.md`, `CLAUDE.md`, `TASK.md`, `SOUL.md`) **MUST** be written in **English**. Source files (`.t27`, `.zig`, etc.) **MUST** use **English** for comments and identifiers, and remain **ASCII-only** per **ADR-004** and root **`SOUL.md`** Article I (expanded detail in **`docs/nona-03-manifest/SOUL.md`** Law #1).

Grandfathered non-English paths are listed only in **`docs/.legacy-non-english-docs`** until translated; **do not expand** that list without Architect approval. Vendored content under **`external/`** is exempt.

**Enforcement:** (1) **`cargo build` / `cargo build --release` in `bootstrap/`** — `build.rs` fails the build with a cited error; (2) **`scripts/check-first-party-doc-language.sh`** in CI (Python checker).

---

## Article CREDIT — who is rewarded (entrenched)

**Article CREDIT.** Adopted 2026-10-03 on the owner's word (#5666). This article is **entrenched**. Its text, from the heading above down to the next level-1 or level-2 heading (a `---` rule does not end it; no code fence may open above it or inside it, no other heading in the charter may read as CREDIT, look-alike letters included, and the charter carries no raw HTML, character references or invisible characters, so this article cannot be turned into code, hidden, or shadowed by a rival copy), is sealed by SHA-256 in **`bootstrap/stage0/CREDIT_HASH`**, and `bootstrap/build.rs` refuses to build `t27c` when the two disagree. Changing it takes one pull request that edits the article and the seal together, quotes the owner's explicit approval in its body, and bumps the charter version. The general path in **Amendments** is not enough on its own.

1. **A reward goes to one of two people.** Either (a) the **author of a `.t27` spec**, identified by their GitHub login, or (b) the **compute provider** who supplied proof of compute: work done on their own CPU, FPGA or GPU, proven rather than claimed.
2. **One player, one GitHub, one hive.** Everyone who connects their own token plays under their own GitHub account and runs their own bees. A bee is not a player. A commit made by a bee ("Trinity Bee" or any other shared bot identity) is credited to the owner of the claimed key the bee ran under. A commit made under a key that nobody has claimed is credited to the author of the pull request that carried it.
3. **Ledgers implement this article; they do not restate it.** Every ledger that computes credit, the queen's leaderboard and the spec-authors count among them, computes it by this article. Where a ledger disagrees with it, the ledger is wrong.
4. **Nothing else in this charter overrides this article.** No other article, law, amendment row or note, earlier or later, suspends, narrows or repeals it. Only the change path above does.

**Enforcement:** `bootstrap/build.rs` (the seal); the GitHub-side lock (code-owner review of this file by an account other than the PR author) is a repository setting and is not claimed here until it exists.

---

## Article DOCS-TREE — single layout for `docs/`

**Article DOCS-TREE.** First-party Markdown under **`docs/`** **MUST** follow the **three-nona / 27-agent** layout indexed in **`docs/README.md`**. That README is the **authoritative map** of the tree; any **structural** change (new top-level subdirectory under **`docs/`**, or redefinition of what belongs in each nona) **MUST** land together with an update to **`docs/README.md`** and, if policy changes, a bump of this charter.

**1. Root of `docs/` (anchors only).** Aside from **`docs/.legacy-non-english-docs`**, only these files **MAY** reside **directly** in **`docs/`**: **`NOW.md`**, **`T27-CONSTITUTION.md`**, **`OWNERS.md`**, and **`README.md`** (the index). **No** other new **`*.md`** **SHALL** be added at **`docs/*.md`** except by amending this article.

**2. Required buckets.** Every other new first-party **`*.md`** under **`docs/`** **MUST** live under exactly one of:

| Path | Role |
|------|------|
| **`docs/agents/`** | 27-agent alphabet canon and expanded agent behavior text. |
| **`docs/coordination/`** | TASK protocol, inter-agent handoff, portable bundles. |
| **`docs/nona-01-foundation/`** | Foundation themes (alphabet nona **A–I**): rings, brain charter, language purge, sandbox, architecture-adjacent charter. |
| **`docs/nona-02-organism/`** | Organism themes (nona **J–R**): language spec, numerics, physics, critical-path TZs; **thematic subfolders** (e.g. **`physics-kepler/`**) **SHOULD** be used when **three or more** closely related documents would otherwise clutter one directory. |
| **`docs/nona-03-manifest/`** | Manifest themes (nona **S–Ϯ**): TDD, CI/testing policy, PHI loop, strategy, claims, expanded **`SOUL`** reference (root **`SOUL.md`** remains canonical). |
| **`docs/clara/`** | CLARA / submission / evidence / composition pack. |

**3. Forbidden patterns.** **Do not** create **`docs/misc/`**, **`docs/tmp/`**, **`docs/old/`**, or other informal dumping grounds without **Architect** approval, an update to **`docs/README.md`**, and an amendment here. **Do not** duplicate normative **`*.t27`** behavior as shadow specs in **`docs/`**; **`specs/`** is the product SSOT for executable spec text (**Article SSOT-MATH**).

**4. Placement rule.** If placement is unclear, use **`docs/agents/AGENTS_ALPHABET.md`** domain column; prefer **`docs/nona-03-manifest/`** for cross-cutting governance and **`docs/coordination/`** for task routing and human handoff.

**5. Other top-level trees.** **`specs/`**, **`architecture/`**, **`conformance/`**, **`clara-bridge/`**, **`bootstrap/`** keep their own **`OWNERS.md`** and purpose; this article governs **`docs/`** only.

**Enforcement:** **Code review** and **Issue Gate**; optional CI path checks may be added later. **OWNERS** for **`docs/`** is **`docs/OWNERS.md`**.


## § 2 — Invariant Laws (never change without constitutional amendment)

These laws are the **constitutional bedrock** of Trinity S³AI / t27. They govern behavior, not formats or scientific claims. Amendments require explicit consensus and version bump.

**L0 was adopted on 2026-09-23, and it is an addition rather than a rewrite.** L1-L7 say how work enters the repository - traced, generated, ASCII, tested - and every one of them is carried by a live gate. What they never said is what the work is *for*. That gap was already being filled informally: the board's source cited "trios CLAUDE.md, law L0" for the rewrite goal, and no such law existed in that file or anywhere else. `trios/CLAUDE.md` carries its own L1-L9 about shell scripts, clippy and ports. A citation that does not resolve is precisely what the honesty rule forbids, so the choice was to delete the claim or to make it true. It was made true.

### Law Table (L0–L7)

| Law # | Name | Body | Enforcement |
|-------|------|------|-------------|
| **L0** | **PURPOSE** | Everything below the interface is written once, in `.t27`, and generated to its target - Rust for servers, Zig, C and Verilog for the core and silicon. Two exceptions, both named: the seed (`t27c` itself stays hand-written Rust) and the interface (Swift for trios, TSX for the web) | The measured `.t27` share of the stack must not fall: `apps/website/scripts/roadmap-stack.mjs` in gHashTag/trinity, published at `/roadmap/stack.json` and drawn by the ROADMAP view |
| **L1** | **TRACEABILITY** | No code merged without `Closes #N` — every PR must reference a GitHub issue | `.github/workflows/issue-gate.yml` |
| **L2** | **GENERATION** | Files under `gen/` are generated; edit the `.t27` spec instead | `./target/release/t27c validate-gen-headers` |
| **L3** | **PURITY** | All `.t27` / `.zig` / `.v` / `.c` source — ASCII-only identifiers & comments | `SOUL.md`, `ADR-004`, build.rs language checks |
| **L4** | **TESTABILITY** | Every `.t27` spec must contain `test` / `invariant` / `bench` | Ring 037 / #132, parser enforcement |
| **L5** | **IDENTITY** | **K2 core:** φ² = φ + 1 on ℝ; consequence φ² + φ⁻² = 3; IEEE f64 checks use tolerance | `NUMERIC-CORE-PALETTE-REGISTRY.md`, `specs/math/constants.t27` |
| **L6** | **CEILING** | `conformance/FORMAT-SPEC-001.json` + `specs/numeric/gf16.t27` are the numeric ceiling — never forked | SSOT: seal coverage CI |
| **L7** | **UNITY** | No new `*.sh` on the critical path for validation / gen / data | `SOUL.md` Article VIII; `t27c` + `tri` only |

### Alias Index (legacy → L0–L7)

| Legacy name | New name |
|-------------|----------|
| law L0 (cited in gHashTag/trinity board source before it existed) | L0 PURPOSE |
| ISSUE-GATE | L1 TRACEABILITY |
| NO-HAND-EDIT-GEN | L2 GENERATION |
| SOUL-ASCII | L3 PURITY |
| TDD-MANDATE | L4 TESTABILITY |
| PHI-IDENTITY | L5 IDENTITY |
| TRINITY-SACRED | L6 CEILING |
| NO-NEW-SHELL | L7 UNITY |

### Law Priority

Laws follow **Asimov-style priority** (L1 > L2 > … > L7). **L0 sits outside that ordering on purpose**: it is the destination, not a rule about the journey, and it may never be cited to excuse breaking L1-L7. Work that reaches L0 faster by merging untraced, hand-editing generated files or shipping an untested spec has not reached it at all.

0. **L0 PURPOSE** (the goal, not a tie-breaker) — the stack below the interface becomes `.t27`
1. **L1 TRACEABILITY** — Without issue linkage, nothing enters the repository
2. **L2 GENERATION** — Generated files are output, not source
3. **L3 PURITY** — Language policy enables universal tooling
4. **L4 TESTABILITY** — TDD ensures specifications are verifiable
5. **L5 IDENTITY** — Mathematical truth (φ) has specific tolerance requirements
6. **L6 CEILING** — Numeric formats are SSOT; never forked
7. **L7 UNITY** — Toolchain consolidation via `tri` / `t27c`

In conflict scenarios, the higher-priority law prevails.

---

## Related documents

| Document | Purpose |
|----------|---------|
| `docs/README.md` | Index of first-party docs (27-agent / three-nona layout); **normative map for Article DOCS-TREE** |
| `docs/OWNERS.md` | Primary owner and bucket table for `docs/` |
| `docs/nona-02-organism/TZ-T27-001-NO-PYTHON-CRITICAL-PATH.md` | Technical specification for critical-path migration |
| `docs/nona-03-manifest/TDD-CONTRACT.md` | TDD and conformance from specs |
| `docs/nona-03-manifest/SOUL.md` | Expanded reference for root **`SOUL.md`** (esp. Law #1 language); **root `SOUL.md` is canonical** |
| `architecture/ADR-004-language-policy.md` | ASCII source + English first-party docs |
| `docs/nona-02-organism/NUMERIC-STANDARD-001.md` | GoldenFloat family, φ structure |
| `docs/nona-02-organism/NUMERIC-GF16-DEBT-INVENTORY.md` | File-by-file non-GF16 / f32/f64 debt |
| `docs/nona-01-foundation/QUEEN-LOTUS-SEED-LANGUAGE-PURGE.md` | Non-t27 language inventory + Lotus cleanup procedure |
| `docs/nona-01-foundation/GOLDEN-RINGS-CANON.md` | Ring + FROZEN_HASH micro-iterations; GOLD vs REFACTOR-HEAP |
| `docs/nona-01-foundation/TRINITY-BRAIN-NEUROANATOMY-TZ.md` | Unified brain charter; **t27** = `specs/brain/` SSOT, `trinity` = runtime integration |
| `docs/nona-03-manifest/MULTI-MODEL-TRUST-CHAIN-ANALYSIS.md` | Trust chain, executable rings, issue enforcement, test pyramid (synthesis note) |
| `docs/nona-03-manifest/T27-BOOTSTRAP-TESTING-PLAN.md` | Rust seed → `.t27` fixtures → self-eval → self-host; proposed ring/issue spine |
| `docs/nona-03-manifest/GOLDEN-CHAIN-TESTING-ATLAS.md` | Oracles, metamorphic/differential strategy, framework ladder; complements bootstrap plan |
| `docs/nona-03-manifest/T27-MATH-PHYSICS-TEST-FRAMEWORK-SPEC.md` | Math/physics test framework charter (ring-aware oracles, `claim_tier`, sprint A–E) |
| `docs/nona-03-manifest/T27-UNIFIED-AXIOM-THEOREM-FORMAT-SYSTEM.md` | Unified axioms/theorems + `FORMAT-SPEC-001` + `axiom_system.json` charter |
| `docs/nona-03-manifest/CLAIM_TIERS.md` | `claim_tier` policy for math/physics specs |
| `.cursor/rules/t27-ssot-math.mdc` | Cursor rule for AI agents |

---

## Amendments

Amendments to this constitution are made via pull request with an explicit charter version bump and rationale.

| Version | Date | Change |
|---------|------|--------|
| 1.3 | 2026-10-03 | **Article CREDIT** added and entrenched (#5666): the reward goes to the `.t27` spec author by GitHub login or to the proof-of-compute provider; a bee's commit is credited to the owner of its claimed key, an unclaimed key to the PR author. Sealed in `bootstrap/stage0/CREDIT_HASH`, checked by `bootstrap/build.rs`. Rationale: the rule lived only in chat and in the code that computes the leaderboard, so every implementation was free to grow its own version of it. |
