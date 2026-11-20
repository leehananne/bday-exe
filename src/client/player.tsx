// Player app: join → lobby → (modifier → bet → answer → waiting → reveal → leaderboard) × 10 → podium.
import { useEffect, useMemo, useRef, useState } from 'react';
import { TIMING } from '../shared/game';
import { MOD_META } from '../shared/modifiers';
import { LIMITS } from '../shared/questions';
import type { ChaosEvent, ModifierId, SkinId } from '../shared/types';
import type { View } from '../shared/views';
import { createPortal } from 'react-dom';
import { ChaosOverlay, usePhoneHost } from './chaos';
import {
  AnswerTile, Avatar, AVATAR_NAMES, Chips, Confetti, ErrorIcon, fmt, Heat, Hourglass, KEYS, ModBadge, Pill, Progress,
  ReactionBar, ReactStage, Rain, signed, Spotlight, StartLogo, Timer, TimerAnnouncer, useShake, Window, type Float, type Key,
} from './ds';
import { secondsLeft, useNow, useRoom, useWakeLock, type Room, type RoomState } from './net';
import {
  BrickSoftkeys, Card, CrowdGrid, McInput, Meta, NumberEntry, Phone, QuestionText, REVEAL_COPY, SkinShell, TextInput,
} from './skins';
import { play, setSound, soundOn, vibrate } from './sound';
import { SKINS } from '../shared/questions';

const HELLO = { role: 'player' as const };

export function PlayerApp({ pin }: { pin: string }) {
  const [st, room] = useRoom(pin, HELLO);
  const [shake, doShake] = useShake();
  const [toast, setToast] = useState<string | null>(null);
  const [poke, setPoke] = useState<string | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const fid = useRef(0);
  const v = st.view;

  useEffect(() => {
    if (!room) return;
    return room.on((m) => {
      if (m.t === 'nudge') {
        doShake(); vibrate(300); play('nudge');
        setToast(`${m.from} sent you a Nudge!`); setPoke(m.from);
      }
      if (m.t === 'reacts') {
        const w = Math.min(window.innerWidth, 430);
        setFloats((f) => [...f.slice(-24), ...m.items.map((it) => ({ id: ++fid.current, ...it, left: 12 + ((fid.current * 97) % Math.max(40, w - 180)) }))]);
      }
    });
  }, [room]);
  useEffect(() => {
    if (!floats.length) return;
    const t = setTimeout(() => setFloats((f) => f.slice(1)), 2500);
    return () => clearTimeout(t);
  }, [floats]);
  useEffect(() => { if (st.error && st.error.code !== 'join') setToast(st.error.msg); }, [st.error]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  // sound cues on phase changes
  const phaseKey = v ? `${v.q}:${v.phase}:${v.reveal?.stepName ?? ''}` : '';
  useEffect(() => {
    if (!v) return;
    if (v.phase === 'MODIFIER' && v.question?.skin === 'bsod') play('crash');
    else if (v.phase === 'REVEAL' && v.reveal?.stepName === 'answer') play('reveal');
    else if (v.phase === 'REVEAL' && v.reveal?.stepName === 'points' && v.me?.result) play(v.me.result.delta > 0 ? 'right' : 'wrong');
  }, [phaseKey]);

  useWakeLock(!!v && v.phase !== 'LOBBY' && v.phase !== 'PODIUM');

  const overlay = (
    <>
      {st.status === 'closed' && <div className="app-banner" role="status">Reconnecting…</div>}
      {v?.paused && <div className="app-banner" role="status">⏸ Paused by the host</div>}
      {toast && <Toast msg={toast} />}
    </>
  );

  if (st.closed) return <Phone><div className="bx-phone__main app-center"><Dialog title="BDAY.EXE" body={<><p><b>The host has closed this party.</b></p><p>It is now safe to put your phone down.</p></>} /></div></Phone>;
  if (st.kicked) return <Phone><div className="bx-phone__main app-center"><Dialog title="BDAY.EXE" body={<><p><b>You have been removed from the party.</b></p><p>Contact your administrator (Anne).</p></>} /></div></Phone>;
  if (!room || (!v && !st.needJoin)) return <Boot status={st.status} error={st.error?.msg} />;
  if (st.needJoin) return <Join pin={pin} room={room} st={st} />;
  if (!v || !v.me) return <Boot status={st.status} />;

  return <Game v={v} room={room} shake={shake} floats={floats} poke={poke} overlay={overlay} />;
}

/** Static render of the game screens from a given view (dev preview + tests). */
export function PlayerPreview({ view }: { view: View }) {
  const fake = { act: () => {}, on: () => () => {}, raw: () => {} } as unknown as Room;
  return <Game v={view} room={fake} shake={false} floats={[]} poke={null} overlay={null} />;
}

function Toast({ msg }: { msg: string }) {
  return <div className="app-toast" role="status"><Window title="BDAY.EXE" className="bx-anim-pop" data-theme="xp"><div className="bx-body"><p className="phone-body app-nomargin">{msg}</p></div></Window></div>;
}

/** "Illegal operation" troll dialog after a wrong answer: the top layer, with the screen dimmed behind it. */
function WrongModal({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const host = usePhoneHost();
  useEffect(() => { const t = setTimeout(() => setOpen(true), 700); return () => clearTimeout(t); }, []); // let the +0 land first
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);
  if (!open || !host) return null;
  return createPortal(
    <div className="app-modal" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section className="bx-window bx-dialog bx-anim-pop" data-theme="xp" role="alertdialog" aria-modal="true" aria-label={`${name}.exe`}>
        <div className="bx-titlebar"><span className="bx-title">{name}.exe</span><button className="bx-ctl bx-ctl--close" aria-label="Close" onClick={() => setOpen(false)}>×</button></div>
        <div className="bx-dialog__body"><ErrorIcon size={32} /><div><p><b>Your answer has performed an illegal operation and will be shut down.</b></p><p>If the problem persists, study harder.</p></div></div>
        <div className="bx-dialog__actions"><button className="bx-btn bx-btn--primary" autoFocus onClick={() => setOpen(false)}>OK :(</button></div>
      </section>
    </div>,
    host,
  );
}

function Dialog({ title, body, actions }: { title: string; body: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="bx-window bx-dialog bx-anim-pop" data-theme="xp" role="alertdialog" aria-label={title}>
      <div className="bx-titlebar"><span className="bx-title">{title}</span></div>
      <div className="bx-dialog__body"><ErrorIcon size={32} /><div>{body}</div></div>
      {actions && <div className="bx-dialog__actions">{actions}</div>}
    </section>
  );
}

function Boot({ status, error }: { status: string; error?: string }) {
  return (
    <Phone>
      <div className="bx-phone__main app-center">
        <Window title="BDAY.EXE">
          <div className="bx-body bx-stack app-center-text">
            <Hourglass />
            <p className="phone-body app-nomargin">{error ?? (status === 'closed' ? 'Dialling up… (the Wi-Fi is thinking)' : 'Starting BDAY.EXE')}<span className="bx-anim-blink">_</span></p>
          </div>
        </Window>
      </div>
    </Phone>
  );
}

// ---------------------------------------------------------------- join

function Join({ pin, room, st }: { pin: string; room: Room; st: RoomState }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(() => Math.floor(Math.random() * 8));
  const nj = st.needJoin!;
  const err = st.error?.code === 'join' ? st.error.msg : null;
  if (!nj.exists || !nj.open) {
    return (
      <Phone><div className="bx-phone__main app-center">
        <Dialog title={`Room ${pin}`} body={<>
          <p><b>{nj.reason}</b></p>
          {!nj.exists && <p className="caption app-nomargin">Waiting for the room to open<span className="bx-anim-blink">_</span> This page joins by itself.</p>}
          {!nj.exists && <p className="caption app-nomargin" style={{ marginTop: 8 }}>Hosting? Open <a href="/host">/host</a> to create room {pin}.</p>}
        </>} actions={nj.exists ? <button className="bx-btn bx-btn--primary" onClick={() => location.reload()}>Try again</button> : undefined} />
      </div></Phone>
    );
  }
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (name.trim()) { room.clearError(); room.join(name.trim(), avatar); play('join'); } };
  return (
    <Phone>
      <div className="bx-phone__status"><span>BDAY.EXE</span><span>{location.host}/{pin}</span></div>
      <div className="bx-phone__main app-center app-scroll">
        <Window title="Log On to BDAY.EXE">
          <form className="bx-body bx-stack" onSubmit={submit}>
            <label className="caption app-muted" htmlFor="pin">Room PIN</label>
            <div className="bx-address__field"><input id="pin" value={pin} readOnly /></div>
            <label className="caption app-muted" htmlFor="nick">Screen name (be iconic)</label>
            <div className="bx-address__field"><input id="nick" value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.name} autoComplete="nickname" placeholder="xX_y0ur_n4me_Xx" enterKeyHint="go" /></div>
            <p className="caption app-muted app-nomargin" id="av-l">Pick a buddy icon</p>
            <div className="app-avatars" role="radiogroup" aria-labelledby="av-l">
              {AVATAR_NAMES.map((n, i) => (
                <button type="button" key={n} role="radio" aria-checked={avatar === i} aria-label={n} onClick={() => setAvatar(i)}><Avatar i={i} /></button>
              ))}
            </div>
            {err && <p className="bx-warn app-nomargin" role="alert">{err}</p>}
            <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" disabled={!name.trim()}>Log On →</button>
          </form>
        </Window>
      </div>
    </Phone>
  );
}

// ---------------------------------------------------------------- game router

interface GP { v: View; room: Room; shake: boolean; floats: Float[]; poke: string | null; overlay: React.ReactNode }

function Game(p: GP) {
  const { v } = p;
  const skin: SkinId = v.phase === 'LOBBY' || v.phase === 'LEADERBOARD' || v.phase === 'PODIUM' ? 'xp' : v.question?.skin ?? 'xp';
  let body: React.ReactNode;
  switch (v.phase) {
    case 'LOBBY': body = <Lobby {...p} />; break;
    case 'MODIFIER': body = <ModifierScreen {...p} />; break;
    case 'BET': body = <Bet {...p} />; break;
    case 'ANSWER': body = <AnswerScreen {...p} />; break;
    case 'JUDGE': body = <Judging {...p} />; break;
    case 'REVEAL': body = <Reveal {...p} />; break;
    case 'LEADERBOARD': body = <Board v={v} />; break;
    case 'PODIUM': body = <Podium v={v} />; break;
  }
  const hype = v.question?.hype && (v.phase === 'MODIFIER' || v.phase === 'BET' || v.phase === 'ANSWER') ? v.question.hype : null;
  return <Phone skin={skin} calm={v.calm} shake={p.shake}>{body}{v.me?.rain && <Rain />}{hype && <Hype text={hype} v={v} />}{p.overlay}</Phone>;
}

/** Hype questions: confetti falls through MODIFIER → BET → ANSWER; the banner shows while the modifier
 *  installs and for the first 3s of answering. Tap-through, so it never blocks the question. */
function Hype({ text, v }: { text: string; v: View }) {
  const now = useNow();
  const left = secondsLeft(v, now);
  const banner = v.phase === 'ANSWER' && v.question && left > v.question.seconds - 3;
  return (
    <div className="app-hype-layer" aria-hidden={!banner}>
      <Confetti />
      {banner && <div className="app-hype bx-anim-pop" role="status">{text}</div>}
    </div>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(soundOn());
  return <button className="bx-btn app-mini" aria-pressed={on} onClick={() => { setSound(!on); setOn(!on); }} aria-label={on ? 'Sound on' : 'Sound off'}>{on ? '🔊' : '🔇'}</button>;
}

function Lobby({ v, room, floats }: GP) {
  const me = v.me!;
  return (
    <>
      <div className="bx-phone__main app-scroll">
        <Window title="You're in!">
          <div className="bx-body bx-stack app-center-text">
            <Avatar i={me.avatar} size="lg" /><b className="phone-title">{me.name}</b>
            <Hourglass />
            <p className="phone-body app-nomargin">Please wait while BDAY.EXE configures your fun<span className="bx-anim-blink">_</span></p>
          </div>
        </Window>
        <Window title={`Buddies — ${v.players.length} online`}>
          <div className="bx-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {v.players.map((pl) => <span key={pl.id} title={pl.name} style={{ opacity: pl.online ? 1 : 0.5 }}><Avatar i={pl.avatar} size="sm" /></span>)}
          </div>
        </Window>
        <Window>
          <div className="bx-body bx-stack"><p className="caption app-muted app-nomargin">Heckle while you wait</p><ReactionBar onReact={(e) => room.act({ t: 'react', e })} /></div>
        </Window>
        <ReactStage floats={floats} style={{ minHeight: 120, flex: 1 }} />
      </div>
      <div className="bx-taskbar">
        <span className="bx-btn bx-btn--start" style={{ fontSize: 18 }}><StartLogo />start</span>
        <span className="bx-task is-current">Lobby</span>
        <div className="bx-tray"><SoundToggle /><span className="bx-clock">{v.pin}</span></div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- modifier

/** The Spotlight's one-line rule per modifier (DS › PlayerModifier). */
const modLine = (m: ModifierId, q: number, final: boolean): string => ({
  normal: 'Right answers win your bet. Wrong answers cost nothing.',
  double: 'Right answers score DOUBLE. No downside. Bet big.',
  risky: 'Wrong answers now cost you your bet. Only bet big if you\'re sure.',
  trouble: final ? 'Everything on the line. Wrong answers cost you DOUBLE.' : `Q${q} is spicy. Wrong answers cost you DOUBLE your bet.`,
  mystery: 'The rule is a secret until answers lock. It could be bad.',
}[m]);

/** Modifier phase: the bet screen is already underneath (chips locked), and the modifier gets the Spotlight.
 *  The bet timer starts only after it flies up (the server's MODIFIER phase is the Spotlight's 3.7s). */
function ModifierScreen(p: GP) {
  const { v } = p;
  const m = v.modifier ?? 'normal';
  const final = v.q === v.total;
  return (
    <>
      <Bet {...p} preview />
      <Spotlight key={v.q} drum={final ? '★ FINAL ROUND ★' : '★ THIS ROUND IS… ★'} rule={modLine(m, v.q, final)} extra={<div style={{ width: '100%' }}><Heat heat={v.heat} total={v.total} /></div>}>
        <ModBadge m={m} />
      </Spotlight>
    </>
  );
}

// ---------------------------------------------------------------- bet

function Bet(p: GP & { preview?: boolean }) {
  const { v, room, preview } = p;
  const now = useNow();
  const left = preview ? 10 : secondsLeft(v, now); // during the Spotlight the bet timer hasn't started
  const me = v.me!;
  const q = v.question!;
  const [locked, setLocked] = useState(false);
  const [sheet, setSheet] = useState<null | 'nudge' | 'popup'>(null);
  const [pick, setPick] = useState<number | null>(null);
  useEffect(() => { setLocked(false); setPick(null); }, [v.q]);
  const bet = pick ?? me.bet; // optimistic: show the tapped chip before the server echoes it
  const final = v.q === v.total;
  if (locked && bet != null) {
    const line = bet >= 800 ? 'Bold.' : bet <= 200 ? 'Cautious. Respect.' : 'Locked.';
    return (
      <SkinShell skin={q.skin} view={v} pqStyle={{ justifyContent: 'center' }} coins={me.score}>
        <Card skin={q.skin} n={v.q} title="Bet locked" className="bx-anim-pop" style={{ textAlign: 'center' }}>
          <div className="bx-stack app-center-text">
            <p className="caption app-nomargin" style={{ color: 'inherit', opacity: 0.8 }}>Bet locked · {left}s to change</p>
            <span className="app-big">{bet}</span>
            <p className="phone-body app-nomargin">{line} Question in {Math.max(0, left)}…</p>
            <p className="caption app-nomargin" style={{ opacity: 0.8 }}>Chips left: {me.chips.filter((c) => c !== bet).join(' · ') || 'none. All in.'}</p>
            <button className="bx-btn" onClick={() => setLocked(false)}>Change bet</button>
          </div>
        </Card>
        <PowerUps v={v} room={room} sheet={sheet} setSheet={setSheet} />
      </SkinShell>
    );
  }
  return (
    <SkinShell skin={q.skin} view={v} coins={me.score}>
      {q.skin !== 'bsod' && <Meta skin={q.skin} view={v} left={left} />}
      <Card skin={q.skin} n={v.q} title={`Place your bet — Q${v.q} of ${v.total}`}>
        <div className="bx-stack">
          <div>
            <p className="caption app-nomargin" style={{ opacity: 0.8 }}>{final ? 'FINAL QUESTION' : `Q${v.q} incoming…`} Category</p>
            <p className="phone-question app-nomargin">{q.category}</p>
          </div>
          {q.skin === 'bsod' && v.modifier && <p>* {MOD_META[v.modifier].name}: {MOD_META[v.modifier].rule}</p>}
          <Timer left={left} total={10} big />
          <Chips available={me.chips} selected={bet} modifier={v.modifier} disabled={preview} onPick={(c) => { setPick(c); room.act({ t: 'bet', chip: c }); play('lock'); }} />
          {bet != null && v.modifier && v.modifier !== 'mystery' && (
            <p className="caption app-nomargin" style={{ opacity: 0.85 }}>Your pot {fmt(me.score)} · if wrong with {bet}: {fmt(me.score + (v.modifier === 'risky' ? -bet : v.modifier === 'trouble' ? -2 * bet : 0))}</p>
          )}
          <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" disabled={bet == null} onClick={() => setLocked(true)}>{bet == null ? 'Pick a chip' : `Lock in ${bet}`}</button>
          <p className="caption app-nomargin" style={{ opacity: 0.8 }}>No pick in 10s? You get your smallest chip. Coward's tax.</p>
        </div>
      </Card>
    </SkinShell>
  );
}

function PowerUps({ v, room, sheet, setSheet }: { v: View; room: Room; sheet: null | 'nudge' | 'popup'; setSheet: (s: null | 'nudge' | 'popup') => void }) {
  const me = v.me!;
  if (!v.powerups) return null;
  const others = v.players.filter((p) => p.id !== me.id);
  return (
    <>
      <div className="app-row" style={{ justifyContent: 'center', flex: 'none' }}>
        <button className="bx-btn" disabled={!me.power.nudge} onClick={() => setSheet('nudge')}>👉 Nudge ({me.power.nudge})</button>
        {(v.phase === 'BET' || v.phase === 'ANSWER') && <button className="bx-btn" disabled={!me.power.popup} onClick={() => setSheet('popup')}>📢 Pop-up ad ({me.power.popup})</button>}
      </div>
      {sheet && (
        <div className="app-sheet" data-theme="xp">
          <Window title={sheet === 'nudge' ? 'Nudge who?' : 'Send a pop-up ad to…'} close={() => setSheet(null)} style={{ maxHeight: '100%' }}>
            <ul className="bx-buddies">
              {others.map((o) => (
                <li key={o.id} className="bx-buddy">
                  <Avatar i={o.avatar} size="sm" /><span className="bx-buddy__name">{o.name}</span>
                  <button className="bx-btn app-mini" style={{ marginLeft: 'auto' }} onClick={() => { room.act({ t: sheet, to: o.id }); setSheet(null); }}>{sheet === 'nudge' ? '👉' : '📢'} Send</button>
                </li>
              ))}
            </ul>
          </Window>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- answer

function answerLabel(v: View, a: unknown): string {
  const q = v.question!;
  if (a == null) return '';
  if (q.type === 'mc') return q.options?.[Number(a)] ?? '';
  if (q.type === 'crowd') return q.choices?.find((c) => c.key === a)?.label ?? '';
  return String(a);
}

/** A real player's name for the jokes (never a hard-coded one): someone other than me, fixed per question. */
function pickName(v: View, salt: string): string {
  const others = v.players.filter((p) => p.id !== v.me?.id);
  if (!others.length) return v.me?.name ?? 'Anne';
  let h = 0;
  for (const c of `${salt}:${v.q}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return others[h % others.length].name;
}

function useChaos(v: View, room: Room) {
  const [gone, setGone] = useState<Set<string>>(new Set());
  const ev = v.me?.chaos && !gone.has(v.me.chaos.id) ? v.me.chaos : null;
  const chope = v.me?.chope && !gone.has(v.me.chope.id) ? v.me.chope : null;
  const dismiss = (e: ChaosEvent) => { setGone((g) => new Set(g).add(e.id)); room.act({ t: 'dismiss', id: e.id, ms: Date.now() - (e.at ?? Date.now()) }); };
  const clearChope = () => { if (chope) { setGone((g) => new Set(g).add(chope.id)); room.act({ t: 'chopeClear', id: chope.id }); } };
  const sender = ev?.from ? v.players.find((p) => p.id === ev.from)?.name : undefined;
  return { overlay: ev ? <ChaosOverlay ev={ev} onClose={dismiss} victim={pickName(v, 'victim')} sender={sender} /> : null, chopeTile: chope?.data?.tile ?? null, clearChope };
}

function AnswerScreen(p: GP) {
  const { v, room } = p;
  const now = useNow();
  const left = secondsLeft(v, now);
  const me = v.me!;
  const q = v.question!;
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<null | 'nudge' | 'popup'>(null);
  useEffect(() => setEditing(false), [v.q]);
  const { overlay, chopeTile, clearChope } = useChaos(v, room);
  const send = (val: number | string) => { room.act({ t: 'answer', v: val }); setEditing(false); play('lock'); };
  const thinking = v.players.filter((pl) => !v.lockedIn.includes(pl.id) && pl.id !== me.id);
  const typing = thinking.length ? `${thinking[(v.q * 7) % thinking.length].name} is typing…` : 'Everyone is in.';
  const ann = <TimerAnnouncer left={left} active />;

  if (me.bet == null) {
    return <SkinShell skin={q.skin} view={v} pqStyle={{ justifyContent: 'center' }}><Card skin={q.skin} title="Please wait"><p className="phone-body app-nomargin">You joined mid-question. You're in from the next one. Heckle freely.</p></Card><ReactionBar onReact={(e) => room.act({ t: 'react', e })} /></SkinShell>;
  }

  // Waiting after lock-in (DS PlayerWaiting): reactions float, buddies still thinking, change answer.
  if (me.answer != null && !editing) {
    return (
      <SkinShell skin={q.skin} view={v} coins={me.score} poke={p.poke}>
        {ann}
        {q.skin === 'brick' ? <div className="bx-lcd"><BrickSoftkeys view={v} left={left} /></div> : <Meta skin={q.skin} view={v} left={left} typing={q.skin === 'fakebook' ? typing : undefined} />}
        <div className="bx-chaos-zone app-zone">
          <Card skin={q.skin} n={v.q} title="Locked in" style={{ textAlign: 'center' }}>
            <div className="bx-stack app-center-text">
              <Avatar i={me.avatar} size="lg" />
              <b className="phone-title" style={{ overflowWrap: 'anywhere' }}>Locked in: {answerLabel(v, me.answer)}</b>
              <p className="caption app-nomargin" style={{ opacity: 0.85 }}>{left > 0 ? `You can still change it for ${left}s.` : 'Time is up.'}</p>
            </div>
          </Card>
          {overlay}
        </div>
        {left > 0 && <button className="bx-btn" style={{ flex: 'none' }} onClick={() => setEditing(true)}>Change answer</button>}
        <StillThinking v={v} room={room} left={left} />
        <ReactStage floats={p.floats} style={{ flex: '1 1 0', minHeight: 0 }} />
        <ReactionBar onReact={(e) => room.act({ t: 'react', e })} only={5} />
      </SkinShell>
    );
  }

  let input: React.ReactNode = null;
  switch (q.type) {
    case 'mc':
      input = <McInput options={q.options ?? []} selected={me.answer as number | null} onPick={send} chope={chopeTile} onChope={clearChope} compact={q.skin === 'xp'} />;
      break;
    case 'crowd':
      input = <CrowdGrid choices={q.choices ?? []} selected={me.answer as string | null} onPick={send} />;
      break;
    case 'typed':
      input = <TextInput skin={q.skin} max={LIMITS.typed} initial={me.answer as string | undefined} label="Your answer" cta={q.skin === 'ie' ? 'Go' : 'Send'} onSubmit={send} />;
      break;
    case 'fave':
      input = <TextInput skin={q.skin} max={LIMITS.fave} initial={me.answer as string | undefined} label="Your answer (anonymous until crowned)" cta={q.skin === 'dollz' ? 'Send to the runway ♥' : 'Send'} onSubmit={send} />;
      break;
    case 'number':
      input = <NumberEntry skin={q.skin} initial={me.answer as number | null} onSubmit={send} view={v} left={left} prompt={q.prompt ?? ''} />;
      break;
  }

  const lockedNote = me.answer != null && (q.type === 'mc' || q.type === 'crowd')
    ? <p className="caption app-nomargin" style={{ textAlign: 'center', color: 'var(--window-ink)', flex: 'none' }}>✓ Locked in. Tap another to change. {v.lockedIn.length}/{v.players.length} in.</p>
    : null;

  // Brick: the LCD is the card; the keypad is the input.
  if (q.skin === 'brick' && q.type === 'number') {
    return <SkinShell skin="brick" view={v}>{ann}<NumberEntry skin="brick" initial={me.answer as number | null} onSubmit={send} view={v} left={left} prompt={q.prompt ?? ''} overlay={overlay} /></SkinShell>;
  }

  const card = (
    <div className="bx-chaos-zone app-zone">
      <Card skin={q.skin} n={v.q} title={`Question_${v.q}.exe — ${q.category}`}>
        {q.skin === 'brick' ? <BrickSoftkeys view={v} left={left} /> : null}
        <QuestionText skin={q.skin} prompt={q.prompt ?? ''} typed={q.type === 'typed'} />
        {q.type === 'fave' && <p className="caption app-nomargin" style={{ marginTop: 8, opacity: 0.85 }}>No right answer. Anne crowns her fave; +lol for anything that makes her cry-laugh.</p>}
      </Card>
      {overlay}
    </div>
  );
  const ieTimer = q.skin === 'ie' ? <div className="bx-web" style={{ paddingTop: 0, flex: 'none' }}><Timer left={left} total={q.seconds} big label={`${thinking.length} friends are typing`} /></div> : null;

  return (
    <SkinShell skin={q.skin} view={v} coins={me.score} poke={p.poke}>
      {ann}
      {q.skin !== 'ie' && <Meta skin={q.skin} view={v} left={left} typing={q.skin === 'fakebook' ? typing : undefined} />}
      {q.skin === 'ie' && q.type === 'typed' && input}
      {q.skin === 'myspaze'
        ? <><div className="bx-chaos-zone app-zone"><div className="bx-ms-box"><h3>Anne's Friend Space · {q.category}</h3><div style={{ padding: '10px 12px' }}><QuestionText skin="myspaze" prompt={q.prompt ?? ''} /></div></div>{overlay}</div><div className="bx-ms-box app-answers-box">{input}</div></>
        : card}
      {ieTimer}
      {q.skin === 'ie' && q.type !== 'typed' && <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>{input}</div>}
      {q.skin !== 'ie' && q.skin !== 'myspaze' && input}
      {lockedNote}
      {q.skin === 'xp' && q.type === 'mc' && <div style={{ display: 'flex', gap: 16, flex: 'none' }}><div className="bx-desk-icon"><svg width="28" height="28" viewBox="0 0 8 8" aria-hidden="true"><rect x="1" y="1" width="6" height="1" style={{ fill: 'var(--bevel-dark)' }} /><path d="M1.5 2h5l-.6 6H2.1z" style={{ fill: 'var(--button)' }} /></svg><span>Wrong Answers ({Math.max(0, q.seconds - left)})</span></div></div>}
      {q.skin === 'myspaze' && <div className="bx-ms-box" style={{ padding: '8px 12px', font: '700 14px/20px var(--font-comic)', flex: 'none' }}><a href="#" onClick={(e) => e.preventDefault()}>{thinking[0]?.name ?? pickName(v, 'pc4pc')}</a>: thanks 4 the add!!! pc4pc?</div>}
      {q.type === 'fave' && v.powerups && me.power.nudge > 0 && left > 5 && <div className="bx-pq__foot"><ReactionBar onReact={(e) => room.act({ t: 'react', e })} only={3} /><button className="bx-btn" onClick={() => setSheet('nudge')}>👉 Nudge</button></div>}
      {sheet && <PowerUps v={v} room={room} sheet={sheet} setSheet={setSheet} />}
    </SkinShell>
  );
}

function StillThinking({ v, room, left }: { v: View; room: Room; left: number }) {
  const me = v.me!;
  const thinking = v.players.filter((pl) => !v.lockedIn.includes(pl.id) && pl.id !== me.id);
  if (!thinking.length) return null;
  const canNudge = v.powerups && me.power.nudge > 0 && left > 5;
  return (
    <div className="bx-pq__card app-scroll" style={{ padding: 0, flex: '0 1 auto', minHeight: 44, maxHeight: 170 }}>
      <div className="bx-group-head">Still thinking ({thinking.length})</div>
      <ul className="bx-buddies">
        {thinking.slice(0, 6).map((pl, i) => (
          <li key={pl.id} className={`bx-buddy ${i === 0 ? 'bx-anim-wobble' : ''} ${pl.online ? '' : 'is-away'}`}>
            <Avatar i={pl.avatar} size="sm" /><span><span className="bx-buddy__name">{pl.name}</span> <span className="bx-buddy__status">{pl.online ? '(Not Responding)' : 'Reconnecting…'}</span></span>
            {canNudge && <button className="bx-btn app-mini" style={{ marginLeft: 'auto' }} onClick={() => room.act({ t: 'nudge', to: pl.id })}>👉 Nudge</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- judging (host is busy)

function Judging(p: GP) {
  const { v, room } = p;
  const q = v.question!;
  const line = q.type === 'fave' ? 'Anne is picking her fave. Bribes are not accepted (they are).' : q.type === 'number' ? `Anne is checking her phone. No peeking, ${pickName(v, 'peek')}.` : 'Anne is judging your spelling. She is very petty.';
  return (
    <SkinShell skin={q.skin} view={v} coins={v.me?.score} poke={p.poke}>
      <Card skin={q.skin} n={v.q} title="Please wait…" style={{ textAlign: 'center' }}>
        <div className="bx-stack app-center-text">
          <Hourglass />
          <p className="phone-body app-nomargin">{line}<span className="bx-anim-blink">_</span></p>
          {v.me?.answer != null && <p className="caption app-nomargin" style={{ opacity: 0.85 }}>You said: {answerLabel(v, v.me.answer)}</p>}
        </div>
      </Card>
      <ReactStage floats={p.floats} style={{ flex: '1 1 0', minHeight: 0 }} />
      <ReactionBar onReact={(e) => room.act({ t: 'react', e })} />
    </SkinShell>
  );
}

// ---------------------------------------------------------------- reveal

function Reveal(p: GP) {
  const { v } = p;
  const q = v.question!;
  const r = v.reveal!;
  const me = v.me!;
  const copy = REVEAL_COPY[q.skin];
  const myAns = me.answer;

  let splitBlock: React.ReactNode = null;
  if (q.type === 'mc' && (r.split?.type === 'mc')) {
    const counts = r.split.counts;
    const correct = r.answer?.type === 'mc' ? r.answer.correct : null;
    splitBlock = (
      <div className="bx-pq__answers app-tiles-compact app-reveal-tiles">
        {(q.options ?? []).map((o, i) => {
          const mine = Number(myAns) === i && myAns != null;
          const state = correct == null ? (mine ? 'is-selected' : '') : i === correct ? 'is-correct' : mine ? 'is-wrong' : 'is-dim';
          return <AnswerTile key={i} k={KEYS[i] as Key} text={correct === i ? `✓ ${o}` : o} state={state as any} count={counts[i]} badge={mine ? 'You' : undefined} />;
        })}
      </div>
    );
  } else if (q.type === 'crowd' && r.split?.type === 'crowd') {
    splitBlock = <CrowdGrid choices={q.choices ?? []} selected={(myAns as string) ?? null} counts={r.split.counts} winners={r.answer?.type === 'crowd' ? r.answer.winners : undefined} />;
  } else if (q.type === 'typed' && r.split?.type === 'typed') {
    splitBlock = (
      <Card skin={q.skin} title="Bookmarks">
        <p className="phone-body app-nomargin">{r.split.answers} answers · {r.split.groups} different spellings</p>
        {r.answer?.type === 'typed' && (
          <>
            <p className="caption app-nomargin" style={{ marginTop: 8 }}>★ Accepted:</p>
            <ul className="app-bookmarks">{r.answer.right.map((x) => <li key={x}>{x}</li>)}{r.answer.lol.map((x) => <li key={x}>{x} (+lol)</li>)}</ul>
          </>
        )}
      </Card>
    );
  } else if (q.type === 'fave' && r.split?.type === 'fave') {
    const a = r.answer?.type === 'fave' ? r.answer : null;
    splitBlock = a?.crowned ? (
      <Card skin={q.skin} title="★ Anne's Fave ★" className="bx-anim-pop" style={{ textAlign: 'center' }}>
        <div className="bx-stack app-center-text">
          <p className="dollz-display app-nomargin" style={{ fontSize: 24, lineHeight: '34px' }}>"{a.crowned.text}"</p>
          <Avatar i={a.crowned.avatar} size="lg" /><b className="phone-title">by {a.crowned.name}</b>
          {a.lols.length > 0 && <p className="caption app-nomargin">+lol: {a.lols.map((l) => `${l.name} ("${l.text}")`).join(', ')}</p>}
        </div>
      </Card>
    ) : (
      <div className="bx-faves" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, overflowY: 'auto', flex: 1, alignContent: 'start' }}>
        {r.split.entries.map((e) => <div key={e.i} className="bx-fave" style={{ fontSize: 15, lineHeight: '20px', padding: 10 }}>{e.text}<small>Look #{e.i}</small></div>)}
      </div>
    );
  } else if (q.type === 'number' && r.split?.type === 'number') {
    const a = r.answer?.type === 'number' ? r.answer : null;
    splitBlock = (
      <Card skin={q.skin} title="Guesses">
        <p className="phone-body app-nomargin" style={q.skin === 'brick' ? { font: '400 26px/28px var(--font-lcd)' } : undefined}>
          {r.split.count} guesses{r.split.min != null ? `, from ${fmt(r.split.min)} to ${fmt(r.split.max!)}` : ''}.
        </p>
        {a && <p style={{ margin: '8px 0 0', font: q.skin === 'brick' ? '400 40px/42px var(--font-lcd)' : '400 22px/32px var(--font-num)' }}>REAL: {a.real != null ? fmt(a.real) : '?'}</p>}
        {a && <p className="phone-body app-nomargin">Closest: {a.closest.map((c) => `${c.name} (${fmt(c.guess)})`).join(', ') || 'nobody'}</p>}
      </Card>
    );
  }

  let top: React.ReactNode;
  const fave = r.answer?.type === 'fave' ? r.answer.crowned : null;
  const spotlight = r.stepName === 'mystery' && r.resolved
    ? <Spotlight key={`m${v.q}`} drum="★ THE MYSTERY RULE WAS… ★" rule={modLine(r.resolved, v.q, v.q === v.total)}><ModBadge m={r.resolved} /></Spotlight>
    : r.stepName === 'answer' && fave
      ? <Spotlight key={`f${v.q}`} drum="★ ANNE'S FAVE IS… ★" rule={`by ${fave.name}. Crowned: 2× their bet.`}>
          <div className="bx-fave is-crowned" style={{ width: '100%', fontSize: 20, lineHeight: '26px' }}><span className="bx-fave__star">★ Fave</span>{fave.text}</div>
        </Spotlight>
      : null;
  if (r.stepName === 'mystery') {
    top = (
      <Card skin={q.skin} title="MYSTERY.EXE" className="bx-anim-pop" style={{ textAlign: 'center' }}>
        <div className="bx-stack app-center-text"><p className="phone-title app-nomargin">The mystery rule was…</p>{r.resolved && <ModBadge m={r.resolved} />}</div>
      </Card>
    );
  } else if (r.stepName === 'points' && me.result) {
    const d = me.result.delta;
    const good = ['right', 'exact', 'crowned', 'lol'].includes(me.result.outcome);
    const label = me.result.outcome === 'exact' ? '✓ EXACT HIT ×2' : me.result.outcome === 'crowned' ? '★ ANNE\'S FAVE' : me.result.outcome === 'lol' ? '★ +lol BONUS' : me.result.outcome === 'none' ? '— NOT PICKED' : good ? copy.right : copy.wrong;
    const rankNow = v.board?.rows.find((x) => x.pid === me.id);
    top = (
      <>
        <Card skin={q.skin} title={good ? 'Success' : 'Error'} className={good ? 'bx-anim-pop' : ''} style={{ textAlign: 'center' }}>
          <div className="bx-stack app-center-text">
            <Pill kind={good ? 'correct' : me.result.outcome === 'none' ? undefined : 'wrong'}>{label}</Pill>
            <span className="phone-display" style={{ fontSize: 36, lineHeight: '48px' }}>{d >= 0 ? `+${fmt(d)}` : signed(d)}</span>
            <p className="phone-body app-nomargin">{good ? copy.rightLine : copy.wrongLine}</p>
            {rankNow && <p className="caption app-nomargin" style={{ opacity: 0.9 }}>Total {rankNow.score < 0 ? `IN DEBT ▼ ${signed(rankNow.score)}` : fmt(rankNow.score)} · You're #{rankNow.rank}{rankNow.moved ? ` (${rankNow.moved > 0 ? '▲' : '▼'}${Math.abs(rankNow.moved)})` : ''}</p>}
          </div>
        </Card>
        {!good && me.result.outcome === 'wrong' && q.skin !== 'bsod' && <WrongModal key={v.q} name={me.name} />}
      </>
    );
  } else if (r.stepName === 'points') {
    top = <Card skin={q.skin} title="Spectating"><p className="phone-body app-nomargin">You sat this one out. Points are being handed to other people.</p></Card>;
  } else {
    top = (
      <Card skin={q.skin} n={v.q} title={r.stepName === 'split' ? 'How everyone answered' : 'The answer'}>
        <QuestionText skin={q.skin} prompt={q.prompt ?? ''} />
      </Card>
    );
  }

  return (
    <SkinShell skin={q.skin} view={v} coins={me.score} poke={p.poke}>
      {spotlight}
      <div className="bx-pq__meta"><Pill>Q{v.q}/{v.total}</Pill>{me.bet != null && <Pill kind="accent">Bet {me.bet}</Pill>}{v.modifier && <ModBadge m={r.resolved ?? v.modifier} sm />}</div>
      {top}
      {r.stepName !== 'mystery' && r.stepName !== 'points' && splitBlock}
      {r.stepName === 'points' && q.type === 'mc' && splitBlock}
      {v.roast && <p className="caption app-nomargin" style={{ textAlign: 'center', color: 'var(--window-ink)', background: 'var(--window)', padding: 6, border: '2px solid var(--frame)' }}>Anne says: “{v.roast}”</p>}
    </SkinShell>
  );
}

// ---------------------------------------------------------------- leaderboard

export function BoardTable({ v, meId, limit }: { v: View; meId?: string; limit?: number }) {
  const b = v.board!;
  const rows = limit ? b.rows.slice(0, limit) : b.rows;
  const mine = meId ? b.rows.find((r) => r.pid === meId) : null;
  const show = mine && !rows.includes(mine) ? [...rows, mine] : rows;
  return (
    <table className="bx-table">
      <thead><tr><th>#</th><th>Name</th><th className="num">Pts</th><th className="num">Last</th></tr></thead>
      <tbody>
        {show.map((r) => (
          <tr key={r.pid} className={`${r.rank === 1 ? 'is-first' : ''} ${r.pid === meId ? 'is-me' : ''}`}>
            <td>{r.rank}</td>
            <td><span className="bx-name"><Avatar i={r.avatar} size="sm" />{r.pid === meId ? `You (${r.name})` : r.name}</span></td>
            <td className="num">{r.score < 0 ? <>IN DEBT ▼ {signed(r.score)}</> : fmt(r.score)}</td>
            <td className="num"><span className="bx-delta">{r.last == null ? '—' : r.last > 0 ? `▲ +${fmt(r.last)}` : r.last < 0 ? `▼ ${signed(r.last)}` : '— 0'}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Board({ v }: { v: View }) {
  const now = useNow();
  const left = v.endsAt != null ? secondsLeft(v, now) : null;
  const b = v.board!;
  const next = v.nextSkin;
  return (
    <div className="bx-phone__main app-scroll">
      <Window title="C:\Party\Leaderboard" style={{ flex: 'none' }}>
        <BoardTable v={v} meId={v.me?.id} limit={8} />
        <div className="bx-statusbar"><span>{b.rows.length} object(s)</span><span>after Q{b.after}</span></div>
      </Window>
      {b.mover && (
        <Window title="Biggest mover"><div className="bx-body" style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Avatar i={b.mover.avatar} /><span className="phone-body"><b>{b.mover.name} ▲ {b.mover.moved}</b> — {b.mover.last ? `${signed(b.mover.last)} last round. Visionary.` : 'Visionary.'}</span></div></Window>
      )}
      {next && (
        <Window title={`Loading Q${v.q + 1}…`} className="bx-anim-pop">
          <div className="bx-body bx-stack">
            <p className="phone-body app-nomargin">Installing <b>{SKINS[next].name}</b> skin…{left != null ? ` ${left}s` : ''}</p>
            <Progress pct={left != null ? 100 - (left / (TIMING.LEADERBOARD / 1000)) * 100 : 70} stripes />
            <p className="caption app-muted app-nomargin">Do not turn off your phone. Do not let {pickName(v, 'touch')} touch your phone.</p>
          </div>
        </Window>
      )}
      {b.zeroes.length > 0 && (
        <Window title={`Recycle Bin (${b.zeroes.length})`} className="bx-dialog"><div className="bx-body"><p className="phone-body app-nomargin">{b.zeroes.slice(0, 5).join(', ')}{b.zeroes.length > 5 ? ` and ${b.zeroes.length - 5} more` : ''} scored 0 this round.</p></div></Window>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- podium

function Podium({ v }: { v: View }) {
  const [page, setPage] = useState<'podium' | 'report' | 'off'>('podium');
  const pod = v.podium!;
  const me = v.me!;
  const rep = me.report;
  const [second, first, third] = [pod.top[1], pod.top[0], pod.top[2]];
  if (page === 'off') {
    return <div className="bx-phone__main app-center" style={{ background: 'var(--qr-ink)' }}><p style={{ color: 'var(--favourite)', font: '700 22px/30px var(--font-ui)', textAlign: 'center' }}>It is now safe to put your phone down.</p></div>;
  }
  if (page === 'report' && rep) {
    return (
      <div className="bx-phone__main app-center">
        <Window title="Your BDAY.EXE report">
          <div className="bx-body bx-stack app-center-text">
            <Avatar i={me.avatar} size="lg" />
            <span className="phone-display" style={{ fontSize: 22, lineHeight: '32px' }}>#{rep.rank} · {rep.score < 0 ? signed(rep.score) : fmt(rep.score)}</span>
            <p className="phone-body app-nomargin">{rep.right}/{rep.played} correct{rep.best ? ` · best bet: ${rep.best}` : ''}{rep.worst ? ` · worst: ${rep.worst}` : ''}</p>
            <Pill kind="accent">👉 Chaos Agent: {rep.agent}</Pill>
            {rep.scammedMs > 0 && <Pill>📢 {(rep.scammedMs / 1000).toFixed(1)}s staring at pop-ups</Pill>}
            <button className="bx-btn bx-btn--block" onClick={() => setPage('podium')}>◀ Back to podium</button>
            <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" onClick={() => setPage('off')}>Shut down party</button>
            <p className="caption app-muted app-nomargin">It is now safe to put your phone down.</p>
          </div>
        </Window>
      </div>
    );
  }
  const step = (row: typeof first, h: number, bg: string, ink: string, place: number, bounce = false) => row && (
    <div className="bx-podium__step"><Avatar i={row.avatar} className={bounce ? 'bx-anim-bounce' : ''} /><b className="caption" style={{ textAlign: 'center' }}>{row.name}<br />{fmt(row.score)}</b><div className="bx-podium__block" style={{ height: h, background: `var(--${bg})`, color: `var(--${ink})` }}>{place}</div></div>
  );
  return (
    <>
      <Confetti />
      <div className="bx-phone__main">
        <Window title="Setup — Installation complete" style={{ flex: 1 }}>
          <div className="bx-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="phone-title app-nomargin" style={{ textAlign: 'center' }}>{pod.age ?? 'Party complete.'} Winners:</p>
            <div className="bx-podium" style={{ flex: 1 }}>
              {step(second, 80, 'button', 'button-ink', 2)}
              {step(first, 120, 'favourite', 'on-favourite', 1, true)}
              {step(third, 60, 'bevel-dark', 'window-ink', 3)}
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {pod.awards.map((a) => <Pill key={a.id} kind={a.id === 'wrong' ? 'wrong' : a.id === 'fave' ? 'fave' : 'accent'}>{a.icon} {a.label}: {a.name}</Pill>)}
            </div>
            {rep && <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" onClick={() => setPage('report')}>Your report →</button>}
          </div>
        </Window>
      </div>
    </>
  );
}
