#!/usr/bin/env python3
"""Queen WARS acceptance judge: run an issue's own acceptance commands in a worktree.

Usage: accept.py <issue> <worktree> <transcript-out>

Runs every acceptance criterion exactly as the issue states it, from the
worktree root, with the judge t27c and zig 0.16.0 on PATH, and writes a
transcript: command, raw output, expected value, pass/fail. Then two review
checks the issue's requirements name (FR-002 parse, vacuity) and the spec's
own test-report summary. Exit 0 iff every acceptance criterion passes.
"""
import datetime
import os
import subprocess
import sys

JUDGE_PATH = "/home/user/wars/judge:/home/user/tools/bin"

SPECS = {
    "4614": ("specs/boards/arty_a7.t27", 5, 18, True),
    "4695": ("specs/fpga/testbench/simulator_tb.t27", 4, 7, True),
    "4613": ("specs/base/ternary_encoding.t27", 13, 11, False),
}


def sh(cmd, cwd):
    env = dict(os.environ, PATH=JUDGE_PATH + ":" + os.environ["PATH"])
    p = subprocess.run(["bash", "-c", cmd], cwd=cwd, env=env,
                       capture_output=True, text=True, timeout=900)
    return (p.stdout + p.stderr).strip()


def main():
    issue, wt, out = sys.argv[1], sys.argv[2], sys.argv[3]
    spec, n_fn, min_tests, has_c5 = SPECS[issue]
    crit = [
        ("1", f"t27c coverage {spec} 2>&1 | grep -cE '^Untested: +0$'", lambda o: o == "1", "1"),
        ("2", f"grep -cE '^[[:space:]]*(pub[[:space:]]+)?fn[[:space:]]' {spec}",
         lambda o: o == str(n_fn), str(n_fn)),
        ("3", f"grep -cE '^[[:space:]]*test[[:space:]]+(\"|[A-Za-z_])' {spec}",
         lambda o: o.isdigit() and int(o) >= min_tests, f">= {min_tests}"),
        ("4", f"t27c spec-status {spec}", lambda o: "IMPLEMENTED" in o.split(), "IMPLEMENTED"),
    ]
    if has_c5:
        crit.append(("5", f"t27c test-report {spec} 2>&1 | grep -c BLOCKED",
                     lambda o: o == "0", "0"))
    lines = [f"# Queen WARS acceptance transcript: gHashTag/t27#{issue}",
             f"# worktree: {wt}",
             f"# head: {sh('git rev-parse HEAD', wt)}",
             f"# judge: {sh('t27c --version', wt)}; zig {sh('zig version', wt)}",
             f"# at: {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
             f"# diff --numstat: {sh('git diff --numstat', wt) or '(no change)'}",
             ""]
    ok_all = True
    for n, cmd, ok, want in crit:
        o = sh(cmd, wt)
        passed = ok(o)
        ok_all &= passed
        lines += [f"## criterion {n}: {'PASS' if passed else 'FAIL'} (expected {want})",
                  f"$ {cmd}", o, ""]
    for label, cmd in (("review FR-002 parse", f"t27c parse {spec} >/dev/null 2>/tmp/t27c_parse_err; echo exit=$?; head -3 /tmp/t27c_parse_err"),
                       ("review vacuity", f"t27c validate-vacuity --specs-dir {os.path.dirname(spec)} --top 500 2>&1 | grep -F {os.path.basename(spec)} || echo \"{os.path.basename(spec)}: not listed as vacuous\""),
                       ("review test-report", f"t27c test-report {spec} 2>&1 | tail -15")):
        lines += [f"## {label}", f"$ {cmd}", sh(cmd, wt), ""]
    lines.append(f"# ACCEPTANCE: {'PASSED' if ok_all else 'FAILED'}")
    open(out, "w").write("\n".join(lines) + "\n")
    print(f"#{issue}: {'PASSED' if ok_all else 'FAILED'} -> {out}")
    return 0 if ok_all else 1


if __name__ == "__main__":
    sys.exit(main())
