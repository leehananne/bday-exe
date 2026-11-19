// questions.json loading + validation (PRD §10 "Question file", §9 readability limits).
import type { ModifierId, QType, Question, SkinId } from './types';

export const SKINS: Record<SkinId, { name: string; theme: string; short: string }> = {
  xp: { name: 'FlopXP', theme: 'xp', short: 'FlopXP' },
  igloo: { name: 'Igloo Island', theme: 'igloo', short: 'Igloo' },
  fakebook: { name: 'Fakebook chat', theme: 'fakebook', short: 'Fakebook' },
  ie: { name: 'Internet Exploder', theme: 'xp', short: 'Exploder' },
  monster: { name: 'Monster Mash', theme: 'monster', short: 'Monster' },
  dollz: { name: 'Dollz Dreamhouse', theme: 'dollz', short: 'Dollz' },
  bear: { name: 'Build-a-Blunder Workshop', theme: 'bear', short: 'Bear' },
  myspaze: { name: 'MySpaze', theme: 'myspaze', short: 'MySpaze' },
  brick: { name: 'Brick Phone', theme: 'xp', short: 'Brick' },
  bsod: { name: 'Blue Screen of Birthday', theme: 'xp', short: 'BSOD' },
  insta: { name: 'Instagran 2011', theme: 'insta', short: 'Instagran' },
};

const TYPES: QType[] = ['mc', 'typed', 'fave', 'crowd', 'number'];
const MODS: ModifierId[] = ['normal', 'double', 'risky', 'trouble', 'mystery'];
export const LIMITS = { prompt: 110, option: 40, typed: 40, fave: 60, name: 16, hype: 40 };

export function parseQuestions(input: unknown): { ok: true; questions: Question[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const arr = Array.isArray(input) ? input : (input as any)?.questions;
  if (!Array.isArray(arr)) return { ok: false, errors: ['questions.json must be an array of questions'] };
  if (arr.length !== 10) errors.push(`Need exactly 10 questions (got ${arr.length}). Keep a spare in a separate file.`);
  const out: Question[] = arr.map((raw: any, i: number) => {
    const n = i + 1;
    const err = (m: string) => errors.push(`Q${n}: ${m}`);
    const q: Question = {
      id: Number.isFinite(raw?.id) ? raw.id : n,
      skin: raw?.skin, type: raw?.type, category: String(raw?.category ?? '').trim(),
      prompt: String(raw?.prompt ?? '').trim(), seconds: Number(raw?.seconds ?? 20),
    };
    if (!(q.skin in SKINS)) err(`unknown skin "${raw?.skin}" (use ${Object.keys(SKINS).join(', ')})`);
    if (!TYPES.includes(q.type)) err(`unknown type "${raw?.type}" (use ${TYPES.join(', ')})`);
    if (!q.prompt) err('prompt is empty');
    if (q.prompt.length > LIMITS.prompt) err(`prompt is ${q.prompt.length} chars (max ${LIMITS.prompt})`);
    if (!q.category) err('category is empty');
    if (!(q.seconds >= 10 && q.seconds <= 90)) err('seconds must be 10–90');
    if (raw?.hype != null && String(raw.hype).trim()) {
      q.hype = String(raw.hype).trim();
      if (q.hype.length > LIMITS.hype) err(`hype is ${q.hype.length} chars (max ${LIMITS.hype})`);
    }
    if (raw?.modifier != null) {
      if (!MODS.includes(raw.modifier)) err(`unknown modifier "${raw.modifier}"`);
      else q.modifier = raw.modifier;
    }
    if (raw?.options != null) {
      if (!Array.isArray(raw.options)) err('options must be an array');
      else q.options = raw.options.map((o: unknown) => String(o).trim());
    }
    for (const o of q.options ?? []) if (o.length > LIMITS.option) err(`option "${o.slice(0, 20)}…" is over ${LIMITS.option} chars`);
    if (q.type === 'mc') {
      const n = q.options?.length ?? 0;
      if (n < 2 || n > 4) err('multiple choice needs 2–4 options');
      if (!Number.isInteger(raw?.answer) || raw.answer < 0 || raw.answer >= n) err('answer must be the index (0-based) of the correct option');
      else q.answer = raw.answer;
    }
    if (q.type === 'crowd' && q.options && (q.options.length < 2 || q.options.length > 16)) err("crowd's pick options must be 2–16 (or omit them to vote for friends)");
    if (q.type === 'typed') {
      if (!Array.isArray(raw?.accept) || !raw.accept.length) err('typed needs an "accept" list');
      else q.accept = raw.accept.map((a: unknown) => String(a));
    }
    return q;
  });
  return errors.length ? { ok: false, errors } : { ok: true, questions: out };
}

/** Lower-case, strip spaces and punctuation: "Mc Fly!!" → "mcfly". */
export const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
