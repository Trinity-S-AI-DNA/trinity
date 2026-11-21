# HUD-DESIGN-002 handoff (2026-11-19)

Repo Trinity-S-AI-DNA/trinity, branch `feat/ru-rail-icons`, PR #1906 (auto-merge squash queued), Refs #1905.

Done:
- RU HUD landing: spec `apps/website/specs/site/landing_ru.t27`, mirror `apps/website/public/ru/index.html`
  (hand-mirrored with sed; CI emit-widget-pages.yml checks byte identity).
- Rail = 5 tabs incl. "Karta" (map, #v-queen); no map button in top bar or hero; phone rail = bottom tab bar.
- Verified: 38/38 internal anchors, external hosts only github.com / t.me / x.com, one screen at
  1440x900, 900x800, 375x812.
- Audit + tokens + plan + status: this folder (HUD_DESIGN_AUDIT, HUD_DESIGN_TOKENS, HUD_MIGRATION_PLAN, PAGE_STATUS).

Next (HUD_MIGRATION_PLAN.md): M1 tokens module `specs/site/hud_tokens.t27`, M2 widget pages via page_kit.t27,
M3 404 gen-text page, M4/M5 locate play/t27f/givel/term generators. M6 lessons (JS) and M7 SPA (TSX) are
BLOCKED by only-t27 until a t27 port or the owner-approved-foreign label.

Rules: only .t27 code; no t27c builds on the Mac (CI compiles); after each push update the
`head_sha` in the PR #1906 body work-report and re-run
`gh pr merge 1906 -R Trinity-S-AI-DNA/trinity --squash --auto --match-head-commit <sha>`.
