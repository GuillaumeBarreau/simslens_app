/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */

export interface ImportContext {
  extension?: string;
  season?: string;
  instanceId?: number;
  /** Obligatoire avec instanceId : l'instance doit appartenir à ce royaume. */
  realmId?: number;
}

/** Identifiant de personnage par clé « nom|royaume » en minuscules. */
export type CharacterLookup = Record<string, number | null>;

declare const itemImportRepository: {
  createImportRecord(
    filename: string,
    importedAt: number,
    rowCount: number,
    context?: ImportContext,
  ): Promise<number>;
  getImportedLootsTableInfo(): Promise<unknown>;
  upsertImportedLoots(importId: number, rows: unknown[]): Promise<unknown>;
  resolveCharactersByKeys(lookupKeys: string[], realmId?: number | null): Promise<CharacterLookup>;
  getLootsWithItemsByCharacterIds(
    characterIds: number[] | null,
    realmId: number,
  ): Promise<{ characterID?: number }[]>;
};

export default itemImportRepository;
