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

export function ChaosOverlay({ ev, onClose }: { ev: ChaosEvent; onClose: (ev: ChaosEvent) => void }) {
  const shown = useRef(Date.now());
  const close = () => onClose(ev);
  useEffect(() => {
    shown.current = Date.now();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev.id]);
  const sender = ev.from ? <p className="bx-scam__fine">Sent by: a friend (allegedly).</p> : null;
  let body: React.ReactNode;
  switch (ev.kind) {
    case 'scam_eyepad':
      body = (
        <ScamFrame title="!!! CONGRATULATIONS !!!" prize={<span style={{ fontSize: 15 }}>FREE</span>} cta="CLAIM NOW" onClose={close} tinyX timer>
          <p><b>You won a FREE eyePad Pro Max!!</b></p><p>You are the 1,000,000th visitor to this birthday.</p>
          <p className="bx-scam__fine">*eyePad is a drawing of an eyePad. Terms apply. No terms exist.</p>{sender}
        </ScamFrame>
      );
      break;
    case 'scam_virus':
      body = (
        <ScamFrame title="SecurityCenter 2006" prize="!" cta="SCAN NOW" onClose={close}>
          <p><b>Your phone has 24 viruses.</b></p><p>One for every year Anne has been alive. Scan now?</p>
          <p className="bx-scam__fine">Scanning will not remove viruses or Marcus.</p>{sender}
        </ScamFrame>
      );
      break;
    case 'scam_smileys':
      body = (
        <ScamFrame title="FREE SMILEYS!!" prize=":)" cta="DOWNLOAD" onClose={close}>
          <p><b>10,000 smileys for your Mezzenger!</b></p><p>Definitely not a virus.</p>
          <p className="bx-scam__fine">Smileys may contain smileys.</p>{sender}
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
      {ev.kind === 'huat' && <PhoneRain />}
      <FitZone kind={ev.kind}>{body}</FitZone>
    </>
  );
}

/** Huat rain spans the whole phone with pointer-events: none (taps go through). */
function PhoneRain() {
  const host = document.querySelector('.bx-phone');
  return host ? createPortal(<Rain />, host) : null;
}

export const shownMs = (ev: ChaosEvent, now: number) => Math.max(0, now - ev.at);

/** Layering contract: the overlay may cover the card zone but never spill onto answers/input/timer.
 *  If an overlay is taller than its zone, scale it down to fit (top-anchored). */
function FitZone({ kind, children }: { kind: ChaosKind; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const zone = outer.current?.parentElement;
    const el = inner.current;
    if (!zone || !el) return;
    const fit = () => {
      const h = el.scrollHeight, w = el.scrollWidth;
      const zh = zone.clientHeight - 4, zw = zone.clientWidth + 8; // .bx-chaos starts 6px above the zone; keep a margin below it
      setScale(Math.min(1, zh / Math.max(1, h), zw / Math.max(1, w)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(zone);
    ro.observe(el);
    return () => ro.disconnect();
  }, [kind]);
  return (
    <div className="bx-chaos" data-chaos={kind} ref={outer}>
      <div ref={inner} style={{ transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: 'top center' }}>{children}</div>
    </div>
  );
}
