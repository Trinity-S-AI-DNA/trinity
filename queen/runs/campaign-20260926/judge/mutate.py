#!/usr/bin/env python3
"""Queen WARS review: does an arm's NEW test catch a fixed set of mutants?

Usage: mutate.py <issue> <worktree> <new-test-name> <transcript-out>

For each mutant of the function under test (fixed per issue, the same for
every arm), rewrite the arm's patched spec, run `t27c test-report --verbose`,
and record whether the arm's new test FAILs (killed), passes (survived) or
the spec does not build (blocked). The arm's file is restored byte-for-byte
after every mutant, and the restore is checked.
"""
import os
import subprocess
import sys

PATH = "/home/user/wars/judge:/home/user/tools/bin:" + os.environ["PATH"]

MUTANTS = {
    "4614": ("specs/boards/arty_a7.t27", [
        ("return NUM_BUTTONS + 1", "fn count_buttons() -> usize {\n        return NUM_BUTTONS;",
         "fn count_buttons() -> usize {\n        return NUM_BUTTONS + 1;"),
        ("return 0", "fn count_buttons() -> usize {\n        return NUM_BUTTONS;",
         "fn count_buttons() -> usize {\n        return 0;"),
        ("return NUM_LEDS - 1", "fn count_buttons() -> usize {\n        return NUM_BUTTONS;",
         "fn count_buttons() -> usize {\n        return NUM_LEDS - 1;"),
    ]),
    "4695": ("specs/fpga/testbench/simulator_tb.t27", [
        ("cycle += 2", "        sim_cycle = sim_cycle + 1;\n    }\n\n    fn reset",
         "        sim_cycle = sim_cycle + 2;\n    }\n\n    fn reset"),
        ("clock ends low", "        clk = false;\n        clk = true;\n        sim_cycle = sim_cycle + 1;",
         "        clk = true;\n        clk = false;\n        sim_cycle = sim_cycle + 1;"),
        ("no cycle advance", "        sim_cycle = sim_cycle + 1;\n    }\n\n    fn reset",
         "        sim_cycle = sim_cycle;\n    }\n\n    fn reset"),
        ("tick also counts an event", "        sim_cycle = sim_cycle + 1;\n    }\n\n    fn reset",
         "        sim_cycle = sim_cycle + 1;\n        events_processed = events_processed + 1;\n    }\n\n    fn reset"),
    ]),
    "4613": ("specs/base/ternary_encoding.t27", [
        ("never rejects", "            if (!is_valid_trit(trits[i])) {\n                return false;",
         "            if (false) {\n                return false;"),
        ("checks only the first slot", "fn validate_trits(trits: []i32, len: usize) → bool {\n        var i : usize = 0;\n        while (i < len) {",
         "fn validate_trits(trits: []i32, len: usize) → bool {\n        var i : usize = 0;\n        while (i < 1) {"),
        ("skips the last slot", "fn validate_trits(trits: []i32, len: usize) → bool {\n        var i : usize = 0;\n        while (i < len) {",
         "fn validate_trits(trits: []i32, len: usize) → bool {\n        var i : usize = 0;\n        while (i + 1 < len) {"),
        ("rejects everything", "            i = i + 1;\n        }\n        return true;\n    }\n\n    // ═",
         "            i = i + 1;\n        }\n        return false;\n    }\n\n    // ═"),
    ]),
}

# Pre-existing blockers in ternary_encoding.t27 at afe2186c, outside #4613's
# boundary: two comptime invariants that fail (balanced encoders, unipolar
# decoders) and two tests that discard a return value. Removed only in the
# review copy, so an arm's new test can be run at all.
DEBLOCK = {"4613": ["invariant byte_trits_roundtrip", "invariant bits_trits_roundtrip",
                    "test byte_to_trits_roundtrip", "test char_encoding_roundtrip"]}


def deblock(text, names):
    out, skip = [], False
    for line in text.split("\n"):
        head = line[4:] if line.startswith("    ") and not line.startswith("     ") else None
        if head is not None or line.startswith("}"):
            skip = head is not None and any(head == n or head.startswith(n + " ")
                                            for n in names)
        if not skip:
            out.append(line)
    return "\n".join(out)


def main():
    issue, wt, test_name, out = sys.argv[1:5]
    source = sys.argv[5] if len(sys.argv) > 5 else None   # arm file to review in wt
    spec, mutants = MUTANTS[issue]
    path = os.path.join(wt, spec)
    if source:
        text = deblock(open(source).read(), DEBLOCK[issue])
        open(path, "w").write(text)
    original = open(path, "rb").read()
    lines, killed = [f"# mutation review: gHashTag/t27#{issue}, new test `{test_name}`"
                     + (f" (de-blocked copy of {source})" if source else ""), ""], 0
    if source:
        r = subprocess.run(["bash", "-c", f"t27c test-report --verbose {spec} 2>&1"],
                           cwd=wt, env=dict(os.environ, PATH=PATH),
                           capture_output=True, text=True, timeout=900)
        lines += ["## unmutated de-blocked copy", r.stdout.strip(), ""]
    for label, old, new in mutants:
        text = original.decode()
        if text.count(old) != 1:
            lines.append(f"## {label}: SKIPPED (anchor not unique: {text.count(old)})")
            continue
        try:
            open(path, "w").write(text.replace(old, new))
            r = subprocess.run(["bash", "-c", f"t27c test-report --verbose {spec} 2>&1"],
                               cwd=wt, env=dict(os.environ, PATH=PATH),
                               capture_output=True, text=True, timeout=900)
            rep = r.stdout
        finally:
            open(path, "wb").write(original)
        assert open(path, "rb").read() == original, "restore failed"
        if "BLOCKED" in rep:
            verdict = "blocked"
        elif f"FAIL  {test_name}" in rep:
            verdict, killed = "killed", killed + 1
        elif f"pass  {test_name}" in rep:
            verdict = "survived"
        else:
            verdict = "not-run"
        lines += [f"## {label}: {verdict}", rep.strip(), ""]
    lines.append(f"# MUTANTS KILLED BY THE NEW TEST: {killed}/{len(mutants)}")
    open(out, "w").write("\n".join(lines) + "\n")
    print(f"#{issue} {os.path.basename(wt)}: {killed}/{len(mutants)} killed -> {out}")


if __name__ == "__main__":
    main()
