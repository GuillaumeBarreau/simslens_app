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

const specsJsonPath = path.join(__dirname, '../data/specializations.json');

async function seedSpecializations() {
  console.log('🎯 Seeding specializations...');

  const specs = JSON.parse(fs.readFileSync(specsJsonPath, 'utf8'));
  let added = 0;
  let skipped = 0;

  for (const spec of specs) {
    if (!spec.name || !spec.class || !spec.role) {
      skipped++;
      continue;
    }

    const classRecord = await prisma.classes.findUnique({
      where: { name: spec.class },
    });

    if (!classRecord) {
      console.log(`  ⚠️ Class not found: ${spec.class}`);
      skipped++;
      continue;
    }

    await prisma.specializations.upsert({
      where: {
        name_classId: {
          name: spec.name,
          classId: classRecord.id,
        },
      },
      update: {
        role: spec.role,
        icon: spec.icon || null,
      },
      create: {
        name: spec.name,
        classId: classRecord.id,
        role: spec.role,
        icon: spec.icon || null,
      },
    });

    added++;
  }

  console.log(`✅ Specializations seeding complete. ${added} specs processed, ${skipped} skipped.`);
}

async function main() {
  try {
    await seedSpecializations();
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
