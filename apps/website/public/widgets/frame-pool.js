// frame-pool.js -- many widget frames on one page, few of them live.
//
// Used by the whole-course-on-one-page view (learn/<course>/all/, scripts/course-pages.mjs) and by
// the course-deck widget (widgets/course-deck/tool.js). Both pass the numbers of
// specs/view/course-view.t27 in; this file holds none of its own.
//
// A slot is an element with data-src (the widget page to frame) and data-title, whose height is
// already set to the frame's height, so a frame coming or going moves nothing below it. A slot
// mounts its iframe when it comes within `mount` px of the viewport (or of `root`, for a deck
// that scrolls sideways). At most `live` frames are mounted at once: a new one takes the place
// of the mounted frame farthest from the viewport. A frame farther than `unmount` px away is
// taken down, and its slot shows its placeholder again. A press on the slot's [data-load]
// button mounts it at once.
//
// The page can read how many frames are live: document.documentElement.dataset.liveFrames, and
// the pool's own live() and peak().

export function framePool({ slots, live, mount, unmount, root = null, onChange = () => {} }) {
  if (!(live >= 1) || !(unmount > mount)) throw new RangeError('frame-pool: live >= 1 and unmount > mount')
  const mounted = new Set()
  let peak = 0
  const all = [...slots]

  const report = () => {
    peak = Math.max(peak, mounted.size)
    document.documentElement.dataset.liveFrames = String(mounted.size)
    onChange(mounted.size)
  }

  // How far a slot is from what the reader sees: 0 inside, else the gap in px.
  const distance = (el) => {
    const r = el.getBoundingClientRect()
    const view = root ? root.getBoundingClientRect() : { top: 0, left: 0, bottom: innerHeight, right: innerWidth }
    const dy = r.bottom < view.top ? view.top - r.bottom : r.top > view.bottom ? r.top - view.bottom : 0
    const dx = r.right < view.left ? view.left - r.right : r.left > view.right ? r.left - view.right : 0
    return Math.max(dx, dy)
  }

  function take(slot) {
    const frame = slot.querySelector('iframe')
    if (frame) frame.remove()
    slot.classList.remove('is-live')
    slot.dataset.live = '0'
    mounted.delete(slot)
  }

  function put(slot) {
    if (mounted.has(slot)) return
    const f = document.createElement('iframe')
    f.src = slot.dataset.src
    f.title = slot.dataset.title || ''
    f.setAttribute('allow', 'clipboard-write')
    f.setAttribute('referrerpolicy', 'no-referrer')
    slot.appendChild(f)
    slot.classList.add('is-live')
    slot.dataset.live = '1'
    mounted.add(slot)
  }

  // The slots within `mount` px of the viewport, nearest first, are the ones that should be
  // live; a mounted frame outside that set gives way only when one of them needs its place.
  const wanted = new Set()
  function rebalance(first) {
    const order = [...wanted].sort((a, b) => distance(a) - distance(b))
    if (first && !order.includes(first)) order.unshift(first)
    const desired = order.slice(0, live)
    for (const slot of desired) {
      if (mounted.has(slot)) continue
      if (mounted.size >= live) {
        const spare = [...mounted].filter((m) => !desired.includes(m)).sort((a, b) => distance(b) - distance(a))[0]
        if (!spare) break
        take(spare)
      }
      put(slot)
    }
    report()
  }

  const near = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? wanted.add(e.target) : wanted.delete(e.target)
      rebalance()
    },
    { root, rootMargin: `${mount}px` },
  )
  const far = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (!e.isIntersecting && mounted.has(e.target)) take(e.target)
      rebalance()
    },
    { root, rootMargin: `${unmount}px` },
  )
  // A slot that stayed in the near zone while it gave way comes back once it is among the nearest.
  let pending = 0
  const settle = () => {
    clearTimeout(pending)
    pending = setTimeout(() => rebalance(), 120)
  }
  ;(root ?? window).addEventListener('scroll', settle, { passive: true })

  for (const slot of all) {
    slot.dataset.live = '0'
    near.observe(slot)
    far.observe(slot)
    const press = slot.querySelector('[data-load]')
    if (press) press.addEventListener('click', () => rebalance(slot))
  }
  report()

  return {
    live: () => mounted.size,
    peak: () => peak,
    /** Take every frame down and stop watching: a deck switching modules gives its slots back. */
    stop() {
      near.disconnect()
      far.disconnect()
      ;(root ?? window).removeEventListener('scroll', settle)
      clearTimeout(pending)
      wanted.clear()
      for (const s of [...mounted]) take(s)
      report()
    },
  }
}
