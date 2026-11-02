import { BIS_SLOTS } from '../bis.constants';
import { REFERENCE_BIS } from '../bis.reference';
import bisRepository from '../bis.repository';
import { resolveBisSlots } from '../bis.rules';
import type { BisListOutput, BisScopeQuery, ReferenceBisList } from '../bis.types';
import { resolveBisScope } from './bisScope';

/**
 * Liste BiS d'une spé au palier demandé, pour le royaume vérifié : liste de la
 * guilde, sinon référence, en remontant les paliers (progression cumulative).
 */
export async function getBisList(
  { realmId, specializationId, season }: BisScopeQuery,
  references: readonly ReferenceBisList[] = REFERENCE_BIS,
): Promise<BisListOutput> {
  const { spec, seasons } = await resolveBisScope(specializationId, season);
  const guildEntries = await bisRepository.listGuildEntries(realmId, specializationId, seasons);
  const specReferences = references.filter(
    (r) => r.className === spec.class.name && r.specName === spec.name,
  );

  return {
    specializationId,
    season,
    slots: resolveBisSlots(BIS_SLOTS, seasons, guildEntries, specReferences),
  };
}
