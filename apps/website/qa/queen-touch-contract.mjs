// Queen touch contract: a tap on the comb picks the cell under the finger, and
// a touch drag orbits without picking. Headless Chrome with touch emulation,
// CDP Input.dispatchTouchEvent, the served dist/ (build first, or --no-build).
// Written before the fix and shown to fail against the code it was written for.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
if (!process.argv.includes('--no-build')) {
  console.log('  building…');
  execSync('npx vite build', { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
}
const CHROMES = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const CHROME = CHROMES.find(p => existsSync(p));
// A missing browser is NOT MEASURED (rc 2), never a pass: a contract that
// exits 0 without running reads as green to every caller that checks codes.
if (!CHROME) { console.log('  Queen touch contract: NOT MEASURED (no Chrome found; set CHROME_PATH)'); process.exit(2); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let f = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'touch-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', '--mute-audio', '--window-size=1272,806', ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const browserWs = await new Promise((resolve, reject) => { let buf = ''; const t = setTimeout(() => reject(new Error(`Chrome never announced a debugging port in 30 s; its last stderr:\n${buf.slice(-1500)}`)), 30000); chrome.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); resolve(m[1]); } }); });
const ws = new WebSocket(browserWs); await new Promise(r => ws.addEventListener('open', r));
let nextId = 0; const pending = new Map();
ws.addEventListener('message', ev => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); } });
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const call = (m, p) => send(m, p, sessionId);
const evaluate = async expr => { const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('probe failed: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)); return r.result.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const cleanup = () => { try { ws.close(); } catch {} chrome.kill(); server.close(); };

await call('Page.enable');
// The sector rows draw GET /queen/public-board, whose default host is gone: answer it with a
// fixed six-column board (one card each), as qa/queen-viewport-contract.mjs does.
const BOARD = (() => {
  const keys = ['backlog', 'blocked', 'running', 'review', 'done', 'dropped'];
  const cards = keys.map((column, i) => ({ number: 990001 + i, title: `fixture ${column}`, column, criteria: 0, needs: [] }));
  const pulse = { rounds: 0, bees: 0, verdicts: 0, lastRoundAt: null, roundSeconds: null };
  return { repo: 'gHashTag/t27', columns: keys.map(key => ({ key, title: key, blurb: '' })), cards, pulse };
})();
await call('Fetch.enable', { patterns: [{ urlPattern: '*/queen/public-board*', requestStage: 'Request' }] });
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.sessionId !== sessionId || msg.method !== 'Fetch.requestPaused') return;
  const responseHeaders = [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }];
  const body = Buffer.from(JSON.stringify(BOARD)).toString('base64');
  call('Fetch.fulfillRequest', { requestId: msg.params.requestId, responseCode: 200, responseHeaders, body }).catch(() => {});
});
await call('Emulation.setDeviceMetricsOverride', { width: 1272, height: 806, deviceScaleFactor: 1, mobile: true });
await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await call('Page.navigate', { url: `${ORIGIN}/?touch=1${process.env.QUEEN_ENGINE ? '&engine=' + process.env.QUEEN_ENGINE : ''}#/queen` });
// Readiness names its parts, and a page that does not ANSWER is not a page
// that is not ready. 2026-10-02: with swap full (load average 560), one
// Runtime.evaluate on the comb took minutes, and the old one-line FAIL read as
// "the board lost an element" -- it had not; it was never asked. A probe that
// gets no answer in 20 s ends the run as NOT MEASURED (rc 2), with the load.
// Since #1206 the comb on #/queen is the SHARED catalog (QueenCatalogHive),
// and the old CONTEXT panel is not mounted there at all: a tap opens the
// catalog's own `.queen-catalog-detail`. This contract still waited for the
// old panel, and nobody saw, because nothing ran it. The legacy panel stays as
// the fallback for an engine that draws the comb without the catalog.
const READY = `({ rows: document.querySelectorAll('.queen27-sectors-row').length, canvas: !!document.querySelector('.queen27-comb-field canvas'), unit: !!document.querySelector('[data-catalog-map]') || !!document.querySelector('.queen27-context-unit-text') })`;
const answered = expr => Promise.race([evaluate(expr), wait(20000).then(() => { throw new Error('starved'); })]);
let ready = false, parts = null;
for (let i = 0; i < 60 && !ready; i++) {
  await wait(500);
  try { parts = await answered(READY); } catch (error) {
    if (error.message !== 'starved') throw error;
    const { loadavg } = await import('node:os');
    console.log(`  Queen touch contract: NOT MEASURED (the page did not answer a probe in 20 s; load average ${loadavg().map(n => n.toFixed(0)).join(' ')})`);
    cleanup(); process.exit(2);
  }
  ready = parts.rows === 6 && parts.canvas && parts.unit;
}
if (!ready) { const seen = await answered(`JSON.stringify({ width: innerWidth, phone: matchMedia('(max-width: 900px)').matches, hash: location.hash, context: !!document.querySelector('.queen27-context'), contextClass: document.querySelector('[class*="queen27-context"]')?.className ?? null, page: document.querySelector('.queen27-page')?.className ?? null })`).catch(() => 'no answer'); console.log(`  Queen touch contract: FAIL (page never became ready - sectors ${parts?.rows ?? '?'}/6, comb canvas ${parts?.canvas ? 'yes' : 'NO'}, catalog or context ${parts?.unit ? 'yes' : 'NO'}; page ${seen})`); cleanup(); process.exit(1); }
await wait(1500);
const rect = await evaluate(`(() => { const r = document.querySelector('.queen27-comb-field canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
const selected = () => evaluate(`(() => { const d = document.querySelector('.queen-catalog-detail'); if (document.querySelector('[data-catalog-map]')) return d ? (d.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80) : ''; const u = document.querySelector('.queen27-context-unit-text'); const dd = document.querySelector('.queen27-context-stats dd'); return ((u && u.textContent) || '').replace(/\\s+/g, ' ').trim().slice(0, 80) + ' | ' + ((dd && dd.textContent) || '').trim(); })()`);
const tap = async (x, y) => { await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await wait(40); await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(140); };

const before = await selected();
const picks = new Set();
for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 8; gx++) {
  const x = rect.x + rect.w * (0.18 + 0.64 * (gx / 7));
  const y = rect.y + rect.h * (0.10 + 0.40 * (gy / 4));
  await tap(x, y);
  const s = await selected();
  if (s !== before && !/THE QUEEN|КОРОЛЕВА/i.test(s)) picks.add(s);
  // The catalog flies the camera to what was picked, so the next tap would
  // land inside the same cell. A person closes the detail first; so does this.
  if (await evaluate(`(() => { const c = document.querySelector('.queen-catalog-close'); if (c) c.click(); return !!c; })()`)) await wait(900);
}
// A touch drag must orbit, not pick: the selection after the drag equals the one before it.
const beforeDrag = await selected();
const sx = rect.x + rect.w * 0.5, sy = rect.y + rect.h * 0.3;
await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy }] });
for (let k = 1; k <= 8; k++) { await call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + k * 14, y: sy + k * 4 }] }); await wait(25); }
await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await wait(160);
const afterDrag = await selected();
const pageMoved = await evaluate(`document.documentElement.scrollTop !== 0 || document.documentElement.scrollLeft !== 0`);
cleanup();
const fails = [];
if (picks.size < 3) fails.push(`taps picked ${picks.size} distinct cells (need >= 3): ${[...picks].map(p => JSON.stringify(p.slice(0, 50))).join(', ') || 'none'}`);
if (afterDrag !== beforeDrag) fails.push('a touch drag changed the pick');
if (pageMoved) fails.push('a touch drag scrolled the page');
if (fails.length) { for (const f of fails) console.log('  ✗ ' + f); console.log(`  Queen touch contract: FAIL (${fails.length})`); process.exit(1); }
console.log(`  Queen touch contract: PASS (taps picked ${picks.size} distinct cells; a drag kept "${afterDrag.slice(0, 40)}")`);
