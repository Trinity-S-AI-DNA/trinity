import { useI18n } from '../i18n/context'
import { MOTTO, SITE_NAME } from '../lib/motto'
import { TrinityLogo } from './TrinityLogo'
import './GameHero.css'

// The front door.
//
// The mark first — it is the thing people recognise — and then, in one line,
// what this site is now: a game whose board is the corpus of .t27 specs. The
// number the game exists to build (r² = r + 1, the format claim and the evidence
// under it) has its own page, linked from here and from the nav, so that a
// reader who came for the arithmetic reaches all of it in one place instead of
// scrolling past it to find the board.
//
// The motto sits in both places a motto belongs: under the mark, as the mark's
// caption, and at the head of the headline. It is imported rather than typed --
// see lib/motto -- so the three verbs here are the same three words that name
// the three moves further down the page, and the clause after the colon is
// there too, because the whole headline is also the page's description.
const COPY = {
  en: {
    lede: 'Every cell on the map is a .t27 spec or the GitHub issue that pays for it. Take one, write the spec that generates it, compile it with the real compiler, send it. That is the whole contribution process, and it is the whole game.',
    play: 'How to play',
    map: 'Open the map',
    number: 'The number behind it →',
    hud: 'Course HUD (in Russian) →',
  },
  ru: {
    lede: 'Каждая сота на карте — спека .t27 или задача GitHub, которая за неё платит. Возьмите одну, напишите спеку, которая её порождает, скомпилируйте настоящим компилятором, отправьте. Это весь процесс контрибуции — и вся игра.',
    play: 'Как играть',
    map: 'Открыть карту',
    number: 'Число за этим →',
    hud: 'Курс в HUD →',
  },
} as const

export default function GameHero() {
  const { lang } = useI18n()
  const key = lang === 'ru' ? 'ru' : 'en'
  const t = COPY[key]
  const motto = MOTTO[key]

  return (
    <section className="game-hero" id="hero" aria-labelledby="game-hero-title">
      <div className="game-hero-inner">
        <TrinityLogo withLabel={false} height="clamp(104px, 16vw, 190px)" />
        <span className="game-hero-wordmark">{SITE_NAME}</span>
        {/* The mark's caption. Upper case is styling, so the words reach a
            screen reader as words rather than as an acronym. */}
        <span className="game-hero-motto">{motto.caption}</span>
        <h1 id="game-hero-title">{motto.headline}: {motto.clause}</h1>
        <p>{t.lede}</p>
        <div className="game-hero-actions">
          <a className="game-hero-primary" href="#/queen">
            {t.map}
          </a>
          {/* "How to play" was an anchor to the section below, which is a
              description of playing rather than playing. It now opens the spec
              the corpus starts with, in the real editor, compiled by the real
              compiler: 98 lines that carry a constant, a type, a function, a
              test and an invariant. Relative on purpose - the same address
              works on t27.ai and on app.t27.ai/queen/, so nobody is sent to
              another host to read one file. */}
          <a
            className="game-hero-secondary"
            href="#/specs?spec=specs%2Fdemos%2Fhello_world.t27"
          >
            {t.play}
          </a>
          <a className="game-hero-quiet" href="#/trinity">
            {t.number}
          </a>
          {/* The course HUD is the static /ru/ page (specs/site/landing_ru.t27),
              Russian only for now, so the link is absolute and leaves the app. */}
          <a className="game-hero-secondary" href="/ru/#lessons">
            {t.hud}
          </a>
        </div>
      </div>
    </section>
  )
}
