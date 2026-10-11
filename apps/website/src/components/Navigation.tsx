import { useState, useEffect, memo, useCallback } from 'react'
import { useI18n } from '../i18n/context'
import LanguageSwitcher from './LanguageSwitcher'

// Док ведёт к цели: карта и спеки идут сразу за именем, дальше — страницы, на
// которые переехали секции статьи. Записи, начинающиеся с '#/', это маршруты;
// остальные — секции самой главной.
const navTargets = ['hero', '#/queen', '#/specs', 'claim', '#/gft', '#/proof', '#/verification', '#/cases']
// Скролл-спай следит только за тем, что после переноса осталось на главной.
const sectionIds = ['hero', 'claim']
const BASE = import.meta.env.BASE_URL
// Docs is the site's own system documentation (#/docs, generated from
// specs/docs/**.t27); the t27.ai/docs/ Jekyll copy is being retired in its favour.
const DOCS_URL = '#/docs'

// The locale files have no keys for the commercial pages yet, so the labels
// live next to the links. Missing locales fall back to English.
const PAGES_LABEL: Record<string, string> = {
  ru: 'Страницы',
}

type PageLink = { href: string; en: string; ru: string; note: string; noteRu: string; external?: boolean; color?: string }

// Every link that leaves the one-page scroll. These outgrew the dock — a single
// fixed-height row with no room left — so they live behind one disclosure
// instead of pushing each other off the right edge.
const PAGES: PageLink[] = [
  // Прежняя подпись несла «2.84× и 5.53× точнее tekum16». Это заявление
  // отозвано: оракул, помеченный tekum, декодирует все 65 536 шестнадцатибитных
  // кодов идентично takum-оракулу, поэтому сравнение шло не с tekum.
  /* 14.08.2026: видимое имя приведено к тому, которым формат назван в статье и
     в теле главной — GFTernary; старое GF-T оставлено в скобках, потому что оно
     стоит в conformance-векторах, в RTL и в внешних ссылках — убрать его совсем
     значило бы разорвать связь между страницей и артефактами. */
  { href: '#/gft', en: 'GFTernary (GF-T)', ru: 'Формат GFTernary (GF-T)', note: 'The weight format: fixed fields, ternary exponent, measured cost', noteRu: 'Формат веса: фиксированные поля, тернарная экспонента, измеренная цена' },
  { href: '#/start', en: 'Start here', ru: 'С чего начать', note: 'Four checks you can run yourself, in order', noteRu: 'Четыре проверки, которые запускаете сами, по порядку' },
  { href: '#/select', en: 'Choose a format', ru: 'Выбор формата', note: 'A task-by-format comparison matrix', noteRu: 'Матрица сравнения формата и задачи' },
  { href: '#/verification', en: 'Verification', ru: 'Верификация', note: 'Send RTL, get it measured on a live FPGA board', noteRu: 'Присылаете RTL — измеряю на живой FPGA-плате' },
  { href: '#/ip', en: 'Licensing', ru: 'Лицензирование', note: 'Arithmetic cores with RTL, reference model and vectors', noteRu: 'Ядра: RTL, эталонная модель и векторы' },
  { href: '#/proof', en: 'Proof', ru: 'Доказательства', note: 'Every measured number, and its limits', noteRu: 'Все измеренные цифры и их границы' },
  // The homepage's old first screen. It is the game's front door now, so the
  // number that the game exists to build has a page of its own.
  { href: '#/trinity', en: 'The number', ru: 'Число', note: 'r² = r + 1, the format claim, and the evidence under it', noteRu: 'r² = r + 1, заявление о формате и свидетельства под ним' },
  { href: '#/cases', en: 'Case studies', ru: 'Работы', note: 'Verification runs on other people’s RTL', noteRu: 'Прогоны чужого RTL' },
  { href: '#/t27-basics', en: 'Course: t27 basics', ru: 'Курс: основы t27', note: 'The language itself, 27 lessons', noteRu: 'Сам язык, 27 уроков' },
  { href: '#/course', en: 'Course: FPGA', ru: 'Курс: FPGA', note: 'From zero to a chip, 27 lessons', noteRu: 'С нуля до чипа, 27 уроков' },
  { href: '#/ai-numbers', en: 'Course: AI numbers', ru: 'Курс: ИИ-числа', note: 'How AI chips store numbers, 27 lessons', noteRu: 'Как ИИ-чипы хранят числа, 27 уроков' },
  { href: '#/goldenfloat', en: 'Course: GoldenFloat', ru: 'Курс: GoldenFloat', note: 'A float family split by phi, 27 lessons', noteRu: 'Семейство чисел, разрезанных по phi, 27 уроков' },
  { href: '#/verify-hardware', en: 'Course: verifying hardware', ru: 'Курс: проверка железа', note: 'Testbenches, waveforms, formal, mutation, 27 lessons', noteRu: 'Тестбенчи, временные диаграммы, формальные методы, мутации, 27 уроков' },
  { href: '#/clocks-and-cdc', en: 'Course: clocks and CDC', ru: 'Курс: такты и CDC', note: 'Clocking, resets, clock-domain crossings, 27 lessons', noteRu: 'Тактирование, сброс, пересечения тактовых доменов, 27 уроков' },
  { href: '#/buses-and-peripherals', en: 'Course: buses and peripherals', ru: 'Курс: шины и периферия', note: 'UART, SPI, APB, AXI4, Ethernet, 27 lessons', noteRu: 'UART, SPI, APB, AXI4, Ethernet, 27 уроков' },
  { href: '#/foundry', en: 'Golden Foundry', ru: 'Золотая Литейная', note: 'A club for people who build on silicon', noteRu: 'Клуб разработчиков на кремнии', color: '#C9A24B' },
  { href: '#/about', en: 'About', ru: 'Об авторе', note: 'Background, papers, contact', noteRu: 'Биография, статьи, контакты' },
  { href: '#/resources', en: 'Resources', ru: 'Материалы', note: 'Papers and datasets, each with a DOI', noteRu: 'Статьи и датасеты, у каждого DOI' },
  { href: '#/blog', en: 'Blog', ru: 'Блог', note: 'Notes on the work as it happens', noteRu: 'Заметки по ходу работы' },
  { href: '#/dashboard', en: 'Dashboard', ru: 'Панель', note: 'Project metrics', noteRu: 'Метрики проекта', color: '#00ccff' },
  { href: '#/tree', en: 'Research Lab', ru: 'Исслед. лаб', note: 'Interactive visualisations', noteRu: 'Интерактивные визуализации', color: '#ffd700' },
  { href: '#/specs', en: 'Spec Explorer', ru: 'Обозреватель спек', note: 'The .t27 corpus, layer by layer, through the real compiler', noteRu: 'Корпус .t27 по слоям через настоящий компилятор', color: '#00FF88' },
  { href: '#/skills', en: 'Skill Explorer', ru: 'Обозреватель скилов', note: 'Every published skill, bound to the .t27 spec it stands on', noteRu: 'Каждый опубликованный скил и спека .t27, на которой он стоит', color: '#00FF88' },
  { href: '#/crons', en: 'Cron Explorer', ru: 'Обозреватель кронов', note: 'Every scheduled job of the farm, and when it next fires', noteRu: 'Все задания по расписанию и когда каждое сработает', color: '#00ccff' },
  { href: DOCS_URL, en: 'Docs', ru: 'Документация', note: 'The project, the rules of the game for its agents, and the system in detail', noteRu: 'Проект, правила игры для агентов и система в деталях', color: '#ffd700' },
]

// Smooth scrolling is animation-driven, so it silently does nothing when
// animations are not running — a hidden or backgrounded tab, or a reader who has
// asked their system for reduced motion. Getting there instantly is always better
// than not getting there at all.
function scrollBehaviour(): ScrollBehavior {
  const reduced = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return reduced || document.hidden ? 'auto' : 'smooth'
}

// Find a section that may not have mounted yet, then scroll to it.
//
// Uses a timer rather than requestAnimationFrame on purpose: rAF is throttled to
// zero in a background or hidden tab, so a correctness path built on it simply
// never runs there. Sections further down the homepage are also lazily rendered,
// so the window has to be generous — 4 seconds of 80ms polls, which stops as soon
// as the element appears.
function scrollToSectionWhenReady(id: string) {
  let tries = 0
  const tick = () => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: scrollBehaviour() })
      return
    }
    if (++tries < 50) setTimeout(tick, 80)
  }
  tick()
}

export default memo(function Navigation() {
  const { t, lang } = useI18n()
  const [active, setActive] = useState('hero')
  const [menuOpen, setMenuOpen] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const ru = lang === 'ru'

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el && scrollY >= (el as HTMLElement).offsetTop - 200) {
          setActive(id)
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // These nine links point at sections of the one-page scroll, which do not
  // exist on any routed page. Until now the handler called preventDefault and
  // then scrollIntoView on null, so every one of them was silently dead on
  // /verification, /proof, /ip, /course, /cases and /about — the whole header,
  // on six pages. From a routed page it now goes home first and scrolls after
  // the homepage has mounted.
  const scrollTo = useCallback((id: string) => {
    setMenuOpen(false)
    setPagesOpen(false)
    const hash = window.location.hash
    const onHome = hash === '' || hash === '#' || hash === '#/'
    if (!onHome) {
      window.location.hash = '#/'
      scrollToSectionWhenReady(id)
      return
    }
    scrollToSectionWhenReady(id)
  }, [])

  // Handle escape key to close menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuOpen) setMenuOpen(false)
        if (pagesOpen) setPagesOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [menuOpen, pagesOpen])

  // A disclosure that stays open after you click past it is a trap; close it on
  // any click outside and on scroll, since the dock is fixed and the page is not.
  useEffect(() => {
    if (!pagesOpen) return
    const close = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('.nav-pages-panel') || target?.closest('.nav-pages-toggle')) return
      setPagesOpen(false)
    }
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, { passive: true })
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close)
    }
  }, [pagesOpen])

  return (
    <>
      {/* Desktop dock nav */}
      <nav className="nav-dock" aria-label="Main navigation">
        {t.nav?.map((item: string, i: number) => {
          const target = navTargets[i]
          if (!target) return null
          if (target.startsWith('#/')) {
            return <a key={i} href={target} aria-label={`Navigate to ${item}`}>{item}</a>
          }
          return (
            <a
              key={i}
              href={`#${target}`}
              className={active === target ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); scrollTo(target) }}
              aria-label={`Navigate to ${item}`}
              aria-current={active === target ? 'page' : undefined}
            >
              {item}
            </a>
          )
        })}
        <button
          type="button"
          className={`nav-pages-toggle ${pagesOpen ? 'open' : ''}`}
          onClick={() => setPagesOpen((v) => !v)}
          aria-expanded={pagesOpen}
          aria-haspopup="true"
          aria-controls="nav-pages-panel"
        >
          {PAGES_LABEL[lang] || 'Pages'}
          <span className="nav-pages-caret" aria-hidden="true">▾</span>
        </button>
        <LanguageSwitcher />
      </nav>

      {/* Fixed rather than absolute: the dock scrolls horizontally, and a panel
          positioned inside it would be clipped by that overflow. */}
      {pagesOpen && (
        <div className="nav-pages-panel" id="nav-pages-panel" role="menu" aria-label={PAGES_LABEL[lang] || 'Pages'}>
          {PAGES.map((p) => (
            <a
              key={p.href}
              href={p.href}
              role="menuitem"
              target={p.external ? '_blank' : undefined}
              rel={p.external ? 'noopener noreferrer' : undefined}
              onClick={() => setPagesOpen(false)}
            >
              <span className="nav-pages-name" style={p.color ? { color: p.color } : undefined}>
                {ru ? p.ru : p.en}
              </span>
              <span className="nav-pages-note">{ru ? p.noteRu : p.note}</span>
            </a>
          ))}
        </div>
      )}

      {/* Mobile hamburger button */}
      <button
        className={`hamburger-btn ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        aria-haspopup="true"
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile fullscreen menu */}
      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        >
          <div
            className="mobile-menu"
            // The hamburger declares aria-controls="mobile-menu"; without this id
            // that reference resolved to nothing, so a screen reader following it
            // found no menu. Caught by an ARIA-driven sweep in render-check.
            id="mobile-menu"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-title"
          >
            <h2 id="mobile-menu-title" className="visually-hidden">
              Navigation Menu
            </h2>
            <div className="mobile-menu-links" role="navigation" aria-label="Mobile navigation">
              {t.nav?.map((item: string, i: number) => {
                const target = navTargets[i]
                if (!target) return null
                if (target.startsWith('#/')) {
                  return (
                    <a key={i} href={target} onClick={() => setMenuOpen(false)} aria-label={`Navigate to ${item}`}>
                      {item}
                    </a>
                  )
                }
                return (
                  <a
                    key={i}
                    href={`#${target}`}
                    className={active === target ? 'active' : ''}
                    onClick={(e) => { e.preventDefault(); scrollTo(target) }}
                    aria-label={`Navigate to ${item}`}
                    aria-current={active === target ? 'page' : undefined}
                  >
                    {item}
                  </a>
                )
              })}
              {/* Same source as the desktop disclosure, so the two can't drift apart */}
              {PAGES.map((p) => (
                <a
                  key={p.href}
                  href={p.href}
                  target={p.external ? '_blank' : undefined}
                  rel={p.external ? 'noopener noreferrer' : undefined}
                  style={{ color: p.color || 'var(--accent)' }}
                  onClick={() => setMenuOpen(false)}
                >
                  {ru ? p.ru : p.en}
                </a>
              ))}
            </div>
            <div className="mobile-menu-footer">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </>
  )
})
