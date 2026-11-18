// /dev/preview?q=5&kind=bday_sale&phase=ANSWER — renders the real player screens from real engine
// state (no server), with an optional chaos event forced on. Used by the layering test and for
// eyeballing skins without running a whole game.
import { useMemo } from 'react';
import { apply, join, newGame, tick, TIMING } from '../shared/game';
import { parseQuestions } from '../shared/questions';
import type { ChaosKind } from '../shared/types';
import { viewFor } from '../shared/views';
import sample from '../../questions.example.json';
import { PlayerPreview } from './player';

export function DevPreview() {
  const qs = new URLSearchParams(location.search);
  const qn = Number(qs.get('q') ?? 1);
  const kind = qs.get('kind') as ChaosKind | null;
  const phase = qs.get('phase') ?? 'ANSWER';
  const answered = qs.has('answered');
  const view = useMemo(() => {
    const parsed = parseQuestions(sample);
    if (!parsed.ok) throw new Error(parsed.errors.join());
    let now = Date.now();
    const s = newGame({ pin: 'DEVV', secretHash: 'x', questions: parsed.questions, seed: 36, now });
    s.chaos.intensity = 'off';
    ['Priya', 'Marcus', 'Jo', 'Wei Ling', 'Dev'].forEach((n, i) => join(s, { id: `p${i}`, token: `t${i}`, name: n, avatar: i + 2, now }));
    apply(s, { role: 'host' }, { t: 'start' }, now);
    // fast-forward to question qn
    for (let q = 1; ; q++) {
      now += TIMING.MODIFIER; tick(s, now);
      if (q === qn && phase === 'BET') break;
      apply(s, { role: 'player', pid: 'p0' }, { t: 'bet', chip: 700 - (q % 3) * 100 }, now);
      now += TIMING.BET + TIMING.GRACE + 1; tick(s, now);
      if (q === qn) break;
      apply(s, { role: 'host' }, { t: 'endNow' }, now); tick(s, now);
      if (s.phase === 'JUDGE') { if (s.questions[q - 1].type === 'number') apply(s, { role: 'host' }, { t: 'setReal', value: 1 }, now); apply(s, { role: 'host' }, { t: 'finishJudging' }, now); }
      while (s.phase === 'REVEAL') apply(s, { role: 'host' }, { t: 'revealNext' }, now);
      apply(s, { role: 'host' }, { t: 'next' }, now);
    }
    if (answered) {
      const q = s.questions[qn - 1];
      apply(s, { role: 'player', pid: 'p0' }, { t: 'answer', v: q.type === 'mc' ? 1 : q.type === 'number' ? 42 : q.type === 'crowd' ? 'p1' : 'mcfly' }, now);
    }
    if (kind && s.phase === 'ANSWER') {
      s.chaosQueue.push({
        id: 'dev', kind, player: 'p0', q: qn, at: now, until: now + 600_000, fired: true,
        data: kind === 'toto' ? { numbers: [6, 7, 16, 17, 26, 27] } : kind === 'auntie_chope' ? { tile: 2 } : undefined,
      });
      s.endsAt = now + 15_000;
    }
    return viewFor(s, { role: 'player', pid: 'p0' }, now);
  }, []);
  return <PlayerPreview view={view} />;
}
