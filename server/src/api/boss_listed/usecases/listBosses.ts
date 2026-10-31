/**
 * Aplatit la relation `loots` en une liste d'objets butin : le client
 * n'a pas besoin de la table de liaison.
 */

import bossRepository from '../boss_listed.repository';
import type { BossWithLoot } from '../boss_listed.types';

export async function listBosses(extension?: string, season?: string): Promise<BossWithLoot[]> {
  const bosses = await bossRepository.listBosses(extension, season);

  return bosses.map(({ loots, ...boss }) => ({
    ...boss,
    loot: loots?.map((drop) => drop.item) ?? [],
  })) as BossWithLoot[];
}
