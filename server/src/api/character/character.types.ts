import type { characters } from '@prisma/client';

export type CharacterEntity = characters;

export interface CreateCharacterInput {
  name: CharacterEntity['name'];
  class: CharacterEntity['class'];
  realm: CharacterEntity['realm'];
  /** Nom anglais de la spé ; exclusif avec `specializationId`. */
  spec?: CharacterEntity['spec'];
  specializationId?: number;
  region?: CharacterEntity['region'];
  discordTag?: CharacterEntity['discordTag'];
}

export interface UpdateCharacterInput {
  name?: CharacterEntity['name'];
  class?: CharacterEntity['class'];
  realm?: CharacterEntity['realm'];
  region?: CharacterEntity['region'];
  /** Nom anglais de la spé ; exclusif avec `specializationId`. */
  spec?: CharacterEntity['spec'];
  specializationId?: number;
  discordTag?: CharacterEntity['discordTag'];
  status?: string;
}

/** POST /1/character/own : un joueur ajoute son personnage WoW Forever (SIMS-050). */
export interface AddOwnCharacterInput {
  /** Prénom et nom de famille. */
  name: string;
  /** Classe normalisée ou libellé (« Warrior »), parmi les classes Forever. */
  class: string;
  specializationId?: number | null;
  offSpecializationIds?: number[];
}

/** PUT /1/character/:id/specializations (SIMS-212). */
export interface UpdateCharacterSpecializationsInput {
  /** Nouvelle spé principale ; absente, la spé principale ne change pas. */
  specializationId?: number;
  /** Liste complète des off-specs : elle remplace la précédente. */
  offSpecializationIds: number[];
}

/** Une spé de la classe du personnage, telle que vue par le joueur. */
export interface CharacterSpecializationOption {
  id: number;
  name: string;
  role: string;
  icon: string | null;
  isPrimary: boolean;
  isOffSpec: boolean;
  /** Des upgrades ou un équipement de sim sont rattachés à cette spé. */
  hasSimData: boolean;
}

export interface CharacterSpecializationsOutput {
  characterId: number;
  /** Classe normalisée (`death_knight`). */
  className: string;
  primarySpecializationId: number | null;
  offSpecializationIds: number[];
  specializations: CharacterSpecializationOption[];
}

export interface ListCharactersFilters {
  includePending?: boolean;
  realmId?: number;
}

export interface CharacterOutput extends CharacterEntity {
  message?: string;
}

export interface UpdateAllCharactersOutput {
  updated: number;
  failed: number;
  details: UpdateCharacterDetail[];
}

export interface UpdateCharacterDetail {
  id: CharacterEntity['id'];
  name: CharacterEntity['name'];
  ok: boolean;
  error?: string;
}

/** Données enrichies renvoyées par integrations/blizzard (getCharacterEnrichedData). */
export interface BlizzardCharacterData {
  ilvl: CharacterEntity['ilvl'];
  score: CharacterEntity['score'];
  currentPeriodKeyCount: CharacterEntity['currentPeriodKeyCount'];
  /** Nombre côté API, chaîne en base (converti avec String()). */
  ManaforgeBuff: number | CharacterEntity['ManaforgeBuff'];
  thumbnail: CharacterEntity['thumbnail'];
  /** Spé active, nom anglais (locale en_GB) : « Beast Mastery » (SIMS-208). */
  active_spec?: string | null;
}
