// WHO EARNED TRI: src/lib/triBoard.ts, lib/triTokenCopy.ts, QueenToken.tsx.
//
// Owner, 2026-10-03: the tokens are counted by the leaderboard. Owner,
// 2026-10-10: lanes never count -- only .t27 spec creators and their bees
// earn, and the bees work under the creator's login, so the board credits the
// login, not the agent. The lane road this contract used to hold (one lender,
// 595 accepted lane specs) is struck from the count entirely. This contract
// holds the tab to the leaderboard's own units:
//   1  TRI = spec commits by the account x the ledger's rate, one row per
//      GitHub account, the live figures of 2026-10-03 reproduced exactly
//   2  logins merge case-insensitively; an author without a valid login is
//      credited to nobody, by the leaderboard's own rule (loginOf), so the
//      board and the pay cannot disagree about a person
//   6  DRY: one GitHub-login check in src, one read of the spec authors, and
//      triBoard writes no rule of its own -- and no lane anywhere near the sum
//   3  no valid rate (missing, zero, negative, fractional, NaN, Infinity) means
//      no TRI is printed anywhere, and the units still stand
//   4  the copy says where the count comes from, whose bees earn under whose
//      login, that lanes are not counted, and the honest status, in both
//      languages; English has no Cyrillic
//   5  the component reads the leaderboard's source and the minter, ranks
//      with triBoard, and no longer ranks the ledger's earners
//
//   node --experimental-strip-types qa/tri-board-contract.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { triBoard, validRate } from '../src/lib/triBoard.ts'
import { TOKEN_COPY } from '../src/lib/triTokenCopy.ts'

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')
let checks = 0
const eq = (a, b, m) => { checks++; assert.deepEqual(a, b, m) }
const ok = (v, m) => { checks++; assert.ok(v, m) }

// 1  the live counts of 2026-10-03, spec commits only
const AUTHORS = [
  { login: 'gHashTag', commits: 3235 },
  { login: 'mxfill77', commits: 74 },
  { login: 'dmitrii-f-t27', commits: 36 },
  { login: 'Karim13014', commits: 1 },
]
const live = triBoard(AUTHORS, 27, 47)
eq(live.rows.map((r) => [r.login, r.specCommits, r.tri]), [
  ['gHashTag', 3235, 87345],
  ['mxfill77', 74, 1998],
  ['dmitrii-f-t27', 36, 972],
  ['Karim13014', 1, 27],
], 'the leaderboard ranked in TRI: spec commits summed per account')
eq(live.nobody, { specCommits: 47, tri: 1269 }, 'unattributed commits are credited to nobody')
eq(live.total, (3235 + 74 + 36 + 1 + 47) * 27, 'the total is every unit, credited or not')

// 2  who is a row
const merged = triBoard([{ login: 'Dmitrii-F-T27', commits: 2 }, { login: 'dmitrii-f-t27', commits: 3 }], 27)
eq(merged.rows.map((r) => [r.specCommits, r.tri]), [[5, 135]], 'one login, one row, whatever the case')
const stray = triBoard(
  [{ login: 'Claude Code (agent)', commits: 5 }, { login: '-bad-', commits: 7 }],
  27,
)
eq(stray.rows, [], 'no GitHub account, no row')
eq(stray.nobody, { specCommits: 12, tri: 12 * 27 }, 'and every such unit is counted under the list')
eq(triBoard([{ login: 'a', commits: -4 }, { login: 'b', commits: Number.NaN }], 27).rows, [], 'negative or NaN units count as nothing')
eq(triBoard.length, 2, 'lanes are not even a parameter (owner, 2026-10-10)')

// 3  no rate, no TRI
for (const bad of [undefined, null, 0, -27, 2.5, Number.NaN, Number.POSITIVE_INFINITY, '27']) {
  const b = triBoard(AUTHORS, bad, 47)
  ok(!validRate(bad), `rate ${String(bad)} is not a rate`)
  ok(b.rows.every((r) => r.tri === null) && b.nobody.tri === null && b.total === null, `rate ${String(bad)} prints no TRI`)
  eq(b.rows.map((r) => r.specCommits), [3235, 74, 36, 1], `rate ${String(bad)}: the units still stand`)
}

// 4  the words
for (const lang of ['en', 'ru']) {
  const c = TOKEN_COPY[lang]
  ok(c.rate(27).includes('27 TRI'), `${lang}: the rate line quotes the rate it was given`)
  ok(/leaderboard|лидерборд/.test(c.rule), `${lang}: the rule says the count is the leaderboard's`)
  ok(/GitHub/.test(c.rule) && (/bees/.test(c.rule) || /пчёлы/.test(c.rule)), `${lang}: the author's login, and the bees under it`)
  ok(/Lanes are not counted/.test(c.rule) || /Полосы не считаются/.test(c.rule), `${lang}: lanes are struck from the count, in so many words`)
  ok(/NOT trustless|НЕ trustless/.test(c.status) && /testnet/i.test(c.status), `${lang}: testnet only, not trustless`)
  ok(c.total('1', '2').includes('2 TRI'), `${lang}: the total sits next to what the chain minted`)
}
ok(!/[Ѐ-ӿ]/.test(JSON.stringify(Object.values(TOKEN_COPY.en).map((v) => (typeof v === 'function' ? v(1, 2, 3) : v)))), 'English copy has no Cyrillic')

// 5  the component
const tab = read('src/components/QueenToken.tsx')
ok(/boardOf\(/.test(tab), 'the tab ranks with boardOf (triBoard over the read counts)')
ok(!/rankByGithub|\.earners\b/.test(tab), 'the ledger’s earners no longer rank anybody')
ok(/readMinterState\(/.test(tab), 'the tab still reads the minter')
ok(!/\b27\b/.test(tab), 'no rate typed in by hand')
ok(/c\.specCommits\(/.test(tab), 'a row is labelled in spec commits')

// 6  one rule, one home
const { readdirSync } = await import('node:fs')
const srcFiles = readdirSync(new URL('../src', import.meta.url), { recursive: true })
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => `src/${f}`)
const grep = (pattern) => srcFiles.filter((f) => pattern.test(read(f))).sort()
eq(grep(/\{0,38\}/), ['src/lib/githubLogin.ts'], 'the GitHub-login check lives in one file')
eq(grep(/\$\{[^}]+\}\/queen\/public-leaderboard/).filter((f) => !f.includes('QueenRoadmapGame')), ['src/lib/leaderboard.ts'], 'the leaderboard is read in one place')
eq(grep(/fetch\('roadmap\/spec-authors/), ['src/lib/queenPeople.ts'], 'the spec authors are read in one place')
const noComments = (src) => src.replace(/^\s*(\/\/.*|\/\*.*\*\/)\s*$/gm, '')
const boardSrc = read('src/lib/triBoard.ts')
const boardCode = noComments(boardSrc)
ok(/loginOf\(/.test(boardCode), 'triBoard asks the leaderboard whose row is whose')
ok(!/lane/i.test(boardCode), 'no lane anywhere in the counting code (owner, 2026-10-10)')
ok(!/RegExp|\/\^|claimed/.test(boardCode), 'triBoard writes no login rule of its own')
const lb = read('src/components/QueenLeaderboard.tsx')
ok(!/readLeaderboard\(|contributors\.map|lanesTitle|ql-rows/.test(lb), 'the LEADERBOARD tab ranks no lanes: the owner struck LANES out of the top (2026-10-03)')
ok(/<QueenPeople\b/.test(lb), 'the LEADERBOARD tab still shows who wrote the specs')
const token = read('src/lib/triToken.ts')
const tokenCode = noComments(token)
ok(/readTriCounts\(/.test(tab), 'the TOKEN tab reads its counts with readTriCounts')
ok(/readSpecAuthors\(/.test(tokenCode) && /readEarnings\(/.test(tokenCode), 'readTriCounts uses the spec authors and the ledger, for its rate only')
ok(!/lane/i.test(tokenCode), 'the rate road reads no lanes either')
eq(grep(/\btriBoard\(/).filter((f) => f !== 'src/lib/triBoard.ts'), ['src/lib/triToken.ts'], 'triBoard is called in one place: boardOf')
eq(grep(/\breadEarnings\(/).filter((f) => f !== 'src/lib/triToken.ts'), [], 'only triToken.ts reads the ledger, and only for its rate')

console.log(`tri-board contract: ${checks} checks OK`)
