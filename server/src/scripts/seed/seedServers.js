const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const serverEuPath = path.join(__dirname, '../data/servers/server_eu.json');

/** Régions créées par seedRegions.js où Forever est jouable. */
const FOREVER_REGIONS = ['EU', 'NA', 'KR', 'TW'];
const FOREVER_SERVERS = [
  ['Forever PvE', 'forever-pve'],
  ['Forever PvP', 'forever-pvp'],
];

async function seedServers() {
  console.log('🌍 Seeding servers...');

  if (!fs.existsSync(serverEuPath)) {
    console.error('Fichier server_eu.json introuvable:', serverEuPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(serverEuPath, 'utf8'));
  const servers = data.Realms;

  servers.push({
    name: 'Local',
    slug: 'local',
    locale: 'en-GB',
    category: 'Local',
    region: 'EU',
  });

  // WoW Forever : un serveur unifié PvE ou PvP par région (SIMS-019). La
  // migration les crée sur une base déjà remplie ; ici pour une base neuve.
  for (const region of FOREVER_REGIONS) {
    for (const [name, slug] of FOREVER_SERVERS) {
      servers.push({ name, slug, locale: 'en-GB', category: 'Forever', region, game: 'forever' });
    }
  }

  if (!servers || servers.length === 0) {
    console.log('Aucun serveur à ajouter.');
    return;
  }

  let added = 0;

  for (const server of servers) {
    await prisma.servers.upsert({
      where: {
        slug_region: {
          slug: server.slug,
          region: server.region,
        },
      },
      update: {
        name: server.name,
        locale: server.locale,
        category: server.category,
        game: server.game || 'retail',
      },
      create: {
        name: server.name,
        slug: server.slug,
        locale: server.locale,
        category: server.category,
        region: server.region,
        game: server.game || 'retail',
      },
    });
    added++;
  }

  console.log(`✅ Servers seeding complete. ${added} servers processed.`);
}

async function main() {
  try {
    await seedServers();
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
