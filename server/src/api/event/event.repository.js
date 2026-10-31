const { prisma } = require('../../data');

/**
 * @param {Object} filters - Filter options
 * @param {number} filters.realmId - Realm ID (required for multi-tenancy)
 * @param {Date} [filters.startDate] - Filter events starting after this date
 * @param {Date} [filters.endDate] - Filter events ending before this date
 * @param {string} [filters.status] - Filter by event status
 * @returns {Promise<Array>} List of events
 */
async function findAll({ realmId, startDate, endDate, status }) {
  const where = { realmId };

  if (startDate && endDate) {
    where.AND = [
      { startTime: { lte: endDate } }, // Event starts before period ends
      { endTime: { gte: startDate } }, // Event ends after period starts
    ];
  } else if (startDate) {
    where.endTime = { gte: startDate };
  } else if (endDate) {
    where.startTime = { lte: endDate };
  }

  if (status) {
    where.status = status;
  }

  console.log('[Event Repository] findAll query:', { where, startDate, endDate, status });

  const results = await prisma.raid_events.findMany({
    where,
    include: {
      raid_difficulty: {
        include: {
          raid: true,
          difficulty_rel: true,
        },
      },
      signups: {
        where: {
          character: { realmId: where.realmId },
        },
        include: {
          character: {
            select: {
              id: true,
              name: true,
              class: true,
              spec: true,
              realmId: true,
              specialization: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
              thumbnail: true,
              userId: true,
            },
          },
        },
      },
      guests: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  console.log('[Event Repository] findAll results count:', results.length);

  return results;
}

/**
 * @param {number} id - Event ID
 * @returns {Promise<Object|null>} Event or null
 */
async function findById(id) {
  const meta = await prisma.raid_events.findUnique({
    where: { id },
    select: { realmId: true },
  });
  if (!meta) return null;

  return prisma.raid_events.findUnique({
    where: { id },
    include: {
      realm: true,
      raid_difficulty: {
        include: {
          raid: true,
          difficulty_rel: true,
        },
      },
      signups: {
        where: {
          character: { realmId: meta.realmId },
        },
        include: {
          character: {
            select: {
              id: true,
              name: true,
              class: true,
              spec: true,
              realmId: true,
              specialization: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
              thumbnail: true,
              userId: true,
            },
          },
        },
      },
      guests: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * @param {number} id - Event ID
 * @returns {Promise<Object|null>} Event with grouped roster
 */
async function findWithRoster(id) {
  const event = await findById(id);

  if (!event) {
    return null;
  }

  const roster = {
    tanks: [],
    healers: [],
    dps: [],
  };

  event.signups.forEach((signup) => {
    const role = signup.role?.toLowerCase();
    if (role === 'tank') {
      roster.tanks.push(signup);
    } else if (role === 'healer') {
      roster.healers.push(signup);
    } else if (role === 'dps') {
      roster.dps.push(signup);
    }
  });

  return {
    ...event,
    roster,
  };
}

/**
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Created event
 */
async function create(data) {
  const { realmId, raidDifficultyId, seriesId, ...eventData } = data;

  return prisma.raid_events.create({
    data: {
      ...eventData,
      realm: {
        connect: { id: realmId },
      },
      ...(raidDifficultyId && {
        raid_difficulty: {
          connect: { id: raidDifficultyId },
        },
      }),
      // Occurrence d'une série récurrente (SIMS-200).
      ...(seriesId && {
        series: {
          connect: { id: seriesId },
        },
      }),
    },
    include: {
      realm: true,
      raid_difficulty: {
        include: {
          raid: true,
          difficulty_rel: true,
        },
      },
    },
  });
}

/**
 * @param {number} id - Event ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Updated event
 */
async function update(id, data) {
  // realmId est volontairement écarté : le royaume d'un événement ne change pas.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { raidDifficultyId, realmId, ...updateData } = data;

  return prisma.raid_events.update({
    where: { id },
    data: {
      ...updateData,
      ...(raidDifficultyId && {
        raid_difficulty: {
          connect: { id: raidDifficultyId },
        },
      }),
    },
    include: {
      raid_difficulty: {
        include: {
          raid: true,
          difficulty_rel: true,
        },
      },
      signups: {
        include: {
          character: {
            select: {
              id: true,
              name: true,
              class: true,
              spec: true,
              realmId: true,
              specialization: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
              thumbnail: true,
              userId: true,
            },
          },
        },
      },
    },
  });
}

/**
 * @param {number} id - Event ID
 * @returns {Promise<Object>} Deleted event
 */
async function remove(id) {
  return prisma.raid_events.delete({
    where: { id },
  });
}

/**
 * @param {number} id - Event ID
 * @param {number} realmId - Realm ID
 * @returns {Promise<boolean>} True if event belongs to realm
 */
async function belongsToRealm(id, realmId) {
  const event = await prisma.raid_events.findFirst({
    where: { id, realmId },
  });
  return !!event;
}

module.exports = {
  findAll,
  findById,
  findWithRoster,
  create,
  update,
  remove,
  belongsToRealm,
};
