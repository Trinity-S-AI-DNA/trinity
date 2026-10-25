import { LADDER } from '../lib/courseLadder.generated'
import '../styles/courseView.generated.css'
import '../styles/claw.css'

/**
 * TRI CLAW at the foot of every course page (owner, 2026-10-19): three honest paths, each one
 * press. Free with the reader's own key and paid with the club open the app inside Telegram
 * (t.me/<bot>?start=app_<route>, skill links-open-in-telegram); the third is the GitHub App's
 * page once it installs for anyone, the TRI CLAW post until then (CLAW_APP_PUBLIC). Every word
 * and every address is specs/ladder/course-ladder.t27's; no price is named here, the bot shows it.
 * The look is styles/claw.css, shared with the static course pages (scripts/course-onepage.mjs).
 * It lives apart from Footer.tsx so that only the course pages load claw.css: the footer of every
 * other page passes nothing and loads nothing of it.
 */
export default function ClawPromo({ lang }: { lang: string }) {
  const say = LADDER.say[lang === 'ru' ? 'ru' : 'en']
  const { claw } = LADDER
  // Only the third path's words CLAW_APP_PUBLIC picked are generated: read them by name.
  const w = say as Record<string, string>
  const third = claw.githubIsApp
    ? { title: w.CLAW_APP_TITLE, line: w.CLAW_APP_LINE, press: w.CLAW_APP_PRESS }
    : { title: w.CLAW_POST_TITLE, line: w.CLAW_POST_LINE, press: w.CLAW_POST_PRESS }
  const paths = [
    { key: 'keys', title: say.CLAW_FREE_TITLE, line: say.CLAW_FREE_LINE, press: say.CLAW_FREE_PRESS, href: claw.keys, primary: true },
    { key: 'club', title: say.CLAW_PAID_TITLE, line: say.CLAW_PAID_LINE, press: say.CLAW_PAID_PRESS, href: claw.club, primary: false },
    { key: 'github', ...third, href: claw.github, primary: false },
  ]
  return (
    <aside className="claw" aria-labelledby="claw-title">
      <p className="claw-kicker">{say.CLAW_KICKER}</p>
      <h2 className="claw-title" id="claw-title">{say.CLAW_TITLE}</h2>
      <p className="claw-line">{say.CLAW_LINE}</p>
      <ul className="claw-paths">
        {paths.map((p) => (
          <li key={p.key} className={`claw-path${p.primary ? ' is-primary' : ''}`} data-claw={p.key}>
            <h3 className="claw-path-title">{p.title}</h3>
            <p className="claw-path-line">{p.line}</p>
            <a className="claw-press" href={p.href} target="_blank" rel="noopener noreferrer">
              {p.press} ↗
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}

