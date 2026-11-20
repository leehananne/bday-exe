// Host app (Anne's phone): always the FlopXP "Control Panel" skin with a HOST pill.
// Secret lives in the URL fragment (#PIN.secret) so it never appears in requests or logs.
import { useEffect, useMemo, useState } from 'react';
import { ALL_KINDS, FAMILIES, KIND_LABEL } from '../shared/chaos';
import { allowedFor, MOD_META, TYPE_LABEL, validate } from '../shared/modifiers';
import { PIN_RE } from '../shared/protocol';
import { parseQuestions, SKINS } from '../shared/questions';
import type { ChaosEvent, ChaosKind, ModifierId, Question } from '../shared/types';
import type { View } from '../shared/views';
import sample from '../../questions.example.json';
import party from '../../questions.json';
import { ChaosOverlay } from './chaos';
import { AnswerTile, Avatar, fmt, Heat, KEYS, ModBadge, Pill, QR, Shape, signed, Timer, Window, type Key } from './ds';
import { secondsLeft, store, useNow, useRoom, useWakeLock, type Room } from './net';
import { BoardTable } from './player';
import { Phone } from './skins';

const rand = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, n);

function Chrome({ title }: { title: string }) {
  return <div className="bx-chrome"><span className="bx-pill bx-pill--fave">HOST</span><span className="bx-title">{title}</span></div>;
}

export function HostEntry() {
  const parse = () => {
    const h = decodeURIComponent(location.hash.slice(1));
    const m = /^([A-Z]{4})\.([a-z0-9]{16,})$/i.exec(h);
    return m ? { pin: m[1].toUpperCase(), secret: m[2] } : null;
  };
  const [auth, setAuth] = useState(parse);
  const [create, setCreate] = useState<{ questions: unknown; seed?: number } | undefined>(undefined);
  useEffect(() => { const f = () => setAuth(parse()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  if (!auth) return <CreateRoom onCreate={(pin, questions, seed) => {
    const secret = rand(24);
    store.set(`bday:host:${pin}`, secret);
    store.set('bday:host:last', pin);
    setCreate({ questions, seed });
    location.hash = `${pin}.${secret}`;
  }} />;
  return <HostApp pin={auth.pin} secret={auth.secret} create={create} />;
}

// ---------------------------------------------------------------- create

function CreateRoom({ onCreate }: { onCreate: (pin: string, questions: unknown, seed?: number) => void }) {
  const last = store.get('bday:host:last');
  const [pin, setPin] = useState(last ?? 'ANNE');
  const [src, setSrc] = useState<'party' | 'sample' | 'file'>('party');
  const [file, setFile] = useState<{ name: string; data: unknown } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [seed, setSeed] = useState('');
  const resumeSecret = last ? store.get(`bday:host:${last}`) : null;
  const [justClosed] = useState(() => { const c = store.get('bday:host:closed'); store.del('bday:host:closed'); return c; });
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const P = pin.toUpperCase();
    if (!PIN_RE.test(P)) return setErrors(['PIN must be 4 letters (A–Z).']);
    const data = src === 'party' ? party : src === 'sample' ? sample : file?.data;
    const r = parseQuestions(data);
    if (!r.ok) return setErrors(r.errors);
    onCreate(P, data, seed ? Number(seed) : undefined);
  };
  return (
    <Phone host>
      <Chrome title="New party" />
      <div className="bx-phone__main app-scroll">
        {last && resumeSecret && (
          <Window title="Resume">
            <div className="bx-body app-row"><span className="phone-body">Room <b>{last}</b> on this phone</span><a className="bx-btn bx-btn--primary" href={`#${last}.${resumeSecret}`}>Resume ▶</a></div>
          </Window>
        )}
        {justClosed && <Window title="Room closed"><div className="bx-body"><p className="phone-body app-nomargin">Room <b>{justClosed}</b> is closed and its PIN is free. Create it again below to start fresh with the latest questions.</p></div></Window>}
        <Window title="Create a room">
          <form className="bx-body bx-stack" onSubmit={go}>
            <label className="caption app-muted" htmlFor="hpin">Room PIN (4 letters, goes in the link)</label>
            <div className="bx-address__field"><input id="hpin" value={pin} maxLength={4} onChange={(e) => setPin(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())} autoCapitalize="characters" /></div>
            <p className="caption app-muted app-nomargin">Questions</p>
            <label className="bx-toggle-row"><input type="radio" name="src" checked={src === 'party'} onChange={() => setSrc('party')} /><span>Party questions<small>Anne's 10 (questions.json in the repo)</small></span></label>
            <label className="bx-toggle-row"><input type="radio" name="src" checked={src === 'sample'} onChange={() => setSrc('sample')} /><span>Sample questions<small>For test runs (questions.example.json)</small></span></label>
            <label className="bx-toggle-row"><input type="radio" name="src" checked={src === 'file'} onChange={() => setSrc('file')} /><span>Upload questions.json<small>{file ? file.name : '10 questions, same format as the sample'}</small></span></label>
            {src === 'file' && (
              <input type="file" accept="application/json,.json" aria-label="questions.json" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { setFile({ name: f.name, data: JSON.parse(await f.text()) }); setErrors([]); } catch { setErrors(['That file is not valid JSON.']); }
              }} />
            )}
            <label className="caption app-muted" htmlFor="seed">Seed (optional; default comes from the PIN)</label>
            <div className="bx-address__field"><input id="seed" inputMode="numeric" value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 36" /></div>
            {errors.length > 0 && <div className="bx-warn" role="alert">{errors.map((x) => <div key={x}>✗ {x}</div>)}</div>}
            <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block">Create room ▶</button>
            <p className="caption app-muted app-nomargin">The host link is secret. It is saved on this phone; anyone with it can run the game.</p>
          </form>
        </Window>
      </div>
    </Phone>
  );
}

// ---------------------------------------------------------------- connected host

function HostApp({ pin, secret, create }: { pin: string; secret: string; create?: { questions: unknown; seed?: number } }) {
  const hello = useMemo(() => ({ role: 'host' as const, secret, create }), [secret, create]);
  const [st, room] = useRoom(pin, hello);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<'setup' | 'lobby'>('lobby');
  const [menu, setMenu] = useState(false);
  useEffect(() => { if (st.error && st.error.code === 'action') setToast(st.error.msg); }, [st.error]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);
  const v = st.view;
  useWakeLock(!!v && v.phase !== 'LOBBY');
  useEffect(() => {
    if (!st.closed) return;
    store.del(`bday:host:${pin}`);
    if (store.get('bday:host:last') === pin) store.del('bday:host:last');
    store.set('bday:host:closed', pin);
    location.hash = '';
  }, [st.closed]);

  if (st.error && (st.error.code === 'room_taken' || st.error.code === 'no_room' || st.error.code === 'bad_questions') && !v) {
    return (
      <Phone host><Chrome title={`Room ${pin}`} /><div className="bx-phone__main app-center">
        <Window title="BDAY.EXE"><div className="bx-body bx-stack"><p className="phone-body app-nomargin" style={{ whiteSpace: 'pre-wrap' }}><b>{st.error.msg}</b></p>
          {st.error.code === 'no_room' && <button className="bx-btn bx-btn--primary" onClick={() => { room?.setHello({ role: 'host', secret, create: { questions: party } }); room?.ws.reconnect(); }}>Create it with the party questions</button>}
          <a className="bx-btn" href="/host" onClick={() => { location.hash = ''; }}>Start a different room</a></div></Window>
      </div></Phone>
    );
  }
  if (!v || !v.host || !room) return <Phone host><Chrome title={`Room ${pin}`} /><div className="bx-phone__main app-center"><Window title="Connecting…"><div className="bx-body"><p className="phone-body app-nomargin">Dialling up the party server<span className="bx-anim-blink">_</span></p></div></Window></div></Phone>;

  let screen: React.ReactNode;
  let title = `Room ${pin}`;
  if (v.phase === 'LOBBY') {
    title = tab === 'setup' ? 'Setup' : 'Lobby';
    screen = tab === 'setup' ? <Setup v={v} room={room} onDone={() => setTab('lobby')} /> : <Lobby v={v} room={room} onSetup={() => setTab('setup')} />;
  } else if (v.phase === 'JUDGE') {
    const t = v.question!.type;
    title = `Q${v.q} · ${t === 'fave' ? 'Pick your fave' : t === 'number' ? SKINS[v.question!.skin].name : 'Judge answers'}`;
    screen = t === 'typed' ? <JudgeTyped v={v} room={room} /> : t === 'fave' ? <PickFave v={v} room={room} /> : <EnterNumber v={v} room={room} />;
  } else if (v.phase === 'REVEAL') { title = `Q${v.q} · Reveal`; screen = <RevealCtl v={v} room={room} />; }
  else if (v.phase === 'LEADERBOARD') { title = `After Q${v.q}`; screen = <BoardCtl v={v} room={room} />; }
  else if (v.phase === 'PODIUM') { title = 'Podium'; screen = <PodiumCtl v={v} room={room} />; }
  else { title = `Q${v.q} · ${SKINS[v.question!.skin].name}`; screen = <Live v={v} room={room} />; }

  return (
    <Phone host calm={v.calm}>
      <div className="bx-chrome"><span className="bx-pill bx-pill--fave">HOST</span><span className="bx-title">{title}</span><button className="bx-btn app-mini" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button></div>
      {st.status === 'closed' && <div className="app-banner">Reconnecting…</div>}
      {menu && <HostMenu v={v} room={room} close={() => setMenu(false)} />}
      {screen}
      {toast && <div className="app-toast" role="alert"><Window title="BDAY.EXE" className="bx-anim-pop"><div className="bx-body"><p className="phone-body app-nomargin">{toast}</p></div></Window></div>}
    </Phone>
  );
}

function HostMenu({ v, room, close }: { v: View; room: Room; close: () => void }) {
  return (
    <div className="app-sheet" style={{ top: 44, bottom: 'auto' }}>
      <Window title="Control Panel" close={close}>
        <div className="bx-body bx-stack" style={{ gap: 6 }}>
          <label className="bx-toggle-row"><input type="checkbox" checked={v.calm} onChange={(e) => room.act({ t: 'setFlags', calm: e.target.checked })} /><span>Calm mode<small>Stops shake, wobble, marquee, twinkle, rain for everyone</small></span></label>
          <label className="bx-toggle-row"><input type="checkbox" checked={v.powerups} onChange={(e) => room.act({ t: 'setFlags', powerups: e.target.checked })} /><span>Nudges &amp; pop-up ads<small>Player power-ups, one each per game</small></span></label>
          <AutoToggles v={v} room={room} />
          <p className="caption app-muted app-nomargin">Players ({v.players.length})</p>
          <ul className="bx-buddies" style={{ maxHeight: 220, overflowY: 'auto' }}>
            {v.players.map((p) => (
              <li key={p.id} className={`bx-buddy ${p.online ? '' : 'is-away'}`}><Avatar i={p.avatar} size="sm" /><span className="bx-buddy__name">{p.name}</span>
                <button className="bx-btn app-mini" style={{ marginLeft: 'auto' }} aria-label={`Kick ${p.name}`} onClick={() => confirm(`Kick ${p.name}?`) && room.act({ t: 'kick', pid: p.id })}>✕</button></li>
            ))}
          </ul>
          {v.phase !== 'LOBBY' && <button className="bx-btn bx-btn--danger" onClick={() => confirm('Reset to the lobby? Scores and chips are wiped; players stay.') && room.act({ t: 'resetGame' })}>Reset game (rehearsal)</button>}
          <button className="bx-btn bx-btn--danger" onClick={() => confirm(`Close room ${v.pin} for good? Everyone is sent home, the game is deleted, and the PIN is free to create again.`) && room.closeRoom()}>Close room {v.pin}…</button>
        </div>
      </Window>
    </div>
  );
}

// ---------------------------------------------------------------- setup: modifier plan + chaos

function Setup({ v, room, onDone }: { v: View; room: Room; onDone: () => void }) {
  const h = v.host!;
  const [plan, setPlan] = useState<ModifierId[]>(h.plan);
  const [locked, setLocked] = useState<boolean[]>(h.locked);
  useEffect(() => { setPlan(h.plan); setLocked(h.locked); }, [h.plan.join(), h.locked.join()]);
  const val = validate(plan, h.questions);
  const dirty = plan.join() !== h.plan.join() || locked.join() !== h.locked.join();
  const [preview, setPreview] = useState<ChaosEvent | null>(null);
  const chaos = h.chaos;
  const setChaos = (patch: Partial<typeof chaos>) => room.act({ t: 'setChaos', chaos: { ...chaos, ...patch } });
  const toggleFamily = (kinds: ChaosKind[], on: boolean) => setChaos({ enabled: on ? [...new Set([...chaos.enabled, ...kinds])] : chaos.enabled.filter((k) => !kinds.includes(k)) });
  const test = () => {
    const kind = ALL_KINDS.filter((k) => k !== 'auntie_chope')[Math.floor(Math.random() * 10)];
    const now = Date.now();
    setPreview({ id: `t_${now}`, kind, player: 'host', q: 0, at: now, until: now + 5000, fired: true });
    setTimeout(() => setPreview((p) => (p && p.at === now ? null : p)), 5000);
  };
  return (
    <div className="bx-phone__main app-scroll">
      <Window title={`Seed 0x${h.planSeed.toString(16)} · round modifier plan`} style={{ flex: 'none' }}>
        <table className="bx-plan"><tbody>
          {h.questions.map((q, i) => (
            <tr key={i} className={locked[i] ? 'is-locked' : ''}>
              <td>{i + 1}</td>
              <td>{SKINS[q.skin].short}<br /><span className="app-muted">{TYPE_LABEL[q.type]}</span></td>
              <td>
                <select className="app-select" aria-label={`Q${i + 1} modifier`} value={plan[i]} onChange={(e) => { const p = [...plan]; p[i] = e.target.value as ModifierId; setPlan(p); const l = [...locked]; l[i] = true; setLocked(l); }}>
                  {allowedFor(i + 1, q.type, h.questions.length).map((m) => <option key={m} value={m}>{MOD_META[m].short}</option>)}
                </select>
              </td>
              <td><ModBadge m={plan[i]} sm final={i === h.questions.length - 1} /></td>
              <td style={{ width: 40 }}><button className="bx-btn app-mini" aria-pressed={locked[i]} aria-label={locked[i] ? `Unlock Q${i + 1}` : `Lock Q${i + 1}`} onClick={() => { const l = [...locked]; l[i] = !l[i]; setLocked(l); }}>{locked[i] ? '🔒' : '🔓'}</button></td>
            </tr>
          ))}
        </tbody></table>
        <div className="bx-warn" role="status">{val.ok ? '✓ Valid: Q1 chill · a Double in Q2–3 · 1–3 penalty rounds · no penalties on Fave or Number' : val.errors.map((e, i) => <div key={i}>✗ {e.msg}</div>)}</div>
      </Window>
      <div className="app-row" style={{ flex: 'none' }}>
        <button className="bx-btn" disabled={dirty} title={dirty ? 'Save or undo edits first' : ''} onClick={() => room.act({ t: 'reroll' })}>🎲 Re-roll unlocked</button>
        <button className="bx-btn bx-btn--primary" disabled={!val.ok || !dirty} onClick={() => room.act({ t: 'setPlan', plan, locked })}>{dirty ? 'Save plan' : 'Saved ✓'}</button>
      </div>

      <Window title="Chaos events" style={{ flex: 'none' }}>
        <div className="bx-body bx-stack">
          <p className="caption app-muted app-nomargin">Random chaos intensity</p>
          <div className="bx-seg" role="group" aria-label="Intensity">
            {(['off', 'mild', 'chaos'] as const).map((x) => <button key={x} aria-pressed={chaos.intensity === x} onClick={() => setChaos({ intensity: x })}>{x[0].toUpperCase() + x.slice(1)}</button>)}
          </div>
          <p className="caption app-muted app-nomargin">{chaos.intensity === 'off' ? 'No random events.' : chaos.intensity === 'mild' ? 'Mild: ~15% of players hit per question · max 2 each per game' : 'Chaos: ~35% of players hit per question · max 3 each per game'}</p>
          <div>
            {FAMILIES.map((f) => {
              const on = f.kinds.every((k) => chaos.enabled.includes(k));
              return <label key={f.id} className="bx-toggle-row"><input type="checkbox" checked={on} onChange={(e) => toggleFamily(f.kinds, e.target.checked)} /><span>{f.label}<small>{f.hint}</small></span></label>;
            })}
            <label className="bx-toggle-row"><input type="checkbox" checked={chaos.mercy} onChange={(e) => setChaos({ mercy: e.target.checked })} /><span>Mercy rule<small>Never target whoever is in last place</small></span></label>
          </div>
          <button className="bx-btn bx-btn--block" onClick={test}>Send a test event to my phone</button>
          {preview && <div className="bx-chaos-zone" style={{ minHeight: 160 }}><div className="bx-pq__card"><p className="bx-pq__text">Preview question card</p></div><ChaosOverlay ev={preview} onClose={() => setPreview(null)} /></div>}
        </div>
      </Window>
      <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" style={{ flex: 'none' }} onClick={onDone}>Done → Lobby</button>
    </div>
  );
}

// ---------------------------------------------------------------- lobby

function Lobby({ v, room, onSetup }: { v: View; room: Room; onSetup: () => void }) {
  const url = `${location.origin}/${v.pin}`;
  const shortUrl = `${location.host}/${v.pin}`;
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const data = { title: 'BDAY.EXE', text: `Join Anne's birthday game! PIN ${v.pin}`, url };
    try { if (navigator.share) return await navigator.share(data); } catch { return; }
    copy();
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { prompt('Copy this link', url); } };
  const errs = v.host!.planErrors;
  return (
    <div className="bx-phone__main app-scroll">
      <Window title="Show this to your friends" style={{ flex: 'none' }}>
        <div className="bx-body bx-qr">
          <div className="bx-qr__code"><QR text={url} size={200} /></div>
          <span className="bx-qr__url">{shortUrl}</span>
          <div className="bx-pin" aria-label={`PIN ${v.pin.split('').join(' ')}`}>{v.pin.split('').map((c, i) => <span key={i}>{c}</span>)}</div>
        </div>
      </Window>
      <div className="app-row" style={{ flex: 'none' }}><button className="bx-btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button><button className="bx-btn bx-btn--primary" onClick={share}>Share to group chat</button></div>
      <p className="caption app-nomargin" style={{ textAlign: 'center', color: 'var(--titlebar-ink)' }}>Host link is secret. Don't share this screen's URL.</p>
      <Window title={`Buddies — ${v.players.length} joined`} style={{ flex: 'none' }}>
        <ul className="bx-buddies">
          {v.players.length === 0 && <li className="bx-buddy"><span className="bx-buddy__status">Nobody yet. Send the link!</span></li>}
          {v.players.map((p) => (
            <li key={p.id} className={`bx-buddy ${p.online ? '' : 'is-away'}`}><Avatar i={p.avatar} size="sm" /><span className="bx-buddy__name">{p.name}</span>
              <button className="bx-btn app-mini" style={{ marginLeft: 'auto' }} aria-label={`Kick ${p.name}`} onClick={() => confirm(`Kick ${p.name}?`) && room.act({ t: 'kick', pid: p.id })}>✕</button></li>
          ))}
        </ul>
        <div className="bx-statusbar"><span>{v.players.filter((p) => p.online).length} online</span><span>Late join until Q3</span></div>
      </Window>
      <Window style={{ flex: 'none' }}>
        <div className="bx-body bx-stack" style={{ gap: 6 }}>
          <label className="bx-toggle-row" style={{ border: 0 }}><input type="checkbox" checked={v.powerups} onChange={(e) => room.act({ t: 'setFlags', powerups: e.target.checked })} /> Nudges &amp; pop-up ads</label>
          <AutoToggles v={v} room={room} />
          <label className="bx-toggle-row" style={{ border: 0 }}><input type="checkbox" checked={v.calm} onChange={(e) => room.act({ t: 'setFlags', calm: e.target.checked })} /> Calm mode (no shaking)</label>
          <button className="bx-btn" onClick={onSetup}>⚙ Modifier plan &amp; chaos settings</button>
          {errs.length > 0 && <div className="bx-warn">✗ {errs[0]}</div>}
        </div>
      </Window>
      <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" style={{ flex: 'none' }} disabled={!v.players.length || errs.length > 0} onClick={() => room.act({ t: 'start' })}>Start the chaos ▶</button>
    </div>
  );
}

// ---------------------------------------------------------------- live question

function SplitBars({ v }: { v: View }) {
  const h = v.host!;
  const q = h.questions[v.q - 1];
  const ans = Object.values(h.answers);
  if (q.type === 'mc') {
    const counts = (q.options ?? []).map((_, i) => ans.filter((a) => Number(a) === i).length);
    const max = Math.max(1, ...counts);
    return (
      <div className="bx-stack" style={{ gap: 4 }}>
        {(q.options ?? []).map((o, i) => (
          <div key={i}>
            <div className="app-split"><span className="bx-answer__key" style={{ background: `var(--answer-${KEYS[i]})` }}><ShapeOnly k={KEYS[i]} /></span><div className="app-split__bar" style={{ width: `${(counts[i] / max) * 100}%`, background: `var(--answer-${KEYS[i]})` }} /><b>{counts[i]}</b></div>
            <span className="caption app-muted" style={{ marginLeft: 36 }}>{o}{i === q.answer ? ' ✓' : ''}</span>
          </div>
        ))}
      </div>
    );
  }
  if (q.type === 'crowd') {
    const choices = v.question?.choices ?? [];
    const rows = choices.map((c) => ({ c, n: h.tally[c.key] ?? 0 })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 6);
    return <div className="caption">{rows.length ? rows.map((x) => <div key={x.c.key}>{x.c.label}: <b>{x.n}</b></div>) : 'No votes yet'}</div>;
  }
  if (q.type === 'typed') return <p className="caption app-nomargin">Accepts: <b>{q.accept?.join(', ')}</b> · {ans.length} typed so far</p>;
  return <p className="caption app-nomargin">{ans.length} answers so far{q.type === 'number' ? ` · range ${ans.length ? `${Math.min(...ans.map(Number))}–${Math.max(...ans.map(Number))}` : '–'}` : ''}</p>;
}
const ShapeOnly = ({ k }: { k: (typeof KEYS)[number] }) => <Shape k={k} />;

function NextModifier({ v, room }: { v: View; room: Room }) {
  const h = v.host!;
  const n = v.q + 1;
  if (n > h.questions.length) return null;
  const q = h.questions[n - 1];
  return (
    <div className="app-row caption">
      <span>Next: Q{n} {SKINS[q.skin].short}</span>
      <select className="app-select" aria-label={`Swap Q${n} modifier`} value={h.plan[n - 1]} onChange={(e) => room.act({ t: 'swapModifier', q: n, m: e.target.value as ModifierId })}>
        {allowedFor(n, q.type, h.questions.length).map((m) => <option key={m} value={m}>{MOD_META[m].name}</option>)}
      </select>
    </div>
  );
}

function Live({ v, room }: { v: View; room: Room }) {
  const now = useNow();
  const left = secondsLeft(v, now);
  const h = v.host!;
  const q = h.questions[v.q - 1];
  const book = v.phase === 'ANSWER' ? h.answers : h.bets;
  const missing = v.players.filter((p) => book[p.id] == null);
  const phaseName = v.phase === 'MODIFIER' ? 'Modifier installing' : v.phase === 'BET' ? 'Betting' : 'Answering';
  const total = v.phase === 'MODIFIER' ? 2 : v.phase === 'BET' ? 10 : q.seconds;
  return (
    <div className="bx-phone__main app-scroll">
      <Window title={`${phaseName} — ${v.lockedIn.length}/${v.players.length} ${v.phase === 'ANSWER' ? 'locked' : 'bet'}`} style={{ flex: 'none' }}>
        <div className="bx-body bx-stack" style={{ gap: 8 }}>
          <Timer left={left} total={total} big label={v.paused ? '⏸ Paused' : undefined} />
          <div className="app-row"><ModBadge m={h.plan[v.q - 1]} sm />{h.plan[v.q - 1] === 'mystery' && <span className="caption">→ drawn at lock</span>}<span className="caption app-muted">{TYPE_LABEL[q.type]} · {q.category}</span></div>
          <p className="phone-body app-nomargin"><b>{q.prompt}</b></p>
          {v.phase === 'ANSWER' && <SplitBars v={v} />}
        </div>
      </Window>
      <div className="app-row" style={{ flex: 'none' }}>
        {v.paused ? <button className="bx-btn bx-btn--primary" onClick={() => room.act({ t: 'resume' })}>▶ Resume</button> : <button className="bx-btn" onClick={() => room.act({ t: 'pause' })}>⏸ Pause</button>}
        <button className="bx-btn" onClick={() => room.act({ t: 'addTime' })}>+10s</button>
        <button className="bx-btn" onClick={() => room.act({ t: 'endNow' })}>End now</button>
      </div>
      <Window style={{ flex: 'none' }}>
        <div className="bx-body" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="caption app-muted">Not in yet:</span>
          {missing.length ? missing.slice(0, 12).map((p) => <span key={p.id} title={p.name}><Avatar i={p.avatar} size="sm" /></span>) : <span className="caption">nobody 🎉</span>}
          {missing.length > 0 && v.phase !== 'MODIFIER' && <button className="bx-btn app-mini" style={{ marginLeft: 'auto' }} onClick={() => room.act({ t: 'nudgeAll' })}>👉 Nudge all</button>}
        </div>
      </Window>
      {h.chaosLog.length > 0 && (
        <Window title="Chaos log" style={{ flex: 'none' }}>
          <div className="bx-body caption">{h.chaosLog.slice(-6).map((e) => <div key={e.id}>{e.ended ? '·' : '⚡'} {e.player}: {KIND_LABEL[e.kind as ChaosKind]}{e.from ? ` (from ${e.from})` : ''}</div>)}</div>
        </Window>
      )}
      <Window style={{ flex: 'none' }}>
        <div className="bx-body bx-stack" style={{ gap: 6 }}>
          <NextModifier v={v} room={room} />
          <div className="app-row"><Heat heat={h.plan.slice(0, v.q)} total={h.questions.length} /></div>
          <button className="bx-btn app-mini" onClick={() => confirm(`Skip Q${v.q}? Bets are refunded.`) && room.act({ t: 'skip' })}>Skip question</button>
        </div>
      </Window>
    </div>
  );
}

// ---------------------------------------------------------------- judging

function JudgeTyped({ v, room }: { v: View; room: Room }) {
  const h = v.host!;
  const groups = h.groups;
  const pending = groups.filter((g) => g.verdict == null).length;
  return (
    <div className="bx-phone__main">
      <Window title={`${Object.keys(h.answers).length} player${Object.keys(h.answers).length === 1 ? "" : "s"} · ${groups.length} answer${groups.length === 1 ? "" : "s"}`} style={{ flex: 1 }}>
        <div className="app-scroll" style={{ flex: 1 }}>
          <table className="bx-table"><thead><tr><th>Answer</th><th className="num">#</th><th>Verdict</th></tr></thead><tbody>
            {groups.map((g) => (
              <tr key={g.key}>
                <td style={{ overflowWrap: 'anywhere' }}>{g.display}{g.similarTo && g.verdict == null && <><br /><span className="caption app-muted">≈ {g.similarTo}?</span></>}</td>
                <td className="num">{g.count}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {(['right', 'wrong', 'lol'] as const).map((x) => (
                    <button key={x} className="bx-btn app-mini" aria-pressed={g.verdict === x} aria-label={`${x} for ${g.display}`} onClick={() => room.act({ t: 'judge', key: g.key, verdict: g.verdict === x ? null : x })}>
                      {x === 'right' ? '✓' : x === 'wrong' ? '✗' : '★'}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
            {!groups.length && <tr><td colSpan={3}>Nobody typed anything. Bold.</td></tr>}
          </tbody></table>
        </div>
        <div className="bx-statusbar"><span>{pending ? `${pending} left to judge (unjudged = ✗)` : 'All judged'}</span><span>✓ right · ★ +lol</span></div>
      </Window>
      <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" onClick={() => room.act({ t: 'finishJudging' })}>Done → reveal</button>
    </div>
  );
}

function PickFave({ v, room }: { v: View; room: Room }) {
  const h = v.host!;
  const entries = useMemo(() => Object.entries(h.texts).flatMap(([pid, list]) => list.map((text, k) => ({ pid, k, text }))).map((e, i) => ({ ...e, i: i + 1 })), [JSON.stringify(h.texts)]);
  const lolsLeft = 3 - h.judging.lols.length;
  const [mode, setMode] = useState<'crown' | 'lol'>('crown');
  return (
    <div className="bx-phone__main">
      <p className="phone-body app-nomargin" style={{ color: 'var(--titlebar-ink)' }}><b>"{h.questions[v.q - 1].prompt}"</b></p>
      <div className="bx-seg" role="group" aria-label="Tap mode"><button aria-pressed={mode === 'crown'} onClick={() => setMode('crown')}>★ Crown</button><button aria-pressed={mode === 'lol'} onClick={() => setMode('lol')}>+lol ({lolsLeft} left)</button><button disabled>{entries.length} looks</button></div>
      <div className="bx-faves app-scroll" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1, alignContent: 'start', paddingTop: 12 }} role="group" aria-label="Answers">
        {entries.map((e) => {
          const crowned = h.judging.crowned === e.pid && (h.judging.crownedIdx == null || h.judging.crownedIdx === e.k);
          const lol = h.judging.lols.includes(e.pid);
          return (
            <button key={`${e.pid}-${e.k}`} className={`bx-fave ${crowned ? 'is-crowned' : ''} ${lol ? 'is-lol' : ''}`} aria-pressed={crowned || lol} style={{ fontSize: 15, lineHeight: '20px', padding: 10 }}
              onClick={() => (mode === 'crown' ? room.act({ t: 'crown', pid: crowned ? null : e.pid, i: e.k }) : room.act({ t: 'lol', pid: e.pid }))}>
              {crowned && <span className="bx-fave__star">★ Fave</span>}{e.text}<small>Look #{e.i}{lol ? ' · +lol' : ''}</small>
            </button>
          );
        })}
        {!entries.length && <p className="phone-body" style={{ color: 'var(--titlebar-ink)' }}>No looks submitted.</p>}
      </div>
      <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" onClick={() => room.act({ t: 'finishJudging' })}>{h.judging.crowned ? 'Crown & reveal ★' : 'Reveal (no fave)'}</button>
    </div>
  );
}

function EnterNumber({ v, room }: { v: View; room: Room }) {
  const h = v.host!;
  const [val, setVal] = useState(h.judging.real != null ? String(h.judging.real) : '');
  const real = val === '' ? null : Number(val);
  const rows = Object.entries(h.answers).map(([pid, a]) => ({ p: v.players.find((x) => x.id === pid), g: Number(a) }))
    .filter((x) => x.p).map((x) => ({ ...x, d: real == null ? 0 : x.g - real })).sort((a, b) => Math.abs(a.d) - Math.abs(b.d));
  return (
    <div className="bx-phone__main">
      <Window title="What's the real number?" style={{ flex: 'none' }}>
        <div className="bx-body bx-stack"><p className="phone-body app-nomargin">Check your phone. Be honest. Everyone is watching.</p>
          <div className="bx-address__field"><input value={val} inputMode="numeric" pattern="[0-9]*" aria-label="Real number" onChange={(e) => setVal(e.target.value.replace(/\D/g, '').slice(0, 9))} className="app-num-input" /></div></div>
      </Window>
      <Window title="Closest guesses" style={{ flex: 1 }}>
        <div className="app-scroll" style={{ flex: 1 }}>
          <table className="bx-table"><tbody>
            {rows.map((r, i) => <tr key={r.p!.id} className={i === 0 && real != null ? 'is-first' : ''}><td><Avatar i={r.p!.avatar} size="sm" /></td><td>{r.p!.name}</td><td className="num">{fmt(r.g)}</td><td className="num">{real == null ? '' : r.d === 0 ? 'EXACT' : Math.abs(r.d) > 5000 ? 'lol' : signed(r.d)}</td></tr>)}
          </tbody></table>
        </div>
      </Window>
      <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" disabled={real == null} onClick={() => { room.act({ t: 'setReal', value: real }); setTimeout(() => room.act({ t: 'finishJudging' }), 50); }}>Confirm → reveal</button>
    </div>
  );
}

// ---------------------------------------------------------------- reveal / board / podium

/** Countdown for the autopilot on the reveal / leaderboard, with Hold and Resume. */
function Autopilot({ v, room, what }: { v: View; room: Room; what: string }) {
  const now = useNow();
  const left = secondsLeft(v, now);
  const on = v.phase === 'REVEAL' ? v.auto.reveal : v.auto.next;
  if (v.endsAt != null) {
    return (
      <div className="app-row caption" role="status">
        <span style={{ flex: 1 }}>▶ Autopilot: {what} in <b>{left}s</b></span>
        <button className="bx-btn app-mini" onClick={() => room.act({ t: 'hold' })}>⏸ Hold</button>
      </div>
    );
  }
  return (
    <div className="app-row caption" role="status">
      <span style={{ flex: 1 }}>{on ? '⏸ Held. Talk all you like.' : 'Autopilot off: you tap through.'}</span>
      <button className="bx-btn app-mini" onClick={() => room.act({ t: 'setFlags', ...(v.phase === 'REVEAL' ? { autoReveal: true } : { autoNext: true }) })}>▶ {on ? 'Resume' : 'Turn on'}</button>
    </div>
  );
}

function AutoToggles({ v, room }: { v: View; room: Room }) {
  return (
    <>
      <label className="bx-toggle-row"><input type="checkbox" checked={v.auto.reveal} onChange={(e) => room.act({ t: 'setFlags', autoReveal: e.target.checked })} /><span>Auto-play reveal<small>When time's up: split → answer → points → leaderboard, on timers</small></span></label>
      <label className="bx-toggle-row"><input type="checkbox" checked={v.auto.next} onChange={(e) => room.act({ t: 'setFlags', autoNext: e.target.checked })} /><span>Autopilot next question<small>Leaderboard starts the next question after 10s</small></span></label>
    </>
  );
}

const STEP_LABEL = { mystery: 'Reveal mystery rule', split: 'Show the split', answer: 'Reveal answer', points: 'Show points' } as const;

function RevealCtl({ v, room }: { v: View; room: Room }) {
  const h = v.host!;
  const r = v.reveal!;
  const [roast, setRoast] = useState(v.roast);
  const last = v.q === v.total;
  const nextQ = h.questions[v.q];
  const q = h.questions[v.q - 1];
  return (
    <div className="bx-phone__main app-scroll">
      <Window title="Reveal step by step" style={{ flex: 'none' }}>
        <div className="bx-body bx-stack">
          {r.steps.map((s, i) => (
            <button key={s} className={`bx-btn bx-btn--block ${i === r.index ? '' : ''}`} aria-pressed={i <= r.index} disabled={i > r.index}>{['①', '②', '③', '④'][i]} {STEP_LABEL[s]} {i <= r.index ? '✓' : ''}</button>
          ))}
          <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" onClick={() => room.act({ t: 'revealNext' })}>
            {r.index < r.steps.length - 1 ? `Next: ${STEP_LABEL[r.steps[r.index + 1]]} ▶` : last ? 'Podium ▶' : 'Leaderboard ▶'}
          </button>
          <button className="bx-btn" onClick={() => room.act({ t: 'back' })}>◀ Back{r.index === 0 && q.type !== 'mc' && q.type !== 'crowd' ? ' (re-open judging)' : ''}</button>
          <Autopilot v={v} room={room} what={r.index < r.steps.length - 1 ? STEP_LABEL[r.steps[r.index + 1]].toLowerCase() : last ? 'podium' : 'leaderboard'} />
        </div>
      </Window>
      {q.type === 'mc' && (
        <div className="bx-pq__answers app-tiles-compact" style={{ flex: 'none', gridAutoRows: 'auto' }}>
          {(q.options ?? []).map((o, i) => <AnswerTile key={i} k={KEYS[i] as Key} text={o} state={i === q.answer ? 'is-correct' : 'is-dim'} count={Object.values(h.answers).filter((a) => Number(a) === i).length} />)}
        </div>
      )}
      {r.resolved && h.plan[v.q - 1] === 'mystery' && <Window style={{ flex: 'none' }}><div className="bx-body app-row"><span className="caption">Mystery was</span><ModBadge m={r.resolved} sm /></div></Window>}
      <Window title="Roast line (optional, shown on phones)" style={{ flex: 'none' }}>
        <form className="bx-body app-row" onSubmit={(e) => { e.preventDefault(); room.act({ t: 'roast', text: roast }); }}>
          <div className="bx-address__field"><input value={roast} maxLength={90} onChange={(e) => setRoast(e.target.value)} aria-label="Roast line" placeholder="7 people trusted prawn crackers. Why." /></div>
          <button className="bx-btn app-mini">Send</button>
        </form>
      </Window>
      {nextQ && <Window style={{ flex: 'none' }}><div className="bx-body"><p className="caption app-muted app-nomargin">Next up: Q{v.q + 1} {SKINS[nextQ.skin].name} · {TYPE_LABEL[nextQ.type]}{nextQ.type === 'fave' ? " · you'll pick a winner" : nextQ.type === 'number' ? ' · have your real number ready' : ''}</p></div></Window>}
    </div>
  );
}

function BoardCtl({ v, room }: { v: View; room: Room }) {
  return (
    <div className="bx-phone__main app-scroll">
      <Window title="C:\Party\Leaderboard" style={{ flex: 'none' }}><BoardTable v={v} limit={10} /></Window>
      <Window style={{ flex: 'none' }}><div className="bx-body bx-stack" style={{ gap: 6 }}><Autopilot v={v} room={room} what={`Q${v.q + 1} starts`} /><NextModifier v={v} room={room} /></div></Window>
      <div className="app-row" style={{ flex: 'none' }}>
        <button className="bx-btn" onClick={() => room.act({ t: 'back' })}>◀ Back</button>
        <button className="bx-btn bx-btn--primary bx-btn--lg" onClick={() => room.act({ t: 'next' })}>Start Q{v.q + 1} ▶</button>
      </div>
    </div>
  );
}

function PodiumCtl({ v, room }: { v: View; room: Room }) {
  const pod = v.podium!;
  return (
    <div className="bx-phone__main app-scroll">
      <Window title="Setup — Installation complete" style={{ flex: 'none' }}><BoardTable v={v} /></Window>
      <Window title="Awards" style={{ flex: 'none' }}><div className="bx-body" style={{ display: 'grid', gap: 6 }}>{pod.awards.map((a) => <Pill key={a.id} kind="accent">{a.icon} {a.label}: {a.name} · {a.detail}</Pill>)}</div></Window>
      <button className="bx-btn" onClick={() => room.act({ t: 'back' })}>◀ Back to the last reveal</button>
      <button className="bx-btn bx-btn--danger bx-btn--lg bx-btn--block" onClick={() => confirm(`Close room ${v.pin}? Everyone's phone shows "party's over" and the game is deleted.`) && room.closeRoom()}>Shut down party (close room)</button>
      <p className="caption app-nomargin" style={{ textAlign: 'center', color: 'var(--titlebar-ink)' }}>It is now safe to put your phone down.</p>
    </div>
  );
}
