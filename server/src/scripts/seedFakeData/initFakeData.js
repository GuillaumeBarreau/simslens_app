const { seedGuilds } = require('./seedGuilds');
const { seedCharacters } = require('./seedCharacters');
const { seedEvents } = require('./seedEvents');
const { seedInstances } = require('./seedInstances');
const { seedAttendance } = require('./seedAttendance');
const { seedAbsences } = require('./seedAbsences');
const { seedGearSnapshots } = require('./seedGearSnapshots');
const { seedUpgrades } = require('./seedUpgrades');
const { seedWishlists } = require('./seedWishlists');
const { updateCharacterSpecs } = require('./updateCharacterSpecs');
const { seedActivityLogs } = require('./seedActivityLogs');
const { seedDungeonAvailabilities } = require('./seedDungeonAvailabilities');
const { REALM_ID, scopeLabel } = require('./seedScope');

/**
 * Variables d'environnement :
 *   SEED_REALM_ID  restreint tout le seeding à une guilde existante
 *   SEED_OWNER_ID  ajoute votre compte Battle.net comme owner des guildes créées
 */
async function initFakeData() {
  console.log(`🌱 Starting fake data initialization (${scopeLabel()})...\n`);

  try {
    if (REALM_ID) {
      // On alimente une guilde existante : créer les guildes factices n'aurait
      // pas de sens et polluerait la base.
      console.log('🏰 Step 1/9: Seeding guilds... (ignoré, SEED_REALM_ID est défini)\n');
    } else {
      console.log('🏰 Step 1/9: Seeding guilds...');
      await seedGuilds();
      console.log('✅ Guilds seeded successfully\n');
    }

    console.log('⚔️  Step 2/9: Seeding characters...');
    await seedCharacters();
    console.log('✅ Characters seeded successfully\n');

    console.log('🎭 Step 3/9: Updating character specs...');
    await updateCharacterSpecs();
    console.log('✅ Character specs updated successfully\n');

    console.log('🏖️  Step 4/9: Seeding member absences...');
    await seedAbsences();
    console.log('✅ Absences seeded successfully\n');

    console.log('📅 Step 5/9: Seeding raid events...');
    await seedEvents();
    console.log('✅ Events seeded successfully\n');

    console.log('🏟️  Seeding raid instances...');
    await seedInstances();
    console.log('✅ Instances seeded successfully\n');

    console.log('✋ Step 6/9: Seeding attendance...');
    await seedAttendance();
    console.log('✅ Attendance seeded successfully\n');

    console.log('📦 Step 7/9: Seeding gear snapshots...');
    await seedGearSnapshots();
    console.log('✅ Gear snapshots seeded successfully\n');

    console.log('⭐ Step 8/9: Seeding wishlists...');
    await seedWishlists();
    console.log('✅ Wishlists seeded successfully\n');

    console.log('⬆️  Step 9/10: Seeding upgrades...');
    await seedUpgrades();
    console.log('✅ Upgrades seeded successfully\n');

    console.log('📜 Step 10/10: Seeding activity logs...');
    await seedActivityLogs();
    console.log('✅ Activity logs seeded successfully\n');

    console.log('🚪 Seeding dungeon availabilities...');
    await seedDungeonAvailabilities();
    console.log('✅ Dungeon availabilities seeded successfully\n');

    console.log('🎉 All fake data initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing fake data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  initFakeData();
}

module.exports = { initFakeData };
