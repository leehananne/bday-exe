# BDAY.EXE

A real-time, mobile-first birthday trivia game. It has 10 questions, 11 early-2000s skins, a chip wager on every
question, round modifiers, and chaos pop-ups. Friends play on their phones and the host runs it from hers.
It is built from the BDAY.EXE design system and PRD (copies in `design-system/`).

## Architecture

```
 phones (React, Vite)                     Cloudflare Worker
 ┌───────────────┐   WebSocket   ┌─────────────────────────────────┐
 │ /ANNE  player │◀────────────▶│ /parties/room/ANNE              │
 │ /host  host   │  (partysocket)│   └─ Durable Object "Room" ANNE │
 └───────────────┘               │      • GameState (persisted)    │
        ▲                        │      • alarm = next timer/chaos │
        │ static assets          │      • per-client filtered view │
        └────────────────────────│ ASSETS (dist/client)            │
                                 └─────────────────────────────────┘
```

This is PRD §10 Option 2, which is server-authoritative. One Durable Object per room owns the clock, the seed, the
answer key, the MYSTERY draw and the chaos queue. Anne's phone is just a privileged client. If it sleeps,
timed phases keep running and the game waits at the next host-gated step (judging or reveal).

- `src/shared/`: the game as pure functions: `delta`, `planModifiers` + `validate` (C1–C7), `scheduleChaos`,
  the reducer `apply(state, action)` / `tick(state, now)`, and `viewFor()`. `viewFor()` is the fairness boundary:
  players never receive the key, future modifiers, the MYSTERY draw or other players' answers before their reveal step.
- `src/server/index.ts`: the Worker and the `Room` Durable Object (PartyServer). It persists state after every
  transition, re-arms one alarm at the earliest due time, throttles reactions (2/s per player) and batches
  their broadcast (≤4/s).
- `src/client/`: React screens built only from design-system classes (`styles/bundle.css`, `styles/tokens.css`
  generated from `design-system/tokens.json` by `npm run tokens`).

## Infra you need

**Only a Cloudflare account. The Workers Free plan is enough.** You don't need Supabase or Vercel: the same Worker serves the
front end and the realtime rooms, and SQLite-backed Durable Objects (including alarms and WebSockets) are on the
free plan. One party is about 16–30 WebSockets for under an hour.

Optional: a custom domain (e.g. `bday.party`) added to the Worker under *Settings → Domains & Routes*.
Without one, it lives at `https://bday-exe.<your-subdomain>.workers.dev`.

## Run it

```bash
npm install
npm test            # 41 engine unit tests (every outcome × modifier, C1–C7, chaos acceptance, full games)
npm run dev         # wrangler dev (8787) + vite (5173); open http://localhost:5173/host
```

To try it on real phones on the same Wi-Fi: open `http://<laptop-ip>:5173/host` on one phone and scan its QR code with the others.
Note that the Screen Wake Lock API needs HTTPS, so test wake lock on the deployed URL.

## Deploy

```bash
npx wrangler login
npm run deploy
```

## Running the party

1. The party's questions live in **`questions.json`** (the host page's default). `questions.example.json` is the sample set for
   test runs, and you can also upload a file in the host app. It needs exactly 10 questions with these limits:
   prompt ≤110 characters, options ≤40. The skins are `xp igloo fakebook ie monster dollz bear myspaze brick bsod insta`, and the
   types are `mc typed fave crowd number`. Set `"modifier"` on a question to pre-lock that row of the plan.
   Optional `"hype"` (≤40 chars) shows a big banner with confetti when that question starts, e.g.
   `"TIME TO PROVIDE AFFIRMATION!!!!"`.
2. Open `/host`, pick the PIN and create the room. The host link (`/host#PIN.secret`) is saved on that phone and is
   the only key to the room, so don't share it.
3. Open ⚙ to review the modifier plan (re-roll, lock, edit, with live C1–C7 validation) and the chaos settings.
4. Share the QR code or the link. Players join with a name and an avatar. Late joining is allowed until Q3.
5. Start. During each question you have Pause, +10s, End now, Nudge all, Skip and Swap next modifier. Typed answers are
   auto-grouped for judging (✓ / ✗ / ★ +lol). For Host's Fave you crown one answer and give up to 3 +lol. For the brick-phone question you enter the
   real number. When the timer ends (or you tap Done after judging), the reveal **plays itself**: split → answer → points → leaderboard,
   Kahoot-style. Tap **Next ▶** to skip ahead or **⏸ Hold** to stop on a moment. The leaderboard waits for your **Start Q▶**
   unless you switch on *Autopilot next question* (☰ or the lobby), which starts it after 10s. ☰ has Calm mode, power-ups, kick and Reset game (for the rehearsal).

## Multiple answers

On **typed** and **Host's Fave** questions players can send as many answers as they like (up to 20, no exact repeats):
the box stays after each send and their answers are listed underneath with a ✕ to delete. Typed: any accepted answer
counts as right. Fave: every answer is its own anonymous entry and you crown a specific one. Multiple choice, closest
number and Crowd's Pick stay one answer each (changeable until time's up).

## Closing a room

**☰ → Close room** (or **Shut down party** on the podium) deletes the room's saved game, sends every phone to a
"party's over" screen and frees the PIN, so you can create it again with the latest `questions.json`. A room keeps the
questions it was created with, so close and recreate it after changing questions. Only the phone that created a room
can close it (its secret link is saved there; `/host` shows a **Resume** card for it). A room nobody closes just sits
idle and costs nothing.

## Testing on your own

1. Open `/host` first and create the room. The player link (`/ANNE`) only works once the room exists. A player who opens it
   early sees "isn't open yet" and joins by themselves as soon as you create it.
2. Each browser normally gets one player seat (it's remembered so a reload returns to the same seat). To play several
   players in one browser, add `?p=` with any label to each tab: `/ANNE?p=2`, `/ANNE?p=3`… Incognito windows or a
   second browser also work.
3. Use **☰ → Reset game** to go back to the lobby between test runs (players stay, scores and chips are wiped).

## Tests

| Command | What |
|---|---|
| `npm test` | Engine unit tests (vitest), including the reveal autopilot |
| `node test/e2e.mjs` | Host and 3 players play all 10 questions in Chromium against `wrangler dev`, then a reload restores the same seat |
| `node test/e2e-chaos.mjs` | Live chaos with 9 phones at 360/390/430 px: overlays never touch answers or the timer, and answers stay tappable |
| `node test/fit.mjs` | Nothing a player taps is cut off: every screen of both question sets at 5 phone sizes (500 screens) |
| `node test/layout.mjs` | Deterministic: all 11 chaos kinds × 10 skins × answer/waiting × 360/390/430 px |

**Chaos.** On *Chaos* intensity every player gets hit on 7–8 of Q2–Q9 (Mild: 3–4), a different random set per player,
never the same pop-up twice, landing 1.5–9s into the question. Pop-ups stay up until closed (or answers lock).
The mercy rule (skip whoever is last) is off by default; switch it on in Setup. Every pop-up **bounces around the whole
screen** as the top layer (the eyePad sweeps up and down); the boss email and the 12.3 sale dodge the first close and jump
somewhere else. Pop-ups are tap-through except their ×, so answers underneath always work. Huat Ah!'s red packets keep
raining until answers lock. The Auntie chope stays on its tile. Calm mode / reduced motion: pop-ups sit still.

**Spotlight.** Each round modifier is revealed with the design system's Spotlight (dim, beams, slam-in, fly-up) over the
bet screen; the bet timer starts only after it leaves (the modifier phase is 3.7s). The MYSTERY rule and the crowned
Host's Fave get it too.

**Fonts.** Numbers use Press Start 2P (`public/fonts/`, SIL Open Font License, see `OFL.txt`).

`/dev/preview?q=5&kind=bday_sale` renders any player screen from real engine state with no server needed.
