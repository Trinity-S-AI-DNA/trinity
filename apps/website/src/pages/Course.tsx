import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { useI18n } from '../i18n/context'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { COURSE, COURSES, type Course as CourseT, type CourseLesson } from '../lib/course.generated'
import { LADDER, type LadderSay } from '../lib/courseLadder.generated'
import { KEY_PARAM, STEP, checkKey, courseState, openCourse, readKeys, readOpened, reportDone, saveKeys, startLink, type Keys, type Opened } from '../lib/courseLadder'
import './Course.css'

// Every word, the order of the courses and lessons and the widget each one opens
// come from specs/course/courses.t27, the course specs it names and their Russian
// bundles, through scripts/course-from-spec.mjs. This file only draws them: a
// reader-visible string written here instead of in a spec is a bug (skill course-forge).

type Lang = 'en' | 'ru'
type Say = (typeof COURSE.say)['en']
type Frame = { key: string; title: string; preview: string; height: number; page?: string; spec?: boolean }
type Chain = { id: string; route: string; share: string; first: string; last: string; title: { en: string; ru: string } }

/** Every lesson id any course has: progress keeps all of them under the one shared key. */
const KNOWN = new Set<string>(COURSES.flatMap((c) => c.lessons.map((l) => l.id)))
const ORIGIN = 'https://t27.ai/'
// Pages load from wherever the site is served (t27.ai, or app.t27.ai/game/);
// only absolute t27.ai addresses are made relative.
const local = (url: string) => (url.startsWith(ORIGIN) ? url.slice(ORIGIN.length) : url)
const fmt = (s: string, ...args: (string | number)[]) =>
  args.reduce<string>((out, a, i) => out.split(`{${i}}`).join(String(a)), s)

function readDone(): string[] {
  try {
    const raw = window.localStorage.getItem(COURSE.progressKey)
    const list = raw ? JSON.parse(raw) : []
    // Only ids some course still has: a renamed lesson must not inflate the count.
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string' && KNOWN.has(x)) : []
  } catch {
    return []
  }
}

/** The marks of every course; each page counts only its own. */
function useProgress(C: CourseT) {
  const [all, setAll] = useState<string[]>(() => (typeof window === 'undefined' ? [] : readDone()))
  const toggle = useCallback((id: string) => {
    setAll((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try {
        window.localStorage.setItem(COURSE.progressKey, JSON.stringify(next))
      } catch {
        // private mode: progress lives only as long as the tab
      }
      return next
    })
  }, [])
  const done = useMemo(() => all.filter((id) => C.lessons.some((l) => l.id === id)), [all, C])
  return { done, all, toggle }
}

/** The course one hands its reader to, or the one it follows. */
function ChainLink({ lang, say, to, next, lesson }: { lang: Lang; say: Say; to: Chain; next: boolean; lesson?: string }) {
  const route = `/${to.route}${lesson ? `/${lesson}` : ''}`
  return (
    <Link className={`course-pager-link course-chain${next ? ' is-next' : ''}`} to={route}>
      <span className="course-label">{next ? `${say.NEXT_COURSE} →` : `← ${say.PREV_COURSE}`}</span>
      {to.title[lang]}
    </Link>
  )
}

function CourseMap({ C, lang, say, done, current }: { C: CourseT; lang: Lang; say: Say; done: string[]; current?: string }) {
  return (
    <ol className="course-map" aria-label={say.ALL}>
      {C.modules.map((m) => (
        <li key={m.id} className="course-map-row">
          <div className="course-map-head">
            <span className="course-map-big" aria-hidden="true">
              {String(m.n).padStart(2, '0')}
            </span>
            <span className="course-map-n">{fmt(say.MODULE, m.n)}</span>
            <span className="course-map-title">{m[lang].title}</span>
            <span className="course-map-line">{m[lang].line}</span>
          </div>
          <div className="course-map-cells">
            {m.lessons.map((id) => {
              const l = C.lessons.find((x) => x.id === id)!
              const cls = ['course-cell', done.includes(id) ? 'is-done' : '', current === id ? 'is-current' : '']
                .filter(Boolean)
                .join(' ')
              return (
                <Link key={id} to={`/${C.route}/${id}`} className={cls} aria-current={current === id ? 'page' : undefined}>
                  <span className="course-cell-n">{String(l.n).padStart(2, '0')}</span>
                  <span className="course-cell-title">{l[lang].title}</span>
                </Link>
              )
            })}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Overview({ C, lang, say, done, shared }: { C: CourseT; lang: Lang; say: Say; done: string[]; shared?: string }) {
  const LESSONS = C.lessons
  const TOTAL = LESSONS.length
  const left = LESSONS.find((l) => !done.includes(l.id))
  const next = left ?? LESSONS[0]
  // All done: offer the course again from the start, not "continue" to lesson 1.
  const started = done.length > 0 && left !== undefined
  return (
    <div className="course-hero">
      <p className="course-kicker course-masthead">{say.KICKER}</p>
      <h1 className="course-title">{say.TITLE}</h1>
      <p className="course-lead">{say.LEAD}</p>
      <p className="course-desc">{say.DESCRIPTION}</p>
      <div className="course-hero-actions">
        <Link className="course-btn is-primary" to={`/${C.route}/${next.id}`}>
          {started ? `${say.CONTINUE}: ${next[lang].title}` : say.START}
        </Link>
        <span className="course-progress">{fmt(say.PROGRESS, done.length, TOTAL)}</span>
      </div>
      <CourseShare C={C} lang={lang} say={say} title={say.TITLE} />
      <div className="course-bar" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${TOTAL}, 1fr)` }}>
        {LESSONS.map((l) => (
          <span key={l.id} className={done.includes(l.id) ? 'is-done' : ''} />
        ))}
      </div>
      <p className="course-shape">{say.SHAPE}</p>
      <CourseMap C={C} lang={lang} say={say} done={done} />
      {C.prev || C.next ? (
        <nav className="course-pager">
          {C.prev ? <ChainLink lang={lang} say={say} to={C.prev} next={false} /> : <span />}
          {C.next ? <ChainLink lang={lang} say={say} to={C.next} next /> : <span />}
        </nav>
      ) : null}
      <CourseNotes C={C} lang={lang} say={say} shared={shared} />
    </div>
  )
}

/** The static page of a course or a lesson: the address to post, because a crawler drops the '#'. */
const shareOf = (C: CourseT, lang: Lang, id?: string) => `${lang === 'ru' ? '/ru' : ''}/${id ? `learn/${id}/` : C.share}`

/**
 * SHARE, AT THE TOP, WITH THE PAGE THAT CARRIES THE CARD.
 *
 * Owner, 2026-10-08: course 0 posted to X as t27.ai/#/t27-basics showed the
 * home page's card ("AGI game — play, direct, earn"). A crawler drops what
 * follows '#', so every course and lesson link copied from the address bar
 * is the home page to X, Telegram and LinkedIn. The right address existed --
 * at the bottom of the notes. Here it is under the title, with the networks
 * and a copy button, and every target is built from shareOf, never from the
 * address bar (qa/og-preview-contract.mjs, section 5).
 */
function CourseShare({ C, lang, say, id, title }: { C: CourseT; lang: Lang; say: Say; id?: string; title: string }) {
  const path = shareOf(C, lang, id)
  const url = `https://t27.ai${path}`
  const u = encodeURIComponent(url)
  const text = encodeURIComponent(title)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      window.prompt(say.SHARE, url)
    }
  }
  return (
    <div className="course-share">
      <span className="course-label">{say.SHARE}</span>
      <a className="course-share-url" href={path}>
        t27.ai{path}
      </a>
      <button type="button" className="course-share-pill" onClick={() => void copy()} title={say.SHARE} aria-label={say.SHARE}>
        {copied ? '✓' : '⧉'}
      </button>
      <a className="course-share-pill" href={`https://twitter.com/intent/tweet?url=${u}&text=${text}`} target="_blank" rel="noopener noreferrer">
        X
      </a>
      <a className="course-share-pill" href={`https://t.me/share/url?url=${u}&text=${text}`} target="_blank" rel="noopener noreferrer">
        Telegram
      </a>
      <a className="course-share-pill" href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`} target="_blank" rel="noopener noreferrer">
        LinkedIn
      </a>
    </div>
  )
}

function CourseNotes({ C, lang, say, id, shared }: { C: CourseT; lang: Lang; say: Say; id?: string; shared?: string }) {
  return (
    <div className="course-notes">
      <p>
        <a href={shareOf(C, lang, id)}>{say.SHARE}: t27.ai{shareOf(C, lang, id)}</a>
      </p>
      {/* Once the reader holds a key, finished lessons reach the author: say so instead. */}
      <p>{shared ?? say.PRIVATE}</p>
      <p>{say.WIDGET_LANG}</p>
      <p>
        <a href={C.source.publicSpec.replace(/^public\//, '')} target="_blank" rel="noreferrer">
          {say.SOURCE}
        </a>
      </p>
      <p>
        <Link to={`/${C.cohortRoute}`}>{say.COHORT}</Link>
      </p>
    </div>
  )
}

type Also = { id: string; title: string; preview: string | null; height: number; url: string }
const alsoOf = (l: CourseLesson) => l.also as readonly Also[]

/** A widget page carries its Russian words and swaps them in on ?lang=ru (scripts/widget-pages-from-spec.mjs). */
const inLang = (page: string, lang: Lang) =>
  lang === 'ru' && page.startsWith('widgets/') ? `${page}${page.includes('?') ? '&' : '?'}lang=ru` : page

/** Widgets with no framable page (a site tab, not a widget page) open as links, never as an empty frame. */
function linksOf(l: CourseLesson) {
  return alsoOf(l)
    .filter((w) => !w.preview)
    .map((w) => ({ key: w.id, title: w.title, page: local(w.url) }))
}

function framesOf(l: CourseLesson): Frame[] {
  const main: Frame = { key: l.widget.id, title: l.widget.title, preview: l.widget.preview, height: l.widget.height, page: local(l.widget.url) }
  const also: Frame[] = alsoOf(l)
    .filter((w) => w.preview)
    .map((w) => ({ key: w.id, title: w.title, preview: w.preview!, height: w.height, page: local(w.url) }))
  const spec: Frame[] = l.spec ? [{ key: 'spec', title: l.spec.path, preview: l.spec.preview, height: l.spec.height, spec: true }] : []
  return [main, ...spec, ...also]
}

function Lesson({ C, lesson, lang, say, done, toggle, shared, ladder }: { C: CourseT; lesson: CourseLesson; lang: Lang; say: Say; done: string[]; toggle: (id: string) => void; shared?: string; ladder: ReturnType<typeof useLadder> }) {
  const LESSONS = C.lessons as readonly CourseLesson[]
  const TOTAL = LESSONS.length
  const frames = useMemo(() => framesOf(lesson), [lesson])
  const links = useMemo(() => linksOf(lesson), [lesson])
  const [key, setKey] = useState(frames[0].key)
  useEffect(() => {
    setKey(frames[0].key)
    window.scrollTo(0, 0)
  }, [lesson.id, frames])
  const frame = frames.find((f) => f.key === key) ?? frames[0]
  const mod = C.modules.find((m) => m.id === lesson.module)!
  const i = lesson.n - 1
  const prev = i > 0 ? LESSONS[i - 1] : null
  const next = i < TOTAL - 1 ? LESSONS[i + 1] : null
  const isDone = done.includes(lesson.id)
  const t = lesson[lang]

  return (
    <article className="course-lesson">
      <nav className="course-crumbs">
        <Link to={`/${C.route}`}>{say.ALL}</Link>
        <span>
          {fmt(say.MODULE, mod.n)} · {mod[lang].title}
        </span>
        <span>{fmt(say.LESSON, lesson.n, TOTAL)}</span>
      </nav>

      <header className="course-lesson-head">
        <span className="course-lesson-n" aria-hidden="true">
          {String(lesson.n).padStart(2, '0')}
        </span>
        <h1 className="course-lesson-title">{t.title}</h1>
        <p className="course-goal">
          <span className="course-label">{say.GOAL}</span>
          {t.goal}
        </p>
        <CourseShare C={C} lang={lang} say={say} id={lesson.id} title={t.title} />
      </header>

      <div className="course-lesson-grid">
        <div className="course-lesson-text">
          <p className="course-dropcap">{t.text}</p>
          <div className="course-task">
            <span className="course-label">{say.TRY}</span>
            <p>{t.task}</p>
          </div>
          <button type="button" className={`course-btn course-mark${isDone ? ' is-done' : ''}`} aria-pressed={isDone} onClick={() => toggle(lesson.id)}>
            {isDone ? `✓ ${say.MARKED}` : say.MARK}
          </button>
        </div>

        <div className="course-stage">
          <div className="course-frame-tabs" role="tablist">
            {frames.map((f, n) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={f.key === frame.key}
                className={`course-chip${f.key === frame.key ? ' is-on' : ''}${f.spec ? ' is-spec' : ''}`}
                onClick={() => setKey(f.key)}
              >
                {n === 0 ? <span data-lang-exempt="widget-title">{f.title}</span> : f.spec ? say.SPEC : <span data-lang-exempt="widget-title">{f.title}</span>}
              </button>
            ))}
          </div>
          {links.length > 0 ? (
            <div className="course-frame-tabs">
              {links.map((w) => (
                <a key={w.key} className="course-chip" href={w.page} target="_blank" rel="noreferrer">
                  <span data-lang-exempt="widget-title">{w.title}</span> ↗
                </a>
              ))}
            </div>
          ) : null}
          {lesson.also.length > 0 ? (
            <p className="course-hint">
              {say.ALSO}: {say.ALSO_HINT}
            </p>
          ) : null}
          <div className="course-frame" style={{ height: frame.height }}>
            <iframe key={`${frame.preview}${lang}`} src={inLang(frame.preview, lang)} title={frame.title} loading="lazy" allow="clipboard-write" />
          </div>
          <div className="course-frame-foot">
            {frame.key !== frames[0].key ? (
              <button type="button" className="course-link" onClick={() => setKey(frames[0].key)}>
                ← {say.BACK_TO_MAIN}
              </button>
            ) : (
              <span />
            )}
            {frame.page ? (
              <a className="course-link" href={frame.page} target="_blank" rel="noreferrer">
                {say.OPEN_PAGE} ↗
              </a>
            ) : (
              <span className="course-link-muted" data-lang-exempt="spec-path">
                {frame.title}
              </span>
            )}
          </div>
        </div>
      </div>

      <nav className="course-pager">
        {prev ? (
          <Link className="course-pager-link" to={`/${C.route}/${prev.id}`}>
            <span className="course-label">← {say.PREV}</span>
            {prev[lang].title}
          </Link>
        ) : C.prev ? (
          <ChainLink lang={lang} say={say} to={C.prev} next={false} lesson={C.prev.last} />
        ) : (
          <span />
        )}
        {next ? (
          <Link className="course-pager-link is-next" to={`/${C.route}/${next.id}`}>
            <span className="course-label">{say.NEXT} →</span>
            {next[lang].title}
          </Link>
        ) : C.next ? (
          <ChainLink lang={lang} say={say} to={C.next} next lesson={C.next.first} />
        ) : (
          <span />
        )}
      </nav>

      {lesson.n === 1 && !ladder.checking && !ladder.inClub ? <ClubTeaser C={C} lang={lang} /> : null}

      <CourseMap C={C} lang={lang} say={say} done={done} current={lesson.id} />
      <p className="course-progress is-foot">{fmt(say.PROGRESS, done.length, TOTAL)}</p>
      <CourseNotes C={C} lang={lang} say={say} id={lesson.id} shared={shared} />
    </article>
  )
}


/**
 * THE LADDER (specs/ladder/course-ladder.t27, rules course-access.t27): which courses this
 * reader opened, the keys the bot handed back, and whether each key still holds. A key
 * arrives in the address (#/<route>?unlock=<key>) from the bot's button, is checked with
 * the render, kept, and taken out of the address.
 */
function useLadder(C: CourseT, allDone: string[]) {
  const known = useMemo(() => COURSES.map((c) => c.id as string), [])
  const withProgress = useMemo(
    () => COURSES.filter((c) => c.lessons.some((l) => allDone.includes(l.id))).map((c) => c.id as string),
    // Seeded once, from the progress the reader had when the ladder first met them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [opened, setOpened] = useState<Opened>(() => (typeof window === 'undefined' ? [] : readOpened(known, withProgress)))
  const [keys, setKeys] = useState<Keys>(() => (typeof window === 'undefined' ? {} : readKeys()))
  const [valid, setValid] = useState({ bot: false, paid: false })
  const [checking, setChecking] = useState(true)
  const [bad, setBad] = useState<string | null>(null)
  const { search, pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    let live = true
    const fresh = new URLSearchParams(search).get(KEY_PARAM)
    void (async () => {
      const held: Keys = { ...readKeys() }
      if (fresh) {
        const r = await checkKey(fresh)
        if (r.ok && (r.step === STEP.bot || r.step === STEP.paid)) {
          if (r.step === STEP.bot) held.bot = fresh
          else held.paid = fresh
          saveKeys(held)
          if (live) setBad(null)
        } else if (live) setBad(r.reason ?? 'unknown')
      }
      const [b, p] = await Promise.all([
        held.bot ? checkKey(held.bot) : Promise.resolve({ ok: false }),
        held.paid ? checkKey(held.paid) : Promise.resolve({ ok: false }),
      ])
      if (!live) return
      const now = { bot: Boolean(b.ok), paid: Boolean(p.ok) }
      setKeys(held)
      setValid(now)
      setChecking(false)
      // The key the bot just handed back opens the course it was handed for, and only then
      // leaves the address: leaving first changed the address under this very effect,
      // which dropped the open (measured in Chromium, 2026-10-11).
      if (fresh) {
        setOpened((o) => openCourse(C.id, o, now))
        navigate(pathname, { replace: true })
      }
    })()
    return () => {
      live = false
    }
    // Once per arrival: a new key in the address, or a new course.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, C.id])

  const state = courseState(C.id, opened, valid)
  const open = () => setOpened((o) => openCourse(C.id, o, valid))
  // The key a lesson report travels with: the paid one while it holds, else the bot's.
  const reportKey = valid.paid ? keys.paid : valid.bot ? keys.bot : undefined
  return { state, open, checking, bad, reportKey, inClub: valid.paid }
}

/**
 * The club, named where a reader actually is. The gate below says the club only when a course
 * is locked, and a reader who never climbs past their first open course never meets it at all;
 * the bot's thirty-day funnel counted 1 club card against 56 new people. So lesson one carries
 * the teaser: its words are the ladder spec's (SAY_CLUB_*), its button is the same start link
 * the gate uses, and a reader already holding a paid key sees nothing (owner, 2026-10-13).
 */
function ClubTeaser({ C, lang }: { C: CourseT; lang: Lang }) {
  const say = LADDER.say[lang] as LadderSay
  return (
    <section className="course-hero course-ladder">
      <h2 className="course-title">{say.CLUB_TITLE}</h2>
      <p className="course-lead">{say.CLUB_LINE}</p>
      <div className="course-hero-actions">
        <a className="course-btn is-primary" href={startLink(STEP.paid, C.route)} target="_blank" rel="noopener noreferrer">
          {say.PAID_PRESS}
        </a>
      </div>
    </section>
  )
}

function LadderGate({ C, lang, ladder }: { C: CourseT; lang: Lang; ladder: ReturnType<typeof useLadder> }) {
  const say = LADDER.say[lang] as LadderSay
  const { state, checking, bad } = ladder
  const step = state.step
  return (
    <section className="course-hero course-ladder" aria-live="polite">
      <p className="course-kicker">{fmt(say.RUNG, state.rung)}</p>
      <h2 className="course-title">{step === STEP.free ? say.FREE_TITLE : step === STEP.bot ? say.BOT_TITLE : say.PAID_TITLE}</h2>
      <p className="course-lead">{step === STEP.free ? say.FREE_LINE : step === STEP.bot ? say.BOT_LINE : say.PAID_LINE}</p>
      {bad ? <p className="course-desc course-ladder-bad">{fmt(say.KEY_BAD, bad)}</p> : null}
      <div className="course-hero-actions">
        {checking && step !== STEP.free ? (
          <span className="course-progress">{say.CHECKING}</span>
        ) : 'mayOpenNow' in state && state.mayOpenNow ? (
          <button type="button" className="course-btn is-primary" onClick={ladder.open}>
            {say.OPEN}
          </button>
        ) : (
          <a className="course-btn is-primary" href={startLink(step, C.route)} target="_blank" rel="noopener noreferrer">
            {step === STEP.paid ? say.PAID_PRESS : say.BOT_PRESS}
          </a>
        )}
      </div>
      {step !== STEP.free ? <p className="course-desc">{say.BOT_SHARES}</p> : null}
      {step === STEP.paid ? <p className="course-desc">{say.PAID_LATER}</p> : null}
      <p className="course-shape">{say.LADDER}</p>
    </section>
  )
}

/** The course an address names: the first segment is its route (#/course, #/ai-numbers). */
const courseAt = (pathname: string) => COURSES.find((c) => c.route === pathname.split('/')[1]) ?? COURSE

export default function Course() {
  const { lessonId } = useParams<{ lessonId?: string }>()
  const { pathname } = useLocation()
  const C = courseAt(pathname) as CourseT
  const { lang: siteLang } = useI18n()
  const lang: Lang = siteLang === 'ru' ? 'ru' : 'en'
  const say = C.say[lang] as Say
  const { done, all, toggle } = useProgress(C)
  const ladder = useLadder(C, all)
  // A finished lesson is marked here and, with a key, told to the course author (may_report).
  const mark = useCallback(
    (id: string) => {
      const finishing = !done.includes(id)
      toggle(id)
      if (finishing) void reportDone(ladder.reportKey, C.route, id)
    },
    [done, toggle, ladder.reportKey, C.route],
  )
  const shared = ladder.reportKey ? (LADDER.say[lang] as LadderSay).SHARED : undefined
  const lesson = lessonId ? (C.lessons as readonly CourseLesson[]).find((l) => l.id === lessonId) : undefined
  // A lesson that moved to another course keeps its old address working.
  const moved = lessonId && !lesson ? COURSES.find((c) => c.lessons.some((l) => l.id === lessonId)) : undefined
  usePageMeta(lesson ? `${lesson[lang].title} · ${say.KICKER}` : say.TITLE, lesson ? lesson[lang].goal : say.DESCRIPTION)
  if (moved) return <Navigate replace to={`/${moved.route}/${lessonId}`} />

  return (
    <div className="course-page">
      <Navigation />
      <main className="course-main">
        {lessonId && !lesson ? (
          <div className="course-hero">
            <p className="course-lead">{say.NOT_FOUND}</p>
            <Link className="course-btn" to={`/${C.route}`}>
              {say.ALL}
            </Link>
          </div>
        ) : !ladder.state.open ? (
          <>
            <LadderGate C={C} lang={lang} ladder={ladder} />
            <CourseMap C={C} lang={lang} say={say} done={done} current={lesson?.id} />
          </>
        ) : lesson ? (
          <Lesson C={C} lesson={lesson} lang={lang} say={say} done={done} toggle={mark} shared={shared} ladder={ladder} />
        ) : (
          <Overview C={C} lang={lang} say={say} done={done} shared={shared} />
        )}
      </main>
      <Footer />
    </div>
  )
}
