const { prisma } = require('../../data');

async function listInstanceLootsByInstanceId(instanceId, filters = {}) {
  const where = {
    instanceId: parseInt(instanceId),
  };

  if (filters.bossId !== undefined) {
    where.bossId = parseInt(filters.bossId);
  }

  if (filters.assignedTo !== undefined) {
    where.assignedTo = filters.assignedTo === null ? null : parseInt(filters.assignedTo);
  }

  return await prisma.instance_loots
    .findMany({
      where,
      include: {
        boss: {
          select: {
            name: true,
            icon: true,
          },
        },
        item: {
          select: {
            name: true,
            icon: true,
            quality: true,
            itemLevel: true,
          },
        },
        characters: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    .then((loots) =>
      loots.map((l) => ({
        id: l.id,
        instanceId: l.instanceId,
        bossId: l.bossId,
        itemId: l.itemId,
        assignedTo: l.assignedTo,
        assignedBy: l.assignedBy,
        assignedAt: l.assignedAt,
        createdAt: l.createdAt,
        boss_name: l.boss?.name,
        boss_icon: l.boss?.icon,
        item_name: l.item?.name,
        item_icon: l.item?.icon,
        quality: l.item?.quality,
        itemLevel: l.item?.itemLevel,
        assigned_to_name: l.characters?.name || '',
      })),
    );
}

async function findInstanceLootById(id) {
  const loot = await prisma.instance_loots.findUnique({
    where: { id: parseInt(id) },
    include: {
      boss: {
        select: {
          name: true,
          icon: true,
        },
      },
      item: {
        select: {
          name: true,
          icon: true,
          quality: true,
          itemLevel: true,
        },
      },
      characters: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!loot) return null;

  return {
    id: loot.id,
    instanceId: loot.instanceId,
    bossId: loot.bossId,
    itemId: loot.itemId,
    assignedTo: loot.assignedTo,
    assignedBy: loot.assignedBy,
    assignedAt: loot.assignedAt,
    createdAt: loot.createdAt,
    boss_name: loot.boss?.name,
    boss_icon: loot.boss?.icon,
    item_name: loot.item?.name,
    item_icon: loot.item?.icon,
    quality: loot.item?.quality,
    itemLevel: loot.item?.itemLevel,
    assigned_to_name: loot.characters?.name || '',
  };
}

async function createInstanceLoot(fields) {
  const data = {
    instanceId: parseInt(fields.instanceId),
    bossId: parseInt(fields.bossId),
    itemId: parseInt(fields.itemId),
    assignedTo: fields.assignedTo ? parseInt(fields.assignedTo) : null,
    assignedBy: fields.assignedBy ? parseInt(fields.assignedBy) : null,
    assignedAt: fields.assignedAt || null,
  };

  const loot = await prisma.instance_loots.create({ data });
  return findInstanceLootById(loot.id);
}

async function updateInstanceLootById(id, fields) {
  await prisma.instance_loots.update({
    where: { id: parseInt(id) },
    data: fields,
  });
  return { changes: 1 };
}

async function deleteInstanceLootById(id) {
  await prisma.instance_loots.delete({
    where: { id: parseInt(id) },
  });
  return { changes: 1 };
}

module.exports = {
  listInstanceLootsByInstanceId,
  findInstanceLootById,
  createInstanceLoot,
  updateInstanceLootById,
  deleteInstanceLootById,
  getByInstanceId: listInstanceLootsByInstanceId,
  getById: findInstanceLootById,
  insert: createInstanceLoot,
  updateById: updateInstanceLootById,
  removeById: deleteInstanceLootById,
};
