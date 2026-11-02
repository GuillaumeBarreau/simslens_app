const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Guilde de démonstration WoW Forever (SIMS-069, épique #45) : de quoi parcourir l'espace
 * Forever en local — roster de 25 personnages « prénom nom », attunements
 * d'Onyxia à différents stades, listes BiS de guilde, raids de la semaine du
 * 9 décembre (10, 20 et 40 joueurs) avec inscriptions et groupes.
 *
 * Idempotent : la guilde de démo est supprimée puis recréée (cascades), les
 * autres guildes ne sont pas touchées. Prérequis : migrations Forever appliquées
 * et catalogue Forever seedé (seedServers, seedRaid, seedRaidDifficulties, seedBoss).
 *
 *   SEED_OWNER_ID=<id Battle.net> node --import tsx src/scripts/seedFakeData/seedForever.js
 *
 * Sans SEED_OWNER_ID, le propriétaire est un utilisateur factice (900000001),
 * accessible par /auth/dev-login?userId=900000001.
 */

const GUILD = { guildName: 'Les Veilleurs de Nordrassil', server: 'forever-pve', region: 'EU' };
const FAKE_OWNER = '900000001';
const FAKE_OFFICER = '900000002';

/** [prénom nom, classe, spé (nom en base), off-spé ou null] */
const ROSTER = [
  ['Aldric Ventbrume', 'warrior', 'Protection', 'Fury'],
  ['Brann Roc-Ferré', 'warrior', 'Protection', null],
  ['Kaelen Dorépine', 'warrior', 'Fury', 'Arms'],
  ['Mira Lancefeu', 'warrior', 'Arms', null],
  ['Seren Aubeclaire', 'paladin', 'Holy', 'Retribution'],
  ['Tobias Cœurvaillant', 'paladin', 'Protection', 'Holy'],
  ['Elwyn Pierrelune', 'paladin', 'Retribution', null],
  ['Nyssa Feuillevent', 'hunter', 'Marksmanship', null],
  ['Rorik Grisebarbe', 'hunter', 'Beast Mastery', 'Survival'],
  ['Lyra Sombrecime', 'hunter', 'Survival', null],
  ['Vesper Nuitnoire', 'rogue', 'Outlaw', null],
  ['Iselle Lamebrume', 'rogue', 'Assassination', 'Subtlety'],
  ['Corwin Pasfeutré', 'rogue', 'Outlaw', null],
  ['Ilana Clairsoleil', 'priest', 'Holy', 'Discipline'],
  ['Maelis Voilombre', 'priest', 'Shadow', null],
  ['Odran Bénétoile', 'priest', 'Discipline', 'Holy'],
  ['Thorin Marteaugris', 'shaman', 'Restoration', 'Elemental'],
  ['Gwen Orageclair', 'shaman', 'Elemental', null],
  ['Ysolde Flammevive', 'mage', 'Fire', 'Frost'],
  ['Alaric Givrelame', 'mage', 'Frost', null],
  ['Sylas Arcanelle', 'mage', 'Arcane', null],
  ['Morgane Cendrenuit', 'warlock', 'Destruction', 'Affliction'],
  ['Viktor Ombrefiel', 'warlock', 'Affliction', null],
  ['Fenna Ramesylve', 'druid', 'Restoration', 'Balance'],
  ['Bram Griffesauvage', 'druid', 'Guardian', 'Feral'],
];

/** Étapes d'attunement faites (chaîne Alliance : 16 quêtes) : prêts, en route, pas commencés. */
const ATTUNEMENT_STEPS = [
  16, 16, 16, 12, 16, 16, 8, 16, 16, 3, 16, 14, 0, 16, 16, 16, 10, 16, 16, 16, 5, 16, 0, 16, 16,
];

const ROLE_BY_SPEC_ROLE = { tank: 'TANK', healer: 'HEALER', melee: 'DPS', ranged: 'DPS' };

/** Prochain jour de la semaine (0 = dimanche) à 21:00, à partir du 9 décembre 2026. */
function raidNight(dayOfWeek) {
  const start = new Date(Date.UTC(2026, 11, 9, 20, 0, 0)); // mercredi 9/12, 21:00 Paris
  const delta = (dayOfWeek - start.getUTCDay() + 7) % 7;
  return new Date(start.getTime() + delta * 24 * 3600 * 1000);
}

async function seedForever(prisma) {
  const ownerId = process.env.SEED_OWNER_ID || FAKE_OWNER;

  const server = await prisma.servers.findFirst({
    where: { slug: GUILD.server, region: GUILD.region, game: 'forever' },
  });
  if (!server)
    throw new Error('Serveur forever-pve introuvable : appliquer la migration add_game_axis');

  const raids = await prisma.raids.findMany({
    where: { extension: 'Forever', season: 'tier-1' },
    include: { raid_difficulties: true },
    orderBy: { id: 'asc' },
  });
  if (raids.length < 3)
    throw new Error('Catalogue Forever absent : lancer seedRaid et seedRaidDifficulties');

  // Recrée la guilde de démo (cascades : personnages rattachés gardés en SetNull, on les supprime aussi).
  const previous = await prisma.realms.findFirst({
    where: { guildName: GUILD.guildName, server: GUILD.server, region: GUILD.region },
  });
  if (previous) {
    await prisma.characters.deleteMany({ where: { realmId: previous.id } });
    await prisma.realms.delete({ where: { id: previous.id } });
  }

  const realm = await prisma.realms.create({
    data: { ...GUILD, createdBy: 0, game: 'forever', timezone: 'Europe/Paris' },
  });
  await prisma.realm_owners.createMany({
    data: [
      { realmId: realm.id, ownerId, role: 'owner' },
      ...(ownerId === FAKE_OFFICER
        ? []
        : [{ realmId: realm.id, ownerId: FAKE_OFFICER, role: 'admin' }]),
    ],
  });
  console.log(`  🏰 ${GUILD.guildName} (#${realm.id}, forever-pve EU), propriétaire ${ownerId}`);

  const specs = await prisma.specializations.findMany({ include: { class: true } });
  const specOf = (cls, name) => specs.find((s) => s.class.name === cls && s.name === name);

  const characters = [];
  for (const [index, [name, cls, specName, offSpecName]] of ROSTER.entries()) {
    const spec = specOf(cls, specName);
    const offSpec = offSpecName ? specOf(cls, offSpecName) : null;
    const character = await prisma.characters.create({
      data: {
        name,
        class: cls,
        realm: GUILD.server,
        region: GUILD.region,
        realmId: realm.id,
        userId: index === 0 ? ownerId : String(900000100 + index),
        status: 'approved',
        lastModified: new Date(),
        spec: specName,
        specializationId: spec?.id ?? null,
        ...(offSpec ? { offspecs: { create: [{ specializationId: offSpec.id }] } } : {}),
      },
    });
    characters.push({ ...character, specRole: spec?.role ?? 'melee' });
  }
  console.log(`  ⚔️  ${characters.length} personnages`);

  await prisma.character_attunements.createMany({
    data: characters.map((c, i) => ({
      characterId: c.id,
      attunement: 'drakefire_amulet',
      faction: 'alliance',
      completedSteps: ATTUNEMENT_STEPS[i],
      completedAt: ATTUNEMENT_STEPS[i] === 16 ? new Date('2026-12-01T20:00:00Z') : null,
    })),
  });
  console.log(
    `  🔑 attunements (${ATTUNEMENT_STEPS.filter((s) => s === 16).length} prêts sur ${characters.length})`,
  );

  // Listes BiS de guilde : objets d'exemple (identifiants Wowhead Forever), marqués comme démo.
  const demo = 'Démo — à remplacer par la liste de la guilde';
  const bis = [
    ['warrior', 'Protection', 'head', [280910, 280905]],
    ['warrior', 'Protection', 'chest', [280908]],
    ['druid', 'Guardian', 'head', [8345, 280986]],
    ['priest', 'Holy', 'chest', [280912]],
    ['mage', 'Fire', 'head', [280455, 280450]],
  ];
  for (const [cls, specName, slot, itemIds] of bis) {
    const spec = specOf(cls, specName);
    if (!spec) continue;
    await prisma.bis_list_entries.createMany({
      data: itemIds.map((itemId, i) => ({
        realmId: realm.id,
        specializationId: spec.id,
        season: 'tier-1',
        slot,
        rank: i + 1,
        itemId,
        note: i === 0 ? demo : null,
        updatedBy: ownerId,
      })),
    });
  }
  console.log(`  ⭐ ${bis.length} emplacements BiS de démo`);

  // Raids de la semaine d'ouverture : mercredi Barrow Deeps (10), jeudi Hyjal (20), dimanche Onyxia (40).
  const plan = [
    ['The Barrow Deeps', 3, 10],
    ['Hyjal Summit', 4, 20],
    ["Onyxia's Lair", 0, 25],
  ];
  for (const [raidName, day, signups] of plan) {
    const raid = raids.find((r) => r.name === raidName);
    const difficulty = raid.raid_difficulties.find((d) => d.difficulty === 'normal');
    const startTime = raidNight(day);
    const event = await prisma.raid_events.create({
      data: {
        title: raidName,
        startTime,
        endTime: new Date(startTime.getTime() + 3 * 3600 * 1000),
        raidDifficultyId: difficulty.id,
        realmId: realm.id,
        createdBy: ownerId,
      },
    });
    const present = characters.slice(0, signups);
    await prisma.raid_signups.createMany({
      data: present.map((c) => ({
        eventId: event.id,
        characterId: c.id,
        status: 'PRESENT',
        role: ROLE_BY_SPEC_ROLE[c.specRole] ?? 'DPS',
      })),
    });
    const bosses = await prisma.bosses.findMany({
      where: { extension: 'Forever', season: 'tier-1', raidName },
      orderBy: { order: 'asc' },
      take: 1,
    });
    if (bosses[0]) {
      // Onyxia : 25 inscrits placés pour 40 places ; les autres raids pleins.
      await prisma.event_roster_assignments.createMany({
        data: present.map((c, position) => ({
          eventId: event.id,
          characterId: c.id,
          bossId: bosses[0].id,
          role: ROLE_BY_SPEC_ROLE[c.specRole] ?? 'DPS',
          position,
        })),
      });
    }
    console.log(`  📅 ${raidName} — ${startTime.toISOString().slice(0, 10)}, ${signups} inscrits`);
  }

  return realm;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    console.log('🌲 Données de démo WoW Forever...');
    const realm = await seedForever(prisma);
    console.log(
      `✅ Guilde Forever prête : /${encodeURIComponent(realm.guildName)}/Forever/my-activity (ou via le logo)`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌', error);
    process.exit(1);
  });
}

module.exports = { seedForever };
