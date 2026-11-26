# HUD design audit (HUD-DESIGN-002)

Contract **T27_HUD_V1**: one HUD; every internal section opens as a center panel; no page
transitions; the same colors, type, spacing and components everywhere; no visual islands.

Reference: `https://t27.ai/ru/`, generated from `apps/website/specs/site/landing_ru.t27`
(token block lines 36-58, see [HUD_DESIGN_TOKENS.md](HUD_DESIGN_TOKENS.md)).

Measured 2026-11-19 in the built-in browser. Static pages were measured from a local copy of
`apps/website/public/` in a 1440x900 frame. SPA routes were measured on live `t27.ai` with an
858px viewport. Each row reports body background, text color, font, base size, scrollHeight,
whether the page has a HUD rail, and its own header/nav.

| Page family | Files | bg | text | font / size | scrollHeight | HUD rail | own shell |
|---|---|---|---|---|---|---|---|
| `/ru/` | 1 | #000 | #f2f2f2 | Outfit 15.2px | 896 (one screen) | yes | glass top bar (the HUD) |
| `/learn/` | 336 | #000 | #e8eeec | Outfit 18px | 2760 | no | header |
| `/ru/learn/` | 337 | #000 | #e8eeec | Outfit 18px | 2736 | no | header |
| `/widgets/*` | 221 | #000 | #fff | system-ui 15px | 896 | no | header.t27-widget-head |
| `/term/` | 120 | #000 | #ebebeb | Outfit 16px | 11251 | no | none |
| `/play/` | 12 | #000 | #ebebeb | Outfit 15px | 896 | no | header |
| `/t27f/*` | 3 | #000 | #fff | Outfit 16px | 896 | no | header |
| `/apps/givel/` | 1 | #000 | #fff | system-ui 16px | 896 | no | none |
| `/404.html` | 1 | transparent | #fff | Times 16px | 896 | no | none |
| SPA `#/courses` | route | transparent | - | Outfit 15.2px | 4891 | no | 4 header/nav |
| SPA `#/queen` | route | #000 | - | Outfit 15.2px | 858 | no | 8 header/nav |
| SPA `#/blog` | route | transparent | - | Outfit 15.2px | 67258 | no | 4 header/nav |
| SPA `#/proof` | route | transparent | - | Outfit 15.2px | 20162 | no | 4 header/nav |
| SPA `#/specs` | route | transparent | - | Outfit 15.2px | 858 | no | 1 nav |
| SPA `#/docs` | route | transparent, main #0b0d0c | - | Outfit 15.2px | 938 | no | 2 header/nav |

## Per-page checklist

The HUD opens these pages in its center panel as iframes. Inside the panel, any page that brings
its own header, scrolls far, or uses another font or size becomes a visual island.

```
PAGE: /ru/ (HUD shell)
STATUS: MIGRATED
HUD_SHELL: PASS  COLORS: PASS  TYPOGRAPHY: PASS  SPACING: PASS  COMPONENTS: PASS
NAVIGATION: PASS  INTERNAL_LINKS: PASS (38/38)  ONE_SCREEN: PASS (1440x900, 900x800, 375x812)
NOTES: rail = 5 tabs incl. Karta; phone rail is a bottom tab bar. Spec landing_ru.t27.

PAGE: /learn/*, /ru/learn/* (673 lesson pages)
STATUS: BLOCKED
HUD_SHELL: FAIL  COLORS: FAIL (#e8eeec text)  TYPOGRAPHY: FAIL (18px)  SPACING: FAIL
COMPONENTS: FAIL  NAVIGATION: FAIL (own header)  INTERNAL_LINKS: PASS  ONE_SCREEN: FAIL (2760px)
NOTES: written by scripts/course-pages.mjs (JS) from specs/course/*.t27. Changing the output means
editing JS (only-t27) or porting the generator to t27c gen-text first.

PAGE: /widgets/* (221)
STATUS: NEEDS_MIGRATION
HUD_SHELL: FAIL  COLORS: FAIL (#fff text)  TYPOGRAPHY: FAIL (system-ui)  SPACING: FAIL
COMPONENTS: FAIL  NAVIGATION: FAIL (t27-widget-head)  INTERNAL_LINKS: PASS  ONE_SCREEN: PASS
NOTES: the views come from specs/widgets/views/*.t27 (emit-widget-pages.yml), so this is .t27 work:
switch the head/body CSS in page_kit.t27 to the HUD tokens and drop the header inside the panel.

PAGE: /term/ (120)
STATUS: NEEDS_MIGRATION
HUD_SHELL: FAIL  COLORS: FAIL  TYPOGRAPHY: FAIL (16px)  SPACING: FAIL  COMPONENTS: FAIL
NAVIGATION: FAIL  INTERNAL_LINKS: PASS  ONE_SCREEN: FAIL (11251px)
NOTES: generator not yet located; audit the source before migrating.

PAGE: /play/*, /t27f/*, /apps/givel/
STATUS: NEEDS_MIGRATION
HUD_SHELL: FAIL  COLORS: FAIL (#fff / #ebebeb)  TYPOGRAPHY: FAIL (15-16px, givel system-ui)
SPACING: FAIL  COMPONENTS: FAIL  NAVIGATION: FAIL (own header)  INTERNAL_LINKS: PASS  ONE_SCREEN: PASS
NOTES: these are canvas apps and fit one screen already; only the chrome differs.

PAGE: /404.html
STATUS: NEEDS_MIGRATION
HUD_SHELL: FAIL  COLORS: FAIL (transparent bg)  TYPOGRAPHY: FAIL (Times)  SPACING: FAIL
COMPONENTS: FAIL  NAVIGATION: FAIL  INTERNAL_LINKS: PASS  ONE_SCREEN: PASS
NOTES: small; a gen-text page in specs/site/ would replace it.

PAGE: SPA routes (#/courses, #/queen, #/blog, #/proof, #/specs, #/docs, ~30 routes)
STATUS: BLOCKED
HUD_SHELL: FAIL  COLORS: PASS (black)  TYPOGRAPHY: PASS (Outfit 15.2px)  SPACING: FAIL
COMPONENTS: FAIL  NAVIGATION: FAIL (1-8 own header/nav inside the panel)  INTERNAL_LINKS: PASS
ONE_SCREEN: FAIL (blog 67258px, proof 20162px, courses 4891px)
NOTES: React TSX in src/pages/*.tsx. Hiding the SPA shell in an embed mode is a TSX change,
so it needs the owner-approved-foreign label, or the route needs a t27 gen-text page instead.
```

## Totals

| STATUS | Families | Pages |
|---|---|---|
| MIGRATED | 1 | 1 |
| NEEDS_MIGRATION (.t27 path exists or is small) | 5 | 358 |
| BLOCKED (JS/TSX generator, only-t27) | 2 | 673 + ~30 routes |
