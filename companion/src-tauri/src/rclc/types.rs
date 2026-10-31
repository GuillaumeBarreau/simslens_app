use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// A single loot entry extracted from RCLootCouncil's lootDB. Everything except
/// the primary key tuple (`player`, `date`, `time`, `item_id`) is optional.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LootEntry {
    pub player: String,
    pub date: String,
    pub time: String,
    pub item_id: i64,
    pub item_string: Option<String>,
    pub response: Option<String>,
    pub instance: Option<String>,
    pub boss: Option<String>,
    pub difficulty: Option<String>,
    pub class: Option<String>,
    pub votes: Option<i64>,
}

impl LootEntry {
    /// Stable hash used to remember entries we've already pushed. Mirrors the
    /// server-side unique key `(player, date, time, itemID)`.
    pub fn fingerprint(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.player.as_bytes());
        hasher.update(b"|");
        hasher.update(self.date.as_bytes());
        hasher.update(b"|");
        hasher.update(self.time.as_bytes());
        hasher.update(b"|");
        hasher.update(self.item_id.to_string().as_bytes());
        hex::encode(hasher.finalize())
    }
}
