use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use notify_debouncer_mini::{new_debouncer, DebouncedEvent, Debouncer};
use notify::{RecommendedWatcher, RecursiveMode};
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

use crate::storage;

use super::engine::run_sync;
use super::state::load_state;

/// Wraps an active file watcher so it can be reinstalled when the user changes
/// the WoW path or account.
pub struct WatcherHandle {
    _debouncer: Debouncer<RecommendedWatcher>,
}

/// Start watching `RCLootCouncil.lua`. Whenever the file is rewritten (logout,
/// /reload, addon autosave), trigger a sync after a 500 ms debounce.
///
/// The watcher needs the AppHandle to emit `sync:status` events back to the
/// React UI after each cycle.
pub fn install(app: AppHandle, rclc_path: PathBuf) -> Result<WatcherHandle> {
    log::info!("[watcher] installing on {}", rclc_path.display());

    // notify only watches existing paths — make sure the file is there.
    if !rclc_path.exists() {
        log::warn!(
            "[watcher] {} does not exist yet — watcher will fail to start. Ask the user to /reload WoW once.",
            rclc_path.display()
        );
    }

    // Watch the parent dir, then filter by filename. notify on a single file
    // can miss events on some platforms when editors rename-and-replace.
    let watch_dir: &Path = rclc_path
        .parent()
        .ok_or_else(|| anyhow::anyhow!("rclc path has no parent"))?;
    let filename = rclc_path.file_name().map(|s| s.to_owned());
    let in_flight: Arc<Mutex<()>> = Arc::new(Mutex::new(()));
    let handle = app.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        move |res: Result<Vec<DebouncedEvent>, notify::Error>| {
            let Ok(events) = res else {
                return;
            };
            // Filter: only react to events touching RCLootCouncil.lua.
            let touched = events.iter().any(|ev| {
                ev.path
                    .file_name()
                    .map(|n| Some(n.to_owned()) == filename)
                    .unwrap_or(false)
            });
            if !touched {
                return;
            }

            log::info!("[watcher] RCLootCouncil.lua changed → scheduling sync");
            let lock = in_flight.clone();
            let app = handle.clone();
            tauri::async_runtime::spawn(async move {
                // Coalesce concurrent triggers: if a sync is already running,
                // skip this one — the in-progress sync already sees the latest file.
                let guard = match lock.try_lock() {
                    Ok(g) => g,
                    Err(_) => {
                        log::debug!("[watcher] sync already in flight, skipping");
                        return;
                    }
                };
                trigger_sync(&app).await;
                drop(guard);
            });
        },
    )?;

    debouncer
        .watcher()
        .watch(watch_dir, RecursiveMode::NonRecursive)?;

    Ok(WatcherHandle { _debouncer: debouncer })
}

/// Common entry point used both by the watcher and the `sync_now` command.
pub async fn trigger_sync(app: &AppHandle) {
    let settings = storage::load();
    let token = match storage::load_token() {
        Ok(Some(t)) => t,
        _ => {
            log::warn!("[sync] no token in keychain, aborting");
            return;
        }
    };

    match run_sync(&settings, &token).await {
        Ok(outcome) => {
            log::info!(
                "[sync] done — pushed {} (already had {})",
                outcome.pushed_now,
                outcome.already_pushed
            );
            let _ = app.emit("sync:status", &outcome);
        }
        Err(err) => {
            log::error!("[sync] fatal: {err}");
            let _ = app.emit(
                "sync:status",
                &serde_json::json!({
                    "state": load_state(),
                    "pushedNow": 0,
                    "alreadyPushed": 0,
                    "error": err.to_string(),
                }),
            );
        }
    }
}
