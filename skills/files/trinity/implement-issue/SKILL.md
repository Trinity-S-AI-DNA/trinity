---
name: implement-issue
description: Read a GitHub issue, create a branch, implement the solution, and open a PR. Use when given an issue number to implement.
argument-hint: [issue-number]
allowed-tools: Bash(gh *), Bash(git *), Bash(zig *), Bash(cat *), Bash(ls *), Read, Edit, Write, Grep, Glob
---

# Implement GitHub Issue

## Task

Implement issue: $ARGUMENTS

### Steps

1. **Read the issue**
   ```bash
   gh issue view $ARGUMENTS --repo gHashTag/trinity
   ```

2. **Create branch**
   ```bash
   git checkout -b feat/issue-$ARGUMENTS
   ```

3. **Plan implementation**
   - Analyze the issue requirements
   - Identify files to create or modify
   - Check existing code for patterns to follow

4. **Implement**
   - Write code following project conventions (Zig 0.15, `zig fmt`)
   - Every public function needs a test
   - Use allocators explicitly, no hidden allocations

5. **Build and test**
   ```bash
   cd /Users/playra/trinity-w1 && zig build
   cd /Users/playra/trinity-w1 && zig build test
   ```

6. **Commit**
   ```bash
   git add -A
   git commit -m "feat: <description> (closes #$ARGUMENTS)"
   ```

7. **Push and create PR**
   ```bash
   git push -u origin feat/issue-$ARGUMENTS
   gh pr create --title "feat: <title>" --body "Closes #$ARGUMENTS\n\n## Changes\n- ...\n\n## Tests\n- zig build test passes"
   ```

8. **Close issue**
   ```bash
   gh issue close $ARGUMENTS --repo gHashTag/trinity
   ```

### Key Paths
- Source: `src/` (core library), `src/tri-api/` (API client), `src/firebird/` (LLM engine)
- Specs: `specs/tri/*.tri` (VIBEE specifications)
- Tests: inline in each `.zig` file via `test "..." { ... }`
