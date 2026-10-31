const { prisma } = require('../../data');

/**
 * Jetons du flux iCal et lectures nécessaires à son contenu (SIMS-204).
 */

/**
 * @param {string} userId
 * @returns {Promise<import('@prisma/client').calendar_feed_tokens|null>}
 */
async function findByUserId(userId) {
  return prisma.calendar_feed_tokens.findUnique({ where: { userId: String(userId) } });
}

/**
 * @param {string} tokenHash
 * @returns {Promise<import('@prisma/client').calendar_feed_tokens|null>}
 */
async function findByTokenHash(tokenHash) {
  return prisma.calendar_feed_tokens.findUnique({ where: { tokenHash } });
}

/**
 * Crée le jeton du joueur, ou remplace l'ancien : l'ancienne URL cesse
 * aussitôt de fonctionner.
 * @param {string} userId
 * @param {string} tokenHash
 * @returns {Promise<import('@prisma/client').calendar_feed_tokens>}
 */
async function upsertForUser(userId, tokenHash) {
  const createdAt = new Date();
  return prisma.calendar_feed_tokens.upsert({
    where: { userId: String(userId) },
    create: { userId: String(userId), tokenHash, createdAt },
    update: { tokenHash, createdAt, lastUsedAt: null },
  });
}

/**
 * @param {string} userId
 * @returns {Promise<number>} nombre de jetons supprimés (0 ou 1)
 */
async function deleteForUser(userId) {
  const { count } = await prisma.calendar_feed_tokens.deleteMany({
    where: { userId: String(userId) },
  });
  return count;
}

/**
 * @param {number} id
 * @param {Date} date
 */
async function touch(id, date) {
  await prisma.calendar_feed_tokens.update({ where: { id }, data: { lastUsedAt: date } });
}

/**
 * Personnages actifs du joueur rattachés à un royaume. Un personnage en
 * attente d'acceptation (`pending`, après un claim Battle.net) n'ouvre pas
 * encore le calendrier de la guilde.
 * @param {string} userId
 * @returns {Promise<Array<{ id: number, name: string, realmId: number }>>}
 */
async function findUserCharacters(userId) {
  return prisma.characters.findMany({
    where: {
      userId: String(userId),
      archived: 0,
      status: { not: 'pending' },
      realmId: { not: null },
    },
    select: { id: true, name: true, realmId: true },
  });
}

/**
 * Royaumes que le joueur gère ou où il est invité.
 * @param {string} userId
 * @returns {Promise<number[]>}
 */
async function findManagedOrGuestRealmIds(userId) {
  const [owners, guests] = await Promise.all([
    prisma.realm_owners.findMany({ where: { ownerId: String(userId) }, select: { realmId: true } }),
    prisma.realm_user_guests.findMany({
      where: { userId: String(userId) },
      select: { realmId: true },
    }),
  ]);
  return [...owners, ...guests].map((row) => row.realmId);
}

/**
 * Soirées des royaumes donnés, commençant après `from`.
 * @param {number[]} realmIds
 * @param {Date} from
 * @param {number} limit
 */
async function findEvents(realmIds, from, limit) {
  return prisma.raid_events.findMany({
    where: { realmId: { in: realmIds }, startTime: { gte: from } },
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      status: true,
      isOptional: true,
      updatedAt: true,
      realmId: true,
      realm: { select: { guildName: true } },
    },
    orderBy: { startTime: 'asc' },
    take: limit,
  });
}

/**
 * @param {number[]} eventIds
 * @param {number[]} characterIds
 */
async function findSignups(eventIds, characterIds) {
  return prisma.raid_signups.findMany({
    where: { eventId: { in: eventIds }, characterId: { in: characterIds } },
    select: {
      eventId: true,
      characterId: true,
      status: true,
      lateTime: true,
      updatedAt: true,
      character: { select: { name: true } },
    },
  });
}

module.exports = {
  findByUserId,
  findByTokenHash,
  upsertForUser,
  deleteForUser,
  touch,
  findUserCharacters,
  findManagedOrGuestRealmIds,
  findEvents,
  findSignups,
};
