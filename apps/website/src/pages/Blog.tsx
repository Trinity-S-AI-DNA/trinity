import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import Cover from '../components/BlogCover'
import TerminalCast from '../components/TerminalCast'
import { publishedPosts, postBySlug } from '../data/blog/index'
import type { Block, Post, PostBody, PostMeta } from '../data/blog/types'
import { useI18n } from '../i18n/context'
import { shareTagged } from '../lib/shareTags'

// The courses under every post (owner, 2026-10-13: adverts across the blog). Lazy: the course
// list is ~850 KB, so it loads after the article and never delays it.
const CourseShelf = lazy(() => import('../components/CourseShelf'))

// The blog was English-only whatever the language switcher said. These are the
// page's own words; a post's words travel with the post, in its `ru` field.
const UI = {
  en: {
    blog: 'Blog',
    lede: 'Measured results and the methods behind them. Every number in a post traces to an artefact; a post goes live when it does. Published here first; every other channel links back to this page.',
    empty: 'No posts published yet. Drafts exist but still have gaps — a post goes live when every number in it can be traced to an artefact.',
    openLabel: 'Not proven / still open',
    receipts: 'Receipts',
    notPublished: 'Not published',
    missing: 'This post either does not exist or is still a draft.',
    back: 'Back to the blog',
    allPosts: '← All posts',
    min: 'min',
    onlyEnglish: 'This post has not been translated yet, so it is shown in English.',
    share: 'Share',
    copyLink: 'Copy link',
    copied: 'Copied',
    feed: 'RSS',
    loading: 'Loading post…',
    loadFailed: 'The interactive version could not load this post.',
    readStatic: 'Read the complete static version',
  },
  ru: {
    blog: 'Блог',
    lede: 'Измеренные результаты и методы, которыми они получены. Каждая цифра в посте возводится к артефакту — пост выходит, когда это так. Публикуется сначала здесь; все остальные площадки ссылаются сюда.',
    empty: 'Опубликованных постов пока нет. Черновики есть, но в них остались пробелы — пост выходит, когда каждую цифру в нём можно возвести к артефакту.',
    openLabel: 'Не доказано / остаётся открытым',
    receipts: 'Чем это подтверждено',
    notPublished: 'Не опубликовано',
    missing: 'Этого поста либо нет, либо он ещё черновик.',
    back: 'Вернуться в блог',
    allPosts: '← Все посты',
    min: 'мин',
    onlyEnglish: 'Этот пост ещё не переведён и показан по-английски.',
    share: 'Поделиться',
    copyLink: 'Скопировать ссылку',
    copied: 'Скопировано',
    feed: 'RSS',
    loading: 'Загрузка поста…',
    loadFailed: 'Интерактивная версия не смогла загрузить этот пост.',
    readStatic: 'Открыть полную статическую версию',
  },
} as const

/** A post in the reader's language, or the English one when there is no translation. */
function localise(post: Post, lang: string): Post {
  return lang === 'ru' && post.ru ? { ...post, ...post.ru } : post
}

function localiseMeta(post: PostMeta, lang: string): PostMeta {
  return lang === 'ru' && post.ru ? { ...post, ...post.ru } : post
}

const bodyModules = import.meta.glob('../data/blog/bodies/*.ts') as Record<
  string,
  () => Promise<PostBody>
>

function loadPostBody(slug: string) {
  const loader = bodyModules[`../data/blog/bodies/${slug}.ts`]
  return loader ? loader() : Promise.resolve(undefined)
}

function ui(lang: string) {
  return lang === 'ru' ? UI.ru : UI.en
}

/** Turn taxonomy labels into share-safe, visible hashtags without changing
 * the source tags used by feeds and publishing APIs. */
export function blogHashtag(tag: string) {
  const words = tag.replace(/^#+/, '').match(/[\p{L}\p{N}]+/gu) ?? []
  if (!words.length) throw new Error(`Invalid empty blog tag: ${tag}`)
  return `#${words.map((word) => {
    if (words.length === 1 || /^[A-Z0-9]+$/.test(word)) return word
    return word[0].toUpperCase() + word.slice(1)
  }).join('')}`
}

function hashtagLine(tags: string[]) {
  if (!tags.length) throw new Error('Every blog post must have at least one tag')
  return tags.map(blogHashtag).join(' · ')
}

type WorkTrack = 'verification' | 'arithmetic' | 'engineering' | 'training'

const WORK = {
  en: {
    eyebrow: 'Work with me',
    primary: 'Discuss your project',
    servicesLabel: 'Services',
    tracks: {
      verification: {
        title: 'Want this kind of check on your own design?',
        body: 'I audit RTL and build independent, bit-exact models, then take the result through synthesis and, when useful, onto an Artix-7 board. The first conformance module is free.',
        detail: 'See the verification service',
        href: 'https://t27.ai/verification/',
      },
      arithmetic: {
        title: 'Need arithmetic built for your constraints?',
        body: 'I design low-precision and ternary formats, synthesizable RTL, independent reference models and bit-exact vectors. Existing measured cores can also be licensed.',
        detail: 'See IP and custom arithmetic',
        href: 'https://t27.ai/ip/',
      },
      engineering: {
        title: 'Need an FPGA/RTL problem taken to measured hardware?',
        body: 'I work contract and part-time on hardware-AI, FPGA/RTL and ML systems — from specification and open toolchains to reproducible measurements.',
        detail: 'See how I work',
        href: 'https://t27.ai/about/',
      },
      training: {
        title: 'Want your team to build and verify this themselves?',
        body: 'I run a self-paced FPGA course, a four-week cohort and two-day team workshops built around a problem your engineers actually have.',
        detail: 'See courses and workshops',
        href: 'https://t27.ai/course/',
      },
    },
    services: [
      ['Verification', 'https://t27.ai/verification/'],
      ['IP licensing', 'https://t27.ai/ip/'],
      ['Courses and workshops', 'https://t27.ai/course/'],
      ['Contract work', 'https://t27.ai/about/'],
    ],
  },
  ru: {
    eyebrow: 'Поработаем вместе',
    primary: 'Обсудить задачу',
    servicesLabel: 'Услуги',
    tracks: {
      verification: {
        title: 'Хотите так же проверить собственный дизайн?',
        body: 'Я аудирую RTL и строю независимые побитово точные модели, затем провожу результат через синтез и, когда это полезно, проверяю на плате Artix-7. Первый модуль проверки — бесплатно.',
        detail: 'Услуга верификации',
        href: 'https://t27.ai/ru/verification/',
      },
      arithmetic: {
        title: 'Нужна арифметика под ваши ограничения?',
        body: 'Я проектирую форматы низкой разрядности и троичную арифметику, синтезируемый RTL, независимые референсные модели и побитовые тест-векторы. Готовые измеренные ядра можно лицензировать.',
        detail: 'IP и заказная арифметика',
        href: 'https://t27.ai/ru/ip/',
      },
      engineering: {
        title: 'Нужно довести FPGA/RTL-задачу до замеров на железе?',
        body: 'Работаю по контракту и part-time с hardware-AI, FPGA/RTL и ML-системами — от спецификации и открытого тулчейна до воспроизводимых измерений.',
        detail: 'Как я работаю',
        href: 'https://t27.ai/ru/about/',
      },
      training: {
        title: 'Хотите, чтобы команда умела строить и проверять это сама?',
        body: 'Провожу самостоятельный FPGA-курс, четырёхнедельный поток и двухдневные воркшопы вокруг реальной задачи вашей команды.',
        detail: 'Курсы и воркшопы',
        href: 'https://t27.ai/ru/course/',
      },
    },
    services: [
      ['Верификация', 'https://t27.ai/ru/verification/'],
      ['Лицензирование IP', 'https://t27.ai/ru/ip/'],
      ['Курсы и воркшопы', 'https://t27.ai/ru/course/'],
      ['Контрактная работа', 'https://t27.ai/ru/about/'],
    ],
  },
} as const

const verificationTags = new Set([
  'audit', 'ci', 'conformance', 'formal', 'methodology', 'mutation testing',
  'reproducibility', 'static analysis', 'test design', 'testing', 'verification',
])
const arithmeticTags = new Set([
  '4-bit', 'accuracy', 'arithmetic', 'attention', 'golden ratio', 'mxfp4',
  'number formats', 'numeric formats', 'quantisation', 'quantization', 'scaling',
  'ternary', 'transformers',
])
const engineeringTags = new Set([
  'artix-7', 'ethernet', 'fpga', 'hardware', 'litex', 'nextpnr', 'open source',
  'openxc7', 'place and route', 'rgmii', 'timing', 'tooling', 'yosys', 'zynq',
])

function workTrack(post: PostMeta): WorkTrack {
  const tags = post.tags.map((tag) => tag.toLowerCase())
  if (tags.includes('training')) return 'training'
  if (tags.some((tag) => verificationTags.has(tag))) return 'verification'
  if (tags.some((tag) => arithmeticTags.has(tag))) return 'arithmetic'
  if (tags.some((tag) => engineeringTags.has(tag))) return 'engineering'
  return 'engineering'
}

const wrap: React.CSSProperties = {
  maxWidth: '760px',
  margin: '0 auto',
  padding: '120px 24px 80px',
}

const meta: React.CSSProperties = {
  color: 'var(--text-dim, #8a8a8a)',
  fontSize: '0.85rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const card: React.CSSProperties = {
  border: '1px solid var(--border, #2a2a2a)',
  borderRadius: '12px',
  marginBottom: '24px',
  textDecoration: 'none',
  color: 'inherit',
  overflow: 'hidden',
}

/** Карточка поста в списке: обложка сверху, под ней мета, заголовок и резюме.
 *
 * Заголовок показывается всегда. Раньше он скрывался при видимой обложке,
 * потому что тогдашняя карточка печатала заголовок на картинке. Рисованная
 * обложка несёт только названия трёх панелей и подвал, так что без текстового
 * заголовка пост в списке остался бы безымянным.
 */
function BlogCard({ post, lang, minLabel }: { post: PostMeta; lang: string; minLabel: string }) {
  return (
    <Link to={`/blog/${post.slug}`} style={card} className="blog-card">
      <Cover slug={post.slug} title={post.title} lang={lang} className="blog-card-cover" />
      <div className="blog-card-body">
        <div style={meta}>
          {post.date} · {post.readingMinutes} {minLabel} · <span className="blog-hashtag">{hashtagLine(post.tags)}</span>
        </div>
        <h2 style={{ margin: '10px 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>
          {post.title}
        </h2>
        <p style={{ margin: '10px 0 0', lineHeight: 1.7, color: 'var(--text-dim, #8a8a8a)' }}>
          {post.summary}
        </p>
      </div>
    </Link>
  )
}

/** Inline markup the post bodies actually use, rendered instead of shown.
 *
 * Readers were seeing the source: `**Executed**` and `` `zig build` `` reached
 * production with their delimiters intact, on 13 published pages across both
 * the SPA and the static lineage. The bodies were measured before choosing a
 * fix -- 31 bold spans, 123 code spans, and ZERO markdown links -- so two forms
 * cover the corpus and a markdown dependency would be more machinery than the
 * data needs. A `code` BLOCK is untouched: backticks inside one are literal.
 */
function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g
  let last = 0
  let k = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      // Bold RECURSES: one Russian paragraph is a code span inside a bold
      // span, and a flat pass matches the bold first, swallows the backticks
      // and shows them. Found on 1 page of 62 -- and only because the sweep
      // covered BOTH locales. The English-only sweep before it read clean.
      out.push(<strong key={k++}>{inline(m[1])}</strong>)
    } else {
      out.push(
        <code
          key={k++}
          style={{
            background: 'var(--bg-alt, #111)',
            border: '1px solid var(--border, #2a2a2a)',
            borderRadius: '4px',
            padding: '0.05em 0.35em',
            fontSize: '0.9em',
          }}
        >
          {m[2]}
        </code>,
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function renderBlock(b: Block, i: number) {
  switch (b.kind) {
    case 'h':
      return (
        <h2 key={i} style={{ marginTop: '2.4em', marginBottom: '0.6em', fontSize: '1.4rem' }}>
          {b.text}
        </h2>
      )
    case 'p':
      return (
        <p key={i} style={{ lineHeight: 1.75, marginBottom: '1.1em' }}>
          {inline(b.text)}
        </p>
      )
    case 'ul':
      return (
        <ul key={i} style={{ lineHeight: 1.75, marginBottom: '1.1em', paddingLeft: '1.2em' }}>
          {b.items.map((it, j) => (
            <li key={j} style={{ marginBottom: '0.5em' }}>
              {inline(it)}
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol key={i} style={{ lineHeight: 1.75, marginBottom: '1.1em', paddingLeft: '1.2em' }}>
          {b.items.map((it, j) => (
            <li key={j} style={{ marginBottom: '0.5em' }}>
              {inline(it)}
            </li>
          ))}
        </ol>
      )
    case 'quote':
      return (
        <blockquote
          key={i}
          style={{
            borderLeft: '3px solid var(--accent, #d4af37)',
            margin: '1.6em 0',
            padding: '0.2em 0 0.2em 1.2em',
            fontStyle: 'italic',
            lineHeight: 1.7,
          }}
        >
          {inline(b.text)}
        </blockquote>
      )
    case 'code':
      return (
        <pre
          key={i}
          style={{
            background: 'var(--bg-alt, #111)',
            border: '1px solid var(--border, #2a2a2a)',
            borderRadius: '8px',
            padding: '16px',
            overflowX: 'auto',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            marginBottom: '1.4em',
          }}
        >
          <code>{b.text}</code>
        </pre>
      )
    case 'figure':
      // The SVG here is authored in this repository's own data files, never
      // supplied by a reader, so no untrusted markup reaches this path.
      return (
        <figure key={i} style={{ margin: '0 0 1.8em', overflowX: 'auto' }}>
          <div
            style={{ color: 'var(--fg, #e8e8e8)', width: '100%' }}
            dangerouslySetInnerHTML={{ __html: b.svg }}
          />
          <figcaption
            style={{
              fontSize: '0.86rem',
              opacity: 0.75,
              marginTop: '10px',
              lineHeight: 1.5,
            }}
          >
            {b.caption}
          </figcaption>
        </figure>
      )
    case 'terminal':
      return <TerminalCast key={i} src={b.src} title={b.title} caption={b.caption} share={b.share} />
    case 'table':
      return (
        <div key={i} style={{ overflowX: 'auto', marginBottom: '1.6em' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
            <thead>
              <tr>
                {b.head.map((h, j) => (
                  <th
                    key={j}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--accent, #d4af37)',
                    }}
                  >
                    {inline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, j) => (
                <tr key={j}>
                  {r.map((c, k) => (
                    <td
                      key={k}
                      style={{ padding: '10px 12px', borderBottom: '1px solid var(--border, #2a2a2a)' }}
                    >
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

/** Renders before the body on purpose: what is not proven comes first, not last. */
function OpenQuestions({ post, lang }: { post: PostMeta; lang: string }) {
  if (!post.openQuestions.length) return null
  return (
    <section
      style={{
        border: '1px solid var(--border, #2a2a2a)',
        borderLeft: '3px solid var(--accent, #d4af37)',
        borderRadius: '8px',
        padding: '18px 20px',
        margin: '2em 0',
      }}
    >
      <div style={{ ...meta, marginBottom: '10px' }}>{ui(lang).openLabel}</div>
      <ul style={{ margin: 0, paddingLeft: '1.2em', lineHeight: 1.7 }}>
        {post.openQuestions.map((q, i) => (
          <li key={i} style={{ marginBottom: '0.4em' }}>
            {inline(q)}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Receipts({ post, lang }: { post: PostMeta; lang: string }) {
  if (!post.receipts.length) return null
  return (
    <section style={{ margin: '2.4em 0' }}>
      <div style={{ ...meta, marginBottom: '10px' }}>{ui(lang).receipts}</div>
      <ul style={{ margin: 0, paddingLeft: '1.2em', lineHeight: 1.8 }}>
        {post.receipts.map((r, i) => (
          <li key={i}>
            <a href={r.href} target="_blank" rel="noopener noreferrer">
              {r.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Адрес поста для репоста — статическая страница, НЕ hash-маршрут.
 *
 * Фрагмент после решётки браузер серверу не отправляет, поэтому бот любой
 * площадки читает метатеги главной страницы: карточка предпросмотра либо не
 * собирается вовсе, либо под каждым постом стоит один и тот же чужой
 * заголовок. У статической страницы есть свои og:title, og:description и
 * og:image, и она читается без JavaScript.
 */
export function postUrl(slug: string, lang = 'en') {
  return lang === 'ru'
    ? `https://t27.ai/ru/blog/${slug}/`
    : `https://t27.ai/blog/${slug}/`
}

/**
 * Share links, as plain intent URLs.
 *
 * No embedded platform widgets on purpose: every one of them is a third-party
 * script that reads the reader before they have decided to share anything. A
 * link costs nothing and tracks nobody.
 */
function Share({ post, lang }: { post: PostMeta; lang: string }) {
  const t = ui(lang)
  const [copied, setCopied] = useState(false)
  const url = postUrl(post.slug, lang)
  const tag = (source: string) => encodeURIComponent(shareTagged(url, source, 'blog', post.slug))
  const title = encodeURIComponent(post.title)
  const hashtags = post.tags.map(blogHashtag)
  const xHashtag = encodeURIComponent(hashtags[0].slice(1))
  const telegramText = encodeURIComponent(`${post.title}\n\n${hashtags.slice(0, 3).join(' ')}`)

  const targets = [
    { name: 'X', href: `https://twitter.com/intent/tweet?url=${tag('x')}&text=${title}&hashtags=${xHashtag}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${tag('linkedin')}` },
    { name: 'Telegram', href: `https://t.me/share/url?url=${tag('telegram')}&text=${telegramText}` },
    { name: 'Hacker News', href: `https://news.ycombinator.com/submitlink?u=${tag('hackernews')}&t=${title}` },
    { name: 'Reddit', href: `https://www.reddit.com/submit?url=${tag('reddit')}&title=${title}` },
  ]

  return (
    <section style={{ margin: '2.4em 0' }}>
      <div style={{ ...meta, marginBottom: '10px' }}>{t.share}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        {targets.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="share-pill"
          >
            {s.name}
          </a>
        ))}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(shareTagged(url, 'copy', 'blog', post.slug)).then(
              () => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 2000)
              },
              () => setCopied(false),
            )
          }}
          className="share-pill"
          style={{ background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {copied ? t.copied : t.copyLink}
        </button>
      </div>
    </section>
  )
}

function WorkOffer({ post, lang }: { post: PostMeta; lang: string }) {
  const locale = lang === 'ru' ? 'ru' : 'en'
  const t = WORK[locale]
  const track = t.tracks[workTrack(post)]
  const subject = locale === 'ru'
    ? `Задача для T27 — ${post.title}`
    : `Project for T27 — ${post.title}`
  const message = locale === 'ru'
    ? `Здравствуйте, Дмитрий! Я прочитал(а) статью «${post.title}»: ${postUrl(post.slug, locale)}\n\nНаша задача:`
    : `Hi Dmitrii, I read “${post.title}”: ${postUrl(post.slug, locale)}\n\nOur project:`
  const mailto = `mailto:admin@t27.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`

  return (
    <section
      aria-labelledby="blog-work-offer-title"
      className="blog-work-offer"
      style={{
        border: '1px solid var(--border, #2a2a2a)',
        borderLeft: '3px solid var(--accent, #d4af37)',
        borderRadius: '12px',
        padding: 'clamp(20px, 4vw, 30px)',
        margin: '3em 0 0',
        background: 'var(--bg-alt, #111)',
      }}
    >
      <div style={{ ...meta, color: 'var(--accent, #d4af37)', marginBottom: '10px' }}>
        {t.eyebrow}
      </div>
      <h2 id="blog-work-offer-title" style={{ margin: '0 0 12px', fontSize: '1.45rem' }}>
        {track.title}
      </h2>
      <p style={{ lineHeight: 1.7, margin: '0 0 18px', color: 'var(--text-dim, #aaa)' }}>
        {track.body}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <a className="btn" href={mailto}>{t.primary}</a>
        <a className="btn secondary" href={track.href}>{track.detail}</a>
      </div>
      <nav
        aria-label={t.servicesLabel}
        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: '20px', fontSize: '0.9rem' }}
      >
        <span style={{ color: 'var(--text-dim, #8a8a8a)' }}>{t.servicesLabel}:</span>
        {t.services.map(([label, href]) => (
          <a key={href} href={href} className="blog-link">{label}</a>
        ))}
      </nav>
    </section>
  )
}

export function BlogIndex() {
  const { lang } = useI18n()
  const t = ui(lang)
  const items = publishedPosts().map((p) => localiseMeta(p, lang))
  return (
    <main>
      <Navigation />
      <div style={wrap}>
        <h1 style={{ marginBottom: '0.3em' }}>{t.blog}</h1>
        <p style={{ color: 'var(--text-dim, #8a8a8a)', marginBottom: '1em', lineHeight: 1.7 }}>
          {t.lede}
        </p>
        {/* Absolute, not a router link: the feed is a static file beside the
            SPA, and a hash route would never reach it. */}
        <p style={{ marginBottom: '2.4em' }}>
          <a href="https://t27.ai/rss.xml" target="_blank" rel="noopener noreferrer" className="blog-link">
            {t.feed}
          </a>
        </p>

        {items.length === 0 ? (
          <p style={{ color: 'var(--text-dim, #8a8a8a)' }}>
            {t.empty}
          </p>
        ) : (
          items.map((p) => <BlogCard key={p.slug} post={p} lang={lang} minLabel={t.min} />)
        )}
      </div>
      <Footer />
    </main>
  )
}

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const { lang } = useI18n()
  const t = ui(lang)
  const source = slug ? postBySlug(slug) : undefined
  const [body, setBody] = useState<PostBody>()
  const [bodyFailed, setBodyFailed] = useState(false)

  useEffect(() => {
    let active = true
    setBody(undefined)
    setBodyFailed(false)
    if (source?.published) {
      loadPostBody(source.slug)
        .then((loaded) => {
          if (!active) return
          if (loaded) setBody(loaded)
          else setBodyFailed(true)
        })
        .catch(() => {
          if (active) setBodyFailed(true)
        })
    }
    return () => {
      active = false
    }
  }, [source?.slug, source?.published])

  if (!source || !source.published) {
    return (
      <main>
        <Navigation />
        <div style={wrap}>
          <h1>{t.notPublished}</h1>
          <p style={{ lineHeight: 1.7 }}>
            {t.missing}{' '}
            <Link to="/blog">{t.back}</Link>.
          </p>
        </div>
        <Footer />
      </main>
    )
  }

  if (!body) {
    const staticPostHref = `https://t27.ai${lang === 'ru' ? '/ru' : ''}/blog/${source.slug}/`
    return (
      <main>
        <Navigation />
        <article style={wrap} className="blog-article">
          <Cover slug={source.slug} title={localiseMeta(source, lang).title} lang={lang} className="blog-lead-cover" priority />
          <div style={meta}>
            {source.date} · {source.readingMinutes} {t.min} · <span className="blog-hashtag">{hashtagLine(source.tags)}</span>
          </div>
          <h1 style={{ margin: '12px 0 16px', lineHeight: 1.25 }}>
            {localiseMeta(source, lang).title}
          </h1>
          {bodyFailed ? (
            <p style={{ lineHeight: 1.7 }}>
              {t.loadFailed}{' '}
              <a href={staticPostHref} className="blog-link">{t.readStatic}</a>.
            </p>
          ) : (
            <p style={{ lineHeight: 1.7 }}>{t.loading}</p>
          )}
        </article>
        <Footer />
      </main>
    )
  }

  const fullPost: Post = {
    ...source,
    body: body.body,
    ru: source.ru && body.ruBody ? { ...source.ru, body: body.ruBody } : undefined,
  }
  const post = localise(fullPost, lang)

  return (
    <main>
      <Navigation />
      <article style={wrap} className="blog-article">
        <Cover slug={post.slug} title={post.title} lang={lang} className="blog-lead-cover" priority />
        <div style={meta}>
          {post.date} · {post.readingMinutes} {t.min} · <span className="blog-hashtag">{hashtagLine(post.tags)}</span>
        </div>
        <h1 style={{ margin: '12px 0 16px', lineHeight: 1.25 }}>{post.title}</h1>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.75, color: 'var(--text-dim, #8a8a8a)' }}>
          {post.summary}
        </p>

        <OpenQuestions post={post} lang={lang} />
        {post.body.map(renderBlock)}
        <Receipts post={post} lang={lang} />
        <Share post={post} lang={lang} />
        <Suspense fallback={null}>
          <CourseShelf lang={lang === 'ru' ? 'ru' : 'en'} placement={`blog:${post.slug}`} />
        </Suspense>

        <p style={{ marginTop: '3em' }}>
          <Link to="/blog" className="blog-link">{t.allPosts}</Link>
        </p>
        <WorkOffer post={post} lang={lang} />
      </article>
      <Footer />
    </main>
  )
}

export default BlogIndex
