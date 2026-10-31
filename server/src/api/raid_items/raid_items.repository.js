const { prisma } = require('../../data');

/** Maps wishlist slot names to WoW inventoryType integers */
const SLOT_INVENTORY_TYPES = {
  head: [1],
  neck: [2],
  shoulders: [3],
  back: [16],
  chest: [5, 20], // CHEST + ROBE
  wrists: [9],
  hands: [10],
  waist: [6],
  legs: [7],
  feet: [8],
  finger: [11],
  finger1: [11],
  finger2: [11],
  trinket: [12],
  trinket1: [12],
  trinket2: [12],
  main_hand: [13, 21], // WEAPON + WEAPONMAINHAND
  off_hand: [22, 14, 23], // WEAPONOFFHAND + SHIELD + HOLDABLE
  two_hand: [17], // TWOHWEAPON
};

/**
 * @param {string} extension
 * @param {string} season
 * @param {string} slot - Wishlist slot name (e.g. "legs", "trinket1")
 * @param {number|null} classId - Optional class filter
 * @returns {Promise<object[]>}
 */
async function findItemsBySlot(extension, season, slot, classId) {
  const inventoryTypes = SLOT_INVENTORY_TYPES[slot];
  if (!inventoryTypes) return [];

  const items = await prisma.items.findMany({
    where: {
      inventoryType: { in: inventoryTypes },
      boss_drop: {
        some: {
          boss: { extension, season },
        },
      },
    },
    include: {
      boss_drop: {
        where: {
          boss: { extension, season },
        },
        include: {
          boss: { select: { name: true } },
        },
        take: 1,
      },
    },
  });

  return items
    .filter((item) => {
      if (!classId || !item.allowableClasses) return true;
      try {
        const allowed = JSON.parse(item.allowableClasses);
        return allowed.includes(classId);
      } catch {
        return true;
      }
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      quality: item.quality,
      itemLevel: item.itemLevel,
      inventoryType: item.inventoryType,
      bossName: item.boss_drop[0]?.boss?.name ?? null,
    }));
}

module.exports = { findItemsBySlot };
