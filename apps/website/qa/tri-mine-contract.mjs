// MINE TRI on the landing: src/lib/triMine.ts and components/TriMineBlock.tsx.
//
// Pure, no browser. Holds the "Copy to agent" prompt and the block to:
//   1  the prompt carries the token's honest status in both languages:
//      testnet only, no price and no market, NOT trustless, no mainnet TRI
//   2  it names who earns (the spec author by GitHub login, with the creator's
//      bees under that same login) and that lanes never earn (owner,
//      2026-10-10: only .t27 spec creators and their bees count), plus the
//      guard rails: the human says yes before a PR, no provider key in a PR
//      or a chat, no invented acceptance
//   3  a live rate is quoted with "the ledger states it"; a missing, zero,
//      negative or NaN rate is never printed and the agent is sent to the
//      ledger address instead; the same for minted and cap
//   4  the English prompt has no Cyrillic, and both languages carry the same
//      set of addresses
//   5  the block reads its figures (readMinterState, readTriCounts + boardOf:
//      the token tab's own reads and count) rather than typing them, passes the
//      real ledger and minter, and App.tsx mounts it right after PlayBlock
//   6  DRY (owner, 2026-10-03): what TRI is, who earns, the status and the
//      rate check are the token tab's, quoted, never restated; how to withdraw
//      is pointed at, not copied; the rate is gated once, at readTriCounts, so
//      the landing card cannot print a rate the tab refuses
//   7  consent: the step that acts for the person (the pull request) waits for
//      their "yes", and withdrawing stays the person's; running hardware is
//      the person's own business, not a step of this prompt
//
//   node --experimental-strip-types qa/tri-mine-contract.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MINE_LINKS, minePrompt } from '../src/lib/triMine.ts'
import { TOKEN_COPY } from '../src/lib/triTokenCopy.ts'

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')
let checks = 0
const ok = (value, message) => { checks++; assert.ok(value, message) }

const ROADS = {
  ledger: 'https://queen.example/queen/public-earnings',
  minter: 'https://testnet.tonviewer.com/kQ-minter',
  network: 'testnet',
}
const LIVE = { triPerSpec: 27, minted: '1,234', cap: '10,460,353,203' }

const en = minePrompt('en', ROADS, LIVE)
const ru = minePrompt('ru', ROADS, LIVE)

// 1  honest status
for (const [name, p] of [['en', en], ['ru', ru]]) {
  ok(p.includes('TON testnet'), `${name}: says TON testnet`)
  ok(/NOT trustless|НЕ trustless/.test(p), `${name}: says NOT trustless`)
  ok(/no price|цены нет|нет цены/i.test(p), `${name}: says there is no price`)
  ok(/No mainnet TRI exists|Mainnet TRI не существует/.test(p), `${name}: says no mainnet TRI exists`)
  ok(!/\btrustless\b/i.test(p.replace(/NOT trustless|НЕ trustless/g, '')), `${name}: never claims trustless`)
  ok(!/invest|profit|прибыл|инвест/i.test(p), `${name}: no investment language`)
}

// 2  who earns, and the guard rails
ok(/GitHub login/.test(en) && /логину GitHub/.test(ru), 'names the GitHub login as the one that earns')
ok(/bees/.test(en) && /пчёлы/.test(ru), 'names the bees, under the creator\'s login (quoted from the rule)')
ok(/Lanes are not counted/.test(en) && /Полосы не считаются/.test(ru), 'says lanes are not counted (owner, 2026-10-10)')
ok(/Only after my "yes"/.test(en) && /после моего «да»/.test(ru), 'the human says yes before a PR')
ok(/Never put a provider key/.test(en) && /Никогда не вставляй ключ провайдера/.test(ru), 'no provider key in a PR or chat')
ok(/Do not invent an acceptance/.test(en) && /Не выдумывай приёмку/.test(ru), 'no invented acceptance')
ok(/## Boundary/.test(en) && /## Boundary/.test(ru), 'the issue must declare a .t27 file in its boundary')
const steps = (p) => p.split('\n').filter((l) => /^\d+\. /.test(l))
assert.equal(steps(en).length, 6, 'the prompt is six steps: the runner road is gone (owner, 2026-10-10)'); checks++
ok(!/proof of compute|my own hardware|my hardware/.test(en + ru), 'no lane-earning road left in the prompt')

// 3  live figures, and their absence
ok(en.includes(TOKEN_COPY.en.rate(27)), 'en quotes the live rate in the token tab’s words')
ok(ru.includes(TOKEN_COPY.ru.rate(27)), 'ru quotes the live rate in the token tab’s words')
ok(en.includes('1,234 TRI minted of a 10,460,353,203 cap.'), 'en quotes minted and cap')
for (const bad of [undefined, 0, -3, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  for (const lang of ['en', 'ru']) {
    const p = minePrompt(lang, ROADS, { triPerSpec: bad })
    ok(p.includes(`${ROADS.ledger} (`), `${lang}: rate ${bad} sends the agent to the ledger`)
    ok(!/\d+ TRI (per|за)/.test(p), `${lang}: rate ${bad} is not printed`)
    ok(p.includes(ROADS.minter), `${lang}: no minted/cap sends the agent to the minter`)
  }
}
ok(minePrompt('en', ROADS, { minted: '5' }).includes(ROADS.minter), 'minted without cap is not half-printed')

// 4  language and addresses
ok(!/[Ѐ-ӿ]/.test(en), 'the English prompt has no Cyrillic')
const urls = (p) => new Set(p.match(/https:\/\/[^\s),]+/g))
assert.deepEqual([...urls(ru)].sort(), [...urls(en)].sort(), 'both languages carry the same addresses'); checks++
for (const [k, v] of Object.entries(MINE_LINKS)) ok(v.startsWith('https://'), `MINE_LINKS.${k} is https`)
for (const v of Object.values(MINE_LINKS)) ok(en.includes(v), `the prompt carries ${v}`)

// 5  the block and its mount
const block = read('src/components/TriMineBlock.tsx')
ok(/readMinterState\(/.test(block) && /readTriCounts\(/.test(block), 'the block reads the minter and the token tab’s counts')
ok(/boardOf\(counts\)/.test(block) && !/readEarnings|\be\.earners\b/.test(block), 'earners are the token tab’s rows, not the ledger’s')
ok(/ledger: `\$\{QUEEN_API\}\/queen\/public-earnings`/.test(block), 'the block passes the real ledger address')
ok(/minter: TRI_EXPLORER/.test(block) && /network: TRI_NETWORK/.test(block), 'the block passes the real minter and network')
ok(/minePrompt\(key, ROADS, facts\)/.test(block), 'the copied prompt is built from what was read')
ok(!/\b27\b/.test(block), 'the block types no rate in by hand')
ok(/\{tc\.status\}/.test(block) && /\{tc\.lead\} \{tc\.rule\}/.test(block), 'the block shows the token tab’s lead, rule and status')
ok(!/status:|lede:/.test(block), 'the block types no status or lede of its own')
ok(/Copy to agent/.test(block) && /Скопировать агенту/.test(block), 'the button is named in both languages')
ok(/<pre>\{prompt\}<\/pre>/.test(block), 'the prompt is readable and selectable on the page')
ok(/setCopyState\('failed'\)/.test(block), 'a refused clipboard is said, not swallowed')
const app = read('src/App.tsx')
ok(/import TriMineBlock from '\.\/components\/TriMineBlock'/.test(app), 'App.tsx imports the block')
const play = app.indexOf('<PlayBlock />')
const mine = app.indexOf('<TriMineBlock />')
ok(play > 0 && mine > play && app.indexOf('<FaqBlock />') > mine, 'the block sits after PlayBlock and before the FAQ')

// 6  one home per rule
for (const lang of ['en', 'ru']) {
  const p = lang === 'en' ? en : ru
  ok(p.includes(TOKEN_COPY[lang].rule), `${lang}: the prompt quotes who earns from TOKEN_COPY`)
  ok(p.includes(TOKEN_COPY[lang].status), `${lang}: the prompt quotes the status from TOKEN_COPY`)
}
for (const lang of ['en', 'ru']) {
  const p = lang === 'en' ? en : ru
  ok(p.includes(TOKEN_COPY[lang].lead), `${lang}: the prompt quotes what TRI is from TOKEN_COPY`)
  ok(!p.includes(TOKEN_COPY[lang].withdraw), `${lang}: the prompt points at withdrawing, it does not copy it`)
}
ok(!/signs the mint|pays the gas|подписывает|платит газ/.test(en + ru), 'the prompt does not restate how a mint is signed')
const mineLib = read('src/lib/triMine.ts')
ok(/import \{ validRate \} from '\.\/triBoard\.ts'/.test(mineLib) && /validRate\(f\.triPerSpec\)/.test(mineLib), 'the prompt’s rate check is validRate')
ok(!/Number\.isFinite|NOT trustless|НЕ trustless|proof of compute|CPU, FPGA|pre-mine|предварительного|Withdraw ->|«Вывести»/.test(mineLib.replace(/^\s*\/\/.*$/gm, '')), 'triMine.ts restates neither the status, who earns, what TRI is nor how to withdraw')
const token = read('src/lib/triToken.ts')
ok(/import \{ triBoard, validRate, type TriBoard \} from '\.\/triBoard'/.test(token) && /return validRate\(rate\) \? rate : null/.test(token), 'readTriCounts gates the rate with validRate, once, for every reader')
ok(!/validRate|isInteger|isFinite|> 0/.test(block), 'the landing card has no rate check of its own to drift')
ok(/setEarners\(boardOf\(counts\)\.rows\.length\)/.test(block), 'earners are exactly the token tab’s rows')

// 7  consent before acting
for (const [lang, p, yes] of [['en', en, /only after my "yes"|Only after my "yes"/], ['ru', ru, /после моего «да»/]]) {
  const step = (n) => p.split('\n').find((l) => l.startsWith(`${n}. `)) ?? ''
  ok(yes.test(step(4)), `${lang}: the pull request waits for the person's yes`)
  ok(/under my GitHub login|под моим логином GitHub/.test(step(5)), `${lang}: the earning lands under the person's login`)
  ok(/mine to do|делаю я сам/.test(step(6)) && step(6).includes(MINE_LINKS.token), `${lang}: withdrawing is the person's, pointed at the token tab`)
  ok(!step(7), `${lang}: there is no seventh step`)
}

console.log(`tri-mine contract: ${checks} checks OK`)
