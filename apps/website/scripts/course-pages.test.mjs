import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { appOf, buildPages, deckFiles, loadCourses, sitemapOf } from './course-pages.mjs'
import { frameHeight, loadConst, onePagePath } from './course-onepage.mjs'
import { pickCourse } from '../public/widgets/course-deck/pick.js'

const COURSES = loadCourses()
const pages = buildPages(COURSES)
const meta = (html, key) => html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1]

const VIEW = loadConst(new URL('../src/lib/courseView.generated.ts', import.meta.url), 'VIEW')
const LADDER = loadConst(new URL('../src/lib/courseLadder.generated.ts', import.meta.url), 'LADDER')

test('one page per lesson, one per course and one whole course on one page, in every language', () => {
  assert.equal(pages.length, COURSES.reduce((n, C) => n + C.locales.length * (C.lessons.length + 2), 0))
  for (const C of COURSES) for (const l of C.lessons) for (const lang of C.locales) assert.ok(pages.some((p) => p.lang === lang && p.lesson?.id === l.id))
  assert.equal(new Set(pages.map((p) => p.dir)).size, pages.length)
})

test('each course has its own share page, and the first course keeps learn/', () => {
  assert.equal(COURSES[0].share, 'learn/')
  for (const C of COURSES) for (const lang of C.locales) {
    const index = pages.find((p) => p.course.id === C.id && p.lang === lang && !p.lesson && !p.onePage)
    assert.equal(index.dir, `${lang === 'ru' ? 'ru/' : ''}${C.share}`)
  }
})

test('the last lesson of a course hands the reader to lesson 1 of the next', () => {
  for (const [i, C] of COURSES.entries()) {
    const next = COURSES[i + 1]
    if (!next) continue
    for (const lang of C.locales) {
      const last = pages.find((p) => p.lang === lang && p.lesson?.id === C.lessons.at(-1).id)
      assert.ok(last.html.includes(`href="/${lang === 'ru' ? 'ru/' : ''}learn/${next.lessons[0].id}/"`), `${last.dir} does not continue to ${next.id}`)
      const first = pages.find((p) => p.lang === lang && p.lesson?.id === next.lessons[0].id)
      assert.ok(first.html.includes(`href="/${lang === 'ru' ? 'ru/' : ''}learn/${C.lessons.at(-1).id}/"`), `${first.dir} does not go back to ${C.id}`)
    }
  }
})

test('every page is indexable: no redirect, its own canonical, a reciprocal hreflang pair', () => {
  for (const p of pages) {
    assert.doesNotMatch(p.html, /location\.replace|http-equiv="refresh"/)
    assert.match(p.html, new RegExp(`<html lang="${p.lang}">`))
    const canonical = p.html.match(/<link rel="canonical" href="([^"]+)">/)[1]
    assert.equal(canonical, `https://t27.ai/${p.dir}`)
    assert.equal(meta(p.html, 'og:url'), canonical)
    for (const h of ['en', 'ru', 'x-default']) assert.match(p.html, new RegExp(`hreflang="${h}" href="https://t27\\.ai/`))
  }
})

test('every page carries a large card of its own and the lesson words', () => {
  for (const p of pages) {
    assert.equal(meta(p.html, 'twitter:card'), 'summary_large_image')
    assert.match(meta(p.html, 'og:image'), new RegExp(`^https://t27\\.ai/${p.dir}card\\.png\\?v=`))
    assert.equal(meta(p.html, 'twitter:image'), meta(p.html, 'og:image'))
    if (p.lesson) {
      const t = p.lesson[p.lang]
      for (const w of [t.title, t.goal, t.task]) assert.ok(p.html.includes(w.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')), `${p.dir} lacks: ${w}`)
      assert.ok(p.html.includes(`href="${appOf(p.course, p.lesson.id)}"`), `${p.dir} does not open the lesson`)
      assert.ok(appOf(p.course, p.lesson.id).startsWith(`/#/${p.course.route}/`))
    }
  }
})

test('JSON-LD parses, names the page and carries its breadcrumbs', () => {
  for (const p of pages) {
    const ld = [...p.html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]))
    assert.equal(ld[0].url, `https://t27.ai/${p.dir}`)
    assert.equal(ld[0]['@type'], p.lesson ? 'LearningResource' : 'Course')
    assert.equal(ld[0].isAccessibleForFree, true)
    const crumbs = ld.find((x) => x['@type'] === 'BreadcrumbList')
    assert.equal(crumbs.itemListElement.at(-1).item, `https://t27.ai/${p.dir}`)
    if (!p.lesson) assert.equal(ld.find((x) => x['@type'] === 'ItemList').itemListElement.length, p.course.lessons.length)
  }
})

test('titles and descriptions fit a search result', () => {
  for (const p of pages) {
    const d = p.html.match(/<meta name="description" content="([^"]*)">/)[1]
    assert.ok(d.length <= 160, `${p.dir} description is ${d.length} characters`)
    // Each course names itself in every title, so a shared link says which course it is.
    const title = p.html.match(/<title>([^<]*)<\/title>/)[1]
    assert.ok(title.length > 0)
    if (p.course.id === 'course') assert.match(title, /FPGA/)
  }
})

test('the sitemap lists every page once', () => {
  const sm = sitemapOf(pages)
  for (const p of pages) assert.equal(sm.split(`<loc>https://t27.ai/${p.dir}</loc>`).length, 2)
})

test('the learn/ landing lists every course, in catalog order', () => {
  for (const lang of COURSES[0].locales) {
    const landing = pages.find((p) => p.course.id === COURSES[0].id && p.lang === lang && !p.lesson && !p.onePage)
    const list = landing.html.match(/<ol class="courses">(.*?)<\/ol>/s)?.[1] ?? ''
    const hrefs = [...list.matchAll(/href="\/([^"]*)"/g)].map((m) => m[1])
    assert.deepEqual(hrefs, COURSES.map((C) => `${lang === 'ru' ? 'ru/' : ''}${C.share}`))
  }
  for (const p of pages.filter((p) => p.course.id !== COURSES[0].id)) assert.doesNotMatch(p.html, /class="courses"/)
})

const one = pages.filter((p) => p.onePage)
const has = (html, w) => html.includes(String(w).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'))

test('the whole course on one page: a real page under the share path, never a #/ route', () => {
  assert.equal(one.length, COURSES.reduce((n, C) => n + C.locales.length, 0))
  assert.equal(onePagePath(COURSES[0], 'en', VIEW), `learn/${VIEW.onePageDir}/`)
  for (const p of one) {
    assert.equal(p.dir, `${p.lang === 'ru' ? 'ru/' : ''}${p.course.share}${VIEW.onePageDir}/`)
    assert.doesNotMatch(meta(p.html, 'og:url'), /#/)
    assert.equal(meta(p.html, 'og:description'), VIEW.say[p.lang].ONE_PAGE_LINE)
  }
})

test('the one page carries every module and every lesson: title, goal, text, task and its widget', () => {
  for (const p of one) {
    for (const m of p.course.modules) assert.ok(p.html.includes(`id="module-${m.n}"`), `${p.dir} lacks module ${m.n}`)
    for (const l of p.course.lessons) {
      const t = l[p.lang]
      for (const w of [t.title, t.goal, t.text, t.task]) assert.ok(has(p.html, w), `${p.dir} lacks lesson ${l.n}: ${w.slice(0, 40)}`)
      assert.ok(p.html.includes(`id="lesson-${l.n}"`), `${p.dir} has no #lesson-${l.n}`)
    }
    assert.equal((p.html.match(/class="op-slot"/g) ?? []).length, p.course.lessons.length)
  }
})

test("no widget frame is in the page: frame-pool.js mounts them, with the view spec's budget", () => {
  for (const p of one) {
    assert.doesNotMatch(p.html, /<iframe/)
    assert.match(p.html, /import \{ framePool \} from '\/widgets\/frame-pool\.js\?v=[0-9a-f]{12}'/)
    const cfg = JSON.parse(p.html.match(/<script>window\.OP=(.*?)<\/script>/)[1])
    assert.equal(cfg.live, VIEW.LIVE_FRAMES_MAX)
    assert.equal(cfg.mount, VIEW.MOUNT_MARGIN_PX)
    assert.equal(cfg.unmount, VIEW.UNMOUNT_MARGIN_PX)
    assert.equal(cfg.settle, VIEW.SETTLE_MS)
  }
})

test("every slot keeps its frame's height before the frame loads: nothing below it moves", () => {
  for (const p of one) {
    const heights = [...p.html.matchAll(/class="op-slot"[^>]*style="height:(\d+)px"/g)].map((m) => Number(m[1]))
    assert.deepEqual(heights, p.course.modules.flatMap((m) => m.lessons.map((id) => frameHeight(p.course.lessons.find((l) => l.id === id).widget.height, VIEW))))
    for (const h of heights) assert.ok(h >= VIEW.FRAME_MIN_PX && h <= VIEW.FRAME_MAX_PX)
  }
  assert.equal(frameHeight(10, VIEW), VIEW.FRAME_MIN_PX)
  assert.equal(frameHeight(5000, VIEW), VIEW.FRAME_MAX_PX)
})

test("the layout breakpoints are the view spec's, written from its numbers", () => {
  for (const p of one) {
    for (const px of [VIEW.SIDE_BY_SIDE_MIN_PX, VIEW.TOC_SIDEBAR_MIN_PX, VIEW.NARROW_MAX_PX + 1]) assert.ok(p.html.includes(`@media (min-width: ${px}px)`), `${p.dir} lacks the ${px}px breakpoint`)
    assert.ok(p.html.includes(`--course-read: ${VIEW.READ_EM_X10_EN / 10}em`))
    assert.ok(p.html.includes(`--course-read: ${VIEW.READ_EM_X10_RU / 10}em`))
    assert.ok(p.html.includes('@media print'))
    assert.ok(p.html.includes('prefers-reduced-motion: reduce'))
  }
})

test('every course page, lesson page and one page names the one page and carries TRI CLAW', () => {
  for (const p of pages) {
    const where = `/${onePagePath(p.course, p.lang, VIEW)}`
    if (!p.onePage) assert.ok(p.html.includes(`href="${where}${p.lesson ? `#lesson-${p.lesson.n}` : ''}"`), `${p.dir} does not link ${where}`)
    for (const href of [LADDER.claw.keys, LADDER.claw.club, LADDER.claw.github]) assert.ok(p.html.includes(`href="${href}"`), `${p.dir} lacks ${href}`)
    assert.equal((p.html.match(/<li class="claw-path/g) ?? []).length, 3)
  }
  assert.match(LADDER.claw.keys, /^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=app_keys$/)
  assert.match(LADDER.claw.club, /^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=app_club$/)
})

test('the sitemap lists every whole course on one page with its language pair', () => {
  const sm = sitemapOf(pages)
  for (const p of one) assert.ok(sm.includes(`<loc>https://t27.ai/${p.dir}</loc>`))
})

test('the course deck reads one file per course, every lesson in it, and the catalog in order', () => {
  const files = deckFiles(COURSES)
  const [index, ...decks] = files
  assert.deepEqual(JSON.parse(index[1]).map((c) => c.id), COURSES.map((C) => C.id))
  for (const [f, text] of files) {
    assert.ok(existsSync(f), `${f} is missing`)
    assert.equal(readFileSync(f, 'utf8'), text, `${f} is not current`)
  }
  for (const [i, [, text]] of decks.entries()) {
    const d = JSON.parse(text)
    assert.equal(d.id, COURSES[i].id)
    assert.equal(d.modules.flatMap((m) => m.lessons).length, COURSES[i].lessons.length)
    for (const l of d.modules.flatMap((m) => m.lessons)) assert.match(l.frame, /^(widgets|play|term)\//)
  }
})

test('the course deck shows the course it is asked for, the first one when none, and none for an unknown one', () => {
  const catalog = JSON.parse(deckFiles(COURSES)[0][1])
  assert.equal(pickCourse(catalog, null).id, COURSES[0].id)
  assert.equal(pickCourse(catalog, '').id, COURSES[0].id)
  assert.equal(pickCourse(catalog, 'neural-networks').id, 'neural-networks')
  // ?course=nope used to show t27 basics in its place; it now shows the widget's not-found words.
  assert.equal(pickCourse(catalog, 'nope'), null)
  assert.equal(pickCourse([], null), null)
  const tool = readFileSync(new URL('../public/widgets/course-deck/tool.js', import.meta.url), 'utf8')
  assert.match(tool, /const pick = pickCourse\(catalog, q\.get\('course'\)\)/)
  assert.match(tool, /if \(!course\) root\.append\(el\('p', 'cd-empty', W\.SAY_NOT_FOUND\)\)/)
})
