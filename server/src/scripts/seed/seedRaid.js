const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const raids = require('../data/raids.json');

async function seedRaid() {
  console.log('🏰 Seeding raids...');

  for (const raid of raids) {
    console.log(`Processing raid: ${raid.name}`);

    await prisma.raids.upsert({
      where: { id: raid.id },
      update: {
        name: raid.name,
        instanceId: raid.instanceId || null,
        description: raid.description || null,
        image_button: raid.image_button || null,
        image_button_small: raid.image_button_small || null,
        image_background: raid.image_background || null,
        extension: raid.extension || null,
        season: raid.season || null,
      },
      create: {
        id: raid.id,
        name: raid.name,
        instanceId: raid.instanceId || null,
        description: raid.description || null,
        image_button: raid.image_button || null,
        image_button_small: raid.image_button_small || null,
        image_background: raid.image_background || null,
        extension: raid.extension || null,
        season: raid.season || null,
      },
    });
  }

  console.log('✅ Raids seeded successfully.');
}

async function main() {
  try {
    await seedRaid();
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
