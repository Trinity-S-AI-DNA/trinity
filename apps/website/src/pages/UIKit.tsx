// t27 UI Kit — live Storybook-like viewer
// Design tokens from specs/t27f/vf_theme.t27
// Issue: gHashTag/t27#13426 (epic M0)
import { useState, useEffect, type HTMLAttributes } from 'react'
import type { CSSProperties, ReactNode } from 'react'

// ── Design tokens ──────────────────────────────────────────────
type Theme = 't27' | 'paper'

const TOKENS = {
  t27: {
    bg: '#000000', text: '#FFFFFF', muted: '#888888',
    accent: '#00FF88', accentDark: '#00CC66', gold: '#FFD700',
    border: 'rgba(255,255,255,0.08)', cardBorder: '#333333', cardBorderHover: '#FFFFFF',
    cardDesc: '#A6A6A6', cardFoot: '#8A8A8A', surfaceInput: '#1A1A1A',
    surfaceCard: '#0A0A0A',
  },
  paper: {
    bg: '#FFFFFF', text: '#000000', muted: '#666666',
    accent: '#00A35C', accentDark: '#007A45', gold: '#B38F00',
    border: 'rgba(0,0,0,0.08)', cardBorder: '#CCCCCC', cardBorderHover: '#000000',
    cardDesc: '#4D4D4D', cardFoot: '#666666', surfaceInput: '#F5F5F5',
    surfaceCard: '#FAFAFA',
  },
} as const

type Tok = { bg: string; text: string; muted: string; accent: string; accentDark: string; gold: string; border: string; cardBorder: string; cardBorderHover: string; cardDesc: string; cardFoot: string; surfaceInput: string; surfaceCard: string }
const tok = (theme: Theme): Tok => TOKENS[theme]

// ── Components ─────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'warn'
type BtnState = 'default' | 'hover' | 'active' | 'disabled'

function buttonStyle(theme: Theme, variant: BtnVariant, state: BtnState): CSSProperties {
  const t = tok(theme)
  // B&W brand: primary inverts bg/text between themes (white-on-black ↔ black-on-white)
  const primaryBg = t.text   // text color becomes bg — white in dark, black in light
  const primaryText = t.bg   // bg becomes text — black in dark, white in light
  const fills: Record<BtnVariant, string> = {
    primary: primaryBg, secondary: 'transparent', ghost: 'transparent',
    success: t.accentDark, warn: t.gold,
  }
  const borders: Record<BtnVariant, string> = {
    primary: t.text, secondary: t.text, ghost: 'transparent',
    success: t.accentDark, warn: t.gold,
  }
  const textColors: Record<BtnVariant, string> = {
    primary: primaryText, secondary: t.text, ghost: t.muted,
    success: '#000000', warn: '#000000',
  }
  const fill = state === 'hover'
    ? (variant === 'secondary' ? t.text + '18' : fills[variant] + 'CC')
    : state === 'active'
      ? (variant === 'secondary' ? t.text + '30' : fills[variant] + 'DD')
      : fills[variant]
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px 20px', borderRadius: '999px', border: `1px solid ${borders[variant]}`,
    background: fill, color: textColors[variant],
    fontFamily: 'Outfit, system-ui, sans-serif', fontSize: '15px', fontWeight: 400,
    cursor: state === 'disabled' ? 'not-allowed' : 'pointer',
    opacity: state === 'disabled' ? 0.4 : 1,
    minHeight: '44px', letterSpacing: 'normal', transition: 'none',
  }
}

function UiButton({ theme, variant, state, label }: { theme: Theme; variant: BtnVariant; state: BtnState; label?: string }) {
  const names: Record<BtnVariant, string> = { primary: 'Primary', secondary: 'Secondary', ghost: 'Ghost', success: 'Success', warn: 'Warn' }
  return <button style={buttonStyle(theme, variant, state)} disabled={state === 'disabled'}>{label ?? names[variant]}</button>
}

function UiCard({ theme, state }: { theme: Theme; state: 'default' | 'hover' }) {
  const t = tok(theme)
  const border = state === 'hover' ? t.cardBorderHover : t.cardBorder
  return (
    <div style={{ background: t.surfaceCard, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px', maxWidth: '560px', width: '100%' }}>
      <div style={{ color: t.text, fontSize: '15.2px', fontWeight: 600, marginBottom: '8px' }}>Card title</div>
      <div style={{ color: t.cardDesc, fontSize: '15.2px', fontWeight: 400, lineHeight: 1.5, marginBottom: '16px' }}>Card description — a short paragraph of body text that spans two lines for context.</div>
      <div style={{ color: t.cardFoot, fontSize: '11px', fontWeight: 600, letterSpacing: '3.52px', textTransform: 'uppercase' }}>Author · 2026-11-14</div>
    </div>
  )
}

type InputState = 'default' | 'error' | 'focus' | 'disabled'

function UiInput({ theme, state }: { theme: Theme; state: InputState }) {
  const t = tok(theme)
  const borderColor = state === 'error' ? '#ff4444' : state === 'focus' ? t.accent : t.cardBorder
  const shadow = state === 'focus' ? `0 0 0 2px ${t.accent}44` : 'none'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '375px', width: '100%' }}>
      <label style={{ color: state === 'focus' ? t.text : t.muted, fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {state === 'error' ? 'Email (error)' : 'Email'}
      </label>
      <input
        readOnly
        disabled={state === 'disabled'}
        value={state === 'error' ? 'invalid@' : state === 'disabled' ? 'disabled@t27.ai' : 'hello@t27.ai'}
        style={{
          background: t.surfaceInput, border: `1.5px solid ${borderColor}`,
          borderRadius: '8px', padding: '10px 14px', color: state === 'disabled' ? t.muted : t.text,
          fontSize: '14px', fontFamily: 'Outfit, system-ui, sans-serif',
          outline: 'none', boxShadow: shadow, cursor: state === 'disabled' ? 'not-allowed' : 'text',
        }}
      />
      {state === 'error' && <span style={{ color: '#ff4444', fontSize: '12px' }}>Invalid email address</span>}
    </div>
  )
}

type BadgeVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'warn'
type BadgeState = 'default' | 'hover' | 'active' | 'disabled'
interface InteractionStep { action: 'hover' | 'click' | 'focus'; expect: string }

function UiBadge({ theme, variant, state = 'default', label, ...rest }: { theme: Theme; variant: BadgeVariant; state?: BadgeState; label?: string } & HTMLAttributes<HTMLSpanElement>) {
  const t = tok(theme)
  const baseFills: Record<BadgeVariant, string> = {
    primary: t.accent, secondary: 'transparent', ghost: 'transparent',
    success: t.accentDark, warn: t.gold,
  }
  const borders: Record<BadgeVariant, string> = {
    primary: t.accent, secondary: t.cardBorder, ghost: 'transparent',
    success: t.accentDark, warn: t.gold,
  }
  const textColors: Record<BadgeVariant, string> = {
    primary: '#000000', secondary: t.text, ghost: t.muted,
    success: '#000000', warn: '#000000',
  }
  const names: Record<BadgeVariant, string> = { primary: 'Primary', secondary: 'Secondary', ghost: 'Ghost', success: 'Success', warn: 'Warn' }
  const base = baseFills[variant]
  const fill = state === 'hover' ? base + 'CC' : state === 'active' ? base + 'DD' : base
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: '99px', border: `1px solid ${borders[variant]}`,
      background: fill, color: textColors[variant],
      fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em',
      opacity: state === 'disabled' ? 0.4 : 1, cursor: state === 'disabled' ? 'not-allowed' : 'default',
    }} data-testid={`badge-${variant}`} data-state={state} {...rest}>{label ?? names[variant]}</span>
  )
}

function InteractiveBadge({ theme, variant }: { theme: Theme; variant: BadgeVariant }) {
  const [s, setS] = useState<BadgeState>('default')
  return <UiBadge theme={theme} variant={variant} state={s} tabIndex={0}
    onMouseEnter={() => setS('hover')} onMouseLeave={() => setS('default')} onMouseDown={() => setS('active')} onMouseUp={() => setS('hover')} onFocus={() => setS('hover')} onBlur={() => setS('default')} />
}

function UiNav({ theme, activeIdx }: { theme: Theme; activeIdx: number }) {
  const t = tok(theme)
  const items = ['Home', 'Specs', 'Course', 'Tools']
  return (
    <nav style={{ display: 'flex', gap: '0', borderBottom: `1px solid ${t.cardBorder}`, width: '100%', maxWidth: '480px' }}>
      {items.map((item, i) => (
        <div key={item} style={{
          padding: '10px 20px', fontSize: '14px', fontWeight: i === activeIdx ? 600 : 400,
          color: i === activeIdx ? t.accent : t.muted,
          borderBottom: i === activeIdx ? `2px solid ${t.accent}` : '2px solid transparent',
          cursor: 'pointer', letterSpacing: '0.02em',
        }}>{item}</div>
      ))}
    </nav>
  )
}

function UiTable({ theme, rows }: { theme: Theme; rows: number }) {
  const t = tok(theme)
  const data = [
    { name: 'Button', spec: 'vf_card.t27', status: 'live' },
    { name: 'Badge', spec: 'vf_card.t27', status: 'live' },
  ]
  return (
    <table style={{ width: '100%', maxWidth: '480px', borderCollapse: 'collapse', fontSize: '14px' }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
          {['Component', 'Spec', 'Status'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: t.muted, fontWeight: 500, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.slice(0, rows).map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
            <td style={{ padding: '10px 12px', color: t.text }}>{row.name}</td>
            <td style={{ padding: '10px 12px', color: t.muted, fontFamily: 'monospace', fontSize: '12px' }}>{row.spec}</td>
            <td style={{ padding: '10px 12px' }}>
              <UiBadge theme={theme} variant="success" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function UiTaskCard({ theme }: { theme: Theme }) {
  const t = tok(theme)
  return (
    <div style={{ background: t.surfaceCard, border: `1px solid ${t.cardBorder}`, borderRadius: '12px', padding: '20px', maxWidth: '375px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <UiBadge theme={theme} variant="primary" />
        <span style={{ color: t.muted, fontSize: '12px' }}>2026-11-14</span>
      </div>
      <div style={{ color: t.text, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Implement live UIKit viewer</div>
      <div style={{ color: t.cardDesc, fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>Storybook-like page at t27.ai/uikit with 35 stories, live render, theme switch.</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: `1px solid ${t.border}`, paddingTop: '12px' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#000' }}>D</div>
        <span style={{ color: t.cardFoot, fontSize: '12px' }}>Dmitrii Vasilev</span>
        <span style={{ marginLeft: 'auto', color: t.muted, fontSize: '12px' }}>#13426</span>
      </div>
    </div>
  )
}

function UiText({ theme, variant }: { theme: Theme; variant: 'heading' | 'body' }) {
  const t = tok(theme)
  if (variant === 'heading') {
    return (
      <div>
        {/* H2 section label — 11px 500 uppercase LS=1.76px */}
        <div style={{ color: t.muted, fontSize: '11px', fontWeight: 500, letterSpacing: '1.76px', textTransform: 'uppercase', marginBottom: '8px' }}>Section</div>
        {/* H1 hero — 800 weight, large, LS=-4.84px */}
        <h1 style={{ color: t.text, fontSize: 'clamp(40px, 8vw, 108px)', fontWeight: 800, letterSpacing: '-4.84px', lineHeight: 0.95, margin: 0 }}>t27</h1>
        {/* H3 sub-label — 12.8px 500 uppercase LS=1.28px muted */}
        <div style={{ color: t.muted, fontSize: '12.8px', fontWeight: 500, letterSpacing: '1.28px', textTransform: 'uppercase', marginTop: '12px' }}>The language of three</div>
      </div>
    )
  }
  return <p style={{ color: t.text, fontSize: '15.2px', fontWeight: 400, lineHeight: 1.6, maxWidth: '480px', margin: 0 }}>φ² = φ + 1 — the golden constraint. Ternary logic fits the universe better than binary. Every spec is a theorem; every test is a proof.</p>
}

function UiContainer({ theme }: { theme: Theme }) {
  const t = tok(theme)
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center', padding: '16px', border: `1px solid ${t.cardBorder}`, borderRadius: '8px', background: t.surfaceCard, flexWrap: 'wrap' }}>
      <UiButton theme={theme} variant="primary" state="default" label="Action" />
      <UiButton theme={theme} variant="secondary" state="default" label="Cancel" />
      <UiBadge theme={theme} variant="primary" />
      <UiBadge theme={theme} variant="warn" />
    </div>
  )
}

function UiNetlistCard({ theme }: { theme: Theme }) {
  const t = tok(theme)
  const nodes = ['VDD', 'GND', 'IN+', 'IN−', 'OUT', 'FB']
  return (
    <div style={{ background: t.surfaceCard, border: `1px solid ${t.cardBorder}`, borderRadius: '12px', padding: '16px', maxWidth: '300px', width: '100%' }}>
      <div style={{ color: t.muted, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Netlist Card</div>
      <div style={{ color: t.text, fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>OTA_2stage_v1</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {nodes.map(n => (
          <span key={n} style={{ padding: '2px 8px', borderRadius: '4px', background: t.border, color: t.muted, fontSize: '11px', fontFamily: 'monospace' }}>{n}</span>
        ))}
      </div>
      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${t.border}`, color: t.cardFoot, fontSize: '11px' }}>6 ports · analog · specs/analog/netlist_card.t27</div>
    </div>
  )
}

// ── Story registry ─────────────────────────────────────────────
interface Story {
  id: string; title: string; component: string
  render: (theme: Theme) => ReactNode
  specPath: string; pngPath?: string; description?: string; interactions?: InteractionStep[]
}

const STORIES: Story[] = [
  { id: 'button-primary-default',    title: 'Button / Primary / Default',    component: 'button',    render: t => <UiButton theme={t} variant="primary"   state="default" />,  specPath: 'specs/uikit/stories.t27', pngPath: 'stories/s00_t0.png' },
  { id: 'button-primary-hover',      title: 'Button / Primary / Hover',      component: 'button',    render: t => <UiButton theme={t} variant="primary"   state="hover" />,    specPath: 'specs/uikit/stories.t27', pngPath: 'stories/s01_t0.png' },
  { id: 'button-primary-active',     title: 'Button / Primary / Active',     component: 'button',    render: t => <UiButton theme={t} variant="primary"   state="active" />,   specPath: 'specs/uikit/stories.t27' },
  { id: 'button-primary-disabled',   title: 'Button / Primary / Disabled',   component: 'button',    render: t => <UiButton theme={t} variant="primary"   state="disabled" />, specPath: 'specs/uikit/stories.t27', pngPath: 'stories/s02_t0.png' },
  { id: 'button-secondary-default',  title: 'Button / Secondary / Default',  component: 'button',    render: t => <UiButton theme={t} variant="secondary" state="default" />,  specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s03_t0.png' },
  { id: 'button-secondary-hover',    title: 'Button / Secondary / Hover',    component: 'button',    render: t => <UiButton theme={t} variant="secondary" state="hover" />,    specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s04_t0.png' },
  { id: 'button-secondary-disabled', title: 'Button / Secondary / Disabled', component: 'button',    render: t => <UiButton theme={t} variant="secondary" state="disabled" />, specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s05_t0.png' },
  { id: 'button-ghost-default',      title: 'Button / Ghost / Default',      component: 'button',    render: t => <UiButton theme={t} variant="ghost"     state="default" />,  specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s06_t0.png' },
  { id: 'button-ghost-hover',        title: 'Button / Ghost / Hover',        component: 'button',    render: t => <UiButton theme={t} variant="ghost"     state="hover" />,    specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s07_t0.png' },
  { id: 'button-ghost-disabled',     title: 'Button / Ghost / Disabled',     component: 'button',    render: t => <UiButton theme={t} variant="ghost"     state="disabled" />, specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s08_t0.png' },
  { id: 'button-success-default',    title: 'Button / Success / Default',    component: 'button',    render: t => <UiButton theme={t} variant="success"   state="default" />,  specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s09_t0.png' },
  { id: 'button-success-hover',      title: 'Button / Success / Hover',      component: 'button',    render: t => <UiButton theme={t} variant="success"   state="hover" />,    specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s10_t0.png' },
  { id: 'button-success-disabled',   title: 'Button / Success / Disabled',   component: 'button',    render: t => <UiButton theme={t} variant="success"   state="disabled" />, specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s11_t0.png' },
  { id: 'button-warn-default',       title: 'Button / Warn / Default',       component: 'button',    render: t => <UiButton theme={t} variant="warn"      state="default" />,  specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s12_t0.png' },
  { id: 'button-warn-hover',         title: 'Button / Warn / Hover',         component: 'button',    render: t => <UiButton theme={t} variant="warn"      state="hover" />,    specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s13_t0.png' },
  { id: 'button-warn-disabled',      title: 'Button / Warn / Disabled',      component: 'button',    render: t => <UiButton theme={t} variant="warn"      state="disabled" />, specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s14_t0.png' },
  { id: 'card-default',              title: 'Card / Default',                component: 'card',      render: t => <UiCard theme={t} state="default" />,   specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s15_t0.png' },
  { id: 'card-hover',                title: 'Card / Hover',                  component: 'card',      render: t => <UiCard theme={t} state="hover" />,     specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s16_t0.png' },
  { id: 'input-default',             title: 'Input / Default',               component: 'input',     render: t => <UiInput theme={t} state="default" />,  specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s17_t0.png' },
  { id: 'input-error',               title: 'Input / Error',                 component: 'input',     render: t => <UiInput theme={t} state="error" />,    specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s18_t0.png' },
  { id: 'input-focus',               title: 'Input / Focus',                 component: 'input',     render: t => <UiInput theme={t} state="focus" />,    specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s19_t0.png' },
  { id: 'badge-primary',             title: 'Badge / Primary / Default',     component: 'badge',
    render: t => <InteractiveBadge theme={t} variant="primary" />,
    specPath: 'specs/uikit/stories.t27', pngPath: 'stories/s20_t0.png',
    interactions: [
      { action: 'hover', expect: 'hover' },
      { action: 'click', expect: 'active' },
      { action: 'focus', expect: 'hover' },
    ] },
  { id: 'badge-primary-hover',       title: 'Badge / Primary / Hover',       component: 'badge',     render: t => <UiBadge theme={t} variant="primary" state="hover" />,             specPath: 'specs/uikit/stories.t27' },
  { id: 'badge-primary-active',      title: 'Badge / Primary / Active',      component: 'badge',     render: t => <UiBadge theme={t} variant="primary" state="active" />,            specPath: 'specs/uikit/stories.t27' },
  { id: 'badge-primary-disabled',    title: 'Badge / Primary / Disabled',    component: 'badge',     render: t => <UiBadge theme={t} variant="primary" state="disabled" />,          specPath: 'specs/uikit/stories.t27' },
  { id: 'badge-secondary',           title: 'Badge / Secondary',             component: 'badge',     render: t => <UiBadge theme={t} variant="secondary" />, specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s21_t0.png' },
  { id: 'badge-ghost',               title: 'Badge / Ghost',                 component: 'badge',     render: t => <UiBadge theme={t} variant="ghost" />,     specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s22_t0.png' },
  { id: 'badge-success',             title: 'Badge / Success',               component: 'badge',     render: t => <UiBadge theme={t} variant="success" />,   specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s23_t0.png' },
  { id: 'badge-warn',                title: 'Badge / Warn',                  component: 'badge',     render: t => <UiBadge theme={t} variant="warn" />,      specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s24_t0.png' },
  { id: 'nav-active-0',              title: 'Nav / Active 0',                component: 'nav',       render: t => <UiNav theme={t} activeIdx={0} />,         specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s25_t0.png' },
  { id: 'nav-active-1',              title: 'Nav / Active 1',                component: 'nav',       render: t => <UiNav theme={t} activeIdx={1} />,         specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s26_t0.png' },
  { id: 'nav-active-2',              title: 'Nav / Active 2',                component: 'nav',       render: t => <UiNav theme={t} activeIdx={2} />,         specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s27_t0.png' },
  { id: 'table-1-row',               title: 'Table / 1 Row',                 component: 'table',     render: t => <UiTable theme={t} rows={1} />,            specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s28_t0.png' },
  { id: 'table-2-rows',              title: 'Table / 2 Rows',                component: 'table',     render: t => <UiTable theme={t} rows={2} />,            specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s29_t0.png' },
  { id: 'task-card',                 title: 'Task Card',                     component: 'task-card', render: t => <UiTaskCard theme={t} />,                   specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s30_t0.png' },
  { id: 'input-disabled',            title: 'Input / Disabled',              component: 'input',     render: t => <UiInput theme={t} state="disabled" />,    specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s31_t0.png' },
  { id: 'text-heading',              title: 'Text / Heading',                component: 'text',      render: t => <UiText theme={t} variant="heading" />,    specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s32_t0.png' },
  { id: 'text-body',                 title: 'Text / Body',                   component: 'text',      render: t => <UiText theme={t} variant="body" />,       specPath: 'specs/t27f/vf_storybook.t27', pngPath: 'stories/s33_t0.png' },
  { id: 'container-row',             title: 'Container / Row',               component: 'container', render: t => <UiContainer theme={t} />,                 specPath: 'specs/t27f/vf_storybook.t27' },
]

// ── Layout ─────────────────────────────────────────────────────
const COMPONENTS = [...new Set(STORIES.map(s => s.component))]

type Tab = 'stories' | 'gallery' | 'netlist' | 'badge-vr'

export default function UIKit() {
  const [theme, setTheme] = useState<Theme>('t27')
  const [activeId, setActiveId] = useState(STORIES[0].id)
  const [tab, setTab] = useState<Tab>('stories')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(COMPONENTS))
  const [stepResults, setStepResults] = useState<{ pass: boolean; msg: string }[]>([])

  const t = tok(theme)
  const story = STORIES.find(s => s.id === activeId)!

  useEffect(() => { setStepResults([]) }, [activeId])

  const runSteps = async () => {
    const el = document.getElementById('uikit-canvas')?.querySelector('[data-testid]') as HTMLElement | null
    const run = async (s: InteractionStep) => { if (!el) return { pass: false, msg: 'not found' }; s.action === 'hover' ? el.dispatchEvent(new MouseEvent('mouseenter')) : s.action === 'click' ? el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) : el.focus(); await new Promise<void>(r => setTimeout(r, 80)); return { pass: el.dataset.state === s.expect, msg: `${s.action} → "${el.dataset.state}"` } }
    setStepResults(await Promise.all((story.interactions ?? []).map(run)))
  }

  const toggle = (comp: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(comp) ? next.delete(comp) : next.add(comp)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Outfit, system-ui, sans-serif', background: t.bg, color: t.text, overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: '230px', borderRight: `1px solid ${t.cardBorder}`, overflow: 'auto', flexShrink: 0, background: theme === 't27' ? '#080808' : '#FFFFFF' }}>
        <div style={{ padding: '14px 12px 10px', borderBottom: `1px solid ${t.cardBorder}` }}>
          <div style={{ color: t.accent, fontWeight: 800, fontSize: '15px', letterSpacing: '0.04em' }}>t27 UI Kit</div>
          <div style={{ color: t.muted, fontSize: '11px', marginTop: '2px' }}>M0 · 35 stories</div>
        </div>
        {COMPONENTS.map(comp => (
          <div key={comp}>
            <button onClick={() => toggle(comp)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', color: t.muted, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>
              {comp}
            </button>
            {openGroups.has(comp) && STORIES.filter(s => s.component === comp).map(s => (
              <button key={s.id} onClick={() => { setActiveId(s.id); setTab('stories') }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 20px', background: activeId === s.id ? (theme === 't27' ? '#111' : '#EEE') : 'none', border: 'none', borderLeft: activeId === s.id ? `2px solid ${t.accent}` : '2px solid transparent', color: activeId === s.id ? t.accent : t.text, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                {s.title.split(' / ').pop()}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderBottom: `1px solid ${t.cardBorder}`, background: theme === 't27' ? '#080808' : '#FFFFFF', flexShrink: 0 }}>
          {(['stories', 'gallery', 'netlist', 'badge-vr'] as Tab[]).map(tabId => (
            <button key={tabId} onClick={() => setTab(tabId)} style={{ padding: '5px 12px', fontSize: '12px', border: `1px solid ${tab === tabId ? t.accent : t.cardBorder}`, background: tab === tabId ? (theme === 't27' ? '#111' : '#EEE') : 'none', color: tab === tabId ? t.accent : t.muted, cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit' }}>
              {tabId === 'badge-vr' ? 'Badge VR' : tabId.charAt(0).toUpperCase() + tabId.slice(1)}
            </button>
          ))}
          <button onClick={() => setTheme(t => t === 't27' ? 'paper' : 't27')} style={{ marginLeft: 'auto', padding: '5px 14px', fontSize: '12px', border: `1px solid ${t.accent}`, background: 'none', color: t.accent, cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit', fontWeight: 600 }}>
            {theme === 't27' ? '◑ TH_T27 (Dark)' : '◐ TH_PAPER (Light)'}
          </button>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '40px 32px', background: t.bg }}>
          {tab === 'stories' && (
            <div>
              <div style={{ color: t.text, fontSize: '13px', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.04em' }}>{story.title}</div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: t.muted, marginBottom: '8px', flexWrap: 'wrap', fontFamily: 'monospace' }}>
                <span>id: {story.id}</span>
                <span>component: {story.component}</span>
                <span>theme: TH_{theme.toUpperCase()}</span>
                <span>state: {story.title.split(' / ').pop()}</span>
              </div>
              <div style={{ color: t.muted, fontSize: '11px', marginBottom: '24px', fontFamily: 'monospace' }}>
                spec: <a href={`https://github.com/Trinity-S-AI-DNA/t27/blob/master/${story.specPath}`} style={{ color: t.accent, textDecoration: 'none' }} target="_blank" rel="noreferrer">{story.specPath} ↗</a>
                {story.pngPath && <> · <a href={`https://t27.ai/uikit/${story.pngPath.replace('t0', theme === 't27' ? 't0' : 't1')}`} style={{ color: t.accent, textDecoration: 'none' }} target="_blank" rel="noreferrer">PNG ↗</a></>}
              </div>
              <div id="uikit-canvas" style={{ padding: '32px', border: `1px solid ${t.border}`, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '200px', minHeight: '80px', background: theme === 't27' ? '#050505' : '#FEFEFE' }}>
                {story.render(theme)}
              </div>
              {story.interactions && <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.muted }}>Steps</span>
                  <button onClick={runSteps} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${t.cardBorder}`, background: 'none', color: t.text, cursor: 'pointer', fontFamily: 'inherit' }}>▶ Run</button>
                </div>
                {story.interactions.map((s, i) => <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', marginBottom: '4px', fontFamily: 'monospace' }}><span style={{ color: stepResults[i]?.pass === true ? '#00C853' : stepResults[i] ? '#FF1744' : t.muted }}>{stepResults[i] ? (stepResults[i].pass ? '✓' : '✗') : '○'}</span><span>{s.action}</span><span style={{ color: t.muted }}>{stepResults[i]?.msg ?? s.expect}</span></div>)}
              </div>}
            </div>
          )}
          {tab === 'gallery' && (
            <div style={{ maxWidth: '900px' }}>
              <div style={{ color: t.text, fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>All stories — M0 overview</div>
              <img src="https://t27.ai/uikit/gallery/overview.png" alt="All stories overview" style={{ maxWidth: '100%', border: `1px solid ${t.cardBorder}`, borderRadius: '4px' }} />
            </div>
          )}
          {tab === 'netlist' && (
            <div>
              <div style={{ color: t.text, fontWeight: 700, fontSize: '16px', marginBottom: '24px' }}>Netlist card — live render</div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
                {[1,2,3].map(i => <UiNetlistCard key={i} theme={theme} />)}
              </div>
              <div style={{ color: t.text, fontWeight: 700, fontSize: '14px', marginBottom: '12px', marginTop: '8px' }}>PNG evidence (nc11 run)</div>
              <img src="https://t27.ai/uikit/netlist/gallery-t0.png" alt="Netlist cards light" style={{ maxWidth: '100%', border: `1px solid ${t.cardBorder}`, marginBottom: '12px', display: 'block' }} />
              <img src="https://t27.ai/uikit/netlist/gallery-t1.png" alt="Netlist cards dark" style={{ maxWidth: '100%', border: `1px solid ${t.cardBorder}` }} />
            </div>
          )}
          {tab === 'badge-vr' && (
            <div>
              <div style={{ color: t.text, fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>Badge fix — before / after (iteration 3)</div>
              <div style={{ color: t.muted, fontSize: '12px', fontFamily: 'monospace', marginBottom: '20px' }}>Closes gHashTag/t27#13677 — badge fill sized to label; pen_min clamped at card inset</div>
              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {(['primary','secondary','ghost','success','warn'] as BadgeVariant[]).map(v => (
                  <div key={v} style={{ textAlign: 'center' }}>
                    <UiBadge theme={theme} variant={v} />
                    <div style={{ color: t.muted, fontSize: '11px', marginTop: '6px' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ color: t.text, fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>PNG diff evidence</div>
              <img src="https://t27.ai/uikit/gallery/before_after_badges.png" alt="Badge before/after" style={{ maxWidth: '100%', border: `1px solid ${t.cardBorder}` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
