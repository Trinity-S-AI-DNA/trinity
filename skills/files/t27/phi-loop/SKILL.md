---
id: phi-loop
name: PHI LOOP
description: Execute 9-phase spec-first development workflow (Issue → Spec → TDD → Code → Gen → Seal → Verify → Land → Learn)
---

# PHI LOOP Skill

Execute the canonical t27 development workflow following all 7 invariant laws.

## Phases

| Phase | Name | Description | Artifacts |
|-------|------|-------------|------------|
| 1 | Issue | Define problem or requirement | #N ticket in repo |
| 2 | Spec | Write .t27 specification | `specs/ring-NNN-name.t27` |
| 3 | TDD | Write tests before code | test cases in .t27 |
| 4 | Code | Implement according to spec | src/ files (manual) |
| 5 | Gen | Run `tri gen` to generate | `gen/` files |
| 6 | Seal | Verify generated code, seal hash | seal hash |
| 7 | Verify | Run `tri test` for conformance | test results |
| 8 | Land | Merge changes to main | git merge |
| 9 | Learn | Capture learnings | episodes.jsonl entry |

## Commands

```bash
# Start PHI LOOP for ring N
tri phi-loop N

# Advance to next phase
tri next-phase

# Show current phase status
tri status

# Reset current ring
tri reset
```

## Law Compliance

Execute with these constraints:
- **L1 TRACEABILITY**: All commits must reference issue #N
- **L2 GENERATION**: Never edit files in gen/ manually
- **L3 PURITY**: Source files must be ASCII-only with English identifiers
- **L4 TESTABILITY**: Every .t27 spec must contain test/invariant/bench
- **L5 IDENTITY**: φ² + 1/φ² = 3; use tolerance for f64
- **L6 CEILING**: FORMAT-SPEC-001.json + gf16.t27 are numeric SSOT
- **L7 UNITY**: No new shell scripts; use tri/t27c

## Exit Condition

PHI LOOP is complete when:
1. All 9 phases have executed
2. Agent V (Verification) passes
3. Changes are landed to main branch
4. Episode is saved to experience log

## Output

On completion:
```
Phase complete: Learn
→ Next ring: N+1
```

This triggers creation of next ring branch.
