// The host side of lib/queenEmbed: one Queen tab's Explorer frame, kept in step with
// the Queen address in both directions.
//
// The frame loads once per tab and language, on the card the address names at that
// moment; after that a card moves it by its fragment, which reloads nothing (a new
// src on every pick would boot the Explorer, and on SPECS the compiler, each time).
// A new tab or language is a new frame element rather than a new src on the old one,
// so the Queen's history holds no entries of the frame's.
//
// The address and the frame agree on one card. The address names it; with none named
// (a link or Back to the bare tab, a refused id) the address takes the card the frame
// shows, so a reload opens what was on screen.
//
// The card is read from the address itself, not from the router's copy: HashRouter
// applies a navigation inside a transition that the hive's long tasks can hold for
// seconds, while the address is written at once.
//
// The world the Queen's header has chosen rides along on SPECS: the frame narrows its
// list to it. The header writes world= with the router, which fires no hashchange, so
// the caller passes the world in and a change of it moves the frame by its fragment.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useI18n } from '../i18n/context'
import { QUEEN_FRAME_NAME, isQueenFrameMessage } from '../lib/queenFrame'
import { SELECTION_KEY, SPEC_VIEW_KEY, explorerFrameHash, explorerRouteOf, specViewOf, validSelection, type ExplorerTab, type SpecView } from '../lib/queenEmbed'

/** Whether the Queen address is on `tab` now, the card it names there (null: none, or refused) and, on SPECS, the layer (view=graph). */
function addressFor(tab: ExplorerTab): { onTab: boolean; card: string | null; view: SpecView } {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const onTab = params.get('tab') === tab
  return { onTab, card: onTab ? validSelection(tab, params.get(SELECTION_KEY[tab])) : null, view: onTab && tab === 'specs' ? specViewOf(params) : null }
}

/** The frame reported its layer: the Queen address takes it. The address is written at once and fires no hashchange, as the Queen's own writes. */
function writeView(view: SpecView): void {
  const [path, query = ''] = window.location.hash.split('?')
  const params = new URLSearchParams(query)
  if (view) params.set(SPEC_VIEW_KEY, view)
  else params.delete(SPEC_VIEW_KEY)
  window.history.replaceState(window.history.state, '', `${path}?${params}`)
}

/**
 * `navigate` writes the Queen address (replace) and switches the Queen tab when the
 * tab differs; the Queen owns that write. `frameRef` is the caller's ref on the frame
 * element. Returns what the frame element needs and the card on show, for controls
 * outside the frame (the PROJECT quick jumps).
 */
export function useQueenExplorerFrame(
  tab: ExplorerTab,
  navigate: (tab: ExplorerTab, card: string | null) => void,
  frameRef: RefObject<HTMLIFrameElement | null>,
  world: string | null = null,
) {
  const { lang } = useI18n()
  const identity = `${tab}:${lang}`
  // The world is part of the boot route, not of the frame's identity: a new world
  // moves the loaded frame (below) rather than booting another one.
  const [boot, setBoot] = useState(() => ({ identity, card: addressFor(tab).card, world, view: addressFor(tab).view }))
  const [card, setCard] = useState(boot.card)
  if (boot.identity !== identity) {
    const next = addressFor(tab).card
    setBoot({ identity, card: next, world, view: addressFor(tab).view })
    setCard(next)
  }
  // ?lang= rides in the search, where the i18n provider reads it, so the frame follows
  // the shell's language instead of whatever localStorage held.
  const src = `${window.location.pathname}?lang=${lang}${explorerFrameHash(tab, boot.card, boot.world, boot.view)}`
  // The frame whose load event has been handled, by identity. Until then the frame is
  // booting, and its load event, not its reports, brings it in line with the address.
  const loaded = useRef<string | null>(null)

  /** The frame's location, the card of this tab and the world its address names; null while it is still about:blank. */
  const frameAddress = useCallback((): { here: Location; id: string | null; world: string | null; view: SpecView } | null => {
    let here: Location | undefined
    try {
      here = frameRef.current?.contentWindow?.location
    } catch {
      return null
    }
    if (!here || here.pathname !== window.location.pathname) return null
    const shown = explorerRouteOf(here.hash)
    return { here, id: shown?.tab === tab ? shown.id : null, world: new URLSearchParams(here.hash.split('?')[1] ?? '').get('world'), view: shown?.tab === tab ? shown.view : null }
  }, [tab, frameRef])

  // Replace the frame's fragment rather than assign it: an assignment adds an entry to
  // the joint session history, and Back would then step the frame, not the Queen.
  const frameWorld = tab === 'specs' ? world : null
  const moveFrame = useCallback(
    (wanted: string | null) => {
      const frame = frameAddress()
      const view = addressFor(tab).view
      if (!frame || (frame.id === wanted && frame.world === frameWorld && frame.view === view)) return
      frame.here.replace(`${frame.here.href.split('#')[0]}${explorerFrameHash(tab, wanted, frameWorld, view)}`)
    },
    [tab, frameAddress, frameWorld],
  )

  // A world chosen in the header after the frame loaded: keep the card on show, narrow
  // the list. Before the load the frame's own load event brings it in line (below).
  useEffect(() => {
    if (loaded.current !== identity) return
    const frame = frameAddress()
    if (frame) moveFrame(frame.id)
  }, [frameWorld, identity, frameAddress, moveFrame])

  // An address changed from outside (Back, a link, a script), or a frame that has just
  // loaded. The Queen's own writes use replaceState, which fires neither event, so a
  // card the frame reported does not come back here.
  const followAddress = useCallback(() => {
    const address = addressFor(tab)
    if (!address.onTab) return
    if (address.card) {
      setCard(address.card)
      moveFrame(address.card)
      return
    }
    // No card named: the address takes the frame's. The Explorers keep the open card
    // on a hash that names none, so moving the frame would change nothing on screen.
    const shown = frameAddress()?.id ?? null
    if (shown) {
      setCard(shown)
      navigate(tab, shown)
    }
    // The card stays; a world chosen while the frame booted still has to reach it.
    moveFrame(shown)
  }, [tab, moveFrame, frameAddress, navigate])

  useEffect(() => {
    window.addEventListener('hashchange', followAddress)
    window.addEventListener('popstate', followAddress)
    return () => {
      window.removeEventListener('hashchange', followAddress)
      window.removeEventListener('popstate', followAddress)
    }
  }, [followAddress])

  const onFrameLoad = useCallback(() => {
    loaded.current = identity
    followAddress()
  }, [identity, followAddress])

  /** Show a card of this tab: the address first, then the frame. */
  const show = useCallback(
    (id: string) => {
      setCard(id)
      navigate(tab, id)
      moveFrame(id)
    },
    [tab, navigate, moveFrame],
  )

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow || !isQueenFrameMessage(event.data)) return
      const route = explorerRouteOf(event.data.hash)
      if (!route || !addressFor(tab).onTab) return
      if (event.data.action === 'selected') {
        // Only a card of this tab moves the address; a hash without one leaves the card
        // the frame still shows, and a page the frame has just left names another tab.
        if (route.tab !== tab || !route.id) return
        // A booting frame's report waits for its load event (above). A report the frame
        // has since been moved past no longer names the card its address does: stale.
        if (loaded.current !== identity || frameAddress()?.id !== route.id) return
        setCard(route.id)
        if (route.view !== addressFor(tab).view) writeView(route.view)
        if (route.id !== addressFor(tab).card) navigate(tab, route.id)
      } else if (route.tab !== tab) {
        navigate(route.tab, route.id)
      } else if (route.id) {
        show(route.id)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [tab, identity, navigate, show, frameRef, frameAddress])

  return { frameKey: identity, frameName: QUEEN_FRAME_NAME, src, card, show, onFrameLoad }
}
