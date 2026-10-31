/**
 * Spécialisations d'un personnage : principale et off-specs (SIMS-212).
 *
 * Lecture et écriture ouvertes au propriétaire (self-edit) comme aux officiers :
 * la route est montée avec checkPermission(…, { allowSelfEdit: true }), et le
 * personnage est rattaché ici au royaume vérifié (findCharacterInRealm).
 *
 * Règles :
 * - toute spé (principale ou off-spec) appartient à la classe du personnage,
 *   sinon 400 `invalid_specialization` ;
 * - la spé principale n'est jamais aussi off-spec, sinon 400 `offspec_is_primary`.
 *   En lecture, une off-spec devenue principale (changée par le tiroir du roster)
 *   ou d'une autre classe (changement de classe) est écartée.
 */

import { findCharacterInRealm } from '../character.access';
import { OffSpecIsPrimaryError } from '../character.errors';
import characterRepository from '../character.repository';
import type {
  CharacterSpecializationsOutput,
  UpdateCharacterSpecializationsInput,
} from '../character.types';
import {
  type CharacterClassWithSpecializations,
  requireSpecializationInClass,
  resolveCharacterClass,
} from '../resolveSpecialization';

interface CharacterSpecState {
  id: number;
  class: string;
  specializationId: number | null;
}

/**
 * Assemble la réponse à partir de la classe déjà chargée : sans accès à la base.
 */
export function buildCharacterSpecializations(
  character: CharacterSpecState,
  characterClass: CharacterClassWithSpecializations,
  storedOffSpecIds: number[],
  simmedSpecIds: number[],
): CharacterSpecializationsOutput {
  const classSpecIds = new Set(characterClass.specializations.map((s) => s.id));
  const primarySpecializationId =
    character.specializationId != null && classSpecIds.has(character.specializationId)
      ? character.specializationId
      : null;
  const offSpecIds = new Set(
    storedOffSpecIds.filter((id) => classSpecIds.has(id) && id !== primarySpecializationId),
  );
  const simmed = new Set(simmedSpecIds);

  return {
    characterId: character.id,
    className: characterClass.name,
    primarySpecializationId,
    offSpecializationIds: characterClass.specializations
      .map((s) => s.id)
      .filter((id) => offSpecIds.has(id)),
    specializations: characterClass.specializations.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      icon: s.icon ?? null,
      isPrimary: s.id === primarySpecializationId,
      isOffSpec: offSpecIds.has(s.id),
      hasSimData: simmed.has(s.id),
    })),
  };
}

async function loadSpecializations(
  character: CharacterSpecState,
): Promise<CharacterSpecializationsOutput> {
  const characterClass = await resolveCharacterClass(character.class);
  const [offSpecIds, simmedIds] = await Promise.all([
    characterRepository.listOffSpecializationIds(character.id) as Promise<number[]>,
    characterRepository.listSimmedSpecializationIds(character.id) as Promise<number[]>,
  ]);
  return buildCharacterSpecializations(character, characterClass, offSpecIds, simmedIds);
}

/**
 * @param realmId royaume vérifié par checkPermission
 * @throws {CharacterNotFoundError} personnage absent ou hors du royaume
 * @throws {UnknownCharacterClassError} classe du personnage inconnue
 */
export async function getCharacterSpecializations(
  characterId: number,
  realmId: number,
): Promise<CharacterSpecializationsOutput> {
  const character = await findCharacterInRealm(characterId, realmId);
  return loadSpecializations(character);
}

/**
 * @param realmId royaume vérifié par checkPermission
 * @throws {CharacterNotFoundError} personnage absent ou hors du royaume
 * @throws {InvalidSpecializationError} spé hors de la classe du personnage
 * @throws {OffSpecIsPrimaryError} spé principale aussi listée en off-spec
 */
export async function updateCharacterSpecializations(
  characterId: number,
  realmId: number,
  input: UpdateCharacterSpecializationsInput,
): Promise<CharacterSpecializationsOutput> {
  const character = await findCharacterInRealm(characterId, realmId);
  const characterClass = await resolveCharacterClass(character.class);

  const primary =
    input.specializationId !== undefined
      ? requireSpecializationInClass(characterClass, input.specializationId)
      : null;
  const primaryId = primary ? primary.id : character.specializationId;

  const offSpecializationIds = [...new Set(input.offSpecializationIds)].map(
    (id) => requireSpecializationInClass(characterClass, id).id,
  );
  if (primaryId != null && offSpecializationIds.includes(primaryId)) {
    throw new OffSpecIsPrimaryError(primaryId);
  }

  await characterRepository.replaceCharacterSpecializations(characterId, {
    ...(primary ? { primary: { spec: primary.name, specializationId: primary.id } } : {}),
    offSpecializationIds,
  });

  return loadSpecializations({ ...character, specializationId: primaryId });
}
