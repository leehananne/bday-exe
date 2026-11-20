import { describe, expect, it } from 'vitest';
import party from '../questions.json';
import { newGame } from '../src/shared/game';
import { planModifiers, validate } from '../src/shared/modifiers';
import { parseQuestions } from '../src/shared/questions';

describe('the party questions (questions.json)', () => {
  const r = parseQuestions(party);
  it('pass the questions.json checks', () => {
    if (!r.ok) console.log(r.errors);
    expect(r.ok).toBe(true);
  });
  it('always produce a valid modifier plan, whatever the seed', () => {
    if (!r.ok) return;
    for (let seed = 0; seed < 200; seed++) expect(validate(planModifiers(r.questions, seed), r.questions).ok).toBe(true);
    const g = newGame({ pin: 'ANNE', secretHash: 'x', questions: r.questions, seed: 1, now: 0 });
    expect(g.plan[0]).toBe('normal');
    expect(g.plan[9]).toBe('trouble');
  });
  it('only uses the Blue Screen skin on the final question', () => {
    if (!r.ok) return;
    r.questions.forEach((q, i) => expect(q.skin === 'bsod').toBe(i === r.questions.length - 1));
  });
});
