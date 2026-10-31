const { prisma } = require('../../data');

/**
 * Availabilities are linked to userId + realmId (like absences)
 */

async function findAll({ realmId, userId, startDate, endDate }) {
  const where = { realmId };

  if (userId) {
    where.userId = String(userId);
  }

  if (startDate && endDate) {
    where.date = {
      gte: startDate,
      lte: endDate,
    };
  } else if (startDate) {
    where.date = { gte: startDate };
  } else if (endDate) {
    where.date = { lte: endDate };
  }

  return prisma.dungeon_availabilities.findMany({
    where,
    orderBy: {
      date: 'asc',
    },
  });
}

async function findById(id) {
  return prisma.dungeon_availabilities.findUnique({
    where: { id },
  });
}

async function create(data) {
  return prisma.dungeon_availabilities.create({
    data: {
      userId: String(data.userId),
      realmId: data.realmId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      type: data.type,
      roles: data.roles,
      note: data.note || null,
    },
  });
}

async function update(id, data) {
  return prisma.dungeon_availabilities.update({
    where: { id },
    data,
  });
}

async function remove(id) {
  return prisma.dungeon_availabilities.delete({
    where: { id },
  });
}

async function belongsToRealm(id, realmId, userId = null) {
  const where = { id, realmId };
  if (userId) {
    where.userId = String(userId);
  }
  const availability = await prisma.dungeon_availabilities.findFirst({ where });
  return !!availability;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  belongsToRealm,
};
