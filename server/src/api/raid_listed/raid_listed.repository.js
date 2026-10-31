const { prisma } = require('../../data');

/**
 * @param {string} [extension] - Optional extension filter
 * @param {string} [season] - Optional season filter
 */
async function listAllRaidDifficultyPairs(extension, season) {
  const where = {};
  if (extension) where.extension = extension;
  if (season) where.season = season;

  const raids = await prisma.raids.findMany({
    where,
    include: {
      raid_difficulties: {
        include: {
          difficulty_rel: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return raids;
}

/**
 * @param {string} extension - The expansion name (e.g., "The-War-Within")
 * @param {string} season - The season name (e.g., "season-03")
 * @returns {Promise<Array>} Array of bosses ordered by order
 */
async function getBossesByRaid(extension, season) {
  return prisma.bosses.findMany({
    where: {
      extension,
      season,
    },
    orderBy: { order: 'asc' },
  });
}

module.exports = {
  listAllRaidDifficultyPairs,
  getBossesByRaid,
};
