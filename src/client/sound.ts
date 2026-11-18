// Original chiptune cues built from oscillators (no sampled OS/messenger sounds). Off by default;
// a per-phone toggle stored in localStorage (PRD §8.14).
import { store } from './net';

type Cue = 'join' | 'lock' | 'tick' | 'reveal' | 'nudge' | 'crash' | 'right' | 'wrong';
const NOTES: Record<Cue, [number, number][]> = {
  join: [[523, 0.08], [784, 0.12]],
  lock: [[880, 0.06], [1175, 0.08]],
  tick: [[1046, 0.05]],
  reveal: [[392, 0.08], [523, 0.08], [659, 0.14]],
  nudge: [[220, 0.06], [196, 0.06], [220, 0.06], [196, 0.1]],
  crash: [[110, 0.25], [82, 0.4]],
  right: [[659, 0.08], [880, 0.08], [1319, 0.16]],
  wrong: [[311, 0.14], [233, 0.24]],
};

let ctx: AudioContext | null = null;
export const soundOn = () => store.get('bday:sound') === '1';
export function setSound(on: boolean) {
  store.set('bday:sound', on ? '1' : '0');
  if (on) play('lock');
}

export function play(cue: Cue) {
  if (!soundOn()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    let t = ctx.currentTime;
    for (const [f, d] of NOTES[cue]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + d);
      t += d;
    }
  } catch { /* no audio */ }
}

export function vibrate(ms: number) {
  try { (navigator as any).vibrate?.(ms); } catch { /* iOS: unsupported */ }
}
