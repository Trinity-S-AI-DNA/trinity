# TASK Protocol — inter-agent coordination (t27)

**Status:** Normative (paired with **`TASK.md`** at repo root and **`docs/T27-CONSTITUTION.md`** Article **TASK-MD**).  
**Protocol version:** 1.0  
**Date:** 2026-04-06  

---

## 1. Intent

**TASK** (the file **`TASK.md`**) is the **shared coordination workspace** between coding agents, tooling, and maintainers. It implements patterns common in multi-agent systems:

- **Shared state file** — inspectable in git, reviewable in PRs, no hidden broker.
- **Explicit handoffs** — versioned **epoch**, **lock**, and append-prefer **Handoff log** (treat handoffs like narrow API contracts).
- **Online anchor** — a **long-lived GitHub issue** (the **Anchor issue**) for comments, links, and real-time alignment when several sessions run in parallel.

**GitHub Issues** remain the **scheduling and merge SSOT** (`Closes #N`, Issue Gate). **TASK.md** must not contradict closed issues, **`CANON.md`**, or **`FROZEN.md`**.

---

## 2. Artifacts

| Artifact | Role |
|----------|------|
| **`TASK.md`** (root) | Live coordination: anchor link, protocol version, locks, handoff log, work units. |
| **Anchor issue** | Always-open issue; comment thread for agents/humans; link duplicated in **`TASK.md`**. |
| **`docs/coordination/TASK_PROTOCOL.md`** | This document — rules, validation, **Verification** checklist. |
| **`.trinity/state/github-sync.json`** | Snapshot of ring/META issues; read before claiming work. |

---

## 3. Required shape of `TASK.md`

The following **Markdown headings** are **mandatory** (exact `##` titles so `bootstrap/build.rs` can verify):

1. `## Anchor issue`
2. `## Protocol`
3. `## Coordination state`
4. `## Handoff log`
5. `## Current focus`
6. `## Work units`
7. `## Blocked / dependencies`
8. `## Verification`

The document **title** MUST be a single H1 line beginning with `# TASK` (recommended: `# TASK — inter-agent coordination`).

**Machine-readable metadata** (must appear in the top section):

- `**TASK Protocol version:**` — semver or `major.minor` matching this doc when protocol changes.
- `**Last updated:**` — `YYYY-MM-DD` (UTC date of last meaningful edit to **Coordination state** or **Handoff log**).

**Anchor line** — under `## Anchor issue`, a line:

`**Anchor issue:** https://github.com/<owner>/<repo>/issues/<n>`

Use the canonical **Anchor issue** for this repository (maintainers: do not point to ephemeral issues).

---

## 4. Coordination semantics

### 4.1 Lock (soft)

Before editing sensitive paths, the active agent SHOULD set **Lock holder**, **Lock scope**, and **Lock until** in **Coordination state**. Others MUST NOT override without a **Handoff log** entry and bumping **Epoch**.

Locks are **social + procedural** (not file locks). Trinity **claims** under `.trinity/` remain governed by **`docs/nona-03-manifest/SOUL.md`** Law **#6**.

### 4.2 Epoch

**Epoch** is a monotonic integer in **Coordination state**. Bump when:

- transferring ownership of a slice,
- resolving a conflict between two agent plans,
- or resetting coordination after a major merge.

### 4.3 Handoff log

Append lines **newest last**. Suggested format:

`YYYY-MM-DDTHH:MMZ | agent_id | intent | outcome | next_step`

Do **not** delete historical lines; if obsolete, prefix with `~~strikethrough~~` and add a correcting line.

### 4.4 Read / write order

1. `github-sync.json` (queue snapshot)  
2. **`TASK.md`** (locks + handoffs)  
3. **Anchor issue** (latest comments)  
4. Target **GitHub issue** for the code change  

---

## 5. TASK Validation (automated)

**Enforced by:** `cargo build` / `cargo build --release` in **`bootstrap/`** (`build.rs`).

The build **fails** if **`TASK.md`**:

- is missing any **mandatory heading** (§3),
- has no H1 starting with `# TASK`,
- lacks `**TASK Protocol version:**`,
- lacks an **Anchor issue** URL matching `https://github.com/[^/]+/[^/]+/issues/[0-9]+`.

---

## 6. TASK Verification (human + CI)

Before opening or updating a PR that touches **`TASK.md`** or multi-agent-critical paths:

1. Run **`cargo build`** in **`bootstrap/`** (includes §5).  
2. If **Lock holder** was you, clear or hand off lock in **Coordination state** + **Handoff log**.  
3. Post a **short comment** on the **Anchor issue** when multiple agents touched the same slice (link PR).  
4. Code PRs still MUST link **`Closes #N`** to a substantive issue (Issue Gate), not only this anchor.

---

## 7. Amendments

- Bump **Protocol version** here and in **`TASK.md`**.  
- If rules change governance or SSOT, amend **`docs/T27-CONSTITUTION.md`** Article **TASK-MD** and bump charter version.  
- Prefer **ADR** for replacing the Anchor pattern entirely.

---

## 8. Supplementary handoff bundles (informative)

Optional **portable** markdown bundles (for agents or reviewers when chat transfer is awkward) may live under [`docs/coordination/inter-agent-handoff/`](inter-agent-handoff/README.md). They are **planning supplements** only — **normative** coordination remains **`TASK.md`** + **Anchor issue** + this protocol.

---

## References (informative)

- Shared state / handoff discipline in multi-agent coding workflows (Fazm, Zylos, industry orchestration notes) — conceptually aligned with explicit handoff envelopes and shared inspectable state.
