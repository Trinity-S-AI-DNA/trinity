import { Link } from 'react-router-dom'
import { COURSES } from '../lib/course.generated'
import { LADDER, type LadderSay } from '../lib/courseLadder.generated'
import { courseState } from '../lib/courseLadder'
import { pickShelf, useLadderView } from '../lib/useLadderView'
import '../pages/Course.css'

// THE COURSE CARDS, wherever a course is shown: the catalog (#/courses), the foot of every course
// page, every blog post (owner, 2026-10-13: other courses at the bottom of each course page and
// adverts across the blog). Each card says whether the reader has started the course; every
// course is free (rules VERSION 3, owner 2026-10-19). Every word is a spec's: the course specs'
// and specs/ladder/course-ladder.t27.

type Lang = 'en' | 'ru'
type CourseT = (typeof COURSES)[number]
const fmt = (s: string, ...args: (string | number)[]) =>
  args.reduce<string>((out, a, i) => out.split(`{${i}}`).join(String(a)), s)

export function CourseCard({ c, lang, view }: { c: CourseT; lang: Lang; view: ReturnType<typeof useLadderView> }) {
  const say = LADDER.say[lang] as LadderSay
  const s = courseState(c.id, view.opened, view.valid)
  const total = c.lessons.length
  const finished = c.lessons.filter((l) => view.done.includes(l.id)).length
  const mine = s.known && s.open
  return (
    <li className={`course-card ${mine ? 'is-open' : 'is-free'}`}>
      <Link to={`/${c.route}`} className="course-card-link">
        <span className="course-badge">{mine ? say.BADGE_OPEN : say.BADGE_FREE}</span>
        <span className="course-card-title">{c.say[lang].TITLE}</span>
        <span className="course-card-desc">{c.say[lang].DESCRIPTION}</span>
        <span className="course-card-foot">{finished > 0 ? fmt(say.DONE_OF, finished, total) : fmt(say.LESSONS, total)}</span>
        {finished > 0 ? (
          <span className="course-card-bar" aria-hidden="true">
            <span style={{ width: `${(100 * finished) / total}%` }} />
          </span>
        ) : null}
      </Link>
    </li>
  )
}

export default function CourseShelf({ lang, exclude, limit = 3, title }: { lang: Lang; exclude?: string; limit?: number; title?: string }) {
  const say = LADDER.say[lang] as LadderSay
  const view = useLadderView()
  const picks = pickShelf(exclude, view.opened, limit)
  if (!picks.length) return null
  return (
    <section className="course-shelf" aria-label={title ?? say.MORE_TITLE}>
      <div className="course-shelf-head">
        <h2 className="course-shelf-title">{title ?? say.MORE_TITLE}</h2>
        <Link className="course-link" to="/courses">
          {say.COURSES} →
        </Link>
      </div>
      <ul className="course-catalog">
        {picks.map((c) => (
          <CourseCard key={c.id} c={c} lang={lang} view={view} />
        ))}
      </ul>
    </section>
  )
}
