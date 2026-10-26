# Queen evidence disclosure - 2026-09-30

Issue: https://github.com/Trinity-S-AI-DNA/trinity/issues/1194

## Sources and scope

- Physical layer-0 FFN: trinity-memory PRs #93 and #95. Counts and clock split
  pin merge a301e1a7b73a6482c819a38d347342bbb693ffdc, report directory
  reports/fpga/ffn-clock-split-2026-09-30-757f191b.
- Two reports, seed27 and zero, each pass 32768 stage values. Both have
  compute=118308783. The disclosure uses seed27 for percentage denominators.
- Ternary Check Live: observed public table dated 2026-09-28: 501 models,
  289 repositories, 570 files. This is a dated pinned-reader snapshot, not
  a claim about current reader heads. Link to the live table for updates.
- No BRAM packing/paper measurements are included. No full-model inference,
  quality, energy or cross-design throughput claims. CRC-rejected readbacks
  are disclosed; successfully repeated frames are the verified source.
- Evidence levels are a legend, not assigned verification of catalog cells.

## Implementation

Site-local source spec: public/t27/files/specs/ui/queen_evidence.t27.
The existing WASM compiler parses it; its AST constants and evaluated test
blocks generate src/lib/queenEvidence.generated.ts. This new spec is not
represented as an upstream-vendored catalog entry. Website CI and the apex
deployment check the generated output for staleness.

An initially collapsed native details control joins the catalog toolbar.
Its scrollable body exposes pinned captures, PRs, the live table, browser
checker and findings ledger. English and Russian copy keep the same limits.

## Verification

- node scripts/queen-evidence-from-spec.mjs --check: PASS, 2 tests / 3 asserts.
- Generated counts/clocks compared to both independent-verification.json
  reports in the local trinity-memory evidence checkout: PASS.
- npx vite build: PASS. Existing font-resolution and chunk-size warnings.
- npm run typecheck:ratchet: PASS; 179 errors / 26 files equal the baseline,
  no file gained errors. This is not a clean TypeScript build.
- npm run check:api: PASS; existing 110 unmapped fields unchanged.
- node qa/queen-catalog-hive.mjs: PASS, 1577 specs / 12 repositories.
- npm run check:subpath-urls: PASS.
- npm run check:queen-contrast: PASS; new stylesheet registered under both
  route roots, with eight body-text AA checks for evidence inks/surfaces.
- ARIA references: initial invocation failed because the existing script uses
  URL.pathname without decoding the workspace's space. Re-run through a
  space-free /tmp symlink with Node preserve-symlinks flags: PASS, 39 references.
- BrowserOS neo: desktop EN 1254x860 and phone RU 390x844 rendered and
  screenshots inspected. Disclosure expands and scrolls; document horizontal
  overflow=false. Phone search control stays on its own toolbar row.

## Publication

The app.t27.ai Queen page embeds t27.ai. Source changes alone do not update
that apex. The deploy-site workflow copies the build into
gHashTag/ghashtag.github.io; dmitrii-f-t27 has no push permission there.
Merge and deployment remain with the repository owner per project policy.

## CI follow-up

The initial website gate caught the unregistered evidence stylesheet; it is
now registered and passes locally. The work-report validator caught a short
blog outline entry; the PR report is corrected before validation/re-submission.
Separate initial failures were missing src/hslm/tjepa.zig in Documentation
Consistency, an unimplemented tri stress --health score, and HTTP 401 in the
project automation. These are outside the changed website files and are not
reported as passing. Review the PR checks for the latest head before merging.
