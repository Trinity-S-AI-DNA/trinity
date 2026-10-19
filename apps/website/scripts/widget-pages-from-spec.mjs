#!/usr/bin/env node
// widget-pages-from-spec.mjs -- one share page per widget tool, from `specs/widgets/<id>.t27`.
//
// A widget tool is a small program that runs in the reader's browser: the placement map, the
// bitstream diff, the GF16 calculator. Its words and its numbers live in its spec; its logic lives
// in public/widgets/<id>/tool.js, which holds no English of its own and reads the spec's constants
// from `window.T27_WIDGET`. The words of the page around it (brand, links, privacy line) live in
// specs/widgets/gallery.t27 as TOOL_*, said once for every tool.
//
// For every spec whose KIND is "widget-tool" this reads it through the real compiler
// (`t27_compiler.wasm`), checks the schema, evaluates its `test` blocks, checks what the schema
// cannot say (the card is a 1200x630 PNG under its size limit, tool.js exists and fetches nothing
// from another host), and writes the files nobody edits by hand:
//
//   public/widgets/<id>/index.html   the page: og and twitter meta, the constants, the tool
//   public/widgets/<id>/<id>.t27     the spec, byte for byte, linked from the page
//
// Run:      node scripts/widget-pages-from-spec.mjs            (write)
//           node scripts/widget-pages-from-spec.mjs --check    (fail if the committed files are stale)
//           node scripts/widget-pages-from-spec.mjs --json     (print every tool's constants)
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CYRILLIC, SITE, checkSchema, compilerErrors, constsOf, loadCompiler, sha256, verdictOf } from './agents-from-specs.mjs'
import { runSpecTests } from './viewport-from-spec.mjs'

const WASM = 'public/t27/t27_compiler.wasm'
export const SPEC_DIR = 'specs/widgets'
export const GALLERY_SPEC = 'specs/widgets/gallery.t27'
export const TOOL_KIND = 'widget-tool'
export const ID_RE = /^[a-z0-9][a-z0-9-]{0,47}$/
export const CATEGORIES = ['fpga', 'compiler', 'game']
export const CARD = { width: 1200, height: 630, maxBytes: 1024 * 1024 }
export const LIMITS = { TITLE: 70, DESCRIPTION: 200, IMAGE_ALT: 420, HOOK: 160 }

export const TOOL_REQUIRED = {
  KIND: 'str', ID: 'str', TITLE: 'str', DESCRIPTION: 'str', IMAGE_ALT: 'str', HOOK: 'str',
  CATEGORY: 'str', DATA_SOURCES: 'arr', READS_LOCAL_FILES: 'bool', SENDS_NOTHING: 'bool',
}
// The page's own words, from the gallery spec.
export const PAGE_WORDS = ['TOOL_BRAND', 'TOOL_GALLERY_LINK', 'TOOL_SOURCE_LINK', 'TOOL_DATA_LABEL', 'TOOL_PRIVACY', 'TOOL_PRIVACY_FILES', 'TOOL_NOSCRIPT']

// The Russian words of the pages: a contract spec (no Cyrillic) names the bundle that holds them.
export const RU_SPEC = 'specs/widgets/i18n/widgets-ru.t27'

// A native tool has widget.wasm and no tool.js; its page loads the one shared host (public/widgets/host.js).
export const HOST = 'host.js'
export const isNative = (root, id) => existsSync(join(root, 'public/widgets', id, 'widget.wasm')) && !existsSync(join(root, 'public/widgets', id, 'tool.js'))

// What a native spec holds beyond its words: module `var`s (the page's state) and W_* constants
// (its own sizes) belong to the wasm, not to the words handed to the page; and a test that calls one of
// the spec's functions runs under t27c (the evaluator here reads constants only).
export const isInternal = (name, analysis) => /^W_[A-Z0-9_]+$/.test(name) || (analysis.ast?.children ?? []).some((n) => n.kind === 'ConstDecl' && n.name === name && n.mutable === true)
const callsFunction = (n) => (n.kind === 'ExprCall' && n.name !== 'assert') || (n.children ?? []).some(callsFunction)
export const wordsOnly = (analysis) => ({ ...analysis, ast: { ...analysis.ast, children: (analysis.ast?.children ?? []).filter((n) => n.kind !== 'TestBlock' || !callsFunction(n)) } })

export const pageOut = (id) => `public/widgets/${id}/index.html`
export const specOut = (id) => `public/widgets/${id}/${id}.t27`
export const moduleOf = (id) => `widget_${id.replaceAll('-', '_')}`

// Specs are ASCII (L3), so they spell the brand S3AI; the page prints it as the site does.
const brand = (s) => String(s).replace(/\bS3AI\b/g, 'S\u00b3AI')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// A `</script>` inside the constants would end the inline block early.
const inlineJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c')

/** Width and height from a PNG's IHDR, or null when the bytes are not a PNG. */
export function pngSize(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length < 24 || sig.some((b, i) => bytes[i] !== b) || bytes.toString('latin1', 12, 16) !== 'IHDR') return null
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** Every file under a widget's directory the page depends on, but not the files this writes. */
function toolFiles(root, id) {
  const dir = join(root, 'public/widgets', id)
  const out = []
  const walk = (rel) => {
    for (const name of readdirSync(join(dir, rel)).sort()) {
      const r = rel ? `${rel}/${name}` : name
      if (statSync(join(dir, r)).isDirectory()) walk(r)
      else if (r !== 'index.html' && r !== `${id}.t27`) out.push(r)
    }
  }
  if (existsSync(dir)) walk('')
  return out
}

// Relative files a script or stylesheet loads: import '...', from '...', new URL('...', import.meta.url), url(...).
const REF_RE = /(?:\bimport\s*\(?\s*|\bfrom\s*|new URL\(\s*)['"](\.{1,2}\/[^'"]+)['"]|url\(\s*['"]?(\.{1,2}\/[^'")]+)/g

/**
 * Every file the page loads, as paths under public/widgets: the widget's own files, the shared
 * widget.css, and every shared file its scripts and stylesheets reach (../infographic.js, which
 * loads ./infographic.css). An edit to any of them changes the page's ?v= stamp.
 */
export function pageFiles(root, id) {
  const base = join(root, 'public/widgets')
  const seen = new Set([...toolFiles(root, id).map((r) => `${id}/${r}`), 'widget.css'])
  if (isNative(root, id)) seen.add(HOST)
  const queue = [...seen]
  while (queue.length) {
    const rel = queue.shift()
    if (!/\.(m?js|css)$/.test(rel) || !existsSync(join(base, rel))) continue
    for (const m of readFileSync(join(base, rel), 'utf8').matchAll(REF_RE)) {
      const target = join(dirname(rel), m[1] ?? m[2]).replace(/[?#].*$/, '')
      if (target.startsWith('..') || seen.has(target) || !existsSync(join(base, target))) continue
      seen.add(target)
      queue.push(target)
    }
  }
  return [...seen].sort()
}

/** The Russian bundle's words for every widget, checked against the specs; { words, problems }. */
export function ruWords(analyze, tools, root = SITE) {
  const file = join(root, RU_SPEC)
  if (!existsSync(file)) return { words: {}, problems: [] }
  const problems = []
  const r = Object.fromEntries(Object.entries(constsOf(analyze(readFileSync(file, 'utf8')))).map(([k, v]) => [k, v.value]))
  if (r.KIND !== 'i18n' || r.LOCALE !== 'ru') problems.push(`${RU_SPEC}: KIND must be i18n and LOCALE ru`)
  const bundleRel = String(r.BUNDLE_PATH ?? '').replace(/^apps\/website\//, '')
  let bundle = null
  try { bundle = JSON.parse(readFileSync(join(root, bundleRel), 'utf8')) } catch (e) { problems.push(`${r.BUNDLE_PATH}: ${e.message}`) }
  const words = bundle?.widgets ?? {}
  const byId = Object.fromEntries(tools.map((t) => [t.fields.ID, t.fields]))
  for (const [id, entry] of Object.entries(words)) {
    const f = byId[id]
    if (!f) { if (!r.ORPHANS_ALLOWED) problems.push(`${r.BUNDLE_PATH}: widget ${id} has no spec`); continue }
    for (const [k, v] of Object.entries(entry)) {
      if (!k.startsWith(r.FIELD_PREFIX) || !(k in f)) problems.push(`${r.BUNDLE_PATH}: ${id}.${k} is not a ${r.FIELD_PREFIX} field of its spec`)
      else if (Array.isArray(f[k]) !== Array.isArray(v) || (Array.isArray(v) && v.length !== f[k].length)) problems.push(`${r.BUNDLE_PATH}: ${id}.${k} must keep the spec's shape (${Array.isArray(f[k]) ? `${f[k].length} items` : 'one string'})`)
      else if ([].concat(v).some((s) => typeof s !== 'string' || !s.trim())) problems.push(`${r.BUNDLE_PATH}: ${id}.${k} has an empty word`)
    }
  }
  for (const f of tools.map((t) => t.fields)) {
    if (!(r.COVERAGE_PREFIXES ?? []).some((pre) => f.ID.startsWith(pre))) continue
    for (const k of Object.keys(f).filter((k) => k.startsWith(r.FIELD_PREFIX))) {
      if (!(k in (words[f.ID] ?? {}))) problems.push(`${r.BUNDLE_PATH}: ${f.ID}.${k} has no Russian`)
    }
  }
  return { words, problems }
}

export function toolProblems(f, file, root = SITE) {
  const p = []
  const stem = file.split('/').pop().replace(/\.t27$/, '')
  if (f.ID !== stem) p.push(`${file}: ID ${f.ID} must equal the file name ${stem}`)
  if (!ID_RE.test(f.ID ?? '')) p.push(`${file}: ID ${f.ID} is not a lowercase slug`)
  if (!CATEGORIES.includes(f.CATEGORY)) p.push(`${file}: CATEGORY ${f.CATEGORY} is not one of ${CATEGORIES.join(', ')}`)
  for (const [name, max] of Object.entries(LIMITS)) {
    if (!String(f[name] ?? '').trim()) p.push(`${file}: ${name} is empty`)
    else if (f[name].length > max) p.push(`${file}: ${name} is ${f[name].length} characters, over ${max}`)
  }
  if (f.SENDS_NOTHING !== true) p.push(`${file}: SENDS_NOTHING must be true; a widget sends the reader's data nowhere`)
  if (!f.DATA_SOURCES?.length || f.DATA_SOURCES.some((s) => !s.trim())) p.push(`${file}: DATA_SOURCES must name where every number came from`)
  const dir = `public/widgets/${f.ID}`
  const native = isNative(root, f.ID)
  const scripts = native ? [[`public/widgets/${HOST}`, join(root, 'public/widgets', HOST)]] : [[`${dir}/tool.js`, join(root, dir, 'tool.js')]]
  if (native && !existsSync(scripts[0][1])) p.push(`${file}: ${dir}/widget.wasm needs public/widgets/${HOST}, which is missing`)
  if (!native && !existsSync(scripts[0][1])) p.push(`${file}: ${dir}/tool.js is missing (or ${dir}/widget.wasm, for a native tool)`)
  for (const [name, path] of scripts) {
    if (!existsSync(path)) continue
    const js = readFileSync(path, 'utf8')
    if (/\b(fetch|import)\s*\(\s*['"`]https?:/.test(js) || /\bfrom\s+['"]https?:/.test(js)) p.push(`${file}: ${name} loads from another host; a widget reads only its own files`)
    if (/\b(localStorage|document\.cookie)\b/.test(js)) p.push(`${file}: ${name} keeps state in the reader's browser; the page sets nothing`)
  }
  const card = join(root, dir, 'card.png')
  if (!existsSync(card)) p.push(`${file}: ${dir}/card.png is missing`)
  else {
    const bytes = readFileSync(card)
    const size = pngSize(bytes)
    if (!size || size.width !== CARD.width || size.height !== CARD.height) p.push(`${file}: ${dir}/card.png must be a ${CARD.width}x${CARD.height} PNG (is ${size ? `${size.width}x${size.height}` : 'not a PNG'})`)
    if (bytes.length > CARD.maxBytes) p.push(`${file}: ${dir}/card.png is ${bytes.length} bytes, over ${CARD.maxBytes}`)
  }
  return p
}

export function renderPage(f, g, { specSha, toolSha, cardSha, shared = [], ru = null, native = false }) {
  const url = `${g.ORIGIN}widgets/${f.ID}/`
  const image = `${url}card.png?v=${cardSha.slice(0, 12)}`
  const words = Object.fromEntries(Object.entries(f).filter(([k]) => k !== 'GENERATED'))
  const sources = f.DATA_SOURCES.map((s) => `<li>${esc(s)}</li>`).join('')
  return `<!doctype html>
<!-- Generated by scripts/widget-pages-from-spec.mjs from specs/widgets/${f.ID}.t27 (sha256 ${specSha.slice(0, 16)}); do not edit. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(f.TITLE)} &middot; ${esc(brand(g.TOOL_BRAND))}</title>
<meta name="description" content="${esc(f.DESCRIPTION)}">
<meta name="t27:hook" content="${esc(f.HOOK)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(brand(g.TOOL_BRAND))}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(f.TITLE)}">
<meta property="og:description" content="${esc(f.DESCRIPTION)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="${CARD.width}">
<meta property="og:image:height" content="${CARD.height}">
<meta property="og:image:alt" content="${esc(f.IMAGE_ALT)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="${esc(g.SITE_HANDLE)}">
<meta name="twitter:title" content="${esc(f.TITLE)}">
<meta name="twitter:description" content="${esc(f.DESCRIPTION)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(f.IMAGE_ALT)}">
<link rel="stylesheet" href="../widget.css?v=${toolSha.slice(0, 12)}">${shared.length ? `
<script type="importmap">${inlineJson({ imports: Object.fromEntries(shared.map((r) => [`../${r}`, `../${r}?v=${toolSha.slice(0, 12)}`])) })}</script>` : ''}
<script>if(/[?&]embed=1\\b/.test(location.search))document.documentElement.classList.add('embed')</script>
</head>
<body class="t27-widget-page t27-widget-${esc(f.CATEGORY)}">
<header class="t27-widget-head">
<a class="t27-widget-brand" href="../../" target="_top"><img src="../../favicon.svg" alt="" width="18" height="18">${esc(brand(g.TOOL_BRAND))}</a>
<h1>${esc(f.TITLE)}</h1>
<p>${esc(f.DESCRIPTION)}</p>
</header>
<main id="widget" class="t27-widget-main" aria-live="polite"></main>
<noscript><p class="t27-widget-noscript">${esc(g.TOOL_NOSCRIPT)}</p></noscript>
<footer class="t27-widget-foot">
<p>${esc(f.READS_LOCAL_FILES ? g.TOOL_PRIVACY_FILES : g.TOOL_PRIVACY)}</p>
<details><summary>${esc(g.TOOL_DATA_LABEL)}</summary><ul>${sources}</ul></details>
<p><a href="./${esc(f.ID)}.t27" target="_blank" rel="noopener">${esc(g.TOOL_SOURCE_LINK)}</a> &middot; <a href="../../#/queen?tab=widgets" target="_top">${esc(g.TOOL_GALLERY_LINK)}</a></p>
</footer>
<script>window.T27_WIDGET=${inlineJson(words)}</script>${ru ? `
<script>window.T27_WIDGET_RU=${inlineJson(ru)};if(/[?&]lang=ru\\b/.test(location.search)){Object.assign(window.T27_WIDGET,window.T27_WIDGET_RU);document.documentElement.lang='ru'}</script>` : ''}
<script type="module" src="${native ? '../' + HOST : './tool.js'}?v=${toolSha.slice(0, 12)}"></script>
</body>
</html>
`
}

/** Builds one tool from its spec text; returns { problems, fields, tests, page, publicSpec }. */
export function buildTool({ file, specText, analyze, gallery, root = SITE }) {
  const problems = []
  const analysis = analyze(specText)
  const verdict = verdictOf(analysis)
  if (!verdict.typecheckOk || verdict.discarded > 0 || !verdict.hirOk) problems.push(`${file}: compiler verdict not clean (${JSON.stringify(verdict)})`)
  problems.push(...compilerErrors(analysis).map((m) => `${file}: ${m}`))
  if (/[^\x00-\x7f]/.test(specText)) problems.push(`${file}: non-ASCII byte in the spec (L3)`)
  if (CYRILLIC.test(specText)) problems.push(`${file}: Cyrillic in the spec (LANG-EN)`)
  let consts = {}
  try { consts = constsOf(analysis) } catch (e) { problems.push(`${file}: ${e.message}`) }
  const native = isNative(root, consts.ID?.value ?? '')
  if (native) consts = Object.fromEntries(Object.entries(consts).filter(([k]) => !isInternal(k, analysis)))
  // SAY_* are the tool's words and K_* its numbers (a [N]u16 array stays arr-u16); anything else is a name nobody reads.
  const optional = Object.fromEntries(Object.entries(consts).filter(([k]) => /^(SAY|K)_[A-Z0-9_]+$/.test(k)).map(([k, v]) => [k, Array.isArray(v.value) ? (v.value.every((x) => typeof x === 'string') ? 'arr' : `arr-${String(v.type).replace(/^\[\d+\]/, '')}`) : typeof v.value === 'string' ? 'str' : v.type]))
  problems.push(...checkSchema(consts, TOOL_REQUIRED, optional, file))
  const fields = Object.fromEntries(Object.entries(consts).map(([k, v]) => [k, v.value]))
  const expected = moduleOf(fields.ID ?? '')
  if (analysis.ast?.name !== expected) problems.push(`${file}: module must be ${expected}, is ${analysis.ast?.name ?? 'missing'}`)
  let tests = { tests: 0, asserts: 0, failures: [] }
  if (problems.length === 0) {
    problems.push(...toolProblems(fields, file, root))
    tests = runSpecTests(native ? wordsOnly(analysis) : analysis, fields)
    if (tests.tests < 2) problems.push(`${file}: ${tests.tests} test block(s); a widget tests at least two of its own invariants`)
    problems.push(...tests.failures.map((m) => `${file}: test ${m}`))
  }
  if (problems.length) return { problems, fields, tests, page: null, publicSpec: null }
  const files = pageFiles(root, fields.ID)
  const toolSha = sha256(Buffer.concat(files.map((r) => readFileSync(join(root, 'public/widgets', r)))))
  // Shared modules are imported without a query; an import map gives them the page's stamp.
  const shared = files.filter((r) => !r.includes('/') && r !== HOST && /\.m?js$/.test(r))
  const cardSha = sha256(readFileSync(join(root, 'public/widgets', fields.ID, 'card.png')))
  const specSha = sha256(Buffer.from(specText, 'utf8'))
  return { problems, fields, tests, page: renderPage(fields, gallery, { specSha, toolSha, cardSha, shared, native: isNative(root, fields.ID) }), publicSpec: specText, stamps: { specSha, toolSha, cardSha, shared, native: isNative(root, fields.ID) } }
}

/** The tool specs under specs/widgets: every .t27 there but the gallery. */
export const toolSpecs = (root = SITE) => readdirSync(join(root, SPEC_DIR)).filter((n) => n.endsWith('.t27') && `${SPEC_DIR}/${n}` !== GALLERY_SPEC).sort().map((n) => `${SPEC_DIR}/${n}`)

/** The page words from the gallery spec, checked present. */
export function galleryWords(analyze, root = SITE) {
  const consts = constsOf(analyze(readFileSync(join(root, GALLERY_SPEC), 'utf8')))
  const g = Object.fromEntries(Object.entries(consts).map(([k, v]) => [k, v.value]))
  const missing = ['ORIGIN', 'SITE_HANDLE', ...PAGE_WORDS].filter((k) => typeof g[k] !== 'string' || !g[k].trim())
  return { g, problems: missing.map((k) => `${GALLERY_SPEC}: ${k} is missing or empty`) }
}

export async function buildAll({ analyze, root = SITE }) {
  const { g, problems } = galleryWords(analyze, root)
  const tools = []
  if (problems.length) return { problems, tools }
  for (const file of toolSpecs(root)) {
    const out = buildTool({ file, specText: readFileSync(join(root, file), 'utf8'), analyze, gallery: g, root })
    problems.push(...out.problems)
    tools.push({ file, ...out })
  }
  if (problems.length) return { problems, tools }
  const ru = ruWords(analyze, tools, root)
  problems.push(...ru.problems)
  for (const t of tools) if (ru.words[t.fields.ID]) t.page = renderPage(t.fields, g, { ...t.stamps, ru: ru.words[t.fields.ID] })
  return { problems, tools }
}

async function main() {
  const check = process.argv.includes('--check')
  const json = process.argv.includes('--json')
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const { problems, tools } = await buildAll({ analyze })
  if (problems.length) {
    console.error(`widget-pages-from-spec: ${problems.length} problem(s)`)
    for (const p of problems) console.error('  ' + p)
    process.exit(1)
  }
  if (json) { process.stdout.write(JSON.stringify(Object.fromEntries(tools.map((t) => [t.fields.ID, t.fields])), null, 2) + '\n'); return }
  const targets = tools.flatMap((t) => [[pageOut(t.fields.ID), t.page], [specOut(t.fields.ID), t.publicSpec]])
  if (check) {
    const stale = targets.filter(([rel, text]) => !existsSync(join(SITE, rel)) || readFileSync(join(SITE, rel), 'utf8') !== text)
    if (stale.length) {
      console.error(`widget-pages-from-spec --check: stale ${stale.map(([r]) => r).join(', ')}; run node scripts/widget-pages-from-spec.mjs`)
      process.exit(1)
    }
  } else {
    for (const [rel, text] of targets) {
      mkdirSync(dirname(join(SITE, rel)), { recursive: true })
      writeFileSync(join(SITE, rel), text)
    }
  }
  const tests = tools.reduce((n, t) => n + t.tests.tests, 0)
  const asserts = tools.reduce((n, t) => n + t.tests.asserts, 0)
  console.log(`widget-pages-from-spec: ${check ? 'up to date' : 'wrote'} ${tools.length} tool page(s) (${tools.map((t) => t.fields.ID).join(', ') || 'none'}); spec tests ${tests}, asserts ${asserts}, all hold`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
