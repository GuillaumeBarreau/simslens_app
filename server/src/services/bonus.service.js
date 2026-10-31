/**
 * Returns the highest priority upgrade (Myth > Hero > Champion)
 *
 * @param {Object} prisma - Prisma client instance
 * @param {number[]} bonusIds - Array of bonus IDs to check
 * @returns {Promise<Object|null>} Upgrade information or null
 */
async function getUpgradeFromBonusIds(prisma, bonusIds) {
  if (!bonusIds || bonusIds.length === 0) {
    return null;
  }

  const bonuses = await prisma.item_bonus_data.findMany({
    where: {
      id: { in: bonusIds },
      upgradeGroup: { not: null },
    },
    orderBy: [{ upgradePriority: 'desc' }, { upgradeLevel: 'desc' }],
    take: 1,
  });

  if (bonuses.length === 0) {
    return null;
  }

  const bonus = bonuses[0];

  return {
    level: bonus.upgradeLevel,
    max: bonus.upgradeMax,
    name: bonus.upgradeName,
    fullName: bonus.upgradeFullName,
    bonusId: bonus.id,
    itemLevel: bonus.upgradeItemLevel,
    seasonId: bonus.upgradeSeasonId,
    priority: bonus.upgradePriority,
  };
}

/**
 * @param {Object} prisma - Prisma client instance
 * @param {number[]} bonusIds - Array of bonus IDs
 * @returns {Promise<Object[]>} Array of bonus data
 */
async function getBonusData(prisma, bonusIds) {
  if (!bonusIds || bonusIds.length === 0) {
    return [];
  }

  return await prisma.item_bonus_data.findMany({
    where: { id: { in: bonusIds } },
  });
}

/**
 * @param {Object} prisma - Prisma client instance
 * @param {number} seasonId - Season ID
 * @returns {Promise<Object[]>} Array of upgrade bonuses
 */
async function getUpgradesBySeasonId(prisma, seasonId) {
  return await prisma.item_bonus_data.findMany({
    where: {
      upgradeSeasonId: seasonId,
      upgradeGroup: { not: null },
    },
    orderBy: [{ upgradeName: 'asc' }, { upgradeLevel: 'asc' }],
  });
}

/**
 * @param {Object} prisma - Prisma client instance
 * @param {number} bonusId - Bonus ID
 * @returns {Promise<Object|null>} Bonus data or null
 */
async function getBonusById(prisma, bonusId) {
  return await prisma.item_bonus_data.findUnique({
    where: { id: bonusId },
  });
}

module.exports = {
  getUpgradeFromBonusIds,
  getBonusData,
  getUpgradesBySeasonId,
  getBonusById,
};
