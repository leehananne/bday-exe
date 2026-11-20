import { describe, expect, it } from 'vitest';
import { ALL_KINDS, scheduleChaos } from '../src/shared/chaos';
import { apply, chipsLeft, newGame, nextWake, join, tick, TIMING, standings, type Action } from '../src/shared/game';
import { delta, planModifiers, validate } from '../src/shared/modifiers';
import { parseQuestions } from '../src/shared/questions';
import type { GameState, ModifierId, Player, Question } from '../src/shared/types';
import { viewFor } from '../src/shared/views';
import sample from '../questions.example.json';

const QS = (() => {
  const r = parseQuestions(sample);
  if (!r.ok) throw new Error(r.errors.join('\n'));
  return r.questions;
})();

describe('delta (PRD §6a)', () => {
  const table: [string, ModifierId, number][] = [
    ['right', 'normal', 400], ['right', 'double', 800], ['right', 'risky', 400], ['right', 'trouble', 800],
    ['wrong', 'normal', 0], ['wrong', 'double', 0], ['wrong', 'risky', -400], ['wrong', 'trouble', -800],
    ['exact', 'normal', 800], ['exact', 'double', 1600], ['crowned', 'normal', 800], ['crowned', 'double', 1600],
    ['lol', 'normal', 400], ['lol', 'double', 800], ['none', 'trouble', 0], ['none', 'risky', 0],
  ];
  it.each(table)('%s on %s with a 400 chip', (o, m, want) => {
    expect(delta(400, o as any, m as any)).toBe(want);
  });
});

describe('validate (C1–C7)', () => {
  const good: ModifierId[] = ['normal', 'double', 'normal', 'risky', 'double', 'normal', 'trouble', 'normal', 'double', 'trouble'];
  const codes = (p: ModifierId[]) => validate(p, QS).errors.map((e) => e.code);
  it('accepts a good plan', () => expect(validate(good, QS)).toEqual({ ok: true, errors: [] }));
  const edit = (i: number, m: ModifierId) => good.map((x, j) => (j === i - 1 ? m : x));
  it('F1: Q1 must be normal', () => expect(codes(edit(1, 'double'))).toContain('F1'));
  it('C1: double in Q2–Q3', () => expect(codes(edit(2, 'normal'))).toContain('C1'));
  it('C2: exactly one trouble in Q7–Q9', () => {
    expect(codes(edit(7, 'double'))).toContain('C2');
    expect(codes(edit(8, 'trouble'))).toContain('C2');
  });
  it('C3: 1–3 penalties', () => {
    expect(codes(['normal', 'double', 'normal', 'double', 'normal', 'double', 'trouble', 'risky', 'double', 'trouble'] as ModifierId[])).toContain('C4');
    expect(codes(['normal', 'double', 'risky', 'normal', 'risky', 'normal', 'trouble', 'normal', 'risky', 'trouble'] as ModifierId[])).toContain('C3');
  });
  it('C4: no back-to-back penalties, none before final', () => {
    expect(codes(edit(6, 'risky'))).toContain('C4');
    expect(codes(edit(9, 'risky'))).toContain('C4');
  });
  it('C5: mystery limits', () => {
    expect(codes(edit(3, 'mystery'))).toContain('C5');
    expect(codes(edit(5, 'mystery'))).not.toContain('C5');
  });
  it('C6: fave/number only normal/double; crowd never mystery', () => {
    expect(codes(edit(6, 'risky'))).toContain('C6');
    expect(codes(edit(9, 'trouble'))).toContain('C6');
    expect(codes(edit(8, 'mystery'))).toContain('C6');
  });
  it('C7: no modifier three times in a row', () => {
    expect(codes(['normal', 'normal', 'normal', 'double', 'risky', 'normal', 'trouble', 'normal', 'double', 'trouble'] as ModifierId[])).toContain('C7');
  });
});

describe('planModifiers', () => {
  it('always returns a valid plan, deterministic per seed', () => {
    for (let seed = 0; seed < 300; seed++) {
      const p = planModifiers(QS, seed);
      expect(validate(p, QS).ok).toBe(true);
      expect(planModifiers(QS, seed)).toEqual(p);
    }
  });
  it('respects locked rows', () => {
    const locked: (ModifierId | null)[] = QS.map(() => null);
    locked[3] = 'mystery';
    locked[7] = 'trouble';
    for (let seed = 0; seed < 50; seed++) {
      const p = planModifiers(QS, seed, locked);
      expect(p[3]).toBe('mystery');
      expect(p[7]).toBe('trouble');
    }
  });
});

function players(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`, token: `t${i}`, name: `P${i}`, avatar: i % 8, joinedAt: 0, online: true, kicked: false,
    power: { nudge: 1, popup: 1 }, chaosCount: 0, chaosSeen: [], chaosMs: 0, reactions: 0,
  }));
}

describe('scheduleChaos acceptance (PRD §8a)', () => {
  it('chaos intensity: every player gets chaos on 7–8 questions, a different random set each, never the same kind twice', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const room = { chaos: { intensity: 'chaos' as const, enabled: [...ALL_KINDS], mercy: false }, seed, questions: QS };
      const ps = players(15);
      const hitOn: Record<string, number[]> = {};
      for (let q = 1; q <= 10; q++) {
        const evs = scheduleChaos(room, q, 0, QS[q - 1].seconds * 1000, ps);
        if (q === 1 || q === 10) expect(evs).toHaveLength(0);
        for (const e of evs) {
          const p = ps.find((x) => x.id === e.player)!;
          expect(p.chaosSeen).not.toContain(e.kind);
          p.chaosCount++;
          p.chaosSeen.push(e.kind);
          (hitOn[p.id] ??= []).push(q);
          expect(e.at).toBeGreaterThanOrEqual(1500); // lands early…
          expect(e.at).toBeLessThanOrEqual(Math.min(9000, QS[q - 1].seconds * 1000 - 4000));
          expect(e.until).toBeNull(); // …and stays until the player closes it
          if (e.kind === 'toto') expect(e.data?.numbers).toEqual([6, 7, 16, 17, 26, 27]);
          if (e.kind === 'auntie_chope') expect(QS[q - 1].type).toBe('mc');
        }
      }
      for (const p of ps) expect(p.chaosCount).toBeGreaterThanOrEqual(7), expect(p.chaosCount).toBeLessThanOrEqual(8);
      // randomised per player: not everyone is hit on the same questions
      expect(new Set(Object.values(hitOn).map((qs) => qs.join(','))).size).toBeGreaterThan(3);
    }
  });
  it('mild intensity: 3–4 questions per player', () => {
    const room = { chaos: { intensity: 'mild' as const, enabled: [...ALL_KINDS], mercy: false }, seed: 9, questions: QS };
    const ps = players(10);
    for (let q = 1; q <= 10; q++) for (const e of scheduleChaos(room, q, 0, QS[q - 1].seconds * 1000, ps)) {
      const p = ps.find((x) => x.id === e.player)!; p.chaosCount++; p.chaosSeen.push(e.kind);
    }
    for (const p of ps) expect([3, 4]).toContain(p.chaosCount);
  });
  it('is deterministic (reconnects re-render the same event)', () => {
    const room = { chaos: { intensity: 'chaos' as const, enabled: [...ALL_KINDS], mercy: false }, seed: 36, questions: QS };
    expect(scheduleChaos(room, 5, 1000, 21000, players(15))).toEqual(scheduleChaos(room, 5, 1000, 21000, players(15)));
  });
  it('off intensity does nothing', () => {
    const room = { chaos: { intensity: 'off' as const, enabled: [...ALL_KINDS], mercy: false }, seed: 1, questions: QS };
    expect(scheduleChaos(room, 5, 0, 20000, players(15))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- full game simulation

class Sim {
  s: GameState;
  now = 1_000_000;
  constructor(n = 3, qs: Question[] = QS) {
    this.s = newGame({ pin: 'ANNE', secretHash: 'x', questions: qs, seed: 36, now: this.now });
    for (let i = 0; i < n; i++) join(this.s, { id: `p${i}`, token: `t${i}`, name: `P${i}`, avatar: i, now: this.now });
  }
  host(a: Action) { const r = apply(this.s, { role: 'host' }, a, this.now); tick(this.s, this.now); return r; }
  pl(i: number, a: Action) { const r = apply(this.s, { role: 'player', pid: `p${i}` }, a, this.now); tick(this.s, this.now); return r; }
  advance(ms: number) {
    const target = this.now + ms;
    for (;;) {
      const w = nextWake(this.s);
      if (w == null || w > target) break;
      this.now = Math.max(this.now, w);
      tick(this.s, this.now);
    }
    this.now = target;
    tick(this.s, this.now);
  }
  toAnswer() { this.advance(TIMING.MODIFIER); }
  endBet() { this.advance(TIMING.BET + TIMING.GRACE + 1); }
  endAnswer() { this.advance(this.s.questions[this.s.q - 1].seconds * 1000 + TIMING.GRACE + 1); }
  revealAll() { while (this.s.phase === 'REVEAL') expect(this.host({ t: 'revealNext' }).ok).toBe(true); }
}

describe('game flow', () => {
  it('plays a full multiple-choice round with wagers, coward\'s tax and the reveal', () => {
    const g = new Sim(3);
    g.s.chaos.intensity = 'off';
    expect(g.host({ t: 'start' }).ok).toBe(true);
    expect(g.s.phase).toBe('MODIFIER');
    g.toAnswer();
    expect(g.s.phase).toBe('BET');
    expect(g.pl(0, { t: 'bet', chip: 700 }).ok).toBe(true);
    expect(g.pl(1, { t: 'bet', chip: 300 }).ok).toBe(true);
    // p2 doesn't bet → coward's tax gives the smallest chip
    g.endBet();
    expect(g.s.phase).toBe('ANSWER');
    expect(g.s.rounds[0].bets).toEqual({ p0: 700, p1: 300, p2: 100 });
    // players never see the prompt before ANSWER; never the key during ANSWER
    const pv = viewFor(g.s, { role: 'player', pid: 'p0' }, g.now);
    expect(pv.question?.prompt).toBeTruthy();
    expect(JSON.stringify(pv)).not.toContain('"answer":2');
    expect(pv.host).toBeUndefined();
    g.pl(0, { t: 'answer', v: 2 }); // right (Fire hazard)
    g.pl(1, { t: 'answer', v: 1 }); // wrong
    g.pl(0, { t: 'answer', v: 0 });
    g.pl(0, { t: 'answer', v: 2 }); // last value counts
    g.endAnswer();
    expect(g.s.phase).toBe('REVEAL');
    expect(viewFor(g.s, { role: 'player', pid: 'p0' }, g.now).reveal?.answer).toBeNull();
    g.host({ t: 'revealNext' }); // → answer
    expect(viewFor(g.s, { role: 'player', pid: 'p0' }, g.now).reveal?.answer).toEqual({ type: 'mc', correct: 2 });
    g.host({ t: 'revealNext' }); // → points
    const me = viewFor(g.s, { role: 'player', pid: 'p0' }, g.now).me!;
    expect(me.result).toEqual({ outcome: 'right', delta: 700 });
    expect(me.bet).toBe(700);
    expect(chipsLeft(g.s, 'p0', true)).not.toContain(700);
    g.host({ t: 'revealNext' });
    expect(g.s.phase).toBe('LEADERBOARD');
    expect(standings(g.s, 1)[0]).toMatchObject({ pid: 'p0', score: 700, rank: 1 });
  });

  it('rejects a spent chip, late answers, and late joiners after Q3', () => {
    const g = new Sim(2);
    g.s.chaos.intensity = 'off';
    g.host({ t: 'start' }); g.toAnswer();
    g.pl(0, { t: 'bet', chip: 1000 }); g.endBet(); g.endAnswer(); g.revealAll();
    g.host({ t: 'next' }); g.toAnswer();
    expect(g.pl(0, { t: 'bet', chip: 1000 }).ok).toBe(false);
    expect(chipsLeft(g.s, 'p0')).toHaveLength(9);
    g.endBet(); g.endAnswer();
    expect(g.pl(0, { t: 'answer', v: 1 }).ok).toBe(false);
    for (const _ of [3, 4]) { g.revealAll(); g.host({ t: 'next' }); g.toAnswer(); g.endBet(); g.endAnswer(); if (g.s.phase === 'JUDGE') g.host({ t: 'finishJudging' }); }
    expect(g.s.q).toBe(4);
    expect(join(g.s, { id: 'late', token: 'tl', name: 'Late', avatar: 1, now: g.now }).ok).toBe(false);
  });

  it('judges typed answers (auto-grouped), Host\'s Fave, Crowd\'s Pick and closest number', () => {
    const g = new Sim(4);
    g.s.chaos.intensity = 'off';
    g.s.plan = ['normal', 'double', 'normal', 'risky', 'double', 'normal', 'trouble', 'normal', 'double', 'trouble'];
    g.host({ t: 'start' });
    for (let q = 1; q <= 3; q++) { g.toAnswer(); g.endBet(); g.endAnswer(); g.revealAll(); g.host({ t: 'next' }); }
    // Q4 typed, RISKY
    g.toAnswer(); [0, 1, 2, 3].forEach((i) => g.pl(i, { t: 'bet', chip: 1000 })); g.endBet();
    g.pl(0, { t: 'answer', v: 'McFly' }); g.pl(1, { t: 'answer', v: 'mc fly!!' }); g.pl(2, { t: 'answer', v: 'macfly' }); g.pl(3, { t: 'answer', v: 'ur mum' });
    g.endAnswer();
    expect(g.s.phase).toBe('JUDGE');
    const groups = viewFor(g.s, { role: 'host' }, g.now).host!.groups;
    expect(groups.find((x) => x.key === 'mcfly')).toMatchObject({ count: 2, verdict: 'right' });
    expect(groups.find((x) => x.key === 'macfly')?.similarTo).toBe('mcfly');
    g.host({ t: 'judge', key: 'macfly', verdict: 'right' });
    g.host({ t: 'judge', key: 'urmum', verdict: 'lol' });
    g.host({ t: 'finishJudging' });
    expect(g.s.rounds[3].result!.delta).toEqual({ p0: 1000, p1: 1000, p2: 1000, p3: 1000 });
    // back → re-open judging → change a verdict
    g.host({ t: 'back' });
    expect(g.s.phase).toBe('JUDGE');
    g.host({ t: 'judge', key: 'urmum', verdict: 'wrong' });
    g.host({ t: 'finishJudging' });
    expect(g.s.rounds[3].result!.delta.p3).toBe(-1000);
    g.revealAll(); g.host({ t: 'next' });
    // Q5 mc
    g.toAnswer(); g.endBet(); g.endAnswer(); g.revealAll(); g.host({ t: 'next' });
    // Q6 fave
    g.toAnswer(); [0, 1, 2, 3].forEach((i) => g.pl(i, { t: 'bet', chip: 900 })); g.endBet();
    ['boa', 'crocs', 'tiara', 'ur mum'].forEach((v, i) => g.pl(i, { t: 'answer', v }));
    g.endAnswer();
    expect(g.host({ t: 'crown', pid: 'p1' }).ok).toBe(true);
    expect(g.host({ t: 'lol', pid: 'p3' }).ok).toBe(true);
    g.host({ t: 'finishJudging' });
    expect(g.s.rounds[5].result!.delta).toEqual({ p0: 0, p1: 1800, p2: 0, p3: 900 });
    const fv = viewFor(g.s, { role: 'player', pid: 'p0' }, g.now).reveal!;
    expect(fv.split?.type).toBe('fave');
    expect(fv.answer).toBeNull(); // authors hidden until the answer step
    g.revealAll(); g.host({ t: 'next' });
    // Q7 mc trouble
    g.toAnswer(); g.endBet(); g.endAnswer(); g.revealAll(); g.host({ t: 'next' });
    // Q8 crowd: vote for friends; tie = all win
    g.toAnswer(); [0, 1, 2, 3].forEach((i) => g.pl(i, { t: 'bet', chip: 800 })); g.endBet();
    g.pl(0, { t: 'answer', v: 'p1' }); g.pl(1, { t: 'answer', v: 'p2' }); g.pl(2, { t: 'answer', v: 'p1' }); g.pl(3, { t: 'answer', v: 'p2' });
    g.endAnswer();
    expect(g.s.phase).toBe('REVEAL');
    expect(Object.values(g.s.rounds[7].result!.outcome)).toEqual(['right', 'right', 'right', 'right']);
    g.revealAll(); g.host({ t: 'next' });
    // Q9 number DOUBLE: exact hit ×2
    g.toAnswer(); [0, 1, 2, 3].forEach((i) => g.pl(i, { t: 'bet', chip: 700 })); g.endBet();
    [199, 211, 143, 9999].forEach((v, i) => g.pl(i, { t: 'answer', v }));
    g.endAnswer();
    expect(g.host({ t: 'finishJudging' }).ok).toBe(false); // needs the real number
    g.host({ t: 'setReal', value: 211 });
    g.host({ t: 'finishJudging' });
    expect(g.s.rounds[8].result!.outcome).toEqual({ p0: 'wrong', p1: 'exact', p2: 'wrong', p3: 'wrong' });
    expect(g.s.rounds[8].result!.delta.p1).toBe(700 * 2 * 2);
    g.revealAll(); g.host({ t: 'next' });
    // Q10 final → podium
    g.toAnswer(); g.endBet(); g.endAnswer(); g.revealAll();
    expect(g.s.phase).toBe('PODIUM');
    const pod = viewFor(g.s, { role: 'player', pid: 'p1' }, g.now);
    expect(pod.podium?.top.length).toBe(3);
    expect(pod.me?.report?.played).toBe(10);
  });

  it('MYSTERY stays hidden from players until its reveal step', () => {
    const g = new Sim(2);
    g.s.chaos.intensity = 'off';
    g.s.plan = ['normal', 'double', 'normal', 'mystery', 'double', 'normal', 'trouble', 'normal', 'double', 'trouble'];
    g.host({ t: 'start' });
    for (let q = 1; q <= 3; q++) { g.toAnswer(); g.endBet(); g.endAnswer(); g.revealAll(); g.host({ t: 'next' }); }
    g.toAnswer();
    expect(viewFor(g.s, { role: 'player', pid: 'p0' }, g.now).modifier).toBe('mystery');
    g.endBet(); g.pl(0, { t: 'answer', v: 'mcfly' }); g.endAnswer();
    expect(g.s.rounds[3].mystery).not.toBeNull();
    g.host({ t: 'finishJudging' });
    const v0 = viewFor(g.s, { role: 'player', pid: 'p0' }, g.now);
    expect(v0.reveal?.stepName).toBe('mystery');
    expect(v0.reveal?.resolved).toBe(g.s.rounds[3].mystery);
    expect(JSON.stringify(viewFor(g.s, { role: 'player', pid: 'p0' }, g.now).heat)).toContain(g.s.rounds[3].mystery!);
  });

  it('fires chaos at `at`, ends it at `until`, delivers pop-ups after the active event, and pause shifts timers', () => {
    const g = new Sim(6);
    g.host({ t: 'start' }); g.toAnswer(); g.endBet(); g.endAnswer(); g.revealAll(); g.host({ t: 'next' });
    g.toAnswer();
    expect(g.pl(0, { t: 'popup', to: 'p1' }).ok).toBe(true);
    expect(g.pl(0, { t: 'popup', to: 'p2' }).ok).toBe(false); // one per game
    g.endBet();
    const scheduled = g.s.chaosQueue.length;
    g.advance(1500);
    const pop = g.s.chaosQueue.find((e) => e.from === 'p0');
    expect(pop?.player).toBe('p1');
    expect(viewFor(g.s, { role: 'player', pid: 'p1' }, g.now).me?.chaos?.id).toBe(pop!.id);
    g.pl(1, { t: 'dismiss', id: pop!.id, ms: 1200 });
    expect(g.s.players.p1.chaosMs).toBe(1200);
    // pause / resume shifts pending chaos
    const pending = g.s.chaosQueue.find((e) => !e.fired);
    const at = pending?.at;
    g.host({ t: 'pause' }); g.advance(5000); g.host({ t: 'resume' });
    if (pending) expect(pending.at).toBe(at! + 5000);
    g.endAnswer();
    expect(g.s.chaosQueue.every((e) => e.ended)).toBe(true);
    expect(scheduled).toBeGreaterThanOrEqual(0);
  });

  it('skip refunds the chips of a skipped question', () => {
    const g = new Sim(1);
    g.s.chaos.intensity = 'off';
    g.host({ t: 'start' }); g.toAnswer(); g.pl(0, { t: 'bet', chip: 1000 }); g.endBet();
    g.host({ t: 'skip' });
    expect(g.s.phase).toBe('LEADERBOARD');
    expect(chipsLeft(g.s, 'p0')).toContain(1000);
  });

  it('players can only send host actions as the host', () => {
    const g = new Sim(1);
    expect(apply(g.s, { role: 'player', pid: 'p0' }, { t: 'start' }, g.now).ok).toBe(false);
  });

  it('autopilot: the reveal plays itself to the leaderboard after time is up (Kahoot-style)', () => {
    const g = new Sim(2);
    g.s.chaos.intensity = 'off';
    g.host({ t: 'start' }); g.toAnswer(); g.endBet();
    g.pl(0, { t: 'answer', v: 2 });
    g.endAnswer();
    expect(g.s.phase).toBe('REVEAL');
    expect(g.s.revealStep).toBe(0);
    g.advance(3600); expect(g.s.revealStep).toBe(1);
    g.advance(4100); expect(g.s.revealStep).toBe(2);
    expect(viewFor(g.s, { role: 'player', pid: 'p0' }, g.now).me?.result).toEqual({ outcome: 'right', delta: 100 });
    g.advance(5100);
    expect(g.s.phase).toBe('LEADERBOARD');
    // next question waits for the host by default
    g.advance(60_000);
    expect(g.s.phase).toBe('LEADERBOARD');
    expect(g.host({ t: 'next' }).ok).toBe(true);
    expect(g.s.phase).toBe('MODIFIER');
  });

  it('autopilot: hold stops on the current step; Next and re-enabling continue; autoNext starts the next question', () => {
    const g = new Sim(1);
    g.s.chaos.intensity = 'off';
    g.host({ t: 'setFlags', autoNext: true });
    g.host({ t: 'start' }); g.toAnswer(); g.endBet(); g.endAnswer();
    expect(g.host({ t: 'hold' }).ok).toBe(true);
    g.advance(30_000);
    expect(g.s).toMatchObject({ phase: 'REVEAL', revealStep: 0 });
    g.host({ t: 'revealNext' }); // manual tap re-arms the timer for the next step
    expect(g.s.revealStep).toBe(1);
    g.advance(4100); expect(g.s.revealStep).toBe(2);
    g.host({ t: 'back' }); // going back holds
    g.advance(30_000);
    expect(g.s.revealStep).toBe(1);
    g.host({ t: 'setFlags', autoReveal: true }); // resume autopilot
    g.advance(4100 + 5100);
    expect(g.s.phase).toBe('LEADERBOARD');
    g.advance(TIMING.LEADERBOARD + 1);
    expect(g.s).toMatchObject({ phase: 'MODIFIER', q: 2 });
  });

  it('autopilot off: reveal waits for the host; host-judged questions auto-play after Done', () => {
    const g = new Sim(1);
    g.s.chaos.intensity = 'off';
    g.host({ t: 'setFlags', autoReveal: false });
    g.host({ t: 'start' }); g.toAnswer(); g.endBet(); g.endAnswer();
    g.advance(60_000);
    expect(g.s).toMatchObject({ phase: 'REVEAL', revealStep: 0 });
    g.host({ t: 'setFlags', autoReveal: true });
    g.revealAll(); g.host({ t: 'next' });
    for (let q = 2; q <= 3; q++) { g.toAnswer(); g.endBet(); g.endAnswer(); g.revealAll(); g.host({ t: 'next' }); }
    g.toAnswer(); g.endBet(); g.pl(0, { t: 'answer', v: 'mcfly' }); g.endAnswer();
    expect(g.s.phase).toBe('JUDGE');
    g.advance(60_000);
    expect(g.s.phase).toBe('JUDGE'); // judging never times out
    g.host({ t: 'finishJudging' });
    g.advance(20_000);
    expect(g.s.phase).toBe('LEADERBOARD');
  });

  it('rooms saved before autopilot existed default to auto-reveal on', () => {
    const g = new Sim(1);
    delete (g.s as any).auto;
    g.s.chaos.intensity = 'off';
    g.host({ t: 'start' }); g.toAnswer(); g.endBet(); g.endAnswer();
    g.advance(20_000);
    expect(g.s.phase).toBe('LEADERBOARD');
  });

  it('a Host\'s Fave or closest-number final gets DOUBLE instead of DOUBLE TROUBLE (no crash)', () => {
    for (const type of ['fave', 'number'] as const) {
      const qs = QS.map((q, i) => (i === 9 ? { ...QS[5], type, modifier: undefined, skin: 'bsod' as const } : { ...q, modifier: undefined }));
      const s = newGame({ pin: 'ANNE', secretHash: 'x', questions: qs, seed: 7, now: 0 });
      expect(s.plan[9]).toBe('double');
      expect(validate(s.plan, qs).ok).toBe(true);
    }
  });
});
