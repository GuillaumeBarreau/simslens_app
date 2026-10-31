const upgradeRepository = require('./item_upgrade.repository');
const tokenRepository = require('../item_tokens/item_tokens.repository');
const { prisma } = require('../../data');
const { wantedWishWhere } = require('../../shared/constants/wishlistPriority');
const { getPossibleSlots } = require('./item_upgrade.slots');
const bossUpgradesUsecase = require('./usecases/getCharacterBossUpgrades');
const batchUsecase = require('./usecases/selectBatchUpgrades');

/**
 * @param {Object} upgrade - The upgrade object to transform
 * @param {string} [wishlistSlot] - Optional slot information from wishlist entry
 */
async function transformUpgrade(upgrade, wishlistSlot = null) {
  let isWishlist = 0;
  if (upgrade.characterID && upgrade.itemID) {
    const isToken = await tokenRepository.isToken(upgrade.itemID);

    if (isToken) {
      const rewards = await tokenRepository.getTokenRewards(upgrade.itemID);
      const rewardItemIds = rewards.map((r) => r.rewardItemId);
      const wishlistEntry = await prisma.character_wishlists.findFirst({
        where: {
          characterId: upgrade.characterID,
          itemId: { in: rewardItemIds },
          ...wantedWishWhere(),
        },
      });

      isWishlist = wishlistEntry ? 1 : 0;
    } else {
      const wishlistEntry = await prisma.character_wishlists.findFirst({
        where: {
          characterId: upgrade.characterID,
          itemId: upgrade.itemID,
          ...wantedWishWhere(),
        },
      });
      isWishlist = wishlistEntry ? 1 : 0;
    }
  }

  let equippedItems = [];
  if (upgrade.characterID && upgrade.items?.inventoryType) {
    try {
      const possibleSlots = getPossibleSlots(upgrade.items.inventoryType);

      const gearSnapshot = await prisma.character_gear_snapshots.findFirst({
        where: { characterId: upgrade.characterID },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  icon: true,
                },
              },
            },
          },
        },
      });

      if (gearSnapshot) {
        for (const slot of possibleSlots) {
          const item = gearSnapshot.items.find((i) => i.slot === slot);
          if (item) {
            equippedItems.push({
              itemId: item.itemId,
              ilevel: item.ilevel,
              slot: item.slot,
              upgradeLevel: item.upgradeLevel,
              upgradeMax: item.upgradeMax,
              upgradeName: item.upgradeName,
              upgradeFullName: item.upgradeFullName,
              upgradeBonusId: item.upgradeBonusId,
              baseItemLevel: item.baseItemLevel,
              item: item.item,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch equipped item for character ${upgrade.characterID}:`, error);
    }
  }

  return {
    ...upgrade,
    name: upgrade.characters?.name,
    realm: upgrade.characters?.realm,
    region: upgrade.characters?.region,
    class: upgrade.characters?.class,
    specialization: upgrade.characters?.specialization,

    thumbnail: upgrade.characters?.thumbnail,
    characterId: upgrade.characterID,
    isWishlist,
    wishlistSlot,
    equippedItems,
    characters: undefined,
  };
}

/**
 * @param {number|null} [realmId]
 * @returns {Promise<Array>} Array of upgrade objects
 */
async function getAllUpgrades(realmId = null) {
  try {
    const upgrades = await upgradeRepository.listUpgrades(realmId);
    return upgrades;
  } catch (error) {
    console.error('Error fetching all upgrades:', error);
    throw error;
  }
}

/**
 * @param {number} itemId - The item ID
 * @param {string} difficulty - The difficulty level
 * @param {number|null} [realmId]
 * @returns {Promise<Array>} Array of upgrade objects
 */
async function getUpgradesByItem(itemId, difficulty, realmId = null) {
  if (!itemId || !difficulty) {
    throw new Error('Item ID and difficulty are required');
  }

  const upgrades = await upgradeRepository.listUpgradesByItemAndDifficulty(
    itemId,
    difficulty,
    realmId,
  );
  return await Promise.all(upgrades.map(transformUpgrade));
}

/**
 * @param {string} name - Character name
 * @param {number} itemId - The item ID
 * @param {string} difficulty - The difficulty level
 * @param {number|null} [realmId] - Royaume du personnage : sans lui, le nom
 *   désigne le premier personnage homonyme, toutes guildes confondues
 * @returns {Promise<Array>} Array of upgrade objects
 */
async function getUpgradesByNameItemDifficulty(name, itemId, difficulty, realmId = null) {
  if (!name || !itemId || !difficulty) {
    throw new Error('Name, item ID, and difficulty are required');
  }

  const upgrades = await upgradeRepository.listUpgradesByCharacterNameItemAndDifficulty(
    name,
    itemId,
    difficulty,
    realmId,
  );
  return upgrades;
}

/**
 * Une seule spé par personnage (SIMS-234) : la sélection vit dans le usecase
 * `usecases/selectBatchUpgrades` ; chaque ligne porte la spé retenue dans
 * `simSpecialization`.
 *
 * @param {Array<number>} itemIds - Array of item IDs
 * @param {string} difficulty - The difficulty level
 * @param {number|null} [realmId]
 * @returns {Promise<Object>} Object with itemId as key and array of upgrades as value
 */
async function getUpgradesBatch(itemIds, difficulty, realmId = null) {
  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error('itemIds array is required');
  }
  if (!difficulty) {
    throw new Error('difficulty is required');
  }

  try {
    const selected = await batchUsecase.selectUpgradesBatch({ itemIds, difficulty, realmId });
    const result = {};
    for (const [itemId, rows] of selected) {
      result[itemId] = await Promise.all(rows.map((u) => transformUpgrade(u)));
    }
    return result;
  } catch (error) {
    console.error('Error in getUpgradesBatch:', error);
    throw error;
  }
}

/**
 * Une seule spé par personnage (SIMS-234) : seuls les vœux de la spé retenue
 * sont gardés (un par objet), avec le gain de la sim de cette même spé. La
 * sélection vit dans le usecase `usecases/selectBatchUpgrades`.
 *
 * @param {Array<number>} itemIds - Array of item IDs
 * @param {string} difficulty - The difficulty level
 * @param {number|null} [realmId]
 * @returns {Promise<Object>} Object with itemId as key and array of upgrade objects
 */
async function getWishlistBatch(itemIds, difficulty, realmId = null) {
  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error('itemIds array is required');
  }
  if (!difficulty) {
    throw new Error('difficulty is required');
  }

  try {
    const selected = await batchUsecase.selectWishlistBatch({ itemIds, difficulty, realmId });
    const result = {};
    for (const [itemId, rows] of selected) {
      result[itemId] = await Promise.all(
        rows.map((upgrade) => transformUpgrade(upgrade, upgrade.wishlistSlot)),
      );
    }
    return result;
  } catch (error) {
    console.error('Error in getWishlistBatch:', error);
    throw error;
  }
}

/**
 * Vue par boss du butin d'un personnage, pour une seule spé (SIMS-211).
 *
 * La logique vit dans le usecase `usecases/getCharacterBossUpgrades` ; cette
 * fonction reste pour les appelants historiques (composition automatique,
 * remplaçants du roster), qui n'ont besoin que des boss : la spé retenue est
 * celle demandée, sinon la spé principale du personnage.
 *
 * @param {{ characterId: number, difficulty: string, extension: string, season: string, specializationId?: number | null }} query
 */
async function getCharacterBossUpgrades(query) {
  const { characterId, difficulty, extension, season } = query;
  if (!characterId || !difficulty || !extension || !season) {
    throw new Error('characterId, difficulty, extension and season are required');
  }
  const { bosses } = await bossUpgradesUsecase.getCharacterBossUpgrades(query);
  return bosses;
}

module.exports = {
  getAllUpgrades,
  getUpgradesByItem,
  getUpgradesByNameItemDifficulty,
  getUpgradesBatch,
  getWishlistBatch,
  getCharacterBossUpgrades,
};
