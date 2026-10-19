// course-onepage.mjs -- the whole course on one page, and the data the course-deck widget reads.
//
// Owner, 2026-10-19: "make the page with the course's topic fit on one page, so it spreads in the
// network at once -- all the text fits there; and make this page a widget that holds the other
// widgets". scripts/course-pages.mjs calls this for every course and language and writes:
//
//   public/<share path><ONE_PAGE_DIR>/index.html    t27.ai/learn/all/, t27.ai/learn/<course>/all/,
//                                                   and ru/ before each: the course, every module,
//                                                   every lesson's words and its widget
//   public/widgets/course-deck/courses/<id>.json    one course's lessons for the course-deck widget
//
// Every word is a spec's: the course specs (src/lib/course.generated.ts), the one-page view's words
// and every number of the layout (specs/view/course-view.t27 -> src/lib/courseView.generated.ts and
// src/styles/courseView.generated.css), and the TRI CLAW block (specs/ladder/course-ladder.t27 ->
// src/lib/courseLadder.generated.ts). The frames are mounted by public/widgets/frame-pool.js with the
// view spec's budget, so a phone with 27 lessons keeps LIVE_FRAMES_MAX frames, not 27.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const fmt = (s, ...a) => a.reduce((out, x, i) => out.split(`{${i}}`).join(String(x)), s)
export const pad = (n) => String(n).padStart(2, '0')
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c')
/** A search snippet: Google shows about 155 characters, so cut at a word before that. */
export const snippet = (s, max = 155) => (s.length <= max ? s : `${s.slice(0, max).replace(/\s+\S*$/, '')}…`)

/** The object a generated module exports as `export const <name> = {...} as const`. */
export function loadConst(file, name) {
  const s = readFileSync(file, 'utf8')
  const head = `export const ${name} = `
  const at = s.indexOf(head)
  if (at < 0) throw new Error(`${file}: no ${name}`)
  return JSON.parse(s.slice(at + head.length, s.indexOf('\n} as const', at) + 2))
}

/** The one-page view's site path: the course's share path, then ONE_PAGE_DIR; ru/ before it. */
export const onePagePath = (C, lang, view) => `${lang === 'ru' ? 'ru/' : ''}${C.share}${view.onePageDir}/`

/** A widget frame's reserved height: the lesson's own, held to the view spec's band. */
export const frameHeight = (h, view) => Math.min(view.FRAME_MAX_PX, Math.max(view.FRAME_MIN_PX, Number(h) || view.FRAME_MIN_PX))

/** A widget page on this site, framed with its words in the reader's language. */
const framed = (preview, lang) => `/${preview}${lang === 'ru' && preview.startsWith('widgets/') ? `${preview.includes('?') ? '&' : '?'}lang=ru` : ''}`

/** The TRI CLAW block, the same three paths as the app's footer (components/Footer.tsx ClawPromo). */
export function clawHtml(ladder, lang) {
  const say = ladder.say[lang]
  const c = ladder.claw
  const third = c.githubIsApp ? ['CLAW_APP_TITLE', 'CLAW_APP_LINE', 'CLAW_APP_PRESS'] : ['CLAW_POST_TITLE', 'CLAW_POST_LINE', 'CLAW_POST_PRESS']
  const paths = [
    ['keys', say.CLAW_FREE_TITLE, say.CLAW_FREE_LINE, say.CLAW_FREE_PRESS, c.keys, true],
    ['club', say.CLAW_PAID_TITLE, say.CLAW_PAID_LINE, say.CLAW_PAID_PRESS, c.club, false],
    ['github', ...third.map((k) => say[k]), c.github, false],
  ]
  return `<aside class="claw" aria-labelledby="claw-title"><p class="claw-kicker">${esc(say.CLAW_KICKER)}</p><h2 class="claw-title" id="claw-title">${esc(say.CLAW_TITLE)}</h2><p class="claw-line">${esc(say.CLAW_LINE)}</p><ul class="claw-paths">${paths
    .map(([key, title, line, press, href, primary]) => `<li class="claw-path${primary ? ' is-primary' : ''}" data-claw="${key}"><h3 class="claw-path-title">${esc(title)}</h3><p class="claw-path-line">${esc(line)}</p><a class="claw-press" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(press)} ↗</a></li>`)
    .join('')}</ul></aside>`
}

/** The TRI CLAW block's look: one stylesheet for the app's footer (components/Footer.tsx imports
 * it) and for every static course page (inlined here). */
export const CLAW_CSS = readFileSync(new URL('../src/styles/claw.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/\n?/g, '').trim()

/** The lessons of one course, as the course-deck widget reads them: words in both languages. */
export function deckData(C, view) {
  const both = (pick) => Object.fromEntries(C.locales.map((l) => [l, pick(l)]))
  return {
    id: C.id,
    route: C.route,
    title: both((l) => C.say[l].TITLE),
    onePage: both((l) => `/${onePagePath(C, l, view)}`),
    modules: C.modules.map((m) => ({
      n: m.n,
      title: both((l) => m[l].title),
      lessons: m.lessons.map((id) => {
        const l = C.lessons.find((x) => x.id === id)
        return { id, n: l.n, title: both((g) => l[g].title), goal: both((g) => l[g].goal), frame: l.widget.preview, widget: l.widget.title, height: frameHeight(l.widget.height, view) }
      }),
    })),
  }
}

/**
 * The page. `share(url, source)` tags a link that leaves for another site (src/lib/shareTags.ts);
 * `poolV` stamps frame-pool.js; `viewCss` is src/styles/courseView.generated.css.
 */
export function onePageHtml(C, lang, { view, ladder, cardUrl, share, poolV, viewCss, origin, carryUtm }) {
  const say = C.say[lang]
  const vs = view.say[lang]
  const ls = ladder.say[lang]
  const other = lang === 'en' ? 'ru' : 'en'
  const total = C.lessons.length
  const url = `${origin}/${onePagePath(C, lang, view)}`
  const title = fmt(vs.ONE_PAGE_TITLE, say.TITLE)
  const alt = `${say.TITLE}. ${vs.ONE_PAGE_LINE}`
  const lessonUrl = (l) => `${origin}/${lang === 'ru' ? 'ru/' : ''}learn/${l.id}/`
  const courseUrl = `${origin}/${lang === 'ru' ? 'ru/' : ''}${C.share}`
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Course', name: say.TITLE, description: say.DESCRIPTION, url, inLanguage: lang, isAccessibleForFree: true,
      provider: { '@type': 'Organization', name: 'TRINITY S³AI', url: `${origin}/` },
      hasPart: C.lessons.map((l) => ({ '@type': 'LearningResource', name: l[lang].title, url: lessonUrl(l), position: l.n })),
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 't27.ai', item: `${origin}/${lang === 'ru' ? 'ru/' : ''}` },
      { '@type': 'ListItem', position: 2, name: say.TITLE, item: courseUrl },
      { '@type': 'ListItem', position: 3, name: vs.ONE_PAGE, item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: C.lessons.map((l) => ({ '@type': 'ListItem', position: l.n, url: `${url}#lesson-${l.n}`, name: l[lang].title })) },
  ]
  const enc = encodeURIComponent
  const net = (source, href) => href(enc(share(url, source)))
  const shareRow = `<div class="op-share" role="group" aria-label="${esc(vs.SHARE_PAGE)}"><span class="op-label">${esc(vs.SHARE_PAGE)}</span><button type="button" class="op-pill" data-share="${esc(share(url, 'native'))}" data-title="${esc(title)}">${esc(vs.SHARE_PAGE)}</button><button type="button" class="op-pill" data-copy="${esc(share(url, 'copy'))}">${esc(vs.COPY)}</button><a class="op-pill" href="${net('x', (u) => `https://twitter.com/intent/tweet?url=${u}&amp;text=${enc(title)}`)}" target="_blank" rel="noopener noreferrer">X</a><a class="op-pill" href="${net('telegram', (u) => `https://t.me/share/url?url=${u}&amp;text=${enc(title)}`)}" target="_blank" rel="noopener noreferrer">Telegram</a><a class="op-pill" href="${net('linkedin', (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`)}" target="_blank" rel="noopener noreferrer">LinkedIn</a></div>`
  const tocList = `<ol class="op-toc-mods">${C.modules
    .map((m) => `<li><a class="op-toc-mod" href="#module-${m.n}">${pad(m.n)} · ${esc(m[lang].title)}</a><ol>${m.lessons
      .map((id) => C.lessons.find((l) => l.id === id))
      .map((l) => `<li><a class="op-toc-lesson" href="#lesson-${l.n}" data-n="${l.n}" data-id="${esc(l.id)}"><i class="op-dot" aria-hidden="true"></i><span>${pad(l.n)} ${esc(l[lang].title)}</span></a></li>`)
      .join('')}</ol></li>`)
    .join('')}</ol>`
  const lessonHtml = (l) => {
    const t = l[lang]
    const h = frameHeight(l.widget.height, view)
    const spec = l.spec ? `<a href="/${esc(l.spec.preview)}" target="_blank" rel="noopener" data-lang-exempt="spec-path">${esc(say.SPEC)}: ${esc(l.spec.path)} ↗</a>` : ''
    return `<article class="op-lesson" id="lesson-${l.n}" data-n="${l.n}" data-id="${esc(l.id)}" aria-labelledby="lesson-${l.n}-title">
<header class="op-lesson-head"><a class="op-lesson-n" href="#lesson-${l.n}" title="${esc(vs.LESSON_LINK)}" aria-label="${esc(vs.LESSON_LINK)}: ${esc(t.title)}">${pad(l.n)}</a><div><p class="op-label">${esc(fmt(say.LESSON, l.n, total))}</p><h3 id="lesson-${l.n}-title">${esc(t.title)}</h3></div></header>
<div class="op-grid">
<div class="op-text"><p class="op-goal"><span class="op-label">${esc(say.GOAL)}</span>${esc(t.goal)}</p><p>${esc(t.text)}</p><div class="op-task"><span class="op-label">${esc(say.TRY)}</span><p>${esc(t.task)}</p></div></div>
<figure class="op-stage"><div class="op-slot" data-src="${esc(framed(l.widget.preview, lang))}" data-title="${esc(l.widget.title)}" style="height:${h}px"><div class="op-ph"><span class="op-ph-title" data-lang-exempt="widget-title">${esc(l.widget.title)}</span><button type="button" class="op-pill" data-load>${esc(vs.LOAD)}</button><small>${esc(vs.WAITING)}</small></div></div><figcaption><a href="${esc(l.widget.url.replace(origin, ''))}" target="_blank" rel="noopener">${esc(say.OPEN_PAGE)} ↗</a>${spec}</figcaption></figure>
<div class="op-actions"><button type="button" class="op-pill op-mark" data-mark="${esc(l.id)}" aria-pressed="false">${esc(say.MARK)}</button><button type="button" class="op-pill" data-share="${esc(share(lessonUrl(l), 'native'))}" data-title="${esc(t.title)}">${esc(vs.SHARE_LESSON)}</button><a class="op-pill" href="/#/${esc(C.route)}/${esc(l.id)}">${esc(say.OPEN_LESSON)} →</a></div>
</div>
</article>`
  }
  const modules = C.modules
    .map((m) => `<section class="op-module" id="module-${m.n}" aria-labelledby="module-${m.n}-title"><header class="op-module-head"><span class="op-module-n" aria-hidden="true">${pad(m.n)}</span><div><h2 id="module-${m.n}-title">${esc(fmt(say.MODULE, m.n))} · ${esc(m[lang].title)}</h2><p>${esc(m[lang].line)}</p></div></header>
${m.lessons.map((id) => lessonHtml(C.lessons.find((l) => l.id === id))).join('\n')}
</section>`)
    .join('\n')
  const chain = (to, isNext) => `<a href="/${lang === 'ru' ? 'ru/' : ''}${to.share}${view.onePageDir}/">${isNext ? `${esc(say.NEXT_COURSE)}: ${esc(to.title[lang])} →` : `← ${esc(say.PREV_COURSE)}: ${esc(to.title[lang])}`}</a>`
  const words = { PROGRESS: say.PROGRESS, MARK: say.MARK, MARKED: say.MARKED, COPY: vs.COPY, COPIED: vs.COPIED, LESSON: say.LESSON }
  const cfg = { live: view.LIVE_FRAMES_MAX, mount: view.MOUNT_MARGIN_PX, unmount: view.UNMOUNT_MARGIN_PX, key: C.progressKey, total }
  const V = view
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- GENERATED by scripts/course-pages.mjs (course-onepage.mjs) from ${C.source.spec}; do not edit. -->
<title>${esc(title)} · t27</title>
<meta name="description" content="${esc(snippet(say.DESCRIPTION))}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="${lang}" href="${url}">
<link rel="alternate" hreflang="${other}" href="${origin}/${onePagePath(C, other, view)}">
<link rel="alternate" hreflang="x-default" href="${origin}/${onePagePath(C, 'en', view)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TRINITY S³AI">
<meta property="og:locale" content="${lang === 'ru' ? 'ru_RU' : 'en_US'}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(vs.ONE_PAGE_LINE)}">
<meta property="og:image" content="${cardUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@t27_dev">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(vs.ONE_PAGE_LINE)}">
<meta name="twitter:image" content="${cardUrl}">
<meta name="twitter:image:alt" content="${esc(alt)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/outfit-latin.woff2" as="font" type="font/woff2" crossorigin>
${ld.map((x) => `<script type="application/ld+json">${json(x)}</script>`).join('\n')}
<style>
${viewCss.replace(/\/\*[\s\S]*?\*\/\n?/g, '')}
@font-face { font-family: 'Outfit'; font-weight: 400 800; font-display: swap; src: url(/fonts/outfit-latin.woff2) format('woff2'); }
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; } }
body { margin: 0; background: #000; color: #e6e6e6; font: var(--course-text-px)/1.65 'Outfit', system-ui, sans-serif; padding-bottom: calc(var(--course-thumb-bar) + env(safe-area-inset-bottom)); overflow-x: hidden; }
a { color: #fff; text-underline-offset: 3px; text-decoration-color: #777; }
a:hover { text-decoration-color: #fff; }
:focus-visible { outline: var(--course-focus-ring) solid #fff; outline-offset: 2px; }
.op-label { display: block; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: #a6a6a6; margin: 0 0 6px; }
.op-head { display: flex; justify-content: space-between; align-items: center; max-width: var(--course-page-max); margin: 0 auto; padding: 0 var(--course-gutter-phone); border-bottom: 1px solid #1f1f1f; }
.op-head a { display: inline-flex; align-items: center; min-height: var(--course-touch); padding: 0 6px; text-decoration: none; font-size: 15px; }
.op-head nav { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.op-shell { max-width: var(--course-page-max); margin: 0 auto; padding: 0 var(--course-gutter-phone); }
.op-main { min-width: 0; }
.op-toc { display: none; }
.op-intro { padding: 28px 0 8px; }
.op-kicker { display: block; border-top: 6px solid #fff; border-bottom: 1px solid #fff; padding: 8px 0; margin: 0 0 20px; font-size: 12px; letter-spacing: .28em; text-transform: uppercase; color: #fff; font-weight: 600; }
h1 { font-size: clamp(36px, 9vw, 96px); line-height: .95; letter-spacing: -.04em; font-weight: 800; color: #fff; margin: 0 0 20px; text-wrap: balance; overflow-wrap: break-word; hyphens: auto; }
.op-lead { font-size: clamp(20px, 2.6vw, 28px); line-height: 1.3; color: #fff; margin: 0 0 14px; max-width: var(--course-read); }
.op-desc { color: #b3b3b3; max-width: var(--course-read); margin: 0 0 16px; }
.op-free { display: inline-block; margin: 0 0 16px; padding: 8px 14px; border: 1px solid #fff; border-radius: 999px; font-size: 15px; color: #fff; }
.op-share, .op-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0 16px; }
.op-share .op-label { width: 100%; margin: 0; }
.op-pill { display: inline-flex; align-items: center; justify-content: center; min-height: var(--course-touch); min-width: var(--course-touch); padding: 0 16px; border: 1px solid #555; border-radius: 999px; background: #000; color: #fff; font: inherit; font-size: 15px; text-decoration: none; cursor: pointer; }
.op-pill:hover { border-color: #fff; }
.op-pill[aria-pressed="true"] { background: #fff; color: #000; border-color: #fff; }
.op-cta { background: #fff; color: #000; border-color: #fff; font-weight: 600; }
.op-bar { display: grid; grid-template-columns: repeat(${total}, 1fr); gap: 3px; max-width: 760px; margin: 12px 0 6px; }
.op-bar i { height: 6px; border-radius: 2px; background: #262626; }
.op-bar i.is-done { background: #fff; }
.op-bar i.is-here { background: #8a8a8a; }
.op-progress { margin: 0 0 8px; color: #a6a6a6; font-size: 15px; font-variant-numeric: tabular-nums; }
.op-module { padding-top: 32px; margin-top: 40px; border-top: 6px solid #fff; }
.op-module-head { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 8px; }
.op-module-n { font-weight: 800; font-size: clamp(48px, 8vw, 88px); line-height: .8; color: transparent; -webkit-text-stroke: 1.5px #fff; }
.op-module h2 { margin: 0 0 6px; font-size: clamp(24px, 3.4vw, 40px); line-height: 1.05; color: #fff; letter-spacing: -.02em; }
.op-module-head p { margin: 0; color: #a6a6a6; font-size: 16px; }
.op-lesson { padding: 32px 0 8px; border-bottom: 1px solid #1f1f1f; scroll-margin-top: 12px; }
.op-lesson-head { display: flex; gap: 14px; align-items: baseline; margin-bottom: 16px; }
.op-lesson-n { flex: none; display: inline-flex; align-items: center; justify-content: center; min-width: var(--course-touch); min-height: var(--course-touch); font: 500 26px/1 'JetBrains Mono', ui-monospace, monospace; color: #fff; text-decoration: none; border: 1px solid #333; border-radius: 10px; }
.op-lesson h3 { margin: 0; font-size: clamp(24px, 3.2vw, 38px); line-height: 1.1; color: #fff; letter-spacing: -.02em; text-wrap: balance; }
.op-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; grid-template-areas: "text" "stage" "actions"; }
.op-text { grid-area: text; max-width: var(--course-read); }
.op-text > p { margin: 0 0 18px; }
.op-goal { font-size: 20px; line-height: 1.4; color: #fff; }
.op-task { border-top: 6px solid #fff; border-bottom: 1px solid #fff; padding: 12px 0 14px; }
.op-task p { margin: 0; color: #fff; font-weight: 700; font-size: clamp(19px, 2vw, 23px); line-height: 1.35; }
.op-stage { grid-area: stage; margin: 0; min-width: 0; }
.op-stage figcaption { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 8px; font-size: 14px; }
.op-stage figcaption a { display: inline-flex; align-items: center; min-height: var(--course-touch); }
.op-actions { grid-area: actions; margin: 0; }
.op-slot { position: relative; min-height: var(--course-frame-min); border: 1px solid #262626; border-radius: 12px; overflow: hidden; background: #050505; contain: layout paint; }
.op-slot iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
.op-ph { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 16px; text-align: center; background: repeating-linear-gradient(135deg, #070707 0 14px, #0b0b0b 14px 28px); }
.op-ph-title { color: #d0d0d0; font-size: 16px; max-width: 46ch; }
.op-ph small { color: #a6a6a6; font-size: 14px; }
.op-slot.is-live .op-ph { display: none; }
.op-foot { margin: 40px 0 24px; color: #a6a6a6; font-size: 15px; }
.op-foot nav { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin: 24px 0; }
.op-foot nav a { display: inline-flex; align-items: center; min-height: var(--course-touch); font-weight: 600; }
.op-foot p a { display: inline-flex; align-items: center; min-height: var(--course-touch); }
.op-toc-title { margin: 0 0 8px; }
.op-toc-mods, .op-toc-mods ol { list-style: none; margin: 0; padding: 0; }
.op-toc-mod { display: flex; align-items: center; min-height: var(--course-touch); margin: 8px 0 0; font-weight: 700; font-size: 14px; color: #fff; text-decoration: none; }
.op-toc-lesson { display: flex; gap: 10px; align-items: center; min-height: var(--course-touch); padding: 0 6px; border-radius: 8px; color: #c8c8c8; text-decoration: none; font-size: 14px; line-height: 1.25; }
.op-toc-lesson:hover, .op-toc-lesson[aria-current="true"] { background: #141414; color: #fff; }
.op-dot { flex: none; width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid #8a8a8a; }
.op-toc-lesson.is-done .op-dot { background: #fff; border-color: #fff; }
.op-toc-lesson[aria-current="true"] .op-dot { box-shadow: 0 0 0 3px #555; }
.op-thumb { position: fixed; left: 0; right: 0; bottom: 0; z-index: 5; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; min-height: var(--course-thumb-bar); padding: 6px var(--course-gutter-phone) calc(6px + env(safe-area-inset-bottom)); background: rgba(0, 0, 0, .95); border-top: 1px solid #333; }
.op-thumb .op-pill { padding: 0 14px; }
.op-thumb [data-contents] { justify-content: flex-start; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.op-thumb [aria-disabled="true"] { opacity: .4; pointer-events: none; }
.op-sheet { width: min(100vw, 560px); max-height: 80vh; margin: auto auto 0; padding: 0 0 env(safe-area-inset-bottom); border: 1px solid #333; border-radius: 16px 16px 0 0; background: #050505; color: #e6e6e6; }
.op-sheet::backdrop { background: rgba(0, 0, 0, .7); }
.op-sheet-head { position: sticky; top: 0; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px 8px 16px; background: #050505; border-bottom: 1px solid #222; }
.op-sheet .op-toc-mods { padding: 0 12px 16px; }
@media (min-width: ${V.NARROW_MAX_PX + 1}px) {
  .op-shell, .op-head { padding: 0 var(--course-gutter-wide); }
  .op-thumb { padding-inline: var(--course-gutter-wide); }
}
@media (min-width: ${V.SIDE_BY_SIDE_MIN_PX}px) {
  .op-grid { grid-template-columns: minmax(0, var(--course-read)) minmax(var(--course-widget-min), 1fr); grid-template-rows: auto 1fr; grid-template-areas: "text stage" "actions stage"; column-gap: var(--course-col-gap); align-items: start; }
}
@media (min-width: ${V.TOC_SIDEBAR_MIN_PX}px) {
  body { padding-bottom: 0; }
  .op-shell { display: grid; grid-template-columns: var(--course-toc-width) minmax(0, 1fr); column-gap: var(--course-col-gap); }
  .op-toc { display: block; position: sticky; top: 0; align-self: start; max-height: 100vh; overflow: auto; padding: 20px 4px 24px 0; }
  .op-thumb { display: none; }
}
${CLAW_CSS}
@media print {
  body { background: #fff; color: #000; padding: 0; font-size: 12pt; }
  .op-head nav, .op-toc, .op-thumb, .op-sheet, .op-share, .op-actions, .op-ph button, .op-ph small, .claw, .op-foot nav { display: none !important; }
  h1, h2, h3, .op-lead, .op-goal, .op-task p, .op-kicker, .op-free { color: #000; border-color: #000; }
  .op-module-n { -webkit-text-stroke: 1px #000; }
  .op-grid { display: block; }
  .op-slot { height: auto !important; min-height: 0; border: 1px solid #999; contain: none; }
  .op-slot iframe { display: none; }
  .op-ph { position: static; background: none; }
  .op-ph-title { color: #000; }
  .op-lesson { break-inside: avoid-page; }
  .op-module { break-before: page; }
  a { color: #000; }
  .op-stage figcaption a::after { content: ' ' attr(href); }
}
</style>
</head>
<body class="op-page">
<header class="op-head"><a href="/${lang === 'ru' ? 'ru/' : ''}">t27.ai</a><nav><a href="/${lang === 'ru' ? 'ru/' : ''}${C.share}">${esc(say.ALL)}</a><a href="/${onePagePath(C, other, view)}" hreflang="${other}" lang="${other}">${other === 'ru' ? 'Русский' : 'English'}</a></nav></header>
<div class="op-shell">
<nav class="op-toc" id="contents" aria-label="${esc(vs.CONTENTS)}"><p class="op-label op-toc-title">${esc(vs.CONTENTS)}</p>${tocList}</nav>
<main class="op-main" id="top">
<section class="op-intro">
<p class="op-kicker">${esc(say.KICKER)} · ${esc(vs.ONE_PAGE)}</p>
<h1>${esc(say.TITLE)}</h1>
<p class="op-lead">${esc(say.LEAD)}</p>
<p class="op-desc">${esc(say.DESCRIPTION)}</p>
<p class="op-free">${esc(ls.LADDER)}</p>
${shareRow}
<div class="op-bar" aria-hidden="true">${C.lessons.map((l) => `<i data-n="${l.n}" data-id="${esc(l.id)}"></i>`).join('')}</div>
<p class="op-progress" data-progress aria-live="polite">${esc(fmt(say.PROGRESS, 0, total))}</p>
<p><a class="op-pill op-cta" href="/#/${esc(C.route)}">${esc(say.OPEN_COURSE)} →</a></p>
</section>
${modules}
<footer class="op-foot">
${clawHtml(ladder, lang)}
<nav>${C.prev ? chain(C.prev, false) : '<span></span>'}${C.next ? chain(C.next, true) : '<span></span>'}</nav>
<p><a href="/${C.source.publicSpec.replace(/^public\//, '')}">${esc(say.SOURCE)}</a></p>
<p>${esc(say.WIDGET_LANG)}</p>
<p><a href="#top">${esc(vs.TOP)} ↑</a></p>
</footer>
</main>
</div>
<nav class="op-thumb" aria-label="${esc(vs.JUMP)}"><a class="op-pill" data-prev href="#top" aria-label="${esc(say.PREV)}">←</a><button type="button" class="op-pill" data-contents aria-haspopup="dialog" aria-controls="op-sheet">${esc(vs.CONTENTS)} · <span data-at>${pad(1)}/${total}</span></button><a class="op-pill" data-next href="#lesson-1" aria-label="${esc(say.NEXT)}">→</a></nav>
<dialog class="op-sheet" id="op-sheet" aria-label="${esc(vs.CONTENTS)}"><div class="op-sheet-head"><span class="op-label">${esc(vs.CONTENTS)}</span><button type="button" class="op-pill" data-close aria-label="${esc(vs.TOP)}">×</button></div>${tocList}</dialog>
<script>window.OP=${json({ say: words, ...cfg })}</script>
<script type="module">
import { framePool } from '/widgets/frame-pool.js?v=${poolV}'
const { say, live, mount, unmount, key, total } = window.OP
const fmt = (s, ...a) => a.reduce((o, x, i) => o.split('{' + i + '}').join(String(x)), s)
const pad = (n) => String(n).padStart(2, '0')
window.__t27Pool = framePool({ slots: document.querySelectorAll('.op-slot'), live, mount, unmount })
const read = () => { try { const l = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(l) ? l.filter((x) => typeof x === 'string') : [] } catch { return [] } }
const write = (l) => { try { localStorage.setItem(key, JSON.stringify(l)) } catch {} }
const lessons = [...document.querySelectorAll('.op-lesson')]
let here = 1
function paint() {
  const done = new Set(read())
  const mine = lessons.filter((a) => done.has(a.dataset.id)).length
  document.querySelector('[data-progress]').textContent = fmt(say.PROGRESS, mine, total)
  document.querySelectorAll('.op-bar i').forEach((i) => { i.classList.toggle('is-done', done.has(i.dataset.id)); i.classList.toggle('is-here', Number(i.dataset.n) === here && !done.has(i.dataset.id)) })
  document.querySelectorAll('.op-toc-lesson').forEach((a) => { a.classList.toggle('is-done', done.has(a.dataset.id)); a.setAttribute('aria-current', Number(a.dataset.n) === here ? 'true' : 'false') })
  document.querySelectorAll('[data-mark]').forEach((b) => { const on = done.has(b.dataset.mark); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '✓ ' + say.MARKED : say.MARK })
  const prev = document.querySelector('[data-prev]'), next = document.querySelector('[data-next]')
  prev.href = here > 1 ? '#lesson-' + (here - 1) : '#top'
  next.href = '#lesson-' + Math.min(total, here + 1)
  next.setAttribute('aria-disabled', String(here >= total))
  document.querySelector('[data-at]').textContent = pad(here) + '/' + total
}
document.addEventListener('click', (e) => {
  const m = e.target.closest('[data-mark]')
  if (m) { const l = read(), id = m.dataset.mark; write(l.includes(id) ? l.filter((x) => x !== id) : [...l, id]); paint(); return }
  const c = e.target.closest('[data-copy]')
  if (c) { navigator.clipboard?.writeText(c.dataset.copy).then(() => { c.textContent = say.COPIED; setTimeout(() => (c.textContent = say.COPY), 1600) }, () => window.prompt(say.COPY, c.dataset.copy)); return }
  const s = e.target.closest('[data-share]')
  if (s) { if (navigator.share) navigator.share({ title: s.dataset.title, url: s.dataset.share }).catch(() => {}); else navigator.clipboard?.writeText(s.dataset.share).then(() => { const t = s.textContent; s.textContent = say.COPIED; setTimeout(() => (s.textContent = t), 1600) }, () => window.prompt(say.COPY, s.dataset.share)); return }
  const sheet = document.getElementById('op-sheet')
  if (e.target.closest('[data-contents]')) { sheet.showModal(); sheet.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' }); return }
  if (e.target.closest('[data-close]') || (sheet.open && e.target.closest('.op-sheet a'))) sheet.close()
})
const seen = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) here = Number(e.target.dataset.n)
  paint()
}, { rootMargin: '-35% 0px -60% 0px' })
lessons.forEach((a) => seen.observe(a))
addEventListener('storage', (e) => { if (e.key === key) paint() })
paint()
</script>
${carryUtm}
</body>
</html>
`
}
