// gatle/rule.js -- the rules of Gatle, as pure functions. tool.js plays with them in the reader's
// browser; scripts/widget-data/gatle.mjs imports this same file in node and checks it against the
// fixed answers in specs/widgets/gatle.t27 (two dates, the 10% boundary), so the page cannot
// drift from the spec without the data script failing. No words live here: callers pass them in.

export const DAY_MS = 86400000

/** Whole UTC days since 1970-01-01 for a time in milliseconds. */
export const dayNumber = (ms) => Math.floor(ms / DAY_MS)

/** The puzzle a UTC day gets: days since the epoch, modulo the pool size (never negative). */
export const dayIndex = (day, epochDay, size) => (((day - epochDay) % size) + size) % size

/** The running number a day's puzzle is shared under: the epoch day is #1. */
export const puzzleNumber = (day, epochDay) => day - epochDay + 1

/**
 * One guess against the true count. heat: "close" within closePct percent of the truth (the
 * boundary counts as close), "warm" within warmPct, otherwise "cold". dir: "hit" when close,
 * else "up" (the truth is higher) or "down". Integer arithmetic only, as in the spec's tests.
 */
export function grade(guess, truth, closePct, warmPct) {
  const off = Math.abs(guess - truth) * 100
  const heat = off <= truth * closePct ? 'close' : off <= truth * warmPct ? 'warm' : 'cold'
  return { heat, dir: heat === 'close' ? 'hit' : truth > guess ? 'up' : 'down' }
}

/**
 * The game's state lives in the URL hash only: "#d=<day>&g=<g1>.<g2>" for a daily puzzle,
 * "#p=<index>&g=..." for practice. Anything unreadable is ignored, never thrown.
 */
export function parseHash(hash, maxGuesses, maxValue) {
  const q = new URLSearchParams(String(hash || '').replace(/^#/, ''))
  const int = (s) => (/^\d{1,7}$/.test(s ?? '') ? Number(s) : null)
  const guesses = (q.get('g') || '').split('.').map(int).filter((n) => n != null && n <= maxValue).slice(0, maxGuesses)
  const practice = int(q.get('p'))
  const day = int(q.get('d'))
  return { practice, day, guesses }
}

export function formatHash({ practice, day, guesses }) {
  const head = practice != null ? `p=${practice}` : `d=${day}`
  return `#${head}${guesses.length ? `&g=${guesses.join('.')}` : ''}`
}

/** The emoji line of one graded guess: a heat square, then an arrow unless it was a hit. */
export function emojiRow(g, heatCodes, dirCodes, selector) {
  const heat = String.fromCodePoint(heatCodes[['close', 'warm', 'cold'].indexOf(g.heat)])
  if (g.dir === 'hit') return heat
  return heat + String.fromCodePoint(dirCodes[g.dir === 'up' ? 0 : 1], selector)
}
