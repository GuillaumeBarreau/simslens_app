const { prisma } = require('../../data');

const entrySelect = { season: true, slot: true, rank: true, itemId: true, note: true };

/**
 * @param {number} specializationId
 */
async function findSpecialization(specializationId) {
  return prisma.specializations.findUnique({
    where: { id: specializationId },
    select: { id: true, name: true, class: { select: { name: true } } },
  });
}

/**
 * @param {number} realmId
 * @param {number} specializationId
 * @param {string[]} seasons
 */
async function listGuildEntries(realmId, specializationId, seasons) {
  return prisma.bis_list_entries.findMany({
    where: { realmId, specializationId, season: { in: seasons } },
    select: entrySelect,
    orderBy: [{ slot: 'asc' }, { rank: 'asc' }],
  });
}

/**
 * Remplace la liste d'un emplacement ; une liste vide supprime la surcharge.
 * @param {{ realmId: number, specializationId: number, season: string, slot: string }} scope
 * @param {{ itemId: number, note: string | null, rank: number }[]} items
 * @param {string} updatedBy
 */
async function replaceSlot(scope, items, updatedBy) {
  return prisma.$transaction(async (tx) => {
    await tx.bis_list_entries.deleteMany({ where: scope });
    if (items.length > 0) {
      await tx.bis_list_entries.createMany({
        data: items.map((item) => ({ ...scope, ...item, updatedBy })),
      });
    }
    return tx.bis_list_entries.findMany({
      where: scope,
      select: entrySelect,
      orderBy: { rank: 'asc' },
    });
  });
}

module.exports = { findSpecialization, listGuildEntries, replaceSlot };
