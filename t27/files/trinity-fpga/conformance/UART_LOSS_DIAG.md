# UART loss diagnostic, AX7203 node, 2026-09-27

Pre-registered in `specs/trinet/uart_loss_diag_ax7203.t27` (sha256 `5d8587dd…`,
commit fba399547) before either arm ran. The runner is
`conformance/uart_loss_diag_ax7203.py`, and its parameters are generated from
the spec by `conformance/uart_loss_diag_from_spec.mjs`. The harness
`tern_tc_layer_ax7203.py` and its PASS criterion were not changed. Its bytes
are pinned and checked before each arm.

The diagnostic counts losses; it does not pass or fail. It never uses the
words the harness reserves for a full pass. An answer is "accepted" when
three things hold:

- the magic byte, status and node id are right;
- the nonce is in flight;
- the SipHash tag verifies under that job's key, and `y` equals the host's
  expected value.

## Result

| | window 64 | window 24 |
|---|---:|---:|
| bytes in flight | 1216 | 456 |
| log | `board_runs/uart_loss_w64.log` | `board_runs/uart_loss_w24.log` |
| start / end (UTC) | 11:27:26 / 11:34:32 | 11:35:12 / 11:42:21 |
| jobs sent | 2,016,000 | 2,016,000 |
| answers accepted (tag + y) | 2,015,426 | 2,016,000 |
| wrong y under a valid tag | 0 | 0 |
| answers lost | 574 | 0 |
| loss events | 121 (119 bytes, 2 whole frames, 0 unresolved) | 0 |
| rate, exact Poisson 95 % | 49.8–71.7 per 10^6 jobs (1 in 16,661) | 0–1.83 per 10^6 jobs |
| hole sizes | 3–417 B, median 62 | — |
| longest host pause | 40.9 ms | 96.4 ms |
| elapsed | 424.3 s | 427.5 s |
| instrument check | ok | ok |

The comparison is `uart_loss_diag_ax7203.py --compare`. It gives P[X ≥ 121 |
n = 121, 1/2] = 3.8e-37, below the 1/100 threshold, so
**CLAIM_W64_WORSE: yes.** This is the only claim the spec allows.

## Predictions, checked

- **PRED_BUFFER held.** The 512-byte CP2102N receive-buffer explanation
  predicted this pattern: W24 has 0 events with hole > 0, and W64 has at least 1.
  - A second check was not written in advance, so it counts as consistent only,
    not as a test. If the buffer overruns, a hole can be at most
    1216 − 512 = 704 bytes. The largest hole was 417 bytes.
  - It also fits the earlier single-run edges:
    - W26 (494 B) passed and W30 (570 B) failed;
    - 512 / 19 = 26.9, so 26 is the largest window that fits the buffer.
- **PRED_RATE failed.** The prediction was about 10 events, with 1–30
  unsurprising. There were 121, twelve times the prediction.
  - The prior was one event in 189,001 jobs, from a run on the same Genesys
    path at 09:35Z. One event is weak evidence, and the spec says so.
  - Host load differed: the load average was about 30 on 8 cores during
    both arms, with sysmond at 99 % CPU. It was not measured at 09:35Z.
- **Events are not Poisson.**
  - Counts per 100,800-job bin have variance/mean 1.86.
  - 28 of 120 gaps are shorter than 1000 jobs, where 7 would be expected.
  - The losses come in bursts, for example seven events between jobs
    983,923 and 988,369. That fits pauses on the host side.
  - The Poisson interval above assumes independent events, so it is
    **too narrow**. Read it as a lower bound on the uncertainty.

## What it says and does not say

**It says:**

- On this USB path (a Genesys hub 05e3:0610 at 0x00110000) and this host,
  with more answer bytes in flight than the 512-byte buffer holds, the link
  loses bytes about once per 17,000 jobs.
- With fewer bytes in flight than the buffer holds, it lost none in
  2,016,000 jobs.
- Window 24 costs no throughput: both arms took ≈ 425 s. The request
  direction is the bottleneck. On the wire it takes 24 B × 10 bit at
  1,142,857 baud × 2,016,000 = 423.4 s.
- No compute error showed up: 4,031,426 tagged answers, 0 wrong y.

**It does not say:**

- It does not show that the buffer is the cause. The pattern fits the
  buffer, but nothing proves it.
- Nothing about other hosts, hubs or a hub-free path.
- Nothing about any harness run or its PASS.

## Conditions recorded

- **USB clients.** `tri fpga-ioclients`, and the header of each log:
  - 57 IOKit user clients on the CP2102N, of which 56 belong to
    FwUpdateManagerd (pid 1713, Pioneer's firmware updater) and 1 to
    BrowserOS neo.
  - At 11:26:40Z, before arm 0, four orphaned headless BrowserOS instances
    were ended with SIGTERM; they held one client each.
  - FwUpdateManagerd was left running. It was not tested as a factor.
- **Node.** trinet_node0 from the CI artifact, loaded at 08:49Z. It already
  held a key (setkey answered 0x03), and every accepted tag verified under
  it.
- **Checks.** Key-check: 0 hits in both logs. Log sizes: 16,726 B and
  1,390 B.

## Consequence for the harness

The harness's PASS criterion is unchanged.

- For long runs on this path, use a window of 26 or less. Window 24 has 3
  full passes on record and these 2,016,000 jobs.
- Windows above 26 add no throughput here and do lose data.
- Changing the harness default would change the harness, so it needs the
  owner's decision.
