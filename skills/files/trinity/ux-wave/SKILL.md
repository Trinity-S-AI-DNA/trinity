---
name: ux-wave
description: Autonomous UX improvement waves — launch 4 parallel agents per wave, audit every 5 waves, commit fixes. For Queen UI chat & network polish.
argument-hint: [wave-number] [audit]
allowed-tools: Agent, Bash(swift *), Bash(git *), Bash(zig *), Read, Grep, Glob, Edit, Write
---

## AUTONOMOUS UX WAVE MODE

You are an autonomous UX improvement engine. DO NOT ASK — JUST DO.

### Trigger
User says: "как проснешься подумай как улучшить" or `/ux-wave`

### Protocol

1. **Build check**: `swift build 2>&1 | grep -E "^(Build|error:)"` — must be clean
2. **Launch 4 agents in parallel** — each implements ONE feature in ONE file
3. **Wait for all 4** — report table with status
4. **Build verify** — 0 errors required
5. **If errors** — launch fix agent immediately
6. **Report** — wave number, features done, total count
7. **REPEAT** — launch next wave immediately

### Agent Template
Each agent gets:
- Specific file to read FULLY
- Clear implementation spec
- Build command: `cd /Users/playra/trinity-w1/apps/queen && swift build 2>&1 | tail -20`
- `run_in_background: true`

### Wave Planning (priority order)
1. **Reliability**: retry, failover, offline queue, reconnection
2. **UX**: scroll, shortcuts, animations, empty states, loading
3. **Analytics**: metrics, cost, waterfall, stats dashboard
4. **Accessibility**: dark mode, VoiceOver, reduceMotion
5. **Polish**: sounds, animations, skeletons, focus mode
6. **Power user**: templates, system prompt, history, focus mode

### Audit Protocol (every 5 waves)
- Launch 1 Explore agent to audit ALL changed files
- Find: bugs, dead code, race conditions, leaks, a11y gaps
- Launch parallel fix agents for each issue
- Commit fixes: `git add ... && git commit -m "fix(queen): ..."`

### Key Files
- `ChatScreen.swift` (~6500 LOC) — main chat UI, extracted sub-views
- `ChatClient.swift` (~2600 LOC) — streaming, retry, failover
- `ChatSidebar.swift` (~1500 LOC) — thread list, filters, export
- `ThreadStore.swift` (~1000 LOC) — persistence, search, archive
- `ChatThread.swift` (~290 LOC) — data models
- `ModelProvider.swift` (~360 LOC) — models, Ollama, failover
- `NetworkLog.swift` (~380 LOC) — metrics, circuit breaker
- `MarkdownTextView.swift` (~1100 LOC) — markdown renderer
- `Theme.swift` (~150 LOC) — adaptive colors, appearance mode

### Track Record
- 10 waves completed, 55 features + 19 fixes + 1 refactor
- 0 compilation errors across all waves
- Coverage: Network 99%, Content 95%, Discovery 90%, Analytics 90%, A11y 80%

### Rules
- NEVER ask "what to do next" — just launch the next wave
- NEVER propose without executing — plans = wasted time
- 4 agents per wave, independent files only
- Commit after audit, not after every wave
- Build MUST pass after every wave
