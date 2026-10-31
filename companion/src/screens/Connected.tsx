import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AppSettings, SyncOutcome, SyncState, TokenStatus } from '../api/bridge';
import { bridge } from '../api/bridge';
import Stepper from '../components/Stepper';

interface Props {
  token: TokenStatus;
  settings: AppSettings;
  onChange: () => void;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'jamais';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'à l’instant';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString();
}

export default function Connected({ token, settings, onChange }: Props) {
  const navigate = useNavigate();
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    void bridge
      .getSyncState()
      .then(setSyncState)
      .catch(() => undefined);

    const unlisten = listen<SyncOutcome>('sync:status', (event) => {
      setSyncState(event.payload.state);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  async function forceSync() {
    setBusy(true);
    try {
      const outcome = await bridge.syncNow();
      setSyncState(outcome.state);
    } catch (err) {
      console.error('sync_now failed', err);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!confirm('Révoquer ce token ? Tu devras refaire la connexion.')) return;
    setRevoking(true);
    try {
      await bridge.revokeLocalToken();
      onChange();
      navigate('/pair');
    } finally {
      setRevoking(false);
    }
  }

  const status = syncState?.lastError
    ? { color: '#f5a4a4', label: 'Erreur' }
    : syncState?.lastSyncedAt
      ? { color: '#a4f5b8', label: 'OK' }
      : { color: '#c0c5cf', label: 'Aucune sync' };

  return (
    <>
      <Stepper current="connected" />

      <h1>Synchronisation des loots</h1>
      <p>
        Le fichier RCLootCouncil.lua est surveillé en arrière-plan. Chaque sauvegarde déclenche un
        push automatique.
      </p>

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: status.color,
              }}
            />
            <strong>{status.label}</strong>
          </div>
          <button type="button" className="btn" onClick={forceSync} disabled={busy}>
            {busy ? 'Sync…' : 'Forcer une sync'}
          </button>
        </div>

        <div className="row" style={{ gap: 24, flexWrap: 'wrap' }}>
          <div>
            <span className="label">Dernière sync</span>
            <p style={{ margin: 0 }}>{timeAgo(syncState?.lastSyncedAt ?? null)}</p>
          </div>
          <div>
            <span className="label">Dernier push</span>
            <p style={{ margin: 0 }}>{syncState?.lastInserted ?? 0} entrées</p>
          </div>
          <div>
            <span className="label">Total inséré</span>
            <p style={{ margin: 0 }}>{syncState?.totalInserted ?? 0}</p>
          </div>
          <div>
            <span className="label">Total doublons</span>
            <p style={{ margin: 0 }}>{syncState?.totalDuplicates ?? 0}</p>
          </div>
        </div>

        {syncState?.lastError && <div className="error">{syncState.lastError}</div>}

        {syncState && syncState.lastUnmatched.length > 0 && (
          <div>
            <span className="label">Joueurs non reconnus ({syncState.lastUnmatched.length})</span>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {syncState.lastUnmatched.slice(0, 10).join(', ')}
              {syncState.lastUnmatched.length > 10 ? '…' : ''}
            </p>
          </div>
        )}
      </div>

      <div className="card stack">
        <div>
          <span className="label">Serveur API</span>
          <code>{settings.serverUrl}</code>
        </div>
        <div>
          <span className="label">Compte WoW</span>
          <code>{settings.selectedAccount}</code>
        </div>
        <div>
          <span className="label">Token</span>
          <p style={{ margin: 0 }}>
            Expire le{' '}
            <strong>
              {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : '—'}
            </strong>{' '}
            · scopes : <span className="muted">{token.scopes.join(', ')}</span>
          </p>
        </div>
        <button type="button" className="btn-secondary btn" onClick={revoke} disabled={revoking}>
          Révoquer ce token
        </button>
      </div>
    </>
  );
}
