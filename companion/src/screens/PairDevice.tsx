import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AppSettings, DeviceCodeResponse } from '../api/bridge';
import { bridge } from '../api/bridge';
import Stepper from '../components/Stepper';

interface Props {
  settings: AppSettings;
  onDone: () => void;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'awaiting'; code: DeviceCodeResponse; expiresAt: number }
  | { kind: 'granted' }
  | { kind: 'error'; message: string };

export default function PairDevice({ settings, onDone }: Props) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const pollTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) window.clearTimeout(pollTimer.current);
    };
  }, []);

  async function start() {
    setPhase({ kind: 'requesting' });
    try {
      const deviceName = `${navigator.platform || 'Desktop'}`;
      const code = await bridge.requestDeviceCode(deviceName);
      const expiresAt = Date.now() + code.expiresIn * 1000;
      setPhase({ kind: 'awaiting', code, expiresAt });
      schedulePoll(code, expiresAt);

      const url = `${settings.appUrl.replace(/\/$/, '')}/device?code=${encodeURIComponent(code.userCode)}`;
      await bridge.openExternal(url).catch(() => {
        /* user can still copy/paste */
      });
    } catch (err) {
      setPhase({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function schedulePoll(code: DeviceCodeResponse, expiresAt: number) {
    pollTimer.current = window.setTimeout(async () => {
      if (Date.now() >= expiresAt) {
        setPhase({ kind: 'error', message: "Le code a expiré, recommence l'opération." });
        return;
      }
      try {
        const r = await bridge.pollDeviceToken(code.deviceCode);
        if (r.status === 'granted') {
          setPhase({ kind: 'granted' });
          onDone();
          window.setTimeout(() => navigate('/connected'), 1500);
          return;
        }
        if (r.status === 'expired') {
          setPhase({ kind: 'error', message: 'La demande a expiré côté serveur.' });
          return;
        }
      } catch (err) {
        console.warn('poll error', err);
      }
      schedulePoll(code, expiresAt);
    }, code.interval * 1000);
  }

  return (
    <>
      <Stepper current="pair" />

      <h1>Connecter cet appareil</h1>
      <p>
        On va t'attribuer un code à 8 caractères. Connecte-toi sur le site, saisis le code, choisis
        les realms accessibles, et l'appareil sera autorisé.
      </p>

      {phase.kind === 'idle' && (
        <div className="card stack">
          <p>L'appareil sera lié à ton compte Battle.net.</p>
          <button type="button" className="btn" onClick={start}>
            Démarrer la connexion
          </button>
        </div>
      )}

      {phase.kind === 'requesting' && (
        <div className="card">
          <p>Demande en cours…</p>
        </div>
      )}

      {phase.kind === 'awaiting' && (
        <div className="card stack">
          <div>
            <span className="label">Code à saisir sur le site</span>
            <div className="user-code">{phase.code.userCode}</div>
          </div>
          <p className="muted">
            Le navigateur a dû s'ouvrir automatiquement. Sinon, ouvre{' '}
            <span className="kbd">{settings.appUrl}/device</span> et colle le code.
          </p>
          <p>En attente de ta validation…</p>
        </div>
      )}

      {phase.kind === 'granted' && <div className="success">Appareil autorisé. Redirection…</div>}

      {phase.kind === 'error' && (
        <div className="card stack">
          <div className="error">{phase.message}</div>
          <button type="button" className="btn" onClick={start}>
            Recommencer
          </button>
        </div>
      )}
    </>
  );
}
