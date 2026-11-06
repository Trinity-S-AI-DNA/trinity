# Skill: Wave Audit

Comprehensive t27 project audit skill covering issue triage, weakness analysis, SOTA research review, decomposed planning, and critical fix implementation.

## When to Use

- User asks for "wave audit", "project audit", "weakness analysis"
- New development cycle (Wave) is starting
- Major milestone review needed
- Pre-publication readiness check

## Phases

### Phase 1: Issue Triage
```bash
gh issue list --state open --limit 100 --json number,title,labels
gh issue list --state open --label "priority/critical" --json number,title,body
gh issue list --state open --label "security" --json number,title,body
```

Categorize by: area (compiler/RTL/specs/infra), severity (CRITICAL/HIGH/MEDIUM), type (bug/security/feature/epic).

### Phase 2: Weakness Analysis
Use `task(explore)` agents to investigate:
- Compiler architecture and health
- Test infrastructure maturity
- CI/CD pipeline status
- Code generation backends
- FPGA/RTL pipeline
- Build system health
- Documentation quality

### Phase 3: SOTA Research
Review competing work in:
- Ternary LLMs (BitNet b1.58)
- Numeric formats (posit/unum, FP8)
- Code LLMs (Qwen2.5-Coder, Phi-1.5)
- Symbolic regression (PySR, AI Feynman)
- Formal HW verification (Kami, Karamel)
- Physics numerology (SU(5) GUT, QED)

### Phase 4: Decomposed Plan
5-phase plan:
1. Critical Fixes (Week 1-2)
2. Compiler Health (Week 3-4)
3. RTL/Silicon (Week 5-6)
4. Scientific Strengthening (Week 7-8)
5. IGLA-Coder and Scale (Week 9-12)

### Phase 5: Implementation
Fix highest-impact issues using PHI LOOP:
- Spec fixes (math errors, syntax)
- Security fixes (SSRF, path traversal)
- Conformance vector corrections

### Phase 6: Report + Cooperation Variants
Three variants:
- **A: Engineering Core** — Compiler + FPGA + silicon
- **B: Scientific Bridge** — Publications + benchmarks
- **C: Full Stack Sprint** — A + B + IGLA-Coder

## Output Artifacts
- `WAVE_AUDIT_REPORT_YYYY-MM-DD.md` — Full audit report
- Git diff with applied fixes
- Skill registration in `.claude/skills/wave-audit/`

## Constitutional Compliance
- L1: All changes trace to GitHub issues
- L2: No gen/ files hand-edited
- L3: ASCII-only, English identifiers
- L4: Spec fixes include corrected tests
- L5: Math fixes verified against phi identity

## Previous Audits
- 2026-06-07: W112 (8 spec/conformance fixes), W82 (4 proxy security fixes)
