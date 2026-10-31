const { prisma } = require('../../data');

/**
 * @param {number} eventId
 * @returns {Promise<Array>}
 */
async function findByEvent(eventId) {
  return prisma.raid_guests.findMany({
    where: { eventId: Number(eventId) },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * @param {{ eventId: number, realmId: number, name: string, role: string, addedBy?: string }} data
 * @returns {Promise<Object>}
 */
async function create(data) {
  return prisma.raid_guests.create({
    data: {
      eventId: Number(data.eventId),
      realmId: Number(data.realmId),
      name: data.name,
      role: data.role,
      class: data.class || null,
      addedBy: data.addedBy || null,
    },
  });
}

/**
 * @param {number} id
 * @returns {Promise<Object>}
 */
async function remove(id) {
  return prisma.raid_guests.delete({ where: { id: Number(id) } });
}

/**
 * Find all guest assignments for an event (all guests + their boss assignments)
 * @param {number} eventId
 * @returns {Promise<Array>}
 */
async function findAssignmentsByEvent(eventId) {
  return prisma.raid_guest_assignments.findMany({
    where: { guest: { eventId: Number(eventId) } },
  });
}

/**
 * @param {{ guestId: number, bossId: number, role: string }} data
 * @returns {Promise<Object>}
 */
async function upsertAssignment({ guestId, bossId, role }) {
  return prisma.raid_guest_assignments.upsert({
    where: { guestId_bossId: { guestId: Number(guestId), bossId: Number(bossId) } },
    update: { role },
    create: { guestId: Number(guestId), bossId: Number(bossId), role },
  });
}

/**
 * @param {{ guestId: number, bossId: number }} data
 * @returns {Promise<Object>}
 */
async function removeAssignment({ guestId, bossId }) {
  return prisma.raid_guest_assignments.deleteMany({
    where: { guestId: Number(guestId), bossId: Number(bossId) },
  });
}

/**
 * L'invité appartient-il à cet événement ? Les routes ne vérifient le royaume
 * que pour l'événement de la route : un invité doit y être rattaché (SIMS-162).
 * @param {number} guestId
 * @param {number} eventId
 * @returns {Promise<boolean>}
 */
async function belongsToEvent(guestId, eventId) {
  const count = await prisma.raid_guests.count({
    where: { id: Number(guestId), eventId: Number(eventId) },
  });
  return count > 0;
}

module.exports = {
  belongsToEvent,
  findByEvent,
  create,
  remove,
  findAssignmentsByEvent,
  upsertAssignment,
  removeAssignment,
};
