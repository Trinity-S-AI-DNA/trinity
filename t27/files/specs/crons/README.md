# specs/crons — scheduled jobs as first-class `.t27` specs

> **Where this lives.** This directory in `gHashTag/t27` is the canonical home of these
> specs — edit them here. `gHashTag/trinity` keeps a vendored copy under
> `apps/website/public/t27/files/specs/crons/` and its build reads that copy through the
> vendored compiler wasm (`t27_compiler.wasm`). The wasm's `typecheck.ok` is necessary,
> not sufficient: it stays `true` for a wrong annotation such as `str = 5`, so the site's
> generator (`scripts/agents-from-specs.mjs`) also checks the field schema below. The
> bootstrap compiler on `master` was not run against these files in the commit that
> added them.


One file per scheduled job the site publishes (`apps/website/public/crons/manifest.json`):
GitHub Actions schedules, Inngest functions, Railway cron services and in-process
`setInterval` timers, and the launchd agents and crontab lines on the owner's Mac. The `.t27` file is the source of truth for the job card on
t27.ai; `public/crons/spec-crons.json` is generated from it by the real compiler.

File name: `<repo>-<job slug>.t27`; module name: `cron_<file name with underscores>`.

## Schema (every constant is `pub const`)

| constant        | type     | meaning                                                                                   |
|-----------------|----------|-------------------------------------------------------------------------------------------|
| `KIND`          | `str`    | always `"cron"`                                                                           |
| `ID`            | `str`    | `<host>/<repo>/<slug>`; must equal the id in the code manifest                            |
| `NAME`          | `str`    | display name                                                                              |
| `HOST`          | `str`    | `github-actions` \| `inngest` \| `railway-cron` \| `timer` \| `launchd` (see below)         |
| `REPO`          | `str`    | short repo name                                                                           |
| `SERVICE`       | `str`    | workflow file / Inngest function file / Railway service / `file:line` of the timer         |
| `SUMMARY_EN`    | `str`    | what the job does (English)                                                               |
| `SCHEDULE`      | `str`    | cron expression (absent for timers; `""` when only a dashboard holds it, see `SCHEDULE_NOTE`) |
| `INTERVAL_MS`   | `u32`    | period of an in-process timer (timers only, instead of `SCHEDULE`)                        |
| `TZ`            | `str`    | timezone of the schedule                                                                  |
| `RUNS`          | `[N]str` | skill IDs this job launches — **the control link**; only when the source evidently invokes one |
| `RUNS_NOTE`     | `str`    | why `RUNS` is what it is (e.g. `"no skill invocation found in source"`)                    |
| `ENABLED`       | `bool`   | whether the job is meant to fire                                                           |
| `NOTE`          | `str`    | optional caveat carried from the code catalog                                             |
| `ON_FAILURE`    | `str`    | `issue` \| `log` \| `unknown`                                                             |
| `CONTROL`       | `str`    | `github-actions-dispatch` \| `railway-dashboard` \| `inngest-dashboard` \| `code-only`     |

## HOST `launchd` (the owner's Mac)

A job that runs on the owner's Mac -- a `~/Library/LaunchAgents/*.plist` or a
`crontab` line -- has `HOST = "launchd"`. Nothing outside the Mac can see it
fire, so the card is the only record the page and the Queen have.

- `SERVICE` is the launchd `Label` (`ai.t27.reviewer-bees`), or `crontab` for a crontab line.
- `REPO` is the repo the job's code lives in, or `mac` when it lives outside any repo.
- `StartInterval` N seconds -> `INTERVAL_MS = N*1000` and no `SCHEDULE`.
- `StartCalendarInterval` or a crontab line -> `SCHEDULE` as a cron expression and
  `TZ` = the Mac's zone (`Asia/Bangkok`), no `INTERVAL_MS`.
- `KeepAlive` with no schedule (a daemon) -> `SCHEDULE = ""` and a `SCHEDULE_NOTE` saying so.
- `CONTROL = "code-only"`: there is no remote handle. The Queen serves these cards
  `tick-only` (reported), never `workflow-dispatch`.
- `ID` is `launchd/<repo>/<label without ai.t27.>`. The code manifest does not scan
  the Mac, so a launchd card is `spec-only` by construction and is not warned for it.

How to answer "did it run?": `launchctl print gui/$(id -u)/<Label>` (`last exit code`,
`runs`) and the job's own log. Never paste a plist into a card: plists can carry keys.

## Language

Specs are English-only (t27 `LANG-EN`: `bootstrap/build.rs` fails the build on any
Cyrillic under `specs/`). There is no `SUMMARY_RU`. Translations are connected
through a spec: `specs/i18n/agents-<locale>.t27` (see `specs/i18n/README.md`)
declares the locale, the spec directories it covers (`SCOPE`), the fields a bundle
may translate (`FIELDS`: `SUMMARY`, `NAME`) and the bundle file that carries the
text (`BUNDLE_REPO`/`BUNDLE_PATH`, keyed by `ID`). The Russian layer is
`specs/i18n/agents-ru.t27` -> `trinity:apps/website/i18n/agents.ru.json`. The site's
generator discovers every `specs/i18n/*.t27`, loads each bundle, fails on an entry
whose `ID` matches no spec (`ORPHANS_ALLOWED = false`) and emits `summary`/`name`
as `{en, <locale>...}` plus an `i18n` list with the coverage per catalog. A spec
with no translation falls back to English (`FALLBACK = "en"`).

## Rules the generator enforces

- duplicate `ID` → build fails;
- a `RUNS` entry that names no skill spec → the job is marked `health: "fail"`;
- an `ID` absent from the code manifest → `witness: "spec-only"` (warn);
- every file must pass `typecheck.ok === true` with nothing discarded by the compiler.

As of the first commit every `RUNS` is empty: none of the 33 jobs was found to
invoke a Claude Code skill by name (checked in the workflow files and the code
catalog annotations). The link exists so that the day a job does, the spec says so.
