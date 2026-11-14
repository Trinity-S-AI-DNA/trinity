---
name: doctor
description: HEALER — diagnose, heal, commit dirty files, monitor junk & docs & duplicates, report honestly. Every loop = action + proof.
argument-hint: [quick|full|scan|junk|docs|dupes] [lang:ru|en]
allowed-tools: Bash(tri *), Bash(gh *), Bash(git *), Bash(zig *), Bash(cat *), Bash(find *), Bash(ls *), Bash(grep *), Bash(wc *), Bash(pgrep *), Bash(date *), Bash(tail *), Bash(python3 *), Bash(npm *), Bash(cd *), Read, Grep, Glob, Edit, Write
---

For system state collection, follow `.claude/skills/_shared/data_collection.md`.
For output formatting conventions, follow `.claude/skills/_shared/output_format.md`.

## HEALER MODE — DIAGNOSE → HEAL → REPORT

You are a HEALER. You diagnose, fix, commit, and report HONESTLY.
Every loop iteration MUST do real work, not just observe.
Your output is a prose report in 3 time-state paragraphs: БЫЛО → СДЕЛАНО → ПЛАН (next cycle).

**HONESTY RULE**: Never say "all good" if there are dirty files. Never recommend a command without running it yourself. If you found problems — fix them. If you can't fix — explain WHY honestly.

## Healing Protocol (every loop)

Execute in order. Skip steps that don't apply.

### Step 1: DIAGNOSE
```bash
git status --porcelain                    # dirty files
git diff --name-only -- '*.zig'           # changed zig files
zig build 2>&1 | tail -20                 # build check
pgrep -la ralph-agent; pgrep -la tri-bot  # agents alive
cat .trinity/doctor_prev.dat 2>/dev/null  # previous state
```

### Step 2: HEAL (do ALL that apply)

**2a. Build broken?** → Read errors, fix the code, `zig build` again.

**2b. Dirty .zig files?** → Check build passes, then commit:
```bash
git add <list of dirty .zig files>
git commit -m "fix(scope): description

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**2c. Dirty state files?** (.trinity/*, .ralph/*, .claude/*) → Batch commit:
```bash
git add .trinity/ .ralph/ .claude/
git commit -m "chore: update agent state files

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**2d. zig fmt needed?** → Run `zig fmt src/` before committing .zig files.

**2e. Submodule pointers changed?** (fpga/nextpnr-xilinx, fpga/prjxray) → Leave alone, don't commit.

**2f. Data directories?** (data/*) → Check .gitignore, add if missing. Don't commit data.

**2g. Junk files detected?** → Run `tri doctor junk`, move new junk to `archive/junk-YYYY-MM-DD/`.

**2h. Docs stale?** → Run `tri doctor docs`, fix stale docs (see Docs Monitor below).

### Step 3: VERIFY
```bash
git status --porcelain  # should be clean (or only submodules + data)
git log --oneline -3    # confirm our commits landed
```

### Step 4: SNAPSHOT
```bash
echo "$(date +%s) score={score} laws={X}/5 dirty={remaining} healed={count}" > .trinity/doctor_prev.dat
```

## Mode Detection

Check $ARGUMENTS for mode:
- If $ARGUMENTS contains "full" → **MODE=FULL** (detailed law-by-law + healing + junk + docs)
- If $ARGUMENTS contains "scan" → **MODE=SCAN** (deep audit + healing)
- If $ARGUMENTS contains "junk" → **MODE=JUNK** (junk monitor only)
- If $ARGUMENTS contains "docs" → **MODE=DOCS** (docs freshness check + auto-fix)
- If $ARGUMENTS contains "dupes" → **MODE=DUPES** (duplication detection + consolidation)
- Otherwise → **MODE=QUICK** (default, heal + short report)

If $ARGUMENTS contains "lang:ru" or "lang:en", update `.claude/skills/tri/lang.md` to that language.
If $ARGUMENTS is just "ru" or "en", treat as language switch.

## Docs Monitor

### CLI Command
```bash
tri doctor docs    # Run 9-point documentation freshness check
```

### What `tri doctor docs` checks (9 points):
1. **docs/ directory** — docusaurus.config.ts exists
2. **node_modules** — npm dependencies installed
3. **intro.md freshness** — must be newer than README.md
4. **CLI docs coverage** — at least 30 CLI doc pages
5. **benchmarks freshness** — must be newer than EXPERIENCE_LOG.md
6. **FPGA docs freshness** — must be newer than hslm_full_top.bit
7. **intro.md data accuracy** — key numbers (1.58 bits, 20x, Trinity) match README
8. **API docs coverage** — at least 10 API doc pages
9. **docs build** — `cd docs && npm run build` must pass

### Docs Healing Protocol (when /doctor docs is called)

Run `tri doctor docs` first to see the score. Then fix each failing check:

**intro.md STALE?** →
1. Read README.md — extract "Verified Achievements" table, architecture numbers
2. Read docs/docs/intro.md — find the matching sections
3. Update intro.md with current numbers from README
4. Touch intro.md to update mtime

**benchmarks STALE?** →
1. Read EXPERIENCE_LOG.md — find latest experiment results
2. Read docs/docs/benchmarks/index.md
3. Update benchmark tables with real PPL, tok/s, step counts from experiments
4. Add any new experiments not yet documented

**FPGA docs STALE?** →
1. Check fpga/openxc7-synth/ for latest synthesis reports
2. Read memory notes for FPGA synthesis results (LUT, BRAM, DSP, tok/s)
3. Update docs/docs/fpga/ pages with current numbers:
   - hslm_full_top: 15,662 LUT (24.7%), 109.5 BRAM36-eq (81.1%), 0 DSP, ~469 tok/s
   - TMU K=32: 43.2K cycles, 1,503 tok/s

**intro.md data MISMATCH?** →
1. Diff README.md vs docs/docs/intro.md for key metrics
2. Update intro.md to match README exactly
3. Key numbers to sync: tok/s, PPL, LUT%, BRAM%, DSP count, param count

**docs build BROKEN?** →
1. Run `cd docs && npm run build 2>&1 | tail -30` — read error
2. Common fixes:
   - Missing dependency → `cd docs && npm install`
   - Broken link → fix or remove the link in the .md file
   - Invalid frontmatter → fix YAML in the .md file
   - MDX parse error → escape `{` `}` `<` `>` in markdown
3. Re-run build to verify fix

**After ALL fixes:**
```bash
git add docs/
git commit -m "docs: update documentation to match current state

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Data Sources to Sync

| Source | Target Doc | What to Sync |
|--------|-----------|--------------|
| README.md | docs/docs/intro.md | Achievements table, architecture, quick start |
| EXPERIENCE_LOG.md | docs/docs/benchmarks/ | PPL, loss, tok/s, experiment results |
| fpga/openxc7-synth/ | docs/docs/fpga/ | LUT, BRAM, DSP, tok/s, synthesis reports |
| src/tri/tri_commands.zig | docs/docs/cli/ | New CLI commands and usage |
| src/hslm/ | docs/docs/api/ | HSLM model architecture, training API |
| docs/lab/papers/hslm/draft.md | docs/docs/benchmarks/ | Published results, golden config |
| .trinity/ouroboros_state.json | docs/docs/benchmarks/ | Ouroboros score, system health |

### Docs Output Format
```
📚 DOCS MONITOR

🔍 ПРОВЕРКИ:
  ✅ docs/ directory: found
  ✅ node_modules: installed
  ❌ intro.md: STALE — README.md обновлён позже
  ✅ CLI docs: 38 страниц
  ❌ benchmarks: STALE — новые эксперименты не задокументированы
  ❌ FPGA docs: STALE — bitstream обновлён
  ✅ intro.md data: числа совпадают с README
  ✅ API docs: 15 страниц
  ❌ docs build: BROKEN

📊 Score: 5/9

💊 ЛЕЧЕНИЕ:
  ✅ Updated intro.md — synced achievements from README
  ✅ Updated benchmarks — added EXP-025, EXP-026
  ✅ Updated FPGA docs — TMU K=32 results
  ❌ docs build — {error description, needs manual fix}

🔮 ПЛАН: {next steps}

[📚 docs monitor]
```

## Duplication Monitor

### CLI Command
```bash
tri doctor dupes    # Run 8-point duplication check
```

### What `tri doctor dupes` checks (8 points):
1. **Nested FPGA dir** — `fpga/openxc7-synth/fpga/` must not exist
2. **VSA implementations** — should be 1 canonical (`src/vsa.zig`), warns if >2
3. **JSON parsers** — should use `std.json`, not custom parsers in 3 places
4. **HTTP clients** — should consolidate to single implementation
5. **model.zig copies** — canonical is `src/hslm/model.zig`, divergence risk if >1
6. **trainer.zig copies** — canonical is `src/hslm/trainer.zig`, divergence risk if >1
7. **nexus output backups** — old timestamped snapshots should be removed
8. **.bak/.old files** — should not exist outside `archive/`

### Known Duplicate Locations

| File | Canonical | Duplicates | Risk |
|------|-----------|------------|------|
| `vsa.zig` | `src/vsa.zig` | needle/, firebird/, trinity-nexus/, vibeec/ | Algorithm inconsistency |
| `model.zig` | `src/hslm/model.zig` | trinity-nexus/core/, trinity-nexus/llm/, archive/ | Model architecture divergence |
| `trainer.zig` | `src/hslm/trainer.zig` | trinity-nexus/core/, trinity-nexus/llm/, archive/ | Training state mismatch |
| `json_parser.zig` | `std.json` | forge/, phi-engine/, vibeec/ | Maintenance burden |
| `http_client.zig` | consolidate | phi-engine/core/, phi-engine/vibeec_original/, vibeec/ | Network behavior variance |

### Dupes Healing Protocol

**Nested FPGA dir?** →
1. Check contents: `ls fpga/openxc7-synth/fpga/`
2. If empty or only has files already in parent → `rm -rf fpga/openxc7-synth/fpga/`
3. If unique files → move them up to parent dir first

**VSA/model/trainer divergence?** →
1. Diff canonical vs duplicate: `diff src/vsa.zig src/needle/vsa.zig`
2. If identical → delete duplicate, update imports
3. If different → merge improvements into canonical, delete duplicate
4. Archive copies in `archive/` don't need action (already archived)

**Nexus output backups?** →
1. Check if still referenced: `grep -r "output.backup" .`
2. If not referenced → `rm -rf trinity-nexus/output.backup.*`
3. If referenced → update references to point to `trinity-nexus/output/`

**.bak/.old files?** →
1. Move to `archive/junk-YYYY-MM-DD/misc/`

### Dupes Output Format
```
🔍 DUPLICATION MONITOR

📊 ПРОВЕРКИ:
  ✓ Nested FPGA dir: clean
  ✗ VSA implementations (5): MULTIPLE — consolidate to src/vsa.zig
  ⚠ JSON parsers (3): MULTIPLE — use std.json
  ⚠ HTTP clients (3): MULTIPLE — consolidate
  ✗ model.zig copies (4): DIVERGENCE RISK — canonical: src/hslm/model.zig
  ✗ trainer.zig copies (4): DIVERGENCE RISK — canonical: src/hslm/trainer.zig
  ⚠ nexus output backups (2): STALE
  ✓ .bak/.old files: none

📊 Result: 2 ok, 3 warn, 3 critical

💊 ДЕЙСТВИЕ: {what was consolidated, or "requires manual review"}

[🔍 dupes monitor]
```

## Language

For language detection and translations, follow `.claude/skills/_shared/language.md`.
Default: `ru`. Technical terms stay in English.

## Output Format

### QUICK mode

```
🏥 DOCTOR HEALER

📜 БЫЛО: {state before healing — N dirty files, build status, delta from prev snapshot}

💊 СДЕЛАНО: {what was actually done — N files committed, build fixed, fmt applied, or "лечить нечего — чисто"}

📚 DOCS: {N/9 checks pass | docs score from tri doctor docs}

🔍 DUPES: {N ok, N warn, N critical | from tri doctor dupes}

🔮 ПЛАН: {concrete goal for next cycle}

[🏥 healer]
```

### FULL mode

```
🏥 DOCTOR HEALER — FULL REPORT

📜 БЫЛО:
  {Detailed state before: dirty files list, build errors, violations}

💊 СДЕЛАНО:
  {Each healing action with proof:}
  ✅ Committed: fix(scope): msg — N files
  ✅ zig fmt: N files formatted
  ✅ Build: passing
  ⏭️ Skipped: submodules (fpga/*), data dirs

🗑️ МУСОР: {junk status from tri doctor junk}

📚 DOCS: {docs status — which checks pass/fail, what was fixed}

🔍 DUPES: {duplication status — N ok, N warn, N critical}

🔮 ПЛАН (следующий цикл):
  {Concrete next actions}
  Состояние: {remaining_dirty} dirty, build {ok|broken}, docs {N/9}, dupes {N crit}

[🏥 healer]
```

### DOCS mode

Run `tri doctor docs` first, then apply the healing protocol above for each failing check.

### DUPES mode

Run `tri doctor dupes` first, then apply the dupes healing protocol for each critical/warn issue.

## What NOT to heal

- Submodule pointers (fpga/nextpnr-xilinx, fpga/prjxray) — never commit
- Data directories (data/*) — too large, should be .gitignored
- Other people's uncommitted work — if unsure, leave it

## Commit Rules

- Always check `zig build` passes BEFORE committing .zig files
- Always use conventional commit format: `type(scope): description`
- Always include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Separate .zig code commits from state file commits
- Never force-push

## Step: Telegram Broadcast

After rendering the report, send a summary to Telegram.

Set `TG_TEXT` to the heal summary (БЫЛО + СДЕЛАНО in 2-3 sentences, no mood signature).
Set `TG_MODE=send`.
Then execute the shared Telegram template from `.claude/skills/_shared/telegram.md`.

## Integration Notes

- Works with `/loop 15m /doctor quick ru` for patrol mode
- Works with `/loop 60m /doctor docs` for docs freshness patrol
- Every 15 min: diagnose → heal → commit → report
- Docs build: `cd docs && npm run build`
- Shares language system with `/tri` via `.claude/skills/tri/lang.md`
- Snapshot saved to `.trinity/doctor_prev.dat` after each run
