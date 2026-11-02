import type { GuildBisEntry } from './bis.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */

export interface SpecializationRow {
  id: number;
  name: string;
  class: { name: string };
}

export interface BisSlotScope {
  realmId: number;
  specializationId: number;
  season: string;
  slot: string;
}

declare const bisRepository: {
  findSpecialization(specializationId: number): Promise<SpecializationRow | null>;
  listGuildEntries(
    realmId: number,
    specializationId: number,
    seasons: string[],
  ): Promise<GuildBisEntry[]>;
  replaceSlot(
    scope: BisSlotScope,
    items: { itemId: number; note: string | null; rank: number }[],
    updatedBy: string,
  ): Promise<GuildBisEntry[]>;
};

export default bisRepository;
