const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');
const { byCharacters } = require('./seedScope');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const {
  SLOT_INVENTORY_TYPES,
  ID_TO_CLASS,
  CLASS_RESTRICTIONS,
  CLASS_SLOT_OVERRIDES,
} = require('../../shared/constants/wow');

const CLASS_TO_ID = Object.fromEntries(
  Object.entries(ID_TO_CLASS).map(([id, name]) => [name, parseInt(id)]),
);

const SLOTS = [
  'head',
  'neck',
  'shoulders',
  'back',
  'chest',
  'wrists',
  'hands',
  'waist',
  'legs',
  'feet',
  'finger1',
  'finger2',
  'trinket1',
  'trinket2',
  'main_hand',
  'off_hand',
];

function getRandomPriority() {
  const priorities = [0, 0, 0, 1, 1, 2, 3];
  return priorities[Math.floor(Math.random() * priorities.length)];
}

/**
 * Includes both direct drops and items created from tokens
 */
async function getItemsForSlot(slot, classId, className) {
  let inventoryTypes = SLOT_INVENTORY_TYPES[slot] || [];

  if (classId && CLASS_SLOT_OVERRIDES[classId] && CLASS_SLOT_OVERRIDES[classId][slot]) {
    const overrides = CLASS_SLOT_OVERRIDES[classId][slot];
    inventoryTypes = [...new Set([...inventoryTypes, ...overrides])];
  }

  if (inventoryTypes.length === 0) return [];

  try {
    const bossesInRaid = await prisma.bosses.findMany({
      where: { extension: 'The-War-Within', season: 'season-03' },
      select: { id: true },
    });
    const bossIds = bossesInRaid.map((b) => b.id);

    if (bossIds.length === 0) return [];

    const directDrops = await prisma.items.findMany({
      where: {
        inventoryType: { in: inventoryTypes },
        boss_drop: {
          some: { bossId: { in: bossIds } },
        },
        tokens: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        itemLevel: true,
        allowableClasses: true,
        itemClass: true,
        itemSubClass: true,
        inventoryType: true,
      },
    });

    const allTokenMappings = await prisma.item_tokens.findMany({
      select: {
        tokenItemId: true,
        rewardItemId: true,
      },
    });

    const tokenItemIds = [...new Set(allTokenMappings.map((t) => t.tokenItemId))];

    const tokensInRaid = await prisma.boss_drop.findMany({
      where: {
        itemId: { in: tokenItemIds },
        bossId: { in: bossIds },
      },
      select: { itemId: true },
    });

    const raidTokenIds = tokensInRaid.map((t) => t.itemId);

    const tokenRewardIds = allTokenMappings
      .filter((t) => raidTokenIds.includes(t.tokenItemId))
      .map((t) => t.rewardItemId);

    let tokenRewards = [];
    if (tokenRewardIds.length > 0) {
      tokenRewards = await prisma.items.findMany({
        where: {
          id: { in: tokenRewardIds },
          inventoryType: { in: inventoryTypes },
        },
        select: {
          id: true,
          name: true,
          itemLevel: true,
          allowableClasses: true,
          itemClass: true,
          itemSubClass: true,
          inventoryType: true,
        },
      });
    }

    if (
      ['head', 'shoulders', 'chest', 'hands', 'legs'].includes(slot) &&
      tokenRewards.length === 0
    ) {
      console.log(
        `  [TOKEN DEBUG] ${className} - ${slot}: 0 token rewards (tokenRewardIds: ${tokenRewardIds.length})`,
      );
    }

    const allItemsMap = new Map();
    [...directDrops, ...tokenRewards].forEach((item) => {
      allItemsMap.set(item.id, item);
    });
    const allItems = Array.from(allItemsMap.values());

    if (['trinket1', 'trinket2', 'finger1', 'finger2'].includes(slot)) {
      console.log(`\n[TRINKET/RING DEBUG] ${className} - ${slot}:`);
      console.log(`  Total items before filter: ${allItems.length}`);
      console.log(`  directDrops: ${directDrops.length}, tokenRewards: ${tokenRewards.length}`);
      allItems.forEach((item) => {
        console.log(
          `    - ${item.name} (invType: ${item.inventoryType}, class: ${item.itemClass}, subClass: ${item.itemSubClass})`,
        );
      });
    }

    const classRestrictions = CLASS_RESTRICTIONS[classId];
    const filteredItems = allItems.filter((item) => {
      const isBeacons = item.name && item.name.includes('Beacons');
      if (isBeacons) {
        console.log(`\n[FILTER DEBUG] ${className} checking "${item.name}"`);
        console.log(`  itemClass: ${item.itemClass}, itemSubClass: ${item.itemSubClass}`);
        console.log(`  classRestrictions.armor: ${JSON.stringify(classRestrictions?.armor)}`);
      }

      const isUniversalAccessory =
        item.inventoryType === 12 ||
        item.inventoryType === 11 ||
        item.inventoryType === 2 ||
        item.inventoryType === 16;

      if (
        classRestrictions &&
        item.itemClass !== null &&
        item.itemSubClass !== null &&
        !isUniversalAccessory
      ) {
        if (item.itemClass === 4) {
          if (!classRestrictions.armor) {
            if (isBeacons) console.log(`  ❌ REJECTED: No armor allowed for this class`);
            return false;
          }
          if (!classRestrictions.armor.includes(item.itemSubClass)) {
            if (isBeacons)
              console.log(
                `  ❌ REJECTED: Wrong armor subclass (${item.itemSubClass} not in ${JSON.stringify(classRestrictions.armor)})`,
              );
            return false;
          }
          if (isBeacons) console.log(`  ✅ PASSED armor check`);
        }
        // itemClass 2 = Weapon
        else if (item.itemClass === 2) {
          if (!classRestrictions.weapon) {
            if (isBeacons) console.log(`  ❌ REJECTED: No weapons allowed`);
            return false;
          }
          if (!classRestrictions.weapon.includes(item.itemSubClass)) {
            if (isBeacons) console.log(`  ❌ REJECTED: Wrong weapon type`);
            return false;
          }
        }
      } else {
        if (isBeacons)
          console.log(
            `  ⚠️  SKIPPED armor/weapon check (itemClass: ${item.itemClass}, itemSubClass: ${item.itemSubClass})`,
          );
      }

      if (item.allowableClasses) {
        try {
          const allowed = JSON.parse(item.allowableClasses);
          if (Array.isArray(allowed) && allowed.length > 0) {
            if (!allowed.includes(classId)) {
              if (isBeacons) console.log(`  ❌ REJECTED: Class ${classId} not in allowableClasses`);
              return false;
            }
            if (isBeacons) console.log(`  ✅ PASSED allowableClasses check`);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      if (isBeacons) console.log(`  ✅ FINAL: Item ACCEPTED\n`);
      return true;
    });

    if (slot === 'shoulders' && (classId === 3 || classId === 7 || classId === 13)) {
      console.log(`  [DEBUG] ${className} - ${slot}: ${filteredItems.length} items available`);
      filteredItems.forEach((item) => {
        console.log(
          `    - ${item.name} (Class: ${item.itemClass}, SubClass: ${item.itemSubClass})`,
        );
      });
    }

    return filteredItems;
  } catch (error) {
    console.error(`Error fetching items for slot ${slot}:`, error.message);
    return [];
  }
}

async function seedWishlists() {
  console.log('📋 Seeding wishlists for existing characters...\n');

  console.log('🗑️  Deleting existing wishlists...');
  const deleted = await prisma.character_wishlists.deleteMany({
    where: await byCharacters(prisma),
  });
  console.log(`   Deleted ${deleted.count} existing wishlists\n`);

  const characters = await prisma.characters.findMany({
    where: {
      archived: 0,
    },
    select: {
      id: true,
      name: true,
      class: true,
      specializationId: true,
    },
  });

  console.log(`Found ${characters.length} active characters\n`);

  let totalWishlists = 0;

  for (const character of characters) {
    const classId = CLASS_TO_ID[character.class];
    if (!classId) {
      console.log(`⚠️  Skipping ${character.name} - unknown class: ${character.class}`);
      continue;
    }

    if (!character.specializationId) {
      console.log(`⚠️  Skipping ${character.name} - no primary specialization set`);
      continue;
    }

    console.log(`Processing ${character.name} (${character.class})...`);

    let slotsProcessed = 0;
    let usedRing = null;
    let usedTrinket = null;

    for (const slot of SLOTS) {
      const items = await getItemsForSlot(slot, classId, character.class);

      if (items.length === 0) {
        continue;
      }

      let availableItems = items;

      if (slot === 'finger2' && usedRing) {
        availableItems = items.filter((i) => i.id !== usedRing);
      }
      if (slot === 'trinket2' && usedTrinket) {
        availableItems = items.filter((i) => i.id !== usedTrinket);
      }

      if (availableItems.length === 0) {
        continue;
      }

      const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];

      if (slot === 'finger1') usedRing = randomItem.id;
      if (slot === 'trinket1') usedTrinket = randomItem.id;

      const priority = getRandomPriority();

      try {
        await prisma.character_wishlists.upsert({
          where: {
            characterId_specializationId_slot: {
              characterId: character.id,
              specializationId: character.specializationId,
              slot: slot,
            },
          },
          update: {
            itemId: randomItem.id,
            priority: priority,
          },
          create: {
            characterId: character.id,
            specializationId: character.specializationId,
            slot: slot,
            itemId: randomItem.id,
            priority: priority,
          },
        });

        slotsProcessed++;
        totalWishlists++;
      } catch (error) {
        console.error(`  ❌ Error adding wishlist for ${slot}:`, error.message);
      }
    }

    console.log(`  ✓ ${slotsProcessed} slots`);
  }

  console.log(`\n✅ Successfully seeded ${totalWishlists} wishlist entries`);
}

async function main() {
  try {
    await seedWishlists();
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { seedWishlists };
