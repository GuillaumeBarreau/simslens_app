import type {
  AttunementDefinition,
  AttunementProgressRow,
  AttunementStatus,
} from './attunement.types';

/**
 * État d'un attunement pour un personnage, sans accès à la base. Sans ligne
 * enregistrée, ou sans faction, le personnage n'a rien commencé.
 */
export function attunementStatus(
  definition: AttunementDefinition,
  row: Pick<AttunementProgressRow, 'faction' | 'completedSteps'> | null | undefined,
): AttunementStatus {
  const faction = row?.faction ?? null;
  const chain = faction ? definition.chains[faction] : null;
  const totalSteps = chain ? chain.length : null;
  const completedSteps = chain ? Math.min(row?.completedSteps ?? 0, chain.length) : 0;
  const completed = chain !== null && completedSteps >= chain.length;

  return {
    attunement: definition.key,
    faction,
    completedSteps,
    totalSteps,
    completed,
    nextStep: chain && !completed ? chain[completedSteps] : null,
  };
}
