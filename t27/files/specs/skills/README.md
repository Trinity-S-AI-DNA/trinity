# specs/skills — skills as first-class `.t27` specs

> **Where this lives.** This directory in `gHashTag/t27` is the canonical home of these
> specs — edit them here. `gHashTag/trinity` keeps a vendored copy under
> `apps/website/public/t27/files/specs/skills/` and its build reads that copy through the
> vendored compiler wasm (`t27_compiler.wasm`). The wasm's `typecheck.ok` is necessary,
> not sufficient: it stays `true` for a wrong annotation such as `str = 5`, so the site's
> generator (`scripts/agents-from-specs.mjs`) also checks the field schema below. The
> bootstrap compiler on `master` was not run against these files in the commit that
> added them.


One file per Claude Code skill the site publishes (`apps/website/public/skills/manifest.json`).
The `.t27` file is the source of truth for the skill card on t27.ai; the JSON the site
serves (`public/skills/spec-skills.json`) is generated from these files by the real
compiler (`t27_compiler.wasm`), never by a regex.

File name: `<repo>-<skill-dir>.t27`; module name: `skill_<file name with underscores>`.

## Schema (every constant is `pub const`)

| constant      | type      | meaning                                                                 |
|---------------|-----------|-------------------------------------------------------------------------|
| `KIND`        | `str`     | always `"skill"`                                                        |
| `ID`          | `str`     | `<repo>/<dir>`; must equal the id in the code manifest                  |
| `NAME`        | `str`     | display name (frontmatter `name`, else the directory)                   |
| `REPO`        | `str`     | short repo name (`t27`, `trinity`, …)                                   |
| `SOURCE`      | `str`     | the skill file inside its directory (`SKILL.md` / `skill.md`)           |
| `SUMMARY_EN`  | `str`     | one-paragraph summary (English)                                         |
| `COMMAND`     | `str`     | how it is invoked (`/name argument-hint`); `""` when nothing is declared |
| `SPECS`       | `[N]str`  | `.t27` paths the skill stands on; `[0]str = []` when none is declared    |
| `TAGS`        | `[N]str`  | short topical tags                                                      |
| `ENABLED`     | `bool`    | whether the skill is offered                                            |
| `TIMEOUT_MIN` | `u16`     | budget in minutes (30 = default, nothing declared in SKILL.md)           |

## Witness labels the site derives

- `spec+code` — a spec here **and** the skill exists in the code manifest.
- `spec-only` — a spec here with no matching skill in code (warn).
- `code-only` — a skill in code with no spec here (listed, not invented).

A cron spec (`../crons/`) names the skills it launches in its `RUNS`; the site
shows that link in both directions (`runBy` on the skill card).

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

Validity: every file must pass `typecheck.ok === true` with empty
`discarded` / `lexerDiscarded` / `swallowed` under the vendored wasm compiler —
the site's `scripts/agents-from-specs.mjs` fails the build otherwise.
