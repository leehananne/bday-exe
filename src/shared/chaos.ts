// Random chaos events (PRD §8a): catalogue + deterministic scheduler.
import { hash, mulberry32, weightedPick } from './rng';
import type { ChaosEvent, ChaosKind, GameState, Intensity, Player, Question } from './types';

export const ALL_KINDS: ChaosKind[] = [
  'scam_eyepad', 'scam_virus', 'scam_smileys', 'toto', 'fourd', 'huat',
  'auntie_forward', 'auntie_chope', 'boss_email', 'bday_sale', 'melvin',
];

export const WEIGHT: Record<ChaosKind, number> = {
  scam_eyepad: 2, scam_virus: 1, scam_smileys: 1, toto: 2, fourd: 2, huat: 2,
  auntie_forward: 2, auntie_chope: 1, boss_email: 2, bday_sale: 2, melvin: 1,
};

export const DURATION: Record<ChaosKind, number | null> = {
  scam_eyepad: 6000, scam_virus: 6000, scam_smileys: 6000, toto: 6000, fourd: 6000, huat: 5000,
  auntie_forward: 6000, auntie_chope: null, boss_email: 7000, bday_sale: 7000, melvin: 6000,
};

/** How many questions each player gets hit on, out of Q2…Q(N−1). Each player gets their own random set. */
export const PER_PLAYER: Record<Intensity, [number, number]> = { off: [0, 0], mild: [3, 4], chaos: [6, 7] };

/** The questions this player's chaos lands on: a per-player random pick, fixed by the room seed (reconnect-safe). */
export function chaosQuestions(seed: number, pid: string, total: number, intensity: Intensity): number[] {
  const [lo, hi] = PER_PLAYER[intensity];
  const eligible = Array.from({ length: Math.max(0, total - 2) }, (_, i) => i + 2); // never Q1 or the final
  const rng = mulberry32(hash(seed, 'chaos-plan', pid));
  const k = Math.min(eligible.length, lo + Math.floor(rng() * (hi - lo + 1)));
  for (let i = eligible.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [eligible[i], eligible[j]] = [eligible[j], eligible[i]]; }
  return eligible.slice(0, k).sort((a, b) => a - b);
}

/** The toggle rows in HostSetup and the kinds each one controls. */
export const FAMILIES: { id: string; label: string; hint: string; kinds: ChaosKind[] }[] = [
  { id: 'scam', label: 'Scam pop-ups', hint: 'eyePad, 24 viruses, free smileys', kinds: ['scam_eyepad', 'scam_virus', 'scam_smileys'] },
  { id: 'lottery', label: 'Lottery', hint: 'TOTE-LLY slip, 4D ticket (all 67s)', kinds: ['toto', 'fourd'] },
  { id: 'bait', label: 'Bait', hint: 'Boss email, 12.3 sale, Melvin question', kinds: ['boss_email', 'bday_sale', 'melvin'] },
  { id: 'huat', label: 'Huat Ah!', hint: 'Banner + red-packet rain', kinds: ['huat'] },
  { id: 'forward', label: 'Auntie forward', hint: 'Good-morning chain message', kinds: ['auntie_forward'] },
  { id: 'chope', label: 'Auntie chope', hint: 'Tissue packet on an answer tile', kinds: ['auntie_chope'] },
];

export const SCAM_KINDS: ChaosKind[] = ['scam_eyepad', 'scam_virus', 'scam_smileys'];

export const KIND_LABEL: Record<ChaosKind, string> = {
  scam_eyepad: 'FREE eyePad', scam_virus: '24 viruses', scam_smileys: 'Free smileys', toto: 'TOTE-LLY LUCKY',
  fourd: '4D ticket', huat: 'Huat Ah!', auntie_forward: 'Auntie forward', auntie_chope: 'Auntie chope',
  boss_email: 'Boss email', bday_sale: '12.3 sale', melvin: 'Melvin?',
};

export function fits(k: ChaosKind, q: Question): boolean {
  if (k === 'auntie_chope') return q.type === 'mc' && (q.options?.length ?? 0) >= 3;
  return true;
}

export function scheduleChaos(
  room: Pick<GameState, 'chaos' | 'seed' | 'questions'>,
  q: number,
  answerStart: number,
  endsAt: number,
  eligible: Player[],
): ChaosEvent[] {
  const cfg = room.chaos;
  const N = room.questions.length;
  if (cfg.intensity === 'off' || q === 1 || q === N) return [];
  const question = room.questions[q - 1];
  const out: ChaosEvent[] = [];
  for (const p of eligible) {
    const rng = mulberry32(hash(room.seed, q, p.id)); // deterministic per room/question/player
    if (!chaosQuestions(room.seed, p.id, N, cfg.intensity).includes(q)) continue;
    const kinds = cfg.enabled.filter((k) => !p.chaosSeen.includes(k) && fits(k, question));
    if (!kinds.length) continue;
    const kind = weightedPick(rng, kinds, (k) => WEIGHT[k]);
    const lo = answerStart + 2500, hi = endsAt - 5000;
    if (hi - lo < 1500) continue;
    const at = Math.round(lo + rng() * (hi - lo));
    const d = DURATION[kind];
    out.push({
      id: `c_${q}_${p.id}`, kind, player: p.id, q, at, until: d == null ? null : at + d,
      data: kind === 'toto' ? { numbers: [6, 7, 16, 17, 26, 27] }
        : kind === 'auntie_chope' ? { tile: Math.floor(rng() * (question.options?.length ?? 4)) } : undefined,
    });
  }
  return out;
}
