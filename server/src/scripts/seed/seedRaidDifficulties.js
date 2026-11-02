const path = require('path');
const dotenv = require('dotenv');

const { raidDifficultiesFor } = require('./catalog');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Rattache à chaque raid les difficultés de son jeu (SIMS-027) : les quatre pour
 * Retail, `normal` seule pour Forever.
 *
 * Idempotent et non destructif : une difficulté existante est mise à jour en place
 * (son identifiant, et donc les instances et événements qui la référencent, sont
 * conservés). Seules les difficultés que le jeu du raid ne propose pas sont
 * supprimées. Avant, toutes étaient supprimées puis recréées, ce qui supprimait en
 * cascade les instances de raid.
 *
 * @param {{ query: Function }} client - client pg, dans une transaction ouverte par l'appelant
 * @returns {Promise<number>} nombre de difficultés écrites
 */
async function seedRaidDifficulties(client, log = console) {
  const { rows: raids } = await client.query('SELECT id, name, extension FROM raids ORDER BY id');
  log.log(`📋 Found ${raids.length} raid(s) to process\n`);

  let total = 0;
  for (const raid of raids) {
    log.log(`Processing raid: ${raid.name} (ID: ${raid.id})`);
    const difficulties = raidDifficultiesFor(raid.extension);

    await client.query(
      'DELETE FROM raid_difficulties WHERE "raidId" = $1 AND NOT (difficulty = ANY($2::text[]))',
      [raid.id, difficulties.map((d) => d.key)],
    );

    for (const d of difficulties) {
      const imageBase = `ui-ej-${d.key}`;
      await client.query(
        `INSERT INTO raid_difficulties ("raidId", difficulty, description, image_button, image_button_small, image_background)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("raidId", difficulty) DO UPDATE SET
           description = EXCLUDED.description,
           image_button = EXCLUDED.image_button,
           image_button_small = EXCLUDED.image_button_small,
           image_background = EXCLUDED.image_background`,
        [
          raid.id,
          d.key,
          d.description,
          `${imageBase}-button`,
          `${imageBase}-button-small`,
          `${imageBase}-background`,
        ],
      );
      total++;
    }
    log.log(`  ✅ ${difficulties.length} difficulties\n`);
  }
  return total;
}

async function main() {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('⚔️  Seeding raid_difficulties for all raids...\n');
  const startTime = Date.now();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const total = await seedRaidDifficulties(client);
    await client.query('COMMIT');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Successfully seeded ${total} raid_difficulties in ${duration}s`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { seedRaidDifficulties };
