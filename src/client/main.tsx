import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PIN_RE } from '../shared/protocol';
import { Window } from './ds';
import { HostEntry } from './host';
import { DevPreview } from './dev';
import { PlayerApp } from './player';
import { Phone } from './skins';
import './styles/tokens.css';
import './styles/bundle.css';
import './styles/app.css';

// Routes: /host#PIN.secret → host app · /ABCD → player with PIN · / → PIN entry
function App() {
  const path = location.pathname.replace(/^\/+|\/+$/g, '');
  if (path.toLowerCase() === 'host') return <HostEntry />;
  if (path === 'dev/preview') return <DevPreview />;
  const pin = path.toUpperCase();
  if (PIN_RE.test(pin)) return <PlayerApp pin={pin} />;
  return <PinEntry />;
}

function PinEntry() {
  const [pin, setPin] = useState('');
  return (
    <Phone>
      <div className="bx-phone__main app-center">
        <Window title="BDAY.EXE">
          <form className="bx-body bx-stack" onSubmit={(e) => { e.preventDefault(); if (PIN_RE.test(pin)) location.href = `/${pin}`; }}>
            <label className="caption app-muted" htmlFor="pe">Room PIN</label>
            <div className="bx-address__field"><input id="pe" value={pin} maxLength={4} autoCapitalize="characters" autoComplete="off" onChange={(e) => setPin(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())} placeholder="ANNE" style={{ font: '700 28px/36px var(--font-pixel)', letterSpacing: 6 }} /></div>
            <button className="bx-btn bx-btn--primary bx-btn--lg bx-btn--block" disabled={!PIN_RE.test(pin)}>Join →</button>
            <p className="caption app-muted app-nomargin">Hosting? Go to <a href="/host">/host</a>.</p>
          </form>
        </Window>
      </div>
    </Phone>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
