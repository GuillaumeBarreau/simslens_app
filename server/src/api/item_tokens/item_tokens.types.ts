import type { item_tokens } from '@prisma/client';

export type TokenEntity = item_tokens;

/** Objet obtenable en échange d'un token. */
export interface TokenReward {
  id: number;
  name: string;
  [key: string]: unknown;
}
