// The invariant: a post's interactive body is looked up BY SLUG, so the body
// module must live at src/data/blog/bodies/<slug>.ts.
//
// Two components resolve bodies independently, and they once disagreed. The
// static build goes through posts.ts, whose import table happily mapped the
// slug 'buses-and-peripherals' to a file named course-buses-and-peripherals.ts
// -- and the site rendered fine. The reader's SPA (Blog.tsx) resolves the same
// body through import.meta.glob keyed by FILE NAME, found no
// buses-and-peripherals.ts, and every opening of that post ended on
// "Интерактивная версия не смогла загрузить этот пост". The build could not
// see it: posts.ts was consistent. This gate holds the file name to the slug
// so the two resolutions cannot drift apart again.

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadPublishedPosts } from './update-blog-cover-versions.mjs'

const ROOT = join(new URL('.', import.meta.url).pathname, '..')

/**
 * Pure half, so the failure mode is tested instead of trusted.
 *
 * missing  -- published slugs with no bodies/<slug>.ts (breaks the SPA reader)
 * orphans  -- body modules no post loads; they still ship as dead chunks
 */
export function checkBlogBodies({ slugs, bodiesDir }) {
  const files = new Set(
    readdirSync(bodiesDir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => f.replace(/\.ts$/, '')),
  )
  const missing = slugs.filter((slug) => !files.has(slug))
  const orphans = [...files].filter((f) => !slugs.includes(f)).sort()
  return { missing, orphans }
}

function report({ slugs, missing, orphans }) {
  for (const slug of missing) {
    console.error(`::error::post "${slug}" has no src/data/blog/bodies/${slug}.ts -- the reader cannot open it`)
  }
  if (missing.length) {
    console.error('Rename the body module to the slug (git mv), or rename the slug: posts.ts maps imports, the reader glob does not.')
    process.exit(1)
  }
  if (orphans.length) {
    console.log(`::warning::${orphans.length} body module(s) no post loads (they still ship as chunks):`)
    for (const f of orphans) console.log(`  ${f}`)
  }
  console.log(`blog bodies: every published post of ${slugs.length} opens in the reader`)
}

// A gate nobody has watched fail is not a gate: plant a slug with no file and
// require the detector to report it before trusting the real run.
function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 't27-blog-bodies-'))
  try {
    writeFileSync(join(dir, 'a-real-post.ts'), 'export const body = []\n')
    writeFileSync(join(dir, 'an-orphan.ts'), 'export const body = []\n')
    writeFileSync(join(dir, 'not-a-module.md'), 'not a body module\n')
    const { missing, orphans } = checkBlogBodies({
      slugs: ['a-real-post', 'a-post-with-no-file'],
      bodiesDir: dir,
    })
    if (missing.length !== 1 || missing[0] !== 'a-post-with-no-file') {
      throw new Error(`self-test: expected the fileless slug to be missing, got ${JSON.stringify(missing)}`)
    }
    if (orphans.length !== 1 || orphans[0] !== 'an-orphan') {
      throw new Error(`self-test: expected exactly the orphan module, got ${JSON.stringify(orphans)}`)
    }
    console.log('self-test: a fileless slug is reported, an orphan is listed')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

if (process.argv[2] === '--self-test') {
  selfTest()
} else {
  const slugs = loadPublishedPosts().map((p) => p.slug)
  report({ slugs, ...checkBlogBodies({ slugs, bodiesDir: join(ROOT, 'src/data/blog/bodies') }) })
}
