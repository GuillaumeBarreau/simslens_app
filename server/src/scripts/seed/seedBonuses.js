require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bonusesData = require('../data/bonuses.json');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function calculatePriority(trackName) {
  const priorities = { Myth: 3, Hero: 2, Champion: 1, Adventurer: 0 };
  return priorities[trackName] || 0;
}

async function importBonusData() {
  try {
    console.log('📦 Seeding bonuses...');
    console.time('BonusImport');

    const bonusEntries = Object.entries(bonusesData);

    const bonusRecords = bonusEntries.map(([bonusIdStr, bonusData]) => {
      const bonusId = parseInt(bonusIdStr);

      const data = {
        id: bonusId,
        quality: bonusData.quality || 0,
        levelModifier: bonusData.level ? parseInt(bonusData.level) : 'NULL',
        tag: bonusData.tag ? `'${bonusData.tag.replace(/'/g, "''")}'` : 'NULL',
        rawStats: bonusData.rawStats
          ? `'${JSON.stringify(bonusData.rawStats).replace(/'/g, "''")}'`
          : 'NULL',
        statsDescription: bonusData.stats ? `'${bonusData.stats.replace(/'/g, "''")}'` : 'NULL',
        upgradeGroup: 'NULL',
        upgradeLevel: 'NULL',
        upgradeMax: 'NULL',
        upgradeName: 'NULL',
        upgradeFullName: 'NULL',
        upgradeItemLevel: 'NULL',
        upgradeSeasonId: 'NULL',
        upgradePriority: 0,
      };

      if (bonusData.upgrade) {
        const upgrade = bonusData.upgrade;
        data.upgradeGroup = upgrade.group ? parseInt(upgrade.group) : 'NULL';
        data.upgradeLevel = upgrade.level ? parseInt(upgrade.level) : 'NULL';
        data.upgradeMax = upgrade.max ? parseInt(upgrade.max) : 'NULL';
        data.upgradeName = upgrade.name ? `'${upgrade.name.replace(/'/g, "''")}'` : 'NULL';
        data.upgradeFullName = upgrade.fullName
          ? `'${upgrade.fullName.replace(/'/g, "''")}'`
          : 'NULL';
        data.upgradeItemLevel = upgrade.itemLevel ? parseInt(upgrade.itemLevel) : 'NULL';
        data.upgradeSeasonId = upgrade.seasonId ? parseInt(upgrade.seasonId) : 'NULL';
        data.upgradePriority = upgrade.name ? calculatePriority(upgrade.name) : 0;
      }

      if (!data.quality && data.quality !== 0) data.quality = 'NULL';

      return `(${data.id}, ${data.upgradeGroup}, ${data.upgradeLevel}, ${data.upgradeMax}, ${data.upgradeName}, ${data.upgradeFullName}, ${data.upgradeItemLevel}, ${data.upgradeSeasonId}, ${data.upgradePriority}, ${data.quality}, ${data.levelModifier}, ${data.tag}, ${data.rawStats}, ${data.statsDescription}, NOW(), NOW())`;
    });

    await prisma.$executeRawUnsafe(`DELETE FROM item_bonus_data;`);

    const BATCH_SIZE = 5000;
    for (let i = 0; i < bonusRecords.length; i += BATCH_SIZE) {
      const chunk = bonusRecords.slice(i, i + BATCH_SIZE);
      const values = chunk.join(',');

      const query = `
        INSERT INTO item_bonus_data (
          id, upgrade_group, upgrade_level, upgrade_max, upgrade_name, upgrade_full_name, 
          upgrade_item_level, upgrade_season_id, upgrade_priority, quality, level_modifier, 
          tag, raw_stats, stats_description, created_at, updated_at
        )
        VALUES ${values};
      `;

      await prisma.$executeRawUnsafe(query);
    }

    console.timeEnd('BonusImport');
    console.log(`✅ Bonuses seeding complete. ${bonusEntries.length} bonuses processed.`);
  } catch (error) {
    console.error('❌ Error seeding bonuses:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

importBonusData();
