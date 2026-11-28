import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appOf, ctaOf, buildPages, loadCourses, sitemapOf } from './course-pages.mjs'

const COURSES = loadCourses()
const pages = buildPages(COURSES)
const meta = (html, key) => html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1]

test('one page per lesson and one per course, in every language', () => {
  assert.equal(pages.length, COURSES.reduce((n, C) => n + C.locales.length * (C.lessons.length + 1), 0))
  for (const C of COURSES) for (const l of C.lessons) for (const lang of C.locales) assert.ok(pages.some((p) => p.lang === lang && p.lesson?.id === l.id))
  assert.equal(new Set(pages.map((p) => p.dir)).size, pages.length)
})

test('each course has its own share page, and the first course keeps learn/', () => {
  assert.equal(COURSES[0].share, 'learn/')
  for (const C of COURSES) for (const lang of C.locales) {
    const index = pages.find((p) => p.course.id === C.id && p.lang === lang && !p.lesson)
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
      assert.ok(p.html.includes(`href="${ctaOf(p.course, p.lesson.id)}"`), `${p.dir} does not open the lesson`)
      assert.ok(appOf(p.course, p.lesson.id).startsWith(`/#/${p.course.route}/`))
    }
  }
})

test('JSON-LD parses, names the page and carries its breadcrumbs', () => {
  for (const p of pages) {
    const ld = [...p.html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]))
    assert.equal(ld[0].url, `https://t27.ai/${p.dir}`)
    assert.equal(ld[0]['@type'], p.lesson ? 'LearningResource' : 'Course')
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
    const landing = pages.find((p) => p.course.id === COURSES[0].id && p.lang === lang && !p.lesson)
    const list = landing.html.match(/<ol class="courses">(.*?)<\/ol>/s)?.[1] ?? ''
    const hrefs = [...list.matchAll(/href="\/([^"]*)"/g)].map((m) => m[1])
    assert.deepEqual(hrefs, COURSES.map((C) => `${lang === 'ru' ? 'ru/' : ''}${C.share}`))
  }
  for (const p of pages.filter((p) => p.course.id !== COURSES[0].id)) assert.doesNotMatch(p.html, /class="courses"/)
})
