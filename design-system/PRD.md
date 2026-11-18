# PRD — BDAY.EXE

A real-time, **mobile-first** birthday trivia game for ~15 friends in one room. Everyone plays on their own phone, and the birthday host runs the game from hers. Ten questions, each in a different early-2000s internet skin, a wager on every question, round modifiers that make the scoring escalate, and random chaos pop-ups to disturb everyone.

| | |
|---|---|
| Owner | Anne (host, designer, builder) |
| Status | Draft v3: mobile-first, two UIs, round modifiers, chaos events. Ready to code from |
| Players | 15 expected, design for 30 |
| Session | One party night, ~35–45 minutes of play |
| Surfaces | **Player app** (friends' phones) and **Host app** (Anne's phone). Both are mobile web; no TV is required. |

## 1. Goals and non-goals

**Goals**
- Everyone joins in under 2 minutes by scanning the QR code on Anne's phone or tapping the link in the group chat. No app, no account.
- Every question has a **wager**: players commit points after seeing the category and the round's **modifier**.
- The game **escalates**: it starts chill, gets a double-points round early, and turns dangerous later with penalty rounds, all on a planned curve rather than pure luck.
- Anne can run **opinion questions with no correct answer** and **pick her favourite response** from her own phone.
- Each question looks like a different corner of the 2000s internet, and the game is visibly funny: nudges, scam pop-ups, Singapore-flavoured chaos, error dialogs, reactions.
- It survives a party: phones lock, Wi-Fi drops, someone arrives late, Marcus refreshes the page.

**Non-goals**
- A shared TV screen (an optional extra, §8 "Could").
- Accounts, multiple simultaneous rooms, a question bank, native apps, offline play, analytics.

## 2. Success measures

- 15 of 15 guests joined before Q1; no one needs help joining.
- Zero lost answers: every lock-in received before the deadline is scored.
- Anne steps in (pause, re-judge, kick) at most once per question on average, and judging or picking a fave takes under 60 seconds.
- Every player sees the modifier before betting. Nobody is surprised by a penalty except on MYSTERY.
- The game ends with a podium, not a crash. Laughter is a qualitative pass.

## 3. Two UIs

| | Player app | Host app |
|---|---|---|
| Who | Each friend, own phone, portrait | Anne, own phone (a laptop tab also works) |
| URL | `bday.party/ANNE` (from QR or group chat) | Secret host URL (secret in the `#fragment`) |
| Look | The question's skin, full screen | FlopXP "Control Panel", always the same skin so it reads as admin; HOST badge on every screen |
| Sees | Category, modifier, own chips, question + answers, own result, leaderboard, reactions, chaos | Everything players see **plus** the answer key, the full modifier plan, the live split, who hasn't answered, every typed/free-text answer |
| Does | Join, bet, answer, react, nudge, send pop-ups, dismiss chaos | Plan modifiers, tune chaos, share the room, start, pace each phase, judge typed answers, enter real numbers, **crown a favourite and give +lol bonuses**, kick |

Anne hosts rather than plays: most questions are about her, and she's the judge on opinion rounds.

### What the host does, by question type

| Question type | Host action between "time's up" and reveal |
|---|---|
| Multiple choice | Nothing to judge. Tap through the reveal steps |
| Typed | **Judge**: confirm auto-grouped spellings ✓ / ✗ / merge / +lol |
| Host's Fave | **Pick your fave**: crown one anonymous answer, give up to 3 +lol, reveal authors |
| Crowd's Pick | Nothing; the most-voted option wins (ties all win) |
| Closest number | **Enter the real number** (e.g. her actual unread-text count); closest guesses are ranked automatically |

## 4. Game loop

```
 PLAYER PHONES                         ANNE'S PHONE (HOST)
 ─────────────                         ───────────────────
                                       Before: plan modifiers, chaos settings
 Join (QR / link) ──────────────────▶  Share room, see buddies, Start
        │
        ▼                    ┌──────── per question (×10) ───────────┐
 MODIFIER installs   2s      │  (from the plan; can swap until now)   │
 BET: category + chips  10s  │  sees bets coming in                   │
        ▼                    │                                        │
 ANSWER in the skin  20–45s  │  sees answer key + live split,         │
   ↯ chaos may land here     │  Pause / +10s / End now / Nudge all    │
        ▼                    │                                        │
 WAITING: reactions,         │  JUDGE (typed) · PICK FAVE (opinion) · │
 nudges, pop-ups             │  ENTER NUMBER (closest)                │
        ▼                    │                                        │
 REVEAL: right / wrong ◀─────┤  steps: (mystery rule) → split →      │
        ▼                    │         answer → points                │
 LEADERBOARD + next skin ◀───┤  Next ▶                                │
                             └────────────────────────────────────────┘
        ▼  after Q9
 FINAL: Blue Screen of Birthday (FINAL modifier, DOUBLE TROUBLE by default)
        ▼
 PODIUM + personal report ◀──────────  Shut down party
```

Timing per question: modifier 2s + bet 10s + answer 20–45s + judging 0–60s + reveal ~45s + leaderboard ~15s ≈ 2–2.5 minutes. Ten questions ≈ 25 minutes; with joining and the podium, 35–45 minutes.

## 5. Wager mechanic

The brief asks for "choosing the points you want for each question". triviaduel.com's homepage doesn't document its scoring, so these are general wagering patterns rather than a copy of it.

**Option A — Confidence chips (recommended).** Each player holds ten chips: 100, 200 … 1000. Each chip can be spent once. Before each question the category **and the round modifier** are shown, and the player picks a chip. The modifier (§6a) decides what that chip wins or loses.
- Why: ten chips for ten questions makes every bet a trade-off ("is this my 1000 category?"). With modifiers it gets sharper: a 1000 chip on a DOUBLE round can win 2,000; on DOUBLE TROUBLE it can lose 2,000.
- No pick within 10 seconds: the smallest remaining chip is auto-spent (the "coward's tax").

**Option B — Bank wager.** Everyone starts with 1,000 and bets any amount up to their bank; a wrong answer loses the full wager. Crowdpurr's points-wagering feature works this way ([docs](https://intercom.help/crowdpurr/en/articles/10524932)). It's more dramatic, but players who go bust stop caring, which is a real cost at a party.

**Option C — Fixed points + speed decay.** Each question is worth a set amount that drains over time. It's the least strategic and drops the mechanic you asked for.

**Decision for v1:** Option A + round modifiers. The tiebreaker (if needed) is played with no wager: closest guess wins.

## 6. Question types

| Type | Player input | Correct when | Base payout | Host action |
|---|---|---|---|---|
| **Multiple choice** | 2–4 tiles A▲ B◆ C● D■ | Matches key | chip | — |
| **Typed** | Text ≤40 chars (address bar or comment box) | Host accepts (auto-grouped spellings, host confirms) | chip | Judge |
| **Host's Fave** | Text ≤60 chars, anonymous | Anne crowns one; up to 3 "+lol" | Crowned 2× chip · +lol 1× chip · others 0 | Pick fave |
| **Crowd's Pick** | Vote for a friend (or an option) | Most-voted option; ties all win | chip | — |
| **Closest number** | Digits on a T9 keypad | Closest guess(es); exact hit doubles | chip (2× exact) | Enter real number |

Rules for every type: answers can change until the deadline, and the last value counts. The server accepts a lock-in up to 300 ms after the deadline. Phones never receive the answer key, or other players' answers, before the reveal. **No answer counts as wrong** (so penalties apply).

## 6a. Round modifiers

Every question carries one modifier that changes how its wager pays out. Modifiers are **planned before the party** on an escalating curve. Each one is revealed to everyone at the start of that question's bet phase (except MYSTERY), so players can bet around it.

### Definitions

| Id | Name | Right | Wrong | Shown before betting | Visual |
|---|---|---|---|---|---|
| `normal` | NORMAL | +1× chip | 0 | yes | `button` badge, "1×" |
| `double` | DOUBLE POINTS | +2× chip | 0 | yes | `favourite` gold, "2×" |
| `risky` | RISKY | +1× chip | −1× chip | yes | `wrong` red, "−" |
| `trouble` | DOUBLE TROUBLE | +2× chip | −2× chip | yes | hazard stripes, "±2" |
| `mystery` | MYSTERY | drawn at lock | drawn at lock | **no**: rule revealed as the first reveal step | inverted, "?" |

```ts
type ModifierId = 'normal' | 'double' | 'risky' | 'trouble' | 'mystery';
const WIN  = { normal: 1, double: 2, risky: 1, trouble: 2 } as const;
const LOSE = { normal: 0, double: 0, risky: -1, trouble: -2 } as const;
type Resolved = Exclude<ModifierId, 'mystery'>;

function delta(chip: number, outcome: 'right' | 'wrong' | 'crowned' | 'lol' | 'exact' | 'none', m: Resolved): number {
  switch (outcome) {
    case 'right':   return chip * WIN[m];
    case 'exact':   return chip * WIN[m] * 2;   // closest number, exact hit
    case 'crowned': return chip * WIN[m] * 2;   // Host's Fave
    case 'lol':     return chip * WIN[m];
    case 'none':    return 0;                   // Host's Fave, not picked: never penalised
    case 'wrong':   return chip * LOSE[m];
  }
}
```

- **MYSTERY** resolves at lock time with the room's seeded RNG to `double`, `risky` or `trouble` (equal weight), stored server-side and revealed first in the reveal sequence ("The mystery rule was… DOUBLE TROUBLE").
- **Strategy the UI should make obvious:** on RISKY the expected value is chip × (2p − 1), where p is the player's confidence, so bet big only when you're more than 50% sure; DOUBLE TROUBLE doubles that. On DOUBLE there's no downside, so it's the round for your 1000 chip. Chip buttons show the stakes (`+400` or `±400`) under each value.
- **Scores can go negative.** A negative total shows as "IN DEBT −400" on the leaderboard (with ▼ and the word, not just colour). No floor: being in debt to Anne is part of the joke.

### Planning: the escalation curve

The plan is generated when the host loads `questions.json`, from a seed (default: the room PIN), so the same file + seed always produces the same plan. Anne can see, lock, change or re-roll it in **HostSetup** before the party. Players never see future modifiers, only a heat strip of past and current rounds.

| Phase | Questions | Pool (weights) | Feel |
|---|---|---|---|
| Warm-up | Q1 | `normal` (fixed) | Learn the game |
| Chill | Q2–Q3 | `normal` 0.4 · `double` 0.6 | Free points, build confidence |
| Warm | Q4–Q6 | `normal` 0.3 · `double` 0.3 · `risky` 0.25 · `mystery` 0.15 | First real risk |
| Spicy | Q7–Q9 | `double` 0.25 · `risky` 0.35 · `trouble` 0.4 | Swingy |
| Final | Q10 | `trouble` (fixed, editable to `double`) | Everything on the line |

Hard constraints, checked on every generated or edited plan:

1. **C1** at least one `double` in Q2–Q3 (the "double points second question" moment).
2. **C2** exactly one `trouble` in Q7–Q9 (the "−double at Q7" moment), never two.
3. **C3** between 1 and 3 penalty rounds (`risky` / `trouble`) in Q1–Q9.
4. **C4** no two penalty rounds back-to-back, and none directly before the final.
5. **C5** at most one `mystery`; never on Q1–Q3 or Q10.
6. **C6** type compatibility: Host's Fave and Closest number only take `normal` / `double` (a crowd vote or a near-miss guess shouldn't cost points); Crowd's Pick never takes `mystery`.
7. **C7** no modifier three times in a row.

```ts
function planModifiers(questions: Question[], seed: number, locked: Partial<Record<number, ModifierId>> = {}): ModifierId[] {
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < 500; attempt++) {
    const plan = questions.map((q, i) =>
      locked[i + 1] ?? weightedPick(rng, poolFor(i + 1).filter(m => compatible(m, q.type))));
    if (validate(plan, questions).ok) return plan;
  }
  throw new Error('No valid plan: unlock a row or relax a constraint');
}
```

- `validate()` returns the list of failed constraints. HostSetup shows them live ("✗ C4: Q6 and Q7 are both penalty rounds").
- **Re-roll** regenerates unlocked rows with `seed + 1`. **Lock** pins a row.
- During the game the host can still swap the *next* question's modifier from HostLive until its bet phase starts. The swap is validated the same way.

## 7. The skins (10 + 1 spare)

Each skin is a **colour theme** of this design system (or a fixed palette) plus scenery around one shared phone skeleton (`.bx-pq`). Swapping `data-theme` reskins every component; answer colours stay fixed, so A▲ is always the same red triangle. On-screen names are parodies: a skin borrows an era's palette, type and layout habits, never its real logos, mascots, sounds or product names.

There are **11 skins for 10 questions**: ten in the lineup plus one spare. The design system allows 8 colour themes. FlopXP and Internet Exploder share `xp`, and Brick Phone and the Blue Screen of Birthday use fixed palettes, so all 11 fit.

| Q | Skin | Palette | Question type | Example modifier | Troll |
|---|---|---|---|---|---|
| 1 | FlopXP | `xp` | Multiple choice | NORMAL (fixed) | "Wrong Answers" recycle bin counts up |
| 2 | Igloo Island | `igloo` | Multiple choice | DOUBLE | Timer "melts" |
| 3 | Fakebook chat | `fakebook` | Multiple choice | NORMAL | Pokes in the chat dock |
| 4 | Internet Exploder | `xp` | Typed | RISKY | Lying autocomplete; fake ad pop-up |
| 5 | Monster Mash | `monster` | Multiple choice | DOUBLE | Mascot "eats" wrong answers |
| 6 | Dollz Dreamhouse | `dollz` | Host's Fave | NORMAL | +lol bonuses |
| 7 | Build-a-Blunder Workshop | `bear` | Multiple choice | DOUBLE TROUBLE | Step tracker never reaches "Adopt" |
| 8 | MySpaze | `myspaze` | Crowd's Pick (Top 8) | MYSTERY | "Autoplay" banner, pc4pc comments |
| 9 | Brick Phone | fixed `lcd` | Closest number | DOUBLE | T9 keypad for numbers |
| 10 | Blue Screen of Birthday | fixed `bsod` | Multiple choice | FINAL: DOUBLE TROUBLE | Every phone crashes at once |
| Spare | Instagran 2011 | `insta` | Typed or Host's Fave, answered as comments | NORMAL / DOUBLE | Comments hidden until the reveal |

Skins, types and modifiers can be re-paired in `questions.json` and HostSetup.

## 8. Functional requirements

**Must (v1)**
1. Host app creates the room from `questions.json`: a 4-letter PIN, a short player URL, a QR code on Anne's phone, and a "Share to group chat" button (Web Share API, with copy-link fallback).
2. Players join via QR or link (PIN prefilled), choose a screen name (≤16 chars, de-duplicated with a suffix) and one of 8 pixel avatars.
3. Lobby on both apps; Anne can kick and starts when ready. Late joiners can enter until Q3 with a full chip set.
4. Per-question flow from §4 with server-authoritative timers, the wager rules from §5 and the round modifiers from §6a.
5. All five question types (§6), including the host's **Judge**, **Pick your fave** and **Enter number** screens.
6. **Modifier planner** (HostSetup): generate from seed, show the plan with validation, lock/edit/re-roll, save. Modifier reveal at the start of every bet phase (PlayerModifier) with stakes on each chip.
7. Host-paced reveal: (mystery rule) → split → answer → points → leaderboard. Each player sees their own result (right/wrong, delta, new rank) in the skin.
8. The final question uses the FINAL modifier; podium on every phone with joke awards (Most Wrong, Chaos Agent, Most Scammed, Anne's Fave Human), then a personal report.
9. Host controls at every phase: pause/resume, +10s, end now, skip, back, re-open judging, swap next modifier.
10. Reconnect: a player who reloads or loses signal returns to the same seat, score, chips and any still-active chaos event. If Anne's phone drops, the game pauses and resumes on reconnect.

**Should**
11. Reactions: 8-button bar, throttled to 2/s per player, floating up everyone's screen in waiting states only.
12. Player power-ups, one each per player per game: **Nudge** (shakes the target's screen for 0.6s) and **Pop-up ad** (sends the target a scam pop-up from §8a). Never in the last 5 seconds of a question.
13. **Random chaos events** (§8a): 11 kinds across scams, lottery, Singapore, and bait pop-ups, with intensity and per-family toggles in HostSetup.
14. Sound cues (join, lock-in, last 5s, reveal, nudge, crash), off by default, with a per-phone toggle.
15. Calm mode: Anne's switch that stops shake, wobble, marquee, twinkle and rain for everyone (chaos overlays still appear, without motion).

**Could**
16. **Big-screen mode**: a read-only URL that mirrors the question and reveal for casting to a TV.
17. Photo questions (an image in the question card; the Instagran skin is built for them).
18. Shareable results page for the group chat.

## 8a. Chaos events

Random disturbances that land on **some** players' phones during the answer phase. They are separate from player-sent power-ups but use the same renderer and queue.

### Catalogue

| Kind | Family | What appears | Layer | Lasts | Dismiss | Weight |
|---|---|---|---|---|---|---|
| `scam_eyepad` | Scam | "!!! CONGRATULATIONS !!! You won a FREE eyePad Pro Max" with a fake 9s countdown and a tiny × | card zone | 5s | × or CTA (both just close) | 2 |
| `scam_virus` | Scam | "SecurityCenter 2006: Your phone has 24 viruses" | card zone | 5s | × or SCAN NOW | 1 |
| `scam_smileys` | Scam | "FREE SMILEYS for your Mezzenger!!" | card zone | 5s | × or DOWNLOAD | 1 |
| `toto` | Lottery | TOTE-LLY LUCKY 6/49 betting slip: red number boards with VOID bars, $ stake boxes, QP/SYS options, gold side panel. Pencil marks on 6, 7, 16, 17, 26, 27. On phones: one board + narrow side panel | card zone | 5s | × | 2 |
| `fourd` | Lottery | 4D thermal receipt where **every number is 67**: A. 6767 BIG $67 SML $67, PRICE $67.67, draw date 06/07/67, a faint 67 watermark, fake barcode, "NOT A REAL TICKET". On phones: compact variant (no barcode/meta) | card zone | 5s | × | 2 |
| `huat` | Singapore | HUAT AH! 发 banner + red packets and gold ingots raining | card zone + rain | 4s | × (rain ends by itself) | 2 |
| `auntie_forward` | Singapore | Forwarded good-morning chain message with flowers | card zone | 5s | × | 2 |
| `auntie_chope` | Singapore | Tissue packet "CHOPE by Auntie" stuck on one answer tile | one tile | until tapped or phase ends | tap the tile once | 1 |
| `boss_email` | Bait | "1 new message — RE: RE: FW: urgent" from Boss (work): *"hi... good pm.. can i get that ppt in 5 min? need for meeting. thx,"* Sent 6:07 PM, "Sent from my brick phone" | card zone | 5s | × or "Pretend I didn't see" / "Reply on it!!" | 2 |
| `bday_sale` | Bait | Overstimulating **12.3 Birthday Super Sale** (Anne's birthday is 3 Dec): spinning sunburst, 00:06:07 countdown, vouchers ("$0 OFF min. spend $67", "FREE SHIPPING to your own seat", "99% OFF CAKE"), pulsing CLAIM ALL | card zone | 5s | × or CLAIM ALL (does nothing) | 2 |
| `melvin` | Bait | Yah! Answers question page: **"is Melvin a name for a gangster?"** with a voters' best answer ("depends. does he wear slippers to a nice restaurant") | card zone | 5s | × | 1 |

### Layering contract (non-negotiable)

- Overlays render inside `.bx-chaos-zone`, which wraps the question card. They may cover the **question card** (and skin header) for up to 5s, but **never the answer tiles, the input, or the timer**.
- `huat` rain spans the phone with `pointer-events: none`, so taps go through to the answers.
- `auntie_chope` is the only event that touches an answer: never the player's current selection, only on questions with ≥3 options, and the first tap on the tile removes the tissue without selecting it.
- At most **one** chaos overlay on a phone at a time. A player-sent pop-up that arrives during a chaos event waits until it ends (or is dropped if the phase ends first).
- Overlays are non-modal: they don't steal focus or trap it. Scam variants use `role="alertdialog"` without moving focus; the others use `role="status"`. Escape closes. Screen readers hear one polite announcement ("Pop-up: TOTE-LLY LUCKY. Close button available.").
- With reduced motion or Calm mode: no drop/stamp/pulse/rain animation, but the overlay still appears.

### Scheduling

| Intensity | Chance per eligible player per question | Max per player per game |
|---|---|---|
| Off | 0 | 0 |
| Mild | 15% | 2 |
| Chaos (default) | 35% | 3 |

Eligibility: answer phase only; never on Q1 (people are learning) or Q10 (the crash *is* the chaos); never the same kind twice for one player; mercy rule (on by default) skips whoever is currently last. Fire time is uniform in `[answerStart + 3s, endsAt − 6s]`; if that window is shorter than 2s, skip.

```ts
type ChaosKind = 'scam_eyepad' | 'scam_virus' | 'scam_smileys' | 'toto' | 'fourd' | 'huat' | 'auntie_forward' | 'auntie_chope'
               | 'boss_email' | 'bday_sale' | 'melvin';
interface ChaosEvent { id: string; kind: ChaosKind; player: PlayerId; q: number; at: number; until: number | null; data?: { numbers?: number[]; tile?: 'a' | 'b' | 'c' | 'd' } }

function scheduleChaos(room: Room, q: number, answerStart: number, endsAt: number): ChaosEvent[] {
  const cfg = room.chaos; if (cfg.intensity === 'off' || q === 1 || q === 10) return [];
  const out: ChaosEvent[] = [];
  for (const p of eligiblePlayers(room)) {                     // excludes last place if mercy is on
    const rng = mulberry32(hash(room.seed, q, p.id));          // deterministic: reconnects re-render the same event
    if (rng() >= CHANCE[cfg.intensity] || p.chaosCount >= MAX[cfg.intensity]) continue;
    const kinds = ENABLED(cfg).filter(k => !p.chaosSeen.includes(k) && fits(k, room.questions[q - 1]));
    if (!kinds.length) continue;
    const kind = weightedPick(rng, kinds, WEIGHT);
    const lo = answerStart + 3000, hi = endsAt - 6000; if (hi - lo < 2000) continue;
    const at = lo + rng() * (hi - lo);
    out.push({ id: uid(), kind, player: p.id, q, at, until: kind === 'auntie_chope' ? null : at + DURATION[kind],
               data: kind === 'toto' ? { numbers: [6, 7, 16, 17, 26, 27] } : kind === 'auntie_chope' ? { tile: pickTile(rng, p) } : undefined });
  }
  return out;                                                  // server sets an alarm per event at `at`
}
```

### Protocol

| Direction | Message | Notes |
|---|---|---|
| server → one player | `{ t: "chaos", event: ChaosEvent }` | Sent at `event.at` only to `event.player` |
| server → one player | `{ t: "chaos_end", id }` | At `until`, or when the phase ends |
| player → server | `{ t: "chaos_dismiss", id, ms }` | `ms` = time on screen; feeds the "Most Scammed" award |
| player → server | `{ t: "chope_clear", id }` | First tap on the choped tile |
| server → host | `{ t: "chaos_log", event }` | Host sees who got hit in HostLive (small feed) |

### Acceptance criteria

- With Chaos intensity and 15 players, Q2–Q9 deliver roughly 4–6 events per question, no player gets more than 3 per game, and no player sees the same kind twice (11 kinds, so everyone's 3 are different).
- Every 4D number, stake and date renders as 67/6767/$67.67; the slip always marks 6 and 7.
- No overlay ever intersects an answer tile's or the timer's bounding box, at 360, 390 and 430 px widths (automated layout test).
- Every overlay closes with one tap, and on its own at `until`. A player can always lock an answer while an overlay is up.
- A reload during an active event re-renders the same event (same numbers/tile) until `until`.
- Off intensity and Calm mode behave as specified; reduced-motion users see no animation.

### Tone

The Singapore set (TOTE-LLY LUCKY, 4D, Huat Ah!, Auntie) is affectionate in-group humour. The slip and receipt borrow the generic layout of a betting slip and a thermal ticket, with a parody wordmark and a 67 watermark instead of the real operator's logo, and a "NOT A REAL TICKET" line. The bait set (boss email, 12.3 sale, Melvin) are in-jokes; the sale uses no real marketplace's name or logo. The God of Wealth is named in the copy and never drawn. The joke is the chain message and the chope, never the auntie herself. Anne can switch off any event.

## 9. Non-functional requirements

- **Mobile-first:** designed at 390×780 CSS px (iPhone 12–15 class); must work from 360 wide to 430 wide. Portrait only. Everything fits without scrolling during a timed phase; scrolling is allowed in the lobby, leaderboard and host lists.
- **Readability on a phone:** question ≤110 characters (24/30 type), answers ≤40 characters (18/24), nothing interactive below 16px, tap targets ≥48px.
- **Scale:** 15 players + host ≈ 16 WebSocket clients; design for 30.
- **Latency:** state changes visible on all phones within 300 ms on venue Wi-Fi or 4G.
- **Timer integrity:** the server sends an absolute `endsAt`. Phones render remaining time from `endsAt` minus their estimated clock offset, measured by a ping at join (offset = server time − midpoint of round trip). Phones never count down on their own.
- **Determinism:** the modifier plan, MYSTERY resolution and chaos draws all come from one room seed via a seeded PRNG (e.g. mulberry32), so the game is reproducible and testable.
- **Phone lifecycle:** request a Screen Wake Lock during play where supported; on `visibilitychange` back to visible, resync state immediately.
- **Resilience:** room state persisted after every transition; a host reload resumes at the same phase.
- **Fairness:** the answer key, future modifiers, the MYSTERY draw and others' answers never reach player phones before their reveal. Host routes need the host secret, kept in the URL fragment so it's never sent in requests or logs.
- **Devices:** iOS Safari and Android Chrome, last 2 versions.
- **Accessibility:** contrast verified for every skin and chaos palette; shapes + letters back up answer colours; modifiers carry icon + name, not colour alone; nothing flashes more than 3 times per second (WCAG 2.3.1); motion stops under `prefers-reduced-motion` and in Calm mode; inputs ≥16px so iOS doesn't zoom.

## 10. Architecture options

Both options are mobile web front ends (React + Vite or Next.js) built from this design system, with two routes: `/` (player) and `/host#secret` (host). The difference is **who is authoritative for game state, timers and randomness.**

**Option 1 — Supabase Realtime, host-authoritative.** Anne's host app runs the game state machine (including the chaos scheduler and MYSTERY draw) and broadcasts state on a room channel. Players send bets and answers over Broadcast; Presence tracks who's online; Postgres stores the room snapshot after each transition.
- Fit: on the free plan Realtime allows [200 concurrent connections and 100 messages per second](https://supabase.com/docs/guides/realtime/quotas), well above the need. [Presence is capped at 20 messages/s on Free](https://supabase.com/docs/guides/realtime/limits), so use it for join/leave only.
- Watch: reactions fan out to every phone. 15 players × 2/s broadcast to 16 clients could exceed 100 messages/s if each delivery is metered. Batch reactions on the host and rebroadcast a summary at most 4×/s. [Clients over the limit are disconnected](https://supabase.com/docs/guides/realtime/limits) until throughput drops. Chaos events are targeted, so send them on per-player channels.
- Risk: **the host is a phone.** If Anne's phone locks, the authority (and every scheduled chaos event) disappears. Mitigations: Wake Lock, pause-on-disconnect, resume from the snapshot, or run the host on a plugged-in laptop.

**Option 2 — PartyServer on Cloudflare Durable Objects, server-authoritative.** One room = one Durable Object holding the state, validating every action and broadcasting. Timers and chaos events use Durable Object alarms: [PartyServer exposes `onAlarm()`, scheduled with `this.ctx.storage.setAlarm(Date)`](https://cdn.jsdelivr.net/npm/partyserver@0.5.6/README.md). In PartyKit's model, [each room runs in a separate Durable Object](https://docs.partykit.io/how-partykit-works/). A Durable Object has one alarm at a time, so keep a sorted queue of due times (phase deadline + chaos events) in storage and always set the alarm to the earliest.
- Fit: the server owns the clock, the seed and the answer key, so Anne's phone is just a privileged client.
- Cost: more to learn (Workers, wrangler config, DO migrations).

**Recommendation:** Option 2. Round modifiers and targeted chaos events add timed, secret server-side state, and a phone is a fragile place to keep it. Option 1 if time is short, with the mitigations above. Either way, write the game logic as a pure reducer `(state, action) → state`, with `planModifiers`, `delta` and `scheduleChaos` as pure functions, so it can be unit-tested and moved between options.

### Data model (sketch)

```json
{
  "room": { "pin": "ANNE", "seed": 36, "phase": "ANSWER", "q": 7, "endsAt": 1764000000000, "calm": false },
  "plan": ["normal","double","normal","risky","double","normal","trouble","mystery","double","trouble"],
  "locked": [1, 6, 9, 10],
  "mysteryResolved": { "8": null },
  "chaos": { "intensity": "chaos", "enabled": ["scam_eyepad","scam_virus","scam_smileys","toto","fourd","huat","auntie_forward","auntie_chope","boss_email","bday_sale","melvin"], "mercy": true },
  "chaosQueue": [{ "id": "c_91", "kind": "toto", "player": "p_8f2c", "q": 7, "at": 1763999991000, "until": 1763999996000, "data": { "numbers": [6,7,16,17,26,27] } }],
  "players": { "p_8f2c": { "name": "xX_Pr1ya_Xx", "avatar": 2, "chips": [200,300,600,1000], "score": 2800, "online": true,
               "power": { "nudge": 1, "popup": 0 }, "chaosCount": 1, "chaosSeen": ["huat"], "chaosMs": 3100 } },
  "bets":    { "p_8f2c": 300 },
  "answers": { "p_8f2c": { "v": "c", "at": 1763999998123 } }
}
```

### Question file

```json
[
  { "id": 2, "skin": "igloo", "type": "mc", "category": "Chilly Facts",
    "prompt": "Which drink does Anne order every. single. time?",
    "options": ["Iced oat latte", "Matcha, oat, no ice", "Bubble tea, 0% sugar", "\"Just water\" (lies)"], "answer": 1, "seconds": 20 },
  { "id": 4, "skin": "ie", "type": "typed", "category": "Ancient History",
    "prompt": "What was the first concert Anne ever went to?", "accept": ["mcfly"], "seconds": 30 },
  { "id": 6, "skin": "dollz", "type": "fave", "category": "Fashion Crimes",
    "prompt": "Design Anne's birthday outfit in five words or fewer.", "seconds": 45, "modifier": "normal" },
  { "id": 9, "skin": "brick", "type": "number", "category": "Phone Crimes",
    "prompt": "How many unread texts does Anne have right now?", "seconds": 25 },
  { "id": 10, "skin": "bsod", "type": "mc", "category": "FINAL", "modifier": "trouble",
    "prompt": "What is Anne's go-to karaoke song?",
    "options": ["Since U Been Gone", "Toxic", "Mr. Brightside", "She refuses. Coward."], "answer": 0, "seconds": 25 }
]
```

An optional `"modifier"` on a question pre-locks that row in the plan; everything else is generated.

## 11. Design system inventory (what this artifact provides)

| Need | Here |
|---|---|
| Every surface | **Window**, **Button**, **Dialog**, **Taskbar** (phone footer) |
| Timing | **CountdownTimer** (urgent ≤5s, done at 0) |
| Wager | **WagerPicker** (chips, spent state), chip stakes in **PlayerModifier** |
| Modifiers | **RoundModifier** (5 badges, small pill, heat strip) |
| Answering | **AnswerTile** (6 states), **TextAnswer** (address bar), comment box (Instagran), keypad (Brick), friend grid (MySpaze) |
| Opinion rounds | **FavePicker** (crown, +lol) |
| Chaos | **ChaosScam**, **ChaosToto** (TOTE-LLY slip + 4D receipt), **ChaosBait** (boss email, 12.3 sale, Melvin), **ChaosHuat**, **ChaosAuntie** |
| People | **BuddyList**, 8 pixel avatars, **QRJoin** |
| Scores | **Leaderboard** |
| Fun | **Reactions**, **Motion**, troll **Dialog** |
| Player app | **PlayerJoin**, **PlayerModifier**, **PlayerBet**, 11 question **Skins**, **PlayerChaos**, **PlayerWaiting**, **PlayerReveal**, **PlayerLeaderboard**, **PlayerPodium** |
| Host app | **HostSetup**, **HostLobby**, **HostLive**, **HostJudge**, **HostPickFave** |

## 12. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | Clickable prototype | Player and host flows wired with fake state on two real phones |
| M1 | Real-time core | Join → lobby → multiple choice with wagers → reveal → leaderboard, 3 phones + host |
| M2 | Scoring engine | `delta`, `planModifiers` + `validate` with unit tests (every constraint, every outcome × modifier); HostSetup planner |
| M3 | All question types + host app | Judge, Pick fave, Enter number, Crowd's Pick, MYSTERY reveal |
| M4 | Skins | All 10 lineup skins (+ spare) render at 360–430 px wide |
| M5 | Chaos layer | `scheduleChaos`, the 11 events, power-ups, reactions, sounds, Calm mode; layout test for the layering contract |
| M6 | Dress rehearsal | 4+ real phones (iOS and Android) on the venue Wi-Fi with the actual questions; fix list closed |

## 13. Risks

| Risk | Mitigation |
|---|---|
| Venue Wi-Fi is bad | Works on 4G; payloads are tiny; test at the venue in M6 |
| Anne's phone sleeps mid-question | Server-authoritative timers and chaos queue (Option 2) or pause-on-disconnect (Option 1); Wake Lock |
| Phones lock mid-question | Reconnect to the same seat; resync on `visibilitychange`; deadline is server-side |
| Penalty rounds feel punishing | Curve keeps Q1–Q3 safe, max 3 penalty rounds, never back-to-back; stakes shown on chips; no penalties on Fave or Number |
| Someone sinks deep into debt and checks out | "IN DEBT" is played as a joke; DOUBLE rounds after penalties give a way back; mercy rule spares them from chaos |
| Chaos blocks answering | Layering contract + automated layout test; one tap to close; auto-dismiss |
| Small screens + long questions | Hard limits (110 / 40 chars) enforced when loading `questions.json` |
| Photosensitivity or motion sensitivity | No flashing above 3/s; reduced motion honoured; Calm mode |
| IP and tone | Parody names, original art and sounds; no real logos, mascots or audio clips; affectionate Singapore humour |
| Vibration on iPhone | Treat `navigator.vibrate` as unsupported on iOS Safari until tested on real devices; the visual shake is the primary feedback |

## 14. Open questions

1. The birthday is 3 Dec (12.3). Is the party on the day? That sets the build window for M0–M6.
2. Final question: keep DOUBLE TROUBLE, or soften to DOUBLE?
3. Should MYSTERY exist at all, or is it too cruel?
4. Will a TV or laptop be around? If so, Big-screen mode (§8.16) is cheap to add.
5. Which friend-based questions are fair game? Crowd's Pick roasts real people.
6. Use the spare skin (Instagran) as the tiebreaker, or swap it into the lineup?
