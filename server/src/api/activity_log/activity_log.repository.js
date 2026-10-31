const { prisma } = require('../../data');

/**
 * @param {Object} params
 * @param {number} params.realmId
 * @param {string} params.userId
 * @param {string} params.characterName
 * @param {string} params.actionType
 * @param {Object|null} params.metadata
 */
async function createLog({ realmId, userId, characterName, actionType, metadata = null }) {
  const last = await prisma.activity_logs.findFirst({
    where: { realmId, actionType, characterName },
    orderBy: { createdAt: 'desc' },
  });

  if (last) {
    const lastMeta = last.metadata ?? {};
    const newMeta = metadata ?? {};
    const isDuplicate = Object.keys(newMeta).every(
      (key) =>
        key === 'oldItemId' || JSON.stringify(lastMeta[key]) === JSON.stringify(newMeta[key]),
    );
    if (isDuplicate) return null;
  }

  return prisma.activity_logs.create({
    data: {
      realmId,
      userId: String(userId),
      characterName,
      actionType,
      metadata,
    },
  });
}

/**
 * @param {number} realmId
 * @param {number} [limit=100]
 * @param {string|null} [characterName=null]
 * @returns {Promise<Array>}
 */
async function getLogsByRealm(realmId, limit = 100, characterName = null, sinceDate = null) {
  const where = {
    realmId,
    ...(characterName && { characterName }),
    ...(sinceDate && { createdAt: { gte: sinceDate } }),
  };

  const logs = await prisma.activity_logs.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const wishlistLogs = logs.filter((l) => l.actionType === 'WISHLIST_UPDATE' && l.metadata);

  const itemIds = [
    ...new Set(
      wishlistLogs.flatMap((l) => [l.metadata.oldItemId, l.metadata.newItemId].filter(Boolean)),
    ),
  ];

  if (itemIds.length === 0) return logs;

  const items = await prisma.items.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, quality: true },
  });

  const itemMap = new Map(items.map((i) => [i.id, { name: i.name, quality: i.quality }]));

  const enrichMetadata = (meta) => ({
    ...meta,
    ...(meta.oldItemId && {
      oldItemName: itemMap.get(meta.oldItemId)?.name ?? 'Unknown Item',
      oldItemQuality: itemMap.get(meta.oldItemId)?.quality ?? null,
    }),
    ...(meta.newItemId && {
      newItemName: itemMap.get(meta.newItemId)?.name ?? 'Unknown Item',
      newItemQuality: itemMap.get(meta.newItemId)?.quality ?? null,
    }),
  });

  return logs.map((log) =>
    log.actionType === 'WISHLIST_UPDATE' && log.metadata
      ? { ...log, metadata: enrichMetadata(log.metadata) }
      : log,
  );
}

module.exports = { createLog, getLogsByRealm };
