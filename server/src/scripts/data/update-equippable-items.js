const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const {
  SOURCE_URL,
  DEFAULT_TARGET_PATH: targetPath,
  download,
  assertDownloadSize,
  assertItemsShape,
  moveFile,
} = require('./ensureEquippableItems');

// Sauvegarde hors du dépôt (SIMS-284) : l'ancien .bak, voisin du fichier, était versionnable.
const backupPath = path.join(os.tmpdir(), 'equippable-items.json.bak');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--check');
const force = args.has('--force');

function fileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function summarizeDiff(currentItems, newItems) {
  const currentMap = new Map(currentItems.map((i) => [i.id, i]));
  const newMap = new Map(newItems.map((i) => [i.id, i]));

  const added = [];
  const removed = [];
  let modified = 0;

  for (const [id, item] of newMap) {
    if (!currentMap.has(id)) added.push(item);
    else if (JSON.stringify(currentMap.get(id)) !== JSON.stringify(item)) modified++;
  }
  for (const [id, item] of currentMap) {
    if (!newMap.has(id)) removed.push(item);
  }

  return { added, removed, modified };
}

/** Exécute `check` ; en cas d'échec, supprime le fichier temporaire avant de relancer. */
function checkOrDiscard(tmpPath, check) {
  try {
    return check();
  } catch (err) {
    fs.unlinkSync(tmpPath);
    throw err;
  }
}

async function main() {
  console.log(`📥 Downloading ${SOURCE_URL}`);
  const tmpPath = path.join(os.tmpdir(), `equippable-items-${process.pid}.json`);
  await download(SOURCE_URL, tmpPath);

  const tmpSize = checkOrDiscard(tmpPath, () => assertDownloadSize(tmpPath));
  console.log(`   Downloaded ${(tmpSize / 1024 / 1024).toFixed(1)} MB`);

  if (!fs.existsSync(targetPath)) {
    console.log('ℹ️  No existing local file — installing fresh copy.');
    checkOrDiscard(tmpPath, () => assertItemsShape(JSON.parse(fs.readFileSync(tmpPath, 'utf8'))));
    if (dryRun) {
      console.log('🧪 Dry-run: not writing.');
      fs.unlinkSync(tmpPath);
      return;
    }
    moveFile(tmpPath, targetPath);
    console.log(`✅ Installed ${targetPath}`);
    return;
  }

  const [currentHash, newHash] = await Promise.all([fileHash(targetPath), fileHash(tmpPath)]);
  console.log(`   current md5: ${currentHash}`);
  console.log(`   remote  md5: ${newHash}`);

  if (currentHash === newHash) {
    console.log('✅ Already up to date — no replacement needed.');
    fs.unlinkSync(tmpPath);
    return;
  }

  console.log('🔍 Computing diff...');
  const currentItems = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  const newItems = checkOrDiscard(tmpPath, () =>
    assertItemsShape(JSON.parse(fs.readFileSync(tmpPath, 'utf8'))),
  );

  const { added, removed, modified } = summarizeDiff(currentItems, newItems);
  console.log(`   total: ${currentItems.length} → ${newItems.length}`);
  console.log(`   added: ${added.length}, removed: ${removed.length}, modified: ${modified}`);

  const preview = (label, list) => {
    if (!list.length) return;
    console.log(`\n   --- ${label} (showing up to 15) ---`);
    list
      .slice(0, 15)
      .forEach((i) => console.log(`     ${i.id}  ${i.name}  ilvl=${i.itemLevel ?? '?'}`));
    if (list.length > 15) console.log(`     ... +${list.length - 15} more`);
  };
  preview('Added', added);
  preview('Removed', removed);

  if (dryRun) {
    console.log('\n🧪 Dry-run: not writing. Re-run without --dry-run to apply.');
    fs.unlinkSync(tmpPath);
    return;
  }

  if (
    !force &&
    (removed.length > newItems.length * 0.1 || newItems.length < currentItems.length * 0.9)
  ) {
    fs.unlinkSync(tmpPath);
    throw new Error(`Sanity check failed: remote drops >10% of items. Use --force to override.`);
  }

  console.log(`\n💾 Backing up current → ${backupPath}`);
  fs.copyFileSync(targetPath, backupPath);

  console.log(`💾 Replacing ${path.basename(targetPath)}`);
  moveFile(tmpPath, targetPath);

  console.log('✅ Update complete.');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
