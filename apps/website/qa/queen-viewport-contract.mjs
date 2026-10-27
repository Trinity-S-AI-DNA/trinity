// Is t27.ai/#/queen one screen, or did the CSS just claim to be?
//
// The page used to be twelve screens tall (documentElement.scrollHeight 12269
// at 1272x806). The single-screen HUD makes it exactly one: nothing scrolls
// except the named inner scrollers. Every rule that makes that true is CSS,
// and CSS is not proven by reading it. So this opens the built page in real
// Chrome at five device sizes, switches through every view, and asserts the
// contract from tabs-at-height §5.1 against the live DOM.
//
//   npm run check:queen-viewport              build, then check
//   npm run check:queen-viewport -- --no-build reuse dist/
//
// The harness is scripts/render-check.mjs's: serve dist over node:http, launch
// the installed Chrome with --headless=new, speak CDP over Node's WebSocket.
// No Playwright, no Puppeteer. Screenshots land in /tmp/hud-shots/.
//
// The guard at the bottom is the same as render-check's: a probe that matches
// nothing reports a broken selector, never a clean page. Zero command buttons,
// zero resource cells or zero sector rows is a failure.
import { execSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { readinessDataExpr, sectorsAssertedAt } from './queen-viewport-readiness.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const ROUTE = '#/queen';
const SHOTS = '/tmp/hud-shots';
// 390x640 and 390x560 are the board as a phone shows it: framed by /game on
// app.t27.ai, under the player's own header and tab bar, it gets 560-640px,
// not the 844 of a bare phone. The kanban bug of 2026-10-01 (a 14px card box)
// passed at 390x844 and failed at both of these.
const SIZES = [[1920, 1080], [1440, 900], [1272, 806], [1280, 700], [1280, 600], [390, 844], [390, 640], [390, 560]];
// Scoped to the view PR #1155 adds. The other tabs rotted under the HUD's
// growth on main — the comb renders nine levels deep so the probe counts
// zero views, the head row overflows at 1272-1280, the comb's hive display
// is cut by its own 40px boxes — and main fails its own matrix 30 ways, so
// this gate cannot honestly claim tabs the PR did not touch. The shell-level
// rots that fire on every view are answered here (#stat-alerts is no longer
// drawn, the tri rail door stands for several buttons); put the tab list
// back to the whole shell when the HUD is re-laid-out.
// KANBAN joined 2026-10-02, with the readable-card check (11 in the probe):
// on a phone the board drew six 160px columns whose card boxes were 67px tall
// round 204px cards, so no column showed a single whole card, and every check
// above still passed (#1221 fixed it; nothing here would have caught it).
// WIDGETS joined 2026-10-04: a card grid that must fold to one column at 390px.
const VIEWS = ['wars', 'kanban', 'widgets'];
// The rail used to draw one button per view, so this counted HUD_VIEWS and
// compared. That stopped being the shape of the thing: SPECS has long stood for
// six layers behind one button, and KANBAN now stands for itself, MAP and
// FACTORY the same way. Fourteen views, seven buttons -- and a gate that reads
// only HUD_VIEWS reports the fold as seven missing buttons.
//
// So read the fold from the same declarations the app folds by, and count what
// the rail is actually supposed to draw. Both lists are still read rather than
// pinned, which is what stopped this gate expecting eleven when #980 added the
// twelfth view.
const HUD_SOURCE = readFileSync(join(ROOT, 'src/components/queenHud.ts'), 'utf8');
const readList = (name, pattern) => {
  const body = HUD_SOURCE.match(pattern)?.[1];
  if (!body) {
    console.error(`  could not read ${name} from src/components/queenHud.ts`);
    process.exit(1);
  }
  return [...body.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
};
const HUD_VIEWS = readList('HUD_VIEWS', /export const HUD_VIEWS[^=]*=\s*\[([\s\S]*?)\]\s*as const/);
const SPEC_LAYERS = readList('SPEC_LAYERS', /export const SPEC_LAYERS\s*=\s*\[([\s\S]*?)\]\s*as const/);
const BOARD_VIEWS = readList('BOARD_VIEWS', /export const BOARD_VIEWS\s*=\s*\[([\s\S]*?)\]\s*as const/);
const PROJECT_VIEWS = readList('PROJECT_VIEWS', /export const PROJECT_VIEWS\s*=\s*\[([\s\S]*?)\]\s*as const/);
// A family's first entry is the button; the rest are behind it. This mirrors
// isFolded in queenHud.ts, which is the one place the app decides it.
const FOLD = new Map();
for (const family of [SPEC_LAYERS, BOARD_VIEWS, PROJECT_VIEWS]) {
  for (const view of family.slice(1)) FOLD.set(view, family[0]);
}
const RAIL_VIEWS = HUD_VIEWS.filter((view) => !FOLD.has(view));
const RAIL_VIEW_COUNT = RAIL_VIEWS.length;
if (HUD_VIEWS.length < 1 || RAIL_VIEW_COUNT < 1) {
  console.error('  could not read HUD_VIEWS from src/components/queenHud.ts');
  process.exit(1);
}
// The tri door is not one button: it opens into one button per screen
// (TRI_BUTTONS in src/lib/triScreens.ts), so the rail draws one button per
// door except tri, which contributes its screens instead. Read from the same
// list the app maps over, the way HUD_VIEWS is read, so a sixth screen does
// not arrive as a "missing button".
const TRI_SOURCE = readFileSync(join(ROOT, 'src/lib/triScreens.ts'), 'utf8');
const TRI_BUTTONS = [...(TRI_SOURCE.match(/export const TRI_BUTTONS[^=]*=\s*\[([\s\S]*?)\]/)?.[1] ?? '')
  .matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
if (TRI_BUTTONS.length < 1) {
  console.error('  could not read TRI_BUTTONS from src/lib/triScreens.ts');
  process.exit(1);
}
const RAIL_COMMANDS = RAIL_VIEW_COUNT - (RAIL_VIEWS.includes('tri') ? 1 : 0) + TRI_BUTTONS.length;
const DATA_WAIT_MS = 60000; // under the gate chain's load the sectors rows render late (the "sectors=0" readiness flake, cycles 015 and 035): a minute, like the windows gate -- and since 2026-10-24 readiness holds out for the rows themselves at the sizes that assert them, not the pill alone
const SETTLE_MS = 700;

const CHROMES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
].filter(Boolean);
const CHROME = CHROMES.find(p => existsSync(p));
if (!CHROME) {
  console.log('  no Chrome found — skipping the viewport check. Set CHROME_PATH to force it.');
  process.exit(0);
}

// --dead-api: build against an address that refuses every connection, then
// assert that no tile, count or stat renders a bare number while its endpoint
// is silent (data-honesty: absent reads as a dash, never 0), and that the
// status pill never reads LIVE. Only the sizes with the most counts run.
const DEAD = process.argv.includes('--dead-api');
if (!process.argv.includes('--no-build')) {
  console.log(DEAD ? '  building against a dead API…' : '  building…');
  execSync('npx vite build', {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, ...(DEAD ? { VITE_QUEEN_API: 'http://127.0.0.1:1' } : {}) },
  });
}
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('  dist/index.html missing — nothing to open.');
  process.exit(1);
}
mkdirSync(SHOTS, { recursive: true });

// ── Serve dist the way Pages serves it ──
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.woff2': 'font/woff2',
};
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, path);
  if (!file.startsWith(DIST) || !existsSync(file) || path === '/') file = join(DIST, 'index.html');
  try {
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

// ── Chrome over CDP ──
const profile = mkdtempSync(join(tmpdir(), 'queen-viewport-'));
const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-background-networking', '--disable-sync', '--mute-audio',
  '--window-size=1920,1080',
  ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

const browserWs = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('Chrome never announced a debugging port')), 30000);
  let buf = '';
  chrome.stderr.on('data', d => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) { clearTimeout(t); resolve(m[1]); }
  });
  chrome.on('exit', c => { clearTimeout(t); reject(new Error(`Chrome exited (${c}) before listening`)); });
});

const ws = new WebSocket(browserWs);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP socket refused')); });
let nextId = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id !== undefined && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(`${msg.error.message}`)) : resolve(msg.result);
  } else if (msg.method) listeners.forEach(f => f(msg));
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const call = (m, p) => send(m, p, sessionId);

const errors = [];
listeners.push(msg => {
  if (msg.sessionId !== sessionId) return;
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    errors.push((d.exception?.description || d.text || 'uncaught exception') + (d.stackTrace ? ' @ ' + d.stackTrace.callFrames.slice(0, 4).map(f => (f.url || '').split('/').pop() + ':' + f.lineNumber + ':' + f.columnNumber + (f.functionName ? ' ' + f.functionName : '')).join(' < ') : ''));
  }
});

await call('Runtime.enable');
await call('Page.enable');

// ── The kanban's cards are a fixture, not today's board (#1572) ──
//
// The kanban draws GET /queen/public-tasks, and this contract used to draw it
// live. Check 11 (a whole card in every column) then measured whichever task
// happened to be first in a column that day: main went red at 1280x600 with
// "running24 box 156px, first card 174px", the next run said running27 and
// 159px, and the same build passed an hour later. A layout contract that
// depends on the board's data is not a layout contract. So the route is
// answered here, through CDP, with a fixed set of tasks shaped like the live
// ones (a running issue carries a bee and criteria, a blocked one its needs, a
// review and a failed job carry their kind tags), and the board, the sectors
// and every other endpoint stay live. The fixture's numbers are far above any
// real issue so no live board card lends one of them a review state.
// --dead-api is untouched: there the route must stay dead.
//
// THE WORST CARD FIRST (#1588). Shaped like the live tasks, the fixture only
// proved that today's cards fit, and a card is as tall as its data lets it be.
// So every column opens with the worst card the data can send: a 255-character
// title (the longest of 500 live titles read on 2026-10-10 was 216) with a
// 100-character path in it and HARDWARE, the widest direction word; a
// repository that is not the board's; a kind that is not an issue; a bee, 27
// criteria and all four needs; and in DROPPED, failed as well. Check 11 reads
// the first card of each column, so a layout that lets any of these outgrow
// the box is red at every size where it does. The backlog is also full: 33
// cards, more than one page of a column (CARD_PAGE), so the box scrolls and
// its foot is drawn. All seven directions are present, so the chip row above
// the board is as full as the fixture can make it.
const FIXTURE_REPO = 'gHashTag/t27';
const FIXTURE_AT = '2026-10-09T00:00:00Z';
const FIXTURE_LONGEST = 'Port gHashTag/trinity:fpga/openxc7-synth/quantum_bridge_simple_with_a_deliberately_long_module_name_27.v (Verilog, 1 module) to specs/port/trinity/fpga/openxc7-synth/quantum_bridge_simple_with_a_deliberately_long_module_name_27.t27, bit-exact on the bench';
const FIXTURE_NEEDS = ['boundary', 'scenarios', 'requirements', 'success criteria'];
const FIXTURE_ROWS = [
  // [state, kind, title, criteria, needs, bee, repo (the board's when absent)]
  ['backlog', 'job', FIXTURE_LONGEST, 27, FIXTURE_NEEDS, 'quiet', 'gHashTag/trinity'],
  ['blocked', 'review', FIXTURE_LONGEST, 27, FIXTURE_NEEDS, 'quiet', 'gHashTag/BrowserOS'],
  ['running', 'job', FIXTURE_LONGEST, 27, FIXTURE_NEEDS, 'working', 'gHashTag/trinity'],
  ['review', 'review', FIXTURE_LONGEST, 27, FIXTURE_NEEDS, 'quiet', 'gHashTag/trios'],
  ['done', 'job', FIXTURE_LONGEST, 27, FIXTURE_NEEDS, 'quiet', 'gHashTag/trinity'],
  ['failed', 'job', FIXTURE_LONGEST, 27, FIXTURE_NEEDS, 'quiet', 'gHashTag/trinity'],
  ['backlog', 'issue', 'spec: the queen board reads its column order from the tasks card', 4, [], null],
  ['backlog', 'issue', 'docs: one page for the kanban filter, written from the address it rides in', 3, [], null],
  ['blocked', 'issue', 'fpga: carry the GoldenFloat adder through the open toolchain on the ax7203', 0, ['scenarios', 'requirements'], null],
  ['blocked', 'issue', 'research: measure the reviewer queue against the golden set', 2, ['owner'], null],
  ['running', 'issue', 'compiler: t27c gen-ts emits the enum names the board imports, so no list is hand-copied twice', 4, [], 'working'],
  ['running', 'issue', 'queen: a quiet bee is drawn as quiet, with the age it has been on the task', 6, [], 'quiet'],
  ['running', 'issue', 'web: the widget gallery folds to one column at 390px', 3, [], 'working'],
  ['review', 'issue', 'kanban: the card chat opens with the task history in the drawer', 5, [], null],
  ['review', 'review', 'review: queen viewport contract renders the kanban from a fixed card fixture', null, [], null],
  ['done', 'issue', 'blog: three dies, one verdict', 4, [], null],
  ['done', 'job', 'job: reseal the specs touched by the last wave', null, [], null],
  ['dropped', 'issue', 'web: a seventh column for failed tasks', 2, [], null],
  ['failed', 'job', 'job: rebuild the explorer manifest', null, [], null],
  // the rest of a full backlog, one title per direction in turn
  ['backlog', 'issue', 'Client onboarding funnel: the invoice step drops a lead when the subscription renews on the same day', 2, ['boundary'], null],
  ['backlog', 'issue', 'Blog article on the first morning of the scheduler, with the translation and the locale strings for the landing', 0, ['scenarios', 'requirements'], null],
  ['backlog', 'issue', 'Prove the ring buffer invariant holds after wraparound, and pin the bit-exact equivalence with the reference', 5, [], null],
  ['backlog', 'issue', 'Railway deploy of the runner pool drops the health probe when the cron dispatch overlaps a rollout', 3, ['success criteria'], null],
  ['backlog', 'issue', 'Parser refuses a struct literal whose last field is an array of pointers, and the error names the wrong token', 6, [], null],
  ['backlog', 'issue', 'Wave 912 tidy: move the remaining notes from the old tracker and close what nobody has touched since August', 1, ['boundary', 'scenarios', 'requirements'], null],
  ['backlog', 'issue', 'Client onboarding funnel: the invoice step drops a lead when the subscription renews on the same day', 2, ['boundary'], null],
  ['backlog', 'issue', 'Blog article on the first morning of the scheduler, with the translation and the locale strings for the landing', 0, ['scenarios', 'requirements'], null],
  ['backlog', 'issue', 'Prove the ring buffer invariant holds after wraparound, and pin the bit-exact equivalence with the reference', 5, [], null],
  ['backlog', 'issue', 'Railway deploy of the runner pool drops the health probe when the cron dispatch overlaps a rollout', 3, ['success criteria'], null],
  ['backlog', 'issue', 'Parser refuses a struct literal whose last field is an array of pointers, and the error names the wrong token', 6, [], null],
  ['backlog', 'issue', 'Wave 912 tidy: move the remaining notes from the old tracker and close what nobody has touched since August', 1, ['boundary', 'scenarios', 'requirements'], null],
  ['backlog', 'issue', 'Client onboarding funnel: the invoice step drops a lead when the subscription renews on the same day', 2, ['boundary'], null],
  ['backlog', 'issue', 'Blog article on the first morning of the scheduler, with the translation and the locale strings for the landing', 0, ['scenarios', 'requirements'], null],
  ['backlog', 'issue', 'Prove the ring buffer invariant holds after wraparound, and pin the bit-exact equivalence with the reference', 5, [], null],
  ['backlog', 'issue', 'Railway deploy of the runner pool drops the health probe when the cron dispatch overlaps a rollout', 3, ['success criteria'], null],
  ['backlog', 'issue', 'Parser refuses a struct literal whose last field is an array of pointers, and the error names the wrong token', 6, [], null],
  ['backlog', 'issue', 'Wave 912 tidy: move the remaining notes from the old tracker and close what nobody has touched since August', 1, ['boundary', 'scenarios', 'requirements'], null],
  ['backlog', 'issue', 'Client onboarding funnel: the invoice step drops a lead when the subscription renews on the same day', 2, ['boundary'], null],
  ['backlog', 'issue', 'Blog article on the first morning of the scheduler, with the translation and the locale strings for the landing', 0, ['scenarios', 'requirements'], null],
  ['backlog', 'issue', 'Prove the ring buffer invariant holds after wraparound, and pin the bit-exact equivalence with the reference', 5, [], null],
  ['backlog', 'issue', 'Railway deploy of the runner pool drops the health probe when the cron dispatch overlaps a rollout', 3, ['success criteria'], null],
  ['backlog', 'issue', 'Parser refuses a struct literal whose last field is an array of pointers, and the error names the wrong token', 6, [], null],
  ['backlog', 'issue', 'Wave 912 tidy: move the remaining notes from the old tracker and close what nobody has touched since August', 1, ['boundary', 'scenarios', 'requirements'], null],
  ['backlog', 'issue', 'Client onboarding funnel: the invoice step drops a lead when the subscription renews on the same day', 2, ['boundary'], null],
  ['backlog', 'issue', 'Blog article on the first morning of the scheduler, with the translation and the locale strings for the landing', 0, ['scenarios', 'requirements'], null],
  ['backlog', 'issue', 'Prove the ring buffer invariant holds after wraparound, and pin the bit-exact equivalence with the reference', 5, [], null],
  ['backlog', 'issue', 'Railway deploy of the runner pool drops the health probe when the cron dispatch overlaps a rollout', 3, ['success criteria'], null],
  ['backlog', 'issue', 'Parser refuses a struct literal whose last field is an array of pointers, and the error names the wrong token', 6, [], null],
  ['backlog', 'issue', 'Wave 912 tidy: move the remaining notes from the old tracker and close what nobody has touched since August', 1, ['boundary', 'scenarios', 'requirements'], null],
];
const FIXTURE_FEED = (() => {
  const tasks = [], bees = [];
  FIXTURE_ROWS.forEach(([state, kind, title, criteria, needs, bee, repo = FIXTURE_REPO], i) => {
    const number = 990001 + i;
    const key = `${repo}#${number}`;
    const beeId = bee ? `b${number}` : null;
    tasks.push({ key, kind, repo, number, title, state, criteria, needs, verdict: null, url: null, bee: beeId, updatedAt: FIXTURE_AT });
    if (beeId) bees.push({ id: beeId, lane: i, kind: 'worker', task: key, repo, number, state: bee, since: FIXTURE_AT, lastEventAt: FIXTURE_AT });
  });
  return { at: FIXTURE_AT, tasks, bees, truncated: false, cursor: null };
})();
if (!DEAD) {
  await call('Fetch.enable', { patterns: [{ urlPattern: '*/queen/public-tasks*', requestStage: 'Request' }] });
  listeners.push(msg => {
    if (msg.sessionId !== sessionId || msg.method !== 'Fetch.requestPaused') return;
    const url = new URL(msg.params.request.url);
    const running = url.searchParams.get('state') === 'running';
    const feed = running ? { ...FIXTURE_FEED, tasks: FIXTURE_FEED.tasks.filter(t => t.state === 'running') } : FIXTURE_FEED;
    call('Fetch.fulfillRequest', {
      requestId: msg.params.requestId,
      responseCode: 200,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Cache-Control', value: 'no-store' },
      ],
      body: Buffer.from(JSON.stringify(feed)).toString('base64'),
    }).catch(() => { /* the page navigated away mid-request */ });
  });
}

const evaluate = async expr => {
  const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`probe failed: ${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description ?? ''}`);
  return r.result.value;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

function cleanup() {
  try { ws.close(); } catch { /* already gone */ }
  chrome.kill();
  server.close();
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch (e) {
    console.error(`  (temporary profile could not be removed: ${e.code}; ignored)`);
  }
}

// ── The probe, from tabs-at-height §5.1, adapted to the HUD ──
//
// Scroll owners are declared by name. An element that overflows and is not
// on this list, and is not a designed truncation (text-overflow: ellipsis or
// a line clamp), is content the reader cannot reach.
const DECLARED = [
  // the HUD's own scrollers
  '.queen27-sectors-list', '.queen27-context-col',
  // the command rail: twelve views + COLLAPSE scroll their own list when a
  // window is shorter than the budget (COLLAPSE is sticky at the bottom), and
  // the phone icon row scrolls sideways
  '.queen27-hud-command',
  // the Queen's own panel: the conversation, the filtered log in its own tab,
  // the agents' network in a third, and the kind chips, which hold one line and
  // scroll sideways rather than wrapping onto four rows in a 280px column
  '.queen-chat-log', '.queen-chat-net', '.queen-chat-chips',
  '.queen27-hud-menu', '.queen27-hud-round-pop',
  // the views. The kanban's second lane -- the signed-in visitor's own clients
  // -- scrolls sideways exactly as the first one does, and is named here in its
  // own right rather than left to be covered by the .queen27-kanban it also
  // carries: this list is the declaration, and a scroll owner that is declared
  // only as a side effect of sharing a class is one nobody has declared.
  // It does not appear in this gate's own runs, which are signed out.
  '.queen27-cards', '.queen27-kanban', '.queen27-clients-lane', '.queen27-mission-map',
  '.queen27-factory', '.queen27-factory-bays ol',
  '.queen27-tech', '.queen27-tech-console', '.queen27-tech-map', '.queen27-tech-details',
  '.queen27-city-build-queue ol', '.queen27-hardware-foundry ol', '.queen27-city-console ol',
  '.queen27-city-head dl', '.queen27-city-build-queue dl', '.queen27-hardware-foundry dl', '.queen27-factory-command dl',
  '.queen27-activity-stream ol', '.queen27-flow-grid',
  '.queen-wars', '.queen-wars-table-scroll', '.queen-wars-ledger ol', '.queen-wars-flow',
  '.queen-widgets',
  // the sub-navigation row: one line at every width, scrolling sideways when
  // the rungs are wider than the module -- overflow-x:auto with the bar hidden,
  // which is the declaration. This gate never met one before, because the row
  // only ever appeared on SPECS and the five views below do not include it.
  '.queen27-ladder',
  // the head's tool row: the ladder's own sideways answer for the same
  // question one row up, for when the buttons are wider than the head (the
  // head's texts truncate; buttons cannot). Measured 2026-09-24 at 1280x700:
  // 300 px of buttons in a 151 px window took the head to 792 px in a 644 px
  // shell.
  '.queen27-hud-vp-tools',
].join(', ');
// designed clippers: overflow:hidden boxes whose content is meant to be cut
const CLIPPERS = [
  '.queen27-hud-orbit', '.queen27-tech-node', '.queen27-factory-bus', '.queen27-factory-machine',
  '.queen27-context-portrait', '.queen27-city-canvas', '.queen27-comb-field',
].join(', ');
// The direction chips are one sideways row on a phone shorter than 600px
// (queen-phone.css 9b), so the card box keeps the height of a card. The task
// filter row (folded until asked for, Queen.css) is one sideways row on any
// phone for the same reason: four controls never wrap into four rows.
const PHONE_DECLARED = '.queen27-hud-top, .queen27-dir-filter, .queen27-task-filter';

const PROBE = (phone) => `(() => {
  const de = document.documentElement;
  const fail = [];
  const A = (cond, msg, ...ctx) => { if (!cond) fail.push([msg, ...ctx].join(' ')); };
  const name = el => (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).join('.') : el.tagName.toLowerCase());
  const phone = ${phone ? 'true' : 'false'};

  // 1. The shell is exactly one viewport tall and does not scroll.
  A(de.scrollHeight <= de.clientHeight + 1, 'PAGE SCROLLS Y', de.scrollHeight, de.clientHeight);
  A(de.scrollWidth <= de.clientWidth + 1, 'PAGE SCROLLS X', de.scrollWidth, de.clientWidth);
  A(document.body.scrollHeight <= de.clientHeight + 1, 'BODY SCROLLS Y', document.body.scrollHeight);
  A(document.body.scrollWidth <= de.clientWidth + 1, 'BODY SCROLLS X', document.body.scrollWidth);

  // 2. The shell owns the viewport height, within one device pixel.
  const shell = document.querySelector('.queen27-page.is-shell');
  A(!!shell, 'SHELL MISSING');
  if (!shell) return { fail, counts: {} };
  A(Math.abs(shell.getBoundingClientRect().height - de.clientHeight) <= 1, 'SHELL NOT ONE VIEWPORT', Math.round(shell.getBoundingClientRect().height), de.clientHeight);
  A(getComputedStyle(document.body).paddingBottom === '0px', 'body padding-bottom SURVIVES', getComputedStyle(document.body).paddingBottom);

  // 3. The 60vh floor is gone from every section inside the shell.
  [...shell.querySelectorAll('section')].forEach(s =>
    A(getComputedStyle(s).minHeight === '0px', 'SECTION KEEPS A MIN-HEIGHT', name(s), getComputedStyle(s).minHeight));

  // 4. Exactly one view rendered.
  const body = shell.querySelector('.queen27-hud-vp-body');
  A(!!body, 'VIEWPORT BODY MISSING');
  // A view is a child of the body, or of the board stack inside it -- the body
  // is a one-cell grid, so a sub-navigation row and the view under it have to
  // arrive as a single child. Matching only direct children counted zero views
  // on any tab that had grown a row above it, and reported a rendered board as
  // a board that had not rendered at all.
  const viewSel = '.queen27-comb, .queen27-kanban, .queen27-mission-map, .queen27-factory, .queen27-tech, .queen-wars, .queen-widgets';
  const views = body
    ? [...body.children].flatMap(child =>
        child.matches(viewSel) ? [child] : [...child.querySelectorAll(':scope > ' + viewSel)])
    : [];
  A(views.length === 1, 'NOT EXACTLY ONE VIEW RENDERED', views.length);

  // 5. Every overflowing element inside the shell is a declared scroller or a designed truncation.
  const declared = ${JSON.stringify(DECLARED)} + (phone ? ', ' + ${JSON.stringify(PHONE_DECLARED)} : '');
  const clippers = ${JSON.stringify(CLIPPERS)};
  const undeclared = [];
  [...shell.querySelectorAll('*')].forEach(n => {
    if (!(n instanceof HTMLElement)) return;
    if (!(n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)) return;
    if (n.clientHeight === 0 && n.clientWidth === 0) return;         // inline boxes report 0/0
    if (n.matches(declared) || n.matches(clippers)) return;
    // inside a designed clipper everything is cut by design (the rotated orbit ring, the 3D canvas)
    if (n.parentElement && n.parentElement.closest(clippers) && shell.contains(n.parentElement.closest(clippers))) return;
    const cs = getComputedStyle(n);
    const truncates = cs.textOverflow === 'ellipsis' && cs.overflowX !== 'visible';
    const clamps = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
    if (truncates || clamps) return;
    undeclared.push(name(n) + '[' + n.scrollWidth + 'x' + n.scrollHeight + ' in ' + n.clientWidth + 'x' + n.clientHeight + ']');
  });
  A(undeclared.length === 0, 'UNDECLARED SCROLLER', undeclared.slice(0, 6).join(' | '));

  // 6. Nothing crosses the viewport edge unless a clipping ancestor INSIDE the shell clips it.
  const clipper = el => { for (let n = el.parentElement; n && n !== shell; n = n.parentElement) {
    const o = getComputedStyle(n); if (o.overflowX !== 'visible' || o.overflowY !== 'visible' || o.clipPath !== 'none') return n; } return null; };
  const escapes = [];
  [...shell.querySelectorAll('*')].forEach(el => {
    if (!(el instanceof HTMLElement)) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if ((r.right > de.clientWidth + 0.5 || r.left < -0.5 || r.bottom > de.clientHeight + 0.5 || r.top < -0.5) && !clipper(el))
      escapes.push(name(el) + '[' + Math.round(r.left) + ',' + Math.round(r.top) + '..' + Math.round(r.right) + ',' + Math.round(r.bottom) + ']');
  });
  A(escapes.length === 0, 'ESCAPES VIEWPORT', escapes.slice(0, 6).join(' | '));

  // 6b. Command rail order: every view button sits above COLLAPSE and inside
  // the rail (the six-row grid regression of #932/#975: views after the sixth
  // landed in the spacer track under COLLAPSE). data-views is the count the
  // shell rendered from commandItems; the DOM must agree with it.
  const rail = shell.querySelector('.queen27-hud-command');
  if (rail && getComputedStyle(rail).display !== 'none' && !rail.classList.contains('is-compact')) {
    const cmds = [...rail.querySelectorAll('.queen27-hud-cmd')];
    const collapse = rail.querySelector('.queen27-hud-cmd-collapse');
    const declared = Number(rail.getAttribute('data-views'));
    A(cmds.length === declared && declared > 0, 'RAIL COUNT MISMATCH', cmds.length, declared);
    const rr = rail.getBoundingClientRect();
    cmds.forEach((b, i) => {
      const r = b.getBoundingClientRect();
      A(r.height > 0 && r.top >= rr.top - 0.5 && r.bottom <= rr.bottom + 0.5, 'RAIL ITEM OUTSIDE RAIL', b.dataset.view, Math.round(r.top), Math.round(r.bottom), Math.round(rr.bottom));
      // tops never decrease: true for the one-column rail and for the two-column tiles under 760 px
      if (i > 0) A(r.top >= cmds[i - 1].getBoundingClientRect().top - 0.5, 'RAIL ITEM OUT OF ORDER', b.dataset.view);
    });
    if (collapse && getComputedStyle(collapse).display !== 'none') {
      const cr = collapse.getBoundingClientRect();
      const lastBottom = Math.max(...cmds.map(b => b.getBoundingClientRect().bottom));
      A(cr.top >= lastBottom - 0.5, 'COLLAPSE ABOVE A VIEW BUTTON', Math.round(cr.top), Math.round(lastBottom));
      A(cr.bottom <= rr.bottom + 0.5, 'COLLAPSE OUTSIDE RAIL', Math.round(cr.bottom), Math.round(rr.bottom));
    }
  }

  // 7. The status numbers are on screen. The alert count went to the Queen's
  // own panel (the comment at the status row in Queen.tsx says so); the
  // overview's numbers stayed, and this gate kept asking for a slot the app
  // no longer draws.
  const required = phone ? ['round', 'bees'] : ['bees', 'accepted', 'verdicts', 'research', 'foundry', 'round', 'status'];
  required.forEach(id => {
    const n = document.getElementById('stat-' + id);
    A(!!n, 'STATUS SLOT MISSING: ' + id);
    if (!n) return;
    const r = n.getBoundingClientRect();
    A(r.top >= -0.5 && r.bottom <= de.clientHeight + 0.5 && r.left >= -0.5 && r.right <= de.clientWidth + 0.5 && r.width > 0, 'STATUS OFF SCREEN: ' + id, Math.round(r.left), Math.round(r.right));
  });

  // 8. Positive counts, so a broken selector is not a clean page.
  const counts = {
    shell: shell ? 1 : 0,
    commands: shell.querySelectorAll('.queen27-hud-command .queen27-hud-cmd').length,
    resources: shell.querySelectorAll('.queen27-hud-res').length,
    sectors: shell.querySelectorAll('.queen27-sectors-row').length,
    view: views.length,
  };
  // 9. Bare numbers where the feeding endpoint may be silent. Asserted only in
  // --dead-api mode; collected always so a live run can print them.
  // #stat-research is not here: since #1058 it counts the .t27 corpus index,
  // which ships with the page itself, so a dead API leaves it TRUE. Listing it
  // made this probe fail on an honest number (52% with the API refused).
  const ZERO_SEL = '#stat-bees,#stat-accepted,#stat-verdicts,#stat-foundry,' +
    '.queen27-sectors-count,.queen27-column > header > span,.queen27-map-sector header b,' +
    '.queen27-hud-sector-text dd,.queen27-context-stats dd';
  const zeros = [];
  for (const n of document.querySelectorAll(ZERO_SEL)) {
    const text = (n.textContent || '').replace(/\\s+/g, ' ').trim();
    if (/^[0-9]+(\\s*\\/\\s*[0-9]+)?(\\s*%|\\s*cards|\\s*карточ\\S*)?$/i.test(text)) zeros.push((n.id ? '#' + n.id : n.className || n.tagName) + '=' + text);
  }
  const live = !!document.querySelector('#stat-status.is-live');
  // 10. Raw fetch error strings in content slots. "Failed to fetch" is the
  // engine's English string; it must never be a column's, tile's or note's
  // text (it may live in a title attribute). Asserted in --dead-api mode.
  const RAW_SEL = '.queen27-cards em,.queen27-column em,.queen27-map-sector em,.queen27-hud-menu-note b,' +
    '.queen27-factory em,.queen27-factory p,.queen27-factory span,.queen27-hud-res span,.queen27-hud-res strong';
  const rawErrors = [];
  for (const n of document.querySelectorAll(RAW_SEL)) {
    const text = (n.textContent || '').replace(/\\s+/g, ' ').trim();
    if (/fetch|http[s ]|TypeError|NetworkError|Load failed|ECONN|status \\d{3}/i.test(text)) rawErrors.push((n.className || n.tagName) + '=' + text.slice(0, 60));
  }
  // 11. A column that has cards shows at least one of them whole. The card box
  // scrolls, so a card cut by it is reachable -- but a box shorter than its
  // first card shows a slice of every card and a whole one never, and that is
  // a board nobody can read. Measured per column, not per screen: the phone
  // shows one column at a time and the first one may be empty. Asserted on
  // every size; counted so a board with no cards is not a clean pass.
  const columns = [...shell.querySelectorAll('.queen27-kanban .queen27-column')];
  let cards = 0;
  columns.forEach(col => {
    const box = col.querySelector('.queen27-cards');
    const all = box ? [...box.querySelectorAll('.queen27-card')] : [];
    if (!box || all.length === 0) return;
    cards += all.length;
    const b = box.getBoundingClientRect();
    const whole = all.filter(c => {
      const r = c.getBoundingClientRect();
      return r.height > 0 && r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5;
    });
    const first = all[0].getBoundingClientRect();
    A(whole.length > 0, 'NO WHOLE CARD IN A COLUMN',
      (col.querySelector('header')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24),
      'box ' + Math.round(b.height) + 'px, first card ' + Math.round(first.height) + 'px');
    A(b.top >= -0.5 && b.top < de.clientHeight - 40, 'CARD BOX OFF SCREEN', Math.round(b.top), de.clientHeight);
  });
  counts.cards = cards;
  // 12. On a phone every control in the head is a 44px tile, and every field
  // in it is at least 16px. The tools row was lifted to 44 and the worlds row
  // beside it was not: on main the select was 167x26, "+ Repository" 44x26 and
  // "Shared core" 93x26 at 375x812, and the select computed 9.28px, which iOS
  // answers by zooming the page into the field on focus (#1316). Counted, so a
  // head that draws no controls is not a clean pass.
  if (phone) {
    const head = shell.querySelector('.queen27-hud-vp-head');
    const controls = head ? [...head.querySelectorAll('button, select, a, input')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) : [];
    controls.forEach(el => {
      const r = el.getBoundingClientRect();
      const label = (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 20);
      A(r.width >= 43.5 && r.height >= 43.5, 'HEAD TARGET UNDER 44', el.tagName, label, Math.round(r.width) + 'x' + Math.round(r.height));
      if (el.matches('select, input')) {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        A(fs >= 16, 'HEAD FIELD UNDER 16PX', el.tagName, label, fs + 'px');
      }
    });
    counts.headControls = controls.length;
  }
  return { fail, counts, zeros, live, rawErrors, round: (document.getElementById('stat-round') || {}).textContent || '' };
})()`;

// Reaching a view is two clicks when the view is folded: its family's button on
// the rail, then its own rung on the sub-navigation row that button opens. MAP
// and FACTORY have no rail button of their own any more, and asking the rail for
// one reported them as missing rather than as folded.
const CLICK = (view) => `(() => {
  const rail = document.querySelector('.queen27-hud-command .queen27-hud-cmd[data-view="${FOLD.get(view) ?? view}"]');
  if (!rail) return false;
  rail.click();
  ${FOLD.has(view) ? `
  const rung = document.querySelector('.queen27-ladder .queen27-ladder-step[data-layer="${view}"]');
  if (!rung) return false;
  rung.click();` : ''}
  return true;
})()`;

let failures = 0;
for (const [w, h] of (DEAD ? SIZES.filter(([w]) => w === 1440 || w === 390) : SIZES)) {
  const phone = w < 600;
  await call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: phone });
  // A distinct query string forces a full load at every size rather than a
  // hash-only navigation that keeps the previous document.
  await call('Page.navigate', { url: `${ORIGIN}/?v=${w}x${h}${ROUTE}` });
  await new Promise(r => {
    const t = setTimeout(r, 20000);
    listeners.push(m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { clearTimeout(t); r(); } });
  });
  // Wait for the round slot and the data signal; the countdown reads "—" until
  // both endpoints have answered (and stays "—" with the scheduler off), so the
  // pill is the usual data signal, not the clock. At the sizes whose probe
  // asserts six sector rows, the rows are the signal: the pill answered before
  // the rows rendered on the loaded gate chain and wars counted zero
  // (qa/queen-viewport-readiness.mjs holds both ends to one predicate).
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < DATA_WAIT_MS) {
    ready = await evaluate(`(() => {
      const n = document.getElementById('stat-round');
      const round = !!n && (n.textContent || '').trim().length > 0;
      const live = !!document.querySelector('#stat-status.is-live');
      const dead = !!document.querySelector('#stat-status.is-cold');
      const rows = document.querySelectorAll('.queen27-sectors-row').length;
      const data = ${readinessDataExpr(w, phone, DEAD)};
      const rail = document.querySelector('.queen27-hud-command');
      const declared = rail ? Number(rail.getAttribute('data-views')) : 0;
      // the rail declares its own count (data-views from commandItems); the gate follows it rather than a hardcoded eight
      return round && data && declared > 0 && document.querySelectorAll('.queen27-hud-cmd').length === declared;
    })()`);
    if (ready) break;
    await wait(250);
  }
  await wait(1200);

  for (const view of VIEWS) {
    const clicked = await evaluate(CLICK(view));
    if (!clicked) {
      console.log(`  ${w}x${h} ${view.padEnd(8)} FAIL  no command button for "${view}"`);
      failures++;
      continue;
    }
    await wait(SETTLE_MS);
    // The kanban's cards come from their own endpoint, after the readiness
    // signals above: on a phone the board answered with zero cards one run in
    // two. Wait for a card the way the loop above waits for the sectors.
    if (view === 'kanban' && !DEAD) {
      const since = Date.now();
      while (Date.now() - since < DATA_WAIT_MS &&
        !(await evaluate(`document.querySelectorAll('.queen27-kanban .queen27-card').length > 0`))) {
        await wait(250);
      }
      await wait(SETTLE_MS);
    }
    // A tab is addressable in both directions, so the click must have written
    // it into the address (the comb, the default, carries no tab). Before this
    // the view changed and the address kept naming the tab you had left.
    const tabInUrl = new URLSearchParams((await evaluate('location.hash')).split('?')[1] ?? '').get('tab');
    if (tabInUrl !== (view === 'comb' ? null : view)) {
      console.log(`  ${w}x${h} ${view.padEnd(8)} FAIL  the address says tab=${tabInUrl} after clicking ${view}`);
      failures++;
      continue;
    }
    let result;
    try {
      result = await evaluate(PROBE(phone));
    } catch (e) {
      console.log(`  ${w}x${h} ${view.padEnd(8)} FAIL  ${e.message}`);
      failures++;
      continue;
    }
    const { fail, counts } = result;
    const zero = [];
    if (counts.shell !== 1) zero.push('shell');
    // one command button per rail door, the tri door standing for its screens:
    // the counts come from the same declarations the app folds by, and
    // qa/agents-spec-contract.mjs holds HUD_VIEWS itself to the modules.
    if (counts.commands !== RAIL_COMMANDS) zero.push(`commands=${counts.commands} (the rail draws ${RAIL_COMMANDS}: ${RAIL_VIEW_COUNT} doors, tri as ${TRI_BUTTONS.length} screens)`);
    if (counts.resources < 7) zero.push(`resources=${counts.resources}`);
    if (sectorsAssertedAt(w, phone, DEAD) && counts.sectors !== 6) zero.push(`sectors=${counts.sectors}`);
    if (DEAD && counts.sectors !== 0) fail.push(`sectors rendered without a board: ${counts.sectors}`);
    if (DEAD && result.live) fail.push('status pill reads LIVE with a dead API');
    if (DEAD) for (const z of result.zeros) fail.push('BARE ZERO ' + z);
    if (DEAD) for (const r of result.rawErrors || []) fail.push('RAW ERROR AS CONTENT ' + r);
    if (counts.view !== 1) zero.push(`views=${counts.view}`);
    if (!DEAD && view === 'kanban' && counts.cards < 1) zero.push('cards=0');
    // the worlds row alone is three controls; a head with fewer drew nothing
    if (phone && !(counts.headControls >= 3)) zero.push(`headControls=${counts.headControls}`);
    const problems = [...fail, ...zero.map(z => 'COUNT ' + z)];
    if (view === 'comb' || (w === 1440 && h === 900)) {
      const shot = await call('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(SHOTS, `${DEAD ? 'dead-' : ''}${w}x${h}-${view}.png`), Buffer.from(shot.data, 'base64'));
    }
    if (problems.length) {
      failures++;
      console.log(`  ${w}x${h} ${view.padEnd(8)} FAIL  ${problems.join(' ; ')}`);
    } else {
      console.log(`  ${w}x${h} ${view.padEnd(8)} PASS  round=${result.round} cmd=${counts.commands} res=${counts.resources} sectors=${counts.sectors}${view === 'kanban' ? ` cards=${counts.cards}` : ''}${phone ? ` head=${counts.headControls}` : ''}`);
    }
  }
  // The other direction: an address changed from outside (Back, a link, a
  // script) moves the shell. Before this the tab was read once, on mount, and
  // a later ?tab= was ignored.
  // With the gate scoped to one view there is no second non-comb tab to hop
  // to, so the hop goes through the bare route: the hash always changes
  // twice, and the check stays a real one rather than re-setting the value
  // the click loop already left behind.
  const outside = VIEWS.find(v => v !== 'comb') ?? VIEWS[0];
  await evaluate(`location.hash = ${JSON.stringify(ROUTE)}`);
  await wait(SETTLE_MS);
  await evaluate(`location.hash = ${JSON.stringify(`${ROUTE}?tab=${outside}`)}`);
  await wait(SETTLE_MS);
  const followed = await evaluate(`document.querySelector('main[data-view]')?.getAttribute('data-view') ?? null`);
  if (followed !== outside) {
    failures++;
    console.log(`  ${w}x${h} address  FAIL  the hash says tab=${outside}, the shell shows ${followed}`);
  } else {
    console.log(`  ${w}x${h} address  PASS  a hash set from outside moved the shell to ${outside}`);
  }
}

if (errors.length) {
  console.error(`\n  ${errors.length} uncaught exception(s) while probing:`);
  for (const e of errors.slice(0, 5)) console.error(`    ${e.split('\n')[0]}`);
  failures++;
}

cleanup();
if (failures) {
  console.error(`\n  Queen viewport contract: FAIL (${failures} size/view combination(s))`);
  process.exit(1);
}
console.log(`\n  Queen viewport contract: PASS (${SIZES.length} sizes × ${VIEWS.length} views, screenshots in ${SHOTS})`);
process.exit(0);
