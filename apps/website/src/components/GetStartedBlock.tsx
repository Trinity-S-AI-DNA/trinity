import { useI18n } from '../i18n/context'
import { CABINET_HOME } from '../lib/queenRunners'
import { RUNNERS_COPY } from '../lib/queenRunnersCopy'
import { specExplorerHash } from '../lib/specCatalog'
import { MINE_LINKS } from '../lib/triMine'
import { TOKEN_COPY } from '../lib/triTokenCopy'
import './PlayBlock.css'

// GET STARTED: three ways in, one per kind of visitor, right under the mark.
// The shape is the one compute networks use for their front door (a developer,
// a host, a contributor); what fills it is only what exists here today.
//
// Every card's button goes to a place that works now. What a card cannot back
// is said on the card, in the words of the place that owns the fact: the
// runner's next stage is MY RUNNERS' own sentence (lib/queenRunnersCopy.ts),
// and the token's standing is the TOKEN tab's (lib/triTokenCopy.ts). Renting a
// GPU or an FPGA out for TRI has no worker and no job format behind it, so it
// is a line on the card and not a button.
const HELLO_SPEC = specExplorerHash('specs/demos/hello_world.t27')

interface Way {
  who: string
  body: string
  cta: string
  href: string
  external?: boolean
  note?: string
  more: { label: string; href: string; external?: boolean }[]
}

const COPY: Record<'en' | 'ru', { eyebrow: string; title: string; lede: string; ways: Way[]; tri: string; triLink: string }> = {
  en: {
    eyebrow: 'GET STARTED',
    title: 'Three ways in',
    lede: 'Pick the one that is you. Each button opens a place that works today, and each card says what is not built yet.',
    ways: [
      {
        who: 'I write code',
        body: 'Write a .t27 spec and the real compiler turns it into Zig, Verilog, C and Rust in your browser. No install, no account, no key.',
        cta: 'Start writing',
        href: HELLO_SPEC,
        more: [
          { label: 'Every spec in the corpus', href: '#/specs' },
          { label: 'The tri commands, each a spec', href: '#/tools' },
          { label: 'System docs', href: '#/docs' },
        ],
      },
      {
        who: 'I bring hardware',
        body: 'Run a lane on your own machine, under your own provider account: the key never leaves it. A lane does not earn TRI; only .t27 specs do, to their author by GitHub login. Proof of compute is a planned road.',
        cta: 'Create a runner',
        href: CABINET_HOME,
        external: true,
        note: `${RUNNERS_COPY.en.howItWorks} Renting a GPU or an FPGA out for TRI is planned: there is no GPU worker and no job format yet.`,
        more: [
          { label: 'How to join the swarm', href: '#/blog/how-to-join-the-swarm' },
          { label: 'The FPGA flow, timed layer by layer', href: '#/devkit' },
        ],
      },
      {
        who: 'I contribute',
        body: 'Take a cell on the board, write the spec that generates it, compile it, send the pull request. There is no separate process: the four moves further down are the whole of it.',
        cta: 'Open the board',
        href: '#/queen?tab=kanban',
        more: [
          { label: 'Open issues', href: MINE_LINKS.issues, external: true },
          { label: 'How much of the stack is .t27 now', href: '#/queen?tab=roadmap' },
          { label: 'Lanes and their XP', href: '#/queen?tab=leaderboard' },
        ],
      },
    ],
    tri: 'TRI:',
    triLink: 'who earned it, and how',
  },
  ru: {
    eyebrow: 'С ЧЕГО НАЧАТЬ',
    title: 'Три входа',
    lede: 'Выберите свой. Каждая кнопка открывает то, что работает уже сегодня, а каждая карточка говорит, чего ещё нет.',
    ways: [
      {
        who: 'Я пишу код',
        body: 'Напишите спеку .t27, и настоящий компилятор превратит её в Zig, Verilog, C и Rust прямо в браузере. Без установки, без аккаунта, без ключа.',
        cta: 'Начать писать',
        href: HELLO_SPEC,
        more: [
          { label: 'Все спеки корпуса', href: '#/specs' },
          { label: 'Команды tri, каждая — спека', href: '#/tools' },
          { label: 'Системная документация', href: '#/docs' },
        ],
      },
      {
        who: 'У меня есть железо',
        body: 'Запустите полосу на своей машине, под своим аккаунтом провайдера: ключ её не покидает. Полоса не зарабатывает TRI: сегодня TRI зарабатывают только спеки .t27 — автору по логину GitHub. Proof of compute — дорога в планах.',
        cta: 'Создать раннер',
        href: CABINET_HOME,
        external: true,
        note: `${RUNNERS_COPY.ru.howItWorks} Сдавать GPU или FPGA в аренду за TRI — в планах: GPU-воркера и формата задач пока нет.`,
        more: [
          { label: 'Как войти в рой', href: '#/blog/how-to-join-the-swarm' },
          { label: 'FPGA-поток, по слоям и по времени', href: '#/devkit' },
        ],
      },
      {
        who: 'Я контрибьютор',
        body: 'Возьмите соту на доске, напишите спеку, которая её порождает, скомпилируйте, отправьте pull request. Отдельного процесса нет: четыре хода ниже по странице — это всё.',
        cta: 'Открыть доску',
        href: '#/queen?tab=kanban',
        more: [
          { label: 'Открытые задачи', href: MINE_LINKS.issues, external: true },
          { label: 'Какая доля стека уже на .t27', href: '#/queen?tab=roadmap' },
          { label: 'Полосы и их XP', href: '#/queen?tab=leaderboard' },
        ],
      },
    ],
    tri: 'TRI:',
    triLink: 'кто заработал и как',
  },
}

const outside = { target: '_blank', rel: 'noopener noreferrer' } as const

export default function GetStartedBlock() {
  const { lang } = useI18n()
  const key = lang === 'ru' ? 'ru' : 'en'
  const t = COPY[key]

  return (
    <section className="play-block get-started" id="get-started" aria-labelledby="get-started-title">
      <div className="play-block-inner">
        <header className="play-block-head">
          <span className="play-block-eyebrow">{t.eyebrow}</span>
          <h2 id="get-started-title">{t.title}</h2>
          <p>{t.lede}</p>
        </header>

        <ul className="get-started-ways site-card-row">
          {t.ways.map((way) => (
            <li className="site-card" key={way.who}>
              <strong>{way.who}</strong>
              <p>{way.body}</p>
              <a className="get-started-cta" href={way.href} {...(way.external ? outside : null)}>
                {way.cta} →
              </a>
              <ul className="get-started-more">
                {way.more.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} {...(link.external ? outside : null)}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              {way.note ? <p className="get-started-note">{way.note}</p> : null}
            </li>
          ))}
        </ul>

        <p className="play-block-closing">
          {t.tri} {TOKEN_COPY[key].status}{' '}
          <a href="#/queen?tab=token">{t.triLink} →</a>
        </p>
      </div>
    </section>
  )
}
