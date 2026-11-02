export type BisSource = 'guild' | 'curated';

export interface BisItem {
  itemId: number;
  note: string | null;
}

/** Liste de référence du code, pour une spé (noms Retail en base) et un palier. */
export interface ReferenceBisList {
  className: string;
  specName: string;
  season: string;
  slots: Partial<Record<string, BisItem[]>>;
  sources: string[];
}

/** Ligne `bis_list_entries`. */
export interface GuildBisEntry {
  season: string;
  slot: string;
  rank: number;
  itemId: number;
  note: string | null;
}

/** Liste retenue pour un emplacement, et d'où elle vient. */
export interface ResolvedBisSlot {
  slot: string;
  source: BisSource | null;
  /** Palier de la liste retenue (un palier antérieur si le courant n'en a pas). */
  season: string | null;
  items: BisItem[];
}

export interface BisListOutput {
  specializationId: number;
  season: string;
  slots: ResolvedBisSlot[];
}

export interface BisScopeQuery {
  realmId: number;
  specializationId: number;
  season: string;
}

export interface SaveBisSlotInput {
  specializationId: number;
  season: string;
  items: { itemId: number; note?: string | null }[];
}
