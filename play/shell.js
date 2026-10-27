// shell.js -- the player's Term tab: a terminal over the compiler already in the page.
//
// Everything the terminal knows and says is in player.t27: its commands (SHELL_COMMANDS, each a
// key of COMMANDS below), the backends, the commands for a machine with a toolchain, the native
// tools it recognises, and every phrase it prints (SAY_*). This file fills the {names} and lays
// the columns out; scripts/play-from-spec.mjs refuses the build when a command or a phrase is on
// one side and not the other. It is JavaScript written by hand for one measured reason: gen-js
// lowers declarations, not function bodies, so this logic cannot yet be a t27 spec compiled by
// the compiler it drives.
//
// Every line printed comes from the page's own t27_compiler.wasm (ctx.analyze), from the spec's
// test blocks run by ./t27run.js, or from the JavaScript the compiler emitted. A browser can run
// one of the seven outputs, JavaScript (RUNNERS); for the others, run prints the command for a
// machine that has the toolchain and never a result it did not see.
//
// No DOM work at the top level: the generator imports this file to read COMMANDS and RUNNERS, and
// its test runs every command through makeShell against the committed spec.

import { runSpec } from './t27run.js'

const html = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const fmt = (n) => Number(n).toLocaleString('en-US')
const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - String(s).length))
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
const TONE = [['SAY_ERR_', 'r'], ['SAY_WARN_', 'y'], ['SAY_NOTE_', 'dim']]

/** A SAY_ template with its {names} filled; a name left unfilled is a bug, and says so. */
export function fill(template, vars = {}) {
  return String(template).replace(/\{([a-z]+)\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`"${template}" needs {${k}}`)
    return vars[k]
  })
}

// The emitted JavaScript, imported as it is. Its exports are printed; nothing is called.
export async function importJs(code, cfg) {
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))
  try {
    const mod = await import(url)
    const names = Object.keys(mod)
    return fill(cfg.SAY_IMPORT_OK, { count: names.length }) + '\n' + names.map((k) => {
      const v = mod[k]
      const s = typeof v === 'function' ? `function(${v.length})` : typeof v === 'bigint' ? `${v}n` : (() => { try { return JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? `${x}n` : x)) } catch { return String(v) } })()
      return `  ${k} = ${String(s).slice(0, 160)}`
    }).join('\n')
  } catch (e) {
    return fill(cfg.SAY_ERR_IMPORT, { error: e.message })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// The file a backend's output is saved as: the spec's stem and BACKEND_EXTS. Verilog is saved under
// its module's name, which is what verilator's DECLFILENAME lint expects.
export function fileName(cfg, backend, code, stem) {
  const m = /^\s*module\s+([A-Za-z_][\w$]*)/m.exec(code)
  return (backend.startsWith('verilog') && m ? m[1] : stem) + cfg.BACKEND_EXTS[cfg.BACKENDS.indexOf(backend)]
}

// The facts every tab and t27c check show, in BACKENDS order; the spec's test blocks are run by
// ./t27run.js, which never counts a skip as a pass.
export function factsOf(cfg, source, analysis) {
  const targets = analysis.targets ?? {}
  const backends = cfg.BACKENDS.filter((k) => k in targets).map((k) => ({ name: k, ok: targets[k].ok !== false && typeof targets[k].code === 'string' && targets[k].code.length > 0, bytes: targets[k].bytes ?? (targets[k].code ?? '').length, code: targets[k].code ?? '', error: targets[k].error }))
  let tests = null
  try { tests = runSpec(analysis.ast) } catch (e) { tests = { error: e.message, results: [], pass: 0, fail: 0, skip: 0 } }
  return {
    bytes: analysis.sourceBytes ?? new TextEncoder().encode(source).length,
    lines: analysis.sourceLines ?? source.split('\n').length,
    tokens: analysis.tokenCount ?? (analysis.tokens ?? []).length,
    kinds: new Set((analysis.tokens ?? []).map((t) => t.kind)).size,
    nodes: analysis.nodeCount ?? 0,
    depth: analysis.astDepth ?? 0,
    topLevel: analysis.topLevel ?? (analysis.ast?.children ?? []).length,
    discarded: (analysis.discarded?.length ?? 0) + (analysis.lexerDiscarded?.length ?? 0) + (analysis.swallowed?.length ?? 0),
    typeOk: analysis.typecheck?.ok === true,
    typeErrors: analysis.typecheck?.errors ?? [],
    hirOk: analysis.hir?.ok !== false,
    hirBytes: (analysis.hir?.text ?? '').length,
    astError: analysis.astError ?? null,
    backends,
    tests,
  }
}

// The backends whose output this page can execute, and how.
export const RUNNERS = { js: importJs }

// --- the commands: (sh, args) -> printed lines -------------------------------------------------
export const COMMANDS = {
  help(sh) {
    const c = sh.cfg
    const usage = c.SHELL_COMMANDS.map((k, i) => k + (c.SHELL_ARGS[i] ? ' ' + c.SHELL_ARGS[i] : ''))
    const width = Math.max(...usage.map((u) => u.length)) + 2
    usage.forEach((u, i) => sh.line(`<b>${html(pad(u, width))}</b><i>${html(c.SHELL_HELP[i])}</i>`))
    sh.say('SAY_NOTE_BACKENDS', { backends: c.BACKENDS.join(' ') })
    sh.say('SAY_NOTE_ALSO', { alias: fill(c.SHELL_GEN_ALIAS, { backend: '<backend>' }) })
  },
  ls(sh) {
    const { files } = sh.compile()
    const width = Math.max(...files.map((f) => f.name.length)) + 2
    for (const f of files) sh.line(`${f.ok ? html(pad(f.name, width)) : `<s>${html(pad(f.name, width))}</s>`}${pad(f.ok ? fmt(f.text.length) : '-', 8)}<i>${html(f.backend ?? sh.word('SAY_SPEC_FILE'))}</i>${f.ok ? '' : ` <span class="r">${html(sh.word('SAY_FAILED'))}</span>`}`)
  },
  cat(sh, [name]) {
    const f = sh.file(name, 'cat')
    if (!f) return
    if (!f.ok) return sh.say('SAY_ERR_NOT_EMITTED', { backend: f.backend, error: f.error || sh.word('SAY_FAILED') })
    sh.block(f.html())
  },
  save(sh, [name]) {
    const f = sh.file(name, 'save')
    if (!f) return
    if (!f.ok) return sh.say('SAY_ERR_NOT_EMITTED', { backend: f.backend, error: f.error || sh.word('SAY_FAILED') })
    sh.ctx.download(f.text, f.name)
    sh.say('SAY_SAVED', { file: f.name, bytes: fmt(f.text.length) })
  },
  lang(sh, [want]) {
    if (want) { const b = sh.pick(want, 'lang'); if (!b) return; sh.setBackend(b) }
    const c = sh.cfg
    c.BACKENDS.forEach((b, i) => sh.line(`${b === sh.backend ? '<b class="g">*</b>' : ' '} ${html(pad(b, 13))}${html(pad(c.BACKEND_NAMES[i], 15))}<i>${html(c.BACKEND_EXTS[i])}${c.RUNS_IN_BROWSER.includes(b) ? ', ' + html(sh.word('SAY_RUNS_HERE')) : ''}</i>`))
  },
  't27c gen'(sh, [want]) {
    const b = want ? sh.pick(want, 't27c gen') : sh.backend
    if (!b) return
    sh.setBackend(b)
    const { ms, files } = sh.compile()
    const f = files.find((x) => x.backend === b)
    if (!f || !f.ok) return sh.say('SAY_ERR_NOT_EMITTED', { backend: b, error: f?.error || sh.word('SAY_FAILED') })
    sh.say('SAY_NOTE_GEN', { file: f.name, bytes: fmt(f.text.length), lang: sh.nameOf(b), ms: ms.toFixed(0) })
    sh.block(f.html())
  },
  't27c test'(sh) {
    const { facts } = sh.compile()
    const t = facts.tests
    if (t.error) return sh.say('SAY_ERR_RUNNER', { error: t.error })
    const mark = { pass: '<b class="g">&#10003;</b>', fail: '<b class="r">&#10007;</b>', skip: '<i>&#8211;</i>' }
    for (const r of t.results) {
      const failed = r.status === 'fail' ? (r.asserts ?? []).filter((a) => !a.ok).map((a) => `line ${a.line}${a.detail ? `: ${a.detail}` : ''}`) : []
      const why = r.reason || failed.join('; ')
      sh.line(`${mark[r.status]} ${html(pad(r.kind, 10))}${html(r.name)} <i>${html(fill(sh.cfg.SAY_ASSERTS, { count: (r.asserts ?? []).length }))}${why ? ' &middot; ' + html(why) : ''}</i>`)
    }
    if (!t.results.length) sh.say('SAY_NOTE_NO_TESTS')
    sh.line(`<b class="${t.fail ? 'r' : 'g'}">${html(fill(sh.cfg.SAY_TESTS, { pass: t.pass, fail: t.fail, skip: t.skip }))}</b>`)
    sh.line(`<i>${html(sh.cfg.TESTS_NOTE)}</i>`)
  },
  't27c check'(sh) {
    const { facts: f, ms } = sh.compile()
    const ok = f.backends.filter((b) => b.ok)
    const c = sh.cfg
    // One row per compile stage but the last (t27c test is that one): STAGES and SAY_CHECK.
    const rows = [
      [true, { bytes: fmt(f.bytes), lines: fmt(f.lines) }],
      [!f.discarded, { tokens: fmt(f.tokens), kinds: f.kinds, dropped: f.discarded }],
      [!f.astError, { nodes: fmt(f.nodes), depth: f.depth, top: f.topLevel }, f.astError],
      [f.typeOk, { errors: f.typeErrors.length }, f.typeErrors[0]],
      [f.hirOk, { bytes: fmt(f.hirBytes) }],
      [ok.length === f.backends.length, { ok: ok.length, all: f.backends.length, bytes: fmt(ok.reduce((s, b) => s + b.bytes, 0)) }],
    ]
    rows.forEach(([good, vars, why], i) => sh.line(`<i>${html(pad(c.STAGES[i], 10))}</i><span class="${good ? 'g' : 'r'}">${html(fill(c.SAY_CHECK[i], vars))}</span>${why ? ` <span class="r">${html(why)}</span>` : ''}`))
    sh.say('SAY_NOTE_CHECKED', { ms: ms.toFixed(0) })
  },
  async run(sh, [want]) {
    const b = want ? sh.pick(want, 'run') : sh.backend
    if (!b) return
    sh.setBackend(b)
    const { files } = sh.compile()
    const f = files.find((x) => x.backend === b)
    if (!f || !f.ok) return sh.say('SAY_ERR_NOT_EMITTED', { backend: b, error: f?.error || sh.word('SAY_FAILED') })
    const runner = sh.runners[b]
    if (runner) {
      sh.say('SAY_NOTE_IMPORTING', { file: f.name })
      return sh.block(html(await runner(f.text, sh.cfg)), 'out')
    }
    const command = fill(sh.cfg.BACKEND_RUN_LOCAL[sh.cfg.BACKENDS.indexOf(b)], { file: f.name })
    sh.say('SAY_WARN_NOT_HERE', { lang: sh.nameOf(b), tool: command.split(' ')[0] })
    for (const step of sh.cfg.SAY_LOCAL_STEPS) sh.line(html(fill(step, { file: f.name, command })))
  },
  async replay(sh) {
    if (!sh.ctx.replay) return sh.say('SAY_NOTE_NO_CAST')
    sh.say('SAY_NOTE_REPLAY')
    await sh.ctx.replay(sh.box())
  },
  history(sh) {
    sh.history.forEach((h, i) => sh.line(`<i>${pad(i + 1, 4)}</i>${html(h)}`))
  },
  clear(sh) {
    sh.clear()
  },
}

// One typed line: the longest command it starts with, then its arguments. Shared by the page and
// by scripts/play-from-spec.test.mjs, which runs every command against the committed spec.
export async function dispatch(sh, text) {
  const cfg = sh.cfg
  let words = text.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return
  sh.history.push(words.join(' '))
  // The real t27c's spelling, t27c gen-rust, is t27c gen rust here.
  const [aliasHead, aliasTail] = cfg.SHELL_GEN_ALIAS.split('{backend}')
  const typed = words.slice(0, 2).join(' ')
  if (typed.startsWith(aliasHead) && typed.endsWith(aliasTail) && typed.length > aliasHead.length + aliasTail.length) words = [...aliasHead.replace(/-$/, '').split(' '), typed.slice(aliasHead.length, typed.length - aliasTail.length), ...words.slice(2)]
  const two = words.slice(0, 2).join(' ')
  const key = COMMANDS[two] ? two : words[0]
  const args = words.slice(key.split(' ').length)
  // A backend's local command, typed for a backend this page runs, is run for that backend.
  const local = cfg.BACKENDS.findIndex((b, i) => cfg.RUNS_IN_BROWSER.includes(b) && cfg.BACKEND_RUN_LOCAL[i].split(' ')[0] === words[0])
  const tools = new Set([...cfg.BACKEND_RUN_LOCAL.map((c) => c.split(' ')[0]), ...cfg.NATIVE_TOOLS])
  try {
    if (COMMANDS[key]) await COMMANDS[key](sh, args)
    else if (local >= 0 && args.length) await COMMANDS.run(sh, [cfg.BACKENDS[local]])
    else if (tools.has(words[0])) {
      sh.say('SAY_WARN_NATIVE', { tool: words[0] })
      const i = cfg.BACKEND_RUN_LOCAL.findIndex((c) => c.split(' ')[0] === words[0])
      if (i >= 0) sh.say('SAY_NOTE_NATIVE_RUN', { backend: cfg.BACKENDS[i] })
    } else if (words[0] === 't27c') sh.say('SAY_ERR_T27C', { sub: words.slice(1).join(' '), commands: cfg.SHELL_COMMANDS.filter((c) => c.startsWith('t27c ')).join(', ') })
    else sh.say('SAY_ERR_NOT_FOUND', { cmd: words[0] })
  } catch (e) {
    sh.say('SAY_ERR_THREW', { cmd: key, error: e.message })
  }
}

// The terminal's state and its printing, apart from the page: print(kind, html) is the only way
// out, so the generator's test can run every command without a DOM.
// ctx: { cfg, specName, stem, source(), analyze(source, name), specHtml(analysis),
//        codeHtml(code, backend), download(text, name), replay(el) | null, backend }
export function makeShell(ctx, print, runners = RUNNERS) {
  const cfg = ctx.cfg
  const sh = {
    cfg,
    ctx,
    runners,
    history: [],
    backend: cfg.BACKENDS.includes(ctx.backend) ? ctx.backend : cfg.BACKENDS[0],
    onBackend: () => {},
    line: (h, cls = '') => print('line', h, cls),
    block: (h, cls = '') => print('block', h, cls),
    box: () => print('box'),
    clear: () => print('clear'),
    word: (key) => cfg[key],
    say(key, vars) { return sh.line(html(fill(cfg[key], vars)), TONE.find(([p]) => key.startsWith(p))?.[1] ?? '') },
    nameOf: (b) => cfg.BACKEND_NAMES[cfg.BACKENDS.indexOf(b)] ?? b,
    // A backend by its id, its page name, its language's name or its file extension.
    pick(want, cmd) {
      const w = norm(want)
      const i = cfg.BACKENDS.findIndex((b, j) => [b, cfg.BACKEND_PAGES[j], cfg.BACKEND_NAMES[j], cfg.BACKEND_EXTS[j]].some((x) => norm(x) === w))
      if (i < 0) { sh.say('SAY_ERR_NO_BACKEND', { cmd, name: want, backends: cfg.BACKENDS.join(' ') }); return null }
      return cfg.BACKENDS[i]
    },
    setBackend(b) { sh.backend = b; sh.onBackend(b) },
    // A fresh compile of whatever is in the editor now, and the files it makes.
    compile() {
      const source = ctx.source()
      const t0 = performance.now()
      const analysis = ctx.analyze(source, ctx.specName)
      const facts = factsOf(cfg, source, analysis)
      const ms = performance.now() - t0
      const files = [{ name: ctx.specName, ok: true, text: source, html: () => ctx.specHtml(analysis) }]
      for (const t of facts.backends) files.push({ name: fileName(cfg, t.name, t.code, ctx.stem), backend: t.name, ok: t.ok, text: t.code, error: t.error, html: () => ctx.codeHtml(t.code, t.name) })
      return { analysis, facts, ms, files }
    },
    file(name, cmd) {
      if (!name) { sh.say('SAY_ERR_WHICH_FILE', { cmd }); return null }
      const { files } = sh.compile()
      const f = files.find((x) => x.name === name) || files.find((x) => x.name.toLowerCase() === name.toLowerCase())
      if (!f) sh.say('SAY_ERR_NO_FILE', { cmd, file: name })
      return f || null
    },
  }
  return sh
}

// --- the terminal on the page ---------------------------------------------------------------
export function mountShell(el, ctx) {
  const cfg = ctx.cfg
  el.innerHTML = `<div class="sh"><div class="sh-out" role="log" aria-live="polite" tabindex="0"></div>
<form class="sh-in" autocomplete="off"><label class="ps" for="sh-cmd"></label><input id="sh-cmd" type="text" enterkeyhint="go" spellcheck="false" autocapitalize="off" autocorrect="off" aria-label="Command"></form>
<div class="chips sh-chips"></div></div>`
  const out = el.querySelector('.sh-out')
  const input = el.querySelector('input')
  const ps = el.querySelector('.ps')
  const chips = el.querySelector('.sh-chips')
  const sh = makeShell(ctx, (kind, h, cls) => {
    if (kind === 'clear') { out.innerHTML = ''; return null }
    const node = document.createElement(kind === 'block' ? 'pre' : 'div')
    node.className = kind === 'box' ? 'sh-box' : `${kind === 'block' ? 'blk' : 'ln'}${cls ? ' ' + cls : ''}`
    if (kind !== 'box') node.innerHTML = h || ' '
    out.appendChild(node)
    return node
  })
  const prompt = () => {
    ps.textContent = `${ctx.stem} [${sh.backend}] $`
    for (const b of chips.querySelectorAll('[data-b]')) b.setAttribute('aria-pressed', String(b.dataset.b === sh.backend))
  }
  sh.onBackend = prompt

  async function run(text) {
    const echo = sh.line(`<span class="ps">${html(ps.textContent)}</span> ${html(text.trim())}`, 'cmd')
    await dispatch(sh, text)
    // A long answer is read from its top, so the command line is scrolled to, not the last line.
    out.scrollTop = echo.isConnected ? echo.offsetTop - out.offsetTop : 0
  }

  // Tab: a command, then a file or a backend, by what SHELL_ARGS says the command takes.
  function complete() {
    const v = input.value
    const sp = v.lastIndexOf(' ')
    const head = v.slice(0, sp + 1).trim()
    const word = v.slice(sp + 1)
    const arg = cfg.SHELL_ARGS[cfg.SHELL_COMMANDS.indexOf(head)] ?? ''
    let pool
    if (!head || cfg.SHELL_COMMANDS.some((c) => c.startsWith(head + ' '))) pool = cfg.SHELL_COMMANDS.filter((c) => c.startsWith(v)).map((c) => c.slice(head ? head.length + 1 : 0))
    else if (arg.includes('file')) pool = sh.compile().files.filter((f) => f.ok).map((f) => f.name)
    else if (arg.includes('backend')) pool = cfg.BACKENDS
    else return
    const hits = [...new Set(pool.filter((c) => c.startsWith(word)))]
    if (!hits.length) return
    let common = hits[0]
    for (const h of hits) while (!h.startsWith(common)) common = common.slice(0, -1)
    if (hits.length === 1) common += ' '
    if (common.length > word.length) input.value = v.slice(0, sp + 1) + common
    else sh.line(hits.map(html).join('  '), 'dim')
  }

  let back = 0
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); complete() }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      back = Math.max(0, Math.min(sh.history.length, back + (e.key === 'ArrowUp' ? 1 : -1)))
      input.value = back ? sh.history[sh.history.length - back] : ''
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); sh.clear() }
    else if (e.key === 'c' && e.ctrlKey && input.selectionStart === input.selectionEnd) { sh.line(`<span class="ps">${html(ps.textContent)}</span> ${html(input.value)}^C`, 'cmd'); input.value = '' }
  })
  el.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; back = 0; run(v) })
  // A tap on the output starts typing, unless it selects text.
  out.addEventListener('click', () => { if (!String(getSelection?.() ?? '')) input.focus({ preventScroll: true }) })

  chips.innerHTML = cfg.BACKENDS.map((b) => `<button type="button" data-b="${b}" data-run="t27c gen ${b}" title="t27c gen ${b}">${b}</button>`).join('') + cfg.SHELL_CHIPS.map((c) => `<button type="button" class="cmd" data-run="${html(c)}">${html(c)}</button>`).join('')
  chips.addEventListener('click', (e) => { const b = e.target.closest('button[data-run]'); if (b) run(b.dataset.run) })
  prompt()
  sh.line(`<b>${html(fill(cfg.SAY_BANNER, { spec: ctx.specName, count: cfg.BACKENDS.length }))}</b>`)
  sh.line(`<i>${html(cfg.SHELL_NOTE)}</i>`)
  sh.say('SAY_NOTE_START')

  return {
    run,
    // The command typed at the given pace, as a reader would see it typed, then run.
    type(text, ms) {
      return new Promise((done) => {
        let i = 0
        const step = () => {
          input.value = text.slice(0, ++i)
          if (i < text.length) setTimeout(step, ms)
          else setTimeout(() => { input.value = ''; run(text).then(done) }, ms * 4)
        }
        step()
      })
    },
    focus: () => input.focus({ preventScroll: true }),
  }
}
