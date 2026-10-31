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

const { ID_TO_CLASS } = require('../../shared/constants/wow');

const UPGRADES_PER_CHARACTER = 25;

const MIN_RANDOM_UPGRADES = 10;

const DIFFICULTIES = ['mythic'];

const CLASS_TO_ID = Object.fromEntries(
  Object.entries(ID_TO_CLASS).map(([id, name]) => [name, parseInt(id)]),
);

let specsCache = null;

async function loadSpecsFromDB() {
  if (specsCache) return specsCache;

  const specs = await prisma.specializations.findMany({
    include: {
      class: true,
    },
  });

  specsCache = {};
  for (const spec of specs) {
    const className = spec.class.name;
    if (!specsCache[className]) {
      specsCache[className] = [];
    }
    specsCache[className].push(spec.name);
  }

  return specsCache;
}

async function getRandomSpecForClass(className) {
  const specs = await loadSpecsFromDB();
  const classSpecs = specs[className];
  if (!classSpecs || classSpecs.length === 0) {
    return 'Unknown';
  }
  return classSpecs[Math.floor(Math.random() * classSpecs.length)];
}

function generateReportId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomTimestamp() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const randomTime =
    thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
  return new Date(randomTime);
}

function generateDPS(characterIlvl) {
  const baseDPS = 800000 + (characterIlvl - 600) * 10000;

  const variance = baseDPS * (Math.random() * 0.2 - 0.1);
  const actualBaseDPS = baseDPS + variance;

  const upgradeGainPercent = -0.01 + Math.random() * 0.07;
  const upgradeDPS = actualBaseDPS * (1 + upgradeGainPercent);

  return {
    baseDps: Math.round(actualBaseDPS),
    dps: Math.round(upgradeDPS),
  };
}

/**
 * Generate DPS values that can be negative (downgrades) for non-wishlisted items
 */
function generateDPSWithDowngrades(characterIlvl) {
  const baseDPS = 800000 + (characterIlvl - 600) * 10000;
  const variance = baseDPS * (Math.random() * 0.2 - 0.1);
  const actualBaseDPS = baseDPS + variance;

  const changePercent = -0.03 + Math.random() * 0.08;
  const upgradeDPS = actualBaseDPS * (1 + changePercent);

  return {
    baseDps: Math.round(actualBaseDPS),
    dps: Math.round(upgradeDPS),
  };
}

async function getItemsForClass(classId) {
  try {
    const bosses = await prisma.bosses.findMany({
      where: {
        extension: 'The-War-Within',
        season: 'season-03',
      },
      select: { id: true },
    });
    const bossIds = bosses.map((b) => b.id);

    if (bossIds.length === 0) {
      console.warn('  ⚠️  No bosses found for The-War-Within/season-03');
      return [];
    }

    const items = await prisma.items.findMany({
      where: {
        boss_drop: {
          some: {
            bossId: { in: bossIds },
          },
        },
      },
      select: {
        id: true,
        name: true,
        itemLevel: true,
        allowableClasses: true,
      },
    });

    const filteredItems = items.filter((item) => {
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
    console.error(`Error fetching items for class ${classId}:`, error.message);
    return [];
  }
}

async function seedUpgrades() {
  console.log('📊 Seeding upgrade reports for existing characters...\n');

  console.log('🗑️  Deleting existing upgrade reports...');
  const deleteResult = await prisma.upgrades.deleteMany({
    where: await byCharacters(prisma, 'characterID'),
  });
  console.log(`   Deleted ${deleteResult.count} existing upgrades\n`);

  const characters = await prisma.characters.findMany({
    where: {
      archived: 0,
    },
    select: {
      id: true,
      name: true,
      class: true,
      ilvl: true,
      spec: true,
    },
  });

  console.log(`Found ${characters.length} active characters\n`);

  let totalUpgrades = 0;

  for (const character of characters) {
    const classId = CLASS_TO_ID[character.class];
    if (!classId) {
      console.log(`⚠️  Skipping ${character.name} - unknown class: ${character.class}`);
      continue;
    }

    console.log(
      `Processing ${character.name} (${character.class}, ilvl ${character.ilvl || 715})...`,
    );

    const items = await getItemsForClass(classId);

    if (items.length === 0) {
      console.log(`  ⚠️  No items found for ${character.class}`);
      continue;
    }

    let upgradesCreated = 0;

    const wishlistedItems = await prisma.character_wishlists.findMany({
      where: {
        characterId: character.id,
      },
      select: {
        itemId: true,
      },
    });

    console.log(`  - Found ${wishlistedItems.length} wishlisted items`);

    for (const wish of wishlistedItems) {
      const item = items.find((i) => i.id === wish.itemId);

      const characterIlvl = character.ilvl || 715;
      const { baseDps, dps } = generateDPS(characterIlvl);

      const reportId = generateReportId();
      const timestamp = getRandomTimestamp();

      try {
        const randomSpec = await getRandomSpecForClass(character.class);

        await prisma.upgrades.create({
          data: {
            characterID: character.id,
            itemID: wish.itemId,
            reportID: reportId,
            dps: dps,
            baseDps: baseDps,
            spec: randomSpec,
            // La difficulté ne vient plus de la wishlist : la colonne
            // character_wishlists.difficulty a été supprimée par la migration
            // 20260415130000_drop_difficulty_from_wishlists. On tire au sort,
            // comme le fait déjà la branche hors-wishlist plus bas.
            difficulty: DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)],
            timeStamp: timestamp,
            talents: '', // Empty for now
            buildDate: timestamp.toISOString().split('T')[0],
          },
        });
        upgradesCreated++;
        totalUpgrades++;
      } catch (error) {
        if (error.code !== 'P2002') {
          console.error(`  ❌ Error creating wishlist upgrade:`, error.message);
        }
      }
    }

    const remainingUpgrades = Math.max(
      MIN_RANDOM_UPGRADES,
      UPGRADES_PER_CHARACTER - upgradesCreated,
    );
    for (let i = 0; i < remainingUpgrades; i++) {
      const randomItem = items[Math.floor(Math.random() * items.length)];

      const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];

      const characterIlvl = character.ilvl || 715;
      const { baseDps, dps } = generateDPSWithDowngrades(characterIlvl);

      const reportId = generateReportId();
      const timestamp = getRandomTimestamp();

      try {
        const randomSpec = await getRandomSpecForClass(character.class);

        await prisma.upgrades.create({
          data: {
            characterID: character.id,
            itemID: randomItem.id,
            reportID: reportId,
            dps: dps,
            baseDps: baseDps,
            spec: randomSpec,
            difficulty: difficulty,
            timeStamp: timestamp,
            talents: '', // Empty for now
            buildDate: timestamp.toISOString().split('T')[0],
          },
        });

        upgradesCreated++;
        totalUpgrades++;
      } catch (error) {
        if (error.code !== 'P2002') {
          console.error(`  ❌ Error creating upgrade:`, error.message);
        }
      }
    }

    console.log(`  ✓ Created ${upgradesCreated} upgrade reports`);
  }

  console.log(`\n✅ Successfully seeded ${totalUpgrades} upgrade reports`);
}

async function main() {
  try {
    await seedUpgrades();
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

module.exports = { seedUpgrades };
