use std::path::PathBuf;

use anyhow::{anyhow, Result};
use chrono::Utc;

use crate::api::{ApiClient, SyncLootEntry, SyncLootRequest, SyncLootResponse};
use crate::rclc::{parse_file, LootEntry};
use crate::storage::{self, AppSettings, StoredToken};

use super::state::{load_state, save_state, SyncState};

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncOutcome {
    pub state: SyncState,
    pub pushed_now: u64,
    pub already_pushed: u64,
    pub error: Option<String>,
}

/// Run a single sync cycle. Stateless from the caller's POV — pulls everything
/// it needs from `storage` and `sync_state.json`.
///
/// Logic:
///   1. Parse the latest RCLootCouncil.lua → all entries.
///   2. Filter out fingerprints we already pushed (server is the authority,
///      this is just a bandwidth optimisation).
///   3. POST the delta.
///   4. On 2xx, record the new fingerprints + counters and persist state.
pub async fn run_sync(settings: &AppSettings, token: &StoredToken) -> Result<SyncOutcome> {
    let mut state = load_state();
    state.last_attempt_at = Some(Utc::now());

    let result = run_sync_inner(settings, token, &mut state).await;

    match result {
        Ok(outcome) => {
            state.last_error = None;
            save_state(&state).ok();
            Ok(outcome)
        }
        Err(err) => {
            let msg = err.to_string();
            state.last_error = Some(msg.clone());
            save_state(&state).ok();
            Ok(SyncOutcome {
                state,
                pushed_now: 0,
                already_pushed: 0,
                error: Some(msg),
            })
        }
    }
}

async fn run_sync_inner(
    settings: &AppSettings,
    token: &StoredToken,
    state: &mut SyncState,
) -> Result<SyncOutcome> {
    let rclc_path = resolve_rclc_path(settings)?;
    let realm_id = extract_realm_id(&token.scopes)?;

    let entries = parse_file(&rclc_path)?;
    log::info!("[sync] parsed {} entries from {}", entries.len(), rclc_path.display());

    let mut new_entries: Vec<LootEntry> = Vec::new();
    let mut already = 0u64;
    for e in entries {
        if state.pushed_fingerprints.contains(&e.fingerprint()) {
            already += 1;
        } else {
            new_entries.push(e);
        }
    }

    if new_entries.is_empty() {
        return Ok(SyncOutcome {
            state: state.clone(),
            pushed_now: 0,
            already_pushed: already,
            error: None,
        });
    }

    let client = ApiClient::new(settings.server_url.clone())?;
    let response = push_entries(&client, &token.access_token, realm_id, &new_entries).await?;

    apply_server_response(state, &new_entries, &response);
    state.last_synced_at = Some(Utc::now());

    Ok(SyncOutcome {
        state: state.clone(),
        pushed_now: response.inserted,
        already_pushed: already + response.duplicates,
        error: None,
    })
}

fn resolve_rclc_path(settings: &AppSettings) -> Result<PathBuf> {
    let install = settings
        .wow_install_path
        .as_deref()
        .ok_or_else(|| anyhow!("wow_install_path not set"))?;
    let account = settings
        .selected_account
        .as_deref()
        .ok_or_else(|| anyhow!("selected_account not set"))?;
    Ok(PathBuf::from(install)
        .join("WTF")
        .join("Account")
        .join(account)
        .join("SavedVariables")
        .join("RCLootCouncil.lua"))
}

fn extract_realm_id(scopes: &[String]) -> Result<i64> {
    for s in scopes {
        if let Some(rest) = s.strip_prefix("realm:") {
            if let Ok(id) = rest.parse::<i64>() {
                return Ok(id);
            }
        }
    }
    Err(anyhow!("token has no realm:<id> scope"))
}

async fn push_entries(
    client: &ApiClient,
    bearer: &str,
    realm_id: i64,
    entries: &[LootEntry],
) -> Result<SyncLootResponse> {
    let payload_entries: Vec<SyncLootEntry> = entries
        .iter()
        .map(|e| SyncLootEntry {
            player: &e.player,
            date: &e.date,
            time: &e.time,
            item_id: e.item_id,
            response: e.response.as_deref(),
            instance: e.instance.as_deref(),
            boss: e.boss.as_deref(),
            difficulty: e.difficulty.as_deref(),
            class: e.class.as_deref(),
        })
        .collect();

    let request = SyncLootRequest {
        realm_id,
        source: "rclootcouncil",
        entries: &payload_entries,
    };

    client.post_loot(bearer, &request).await
}

/// Update counters + fingerprints after the server acknowledges a push.
/// We optimistically record fingerprints for every entry we just sent: the
/// server returned 2xx, so either it accepted them or they were duplicates —
/// both mean "no need to send again".
fn apply_server_response(
    state: &mut SyncState,
    sent: &[LootEntry],
    response: &SyncLootResponse,
) {
    for e in sent {
        state.pushed_fingerprints.insert(e.fingerprint());
    }
    state.total_inserted += response.inserted;
    state.total_duplicates += response.duplicates;
    state.last_inserted = response.inserted;
    state.last_unmatched = response.unmatched.clone();
}

/// Read the token from the keyring (helper for callers).
pub fn current_token() -> Result<Option<StoredToken>> {
    storage::load_token()
}
