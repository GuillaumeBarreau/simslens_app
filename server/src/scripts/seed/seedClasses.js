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

const classesJsonPath = path.join(__dirname, '../data/classes.json');

async function seedClasses() {
  console.log('🎮 Seeding classes...');

  const classes = JSON.parse(fs.readFileSync(classesJsonPath, 'utf8'));
  let added = 0;

  for (const cls of classes) {
    if (!cls.name) continue;

    const result = await prisma.classes.upsert({
      where: { name: cls.name },
      update: {},
      create: { name: cls.name },
    });

    if (result) {
      const existing = await prisma.classes.findUnique({ where: { name: cls.name } });
      if (existing) {
        added++;
        console.log(`  ✅ Added class: ${cls.name}`);
      }
    }
  }

  console.log(`✅ Classes seeding complete. ${added} classes processed.`);
}

async function main() {
  try {
    await seedClasses();
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
