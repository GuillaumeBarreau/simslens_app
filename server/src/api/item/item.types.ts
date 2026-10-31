import type { items } from '@prisma/client';

export type ItemEntity = items;

/** Réponse de l'API Blizzard, enrichie de son média. */
export interface BlizzardItemData {
  id: number;
  name?: unknown;
  media?: unknown;
  [key: string]: unknown;
}
