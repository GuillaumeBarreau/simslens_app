require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const { syncUpgradesFromBlizzard } = require('./src/services/blizzardSync.service');

async function main() {
  try {
    const CHARACTER_ID = parseInt(process.argv[2]) || 22;

    console.log(`\n=== Syncing upgrades for character ${CHARACTER_ID} ===\n`);

    const result = await syncUpgradesFromBlizzard(prisma, CHARACTER_ID);

    console.log('\n=== Sync Result ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
