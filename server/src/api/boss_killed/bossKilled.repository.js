const { prisma } = require('../../data');

async function listBossKillsByInstanceId(instanceId) {
  return await prisma.instance_bosses
    .findMany({
      where: { instanceId: parseInt(instanceId, 10) },
      include: {
        boss: {
          select: {
            name: true,
            order: true,
          },
        },
      },
      orderBy: {
        boss: {
          order: 'asc',
        },
      },
    })
    .then((kills) =>
      kills.map((k) => ({
        ...k,
        bossName: k.boss?.name,
        boss: undefined,
      })),
    );
}

async function createInstanceBossKill(instanceId, bossId) {
  const kill = await prisma.instance_bosses.create({
    data: {
      instanceId: parseInt(instanceId, 10),
      bossId: parseInt(bossId, 10),
      killed: 0,
    },
  });
  return kill.id;
}

async function bulkCreateInstanceBossKills(instanceId, bossIds) {
  if (!Array.isArray(bossIds) || bossIds.length === 0) return [];

  const data = bossIds.map((bossId) => ({
    instanceId: parseInt(instanceId, 10),
    bossId: parseInt(bossId, 10),
  }));

  const result = await prisma.instance_bosses.createMany({ data });
  return { changes: result.count };
}

async function updateInstanceBossKillState(id, killed, killedAt = null) {
  await prisma.instance_bosses.update({
    where: { id: parseInt(id, 10) },
    data: {
      killed: killed ? 1 : 0,
      killedAt,
    },
  });
  return { changes: 1 };
}

module.exports = {
  listBossKillsByInstanceId,
  createInstanceBossKill,
  bulkCreateInstanceBossKills,
  updateInstanceBossKillState,
  getByInstanceId: listBossKillsByInstanceId,
  insert: createInstanceBossKill,
  bulkInsert: bulkCreateInstanceBossKills,
  updateKillState: updateInstanceBossKillState,
};
