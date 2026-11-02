const { prisma } = require('../../data');

const progressSelect = {
  characterId: true,
  attunement: true,
  faction: true,
  completedSteps: true,
  completedAt: true,
};

/**
 * @param {number} characterId
 * @param {number} realmId
 */
async function findCharacterInRealm(characterId, realmId) {
  return prisma.characters.findFirst({
    where: { id: characterId, realmId },
    select: { id: true, name: true, class: true },
  });
}

/**
 * Personnages actifs du royaume, avec leur avancement.
 * @param {number} realmId
 */
async function listRealmCharacters(realmId) {
  return prisma.characters.findMany({
    where: { realmId, archived: 0 },
    select: {
      id: true,
      name: true,
      class: true,
      attunements: { select: progressSelect },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * @param {number} characterId
 * @param {string} attunement
 * @param {{ faction: string, completedSteps: number, completedAt: Date | null }} data
 */
async function upsertProgress(characterId, attunement, data) {
  return prisma.character_attunements.upsert({
    where: { characterId_attunement: { characterId, attunement } },
    create: { characterId, attunement, ...data },
    update: data,
    select: progressSelect,
  });
}

module.exports = { findCharacterInRealm, listRealmCharacters, upsertProgress };
