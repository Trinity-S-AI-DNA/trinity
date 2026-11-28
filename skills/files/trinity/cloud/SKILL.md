---
name: cloud
description: Show Trinity Cloud Dev dashboard — containers, training farm, issues, PRs, costs. Use when checking agent swarm status, cloud containers, or CI/CD pipeline.
argument-hint: [status|agents|events|full]
allowed-tools: Bash(tri *), Bash(gh *), Bash(cat *), Bash(tail *), Bash(ls *), Bash(python3 *), Bash(date *), Read, Grep, Glob
model: haiku
context: fork
---

# Cloud Dev Dashboard

## Active Containers
!`/Users/playra/trinity-w1/zig-out/bin/tri cloud agents 2>&1 || echo "No tri binary — run zig build first"`

## Recent Events (last 20)
!`if [ -f /Users/playra/trinity-w1/.trinity/cloud_events.jsonl ]; then tail -20 /Users/playra/trinity-w1/.trinity/cloud_events.jsonl; else echo "No cloud events yet"; fi`

## Agent Issues (labeled agent:spawn)
!`gh issue list --repo gHashTag/trinity --label "agent:spawn" --state open --limit 10 2>&1 || echo "gh CLI unavailable"`

## Agent PRs (feat/issue- branches)
!`gh pr list --repo gHashTag/trinity --state open --limit 10 2>&1 || echo "gh CLI unavailable"`

## Container Registry
!`gh api user/packages?package_type=container 2>/dev/null | python3 -c "import sys,json; pkgs=json.load(sys.stdin); [print(f'  {p[\"name\"]} — {p.get(\"updated_at\",\"?\")}') for p in pkgs]" 2>/dev/null || echo "No GHCR packages yet"`

## Railway Services
!`gh api repos/gHashTag/trinity/actions/runs --jq '.workflow_runs[:5] | .[] | "  \(.name) #\(.run_number) — \(.status) (\(.conclusion // "running"))"' 2>/dev/null || echo "No recent workflow runs"`

## Priorities
!`head -30 /Users/playra/trinity-w1/.trinity/priorities.md 2>/dev/null || echo "No priorities file"`

## Task

Analyze the data above and present a **rich Cloud Dev dashboard** with emojis.

Focus area: $ARGUMENTS (default: status)

### Dashboard Format

ALWAYS output the full dashboard — never compress to one line. Use this format:

```
☁️ ═══════════════════════════════════════════════════
   TRINITY CLOUD DEV — AGENT SWARM DASHBOARD
   ═══════════════════════════════════════════════════

🤖 ACTIVE CONTAINERS
   [table: ID, issue#, role, status, uptime]
   Total: N/10 slots used

📋 AGENT ISSUES (agent:spawn)
   [list: #N — title — assignee — status]

🔀 AGENT PRs
   [list: #N — title — branch — checks]

📡 RECENT EVENTS (last 10)
   [timestamp] [emoji] event description
   ...

🏗️ INFRASTRUCTURE
   GHCR: [status]
   Railway: [status]
   Actions: [last 5 runs with status]

🎯 P0 PRIORITIES
   [from priorities.md]

📊 STATS
   Containers active: N/10
   Issues queued: N
   PRs open: N
   Last spawn: [timestamp]
   Last merge: [timestamp]
```

### Status emojis:
- 🟢 Running / healthy
- 🟡 Pending / building
- 🔴 Failed / errored
- ⚪ Idle / no containers
- 🔵 Completed successfully
