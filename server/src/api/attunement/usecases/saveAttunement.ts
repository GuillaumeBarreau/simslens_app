import { ATTUNEMENTS } from '../attunement.definitions';
import {
  AttunementCharacterNotFoundError,
  InvalidAttunementStepError,
  UnknownAttunementError,
} from '../attunement.errors';
import attunementRepository from '../attunement.repository';
import { attunementStatus } from '../attunement.rules';
import type { AttunementStatus, SaveAttunementInput } from '../attunement.types';

/**
 * Enregistre l'avancement d'un personnage du royaume vérifié. Ouvert au
 * propriétaire (allowSelfEdit) comme aux officiers.
 */
export async function saveAttunement(
  characterId: number,
  realmId: number,
  attunement: string,
  { faction, completedSteps }: SaveAttunementInput,
  now: Date = new Date(),
): Promise<AttunementStatus> {
  const definition = ATTUNEMENTS[attunement];
  if (!definition) throw new UnknownAttunementError();

  const totalSteps = definition.chains[faction].length;
  if (completedSteps > totalSteps) throw new InvalidAttunementStepError(totalSteps);

  const character = await attunementRepository.findCharacterInRealm(characterId, realmId);
  if (!character) throw new AttunementCharacterNotFoundError();

  const row = await attunementRepository.upsertProgress(characterId, attunement, {
    faction,
    completedSteps,
    completedAt: completedSteps === totalSteps ? now : null,
  });
  return attunementStatus(definition, row);
}
