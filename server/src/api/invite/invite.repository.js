const crypto = require('node:crypto');
const { prisma } = require('../../data');

async function createInviteCode(realmId, createdBy, { expiresAt = null, maxUses = 1 } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.realm_invite_codes.create({
        data: {
          realmId: parseInt(realmId),
          code: generateCode(),
          createdBy: String(createdBy),
          expiresAt,
          maxUses,
        },
      });
    } catch (err) {
      if (err.code === 'P2002' && attempt < 2) continue;
      throw err;
    }
  }
}

async function getInviteCodesByRealm(realmId) {
  return prisma.realm_invite_codes.findMany({
    where: { realmId: parseInt(realmId) },
    orderBy: { createdAt: 'desc' },
  });
}

async function getInviteCodeByCode(code) {
  return prisma.realm_invite_codes.findUnique({
    where: { code },
    include: { realm: true },
  });
}

async function deleteInviteCode(id) {
  return prisma.realm_invite_codes.delete({ where: { id: parseInt(id) } });
}

async function incrementUseCount(id) {
  return prisma.realm_invite_codes.update({
    where: { id: parseInt(id) },
    data: { useCount: { increment: 1 } },
  });
}

/**
 * Atomically consume an invite code and add the user as a guest.
 * Uses a transaction + conditional `updateMany` so concurrent joins
 * cannot exceed `maxUses`.
 *
 * Returns one of:
 *   { status: 'invalid_code' }
 *   { status: 'expired' }
 *   { status: 'max_uses_reached' }
 *   { status: 'already_owner', realm }
 *   { status: 'already_member', realm }
 *   { status: 'already_guest', realm }
 *   { status: 'joined', realm }
 */
async function consumeInviteAndAddGuest(code, userId) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.realm_invite_codes.findUnique({
      where: { code },
      include: { realm: true },
    });
    if (!record) return { status: 'invalid_code' };

    if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
      return { status: 'expired' };
    }

    // Block users who already belong to the realm via owner / character paths,
    // otherwise the new guest row would silently demote them in getRealmUserRole.
    const owner = await tx.realm_owners.findUnique({
      where: { realmId_ownerId: { realmId: record.realmId, ownerId: String(userId) } },
    });
    if (owner) return { status: 'already_owner', realm: record.realm };

    const character = await tx.characters.findFirst({
      where: { realmId: record.realmId, userId: String(userId) },
      select: { id: true },
    });
    if (character) return { status: 'already_member', realm: record.realm };

    const existingGuest = await tx.realm_user_guests.findFirst({
      where: { realmId: record.realmId, userId: String(userId) },
    });
    if (existingGuest) return { status: 'already_guest', realm: record.realm };

    // Atomic decrement of remaining uses: succeeds only if useCount < maxUses.
    const inc = await tx.realm_invite_codes.updateMany({
      where: { id: record.id, useCount: { lt: record.maxUses } },
      data: { useCount: { increment: 1 } },
    });
    if (inc.count === 0) return { status: 'max_uses_reached' };

    await tx.realm_user_guests.create({
      data: {
        realmId: record.realmId,
        userId: String(userId),
        inviteCodeId: record.id,
      },
    });

    return { status: 'joined', realm: record.realm };
  });
}

async function addGuestMember(realmId, userId, inviteCodeId) {
  return prisma.realm_user_guests.create({
    data: {
      realmId: parseInt(realmId),
      userId: String(userId),
      inviteCodeId: inviteCodeId ? parseInt(inviteCodeId) : null,
    },
    include: { realm: true },
  });
}

async function getGuestMember(realmId, userId) {
  return prisma.realm_user_guests.findFirst({
    where: {
      realmId: parseInt(realmId),
      userId: String(userId),
    },
  });
}

async function getGuestMembersByRealm(realmId) {
  return prisma.realm_user_guests.findMany({
    where: { realmId: parseInt(realmId) },
    include: { inviteCode: true },
    orderBy: { joinedAt: 'desc' },
  });
}

/**
 * Remove a guest membership AND detach any characters the guest had claimed
 * on this realm. Without the character detach, `getRealmUserRole` would fall
 * through to the character-based member check and silently re-grant access.
 */
async function removeGuestMember(id) {
  return prisma.$transaction(async (tx) => {
    const guest = await tx.realm_user_guests.findUnique({ where: { id: parseInt(id) } });
    if (!guest) return null;

    await tx.characters.updateMany({
      where: { realmId: guest.realmId, userId: guest.userId },
      data: { userId: null },
    });

    return tx.realm_user_guests.delete({ where: { id: guest.id } });
  });
}

async function getCharactersByUserIds(userIds, realmId) {
  if (userIds.length === 0) return [];
  return prisma.characters.findMany({
    where: { userId: { in: userIds.map(String) }, realmId },
    select: {
      userId: true,
      name: true,
      class: true,
      realm: true,
      realmId: true,
      lastModified: true,
    },
  });
}

async function getGuestMembershipsByUserId(userId) {
  return prisma.realm_user_guests.findMany({
    where: { userId: String(userId) },
    include: { realm: true },
  });
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[crypto.randomInt(0, chars.length)];
  }
  return result;
}

module.exports = {
  createInviteCode,
  getInviteCodesByRealm,
  getInviteCodeByCode,
  deleteInviteCode,
  incrementUseCount,
  consumeInviteAndAddGuest,
  addGuestMember,
  getGuestMember,
  getGuestMembersByRealm,
  removeGuestMember,
  getCharactersByUserIds,
  getGuestMembershipsByUserId,
};
