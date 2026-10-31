use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::api::{ApiClient, DeviceCodeResponse, PollOutcome};
use crate::storage::{self, AppSettings, StoredToken};
use crate::sync::{self, SyncOutcome, SyncState};
use crate::wow;

/// Shared in-memory state. Settings are loaded once at boot and persisted on
/// every change.
pub struct AppState {
    pub settings: Mutex<AppSettings>,
}

impl AppState {
    pub fn new(settings: AppSettings) -> Self {
        Self {
            settings: Mutex::new(settings),
        }
    }

    fn snapshot(&self) -> AppSettings {
        self.settings.lock().unwrap().clone()
    }

    fn update<F: FnOnce(&mut AppSettings)>(&self, f: F) -> Result<AppSettings, String> {
        let mut guard = self.settings.lock().unwrap();
        f(&mut guard);
        storage::save(&guard).map_err(|e| e.to_string())?;
        Ok(guard.clone())
    }
}

// ── Type aliases mirrored to the frontend (see src/api/bridge.ts) ───────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WowInstall {
    install_path: String,
    accounts: Vec<wow::WowAccount>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenStatus {
    has_token: bool,
    expires_at: Option<String>,
    scopes: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum PollResult {
    Pending,
    Granted { expires_at: Option<String> },
    Expired,
}

// ── WoW detection commands ──────────────────────────────────────────────────

#[tauri::command]
pub async fn detect_wow(state: State<'_, AppState>) -> Result<Option<WowInstall>, String> {
    let Some(install_path) = wow::find_install() else {
        return Ok(None);
    };
    let accounts = wow::enumerate_accounts(&install_path);
    let info = WowInstall {
        install_path: install_path.to_string_lossy().to_string(),
        accounts,
    };
    state
        .update(|s| s.wow_install_path = Some(info.install_path.clone()))
        .ok();
    Ok(Some(info))
}

#[tauri::command]
pub async fn select_wow_path(path: String, state: State<'_, AppState>) -> Result<WowInstall, String> {
    let p = PathBuf::from(&path);
    if !wow::path::validate(&p) {
        return Err(format!(
            "Le dossier {} ne ressemble pas à une installation WoW (WTF/ manquant)",
            p.display()
        ));
    }
    let accounts = wow::enumerate_accounts(&p);
    let info = WowInstall {
        install_path: p.to_string_lossy().to_string(),
        accounts,
    };
    state.update(|s| s.wow_install_path = Some(info.install_path.clone()))?;
    Ok(info)
}

// ── Settings commands ───────────────────────────────────────────────────────

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppSettings {
    state.snapshot()
}

#[tauri::command]
pub fn set_server_url(url: String, state: State<'_, AppState>) -> Result<AppSettings, String> {
    state.update(|s| s.server_url = url)
}

#[tauri::command]
pub fn set_app_url(url: String, state: State<'_, AppState>) -> Result<AppSettings, String> {
    state.update(|s| s.app_url = url)
}

#[tauri::command]
pub fn set_selected_account(
    account: String,
    state: State<'_, AppState>,
) -> Result<AppSettings, String> {
    state.update(|s| s.selected_account = Some(account))
}

// ── Device flow + token commands ────────────────────────────────────────────

fn client(state: &AppState) -> Result<ApiClient, String> {
    let url = state.snapshot().server_url;
    ApiClient::new(url).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn request_device_code(
    device_name: String,
    state: State<'_, AppState>,
) -> Result<DeviceCodeResponse, String> {
    let api = client(&state)?;
    api.request_device_code(&device_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn poll_device_token(
    device_code: String,
    state: State<'_, AppState>,
) -> Result<PollResult, String> {
    let api = client(&state)?;
    match api.exchange_device_code(&device_code).await {
        Ok(PollOutcome::Pending) => Ok(PollResult::Pending),
        Ok(PollOutcome::Expired) => Ok(PollResult::Expired),
        Ok(PollOutcome::Granted(t)) => {
            let stored = StoredToken {
                access_token: t.access_token,
                expires_at: t.expires_at.clone(),
                scopes: t.scopes,
            };
            storage::save_token(&stored).map_err(|e| e.to_string())?;
            Ok(PollResult::Granted {
                expires_at: t.expires_at,
            })
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn get_token_status() -> Result<TokenStatus, String> {
    let token = storage::load_token().map_err(|e| e.to_string())?;
    Ok(match token {
        None => TokenStatus {
            has_token: false,
            expires_at: None,
            scopes: vec![],
        },
        Some(t) => TokenStatus {
            has_token: true,
            expires_at: t.expires_at,
            scopes: t.scopes,
        },
    })
}

#[tauri::command]
pub fn revoke_local_token() -> Result<(), String> {
    storage::delete_token().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_external(url: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

// ── Sync commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_sync_state() -> SyncState {
    sync::load_state()
}

#[tauri::command]
pub async fn sync_now(state: State<'_, AppState>, app: AppHandle) -> Result<SyncOutcome, String> {
    let settings = state.snapshot();
    let token = storage::load_token()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "no_token".to_string())?;

    let outcome = sync::run_sync(&settings, &token)
        .await
        .map_err(|e| e.to_string())?;

    use tauri::Emitter;
    let _ = app.emit("sync:status", &outcome);

    Ok(outcome)
}
