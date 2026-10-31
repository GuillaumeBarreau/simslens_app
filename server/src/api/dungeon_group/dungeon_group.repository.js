const { prisma } = require('../../data');

async function findAll({ realmId, date, startDate, endDate }) {
  const where = { realmId };

  if (date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    where.date = { gte: start, lt: end };
  } else if (startDate && endDate) {
    where.date = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  return prisma.dungeon_groups.findMany({
    where,
    include: { members: true, guests: true },
    orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
  });
}

async function findById(id) {
  return prisma.dungeon_groups.findUnique({
    where: { id },
    include: { members: true, guests: true },
  });
}

async function addGuest(groupId, data) {
  return prisma.dungeon_group_guests.create({
    data: {
      groupId: Number(groupId),
      realmId: Number(data.realmId),
      name: data.name,
      role: data.role,
      class: data.class || null,
      addedBy: data.addedBy || null,
    },
  });
}

/**
 * Supprime un invité, seulement s'il appartient au groupe : le royaume du
 * groupe est vérifié en amont, pas celui de l'invité (SIMS-162).
 * @returns {Promise<{ count: number }>}
 */
async function removeGuest(groupId, guestId) {
  return prisma.dungeon_group_guests.deleteMany({
    where: { id: Number(guestId), groupId: Number(groupId) },
  });
}

async function updateGuest(groupId, guestId, data) {
  return prisma.dungeon_group_guests.updateMany({
    where: { id: Number(guestId), groupId: Number(groupId) },
    data,
  });
}

async function create(data) {
  return prisma.dungeon_groups.create({
    data: {
      realmId: data.realmId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      type: data.type,
      note: data.note || null,
      status: data.status || 'DRAFT',
      createdBy: String(data.createdBy),
    },
    include: { members: true },
  });
}

async function update(id, data) {
  return prisma.dungeon_groups.update({
    where: { id },
    data,
    include: { members: true },
  });
}

/**
 * Delete a group (cascade deletes members)
 */
async function remove(id) {
  return prisma.dungeon_groups.delete({
    where: { id },
  });
}

async function addMember(groupId, userId, role) {
  return prisma.dungeon_group_members.create({
    data: {
      groupId,
      userId: String(userId),
      role,
    },
  });
}

/**
 * Retire un membre, seulement dans le groupe donné.
 * @returns {Promise<{ count: number }>} count vaut 0 si l'utilisateur n'en est pas membre
 */
async function removeMember(groupId, userId) {
  return prisma.dungeon_group_members.deleteMany({
    where: {
      groupId,
      userId: String(userId),
    },
  });
}

async function belongsToRealm(id, realmId) {
  const group = await prisma.dungeon_groups.findFirst({
    where: { id, realmId },
  });
  return !!group;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  addMember,
  removeMember,
  belongsToRealm,
  addGuest,
  removeGuest,
  updateGuest,
};
