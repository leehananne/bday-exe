// The game as a pure state machine (PRD §10: "write the game logic as a pure reducer").
// The Durable Object owns one GameState per room and calls `apply()` for every client
// message and `tick()` from its alarm. Nothing here touches the network, clock or storage.
import { ALL_KINDS, DURATION, SCAM_KINDS, scheduleChaos } from './chaos';
import { allowedFor, compatible, delta, planModifiers, validate } from './modifiers';
import { LIMITS, levenshtein, norm } from './questions';
import { hash, mulberry32 } from './rng';
import type {
  AnswerValue, ChaosConfig, ChaosEvent, GameState, ModifierId, Outcome, Phase, Player, PlayerId,
  QResult, Question, Resolved, RevealStep, Round, Verdict,
} from './types';

// MODIFIER = the Spotlight reveal: slam-in 0.6s, hold to 3.3s, fly-up to 3.7s. The bet timer starts after it.
export const TIMING = { MODIFIER: 3700, BET: 10000, GRACE: 300, POWER_CUTOFF: 5000, POPUP_DELAY: 1000, LEADERBOARD: 10000 };
export const DEFAULT_AUTO = { reveal: true, next: false };
export const autoOf = (s: GameState) => s.auto ?? DEFAULT_AUTO;

/** How long each reveal step stays up when the reveal plays itself (ms). */
export function stepDuration(s: GameState, step: RevealStep): number {
  const t = curQ(s)?.type;
  if (step === 'mystery') return 3500;
  if (step === 'split') return t === 'fave' ? 6000 : 3500;
  if (step === 'answer') return t === 'fave' ? 6000 : 4000;
  return s.q >= N(s) ? 6000 : 5000; // points
}
export const CHIPS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
export const REACTIONS = ['😂', '💀', '🎂', '🔥', ':P', ';)', '(Y)', '🤡'] as const;
export const MAX_PLAYERS = 40;
export const LATE_JOIN_UNTIL = 3;

export type Action =
  // host
  | { t: 'setPlan'; plan: ModifierId[]; locked: boolean[] }
  | { t: 'reroll' }
  | { t: 'setChaos'; chaos: ChaosConfig }
  | { t: 'setFlags'; calm?: boolean; powerups?: boolean; autoReveal?: boolean; autoNext?: boolean }
  | { t: 'kick'; pid: PlayerId }
  | { t: 'start' }
  | { t: 'pause' }
  | { t: 'resume' }
  | { t: 'hold' }
  | { t: 'addTime' }
  | { t: 'endNow' }
  | { t: 'judge'; key: string; verdict: Verdict | null }
  | { t: 'crown'; pid: PlayerId | null }
  | { t: 'lol'; pid: PlayerId }
  | { t: 'setReal'; value: number | null }
  | { t: 'finishJudging' }
  | { t: 'revealNext' }
  | { t: 'back' }
  | { t: 'next' }
  | { t: 'skip' }
  | { t: 'swapModifier'; q: number; m: ModifierId }
  | { t: 'roast'; text: string }
  | { t: 'nudgeAll' }
  | { t: 'resetGame' }
  // player
  | { t: 'bet'; chip: number }
  | { t: 'answer'; v: AnswerValue }
  | { t: 'react'; e: string }
  | { t: 'nudge'; to: PlayerId }
  | { t: 'popup'; to: PlayerId }
  | { t: 'dismiss'; id: string; ms: number }
  | { t: 'chopeClear'; id: string };

export const HOST_ACTIONS = new Set<Action['t']>([
  'setPlan', 'reroll', 'setChaos', 'setFlags', 'kick', 'start', 'pause', 'resume', 'hold', 'addTime', 'endNow', 'judge', 'crown',
  'lol', 'setReal', 'finishJudging', 'revealNext', 'back', 'next', 'skip', 'swapModifier', 'roast', 'nudgeAll', 'resetGame',
]);

export type Actor = { role: 'host' } | { role: 'player'; pid: PlayerId };

export type Effect =
  | { t: 'nudge'; to: PlayerId[]; from: string }
  | { t: 'react'; pid: PlayerId; e: string };

export interface ApplyResult { ok: boolean; error?: string; changed: boolean; persist: boolean; effects: Effect[] }

const ok = (effects: Effect[] = [], persist = true): ApplyResult => ({ ok: true, changed: true, persist, effects });
const fail = (error: string): ApplyResult => ({ ok: false, error, changed: false, persist: false, effects: [] });

// ---------------------------------------------------------------- construction

export const DEFAULT_CHAOS: ChaosConfig = { intensity: 'chaos', enabled: [...ALL_KINDS], mercy: true };

export function emptyRound(): Round {
  return { bets: {}, answers: {}, judging: { verdicts: {}, crowned: null, lols: [], real: null }, mystery: null, result: null, skipped: false, answerStart: null };
}

export function newGame(o: { pin: string; secretHash: string; questions: Question[]; seed: number; now: number }): GameState {
  const locked = o.questions.map((q, i) => !!q.modifier || i === 0 || i === o.questions.length - 1);
  // Q1 is always NORMAL; the final defaults to DOUBLE TROUBLE, or DOUBLE when its type can't take a penalty (C6).
  const lockedVals = o.questions.map((q, i) => q.modifier ?? (i === 0 ? 'normal' : i === o.questions.length - 1 ? (compatible('trouble', q.type) ? 'trouble' : 'double') : null));
  return {
    v: 1, pin: o.pin, seed: o.seed, planSeed: o.seed, secretHash: o.secretHash, createdAt: o.now,
    questions: o.questions, plan: planModifiers(o.questions, o.seed, lockedVals), locked,
    chaos: { ...DEFAULT_CHAOS, enabled: [...DEFAULT_CHAOS.enabled] }, calm: false, powerups: true, auto: { ...DEFAULT_AUTO },
    phase: 'LOBBY', q: 0, endsAt: null, pausedAt: null, pausedLeft: null, phaseStartedAt: o.now, revealStep: 0, roast: '',
    players: {}, order: [], rounds: o.questions.map(emptyRound), chaosQueue: [], popups: [], hostOnline: true,
  };
}

// ---------------------------------------------------------------- queries

export const N = (s: GameState) => s.questions.length;
export const cur = (s: GameState): Round | null => (s.q > 0 ? s.rounds[s.q - 1] : null);
export const curQ = (s: GameState): Question | null => (s.q > 0 ? s.questions[s.q - 1] : null);
export const active = (s: GameState): Player[] => s.order.map((id) => s.players[id]).filter((p) => p && !p.kicked);
export const needsJudge = (q: Question) => q.type === 'typed' || q.type === 'fave' || q.type === 'number';
export const timed = (p: Phase) => p === 'MODIFIER' || p === 'BET' || p === 'ANSWER';
/** Phases whose timer only exists on autopilot (pausable, but no +10s / End now). */
export const autoTimed = (p: Phase) => p === 'REVEAL' || p === 'LEADERBOARD';

export function stepsFor(s: GameState, q = s.q): RevealStep[] {
  return s.plan[q - 1] === 'mystery' ? ['mystery', 'split', 'answer', 'points'] : ['split', 'answer', 'points'];
}
export const step = (s: GameState): RevealStep | null => (s.phase === 'REVEAL' ? stepsFor(s)[s.revealStep] : null);

/** Chips this player can still spend, ignoring the current round's bet. */
export function chipsLeft(s: GameState, pid: PlayerId, includeCurrentBet = false): number[] {
  const spent = new Set<number>();
  s.rounds.forEach((r, i) => {
    if (r.skipped) return;
    if (!includeCurrentBet && i === s.q - 1) return;
    if (r.bets[pid] != null) spent.add(r.bets[pid]);
  });
  return CHIPS.filter((c) => !spent.has(c));
}

/** The modifier that actually applies to question q (MYSTERY resolved). */
export const resolvedMod = (s: GameState, q: number): Resolved | null => {
  const m = s.plan[q - 1];
  return m === 'mystery' ? s.rounds[q - 1].mystery : m;
};

/** Score totals. `through` = last question number whose result counts. */
export function totals(s: GameState, through: number): Record<PlayerId, number> {
  const t: Record<PlayerId, number> = {};
  for (const p of active(s)) t[p.id] = 0;
  for (let i = 0; i < Math.min(through, s.rounds.length); i++) {
    const r = s.rounds[i];
    if (r.skipped || !r.result) continue;
    for (const [pid, d] of Object.entries(r.result.delta)) if (pid in t) t[pid] += d;
  }
  return t;
}

export interface Standing { pid: PlayerId; score: number; rank: number }
export function standings(s: GameState, through: number): Standing[] {
  const t = totals(s, through);
  const rows = active(s).map((p) => ({ pid: p.id, score: t[p.id] ?? 0, rank: 0 }));
  rows.sort((a, b) => b.score - a.score || s.order.indexOf(a.pid) - s.order.indexOf(b.pid));
  rows.forEach((r, i) => (r.rank = i > 0 && rows[i - 1].score === r.score ? rows[i - 1].rank : i + 1));
  return rows;
}

/** How far the scoreboard may show results: the current round only once its points are revealed. */
export function visibleThrough(s: GameState): number {
  if (s.phase === 'LEADERBOARD' || s.phase === 'PODIUM') return s.q;
  if (s.phase === 'REVEAL' && step(s) === 'points') return s.q;
  return Math.max(0, s.q - 1);
}

export function activeChaosFor(s: GameState, pid: PlayerId): ChaosEvent | null {
  return s.chaosQueue.find((e) => e.player === pid && e.fired && !e.ended && e.kind !== 'auntie_chope') ?? null;
}
export function chopeFor(s: GameState, pid: PlayerId): ChaosEvent | null {
  return s.chaosQueue.find((e) => e.player === pid && e.fired && !e.ended && e.kind === 'auntie_chope') ?? null;
}

// ---------------------------------------------------------------- typed answers

export interface TypedGroup { key: string; display: string; count: number; pids: PlayerId[]; verdict: Verdict | null; accepted: boolean; similarTo: string | null }

export function typedGroups(s: GameState, q = s.q): TypedGroup[] {
  const question = s.questions[q - 1];
  const r = s.rounds[q - 1];
  const accept = (question.accept ?? []).map(norm);
  const by = new Map<string, { raws: Map<string, number>; pids: PlayerId[] }>();
  for (const [pid, a] of Object.entries(r.answers)) {
    if (!s.players[pid] || s.players[pid].kicked) continue;
    const raw = String(a.v).trim();
    const key = norm(raw) || raw.toLowerCase();
    const g = by.get(key) ?? { raws: new Map<string, number>(), pids: [] as PlayerId[] };
    g.raws.set(raw, (g.raws.get(raw) ?? 0) + 1);
    g.pids.push(pid);
    by.set(key, g);
  }
  const groups = [...by.entries()].map(([key, g]) => {
    const display = [...g.raws.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const accepted = accept.includes(key);
    const near = accepted ? null : accept.find((a) => levenshtein(a, key) <= Math.max(1, Math.floor(a.length / 4))) ?? null;
    const verdict = r.judging.verdicts[key] ?? (accepted ? 'right' : null);
    return { key, display, count: g.pids.length, pids: g.pids, verdict, accepted, similarTo: near };
  });
  return groups.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

// ---------------------------------------------------------------- crowd's pick

export function crowdTally(s: GameState, q = s.q): { counts: Record<string, number>; winners: string[] } {
  const r = s.rounds[q - 1];
  const counts: Record<string, number> = {};
  for (const [pid, a] of Object.entries(r.answers)) {
    if (!s.players[pid] || s.players[pid].kicked) continue;
    counts[String(a.v)] = (counts[String(a.v)] ?? 0) + 1;
  }
  const max = Math.max(0, ...Object.values(counts));
  const winners = max > 0 ? Object.keys(counts).filter((k) => counts[k] === max) : [];
  return { counts, winners };
}

// ---------------------------------------------------------------- scoring

export function computeResult(s: GameState, q = s.q): QResult {
  const question = s.questions[q - 1];
  const r = s.rounds[q - 1];
  const m = resolvedMod(s, q) ?? 'normal';
  const outcome: Record<PlayerId, Outcome> = {};
  const deltas: Record<PlayerId, number> = {};
  const participants = Object.keys(r.bets).filter((pid) => s.players[pid] && !s.players[pid].kicked);

  let groups: TypedGroup[] = [];
  let tally: ReturnType<typeof crowdTally> | null = null;
  let closest = Infinity;
  if (question.type === 'typed') groups = typedGroups(s, q);
  if (question.type === 'crowd') tally = crowdTally(s, q);
  if (question.type === 'number' && r.judging.real != null) {
    for (const pid of participants) {
      const a = r.answers[pid];
      if (a) closest = Math.min(closest, Math.abs(Number(a.v) - r.judging.real));
    }
  }

  for (const pid of participants) {
    const a = r.answers[pid];
    let o: Outcome = 'wrong'; // no answer counts as wrong (PRD §6)
    switch (question.type) {
      case 'mc':
        o = a && Number(a.v) === question.answer ? 'right' : 'wrong';
        break;
      case 'typed': {
        if (a) {
          const g = groups.find((g) => g.pids.includes(pid));
          o = g?.verdict === 'right' ? 'right' : g?.verdict === 'lol' ? 'lol' : 'wrong';
        }
        break;
      }
      case 'fave':
        o = r.judging.crowned === pid ? 'crowned' : r.judging.lols.includes(pid) ? 'lol' : 'none';
        break;
      case 'crowd':
        o = a && tally!.winners.includes(String(a.v)) ? 'right' : 'wrong';
        break;
      case 'number':
        if (r.judging.real == null) o = 'none';
        else if (a) {
          const d = Math.abs(Number(a.v) - r.judging.real);
          o = d === closest ? (d === 0 ? 'exact' : 'right') : 'wrong';
        }
        break;
    }
    outcome[pid] = o;
    deltas[pid] = delta(r.bets[pid], o, m);
  }
  return { resolved: m, outcome, delta: deltas };
}

// ---------------------------------------------------------------- transitions

function startQuestion(s: GameState, q: number, now: number) {
  s.q = q;
  s.rounds[q - 1] = emptyRound();
  s.chaosQueue = [];
  s.popups = [];
  s.roast = '';
  s.revealStep = 0;
  s.pausedAt = s.pausedLeft = null;
  enter(s, 'MODIFIER', now, TIMING.MODIFIER);
}

function enter(s: GameState, phase: Phase, now: number, duration: number | null = null) {
  s.phase = phase;
  s.phaseStartedAt = now;
  s.endsAt = duration == null ? null : now + duration;
}

function cowardsTax(s: GameState) {
  const r = cur(s)!;
  for (const p of active(s)) {
    if (r.bets[p.id] != null) continue;
    const left = chipsLeft(s, p.id);
    r.bets[p.id] = left.length ? left[0] : 0;
  }
}

function beginAnswer(s: GameState, now: number) {
  const q = curQ(s)!;
  const r = cur(s)!;
  enter(s, 'ANSWER', now, q.seconds * 1000);
  r.answerStart = now;
  // Mercy rule: skip whoever is currently last.
  let eligible = active(s).filter((p) => r.bets[p.id] != null);
  if (s.chaos.mercy && eligible.length > 1) {
    const st = standings(s, s.q - 1);
    const lastScore = st[st.length - 1]?.score;
    const allTied = st.every((x) => x.score === lastScore);
    if (!allTied) eligible = eligible.filter((p) => st.find((x) => x.pid === p.id)?.score !== lastScore);
  }
  s.chaosQueue = scheduleChaos(s, s.q, now, s.endsAt!, eligible);
  for (const e of s.chaosQueue) {
    const p = s.players[e.player];
    p.chaosCount++;
    p.chaosSeen.push(e.kind);
  }
}

function closeAnswers(s: GameState, now: number) {
  const q = curQ(s)!;
  const r = cur(s)!;
  for (const e of s.chaosQueue) e.ended = true;
  s.popups = [];
  if (s.plan[s.q - 1] === 'mystery' && !r.mystery) {
    const rng = mulberry32(hash(s.seed, 'mystery', s.q));
    r.mystery = (['double', 'risky', 'trouble'] as const)[Math.floor(rng() * 3)];
  }
  if (needsJudge(q)) enter(s, 'JUDGE', now);
  else toReveal(s, now);
}

function toReveal(s: GameState, now: number) {
  cur(s)!.result = computeResult(s);
  s.revealStep = 0;
  enter(s, 'REVEAL', now, autoOf(s).reveal ? stepDuration(s, stepsFor(s)[0]) : null);
}

/** Advance one reveal step (host tap or autopilot timer). */
function nextStep(s: GameState, now: number) {
  if (s.revealStep < stepsFor(s).length - 1) {
    s.revealStep++;
    s.endsAt = autoOf(s).reveal ? now + stepDuration(s, stepsFor(s)[s.revealStep]) : null;
  } else endQuestion(s, now);
}

function endQuestion(s: GameState, now: number) {
  s.pausedAt = s.pausedLeft = null;
  if (s.q >= N(s)) enter(s, 'PODIUM', now);
  else enter(s, 'LEADERBOARD', now, autoOf(s).next ? TIMING.LEADERBOARD : null);
}

function processChaos(s: GameState, now: number) {
  const r = cur(s)!;
  for (const e of s.chaosQueue) {
    if (!e.fired && e.at <= now) {
      // At most one card-zone overlay at a time: a scheduled event waits behind an active pop-up.
      const blocking = e.kind !== 'auntie_chope' && activeChaosFor(s, e.player);
      if (blocking && blocking.until != null) {
        const d = DURATION[e.kind] ?? 5000;
        e.at = blocking.until + 150;
        e.until = e.at + d;
        continue;
      }
      e.fired = true;
      if (e.kind === 'auntie_chope') {
        // Never on the player's current selection.
        const n = curQ(s)!.options?.length ?? 4;
        const sel = r.answers[e.player]?.v;
        if (e.data?.tile === Number(sel)) e.data.tile = (e.data.tile + 1) % n;
      }
    }
    if (e.fired && !e.ended && e.until != null && e.until <= now) e.ended = true;
  }
  // Player-sent pop-ups: wait for answerStart + delay, never in the last 5s, never over another overlay.
  const keep = [];
  for (const p of s.popups) {
    if (p.q !== s.q) continue;
    if (now >= s.endsAt! - TIMING.POWER_CUTOFF) continue; // dropped
    if (now < (r.answerStart ?? now) + TIMING.POPUP_DELAY || activeChaosFor(s, p.to)) { keep.push(p); continue; }
    s.chaosQueue.push({ id: `p_${s.q}_${p.from}`, kind: p.kind, player: p.to, q: s.q, at: now, until: now + 5000, fired: true, from: p.from });
  }
  s.popups = keep;
}

/** Advance any timers that are due. Call after every action and from the alarm. */
export function tick(s: GameState, now: number): boolean {
  if (s.pausedAt != null) return false;
  let changed = false;
  for (let guard = 0; guard < 8; guard++) {
    if (s.phase === 'MODIFIER' && now >= s.endsAt!) { enter(s, 'BET', now, TIMING.BET); changed = true; continue; }
    if (s.phase === 'BET' && now >= s.endsAt! + TIMING.GRACE) { cowardsTax(s); beginAnswer(s, now); changed = true; continue; }
    if (s.phase === 'ANSWER') {
      const before = JSON.stringify(s.chaosQueue) + s.popups.length;
      processChaos(s, now);
      if (JSON.stringify(s.chaosQueue) + s.popups.length !== before) changed = true;
      if (now >= s.endsAt! + TIMING.GRACE) { closeAnswers(s, now); changed = true; continue; }
    }
    if (s.phase === 'REVEAL' && s.endsAt != null && now >= s.endsAt) { nextStep(s, now); changed = true; continue; }
    if (s.phase === 'LEADERBOARD' && s.endsAt != null && now >= s.endsAt) { startQuestion(s, s.q + 1, now); changed = true; continue; }
    break;
  }
  return changed;
}

/** When the room next needs `tick()` (the Durable Object alarm time). */
export function nextWake(s: GameState): number | null {
  if (s.pausedAt != null || s.endsAt == null) return null;
  if (autoTimed(s.phase)) return s.endsAt;
  if (!timed(s.phase)) return null;
  if (s.phase === 'MODIFIER') return s.endsAt;
  if (s.phase === 'BET') return s.endsAt + TIMING.GRACE;
  const times = [s.endsAt + TIMING.GRACE];
  for (const e of s.chaosQueue) {
    if (!e.fired) times.push(e.at);
    else if (!e.ended && e.until != null) times.push(e.until);
  }
  const r = cur(s)!;
  if (s.popups.length && r.answerStart != null) times.push(r.answerStart + TIMING.POPUP_DELAY);
  return Math.min(...times);
}

// ---------------------------------------------------------------- joining

export function join(s: GameState, o: { id: PlayerId; token: string; name: string; avatar: number; now: number }): { ok: true; pid: PlayerId } | { ok: false; error: string } {
  if (s.phase === 'PODIUM') return { ok: false, error: 'The party is over. It is now safe to put your phone down.' };
  if (s.q > LATE_JOIN_UNTIL) return { ok: false, error: `Late joining closed after Q${LATE_JOIN_UNTIL}. Heckle from the couch.` };
  if (active(s).length >= MAX_PLAYERS) return { ok: false, error: 'Room is full.' };
  let name = o.name.replace(/\s+/g, ' ').trim().slice(0, LIMITS.name);
  if (!name) return { ok: false, error: 'Pick a screen name.' };
  const taken = new Set(active(s).map((p) => p.name.toLowerCase()));
  if (taken.has(name.toLowerCase())) {
    let i = 2;
    const base = name.slice(0, LIMITS.name - 2);
    while (taken.has(`${base}${i}`.toLowerCase())) i++;
    name = `${base}${i}`;
  }
  const avatar = Number.isInteger(o.avatar) ? ((o.avatar % 8) + 8) % 8 : 0;
  s.players[o.id] = {
    id: o.id, token: o.token, name, avatar, joinedAt: o.now, online: true, kicked: false,
    power: { nudge: 1, popup: 1 }, chaosCount: 0, chaosSeen: [], chaosMs: 0, reactions: 0,
  };
  s.order.push(o.id);
  return { ok: true, pid: o.id };
}

export function findByToken(s: GameState, token: string): Player | null {
  return Object.values(s.players).find((p) => p.token === token && !p.kicked) ?? null;
}

// ---------------------------------------------------------------- actions

function validAnswer(s: GameState, q: Question, v: AnswerValue): AnswerValue | null {
  switch (q.type) {
    case 'mc': {
      const i = Number(v);
      return Number.isInteger(i) && i >= 0 && i < (q.options?.length ?? 0) ? i : null;
    }
    case 'crowd': {
      const k = String(v);
      if (q.options?.length) return /^o:\d+$/.test(k) && Number(k.slice(2)) < q.options.length ? k : null;
      return s.players[k] && !s.players[k].kicked ? k : null;
    }
    case 'typed':
    case 'fave': {
      const t = String(v).replace(/\s+/g, ' ').trim();
      const max = q.type === 'typed' ? LIMITS.typed : LIMITS.fave;
      return t && t.length <= max ? t : null;
    }
    case 'number': {
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 && n <= 999_999_999 ? n : null;
    }
  }
}

const inLastSeconds = (s: GameState, now: number) => s.phase === 'ANSWER' && s.endsAt != null && now >= s.endsAt - TIMING.POWER_CUTOFF;

export function apply(s: GameState, actor: Actor, a: Action, now: number): ApplyResult {
  if (HOST_ACTIONS.has(a.t) && actor.role !== 'host') return fail('Host only');
  const r = cur(s);
  const q = curQ(s);

  if (actor.role === 'host') {
    switch (a.t) {
      case 'setPlan': {
        if (s.phase !== 'LOBBY') return fail('The plan is locked once the game starts. Use "swap next modifier".');
        if (!Array.isArray(a.plan) || a.plan.length !== N(s)) return fail('Bad plan');
        const v = validate(a.plan, s.questions);
        if (!v.ok) return fail(v.errors[0].msg);
        s.plan = [...a.plan];
        s.locked = s.questions.map((_, i) => !!a.locked?.[i]);
        return ok();
      }
      case 'reroll': {
        if (s.phase !== 'LOBBY') return fail('Game already started');
        s.planSeed++;
        try {
          s.plan = planModifiers(s.questions, s.planSeed, s.plan.map((m, i) => (s.locked[i] ? m : null)));
        } catch (e) {
          return fail((e as Error).message);
        }
        return ok();
      }
      case 'setChaos': {
        const c = a.chaos;
        if (!c || !['off', 'mild', 'chaos'].includes(c.intensity)) return fail('Bad chaos settings');
        s.chaos = { intensity: c.intensity, mercy: !!c.mercy, enabled: ALL_KINDS.filter((k) => c.enabled?.includes(k)) };
        return ok();
      }
      case 'setFlags':
        if (a.calm != null) s.calm = !!a.calm;
        if (a.powerups != null) s.powerups = !!a.powerups;
        if (a.autoReveal != null || a.autoNext != null) {
          const au = { ...autoOf(s) };
          if (a.autoReveal != null) au.reveal = !!a.autoReveal;
          if (a.autoNext != null) au.next = !!a.autoNext;
          s.auto = au;
          // Apply to the screen that's up right now.
          if (s.pausedAt == null) {
            if (s.phase === 'REVEAL') s.endsAt = au.reveal ? now + stepDuration(s, stepsFor(s)[s.revealStep]) : null;
            if (s.phase === 'LEADERBOARD') s.endsAt = au.next ? now + TIMING.LEADERBOARD : null;
          }
        }
        return ok();
      case 'kick': {
        const p = s.players[a.pid];
        if (!p) return fail('No such player');
        p.kicked = true;
        p.online = false;
        return ok();
      }
      case 'start': {
        if (s.phase !== 'LOBBY') return fail('Already started');
        if (!active(s).length) return fail('Nobody has joined yet');
        const v = validate(s.plan, s.questions);
        if (!v.ok) return fail(`Fix the plan first: ${v.errors[0].msg}`);
        startQuestion(s, 1, now);
        return ok();
      }
      case 'pause':
        if (!(timed(s.phase) || autoTimed(s.phase)) || s.endsAt == null || s.pausedAt != null) return fail('Nothing to pause');
        s.pausedAt = now;
        s.pausedLeft = Math.max(0, s.endsAt! - now);
        s.endsAt = null;
        return ok();
      case 'hold':
        // Stop the autopilot on this screen (host keeps talking); tap Next to continue.
        if (!autoTimed(s.phase)) return fail('Nothing to hold');
        s.endsAt = null;
        s.pausedAt = s.pausedLeft = null;
        return ok();
      case 'resume': {
        if (s.pausedAt == null) return fail('Not paused');
        const shift = now - s.pausedAt;
        s.endsAt = now + s.pausedLeft!;
        for (const e of s.chaosQueue) {
          if (!e.fired) e.at += shift;
          if (e.until != null && !e.ended) e.until += shift;
        }
        if (r?.answerStart != null && s.phase === 'ANSWER') r.answerStart += shift;
        s.pausedAt = s.pausedLeft = null;
        return ok();
      }
      case 'addTime':
        if (!timed(s.phase)) return fail('No timer running');
        if (s.pausedAt != null) s.pausedLeft! += 10_000;
        else s.endsAt! += 10_000;
        return ok();
      case 'endNow':
        if (!timed(s.phase)) return fail('No timer running');
        if (s.pausedAt != null) { s.pausedAt = s.pausedLeft = null; }
        s.endsAt = now - TIMING.GRACE;
        return ok();
      case 'judge': {
        if (s.phase !== 'JUDGE' || q?.type !== 'typed') return fail('Not judging a typed answer');
        if (a.verdict == null) delete r!.judging.verdicts[a.key];
        else if (['right', 'wrong', 'lol'].includes(a.verdict)) r!.judging.verdicts[a.key] = a.verdict;
        else return fail('Bad verdict');
        return ok();
      }
      case 'crown': {
        if (s.phase !== 'JUDGE' || q?.type !== 'fave') return fail('Not picking a fave');
        if (a.pid != null && !r!.answers[a.pid]) return fail('No such answer');
        r!.judging.crowned = a.pid;
        r!.judging.lols = r!.judging.lols.filter((p) => p !== a.pid);
        return ok();
      }
      case 'lol': {
        if (s.phase !== 'JUDGE' || q?.type !== 'fave') return fail('Not picking a fave');
        if (!r!.answers[a.pid]) return fail('No such answer');
        const j = r!.judging;
        if (j.lols.includes(a.pid)) j.lols = j.lols.filter((p) => p !== a.pid);
        else {
          if (j.lols.length >= 3) return fail('Max 3 +lol bonuses');
          if (j.crowned === a.pid) return fail('Already crowned');
          j.lols.push(a.pid);
        }
        return ok();
      }
      case 'setReal': {
        if (s.phase !== 'JUDGE' || q?.type !== 'number') return fail('Not a closest-number question');
        if (a.value != null && !(Number.isInteger(a.value) && a.value >= 0)) return fail('Whole numbers only');
        r!.judging.real = a.value;
        return ok();
      }
      case 'finishJudging':
        if (s.phase !== 'JUDGE') return fail('Not judging');
        if (q!.type === 'number' && r!.judging.real == null) return fail('Enter the real number first');
        toReveal(s, now);
        return ok();
      case 'revealNext':
        if (s.phase !== 'REVEAL') return fail('Not revealing');
        s.pausedAt = s.pausedLeft = null;
        nextStep(s, now);
        return ok();
      case 'back':
        if (s.phase === 'REVEAL') {
          s.endsAt = null; // going back holds the autopilot
          s.pausedAt = s.pausedLeft = null;
          if (s.revealStep > 0) s.revealStep--;
          else if (needsJudge(q!)) { r!.result = null; enter(s, 'JUDGE', now); }
          else return fail('Nothing to go back to');
          return ok();
        }
        if (s.phase === 'LEADERBOARD' || s.phase === 'PODIUM') {
          if (r!.skipped) return fail('That question was skipped');
          s.revealStep = stepsFor(s).length - 1;
          s.pausedAt = s.pausedLeft = null;
          enter(s, 'REVEAL', now); // held: no autopilot timer after going back
          return ok();
        }
        return fail('Nothing to go back to');
      case 'next':
        if (s.phase !== 'LEADERBOARD') return fail('Finish the reveal first');
        if (s.q >= N(s)) enter(s, 'PODIUM', now);
        else startQuestion(s, s.q + 1, now);
        return ok();
      case 'skip':
        if (!['MODIFIER', 'BET', 'ANSWER', 'JUDGE', 'REVEAL'].includes(s.phase)) return fail('Nothing to skip');
        r!.skipped = true;
        r!.bets = {};
        r!.result = null;
        for (const e of s.chaosQueue) e.ended = true;
        s.popups = [];
        s.pausedAt = s.pausedLeft = null;
        endQuestion(s, now);
        return ok();
      case 'swapModifier': {
        const target = a.q;
        if (!(target >= 1 && target <= N(s))) return fail('Bad question');
        if (s.phase !== 'LOBBY' && target <= s.q) return fail(`Q${target} has already started`);
        if (!allowedFor(target, s.questions[target - 1].type, N(s)).includes(a.m)) return fail('Not allowed on that question');
        const plan = [...s.plan];
        plan[target - 1] = a.m;
        const v = validate(plan, s.questions);
        if (!v.ok) return fail(v.errors[0].msg);
        s.plan = plan;
        return ok();
      }
      case 'roast':
        s.roast = String(a.text ?? '').slice(0, 90);
        return ok();
      case 'nudgeAll': {
        if (s.phase !== 'ANSWER' && s.phase !== 'BET') return fail('Nudge during a question');
        const book = s.phase === 'BET' ? r!.bets : r!.answers;
        const to = active(s).filter((p) => book[p.id] == null).map((p) => p.id);
        return ok([{ t: 'nudge', to, from: 'Anne' }], false);
      }
      case 'resetGame':
        s.phase = 'LOBBY';
        s.q = 0;
        s.endsAt = s.pausedAt = s.pausedLeft = null;
        s.rounds = s.questions.map(emptyRound);
        s.chaosQueue = [];
        s.popups = [];
        s.roast = '';
        for (const p of active(s)) Object.assign(p, { power: { nudge: 1, popup: 1 }, chaosCount: 0, chaosSeen: [], chaosMs: 0, reactions: 0 });
        return ok();
    }
    return fail('Unknown action');
  }

  // ---------------- player
  const me = s.players[actor.pid];
  if (!me || me.kicked) return fail('You are not in this room');
  switch (a.t) {
    case 'bet': {
      if (s.phase !== 'BET' || now > s.endsAt! + TIMING.GRACE) return fail('Betting is closed');
      if (!chipsLeft(s, me.id).includes(a.chip)) return fail('That chip is spent');
      r!.bets[me.id] = a.chip;
      return ok();
    }
    case 'answer': {
      if (s.phase !== 'ANSWER') return fail('Answers are closed');
      if (s.endsAt != null && now > s.endsAt + TIMING.GRACE) return fail('Too late!');
      if (r!.bets[me.id] == null) return fail("You joined mid-question. You're in from the next one.");
      const v = validAnswer(s, q!, a.v);
      if (v == null) return fail('That answer is not valid');
      r!.answers[me.id] = { v, at: now };
      return ok();
    }
    case 'react':
      if (!(REACTIONS as readonly string[]).includes(a.e)) return fail('Unknown reaction');
      me.reactions++;
      return { ok: true, changed: false, persist: false, effects: [{ t: 'react', pid: me.id, e: a.e }] };
    case 'nudge': {
      if (!s.powerups) return fail('Power-ups are off');
      if (s.phase === 'LOBBY' || s.phase === 'PODIUM') return fail('Nudge during the game');
      if (me.power.nudge < 1) return fail('Nudge already used');
      if (inLastSeconds(s, now)) return fail('Not in the last 5 seconds');
      const target = s.players[a.to];
      if (!target || target.kicked || target.id === me.id) return fail('Pick someone else');
      me.power.nudge--;
      return ok([{ t: 'nudge', to: [target.id], from: me.name }]);
    }
    case 'popup': {
      if (!s.powerups) return fail('Power-ups are off');
      if (s.phase !== 'BET' && s.phase !== 'ANSWER') return fail('Pop-ups land during a question');
      if (me.power.popup < 1) return fail('Pop-up already used');
      if (inLastSeconds(s, now)) return fail('Not in the last 5 seconds');
      const target = s.players[a.to];
      if (!target || target.kicked || target.id === me.id) return fail('Pick someone else');
      me.power.popup--;
      const kind = SCAM_KINDS[hash(s.seed, 'popup', me.id, target.id) % SCAM_KINDS.length];
      s.popups.push({ from: me.id, to: target.id, kind, q: s.q });
      return ok();
    }
    case 'dismiss': {
      const e = s.chaosQueue.find((x) => x.id === a.id && x.player === me.id);
      if (!e || e.ended) return fail('Already gone');
      e.ended = true;
      me.chaosMs += Math.max(0, Math.min(10_000, Math.round(Number(a.ms) || 0)));
      return ok();
    }
    case 'chopeClear': {
      const e = s.chaosQueue.find((x) => x.id === a.id && x.player === me.id && x.kind === 'auntie_chope');
      if (!e || e.ended) return fail('Already cleared');
      e.ended = true;
      return ok();
    }
  }
  return fail('Unknown action');
}

/** Host's view of who has acted this phase. */
export function lockedIn(s: GameState): PlayerId[] {
  const r = cur(s);
  if (!r) return [];
  const book = s.phase === 'BET' || s.phase === 'MODIFIER' ? r.bets : r.answers;
  return active(s).filter((p) => book[p.id] != null).map((p) => p.id);
}
