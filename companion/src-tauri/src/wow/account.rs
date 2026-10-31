use std::path::{Path, PathBuf};

use serde::Serialize;

/// A WoW account folder under `WTF/Account/<NAME>/SavedVariables/`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WowAccount {
    pub name: String,
    pub saved_variables_path: String,
    pub has_rc_loot_council: bool,
}

const RCLC_FILE: &str = "RCLootCouncil.lua";

/// Enumerate every WoW account that has a `SavedVariables` folder.
///
/// `wow_retail_path` is the `_retail_` directory; we look at `WTF/Account/<NAME>`.
pub fn enumerate_accounts(wow_retail_path: &Path) -> Vec<WowAccount> {
    let accounts_root = wow_retail_path.join("WTF").join("Account");
    let Ok(entries) = std::fs::read_dir(&accounts_root) else {
        return Vec::new();
    };

    let mut out = Vec::new();
    for entry in entries.flatten() {
        if !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        // SavedVariables only exists at the account level (not per-realm).
        let sv_dir: PathBuf = entry.path().join("SavedVariables");
        if !sv_dir.is_dir() {
            continue;
        }
        let has_rclc = sv_dir.join(RCLC_FILE).is_file();
        out.push(WowAccount {
            name,
            saved_variables_path: sv_dir.to_string_lossy().to_string(),
            has_rc_loot_council: has_rclc,
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}
