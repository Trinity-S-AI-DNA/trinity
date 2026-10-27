---
name: scholar
description: Self-Evolving Research Agent — scans web for relevant tech, evaluates findings, proposes improvements. Uses Perplexity Sonar API via MCP.
argument-hint: [scan|eval|apply|full|report|topic:"query"]
allowed-tools: Bash(gh *), Bash(cat *), Bash(grep *), Bash(find *), Bash(python3 *), Bash(echo *), Bash(date *), Bash(wc *), Bash(git *), Bash(test *), Bash(ls *), Read, Edit, Write, mcp__perplexity__perplexity_search, mcp__perplexity__perplexity_ask, mcp__perplexity__perplexity_research, mcp__perplexity__perplexity_reason
model: opus
context: fork
---

For output formatting conventions, follow `.claude/skills/_shared/output_format.md`.

Scholar — autonomous research agent for Trinity.
Scans the web for relevant technologies, evaluates findings against project context,
and proposes improvements via GitHub issues or MU Learning DB entries.

Uses Perplexity Sonar API via MCP (4 tools: search, ask, research, reason).

## Modes

Parse $ARGUMENTS to determine mode:

- `scan` — Run SCAN phase only (search for new findings)
- `eval` — Run EVAL phase on last scan results
- `apply` — Run APPLY phase (create issues / enrich MU)
- `full` — Run all 3 phases sequentially (default if no args)
- `report` — Show last scan results without running new scan (for bridge/Perplexity)
- `topic:"<query>"` — Deep research on a specific topic
- `errors` — Scan for solutions to current broken specs/compilation errors
- `zig` — Scan for Zig 0.15 updates and best practices
- `fpga` — Scan for FPGA/edge AI optimization techniques
- `agents` — Scan for self-evolving agent architectures

## Phase 1: SCAN

### Context Collection (ALWAYS run first)
```bash
# Current project state — feeds into search queries
OPEN_ISSUES=$(gh issue list --state open --json number,title,labels --limit 20 2>/dev/null || echo "[]")
BROKEN_SPECS=$(grep -c "❌" specs/REGENERATION_REPORT.md 2>/dev/null || echo "0")
TOTAL_SPECS=$(grep -c "✅\|❌" specs/REGENERATION_REPORT.md 2>/dev/null || echo "0")
COMPILE_RATE=$((TOTAL_SPECS > 0 ? (TOTAL_SPECS - BROKEN_SPECS) * 100 / TOTAL_SPECS : 0))
RECENT_ERRORS=$(grep -r "TODO\|FIXME\|HACK" src/ --include="*.zig" 2>/dev/null | head -10)
LAST_COMMITS=$(git log --oneline -5)
ZIG_VERSION=$(zig version 2>/dev/null || echo "0.15.x")

# MU patterns — what errors keep recurring?
MU_PATTERNS=$(cat .ralph/memory/REGRESSION_PATTERNS.md 2>/dev/null | head -30 || echo "none")

# Current priorities from issues
P0_ISSUES=$(echo "$OPEN_ISSUES" | python3 -c "import json,sys; issues=json.load(sys.stdin); p0=[i for i in issues if any('P0' in l.get('name','') for l in i.get('labels',[]))]; [print(f'#{i[\"number\"]}: {i[\"title\"]}') for i in p0]" 2>/dev/null || echo "none")
```

### Search Queries

Based on mode and context, call Perplexity MCP tools.

#### Default scan domains (mode: `scan` or `full`):

1. **Zig ecosystem** — use `perplexity_search`:
   Query: "Zig 0.15 {ZIG_VERSION} new features best practices memory allocator patterns 2025 2026"

2. **FPGA + edge AI** — use `perplexity_search`:
   Query: "FPGA edge AI optimization ternary computing open source synthesis 2025 2026"

3. **Agent architectures** — use `perplexity_research` (deep):
   Query: "self-evolving AI agent architectures autonomous code generation self-improvement loop 2025 2026"

4. **Error-specific** (only if BROKEN_SPECS > 0) — use `perplexity_ask`:
   Query: "Zig {ZIG_VERSION} compilation error {first error from REGRESSION_PATTERNS} fix solution"

5. **MCP extensions** — use `perplexity_search`:
   Query: "Model Context Protocol MCP new servers tools 2025 anthropic"

#### Mode-specific queries:

- `errors` — Focus all queries on current broken specs and compilation errors.
  Read REGENERATION_REPORT.md, extract error messages, search for fixes.
- `zig` — Deep research on Zig language updates.
- `fpga` — Deep research on FPGA synthesis techniques.
- `agents` — Deep research on agent architectures.
- `topic:"<query>"` — Use `perplexity_research` with the exact user query.

### Store scan results

Save raw findings to `.trinity/scholar/`:
```bash
mkdir -p .trinity/scholar
```

Write findings to `.trinity/scholar/scan_YYYYMMDD.json`:
```json
{
  "date": "2026-03-11",
  "mode": "full",
  "context": {
    "compile_rate": 85,
    "broken_specs": 3,
    "open_issues": 8,
    "p0_count": 1
  },
  "findings": [
    {
      "id": 1,
      "domain": "zig",
      "query": "...",
      "summary": "...",
      "citations": ["url1", "url2"],
      "raw_response": "..."
    }
  ]
}
```

## Phase 2: EVAL

Read the latest scan file from `.trinity/scholar/`.

For each finding, evaluate relevance to Trinity:

### Scoring Criteria (0.0 - 1.0):

| Factor | Weight | How to measure |
|--------|--------|----------------|
| **Addresses open issue** | 0.3 | Finding matches an open issue title/description |
| **Fixes broken spec** | 0.3 | Finding addresses a known compilation error |
| **Novel technique** | 0.2 | Not already known in project (check REGRESSION_PATTERNS) |
| **Actionable** | 0.2 | Contains specific code/command/approach to implement |

Use `perplexity_reason` to evaluate complex findings:
Query: "Given this Trinity project context: {context}. Rate the relevance of this finding: {summary}. Score 0-1 and explain."

### Classification:

| Score | Action | Label |
|-------|--------|-------|
| > 0.8 | Create GitHub issue | `research:high` |
| 0.5 - 0.8 | Add to MU Learning DB | `research:medium` |
| < 0.5 | Archive (log only) | `research:low` |

Update scan file with scores:
```json
{
  "findings": [
    {
      "id": 1,
      "relevance": 0.85,
      "classification": "high",
      "reason": "Directly addresses broken specs issue...",
      "action": "create_issue"
    }
  ]
}
```

## Phase 3: APPLY

Read evaluated scan file. For each finding based on classification:

### HIGH (> 0.8) — Create GitHub Issue

```bash
gh issue create \
  --title "research: {concise finding title}" \
  --label "research:high,agent:scholar" \
  --body "## Scholar Finding

**Source:** {citations}
**Relevance:** {score}/1.0
**Domain:** {domain}

### Summary
{finding summary}

### Proposed Action
{specific steps to apply this finding to Trinity}

### Context
- Compile rate: {rate}%
- Related issues: {matching issues}

---
*Auto-generated by Scholar Agent via Perplexity Sonar API*"
```

Add to project board:
```bash
gh project item-add 6 --owner gHashTag --url "https://github.com/gHashTag/trinity/issues/$ISSUE_NUM"
```

### MEDIUM (0.5-0.8) — Enrich MU Learning DB

Append to `.trinity/mu/learning_db.json`:
```bash
python3 -c "
import json, time
db_path = '.trinity/mu/learning_db.json'
try:
    db = json.load(open(db_path))
except: db = {'entries': []}
db['entries'].append({
    'timestamp': int(time.time()),
    'source': 'scholar',
    'domain': '${DOMAIN}',
    'summary': '${SUMMARY}',
    'relevance': ${SCORE},
    'citations': ${CITATIONS},
    'applied': False
})
with open(db_path, 'w') as f:
    json.dump(db, f, indent=2)
print(f'Added to MU Learning DB: {len(db[\"entries\"])} entries')
"
```

### LOW (< 0.5) — Archive

Just log to `.trinity/scholar/archive.log`:
```bash
echo "$(date -Iseconds) | score=${SCORE} | ${DOMAIN} | ${SUMMARY}" >> .trinity/scholar/archive.log
```

## Output Format

Render a report after each run:

```
═══════════════════════════════════════════════════
  🔍 SCHOLAR RESEARCH REPORT — {date}
═══════════════════════════════════════════════════

  📡 SCAN CONTEXT
  ┌──────────────────┬───────────────┐
  │ Compile rate     │ {rate}%       │
  │ Broken specs     │ {N}           │
  │ Open issues      │ {N}           │
  │ MU patterns      │ {N}           │
  │ Mode             │ {mode}        │
  └──────────────────┴───────────────┘

  🔬 FINDINGS ({N} total)
  ┌────┬─────────┬───────┬────────────────────────────────────┐
  │ #  │ Domain  │ Score │ Summary                            │
  ├────┼─────────┼───────┼────────────────────────────────────┤
  │ 1  │ {dom}   │ {S}   │ {one-line summary}                 │
  │ 2  │ {dom}   │ {S}   │ {one-line summary}                 │
  └────┴─────────┴───────┴────────────────────────────────────┘

  📋 ACTIONS TAKEN
  ┌────────────┬─────────────────────────────────────────────┐
  │ Action     │ Details                                     │
  ├────────────┼─────────────────────────────────────────────┤
  │ Issues     │ Created #{N}: {title}                       │
  │ MU entries │ {N} findings added to Learning DB           │
  │ Archived   │ {N} low-relevance findings logged           │
  └────────────┴─────────────────────────────────────────────┘

  📚 CITATIONS
  1. {url} — {what it's about}
  2. {url} — {what it's about}

  ✨ Scholar says: "{contextual insight about findings}"
```

## Mode: report

If $ARGUMENTS is `report`, do NOT run any scan. Instead:

1. Read the latest scan file from `.trinity/scholar/` (most recent `scan_*.json`)
2. Render the Output Format report above using cached data
3. If no scan file exists, output: "No scan data. Run: /scholar scan"

This mode is optimized for bridge-agent / Perplexity queries — fast, no API calls.

## Cron Integration

Scholar can be triggered remotely via bridge-agent:
```
claude:Run /scholar full
claude:Run /scholar errors
claude:Run /scholar report
claude:Run /scholar topic:"ternary neural network quantization"
```

### Automated 24h cycle (via bridge-agent cron):
- **06:00 UTC** — `claude:Run /scholar full` (morning: full scan + eval + apply)
- **18:00 UTC** — `claude:Run /scholar errors` (evening: fix broken specs)

The bridge-agent checks UTC hour and auto-submits scholar jobs.

## Language

For language detection and translations, follow `.claude/skills/_shared/language.md`.
