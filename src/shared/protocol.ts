// Wire protocol between phones and the room (one Durable Object per PIN).
import type { Action } from './game';
import type { View } from './views';

export type ClientMsg =
  | { t: 'hello'; role: 'host'; secret: string; create?: { questions: unknown; seed?: number } }
  | { t: 'hello'; role: 'player'; token?: string }
  | { t: 'join'; name: string; avatar: number }
  | { t: 'ping'; c: number }
  | { t: 'sync' }
  | { t: 'act'; a: Action };

export type ServerMsg =
  | { t: 'welcome'; role: 'host' }
  | { t: 'welcome'; role: 'player'; pid: string; token: string }
  | { t: 'need_join'; exists: boolean; open: boolean; reason?: string }
  | { t: 'state'; view: View }
  | { t: 'pong'; c: number; s: number }
  | { t: 'error'; msg: string; code?: 'room_taken' | 'no_room' | 'bad_questions' | 'join' | 'action' }
  | { t: 'nudge'; from: string }
  | { t: 'reacts'; items: { e: string; name: string; avatar: number }[] }
  | { t: 'kicked' };

export const PIN_RE = /^[A-Z]{4}$/;
