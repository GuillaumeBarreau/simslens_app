import type { AttunementProgressRow, Faction } from './attunement.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */

export interface CharacterRow {
  id: number;
  name: string;
  class: string;
}

declare const attunementRepository: {
  findCharacterInRealm(characterId: number, realmId: number): Promise<CharacterRow | null>;
  listRealmCharacters(
    realmId: number,
  ): Promise<(CharacterRow & { attunements: AttunementProgressRow[] })[]>;
  upsertProgress(
    characterId: number,
    attunement: string,
    data: { faction: Faction; completedSteps: number; completedAt: Date | null },
  ): Promise<AttunementProgressRow>;
};

export default attunementRepository;
