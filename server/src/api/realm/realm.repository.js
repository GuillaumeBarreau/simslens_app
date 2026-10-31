const { prisma } = require('../../data');

async function createRealm({ name, server, region, ownerId, createdBy }) {
  const realm = await prisma.realms.create({
    data: {
      guildName: name,
      server,
      region: region || 'EU',
      createdBy: createdBy || 0,
    },
  });

  if (ownerId) {
    await prisma.realm_owners.create({
      data: {
        realmId: realm.id,
        ownerId: String(ownerId),
        role: 'owner',
      },
    });
  }

  return realm.id;
}

async function listAllRealms() {
  return await prisma.realms.findMany({
    orderBy: { guildName: 'asc' },
    include: {
      _count: {
        select: { characters: true },
      },
    },
  });
}

async function getRealmById(id) {
  return await prisma.realms.findUnique({
    where: { id: parseInt(id) },
  });
}

async function updateRealmSettings(id, fields) {
  return await prisma.realms.update({
    where: { id: parseInt(id) },
    data: fields,
  });
}

async function getRealmCharacters(realmId) {
  return await prisma.characters.findMany({
    where: { realmId: parseInt(realmId) },
  });
}

/**
 * Rattache un personnage à un royaume, s'il n'appartient encore à aucun
 * (ou déjà à celui-ci).
 *
 * La condition sur realmId est dans le where : un responsable ne peut pas
 * faire passer dans son royaume le personnage d'une autre guilde, ce qui lui
 * donnerait la main dessus via checkPermission (dette 20, SIMS-182).
 *
 * @returns {Promise<number>} 1 si le personnage est rattaché, 0 sinon
 */
async function addCharacterToRealm(characterId, realmId) {
  const id = parseInt(realmId);
  const { count } = await prisma.characters.updateMany({
    where: { id: parseInt(characterId), OR: [{ realmId: null }, { realmId: id }] },
    data: { realmId: id },
  });
  return count;
}

async function findRealmByDetails(guildName, server, region) {
  return await prisma.realms.findFirst({
    where: {
      guildName: { equals: guildName, mode: 'insensitive' },
      server: { equals: server, mode: 'insensitive' },
      region: { equals: region, mode: 'insensitive' },
    },
  });
}

async function findRealmByNameAndRegion(guildName, region) {
  return await prisma.realms.findFirst({
    where: {
      guildName: { equals: guildName, mode: 'insensitive' },
      region: { equals: region, mode: 'insensitive' },
    },
  });
}

async function findRealmByOwnerId(ownerId) {
  const realmOwner = await prisma.realm_owners.findFirst({
    where: { ownerId: String(ownerId) },
    include: { realm: true },
  });

  if (!realmOwner) return null;

  return {
    ...realmOwner.realm,
    role: realmOwner.role,
  };
}

async function findRealmsByOwnerId(ownerId) {
  const realmOwners = await prisma.realm_owners.findMany({
    where: { ownerId: String(ownerId) },
    include: { realm: true },
  });

  return realmOwners.map((ro) => ro.realm);
}

async function isRealmOwner(realmId, ownerId) {
  const owner = await prisma.realm_owners.findUnique({
    where: {
      realmId_ownerId: {
        realmId: parseInt(realmId),
        ownerId: String(ownerId),
      },
    },
  });
  return !!owner;
}

async function addRealmOwner(realmId, ownerId, role = 'admin') {
  const owner = await prisma.realm_owners.create({
    data: {
      realmId: parseInt(realmId),
      ownerId: String(ownerId),
      role,
    },
  });
  return owner.id;
}

async function findRealmByMemberUserId(userId) {
  const character = await prisma.characters.findFirst({
    where: {
      userId: String(userId),
      realmId: { not: null },
      archived: 0,
    },
    include: { realmRelation: true },
  });

  return character?.realmRelation || null;
}

/**
 * Check if a user has any character (regardless of realmId) — used for diagnostic logging
 */
async function hasCharacterWithUserId(userId) {
  const character = await prisma.characters.findFirst({
    where: { userId: String(userId) },
    select: { id: true },
  });
  return !!character;
}

async function getRealmOwners(realmId) {
  return await prisma.$queryRaw`
    SELECT
      ro.id,
      ro."realmId",
      ro."ownerId",
      ro.role,
      c.name as "characterName",
      c.class as "characterClass"
    FROM realm_owners ro
    LEFT JOIN characters c ON ro."ownerId" = c."userId" AND c."realmId" = ro."realmId"
    WHERE ro."realmId" = ${parseInt(realmId)}
    GROUP BY ro.id, c.name, c.class
    ORDER BY ro.role ASC
  `;
}

/**
 * deleteMany plutôt que delete : un responsable absent donne 0 (→ 404 dans
 * le usecase) au lieu d'une erreur Prisma P2025 (→ 500).
 *
 * @returns {Promise<number>} nombre de responsables retirés (0 ou 1)
 */
async function removeRealmOwner(realmId, ownerId) {
  const { count } = await prisma.realm_owners.deleteMany({
    where: { realmId: parseInt(realmId), ownerId: String(ownerId) },
  });
  return count;
}

/**
 * @returns {Promise<number>} nombre de responsables modifiés (0 ou 1)
 */
async function updateRealmOwnerRole(realmId, ownerId, role) {
  const { count } = await prisma.realm_owners.updateMany({
    where: { realmId: parseInt(realmId), ownerId: String(ownerId) },
    data: { role },
  });
  return count;
}

async function getRealmOwner(realmId, ownerId) {
  return await prisma.realm_owners.findUnique({
    where: {
      realmId_ownerId: {
        realmId: parseInt(realmId),
        ownerId: String(ownerId),
      },
    },
  });
}

async function getRealmUsers(realmId) {
  return await prisma.$queryRaw`
    SELECT DISTINCT "userId", name as "characterName"
    FROM characters
    WHERE "realmId" = ${parseInt(realmId)} AND "userId" IS NOT NULL
    GROUP BY "userId", name
  `;
}

async function getRealmUserRole(realmId, userId) {
  if (!userId) return 'guest';

  const owner = await prisma.realm_owners.findUnique({
    where: {
      realmId_ownerId: {
        realmId: parseInt(realmId),
        ownerId: String(userId),
      },
    },
  });

  if (owner) return owner.role || 'admin';

  // Guest membership wins over implicit member-by-character: an invited guest
  // who claims a character must remain a guest, otherwise the invite-code flow
  // would silently promote them to full member.
  const guestMember = await prisma.realm_user_guests.findFirst({
    where: {
      realmId: parseInt(realmId),
      userId: String(userId),
    },
  });

  if (guestMember) return 'guest';

  const character = await prisma.characters.findFirst({
    where: {
      realmId: parseInt(realmId),
      userId: String(userId),
    },
  });

  if (character) return 'member';

  return null;
}

module.exports = {
  createRealm,
  listAllRealms,
  getRealmById,
  getRealmCharacters,
  addCharacterToRealm,
  findRealmByDetails,
  findRealmByOwnerId,
  findRealmsByOwnerId,
  findRealmByMemberUserId,
  isRealmOwner,
  addRealmOwner,
  getRealmOwners,
  removeRealmOwner,
  updateRealmOwnerRole,
  getRealmOwner,
  getRealmUsers,
  findRealmByNameAndRegion,
  getRealmUserRole,
  updateRealmSettings,
  hasCharacterWithUserId,
};
