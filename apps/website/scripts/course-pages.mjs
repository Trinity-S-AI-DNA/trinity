// Static pages for the courses, one per lesson and one per course, in both
// languages: public/learn/<id>/index.html and public/ru/learn/<id>/index.html
// for lessons, the course's own share path (learn/ for the first course,
// learn/<course>/ for the next) for each course.
//
// Why they exist: the course lives at #/course, and a crawler drops everything
// after the '#'. A link to t27.ai/#/course posted on X previewed as the home
// page ("AGI game -- play, direct, earn"), and no lesson could be indexed. Each
// page here is a real page: the lesson's own words in the HTML, its own
// preview card, canonical, hreflang pair, and a link into the interactive
// lesson. No redirect: the apex verify-site.sh refuses a landing that
// auto-redirects, because a search engine files it under the home page.
// Each course has its own pages and cards, so each can be shared on its own;
// the last lesson of one course links to lesson 1 of the next.
//
// Every word comes from src/lib/course.generated.ts (specs/course/courses.t27,
// each course spec and its Russian bundle); nothing is written here twice.
//
//   node scripts/course-pages.mjs           # write pages + sitemap, render stale cards
//   node scripts/course-pages.mjs --check   # CI: pages current, every card present and current
//
// Each course also has its whole course on one page (scripts/course-onepage.mjs):
// <share path>all/, with its own card, and the course-deck widget's data for it
// (public/widgets/course-deck/courses/<id>.json). Every page here ends with the
// TRI CLAW block (specs/ladder/course-ladder.t27).
//
// Cards are PNGs rendered by headless Chromium (as scripts/og-image.mjs does)
// and committed; public/learn/cards.json records what each was drawn from, so
// --check can tell a stale card without a browser.

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CLAW_CSS, clawHtml, deckData, esc, fmt, loadConst, onePageHtml, onePagePath, pad, snippet } from './course-onepage.mjs'
// t27-plumbing: the app's own share tagger (utm_source=<platform>), not a second copy of it.
import { shareTagged } from '../src/lib/shareTags.ts'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(SITE, 'public')
const ORIGIN = 'https://t27.ai'
const BASE = 'learn'
const MANIFEST = join(PUBLIC, BASE, 'cards.json')
const CARD = { width: 1200, height: 630, maxBytes: 600_000 }
const VIEW = loadConst(join(SITE, 'src/lib/courseView.generated.ts'), 'VIEW')
const LADDER = loadConst(join(SITE, 'src/lib/courseLadder.generated.ts'), 'LADDER')
const VIEW_CSS = join(SITE, 'src/styles/courseView.generated.css')
const POOL = join(PUBLIC, 'widgets/frame-pool.js')
export const DECK_DIR = join(PUBLIC, 'widgets', VIEW.deckWidget, 'courses')

const sha = (b) => createHash('sha256').update(b).digest('hex')
const unesc = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** The widget page's own og:description: the gallery's words for the tool, not a second copy here. */
function aboutOf(widget) {
  if (!widget.url.startsWith(`${ORIGIN}/`)) return null
  const p = join(PUBLIC, widget.url.slice(ORIGIN.length + 1), 'index.html')
  const m = existsSync(p) && readFileSync(p, 'utf8').match(/<meta property="og:description" content="([^"]*)"/)
  return m ? unesc(m[1]) : null
}

/** The lesson's tutorial spec, as published: shown on the page, so the page carries real t27. */
function specSourceOf(spec) {
  const p = spec && join(PUBLIC, spec.source)
  return p && existsSync(p) ? readFileSync(p, 'utf8') : null
}

export function loadCourses(file = join(SITE, 'src/lib/course.generated.ts')) {
  const s = readFileSync(file, 'utf8')
  const head = 'export const COURSES = '
  return JSON.parse(s.slice(s.indexOf(head) + head.length, s.indexOf('\n] as const') + 2))
}

/** Site path of a page: the course's share path, or learn/<lesson>/; under ru/ for Russian. */
export const pathOf = (C, lang, id) => `${lang === 'ru' ? 'ru/' : ''}${id ? `${BASE}/${id}/` : C.share}`
const urlOf = (C, lang, id) => `${ORIGIN}/${pathOf(C, lang, id)}`
// A shared link carries its utm tags (src/lib/shareTags.ts) to this page, and the app counts
// them on arrival (src/lib/trafficArrival.ts) -- but this page is not the app. So its links
// into the app take the query along, before the '#', where the app reads it.
const CARRY_UTM = `<script>(function(){var q=location.search;if(!/[?&]utm_source=/.test(q))return;document.querySelectorAll('a[href^="/#/"]').forEach(function(a){a.setAttribute('href','/'+q+a.getAttribute('href').slice(1))})})()</script>`

export const appOf = (C, id) => `/#/${C.route}${id ? `/${id}` : ''}`
/** A neighbouring course's lesson page: lesson pages live under learn/ whatever the course. */
const lessonPath = (lang, id) => `${lang === 'ru' ? 'ru/' : ''}${BASE}/${id}/`

/** The widget's own preview card, if the gallery page has one: its picture goes on the lesson card. */
function thumbOf(widget) {
  if (!widget.url.startsWith(`${ORIGIN}/`)) return null
  const p = join(PUBLIC, widget.url.slice(ORIGIN.length + 1), 'card.png')
  return existsSync(p) ? p : null
}

// ---------------------------------------------------------------- the card
// Black and white like the course page (owner, 2026-10-05: no green fields or
// glows): white type and rules on black, a widget's picture in greyscale.

function cardHtml(C, lang, lesson, onePage = false) {
  const say = C.say[lang]
  const font = lang === 'ru' ? `'Helvetica Neue', Arial, sans-serif` : `'Outfit', 'Helvetica Neue', sans-serif`
  const fonts = pathToFileURL(join(PUBLIC, 'fonts')).href
  const mod = lesson ? C.modules.find((m) => m.id === lesson.module) : null
  const title = lesson ? lesson[lang].title : say.TITLE
  const sub = lesson ? lesson[lang].goal : onePage ? VIEW.say[lang].ONE_PAGE_LINE : say.LEAD
  const kicker = lesson ? `${fmt(say.MODULE, mod.n)} · ${mod[lang].title}` : onePage ? VIEW.say[lang].ONE_PAGE : ''
  const thumb = lesson ? thumbOf(lesson.widget) : null
  const cells = C.lessons
    .map((l) => `<i class="${onePage || (lesson && l.id === lesson.id) ? 'on' : lesson && l.n < lesson.n ? 'past' : ''}"></i>`)
    .reduce((out, c, i) => out + (i % 3 === 0 && i ? '<b></b>' : '') + c, '')
  const big = title.length > 40 ? 52 : title.length > 22 ? 60 : 72
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
@font-face { font-family: 'Outfit'; font-weight: 400 800; src: url(${fonts}/outfit-latin.woff2) format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-weight: 400 500; src: url(${fonts}/jetbrains-mono-latin.woff2) format('woff2'), url(${fonts}/jetbrains-mono-cyrillic.woff2) format('woff2'); }
* { margin: 0; box-sizing: border-box; }
html, body { width: 1200px; height: 630px; background: #000; overflow: hidden; }
body { position: relative; font-family: ${font}; color: #fff; padding: 56px 64px; }
.top { position: relative; display: flex; justify-content: space-between; font: 500 21px 'JetBrains Mono', monospace; letter-spacing: 3px; text-transform: uppercase; border-top: 6px solid #fff; border-bottom: 1px solid #fff; padding: 10px 0; }
.brand { color: #fff; } .where { color: #8a8a8a; }
.main { position: relative; display: flex; gap: 48px; margin-top: 44px; height: 360px; }
.text { flex: 1; display: flex; flex-direction: column; }
.n { font: 500 24px 'JetBrains Mono', monospace; color: #fff; letter-spacing: 2px; margin-bottom: 14px; }
h1 { font-weight: 800; font-size: ${big}px; line-height: 1.06; letter-spacing: -.5px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
p { margin-top: 22px; font-size: 27px; line-height: 1.32; color: #a6a6a6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.thumb { width: 420px; flex: none; align-self: center; border: 1px solid #fff; overflow: hidden; }
.thumb img { display: block; width: 100%; filter: grayscale(1); }
.bottom { position: absolute; left: 64px; right: 64px; bottom: 50px; display: flex; align-items: center; justify-content: space-between; }
.cells { display: flex; gap: 4px; flex: none; margin-right: 24px; } .cells i { width: 13px; height: 13px; background: #1c1c1c; }
.cells i.past { background: #5a5a5a; } .cells i.on { background: #fff; } .cells b { width: 9px; }
.url { white-space: nowrap; font: 500 17px 'JetBrains Mono', monospace; color: #8a8a8a; letter-spacing: 1px; }
</style></head><body>
<div class="top"><span class="brand">t27.ai · ${esc(say.KICKER)}</span><span class="where">${esc(kicker)}</span></div>
<div class="main"><div class="text">${lesson ? `<div class="n">${esc(fmt(say.LESSON, pad(lesson.n), C.lessons.length))}</div>` : ''}<h1>${esc(title)}</h1><p>${esc(sub)}</p></div>${thumb ? `<div class="thumb"><img src="${pathToFileURL(thumb).href}"></div>` : ''}</div>
<div class="bottom"><div class="cells">${cells}</div><span class="url">t27.ai/${esc((onePage ? onePagePath(C, lang, VIEW) : pathOf(C, lang, lesson?.id)).replace(/\/$/, ''))}</span></div>
</body></html>`
}

/** What a card was drawn from: its HTML and the bytes of every file it loads. */
function cardInput(html) {
  const files = [...html.matchAll(/url\((file:[^)]+)\)|src="(file:[^"]+)"/g)].map((m) => m[1] || m[2])
  return sha(html.replace(/file:\/\/[^)"]*\/public\//g, 'public/') + files.map((f) => sha(readFileSync(fileURLToPath(f)))).join(''))
}

// ---------------------------------------------------------------- the page

function pageHtml(C, lang, lesson, cardUrl, all = []) {
  const say = C.say[lang]
  const other = lang === 'en' ? 'ru' : 'en'
  const id = lesson?.id
  const total = C.lessons.length
  const t = lesson?.[lang]
  const mod = lesson ? C.modules.find((m) => m.id === lesson.module) : null
  const title = lesson ? fmt(say.SEO_TITLE, t.title, lesson.n, total) : `${say.TITLE} · t27`
  const desc = snippet(lesson ? `${t.goal} ${t.text}` : say.DESCRIPTION)
  const ogTitle = lesson ? t.title : say.TITLE
  const ogDesc = lesson ? t.goal : say.LEAD
  const alt = lesson ? `${say.KICKER}, ${fmt(say.LESSON, lesson.n, total)}: ${t.title}. ${t.goal}` : `${say.TITLE}. ${say.LEAD}`
  const course = { '@type': 'Course', name: say.TITLE, description: say.DESCRIPTION, url: urlOf(C, lang), inLanguage: lang, isAccessibleForFree: true, educationalLevel: 'Beginner', provider: { '@type': 'Organization', name: 'TRINITY S³AI', url: `${ORIGIN}/` } }
  const crumbs = { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 't27.ai', item: `${ORIGIN}/${lang === 'ru' ? 'ru/' : ''}` },
    { '@type': 'ListItem', position: 2, name: say.TITLE, item: urlOf(C, lang) },
    ...(lesson ? [{ '@type': 'ListItem', position: 3, name: t.title, item: urlOf(C, lang, id) }] : []),
  ] }
  const about = lesson ? aboutOf(lesson.widget) : null
  const code = lesson ? specSourceOf(lesson.spec) : null
  const main = lesson
    ? { '@context': 'https://schema.org', '@type': 'LearningResource', name: t.title, description: t.goal, url: urlOf(C, lang, id), inLanguage: lang, learningResourceType: 'lesson', position: lesson.n, isAccessibleForFree: true, isPartOf: course }
    : { '@context': 'https://schema.org', ...course, hasPart: C.lessons.map((l) => ({ '@type': 'LearningResource', name: l[lang].title, url: urlOf(C, lang, l.id), position: l.n })) }
  const list = lesson ? null : { '@type': 'ItemList', itemListElement: C.lessons.map((l) => ({ '@type': 'ListItem', position: l.n, url: urlOf(C, lang, l.id), name: l[lang].title })) }
  const ld = [main, { '@context': 'https://schema.org', ...crumbs }, ...(list ? [{ '@context': 'https://schema.org', ...list }] : [])]
  const link = (l) => `<a href="/${pathOf(C, lang, l.id)}">${pad(l.n)} ${esc(l[lang].title)}</a>`
  const outline = C.modules.map((m) => `<li><h3>${esc(fmt(say.MODULE, m.n))} · ${esc(m[lang].title)}</h3><p>${esc(m[lang].line)}</p><ol>${m.lessons
    .map((lid) => C.lessons.find((l) => l.id === lid))
    .map((l) => `<li${l.id === id ? ' class="on" aria-current="page"' : ''}>${link(l)}</li>`).join('')}</ol></li>`).join('')
  const prev = lesson && lesson.n > 1 ? C.lessons[lesson.n - 2] : null
  const next = lesson && lesson.n < total ? C.lessons[lesson.n] : null
  // At a course's edge the pager hands the reader to the neighbouring course.
  const chain = (to, lid, isNext) => `<a class="chain" href="/${lid ? lessonPath(lang, lid) : `${lang === 'ru' ? 'ru/' : ''}${to.share}`}">${isNext ? `${esc(say.NEXT_COURSE)}: ${esc(to.title[lang])} →` : `← ${esc(say.PREV_COURSE)}: ${esc(to.title[lang])}`}</a>`
  const back = prev ? `<a href="/${pathOf(C, lang, prev.id)}">← ${esc(prev[lang].title)}</a>` : lesson && C.prev ? chain(C.prev, C.prev.last, false) : '<span></span>'
  const fwd = next ? `<a href="/${pathOf(C, lang, next.id)}">${esc(next[lang].title)} →</a>` : lesson && C.next ? chain(C.next, C.next.first, true) : '<span></span>'
  const courses = C.prev || C.next ? `<nav class="pager">${C.prev ? chain(C.prev, null, false) : '<span></span>'}${C.next ? chain(C.next, null, true) : '<span></span>'}</nav>` : ''
  // The learn/ landing (the first course's index) lists every course, in catalog order.
  const catalog = !lesson && all.length > 1 && C === all[0] ? `<ol class="courses">${all.map((c) => `<li${c === C ? ' aria-current="page"' : ''}><a href="/${lang === 'ru' ? 'ru/' : ''}${c.share}">${esc(c.say[lang].TITLE)}</a></li>`).join('')}</ol>` : ''
  const thumb = lesson && thumbOf(lesson.widget) ? `/${relative(PUBLIC, thumbOf(lesson.widget))}` : null
  const body = lesson
    ? `<nav class="crumbs"><a href="/${pathOf(C, lang)}">${esc(say.ALL)}</a><span>${esc(fmt(say.MODULE, mod.n))} · ${esc(mod[lang].title)}</span><span>${esc(fmt(say.LESSON, lesson.n, total))}</span></nav>
<h1>${esc(t.title)}</h1>
<section><h2>${esc(say.GOAL)}</h2><p class="goal">${esc(t.goal)}</p></section>
<p>${esc(t.text)}</p>
<section><h2>${esc(say.TRY)}</h2><p>${esc(t.task)}</p></section>
<p><a class="cta" href="${appOf(C, id)}">${esc(say.OPEN_LESSON)} →</a> <a class="cta" href="/${onePagePath(C, lang, VIEW)}#lesson-${lesson.n}">${esc(VIEW.say[lang].ONE_PAGE)} →</a></p>
<figure><a href="${esc(lesson.widget.url.slice(ORIGIN.length))}">${thumb ? `<img src="${esc(thumb)}" width="600" height="315" alt="${esc(lesson.widget.title)}" loading="lazy">` : ''}<figcaption>${esc(lesson.widget.title)} ↗</figcaption></a></figure>
${about ? `<p class="about" lang="en">${esc(about)}</p>` : ''}
${lesson.spec ? `<section><h2>${esc(lesson.spec.path)}</h2>${code ? `<pre lang="en"><code>${esc(code)}</code></pre>` : ''}<p><a href="/${esc(lesson.spec.preview)}">${esc(say.SPEC)} ↗</a></p></section>` : ''}
<nav class="pager">${back}${fwd}</nav>`
    : `<p class="kicker">${esc(say.KICKER)}</p>
<h1>${esc(say.TITLE)}</h1>
<p class="goal">${esc(say.LEAD)}</p>
<p>${esc(say.DESCRIPTION)}</p>
<p><a class="cta" href="${appOf(C)}">${esc(say.OPEN_COURSE)} →</a> <a class="cta" href="/${onePagePath(C, lang, VIEW)}">${esc(VIEW.say[lang].ONE_PAGE)} →</a></p>
<p class="free">${esc(LADDER.say[lang].LADDER)}</p>
${catalog}${courses}`
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- GENERATED by scripts/course-pages.mjs from ${C.source.spec}; do not edit. -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${urlOf(C, lang, id)}">
<link rel="alternate" hreflang="${lang}" href="${urlOf(C, lang, id)}">
<link rel="alternate" hreflang="${other}" href="${urlOf(C, other, id)}">
<link rel="alternate" hreflang="x-default" href="${urlOf(C, 'en', id)}">
<meta property="og:type" content="${lesson ? 'article' : 'website'}">
<meta property="og:site_name" content="TRINITY S³AI">
<meta property="og:locale" content="${lang === 'ru' ? 'ru_RU' : 'en_US'}">
<meta property="og:url" content="${urlOf(C, lang, id)}">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(ogDesc)}">
<meta property="og:image" content="${cardUrl}">
<meta property="og:image:width" content="${CARD.width}">
<meta property="og:image:height" content="${CARD.height}">
<meta property="og:image:alt" content="${esc(alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@t27_dev">
<meta name="twitter:title" content="${esc(ogTitle)}">
<meta name="twitter:description" content="${esc(ogDesc)}">
<meta name="twitter:image" content="${cardUrl}">
<meta name="twitter:image:alt" content="${esc(alt)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n')}
<style>
@font-face { font-family: 'Outfit'; font-weight: 400 800; font-display: swap; src: url(/fonts/outfit-latin.woff2) format('woff2'); }
:root { color-scheme: dark; }
body { margin: 0; background: #000; color: #e8eeec; font: 18px/1.6 'Outfit', system-ui, sans-serif; }
main { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
header { display: flex; justify-content: space-between; max-width: 760px; margin: 0 auto; padding: 20px 20px 0; font-size: 15px; }
a { color: #08FAB5; } a:focus-visible { outline: 2px solid #08FAB5; outline-offset: 2px; }
h1 { font-size: clamp(32px, 6vw, 48px); line-height: 1.1; margin: 12px 0 20px; color: #fff; }
h2 { font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: #8fa19d; margin: 28px 0 4px; }
h3 { font-size: 17px; margin: 18px 0 2px; color: #fff; }
.goal { font-size: 21px; color: #fff; }
.kicker, .crumbs { font-size: 14px; letter-spacing: 1px; color: #8fa19d; display: flex; gap: 14px; flex-wrap: wrap; }
.cta { display: inline-block; margin: 20px 0; padding: 12px 22px; border: 1px solid #08FAB5; border-radius: 10px; text-decoration: none; font-weight: 600; }
.cta:hover { background: #08FAB5; color: #000; }
figure { margin: 24px 0; } figure img { width: 100%; height: auto; border: 1px solid #22302c; border-radius: 12px; display: block; }
figcaption { font-size: 15px; margin-top: 8px; }
.courses { margin: 24px 0; padding-left: 1.4em; } .courses li { margin: 6px 0; } .courses [aria-current] a { font-weight: 600; }
.pager { display: flex; justify-content: space-between; gap: 16px; margin: 32px 0; padding-top: 20px; border-top: 1px solid #1e2624; } .pager .chain { font-weight: 600; }
.outline { list-style: none; padding: 0; } .outline ol { list-style: none; padding-left: 0; margin: 4px 0; } .outline p { margin: 0; color: #8fa19d; font-size: 15px; }
pre { overflow-x: auto; background: #0b0f0e; border: 1px solid #1e2624; border-radius: 10px; padding: 14px 16px; font: 13px/1.5 'JetBrains Mono', ui-monospace, monospace; color: #cfe3de; max-height: 520px; }
.about { color: #b9c4c2; font-size: 16px; }
.outline li.on a { color: #fff; font-weight: 600; } footer { color: #8fa19d; font-size: 15px; }
.cta { min-height: 44px; margin-right: 8px; } .free { display: inline-block; padding: 6px 14px; border: 1px solid #fff; border-radius: 999px; color: #fff; font-size: 15px; }
${readFileSync(VIEW_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\/\n?/g, '')}${CLAW_CSS}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
</head>
<body class="op-page">
<header><a href="/${lang === 'ru' ? 'ru/' : ''}">t27.ai</a><a href="/${pathOf(C, other, id)}" hreflang="${other}" lang="${other}">${other === 'ru' ? 'Русский' : 'English'}</a></header>
<main>
${body}
<section><h2>${esc(say.ALL)}</h2><ul class="outline">${outline}</ul></section>
${clawHtml(LADDER, lang)}
<footer><p><a href="/${C.source.publicSpec.replace(/^public\//, '')}">${esc(say.SOURCE)}</a></p><p>${esc(say.WIDGET_LANG)}</p></footer>
</main>
${CARRY_UTM}
</body>
</html>
`
}

// ---------------------------------------------------------------- the build

/** Every page of every course with its card: [{ course, lang, lesson, dir, html, card }]. */
export function buildPages(courses, manifest = {}) {
  const pages = []
  for (const C of courses) {
    for (const lang of C.locales) {
      for (const lesson of [null, ...C.lessons]) {
        const dir = pathOf(C, lang, lesson?.id)
        const card = cardHtml(C, lang, lesson)
        const png = join(PUBLIC, dir, 'card.png')
        const v = existsSync(png) ? sha(readFileSync(png)).slice(0, 12) : 'missing'
        const cardUrl = `${ORIGIN}/${dir}card.png?v=${v}`
        pages.push({ course: C, lang, lesson, dir, card, input: cardInput(card), png, html: pageHtml(C, lang, lesson, cardUrl, courses), drawn: manifest[dir] })
      }
      // The whole course on one page, with its own card.
      const dir = onePagePath(C, lang, VIEW)
      const card = cardHtml(C, lang, null, true)
      const png = join(PUBLIC, dir, 'card.png')
      const v = existsSync(png) ? sha(readFileSync(png)).slice(0, 12) : 'missing'
      const html = onePageHtml(C, lang, { view: VIEW, ladder: LADDER, cardUrl: `${ORIGIN}/${dir}card.png?v=${v}`, share: (url, source) => shareTagged(url, source, 'course', C.route), poolV: sha(readFileSync(POOL)).slice(0, 12), viewCss: readFileSync(VIEW_CSS, 'utf8'), origin: ORIGIN, carryUtm: CARRY_UTM })
      pages.push({ course: C, lang, lesson: null, onePage: true, dir, card, input: cardInput(card), png, html, drawn: manifest[dir] })
    }
  }
  const dirs = pages.map((p) => p.dir)
  const twice = dirs.filter((d, i) => dirs.indexOf(d) !== i)
  if (twice.length) throw new Error(`course-pages: two pages share ${twice.join(', ')}`)
  return pages
}

export function sitemapOf(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- GENERATED by scripts/course-pages.mjs; the courses' static pages. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map((p) => {
    const id = p.lesson?.id
    const at = (lang) => (p.onePage ? `${ORIGIN}/${onePagePath(p.course, lang, VIEW)}` : urlOf(p.course, lang, id))
    return `  <url><loc>${at(p.lang)}</loc>${['en', 'ru'].map((h) => `<xhtml:link rel="alternate" hreflang="${h}" href="${at(h)}"/>`).join('')}</url>`
  }).join('\n')}
</urlset>
`
}

/** The course-deck widget's data: the catalog, then one file per course, [[path, text]]. */
export const deckFiles = (courses) => [
  [join(DECK_DIR, 'index.json'), `${JSON.stringify(courses.map((C) => ({ id: C.id, title: Object.fromEntries(C.locales.map((l) => [l, C.say[l].TITLE])) })))}\n`],
  ...courses.map((C) => [join(DECK_DIR, `${C.id}.json`), `${JSON.stringify(deckData(C, VIEW))}\n`]),
]

/** What is wrong with the pages on disk; empty when current. */
export function problemsOf(pages, sitemap, decks = []) {
  const p = []
  for (const [f, text] of decks) if (!existsSync(f) || readFileSync(f, 'utf8') !== text) p.push(`${relative(SITE, f)} is not current; run node scripts/course-pages.mjs`)
  for (const pg of pages) {
    const f = join(PUBLIC, pg.dir, 'index.html')
    if (!existsSync(f) || readFileSync(f, 'utf8') !== pg.html) p.push(`public/${pg.dir}index.html is not current; run node scripts/course-pages.mjs`)
    if (!existsSync(pg.png)) { p.push(`public/${pg.dir}card.png is missing`); continue }
    const b = readFileSync(pg.png)
    if (b.readUInt32BE(16) !== CARD.width || b.readUInt32BE(20) !== CARD.height) p.push(`public/${pg.dir}card.png must be ${CARD.width}x${CARD.height}`)
    if (b.length > CARD.maxBytes) p.push(`public/${pg.dir}card.png is ${b.length} bytes, over ${CARD.maxBytes}`)
    if (pg.drawn !== pg.input) p.push(`public/${pg.dir}card.png was drawn from other words or pictures; run node scripts/course-pages.mjs`)
    if (/location\.replace|http-equiv="refresh"/.test(pg.html)) p.push(`public/${pg.dir}index.html redirects; a redirecting page is not indexed`)
  }
  const sm = join(PUBLIC, BASE, 'sitemap.xml')
  if (!existsSync(sm) || readFileSync(sm, 'utf8') !== sitemap) p.push(`public/${BASE}/sitemap.xml is not current`)
  return p
}

function findChrome() {
  return [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/BrowserOS.app/Contents/MacOS/BrowserOS',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  ].find((p) => p && existsSync(p))
}

async function render(chrome, html, png) {
  const work = mkdtempSync(join(tmpdir(), 'course-card-'))
  const src = join(work, 'card.html')
  writeFileSync(src, html)
  const before = existsSync(png) ? statSync(png).mtimeMs : 0
  const b = spawn(chrome, ['--headless=new', `--user-data-dir=${join(work, 'profile')}`, '--allow-file-access-from-files', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${CARD.width},${CARD.height}`, '--virtual-time-budget=3000', `--screenshot=${png}`, pathToFileURL(src).href], { stdio: 'ignore', detached: true })
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 300))
    if (existsSync(png) && statSync(png).mtimeMs > before && statSync(png).size > 0) break
  }
  await new Promise((r) => setTimeout(r, 300))
  const exited = new Promise((r) => b.once('exit', r))
  try { process.kill(-b.pid, 'SIGKILL') } catch { b.kill('SIGKILL') } // the whole group: helpers outlive a TERM
  await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))])
  try { rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch { /* a temp dir the OS will clear */ }
  if (!existsSync(png) || statSync(png).mtimeMs <= before) throw new Error(`course-pages: no card written to ${png}`)
}

async function main() {
  const check = process.argv.includes('--check')
  const courses = loadCourses()
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
  let pages = buildPages(courses, manifest)
  if (!check) {
    const stale = pages.filter((p) => p.drawn !== p.input || !existsSync(p.png))
    if (stale.length) {
      const chrome = findChrome()
      if (!chrome) throw new Error('course-pages: cards are stale and no Chromium was found; set CHROME')
      for (const p of stale) {
        mkdirSync(dirname(p.png), { recursive: true })
        await render(chrome, p.card, p.png)
        manifest[p.dir] = p.input
      }
      writeFileSync(MANIFEST, `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2)}\n`)
      console.log(`course-pages: drew ${stale.length} card(s) with ${chrome.split('/').pop()}`)
    }
    pages = buildPages(courses, manifest) // og:image ?v= follows the new card bytes
    for (const p of pages) {
      mkdirSync(join(PUBLIC, p.dir), { recursive: true })
      writeFileSync(join(PUBLIC, p.dir, 'index.html'), p.html)
    }
    writeFileSync(join(PUBLIC, BASE, 'sitemap.xml'), sitemapOf(pages))
    mkdirSync(DECK_DIR, { recursive: true })
    for (const [f, text] of deckFiles(courses)) writeFileSync(f, text)
  }
  const problems = problemsOf(pages, sitemapOf(pages), deckFiles(courses))
  if (problems.length) {
    console.error(problems.join('\n'))
    process.exit(1)
  }
  console.log(`course-pages: ${check ? 'up to date' : 'wrote'} ${pages.length} pages for ${courses.length} courses (${courses.map((c) => c.id).join(', ')}), ${pages.filter((p) => p.onePage).length} of them whole courses on one page, ${pages.length} cards, ${courses.length + 1} course-deck files, ${BASE}/sitemap.xml`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
