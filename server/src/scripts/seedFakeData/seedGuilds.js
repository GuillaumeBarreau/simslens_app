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

/**
 * Creates 4-5 guilds across different servers and regions
 */
async function seedGuilds() {
  console.log('🏰 Seeding guilds (realms)...\n');

  const guilds = [
    {
      server: 'Hyjal',
      region: 'EU',
      guildName: 'Les Gardiens du Temps',
      createdBy: 1,
      discordGuildId: 'fake_discord_guild_1',
      ownerId: 'user_fake_owner_1',
      ownerRole: 'owner',
    },
    {
      server: 'Archimonde',
      region: 'EU',
      guildName: 'Eternal Legends',
      createdBy: 2,
      discordGuildId: 'fake_discord_guild_2',
      ownerId: 'user_fake_owner_2',
      ownerRole: 'owner',
    },
    {
      server: 'Kazzak',
      region: 'EU',
      guildName: 'Mythic Raiders',
      createdBy: 3,
      discordGuildId: 'fake_discord_guild_3',
      ownerId: 'user_fake_owner_3',
      ownerRole: 'owner',
    },
    {
      server: 'Ragnaros',
      region: 'EU',
      guildName: 'Shadow Covenant',
      createdBy: 4,
      discordGuildId: 'fake_discord_guild_4',
      ownerId: 'user_fake_owner_4',
      ownerRole: 'owner',
    },
    {
      server: 'Draenor',
      region: 'EU',
      guildName: 'Apex Predators',
      createdBy: 5,
      discordGuildId: 'fake_discord_guild_5',
      ownerId: 'user_fake_owner_5',
      ownerRole: 'owner',
    },
  ];

  const createdRealms = [];

  for (const guild of guilds) {
    try {
      // realms.server référence servers(slug, region), pas le nom d'affichage :
      // 'Hyjal' doit devenir 'hyjal'. On résout le slug en base plutôt que de le
      // deviner, pour échouer clairement si le serveur n'a pas été importé.
      const server = await prisma.servers.findFirst({
        where: { region: guild.region, OR: [{ name: guild.server }, { slug: guild.server }] },
        select: { slug: true },
      });

      if (!server) {
        console.error(
          `❌ Serveur "${guild.server}" (${guild.region}) absent de la table servers. ` +
            `Lancez d'abord "npm run server:init-data".`,
        );
        continue;
      }

      const serverSlug = server.slug;

      const realm = await prisma.realms.upsert({
        where: {
          region_server_guildName: {
            region: guild.region,
            server: serverSlug,
            guildName: guild.guildName,
          },
        },
        update: {
          discordGuildId: guild.discordGuildId,
        },
        create: {
          server: serverSlug,
          region: guild.region,
          guildName: guild.guildName,
          createdBy: guild.createdBy,
          discordGuildId: guild.discordGuildId,
        },
      });

      await prisma.realm_owners.upsert({
        where: {
          realmId_ownerId: {
            realmId: realm.id,
            ownerId: guild.ownerId,
          },
        },
        update: {},
        create: {
          realmId: realm.id,
          ownerId: guild.ownerId,
          role: guild.ownerRole,
        },
      });

      // Les guildes générées appartiennent à des propriétaires fictifs : sans
      // ceci, votre compte Battle.net n'est membre d'aucune et l'application
      // reste vide. Renseignez SEED_OWNER_ID avec votre identifiant Battle.net
      // pour être ajouté comme owner de chaque guilde générée.
      if (process.env.SEED_OWNER_ID) {
        await prisma.realm_owners.upsert({
          where: {
            realmId_ownerId: { realmId: realm.id, ownerId: process.env.SEED_OWNER_ID },
          },
          update: { role: 'owner' },
          create: { realmId: realm.id, ownerId: process.env.SEED_OWNER_ID, role: 'owner' },
        });
      }

      const additionalRoles = [
        { ownerId: `user_fake_admin_${realm.id}_1`, role: 'admin' },
        { ownerId: `user_fake_admin_${realm.id}_2`, role: 'admin' },
        { ownerId: `user_fake_mod_${realm.id}_1`, role: 'moderator' },
      ];

      for (const roleData of additionalRoles) {
        await prisma.realm_owners.upsert({
          where: {
            realmId_ownerId: {
              realmId: realm.id,
              ownerId: roleData.ownerId,
            },
          },
          update: {},
          create: {
            realmId: realm.id,
            ownerId: roleData.ownerId,
            role: roleData.role,
          },
        });
      }

      createdRealms.push(realm);
      console.log(
        `✅ Created guild: ${guild.guildName} on ${guild.server}-${guild.region} (ID: ${realm.id})`,
      );
      console.log(`   └─ Owner: ${guild.ownerId}, Admins: 2, Moderators: 1`);
    } catch (error) {
      console.log(`❌ Error creating guild ${guild.guildName}: ${error.message}`);
    }
  }

  console.log(`\n✅ Seeded ${createdRealms.length} guilds successfully`);
  return createdRealms;
}

async function main() {
  try {
    await seedGuilds();
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

module.exports = { seedGuilds };
