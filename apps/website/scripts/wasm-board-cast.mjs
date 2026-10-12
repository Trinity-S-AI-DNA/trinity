#!/usr/bin/env node
// wasm-board-cast.mjs -- record the WASM interpreter board cell's silicon conformance run.
//
// One recording, five commands, against the board on the desk: the checkout the
// conformance trio belongs to, the USB scan that shows the one FT232H, the openFPGALoader
// flash of the openXC7 bitstream, the model-board self-test that proves every check can
// fail, and the 134-request run over UART. It reuses the recording machinery of
// t27c-mutation-casts.mjs: the prompt and the typing are staged, every output byte and
// its timing are the real ones, and a silence longer than 2 s is shown for 2 s.
//
// It refuses to write anything unless every command exits 0, the scan shows exactly one
// FT232H at the given busdev, the flash prints done, the self-test prints SELF-TEST PASS,
// and the run prints the spec's PASS_LINE with the vectors sha256 the published run used.
// A recording that does not show what the post says is not published.
//
// Run: node scripts/wasm-board-cast.mjs --repo ~/trinity-fpga --bit /tmp/wasm-build/wasm_board_ax7203.bit \
//          [--busdev 000:005] [--port /dev/cu.usbserial-130] [--chrome PATH]
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { bareEnv } from './tri-help-casts.mjs'
import { eventsOf, castText, shownOf, Screen, pageHtml, cardHtml, indexWith } from './t27c-mutation-casts.mjs'

const WIDTH = 104
const HEIGHT = 30
const TERM = join(fileURLToPath(new URL('../public/term/', import.meta.url)))
const ORIGIN = 'https://t27.ai'
const ID = 'wasm-board-ax7203'
const POST = 'https://t27.ai/#/blog/a-wasm-interpreter-ran-on-the-board'
const VECTORS_SHA_PREFIX = '89527478cf813f99' // conformance/wasm_board_vectors.py --write, 2026-10-12 run
const PASS_LINE = 'WASM BOARD RESULT: 134/134 responses exact (fails=0, lost=0)'

// ------------------------------------------------------------------ running (as t27c-mutation-casts runs)

function run(command, cwd, env) {
  return new Promise((resolve) => {
    const t0 = process.hrtime.bigint()
    const at = () => Number(process.hrtime.bigint() - t0) / 1e9
    const chunks = []
    const child = spawn('bash', ['-c', command], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
    const take = (buf) => chunks.push({ at: at(), text: buf.toString('utf8') })
    child.stdout.on('data', take)
    child.stderr.on('data', take)
    child.on('error', (e) => resolve({ chunks: [{ at: at(), text: `${e.message}\n` }], exit: 'spawn-error', real: at() }))
    child.on('close', (code, signal) => resolve({ chunks, exit: String(code ?? signal), real: at() }))
  })
}

const screenAfter = (events, upTo = Infinity) => {
  const s = new Screen()
  for (const [t, k, text] of events) if (k === 'o' && t <= upTo) s.feed(text)
  return s
}

function findChrome() {
  return [process.env.CHROME, '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/BrowserOS neo.app/Contents/MacOS/BrowserOS neo'].find((p) => p && existsSync(p))
}

async function render(chrome, html, png) {
  const { spawn } = await import('node:child_process')
  const { mkdtempSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { pathToFileURL } = await import('node:url')
  const work = mkdtempSync(join(tmpdir(), 'term-card-'))
  const src = join(work, 'card.html')
  writeFileSync(src, html)
  const before = existsSync(png) ? statSync(png).mtimeMs : 0
  const b = spawn(chrome, ['--headless=new', `--user-data-dir=${join(work, 'profile')}`, '--allow-file-access-from-files', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=3000', `--screenshot=${png}`, pathToFileURL(src).href], { stdio: 'ignore', detached: true })
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 300))
    if (existsSync(png) && statSync(png).mtimeMs > before && statSync(png).size > 0) break
  }
  await new Promise((r) => setTimeout(r, 300))
  const exited = new Promise((r) => b.once('exit', r))
  try { process.kill(-b.pid, 'SIGKILL') } catch { b.kill('SIGKILL') }
  await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))])
  try { rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch { /* a temp dir the OS will clear */ }
  if (!existsSync(png) || statSync(png).mtimeMs <= before) throw new Error(`wasm-board-cast: no card written to ${png}`)
}

// ------------------------------------------------------------------ main

async function main() {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
  const repo = arg('--repo')
  const bit = arg('--bit')
  const busdev = arg('--busdev', '000:005')
  const port = arg('--port', '/dev/cu.usbserial-130')
  if (!repo || !bit) { console.error('usage: wasm-board-cast.mjs --repo DIR --bit FILE [--busdev 000:005] [--port /dev/cu.usbserial-130] [--chrome PATH]'); process.exit(2) }
  const chrome = arg('--chrome') || findChrome()
  if (!chrome) throw new Error('wasm-board-cast: no Chromium for the card; set --chrome')
  if (!existsSync(bit)) throw new Error(`wasm-board-cast: no bitstream at ${bit}`)
  if (!existsSync(port)) throw new Error(`wasm-board-cast: no UART port at ${port}`)
  const env = { ...bareEnv(), COLUMNS: String(WIDTH), LINES: String(HEIGHT), PATH: process.env.PATH }

  const commands = [
    "git log -1 --format='%h %s' | cut -c1-100",
    'openFPGALoader --scan-usb',
    `openFPGALoader -c digilent_hs2 --busdev-num ${busdev} ${bit}`,
    'python3 conformance/wasm_board_ax7203.py --self-test',
    `python3 conformance/wasm_board_ax7203.py --port ${port}`,
  ]
  const steps = []
  for (const c of commands) steps.push(await run(c, repo, env))
  const out = (i) => steps[i].chunks.map((c) => c.text).join('')

  const problems = []
  steps.forEach((s, i) => { if (s.exit !== '0') problems.push(`command ${i} (${commands[i]}) exited ${s.exit}`) })
  const scan = out(1)
  const ft232 = scan.split('\n').filter((l) => /ft232H/i.test(l))
  // --scan-usb prints "Bus device" as two space-separated columns ("000 005"), the flag takes a colon.
  const onAir = busdev.replace(':', ' ')
  if (ft232.length !== 1 || !ft232[0].includes(onAir)) problems.push(`scan shows ${ft232.length} FT232H lines, wanted exactly one at ${onAir}`)
  if (!/done/.test(out(2))) problems.push('the flash did not print done')
  if (!out(3).includes('SELF-TEST PASS')) problems.push('the self-test did not print SELF-TEST PASS')
  const runOut = out(4)
  if (!runOut.split('\n').some((l) => l.trim() === PASS_LINE)) problems.push(`the run did not print the spec's PASS_LINE`)
  if (!runOut.includes(`vectors sha256 ${VECTORS_SHA_PREFIX}`)) problems.push(`the run's vectors sha256 does not start ${VECTORS_SHA_PREFIX}`)
  if (problems.length) { console.error(problems.join('\n')); process.exit(1) }

  const events = eventsOf(commands, steps)
  const recordedAt = new Date()
  const recorded = recordedAt.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  const real = events[events.length - 1][0]
  const commit = out(0).trim().split(' ')[0]
  const meta = {
    id: ID,
    title: 'WASM on the AX7203: flash, self-test, 134/134 exact',
    desc: `The t27-generated WASM interpreter on an ALINX AX7203 (xc7a200t), bitstream from the openXC7 flow, spec at trinity-fpga ${commit}: ` +
      'openFPGALoader flashes over the onboard FT232H, the model-board self-test shows every conformance check able to fail, ' +
      'and one run answers all 134 requests exactly over UART.',
    url: `${ORIGIN}/term/${ID}/`,
    gif: null,
    post: POST,
    recorded,
    real_s: Number(real.toFixed(1)),
    shown_s: Number(shownOf(events).toFixed(1)),
    commands,
    exit_codes: steps.map((s) => s.exit),
    redacted: [],
    published: recordedAt.toISOString().slice(0, 10),
  }
  const header = { version: 2, width: WIDTH, height: HEIGHT, timestamp: Math.floor(recordedAt.getTime() / 1000), title: meta.title, commands, redacted: [] }
  const dir = join(TERM, ID)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'session.cast'), castText(header, events))
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')
  writeFileSync(join(dir, 'index.html'), pageHtml(meta, screenAfter(events)))
  // The card shows the moment the run has printed its report: the per-program rows and the PASS_LINE.
  const atPass = events.filter((e) => e[1] === 'x').at(-1)[0]
  await render(chrome, cardHtml(meta, screenAfter(events, atPass)), join(dir, 'card.png'))
  writeFileSync(join(TERM, 'index.html'), indexWith(readFileSync(join(TERM, 'index.html'), 'utf8'), [meta]))
  console.log(`wasm-board-cast: wrote ${ID} (${meta.real_s} s real, card at the PASS_LINE), listed in public/term/index.html`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
