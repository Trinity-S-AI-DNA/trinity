import { useEffect, useRef, useState } from 'react'
import { LADDER } from '../lib/courseLadder.generated'
import * as G from '../lib/courseChat.gen'

// The helper chat beside a course (trinity#1813). The words, the numbers, the limits and the
// styles are specs/chat/course-chat.t27, through src/lib/courseChat.gen.ts; the branching below
// mirrors that spec's client_reason, probe_reason, turn_reason, offline_text, unanswered_text and
// send_plan (the generator lowers declarations, not function bodies). Nothing is stored: the lines
// live in state. When the panel opens it probes the route and goes live by itself, and while it
// shows offline it probes again every CHAT_PROBE_RETRY_MS.
// The reader's message is never dropped (trinity#1824): the box and Send work in every state, and
// send_plan decides what follows the reader's line (send, probe once more, a note, the turn cap).

type Line = { who: 'you' | 'bot' | 'off'; text: string }
type Props = { course: string; lesson?: string; title?: string; ckey?: string }
type Reply = { reached: boolean; timedOut: boolean; status: number; answer: string }

const offlineText = (r: number) =>
  r === G.REASON_LIMIT ? G.CHAT_OFFLINE_LIMIT : r === G.REASON_BUSY ? G.CHAT_OFFLINE_BUSY : r === G.REASON_BAD_REQUEST ? G.CHAT_OFFLINE_BAD : G.CHAT_OFFLINE
const unansweredText = (r: number) =>
  r === G.REASON_LIMIT ? G.CHAT_OFFLINE_LIMIT : r === G.REASON_BAD_REQUEST ? G.CHAT_OFFLINE_BAD : r === G.REASON_BUSY ? G.CHAT_OFFLINE_BUSY : G.CHAT_UNANSWERED
const clientReason = (reached: boolean, timedOut: boolean, status: number, len: number) =>
  !reached ? G.REASON_UNREACHABLE : timedOut ? G.REASON_TIMEOUT : status === 429 ? G.REASON_LIMIT : status === 503 ? G.REASON_BUSY : status !== 200 ? G.REASON_STATUS : len === 0 ? G.REASON_EMPTY : G.REASON_NONE
const probeReason = (r: Reply) => (r.reached && !r.timedOut && r.status === 503 ? G.REASON_OFF : clientReason(r.reached, r.timedOut, r.status, 1))
const turnReason = (turn: number) => (turn >= G.CHAT_TURNS_MAX ? G.REASON_LIMIT : G.REASON_NONE)
const sendPlan = (len: number, up: boolean, flight: boolean, turn: number) =>
  len < 1 || len > G.CHAT_MSG_MAX ? G.ACT_IGNORE : turnReason(turn) !== G.REASON_NONE ? G.ACT_LIMIT : flight ? G.ACT_WAIT : !up ? G.ACT_REPROBE : G.ACT_SEND

async function call(p: Props, extra: Record<string, unknown>): Promise<Reply> {
  const ctl = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; ctl.abort() }, G.CHAT_TIMEOUT_MS)
  try {
    const r = await fetch(LADDER.renderBase + G.CHAT_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: ctl.signal,
      body: JSON.stringify({ course: p.course, lesson: p.lesson ?? '', title: (p.title ?? '').slice(0, G.CHAT_TITLE_MAX), key: p.ckey, ...extra }),
    })
    const body = r.status === 200 ? await r.json().catch(() => null) : null
    const answer = typeof body?.answer === 'string' ? body.answer.slice(0, G.CHAT_ANSWER_MAX) : ''
    return { reached: true, timedOut, status: r.status, answer }
  } catch {
    return { reached: timedOut, timedOut, status: 0, answer: '' }
  } finally {
    clearTimeout(timer)
  }
}

export default function CourseChat(p: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [up, setUp] = useState(false)
  const [why, setWhy] = useState(-1)
  const [wide, setWide] = useState(false)
  const [sent, setSent] = useState(0)
  const flight = useRef(false)
  const allowed = (G.CHAT_COURSES as readonly string[]).includes(p.course)

  useEffect(() => {
    const m = window.matchMedia(`(min-width:${G.CHAT_WIDE_MIN}px)`)
    const on = () => setWide(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    if (!allowed || !(open || wide) || up) return
    let dead = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = async () => {
      const reason = probeReason(await call(p, { probe: true }))
      if (dead) return
      if (reason === G.REASON_NONE) { setWhy(G.REASON_NONE); setUp(true); return }
      setWhy(reason)
      timer = setTimeout(run, G.CHAT_PROBE_RETRY_MS)
    }
    void run()
    return () => { dead = true; if (timer) clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, open, wide, up, p.course])

  if (!allowed) return null
  const capped = turnReason(sent) !== G.REASON_NONE
  const send = async () => {
    const message = text.trim()
    const act = sendPlan(message.length, up, flight.current, sent)
    if (act === G.ACT_IGNORE) return
    setText('')
    setLines((l) => [...l, { who: 'you', text: message }])
    if (act === G.ACT_WAIT) { setLines((l) => [...l, { who: 'off', text: G.CHAT_WAIT_NOTE }]); return }
    if (act === G.ACT_LIMIT) return
    flight.current = true
    if (act === G.ACT_REPROBE) {
      const gone = probeReason(await call(p, { probe: true }))
      if (gone !== G.REASON_NONE) {
        setWhy(gone)
        setLines((l) => [...l, { who: 'off', text: unansweredText(gone) }])
        flight.current = false
        return
      }
      setWhy(G.REASON_NONE)
      setUp(true)
    }
    setBusy(true)
    setSent(sent + 1)
    const r = await call(p, { message, turn: sent })
    const reason = clientReason(r.reached, r.timedOut, r.status, r.answer.length)
    setLines((l) => [...l, reason === G.REASON_NONE ? { who: 'bot', text: r.answer } : { who: 'off', text: unansweredText(reason) }])
    if (reason === G.REASON_UNREACHABLE || reason === G.REASON_TIMEOUT || reason === G.REASON_STATUS) { setWhy(reason); setUp(false) }
    setBusy(false)
    flight.current = false
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
          {!up && why > G.REASON_NONE && lines.length === 0 ? <p className="cc-m cc-off">{offlineText(why)}</p> : null}
          {capped ? <p className="cc-m cc-off">{offlineText(G.REASON_LIMIT)}</p> : null}
        </div>
        <form className="cc-form" onSubmit={(e) => { e.preventDefault(); void send() }}>
          <textarea className="cc-in" value={text} maxLength={G.CHAT_MSG_MAX} placeholder={G.CHAT_PLACEHOLDER} aria-label={G.CHAT_PLACEHOLDER} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} />
          <button type="submit" className="cc-go" disabled={text.trim().length < 1}>{G.CHAT_SEND}</button>
        </form>
      </aside>
      <button type="button" className="cc-open" aria-label={G.CHAT_OPEN} onClick={() => setOpen(true)}>
        <img src={`${import.meta.env.BASE_URL}${G.CHAT_AVATAR}`} alt="" width={G.CHAT_AVATAR_PX} height={G.CHAT_AVATAR_PX} />
      </button>
    </>
  )
}
