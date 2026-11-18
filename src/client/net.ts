// Room connection: reconnecting WebSocket (partysocket), hello/resume, clock-offset estimate,
// and a React hook that exposes the latest server view.
import { PartySocket } from 'partysocket';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Action } from '../shared/game';
import type { ClientMsg, ServerMsg } from '../shared/protocol';
import type { View } from '../shared/views';

export type Hello = { role: 'host'; secret: string; create?: { questions: unknown; seed?: number } } | { role: 'player' };

export interface RoomState {
  status: 'connecting' | 'open' | 'closed';
  view: View | null;
  welcome: { role: 'host' } | { role: 'player'; pid: string } | null;
  needJoin: { exists: boolean; open: boolean; reason?: string } | null;
  error: { msg: string; code?: string; at: number } | null;
  kicked: boolean;
}

type Listener = (m: ServerMsg) => void;

const tokenKey = (pin: string) => `bday:${pin}:token`;
export const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del(k: string) { try { localStorage.removeItem(k); } catch { /* */ } },
};

/** Server clock − local clock, from the ping with the smallest round trip (PRD §9 "Timer integrity"). */
let offset = 0;
let bestRtt = Infinity;
export const serverNow = () => Date.now() + offset;

export class Room {
  ws: PartySocket;
  state: RoomState = { status: 'connecting', view: null, welcome: null, needJoin: null, error: null, kicked: false };
  private subs = new Set<() => void>();
  private listeners = new Set<Listener>();
  private pings = 0;

  constructor(public pin: string, private hello: Hello) {
    this.ws = new PartySocket({ host: location.host, party: 'room', room: pin.toUpperCase() });
    this.ws.addEventListener('open', () => this.onOpen());
    this.ws.addEventListener('close', () => this.set({ status: 'closed' }));
    this.ws.addEventListener('message', (e) => this.onMessage(JSON.parse(e.data as string)));
    document.addEventListener('visibilitychange', this.onVisible);
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible') {
      if (this.ws.readyState !== WebSocket.OPEN) this.ws.reconnect();
      else this.raw({ t: 'sync' });
    }
  };

  private onOpen() {
    this.set({ status: 'open' });
    bestRtt = Infinity;
    this.pings = 0;
    this.ping();
    if (this.hello.role === 'host') this.raw({ t: 'hello', role: 'host', secret: this.hello.secret, create: this.hello.create });
    else this.raw({ t: 'hello', role: 'player', token: store.get(tokenKey(this.pin)) ?? undefined });
  }

  private ping() {
    if (this.pings++ >= 5) return;
    this.raw({ t: 'ping', c: Date.now() });
    setTimeout(() => this.ping(), 400);
  }

  private onMessage(m: ServerMsg) {
    switch (m.t) {
      case 'pong': {
        const now = Date.now();
        const rtt = now - m.c;
        if (rtt < bestRtt) { bestRtt = rtt; offset = m.s - (m.c + rtt / 2); }
        break;
      }
      case 'welcome':
        if (m.role === 'player') store.set(tokenKey(this.pin), m.token);
        this.set({ welcome: m.role === 'host' ? { role: 'host' } : { role: 'player', pid: m.pid }, needJoin: null, error: null });
        break;
      case 'need_join': this.set({ needJoin: m, welcome: null }); break;
      case 'state':
        if (bestRtt === Infinity) offset = m.view.serverNow - Date.now();
        this.set({ view: m.view });
        break;
      case 'error': this.set({ error: { msg: m.msg, code: m.code, at: Date.now() } }); break;
      case 'kicked': store.del(tokenKey(this.pin)); this.set({ kicked: true }); break;
    }
    for (const l of this.listeners) l(m);
  }

  raw(m: ClientMsg) { if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m)); }
  act(a: Action) { this.raw({ t: 'act', a }); }
  join(name: string, avatar: number) { this.raw({ t: 'join', name, avatar }); }
  setHello(h: Hello) { this.hello = h; }
  clearError() { this.set({ error: null }); }
  on(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }

  private set(p: Partial<RoomState>) {
    this.state = { ...this.state, ...p };
    for (const s of this.subs) s();
  }
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f); }; };
  snapshot = () => this.state;
  close() { document.removeEventListener('visibilitychange', this.onVisible); this.ws.close(); }
}

export function useRoom(pin: string | null, hello: Hello | null): [RoomState, Room | null] {
  const ref = useRef<Room | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  useEffect(() => {
    if (!pin || !hello) return;
    const r = new Room(pin, hello);
    ref.current = r;
    setRoom(r);
    return () => r.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, hello && JSON.stringify(hello)]);
  const empty: RoomState = { status: 'connecting', view: null, welcome: null, needJoin: null, error: null, kicked: false };
  const state = useSyncExternalStore(room?.subscribe ?? noopSub, room?.snapshot ?? (() => empty));
  return [state, room];
}
const noopSub = () => () => {};

/** Re-render every `ms` so countdowns stay live. */
export function useNow(ms = 250): number {
  const [, set] = useState(0);
  useEffect(() => { const id = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(id); }, [ms]);
  return serverNow();
}

export function secondsLeft(view: View | null, now: number): number {
  if (!view) return 0;
  if (view.paused) return Math.ceil((view.pausedLeft ?? 0) / 1000);
  if (view.endsAt == null) return 0;
  return Math.max(0, Math.ceil((view.endsAt - now) / 1000));
}

/** Screen Wake Lock during play where supported (PRD §9 "Phone lifecycle"). */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return;
    let lock: any = null;
    let dead = false;
    const req = async () => { try { lock = await (navigator as any).wakeLock.request('screen'); } catch { /* denied */ } };
    const vis = () => { if (document.visibilityState === 'visible' && !dead) req(); };
    req();
    document.addEventListener('visibilitychange', vis);
    return () => { dead = true; document.removeEventListener('visibilitychange', vis); lock?.release?.(); };
  }, [on]);
}
