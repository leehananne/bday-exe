// Core data model for BDAY.EXE (PRD §6, §6a, §8a, §10 "Data model").

export type SkinId = 'xp' | 'igloo' | 'fakebook' | 'ie' | 'monster' | 'dollz' | 'bear' | 'myspaze' | 'brick' | 'bsod' | 'insta';
export type QType = 'mc' | 'typed' | 'fave' | 'crowd' | 'number';
export type ModifierId = 'normal' | 'double' | 'risky' | 'trouble' | 'mystery';
export type Resolved = Exclude<ModifierId, 'mystery'>;
export type Outcome = 'right' | 'wrong' | 'crowned' | 'lol' | 'exact' | 'none';
export type PlayerId = string;

export interface Question {
  id: number;
  skin: SkinId;
  type: QType;
  category: string;
  prompt: string;
  /** mc: 2–4 options. crowd: optional fixed options (otherwise players vote for a friend). */
  options?: string[];
  /** mc: index of the correct option. */
  answer?: number;
  /** typed: accepted spellings (normalised when compared). */
  accept?: string[];
  seconds: number;
  /** Pre-locks this row of the modifier plan. */
  modifier?: ModifierId;
  /** Optional hype line: a big banner + confetti when the question starts ("TIME TO PROVIDE AFFIRMATION!!!!"). */
  hype?: string;
}

export type ChaosKind =
  | 'scam_eyepad' | 'scam_virus' | 'scam_smileys' | 'toto' | 'fourd' | 'huat'
  | 'auntie_forward' | 'auntie_chope' | 'boss_email' | 'bday_sale' | 'melvin';

export type Intensity = 'off' | 'mild' | 'chaos';

export interface ChaosConfig {
  intensity: Intensity;
  enabled: ChaosKind[];
  mercy: boolean;
}

export interface ChaosEvent {
  id: string;
  kind: ChaosKind;
  player: PlayerId;
  q: number;
  at: number;
  until: number | null;
  data?: { numbers?: number[]; tile?: number };
  /** Set by the server when `at` passes. */
  fired?: boolean;
  /** Ended by timeout, dismissal, chope clear, or phase end. */
  ended?: boolean;
  /** A player-sent pop-up (power-up) rather than a random event. */
  from?: PlayerId;
}

export interface QueuedPopup { from: PlayerId; to: PlayerId; kind: ChaosKind; q: number }

export interface Player {
  id: PlayerId;
  token: string;
  name: string;
  avatar: number;
  joinedAt: number;
  online: boolean;
  kicked: boolean;
  power: { nudge: number; popup: number };
  chaosCount: number;
  chaosSeen: ChaosKind[];
  chaosMs: number;
  reactions: number;
}

export type AnswerValue = number | string;
export interface Answer { v: AnswerValue; at: number }

export type Verdict = 'right' | 'wrong' | 'lol';

export interface Judging {
  /** typed: verdict per normalised group key. */
  verdicts: Record<string, Verdict>;
  /** fave */
  crowned: PlayerId | null;
  /** Which of the crowned player's answers was crowned (they can send several). */
  crownedIdx?: number | null;
  lols: PlayerId[];
  /** number */
  real: number | null;
}

export interface QResult {
  resolved: Resolved;
  outcome: Record<PlayerId, Outcome>;
  delta: Record<PlayerId, number>;
}

export interface Round {
  bets: Record<PlayerId, number>;
  answers: Record<PlayerId, Answer>;
  judging: Judging;
  /** MYSTERY draw, made at lock time. */
  mystery: Resolved | null;
  result: QResult | null;
  skipped: boolean;
  answerStart: number | null;
  /** Typed / Host's Fave: every answer each player sent (they can send as many as they like). */
  texts?: Record<PlayerId, string[]>;
}

export type Phase = 'LOBBY' | 'MODIFIER' | 'BET' | 'ANSWER' | 'JUDGE' | 'REVEAL' | 'LEADERBOARD' | 'PODIUM';
export type RevealStep = 'mystery' | 'split' | 'answer' | 'points';

export interface GameState {
  v: 1;
  pin: string;
  seed: number;
  planSeed: number;
  secretHash: string;
  createdAt: number;
  questions: Question[];
  plan: ModifierId[];
  locked: boolean[];
  chaos: ChaosConfig;
  calm: boolean;
  powerups: boolean;
  /** Kahoot-style autopilot: reveal steps play on timers; optionally the next question starts by itself. */
  auto?: { reveal: boolean; next: boolean };
  phase: Phase;
  /** 1-based current question; 0 in the lobby. */
  q: number;
  endsAt: number | null;
  pausedAt: number | null;
  pausedLeft: number | null;
  phaseStartedAt: number;
  revealStep: number;
  roast: string;
  players: Record<PlayerId, Player>;
  order: PlayerId[];
  rounds: Round[];
  chaosQueue: ChaosEvent[];
  popups: QueuedPopup[];
  hostOnline: boolean;
}
