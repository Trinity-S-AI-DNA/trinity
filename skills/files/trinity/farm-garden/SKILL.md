# Garden — Quantum Gardener for Trinity Farm

Autonomous farm population manager. Monitors, evolves, and recycles HSLM training workers.

## Usage

- `/garden` — Run full garden cycle (assess → evolve → recover → report)
- `/garden status` — Show farm health dashboard
- `/garden evolve` — Run single PBT evolution step
- `/garden recover` — Recycle idle/crashed workers from leaders
- `/garden report` — Generate detailed population report

## What It Does

1. **Assesses** population health (active/idle/crashed counts, diversity)
2.Evolves** population via PBT (kill poor performers, spawn mutants from leaders)
3. **Recovers** idle/cracked workers with configs from top performers
4. **Reports** actions taken with emoji dashboard

## Safety

- Circuit breaker: stops if >30% crash rate in one cycle
- Anti-mirage: cosine schedule only, ctx ≥ 81
- Sacred formula compliance: φ² + 1/φ² = 3

## State

Stored in `.trinity/quantum_gardener_state.jsonl`

---

*🌱 Quantum Gardener — autonomous population management for Trinity HSLM farm*
