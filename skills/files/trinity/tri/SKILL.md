---
name: tri
description: TRI status dashboard — agent thought mode by default, /tri full for visual dashboard
argument-hint: [short] [full] [audit] [coverage] [lang:ru|en] [humor|prof|toxic|zen]
allowed-tools: Bash(zig *), Bash(ls *), Bash(wc *), Bash(grep *), Bash(gh *), Bash(pgrep *), Bash(cat *), Bash(find *), Bash(git *), Bash(date *), Bash(test *), Bash(tail *), Bash(for *), Bash(python3 *), Bash(echo *), Bash(curl *), Read, Edit, Write
---

For system state collection, follow `.claude/skills/_shared/data_collection.md`.
For output formatting conventions, follow `.claude/skills/_shared/output_format.md`.
For cached system state, follow `.claude/skills/_shared/system_snapshot.md`.

## Mode Detection

Check $ARGUMENTS for mode:
- If $ARGUMENTS contains "full" → **MODE=FULL** (strip "full" from arguments, pass rest through)
- If $ARGUMENTS contains "short" → **MODE=COMPACT** (explicit short/conversational mode)
- If $ARGUMENTS contains "coverage" → **MODE=COVERAGE** (CLI/MCP coverage + duplicates + board audit)
- Otherwise → **MODE=COMPACT**

"audit" and "lang:xx" work in BOTH modes.

Run a diagnostic of the TRI system. In COMPACT mode, output ~15 lines.
In FULL mode, output the complete diagnostic report.

If $ARGUMENTS contains "lang:ru" or "lang:en", update `.claude/skills/tri/lang.md` to that language and use it.
If $ARGUMENTS is "ru" or "en" alone, treat as language switch.
In FULL mode, if remaining $ARGUMENTS is provided, focus the diagnostic on that area.

### Mood Detection

If $ARGUMENTS contains "humor", "prof", "toxic", or "zen" → set **MOOD** to that value and update `.claude/skills/tri/mode.md` with `mood: {value}`.
If no mood keyword in $ARGUMENTS → read current mood from `.claude/skills/tri/mode.md` (default: `humor`).

## 🔄 Audit Mode

If $ARGUMENTS contains "audit", run a FRESH regeneration audit BEFORE the diagnostic:

```bash
python3 << 'AUDIT_EOF'
import subprocess, os, glob, time
specs = sorted(glob.glob('specs/tri/*.tri'))
results = []
for s in specs:
    name = os.path.splitext(os.path.basename(s))[0]
    try: subprocess.run(['zig-out/bin/vibee', 'gen', s], capture_output=True, timeout=30)
    except: pass
    zig = f'generated/{name}.zig'
    if not os.path.exists(zig):
        results.append((name, 'no output'))
        continue
    try:
        r = subprocess.run(['zig', 'ast-check', zig], capture_output=True, timeout=30)
        results.append((name, 'pass' if r.returncode == 0 else 'ast-check failed'))
    except: results.append((name, 'timeout'))
passed = sum(1 for _,s in results if s == 'pass')
total = len(results)
pct = passed*100//total if total else 0
emoji = '💎' if pct>=80 else ('🟡' if pct>=50 else '💀')
with open('specs/REGENERATION_REPORT.md','w') as f:
    f.write(f'# Regeneration Audit Report\n\n**Date:** {int(time.time())}\n**Sample:** {total} specs\n**Tool:** vibee gen + zig ast-check\n\n## Results\n\n| # | Spec | Status |\n|---|------|--------|\n')
    for i,(name,status) in enumerate(results,1):
        icon = '✅' if status=='pass' else f'❌ {status}'
        f.write(f'| {i} | {name} | {icon} |\n')
    f.write(f'\n## Summary\n\n- **Compiled:** {passed}/{total} = **{pct}%** {emoji}\n- **Failed:** {total-passed}\n')
print(f'AUDIT_COMPLETE: {passed}/{total} = {pct}%')
AUDIT_EOF
```

Then proceed with normal diagnostic report using fresh data.

## 📊 Coverage Mode (when MODE=COVERAGE)

**If MODE=COVERAGE, render ONLY this section, then STOP. Do not continue to other modes.**

### Step 1: Extract CLI commands

```bash
cd /Users/playra/trinity-w1 && sed -n '/^pub fn parseCommand/,/^}/p' src/tri/tri_utils.zig | grep -oE '"[a-z][a-z0-9_-]*"' | tr -d '"' | sort -u
```

### Step 2: Extract MCP tools

```bash
cd /Users/playra/trinity-w1 && grep -o '"name":"[^"]*"' tools/mcp/trinity_mcp/server.zig | sed 's/"name":"//;s/"//' | sort -u
```

### Step 3: Duplicate detection

```bash
cd /Users/playra/trinity-w1 && \
echo "=== DELEGATE_CLI ===" && grep -c 'executeTriSimple' tools/mcp/trinity_mcp/server.zig && \
echo "=== DELEGATE_MODULE ===" && grep -cE 'swarm\.\w+\(|cloud_orch\.\w+|chain_engine|needle\.' tools/mcp/trinity_mcp/server.zig && \
echo "=== TOTAL_TOOLS ===" && grep -o '"name":"[^"]*"' tools/mcp/trinity_mcp/server.zig | wc -l
```

### Step 4: GitHub board sync status

```bash
cd /Users/playra/trinity-w1 && \
gh issue list -R gHashTag/trinity --state open --limit 20 --json number,title,labels --jq '.[] | select(.labels[].name == "status:in-progress") | "\(.number) \(.title)"' 2>&1 && \
echo "=== BOARD ===" && gh project item-list 6 --owner gHashTag --format json --limit 50 2>&1
```

### Step 5: Render report

Output a 3-paragraph report:

**P1: Coverage Score** — `{N}` CLI commands, `{N}` MCP tools, `{coverage}%` coverage.

**P2: Gaps & Duplicates** — Top 5 CLI commands without MCP exposure. Top 5 MCP tools without CLI counterpart. Dedup score.

**P3: Board Sync** — Open issues count, in-progress count, board items count, out-of-sync count.

## 🌐 Language System

Before rendering the report, read `.claude/skills/tri/lang.md` to determine the output language.
The file contains `lang: ru` or `lang: en`. Default: `en`.

All section headers, labels, problem descriptions, oracle commentary, and φ-liners
MUST be rendered in the chosen language. Technical terms stay in English.

For the complete translation table, follow `.claude/skills/_shared/language.md`.

---

## Routing to Shared Modules

### IF MODE=COMPACT:
Follow `.claude/skills/_shared/compact_narration.md`. STOP after completion.

### IF MODE=FULL:
1. Follow `.claude/skills/_shared/full_diagnostics.md` — collect all data
2. Follow `.claude/skills/_shared/report_template.md` — render tables and faculty
3. Follow `.claude/skills/_shared/oracle_verdict.md` — oracle, Loop-0, action plan, benchmarks
