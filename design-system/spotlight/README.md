# Spotlight kit

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
