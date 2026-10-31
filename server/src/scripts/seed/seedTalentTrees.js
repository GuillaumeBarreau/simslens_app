/**
 * Ingestion des arbres de talents depuis l'API Blizzard (Game Data, namespace static-*).
 *
 * Pour chaque spécialisation présente en base :
 *   1. résout son playable specialization id + talentTreeId Blizzard,
 *   2. récupère l'arbre complet (nœuds classe + spé + héros, avec positions),
 *   3. upsert talent_trees / talent_hero_subtrees / talent_nodes.
 *
 * Idempotent : relançable à chaque patch WoW pour rafraîchir les arbres.
 *
 * Usage : node src/scripts/seed/seedTalentTrees.js [region] [locale]
 */
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const {
  getPlayableSpecializationIndex,
  getPlayableSpecialization,
  getTalentTreeForSpec,
} = require('../../integrations/blizzard/api');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const REGION = process.argv[2] || 'eu';
const LOCALE = process.argv[3] || 'en_GB';

// Clé de correspondance insensible à la casse ET à la ponctuation :
// "death_knight" (base) == "Death Knight" (Blizzard).
const norm = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Extrait le talentTreeId d'une href ".../talent-tree/850/playable-specialization/71?...". */
function treeIdFromHref(href) {
  if (!href) return null;
  const match = href.match(/\/talent-tree\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Normalise un nœud Blizzard vers notre modèle.
 * Gère les nœuds simples (un talent) et les nœuds de choix (plusieurs entries).
 */
function parseNode(node, nodeType, heroSubTreeId = null) {
  const ranks = Array.isArray(node.ranks) ? node.ranks : [];
  const entries = [];

  const pushEntry = (tooltip, index) => {
    if (!tooltip) return;
    const talent = tooltip.talent || {};
    const spell = tooltip.spell_tooltip?.spell || {};
    entries.push({
      talentId: talent.id ?? null,
      spellId: spell.id ?? null,
      name: talent.name ?? spell.name ?? null,
      icon: null, // résolu ultérieurement via l'API media du sort
      index,
    });
  };

  // On dérive les entries du premier rang (les rangs suivants ne changent que la valeur).
  const firstRank = ranks[0] || {};
  if (Array.isArray(firstRank.choice_of_tooltips) && firstRank.choice_of_tooltips.length > 0) {
    firstRank.choice_of_tooltips.forEach((tt, i) => {
      pushEntry(tt, i);
    });
  } else {
    pushEntry(firstRank.tooltip, 0);
  }

  return {
    blizzardNodeId: node.id,
    nodeType,
    displayRow: node.display_row ?? 0,
    displayCol: node.display_col ?? 0,
    maxRank: ranks.length || 1,
    heroSubTreeId,
    entries,
    unlockNodeIds: Array.isArray(node.unlocks) ? node.unlocks : [],
  };
}

/** Construit l'index { "classname|specname" -> { specId, talentTreeId } } depuis Blizzard. */
async function buildBlizzardSpecIndex() {
  const index = await getPlayableSpecializationIndex(REGION, LOCALE);
  const specs = index.character_specializations || [];
  const map = new Map();

  for (const specRef of specs) {
    const specId = specRef.id;
    try {
      const detail = await getPlayableSpecialization(specId, REGION, LOCALE);
      const className = detail.playable_class?.name;
      const specName = detail.name;
      const talentTreeId = treeIdFromHref(detail.spec_talent_tree?.key?.href);
      if (!className || !specName || !talentTreeId) {
        console.warn(`  ⚠️ Spec ${specId} incomplète (class/nom/tree manquant), ignorée`);
        continue;
      }
      map.set(`${norm(className)}|${norm(specName)}`, { specId, talentTreeId });
    } catch (err) {
      console.warn(`  ⚠️ Échec détail spec ${specId}: ${err.message}`);
    }
  }

  return map;
}

async function ingestSpecTree(dbSpec, blizzard) {
  const { specId, talentTreeId } = blizzard;
  const tree = await getTalentTreeForSpec(talentTreeId, specId, REGION, LOCALE);

  // 1. Upsert l'arbre + mapping sur la spécialisation.
  const talentTree = await prisma.talent_trees.upsert({
    where: { specializationId: dbSpec.id },
    update: { blizzardTreeId: talentTreeId, blizzardSpecId: specId },
    create: {
      specializationId: dbSpec.id,
      blizzardTreeId: talentTreeId,
      blizzardSpecId: specId,
    },
  });

  await prisma.specializations.update({
    where: { id: dbSpec.id },
    data: { blizzardSpecId: specId, talentTreeId },
  });

  // 2. On repart d'un arbre propre (idempotence).
  await prisma.talent_nodes.deleteMany({ where: { treeId: talentTree.id } });
  await prisma.talent_hero_subtrees.deleteMany({ where: { treeId: talentTree.id } });

  // 3. Sous-arbres héros + leurs nœuds. On les traite en premier car Blizzard
  //    liste parfois un même nœud héros aussi dans spec_talent_nodes : la
  //    classification héros (panneau dédié) fait autorité.
  const heroNodes = [];
  const heroNodeIds = new Set();
  for (const heroTree of tree.hero_talent_trees || []) {
    const subTree = await prisma.talent_hero_subtrees.create({
      data: { treeId: talentTree.id, blizzardId: heroTree.id, name: heroTree.name || 'Hero' },
    });
    for (const n of heroTree.hero_talent_nodes || []) {
      heroNodes.push(parseNode(n, 'HERO', subTree.id));
      heroNodeIds.add(n.id);
    }
  }

  // 4. Nœuds classe + spé (on retire les nœuds héros dupliqués dans la liste spé).
  const classNodes = (tree.class_talent_nodes || []).map((n) => parseNode(n, 'CLASS'));
  const specNodes = (tree.spec_talent_nodes || [])
    .filter((n) => !heroNodeIds.has(n.id))
    .map((n) => parseNode(n, 'SPEC'));

  // Filet de sécurité : unicité par blizzardNodeId (priorité classe > spé > héros).
  const byId = new Map();
  for (const node of [...classNodes, ...specNodes, ...heroNodes]) {
    if (!byId.has(node.blizzardNodeId)) byId.set(node.blizzardNodeId, node);
  }
  const allNodes = [...byId.values()];

  if (allNodes.length > 0) {
    await prisma.talent_nodes.createMany({
      data: allNodes.map((n) => ({ ...n, treeId: talentTree.id })),
    });
  }

  return { class: classNodes.length, spec: specNodes.length, hero: heroNodes.length };
}

async function seedTalentTrees() {
  console.log(`🌳 Ingestion des arbres de talents (region=${REGION}, locale=${LOCALE})...`);

  const dbSpecs = await prisma.specializations.findMany({ include: { class: true } });
  console.log(`  ${dbSpecs.length} spécialisations en base.`);

  console.log('  Résolution du mapping Blizzard...');
  const blizzardIndex = await buildBlizzardSpecIndex();
  console.log(`  ${blizzardIndex.size} spécialisations résolues côté Blizzard.`);

  let ingested = 0;
  let skipped = 0;

  for (const dbSpec of dbSpecs) {
    const key = `${norm(dbSpec.class?.name)}|${norm(dbSpec.name)}`;
    const blizzard = blizzardIndex.get(key);
    if (!blizzard) {
      console.warn(
        `  ⚠️ Pas de correspondance Blizzard pour ${dbSpec.class?.name} / ${dbSpec.name}`,
      );
      skipped++;
      continue;
    }
    try {
      const counts = await ingestSpecTree(dbSpec, blizzard);
      console.log(
        `  ✅ ${dbSpec.class?.name} / ${dbSpec.name} — ${counts.class} classe, ${counts.spec} spé, ${counts.hero} héros`,
      );
      ingested++;
    } catch (err) {
      console.error(`  ❌ ${dbSpec.class?.name} / ${dbSpec.name}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`🌳 Terminé. ${ingested} arbres ingérés, ${skipped} ignorés.`);
}

async function main() {
  try {
    await seedTalentTrees();
  } catch (error) {
    console.error('❌ Erreur pendant l’ingestion des talents:', error);
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
