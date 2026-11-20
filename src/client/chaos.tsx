// Chaos overlays (PRD §8a). Rendered inside .bx-chaos within .bx-chaos-zone, so they can cover
// the question card but never the answers, the input or the timer. Non-modal: no focus trap.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ChaosEvent, ChaosKind } from '../shared/types';
import { Rain } from './ds';

const ANNOUNCE: Record<ChaosKind, string> = {
  scam_eyepad: 'CONGRATULATIONS', scam_virus: 'SecurityCenter 2006', scam_smileys: 'FREE SMILEYS', toto: 'TOTE-LLY LUCKY',
  fourd: '4D ticket', huat: 'Huat Ah', auntie_forward: 'Forwarded message', auntie_chope: 'Auntie chope',
  boss_email: 'New email from your boss', bday_sale: '12.3 birthday sale', melvin: 'Yah! Answers',
};

function Toto() {
  const marks = new Set([6, 7, 16, 17, 26, 27]);
  const money = ['$1', '$10', '$2', '$20', '$3', '$30', '$4', '$50', '$5', '$100'];
  return (
    <>
      <div className="bx-toto__boards">
        <div className="bx-toto__board">
          <div className="bx-toto__nums" aria-hidden="true">
            {Array.from({ length: 49 }, (_, i) => <span key={i} className={marks.has(i + 1) ? 'is-marked' : ''}>{i + 1}</span>)}
            <div className="bx-toto__void">VOID <b>A</b></div>
          </div>
          <div className="bx-toto__money" aria-hidden="true">
            {money.map((m, i) => <span key={m} className={i === 0 ? 'is-marked' : ''}>{m}</span>)}<span className="others">Others</span>
          </div>
        </div>
      </div>
      <div className="bx-toto__side"><div className="bx-toto__brand"><span>TOTE-LLY</span></div></div>
    </>
  );
}

function ScamFrame({ title, prize, children, cta, onClose, tinyX, timer }: {
  title: string; prize: React.ReactNode; children: React.ReactNode; cta: string; onClose: () => void; tinyX?: boolean; timer?: boolean;
}) {
  const [left, setLeft] = useState(9);
  useEffect(() => { if (!timer) return; const id = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(id); }, [timer]);
  return (
    <section className="bx-window bx-dialog bx-anim-pop" data-theme="xp" role="alertdialog" aria-label={title}>
      <div className="bx-titlebar">
        <span className="bx-title">{title}</span>
        {tinyX
          ? <button className="bx-chaos__x bx-chaos__x--tiny" aria-label="Close" style={{ position: 'static' }} onClick={onClose}>×</button>
          : <button className="bx-ctl bx-ctl--close" aria-label="Close" onClick={onClose}>×</button>}
      </div>
      <div className="bx-dialog__body"><span className="bx-scam__prize" aria-hidden="true">{prize}</span><div>{children}</div></div>
      <div className="bx-dialog__actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        {timer ? <span className="bx-chaos__timer">Offer ends in 00:0{left}</span> : <span />}
        <button className="bx-btn bx-btn--primary bx-anim-pulse" onClick={onClose}>{cta}</button>
      </div>
    </section>
  );
}

/** Pop-ups that dodge the first close: they jump somewhere else on screen and only close on the second tap. */
const REOPEN: ChaosKind[] = ['boss_email', 'bday_sale'];

export function ChaosOverlay({ ev, onClose, victim = 'your friend', sender }: {
  ev: ChaosEvent; onClose: (ev: ChaosEvent) => void;
  /** A real player's name for the copy ("Scanning will not remove viruses or Jo"). */
  victim?: string;
  /** Who sent a player pop-up (power-up), if any. */
  sender?: string;
}) {
  const shown = useRef(Date.now());
  const [dodges, setDodges] = useState(0);
  const reallyClose = () => onClose(ev);
  const close = () => (REOPEN.includes(ev.kind) && dodges === 0 ? setDodges(1) : reallyClose());
  useEffect(() => {
    shown.current = Date.now();
    setDodges(0);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') reallyClose(); }; // Escape always closes
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev.id]);
  const from = ev.from ? <p className="bx-scam__fine">Sent by: {sender ?? 'a friend'} (allegedly).</p> : null;
  let body: React.ReactNode;
  switch (ev.kind) {
    case 'scam_eyepad':
      body = (
        <ScamFrame title="!!! CONGRATULATIONS !!!" prize={<span style={{ fontSize: 15 }}>FREE</span>} cta="CLAIM NOW" onClose={close} tinyX timer>
          <p><b>You won a FREE eyePad Pro Max!!</b></p><p>You are the 1,000,000th visitor to this birthday.</p>
          <p className="bx-scam__fine">*eyePad is a drawing of an eyePad. Terms apply. No terms exist.</p>{from}
        </ScamFrame>
      );
      break;
    case 'scam_virus':
      body = (
        <ScamFrame title="SecurityCenter 2006" prize="!" cta="SCAN NOW" onClose={close}>
          <p><b>Your phone has 24 viruses.</b></p><p>One for every year Anne has been alive. Scan now?</p>
          <p className="bx-scam__fine">Scanning will not remove viruses or {victim}.</p>{from}
        </ScamFrame>
      );
      break;
    case 'scam_smileys':
      body = (
        <ScamFrame title="FREE SMILEYS!!" prize=":)" cta="DOWNLOAD" onClose={close}>
          <p><b>10,000 smileys for your Mezzenger!</b></p><p>Definitely not a virus.</p>
          <p className="bx-scam__fine">Smileys may contain smileys.</p>{from}
        </ScamFrame>
      );
      break;
    case 'toto':
      body = (
        <div className="bx-toto bx-anim-drop bx-toto--phone" role="status" aria-label="Lottery slip pop-up: your lucky numbers are 6 and 7">
          <button className="bx-chaos__x bx-toto__x" aria-label="Close slip" onClick={close}>×</button>
          <Toto />
        </div>
      );
      break;
    case 'fourd':
      body = (
        <div className="bx-4d bx-anim-drop" role="status" aria-label="4D ticket pop-up, every number is 67">
          <div className="bx-4d__wm" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i}>67</span>)}</div>
          <button className="bx-chaos__x" aria-label="Close ticket" style={{ zIndex: 2 }} onClick={close}>×</button>
          <p className="bx-4d__title">4D</p>
          <p className="bx-4d__type">ORDINARY</p>
          <div className="bx-4d__line"><span>A.</span><b>6767</b><span>BIG $67</span><span>SML $67</span></div>
          <p className="bx-4d__price">PRICE:$67.67</p>
          <p className="bx-4d__fine">DRAW: SAT 06/07/67 · NOT A REAL TICKET · 6… 7…</p>
        </div>
      );
      break;
    case 'huat':
      body = (
        <div className="bx-huat bx-anim-drop" role="status">
          <button className="bx-chaos__x" aria-label="Close" onClick={close}>×</button>
          <span className="bx-huat__fa" aria-hidden="true"><span>发</span></span>
          <div><b>HUAT AH!</b><p>The God of Wealth has blessed your answer. Effect: none. Still huat.</p></div>
        </div>
      );
      break;
    case 'auntie_forward':
      body = (
        <div className="bx-forward bx-anim-drop" role="status">
          <button className="bx-chaos__x" aria-label="Close" onClick={close}>×</button>
          <span className="bx-forward__tag">↪ Forwarded many times · Auntie Lily</span>
          <span className="bx-forward__flowers" aria-hidden="true">🌸🌺🌷🌸🌺</span>
          <p><b>Good Morning!!</b> Blessed birthday 🙏 Forward this to 10 friends within 10 seconds or your answer will be WRONG. Don't break the chain!!!</p>
        </div>
      );
      break;
    case 'boss_email':
      body = (
        <section className="bx-window bx-mail bx-anim-pop" data-theme="xp" role="alertdialog" aria-label="New email from your boss">
          <div className="bx-titlebar"><span className="bx-title">✉ 1 new message — Inbox</span><button className="bx-chaos__x bx-chaos__x--tiny" style={{ position: 'static', color: 'var(--titlebar-ink)' }} aria-label="Close" onClick={close}>×</button></div>
          <div className="bx-mail__hdr"><span>From:</span><b>Boss (work)</b><span>Sent:</span>Sat 6:07 PM<span>Subject:</span>RE: RE: FW: urgent</div>
          <p className="bx-mail__body">hi... good pm.. can i get that ppt in 5 min? need for meeting. thx,<span className="bx-mail__sig">Sent from my brick phone</span></p>
          <div className="bx-dialog__actions"><button className="bx-btn" onClick={close}>Pretend I didn't see</button><button className="bx-btn bx-btn--primary" onClick={close}>Reply "on it!!"</button></div>
        </section>
      );
      break;
    case 'bday_sale':
      body = (
        <div className="bx-sale bx-anim-pop" role="alertdialog" aria-label="12.3 birthday sale pop-up">
          <button className="bx-chaos__x" aria-label="Close sale" style={{ zIndex: 2 }} onClick={close}>×</button>
          <div className="bx-sale__kicker">⚡ FLASH ⚡ MEGA ⚡ BIRTHDAY ⚡</div>
          <div className="bx-sale__big">12.3</div>
          <div className="bx-sale__title">ANNE'S BIRTHDAY SUPER SALE</div>
          <div className="bx-sale__clock" aria-label="Ends in 00:06:07"><span>00</span>:<span>06</span>:<span>07</span></div>
          <div className="bx-sale__vouchers"><div className="bx-voucher">$0 OFF<small>min. spend $67</small></div><div className="bx-voucher">FREE SHIPPING<small>to your own seat</small></div><div className="bx-voucher">99% OFF CAKE<small>1 slice left!!</small></div></div>
          <button className="bx-btn bx-btn--lg bx-btn--block bx-anim-pulse" onClick={close}>CLAIM ALL (does nothing)</button>
        </div>
      );
      break;
    case 'melvin':
      body = (
        <div className="bx-ask bx-anim-drop" role="status" aria-label="Yah Answers pop-up">
          <div className="bx-ask__head">Yah! Answers<small>Society &amp; Culture › Names</small><button className="bx-chaos__x bx-chaos__x--tiny" style={{ position: 'static', color: 'var(--on-answers)' }} aria-label="Close" onClick={close}>×</button></div>
          <p className="bx-ask__q">is Melvin a name for a gangster?</p>
          <div className="bx-ask__meta">anon_6767 · asked 13 years ago · 67 answers</div>
          <div className="bx-ask__best"><b>★ Best answer (chosen by voters)</b>depends. does he wear slippers to a nice restaurant</div>
        </div>
      );
      break;
    default:
      return null;
  }
  return (
    <>
      <span className="bx-sr" aria-live="polite">Pop-up: {ANNOUNCE[ev.kind]}. Close button available.</span>
      <Roam mode={ev.kind === 'scam_eyepad' ? 'sweep' : 'dvd'} id={ev.id} kind={ev.kind} jump={dodges}>
        {dodges > 0 && <span className="app-dodge" aria-hidden="true">nice try :P</span>}
        {body}
      </Roam>
    </>
  );
}

/** The phone element, found after mount (it isn't in the document during the first render). */
export function usePhoneHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setHost(document.querySelector<HTMLElement>('.bx-phone')); }, []);
  return host;
}

/** Huat rain spans the whole phone with pointer-events: none (taps go through). */
function PhoneRain() {
  const host = usePhoneHost();
  return host ? createPortal(<Rain />, host) : null;
}

/** Every chaos pop-up roams the whole screen as the top layer. It is tap-through except its own buttons,
 *  so answers underneath always work. dvd: bounces off the edges like the DVD logo. sweep: glides up and
 *  down. `jump` changes → it teleports somewhere new (the "closing reopens it" troll). Scaled down to fit
 *  small screens. Calm mode / reduced motion: parked in the middle, still. */
function Roam({ mode, id, kind, jump, children }: { mode: 'dvd' | 'sweep'; id: string; kind: ChaosKind; jump: number; children: React.ReactNode }) {
  const host = usePhoneHost();
  const stage = useRef<HTMLDivElement>(null);
  const item = useRef<HTMLDivElement>(null);
  const jumpRef = useRef(jump);
  useEffect(() => {
    const el = item.current, box = stage.current;
    if (!el || !box) return;
    const still = !!box.closest('.bx-calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seed = 0;
    for (const c of id + kind) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const rand = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
    const speed = 85 + rand() * 50;
    const ang = 0.5 + rand() * 0.6;
    let vx = speed * Math.cos(ang) * (rand() < 0.5 ? -1 : 1), vy = speed * Math.sin(ang) * (rand() < 0.5 ? -1 : 1);
    let x = 0, y = 0, raf = 0, last = performance.now(), first = true, seenJump = jumpRef.current;
    const t0 = last;
    const frame = (now: number) => {
      const W = box.clientWidth, H = box.clientHeight;
      const s = Math.min(1, (W * 0.92) / Math.max(1, el.offsetWidth), (H * 0.62) / Math.max(1, el.offsetHeight));
      const w = el.offsetWidth * s, h = el.offsetHeight * s;
      const maxX = Math.max(0, W - w), maxY = Math.max(0, H - h);
      if (first || seenJump !== jumpRef.current) {
        seenJump = jumpRef.current;
        x = still || mode === 'sweep' ? maxX / 2 : rand() * maxX;
        y = still ? maxY / 2 : rand() * maxY;
        if (!first) { vx = -vx; vy = -vy; }
        first = false;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!still) {
        if (mode === 'dvd') {
          x += vx * dt; y += vy * dt;
          if (x <= 0 || x >= maxX) { vx = -vx; x = Math.max(0, Math.min(maxX, x)); }
          if (y <= 0 || y >= maxY) { vy = -vy; y = Math.max(0, Math.min(maxY, y)); }
        } else {
          x = maxX / 2;
          y = maxY * (0.5 - 0.5 * Math.cos(((now - t0) / 2600) * Math.PI)); // top → bottom → top, 2.6s each way
        }
      }
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${s.toFixed(3)})`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [host, mode, id, kind]);
  useEffect(() => { jumpRef.current = jump; }, [jump]);
  if (!host) return null;
  return createPortal(
    <div className="app-roam bx-chaos" data-chaos={kind} data-chaos-roam={mode} ref={stage}>
      <div className="app-roam__item" ref={item}>{children}</div>
    </div>,
    host,
  );
}

export const shownMs = (ev: ChaosEvent, now: number) => Math.max(0, now - ev.at);
