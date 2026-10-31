const { prisma } = require('../../data');

/**
 * Absences are now linked to userId + realmId (not characterId)
 */

/**
 * @param {Object} filters - Filter options
 * @param {number} filters.realmId - Realm ID (required)
 * @param {string} filters.userId - Optional user ID filter
 * @param {Date} filters.startDate - Filter absences that overlap with this start date
 * @param {Date} filters.endDate - Filter absences that overlap with this end date
 * @returns {Promise<Array>} List of absences
 */
async function findAll({ realmId, userId, startDate, endDate }) {
  const where = { realmId };

  if (userId) {
    where.userId = String(userId);
  }

  if (startDate && endDate) {
    where.AND = [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }];
  } else if (startDate) {
    where.endDate = { gte: startDate };
  } else if (endDate) {
    where.startDate = { lte: endDate };
  }

  return prisma.member_absences.findMany({
    where,
    orderBy: {
      startDate: 'asc',
    },
  });
}

/**
 * @param {number} id - Absence ID
 * @returns {Promise<Object|null>} Absence or null
 */
async function findById(id) {
  return prisma.member_absences.findUnique({
    where: { id },
  });
}

/**
 * @param {string} userId - User ID
 * @param {number} realmId - Realm ID
 * @param {Date} date - The date to check
 * @returns {Promise<Object|null>} Absence covering the date or null
 */
async function findByUserAndDate(userId, realmId, date) {
  console.log('[Absence Repo] findByUserAndDate called with:', {
    userId,
    realmId,
    date: date.toISOString(),
  });

  const result = await prisma.member_absences.findFirst({
    where: {
      userId: String(userId),
      realmId,
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });

  console.log('[Absence Repo] findByUserAndDate result:', result);
  return result;
}

/**
 * @param {Object} data - Absence data
 * @returns {Promise<Object>} Created absence
 */
async function create(data) {
  return prisma.member_absences.create({
    data: {
      userId: String(data.userId),
      realmId: data.realmId,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason || null,
    },
  });
}

/**
 * @param {number} id - Absence ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Updated absence
 */
async function update(id, data) {
  return prisma.member_absences.update({
    where: { id },
    data,
  });
}

/**
 * @param {number} id - Absence ID
 * @returns {Promise<Object>} Deleted absence
 */
async function remove(id) {
  return prisma.member_absences.delete({
    where: { id },
  });
}

/**
 * @param {number} id - Absence ID
 * @param {number} realmId - Realm ID
 * @param {string} userId - User ID (optional, for ownership check)
 * @returns {Promise<boolean>} True if absence belongs to realm
 */
async function belongsToRealm(id, realmId, userId = null) {
  const where = { id, realmId };
  if (userId) {
    where.userId = String(userId);
  }
  const absence = await prisma.member_absences.findFirst({ where });
  return !!absence;
}

module.exports = {
  findAll,
  findById,
  findByUserAndDate,
  create,
  update,
  remove,
  belongsToRealm,
};
