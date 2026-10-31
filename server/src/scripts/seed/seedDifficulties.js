const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const difficulties = ['lfr', 'normal', 'heroic', 'mythic'];

(async () => {
  console.log('⚔️  Seeding difficulties...\n');
  const startTime = Date.now();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('📝 Upserting difficulties...');

    let count = 0;
    for (const name of difficulties) {
      await client.query(
        `INSERT INTO difficulties (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name],
      );
      count++;
    }

    await client.query('COMMIT');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Successfully seeded ${count} difficulties in ${duration}s`);

    const result = await client.query('SELECT * FROM difficulties ORDER BY name');
    console.log('📊 Seeded difficulties:');
    result.rows.forEach((row) => {
      console.log(`   - ${row.name}`);
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
})();
