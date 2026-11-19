// Chaos layering contract (PRD §8a acceptance): overlays never intersect an answer tile's or the
// timer's bounding box at 360, 390 and 430 px widths; answers stay tappable under an overlay;
// every overlay closes on its own.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE ?? 'http://127.0.0.1:8787';
const SHOTS = process.env.SHOTS ?? 'screenshots';
mkdirSync(SHOTS, { recursive: true });
const PIN = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
const WIDTHS = [360, 390, 430];
const NP = 9;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const errors = [];
const page = async (w, name) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: 780 }, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  return p;
};
const host = await page(390, 'host');
await host.goto(`${BASE}/host`);
await host.fill('#hpin', PIN);
await host.click('button:has-text("Create room")');
await host.waitForSelector('text=Start the chaos');
const players = [];
for (let i = 0; i < NP; i++) {
  const w = WIDTHS[i % 3];
  const p = await page(w, `p${i}@${w}`);
  await p.goto(`${BASE}/${PIN}`);
  await p.fill('#nick', `P${i}`);
  await p.click('button:has-text("Log On")');
  await p.waitForSelector("text=You're in!");
  p.w = w;
  players.push(p);
}
await host.click('text=Start the chaos');
const title = () => host.locator('.bx-chrome .bx-title').innerText();

const intersects = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
let seen = 0, checks = 0, tappedUnder = 0;
const kinds = new Set();

for (let q = 1; q <= 5; q++) {
  // bets: let the coward's tax handle it; wait for ANSWER
  await host.waitForSelector('text=/Answering/', { timeout: 20000 });
  const t0 = Date.now();
  const secs = [20, 20, 20, 30, 20][q - 1];
  while (Date.now() - t0 < (secs - 1) * 1000) {
    for (const p of players) {
      const ov = p.locator('.bx-chaos > *').first();
      if (!(await ov.count())) continue;
      const box = await ov.boundingBox();
      const kind = await p.locator('.bx-chaos').getAttribute('data-chaos');
      if (!kinds.has(kind)) {
        kinds.add(kind);
        await p.screenshot({ path: `${SHOTS}/chaos-${kind}-${p.w}.png` });
      }
      seen++;
      for (const sel of ['.bx-pq__answers .bx-answer', '.bx-timer__secs', '.bx-address__field input', '.bx-ig-compose input', '.bx-keypad']) {
        const els = p.locator(sel);
        const n = await els.count();
        for (let k = 0; k < n; k++) {
          checks++;
          const b = await els.nth(k).boundingBox();
          if (intersects(box, b)) errors.push(`Q${q} ${kind} @${p.w}px overlaps ${sel}[${k}]`);
        }
      }
      // answers stay tappable under the overlay
      const tile = p.locator('.bx-pq__answers .bx-answer:not(.is-choped)').first();
      if (await tile.count()) { await tile.click({ timeout: 2000 }); tappedUnder++; }
    }
    await sleep(250);
  }
  // all overlays end with the phase
  await host.waitForSelector('text=/Reveal|Judge|Pick your fave/', { timeout: 15000 });
  if (/Judge|fave/.test(await title())) await host.click('button.bx-btn--primary.bx-btn--lg');
  for (const p of players) if (await p.locator('.bx-chaos').count()) errors.push(`Q${q}: overlay still up after the answer phase`);
  // the reveal plays itself to the leaderboard
  if (q < 5) { await host.waitForSelector(`text=Start Q${q + 1}`); await host.click(`text=Start Q${q + 1}`); }
  console.log(`Q${q}: overlays seen so far ${seen}, kinds ${[...kinds].join(',')}`);
}
await browser.close();
console.log(`layout checks: ${checks}, answers tapped under an overlay: ${tappedUnder}`);
if (!seen) errors.push('No chaos event fired in Q2–Q5 with 9 players');
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('CHAOS LAYOUT PASS');
