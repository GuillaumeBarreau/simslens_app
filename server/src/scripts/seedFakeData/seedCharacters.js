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
 * Creates ~20 characters per guild with diverse classes and specs
 */
async function seedCharacters() {
  console.log('⚔️  Seeding characters...\n');

  const realms = await prisma.realms.findMany({
    where: realmWhere(),
    select: { id: true, server: true, guildName: true },
  });

  if (realms.length === 0) {
    console.log('⚠️  No realms found. Please run seedGuilds first.');
    return [];
  }

  const classes = await prisma.classes.findMany({
    include: { specializations: true },
  });

  if (classes.length === 0) {
    console.log('⚠️  No classes found. Please run seed scripts first.');
    return [];
  }

  const namePool = [
    'Thunderfist',
    'Shadowblade',
    'Frostwhisper',
    'Flameheart',
    'Stormcaller',
    'Nightstalker',
    'Ironforge',
    'Moonlight',
    'Sunstrider',
    'Darkbane',
    'Lightbringer',
    'Doomhammer',
    'Frostmourne',
    'Ashbringer',
    'Windrunner',
    'Bloodhoof',
    'Proudmoore',
    'Hellscream',
    'Wrynn',
    'Bronzebeard',
    'Whisperwind',
    'Stormrage',
    'Dawnseeker',
    'Earthshaker',
    'Skycaller',
    'Voidwalker',
    'Starfire',
    'Crystalwing',
    'Emberstorm',
    'Frostwolf',
    'Shadowmoon',
    'Sunfury',
    'Netherwing',
    'Dragonmaw',
    'Wildhammer',
    'Blackrock',
    'Redridge',
    'Goldshire',
    'Darkshire',
    'Lakeshire',
    'Northshire',
    'Westfall',
    'Elwynn',
    'Duskwood',
    'Stranglethorn',
    'Tanaris',
    'Silithus',
    'Winterspring',
    'Felwood',
    'Ashenvale',
    'Darkshore',
    'Teldrassil',
    'Moonglade',
    'Feralas',
    'Desolace',
    'Barrens',
    'Mulgore',
    'Durotar',
    'Orgrimmar',
    'Thunderbluff',
    'Silvermoon',
    'Ghostlands',
    'Eversong',
    'Azuremyst',
    'Bloodmyst',
    'Exodar',
    'Shattrath',
    'Nagrand',
    'Zangarmarsh',
    'Terokkar',
    'Shadowmoon',
    'Netherstorm',
    'Bladesedge',
    'Hellfire',
    'Borean',
    'Dragonblight',
    'Grizzly',
    'Howling',
    'Icecrown',
    'Sholazar',
    'Stormpeaks',
    'Zuldrak',
    'Crystalsong',
    'Dalaran',
    'Wyrmrest',
  ];

  const createdCharacters = [];
  let totalCreated = 0;

  for (const realm of realms) {
    console.log(`\n📍 Creating characters for ${realm.guildName} (${realm.server})...`);

    const charactersPerGuild = 20;
    const usedNames = new Set();

    const userAssignments = [];

    const roleslots = [
      { userId: `user_fake_owner_${realm.id}`, count: 2 },
      { userId: `user_fake_admin_${realm.id}_1`, count: 2 },
      { userId: `user_fake_admin_${realm.id}_2`, count: 2 },
      { userId: `user_fake_mod_${realm.id}_1`, count: 1 },
    ];
    for (const slot of roleslots) {
      for (let k = 0; k < slot.count; k++) userAssignments.push(slot.userId);
    }

    let playerIndex = 1;
    const weights = [1, 1, 2, 2, 3, 4];
    while (userAssignments.length < charactersPerGuild) {
      const remaining = charactersPerGuild - userAssignments.length;
      const groupSize = Math.min(weights[Math.floor(Math.random() * weights.length)], remaining);
      const userId = `user_fake_player_${realm.id}_${playerIndex++}`;
      for (let k = 0; k < groupSize; k++) userAssignments.push(userId);
    }

    for (let k = userAssignments.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [userAssignments[k], userAssignments[j]] = [userAssignments[j], userAssignments[k]];
    }

    let assignmentIndex = 0;

    for (let i = 0; i < charactersPerGuild; i++) {
      const randomClass = classes[Math.floor(Math.random() * classes.length)];

      if (randomClass.specializations.length === 0) {
        console.log(`⚠️  No specializations found for class: ${randomClass.name}`);
        continue;
      }

      const randomSpec =
        randomClass.specializations[Math.floor(Math.random() * randomClass.specializations.length)];

      let characterName;
      let attempts = 0;
      do {
        characterName = namePool[Math.floor(Math.random() * namePool.length)];
        attempts++;
      } while (usedNames.has(characterName) && attempts < 100);

      if (attempts >= 100) {
        console.log('⚠️  Could not generate unique name, skipping...');
        continue;
      }

      usedNames.add(characterName);

      const ilvl = Math.floor(Math.random() * 40) + 450;
      const score = Math.floor(Math.random() * 1000) + 2000;

      const assignedUserId =
        userAssignments[assignmentIndex++] ?? `user_fake_extra_${realm.id}_${i}`;

      try {
        const existing = await prisma.characters.findUnique({
          where: {
            name_realm: {
              name: characterName,
              realm: realm.server,
            },
          },
        });

        if (existing) {
          console.log(
            `  ⚠️  Character ${characterName} already exists on ${realm.server}, updating userId...`,
          );
          await prisma.characters.update({
            where: { id: existing.id },
            data: { userId: assignedUserId },
          });
          continue;
        }

        const character = await prisma.characters.create({
          data: {
            name: characterName,
            class: randomClass.name,
            realm: realm.server,
            region: 'EU',
            realmId: realm.id,
            spec: randomSpec.name,
            specializationId: randomSpec.id,
            status: 'approved',
            archived: 0,
            ilvl: ilvl,
            score: score,
            userId: assignedUserId,
            lastModified: new Date(),
            thumbnail: `https://render.worldofwarcraft.com/eu/character/thumbnail/${realm.server.toLowerCase()}/${characterName.toLowerCase()}.jpg`,
          },
        });

        createdCharacters.push(character);
        totalCreated++;
        console.log(
          `  ✅ ${characterName} (${randomClass.name} - ${randomSpec.name}) - ilvl ${ilvl}`,
        );
      } catch (error) {
        console.log(`  ❌ Error creating ${characterName}: ${error.message}`);
      }
    }
  }

  console.log(`\n✅ Seeded ${totalCreated} characters across ${realms.length} guilds`);
  return createdCharacters;
}

async function main() {
  try {
    await seedCharacters();
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

module.exports = { seedCharacters };
