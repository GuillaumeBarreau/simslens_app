import createError from 'http-errors';

const talentRepo = require('../talent.repository');

export interface SaveLoadoutInput {
  selectedNodes: Record<string, { rank: number; choiceIndex?: number }>;
  exportString?: string | null;
  label?: string | null;
}

/**
 * Vérifie que la spé appartient bien à la classe du personnage.
 */
export async function saveLoadout(
  characterId: number,
  specializationId: number,
  input: SaveLoadoutInput,
) {
  const match = await talentRepo.getSpecForCharacter(characterId, specializationId);
  if (!match) {
    throw createError(400, `Specialization ${specializationId} does not match character class`);
  }

  return talentRepo.saveLoadout(characterId, specializationId, {
    selectedNodes: input.selectedNodes,
    exportString: input.exportString ?? null,
    label: input.label ?? null,
    source: 'manual',
  });
}
