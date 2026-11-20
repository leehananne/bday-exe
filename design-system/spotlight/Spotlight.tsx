// BDAY.EXE Spotlight — React wrapper around spotlight.js.
// Usage:
//   const pillRef = useRef<HTMLSpanElement>(null);
//   const [revealing, setRevealing] = useState(true);
//   <ModifierPill ref={pillRef} id={modifier} />
//   <Spotlight
//     open={revealing}
//     drum="★ THIS ROUND IS… ★"
//     rule={RULES[modifier]}
//     targetRef={pillRef}
//     onDone={() => { setRevealing(false); startBetTimer(); }}
//   >
//     <ModifierBadge id={modifier} />
//   </Spotlight>

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createRoot } from 'react-dom/client';
import { showSpotlight } from './spotlight.js';
import './spotlight.css';

export interface SpotlightProps {
  /** Mount the spotlight when true. Each false → true transition replays it. */
  open: boolean;
  /** The banner in the light, usually a modifier badge. */
  children: ReactNode;
  drum?: string;
  rule?: string;
  /** Element the banner flies into on exit (e.g. the small modifier pill). */
  targetRef?: RefObject<Element>;
  /** Mount inside this element instead of the page (e.g. a phone-frame preview). */
  containerRef?: RefObject<Element>;
  /** ms to hold after landing. Default 2700. */
  hold?: number;
  /** Called after the spotlight has left: start the bet timer here. */
  onDone?: () => void;
}

export function Spotlight({ open, children, drum, rule, targetRef, containerRef, hold, onDone }: SpotlightProps) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const host = document.createElement('div');
    const root = createRoot(host);
    root.render(<>{children}</>);
    showSpotlight({
      banner: host,
      drum,
      rule,
      hold,
      target: targetRef?.current ?? undefined,
      container: containerRef?.current ?? document.body,
    }).then(() => {
      root.unmount();
      if (!cancelled) done.current?.();
    });
    return () => { cancelled = true; };
    // Replays only when `open` flips; content changes mid-reveal are ignored on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return null;
}
