// End of game (PRD §8b, DS › PlayerResults / PlayerRanking): Spotlight crown moment → Results (compact podium +
// Spreadsheep diverging bar chart) → Awards → Ranking sheet (tap a name for its cell comment) → personal report.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { KIND_LABEL } from '../shared/chaos';
import type { FinalStanding, View } from '../shared/views';
import { Avatar, fmt, Pill, Spotlight, Window } from './ds';

const MEDAL = ['🥇', '🥈', '🥉'];
const minus = (n: number) => (n < 0 ? `−${fmt(-n)}` : fmt(n)); // true minus sign
const kLabel = (v: number) => (v === 0 ? '0' : `${v < 0 ? '−' : ''}${Math.abs(v) / 1000}k`);

export type ResultsPage = 'results' | 'awards' | 'ranking' | 'report';

function XlChrome({ title, fx, tab, onTab, children }: {
  title: string; fx: [string, string]; tab: 'Chart' | 'Ranking'; onTab?: (t: 'Chart' | 'Ranking') => void; children: React.ReactNode;
}) {
  return (
    <section className="bx-xl" style={{ flex: 1, minHeight: 0 }}>
      <div className="bx-titlebar"><span className="bx-title">{title}</span><span className="bx-ctl bx-ctl--close" aria-hidden="true">×</span></div>
      <div className="bx-xl__tools" aria-hidden="true">
        {['B', 'I', 'U', 'Σ', 'A↓Z', '📊', '%'].map((t) => <span key={t} className={`bx-xl__tool ${(t === '📊') === (tab === 'Chart') && t === '📊' ? 'is-on' : ''}`}>{t}</span>)}
      </div>
      <div className="bx-xl__fx"><span>{fx[0]}</span><i>fx</i><span>{fx[1]}</span></div>
      {children}
      <div className="bx-xl__tabs">
        {(['Chart', 'Ranking'] as const).map((t) => (
          <span key={t} className={tab === t ? 'is-on' : ''} role="button" tabIndex={0} onClick={() => onTab?.(t)} onKeyDown={(e) => e.key === 'Enter' && onTab?.(t)}>{t}</span>
        ))}
        <span>Q1–Q10</span><span>Chaos log</span>
      </div>
    </section>
  );
}

/** Compact podium: block heights fixed by RANK (56/40/28px), never by score. Order 2 · 1 · 3. */
function PodiumSm({ final }: { final: FinalStanding[] }) {
  const slot = (f: FinalStanding | undefined, cls: string) => f && (
    <div className={cls}><Avatar i={f.avatar} /><b>{f.name}</b><span>{minus(f.score)}</span><div className="blk">{f.rank}</div></div>
  );
  return <div className="bx-podium-sm">{slot(final[1], 'p2') ?? <div />}{slot(final[0], 'p1')}{slot(final[2], 'p3') ?? <div />}</div>;
}

export function ResultsChart({ final, meId }: { final: FinalStanding[]; meId?: string }) {
  const [tip, setTip] = useState<string | null>(null);
  const meRow = useRef<HTMLDivElement>(null);
  const tight = final.length > 15;
  const { lo, hi, ticks } = useMemo(() => {
    const scores = final.map((f) => f.score);
    const lo = Math.min(0, ...scores) - 400, hi = Math.max(0, ...scores) + 400;
    let step = 4000;
    const make = () => { const t: number[] = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) t.push(v); return t; };
    let ticks = make();
    if (ticks.length < 3) { step = 1000; ticks = make(); } // small games: finer gridlines so the axis still reads
    return { lo, hi, ticks };
  }, [final]);
  const pos = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const z = pos(0);
  useLayoutEffect(() => { meRow.current?.scrollIntoView({ block: 'center' }); }, []);
  return (
    <div className="bx-xl-chart" style={{ flex: 1 }} onClick={() => setTip(null)}>
      <p className="bx-xl-chart__title">Final scores ({final.length} player{final.length === 1 ? '' : 's'})</p>
      <div className="bx-xl-chart__legend">
        <span><i style={{ background: 'var(--xl-pos)' }} />Points</span>
        <span><i style={{ background: 'var(--xl-neg)' }} />IN DEBT</span>
        {meId && <span><i style={{ border: '1px dashed var(--xl-ink)' }} />You</span>}
      </div>
      <div className="bx-xl-chart__scroll">
        <div className="bx-hbars" role="table" aria-label="Final scores, highest to lowest">
          <div className="bx-hbars__grid" aria-hidden="true">
            {ticks.map((t) => <i key={t} className={t === 0 ? 'zero' : ''} style={{ left: `${pos(t)}%` }} />)}
          </div>
          {final.map((f) => {
            const me = f.pid === meId;
            const neg = f.score < 0;
            const left = neg ? pos(f.score) : z;
            const width = f.score === 0 ? 0.6 : Math.abs(pos(f.score) - z);
            return (
              <div key={f.pid} ref={me ? meRow : undefined} role="row"
                className={`bx-hbar ${tight ? 'bx-hbar--tight' : ''} ${f.rank <= 3 ? 'is-top' : ''} ${me ? 'bx-ants' : ''}`}
                aria-label={`Rank ${f.rank}, ${f.name}, ${minus(f.score)} points${me ? ', you' : ''}`}
                onClick={(e) => { e.stopPropagation(); setTip(tip === f.pid ? null : f.pid); }} style={{ cursor: 'pointer' }}>
                <div className="bx-hbar__who"><b>{f.rank <= 3 ? MEDAL[f.rank - 1] : f.rank}</b><Avatar i={f.avatar} /><span>{f.name}{me && <span className="bx-you-tag">YOU</span>}</span></div>
                <div className="bx-hbar__plot"><div className={`bx-hbar__bar ${neg ? 'is-neg' : ''}`} style={{ left: `${left}%`, width: `${width}%` }} /></div>
                <div className={`bx-hbar__val ${neg ? 'is-neg' : ''}`}>{minus(f.score)}</div>
                {tip === f.pid && <div className="bx-xl-tip" style={{ right: 52, top: -30 }} role="status">{f.name}: {minus(f.score)} · {f.right}/{f.played || 10} right · rank {f.rank} of {final.length}</div>}
              </div>
            );
          })}
          <div className="bx-hbars__axis" aria-hidden="true">
            <div /><div>{ticks.map((t) => <span key={t} style={{ left: `${pos(t)}%` }}>{kLabel(t)}</span>)}</div><div />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResultsScreen({ v, meId, onAwards, onRanking }: { v: View; meId?: string; onAwards: () => void; onRanking: () => void }) {
  const pod = v.podium!;
  const final = pod.final;
  const meIdx = final.findIndex((f) => f.pid === meId);
  const ref = meIdx >= 0 ? final[meIdx] : final[0];
  return (
    <div className="bx-phone__main" style={{ gap: 8, padding: 10 }}>
      <section className="bx-window" style={{ flex: 'none' }}>
        <div className="bx-titlebar"><span className="bx-title">Setup — Installation complete</span></div>
        <div className="bx-body" style={{ padding: '8px 10px 0' }}>
          <p className="phone-title" style={{ margin: '0 0 6px', textAlign: 'center', fontSize: 17 }}>{pod.age ?? 'Party complete.'} Winners:</p>
          <PodiumSm final={final} />
        </div>
      </section>
      <XlChrome title="Final_Scores.xls — Spreadsheep 2003" tab="Chart" onTab={(t) => t === 'Ranking' && onRanking()}
        fx={[`B${(meIdx >= 0 ? meIdx : 0) + 2}`, ref ? `=RANK(${minus(ref.score)}, Scores) → ${ref.rank}` : '']}>
        <ResultsChart final={final} meId={meId} />
      </XlChrome>
      <div className="bx-row" style={{ gap: 8, flexWrap: 'nowrap', flex: 'none' }}>
        <button className="bx-btn" style={{ flex: 1 }} onClick={onAwards}>Awards ▸</button>
        <button className="bx-btn bx-btn--primary" style={{ flex: 1.4 }} onClick={onRanking}>Full ranking ▸</button>
      </div>
    </div>
  );
}

export function AwardsScreen({ v, onBack, onNext }: { v: View; onBack: () => void; onNext: () => void }) {
  const pod = v.podium!;
  const byPid = Object.fromEntries(pod.final.map((f) => [f.pid, f]));
  return (
    <div className="bx-phone__main" style={{ gap: 8, padding: 10 }}>
      <Window title="Awards.exe — and the winners are…" style={{ flex: 1 }}>
        <div className="bx-body bx-stack">
          {pod.awards.length === 0 && <p className="phone-body app-nomargin">No awards this time. Everyone was equally mid.</p>}
          {pod.awards.map((a) => (
            <div key={a.id} className="bx-buddy" style={{ gap: 10 }}>
              <Avatar i={byPid[a.pid]?.avatar ?? 0} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <Pill kind={a.id === 'wrong' ? 'wrong' : a.id === 'fave' ? 'fave' : 'accent'}>{a.icon} {a.label}</Pill>
                <br /><b className="phone-body">{a.name}</b> <span className="caption app-muted">{a.detail}</span>
              </span>
            </div>
          ))}
        </div>
      </Window>
      <div className="bx-row" style={{ gap: 8, flexWrap: 'nowrap', flex: 'none' }}>
        <button className="bx-btn" style={{ flex: 1 }} onClick={onBack}>◂ Chart</button>
        <button className="bx-btn bx-btn--primary" style={{ flex: 1.4 }} onClick={onNext}>Full ranking ▸</button>
      </div>
    </div>
  );
}

const AWARD_TEXT: Record<string, string> = { wrong: '💀 Most Wrong', agent: '👉 Chaos Agent', scammed: '📢 Most Scammed', fave: "★ Anne's Fave Human" };

export function RankingScreen({ v, meId, onChart, next, nextLabel }: { v: View; meId?: string; onChart: () => void; next: () => void; nextLabel: string }) {
  const final = v.podium!.final;
  const [note, setNote] = useState<{ pid: string; top: number } | null>(null);
  const meIdx = final.findIndex((f) => f.pid === meId);
  const me = meIdx >= 0 ? final[meIdx] : null;
  const box = useRef<HTMLDivElement>(null);
  const meRow = useRef<HTMLTableRowElement>(null);
  useLayoutEffect(() => { meRow.current?.scrollIntoView({ block: 'center' }); }, []);
  const n = note ? final.find((f) => f.pid === note.pid) : null;
  return (
    <div className="bx-phone__main" style={{ padding: 10, gap: 8 }}>
      <XlChrome title="Final_Ranking.xls — Spreadsheep 2003" tab="Ranking" onTab={(t) => t === 'Chart' && onChart()}
        fx={[`B${(meIdx >= 0 ? meIdx : 0) + 2}`, me ? `=IF(C${meIdx + 2}<0, "IN DEBT", "fine")  → ${me.score < 0 ? 'IN DEBT' : 'fine'}` : '=SUM(Fun)']}>
        <div ref={box} style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }} onClick={() => setNote(null)}>
          <table className="bx-sheet" aria-label="Final ranking">
            <colgroup><col style={{ width: 22 }} /><col style={{ width: 34 }} /><col /><col style={{ width: 72 }} /><col style={{ width: 48 }} /></colgroup>
            <thead><tr><th /><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead>
            <tbody>
              <tr className="hdr"><th className="rowh">1</th><td>#</td><td>Player</td><td className="num">Score</td><td className="num">Right</td></tr>
              {final.map((f, i) => (
                <tr key={f.pid} ref={f.pid === meId ? meRow : undefined} className={`${f.rank <= 3 ? `r${f.rank}` : ''} ${f.pid === meId ? 'bx-ants' : ''}`}>
                  <th className="rowh">{i + 2}</th>
                  <td className="num">{f.rank}</td>
                  <td className={note?.pid === f.pid ? 'has-note' : ''} style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); const tr = (e.currentTarget as HTMLElement).parentElement!; setNote(note?.pid === f.pid ? null : { pid: f.pid, top: tr.offsetTop }); }}>
                    <span className="who"><Avatar i={f.avatar} />{f.name}{f.pid === meId && <span className="bx-you-tag">YOU</span>}</span>
                  </td>
                  <td className={`num ${f.score < 0 ? 'neg' : ''}`}>{f.score < 0 ? `(${fmt(-f.score)})` : fmt(f.score)}</td>
                  <td className="num">{f.right}/{f.played || 10}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {n && note && (
            <div className="bx-xl-note" style={{ left: 150, top: note.top + 4 }} role="note">
              <b>{n.name} · rank {n.rank}</b>
              {n.right}/{n.played || 10} right · {minus(n.score)}
              <br />Worst bet: {n.worstBet ? n.worstBet.text : 'none. Suspiciously careful.'}
              <br />Chaos received: {n.chaosReceived.length}{n.chaosReceived.length ? ` (${n.chaosReceived.map((k) => KIND_LABEL[k]).join(', ')})` : ''}
              {n.awards.length > 0 && <><br />Award: {n.awards.map((a) => AWARD_TEXT[a] ?? a).join(', ')}</>}
            </div>
          )}
        </div>
      </XlChrome>
      <div className="bx-row" style={{ gap: 8, flexWrap: 'nowrap', flex: 'none' }}>
        <button className="bx-btn" style={{ flex: 1 }} onClick={onChart}>◂ Chart</button>
        <button className="bx-btn bx-btn--primary" style={{ flex: 1.4 }} onClick={next}>{nextLabel}</button>
      </div>
    </div>
  );
}

/** The crown moment that opens the results (DS Spotlight; "Use for: … the crowned …"). Ties share the crown. */
export function CrownSpotlight({ v }: { v: View }) {
  const final = v.podium!.final;
  const winners = final.filter((f) => f.rank === 1);
  if (!winners.length) return null;
  return (
    <Spotlight drum="★ AND THE WINNER IS… ★" rule={`${v.podium!.age ?? ''} ${winners.length > 1 ? 'A tie! Share the cake.' : 'Bow down.'}`.trim()}>
      <div className="bx-mod bx-mod--double" style={{ width: '100%' }}>
        <span className="bx-mod__icon" aria-hidden="true" style={{ padding: 2 }}><Avatar i={winners[0].avatar} style={{ width: '100%', height: '100%' }} /></span>
        <span className="bx-mod__body"><span className="bx-mod__name">{winners.map((w) => w.name).join(' & ')}</span><span className="bx-mod__rule">{minus(winners[0].score)} points</span></span>
      </div>
    </Spotlight>
  );
}
