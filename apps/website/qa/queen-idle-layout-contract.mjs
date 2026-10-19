// Queen idle-reason layout contract, in a real browser. Why free bees are idle
// used to be a line floating over the top of the map (queen27-hud-idle), and it
// spent four rounds being moved out from under something: on a phone it lay over
// TRI's screen tabs and the specs view's first disclosure, on a landscape phone
// over every map tool, on a desktop over the head's bottom rule, and last over
// the SPECS ladder and the Explorer's search field beneath it (measured
// 2026-09-16 and 2026-09-20 with trusted input). A notification that has to be
// re-placed every time the page gains a row is in the wrong place, so on
// 2026-09-20 it was removed: the reason belongs to the round, the round's BEES
// tile is in the header, and the tile was already printing the same words. It
// now carries all of it -- the head in the line, the sentence in `title`, and
// the example issue as a link. The words are qa/queen-idle-reason-contract.mjs;
// this is where they are drawn.
//
// Builds the site (unless --no-build; --dist <dir> serves another build) and
// drives the installed Chrome over CDP. The build is served AS https://t27.ai
// through CDP Fetch, because the identity chip, and so the head's height, is
// only its real size there; /queen/status is answered with the committed
// healthy-idle snapshot, decidedAt moved to 30 s ago on every poll. Every tap
// claimed below is trusted CDP input after a hit test.
//   0  at every size: no floating line exists, and the map's body starts where
//      the head ends -- nothing is inserted between them
//   1  1440x900 and 1280x720, en and ru: the reason is drawn in the BEES tile,
//      unclipped, inside the header's box, and reachable by a hit test
//   2  1440x900 with the rail collapsed by a trusted click, then 390x844: the
//      tile is inside the window
//   3  390x844, en and ru: the page is one screen, the reason folds away with
//      every other tile's sub-line (it is still in the page for hover and for a
//      screen reader), and TRI's screen tabs and the specs view's first
//      disclosure are topmost at all five sample points; in en a trusted tap on
//      TRI's second tab switches it, and one on the disclosure opens it
//   4  844x390: every map tool and the identity chip inside the window is
//      topmost, and a trusted tap on the foundation layer toggles it
//   5  /queen/status starts failing: the tile claims no reason
//   node qa/queen-idle-layout-contract.mjs [--no-build] [--dist <dir>]
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const argAt = (flag) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : null; };
const DIST = resolve(argAt('--dist') ?? join(ROOT, 'dist'));
const CHROME = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) { console.log('  no Chrome found — skipping the idle-reason layout check.'); process.exit(0); }
if (!process.argv.includes('--no-build') && !argAt('--dist')) { console.log('  building…'); execSync('npx vite build', { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] }); }

const SNAP = JSON.parse(readFileSync(new URL('./fixtures/queen-status/healthy-idle-2026-09-15T1250Z.json', import.meta.url), 'utf8'));
const ORIGIN = 'https://t27.ai';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const distFile = (pathname) => { const p = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, ''); const f = join(DIST, p); return !f.startsWith(DIST) || p === '/' || !existsSync(f) ? join(DIST, 'index.html') : f; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const fails = [];
let checks = 0;
const check = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗'} ${msg}`); };

const profile = mkdtempSync(join(tmpdir(), 'queen-idle-layout-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };
const watchdog = setTimeout(() => { console.log('  ✗ watchdog: 20 min'); cleanup(); process.exit(2); }, 20 * 60 * 1000);

let statusFails = false;
try {
  const wsUrl = await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('no devtools port')), 60000); let buf = ''; chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); res(m[1]); } }); });
  const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method) listeners.forEach((f) => f(m)); };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (m, p) => send(m, p, sessionId);
  listeners.push((m) => {
    if (m.sessionId !== sessionId || m.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = m.params;
    if (/\/queen\/status/.test(request.url)) {
      const s = structuredClone(SNAP); const decided = new Date(Date.now() - 30000).toISOString(); s.lastTick.decidedAt = decided; if (s.queue) s.queue.observedAt = decided;
      const body = statusFails ? '{"error":"bad gateway"}' : JSON.stringify(s);
      call('Fetch.fulfillRequest', { requestId, responseCode: statusFails ? 502 : 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(body).toString('base64') }).catch(() => {});
      return;
    }
    if (request.url.startsWith(`${ORIGIN}/`)) {
      const f = distFile(new URL(request.url).pathname);
      call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: MIME[extname(f)] || 'application/octet-stream' }], body: readFileSync(f).toString('base64') }).catch(() => {});
      return;
    }
    call('Fetch.continueRequest', { requestId }).catch(() => {});
  });
  await call('Runtime.enable'); await call('Page.enable');
  await call('Fetch.enable', { patterns: [{ urlPattern: `${ORIGIN}/*` }, { urlPattern: '*queen/status*' }] });

  const evaluate = async (expr) => { const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const until = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await evaluate(expr); if (v) return v; } catch {} await wait(500); } return null; };
  const size = (w, h) => call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 || h <= 500 });
  const tap = async (x, y) => { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await call('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); };
  // #1711: the tile answers with the working count alone -- digits to the end, no "/capacity" fraction.
  const ready = `(() => { const b = document.getElementById('stat-bees'); return !!document.querySelector('main[data-view]') && !!b && /^\\s*\\d+\\s*$/.test(b.textContent); })()`;
  const load = async (w, h, lang, tag) => {
    await size(w, h);
    await call('Page.navigate', { url: `${ORIGIN}/?lang=${lang}&idle-layout=${process.pid}-${tag}#/queen` });
    if (!(await until(ready, 150000))) throw new Error(`the Queen never rendered at ${w}x${h} ${lang}`);
    // The reason is a poll behind the count: the tile renders with the bees, the
    // words arrive with the round it explains.
    await until(`!!document.querySelector('.queen27-hud-res-bees .queen27-hud-idle-why[data-idle]')`, 30000);
    await wait(2500);
  };
  const view = async (name) => {
    await evaluate(`location.hash = ${JSON.stringify(name === 'comb' ? '#/queen' : `#/queen?tab=${name}`)}; true`);
    await until(`document.querySelector('main[data-view]')?.getAttribute('data-view') === ${JSON.stringify(name)}`, 20000);
    await wait(name === 'comb' ? 1500 : 3000);
  };
  // In-page geometry: a box, and how many of five points of an element are the element itself.
  const GEOM = `const R = (e) => { if (!e) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display === 'none' || r.width === 0 ? null : { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const own = (e) => { const r = e.getBoundingClientRect(); return [[.5,.5],[.15,.2],[.85,.2],[.15,.8],[.85,.8]].filter(([fx, fy]) => { const u = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); return !!u && (u === e || e.contains(u)); }).length; };
    const centre = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };`;
  // `subs` is every tile's sub-line, drawn or not: on a narrow screen the header
  // folds them all away together, and "all or none" is the invariant — a reason
  // that survived that fold would be the one line left shouting in a row of
  // names and numbers.
  const boxes = () => evaluate(`(() => { ${GEOM} const why = document.querySelector('.queen27-hud-res-bees .queen27-hud-idle-why');
    const subs = [...document.querySelectorAll('.queen27-hud-top > .queen27-hud-res > span:not(.queen27-hud-pill)')];
    return { why: R(why), tile: R(document.querySelector('.queen27-hud-res-bees')), top: R(document.querySelector('.queen27-hud-top')),
      head: R(document.querySelector('.queen27-hud-vp-head')), body: R(document.querySelector('.queen27-hud-vp-body')),
      floating: !!document.querySelector('.queen27-hud-idle'),
      inPage: !!why, drawnSubs: subs.filter((e) => !!R(e)).length, subs: subs.length,
      clipped: !!why && (why.scrollWidth > why.clientWidth + 1 || why.scrollHeight > why.clientHeight + 1),
      own: why && R(why) ? own(why) : null, title: why ? why.getAttribute('title') : null,
      text: why ? why.textContent.trim() : null, iw: innerWidth, ih: innerHeight, sh: document.documentElement.scrollHeight }; })()`);
  // 0, asserted wherever the page is measured: the float is gone, and the body
  // starts where the head ends.
  const noFloat = (b, where) => {
    check(!b.floating, `${where}: no line floats over the map (.queen27-hud-idle is not in the page)`);
    // Not "the body starts at the head's bottom": on a desktop the head floats
    // over the map and the body runs under it, and only on a phone do the two
    // sit in flow. What must hold either way is that nothing has been inserted
    // between them -- a row of its own would push the body below the head, which
    // is exactly what the floating line did on a phone.
    check(!!b.head && !!b.body && b.body.t <= b.head.b + 1, `${where}: nothing is inserted between the head and the body (head to ${b.head?.b}, body from ${b.body?.t})`);
  };

  // 1. desktop
  for (const lang of ['en', 'ru']) {
    await load(1440, 900, lang, `desk-${lang}`);
    for (const [w, h] of [[1440, 900], [1280, 720]]) {
      await size(w, h); await wait(1500);
      const b = await boxes();
      const where = `${w}x${h} ${lang}`;
      noFloat(b, where);
      check(!!b.why && !!b.tile && b.why.l >= b.tile.l - 1 && b.why.r <= b.tile.r + 1 && b.why.t >= b.tile.t - 1 && b.why.b <= b.tile.b + 1 && !b.clipped, `${where}: the reason is drawn inside the BEES tile, unclipped ("${(b.text ?? '').slice(0, 60)}")`);
      check(!!b.why && b.why.l >= 0 && b.why.r <= b.iw && b.why.t >= 0 && b.why.b <= b.ih && b.own === 5, `${where}: it is on screen and topmost at 5 of 5 points (got ${b.own})`);
      check(!!b.title && b.title.length > (b.text ?? '').length, `${where}: the whole sentence is on the tile for hover and for a screen reader ("${(b.title ?? '').slice(0, 70)}")`);
    }
    if (lang !== 'en') continue;
    // 2. collapsed on a desktop, then narrowed to a phone
    await size(1440, 900); await wait(1500);
    const c = await evaluate(`(() => { ${GEOM} const b = document.querySelector('nav.queen27-hud-command > button.queen27-hud-cmd-collapse'); return b ? { ...centre(b), own: own(b) } : null; })()`);
    check(!!c && c.own > 0, 'the rail\'s collapse button is reachable at 1440x900');
    if (c?.own) {
      await tap(c.x, c.y);
      check(!!(await until(`!!document.querySelector('main.is-command-collapsed')`, 5000)), 'a trusted click collapses the rail');
      await size(390, 844); await wait(2500);
      const b = await boxes();
      check(!!b.tile && b.tile.l >= 0 && b.tile.r <= b.iw + 0.5, `collapsed at 1440, then 390x844: the BEES tile is inside the window (${b.tile?.l}-${b.tile?.r} of ${b.iw})`);
      await size(1440, 900); await wait(800);
      const again = await evaluate(`(() => { const b = document.querySelector('nav.queen27-hud-command > button.queen27-hud-cmd-collapse'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (again) { await tap(again.x, again.y); await wait(800); }
    }
  }

  // 3. phone portrait
  for (const lang of ['en', 'ru']) {
    await load(390, 844, lang, `phone-${lang}`);
    await view('specs');
    await until(`!!document.querySelector('.queen27-hud-vp-body details > summary')`, 20000);
    const specs = await evaluate(`(() => { ${GEOM} const s = document.querySelector('.queen27-hud-vp-body details > summary'); return s ? { own: own(s), ...centre(s), open: s.parentElement.open, text: s.textContent.trim().slice(0, 30) } : null; })()`);
    const b = await boxes();
    const where = `390x844 ${lang}`;
    noFloat(b, where);
    check(b.inPage && (b.drawnSubs === 0 || b.drawnSubs === b.subs), `${where}: the reason is in the page, and the tiles' ${b.subs} sub-lines are all drawn or all folded away together (${b.drawnSubs} drawn)`);
    check(b.sh <= b.ih && !!b.tile && b.tile.l >= 0 && b.tile.r <= b.iw, `${where}: one screen (document ${b.sh} of ${b.ih}), the BEES tile inside the window`);
    check(specs?.own === 5, `${where}: the specs view's first disclosure ("${specs?.text}") is topmost at 5 of 5 points (got ${specs?.own})`);
    if (lang === 'en' && specs?.own) {
      await tap(specs.x, specs.y); await wait(1200);
      check((await evaluate(`document.querySelector('.queen27-hud-vp-body details > summary')?.parentElement.open`)) !== specs.open, `${where}: a trusted tap on that disclosure opens it`);
    }
    await view('tri');
    await until(`document.querySelectorAll('button.queen27-tri-screen').length > 1`, 20000);
    const tabs = await evaluate(`(() => { ${GEOM} return [...document.querySelectorAll('button.queen27-tri-screen')].map((t) => ({ text: t.textContent.trim(), own: own(t), ...centre(t), active: t.classList.contains('is-active') })); })()`);
    check(tabs.length > 1 && tabs.every((t) => t.own === 5), `${where}: all ${tabs.length} of TRI's screen tabs are topmost at 5 of 5 points (${tabs.map((t) => `${t.text} ${t.own}`).join(', ')})`);
    if (lang === 'en' && tabs.length > 1) {
      const target = tabs.find((t) => !t.active) ?? tabs[1];
      await tap(target.x, target.y);
      // TRI's screens fetch before they mark themselves current, so the class
      // arrives a moment after the tap rather than with it.
      await until(`document.querySelector('button.queen27-tri-screen.is-active')?.textContent.trim() === ${JSON.stringify(target.text)}`, 10000);
      const active = await evaluate(`document.querySelector('button.queen27-tri-screen.is-active')?.textContent.trim() ?? null`);
      check(active === target.text, `${where}: a trusted tap on "${target.text}" switches TRI to it (active: "${active}")`);
    }
  }

  // 4. phone landscape
  await load(844, 390, 'en', 'landscape');
  await view('comb');
  noFloat(await boxes(), '844x390');
  const land = await evaluate(`(() => { ${GEOM}
    const els = [...document.querySelectorAll('.queen27-hud-vp-tools button, .queen27-hud-vp-tools .queen27-identity')].filter((e) => { const r = R(e); return r && r.l >= 0 && r.r <= innerWidth && r.t >= 0 && r.b <= innerHeight; });
    const layer = document.querySelector('.queen27-hud-vp-tools button[data-layer]');
    return { items: els.map((e) => ({ k: e.getAttribute('data-tool') || e.getAttribute('data-layer') || e.className.split(' ')[0], own: own(e) })), layer: layer ? { ...centre(layer), own: own(layer), pressed: layer.getAttribute('aria-pressed') } : null }; })()`);
  check(land.items.length >= 5 && land.items.every((i) => i.own === 5), `844x390: all ${land.items.length} map tools and the identity chip are topmost at 5 of 5 points (${land.items.filter((i) => i.own !== 5).map((i) => `${i.k} ${i.own}`).join(', ') || 'none short'})`);
  if (land.layer?.own) {
    await tap(land.layer.x, land.layer.y); await wait(1000);
    const pressed = await evaluate(`document.querySelector('.queen27-hud-vp-tools button[data-layer]')?.getAttribute('aria-pressed')`);
    check(pressed !== land.layer.pressed, `844x390: a trusted tap on the foundation layer toggles it (${land.layer.pressed} -> ${pressed})`);
  } else check(false, '844x390: the foundation layer button is reachable');

  // 5. the status endpoint fails: the kept status explains nothing
  await load(1440, 900, 'en', 'failing');
  check(!!(await evaluate(`!!document.querySelector('.queen27-hud-res-bees .queen27-hud-idle-why[data-idle]')`)), 'live: the tile carries a reason');
  statusFails = true;
  const gone = await until(`!document.querySelector('.queen27-hud-res-bees .queen27-hud-idle-why[data-idle]') && !document.querySelector('#stat-status.is-live')`, 30000);
  const bees = await evaluate(`document.querySelector('.queen27-hud-res-bees .queen27-hud-idle-why')?.textContent.trim() ?? null`);
  check(!!gone && !/nothing to choose|round stale/.test(bees ?? ''), `after /queen/status fails: the BEES tile claims no reason (sub-line "${bees}")`);
} catch (e) {
  check(false, `harness: ${e && e.message}`);
}
clearTimeout(watchdog);
cleanup();
if (fails.length) { console.log(`Queen idle-reason layout contract: FAIL (${fails.length} of ${checks})`); process.exit(1); }
console.log(`Queen idle-reason layout contract: PASS (${checks} checks)`);
