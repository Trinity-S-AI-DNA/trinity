---
id: tri-pipeline
name: TRI Pipeline
description: Execute tri commands (gen, test, verify, seal, verdict) for spec-first development
---

# TRI Pipeline Skill

Execute the canonical t27 toolchain commands.

## Commands

### `tri gen`
Generate code from .t27 specifications.

```bash
tri gen specs/ring-NNN-name.t27
```

**Output**: Generated files in `gen/` directory
**Laws**: L2 (GENERATION) - gen/ is read-only
**Verification**: Hash verification during seal phase

### `tri test`
Run conformance tests from specifications.

```bash
tri test specs/ring-NNN-name.t27
```

**Output**: Test results, pass/fail status
**Laws**: L4 (TESTABILITY) - specs must have tests
**Success Criteria**: All tests pass, invariants satisfied

### `tri verify`
Verify all 7 invariant laws.

```bash
tri verify
```

**Checks**:
- L1: Commits have issue references
- L2: No manual edits to gen/
- L3: ASCII-only source files
- L4: All specs have tests
- L5: φ identity constraints
- L6: FORMAT-SPEC-001.json authority
- L7: No new shell scripts on critical path

**Output**: Pass/fail for each law
**Block**: Non-compliant commits are blocked

### `tri seal`
Generate and verify seal hash.

```bash
tri seal specs/ring-NNN-name.t27
```

**Output**: Hash of generated artifacts
**Purpose**: Immutable snapshot for verification

### `tri verdict`
Generate formal pass/fail verdict.

```bash
tri verdict
```

**Output**:
- Overall status: PASS | FAIL
- Law compliance breakdown
- Required fixes for failures

### `tri experience save`
Save episode to experience log.

```bash
tri experience save --ring 72 --phase verify --outcome success
```

**Output**: Entry in `~/.trinity/experience/episodes.jsonl`

### `tri experience query`
Search past episodes.

```bash
tri experience query "how to fix L5 violation"
```

**Output**: Relevant past episodes with solutions

## Error Handling

If a command fails:
1. Log error with context
2. Suggest fix based on error type
3. Check experience for similar past issues
4. Retry with modified inputs if applicable

## Success Indicators

- Command exits with code 0
- Output contains expected patterns
- No law violations detected
- Artifacts are generated correctly
