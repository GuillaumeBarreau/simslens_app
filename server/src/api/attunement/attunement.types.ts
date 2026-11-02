export const FACTIONS = ['alliance', 'horde'] as const;
export type Faction = (typeof FACTIONS)[number];

export interface AttunementStep {
  questId: number;
  name: string;
}

export interface AttunementDefinition {
  key: string;
  /** Nom du raid (`raids.name`) que l'attunement ouvre. */
  raid: string;
  /** Objet à porter dans le sac. */
  itemId: number;
  chains: Record<Faction, AttunementStep[]>;
}

/** Ligne `character_attunements`. */
export interface AttunementProgressRow {
  characterId: number;
  attunement: string;
  faction: Faction | null;
  completedSteps: number;
  completedAt: Date | null;
}

export interface AttunementStatus {
  attunement: string;
  faction: Faction | null;
  completedSteps: number;
  totalSteps: number | null;
  completed: boolean;
  /** Prochaine quête à faire, ou null (terminé, ou faction inconnue). */
  nextStep: AttunementStep | null;
}

export interface CharacterAttunements {
  characterId: number;
  name: string;
  class: string;
  attunements: AttunementStatus[];
}

export interface SaveAttunementInput {
  faction: Faction;
  completedSteps: number;
}
