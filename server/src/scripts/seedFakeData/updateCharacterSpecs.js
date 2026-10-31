const { prisma: sharedPrisma } = require('../../data');

/**
 * @param {Object} prismaClient - Optional Prisma client, defaults to shared instance
 */
async function updateCharacterSpecs(prismaClient = sharedPrisma) {
  console.log('🔄 Updating character specs...\n');

  const characters = await prismaClient.characters.findMany({
    where: { archived: 0 },
    select: { id: true, name: true, class: true, spec: true },
  });

  console.log(`Found ${characters.length} active characters\n`);

  let updated = 0;

  for (const character of characters) {
    const classRecord = await prismaClient.classes.findUnique({
      where: { name: character.class },
      include: { specializations: true },
    });

    if (!classRecord || classRecord.specializations.length === 0) {
      console.log(`⚠️  No specs found for class: ${character.class}`);
      continue;
    }

    const specs = classRecord.specializations;
    const randomSpec = specs[Math.floor(Math.random() * specs.length)];

    await prismaClient.characters.update({
      where: { id: character.id },
      data: { spec: randomSpec.name },
    });

    console.log(`✅ ${character.name} (${character.class}) → ${randomSpec.name}`);
    updated++;
  }

  console.log(`\n✅ Updated ${updated} characters with random specs`);
}

if (require.main === module) {
  updateCharacterSpecs()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { updateCharacterSpecs };
