// End-to-end: one host + N players play a full 10-question game against `wrangler dev`.
// Usage: BASE=http://127.0.0.1:8787 SHOTS=./screenshots node test/e2e.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE ?? 'http://127.0.0.1:8787';
const SHOTS = process.env.SHOTS ?? 'screenshots';
const NP = Number(process.env.PLAYERS ?? 3);
mkdirSync(SHOTS, { recursive: true });
const PIN = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const mk = async (name) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`); });
  return page;
};

const host = await mk('host');
await host.goto(`${BASE}/host`);
await host.fill('#hpin', PIN);
await host.click('button:has-text("Create room")');
await host.waitForSelector('text=Start the chaos');
console.log('room', PIN, 'created');
await host.screenshot({ path: `${SHOTS}/host-lobby.png` });

const players = [];
const names = ['Priya', 'Marcus', 'Jo', 'Wei Ling', 'Dev', 'Hana'];
for (let i = 0; i < NP; i++) {
  const p = await mk(`p${i}`);
  await p.goto(`${BASE}/${PIN}`);
  await p.fill('#nick', names[i]);
  await p.click(`.app-avatars button >> nth=${i}`);
  if (i === 0) await p.screenshot({ path: `${SHOTS}/p-join.png` });
  await p.click('button:has-text("Log On")');
  await p.waitForSelector("text=You're in!");
  players.push(p);
}
await players[0].screenshot({ path: `${SHOTS}/p-lobby.png` });
await host.screenshot({ path: `${SHOTS}/host-lobby-full.png` });

// host setup screen
await host.click('text=Modifier plan');
await host.waitForSelector('text=round modifier plan');
await host.screenshot({ path: `${SHOTS}/host-setup.png`, fullPage: true });
await host.click('text=Done → Lobby');
await host.click('text=Start the chaos');

const hostTitle = () => host.locator('.bx-chrome .bx-title').innerText();
const waitTitle = async (re, ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const t = await hostTitle(); if (re.test(t)) return t; await sleep(150); }
  throw new Error(`timeout waiting for ${re}; host title "${await hostTitle()}"`);
};

for (let q = 1; q <= 10; q++) {
  // MODIFIER → BET
  await sleep(300);
  await players[0].screenshot({ path: `${SHOTS}/q${q}-1-modifier.png` });
  await players[0].waitForSelector('.bx-chip', { timeout: 15000 });
  for (const [i, p] of players.entries()) {
    const chips = p.locator('.bx-chip:not([disabled])');
    await chips.nth(i === 0 ? (await chips.count()) - 1 : 0).click();
    if (i === 0) await p.screenshot({ path: `${SHOTS}/q${q}-2-bet.png` });
    await p.click('text=/^Lock in/');
  }
  await players[1].screenshot({ path: `${SHOTS}/q${q}-3-bet-locked.png` });
  await host.click('button:has-text("End now")');
  // ANSWER
  await players[0].waitForFunction(() => !document.querySelector('.bx-chip'), null, { timeout: 15000 });
  await sleep(400);
  await players[0].screenshot({ path: `${SHOTS}/q${q}-4-answer.png` });
  await host.screenshot({ path: `${SHOTS}/q${q}-host-live.png` });
  for (const [i, p] of players.entries()) {
    if (await p.locator('.bx-pq__answers .bx-answer').count()) {
      const tiles = p.locator('.bx-pq__answers .bx-answer');
      // clear a chope if present, then answer
      if (await p.locator('.is-choped').count()) await p.locator('.is-choped').first().click();
      await tiles.nth(i % (await tiles.count())).click();
    } else if (await p.locator('.bx-top8 button').count()) {
      await p.locator('.bx-top8 button').nth(i % NP).click();
    } else if (await p.locator('.bx-keypad').count()) {
      for (const k of String(100 + i * 50)) await p.click(`.bx-key[aria-label="${k}"]`);
      await p.click('.bx-key[aria-label="Send"]');
    } else if (await p.locator('input[aria-label="Your guess"]').count()) {
      await p.fill('input[aria-label="Your guess"]', String(100 + i));
      await p.click('text=Send guess');
    } else {
      const input = p.locator('#addr, #ans, .bx-ig-compose input').first();
      await input.fill(['McFly', 'mc fly', 'busted', 'feather boa'][i % 4]);
      await input.press('Enter');
    }
  }
  await sleep(300);
  await players[0].screenshot({ path: `${SHOTS}/q${q}-5-waiting.png` });
  // chaos check: any overlay on any phone?
  for (const [i, p] of players.entries()) {
    if (await p.locator('.bx-chaos').count()) await p.screenshot({ path: `${SHOTS}/q${q}-chaos-p${i}.png` });
  }
  await host.click('button:has-text("End now")');
  // JUDGE (if any)
  const t = await waitTitle(/Reveal|Judge|Pick your fave|Brick/);
  if (/Judge/.test(t)) { await host.screenshot({ path: `${SHOTS}/q${q}-host-judge.png` }); await host.click('text=Done → reveal'); }
  else if (/fave/.test(t)) {
    await players[0].screenshot({ path: `${SHOTS}/q${q}-6-judging.png` });
    await host.locator('.bx-fave').first().click();
    await host.screenshot({ path: `${SHOTS}/q${q}-host-fave.png` });
    await host.click('text=/Crown & reveal|Reveal \\(no fave\\)/');
  } else if (/Brick|Phone/.test(t) && !/Reveal/.test(t)) {
    await host.fill('input[aria-label="Real number"]', '150');
    await host.screenshot({ path: `${SHOTS}/q${q}-host-number.png` });
    await host.click('text=Confirm → reveal');
  }
  await waitTitle(/Reveal/);
  // the reveal plays itself (autopilot): screenshot each step until the leaderboard / podium
  let step = 0, lastStep = '';
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const t = await hostTitle();
    if (/After Q|Podium/.test(t)) break;
    const label = await host.locator('button[aria-pressed="true"]').last().innerText().catch(() => '');
    if (label !== lastStep) {
      lastStep = label;
      await sleep(250);
      await players[0].screenshot({ path: `${SHOTS}/q${q}-7-reveal-${step}.png` });
      if (step === 0) await host.screenshot({ path: `${SHOTS}/q${q}-host-reveal.png` });
      step++;
    }
    await sleep(200);
  }
  if (step < 3) throw new Error(`Q${q}: autopilot showed only ${step} reveal steps`);
  if (q < 10) {
    await waitTitle(/After Q/, 30000);
    await sleep(300);
    await players[0].screenshot({ path: `${SHOTS}/q${q}-8-board.png` });
    await host.click(`text=Start Q${q + 1}`);
  }
  console.log(`Q${q} done`);
}
await waitTitle(/Podium/);
await sleep(500);
await players[0].screenshot({ path: `${SHOTS}/podium.png` });
await players[0].click('text=Your report');
await players[0].screenshot({ path: `${SHOTS}/report.png` });
await host.screenshot({ path: `${SHOTS}/host-podium.png` });

// reconnect: reload a player, they should be back on the podium as the same seat
await players[1].reload();
await players[1].waitForSelector('text=Installation complete', { timeout: 10000 });
console.log('reload → same seat ✓');

await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('E2E PASS');
