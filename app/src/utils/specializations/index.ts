/**
 * Spécialisations côté front (SIMS-212).
 *
 * La liste des spés vient de l'API (`GET /1/character/classes/specializations`) :
 * le front n'en garde plus de copie. Les noms y sont en anglais, tels qu'en base ;
 * ils s'affichent traduits via les clés `common:specializations.<clé>`.
 */
import type {
  ClassSpecializations,
  Specialization,
  UpdateCharacterSpecializationsPayload,
} from 'types/character.types';

/** Clé de traduction d'un nom de spé anglais : « Beast Mastery » → `beast_mastery`. */
export function specializationKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Classe telle qu'en base : « Death Knight » → `death_knight`. */
function classKey(className: string): string {
  return className.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Spés d'une classe, dans la liste servie par l'API ; `[]` si la classe est inconnue. */
export function specializationsOfClass(
  classes: ClassSpecializations[] | undefined,
  className: string | null | undefined,
): Specialization[] {
  if (!classes || !className) return [];
  const wanted = classKey(className);
  return classes.find((c) => c.name === wanted)?.specializations ?? [];
}

/**
 * Off-specs après le choix d'une spé principale : une spé n'est jamais à la
 * fois principale et secondaire (l'API refuserait la requête).
 */
export function offSpecsWithoutPrimary(offSpecIds: number[], primaryId: number | null): number[] {
  return offSpecIds.filter((id) => id !== primaryId);
}

/**
 * Corps de `PUT /1/character/:id/specializations` : la spé principale n'est
 * envoyée que si elle change, la liste des off-specs toujours (elle remplace
 * la précédente).
 */
export function buildSpecializationsPayload(
  currentPrimaryId: number | null,
  primaryId: number | null,
  offSpecIds: number[],
): UpdateCharacterSpecializationsPayload {
  const changed = primaryId !== null && primaryId !== currentPrimaryId;
  return {
    ...(changed ? { specializationId: primaryId } : {}),
    offSpecializationIds: offSpecsWithoutPrimary(offSpecIds, primaryId),
  };
}
