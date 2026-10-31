import type { instance_loots } from '@prisma/client';

export type LootEntity = instance_loots;

export interface LootRow extends LootEntity {}

/** Ligne enrichie des deux indicateurs attendus par l'interface. */
export interface LootWithStatus extends LootRow {
  /** Aucun joueur ne s'est encore vu attribuer cet objet. */
  isPending: boolean;
}

export interface ListLootsFilters {
  bossId?: number;
  /** null filtre explicitement les butins non attribués. */
  assignedTo?: number | null;
}

export interface CreateLootInput {
  instanceId: number;
  bossId: number;
  itemId: number;
  assignedTo?: number | null;
  assignedBy?: number | null;
}
