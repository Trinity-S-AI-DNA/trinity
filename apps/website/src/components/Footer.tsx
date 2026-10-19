"use client";
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { LADDER } from '../lib/courseLadder.generated'

// Smooth scrolling is animation-driven, so it silently does nothing when
// animations are not running — a hidden or backgrounded tab, or a reader who has
// asked their system for reduced motion. Getting there instantly is always better
// than not getting there at all.
function scrollBehaviour(): ScrollBehavior {
  const reduced = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return reduced || document.hidden ? 'auto' : 'smooth'
}

// Under HashRouter a bare `#section` is read as a route, so these links used to
// dump the reader on the homepage without scrolling to what they clicked. This
// sends them home when needed and then finds the section once it exists.
function goToSection(e: React.MouseEvent, id: string) {
  e.preventDefault()
  const hash = window.location.hash
  const onHome = hash === '' || hash === '#' || hash === '#/'
  if (!onHome) window.location.hash = '#/'
  // Timer, not requestAnimationFrame: rAF does not fire in a hidden tab, and
  // sections further down the homepage mount lazily.
  let tries = 0
  const tick = () => {
    const el = document.getElementById(id)
    if (el) { el.scrollIntoView({ behavior: scrollBehaviour() }); return }
    if (++tries < 50) setTimeout(tick, 80)
  }
  tick()
}

/**
 * The course advert on every page that is not already selling a course (owner, 2026-10-13:
 * adverts in the footer). Only the ladder's words, which the header already loads: the course
 * list itself (course.generated.ts, ~850 KB) stays out of the bundle every page pays for.
 */
function CoursePromo({ lang }: { lang: string }) {
  const say = LADDER.say[lang === 'ru' ? 'ru' : 'en']
  return (
    <aside
      aria-label={say.CATALOG_TITLE}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem 2rem',
        padding: 'clamp(1rem, 4vw, 1.5rem)',
        marginBottom: 'clamp(1.5rem, 5vw, 3rem)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
      }}
    >
      <div style={{ flex: '1 1 320px' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>{say.PROMO_TITLE}</p>
        <p style={{ margin: '0.4rem 0 0', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{say.PROMO_LINE}</p>
      </div>
      <Link
        to="/courses"
        style={{
          padding: '0.7rem 1.2rem',
          borderRadius: '999px',
          background: 'var(--accent)',
          color: '#000',
          fontWeight: 700,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {say.PROMO_PRESS} →
      </Link>
    </aside>
  )
}

/**
 * `aside` is what a page puts above the links: the course pages pass their TRI CLAW block
 * (components/ClawPromo.tsx). The footer imports none of a page's own stylesheets, so the landing
 * page and the Queen board load only what they draw (qa/queen-contrast-contract.mjs walks them).
 */
export default function Footer({ promo = true, aside = null }: { promo?: boolean; aside?: React.ReactNode } = {}) {
  /* lang нужен подписи «Инвестиции» в списке ссылок: ключа nav[9] в локалях
     нет, и на русской странице там висело английское «Invest». */
  const { t, lang } = useI18n()

  return (
    <footer
      style={{
        background: 'rgba(0,0,0,0.95)',
        borderTop: '1px solid var(--border)',
        padding: 'clamp(3rem, 8vw, 5rem) clamp(1rem, 5vw, 3rem)',
        marginTop: 'clamp(2rem, 6vw, 4rem)'
      }}
      role="contentinfo"
      aria-label="Site footer"
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {aside}
        {promo ? <CoursePromo lang={lang} /> : null}
        {/* Main Footer Content */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(120px, 30vw, 150px), 1fr))',
          gap: 'clamp(1rem, 5vw, 3rem)',
          marginBottom: 'clamp(1.5rem, 5vw, 3rem)'
        }}>
          {/* Brand */}
          <div>
            <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 700, marginBottom: '1rem', margin: 0 }}>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                TRINITY
              </motion.div>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
              {t.footer?.tagline || 'A catalogue of numeric formats and arithmetic cores'}
            </p>
            <div
              style={{
                marginTop: '1rem',
                fontFamily: 'monospace',
                color: 'var(--accent)',
                fontSize: '0.9rem'
              }}
              aria-label="Phi squared plus one over phi squared equals three"
            >
              φ² + 1/φ² = 3
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', color: 'var(--muted)' }}>
              {t.footer?.linksTitle || 'Links'}
            </h3>
            <nav aria-label="Footer navigation">
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Список ссылок сверен с фактическими id секций главной: #solution и
    #benchmarks здесь висели после снятия старого лендинга и никуда не
    вели, а подпись брала nav[1] («Тезис») для ссылки на теоремы. */}
                <li><a href="#claim" onClick={(e) => goToSection(e, 'claim')} style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7, transition: 'opacity 0.2s' }} aria-label="Navigate to Thesis section">{t.nav?.[1] || 'Thesis'}</a></li>
                <li><a href="#formats" onClick={(e) => goToSection(e, 'formats')} style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7, transition: 'opacity 0.2s' }} aria-label="Navigate to Formats section">{t.nav?.[2] || 'Formats'}</a></li>
                <li><a href="#ladder" onClick={(e) => goToSection(e, 'ladder')} style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7, transition: 'opacity 0.2s' }} aria-label="Navigate to Ladder section">{t.nav?.[4] || 'Ladder'}</a></li>
                <li><a href="#theorems" onClick={(e) => goToSection(e, 'theorems')} style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7, transition: 'opacity 0.2s' }} aria-label="Navigate to Theorems section">{t.nav?.[5] || 'Theorems'}</a></li>
                <li><a href="#limits" onClick={(e) => goToSection(e, 'limits')} style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7, transition: 'opacity 0.2s' }} aria-label="Navigate to Limits section">{t.nav?.[6] || 'Limits'}</a></li>
                <li><a href="#reproduce" onClick={(e) => goToSection(e, 'reproduce')} style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7, transition: 'opacity 0.2s' }} aria-label="Navigate to Reproduce section">{t.nav?.[8] || 'Reproduce'}</a></li>
                <li><a href="#author" onClick={(e) => goToSection(e, 'author')} style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7, transition: 'opacity 0.2s' }} aria-label="Navigate to Author section">{lang === 'ru' ? 'Автор' : 'Author'}</a></li>
                <li><a href="#invest" onClick={(e) => goToSection(e, 'invest')} style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7, transition: 'opacity 0.2s' }} aria-label="Navigate to Investment section">{lang === 'ru' ? 'Инвестиции' : 'Investment'}</a></li>
                <li>
                  <a href="#/docs" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, transition: 'opacity 0.2s' }} aria-label="Open the system documentation">
                    {t.footer?.docs || 'Documentation'}
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          {/* Quantum Lab */}
          <div>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', color: 'var(--muted)' }}>
              {t.footer?.vizTitle || 'Quantum Lab'}
            </h3>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Link
                to="/quantum"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'rgba(0, 229, 153, 0.1)',
                  border: '1px solid rgba(0, 229, 153, 0.2)',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  marginBottom: '1rem'
                }}
                aria-label={`${t.footer?.vizLaunch || 'Launch Quantum Lab'} - ${t.footer?.vizDesc || '29 interactive visualizations'}`}
              >
                <span style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }} aria-hidden="true">🔮</span>
                <div>
                  <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1rem' }}>
                    {t.footer?.vizLaunch || 'Launch Quantum Lab'}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                    {t.footer?.vizDesc || '29 interactive visualizations'}
                  </div>
                </div>
              </Link>
            </motion.div>
            <nav aria-label="Quantum visualization quick links" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {['⚛️', '🧠', '🌊', '🔗', '🌀', '👁️', '🔺', '🔥'].map((icon, i) => (
                <Link
                  key={i}
                  to="/quantum"
                  style={{
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '1.2rem'
                  }}
                  aria-label={`Open quantum lab - visualization ${i + 1}`}
                  aria-hidden={i > 0 ? undefined : 'false'}
                >
                  {icon}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', color: 'var(--muted)' }}>
              {t.footer?.contactTitle || 'Contact'}
            </h3>
            <nav aria-label="Contact links">
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                  <a href="https://github.com/gHashTag/trinity" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7 }} aria-label="Visit GitHub repository (opens in new tab)">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://t.me/t27_dev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7 }} aria-label="Join Telegram dev group (opens in new tab)">
                    Telegram (Dev)
                  </a>
                </li>
                <li>
                  <a href="https://t.me/t27_lang" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7 }} aria-label="Join Telegram language channel (opens in new tab)">
                    Telegram (Language)
                  </a>
                </li>
                <li>
                  <a href="https://x.com/t27_lang" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.7 }} aria-label="Follow on X (opens in new tab)">
                    X (Twitter)
                  </a>
                </li>
                {/* One contact address, and the only one that can actually receive
                    mail: t27.dev has no MX records at all, so every admin@t27.dev
                    link on this site was undeliverable. */}
                <li>
                  <a href="mailto:admin@t27.ai" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.85rem', opacity: 0.85 }} aria-label="Send email to admin@t27.ai">
                    admin@t27.ai
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ 
          borderTop: '1px solid var(--border)', 
          paddingTop: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
            © 2024-2026 TRINITY. {t.footer?.rights || 'All rights reserved.'}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', fontFamily: 'monospace' }}>
            PHOENIX = 999
          </div>
        </div>
      </div>
    </footer>
  )
}
