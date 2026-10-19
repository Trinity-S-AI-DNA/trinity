import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SITE, loadCompiler } from './agents-from-specs.mjs'
import { TS_OUT, ladderProblems, readInputs, renderTs } from './course-ladder-from-spec.mjs'

const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))
const inputs = readInputs()
const run = (over = {}) => ladderProblems({ ...inputs, analyze, ...over })
const fails = (over, needle) => {
  const { problems, out } = run(over)
  assert.ok(problems.some((p) => p.includes(needle)), `expected a problem naming ${needle}, got:\n${problems.join('\n')}`)
  assert.equal(out, null)
}
const replaced = (text, from, to) => {
  assert.ok(text.includes(from), `the mutation target is gone: ${from}`)
  return text.replace(from, to)
}

test('the committed ladder builds clean and the generated file is current', () => {
  const { problems, out } = run()
  assert.deepEqual(problems, [])
  assert.equal(readFileSync(join(SITE, TS_OUT), 'utf8'), renderTs(out))
  assert.deepEqual(Object.keys(out.say.en), Object.keys(out.say.ru))
})

test('a rule changed in the spec without rebuilding the logic stops the build', () => {
  fails({ rulesText: replaced(inputs.rulesText, 'pub const LADDER_RUNGS : u8 = 1;', 'pub const LADDER_RUNGS : u8 = 2;') }, 'built from another version')
})

test('a number edited in gen.ts without the spec stops the build', () => {
  fails({ genText: replaced(inputs.genText, 'export const STEP_PAID = 2 satisfies number;', 'export const STEP_PAID = 3 satisfies number;') }, 'STEP_PAID is 3')
})

test('a Russian word missing, extra, or with another placeholder stops the build', () => {
  const ru = JSON.parse(inputs.ruText)
  const { SAY_CLAW_FREE_PRESS, ...noPress } = ru
  void SAY_CLAW_FREE_PRESS
  fails({ ruText: JSON.stringify(noPress) }, 'SAY_CLAW_FREE_PRESS is missing')
  fails({ ruText: JSON.stringify({ ...ru, SAY_EXTRA: 'x' }) }, 'SAY_EXTRA is not a word')
  fails({ ruText: JSON.stringify({ ...ru, SAY_LESSONS: 'уроков' }) }, 'SAY_LESSONS keeps other numbers')
})

test('Russian in the English spec stops the build', () => {
  fails({ wordsText: replaced(inputs.wordsText, '"See the courses"', '"Смотреть курсы"') }, 'Cyrillic')
})

test('every course is free: the words say so and no gate word is left', () => {
  const { out } = run()
  assert.match(out.say.en.LADDER, /Every course is free/)
  for (const gone of ['PAID_TITLE', 'PAY_PRESS', 'TON_PRESS', 'FREE_LEFT', 'BADGE_CLUB', 'SIGN_IN', 'CLUB_LINE']) assert.ok(!(gone in out.say.en), `${gone} is still a word`)
  assert.doesNotMatch(inputs.wordsText, /\b(the only|the first|best|fastest)\b/i, 'no superlative')
})

test('TRI CLAW: the key screen and the club open inside Telegram, with the rules bot', () => {
  const { out } = run()
  assert.equal(out.claw.keys, 'https://t.me/t27ai_bot?start=app_keys')
  assert.equal(out.claw.club, 'https://t.me/t27ai_bot?start=app_club')
  // The handle is the rules' BOT, vendored byte for byte: edited here alone, the build stops.
  const moved = run({ rulesText: replaced(inputs.rulesText, 'pub const BOT : str = "t27ai_bot";', 'pub const BOT : str = "other_bot";') })
  assert.ok(moved.problems.some((p) => p.includes('built from another version')))
  fails({ wordsText: replaced(inputs.wordsText, 'pub const CLAW_KEYS_ROUTE : str = "keys";', 'pub const CLAW_KEYS_ROUTE : str = "Keys!";') }, 'CLAW_KEYS_ROUTE is not an app route')
})

test('TRI CLAW: the App is linked only once it is called public; until then, the post', () => {
  const { out } = run()
  assert.equal(out.claw.githubIsApp, false)
  assert.equal(out.claw.github, 'https://t27.ai/blog/tri-claw-an-agent-you-can-audit/')
  assert.ok('CLAW_POST_PRESS' in out.say.en && !('CLAW_APP_PRESS' in out.say.en))
  // The owner flips one constant; its own spec test says the claim is not made yet, so the build
  // stops until that test is changed with it.
  fails({ wordsText: replaced(inputs.wordsText, 'pub const CLAW_APP_PUBLIC : bool = false;', 'pub const CLAW_APP_PUBLIC : bool = true;') }, 'the_app_is_not_called_open_until_it_is')
  const flipped = replaced(replaced(inputs.wordsText, 'pub const CLAW_APP_PUBLIC : bool = false;', 'pub const CLAW_APP_PUBLIC : bool = true;'), 'assert CLAW_APP_PUBLIC == false;', 'assert CLAW_APP_PUBLIC == true;')
  const open = run({ wordsText: flipped })
  assert.deepEqual(open.problems, [])
  assert.equal(open.out.claw.github, 'https://github.com/apps/tri-claw')
  assert.ok('CLAW_APP_PRESS' in open.out.say.en && !('CLAW_POST_PRESS' in open.out.say.en))
  fails({ postExists: () => false }, 'which is not a post')
  fails({ wordsText: replaced(inputs.wordsText, '"https://github.com/apps/tri-claw";', '"https://example.com/tri-claw";') }, 'CLAW_APP_URL')
})

// The host: src/lib/courseLadder.ts, bundled as the site bundles it, over a browser store.
const { build } = await import('esbuild')
async function host(stored) {
  const mem = new Map(stored ? [['t27-course-open', JSON.stringify(stored)]] : [])
  globalThis.window = { localStorage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) } }
  const r = await build({ entryPoints: [join(SITE, 'src/lib/courseLadder.ts')], bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent' })
  return { mod: await import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`), mem }
}

test('a course stored on a paid rung under VERSION 2 stays open when the club ends (re-runged by step_of)', async () => {
  const { mod } = await host([{ id: 'a', step: 0 }, { id: 'b', step: 0 }, { id: 'c', step: 0 }, { id: 'd', step: 2 }])
  const opened = mod.readOpened(['a', 'b', 'c', 'd', 'e'], [])
  const noClub = { bot: false, paid: false }
  const d = mod.courseState('d', opened, noClub)
  assert.equal(d.known, true)
  assert.equal(d.step, mod.STEP.free, 'the stored PAID step is not the step')
  assert.equal(d.open, true)
  // What the stored step alone would have said: closed. The re-rung is what keeps it.
  const logic = await import(`data:text/javascript;base64,${Buffer.from((await build({ entryPoints: [join(SITE, 'src/lib/courseAccess.logic.ts')], bundle: true, write: false, format: 'esm', platform: 'neutral', logLevel: 'silent' })).outputFiles[0].text).toString('base64')}`)
  assert.equal(logic.staysOpen(mod.STEP.paid, false), false)
})

test('every course opens, for every reader, however many he opened', async () => {
  const { mod } = await host(null)
  const ids = Array.from({ length: 30 }, (_, i) => `c${i}`)
  let opened = mod.readOpened(ids, [])
  for (const id of ids) {
    const s = mod.courseState(id, opened, { bot: false, paid: false })
    assert.equal(s.open, true, `${id} is not open on rung ${s.rung}`)
    opened = mod.openCourse(id, opened, { bot: false, paid: false })
  }
  assert.equal(opened.length, ids.length)
  assert.ok(opened.every((o) => o.step === mod.STEP.free))
})
