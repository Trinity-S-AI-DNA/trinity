# HUD design tokens

**The single source** is the token block in `apps/website/specs/site/landing_ru.t27`, lines 36-58
(`C_*`, `GLASS_BLUR`, `MAX_WIDTH`, `GRID_MIN`, `SP_*`, `FONT_*`). They are emitted into `:root` as CSS
variables. This file only names them; a value changes in the spec first, never here.

| Token (spec) | CSS variable | Value | Use |
|---|---|---|---|
| C_BG | --bg | #000 | page and tile background |
| C_TEXT | --text | #f2f2f2 | body text |
| C_MUTED | --muted | #a6a6a6 | secondary text |
| C_FOOT | --foot | #8a8a8a | footer, counters |
| C_KICK | --kick | #bbb | kickers, rail labels |
| C_CARD_LINE | --card-line | #333 | panel and rail borders, 1px |
| C_BADGE_LINE | --badge-line | #555 | pill button border, 1px |
| C_GLASS | --glass | rgba(18,18,20,0.72) | top bar, panels |
| GLASS_BLUR | --blur | blur(24px) saturate(140%) | glass backdrop |
| MAX_WIDTH | --maxw | 1120px | content width |
| GRID_MIN | --grid-min | 260px | card grid column |
| SP_1..SP_8 | --s1 --s2 --s3 --s4 --s6 --s8 | 8 16 24 32 48 64 px | spacing scale |
| FONT_SANS | --sans | Outfit, system-ui, -apple-system, sans-serif | body, 15.2px/1.5 |
| FONT_MONO | --mono | 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace | rail, 11px uppercase |

## Components

| Component | Rule |
|---|---|
| rail tab | mono 11px uppercase, 1px --card-line, icon 24x24 stroke; phone: bottom tab bar, 10px |
| panel | 1px --card-line, --glass, one screen, no outer scroll |
| pill button | radius 999px, 1px --badge-line |
| tile | --bg, padding --s1 |

## Next step

Move the block into its own module `specs/site/hud_tokens.t27` and have `landing_ru.t27` and
`widgets/views/page_kit.t27` `use` it. This needs a CI compile (no t27c builds on the Mac), so it
is migration step M1 in [HUD_MIGRATION_PLAN.md](HUD_MIGRATION_PLAN.md).
