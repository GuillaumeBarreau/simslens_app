const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');
const { byRealm } = require('./seedScope');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedAttendance() {
  console.log('✋ Seeding raid attendance...\n');

  const events = await prisma.raid_events.findMany({
    where: byRealm(),
    select: {
      id: true,
      title: true,
      startTime: true,
      status: true,
      realmId: true,
    },
  });

  if (events.length === 0) {
    console.log('⚠️  No events found. Please run seedEvents first.');
    return [];
  }

  const createdSignups = [];
  let totalCreated = 0;

  for (const event of events) {
    const characters = await prisma.characters.findMany({
      where: {
        realmId: event.realmId,
        archived: 0,
      },
      include: {
        specialization: true,
      },
    });

    if (characters.length === 0) {
      console.log(`  ⚠️  No characters found for realm ${event.realmId}, skipping event...`);
      continue;
    }

    const realmAbsences = await prisma.member_absences.findMany({
      where: { realmId: event.realmId },
      select: { userId: true, startDate: true, endDate: true },
    });

    const isUserAbsent = (userId, date) => {
      const day = new Date(date);
      day.setUTCHours(0, 0, 0, 0);
      return realmAbsences.some((a) => {
        const start = new Date(a.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(a.endDate);
        end.setUTCHours(0, 0, 0, 0);
        return a.userId === userId && day >= start && day <= end;
      });
    };

    console.log(
      `\n📍 Creating signups for "${event.title}" (${event.startTime.toISOString().split('T')[0]})...`,
    );

    let presentChance = 0.7;
    let absentChance = 0.15;
    let lateChance = 0.1;
    let tentativeChance = 0.05;

    if (event.status === 'CANCELLED') {
      presentChance = 0.3;
      absentChance = 0.5;
      lateChance = 0.05;
      tentativeChance = 0.15;
    }

    const absenceReasons = [
      'Travail',
      'Vacances',
      'Problème personnel',
      'Maladie',
      'Autre engagement',
      'Indisponible',
      null, // Some don't give a reason
    ];

    const lateTimes = ['20:15', '20:30', '20:45', '21:00', '21:15'];

    for (const character of characters) {
      if (character.userId && isUserAbsent(character.userId, event.startTime)) {
        console.log(`  🏖️  ${character.name} marked as ABSENT (user absent on event day)`);

        const day = new Date(event.startTime);
        day.setUTCHours(0, 0, 0, 0);
        const absenceRecord = realmAbsences.find((a) => {
          const start = new Date(a.startDate);
          start.setUTCHours(0, 0, 0, 0);
          const end = new Date(a.endDate);
          end.setUTCHours(0, 0, 0, 0);
          return a.userId === character.userId && day >= start && day <= end;
        });

        let role = 'DPS';
        if (character.specialization) {
          role = character.specialization.role.toUpperCase();
        }

        try {
          const signup = await prisma.raid_signups.create({
            data: {
              eventId: event.id,
              characterId: character.id,
              status: 'ABSENT',
              role: role,
              absenceReason: absenceRecord?.reason || null,
            },
          });
          createdSignups.push(signup);
          totalCreated++;
        } catch (error) {
          if (!error.message.includes('unique constraint')) {
            console.log(
              `  ⚠️  Error creating absence signup for ${character.name}: ${error.message}`,
            );
          }
        }
        continue;
      }

      if (Math.random() > 0.9) {
        continue;
      }

      const rand = Math.random();
      let status;
      let lateTime = null;
      let absenceReason = null;

      if (rand < presentChance) {
        status = 'PRESENT';
      } else if (rand < presentChance + absentChance) {
        status = 'ABSENT';
        absenceReason = absenceReasons[Math.floor(Math.random() * absenceReasons.length)];
      } else if (rand < presentChance + absentChance + lateChance) {
        status = 'LATE';
        lateTime = lateTimes[Math.floor(Math.random() * lateTimes.length)];
      } else {
        status = 'TENTATIVE';
      }

      let role = 'DPS';
      if (character.specialization) {
        role = character.specialization.role.toUpperCase();
      }

      try {
        const signup = await prisma.raid_signups.create({
          data: {
            eventId: event.id,
            characterId: character.id,
            status: status,
            role: role,
            lateTime: lateTime,
            absenceReason: absenceReason,
          },
        });

        createdSignups.push(signup);
        totalCreated++;

        const statusEmoji =
          {
            PRESENT: '✅',
            ABSENT: '❌',
            LATE: '⏰',
            TENTATIVE: '❓',
            BENCH: '🪑',
          }[status] || '❓';

        const extraInfo = lateTime ? ` (${lateTime})` : absenceReason ? ` (${absenceReason})` : '';
        console.log(`  ${statusEmoji} ${character.name} - ${status}${extraInfo}`);
      } catch (error) {
        if (!error.message.includes('unique constraint')) {
          console.log(`  ⚠️  Error creating signup for ${character.name}: ${error.message}`);
        }
      }
    }
  }

  console.log(`\n✅ Seeded ${totalCreated} signups across ${events.length} events`);
  return createdSignups;
}

async function main() {
  try {
    await seedAttendance();
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

module.exports = { seedAttendance };
