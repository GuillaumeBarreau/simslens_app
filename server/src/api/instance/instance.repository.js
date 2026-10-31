const { prisma } = require('../../data');

async function listInstances(realmId = null) {
  return await prisma.instances
    .findMany({
      where: realmId ? { realmId: parseInt(realmId) } : {},
      include: {
        raid_difficulty: {
          select: {
            difficulty: true,
            image_button_small: true,
            image_button: true,
            image_background: true,
            raid: {
              select: {
                name: true,
                extension: true,
                season: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })
    .then((instances) =>
      instances.map((i) => ({
        ...i,
        difficulty: i.raid_difficulty?.difficulty,
        image_button_small: i.raid_difficulty?.image_button_small,
        rd_image_button: i.raid_difficulty?.image_button,
        rd_image_background: i.raid_difficulty?.image_background,
        raid_name: i.raid_difficulty?.raid?.name,
        extension: i.raid_difficulty?.raid?.extension ?? null,
        season: i.raid_difficulty?.raid?.season ?? null,
        raid_difficulty: undefined,
      })),
    );
}

async function findInstanceById(id) {
  const instance = await prisma.instances.findUnique({
    where: { id: parseInt(id) },
    include: {
      raid_difficulty: {
        select: {
          difficulty: true,
          image_button_small: true,
          image_button: true,
          image_background: true,
          raid: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!instance) return null;

  return {
    ...instance,
    difficulty: instance.raid_difficulty?.difficulty,
    image_button_small: instance.raid_difficulty?.image_button_small,
    rd_image_button: instance.raid_difficulty?.image_button,
    rd_image_background: instance.raid_difficulty?.image_background,
    raid_name: instance.raid_difficulty?.raid?.name,
    raid_difficulty: undefined,
  };
}

async function ensureRealmId(providedRealmId) {
  if (providedRealmId !== undefined && providedRealmId !== null) {
    return providedRealmId;
  }

  const existingRealm = await prisma.realms.findFirst();
  if (existingRealm?.id) {
    return existingRealm.id;
  }

  const realm = await prisma.realms.create({
    data: {
      server: 'local',
      region: 'EU',
      guildName: 'local-guild',
      createdBy: 0,
    },
  });

  return realm.id;
}

async function createInstance(fields) {
  const realmId = await ensureRealmId(fields.realmId);

  const data = {
    name: fields.name,
    date: fields.date,
    raidDifficultyId: fields.raidDifficultyId,
    realmId,
    createdBy: fields.createdBy ?? 0,
    status: fields.status ?? 'ONGOING',
    bossesKilled: fields.bossesKilled ?? 0,
    totalBosses: fields.totalBosses,
  };

  const instance = await prisma.instances.create({ data });
  return instance.id;
}

async function updateInstanceById(id, fields) {
  const result = await prisma.instances.update({
    where: { id: parseInt(id) },
    data: fields,
  });
  return { changes: 1, lastID: result.id };
}

async function deleteInstanceById(id) {
  await prisma.instances.delete({
    where: { id: parseInt(id) },
  });
  return { changes: 1 };
}

module.exports = {
  listInstances,
  findInstanceById,
  createInstance,
  updateInstanceById,
  deleteInstanceById,
  getAll: listInstances,
  getById: findInstanceById,
  insert: createInstance,
  updateById: updateInstanceById,
  removeById: deleteInstanceById,
};
