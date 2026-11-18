BDAY.EXE is a mobile-first birthday trivia game styled as the early-2000s internet: windows, bevels, buddy lists, glitter, brick phones and crash screens. Friends play in the **Player app**; the birthday host runs the **Host app**, both on phones. It's goofy on purpose and should feel like a computer that is trolling you lovingly. The product spec lives in the **PRD** section. This brand book is the rulebook for building any screen of it.

## How the system works

- **Every skin is a theme.** The 8 colour themes (`xp`, `igloo`, `fakebook`, `monster`, `dollz`, `bear`, `insta`, `myspaze`) share one set of semantic token names. Put `data-theme="<id>"` on the phone root and every component inside reskins. Internet Exploder reuses `xp`; Brick Phone uses the fixed `lcd` / `lcd-ink` / `brick-body` / `key` tokens and the Blue Screen of Birthday the fixed `bsod` / `bsod-ink`, so 11 skins fit in 8 themes.
- **Scenery is a class, not a theme.** `.skin-xp`, `.skin-ie`, `.skin-igloo`, `.skin-fakebook`, `.skin-monster`, `.skin-dollz`, `.skin-bear`, `.skin-insta`, `.skin-myspaze`, `.skin-brick`, `.skin-bsod` add backgrounds and decorations around the shared phone question skeleton (`.bx-pq`). Never fork a component per skin.
- **Two apps, one system.** Player screens take the current question's skin. Host screens always use `xp` with a HOST pill in the header (`.bx-chrome`), so Anne never confuses the admin view with what players see.
- **Answer colours never change.** `answer-a` … `answer-d`, `correct`, `wrong`, `favourite`, the QR tokens and the chaos palettes (`huat-*`, `slip-*`, `forward-*`, `tissue*`) are fixed across skins so a phone's A▲ is always the same red triangle.
- **Components are CSS classes** in `components/bundle.css`, prefixed `bx-`. `components/bundle.js` exposes `window.BDAY` preview helpers: `mount()`, `avatar(i)`, `qr()`, shapes. The QR it draws is a placeholder; build the real one from the join URL.

## Voice and copy

- Write like a 2006 computer having a breakdown at a party: error messages, system dialogs, chat-speak. *"Your answer has performed an illegal operation and will be shut down."* *"It is now safe to put your phone down."*
- Roast the game, not the people: jokes target wrong answers, bold bets and lateness, never bodies, jobs or relationships.
- Chat skins (Mezzenger, Fakebook, MySpaze) can use l33t, ~*sparkles*~, lowercase and :P emoticons. Instructions and buttons stay plain: **Lock in 700**, **Log On →**, **Reveal ▶**.
- Buttons are verb-first, sentence case, ≤3 words where possible. Troll second buttons are fine: **OK :(**, **Yes but louder**.
- Numbers: points with thousands separators (`2,600`), seconds zero-padded on timers (`07`).
- Parody names only: FlopXP, Internet Exploder, Fakebook, Mezzenger, Igloo Island, Monster Mash, Dollz Dreamhouse, Build-a-Blunder Workshop, Instagran, MySpaze, Brick Phone, TOTE-LLY LUCKY, Yah! Answers. Never put a real product name, logo, mascot or wordmark on screen.

## Colour

- Text sits on `window`, not on `desktop`. Exceptions, each ≥4.5:1: skin headers on `desktop` in `window-ink` (Igloo, Dollz), short captions in `titlebar-ink` on the FlopXP `desktop`, and Brick Phone text in `lcd-ink` on `lcd` or `brick-body`.
- `window-ink` on `window` for questions and answers; `window-muted` on `window` for hints, status bars and captions. Both hold ≥4.5:1 in every skin.
- `titlebar` → `titlebar-end` is the only gradient in the system; `titlebar-ink` must read on both ends (it does in all 8 themes).
- One `accent` per screen: the main action (Lock in, Log On, Reveal, Start). Text on it is `on-accent`, never literal white.
- `highlight` / `on-highlight` mark selection: selected chip, your leaderboard row, autocomplete selection, progress fill.
- `sparkle` is decoration only (glitter, stars, confetti). It never carries text or state.
- Reveal states: `correct` + ✓ + the word CORRECT; `wrong` + ✗ + a troll word; `favourite` + ★. Colour never works alone; `correct` and `wrong` also differ in lightness (5.7:1).
- QR codes are `qr-ink` on `qr-paper` in every skin. Scanners need maximum contrast more than they need a theme.

## Type

- UI is `ui` (Tahoma/Verdana stack). The era-specific faces come from Google Fonts: `pixel` (Pixelify Sans) for numbers and counters, `bubbly` (Fredoka) for Igloo, `chunky` (Chewy) for Monster, `script` (Pacifico) for Dollz headers only, `comic` (Comic Neue) for chat, `lcd` (VT323) for Brick and BSOD, `web1999` (Times) for the Internet Exploder page.
- Phone: questions `phone-question` (24/30), answers `phone-answer` (18/24), titles `phone-title`, numbers `phone-display` / `phone-timer`, body `phone-body` (16/22), metadata `caption` (13/18).
- Inputs are never below 16px (stops iOS zoom). Nothing a player must act on is set in `caption`.
- Script and chunky faces are for headers and the skin's own flavour text. Answers stay in a legible face (`ui`, `bubbly`, `chunky`, or `lcd` at ≥22px).

## Layout

- Mobile-first: design at **390×780** (`.bx-phone`), test from 360 to 430 wide, portrait only.
- Player question screens use `.bx-pq`: a meta row (Q n/10, bet pill, timer), the question card (`.bx-pq__card`), answers that share the remaining height (`.bx-pq__answers`) and an optional footer (reactions, nudge). Skins add chrome above it (title bar, `.bx-chrome`, `.bx-fb-bar`) and scenery behind it, nothing else.
- Nothing scrolls during a timed phase. Lobby, leaderboard and host lists may scroll.
- Tap targets ≥48px (`space-8`); screen side padding `space-4`; window body padding `space-4`.
- Host screens: `.bx-chrome` with a HOST pill, then stacked windows; one primary action pinned at the bottom.

## Chrome and shape

- Everything lives in a `.bx-window`: 3px `frame` border, `shadow-window`, title bar with optional `_ □ ×` controls. The close button is `wrong` on `on-wrong`.
- Corners per skin: `radius-window` (top only) for FlopXP, `radius-bubbly` for Igloo/Monster/Dollz/Build-a-Blunder and Brick keys, `radius-button` for Instagran, `radius-none` for MySpaze/BSOD, square for Fakebook. Components pick this up through `--bx-r-win` and `--bx-r-btn`; don't hard-code radii.
- Buttons, chips and inputs are bevelled with `shadow-bevel` (at rest) and `shadow-pressed` (active, selected, locked). Pills (`radius-pill`) for chips, reactions, the start button and badges.

## Motion

| Name | Class | Duration | Use |
|---|---|---|---|
| Nudge | `.bx-anim-nudge` | 0.6s shake | Received nudge; whole window shakes |
| Pop-in | `.bx-anim-pop` | 220ms overshoot | Dialogs, reveal of the correct tile, buddies joining |
| Wobble | `.bx-anim-wobble` | 1.2s loop | "Not Responding" rows for players who haven't answered |
| Float-up | `.bx-float` | 2.4s | Reactions rising on phones in waiting states |
| Twinkle | `.bx-anim-twinkle` | 1.6s loop | Glitter and sparkles only |
| Hourglass | `.bx-anim-spin` | 1.6s, 8 steps | Waiting states |
| Stripes | `.bx-anim-stripes` | 0.8s loop | Active progress bars |
| Marquee | `.bx-marquee` | 12s | MySpaze / Exploder flavour text only |
| Crash cut | `.skin-bsod` | instant | Final question: every phone cuts to blue at the same moment |

- Nothing flashes more than 3 times per second. Blinking carets run at 1s.
- `prefers-reduced-motion` stops every loop and shake. The host's **Calm mode** adds `.bx-calm` to the root and does the same for everyone.
- Troll dialogs sit between the question and the answers, never over the answer tiles, and close in one tap.

## States

- Answer tile: rest, `is-selected` (inset `on-answer` ring + "You" badge), `is-correct`, `is-wrong`, `is-dim` (unchosen after reveal), `is-fave`.
- Wager chip: rest, `aria-pressed="true"` (selected), `disabled` (spent: struck through, 45% opacity).
- Timer: running, `is-urgent` (≤5s: seconds on `wrong`), `is-done` (00, inverted).
- Buddy: locked in (✓), thinking ("is typing…"), `is-away` (60% opacity, "Reconnecting…").
- Focus: 3px solid `focus` outline, 2px offset, on every interactive element. It reaches ≥3:1 on `window` and `desktop` in every skin.

## Iconography and imagery

- Pixel art on an 8×8 grid (`shape-rendering: crispEdges`), filled with tokens. The 8 avatars are Cake, Ghost, Alien, Frog, Star, Cat, Robot, Floppy (`BDAY.avatar(i)`).
- Answer shapes are fixed: A ▲ triangle, B ◆ diamond, C ● circle, D ■ square, always with the letter for screen readers.
- Emoji appear only as player reactions (😂 💀 🎂 🔥 🤡) and in a few joke labels, alongside text emoticons `:P` `;)` `(Y)`. They're never decoration in chrome.
- Mascots are original: the Monster Mash blob ("Gloop"), the Build-a-Blunder plush and the pixel avatars. No real characters, logos, flags or product art. A skin evokes its era through palette, type and layout alone.
- Sounds (when built) are original or royalty-free chiptune. Never ship real OS or messenger sound files.

## Round modifiers

- Every question shows its modifier before betting: NORMAL (`button`, 1×), DOUBLE POINTS (`favourite`, 2×), RISKY (`wrong`, −), DOUBLE TROUBLE (hazard stripes of `favourite` + `qr-ink` behind a `wrong` label, ±2), MYSTERY (inverted `window-ink`, ?). Icon and name always appear with the colour.
- Use the full `.bx-mod` badge in the 2s reveal and `.bx-mod--sm` in the meta row. Chips show stakes underneath (`+400` or `±400`).
- The heat strip (`.bx-heat`) shows past and current rounds only, never the future.
- Negative totals read "IN DEBT −400" with ▼, never just a red number.

## Chaos events

- Chaos lives in `.bx-chaos-zone` around the question card: it may cover the card for ≤5s, never the answers, input or timer. Rain ignores taps. The tissue chope is the only thing that touches a tile, and one tap clears it.
- One overlay per phone at a time; every one closes in one tap and on its own.
- Scam pop-ups always use FlopXP chrome (`data-theme="xp"`) whatever the skin, because that's where pop-ups lived. Singapore, lottery and bait events use their own fixed palettes: `huat-red` / `huat-gold` / `on-huat`; `slip-paper` / `slip-red` / `on-slip-red` / `slip-gold` (TOTE-LLY slip); `receipt-paper` / `receipt-ink` / `receipt-watermark` (4D); `forward-bubble` / `forward-ink`; `tissue` / `tissue-ink`; `sale` / `sale-deep` / `sale-yellow` (12.3 sale); `answers` / `on-answers` (Yah! Answers). The boss email uses FlopXP chrome.
- Copy: scams over-promise ("FREE eyePad Pro Max", "24 viruses"); the lottery is all 6s and 7s (4D is 6767 everywhere, $67.67, 06/07/67); Huat blesses with no effect; Auntie forwards and chopes; the boss wants a ppt in 5 min; the 12.3 sale screams; someone needs to know if Melvin is a gangster name. Parody names and no operator or marketplace logos. The God of Wealth is named, never drawn.

## Accessibility checklist

- Text ≥4.5:1 on its ground in every theme (verified for all 8); control edges and focus ≥3:1.
- Shape + letter on every answer; status words with every status colour.
- All dialogs are `role="alertdialog"` with a labelled title; reactions and icon buttons have `aria-label`s.
- Timer seconds are visual; announce only "10 seconds left" and "Time's up" to screen readers.
