# HUD migration plan

Order: smallest .t27-only step first; anything that needs foreign code waits for the label or a port.

| Step | What | Source | Language | Gate |
|---|---|---|---|---|
| M0 | HUD shell, 5-tab rail with map tab, bottom tab bar on phones | specs/site/landing_ru.t27 | t27 | done (trinity#1906) |
| M1 | token block becomes `specs/site/hud_tokens.t27`, used by landing_ru and page_kit | specs/site, specs/widgets/views | t27 | emit-widget-pages byte identity |
| M2 | widget pages: HUD tokens in page_kit head CSS, no own header inside the panel | specs/widgets/views/page_kit.t27 | t27 | emit-widget-pages |
| M3 | 404 page as gen-text from specs/site/not_found.t27 | specs/site | t27 | new emit line |
| M4 | play, t27f, givel chrome: HUD tokens, no own header | locate generators first | audit | - |
| M5 | term pages | locate generator first | audit | - |
| M6 | lesson pages (673) | scripts/course-pages.mjs, JS | BLOCKED | port to t27c gen-text, or owner-approved-foreign |
| M7 | SPA routes in the panel: embed mode without app shell, one screen | src/pages/*.tsx, TSX | BLOCKED | owner-approved-foreign, or gen-text pages per route |

Checks per step: one screen at 1440x900, 900x800 and 375x812; every internal anchor opens its panel;
external hosts only github.com, t.me, x.com; tokens equal to HUD_DESIGN_TOKENS.md.
