---
name: status
description: Live system dashboard — 12-dimension ouroboros score, verdict v3, agents, build health, recommendations
argument-hint: [quick|full] [lang:ru|en]
allowed-tools: Bash(zig *), Bash(zig-out/*), Bash(git *), Bash(gh *), Bash(pgrep *), Bash(cat *), Bash(ls *), Bash(wc *), Bash(tail *), Bash(find *), Bash(date *), Read, Grep, Glob
model: haiku
context: fork
---

For system state collection, follow `.claude/skills/_shared/data_collection.md`.
For output formatting conventions, follow `.claude/skills/_shared/output_format.md`.

## Mode Detection

Check $ARGUMENTS:
- "full" → **MODE=FULL** (detailed per-dimension breakdown + history + recommendations)
- "quick" or empty → **MODE=QUICK** (compact 20-line dashboard)
- "lang:ru" or "lang:en" → set language (read from `.claude/skills/tri/lang.md`, default: ru)

## Data Collection

Run ALL of these in parallel (they are independent):

```bash
# 1. Ouroboros state
cat .trinity/ouroboros_state.json 2>/dev/null || echo '{"cycle":0}'

# 2. Verdict score (live — 12 dimensions)
zig-out/bin/tri verdict --explain 2>&1

# 3. Ouroboros status
zig-out/bin/tri ouroboros status 2>&1

# 4. Build health
zig build --summary none 2>&1; echo "EXIT:$?"

# 5. Git state
git status --porcelain | wc -l
git log --oneline -3

# 6. Agents alive
pgrep -la ralph-agent 2>/dev/null; pgrep -la tri-bot 2>/dev/null; pgrep -la trinity-mcp 2>/dev/null

# 7. Verdict history trend
cat .trinity/verdict_history.json 2>/dev/null | tail -c 500

# 8. Experience count
find .trinity/experience -name '*.json' 2>/dev/null | wc -l

# 9. Patent/IP status
cat .trinity/patent/status.json 2>/dev/null
```

## QUICK Mode Output (default)

Compact dashboard, ~25 lines:

```
🐍 OUROBOROS v3 — HUNGRY SNAKE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Score:      {score}/100 {emoji} {level}
  Cycle:      {cycle} | Strategy: {strategy}
  Stagnation: {stag}/3
  Build:      {pass|fail}
  Agents:     {list or "none"}
  Experience: {N} episodes

  TIER 1 — CRITICAL (50%)
    BUILD       {score}/100
    TEST_PASS   {score}/100
    TEST_COVER  {score}/100

  TIER 2 — CODE HEALTH (30%)
    TODO_DEBT   {score}/100
    GOD_FILES   {score}/100
    DEAD_CODE   {score}/100
    DUPLICATION {score}/100
    SPEC_GAP    {score}/100

  TIER 3 — EVOLUTION (20%)
    RESEARCH    {score}/100
    TOKEN_COST  {score}/100
    ENERGY      {score}/100

  Weakest:    {dimension} ({dim_score}/100) ← next target
  Rx:         {prescription one-liner}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {timestamp} | tri ouroboros
```

## FULL Mode Output

Everything from QUICK, plus:

### Per-Dimension Breakdown
Table with all 12 dimensions grouped by tier, their scores, status (STRONG/OK/WEAK/CRITICAL), weight, and reason.

### Score History
Last 5 entries from `.trinity/verdict_history.json` as mini sparkline or table:
```
  History: 99.4 → 27 → 35 → 42 → ...
           ↓72   ↑8   ↑7
```

### Patent/IP Status
Show 4 discoveries from `.trinity/patent/status.json`:
```
  IP PROTECTION
    ternary-resonance-law    DOI ✅  Patent ❌
    square-attention         DOI ✅  Patent ❌
    0-dsp-fpga-inference     DOI ✅  Patent ❌
    self-evolving-ouroboros   DOI ✅  Patent ❌
```

### Recommendations

Based on current state, generate 3 actionable recommendations:

1. **If score < 30**: "DISASTER. Run `tri ouroboros --cycles 5` immediately"
2. **If score 30-49**: "GARBAGE. Fix BUILD first: `tri ouroboros --cycles 3 --dimension BUILD`"
3. **If score 50-69**: "MEDIOCRE. Target weakest: `tri ouroboros --dimension {weakest}`"
4. **If score 70-89**: "SOLID. Push to LEGENDARY: `tri ouroboros --cycles 5`"
5. **If score >= 90 but weak dims exist**: "Almost! {dim} still at {score}. `tri ouroboros --dimension {dim}`"
6. **If all dims >= 95**: "LEGENDARY. Snake is resting. File patents: `tri patent status`"
7. **If build broken**: "URGENT: Build broken. Fix compilation first"
8. **If stagnation >= 2**: "Strategy rotation imminent"

### Git Activity
Last 3 commits with timestamps.

### Next Actions
Bullet list of concrete `tri` commands to run based on the data above.

## Language

For language detection and translations, follow `.claude/skills/_shared/language.md`.
Default: `ru`. Technical terms stay in English.

## Step: Telegram Broadcast

After rendering the dashboard, send a summary to Telegram.

Set `TG_TEXT` to the ouroboros summary (score, level, weakest dimension, 2-3 sentences in Russian, no mood signature).
Set `TG_MODE=dedup`, `TG_DEDUP_FILE=.trinity/tg_dedup_status.hash`.
Then execute the shared Telegram template from `.claude/skills/_shared/telegram.md`.

## Step: Auto-Action (after dashboard + Telegram)

After rendering the dashboard and sending Telegram, **execute the top-priority action automatically**.
Do NOT just list recommendations — ACT on the highest priority one.

### Priority Cascade (first match wins):

1. **Build broken** → Run `zig build 2>&1`, diagnose, fix the error, verify
2. **Dirty files > 50** → Group by directory, create conventional commits (skip .env, credentials, >1MB)
3. **Score dropped ≥5 points** → Run `tri ouroboros --cycles 1 --dimension {weakest}` to recover
4. **GOD_FILES < 60** → Pick the largest god file, split it (max 1 file per cycle)
5. **Weakest dimension < 70** → Run targeted fix for that dimension
6. **Stagnation ≥ 2** → Run `tri ouroboros --cycles 3` to break plateau
7. **All healthy (score ≥ 90, no weak dims)** → Print "✅ Система в φ-гармонии. Действий не требуется."

### Rules:
- Only ONE action per /status cycle
- Report what was done in 1-2 sentences after the action
- If the action fails, report failure — do NOT retry in same cycle
- NEVER force-push, NEVER commit .env/credentials
- NEVER delete running services

## Step: GitHub Issue Update (after action)

After auto-action completes, update the relevant GitHub issue with real-time status.

```bash
# Find the active status tracking issue (or use #357 as default farm tracker)
TRACKER=$(gh issue list -R gHashTag/trinity --label "status:in-progress" --json number --limit 1 -q '.[0].number' 2>/dev/null || echo "357")

# Post status comment with score, action taken, and current state
gh issue comment "$TRACKER" --body "## 🐍 Ouroboros Status — $(date +%Y-%m-%d\ %H:%M)

**Score**: {score}/100 ({level})
**Weakest**: {dimension} ({dim_score}/100)
**Action**: {what was done}
**Result**: {outcome}
**Dirty**: {count} files
**Farm**: {active} services, leader {name} PPL={ppl}" 2>/dev/null
```

### Rules:
- ALWAYS post to GitHub after every /status action — this is the thought graph protocol
- If no in-progress issue exists, use #357 (farm tracker) as default
- Comment format must follow Trinity Protocol v2 (emoji + agent + timestamp)
- Status changes on issues must be visible in realtime — not batched

## Session Memory

After each `/status` run, note key metrics for next session:
- Current score and level
- Which dimensions improved/regressed
- What recommendations were given
- What action was taken and its result
- Any anomalies (score drops, build failures, stagnation)

This builds context for the next conversation's `/status` call.
