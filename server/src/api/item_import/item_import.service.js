const importRepository = require('./item_import.repository');
const { characterKey, getVal, parseNameRealm } = require('../../shared/utils/importUtils');
const { normalizeCsvRows } = require('./item_import.csv');
const { prisma } = require('../../data');
const { logSimReportUpload } = require('../activity_log/activity_log.utils');

/**
 * @param {Object} payload - The import payload
 * @param {string} [payload.filename] - The filename of the import (400 sans lui)
 * @param {Array<Object>} payload.rows - The raw rows from CSV
 * @param {number} payload.realmId - Royaume vérifié par checkPermission
 * @param {string} [payload.extension]
 * @param {string} [payload.season]
 * @param {number} [payload.instanceId] - Instance du royaume (404 sinon)
 * @param {{ userId: string | null, realmId: number } | null} [payload.actorInfo]
 * @returns {Promise<Object>} Result object with importID
 * @throws {Error} If payload is invalid or database operations fail
 */
async function processImport({
  filename,
  rows,
  realmId,
  extension,
  season,
  instanceId,
  actorInfo = null,
}) {
  if (!filename || !Array.isArray(rows)) {
    const error = new Error('Invalid payload. Expected { filename, rows: [] }');
    error.status = 400;
    throw error;
  }

  if (rows.length === 0) {
    const error = new Error('No rows provided for import');
    error.status = 400;
    throw error;
  }

  console.log(`Processing import: ${filename} with ${rows.length} rows`);

  const importedAt = Math.floor(Date.now() / 1000);
  const rowCount = rows.length;

  rows = normalizeCsvRows(rows);

  // L'instance éventuelle doit appartenir au royaume vérifié (sinon 404).
  const importID = await importRepository.createImportRecord(filename, importedAt, rowCount, {
    extension,
    season,
    instanceId,
    realmId,
  });
  console.log(`Created import record with ID: ${importID}`);

  const existingCols = await importRepository.getImportedLootsTableInfo();
  const hasCharacterID = existingCols.includes('characterID');

  const lookupCharByKey = await _resolveCharacterKeys(rows, importRepository, realmId);

  const preparedRows = _prepareRows(rows, lookupCharByKey, hasCharacterID);

  await importRepository.upsertImportedLoots(importID, preparedRows, hasCharacterID);
  console.log(`Successfully imported ${preparedRows.length} rows`);

  const skippedPlayers = _collectSkippedPlayers(rows, lookupCharByKey);

  await _fillMissingGear(rows, lookupCharByKey);

  if (actorInfo?.userId && actorInfo?.realmId) {
    logSimReportUpload({
      realmId: actorInfo.realmId,
      userId: actorInfo.userId,
      filename,
      rowCount,
      importID,
    });
  }

  return { success: true, importID, importedCount: preparedRows.length, skippedPlayers };
}

/**
 * @private
 * @param {Array<Object>} rows - The data rows
 * @param {Object} repo - The import repository
 * @returns {Promise<Object>} Map of character keys to IDs
 */
async function _resolveCharacterKeys(rows, repo, realmId = null) {
  const playerKeys = new Map();

  for (const r of rows) {
    const playerRaw = getVal(r, ['player', 'name']);
    const ownerRaw = getVal(r, ['owner']);

    if (playerRaw) {
      const { name, realm } = parseNameRealm(playerRaw);
      const key = characterKey(name, realm);
      if (!playerKeys.has(key)) playerKeys.set(key, { name, realm });
    }

    if (ownerRaw) {
      const { name, realm } = parseNameRealm(ownerRaw);
      const key = characterKey(name, realm);
      if (!playerKeys.has(key)) playerKeys.set(key, { name, realm });
    }
  }

  const lookupKeys = Array.from(playerKeys.keys());
  console.log(`Resolving ${lookupKeys.length} unique character keys`);

  return repo.resolveCharactersByKeys(lookupKeys, realmId);
}

/**
 * @private
 * @param {Array<Object>} rows - The data rows
 * @param {Object} lookupCharByKey - Character lookup map
 * @param {boolean} hasCharacterID - Whether characterID column exists
 * @returns {Array<Object>} Prepared rows for insertion
 */
function _prepareRows(rows, lookupCharByKey, hasCharacterID) {
  const preparedRows = [];

  for (const r of rows) {
    const player = getVal(r, ['player', 'name']);
    const date = getVal(r, ['date']);
    const time = getVal(r, ['time']);
    const itemIDraw = getVal(r, ['itemid', 'itemID', 'item_id']);
    const itemIDnum =
      itemIDraw != null && itemIDraw !== ''
        ? Number(String(itemIDraw).replace(/[^0-9]/g, ''))
        : null;

    const response = getVal(r, ['response']);
    const instance = getVal(r, ['instance']);
    const ownerRaw = getVal(r, ['owner']);

    if (!player) continue;
    const { name, realm } = parseNameRealm(player);
    const key = characterKey(name, realm);
    const characterID = lookupCharByKey[key] || null;

    if (!characterID) {
      console.log(`Skipping row — player not in guild: ${player}`);
      continue;
    }

    let ownerID = null;
    if (hasCharacterID && ownerRaw) {
      const { name: ownerName, realm: ownerRealm } = parseNameRealm(ownerRaw);
      const ownerKey = characterKey(ownerName, ownerRealm);
      ownerID = lookupCharByKey[ownerKey] || null;
    }

    preparedRows.push({
      player,
      date,
      time,
      itemID: itemIDnum,
      response,
      instance,
      ownerRaw,
      characterID,
      ownerID,
    });
  }

  return preparedRows;
}

/**
 * Patch latest gear snapshot with missing items (e.g. second trinket)
 */
async function _fillMissingGear(rows, lookupCharByKey) {
  console.log('Patching missing gear in latest snapshots...');
  let patchedCount = 0;

  const itemCache = new Map();
  async function getItemInfo(id) {
    if (!id) return null;
    if (itemCache.has(id)) return itemCache.get(id);
    const item = await prisma.items.findUnique({ where: { id } });
    if (item) itemCache.set(id, item);
    return item;
  }

  const charUpdates = new Map();

  for (const r of rows) {
    const playerRaw = getVal(r, ['player', 'name']);
    if (!playerRaw) continue;
    const { name, realm } = parseNameRealm(playerRaw);
    const key = characterKey(name, realm);
    const characterID = lookupCharByKey[key];
    if (!characterID) continue;

    const gear1Raw = getVal(r, ['gear1', 'item1']);
    const gear2Raw = getVal(r, ['gear2', 'item2']);
    if (!gear1Raw && !gear2Raw) continue;

    const itemIDRaw = getVal(r, ['itemid', 'itemID', 'item_id']);
    const droppedItemId =
      itemIDRaw != null ? Number(String(itemIDRaw).replace(/[^0-9]/g, '')) : null;
    if (!droppedItemId) continue;

    if (!charUpdates.has(characterID)) charUpdates.set(characterID, []);
    charUpdates.get(characterID).push({ droppedItemId, gear1Raw, gear2Raw });
  }

  for (const [charId, entries] of charUpdates) {
    try {
      const latestSnapshot = await prisma.character_gear_snapshots.findFirst({
        where: { characterId: charId },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });

      if (!latestSnapshot) continue;

      const existingSlots = new Set(latestSnapshot.items.map((i) => i.slot));
      const itemsToAdd = new Map();

      for (const entry of entries) {
        const droppedItem = await getItemInfo(entry.droppedItemId);
        if (!droppedItem || !droppedItem.inventoryType) continue;

        const slots = {};
        if (droppedItem.inventoryType === 11) {
          if (entry.gear1Raw) slots['finger1'] = entry.gear1Raw;
          if (entry.gear2Raw) slots['finger2'] = entry.gear2Raw;
        } else if (droppedItem.inventoryType === 12 || droppedItem.inventoryType === 13) {
          if (entry.gear1Raw) slots['trinket1'] = entry.gear1Raw;
          if (entry.gear2Raw) slots['trinket2'] = entry.gear2Raw;
        }

        for (const [slot, val] of Object.entries(slots)) {
          if (existingSlots.has(slot) || itemsToAdd.has(slot)) continue;

          const match = String(val).match(/item:(\d+)/) || String(val).match(/^(\d+)$/);
          const itemId = match ? Number(match[1]) : null;
          if (itemId) {
            const itemInfo = await getItemInfo(itemId);
            if (itemInfo) {
              itemsToAdd.set(slot, { itemId, ilevel: itemInfo.itemLevel || 0 });
            }
          }
        }
      }

      if (itemsToAdd.size > 0) {
        for (const [slot, data] of itemsToAdd) {
          await prisma.gear_snapshot_items.create({
            data: {
              snapshotId: latestSnapshot.id,
              slot: slot,
              itemId: data.itemId,
              ilevel: data.ilevel,
              encodedItem: `item:${data.itemId}`,
            },
          });
        }
        patchedCount++;
      }
    } catch (err) {
      console.error(`Failed to patch snapshot for char ${charId}`, err);
    }
  }

  console.log(`Patched gear snapshots for ${patchedCount} characters.`);
}

/**
 * Collect unique player names that were not resolved (not in guild).
 * @private
 */
function _collectSkippedPlayers(rows, lookupCharByKey) {
  const skipped = new Set();
  for (const r of rows) {
    const playerRaw = getVal(r, ['player', 'name']);
    if (!playerRaw) continue;
    const { name, realm } = parseNameRealm(playerRaw);
    const key = characterKey(name, realm);
    if (!lookupCharByKey[key]) {
      skipped.add(playerRaw);
    }
  }
  return Array.from(skipped);
}

/**
 * List imported loot for several characters of ONE realm, grouped by character.
 *
 * @param {{ characterIds: number[]|null, realmId: number }} filters
 *   characterIds à null signifie « tous les personnages du royaume ». Les
 *   personnages d'un autre royaume sont toujours ignorés.
 * @returns {Promise<{ rows: Array, grouped: Record<string, Array> }>}
 */
async function getLootsGroupedByCharacter({ characterIds = null, realmId } = {}) {
  const rows = await importRepository.getLootsWithItemsByCharacterIds(characterIds, realmId);

  const grouped = {};
  for (const row of rows || []) {
    const key = row.characterID || 0;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  return { rows, grouped };
}

module.exports = {
  processImport,
  getLootsGroupedByCharacter,
  _collectSkippedPlayers,
};
