/**
 * Trois niveaux de cache, du moins coûteux au plus coûteux :
 * Redis, puis la base, puis l'API Blizzard — dont le résultat alimente
 * les deux précédents.
 */

import redis from '../../../shared/redis';
import { fetchItemFromBlizzard } from '../item.blizzard';
import { BlizzardCredentialsError, ItemNotFoundError } from '../item.errors';
import itemRepository from '../item.repository';
import type { BlizzardItemData, ItemEntity } from '../item.types';

/** Un jour : la fiche d'un objet ne change pas en cours de saison. */
const REDIS_TTL = 60 * 60 * 24;
const REDIS_KEY_PREFIX = 'wow:item:';

/**
 * Traduit les refus de l'API Blizzard en erreurs du domaine : un objet
 * inconnu (404) et des identifiants refusés (403). Le reste remonte tel quel.
 */
async function fetchFromBlizzard(itemId: number, region: string): Promise<BlizzardItemData> {
  try {
    return await fetchItemFromBlizzard(itemId, region);
  } catch (error) {
    const upstreamStatus = (error as { response?: { status?: number } }).response?.status;
    if (upstreamStatus === 404) throw new ItemNotFoundError(itemId);
    if (upstreamStatus === 403) throw new BlizzardCredentialsError();
    throw error;
  }
}

export async function getItemById(itemId: number, region = 'eu'): Promise<ItemEntity> {
  const redisKey = `${REDIS_KEY_PREFIX}${itemId}`;

  const cached = await redis.get(redisKey);
  if (cached) {
    return JSON.parse(cached) as ItemEntity;
  }

  const stored = await itemRepository.findById(itemId);
  if (stored) {
    await redis.setex(redisKey, REDIS_TTL, JSON.stringify(stored));
    return stored;
  }

  // L'API Blizzard attend la région en minuscules (voir item.validation).
  const blizzardData = await fetchFromBlizzard(itemId, region.toLowerCase());
  const created = await itemRepository.create(blizzardData);

  await redis.setex(redisKey, REDIS_TTL, JSON.stringify(created));

  return created;
}
