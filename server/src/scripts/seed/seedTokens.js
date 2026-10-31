const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const tokenData = require('../data/token_data.json');

(async () => {
  console.log('🎫 Seeding token data...\n');
  const startTime = Date.now();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM item_tokens');
    console.log('🗑️  Cleared existing token data');

    let insertCount = 0;

    for (const token of tokenData) {
      if (token.comment) continue;

      const { extension, season, tokenItemId, slot, tokenType, rewards } = token;

      for (const reward of rewards) {
        if (!reward.itemId) continue;

        await client.query(
          `INSERT INTO item_tokens ("tokenItemId", "rewardItemId", class, "armorType", slot, "tokenType", extension, season)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            tokenItemId,
            reward.itemId,
            reward.class,
            reward.armorType,
            slot,
            tokenType,
            extension || '',
            season || '',
          ],
        );
        insertCount++;
      }
    }

    await client.query('COMMIT');

    console.log(`\n✅ Successfully seeded ${insertCount} token mappings`);
    console.log('📊 Summary:');

    const summary = await client.query(`
      SELECT "tokenType", COUNT(DISTINCT "tokenItemId") as "tokenCount", COUNT(*) as "rewardCount"
      FROM item_tokens
      GROUP BY "tokenType"
    `);

    summary.rows.forEach((row) => {
      console.log(`   ${row.tokenType}: ${row.tokenCount} tokens → ${row.rewardCount} rewards`);
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Completed in ${duration}s`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
})();
