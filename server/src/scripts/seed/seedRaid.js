const path = require('path');
const dotenv = require('dotenv');

const { loadRaids } = require('./catalog');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

function raidData(raid) {
  return {
    name: raid.name,
    instanceId: raid.instanceId || null,
    description: raid.description || null,
    image_button: raid.image_button || null,
    image_button_small: raid.image_button_small || null,
    image_background: raid.image_background || null,
    extension: raid.extension || null,
    season: raid.season || null,
  };
}

/**
 * Upsert de chaque raid par identifiant : relancer le seed ne crée rien de plus.
 * Retail (`data/raids.json`) et Forever (`data/forever/raids.json`, SIMS-027).
 */
async function seedRaid(prisma, raids = loadRaids(), log = console) {
  log.log('🏰 Seeding raids...');

  for (const raid of raids) {
    log.log(`Processing raid: ${raid.name}`);
    const data = raidData(raid);
    await prisma.raids.upsert({
      where: { id: raid.id },
      update: data,
      create: { id: raid.id, ...data },
    });
  }

  log.log('✅ Raids seeded successfully.');
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await seedRaid(prisma);
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

module.exports = { seedRaid, raidData };
