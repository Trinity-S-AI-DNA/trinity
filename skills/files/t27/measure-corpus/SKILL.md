---
id: measure-corpus
name: MEASURE THE CORPUS
description: Pick the right instrument for a claim about the t27 spec corpus, and avoid the specific traps that have produced wrong published numbers. Use before quoting any figure about specs, errors, or gates.
---

# Measure the corpus

Every wrong number published from this repo came from an instrument answering
a different question than the one asked. This lists which tool answers which
question, and the traps each one has actually sprung.

## Which instrument answers which question

| Claim | Instrument | Not this |
|---|---|---|
| "It is syntactically valid" | `zig ast-check` — `formal/zig_emit_scan.py` | — |
| "It compiles and its tests run" | `zig test` — `formal/zig_run_scan.py` | ast-check. 29 of 40 ast-check-VALID specs failed `zig test` |
| "This one spec is fixed" | `formal/check_one_spec.py <path>` | the corpus scan (slow, and hides the single result) |
| "The harness itself still works" | `formal/harness_selfcheck.py` | any green number the harness produced |
| "The parser actually read the spec" | `formal/spec_parse_gate.py` | "parses OK" |
| "This Python script will run in CI" | import it under the OLDEST python3 | `py_compile` — see below |
| "Every layer of this spec is fine" | `bindings/wasm-explorer` — `node scan.mjs` | any single-layer check. It runs the real compiler over the corpus and reports tokens, AST, typecheck, HIR and all five backends per spec |
| "The generated Verilog is real hardware" | `bindings/wasm-explorer` — `node synth_sweep.mjs` (yosys `synth_xilinx`) | "the verilog backend returned ok". Emitting text and synthesising are different claims — see below |
| "What did the parser silently drop?" | `parse_ast_full` (the wasm bridge uses it) | `parse_ast` / `t27c ast-dump`, which report a clean parse for a file they gutted |

**The rungs are parse < import < run, and each passes what the next rejects.**
`py_compile` declared 47 of 47 `formal/` scripts fine while one crashed at
import on `str | None` (valid syntax in 3.9, fails when the `def` executes).

## Before quoting a number

1. **Check the binary is newer than the source.** `stat -f '%Sm' target/release/t27c`
   against the file you edited. A build behind a filter pipeline
   (`cargo build … | grep … | head`) reports the LAST STAGE's exit code — a
   failed build has been announced as exit 0 with an empty log, and the old
   binary then answers every question you ask it.
2. **Never diff totals alone.** 588 → 586 is compatible with two specs
   improving while two regress. Diff PER SPEC: `formal/spec_error_delta.py`,
   or run the scan with `--json` under both binaries and compare keys.
   Watch `valid LOST` specifically, not just the total.
3. **A first-error histogram undercounts.** A spec stops at its first parse
   error, so its true error count is unknown and higher. `zig_emit_scan.py`
   reports how many are "behind a wall" — quote that alongside the total.
4. **Distinguish "measured zero" from "did not measure."** They print the same.

## Traps that have actually fired

- **`specs/` is not the corpus.** Globbing `specs/` gives 497 files; the repo
  holds 668 once `chips/` (147) and `compiler/` (16) are counted, excluding
  `.git/` and `.claude/` (git worktrees — duplicate checkouts of files already
  counted, ~1600 of them, and counting those instead inflates to 2293). The
  gap is not cosmetic: widening the scan moved typecheck failures 60 → 149 and
  content-losing specs 49 → 78, and took backend rejections from **0 to 6**.
  All six live in `chips/`, so a `specs/`-only scan reported a corpus with no
  backend failures at all. State the glob next to any corpus number.
- **A successful parse can be a gutted file.** `parse_ast` (and therefore
  `t27c ast-dump`) reports success while error recovery discards declarations.
  78 of 668 specs lose content this way. `api/c_api_contract.t27` drops 25
  declarations and 50 characters, and its generated Verilog says
  `module unknown (` because the `module` line was among them. Use
  `parse_ast_full`, which returns `(ast, discarded, swallowed, lexer_discarded)`,
  and quote the drop counts beside any "parses OK".
- **Health classes that do not sum are not classes.** Loss, typecheck errors
  and backend rejection overlap; adding them gives 233 against a 668 corpus and
  invites the reader to subtract and get a wrong "clean" figure. Count each
  spec ONCE at its worst stage — 453 ok + 209 warn + 6 fail = 668 — and make
  the total visible so the arithmetic can be checked.
- **`yosys -q` silences `stat`, and a silenced tool reads as zero.** A sweep
  reported "361 designs synthesised, 0 cells, 0 LUTs, 0 FFs" — which looks like
  a finding ("the backend emits no logic") and is actually a gagged instrument.
  The counts are also printed COUNT-first (`8   LUT2`), so a `name\s+count`
  regex matches nothing even when the report is present. Two independent ways
  to read zero, neither of them about the corpus. `synth_sweep.mjs` now runs a
  known-good adder first and refuses to measure anything if it does not come
  back non-zero (24 LUTs / 27 FFs). **A zero is only evidence once something
  known-nonzero has proved the instrument can see.**
- **A pattern defines its own scope.** A grep used to count a defect always
  reports itself complete. Counting the text `union:` gave 6 blocks and 27
  payloads; 4 blocks were a FUNCTION named `union` (indent 2, with `params:`)
  and 12 payloads were its parameters. Count by STRUCTURE — where does the key
  sit, what is under it — not by shape. This has fired four times.
- **Basename matching invents phantoms.** A cross-check paired `http.t27` with
  `server/http.t27` and reported a missing declaration that was never missing.
  Match on full relative paths.
- **Typed JSON fields arrive as strings.** `count` comes back as `"1"`; two
  iterations of per-spec deltas compared `'2' > '14'`. `int()` at the parse
  boundary.
- **The build cache can grade deleted code.** A harness whose entry file
  depends only on a PATH lets Zig answer a new run from an old one. The
  symptom is a number that does not MOVE, not a number that looks wrong.
  Both existing harnesses now isolate or content-key their cache;
  `harness_selfcheck.py` is the gate that proves it, with a negative control
  that must MISS.
- **A gate that cannot run is the decoration it was written to prevent.**
  Before trusting any CI gate, check in order: is the workflow ON THE DEFAULT
  BRANCH (`gh api repos/OWNER/REPO/actions/workflows` — absent means it has
  never run, not that it ran and passed); is each tool installed in that job;
  is it installed BEFORE the step; does the version match the numbers you
  published. `formal-yosys.yml` and `formal-mutation.yml` failed all four.

## Disk

The run scan and the self-check each emit the whole corpus and compile it.
Free space has gone under 1 GB three times. Before a corpus-wide run:

```bash
df -h /
```

Under ~1.5 GB, reclaim only what a command restores — `target/` directories,
`/tmp/t27_*` caches — and never a `build/` or a worktree you have not
inspected. Both harnesses now sweep their own caches at startup as well as on
exit, because `finally` does not run when a job is killed, and a job that
compiles the whole corpus is exactly the one a supervisor kills when disk is
tight.
