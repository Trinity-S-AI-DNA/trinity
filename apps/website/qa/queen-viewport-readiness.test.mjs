// The predicate qa/queen-viewport-contract.mjs reads at both ends: which
// sizes assert six sector rows, and what its readiness wait must hold out
// for there (qa/queen-viewport-readiness.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readinessDataExpr, sectorsAssertedAt } from './queen-viewport-readiness.mjs'

const QA = dirname(fileURLToPath(import.meta.url))

test('desktop sizes assert the six rows; the phone and the dead build do not', () => {
  for (const [w, h] of [[1920, 1080], [1440, 900], [1272, 806], [1280, 700], [1280, 600]])
    assert.equal(sectorsAssertedAt(w, false, false), true, `${w}x${h} must assert the rows`)
  for (const [w, h] of [[390, 844], [390, 640], [390, 560]])
    assert.equal(sectorsAssertedAt(w, true, false), false, `${w}x${h} must not assert the rows`)
  // the dead-API build expects zero rows, never six
  assert.equal(sectorsAssertedAt(1440, false, true), false)
})

test('readiness holds out for the rows exactly where the probe asserts them', () => {
  assert.equal(readinessDataExpr(1440, false, false), 'rows === 6')
  assert.equal(readinessDataExpr(1920, false, false), 'rows === 6')
  // below the assertion threshold the live pill alone still counts
  assert.equal(readinessDataExpr(390, true, false), '(live || rows === 6)')
  // and the dead build reads its own pill
  assert.equal(readinessDataExpr(1440, false, true), 'dead')
})

test('the contract interpolates the predicate at both ends', () => {
  const text = readFileSync(join(QA, 'queen-viewport-contract.mjs'), 'utf8')
  assert.match(text, /\$\{readinessDataExpr\(w, phone, DEAD\)\}/,
    'the readiness wait must read the shared predicate')
  assert.match(text, /sectorsAssertedAt\(w, phone, DEAD\) && counts\.sectors !== 6/,
    'the sectors assertion must read the shared predicate')
  // the old inline forms must be gone, or the two ends can drift apart again
  // (the drift is the bug: main, 2026-10-24, 1440x900 wars FAIL COUNT sectors=0
  // -- readiness accepted the pill while the probe was waiting for the rows)
  assert.ok(!text.includes('live || rows === 6'),
    'the readiness escape hatch must come from the module, not stay inline')
  assert.ok(!text.includes('!DEAD && !phone && w > 1100'),
    'the assertion threshold must come from the module, not stay inline')
})
