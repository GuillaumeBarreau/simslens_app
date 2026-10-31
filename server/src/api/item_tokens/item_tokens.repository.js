const { prisma } = require('../../data');

async function isToken(itemId) {
  const token = await prisma.item_tokens.findFirst({
    where: {
      tokenItemId: parseInt(itemId),
    },
  });
  return !!token;
}

async function getTokenRewards(tokenItemId) {
  return await prisma.item_tokens.findMany({
    where: {
      tokenItemId: parseInt(tokenItemId),
    },
    select: {
      tokenItemId: true,
      rewardItemId: true,
    },
  });
}

async function getAllTokens() {
  const tokens = await prisma.item_tokens.findMany({
    distinct: ['tokenItemId'],
    select: {
      tokenItemId: true,
    },
  });
  return tokens;
}

async function getById(id) {
  return await prisma.item_tokens.findFirst({
    where: {
      tokenItemId: parseInt(id),
    },
  });
}

async function create(data) {
  return await prisma.item_tokens.create({
    data: {
      tokenItemId: data.tokenItemId,
      rewardItemId: data.rewardItemId,
    },
  });
}

async function deleteToken(tokenItemId, rewardItemId) {
  return await prisma.item_tokens.deleteMany({
    where: {
      tokenItemId: parseInt(tokenItemId),
      rewardItemId: parseInt(rewardItemId),
    },
  });
}

module.exports = {
  isToken,
  getTokenRewards,
  getAllTokens,
  getById,
  create,
  delete: deleteToken,
};
