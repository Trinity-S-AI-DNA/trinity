import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SITE, loadCompiler } from './agents-from-specs.mjs'
import { CSS_OUT, TS_OUT, mediaWidths, readInputs, renderCss, renderTs, viewProblems } from './course-view-from-spec.mjs'

const analyze = await loadCompiler(readFileSync(join(SITE, 'public/t27/t27_compiler.wasm')))
const inputs = readInputs()
const run = (over = {}) => viewProblems({ ...inputs, analyze, ...over })
const fails = (over, needle) => {
  const { problems, out } = run(over)
  assert.ok(problems.some((p) => p.includes(needle)), `expected a problem naming ${needle}, got:\n${problems.join('\n')}`)
  assert.equal(out, null)
}
const replaced = (text, from, to) => {
  assert.ok(text.includes(from), `the mutation target is gone: ${from}`)
  return text.replace(from, to)
}

test('the committed view builds clean and the generated files are current', () => {
  const { problems, out } = run()
  assert.deepEqual(problems, [])
  assert.equal(readFileSync(join(SITE, TS_OUT), 'utf8'), renderTs(out))
  assert.equal(readFileSync(join(SITE, CSS_OUT), 'utf8'), renderCss(out))
  assert.deepEqual(Object.keys(out.view.say.en), Object.keys(out.view.say.ru))
})

test("the spec's own tests hold the numbers: a breakpoint that starves the widget stops the build", () => {
  fails({ viewText: replaced(inputs.viewText, 'pub const SIDE_BY_SIDE_MIN_PX : u16 = 1150;', 'pub const SIDE_BY_SIDE_MIN_PX : u16 = 1100;') }, 'side_by_side_leaves_the_widget_its_minimum')
  fails({ viewText: replaced(inputs.viewText, 'pub const READ_EM_X10_EN : u16 = 301;', 'pub const READ_EM_X10_EN : u16 = 378;') }, 'the_text_column_is_readable')
  fails({ viewText: replaced(inputs.viewText, 'pub const READ_EM_X10_RU : u16 = 372;', 'pub const READ_EM_X10_RU : u16 = 301;') }, 'the_text_column_is_readable')
  fails({ viewText: replaced(inputs.viewText, 'pub const UNMOUNT_MARGIN_PX : u16 = 2000;', 'pub const UNMOUNT_MARGIN_PX : u16 = 600;') }, 'frames_load_ahead_and_leave_far_behind')
  fails({ viewText: replaced(inputs.viewText, 'pub const LIVE_FRAMES_MAX : u8 = 3;', 'pub const LIVE_FRAMES_MAX : u8 = 27;') }, 'a_phone_keeps_only_a_few_frames_live')
  fails({ viewText: replaced(inputs.viewText, 'pub const TOUCH_TARGET_PX : u8 = 44;', 'pub const TOUCH_TARGET_PX : u8 = 32;') }, 'every_target_is_a_finger_wide')
})

test('the deck widget loads frames by this budget, not by one of its own', () => {
  fails({ deckText: replaced(inputs.deckText, 'pub const K_LIVE_FRAMES_MAX : u8 = 3;', 'pub const K_LIVE_FRAMES_MAX : u8 = 4;') }, 'K_LIVE_FRAMES_MAX is 4')
  fails({ deckText: replaced(inputs.deckText, 'pub const K_MOUNT_MARGIN_PX : u16 = 600;\n', '') }, 'K_MOUNT_MARGIN_PX is missing')
})

test("the finger and the phone width are the site's viewport contract", () => {
  fails({ viewportText: replaced(inputs.viewportText, 'pub const TOUCH_TARGET_MIN_PX : u8 = 44;', 'pub const TOUCH_TARGET_MIN_PX : u8 = 48;') }, 'TOUCH_TARGET_PX 44 is not')
})

test('Course.css names no breakpoint of its own and still stacks the lesson', () => {
  const widths = mediaWidths(inputs.courseCss)
  assert.ok(widths.length >= 2)
  fails({ courseCss: `${inputs.courseCss}\n@media (max-width: 900px) { .x { color: red } }` }, '@media (max-width: 900px) is not a breakpoint')
  fails({ courseCss: inputs.courseCss.replaceAll('@media (max-width: 1149px)', '@media (max-width: 600px)') }, 'the lesson never stacks')
})

test('Russian keeps every word and its digits', () => {
  const ru = JSON.parse(inputs.ruText)
  fails({ ruText: JSON.stringify({ ...ru, SAY_ONE_PAGE_LINE: 'Все уроки на одной странице.' }) }, 'SAY_ONE_PAGE_LINE keeps other numbers')
  const { SAY_JUMP, ...noJump } = ru
  void SAY_JUMP
  fails({ ruText: JSON.stringify(noJump) }, 'SAY_JUMP is missing')
  fails({ viewText: replaced(inputs.viewText, '"Contents"', '"Содержание"') }, 'Cyrillic')
})
