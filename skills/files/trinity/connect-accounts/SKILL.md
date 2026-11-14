---
name: connect-accounts
description: Sign a person into their own accounts (LinkedIn, X, job boards, social networks) through THEIR remote browser, as an agent the person watches -- SSO buttons pressed by label, every case of a sign-in with the move that fits it, the person's consent and secrets kept theirs, and the honesty rule that an agent reports only what its tools did. Use when asked to "connect my accounts", "sign in to LinkedIn/X through Google", or when an agent is stuck on a sign-in page.
---

# Connect accounts through the person's own browser

The person has a real browser on a server -- their profile, their cookies --
and watches it live. The agent drives the SAME browser. Everything below
follows from two facts: every press is visible to the person, and the person
can take the wheel at any moment.

Measured in real runs (2026-09-22): LinkedIn through Google took one press on
"Google", one account choice and one consent. X through Google failed until
pop-ups were allowed, because its account chooser opens in a pop-up.

## When to use this skill

- "Connect my LinkedIn / X / job boards / social networks."
- "Sign in with Google" -- the person is already signed into Google there.
- An agent keeps running scripts on a sign-in page instead of pressing.

## The moves, case by case

| What is on the screen | The move |
|---|---|
| "Continue with Google / Apple / Microsoft" | press it **by its label** (`click text="Google"`), never by guessed coordinates or scripts |
| Google's button is a zero-size element in the page | it lives in Google's own iframe (`accounts.google.com/gsi/…`): press the iframe's centre |
| Nothing happens after the press | a **pop-up was blocked** (look for the blocked-pop-up icon); the browser must allow pop-ups, then list the tabs |
| A new window or tab opened | list the tabs and continue **in that one** |
| Google asks which account | ask the person with a **choice** card listing the accounts -- even with one: the pick is also their consent |
| "Allow <site> to access your Google account" | a **choice** card: this is the person's decision about access |
| Email, password, code | the person types it themselves, in a field of their own app that goes straight into the focused field; the agent learns only "typed, N characters" |
| Push to the phone, captcha, passkey, QR | an **action** card: the person does it, then presses Done or Cannot |
| "Stay signed in?" / "Remember this device?" | a **choice** card |
| Cookie banner | decline non-essential |
| Already signed in | confirm with a screenshot and move to the next service |

After each service, one line: where the person is signed in, and as whom.

## Rules that do not bend

1. **Never ask for a password in the chat, never type one.** Secrets go from
   the person's hands into their browser and nowhere else.
2. **Guarded places need a fresh yes.** On mail, banks, payment pages and
   account settings, pressing and typing require the person's permission
   from the last few minutes. A choice the person picked counts as that yes
   for what they picked -- do not ask twice.
3. **The person's touch takes the wheel.** While they drive, the agent may
   look and ask, not press. It waits for "hand back".
4. **Report only what the tools did.** "Opening the page", "taking a
   screenshot", "reading the page", "checking the tabs" must each match a
   real call of the tool that does it. A turn that describes actions it did
   not perform ends with a visible note saying so. (Two invented sessions in
   one day -- one with zero tool calls, one with a single refused press --
   are why this rule exists.)

## When a tap reaches nothing

Measured over two nights (2026-09-22 and 23), signing into LinkedIn, X and
TikTok. Every sign-in below failed for a while in a way that looked like the
site's fault and was not.

- **The person cannot press anything, and the agent can.** The viewer draws a
  transparent layer over the picture; that layer is what turns a tap into a
  tap inside the browser. A stylesheet that hides it by class name -- the
  same class also names the viewer's "click to unmute" panel -- leaves the
  picture perfect and every tap falling through to the video element.
  Diagnose it from inside: report `document.elementFromPoint` at the tap,
  and whether the viewer thinks this session holds control. The input layer
  is healthy when the point answers that layer, not the video.
- **"Control was given" is not "taps arrive".** The server handing control to
  the person's session, and the viewer reporting that they host, are both
  true while nothing can be pressed. Believe the tap report, not the state.
- **The agent types into the wrong tab.** Activating a tab does not reorder
  the browser's own list of tabs, so "the front page" read as "the first of
  the list" is a different tab. Remember the tab the agent chose and act in
  that one; say which tab that is when listing them.
- **A field is not found by its words.** "Email or Phone Number" is a
  placeholder, not the field's text. Look for fields by placeholder,
  aria-label and `<label for>` before falling back to coordinates.
- **Coordinates are the page's, not the screen's.** A screenshot of the whole
  screen includes the window's own address bar; a point taken from it lands
  below the target in a pop-up window.
- **A sign-in window expires while it waits.** An Apple or Google window left
  open for ten minutes answers with an endless spinner or a 400. Close it
  and start the sign-in again rather than pressing harder.
- **One permission, one chain of steps.** A guarded place grants a few
  minutes: ask for "enter the address and press Continue" once, not for each
  press. When the person's own hands work, letting them finish a sign-in is
  faster than a chain of cards.

## Quick diagnosis

- **The agent loops on a sign-in page** -> it is looking for the button with
  scripts; press by label instead.
- **"Clicked" but the page did not change** -> blocked pop-up, or the flow
  opened a new tab; list the tabs.
- **The agent stands still** -> the person holds the wheel, or a permission
  card is waiting unanswered in the app.
- **The account chooser needs "Allow"** -> the chooser sits on the account
  host, a guarded place; ask with a choice card up front.
- **Nothing happens for the person, everything works for the agent** -> the
  input layer of the viewer is hidden or covered; see above.

## Related

- `blog-post` -- the articles a connected LinkedIn/X account can share.
- The spec card for this skill on t27.ai (`#/skills?skill=trinity/connect-accounts`).
