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
 * Crée des instances de raid (les « sorties ») avec leurs boss.
 *
 * Sans instance, la page Droptimizer est vide : elle liste `instances` puis
 * `instance_bosses`. Le script ne peut pas passer par l'API (POST /1/instance
 * exige la permission `manage_instance`, qu'aucun rôle ne possède), il écrit
 * donc directement en base.
 *
 * L'extension et la saison ciblées sont celles du front : VITE_WOW_EXTENSION et
 * VITE_CURRENT_SEASON. Sans correspondance, la page resterait vide malgré les
 * instances créées.
 */

const EXTENSION = process.env.SEED_EXTENSION || 'Midnight';
const SEASON = process.env.SEED_SEASON || 'season-01';

// Difficultés à instancier, de la plus récente à la plus ancienne
const PLANS = [
  { difficulty: 'mythic', daysAgo: 2, killRatio: 0.4, status: 'ONGOING' },
  { difficulty: 'heroic', daysAgo: 9, killRatio: 1, status: 'COMPLETED' },
  { difficulty: 'normal', daysAgo: 16, killRatio: 1, status: 'COMPLETED' },
];

async function seedInstances() {
  const deleted = await prisma.instances.deleteMany({ where: byRealm() });
  console.log(`   Deleted ${deleted.count} existing instances`);

  const raid = await prisma.raids.findFirst({
    where: { extension: EXTENSION, season: SEASON },
  });

  if (!raid) {
    console.log(`   ⚠️  Aucun raid pour ${EXTENSION} / ${SEASON} — étape ignorée.`);
    return;
  }

  const bosses = await prisma.bosses.findMany({
    where: { raidName: raid.name, extension: EXTENSION, season: SEASON },
    orderBy: { id: 'asc' },
  });

  if (bosses.length === 0) {
    console.log(`   ⚠️  Aucun boss pour ${raid.name} — étape ignorée.`);
    return;
  }

  const realms = await prisma.realms.findMany({
    where: realmWhere(),
    select: { id: true, guildName: true },
  });
  let total = 0;

  for (const realm of realms) {
    const owner = await prisma.realm_owners.findFirst({ where: { realmId: realm.id } });

    for (const plan of PLANS) {
      const rd = await prisma.raid_difficulties.findFirst({
        where: { raidId: raid.id, difficulty: plan.difficulty },
      });
      if (!rd) continue;

      const date = new Date();
      date.setDate(date.getDate() - plan.daysAgo);
      date.setHours(20, 0, 0, 0);

      const killed = Math.max(1, Math.round(bosses.length * plan.killRatio));

      const instance = await prisma.instances.create({
        data: {
          name: `${raid.name} — ${plan.difficulty}`,
          date,
          raidDifficultyId: rd.id,
          realmId: realm.id,
          // createdBy attend un Int ; les ownerId sont des identifiants Battle.net
          // sous forme de chaîne, d'où le parseInt avec repli.
          createdBy: Number.parseInt(owner?.ownerId, 10) || 1,
          status: plan.status,
          bossesKilled: killed,
          totalBosses: bosses.length,
        },
      });

      await prisma.instance_bosses.createMany({
        data: bosses.map((boss, i) => ({
          instanceId: instance.id,
          bossId: boss.id,
          killed: i < killed,
          killedAt: i < killed ? new Date(date.getTime() + (i + 1) * 15 * 60 * 1000) : null,
        })),
      });

      total++;
      console.log(
        `  ✅ ${realm.guildName} — ${plan.difficulty} : ${killed}/${bosses.length} boss tués`,
      );
    }
  }

  console.log(`🏟️  Done! Seeded ${total} instances sur ${realms.length} realm(s).`);
}

module.exports = { seedInstances };

if (require.main === module) {
  seedInstances()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
