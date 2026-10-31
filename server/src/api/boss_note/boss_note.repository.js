const { prisma } = require('../../data');

const noteInclude = {
  assignments: {
    orderBy: { position: 'asc' },
    include: { character: { select: { id: true, name: true, class: true } } },
  },
};

/**
 * @param {number} eventId
 * @param {number} realmId
 */
async function findEventInRealm(eventId, realmId) {
  return prisma.raid_events.findFirst({
    where: { id: eventId, realmId },
    select: {
      id: true,
      raid_difficulty: { select: { raid: { select: { extension: true, season: true } } } },
    },
  });
}

/**
 * @param {number} bossId
 */
async function findBossById(bossId) {
  return prisma.bosses.findUnique({
    where: { id: bossId },
    select: { id: true, extension: true, season: true },
  });
}

/**
 * Lignes du roster de l'événement (titulaires), éventuellement d'un seul boss.
 * @param {number} eventId
 * @param {number|null} [bossId]
 */
async function findHolders(eventId, bossId = null) {
  const where = { eventId };
  if (bossId !== null) where.bossId = bossId;
  return prisma.event_roster_assignments.findMany({
    where,
    select: { characterId: true, bossId: true },
  });
}

/**
 * @param {number} eventId
 */
async function findByEvent(eventId) {
  return prisma.event_boss_notes.findMany({
    where: { eventId },
    include: noteInclude,
  });
}

/**
 * Remplace la note du boss et toutes ses assignations, en une transaction.
 * @param {number} eventId
 * @param {number} bossId
 * @param {{ content: string, updatedBy: string, assignments: { characterId: number, task: string }[] }} data
 */
async function replace(eventId, bossId, { content, updatedBy, assignments }) {
  return prisma.$transaction(async (tx) => {
    const note = await tx.event_boss_notes.upsert({
      where: { eventId_bossId: { eventId, bossId } },
      create: { eventId, bossId, content, updatedBy },
      update: { content, updatedBy },
    });
    await tx.event_boss_note_assignments.deleteMany({ where: { noteId: note.id } });
    if (assignments.length > 0) {
      await tx.event_boss_note_assignments.createMany({
        data: assignments.map((a, position) => ({
          noteId: note.id,
          characterId: a.characterId,
          task: a.task,
          position,
        })),
      });
    }
    return tx.event_boss_notes.findUnique({ where: { id: note.id }, include: noteInclude });
  });
}

/**
 * Supprime la note du boss (ses assignations suivent, en cascade).
 * @param {number} eventId
 * @param {number} bossId
 * @returns {Promise<{count: number}>}
 */
async function removeByBoss(eventId, bossId) {
  return prisma.event_boss_notes.deleteMany({ where: { eventId, bossId } });
}

module.exports = {
  findEventInRealm,
  findBossById,
  findHolders,
  findByEvent,
  replace,
  removeByBoss,
};
