const { prisma } = require('../../data');
const { normalizeClass } = require('../../shared/utils/normalizeClass');

async function listUpgrades(realmId = null) {
  return await prisma.upgrades.findMany({
    where: realmId ? { characters: { realmId: parseInt(realmId) } } : {},
    include: {
      items: {
        select: {
          id: true,
          name: true,
          icon: true,
          inventoryType: true,
        },
      },
      characters: {
        select: {
          id: true,
          name: true,
          class: true,
          specialization: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      timeStamp: 'desc',
    },
  });
}

async function listUpgradesByItemAndDifficulty(itemId, difficulty, realmId = null) {
  return await prisma.upgrades.findMany({
    where: {
      itemID: parseInt(itemId),
      difficulty: difficulty,
      ...(realmId ? { characters: { realmId: parseInt(realmId) } } : {}),
    },
    include: {
      characters: {
        select: {
          id: true,
          name: true,
          class: true,
          specialization: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          thumbnail: true,
          realm: true,
          region: true,
        },
      },
      items: {
        select: {
          id: true,
          name: true,
          icon: true,
          inventoryType: true, // Added for slot mapping
        },
      },
    },
    orderBy: {
      dps: 'desc',
    },
  });
}

async function listUpgradesByCharacterNameItemAndDifficulty(
  characterName,
  itemId,
  difficulty,
  realmId = null,
) {
  const character = await prisma.characters.findFirst({
    where: {
      name: characterName,
      ...(realmId ? { realmId: parseInt(realmId) } : {}),
    },
  });

  if (!character) {
    return [];
  }

  return await prisma.upgrades.findMany({
    where: {
      characterID: character.id,
      itemID: parseInt(itemId, 10),
      difficulty: difficulty,
    },
    include: {
      items: {
        select: {
          id: true,
          name: true,
          icon: true,
          inventoryType: true, // Added for slot mapping
        },
      },
    },
    orderBy: {
      dps: 'desc',
    },
  });
}

async function getById(id) {
  return await prisma.upgrades.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      items: true,
      characters: true,
    },
  });
}

async function create(data) {
  return await prisma.upgrades.create({
    data: {
      characterID: data.characterID,
      itemID: data.itemID,
      reportID: data.reportID,
      dps: data.dps,
      baseDps: data.baseDps,
      spec: data.spec,
      difficulty: data.difficulty,
      timeStamp: new Date(data.timeStamp * 1000),
      talents: data.talents || '',
      buildDate: data.buildDate || '',
    },
  });
}

async function update(id, data) {
  return await prisma.upgrades.update({
    where: {
      id: parseInt(id),
    },
    data: {
      dps: data.dps,
      baseDps: data.baseDps,
      timeStamp: data.timeStamp ? new Date(data.timeStamp * 1000) : undefined,
      talents: data.talents,
      buildDate: data.buildDate,
    },
  });
}

async function deleteUpgrade(id) {
  return await prisma.upgrades.delete({
    where: {
      id: parseInt(id),
    },
  });
}

/**
 * Supprime les upgrades des personnages d'un seul royaume.
 * Ne jamais appeler sans realmId : la suppression doit rester cloisonnée.
 *
 * @param {number} realmId
 * @returns {Promise<number>} nombre de lignes supprimées
 */
async function deleteUpgradesByRealm(realmId) {
  const id = parseInt(realmId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('deleteUpgradesByRealm: realmId requis');
  }
  const { count } = await prisma.upgrades.deleteMany({
    where: { characters: { realmId: id } },
  });
  return count;
}

/**
 * Fetch boss-grouped upgrade data for a single character, scoped to an
 * extension/season and difficulty.
 *
 * Returns the raw bits the usecase needs to assemble the response:
 *   - the character (class, main specialization) and its class specializations
 *   - bosses + their loot (boss_drop -> items)
 *   - every sim of the character for that difficulty and loot, all specs
 *     (the usecase picks the spec: SIMS-211)
 *   - the character's wishlist itemIds (the given spec, or any spec)
 */
async function getCharacterBossUpgradesData({
  characterId,
  difficulty,
  extension,
  season,
  specializationId,
}) {
  const cid = parseInt(characterId, 10);

  const character = await prisma.characters.findUnique({
    where: { id: cid },
    select: { id: true, class: true, specializationId: true },
  });

  const characterClass = character?.class
    ? await prisma.classes.findUnique({
        where: { name: normalizeClass(character.class) },
        select: {
          name: true,
          specializations: {
            select: { id: true, name: true, icon: true, role: true },
            orderBy: { id: 'asc' },
          },
        },
      })
    : null;

  const bosses = await prisma.bosses.findMany({
    where: {
      extension,
      season,
      NOT: { name: 'Bind on Equip' },
    },
    include: {
      loots: {
        select: {
          item: {
            select: {
              id: true,
              name: true,
              icon: true,
              quality: true,
              itemLevel: true,
              inventoryType: true,
            },
          },
        },
      },
    },
    orderBy: [{ order: 'asc' }],
  });

  const lootItemIds = [...new Set(bosses.flatMap((b) => b.loots.map((l) => l.item.id)))];

  const tokenRewards = lootItemIds.length
    ? await prisma.item_tokens.findMany({
        where: {
          tokenItemId: { in: lootItemIds },
          ...(character?.class ? { class: character.class } : {}),
        },
        select: {
          tokenItemId: true,
          rewardItemId: true,
          slot: true,
          item: {
            select: {
              id: true,
              name: true,
              icon: true,
              quality: true,
              itemLevel: true,
              inventoryType: true,
            },
          },
        },
      })
    : [];

  const rewardItemIds = tokenRewards.map((t) => t.rewardItemId);
  const allLookupItemIds = [...new Set([...lootItemIds, ...rewardItemIds])];

  const upgrades = allLookupItemIds.length
    ? await prisma.upgrades.findMany({
        where: {
          characterID: cid,
          difficulty,
          itemID: { in: allLookupItemIds },
        },
        orderBy: [{ timeStamp: 'desc' }],
      })
    : [];

  const wishlistEntries = await prisma.character_wishlists.findMany({
    where: {
      characterId: cid,
      ...(specializationId ? { specializationId: parseInt(specializationId, 10) } : {}),
      itemId: { not: null },
    },
    select: { itemId: true, priority: true },
  });

  return { character, characterClass, bosses, upgrades, wishlistEntries, tokenRewards };
}

/**
 * Vœux de wishlist portant sur ces objets, toutes spés et priorités
 * confondues ; limités aux personnages du royaume s'il est donné.
 *
 * @param {number[]} itemIds
 * @param {number|null} [realmId]
 */
async function listWishlistEntriesForItems(itemIds, realmId = null) {
  return await prisma.character_wishlists.findMany({
    where: {
      itemId: { in: itemIds },
      ...(realmId ? { character: { realmId: parseInt(realmId, 10) } } : {}),
    },
    include: {
      character: true,
      item: {
        select: {
          id: true,
          name: true,
          icon: true,
          inventoryType: true,
        },
      },
    },
  });
}

/**
 * Ce qu'il faut pour choisir la spé retenue de plusieurs personnages
 * (SIMS-234) : chaque personnage avec sa spé principale et sa classe (spés
 * comprises), et un résumé de ses sims à la difficulté donnée — une ligne par
 * (personnage, libellé, spé rattachée) avec la date de la plus récente.
 *
 * @param {number[]} characterIds
 * @param {string} difficulty
 */
async function getSimSpecializationContext(characterIds, difficulty) {
  const ids = [...new Set(characterIds.map((id) => parseInt(id, 10)))].filter((id) =>
    Number.isInteger(id),
  );
  if (ids.length === 0) return { characters: [], sims: [] };

  const characters = await prisma.characters.findMany({
    where: { id: { in: ids } },
    select: { id: true, class: true, specializationId: true },
  });

  const classNames = [
    ...new Set(characters.filter((c) => c.class).map((c) => normalizeClass(c.class))),
  ];
  const classes = classNames.length
    ? await prisma.classes.findMany({
        where: { name: { in: classNames } },
        select: {
          name: true,
          specializations: {
            select: { id: true, name: true, icon: true, role: true },
            orderBy: { id: 'asc' },
          },
        },
      })
    : [];
  const classByName = new Map(classes.map((c) => [c.name, c]));

  const sims = await prisma.upgrades.groupBy({
    by: ['characterID', 'spec', 'specializationId'],
    where: { characterID: { in: ids }, difficulty },
    _max: { timeStamp: true },
  });

  return {
    characters: characters.map((c) => ({
      id: c.id,
      specializationId: c.specializationId,
      characterClass: c.class ? (classByName.get(normalizeClass(c.class)) ?? null) : null,
    })),
    sims: sims.map((s) => ({
      characterID: s.characterID,
      spec: s.spec,
      specializationId: s.specializationId,
      timeStamp: s._max?.timeStamp ?? null,
    })),
  };
}

module.exports = {
  listUpgrades,
  listWishlistEntriesForItems,
  getSimSpecializationContext,
  listUpgradesByItemAndDifficulty,
  listUpgradesByCharacterNameItemAndDifficulty,
  getById,
  create,
  update,
  delete: deleteUpgrade,
  getCharacterBossUpgradesData,
  deleteUpgradesByRealm,
};
