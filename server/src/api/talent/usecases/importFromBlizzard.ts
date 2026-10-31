import createError from 'http-errors';

const talentRepo = require('../talent.repository');
const { getCharacterSpecializations } = require('../../../integrations/blizzard/api');

interface BlizzardSelectedTalent {
  id: number;
  rank: number;
  tooltip?: { talent?: { id?: number } };
}

interface NodeEntry {
  talentId: number | null;
  index: number;
}

interface SpecNode {
  blizzardNodeId: number;
  entries: NodeEntry[];
  maxRank: number;
}

type SelectedNodes = Record<string, { rank: number; choiceIndex?: number }>;

/**
 * Convertit les talents sélectionnés renvoyés par Blizzard en notre format.
 * Le `id` d'un talent sélectionné est le node id pour un nœud simple ; pour un
 * nœud de choix, Blizzard renvoie l'id du talent choisi, qu'on résout via les
 * entries du nœud (ce qui donne aussi le choiceIndex).
 */
function resolveSelections(selected: BlizzardSelectedTalent[], nodes: SpecNode[]): SelectedNodes {
  const nodeById = new Map(nodes.map((n) => [n.blizzardNodeId, n]));
  const nodeByTalentId = new Map<number, { nodeId: number; choiceIndex: number }>();
  for (const node of nodes) {
    for (const entry of node.entries || []) {
      if (entry.talentId != null) {
        nodeByTalentId.set(entry.talentId, {
          nodeId: node.blizzardNodeId,
          choiceIndex: entry.index,
        });
      }
    }
  }

  // Pour un nœud de choix, retrouve l'option (index) via le talent choisi.
  const choiceIndexFor = (node: SpecNode, talentId?: number): number | undefined => {
    if ((node.entries || []).length <= 1) return undefined;
    const idx = node.entries.findIndex((e) => e.talentId === talentId);
    return idx >= 0 ? idx : undefined;
  };

  const result: SelectedNodes = {};
  for (const talent of selected) {
    const rank = talent.rank || 1;
    const talentId = talent.tooltip?.talent?.id;

    // Cas courant : le id de la sélection est le node id.
    const node = nodeById.get(talent.id);
    if (node) {
      const choiceIndex = choiceIndexFor(node, talentId);
      result[talent.id] = choiceIndex === undefined ? { rank } : { rank, choiceIndex };
      continue;
    }

    // Nœud de choix reporté par l'id du talent choisi : on remonte au node.
    const match = talentId != null ? nodeByTalentId.get(talentId) : undefined;
    if (match) {
      result[match.nodeId] = { rank, choiceIndex: match.choiceIndex };
    }
    // Sinon : sélection absente de l'arbre de référence, ignorée silencieusement.
  }

  return result;
}

export async function importFromBlizzard(characterId: number, specializationId: number) {
  const match = await talentRepo.getSpecForCharacter(characterId, specializationId);
  if (!match) {
    throw createError(400, `Specialization ${specializationId} does not match character class`);
  }
  const { character, spec } = match;

  const profile = await getCharacterSpecializations(
    character.region || 'eu',
    character.realm,
    character.name,
  );

  const specializations = profile?.specializations || [];
  const blizzardSpec = specializations.find(
    (s: { specialization?: { id?: number; name?: string } }) =>
      (spec.blizzardSpecId != null && s.specialization?.id === spec.blizzardSpecId) ||
      s.specialization?.name === spec.name,
  );
  if (!blizzardSpec) {
    throw createError(404, `Blizzard has no talent data for spec "${spec.name}" on this character`);
  }

  const loadout =
    (blizzardSpec.loadouts || []).find((l: { is_active?: boolean }) => l.is_active) ||
    (blizzardSpec.loadouts || [])[0];
  if (!loadout) {
    throw createError(404, `No talent loadout found for spec "${spec.name}"`);
  }

  const nodes = await talentRepo.getNodesForSpec(specializationId);
  const selected = [
    ...(loadout.selected_class_talents || []),
    ...(loadout.selected_spec_talents || []),
    ...(loadout.selected_hero_talents || []),
  ];
  const selectedNodes = resolveSelections(selected, nodes);

  return talentRepo.saveLoadout(characterId, specializationId, {
    selectedNodes,
    exportString: loadout.talent_loadout_code ?? null,
    label: null,
    source: 'blizzard',
  });
}
