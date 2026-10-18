#!/usr/bin/env node
// widgets-from-spec.mjs -- the WIDGETS tab of the Queen board from `specs/widgets/gallery.t27`.
//
// Reads the spec through the real compiler (`t27_compiler.wasm`), checks the constant schema,
// evaluates every `test` block against the declared constants, then reads each widget's own page
// for the words and the card -- og:title, og:description, og:image, and the player's
// twitter:player -- so the gallery never says what the page does not. A recording whose meta.json
// shows a non-zero exit code is refused: a widget is something that worked. Writes the files
// nobody edits by hand:
//
//   src/lib/queenWidgets.generated.ts   the gallery the tab draws, embed code included
//   public/widgets/gallery.t27          this spec, byte for byte
//
// Run:      node scripts/widgets-from-spec.mjs            (write)
//           node scripts/widgets-from-spec.mjs --check    (fail if the committed files are stale)
//           node scripts/widgets-from-spec.mjs --json     (print the gallery as JSON)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CYRILLIC, SITE, checkSchema, compilerErrors, constsOf, loadCompiler, sha256, verdictOf } from './agents-from-specs.mjs'
import { runSpecTests } from './viewport-from-spec.mjs'

const WASM = 'public/t27/t27_compiler.wasm'
export const WIDGETS_SPEC = 'specs/widgets/gallery.t27'
export const TS_OUT = 'src/lib/queenWidgets.generated.ts'
export const PUBLIC_SPEC_OUT = 'public/widgets/gallery.t27'
export const EXPECTED_MODULE = 'widgets_gallery'
const HUD = 'src/components/queenHud.ts'

const REQUIRED = {
  KIND: 'str', ID: 'str', NAME: 'str', SCHEMA_VERSION: 'u8', GENERATED: 'arr',
  ORIGIN: 'str', SITE_HANDLE: 'str', HASHTAGS: 'arr', EMBED_WIDTH: 'u16', PLAYER_EMBED_HEIGHT: 'u16', CAST_EMBED_HEIGHT: 'u16',
  TAB_PAGE: 'str', POSTS_NOTHING: 'bool',
  TOOL_BRAND: 'str', TOOL_GALLERY_LINK: 'str', TOOL_SOURCE_LINK: 'str', TOOL_DATA_LABEL: 'str', TOOL_PRIVACY: 'str', TOOL_PRIVACY_FILES: 'str', TOOL_NOSCRIPT: 'str',
  CATEGORY_COUNT: 'u8', CATEGORY_IDS: 'arr', CATEGORY_NAMES: 'arr', CATEGORY_LINES: 'arr', KINDS: 'arr',
  WIDGET_COUNT: 'u16', WIDGET_IDS: 'arr', WIDGET_KINDS: 'arr', WIDGET_CATEGORIES: 'arr', WIDGET_PAGES: 'arr',
  WIDGET_TITLES: 'arr', WIDGET_LINES: 'arr', WIDGET_HOOKS: 'arr',
  IDEA_COUNT: 'u8', IDEA_IDS: 'arr', IDEA_TITLES: 'arr', IDEA_LINES: 'arr', IDEA_SOURCES: 'arr',
}

const PARALLEL = {
  CATEGORY_COUNT: ['CATEGORY_IDS', 'CATEGORY_NAMES', 'CATEGORY_LINES'],
  WIDGET_COUNT: ['WIDGET_IDS', 'WIDGET_KINDS', 'WIDGET_CATEGORIES', 'WIDGET_PAGES', 'WIDGET_TITLES', 'WIDGET_LINES', 'WIDGET_HOOKS'],
  IDEA_COUNT: ['IDEA_IDS', 'IDEA_TITLES', 'IDEA_LINES', 'IDEA_SOURCES'],
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const uniq = (values) => new Set(values).size === values.length
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" }
const unescape = (s) => s.replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, e) => ENTITIES[e])
const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** The meta tags a share page carries, by property or name. */
export function metaOf(html) {
  const out = {}
  for (const m of html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"/g)) out[m[1]] = unescape(m[2])
  return out
}

/** The local file an absolute t27.ai address points at, or null for another host. */
const localOf = (origin, url) => (url.startsWith(origin) ? url.slice(origin.length).split(/[?#]/)[0] : null)

const hudViews = (root) => {
  const src = readFileSync(join(root, HUD), 'utf8')
  const list = src.match(/export const HUD_VIEWS[^=]*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ?? ''
  return [...list.matchAll(/"([a-z]+)"/g)].map((m) => m[1])
}

export function semanticProblems(f, file = WIDGETS_SPEC) {
  const p = []
  if (f.KIND !== 'widgets') p.push(`${file}: KIND must be "widgets"`)
  if (f.ID !== 'widgets/gallery') p.push(`${file}: ID must be "widgets/gallery"`)
  if (f.SCHEMA_VERSION !== 1) p.push(`${file}: SCHEMA_VERSION must be 1`)
  if (!same(f.GENERATED, [TS_OUT, PUBLIC_SPEC_OUT])) p.push(`${file}: GENERATED must be ${JSON.stringify([TS_OUT, PUBLIC_SPEC_OUT])}`)
  if (!same(f.KINDS, ['cast', 'player', 'tab', 'tool'])) p.push(`${file}: KINDS must be ["cast","player","tab","tool"]`)
  if (f.ORIGIN !== 'https://t27.ai/') p.push(`${file}: ORIGIN must be https://t27.ai/`)
  if (f.POSTS_NOTHING !== true) p.push(`${file}: POSTS_NOTHING must be true; the gallery never posts for anyone`)
  for (const [countName, arrays] of Object.entries(PARALLEL)) {
    for (const name of arrays) if (f[name].length !== f[countName]) p.push(`${file}: ${name}.length ${f[name].length} != ${countName} ${f[countName]}`)
  }
  for (const ids of ['CATEGORY_IDS', 'WIDGET_IDS', 'IDEA_IDS']) if (!uniq(f[ids])) p.push(`${file}: ${ids} must be unique`)
  for (const name of ['CATEGORY_NAMES', 'CATEGORY_LINES', 'IDEA_TITLES', 'IDEA_LINES', 'IDEA_SOURCES']) {
    f[name].forEach((s, i) => { if (!s.trim()) p.push(`${file}: ${name}[${i}] is empty`) })
  }
  // A tool says its hook in its own spec (HOOK, published as t27:hook on its page); the gallery
  // keeps it empty so the sentence has one home. Every other kind says its hook here.
  f.WIDGET_HOOKS.forEach((s, i) => {
    const tool = f.WIDGET_KINDS[i] === 'tool'
    if (tool && s.trim()) p.push(`${file}: WIDGET_HOOKS[${i}] must be empty for tool ${f.WIDGET_IDS[i]}; its HOOK lives in specs/widgets/${f.WIDGET_IDS[i]}.t27`)
    if (!tool && !s.trim()) p.push(`${file}: WIDGET_HOOKS[${i}] is empty`)
  })
  for (let i = 0; i < f.WIDGET_COUNT; i++) {
    const id = f.WIDGET_IDS[i]
    const kind = f.WIDGET_KINDS[i]
    if (!f.KINDS.includes(kind)) p.push(`${file}: widget ${id} has unknown kind ${kind}`)
    if (!f.CATEGORY_IDS.includes(f.WIDGET_CATEGORIES[i])) p.push(`${file}: widget ${id} has unknown category ${f.WIDGET_CATEGORIES[i]}`)
    const page = f.WIDGET_PAGES[i]
    if (kind === 'cast' && page !== `term/${id}/`) p.push(`${file}: cast ${id} must live at term/${id}/, not ${page}`)
    if (kind === 'tool' && page !== `widgets/${id}/`) p.push(`${file}: tool ${id} must live at widgets/${id}/, not ${page}`)
    if (kind === 'player' && !/^play\/[a-z0-9-]+\/([a-z0-9-]+\/)?$/.test(page)) p.push(`${file}: player ${id} page ${page} is not play/<play>/[<backend>/]`)
    // A page carries its own words; only a tab, which has no page of its own, says them here.
    if (kind === 'tab') {
      if (!f.WIDGET_TITLES[i].trim() || !f.WIDGET_LINES[i].trim()) p.push(`${file}: tab ${id} needs WIDGET_TITLES and WIDGET_LINES`)
      if (!/^[a-z]+$/.test(page)) p.push(`${file}: tab ${id} page must be a view name, is ${page}`)
    } else if (f.WIDGET_TITLES[i] || f.WIDGET_LINES[i]) {
      p.push(`${file}: ${kind} ${id} takes its title and line from ${page}; leave WIDGET_TITLES and WIDGET_LINES empty`)
    }
  }
  // Grouped by shelf: a category's widgets are one run, in CATEGORY_IDS order.
  const runs = f.WIDGET_CATEGORIES.filter((c, i) => i === 0 || f.WIDGET_CATEGORIES[i - 1] !== c)
  if (!same(runs, f.CATEGORY_IDS)) p.push(`${file}: WIDGET_CATEGORIES must run in CATEGORY_IDS order, one run each (is ${runs.join(', ')})`)
  return p
}

/** Reads every widget's page; returns { widgets, problems }. */
// The preview inside the gallery names the file, not the directory: a static host resolves
// term/<id>/ to its index.html, the dev server answers a directory with the app itself.
const framed = (path) => (path.endsWith('/') ? `${path}index.html` : path)

export function widgetsOf(f, root = SITE, file = WIDGETS_SPEC) {
  const problems = []
  const views = hudViews(root)
  const widgets = []
  for (let i = 0; i < f.WIDGET_COUNT; i++) {
    const id = f.WIDGET_IDS[i]
    const kind = f.WIDGET_KINDS[i]
    const page = f.WIDGET_PAGES[i]
    const base = { id, kind, category: f.WIDGET_CATEGORIES[i], hook: f.WIDGET_HOOKS[i] }
    if (kind === 'tab') {
      if (!views.includes(page)) { problems.push(`${file}: tab ${id} names view ${page}, which ${HUD} does not have`); continue }
      const url = `${f.ORIGIN}${f.TAB_PAGE}${page}`
      widgets.push({
        ...base, title: f.WIDGET_TITLES[i], line: f.WIDGET_LINES[i], url, view: page,
        image: null, gif: null, preview: null, commands: [], recorded: null,
        iframe: `<iframe src="${escapeAttr(`${url}&embed=1`)}" width="${f.EMBED_WIDTH}" height="${f.CAST_EMBED_HEIGHT}" loading="lazy" style="border:0" title="${escapeAttr(f.WIDGET_TITLES[i])}"></iframe>`,
        markdown: `[${f.WIDGET_TITLES[i]}](${url})`,
      })
      continue
    }
    const htmlPath = join(root, 'public', page, 'index.html')
    if (!existsSync(htmlPath)) { problems.push(`${file}: widget ${id}: public/${page}index.html is missing`); continue }
    const meta = metaOf(readFileSync(htmlPath, 'utf8'))
    const title = meta['og:title'] ?? ''
    const line = meta['og:description'] ?? ''
    const image = meta['og:image'] ?? ''
    if (!title || !line || !image) { problems.push(`${file}: widget ${id}: public/${page}index.html lacks og:title, og:description or og:image`); continue }
    const imageFile = localOf(f.ORIGIN, image)
    if (!imageFile || !existsSync(join(root, 'public', imageFile))) problems.push(`${file}: widget ${id}: og:image ${image} is not a file under public/`)
    const url = `${f.ORIGIN}${page}`
    if (kind === 'cast') {
      const metaJson = join(root, 'public', page, 'meta.json')
      if (!existsSync(metaJson)) { problems.push(`${file}: cast ${id}: public/${page}meta.json is missing`); continue }
      const cast = JSON.parse(readFileSync(metaJson, 'utf8'))
      const bad = (cast.exit_codes ?? []).filter((c) => String(c) !== '0')
      if (bad.length) problems.push(`${file}: cast ${id} recorded exit code(s) ${bad.join(', ')}; a widget is something that worked`)
      const gif = cast.gif && existsSync(join(root, 'public', page, 'session.gif')) ? cast.gif : null
      widgets.push({
        ...base, title, line, url, view: null, image, gif, preview: framed(page),
        commands: cast.commands ?? [], recorded: cast.recorded ?? null,
        iframe: `<iframe src="${escapeAttr(url)}" width="${f.EMBED_WIDTH}" height="${f.CAST_EMBED_HEIGHT}" loading="lazy" style="border:0" title="${escapeAttr(title)}"></iframe>`,
        markdown: `[![${title}](${gif ?? image})](${url})`,
      })
    } else if (kind === 'tool') {
      // A tool's page is written from its own spec; the embed is the same page without its frame.
      const hook = meta['t27:hook'] ?? ''
      if (!hook) problems.push(`${file}: tool ${id}: public/${page}index.html lacks t27:hook`)
      widgets.push({
        ...base, hook, title, line, url, view: null, image, gif: null, preview: `${framed(page)}?embed=1`,
        commands: [], recorded: null,
        iframe: `<iframe src="${escapeAttr(`${url}?embed=1`)}" width="${f.EMBED_WIDTH}" height="${f.CAST_EMBED_HEIGHT}" loading="lazy" style="border:0" title="${escapeAttr(title)}"></iframe>`,
        markdown: `[![${title}](${image})](${url})`,
      })
    } else {
      const player = meta['twitter:player'] ?? ''
      const embedFile = localOf(f.ORIGIN, player)
      if (!embedFile || !existsSync(join(root, 'public', embedFile))) { problems.push(`${file}: player ${id}: twitter:player ${player || '(none)'} is not a page under public/`); continue }
      widgets.push({
        ...base, title, line, url, view: null, image, gif: null, preview: framed(player.slice(f.ORIGIN.length)),
        commands: [], recorded: null,
        iframe: `<iframe src="${escapeAttr(player)}" width="${f.EMBED_WIDTH}" height="${f.PLAYER_EMBED_HEIGHT}" loading="lazy" style="border:0" allow="clipboard-write" title="${escapeAttr(title)}"></iframe>`,
        markdown: `[![${title}](${image})](${url})`,
      })
    }
  }
  return { widgets, problems }
}

const rows = (count, make) => Array.from({ length: count }, (_, i) => make(i))

export function galleryOf(f, widgets, specSha) {
  return {
    source: { spec: WIDGETS_SPEC, publicSpec: PUBLIC_SPEC_OUT, sha256: specSha, schemaVersion: f.SCHEMA_VERSION },
    name: f.NAME,
    origin: f.ORIGIN,
    handle: f.SITE_HANDLE,
    hashtags: f.HASHTAGS,
    postsNothing: f.POSTS_NOTHING,
    embed: { width: f.EMBED_WIDTH, playerHeight: f.PLAYER_EMBED_HEIGHT, castHeight: f.CAST_EMBED_HEIGHT },
    categories: rows(f.CATEGORY_COUNT, (i) => ({ id: f.CATEGORY_IDS[i], name: f.CATEGORY_NAMES[i], line: f.CATEGORY_LINES[i] })),
    widgets,
    ideas: rows(f.IDEA_COUNT, (i) => ({ id: f.IDEA_IDS[i], title: f.IDEA_TITLES[i], line: f.IDEA_LINES[i], source: f.IDEA_SOURCES[i] })),
  }
}

export const renderTs = (gallery) => `// GENERATED by scripts/widgets-from-spec.mjs from ${WIDGETS_SPEC}\n// spec sha256 ${gallery.source.sha256}\n// Do not edit: change the .t27 source and regenerate.\n\nexport const QUEEN_WIDGETS = ${JSON.stringify(gallery, null, 2)} as const\n\nexport type QueenWidgetsGallery = typeof QUEEN_WIDGETS\n`

export async function buildWidgets({ specText, analyze, root = SITE }) {
  const problems = []
  const analysis = analyze(specText)
  const verdict = verdictOf(analysis)
  if (!verdict.typecheckOk || verdict.discarded > 0 || !verdict.hirOk) problems.push(`${WIDGETS_SPEC}: compiler verdict not clean (${JSON.stringify(verdict)})`)
  problems.push(...compilerErrors(analysis).map((m) => `${WIDGETS_SPEC}: ${m}`))
  if (/[^\x00-\x7f]/.test(specText)) problems.push(`${WIDGETS_SPEC}: non-ASCII byte in the spec (L3)`)
  if (CYRILLIC.test(specText)) problems.push(`${WIDGETS_SPEC}: Cyrillic in the spec (LANG-EN)`)
  if (analysis.ast?.name !== EXPECTED_MODULE) problems.push(`${WIDGETS_SPEC}: module must be ${EXPECTED_MODULE}, is ${analysis.ast?.name ?? 'missing'}`)
  let consts = {}
  try { consts = constsOf(analysis) } catch (e) { problems.push(`${WIDGETS_SPEC}: ${e.message}`) }
  problems.push(...checkSchema(consts, REQUIRED, {}, WIDGETS_SPEC))
  const fields = Object.fromEntries(Object.entries(consts).map(([k, v]) => [k, v.value]))
  let tests = { tests: 0, asserts: 0, failures: [] }
  let widgets = []
  if (problems.length === 0) {
    problems.push(...semanticProblems(fields))
    tests = runSpecTests(analysis, fields)
    if (tests.tests === 0) problems.push(`${WIDGETS_SPEC}: no test block; the gallery must test its own invariants`)
    problems.push(...tests.failures.map((m) => `${WIDGETS_SPEC}: test ${m}`))
  }
  if (problems.length === 0) {
    const read = widgetsOf(fields, root)
    widgets = read.widgets
    problems.push(...read.problems)
  }
  const specSha = sha256(Buffer.from(specText, 'utf8'))
  const gallery = problems.length ? null : galleryOf(fields, widgets, specSha)
  return { problems, verdict, fields, specSha, tests, gallery, ts: gallery ? renderTs(gallery) : null, publicSpec: gallery ? specText : null }
}

async function main() {
  const check = process.argv.includes('--check')
  const json = process.argv.includes('--json')
  const specPath = join(SITE, WIDGETS_SPEC)
  if (!existsSync(specPath)) { console.error(`widgets-from-spec: ${WIDGETS_SPEC} is missing`); process.exit(1) }
  const analyze = await loadCompiler(readFileSync(join(SITE, WASM)))
  const out = await buildWidgets({ specText: readFileSync(specPath, 'utf8'), analyze })
  if (out.problems.length) {
    console.error(`widgets-from-spec: ${out.problems.length} problem(s)`)
    for (const p of out.problems) console.error('  ' + p)
    process.exit(1)
  }
  if (json) { process.stdout.write(JSON.stringify(out.gallery, null, 2) + '\n'); return }
  const targets = [[TS_OUT, out.ts], [PUBLIC_SPEC_OUT, out.publicSpec]]
  if (check) {
    const stale = targets.filter(([rel, text]) => !existsSync(join(SITE, rel)) || readFileSync(join(SITE, rel), 'utf8') !== text)
    if (stale.length) {
      console.error(`widgets-from-spec --check: stale ${stale.map(([r]) => r).join(', ')}; run node scripts/widgets-from-spec.mjs`)
      process.exit(1)
    }
  } else {
    for (const [rel, text] of targets) {
      mkdirSync(dirname(join(SITE, rel)), { recursive: true })
      writeFileSync(join(SITE, rel), text)
    }
  }
  console.log(`widgets-from-spec: ${check ? 'up to date' : 'wrote'} ${targets.map(([r]) => r).join(', ')}; spec ${out.specSha.slice(0, 16)}; ${out.gallery.widgets.length} widget(s) in ${out.gallery.categories.length} categories, ${out.gallery.ideas.length} idea(s) not built; spec tests ${out.tests.tests}, asserts ${out.tests.asserts}, all hold`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
