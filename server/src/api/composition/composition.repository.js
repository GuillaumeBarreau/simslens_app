const { prisma } = require('../../data');

/**
 * Read-only queries used by the auto-composition algorithm.
 */

async function getEventContext(eventId, realmId) {
  return prisma.raid_events.findFirst({
    where: { id: eventId, realmId },
    select: {
      id: true,
      title: true,
      startTime: true,
      raidDifficultyId: true,
      raid_difficulty: {
        select: {
          id: true,
          difficulty: true,
          raid: {
            select: { id: true, name: true, extension: true, season: true },
          },
        },
      },
    },
  });
}

/**
 * Bosses for the event's raid (extension + season + raid name).
 * Mirrors the filter used in EventRosterPage so the order/list match.
 */
async function getBossesForRaid({ extension, season, raidName }) {
  const where = { extension, season };
  if (raidName) where.raidName = raidName;
  const bosses = await prisma.bosses.findMany({
    where,
    select: { id: true, name: true, order: true, icon: true, raidName: true },
    orderBy: { order: 'asc' },
  });
  return bosses.filter((b) => b.name !== 'Bind on Equip');
}

/**
 * Pool = signups with status PRESENT for this event, hydrated with character
 * data needed for role/buff/score logic.
 *
 * A character without specialization stays in the pool (SIMS-209): the
 * service resolves its role from the signup, or lists it as unplaced.
 */
async function getPresentPool(eventId) {
  const signups = await prisma.raid_signups.findMany({
    where: { eventId, status: 'PRESENT' },
    select: {
      characterId: true,
      role: true,
      character: {
        select: {
          id: true,
          name: true,
          class: true,
          userId: true,
          realmId: true,
          specialization: {
            select: { id: true, name: true, role: true },
          },
        },
      },
    },
  });
  return signups.filter((s) => s.character);
}

/**
 * Used to compute the "history" component of the composition score:
 * how often a candidate was assigned to each boss in recent runs.
 */
async function getPastBossAssignments({
  realmId,
  raidDifficultyId,
  excludeEventId,
  beforeDate,
  weeks,
}) {
  if (!raidDifficultyId) return [];
  const since = new Date(beforeDate);
  since.setDate(since.getDate() - weeks * 7);

  const events = await prisma.raid_events.findMany({
    where: {
      realmId,
      raidDifficultyId,
      id: { not: excludeEventId },
      status: { not: 'CANCELLED' },
      startTime: { gte: since, lt: beforeDate },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      event_roster_assignments: {
        select: {
          characterId: true,
          bossId: true,
          role: true,
          character: {
            select: {
              id: true,
              name: true,
              class: true,
              specialization: { select: { name: true, role: true } },
            },
          },
        },
      },
    },
    orderBy: { startTime: 'desc' },
  });
  return events.filter((e) => (e.event_roster_assignments || []).length > 0);
}

async function getValidationSettings(realmId) {
  if (!realmId) return null;
  return prisma.validation_settings.findUnique({
    where: { realmId },
    select: { raidBuffsConfig: true },
  });
}

module.exports = {
  getEventContext,
  getBossesForRaid,
  getPresentPool,
  getPastBossAssignments,
  getValidationSettings,
};
