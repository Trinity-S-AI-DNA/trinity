---
name: tri
description: This skill should be used when user asks to "tri skill begin", "PHI LOOP", "edit .t27 spec", "seal hash", "tri gen", "tri test", "tri verdict", "tri experience save", "tri notebook query", "tri notebook wrapup", or any task requiring spec-first development in the t27 Trinity S³AI project. Implements the canonical PHI LOOP workflow following constitutional laws with NotebookLM-backed semantic memory.
version: 1.2.0
---

# TRI Skill: PHI LOOP for t27 Spec-First Development

Execute the PHI LOOP workflow for Trinity S³AI Framework development. This skill enforces constitutional laws: De-Zig-fication, TDD-inside-spec, and immutable hash seals for every mutation.

## Constitutional Enforcement

**MANDATORY GUARDRAILS:**

1. **NO-COMMIT-WITHOUT-ISSUE**: Every mutation MUST be bound to a GitHub issue via `tri skill begin --issue N`
2. **NO-MUTATION-WITHOUT-SKILL**: Every mutation requires an active skill in `.trinity/state/active-skill.json`
3. **READ-TRINITY-FIRST**: Before any action, read `.trinity/state/`, `.trinity/experience/`
4. **CLAIM-BEFORE-MUTATE**: Acquire exclusive claim on target spec_path before editing

**If NO active cell exists:**
- DO NOT offer "commit existing changes"
- DO NOT offer "seal + verify + commit"
- ONLY offer: `tri skill begin --issue N` or `tri status`

## Constitutional Foundation

Always honor these foundational documents:

- **CANON_DE_ZIGFICATION.md** + **ADR-001**: .t27/.tri are the only source of truth; Zig/C/Verilog are generated backends
- **SOUL.md**: De-Zig Strict + TDD-inside-spec + PHI LOOP are constitutional laws
- **NUMERIC-STANDARD-001**: GoldenFloat family + all numeric contracts come from specs and conformance
- **SACRED-PHYSICS-001**: Sacred physics (TRINITY, G, ΩΛ, tpresent, γ) lives in specs + conformance JSON
- **graph.tri** + **graphv2.json**: Evolution must follow canonical dependency graph, phi-critical and sacred-core edges first

## Canonical Files (Queen Trinity Life Support)

When starting any task, check these files first before touching backend code:

- `specs/base/*.t27` — Trit types, operations
- `specs/math/*.t27` — Constants, sacred physics
- `specs/numeric/*.t27` — GoldenFloat, TF, IPS formats
- `architecture/CANON_DE_ZIGFICATION.md` — De-zig hierarchy
- `architecture/ADR-001-de-zigfication.md` — Architecture decisions
- `docs/nona-03-manifest/SOUL.md` — Constitution
- `docs/nona-02-organism/NUMERIC-STANDARD-001.md` — Numeric standards
- `docs/nona-02-organism/SACRED-PHYSICS-001.md` — Sacred physics standards
- `architecture/graph.tri` — Module dependency graph
- `architecture/graphv2.json` — Typed graph definition

**ALSO READ:**
- `.trinity/state/active-skill.json` — Current active skill session
- `.trinity/state/issue-binding.json` — Issue binding for active skill
- `.trinity/experience/episodes.jsonl` — Completed PHI LOOP episodes
- `.trinity/state/queen-health.json` — Current swarm health

Never start from `src/*.zig` or runtime code. Always begin in specs/architecture/docs layers.

## NotebookLM Integration (Session Memory)

Before starting any task, query NotebookLM for existing work to prevent duplication:

```bash
# Check if work already done (avoids session amnesia)
tri notebook query "What is the current status of <task/topic>?"

# This returns:
# - Task completion status
# - Relevant decisions from previous sessions
# - Key files and patterns used
# - Known blockers or open issues
```

After completing work, upload wrap-up to NotebookLM:

```bash
# Save session context for future agents
tri wrapup --summary "completed <task>" \
           --decisions "used <approach>" \
           --files "changed <files>" \
           --steps "next action"
```

**NotebookLM Configuration:**
- Storage: `~/.notebooklm/storage_state.json`
- Active Notebook: Auto-detects from `.trinity/state/issue-binding.json`
- Notebook name: `"t27 #NNN — <issue title>"` (per-issue)
- Auth: Cookie-based via `notebooklm login` CLI

**Query Patterns:**
- "status of <feature/module> integration" — Check completion
- "decisions made for <task>" — Retrieve context
- "known issues with <spec>" — Find blockers
- "architecture of <component>" — Get design context

## /tri wrapup

Automatic session wrap-up with NotebookLM upload. This is the canonical way to end a session and preserve context for future agents.

### Per-Issue Notebooks

Each session is uploaded to an issue-specific notebook in NotebookLM:

```
GitHub Issue #NNN → Notebook: "t27 #NNN — <title>"
```

Example:
- Issue #343 "Restore phi-loop-ci.yml" → Notebook: `t27 #343 — Restore phi-loop-ci.yml`
- Issue #350 "NotebookLM Integration" → Notebook: `t27 #350 — NotebookLM Integration`

Each notebook contains all session sources for that issue:
```
Source 1: "Session 2026-04-08 17:41 — Initial setup"
Source 2: "Session 2026-04-08 18:00 — Fixed CI"
Source 3: "Session 2026-04-08 18:30 — PR merged"
```

### Usage

```bash
# Auto-detect issue from .trinity/state/issue-binding.json
tri wrapup --summary "Completed Phi Loop iterations for Ring-071"

# Specify issue explicitly
tri wrapup --issue 343 --summary "Fixed CI pipeline"

# Full wrap-up with all details
tri wrapup --summary "Implemented NotebookLM backend" \
           --decisions "Used notebooklm-py SDK with cookie auth" \
           --files "contrib/backend/notebooklm/*.py" \
           --steps "Run integration tests"
```

### What It Does

1. **Auto-detects session context**:
   - `issue_number`: From `.trinity/state/issue-binding.json` or `--issue` flag
   - `issue_title`: Fetched via `gh issue view` if needed
   - `session_id`: Git commit hash (short)
   - `branch`: Current git branch

2. **Finds or creates issue-specific notebook**:
   - Searches for notebook named `"t27 #NNN — <title>"`
   - Creates if not found
   - Each `/tri wrapup` adds a new source to the same notebook

3. **Formats Markdown** with metadata:
   ```markdown
   # Session Wrap-up
   **Session ID:** abc1234
   **Issue:** #343
   **Issue Title:** Restore phi-loop-ci.yml
   **Branch:** feature/xyz
   **Commit:** abc1234
   **Date:** 2026-04-08T17:00:00

   ## Summary
   ...

   ## Key Decisions
   ...

   ## Files Modified
   ...

   ## Next Steps
   ...
   ```

4. **Uploads to NotebookLM**:
   - Creates source in issue-specific notebook
   - Returns `source_id` for verification

### Implementation

- **Spec**: `specs/automation/wrapup-auto.t27`
- **Backend**: `contrib/backend/notebooklm/wrapup_auto.py`
- **Invocation**: Python script via venv (L7 compliant - no shell scripts)

### Direct Invocation (for debugging)

```bash
# With auto-detected issue
.trinity/notebooklm-venv/bin/python3 \
    contrib/backend/notebooklm/wrapup_auto.py \
    --summary "Session summary" \
    --session-id "$(git rev-parse --short HEAD)"

# With explicit issue
.trinity/notebooklm-venv/bin/python3 \
    contrib/backend/notebooklm/wrapup_auto.py \
    --issue 343 \
    --summary "Test session" \
    --session-id "abc123"

# Dry-run (no upload, just preview)
.trinity/notebooklm-venv/bin/python3 \
    contrib/backend/notebooklm/wrapup_auto.py \
    --summary "Test session" \
    --session-id "test" \
    --dry-run
```

### Output

```
Auto-detected issue: #350 — NotebookLM Integration
Found existing notebook: t27 #350 — NotebookLM Integration (abc123...)
Uploaded wrap-up: source_id=def456...
✅ Uploaded to: t27 #350 — NotebookLM Integration
```

### Notebook Structure in NotebookLM

Each issue has its own notebook with full session history:
```
t27 #343 — Restore phi-loop-ci.yml
  └─ Source 1: "Session 2026-04-08 17:41 — Initial setup"
  └─ Source 2: "Session 2026-04-08 18:00 — Fixed CI"
  └─ Source 3: "Session 2026-04-08 18:30 — PR merged"

t27 #350 — NotebookLM Integration
  └─ Source 1: "Session 2026-04-08 17:00 — Spec creation"
  └─ Source 2: "Session 2026-04-08 18:00 — Backend impl"
```

## Standard /tri Status Output

When user invokes `/tri` without arguments, ALWAYS show:

```
PHI LOOP Status (YYYY-MM-DD)

Queen Health: GREEN (0.XX) | Swarm Health: GREEN (0.XX)

Trinity Coordination:
  Active Skill: <skill_name> | <standard_name>
  Active Cell:  cell-YYYYMMDD-HHMM-<description>
  Issue:        #NN — <issue_title>
  Episode:      <episode_name>
  State:        checkpoints X/Y (<current_step>), <sealed|unsealed>

Guard:
  NO-COMMIT-WITHOUT-ISSUE enforced
  NO-MUTATION-WITHOUT-CELL enforced

Uncommitted Changes:
  - <file_path> — <description>
  - <file_path> — <description>

Available Actions:
  1. tri cell checkpoint --step "<description>"
  2. tri gen <spec_path>
  3. tri test <spec_path>
  4. tri cell seal && tri git commit
```

**IF NO ACTIVE CELL:**

```
PHI LOOP Status (YYYY-MM-DD)

Queen Health: GREEN (0.XX)

Trinity Coordination:
  Active Cell: NONE
  Active Skill: NONE
  Issue: NONE

Guard:
  NO-COMMIT-WITHOUT-ISSUE enforced
  NO-MUTATION-WITHOUT-CELL enforced

Uncommitted Changes:
  - <file_path> — <description>

ERROR: Cannot commit or seal without active cell + issue.

Required Actions:
  1. tri skill begin --issue N --description "task description"
  2. tri status only (current view)
```

## Cell Registry v2.0 Schema

`.trinity/cells/registry.json` MUST follow:

```json
# .trinity/state/active-skill.json — Active skill session
{
  "skill_id": null,
  "session_id": null,
  "issue_id": null,
  "description": null,
  "started_at": null,
  "started_by": null,
  "status": "closed"
}

# .trinity/state/issue-binding.json — Issue binding
{
  "issue_id": null,
  "state": null,
  "linked_skill_id": null,
  "required_commit_message_pattern": "\\[ref: ISSUE_ID\\]"
}
```

## Standard Mapping

Map spec changes to standards:

| Spec Pattern | Standard | Skill | Issue Prefix |
|--------------|----------|-------|--------------|
| `specs/numeric/gf*.t27` | NUMERIC-STANDARD-001 | tri-pipeline | numeric-standard-001 |
| `specs/math/sacred*.t27` | SACRED-PHYSICS-001 | tri-sacred | sacred-physics-001 |
| `specs/base/*.t27` | BASE-TYPES-001 | tri-base | base-types-001 |
| `specs/numeric/tf*.t27` | NUMERIC-STANDARD-002 | tri-pipeline | numeric-standard-002 |
| `docs/nona-03-manifest/SOUL.md` | CONSTITUTION | tri-constitution | constitution |

## PHI LOOP: Five Steps

### 1. Small Step

Change exactly one `.tri`/`.t27` spec block or module (one node in canonical graph).

- Identify the target node in `architecture/graph.tri`
- Ensure no circular dependencies
- Modify only the minimal unit required
- Never edit generated `.zig`/`.c`/`.v` by hand
- Backends are disposable output of specs

### 2. Hash Seal

Compute and remember the immutable hash seal:

- `spec_hash_before` — SHA256 of spec before changes
- `spec_hash_after` — SHA256 of spec after changes
- `gen_hash_after` — SHA256 of generated backend
- `test_vector_hash` — SHA256 of test vectors

This hash set is the immutable seal for this PHI LOOP step. Store hashes in memory or tri skill registry.

### 3. Verify

Execute verification sequence:

```
tri gen      # Generate backends from spec
tri test     # Run spec tests
tri verdict --toxic  # Check for toxic regressions
tri bench    # (optional) Benchmark performance
```

Verification is always spec-first: specs + conformance + benches decide, backends obey.

### 4. Fixate

If verdict is **clean**:

```
tri experience save
# Record: diff + hashes + verdict + bench_delta
```

If verdict is **toxic**:

```
# Record mistake
# Roll back via spec, never via generated code
```

Never roll back generated code; always restore the spec and regenerate.

### 5. TRI Skill Register

Register the step as an immutable skill:

- `skill_id` — Unique identifier for this mutation
- `parent_skill` — Parent skill in dependency chain
- `task_id` — Current task context
- `spec_path` — Path to modified spec
- `spec_hash_before/after` — Spec hashes
- `gen_hash_after` — Generated backend hash
- `test_status` — Pass/fail result
- `verdict` — Clean or toxic
- `bench_delta` — Performance change
- `sealed_at` — Timestamp

**Rule**: One skill = one minimal verifiable mutation. No registration = step does not exist.

## Command Formula

Standard PHI LOOP execution:

```bash
# Step 1: Check NotebookLM (pre-work) — AVOID duplication
tri notebook query "<task/topic> status"  # Returns if already done

# Step 2: Start skill if new work
tri skill begin --issue N --description "task description"

# Step 3: Execute PHI LOOP
tri spec edit <module>
tri cell checkpoint --step "description"
tri skill seal --hash
tri gen
tri test
tri verdict --toxic
tri experience save
tri skill commit
tri git commit

# Step 4: Upload wrap-up (post-work) — ENABLE future agents
tri wrapup --summary "completed <task>" \
           --decisions "used <approach>" \
           --files "changed <files>" \
           --steps "next action"
```

**Example with NotebookLM:**
```bash
# Before starting
tri notebook query "What is the status of GoldenFloat ternary float format?"

# Response: "GoldenFloat Ring-050 complete, 7 formats defined, PR #317 merged"
# → Skip work, move to next task

# If no match found → Proceed with PHI LOOP
```

## Swarm Coordination (.trinity)

PHI LOOP operates within the `.trinity` coordination layer. Before any task:

```bash
# 1. Read chronicle and claims
cat .trinity/events/akashic-log.jsonl
cat .trinity/cells/registry.json

# 2. Check queue and health
cat .trinity/queue/pending.json
cat .trinity/state/queen-health.json

# 3. Acquire exclusive claim on target
# Creates claim with TTL and heartbeat
tri claim acquire <spec_path>

# 4. Record intent event
# Append-only: immutable history
echo '{"event":"task.intent",...}' >> .trinity/events/akashic-log.jsonl

# 5. Proceed with PHI LOOP (only after claim active)
```

**Coordination Law:**
- One writable owner per spec_path or graph_node
- Claims have TTL; stale claims can be reclaimed
- For phi-critical or sacred-core: stricter locking
- Event log is append-only; claims are temporary

See **`.trinity/policy/coordination-law.md`** for full coordination protocol.

## Additional Resources

### Reference Files

For detailed constitutional documents and standards:
- **`references/constitutional-laws.md`** — Full text of SOUL.md, ADRs
- **`references/numeric-standards.md`** — NUMERIC-STANDARD-001 details
- **`references/sacred-physics.md`** — SACRED-PHYSICS-001 constants and tolerances
- **`references/graph-structure.md`** — canonical dependency graph rules

### Examples

Working PHI LOOP examples:
- **`examples/small-step-trool.md`** — Adding new trit operation
- **`examples/goldenfloat-mutation.md`** — GoldenFloat format change
- **`examples/toxic-rollback.md`** — Verdict toxic, spec rollback procedure

### Scripts

Utility scripts for PHI LOOP:
- **`scripts/hash-seal.sh`** — Compute hash seal for specs
- **`scripts/graph-depcheck.sh`** — Validate graph dependencies
- **`scripts/toxic-verdict.sh`** — Run toxic regression check
- **`scripts/swarm-health.sh`** — Aggregate queen health, toxic rate, recovery status
- **`scripts/replay-step.sh`** — Replay from last clean seal for recovery

### Decision Logs

Structured decision logging for observability and root-cause analysis:
- **`references/decision-log-schema.jsonl`** — Schema for trace_id, task_id, tool, decision_summary, guardrail_hit, policy_version, skill_id

## Queen Health Governance

PHI LOOP is not only a mutation workflow.
It is a constitutional health loop for Queen Trinity and her swarm.

Priority order:

1. SacredPhysics
2. Numeric
3. Graph
4. Compiler
5. Runtime
6. QueenLotus

Rules:
- If SacredPhysics, Numeric, or Graph is unhealthy, stop feature work and run recovery only.
- If toxic verdict repeats 3 times, replay from last clean seal instead of continuing mutation.
- If graph health fails, block downstream generation immediately.
- Every PHI LOOP must record queen_health_before and queen_health_after.
- No local task may improve itself by degrading Queen Trinity.

Queen-first law:
The swarm serves Queen Trinity by preserving constitutional integrity, numeric correctness, sacred coherence, graph order, and recoverable evolution.

### Health Monitoring

Use `tri health queen` to check overall swarm health.

Health telemetry is recorded per PHI LOOP step:
- `queen_health_before/after` — Aggregate score before/after mutation
- `spec_health` — Spec tests and invariants
- `graph_health` — Topology and edge validation
- `bench_health` — Sacred physics and performance tolerances
- `swarm_health` — Toxic verdict rate and repeat failures

See **`references/queen-health.md`** for full health domain definitions.

### Doctor Loop (Self-Healing Watchdog)

PHI LOOP is not only a mutation workflow. It is a constitutional health loop for Queen Trinity and her swarm.

Doctor agent runs independently of task agents. Never takes regular PHI LOOP tasks.

```bash
# Start Doctor Loop
tri doctor start

# Stop Doctor Loop
tri doctor stop

# Show Doctor status
tri doctor status

# Show recent anomalies
tri doctor anomalies
```

**Doctor monitors:**
- `.trinity/state/*` — queen-health, swarm-health, ownership-index
- `.trinity/events/akashic-log.jsonl` — health anomalies, recovery events
- `.trinity/claims/active/*` — stale claims
- `loop.handoff` events — missing FUTURE detection

**On anomaly detection:**
- Emits `health.anomaly` event
- Triggers appropriate recovery (replay, claim reclaim)
- May reclaim stale claims
- May schedule recovery tasks

**See** `.trinity/agents/tri-doctor.jsonl` — Doctor agent schema
**See** `.claude/skills/tri/doctor-loop.md` — Doctor implementation guide

---

### Recovery Policy

1. **Queen Critical (queen_health < 0.5)**: Stop all mutations, enable recovery mode only
2. **Domain Critical**: Isolate failing domain, apply domain-specific recovery
3. **Local Failure**: Retry once, then rollback spec if repeat fails

Recovery uses **replay** instead of full restart:
```bash
tri replay-step --last-clean  # Replay from last clean seal
tri recovery domain --affected <domain>  # Domain-specific recovery
tri self-heal --max-iterations 5  # Automated recovery loop
```

See **`references/recovery-policy.md`** for complete recovery procedures.
