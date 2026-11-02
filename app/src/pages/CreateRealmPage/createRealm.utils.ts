import type { GameId } from 'config/games';
import { getErrorStatus } from 'services/api.client';

/** Serveurs unifiés de WoW Forever, un de chaque par région (SIMS-019). */
export const FOREVER_SERVER_MODES: Record<string, 'pve' | 'pvp'> = {
  'forever-pve': 'pve',
  'forever-pvp': 'pvp',
};

/** Messages renvoyés par `POST /1/realms` en 409 (usecases/manageRealms.ts). */
const FOREVER_ALREADY_OWNED = 'You already own a Forever realm';
const REALM_ALREADY_EXISTS = 'Realm already exists';

/**
 * Jeu de la guilde à créer : `?game=forever` seulement si le flag `forever` est
 * actif ; toute autre valeur garde le formulaire Retail.
 */
export function resolveCreateRealmGame(param: string | null, foreverEnabled: boolean): GameId {
  return param === 'forever' && foreverEnabled ? 'forever' : 'retail';
}

/** Clé i18n (namespace `createRealm`) d'une erreur connue de la création, sinon `null`. */
export function createRealmErrorKey(error: unknown): string | null {
  if (getErrorStatus(error) !== 409) return null;
  const message = (error as { message?: unknown } | null)?.message;
  if (message === FOREVER_ALREADY_OWNED) return 'errors.forever_already_owned';
  if (message === REALM_ALREADY_EXISTS) return 'errors.realm_already_exists';
  return null;
}
