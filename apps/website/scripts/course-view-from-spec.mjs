#!/usr/bin/env node
// course-view-from-spec.mjs -- how a course is laid out on t27.ai, from specs/view/course-view.t27.
//
// The spec holds every number the course screens use (the reading width, the breakpoints, how many
// widget frames are live at once and how far ahead they load, the finger targets, the focus ring,
// the contrast floor) and the words of the whole-course-on-one-page view. This script compiles it
// with the vendored compiler, evaluates its test blocks, holds the Russian bundle to every SAY_ key
// (the same digits and {placeholders}, nothing extra), and holds three other places to its numbers,
// because they cannot import them:
//
//   specs/widgets/course-deck.t27   every K_<NAME> whose NAME is a constant here is that number
//   specs/ui/viewport.t27 (vendored)  TOUCH_TARGET_PX and NARROW_MAX_PX are the site's own
//   src/pages/Course.css            every width in an @media rule is a breakpoint of this spec
//
// Writes the files nobody edits by hand:
//   src/lib/courseView.generated.ts      the numbers and the words, for Course.tsx and course-pages.mjs
//   src/styles/courseView.generated.css  the numbers CSS can read, as custom properties on .course-page
//                                         and .op-page (custom properties cannot drive @media; the
//                                         breakpoints are held in Course.css by the check above and
//                                         written into the one-page view by course-pages.mjs)
//
// Run:      node scripts/course-view-from-spec.mjs            (write)
//           node scripts/course-view-from-spec.mjs --check    (fail if stale)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CYRILLIC, SITE, checkSchema, compilerErrors, constsOf, loadCompiler, sha256, verdictOf } from './agents-from-specs.mjs'
import { runSpecTests } from './viewport-from-spec.mjs'

const WASM = 'public/t27/t27_compiler.wasm'
export const VIEW_SPEC = 'specs/view/course-view.t27'
export const RU_BUNDLE = 'i18n/course-view.ru.json'
export const DECK_SPEC = 'specs/widgets/course-deck.t27'
export const VIEWPORT_SPEC = 'public/t27/files/specs/ui/viewport.t27'
export const COURSE_CSS = 'src/pages/Course.css'
export const TS_OUT = 'src/lib/courseView.generated.ts'
export const CSS_OUT = 'src/styles/courseView.generated.css'

const REQUIRED = {
  KIND: 'str', SCHEMA_VERSION: 'u8', GENERATED: 'arr', ONE_PAGE_DIR: 'str', DECK_WIDGET: 'str',
  READ_CHARS: 'u8', READ_CHARS_MIN: 'u8', READ_CHARS_MAX: 'u8', TEXT_PX: 'u8',
  CHAR_EM_X1000_EN: 'u16', CHAR_EM_X1000_RU: 'u16', READ_EM_X10_EN: 'u16', READ_EM_X10_RU: 'u16',
  NARROW_MAX_PX: 'u16', SIDE_BY_SIDE_MIN_PX: 'u16', TOC_SIDEBAR_MIN_PX: 'u16', PAGE_MAX_PX: 'u16', TOC_WIDTH_PX: 'u16',
  WIDGET_MIN_PX: 'u16', COLUMN_GAP_PX: 'u8', GUTTER_WIDE_PX: 'u8', GUTTER_PHONE_PX: 'u8',
  LIVE_FRAMES_MAX: 'u8', MOUNT_MARGIN_PX: 'u16', UNMOUNT_MARGIN_PX: 'u16', FRAME_MIN_PX: 'u16', FRAME_MAX_PX: 'u16',
  TOUCH_TARGET_PX: 'u8', THUMB_BAR_PX: 'u8', FOCUS_RING_PX: 'u8', CONTRAST_MIN_X10: 'u8', MOTION_WHEN_REDUCED: 'bool',
}
/** The numbers the screens read, in the generated module's own names. */
export const NUMBERS = Object.keys(REQUIRED).filter((k) => /_(PX|CHARS|X10|X10_EN|X10_RU|X1000_EN|X1000_RU|MIN|MAX)$/.test(k) && REQUIRED[k] !== 'str')
const holes = (s) => [...String(s).matchAll(/\{\d+\}|\d+/g)].map((m) => m[0]).sort().join(',')
const read = (root, rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8') : '')
const plain = (consts) => Object.fromEntries(Object.entries(consts).map(([k, v]) => [k, v.value]))

/** The widths an @media rule of a stylesheet names, in px. */
export function mediaWidths(css) {
  const out = []
  for (const m of css.matchAll(/@media[^{]*\{/g)) for (const w of m[0].matchAll(/(min|max)-width:\s*(\d+)px/g)) out.push({ side: w[1], px: Number(w[2]) })
  return out
}

/** The @media widths a course stylesheet may name: each breakpoint, and the pixel below it. */
export function allowedWidths(v) {
  return {
    min: [v.SIDE_BY_SIDE_MIN_PX, v.TOC_SIDEBAR_MIN_PX, v.NARROW_MAX_PX + 1],
    max: [v.SIDE_BY_SIDE_MIN_PX - 1, v.TOC_SIDEBAR_MIN_PX - 1, v.NARROW_MAX_PX],
  }
}

export function viewProblems({ viewText, ruText, deckText, viewportText, courseCss, analyze }) {
  const p = []
  const a = analyze(viewText)
  const verdict = verdictOf(a)
  if (!verdict.typecheckOk || verdict.discarded > 0 || !verdict.hirOk) p.push(`${VIEW_SPEC}: compiler verdict not clean (${JSON.stringify(verdict)})`)
  p.push(...compilerErrors(a).map((m) => `${VIEW_SPEC}: ${m}`))
  if (a.ast?.name !== 'course_view') p.push(`${VIEW_SPEC}: module must be course_view`)
  if (/[^\x00-\x7f]/.test(viewText)) p.push(`${VIEW_SPEC}: non-ASCII byte (L3)`)
  if (CYRILLIC.test(viewText)) p.push(`${VIEW_SPEC}: Cyrillic in the spec; Russian belongs in ${RU_BUNDLE}`)
  let consts = {}
  try { consts = constsOf(a) } catch (e) { p.push(`${VIEW_SPEC}: ${e.message}`) }
  const says = Object.fromEntries(Object.keys(consts).filter((k) => k.startsWith('SAY_')).map((k) => [k, 'str']))
  p.push(...checkSchema(consts, REQUIRED, says, VIEW_SPEC))
  const v = plain(consts)
  if (v.KIND !== 'course-view') p.push(`${VIEW_SPEC}: KIND must be "course-view"`)
  if (JSON.stringify(v.GENERATED) !== JSON.stringify([TS_OUT, CSS_OUT])) p.push(`${VIEW_SPEC}: GENERATED must be ${JSON.stringify([TS_OUT, CSS_OUT])}`)
  if (!/^[a-z][a-z0-9-]*$/.test(String(v.ONE_PAGE_DIR ?? ''))) p.push(`${VIEW_SPEC}: ONE_PAGE_DIR must be one lowercase path segment`)
  const tests = runSpecTests(a, v)
  if (tests.tests < 2) p.push(`${VIEW_SPEC}: needs at least two test blocks`)
  p.push(...tests.failures.map((f) => `${VIEW_SPEC}: test ${f}`))

  // Russian: every word, nothing else, the same holes.
  let ru = null
  try { ru = JSON.parse(ruText) } catch (e) { p.push(`${RU_BUNDLE}: not JSON (${e.message})`) }
  if (ru) {
    for (const k of Object.keys(says)) {
      if (typeof ru[k] !== 'string' || !ru[k].trim()) p.push(`${RU_BUNDLE}: ${k} is missing`)
      else if (holes(ru[k]) !== holes(v[k])) p.push(`${RU_BUNDLE}: ${k} keeps other numbers or {placeholders} than the English`)
    }
    for (const k of Object.keys(ru)) if (!(k in says)) p.push(`${RU_BUNDLE}: ${k} is not a word of ${VIEW_SPEC}`)
  }

  // The deck widget: its K_<NAME> is this spec's <NAME>, number for number.
  if (!deckText) p.push(`${DECK_SPEC} is missing: the deck must say its frame budget`)
  else {
    let d = {}
    try { d = plain(constsOf(analyze(deckText))) } catch (e) { p.push(`${DECK_SPEC}: ${e.message}`) }
    if (d.ID !== v.DECK_WIDGET) p.push(`${DECK_SPEC}: ID must be ${v.DECK_WIDGET} (DECK_WIDGET)`)
    for (const [k, val] of Object.entries(d)) {
      if (!k.startsWith('K_') || !(k.slice(2) in v)) continue
      if (Number(val) !== Number(v[k.slice(2)])) p.push(`${DECK_SPEC}: ${k} is ${val}, ${VIEW_SPEC} ${k.slice(2)} is ${v[k.slice(2)]}`)
    }
    for (const k of ['LIVE_FRAMES_MAX', 'MOUNT_MARGIN_PX', 'UNMOUNT_MARGIN_PX', 'FRAME_MIN_PX', 'FRAME_MAX_PX']) if (!(`K_${k}` in d)) p.push(`${DECK_SPEC}: K_${k} is missing; the deck loads frames by this spec's budget`)
  }

  // The site's own viewport contract.
  if (viewportText) {
    const vp = plain(constsOf(analyze(viewportText)))
    if (v.TOUCH_TARGET_PX !== vp.TOUCH_TARGET_MIN_PX) p.push(`${VIEW_SPEC}: TOUCH_TARGET_PX ${v.TOUCH_TARGET_PX} is not the site's TOUCH_TARGET_MIN_PX ${vp.TOUCH_TARGET_MIN_PX} (${VIEWPORT_SPEC})`)
    if (v.NARROW_MAX_PX !== vp.PHONE_MAX) p.push(`${VIEW_SPEC}: NARROW_MAX_PX ${v.NARROW_MAX_PX} is not the site's PHONE_MAX ${vp.PHONE_MAX} (${VIEWPORT_SPEC})`)
  } else p.push(`${VIEWPORT_SPEC} is missing`)

  // Course.css: no breakpoint of its own.
  const allowed = allowedWidths(v)
  for (const w of mediaWidths(courseCss)) if (!allowed[w.side].includes(w.px)) p.push(`${COURSE_CSS}: @media (${w.side}-width: ${w.px}px) is not a breakpoint of ${VIEW_SPEC} (${w.side}: ${allowed[w.side].join(', ')})`)
  if (!mediaWidths(courseCss).some((w) => w.side === 'max' && w.px === v.SIDE_BY_SIDE_MIN_PX - 1)) p.push(`${COURSE_CSS}: no @media (max-width: ${v.SIDE_BY_SIDE_MIN_PX - 1}px): the lesson never stacks`)

  const out = p.length
    ? null
    : {
        sha: sha256(viewText),
        view: {
          onePageDir: v.ONE_PAGE_DIR,
          deckWidget: v.DECK_WIDGET,
          ...Object.fromEntries(NUMBERS.map((k) => [k, v[k]])),
          motionWhenReduced: v.MOTION_WHEN_REDUCED,
          say: {
            en: Object.fromEntries(Object.keys(says).map((k) => [k.slice(4), v[k]])),
            ru: Object.fromEntries(Object.keys(says).map((k) => [k.slice(4), ru[k]])),
          },
        },
      }
  return { problems: p, out, tests }
}

/** The custom properties a stylesheet reads; one block for the app's pages and the one-page view. */
export const cssVars = (v) => [
  `--course-read: ${v.READ_EM_X10_EN / 10}em`,
  `--course-text-px: ${v.TEXT_PX}px`,
  `--course-page-max: ${v.PAGE_MAX_PX}px`,
  `--course-toc-width: ${v.TOC_WIDTH_PX}px`,
  `--course-widget-min: ${v.WIDGET_MIN_PX}px`,
  `--course-col-gap: ${v.COLUMN_GAP_PX}px`,
  `--course-gutter-wide: ${v.GUTTER_WIDE_PX}px`,
  `--course-gutter-phone: ${v.GUTTER_PHONE_PX}px`,
  `--course-frame-min: ${v.FRAME_MIN_PX}px`,
  `--course-touch: ${v.TOUCH_TARGET_PX}px`,
  `--course-thumb-bar: ${v.THUMB_BAR_PX}px`,
  `--course-focus-ring: ${v.FOCUS_RING_PX}px`,
]

export const renderCss = (o) => `/* GENERATED by scripts/course-view-from-spec.mjs from ${VIEW_SPEC} (sha256 ${o.sha.slice(0, 16)}); do not edit.
   Custom properties cannot drive @media: Course.css names only this spec's breakpoints, and the
   check holds it to them. */
.course-page,
.op-page {
${cssVars(o.view).map((l) => `  ${l};`).join('\n')}
}
/* Russian sets wider letters: the same number of characters needs a wider column. */
.course-page:lang(ru),
.op-page:lang(ru) {
  --course-read: ${o.view.READ_EM_X10_RU / 10}em;
}
`

export const renderTs = (o) => `// GENERATED by scripts/course-view-from-spec.mjs from ${VIEW_SPEC} and ${RU_BUNDLE}
// spec sha256 ${o.sha}
// Do not edit: change the .t27 source (or the Russian bundle) and regenerate.

export const VIEW = ${JSON.stringify(o.view, null, 2)} as const

export type ViewSay = (typeof VIEW.say)['en']
`

export function readInputs(root = SITE) {
  return { viewText: read(root, VIEW_SPEC), ruText: read(root, RU_BUNDLE), deckText: read(root, DECK_SPEC), viewportText: read(root, VIEWPORT_SPEC), courseCss: read(root, COURSE_CSS) }
}

async function main() {
  const check = process.argv.includes('--check')
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const { problems, out, tests } = viewProblems({ ...readInputs(), analyze })
  if (problems.length) {
    console.error(`course-view-from-spec: ${problems.length} problem(s)`)
    for (const x of problems) console.error('  ' + x)
    process.exit(1)
  }
  const targets = [[TS_OUT, renderTs(out)], [CSS_OUT, renderCss(out)]]
  if (check) {
    const stale = targets.filter(([rel, text]) => read(SITE, rel) !== text)
    if (stale.length) {
      console.error(`course-view-from-spec --check: stale ${stale.map(([r]) => r).join(', ')}; run node scripts/course-view-from-spec.mjs`)
      process.exit(1)
    }
  } else for (const [rel, text] of targets) writeFileSync(join(SITE, rel), text)
  console.log(`course-view-from-spec: ${check ? 'up to date' : 'wrote'} ${TS_OUT} and ${CSS_OUT}; ${NUMBERS.length} numbers, ${Object.keys(out.view.say.en).length} words in 2 languages; spec tests ${tests.tests}, asserts ${tests.asserts}, all hold`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
