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

const regions = [{ name: 'EU' }, { name: 'NA' }, { name: 'KR' }, { name: 'TW' }, { name: 'CN' }];

async function seedRegions() {
  console.log('🌍 Seeding regions...');
  let added = 0;

  for (const region of regions) {
    const result = await prisma.regions.upsert({
      where: { name: region.name },
      update: {},
      create: { name: region.name },
    });
  }

  console.log(`✅ Regions seeding complete. ${regions.length} regions processed.`);
}

async function main() {
  try {
    await seedRegions();
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
