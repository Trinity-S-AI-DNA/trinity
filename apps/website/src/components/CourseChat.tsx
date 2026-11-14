import { useState } from 'react'
import { LADDER } from '../lib/courseLadder.generated'
import * as G from '../lib/courseChat.gen'

// The helper chat beside a course (trinity#1813). The words, the numbers, the limits and the
// styles are specs/chat/course-chat.t27, through src/lib/courseChat.gen.ts; the branching below
// mirrors that spec's client_reason and offline_text. Nothing is stored: the lines live in state.

type Line = { who: 'you' | 'bot' | 'off'; text: string }
type Props = { course: string; lesson?: string; title?: string; ckey?: string }

const offlineText = (r: number) => (r === G.REASON_LIMIT ? G.CHAT_OFFLINE_LIMIT : r === G.REASON_BAD_REQUEST ? G.CHAT_OFFLINE_BAD : G.CHAT_OFFLINE)
const clientReason = (reached: boolean, timedOut: boolean, status: number, len: number) =>
  !reached ? G.REASON_UNREACHABLE : timedOut ? G.REASON_TIMEOUT : status === 429 ? G.REASON_LIMIT : status !== 200 ? G.REASON_STATUS : len === 0 ? G.REASON_EMPTY : G.REASON_NONE

async function ask(p: Props, message: string): Promise<{ reason: number; answer: string }> {
  const ctl = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; ctl.abort() }, G.CHAT_TIMEOUT_MS)
  try {
    const r = await fetch(LADDER.renderBase + G.CHAT_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: ctl.signal,
      body: JSON.stringify({ course: p.course, lesson: p.lesson ?? '', title: (p.title ?? '').slice(0, G.CHAT_TITLE_MAX), message, key: p.ckey }),
    })
    const body = r.status === 200 ? await r.json().catch(() => null) : null
    const answer = typeof body?.answer === 'string' ? body.answer.slice(0, G.CHAT_ANSWER_MAX) : ''
    return { reason: clientReason(true, timedOut, r.status, answer.length), answer }
  } catch {
    return { reason: clientReason(timedOut, timedOut, 0, 0), answer: '' }
  } finally {
    clearTimeout(timer)
  }
}

export default function CourseChat(p: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  if (!(G.CHAT_COURSES as readonly string[]).includes(p.course)) return null
  const send = async () => {
    const message = text.trim()
    if (busy || message.length < 1 || message.length > G.CHAT_MSG_MAX) return
    setText('')
    setBusy(true)
    setLines((l) => [...l, { who: 'you', text: message }])
    const { reason, answer } = await ask(p, message)
    setLines((l) => [...l, reason === G.REASON_NONE ? { who: 'bot', text: answer } : { who: 'off', text: offlineText(reason) }])
    setBusy(false)
  }
  return (
    <>
      <style>{G.CHAT_CSS + G.CHAT_CSS_SHEET}</style>
      <aside className={open ? 'cc is-open' : 'cc'} aria-label={G.CHAT_TITLE}>
        <div className="cc-head">
          <h2 className="cc-title">{G.CHAT_TITLE}</h2>
          <button type="button" className="cc-x" onClick={() => setOpen(false)}>{G.CHAT_CLOSE}</button>
        </div>
        <p className="cc-hint">{G.CHAT_HINT}</p>
        <div className="cc-log" role="log" aria-live="polite">
          {lines.map((l, i) => <p key={i} className={l.who === 'you' ? 'cc-m cc-you' : l.who === 'off' ? 'cc-m cc-off' : 'cc-m'}>{l.text}</p>)}
          {busy ? <p className="cc-m cc-off">{G.CHAT_WORKING}</p> : null}
        </div>
        <form className="cc-form" onSubmit={(e) => { e.preventDefault(); void send() }}>
          <textarea className="cc-in" value={text} maxLength={G.CHAT_MSG_MAX} placeholder={G.CHAT_PLACEHOLDER} aria-label={G.CHAT_PLACEHOLDER} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} />
          <button type="submit" className="cc-go" disabled={busy || text.trim().length < 1}>{G.CHAT_SEND}</button>
        </form>
      </aside>
      <button type="button" className="cc-open" onClick={() => setOpen(true)}>{G.CHAT_OPEN}</button>
    </>
  )
}
