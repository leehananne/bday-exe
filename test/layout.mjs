// Deterministic layering test: every chaos kind × every question skin × 360/390/430 px, rendered
// from real engine state via /dev/preview (no server needed beyond static assets).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE ?? 'http://127.0.0.1:8787';
const SHOTS = process.env.SHOTS ?? 'screenshots/layout';
mkdirSync(SHOTS, { recursive: true });
const KINDS = ['scam_eyepad', 'scam_virus', 'scam_smileys', 'toto', 'fourd', 'huat', 'auntie_forward', 'auntie_chope', 'boss_email', 'bday_sale', 'melvin'];
const ROAMING = ['fourd', 'scam_eyepad'];
const intersects = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const browser = await chromium.launch();
const errors = [];
let checks = 0;
for (const w of [360, 390, 430]) {
  const page = await browser.newPage({ viewport: { width: w, height: w === 360 ? 640 : w === 390 ? 780 : 860 } });
  page.on('pageerror', (e) => errors.push(e.message));
  for (let q = 1; q <= 10; q++) {
    for (const answered of [false, true]) for (const kind of KINDS) {
      await page.goto(`${BASE}/dev/preview?q=${q}&kind=${kind}${answered ? '&answered' : ''}`);
      const ov = page.locator('.bx-chaos > *').first();
      if (kind === 'auntie_chope') {
        if (await page.locator('.is-choped').count()) {
          const t = page.locator('.is-choped');
          await t.click(); // first tap clears the tissue (in the real app); here it must at least be tappable
        }
        continue;
      }
      if (ROAMING.includes(kind)) {
        // Roaming pop-ups (4D bounce, eyePad sweep) are the top layer by design but tap-through:
        // every answer tile / input must still receive a tap while they move over it.
        await page.waitForSelector('.app-roam__item', { timeout: 3000 }).catch(() => errors.push(`q${q} ${kind} @${w}: roaming pop-up not rendered`));
        const pe = await page.locator('.app-roam__item').evaluate((el) => getComputedStyle(el).pointerEvents).catch(() => 'missing');
        if (pe !== 'none') errors.push(`q${q} ${kind} @${w}: roaming pop-up is not tap-through (${pe})`);
        if (!answered) {
          const tiles = page.locator('.bx-pq__answers .bx-answer');
          for (let k = 0; k < await tiles.count(); k++) {
            checks++;
            const hit = await tiles.nth(k).evaluate((el) => { const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!t && el.contains(t); });
            if (!hit) errors.push(`q${q} ${kind} @${w}: tile ${k} not tappable under the roaming pop-up`);
          }
        }
        continue;
      }
      if (!(await ov.count())) { errors.push(`q${q} ${kind} @${w}: overlay not rendered`); continue; }
      await page.waitForTimeout(500); // let drop/pop animations settle
      const box = await ov.boundingBox();
      for (const sel of ['.bx-pq__answers .bx-answer', '.bx-timer__secs', '.bx-timer', '.bx-address__field input', '.bx-ig-compose', '.bx-keypad', '.bx-top8', 'button:has-text("Change answer")']) {
        const els = page.locator(sel);
        for (let k = 0; k < await els.count(); k++) {
          checks++;
          if (intersects(box, await els.nth(k).boundingBox())) errors.push(`q${q} ${kind} ${answered ? 'waiting' : 'answer'} @${w}px overlaps ${sel}`);
        }
      }
      if (w === 390 && !answered && (q === 2 || q === 9 || q === 4 || q === 8)) await page.screenshot({ path: `${SHOTS}/q${q}-${kind}.png` });
    }
  }
  await page.close();
}
await browser.close();
console.log(`${checks} bounding-box checks`);
if (errors.length) { console.log([...new Set(errors)].join('\n')); process.exit(1); }
console.log('LAYOUT PASS');
