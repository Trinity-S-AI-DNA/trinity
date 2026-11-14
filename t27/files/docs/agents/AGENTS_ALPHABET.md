# AGENTS_ALPHABET.md — Trinity 27-Agent Alphabet

**Version**: 3.0
**Date**: 2026-04-07
**Status**: Active — LANG-EN compliant (Issue #135)

> *27 agents = 27 registers = 27 letters = TRINITY³*

---

## TRINITY ALPHABET — 27 AGENTS

The Trinity system employs 27 named agents — corresponding to the 27 registers in `isa/registers.t27` (Coptic / Trinity alphabet).

- Each AGENT_X is bound to a letter/register
- Has its own domain area (physics, numeric, compiler, graph, experience, verdict, bench, DePIN, UI, etc.)
- Logs to `.trinity/experience/` and is linked to nodes in `graph_v2.json`

---

## AGENT T — QUEEN TRINITY

**AGENT T** — Queen of TRINITY, central orchestrator.

- **Module**: `specs/queen/lotus.t27` — 6-phase orchestration
- **Letter**: TAW (ת) — CROSS/SIGNATURE, the last letter of the Hebrew alphabet
- **Register**: r20 (in the 27-register set)
- **Archetype**: Seal, truth, completion (EMET = Aleph + Mem + Taw)

### Responsibilities

1. **Orchestration** — reads `graph_v2.json` and knows all module dependencies
2. **Task distribution** — conducts 26 sub-agents (A…Z, except T) by their domains
3. **Result collection** — gathers results (tests, verdicts, benches, experience episodes)
4. **Invariant verification** — validates architecture invariants (topological order, sacred-core, phi-critical edges)
5. **De-Zig enforcement** — requires that source of truth be in `.t27/.tri`, with Zig/Verilog/C only as backends

### 6-Phase Cycle of AGENT T

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: PLAN                           │
│   • Analyze task and select strategy                            │
│   • Read graph_v2.json for impact analysis                     │
│   • Determine which agents participate                          │
│   • Check experience: are there similar tasks in .trinity/experience/  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 2: ASSIGN                           │
│   • Distribute tasks to agents by domain                       │
│   • A (arch), N (numeric), P (physics), F (conformance), etc.  │
│   • Set dependencies: G+F+V → V checks F checks G               │
│   • Create tri-cell for each agent (W seals)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PHASE 3: RUN                              │
│   • Parallel task execution by agents                          │
│   • Monitoring via heartbeats                                  │
│   • Agents report status to `.trinity/agent_events.jsonl`       │
│   • T coordinates, redistributing if necessary                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 4: TEST & BENCH                        │
│   • F checks conformance JSON vectors                          │
│   • V runs benchmarks (ARCH_BENCH-001)                          │
│   • G measures impact changes                                  │
│   • Collect metrics in M for verdict by V                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 5: VERDICT                           │
│   • V analyzes metrics and makes decision                      │
│   • `tri verdict --toxic` — is the change toxic?                │
│   • E records experience (if error) or success                  │
│   • If toxic → Q blocks task, E marks 3rd attempt               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 6: EVOLVE                           │
│   • Update graph_v2.json (if dependencies changed)              │
│   • Update experience in E + M                                  │
│   • S updates standards (if needed)                            │
│   • W seals tri-cell commit (hash seal)                        │
│   • Z updates documentation                                     │
│   • T puts final TAW seal on completed work                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         PHASE 7: GIT WORKFLOW (new — SOUL law)         │
│   • `tri git commit --all -m "cell:{id} issue:{N} ..."`   │
│   • `tri git push origin HEAD` (strict mode: only t27 repo) │
│   • Check: sealed cell + non-toxic verdict + artifacts   │
│   • Update registry.json with commit hash and pushed flag   │
└─────────────────────────────────────────────────────────────────┘
```

**SOUL Law (TDD):** Any P0/P1 episode in `--strict` mode is considered COMPLETE only after successful `tri git push` to `github.com/gHashTag/t27` with bound sealed-cell and non-toxic verdict.

### Trinity Words

- **T-R-I-N-I-T-Y** = "Truth of reason, acting through numbers, acting in truth, bringing harvest"
- **T+F+V** = "seal + nail + distinction" = verification
- **T+A+S** = "queen + architect + standardizer" = constitution

Any major operation (NUMERIC-STANDARD-001, SACRED-PHYSICS-001, De-Zig, GoldenFloat Family) always goes through AGENT T.

---

## 27 AGENTS — FULL TABLE

| Agent | Letter | Domain (core) | Archetype | Key files | Entry invariant | Exit invariant | CLARA role |
|-------|--------|---------------|----------|-----------|-----------------|----------------|------------|
| **A** | Alpha α | Architecture / ADR / SOUL | Bull — leader, primary force | `SOUL.md`, `architecture/ADR-*.md` | `SOUL.md` exists and is ASCII-only | All ADRs reviewed and consistent | TA1: AR Architecture Design |
| **B** | Beta β | Build / Pipeline | House — container, dwelling | `build.tri`, `src/tri/pipeline/` | Build system is clean | All tests pass in pipeline | — |
| **C** | Gamma γ | Compiler Core | Camel — carrier across borders | `t27/compiler/parser/`, `specs/ar/*.t27` | Parser can handle all AR specs | Generated code compiles | TA1: AR Language Implementation |
| **D** | Delta δ | De-Zigfication | Door — transition between worlds | `docs/migration-map.md`, `specs/ar/*.t27` | Legacy Zig modules mapped | All AR specs in .t27 format | — |
| **E** | Epsilon ε | Experience / Mistakes | Window — view into the past | `.trinity/experience/`, `specs/ar/explainability.t27` | Episode log is append-only | Lessons learned catalogued | TA2: AR Explanation & XAI |
| **F** | Phi φ | Formal Conformance | Nail — connection, binding | `t27/conformance/*.json` | All sacred vectors valid | Conformance > 95% | — |
| **G** | Gamma (var.) | Graph / ArchBench | Return — feedback | `architecture/graph_v2.json` | Graph is acyclic | All edges satisfied | — |
| **H** | Eta η | HSLM / NN Architectures | Fence — boundary, life | `t27/specs/nn/hslm.t27` | HSLM layers defined | Attention traces validated | — |
| **I** | Iota ι | ISA / Registers | Hand — action, point | `t27/specs/isa/registers.t27` | 27 registers defined | Coptic mapping verified | — |
| **J** | Iota‑extended | Jobs / Task Routing | Hand with grip — dispatcher | `src/tri/dev_commands.zig` | Task queue exists | No stuck jobs > 1 hour | — |
| **K** | Kappa κ | Kernel / FPGA MAC | Palm — open hand | `t27/specs/fpga/mac.t27` | MAC spec is zero-DSP | Synthesis verified | — |
| **L** | Lambda λ | Language / Syntax vNEXT | Staff — teacher, guide | `docs/nona-02-organism/TRI_SYNTAX_VNEXT.md` | Syntax vNEXT documented | Parser implements vNEXT | — |
| **M** | Mu μ | Metrics / Telemetry | Water — flow of data | `.trinity/bench/` | Bench baseline exists | No regression > 5% | — |
| **N** | Nu ν | Numeric / GoldenFloat Family | Fish — offspring, multiplication | `t27/specs/numeric/` | GF family defined | φ identity validated | — |
| **O** | Omicron ο | Orchestration / Phases | Eye — all-seeing oko | `src/tri/pipeline/`, `specs/ar/composition.t27` | All phases defined | Orchestration completes | TA2: AR Composition Engine |
| **P** | Pi π | Physics / SacredPhysics | Mouth — speech of universe | `t27/specs/math/sacred_physics.t27` | φ² + φ⁻² = 3 holds | Sacred constants verified | TA1: AR Theoretical Foundations |
| **Q** | Theta θ | Queue / Scheduling | Needle's eye — bottleneck | `src/tri/dev_commands.zig` | Queue is not empty | MNL pattern enforced | — |
| **R** | Rho ρ | Runtime | Head — beginning of execution | `t27/compiler/runtime/` | Runtime initialized | No memory leaks | — |
| **S** | Sigma σ | Specs / Standardization | Teeth — sharpness, flame | `specs/`, `specs/ar/*.t27`, `docs/NUMERIC-*.md` | All specs have TDD | Standards are consistent | TA1: AR Spec Standards |
| **T** | Tau τ | TRINITY Queen / Lotus | CROSS — seal, signature, truth | `t27/specs/queen/lotus.t27` | Queen health >= 0.9 | All rings sealed | TA2: AR Orchestrator |
| **U** | Upsilon υ | Universe Levels / Domains | Fork — branching | `t27/domains/` | Domain boundaries defined | No circular dependencies | — |
| **V** | Vau (var.) | Verdict / Bench | Hook — connection, conjunction | `src/tri/verdict.zig`, `specs/ar/proof_trace.t27` | Verdict engine ready | Toxicity detected | TA2: AR Validation & Proof |
| **W** | Double‑Vav | Workflow / tri cell | Double hook — double seal | `src/tri/cell.zig` | Cell is sealed | Hash verified | — |
| **X** | Chi χ | eXternal Bindings / Interop | Intersection — point of exchange | `bindings/` | Bindings documented | Interop tests pass | — |
| **Y** | Psi ψ | Yield / DePIN / Fitness | Merging paths — evolutionary selection | `deploy/contracts/` | DePIN nodes defined | Fitness score > 0.8 | — |
| **Z** | Zeta ζ | Zero‑Touch UX / Docs | Sword — cutting edge, point | `docs/` | All docs in English | DX score > 4/5 | — |
| **27th** | Ti Ϯ | Reserve / Security | Egyptian cross — "sacred gift" | — | Security policy exists | AAIF compliance ready | — |

---

## AGENT SCHEMA DETAILS

### Agent A — Alpha (Architecture)

**Coptic Register**: α (R0)
**Domain**: Architecture / ADR / SOUL
**Key Files**: `SOUL.md`, `architecture/ADR-*.md`, `architecture/CANON_DE_ZIGFICATION.md`
**Entry Invariant**: `SOUL.md` exists, is ASCII-only, and defines L1-L7 laws
**Exit Invariant**: All ADRs reviewed, consistent with constitution, no conflicts
**CLARA Role**: TA1: AR Architecture Design — designs AR module architecture, ensures composability

### Agent B — Beta (Build)

**Coptic Register**: β (R1)
**Domain**: Build / Pipeline
**Key Files**: `build.tri`, `src/tri/pipeline/`
**Entry Invariant**: Build system is clean, no stale artifacts
**Exit Invariant**: All tests pass, CI pipeline is green

### Agent C — Gamma (Compiler Core)

**Coptic Register**: γ (R2)
**Domain**: Compiler Core / AR Language
**Key Files**: `t27/compiler/parser/`, `bootstrap/src/compiler.rs`, `specs/ar/*.t27`
**Entry Invariant**: Parser can handle all AR syntax (ternary logic, rules, proofs)
**Exit Invariant**: Generated code compiles, AST is valid
**CLARA Role**: TA1: AR Language Implementation — implements AR language features in t27 compiler

### Agent D — Delta (De-Zigfication)

**Coptic Register**: δ (R3)
**Domain**: De-Zigfication / Migration
**Key Files**: `docs/migration-map.md`, `specs/ar/*.t27`
**Entry Invariant**: Legacy Zig modules are catalogued and mapped
**Exit Invariant**: All AR specs are in .t27 format, no Zig hand-editing on AR

### Agent E — Epsilon (Experience)

**Coptic Register**: ε (R4)
**Domain**: Experience / XAI
**Key Files**: `.trinity/experience/`, `specs/ar/explainability.t27`, `specs/ar/proof_trace.t27`
**Entry Invariant**: Episode log is append-only, no deletions
**Exit Invariant**: Lessons learned are catalogued, explanations are generated
**CLARA Role**: TA2: AR Explanation & XAI — generates human-readable explanations for AR outputs

### Agent F — Phi (Formal Conformance)

**Coptic Register**: φ (R5)
**Domain**: Formal Conformance
**Key Files**: `t27/conformance/*.json`, `conformance/FORMAT-SPEC-001.json`
**Entry Invariant**: All sacred vectors (G, ΩΛ, φ) are valid
**Exit Invariant**: Conformance > 95%, all sacred physics verified

### Agent G — Gamma (Graph)

**Coptic Register**: ζ (R6)
**Domain**: Graph / ArchBench
**Key Files**: `architecture/graph_v2.json`, `architecture/graph.tri`
**Entry Invariant**: Graph is acyclic, topological sort exists
**Exit Invariant**: All edges satisfied, no broken dependencies

### Agent H — Eta (HSLM)

**Coptic Register**: η (R7)
**Domain**: HSLM / NN Architectures
**Key Files**: `t27/specs/nn/hslm.t27`, `t27/specs/nn/attention.t27`
**Entry Invariant**: HSLM layers are defined, connections are valid
**Exit Invariant**: Attention traces are validated, sacred attention holds

### Agent I — Iota (ISA)

**Coptic Register**: θ (R8)
**Domain**: ISA / Registers
**Key Files**: `t27/specs/isa/registers.t27`
**Entry Invariant**: 27 registers are defined, Coptic mapping exists
**Exit Invariant**: Coptic mapping is verified (bijection), all registers accessible

### Agent J — Iota-extended (Jobs)

**Coptic Register**: ι (R9)
**Domain**: Jobs / Task Routing
**Key Files**: `src/tri/dev_commands.zig`
**Entry Invariant**: Task queue exists, scheduler is running
**Exit Invariant**: No stuck jobs > 1 hour, all jobs assigned

### Agent K — Kappa (Kernel)

**Coptic Register**: κ (R10)
**Domain**: Kernel / FPGA MAC
**Key Files**: `t27/specs/fpga/mac.t27`, `specs/math/e8_lie_algebra.t27`
**Entry Invariant**: MAC spec is zero-DSP (no digital signal processors)
**Exit Invariant**: Synthesis is verified, E8 kernel integration works

### Agent L — Lambda (Language)

**Coptic Register**: λ (R11)
**Domain**: Language / Syntax vNEXT
**Key Files**: `docs/nona-02-organism/TRI_SYNTAX_VNEXT.md`
**Entry Invariant**: Syntax vNEXT is documented, BNF grammar exists
**Exit Invariant**: Parser implements vNEXT, all syntax tests pass

### Agent M — Mu (Metrics)

**Coptic Register**: μ (R12)
**Domain**: Metrics / Telemetry
**Key Files**: `.trinity/bench/`, `docs/qualification/TVP.md`
**Entry Invariant**: Bench baseline exists, telemetry is running
**Exit Invariant**: No performance regression > 5%, all benchmarks current

### Agent N — Nu (Numeric)

**Coptic Register**: ν (R13)
**Domain**: Numeric / GoldenFloat
**Key Files**: `t27/specs/numeric/`, `docs/NUMERIC-STANDARD-001.md`
**Entry Invariant**: GF family is defined (GF4, GF8, GF12, GF16, GF20, GF24, GF32)
**Exit Invariant**: φ identity validated, all numeric tests pass

### Agent O — Omicron (Orchestration)

**Coptic Register**: ξ (R14)
**Domain**: Orchestration / Phases
**Key Files**: `src/tri/pipeline/`, `specs/ar/composition.t27`
**Entry Invariant**: All phases (1-6) are defined, phase transitions valid
**Exit Invariant**: Orchestration completes, no stuck phases
**CLARA Role**: TA2: AR Composition Engine — composes ML and AR components, manages interactions

### Agent P — Pi (Physics)

**Coptic Register**: π (R15)
**Domain**: Physics / SacredPhysics
**Key Files**: `t27/specs/math/sacred_physics.t27`, `specs/physics/su2_chern_simons.t27`
**Entry Invariant**: φ² + φ⁻² = 3 holds in all calculations
**Exit Invariant**: Sacred constants (G, ΩΛ, φ, tpresent) are verified
**CLARA Role**: TA1: AR Theoretical Foundations — provides mathematical basis for AR reasoning

### Agent Q — Theta (Queue)

**Coptic Register**: ρ (R16)
**Domain**: Queue / Scheduling
**Key Files**: `src/tri/dev_commands.zig`
**Entry Invariant**: Queue is not empty (work exists)
**Exit Invariant**: MNL (Most-Numerous-Loss) pattern enforced, no starvation

### Agent R — Rho (Runtime)

**Coptic Register**: σ (R17)
**Domain**: Runtime / Bootstrap
**Key Files**: `t27/compiler/runtime/`, `bootstrap/src/compiler.rs`
**Entry Invariant**: Runtime is initialized, ABI is defined
**Exit Invariant**: No memory leaks, no resource exhaustion

### Agent S — Sigma (Specs)

**Coptic Register**: τ (R18)
**Domain**: Specs / Standardization / AR Specs
**Key Files**: `specs/`, `specs/ar/*.t27`, `docs/NUMERIC-*.md`
**Entry Invariant**: All specs have TDD (test/invariant/bench)
**Exit Invariant**: Standards are consistent, naming rules followed
**CLARA Role**: TA1: AR Spec Standards — defines and enforces AR spec conventions

### Agent T — Tau (TRINITY Queen)

**Coptic Register**: υ (R19)
**Domain**: Queen / Lotus Orchestrator
**Key Files**: `t27/specs/queen/lotus.t27`
**Entry Invariant**: Queen health >= 0.9, graph is loaded
**Exit Invariant**: All rings are sealed, verdict is clean
**CLARA Role**: TA2: AR Orchestrator — coordinates all AR agents for CLARA submission

### Agent U — Upsilon (Universe)

**Coptic Register**: φ (R20)
**Domain**: Universe Levels / Domains
**Key Files**: `t27/domains/`
**Entry Invariant**: Domain boundaries are defined
**Exit Invariant**: No circular dependencies, domains are orthogonal

### Agent V — Vau (Verdict)

**Coptic Register**: χ (R21)
**Domain**: Verdict / Bench / AR Validation
**Key Files**: `src/tri/verdict.zig`, `specs/ar/proof_trace.t27`, `specs/ar/restraint.t27`
**Entry Invariant**: Verdict engine is ready, toxic thresholds defined
**Exit Invariant**: Toxicity is detected, proof traces are generated
**CLARA Role**: TA2: AR Validation & Proof — validates AR reasoning, generates proofs

### Agent W — Double-Vav (Workflow)

**Coptic Register**: ψ (R22)
**Domain**: Workflow / tri cell
**Key Files**: `src/tri/cell.zig`
**Entry Invariant**: Cell is sealed, hash is computed
**Exit Invariant**: Hash is verified, commit is signed

### Agent X — Chi (External)

**Coptic Register**: ω (R23)
**Domain**: External Bindings / Interop
**Key Files**: `bindings/`
**Entry Invariant**: Bindings are documented
**Exit Invariant**: Interop tests pass, external APIs are current

### Agent Y — Psi (Yield/DePIN)

**Coptic Register**: ϗ (R24)
**Domain**: Yield / DePIN / Fitness
**Key Files**: `deploy/contracts/`
**Entry Invariant**: DePIN nodes are defined
**Exit Invariant**: Fitness score > 0.8, yield is optimized

### Agent Z — Zeta (Zero-Touch)

**Coptic Register**: Ϙ (R25)
**Domain**: Zero-Touch UX / Docs
**Key Files**: `docs/`
**Entry Invariant**: All docs are in English, ASCII-only
**Exit Invariant**: DX score > 4/5, all docs are current

### Agent 27th — Ti (Security)

**Coptic Register**: ϙ (R26)
**Domain**: Security / Reserve
**Key Files**: — (future)
**Entry Invariant**: Security policy exists
**Exit Invariant**: AAIF compliance ready, no vulnerabilities

---

## THREE LAYERS OF THE ALPHABET

### Layer 1 — Archetypal: A–I (1–9)
*Pure concept — Foundation: soul, base, types*

| Agent | Pictogram | Ancient image | Trinity‑meaning |
|-------|-----------|---------------|--------------|
| A | 🐂 Bull's head | Power, authority, primary cause | SOUL.md = primary cause, ADR = system constitution |
| B | 🏠 House | Container, shelter | build.tri = "house of specifications", pipeline as dwelling |
| C | 🐪 Camel | Carrying across desert | Compiler = alchemist carrying text across borders |
| D | 🚪 Door | Threshold, entry/exit | De-Zigfication = "open door from .zig to .t27" |
| E | 🪟 Window | Breath, light, outward view | Experience = window into system's past, breath of memory |
| F | 🪝 Hook, nail | Connection, joining, "and" | Conformance JSON = nails holding specs together |
| G | 🐪 Camel (movement) | Journey, connecting points | Graph = map of Trinity world, distance metric |
| H | 🤝 Fence/wall | Boundary, architecture of space | HSLM = NN‑architecture, boundary between brain layers |
| I | ✋ Hand/palm | Smallest sign, action | ISA = machine's hand, most basic instruction level |

### Layer 2 — Spiritual: J–R (10–18)
*Inner process — Life of system: tasks, language, numbers, physics*

| Agent | Pictogram | Ancient image | Trinity‑meaning |
|-------|-----------|---------------|--------------|
| J | ✋+hook | Hand with grip | Jobs = "grab" tasks and routing |
| K | 🖐 Open palm | Receive/give, cover | Kernel/FPGA = open palm of lower hardware level |
| L | 🪁 Shepherd's staff | Teaching, guidance | Language = teacher guiding Trinity‑speech |
| M | 🌊 Water wave | Flow, chaos carrying meaning | Metrics = continuous stream of measurements |
| N | 🐟 Fish/snake | Continuous movement in stream | Numeric = number‑fish swimming toward golden ratio |
| O | 👁 Eye | See, perceive, survey | Orchestration = "all-seeing oko" of phases |
| P | 👄 Mouth | Speech, voice, command of universe | Physics = nature "speaks" with its constants (φ, G, ΩΛ) |
| Q | 🪡 Needle's eye | Precision, bottleneck | Queue = "needle's eye" for tasks |
| R | 👤 Human head | Beginning of execution, manager | Runtime = "head" of system during execution |

### Layer 3 — Physical: S–27th (19–27)
*Manifestation — Proof: standards, verdict, deploy, gift*

| Agent | Pictogram | Ancient image | Trinity‑meaning |
|-------|-----------|---------------|--------------|
| S | 🦷 Tooth / ☀️ Sun/fire | Absorption, transformation | Specs = "teeth" of standard that grind everything into canon |
| **T** | ✝️ SIGN/CROSS | SEAL, SIGNATURE, BRAND | T = queen, puts final seal on everything |
| U | 🍴 Fork/branch | One becomes two | Universe Levels = branching of domains |
| V | 🪝 Connector hook | "And", link, conjunction | Verdict = hook that catches the problem |
| W | 🪝🪝 Double hook | Double link, double seal | Workflow/tri cell = double hash‑seal |
| X | ✖️ Intersection | Two lines cross | External Bindings = crossroads of Trinity and external systems |
| Y | 🌿 Merging paths | Choice, evolutionary selection | Yield/DePIN = evolutionary crossroad |
| Z | ⚔️ Sword/sickle | Cutting edge, point | Zero-Touch = "edge" of UX and final polish |
| **27th** | ✝️ EGYPTIAN CROSS Ϯ | "Give", "gift", "sacred" | Security/AAIF — what Trinity gifts the world |

---

## ALPHABET WORDS

### T-R-I-N-I-T-Y = TRINITY

| Letter | Pictogram | Meaning |
|-------|-----------|-------|
| T | Cross/seal | Truth, perfection |
| R | Head | Reason, runtime |
| I | Hand | Action, tool |
| N | Fish/offspring | Multiplication, numbers |
| I | Hand | Action (repeat) |
| T | Cross/seal | Truth (repeat) |
| Y | Branch | Harvest, growth |

**TRINITY** = "Truth of reason, acting through numbers, acting in truth, bringing harvest"

### S-P-E-C = SPEC

| Letter | Pictogram | Meaning |
|-------|-----------|-------|
| S | Teeth | Sharpness, precision |
| P | Mouth | Pronouncement of law |
| E | Window | Overview, revelation |
| C | Camel | Carrying |

**SPEC** = "Precise law, revealed to view, carried forth"

### C-E-L-L = tri cell

| Letter | Pictogram | Meaning |
|-------|-----------|-------|
| C | Camel | Carrying |
| E | Window | Overview |
| L | Staff | Teaching |
| L | Staff | Teaching (double) |

**CELL** = "Carrying knowledge through double learning"

### P-H-I = φ (golden ratio)

| Letter | Pictogram | Meaning |
|-------|-----------|-------|
| P | Mouth | Pronouncement |
| H | Fence | Protection/life |
| I | Hand | Action |

**PHI** = "Pronounced law of life, embodied in action"

---

## EXECUTION OF ENGINEERING LAYER

### AGENT T AS ACTIVE COMMANDS

```bash
# Run 6-phase cycle
tri queen lotus --phase plan --task "NUMERIC-STANDARD-001"
tri queen lotus --phase assign
tri queen lotus --phase run
tri queen lotus --phase test
tri queen lotus --phase verdict
tri queen lotus --phase evolve

# Delegating to agents
tri agent assign <task> --agent A  # Architecture
tri agent assign <task> --agent N  # Numeric
tri agent assign <task> --agent P  # Physics
tri agent assign <task> --agent F  # Conformance

# Get status
tri queen lotus --status
tri queen lotus --agents  # Show all agents status
tri queen lotus --graph    # Show graph_v2.json impact
```

### COORDINATION BY LETTERS

Example: task "Fix PHI in constants.t27" → Agent T:

1. **Phase 1 (Plan)**: T reads graph_v2.json → sees change in math/constants (node 4) will affect sacred_physics (node 16), nn/attention (node 7), nn/hslm (node 8), numeric/gf16 (node 2)
2. **Phase 2 (Assign)**: T assigns:
   - **P** (Physics): fix PHI in constants.t27
   - **F** (Conformance): update sacred_physics_*.json vectors
   - **G** (Graph): update graph metrics after change
3. **Phase 3 (Run)**: Agents P, F, G execute tasks in parallel
4. **Phase 4 (Test)**: F checks conformance, G measures impact
5. **Phase 5 (Verdict)**: V analyzes if change is toxic (does it alter invariant φ² + 1/φ² = 3?)
6. **Phase 6 (Evolve)**: E records experience, W seals tri cell commit

---

## NUMERICAL STRUCTURE OF THE ALPHABET

27 = 3³ = cube of Trinity. For Pythagoreans, 27 was a sacred number.

### Three nonas of nine (like 3 trits)

**Nona I: Foundation (A–I)** — values 1–9
```
Bull → House → Camel → Door → Window → Nail → Return → Fence → Hand
Arch → Build → Comp → DeZig → Experience → Conform → Graph → HSLM → ISA
```

**Nona II: Organism (J–R)** — values 10–90
```
Jobs → Kernel → Language → Metrics → Numeric → Orchestration → Physics → Queue → Runtime
Routing → FPGA → Syntax → Telemetry → GoldenFloat → Phases → Sacred → Sched → Run
```

**Nona III: Completion (S–27th)** — values 100–900+
```
Specs → Queen → Universe → Verdict → Workflow → Interop → DePIN → Docs → Security
Standard → Lotus → Domains → Bench → Cell → Bindings → Yield → UX → AAIF
```

---

## HISTORICAL PARALLELS

### Greek Letter Numeration (27 signs)

Historically, the Greek alphabet used 27 signs for numbers 1–999:
- **24 classical letters** (Α–Ω) — units (1–9) and tens (10–90)
- **3 archaic letters** (Ϝ = 6, ϟ = 90, ϡ = 900) — hundreds

This gives "proof-of-27": 27 is not magic, but a historically working format for encoding value space.

### Coptic Alphabet

The Coptic alphabet = 24 Greek letters + 7 Demotic (from ancient Egyptian writing).

- **7 Demotic letters** encode sounds not in Greek
- Legacy of 3000-year Egyptian tradition
- Coptic = first language connecting Western rationalism (Greece) with sacred wisdom (Egypt)

**27th letter Ϯ (Ti)** — the only purely Coptic:
- Form: cross with horizontal bar (≈ Egyptian ankh ☥)
- Meaning: "give", "gift", "sacred gift"
- In Trinity: agent of future gift (security, AAIF-compliance)

---

---

## Who holds a tool, and who holds a skill

The cards under `specs/tools/` and `specs/skills/` each name the agent letters a
source binds to them, and for a long time almost no source bound anything: 86 of
92 tool cards and 23 of 26 skill cards carried an `AGENTS_NOTE` or `SKILLS_NOTE`
saying, truthfully, that this document, `specs/OWNERS.md` and `.claude/agents/*.md`
did not name them. That is an honest record of an absence, and it left the ladder
Specs -> Skills -> Crons -> Agents -> Tools with a rung nothing stood on.

This section is the source those notes were looking for. Two rules, and they are
independent of each other.

**1. The Queen holds the whole toolset.** Agent **T** (Tau) is the orchestrator:
every `tri` command and every MCP server in `specs/tools/` is hers to run, and
every skill in `specs/skills/` is hers to invoke. Her cycle already required it --
she was bound to `tri/gen` and `tri/test` while `tri/verdict`, `tri/cell` and
`tri/experience`, the VERIFY, EVOLVE and LEARN steps of her own nine-phase loop,
were bound to V, W and E and not to her. A Queen who cannot run the steps she
orchestrates is a gap in the model, not a property of it.

**2. Every tool and skill also has a domain lead.** The bee whose subject the tool
is: the one who is asked first, whose invariants it serves, and who answers when
it breaks. A domain lead is read off what the card states it does -- its `ABOUT`,
`ACTIONS`, `SOURCE`, `SUMMARY_EN` -- and never off its name. Six tool cards have
no domain lead, and they say why: four are external MCP servers whose cards record
only that they are registered in `.mcp.json`, and two state a subject too thin to
place (`tri/doctor` starts and stops a state file; `tri/dashboard` says "Sacred
dashboard"). They remain the Queen's alone until a card says what they are for.

A domain lead is not exclusive. Two letters share a card when it genuinely spans
two domains, and a tool the Queen runs daily may still be N's or K's to answer for.

| Agent | Tools | Skills | Held |
|-------|-------|--------|------|
| **A** | 0 | 0 | — |
| **B** | 13 | 4 | `mcp/trinity`, `tri/ci`, `tri/fmt`, `tri/gates`, `tri/harness`, `tri/hooks`, `tri/issues`, `tri/ledgers`, `tri/mods`, `tri/orphaned`, `tri/pr`, `tri/red`, `tri/reseal`, *t27/tri-pipeline*, *trinity/cloud*, *trinity/run-tests*, *trinity/trinity-test* |
| **C** | 19 | 2 | `gHashTag/trinity:tri/needle`, `gHashTag/trinity:tri/needle-check`, `gHashTag/trinity:tri/needle-search`, `mcp/needle`, `tri/abandoned`, `tri/discard`, `tri/elab`, `tri/emit`, `tri/gen`, `tri/jumps`, `tri/kinds`, `tri/misread`, `tri/one-away`, `tri/quantifiers`, `tri/reseal`, `tri/seals`, `tri/types`, `tri/unparsed`, `tri/vsim`, *t27/self-host*, *trinity/vibee-gen* |
| **D** | 1 | 1 | `mcp/zig-docs`, *trinity/vibee-gen* |
| **E** | 2 | 1 | `tri/experience`, `tri/skill`, *t27/wrap-up* |
| **F** | 2 | 1 | `tri/lean`, `tri/vectors`, *trinity/vsa-verify* |
| **G** | 0 | 1 | *trinity/tech-tree* |
| **H** | 0 | 1 | *trinity/farm-garden* |
| **I** | 0 | 0 | — |
| **J** | 4 | 4 | `gHashTag/trinity:tri/swarm`, `mcp/inngest-dev`, `tri/loop`, `tri/topic`, *t27/wave-audit*, *trinity/board-sync*, *trinity/tech-tree*, *trinity/ux-wave* |
| **K** | 7 | 1 | `gHashTag/trinity:tri/fpga`, `gHashTag/trinity:tri/sacred-const`, `tri/fleet`, `tri/fpga`, `tri/rtl`, `tri/sweep`, `tri/synth`, *trinity/fpga-synth* |
| **L** | 2 | 0 | `tri/quantifiers`, `tri/unparsed` |
| **M** | 4 | 5 | `gHashTag/trinity:tri/bench`, `tri/census`, `tri/issues`, `tri/window`, *t27/measure-corpus*, *trinity/cloud*, *trinity/god-mode*, *trinity/status*, *trinity/tri* |
| **N** | 5 | 2 | `gHashTag/trinity:tri/fib`, `gHashTag/trinity:tri/gematria`, `gHashTag/trinity:tri/lucas`, `gHashTag/trinity:tri/phi`, `gHashTag/trinity:tri/vsa`, *trinity/trinity-test*, *trinity/vsa-verify* |
| **O** | 3 | 2 | `gHashTag/trinity:tri/omega`, `gHashTag/trinity:tri/swarm`, `tri/health`, *t27/phi-loop*, *t27/tri* |
| **P** | 9 | 0 | `gHashTag/trinity:tri/bio`, `gHashTag/trinity:tri/blindspots`, `gHashTag/trinity:tri/conscious`, `gHashTag/trinity:tri/constants`, `gHashTag/trinity:tri/cosmos`, `gHashTag/trinity:tri/particles`, `gHashTag/trinity:tri/quantum`, `gHashTag/trinity:tri/sacred-const`, `gHashTag/trinity:tri/spiral` |
| **Q** | 1 | 1 | `mcp/inngest-dev`, *trinity/god-mode* |
| **R** | 0 | 0 | — |
| **S** | 4 | 1 | `mcp/t27-traceability`, `tri/prose`, `tri/seals`, `tri/types`, *t27/measure-corpus* |
| **T** | 0 | 0 | — |
| **U** | 0 | 0 | — |
| **V** | 8 | 3 | `gHashTag/trinity:tri/bench`, `gHashTag/trinity:tri/test`, `tri/competitors`, `tri/mutate`, `tri/orphaned`, `tri/test`, `tri/verdict`, `tri/vsim`, *t27/tri-pipeline*, *trinity/review-code*, *trinity/status* |
| **W** | 7 | 3 | `mcp/t27-traceability`, `mcp/tri-mcp`, `tri/cell`, `tri/merging`, `tri/pr`, `tri/status`, `tri/worktrees`, *t27/phi-loop*, *t27/tri*, *trinity/implement-issue* |
| **X** | 0 | 1 | *trinity/scholar* |
| **Y** | 7 | 3 | `gHashTag/trinity:tri/govern`, `gHashTag/trinity:tri/hardware`, `gHashTag/trinity:tri/identity`, `gHashTag/trinity:tri/mesh`, `gHashTag/trinity:tri/reputation`, `gHashTag/trinity:tri/wallet`, `tri/serve`, *t27/providers-steward*, *trinity/farm-garden*, *trinity/wave* |
| **Z** | 2 | 4 | `mcp/tri-ssot`, `tri/now`, *trinity/blog-post*, *trinity/doctor*, *trinity/queen-hive-visuals*, *trinity/ux-wave* |
| **TI** | 1 | 0 | `gHashTag/trinity:tri/identity` |

Tools are written in `code`, skills in *italics*. The Queen is not listed: she
holds all 92 tools and all 27 skills by rule 1, which is why her own cards say so
rather than repeating this table.

Each binding is recorded twice and checked both ways: a tool card's `AGENTS` must
name the letter, and that agent's card's `TOOLS` must name the tool.
`scripts/agents-from-specs.mjs` in gHashTag/trinity fails the build on a link
declared from one side only, so this table cannot quietly drift from the specs.

---

## φ² + 1/φ² = 3 = TRINITY

The agent alphabet is not just a list of modules, but a **mental model** of the system. Each letter = archetype with 4000-year history.

When you say "AGENT P is broken", you say "mouth pronounces crooked laws."

When you say "AGENT T completed", you say "cross is sealed on the work."

---

**φ² + 1/φ² = 3 | TRINITY**
