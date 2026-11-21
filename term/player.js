// t27.ai terminal player: replays a recorded session (asciicast v2) in the page.
// One implementation for the web: the /term/<id>/ pages load it directly and the
// blog's TerminalCast component loads it at run time. The GIF and the preview
// card are drawn from the same .cast by termgif.py (`tri cast`).
//
// Every byte shown is one the command printed, at the time it printed it. The
// prompt and the typing are staged by the recorder. A silence longer than
// MAX_IDLE is shown for MAX_IDLE, and the title bar says so while it happens.

const MAX_IDLE = 2
const PAL = ['#333333', '#ff5c5c', '#00ff88', '#ffd700', '#6aa8ff', '#ff7ad9', '#5ce1e6', '#ebebeb',
  '#888888', '#ff7878', '#00ff88', '#ffd700', '#8cbeff', '#ff96e1', '#78ebf0', '#ffffff']
const TEXT = '#ebebeb'
const DIM = '#777777'

function x256(n) {
  if (n < 16) return PAL[n]
  if (n < 232) {
    const lv = [0, 95, 135, 175, 215, 255]
    const m = n - 16
    return `rgb(${lv[Math.floor(m / 36)]},${lv[Math.floor(m / 6) % 6]},${lv[m % 6]})`
  }
  const g = 8 + 10 * (n - 232)
  return `rgb(${g},${g},${g})`
}

class Screen {
  constructor(cols, rows) {
    this.c = cols
    this.r = rows
    this.lines = Array.from({ length: rows }, () => this.blank())
    this.x = this.y = 0
    this.fg = TEXT
    this.bg = null
    this.b = this.dim = false
  }
  blank() {
    return Array.from({ length: this.c }, () => [' ', TEXT, null, false])
  }
  nl() {
    this.y += 1
    if (this.y >= this.r) {
      this.lines.shift()
      this.lines.push(this.blank())
      this.y = this.r - 1
    }
  }
  sgr(ps) {
    if (!ps.length) ps = [0]
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]
      if (p === 0) { this.fg = TEXT; this.bg = null; this.b = this.dim = false }
      else if (p === 1) this.b = true
      else if (p === 2) this.dim = true
      else if (p === 22) this.b = this.dim = false
      else if (p >= 30 && p <= 37) this.fg = PAL[p - 30]
      else if (p >= 90 && p <= 97) this.fg = PAL[p - 82]
      else if (p >= 40 && p <= 47) this.bg = PAL[p - 40]
      else if (p >= 100 && p <= 107) this.bg = PAL[p - 92]
      else if (p === 39) this.fg = TEXT
      else if (p === 49) this.bg = null
      else if (p === 38 || p === 48) {
        let c = null
        const mode = ps[i + 1]
        if (mode === 5) { c = x256(ps[i + 2] ?? 7); i += 2 }
        else if (mode === 2) { c = `rgb(${ps[i + 2] ?? 0},${ps[i + 3] ?? 0},${ps[i + 4] ?? 0})`; i += 4 }
        const isFg = p === 38
        if (c && isFg) this.fg = c
        else if (c) this.bg = c
      }
    }
  }
  feed(s) {
    let i = 0
    while (i < s.length) {
      const ch = s[i]
      if (ch === '\x1b') {
        const m = /^\x1b\[([0-9;?]*)([A-Za-z])/.exec(s.slice(i, i + 40))
        if (m) {
          const raw = m[1].replace('?', '')
          const ps = raw === '' ? [] : raw.split(';').map((v) => (v === '' ? 0 : parseInt(v, 10)))
          const n = ps[0] || 1
          const f = m[2]
          if (f === 'm') this.sgr(ps)
          else if (f === 'K') for (let k = this.x; k < this.c; k++) this.lines[this.y][k] = [' ', TEXT, null, false]
          else if (f === 'A') this.y = Math.max(0, this.y - n)
          else if (f === 'B') this.y = Math.min(this.r - 1, this.y + n)
          else if (f === 'C') this.x = Math.min(this.c - 1, this.x + n)
          else if (f === 'D') this.x = Math.max(0, this.x - n)
          else if (f === 'G') this.x = Math.min(this.c - 1, Math.max(0, n - 1))
          else if (f === 'J' && ps[0] === 2) this.lines = Array.from({ length: this.r }, () => this.blank())
          i += m[0].length
          continue
        }
        const o = /^\x1b\][^\x07]*\x07|^\x1b./.exec(s.slice(i, i + 256))
        i += o ? o[0].length : 1
        continue
      }
      if (ch === '\n') { this.nl(); this.x = 0 }
      else if (ch === '\r') this.x = 0
      else if (ch === '\b') this.x = Math.max(0, this.x - 1)
      else if (ch >= ' ') {
        if (this.x >= this.c) { this.nl(); this.x = 0 }
        this.lines[this.y][this.x] = [ch, this.dim ? DIM : this.fg, this.bg, this.b]
        this.x += 1
      }
      i += 1
    }
  }
  html() {
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    return this.lines.map((line, y) => {
      let out = ''
      let k = 0
      while (k < line.length) {
        const [, fg, bg, b] = line[k]
        let t = ''
        let j = k
        while (j < line.length && line[j][1] === fg && line[j][2] === bg && line[j][3] === b) {
          t += line[j][0]
          j++
        }
        const cur = y === this.y && this.x >= k && this.x < j
        if (cur) {
          const o = this.x - k
          t = esc(t.slice(0, o)) + `<span class="t27c">${esc(t[o])}</span>` + esc(t.slice(o + 1))
        } else t = esc(t)
        out += `<span style="color:${fg}${bg ? `;background:${bg}` : ''}${b ? ';font-weight:700' : ''}">${t}</span>`
        k = j
      }
      return `<div class="t27r">${out}</div>`
    }).join('')
  }
}

export function parseCast(text) {
  const rows = text.split('\n').filter((r) => r.trim() !== '')
  const head = JSON.parse(rows[0])
  return { head, events: rows.slice(1).map((r) => JSON.parse(r)) }
}

function timeline(events) {
  const out = []
  let shown = 0
  let prev = events.length ? events[0][0] : 0
  for (const ev of events) {
    const gap = ev[0] - prev
    shown += Math.min(gap, MAX_IDLE)
    out.push({ at: shown, ev, waited: gap })
    prev = ev[0]
  }
  return out
}

const CSS = `
.t27t{background:#000;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;color:${TEXT}}
.t27t .bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#0a0a0a;border-bottom:1px solid rgba(255,255,255,.08);font:12px Outfit,system-ui,sans-serif;color:#888}
.t27t .dots{display:flex;gap:6px}.t27t .dots i{width:11px;height:11px;border-radius:50%;display:inline-block}
.t27t .ttl{flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t27t .note{color:#ffd700;background:#282200;border-radius:10px;padding:1px 9px;white-space:nowrap}
.t27t button{background:transparent;border:1px solid rgba(255,255,255,.16);color:${TEXT};border-radius:6px;padding:2px 10px;font-size:12px;cursor:pointer}
.t27t button:hover{border-color:#00ff88;color:#00ff88}
.t27t .scr{overflow-x:auto}
.t27t .log{font-family:'JetBrains Mono','SF Mono',Menlo,'DejaVu Sans Mono',monospace;font-size:clamp(8.5px,1.22vw,12.5px);line-height:1.25;padding:14px 16px;min-width:max-content}
.t27t .t27r{white-space:pre;height:1.25em}
.t27t .t27c{background:#ffd700;color:#000}
.t27t .prog{height:2px;background:rgba(255,255,255,.06)}.t27t .prog div{height:2px;width:0;background:#00ff88;transition:width .2s linear}
.t27t .shr{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 12px;background:#0a0a0a;border-top:1px solid rgba(255,255,255,.08);font:12px Outfit,system-ui,sans-serif}
.t27t .shr .lbl{color:#888;margin-right:2px}
.t27t .shr .row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;width:100%}
.t27t .shr .fol a{border-color:transparent;color:#aaa;padding:3px 6px}
.t27t .shr a,.t27t .shr button{display:inline-flex;align-items:center;gap:5px;background:transparent;border:1px solid rgba(255,255,255,.16);color:${TEXT};border-radius:6px;padding:3px 10px;font:12px Outfit,system-ui,sans-serif;text-decoration:none;cursor:pointer}
.t27t .shr a:hover,.t27t .shr button:hover{border-color:#00ff88;color:#00ff88}
`

// The canonical page of a published recording: t27.ai/term/<id>/. A share link
// always points there, because only that static page has its own preview card
// (the site's hash routes all share one card).
const SITE = 'https://t27.ai'
function sharePage(src, share) {
  if (share) return share
  const m = /(?:^|\/)term\/([a-z0-9][a-z0-9-]*)\/session\.cast$/.exec(String(src || '').split(/[?#]/)[0])
  return m ? `${SITE}/term/${m[1]}/` : ''
}

// Opened as a Telegram Mini App (the TRI DEV bot's "open" button), Telegram adds
// tgWebApp* parameters to the address. Only then is Telegram's own script loaded,
// so links open through Telegram and the page takes the full height.
let tg = null
function telegram() {
  if (tg) return tg
  const inTelegram = /tgWebApp/.test(window.location.hash + window.location.search)
  if (!inTelegram) return (tg = Promise.resolve(null))
  tg = new Promise((resolve) => {
    if (window.Telegram && window.Telegram.WebApp) return resolve(window.Telegram.WebApp)
    const s = document.createElement('script')
    s.src = 'https://telegram.org/js/telegram-web-app.js'
    s.onload = () => {
      const app = window.Telegram && window.Telegram.WebApp
      if (app) { app.ready(); app.expand() }
      resolve(app || null)
    }
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
  return tg
}

// Where to find us: the same addresses as the site footer
// (src/components/Footer.tsx, "Contact"). Change them there and here together.
const FOLLOW = [
  ['Telegram', 'https://t.me/t27_lang'],
  ['X', 'https://x.com/t27_lang'],
  ['GitHub', 'https://github.com/gHashTag/trinity'],
]

function shareBar(bar, { page, src, title, ident }) {
  const text = `${title} · Trinity S³AI`
  const x = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(page)}`
  const t = `https://t.me/share/url?url=${encodeURIComponent(page)}&text=${encodeURIComponent(text)}`
  const r = `https://www.reddit.com/submit?url=${encodeURIComponent(page)}&title=${encodeURIComponent(text)}`
  const follow = FOLLOW.map(([n, h]) => `<a data-k="out" href="${h}" target="_blank" rel="noopener">${n}</a>`).join('')
  bar.innerHTML = `<div class="row"><span class="lbl">Share</span><a data-k="out" href="${x}" target="_blank" rel="noopener">𝕏 Post</a><a data-k="out" href="${r}" target="_blank" rel="noopener">◉ Reddit</a><a data-k="out" href="${t}" target="_blank" rel="noopener">✈ Telegram</a><button type="button" data-k="copy">⧉ Copy link</button><a data-k="cast" href="${src}" download="${ident || 'session'}.cast">⬇ .cast</a></div><div class="row fol"><span class="lbl">Follow</span>${follow}</div>`
  const copy = bar.querySelector('[data-k="copy"]')
  copy.addEventListener('click', async () => {
    const app = await telegram()
    const touch = window.matchMedia && window.matchMedia('(pointer:coarse)').matches
    if (!app && navigator.share && touch) {
      navigator.share({ title: text, url: page }).catch(() => {})
      return
    }
    try {
      await navigator.clipboard.writeText(page)
      copy.textContent = '✓ Copied'
    } catch {
      copy.textContent = page
    }
    window.setTimeout(() => { copy.textContent = '⧉ Copy link' }, 2000)
  })
  // Inside Telegram an ordinary link would leave the Mini App; hand it to Telegram.
  for (const a of bar.querySelectorAll('a[data-k="out"]')) {
    a.addEventListener('click', async (e) => {
      const app = await telegram()
      if (!app) return
      e.preventDefault()
      if (a.href.startsWith('https://t.me/')) app.openTelegramLink(a.href)
      else app.openLink(a.href)
    })
  }
}

let styled = false

// mount(el, { src, title, share }) -> { play, pause, replay, destroy }
// share: the recording's page; derived from src when it is term/<id>/session.cast.
// With a page to point at, the player carries its own share buttons, so every
// embed (post, spec, share page, Telegram) offers the same ones.
export function mount(el, { src, title, share } = {}) {
  if (!styled) {
    const st = document.createElement('style')
    st.textContent = CSS
    document.head.appendChild(st)
    styled = true
  }
  el.classList.add('t27t')
  el.innerHTML = `<div class="bar"><span class="dots" aria-hidden="true"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></span><span class="ttl"></span><span class="note" hidden></span><button type="button" aria-label="Play">▶</button></div><div class="scr"><div class="log" role="log"></div></div><div class="prog"><div></div></div><div class="shr" hidden></div>`
  telegram()
  const page = sharePage(src, share)
  const ident = (/term\/([a-z0-9-]+)\//.exec(page) || [])[1]
  const ttl = el.querySelector('.ttl')
  const note = el.querySelector('.note')
  const btn = el.querySelector('button')
  const log = el.querySelector('.log')
  const prog = el.querySelector('.prog div')
  ttl.textContent = title || ''

  let cast = null
  let tl = []
  let scr = null
  let pos = 0
  let timer = 0
  let playing = false
  let started = false
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const draw = () => {
    log.innerHTML = scr.html()
    const total = tl.length ? tl[tl.length - 1].at : 0
    const at = pos > 0 ? tl[pos - 1].at : 0
    prog.style.width = `${total ? (100 * at) / total : 0}%`
    const done = pos >= tl.length
    btn.textContent = playing ? '❚❚' : done ? '↻' : '▶'
    btn.setAttribute('aria-label', playing ? 'Pause' : done ? 'Replay' : 'Play')
  }
  const reset = () => {
    scr = new Screen(cast.head.width, cast.head.height)
    pos = 0
  }
  const applyTo = (p) => {
    while (pos < p) {
      const ev = tl[pos].ev
      if (ev[1] === 'o') scr.feed(ev[2])
      pos++
    }
  }
  const step = () => {
    if (pos >= tl.length) {
      playing = false
      note.hidden = true
      draw()
      return
    }
    const now = pos === 0 ? 0 : tl[pos - 1].at
    const next = tl[pos]
    const long = next.waited > MAX_IDLE + 0.5
    note.hidden = !long
    if (long) note.textContent = `waited ${Math.round(next.waited)} s, shown ${MAX_IDLE} s`
    timer = window.setTimeout(() => {
      let p = pos + 1
      while (p < tl.length && tl[p].at - next.at < 0.06) p++
      applyTo(p)
      draw()
      if (playing) step()
    }, Math.max(0, (next.at - now) * 1000))
  }
  const play = () => {
    if (!cast) return
    if (pos >= tl.length) reset()
    playing = true
    started = true
    draw()
    step()
  }
  const pause = () => {
    playing = false
    window.clearTimeout(timer)
    note.hidden = true
    draw()
  }
  btn.addEventListener('click', () => (playing ? pause() : play()))

  let io = null
  fetch(src)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then((t) => {
      cast = parseCast(t)
      tl = timeline(cast.events)
      if (!title) ttl.textContent = cast.head.title || ''
      if (page) {
        const bar = el.querySelector('.shr')
        shareBar(bar, { page, src, title: ttl.textContent, ident })
        bar.hidden = false
      }
      log.setAttribute('aria-label', `Terminal recording: ${ttl.textContent}`)
      reset()
      if (reduced) applyTo(tl.length) // the finished session, still; play is one click away
      draw()
      if (reduced) return
      io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting) && !started) play()
      }, { threshold: 0.35 })
      io.observe(el)
    })
    .catch(() => {
      log.textContent = 'The recording could not load.'
    })

  return {
    play,
    pause,
    replay: () => { pause(); reset(); play() },
    destroy: () => { pause(); if (io) io.disconnect(); el.innerHTML = '' },
  }
}
