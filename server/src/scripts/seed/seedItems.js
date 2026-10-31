const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const { ensureEquippableItems } = require('../data/ensureEquippableItems');

async function seedItems() {
  console.log('⚔️  Seeding items...');
  console.time('ItemsImport');

  // Fichier non versionné (SIMS-284) : téléchargé depuis Raidbots s'il manque. En cas
  // d'échec (réseau indisponible), l'erreur remonte et initData s'arrête à l'étape « items ».
  const itemsJsonPath = await ensureEquippableItems();

  const items = JSON.parse(fs.readFileSync(itemsJsonPath, 'utf8'));
  const BATCH_SIZE = 5000;
  let processed = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const values = batch
      .map((item) => {
        const allowableClasses =
          Array.isArray(item.allowableClasses) && item.allowableClasses.length > 0
            ? `'${JSON.stringify(item.allowableClasses).replace(/'/g, "''")}'`
            : 'NULL';

        const name = (item.name || 'unknown').replace(/'/g, "''");
        const icon = (item.icon || 'unknown').replace(/'/g, "''");
        const quality = item.quality || 0;
        const itemLevel = item.itemLevel ?? item.itemlevel ?? 0;
        const inventoryType = item.inventoryType ?? 'NULL';
        const itemClass = item.itemClass ?? 'NULL';
        const itemSubClass = item.itemSubClass ?? 'NULL';

        return `(${item.id}, '${name}', '${icon}', ${quality}, ${itemLevel}, ${inventoryType}, ${itemClass}, ${itemSubClass}, ${allowableClasses})`;
      })
      .join(',');

    const query = `
      INSERT INTO items (id, name, icon, quality, "itemLevel", "inventoryType", "itemClass", "itemSubClass", "allowableClasses")
      VALUES ${values}
      ON CONFLICT (id) DO NOTHING;
    `;

    await prisma.$executeRawUnsafe(query);
    processed += batch.length;
  }

  console.timeEnd('ItemsImport');
  console.log(`✅ Items seeding complete. ${processed} items processed.`);
}

async function main() {
  try {
    await seedItems();
  } catch (error) {
    console.error('❌ Error seeding items:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
