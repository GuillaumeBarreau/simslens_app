/**
 * Classe et spécialisation d'un personnage (SIMS-213).
 *
 * Point d'entrée unique pour transformer une classe et une spé reçues de
 * l'extérieur (formulaire du roster, API Blizzard, import…) en valeurs
 * cohérentes avec la base :
 * - la classe est normalisée (`normalizeClass` : « Death Knight » → `death_knight`)
 *   et doit exister dans `classes` (sinon la clé étrangère casserait en 500) ;
 * - la spé est retrouvée **dans cette classe**, par identifiant (`number`) ou
 *   par nom anglais, insensible à la casse et aux espaces autour ;
 * - toute incohérence lève une erreur typée 400 (`invalid_class`,
 *   `invalid_specialization`), jamais un `specializationId` vide en silence.
 *
 * Indépendant d'Express : utilisable depuis un usecase, un job ou un worker.
 */

import { normalizeClass } from '../../utils/normalizeClass';
import { InvalidSpecializationError, UnknownCharacterClassError } from './character.errors';
import characterRepository from './character.repository';

export interface ClassSpecialization {
  id: number;
  name: string;
  classId: number;
  role: string;
  icon?: string | null;
}

export interface CharacterClassWithSpecializations {
  id: number;
  /** Nom normalisé, tel qu'en base (`death_knight`). */
  name: string;
  specializations: ClassSpecialization[];
}

export interface ResolvedSpecialization {
  /** Classe normalisée, à écrire dans `characters.class`. */
  className: string;
  /** Spé de la classe : `name` va dans `characters.spec`, `id` dans `specializationId`. */
  specialization: ClassSpecialization;
}

export async function resolveCharacterClass(
  className: string | null | undefined,
): Promise<CharacterClassWithSpecializations> {
  const normalized = normalizeClass(className);
  const found = normalized
    ? ((await characterRepository.findClassWithSpecializations(
        normalized,
      )) as CharacterClassWithSpecializations | null)
    : null;
  if (!found) throw new UnknownCharacterClassError(className ?? '');
  return found;
}

/**
 * Cherche une spé dans une classe déjà chargée, sans accès à la base.
 * Un `number` est un identifiant de spé ; une chaîne est un nom (anglais,
 * casse et espaces autour ignorés). Les noms localisés (« Fureur ») ne sont pas
 * reconnus.
 */
export function findSpecializationInClass(
  characterClass: CharacterClassWithSpecializations,
  specNameOrId: string | number,
): ClassSpecialization | null {
  if (typeof specNameOrId === 'number') {
    return characterClass.specializations.find((s) => s.id === specNameOrId) ?? null;
  }
  const wanted = specNameOrId.trim().toLowerCase();
  if (!wanted) return null;
  return characterClass.specializations.find((s) => s.name.toLowerCase() === wanted) ?? null;
}

export function requireSpecializationInClass(
  characterClass: CharacterClassWithSpecializations,
  specNameOrId: string | number,
): ClassSpecialization {
  const specialization = findSpecializationInClass(characterClass, specNameOrId);
  if (!specialization) throw new InvalidSpecializationError(specNameOrId, characterClass.name);
  return specialization;
}

export async function resolveSpecialization(
  className: string | null | undefined,
  specNameOrId: string | number,
): Promise<ResolvedSpecialization> {
  const characterClass = await resolveCharacterClass(className);
  return {
    className: characterClass.name,
    specialization: requireSpecializationInClass(characterClass, specNameOrId),
  };
}
