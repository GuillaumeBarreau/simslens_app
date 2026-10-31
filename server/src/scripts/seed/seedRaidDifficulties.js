const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const difficulties = [
  { key: 'lfr', label: 'LFR', description: 'Looking For Raid difficulty.' },
  { key: 'normal', label: 'Normal', description: 'Standard encounter difficulty.' },
  { key: 'heroic', label: 'Heroic', description: 'Increased difficulty for experienced groups.' },
  { key: 'mythic', label: 'Mythic', description: 'Highest challenge, limited availability.' },
];

(async () => {
  console.log('⚔️  Seeding raid_difficulties for all raids...\n');
  const startTime = Date.now();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const raidsResult = await client.query('SELECT id, name FROM raids ORDER BY id');
    const raids = raidsResult.rows;

    console.log(`📋 Found ${raids.length} raid(s) to process\n`);

    let totalCount = 0;
    for (const raid of raids) {
      console.log(`Processing raid: ${raid.name} (ID: ${raid.id})`);

      await client.query('DELETE FROM raid_difficulties WHERE "raidId" = $1', [raid.id]);

      for (const d of difficulties) {
        const imageBase = `ui-ej-${d.key}`;
        await client.query(
          `INSERT INTO raid_difficulties ("raidId", difficulty, description, image_button, image_button_small, image_background)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            raid.id,
            d.key,
            d.description,
            `${imageBase}-button`,
            `${imageBase}-button-small`,
            `${imageBase}-background`,
          ],
        );
        totalCount++;
      }
      console.log(`  ✅ Added ${difficulties.length} difficulties\n`);
    }

    await client.query('COMMIT');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `✅ Successfully seeded ${totalCount} raid_difficulties for ${raids.length} raid(s) in ${duration}s`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
})();
