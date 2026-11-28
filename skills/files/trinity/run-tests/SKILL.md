---
name: run-tests
description: Build the project, check for warnings, run all tests, and report results. Quick health check for the codebase.
argument-hint: [module] (optional - all, vsa, vm, bsd, hslm, tri-api)
allowed-tools: Bash(zig *), Bash(cat *), Bash(ls *), Read, Grep, Glob
model: haiku
---

# Build & Test

## Task

Run tests for: $ARGUMENTS

### Steps

1. **Build**
   ```bash
   cd /Users/playra/trinity-w1 && zig build 2>&1
   ```
   - Check for warnings and errors
   - Report any compilation issues

2. **Run tests**
   | Argument | Command |
   |----------|---------|
   | all / empty | `zig build test` |
   | vsa | `zig test src/vsa.zig` |
   | vm | `zig test src/vm.zig` |
   | bsd | `zig test src/bsd/verify_bsd.zig` |
   | hslm | `zig test src/hslm/model.zig` |
   | tri-api | `zig test src/tri-api/main.zig` |
   | single file | `zig test src/<file>.zig` |

3. **Parse results**
   - Count pass/fail
   - If failures: read the failing test source, identify root cause
   - Check for memory leaks (test allocator reports)

4. **Format check**
   ```bash
   zig fmt --check src/ 2>&1
   ```

5. **Report**
   - Build status: OK / FAIL
   - Tests: N passed, M failed
   - Format: clean / N files need formatting
   - If any failures: specific error details and suggested fixes
