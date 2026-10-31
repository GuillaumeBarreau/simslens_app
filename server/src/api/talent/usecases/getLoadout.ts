const talentRepo = require('../talent.repository');

export interface TalentLoadout {
  selectedNodes: Record<string, { rank: number; choiceIndex?: number }>;
  exportString: string | null;
  label: string | null;
  source: string;
  updatedAt: Date | null;
}

/**
 * Un loadout vide (jamais renseigné) est renvoyé plutôt qu'une 404.
 */
export async function getLoadout(
  characterId: number,
  specializationId: number,
): Promise<TalentLoadout> {
  const loadout = await talentRepo.getLoadout(characterId, specializationId);

  if (!loadout) {
    return {
      selectedNodes: {},
      exportString: null,
      label: null,
      source: 'manual',
      updatedAt: null,
    };
  }

  return {
    selectedNodes: loadout.selectedNodes ?? {},
    exportString: loadout.exportString,
    label: loadout.label,
    source: loadout.source,
    updatedAt: loadout.updatedAt,
  };
}
