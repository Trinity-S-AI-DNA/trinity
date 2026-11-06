---
name: queen-hive-visuals
description: Maintain QUEEN's floating hive, original point-down TRINITY logo, sharp issue displays and matching camera interactions.
---

# QUEEN hive

- Original TRINITY logo: flat top, apex DOWN, exact27 petals/135 edges, inside
  the hub hexagon. Never substitute a generic triangle or mirror the mark.
  The header SVG and central scene mark must agree on screen orientation.
- The game logo is the symbol only, NO wordmark (`withLabel={false}`). Keep the
  existing black full-screen Babylon hive and HUD; do not replace them with a
  dashboard or SVG atlas. Shared specs, contributing repo cells and provenance
  edges are data layers in the same renderer. Only actual `.t27` contributors
  belong on the common map. Gold resources do not imply accepted GitHub issues.
- CANON approved 2026-09-07: central golden comb, outer repository hexes, thin
  provenance lines, black catalog-star space. Extend this view iteratively.
  Repository issue drill-down reuses the existing Babylon displays/status law
  in ONE continuous scene: every repo issue region coexists with the shared core.
  `world`/`task` are camera focus, not different scene identities or filtered
  membership. Picking/projection use the same region geometry; epic children
  join by repository AND issue number. Run `npm run check:queen-continuous`.
  Each canonical spec has a shared-core placement plus a placement inside every
  contributing repository's gold center. Issues occupy outer rings. Count
  unique spec IDs, never placements as new resources. Selecting either endpoint
  highlights all same-ID placements and frames their provenance links; close-up
  is a separate action. Use `npm run check:queen-spec-mirrors`, including fan-out.
  Issue/spec inspection and collaboration
  stay inside the game window: no automatic new tabs. Share links and agent
  packets carry canonical repo+issue identity, not leases or online-presence claims.
- `/specs?spec=<exact manifest path>` is the central spec surface. Reuse the
  existing Spec Explorer in embedded mode inside the game; do not maintain a
  second source viewer/compiler. The hive and atlas derive from its manifest and
  vendored source files. Validate exact paths and revision hashes, fail visibly
  on missing paths, and put canonical t27.ai catalog URLs in agent packets.
  Edited Explorer text is a draft, not a published or accepted specification.
  Run `npm run check:spec-catalog` after changing the catalog/map integration.
- The field faces the viewer vertically. Its180-degree turn uses the shared
  `queenHiveOrientation.ts` transform: local(x,height,z)→world(-x,z,height).
  Camera stays at+Z. Changing camera alpha by pi is a back-side view, not a
  half-turn; it reverses horizontal handedness. Do not revive that old patch.
- Match homepage Outfit for prose and JetBrains Mono for technical readouts,
  using existing assets/tokens. Keep cells translucent and the viewport fully
  filled after resize. Catalog stars require source, epoch, units and license;
  the HYG4.1/J2000 projection is not live sky ephemerides or random decoration.
- Surface material: the user rejected matte honey glass too. YELLOW spec faces
  are nearly transparent like the outer portals: no blur, inset haze or
  directional gradients. Keep golden contours and sharp text. Update both CSS
  faces and GPU caps; zoom must not restore an opaque fill. Do not restyle red
  issues or repository portals for this correction.
  Do not draw a stacked honey GPU cap for catalog specs: the gold contour is the
  spec surface. Never cover the cell with a second card, volume or gradient.
  Repo portals scale down with projected cells, never fixed-size overlays at
  overview. Keep portals nearly transparent with NO backdrop blur; it smears the
  gold core. Hide tiny text at low LOD. Preserve the approved light original look.
- All input uses the same coordinate convention: inverse ray-plane picking
  including wall drift, pan, cursor zoom, Inspect and bounds. Cell lift still
  comes toward the viewer. Native issue/epic text and HUD remain upright.
- Preserve original logo geometry in `QueenComb.tsx`, the same repo+issue
  identity across polls, exact event joins and canonical GitHub links. Historical
  GitHub titles are quoted source; only their individual nodes may be language
  exempt, never controls or whole cards.
- Issue mode: fill the WHOLE occupied hex, including overview LOD. Initial or
  unresolved goals are red; blockers bright red/!; running neon blue; review
  violet/◇; paused slate/Ⅱ; completed + proven T27
  is honey. Red task-goal fill does not assert manual-code provenance. Show the
  GitHub state separately; closed without issue→module proof still needs proof.
  Keep module-mode coverage law separate. Never infer coverage by title/position.
- Honey hover/focus is outline/lift only, never a status-fill replacement.
  Scene batches, native cards and whole-field counts share one paint resolver;
  same-identity state/proof changes must invalidate GPU paint without losing
  camera/selection. Do not invent events or worker throughput.
- Signal protocol: `docs/QUEEN_HIVE_SIGNALS.md`. Separate permanent fill from
  temporary event ring and interaction rim. Failure state beats a success-like
  event kind; result/finished is white, approved review green (never T27 proof).
  Fresh new identities only; initial/reconnect snapshots seed the cursor quietly.
  Newer recovery updates ring color without resetting its short TTL. Running
  board rows alone drive working rings. Stale data retains fills but suppresses
  relevant live animation; reduced-motion is static. Duplicate meanings in text.

- UX guardrails: this is one game window and one dynamic context panel. Do not
  open new browser tabs for issue/spec collaboration, do not replace the game
  with a generic dashboard, and do not change the shared header/logo treatment
  while tuning mobile UX. Improve by small, reversible iterations against the
  existing canon. GitHub issue identity stays visible at repository level and
  on the selected issue; controls remain English and source titles are quoted
  data, never translated by mutating the upstream issue.
  On narrow screens the Specs command stays in the same bottom rail, keeps a
  44px touch target, and remains explicitly labelled instead of collapsing to
  an ambiguous icon. The homepage may expose a compact Queen launch block below
  the existing Hero, but it must reuse the atlas and route into the same game;
  never embed a second Queen scene or fork its data logic.

Before changing orientation, add a failing projection/interaction regression.
Run `npm run check:queen-displays` in `apps/website` (includes Babylon projection
and roundtrip tests), the affected regressions and build. Inspect the actual
logo and cards on desktop/mobile, reduced-motion, and test tap, pan and zoom.
Do not treat a data attribute or old screenshot as proof. Production publication
requires explicit user authority and the existing site release checks.
