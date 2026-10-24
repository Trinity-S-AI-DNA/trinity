// The courses on t27.ai for this reader: which ones he opened, and the key the bot handed back.
//
// Every rule is gHashTag/t27 specs/automation/course-access.t27 (vendored as
// specs/ladder/course-access.t27) run from its own compiled fn bodies
// (courseAccess.logic.ts); every number is its gen-ts (courseAccess.gen.ts); every word and
// the render's address are specs/ladder/course-ladder.t27 (courseLadder.generated.ts).
// scripts/course-ladder-from-spec.mjs stops the build when a copy drifts from its spec.
// This file only keeps the reader's state in this browser and talks to the render.
//
// Since rules VERSION 3 (owner, 2026-10-19: every course free) step_of is FREE for every rung,
// so nothing here locks, gates or sells a course.
import * as RULES from './courseAccess.gen'
import { mayOpen, mayReport, staysOpen, stepOf } from './courseAccess.logic'
import { LADDER } from './courseLadder.generated'

/** The courses this reader opened, in the order they were opened, with the rung each took. */
export type Opened = { id: string; step: number }[]
/** The keys the bot handed back: one per step that needs proof. */
export type Keys = { bot?: string; paid?: string }
export type KeyCheck = { ok: boolean; step?: number; until?: string; reason?: string }

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },
  set(key: string, value: unknown) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // private mode: the list lives as long as the tab
    }
  },
}

// t27-plumbing: step_of takes a u8, and its door throws above this rather than wrap.
const rungOf = (at: number) => Math.min(at, 255)

/**
 * The opened courses. A reader who studied before the ladder existed keeps every course they
 * has progress in, open on a free rung: the ladder must not lock anybody out of their own work.
 */
export function readOpened(known: readonly string[], withProgress: readonly string[]): Opened {
  const stored = store.get<Opened | null>(LADDER.openKey, null)
  if (Array.isArray(stored)) {
    return stored.filter((o) => o && typeof o.id === 'string' && known.includes(o.id) && Number.isInteger(o.step))
  }
  const seeded = withProgress.filter((id) => known.includes(id)).map((id) => ({ id, step: RULES.STEP_FREE }))
  if (seeded.length) store.set(LADDER.openKey, seeded)
  return seeded
}

export function readKeys(): Keys {
  const k = store.get<Keys>(LADDER.keysKey, {})
  return { bot: typeof k.bot === 'string' ? k.bot : undefined, paid: typeof k.paid === 'string' ? k.paid : undefined }
}

export function saveKeys(keys: Keys) {
  store.set(LADDER.keysKey, keys)
}

/**
 * Where this course stands for this reader: open, and on which rung.
 *
 * RE-RUNGING. A course stored under rules VERSION 2 kept the step it was opened on, and a
 * stored PAID step judged by stays_open would close when the reader's club ended. The rules
 * leave that to the host (VERSION 3: "a host that must keep it open re-rungs it with
 * step_of"), so the step of a stored course is the rules' own step_of for its rung, never the
 * step stored with it: FREE today, and whatever step_of says if the rules change again.
 */
export function courseState(id: string, opened: Opened, valid: { bot: boolean; paid: boolean }) {
  const at = opened.findIndex((o) => o.id === id)
  if (at >= 0) {
    const step = stepOf(rungOf(at))
    return { known: true, open: staysOpen(step, valid.paid), rung: at + 1, step }
  }
  const step = stepOf(rungOf(opened.length))
  return { known: false, open: mayOpen(step, valid.bot, valid.paid), rung: opened.length + 1, step }
}

/** The opened list with this course added, when its step allows; unchanged otherwise. */
export function openCourse(id: string, opened: Opened, valid: { bot: boolean; paid: boolean }): Opened {
  if (opened.some((o) => o.id === id)) return opened
  const step = stepOf(rungOf(opened.length))
  if (!mayOpen(step, valid.bot, valid.paid)) return opened
  const next = [...opened, { id, step }]
  store.set(LADDER.openKey, next)
  return next
}

export async function checkKey(k: string): Promise<KeyCheck> {
  try {
    const r = await fetch(`${LADDER.renderBase}/api/course/key?k=${encodeURIComponent(k)}`, { credentials: 'omit' })
    const body = (await r.json()) as KeyCheck
    return body && typeof body.ok === 'boolean' ? body : { ok: false, reason: 'unreadable' }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}

/** A finished lesson, sent with the reader's key -- and never without one (may_report). */
export async function reportDone(key: string | undefined, course: string, lesson: string): Promise<void> {
  if (!mayReport(Boolean(key))) return
  try {
    await fetch(`${LADDER.renderBase}/api/course/progress`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, course, lesson }),
    })
  } catch {
    // The mark is kept in this browser; the author simply hears of it later, or not.
  }
}

export const KEY_PARAM = RULES.KEY_PARAM
export const STEP = { free: RULES.STEP_FREE, bot: RULES.STEP_BOT, paid: RULES.STEP_PAID } as const
