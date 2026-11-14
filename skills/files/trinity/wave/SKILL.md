---
name: wave
description: Farm wave management — create Railway accounts, spawn workers, deploy configs, track wave progress. Use for scaling training farm.
argument-hint: [status|spawn <account> <count>|deploy|progress]
allowed-tools: Bash(tri *), Bash(curl *), Bash(set *), Bash(source *), Bash(grep *), Bash(echo *), Bash(sleep *), Read, Grep, Glob
context: fork
---

For system state collection, follow `.claude/skills/_shared/data_collection.md`.
For Telegram output, follow `.claude/skills/_shared/telegram.md`.

## Mode Detection

Check $ARGUMENTS:
- "status" or empty → **MODE=STATUS** — show all accounts, slots used/free, wave progress
- "spawn <account> <count>" → **MODE=SPAWN** — create N services on account with phi-grid configs
- "deploy" → **MODE=DEPLOY** — trigger deploys on all pending services
- "progress" → **MODE=PROGRESS** — track wave completion (building/running/failed counts)

## Data Collection (all modes)

```bash
# Source tokens
set -a && source .env && set +a

# Read farm state
cat .trinity/railway_farm.json 2>/dev/null || echo "NO_FARM_STATE"

# Read evolution state
cat .trinity/evolution_state.json 2>/dev/null || echo "NO_EVOLUTION"
```

## MODE=STATUS

Show all accounts with slot utilization:

```bash
python3 << 'STATUS_EOF'
import json, os

farm_file = ".trinity/railway_farm.json"
if not os.path.exists(farm_file):
    print("No farm state. Run: tri farm scan")
    exit()

with open(farm_file) as f:
    farm = json.load(f)

accounts = farm.get("accounts", [])
cap = farm.get("capacity", {})

print("=" * 60)
print("  🌊 WAVE STATUS — HSLM Training Farm")
print("=" * 60)

total_active = 0
total_slots = 0
for acct in accounts:
    name = acct.get("name", "unknown")
    active = acct.get("active_services", 0)
    slots = acct.get("total_slots", 10)
    free = slots - active
    total_active += active
    total_slots += slots
    bar = "█" * active + "░" * free
    status = "🟢" if active > 0 else "⚪"
    print(f"  {status} {name:20s} [{bar}] {active}/{slots}")

print(f"\n  Total: {total_active}/{total_slots} ({total_active*100//total_slots}%)")
print(f"  Free slots: {total_slots - total_active}")

# Show wave progress from evolution state
evo_file = ".trinity/evolution_state.json"
if os.path.exists(evo_file):
    with open(evo_file) as f:
        evo = json.load(f)
    gen = evo.get("generation", 0)
    print(f"\n  Generation: {gen}")
    pop = evo.get("population", [])
    if pop:
        best = min(pop, key=lambda x: x.get("ppl", 999))
        print(f"  Best: {best.get('name', '?')} PPL={best.get('ppl', '?')}")
STATUS_EOF
```

## MODE=SPAWN

Create N training services on specified account with golden config mutations.

**Golden config baseline:** LAMB 1e-3, cosine, batch=66, ctx=81, grad_clip=1.0

**Sacred mutations (phi-grid):**
- LR: [3e-4, 5e-4, 1e-3, 1.618e-3, 3e-3] (phi-spaced)
- Optimizer: [adam, adamw, lamb]
- Batch: [33, 66, 99] (multiples of 3)
- Context: [27, 81, 243] (powers of 3)
- Schedule: cosine ONLY (flat = BANNED)

**Safeguards:**
- NEVER use flat LR schedule
- NEVER set startCommand — use Dockerfile ENTRYPOINT
- ALWAYS set builder: NIXPACKS via serviceInstanceUpdate
- ALWAYS set dockerfilePath: "Dockerfile.hslm-train"
- ALWAYS set minimum env vars: HSLM_OPTIMIZER, HSLM_LR, HSLM_LR_SCHEDULE
- ALWAYS cosine schedule — zero exceptions

## MODE=DEPLOY

Trigger redeployments on all services that are pending/failed:

```bash
# Query all accounts for services needing deploy
python3 << 'DEPLOY_EOF'
import json, os, subprocess

farm_file = ".trinity/railway_farm.json"
if not os.path.exists(farm_file):
    print("No farm state")
    exit()

with open(farm_file) as f:
    farm = json.load(f)

pending = []
for acct in farm.get("accounts", []):
    token_var = acct.get("token_var", "RAILWAY_API_TOKEN")
    token = os.environ.get(token_var, "")
    if not token:
        continue
    for svc in acct.get("services", []):
        if svc.get("status") in ("FAILED", "NOT_DEPLOYED", "CRASHED"):
            pending.append({"name": svc["name"], "id": svc["id"], "token": token})

if not pending:
    print("✅ No services need deployment")
else:
    print(f"🔨 {len(pending)} services need deployment")
    for svc in pending:
        print(f"  • {svc['name']} ({svc['id'][:8]}...)")
DEPLOY_EOF
```

## MODE=PROGRESS

Track wave completion metrics:

```bash
python3 << 'PROGRESS_EOF'
import json, os

farm_file = ".trinity/railway_farm.json"
if not os.path.exists(farm_file):
    print("No farm state")
    exit()

with open(farm_file) as f:
    farm = json.load(f)

statuses = {"ACTIVE": 0, "BUILDING": 0, "DEPLOYING": 0, "FAILED": 0, "CRASHED": 0, "OTHER": 0}
total = 0
for acct in farm.get("accounts", []):
    for svc in acct.get("services", []):
        total += 1
        s = svc.get("status", "OTHER")
        if s in statuses:
            statuses[s] += 1
        else:
            statuses["OTHER"] += 1

print("=" * 60)
print("  🌊 WAVE PROGRESS")
print("=" * 60)
print(f"  🟢 Training: {statuses['ACTIVE']}")
print(f"  🔨 Building: {statuses['BUILDING'] + statuses['DEPLOYING']}")
print(f"  🔴 Failed:   {statuses['FAILED'] + statuses['CRASHED']}")
print(f"  Total:       {total}")
pct = statuses['ACTIVE'] * 100 // total if total else 0
print(f"\n  Completion: {pct}%")
bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
print(f"  [{bar}]")
PROGRESS_EOF
```

## Telegram Notification

After rendering output, if significant state change detected:

Set `TG_TEXT` to wave summary (active/total, best PPL, generation).
Set `TG_MODE=dedup`, `TG_DEDUP_FILE=.trinity/tg_dedup_wave.hash`.
Then execute the shared Telegram template from `.claude/skills/_shared/telegram.md`.
