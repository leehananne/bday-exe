// What each client is allowed to see (PRD §9 "Fairness"). Players never receive the answer key,
// future modifiers, the MYSTERY draw, or other players' answers before the matching reveal step.
import { validate } from './modifiers';
import {
  activeChaosFor, active, autoOf, chipsLeft, textsOf, chopeFor, crowdTally, cur, curQ, lockedIn, N, resolvedMod, standings, stepsFor,
  totals, typedGroups, visibleThrough, type TypedGroup,
} from './game';
import { hash } from './rng';
import type {
  AnswerValue, ChaosConfig, ChaosEvent, GameState, ModifierId, Outcome, Phase, PlayerId, QType, Question, Resolved, RevealStep, SkinId,
} from './types';

export interface PlayerPub { id: PlayerId; name: string; avatar: number; online: boolean }
export interface Choice { key: string; label: string; avatar?: number }
export interface QPublic {
  n: number; skin: SkinId; type: QType; category: string; seconds: number;
  prompt?: string; options?: string[]; choices?: Choice[]; hype?: string;
}
export type SplitView =
  | { type: 'mc'; counts: number[] }
  | { type: 'crowd'; counts: Record<string, number> }
  | { type: 'typed'; answers: number; groups: number }
  | { type: 'fave'; entries: { i: number; text: string }[] }
  | { type: 'number'; count: number; min: number | null; max: number | null };
export type AnswerReveal =
  | { type: 'mc'; correct: number }
  | { type: 'crowd'; winners: string[] }
  | { type: 'typed'; right: string[]; lol: string[] }
  | { type: 'fave'; crowned: { pid: PlayerId; name: string; avatar: number; text: string } | null; lols: { pid: PlayerId; name: string; text: string }[] }
  | { type: 'number'; real: number | null; closest: { pid: PlayerId; name: string; guess: number }[] };
export interface RevealView {
  steps: RevealStep[]; index: number; stepName: RevealStep;
  resolved: Resolved | null;
  split: SplitView | null;
  answer: AnswerReveal | null;
  points: { delta: Record<PlayerId, number>; outcome: Record<PlayerId, Outcome> } | null;
}
export interface BoardRow { pid: PlayerId; name: string; avatar: number; score: number; rank: number; last: number | null; moved: number }
export interface BoardView { after: number; rows: BoardRow[]; mover: BoardRow | null; zeroes: string[] }
export interface Award { id: string; icon: string; label: string; pid: PlayerId; name: string; detail: string }
export interface Report { rank: number; score: number; right: number; played: number; best: string | null; worst: string | null; agent: string; scammedMs: number }
export interface PodiumView { top: BoardRow[]; awards: Award[]; age: string | null }
export interface MeView {
  id: PlayerId; name: string; avatar: number;
  chips: number[]; bet: number | null; answer: AnswerValue | null;
  /** Typed / fave: everything I sent this question. */
  texts: string[];
  power: { nudge: number; popup: number };
  score: number; rank: number;
  chaos: ChaosEvent | null; chope: ChaosEvent | null;
  /** Huat Ah! fired for me this question: red packets keep raining until answers lock. */
  rain: boolean;
  result: { outcome: Outcome; delta: number } | null;
  report: Report | null;
}
export interface HostView {
  questions: Question[]; plan: ModifierId[]; locked: boolean[]; planErrors: string[]; planSeed: number; seed: number;
  chaos: ChaosConfig;
  bets: Record<PlayerId, number>; answers: Record<PlayerId, AnswerValue>;
  /** Typed / fave: every answer each player sent. */
  texts: Record<PlayerId, string[]>;
  groups: TypedGroup[]; tally: Record<string, number>;
  mystery: Resolved | null;
  judging: { crowned: PlayerId | null; crownedIdx: number | null; lols: PlayerId[]; real: number | null };
  chaosLog: { id: string; kind: string; player: string; fired: boolean; ended: boolean; from?: string }[];
  live: BoardRow[];
  scoreTotals: Record<PlayerId, number>;
}
export interface View {
  role: 'host' | 'player';
  serverNow: number;
  pin: string; phase: Phase; q: number; total: number;
  endsAt: number | null; paused: boolean; pausedLeft: number | null;
  calm: boolean; powerups: boolean; hostOnline: boolean;
  auto: { reveal: boolean; next: boolean };
  players: PlayerPub[];
  question: QPublic | null;
  modifier: ModifierId | null;
  heat: ModifierId[];
  nextSkin: SkinId | null;
  lockedIn: PlayerId[];
  reveal: RevealView | null;
  board: BoardView | null;
  roast: string;
  podium: PodiumView | null;
  me?: MeView;
  host?: HostView;
}

const PROMPT_PHASES: Phase[] = ['ANSWER', 'JUDGE', 'REVEAL', 'LEADERBOARD'];

function choicesFor(s: GameState, q: Question): Choice[] | undefined {
  if (q.type !== 'crowd') return undefined;
  if (q.options?.length) return q.options.map((label, i) => ({ key: `o:${i}`, label }));
  return active(s).map((p) => ({ key: p.id, label: p.name, avatar: p.avatar }));
}

function shownMod(s: GameState, n: number, revealed: boolean): ModifierId {
  const m = s.plan[n - 1];
  return m === 'mystery' && revealed ? s.rounds[n - 1].mystery ?? 'mystery' : m;
}

function revealView(s: GameState): RevealView | null {
  if (s.phase !== 'REVEAL' && s.phase !== 'LEADERBOARD' && s.phase !== 'PODIUM') return null;
  const r = cur(s)!;
  const q = curQ(s)!;
  if (r.skipped || !r.result) return null;
  const steps = stepsFor(s);
  const index = s.phase === 'REVEAL' ? s.revealStep : steps.length - 1;
  const at = (st: RevealStep) => steps.indexOf(st) <= index;
  const name = (pid: PlayerId) => s.players[pid]?.name ?? '?';
  let split: SplitView | null = null;
  let answer: AnswerReveal | null = null;
  if (at('split')) {
    const answers = Object.entries(r.answers).filter(([pid]) => s.players[pid] && !s.players[pid].kicked);
    switch (q.type) {
      case 'mc': {
        const counts = (q.options ?? []).map(() => 0);
        for (const [, a] of answers) counts[Number(a.v)]++;
        split = { type: 'mc', counts };
        break;
      }
      case 'crowd': split = { type: 'crowd', counts: crowdTally(s).counts }; break;
      case 'typed': split = { type: 'typed', answers: answers.length, groups: typedGroups(s).length }; break;
      case 'fave': {
        const entries = answers
          .flatMap(([pid]) => textsOf(r, pid).map((text, k) => ({ i: 0, text, h: hash(s.seed, 'fave', pid, k) })))
          .sort((x, y) => x.h - y.h)
          .map((e, i) => ({ i: i + 1, text: e.text }));
        split = { type: 'fave', entries };
        break;
      }
      case 'number': {
        const vals = answers.map(([, a]) => Number(a.v));
        split = { type: 'number', count: vals.length, min: vals.length ? Math.min(...vals) : null, max: vals.length ? Math.max(...vals) : null };
        break;
      }
    }
  }
  if (at('answer')) {
    switch (q.type) {
      case 'mc': answer = { type: 'mc', correct: q.answer! }; break;
      case 'crowd': answer = { type: 'crowd', winners: crowdTally(s).winners }; break;
      case 'typed': {
        const g = typedGroups(s);
        const right = g.filter((x) => x.verdict === 'right').map((x) => x.display);
        if (!right.length && q.accept?.length) right.push(q.accept[0]);
        answer = { type: 'typed', right, lol: g.filter((x) => x.verdict === 'lol').map((x) => x.display) };
        break;
      }
      case 'fave': {
        const c = r.judging.crowned;
        answer = {
          type: 'fave',
          crowned: c ? { pid: c, name: name(c), avatar: s.players[c]?.avatar ?? 0, text: textsOf(r, c)[r.judging.crownedIdx ?? -1] ?? String(r.answers[c]?.v ?? '') } : null,
          lols: r.judging.lols.map((pid) => ({ pid, name: name(pid), text: textsOf(r, pid).join(' / ') })),
        };
        break;
      }
      case 'number': {
        const closest = Object.entries(r.result.outcome)
          .filter(([, o]) => o === 'right' || o === 'exact')
          .map(([pid]) => ({ pid, name: name(pid), guess: Number(r.answers[pid]?.v) }));
        answer = { type: 'number', real: r.judging.real, closest };
        break;
      }
    }
  }
  return {
    steps, index, stepName: steps[index],
    resolved: at('mystery') || s.plan[s.q - 1] !== 'mystery' ? r.result.resolved : null,
    split, answer,
    points: at('points') ? { delta: r.result.delta, outcome: r.result.outcome } : null,
  };
}

function boardView(s: GameState, through: number): BoardView {
  const st = standings(s, through);
  const prev = standings(s, through - 1);
  const lastRound = through > 0 ? s.rounds[through - 1] : null;
  const rows: BoardRow[] = st.map((x) => {
    const p = s.players[x.pid];
    const pr = prev.find((y) => y.pid === x.pid)?.rank ?? x.rank;
    return {
      pid: x.pid, name: p.name, avatar: p.avatar, score: x.score, rank: x.rank,
      last: lastRound?.result && x.pid in lastRound.result.delta ? lastRound.result.delta[x.pid] : null,
      moved: pr - x.rank,
    };
  });
  const mover = [...rows].filter((r) => r.moved > 0).sort((a, b) => b.moved - a.moved || (b.last ?? 0) - (a.last ?? 0))[0] ?? null;
  const zeroes = rows.filter((r) => r.last === 0).map((r) => r.name);
  return { after: through, rows, mover, zeroes };
}

function awards(s: GameState): Award[] {
  const ps = active(s);
  const tally = (f: (pid: PlayerId) => number) => ps.map((p) => ({ p, v: f(p.id) })).sort((a, b) => b.v - a.v)[0];
  const outcomes = (pid: PlayerId, o: Outcome[]) =>
    s.rounds.filter((r) => r.result && !r.skipped).filter((r) => o.includes(r.result!.outcome[pid])).length;
  const out: Award[] = [];
  const wrong = tally((pid) => outcomes(pid, ['wrong']));
  if (wrong?.v) out.push({ id: 'wrong', icon: '💀', label: 'Most Wrong', pid: wrong.p.id, name: wrong.p.name, detail: `${wrong.v} wrong` });
  const agent = tally((pid) => { const p = s.players[pid]; return (2 - p.power.nudge - p.power.popup) * 100 + p.reactions; });
  if (agent?.v) out.push({ id: 'agent', icon: '👉', label: 'Chaos Agent', pid: agent.p.id, name: agent.p.name, detail: `${agent.p.reactions} reactions` });
  const scammed = tally((pid) => s.players[pid].chaosMs);
  if (scammed?.v) out.push({ id: 'scammed', icon: '📢', label: 'Most Scammed', pid: scammed.p.id, name: scammed.p.name, detail: `${(scammed.v / 1000).toFixed(1)}s staring at pop-ups` });
  const fave = tally((pid) => outcomes(pid, ['crowned']) * 2 + outcomes(pid, ['lol']));
  if (fave?.v) out.push({ id: 'fave', icon: '★', label: "Anne's Fave Human", pid: fave.p.id, name: fave.p.name, detail: 'crowned & +lol' });
  return out;
}

function report(s: GameState, pid: PlayerId, rank: number, score: number): Report {
  let right = 0, played = 0;
  let best: { q: number; d: number; chip: number } | null = null;
  let worst: { q: number; d: number; chip: number } | null = null;
  s.rounds.forEach((r, i) => {
    if (r.skipped || !r.result || !(pid in r.result.outcome)) return;
    played++;
    const o = r.result.outcome[pid];
    if (o === 'right' || o === 'exact' || o === 'crowned' || o === 'lol') right++;
    const d = r.result.delta[pid], chip = r.bets[pid];
    if (!best || d > best.d) best = { q: i + 1, d, chip };
    const loss = o === 'wrong' ? -chip + d : d; // a lost chip on a 0-penalty round still hurts
    if (o === 'wrong' && (!worst || loss < worst.d)) worst = { q: i + 1, d: loss, chip };
  });
  const p = s.players[pid];
  const b = best as { q: number; d: number; chip: number } | null;
  const w = worst as { q: number; d: number; chip: number } | null;
  return {
    rank, score, right, played,
    best: b && b.d > 0 ? `${b.chip} on Q${b.q} (+${b.d.toLocaleString('en-US')})` : null,
    worst: w ? `${w.chip} on Q${w.q}` : null,
    agent: `${1 - p.power.nudge} nudge, ${1 - p.power.popup} pop-up, ${p.reactions} reactions`,
    scammedMs: p.chaosMs,
  };
}

export function viewFor(s: GameState, who: { role: 'host' } | { role: 'player'; pid: PlayerId }, now: number, extra?: { age?: string }): View {
  const r = cur(s);
  const q = curQ(s);
  const reveal = revealView(s);
  const through = visibleThrough(s);
  const revealedMystery = !!reveal?.resolved;
  const showBoard = s.phase === 'LEADERBOARD' || s.phase === 'PODIUM' || (s.phase === 'REVEAL' && reveal?.stepName === 'points');
  const v: View = {
    role: who.role, serverNow: now,
    pin: s.pin, phase: s.phase, q: s.q, total: N(s),
    endsAt: s.endsAt, paused: s.pausedAt != null, pausedLeft: s.pausedLeft,
    calm: s.calm, powerups: s.powerups, hostOnline: s.hostOnline, auto: autoOf(s),
    players: active(s).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, online: p.online })),
    question: q ? {
      n: s.q, skin: q.skin, type: q.type, category: q.category, seconds: q.seconds, hype: q.hype,
      ...(PROMPT_PHASES.includes(s.phase) || s.phase === 'PODIUM' ? { prompt: q.prompt, options: q.options, choices: choicesFor(s, q) } : {}),
    } : null,
    modifier: s.q ? shownMod(s, s.q, revealedMystery) : null,
    heat: s.plan.slice(0, s.q).map((_, i) => shownMod(s, i + 1, i + 1 < s.q || revealedMystery)),
    nextSkin: s.q < N(s) ? s.questions[s.q]?.skin ?? null : null,
    lockedIn: lockedIn(s),
    reveal,
    board: showBoard ? boardView(s, through) : null,
    roast: s.phase === 'REVEAL' || s.phase === 'LEADERBOARD' ? s.roast : '',
    podium: null,
  };
  if (s.phase === 'PODIUM') {
    const b = boardView(s, N(s));
    v.podium = { top: b.rows.slice(0, 3), awards: awards(s), age: extra?.age ?? null };
  }

  if (who.role === 'player') {
    const p = s.players[who.pid];
    if (p) {
      const st = standings(s, through);
      const mine = st.find((x) => x.pid === p.id);
      const pts = reveal?.points;
      v.me = {
        id: p.id, name: p.name, avatar: p.avatar,
        chips: chipsLeft(s, p.id), bet: r?.bets[p.id] ?? null, answer: r?.answers[p.id]?.v ?? null, texts: r ? textsOf(r, p.id) : [],
        power: { ...p.power },
        score: mine?.score ?? 0, rank: mine?.rank ?? st.length,
        chaos: s.phase === 'ANSWER' ? activeChaosFor(s, p.id) : null,
        chope: s.phase === 'ANSWER' ? chopeFor(s, p.id) : null,
        rain: s.phase === 'ANSWER' && s.chaosQueue.some((e) => e.player === p.id && e.kind === 'huat' && e.fired),
        result: pts && p.id in pts.outcome ? { outcome: pts.outcome[p.id], delta: pts.delta[p.id] } : null,
        report: s.phase === 'PODIUM' && mine ? report(s, p.id, mine.rank, mine.score) : null,
      };
    }
  } else {
    const all = standings(s, s.q);
    v.host = {
      questions: s.questions, plan: s.plan, locked: s.locked, planErrors: validate(s.plan, s.questions).errors.map((e) => e.msg),
      planSeed: s.planSeed, seed: s.seed, chaos: s.chaos,
      bets: r?.bets ?? {},
      answers: Object.fromEntries(Object.entries(r?.answers ?? {}).map(([k, a]) => [k, a.v])),
      texts: r ? Object.fromEntries(Object.keys(r.answers).map((k) => [k, textsOf(r, k)])) : {},
      groups: q?.type === 'typed' ? typedGroups(s) : [],
      tally: q?.type === 'crowd' ? crowdTally(s).counts : {},
      mystery: r?.mystery ?? null,
      judging: { crowned: r?.judging.crowned ?? null, crownedIdx: r?.judging.crownedIdx ?? null, lols: r?.judging.lols ?? [], real: r?.judging.real ?? null },
      chaosLog: s.chaosQueue.filter((e) => e.fired).map((e) => ({
        id: e.id, kind: e.kind, player: s.players[e.player]?.name ?? '?', fired: !!e.fired, ended: !!e.ended,
        from: e.from ? s.players[e.from]?.name : undefined,
      })),
      live: all.map((x) => ({ pid: x.pid, name: s.players[x.pid].name, avatar: s.players[x.pid].avatar, score: x.score, rank: x.rank, last: null, moved: 0 })),
      scoreTotals: totals(s, s.q),
    };
  }
  return v;
}

export { resolvedMod };
