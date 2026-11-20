/* BDAY.EXE Spotlight — showSpotlight() runs the whole hype reveal and resolves when it's gone.
   No dependencies. ES module. Pair with spotlight.css.

   import { showSpotlight } from './spotlight.js';
   await showSpotlight({
     banner: document.querySelector('#mod-template').content.cloneNode(true), // Node or HTML string
     drum: '★ THIS ROUND IS… ★',
     rule: 'Wrong answers cost you DOUBLE your bet.',
     target: document.querySelector('.meta-row .bx-mod--sm'),  // where the banner flies to (optional)
   });
   startBetTimer();  // only after the spotlight has left
*/

const SPARK = '<svg class="bx-spotlight__spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/></svg>';
const SPARK_POS = ['left:6%;top:34%', 'right:8%;top:28%;animation-delay:-.4s', 'left:12%;bottom:26%;animation-delay:-.8s', 'right:14%;bottom:22%;animation-delay:-.2s'];

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !!document.querySelector('.bx-calm');

/**
 * @param {object}  o
 * @param {Node|string} o.banner   The thing in the spotlight (e.g. a .bx-mod badge).
 * @param {string}  [o.drum]       Drumroll line above the banner.
 * @param {string}  [o.rule]       One-line explanation under the banner.
 * @param {Node|string} [o.extra]  Anything else under the rule (e.g. a heat strip).
 * @param {Element} [o.target]     Element the banner flies into on exit. Omitted: flies up and off.
 * @param {Element} [o.container]  Where to mount. Default document.body (fixed). A phone frame → contained.
 * @param {number}  [o.hold=2700]  ms the banner holds after it lands.
 * @param {boolean} [o.haptic=true] Short vibration on entry where supported (not on iOS Safari).
 * @returns {Promise<void>} Resolves after the spotlight has been removed.
 */
export function showSpotlight({ banner, drum = '★ THIS ROUND IS… ★', rule = '', extra = '', target, container = document.body, hold = 2700, haptic = true }) {
  const calm = reducedMotion();
  const root = document.createElement('div');
  root.className = 'bx-spotlight' + (container === document.body ? '' : ' bx-spotlight--contained');
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'assertive');
  root.innerHTML =
    '<div class="bx-spotlight__dim"></div><div class="bx-spotlight__pool"></div>' +
    '<div class="bx-spotlight__beam bx-spotlight__beam--l"></div><div class="bx-spotlight__beam bx-spotlight__beam--r"></div>' +
    SPARK_POS.map(p => SPARK.replace('class="bx-spotlight__spark"', `class="bx-spotlight__spark" style="${p}"`)).join('') +
    '<div class="bx-spotlight__stage"><span class="bx-spotlight__drum"></span><div class="bx-spotlight__banner"></div><p class="bx-spotlight__rule"></p><div class="bx-spotlight__extra"></div></div>';

  root.querySelector('.bx-spotlight__drum').textContent = drum;
  root.querySelector('.bx-spotlight__rule').textContent = rule;
  const slot = root.querySelector('.bx-spotlight__banner');
  typeof banner === 'string' ? (slot.innerHTML = banner) : slot.append(banner);
  const ex = root.querySelector('.bx-spotlight__extra');
  extra ? (typeof extra === 'string' ? (ex.innerHTML = extra) : ex.append(extra)) : ex.remove();
  if (!rule) root.querySelector('.bx-spotlight__rule').remove();

  container.append(root);
  if (haptic && !calm) navigator.vibrate?.(30);

  const ENTER = calm ? 0 : 1150;          // dim + pool + slam
  const total = ENTER + (calm ? 1800 : hold);

  return new Promise(resolve => {
    setTimeout(async () => {
      root.classList.add('is-leaving');
      const stage = root.querySelector('.bx-spotlight__stage');
      if (!calm && target && stage.animate) {
        // FLIP: fly the stage into the target's box.
        const a = stage.getBoundingClientRect(), b = target.getBoundingClientRect();
        const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
        const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
        const s = Math.max(.15, Math.min(1, b.width / a.width));
        stage.style.animation = 'none';
        await stage.animate(
          [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: .2 }],
          { duration: 400, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }
        ).finished.catch(() => {});
        target.animate?.([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 250, easing: 'ease-out' });
      } else {
        if (!target) root.classList.add('no-target');
        await new Promise(r => setTimeout(r, calm ? 0 : 400));
      }
      root.remove();
      resolve();
    }, total);
  });
}
