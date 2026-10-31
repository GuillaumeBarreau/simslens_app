import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { bridge, type AppSettings, type TokenStatus } from './api/bridge';
import Connected from './screens/Connected';
import Onboarding from './screens/Onboarding';
import PairDevice from './screens/PairDevice';

type BootState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; settings: AppSettings; token: TokenStatus };

export default function App() {
  const [state, setState] = useState<BootState>({ kind: 'loading' });

  useEffect(() => {
    void boot();
  }, []);

  async function boot() {
    try {
      const [settings, token] = await Promise.all([bridge.getSettings(), bridge.getTokenStatus()]);
      setState({ kind: 'ready', settings, token });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="app-shell">
        <p>Démarrage…</p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="app-shell">
        <div className="error">Erreur au démarrage : {state.message}</div>
      </div>
    );
  }

  const { settings, token } = state;
  const needsOnboarding = !settings.wowInstallPath || !settings.selectedAccount;
  const needsPairing = !token.hasToken;

  return (
    <div className="app-shell">
      <Routes>
        <Route
          path="/"
          element={
            needsOnboarding ? (
              <Navigate to="/onboarding" replace />
            ) : needsPairing ? (
              <Navigate to="/pair" replace />
            ) : (
              <Navigate to="/connected" replace />
            )
          }
        />
        <Route path="/onboarding" element={<Onboarding onDone={boot} initialSettings={settings} />} />
        <Route path="/pair" element={<PairDevice onDone={boot} settings={settings} />} />
        <Route
          path="/connected"
          element={<Connected token={token} settings={settings} onChange={boot} />}
        />
      </Routes>
    </div>
  );
}
