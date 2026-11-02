/**
 * Règles du formulaire « Ajouter mon personnage » (SIMS-050), alignées sur celles
 * du serveur (`server/src/api/character/usecases/addOwnCharacter.ts`) : le serveur
 * reste la référence, le front évite seulement un aller-retour.
 */
import type { GameId } from 'config/games';
import type { AddOwnCharacterPayload, Character } from 'types/character.types';

export const OWN_CHARACTER_NAME_MIN = 2;
export const OWN_CHARACTER_NAME_MAX = 40;

const OWN_CHARACTER_NAME_PATTERN = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;

/** Espaces de bord retirées, espaces multiples réduites à une seule. */
export function normalizeOwnCharacterName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Prénom et nom de famille : lettres, espaces, apostrophes et tirets, 2 à 40 caractères. */
export function isValidOwnCharacterName(name: string): boolean {
  const normalized = normalizeOwnCharacterName(name);
  return (
    normalized.length >= OWN_CHARACTER_NAME_MIN &&
    normalized.length <= OWN_CHARACTER_NAME_MAX &&
    OWN_CHARACTER_NAME_PATTERN.test(normalized)
  );
}

/**
 * Clé de traduction d'un libellé de spé propre à un jeu :
 * « Feral Combat (cat) » → `feral_combat_cat`, « Beast Mastery » → `beast_mastery`.
 */
export function gameSpecializationKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export interface AddOwnCharacterValues {
  name: string;
  class: string;
  specializationId: string | null;
  offSpecializationIds: string[];
}

/** Corps de `POST /1/character/own` ; une off-spec égale à la spé principale est écartée. */
export function buildAddOwnCharacterPayload(
  realmId: number,
  values: AddOwnCharacterValues,
): AddOwnCharacterPayload {
  const primary = values.specializationId ? Number(values.specializationId) : undefined;
  const offSpecs = values.offSpecializationIds.map(Number).filter((id) => id !== primary);
  return {
    realmId,
    name: normalizeOwnCharacterName(values.name),
    class: values.class,
    ...(primary ? { specializationId: primary } : {}),
    ...(offSpecs.length > 0 ? { offSpecializationIds: offSpecs } : {}),
  };
}

/**
 * « Ajouter mon personnage » n'a de sens que dans une guilde WoW Forever (pas d'API
 * Blizzard) : vrai si le joueur n'y a encore aucun personnage.
 */
export function needsOwnCharacter(
  game: GameId | undefined,
  characters: Pick<Character, 'userId'>[],
  userId: string | number | undefined,
): boolean {
  if (game !== 'forever' || userId === undefined) return false;
  return !characters.some((c) => c.userId != null && String(c.userId) === String(userId));
}

/** Clé de traduction d'une erreur connue de l'API, sinon `null` (message du serveur). */
export function addOwnCharacterErrorKey(error: unknown): string | null {
  const code = (error as { error?: string } | null)?.error;
  if (code === 'conflict') return 'own_character.errors.name_taken';
  if (code === 'game_capability_unavailable') return 'own_character.errors.not_forever';
  return null;
}
