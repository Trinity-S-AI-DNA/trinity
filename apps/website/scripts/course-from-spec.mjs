#!/usr/bin/env node
// course-from-spec.mjs -- the courses at #/course and #/ai-numbers from `specs/course/courses.t27`.
//
// The catalog names the courses, in reading order; each course is its own spec with its own
// Russian contract (`specs/course/<id>.t27`, `specs/course/<id>-ru.t27`). Every spec is read
// through the real compiler (`t27_compiler.wasm`): the constant schema is checked and every
// `test` block evaluated against the declared constants. Then what the specs point at:
//
//   - every course has the catalog's shape (27 lessons in 9 modules of 3) and the same page
//     strings, so one page draws any of them;
//   - lesson ids are unique across the courses (each has one static page under learn/) and no
//     lesson id is a course's share directory;
//   - every widget a lesson opens or offers is in the widget gallery (queenWidgets.generated.ts,
//     itself generated from specs/widgets/gallery.t27), no two lessons of any course open the
//     same one, and every gallery widget is used by some lesson;
//   - every lesson names a spec under public/t27/files/ that compiles clean, all seven backends;
//   - each Russian bundle covers every field, carries no key its course does not have, keeps
//     every number and {placeholder} of the English field, and neither language makes a
//     superlative claim (the docs generator's FORBIDDEN_* lists).
//
// The courses add no words of their own: each one is in a spec or a bundle. Writes the files
// nobody edits by hand:
//
//   src/lib/course.generated.ts   what src/pages/Course.tsx draws, every course
//   src/lib/courseRoutes.generated.ts   the course addresses alone, for the router, the
//                                 starfield and the menu (src/main.tsx etc.), so none of them
//                                 lists courses by hand and none loads the courses to route
//
// and holds the menu (src/components/Navigation.tsx) to an entry for every course address.
//   public/learn/<id>.t27         each course spec, byte for byte (its pages link to it)
//
// Run:      node scripts/course-from-spec.mjs            (write)
//           node scripts/course-from-spec.mjs --check    (fail if the committed files are stale)
//           node scripts/course-from-spec.mjs --json     (print the courses as JSON)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CYRILLIC, SITE, checkSchema, compilerErrors, constsOf, loadCompiler, sha256, verdictOf } from './agents-from-specs.mjs'
import { LESSON_BACKENDS } from './lesson-specs.mjs'
import { FORBIDDEN_EN, FORBIDDEN_RU } from './docs-from-specs.mjs'
import { runSpecTests } from './viewport-from-spec.mjs'

const WASM = 'public/t27/t27_compiler.wasm'
export const CATALOG_SPEC = 'specs/course/courses.t27'
export const TS_OUT = 'src/lib/course.generated.ts'
export const ROUTES_OUT = 'src/lib/courseRoutes.generated.ts'
export const NAV_TSX = 'src/components/Navigation.tsx'
export const GALLERY_TS = 'src/lib/queenWidgets.generated.ts'
export const LESSON_SPEC_ROOT = 'public/t27/files'
export const SHARE_BASE = 'learn'
/** Where a course's spec, its Russian contract and its published copy live, by course id. */
export const courseSpecOf = (id) => `specs/course/${id}.t27`
export const ruSpecOf = (id) => `specs/course/${id}-ru.t27`
export const publicSpecOf = (id) => `public/${SHARE_BASE}/${id}.t27`
/** A t27 module name has no '-': ai-numbers is module ai_numbers, its contract ai_numbers_ru. */
const moduleOf = (id) => id.replace(/-/g, '_')
const BACKENDS = LESSON_BACKENDS

const CATALOG_REQUIRED = {
  KIND: 'str', SCHEMA_VERSION: 'u8', GENERATED: 'arr', COURSE_COUNT: 'u8', COURSE_IDS: 'arr', COURSE_SPECS: 'arr',
  LESSONS_PER_COURSE: 'u8', MODULES_PER_COURSE: 'u8', LESSONS_PER_MODULE: 'u8', PROGRESS_KEY: 'str', SHARE_BASE: 'str',
}
const REQUIRED = {
  KIND: 'str', ID: 'str', SCHEMA_VERSION: 'u8', GENERATED: 'arr', ROUTE: 'str', SHARE_PATH: 'str', GALLERY: 'str', LOCALES: 'arr', RU_CONTRACT: 'str',
  PROGRESS_KEY: 'str', SENDS_NOTHING: 'bool', COHORT_ROUTE: 'str', TOOL_FRAME_HEIGHT: 'u16', PLAYER_FRAME_HEIGHT: 'u16', TITLE: 'str', DESCRIPTION: 'str',
  LESSONS_PER_MODULE: 'u8', MODULE_COUNT: 'u8', MODULE_IDS: 'arr', MODULE_TITLES: 'arr', MODULE_LINES: 'arr',
  LESSON_COUNT: 'u8', LESSON_IDS: 'arr', LESSON_MODULES: 'arr', LESSON_WIDGETS: 'arr', LESSON_ALSO: 'arr', LESSON_SPECS: 'arr',
  LESSON_TITLES: 'arr', LESSON_GOALS: 'arr', LESSON_TEXTS: 'arr', LESSON_TASKS: 'arr',
}
const RU_REQUIRED = {
  KIND: 'str', LOCALE: 'str', SOURCE_LOCALE: 'str', SOURCE_SPEC: 'str', BUNDLE_REPO: 'str', BUNDLE_PATH: 'str', BUNDLE_FORMAT: 'str',
  MODULE_FIELDS: 'arr', LESSON_FIELDS: 'arr', UI_KEY: 'str', FALLBACK: 'str', COVERAGE_REQUIRED: 'bool', ORPHANS_ALLOWED: 'bool', ENABLED: 'bool',
}
const PARALLEL = {
  MODULE_COUNT: ['MODULE_IDS', 'MODULE_TITLES', 'MODULE_LINES'],
  LESSON_COUNT: ['LESSON_IDS', 'LESSON_MODULES', 'LESSON_WIDGETS', 'LESSON_ALSO', 'LESSON_SPECS', 'LESSON_TITLES', 'LESSON_GOALS', 'LESSON_TEXTS', 'LESSON_TASKS'],
}
// The English field each Russian field translates.
const MODULE_SOURCE = { TITLE: 'MODULE_TITLES', LINE: 'MODULE_LINES' }
const LESSON_SOURCE = { TITLE: 'LESSON_TITLES', GOAL: 'LESSON_GOALS', TEXT: 'LESSON_TEXTS', TASK: 'LESSON_TASKS' }
// The page strings: every SAY_ constant, plus the title and description.
const sayNames = (f) => ['TITLE', 'DESCRIPTION', ...Object.keys(f).filter((k) => k.startsWith('SAY_')).map((k) => k.slice(4)).sort()]
const sayOf = (f, key) => (key === 'TITLE' || key === 'DESCRIPTION' ? f[key] : f[`SAY_${key}`])

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const uniq = (values) => new Set(values).size === values.length
const ID_RE = /^[a-z0-9][a-z0-9-]*$/
const listOf = (s) => (s ? s.split(',').map((x) => x.trim()) : [])
/** The digits of a text as a sorted multiset: a translation carries numbers, it never derives them. */
export const digitsOf = (s) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/[^\d]/g, '')).sort()
export const placeholdersOf = (s) => (s.match(/\{\d+\}/g) ?? []).sort()
const forbidden = (s, re) => [...s.matchAll(new RegExp(re.source, re.flags))].map((m) => m[0])

/** The gallery as the widget generator wrote it. */
export function readGallery(root = SITE) {
  const ts = readFileSync(join(root, GALLERY_TS), 'utf8')
  const body = ts.match(/export const QUEEN_WIDGETS = ([\s\S]*?) as const\n/)?.[1]
  if (!body) throw new Error(`${GALLERY_TS}: no QUEEN_WIDGETS literal`)
  return JSON.parse(body)
}

/** The catalog: which courses exist, in which order, and the shape every one of them has. */
export function catalogProblems(c, file = CATALOG_SPEC) {
  const p = []
  if (c.KIND !== 'courses') p.push(`${file}: KIND must be "courses"`)
  if (c.SCHEMA_VERSION !== 1) p.push(`${file}: SCHEMA_VERSION must be 1`)
  if (!same(c.GENERATED, [TS_OUT, ROUTES_OUT])) p.push(`${file}: GENERATED must be ${JSON.stringify([TS_OUT, ROUTES_OUT])}`)
  if (c.SHARE_BASE !== SHARE_BASE) p.push(`${file}: SHARE_BASE must be ${SHARE_BASE}`)
  for (const name of ['COURSE_IDS', 'COURSE_SPECS']) if (c[name].length !== c.COURSE_COUNT) p.push(`${file}: ${name}.length ${c[name].length} != COURSE_COUNT ${c.COURSE_COUNT}`)
  if (!uniq(c.COURSE_IDS)) p.push(`${file}: COURSE_IDS must be unique`)
  c.COURSE_IDS.forEach((id, i) => {
    if (!ID_RE.test(id)) p.push(`${file}: COURSE_IDS entry ${JSON.stringify(id)} is not a lower-case slug`)
    if (c.COURSE_SPECS[i] !== courseSpecOf(id)) p.push(`${file}: COURSE_SPECS[${i}] must be ${courseSpecOf(id)}`)
  })
  if (c.MODULES_PER_COURSE * c.LESSONS_PER_MODULE !== c.LESSONS_PER_COURSE) p.push(`${file}: MODULES_PER_COURSE * LESSONS_PER_MODULE != LESSONS_PER_COURSE`)
  return p
}

export function semanticProblems(f, catalog, id, file = courseSpecOf(id)) {
  const p = []
  if (f.KIND !== 'course') p.push(`${file}: KIND must be "course"`)
  if (f.ID !== id) p.push(`${file}: ID must be ${id}, its name in ${CATALOG_SPEC}`)
  if (f.SCHEMA_VERSION !== 1) p.push(`${file}: SCHEMA_VERSION must be 1`)
  if (!same(f.GENERATED, [TS_OUT, publicSpecOf(id)])) p.push(`${file}: GENERATED must be ${JSON.stringify([TS_OUT, publicSpecOf(id)])}`)
  if (f.RU_CONTRACT !== ruSpecOf(id)) p.push(`${file}: RU_CONTRACT must be ${ruSpecOf(id)}`)
  // The first course's pages are the learn/ index every older link points at; the next ones get a directory of their own.
  const share = id === catalog.COURSE_IDS[0] ? `${SHARE_BASE}/` : `${SHARE_BASE}/${id}/`
  if (f.SHARE_PATH !== share) p.push(`${file}: SHARE_PATH must be ${share}`)
  if (f.PROGRESS_KEY !== catalog.PROGRESS_KEY) p.push(`${file}: PROGRESS_KEY must be ${catalog.PROGRESS_KEY}, the catalog's; one key keeps a reader's marks across the courses`)
  if (f.SENDS_NOTHING !== true) p.push(`${file}: SENDS_NOTHING must be true; progress stays in the reader's browser`)
  if (f.LOCALES[0] !== 'en') p.push(`${file}: LOCALES must start with "en", the language of the spec`)
  for (const [countName, arrays] of Object.entries(PARALLEL)) {
    for (const name of arrays) if (f[name].length !== f[countName]) p.push(`${file}: ${name}.length ${f[name].length} != ${countName} ${f[countName]}`)
  }
  if (f.LESSON_COUNT !== catalog.LESSONS_PER_COURSE) p.push(`${file}: LESSON_COUNT ${f.LESSON_COUNT} != ${catalog.LESSONS_PER_COURSE}; every course has ${catalog.LESSONS_PER_COURSE} lessons`)
  if (f.MODULE_COUNT !== catalog.MODULES_PER_COURSE) p.push(`${file}: MODULE_COUNT ${f.MODULE_COUNT} != ${catalog.MODULES_PER_COURSE}`)
  if (f.LESSONS_PER_MODULE !== catalog.LESSONS_PER_MODULE) p.push(`${file}: LESSONS_PER_MODULE ${f.LESSONS_PER_MODULE} != ${catalog.LESSONS_PER_MODULE}`)
  if (f.MODULE_COUNT * f.LESSONS_PER_MODULE !== f.LESSON_COUNT) p.push(`${file}: MODULE_COUNT * LESSONS_PER_MODULE != LESSON_COUNT`)
  for (const ids of ['MODULE_IDS', 'LESSON_IDS']) {
    if (!uniq(f[ids])) p.push(`${file}: ${ids} must be unique`)
    f[ids].forEach((x) => { if (!ID_RE.test(x)) p.push(`${file}: ${ids} entry ${JSON.stringify(x)} is not a lower-case slug`) })
  }
  // Modules run in order, LESSONS_PER_MODULE lessons each.
  f.LESSON_MODULES.forEach((m, i) => {
    const want = f.MODULE_IDS[Math.floor(i / f.LESSONS_PER_MODULE)]
    if (m !== want) p.push(`${file}: LESSON_MODULES[${i}] is ${m}; lesson ${i + 1} belongs to module ${want}`)
  })
  for (const name of ['MODULE_TITLES', 'MODULE_LINES', 'LESSON_TITLES', 'LESSON_GOALS', 'LESSON_TEXTS', 'LESSON_TASKS']) {
    f[name].forEach((s, i) => { if (!s.trim()) p.push(`${file}: ${name}[${i}] is empty`) })
  }
  for (const key of sayNames(f)) {
    const s = sayOf(f, key)
    if (typeof s !== 'string' || !s.trim()) p.push(`${file}: ${key === 'TITLE' || key === 'DESCRIPTION' ? key : `SAY_${key}`} is empty`)
  }
  const english = [f.TITLE, f.DESCRIPTION, ...sayNames(f).map((k) => sayOf(f, k)), ...f.MODULE_TITLES, ...f.MODULE_LINES, ...f.LESSON_TITLES, ...f.LESSON_GOALS, ...f.LESSON_TEXTS, ...f.LESSON_TASKS]
  for (const s of english) for (const hit of forbidden(s, FORBIDDEN_EN)) p.push(`${file}: superlative ${JSON.stringify(hit)} in ${JSON.stringify(s.slice(0, 60))}`)
  return p
}

/** Every widget named exists; main widgets are framable. */
export function widgetProblems(f, gallery, file) {
  const p = []
  const byId = new Map(gallery.widgets.map((w) => [w.id, w]))
  f.LESSON_IDS.forEach((id, i) => {
    const main = f.LESSON_WIDGETS[i]
    const w = byId.get(main)
    if (!w) p.push(`${file}: lesson ${id} opens ${main}, which ${f.GALLERY} does not have`)
    else if (!w.preview) p.push(`${file}: lesson ${id} opens ${main}, a ${w.kind} with no framable page; offer it under LESSON_ALSO`)
    for (const also of listOf(f.LESSON_ALSO[i])) {
      if (!byId.has(also)) p.push(`${file}: lesson ${id} offers ${also}, which ${f.GALLERY} does not have`)
      if (also === main) p.push(`${file}: lesson ${id} offers its own widget ${also} again`)
    }
  })
  return p
}

/** Across the courses: a lesson id names one page, a widget opens in one lesson, the gallery is covered. */
export function acrossProblems(courses, gallery) {
  const p = []
  const lessonIds = courses.flatMap((c) => c.f.LESSON_IDS)
  const dupes = (xs) => [...new Set(xs.filter((x, i) => xs.indexOf(x) !== i))]
  for (const id of dupes(lessonIds)) p.push(`${CATALOG_SPEC}: lesson ${id} is in two courses; its page learn/${id}/ can show one`)
  for (const c of courses) {
    const dir = c.f.SHARE_PATH.split('/').filter(Boolean).at(-1)
    if (dir !== SHARE_BASE && lessonIds.includes(dir)) p.push(`${c.file}: lesson id ${dir} is also the course's share directory`)
  }
  const mains = courses.flatMap((c) => c.f.LESSON_WIDGETS)
  for (const w of dupes(mains)) p.push(`${CATALOG_SPEC}: LESSON_WIDGETS must be unique; ${w} is opened by two lessons, every lesson opens its own widget`)
  const used = new Set(courses.flatMap((c) => [...c.f.LESSON_WIDGETS, ...c.f.LESSON_ALSO.flatMap(listOf)]))
  for (const w of gallery.widgets) if (!used.has(w.id)) p.push(`${CATALOG_SPEC}: gallery widget ${w.id} is in no lesson; the courses cover the whole gallery`)
  const says = (c) => JSON.stringify(sayNames(c.f))
  for (const c of courses.slice(1)) if (says(c) !== says(courses[0])) p.push(`${c.file}: page strings ${sayNames(c.f).join(',')} differ from ${courses[0].file}; one page draws every course`)
  return p
}

/** Every lesson names a spec, and it compiles clean on every backend. */
export function lessonSpecProblems(f, analyze, root = SITE, file) {
  const p = []
  f.LESSON_SPECS.forEach((path, i) => {
    if (!path) { p.push(`${file}: lesson ${f.LESSON_IDS[i]} names no spec; every lesson shows the t27 behind it`); return }
    const at = join(root, LESSON_SPEC_ROOT, path)
    if (!/^specs\/[A-Za-z0-9_\-/.]+\.t27$/.test(path)) { p.push(`${file}: LESSON_SPECS[${i}] ${path} is not specs/<path>.t27`); return }
    if (!existsSync(at)) { p.push(`${file}: LESSON_SPECS[${i}] ${LESSON_SPEC_ROOT}/${path} is missing`); return }
    const a = analyze(readFileSync(at, 'utf8'))
    const v = verdictOf(a)
    const bad = BACKENDS.filter((b) => !a.targets?.[b]?.ok)
    if (!v.typecheckOk || v.errors || v.discarded || !v.hirOk || bad.length) p.push(`${file}: lesson ${f.LESSON_IDS[i]} spec ${path} is not clean (${JSON.stringify(v)}${bad.length ? `, backends ${bad.join(',')}` : ''}); a lesson shows a spec that compiles`)
  })
  return p
}

/** A Russian bundle against its contract and the English fields. */
export function bundleProblems(f, ru, bundle, bundlePath, ruSpec = ruSpecOf(f.ID)) {
  const p = []
  const strict = ru.COVERAGE_REQUIRED
  const check = (where, en, tr) => {
    if (typeof tr !== 'string' || !tr.trim()) { if (strict) p.push(`${bundlePath}: ${where} is missing`); return }
    if (!CYRILLIC.test(tr)) p.push(`${bundlePath}: ${where} has no Cyrillic; untranslated`)
    if (!same(digitsOf(en), digitsOf(tr))) p.push(`${bundlePath}: ${where} numbers ${JSON.stringify(digitsOf(tr))} != English ${JSON.stringify(digitsOf(en))}`)
    if (!same(placeholdersOf(en), placeholdersOf(tr))) p.push(`${bundlePath}: ${where} placeholders ${placeholdersOf(tr).join(' ')} != English ${placeholdersOf(en).join(' ')}`)
    for (const hit of forbidden(tr, FORBIDDEN_RU)) p.push(`${bundlePath}: ${where} superlative ${JSON.stringify(hit)}`)
  }
  if (bundle.$spec !== ruSpec) p.push(`${bundlePath}: $spec must be ${ruSpec}`)
  if (bundle.locale !== ru.LOCALE) p.push(`${bundlePath}: locale ${bundle.locale} != contract ${ru.LOCALE}`)
  const ui = bundle[ru.UI_KEY] ?? {}
  const modules = bundle.modules ?? {}
  const lessons = bundle.lessons ?? {}
  const says = sayNames(f)
  for (const k of says) check(`${ru.UI_KEY}.${k}`, sayOf(f, k), ui[k])
  f.MODULE_IDS.forEach((id, i) => { for (const field of ru.MODULE_FIELDS) check(`modules.${id}.${field}`, f[MODULE_SOURCE[field]][i], modules[id]?.[field]) })
  f.LESSON_IDS.forEach((id, i) => { for (const field of ru.LESSON_FIELDS) check(`lessons.${id}.${field}`, f[LESSON_SOURCE[field]][i], lessons[id]?.[field]) })
  if (!ru.ORPHANS_ALLOWED) {
    const known = new Set(['$spec', '$note', 'locale', ru.UI_KEY, 'modules', 'lessons'])
    for (const k of Object.keys(bundle)) if (!known.has(k)) p.push(`${bundlePath}: key ${k} is not part of the course`)
    for (const k of Object.keys(ui)) if (!says.includes(k)) p.push(`${bundlePath}: ${ru.UI_KEY}.${k} names no SAY_ constant`)
    for (const [k, v] of Object.entries(modules)) {
      if (!f.MODULE_IDS.includes(k)) p.push(`${bundlePath}: modules.${k} is not a module`)
      for (const field of Object.keys(v)) if (!ru.MODULE_FIELDS.includes(field)) p.push(`${bundlePath}: modules.${k}.${field} is not a translated field`)
    }
    for (const [k, v] of Object.entries(lessons)) {
      if (!f.LESSON_IDS.includes(k)) p.push(`${bundlePath}: lessons.${k} is not a lesson`)
      for (const field of Object.keys(v)) if (!ru.LESSON_FIELDS.includes(field)) p.push(`${bundlePath}: lessons.${k}.${field} is not a translated field`)
    }
  }
  return p
}

/** What a lesson's frame shows for one gallery widget. */
const frameOf = (w, f) => ({
  id: w.id, kind: w.kind, title: w.title, url: w.url, preview: w.preview,
  height: w.kind === 'player' ? f.PLAYER_FRAME_HEIGHT : f.TOOL_FRAME_HEIGHT,
})

export function courseOf(f, ru, bundle, gallery, specSha, playerBuild) {
  const byId = new Map(gallery.widgets.map((w) => [w.id, w]))
  const say = (locale) => Object.fromEntries(sayNames(f).map((k) => [k, locale === 'en' ? sayOf(f, k) : bundle[ru.UI_KEY][k]]))
  const specFrame = (path) => ({
    path, source: `t27/files/${path}`,
    preview: `play/embed.html?spec=${encodeURIComponent(path)}&tab=term${playerBuild ? `&v=${playerBuild}` : ''}`,
    height: f.PLAYER_FRAME_HEIGHT,
  })
  return {
    id: f.ID,
    source: { spec: courseSpecOf(f.ID), publicSpec: publicSpecOf(f.ID), ruContract: ruSpecOf(f.ID), ruBundle: ru.BUNDLE_PATH, sha256: specSha, schemaVersion: f.SCHEMA_VERSION, gallery: f.GALLERY },
    route: f.ROUTE,
    share: f.SHARE_PATH,
    cohortRoute: f.COHORT_ROUTE,
    progressKey: f.PROGRESS_KEY,
    sendsNothing: f.SENDS_NOTHING,
    locales: f.LOCALES,
    say: { en: say('en'), ru: say('ru') },
    modules: f.MODULE_IDS.map((id, i) => ({
      id, n: i + 1,
      lessons: f.LESSON_IDS.filter((_, j) => f.LESSON_MODULES[j] === id),
      en: { title: f.MODULE_TITLES[i], line: f.MODULE_LINES[i] },
      ru: { title: bundle.modules[id].TITLE, line: bundle.modules[id].LINE },
    })),
    lessons: f.LESSON_IDS.map((id, i) => ({
      id, n: i + 1, module: f.LESSON_MODULES[i],
      widget: frameOf(byId.get(f.LESSON_WIDGETS[i]), f),
      also: listOf(f.LESSON_ALSO[i]).map((a) => frameOf(byId.get(a), f)),
      spec: specFrame(f.LESSON_SPECS[i]),
      en: { title: f.LESSON_TITLES[i], goal: f.LESSON_GOALS[i], text: f.LESSON_TEXTS[i], task: f.LESSON_TASKS[i] },
      ru: { title: bundle.lessons[id].TITLE, goal: bundle.lessons[id].GOAL, text: bundle.lessons[id].TEXT, task: bundle.lessons[id].TASK },
    })),
  }
}

/** The neighbour a course hands its reader to, or comes from: enough to draw the link. */
const linkOf = (c) => (c ? { id: c.id, route: c.route, share: c.share, first: c.lessons[0].id, last: c.lessons.at(-1).id, title: { en: c.say.en.TITLE, ru: c.say.ru.TITLE } } : null)

/** The courses in catalog order, each knowing the one before and the one after it. */
export const chainOf = (courses) => courses.map((c, i) => ({ ...c, prev: linkOf(courses[i - 1]), next: linkOf(courses[i + 1]) }))

export const renderTs = (courses) => `// GENERATED by scripts/course-from-spec.mjs from ${CATALOG_SPEC}, ${courses.map((c) => c.source.spec).join(', ')} and their Russian bundles\n// spec sha256 ${courses.map((c) => `${c.id} ${c.source.sha256}`).join(', ')}\n// Do not edit: change the .t27 source (or a Russian bundle) and regenerate.\n\nexport const COURSES = ${JSON.stringify(courses, null, 2)} as const\n\n/** The course every older link means: the first in the catalog. */\nexport const COURSE = COURSES[0]\n\nexport type Course = (typeof COURSES)[number]\nexport type CourseLesson = Course['lessons'][number]\nexport type CourseFrame = CourseLesson['widget']\n`

export const renderRoutesTs = (courses) => `// GENERATED by scripts/course-from-spec.mjs from ${CATALOG_SPEC}
// Do not edit: change the .t27 source and regenerate.

/** Every course's address in the app (#/<route>, #/<route>/<lesson>), in reading order. */
export const COURSE_ROUTES = ${JSON.stringify(courses.map((c) => c.route))} as const
`

/** The menu offers every course: a course with an address but no entry is found only by its chain link. */
export const navProblems = (courses, navText, file = NAV_TSX) =>
  courses.filter((c) => !navText.includes(`href: '#/${c.route}'`)).map((c) => `${file}: no menu entry for #/${c.route} (${c.id})`)

function readSpec(name, text, analyze, required) {
  const problems = []
  const analysis = analyze(text)
  const verdict = verdictOf(analysis)
  if (!verdict.typecheckOk || verdict.discarded > 0 || !verdict.hirOk) problems.push(`${name}: compiler verdict not clean (${JSON.stringify(verdict)})`)
  problems.push(...compilerErrors(analysis).map((m) => `${name}: ${m}`))
  if (/[^\x00-\x7f]/.test(text)) problems.push(`${name}: non-ASCII byte in the spec (L3)`)
  if (CYRILLIC.test(text)) problems.push(`${name}: Cyrillic in the spec (LANG-EN); Russian belongs in the bundle`)
  let consts = {}
  try { consts = constsOf(analysis) } catch (e) { problems.push(`${name}: ${e.message}`) }
  // Page strings are SAY_<NAME> constants: any number of them, each a str.
  const says = Object.fromEntries(Object.keys(consts).filter((k) => k.startsWith('SAY_')).map((k) => [k, 'str']))
  problems.push(...checkSchema(consts, required, says, name))
  const fields = Object.fromEntries(Object.entries(consts).map(([k, v]) => [k, v.value]))
  let tests = { tests: 0, asserts: 0, failures: [] }
  if (problems.length === 0) {
    tests = runSpecTests(analysis, fields)
    if (tests.tests === 0) problems.push(`${name}: no test block; the spec must test its own invariants`)
    problems.push(...tests.failures.map((m) => `${name}: test ${m}`))
  }
  return { analysis, fields, tests, problems }
}

/** One course: its spec, its contract and its bundle, each against the catalog. */
function readCourse(id, { specText, ruText, bundleText }, catalog, analyze, gallery, root) {
  const file = courseSpecOf(id)
  const ruFile = ruSpecOf(id)
  const course = readSpec(file, specText, analyze, REQUIRED)
  const ru = readSpec(ruFile, ruText, analyze, RU_REQUIRED)
  const problems = [...course.problems, ...ru.problems]
  if (course.analysis.ast?.name !== moduleOf(id)) problems.push(`${file}: module must be ${moduleOf(id)}`)
  if (ru.analysis.ast?.name !== `${moduleOf(id)}_ru`) problems.push(`${ruFile}: module must be ${moduleOf(id)}_ru`)
  const f = course.fields
  const r = ru.fields
  let bundle = null
  if (problems.length === 0) {
    problems.push(...semanticProblems(f, catalog, id, file))
    if (r.SOURCE_SPEC !== file) problems.push(`${ruFile}: SOURCE_SPEC must be ${file}`)
    if (!f.LOCALES.includes(r.LOCALE)) problems.push(`${ruFile}: LOCALE ${r.LOCALE} is not in the course's LOCALES`)
    if (!r.BUNDLE_PATH.startsWith('apps/website/')) problems.push(`${ruFile}: BUNDLE_PATH must be under apps/website/`)
    try { bundle = JSON.parse(bundleText) } catch (e) { problems.push(`${r.BUNDLE_PATH}: not JSON (${e.message})`) }
    if (bundle) problems.push(...bundleProblems(f, r, bundle, r.BUNDLE_PATH, ruFile))
    problems.push(...widgetProblems(f, gallery, file))
    problems.push(...lessonSpecProblems(f, analyze, root, file))
  }
  return { id, file, f, r, bundle, problems, specSha: sha256(Buffer.from(specText, 'utf8')), tests: [course.tests, ru.tests] }
}

export async function buildCourses({ catalogText, courses: inputs, navText, analyze, gallery, root = SITE }) {
  const catalog = readSpec(CATALOG_SPEC, catalogText, analyze, CATALOG_REQUIRED)
  const problems = [...catalog.problems]
  if (catalog.analysis.ast?.name !== 'courses') problems.push(`${CATALOG_SPEC}: module must be courses`)
  const c = catalog.fields
  if (problems.length) return { problems, courses: null, ts: null, publicSpecs: null, tests: catalog.tests }
  problems.push(...catalogProblems(c))
  if (inputs.length !== c.COURSE_IDS.length) problems.push(`${CATALOG_SPEC}: ${c.COURSE_IDS.length} courses named, ${inputs.length} read`)
  const read = c.COURSE_IDS.map((id, i) => readCourse(id, inputs[i] ?? {}, c, analyze, gallery, root))
  for (const x of read) problems.push(...x.problems)
  if (problems.length === 0) problems.push(...acrossProblems(read, gallery))
  const playerBuild = gallery.widgets.find((w) => w.kind === 'player')?.preview?.match(/[?&]v=([A-Za-z0-9]+)/)?.[1] ?? ''
  let out = problems.length ? null : chainOf(read.map((x) => courseOf(x.f, x.r, x.bundle, gallery, x.specSha, playerBuild)))
  if (out) problems.push(...navProblems(out, navText ?? ''))
  if (problems.length) out = null
  const all = [catalog.tests, ...read.flatMap((x) => x.tests)]
  return {
    problems, courses: out,
    tests: { tests: all.reduce((s, t) => s + t.tests, 0), asserts: all.reduce((s, t) => s + t.asserts, 0) },
    ts: out ? renderTs(out) : null,
    routesTs: out ? renderRoutesTs(out) : null,
    publicSpecs: out ? c.COURSE_IDS.map((id, i) => [publicSpecOf(id), inputs[i].specText]) : null,
  }
}

export async function readInputs(root = SITE) {
  const catalogText = readFileSync(join(root, CATALOG_SPEC), 'utf8')
  const ids = JSON.parse(catalogText.match(/pub const COURSE_IDS : \[\d+\]str = (\[[^\]]*\]);/)?.[1] ?? '[]')
  const read = (rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8') : '')
  return {
    catalogText,
    courses: ids.map((id) => {
      const ruText = read(ruSpecOf(id))
      const bundleRel = ruText.match(/pub const BUNDLE_PATH : str = "([^"]+)";/)?.[1] ?? ''
      return { specText: read(courseSpecOf(id)), ruText, bundleText: bundleRel ? read(bundleRel.replace(/^apps\/website\//, '')) : '' }
    }),
    navText: read(NAV_TSX),
    gallery: readGallery(root),
  }
}

async function main() {
  const check = process.argv.includes('--check')
  const json = process.argv.includes('--json')
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const out = await buildCourses({ ...(await readInputs()), analyze })
  if (out.problems.length) {
    console.error(`course-from-spec: ${out.problems.length} problem(s)`)
    for (const p of out.problems) console.error('  ' + p)
    process.exit(1)
  }
  if (json) { process.stdout.write(JSON.stringify(out.courses, null, 2) + '\n'); return }
  const targets = [[TS_OUT, out.ts], [ROUTES_OUT, out.routesTs], ...out.publicSpecs]
  if (check) {
    const stale = targets.filter(([rel, text]) => !existsSync(join(SITE, rel)) || readFileSync(join(SITE, rel), 'utf8') !== text)
    if (stale.length) {
      console.error(`course-from-spec --check: stale ${stale.map(([r]) => r).join(', ')}; run node scripts/course-from-spec.mjs`)
      process.exit(1)
    }
  } else {
    for (const [rel, text] of targets) {
      mkdirSync(dirname(join(SITE, rel)), { recursive: true })
      writeFileSync(join(SITE, rel), text)
    }
  }
  const cs = out.courses
  const widgets = new Set(cs.flatMap((c) => c.lessons.flatMap((l) => [l.widget.id, ...l.also.map((a) => a.id)])))
  const shape = cs.map((c) => `${c.id} ${c.lessons.length} lessons in ${c.modules.length} modules`).join('; ')
  console.log(`course-from-spec: ${check ? 'up to date' : 'wrote'} ${targets.map(([r]) => r).join(', ')}; ${shape}; ${widgets.size} widgets, ${cs.reduce((s, c) => s + c.lessons.length, 0)} lesson specs compile clean; spec tests ${out.tests.tests}, asserts ${out.tests.asserts}, all hold`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
