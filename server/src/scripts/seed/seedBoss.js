const path = require('path');
const dotenv = require('dotenv');

const { loadBosses } = require('./catalog');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

function bossData(boss) {
  return {
    name: boss.name,
    extension: boss.extension,
    season: boss.season,
    raidName: boss.raidName,
    order: boss.order,
    icon: boss.icon,
  };
}

/**
 * Upsert de chaque boss par identifiant, puis de ses butins connus (`loots`) :
 * relancer le seed ne crée rien de plus. Retail (`data/boss.json`) et Forever
 * (`data/forever/bosses.json`, SIMS-027, sans table de loot publiée).
 */
async function seedBosses(prisma, bosses = loadBosses(), log = console) {
  log.log('👹 Seeding bosses...');

  for (const boss of bosses) {
    const data = bossData(boss);
    await prisma.bosses.upsert({
      where: { id: boss.bossId },
      update: data,
      create: { id: boss.bossId, ...data },
    });

    if (!Array.isArray(boss.loots)) continue;

    for (const itemId of boss.loots) {
      if (typeof itemId !== 'number') continue;

      const itemExists = await prisma.items.findUnique({ where: { id: itemId } });
      if (!itemExists) {
        log.log(`⚠️  Skipping item ${itemId} for boss ${boss.name} - item not found in database`);
        continue;
      }

      const existing = await prisma.boss_drop.findFirst({
        where: { bossId: boss.bossId, itemId },
      });
      if (!existing) {
        await prisma.boss_drop.create({ data: { bossId: boss.bossId, itemId } });
      }
    }
  }

  log.log('✅ Bosses and boss_drop templates seeded');
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await seedBosses(prisma);
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

module.exports = { seedBosses, bossData };
