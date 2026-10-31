const { prisma } = require('../../data');

async function createDeviceCode({ deviceCode, userCode, deviceName, expiresAt }) {
  return prisma.device_codes.create({
    data: { deviceCode, userCode, deviceName: deviceName || null, expiresAt },
  });
}

async function findByDeviceCode(deviceCode) {
  return prisma.device_codes.findUnique({ where: { deviceCode } });
}

async function findByUserCode(userCode) {
  return prisma.device_codes.findUnique({ where: { userCode } });
}

async function approveDeviceCode(id, { userId, scopes }) {
  return prisma.device_codes.update({
    where: { id },
    data: { userId: String(userId), scopes, approvedAt: new Date() },
  });
}

async function markDeviceCodeConsumed(id) {
  return prisma.device_codes.update({
    where: { id },
    data: { consumedAt: new Date() },
  });
}

async function createToken({ userId, name, tokenHash, scopes, expiresAt }) {
  return prisma.api_tokens.create({
    data: {
      userId: String(userId),
      name,
      tokenHash,
      scopes: scopes || [],
      expiresAt: expiresAt || null,
    },
  });
}

async function listTokensByUser(userId) {
  return prisma.api_tokens.findMany({
    where: { userId: String(userId), revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });
}

async function revokeToken(id, userId) {
  return prisma.api_tokens.updateMany({
    where: { id: parseInt(id), userId: String(userId), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  createDeviceCode,
  findByDeviceCode,
  findByUserCode,
  approveDeviceCode,
  markDeviceCodeConsumed,
  createToken,
  listTokensByUser,
  revokeToken,
};
