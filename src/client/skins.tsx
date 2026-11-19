// The 11 question skins (DS "Player · Question skins"). Every skin is a colour theme + scenery
// around the one shared phone skeleton (.bx-pq). Components never fork per skin; only chrome,
// the card container, and a few input variants (address bar, T9 keypad, comment box, Top 8) do.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SKINS } from '../shared/questions';
import type { SkinId } from '../shared/types';
import type { Choice, View } from '../shared/views';
import { AnswerTile, Avatar, fmt, KEYS, ModBadge, pad2, Pill, Sparkle, StartLogo, type Key } from './ds';

export const themeOf = (skin: SkinId | null | undefined) => (skin ? SKINS[skin].theme : 'xp');
export const skinClass = (skin: SkinId | null | undefined) =>
  !skin ? 'skin-xp' : skin === 'ie' ? 'skin-xp skin-ie' : `skin-${skin === 'xp' ? 'xp' : skin}`;

/** The phone root: theme + skin scenery + calm + nudge shake. */
export function Phone({ skin, calm, shake, host, children, className = '' }: {
  skin?: SkinId | null; calm?: boolean; shake?: boolean; host?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={`bx-phone app-phone ${skinClass(skin)} ${calm ? 'bx-calm' : ''} ${shake ? 'bx-anim-nudge' : ''} ${host ? 'is-host' : ''} ${className}`} data-theme={themeOf(skin)}>
      {children}
    </div>
  );
}

const clock = () => { const d = new Date(); return `${d.getHours()}:${pad2(d.getMinutes())}`; };

// ---------------------------------------------------------------- chrome per skin
export function SkinShell({ skin, view, children, coins, poke, pqStyle }: {
  skin: SkinId; view: View; children: ReactNode; coins?: number; poke?: string | null; pqStyle?: React.CSSProperties;
}) {
  const n = view.q, total = view.total;
  const locked = view.lockedIn.length, all = view.players.length;
  const bet = view.me?.bet;
  switch (skin) {
    case 'xp':
      return (
        <>
          <div className="bx-pq" style={pqStyle}>{children}</div>
          <div className="bx-taskbar" style={{ height: 44 }}>
            <span className="bx-btn bx-btn--start" style={{ fontSize: 18 }}><StartLogo />start</span>
            <span className="bx-task is-current">Q{n}/{total}</span>
            <div className="bx-tray"><span>{locked}/{all} in</span><span className="bx-clock">{clock()}</span></div>
          </div>
        </>
      );
    case 'ie':
      return (
        <section className="bx-window" style={{ flex: 1, borderRadius: 0, borderWidth: 0 }}>
          <div className="bx-titlebar"><span className="bx-title">Q{n} — Internet Exploder</span><span className="bx-ctl bx-ctl--close" aria-hidden="true">×</span></div>
          <nav className="bx-menubar" aria-hidden="true"><span>File</span><span>Edit</span><span>View</span><span>Favourites</span></nav>
          <div className="bx-toolbar" aria-hidden="true"><span className="bx-btn">◀ Back</span><span className="bx-btn">✕</span><span className="bx-btn">⟳</span>{bet != null && <span className="bx-pill bx-pill--accent" style={{ marginLeft: 'auto' }}>Bet {bet}</span>}</div>
          <div className="bx-pq" style={{ padding: 0, gap: 0, ...pqStyle }}>{children}</div>
          <div className="bx-statusbar"><span>Done</span><span>Internet zone</span></div>
        </section>
      );
    case 'igloo':
      return (
        <>
          <div className="bx-pq" style={pqStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="igloo-display" style={{ color: 'var(--window-ink)' }}>Brrr-thday Quiz!</span><span className="bx-coins">◎ {fmt(coins ?? 0)}</span></div>
            {children}
          </div>
          <svg className="app-igloo" width="96" height="52" viewBox="0 0 26 14" aria-hidden="true"><path d="M1 14a12 12 0 0 1 24 0z" style={{ fill: 'var(--window)', stroke: 'var(--frame)', strokeWidth: 0.5 }} /><path d="M3 10h20M6 6.5h14M10 3.5h6M7 10v4M19 10v4M9 6.5v3.5M16 6.5v3.5" style={{ stroke: 'var(--frame)', strokeWidth: 0.35, fill: 'none' }} /><path d="M10 14v-3a3 3 0 0 1 6 0v3z" style={{ fill: 'var(--frame)' }} /></svg>
        </>
      );
    case 'fakebook':
      return (
        <>
          <div className="bx-fb-bar"><span className="bx-fb-logo">fakebook</span><span style={{ marginLeft: 'auto' }}>Q{n}/{total}{bet != null ? ` · Bet ${bet}` : ''}</span></div>
          <div className="bx-pq" style={{ paddingTop: 12, ...pqStyle }}>{children}</div>
          <div className="bx-fb-dock">{poke ? <span className="is-alert">{poke} poked you!</span> : <span>Pokes (0)</span>}<span>Chat ({all})</span></div>
        </>
      );
    case 'monster':
      return (
        <>
          <div className="bx-chrome bx-goo"><span className="bx-title" style={{ font: '400 22px/26px var(--font-chunky)' }}>MONSTER MASH</span><span className="bx-coins" style={{ fontFamily: 'var(--font-chunky)', fontWeight: 400 }}>{fmt(coins ?? 0)} goo</span></div>
          <div className="bx-pq" style={{ paddingTop: 20, position: 'relative', ...pqStyle }}>
            {children}
            <svg className="bx-anim-bounce" style={{ position: 'absolute', right: 8, bottom: -14, pointerEvents: 'none' }} width="72" height="72" viewBox="0 0 22 22" aria-hidden="true"><path d="M5 6 3 1l4 4M17 6l2-5-4 4" style={{ fill: 'var(--accent)', stroke: 'var(--frame)', strokeWidth: 0.5 }} /><path d="M2 22V12a9 9 0 0 1 18 0v10z" style={{ fill: 'var(--titlebar-end)', stroke: 'var(--frame)', strokeWidth: 0.6 }} /><circle cx="11" cy="11" r="4.2" style={{ fill: 'var(--on-answer)', stroke: 'var(--frame)', strokeWidth: 0.5 }} /><circle cx="12" cy="11.6" r="1.9" style={{ fill: 'var(--frame)' }} /></svg>
          </div>
        </>
      );
    case 'dollz':
      return (
        <>
          <svg className="bx-sparkle bx-anim-twinkle" style={{ right: 20, top: 14 }} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" style={{ stroke: 'var(--frame)', strokeWidth: 0.6 }} /></svg>
          <div className="bx-pq" style={pqStyle}><span className="dollz-display" style={{ color: 'var(--window-ink)' }}>Totally Fab Q{n}</span>{children}</div>
        </>
      );
    case 'bear':
      return (
        <>
          <div className="bx-chrome"><span className="bx-title">Build-a-Blunder Workshop</span><span aria-hidden="true">♥</span></div>
          <div className="bx-pq" style={pqStyle}>
            <div className="bx-steps" aria-label="Workshop steps"><span>Choose</span><span>Stuff</span><span className="is-on">Answer</span><span>Name</span><span>Adopt</span></div>
            {children}
          </div>
        </>
      );
    case 'myspaze':
      return (
        <>
          <div className="bx-chrome"><span className="bx-title">myspaze.com · a place for friends</span></div>
          <div className="bx-pq" style={pqStyle}>
            <div className="bx-ms-box" style={{ display: 'flex', gap: 10, padding: 8, alignItems: 'center' }}><Avatar i={0} /><span style={{ font: '700 14px/20px var(--font-ui)', color: 'var(--window-muted)' }}><b style={{ font: '700 20px/24px var(--font-comic)', color: 'var(--window-ink)' }}>~*AnNe*~</b><br />Mood: 24 n thriving <span className="bx-pill bx-pill--accent bx-anim-twinkle">ONLINE NOW!</span></span></div>
            {children}
            <div className="bx-ms-box bx-marquee" style={{ padding: '6px 0', font: '700 14px/20px var(--font-comic)', flex: 'none' }}><span>♫ now playing: autoplay at 100% volume ♫ you cannot pause this ♫</span></div>
          </div>
        </>
      );
    case 'brick':
      return <div className="bx-pq" style={{ gap: 12, ...pqStyle }}>{children}</div>;
    case 'bsod':
      return (
        <div className="bx-pq" style={{ gap: 12, ...pqStyle }}>
          <p style={{ textAlign: 'center' }}><span className="bx-bsod-tag">BDAY.EXE</span></p>
          {children}
          <p style={{ fontSize: 18, flex: 'none' }}>Press CTRL+ALT+DEL to cry<span className="bx-anim-blink">_</span></p>
        </div>
      );
    case 'insta':
      return (
        <>
          <div className="bx-ig-bar"><span aria-hidden="true">☰</span><span className="bx-ig-logo">Instagran</span>{bet != null && <span className="bx-pill bx-pill--accent">Bet {bet}</span>}</div>
          <div className="bx-pq" style={{ padding: 10, gap: 10, ...pqStyle }}>{children}</div>
        </>
      );
  }
}

/** The skin's card container (holds the question, the category, a waiting message, or a result). */
export function Card({ skin, n, title, children, style, className = '' }: {
  skin: SkinId; n?: number; title?: string; children: ReactNode; style?: React.CSSProperties; className?: string;
}) {
  switch (skin) {
    case 'xp':
      return (
        <section className={`bx-window ${className}`} style={{ flex: 'none', ...style }}>
          <div className="bx-titlebar"><span className="bx-title">{title ?? `Question_${n ?? ''}.exe`}</span><span className="bx-ctl" aria-hidden="true">_</span><span className="bx-ctl bx-ctl--close" aria-hidden="true">×</span></div>
          <div className="bx-body">{children}</div>
        </section>
      );
    case 'fakebook':
      return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', ...style }} className={className}>
          <Avatar i={0} />
          <div className="bx-bubble" style={{ flex: 1 }}><span className="bx-chat__who">Anne · 3 Oct 2009, 2:14am</span><br />{children}</div>
        </div>
      );
    case 'ie':
      return <div className={`bx-web ${className}`} style={{ flex: 'none', ...style }}>{children}</div>;
    case 'myspaze':
      return (
        <div className={`bx-ms-box ${className}`} style={style}>
          <h3>{title ?? "Anne's Friend Space"}</h3>
          <div style={{ padding: '10px 12px' }}>{children}</div>
        </div>
      );
    case 'brick':
      return <div className={`bx-lcd ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>{children}</div>;
    case 'bsod':
      return <div className={className} style={style}>{children}</div>;
    case 'insta':
      return (
        <article className={`bx-ig-post ${className}`} style={{ display: 'flex', flexDirection: 'column', ...style }}>
          <div className="bx-ig-head"><Avatar i={0} size="sm" />anne_lol_2011<small>2y</small></div>
          <div style={{ padding: '10px 12px' }}>{children}</div>
        </article>
      );
    default:
      return <div className={`bx-pq__card ${className}`} style={style}>{children}</div>;
  }
}

/** Question text in the skin's voice. */
export function QuestionText({ skin, prompt }: { skin: SkinId; prompt: string }) {
  if (skin === 'ie') return <h1 style={{ margin: 0 }}>{prompt}</h1>;
  if (skin === 'brick') return (
    <>
      <div style={{ borderTop: '3px solid currentColor', borderBottom: '3px solid currentColor', padding: '4px 0', font: '400 26px/28px var(--font-lcd)' }}>✉ 1 NEW MESSAGE</div>
      <p style={{ margin: 0, font: '400 28px/28px var(--font-lcd)' }}>{prompt.toUpperCase()}</p>
    </>
  );
  if (skin === 'bsod') return <p style={{ fontSize: 26, lineHeight: '28px' }}>{prompt}</p>;
  if (skin === 'myspaze') return <p className="bx-pq__text" style={{ font: '700 22px/28px var(--font-comic)' }}>{prompt}</p>;
  if (skin === 'fakebook') return <>{prompt}</>;
  if (skin === 'insta') return <p className="app-nomargin" style={{ font: '700 18px/24px var(--font-comic)' }}><b>anne_lol_2011</b> {prompt}</p>;
  return <p className="bx-pq__text" style={skin === 'bear' ? { fontSize: 22, lineHeight: '28px' } : undefined}>{prompt}</p>;
}

/** Meta row: question number, bet, modifier pill, seconds. */
export function Meta({ skin, view, left, typing }: { skin: SkinId; view: View; left: number | null; typing?: string | null }) {
  const bet = view.me?.bet;
  const urgent = left != null && left <= 5 && left > 0;
  const secs = left != null && <span className="bx-timer__secs" aria-hidden="true">{pad2(left)}</span>;
  const final = view.q === view.total;
  if (skin === 'brick') return null;
  if (skin === 'fakebook' || skin === 'ie') {
    return <div className={`bx-pq__meta ${urgent ? 'is-urgent' : ''}`} style={skin === 'ie' ? { padding: '8px 12px' } : undefined}>{typing ? <span className="bx-typing">{typing}</span> : view.modifier && <ModBadge m={view.modifier} sm />}{secs}</div>;
  }
  if (skin === 'bsod') {
    return <div className={`bx-pq__meta ${urgent ? 'is-urgent' : ''}`}>{bet != null && <Pill kind="fave">BET {bet} {view.modifier === 'trouble' ? '±2' : view.modifier === 'double' ? '×2' : ''}</Pill>}{secs}</div>;
  }
  return (
    <div className={`bx-pq__meta ${urgent ? 'is-urgent' : ''}`}>
      <Pill>Q{view.q}/{view.total}</Pill>
      {bet != null && skin !== 'insta' && <Pill kind="accent">Bet {bet}</Pill>}
      {view.modifier && <ModBadge m={view.modifier} sm final={final && false} />}
      {secs}
    </div>
  );
}

export function BrickSoftkeys({ view, left }: { view: View; left: number | null }) {
  return <div className="bx-softkeys"><span>▮▮▮▮▯ Tl</span><span>Q{view.q}/{view.total}</span><span>{left != null ? `${pad2(left)}s` : ''} ▮▮▯</span></div>;
}

// ---------------------------------------------------------------- inputs

export function McInput({ options, selected, onPick, chope, onChope, disabled, compact }: {
  options: string[]; selected: number | null; onPick: (i: number) => void; chope?: number | null; onChope?: () => void; disabled?: boolean; compact?: boolean;
}) {
  return (
    <div className={`bx-pq__answers ${compact ? 'app-tiles-compact' : ''}`}>
      {options.map((o, i) => (
        <AnswerTile key={i} k={KEYS[i] as Key} text={o} state={selected === i ? 'is-selected' : ''} badge={selected === i ? 'You' : undefined}
          onClick={() => onPick(i)} disabled={disabled} chope={chope === i} onChope={onChope} />
      ))}
    </div>
  );
}

export function CrowdGrid({ choices, selected, onPick, counts, winners, disabled }: {
  choices: Choice[]; selected: string | null; onPick?: (k: string) => void; counts?: Record<string, number>; winners?: string[]; disabled?: boolean;
}) {
  return (
    <div className={`bx-top8 ${choices.length > 12 ? 'app-top8-many' : ''}`} role="group" aria-label="Vote">
      {choices.map((c) => (
        <button key={c.key} aria-pressed={selected === c.key} className={winners?.includes(c.key) ? 'is-win' : ''} disabled={disabled || !onPick} onClick={() => onPick?.(c.key)}>
          {c.avatar != null ? <Avatar i={c.avatar} size={choices.length > 12 ? 'sm' : undefined} /> : null}
          <span>{c.label}</span>
          {counts && <span className="bx-answer__count">{counts[c.key] ?? 0}</span>}
        </button>
      ))}
    </div>
  );
}

/** A lying autocomplete: never a hint (DS TextAnswer). */
function trollSuggest(v: string): string[] {
  const s = v.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[^a-z0-9]/g, '');
  if (s.length < 2) return [];
  return [`http://www.${s}-is-a-band.com`, `http://www.${s}-or-busted.lol`, `http://www.${s.slice(0, -1)}-is-wrong.lol`];
}

export function TextInput({ skin, max, initial, onSubmit, label, cta }: {
  skin: SkinId; max: number; initial?: string; onSubmit: (v: string) => void; label: string; cta: string;
}) {
  const [v, setV] = useState(initial ?? '');
  const [focus, setFocus] = useState(false);
  const sug = useMemo(() => (skin === 'ie' && focus ? trollSuggest(v) : []), [skin, v, focus]);
  const submit = (e?: React.FormEvent) => { e?.preventDefault(); const t = v.trim(); if (t) onSubmit(t); };
  if (skin === 'insta') {
    return (
      <form className="bx-ig-compose" onSubmit={submit}>
        <input value={v} onChange={(e) => setV(e.target.value.slice(0, max))} placeholder="Add a comment…" aria-label={label} maxLength={max} enterKeyHint="send" />
        <button className="bx-btn bx-btn--primary" disabled={!v.trim()}>Post</button>
      </form>
    );
  }
  if (skin === 'ie') {
    return (
      <form className="bx-address" onSubmit={submit} style={{ flex: 'none' }}>
        <label className="bx-address__label" htmlFor="addr">Address</label>
        <div className="bx-address__field">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" style={{ fill: 'var(--highlight)' }} /><path d="M2 12h20M12 2c4 4 4 16 0 20M12 2c-4 4-4 16 0 20" style={{ fill: 'none', stroke: 'var(--on-highlight)', strokeWidth: 1.5 }} /></svg>
          <input id="addr" value={v} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} onChange={(e) => setV(e.target.value.slice(0, max))}
            autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="http://www.your-answer.com" aria-label={label} maxLength={max} enterKeyHint="go" />
          {sug.length > 0 && (
            <ul className="bx-suggest" role="listbox">{sug.map((s, i) => <li key={s} role="option" aria-selected={i === 0}>{s}</li>)}</ul>
          )}
        </div>
        <button className="bx-btn bx-btn--primary" disabled={!v.trim()}>{cta}</button>
      </form>
    );
  }
  return (
    <form className="bx-pq__card bx-stack" style={{ gap: 8, flex: 'none' }} onSubmit={submit}>
      <label className="caption app-muted" htmlFor="ans">{label}</label>
      <div className="bx-address__field" style={{ flex: 'none' }}><input id="ans" value={v} onChange={(e) => setV(e.target.value.slice(0, max))} maxLength={max} enterKeyHint="send" /></div>
      <span className="caption app-muted" style={{ textAlign: 'right' }}>{v.length}/{max}</span>
      <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" disabled={!v.trim()}>{cta}</button>
    </form>
  );
}

const T9: [string, string][] = [['1', '.,?!'], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', 'clear'], ['0', '␣'], ['#', 'send']];

export function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="bx-keypad">
      {T9.map(([k, sub]) => (
        <button key={k} className={`bx-key ${k === '#' ? 'bx-key--go' : ''}`} onClick={() => onKey(k)} aria-label={k === '*' ? 'Clear' : k === '#' ? 'Send' : k}>
          {k}<small>{sub}</small>
        </button>
      ))}
    </div>
  );
}

export function NumberEntry({ skin, initial, onSubmit, view, left, prompt, overlay }: {
  skin: SkinId; initial?: number | null; onSubmit: (n: number) => void; view: View; left: number | null; prompt: string; overlay?: ReactNode;
}) {
  const [v, setV] = useState(initial != null ? String(initial) : '');
  useEffect(() => { if (initial != null) setV(String(initial)); }, [initial]);
  const key = (k: string) => {
    if (k === '*') setV((x) => x.slice(0, -1));
    else if (k === '#') { if (v) onSubmit(Number(v)); }
    else setV((x) => (x.length >= 9 ? x : (x === '0' ? k : x + k)));
  };
  const lcd = (
    <div className="bx-lcd" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
      <BrickSoftkeys view={view} left={left} />
      <QuestionText skin="brick" prompt={prompt} />
      <small style={{ font: '400 18px/20px var(--font-lcd)' }}>From: Bday Girl · Bet {view.me?.bet ?? '–'} · CLOSEST WINS</small>
      <p style={{ margin: 'auto 0 0', font: '400 46px/46px var(--font-lcd)' }} aria-live="polite">{v || ' '}<span className="bx-anim-blink">_</span></p>
      <div className="bx-softkeys"><span>Send = #</span><span>Clear = *</span></div>
    </div>
  );
  if (skin === 'brick') return <><div className="bx-chaos-zone" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{lcd}{overlay}</div><Keypad onKey={key} /></>;
  return (
    <div className="bx-pq__card bx-stack" style={{ gap: 8 }}>
      <div className="bx-address__field"><input className="app-num-input" inputMode="numeric" pattern="[0-9]*" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 9))} aria-label="Your guess" /></div>
      <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" disabled={!v} onClick={() => onSubmit(Number(v))}>Send guess</button>
    </div>
  );
}

/** Flavour text per skin for right / wrong reveals (DS skin specs). */
export const REVEAL_COPY: Record<SkinId, { right: string; wrong: string; rightLine: string; wrongLine: string }> = {
  xp: { right: '✓ CORRECT', wrong: '✗ ILLEGAL OPERATION', rightLine: 'File copied successfully.', wrongLine: 'Moved to Wrong Answers.' },
  igloo: { right: '✓ CORRECT', wrong: '✗ FROZEN', rightLine: 'Coins added to your igloo.', wrongLine: 'Your answer froze solid.' },
  fakebook: { right: '✓ CORRECT', wrong: '✗ UNFRIENDED', rightLine: '12 people like this.', wrongLine: 'Nobody liked this.' },
  ie: { right: '✓ CORRECT', wrong: '✗ 404 NOT FOUND', rightLine: 'Bookmarked.', wrongLine: 'The page cannot be displayed.' },
  monster: { right: '✓ CORRECT', wrong: '✗ GLOOP ATE IT', rightLine: 'Gloop approves. Goo added.', wrongLine: 'Gloop ate your answer. Nom.' },
  dollz: { right: '★ CROWNED', wrong: '✗ NOT THIS SEASON', rightLine: 'Totally fab.', wrongLine: 'Back to the closet.' },
  bear: { right: '✓ CORRECT', wrong: '✗ RETURNED TO SHELF', rightLine: 'Your plush gets a birth certificate.', wrongLine: 'Your chip is gone. It had a family.' },
  myspaze: { right: '✓ TOP 8', wrong: '✗ NOT IN THE TOP 8', rightLine: 'thanks 4 the add!!', wrongLine: 'pc4pc?' },
  brick: { right: '✓ MESSAGE SENT', wrong: '✗ DELIVERY FAILED', rightLine: 'Closest guess. Sent.', wrongLine: 'Message not delivered.' },
  bsod: { right: '✓ CORRECT', wrong: '✗ FATAL ERROR', rightLine: 'Rebooting… with points.', wrongLine: 'Rebooting… without points.' },
  insta: { right: '♥ LIKED', wrong: '✗ NO LIKES', rightLine: 'anne_lol_2011 liked your comment.', wrongLine: 'Filter: Lo-Fi Regret.' },
};

export { Sparkle };
