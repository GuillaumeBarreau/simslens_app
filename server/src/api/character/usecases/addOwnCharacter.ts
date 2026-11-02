/**
 * Un joueur ajoute son propre personnage à une guilde WoW Forever (SIMS-050).
 *
 * Aucune API Blizzard n'expose WoW Forever (docs/forever/README.md §2.2) : les
 * personnages ne peuvent être ni synchronisés ni réclamés via Battle.net. Le joueur
 * les saisit donc lui-même ; ils lui sont rattachés (`userId`) et entrent directement
 * dans le roster (`approved`). Un officier garde les routes existantes (EDIT_ROSTER)
 * pour corriger ou archiver.
 *
 * Règles :
 * - la guilde doit être une guilde Forever, sinon 409 `game_capability_unavailable`
 *   (une guilde Retail passe par la réclamation Battle.net) ;
 * - nom : prénom et nom de famille, lettres Unicode séparées par une espace, une
 *   apostrophe ou un tiret, 2 à 40 caractères ;
 * - classe parmi les classes jouables de WoW Forever, spés selon le registre des jeux
 *   (`shared/game/games.ts`) ;
 * - nom unique sur le serveur de la guilde (contrainte `[name, realm]`), sinon 409.
 */

import { getGame, specializationLabel } from '../../../shared/game/games';
import { normalizeClass } from '../../../utils/normalizeClass';
import realmRepo from '../../realm/realm.repository';
import {
  CharacterAlreadyExistsError,
  CharacterValidationError,
  GameCapabilityUnavailableError,
  InvalidSpecializationError,
  OffSpecIsPrimaryError,
  UnknownCharacterClassError,
} from '../character.errors';
import characterRepository from '../character.repository';
import type { AddOwnCharacterInput, CharacterOutput } from '../character.types';
import {
  type ClassSpecialization,
  requireSpecializationInClass,
  resolveCharacterClass,
} from '../resolveSpecialization';

export const OWN_CHARACTER_NAME_MIN = 2;
export const OWN_CHARACTER_NAME_MAX = 40;

/**
 * Mots de lettres (toutes écritures) séparés par une seule espace, apostrophe
 * (droite ou typographique) ou un seul tiret : « Jean-Luc d'Arc ».
 */
const OWN_CHARACTER_NAME_PATTERN = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;

/** Espaces de bord retirées, espaces multiples réduites à une seule. */
export function normalizeOwnCharacterName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function isValidOwnCharacterName(name: string): boolean {
  return (
    name.length >= OWN_CHARACTER_NAME_MIN &&
    name.length <= OWN_CHARACTER_NAME_MAX &&
    OWN_CHARACTER_NAME_PATTERN.test(name)
  );
}

/** Spé de la classe, proposée par WoW Forever (registre), sinon 400. */
function requireForeverSpecialization(
  characterClass: Awaited<ReturnType<typeof resolveCharacterClass>>,
  specializationId: number,
): ClassSpecialization {
  const specialization = requireSpecializationInClass(characterClass, specializationId);
  if (specializationLabel('forever', characterClass.name, specialization.name) === null) {
    throw new InvalidSpecializationError(specializationId, characterClass.name);
  }
  return specialization;
}

function isUniqueConstraintError(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'P2002';
}

/**
 * @param realmId royaume vérifié par checkPermission
 * @param userId utilisateur connecté, propriétaire du personnage créé
 * @throws {GameCapabilityUnavailableError} guilde absente ou qui n'est pas Forever
 * @throws {CharacterValidationError} nom invalide
 * @throws {UnknownCharacterClassError} classe hors des classes Forever
 * @throws {InvalidSpecializationError} spé hors de la classe ou absente de Forever
 * @throws {OffSpecIsPrimaryError} spé principale aussi listée en off-spec
 * @throws {CharacterAlreadyExistsError} nom déjà pris sur le serveur de la guilde
 */
export async function addOwnCharacter(
  realmId: number,
  userId: string,
  input: AddOwnCharacterInput,
): Promise<CharacterOutput> {
  const realm = await realmRepo.getRealmById(realmId);
  if (!realm || realm.game !== 'forever') {
    throw new GameCapabilityUnavailableError();
  }

  const name = normalizeOwnCharacterName(input.name ?? '');
  if (!isValidOwnCharacterName(name)) {
    const message = `Nom invalide : lettres, espaces, apostrophes et tirets, ${OWN_CHARACTER_NAME_MIN} à ${OWN_CHARACTER_NAME_MAX} caractères`;
    throw new CharacterValidationError(message, [message]);
  }

  const className = normalizeClass(input.class);
  if (!className || !getGame('forever').playableClasses.includes(className)) {
    throw new UnknownCharacterClassError(input.class ?? '');
  }
  const characterClass = await resolveCharacterClass(className);

  const primary =
    input.specializationId !== undefined && input.specializationId !== null
      ? requireForeverSpecialization(characterClass, input.specializationId)
      : null;
  const offSpecializationIds = [...new Set(input.offSpecializationIds ?? [])].map(
    (id) => requireForeverSpecialization(characterClass, id).id,
  );
  if (primary && offSpecializationIds.includes(primary.id)) {
    throw new OffSpecIsPrimaryError(primary.id);
  }

  const existing = await characterRepository.findCharacterIdByNameAndRealm(name, realm.server);
  if (existing) throw new CharacterAlreadyExistsError(name, realm.server);

  const fields = {
    name,
    class: characterClass.name,
    realm: realm.server,
    region: realm.region.toUpperCase(),
    realmId: realm.id,
    userId: String(userId),
    status: 'approved',
    spec: primary?.name ?? null,
    specializationId: primary?.id ?? null,
    lastModified: new Date(),
  };

  let id: number;
  try {
    id = await characterRepository.createCharacterWithOffSpecs(fields, offSpecializationIds);
  } catch (err) {
    // Création concurrente du même nom entre la lecture et l'écriture.
    if (isUniqueConstraintError(err)) throw new CharacterAlreadyExistsError(name, realm.server);
    throw err;
  }

  const created = (await characterRepository.findCharacterById(id)) as CharacterOutput;
  return { ...created, message: `${name} a été ajouté au roster` };
}
