// Cloudflare Worker + one Durable Object per room (PRD §10 Option 2: server-authoritative).
// The room owns the clock, the seed, the answer key and the chaos queue; phones are clients.
import { routePartykitRequest, Server, type Connection, type ConnectionContext } from 'partyserver';
import { apply, findByToken, join, newGame, nextWake, tick, type Action, type Effect } from '../shared/game';
import { PIN_RE, type ClientMsg, type ServerMsg } from '../shared/protocol';
import { parseQuestions } from '../shared/questions';
import { seedFromPin } from '../shared/rng';
import type { GameState } from '../shared/types';
import { viewFor } from '../shared/views';
import { BIRTHDAY } from '../shared/config';

interface Env { Room: DurableObjectNamespace; ASSETS: Fetcher }
type ConnState = { role: 'host' } | { role: 'player'; pid: string } | { role: 'pending' };

const REACT_PER_SEC = 2;
const REACT_FLUSH_MS = 250; // ≤4 broadcast batches per second

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const rid = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, n * 1.5);

export class Room extends Server<Env> {
  static options = { hibernate: true };

  state: GameState | null = null;
  reactBuf: { e: string; name: string; avatar: number }[] = [];
  reactTimes = new Map<string, number[]>();
  flushTimer: ReturnType<typeof setTimeout> | null = null;

  async onStart() {
    this.state = (await this.ctx.storage.get<GameState>('state')) ?? null;
  }

  private send(c: Connection, m: ServerMsg) {
    try { c.send(JSON.stringify(m)); } catch { /* closed */ }
  }
  private cs(c: Connection): ConnState { return (c.state as ConnState) ?? { role: 'pending' }; }

  async onConnect(c: Connection, _ctx: ConnectionContext) {
    c.setState({ role: 'pending' } satisfies ConnState);
  }

  async onClose(c: Connection) {
    const st = this.cs(c);
    const s = this.state;
    if (!s || st.role === 'pending') return;
    const still = [...this.getConnections()].some((o) => o.id !== c.id && JSON.stringify(this.cs(o)) === JSON.stringify(st));
    if (still) return;
    if (st.role === 'host') s.hostOnline = false;
    else if (s.players[st.pid]) s.players[st.pid].online = false;
    await this.commit();
  }

  async onMessage(c: Connection, raw: string | ArrayBuffer) {
    let m: ClientMsg;
    try { m = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return; }
    const now = Date.now();
    if (m.t === 'ping') return this.send(c, { t: 'pong', c: m.c, s: now });

    if (m.t === 'hello') {
      if (m.role === 'host') return this.helloHost(c, m.secret, m.create, now);
      return this.helloPlayer(c, m.token, now);
    }
    const s = this.state;
    const st = this.cs(c);
    if (!s) return this.send(c, { t: 'error', msg: 'Room not found', code: 'no_room' });

    if (m.t === 'join') {
      if (st.role !== 'pending') return;
      const pid = 'p_' + rid(6), token = rid(16);
      const r = join(s, { id: pid, token, name: String(m.name ?? ''), avatar: Number(m.avatar), now });
      if (!r.ok) return this.send(c, { t: 'error', msg: r.error, code: 'join' });
      c.setState({ role: 'player', pid } satisfies ConnState);
      this.send(c, { t: 'welcome', role: 'player', pid, token });
      return this.commit();
    }
    if (m.t === 'sync') return this.sendView(c, now);
    if (m.t === 'close') {
      // Host only: wipe the room (state, alarm) so the PIN is free again; every phone gets the "party's over" screen.
      if (st.role !== 'host') return;
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      this.state = null;
      for (const o of this.getConnections()) { this.send(o, { t: 'closed' }); try { o.close(1000, 'room closed'); } catch { /* */ } }
      return;
    }
    if (m.t === 'act') {
      if (st.role === 'pending') return;
      const actor = st.role === 'host' ? { role: 'host' as const } : { role: 'player' as const, pid: st.pid };
      const res = apply(s, actor, m.a as Action, now);
      if (!res.ok) return this.send(c, { t: 'error', msg: res.error ?? 'Nope', code: 'action' });
      this.effects(res.effects);
      if (res.changed) return this.commit(res.persist);
    }
  }

  private async helloHost(c: Connection, secret: string, create: { questions: unknown; seed?: number } | undefined, now: number) {
    if (typeof secret !== 'string' || secret.length < 16) return this.send(c, { t: 'error', msg: 'Bad host link', code: 'room_taken' });
    const h = await sha256(secret);
    if (!this.state) {
      if (!create) return this.send(c, { t: 'error', msg: 'This room does not exist yet.', code: 'no_room' });
      const parsed = parseQuestions(create.questions);
      if (!parsed.ok) return this.send(c, { t: 'error', msg: parsed.errors.join('\n'), code: 'bad_questions' });
      const pin = this.name.toUpperCase();
      const seed = Number.isInteger(create.seed) ? create.seed! : seedFromPin(pin);
      try {
        this.state = newGame({ pin, secretHash: h, questions: parsed.questions, seed, now });
      } catch (e) {
        return this.send(c, { t: 'error', msg: (e as Error).message, code: 'bad_questions' });
      }
    } else if (this.state.secretHash !== h) {
      return this.send(c, { t: 'error', msg: `Room ${this.name.toUpperCase()} is already hosted from another link.`, code: 'room_taken' });
    }
    c.setState({ role: 'host' } satisfies ConnState);
    this.state.hostOnline = true;
    this.send(c, { t: 'welcome', role: 'host' });
    await this.commit();
  }

  private async helloPlayer(c: Connection, token: string | undefined, now: number) {
    const s = this.state;
    if (!s) return this.send(c, { t: 'need_join', exists: false, open: false, reason: "This room isn't open yet. Ask the birthday host for the link." });
    const p = token ? findByToken(s, token) : null;
    if (p) {
      c.setState({ role: 'player', pid: p.id } satisfies ConnState);
      p.online = true;
      this.send(c, { t: 'welcome', role: 'player', pid: p.id, token: p.token });
      return this.commit();
    }
    const open = s.phase !== 'PODIUM' && s.q <= 3;
    this.send(c, { t: 'need_join', exists: true, open, reason: open ? undefined : 'Late joining is closed. Heckle from the couch.' });
  }

  private effects(effects: Effect[]) {
    const s = this.state!;
    for (const e of effects) {
      if (e.t === 'nudge') {
        for (const c of this.getConnections()) {
          const st = this.cs(c);
          if (st.role === 'player' && e.to.includes(st.pid)) this.send(c, { t: 'nudge', from: e.from });
        }
      } else if (e.t === 'react') {
        const now = Date.now();
        const times = (this.reactTimes.get(e.pid) ?? []).filter((t) => now - t < 1000);
        if (times.length >= REACT_PER_SEC) continue; // throttled: 2/s per player
        times.push(now);
        this.reactTimes.set(e.pid, times);
        const p = s.players[e.pid];
        this.reactBuf.push({ e: e.e, name: p.name, avatar: p.avatar });
        this.flushTimer ??= setTimeout(() => this.flushReacts(), REACT_FLUSH_MS);
      }
    }
  }

  private flushReacts() {
    this.flushTimer = null;
    const items = this.reactBuf.splice(0, 40);
    if (!items.length) return;
    const msg = JSON.stringify({ t: 'reacts', items } satisfies ServerMsg);
    for (const c of this.getConnections()) if (this.cs(c).role !== 'pending') try { c.send(msg); } catch { /* */ }
  }

  private sendView(c: Connection, now: number) {
    const s = this.state;
    const st = this.cs(c);
    if (!s || st.role === 'pending') return;
    if (st.role === 'player' && s.players[st.pid]?.kicked) return this.send(c, { t: 'kicked' });
    const view = viewFor(s, st.role === 'host' ? { role: 'host' } : { role: 'player', pid: st.pid }, now, { age: BIRTHDAY.ageLine });
    this.send(c, { t: 'state', view });
  }

  /** Run due timers, persist, broadcast every client its own view, and re-arm the alarm. */
  private async commit(persist = true) {
    const s = this.state;
    if (!s) return;
    const now = Date.now();
    tick(s, now);
    if (persist) await this.ctx.storage.put('state', s);
    for (const c of this.getConnections()) this.sendView(c, now);
    const wake = nextWake(s);
    if (wake != null) await this.ctx.storage.setAlarm(Math.max(wake, now + 5));
    else await this.ctx.storage.deleteAlarm();
  }

  async onAlarm() {
    if (!this.state) this.state = (await this.ctx.storage.get<GameState>('state')) ?? null;
    if (!this.state) return;
    await this.commit();
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/health') return Response.json({ ok: true, at: Date.now() });
    const res = await routePartykitRequest(req, env as any, {
      onBeforeConnect: (_r, { name }) => (PIN_RE.test(name.toUpperCase()) ? undefined : new Response('Bad room PIN', { status: 400 })),
      onBeforeRequest: () => new Response('WebSocket only', { status: 400 }),
    });
    if (res) return res;
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/parties/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
