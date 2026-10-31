import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AppSettings, WowInstall } from '../api/bridge';
import { bridge } from '../api/bridge';
import Stepper from '../components/Stepper';

interface Props {
  initialSettings: AppSettings;
  onDone: () => void;
}

export default function Onboarding({ initialSettings, onDone }: Props) {
  const navigate = useNavigate();
  const [install, setInstall] = useState<WowInstall | null>(null);
  const [manualPath, setManualPath] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(initialSettings.selectedAccount || '');
  const [serverUrl, setServerUrl] = useState(initialSettings.serverUrl);
  const [appUrl, setAppUrl] = useState(initialSettings.appUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const autoDetect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await bridge.detectWow();
      if (result) {
        setInstall(result);
        if (result.accounts.length === 1) {
          setSelectedAccount((prev) => prev || result.accounts[0].name);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void autoDetect();
  }, [autoDetect]);

  async function applyManualPath() {
    if (!manualPath.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await bridge.selectWowPath(manualPath.trim());
      setInstall(result);
      if (result.accounts.length === 1) setSelectedAccount(result.accounts[0].name);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!install || !selectedAccount) return;
    setBusy(true);
    setError(null);
    try {
      await bridge.setServerUrl(serverUrl);
      await bridge.setAppUrl(appUrl);
      await bridge.setSelectedAccount(selectedAccount);
      onDone();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const accountObj = install?.accounts.find((a) => a.name === selectedAccount);
  const accountReady = !!accountObj && accountObj.hasRcLootCouncil;

  return (
    <>
      <Stepper current="onboarding" />

      <h1>Configuration initiale</h1>
      <p>Localise ton installation de World of Warcraft et choisis le compte à synchroniser.</p>

      <div className="card stack">
        <div>
          <span className="label">Installation WoW</span>
          {install ? (
            <p style={{ margin: 0 }}>
              <code>{install.installPath}</code>
            </p>
          ) : (
            <p style={{ margin: 0 }} className="muted">
              Aucune installation détectée automatiquement.
            </p>
          )}
        </div>

        <div>
          <span className="label">{install ? 'Changer de chemin' : 'Chemin manuel'}</span>
          <input
            className="input"
            placeholder="/Users/ivy/wow-mock/_retail_  (ou C:\Program Files...\_retail_)"
            value={manualPath}
            onChange={(e) => setManualPath(e.currentTarget.value)}
          />
        </div>
        <div className="row">
          <button type="button" className="btn-secondary btn" onClick={autoDetect} disabled={busy}>
            Re-détecter
          </button>
          <button
            type="button"
            className="btn"
            onClick={applyManualPath}
            disabled={busy || !manualPath.trim()}
          >
            Utiliser ce chemin
          </button>
        </div>
      </div>

      {install && install.accounts.length === 0 && (
        <div className="error">
          Aucun compte WoW trouvé dans <code>WTF/Account/</code>. Lance WoW au moins une fois.
        </div>
      )}

      {install && install.accounts.length > 0 && (
        <div className="card stack">
          <div>
            <span className="label">Compte WoW</span>
            <select
              className="select"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.currentTarget.value)}
            >
              <option value="">— Sélectionner —</option>
              {install.accounts.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} {a.hasRcLootCouncil ? '✅ RCLootCouncil' : '⚠️ RCLootCouncil absent'}
                </option>
              ))}
            </select>
          </div>

          {selectedAccount && !accountReady && (
            <div className="error">
              RCLootCouncil n&apos;est pas installé pour ce compte. Installe l&apos;addon et lance
              WoW avant de continuer.
            </div>
          )}

          <div>
            <span className="label">URL API (serveur)</span>
            <input
              className="input"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.currentTarget.value)}
            />
            <p className="muted" style={{ marginTop: 4 }}>
              Ex: <code>http://localhost:5000</code> en dev.
            </p>
          </div>

          <div>
            <span className="label">URL app (navigateur)</span>
            <input
              className="input"
              value={appUrl}
              onChange={(e) => setAppUrl(e.currentTarget.value)}
            />
            <p className="muted" style={{ marginTop: 4 }}>
              C&apos;est là que le navigateur s&apos;ouvrira pour la page <code>/device</code>. Ex:{' '}
              <code>http://localhost:5173</code> en dev.
            </p>
          </div>

          {error && <div className="error">{error}</div>}

          <button
            type="button"
            className="btn"
            onClick={save}
            disabled={busy || !selectedAccount || !accountReady}
          >
            Continuer
          </button>
        </div>
      )}
    </>
  );
}
