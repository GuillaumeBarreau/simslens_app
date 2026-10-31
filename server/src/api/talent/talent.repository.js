const { prisma } = require('../../data');

/**
 * Récupère l'arbre de talents d'une spécialisation, prêt pour le rendu :
 * nœuds groupés par type + sous-arbres héros.
 */
async function getTalentTree(specializationId) {
  const tree = await prisma.talent_trees.findUnique({
    where: { specializationId: parseInt(specializationId, 10) },
    include: {
      heroSubTrees: {
        select: { id: true, blizzardId: true, name: true },
        orderBy: { name: 'asc' },
      },
      nodes: {
        select: {
          blizzardNodeId: true,
          nodeType: true,
          displayRow: true,
          displayCol: true,
          maxRank: true,
          heroSubTreeId: true,
          entries: true,
          unlockNodeIds: true,
        },
      },
    },
  });

  if (!tree) return null;

  return {
    specializationId: tree.specializationId,
    blizzardTreeId: tree.blizzardTreeId,
    blizzardSpecId: tree.blizzardSpecId,
    heroSubTrees: tree.heroSubTrees,
    nodes: {
      class: tree.nodes.filter((n) => n.nodeType === 'CLASS'),
      spec: tree.nodes.filter((n) => n.nodeType === 'SPEC'),
      hero: tree.nodes.filter((n) => n.nodeType === 'HERO'),
    },
  };
}

async function getLoadout(characterId, specializationId) {
  return prisma.character_talent_loadouts.findUnique({
    where: {
      characterId_specializationId: {
        characterId: parseInt(characterId, 10),
        specializationId: parseInt(specializationId, 10),
      },
    },
  });
}

async function saveLoadout(
  characterId,
  specializationId,
  { selectedNodes, exportString, label, source },
) {
  const cId = parseInt(characterId, 10);
  const sId = parseInt(specializationId, 10);

  return prisma.character_talent_loadouts.upsert({
    where: { characterId_specializationId: { characterId: cId, specializationId: sId } },
    update: {
      selectedNodes,
      exportString: exportString ?? null,
      label: label ?? null,
      source: source ?? 'manual',
    },
    create: {
      characterId: cId,
      specializationId: sId,
      selectedNodes,
      exportString: exportString ?? null,
      label: label ?? null,
      source: source ?? 'manual',
    },
  });
}

/**
 * Renvoie la spé + sa correspondance Blizzard, en garantissant qu'elle
 * appartient bien à la classe du personnage.
 */
async function getSpecForCharacter(characterId, specializationId) {
  const character = await prisma.characters.findUnique({
    where: { id: parseInt(characterId, 10) },
    select: { name: true, realm: true, region: true, classes: { select: { id: true } } },
  });
  if (!character) return null;

  const spec = await prisma.specializations.findUnique({
    where: { id: parseInt(specializationId, 10) },
    select: { id: true, name: true, classId: true, blizzardSpecId: true },
  });
  if (!spec || spec.classId !== character.classes.id) return null;

  return { character, spec };
}

/**
 * Nœuds de l'arbre d'une spé, avec leurs entries — pour résoudre les
 * sélections Blizzard (notamment les nœuds de choix) lors de l'import.
 */
async function getNodesForSpec(specializationId) {
  const tree = await prisma.talent_trees.findUnique({
    where: { specializationId: parseInt(specializationId, 10) },
    select: {
      nodes: { select: { blizzardNodeId: true, entries: true, maxRank: true } },
    },
  });
  return tree?.nodes ?? [];
}

module.exports = {
  getTalentTree,
  getLoadout,
  saveLoadout,
  getSpecForCharacter,
  getNodesForSpec,
};
