const path = require('path');
const { getCharacterEquipment } = require(path.join(__dirname, '../integrations/blizzard/api'));

const SLOT_MAPPING = {
  HEAD: 'head',
  NECK: 'neck',
  SHOULDER: 'shoulders',
  CHEST: 'chest',
  WAIST: 'waist',
  LEGS: 'legs',
  FEET: 'feet',
  WRIST: 'wrists',
  HANDS: 'hands',
  FINGER_1: 'finger1',
  FINGER_2: 'finger2',
  TRINKET_1: 'trinket1',
  TRINKET_2: 'trinket2',
  BACK: 'back',
  MAIN_HAND: 'main_hand',
  OFF_HAND: 'off_hand',
};

/**
 * @param {Object} prisma - Instance Prisma
 * @param {number} characterId - ID du personnage
 * @returns {Promise<Object>} Résultat de la synchronisation
 */
async function syncUpgradesFromBlizzard(prisma, characterId) {
  try {
    const character = await prisma.characters.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    console.log(`[Blizzard Sync] Syncing upgrades for ${character.name} (${character.realm})`);

    const equipment = await getCharacterEquipment(
      character.region || 'eu',
      character.realm,
      character.name,
    );

    if (!equipment || !equipment.equipped_items) {
      console.warn(`[Blizzard Sync] No equipment data found for ${character.name}`);
      return { updated: 0, skipped: 0, error: 'No equipment data' };
    }

    const latestSnapshot = await prisma.character_gear_snapshots.findFirst({
      where: { characterId: characterId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    if (!latestSnapshot) {
      console.warn(`[Blizzard Sync] No gear snapshot found for ${character.name}`);
      return { updated: 0, skipped: 0, error: 'No gear snapshot' };
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const blizzardItem of equipment.equipped_items) {
      const dbSlot = SLOT_MAPPING[blizzardItem.slot.type];
      if (!dbSlot) {
        skippedCount++;
        continue;
      }

      const snapshotItem = latestSnapshot.items.find((item) => item.slot === dbSlot);
      if (!snapshotItem) {
        skippedCount++;
        continue;
      }

      if (snapshotItem.itemId !== blizzardItem.item.id) {
        skippedCount++;
        continue;
      }

      const { getUpgradeFromBonusIds } = require('./bonus.service');
      const upgradeInfo = await getUpgradeFromBonusIds(prisma, blizzardItem.bonus_list);

      let upgradeBonusId = null;
      if (upgradeInfo) {
        upgradeBonusId = upgradeInfo.bonusId;
      }

      const updateData = {
        ilevel: blizzardItem.level.value,
      };

      if (upgradeInfo) {
        updateData.upgradeLevel = upgradeInfo.level;
        updateData.upgradeMax = upgradeInfo.max;
        updateData.upgradeName = upgradeInfo.name;
        updateData.upgradeFullName = upgradeInfo.fullName;
        updateData.upgradeBonusId = upgradeBonusId;
      }

      await prisma.gear_snapshot_items.update({
        where: { id: snapshotItem.id },
        data: updateData,
      });

      updatedCount++;
    }

    console.log(`[Blizzard Sync] Updated ${updatedCount} items for ${character.name}`);

    return { updated: updatedCount, skipped: skippedCount };
  } catch (error) {
    console.error('[Blizzard Sync] Error:', error.message);
    throw error;
  }
}

module.exports = {
  syncUpgradesFromBlizzard,
  SLOT_MAPPING,
};
