use std::collections::HashSet;
use std::path::PathBuf;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};

/// Local sync state, persisted to disk. The `pushed_fingerprints` set is what
/// makes us idempotent in front of a server that already de-duplicates: we
/// don't bother sending entries we know are already there.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SyncState {
    /// Last successful sync (any outcome where the HTTP call returned 2xx).
    pub last_synced_at: Option<DateTime<Utc>>,
    /// Last sync attempt — set even on failure so the UI can show "tried 3s ago".
    pub last_attempt_at: Option<DateTime<Utc>>,
    /// Fingerprints of entries already accepted by the server.
    #[serde(default)]
    pub pushed_fingerprints: HashSet<String>,
    /// Lifetime counters since first sync.
    #[serde(default)]
    pub total_inserted: u64,
    #[serde(default)]
    pub total_duplicates: u64,
    /// Most recent report — useful for the UI.
    #[serde(default)]
    pub last_inserted: u64,
    #[serde(default)]
    pub last_unmatched: Vec<String>,
    #[serde(default)]
    pub last_error: Option<String>,
}

fn project_dirs() -> Result<ProjectDirs> {
    ProjectDirs::from("com", "SimTracking", "Companion")
        .context("could not resolve OS config directories")
}

fn state_path() -> Result<PathBuf> {
    Ok(project_dirs()?.data_dir().join("sync_state.json"))
}

pub fn load_state() -> SyncState {
    let Ok(path) = state_path() else {
        return SyncState::default();
    };
    let Ok(raw) = std::fs::read_to_string(&path) else {
        return SyncState::default();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

pub fn save_state(state: &SyncState) -> Result<()> {
    let path = state_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).context("create state dir")?;
    }
    let raw = serde_json::to_string_pretty(state).context("serialize state")?;
    std::fs::write(&path, raw).context("write state")?;
    Ok(())
}
