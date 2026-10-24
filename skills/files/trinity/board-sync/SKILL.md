---
name: board
description: GitHub Project Board auto-sync — fill empty fields, sync labels with board status, audit field completeness. Keeps board as realtime source of truth.
argument-hint: [sync|audit|fix]
model: haiku
allowed-tools: Bash(gh *), Bash(python3 *), Bash(echo *), Bash(date *), Bash(cat *), Read, Edit, Write
---

Auto-sync GitHub Project Board #6 with issue metadata.
Ensures every issue has all required fields filled.

## Modes

- `sync` (default) — Check all open issues, fill empty fields, sync board status
- `audit` — Show field completeness table (read-only, no changes)
- `fix` — Like sync but also fix label/board status mismatches

## Required Constants

```
PROJECT_NODE_ID = PVT_kwHOAGdgHc4A-axm
STATUS_FIELD    = PVTSSF_lAHOAGdgHc4A-axmzgx076o
SIZE_FIELD      = PVTSSF_lAHOAGdgHc4A-axmzgx08Eg
PRIORITY_FIELD  = PVTSSF_lAHOAGdgHc4A-axmzgx08Ec

Status Options:
  Backlog     = f75ad846
  In progress = 47fc9ee4
  In review   = aba860b9
  Ready       = e18bf179
  Done        = 98236657

Priority Options:
  P0 = 79628723
  P1 = 0a877460
  P2 = da944a9c

Size Options:
  XS = 911790be
  S  = b277fb01
  M  = 86db8eb3
  L  = 853c8207
  XL = 2d0801e2
```

## Data Collection

ALWAYS run first:

```bash
# All open issues with full metadata
gh issue list --state open --json number,title,labels,assignees,milestone,state --limit 50 2>/dev/null

# Project board items with field values
gh project item-list 6 --owner gHashTag --format json --limit 50 2>/dev/null

# Tech tree for prereq data
cat .trinity/tech_tree.json 2>/dev/null || echo "NO_TREE"
```

## Mode: sync

For each open issue, check and fill:

### 1. Assignee
```bash
# If assignees array is empty:
gh issue edit $N -R gHashTag/trinity --add-assignee gHashTag
```

### 2. Priority Label
```bash
# If no priority:P0/P1/P2 label exists:
# Look up in tech_tree.json for priority
# Default: P2 if not in tree
gh issue edit $N -R gHashTag/trinity --add-label "priority:P2"
```

### 3. Status Label
```bash
# If no status:* label exists:
# Determine from board column:
#   Backlog → status:pending
#   In progress → status:in-progress
#   Ready → status:pending (ready to start)
#   Done → (closed, skip)
gh issue edit $N -R gHashTag/trinity --add-label "status:pending"
```

### 4. Milestone
```bash
# If milestone is null:
gh issue edit $N -R gHashTag/trinity --milestone "Ralph Swarm v1.0"
```

### 5. Size (Board field)
```bash
# If Size field is empty on board:
# Estimate from issue body: count checkboxes/sub-tasks
# 0-2 tasks → XS, 3-5 → S, 6-10 → M, 11-20 → L, 21+ → XL
# Or use tech_tree.json size if defined
gh project item-edit --project-id "$PROJECT" --id "$ITEM_ID" \
  --field-id "$SIZE_FIELD" --single-select-option-id "$SIZE_OPT"
```

### 6. Board Status Sync (label = source of truth)
```bash
# Map label → board column:
#   status:pending + prereqs met (from tree) → Ready
#   status:pending + prereqs NOT met → Backlog
#   status:in-progress → In progress
#   status:done → Done (also close issue if open)

# If board column != expected → update:
gh project item-edit --project-id "$PROJECT" --id "$ITEM_ID" \
  --field-id "$STATUS_FIELD" --single-select-option-id "$STATUS_OPT"
```

## Mode: audit

Show a table of field completeness WITHOUT making changes:

```
===============================================
  📋 BOARD AUDIT — {date}
===============================================

  ┌───────┬──────────┬──────────┬──────────┬─────────┬──────┬──────────┬───────────┐
  │ Issue │ Assignee │ Priority │ Status   │ Milestone│ Size │ Board    │ Sync?     │
  ├───────┼──────────┼──────────┼──────────┼─────────┼──────┼──────────┼───────────┤
  │ #38   │ ✅       │ ✅ P0    │ ❌       │ ✅      │ XL   │ Backlog  │ ⚠️        │
  │ #27   │ ✅       │ ✅ P1    │ ❌       │ ✅      │ XL   │ Backlog  │ ✅        │
  │ #45   │ ✅       │ ✅ P1    │ ✅       │ ✅      │ M    │ Ready    │ ✅        │
  │ ...   │          │          │          │         │      │          │           │
  └───────┴──────────┴──────────┴──────────┴─────────┴──────┴──────────┴───────────┘

  Summary:
    Fields filled: {N}/{total} = {%}%
    Sync issues: {N} (label ≠ board status)
    Missing fields: {list}

  Run /board sync to fix all issues.
```

### Completeness scoring per issue:
- Assignee: 1 point
- Priority label: 1 point
- Status label: 1 point
- Milestone: 1 point
- Size: 1 point
- Board status matches label: 1 point
- Agent label (assign:*): 1 point
- Total: 7 points per issue

## Mode: fix

Same as `sync` plus:
- Fix label/board mismatches bidirectionally
- Update tech_tree.json statuses from GitHub
- Move READY tasks to Ready column
- Move CLOSED tasks to Done column

## Output Format (sync/fix)

```
===============================================
  🔄 BOARD SYNC — {date}
===============================================

  Changes made:
  ┌───────┬─────────────────────────────────────┐
  │ Issue │ Action                              │
  ├───────┼─────────────────────────────────────┤
  │ #45   │ ✅ Board: Backlog → Ready           │
  │ #57   │ ✅ Added: priority:P2, milestone    │
  │ #46   │ ✅ Added: assignee gHashTag         │
  └───────┴─────────────────────────────────────┘

  Board health: {N}/8 issues fully synced
  Fields filled: {before}% → {after}%
```

## Integration with bridge-agent

The bridge-agent already handles issue-linked commands.
When bridge-agent moves issues between columns, it uses these same constants.

Board sync can be triggered via bridge:
```
claude:Run /board sync
claude:Run /board audit
```

## Translation Table (EN → RU)

| EN | RU |
|----|-----|
| BOARD AUDIT | АУДИТ ДОСКИ |
| BOARD SYNC | СИНХРОНИЗАЦИЯ ДОСКИ |
| Fields filled | Полей заполнено |
| Sync issues | Проблемы синхронизации |
| Missing fields | Отсутствующие поля |
| Changes made | Внесённые изменения |
| Board health | Здоровье доски |
| fully synced | полностью синхронизирован |
