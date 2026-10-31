require('dotenv').config();
const { prisma } = require('../data');
const { getCharacterMountsCollection } = require('../integrations/blizzard/api');

const MOUNT_ID = 2569;

async function checkMissingMounts() {
  console.log(`Checking for missing mount ID: ${MOUNT_ID} (Unbound Star-Eater)...`);

  try {
    const characters = await prisma.characters.findMany({
      where: {
        archived: 0, // Only check active characters (0 for false)
        status: { not: 'archived' },
      },
      select: {
        id: true,
        name: true,
        realm: true,
        region: true,
      },
    });

    console.log(`Found ${characters.length} active characters.`);

    const missingMount = [];
    const errors = [];

    for (const char of characters) {
      try {
        const mountsData = await getCharacterMountsCollection(
          char.region || 'eu',
          char.realm,
          char.name,
        );

        const hasMount = mountsData?.mounts?.some((m) => m.mount.id === MOUNT_ID);

        if (!hasMount) {
          missingMount.push(char.name);
          console.log(`❌ ${char.name} does NOT have the mount.`);
        }

        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        console.error(`Error checking ${char.name}: ${err.message}`);
        errors.push({ name: char.name, error: err.message });
      }
    }

    console.log('\n--- SUMMARY ---');
    console.log(`Total Checked: ${characters.length}`);
    console.log(`Missing Mount: ${missingMount.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log('\n--- PLAYERS MISSING MOUNT ---');
    console.log(JSON.stringify(missingMount, null, 2));
  } catch (err) {
    console.error('Script error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingMounts();
