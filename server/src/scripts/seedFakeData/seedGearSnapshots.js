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
  CLASS_SLOT_OVERRIDES,
} = require('../../shared/constants/wow');

const CLASS_TO_ID = Object.fromEntries(
  Object.entries(ID_TO_CLASS).map(([id, name]) => [name, parseInt(id)]),
);

const EQUIPMENT_SLOTS = [
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

const UPGRADE_TRACKS = {
  hero: {
    name: 'Hero',
    maxLevel: 6,
    baseIlvl: 710,
    ilvlPerUpgrade: 3,
  },
  myth: {
    name: 'Myth',
    maxLevel: 4, // Myth track is 1/4 to 4/4
    baseIlvl: 723,
    ilvlPerUpgrade: 3,
  },
  explorer: {
    name: 'Explorer',
    maxLevel: 8,
    baseIlvl: 690,
    ilvlPerUpgrade: 3,
  },
};

function getRandomUpgrade() {
  const tracks = ['hero', 'myth', 'explorer'];
  const track = tracks[Math.floor(Math.random() * tracks.length)];
  const trackData = UPGRADE_TRACKS[track];

  const upgradeLevel = 1 + Math.floor(Math.random() * trackData.maxLevel);
  const ilevel = trackData.baseIlvl + upgradeLevel * trackData.ilvlPerUpgrade;

  return {
    upgradeLevel,
    upgradeMax: trackData.maxLevel,
    upgradeName: trackData.name,
    upgradeFullName: `${trackData.name} ${upgradeLevel}/${trackData.maxLevel}`,
    baseItemLevel: trackData.baseIlvl,
    ilevel,
  };
}

async function getItemsForSlot(slot, classId) {
  let inventoryTypes = SLOT_INVENTORY_TYPES[slot] || [];

  if (
    classId &&
    CLASS_SLOT_OVERRIDES &&
    CLASS_SLOT_OVERRIDES[classId] &&
    CLASS_SLOT_OVERRIDES[classId][slot]
  ) {
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
      },
      select: {
        id: true,
        name: true,
        itemLevel: true,
        allowableClasses: true,
      },
      take: 50,
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
        },
      });
    }

    const allItems = [...directDrops, ...tokenRewards];

    const uniqueItemsMap = new Map();
    allItems.forEach((item) => uniqueItemsMap.set(item.id, item));
    const uniqueItems = Array.from(uniqueItemsMap.values());

    const filteredItems = uniqueItems.filter((item) => {
      if (!item.allowableClasses) return true;
      try {
        const allowed = JSON.parse(item.allowableClasses);
        if (Array.isArray(allowed) && allowed.length > 0) {
          return allowed.includes(classId);
        }
      } catch (e) {
        // Ignore parse errors
      }
      return true;
    });

    return filteredItems;
  } catch (error) {
    console.error(`Error fetching items for slot ${slot}:`, error.message);
    return [];
  }
}

async function seedGearSnapshots() {
  console.log('🎒 Seeding gear snapshots for existing characters...\n');

  console.log('🗑️  Deleting existing gear snapshots...');
  const scopedSnapshots = await prisma.character_gear_snapshots.findMany({
    where: await byCharacters(prisma),
    select: { id: true },
  });
  const deleteItems = await prisma.gear_snapshot_items.deleteMany({
    where: { snapshotId: { in: scopedSnapshots.map((s) => s.id) } },
  });
  const deleteSnapshots = await prisma.character_gear_snapshots.deleteMany({
    where: await byCharacters(prisma),
  });
  console.log(`   Deleted ${deleteSnapshots.count} snapshots and ${deleteItems.count} items\n`);

  const characters = await prisma.characters.findMany({
    where: {
      archived: 0,
    },
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
    },
  });

  console.log(`Found ${characters.length} active characters\n`);

  let totalSnapshots = 0;
  let totalItems = 0;

  for (const character of characters) {
    const classId = CLASS_TO_ID[character.class];
    if (!classId) {
      console.log(`⚠️  Skipping ${character.name} - unknown class: ${character.class}`);
      continue;
    }

    console.log(`Processing ${character.name} (${character.class})...`);

    const snapshot = await prisma.character_gear_snapshots.create({
      data: {
        characterId: character.id,
        reportId: 'seed_' + Date.now() + '_' + character.id,
        spec: character.specialization?.name || 'Unknown',
        difficulty: 'heroic',
        timestamp: new Date(),
      },
    });

    totalSnapshots++;
    let itemsAdded = 0;

    const wishlist = await prisma.character_wishlists.findMany({
      where: {
        characterId: character.id,
        itemId: { not: null },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            itemLevel: true,
            inventoryType: true,
          },
        },
      },
    });

    console.log(`    Found ${wishlist.length} wishlist items for character`);

    const wishlistBySlot = {};
    for (const wish of wishlist) {
      if (!wishlistBySlot[wish.slot]) {
        wishlistBySlot[wish.slot] = wish.item;
      }
    }

    let usedRing = null;
    let usedTrinket = null;

    for (const slot of EQUIPMENT_SLOTS) {
      const useWishlistItem = Math.random() < 0.3 && wishlistBySlot[slot];

      let selectedItem = null;
      let upgrade = null;

      if (useWishlistItem) {
        selectedItem = wishlistBySlot[slot];
        console.log(`    ✨ Using wishlisted item for ${slot}: ${selectedItem.name}`);

        const trackData = UPGRADE_TRACKS['myth'];
        const upgradeLevel = 4 + Math.floor(Math.random() * (trackData.maxLevel - 3));
        const ilevel = trackData.baseIlvl + upgradeLevel * trackData.ilvlPerUpgrade;

        upgrade = {
          upgradeLevel,
          upgradeMax: trackData.maxLevel,
          upgradeName: trackData.name,
          upgradeFullName: `${trackData.name} ${upgradeLevel}/${trackData.maxLevel}`,
          baseItemLevel: trackData.baseIlvl,
          ilevel,
        };
      } else {
        const items = await getItemsForSlot(slot, classId);

        if (items.length === 0) {
          console.log(`    ⚠️  No items found for slot: ${slot}`);
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
          console.log(`    ⚠️  No unique items left for slot: ${slot}`);
          continue;
        }

        selectedItem = availableItems[Math.floor(Math.random() * availableItems.length)];
        upgrade = getRandomUpgrade();
      }

      if (slot === 'finger1') usedRing = selectedItem.id;
      if (slot === 'trinket1') usedTrinket = selectedItem.id;

      try {
        await prisma.gear_snapshot_items.create({
          data: {
            snapshotId: snapshot.id,
            slot: slot,
            itemId: selectedItem.id,
            ilevel: upgrade.ilevel,
            encodedItem: `item:${selectedItem.id}:0:0:0:0:0:0:0:0:0:0:0`,
            enchantId: null,
            gemIds: null,
            upgradeLevel: upgrade.upgradeLevel,
            upgradeMax: upgrade.upgradeMax,
            upgradeName: upgrade.upgradeName,
            upgradeFullName: upgrade.upgradeFullName,
            upgradeBonusId: null,
            baseItemLevel: upgrade.baseItemLevel,
          },
        });

        itemsAdded++;
        totalItems++;
      } catch (error) {
        console.error(`  ❌ Error adding item for ${slot}:`, error.message);
      }
    }

    console.log(`  ✓ Created snapshot with ${itemsAdded} items`);
  }

  console.log(`\n✅ Successfully seeded ${totalSnapshots} gear snapshots with ${totalItems} items`);
}

async function main() {
  try {
    await seedGearSnapshots();
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

module.exports = { seedGearSnapshots };
