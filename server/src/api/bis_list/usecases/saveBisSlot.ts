import { DuplicateBisItemError } from '../bis.errors';
import bisRepository from '../bis.repository';
import { rankItems } from '../bis.rules';
import type { GuildBisEntry, SaveBisSlotInput } from '../bis.types';
import { resolveBisScope } from './bisScope';

/**
 * Remplace la liste de la guilde pour un emplacement (ordre = rang). Une liste vide
 * retire la surcharge : la référence s'applique de nouveau.
 */
export async function saveBisSlot(
  realmId: number,
  slot: string,
  { specializationId, season, items }: SaveBisSlotInput,
  updatedBy: string,
): Promise<GuildBisEntry[]> {
  await resolveBisScope(specializationId, season);

  const ids = items.map((i) => i.itemId);
  if (new Set(ids).size !== ids.length) throw new DuplicateBisItemError();

  return bisRepository.replaceSlot(
    { realmId, specializationId, season, slot },
    rankItems(items.map((i) => ({ itemId: i.itemId, note: i.note || null }))),
    updatedBy,
  );
}
