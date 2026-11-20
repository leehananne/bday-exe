# BDAY.EXE — build handoff

One file with everything a coding session needs: the PRD, the brand book, every component's guidelines, the compiled design tokens, and the shared stylesheet and preview helpers. Generated from the BDAY.EXE design system on 20 Nov 2026.

## How to use this file

1. Read **Part 1 (PRD)** for what to build. §4 is the game loop, §5–6a scoring and modifiers, §8 requirements, §8a chaos events, §8b the results page (decided: PlayerResults), §10 architecture (recommended: PartyServer on Durable Objects) with types, data model and question file.
2. Read **Part 2 (Brand book)** for the rules every screen follows.
3. Use **Part 3 (Components)** as the screen and component inventory; each entry says what data it needs.
4. Copy **Part 4 (tokens.css)** and **Part 5 (bundle.css)** into the app's global styles. Every `bx-*` class in the component guidelines is defined there. Use **Part 6 (bundle.js)** for reference only; it's a preview helper (avatars, placeholder QR, demo timers), not app code.
5. The Spotlight reveal has its own ready-made kit (spotlight.css / spotlight.js / Spotlight.tsx) in the design system's Assets › Spotlight; its usage notes are in Part 7.

Build order from the PRD milestones: M0 clickable prototype → M1 real-time core → M2 scoring engine (pure functions + unit tests) → M3 question types + host app → M4 skins → M5 chaos layer → M6 dress rehearsal.

---

# Part 1 — PRD

A real-time, **mobile-first** birthday trivia game for ~15 friends in one room. Everyone plays on their own phone, and the birthday host runs the game from hers. Ten questions, each in a different early-2000s internet skin, a wager on every question, round modifiers that make the scoring escalate, and random chaos pop-ups to disturb everyone.

| | |
|---|---|
| Owner | Anne (host, designer, builder) |
| Status | Draft v4: mobile-first, two UIs, round modifiers, chaos events, results page decided. Ready to code from |
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

- **The reveal is a hype moment, not a toast.** At the start of each bet phase the modifier gets the **Spotlight** (design system › Motion › Spotlight). The screen dims (`qr-ink` at 74%), a light pool opens, two gold beams sweep, and the badge slams in with a drumroll line ("★ THIS ROUND IS… ★") and a one-line rule. It holds for ~2.7s, then flies up into its meta-row pill instead of fading out, so players see where it went. The bet timer starts only after it leaves. The same Spotlight is used for the MYSTERY rule at reveal and for the crowned Host's Fave. Under reduced motion or Calm mode it's a static dimmed banner.
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
6. **Modifier planner** (HostSetup): generate from seed, show the plan with validation, lock/edit/re-roll, save. Spotlight modifier reveal at the start of every bet phase (PlayerModifier), then stakes on each chip.
7. Host-paced reveal: (mystery rule) → split → answer → points → leaderboard. Each player sees their own result (right/wrong, delta, new rank) in the skin.
8. The final question uses the FINAL modifier. Then **Results** on every phone: a compact podium (block heights fixed by rank, never by score) above a diverging bar chart of every player around a zero axis, with the viewer highlighted (PlayerResults). Then the full **Ranking** spreadsheet with tap-for-stats (PlayerRanking), the joke awards (Most Wrong, Chaos Agent, Most Scammed, Anne's Fave Human) and a personal report.
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

## 8b. Results and ranking (end of game)

**Decision (20 Nov):** the results page is **PlayerResults**: compact podium + the Spreadsheep diverging bar chart. The dot strip, score journey and tiers in ResultsAlternatives are reference only and are not built in v1.

End-of-game sequence on every phone: Spotlight crown moment → **PlayerResults** → Awards → **PlayerRanking** → personal report → Shut down party.

### PlayerResults spec

| Players | Row height | Behaviour |
|---|---|---|
| ≤ 15 | 20px (`.bx-hbar`) | Whole chart visible, or a short scroll inside the chart window |
| 16–30 | 15px (`.bx-hbar--tight`) | Chart scrolls inside its window (`.bx-xl-chart__scroll`); the page itself never scrolls |
| > 30 | 15px | Same as above (not expected at this party) |

- **Layout (top → bottom):** `Setup — Installation complete` window with "Anne is now 24. Winners:" + `.bx-podium-sm` → Spreadsheep window (`.bx-xl`) with toolbar, formula bar, chart (`.bx-xl-chart`), sheet tabs → two buttons: Awards ▸ / Full ranking ▸.
- **Podium:** order 2 · 1 · 3. Block heights fixed by rank (56 / 40 / 28px; fills `favourite`, `medal-silver`, `medal-bronze`, text `on-medal`). Avatar, name and score sit above each block. Scores can be negative; blocks never resize to score or to leftover space (`align-items: end`, no flex-grow).
- **Chart rows:** `label (112px) | plot (1fr) | value (50px)`. Label = rank (medal emoji for 1–3) + 16px avatar + name (ellipsis). Value right-aligned, tabular numbers, negatives in `xl-neg` with a true minus (−).
- **Axis maths:** `lo = min(0, minScore) − 400`, `hi = maxScore + 400`, `pos(v) = (v − lo) / (hi − lo) × 100%`. Zero line at `pos(0)`, 2px `xl-ink`. Gridlines at every multiple of 4,000 within range, 1px `xl-grid`, labelled `−4k · 0 · 4k · 8k` under the plot.
- **Bars:** positive: `left: pos(0); width: pos(v) − pos(0)` in `xl-pos`, rounded right end; zero scores get a 0.6% sliver. Negative: `left: pos(v); width: pos(0) − pos(v)` in `xl-neg`, rounded left end.
- **You:** the viewer's row gets `.bx-ants` (animated dashed box; static under reduced motion) + `.bx-you-tag`, and is scrolled into view on mount (`scrollIntoView({ block: 'center' })` inside the chart scroller).
- **Tap a row:** yellow `.bx-xl-tip` above it: "Name: score · n/10 right · rank r of N". One tooltip at a time; tap elsewhere closes it.
- **Formula bar:** cell ref of the viewer's row and `=RANK(<score>, Scores) → <rank>`.
- **Sorting and ties:** score desc → right answers desc → name asc. Tied scores share a rank (1, 2, 2, 4); the medal goes to every player sharing ranks 1–3.
- **Accessibility:** the chart is `role="table"` with one `role="row"` per player and an `aria-label` like "Rank 10, Dev, −300 points, you". Colour is never the only cue: every value is printed, and debt also shows on the ranking sheet.

### PlayerRanking spec

- Spreadsheet table (`.bx-sheet`), columns `# | Player | Score | Right`; rows 1–3 filled gold/silver/bronze; negatives in accounting brackets in `xl-neg`; the viewer's row has `.bx-ants` + YOU tag.
- Tap a name: cell comment (`.bx-xl-note`, red corner on the cell) with rank, right answers, score, worst bet, chaos received and award.
- Tabs: Ranking (active) · Chart (back to PlayerResults) · Q1–Q10 · Chaos log. The last two are stretch goals.

### Data the server must send at game end

```ts
interface FinalStanding {
  playerId: string; name: string; avatar: number;   // 0–7
  score: number;                                    // can be negative
  rank: number;                                     // shared on ties
  right: number;                                    // correct answers out of 10
  worstBet?: { q: number; chip: number; text: string };
  chaosReceived: ChaosKind[];
  awards: ('most_wrong' | 'chaos_agent' | 'most_scammed' | 'anne_fave_human')[];
}
// Send the full sorted list to every phone; each client marks its own playerId.
```

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
| Scores | **Leaderboard**, **PlayerResults** ✅ chosen results page (podium + diverging bars), **PlayerRanking** (spreadsheet), ResultsAlternatives (reference only, not in v1) |
| Fun | **Reactions**, **Motion**, **Spotlight** (hype reveals), troll **Dialog** |
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

---

# Part 2 — Brand book

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
| Spotlight | `.bx-spotlight` (+ `.is-leaving`) | 0.6s slam, ~2.7s hold, 0.4s fly-up | Hype reveals only: modifier, MYSTERY rule, crowned fave. Exits by flying into place, never fading |
| Pointer | `.bx-pointer` + `.is-beckon` | 1.1s bounce | Giant arrow cursor + pulsing outline showing where to type; removed on focus |
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

## Results charts

- Results live in a Spreadsheep 2003 window (`.bx-xl`): toolbar, formula bar (a joke slot), chart object, sheet tabs. Colours: `xl-sheet`, `xl-ink`, `xl-head`, recessive `xl-grid`.
- Scores use a diverging pair: `xl-pos` for points, `xl-neg` for debt (validated: CVD ΔE 17.8). Every bar also prints its value. Debts read as accounting brackets in the ranking sheet.
- Podium blocks are sized by rank, never by score. Medal fills: `favourite`, `medal-silver`, `medal-bronze` with `on-medal` text.
- The viewer is marked with marching ants (`.bx-ants`) + a YOU tag, never colour alone.
- Line charts (score journey) use `series-1/2/3` for the top 3 (validated set), ink at 3.5px for "you", and `xl-grid` for everyone else.

## Accessibility checklist

- Text ≥4.5:1 on its ground in every theme (verified for all 8); control edges and focus ≥3:1.
- Shape + letter on every answer; status words with every status colour.
- All dialogs are `role="alertdialog"` with a labelled title; reactions and icon buttons have `aria-label`s.
- Timer seconds are visual; announce only "10 seconds left" and "Time's up" to screen readers.

---

# Part 3 — Components and screens

### Chrome

#### Button

Bevelled push buttons: default, `--primary` (one per screen, `accent`), `--danger` (`wrong`), `--lg`, `--block` and the `--start` pill for the FlopXP taskbar.

**Consumer provides:** a verb-first label, optional leading glyph, `aria-pressed` for toggles, `disabled` when unavailable.

- Phones use `--lg --block` for the main action (56px tall).
- Pressed and selected share `shadow-pressed`, plus a 1px drop.
- Troll labels are welcome on secondary actions (**Yes but louder**), never on the primary.
- Don't put two primaries in one view.

#### Dialog

Pop-up dialogs for errors, warnings and the fake-ad troll, built on Window with `.bx-dialog`, icon + message body and right-aligned actions.

**Consumer provides:** title, icon (error ✗ on `wrong`, star on `favourite`), 1–2 short paragraphs, 1–2 actions. Mark it `role="alertdialog"` with a labelled title.

- Enter with `.bx-anim-pop`. Never cover answer tiles or the Lock in button; on phones, a pop-up ad sits above the reaction bar and closes in one tap.
- Each player can send one pop-up ad per game (see PRD §8).
- Never show more than one dialog on a phone at once.

#### Taskbar

Phone footer HUD for FlopXP-styled screens: start pill, the current question as a task, a tray with the locked-in count and a clock.

**Consumer provides:** question list with done/current state, locked-in count, seconds remaining (driven from the server `endsAt`).

- Pin it to the bottom of `.bx-phone`; keep the tray clock in `pixel` type.
- Collapse past questions to "Q1 ✓"; never show future question titles (spoilers).

#### Window

The base surface: every question, dialog, list and panel is a `.bx-window` with a title bar, optional menu bar, body and status bar.

**Consumer provides:** a title, the body content, optional `_ □ ×` controls (`.bx-ctl`, close = `.bx-ctl--close`), optional `.bx-menubar` and `.bx-statusbar` text.

- Use the title bar for jokes (`Question_3_of_10.exe`, `Marcus's brain (Not Responding)`); keep the body for the real content.
- Status bars carry live counts: "11 of 15 locked in", "Wager: 700".
- `.bx-anim-wobble` on a window = someone hasn't answered. Use at most one wobbling window per screen.
- Don't nest windows more than one level, and don't hard-code radius; the skin sets `--bx-r-win`.

### Game

#### AnswerTile

Answer buttons with fixed colour + shape + letter (A▲ B◆ C● D■) that look the same in every skin.

**Consumer provides:** key (`data-k="a"…"d"`), answer text (≤40 chars), state class, optional count (`.bx-answer__count`) and badge (`.bx-answer__badge`).

- States: rest, `is-selected` (+ "You" badge), `is-correct` (✓ + CORRECT), `is-wrong` (✗ + troll word), `is-dim`, `is-fave` (★).
- On phones use `.bx-pq__answers` (full-width stack, rows share the height); `.bx-answers` is a 2×2 grid for the host's split view.
- Keep answers to ~40 characters.
- Don't recolour tiles per skin. The skin may change the tile's font and radius only.

#### BuddyList

A messenger-style list of players grouped by state: Locked in, Thinking, Away.

**Consumer provides:** players with avatar index, name, state and an optional status line (bet amount, "is typing…", "Reconnecting…").

- Used in the lobby, the waiting state and the host app.
- `is-away` after 10s without a heartbeat; restore when the player reconnects.
- Never reveal a player's chosen answer in the list, only that they're locked in.

#### CountdownTimer

A "copying files" progress bar plus big pixel seconds; turns urgent at ≤5s and inverts at 00.

**Consumer provides:** total seconds and remaining seconds computed from the server's `endsAt` (never a local countdown), optional label.

- States: running, `is-urgent` (seconds on `wrong`), `is-done`.
- The label is the place for jokes ("About 12 seconds remaining (it's lying)").
- Announce only "10 seconds left" and "Time's up" to assistive tech; the seconds element is `aria-hidden`.

#### FavePicker

Host-only grid for opinion questions: anonymous answers as cards, one crowned ★ Host's Fave, up to three "+lol" bonuses.

**Consumer provides:** the answers (text only, authors hidden), crown state, +lol state and remaining count, Crown & reveal action.

- Crowned scores ×2 the chip; +lol scores the chip; the rest score 0 (PRD §6).
- Players only see their own submission until the crown.
- Names appear only after the crown.

#### Leaderboard

An Explorer "details view" table of rank, name, points and last-question swing.

**Consumer provides:** sorted rows (rank, avatar index, name, points, delta), the viewer's row (`is-me`), `is-first` for the leader.

- Deltas use ▲ / ▼ / — glyphs plus text, never colour alone.
- Phones show the whole list scrolled to `is-me`, plus a Biggest mover card.

#### QRJoin

The join card: QR code, short URL and 4-letter PIN.

**Consumer provides:** the join URL (the QR encodes it with the PIN), the display URL, the PIN letters. Shown on the host's phone for friends to scan.

- QR is always `qr-ink` on `qr-paper` with a quiet zone, ≥220px on the host's phone at full brightness.
- The preview QR is a placeholder pattern. Generate a real one from the URL at build time.
- PIN letters avoid ambiguous pairs (no O/0, I/1).

#### Reactions

Phone reaction bar (8 buttons: emoji + era emoticons) and the lane where everyone's reactions float up on every phone with the sender's avatar and name.

**Consumer provides:** the reaction set, the per-player throttle (2/s), the sender's avatar and name, and the chaos power-ups' remaining counts.

- Batch reactions server-side and fan them out at most 4 times a second (PRD §10).
- The lane only shows in waiting states and never crosses answer tiles.
- Nudge and Pop-up buttons show "(1 left)" and disable at 0 and in the last 5 seconds.

#### RoundModifier

The scoring rule for one question, shown before betting: NORMAL, DOUBLE POINTS, RISKY, DOUBLE TROUBLE, MYSTERY, plus a small pill for the meta row and the 10-question heat strip.

**Consumer provides:** the modifier id; for the heat strip, the heat of past and current questions only.

- Colour plus icon plus name, never colour alone: 2× gold, − red, ±2 hazard stripes, ? inverted.
- Rules in PRD §6a.

#### TextAnswer

A fake browser address bar for typed answers, with a deliberately unhelpful autocomplete.

**Consumer provides:** input value, max length (40), autocomplete suggestions (troll strings, never hints), Go action.

- Suggestions must be obviously silly ("nickelback-is-art.com"), so they can't leak or nudge the real answer.
- The host judges submissions in the Control Panel; similar spellings are merged automatically and confirmed by the host.
- Keep the input at 16px so iOS doesn't zoom.

#### WagerPicker

Ten confidence chips (100–1000), each spendable once per game, shown with the category before the question appears.

**Consumer provides:** the category, each chip's state (available / selected / spent), the selected value, the 10s bet timer and a Lock in action.

- Spent chips are `disabled` with an `aria-label` like "300, spent".
- On the final question add `.bx-chip--double` to show ×2.
- If the timer ends without a pick, auto-spend the smallest remaining chip and say so.
- Don't show the question text during the bet phase.

### Motion

#### Motion

The motion vocabulary: nudge, pop-in, wobble, float-up, twinkle, hourglass spin, stripes, blink, marquee.

**Consumer provides:** nothing beyond adding the class; durations are fixed (see the brand book's Motion table).

- Everything stops under `prefers-reduced-motion` and in Calm mode (`.bx-calm` on the root).
- Nothing flashes more than 3 times per second.
- Nudge = whole window or phone UI, 0.6s, and `navigator.vibrate(200)` where supported.

#### Spotlight

The hype moment: `.bx-spotlight` dims the screen, opens a light pool, sweeps two gold beams and slams a banner in with overshoot; on exit (`.is-leaving`) the banner flies up into its resting place instead of fading out.

**Consumer provides:** the banner (usually a `.bx-mod` badge), a drumroll line, a one-line rule, optional heat strip; add `.is-leaving` ~3.3s after mount and unmount 400ms later.

- Use for: the modifier reveal, the MYSTERY rule at reveal, the crowned Host's Fave. Not for chaos events.
- Under reduced motion or Calm mode it shows the dimmed, static banner only; beams don't sweep and nothing slams.
- The bet timer starts after it leaves, so it never eats betting time.

### Chaos

#### ChaosAuntie

Auntie events: a forwarded good-morning chain message over the question card, and a tissue packet that chopes one answer tile.

**Consumer provides:** which tile is choped (never the player's current pick), close/clear handlers.

- A tap on a choped tile clears the tissue and does not select the answer; the next tap does.
- Keep it affectionate: the joke is the forward and the chope, never the auntie.

#### ChaosBait

Bait pop-ups: the 6:07pm boss email ("can i get that ppt in 5 min?"), the overstimulating 12.3 Birthday Super Sale, and the Yah! Answers page asking "is Melvin a name for a gangster?".

**Consumer provides:** close handler; all copy is fixed.

- The email uses FlopXP chrome; the sale and Yah! Answers use their own fixed palettes (`sale-*`, `answers`).
- Every button just closes the pop-up. CLAIM ALL says so.

#### ChaosHuat

Huat Ah!: a red-and-gold blessing banner with 发, plus red packets and gold ingots raining across the phone.

**Consumer provides:** close handler; mount `.bx-rain` on the phone root.

- The God of Wealth is named in the copy, never drawn. The banner is respectful; the joke is "Effect: none".
- Rain is `pointer-events: none`, 4s, and is skipped under reduced motion and Calm mode.

#### ChaosScam

Random scam pop-ups for chaos events: FREE eyePad, "24 viruses", FREE SMILEYS. Always FlopXP chrome, whatever the skin.

**Consumer provides:** variant, optional fake countdown, close handler.

- The × is deliberately tiny on the eyePad variant but always closes in one tap; the pulsing CTA also just closes it (and says "lol no").
- Auto-dismiss after 5s. Never more than one chaos overlay per phone at once.

#### ChaosToto

Lottery chaos: the TOTE-LLY LUCKY 6/49 betting slip (boards A–D of 1–49 with VOID bars, $1–$100 stake boxes, QP/SYS and draw options, gold side panel; pencil marks on 6 and 7) and a 4D thermal receipt where every number is 67.

**Consumer provides:** nothing variable: the 67s are the joke. Close handler. On phones use `toto(phone)` (one board, narrow panel) and the compact 4D (no barcode or meta lines).

- Parody wordmark (TOTE-LLY) and a 67 watermark replace the real operator's logo; the receipt says NOT A REAL TICKET.
- Auto-dismiss after 5s; never covers answers or the timer.

### Player · Screens

#### PlayerBet

Bet phase, already in the next question's skin: category only, a 10s timer and the chip grid; then the locked confirmation with remaining chips and power-ups.

**Consumer provides:** category, chip states, bet `endsAt`, the player's pot, power-up counts.

- The skin change is the first reveal of what's coming.
- No pick in 10s auto-spends the smallest chip.

#### PlayerChaos

Random chaos events landing mid-question: a half TOTE-LLY LUCKY slip over the question card, Huat Ah! with red-packet rain, and Auntie's tissue packet choping an answer tile.

**Consumer provides:** the active chaos event for this player (kind, `until`), the question card to wrap in `.bx-chaos-zone`.

- Overlays live inside `.bx-chaos-zone`: they may cover the question card for ≤5s, never the answers, never the timer.
- Rain ignores taps. The chope is the only event that touches a tile, and one tap clears it.

#### PlayerJoin

Player sign-in from the QR or group-chat link (PIN prefilled), then the waiting room with buddies and reactions.

**Consumer provides:** PIN from the URL, name validation (≤16 chars, de-duplicated), avatar choice, lobby list.

- Store the player id in `localStorage` so the same link reconnects to the same seat.
- Ask for nothing else: no email, no account.

#### PlayerLeaderboard

Standings after each reveal with your row highlighted and a biggest-mover card, then a fake installer while the next skin loads.

**Consumer provides:** sorted scores with deltas, the viewer's row, the biggest mover, zero-scorers, the next skin's name.

- Stays on screen until the host advances.

#### PlayerModifier

Start of each bet phase: the round modifier gets the Spotlight (screen dims, two gold beams sweep, the badge slams in with a drumroll line), holds ~2.7s, then flies up into its meta-row pill. Then the chips show what each bet could win or lose.

**Consumer provides:** this question's modifier, the heat strip (past + current only), chip states, the player's pot.

- Always reveal the modifier before betting, except MYSTERY (revealed with its own Spotlight at the start of the reveal).
- Chip stakes show ±value for penalty rounds, +value otherwise.

#### PlayerPodium

Finale on every phone: a setup-wizard podium with confetti and joke awards, then a personal report and Shut down party.

**Consumer provides:** top 3, award winners, the player's rank, correct count, best and worst bet, chaos stats.

- The personal report is laid out for screenshots in the group chat.

#### PlayerRanking

The full final ranking as a 2003 spreadsheet: rank, player, score, right answers; gold/silver/bronze row fills; debts in accounting brackets in `xl-neg`; the viewer's row selected with marching ants; sheet tabs for Chart, Ranking, Q1–Q10 and Chaos log.

**Consumer provides:** sorted players with score and right count; per-player stats for the cell comment (worst bet, chaos received, award).

- Tap a name → an Excel cell comment (red corner triangle + yellow note) with that player's stats.
- The formula bar is a joke slot: `=IF(C11<0, 'IN DEBT', 'fine')`.

#### PlayerResults

✅ **The chosen results page (20 Nov).** End-of-game results on every phone: a compact podium (block heights fixed by rank 1/2/3, never by score, so negative winners still look right) above a Spreadsheep 2003 chart window with a diverging horizontal bar per player around a zero axis.

**Consumer provides:** all players sorted by score (name, avatar, score, right count), the viewer's id, the tooltip target.

- Bars right of 0 are `xl-pos`, left of 0 are `xl-neg` (validated pair, CVD ΔE 17.8), and every value is printed at the row end, so colour is never the only cue.
- The viewer's row gets Excel marching ants (`.bx-ants`) plus a YOU tag. Auto-scroll it into view.
- ≤15 players: 20px rows. 16–30: `.bx-hbar--tight` (15px) and the chart scrolls inside its window. 30+: keep the tight rows (the dot strip in ResultsAlternatives is not built in v1). Full spec in PRD §8b.
- Axis domain = [min(0, lowest) − 400, highest + 400], ticks every 4k, zero line 2px.

#### PlayerReveal

Your own result on your phone: right (points pop in, the room's split per answer) or wrong (troll error dialog with the real answer).

**Consumer provides:** your answer, the correct answer or crowned fave, your delta, your new total and rank, counts per option.

- Shown in the question's skin.
- Always state the correct answer in words, not only by colour.

#### PlayerWaiting

After lock-in: who's still thinking (wobbling, nudgeable), floating reactions, and what being trolled looks like (nudge shake + pop-up ad).

**Consumer provides:** locked answer, the not-yet-answered list, incoming reactions, incoming nudges and pop-ups.

- Players can still change their answer until time's up.
- Pop-ups never cover the answer tiles; one tap closes them.

#### ResultsAlternatives

**Reference only, not built in v1** (PlayerResults was chosen on 20 Nov). Three fallbacks if the bar chart gets crowded: A · dot strip (every player is a dot on one score line, stacked where they cluster; only top 3, you and last are labelled; fits any player count on one screen), B · score journey (score after each question; top 3 in validated series colours, you in thick ink, everyone else grey; the DOUBLE TROUBLE round shaded), C · tiers (Hall of Fame podium / My Documents chips / Recycle Bin for everyone in debt; no chart at all).

**Consumer provides:** final scores (A, C) or per-question running totals (B).

- A works as the main results view past ~30 players. B is the best second page after the podium. C is the most robust on tiny screens and for screen readers.

### Player · Question skins

#### SkinBSOD

Every phone "crashes" at the same instant for the final question, played on DOUBLE TROUBLE (right ×2, wrong −2×) by default.

**Slot:** Q10 · **Theme:** fixed `bsod` / `bsod-ink` + `.skin-bsod` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- Hard cut, no fade: the crash is the joke.
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

#### SkinBear

Stitched felt, dashed seams and a workshop step tracker that never reaches "Adopt".

**Slot:** Q7 · **Theme:** `bear` + `.skin-bear` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- The plush drawing is original; no real store branding.
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

#### SkinBrick

The phone turns into a brick: monochrome LCD, the question as an SMS, and a closest-number answer typed on a T9 keypad.

**Slot:** Q9 · **Theme:** fixed `lcd` / `brick-body` / `key` tokens + `.skin-brick` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- Fixed palette, so it looks identical whatever theme is active.
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

#### SkinDollz

Hot pink, dashed frames and glitter for the free-text Host's Fave question.

**Slot:** Q6 · **Theme:** `dollz` + `.skin-dollz` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- Looks are anonymous until Anne crowns one; `script` type only in the header.
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

#### SkinExploder

The whole phone is a browser; you type your answer into the address bar and the page uses a 1999 default stylesheet.

**Slot:** Q4 · **Theme:** `xp` + `.skin-ie` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- Until the player taps the address bar, a giant arrow cursor (`.bx-pointer`) bounces at it with a "TYPE UR ANSWER UP HERE!!!" sticker and the bar pulses gold (`.is-beckon`); both disappear on focus. Autocomplete suggests nonsense, never hints. One fake ad may pop up after you hit Go.
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

#### SkinFakebook

The question is a 2am status in a chat bubble; pokes and nudges land in the chat dock.

**Slot:** Q3 · **Theme:** `fakebook` + `.skin-fakebook` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- Flat, square, `ui` type; "Marcus is typing…" sits above the answers.
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

#### SkinFlopXP

A rolling-hill desktop: the question is a window, a joke desktop icon counts wrong answers, and a taskbar sits along the bottom.

**Slot:** Q1 · **Theme:** `xp` + `.skin-xp` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- Multiple choice warm-up.
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

#### SkinIgloo

Snow field, chunky 4px frames, `bubbly` type and a coin counter for your pot.

**Slot:** Q2 · **Theme:** `igloo` + `.skin-igloo` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- Timer label: "seconds before the ice melts".
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

#### SkinInsta

The 11th skin: an early photo-app post (gradient blue header, script wordmark, vignetted square photo, likes). Players answer by posting a comment.

**Slot:** Bonus · **Theme:** `insta` + `.skin-insta` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- Works for Typed (host judges the comments) or Host's Fave (Anne hearts her favourite comment). Comments stay hidden until the reveal.
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

#### SkinMonster

Purple goo, a slime-drip header (`.bx-goo`), `chunky` type and Gloop, an original one-eyed blob mascot.

**Slot:** Q5 · **Theme:** `monster` + `.skin-monster` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- At reveal Gloop "eats" the wrong tiles.
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

#### SkinMyspaze

Black glitter tile, a profile box, a marquee and a Friend Space Top 8 where you vote for a friend (Crowd's Pick).

**Slot:** Q8 · **Theme:** `myspaze` + `.skin-myspaze` · **Skeleton:** `.bx-pq` (meta row, question card, answers, footer) inside `.bx-phone`.

**Consumer provides:** question number, bet, `endsAt`, question text, answers or the type's input, and the reveal state.

- The "now playing" banner is a joke; never play real audio.
- Any question type works in any skin; the pairing in PRD §7 fits the joke best.
- Keep text on `window` surfaces (or the skin's fixed palette); tap targets ≥48px.

### Host · Screens

#### HostJudge

Host app judging: typed answers grouped by normalised spelling (Right / Merged / Wrong / +lol), and the real-number entry for closest-number questions.

**Consumer provides:** grouped submissions with counts, verdicts, the numeric guesses sorted by distance.

- Auto-merge lowercase, trimmed and near-identical spellings (edit distance ≤2), but the host confirms.
- Swipe right ✓, left ✗ for speed.

#### HostLive

Host app during a question: answer key and live split (players never see these), timer controls, who hasn't answered with a Nudge all button, then a step-by-step reveal with an optional roast line.

**Consumer provides:** live counts per option, `endsAt`, the not-yet-answered list, reveal step state.

- Reveal is host-paced: split → answer → points → leaderboard.

#### HostLobby

Host app (Anne's phone): share the room with a big QR plus copy/share link, then the lobby with kick buttons, chaos toggles and Start.

**Consumer provides:** room PIN and URLs, joined players, settings.

- The host URL carries a secret in the fragment. Never show it on screen or share it.
- Late joiners are allowed until Q3.

#### HostPickFave

Host app for opinion questions: anonymous answers as cards; tap to crown your favourite, long-press for up to three +lol bonuses; then the crown reveal goes to every phone.

**Consumer provides:** anonymous answers, crown and +lol state, remaining +lol count; after crowning, the author and points.

- Crowned scores ×2 the chip; +lol scores the chip; the rest score 0.
- Names appear only after the crown.

#### HostSetup

Host app, before the party: the round-modifier planner (seeded plan, lock rows, re-roll the rest, live validation) and chaos settings (intensity, per-event toggles, spare the host, test event).

**Consumer provides:** `questions.json`, the generated plan, validation results, chaos config.

- The plan is fixed once the game starts; the host can still swap a future modifier from HostLive.

---

# Part 4 — tokens.css (compiled from tokens.json)

Put `data-theme="<skin>"` on a screen root to switch skins: `xp`, `igloo`, `fakebook`, `monster`, `dollz`, `bear`, `insta`, `myspaze`.

```css
:root, [data-theme="xp"] {
  --desktop: #3a6fc8;
  --window: #ece9d8;
  --window-ink: #000000;
  --window-muted: #4a4a4a;
  --titlebar: #0047c7;
  --titlebar-end: #1f6fde;
  --titlebar-ink: #ffffff;
  --frame: #0831d9;
  --button: #f6f5f0;
  --button-ink: #000000;
  --button-border: #003c74;
  --bevel-light: #ffffff;
  --bevel-dark: #a7a493;
  --accent: #2f7d22;
  --on-accent: #ffffff;
  --highlight: #316ac5;
  --on-highlight: #ffffff;
  --sparkle: #ffd400;
  --focus: #000000;
  --answer-a: #c62828;
  --answer-b: #1b5fc1;
  --answer-c: #8a5a00;
  --answer-d: #2e7d32;
  --on-answer: #ffffff;
  --correct: #7cff4f;
  --on-correct: #0b2a00;
  --wrong: #b00020;
  --on-wrong: #ffffff;
  --favourite: #ffd400;
  --on-favourite: #3a2a00;
  --bsod: #0000aa;
  --bsod-ink: #ffffff;
  --qr-ink: #000000;
  --qr-paper: #ffffff;
  --lcd: #c7f0d8;
  --lcd-ink: #1e2a19;
  --lcd-muted: #3a4733;
  --brick-body: #9aa595;
  --key: #2c3a5a;
  --key-ink: #e6ebf5;
  --huat-red: #c8102e;
  --huat-gold: #ffd34d;
  --on-huat: #ffffff;
  --slip-paper: #fff6e0;
  --slip-ink: #a3122a;
  --forward-bubble: #dcf8c6;
  --forward-ink: #14260b;
  --tissue: #fafaf5;
  --tissue-ink: #3d3d3d;
  --slip-red: #d52b1e;
  --on-slip-red: #ffffff;
  --slip-gold: #9c7b1f;
  --on-slip-gold: #ffffff;
  --receipt-paper: #fcfcf9;
  --receipt-ink: #1a1a1a;
  --receipt-watermark: #f7cdd4;
  --sale: #d23a14;
  --sale-deep: #a8240a;
  --on-sale: #ffffff;
  --sale-yellow: #ffe14d;
  --on-sale-yellow: #7a1500;
  --answers: #5b1a8f;
  --on-answers: #ffffff;
  --xl-sheet: #ffffff;
  --xl-ink: #1a1a1a;
  --xl-head: #e4e2d6;
  --xl-grid: #c0c0c0;
  --xl-pos: #6b6bd8;
  --xl-neg: #993366;
  --on-xl-neg: #ffffff;
  --series-1: #1b5fc1;
  --series-2: #d0641a;
  --series-3: #7b2d8e;
  --medal-silver: #c9ced6;
  --medal-bronze: #d39a5c;
  --on-medal: #2a1d00;
  --shadow-window: 2px 3px 8px rgba(0,0,0,0.45);
  --shadow-bevel: inset 1px 1px 0 #ffffff, inset -1px -1px 0 #a7a493;
  --shadow-pressed: inset 1px 1px 2px rgba(0,0,0,0.4);
}
[data-theme="igloo"] {
  --desktop: #bfe4ff;
  --window: #ffffff;
  --window-ink: #0b2e59;
  --window-muted: #36597f;
  --titlebar: #0b5aa6;
  --titlebar-end: #1a74cc;
  --titlebar-ink: #ffffff;
  --frame: #0a4d8c;
  --button: #ffd23f;
  --button-ink: #3b2a00;
  --button-border: #a87800;
  --bevel-light: #fff6c9;
  --bevel-dark: #c99a00;
  --accent: #ff8a00;
  --on-accent: #2b1600;
  --highlight: #0b5aa6;
  --on-highlight: #ffffff;
  --sparkle: #ffd23f;
  --focus: #0b2e59;
  --shadow-window: 0 6px 0 #0a4d8c;
  --shadow-bevel: inset 0 -4px 0 #c99a00;
  --shadow-pressed: inset 0 3px 0 #c99a00;
}
[data-theme="fakebook"] {
  --desktop: #d8dfea;
  --window: #ffffff;
  --window-ink: #333333;
  --window-muted: #5f5f5f;
  --titlebar: #3b5998;
  --titlebar-end: #3b5998;
  --titlebar-ink: #ffffff;
  --frame: #29447e;
  --button: #eceff5;
  --button-ink: #333333;
  --button-border: #29447e;
  --bevel-light: #ffffff;
  --bevel-dark: #9aa9c8;
  --accent: #4f68a0;
  --on-accent: #ffffff;
  --highlight: #3b5998;
  --on-highlight: #ffffff;
  --sparkle: #f7d84a;
  --focus: #000000;
  --shadow-window: 0 2px 6px rgba(0,0,0,0.25);
  --shadow-bevel: inset 0 1px 0 #ffffff;
  --shadow-pressed: inset 0 1px 2px rgba(0,0,0,0.3);
}
[data-theme="monster"] {
  --desktop: #2a1446;
  --window: #3d1f66;
  --window-ink: #ffffff;
  --window-muted: #d9c8f5;
  --titlebar: #7ac142;
  --titlebar-end: #a6e05a;
  --titlebar-ink: #1d0b33;
  --frame: #160829;
  --button: #ffe14d;
  --button-ink: #1d0b33;
  --button-border: #160829;
  --bevel-light: #fff7b3;
  --bevel-dark: #b89a00;
  --accent: #ff7a00;
  --on-accent: #1d0b33;
  --highlight: #a6e05a;
  --on-highlight: #1d0b33;
  --sparkle: #ffe14d;
  --focus: #ffe14d;
  --shadow-window: 0 8px 0 #160829;
  --shadow-bevel: inset 0 -5px 0 #b89a00;
  --shadow-pressed: inset 0 4px 0 #b89a00;
}
[data-theme="dollz"] {
  --desktop: #ffc8e8;
  --window: #fff0f8;
  --window-ink: #5a0b3d;
  --window-muted: #8a2461;
  --titlebar: #c8157a;
  --titlebar-end: #d42a84;
  --titlebar-ink: #ffffff;
  --frame: #a3105f;
  --button: #ffffff;
  --button-ink: #5a0b3d;
  --button-border: #c8157a;
  --bevel-light: #ffffff;
  --bevel-dark: #f3a6d2;
  --accent: #b5126f;
  --on-accent: #ffffff;
  --highlight: #ff8fd0;
  --on-highlight: #5a0b3d;
  --sparkle: #fff35c;
  --focus: #5a0b3d;
  --shadow-window: 0 6px 0 #c8157a;
  --shadow-bevel: inset 0 -3px 0 #f3a6d2;
  --shadow-pressed: inset 0 3px 0 #f3a6d2;
}
[data-theme="bear"] {
  --desktop: #ffe7c2;
  --window: #fffaf0;
  --window-ink: #4a2a12;
  --window-muted: #7a4e2a;
  --titlebar: #6b3a1e;
  --titlebar-end: #8a5228;
  --titlebar-ink: #ffffff;
  --frame: #4a2a12;
  --button: #ffd166;
  --button-ink: #4a2a12;
  --button-border: #9a6a12;
  --bevel-light: #fff3d6;
  --bevel-dark: #c9a46a;
  --accent: #1f7a70;
  --on-accent: #ffffff;
  --highlight: #c23f72;
  --on-highlight: #ffffff;
  --sparkle: #ff9fc4;
  --focus: #4a2a12;
  --shadow-window: 0 5px 0 #4a2a12;
  --shadow-bevel: inset 0 -4px 0 #c9a46a;
  --shadow-pressed: inset 0 3px 0 #c9a46a;
}
[data-theme="insta"] {
  --desktop: #ece8df;
  --window: #ffffff;
  --window-ink: #262626;
  --window-muted: #646058;
  --titlebar: #2a5a83;
  --titlebar-end: #3f729b;
  --titlebar-ink: #ffffff;
  --frame: #5d6b78;
  --button: #f4f2ee;
  --button-ink: #262626;
  --button-border: #7d786d;
  --bevel-light: #ffffff;
  --bevel-dark: #d6d1c4;
  --accent: #2f6390;
  --on-accent: #ffffff;
  --highlight: #125688;
  --on-highlight: #ffffff;
  --sparkle: #f5c242;
  --focus: #125688;
  --shadow-window: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-bevel: inset 0 1px 0 #ffffff, inset 0 -2px 0 #d6d1c4;
  --shadow-pressed: inset 0 2px 3px rgba(0,0,0,0.2);
}
[data-theme="myspaze"] {
  --desktop: #000000;
  --window: #111111;
  --window-ink: #ececec;
  --window-muted: #b0b0b0;
  --titlebar: #003399;
  --titlebar-end: #2d5f99;
  --titlebar-ink: #ffffff;
  --frame: #336699;
  --button: #222222;
  --button-ink: #ececec;
  --button-border: #6b6b6b;
  --bevel-light: #4a4a4a;
  --bevel-dark: #000000;
  --accent: #ff2fd1;
  --on-accent: #000000;
  --highlight: #00ffcc;
  --on-highlight: #000000;
  --sparkle: #ffff00;
  --focus: #00ffcc;
  --shadow-window: none;
  --shadow-bevel: inset 1px 1px 0 #4a4a4a, inset -1px -1px 0 #000000;
  --shadow-pressed: inset 1px 1px 0 #000000, inset -1px -1px 0 #4a4a4a;
}
:root {
  --space-1: 2px;
  --space-2: 4px;
  --space-3: 8px;
  --space-4: 12px;
  --space-5: 16px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 48px;
  --radius-none: 0;
  --radius-button: 3px;
  --radius-window: 8px;
  --radius-bubbly: 18px;
  --radius-pill: 999px;
  --font-ui: Tahoma, Verdana, "Segoe UI", Geneva, sans-serif;
  --font-pixel: "Pixelify Sans", "Courier New", monospace;
  --font-bubbly: Fredoka, "Trebuchet MS", sans-serif;
  --font-chunky: Chewy, Fredoka, "Trebuchet MS", sans-serif;
  --font-comic: "Comic Neue", "Comic Sans MS", "Chalkboard SE", sans-serif;
  --font-script: Pacifico, "Brush Script MT", cursive;
  --font-lcd: VT323, "Lucida Console", "Courier New", monospace;
  --font-web1999: "Times New Roman", Times, serif;
}
.phone-question { font-family: var(--font-ui); font-size: 24px; line-height: 30px; font-weight: 700; }
.phone-answer { font-family: var(--font-ui); font-size: 18px; line-height: 24px; font-weight: 700; }
.phone-display { font-family: var(--font-pixel); font-size: 40px; line-height: 44px; font-weight: 700; }
.phone-timer { font-family: var(--font-pixel); font-size: 28px; line-height: 32px; font-weight: 700; }
.phone-title { font-family: var(--font-ui); font-size: 20px; line-height: 26px; font-weight: 700; }
.phone-button { font-family: var(--font-ui); font-size: 18px; line-height: 22px; font-weight: 700; }
.phone-body { font-family: var(--font-ui); font-size: 16px; line-height: 22px; font-weight: 400; }
.caption { font-family: var(--font-ui); font-size: 13px; line-height: 18px; font-weight: 400; }
.titlebar { font-family: var(--font-ui); font-size: 15px; line-height: 20px; font-weight: 700; }
.menu { font-family: var(--font-ui); font-size: 12px; line-height: 16px; font-weight: 400; }
.igloo-display { font-family: var(--font-bubbly); font-size: 30px; line-height: 34px; font-weight: 700; }
.monster-display { font-family: var(--font-chunky); font-size: 32px; line-height: 36px; font-weight: 400; }
.dollz-display { font-family: var(--font-script); font-size: 30px; line-height: 44px; font-weight: 400; }
.comic-body { font-family: var(--font-comic); font-size: 18px; line-height: 24px; font-weight: 700; }
.lcd-display { font-family: var(--font-lcd); font-size: 26px; line-height: 28px; font-weight: 400; }
.web1999 { font-family: var(--font-web1999); font-size: 22px; line-height: 28px; font-weight: 700; }
```

---

# Part 5 — bundle.css (all `bx-*` component styles)

```css
/* BDAY.EXE component styles. Reads only token custom properties (tokens.css) plus a few
   local helpers (--bx-*) that pick a token per skin. Prefix: bx-. */
@import url("https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;700&family=Fredoka:wght@400;600;700&family=Chewy&family=Comic+Neue:wght@400;700&family=Pacifico&family=VT323&display=swap");

*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-ui); color: var(--window-ink); }

/* ---------- per-skin helpers (choose a token, never a raw value) ---------- */
:root, [data-theme] { --bx-r-btn: var(--radius-button); --bx-r-win: var(--radius-window) var(--radius-window) 0 0; --bx-font-display: var(--font-pixel); --bx-font-chat: var(--font-comic); }
[data-theme="igloo"], [data-theme="monster"], [data-theme="dollz"], [data-theme="bear"] { --bx-r-btn: var(--radius-bubbly); --bx-r-win: var(--radius-bubbly); }
[data-theme="fakebook"] { --bx-r-win: var(--radius-none); --bx-font-display: var(--font-ui); }
[data-theme="igloo"], [data-theme="bear"] { --bx-font-display: var(--font-bubbly); }
[data-theme="insta"] { --bx-r-win: var(--radius-button); --bx-font-display: var(--font-script); }
[data-theme="monster"] { --bx-font-display: var(--font-chunky); }
[data-theme="dollz"] { --bx-font-display: var(--font-script); }
[data-theme="myspaze"] { --bx-r-btn: var(--radius-none); --bx-r-win: var(--radius-none); --bx-font-display: var(--font-comic); }
.skin-brick { --bx-r-btn: var(--radius-bubbly); --bx-font-display: var(--font-lcd); }
.skin-bsod { --bx-r-btn: var(--radius-none); --bx-r-win: var(--radius-none); --bx-font-display: var(--font-lcd); }

/* ---------- layout utilities for previews ---------- */
.bx-pad { padding: var(--space-6); }
.bx-row { display: flex; gap: var(--space-5); flex-wrap: wrap; align-items: flex-start; }
.bx-stack { display: grid; gap: var(--space-4); }
.bx-label { font: 13px/18px var(--font-ui); color: var(--window-muted); margin: 0 0 var(--space-2); }
.bx-desktop { background: var(--desktop); }
body > .bx-desktop { min-height: 100vh; }
.bx-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---------- Window ---------- */
.bx-window { background: var(--window); color: var(--window-ink); border: 3px solid var(--frame); border-radius: var(--bx-r-win); box-shadow: var(--shadow-window); overflow: hidden; display: flex; flex-direction: column; min-width: 0; }
.bx-titlebar { display: flex; align-items: center; gap: var(--space-2); min-height: 30px; padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3); background: linear-gradient(180deg, var(--titlebar-end) 0%, var(--titlebar) 40%, var(--titlebar) 75%, var(--titlebar-end) 100%); color: var(--titlebar-ink); font: 700 15px/20px var(--font-ui); }
.bx-titlebar svg { flex: none; }
.bx-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bx-ctl { flex: none; width: 24px; height: 24px; display: grid; place-items: center; border: 1px solid var(--titlebar-ink); border-radius: var(--radius-button); background: transparent; color: var(--titlebar-ink); font: 700 14px/1 var(--font-ui); cursor: pointer; padding: 0; }
.bx-ctl--close { background: var(--wrong); color: var(--on-wrong); border-color: var(--on-wrong); }
.bx-ctl:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.bx-menubar { display: flex; gap: var(--space-5); padding: var(--space-1) var(--space-3); font: 12px/16px var(--font-ui); color: var(--window-ink); border-bottom: 1px solid var(--bevel-dark); }
.bx-body { padding: var(--space-4); }
.bx-statusbar { display: flex; justify-content: space-between; gap: var(--space-4); padding: var(--space-1) var(--space-3); border-top: 1px solid var(--bevel-dark); font: 13px/18px var(--font-ui); color: var(--window-muted); }

/* ---------- Button ---------- */
.bx-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: 36px; padding: var(--space-3) var(--space-5); font: 700 15px/20px var(--font-ui); color: var(--button-ink); background: var(--button); border: 1px solid var(--button-border); border-radius: var(--bx-r-btn); box-shadow: var(--shadow-bevel); cursor: pointer; text-decoration: none; }
.bx-btn:hover { filter: brightness(1.05); }
.bx-btn:active, .bx-btn[aria-pressed="true"] { box-shadow: var(--shadow-pressed); transform: translateY(1px); }
.bx-btn:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.bx-btn:disabled { opacity: .5; cursor: not-allowed; filter: none; transform: none; }
.bx-btn--primary { background: var(--accent); color: var(--on-accent); border-color: var(--frame); }
.bx-btn--danger { background: var(--wrong); color: var(--on-wrong); border-color: var(--frame); }
.bx-btn--lg { min-height: 56px; font-size: 20px; line-height: 24px; padding: var(--space-4) var(--space-6); }
.bx-btn--block { display: flex; width: 100%; }
.bx-btn--start { border-radius: 0 var(--radius-bubbly) var(--radius-bubbly) 0; background: var(--accent); color: var(--on-accent); font: italic 700 22px/1 var(--font-ui); padding: 0 var(--space-6) 0 var(--space-4); min-height: 100%; border: 0; text-transform: lowercase; }

/* ---------- Dialog (troll pop-ups) ---------- */
.bx-dialog { width: 380px; max-width: 100%; }
.bx-dialog__body { display: flex; gap: var(--space-4); align-items: flex-start; padding: var(--space-5) var(--space-5) var(--space-3); font: 15px/21px var(--font-ui); }
.bx-dialog__body p { margin: 0 0 var(--space-2); }
.bx-dialog__actions { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-3) var(--space-5) var(--space-5); }

/* ---------- Taskbar (phone footer HUD) ---------- */
.bx-taskbar { display: flex; align-items: stretch; gap: var(--space-3); height: 48px; background: linear-gradient(180deg, var(--titlebar-end), var(--titlebar) 30%, var(--titlebar)); color: var(--titlebar-ink); border-top: 2px solid var(--frame); font: 15px/20px var(--font-ui); }
.bx-task { align-self: center; display: flex; align-items: center; gap: var(--space-2); max-width: 240px; padding: var(--space-2) var(--space-4); border: 1px solid var(--titlebar-ink); border-radius: var(--radius-button); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bx-task.is-current { background: var(--highlight); color: var(--on-highlight); border-color: var(--on-highlight); }
.bx-tray { margin-left: auto; display: flex; align-items: center; gap: var(--space-4); padding: 0 var(--space-5); background: var(--highlight); color: var(--on-highlight); border-left: 2px solid var(--frame); }
.bx-clock { font: 700 24px/1 var(--font-pixel); min-width: 3ch; text-align: right; }

/* ---------- Countdown ---------- */
.bx-timer { display: grid; gap: var(--space-2); }
.bx-timer__row { display: flex; align-items: center; gap: var(--space-4); }
.bx-timer__secs { font: 700 48px/1 var(--font-pixel); min-width: 2.2ch; padding: var(--space-1) var(--space-2); border-radius: var(--bx-r-btn); text-align: center; }
.bx-timer.is-urgent .bx-timer__secs { background: var(--wrong); color: var(--on-wrong); }
.bx-timer.is-done .bx-timer__secs { background: var(--window-ink); color: var(--window); }
.bx-progress { flex: 1; height: 24px; padding: 3px; background: var(--window); border: 1px solid var(--button-border); border-radius: var(--bx-r-btn); box-shadow: var(--shadow-pressed); overflow: hidden; }
.bx-progress__fill { height: 100%; width: 100%; background: repeating-linear-gradient(90deg, var(--highlight) 0 12px, transparent 12px 15px); border-radius: inherit; }
.bx-timer__label { font: 13px/18px var(--font-ui); color: var(--window-muted); }

/* ---------- Wager chips ---------- */
.bx-chips { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-3); }
.bx-chip { position: relative; min-height: 52px; padding: 0 var(--space-2); font: 700 20px/1 var(--font-pixel); color: var(--button-ink); background: var(--button); border: 2px solid var(--button-border); border-radius: var(--radius-pill); box-shadow: var(--shadow-bevel); cursor: pointer; }
.bx-chip[aria-pressed="true"] { background: var(--highlight); color: var(--on-highlight); border-color: var(--frame); box-shadow: var(--shadow-pressed); }
.bx-chip:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.bx-chip:disabled { opacity: .45; cursor: not-allowed; text-decoration: line-through; box-shadow: none; }
.bx-chip--double::after { content: "×2"; position: absolute; top: -10px; right: -6px; padding: 2px 6px; font: 700 12px/1 var(--font-ui); background: var(--favourite); color: var(--on-favourite); border-radius: var(--radius-pill); border: 1px solid var(--frame); }
.bx-wager-total { display: flex; align-items: baseline; justify-content: space-between; font: 15px/20px var(--font-ui); }
.bx-wager-total b { font: 700 32px/36px var(--font-pixel); }

/* ---------- Answer tiles ---------- */
.bx-answers { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-5); }
.bx-answers--stack { grid-template-columns: 1fr; gap: var(--space-3); }
.bx-answer { position: relative; display: flex; align-items: center; gap: var(--space-4); min-height: 64px; padding: var(--space-3) var(--space-4); color: var(--on-answer); border: 3px solid var(--frame); border-radius: var(--bx-r-btn); box-shadow: var(--shadow-bevel); font: 700 20px/26px var(--font-ui); text-align: left; cursor: pointer; width: 100%; }
.bx-answer[data-k="a"] { background: var(--answer-a); }
.bx-answer[data-k="b"] { background: var(--answer-b); }
.bx-answer[data-k="c"] { background: var(--answer-c); }
.bx-answer[data-k="d"] { background: var(--answer-d); }
.bx-answer__key { flex: none; display: grid; place-items: center; width: 44px; height: 44px; border: 2px solid currentColor; border-radius: var(--bx-r-btn); font: 700 14px/1 var(--font-ui); }
.bx-answer__key svg { width: 22px; height: 22px; fill: currentColor; }
.bx-answer__text { flex: 1; min-width: 0; }
.bx-answer__count { flex: none; min-width: 2.4ch; padding: var(--space-1) var(--space-3); border: 2px solid currentColor; border-radius: var(--radius-pill); font: 700 18px/1 var(--font-pixel); text-align: center; }
.bx-answer__badge { position: absolute; top: -14px; right: -10px; padding: var(--space-1) var(--space-3); font: 700 13px/18px var(--font-ui); border: 2px solid var(--frame); border-radius: var(--radius-pill); background: var(--window); color: var(--window-ink); }
.bx-answer:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
.bx-answer.is-selected { box-shadow: inset 0 0 0 5px var(--on-answer), var(--shadow-pressed); }
.bx-answer.is-dim { opacity: .35; }
.bx-answer.is-correct { background: var(--correct); color: var(--on-correct); }
.bx-answer.is-wrong { background: var(--wrong); color: var(--on-wrong); }
.bx-answer.is-fave { background: var(--favourite); color: var(--on-favourite); }

/* ---------- Address bar (typed answers) ---------- */
.bx-address { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--bevel-dark); font: 13px/18px var(--font-ui); }
.bx-address__label { color: var(--window-muted); }
.bx-address__field { position: relative; flex: 1; display: flex; align-items: center; gap: var(--space-2); min-height: 36px; padding: 0 var(--space-2); background: var(--bevel-light); color: var(--button-ink); border: 1px solid var(--button-border); box-shadow: var(--shadow-pressed); }
.bx-address__field:focus-within { outline: 3px solid var(--focus); outline-offset: 2px; }
.bx-address__field input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: inherit; font: 16px/22px var(--font-ui); }
.bx-suggest { position: absolute; left: -1px; right: -1px; top: 100%; margin: 0; padding: 0; list-style: none; background: var(--bevel-light); color: var(--button-ink); border: 1px solid var(--button-border); box-shadow: var(--shadow-window); z-index: 2; font: 15px/20px var(--font-ui); }
.bx-suggest li { padding: var(--space-2) var(--space-3); }
.bx-suggest li[aria-selected="true"] { background: var(--highlight); color: var(--on-highlight); }

/* ---------- Host's Fave cards (opinion questions) ---------- */
.bx-faves { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
.bx-fave { position: relative; display: grid; gap: var(--space-2); padding: var(--space-4); background: var(--window); color: var(--window-ink); border: 2px solid var(--button-border); border-radius: var(--bx-r-btn); box-shadow: var(--shadow-bevel); font: 700 18px/24px var(--bx-font-chat); text-align: left; cursor: pointer; }
.bx-fave small { font: 13px/18px var(--font-ui); color: var(--window-muted); }
.bx-fave:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.bx-fave.is-crowned { background: var(--favourite); color: var(--on-favourite); border-color: var(--frame); }
.bx-fave.is-crowned small { color: var(--on-favourite); }
.bx-fave.is-lol { box-shadow: inset 0 0 0 3px var(--highlight); }
.bx-fave__star { position: absolute; top: -12px; right: -8px; padding: var(--space-1) var(--space-3); font: 700 13px/18px var(--font-ui); background: var(--favourite); color: var(--on-favourite); border: 2px solid var(--frame); border-radius: var(--radius-pill); }

/* ---------- Leaderboard (details view) ---------- */
.bx-table { width: 100%; border-collapse: collapse; font: 15px/20px var(--font-ui); color: var(--window-ink); }
.bx-table th { text-align: left; font-weight: 400; padding: var(--space-1) var(--space-3); background: var(--button); color: var(--button-ink); border: 1px solid var(--bevel-dark); }
.bx-table td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--bevel-dark); vertical-align: middle; }
.bx-table td.num, .bx-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
.bx-table tr.is-me td { background: var(--highlight); color: var(--on-highlight); }
.bx-table tr.is-first td { font-weight: 700; }
.bx-name { display: flex; align-items: center; gap: var(--space-3); }
.bx-delta { font: 700 15px/20px var(--font-ui); white-space: nowrap; }

/* ---------- Avatar + buddy list ---------- */
.bx-avatar { flex: none; display: inline-grid; place-items: center; width: 40px; height: 40px; background: var(--window); border: 2px solid var(--frame); border-radius: var(--bx-r-btn); overflow: hidden; }
.bx-avatar svg { width: 100%; height: 100%; display: block; }
.bx-avatar--lg { width: 72px; height: 72px; }
.bx-avatar--sm { width: 28px; height: 28px; border-width: 1px; }
.bx-buddies { margin: 0; padding: 0; list-style: none; display: grid; }
.bx-buddy { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--bevel-dark); }
.bx-buddy__name { font: 700 15px/20px var(--font-ui); }
.bx-buddy__status { font: 13px/18px var(--font-ui); color: var(--window-muted); }
.bx-buddy.is-locked .bx-buddy__status::before { content: "✓ "; }
.bx-buddy.is-away { opacity: .6; }
.bx-group-head { padding: var(--space-2) var(--space-3); font: 700 13px/18px var(--font-ui); color: var(--window-muted); }

/* ---------- QR join card ---------- */
.bx-qr { display: grid; justify-items: center; gap: var(--space-3); }
.bx-qr__code { padding: var(--space-3); background: var(--qr-paper); border: 3px solid var(--frame); border-radius: var(--bx-r-btn); line-height: 0; }
.bx-qr__code svg { display: block; }
.bx-qr__url { font: 700 18px/24px var(--font-ui); }
.bx-pin { display: flex; gap: var(--space-2); }
.bx-pin span { display: grid; place-items: center; width: 44px; height: 56px; font: 700 32px/1 var(--font-pixel); background: var(--button); color: var(--button-ink); border: 2px solid var(--button-border); border-radius: var(--bx-r-btn); box-shadow: var(--shadow-pressed); }

/* ---------- Reactions ---------- */
.bx-reactions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.bx-react { min-width: 52px; min-height: 48px; padding: 0 var(--space-3); font: 700 22px/1 var(--font-ui); background: var(--button); color: var(--button-ink); border: 2px solid var(--button-border); border-radius: var(--radius-pill); box-shadow: var(--shadow-bevel); cursor: pointer; }
.bx-react--text { font: 700 18px/1 var(--font-comic); }
.bx-react:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.bx-react:active { box-shadow: var(--shadow-pressed); transform: translateY(1px); }
.bx-react-stage { position: relative; overflow: hidden; }
.bx-float { position: absolute; bottom: 0; display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-3) var(--space-1) var(--space-1); background: var(--window); color: var(--window-ink); border: 2px solid var(--frame); border-radius: var(--radius-pill); font: 700 15px/20px var(--font-ui); white-space: nowrap; animation: bx-float-up 2.4s ease-out forwards; pointer-events: none; }
.bx-float .e { font-size: 24px; line-height: 1; }

/* ---------- Chat bubbles (Mezzenger / Fakebook / MySpaze) ---------- */
.bx-chat { display: grid; gap: var(--space-3); font: 700 20px/28px var(--bx-font-chat); }
.bx-chat__who { font: 700 14px/18px var(--font-ui); color: var(--window-muted); }
.bx-chat__msg { margin: 0; }
.bx-typing { font: italic 13px/18px var(--font-ui); color: var(--window-muted); }

/* ---------- Badges / pills ---------- */
.bx-pill { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-3); font: 700 13px/18px var(--font-ui); background: var(--button); color: var(--button-ink); border: 1px solid var(--button-border); border-radius: var(--radius-pill); }
.bx-pill--accent { background: var(--accent); color: var(--on-accent); border-color: var(--frame); }
.bx-pill--fave { background: var(--favourite); color: var(--on-favourite); border-color: var(--frame); }
.bx-pill--correct { background: var(--correct); color: var(--on-correct); border-color: var(--frame); }
.bx-pill--wrong { background: var(--wrong); color: var(--on-wrong); border-color: var(--frame); }

/* ---------- Screens (mobile-first) ---------- */
.bx-phones { display: flex; gap: var(--space-7); padding: var(--space-6); align-items: flex-start; }
.bx-phone { position: relative; width: 390px; height: 780px; display: flex; flex-direction: column; background: var(--desktop); color: var(--window-ink); border: 10px solid var(--qr-ink); border-radius: 44px; overflow: hidden; }
.bx-phone__status { display: flex; justify-content: space-between; padding: var(--space-3) var(--space-6) var(--space-2); font: 700 13px/18px var(--font-ui); background: var(--window); color: var(--window-ink); }
.bx-phone__main { flex: 1; display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4); min-height: 0; }
.bx-caption { font: 13px/18px var(--font-ui); color: var(--window-muted); margin: var(--space-2) 0 0; text-align: center; }
.bx-phones .bx-caption { color: var(--window-ink); }

/* phone question skeleton shared by every skin */
.bx-pq { flex: 1; display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); min-height: 0; }
.bx-pq__meta { display: flex; align-items: center; gap: var(--space-2); }
.bx-pq__meta .bx-timer__secs { margin-left: auto; font: 700 28px/32px var(--bx-font-display); padding: var(--space-1) var(--space-3); background: var(--window); color: var(--window-ink); border: 2px solid var(--frame); }
.bx-pq__meta.is-urgent .bx-timer__secs { background: var(--wrong); color: var(--on-wrong); }
.bx-pq__card { background: var(--window); color: var(--window-ink); border: 3px solid var(--frame); border-radius: var(--bx-r-win); box-shadow: var(--shadow-window); padding: var(--space-4); }
.bx-pq__text { margin: 0; font: 700 24px/30px var(--font-ui); }
.bx-pq__answers { flex: 1; display: grid; grid-auto-rows: 1fr; gap: var(--space-3); min-height: 0; }
.bx-pq__answers .bx-answer { min-height: 64px; }
.bx-pq__foot { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); }
.bx-pq__foot .bx-react { min-width: 44px; min-height: 44px; font-size: 20px; }
.bx-chrome { display: flex; align-items: center; gap: var(--space-2); min-height: 44px; padding: var(--space-2) var(--space-4); background: linear-gradient(180deg, var(--titlebar-end) 0%, var(--titlebar) 45%, var(--titlebar) 75%, var(--titlebar-end) 100%); color: var(--titlebar-ink); font: 700 16px/20px var(--font-ui); }
.bx-chrome .bx-title { flex: 1; }

/* ---------- Motion (honours reduced motion) ---------- */
@keyframes bx-nudge { 0%,100% { transform: translate(0,0); } 10% { transform: translate(-10px,4px); } 20% { transform: translate(9px,-5px); } 30% { transform: translate(-8px,-3px); } 40% { transform: translate(7px,5px); } 50% { transform: translate(-6px,2px); } 60% { transform: translate(5px,-4px); } 70% { transform: translate(-3px,3px); } 85% { transform: translate(2px,-1px); } }
@keyframes bx-pop-in { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
@keyframes bx-float-up { 0% { transform: translateY(0) scale(.8); opacity: 0; } 12% { opacity: 1; transform: translateY(-20px) scale(1); } 100% { transform: translateY(-260px) scale(1); opacity: 0; } }
@keyframes bx-wobble { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-1.5deg); } 75% { transform: rotate(1.5deg); } }
@keyframes bx-marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }
@keyframes bx-twinkle { 0%,100% { opacity: .25; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.1); } }
@keyframes bx-blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
@keyframes bx-stripes { from { background-position: 0 0; } to { background-position: 30px 0; } }
@keyframes bx-spin { to { transform: rotate(360deg); } }
@keyframes bx-fall { from { transform: translateY(-40px) rotate(0); } to { transform: translateY(800px) rotate(540deg); } }
@keyframes bx-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
.bx-anim-nudge { animation: bx-nudge .6s linear; }
.bx-anim-nudge-loop { animation: bx-nudge .6s linear 0s infinite; animation-delay: 1.4s; }
.bx-anim-pop { animation: bx-pop-in .22s cubic-bezier(.3,1.6,.6,1) both; }
.bx-anim-wobble { animation: bx-wobble 1.2s ease-in-out infinite; }
.bx-anim-twinkle { animation: bx-twinkle 1.6s ease-in-out infinite; }
.bx-anim-blink { animation: bx-blink 1s steps(1) infinite; }
.bx-anim-stripes { animation: bx-stripes .8s linear infinite; background-size: 30px 100%; }
.bx-anim-spin { animation: bx-spin 1.6s steps(8) infinite; }
.bx-anim-bounce { animation: bx-bounce 1.4s ease-in-out infinite; }
.bx-marquee { overflow: hidden; white-space: nowrap; }
.bx-marquee > span { display: inline-block; padding-left: 100%; animation: bx-marquee 12s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .bx-anim-nudge, .bx-anim-nudge-loop, .bx-anim-pop, .bx-anim-wobble, .bx-anim-twinkle, .bx-anim-stripes, .bx-anim-spin, .bx-anim-bounce, .bx-marquee > span, .bx-float { animation: none !important; }
  .bx-anim-blink { animation: none; }
}
.bx-calm .bx-anim-nudge, .bx-calm .bx-anim-nudge-loop, .bx-calm .bx-anim-wobble, .bx-calm .bx-anim-twinkle, .bx-calm .bx-marquee > span { animation: none !important; }

/* ================= Skins: scenery around the phone skeleton ================= */

/* FlopXP: rolling hill + sky built from tokens */
.skin-xp { background: radial-gradient(160% 40% at 30% 112%, var(--accent) 0 46%, transparent 46.2%), linear-gradient(180deg, var(--titlebar) 0%, var(--desktop) 60%, var(--titlebar-end) 100%); }
.bx-desk-icon { display: grid; justify-items: center; gap: var(--space-1); font: 12px/15px var(--font-ui); color: var(--titlebar-ink); text-align: center; }
.bx-desk-icon span { padding: 1px 3px; background: var(--titlebar); }

/* Internet Exploder: the page is a 1999 default stylesheet */
.bx-web { background: var(--bevel-light); color: var(--button-ink); font-family: var(--font-web1999); padding: var(--space-4); }
.bx-web h1 { font: 700 24px/30px var(--font-web1999); margin: 0 0 var(--space-3); }
.bx-web a { color: var(--highlight); text-decoration: underline; }
.bx-web hr { border: 0; border-top: 2px groove var(--bevel-dark); margin: var(--space-4) 0; }
.bx-toolbar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--bevel-dark); }
.bx-toolbar .bx-btn { min-height: 30px; padding: var(--space-1) var(--space-2); font-size: 12px; }

/* Igloo Island: snow field */
.skin-igloo { background: radial-gradient(circle at 20% 30%, var(--window) 0 2px, transparent 3px) 0 0 / 46px 46px, radial-gradient(circle at 70% 70%, var(--window) 0 3px, transparent 4px) 0 0 / 70px 70px, linear-gradient(180deg, var(--desktop) 0 78%, var(--window) 78%); }
.skin-igloo .bx-pq__card, .skin-igloo .bx-answer { border-width: 4px; }
.skin-igloo .bx-pq__text, .skin-igloo .bx-answer { font-family: var(--font-bubbly); }
.bx-coins { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-3); font: 700 16px/20px var(--bx-font-display); background: var(--button); color: var(--button-ink); border: 2px solid var(--button-border); border-radius: var(--radius-pill); box-shadow: var(--shadow-bevel); }

/* Fakebook chat 2008 */
.skin-fakebook { background: var(--desktop); }
.bx-fb-bar { display: flex; align-items: center; gap: var(--space-4); min-height: 48px; padding: 0 var(--space-4); background: var(--titlebar); color: var(--titlebar-ink); font: 700 14px/18px var(--font-ui); }
.bx-fb-logo { font: 700 24px/1 var(--font-ui); letter-spacing: -1px; text-transform: lowercase; }
.bx-bubble { position: relative; padding: var(--space-3) var(--space-4); background: var(--window); color: var(--window-ink); border: 1px solid var(--button-border); font: 700 18px/24px var(--bx-font-chat); }
.bx-fb-dock { display: flex; gap: 0; }
.bx-fb-dock > * { flex: 1; background: var(--button); color: var(--button-ink); border: 1px solid var(--button-border); padding: var(--space-2) var(--space-3); font: 700 13px/18px var(--font-ui); text-align: center; }
.bx-fb-dock .is-alert { background: var(--titlebar); color: var(--titlebar-ink); }

/* MySpaze: glitter tile + profile tables */
.skin-myspaze { background: radial-gradient(circle at 30% 40%, var(--sparkle) 0 1px, transparent 2px) 0 0 / 23px 23px, radial-gradient(circle at 70% 20%, var(--accent) 0 1px, transparent 2px) 0 0 / 37px 37px, var(--desktop); }
.skin-myspaze a { color: var(--highlight); }
.bx-ms-box { background: var(--window); border: 1px solid var(--frame); }
.bx-ms-box > h3 { margin: 0; padding: var(--space-1) var(--space-3); font: 700 14px/20px var(--font-ui); background: var(--titlebar); color: var(--titlebar-ink); }
.bx-top8 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); padding: var(--space-3); }
.bx-top8 button { display: grid; justify-items: center; gap: var(--space-1); padding: var(--space-1); background: transparent; border: 2px solid transparent; font: 700 13px/16px var(--font-comic); color: var(--highlight); cursor: pointer; }
.bx-top8 button[aria-pressed="true"] { border-color: var(--accent); background: var(--button); }
.bx-top8 button:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }

/* Brick Phone: fixed LCD palette in every theme */
.skin-brick { background: var(--brick-body); color: var(--lcd-ink); }
.skin-brick .bx-lcd { background: var(--lcd); color: var(--lcd-ink); border: 8px solid var(--lcd-ink); border-radius: var(--radius-bubbly); box-shadow: inset 0 0 0 2px var(--lcd-muted); }
.skin-brick .bx-lcd small { color: var(--lcd-muted); }
.skin-brick .bx-key { background: var(--key); color: var(--key-ink); border-color: var(--lcd-ink); box-shadow: none; }
.skin-brick .bx-key--go { background: var(--accent); color: var(--on-accent); }
.bx-softkeys { display: flex; justify-content: space-between; font: 400 22px/24px var(--font-lcd); }

/* Monster Mash: goo drips */
.skin-monster { background: radial-gradient(circle at 10% 20%, var(--window) 0 50px, transparent 51px), radial-gradient(circle at 90% 85%, var(--window) 0 80px, transparent 81px), var(--desktop); }
.bx-goo .bx-titlebar, .bx-goo.bx-chrome { position: relative; }
.bx-goo .bx-titlebar::after, .bx-goo.bx-chrome::after { content: ""; position: absolute; left: 0; right: 0; top: 100%; height: 14px; background: radial-gradient(circle at 8px 0, var(--titlebar-end) 0 7px, transparent 8px) 0 0 / 36px 14px, radial-gradient(circle at 24px 0, var(--titlebar-end) 0 5px, transparent 6px) 0 0 / 36px 14px; z-index: 1; }
.skin-monster .bx-pq__text, .skin-monster .bx-answer { font-family: var(--font-chunky); font-weight: 400; letter-spacing: .5px; }

/* Dollz Dreamhouse: hearts + sparkles */
.skin-dollz { background: radial-gradient(circle at 25% 25%, var(--window) 0 5px, transparent 6px) 0 0 / 36px 36px, radial-gradient(circle at 75% 75%, var(--titlebar-end) 0 3px, transparent 4px) 0 0 / 36px 36px, var(--desktop); }
.skin-dollz .bx-pq__card, .skin-dollz .bx-window { border-style: dashed; }
.bx-sparkle { position: absolute; width: 24px; height: 24px; fill: var(--sparkle); }

/* Build-a-Blunder Workshop: stitched felt */
.skin-bear { background: repeating-linear-gradient(45deg, var(--desktop) 0 14px, var(--bevel-light) 14px 28px); }
.skin-bear .bx-pq__card, .skin-bear .bx-window { border-style: dashed; outline: 3px solid var(--window); outline-offset: -8px; }
.skin-bear .bx-pq__text, .skin-bear .bx-answer { font-family: var(--font-bubbly); }
.bx-steps { display: flex; gap: var(--space-1); }
.bx-steps span { flex: 1; padding: var(--space-1) 0; text-align: center; font: 700 11px/14px var(--font-ui); background: var(--button); color: var(--button-ink); border: 1px solid var(--button-border); border-radius: var(--radius-pill); }
.bx-steps span.is-on { background: var(--highlight); color: var(--on-highlight); border-color: var(--frame); }

/* Instagran 2011: early photo-app chrome; answers are comments */
.skin-insta { background: var(--desktop); }
.bx-ig-bar { display: flex; align-items: center; justify-content: space-between; min-height: 50px; padding: 0 var(--space-4); background: linear-gradient(180deg, var(--titlebar-end), var(--titlebar)); color: var(--titlebar-ink); border-bottom: 1px solid var(--frame); }
.bx-ig-logo { font: 400 26px/1 var(--font-script); }
.bx-ig-post { background: var(--window); color: var(--window-ink); border: 1px solid var(--bevel-dark); box-shadow: var(--shadow-window); }
.bx-ig-head { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); font: 700 14px/18px var(--font-ui); }
.bx-ig-head small { margin-left: auto; font: 12px/16px var(--font-ui); color: var(--window-muted); }
.bx-ig-photo { position: relative; aspect-ratio: 1 / 1; display: grid; place-items: center; background: radial-gradient(circle at 50% 45%, var(--sparkle) 0 18%, var(--button) 60%, var(--window-muted) 100%); border-top: 1px solid var(--bevel-dark); border-bottom: 1px solid var(--bevel-dark); overflow: hidden; }
.bx-ig-photo::after { content: ""; position: absolute; inset: 0; box-shadow: inset 0 0 60px 18px var(--window-ink); opacity: .55; pointer-events: none; }
.bx-ig-filter { position: absolute; left: var(--space-2); bottom: var(--space-2); z-index: 1; padding: 2px var(--space-2); font: 700 11px/14px var(--font-ui); background: var(--window); color: var(--window-ink); border-radius: var(--radius-button); }
.bx-ig-actions { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); font: 700 13px/18px var(--font-ui); }
.bx-ig-comments { display: grid; gap: var(--space-1); padding: 0 var(--space-3) var(--space-2); margin: 0; list-style: none; font: 14px/19px var(--font-ui); }
.bx-ig-comments b { color: var(--highlight); }
.bx-ig-comments .is-hidden { color: var(--window-muted); font-style: italic; }
.bx-ig-compose { display: flex; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-top: 1px solid var(--bevel-dark); background: var(--button); }
.bx-ig-compose input { flex: 1; min-width: 0; min-height: 40px; padding: 0 var(--space-3); font: 16px/22px var(--font-ui); color: var(--button-ink); background: var(--window); border: 1px solid var(--button-border); border-radius: var(--radius-button); }
.bx-ig-compose input:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }

/* Keypad (numeric answers) and LCD readout */
.bx-lcd { background: var(--window); color: var(--window-ink); font-family: var(--font-lcd); border: 4px solid var(--frame); border-radius: var(--bx-r-btn); padding: var(--space-3) var(--space-4); box-shadow: var(--shadow-pressed); }
.bx-keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
.bx-key { display: grid; justify-items: center; align-content: center; min-height: 52px; background: var(--button); color: var(--button-ink); border: 2px solid var(--button-border); border-radius: var(--bx-r-btn); box-shadow: var(--shadow-bevel); font: 700 22px/1 var(--font-ui); }
.bx-key small { font: 400 11px/14px var(--font-ui); letter-spacing: 1px; }

/* Blue Screen of Birthday */
.skin-bsod { background: var(--bsod); color: var(--bsod-ink); font-family: var(--font-lcd); }
.skin-bsod .bx-bsod-tag { display: inline-block; padding: 0 var(--space-3); background: var(--bsod-ink); color: var(--bsod); }
.skin-bsod p { margin: 0; font: 400 22px/24px var(--font-lcd); }
.skin-bsod .bx-answer { font-family: var(--font-lcd); font-weight: 400; font-size: 22px; border-color: var(--bsod-ink); box-shadow: none; }
.skin-bsod .bx-pq__meta .bx-timer__secs { font-family: var(--font-lcd); font-weight: 400; background: var(--bsod); color: var(--bsod-ink); border-color: var(--bsod-ink); }

/* confetti for the podium */
.bx-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.bx-confetti ~ * { position: relative; z-index: 1; }
.bx-confetti i { position: absolute; top: 0; width: 10px; height: 16px; animation: bx-fall 4s linear infinite; }
.bx-podium { display: flex; align-items: flex-end; justify-content: center; gap: var(--space-3); }
.bx-podium__step { display: grid; justify-items: center; gap: var(--space-3); }
.bx-podium__block { display: grid; place-items: center; width: 96px; font: 700 36px/1 var(--font-pixel); border: 3px solid var(--frame); border-bottom: 0; box-shadow: var(--shadow-bevel); }

/* ================= Chaos events (random troll pop-ups) =================
   Layering contract: .bx-chaos-zone wraps the question card. Overlays sit inside it,
   so they may cover the question card for a few seconds but never the answers or the timer.
   Rain (.bx-rain) spans the phone but ignores taps. */
.bx-chaos-zone { position: relative; }
.bx-chaos { position: absolute; inset: -6px -4px auto; z-index: 5; }
.bx-chaos__x { position: absolute; top: 6px; right: 6px; width: 32px; height: 32px; display: grid; place-items: center; font: 700 18px/1 var(--font-ui); border-radius: var(--radius-pill); border: 2px solid currentColor; background: transparent; color: inherit; cursor: pointer; }
.bx-chaos__x:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.bx-chaos__x--tiny { width: 18px; height: 18px; font-size: 11px; border-width: 1px; opacity: .7; }
.bx-chaos__timer { font: 700 12px/16px var(--font-ui); }
@keyframes bx-drop-in { 0% { transform: translateY(-110%) rotate(-2deg); } 70% { transform: translateY(6%) rotate(1deg); } 100% { transform: translateY(0) rotate(0); } }
@keyframes bx-stamp { 0% { transform: scale(2.2) rotate(-18deg); opacity: 0; } 60% { transform: scale(.92) rotate(-8deg); opacity: 1; } 100% { transform: scale(1) rotate(-8deg); } }
@keyframes bx-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
.bx-anim-drop { animation: bx-drop-in .45s cubic-bezier(.3,1.4,.6,1) both; }
.bx-anim-stamp { animation: bx-stamp .35s cubic-bezier(.3,1.4,.6,1) both; }
.bx-anim-pulse { animation: bx-pulse 1s ease-in-out infinite; }

/* Scam pop-ups reuse .bx-window/.bx-dialog; the CLAIM button pulses */
.bx-scam__prize { display: grid; place-items: center; width: 64px; height: 64px; flex: none; font: 700 30px/1 var(--font-pixel); background: var(--favourite); color: var(--on-favourite); border: 3px solid var(--frame); border-radius: var(--radius-bubbly); }
.bx-scam__fine { font: 10px/13px var(--font-ui); color: var(--window-muted); margin: 0; }

/* TOTE-LLY LUCKY lottery slip (layout of a 6/49 betting slip; parody wordmark, no real logo) */
.bx-toto { position: relative; display: flex; gap: var(--space-2); padding: var(--space-3); background: var(--slip-paper); color: var(--slip-red); border: 1px solid var(--bevel-dark); box-shadow: var(--shadow-window); font-family: var(--font-ui); }
.bx-toto__left { display: flex; flex-direction: column; justify-content: space-between; gap: var(--space-2); padding-top: 22px; }
.bx-toto__opts { display: grid; gap: 3px; padding: 3px; border: 1px dashed var(--slip-red); }
.bx-toto__opt { display: flex; align-items: center; justify-content: space-between; gap: 4px; min-width: 64px; padding: 3px 4px 3px 6px; background: var(--slip-red); color: var(--on-slip-red); font: 700 11px/14px var(--font-ui); }
.bx-toto__opt::after { content: ""; width: 9px; height: 13px; background: var(--slip-paper); }
.bx-toto__opt.is-marked::after { box-shadow: inset 3px 0 0 var(--tissue-ink), inset -3px 0 0 var(--tissue-ink); }
.bx-toto__boards { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 2px solid var(--slip-red); }
.bx-toto__note { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); font: italic 700 11px/14px var(--font-ui); white-space: nowrap; }
.bx-toto__board { display: grid; grid-template-columns: 1fr auto; border: 1px solid var(--slip-red); }
.bx-toto__nums { display: grid; grid-template-columns: repeat(9, 1fr); gap: 2px; padding: var(--space-1); }
.bx-toto__nums span { position: relative; display: grid; place-items: center; min-width: 18px; height: 18px; font: 700 10px/1 var(--font-ui); border: 1px solid var(--slip-red); background: var(--slip-paper); }
.bx-toto__nums span.is-marked::after { content: ""; position: absolute; left: 50%; top: -2px; bottom: -2px; width: 3px; margin-left: -1.5px; background: var(--tissue-ink); border-radius: 2px; transform: rotate(6deg); opacity: .85; }
.bx-toto__void { grid-column: span 5; display: flex; align-items: center; justify-content: flex-end; gap: var(--space-2); padding: 0 var(--space-2); background: var(--slip-red); color: var(--on-slip-red); font: 700 13px/1 var(--font-ui); }
.bx-toto__void b { display: grid; place-items: center; width: 16px; height: 16px; background: var(--slip-paper); color: var(--slip-red); font-size: 11px; }
.bx-toto__money { display: grid; grid-template-columns: auto auto; gap: 2px; align-content: start; padding: var(--space-1); background: var(--slip-red); }
.bx-toto__money span { display: flex; align-items: center; justify-content: space-between; gap: 4px; min-width: 44px; padding: 1px 3px; color: var(--on-slip-red); font: 700 10px/16px var(--font-ui); border: 1px solid var(--on-slip-red); }
.bx-toto__money span::after { content: ""; width: 9px; height: 12px; background: var(--slip-paper); }
.bx-toto__money span.is-marked::after { box-shadow: inset 3px 0 0 var(--tissue-ink), inset -3px 0 0 var(--tissue-ink); }
.bx-toto__money .others { grid-column: span 2; justify-content: center; }
.bx-toto__side { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.bx-toto__trees { writing-mode: vertical-rl; font: italic 700 10px/12px var(--font-ui); }
.bx-toto__brand { flex: 1; display: flex; align-items: center; justify-content: center; width: 70px; background: var(--slip-gold); color: var(--on-slip-gold); }
.bx-toto__brand span { writing-mode: vertical-rl; font: 700 26px/1 var(--font-ui); letter-spacing: 4px; }
.bx-toto__brand small { writing-mode: vertical-rl; font: 700 14px/1 var(--font-ui); letter-spacing: 3px; margin-top: var(--space-3); }
.bx-toto--phone { padding: var(--space-2); }
.bx-toto--phone .bx-toto__boards { grid-template-columns: 1fr; }
.bx-toto--phone .bx-toto__nums span { min-width: 0; height: 17px; font-size: 9px; }
.bx-toto--phone .bx-toto__money span { min-width: 34px; font-size: 9px; line-height: 13px; }
.bx-toto--phone .bx-toto__brand { width: 34px; }
.bx-toto--phone .bx-toto__brand span { font-size: 16px; letter-spacing: 2px; }
.bx-toto__x { position: absolute; top: -10px; right: -10px; z-index: 2; background: var(--slip-paper); color: var(--slip-red); }

/* 4D thermal receipt (all 67s) */
.bx-4d { position: relative; width: 280px; padding: var(--space-5) var(--space-5) var(--space-4); background: var(--receipt-paper); color: var(--receipt-ink); font-family: "Courier New", var(--font-lcd), monospace; box-shadow: var(--shadow-window); overflow: hidden; clip-path: polygon(0 6px, 4% 0, 8% 6px, 12% 0, 16% 6px, 20% 0, 24% 6px, 28% 0, 32% 6px, 36% 0, 40% 6px, 44% 0, 48% 6px, 52% 0, 56% 6px, 60% 0, 64% 6px, 68% 0, 72% 6px, 76% 0, 80% 6px, 84% 0, 88% 6px, 92% 0, 96% 6px, 100% 0, 100% 100%, 0 100%); }
.bx-4d__wm { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(4, 1fr); align-content: start; gap: 22px 10px; padding: 14px; pointer-events: none; }
.bx-4d__wm span { display: grid; place-items: center; height: 48px; border: 6px solid var(--receipt-watermark); border-radius: 12px; color: var(--receipt-watermark); font: 700 22px/1 var(--font-ui); transform: rotate(-8deg); }
.bx-4d > *:not(.bx-4d__wm) { position: relative; }
.bx-4d__title { margin: 0 0 var(--space-3); text-align: center; font: 700 44px/1 var(--font-ui); letter-spacing: 2px; }
.bx-4d__type { margin: 0 0 var(--space-2) 96px; font-size: 13px; }
.bx-4d__line { display: grid; grid-template-columns: 22px 1fr auto auto; gap: var(--space-2); align-items: baseline; font-size: 13px; }
.bx-4d__line b { font: 700 32px/40px "Courier New", monospace; letter-spacing: -1px; }
.bx-4d__price { margin: var(--space-3) 0 0; font: 700 22px/26px "Courier New", monospace; }
.bx-4d__meta { display: grid; grid-template-columns: 1fr auto; font-size: 11px; line-height: 14px; }
.bx-4d__bar { height: 46px; margin-top: var(--space-3); background: repeating-linear-gradient(90deg, var(--receipt-ink) 0 2px, transparent 2px 4px, var(--receipt-ink) 4px 5px, transparent 5px 8px, var(--receipt-ink) 8px 11px, transparent 11px 12px, var(--receipt-ink) 12px 13px, transparent 13px 17px); }
.bx-4d__fine { margin: var(--space-2) 0 0; text-align: center; font: 700 10px/13px var(--font-ui); }

/* Bait: boss email at 6pm */
.bx-mail { width: 330px; }
.bx-mail__hdr { display: grid; grid-template-columns: 58px 1fr; gap: 2px var(--space-2); padding: var(--space-2) var(--space-3); font: 13px/18px var(--font-ui); border-bottom: 1px solid var(--bevel-dark); }
.bx-mail__hdr span { color: var(--window-muted); }
.bx-mail__body { margin: 0; padding: var(--space-4) var(--space-3); font: 16px/23px var(--font-ui); min-height: 96px; }
.bx-mail__sig { display: block; margin-top: var(--space-3); font-size: 12px; color: var(--window-muted); }

/* Bait: 12.3 birthday super sale */
.bx-sale { position: relative; width: 330px; padding: var(--space-4); background: linear-gradient(160deg, var(--sale) 0%, var(--sale-deep) 100%); color: var(--on-sale); border-radius: var(--radius-bubbly); box-shadow: var(--shadow-window); overflow: hidden; text-align: center; font-family: var(--font-ui); }
.bx-sale::before { content: ""; position: absolute; inset: -40%; background: repeating-conic-gradient(from 0deg, transparent 0 8deg, var(--sale-deep) 8deg 16deg); opacity: .35; animation: bx-spin 12s linear infinite; }
.bx-sale > * { position: relative; }
.bx-sale__kicker { font: 700 13px/16px var(--font-ui); letter-spacing: 2px; }
.bx-sale__big { margin: var(--space-1) 0; font: 400 76px/1 var(--font-chunky); color: var(--sale-yellow); text-shadow: 3px 3px 0 var(--sale-deep); }
.bx-sale__title { font: 700 20px/24px var(--font-ui); }
.bx-sale__clock { display: flex; justify-content: center; gap: var(--space-1); margin: var(--space-3) 0; font: 700 20px/1 var(--font-pixel); }
.bx-sale__clock span { padding: var(--space-1) var(--space-2); background: var(--receipt-ink); color: var(--sale-yellow); border-radius: 4px; }
.bx-sale__vouchers { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin-bottom: var(--space-3); }
.bx-voucher { padding: var(--space-2); background: var(--sale-yellow); color: var(--on-sale-yellow); border-left: 4px dotted var(--sale-deep); border-radius: 6px; font: 700 13px/16px var(--font-ui); text-align: left; }
.bx-voucher small { display: block; font-weight: 400; font-size: 11px; }
.bx-sale .bx-btn { background: var(--sale-yellow); color: var(--on-sale-yellow); border-color: var(--sale-deep); }
.bx-sale .bx-chaos__x { color: var(--on-sale); }

/* Bait: Yah! Answers question */
.bx-ask { width: 330px; background: var(--window); color: var(--window-ink); border: 1px solid var(--bevel-dark); box-shadow: var(--shadow-window); font-family: var(--font-ui); }
.bx-ask__head { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--answers); color: var(--on-answers); font: 700 18px/22px var(--font-ui); }
.bx-ask__head small { font: 12px/16px var(--font-ui); margin-left: auto; }
.bx-ask__q { margin: 0; padding: var(--space-3) var(--space-3) 0; font: 700 20px/26px var(--font-ui); }
.bx-ask__meta { padding: 2px var(--space-3) var(--space-3); font: 12px/16px var(--font-ui); color: var(--window-muted); }
.bx-ask__best { margin: 0 var(--space-3) var(--space-3); padding: var(--space-2) var(--space-3); border: 2px solid var(--favourite); font: 15px/21px var(--font-ui); }
.bx-ask__best b { display: block; font-size: 12px; color: var(--window-muted); }
.bx-ask__more { padding: 0 var(--space-3) var(--space-3); font: 13px/18px var(--font-ui); color: var(--window-muted); }

/* Huat Ah! banner + red-packet rain */
.bx-huat { position: relative; display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) 44px var(--space-3) var(--space-3); background: var(--huat-red); color: var(--on-huat); border: 3px solid var(--huat-gold); border-radius: var(--radius-bubbly); box-shadow: var(--shadow-window); }
.bx-huat__fa { flex: none; display: grid; place-items: center; width: 56px; height: 56px; font: 700 34px/1 var(--font-ui); background: var(--huat-gold); color: var(--huat-red); border-radius: 50%; transform: rotate(45deg); }
.bx-huat__fa span { transform: rotate(-45deg); }
.bx-huat b { display: block; font: 700 22px/26px var(--font-chunky); letter-spacing: 1px; }
.bx-huat p { margin: 0; font: 14px/19px var(--font-ui); }
.bx-rain { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 6; }
.bx-rain i { position: absolute; top: 0; width: 18px; height: 26px; background: var(--huat-red); border: 2px solid var(--huat-gold); border-radius: 3px; animation: bx-fall 3s linear infinite; }
.bx-rain i::after { content: ""; position: absolute; left: 50%; top: 7px; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: var(--huat-gold); }
.bx-rain i.ingot { width: 24px; height: 12px; border-radius: 12px 12px 3px 3px; background: var(--huat-gold); border-color: var(--huat-red); }
.bx-rain i.ingot::after { display: none; }

/* Auntie: forwarded good-morning message */
.bx-forward { position: relative; padding: var(--space-3) 44px var(--space-3) var(--space-4); background: var(--forward-bubble); color: var(--forward-ink); border-radius: 4px 16px 16px 16px; box-shadow: var(--shadow-window); font: 15px/21px var(--font-ui); }
.bx-forward__tag { display: block; font: italic 12px/16px var(--font-ui); margin-bottom: var(--space-1); }
.bx-forward__flowers { font-size: 22px; line-height: 28px; letter-spacing: 2px; }
.bx-forward p { margin: 0; }

/* Auntie: tissue-packet chope on an answer tile (the one chaos that touches a tile: one tap clears it) */
.bx-answer.is-choped { cursor: pointer; }
.bx-tissue { position: absolute; right: 10px; top: 50%; margin-top: -26px; display: grid; place-items: center; width: 92px; height: 52px; background: var(--tissue); color: var(--tissue-ink); border: 2px solid var(--tissue-ink); border-radius: 8px; box-shadow: 0 3px 0 var(--tissue-ink); font: 700 11px/13px var(--font-ui); text-align: center; transform: rotate(-8deg); }
.bx-tissue b { font-size: 14px; letter-spacing: 1px; }
.bx-tissue::before { content: ""; position: absolute; top: 6px; left: 30%; right: 30%; height: 6px; border-radius: 6px; border: 1px dashed var(--tissue-ink); }

/* Host chaos settings */
.bx-seg { display: grid; grid-template-columns: repeat(3, 1fr); border: 2px solid var(--button-border); border-radius: var(--bx-r-btn); overflow: hidden; }
.bx-seg button { min-height: 44px; font: 700 15px/1 var(--font-ui); background: var(--button); color: var(--button-ink); border: 0; border-right: 1px solid var(--button-border); cursor: pointer; }
.bx-seg button:last-child { border-right: 0; }
.bx-seg button[aria-pressed="true"] { background: var(--highlight); color: var(--on-highlight); box-shadow: var(--shadow-pressed); }
.bx-toggle-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid var(--bevel-dark); font: 15px/20px var(--font-ui); }
.bx-toggle-row small { display: block; font: 12px/16px var(--font-ui); color: var(--window-muted); }
.bx-toggle-row input { width: 22px; height: 22px; flex: none; }

@media (prefers-reduced-motion: reduce) {
  .bx-anim-drop, .bx-anim-stamp, .bx-anim-pulse { animation: none !important; }
  .bx-rain { display: none; }
}
.bx-calm .bx-anim-pulse, .bx-calm .bx-rain { animation: none !important; display: none; }

/* ================= Round modifiers (scoring rule for one question) ================= */
.bx-mod { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 3px solid var(--frame); border-radius: var(--bx-r-btn); box-shadow: var(--shadow-bevel); background: var(--button); color: var(--button-ink); }
.bx-mod__icon { flex: none; display: grid; place-items: center; width: 48px; height: 48px; font: 700 22px/1 var(--font-pixel); border: 2px solid currentColor; border-radius: var(--bx-r-btn); }
.bx-mod__name { display: block; font: 700 20px/24px var(--font-pixel); letter-spacing: 1px; }
.bx-mod__rule { display: block; font: 13px/18px var(--font-ui); }
.bx-mod--double { background: var(--favourite); color: var(--on-favourite); }
.bx-mod--risky { background: var(--wrong); color: var(--on-wrong); }
.bx-mod--trouble { background: repeating-linear-gradient(-45deg, var(--favourite) 0 14px, var(--qr-ink) 14px 28px); color: var(--on-wrong); }
.bx-mod--trouble .bx-mod__body { background: var(--wrong); padding: var(--space-1) var(--space-3); border-radius: var(--radius-button); }
.bx-mod--trouble .bx-mod__icon { background: var(--wrong); }
.bx-mod--mystery { background: var(--window-ink); color: var(--window); }
.bx-mod--sm { padding: var(--space-1) var(--space-2); gap: var(--space-2); border-width: 2px; }
.bx-mod--sm .bx-mod__icon { width: 28px; height: 28px; font-size: 14px; }
.bx-mod--sm .bx-mod__name { font-size: 14px; line-height: 18px; }
.bx-mod--sm .bx-mod__rule { display: none; }
.bx-chip__stakes { display: block; font: 700 10px/12px var(--font-ui); margin-top: 2px; letter-spacing: 0; }
.bx-heat { display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; }
.bx-heat span { height: 10px; border: 1px solid var(--frame); background: var(--button); }
.bx-heat span.h1 { background: var(--favourite); } .bx-heat span.h2 { background: var(--accent); } .bx-heat span.h3 { background: var(--wrong); }
.bx-heat span.is-now { outline: 2px solid var(--focus); outline-offset: 1px; }
.bx-plan { width: 100%; border-collapse: collapse; font: 13px/18px var(--font-ui); }
.bx-plan td { padding: var(--space-1) var(--space-1); border-bottom: 1px solid var(--bevel-dark); vertical-align: middle; }
.bx-plan td:first-child { font: 700 13px/18px var(--font-pixel); width: 28px; }
.bx-plan .is-locked td:last-child::after { content: " 🔒"; }
.bx-warn { padding: var(--space-2) var(--space-3); background: var(--favourite); color: var(--on-favourite); border: 1px solid var(--frame); font: 12px/16px var(--font-ui); }


/* ================= Pointer hint: a big goofy arrow cursor pointing at where to type ================= */
.bx-hint-anchor { position: relative; }
.bx-pointer { position: absolute; z-index: 3; display: flex; align-items: flex-start; gap: var(--space-1); pointer-events: none; animation: bx-poke 1.1s ease-in-out infinite; }
.bx-pointer svg { flex: none; width: 64px; height: 88px; filter: drop-shadow(3px 4px 0 var(--window-ink)); }
.bx-pointer__label { margin-top: 46px; padding: var(--space-1) var(--space-3); background: var(--favourite); color: var(--on-favourite); border: 2px solid var(--qr-ink); border-radius: var(--radius-button); font: 700 15px/20px var(--font-comic); white-space: nowrap; transform: rotate(-4deg); box-shadow: 2px 2px 0 var(--qr-ink); }
@keyframes bx-poke { 0%,100% { transform: translate(0,0); } 45% { transform: translate(-7px,-9px); } 55% { transform: translate(-7px,-9px) scale(.96); } }
.bx-address__field.is-beckon { box-shadow: var(--shadow-pressed), 0 0 0 3px var(--favourite); animation: bx-beckon 1.2s ease-in-out infinite; }
.bx-address__field.is-beckon input::placeholder { color: var(--window-muted); font-style: italic; }
@keyframes bx-beckon { 0%,100% { box-shadow: var(--shadow-pressed), 0 0 0 3px var(--favourite); } 50% { box-shadow: var(--shadow-pressed), 0 0 0 6px var(--favourite); } }
@media (prefers-reduced-motion: reduce) { .bx-pointer, .bx-address__field.is-beckon { animation: none !important; } }
.bx-calm .bx-pointer, .bx-calm .bx-address__field.is-beckon { animation: none !important; }

/* ================= Spotlight: the hype moment (modifier reveal, MYSTERY reveal, crowned fave) =================
   Timeline: 0–300ms dim · 200–700ms light pool opens · 600–1100ms banner slams in · beams sweep while it holds
   (~1.5s) · exit: banner flies up into its meta-row pill (.is-leaving), dim lifts. Never fades out in place. */
.bx-spotlight { position: absolute; inset: 0; z-index: 8; display: grid; place-items: center; overflow: hidden; pointer-events: none; }
.bx-spotlight__dim { position: absolute; inset: 0; background: var(--qr-ink); opacity: .74; animation: bx-dim-in .3s ease-out both; }
.bx-spotlight__pool { position: absolute; left: 50%; top: 50%; width: 360px; height: 360px; margin: -180px 0 0 -180px; border-radius: 50%; background: radial-gradient(circle, var(--qr-paper) 0%, transparent 62%); opacity: .3; animation: bx-pool .5s .2s ease-out both; }
.bx-spotlight__beam { position: absolute; top: -60px; width: 200px; height: 760px; background: linear-gradient(180deg, var(--favourite) 0%, transparent 80%); clip-path: polygon(46% 0, 54% 0, 100% 100%, 0 100%); opacity: .38; transform-origin: 50% 0; }
.bx-spotlight__beam--l { left: -40px; animation: bx-sweep-l 2.6s ease-in-out infinite alternate; }
.bx-spotlight__beam--r { right: -40px; animation: bx-sweep-r 2.6s ease-in-out infinite alternate; }
.bx-spotlight__stage { position: relative; z-index: 1; width: 310px; display: grid; gap: var(--space-3); justify-items: center; text-align: center; animation: bx-slam .55s .6s cubic-bezier(.2,1.6,.4,1) both; }
.bx-spotlight__drum { color: var(--qr-paper); font: 700 15px/20px var(--font-pixel); letter-spacing: 3px; }
.bx-spotlight__rule { margin: 0; color: var(--qr-paper); font: 700 16px/22px var(--font-ui); }
.bx-spotlight__stage .bx-mod { width: 100%; transform: scale(1.06); box-shadow: 0 0 0 4px var(--qr-paper), 0 0 48px 14px var(--favourite); }
.bx-spotlight__stage .bx-mod__name { font-size: 26px; line-height: 30px; }
.bx-spotlight .bx-sparkle { animation: bx-twinkle 1.2s ease-in-out infinite; }
.bx-spotlight.is-leaving .bx-spotlight__stage { animation: bx-fly-up .4s cubic-bezier(.5,0,.8,.4) forwards; }
.bx-spotlight.is-leaving .bx-spotlight__dim, .bx-spotlight.is-leaving .bx-spotlight__pool, .bx-spotlight.is-leaving .bx-spotlight__beam { animation: bx-dim-out .35s ease-in forwards; }
@keyframes bx-dim-in { from { opacity: 0; } to { opacity: .74; } }
@keyframes bx-dim-out { to { opacity: 0; } }
@keyframes bx-pool { from { transform: scale(.2); opacity: 0; } to { transform: scale(1); opacity: .3; } }
@keyframes bx-sweep-l { from { transform: rotate(-28deg); } to { transform: rotate(18deg); } }
@keyframes bx-sweep-r { from { transform: rotate(28deg); } to { transform: rotate(-18deg); } }
@keyframes bx-slam { 0% { transform: scale(2.6) rotate(-8deg); opacity: 0; } 60% { opacity: 1; } 100% { transform: scale(1) rotate(0); opacity: 1; } }
@keyframes bx-fly-up { to { transform: translateY(-300px) scale(.32); opacity: .2; } }
@media (prefers-reduced-motion: reduce) {
  .bx-spotlight__dim, .bx-spotlight__pool, .bx-spotlight__stage, .bx-spotlight__beam, .bx-spotlight .bx-sparkle { animation: none !important; }
}
.bx-calm .bx-spotlight__beam, .bx-calm .bx-spotlight .bx-sparkle { animation: none !important; }

/* ================= Results: Spreadsheep 2003 (end-of-game charts and ranking) ================= */
.bx-xl { display: flex; flex-direction: column; min-height: 0; background: var(--xl-sheet); color: var(--xl-ink); border: 3px solid var(--frame); border-radius: var(--radius-window) var(--radius-window) 0 0; box-shadow: var(--shadow-window); overflow: hidden; font-family: var(--font-ui); }
.bx-xl__tools { display: flex; align-items: center; gap: 2px; padding: 2px var(--space-2); background: var(--xl-head); border-bottom: 1px solid var(--xl-grid); }
.bx-xl__tool { display: grid; place-items: center; min-width: 24px; height: 24px; padding: 0 4px; font: 700 12px/1 var(--font-ui); color: var(--xl-ink); border: 1px solid transparent; border-radius: 2px; }
.bx-xl__tool.is-on { border-color: var(--xl-grid); background: var(--xl-sheet); }
.bx-xl__fx { display: grid; grid-template-columns: 44px 22px 1fr; align-items: center; gap: 4px; padding: 2px var(--space-2); background: var(--xl-head); border-bottom: 1px solid var(--xl-grid); font: 12px/18px var(--font-ui); }
.bx-xl__fx span { padding: 0 4px; background: var(--xl-sheet); border: 1px solid var(--xl-grid); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bx-xl__fx i { font-style: italic; font-weight: 700; text-align: center; }
.bx-xl__tabs { display: flex; gap: 0; padding: 0 var(--space-2); background: var(--xl-head); border-top: 1px solid var(--xl-grid); font: 12px/22px var(--font-ui); overflow: hidden; }
.bx-xl__tabs span { padding: 0 10px; border: 1px solid var(--xl-grid); border-top: 0; margin-right: -1px; white-space: nowrap; }
.bx-xl__tabs span.is-on { background: var(--xl-sheet); font-weight: 700; }

/* Chart object */
.bx-xl-chart { position: relative; margin: var(--space-2); padding: var(--space-2) var(--space-2) var(--space-1); background: var(--xl-sheet); border: 1px solid var(--xl-ink); min-height: 0; display: flex; flex-direction: column; }
.bx-xl-chart__title { margin: 0 0 var(--space-1); text-align: center; font: 700 14px/18px var(--font-ui); }
.bx-xl-chart__legend { display: flex; justify-content: center; gap: var(--space-3); margin-bottom: var(--space-1); font: 11px/14px var(--font-ui); }
.bx-xl-chart__legend i { display: inline-block; width: 10px; height: 10px; margin-right: 4px; vertical-align: -1px; }
.bx-xl-chart__scroll { position: relative; flex: 1; min-height: 0; overflow-y: auto; }

/* Diverging horizontal bars: label | plot | value. Plot uses inline --z (zero position, %). */
.bx-hbars { position: relative; --label: 112px; --val: 50px; }
.bx-hbars__grid { position: absolute; top: 0; bottom: 0; left: var(--label); right: var(--val); pointer-events: none; }
.bx-hbars__grid i { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--xl-grid); }
.bx-hbars__grid i.zero { width: 2px; margin-left: -1px; background: var(--xl-ink); }
.bx-hbar { position: relative; display: grid; grid-template-columns: var(--label) 1fr var(--val); align-items: center; height: 20px; font: 12px/14px var(--font-ui); }
.bx-hbar__who { display: flex; align-items: center; gap: 4px; min-width: 0; padding-right: 4px; }
.bx-hbar__who b { flex: none; width: 18px; text-align: right; font: 700 11px/1 var(--font-pixel); }
.bx-hbar__who span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bx-hbar__who .bx-avatar { width: 16px; height: 16px; border-width: 1px; }
.bx-hbar__plot { position: relative; height: 14px; }
.bx-hbar__bar { position: absolute; top: 0; bottom: 0; background: var(--xl-pos); border-radius: 0 3px 3px 0; }
.bx-hbar__bar.is-neg { background: var(--xl-neg); border-radius: 3px 0 0 3px; }
.bx-hbar__val { text-align: right; font: 700 11px/14px var(--font-ui); font-variant-numeric: tabular-nums; }
.bx-hbar__val.is-neg { color: var(--xl-neg); }
.bx-hbar.is-top .bx-hbar__who span:last-child { font-weight: 700; }
.bx-hbar--tight { height: 15px; font-size: 11px; }
.bx-hbar--tight .bx-hbar__plot { height: 10px; }
.bx-hbar--tight .bx-avatar { width: 12px; height: 12px; }
.bx-hbars__axis { display: grid; grid-template-columns: var(--label) 1fr var(--val); font: 10px/14px var(--font-ui); color: var(--xl-ink); }
.bx-hbars__axis div { position: relative; height: 14px; }
.bx-hbars__axis span { position: absolute; transform: translateX(-50%); white-space: nowrap; }

/* "You": Excel's marching-ants copy selection around your row */
.bx-ants { position: relative; }
.bx-ants::after { content: ""; position: absolute; inset: -1px -2px; pointer-events: none;
  background: linear-gradient(90deg, var(--xl-ink) 50%, transparent 50%) 0 0 / 8px 2px repeat-x, linear-gradient(90deg, var(--xl-ink) 50%, transparent 50%) 0 100% / 8px 2px repeat-x,
              linear-gradient(0deg, var(--xl-ink) 50%, transparent 50%) 0 0 / 2px 8px repeat-y, linear-gradient(0deg, var(--xl-ink) 50%, transparent 50%) 100% 0 / 2px 8px repeat-y;
  animation: bx-ants .5s linear infinite; }
@keyframes bx-ants { to { background-position: 8px 0, -8px 100%, 0 -8px, 100% 8px; } }
.bx-you-tag { display: inline-block; margin-left: 4px; padding: 0 4px; font: 700 9px/13px var(--font-ui); background: var(--xl-ink); color: var(--xl-sheet); border-radius: 2px; vertical-align: 1px; }
.bx-debt-tag { display: inline-block; padding: 0 4px; font: 700 9px/13px var(--font-ui); background: var(--xl-neg); color: var(--on-xl-neg); border-radius: 2px; }

/* Chart tooltip (tap a bar) */
.bx-xl-tip { position: absolute; z-index: 2; padding: var(--space-1) var(--space-2); background: var(--sale-yellow); color: var(--xl-ink); border: 1px solid var(--xl-ink); box-shadow: 2px 2px 0 var(--xl-ink); font: 12px/16px var(--font-ui); white-space: nowrap; }

/* Compact podium: block heights are fixed by RANK, never by score (scores can be negative) */
.bx-podium-sm { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: end; gap: var(--space-2); }
.bx-podium-sm > div { display: grid; justify-items: center; gap: 2px; text-align: center; font: 12px/15px var(--font-ui); min-width: 0; }
.bx-podium-sm b { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.bx-podium-sm .blk { width: 100%; display: grid; place-items: center; border: 2px solid var(--frame); border-bottom: 0; font: 700 22px/1 var(--font-pixel); color: var(--on-medal); }
.bx-podium-sm .p1 .blk { height: 56px; background: var(--favourite); }
.bx-podium-sm .p2 .blk { height: 40px; background: var(--medal-silver); }
.bx-podium-sm .p3 .blk { height: 28px; background: var(--medal-bronze); }

/* Ranking sheet */
.bx-sheet { width: 100%; border-collapse: collapse; table-layout: fixed; font: 12px/16px var(--font-ui); color: var(--xl-ink); background: var(--xl-sheet); }
.bx-sheet th { background: var(--xl-head); font-weight: 400; border: 1px solid var(--xl-grid); text-align: center; height: 18px; }
.bx-sheet td { border: 1px solid var(--xl-grid); padding: 0 4px; height: 24px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bx-sheet td.num { text-align: right; font-variant-numeric: tabular-nums; }
.bx-sheet td.neg { color: var(--xl-neg); }
.bx-sheet th.rowh { width: 22px; }
.bx-sheet tr.r1 td:not(.rowh) { background: var(--favourite); color: var(--on-medal); }
.bx-sheet tr.r2 td:not(.rowh) { background: var(--medal-silver); color: var(--on-medal); }
.bx-sheet tr.r3 td:not(.rowh) { background: var(--medal-bronze); color: var(--on-medal); }
.bx-sheet tr.hdr td { background: var(--xl-head); font-weight: 700; }
.bx-sheet .who { display: flex; align-items: center; gap: 4px; }
.bx-sheet .who .bx-avatar { width: 16px; height: 16px; border-width: 1px; }
.bx-sheet td.has-note { position: relative; }
.bx-sheet td.has-note::after { content: ""; position: absolute; top: 0; right: 0; border: 4px solid transparent; border-top-color: var(--wrong); border-right-color: var(--wrong); }
.bx-xl-note { position: absolute; z-index: 3; width: 210px; padding: var(--space-2) var(--space-3); background: var(--sale-yellow); color: var(--xl-ink); border: 1px solid var(--xl-ink); box-shadow: 3px 3px 0 var(--xl-ink); font: 12px/17px var(--font-ui); }
.bx-xl-note b { display: block; font-size: 13px; }
.bx-xl-note::before { content: ""; position: absolute; left: -22px; top: 10px; width: 22px; height: 1px; background: var(--xl-ink); }

/* Alternatives */
.bx-tier { border: 2px solid var(--frame); background: var(--window); }
.bx-tier > h4 { margin: 0; padding: var(--space-1) var(--space-3); font: 700 13px/18px var(--font-ui); background: var(--titlebar); color: var(--titlebar-ink); display: flex; justify-content: space-between; }
.bx-tier--debt > h4 { background: var(--xl-neg); color: var(--on-xl-neg); }
.bx-tier__chips { display: flex; flex-wrap: wrap; gap: 4px; padding: var(--space-2); }
.bx-tier__chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px 2px 2px; font: 12px/16px var(--font-ui); background: var(--button); color: var(--button-ink); border: 1px solid var(--button-border); border-radius: var(--radius-pill); }
.bx-tier__chip .bx-avatar { width: 18px; height: 18px; border-width: 1px; border-radius: 50%; }
.bx-tier__chip.is-me { background: var(--highlight); color: var(--on-highlight); }
@media (prefers-reduced-motion: reduce) { .bx-ants::after { animation: none; } }
```

---

# Part 6 — bundle.js (preview helpers, reference only)

```js
/* BDAY.EXE preview helpers: shapes, pixel avatars, placeholder QR, demo timers, reactions, nudges.
   Plain DOM, no React. Call BDAY.mount(rootElement) once from a preview. */
(function () {
  var SHAPES = {
    a: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 22 21H2z"/></svg>',
    b: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 22 12 12 22 2 12z"/></svg>',
    c: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>',
    d: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18"/></svg>'
  };
  var NAMES = { a: 'triangle', b: 'diamond', c: 'circle', d: 'square' };

  /* 8x8 pixel avatars. 1 = main colour, 2 = second colour, k = dark, w = white */
  var AV = [
    { n: 'Cake', c1: 'favourite', c2: 'answer-a', g: ['...2....', '...1....', '.wwwwww.', '.w2ww2w.', '.111111.', '.k1kk1k.', '.111111.', 'kkkkkkkk'] },
    { n: 'Ghost', c1: 'on-answer', c2: 'answer-b', g: ['..1111..', '.111111.', '11k11k11', '11k11k11', '11111111', '11122111', '11111111', '1.11.11.'] },
    { n: 'Alien', c1: 'answer-d', c2: 'favourite', g: ['k......k', '.k1111k.', '11111111', '1kk11kk1', '1k2112k1', '11111111', '.11kk11.', '..1111..'] },
    { n: 'Frog', c1: 'answer-d', c2: 'on-answer', g: ['.22..22.', '2kk22kk2', '22222222', '11111111', '1kkkkkk1', '11111111', '.111111.', '1.1..1.1'] },
    { n: 'Star', c1: 'favourite', c2: 'answer-a', g: ['...11...', '...11...', '11111111', '.1k11k1.', '..1111..', '.112211.', '.11..11.', '11....11'] },
    { n: 'Cat', c1: 'answer-c', c2: 'favourite', g: ['1......1', '11....11', '11111111', '1k1111k1', '11122111', '1k1kk1k1', '.111111.', '..1..1..'] },
    { n: 'Robot', c1: 'answer-b', c2: 'answer-a', g: ['...22...', '...k....', '11111111', '1ww11ww1', '1wk11kw1', '11111111', '1kkkkkk1', '.11..11.'] },
    { n: 'Floppy', c1: 'answer-a', c2: 'on-answer', g: ['11111111', '1kkkkk11', '1kkk2k11', '1kkkkk11', '11111111', '1222222.', '1222222.', '11111111'] }
  ];
  function avatar(i) {
    var a = AV[((i % AV.length) + AV.length) % AV.length], s = '';
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
      var ch = a.g[y][x], col = ch === '1' ? a.c1 : ch === '2' ? a.c2 : ch === 'k' ? 'on-favourite' : ch === 'w' ? 'on-answer' : null;
      if (col) s += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" style="fill:var(--' + col + ')"/>';
    }
    return '<svg viewBox="0 0 8 8" shape-rendering="crispEdges" role="img" aria-label="' + a.n + ' avatar">' + s + '</svg>';
  }

  /* Placeholder QR: right shape, NOT scannable. Real build: generate from the join URL. */
  function qr(seed, size) {
    var n = 25, m = [], r = seed || 24, s = '';
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    for (var y = 0; y < n; y++) { m[y] = []; for (var x = 0; x < n; x++) m[y][x] = rnd() > 0.52; }
    function finder(ox, oy) {
      for (var y = -1; y < 8; y++) for (var x = -1; x < 8; x++) {
        var X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= n || Y >= n) continue;
        var ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
        m[Y][X] = ring === 3 || ring <= 1;
        if (x === -1 || y === -1 || x === 7 || y === 7) m[Y][X] = false;
      }
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    for (var yy = 0; yy < n; yy++) for (var xx = 0; xx < n; xx++) if (m[yy][xx]) s += 'M' + xx + ' ' + yy + 'h1v1h-1z';
    var px = size || 220;
    return '<svg width="' + px + '" height="' + px + '" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" role="img" aria-label="QR code to join (placeholder)"><path d="' + s + '" style="fill:var(--qr-ink)"/></svg>';
  }

  function countdown(el) {
    var total = +el.getAttribute('data-bx-countdown') || 20, start = el.hasAttribute('data-start') ? +el.getAttribute('data-start') : total, left = start;
    var secs = el.querySelector('.bx-timer__secs, [data-bx-secs]'), fill = el.querySelector('.bx-progress__fill');
    function paint() {
      if (secs) secs.textContent = (left < 10 ? '0' : '') + left;
      if (fill) fill.style.width = (left / total * 100) + '%';
      el.classList.toggle('is-urgent', left <= 5 && left > 0);
      el.classList.toggle('is-done', left === 0);
    }
    paint();
    if (el.hasAttribute('data-static')) return;
    setInterval(function () { left = left <= 0 ? start : left - 1; paint(); }, 1000);
  }

  var FEED = [['😂', 'Priya'], ['💀', 'Marcus'], [':P', 'Jo'], ['🎂', 'Wei Ling'], ['🔥', 'Dev'], ['(Y)', 'Sam'], ['😭', 'Hana'], ['🤡', 'Ollie'], ['💅', 'Bea'], [';)', 'Kai']];
  function reactions(stage) {
    var i = 0, w = stage.clientWidth || 300;
    function spawn() {
      var f = FEED[i % FEED.length], d = document.createElement('div');
      d.className = 'bx-float';
      d.style.left = (12 + ((i * 97) % Math.max(40, w - 180))) + 'px';
      d.innerHTML = '<span class="bx-avatar bx-avatar--sm">' + avatar(i) + '</span><span class="e">' + f[0] + '</span>' + f[1];
      stage.appendChild(d); i++;
      setTimeout(function () { d.remove(); }, 2500);
    }
    spawn(); setInterval(spawn, 700);
  }

  function nudge(el) {
    var every = +el.getAttribute('data-bx-nudge') || 3000;
    setInterval(function () { el.classList.remove('bx-anim-nudge'); void el.offsetWidth; el.classList.add('bx-anim-nudge'); }, every);
  }

  function confetti(el) {
    var cols = ['answer-a', 'answer-b', 'answer-c', 'answer-d', 'favourite'], s = '';
    for (var i = 0; i < 40; i++) s += '<i style="left:' + ((i * 37) % 100) + '%;background:var(--' + cols[i % 5] + ');animation-delay:-' + ((i * 0.31) % 4).toFixed(2) + 's;animation-duration:' + (3 + (i % 5) * 0.4) + 's"></i>';
    el.innerHTML = s;
  }

  function rain(el) {
    var s = '';
    for (var i = 0; i < 22; i++) s += '<i class="' + (i % 3 === 0 ? 'ingot' : '') + '" style="left:' + ((i * 43) % 96) + '%;animation-delay:-' + ((i * 0.37) % 3).toFixed(2) + 's;animation-duration:' + (2.4 + (i % 4) * 0.3) + 's"></i>';
    el.innerHTML = s;
  }

  /* Preview-only: restart a one-shot animation every N ms (clone restarts CSS animations). */
  function replay(el) {
    var every = +el.getAttribute('data-bx-replay') || 4200, leave = +el.getAttribute('data-bx-leave') || 0, cur = el;
    function cycle() {
      var fresh = cur.cloneNode(true); fresh.classList.remove('is-leaving'); cur.replaceWith(fresh); cur = fresh;
      if (leave) setTimeout(function () { cur.classList.add('is-leaving'); }, leave);
    }
    if (leave) setTimeout(function () { cur.classList.add('is-leaving'); }, leave);
    setInterval(cycle, every);
  }

  function mount(root) {
    root = root || document;
    root.querySelectorAll('[data-bx-shape]').forEach(function (e) { var k = e.getAttribute('data-bx-shape'); e.innerHTML = SHAPES[k] + '<span class="bx-sr">' + k.toUpperCase() + ', ' + NAMES[k] + '</span>'; });
    root.querySelectorAll('[data-bx-avatar]').forEach(function (e) { e.innerHTML = avatar(+e.getAttribute('data-bx-avatar')); });
    root.querySelectorAll('[data-bx-qr]').forEach(function (e) { e.innerHTML = qr(+e.getAttribute('data-bx-qr'), +e.getAttribute('data-size') || 220); });
    root.querySelectorAll('[data-bx-countdown]').forEach(countdown);
    root.querySelectorAll('[data-bx-react-stage]').forEach(reactions);
    root.querySelectorAll('[data-bx-nudge]').forEach(nudge);
    root.querySelectorAll('[data-bx-confetti]').forEach(confetti);
    root.querySelectorAll('[data-bx-rain]').forEach(rain);
    root.querySelectorAll('[data-bx-replay]').forEach(replay);
  }

  window.BDAY = { mount: mount, avatar: avatar, qr: qr, shapes: SHAPES, avatars: AV.map(function (a) { return a.n; }) };
})();
```

---

# Part 7 — Spotlight kit usage

The hype reveal from BDAY.EXE: the screen dims, a light pool opens, two gold beams sweep, the banner slams in with a drumroll line, holds, then **flies into its resting place** (e.g. the small modifier pill) instead of fading out.

## Files

| File | What it is |
|---|---|
| `spotlight.css` | All styles and keyframes. Reads BDAY.EXE tokens (`--qr-ink`, `--qr-paper`, `--favourite`, `--font-pixel`, `--font-ui`) and falls back to fixed values without them. |
| `spotlight.js` | `showSpotlight(options) → Promise<void>`. ES module, no dependencies. Builds the DOM, runs the timeline, flies the banner to `target` with the Web Animations API, removes itself. |
| `Spotlight.tsx` | React 18 wrapper: `<Spotlight open … onDone>`. |
| `demo.html` | Standalone demo. Serve the folder (`npx serve .`) and open it, since ES modules don't load from `file://`. |

## Use it (vanilla)

```js
import { showSpotlight } from './spotlight.js';

await showSpotlight({
  banner: badgeNode,                     // Node or HTML string, e.g. a .bx-mod badge
  drum: '★ THIS ROUND IS… ★',
  rule: 'Wrong answers cost you DOUBLE your bet.',
  extra: heatStripNode,                  // optional
  target: document.querySelector('.bx-pq__meta .bx-mod--sm'), // where it flies to
  container: phoneFrame,                 // optional; default document.body (fixed, full-screen)
  hold: 2700,                            // ms after landing
});
startBetTimer();                         // the spotlight never eats betting time
```

## Use it (React)

```tsx
<Spotlight open={revealing} drum="★ THIS ROUND IS… ★" rule={RULES[mod]} targetRef={pillRef}
           onDone={() => { setRevealing(false); startBetTimer(); }}>
  <ModifierBadge id={mod} />
</Spotlight>
```

Render the target pill (hidden with `visibility: hidden`, not `display: none`) **before** the spotlight leaves, so the flight has somewhere to land. Reveal it in `onDone`.

## Timeline

| t | What happens |
|---|---|
| 0 | Dim to 74% (`qr-ink`) · 30 ms haptic tick where supported |
| 200 ms | Light pool opens |
| 600 ms | Banner slams in (2.6× → 1×, overshoot) under the drumroll line |
| 1.15 s → 3.85 s | Hold (`hold`, default 2.7 s); beams sweep, sparkles twinkle |
| 3.85 s | Exit: banner flies into `target` (400 ms), dim lifts; no target → flies up and off |
| ~4.25 s | Removed; promise resolves → start the bet timer |

## When to use it

- Round modifier reveal at the start of each bet phase.
- The MYSTERY rule at the start of the reveal.
- The crowned Host's Fave.

Don't use it for chaos events or anything that happens more than once per question. It's loud on purpose, and it stays special only if it's rare.

## Accessibility

- `role="status"` + `aria-live="assertive"`: screen readers hear the drumroll, banner text and rule once.
- `pointer-events: none` everywhere: it never traps taps or focus.
- `prefers-reduced-motion` or a `.bx-calm` ancestor: a still, dimmed banner for 1.8 s. No beams, slam, twinkle or flight.
- Nothing flashes; the beams sweep at 2.6 s per pass, well under the WCAG 2.3.1 three-flashes threshold.
