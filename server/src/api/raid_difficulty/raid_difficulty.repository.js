const { prisma } = require('../../data');

async function findRaidDifficultyById(id) {
  const raidDifficulty = await prisma.raid_difficulties.findUnique({
    where: { id: parseInt(id) },
    include: {
      raid: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!raidDifficulty) return null;

  return {
    id: raidDifficulty.id,
    raidId: raidDifficulty.raidId,
    difficulty: raidDifficulty.difficulty,
    raid_name: raidDifficulty.raid?.name,
  };
}

/**
 * @deprecated This function should be updated to accept extension/season
 */
async function listBossesForRaid(raidId) {
  let extension = 'The-War-Within';
  let season = 'season-03';

  if (raidId === 1 || raidId === '1') {
    extension = 'The-War-Within';
    season = 'season-03';
  }

  return await prisma.bosses
    .findMany({
      where: {
        extension,
        season,
      },
      select: {
        id: true,
        name: true,
        extension: true,
        season: true,
        raidName: true,
      },
      orderBy: {
        order: 'asc',
      },
    })
    .then((bosses) =>
      bosses.map((b) => ({
        id: b.id,
        name: b.name,
        extension: b.extension,
        season: b.season,
        raidName: b.raidName,
      })),
    );
}

module.exports = {
  findRaidDifficultyById,
  listBossesForRaid,
  getById: findRaidDifficultyById,
  getBossesForRaid: listBossesForRaid,
};
