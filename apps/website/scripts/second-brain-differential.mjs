#!/usr/bin/env node
// second-brain-differential.mjs -- the constant regression harness for the generated view logic.
//
// One run closes the loop end to end, with no recorded-by-hand expectations:
//   for every case: write a probe spec asserting the expected value
//     -> run the pinned t27c `test` on it (the reference execution)
//     -> read the reference verdict: OK (value holds) or ABRT (the value traps)
//     -> run the generated JS function on the same input
//     -> PASS only when the two sides agree in kind: value == value, trap == trap.
//
// What is deliberately not a PASS: a build error, a missing compiler, a wrong
// argument shape. A trap case passes only when the reference specifically died
// on `signal ABRT` (t27's integer-width trap) and the generated function threw.
// Anything else is FAIL with the reason printed.
//
// Run: node scripts/second-brain-differential.mjs   (exit 1 on any disagreement)

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(new URL('./t27c-manifest.json', import.meta.url), 'utf8'))
const T27C = manifest.path
const SPEC = join(SITE, 'specs/widgets/second-brain-view-logic.t27')
const LOGIC = join(SITE, 'public/widgets/second-brain/second-brain-logic.js')

const FN = 'view_zoom_in'
const EXPR = 'zoom_milli * 12 / 10'
// [input, expected reference verdict]. 'trap' means: the t27 value leaves u16
// while computing, and the reference aborts. Every value case is asserted by
// the probe spec itself -- the compiler is what executes it, not this harness.
const CASES = [
  [1000, 1200], [1440, 1728], [5461, 6553],
  [5462, 'trap'], [6000, 'trap'], [65535, 'trap'],
]

const tmp = mkdtempSync(join(tmpdir(), 'sb-diff-'))
let failures = 0

function reference(input, expected) {
  const probe = `module probe_${input};
pub fn view_zoom_in(zoom_milli: u16) -> u16 {
    return ${EXPR};
}
test case {
    assert view_zoom_in(${input}) == ${expected};
}
`
  const file = join(tmp, `probe_${input}.t27`)
  writeFileSync(file, probe)
  try {
    execFileSync(T27C, ['test', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { kind: 'value', value: expected }
  } catch (e) {
    const out = String(e.stderr || '') + String(e.stdout || '')
    if (/signal ABRT/.test(out)) return { kind: 'trap' }
    return { kind: 'error', detail: out.split('\n').find((l) => l.trim()) || 'unknown reference failure' }
  }
}

const logic = readFileSync(LOGIC, 'utf8')
const fnMatch = logic.match(new RegExp(`export function ${FN}\\([\\s\\S]*?\\n}`))
if (!fnMatch) {
  console.error(`differential: ${FN} not found in ${LOGIC}`)
  process.exit(1)
}
const modFile = join(tmp, 'logic.mjs')
writeFileSync(modFile, logic)
const L = await import(pathToFileURL(modFile).href)

for (const [input, expected] of CASES) {
  const ref = reference(input, expected === 'trap' ? 0 : expected)
  let got
  try {
    got = { kind: 'value', value: String(L[FN](input)) }
  } catch (e) {
    got = e instanceof RangeError ? { kind: 'trap' } : { kind: 'error', detail: String(e) }
  }
  // Kind match first, then the value. A reference build error is never a trap.
  const ok = ref.kind === got.kind && (ref.kind !== 'value' || String(ref.value) === String(got.value))
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} zoom_in(${input}): reference ${ref.kind}${ref.kind === 'value' ? ' ' + ref.value : ''}${ref.kind === 'error' ? ` (${ref.detail})` : ''} | generated ${got.kind}${got.kind === 'value' ? ' ' + got.value : ''}`)
}

rmSync(tmp, { recursive: true, force: true })
if (failures) {
  console.error(`differential: ${failures} disagreement(s) with the reference`)
  process.exit(1)
}
console.log(`differential: all ${CASES.length} cases agree with the reference execution`)
