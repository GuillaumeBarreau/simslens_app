const fs = require('fs');
const path = require('path');
const { ensureEquippableItems } = require('./ensureEquippableItems');

const bossDataPath = path.join(__dirname, 'boss.json');
const tokenDataPath = path.join(__dirname, 'token_data.json');
const outputPath = path.join(__dirname, 'Equippable-items-app.json');

async function main() {
  const itemIdsToKeep = new Set();

  console.log('📦 Reading boss data...');
  const bossData = JSON.parse(fs.readFileSync(bossDataPath, 'utf8'));
  bossData.forEach((boss) => {
    if (boss.loots && Array.isArray(boss.loots)) {
      boss.loots.forEach((lootId) => itemIdsToKeep.add(lootId));
    }
  });
  console.log(`   Found ${itemIdsToKeep.size} initial IDs from boss loot.`);

  if (fs.existsSync(tokenDataPath)) {
    console.log('📦 Reading token data...');
    const tokenData = JSON.parse(fs.readFileSync(tokenDataPath, 'utf8'));
    tokenData.forEach((token) => {
      if (token.tokenItemId) {
        itemIdsToKeep.add(token.tokenItemId);
      }
      if (token.rewards && Array.isArray(token.rewards)) {
        token.rewards.forEach((reward) => {
          if (reward.itemId) {
            itemIdsToKeep.add(reward.itemId);
          }
        });
      }
    });
    console.log(`   Total unique IDs to keep after adding tokens: ${itemIdsToKeep.size}`);
  } else {
    console.warn('⚠️ token_data.json not found, skipping token items.');
  }

  // Fichier non versionné (SIMS-284) : téléchargé depuis Raidbots s'il manque.
  const allItemsPath = await ensureEquippableItems();

  console.log('📦 Reading all items data...');
  const allItems = JSON.parse(fs.readFileSync(allItemsPath, 'utf8'));

  const filteredItems = allItems.filter((item) => itemIdsToKeep.has(item.id));

  console.log(`✅ Filtered ${filteredItems.length} items out of ${allItems.length} total items.`);

  fs.writeFileSync(outputPath, JSON.stringify(filteredItems, null, 2));
  console.log(`💾 Saved filtered items to ${outputPath}`);
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exitCode = 1;
});
