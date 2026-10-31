const { prisma } = require('../../data');

/**
 * @param {Object} data - Signup data
 * @returns {Promise<Object>} Created or updated signup
 */
async function upsert(data) {
  return prisma.raid_signups.upsert({
    where: {
      eventId_characterId: {
        eventId: data.eventId,
        characterId: data.characterId,
      },
    },
    update: {
      status: data.status,
      role: data.role,
      lateTime: data.lateTime,
      absenceReason: data.absenceReason,
    },
    create: data,
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
          thumbnail: true,
        },
      },
    },
  });
}

/**
 * @param {number} eventId - Event ID
 * @returns {Promise<Array>} List of signups
 */
async function findByEvent(eventId) {
  return prisma.raid_signups.findMany({
    where: { eventId },
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
          thumbnail: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * @param {number} characterId - Character ID
 * @returns {Promise<Array>} List of signups
 */
async function findByCharacter(characterId) {
  return prisma.raid_signups.findMany({
    where: { characterId },
    include: {
      event: {
        include: {
          raid_difficulty: {
            include: {
              raid: true,
              difficulty_rel: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * @param {number} eventId - Event ID
 * @returns {Promise<Object>} Roster grouped by role
 */
async function getRosterGroupedByRole(eventId) {
  const signups = await findByEvent(eventId);

  const roster = {
    tanks: [],
    healers: [],
    dps: [],
    counts: {
      tanks: 0,
      healers: 0,
      dps: 0,
      total: 0,
      present: 0,
      absent: 0,
      tentative: 0,
      late: 0,
      bench: 0,
    },
  };

  signups.forEach((signup) => {
    const role = signup.role?.toLowerCase();

    if (role === 'tank') {
      roster.tanks.push(signup);
      roster.counts.tanks++;
    } else if (role === 'healer') {
      roster.healers.push(signup);
      roster.counts.healers++;
    } else if (role === 'dps') {
      roster.dps.push(signup);
      roster.counts.dps++;
    }

    roster.counts.total++;
    const status = signup.status?.toLowerCase();
    if (status === 'present') roster.counts.present++;
    else if (status === 'absent') roster.counts.absent++;
    else if (status === 'tentative') roster.counts.tentative++;
    else if (status === 'late') roster.counts.late++;
    else if (status === 'bench') roster.counts.bench++;
  });

  return roster;
}

/**
 * @param {number} eventId - Event ID
 * @param {number} characterId - Character ID
 * @returns {Promise<Object>} Deleted signup
 */
async function remove(eventId, characterId) {
  return prisma.raid_signups.delete({
    where: {
      eventId_characterId: {
        eventId,
        characterId,
      },
    },
  });
}

/**
 * Load the character fields a signup needs (role mapping, Discord sync).
 * @param {number} characterId
 * @returns {Promise<Object|null>}
 */
async function findSignupCharacter(characterId) {
  return prisma.characters.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      name: true,
      class: true,
      spec: true,
      userId: true,
      specialization: {
        select: { name: true },
      },
    },
  });
}

async function findByEventAndCharacter(eventId, characterId) {
  return prisma.raid_signups.findUnique({
    where: {
      eventId_characterId: {
        eventId,
        characterId,
      },
    },
  });
}

module.exports = {
  findSignupCharacter,
  upsert,
  findByEvent,
  findByCharacter,
  getRosterGroupedByRole,
  remove,
  findByEventAndCharacter,
};
