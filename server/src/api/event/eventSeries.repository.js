const { prisma } = require('../../data');

/**
 * Requêtes des séries d'événements récurrents (SIMS-200), sans logique.
 */

async function create(data) {
  return prisma.raid_event_series.create({ data });
}

async function findById(id) {
  return prisma.raid_event_series.findUnique({ where: { id } });
}

async function update(id, data) {
  return prisma.raid_event_series.update({ where: { id }, data });
}

/** Séries actives, à prolonger par le job. */
async function findActive() {
  return prisma.raid_event_series.findMany({
    where: { active: true },
    orderBy: { id: 'asc' },
  });
}

/**
 * Occurrences encore à venir de la série, à partir de la date `fromDate` de la
 * série (pas de la date de l'événement, qu'un officier a pu déplacer).
 */
async function findUpcomingOccurrences(seriesId, fromDate, now) {
  return prisma.raid_events.findMany({
    where: {
      seriesId,
      status: 'SCHEDULED',
      seriesOccurrenceDate: { gte: fromDate },
      startTime: { gt: now },
    },
    select: { id: true, seriesOccurrenceDate: true },
    orderBy: { seriesOccurrenceDate: 'asc' },
  });
}

module.exports = { create, findById, update, findActive, findUpcomingOccurrences };
