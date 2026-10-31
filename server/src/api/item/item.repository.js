const { prisma } = require('../../data');

/**
 * @param {string} qualityType - Quality type from Blizzard API
 * @returns {number}
 */
function mapQualityToInt(qualityType) {
  const qualityMap = {
    POOR: 0,
    COMMON: 1,
    UNCOMMON: 2,
    RARE: 3,
    EPIC: 4,
    LEGENDARY: 5,
    ARTIFACT: 6,
    HEIRLOOM: 7,
  };
  return qualityMap[qualityType] || 1;
}

/**
 * @param {string} inventoryType - Inventory type from Blizzard API
 * @returns {number}
 */
function mapInventoryTypeToInt(inventoryType) {
  const inventoryMap = {
    NON_EQUIP: 0,
    HEAD: 1,
    NECK: 2,
    SHOULDER: 3,
    SHIRT: 4,
    CHEST: 5,
    WAIST: 6,
    LEGS: 7,
    FEET: 8,
    WRIST: 9,
    HAND: 10,
    FINGER: 11,
    TRINKET: 12,
    WEAPON: 13,
    SHIELD: 14,
    RANGED: 15,
    CLOAK: 16,
    TWOHWEAPON: 17,
    BAG: 18,
    TABARD: 19,
    ROBE: 20,
    WEAPONMAINHAND: 21,
    WEAPONOFFHAND: 22,
    HOLDABLE: 23,
    AMMO: 24,
    THROWN: 25,
    RANGEDRIGHT: 26,
  };
  return inventoryMap[inventoryType] || 0;
}

/**
 * @param {number} itemId - Blizzard item ID
 * @returns {Promise<object|null>}
 */
async function findById(itemId) {
  return await prisma.wow_items.findUnique({
    where: {
      id: parseInt(itemId),
    },
  });
}

/**
 * Create a new WoW item cache entry
 * @param {object} itemData - Item data from Blizzard API
 * @returns {Promise<object>}
 */
async function create(itemData) {
  return await prisma.wow_items.create({
    data: {
      id: itemData.id,
      name: itemData.name,
      quality: mapQualityToInt(itemData.quality?.type),
      itemLevel: itemData.level || 0,
      inventoryType: mapInventoryTypeToInt(itemData.inventory_type?.type),
      itemClass: itemData.item_class?.id || 0,
      itemSubClass: itemData.item_subclass?.id || 0,
      icon: itemData.media?.assets?.[0]?.value || itemData.icon || '',
      description: itemData.preview_item?.description || null,
      stats: itemData.preview_item?.stats || null,
      rawData: itemData,
    },
  });
}

/**
 * Update an existing WoW item cache entry
 * @param {number} itemId - Blizzard item ID
 * @param {object} itemData - Updated item data from Blizzard API
 * @returns {Promise<object>}
 */
async function update(itemId, itemData) {
  return await prisma.wow_items.update({
    where: {
      id: parseInt(itemId),
    },
    data: {
      name: itemData.name,
      quality: mapQualityToInt(itemData.quality?.type),
      itemLevel: itemData.level || 0,
      inventoryType: mapInventoryTypeToInt(itemData.inventory_type?.type),
      itemClass: itemData.item_class?.id || 0,
      itemSubClass: itemData.item_subclass?.id || 0,
      icon: itemData.media?.assets?.[0]?.value || itemData.icon || '',
      description: itemData.preview_item?.description || null,
      stats: itemData.preview_item?.stats || null,
      rawData: itemData,
      updatedAt: new Date(),
    },
  });
}

module.exports = {
  findById,
  create,
  update,
};
