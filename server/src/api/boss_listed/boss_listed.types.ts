export interface BossLoot {
  id: number;
  name: string;
  [key: string]: unknown;
}

/** Boss tel que le repository le renvoie, butin inclus via la relation. */
export interface BossRow {
  id: number;
  name: string;
  loots?: { item: BossLoot }[];
  [key: string]: unknown;
}

/** Boss tel qu'exposé au client : `loots` est aplati en `loot`. */
export interface BossWithLoot {
  id: number;
  name: string;
  loot: BossLoot[];
  [key: string]: unknown;
}
