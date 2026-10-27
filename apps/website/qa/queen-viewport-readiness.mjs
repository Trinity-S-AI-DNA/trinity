// The one sentence both ends of qa/queen-viewport-contract.mjs must agree on:
// at which sizes the probe asserts six sector rows.
//
// The probe asserts the rows only above 1100 px of width on a non-phone
// viewport -- the context column only claims that room there -- and never in
// the dead-API build, where zero rows is the expected shape. The readiness
// wait before the first click used to accept the live pill alone at every
// size, so on a loaded gate chain the pill answered before the rows rendered
// and the wars probe counted zero (main, 2026-10-24: 1440x900 wars FAIL
// COUNT sectors=0, with kanban and widgets passing seconds later on the same
// page). Both ends now read this predicate, so the wait cannot drift from
// the assertion it precedes.
export const sectorsAssertedAt = (w, phone, dead) => !dead && !phone && w > 1100;

// What "the data has answered" means in the readiness probe, interpolated
// into the page: in dead-api mode the cold pill; at the sizes that assert the
// rows, the rows themselves; everywhere else the live pill or the rows, as
// before.
export const readinessDataExpr = (w, phone, dead) =>
  dead ? 'dead' : sectorsAssertedAt(w, phone, dead) ? 'rows === 6' : '(live || rows === 6)';
