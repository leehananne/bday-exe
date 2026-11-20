// Nothing a player taps may be cut off: every button, answer tile, chip, key and input must sit fully
// inside the phone, for both question sets, on every screen of every question, at real phone sizes.
// (Scrollable lists, i.e. anything inside .app-scroll, are allowed to extend.)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE ?? 'http://127.0.0.1:8787';
const SIZES = [[360, 640], [375, 600], [390, 664], [390, 780], [430, 860]]; // 375x600 / 390x664 ≈ SE / iPhone 13 with Safari bars
const STATES = [['bet', '&phase=BET'], ['answer', ''], ['waiting', '&answered'], ['reveal', '&reveal=answer'], ['points', '&reveal=points']];
const browser = await chromium.launch();
const problems = [];
let checked = 0;
for (const set of ['party', 'sample']) for (const [w, h] of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  for (let q = 1; q <= 10; q++) for (const [name, qs] of STATES) {
    await page.goto(`${BASE}/dev/preview?set=${set}&q=${q}${qs}`);
    await page.waitForTimeout(name === 'points' ? 900 : 120);
    const bad = await page.evaluate(() => {
      const phone = document.querySelector('.bx-phone').getBoundingClientRect();
      const out = [];
      for (const el of document.querySelectorAll('button, input, textarea, .bx-answer, .bx-key, .bx-chip')) {
        if (el.closest('.app-scroll, .bx-chaos, .app-hype-layer, .app-roam')) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.bottom > phone.bottom + 1 || r.right > phone.right + 1 || r.left < phone.left - 1) {
          out.push(`${(el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 28)} (bottom ${Math.round(r.bottom)} > ${Math.round(phone.bottom)})`);
        }
      }
      return out;
    });
    checked++;
    for (const b of bad) problems.push(`${set} Q${q} ${name} @${w}x${h}: ${b}`);
  }
  await page.close();
}
await browser.close();
console.log(`${checked} screens checked`);
if (problems.length) { console.log([...new Set(problems)].join('\n')); process.exit(1); }
console.log('FIT PASS: nothing cut off');
