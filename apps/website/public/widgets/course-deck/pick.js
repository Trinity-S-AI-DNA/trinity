// course-deck/pick.js -- which course the deck shows, given the catalog (courses/index.json) and
// the ?course= of the address. No ?course= shows the catalog's first course; a ?course= the
// catalog does not have shows nothing (the deck says SAY_NOT_FOUND), never another course in its
// place. Pure, so scripts/course-pages.test.mjs runs it.
export function pickCourse(catalog, wanted) {
  if (!Array.isArray(catalog) || !catalog.length) return null
  if (wanted === null || wanted === undefined || wanted === '') return catalog[0]
  return catalog.find((c) => c && c.id === wanted) ?? null
}
