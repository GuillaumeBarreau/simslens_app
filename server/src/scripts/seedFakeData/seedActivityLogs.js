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

function getRandomDate() {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));
  date.setHours(date.getHours() - Math.floor(Math.random() * 24));
  date.setMinutes(date.getMinutes() - Math.floor(Math.random() * 60));
  return date;
}

const ACTION_TYPES = ['WISHLIST_UPDATE', 'SIM_REPORT_UPLOAD'];
const SLOTS = ['head', 'neck', 'shoulders', 'chest', 'legs', 'main_hand', 'trinket1'];

async function seedActivityLogs() {
  console.log('📜 Seeding activity logs...');

  console.log('🗑️  Deleting existing activity logs...');
  const deleted = await prisma.activity_logs.deleteMany({ where: byRealm() });
  console.log(`   Deleted ${deleted.count} existing logs\n`);

  console.log('🏰 Ensuring multiple realms exist for testing...');
  let secondRealm = await prisma.realms.findFirst({
    where: { guildName: 'TestGuildSecondary' },
  });

  if (!secondRealm) {
    const dbClasses = await prisma.classes.findMany({ take: 2 });
    const class1 = dbClasses.length > 0 ? dbClasses[0].name : 'Warrior';
    const class2 = dbClasses.length > 1 ? dbClasses[1].name : class1;

    secondRealm = await prisma.realms.create({
      data: {
        server: 'hyjal',
        region: 'EU',
        guildName: 'TestGuildSecondary',
        createdBy: 1, // dummy user ID
        characters: {
          create: [
            {
              name: 'FakeChar1',
              class: class1,
              region: 'EU',
              realm: 'hyjal',
              lastModified: new Date(),
            },
            {
              name: 'FakeChar2',
              class: class2,
              region: 'EU',
              realm: 'hyjal',
              lastModified: new Date(),
            },
          ],
        },
        owners: {
          create: [{ ownerId: 'user#fake_owner', role: 'owner' }],
        },
      },
    });
    console.log(`   Created secondary realm: TestGuildSecondary (ID: ${secondRealm.id})`);
  }

  const characters = await prisma.characters.findMany({
    where: { archived: 0 },
    select: { id: true, name: true, realmId: true, userId: true },
  });

  if (!characters.length) {
    console.log('⚠️  No characters found to seed activity logs.');
    return;
  }

  const realmUsers = await prisma.realm_owners.findMany({
    select: { realmId: true, ownerId: true },
  });

  if (!realmUsers.length) {
    console.log('⚠️  No realm users found to attribute activity logs.');
    return;
  }

  const twwS3Drops = await prisma.boss_drop.findMany({
    where: {
      boss: {
        extension: 'The-War-Within',
        season: 'season-03',
      },
    },
    select: { itemId: true },
  });
  const twwS3ItemIds = twwS3Drops.map((d) => d.itemId);

  let totalLogs = 0;
  const logsToCreate = [];

  for (const character of characters) {
    const realmId = character.realmId;
    if (!realmId) continue;

    const userId = character.userId || `user#player_${character.id}`;

    const numLogs = Math.floor(Math.random() * 6);

    for (let i = 0; i < numLogs; i++) {
      const isSimReport = Math.random() > 0.6;

      let actionType, metadata;

      if (isSimReport) {
        actionType = 'SIM_REPORT_UPLOAD';
        metadata = {
          filename: `sim_report_${character.name}_${Math.floor(Math.random() * 1000)}.csv`,
          rowCount: Math.floor(Math.random() * 50) + 10,
          importID: Math.floor(Math.random() * 1000),
        };
      } else {
        actionType = 'WISHLIST_UPDATE';
        const actionRand = Math.random();
        let oldItemId = null;
        let newItemId = null;

        const getRandomItem = () =>
          twwS3ItemIds.length > 0
            ? twwS3ItemIds[Math.floor(Math.random() * twwS3ItemIds.length)]
            : Math.floor(Math.random() * 100000);

        if (actionRand < 0.4) {
          newItemId = getRandomItem();
        } else if (actionRand < 0.8) {
          oldItemId = getRandomItem();
          newItemId = getRandomItem();
        } else {
          oldItemId = getRandomItem();
        }

        metadata = {
          slot: SLOTS[Math.floor(Math.random() * SLOTS.length)],
          characterId: character.id,
          oldItemId,
          newItemId,
        };
      }

      logsToCreate.push({
        realmId: realmId,
        userId: userId,
        characterName: character.name,
        actionType: actionType,
        metadata: metadata,
        createdAt: getRandomDate(),
      });
      totalLogs++;
    }
  }

  const uniqueRealms = [...new Set(characters.map((c) => c.realmId).filter(Boolean))];
  for (const realmId of uniqueRealms) {
    const usersInRealm = realmUsers.filter((r) => r.realmId === realmId);
    if (!usersInRealm.length) continue;

    for (let i = 0; i < 3; i++) {
      const userId = usersInRealm[Math.floor(Math.random() * usersInRealm.length)].ownerId;
      logsToCreate.push({
        realmId: realmId,
        userId: userId,
        characterName: `Roster_Sim_${i}.csv`,
        actionType: 'SIM_REPORT_UPLOAD',
        metadata: {
          filename: `Roster_Sim_${i}.csv`,
          rowCount: Math.floor(Math.random() * 200) + 50,
        },
        createdAt: getRandomDate(),
      });
      totalLogs++;
    }
  }

  if (logsToCreate.length > 0) {
    await prisma.activity_logs.createMany({
      data: logsToCreate,
    });
  }

  console.log(
    `✅ Successfully seeded ${totalLogs} activity logs across ${uniqueRealms.length} realms.\n`,
  );
}

async function main() {
  try {
    await seedActivityLogs();
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

module.exports = { seedActivityLogs };
