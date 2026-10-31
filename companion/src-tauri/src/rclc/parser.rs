use std::path::Path;

use anyhow::{anyhow, Context, Result};
use mlua::{Lua, LuaOptions, StdLib, Table, Value};

use super::types::LootEntry;

/// Parse a `RCLootCouncil.lua` SavedVariables file and return every loot entry
/// found in `RCLootCouncilDB.factionrealm[*].lootDB[*]`.
///
/// We execute the file inside a sandboxed Lua interpreter (no stdlib, no I/O):
/// SavedVariables files are pure data — just table assignments — so executing
/// them safely is the simplest way to honour the format's full quirkiness
/// (string keys, nested tables, escaped chars, …).
pub fn parse_file(path: &Path) -> Result<Vec<LootEntry>> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("reading {}", path.display()))?;
    parse_str(&content)
}

pub fn parse_str(content: &str) -> Result<Vec<LootEntry>> {
    let lua = Lua::new_with(StdLib::NONE, LuaOptions::default())
        .map_err(|e| anyhow!("create lua sandbox: {e}"))?;

    // Untrusted input — but we explicitly stripped stdlib, so there is no I/O,
    // no os.*, no debug.*, no `require`. Worst case the file errors out.
    lua.load(content)
        .exec()
        .map_err(|e| anyhow!("execute RCLootCouncil.lua: {e}"))?;

    let globals = lua.globals();
    let db: Table = globals
        .get("RCLootCouncilDB")
        .map_err(|e| anyhow!("RCLootCouncilDB global missing: {e}"))?;

    let factionrealm: Table = match db.get::<Value>("factionrealm") {
        Ok(Value::Table(t)) => t,
        _ => return Ok(Vec::new()),
    };

    let mut entries = Vec::new();
    for fr_pair in factionrealm.pairs::<Value, Table>() {
        let (_key, fr_table) = match fr_pair {
            Ok(v) => v,
            Err(_) => continue,
        };
        let loot_db: Table = match fr_table.get::<Value>("lootDB") {
            Ok(Value::Table(t)) => t,
            _ => continue,
        };

        for player_pair in loot_db.pairs::<String, Table>() {
            let (player, player_entries) = match player_pair {
                Ok(v) => v,
                Err(_) => continue,
            };

            for entry_value in player_entries.sequence_values::<Table>() {
                let entry = match entry_value {
                    Ok(v) => v,
                    Err(_) => continue,
                };
                if let Some(parsed) = parse_entry(&player, &entry) {
                    entries.push(parsed);
                }
            }
        }
    }
    Ok(entries)
}

fn parse_entry(player: &str, entry: &Table) -> Option<LootEntry> {
    let date: String = entry.get("date").ok()?;
    let time: String = entry.get("time").ok()?;

    // `itemID` is the modern, reliable field. Older RCLC versions only had
    // the `id` string ("item:219901:..."): we parse the second component.
    let item_id = entry
        .get::<i64>("itemID")
        .ok()
        .filter(|n| *n > 0)
        .or_else(|| {
            entry
                .get::<String>("id")
                .ok()
                .and_then(|s| extract_item_id_from_string(&s))
        })?;

    Some(LootEntry {
        player: player.to_string(),
        date,
        time,
        item_id,
        item_string: entry.get("id").ok(),
        response: entry.get("response").ok(),
        instance: entry.get("instance").ok(),
        boss: entry.get("boss").ok(),
        difficulty: entry.get("difficulty").ok(),
        class: entry.get("class").ok(),
        votes: entry.get("votes").ok(),
    })
}

fn extract_item_id_from_string(s: &str) -> Option<i64> {
    // RCLC stores e.g. "item:219901::::::::80:267::33:6:..."
    s.strip_prefix("item:")?.split(':').next()?.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = r#"
RCLootCouncilDB = {
  ["factionrealm"] = {
    ["Alliance - Hyjal"] = {
      ["lootDB"] = {
        ["Shadsbigkick-Hyjal"] = {
          {
            ["date"] = "12/05/26",
            ["time"] = "20:34:12",
            ["id"] = "item:219901::::::::80:267::33:6:11303:9633:8902:1521:10255:8767:::::",
            ["itemID"] = 219901,
            ["response"] = "BiS",
            ["instance"] = "Manaforge Omega-Mythic",
            ["boss"] = "Plexus Sentinel",
            ["class"] = "WARLOCK",
            ["votes"] = 3,
          },
        },
      },
    },
  },
}
"#;

    #[test]
    fn parses_minimal_sample() {
        let entries = parse_str(SAMPLE).unwrap();
        assert_eq!(entries.len(), 1);
        let e = &entries[0];
        assert_eq!(e.player, "Shadsbigkick-Hyjal");
        assert_eq!(e.item_id, 219901);
        assert_eq!(e.response.as_deref(), Some("BiS"));
    }

    #[test]
    fn fingerprint_is_stable() {
        let entries = parse_str(SAMPLE).unwrap();
        let a = entries[0].fingerprint();
        let b = entries[0].fingerprint();
        assert_eq!(a, b);
        assert_eq!(a.len(), 64);
    }

    #[test]
    fn extract_item_id_works() {
        assert_eq!(extract_item_id_from_string("item:219901::"), Some(219901));
        assert_eq!(extract_item_id_from_string("garbage"), None);
    }
}
