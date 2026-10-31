const { prisma } = require('../../data');
const { characterKey } = require('../../shared/utils/importUtils');
const { NotFoundError } = require('../../shared/errors/AppError');

/**
 * Une instance n'est rattachée à l'import que si elle appartient au royaume
 * de l'import : sans ce contrôle, un officier rattacherait son import à
 * l'instance d'une autre guilde (SIMS-181).
 *
 * @throws {NotFoundError} instance inconnue, hors du royaume, ou royaume absent
 */
async function createImportRecord(
  filename,
  importedAt,
  rowCount,
  { extension, season, instanceId, realmId } = {},
) {
  if (instanceId) {
    const instance = realmId
      ? await prisma.instances.findFirst({
          where: { id: instanceId, realmId },
          select: { id: true },
        })
      : null;
    if (!instance) throw new NotFoundError('Instance');
  }

  const record = await prisma.imports.create({
    data: {
      filename,
      importedAt,
      rowCount,
      extension: extension ?? null,
      season: season ?? null,
      instanceId: instanceId || null,
    },
  });
  return record.id;
}

async function getImportedLootsTableInfo() {
  const result = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'imported_loots'
  `;
  return result.map((r) => r.column_name);
}

/**
 * Upsert rows into imported_loots.
 * Unique constraint: [player, date, time, itemID]
 * If itemID is null, inserts without upsert (PostgreSQL treats NULL != NULL in unique constraints).
 */
async function upsertImportedLoots(importID, rows, hasCharacterID) {
  for (const row of rows) {
    const data = {
      importID,
      player: row.player || null,
      date: row.date || null,
      time: row.time || null,
      itemID: row.itemID || null,
      response: row.response || null,
      instance: row.instance || null,
    };

    if (hasCharacterID) {
      data.characterID = row.characterID || null;
      data.owner = row.ownerID || null;
    }

    if (row.player && row.date && row.time && row.itemID) {
      await prisma.imported_loots.upsert({
        where: {
          player_date_time_itemID: {
            player: row.player,
            date: row.date,
            time: row.time,
            itemID: row.itemID,
          },
        },
        create: data,
        update: data,
      });
    } else {
      await prisma.imported_loots.create({ data });
    }
  }
}

/**
 * Resolve character IDs from "name|realm" keys (lowercased).
 * Only matches active characters belonging to the given realmId (guild members).
 * Returns a map: { "name|realm": characterId }
 */
async function resolveCharactersByKeys(lookupKeys, realmId = null) {
  if (!lookupKeys || lookupKeys.length === 0) return {};

  const pairs = lookupKeys.map((k) => {
    const sep = k.indexOf('|');
    return { name: k.slice(0, sep), realm: k.slice(sep + 1) };
  });

  const where = {
    archived: 0,
    status: { not: 'pending' },
    OR: pairs.map((p) => ({
      name: { equals: p.name, mode: 'insensitive' },
      realm: { equals: p.realm, mode: 'insensitive' },
    })),
  };

  if (realmId) {
    where.realmId = parseInt(realmId, 10);
  }

  const characters = await prisma.characters.findMany({
    where,
    select: { id: true, name: true, realm: true },
  });

  const result = {};
  for (const char of characters) {
    const key = characterKey(char.name, char.realm);
    result[key] = char.id;
  }
  return result;
}

/**
 * Get loots from imported_loots for characters of ONE realm, enriched with item
 * name and icon. Le royaume est obligatoire : des characterIds d'un autre royaume
 * sont ignorés, jamais lus.
 *
 * @param {number[]|null} characterIds  null ou vide = tous les personnages actifs du royaume
 * @param {number} realmId
 */
async function getLootsWithItemsByCharacterIds(characterIds, realmId) {
  const realm = parseInt(realmId, 10);
  if (!Number.isInteger(realm) || realm <= 0) {
    throw new Error('getLootsWithItemsByCharacterIds: realmId requis');
  }

  const where =
    characterIds && characterIds.length > 0
      ? { id: { in: characterIds.map((id) => parseInt(id, 10)) }, realmId: realm }
      : { realmId: realm, archived: 0, status: { not: 'pending' } };
  const chars = await prisma.characters.findMany({ where, select: { id: true } });
  const charIdFilter = chars.map((c) => c.id);

  if (charIdFilter.length === 0) return [];

  const loots = await prisma.imported_loots.findMany({
    where: { characterID: { in: charIdFilter } },
    orderBy: { id: 'desc' },
  });

  return _enrichWithItems(loots);
}

/**
 * @private
 */
async function _enrichWithItems(loots) {
  if (loots.length === 0) return [];

  const itemIds = [...new Set(loots.map((l) => l.itemID).filter(Boolean))];
  const items = await prisma.items.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, icon: true },
  });
  const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));

  return loots.map((l) => ({
    id: l.id,
    importID: l.importID,
    characterID: l.characterID,
    player: l.player,
    date: l.date,
    time: l.time,
    itemID: l.itemID,
    response: l.response,
    instance: l.instance,
    owner: l.owner,
    itemName: itemMap[l.itemID]?.name ?? null,
    itemIcon: itemMap[l.itemID]?.icon ?? null,
  }));
}

module.exports = {
  createImportRecord,
  getImportedLootsTableInfo,
  upsertImportedLoots,
  resolveCharactersByKeys,
  getLootsWithItemsByCharacterIds,
};
