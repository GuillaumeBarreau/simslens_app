const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');
const { realmWhere } = require('./seedScope');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DUNGEON_TYPES = ['M0', 'M+'];

const TIME_SLOTS = [
  { start: '14:00', end: '17:00' },
  { start: '15:00', end: '18:00' },
  { start: '17:00', end: '20:00' },
  { start: '18:00', end: '21:00' },
  { start: '19:00', end: '22:00' },
  { start: '20:00', end: '23:00' },
  { start: '21:00', end: '23:00' },
];

const ROLE_COMBOS = [
  ['TANK'],
  ['HEALER'],
  ['DPS'],
  ['TANK', 'DPS'],
  ['HEALER', 'DPS'],
  ['TANK', 'HEALER'],
  ['DPS'],
  ['DPS'],
  ['DPS'],
];

const NOTES = [
  null,
  null,
  null,
  'Dispo pour toutes les clés',
  'Préfère des clés 10+',
  'Farm vault',
  'Chill run only',
  null,
  'Je peux tank ou DPS',
  null,
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Seed fake dungeon availabilities for all roster members
 * across the current month
 */
async function seedDungeonAvailabilities() {
  console.log('🏰 Seeding dungeon availabilities...\n');

  const realms = await prisma.realms.findMany({
    where: realmWhere(),
    select: { id: true, server: true, guildName: true },
  });

  if (realms.length === 0) {
    console.log('⚠️  No realms found.');
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let totalCreated = 0;

  for (const realm of realms) {
    console.log(`\n📍 ${realm.guildName} (${realm.server})`);

    const characters = await prisma.characters.findMany({
      where: {
        realmId: realm.id,
        archived: 0,
        status: { not: 'pending' },
      },
      select: { id: true, name: true, userId: true },
    });

    if (characters.length === 0) {
      console.log('  ⚠️  No characters found, skipping.');
      continue;
    }

    const userIds = [...new Set(characters.map((c) => c.userId).filter(Boolean))];
    console.log(`  👥 ${userIds.length} unique users from ${characters.length} characters`);

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    const deleted = await prisma.dungeon_availabilities.deleteMany({
      where: {
        realmId: realm.id,
        date: { gte: monthStart, lte: monthEnd },
      },
    });
    if (deleted.count > 0) {
      console.log(`  🗑️  Cleaned ${deleted.count} existing availabilities`);
    }

    for (const userId of userIds) {
      const charName = characters.find((c) => c.userId === userId)?.name || userId;

      const numDays = randomInt(15, 25);
      const chosenDays = new Set();

      while (chosenDays.size < numDays) {
        chosenDays.add(randomInt(1, daysInMonth));
      }

      let userCreated = 0;

      for (const day of chosenDays) {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);

        const numSlots = randomInt(2, 5);
        const usedSlots = new Set();

        for (let s = 0; s < numSlots; s++) {
          let slot;
          let attempts = 0;
          do {
            slot = randomItem(TIME_SLOTS);
            attempts++;
          } while (usedSlots.has(slot.start) && attempts < 10);
          usedSlots.add(slot.start);

          const type = randomItem(DUNGEON_TYPES);
          const roles = randomItem(ROLE_COMBOS);
          const note = randomItem(NOTES);

          try {
            await prisma.dungeon_availabilities.create({
              data: {
                userId: String(userId),
                realmId: realm.id,
                date,
                startTime: slot.start,
                endTime: slot.end,
                type,
                roles: JSON.stringify(roles),
                note,
              },
            });
            userCreated++;
            totalCreated++;
          } catch (error) {
            console.log(`  ❌ Error for ${charName}: ${error.message}`);
          }
        }
      }

      console.log(`  ✅ ${charName}: ${userCreated} availabilities`);
    }
  }

  console.log(`\n🏰 Done! Seeded ${totalCreated} dungeon availabilities.`);
}

async function main() {
  try {
    await seedDungeonAvailabilities();
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

module.exports = { seedDungeonAvailabilities };
