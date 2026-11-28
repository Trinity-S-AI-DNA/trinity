---
name: tree
description: Technology dependency tree — shows issue DAG, prereqs, critical path, blocked/ready tasks. Single source of truth for work order.
argument-hint: [next|path|blocked|update]
allowed-tools: Bash(gh *), Bash(python3 *), Bash(cat *), Bash(echo *), Bash(date *), Bash(test *), Read, Edit, Write
---

Show the Trinity technology dependency tree.
Every task is an issue, every issue has prereqs, the tree determines work order.

## Rule: No Issue = No Work

- Every `claude:` bridge command MUST reference an issue: `claude:#N:prompt`
- Before starting work: check prereqs in tree
- After completing work: update tree (close issue, unblock dependents)
- If no issue exists for the task: create one first

## Modes

Parse $ARGUMENTS:

- (no args) — Show full tree with statuses
- `next` — Show only READY tasks (all prereqs met)
- `path` — Show critical path to v1.0
- `blocked` — Show blocked tasks and what blocks them
- `update` — Re-read issues from GitHub, rebuild tree, sync board

## Data Collection

ALWAYS run these commands to get LIVE data:

```bash
# All open issues with labels
gh issue list --state open --json number,title,labels,state --limit 50 2>/dev/null

# Recently closed issues (last 30 days)
SINCE_30D=$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d "30 days ago" +%Y-%m-%d)
gh issue list --state closed --search "closed:>=$SINCE_30D" --json number,title,labels,state --limit 50 2>/dev/null

# Read tree definition file
cat .trinity/tech_tree.json 2>/dev/null || echo "NO_TREE"
```

## Tree Definition File

The tree is stored in `.trinity/tech_tree.json`:

```json
{
  "version": 1,
  "updated_at": "2026-03-11T03:00:00Z",
  "epics": [
    {
      "issue": 38,
      "title": "Ralph Agent Swarm v1.0",
      "priority": "P0",
      "children": [
        {"issue": 45, "title": "Phase 1: Architecture", "priority": "P1", "prereqs": [], "status": "open"},
        {"issue": 46, "title": "Phase 2: Core Pipeline", "priority": "P1", "prereqs": [45], "status": "open"},
        {"issue": 47, "title": "Phase 3: Agent MU", "priority": "P2", "prereqs": [46], "status": "open"},
        {"issue": 48, "title": "Phase 4: Quality", "priority": "P2", "prereqs": [47], "status": "open"},
        {"issue": 49, "title": "Phase 5: Deploy", "priority": "P2", "prereqs": [48], "status": "open"}
      ]
    },
    {
      "issue": 27,
      "title": "Full Trinity Pipeline",
      "priority": "P1",
      "children": [
        {"issue": 69, "title": "Spec Enricher", "prereqs": [], "status": "closed"},
        {"issue": 71, "title": "Spec <-> Code Sync", "prereqs": [], "status": "closed"},
        {"issue": 77, "title": "Batch Pipeline", "prereqs": [], "status": "closed"}
      ]
    },
    {
      "issue": 113,
      "title": "Scholar Agent",
      "priority": "P1",
      "children": []
    },
    {
      "issue": 57,
      "title": "tri-bot Phase 3",
      "priority": "P2",
      "children": []
    }
  ]
}
```

### On first run or if NO_TREE:
Build the tree from GitHub issues using labels and issue body references.
Write to `.trinity/tech_tree.json`.

### On `update`:
Re-read all issues from GitHub. Update statuses (open/closed).
Check if any prereqs are now met -> mark dependents as READY.
Sync project board columns.

## Status Logic

For each issue in the tree, compute status:

| Status | Condition | Board Column |
|--------|-----------|-------------|
| CLOSED | Issue is closed on GitHub | Done |
| READY | All prereqs are CLOSED | Ready |
| BLOCKED | At least one prereq is OPEN | Backlog |
| IN_PROGRESS | Has `status:in-progress` label | In Progress |
| REVIEW | Has PR open | In Review |

## Output Format: Full Tree

```
===============================================
  🌳 TRINITY TECHNOLOGY TREE — {date}
===============================================

  #38 Ralph Agent Swarm v1.0 [P0 EPIC]
  ├── #45 Phase 1: Architecture [P1, READY]
  │   └── Prereqs: none -> READY
  ├── #46 Phase 2: Core Pipeline [P1, BLOCKED]
  │   └── Prereqs: #45 -> BLOCKED
  ├── #47 Phase 3: Agent MU [P2, BLOCKED]
  │   └── Prereqs: #46 -> BLOCKED
  ├── #48 Phase 4: Quality [P2, BLOCKED]
  │   └── Prereqs: #47 -> BLOCKED
  └── #49 Phase 5: Deploy [P2, BLOCKED]
      └── Prereqs: #48 -> BLOCKED

  #27 Full Trinity Pipeline [P1 EPIC]
  ├── #69 Spec Enricher [CLOSED]
  ├── #71 Spec <-> Code Sync [CLOSED]
  └── #77 Batch Pipeline [CLOSED]

  #113 Scholar Agent [P1, CLOSED]
  #57 tri-bot Phase 3 [P2, READY]

  -----------------------------------------------
  Summary: {N} open, {N} closed, {N} ready, {N} blocked
  Critical path: #45 -> #46 -> #47 -> #48 -> #49
  Next task: #{N} {title}
```

## Output Format: next

Show only READY tasks (all prereqs met, issue is open):

```
===============================================
  🎯 READY TASKS — {date}
===============================================

  1. #45 Phase 1: Architecture [P1]
     Prereqs: none
     Epic: #38 Ralph Agent Swarm
     Command: claude:#45:Execute Protocol v2 Phase 1

  2. #57 tri-bot Phase 3 [P2]
     Prereqs: none
     Command: claude:#57:Implement worktree/pr/board commands

  Next action: Start #45 (highest priority READY task)
```

## Output Format: path

Show critical path — longest chain of dependencies to v1.0:

```
===============================================
  🛤️ CRITICAL PATH to v1.0 — {date}
===============================================

  #45 [READY] -> #46 [BLOCKED] -> #47 [BLOCKED] -> #48 [BLOCKED] -> #49 [BLOCKED]
   Architecture    Pipeline         MU               Quality          Deploy

  Steps remaining: 5
  Estimated: 5 issues x ~1 issue/day = ~5 days
  Bottleneck: #45 (not started)

  Start now: claude:#45:Execute Protocol v2 Phase 1 Architecture
```

## Output Format: blocked

Show blocked tasks and what blocks them:

```
===============================================
  🚫 BLOCKED TASKS — {date}
===============================================

  #46 Phase 2: Core Pipeline
     Blocked by: #45 Phase 1: Architecture [OPEN]
     Unblock: close #45

  #47 Phase 3: Agent MU
     Blocked by: #46 -> #45 (chain)
     Unblock: close #45, then #46

  ... (all blocked issues with chain)
```

## Board Sync

After showing the tree, sync project board:

```bash
# For each READY issue, set board column to Ready
# For each CLOSED issue, set board column to Done
# For each IN_PROGRESS issue, set board column to In Progress
# For each BLOCKED issue, set board column to Backlog

# Get project item IDs
gh project item-list 6 --owner gHashTag --format json --limit 50 2>/dev/null
```

Use `gh project item-edit` to update columns when status changes.

## Auto-Update on Issue Close

When a bridge job closes an issue:
1. Mark issue as Done on board
2. Check: did this unblock any dependent issues?
3. If yes: move newly-unblocked issues to Ready column
4. Log: "[tree] #N closed -> #M now READY"

## Translation Table (EN -> RU)

| EN | RU |
|----|-----|
| TECHNOLOGY TREE | ДЕРЕВО ТЕХНОЛОГИЙ |
| READY TASKS | ГОТОВЫЕ ЗАДАЧИ |
| CRITICAL PATH | КРИТИЧЕСКИЙ ПУТЬ |
| BLOCKED TASKS | ЗАБЛОКИРОВАННЫЕ ЗАДАЧИ |
| Prereqs | Зависимости |
| Steps remaining | Осталось шагов |
| Bottleneck | Узкое место |
| Unblock | Разблокировать |
| Start now | Начать сейчас |
| none | нет |
