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

const bosses = require('../data/boss.json');

async function seedBosses() {
  console.log('👹 Seeding bosses...');

  for (const boss of bosses) {
    if (!boss || typeof boss.bossId === 'undefined') continue;

    await prisma.bosses.upsert({
      where: { id: boss.bossId },
      update: {
        name: boss.name,
        extension: boss.extension,
        season: boss.season,
        raidName: boss.raidName,
        order: boss.order,
        icon: boss.icon,
      },
      create: {
        id: boss.bossId,
        name: boss.name,
        extension: boss.extension,
        season: boss.season,
        raidName: boss.raidName,
        order: boss.order,
        icon: boss.icon,
      },
    });

    if (Array.isArray(boss.loots)) {
      for (const itemId of boss.loots) {
        if (typeof itemId !== 'number') continue;

        const itemExists = await prisma.items.findUnique({
          where: { id: itemId },
        });

        if (!itemExists) {
          console.log(
            `⚠️  Skipping item ${itemId} for boss ${boss.name} - item not found in database`,
          );
          continue;
        }

        const existing = await prisma.boss_drop.findFirst({
          where: {
            bossId: boss.bossId,
            itemId: itemId,
          },
        });

        if (!existing) {
          await prisma.boss_drop.create({
            data: {
              bossId: boss.bossId,
              itemId: itemId,
            },
          });
        }
      }
    }
  }

  console.log('✅ Bosses and boss_drop templates seeded');
}

async function main() {
  try {
    await seedBosses();
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
