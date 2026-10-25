// course-deck/tool.js -- a whole t27.ai course as one widget of widgets.
//
// The words and the numbers are specs/widgets/course-deck.t27 (window.T27_WIDGET; the K_ numbers
// are specs/view/course-view.t27's, held equal by scripts/course-view-from-spec.mjs). The course is
// courses/<id>.json beside this file, written by scripts/course-pages.mjs from the course specs.
// ?course=<id> picks the course (the catalog's first when absent), &module=<n> the module tab,
// &lang=ru the Russian words. Each lesson card nests that lesson's own widget page; ../frame-pool.js
// mounts a frame only as its card nears the row's view and keeps K_LIVE_FRAMES_MAX of them live.
import { framePool } from '../frame-pool.js'
import { pickCourse } from './pick.js'

const W = window.T27_WIDGET
const q = new URLSearchParams(location.search)
const lang = q.get('lang') === 'ru' ? 'ru' : 'en'
const fmt = (s, ...a) => a.reduce((o, x, i) => o.split(`{${i}}`).join(String(x)), s)
const el = (tag, cls, text) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text != null) e.textContent = text
  return e
}
const css = document.createElement('link')
css.rel = 'stylesheet'
css.href = new URL('./tool.css', import.meta.url).href
document.head.append(css)

const root = document.getElementById('widget')
root.style.setProperty('--cd-touch', `${W.K_TOUCH_TARGET_PX}px`)
root.style.setProperty('--cd-focus', `${W.K_FOCUS_RING_PX}px`)
root.style.setProperty('--cd-focus-offset', `${W.K_FOCUS_OFFSET_PX}px`)
const ROOT = new URL('../../', import.meta.url).href

async function load(path) {
  const r = await fetch(new URL(path, import.meta.url))
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

const catalog = await load('./courses/index.json')
const pick = pickCourse(catalog, q.get('course'))
let course = null
try {
  if (pick) course = await load(`./courses/${pick.id}.json`)
} catch {
  course = null
}
if (!course) root.append(el('p', 'cd-empty', W.SAY_NOT_FOUND))

let pool = null
function show(n) {
  const mod = course.modules.find((m) => m.n === n) ?? course.modules[0]
  for (const t of tabs.querySelectorAll('[role=tab]')) {
    const on = Number(t.dataset.n) === mod.n
    t.setAttribute('aria-selected', String(on))
    t.tabIndex = on ? 0 : -1
  }
  if (pool) pool.stop()
  row.replaceChildren()
  const total = course.modules.reduce((k, m) => k + m.lessons.length, 0)
  for (const l of mod.lessons) {
    const card = el('article', 'cd-card')
    card.append(el('p', 'cd-n', fmt(W.SAY_LESSON, l.n, total)), el('h3', 'cd-title', l.title[lang]))
    const goal = el('p', 'cd-goal')
    goal.append(el('span', 'cd-label', W.SAY_GOAL), document.createTextNode(l.goal[lang]))
    card.append(goal)
    const slot = el('div', 'cd-slot')
    slot.style.height = `${l.height}px`
    slot.dataset.src = `${ROOT}${l.frame}${lang === 'ru' && l.frame.startsWith('widgets/') ? `${l.frame.includes('?') ? '&' : '?'}lang=ru` : ''}`
    slot.dataset.title = l.widget
    const ph = el('div', 'cd-ph')
    const press = el('button', 'cd-btn', W.SAY_LOAD)
    press.type = 'button'
    press.dataset.load = ''
    ph.append(el('span', 'cd-ph-title', l.widget), press)
    slot.append(ph)
    card.append(slot)
    const open = el('a', 'cd-link', `${W.SAY_OPEN_LESSON} ↗`)
    open.href = `${ROOT}#/${course.route}/${l.id}`
    open.target = '_top'
    card.append(open)
    row.append(card)
  }
  row.scrollLeft = 0
  pool = framePool({ slots: row.querySelectorAll('.cd-slot'), live: W.K_LIVE_FRAMES_MAX, mount: W.K_MOUNT_MARGIN_PX, unmount: W.K_UNMOUNT_MARGIN_PX, settle: W.K_SETTLE_MS, root: row })
  window.__t27Pool = pool
}

let tabs = null
let row = null
if (course) {
  const deck = el('div', 'cd')
  const head = el('header', 'cd-head')
  head.append(el('p', 'cd-kicker', W.SAY_FREE), el('h2', 'cd-course', course.title[lang]))
  const one = el('a', 'cd-btn cd-onepage', `${W.SAY_ONE_PAGE} ↗`)
  one.href = new URL(course.onePage[lang].replace(/^\//, ''), ROOT).href
  one.target = '_top'
  head.append(one)
  tabs = el('div', 'cd-tabs')
  tabs.setAttribute('role', 'tablist')
  tabs.setAttribute('aria-label', W.SAY_MODULES)
  for (const m of course.modules) {
    const t = el('button', 'cd-tab')
    t.type = 'button'
    t.setAttribute('role', 'tab')
    t.dataset.n = String(m.n)
    t.title = m.title[lang]
    t.append(el('b', '', String(m.n).padStart(2, '0')), el('span', '', m.title[lang]))
    t.addEventListener('click', () => show(m.n))
    tabs.append(t)
  }
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const all = [...tabs.querySelectorAll('[role=tab]')]
    const at = all.findIndex((t) => t.getAttribute('aria-selected') === 'true')
    const next = all[(at + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length]
    next.focus()
    show(Number(next.dataset.n))
  })
  row = el('div', 'cd-row')
  row.setAttribute('role', 'tabpanel')
  row.tabIndex = 0
  const nav = el('nav', 'cd-nav')
  const step = (dir) => row.scrollBy({ left: dir * row.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  const prev = el('button', 'cd-btn', `← ${W.SAY_PREV}`)
  const next = el('button', 'cd-btn', `${W.SAY_NEXT} →`)
  prev.type = next.type = 'button'
  prev.addEventListener('click', () => step(-1))
  next.addEventListener('click', () => step(1))
  nav.append(prev, next)
  deck.append(head, tabs, row, nav)
  root.append(deck)
  const n = Number(q.get('module'))
  show(Number.isInteger(n) && n >= 1 && n <= W.K_MODULES ? n : 1)
}
