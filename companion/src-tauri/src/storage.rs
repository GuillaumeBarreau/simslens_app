use std::path::PathBuf;

use anyhow::{Context, Result};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};

/// Persisted settings (non-secret). Lives in `%APPDATA%\SimTrackingCompanion\config.toml`
/// on Windows, similar on macOS/Linux.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_server_url")]
    pub server_url: String,
    /// URL of the web app (where `/device?code=...` lives). Distinct from the
    /// API URL because dev runs them on different ports.
    #[serde(default = "default_app_url")]
    pub app_url: String,
    pub wow_install_path: Option<String>,
    pub selected_account: Option<String>,
}

fn default_server_url() -> String {
    "http://localhost:5000".into()
}

fn default_app_url() -> String {
    "http://localhost:5173".into()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            server_url: default_server_url(),
            app_url: default_app_url(),
            wow_install_path: None,
            selected_account: None,
        }
    }
}

fn project_dirs() -> Result<ProjectDirs> {
    ProjectDirs::from("com", "SimTracking", "Companion")
        .context("could not resolve OS config directories")
}

fn config_path() -> Result<PathBuf> {
    let dirs = project_dirs()?;
    Ok(dirs.config_dir().join("config.toml"))
}

pub fn load() -> AppSettings {
    let Ok(path) = config_path() else {
        return AppSettings::default();
    };
    let Ok(raw) = std::fs::read_to_string(&path) else {
        return AppSettings::default();
    };
    toml::from_str(&raw).unwrap_or_default()
}

pub fn save(settings: &AppSettings) -> Result<()> {
    let path = config_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).context("create config dir")?;
    }
    let raw = toml::to_string_pretty(settings).context("serialize config")?;
    std::fs::write(&path, raw).context("write config")?;
    Ok(())
}

// ── Secrets (token) — stored in the OS keychain via `keyring` ───────────────

const KEYRING_SERVICE: &str = "SimTrackingCompanion";
const KEYRING_USER: &str = "api-token";

/// Stored payload — the raw token + metadata returned by the server.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredToken {
    pub access_token: String,
    pub expires_at: Option<String>,
    pub scopes: Vec<String>,
}

fn entry() -> Result<keyring::Entry> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).context("init keyring entry")
}

pub fn save_token(token: &StoredToken) -> Result<()> {
    let json = serde_json::to_string(token)?;
    entry()?.set_password(&json).context("write to keyring")?;
    Ok(())
}

pub fn load_token() -> Result<Option<StoredToken>> {
    match entry()?.get_password() {
        Ok(raw) => Ok(serde_json::from_str(&raw).ok()),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(anyhow::anyhow!(e)),
    }
}

pub fn delete_token() -> Result<()> {
    match entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(anyhow::anyhow!(e)),
    }
}
