import type { Block } from '../types'

// Numbers here come from the benchmark comments on gHashTag/t27#7851 (2026-10-08 and 2026-10-09), the merged
// runtime PRs gHashTag/trios#1698, #1702, #1716, #1720, #1722, #1723, #1724, #1725 and the merged spec PRs
// gHashTag/t27#8272, #8275, #8278, #8281, #8282, #8285, #8286, #8292, #8306, gHashTag/trios#1726 (the simulation gate) #1730 (the merge into production) and #1746 (the cost profile). The production readings come from the trios-agent-server logs of 2026-10-10 and the t27#7851 comments; the silicon run is bench job t27#8858. The FPGA figures are yosys 0.63 synthesis
// of specs/queen/actors.t27 at t27 b9e62161d4; their provenance is in gHashTag/trinity#1582. The recording
// public/term/t27c-queen-netlink-fence/ was made on 2026-10-09 with t27c 0.5.0 against t27 c6237a7.

const CAST = {
  src: 'term/t27c-queen-netlink-fence/session.cast',
  share: 'https://t27.ai/term/t27c-queen-netlink-fence/',
}

export const body: Block[] = [
  {
    kind: 'p',
    text: 'On one seeded input, the Queen\'s actor runtime beats the old polling loop where work goes wrong: the worst recovery after a crash or a hang falls from 1181 s to 27 s, and under overload it finishes 18.7% more reviews. It does not beat the loop everywhere. On 2026-10-09 seven changes from a competitor study landed on the integration branch `actors-next`, each with a t27 spec, tests and a benchmark against the code it would replace. Two of them lose in cases we can name, one gives back throughput on purpose, and most of the dispatcher\'s gain turned out to come from a plain time limit, not from actors. The new simulation gate found a real runtime bug on its first runs. Each new behaviour sits behind a flag that is off by default, and the bug fixes need none. None of it runs in production yet.',
  },
  {
    kind: 'p',
    text: 'Two kinds of number appear below, and each is labelled. **Simulated** means a seeded run on a virtual clock, with fault rates and task lengths that are assumptions. **Measured** means real OS processes, a real PostgreSQL 16 or a real synthesis tool.',
  },
  { kind: 'h', text: 'The Queen, and the rule it is held to' },
  {
    kind: 'p',
    text: 'The Queen is the scheduler of the t27 agent swarm. It hands GitHub issues to worker agents, called bees, reviews their pull requests and runs release jobs. Since 2026-10-08 the owner\'s rule is that every concurrent part of it becomes an actor, with a pid, a mailbox and a supervisor, and that no loop is swapped out before an MVP, its tests and a benchmark on the same input have been posted (t27#7851). Every decision the runtime takes is a call into a compiled t27 spec, the "card". The TypeScript host keeps state and does I/O, nothing more.',
  },
  { kind: 'h', text: 'Where we started: a win in simulation, a hot loop in production' },
  {
    kind: 'p',
    text: 'The first actor domain was the pull-request reviewer (trios#1698). The workload had Poisson arrivals, 5% of attempts crashing and 2% hanging for 30 minutes, over 7 simulated hours. With no faults the loop and the actors tie: done p95 is 319 s against 309 s. With faults the actors cut done p95 from 553 s to 384 s and the worst recovery from 1181 s to 27 s. At 120 arrivals an hour they finish 565 of 660 rows against 476. A message costs 3.7 us on a ring of 1000 actors. [simulated]',
  },
  {
    kind: 'p',
    text: 'Production then showed what the simulation had not modelled. The actor reviewer went live at 19:00Z on 2026-10-08. It visited 22 rows whose branch cannot be read about 184 times a minute, where the loop had visited them about 20 times. A backoff fixed it within the hour (trios#1702). In the first 10.5 minutes after it, the reviewer was busy 23% of its worker-seconds (584 of 2520). A day later the live Queen showed about 11 reviews an hour against about 58 finished dispatches (reviewer.t27). Nothing in the runtime could say which reading was right. [measured, production]',
  },
  { kind: 'h', text: 'What the competitors have that we lacked' },
  {
    kind: 'p',
    text: 'The study compared the runtime with BEAM/OTP, Akka, Orleans, durable-execution engines such as DBOS, Temporal, Restate and Hatchet, and actor-based agent frameworks. It found three gaps, and none of them is a missing BEAM feature. Akka and Orleans measure mailbox depth, time in the mailbox and long turns out of the box; we had log lines. OTP, Orleans and Effect stop work by a protocol: a signal, a deadline, finalizers, then a kill. We abandoned a turn and let it run on. DBOS, Hatchet and Cloudflare make a long wait a database row that holds no process.',
  },
  {
    kind: 'p',
    text: 'It also found where the runtime was already ahead. A node lease of 20 s with a 5 s heartbeat notices a dead node sooner than BEAM\'s default `net_ticktime` (45 to 75 s), the default of Akka\'s split-brain resolver (about 45 s) or Orleans 9 (90 s). Our control lane, which serves signals before data, is the idea OTP 28 shipped as priority messages. A hung turn is killed, where Orleans only reports it (`MaxRequestProcessingTime`). These are the vendors\' documented defaults, not our measurements.',
  },
  { kind: 'h', text: 'Seven changes, each measured against what it would replace' },
  {
    kind: 'p',
    text: 'The seven items are the epic trios#1712. Each spec was merged in t27 first, and each runtime landed on `actors-next` as its own PR. The table gives the headline of each; the sections after it give the price.',
  },
  {
    kind: 'table',
    head: ['#', 'Change (spec, runtime, flag)', 'What moved', 'Evidence'],
    rows: [
      ['1', 'Telemetry and a replayable decision log (t27#8285, trios#1725, `TRIOS_QUEEN_ACTORS_TELEMETRY=on`)', '73,435 card decisions replayed with 0 mismatches; the same schedule with telemetry on and off', 'measured replay; cost estimated'],
      ['2', 'Turns that really stop (t27#8281, trios#1720, `TRIOS_QUEEN_TURN_STOP=on`)', 'reviews at once during stalls: up to 7-10, now at most 4; grandchild processes alive after a kill: 10 of 10, now 0', 'simulated; process test measured'],
      ['3', 'Concurrency read from the backlog (t27#8275, trios#1716, `TRIOS_QUEEN_REVIEWER_ADAPTIVE=1`)', 'overload: 565 of 660 rows at 80.7/h, now 660 of 660 at 94.3/h', 'simulated'],
      ['4', 'Long waits as rows (t27#8272, t27#8282, trios#1722, `TRIOS_QUEEN_WAITS=rows`)', 'one 90-minute CI wait: 180 GitHub reads, now 24; 180 job-log entries, now 0', 'measured on PostgreSQL 16, virtual clock'],
      ['5', 'Seeded simulation as a CI gate (t27#8292, t27#8306, trios#1726)', '18 cases of 10,000 steps, each run twice, in 33.5 s on CI with 0 divergences; 4 re-created defects caught, and one real bug found first', 'measured (the gate\'s own runs)'],
      ['6', 'Node link fencing and incarnations (t27#8278, trios#1724, no caller yet)', 'mail lost: 21, now 0; pids reused: 5 of 5, now 0; messages from a frozen node: 40, now 0', 'measured on PostgreSQL 16, OS processes'],
      ['7', 'Keyed actors and the bee dispatcher (t27#8286, trios#1723, `TRIOS_QUEEN_DISPATCH=actors`)', 'crash recovery p50 with 6-minute rounds: 701 s, now 149 s; duplicate claims on two nodes: 0', 'simulated'],
    ],
  },
  { kind: 'h', text: 'Seeing: a decision log that replays' },
  {
    kind: 'p',
    text: 'Item 1 counts per actor kind, keeps turn-time and mailbox-time histograms, and raises threshold events with a gap, as OTP 27\'s `long_message_queue` monitor does. A mailbox-depth alarm turns on at 192 and off at 64 of its 256 slots. A long turn is half the kill bound, 150 s for a review. A restart storm is flagged one restart before the supervisor gives up. Records are sampled: 8 messages per actor kind and 16 calls per card function each second, into a ring of 4096.',
  },
  {
    kind: 'p',
    text: 'Because every decision is already a call into a compiled spec, logging those calls makes the runtime replayable. A seeded reviewer run logged 73,435 decisions from 38 functions on 3 cards; replayed against the pinned cards, they gave 0 mismatches. A corrupted, empty, foreign or unsampled log does not pass. Of 13 injected crashes the counters saw 12: the 13th ended after a `rest_for_one` restart had already replaced its worker. [measured]',
  },
  {
    kind: 'p',
    text: 'On a quiet host (load about 4; 1000 actors passing 100 000 messages, 21 rounds) telemetry adds +3.3% CPU per message, the median, with +1.6 to +5.2% between p25 and p75. That is inside the +10% target. The same run found a cost we did not want: with telemetry off, a message cost 4.5 us against the 3.7 us published before the seven lanes. A profile (trios#1746) showed the cost was older than the lanes: 44% of the time went to looking a card up again on every call, by a key of 100-odd characters, and a slot known since spawn was asked for three times a message. With both fixed, a message costs 1.55 us, 2.4 times below the old base; that fix went to production with the second batch (trios#1754). Telemetry costs the same in absolute terms, so on the cheaper base it adds 8 to 13%, at the edge of its +10% target. A later change (trios#1755) cut telemetry\'s own instructions per message by 27 to 33%; the ratio on a quiet host is still to be measured. There is no production reading yet, so the question of 23% busy against 11 reviews an hour is still open.',
  },
  { kind: 'h', text: 'Stopping: a killed turn that ends, and the throughput it gives back' },
  {
    kind: 'p',
    text: 'Item 2 gives every turn an AbortSignal. The model call and the git and criterion commands obey it, a stopped review writes no verdict, and an escalation kills the whole process group, never one pid. Before this, a review killed at its bound kept its z.ai lane until its own 120 s timeout. In the simulation, the most reviews at once during stalls fall from 7-10 to 4, and a lane is free 0 s of virtual time after the kill instead of 48-74 s (p50); the real abort of a model call took 2.6-27.5 ms. [simulated]',
  },
  {
    kind: 'p',
    text: 'A test with real processes: 10 turns, each leaving a `sleep` grandchild, half of them deaf to SIGTERM, killed at a 1 s bound. With the old `proc.kill(9)` to one pid, all 10 grandchildren were alive 10 s later. With the group kill none were, and a turn deaf to SIGTERM was freed in 3012 ms. [measured]',
  },
  {
    kind: 'p',
    text: 'The price shows under overload. With deaf stalls, 78.4 reviews an hour fall to 60.7; with stalls that hear their abort, 76.6 fall to 68.4. The old code was not faster: it ran past its bound. In the second case it ran 12,216 review-seconds beyond the bound, about 68 reviews at the median length, against a gap of 57. The simulation has no key-lane limit, so there a review past the bound is free. In production it is a third concurrent request on a key, which z.ai refuses with error 1302. At steady load the throughput is equal. [simulated]',
  },
  { kind: 'h', text: 'Sizing: more workers win only when there are lanes for them' },
  {
    kind: 'p',
    text: 'Item 3 replaces the fixed pool of 4 reviewers with one sized from the backlog, the free model lanes and the memory (`reviewer_sizing.t27`). With 47 free lanes, which `/queen/status` showed on 2026-10-09, it clears an overload: 660 of 660 rows at 94.3 an hour, against 565 of 660 at 80.7. A burst of 120 rows is done in 2895 s instead of 11,690 s. The price is more model calls at once: up to 16, against 7. [simulated]',
  },
  {
    kind: 'p',
    text: 'It loses in two cases. With only 3 lanes, the fixed pool finishes 429 of 660 and the adaptive one 360. A review holds its lane only for the model call, so a pool capped at the lanes leaves each lane idle for the rest of the review. In a container with 1.5 GB free and an assumed 512 MB per review, the pool is capped at 3 and finishes 399 against 565. The flag stays off until telemetry has measured free lanes and memory per review. [simulated]',
  },
  { kind: 'h', text: 'Waiting: a row instead of a question every 30 s' },
  {
    kind: 'p',
    text: 'Item 4 parks a long wait as a row in Postgres, `queen_wait`, woken by a scheduler actor. It starts with a correction to the study. The release job\'s 90-minute CI wait did not live in process memory: the job was already a row, so a restart lost nothing. What it cost was a GitHub read and a job-log entry about every 30 s.',
  },
  {
    kind: 'p',
    text: 'Over that wait, against PostgreSQL 16 on the virtual clock, GitHub reads fall from 180 to 24 and job-log entries from 180 to 0. No wait is lost across a forced restart in either version. Noticing that the CI run has ended now takes 83 s instead of 23 s, with a bound of 240 s instead of 30 s, because a 15 s poll replaces the round. Process time without GitHub latency rises from 1108 ms to 1463 ms, about half of it that shared poll. Counting GitHub\'s measured 51 ms a read, the old way spent 9.2 s waiting on GitHub and the new one 1.2 s. A webhook would close the detection gap; none is wired. [measured]',
  },
  { kind: 'h', text: 'Proving: a simulation gate that found a real bug' },
  {
    kind: 'p',
    text: 'Item 5 turns the virtual clock into a CI gate (`simulation.t27`, t27#8292 and t27#8306; harness trios#1726). It drives the real runtime on three nodes: the reviewer actors, remote children, the in-memory net, and on two seeds the real Postgres link over a simulated store. The card picks the seeds and the fault mix: node loss, hung turn, mailbox overflow, unreadable row, provider 429, stale lease, review crash. There are 18 cases, 16 on the memory net and 2 on the store, of 10,000 steps each. Every case runs twice and the two logs must agree, and the cases together must reach the eight rare states the card requires. On CI the gate takes 33.5 s, and the whole job 52 s. Four gate runs in a row on the final code gave 0 runs that logged differently. [measured]',
  },
  {
    kind: 'p',
    text: 'To check that it catches what it should, each known defect was put back into the real source and the gate run again:',
  },
  {
    kind: 'table',
    head: ['Defect put back', 'Cases failed', 'First failure'],
    rows: [
      ['No wait backoff (the go-live hot loop)', '18 of 18', 'seed 3600507402, step 421: one row visited 5 times in a virtual minute'],
      ['The node link acknowledges mail before handling it', '2 of 2 store cases', 'seed 3600507402, step 2637'],
      ['Pids without the incarnation', '18 of 18', 'seed 3600507402, step 2543'],
      ['A turn runs after its process stopped', '2 of 18', 'seed 3600507402, step 7690'],
    ],
  },
  {
    kind: 'p',
    text: 'The defect in the last row was not one we knew about: the gate found it. On its first runs the gate failed 5 of 64 seeds with a turn that ran for a process that had already exited: the runtime takes a message and runs the turn a microtask later, and in between a supervisor can stop the process. `queen-actors.ts` now runs a turn only while its process is current, with a regression test. On a loaded Mac the check cost nothing above the noise (median 11.4 us per message with it, 11.65 us without). And on the code before item 6, the simulated store reproduced both node-link defects with no change to the source.',
  },
  {
    kind: 'p',
    text: 'The gate has two limits. Keyed actors and the adaptive reviewer pool are not in its simulated world yet. And nothing runs it nightly, because GitHub runs scheduled workflows only on the default branch, where the Queen\'s code does not live.',
  },
  { kind: 'h', text: 'Fencing: the node link, made safe before its first caller' },
  {
    kind: 'p',
    text: 'Item 6 fixes the Postgres link between nodes before anything uses it; in production it has no caller. `netlink.t27` puts an incarnation number in every pid and checks the lease epoch on every write. It moves the heartbeat to its own thread, and makes a node fence itself after 15 s without a renewal: one heartbeat before any peer can see it down at the 20 s lease. The same chaos script ran before and after, against a real PostgreSQL 16, with each node a separate OS process. [measured]',
  },
  {
    kind: 'table',
    head: ['Chaos case', 'Before', 'After'],
    rows: [
      ['Mail lost, 10 read answers dropped mid-delivery (of 200)', '21', '0'],
      ['Mail lost behind one undecodable row (of 20)', '10', '0'],
      ['Pid reused across 5 restarts', '5 of 5', '0'],
      ['Old-incarnation mail delivered to the new one', '25 of 25', '0'],
      ['Messages from a node frozen 30 s, after its peer saw it down', '40', '0'],
      ['False node-down while one turn held the loop for up to 25 s', '1', '0'],
    ],
  },
  {
    kind: 'p',
    text: 'Each of the six defects was reproduced red before the fix. The price is the acknowledgement: 6.16 mail statements per round trip instead of 4.11. CPU moved 7 to 8%, inside the run-to-run spread of a Mac at load 21 to 42. The recording below runs the fence rule itself: the spec passes, the fence is moved from 15 s to the 20 s lease, exactly that test fails, and git restores the file.',
  },
  {
    kind: 'terminal',
    src: CAST.src,
    share: CAST.share,
    title: 't27c test-report specs/queen/netlink.t27 · fence before the peers decide',
    caption: 'Seven commands, 51.2 s real (34.2 s shown); every shell line returns 0. netlink.t27 passes 9 of 9 tests, none vacuous. Moving the self-fence from 15 s to the 20 s lease fails exactly a_node_stops_before_any_peer_can_see_it_down, and git checkout restores the same sha256. This t27c 0.5.0 build predates t27#8152, so test-report still exits 0 on a FAIL; the FAIL line is the verdict.',
  },
  { kind: 'h', text: 'Dispatching: most of the gain was a time limit' },
  {
    kind: 'p',
    text: 'Item 7 runs the bee dispatcher as one actor per issue, with links, call and an orderly stop. Its benchmark added a control: the old loop with its runners capped at the actors\' 60-minute turn bound. At 16 lanes with faults the loop finishes 262 issues, the capped loop 349 and the actors 352. The actors add 3, or 0.9%; the cap gave the rest. [simulated]',
  },
  {
    kind: 'p',
    text: 'The actors win where rounds are slow and where bees crash. With 6-minute rounds they finish 330 against 307 (+7.5%), and crash recovery p50 falls from 701 s to 149 s. They lose a retry when lanes are scarce: 20 to 27 s for the loop, against 60 to 98 s. On a burst they finish 612 against 616, because they give up an issue after 3 counted failures. Duplicate claims are 0 for every runtime on one node. Across two dispatcher nodes the actors keep 0 with the pid as the claim holder, against 273 in the negative control. The proposal on t27#7851 is not to swap on these numbers: a 60-minute cap for the current loop takes most of the gain at once. [simulated]',
  },
  { kind: 'h', text: 'Could the card run on an FPGA?' },
  {
    kind: 'p',
    text: 'The decision card is a pure t27 spec, so t27c can lower it to Verilog. We synthesized it for the XC7A200T of our bench board to see what an actor runtime in hardware would cost. This is synthesis only, with yosys 0.63: no place-and-route, no clock rate, nothing loaded on the board. The provenance is in trinity#1582.',
  },
  {
    kind: 'ul',
    items: [
      '**As written, the card costs 26,737 LUT and 13 functions do not synthesize.** 66 of its 79 functions synthesize. Of the 13 that do not, 8 stop on a `while` loop whose exit depends on data, 4 on a name the generated Verilog does not resolve, and 1 on a width yosys cannot detect.',
      '**Width, not logic, sets most of the cost.** The restart jitter alone, at the card\'s declared 32- and 64-bit widths, takes 20,225 LUT, 15% of the chip. Narrowed, the same function takes 857 LUT in parallel, or about 113 LUT over 48 cycles, bit-exact to the card.',
      '**Our own number formats lose to plain binary integers here.** Balanced ternary at 2 bits a trit needs 4.4 to 8.2 times the LUTs to add, and 23 to 50% more storage per field. GF16 stops counting at 1024, where +1 is lost. Nothing in the card is signed or a ternary weight, so ternary has nothing to win.',
      '**Memory, not logic, is the limit.** With an assumed 333-bit record per actor, one engine of about 1,000 LUT (630 of it measured parts) serves 512 actors from 5 block RAMs. The chip holds about 37,000 actors before its block RAM runs out, with LUTs at about 54%.',
      '**Three boards need no new field.** The pid already carries a 12-bit node number, and the is-it-remote test costs 22 LUT.',
    ],
  },
  {
    kind: 'p',
    text: 'Since then the card has been placed, timed and run on one die. t27b, our own compiler, gained a Verilog lowering whose rules are t27 plans (t27#8820); the hardware card lowers bit-exact to the reference on all 17 of its tests. A self-test and JTAG top is generated from t27 too (t27#8830), and its clocks are declared in t27 rather than in a hand-written constraint file (t27#8857).',
  },
  {
    kind: 'ul',
    items: [
      '**Placed and routed** on the bench part xc7a200tfbg484-2 over 5 seeds: 2,191 LUT, 809 flip-flops, 160 CARRY4. The self-test clock reached 54.3 / 58.5 / 59.1 MHz (min / median / max) against the 8.85 MHz it runs at; the fast clock 317 / 447 / 576 MHz against 70.77 MHz.',
      '**Run on silicon, die A** (the owner\'s ALINX AX7203, device DNA 050d58218fd9854, SRAM only, bench job t27#8858): the die computed 77,794 of the card\'s decisions over 1,024 operand sets and read back the expected verdict word 0xA5A536FD with signature 0x3DED69B1, so every decision equals the card.',
      '**One die is not yet a citable run.** The run record needs three independent placements and says so; dies B and C have not run this job.',
    ],
  },
  { kind: 'h', text: 'In production: the first readings' },
  {
    kind: 'p',
    text: 'Three batches went into the production branch on 2026-10-10: trios#1730 at 13:38Z, trios#1754 at 16:03Z and trios#1764 at 19:25Z. Two flags are now on: telemetry since 19:29Z and turn stop since 20:38Z. The others stay off until data asks for them.',
  },
  {
    kind: 'ul',
    items: [
      '**The reviewer, measured for an hour with telemetry on** (19:34 to 20:33Z, 12 windows of 300 s): 14 reviews, all succeeded, about 3 s each; the four workers were busy 9.3% of the time at the median and 24.9% in the busiest window; the intake mailbox never held more than 5; no crash, no dropped message, no restart storm. One model call ran past the 300 s limit, and the supervisor killed and restarted that worker. The readings are on t27#7851.',
      '**The old question has an answer.** "23% busy" and "11 reviews an hour" were both right: 23% was a busy window (the busiest here was 24.9%), and 11 an hour is close to the 14 measured now. The typical worker is idle more than 90% of the time.',
      '**Turn stop, the next 50 minutes:** 11 reviews, all succeeded, busy 6.9% at the median, no kill, no error. Nothing got worse, but no turn ran long enough to be stopped, so the stopping path itself was not exercised in production yet.',
    ],
  },
  {
    kind: 'p',
    text: 'Continuous integration found what production had not yet met. Under a loaded CI runner, a process turn that ignores its SIGTERM was not killed at the 3 s grace, and in one case was still alive 13 s later. The cause was a timer: Bun sometimes runs a 3000 ms timer when the clock shows 2997 to 2999 ms, the card then correctly answers "not yet", and nothing asked again. Under an 8-thread CPU load, 27 of 100 escalations were lost in one run. The fix asks the card again until it says kill (trios#1809, and trios#1811 for the same defect in the orderly stop of keyed actors). With a test clock that fires every timer 1 ms early, the old code fails and the new code passes 20 of 20 runs under load with no surviving process. Production was exposed only on that path: a model call hears its abort within milliseconds, and with the flag off the same process was abandoned anyway.',
  },
  {
    kind: 'p',
    text: 'One correction to the stopping benchmark above: its "before" figure for a deaf stall, freed at 9998 to 9999 ms, was the benchmark cleaning up after itself, not the runtime. With the benchmark fixed, that row reads more than 10000 ms.',
  },
  { kind: 'h', text: 'What this does not show' },
  {
    kind: 'ul',
    items: [
      'Only two flags are on in production: telemetry and turn stop. The review-lane queue, long waits as rows, the adaptive reviewer pool, the keyed dispatcher and actor events are deployed but off. Every number for them is still a benchmark.',
      'The concurrency and dispatcher numbers are simulations with assumed fault rates and lengths. The loop side of the dispatcher benchmark is a model of `runRound`, not the function itself.',
      'Telemetry\'s CPU cost in production is not measured: that needs an on/off comparison under the same load, and the load was low.',
      'Turn stop\'s kill path has not yet fired in production; the reading above covers a quiet stretch.',
      'The simulation gate does not yet simulate keyed actors or the adaptive reviewer pool, and nothing runs it nightly.',
      'The silicon run is one die. DSP blocks were left out, because on the open flow they computed wrong results with live operands (t27 docs/reports/TRINET-DSP-DEFECT-W723.md).',
      'The competitor figures are the vendors\' documented defaults, not our measurements.',
    ],
  },
]

export const ruBody: Block[] = [
  {
    kind: 'p',
    text: 'На одном и том же входе с фиксированным зерном рантайм акторов Queen обходит старый цикл опроса там, где работа ломается: худшее восстановление после падения или зависания сокращается с 1181 с до 27 с, а при перегрузке рецензий выходит на 18.7% больше. Обходит не везде. 2026-10-09 на интеграционную ветку `actors-next` легли семь изменений по итогам изучения конкурентов, у каждого — спецификация на t27, тесты и бенчмарк против кода, который оно должно заменить. Два из них проигрывают в случаях, которые мы можем назвать, одно сознательно отдаёт пропускную способность, а большая часть выигрыша диспетчера оказалась заслугой простого лимита времени, а не акторов. Новый шлюз симуляции на первых же прогонах нашёл настоящую ошибку рантайма. Каждое новое поведение стоит за флагом, выключенным по умолчанию, а исправлениям ошибок флаг не нужен. В production пока ничего из этого не работает.',
  },
  {
    kind: 'p',
    text: 'Ниже встречаются числа двух видов, и у каждого есть пометка. **Симуляция** — прогон с фиксированным зерном на виртуальных часах, где частоты сбоев и длительности задач — допущения. **Замер** — настоящие процессы ОС, настоящий PostgreSQL 16 или настоящий инструмент синтеза.',
  },
  { kind: 'h', text: 'Queen и правило, которому она подчиняется' },
  {
    kind: 'p',
    text: 'Queen — планировщик роя агентов t27. Она раздаёт issue на GitHub рабочим агентам — пчёлам, рецензирует их pull request и запускает релизные задания. С 2026-10-08 действует правило владельца: каждая параллельная часть Queen становится актором с pid, почтовым ящиком и супервизором, и ни один цикл не заменяется, пока не опубликованы MVP, его тесты и бенчмарк на том же входе (t27#7851). Каждое решение рантайм получает вызовом скомпилированной спецификации t27 — «карты». Хост на TypeScript только держит состояние и выполняет ввод-вывод.',
  },
  { kind: 'h', text: 'С чего начали: победа в симуляции, горячий цикл в production' },
  {
    kind: 'p',
    text: 'Первым доменом акторов стал ревьюер pull request (trios#1698). Нагрузка: пуассоновские прибытия, 5% попыток падают, 2% зависают на 30 минут, горизонт 7 часов симуляции. Без сбоев цикл и акторы идут вровень: done p95 319 с против 309 с. Со сбоями акторы сокращают done p95 с 553 с до 384 с, а худшее восстановление — с 1181 с до 27 с. При 120 прибытиях в час они завершают 565 строк из 660 против 476. Сообщение стоит 3.7 мкс на кольце из 1000 акторов. [симуляция]',
  },
  {
    kind: 'p',
    text: 'Production показал то, чего симуляция не моделировала. Ревьюер на акторах заработал в 19:00Z 2026-10-08. К 22 строкам, ветку которых нельзя прочитать, он ходил примерно 184 раза в минуту, а цикл — около 20 раз. Backoff исправил это в течение часа (trios#1702). За первые 10.5 минуты после него ревьюер был занят 23% своих воркер-секунд (584 из 2520). Через день живая Queen показывала около 11 рецензий в час против примерно 58 завершённых диспетчеризаций (reviewer.t27). Ничто в рантайме не могло сказать, какой из замеров верен. [замер, production]',
  },
  { kind: 'h', text: 'Что есть у конкурентов и чего не было у нас' },
  {
    kind: 'p',
    text: 'Исследование сравнило рантайм с BEAM/OTP, Akka, Orleans, движками долговременного исполнения — DBOS, Temporal, Restate, Hatchet — и агентными фреймворками на акторах. Оно нашло три пробела, и ни один из них не является недостающей функцией BEAM. Akka и Orleans из коробки меряют глубину ящика, время в ящике и долгие ходы; у нас были строки логов. OTP, Orleans и Effect останавливают работу по протоколу: сигнал, дедлайн, финализаторы, затем kill. Мы же бросали ход и давали ему работать дальше. DBOS, Hatchet и Cloudflare делают из долгого ожидания строку базы, которая не держит процесс.',
  },
  {
    kind: 'p',
    text: 'Нашлось и то, в чём рантайм уже впереди. Аренда узла в 20 с при пульсе 5 с замечает мёртвый узел раньше, чем `net_ticktime` BEAM по умолчанию (от 45 до 75 с), чем split-brain resolver Akka по умолчанию (около 45 с) и чем Orleans 9 (90 с). Наша контрольная полоса, которая обслуживает сигналы раньше данных, — та же идея, что OTP 28 выпустил как priority messages. Зависший ход мы убиваем, а Orleans о нём только сообщает (`MaxRequestProcessingTime`). Это задокументированные значения по умолчанию самих вендоров, а не наши замеры.',
  },
  { kind: 'h', text: 'Семь изменений, и каждое измерено против того, что оно заменяет' },
  {
    kind: 'p',
    text: 'Семь пунктов — это эпик trios#1712. Каждая спецификация сначала влита в t27, а каждый рантайм лёг на `actors-next` отдельной PR. В таблице — главное число каждого пункта; цена — в разделах после неё.',
  },
  {
    kind: 'table',
    head: ['#', 'Изменение (спецификация, рантайм, флаг)', 'Что сдвинулось', 'Основание'],
    rows: [
      ['1', 'Телеметрия и воспроизводимый журнал решений (t27#8285, trios#1725, `TRIOS_QUEEN_ACTORS_TELEMETRY=on`)', '73 435 решений карт воспроизведены с 0 расхождений; с телеметрией и без неё расписание одно и то же', 'замер повтора; цена — оценка'],
      ['2', 'Ходы, которые действительно останавливаются (t27#8281, trios#1720, `TRIOS_QUEEN_TURN_STOP=on`)', 'одновременных рецензий во время зависаний: до 7-10, теперь не больше 4; живых процессов-внуков после kill: 10 из 10, теперь 0', 'симуляция; тест процессов — замер'],
      ['3', 'Параллелизм по очереди (t27#8275, trios#1716, `TRIOS_QUEEN_REVIEWER_ADAPTIVE=1`)', 'перегрузка: 565 из 660 строк при 80.7/ч, теперь 660 из 660 при 94.3/ч', 'симуляция'],
      ['4', 'Долгие ожидания как строки (t27#8272, t27#8282, trios#1722, `TRIOS_QUEEN_WAITS=rows`)', 'одно 90-минутное ожидание CI: 180 чтений GitHub, теперь 24; 180 записей в журнал задания, теперь 0', 'замер на PostgreSQL 16, виртуальные часы'],
      ['5', 'Симуляция с зерном как шлюз CI (t27#8292, t27#8306, trios#1726)', '18 случаев по 10 000 шагов, каждый дважды, за 33.5 с в CI и с 0 расхождений; 4 воссозданных дефекта пойманы, и одна настоящая ошибка найдена первой', 'замер (собственные прогоны шлюза)'],
      ['6', 'Фенсинг связи узлов и инкарнации (t27#8278, trios#1724, вызывающих пока нет)', 'потеряно писем: 21, теперь 0; pid переиспользован: 5 из 5, теперь 0; писем от замёрзшего узла: 40, теперь 0', 'замер на PostgreSQL 16, процессы ОС'],
      ['7', 'Ключевые акторы и диспетчер пчёл (t27#8286, trios#1723, `TRIOS_QUEEN_DISPATCH=actors`)', 'восстановление после падения, p50 при 6-минутных раундах: 701 с, теперь 149 с; двойных захватов на двух узлах: 0', 'симуляция'],
    ],
  },
  { kind: 'h', text: 'Видеть: журнал решений, который воспроизводится' },
  {
    kind: 'p',
    text: 'Пункт 1 считает события по видам акторов, ведёт гистограммы времени хода и времени в ящике и поднимает пороговые события с зазором, как монитор `long_message_queue` в OTP 27. Тревога по глубине ящика включается на 192 и выключается на 64 из 256 мест. Долгий ход — половина границы kill, 150 с для рецензии. Шторм рестартов отмечается за один рестарт до того, как супервизор сдастся. Записи берутся выборочно: 8 сообщений на вид актора и 16 вызовов на функцию карты в секунду, в кольцо на 4096 записей.',
  },
  {
    kind: 'p',
    text: 'Каждое решение уже является вызовом скомпилированной спецификации, поэтому журнал этих вызовов делает рантайм воспроизводимым. Прогон ревьюера с зерном записал 73 435 решений от 38 функций трёх карт; повтор на закреплённых картах дал 0 расхождений. Испорченный, пустой или чужой журнал, как и журнал с записями вне выборки, проверку не проходит. Из 13 впрыснутых падений счётчики увидели 12: тринадцатое закончилось после того, как рестарт `rest_for_one` уже заменил его воркер. [замер]',
  },
  {
    kind: 'p',
    text: 'На спокойной машине (нагрузка около 4; 1000 акторов передают 100 000 сообщений, 21 прогон) телеметрия добавляет +3.3% CPU на сообщение по медиане, от +1.6 до +5.2% между p25 и p75. Это в пределах цели +10%. Тот же прогон нашёл цену, которой мы не хотели: без телеметрии сообщение стоило 4.5 мкс против 3.7 мкс, опубликованных до семи лейнов. Профиль (trios#1746) показал, что эта цена старше лейнов: 44% времени уходило на повторный поиск карты при каждом вызове по ключу длиной больше 100 символов, а слот, известный с момента запуска, запрашивался трижды на сообщение. После обоих исправлений сообщение стоит 1.55 мкс — в 2.4 раза меньше прежней базы; это исправление ушло в production со второй партией (trios#1754). Телеметрия стоит столько же в абсолютных числах, поэтому на подешевевшей базе добавляет 8–13% — на границе цели +10%. Следующее изменение (trios#1755) сократило собственные инструкции телеметрии на сообщение на 27–33%; отношение на спокойной машине ещё предстоит измерить. Production-замера ещё нет, поэтому вопрос «23% занятости против 11 рецензий в час» остаётся открытым.',
  },
  { kind: 'h', text: 'Останавливать: убитый ход заканчивается, и пропускная способность отдаётся' },
  {
    kind: 'p',
    text: 'Пункт 2 даёт каждому ходу AbortSignal. Вызов модели, команды git и проверки критериев ему подчиняются, остановленная рецензия не пишет вердикт, а эскалация убивает всю группу процессов, никогда не один pid. Раньше рецензия, убитая на своей границе, держала полосу z.ai до собственного 120-секундного таймаута. В симуляции одновременных рецензий во время зависаний становится не больше 4 вместо 7-10, и полоса освобождается через 0 с виртуального времени после kill вместо 48-74 с (p50); настоящая отмена вызова модели заняла 2.6-27.5 мс. [симуляция]',
  },
  {
    kind: 'p',
    text: 'Тест с настоящими процессами: 10 ходов, каждый оставляет внука `sleep`, половина глуха к SIGTERM, kill на границе в 1 с. При старом `proc.kill(9)` одному pid все 10 внуков были живы через 10 с. При убийстве группы не выжил ни один, а глухой к SIGTERM ход освобождался за 3012 мс. [замер]',
  },
  {
    kind: 'p',
    text: 'Цена видна при перегрузке. С глухими зависаниями 78.4 рецензии в час падают до 60.7; с зависаниями, которые слышат отмену, 76.6 падают до 68.4. Старый код не был быстрее: он работал за своей границей. Во втором случае он отработал за границей 12 216 рецензия-секунд, это около 68 рецензий медианной длины при разнице в 57. В симуляции нет лимита полос на ключ, поэтому рецензия за границей там бесплатна. В production это третий одновременный запрос на ключ, и z.ai отвечает на него ошибкой 1302. При постоянной нагрузке пропускная способность одинакова. [симуляция]',
  },
  { kind: 'h', text: 'Дозировать: больше воркеров выигрывают, только если для них есть полосы' },
  {
    kind: 'p',
    text: 'Пункт 3 заменяет фиксированный пул из 4 ревьюеров пулом, размер которого выводится из очереди, свободных полос модели и памяти (`reviewer_sizing.t27`). При 47 свободных полосах — столько показывал `/queen/status` 2026-10-09 — он разгребает перегрузку: 660 из 660 строк при 94.3 в час против 565 из 660 при 80.7. Всплеск из 120 строк закрывается за 2895 с вместо 11 690 с. Цена — больше одновременных вызовов модели: до 16 против 7. [симуляция]',
  },
  {
    kind: 'p',
    text: 'Проигрывает он в двух случаях. При всего 3 полосах фиксированный пул завершает 429 из 660, а адаптивный — 360. Рецензия держит полосу только на время вызова модели, поэтому пул, ограниченный числом полос, оставляет каждую полосу простаивать до конца рецензии. В контейнере с 1.5 ГБ свободной памяти и принятыми 512 МБ на рецензию пул ограничен тремя и завершает 399 против 565. Флаг остаётся выключенным, пока телеметрия не измерит свободные полосы и память на рецензию. [симуляция]',
  },
  { kind: 'h', text: 'Ждать: строка вместо вопроса каждые 30 с' },
  {
    kind: 'p',
    text: 'Пункт 4 паркует долгое ожидание строкой в Postgres, `queen_wait`, а будит её актор-планировщик. Начинается он с поправки к исследованию. 90-минутное ожидание CI в релизном задании не жило в памяти процесса: задание уже было строкой, и рестарт ничего не терял. Стоило оно чтения GitHub и записи в журнал задания примерно каждые 30 с.',
  },
  {
    kind: 'p',
    text: 'За это ожидание, на PostgreSQL 16 и виртуальных часах, чтений GitHub становится 24 вместо 180, а записей в журнал задания — 0 вместо 180. Ни одно ожидание не теряется при принудительном рестарте ни в старой, ни в новой версии. Заметить, что прогон CI закончился, теперь занимает 83 с вместо 23 с при границе 240 с вместо 30 с, потому что раунд заменён опросом раз в 15 с. Время процесса без задержки GitHub растёт с 1108 мс до 1463 мс, около половины — этот общий опрос. С учётом измеренных 51 мс на чтение GitHub старый способ ждал GitHub 9.2 с, а новый — 1.2 с. Разрыв в обнаружении закрыл бы вебхук; он не подключён. [замер]',
  },
  { kind: 'h', text: 'Доказывать: шлюз симуляции, который нашёл настоящую ошибку' },
  {
    kind: 'p',
    text: 'Пункт 5 превращает виртуальные часы в шлюз CI (`simulation.t27`, t27#8292 и t27#8306; харнесс trios#1726). Он гоняет настоящий рантайм на трёх узлах: акторы ревьюера, удалённых детей, сеть в памяти, а на двух зёрнах — настоящую связь через Postgres поверх симулированного хранилища. Зёрна и смесь сбоев выбирает карта: потеря узла, зависший ход, переполнение ящика, нечитаемая строка, 429 от провайдера, устаревшая аренда, падение рецензии. Случаев 18: 16 в сети в памяти и 2 на хранилище, по 10 000 шагов каждый. Каждый случай прогоняется дважды, два лога обязаны совпасть, а все случаи вместе обязаны достичь восьми редких состояний, которых требует карта. В CI шлюз занимает 33.5 с, всё задание — 52 с. Четыре прогона шлюза подряд на итоговом коде дали 0 прогонов с разными логами. [замер]',
  },
  {
    kind: 'p',
    text: 'Чтобы проверить, что он ловит то, что должен, каждый известный дефект возвращали в настоящий исходный код и снова запускали шлюз:',
  },
  {
    kind: 'table',
    head: ['Возвращённый дефект', 'Провалено случаев', 'Первый провал'],
    rows: [
      ['Нет backoff ожидания (горячий цикл при запуске)', '18 из 18', 'зерно 3600507402, шаг 421: одну строку посетили 5 раз за виртуальную минуту'],
      ['Связь узлов подтверждает письмо до его обработки', '2 из 2 случаев на хранилище', 'зерно 3600507402, шаг 2637'],
      ['pid без инкарнации', '18 из 18', 'зерно 3600507402, шаг 2543'],
      ['Ход выполняется после остановки своего процесса', '2 из 18', 'зерно 3600507402, шаг 7690'],
    ],
  },
  {
    kind: 'p',
    text: 'О дефекте из последней строки мы не знали: его нашёл шлюз. На первых прогонах шлюз провалил 5 из 64 зёрен: ход выполнялся для процесса, который уже завершился. Рантайм забирает письмо и выполняет ход на микрозадачу позже, а между этими моментами супервизор может остановить процесс. Теперь `queen-actors.ts` выполняет ход, только пока его процесс актуален, и на это есть регрессионный тест. На нагруженном Mac проверка ничего не стоила сверх шума (медиана 11.4 мкс на сообщение с ней и 11.65 мкс без неё). А на коде до пункта 6 симулированное хранилище воспроизвело оба дефекта связи узлов без единого изменения исходного кода.',
  },
  {
    kind: 'p',
    text: 'У шлюза два ограничения. Ключевых акторов и адаптивного пула ревьюеров в его симулированном мире пока нет. И каждую ночь его никто не запускает: GitHub выполняет расписания только на ветке по умолчанию, а кода Queen там нет.',
  },
  { kind: 'h', text: 'Фенсинг: связь узлов стала безопасной до первого вызывающего' },
  {
    kind: 'p',
    text: 'Пункт 6 чинит связь узлов через Postgres раньше, чем ею кто-то воспользуется; в production у неё нет вызывающих. `netlink.t27` кладёт номер инкарнации в каждый pid и проверяет эпоху аренды при каждой записи. Пульс переезжает в свой поток, а узел отключает себя сам через 15 с без продления — на один пульс раньше, чем любой сосед сможет счесть его мёртвым по аренде в 20 с. Один и тот же сценарий хаоса прогнан до и после, на настоящем PostgreSQL 16, где каждый узел — отдельный процесс ОС. [замер]',
  },
  {
    kind: 'table',
    head: ['Случай хаоса', 'До', 'После'],
    rows: [
      ['Потеряно писем, 10 ответов на чтение сброшены посреди доставки (из 200)', '21', '0'],
      ['Потеряно писем за одной недекодируемой строкой (из 20)', '10', '0'],
      ['pid переиспользован за 5 рестартов', '5 из 5', '0'],
      ['Письма прошлой инкарнации доставлены новой', '25 из 25', '0'],
      ['Писем от узла, замёрзшего на 30 с, после того как сосед счёл его мёртвым', '40', '0'],
      ['Ложный node-down, пока один ход держал цикл до 25 с', '1', '0'],
    ],
  },
  {
    kind: 'p',
    text: 'Каждый из шести дефектов сначала воспроизведён красным. Цена — подтверждение: 6.16 SQL-операторов почты на круг вместо 4.11. CPU сдвинулся на 7-8%, в пределах разброса между прогонами на Mac с нагрузкой от 21 до 42. Запись ниже прогоняет само правило фенсинга: спецификация проходит, фенсинг сдвигается с 15 с на 20 с аренды, падает ровно этот тест, и git возвращает файл.',
  },
  {
    kind: 'terminal',
    src: CAST.src,
    share: CAST.share,
    title: 't27c test-report specs/queen/netlink.t27 · фенсинг раньше решения соседей',
    caption: 'Семь команд, 51.2 с реального времени (показано 34.2 с); каждая строка оболочки возвращает 0. netlink.t27 проходит 9 из 9 тестов, ни один не пустой. Сдвиг самоотключения с 15 с на 20 с аренды проваливает ровно a_node_stops_before_any_peer_can_see_it_down, и git checkout возвращает тот же sha256. Эта сборка t27c 0.5.0 старше t27#8152, поэтому test-report ещё выходит с 0 при FAIL; вердикт — строка FAIL.',
  },
  { kind: 'h', text: 'Диспетчеризация: большую часть выигрыша дал лимит времени' },
  {
    kind: 'p',
    text: 'Пункт 7 запускает диспетчер пчёл как набор акторов, по одному на issue, со связями, вызовом и упорядоченной остановкой. В его бенчмарк добавлен контроль: старый цикл, у которого раннеры ограничены 60-минутной границей хода, как у акторов. При 16 полосах со сбоями цикл завершает 262 issue, ограниченный цикл — 349, акторы — 352. Акторы добавляют 3, то есть 0.9%; остальное дал лимит. [симуляция]',
  },
  {
    kind: 'p',
    text: 'Акторы выигрывают там, где раунды медленные и где пчёлы падают. При 6-минутных раундах они завершают 330 против 307 (+7.5%), а p50 восстановления после падения снижается с 701 с до 149 с. Повтор при нехватке полос они проигрывают: 20-27 с у цикла против 60-98 с. На всплеске они завершают 612 против 616, потому что бросают issue после 3 засчитанных провалов. Двойных захватов 0 у каждого рантайма на одном узле. На двух узлах диспетчера акторы держат 0, когда держатель захвата — pid, а в негативном контроле их 273. Предложение в t27#7851 — не заменять цикл по этим числам: 60-минутный лимит для нынешнего цикла сразу забирает большую часть выигрыша. [симуляция]',
  },
  { kind: 'h', text: 'Может ли карта работать на ПЛИС?' },
  {
    kind: 'p',
    text: 'Карта решений — чистая спецификация t27, поэтому t27c может опустить её в Verilog. Мы синтезировали её под XC7A200T нашей стендовой платы, чтобы увидеть, сколько стоил бы рантайм акторов в железе. Это только синтез, yosys 0.63: ни размещения и трассировки, ни тактовой частоты, на плату ничего не загружалось. Происхождение чисел — в trinity#1582.',
  },
  {
    kind: 'ul',
    items: [
      '**Карта как она написана стоит 26 737 LUT, и 13 функций не синтезируются.** Синтезируются 66 из 79 функций. Из 13 остальных 8 упираются в цикл `while`, выход из которого зависит от данных, 4 — в имя, которое сгенерированный Verilog не разрешает, и 1 — в ширину, которую yosys не может определить.',
      '**Большую часть цены задаёт ширина, а не логика.** Один только джиттер рестарта на объявленных в карте ширинах 32 и 64 бита занимает 20 225 LUT, 15% кристалла. После сужения та же функция занимает 857 LUT параллельно или около 113 LUT за 48 тактов, бит в бит с картой.',
      '**Наши собственные форматы чисел здесь проигрывают обычным двоичным целым.** Сбалансированной троичной системе по 2 бита на трит нужно в 4.4-8.2 раза больше LUT на сложение и на 23-50% больше памяти на поле. GF16 перестаёт считать на 1024, где +1 теряется. В карте нет ни знаковых величин, ни троичных весов, так что троичной системе здесь нечего выиграть.',
      '**Предел ставит память, а не логика.** При принятой записи в 333 бита на актор один движок примерно в 1000 LUT (630 из них — измеренные части) обслуживает 512 акторов из 5 блоков BRAM. Кристалл вмещает около 37 000 акторов, прежде чем кончится блочная память, а LUT при этом заняты примерно на 54%.',
      '**Трём платам не нужно нового поля.** В pid уже есть 12-битный номер узла, а проверка «удалённый ли» стоит 22 LUT.',
    ],
  },
  {
    kind: 'p',
    text: 'С тех пор карту разместили, проверили по таймингу и запустили на одном кристалле. t27b, наш собственный компилятор, научился выводить Verilog по правилам, записанным планами на t27 (t27#8820); аппаратная карта опускается побитно равной эталону на всех 17 своих тестах. Самотест с JTAG-верхом тоже сгенерирован из t27 (t27#8830), а его клоки объявлены в t27, а не в ручном файле ограничений (t27#8857).',
  },
  {
    kind: 'ul',
    items: [
      '**Размещено и оттрассировано** на кристалле стенда xc7a200tfbg484-2 на 5 сидах: 2191 LUT, 809 триггеров, 160 CARRY4. Клок самотеста — 54,3 / 58,5 / 59,1 МГц (мин / медиана / макс) при рабочих 8,85 МГц; быстрый клок — 317 / 447 / 576 МГц при 70,77 МГц.',
      '**Запущено на кремнии, кристалл A** (ALINX AX7203 владельца, ДНК кристалла 050d58218fd9854, только SRAM, заявка t27#8858): кристалл посчитал 77 794 решения карты на 1024 наборах операндов и вернул ожидаемое слово вердикта 0xA5A536FD с подписью 0x3DED69B1, то есть каждое решение совпало с картой.',
      '**Один кристалл — ещё не цитируемый прогон.** Протокол прогона требует трёх независимых размещений и так и пишет; кристаллы B и C эту заявку ещё не прогоняли.',
    ],
  },
  { kind: 'h', text: 'В production: первые замеры' },
  {
    kind: 'p',
    text: 'Три партии ушли в production-ветку 2026-10-10: trios#1730 в 13:38Z, trios#1754 в 16:03Z и trios#1764 в 19:25Z. Сейчас включены два флага: телеметрия с 19:29Z и остановка ходов с 20:38Z. Остальные выключены, пока данные их не попросят.',
  },
  {
    kind: 'ul',
    items: [
      '**Ревьюер, час замера с включённой телеметрией** (19:34–20:33Z, 12 окон по 300 с): 14 ревью, все успешные, около 3 с каждое; четыре воркера заняты 9,3% времени по медиане и 24,9% в самом загруженном окне; в почтовом ящике приёмника не больше 5 сообщений; ни падений, ни потерянных сообщений, ни штормов перезапусков. Один вызов модели превысил лимит 300 с, и супервизор убил и перезапустил этот воркер. Замеры — в t27#7851.',
      '**На старый вопрос есть ответ.** И «23% занятости», и «11 ревью в час» были верны: 23% — это загруженное окно (здесь пик 24,9%), а 11 в час близко к нынешним 14. Обычный воркер простаивает больше 90% времени.',
      '**Остановка ходов, следующие 50 минут:** 11 ревью, все успешные, занятость 6,9% по медиане, ни одного убийства, ни одной ошибки. Хуже не стало, но ни один ход не длился достаточно долго, чтобы его останавливать, так что сам путь остановки в production ещё не срабатывал.',
    ],
  },
  {
    kind: 'p',
    text: 'Непрерывная интеграция нашла то, с чем production ещё не встретился. На нагруженном раннере CI процесс, игнорирующий SIGTERM, не добивался по истечении grace в 3 с, а в одном случае был жив и через 13 с. Причина — таймер: Bun иногда запускает таймер на 3000 мс, когда часы показывают 2997–2999 мс, карта честно отвечает «ещё рано», и больше её никто не спрашивал. Под нагрузкой в 8 потоков в одном прогоне потерялись 27 эскалаций из 100. Исправление спрашивает карту снова, пока та не скажет «убить» (trios#1809, и trios#1811 для того же дефекта в упорядоченной остановке ключевых акторов). С тестовыми часами, которые срабатывают на 1 мс раньше, старый код падает, а новый проходит 20 из 20 прогонов под нагрузкой без единого выжившего процесса. Production был уязвим только на этом пути: вызов модели слышит отмену за миллисекунды, а с выключенным флагом тот же процесс и так бросался.',
  },
  {
    kind: 'p',
    text: 'Одна поправка к бенчмарку остановки выше: его цифра «до» для глухого зависания, освобождение за 9998–9999 мс, была уборкой самого бенчмарка, а не рантаймом. С исправленным бенчмарком эта строка показывает больше 10000 мс.',
  },
  { kind: 'h', text: 'Чего это не показывает' },
  {
    kind: 'ul',
    items: [
      'В production включены только два флага: телеметрия и остановка ходов. Очередь слотов ревью, долгие ожидания строками, адаптивный пул ревьюеров, ключевой диспетчер и события акторов выкачены, но выключены. Все их числа — по-прежнему бенчмарки.',
      'Числа параллелизма и диспетчера — симуляции с принятыми частотами сбоев и длительностями. Сторона цикла в бенчмарке диспетчера — модель `runRound`, а не сама функция.',
      'Цена телеметрии по CPU в production не измерена: для этого нужно сравнение «вкл/выкл» при одинаковой нагрузке, а нагрузка была низкой.',
      'Путь убийства хода в production ещё ни разу не срабатывал; замер выше — спокойный отрезок.',
      'Шлюз симуляции пока не моделирует ключевых акторов и адаптивный пул ревьюеров, и каждую ночь его никто не запускает.',
      'Прогон на кремнии — один кристалл. Блоки DSP не использовались: в открытом маршруте они считали неверно на живых операндах (t27 docs/reports/TRINET-DSP-DEFECT-W723.md).',
      'Числа конкурентов — задокументированные значения по умолчанию самих вендоров, а не наши замеры.',
    ],
  },
]
