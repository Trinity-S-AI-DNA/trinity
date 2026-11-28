---
name: god-mode
description: GOD MODE — Agent monitoring dashboard. Shows swarm status, task queue, pipeline compliance, circuit breakers, git activity, and rule violations.
argument-hint: [status|agents|tasks|violations]
allowed-tools: Bash(tri *), Bash(git *), Bash(cat *), Bash(gh *), Bash(pgrep *), Bash(ls *), Read, Grep, Glob
---

# GOD MODE — Agent Oversight Dashboard

## Swarm Status
Call the MCP tool `swarm_status` to get overall swarm health summary.

## Agent Status
Call the MCP tool `swarm_agents` to get per-agent details (status, tasks, circuit breaker state).

## Task Queue
Call the MCP tool `swarm_tasks` to see all active and pending tasks with priorities.

## Active Worktrees
!`git worktree list`

## Git Activity
!`git log --oneline -10 --all --graph`

## Branches
!`git branch -a | head -20`

## Circuit Breaker State
!`cat "$(git rev-parse --show-toplevel)/.ralph/internal/.circuit_breaker_state" 2>/dev/null || echo "CLOSED (default)"`

## GitHub Issues (assign:ralph)
!`gh issue list --label "assign:ralph" --state open --json number,title,state --jq '.[] | "#\(.number): \(.title)"' 2>/dev/null || echo "gh CLI not available or no issues"`

## CI Status
!`gh run list --workflow=ci.yml --limit 3 --json status,conclusion,displayTitle --jq '.[] | "\(.conclusion // .status)\t\(.displayTitle)"' 2>/dev/null || echo "gh CLI not available"`

## GOD MODE Event Log (last 10)
!`tail -10 "$(git rev-parse --show-toplevel)/.ralph/god_mode_log.jsonl" 2>/dev/null || echo "(no events yet)"`

## Full Status Report
!`bash "$(git rev-parse --show-toplevel)/.ralph/god_mode.sh" --text 2>/dev/null || echo "god_mode.sh not found"`

---

## Your Task

After reviewing all data above:

1. **Summarize** agent status in 2-3 sentences
2. **Report violations** if any:
   - Agent on main branch (MUST use feature branches)
   - Agent editing files in `var/trinity/output/` or `generated/` (VIBEE-first violation)
   - Agent with `no_progress_count >= 5` (circuit breaker should trip)
   - Conflicting file locks between agents
3. **Recommend interventions** if agents are stuck:
   - Reset circuit breaker
   - Reassign task
   - Pause/resume agents
4. **Track tri pipeline compliance**:
   - Golden Chain: spec -> gen -> test -> assess -> tree -> commit
   - Quality gates: build -> test -> format -> commit (strict order)
   - Exit criteria: all 9 conditions (tests_pass, spec_complete, critical_assessment, tech_tree, etc.)
5. **Show next actions** — what should each agent work on next

If `$ARGUMENTS` is "agents" — focus on agent details only.
If `$ARGUMENTS` is "tasks" — focus on task queue only.
If `$ARGUMENTS` is "violations" — focus on rule violations only.
Otherwise — show full dashboard.
