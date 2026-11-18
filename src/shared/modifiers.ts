// Round modifiers (PRD §6a): payouts, the escalation curve, and plan validation (C1–C7).
import { mulberry32, weightedPick } from './rng';
import type { ModifierId, Outcome, QType, Question, Resolved } from './types';

export const WIN = { normal: 1, double: 2, risky: 1, trouble: 2 } as const;
export const LOSE = { normal: 0, double: 0, risky: -1, trouble: -2 } as const;

export function delta(chip: number, outcome: Outcome, m: Resolved): number {
  switch (outcome) {
    case 'right': return chip * WIN[m];
    case 'exact': return chip * WIN[m] * 2;   // closest number, exact hit
    case 'crowned': return chip * WIN[m] * 2; // Host's Fave
    case 'lol': return chip * WIN[m];
    case 'none': return 0;                    // Host's Fave, not picked: never penalised
    case 'wrong': return chip * LOSE[m];
  }
}

export const MOD_META: Record<ModifierId, { name: string; short: string; icon: string; rule: string; heat: 0 | 1 | 2 | 3 }> = {
  normal: { name: 'NORMAL', short: 'NORMAL', icon: '1×', rule: 'Right +bet · wrong 0', heat: 0 },
  double: { name: 'DOUBLE POINTS', short: 'DOUBLE', icon: '2×', rule: 'Right +2× bet · wrong 0', heat: 1 },
  risky: { name: 'RISKY', short: 'RISKY', icon: '−', rule: 'Right +bet · wrong −bet', heat: 2 },
  trouble: { name: 'DOUBLE TROUBLE', short: 'D. TROUBLE', icon: '±2', rule: 'Right +2× bet · wrong −2× bet', heat: 3 },
  mystery: { name: 'MYSTERY', short: 'MYSTERY', icon: '?', rule: 'Rule revealed after answers lock', heat: 2 },
};

export const isPenalty = (m: ModifierId) => m === 'risky' || m === 'trouble';

/** Win / lose amount for a chip under a (known) modifier, for the chip "stakes" label. */
export function stakes(chip: number, m: ModifierId): { win: number; lose: number } | null {
  if (m === 'mystery') return null;
  return { win: chip * WIN[m], lose: -chip * LOSE[m] };
}

type Pool = [ModifierId, number][];
export function poolFor(n: number, total = 10): Pool {
  if (n === 1) return [['normal', 1]];
  if (n === total) return [['trouble', 1]];
  if (n <= 3) return [['normal', 0.4], ['double', 0.6]];
  if (n <= 6) return [['normal', 0.3], ['double', 0.3], ['risky', 0.25], ['mystery', 0.15]];
  return [['double', 0.25], ['risky', 0.35], ['trouble', 0.4]];
}

export function compatible(m: ModifierId, t: QType): boolean {
  if (t === 'fave' || t === 'number') return m === 'normal' || m === 'double';
  if (t === 'crowd') return m !== 'mystery';
  return true;
}

/** Modifiers the planner UI offers for a row. */
export function allowedFor(n: number, t: QType, total = 10): ModifierId[] {
  const base: ModifierId[] = n === 1 ? ['normal'] : n === total ? ['trouble', 'double'] : ['normal', 'double', 'risky', 'trouble', 'mystery'];
  return base.filter((m) => compatible(m, t));
}

export interface PlanError { code: string; msg: string }

export function validate(plan: ModifierId[], questions: Pick<Question, 'type'>[]): { ok: boolean; errors: PlanError[] } {
  const errors: PlanError[] = [];
  const N = questions.length;
  const Q = (i: number) => plan[i - 1];
  if (plan.length !== N) errors.push({ code: 'LEN', msg: `Plan has ${plan.length} rows for ${N} questions` });
  if (Q(1) !== 'normal') errors.push({ code: 'F1', msg: 'Q1 is the warm-up: it must be NORMAL' });
  if (Q(N) !== 'trouble' && Q(N) !== 'double') errors.push({ code: 'F2', msg: `Q${N} (final) must be DOUBLE TROUBLE or DOUBLE` });

  // C1 at least one double in Q2–Q3
  if (!(Q(2) === 'double' || Q(3) === 'double')) errors.push({ code: 'C1', msg: 'C1: needs a DOUBLE in Q2–Q3' });

  // C2 exactly one trouble in Q7–Q9
  const troubles = [7, 8, 9].filter((i) => Q(i) === 'trouble').length;
  if (troubles !== 1) errors.push({ code: 'C2', msg: `C2: needs exactly one DOUBLE TROUBLE in Q7–Q9 (has ${troubles})` });

  // C3 between 1 and 3 penalty rounds in Q1–Q9
  const pen = plan.slice(0, N - 1).filter(isPenalty).length;
  if (pen < 1 || pen > 3) errors.push({ code: 'C3', msg: `C3: needs 1–3 penalty rounds in Q1–Q${N - 1} (has ${pen})` });

  // C4 no two penalty rounds back-to-back, none directly before the final
  for (let i = 1; i < N - 1; i++) {
    if (isPenalty(Q(i)) && isPenalty(Q(i + 1))) errors.push({ code: 'C4', msg: `C4: Q${i} and Q${i + 1} are both penalty rounds` });
  }
  if (isPenalty(Q(N - 1))) errors.push({ code: 'C4', msg: `C4: Q${N - 1} is a penalty round right before the final` });

  // C5 at most one mystery; never Q1–Q3 or the final
  const mysteries = plan.map((m, i) => (m === 'mystery' ? i + 1 : 0)).filter(Boolean);
  if (mysteries.length > 1) errors.push({ code: 'C5', msg: 'C5: at most one MYSTERY' });
  for (const i of mysteries) if (i <= 3 || i === N) errors.push({ code: 'C5', msg: `C5: no MYSTERY on Q${i}` });

  // C6 type compatibility
  plan.forEach((m, i) => {
    const t = questions[i]?.type;
    if (t && !compatible(m, t)) errors.push({ code: 'C6', msg: `C6: Q${i + 1} (${TYPE_LABEL[t]}) can't take ${MOD_META[m].name}` });
  });

  // C7 no modifier three times in a row
  for (let i = 1; i + 2 <= N; i++) {
    if (Q(i) === Q(i + 1) && Q(i + 1) === Q(i + 2)) errors.push({ code: 'C7', msg: `C7: ${MOD_META[Q(i)].name} three times in a row (Q${i}–Q${i + 2})` });
  }
  return { ok: errors.length === 0, errors };
}

export const TYPE_LABEL: Record<QType, string> = { mc: 'MC', typed: 'Typed', fave: "Host's Fave", crowd: "Crowd's Pick", number: 'Closest number' };

export function planModifiers(questions: Question[], seed: number, locked: (ModifierId | null | undefined)[] = []): ModifierId[] {
  const rng = mulberry32(seed);
  const N = questions.length;
  for (let attempt = 0; attempt < 500; attempt++) {
    const plan = questions.map((q, i) => {
      const fixed = locked[i];
      if (fixed) return fixed;
      let pool = poolFor(i + 1, N).filter(([m]) => compatible(m, q.type));
      if (!pool.length) pool = (['double', 'normal'] as ModifierId[]).filter((m) => compatible(m, q.type)).map((m) => [m, 1] as [ModifierId, number]);
      return weightedPick(rng, pool, ([, w]) => w)[0];
    });
    if (validate(plan, questions).ok) return plan;
  }
  throw new Error('No valid plan: unlock a row or relax a constraint');
}
