const { prisma } = require('../../data');

/**
 * @param {string} [extension] - Optional extension filter
 * @param {string} [season] - Optional season filter
 */
async function listBosses(extension, season) {
  const where = {};

  if (extension) {
    where.extension = extension;
  }

  if (season) {
    where.season = season;
  }

  return await prisma.bosses.findMany({
    where,
    include: {
      loots: {
        select: {
          itemId: true,
          item: {
            select: {
              id: true,
              name: true,
              icon: true,
              quality: true,
            },
          },
        },
      },
    },
    orderBy: [{ extension: 'asc' }, { season: 'asc' }, { order: 'asc' }],
  });
}

async function getBossById(id) {
  return await prisma.bosses.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      loots: {
        include: {
          item: true,
        },
      },
    },
  });
}

async function getBossesByExtensionAndSeason(extension, season) {
  return await prisma.bosses.findMany({
    where: {
      extension,
      season,
    },
    orderBy: { order: 'asc' },
  });
}

/**
 * @deprecated Use getBossesByExtensionAndSeason instead
 * Get bosses by raid ID (kept for backwards compatibility)
 */
async function getBossesByRaidId(raidId) {
  if (raidId === 1 || raidId === '1') {
    return getBossesByExtensionAndSeason('The-War-Within', 'season-03');
  }
  return [];
}

module.exports = {
  listBosses,
  getBossById,
  getBossesByRaidId,
  getBossesByExtensionAndSeason,
};
