import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { COURSE, COURSES } from './course.generated'
import { KEY_PARAM, STEP, checkKey, readKeys, readOpened, saveKeys, type Keys, type Opened } from './courseLadder'

// What a course card needs to know about this reader, shared by the catalog (#/courses) and the
// course shelves (components/CourseShelf.tsx).

type CourseT = (typeof COURSES)[number]

function readDone(): string[] {
  try {
    const list = JSON.parse(window.localStorage.getItem(COURSE.progressKey) ?? '[]')
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * What this reader holds: the courses opened, the lessons done, and whether the keys still hold.
 * With takeKey, a key in the address (?unlock=<key>, the bot's button) is checked, kept and taken
 * out of the address, so the lessons a reader finishes here reach the course author (may_report).
 */
export function useLadderView(takeKey = false) {
  const done = useMemo(() => (typeof window === 'undefined' ? [] : readDone()), [])
  const known = useMemo(() => COURSES.map((c) => c.id as string), [])
  const withProgress = useMemo(() => COURSES.filter((c) => c.lessons.some((l) => done.includes(l.id))).map((c) => c.id as string), [done])
  const opened: Opened = useMemo(() => (typeof window === 'undefined' ? [] : readOpened(known, withProgress)), [known, withProgress])
  const [valid, setValid] = useState({ bot: false, paid: false })
  const { search, pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    let live = true
    const fresh = takeKey ? new URLSearchParams(search).get(KEY_PARAM) : null
    void (async () => {
      const held: Keys = { ...readKeys() }
      if (fresh) {
        const r = await checkKey(fresh)
        if (r.ok && (r.step === STEP.bot || r.step === STEP.paid)) {
          if (r.step === STEP.bot) held.bot = fresh
          else held.paid = fresh
          saveKeys(held)
        }
      }
      const [b, p] = await Promise.all([held.bot ? checkKey(held.bot) : { ok: false }, held.paid ? checkKey(held.paid) : { ok: false }])
      if (!live) return
      setValid({ bot: Boolean(b.ok), paid: Boolean(p.ok) })
      if (fresh) navigate(pathname, { replace: true })
    })()
    return () => {
      live = false
    }
    // Once per arrival: a new key in the address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return { done, opened, valid }
}

/**
 * A few courses to go on with, at the foot of a page. The next courses after the one being read
 * come first, so each course page shows different ones; a course not opened yet goes before one
 * already opened, because the shelf is there to show the reader something new.
 */
export function pickShelf(exclude: string | undefined, opened: Opened, limit: number): CourseT[] {
  const at = Math.max(0, COURSES.findIndex((c) => c.id === exclude))
  const ring = [...COURSES.slice(at + 1), ...COURSES.slice(0, at + 1)].filter((c) => c.id !== exclude)
  const isOpened = (c: CourseT) => opened.some((o) => o.id === c.id)
  return [...ring.filter((c) => !isOpened(c)), ...ring.filter(isOpened)].slice(0, limit)
}

