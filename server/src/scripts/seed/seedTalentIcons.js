/**
 * Enrichit les nœuds de talents déjà en base avec le slug d'icône de chaque sort
 * (via l'API media Blizzard), en remplissant `entries[].icon`.
 *
 * À lancer après seedTalentTrees.js. Idempotent : ne recalcule que les icônes
 * manquantes (sauf --force). Le front rend l'icône via
 * https://render.worldofwarcraft.com/<region>/icons/56/<slug>.jpg
 *
 * Usage : node src/scripts/seed/seedTalentIcons.js [region] [--force]
 */
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const { fetchFromAPI, regionHost } = require('../../integrations/blizzard/blizzardToken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const REGION = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'eu';
const FORCE = process.argv.includes('--force');
const CONCURRENCY = 8;
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Extrait le slug d'icône d'une URL Blizzard (".../icons/56/<slug>.jpg"). */
function slugFromUrl(url) {
  const match = url?.match(/\/icons\/\d+\/([^/]+?)\.jpg/i);
  return match ? match[1] : null;
}

/** Résout le slug d'icône d'un sort, avec retry/backoff (l'API rate-limite en 429). */
async function getSpellIconSlug(spellId) {
  const host = regionHost(REGION);
  const url = `https://${host}/data/wow/media/spell/${spellId}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const data = await fetchFromAPI(url, { namespace: `static-${REGION}` }, REGION);
      const icon = (data.assets || []).find((a) => a.key === 'icon');
      return slugFromUrl(icon?.value);
    } catch (err) {
      const status = err?.response?.status;
      // 404 = pas de media pour ce sort : inutile de réessayer.
      if (status === 404) return null;
      if (attempt === MAX_RETRIES - 1) throw err;
      await sleep(2 ** attempt * 300 + Math.random() * 200);
    }
  }
  return null;
}

/** Exécute `worker` sur `items` avec une concurrence bornée. */
async function runPool(items, worker) {
  const queue = [...items];
  let done = 0;
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      await worker(item);
      done += 1;
      if (done % 250 === 0) console.log(`  ... ${done}/${items.length}`);
    }
  });
  await Promise.all(runners);
}

async function seedTalentIcons() {
  console.log(`🎨 Enrichissement des icônes de talents (region=${REGION}, force=${FORCE})...`);

  const nodes = await prisma.talent_nodes.findMany({
    select: { id: true, entries: true },
  });

  const spellIds = new Set();
  for (const node of nodes) {
    for (const entry of node.entries || []) {
      if (entry.spellId != null && (FORCE || !entry.icon)) spellIds.add(entry.spellId);
    }
  }
  console.log(`  ${spellIds.size} sorts à résoudre.`);

  const slugBySpell = new Map();
  let failed = 0;
  await runPool([...spellIds], async (spellId) => {
    try {
      const slug = await getSpellIconSlug(spellId);
      if (slug) slugBySpell.set(spellId, slug);
      else failed += 1;
    } catch {
      failed += 1;
    }
  });
  console.log(`  ${slugBySpell.size} icônes résolues, ${failed} échecs.`);

  let updated = 0;
  for (const node of nodes) {
    let changed = false;
    const entries = (node.entries || []).map((entry) => {
      if (entry.spellId != null && slugBySpell.has(entry.spellId)) {
        const icon = slugBySpell.get(entry.spellId);
        if (entry.icon !== icon) {
          changed = true;
          return { ...entry, icon };
        }
      }
      return entry;
    });
    if (changed) {
      await prisma.talent_nodes.update({ where: { id: node.id }, data: { entries } });
      updated += 1;
    }
  }

  console.log(`🎨 Terminé. ${updated} nœuds mis à jour.`);
}

async function main() {
  try {
    await seedTalentIcons();
  } catch (error) {
    console.error('❌ Erreur pendant l’enrichissement des icônes:', error);
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
