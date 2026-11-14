---
name: review-code
description: Review recent code changes for bugs, style issues, and improvements. Use after writing code or before committing.
argument-hint: [file-or-branch] (optional)
allowed-tools: Bash(git *), Bash(zig *), Read, Grep, Glob
model: sonnet
---

# Code Review

## Task

Review: $ARGUMENTS

### Steps

1. **Identify changes to review**
   - If a file path is given: review that file
   - If a branch is given: `git diff main...$ARGUMENTS`
   - If empty: review uncommitted changes via `git diff` and `git diff --cached`

2. **Check for bugs**
   - Memory leaks: every `alloc` must have a matching `free` or `defer`
   - Null/undefined access: check all optional unwraps
   - Error handling: are errors propagated or silently ignored?
   - Off-by-one: check loop bounds and slice indices

3. **Check Zig 0.15 correctness**
   - `const` vs `var`: use `const` unless the variable is mutated
   - `std.ArrayList(u8).empty` pattern (not `.init(allocator)`)
   - Allocator passed to methods, not stored redundantly
   - No `@import` of files outside the module

4. **Check style**
   - Run `zig fmt --check` on changed files
   - Public functions have tests
   - No dead code or unused imports

5. **Check security**
   - No command injection in bash tool execution
   - No path traversal in file operations
   - API keys not hardcoded or logged
   - Permission checks before destructive operations

6. **Report**
   - List issues found with file:line references
   - Severity: CRITICAL / WARNING / STYLE
   - Suggest specific fixes for each issue
