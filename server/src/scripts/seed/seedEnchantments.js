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

const enchantsJsonPath = path.join(__dirname, '../data/enchantments.json');

async function seedEnchantments() {
  console.log('✨ Seeding enchantments...');

  if (!fs.existsSync(enchantsJsonPath)) {
    console.error(`File not found: ${enchantsJsonPath}`);
    return;
  }

  const enchantments = JSON.parse(fs.readFileSync(enchantsJsonPath, 'utf8'));
  console.log(`Loaded ${enchantments.length} enchantments from JSON.`);

  const BATCH_SIZE = 2000;
  let processed = 0;

  for (let i = 0; i < enchantments.length; i += BATCH_SIZE) {
    const batch = enchantments.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];

    batch.forEach((ench, index) => {
      const stats = ench.stats ? JSON.stringify(ench.stats) : null;

      const offset = index * 15;
      values.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`,
      );

      params.push(
        ench.id,
        ench.displayName || '',
        ench.tokenizedName || '',
        ench.spellId || null,
        ench.spellIcon || null,
        ench.itemId || null,
        ench.itemIcon || null,
        ench.quality || null,
        ench.expansion || null,
        ench.craftingQuality || null,
        ench.slot || null,
        ench.socketType || null,
        ench.categoryId || null,
        ench.categoryName || null,
        stats,
      );
    });

    const query = `
      INSERT INTO enchantments (
        id, "displayName", "tokenizedName", "spellId", "spellIcon",
        "itemId", "itemIcon", quality, expansion, "craftingQuality",
        slot, "socketType", "categoryId", "categoryName", stats
      )
      VALUES ${values.join(',')}
      ON CONFLICT (id) DO UPDATE SET
        "displayName" = EXCLUDED."displayName",
        "tokenizedName" = EXCLUDED."tokenizedName",
        "spellId" = EXCLUDED."spellId",
        "spellIcon" = EXCLUDED."spellIcon",
        "itemId" = EXCLUDED."itemId",
        "itemIcon" = EXCLUDED."itemIcon",
        quality = EXCLUDED.quality,
        expansion = EXCLUDED.expansion,
        "craftingQuality" = EXCLUDED."craftingQuality",
        slot = EXCLUDED.slot,
        "socketType" = EXCLUDED."socketType",
        "categoryId" = EXCLUDED."categoryId",
        "categoryName" = EXCLUDED."categoryName",
        stats = EXCLUDED.stats
    `;

    await prisma.$executeRawUnsafe(query, ...params);

    processed += batch.length;
    console.log(`  ...processed ${processed} enchantments`);
  }

  console.log(`✅ Enchantments seeding complete. ${processed} enchantments processed.`);
}

async function main() {
  try {
    await seedEnchantments();
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
