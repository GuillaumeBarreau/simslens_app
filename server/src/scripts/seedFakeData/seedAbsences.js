const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');
const { realmWhere, byRealm } = require('./seedScope');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Return a random integer between min and max (inclusive)
 */
function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Return a Date set to the start of the given date (midnight UTC)
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const REASONS = [
  'Vacances',
  'Travail',
  'Maladie',
  'Déplacement professionnel',
  'Événement familial',
  'Indisponible',
  null,
  null, // More nulls so some absences have no reason
];

/**
 * Seed member absences for all realms.
 * Each unique user in the realm gets 5-8 absence days,
 * distributed in 1-2 consecutive blocks.
 */
async function seedAbsences() {
  console.log('🏖️  Seeding member absences...\n');

  const WINDOW_START = startOfDay(new Date());
  const WINDOW_END = startOfDay(addDays(new Date(), 30));
  const WINDOW_DAYS = Math.round(
    (WINDOW_END.getTime() - WINDOW_START.getTime()) / (1000 * 60 * 60 * 24),
  );

  const deleted = await prisma.member_absences.deleteMany({ where: byRealm() });
  console.log(`🗑️  Deleted ${deleted.count} existing absences\n`);

  const realms = await prisma.realms.findMany({
    where: realmWhere(),
    select: { id: true, guildName: true, server: true },
  });

  if (realms.length === 0) {
    console.log('⚠️  No realms found. Please run seedGuilds first.');
    return [];
  }

  const created = [];

  for (const realm of realms) {
    console.log(`\n📍 Creating absences for ${realm.guildName} (${realm.server})...`);

    const chars = await prisma.characters.findMany({
      where: { realmId: realm.id, archived: 0 },
      select: { userId: true },
    });

    const userIds = [...new Set(chars.map((c) => c.userId).filter(Boolean))];

    if (userIds.length === 0) {
      console.log('  ⚠️  No users found, skipping realm.');
      continue;
    }

    for (const userId of userIds) {
      const totalDays = randomBetween(5, 8);

      const numBlocks = Math.random() < 0.5 ? 1 : 2;
      const blocks = [];

      if (numBlocks === 1) {
        blocks.push(totalDays);
      } else {
        const block1 = randomBetween(2, totalDays - 2);
        blocks.push(block1, totalDays - block1);
      }

      const usedRanges = [];

      for (const blockLength of blocks) {
        let attempts = 0;
        let startOffset = null;

        while (attempts < 50) {
          const candidate = randomBetween(0, WINDOW_DAYS - blockLength);
          const candStart = addDays(WINDOW_START, candidate);
          const candEnd = addDays(candStart, blockLength - 1);

          const overlaps = usedRanges.some(([us, ue]) => {
            const gap = 2;
            return (
              candStart <= addDays(new Date(ue), gap) && addDays(new Date(us), -gap) <= candEnd
            );
          });

          if (!overlaps) {
            startOffset = candidate;
            usedRanges.push([candStart.toISOString(), candEnd.toISOString()]);
            break;
          }
          attempts++;
        }

        if (startOffset === null) {
          console.log(
            `  ⚠️  Could not find non-overlapping slot for user ${userId}, skipping block.`,
          );
          continue;
        }

        const blockStart = startOfDay(addDays(WINDOW_START, startOffset));
        const blockEnd = startOfDay(addDays(blockStart, blockLength - 1));
        const reason = REASONS[Math.floor(Math.random() * REASONS.length)];

        try {
          const absence = await prisma.member_absences.create({
            data: {
              userId,
              realmId: realm.id,
              startDate: blockStart,
              endDate: blockEnd,
              reason,
            },
          });
          created.push(absence);

          const emoji = reason ? '🏖️' : '😶';
          console.log(
            `  ${emoji} ${userId} | ${blockStart.toISOString().split('T')[0]} → ${blockEnd.toISOString().split('T')[0]} (${blockLength} day${blockLength > 1 ? 's' : ''})${reason ? ` — ${reason}` : ''}`,
          );
        } catch (error) {
          if (error.code !== 'P2002') {
            console.error(`  ❌ Error creating absence for ${userId}: ${error.message}`);
          }
        }
      }
    }
  }

  console.log(`\n✅ Seeded ${created.length} absence records`);
  return created;
}

async function main() {
  try {
    await seedAbsences();
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

module.exports = { seedAbsences };
