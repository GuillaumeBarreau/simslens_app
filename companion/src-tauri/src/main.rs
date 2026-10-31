// Hide the Windows console window for release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod commands;
mod rclc;
mod storage;
mod sync;
mod wow;

use std::path::PathBuf;

use commands::AppState;

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let settings = storage::load();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new(settings))
        .invoke_handler(tauri::generate_handler![
            commands::detect_wow,
            commands::select_wow_path,
            commands::get_settings,
            commands::set_server_url,
            commands::set_app_url,
            commands::set_selected_account,
            commands::request_device_code,
            commands::poll_device_token,
            commands::get_token_status,
            commands::revoke_local_token,
            commands::open_external,
            commands::get_sync_state,
            commands::sync_now,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            // Install the RCLootCouncil watcher if the user has finished
            // onboarding and has a token. Otherwise nothing to do yet — the
            // user-triggered `sync_now` will work once setup is complete.
            tauri::async_runtime::spawn(async move {
                if let Err(err) = boot_watcher_if_ready(&handle).await {
                    log::warn!("[boot] watcher not started: {err}");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn boot_watcher_if_ready(app: &tauri::AppHandle) -> anyhow::Result<()> {
    let settings = storage::load();
    let token = storage::load_token()?;
    if token.is_none() {
        return Err(anyhow::anyhow!("no token yet"));
    }
    let install = settings
        .wow_install_path
        .as_deref()
        .ok_or_else(|| anyhow::anyhow!("wow_install_path not set"))?;
    let account = settings
        .selected_account
        .as_deref()
        .ok_or_else(|| anyhow::anyhow!("selected_account not set"))?;
    let rclc_path = PathBuf::from(install)
        .join("WTF")
        .join("Account")
        .join(account)
        .join("SavedVariables")
        .join("RCLootCouncil.lua");

    let handle = sync::watcher::install(app.clone(), rclc_path)?;
    // Leak the handle: the watcher must live for the whole process life.
    // (We don't expose start/stop yet; a reconfigure restarts the app.)
    std::mem::forget(handle);
    Ok(())
}
