# Ternary storage search: not run — a ruler stopped it

Pre-registration: `specs/numeric/ternary_storage_search.t27` (sha256 `f5653560…aa540d`),
written at 10:17Z before any arm ran, compiled by the t27 compiler with 10 test blocks and 70
asserts, 0 failures. The parameters are generated from it (`conformance/ternary_storage_from_spec.mjs`,
`--check`: same). Runner: `research/block/ternary_storage_search.py`. Log and record:
`ternary_storage_search.log`, `ternary_storage_search.json`.

## What happened

The spec makes the runner reproduce three numbers from main before any claim arm runs, and stop if
one of them misses by more than 0.01 perplexity (`RULER_TOL_E4 100`). One missed.

| ruler (test split, 40 windows) | main | this run | \|diff\| | within 0.01 |
|---|---:|---:|---:|:---:|
| BASE, unquantised | 14.4874 | 14.4869 | 0.0005 | yes |
| MXFP4 E2M1, rule B | 21.9397 | 21.9353 | 0.0044 | yes |
| TNF4_7, rule B | 36.7214 | 36.7612 | **0.0398** | **no** |

The runner stopped at 10:25:37Z, as the spec says it must. **No dev arm and no claim arm ran.
There is no verdict on the trit-cell axis, in either direction.** The spec permits one retry, and
only for a crash before the first arm. Three arms had finished, so there is no retry. Nothing was
re-run, and the tolerance was not changed after the fact.

## Why it missed (diagnosis; no arm was re-run for it)

- **The harness is the same.** The levels match block_tnf's own `tnf_levels(4, 1)`, down to the
  last bit: 2/12 and 0.25/1.5 both round to the same double. `quant`, `q_e8m0_t` and `perplexity`
  are block_tnf.py's own definitions, executed from its pinned bytes. Weights are restored from a
  clone before each arm. Both quantised arms saw the same scale range: k in [-5, 4], no all-zero
  blocks.
- **The text is the same.** The test text's sha256 `696cca6b…fae83` is the one in main's
  `research/block/MANIFEST.json`.
- **The machine is not.** Main reproduced these numbers to four decimals on its own machine
  (`ROTATION_VERDICT_2026-08-11.md`). This run used a different Mac with torch 2.11.0 and
  transformers 4.57.6. Main records no library versions. The drift grows with how much quantisation
  noise the model carries:

  | arm | relative drift |
  |---|---:|
  | BASE | 0.003 % |
  | MXFP4 | 0.020 % |
  | TNF4_7 | 0.108 % |

  That pattern fits a forward pass whose float accumulation order differs, amplified by a noisier
  model. **This is the leading hypothesis, not a finding.** Confirming it would take the same arm on
  main's machine, or the same arm under main's library versions. Neither was done.

## What this says about the pre-registration

The rulers had two jobs: catch a broken harness, and tie this run to main's numbers. On one machine
both jobs are the same thing. Across machines they are not. An absolute 0.01 tolerance is tighter
than this environment reproduces a 36-perplexity arm. The claim itself compares arms within one run
on one machine, so it would not have been hurt by the drift. The spec did not separate the two jobs,
and the stop is the price of that.

There are two honest ways forward. Both need the owner's yes, because either one is a second
attempt:

1. **Same spec, unchanged, on the machine main was measured on.** Its rulers are known to
   reproduce there.
2. **A new pre-registration, v2.** It first runs a calibration on this Mac, rulers only, and
   publishes those numbers. Only then does it run the claim arms against them. The tolerance must
   be fixed before the calibration is seen. Choosing it after this stop would be fitting.

## What stands regardless

These hold without any claim arm:

- **TNF4_7 plus the 1/12 code is E2M1, bit for bit in float64.** The runner checked this: `True`.
- **The storage arithmetic** is compiler-checked by the spec's test blocks:
  - per 32-element block, 101 trits against 102;
  - packed densely, MXFP4 fits in 86 trits, which is fewer than 101;
  - a 3-trit cell carries 4.75 bits against MXFP4's 4.

  Any win on this axis would be a win of the substrate, not of the level shape. The spec says so
  before the run, and this stop changes none of it.
- **A descriptive observation, not a claim.** Both quantised arms needed only k in [-5, 4]. That is
  10 scale values, which fit in 3 trits as well as in 5. It is one model under one rule. E8M0 could
  shrink the same way, so on its own it is no ternary advantage.

## Settled on main, cited and not re-run

- The phi^k scale: `scale_control`, `scale_settled`, `scale_equalbits`, `ACCOUNTING`.
- The MXFP4 scale convention: `MXFP4_SCALE_CONVENTION`, `SCALE_PHASE_THEOREM`.
- The eighth and sixteenth codeword: `THE_WEIGHT_SIDE_IS_CLOSED`.

Nothing here is published beyond this repository. The TNF paper stays closed.
