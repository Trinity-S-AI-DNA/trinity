# Corona issue proof in the public map

Issue: https://github.com/Trinity-S-AI-DNA/trinity/issues/1360
Dependency: https://github.com/gHashTag/tt-trinity-corona/pull/13

The GitHub issue adapter formerly assigned `coverage: unknown` to every issue.
Closing Corona #1 therefore left a red cell even if a native proof was added.
The reader now implements `apps/website/specs/queen/issue_proof.t27` for the
explicitly supported Corona issues #1 and #12. Other repositories stay unknown.

Acceptance requires a closed issue, exact SHA-256 pins for the spec, native
seal, vectors, replay tool, Makefile and both CI and GDS workflows, plus successful canonical
push CI and GDS at the current default-branch SHA. PR/fork runs cannot substitute
for that accepted source. The latest matching failed run overrides an older
successful run. A failed refresh clears a cached positive result. Public reads
omit credentials; the successful proof cache lasts one minute.

The selected small Corona world is read from GitHub so dated open issue rows do
not override observed closure. Only a complete first page can update the portal
backlog count. A single inspected issue cannot establish the repository total.
Accepted cells show the immutable spec and exact CI/GDS source links and the
observation timestamp in the inspector.

## Reproduce

From `apps/website`:

```sh
npm ci
npm run check:queen-issue-proof
npm run check:queen-worlds
npm run check:queen-displays
npm run check:queen-continuous
npm run typecheck:ratchet
npm run build:ci
```

The checked generator analyzes/types the `.t27` with the vendored compiler,
executes its two tests (19 assertions), and verifies generated policy and all
16 conformance vectors. The reader test uses real SHA-256 over isolated HTTP
fixtures (37 cases) for acceptance, tampering, missing files, reopen, CI identity/failure,
rate limits and cache invalidation. The GDS workflow must match its pinned source
hash even when its run is green; changing or removing it fails closed.
The `.trinity/seals` receipt is created by
native t27c, not assembled by the reader.

To update evidence, first review the upstream accepted source and CI, then edit
the spec pins, regenerate with `node scripts/issue-proof-from-spec.mjs`, recreate
the native seal and run all checks. Do not weaken the reader to make a cell gold.

## Boundaries

Until Corona PR13 is accepted with successful canonical push CI/GDS, this reader
must leave its cells unverified. Unit fixtures are not live acceptance evidence.
The existing TypeScript ratchet has 179 baseline errors across 26 files; the
new change must add none. The game embedding at app.t27.ai has a separate Queen
source pin and requires deployment verification after the source PR is accepted.
This change establishes neither a fabricated chip nor reward/payment settlement.
## CI dependencies for fork contributions

The fork CI contract is in [corona_pr_gate.t27](../specs/ci/corona_pr_gate.t27).
Its [native seal](../.trinity/seals/ci_ci_corona_pr_gate.json) and
[68 vectors](../conformance/ci_corona_pr_gate.json) accompany the
[consumer and workflow regressions](../qa/ci-corona-pr-gate.mjs).
Optional comments and labels require a writable same-repository PR.
Build, unit, integration, stress, health and CLI phases remain required;
missing, failed, cancelled or skipped phases block the Brain merge gate.
The documentation consistency check follows T-JEPA to the immutable source
revision specified there; source presence does not establish model inference.

The documentation reference contract is in
[docs_reference_gate.t27](../specs/ci/docs_reference_gate.t27), with its
[native seal](../.trinity/seals/ci_ci_docs_reference_gate.json),
[14 vectors](../conformance/ci_docs_reference_gate.json) and
[executed consumer regressions](../qa/docs-reference-gate.mjs).
It checks tracked Markdown/MDX targets against files and the actual built
Docusaurus routes. Missing targets, malformed URLs and HTTP400/404/410 block
the source gate. Authorization/rate limits and network/server failures are
explicitly unconfirmed observations, never verified links. The CI artifact
lists each observation and its time; a successful source gate does not prove
every external page is available. Fragment anchors are not measured here.

To reproduce these CI checks from the repository root:

```sh
node scripts/ci-gate-from-spec.mjs --check
node qa/ci-corona-pr-gate.mjs
npm ci --prefix docs --ignore-scripts
npm run build --prefix docs
node scripts/docs-gate-from-spec.mjs --check
node qa/docs-reference-gate.mjs
node scripts/docs-reference-check.mjs --external --report work/docs-reference-report.json
```
