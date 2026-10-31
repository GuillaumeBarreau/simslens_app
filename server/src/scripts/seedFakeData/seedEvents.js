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

/**
 * Construit une liste de soirées de raid (mardi et jeudi, 20h) autour de la
 * semaine courante, du plus ancien au plus récent.
 *
 * @param {{weeksBefore:number, weeksAfter:number, time:string}} opts
 * @returns {{date:string, time:string}[]} dates au format YYYY-MM-DD
 */
function buildRaidDates({ weeksBefore, weeksAfter, time }) {
  const RAID_WEEKDAYS = [2, 4]; // 2 = mardi, 4 = jeudi (Date.getDay)
  const dates = [];

  // Lundi de la semaine courante, comme point d'ancrage
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  const shiftToMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - shiftToMonday);

  for (let week = -weeksBefore; week <= weeksAfter; week++) {
    for (const weekday of RAID_WEEKDAYS) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + week * 7 + (weekday - 1));
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
      dates.push({ date: iso, time });
    }
  }

  return dates;
}

async function seedEvents() {
  console.log('📅 Seeding raid events...\n');

  const realms = await prisma.realms.findMany({
    where: realmWhere(),
    select: { id: true, server: true, guildName: true },
  });

  if (realms.length === 0) {
    console.log('⚠️  No realms found. Please run seedGuilds first.');
    return [];
  }

  const raidDifficulties = await prisma.raid_difficulties.findMany({
    select: { id: true, difficulty: true, raidId: true },
  });

  if (raidDifficulties.length === 0) {
    console.log('⚠️  No raid difficulties found. Please run seed scripts first.');
    return [];
  }

  const createdEvents = [];
  let totalCreated = 0;

  const eventTemplates = [
    {
      title: 'Raid Mythique - Progression',
      description: 'Soirée progression sur les derniers boss',
      difficulty: 'mythic',
    },
    {
      title: 'Raid Héroïque - Farm',
      description: 'Farm hebdomadaire pour stuff',
      difficulty: 'heroic',
    },
    {
      title: 'Raid Normal - Alt Run',
      description: 'Run pour les rerolls et alts',
      difficulty: 'normal',
    },
    {
      title: 'Raid Héroïque - Progression',
      description: 'Progression héroïque',
      difficulty: 'heroic',
    },
    {
      title: 'Raid Mythique - Reclear',
      description: 'Reclear des boss déjà down',
      difficulty: 'mythic',
    },
  ];

  // Dates relatives à aujourd'hui, pas figées : des dates en dur vieillissent et
  // le calendrier finit par n'afficher que du passé.
  // Deux soirées de raid par semaine (mardi et jeudi), sur 4 semaines centrées
  // sur la semaine courante : 2 dans le passé, 6 à venir.
  const raidDates = buildRaidDates({ weeksBefore: 1, weeksAfter: 3, time: '20:00' });

  for (const realm of realms) {
    console.log(`\n📍 Creating events for ${realm.guildName} (${realm.server})...`);

    const numEvents = Math.floor(Math.random() * 2) + 4;

    for (let i = 0; i < numEvents && i < raidDates.length; i++) {
      const template = eventTemplates[i % eventTemplates.length];
      const dateInfo = raidDates[i];

      const raidDiff = raidDifficulties.find((rd) => rd.difficulty === template.difficulty);

      if (!raidDiff) {
        console.log(`  ⚠️  No raid difficulty found for ${template.difficulty}, skipping...`);
        continue;
      }

      const [year, month, day] = dateInfo.date.split('-').map(Number);
      const [hour, minute] = dateInfo.time.split(':').map(Number);

      const startTime = new Date(year, month - 1, day, hour, minute);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 3);

      const now = new Date();
      let status = 'SCHEDULED';

      if (startTime < now) {
        status = Math.random() < 0.8 ? 'COMPLETED' : 'CANCELLED';
      }

      try {
        const event = await prisma.raid_events.create({
          data: {
            title: template.title,
            description: template.description,
            startTime: startTime,
            endTime: endTime,
            raidDifficultyId: raidDiff.id,
            realmId: realm.id,
            status: status,
            createdBy: `user_fake_owner_${realm.id}`,
            isOptional: Math.random() < 0.2, // 20% optional events
            discordEventId: `fake_discord_event_${realm.id}_${i}`,
          },
        });

        createdEvents.push(event);
        totalCreated++;

        const statusEmoji = status === 'COMPLETED' ? '✅' : status === 'CANCELLED' ? '❌' : '📅';
        console.log(
          `  ${statusEmoji} ${event.title} - ${dateInfo.date} ${dateInfo.time} (${status})`,
        );
      } catch (error) {
        console.log(`  ❌ Error creating event: ${error.message}`);
      }
    }
  }

  console.log(`\n✅ Seeded ${totalCreated} events across ${realms.length} guilds`);
  return createdEvents;
}

async function main() {
  try {
    await seedEvents();
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

module.exports = { seedEvents };
