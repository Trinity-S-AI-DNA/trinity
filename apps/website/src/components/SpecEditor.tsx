// Always-editable source view that keeps syntax highlighting.
//
// A textarea cannot render colour, and a contenteditable cannot be trusted to
// hand the compiler back exactly what was typed. So: a transparent textarea
// sits on top of a highlighted layer, the two share identical metrics, and
// their scroll positions are kept in step. You type into the textarea, you see
// the highlighted layer, and the compiler receives the textarea's raw value.
//
// The metrics MUST match exactly -- same font, size, line-height, padding,
// letter-spacing, tab-size, and both wrapping the same way. Any drift shows up
// as the caret drifting away from the glyphs, which is worse than no colour.

import { memo, useCallback, useLayoutEffect, useRef } from 'react'
import { CLS_COLOR, type Span } from '../lib/highlight'

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

/** Every metric that has to be identical between the two layers. */
const SHARED: React.CSSProperties = {
  margin: 0,
  border: 'none',
  fontFamily: MONO,
  fontSize: 12.5,
  lineHeight: 1.65,
  letterSpacing: 'normal',
  tabSize: 4,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  padding: '10px 14px',
}

interface Props {
  value: string
  onChange: (v: string) => void
  /** Highlighted spans for `value`, one array per line. */
  lines: Span[][]
  onRun: () => void
  ariaLabel: string
  /** Select lines `from`-`to` (1-based) and scroll them into view; `seq` re-fires the same range. */
  reveal?: { from: number; to: number; seq: number } | null
}

function SpecEditorImpl({ value, onChange, lines, onRun, ariaLabel, reveal }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  // Scroll the highlight layer to wherever the textarea is. useLayoutEffect so
  // it happens before paint and the layers never appear separated.
  const sync = useCallback(() => {
    const ta = taRef.current
    const pre = preRef.current
    if (!ta || !pre) return
    pre.scrollTop = ta.scrollTop
    pre.scrollLeft = ta.scrollLeft
  }, [])

  useLayoutEffect(sync, [value, sync])

  // The highlight layer wraps exactly as the textarea does, so a line's top in it is the line's top in both:
  // no line-height arithmetic, which wrapped lines would break.
  useLayoutEffect(() => {
    const ta = taRef.current
    const first = preRef.current?.children[(reveal?.from ?? 0) - 1] as HTMLElement | undefined
    if (!reveal || !ta || !first) return
    // The textarea holds LF only, so a CRLF spec counts one character per line break.
    const rows = value.split(/\r?\n/)
    const start = rows.slice(0, reveal.from - 1).reduce((n, r) => n + r.length + 1, 0)
    const end = rows.slice(0, reveal.to).reduce((n, r) => n + r.length + 1, 0) - 1
    ta.focus({ preventScroll: true })
    ta.setSelectionRange(start, Math.max(start, end))
    ta.scrollTop = Math.max(0, first.offsetTop - 40)
    sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run for a new request, not for every keystroke
  }, [reveal?.seq])

  return (
    // data-lang-exempt: this renders .t27 source verbatim, in whatever
    // language its author wrote. The RU audit skips marked subtrees.
    <div data-lang-exempt="source" style={{ position: 'relative', minHeight: 'calc(100dvh - 330px)', display: 'flex' }}>
      {/* The colour. aria-hidden: the textarea already carries the text for
          assistive tech, and announcing it twice would be worse than silent. */}
      <pre
        ref={preRef}
        aria-hidden="true"
        style={{
          ...SHARED,
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          color: CLS_COLOR.plain,
        }}
      >
        {lines.map((spans, i) => (
          <span key={i}>
            {spans.length === 0 ? '\n' : null}
            {spans.map((s, j) => (
              <span key={j} style={{ color: CLS_COLOR[s.cls] }}>
                {s.text}
              </span>
            ))}
            {'\n'}
          </span>
        ))}
      </pre>

      {/* The caret and the real value. Text is transparent so the layer below
          shows through; caret-color keeps the cursor visible. */}
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={sync}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            onRun()
          }
        }}
        spellCheck={false}
        aria-label={ariaLabel}
        style={{
          ...SHARED,
          position: 'relative',
          flex: 1,
          minWidth: 0,
          resize: 'none',
          background: 'transparent',
          color: 'transparent',
          caretColor: '#00FF88',
          outline: 'none',
          overflow: 'auto',
        }}
      />
    </div>
  )
}

export const SpecEditor = memo(SpecEditorImpl)
