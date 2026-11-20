// Design-system primitives as React components. Markup and class names mirror the
// BDAY.EXE design system previews; styling lives in styles/bundle.css + tokens.css.
import qrcode from 'qrcode-generator';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MOD_META, stakes } from '../shared/modifiers';
import type { ModifierId } from '../shared/types';

// ---------------------------------------------------------------- shapes & avatars (from bundle.js)
const SHAPE_PATHS = {
  a: <path d="M12 3 22 21H2z" />,
  b: <path d="M12 2 22 12 12 22 2 12z" />,
  c: <circle cx="12" cy="12" r="10" />,
  d: <rect x="3" y="3" width="18" height="18" />,
};
const SHAPE_NAMES = { a: 'triangle', b: 'diamond', c: 'circle', d: 'square' };
export const KEYS = ['a', 'b', 'c', 'd'] as const;
export type Key = (typeof KEYS)[number];

export function Shape({ k }: { k: Key }) {
  return (
    <>
      <svg viewBox="0 0 24 24" aria-hidden="true">{SHAPE_PATHS[k]}</svg>
      <span className="bx-sr">{k.toUpperCase()}, {SHAPE_NAMES[k]}</span>
    </>
  );
}

const AV = [
  { n: 'Cake', c1: 'favourite', c2: 'answer-a', g: ['...2....', '...1....', '.wwwwww.', '.w2ww2w.', '.111111.', '.k1kk1k.', '.111111.', 'kkkkkkkk'] },
  { n: 'Ghost', c1: 'on-answer', c2: 'answer-b', g: ['..1111..', '.111111.', '11k11k11', '11k11k11', '11111111', '11122111', '11111111', '1.11.11.'] },
  { n: 'Alien', c1: 'answer-d', c2: 'favourite', g: ['k......k', '.k1111k.', '11111111', '1kk11kk1', '1k2112k1', '11111111', '.11kk11.', '..1111..'] },
  { n: 'Frog', c1: 'answer-d', c2: 'on-answer', g: ['.22..22.', '2kk22kk2', '22222222', '11111111', '1kkkkkk1', '11111111', '.111111.', '1.1..1.1'] },
  { n: 'Star', c1: 'favourite', c2: 'answer-a', g: ['...11...', '...11...', '11111111', '.1k11k1.', '..1111..', '.112211.', '.11..11.', '11....11'] },
  { n: 'Cat', c1: 'answer-c', c2: 'favourite', g: ['1......1', '11....11', '11111111', '1k1111k1', '11122111', '1k1kk1k1', '.111111.', '..1..1..'] },
  { n: 'Robot', c1: 'answer-b', c2: 'answer-a', g: ['...22...', '...k....', '11111111', '1ww11ww1', '1wk11kw1', '11111111', '1kkkkkk1', '.11..11.'] },
  { n: 'Floppy', c1: 'answer-a', c2: 'on-answer', g: ['11111111', '1kkkkk11', '1kkk2k11', '1kkkkk11', '11111111', '1222222.', '1222222.', '11111111'] },
];
export const AVATAR_NAMES = AV.map((a) => a.n);

export function AvatarSvg({ i }: { i: number }) {
  const a = AV[((i % AV.length) + AV.length) % AV.length];
  const rects: ReactNode[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const ch = a.g[y][x];
    const col = ch === '1' ? a.c1 : ch === '2' ? a.c2 : ch === 'k' ? 'on-favourite' : ch === 'w' ? 'on-answer' : null;
    if (col) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} style={{ fill: `var(--${col})` }} />);
  }
  return <svg viewBox="0 0 8 8" shapeRendering="crispEdges" role="img" aria-label={`${a.n} avatar`}>{rects}</svg>;
}

export function Avatar({ i, size, className = '', style }: { i: number; size?: 'sm' | 'lg'; className?: string; style?: React.CSSProperties }) {
  return <span className={`bx-avatar ${size ? `bx-avatar--${size}` : ''} ${className}`} style={style}><AvatarSvg i={i} /></span>;
}

// ---------------------------------------------------------------- QR (real, scannable)
export function QR({ text, size = 220 }: { text: string; size?: number }) {
  const path = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + 2} ${y + 2}h1v1h-1z`;
    return { d, n: n + 4 };
  }, [text]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${path.n} ${path.n}`} shapeRendering="crispEdges" role="img" aria-label={`QR code to join: ${text}`}>
      <rect width={path.n} height={path.n} style={{ fill: 'var(--qr-paper)' }} />
      <path d={path.d} style={{ fill: 'var(--qr-ink)' }} />
    </svg>
  );
}

// ---------------------------------------------------------------- chrome
export function Window({ title, children, className = '', style, controls, close, ...rest }: {
  title?: ReactNode; children?: ReactNode; className?: string; style?: React.CSSProperties; controls?: boolean; close?: () => void;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`bx-window ${className}`} style={style} {...rest}>
      {title != null && (
        <div className="bx-titlebar">
          <span className="bx-title">{title}</span>
          {controls && <><span className="bx-ctl" aria-hidden="true">_</span><span className="bx-ctl" aria-hidden="true">□</span></>}
          {close && <button className="bx-ctl bx-ctl--close" aria-label="Close" onClick={close}>×</button>}
        </div>
      )}
      {children}
    </section>
  );
}

export const Pill = ({ kind, children, className = '' }: { kind?: 'accent' | 'fave' | 'correct' | 'wrong'; children: ReactNode; className?: string }) =>
  <span className={`bx-pill ${kind ? `bx-pill--${kind}` : ''} ${className}`}>{children}</span>;

export const Hourglass = ({ size = 40 }: { size?: number }) => (
  <svg className="bx-anim-spin" width={size} height={size} viewBox="0 0 8 8" aria-hidden="true">
    <path d="M1 0h6v1L5 4l2 3v1H1V7l2-3-2-3z" style={{ fill: 'var(--sparkle)', stroke: 'var(--frame)', strokeWidth: 0.4 }} />
  </svg>
);

export const Sparkle = ({ size = 34, className = '', style }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg className={`bx-anim-twinkle ${className}`} style={style} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" style={{ fill: 'var(--sparkle)', stroke: 'var(--frame)', strokeWidth: 0.6 }} />
  </svg>
);

export const StartLogo = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden="true"><path d="M4 0 7 7H1z" style={{ fill: 'var(--sparkle)' }} /><rect x="1" y="7" width="6" height="1" style={{ fill: 'var(--on-accent)' }} /></svg>
);

export const ErrorIcon = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" style={{ fill: 'var(--wrong)' }} /><path d="M7 7l10 10M17 7 7 17" style={{ stroke: 'var(--on-wrong)', strokeWidth: 3 }} /></svg>
);

// ---------------------------------------------------------------- timer
export function Progress({ pct, stripes }: { pct: number; stripes?: boolean }) {
  return <div className="bx-progress"><div className={`bx-progress__fill ${stripes ? 'bx-anim-stripes' : ''}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}

export const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function Timer({ left, total, label, big }: { left: number; total: number; label?: ReactNode; big?: boolean }) {
  return (
    <div className={`bx-timer ${left <= 5 && left > 0 ? 'is-urgent' : ''} ${left === 0 ? 'is-done' : ''}`} role="timer">
      <div className="bx-timer__row"><Progress pct={(left / Math.max(1, total)) * 100} /><span className="bx-timer__secs" aria-hidden="true" style={big ? { fontSize: 30 } : undefined}>{pad2(left)}</span></div>
      {label && <span className="bx-timer__label">{label}</span>}
    </div>
  );
}

/** Screen-reader announcements for the timer: only "10 seconds left" and "Time's up" (DS a11y checklist). */
export function TimerAnnouncer({ left, active }: { left: number; active: boolean }) {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!active) return;
    if (left === 10) setMsg('10 seconds left');
    else if (left === 0) setMsg("Time's up");
  }, [left, active]);
  return <span className="bx-sr" aria-live="polite">{msg}</span>;
}

// ---------------------------------------------------------------- modifiers
const modClass = (m: ModifierId) => (m === 'normal' ? '' : `bx-mod--${m}`);
export function ModBadge({ m, sm, final }: { m: ModifierId; sm?: boolean; final?: boolean }) {
  const meta = MOD_META[m];
  return (
    <div className={`bx-mod ${modClass(m)} ${sm ? 'bx-mod--sm' : ''}`}>
      <span className="bx-mod__icon" aria-hidden="true">{meta.icon}</span>
      <span className="bx-mod__body"><span className="bx-mod__name">{final ? 'FINAL' : sm ? meta.short : meta.name}</span>{!sm && <span className="bx-mod__rule">{meta.rule}</span>}</span>
    </div>
  );
}

export function Heat({ heat, total }: { heat: ModifierId[]; total: number }) {
  return (
    <div className="bx-heat" aria-label={`Game heat so far: ${heat.map((m) => MOD_META[m].name).join(', ')}`}>
      {Array.from({ length: total }, (_, i) => {
        const m = heat[i];
        const h = m ? MOD_META[m].heat : 0;
        return <span key={i} className={`${h ? `h${h}` : ''} ${i === heat.length - 1 ? 'is-now' : ''}`} />;
      })}
    </div>
  );
}

// ---------------------------------------------------------------- wager chips
export const CHIP_VALUES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
export const fmt = (n: number) => n.toLocaleString('en-US');
export const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '0');

export function Chips({ available, selected, onPick, modifier, disabled }: {
  available: number[]; selected: number | null; onPick: (c: number) => void; modifier: ModifierId | null; disabled?: boolean;
}) {
  return (
    <div className="bx-chips" role="group" aria-label="Wager chips" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
      {CHIP_VALUES.map((c) => {
        const spent = !available.includes(c);
        const st = modifier ? stakes(c, modifier) : null;
        const label = spent ? `${c}, spent` : st ? `${c}: win ${st.win}${st.lose ? `, lose ${st.lose}` : ''}` : `${c}`;
        return (
          <button key={c} className="bx-chip" disabled={spent || disabled} aria-pressed={selected === c} aria-label={label} onClick={() => onPick(c)}>
            {c}
            {!spent && st && <span className="bx-chip__stakes">{st.lose ? `±${fmt(st.win)}` : `+${fmt(st.win)}`}</span>}
            {!spent && modifier === 'mystery' && <span className="bx-chip__stakes">???</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- answers
export function AnswerTile({ k, text, state, count, badge, onClick, disabled, chope, onChope }: {
  k: Key; text: ReactNode; state?: '' | 'is-selected' | 'is-correct' | 'is-wrong' | 'is-dim' | 'is-fave';
  count?: number; badge?: string; onClick?: () => void; disabled?: boolean; chope?: boolean; onChope?: () => void;
}) {
  const interactive = !!onClick || chope;
  const body = (
    <>
      <span className="bx-answer__key"><Shape k={k} /></span>
      <span className="bx-answer__text">{text}</span>
      {count != null && <span className="bx-answer__count">{count}</span>}
      {badge && <span className="bx-answer__badge">{badge}</span>}
      {chope && (
        <span className="bx-tissue bx-anim-stamp" aria-label="Choped by Auntie, tap to remove"><span><b>CHOPE</b><br />by Auntie<br />tap to remove</span></span>
      )}
    </>
  );
  if (!interactive) return <div className={`bx-answer ${state ?? ''}`} data-k={k}>{body}</div>;
  return (
    <button
      className={`bx-answer ${state ?? ''} ${chope ? 'is-choped' : ''}`} data-k={k} aria-pressed={state === 'is-selected'} disabled={disabled}
      onClick={() => (chope ? onChope?.() : onClick?.())}
    >{body}</button>
  );
}

// ---------------------------------------------------------------- reactions
export const REACTS: { e: string; label: string; text?: boolean }[] = [
  { e: '😂', label: 'Crying laughing' }, { e: '💀', label: 'Dead' }, { e: '🎂', label: 'Cake' }, { e: '🔥', label: 'Fire' },
  { e: ':P', label: 'Tongue out', text: true }, { e: ';)', label: 'Wink', text: true }, { e: '(Y)', label: 'Thumbs up', text: true }, { e: '🤡', label: 'Clown' },
];

export function ReactionBar({ onReact, only }: { onReact: (e: string) => void; only?: number }) {
  const list = only ? REACTS.slice(0, only) : REACTS;
  return (
    <div className="bx-reactions" role="group" aria-label="Send a reaction">
      {list.map((r) => <button key={r.e} className={`bx-react ${r.text ? 'bx-react--text' : ''}`} aria-label={r.label} onClick={() => onReact(r.e)}>{r.e}</button>)}
    </div>
  );
}

export interface Float { id: number; e: string; name: string; avatar: number; left: number }
export function ReactStage({ floats, style }: { floats: Float[]; style?: React.CSSProperties }) {
  return (
    <div className="bx-react-stage" style={style} aria-hidden="true">
      {floats.map((f) => (
        <div key={f.id} className="bx-float" style={{ left: f.left }}>
          <span className="bx-avatar bx-avatar--sm"><AvatarSvg i={f.avatar} /></span><span className="e">{f.e}</span>{f.name}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- decorations
export function Confetti() {
  const cols = ['answer-a', 'answer-b', 'answer-c', 'answer-d', 'favourite'];
  return (
    <div className="bx-confetti" aria-hidden="true">
      {Array.from({ length: 40 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: `var(--${cols[i % 5]})`, animationDelay: `-${((i * 0.31) % 4).toFixed(2)}s`, animationDuration: `${3 + (i % 5) * 0.4}s` }} />
      ))}
    </div>
  );
}

export function Rain() {
  return (
    <div className="bx-rain" aria-hidden="true">
      {Array.from({ length: 22 }, (_, i) => (
        <i key={i} className={i % 3 === 0 ? 'ingot' : ''} style={{ left: `${(i * 43) % 96}%`, animationDelay: `-${((i * 0.37) % 3).toFixed(2)}s`, animationDuration: `${2.4 + (i % 4) * 0.3}s` }} />
      ))}
    </div>
  );
}

/** Restart a CSS animation class on demand (nudge shake). */
export function useShake(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>();
  return [on, () => { setOn(false); requestAnimationFrame(() => setOn(true)); clearTimeout(t.current); t.current = setTimeout(() => setOn(false), 700); }];
}

// ---------------------------------------------------------------- Spotlight (DS › Motion › Spotlight)
/** The hype moment: dim, light pool, two sweeping gold beams, banner slams in, holds, then flies up
 *  (.is-leaving) instead of fading. Top layer of the phone, tap-through. Leaves at `leaveAt` ms after mount. */
export function Spotlight({ drum, rule, children, extra, leaveAt = 3300 }: {
  drum: string; rule?: ReactNode; children: ReactNode; extra?: ReactNode; leaveAt?: number;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  useLayoutEffect(() => { setHost(document.querySelector<HTMLElement>('.bx-phone')); }, []);
  useEffect(() => {
    try { (navigator as any).vibrate?.(30); } catch { /* iOS */ }
    const a = setTimeout(() => setLeaving(true), leaveAt);
    const b = setTimeout(() => setGone(true), leaveAt + 420);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [leaveAt]);
  if (!host || gone) return null;
  const spark = (style: React.CSSProperties, i: number) => (
    <svg key={i} className="bx-sparkle" style={style} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" style={{ stroke: 'var(--qr-ink)', strokeWidth: 0.6 }} /></svg>
  );
  return createPortal(
    <div className={`bx-spotlight ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="assertive">
      <div className="bx-spotlight__dim" /><div className="bx-spotlight__pool" />
      <div className="bx-spotlight__beam bx-spotlight__beam--l" /><div className="bx-spotlight__beam bx-spotlight__beam--r" />
      {[{ left: 24, top: '36%' }, { right: 30, top: '30%', animationDelay: '-.4s' }, { left: 46, bottom: '28%', animationDelay: '-.8s' }, { right: 52, bottom: '22%', animationDelay: '-1.1s' }].map(spark)}
      <div className="bx-spotlight__stage">
        <span className="bx-spotlight__drum">{drum}</span>
        {children}
        {rule && <p className="bx-spotlight__rule">{rule}</p>}
        {extra}
      </div>
    </div>,
    host,
  );
}
