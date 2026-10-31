const { prisma } = require('../../data');

/**
 * Handles database operations for event_roster_assignments (separate from signups)
 */

/**
 * @param {number} eventId - Event ID
 * @param {number|null} bossId - Optional boss ID filter
 * @returns {Promise<Object[]>} Roster assignments with character data
 */
async function findByEvent(eventId, bossId = null) {
  const where = { eventId };
  if (bossId !== null) {
    where.bossId = bossId;
  }

  return prisma.event_roster_assignments.findMany({
    where,
    include: {
      character: {
        select: {
          id: true,
          name: true,
          class: true,
          specialization: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          userId: true,
          realmId: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { position: 'asc' }],
  });
}

/**
 * @param {number} eventId - Event ID
 * @param {number} characterId - Character ID
 * @param {number|null} bossId - Boss ID (null for general roster)
 * @returns {Promise<Object|null>}
 */
async function findOne(eventId, characterId, bossId = null) {
  return prisma.event_roster_assignments.findFirst({
    where: {
      eventId,
      characterId,
      bossId,
    },
    include: {
      character: {
        select: {
          id: true,
          name: true,
          class: true,
          specialization: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

/**
 * @param {Object} data - Assignment data
 * @returns {Promise<Object>}
 */
async function upsert(data) {
  const { eventId, characterId, role, bossId = null, position = 0 } = data;

  const includeConfig = {
    character: {
      select: {
        id: true,
        name: true,
        class: true,
        specialization: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    },
  };

  const existing = await prisma.event_roster_assignments.findFirst({
    where: {
      eventId,
      characterId,
      bossId,
    },
  });

  if (existing) {
    return prisma.event_roster_assignments.update({
      where: { id: existing.id },
      data: {
        role,
        position,
        updatedAt: new Date(),
      },
      include: includeConfig,
    });
  }

  return prisma.event_roster_assignments.create({
    data: {
      eventId,
      characterId,
      role,
      bossId,
      position,
    },
    include: includeConfig,
  });
}

/**
 * @param {number} eventId - Event ID
 * @param {number} characterId - Character ID
 * @param {number|null} bossId - Boss ID
 * @returns {Promise<Object|null>}
 */
async function remove(eventId, characterId, bossId = null) {
  try {
    const result = await prisma.event_roster_assignments.deleteMany({
      where: {
        eventId,
        characterId,
        bossId,
      },
    });
    return result.count > 0 ? result : null;
  } catch (error) {
    if (error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

/**
 * @param {number} eventId - Event ID
 * @returns {Promise<{count: number}>}
 */
async function removeAllForEvent(eventId) {
  return prisma.event_roster_assignments.deleteMany({
    where: { eventId },
  });
}

/**
 * @param {number} eventId - Event ID
 * @param {number} bossId - Boss ID
 * @returns {Promise<{count: number}>}
 */
async function removeAllForBoss(eventId, bossId) {
  return prisma.event_roster_assignments.deleteMany({
    where: {
      eventId,
      bossId,
    },
  });
}

/**
 * Find past events for the same realm and raid difficulty, with their roster summary.
 * Returns events ordered by startTime desc, with counts per role and character names.
 * @param {number} realmId
 * @param {number|null} raidDifficultyId
 * @param {number} excludeEventId - current event to exclude
 * @param {number} limit
 */
async function findPastEventsWithRoster(realmId, raidDifficultyId, excludeEventId, limit = 20) {
  const where = {
    realmId,
    id: { not: excludeEventId },
    status: { in: ['COMPLETED', 'SCHEDULED'] },
  };
  if (raidDifficultyId) {
    where.raidDifficultyId = raidDifficultyId;
  }

  const events = await prisma.raid_events.findMany({
    where,
    orderBy: { startTime: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      startTime: true,
      event_roster_assignments: {
        select: {
          characterId: true,
          role: true,
          bossId: true,
          character: {
            select: { id: true, name: true, class: true },
          },
        },
      },
    },
  });

  return events.map((event) => {
    const assignments = event.event_roster_assignments;

    const uniqueChars = new Map();
    assignments.forEach((a) => {
      if (!uniqueChars.has(a.characterId)) {
        uniqueChars.set(a.characterId, { ...a.character, role: a.role });
      }
    });

    const chars = Array.from(uniqueChars.values());
    const grouped = { TANK: [], HEALER: [], MELEE: [], RANGED: [] };
    chars.forEach((c) => {
      if (grouped[c.role]) grouped[c.role].push({ id: c.id, name: c.name, class: c.class });
    });

    return {
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      roster: {
        tanks: grouped.TANK,
        healers: grouped.HEALER,
        melee: grouped.MELEE,
        ranged: grouped.RANGED,
        counts: {
          tanks: grouped.TANK.length,
          healers: grouped.HEALER.length,
          melee: grouped.MELEE.length,
          ranged: grouped.RANGED.length,
          total: chars.length,
        },
      },
    };
  });
}

async function findAllAssignmentsForImport(sourceEventId) {
  return prisma.event_roster_assignments.findMany({
    where: { eventId: sourceEventId },
    select: {
      characterId: true,
      role: true,
      bossId: true,
      position: true,
      character: {
        select: { id: true, realmId: true },
      },
    },
  });
}

module.exports = {
  findByEvent,
  findOne,
  upsert,
  remove,
  removeAllForEvent,
  removeAllForBoss,
  findPastEventsWithRoster,
  findAllAssignmentsForImport,
};
